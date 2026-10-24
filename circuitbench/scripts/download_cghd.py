"""
Download CGHD dataset from Zenodo with resume support.

The file is ~4.9 GB. This script uses chunked downloading with
automatic resume so partial downloads aren't wasted.

Run: python scripts/download_cghd.py
"""

import os
import sys
import time
import urllib.request

URL = "https://zenodo.org/records/17469897/files/cghd-zenodo-16.zip?download=1"
DEST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                     "data", "raw", "cghd", "cghd-zenodo-16.zip")
EXPECTED_SIZE_GB = 4.9  # approximate


def download_with_resume(url: str, dest: str, chunk_size: int = 8 * 1024 * 1024):
    """Download a large file with resume support."""
    existing_size = 0
    if os.path.exists(dest):
        existing_size = os.path.getsize(dest)

    # Check total size
    req = urllib.request.Request(url, method="HEAD")
    req.add_header("User-Agent", "CircuitBench-Downloader/1.0")
    with urllib.request.urlopen(req) as resp:
        total_size = int(resp.headers.get("Content-Length", 0))

    if total_size == 0:
        print("Could not determine file size. Downloading without resume.")
        existing_size = 0

    if existing_size >= total_size and total_size > 0:
        print(f"File already complete: {existing_size / 1e9:.2f} GB")
        return

    print(f"Total size: {total_size / 1e9:.2f} GB")
    if existing_size > 0:
        print(f"Resuming from: {existing_size / 1e9:.2f} GB ({existing_size / total_size * 100:.1f}%)")

    req = urllib.request.Request(url)
    req.add_header("User-Agent", "CircuitBench-Downloader/1.0")
    if existing_size > 0:
        req.add_header("Range", f"bytes={existing_size}-")

    mode = "ab" if existing_size > 0 else "wb"
    downloaded = existing_size
    start_time = time.time()

    try:
        with urllib.request.urlopen(req) as resp, open(dest, mode) as f:
            while True:
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                elapsed = time.time() - start_time
                speed = (downloaded - existing_size) / elapsed if elapsed > 0 else 0
                pct = downloaded / total_size * 100 if total_size > 0 else 0
                eta = (total_size - downloaded) / speed if speed > 0 else 0
                print(
                    f"\r  {downloaded / 1e9:.2f} / {total_size / 1e9:.2f} GB "
                    f"({pct:.1f}%) - {speed / 1e6:.1f} MB/s - ETA {eta / 60:.0f}min",
                    end="", flush=True,
                )
    except Exception as e:
        print(f"\n\nDownload interrupted: {e}")
        print(f"Downloaded so far: {downloaded / 1e9:.2f} GB")
        print("Re-run this script to resume.")
        sys.exit(1)

    print(f"\n\nDownload complete: {downloaded / 1e9:.2f} GB")
    print(f"Saved to: {dest}")


if __name__ == "__main__":
    download_with_resume(URL, DEST)
