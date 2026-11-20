# AGRITWIN security audit — tools, results and severity

**Baseline snapshot before remediation.** See the [current fixes and regression results](../../remediation/2026-11-20/REPORT.html). Counts below retain the original scanner results.

Evidence snapshot: **20 November 2026**, Europe/Madrid. Branch: `security/dev-review-5410a38`. Reviewed commit: `5410a38fb8034cafd0374aef65761d8c9b069e21`. The security branch matched origin/dev at the audit fetch: **0 commits ahead, 0 behind**.

**FINALIZED REPORT — INDEPENDENT VALIDATION INCOMPLETE.** There are 15 preliminary code candidates. Coverage critics and independent candidate/final-record verification were not completed. No application vulnerability was confirmed by this review, and findings.json contains no final records. This does not establish that the application is secure. The English presentation adds no new scan, test or vulnerability verdict.

## Tools used, execution status and results

| Tool / version | Actual use | Result | Severity | Scope and limitation |
| --- | --- | --- | --- | --- |
| [TruffleHog](https://github.com/trufflesecurity/trufflehog) — 3.99.9 | Executed locally | 2 URI detector hits; both are intentional credential-rejection fixtures. No new leaked credential identified. | **No credential severity assigned** | All history reachable from local dev; 7,378 chunks / 9,967,788 bytes. Credential verification and update checks disabled; archives and additional refs skipped. Official 3.100.0 was observed but was not used. [Evidence](secret-scan.json) |
| [npm audit](https://docs.npmjs.com/cli/commands/npm-audit) — Lockfile advisory query | Executed this review | 27 affected package entries, including direct, transitive and development dependencies. | **5 high · 22 moderate** | Copied frontend lockfile; package-lock-only and ignore-scripts; no install or automatic fixes. Entries include dependency-chain effects. They are not 27 distinct advisories or proven application exploits. [Evidence](dependency-audit.json) |
| [OSV](https://google.github.io/osv.dev/api/) — Python batch API | Queried this review | 5 Python package/version matches from 99 queried locked versions. | **Unrated · 5 packages** | authlib, certifi, dnspython, joserfc and opentelemetry-api. Retained batch results contain advisory IDs, not severity ratings. GHSA and PYSEC IDs may be aliases; reachability was not tested. [Evidence](dependency-audit.json) |
| [OWASP ZAP](https://github.com/marcc28/AGRITWIN/actions/runs/44761212902) — 2.17.0 | Existing CI reviewed | 32 unique alerts: baseline 15 + passive API 18 = 33 raw records, with 1 duplicate removed. | **3 medium · 16 low · 13 informational** | Anonymous passive GET checks against the Render deployment; CI run 44761212902. No new ZAP run. Deployment SHA unverified; no authenticated ownership, mutation or MQTT checks. [Evidence](zap-ci-evidence.json) |
| [SonarQube / SonarCloud](https://sonarcloud.io/dashboard?id=marcc28_AGRITWIN&branch=dev) — Public API + existing CI | Results queried | Quality gate OK; 0 reported vulnerabilities; 0 security hotspots; 92.0% overall coverage. | **No issues reported** | dev analysis 1963366, 20 Nov 2026 at 16:17 Europe/Madrid. Only reports/costes.xlsx differs from reviewed HEAD. Scanner success is not a security certification. Configured exclusions and LCOV / SQL parsing warnings limit coverage. [Evidence](sonar-ci-evidence.json) |
| [CodeQL](https://github.com/marcc28/AGRITWIN/security/code-scanning) — 2.27.4 in retained CI | Existing CI reviewed | 0 open branch alerts in the retained report; Python and JavaScript/TypeScript analyses available. | **No open alerts reported** | Weekly analysis on 18 Nov 2026, commit 684d883. An earlier revision; it does not validate all changes in 5410a38. No new analysis was triggered. [Evidence](ci/security-report-44761212902-1/external-analyses.json) |
| [Cloudflare security-audit skill](https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/skills/security-audit/SKILL.md) — c1c8a8c · methodology | Partially applied | 4 reconnaissance agents and backend, client and IoT source reviews; 15 preliminary candidates across the ledger. | **Unrated · 15 candidates** | 22 coverage units: 6 covered, 10 candidate, 5 blocked and 1 deferred. Source reviewed at 5410a38. Coverage critics and independent candidate / final-record verification were not run. This is an incomplete application of the workflow, not a completed Cloudflare audit. [Evidence](coverage-ledger.json) |
| [BLA](https://github.com/qybaihe/bla) — 3.5.2 documentation observed | Not executed | CLI purpose, read-only lint / inspect-release commands and runtime requirements evaluated. No scan results exist. | **Not assessed** | Release packaging / source-map inspection capabilities reviewed. Requires Node ^22.23.4 or >=24.0.0; available runtime was 22.17.0. No setup, install, harden, protect or apply operation ran. [Evidence](tool-evaluation.md) |
| [Backend / frontend test CI](https://github.com/marcc28/AGRITWIN/actions/runs/44761212933) — pytest + Jest | Existing CI reviewed | 947 backend tests and 1,169 frontend tests passed; 130 frontend suites passed. | **Not a severity assessment** | CI run 44761212933 on 1963366; identical application source to the reviewed HEAD. No local test rerun and no reproduction of the 15 code candidates. A passing test suite is not an absence-of-vulnerabilities claim. [Evidence](sonar-ci-evidence.json) |

## How to read severity

- Severity labels are retained from the originating scanner; no overall application risk score is invented.
- npm high/moderate counts refer to affected package entries. ZAP medium/low/informational counts refer to deduplicated alerts. Do not add these counts together.
- Unrated means a severity was not captured or cannot yet be assigned. It does not mean low severity.
- All 15 source candidates remain preliminary and unvalidated. They receive no vulnerability severity and are not final needs_validation records.
- Not executed / not assessed is not a clean result. Sonar's zero reported issues is limited to its analyzed revision and configuration.

## OWASP ZAP — deduplicated deployment alerts

15 baseline + 18 passive API = 33 raw records; 1 duplicate removed, leaving **32 unique alerts: 3 medium, 16 low and 13 informational**. No high or critical alerts were reported within this passive scan. The deployed revision is unverified.

| Severity | Rule | Alert | Unique alerts | Response paths |
| --- | --- | --- | --- | --- |
| Medium | 10020 | Missing Anti-clickjacking Header | 1 | /docs |
| Medium | 10038 | Content Security Policy (CSP) Header Not Set | 1 | /docs |
| Medium | 90003 | Sub Resource Integrity Attribute Missing | 1 | /docs |
| Low | 10017 | Cross-Domain JavaScript Source File Inclusion | 1 | /docs |
| Low | 10021 | X-Content-Type-Options Header Missing | 6 | /api/v1/anunces, /api/v1/conte_mercat, /api/v1/legal/privacy, /api/v1/legal/security, /api/v1/user_profile, /docs |
| Low | 10063 | Permissions Policy Header Not Set | 1 | /docs |
| Low | 90004 | Cross-Origin-Embedder-Policy Header Missing or Invalid | 1 | /docs |
| Low | 90004 | Cross-Origin-Opener-Policy Header Missing or Invalid | 1 | /docs |
| Low | 90004 | Cross-Origin-Resource-Policy Header Missing or Invalid | 6 | /api/v1/anunces, /api/v1/conte_mercat, /api/v1/legal/privacy, /api/v1/legal/security, /api/v1/user_profile, /docs |
| Informational | 100000 | A Client Error response code was returned by the server | 3 | /api/v1/dashboard, /api/v1/fields, /api/v1/me |
| Informational | 10049 | Non-Storable Content | 9 | /, /api/v1/anunces, /api/v1/conte_mercat, /api/v1/dashboard, /api/v1/fields, /api/v1/legal/privacy, /docs, /robots.txt, /sitemap.xml |
| Informational | 10109 | Modern Web Application | 1 | /docs |

## npm audit — affected package entries

**5 high and 22 moderate; 0 critical.** These are package entries, including inherited ratings and development tools. Locked versions were compared to the retained lockfile hash. Review dependency chains and compatibility before remediation.

| Severity | Package | Locked versions | Relationship |
| --- | --- | --- | --- |
| High | `@expo/cli` | 55.0.37 | Transitive |
| High | `decode-uri-component` | 0.2.2 | Transitive |
| High | `expo-router` | 55.0.18 | Direct |
| High | `query-string` | 7.1.3 | Transitive |
| High | `zod` | 3.25.76 | Transitive |
| Moderate | `@expo/config` | 55.0.21 | Transitive |
| Moderate | `@expo/config-plugins` | 55.0.12 | Transitive |
| Moderate | `@expo/fingerprint` | 0.16.8 | Transitive |
| Moderate | `@expo/local-build-cache-provider` | 55.0.16 | Transitive |
| Moderate | `@expo/metro-config` | 55.0.27 | Transitive |
| Moderate | `@expo/prebuild-config` | 55.0.22 | Transitive |
| Moderate | `@typescript-eslint/eslint-plugin` | 8.71.2 | Direct |
| Moderate | `@typescript-eslint/parser` | 8.71.2 | Direct |
| Moderate | `@typescript-eslint/type-utils` | 8.71.2 | Transitive |
| Moderate | `@typescript-eslint/typescript-estree` | 8.71.2 | Transitive |
| Moderate | `@typescript-eslint/utils` | 8.71.2 | Transitive |
| Moderate | `@wix-pilot/detox` | 1.0.13 | Transitive |
| Moderate | `bunyamin` | 1.6.3 | Transitive |
| Moderate | `detox` | 20.51.4 | Direct |
| Moderate | `expo` | 55.0.32 | Direct |
| Moderate | `expo-splash-screen` | 55.0.25 | Direct |
| Moderate | `fast-uri` | 3.1.8 | Transitive |
| Moderate | `glob` | 13.0.6, 13.0.7 | Transitive |
| Moderate | `jest-environment-emit` | 1.2.0 | Transitive |
| Moderate | `jest-expo` | 55.0.22 | Direct |
| Moderate | `minimatch` | 10.2.6 | Transitive |
| Moderate | `stream-json` | 1.9.1 | Transitive |

## OSV — Python package/version matches

**5 matched packages from 99 queried versions. All Unrated in this report**: the retained batch response has advisory IDs but no severity values. GHSA/PYSEC IDs may be aliases of the same issue.

| Severity | Package | Version | Advisory IDs |
| --- | --- | --- | --- |
| Unrated | `authlib` | 1.8.0 | GHSA-6v38-4h7w-rj9h, GHSA-7vr2-2fgp-9w7p, GHSA-8m4g-j4wp-wgcg, GHSA-c5mf-xmp2-59rc, GHSA-c73q-w75p-j82v, GHSA-fch4-3c6x-j4gc, GHSA-q686-2qmg-hqc7, GHSA-x4rv-c3wx-4cr8, PYSEC-2026-4355, PYSEC-2026-4356, PYSEC-2026-4357, PYSEC-2026-4358, PYSEC-2026-4359, PYSEC-2026-4360 |
| Unrated | `certifi` | 2026.7.22 | GHSA-6q48-6c7w-9gw2, PYSEC-2026-4320 |
| Unrated | `dnspython` | 2.8.0 | GHSA-45c3-73f7-pv4m, GHSA-vvf4-9x63-8xvv |
| Unrated | `joserfc` | 1.7.5 | GHSA-9pg5-8c7x-5hfx |
| Unrated | `opentelemetry-api` | 1.45.1 | GHSA-mf5v-w3w3-f6cg |

## Preliminary code candidates — not independently validated

Every entry below is **Unrated**, may be a false positive and requires the exact unresolved facts listed in [NEEDS-VALIDATION.md](NEEDS-VALIDATION.md). These are not final needs_validation records or confirmed vulnerabilities.

| ID | Severity | Candidate | Initial source reference | Validation status |
| --- | --- | --- | --- | --- |
| C01 | Unrated | An unsolicited native callback can adopt another user's social-login ticket | `agritwin-app/src/app/auth/oauth-callback.tsx:24` | Pending independent validation |
| C02 | Unrated | A pending account A mutation can be retried with account B's token | `agritwin-app/src/services/api.ts:252` | Pending independent validation |
| C03 | Unrated | A late refresh can restore a previous account after logout or account replacement | `agritwin-app/src/services/auth.ts:129` | Pending independent validation |
| C04 | Unrated | Provisioning releases Wi-Fi credentials to a self-identified BLE peer | `agritwin-app/src/services/bleProvisioning.ts:198` | Pending independent validation |
| C05 | Unrated | A late garden response can be persisted under the next user's cache key | `agritwin-app/src/services/gardenPicker.ts:100` | Pending independent validation |
| C06 | Unrated | Anonymous news deletion lacks publication authority | `backend/api/v1/anunces.py:135` | Pending independent validation |
| C07 | Unrated | Reset JWT can cross from the email namespace into another account username | `backend/api/v1/forgot_password.py:222` | Pending independent validation |
| C08 | Unrated | Any authenticated user can modify the shared crop catalog | `backend/api/v1/crops.py:72` | Pending independent validation |
| C09 | Unrated | Public market reads can invoke operator-funded Gemini translation | `backend/api/v1/content_market.py:117` | Pending independent validation |
| C10 | Unrated | Unregistered MQTT identities can remain in the monitor indefinitely | `backend/services/mqtt_subscriber.py:34` | Pending independent validation |
| C11 | Unrated | MQTT payload identity can select another device’s telemetry and online status | `backend/services/mqtt_subscriber.py:24` | Pending independent validation |
| C12 | Unrated | Malformed message errors can escape the shared MQTT callback | `backend/services/mqtt_subscriber.py:30` | Pending independent validation |
| C13 | Unrated | Per-field AI claims do not bound one account's aggregate scheduled inference | `backend/api/v1/fields.py:228` | Pending independent validation |
| C14 | Unrated | Anonymous user listing serializes account email addresses | `backend/api/v1/user.py:34` | Pending independent validation |
| C15 | Unrated | Issue titles can reach cost reports as spreadsheet formulas | `scripts/generate_costs_csv.py:215` | Pending independent validation |

## Evidence provenance

- **ZAP:** existing CI run [44761212902](https://github.com/marcc28/AGRITWIN/actions/runs/44761212902); anonymous passive GET only, no new scan. Deployed SHA not established.
- **Sonar and regression CI:** [44761212933](https://github.com/marcc28/AGRITWIN/actions/runs/44761212933), analyzed revision `1963366877d4c58052842db6415c81e21ae98bca`. Only `reports/costes.xlsx` differs from the reviewed HEAD. Sonar analysis time: 20 Nov 2026 at 16:17 Europe/Madrid. Gate OK; 92.0% overall coverage; 0 reported vulnerabilities/hotspots. Warnings concern excluded layouts/unresolved LCOV, assets parsed as text, migration parsing and unset Python version.
- **CodeQL:** existing weekly analysis dated 18 Nov at `684d883`; 0 open alerts in the retained report. It does not establish coverage of the newer HEAD.
- **TruffleHog:** new local static history scan, 3.99.9, no external credential verification. Both hits were source-triaged as deliberate URI fixtures. Official 3.100.0 was observed but not executed.
- **BLA:** documentation only, version 3.5.2 observed. No scan result; runtime mismatch: Node 22.17.0 available vs ^22.23.4 or >=24.0.0 required.

## Coverage and completion limits

Profile: standard. No strict agent budget was requested. Four reconnaissance agents and backend/client/IoT source reviewers contributed. The initial client agent was automatically blocked; a replacement defensive source reviewer completed that source assignment. Prior ledgers contained no final verified findings; prior leads were not promoted by age.

**22 units: 6 covered, 10 candidate, 5 blocked and 1 deferred.** The deferred unit is the public-market translation admission boundary. Candidate units can link multiple proposals. Covered refers only to the recorded source invariant, not runtime behavior. Coverage critics and independent candidate verification were not completed, so no clean-coverage or exhaustive-audit claim is made.

The official validators passed for the ledger and the empty final findings array. They validate format, not security conclusions. Source checks have artifact:null; no target execution artifact is claimed.

No local target-controlled tests, imports, builds, browsers/emulators, brokers, providers or real devices ran. The selected [Cloudflare SKILL.md](https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/skills/security-audit/SKILL.md) requires: “If every control cannot be enforced, do not execute target code”. Complete filesystem/credential isolation, isolated networking and combined CPU/memory/process/disk controls were not established. Existing CI is external evidence identified by date and revision.

Outstanding facts include deployed digest/SHA, broker activation and ACLs, RLS/IAM, shipped pairing/firmware, editorial/privacy authority, provider budgets and asynchronous session behavior.

## Recommended validation and remediation order

1. Validate identity and credential boundaries with isolated dummy fixtures: JWT purpose/subject separation, native callback correlation and late refresh handling.
2. Validate account/device isolation: pending-request retries, garden cache writes, message identity binding and BLE recipient proof.
3. Confirm intended directory, catalog and news publication authority before classifying public/shared behavior as unauthorized.
4. Confirm aggregate AI/translation budgets, cache and admission rules while preserving per-field claims and concurrency controls.
5. Review dependency advisories and Expo/toolchain compatibility. Avoid unreviewed npm audit fix --force upgrades or downgrades.
6. Triage ZAP headers and resource rules on the affected HTML/JSON responses; preserve intentional no-store and expected 401 behavior.
7. Bind future reports to a deployed SHA/digest and review Sonar coverage exclusions/warnings.

This is a validation order, not a severity classification of unvalidated candidates.

## Unvalidated candidate-to-coverage mapping

| Candidate | Fingerprint | Coverage unit(s) |
| --- | --- | --- |
| C01 | `agritwin-app/src/app/auth/oauth-callback.tsx:unbound_native_ticket` | `agritwin-app%2Fsrc%2Fapp%2Fauth%2Foauth-callback.tsx%23links::agritwin-app%2Fsrc%2Fcomponents%2Ffield-location%2FMapCanvas.tsx%23bridge::agritwin-app%2Frendering::ATTACK-CLASSES.md%23Injection` |
| C02 | `agritwin-app/src/services/auth.ts:authenticatedFetch_cross_account_retry` | `agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23session::agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23clearAuth::agritwin-app%2Fsession::ATTACK-CLASSES.md%23Access%20control` |
| C03 | `agritwin-app/src/services/auth.ts:refreshAuth_late_session_commit` | `agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23session::agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23clearAuth::agritwin-app%2Fsession::ATTACK-CLASSES.md%23Access%20control` |
| C04 | `agritwin-app/src/services/bleProvisioning.ts:sendWifiSettings:unverified-credential-recipient` | `iot%2Ffirmware%2Fagritwin_esp32%2Fprovisioning.cpp%23BLE::iot%2Ffirmware%2Fagritwin_esp32%2Fprovisioning.cpp%23provisioningBegin::iot%2Fprovisioning::ATTACK-CLASSES.md%23Cryptography%20and%20secrets` |
| C05 | `agritwin-app/src/services/gardenPicker.ts:late_response_current_account_cache_key` | `agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23session::agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23clearAuth::agritwin-app%2Fsession::ATTACK-CLASSES.md%23Access%20control` |
| C06 | `backend/anunces/anonymous-shared-delete` | `backend%2Fmain.py%23public-api::backend%2Fapi%2Fv1%2Fuser.py%23router::backend%2Fshared-content::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage` |
| C07 | `backend/auth/reset-jwt-as-bearer` | `backend%2Fapi%2Fv1%2Fauth.py%23identity-lifecycle::backend%2Fapi%2Fv1%2Fauth.py%23get_current_user::backend%2Fauth::ATTACK-CLASSES.md%23Access%20control` |
| C08 | `backend/crops/shared-catalog-write-authority` | `backend%2Fmain.py%23owned-api::backend%2Fapi%2Fv1%2Ffields.py%23_require_owned_field::backend%2Fagricultural-data::ATTACK-CLASSES.md%23Access%20control` |
| C09 | `backend/market/anonymous-translation-budget` | `backend%2Fmain.py%23provider-work::backend%2Fapi%2Fv1%2Ftasks.py%23verify_cron_secret::backend%2Fprovider-work::ATTACK-CLASSES.md%23Business%20logic` |
| C10 | `backend/services/device_status_monitor.py:register_message:unbounded-identity-retention` | `backend%2Fservices%2Fmqtt_subscriber.py%23telemetry::backend%2Fdb%2Fdatabase.py%23save_telemetry::iot%2Ftelemetry::ATTACK-CLASSES.md%23Resource%20and%20file%20handling` |
| C11 | `backend/services/mqtt_subscriber.py:on_message:unbound-device-authority` | `backend%2Fservices%2Fmqtt_subscriber.py%23on_message::backend%2Fservices%2Fmqtt_subscriber.py%23start_mqtt::iot%2Fmessages::ATTACK-CLASSES.md%23Access%20control` |
| C12 | `backend/services/mqtt_subscriber.py:on_message:uncontained-message-errors` | `backend%2Fservices%2Fmqtt_subscriber.py%23telemetry::backend%2Fdb%2Fdatabase.py%23save_telemetry::iot%2Ftelemetry::ATTACK-CLASSES.md%23Resource%20and%20file%20handling` |
| C13 | `backend/tasks/aggregate-inference-budget` | `backend%2Fmain.py%23provider-work::backend%2Fapi%2Fv1%2Ftasks.py%23verify_cron_secret::backend%2Fprovider-work::ATTACK-CLASSES.md%23Business%20logic` |
| C14 | `backend/users/anonymous-email-directory` | `backend%2Fmain.py%23public-api::backend%2Fapi%2Fv1%2Fuser.py%23router::backend%2Fshared-content::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage` |
| C15 | `scripts/generate_costs_csv.py:write_xlsx:issue-title-as-formula` | `.github%2Fworkflows%2Fgenerate-costs-csv.yml%23issues::scripts%2Fgenerate_costs_csv.py%23write_csv-write_xlsx::repository%2Freport-automation::ATTACK-CLASSES.md%23Injection` |

## Files

- [Audit metadata](run-metadata.json)
- [TruffleHog output summary](secret-scan.json)
- [npm / OSV response](dependency-audit.json)
- [ZAP scan provenance](zap-ci-evidence.json)
- [Current Sonar evidence](sonar-ci-evidence.json)
- [Coverage ledger](coverage-ledger.json)
- [Preliminary candidates](candidates.json)
- [Final findings (empty)](findings.json)
- [English detailed notes](NEEDS-VALIDATION.md)
- [English tool notes](tool-evaluation.md)
- [English architecture](architecture.md)
- [English Markdown report](REPORT.md)

Original scanner/agent evidence is retained unchanged. Human-facing report documents are in English; repository paths and identifiers preserve their original spelling. Application source is unchanged.
