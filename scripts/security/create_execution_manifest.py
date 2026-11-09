"""Record security review provenance without importing the application."""

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def main():
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        text=True,
    ).strip()

    report = {
        "schema_version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "commit": commit,
        "repository": os.getenv("GITHUB_REPOSITORY"),
        "event": os.getenv("GITHUB_EVENT_NAME", "local"),
        "run_id": os.getenv("GITHUB_RUN_ID"),
        "run_attempt": os.getenv("GITHUB_RUN_ATTEMPT"),
        "execution_status": "initialized",
        "checks": {
            "environment_setup": "not_run",
            "zap_baseline": "not_run",
            "zap_api": "not_run",
            "authorization_tests": "not_run",
        },
    }

    output = Path("reports/security/manifest.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Execution manifest saved to {output}")


if __name__ == "__main__":
    main()
