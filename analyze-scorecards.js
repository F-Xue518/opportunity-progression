/**
 * MEDDPICC Scorecard Batch Analyzer (Node.js)
 *
 * Reads all .xlsx scorecards recursively from a folder,
 * extracts 8 element scores, runs k-means clustering (k=2), and outputs:
 *   1. summary.xlsx — one row per scorecard with all scores + basic info + cluster label
 *   2. classification_rules.txt — cluster comparison + suggested thresholds
 *
 * Usage:
 *   node analyze-scorecards.js "C:\Users\fexue\OneDrive - amazon.com\IFB Scorecard"
 */

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// --- Element definitions ---
const ELEMENTS = [
  { code: "M",  name: "Metrics",            max: 13, stmtCount: 4 },
  { code: "E",  name: "Economic Buyer",     max: 13, stmtCount: 3 },
  { code: "DC", name: "Decision Criteria",  max: 13, stmtCount: 4 },
  { code: "DP", name: "Decision Process",   max: 13, stmtCount: 4 },
  { code: "P",  name: "Paper Process",      max: 12, stmtCount: 3 },
  { code: "I",  name: "Implicate the Pain", max: 12, stmtCount: 3 },
  { code: "CH", name: "Champion",           max: 12, stmtCount: 3 },
  { code: "CO", name: "Competition",        max: 12, stmtCount: 3 },
];

const ELEMENT_CODES = ELEMENTS.map((e) => e.code);
const ELEMENT_MAX = Object.fromEntries(ELEMENTS.map((e) => [e.code, e.max]));
const STANDARD_SET = new Set(["E", "DC", "DP", "I"]);
const STRATEGIC_ONLY_SET = new Set(["M", "P", "CH", "CO"]);

// --- Chinese element name → code mapping ---
const CN_ELEMENT_MAP = {
  "Metrics": "M", "指标": "M",
  "Economic Buyer": "E", "最终决策者": "E",
  "Decision Criteria": "DC", "决策标准": "DC",
  "Decision Process": "DP", "决策流程": "DP",
  "Paper Process": "P", "文件流程": "P",
  "Implicate the Pain": "I", "Implicate Pain": "I", "识别痛点": "I",
  "Champion": "CH", "客户内部支持者": "CH",
  "Competition": "CO", "竞争": "CO",
};

function identifyElementCode(text) {
  if (!text) return null;
  const s = String(text).trim();
  for (const [keyword, code] of Object.entries(CN_ELEMENT_MAP)) {
    if (s.includes(keyword)) return code;
  }
  return null;
}

// --- Find all xlsx files recursively ---
function findXlsx(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findXlsx(full));
    } else if (entry.name.endsWith(".xlsx") && !entry.name.startsWith("~$")) {
      results.push(full);
    }
  }
  return results;
}

// --- Extract scores from the Chinese scorecard sheet ---
// Structure: element header rows have [null, "ElementName（中文）", score, ...]
// Statement rows have [null, "statement text", "Yes/No", ..., score_at_col7, ...]
// Some files have paired 课前/课后 columns; we handle both.
function pickBestScore(beforeScore, afterScore, max) {
  const b = typeof beforeScore === "number" ? beforeScore : 0;
  const a = typeof afterScore === "number" ? afterScore : 0;
  if (a > 0 && a < max) return Math.min(a, max);
  if (b > 0 && b < max) return Math.min(b, max);
  if (a > 0) return Math.min(a, max);
  return Math.min(b, max);
}

function extractFromChineseSheet(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const scores = {};
  let hasPairedColumns = false;

  // Detect paired columns (课前/课后)
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (row) {
      const rowStr = JSON.stringify(row);
      if (rowStr.includes("课前") || rowStr.includes("课后") || rowStr.includes("BEFORE") || rowStr.includes("AFTER")) {
        hasPairedColumns = true;
        break;
      }
    }
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    // Template variant A: element name at col1, score at col2 (Batch 1-6)
    const col1 = row[1];
    if (col1) {
      const code = identifyElementCode(String(col1).trim());
      if (code && typeof row[2] === "number") {
        if (hasPairedColumns) {
          scores[code] = pickBestScore(row[2], row[8], ELEMENT_MAX[code]);
        } else {
          scores[code] = Math.min(row[2], ELEMENT_MAX[code]);
        }
        continue;
      }
    }

    // Template variant B: element name at col2, score at col3/col9 (Batch 7-8)
    const col2 = row[2];
    if (col2) {
      const code = identifyElementCode(String(col2).trim());
      if (code && typeof row[3] === "number") {
        if (hasPairedColumns) {
          scores[code] = pickBestScore(row[3], row[9], ELEMENT_MAX[code]);
        } else {
          scores[code] = Math.min(row[3], ELEMENT_MAX[code]);
        }
      }
    }
  }
  return scores;
}

// --- Extract scores from the English scorecard sheet ---
function extractFromEnglishSheet(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const scores = {};
  let hasPairedColumns = false;

  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (row) {
      const rowStr = JSON.stringify(row);
      if (rowStr.includes("Pre-Class") || rowStr.includes("After-Class") || rowStr.includes("BEFORE") || rowStr.includes("AFTER")) {
        hasPairedColumns = true;
        break;
      }
    }
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    const col1 = row[1];
    if (!col1) continue;
    const col1Str = String(col1).trim();

    const code = identifyElementCode(col1Str);
    if (code && typeof row[2] === "number") {
      if (hasPairedColumns) {
        const beforeScore = typeof row[2] === "number" ? row[2] : 0;
        const afterScore = typeof row[8] === "number" ? row[8] : 0;
        const max = ELEMENT_MAX[code];
        if (afterScore > 0 && afterScore < max) {
          scores[code] = Math.min(afterScore, max);
        } else if (beforeScore > 0 && beforeScore < max) {
          scores[code] = Math.min(beforeScore, max);
        } else if (afterScore > 0) {
          scores[code] = Math.min(afterScore, max);
        } else {
          scores[code] = Math.min(beforeScore, max);
        }
      } else {
        scores[code] = Math.min(row[2], ELEMENT_MAX[code]);
      }
    }
  }
  return scores;
}

// --- Extract basic info from the first sheet ---
function extractBasicInfo(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const info = {};
  if (data.length < 2) return info;

  const headers = (data[0] || []).map((h) => String(h || "").trim());
  const values = data[1] || [];

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (h.includes("account name")) info.account_name = values[i];
    else if (h.includes("opportunity name")) info.opp_name = values[i];
    else if (h.includes("opportunity type")) info.opp_type = values[i];
    else if (h.includes("stage")) info.opp_stage = values[i];
    else if (h === "score" || h.includes("score-before")) info.score_before = values[i];
    else if (h.includes("score-after")) info.score_after = values[i];
  }
  return info;
}

// --- Process one file ---
function processFile(filepath) {
  const record = {
    file: path.basename(filepath),
    batch: path.basename(path.dirname(filepath)),
  };

  try {
    const wb = XLSX.readFile(filepath);
    const sheetNames = wb.SheetNames;

    // Extract basic info from first sheet
    const basicInfo = extractBasicInfo(wb.Sheets[sheetNames[0]]);
    Object.assign(record, basicInfo);

    // Find the best scoring sheet
    let scores = {};
    let sourceSheet = "";

    // Priority: Chinese scorecard sheets first (they typically have the real data)
    const cnSheetNames = ["Scorecard-中文", "评估积分卡"];
    const enSheetNames = ["Scorecard-EN", "Scorecard English"];

    for (const sn of cnSheetNames) {
      if (sheetNames.includes(sn)) {
        scores = extractFromChineseSheet(wb.Sheets[sn]);
        sourceSheet = sn;
        break;
      }
    }

    // If Chinese sheet had no/all-zero scores, try English
    const hasRealScores = Object.values(scores).some((v) => v > 0);
    if (!hasRealScores) {
      for (const sn of enSheetNames) {
        if (sheetNames.includes(sn)) {
          const enScores = extractFromEnglishSheet(wb.Sheets[sn]);
          if (Object.values(enScores).some((v) => v > 0)) {
            scores = enScores;
            sourceSheet = sn;
            break;
          }
        }
      }
    }

    // If still nothing, try any sheet that's not the first one
    if (!Object.values(scores).some((v) => v > 0)) {
      for (let si = 1; si < sheetNames.length; si++) {
        const sn = sheetNames[si];
        const tryScores = extractFromChineseSheet(wb.Sheets[sn]);
        if (Object.values(tryScores).some((v) => v > 0)) {
          scores = tryScores;
          sourceSheet = sn;
          break;
        }
      }
    }

    record.source_sheet = sourceSheet;

    // Fill element scores
    for (const el of ELEMENTS) {
      record[`${el.code}_score`] = scores[el.code] || 0;
      record[`${el.code}_pct`] = scores[el.code]
        ? Math.round((scores[el.code] / el.max) * 1000) / 10
        : 0;
    }

    // Total score
    record.total_score = ELEMENTS.reduce(
      (sum, el) => sum + (scores[el.code] || 0),
      0
    );
  } catch (e) {
    record.parse_error = e.message;
  }

  return record;
}

// --- Simple k-means implementation (no external dependency) ---
function kmeans(data, k, maxIter = 100) {
  const n = data.length;
  const dims = data[0].length;

  // Standardize
  const means = new Array(dims).fill(0);
  const stds = new Array(dims).fill(0);
  for (let d = 0; d < dims; d++) {
    for (let i = 0; i < n; i++) means[d] += data[i][d];
    means[d] /= n;
    for (let i = 0; i < n; i++) stds[d] += (data[i][d] - means[d]) ** 2;
    stds[d] = Math.sqrt(stds[d] / n) || 1;
  }
  const scaled = data.map((row) =>
    row.map((v, d) => (v - means[d]) / stds[d])
  );

  // Init centroids: pick first and farthest
  const centroids = [scaled[0].slice()];
  let maxDist = -1,
    farthestIdx = 0;
  for (let i = 1; i < n; i++) {
    let dist = 0;
    for (let d = 0; d < dims; d++)
      dist += (scaled[i][d] - centroids[0][d]) ** 2;
    if (dist > maxDist) {
      maxDist = dist;
      farthestIdx = i;
    }
  }
  centroids.push(scaled[farthestIdx].slice());

  const labels = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;

    // Assign
    for (let i = 0; i < n; i++) {
      let bestK = 0,
        bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        let dist = 0;
        for (let d = 0; d < dims; d++)
          dist += (scaled[i][d] - centroids[c][d]) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestK = c;
        }
      }
      if (labels[i] !== bestK) {
        labels[i] = bestK;
        changed = true;
      }
    }

    if (!changed) break;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const members = [];
      for (let i = 0; i < n; i++) if (labels[i] === c) members.push(i);
      if (members.length === 0) continue;
      for (let d = 0; d < dims; d++) {
        centroids[c][d] =
          members.reduce((s, i) => s + scaled[i][d], 0) / members.length;
      }
    }
  }

  return labels;
}

// --- Stats helpers ---
function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// ======================
// MAIN
// ======================
function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.log(
      'Usage: node analyze-scorecards.js "C:\\path\\to\\scorecards"'
    );
    process.exit(1);
  }

  const files = findXlsx(folder);
  console.log(`Found ${files.length} .xlsx files in ${folder}`);

  // Step 1: Extract all
  const records = [];
  let errorCount = 0;
  for (const f of files) {
    const r = processFile(f);
    if (r.parse_error) errorCount++;
    records.push(r);
  }
  console.log(
    `  Parsed: ${records.length} files (${errorCount} with errors)`
  );

  // Filter: remove parse errors, zero scores, and perfect 100 scores (default/unfilled templates)
  const totalMax = ELEMENTS.reduce((s, e) => s + e.max, 0);
  const valid = records.filter(
    (r) => !r.parse_error && r.total_score > 0 && r.total_score < totalMax
  );
  const perfects = records.filter((r) => r.total_score >= totalMax);
  console.log(`  Valid scorecards (real data): ${valid.length}`);
  console.log(`  Excluded: ${errorCount} parse errors, ${perfects.length} perfect-score (default templates)`);

  if (valid.length < 4) {
    console.log("Not enough valid scorecards for clustering. Check file formats.");
    process.exit(1);
  }

  // Step 2: Compute derived fields
  for (const r of valid) {
    r.standard_avg_pct =
      Math.round(
        (["E", "DC", "DP", "I"].reduce((s, c) => s + (r[`${c}_pct`] || 0), 0) / 4) * 10
      ) / 10;
    r.strategic_only_avg_pct =
      Math.round(
        (["M", "P", "CH", "CO"].reduce((s, c) => s + (r[`${c}_pct`] || 0), 0) / 4) * 10
      ) / 10;
    r.full_avg_pct =
      Math.round(
        (ELEMENT_CODES.reduce((s, c) => s + (r[`${c}_pct`] || 0), 0) / 8) * 10
      ) / 10;
  }

  // Step 3: K-Means (k=2)
  const featureMatrix = valid.map((r) =>
    ELEMENT_CODES.map((c) => r[`${c}_pct`] || 0)
  );
  const labels = kmeans(featureMatrix, 2);

  // Assign labels
  valid.forEach((r, i) => (r.cluster = labels[i]));

  // Determine which cluster is "Strategic" (higher strategic_only_avg_pct)
  const cluster0 = valid.filter((r) => r.cluster === 0);
  const cluster1 = valid.filter((r) => r.cluster === 1);
  const avg0 = mean(cluster0.map((r) => r.strategic_only_avg_pct));
  const avg1 = mean(cluster1.map((r) => r.strategic_only_avg_pct));

  const strategicCluster = avg0 >= avg1 ? 0 : 1;
  valid.forEach((r) => {
    r.classification = r.cluster === strategicCluster ? "Strategic" : "Standard";
  });

  const standardRecords = valid.filter((r) => r.classification === "Standard");
  const strategicRecords = valid.filter((r) => r.classification === "Strategic");

  // Step 4: Compute thresholds (using mean as primary, median as reference)
  const thresholds = {};
  for (const code of ELEMENT_CODES) {
    const stdVals = standardRecords.map((r) => r[`${code}_pct`]);
    const stratVals = strategicRecords.map((r) => r[`${code}_pct`]);
    const stdMean = mean(stdVals);
    const stratMean = mean(stratVals);
    const stdMed = median(stdVals);
    const stratMed = median(stratVals);
    thresholds[code] = {
      standard_mean: r1(stdMean),
      strategic_mean: r1(stratMean),
      standard_median: r1(stdMed),
      strategic_median: r1(stratMed),
      standard_std: r1(std(stdVals)),
      strategic_std: r1(std(stratVals)),
      mean_gap: r1(stratMean - stdMean),
      median_gap: r1(stratMed - stdMed),
      mean_midpoint: r1((stdMean + stratMean) / 2),
      pct_at_100_std: r1(stdVals.filter(v => v === 100).length / stdVals.length * 100),
      pct_at_100_strat: r1(stratVals.filter(v => v === 100).length / stratVals.length * 100),
    };
  }

  const stdStratAvgMean = mean(standardRecords.map((r) => r.strategic_only_avg_pct));
  const stratStratAvgMean = mean(strategicRecords.map((r) => r.strategic_only_avg_pct));
  const midpointThreshold = r1((stdStratAvgMean + stratStratAvgMean) / 2);

  // Step 5: Output
  const outputDir = path.join(folder, "analysis_output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // 5a. Summary xlsx
  const summaryWb = XLSX.utils.book_new();

  // Sheet 1: All scorecards
  const summaryHeaders = [
    "file", "batch", "account_name", "opp_name", "opp_type", "opp_stage",
    "source_sheet", "total_score",
    ...ELEMENT_CODES.map((c) => `${c}_score`),
    ...ELEMENT_CODES.map((c) => `${c}_pct`),
    "standard_avg_pct", "strategic_only_avg_pct", "full_avg_pct",
    "cluster", "classification",
  ];
  const summaryData = [summaryHeaders];
  for (const r of valid) {
    summaryData.push(summaryHeaders.map((h) => r[h] ?? ""));
  }
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"] = summaryHeaders.map((h) => ({
    wch: h.includes("name") ? 30 : h === "file" ? 50 : 14,
  }));
  XLSX.utils.book_append_sheet(summaryWb, ws1, "All Scorecards");

  // Sheet 2: Cluster Profile
  const profileHeaders = ["Metric", "Standard Mean", "Standard Median", "Standard Std", "Strategic Mean", "Strategic Median", "Strategic Std", "Gap (Median)"];
  const profileData = [profileHeaders];
  for (const code of ELEMENT_CODES) {
    const stdVals = standardRecords.map((r) => r[`${code}_pct`]);
    const stratVals = strategicRecords.map((r) => r[`${code}_pct`]);
    profileData.push([
      `${code}_pct`,
      r1(mean(stdVals)), r1(median(stdVals)), r1(std(stdVals)),
      r1(mean(stratVals)), r1(median(stratVals)), r1(std(stratVals)),
      r1(median(stratVals) - median(stdVals)),
    ]);
  }
  // Add summary rows
  for (const field of ["standard_avg_pct", "strategic_only_avg_pct", "full_avg_pct"]) {
    const stdVals = standardRecords.map((r) => r[field]);
    const stratVals = strategicRecords.map((r) => r[field]);
    profileData.push([
      field,
      r1(mean(stdVals)), r1(median(stdVals)), r1(std(stdVals)),
      r1(mean(stratVals)), r1(median(stratVals)), r1(std(stratVals)),
      r1(median(stratVals) - median(stdVals)),
    ]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(profileData);
  ws2["!cols"] = profileHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(summaryWb, ws2, "Cluster Profile");

  // Sheet 3: Thresholds
  const threshHeaders = ["Element", "Std Mean", "Std Median", "Std StdDev", "Str Mean", "Str Median", "Str StdDev", "Mean Gap", "Median Gap", "Mean Midpoint", "100% Std", "100% Str"];
  const threshData = [threshHeaders];
  for (const code of ELEMENT_CODES) {
    const t = thresholds[code];
    threshData.push([code, t.standard_mean, t.standard_median, t.standard_std, t.strategic_mean, t.strategic_median, t.strategic_std, t.mean_gap, t.median_gap, t.mean_midpoint, t.pct_at_100_std, t.pct_at_100_strat]);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(threshData);
  XLSX.utils.book_append_sheet(summaryWb, ws3, "Thresholds");

  const summaryPath = path.join(outputDir, "summary.xlsx");
  XLSX.writeFile(summaryWb, summaryPath);
  console.log(`  Saved: ${summaryPath}`);

  // 5b. Classification rules text
  const rulesLines = [];
  rulesLines.push("MEDDPICC Scorecard Cluster Analysis Results");
  rulesLines.push("=".repeat(60));
  rulesLines.push("");
  rulesLines.push(`Total scorecards analyzed: ${valid.length}`);
  rulesLines.push(`  Standard cluster: ${standardRecords.length}`);
  rulesLines.push(`  Strategic cluster: ${strategicRecords.length}`);
  rulesLines.push("");
  rulesLines.push("Element-level comparison by cluster (Mean / Median):");
  rulesLines.push("-".repeat(80));
  rulesLines.push(
    pad("Element", 8) + pad("Std Mean", 10) + pad("Std Med", 10) + pad("Str Mean", 10) + pad("Str Med", 10) + pad("Mean Gap", 10) + pad("100% Std", 10) + pad("100% Str", 10)
  );
  rulesLines.push("-".repeat(80));
  for (const code of ELEMENT_CODES) {
    const t = thresholds[code];
    rulesLines.push(
      pad(code, 8) +
        pad(`${t.standard_mean}%`, 10) +
        pad(`${t.standard_median}%`, 10) +
        pad(`${t.strategic_mean}%`, 10) +
        pad(`${t.strategic_median}%`, 10) +
        pad(`${t.mean_gap > 0 ? "+" : ""}${t.mean_gap}%`, 10) +
        pad(`${t.pct_at_100_std}%`, 10) +
        pad(`${t.pct_at_100_strat}%`, 10)
    );
  }
  rulesLines.push("");
  rulesLines.push("Ranking by mean gap (strongest differentiators first):");
  const ranked = [...ELEMENT_CODES].sort((a, b) => thresholds[b].mean_gap - thresholds[a].mean_gap);
  ranked.forEach((code, i) => {
    const t = thresholds[code];
    rulesLines.push(`  ${i + 1}. ${code} (${t.mean_gap > 0 ? "+" : ""}${t.mean_gap}%)`);
  });
  rulesLines.push("");
  rulesLines.push("Strategic-only elements (M, P, CH, CO) average:");
  rulesLines.push(`  Standard cluster mean: ${r1(stdStratAvgMean)}%`);
  rulesLines.push(`  Strategic cluster mean: ${r1(stratStratAvgMean)}%`);
  rulesLines.push("");
  rulesLines.push("Suggested classification rule:");
  rulesLines.push("-".repeat(60));
  rulesLines.push(
    `IF average percentage of M, P, CH, CO >= ${midpointThreshold}%`
  );
  rulesLines.push("   -> Strategic Opportunity (full 8-element analysis)");
  rulesLines.push("ELSE");
  rulesLines.push("   -> Standard Opportunity (E, DC, DP, I only)");
  rulesLines.push("");
  rulesLines.push("Override triggers:");
  rulesLines.push("  - 3+ named competitors");
  rulesLines.push("  - EB title is C-level");

  const rulesPath = path.join(outputDir, "classification_rules.txt");
  fs.writeFileSync(rulesPath, rulesLines.join("\n"), "utf-8");
  console.log(`  Saved: ${rulesPath}`);

  // Console summary
  console.log("\n" + "=".repeat(60));
  console.log("RESULTS");
  console.log("=".repeat(60));
  console.log(`\nStandard: ${standardRecords.length} scorecards`);
  console.log(`Strategic: ${strategicRecords.length} scorecards`);
  console.log(`\nElement comparison (Mean):`);
  console.log(
    pad("Element", 8) + pad("Std Mean", 10) + pad("Str Mean", 10) + pad("Gap", 10) + pad("100%Std", 10) + pad("100%Str", 10)
  );
  console.log("-".repeat(48));
  const ranked2 = [...ELEMENT_CODES].sort((a, b) => thresholds[b].mean_gap - thresholds[a].mean_gap);
  for (const code of ranked2) {
    const t = thresholds[code];
    console.log(
      pad(code, 8) +
        pad(`${t.standard_mean}%`, 10) +
        pad(`${t.strategic_mean}%`, 10) +
        pad(`${t.mean_gap > 0 ? "+" : ""}${t.mean_gap}%`, 10) +
        pad(`${t.pct_at_100_std}%`, 10) +
        pad(`${t.pct_at_100_strat}%`, 10)
    );
  }
  console.log(`\nSuggested threshold: M/P/CH/CO avg >= ${midpointThreshold}% -> Strategic`);
  console.log(`\nOutput folder: ${outputDir}`);
}

function r1(v) {
  return Math.round(v * 10) / 10;
}

function pad(s, len) {
  return String(s).padEnd(len);
}

main();
