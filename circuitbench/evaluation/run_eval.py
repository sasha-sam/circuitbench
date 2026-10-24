"""
CircuitBench VLM Evaluation Harness

Sends benchmark items to vision-language model APIs, records raw responses,
and logs all parameters for reproducibility.

Usage:
  python evaluation/run_eval.py --model gpt-4o --split test
  python evaluation/run_eval.py --model claude-sonnet-4-20250514 --split dev --limit 50

Requires API keys in environment variables:
  OPENAI_API_KEY      — for GPT-4o, GPT-4o-mini
  ANTHROPIC_API_KEY   — for Claude models
  GOOGLE_API_KEY      — for Gemini models
"""

import argparse
import base64
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Add project root to path
PROJ_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJ_ROOT))

MANIFEST_PATH = PROJ_ROOT / "benchmark" / "manifest.jsonl"
IMAGES_DIR = PROJ_ROOT / "data" / "raw" / "aitee" / "images" / "dataset" / "images"
PROMPTS_DIR = PROJ_ROOT / "prompts" / "templates"
RESULTS_DIR = PROJ_ROOT / "results" / "outputs"

# Prompt template mapping
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

# Model configurations
MODEL_CONFIGS = {
    # OpenAI models
    "gpt-4o": {
        "provider": "openai",
        "model_id": "gpt-4o",
        "max_tokens": 256,
        "temperature": 0.0,
    },
    "gpt-4o-mini": {
        "provider": "openai",
        "model_id": "gpt-4o-mini",
        "max_tokens": 256,
        "temperature": 0.0,
    },
    # Anthropic models
    "claude-sonnet": {
        "provider": "anthropic",
        "model_id": "claude-sonnet-4-20250514",
        "max_tokens": 256,
        "temperature": 0.0,
    },
    "claude-haiku": {
        "provider": "anthropic",
        "model_id": "claude-haiku-4-5-20251001",
        "max_tokens": 256,
        "temperature": 0.0,
    },
    # Google models
    "gemini-2.0-flash": {
        "provider": "google",
        "model_id": "gemini-2.0-flash",
        "max_tokens": 256,
        "temperature": 0.0,
    },
    "gemini-2.5-pro": {
        "provider": "google",
        "model_id": "gemini-2.5-pro-preview-06-05",
        "max_tokens": 256,
        "temperature": 0.0,
    },
}


FAULTS_DIR = PROJ_ROOT / "data" / "faults"


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
    """Load and fill the prompt template."""
    template_file = TEMPLATE_MAP.get((task_category, task_subcategory))
    if template_file is None:
        # Fallback: use the question directly
        return question
    template_path = PROMPTS_DIR / template_file
    if not template_path.exists():
        return question
    template = template_path.read_text()
    return template.format(question=question)


def call_openai(model_id: str, prompt: str, image_b64: str,
                temperature: float, max_tokens: int) -> dict:
    """Call OpenAI API with vision."""
    from openai import OpenAI
    client = OpenAI()
    t0 = time.time()
    response = client.chat.completions.create(
        model=model_id,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {
                    "url": f"data:image/png;base64,{image_b64}",
                }},
            ],
        }],
    )
    latency = time.time() - t0
    return {
        "response_text": response.choices[0].message.content,
        "latency_s": round(latency, 3),
        "usage": {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
        },
        "finish_reason": response.choices[0].finish_reason,
    }


def call_anthropic(model_id: str, prompt: str, image_b64: str,
                   temperature: float, max_tokens: int) -> dict:
    """Call Anthropic API with vision."""
    import anthropic
    client = anthropic.Anthropic()
    t0 = time.time()
    response = client.messages.create(
        model=model_id,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": image_b64,
                }},
                {"type": "text", "text": prompt},
            ],
        }],
    )
    latency = time.time() - t0
    return {
        "response_text": response.content[0].text,
        "latency_s": round(latency, 3),
        "usage": {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        },
        "stop_reason": response.stop_reason,
    }


def call_google(model_id: str, prompt: str, image_b64: str,
                temperature: float, max_tokens: int) -> dict:
    """Call Google Gemini API with vision."""
    from google import genai
    from google.genai import types
    import base64 as b64mod

    client = genai.Client()
    image_bytes = b64mod.standard_b64decode(image_b64)
    t0 = time.time()
    response = client.models.generate_content(
        model=model_id,
        contents=[
            types.Content(parts=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                types.Part.from_text(text=prompt),
            ]),
        ],
        config=types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )
    latency = time.time() - t0
    return {
        "response_text": response.text,
        "latency_s": round(latency, 3),
        "usage": {
            "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", None),
            "completion_tokens": getattr(response.usage_metadata, "candidates_token_count", None),
        },
    }


PROVIDER_CALLERS = {
    "openai": call_openai,
    "anthropic": call_anthropic,
    "google": call_google,
}


def load_manifest(split: str | None = None) -> list[dict]:
    """Load benchmark items, optionally filtering by split."""
    items = []
    with open(MANIFEST_PATH) as f:
        for line in f:
            item = json.loads(line)
            if split is None or item.get("split") == split:
                items.append(item)
    return items


def main():
    parser = argparse.ArgumentParser(description="CircuitBench VLM Evaluation")
    parser.add_argument("--model", required=True, choices=list(MODEL_CONFIGS.keys()),
                        help="Model to evaluate")
    parser.add_argument("--split", default="test", choices=["dev", "test"],
                        help="Benchmark split to evaluate")
    parser.add_argument("--limit", type=int, default=None,
                        help="Max number of items to evaluate (for testing)")
    parser.add_argument("--resume", action="store_true",
                        help="Resume from where a previous run left off")
    args = parser.parse_args()

    config = MODEL_CONFIGS[args.model]
    caller = PROVIDER_CALLERS[config["provider"]]

    # Load items
    items = load_manifest(args.split)
    if args.limit:
        items = items[:args.limit]

    print(f"Model: {args.model} ({config['model_id']})")
    print(f"Split: {args.split}")
    print(f"Items: {len(items)}")

    # Output file
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output_file = RESULTS_DIR / f"{args.model}_{args.split}_{timestamp}.jsonl"

    # Track already-done IDs if resuming
    done_ids = set()
    if args.resume:
        existing = sorted(RESULTS_DIR.glob(f"{args.model}_{args.split}_*.jsonl"))
        if existing:
            output_file = existing[-1]  # append to latest
            with open(output_file) as f:
                for line in f:
                    done_ids.add(json.loads(line)["circuitbench_id"])
            print(f"Resuming: {len(done_ids)} already completed")

    # Run metadata
    run_meta = {
        "model_name": args.model,
        "model_id": config["model_id"],
        "provider": config["provider"],
        "temperature": config["temperature"],
        "max_tokens": config["max_tokens"],
        "split": args.split,
        "start_time": datetime.now(timezone.utc).isoformat(),
        "total_items": len(items),
    }

    # Save run metadata
    meta_file = output_file.with_suffix(".meta.json")
    with open(meta_file, "w") as f:
        json.dump(run_meta, f, indent=2)

    # Evaluate
    successes = 0
    errors = 0
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
                result = caller(
                    config["model_id"], prompt, image_b64,
                    config["temperature"], config["max_tokens"],
                )

                record = {
                    "circuitbench_id": item["circuitbench_id"],
                    "source_image_id": item["source_image_id"],
                    "task_category": item["task_category"],
                    "task_subcategory": item.get("task_subcategory"),
                    "question": item["question"],
                    "ground_truth": item["ground_truth"],
                    "model_response": result["response_text"],
                    "latency_s": result["latency_s"],
                    "usage": result.get("usage"),
                    "error": None,
                }
                out_f.write(json.dumps(record) + "\n")
                out_f.flush()
                successes += 1

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
            if (i + 1) % 10 == 0 or (i + 1) == len(items):
                print(f"  [{total_done}/{len(items)}] ok={successes} err={errors}")

            # Rate limiting
            time.sleep(0.5)

    print(f"\nDone. Results: {output_file}")
    print(f"Successes: {successes}, Errors: {errors}")


if __name__ == "__main__":
    main()
