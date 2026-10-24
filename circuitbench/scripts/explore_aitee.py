"""
Explore AITEE dataset: summarize image inventory, annotation statistics,
and circuit-type distribution to inform benchmark item selection.
"""

import json
import os
from collections import Counter
from pathlib import Path

# Paths
AITEE_ROOT = Path(__file__).resolve().parent.parent / "data" / "raw" / "aitee"
IMAGES_DIR = AITEE_ROOT / "images" / "dataset" / "images"
LABELS_DIR = AITEE_ROOT / "images" / "dataset" / "labels"
SPLIT_DIR = AITEE_ROOT / "images" / "dataset" / "split"

# Class mapping from dataset.yaml / notes.json
CLASS_NAMES = {
    0: "E",            # edge connection / junction node
    1: "GND",          # ground
    2: "I",            # current source
    3: "P",            # connection point / junction
    4: "R",            # resistor
    5: "V",            # voltage source
    6: "ident-i",      # current source label
    7: "ident-i-dir",  # current direction indicator
    8: "ident-res",    # resistor label
    9: "ident-v",      # voltage source label
    10: "ident-v-dir", # voltage polarity indicator
}


def parse_label_file(label_path: Path) -> list[dict]:
    """Parse a YOLO-format label file into a list of annotation dicts."""
    annotations = []
    with open(label_path) as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 5:
                class_id = int(parts[0])
                annotations.append({
                    "class_id": class_id,
                    "class_name": CLASS_NAMES.get(class_id, f"unknown-{class_id}"),
                    "x_center": float(parts[1]),
                    "y_center": float(parts[2]),
                    "width": float(parts[3]),
                    "height": float(parts[4]),
                })
    return annotations


def classify_circuit(annotations: list[dict]) -> dict:
    """Infer circuit characteristics from annotations."""
    counts = Counter(a["class_name"] for a in annotations)
    return {
        "num_resistors": counts.get("R", 0),
        "num_voltage_sources": counts.get("V", 0),
        "num_current_sources": counts.get("I", 0),
        "num_grounds": counts.get("GND", 0),
        "num_edge_connections": counts.get("E", 0),
        "num_connection_points": counts.get("P", 0),
        "num_res_labels": counts.get("ident-res", 0),
        "num_voltage_labels": counts.get("ident-v", 0),
        "num_current_labels": counts.get("ident-i", 0),
        "total_annotations": len(annotations),
    }


def get_split_assignments() -> dict[str, str]:
    """Read train/val split assignments if available."""
    assignments = {}
    for split_name in ["train", "val"]:
        split_img_dir = SPLIT_DIR / "images" / split_name
        if split_img_dir.exists():
            for f in split_img_dir.iterdir():
                assignments[f.stem] = split_name
    return assignments


def main():
    # Gather all images
    image_files = sorted(IMAGES_DIR.glob("*.png")) + sorted(IMAGES_DIR.glob("*.jpg"))
    print(f"Total images found: {len(image_files)}")

    # Gather all labels
    label_files = sorted(LABELS_DIR.glob("*.txt"))
    print(f"Total label files found: {len(label_files)}")

    # Get split assignments
    splits = get_split_assignments()
    split_counts = Counter(splits.values())
    print(f"Split assignments: {dict(split_counts)}")

    # Parse all annotations
    all_class_counts = Counter()
    circuit_stats = []
    images_without_labels = []
    resistor_distribution = Counter()

    for img_path in image_files:
        label_path = LABELS_DIR / (img_path.stem + ".txt")
        if not label_path.exists():
            images_without_labels.append(img_path.name)
            continue

        annotations = parse_label_file(label_path)
        info = classify_circuit(annotations)
        info["image_name"] = img_path.name
        info["split"] = splits.get(img_path.stem, "unassigned")
        circuit_stats.append(info)

        for a in annotations:
            all_class_counts[a["class_name"]] += 1

        resistor_distribution[info["num_resistors"]] += 1

    # Summary
    print(f"\nImages without labels: {len(images_without_labels)}")
    print(f"Images with labels: {len(circuit_stats)}")

    print("\n--- Annotation class distribution ---")
    for cls, count in sorted(all_class_counts.items(), key=lambda x: -x[1]):
        print(f"  {cls:15s}: {count:>5d}")

    print("\n--- Resistor count distribution ---")
    for n_res, count in sorted(resistor_distribution.items()):
        print(f"  {n_res} resistors: {count:>4d} circuits")

    # Complexity buckets
    simple = sum(1 for s in circuit_stats if s["num_resistors"] <= 2)
    medium = sum(1 for s in circuit_stats if 3 <= s["num_resistors"] <= 5)
    complex_ = sum(1 for s in circuit_stats if s["num_resistors"] >= 6)
    print(f"\n--- Complexity buckets ---")
    print(f"  Simple  (1-2 R): {simple}")
    print(f"  Medium  (3-5 R): {medium}")
    print(f"  Complex (6+  R): {complex_}")

    # Circuits with current sources (less common, potentially interesting)
    with_current_src = sum(1 for s in circuit_stats if s["num_current_sources"] > 0)
    print(f"\nCircuits with current sources: {with_current_src}")

    # Save full inventory to JSON for downstream use
    output_path = Path(__file__).resolve().parent.parent / "data" / "aitee_inventory.json"
    with open(output_path, "w") as f:
        json.dump(circuit_stats, f, indent=2)
    print(f"\nFull inventory saved to: {output_path}")


if __name__ == "__main__":
    main()
