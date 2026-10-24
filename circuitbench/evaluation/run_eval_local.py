"""
CircuitBench Local VLM Evaluation (Ollama)

Runs benchmark evaluation against locally-hosted vision-language models
via Ollama. No API keys needed.

Usage:
  python evaluation/run_eval_local.py --model llava-phi3 --split dev --limit 20
  python evaluation/run_eval_local.py --model gemma3:4b --split test

Prerequisites:
  - Ollama installed and running (ollama serve)
  - Model pulled (ollama pull llava-phi3)
"""

import argparse
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

PROJ_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJ_ROOT / "benchmark" / "manifest.jsonl"
IMAGES_DIR = PROJ_ROOT / "data" / "raw" / "aitee" / "images" / "dataset" / "images"
FAULTS_DIR = PROJ_ROOT / "data" / "faults"
PROMPTS_DIR = PROJ_ROOT / "prompts" / "templates"
RESULTS_DIR = PROJ_ROOT / "results" / "outputs"

OLLAMA_URL = "http://localhost:11434/api/generate"

TEMPLATE_MAP = {
    ("A", "component_count"): "task_a_count.txt",
    ("A", "component_presence"): "task_a_binary.txt",
    ("A", "component_enumeration"): "task_a_enumerate.txt",
    ("B", "node_count"): "task_b_count.txt",
    ("B", "component_total"): "task_b_count.txt",
    ("B", "topology_structure"): "task_b_binary.txt",
    ("E", "fault_presence"): "task_e_presence.txt",
    ("E", "fault_diagnosis"): "task_e_fault.txt",
    ("E", "circuit_description"): "task_e_describe.txt",
}


def load_image_base64(item: dict) -> str:
    """Load the correct image (original or fault-injected) as base64."""
    if item.get("fault_image"):
        img_path = FAULTS_DIR / item["fault_image"]
    else:
        img_path = IMAGES_DIR / item["source_image_id"]
    if not img_path.exists():
        raise FileNotFoundError(f"Image not found: {img_path}")
    with open(img_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


def get_prompt(task_category: str, task_subcategory: str, question: str) -> str:
    template_file = TEMPLATE_MAP.get((task_category, task_subcategory))
    if template_file is None:
        return question
    template_path = PROMPTS_DIR / template_file
    if not template_path.exists():
        return question
    template = template_path.read_text()
    return template.format(question=question)


def call_ollama(model: str, prompt: str, image_b64: str) -> dict:
    """Call Ollama's generate API with an image."""
    payload = json.dumps({
        "model": model,
        "prompt": prompt,
        "images": [image_b64],
        "stream": False,
        "options": {
            "temperature": 0.0,
            "num_predict": 256,
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        OLLAMA_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )

    t0 = time.time()
    with urllib.request.urlopen(req, timeout=300) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    latency = time.time() - t0

    return {
        "response_text": result.get("response", ""),
        "latency_s": round(latency, 3),
        "eval_count": result.get("eval_count"),
        "prompt_eval_count": result.get("prompt_eval_count"),
        "total_duration_ns": result.get("total_duration"),
    }


def load_manifest(split: str | None = None, task_categories: list | None = None,
                  manifest_path: Path | None = None) -> list[dict]:
    path = manifest_path or MANIFEST_PATH
    items = []
    with open(path) as f:
        for line in f:
            item = json.loads(line)
            if split and item.get("split") != split:
                continue
            if task_categories and item.get("task_category") not in task_categories:
                continue
            items.append(item)
    return items


def check_ollama():
    """Verify Ollama is running."""
    try:
        req = urllib.request.Request("http://localhost:11434/api/tags")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m["name"] for m in data.get("models", [])]
            return models
    except Exception as e:
        print(f"ERROR: Cannot connect to Ollama at localhost:11434")
        print(f"  Make sure Ollama is running: ollama serve")
        print(f"  Error: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="CircuitBench Local Evaluation (Ollama)")
    parser.add_argument("--model", required=True, help="Ollama model name (e.g. llava-phi3, gemma3:4b)")
    parser.add_argument("--split", default="dev", choices=["dev", "test"])
    parser.add_argument("--limit", type=int, default=None, help="Max items to evaluate")
    parser.add_argument("--tasks", default=None, help="Comma-separated task categories (e.g. A,B,E)")
    parser.add_argument("--manifest", default=None,
                        help="Path to a specific manifest JSONL (overrides --split/--limit)")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    # Check Ollama
    available_models = check_ollama()
    print(f"Ollama models available: {available_models}")

    # Check requested model is available
    model_names = [m.split(":")[0] for m in available_models]
    if args.model not in available_models and args.model.split(":")[0] not in model_names:
        print(f"WARNING: Model '{args.model}' not found in Ollama. Pull it first:")
        print(f"  ollama pull {args.model}")
        sys.exit(1)

    # Load items
    task_filter = args.tasks.split(",") if args.tasks else None
    if args.manifest:
        manifest_path = Path(args.manifest)
        if not manifest_path.is_absolute():
            manifest_path = PROJ_ROOT / manifest_path
        items = load_manifest(manifest_path=manifest_path)
        split_label = Path(args.manifest).stem  # e.g. test_sample_200
    else:
        items = load_manifest(args.split, task_filter)
        split_label = args.split
    if args.limit:
        items = items[:args.limit]

    print(f"Model: {args.model}")
    print(f"Split/manifest: {split_label}")
    print(f"Items: {len(items)}")

    # Output file
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    safe_model = args.model.replace(":", "-").replace("/", "-")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_split = split_label.replace("/", "-")
    output_file = RESULTS_DIR / f"{safe_model}_{safe_split}_{timestamp}.jsonl"

    # Resume support
    done_ids = set()
    if args.resume:
        existing = sorted(RESULTS_DIR.glob(f"{safe_model}_{safe_split}_*.jsonl"))
        if existing:
            output_file = existing[-1]
            with open(output_file) as f:
                for line in f:
                    done_ids.add(json.loads(line)["circuitbench_id"])
            print(f"Resuming: {len(done_ids)} already completed")

    # Save run metadata
    run_meta = {
        "model_name": args.model,
        "provider": "ollama (local)",
        "temperature": 0.0,
        "max_tokens": 256,
        "split": split_label,
        "manifest": args.manifest or "benchmark/manifest.jsonl",
        "start_time": datetime.now(timezone.utc).isoformat(),
        "total_items": len(items),
        "task_filter": task_filter,
    }
    meta_file = output_file.with_suffix(".meta.json")
    with open(meta_file, "w") as f:
        json.dump(run_meta, f, indent=2)

    # Evaluate
    successes = 0
    errors = 0
    total_latency = 0.0
    mode = "a" if args.resume and done_ids else "w"

    with open(output_file, mode) as out_f:
        for i, item in enumerate(items):
            if item["circuitbench_id"] in done_ids:
                continue

            try:
                image_b64 = load_image_base64(item)
                prompt = get_prompt(
                    item["task_category"],
                    item.get("task_subcategory", ""),
                    item["question"],
                )
                result = call_ollama(args.model, prompt, image_b64)

                record = {
                    "circuitbench_id": item["circuitbench_id"],
                    "source_image_id": item["source_image_id"],
                    "task_category": item["task_category"],
                    "task_subcategory": item.get("task_subcategory"),
                    "question": item["question"],
                    "ground_truth": item["ground_truth"],
                    "model_response": result["response_text"],
                    "latency_s": result["latency_s"],
                    "eval_count": result.get("eval_count"),
                    "error": None,
                }
                out_f.write(json.dumps(record) + "\n")
                out_f.flush()
                successes += 1
                total_latency += result["latency_s"]

            except Exception as e:
                record = {
                    "circuitbench_id": item["circuitbench_id"],
                    "source_image_id": item["source_image_id"],
                    "task_category": item["task_category"],
                    "question": item["question"],
                    "ground_truth": item["ground_truth"],
                    "model_response": None,
                    "error": str(e),
                }
                out_f.write(json.dumps(record) + "\n")
                out_f.flush()
                errors += 1

            # Progress
            total_done = successes + errors + len(done_ids)
            if (i + 1) % 5 == 0 or (i + 1) == len(items):
                avg_lat = total_latency / successes if successes > 0 else 0
                print(f"  [{total_done}/{len(items)}] ok={successes} err={errors} avg_latency={avg_lat:.1f}s")

    print(f"\nDone. Results: {output_file}")
    print(f"Successes: {successes}, Errors: {errors}")
    if successes > 0:
        print(f"Average latency: {total_latency / successes:.1f}s per item")
        est_total = total_latency / successes * len(items)
        print(f"Estimated full run time: {est_total / 60:.0f} minutes")


if __name__ == "__main__":
    main()
