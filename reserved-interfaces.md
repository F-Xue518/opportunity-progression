# Reserved Interfaces

Placeholders for future data source integrations (e.g., via MCP).

| # | Interface | Data Points |
|---|-----------|-------------|
| 1 | CRM Data (AWSentral) | Account Summary, Relationship Map, Opportunity Pipeline, Engagement History, UAP, Service Usage |
| 2 | Customer Reference | Customer Profile, Reference Details (business results/metrics), Reference Availability by region |
| 3 | Compete Intelligence | Competitor Profiles, Service-by-Service Comparison, Competitive Positioning, Battle Cards |
| 4 | Win/Loss Data | Win themes by competitor, Loss reasons, Win rate trends, Deal size patterns |
| 5 | Personas | Decision-maker behavioral profiles, communication preferences, decision-making styles |
| 6 | Pricing & GTM Resources | Pricing Models (RI/SP/Spot/Free Tier/EDP/PPA), GTM Programs & Incentives, Sales Plays |
| 7 | AWS Services | Product Catalog (descriptions, features, regional availability), Service Usage Analysis |
| 8 | Solution Architecture | Reference Architectures, AWS Solutions Library, deployment guides, GitHub repos |
| 9 | Compliance & Regulatory | Regional data privacy (PDPO, PIPL), industry compliance (PCI-DSS, SOC2), AWS certifications by region |
| 10 | Customer Conversation Builder | Preceding skill output: opportunity context, customer pain points, stakeholder mapping, competitive signals — mapped to MEDDPICC Scorecard structure for Phase 1 Mode B input |

## Integration Notes

- Phase 1 Step 1 Mode B: Uses Interface #10 for importing opportunity data from Customer Conversation Builder
- Phase 2 Step 3: Uses Interface #3, #4 for internal competitive intelligence
- Phase 4 Step 3: Uses Interface #5, #1 for CxO persona profiling (only when decision-maker is C-level)
- Phase 7: Uses internal business proposal templates when available
