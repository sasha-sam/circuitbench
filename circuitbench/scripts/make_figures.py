"""
CircuitBench Figure Generator

Reads scored result files and produces publication-quality figures
for the manuscript.

Usage:
  python scripts/make_figures.py

Outputs to manuscript/figures/
"""

import json
from pathlib import Path
from collections import defaultdict

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

PROJ_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = PROJ_ROOT / "results" / "outputs"
FIGURES_DIR = PROJ_ROOT / "manuscript" / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

# IEEE two-column figure widths (inches)
COL_W = 3.5   # single column
TWO_COL_W = 7.16  # double column

# Color palette (colorblind-friendly)
COLORS = {
    "gemma3:4b":   "#2166ac",
    "gemma3-4b":   "#2166ac",
    "llava-phi3":  "#d6604d",
    "gpt-4o":      "#1a9641",
    "gemini-2.0-flash": "#f4a582",
    "claude-sonnet": "#762a83",
}
DEFAULT_COLOR = "#888888"


def load_scored_results(pattern="*.scored.jsonl") -> dict[str, list[dict]]:
    """Load all scored result files, keyed by model name."""
    results = {}
    for path in sorted(RESULTS_DIR.glob(pattern)):
        # Extract model name from filename: <model>_<split>_<timestamp>.scored.jsonl
        parts = path.stem.replace(".scored", "").split("_")
        # Last two parts are split and timestamp; everything before is model
        model_name = "_".join(parts[:-2])
        split = parts[-2]
        label = f"{model_name} ({split})"
        items = [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
        # Deduplicate: keep the run with most items for each model+split combo
        key = f"{model_name}_{split}"
        if key not in results or len(items) > len(results[key]):
            results[key] = {"items": items, "model": model_name, "split": split}
    return results


def compute_accuracy(items: list[dict]) -> dict:
    """Compute accuracy by task category and subcategory."""
    by_cat = defaultdict(lambda: {"c": 0, "t": 0})
    by_sub = defaultdict(lambda: {"c": 0, "t": 0})

    for item in items:
        if item.get("error") or item.get("model_response") is None:
            continue
        cat = item.get("task_category", "?")
        sub = item.get("task_subcategory", "?")
        c = int(bool(item.get("correct")))
        by_cat[cat]["c"] += c
        by_cat[cat]["t"] += 1
        by_sub[sub]["c"] += c
        by_sub[sub]["t"] += 1

    def pct(d): return 100 * d["c"] / d["t"] if d["t"] > 0 else 0

    return {
        "by_cat": {k: pct(v) for k, v in by_cat.items()},
        "by_sub": {k: pct(v) for k, v in by_sub.items()},
        "overall": 100 * sum(v["c"] for v in by_cat.values()) / max(1, sum(v["t"] for v in by_cat.values())),
        "n": sum(v["t"] for v in by_cat.values()),
    }


def fig_overall_bar(model_accuracies: dict[str, dict]):
    """Bar chart: overall accuracy per model."""
    fig, ax = plt.subplots(figsize=(COL_W, 2.8))

    models = sorted(model_accuracies.keys())
    accs = [model_accuracies[m]["overall"] for m in models]
    ns = [model_accuracies[m]["n"] for m in models]
    colors = [COLORS.get(m, DEFAULT_COLOR) for m in models]

    bars = ax.bar(range(len(models)), accs, color=colors, edgecolor="white", width=0.6)

    # Value labels on bars
    for bar, acc, n in zip(bars, accs, ns):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.8,
                f"{acc:.1f}%\n(n={n})", ha="center", va="bottom", fontsize=7)

    # Display names
    display = [m.replace("gemma3-4b", "Gemma 3 4B").replace("llava-phi3", "LLaVA-Phi3")
               for m in models]
    ax.set_xticks(range(len(models)))
    ax.set_xticklabels(display, fontsize=8)
    ax.set_ylabel("Accuracy (%)", fontsize=9)
    ax.set_ylim(0, max(accs) + 15)
    ax.set_title("Overall Accuracy on CircuitBench (Dev Split)", fontsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.yaxis.set_tick_params(labelsize=8)

    plt.tight_layout()
    out = FIGURES_DIR / "fig_overall_accuracy.pdf"
    plt.savefig(out, bbox_inches="tight")
    plt.savefig(out.with_suffix(".png"), dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved: {out.name}")


def fig_task_breakdown(model_accuracies: dict[str, dict]):
    """Grouped bar chart: accuracy by task category (A, B, E)."""
    tasks = ["A", "B", "E"]
    task_labels = ["Task A\n(Recognition)", "Task B\n(Topology)", "Task E\n(Fault Diag.)"]

    models = sorted(model_accuracies.keys())
    x = np.arange(len(tasks))
    width = 0.35 / max(1, len(models) - 1) * 2 if len(models) > 1 else 0.5
    offsets = np.linspace(-width * (len(models) - 1) / 2,
                          width * (len(models) - 1) / 2, len(models))

    fig, ax = plt.subplots(figsize=(COL_W, 2.8))

    for i, (model, offset) in enumerate(zip(models, offsets)):
        accs = [model_accuracies[model]["by_cat"].get(t, 0) for t in tasks]
        color = COLORS.get(model, DEFAULT_COLOR)
        display = model.replace("gemma3-4b", "Gemma 3 4B").replace("llava-phi3", "LLaVA-Phi3")
        bars = ax.bar(x + offset, accs, width, label=display, color=color,
                      edgecolor="white", alpha=0.9)
        for bar, acc in zip(bars, accs):
            if acc > 0:
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.5,
                        f"{acc:.0f}", ha="center", va="bottom", fontsize=6)

    ax.set_xticks(x)
    ax.set_xticklabels(task_labels, fontsize=8)
    ax.set_ylabel("Accuracy (%)", fontsize=9)
    ax.set_ylim(0, 100)
    ax.set_title("Accuracy by Task Category (Dev Split)", fontsize=9)
    ax.legend(fontsize=7, framealpha=0.8)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.yaxis.set_tick_params(labelsize=8)

    plt.tight_layout()
    out = FIGURES_DIR / "fig_task_breakdown.pdf"
    plt.savefig(out, bbox_inches="tight")
    plt.savefig(out.with_suffix(".png"), dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved: {out.name}")


def fig_subcategory_heatmap(model_accuracies: dict[str, dict]):
    """Heatmap: accuracy per model × subcategory."""
    all_subs = sorted({
        sub
        for m in model_accuracies.values()
        for sub in m["by_sub"].keys()
    })
    models = sorted(model_accuracies.keys())

    data = np.array([
        [model_accuracies[m]["by_sub"].get(sub, np.nan) for sub in all_subs]
        for m in models
    ])

    fig, ax = plt.subplots(figsize=(TWO_COL_W, 1.8 + 0.35 * len(models)))

    im = ax.imshow(data, cmap="RdYlGn", aspect="auto", vmin=0, vmax=100)

    # Text annotations
    for i in range(len(models)):
        for j in range(len(all_subs)):
            val = data[i, j]
            if not np.isnan(val):
                ax.text(j, i, f"{val:.0f}", ha="center", va="center",
                        fontsize=7, color="black" if 20 < val < 80 else "white")

    model_labels = [m.replace("gemma3-4b", "Gemma 3 4B").replace("llava-phi3", "LLaVA-Phi3")
                    for m in models]
    sub_labels = [s.replace("_", "\n") for s in all_subs]

    ax.set_yticks(range(len(models)))
    ax.set_yticklabels(model_labels, fontsize=8)
    ax.set_xticks(range(len(all_subs)))
    ax.set_xticklabels(sub_labels, fontsize=7)
    ax.set_title("Accuracy by Subcategory (Dev Split, %)", fontsize=9)

    plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04, label="Accuracy (%)")
    plt.tight_layout()
    out = FIGURES_DIR / "fig_subcategory_heatmap.pdf"
    plt.savefig(out, bbox_inches="tight")
    plt.savefig(out.with_suffix(".png"), dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved: {out.name}")


def main():
    all_results = load_scored_results()
    if not all_results:
        print("No scored result files found. Run evaluation first.")
        return

    print(f"Loaded {len(all_results)} result sets.")

    # Compute accuracy for each
    model_accuracies = {}
    for key, entry in all_results.items():
        acc = compute_accuracy(entry["items"])
        model_name = entry["model"]
        print(f"  {key}: overall={acc['overall']:.1f}% (n={acc['n']})")
        # Keep best (most items) per model name
        if model_name not in model_accuracies or acc["n"] > model_accuracies[model_name]["n"]:
            model_accuracies[model_name] = acc

    print(f"\nGenerating figures to {FIGURES_DIR}...")
    fig_overall_bar(model_accuracies)
    fig_task_breakdown(model_accuracies)
    fig_subcategory_heatmap(model_accuracies)
    print("Done.")


if __name__ == "__main__":
    main()
