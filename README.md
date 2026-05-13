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
| `report-template.html` | Phase 7 reading-interface template (Material Design 3); filled with sample data, substituted at runtime |
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
Phase 7       Reading Report Generation   (one-file HTML deliverable · Material Design 3)
```

## Related Skills (delegated)

Phase 4 and Phase 5 delegate to standalone skills: `Account Information`, `Solutions Search`, `Compete`, `Contact Profiling`. Those skills are independent and maintained separately.
