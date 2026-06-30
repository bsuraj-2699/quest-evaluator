<div align="center">

<img src="https://capsule-render.vercel.app/api?type=venom&color=0:0f172a,50:1e3a5f,100:6366f1&height=200&section=header&text=quest-evaluator&fontSize=50&fontColor=ffffff&fontAlignY=40&desc=Automated%20AI%20hiring%20pipeline%20%E2%80%94%20form%20to%20scored%20dashboard%2C%20zero%20manual%20effort&descAlignY=62&descSize=14&descColor=a5b4fc&animation=fadeIn" width="100%" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=18&duration=2800&pause=900&color=6366F1&center=true&vCenter=true&multiline=false&repeat=true&width=680&height=45&lines=Google+Form+%E2%86%92+Sheet+%E2%86%92+AI+Eval+%E2%86%92+Dashboard;8-second+evaluation+%E2%80%94+112x+faster+than+manual+review;Zero+manual+effort+after+setup+%F0%9F%9A%80;Built+entirely+in+Cursor+in+under+24+hours" alt="Typing" />

<br/><br/>

[![Live Demo](https://img.shields.io/badge/Live-Demo-06b6d4?style=for-the-badge&logo=vercel&logoColor=white)](https://quest-evaluator-production.up.railway.app)
![Node](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Render](https://img.shields.io/badge/Render-Deployed-0B0D0E?style=for-the-badge&logo=render&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-API-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)

<br/>

![Status](https://img.shields.io/badge/Status-Production-6366f1?style=flat-square)
![Score](https://img.shields.io/badge/Performance%20Rating-9%2C150%2F10%2C000-06b6d4?style=flat-square)
![Speed](https://img.shields.io/badge/Eval%20Time-~8s-FF6B35?style=flat-square)
![Built With](https://img.shields.io/badge/Built%20With-Cursor-a5b4fc?style=flat-square)

</div>

---

## ⚡ What it does

> Quest-based hiring requires evaluating AI agents candidates submit — code, READMEs, benchmarks, reasoning. Manual review is slow, inconsistent, and breaks down at scale. This agent **is** the job posting: it automates the exact workflow quest hiring describes.

```
Google Form → Google Sheets → Auto Agent Evaluation → Employer Dashboard
```

| | Step | Detail |
|:---:|:---|:---|
| 📝 | **Candidate submits** | Google Form with GitHub repo / ZIP, problem statement, metrics |
| 🔄 | **Auto-polls every 60s** | Agent picks up new unprocessed rows from the linked Sheet |
| 📥 | **Fetches everything** | GitHub README auto-fetch + Google Drive ZIP auto-download & extraction |
| 🤖 | **Evaluates** | Any of 5 AI providers scores against a 7-dimension rubric |
| 📊 | **Writes back + displays** | Scorecard → Sheet columns L–Y → live employer dashboard |

> 🎯 **North Star:** Zero manual effort for the employer. One Google Form link shared with candidates. Everything else is automated.

---

## 📊 Performance

### Rating: **9,150 / 10,000**

| Dimension | Weight | Score | Weighted |
|:---|:---:|:---:|:---:|
| Pipeline Automation | 25% | 10/10 | 2,500 |
| AI Leverage Efficiency | 25% | 9/10 | 2,250 |
| Problem-Solution Fit | 20% | 10/10 | 2,000 |
| Multi-Provider Flexibility | 15% | 9/10 | 1,350 |
| Security Implementation | 15% | 7/10 | 1,050 |
| **Weighted Total** | | | **9,150** |

**Measurement:**
- **Pipeline Automation** — 0 manual steps required after initial setup
- **AI Leverage Efficiency** — average **~8 seconds** from form submission to scored result
- **Problem-Solution Fit** — 10/10 quest requirements covered, including Drive ZIP auto-download + Railway deployment
- **Multi-Provider Flexibility** — tested with OpenAI gpt-4o, confirmed compatible with Anthropic, Gemini, Mistral, Groq via identical interface
- **Security** — API keys server-side only, `credentials.json` excluded from repo

---

## 🏆 Benchmark — vs. Manual Cursor + Claude Review

<div align="left">

| Attribute | `quest-evaluator` | Manual Review |
|:---|:---:|:---:|
| Time per candidate | **~8 seconds** | 15–30 minutes |
| Consistency | 100% — same rubric every time | Variable per reviewer |
| Scalability | Unlimited, auto-polls | Limited by human bandwidth |
| Data persistence | Auto-written to Sheets | Manual notes |
| README fetch | Automatic | Manual copy-paste |
| ZIP download | Automatic | Manual download |
| Provider support | 5 providers | Single session |
| Employer dashboard | Real-time ranked view | None |
| Publicly deployed | ✅ Railway URL | N/A |

</div>

**Where this agent excels:** speed (**112× faster**), unlimited scale, zero reviewer bias, full Google Workspace integration, bring-your-own-key flexibility across 5 providers.

**Where default Claude still wins:** nuanced judgment on edge cases, zero setup required, handles ambiguity without prompt engineering.

---

## 🔧 Features

**Core pipeline:** Google Form intake (10 fields) · Sheets auto-sync via service account · GitHub README auto-fetch · Drive ZIP auto-download & extraction · secret-stripping clean download · structured JSON evaluation · score write-back · 60s auto-polling · public Railway deployment

**Employer dashboard:** real-time cards sorted by score · filter by Strong Yes / Yes / Maybe / No · sort by score, date, name · stats bar (total / processed / pending / strong yes) · expandable full scorecard · connection status indicator · manual sync button

**Scoring dimensions (7, each 1–10):** Problem Clarity · Priority Reasoning · AI Leverage Efficiency · Documentation Quality · Security Awareness · Performance Score Validity · Cursor Integration

---

## 🤖 Multi-Provider AI Support

Plug in any ONE key — no code changes:

<div align="center">

![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-claude--sonnet--4-D4A27F?style=for-the-badge&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-1.5--pro-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Mistral](https://img.shields.io/badge/Mistral-large--latest-FF7000?style=for-the-badge&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-llama--3.3--70b-F55036?style=for-the-badge&logoColor=white)

</div>

> 💡 Use **Groq** to run this agent completely free.

---

## 🖥️ Cursor-Native Build

This project is **fully Cursor-native** — built entirely with Cursor Composer (`Ctrl+I`), zero manual file creation, in under **24 hours**.

```
.cursorrules philosophy:

You are an AI hiring evaluator for an AI-native company.
Priority: Evaluate candidates on Priority Definition Ability above all else.
Never hardcode API keys.
Always return structured JSON.
Score objectively — no bias toward verbose submissions.
```

---

## 🛠️ Tech Stack

<div align="center">

[![Skills](https://skillicons.dev/icons?i=nodejs,js,html,railway&theme=dark)](https://skillicons.dev)

![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-D4A27F?style=for-the-badge&logoColor=white)
![Google Sheets API](https://img.shields.io/badge/Sheets%20API-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)
![Cursor](https://img.shields.io/badge/Cursor-000000?style=for-the-badge&logo=cursor&logoColor=white)

</div>

---

## 🚀 Setup

### Option A — Use the deployed version (recommended)
```
https://quest-evaluator-production.up.railway.app
```

### Option B — Run locally

**Prerequisites:** Node.js v18+ · a Google account · one AI provider key (Groq is free)

**1. Google Cloud setup**
1. Open [Google Cloud Console](https://console.cloud.google.com/) → select or create a project
2. Enable **Google Sheets API** — APIs & Services → Library → search → Enable
3. Create a Service Account — IAM & Admin → Service Accounts → Create
4. Download the JSON key → save as `credentials.json` in the project folder

**2. Google Form + Sheet**
1. Create a form with: Candidate Name, Email, Phone, AI Agent Title, Problem Statement, GitHub URL, ZIP File, Performance Score, Calculation Method, Benchmark Comparison
2. Link responses to a new Google Sheet
3. Share the sheet with your service account email (**Editor** access)

**3. Environment**

```bash
cd quest-evaluator
copy .env.example .env
```

```env
# Add at least ONE provider key
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GEMINI_API_KEY=your-gemini-key-here
MISTRAL_API_KEY=your-mistral-key-here
GROQ_API_KEY=gsk-your-groq-key-here       # FREE option

GOOGLE_SHEET_ID=paste-your-sheet-id-here
GOOGLE_SERVICE_ACCOUNT_KEY=./credentials.json
```

Sheet ID lives in the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

**4. Install & run**

```bash
npm install
node server.js
```

Open **http://localhost:3000**

---

## ☁️ Deployment (Railway)

1. Push to GitHub — `.env` and `credentials.json` excluded via `.gitignore`
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub → select repo
3. Add environment variables in the Railway dashboard (same as `.env`)
4. For `credentials.json` — paste the full JSON as a `GOOGLE_CREDENTIALS_JSON` variable
5. Railway provides a public URL automatically ✅

---

## 📡 API Endpoints

| Method | Path | Purpose |
|:---|:---|:---|
| `GET` | `/api/candidates` | All candidates with scores + dashboard stats |
| `POST` | `/api/process` | Manually trigger evaluation of unprocessed rows |
| `GET` | `/health` | Health check for Railway deployment |

---

## 🔒 Security

API keys stored server-side in `.env`, never exposed to frontend · `credentials.json` and `.env` excluded via `.gitignore` · service account scoped to Sheets-only access · clean-download feature auto-strips API keys from candidate ZIPs · env vars validated on startup with clear errors

---

## 📁 Project Structure

```
quest-evaluator/
├── index.html          # Employer dashboard UI
├── server.js           # Node backend + Sheets + AI evaluation
├── railway.json        # Railway deployment config
├── .cursorrules        # Cursor agent configuration
├── credentials.json    # Google service account (DO NOT COMMIT)
├── .env                # API keys (DO NOT COMMIT)
├── .env.example        # Template for environment variables
└── .gitignore          # Excludes .env and credentials.json
```

---

## 🐛 Troubleshooting

| Error | Fix |
|:---|:---|
| `Sheet has no data rows` | Submit a test Google Form response first |
| `Range exceeds grid limits` | Agent auto-expands sheet to 25 columns on next run |
| `Permission denied` | Share sheet with service account email as Editor |
| `Missing GOOGLE_SHEET_ID` | Check `.env` has the correct Sheet ID |
| GitHub fetch fails | Ensure repo is public |
| Drive ZIP fails | Ensure file is shared "Anyone with the link" |
| Dashboard shows Disconnected | Check terminal logs + verify `credentials.json` path |

---

## 🧩 Development Notes

- **Change scoring criteria** → edit `buildEvaluationPrompt()` in `server.js`
- **Change polling interval** → modify `SHEET_POLL_MS` (default `60000`ms)
- **Add a new AI provider** → add to `PROVIDER_CONFIG` in `server.js` + `.env.example`

---

## 💭 Why this agent?

> *"If we had to name just one essential quality — Priority Definition Ability."*

Built by first asking what the company's actual problem was: manually evaluating dozens of quest submissions is slow, inconsistent, and unscalable. The priority was clear. The solution followed.

---

<div align="center">

*Built with Cursor + Claude + OpenAI + Google Workspace in under 24 hours.*

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,100:06b6d4&height=120&section=footer&text=score+smarter%2C+hire+faster&fontSize=15&fontColor=e2e8f0&fontAlignY=68" width="100%" />

</div>
