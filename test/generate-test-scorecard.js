const XLSX = require("xlsx");
const path = require("path");

const wb = XLSX.utils.book_new();

// === Sheet 1: Opportunity Basic Information ===
const basicData = [
  ["Account Name", "Opportunity Name", "Opportunity Location", "Opportunity Type", "Others Description", "Opp Stage", "Score"],
  ["TechVision Corp", "TechVision Cloud Migration - ERP Modernization", "Hong Kong", "Migration", "", "Technical Validation", 62],
  [],
  ["Stage", "Exit Criteria", "Completion %", "Current Status", "Remarks"],
  ["Prospect", "Customer opportunity identified", 100, "Done", ""],
  ["Prospect", "Opportunity has products with a valid estimated value (non-zero-dollar value)", 100, "Done", "$2.4M ARR"],
  ["Prospect", "Initial customer meeting scheduled", 100, "Done", ""],
  ["Qualified", "Customer is willing to pursue a solution", 80, "In progress", "Budget approved but scope TBD"],
  ["Qualified", "Customer champion & decision-maker identified", 60, "At risk", "Champion identified, EB access limited"],
  ["Qualified", "Delivery partner strategy (Partner and/or ProServe) identified", 70, "In progress", "ProServe engaged"],
  ["Technical Validation", "Customer and AWS share common understanding of solution architecture, implementation, and process", 50, "In progress", "Architecture review pending"],
  ["Technical Validation", "Technical solution design finalized and agreed with customer", 30, "Not started", "POC not yet scoped"],
];

const ws1 = XLSX.utils.aoa_to_sheet(basicData);
ws1["!cols"] = [{ wch: 20 }, { wch: 60 }, { wch: 15 }, { wch: 30 }, { wch: 15 }];
XLSX.utils.book_append_sheet(wb, ws1, "Opportunity Basic Information");

// === Sheet 2: Scorecard English ===
// Scores designed to show realistic gaps:
//   I: 8/12 (67%) - pain identified but not fully quantified
//   M: 6/13 (46%) - weak metrics
//   E: 7/13 (54%) - EB identified but not engaged
//   CH: 5/12 (42%) - champion weak
//   CO: 8/12 (67%) - aware of competition
//   DC: 9/13 (69%) - decent but not differentiated
//   DP: 7/13 (54%) - process not validated
//   P: 4/12 (33%) - paper process unknown
const scorecard = [
  ["Category", "Element", "Evaluation Statement", "Applies", "Score", "#OneTeam Role", "Action Plan", "Potential Issues", "Target Date", "Remarks"],
  // I — Implicate the Pain (8/12)
  ["Business Driven", "I — Implicate the Pain", "I have identified the customer's pain and the implications.", "Yes", 4, "SA", "Deep-dive workshop", "Customer may not disclose full pain", "2026-05-10", ""],
  ["Business Driven", "I — Implicate the Pain", "There are sufficient, quantifiable, negative consequences of the pain.", "Yes", 2, "", "", "", "", ""],
  ["Business Driven", "I — Implicate the Pain", "The customer agrees the pain compels them to act.", "Yes", 2, "", "", "", "", ""],
  // M — Metrics (6/13)
  ["Business Driven", "M — Metrics", "I know the urgency and quantified the business problem(s) into a metric.", "Yes", 2, "", "", "", "", ""],
  ["Business Driven", "M — Metrics", "Our key metric is directly aligned with the Economic Buyer's primary business objectives and strategic goals.", "No", 1, "", "", "", "", ""],
  ["Business Driven", "M — Metrics", "I verified the metric with my Champion(s).", "No", 1, "", "", "", "", ""],
  ["Business Driven", "M — Metrics", "I verified the metric with the Economic Buyer.", "No", 2, "", "", "", "", ""],
  // E — Economic Buyer (7/13)
  ["Business Driven", "E — Economic Buyer", "I have engaged with the Economic Buyer and discussed the initiative.", "Yes", 3, "AM", "Request EB meeting", "EB gatekeeper blocking", "2026-05-05", ""],
  ["Business Driven", "E — Economic Buyer", "The Economic Buyer recognizes the business pain points, AWS solutions, and the value (metrics) that the solutions deliver.", "No", 2, "", "", "", "", ""],
  ["Business Driven", "E — Economic Buyer", "The Economic Buyer has given me a verbal 'go' on the deal.", "No", 2, "", "", "", "", ""],
  // CH — Champion (5/12)
  ["Core Resource", "CH — Champion", "My Champion has power and influence.", "Yes", 2, "", "", "", "", ""],
  ["Core Resource", "CH — Champion", "The Champion is providing valuable intel.", "Yes", 2, "", "", "", "", ""],
  ["Core Resource", "CH — Champion", "I have evidence the Champion is selling internally.", "No", 1, "", "", "", "", ""],
  // CO — Competition (8/12)
  ["Process Driven", "CO — Competition", "Aware that the customer is considering alternatives to AWS.", "Yes", 4, "", "", "", "", ""],
  ["Process Driven", "CO — Competition", "AWS has advantages that alternatives do not.", "Yes", 3, "", "", "", "", ""],
  ["Process Driven", "CO — Competition", "The customer's decision criteria favor AWS over the alternatives.", "Yes", 1, "", "", "", "", ""],
  // DC — Decision Criteria (9/13)
  ["Process Driven", "DC — Decision Criteria", "The customer's buying decision criteria have been identified.", "Yes", 3, "SA", "Align DC to AWS strengths", "", "2026-05-15", ""],
  ["Process Driven", "DC — Decision Criteria", "The Champion has confirmed the decision criteria.", "Yes", 2, "", "", "", "", ""],
  ["Process Driven", "DC — Decision Criteria", "The decision criteria are differentiated for AWS.", "No", 2, "", "", "", "", ""],
  ["Process Driven", "DC — Decision Criteria", "We have ruled out 'do nothing' as an option for the customer.", "Yes", 2, "", "", "", "", ""],
  // DP — Decision Process (7/13)
  ["Process Driven", "DP — Decision Process", "I fully understand the customer's decision-making process.", "Yes", 2, "", "", "", "", ""],
  ["Process Driven", "DP — Decision Process", "I have validated the decision process with multiple stakeholders.", "No", 2, "", "", "", "", ""],
  ["Process Driven", "DP — Decision Process", "I know the timeline and key milestones.", "Yes", 2, "", "", "", "", ""],
  ["Process Driven", "DP — Decision Process", "I have influenced the decision process in AWS's favor.", "No", 1, "", "", "", "", ""],
  // P — Paper Process (4/12)
  ["Process Driven", "P — Paper Process", "I understand all the steps in the customer's procurement process.", "No", 2, "", "", "", "", ""],
  ["Process Driven", "P — Paper Process", "I know who has signatory authority.", "No", 1, "", "", "", "", ""],
  ["Process Driven", "P — Paper Process", "I have a Champion for the Paper Process.", "No", 1, "", "", "", "", ""],
];

const ws2 = XLSX.utils.aoa_to_sheet(scorecard);
ws2["!cols"] = [{ wch: 16 }, { wch: 24 }, { wch: 60 }, { wch: 8 }, { wch: 6 }, { wch: 16 }, { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 20 }];
XLSX.utils.book_append_sheet(wb, ws2, "Scorecard English");

// === Sheet 3: Competitive Info ===
const compData = [
  ["Field", "Value"],
  ["Account Name", "TechVision Corp"],
  ["EB Job Title", "CTO"],
  ["Customer Business Objective", "Migrate legacy on-prem ERP system to cloud to reduce operational costs by 30% and improve scalability for APAC expansion"],
  ["Potential Obstacles", "Incumbent Azure relationship with IT ops team; data residency concerns in HK; internal resistance from legacy team"],
  ["Current Opp Stage", "Technical Validation"],
  ["AWS Solutions and Services", "EC2, RDS Aurora, S3, DMS, Migration Hub, CloudFormation"],
  ["AWS Competitor", "Azure, Alibaba Cloud"],
];

const ws3 = XLSX.utils.aoa_to_sheet(compData);
ws3["!cols"] = [{ wch: 30 }, { wch: 80 }];
XLSX.utils.book_append_sheet(wb, ws3, "Competitive Info");

// Write file
const outPath = path.join(__dirname, "MEDDPICC_Scorecard_TechVision_2026-04-27.xlsx");
XLSX.writeFile(wb, outPath);
console.log(`Test scorecard created: ${outPath}`);
console.log("\nScenario summary:");
console.log("  Customer: TechVision Corp (Hong Kong)");
console.log("  Opportunity: Cloud Migration - ERP Modernization ($2.4M ARR)");
console.log("  Stage: Technical Validation");
console.log("  Total Score: 62/100");
console.log("  EB: CTO (C-level → Strategic trigger)");
console.log("  Competitors: Azure, Alibaba Cloud (named → Strategic trigger)");
console.log("\n  Element scores:");
console.log("    I  (Implicate Pain):   8/12  (67%)");
console.log("    M  (Metrics):          6/13  (46%)");
console.log("    E  (Economic Buyer):   7/13  (54%)");
console.log("    CH (Champion):         5/12  (42%)");
console.log("    CO (Competition):      8/12  (67%)");
console.log("    DC (Decision Criteria): 9/13 (69%)");
console.log("    DP (Decision Process): 7/13  (54%)");
console.log("    P  (Paper Process):    4/12  (33%)");
console.log("\n  Expected classification: Strategic Opportunity (both triggers met)");
console.log("  Key gaps: CH (42%), P (33%), M (46%), E (54%)");
