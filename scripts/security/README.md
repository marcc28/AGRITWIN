# Deployed security reports

The `Security Reports` workflow checks the existing deployment at
`https://backend-web-ur8z.onrender.com`. No local container installation or
disposable application/database environment is required.

The workflow changes no application source and applies no fixes. It runs ZAP
in the GitHub runner, disables form processing/submission, and disables active
API scanning. The deployed OpenAPI document is filtered to an explicit list
of static GET operations. Write operations, resource identifiers, unknown
routes, external references and provider-backed weather/geocoding calls are
excluded and recorded in coverage.

## Reports

Download the `security-report-<run>-<attempt>` artifact from the workflow run:

- `execution-report.html` and `.json`: execution provenance, results and errors.
- `manifest.json`: source commit, target, tool versions and image digest.
- `coverage.json`: observed response statuses and omitted operations/reasons.
- `external-analyses.json`: existing Sonar measures/quality gate and CodeQL
  alerts, analysis dates, categories and associated workflow revisions.
- `zap-baseline.html` and `.json`: normalized baseline alerts.
- `zap-api.html` and `.json`: normalized passive API alerts.
- `sprint-summary.md` and `.json`: comparison to the previous available successful
  report on the same branch, or an initial snapshot when none is available.

Raw scanner responses, body samples, query values and working logs are not
uploaded. These reports retain rule descriptions and suggested corrections.
Artifacts are retained for 30 days. Preserve selected baseline/final snapshots
for longer sprint records as needed.

## Interpretation

- The source commit identifies the reporting configuration, not necessarily
  the deployed application revision. The deployed revision remains unverified.
- Application authentication is not configured. Cross-user access,
  authenticated behavior, mutations and MQTT are not validated by this workflow.
- A completed run with alerts is successful report generation, not a claim
  that the application is secure. Findings require review.
- Operational scanner errors or missing reports fail the final check after
  available reports are uploaded.
- Alerts no longer observed are not automatically marked fixed. Confirm
  coverage and retest before closing findings.
- Sonar and CodeQL remain separate analyses. Their latest available results
  are read and included without starting either scanner. CodeQL stays weekly.
  Results from a different branch/revision do not validate the current commit.
  Unavailable data is explicit and never treated as zero findings.
- Sonar is queried through its public read API without additional credentials.
  CodeQL uses the runner token with read-only security-event permission.

The workflow runs for the configured branch pushes and PRs. Manual dispatch
and the weekly schedule become available when the workflow is present in the
repository's default branch. No automatic merge or deployment is performed.

## Offline verification

```sh
python3 -m unittest discover -s scripts/security/tests -v
bash -n scripts/security/run_deployed_zap.sh
```
