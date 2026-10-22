"""Summarize retained paired-comparison.cjs CLI output without changing its data."""
import argparse
import datetime
import json
import pathlib
import statistics

parser = argparse.ArgumentParser()
parser.add_argument("input", type=pathlib.Path)
parser.add_argument("--output-prefix", type=pathlib.Path, required=True)
args = parser.parse_args()
source = args.input.read_text(encoding="utf-8-sig")
raw_line = next((line for line in source.splitlines() if line.startswith('{"baseline":')), None)
if raw_line is None:
    raise SystemExit("No completed paired result found; preserve CLI output and inspect its error.")
raw = json.loads(raw_line)
rows = raw["results"]
if len(rows) != 12:
    raise SystemExit(f"Expected 12 completed runs, got {len(rows)}.")

def median(group, value):
    return round(statistics.median(value(row) for row in group), 1)

summary = []
transfer = []
for scenario in ("desktop", "phone-constrained"):
    for version in ("R5", "R6"):
        group = [row for row in rows if row["scenario"] == scenario and row["version"] == version]
        if len(group) != 3 or {row["pair"] for row in group} != {1, 2, 3}:
            raise SystemExit(f"Incomplete paired group: {scenario}/{version}")
        summary.append({
            "scenario": scenario, "version": version, "n": len(group),
            "fcpMs": median(group, lambda row: next(p["start"] for p in row["paints"] if p["name"] == "first-contentful-paint")),
            "acceptedFramePaintOpportunityMs": median(group, lambda row: row["marks"]["acceptedFramePaintOpportunity"]),
            "acceptedFrameKind": group[0]["firstAcceptedKind"],
            "liveMaterialDrawMs": median(group, lambda row: row["marks"]["liveMaterialDraw"]),
            "firstReadyInputToGrowthMs": median(group, lambda row: row["clicks"]["first"]["firstGrowth"] - row["clicks"]["first"]["pointerdown"]),
            "firstReadyInputToMaterialMs": median(group, lambda row: row["clicks"]["first"]["firstMaterial"] - row["clicks"]["first"]["pointerdown"]),
            "warmInputToGrowthMs": median(group, lambda row: row["clicks"]["warm"]["firstGrowth"] - row["clicks"]["warm"]["pointerdown"]),
            "linkStatusBlockingMs": median(group, lambda row: sum(q["duration"] for q in row["gl"] if q["method"] == "getProgramParameter" and q.get("param") == 35714)),
            "allStatusQueryMs": median(group, lambda row: sum(q["duration"] for q in row["gl"] if q["method"] == "getProgramParameter")),
            "maxLongTaskMs": median(group, lambda row: max([task["duration"] for task in row["longtasks"]] + [0])),
        })
        first = group[0]
        transfer.append({
            "scenario": scenario, "version": version, "samplePair": first["pair"],
            "navigation": first["navigation"],
            "resources": [{key: resource.get(key) for key in ("name", "type", "transfer", "encoded", "decoded")} for resource in first["resources"] if resource["name"]],
            "documentAndResourcesEncodedBytesMedian": median(group, lambda row: row["navigation"]["encoded"] + sum(resource["encoded"] for resource in row["resources"])),
            "documentAndResourcesDecodedBytesMedian": median(group, lambda row: row["navigation"]["decoded"] + sum(resource["decoded"] for resource in row["resources"])),
            "resourceTransferBytesMedian": median(group, lambda row: sum(resource["transfer"] for resource in row["resources"])),
        })

result = {
    "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "measurementCompletedAt": raw["createdAt"], "baseline": raw["baseline"], "candidate": raw["candidate"],
    "protocol": raw["protocol"], "summary": summary, "actualResourceTimingBytes": transfer,
    "errors": [error for row in rows for error in row["errors"]],
    "limits": [
        "N=3 paired samples per version/condition; medians are descriptive for this run.",
        "R6 exact static material frame is separate from first live material draw and engine readiness.",
        "First/warm input tests wait for live readiness; pre-main activation is covered by separate startup/gesture tests.",
        "Double requestAnimationFrame marks a paint opportunity, not GPU completion.",
        "Fresh HTTP-cache-disabled contexts do not guarantee a cold shared GPU/driver shader cache.",
        "ResourceTiming encoded/decoded sizes are actual browser-observed body byte counts. They do not identify gzip versus Brotli without response-header evidence; transferSize also includes transport accounting.",
        "Synthetic CPU/network conditions do not establish physical iPhone/iPad/Safari/Combo Touch latency or power use.",
    ],
}
raw_path = args.output_prefix.with_suffix(".json")
summary_path = args.output_prefix.with_name(args.output_prefix.name + "-summary").with_suffix(".json")
raw_path.write_text(json.dumps(raw, indent=2), encoding="utf-8")
summary_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps({"raw": str(raw_path), "summary": str(summary_path), "runs": len(rows), "errors": len(result["errors"]), "metrics": summary}, indent=2))
