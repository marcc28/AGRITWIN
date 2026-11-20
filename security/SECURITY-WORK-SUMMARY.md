# [IOT] Secure the MQTT broker

Reviewed the ESP32 publisher, MQTT subscriber, device-status monitor and telemetry identity boundaries. The audit retains preliminary concerns about topic/payload identity, unknown device identifiers, malformed messages and retained monitor state. Earlier bounded probes used in-memory persistence stubs; they did not establish successful writes to a real database or a successful broker attack.

**Broker hardening is still pending.** Current source defaults to `broker.hivemq.com:1883` and the ESP32 uses `WiFiClient`. This work has not deployed TLS, authenticated device connections or broker topic ACLs. A production rollout requires a controlled broker, certificate verification, separate device credentials, publish/subscribe rules scoped to each device/field, and negative integration tests with unauthorized clients. Broker configuration, firmware provisioning and certificate rotation need coordinated implementation and verification; they must not be described as completed security measures.

# [BACK] Protect the API and the user data

Implemented the fixes for the three medium OWASP ZAP findings on API documentation: a restrictive Content Security Policy with fresh per-response nonces, protection against framing through CSP and `X-Frame-Options: DENY`, and pinned same-origin JavaScript/CSS with SHA-384 integrity checks. Added `X-Content-Type-Options: nosniff` to the backend middleware. Swagger and ReDoc assets retain their original upstream bytes, licenses and checksum provenance.

Updated the affected frontend dependency implementations while retaining Expo SDK 55 and the current application workflows. The post-remediation npm audit reports zero vulnerabilities, replacing the baseline five high and 22 moderate affected package entries. Compatibility adapters preserve the CommonJS interfaces used by existing consumers; source, licenses, integrity metadata and regression checks are retained.

Authentication, session handling, API payloads and CORS policy were preserved. Regression checks cover an unauthenticated protected request returning 401, allowed CORS preflight, schema availability and existing GET/HEAD ping behavior. No database authorization policy, production credential rotation or RLS change was made. The 15 preliminary source candidates and five unrated Python advisory matches remain pending independent validation.

# [TEST] Test the security of the platform

The remediation backend suite passed 956 tests, including nine new security regressions. The full suite also passed when repeated with the lockfile-pinned FastAPI 0.143.0 and Starlette 1.7.0 wheels after hash verification. The original remediation frontend run passed 1,169 tests across 130 suites. After the requested UI changes, the frontend suite passed 1,173 tests across the same 130 suites. These UI regression results are recorded separately in [the UI verification directory](verification/2026-11-20-ui/), so dated results are not silently overwritten.

Added consumer-level checks for URL decoding, Expo schema validation, JSON streams, prototype safety, glob cancellation, ignore matching and URI/schema resolution. These checks run after dependency installation in frontend-test and Sonar workflows. TypeScript, lint, Android export and browser checks provide additional compatibility evidence, rather than a security certification.

Tool outcomes are distinguished explicitly: TruffleHog was executed in the original audit and reported only intentional rejection fixtures; npm audit was queried again after remediation; existing OWASP ZAP, SonarCloud and CodeQL results were reviewed. The Cloudflare security-audit methodology was applied partially with agents; independent verification was not completed. BLA was evaluated but not executed. No new production ZAP/Sonar run, real MQTT broker test or native-device integration result is claimed.

# [DOC] Documentation of the process and results

Consolidated the current audit, remediation evidence and security notes under `security/`, with an English index in [README.md](README.md). The [original audit](reports/2026-11-20-audit/REPORT.html) remains a baseline snapshot; its scanner counts and raw evidence are preserved. A prominent link points readers to [the subsequent remediation report](remediation/2026-11-20/REPORT.html), preventing old findings from being confused with the current local fix status.

The reports identify the reviewed commit and security branch, synchronization with `origin/dev`, tool versions, actual execution status, scope, severity source, findings, fixes and limitations. Tables distinguish npm affected dependency entries from deduplicated ZAP alerts, preliminary code candidates and unrated Python matches. Unrated items are not classified as low risk; a tool that was not run is not given a clean result.

Retained evidence includes the post-fix npm JSON response, backend test logs, frontend test summary, compatibility checks, lint/export output, runtime versions, machine-readable remediation status, screenshots and exact dependency/asset provenance. Compatibility tarballs retain reviewable source and licenses. The baseline renderer verifies the original commit's lockfile checksum when the working lockfile has changed.

[Preview instructions](preview/README.md) explain dummy accounts, actual routers versus provider fixtures, runtime data outside the repository and the use of public OpenStreetMap tiles. The new UI checks document loading-screen behavior, responsive crop containment and market return navigation separately from security findings. No real payment was initiated during the navigation check.

**Release and follow-up status:** changes are prepared on the security branch for pull-request review; no production deployment has been made. Deploy through the normal release process, bind scan evidence to the actual deployed commit/digest, rerun ZAP and Sonar/CI, independently validate the source/Python candidates, and complete the broker-hardening work above. The documentation records these as outstanding items; it does not claim the whole platform is secure.
