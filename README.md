# Opportunity Progression Skill

MEDDPICC / EDDIC gap analysis, stage alignment assessment, and deal progression recommendations for AWS opportunities. Upload a Scorecard; receive a structured analysis covering deal health, stage alignment, element gaps, and a concrete action plan.

## Contents

| File | Purpose |
|---|---|
| `SKILL.md` | Main skill definition — phases, rules, output templates |
| `meddpicc-framework.md` | MEDDPICC + EDDIC element definitions and interdependency matrices |
| `aws-sales-stages.md` | AWS sales-stage → MEDDPICC/EDDIC mapping |
| `reserved-interfaces.md` | Planned external data-source integrations |
| `scorecard-form.html` | MEDDPICC Scorecard input form (8 elements); exports to .xlsx |
| `eddic-scorecard-form.html` | EDDIC Scorecard input form (5 elements); exports to .xlsx |
| `templates/opportunity-progression.html.j2` | Phase 7 Jinja2 template (Material Design 3, purple primary); aligned with the Sales Agent team-wide output standard |
| `examples/sample-data.json` | Data contract for the Phase 7 template; canonical reference for every expected key |
| `examples/render_sample.py` | Renders `sample-data.json` through the template to verify output |
| `examples/sample-report.html` | Pre-rendered preview (open in a browser to see the MD3 reading interface) |
| `EDDIC Scorecard V1.xlsx` | EDDIC Scorecard template |
| `MEDDPICC Scorecard V3 E.xlsx` | MEDDPICC Scorecard template |
| `MEDDPICC 和 Sales Stage 1.xlsx` | Source mapping between MEDDPICC elements and AWS sales stages |

## Three-Tier Analysis

| Tier | Scorecard | Elements |
|---|---|---|
| Commodity | none — skill exits | — |
| Simple | EDDIC | 5 (I, E, DC, DP, CP) |
| Strategic | MEDDPICC | 8 (M, E, DC, DP, P, I, CH, CP) |

## Phase Flow

```
Phase 1       Opportunity Classification  (user self-classifies)
Phase 1B      Scorecard Upload & Parse    (silent on clean parse)
Phase 2       Deal Assessment             (health, blocker, immediate action)
Phase 2.5     Stage Alignment Assessment  (rollback/advancement advisory)
Phase 3       Sales Stage Assessment      (exit criteria, risk)
Phase 4       Market & Competitive Intel  (delegated to other skills)
Phase 5       Element Gap Analysis        (diagnostics, stakeholder profiling, questions)
Phase 6       Action Plan                 (strategies + weekly plan)
Phase 7       Reading Report Generation   (Jinja2 MD3 template · HTML default; PDF / Word on demand)
```

## Phase 7 Output Standard

Aligned with the Sales Agent team-wide documentation standard:

- **Default output:** HTML (rendered via Jinja2 from `templates/opportunity-progression.html.j2`)
- **On request:** PDF (headless Chromium via Playwright or system Chrome) or Word (python-docx)
- **Visual:** Material Design 3, `#6750A4` purple primary, Tailwind via CDN
- **Typography:** Latin → Amazon Ember; CJK → 思源黑体 SC (Source Han Sans SC, Noto Sans SC fallback)
- **Data contract:** `examples/sample-data.json` defines every template key
- **Preview:** open `examples/sample-report.html` in a browser

Regenerate the preview after any template / data change:

```bash
python3 examples/render_sample.py   # requires: pip install jinja2
python3 examples/export_pdf.py  examples/sample-report.html   # PDF (Playwright or Chrome)
python3 examples/export_docx.py examples/sample-data.json     # Word (python-docx)
```

## Related Skills (delegated)

Phase 4 and Phase 5 delegate to standalone skills: `Account Information`, `Solutions Search`, `Compete`, `Contact Profiling`. Those skills are independent and maintained separately.
