"""Compare two app_data.json files, ignoring the timestamp and float noise.

Usage: python scripts/check_reproducible.py <before.json> <after.json>
Exits 1 and lists the differing paths if any value differs beyond a relative
tolerance of 1e-6 (BLAS/OS differences change only the last digits of floats).
"""
import json
import math
import sys

REL_TOL = 1e-6


def diff(a, b, path="$"):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k == "generated_at" and path == "$":
                continue
            if k not in a or k not in b:
                yield f"{path}.{k}: missing on one side"
            else:
                yield from diff(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            yield f"{path}: length {len(a)} != {len(b)}"
        for i, (x, y) in enumerate(zip(a, b)):
            yield from diff(x, y, f"{path}[{i}]")
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        if not math.isclose(a, b, rel_tol=REL_TOL, abs_tol=1e-9):
            yield f"{path}: {a} != {b}"
    elif a != b:
        yield f"{path}: {a!r} != {b!r}"


if __name__ == "__main__":
    before, after = (json.load(open(p, encoding="utf-8")) for p in sys.argv[1:3])
    problems = list(diff(before, after))
    for p in problems[:50]:
        print(p)
    if problems:
        sys.exit(f"{len(problems)} difference(s): app_data.json is not reproducible")
    print("app_data.json reproducible")
