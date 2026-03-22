const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const JSZip = require("jszip");
const { google } = require("googleapis");
const axios = require("axios");
const AdmZip = require("adm-zip");

const ROOT_DIR = __dirname;
const INDEX_PATH = path.join(ROOT_DIR, "index.html");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const SHEET_POLL_MS = 60000;
const SHEET_RANGE = "A:AZ";

function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
    if (key && !process.env[key]) process.env[key] = value;
  });
}
loadDotEnv();

const PROVIDER_CONFIG = {
  openai: { label: "OpenAI", model: "gpt-4o", envKey: "OPENAI_API_KEY" },
  anthropic: { label: "Anthropic", model: "claude-sonnet-4-20250514", envKey: "ANTHROPIC_API_KEY" },
  gemini: { label: "Google Gemini", model: "gemini-1.5-pro", envKey: "GEMINI_API_KEY" },
  mistral: { label: "Mistral", model: "mistral-large-latest", envKey: "MISTRAL_API_KEY" },
  groq: { label: "Groq", model: "llama-3.3-70b-versatile", envKey: "GROQ_API_KEY" },
};

const ZIP_TARGET_FILES = ["README.md", ".cursorrules", "server.js", "index.html", "package.json", "app.py", "main.py", "index.js"];

const runtimeState = {
  isPolling: false,
  connected: false,
  lastSyncAt: null,
  lastError: "",
  candidates: [],
  processed: 0,
  pending: 0,
  total: 0,
  strongYes: 0,
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 200000) {
        reject(new Error("Request too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, obj) {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": typeof obj === "string" ? "text/plain" : "application/json" });
  res.end(body);
}

function getProviderFromInput(providerRaw) {
  const p = String(providerRaw || "openai").toLowerCase();
  return Object.prototype.hasOwnProperty.call(PROVIDER_CONFIG, p) ? p : "openai";
}

function getApiKeyForProvider(provider) {
  loadDotEnv();
  return String(process.env[PROVIDER_CONFIG[provider].envKey] || "").trim();
}

function clampText(s, maxLen = 20000) {
  if (s === null || s === undefined) return "";
  const str = String(s);
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function extractJsonObjectString(raw) {
  if (!raw) return "";
  const text = String(raw).trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return "";
  return text.slice(first, last + 1);
}

function buildEvaluationPrompts(candidateInputs) {
  const systemPrompt = "You are an expert hiring evaluator for an AI-native company. Always respond in valid JSON only.";
  const equalWeight = 100 / 7;
  const weights = {
    problem_clarity: equalWeight,
    priority_reasoning: equalWeight,
    ai_leverage_efficiency: equalWeight,
    documentation_quality: equalWeight,
    security_awareness: equalWeight,
    performance_score_validity: equalWeight,
    cursor_integration: equalWeight,
  };
  const userMessage = {
    input_fields: candidateInputs,
    scoring_dimensions: {
      problem_clarity: "Is the problem well-defined and specific?",
      priority_reasoning: "Is the 'why this problem' logic strong?",
      ai_leverage_efficiency: "Did they use AI smartly, not just a wrapper?",
      documentation_quality: "Is the README comprehensive and clear?",
      security_awareness: "Did they handle secrets properly?",
      performance_score_validity: "Is their 1–10,000 scoring method logical?",
      cursor_integration: "Is the project properly Cursor-configured?",
    },
    output_requirements: {
      return_valid_json_object_only: true,
      required_keys: ["scores", "total_weighted_score", "strengths", "weaknesses", "hiring_recommendation", "priority_definition_ability_summary"],
    },
  };
  return { systemPrompt, userPrompt: JSON.stringify(userMessage), weights };
}

async function callProviderModel({ provider, apiKey, candidateInputs }) {
  const { systemPrompt, userPrompt, weights } = buildEvaluationPrompts(candidateInputs);
  const model = PROVIDER_CONFIG[provider].model;
  if (!apiKey) throw new Error(`Missing ${PROVIDER_CONFIG[provider].envKey} in .env.`);
  let content = "";

  if (provider === "openai" || provider === "mistral" || provider === "groq") {
    const urlByProvider = {
      openai: "https://api.openai.com/v1/chat/completions",
      mistral: "https://api.mistral.ai/v1/chat/completions",
      groq: "https://api.groq.com/openai/v1/chat/completions",
    };
    const body = {
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    };
    if (provider === "openai") body.response_format = { type: "json_object" };
    const resp = await fetch(urlByProvider[provider], {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(payload?.error?.message || `${PROVIDER_CONFIG[provider].label} failed (${resp.status}).`);
    content = payload?.choices?.[0]?.message?.content || "";
  } else if (provider === "anthropic") {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 1800,
        messages: [{ role: "user", content: `${systemPrompt}\n\nReturn valid JSON only.\n\n${userPrompt}` }],
      }),
    });
    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(payload?.error?.message || `Anthropic failed (${resp.status}).`);
    content = payload?.content?.[0]?.text || "";
  } else if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\nReturn valid JSON only.\n\n${userPrompt}` }] }] }),
    });
    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(payload?.error?.message || `Gemini failed (${resp.status}).`);
    content = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  if (!content) throw new Error(`${PROVIDER_CONFIG[provider].label} returned empty response.`);
  const jsonText = provider === "openai" ? content : extractJsonObjectString(content);
  if (!jsonText) throw new Error(`${PROVIDER_CONFIG[provider].label} returned invalid JSON.`);

  const json = JSON.parse(jsonText);
  const normalizeScore = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 3;
    return Math.max(1, Math.min(10, n));
  };
  const normalizedScores = {
    problem_clarity: normalizeScore(json?.scores?.problem_clarity),
    priority_reasoning: normalizeScore(json?.scores?.priority_reasoning),
    ai_leverage_efficiency: normalizeScore(json?.scores?.ai_leverage_efficiency),
    documentation_quality: normalizeScore(json?.scores?.documentation_quality),
    security_awareness: normalizeScore(json?.scores?.security_awareness),
    performance_score_validity: normalizeScore(json?.scores?.performance_score_validity),
    cursor_integration: normalizeScore(json?.scores?.cursor_integration),
  };
  const computedTotal =
    normalizedScores.problem_clarity * (weights.problem_clarity / 10) +
    normalizedScores.priority_reasoning * (weights.priority_reasoning / 10) +
    normalizedScores.ai_leverage_efficiency * (weights.ai_leverage_efficiency / 10) +
    normalizedScores.documentation_quality * (weights.documentation_quality / 10) +
    normalizedScores.security_awareness * (weights.security_awareness / 10) +
    normalizedScores.performance_score_validity * (weights.performance_score_validity / 10) +
    normalizedScores.cursor_integration * (weights.cursor_integration / 10);
  const allowedRec = new Set(["Strong Yes", "Yes", "Maybe", "No"]);
  const recommendation = allowedRec.has(json?.hiring_recommendation) ? json.hiring_recommendation : "Maybe";
  const strengths = Array.isArray(json?.strengths) ? json.strengths.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 3) : [];
  const weaknesses = Array.isArray(json?.weaknesses) ? json.weaknesses.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 3) : [];

  return {
    scores: normalizedScores,
    total_weighted_score: Math.round(computedTotal * 10) / 10,
    strengths: strengths.length ? strengths : ["Needs clearer evidence to identify specific strengths."],
    weaknesses: weaknesses.length ? weaknesses : ["Needs clearer evidence to identify specific weaknesses."],
    hiring_recommendation: recommendation,
    priority_definition_ability_summary: String(json?.priority_definition_ability_summary || "—"),
    provider_used: PROVIDER_CONFIG[provider].label,
    model_used: model,
  };
}

function parseServiceAccountCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  }
  const raw = String(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "").trim();
  if (!raw) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CREDENTIALS_JSON in .env.");
  if (raw.startsWith("{")) return JSON.parse(raw);
  const fullPath = path.isAbsolute(raw) ? raw : path.join(ROOT_DIR, raw);
  const fileContent = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(fileContent);
}

async function getSheetsClient() {
  const credentials = parseServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function ensureSheetHasColumns(sheets, spreadsheetId, minColumns) {
  const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = sheetMetadata?.data?.sheets?.[0];
  const sheetId = sheet?.properties?.sheetId || 0;
  const currentColumns = sheet?.properties?.gridProperties?.columnCount || 26;
  
  if (currentColumns >= minColumns) return;
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: {
              columnCount: minColumns,
            },
          },
          fields: "gridProperties.columnCount",
        },
      }],
    },
  });
  console.log(`Expanded sheet to ${minColumns} columns (was ${currentColumns}).`);
}

async function fetchGitHubReadme(repoUrl) {
  try {
    const u = new URL(repoUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return "";
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
    const resp = await fetch(apiUrl, { headers: { Accept: "application/vnd.github.raw+json", "User-Agent": "quest-evaluator" } });
    if (!resp.ok) return "";
    return await resp.text();
  } catch {
    return "";
  }
}

function extractGoogleDriveFileId(url) {
  try {
    const urlStr = String(url || "").trim();
    if (!urlStr) return null;
    
    let match = urlStr.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    
    match = urlStr.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    
    match = urlStr.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    
    return null;
  } catch {
    return null;
  }
}

async function downloadGoogleDriveZip(fileId) {
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const response = await axios.get(downloadUrl, {
    responseType: "arraybuffer",
    maxRedirects: 5,
    timeout: 30000,
  });
  return Buffer.from(response.data);
}

async function extractZipWithAdmZip(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const chunks = [];
  
  for (const target of ZIP_TARGET_FILES) {
    const lowered = target.toLowerCase();
    const matched = entries.find((entry) => {
      if (entry.isDirectory) return false;
      const fileName = entry.entryName.split("/").pop().toLowerCase();
      return fileName === lowered;
    });
    
    if (matched) {
      const text = matched.getData().toString("utf8");
      chunks.push(`\n\n===== ${matched.entryName} =====\n${text}`);
    }
  }
  
  return chunks.join("").trim();
}

async function fetchGoogleDriveZipContext(url) {
  try {
    const fileId = extractGoogleDriveFileId(url);
    if (!fileId) {
      console.log(`Could not extract file ID from Google Drive URL: ${url}`);
      return "";
    }
    
    console.log(`Downloading Google Drive file: ${fileId}`);
    const buffer = await downloadGoogleDriveZip(fileId);
    const content = await extractZipWithAdmZip(buffer);
    console.log(`Successfully extracted ZIP from Google Drive (${fileId})`);
    return content;
  } catch (err) {
    console.error(`Failed to download/extract Google Drive ZIP: ${err.message}`);
    return "";
  }
}

async function fetchZipContext(zipUrl) {
  try {
    const resp = await fetch(zipUrl);
    if (!resp.ok) return "";
    const arr = await resp.arrayBuffer();
    const zip = await JSZip.loadAsync(arr);
    const chunks = [];
    for (const target of ZIP_TARGET_FILES) {
      const lowered = target.toLowerCase();
      const matched = Object.values(zip.files).find((entry) => !entry.dir && entry.name.split("/").pop().toLowerCase() === lowered);
      if (!matched) continue;
      const text = await matched.async("string");
      chunks.push(`\n\n===== ${matched.name} =====\n${text}`);
    }
    return chunks.join("").trim();
  } catch {
    return "";
  }
}

async function buildRepoContext(githubUrl, zipUrl) {
  let context = "";
  if (githubUrl && /github\.com/i.test(githubUrl)) {
    const readme = await fetchGitHubReadme(githubUrl);
    if (readme) context += readme;
  }
  if (zipUrl && /drive\.google\.com/i.test(zipUrl)) {
    const driveContent = await fetchGoogleDriveZipContext(zipUrl);
    if (driveContent) {
      context += `\n\n${driveContent}`;
    } else {
      context += `\n\n[Note: Google Drive ZIP file provided but could not be downloaded. URL: ${zipUrl}]`;
    }
  } else if (zipUrl) {
    const zipContent = await fetchZipContext(zipUrl);
    if (zipContent) context += `\n\n${zipContent}`;
  }
  return context.trim();
}

function rowToCandidate(row, rowIndex) {
  return {
    rowIndex,
    timestamp: String(row[0] || "").trim(),
    email: String(row[1] || "").trim(),
    candidate_name: String(row[2] || "").trim(),
    phone: String(row[3] || "").trim(),
    agent_title: String(row[4] || "").trim(),
    problem_statement: String(row[5] || "").trim(),
    zip_file: String(row[6] || "").trim(),
    github_url: String(row[7] || "").trim(),
    calculation_method: String(row[8] || "").trim(),
    performance_score: String(row[9] || "").trim(),
    benchmark_comparison: String(row[10] || "").trim(),
    status: String(row[11] || "").trim(),
    total_score: String(row[12] || "").trim(),
    problem_clarity: String(row[13] || "").trim(),
    priority_reasoning: String(row[14] || "").trim(),
    ai_leverage: String(row[15] || "").trim(),
    documentation: String(row[16] || "").trim(),
    security: String(row[17] || "").trim(),
    performance_validity: String(row[18] || "").trim(),
    cursor_integration: String(row[19] || "").trim(),
    strengths: String(row[20] || "").trim(),
    weaknesses: String(row[21] || "").trim(),
    recommendation: String(row[22] || "").trim(),
    priority_summary: String(row[23] || "").trim(),
    evaluated_at: String(row[24] || "").trim(),
  };
}

async function evaluateCandidate(candidate) {
  const provider = getProviderFromInput(process.env.DEFAULT_MODEL_PROVIDER || "openai");
  const apiKey = getApiKeyForProvider(provider);
  const repoContext = await buildRepoContext(candidate.github_url, candidate.zip_file);
  const candidateInputs = {
    repo_or_readme: clampText(repoContext, 20000),
    problem_statement: clampText(candidate.problem_statement, 15000),
    priority_reasoning: clampText(`Agent: ${candidate.agent_title}. ${candidate.problem_statement}`, 15000),
    performance_score: Number(candidate.performance_score) || 0,
    performance_score_method: clampText(candidate.calculation_method, 8000),
    benchmark_comparison: clampText(candidate.benchmark_comparison, 20000),
    security_checklist: "no",
  };
  return callProviderModel({ provider, apiKey, candidateInputs });
}

async function processUnprocessedRows() {
  if (runtimeState.isPolling) return { processed: 0, message: "Already polling." };
  runtimeState.isPolling = true;
  let processedCount = 0;

  try {
    const sheetId = String(process.env.GOOGLE_SHEET_ID || "").trim();
    if (!sheetId) throw new Error("Missing GOOGLE_SHEET_ID in .env.");
    const sheets = await getSheetsClient();
    
    await ensureSheetHasColumns(sheets, sheetId, 25);
    
    const readResp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: SHEET_RANGE });
    const values = readResp?.data?.values || [];
    if (values.length < 2) throw new Error("Sheet has no data rows.");
    
    const expectedHeaders = [
      "Timestamp", "Email", "Candidate Name", "Phone Number", "AI Agent Title",
      "Problem Statement", "AI Agent ZIP File", "GitHub Repository URL",
      "Calculation Method", "Performance Score", "Benchmark Comparison",
      "Status", "Total Score", "Problem Clarity", "Priority Reasoning",
      "AI Leverage", "Documentation", "Security", "Performance Validity",
      "Cursor Integration", "Strengths", "Weaknesses", "Recommendation",
      "Priority Summary", "Evaluated At"
    ];
    const headerRow = values[0] || [];
    if (headerRow.length < expectedHeaders.length) {
      const updatedHeaders = [...headerRow];
      while (updatedHeaders.length < expectedHeaders.length) {
        updatedHeaders.push(expectedHeaders[updatedHeaders.length] || "");
      }
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "A1:Y1",
        valueInputOption: "RAW",
        requestBody: { values: [updatedHeaders] },
      });
      console.log(`Updated header row with output column names.`);
    }

    for (let rowIdx = 1; rowIdx < values.length; rowIdx++) {
      const row = values[rowIdx];
      const candidate = rowToCandidate(row, rowIdx + 1);
      if (candidate.status.toLowerCase() === "processed") continue;
      if (!candidate.candidate_name) continue;

      console.log(`[${new Date().toISOString()}] Processing: ${candidate.candidate_name}`);

      try {
        const result = await evaluateCandidate(candidate);
        const updates = [
          { range: `L${candidate.rowIndex}`, values: [["Processed"]] },
          { range: `M${candidate.rowIndex}`, values: [[result.total_weighted_score]] },
          { range: `N${candidate.rowIndex}`, values: [[result.scores.problem_clarity]] },
          { range: `O${candidate.rowIndex}`, values: [[result.scores.priority_reasoning]] },
          { range: `P${candidate.rowIndex}`, values: [[result.scores.ai_leverage_efficiency]] },
          { range: `Q${candidate.rowIndex}`, values: [[result.scores.documentation_quality]] },
          { range: `R${candidate.rowIndex}`, values: [[result.scores.security_awareness]] },
          { range: `S${candidate.rowIndex}`, values: [[result.scores.performance_score_validity]] },
          { range: `T${candidate.rowIndex}`, values: [[result.scores.cursor_integration]] },
          { range: `U${candidate.rowIndex}`, values: [[(result.strengths || []).join(" | ")]] },
          { range: `V${candidate.rowIndex}`, values: [[(result.weaknesses || []).join(" | ")]] },
          { range: `W${candidate.rowIndex}`, values: [[result.hiring_recommendation]] },
          { range: `X${candidate.rowIndex}`, values: [[result.priority_definition_ability_summary]] },
          { range: `Y${candidate.rowIndex}`, values: [[new Date().toISOString()]] },
        ];
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: { valueInputOption: "RAW", data: updates },
        });
        processedCount++;

        const existingIdx = runtimeState.candidates.findIndex((c) => c.rowIndex === candidate.rowIndex);
        const candidateCard = {
          rowIndex: candidate.rowIndex,
          candidate_name: candidate.candidate_name,
          email: candidate.email,
          phone: candidate.phone,
          agent_title: candidate.agent_title,
          timestamp: candidate.timestamp,
          total_weighted_score: result.total_weighted_score,
          recommendation: result.hiring_recommendation,
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          scores: result.scores || {},
          priority_summary: result.priority_definition_ability_summary || "—",
          evaluated_at: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          runtimeState.candidates[existingIdx] = candidateCard;
        } else {
          runtimeState.candidates.push(candidateCard);
        }
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Error processing row ${candidate.rowIndex}:`, err.message);
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `L${candidate.rowIndex}`,
          valueInputOption: "RAW",
          requestBody: { values: [[`Error: ${String(err.message || err)}`]] },
        });
      }
    }

    runtimeState.candidates.sort((a, b) => Number(b.total_weighted_score || 0) - Number(a.total_weighted_score || 0));
    runtimeState.processed = runtimeState.candidates.filter((c) => c.recommendation).length;
    runtimeState.pending = values.length - 1 - runtimeState.processed;
    runtimeState.total = values.length - 1;
    runtimeState.strongYes = runtimeState.candidates.filter((c) => c.recommendation === "Strong Yes").length;
    runtimeState.connected = true;
    runtimeState.lastError = "";
    runtimeState.lastSyncAt = new Date().toISOString();
    return { processed: processedCount, message: `Processed ${processedCount} candidate(s).` };
  } catch (err) {
    runtimeState.connected = false;
    runtimeState.lastError = String(err?.message || err);
    runtimeState.lastSyncAt = new Date().toISOString();
    throw err;
  } finally {
    runtimeState.isPolling = false;
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && reqUrl.pathname === "/") {
      const html = fs.readFileSync(INDEX_PATH, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    if (req.method === "GET" && reqUrl.pathname === "/health") {
      return send(res, 200, {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connected: runtimeState.connected,
      });
    }
    if (req.method === "GET" && reqUrl.pathname === "/api/candidates") {
      return send(res, 200, {
        connected: runtimeState.connected,
        polling_ms: SHEET_POLL_MS,
        last_sync_at: runtimeState.lastSyncAt,
        last_error: runtimeState.lastError,
        candidates: runtimeState.candidates,
        stats: {
          total: runtimeState.total,
          processed: runtimeState.processed,
          pending: runtimeState.pending,
          strong_yes: runtimeState.strongYes,
        },
      });
    }
    if (req.method === "POST" && reqUrl.pathname === "/api/process") {
      await readJsonBody(req).catch(() => ({}));
      const result = await processUnprocessedRows();
      return send(res, 200, {
        ok: true,
        processed: result.processed,
        message: result.message,
        last_sync_at: runtimeState.lastSyncAt,
        connected: runtimeState.connected,
        last_error: runtimeState.lastError,
      });
    }
    if (req.method === "GET") {
      const html = fs.readFileSync(INDEX_PATH, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    send(res, 404, "Not found.");
  } catch (err) {
    send(res, 500, String(err?.message || "Internal error."));
  }
});

server.listen(PORT, () => {
  console.log(`Quest Evaluator running at http://localhost:${PORT}`);
  console.log(`GOOGLE_SHEET_ID: ${process.env.GOOGLE_SHEET_ID ? "configured" : "missing"}`);
  console.log(`GOOGLE_SERVICE_ACCOUNT_KEY: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? "configured" : "missing"}`);
  console.log(`Polling Google Sheets every ${SHEET_POLL_MS / 1000} seconds.`);
  processUnprocessedRows().catch((err) => console.error("Initial poll error:", err.message));
  setInterval(() => {
    console.log(`[${new Date().toISOString()}] Auto-polling Google Sheet...`);
    processUnprocessedRows().catch((err) => console.error("Poll error:", err.message));
  }, SHEET_POLL_MS);
});
