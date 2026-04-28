"""
MEDDPICC Scorecard Batch Analyzer
---------------------------------
Reads all .xlsx scorecards from a folder, extracts scores,
runs k-means clustering (k=2), and outputs:
  1. summary.xlsx — one row per scorecard with all scores + basic info
  2. cluster_analysis.xlsx — cluster profiles and dimension comparison
  3. classification_rules.txt — suggested Standard/Strategic thresholds
  4. Charts (PNG): score distributions, cluster comparison, element heatmap

Usage:
  python analyze-scorecards.py <folder_path>
  python analyze-scorecards.py ./scorecards
"""

import sys
import os
import warnings
import numpy as np
import pandas as pd
from pathlib import Path

warnings.filterwarnings("ignore")

# --- MEDDPICC element definitions (must match scorecard-form.html) ---
ELEMENTS = [
    {"code": "I",  "name": "Implicate the Pain", "max": 12, "n_statements": 3},
    {"code": "M",  "name": "Metrics",             "max": 13, "n_statements": 4},
    {"code": "E",  "name": "Economic Buyer",      "max": 13, "n_statements": 3},
    {"code": "CH", "name": "Champion",             "max": 12, "n_statements": 3},
    {"code": "CO", "name": "Competition",          "max": 12, "n_statements": 3},
    {"code": "DC", "name": "Decision Criteria",    "max": 13, "n_statements": 4},
    {"code": "DP", "name": "Decision Process",     "max": 13, "n_statements": 4},
    {"code": "P",  "name": "Paper Process",        "max": 12, "n_statements": 3},
]

ELEMENT_CODES = [e["code"] for e in ELEMENTS]
ELEMENT_MAX = {e["code"]: e["max"] for e in ELEMENTS}
STANDARD_ELEMENTS = {"E", "DC", "DP", "I"}
STRATEGIC_ONLY = {"M", "P", "CH", "CO"}


def extract_scorecard(filepath):
    """Extract all data from one scorecard .xlsx file."""
    record = {"file": Path(filepath).name}

    try:
        # --- Sheet 1: Basic Info ---
        df_basic = pd.read_excel(filepath, sheet_name=0, header=None)
        if len(df_basic) >= 2:
            headers = df_basic.iloc[0].tolist()
            values = df_basic.iloc[1].tolist()
            field_map = {
                "Account Name": "account_name",
                "Opportunity Name": "opp_name",
                "Opportunity Location": "opp_location",
                "Opportunity Type": "opp_type",
                "Others Description": "opp_type_other",
                "Opp Stage": "opp_stage",
                "Score": "total_score",
            }
            for i, h in enumerate(headers):
                h_str = str(h).strip()
                if h_str in field_map and i < len(values):
                    record[field_map[h_str]] = values[i]

        # --- Sheet 2: Scorecard scores ---
        df_score = pd.read_excel(filepath, sheet_name=1)
        col_names = [str(c).strip() for c in df_score.columns]
        df_score.columns = col_names

        element_col = next((c for c in col_names if "element" in c.lower()), None)
        score_col = next((c for c in col_names if c.lower() == "score"), None)

        if element_col and score_col:
            for el in ELEMENTS:
                code = el["code"]
                mask = df_score[element_col].astype(str).str.contains(
                    f"^{code} —|^{code} -|^{code}—", regex=True, na=False
                )
                rows = df_score.loc[mask, score_col]
                raw_score = pd.to_numeric(rows, errors="coerce").sum()
                capped = min(raw_score, el["max"])
                record[f"{code}_score"] = capped
                record[f"{code}_pct"] = round(capped / el["max"] * 100, 1)

        # --- Sheet 3: Competitive Info ---
        try:
            df_comp = pd.read_excel(filepath, sheet_name=2)
            comp_cols = [str(c).strip() for c in df_comp.columns]
            df_comp.columns = comp_cols

            field_col = next((c for c in comp_cols if "field" in c.lower()), comp_cols[0])
            value_col = next((c for c in comp_cols if "value" in c.lower()), comp_cols[1] if len(comp_cols) > 1 else None)

            if value_col:
                for _, row in df_comp.iterrows():
                    f = str(row[field_col]).strip().lower()
                    v = row[value_col]
                    if "eb" in f and "title" in f:
                        record["eb_title"] = v
                    elif "competitor" in f:
                        record["competitor"] = v
                    elif "business objective" in f:
                        record["biz_objective"] = v
        except Exception:
            pass

    except Exception as e:
        record["parse_error"] = str(e)

    return record


def count_competitors(val):
    if pd.isna(val) or str(val).strip() in ("", "nan", "none", "None"):
        return 0
    parts = [p.strip() for p in str(val).replace("、", ",").replace("/", ",").split(",") if p.strip()]
    return len(parts)


def is_c_level(title):
    if pd.isna(title) or str(title).strip() == "":
        return False
    t = str(title).upper()
    return any(x in t for x in ["CEO", "CFO", "CTO", "COO", "CIO", "CISO", "CDO", "CMO", "CPO", "C-LEVEL", "CHIEF"])


def run_analysis(folder_path):
    folder = Path(folder_path)
    files = list(folder.glob("*.xlsx"))
    if not files:
        print(f"No .xlsx files found in {folder}")
        sys.exit(1)

    print(f"Found {len(files)} scorecard files. Processing...")

    # --- Step 1: Extract all scorecards ---
    records = []
    errors = []
    for f in files:
        r = extract_scorecard(f)
        if "parse_error" in r:
            errors.append(r)
        else:
            records.append(r)

    if errors:
        print(f"  Warning: {len(errors)} files had parse errors (included in summary with error column)")
        records.extend(errors)

    df = pd.DataFrame(records)
    print(f"  Successfully parsed: {len(df)} scorecards")

    # --- Step 2: Compute derived columns ---
    pct_cols = [f"{c}_pct" for c in ELEMENT_CODES]
    score_cols = [f"{c}_score" for c in ELEMENT_CODES]

    for col in pct_cols + score_cols:
        if col not in df.columns:
            df[col] = 0

    df["competitor_count"] = df.get("competitor", pd.Series(dtype=str)).apply(count_competitors)
    df["eb_is_c_level"] = df.get("eb_title", pd.Series(dtype=str)).apply(is_c_level)

    # Standard vs Strategic element averages
    df["standard_avg_pct"] = df[[f"{c}_pct" for c in STANDARD_ELEMENTS]].mean(axis=1).round(1)
    df["strategic_only_avg_pct"] = df[[f"{c}_pct" for c in STRATEGIC_ONLY]].mean(axis=1).round(1)
    df["full_avg_pct"] = df[pct_cols].mean(axis=1).round(1)

    # --- Step 3: K-Means Clustering (k=2) ---
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    feature_cols = pct_cols
    X = df[feature_cols].fillna(0).values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    km = KMeans(n_clusters=2, random_state=42, n_init=10)
    df["cluster"] = km.fit_predict(X_scaled)

    # Label clusters: the one with higher strategic_only_avg_pct is "Strategic"
    cluster_means = df.groupby("cluster")["strategic_only_avg_pct"].mean()
    strategic_cluster = cluster_means.idxmax()
    standard_cluster = cluster_means.idxmin()
    df["classification"] = df["cluster"].map({
        strategic_cluster: "Strategic",
        standard_cluster: "Standard",
    })

    # --- Step 4: Cluster profile ---
    profile_cols = pct_cols + ["standard_avg_pct", "strategic_only_avg_pct", "full_avg_pct", "competitor_count"]
    cluster_profile = df.groupby("classification")[profile_cols].agg(["mean", "median", "std", "min", "max"]).round(1)

    cluster_counts = df["classification"].value_counts()

    # --- Step 5: Find natural thresholds ---
    thresholds = {}
    for code in ELEMENT_CODES:
        col = f"{code}_pct"
        std_vals = df.loc[df["classification"] == "Standard", col]
        strat_vals = df.loc[df["classification"] == "Strategic", col]
        thresholds[code] = {
            "standard_median": std_vals.median(),
            "strategic_median": strat_vals.median(),
            "midpoint": round((std_vals.median() + strat_vals.median()) / 2, 1),
        }

    # --- Step 6: Output files ---
    output_dir = folder / "analysis_output"
    output_dir.mkdir(exist_ok=True)

    # 6a. Summary xlsx
    summary_path = output_dir / "summary.xlsx"
    with pd.ExcelWriter(summary_path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="All Scorecards", index=False)

        profile_df = cluster_profile.T
        profile_df.to_excel(writer, sheet_name="Cluster Profile")

        thresh_df = pd.DataFrame(thresholds).T
        thresh_df.index.name = "Element"
        thresh_df.to_excel(writer, sheet_name="Thresholds")
    print(f"  Saved: {summary_path}")

    # 6b. Classification rules
    rules_path = output_dir / "classification_rules.txt"
    with open(rules_path, "w", encoding="utf-8") as f:
        f.write("MEDDPICC Scorecard Cluster Analysis Results\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Total scorecards analyzed: {len(df)}\n")
        f.write(f"  Standard cluster: {cluster_counts.get('Standard', 0)}\n")
        f.write(f"  Strategic cluster: {cluster_counts.get('Strategic', 0)}\n\n")

        f.write("Element-level medians by cluster:\n")
        f.write("-" * 50 + "\n")
        f.write(f"{'Element':<6} {'Standard':>10} {'Strategic':>10} {'Midpoint':>10}\n")
        f.write("-" * 50 + "\n")
        for code in ELEMENT_CODES:
            t = thresholds[code]
            marker = " ← key differentiator" if code in STRATEGIC_ONLY and abs(t["standard_median"] - t["strategic_median"]) > 15 else ""
            f.write(f"{code:<6} {t['standard_median']:>9.1f}% {t['strategic_median']:>9.1f}% {t['midpoint']:>9.1f}%{marker}\n")

        f.write("\n\nStrategic-only elements (M, P, CH, CO) average:\n")
        f.write(f"  Standard cluster: {df.loc[df['classification']=='Standard', 'strategic_only_avg_pct'].median():.1f}%\n")
        f.write(f"  Strategic cluster: {df.loc[df['classification']=='Strategic', 'strategic_only_avg_pct'].median():.1f}%\n")

        f.write("\n\nSuggested classification rule:\n")
        f.write("-" * 50 + "\n")
        strategic_only_midpoint = round(
            (df.loc[df["classification"] == "Standard", "strategic_only_avg_pct"].median()
             + df.loc[df["classification"] == "Strategic", "strategic_only_avg_pct"].median()) / 2, 1
        )
        f.write(f"IF average percentage of M, P, CH, CO >= {strategic_only_midpoint}%\n")
        f.write(f"   → Strategic Opportunity (full 8-element analysis)\n")
        f.write(f"ELSE\n")
        f.write(f"   → Standard Opportunity (E, DC, DP, I only)\n")
        f.write(f"\nOverride triggers (from clustering):\n")
        f.write(f"  - competitor_count >= 3\n")
        f.write(f"  - EB title is C-level\n")
    print(f"  Saved: {rules_path}")

    # 6c. Charts
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle("MEDDPICC Scorecard Cluster Analysis", fontsize=16, fontweight="bold")

        # Chart 1: Element score distribution by cluster
        ax = axes[0, 0]
        cluster_element_means = df.groupby("classification")[pct_cols].mean()
        x = np.arange(len(ELEMENT_CODES))
        w = 0.35
        for i, cls in enumerate(["Standard", "Strategic"]):
            if cls in cluster_element_means.index:
                vals = [cluster_element_means.loc[cls, f"{c}_pct"] for c in ELEMENT_CODES]
                color = "#0073bb" if cls == "Standard" else "#d13212"
                ax.bar(x + i * w, vals, w, label=cls, color=color, alpha=0.8)
        ax.set_xticks(x + w / 2)
        ax.set_xticklabels(ELEMENT_CODES)
        ax.set_ylabel("Average %")
        ax.set_title("Element Scores by Cluster")
        ax.legend()
        ax.set_ylim(0, 105)
        # Mark strategic-only elements
        for i, code in enumerate(ELEMENT_CODES):
            if code in STRATEGIC_ONLY:
                ax.axvspan(i - 0.3, i + 0.7, alpha=0.08, color="red")

        # Chart 2: Scatter — Standard avg vs Strategic-only avg
        ax = axes[0, 1]
        for cls, color, marker in [("Standard", "#0073bb", "o"), ("Strategic", "#d13212", "^")]:
            mask = df["classification"] == cls
            ax.scatter(
                df.loc[mask, "standard_avg_pct"],
                df.loc[mask, "strategic_only_avg_pct"],
                c=color, marker=marker, alpha=0.6, label=cls, s=40
            )
        ax.set_xlabel("Standard Elements Avg % (E, DC, DP, I)")
        ax.set_ylabel("Strategic-Only Elements Avg % (M, P, CH, CO)")
        ax.set_title("Cluster Separation")
        ax.legend()
        ax.axhline(y=strategic_only_midpoint, color="gray", linestyle="--", alpha=0.5)
        ax.annotate(f"Midpoint: {strategic_only_midpoint}%", xy=(10, strategic_only_midpoint + 2), fontsize=9, color="gray")

        # Chart 3: Distribution of total scores
        ax = axes[1, 0]
        for cls, color in [("Standard", "#0073bb"), ("Strategic", "#d13212")]:
            vals = df.loc[df["classification"] == cls, "full_avg_pct"]
            ax.hist(vals, bins=15, alpha=0.6, color=color, label=cls, edgecolor="white")
        ax.set_xlabel("Overall Average %")
        ax.set_ylabel("Count")
        ax.set_title("Score Distribution by Cluster")
        ax.legend()

        # Chart 4: Strategic-only element gap
        ax = axes[1, 1]
        strategic_only_codes = list(STRATEGIC_ONLY)
        for cls, color in [("Standard", "#0073bb"), ("Strategic", "#d13212")]:
            mask = df["classification"] == cls
            vals = [df.loc[mask, f"{c}_pct"].mean() for c in strategic_only_codes]
            ax.bar(
                [f"{c}" for c in strategic_only_codes],
                vals,
                alpha=0.7, color=color, label=cls,
                width=0.35,
                align="edge" if cls == "Standard" else "center"
            )
        ax.set_ylabel("Average %")
        ax.set_title("Strategic-Only Elements: Where Clusters Diverge")
        ax.legend()
        ax.set_ylim(0, 105)

        plt.tight_layout()
        chart_path = output_dir / "cluster_analysis.png"
        plt.savefig(chart_path, dpi=150, bbox_inches="tight")
        print(f"  Saved: {chart_path}")
        plt.close()

    except ImportError:
        print("  Note: matplotlib/sklearn not installed — skipping charts. Run: pip install matplotlib scikit-learn")

    # --- Summary to console ---
    print("\n" + "=" * 50)
    print("RESULTS")
    print("=" * 50)
    print(f"\nStandard: {cluster_counts.get('Standard', 0)} scorecards")
    print(f"Strategic: {cluster_counts.get('Strategic', 0)} scorecards")
    print(f"\nKey differentiators (median % by cluster):")
    print(f"{'Element':<6} {'Standard':>10} {'Strategic':>10} {'Gap':>8}")
    print("-" * 40)
    for code in ELEMENT_CODES:
        t = thresholds[code]
        gap = t["strategic_median"] - t["standard_median"]
        print(f"{code:<6} {t['standard_median']:>9.1f}% {t['strategic_median']:>9.1f}% {gap:>+7.1f}%")

    print(f"\nOutput folder: {output_dir}")
    print("Next step: review summary.xlsx and classification_rules.txt, then confirm thresholds.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze-scorecards.py <folder_with_xlsx_files>")
        print("Example: python analyze-scorecards.py ./scorecards")
        sys.exit(1)
    run_analysis(sys.argv[1])
