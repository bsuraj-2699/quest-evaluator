# Must Company - Quest Submission Evaluator

Automated hiring pipeline with AI-powered evaluation.

```
Google Form → Google Sheets → Auto Agent Evaluation → Employer Dashboard
```

## What It Does

This system automates candidate evaluation for Must Company's FDE (Forward Deployed Engineers) and APO (AI-Native Product Owners) hiring process:

1. Candidates fill out a Google Form with their quest submission.
2. Form responses are collected in a Google Sheet.
3. The evaluator polls the sheet every 60 seconds for new submissions.
4. For each unprocessed row:
   - Extracts candidate data from sheet columns.
   - Fetches README content from GitHub repo URLs.
   - Downloads and extracts ZIP files to collect project context.
   - Evaluates submission using configured AI model.
   - Writes full scorecard back to the sheet (columns L-Y).
   - Marks row as "Processed".
5. Employer dashboard displays all candidates sorted by score with color-coded badges.

## Google Sheet Column Structure

### Input Columns (from Google Form)

- **Column A:** Timestamp
- **Column B:** Email
- **Column C:** Candidate Name
- **Column D:** Phone Number
- **Column E:** AI Agent Title
- **Column F:** Problem Statement
- **Column G:** AI Agent ZIP File (Google Drive link)
- **Column H:** GitHub Repository URL
- **Column I:** Calculation Method
- **Column J:** Performance Score
- **Column K:** Benchmark Comparison

### Output Columns (written by evaluator)

- **Column L:** Status (Processed / Pending / Error)
- **Column M:** Total Score (out of 100)
- **Column N:** Problem Clarity (1-10)
- **Column O:** Priority Reasoning (1-10)
- **Column P:** AI Leverage Efficiency (1-10)
- **Column Q:** Documentation Quality (1-10)
- **Column R:** Security Awareness (1-10)
- **Column S:** Performance Score Validity (1-10)
- **Column T:** Cursor Integration (1-10)
- **Column U:** Strengths
- **Column V:** Weaknesses
- **Column W:** Recommendation (Strong Yes/Yes/Maybe/No)
- **Column X:** Priority Definition Summary
- **Column Y:** Evaluated At (timestamp)

**Note:** The evaluator will automatically expand your sheet to 25 columns (A-Y) if it's currently smaller, and will add missing column headers on first run.

## Setup

### 1. Google Cloud Project Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### 2. Service Account Creation

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in service account details and click "Create"
4. Skip optional steps and click "Done"
5. Click on the newly created service account
6. Go to "Keys" tab
7. Click "Add Key" → "Create new key"
8. Select "JSON" format
9. Download the JSON file and save it as `credentials.json` in the `quest-evaluator` folder

### 3. Share Google Sheet with Service Account

1. Open your Google Sheet
2. Click "Share" button
3. Copy the service account email from `credentials.json` (looks like: `service-account-name@project-id.iam.gserviceaccount.com`)
4. Paste it in the share dialog
5. Grant "Editor" permissions
6. Click "Share"

### 4. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```powershell
   cd .\quest-evaluator
   copy .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```
   OPENAI_API_KEY=sk-your-openai-key-here
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
   GEMINI_API_KEY=your-gemini-key-here
   MISTRAL_API_KEY=your-mistral-key-here
   GROQ_API_KEY=gsk-your-groq-key-here
   GOOGLE_SHEET_ID=1a2b3c4d5e6f7g8h9i0j
   GOOGLE_SERVICE_ACCOUNT_KEY=./credentials.json
   ```

3. Get your Google Sheet ID from the sheet URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
   ```

### 5. Install Dependencies

```powershell
cd .\quest-evaluator
npm install
```

## Run

```powershell
node server.js
```

Open `http://localhost:3000` in your browser.

## Employer Dashboard Features

### Stats Bar
- **Total Candidates:** All form submissions
- **Processed:** Successfully evaluated candidates
- **Pending:** Awaiting evaluation
- **Strong Yes:** Top recommendation count

### Filter Options
- All
- Strong Yes (green badge)
- Yes (blue badge)
- Maybe (yellow badge)
- No (red badge)

### Sort Options
- Score (High to Low) - default
- Date (Recent First)
- Name (A-Z)

### Candidate Cards
Each card displays:
- Candidate name, email, phone
- AI Agent title
- Total score (large, color-coded)
- Recommendation badge
- Expandable "View Full Scorecard" with:
  - 7 dimension mini progress bars
  - Strengths (bullets)
  - Weaknesses (bullets)
  - Priority Definition Summary
  - Submission and evaluation timestamps

### Connection Status
- Green dot: Connected to Google Sheets
- Gray dot: Disconnected
- Last sync timestamp
- Error messages (if any)
- "Sync Now" button for manual refresh

## How It Works

### Auto-Polling
- Server automatically polls Google Sheets every 60 seconds
- Checks for rows where Column L (Status) is empty
- Processes each unprocessed row sequentially
- Logs each poll to console with timestamp

### GitHub README Extraction
When Column H contains a GitHub URL:
1. Parses owner/repo from URL
2. Calls GitHub API: `https://api.github.com/repos/{owner}/{repo}/readme`
3. Fetches raw README content
4. Includes in evaluation context

### ZIP File Handling
When Column G contains a ZIP file link:
- **Google Drive links:** Automatically extracts FILE_ID and downloads ZIP
  - Supports formats:
    - `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
    - `https://drive.google.com/open?id=FILE_ID`
  - Converts to direct download URL
  - Downloads using axios
  - Extracts target files using adm-zip
- **Direct download links:** Downloads and extracts target files using JSZip

### AI Evaluation
Uses the configured AI provider (default: OpenAI gpt-4o) to:
1. Analyze README/project context
2. Score 7 dimensions (1-10 each)
3. Calculate weighted total score (out of 100)
4. Identify 2-3 strengths and weaknesses
5. Generate hiring recommendation
6. Summarize priority definition ability

### Results Write-Back
After evaluation completes:
- Writes all scores to columns M-T
- Writes strengths/weaknesses to columns U-V
- Writes recommendation to column W
- Writes priority summary to column X
- Writes timestamp to column Y
- Marks status as "Processed" in column L

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (for gpt-4o) | `sk-proj-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key (for Claude) | `sk-ant-...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `MISTRAL_API_KEY` | Mistral AI API key | `...` |
| `GROQ_API_KEY` | Groq API key | `gsk_...` |
| `GOOGLE_SHEET_ID` | Sheet ID from URL | `1a2b3c4d5e6f7g8h9i0j` |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Path to credentials JSON (local) | `./credentials.json` |
| `GOOGLE_CREDENTIALS_JSON` | Full JSON credentials (Railway) | `{"type":"service_account",...}` |
| `DEFAULT_MODEL_PROVIDER` | AI provider to use (optional) | `openai` (default) |
| `PORT` | Server port (optional) | `3000` (default) |

## API Endpoints

### GET /health
Health check endpoint for Railway and monitoring.

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-21T...",
  "uptime": 12345.67,
  "connected": true
}
```

### GET /api/candidates
Returns all candidates with scores and stats.

Response:
```json
{
  "connected": true,
  "polling_ms": 60000,
  "last_sync_at": "2026-03-21T...",
  "last_error": "",
  "candidates": [...],
  "stats": {
    "total": 10,
    "processed": 8,
    "pending": 2,
    "strong_yes": 3
  }
}
```

### POST /api/process
Manually trigger processing of unprocessed rows.

Response:
```json
{
  "ok": true,
  "processed": 2,
  "message": "Processed 2 candidate(s).",
  "last_sync_at": "2026-03-21T...",
  "connected": true,
  "last_error": ""
}
```

## Security Notes

- API keys stay server-side in `.env` file
- Never commit `.env` or `credentials.json` to version control
- Service account has minimal permissions (Sheets only)
- Add `.env` and `credentials.json` to `.gitignore`

## Troubleshooting

### "Missing GOOGLE_SHEET_ID"
- Ensure `.env` file exists in `quest-evaluator` folder
- Check that `GOOGLE_SHEET_ID` is set correctly

### "Missing GOOGLE_SERVICE_ACCOUNT_KEY"
- Verify `credentials.json` exists in the correct location
- Check file path in `.env` matches actual file location
- Ensure JSON file is valid (open in text editor to verify)

### "Permission denied" errors
- Verify you shared the Google Sheet with service account email
- Grant "Editor" permissions (not just "Viewer")
- Service account email is in the `client_email` field of `credentials.json`

### "No data rows" or "Sheet is empty"
- Ensure Google Form responses are flowing to the sheet
- Check that column headers match expected names
- Row 1 must be headers, data starts from row 2

### GitHub README fetch fails
- Ensure URL is in format: `https://github.com/owner/repo`
- Works with public repos only
- Private repos will show empty README context

### Dashboard shows "Disconnected"
- Check console logs for detailed error messages
- Verify Google credentials are correct
- Ensure service account has Sheets API enabled
- Confirm sheet is shared with service account email

### "Range exceeds grid limits" error
- Fixed automatically: The evaluator now expands the sheet to 25 columns (A-Y) if needed
- Adds missing output column headers automatically on first run
- If error persists, manually add columns L-Y to your sheet

### Google Drive ZIP download fails
- Ensure the ZIP file sharing is set to "Anyone with the link can view"
- Google Drive link must be in one of these formats:
  - `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
  - `https://drive.google.com/open?id=FILE_ID`
- Check console logs for detailed error messages
- If download continues to fail, use direct ZIP hosting instead

## Deployment (Railway)

### Prerequisites
1. Push your code to GitHub (ensure `.env` and `credentials.json` are in `.gitignore`)
2. Create a [Railway](https://railway.app) account

### Step-by-Step Deployment

1. **Create New Project on Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub
   - Select your quest-evaluator repository

2. **Configure Environment Variables:**
   - In Railway dashboard, go to your project → Variables tab
   - Add all environment variables from your `.env` file:
     - `OPENAI_API_KEY` (or whichever AI provider you're using)
     - `ANTHROPIC_API_KEY`
     - `GEMINI_API_KEY`
     - `MISTRAL_API_KEY`
     - `GROQ_API_KEY`
     - `GOOGLE_SHEET_ID`
     - `DEFAULT_MODEL_PROVIDER` (optional, defaults to `openai`)

3. **Add Google Service Account Credentials:**
   - Open your `credentials.json` file
   - Copy the ENTIRE JSON content (all lines)
   - In Railway Variables tab, create new variable:
     - Name: `GOOGLE_CREDENTIALS_JSON`
     - Value: Paste the entire JSON content
   - Railway will automatically use this instead of the file

4. **Deploy:**
   - Railway will automatically build and deploy
   - Wait for deployment to complete (check logs)
   - Railway provides a public URL: `https://your-app.railway.app`

5. **Verify Deployment:**
   - Visit your Railway URL
   - Check health: `https://your-app.railway.app/health`
   - Should return: `{"status":"ok","timestamp":"...","uptime":...,"connected":true}`

### Environment Variable Priority

The app reads Google credentials in this order:
1. `GOOGLE_CREDENTIALS_JSON` env variable (for Railway) - **recommended for deployment**
2. `GOOGLE_SERVICE_ACCOUNT_KEY` as JSON string
3. `GOOGLE_SERVICE_ACCOUNT_KEY` as file path (for local development)

### Deployment Notes

- Railway automatically detects Node.js and runs `npm install`
- The `railway.json` file configures:
  - Builder: NIXPACKS
  - Start command: `node server.js`
  - Health check: `/health` endpoint
  - Restart policy: ON_FAILURE
- Auto-polling starts immediately on deployment
- Logs are viewable in Railway dashboard

### Updating Your Deployment

To deploy updates:
```bash
git add .
git commit -m "Update quest evaluator"
git push origin main
```

Railway auto-deploys on every push to main branch.

## Development

To modify evaluation criteria or scoring:
1. Edit `buildEvaluationPrompts()` in `server.js`
2. Update dimension weights as needed
3. Adjust normalization logic in `callProviderModel()`

To change polling interval:
- Modify `SHEET_POLL_MS` constant (currently 60000ms = 60 seconds)

To add more AI providers:
- Add to `PROVIDER_CONFIG` object
- Add corresponding API key to `.env.example`
- Update provider selection logic if needed
