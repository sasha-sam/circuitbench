# CircuitBench

**Benchmarking Vision-Language Models for Electronic Circuit Reasoning and Fault Diagnosis**

Sasha Sam · Purdue University · TechRxiv preprint, 2026

---

## Overview

CircuitBench is an 8,598-item benchmark evaluating whether open-weight vision-language models (VLMs) can interpret electronic circuit schematics — counting components, reasoning about topology, and diagnosing faults.

| Task | Description | Items |
|------|-------------|-------|
| A | Component recognition (count, presence, enumeration) | 3,834 |
| B | Topology / connectivity reasoning | 2,310 |
| E | Fault diagnosis (presence, type, description) | 2,454 |

**Source datasets:** [AITEE](https://github.com/CKnievel/aitee-dataset) (828 images, Apache 2.0) and [CGHD v16](https://zenodo.org/records/17469897) (1,604 images, CC BY 4.0).

---

## Key Results (dev split, local VLMs via Ollama)

| Model | Overall | Task A | Task B | Task E |
|-------|---------|--------|--------|--------|
| Gemma 3 4B | **38.3%** | 38.6% | 29.2% | 53.8% |
| LLaVA 7B | 23.3% | 26.7% | 33.3% | 0.0% |
| LLaVA-Phi3 | 8.0% | 15.4% | 0.0% | 0.0% |

All models struggle with counting and free-text fault description. Binary yes/no tasks (topology, fault presence) are far easier.

---

## Repository Structure

```
benchmark/          Benchmark manifest (manifest.jsonl) + test sample
evaluation/         Evaluation harness (run_eval_local.py, score.py)
prompts/templates/  Zero-shot prompt templates per task
scripts/            Data prep, fault injection, figure generation
manuscript/         LaTeX paper + bibliography + figures
requirements.txt    Python dependencies
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- [Ollama](https://ollama.com) installed and running (`ollama serve`)
- A vision model pulled: `ollama pull gemma3:4b` or `ollama pull llava:7b`

### Install dependencies

```bash
pip install -r requirements.txt
```

### Run evaluation (dev split, 20 items)

```bash
python evaluation/run_eval_local.py --model gemma3:4b --split dev --limit 20
```

### Score results

```bash
python evaluation/score.py results/outputs/<output_file>.jsonl
```

### Run on the 200-item stratified test sample

```bash
python evaluation/run_eval_local.py --model gemma3:4b --manifest benchmark/test_sample_200.jsonl
```

---

## Dataset Setup

Raw images are not included (download separately):

**AITEE:**
```bash
git clone https://github.com/CKnievel/aitee-dataset data/raw/aitee
```

**CGHD v16:**
```bash
python scripts/download_cghd.py
```

---

## Citation

```bibtex
@misc{sam2026circuitbench,
  author       = {Sam, Sasha},
  title        = {{CircuitBench}: Benchmarking Vision-Language Models
                  for Electronic Circuit Reasoning and Fault Diagnosis},
  year         = {2026},
  howpublished = {TechRxiv preprint},
  url          = {https://github.com/sasha-sam/circuitbench}
}
```

---

## License

Code: MIT. Benchmark manifest: CC BY 4.0. Source datasets retain their original licenses (AITEE: Apache 2.0; CGHD: CC BY 4.0).
