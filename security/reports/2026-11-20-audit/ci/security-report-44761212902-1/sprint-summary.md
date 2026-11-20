# AGRITWIN Sprint Security Summary

- Source commit: `1963366877d4c58052842db6415c81e21ae98bca`
- Execution status: completed_with_findings
- Comparison: compared
- Previous comparable run: 44384466073
- Current alert counts: {'informational': 13, 'low': 16, 'medium': 3}
- Newly observed: 1
- Still observed: 31
- Not observed again: 1

## Scope and decisions

- Execution: completed_with_findings. Source commit: 1963366877d4c58052842db6415c81e21ae98bca.
- Deployment: https://backend-web-ur8z.onrender.com. Deployed commit is unverified; this is not a test instance of the source commit.
- Observed endpoints: 12. Unique alerts: 32.
- Anonymous GET-only coverage. No active attacks, form submission, write operations, cross-user permission tests or MQTT tests.
- ZAP alerts below are separate from Sonar and CodeQL snapshots. The tools may have analyzed different source revisions.
- Sonar: branch dev; quality gate OK; overall vulnerabilities 0; rating A; hotspots 0. Analysis date: 2026-11-20T09:18:09+0000. Associated workflow commit: bbd5234eab677e6113a84d691eac3bdcfb5143e2; server-side revision is not verified.
- CodeQL: existing weekly results on dev; open alerts 0. /language:javascript-typescript: 684d88311ead672402f43116bef5a87a2bd1364f at 2026-11-18T07:19:19Z; /language:python: 684d88311ead672402f43116bef5a87a2bd1364f at 2026-11-18T07:18:58Z. This workflow did not start a new CodeQL scan.

No application fixes are applied. Each alert requires evaluation and a recorded decision.
Disappearing alerts are not confirmed fixes; compare coverage and verify the deployed revision before closure.

## Current alerts

- 0ef823dd97062c35 | informational | Non-Storable Content | https://backend-web-ur8z.onrender.com/docs | review required
- 22f3b344386dbcf5 | informational | Non-Storable Content | https://backend-web-ur8z.onrender.com/api/v1/conte_mercat | review required
- 29f2b3fc0657942a | informational | Non-Storable Content | https://backend-web-ur8z.onrender.com/api/v1/anunces | review required
- 3f180a3cd77d5d46 | informational | A Client Error response code was returned by the server | https://backend-web-ur8z.onrender.com/api/v1/dashboard | review required
- 5f3b7f9ff8746539 | informational | Non-Storable Content | https://backend-web-ur8z.onrender.com/robots.txt | review required
- 8c9647fb0ec5191d | informational | Non-Storable Content | https://backend-web-ur8z.onrender.com/sitemap.xml | review required
- a3640bc24dc1d385 | informational | Non-Storable Content | https://backend-web-ur8z.onrender.com/api/v1/fields | review required
- c2aae94dbaf75bd7 | informational | A Client Error response code was returned by the server | https://backend-web-ur8z.onrender.com/api/v1/fields | review required
- caedefedc23131c1 | informational | A Client Error response code was returned by the server | https://backend-web-ur8z.onrender.com/api/v1/me | review required
- d575baffb0294d51 | informational | Modern Web Application | https://backend-web-ur8z.onrender.com/docs | review required
- eeaad729d44dca11 | informational | Non-Storable Content | https://backend-web-ur8z.onrender.com/api/v1/legal/privacy | review required
- f7a43ea916c14058 | informational | Non-Storable Content | https://backend-web-ur8z.onrender.com/api/v1/dashboard | review required
- fe044975d87e35a1 | informational | Non-Storable Content | https://backend-web-ur8z.onrender.com/ | review required
- 0224fc5d67568943 | low | Cross-Origin-Resource-Policy Header Missing or Invalid | https://backend-web-ur8z.onrender.com/api/v1/legal/privacy | review required
- 0919a3a1418fa2bf | low | X-Content-Type-Options Header Missing | https://backend-web-ur8z.onrender.com/api/v1/anunces | review required
- 3fad18b829cf3fd5 | low | X-Content-Type-Options Header Missing | https://backend-web-ur8z.onrender.com/api/v1/user_profile | review required
- 4037406969d5a037 | low | Cross-Origin-Resource-Policy Header Missing or Invalid | https://backend-web-ur8z.onrender.com/api/v1/anunces | review required
- 50842b2e7709635c | low | Cross-Origin-Resource-Policy Header Missing or Invalid | https://backend-web-ur8z.onrender.com/api/v1/legal/security | review required
- 50def3764543a820 | low | X-Content-Type-Options Header Missing | https://backend-web-ur8z.onrender.com/api/v1/conte_mercat | review required
- 622c8d28e4f0195e | low | Cross-Origin-Resource-Policy Header Missing or Invalid | https://backend-web-ur8z.onrender.com/api/v1/user_profile | review required
- 7fb58fae85e6c9a0 | low | X-Content-Type-Options Header Missing | https://backend-web-ur8z.onrender.com/api/v1/legal/privacy | review required
- 7ff5e6e5bfc98bb7 | low | Cross-Origin-Resource-Policy Header Missing or Invalid | https://backend-web-ur8z.onrender.com/api/v1/conte_mercat | review required
- 8eedbdb93927a234 | low | X-Content-Type-Options Header Missing | https://backend-web-ur8z.onrender.com/docs | review required
- 99889ced572249bd | low | Cross-Origin-Opener-Policy Header Missing or Invalid | https://backend-web-ur8z.onrender.com/docs | review required
- 9e9b11e57f95a064 | low | Cross-Origin-Resource-Policy Header Missing or Invalid | https://backend-web-ur8z.onrender.com/docs | review required
- a8c5e228c3321914 | low | Cross-Origin-Embedder-Policy Header Missing or Invalid | https://backend-web-ur8z.onrender.com/docs | review required
- aa348705cba00fc7 | low | Permissions Policy Header Not Set | https://backend-web-ur8z.onrender.com/docs | review required
- bfc9385058b39360 | low | X-Content-Type-Options Header Missing | https://backend-web-ur8z.onrender.com/api/v1/legal/security | review required
- f4e9a152b7480aba | low | Cross-Domain JavaScript Source File Inclusion | https://backend-web-ur8z.onrender.com/docs | review required
- a600def6bf93dade | medium | Missing Anti-clickjacking Header | https://backend-web-ur8z.onrender.com/docs | review required
- df1b44b654b7f768 | medium | Sub Resource Integrity Attribute Missing | https://backend-web-ur8z.onrender.com/docs | review required
- e89063b34d89a733 | medium | Content Security Policy (CSP) Header Not Set | https://backend-web-ur8z.onrender.com/docs | review required
