"""Validate delegated source results and update parent-owned audit state."""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
SKILL = Path("/private/tmp/agritwin-security-tools/cloudflare/skills/security-audit")


def main():
    ledger = json.loads((OUT / "coverage-ledger.json").read_text())
    candidates = {}
    uncovered = []
    seen = set()
    for owner in ["parent", "hunt_backend", "hunt_client", "hunt_iot"]:
        path = OUT / "parent-result.json" if owner == "parent" else OUT / "agents" / owner / "scratch/result.json"
        result = json.loads(path.read_text())
        for item in result["units"]:
            cid = item["coverage_id"]
            assert cid not in seen, "duplicate unit"
            seen.add(cid)
            unit = next(u for u in ledger if u["coverage_id"] == cid)
            assert unit["assigned_owner"] == owner
            assert item["disposition"] in ["covered", "blocked", "candidate"]
            for check in item["checks"]:
                assert check["agent_id"] == owner
                assert check["method"] == "source" and check["artifact"] is None
            assert set(item["reviewed_paths"]) == {p for c in item["checks"] for p in c["reviewed_paths"]}
            unit.update(status=item["disposition"], agent_id=owner, reviewed_paths=item["reviewed_paths"], local_checks=item["checks"], result_fingerprints=item["candidate_fingerprints"], unresolved=item["unresolved"], hardening=result["hardening"])
        for candidate in result["candidates"]:
            fp = candidate["fingerprint"]
            if fp in candidates:
                assert candidates[fp] == candidate, "different candidates share fingerprint"
            candidates[fp] = candidate
        uncovered += result["uncovered"]
    assert seen == {u["coverage_id"] for u in ledger}, "missing unit"
    assert set(candidates) == {f for u in ledger for f in u["result_fingerprints"]}
    (OUT / "coverage-ledger.json").write_text(json.dumps(ledger, indent=2) + "\n")
    (OUT / "candidates.json").write_text(json.dumps(sorted(candidates.values(), key=lambda c: c["fingerprint"]), indent=2) + "\n")
    (OUT / "uncovered.json").write_text(json.dumps(uncovered, indent=2) + "\n")
    critic = [
        "You are a fresh post-wave coverage critic. Read current source only; no writes, target execution, network or delegation. Check coverage, not findings. Do not invent a clean pass when blockers or gaps remain.",
        (OUT / "architecture.md").read_text(),
        json.dumps(ledger, indent=2),
        "Current candidate fingerprints: " + json.dumps(sorted(candidates)),
        "Hunter-proposed gaps: " + json.dumps(uncovered, indent=2),
        "Prior coverage: general run 421e90d incomplete (14 preliminary candidates, no final records); quick delta 4e8be50 reviewed changed forms/geocoding/cron, other units outside scope. Both ledgers source-compared; no prior confirmed exclusions. Prior paths are in run-metadata.json. Inspect whether any unresolved old lead lacks a current unit, and check changed source since4e8be50.",
        (SKILL / "HUNTING.md").read_text().split("## Coverage-critic waves", 1)[1],
        f"Target: {OUT.parent.parent / 'AGRITWIN'}. Return exactly the required JSON object. Save same JSON to {OUT}/agents/critic_wave/scratch/result.json. Your scratch is your only writable directory; artifacts parent-owned, promotion allowlist empty. Source-only limitation is explicit: effective deployment and missing runtime observations remain blockers, not a reason to fake source coverage. Return source-backed reasoning in each missing unit."
    ]
    (OUT / "critic-wave-prompt.md").write_text("\n\n".join(critic))
    print(json.dumps({"units": len(ledger), "candidates": len(candidates), "uncovered": len(uncovered)}))


if __name__ == "__main__":
    main()
