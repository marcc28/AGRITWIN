"""Parent-owned preparation of isolated source-verification assignments."""
import json
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent
TARGET = OUT.parent.parent / "AGRITWIN"
SKILL = Path("/private/tmp/agritwin-security-tools/cloudflare/skills/security-audit")


def section(file, title):
    body = (SKILL / file).read_text()
    marks = list(re.finditer(r"^## (.+)$", body, re.M))
    for index, mark in enumerate(marks):
        if mark.group(1).split(" (")[0] == title:
            return body[mark.start():marks[index + 1].start() if index + 1 < len(marks) else len(body)]
    raise ValueError((file, title))


def main():
    ledger = json.loads((OUT / "coverage-ledger.json").read_text())
    candidates = json.loads((OUT / "candidates.json").read_text())
    validation = (SKILL / "VALIDATION-AND-REPORTING.md").read_text()
    method = re.search(r"#### Candidate-verifier prompt.*?```text\n(.*?)```", validation, re.S).group(1)
    promotion = re.search(r"Copy this promotion procedure.*?```text\n(.*?)```", validation, re.S).group(1)
    schema = (SKILL / "report-schema.json").read_text()
    assignments = []
    for index, candidate in enumerate(sorted(candidates, key=lambda c: c["fingerprint"]), 1):
        agent_id = f"verify_{index:02d}"
        scratch = OUT / "agents" / agent_id / "scratch"
        scratch.mkdir(parents=True, exist_ok=True)
        artifacts = scratch.parent / "artifacts"
        artifacts.mkdir(exist_ok=True)
        linked = [u for u in ledger if candidate["fingerprint"] in u["result_fingerprints"]]
        refs = sorted({b.split("#")[0] for u in linked for b in u["selected_companion_blocks"]})
        parts = [method, "Target: " + str(TARGET), (OUT / "architecture.md").read_text(), json.dumps(candidate, indent=2), json.dumps(linked, indent=2)]
        parts += [section(file, "Validation rules") for file in refs]
        parts += [promotion, schema, f"Your ID: {agent_id}. Only writable path: {scratch}. Artifacts are parent-owned at {artifacts}. Promotion allowlist is empty, zero bytes. No target execution is allowed because all sandbox controls are not established. No network, dependencies, live calls or delegation. Re-read current source, do not merely repeat candidate wording. Save exactly the response JSON to {scratch}/result.json and return it without prose. Do not read other verification results. Retain no severity for needs_validation. Prior findings.json files are empty; no prior final record exists for this fingerprint."]
        prompt = OUT / f"{agent_id}-prompt.md"
        prompt.write_text("\n\n".join(parts))
        assignments.append({"agent_id": agent_id, "fingerprint": candidate["fingerprint"], "prompt": str(prompt)})
    (OUT / "verification-assignments.json").write_text(json.dumps(assignments, indent=2) + "\n")
    print(json.dumps(assignments, indent=2))


if __name__ == "__main__":
    main()
