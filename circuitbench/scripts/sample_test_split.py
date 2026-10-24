"""
Stratified test-split sampler for CircuitBench.

Selects N items from the test split, proportionally distributed across
task categories and subcategories, to create a representative evaluation
subset. The sample is deterministic (fixed seed) so results are
reproducible.

Usage:
  python scripts/sample_test_split.py --n 200 --out benchmark/test_sample_200.jsonl
  python scripts/sample_test_split.py --n 200 --check
"""

import argparse
import json
import random
from collections import defaultdict
from pathlib import Path

PROJ_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJ_ROOT / "benchmark" / "manifest.jsonl"


def load_test_items():
    items = []
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            if item.get("split") == "test":
                items.append(item)
    return items


def stratified_sample(items: list[dict], n: int, seed: int = 42) -> list[dict]:
    """
    Sample n items from test split, proportionally by task_subcategory.
    Uses random.sample within each stratum for reproducibility.
    """
    # Group by subcategory
    strata = defaultdict(list)
    for item in items:
        key = (item.get("task_category"), item.get("task_subcategory", "?"))
        strata[key].append(item)

    total = len(items)
    selected = []
    rng = random.Random(seed)

    # Proportional allocation (round down, then top up)
    allocations = {}
    for key, group in sorted(strata.items()):
        alloc = max(1, round(len(group) / total * n))
        allocations[key] = min(alloc, len(group))

    # Adjust to hit target n exactly
    total_alloc = sum(allocations.values())
    diff = n - total_alloc
    keys_by_size = sorted(allocations, key=lambda k: len(strata[k]), reverse=True)
    for i in range(abs(diff)):
        key = keys_by_size[i % len(keys_by_size)]
        if diff > 0:
            allocations[key] = min(allocations[key] + 1, len(strata[key]))
        else:
            allocations[key] = max(1, allocations[key] - 1)

    for key, alloc in sorted(allocations.items()):
        group = strata[key]
        sample = rng.sample(group, min(alloc, len(group)))
        selected.extend(sample)

    # Shuffle final list
    rng.shuffle(selected)
    return selected


def main():
    parser = argparse.ArgumentParser(description="Stratified test-split sampler")
    parser.add_argument("--n", type=int, default=200,
                        help="Number of items to sample (default: 200)")
    parser.add_argument("--out", type=str, default=None,
                        help="Output path (default: benchmark/test_sample_<n>.jsonl)")
    parser.add_argument("--check", action="store_true",
                        help="Just print the allocation; don't write output")
    args = parser.parse_args()

    items = load_test_items()
    print(f"Total test items: {len(items)}")

    sample = stratified_sample(items, args.n)

    # Print breakdown
    from collections import Counter
    breakdown = Counter((i["task_category"], i.get("task_subcategory")) for i in sample)
    print(f"\nSample size: {len(sample)}")
    print("Allocation:")
    for (cat, sub), cnt in sorted(breakdown.items()):
        print(f"  {cat}/{sub:25s}: {cnt}")

    if args.check:
        return

    out_path = Path(args.out) if args.out else PROJ_ROOT / "benchmark" / f"test_sample_{args.n}.jsonl"
    with open(out_path, "w", encoding="utf-8") as f:
        for item in sample:
            f.write(json.dumps(item) + "\n")
    print(f"\nWritten: {out_path}")


if __name__ == "__main__":
    main()
