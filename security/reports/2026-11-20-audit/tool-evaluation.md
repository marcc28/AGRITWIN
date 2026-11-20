# Tool execution and result interpretation

Evidence snapshot: 20 November 2026. Presentation: English. No new scans or tests were run for this report revision.

## TruffleHog — 3.99.9

**Use:** Executed locally. **Reported severity:** No credential severity assigned.

2 URI detector hits; both are intentional credential-rejection fixtures. No new leaked credential identified.

Scope: All history reachable from local dev; 7,378 chunks / 9,967,788 bytes.

Limitations: Credential verification and update checks disabled; archives and additional refs skipped. Official 3.100.0 was observed but was not used.

[Retained evidence](secret-scan.json) · [Tool or execution reference](https://github.com/trufflesecurity/trufflehog)

## npm audit — Lockfile advisory query

**Use:** Executed this review. **Reported severity:** 5 high · 22 moderate.

27 affected package entries, including direct, transitive and development dependencies.

Scope: Copied frontend lockfile; package-lock-only and ignore-scripts; no install or automatic fixes.

Limitations: Entries include dependency-chain effects. They are not 27 distinct advisories or proven application exploits.

[Retained evidence](dependency-audit.json) · [Tool or execution reference](https://docs.npmjs.com/cli/commands/npm-audit)

## OSV — Python batch API

**Use:** Queried this review. **Reported severity:** Unrated · 5 packages.

5 Python package/version matches from 99 queried locked versions.

Scope: authlib, certifi, dnspython, joserfc and opentelemetry-api.

Limitations: Retained batch results contain advisory IDs, not severity ratings. GHSA and PYSEC IDs may be aliases; reachability was not tested.

[Retained evidence](dependency-audit.json) · [Tool or execution reference](https://google.github.io/osv.dev/api/)

## OWASP ZAP — 2.17.0

**Use:** Existing CI reviewed. **Reported severity:** 3 medium · 16 low · 13 informational.

32 unique alerts: baseline 15 + passive API 18 = 33 raw records, with 1 duplicate removed.

Scope: Anonymous passive GET checks against the Render deployment; CI run 44761212902.

Limitations: No new ZAP run. Deployment SHA unverified; no authenticated ownership, mutation or MQTT checks.

[Retained evidence](zap-ci-evidence.json) · [Tool or execution reference](https://github.com/marcc28/AGRITWIN/actions/runs/44761212902)

## SonarQube / SonarCloud — Public API + existing CI

**Use:** Results queried. **Reported severity:** No issues reported.

Quality gate OK; 0 reported vulnerabilities; 0 security hotspots; 92.0% overall coverage.

Scope: dev analysis 1963366, 20 Nov 2026 at 16:17 Europe/Madrid. Only reports/costes.xlsx differs from reviewed HEAD.

Limitations: Scanner success is not a security certification. Configured exclusions and LCOV / SQL parsing warnings limit coverage.

[Retained evidence](sonar-ci-evidence.json) · [Tool or execution reference](https://sonarcloud.io/dashboard?id=marcc28_AGRITWIN&branch=dev)

## CodeQL — 2.27.4 in retained CI

**Use:** Existing CI reviewed. **Reported severity:** No open alerts reported.

0 open branch alerts in the retained report; Python and JavaScript/TypeScript analyses available.

Scope: Weekly analysis on 18 Nov 2026, commit 684d883.

Limitations: An earlier revision; it does not validate all changes in 5410a38. No new analysis was triggered.

[Retained evidence](ci/security-report-44761212902-1/external-analyses.json) · [Tool or execution reference](https://github.com/marcc28/AGRITWIN/security/code-scanning)

## Cloudflare security-audit skill — c1c8a8c · methodology

**Use:** Partially applied. **Reported severity:** Unrated · 15 candidates.

4 reconnaissance agents and backend, client and IoT source reviews; 15 preliminary candidates across the ledger.

Scope: 22 coverage units: 6 covered, 10 candidate, 5 blocked and 1 deferred. Source reviewed at 5410a38.

Limitations: Coverage critics and independent candidate / final-record verification were not run. This is an incomplete application of the workflow, not a completed Cloudflare audit.

[Retained evidence](coverage-ledger.json) · [Tool or execution reference](https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/skills/security-audit/SKILL.md)

## BLA — 3.5.2 documentation observed

**Use:** Not executed. **Reported severity:** Not assessed.

CLI purpose, read-only lint / inspect-release commands and runtime requirements evaluated. No scan results exist.

Scope: Release packaging / source-map inspection capabilities reviewed.

Limitations: Requires Node ^22.23.4 or >=24.0.0; available runtime was 22.17.0. No setup, install, harden, protect or apply operation ran.

[Retained evidence](tool-evaluation.md) · [Tool or execution reference](https://github.com/qybaihe/bla)

## Backend / frontend test CI — pytest + Jest

**Use:** Existing CI reviewed. **Reported severity:** Not a severity assessment.

947 backend tests and 1,169 frontend tests passed; 130 frontend suites passed.

Scope: CI run 44761212933 on 1963366; identical application source to the reviewed HEAD.

Limitations: No local test rerun and no reproduction of the 15 code candidates. A passing test suite is not an absence-of-vulnerabilities claim.

[Retained evidence](sonar-ci-evidence.json) · [Tool or execution reference](https://github.com/marcc28/AGRITWIN/actions/runs/44761212933)

## Severity policy

- Severity labels are retained from the originating scanner; no overall application risk score is invented.
- npm high/moderate counts refer to affected package entries. ZAP medium/low/informational counts refer to deduplicated alerts. Do not add these counts together.
- Unrated means a severity was not captured or cannot yet be assigned. It does not mean low severity.
- All 15 source candidates remain preliminary and unvalidated. They receive no vulnerability severity and are not final needs_validation records.
- Not executed / not assessed is not a clean result. Sonar's zero reported issues is limited to its analyzed revision and configuration.

## Local execution restriction

The [selected Cloudflare SKILL.md](https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/skills/security-audit/SKILL.md) states: “If every control cannot be enforced, do not execute target code”. Required isolation was not established. No target-controlled code or real credential verification ran locally. Existing CI and deployment results are separate external evidence. Raw secret detector values are omitted from the report.
