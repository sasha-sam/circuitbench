"""
CircuitBench Benchmark Builder

Generates benchmark items (question–answer pairs with provenance) from
the AITEE dataset. Each item is traceable to its source image and has
a deterministic ground-truth answer derived from annotations.

Task categories (from the spec):
  A — Component/symbol recognition
  B — Connectivity/topology reasoning
  C — Functional reasoning
  D — Quantitative reasoning
  E — Fault diagnosis
  F — Representation robustness (cross-dataset, handled separately)

This script handles Tasks A and E for AITEE images.
Tasks B–D require netlist/topology information and are generated separately.
"""

import json
import random
import hashlib
from pathlib import Path

PROJ_ROOT = Path(__file__).resolve().parent.parent
INVENTORY_PATH = PROJ_ROOT / "data" / "aitee_inventory.json"
IMAGES_DIR = PROJ_ROOT / "data" / "raw" / "aitee" / "images" / "dataset" / "images"
LABELS_DIR = PROJ_ROOT / "data" / "raw" / "aitee" / "images" / "dataset" / "labels"
OUTPUT_PATH = PROJ_ROOT / "benchmark" / "manifest.jsonl"

CLASS_NAMES = {
    0: "E", 1: "GND", 2: "I", 3: "P", 4: "R",
    5: "V", 6: "ident-i", 7: "ident-i-dir", 8: "ident-res",
    9: "ident-v", 10: "ident-v-dir",
}

# Human-readable component names for questions
# E = edge connections (junctions), P = connection points — these are structural,
# not user-facing components. V = voltage source, I = current source.
COMPONENT_DISPLAY = {
    "V": "voltage source",
    "GND": "ground connection",
    "I": "current source",
    "R": "resistor",
}

random.seed(42)


def stable_id(source: str, image: str, task: str, variant: int) -> str:
    """Generate a deterministic CircuitBench ID."""
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
                })
    return annotations


def count_components(annotations: list[dict]) -> dict[str, int]:
    from collections import Counter
    counts = Counter(a["class_name"] for a in annotations)
    return {
        "R": counts.get("R", 0),
        "V": counts.get("V", 0),      # voltage source (class 5)
        "I": counts.get("I", 0),      # current source (class 2)
        "GND": counts.get("GND", 0),  # ground (class 1)
        "E": counts.get("E", 0),      # edge connections / junctions (class 0)
        "P": counts.get("P", 0),      # connection points (class 3)
    }


# ---------------------------------------------------------------------------
# Task A generators — Component Recognition
# ---------------------------------------------------------------------------

def gen_task_a_count_resistors(image_name: str, counts: dict, item_list: list):
    """How many resistors are in this circuit?"""
    item_list.append({
        "circuitbench_id": stable_id("aitee", image_name, "A-count-R", 0),
        "source_dataset": "AITEE",
        "source_version": "1.0",
        "source_image_id": image_name,
        "source_url_or_doi": "https://github.com/CKnievel/aitee-dataset",
        "source_citation_key": "knievel2025aitee",
        "license": "Apache-2.0",
        "original_or_modified": "original",
        "transformation_applied": None,
        "task_category": "A",
        "task_subcategory": "component_count",
        "question": "How many resistors are present in this circuit diagram?",
        "answer_type": "integer",
        "ground_truth": str(counts["R"]),
        "ground_truth_derivation": "count of class 'R' in YOLO annotations",
        "difficulty": "easy" if counts["R"] <= 2 else ("medium" if counts["R"] <= 4 else "hard"),
        "split": None,  # assigned later
    })


def gen_task_a_count_sources(image_name: str, counts: dict, item_list: list):
    """How many voltage sources are in this circuit?"""
    if counts["V"] == 0:
        return
    item_list.append({
        "circuitbench_id": stable_id("aitee", image_name, "A-count-V", 0),
        "source_dataset": "AITEE",
        "source_version": "1.0",
        "source_image_id": image_name,
        "source_url_or_doi": "https://github.com/CKnievel/aitee-dataset",
        "source_citation_key": "knievel2025aitee",
        "license": "Apache-2.0",
        "original_or_modified": "original",
        "transformation_applied": None,
        "task_category": "A",
        "task_subcategory": "component_count",
        "question": "How many voltage sources are present in this circuit diagram?",
        "answer_type": "integer",
        "ground_truth": str(counts["V"]),
        "ground_truth_derivation": "count of class 'V' (voltage source) in YOLO annotations",
        "difficulty": "easy",
        "split": None,
    })


def gen_task_a_has_ground(image_name: str, counts: dict, item_list: list):
    """Does this circuit have a ground connection?"""
    item_list.append({
        "circuitbench_id": stable_id("aitee", image_name, "A-has-GND", 0),
        "source_dataset": "AITEE",
        "source_version": "1.0",
        "source_image_id": image_name,
        "source_url_or_doi": "https://github.com/CKnievel/aitee-dataset",
        "source_citation_key": "knievel2025aitee",
        "license": "Apache-2.0",
        "original_or_modified": "original",
        "transformation_applied": None,
        "task_category": "A",
        "task_subcategory": "component_presence",
        "question": "Does this circuit diagram include a ground (GND) connection? Answer Yes or No.",
        "answer_type": "binary",
        "ground_truth": "Yes" if counts["GND"] > 0 else "No",
        "ground_truth_derivation": "presence of class 'GND' in YOLO annotations",
        "difficulty": "easy",
        "split": None,
    })


def gen_task_a_has_current_source(image_name: str, counts: dict, item_list: list):
    """Does this circuit contain a current source?"""
    item_list.append({
        "circuitbench_id": stable_id("aitee", image_name, "A-has-I", 0),
        "source_dataset": "AITEE",
        "source_version": "1.0",
        "source_image_id": image_name,
        "source_url_or_doi": "https://github.com/CKnievel/aitee-dataset",
        "source_citation_key": "knievel2025aitee",
        "license": "Apache-2.0",
        "original_or_modified": "original",
        "transformation_applied": None,
        "task_category": "A",
        "task_subcategory": "component_presence",
        "question": "Does this circuit diagram contain a current source? Answer Yes or No.",
        "answer_type": "binary",
        "ground_truth": "Yes" if counts["I"] > 0 else "No",
        "ground_truth_derivation": "presence of class 'I' in YOLO annotations",
        "difficulty": "easy",
        "split": None,
    })


def gen_task_a_list_components(image_name: str, counts: dict, item_list: list):
    """List the types of components visible in this circuit."""
    present = []
    for key, display in COMPONENT_DISPLAY.items():
        if counts.get(key, 0) > 0:
            present.append(f"{display} ({counts[key]})")
    if not present:
        return
    ground_truth = ", ".join(present)
    item_list.append({
        "circuitbench_id": stable_id("aitee", image_name, "A-list-comp", 0),
        "source_dataset": "AITEE",
        "source_version": "1.0",
        "source_image_id": image_name,
        "source_url_or_doi": "https://github.com/CKnievel/aitee-dataset",
        "source_citation_key": "knievel2025aitee",
        "license": "Apache-2.0",
        "original_or_modified": "original",
        "transformation_applied": None,
        "task_category": "A",
        "task_subcategory": "component_enumeration",
        "question": "List all types of circuit components visible in this diagram, along with how many of each are present.",
        "answer_type": "free_text",
        "ground_truth": ground_truth,
        "ground_truth_derivation": "component class counts from YOLO annotations",
        "difficulty": "easy" if len(present) <= 2 else "medium",
        "split": None,
    })


# ---------------------------------------------------------------------------
# Task B generators — Connectivity / Topology Reasoning
# ---------------------------------------------------------------------------

def _aitee_provenance(image_name: str) -> dict:
    """Common provenance fields for an unmodified AITEE image."""
    return {
        "source_dataset": "AITEE",
        "source_version": "1.0",
        "source_image_id": image_name,
        "source_url_or_doi": "https://github.com/CKnievel/aitee-dataset",
        "source_citation_key": "knievel2025aitee",
        "license": "Apache-2.0",
    }


def gen_task_b_count_nodes(image_name: str, counts: dict, item_list: list):
    """How many distinct junction/connection nodes are visible?"""
    # Edge connections (E) are junction nodes in the AITEE annotation scheme
    num_nodes = counts["E"]
    if num_nodes == 0:
        return
    item_list.append({
        "circuitbench_id": stable_id("aitee", image_name, "B-count-nodes", 0),
        **_aitee_provenance(image_name),
        "original_or_modified": "original",
        "transformation_applied": None,
        "task_category": "B",
        "task_subcategory": "node_count",
        "question": "How many distinct electrical junction nodes (connection points where wires or components meet) can you identify in this circuit diagram?",
        "answer_type": "integer",
        "ground_truth": str(num_nodes),
        "ground_truth_derivation": "count of class 'E' (edge connection) in YOLO annotations",
        "difficulty": "easy" if num_nodes <= 3 else ("medium" if num_nodes <= 5 else "hard"),
        "split": None,
    })


def gen_task_b_total_components(image_name: str, counts: dict, item_list: list):
    """How many two-terminal components (R, V, I) total are in this circuit?"""
    total = counts["R"] + counts["V"] + counts["I"]
    if total == 0:
        return
    item_list.append({
        "circuitbench_id": stable_id("aitee", image_name, "B-total-comp", 0),
        **_aitee_provenance(image_name),
        "original_or_modified": "original",
        "transformation_applied": None,
        "task_category": "B",
        "task_subcategory": "component_total",
        "question": "How many two-terminal components (resistors, voltage sources, and current sources combined) are present in this circuit?",
        "answer_type": "integer",
        "ground_truth": str(total),
        "ground_truth_derivation": "sum of R + V + I class counts from YOLO annotations",
        "difficulty": "easy" if total <= 3 else ("medium" if total <= 5 else "hard"),
        "split": None,
    })


def gen_task_b_node_component_ratio(image_name: str, counts: dict, item_list: list):
    """Is there a path from every component to the source? (completeness check)"""
    # If #nodes < #components, the circuit likely has isolated elements
    # This is a simplified topology question derivable from annotation counts
    num_nodes = counts["E"]
    num_components = counts["R"] + counts["V"] + counts["I"]
    if num_components < 2 or num_nodes < 2:
        return
    # In a valid connected circuit, nodes >= 2 and components >= 1
    # For a simple series circuit: nodes = components + 1
    # For parallel: fewer nodes relative to components
    # Question: more nodes than components → likely has branching
    has_branching = num_nodes > num_components
    item_list.append({
        "circuitbench_id": stable_id("aitee", image_name, "B-branching", 0),
        **_aitee_provenance(image_name),
        "original_or_modified": "original",
        "transformation_applied": None,
        "task_category": "B",
        "task_subcategory": "topology_structure",
        "question": "Does this circuit contain any parallel branches (i.e., components that share the same two nodes)? Answer Yes or No.",
        "answer_type": "binary",
        "ground_truth": "Yes" if has_branching else "No",
        "ground_truth_derivation": (
            f"inferred from node-to-component ratio: {num_nodes} nodes vs "
            f"{num_components} components; more nodes than components suggests branching"
        ),
        "difficulty": "medium",
        "split": None,
    })


# ---------------------------------------------------------------------------
# Task E generators — Fault Diagnosis (on unmodified correct circuits)
# ---------------------------------------------------------------------------

def gen_task_e_no_fault(image_name: str, counts: dict, item_list: list):
    """Present a correct circuit and ask if there's a fault (answer: No)."""
    num_components = counts["R"] + counts["V"] + counts["I"]
    if num_components < 2:
        return
    item_list.append({
        "circuitbench_id": stable_id("aitee", image_name, "E-nofault", 0),
        **_aitee_provenance(image_name),
        "original_or_modified": "original",
        "transformation_applied": None,
        "task_category": "E",
        "task_subcategory": "fault_presence",
        "question": (
            "Analyze the electrical circuit shown in the image. "
            "Is there a circuit fault present (such as an open circuit, "
            "short circuit, missing connection, or disconnected component)? "
            "Answer Yes or No."
        ),
        "answer_type": "binary",
        "ground_truth": "No",
        "ground_truth_derivation": (
            "source image is an unmodified educational circuit from AITEE; "
            "assumed correct as designed for first-semester coursework"
        ),
        "difficulty": "medium",
        "split": None,
    })


def gen_task_e_describe_circuit(image_name: str, counts: dict, item_list: list):
    """Describe the circuit structure — tests whether the model can reason
    about what it sees before diagnosing faults."""
    num_r = counts["R"]
    num_v = counts["V"]
    num_i = counts["I"]
    if num_r < 2:
        return
    # Build expected description
    parts = []
    if num_v > 0:
        parts.append(f"{num_v} voltage source{'s' if num_v > 1 else ''}")
    if num_i > 0:
        parts.append(f"{num_i} current source{'s' if num_i > 1 else ''}")
    parts.append(f"{num_r} resistor{'s' if num_r > 1 else ''}")
    expected = ", ".join(parts)

    item_list.append({
        "circuitbench_id": stable_id("aitee", image_name, "E-describe", 0),
        **_aitee_provenance(image_name),
        "original_or_modified": "original",
        "transformation_applied": None,
        "task_category": "E",
        "task_subcategory": "circuit_description",
        "question": (
            "Before performing any fault analysis, describe this circuit: "
            "how many and what types of components are present, and what is "
            "the general topology (series, parallel, or mixed)?"
        ),
        "answer_type": "free_text",
        "ground_truth": expected,
        "ground_truth_derivation": "component counts from YOLO annotations; topology is free-text",
        "difficulty": "medium" if num_r <= 3 else "hard",
        "split": None,
    })


# ---------------------------------------------------------------------------
# Assign dev/test splits
# ---------------------------------------------------------------------------

def assign_splits(items: list, test_ratio: float = 0.3):
    """Assign each item to dev or test split, grouped by source image."""
    image_names = list({item["source_image_id"] for item in items})
    random.shuffle(image_names)
    cutoff = int(len(image_names) * (1 - test_ratio))
    test_images = set(image_names[cutoff:])

    for item in items:
        item["split"] = "test" if item["source_image_id"] in test_images else "dev"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    with open(INVENTORY_PATH) as f:
        inventory = json.load(f)

    print(f"Loaded inventory: {len(inventory)} circuits")

    items = []

    for circuit in inventory:
        image_name = circuit["image_name"]
        annotations = parse_labels(Path(image_name).stem)
        counts = count_components(annotations)

        # Skip circuits with no components at all
        if sum(counts.values()) == 0:
            continue

        # Task A — Component Recognition
        gen_task_a_count_resistors(image_name, counts, items)
        gen_task_a_count_sources(image_name, counts, items)
        gen_task_a_has_ground(image_name, counts, items)
        gen_task_a_has_current_source(image_name, counts, items)
        gen_task_a_list_components(image_name, counts, items)

        # Task B — Connectivity / Topology Reasoning
        gen_task_b_count_nodes(image_name, counts, items)
        gen_task_b_total_components(image_name, counts, items)
        gen_task_b_node_component_ratio(image_name, counts, items)

        # Task E — Fault Diagnosis (correct circuits = no-fault baseline)
        gen_task_e_no_fault(image_name, counts, items)
        gen_task_e_describe_circuit(image_name, counts, items)

    # Assign splits
    assign_splits(items)

    # Write manifest
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        for item in items:
            f.write(json.dumps(item) + "\n")

    # Stats
    from collections import Counter
    split_counts = Counter(item["split"] for item in items)
    cat_counts = Counter(item["task_category"] for item in items)
    task_counts = Counter(item["task_subcategory"] for item in items)
    diff_counts = Counter(item["difficulty"] for item in items)

    print(f"\nTotal benchmark items: {len(items)}")
    print(f"\nBy task category:")
    for cat in sorted(cat_counts):
        print(f"  Task {cat}: {cat_counts[cat]}")
    print(f"\nBy subcategory:")
    for sub in sorted(task_counts):
        print(f"  {sub:25s}: {task_counts[sub]}")
    print(f"\nSplits: {dict(split_counts)}")
    print(f"Difficulty: {dict(diff_counts)}")
    print(f"\nManifest written to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
