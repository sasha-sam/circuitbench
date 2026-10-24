"""
CircuitBench Fault Injector

Creates controlled-fault versions of AITEE circuit images by applying
deterministic visual modifications:

1. Open circuit — erase a wire segment (white rectangle over a connection)
2. Disconnected component — erase connections to one component
3. Missing ground — erase ground symbol

Each fault produces a modified image + a manifest entry with full provenance
documenting exactly what was changed and why the ground truth is what it is.

Only modifies copies; source images are never touched.
"""

import json
import random
import hashlib
from pathlib import Path
from collections import Counter

from PIL import Image, ImageDraw

PROJ_ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = PROJ_ROOT / "data" / "raw" / "aitee" / "images" / "dataset" / "images"
LABELS_DIR = PROJ_ROOT / "data" / "raw" / "aitee" / "images" / "dataset" / "labels"
FAULTS_DIR = PROJ_ROOT / "data" / "faults"
MANIFEST_PATH = PROJ_ROOT / "benchmark" / "manifest.jsonl"

CLASS_NAMES = {
    0: "E", 1: "GND", 2: "I", 3: "P", 4: "R",
    5: "V", 6: "ident-i", 7: "ident-i-dir", 8: "ident-res",
    9: "ident-v", 10: "ident-v-dir",
}

random.seed(42)


def stable_id(source: str, image: str, task: str, variant: int) -> str:
    raw = f"{source}:{image}:{task}:{variant}"
    short_hash = hashlib.sha256(raw.encode()).hexdigest()[:8]
    return f"CB-{source.upper()}-{short_hash}"


def parse_labels(image_stem: str) -> list[dict]:
    label_path = LABELS_DIR / f"{image_stem}.txt"
    if not label_path.exists():
        return []
    annotations = []
    with open(label_path) as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 5:
                annotations.append({
                    "class_id": int(parts[0]),
                    "class_name": CLASS_NAMES[int(parts[0])],
                    "x_center": float(parts[1]),
                    "y_center": float(parts[2]),
                    "width": float(parts[3]),
                    "height": float(parts[4]),
                })
    return annotations


def bbox_to_pixels(ann: dict, img_w: int, img_h: int) -> tuple[int, int, int, int]:
    """Convert normalized YOLO bbox to pixel coordinates (x1, y1, x2, y2)."""
    cx = ann["x_center"] * img_w
    cy = ann["y_center"] * img_h
    w = ann["width"] * img_w
    h = ann["height"] * img_h
    return (
        int(cx - w / 2),
        int(cy - h / 2),
        int(cx + w / 2),
        int(cy + h / 2),
    )


def inject_open_circuit(img: Image.Image, annotations: list[dict],
                        image_name: str) -> list[dict]:
    """Erase a wire segment between two junction nodes to create an open circuit.

    Finds two nearby edge-connection (E) annotations and draws a white
    rectangle over the area between them, simulating a broken wire.
    """
    items = []
    edges = [a for a in annotations if a["class_name"] == "E"]
    if len(edges) < 2:
        return items

    img_w, img_h = img.size

    # Pick a random pair of nearby edges
    best_pair = None
    best_dist = float("inf")
    for i in range(len(edges)):
        for j in range(i + 1, len(edges)):
            dx = (edges[i]["x_center"] - edges[j]["x_center"]) * img_w
            dy = (edges[i]["y_center"] - edges[j]["y_center"]) * img_h
            dist = (dx**2 + dy**2) ** 0.5
            # Want a pair that's close but not overlapping
            if 30 < dist < 200 and dist < best_dist:
                best_dist = dist
                best_pair = (edges[i], edges[j])

    if best_pair is None:
        return items

    e1, e2 = best_pair
    # Draw white rectangle over the midpoint region
    mid_x = int((e1["x_center"] + e2["x_center"]) / 2 * img_w)
    mid_y = int((e1["y_center"] + e2["y_center"]) / 2 * img_h)
    erase_w = max(20, int(best_dist * 0.4))
    erase_h = max(15, int(best_dist * 0.3))

    draw = ImageDraw.Draw(img)
    draw.rectangle(
        [mid_x - erase_w // 2, mid_y - erase_h // 2,
         mid_x + erase_w // 2, mid_y + erase_h // 2],
        fill="white",
    )

    # Save modified image
    fault_name = f"{Path(image_name).stem}_fault_open.png"
    fault_path = FAULTS_DIR / fault_name
    img.save(fault_path)

    items.append({
        "circuitbench_id": stable_id("aitee", image_name, "E-fault-open", 0),
        "source_dataset": "AITEE",
        "source_version": "1.0",
        "source_image_id": image_name,
        "source_url_or_doi": "https://github.com/CKnievel/aitee-dataset",
        "source_citation_key": "knievel2025aitee",
        "license": "Apache-2.0",
        "original_or_modified": "modified",
        "transformation_applied": (
            f"wire segment erased between two junction nodes near "
            f"({e1['x_center']:.2f},{e1['y_center']:.2f}) and "
            f"({e2['x_center']:.2f},{e2['y_center']:.2f}) "
            f"to create an open circuit"
        ),
        "fault_image": fault_name,
        "task_category": "E",
        "task_subcategory": "fault_diagnosis",
        "question": (
            "Analyze the electrical circuit shown in the image. "
            "Identify the single primary circuit fault, if one is present. "
            "Give a concise diagnosis and identify the affected area. "
            "If no fault is present, answer 'No fault detected.'"
        ),
        "answer_type": "free_text",
        "ground_truth": "Open circuit: a wire connection is broken, creating a discontinuity in the circuit path.",
        "ground_truth_derivation": "deterministic transformation: wire segment erased from source circuit",
        "difficulty": "medium",
        "split": None,
    })

    # Also a presence question
    items.append({
        "circuitbench_id": stable_id("aitee", image_name, "E-fault-open-presence", 0),
        "source_dataset": "AITEE",
        "source_version": "1.0",
        "source_image_id": image_name,
        "source_url_or_doi": "https://github.com/CKnievel/aitee-dataset",
        "source_citation_key": "knievel2025aitee",
        "license": "Apache-2.0",
        "original_or_modified": "modified",
        "transformation_applied": items[0]["transformation_applied"],
        "fault_image": fault_name,
        "task_category": "E",
        "task_subcategory": "fault_presence",
        "question": (
            "Analyze the electrical circuit shown in the image. "
            "Is there a circuit fault present? Answer Yes or No."
        ),
        "answer_type": "binary",
        "ground_truth": "Yes",
        "ground_truth_derivation": "deterministic transformation: wire segment erased",
        "difficulty": "medium",
        "split": None,
    })

    return items


def inject_disconnected_component(img: Image.Image, annotations: list[dict],
                                  image_name: str) -> list[dict]:
    """Erase a resistor from the circuit, leaving a gap."""
    items = []
    resistors = [a for a in annotations if a["class_name"] == "R"]
    if len(resistors) < 2:  # need at least 2 so removing 1 is meaningful
        return items

    img_w, img_h = img.size
    target = random.choice(resistors)
    x1, y1, x2, y2 = bbox_to_pixels(target, img_w, img_h)

    # Expand slightly to cover connection lines
    pad = 5
    draw = ImageDraw.Draw(img)
    draw.rectangle([x1 - pad, y1 - pad, x2 + pad, y2 + pad], fill="white")

    fault_name = f"{Path(image_name).stem}_fault_disconn.png"
    fault_path = FAULTS_DIR / fault_name
    img.save(fault_path)

    items.append({
        "circuitbench_id": stable_id("aitee", image_name, "E-fault-disconn", 0),
        "source_dataset": "AITEE",
        "source_version": "1.0",
        "source_image_id": image_name,
        "source_url_or_doi": "https://github.com/CKnievel/aitee-dataset",
        "source_citation_key": "knievel2025aitee",
        "license": "Apache-2.0",
        "original_or_modified": "modified",
        "transformation_applied": (
            f"resistor at normalized position ({target['x_center']:.2f}, "
            f"{target['y_center']:.2f}) erased to simulate a disconnected/missing component"
        ),
        "fault_image": fault_name,
        "task_category": "E",
        "task_subcategory": "fault_diagnosis",
        "question": (
            "Analyze the electrical circuit shown in the image. "
            "Identify the single primary circuit fault, if one is present. "
            "Give a concise diagnosis and identify the affected area. "
            "If no fault is present, answer 'No fault detected.'"
        ),
        "answer_type": "free_text",
        "ground_truth": "Disconnected component: a resistor is missing from the circuit, leaving a gap in the branch.",
        "ground_truth_derivation": "deterministic transformation: resistor bounding box erased from source circuit",
        "difficulty": "medium",
        "split": None,
    })

    items.append({
        "circuitbench_id": stable_id("aitee", image_name, "E-fault-disconn-presence", 0),
        "source_dataset": "AITEE",
        "source_version": "1.0",
        "source_image_id": image_name,
        "source_url_or_doi": "https://github.com/CKnievel/aitee-dataset",
        "source_citation_key": "knievel2025aitee",
        "license": "Apache-2.0",
        "original_or_modified": "modified",
        "transformation_applied": items[0]["transformation_applied"],
        "fault_image": fault_name,
        "task_category": "E",
        "task_subcategory": "fault_presence",
        "question": (
            "Analyze the electrical circuit shown in the image. "
            "Is there a circuit fault present? Answer Yes or No."
        ),
        "answer_type": "binary",
        "ground_truth": "Yes",
        "ground_truth_derivation": "deterministic transformation: resistor erased",
        "difficulty": "easy",
        "split": None,
    })

    return items


def main():
    FAULTS_DIR.mkdir(parents=True, exist_ok=True)

    image_files = sorted(IMAGES_DIR.glob("*.png")) + sorted(IMAGES_DIR.glob("*.jpg"))
    print(f"Source images: {len(image_files)}")

    # Select a subset for fault injection (not all 828 — that would be excessive)
    # Pick circuits with 3+ resistors for meaningful faults
    candidates = []
    for img_path in image_files:
        annotations = parse_labels(img_path.stem)
        counts = Counter(a["class_name"] for a in annotations)
        if counts.get("R", 0) >= 3 and counts.get("E", 0) >= 3:
            candidates.append((img_path, annotations))

    random.shuffle(candidates)
    # Use up to 200 circuits for fault injection
    selected = candidates[:200]
    print(f"Selected for fault injection: {len(selected)} circuits")

    all_fault_items = []
    open_count = 0
    disconn_count = 0

    for img_path, annotations in selected:
        image_name = img_path.name

        # Open circuit fault (on a fresh copy)
        img_open = Image.open(img_path).convert("RGB")
        open_items = inject_open_circuit(img_open, annotations, image_name)
        all_fault_items.extend(open_items)
        if open_items:
            open_count += 1

        # Disconnected component fault (on a separate fresh copy)
        img_disconn = Image.open(img_path).convert("RGB")
        disconn_items = inject_disconnected_component(img_disconn, annotations, image_name)
        all_fault_items.extend(disconn_items)
        if disconn_items:
            disconn_count += 1

    # Assign splits (same seed as main benchmark for consistency)
    image_names = list({item["source_image_id"] for item in all_fault_items})
    random.shuffle(image_names)
    cutoff = int(len(image_names) * 0.7)
    test_images = set(image_names[cutoff:])
    for item in all_fault_items:
        item["split"] = "test" if item["source_image_id"] in test_images else "dev"

    # Append to existing manifest
    with open(MANIFEST_PATH, "a") as f:
        for item in all_fault_items:
            f.write(json.dumps(item) + "\n")

    print(f"\nFault items generated: {len(all_fault_items)}")
    print(f"  Open circuit faults: {open_count}")
    print(f"  Disconnected component faults: {disconn_count}")
    print(f"  Fault images saved to: {FAULTS_DIR}")
    print(f"  Appended to manifest: {MANIFEST_PATH}")

    # Summary by subcategory
    sub_counts = Counter(item["task_subcategory"] for item in all_fault_items)
    for sub, count in sorted(sub_counts.items()):
        print(f"  {sub:25s}: {count}")


if __name__ == "__main__":
    main()
