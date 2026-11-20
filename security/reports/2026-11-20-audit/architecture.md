# Review architecture and scope

AGRITWIN combines a Python/FastAPI/SQLAlchemy API, an Expo/React Native/TypeScript web and mobile client, ESP32 BLE/MQTT firmware and GitHub Actions. The audit snapshot is `5410a38fb8034cafd0374aef65761d8c9b069e21` on `security/dev-review-5410a38`, matching origin/dev at fetch. Untracked docs/security files are outside the reviewed commit.

The farmer account manages owned fields, field crops, devices, tasks, recommendations and profile data. Anonymous visitors use registration, login and recovery; some directory/content/payment routes have no global identity dependency. A cron secret authorizes aggregate AI work. MQTT publishers and selected BLE peripherals are separate principals from authenticated HTTP users.

Source-visible boundaries include JWT purpose/subject resolution, OAuth ticket consumption, owner-scoped SQL queries, asynchronous session transitions, shared/persistent client caches, native callbacks, WebView messaging, uploads and privileged provider/storage access. AI output is parsed as data in the reviewed paths; no model tool execution was established.

The normal backend image runs uvicorn main:app as appuser; the Lambda image selects main.handler. PROD=True selects Aurora DSQL/IAM; alternative application persistence uses DATABASE_URL. Telemetry uses a separate Supabase client. The MQTT subscriber has an independent module entrypoint and is not started by the HTTP CMD. Shipped activation, broker ACLs, RLS/IAM, firmware/pairing and effective deployment configuration remain owner-observed facts.

Client logout and account installation clear credential/cache state, but pending continuations are a distinct lifecycle boundary. Initial source candidates concern refresh completion, request retries, garden persistence and native callback correlation. The map has source-visible serialization, navigation and bridge controls; forms use explicit text/enum/numeric validation.

The review also covers shared catalog/news authority, public directory output, aggregate provider-work admission, CI/release inputs, issue-derived cost reports and lockfile advisory matching. No comparable product baseline was identified; firmware and simulator document the same MQTT interface.

Previous ledgers contained no final independently verified findings. Current source was compared with prior refs; earlier proposals were not confirmations or exclusions. Four reconnaissance reviews and backend/client/IoT source reviews contributed. The initial client agent was replaced after an automatic block. The ledger holds 22 units: 6 covered, 10 candidate, 5 blocked and 1 deferred. Coverage critics and independent verification were not completed.

No local target-controlled code, imports, tests, builds, emulators, providers, brokers or real devices ran. The required OS-enforced isolation and combined resource controls were not established. Source checks use artifact:null. Trusted static scans, public advisory queries and existing CI evidence are retained separately. Only the parent writes shared report records; original agent/scanner evidence is preserved. Application source remains unchanged.
