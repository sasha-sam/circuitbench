"""
CircuitBench Scoring

Reads model output files and computes metrics per task category.
Outputs a summary table and per-item correctness annotations.

Usage:
  python evaluation/score.py results/outputs/gpt-4o_test_20260930_120000.jsonl
"""

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

PROJ_ROOT = Path(__file__).resolve().parent.parent


def normalize(text: str) -> str:
    """Normalize response text for comparison."""
    text = text.strip().lower()
    text = re.sub(r"[.,;:!?]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def score_integer(response: str, ground_truth: str) -> bool:
    """Score an integer-answer question."""
    # Extract first number from response
    numbers = re.findall(r"\d+", response.strip())
    if not numbers:
        return False
    return numbers[0] == ground_truth.strip()


def score_binary(response: str, ground_truth: str) -> bool:
    """Score a yes/no question."""
    resp = normalize(response)
    gt = ground_truth.strip().lower()
    if gt == "yes":
        return resp.startswith("yes")
    else:
        return resp.startswith("no")


def score_free_text(response: str, ground_truth: str) -> dict:
    """Score a free-text response. Returns partial credit info."""
    resp = normalize(response)
    gt = normalize(ground_truth)

    # Extract component mentions from ground truth
    gt_components = re.findall(r"(\w[\w\s]*?)\s*\((\d+)\)", ground_truth)
    if not gt_components:
        return {"correct": resp == gt, "partial": None}

    matched = 0
    total = len(gt_components)
    for comp_name, comp_count in gt_components:
        comp_name_lower = comp_name.strip().lower()
        # Check if component name and count appear in response
        if comp_name_lower in resp and comp_count in response:
            matched += 1

    return {
        "correct": matched == total,
        "partial_score": matched / total if total > 0 else 0,
        "matched": matched,
        "total": total,
    }


SCORERS = {
    "integer": score_integer,
    "binary": score_binary,
}


def main():
    if len(sys.argv) < 2:
        print("Usage: python evaluation/score.py <results_file.jsonl>")
        sys.exit(1)

    results_path = Path(sys.argv[1])
    if not results_path.is_absolute():
        results_path = PROJ_ROOT / results_path

    # Load manifest for answer types
    manifest_path = PROJ_ROOT / "benchmark" / "manifest.jsonl"
    answer_types = {}
    with open(manifest_path) as f:
        for line in f:
            item = json.loads(line)
            answer_types[item["circuitbench_id"]] = item.get("answer_type", "free_text")

    # Load results
    records = []
    with open(results_path) as f:
        for line in f:
            records.append(json.loads(line))

    print(f"Loaded {len(records)} results from {results_path.name}")

    # Score each record
    category_correct = defaultdict(int)
    category_total = defaultdict(int)
    subcategory_correct = defaultdict(int)
    subcategory_total = defaultdict(int)
    difficulty_correct = defaultdict(int)
    difficulty_total = defaultdict(int)
    scored_records = []

    # Load manifest items for difficulty info
    manifest_items = {}
    with open(manifest_path) as f:
        for line in f:
            item = json.loads(line)
            manifest_items[item["circuitbench_id"]] = item

    for record in records:
        cid = record["circuitbench_id"]
        if record.get("error") or record.get("model_response") is None:
            continue

        answer_type = answer_types.get(cid, "free_text")
        response = record["model_response"]
        ground_truth = record["ground_truth"]
        task_cat = record.get("task_category", "?")
        task_sub = record.get("task_subcategory", "?")
        manifest_item = manifest_items.get(cid, {})
        difficulty = manifest_item.get("difficulty", "unknown")

        if answer_type in SCORERS:
            correct = SCORERS[answer_type](response, ground_truth)
        elif answer_type == "free_text":
            result = score_free_text(response, ground_truth)
            correct = result["correct"]
        else:
            correct = normalize(response) == normalize(ground_truth)

        category_correct[task_cat] += int(correct)
        category_total[task_cat] += 1
        subcategory_correct[task_sub] += int(correct)
        subcategory_total[task_sub] += 1
        difficulty_correct[difficulty] += int(correct)
        difficulty_total[difficulty] += 1

        scored_records.append({
            **record,
            "correct": correct,
            "answer_type": answer_type,
            "difficulty": difficulty,
        })

    # Print results
    total_correct = sum(category_correct.values())
    total_items = sum(category_total.values())

    print(f"\n{'='*60}")
    print(f"OVERALL: {total_correct}/{total_items} = {total_correct/total_items*100:.1f}%")
    print(f"{'='*60}")

    print(f"\n--- By Task Category ---")
    for cat in sorted(category_total.keys()):
        c, t = category_correct[cat], category_total[cat]
        print(f"  Task {cat}: {c}/{t} = {c/t*100:.1f}%")

    print(f"\n--- By Task Subcategory ---")
    for sub in sorted(subcategory_total.keys()):
        c, t = subcategory_correct[sub], subcategory_total[sub]
        print(f"  {sub:25s}: {c}/{t} = {c/t*100:.1f}%")

    print(f"\n--- By Difficulty ---")
    for diff in ["easy", "medium", "hard"]:
        if diff in difficulty_total:
            c, t = difficulty_correct[diff], difficulty_total[diff]
            print(f"  {diff:10s}: {c}/{t} = {c/t*100:.1f}%")

    # Save scored results
    scored_path = results_path.with_suffix(".scored.jsonl")
    with open(scored_path, "w") as f:
        for rec in scored_records:
            f.write(json.dumps(rec) + "\n")
    print(f"\nScored results saved to: {scored_path}")


if __name__ == "__main__":
    main()
