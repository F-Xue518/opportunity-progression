# Opportunity Progression Skill

MEDDPICC-based opportunity analysis for AWS sales. Upload a Scorecard, get gap analysis, stage assessment, and prioritized recommendations.

## How It Works

1. User uploads a MEDDPICC Scorecard (.xlsx)
2. Skill classifies the opportunity as **Standard** or **Strategic**
3. Runs through 6 analysis phases (+ 1 optional), gated by user confirmation

### Opportunity Classification

| Type | Trigger | Scope |
|------|---------|-------|
| **Standard**（标准商机） | No named competitors, EB not C-level | E, DC, DP, I (4 elements) |
| **Strategic**（战略商机） | Has named competitor(s) OR EB is C-level | M, E, DC, DP, P, I, CH, CO (full 8) |

### Phases

| Phase | What It Does |
|-------|-------------|
| 1 | Input & context gathering from Scorecard |
| 1B | Opportunity classification (Standard / Strategic) |
| 2 | Market & competitive intelligence (web search) |
| 3 | Sales stage assessment against AWS exit criteria |
| 4 | Decision-maker profiling & buyer group alignment |
| 5 | Gap analysis & customer verification questions |
| 6 | Prioritized action plan |
| 7 | Business proposal generation (optional: value prop, business case, POC) |

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition — all phase logic and rules |
| `aws-sales-stages.md` | AWS sales stage exit criteria mapped to MEDDPICC elements |
| `reserved-interfaces.md` | Placeholders for future MCP data source integrations |
| `scorecard-form.html` | Browser-based Scorecard form — fill in and export as .xlsx |
| `scorecard-form.zip` | Packaged version of the form for distribution |
| `analyze-scorecards.js` | Batch analysis script for Scorecard data (Node.js) |
| `analyze-scorecards.py` | Same batch analysis script (Python version, requires dependencies) |

## Agent Dependencies

The skill calls two external agents during analysis:

- **CxO Persona** (Phase 4) — triggered when EB is C-level; returns behavioral profile and communication preferences
- **People Skill** (Phase 5) — always triggered before generating questions; returns cultural and communication guidance

## Scorecard Form

Open `scorecard-form.html` in a browser. It includes:
- Opportunity basic info (account, type, stage, exit criteria)
- MEDDPICC scoring (8 elements, 3-4 statements each, scored 1-5)
- Competitive info (EB title, business objective, obstacles, competitors)
- Export to .xlsx for upload

## Batch Analysis Tool

For analyzing multiple Scorecards (e.g., training cohort data):

```
node analyze-scorecards.js "C:\path\to\scorecard\folder"
```

Recursively scans for .xlsx files, extracts scores, runs k-means clustering (k=2), and outputs:
- `analysis_output/summary.xlsx` — all scorecards with scores, cluster labels, and stats
- `analysis_output/classification_rules.txt` — cluster comparison and suggested thresholds

Supports both Chinese and English Scorecard templates, including paired pre-class/post-class columns.
