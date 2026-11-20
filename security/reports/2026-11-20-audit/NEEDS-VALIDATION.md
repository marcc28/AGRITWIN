# Preliminary code candidates

Status: initial source review only. Independent validation and final-record verification were not performed. All entries are **Unrated** and may be false positives. They are not confirmed vulnerabilities or final needs_validation records.

## C01 — An unsolicited native callback can adopt another user's social-login ticket

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `agritwin-app/src/app/auth/oauth-callback.tsx:unbound_native_ticket`

A sender possessing a valid, recent and unconsumed ticket for their own social identity may invoke the native callback on another app instance. That instance exchanges and installs the sender identity without verifying an initiating login operation. Subsequent victim-entered dummy data could be attributed to the sender. Native routing and boundary result remain unobserved.

Proposed root cause: The native callback lacks an app-session pending-operation nonce or verifier. Server OAuth state binds ticket issuance to the issuing browser session, while ticket exchange binds only ticket, provider and expiry, leaving the receiving app unbound.

### Source trace

- `agritwin-app/src/app/auth/oauth-callback.tsx:24` — SocialOAuthCallbackScreen: Receives provider/ticket on native.
- `agritwin-app/src/app/auth/oauth-callback.tsx:46` — finishLogin: Chooses exchange without pending-operation verifier.
- `backend/api/v1/social_auth.py:13` — exchange_social_ticket: Consumes provider/ticket and completes identity login.
- `agritwin-app/src/app/auth/oauth-callback.tsx:71` — finishLogin: Installs returned account with setAuth and routeAfterAuth.

### Evidence cited by the initial reviewer

- `agritwin-app/app.json:9` — Declares agritwin scheme; final native packaging unobserved.
- `agritwin-app/src/components/SocialLoginButtons.tsx:57` — Redirect has provider/path without receiver-instance verifier; native result is left to route at 73-76.
- `backend/api/v1/google_auth.py:132` — Issuance verifies browser OAuth state; sender must obtain legitimate ticket for own identity.
- `backend/services/social_auth_service.py:75` — Random provider-bound three-minute ticket, atomically consumed once at 97-115; no receiving-instance verifier.
- `agritwin-app/src/app/auth/oauth-callback.tsx:34` — Web path does not exchange in this screen; candidate is native only.
- `agritwin-app/src/app/auth/oauth-callback.tsx:41` — processedTicket deduplicates one screen instance; does not establish a pending login.

### Unresolved facts

- Required OS sandbox controls are not established; no target execution.
- Need final manifest and isolated native-route fixture proving unsolicited valid sender-ticket acceptance without an initiating operation or identity confirmation.
- Need dummy observation of installed identity and attribution of a harmless victim-entered record.

### Bounded local validation plan

In an approved isolated simulator with two dummy identities and a local ticket fixture, leave the recipient app logged out without initiating social login. Open an agritwin://auth/oauth-callback link containing an unused sender-owned fixture ticket and observe whether recipient credentials become the sender's. Compare with expired, consumed, wrong-provider and correctly initiated tickets. Do not contact live identity providers.

### Owner-observed deployment check

Have the owner inspect the shipped URL-handler configuration and any deployment-specific callback mediation to establish whether an external link can reach this route without an app-local pending authentication transaction.

## C02 — A pending account A mutation can be retried with account B's token

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `agritwin-app/src/services/auth.ts:authenticatedFetch_cross_account_retry`

A user can begin an email change, log out while its expired-token request is pending, and leave a delayed 401 for the next user's session. authenticatedFetch treats any changed token as a refresh and retries the old request body with the next user's token. The backend then updates the next user's email. The claimed boundary result is an email mutation, not a demonstrated account takeover.

Proposed root cause: The retry optimization equates token inequality with same-account token renewal. It does not bind the original request, payload and retry authority to the same account/session.

### Source trace

- `agritwin-app/src/services/api.ts:252` — updateMyEmail: A prepares PUT email body at 265.
- `agritwin-app/src/services/auth.ts:211` — authenticatedFetch: A first request may return delayed401.
- `agritwin-app/src/services/auth.ts:246` — clearAuth: A logs out and B installs credentials with setAuth:73.
- `agritwin-app/src/services/auth.ts:218` — current-token retry: Different current token is substituted into original method/body at 220-221.
- `backend/api/v1/auth.py:329` — update_my_email: UPDATE uses current_user.id of B with email selected by A.

### Evidence cited by the initial reviewer

- `agritwin-app/src/services/auth.ts:219` — Only token strings compared; no initiating account/generation guard.
- `agritwin-app/src/services/auth.ts:221` — Replay preserves init and replaces headers.
- `agritwin-app/src/services/auth.ts:222` — Current improvement expires only on second401; successful B mutation is not prevented.
- `agritwin-app/src/components/AccountCard.tsx:138` — Email handler starts updateMyEmail; logout at310 is not disabled by saving.
- `agritwin-app/__tests__/unit/services/auth-refresh.test.ts:185` — Newer-token test uses same farmer username; no account replacement.

### Unresolved facts

- Required OS sandbox controls are not established; no target execution.
- Need deferred A first401 released after B setAuth and observation of retry Authorization/body/dummy affected row. No claim of replay after initial success.

### Bounded local validation plan

In the approved isolated sandbox, start a dummy A updateMyEmail with an expired A token and hold the transport's 401. Complete logout and B login, then release the 401. Inspect the retry Authorization/body and a dummy backend row to establish whether B's email changes. The regression must reject or abandon work whose initiating session changed, while retaining same-session token-refresh retries.

## C03 — A late refresh can restore a previous account after logout or account replacement

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `agritwin-app/src/services/auth.ts:refreshAuth_late_session_commit`

A second user of the same app instance may receive the previous user's authority when that user's refresh response finishes after logout and the second user's login. The previous refresh writes its access token into current credential storage; subsequent profile requests use it. This claim requires an overlapping refresh/logout/login schedule and has not been reproduced.

Proposed root cause: refreshAuth retains the old refresh token across its network await and commits the returned access token without a session generation or original-account check. clearAuth and setAuth reset credential caches but leave the outstanding refresh promise valid.

### Source trace

- `agritwin-app/src/services/auth.ts:129` — refreshAuth: Captures A refresh token and awaits POST at141-149.
- `agritwin-app/src/services/auth.ts:246` — clearAuth: Removes credentials/cache without invalidating refresh.
- `agritwin-app/src/services/auth.ts:73` — setAuth: B credentials installed before A response.
- `agritwin-app/src/services/auth.ts:166` — refreshAuth commit: Reads current username and unconditionally stores returned A access token at170.
- `agritwin-app/src/services/api.ts:211` — getMe: Future profile call uses replaced canonical token.
- `backend/api/v1/auth.py:243` — read_me: Returns A profile/email for submitted A JWT through _me_from_row:226-229.

### Evidence cited by the initial reviewer

- `agritwin-app/src/services/auth.ts:168` — Cache resets make future calls read the committed token; no initiating-session guard.
- `agritwin-app/src/services/auth.ts:189` — Global refreshInFlight only clears on its own finally at229-231, not logout/setAuth.
- `backend/api/v1/auth.py:205` — Server refresh issues token for original sub and does not rotate refresh token, permitting B refresh/A access mixture.
- `agritwin-app/src/components/AccountCard.tsx:108` — Logout clears auth/navigates without invalidating pending refresh.
- `agritwin-app/__tests__/unit/services/auth-refresh.test.ts:185` — Current concurrency test remains same account.

### Unresolved facts

- Required OS sandbox controls are not established; no target execution.
- Need deterministic refresh-A, logout, login-B, release-A schedule and next dummy token/profile observation; logout-only restoration also unobserved.

### Bounded local validation plan

Using two dummy accounts and a deferred mock transport inside the approved sandbox, start A's refresh and hold its successful response. Complete clearAuth and setAuth for B, then release A's response. Assert stored token subject and the next /me result remain B; separately repeat with logout only and assert no authenticated request becomes possible. Use dummy tokens and profiles only.

## C04 — Provisioning releases Wi-Fi credentials to a self-identified BLE peer

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `agritwin-app/src/services/bleProvisioning.ts:sendWifiSettings:unverified-credential-recipient`

A nearby peripheral advertising the public service and supplying syntactically valid INFO can enter the mobile provisioning flow when selected by the farmer. The app writes the Wi-Fi password before backend registration and without an independent proof of device identity. The companion tester automatically chooses the first matching peripheral. This is a conditional recipient-authentication disclosure path, not proof of passive interception.

Proposed root cause: Discovery names/UUID and self-reported INFO are accepted as sufficient recipient identity before a network secret is released. Bluetooth permission, user selection and later HTTP ownership checks do not independently authenticate that recipient.

### Source trace

- `agritwin-app/src/services/bleProvisioning.ts:198` — scanForBoards: Discovers peripherals advertising the public service UUID and uses their advertised names.
- `agritwin-app/src/hooks/use-ble-provisioning.ts:168` — selectBoard: Connects to the user-selected advertised peer and reads its INFO.
- `agritwin-app/src/services/bleProvisioning.ts:236` — parseBoardInfo: Accepts nonempty self-reported device_id and serial strings without an independently trusted certificate, secret or challenge.
- `agritwin-app/src/hooks/use-ble-provisioning.ts:218` — submitWifi: Passes the farmer’s entered Wi-Fi password to the selected peer before registerBoard.
- `agritwin-app/src/services/bleProvisioning.ts:377` — sendWifiSettings: Writes settings.password to the peer’s password characteristic.

### Evidence cited by the initial reviewer

- `agritwin-app/src/components/device-setup/ScanSteps.tsx:49` — Mobile selection displays peripheral-provided board names and requires a user tap.
- `agritwin-app/src/services/blePermissions.ts:28` — Runtime Bluetooth permission authorizes app access to the transport, not the identity of a particular peripheral.
- `agritwin-app/src/hooks/use-ble-provisioning.ts:228` — The connection is closed and backend registration begins only after credential transfer.
- `iot/firmware/agritwin_esp32/provisioning.cpp:215` — Firmware declares INFO READ and password WRITE characteristics; provisioningBegin shows no explicit authenticated identity protocol.
- `iot/firmware/agritwin_esp32/agritwin_esp32.ino:72` — A configured genuine board boots normal telemetry mode rather than BLE setup, limiting the genuine-board exposure window.
- `iot/firmware/tools/provision_ble.py:57` — The tester chooses devices[0], including a name-prefix fallback at line 51, and writes the Wi-Fi password at line 81 without recipient proof.
- `agritwin-app/src/components/device-setup/DeviceSetupScreen.tsx:26` — Mobile Wi-Fi credentials stay in component memory and the password is cleared on success; persistent mobile password storage is not demonstrated.

### Unresolved facts

- No bounded fake-peripheral/native-transport fixture executed because the required OS-enforced sandbox is not established.
- Final native packaging, operating-system pairing behavior, shipped firmware and any physical/out-of-band identity verification procedure are unobserved.

### Bounded local validation plan

Extend the existing fake BLE manager in the approved isolated sandbox with an unrelated identity that advertises the expected UUID and supplies valid INFO. Explicitly select it in the mobile fixture and use a dummy Wi-Fi password only; record whether the password write precedes authenticated recipient proof. Separately mock the tester’s discovery with two dummy peers and inspect which receives that dummy value. Never scan real devices.

### Owner-observed deployment check

An owner should inspect shipped pairing/bonding policy, firmware configuration and provisioning instructions for an authenticated out-of-band identity or proof-of-possession check before releasing Wi-Fi credentials. User-visible names and public UUIDs alone are not such proof.

## C05 — A late garden response can be persisted under the next user's cache key

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `agritwin-app/src/services/gardenPicker.ts:late_response_current_account_cache_key`

A garden-list request belonging to account A can finish after logout and B's login but before B starts a new garden-picker load. The stale-response guard still considers A current, while cacheFields derives its storage key from B's current credentials. A's garden data can therefore enter B's persistent garden list and the account-neutral query cache. Runtime disclosure and cache persistence remain unverified.

Proposed root cause: The response guard tracks the last picker-load username rather than the actual current session, and persistence derives its account key at completion time instead of retaining the request's account identity. Logout clears the shared query client but does not invalidate independent garden-picker requests or state.

### Source trace

- `agritwin-app/src/services/gardenPicker.ts:100` — loadGardenPickerFields: Captures A and starts direct getFields at139.
- `agritwin-app/src/services/auth.ts:246` — clearAuth: Clears queryClient without invalidating picker promise/loadedUsername.
- `agritwin-app/src/services/auth.ts:73` — setAuth: B login installs credentials; routeAfterAuth:6 may wait before B AppHeader/picker mounts.
- `agritwin-app/src/services/gardenPicker.ts:142` — response guard: A response passes before first B picker load; publishes shared fields at157.
- `agritwin-app/src/services/gardenPicker.ts:73` — cacheFields: Current auth key via getCacheKey:50-54 can be B when persisting A result.
- `agritwin-app/src/app/field-selection.tsx:189` — source-path: Renders fieldsQuery; later readCachedFields:57 may hydrate polluted B key.

### Evidence cited by the initial reviewer

- `agritwin-app/src/services/gardenPicker.ts:106` — loadedUsername changes on new picker load, not credential replacement.
- `agritwin-app/src/services/gardenPicker.ts:155` — cacheFields receives no initiating principal.
- `agritwin-app/src/services/queryPersistence.ts:42` — cancel/clear affects queryClient, not direct getFields promise that may setQueryData later.
- `agritwin-app/src/services/queryKeys.ts:13` — fields key has no principal.
- `agritwin-app/__tests__/unit/services/gardenPicker.test.ts:217` — Existing test starts B picker before releasing A; different protected schedule.
- `agritwin-app/src/components/AppHeader.tsx:81` — Once B picker begins it resets loadedUsername, a real preventing control for that schedule.

### Unresolved facts

- Required OS sandbox controls are not established; no target execution.
- Need response after B setAuth but before B first picker load; observe persistent B key and rendered/offline data. Guard protects after B load starts.

### Bounded local validation plan

With dummy A/B identities, a harmless A-only garden name and deferred getFields responses in the approved sandbox, start A's picker load, complete logout and B's setAuth, hold B's post-login request, then release A's response. Inspect B's persistent garden cache key and global fields query. Render B's field-selection and repeat an offline cache hydration. Verify no A-only name is available to B.

## C06 — Anonymous news deletion lacks publication authority

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `backend/anunces/anonymous-shared-delete`

The source-defined DELETE accepts a public news UUID and deletes the shared record without an authenticated author/editor. Whether that violates product policy and the deployed effective control remains unverified.

Proposed root cause: The delete path selects shared news by UUID alone and commits deletion without a principal or editorial role.

### Source trace

- `backend/api/v1/anunces.py:135` — delete_anunce: DELETE /anunces/{id} accepts UUID plus a service dependency only.
- `backend/services/anunce_service.py:92` — delete_anunce: Fetches the shared news row solely by UUID.
- `backend/services/anunce_service.py:100` — delete_anunce: Deletes that row and commits.

### Evidence cited by the initial reviewer

- `backend/api/v1/anunces.py:29` — Public listing serializes AnunceRead records and identifiers.
- `backend/main.py:89` — Router mount adds no identity dependency.
- `backend/api/v1/anunces.py:87` — Creation has an IP rate limit, which does not authorize deletion.
- `backend/db/schema.py:200` — Anunce has no author/owner relationship that would implicitly constrain this service path.

### Unresolved facts

- Publication policy must establish who may delete shared news and whether anonymous deletion is intended.
- No isolated dummy deletion or inspection of upstream/database authorization was performed.

### Bounded local validation plan

In an isolated dummy store, seed one news item published by a separate trusted dummy editor, invoke exactly one anonymous DELETE and inspect that fixture row. Assert denial according to the approved editor/owner policy.

### Owner-observed deployment check

Owner should inspect route-level upstream authorization and publication policy without deleting deployed content.

## C07 — Reset JWT can cross from the email namespace into another account username

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `backend/auth/reset-jwt-as-bearer`

A reset token legitimately delivered to an attacker-controlled mailbox can be submitted as bearer authentication. If that mailbox string is another account's username, the bearer verifier selects the other account. No local cross-account result was executed.

Proposed root cause: Reset and access JWTs share SECRET_KEY/HS256, but reset sub=email is interpreted by get_current_user as a username without token purpose/type separation.

### Source trace

- `backend/api/v1/forgot_password.py:222` — forget_password: Looks up a registered email and schedules token delivery to that address.
- `backend/api/v1/forgot_password.py:84` — create_reset_password_token: Signs sub=email and purpose=password_reset with SECRET_KEY and HS256.
- `backend/api/v1/auth.py:123` — get_current_user: Verifies same key/algorithm, extracts sub, but never rejects reset purpose.
- `backend/services/user_service.py:62` — get_user_by_username: Selects User.username equal to reset email subject.
- `backend/api/v1/auth.py:243` — read_me: Uses selected principal to return profile and email.

### Evidence cited by the initial reviewer

- `backend/models/user.py:4` — Signup username is an unrestricted string and email a distinct EmailStr; the source permits the necessary cross-namespace value.
- `backend/db/schema.py:50` — Username and email have separate unique columns; no cross-column equality constraint is defined.
- `backend/api/v1/forgot_password.py:102` — The reset consumer enforces purpose and jti; bearer verification does not invoke that consumer or the used-token table.

### Unresolved facts

- A bounded two-account JWT/DB fixture has not run because the required OS sandbox is not established.
- The mailbox/username collision is a prerequisite, not evidence that existing deployed accounts meet it.

### Bounded local validation plan

In an offline isolated fixture, create dummy A with an owned test mailbox and dummy B whose username equals that mailbox but whose email differs. Capture the reset delivery locally, then submit that exact issued token to get_current_user and /me with the dummy DB. Assert the access verifier rejects all non-access token purposes. Do not contact email or a live service.

## C08 — Any authenticated user can modify the shared crop catalog

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `backend/crops/shared-catalog-write-authority`

The crop catalog is shared across field associations. Router authentication alone allows any signed-in account to patch a catalog row by id, affecting the names/categories read through other owners' field crops if that account lacks editorial authority. The authority policy and runtime effect need validation.

Proposed root cause: Global CropService mutations accept an id and data but no user or editorial role; the router enforces only get_current_user.

### Source trace

- `backend/api/v1/crops.py:72` — update_crop: Authenticated PATCH /crops/{crop_id} delegates global crop id and validated update fields.
- `backend/services/crops_service.py:60` — update_crop: Fetches Crop by id without owner or role and assigns supplied model fields.
- `backend/services/crops_service.py:69` — update_crop: Commits changes to shared Crop.
- `backend/services/field_crops_service.py:36` — list_field_crops: Other users' correctly owner-filtered field crop queries load the same shared crop relationship.

### Evidence cited by the initial reviewer

- `backend/api/v1/crops.py:8` — Router requires authentication but does not check a role.
- `backend/services/crops_service.py:77` — Delete has the same authority model; foreign-key failure prevents deleting linked rows and must not be represented as unconditional deletion of associated crops.
- `backend/services/field_crops_service.py:108` — Field-crop creation correctly verifies field ownership; this does not restrict shared catalog mutation.

### Unresolved facts

- Owner must specify whether every signed-in account deliberately has global crop-editor authority.
- Cross-owner display mutation was not reproduced with dummy accounts and DB.

### Bounded local validation plan

Seed one shared crop referenced by dummy B's field and sign in as ordinary dummy A. Attempt one harmless name/category patch and inspect B's field-crop view. Compare with explicit catalog-editor policy; keep the foreign-key denial test separate.

### Owner-observed deployment check

Owner should confirm catalog write roles and any effective database authorization before classifying the source path as unauthorized.

## C09 — Public market reads can invoke operator-funded Gemini translation

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `backend/market/anonymous-translation-budget`

New localized market GET routes permit anonymous callers to reach the shared translation client, including a search-term translation before any product match. These calls do not enter enforce_ai_rate_limit or a source-visible translation cache/budget. The effect depends on configured translation model and effective quotas.

Proposed root cause: Translation was added to public catalog reads without binding provider-spend admission to an authenticated or metered requester.

### Source trace

- `backend/api/v1/content_market.py:117` — search_conte_mercat: Anonymous search accepts a bounded product string and non-Catalan language.
- `backend/api/v1/content_market.py:93` — _translate_search_term: Invokes translation before the product search, even if the query will match no catalog rows.
- `backend/services/translation_service.py:32` — translate: Validates language and configured model but has no caller budget, cache or rate-admission check.
- `backend/services/translation_service.py:58` — translate: Calls shared Gemini client interactions.create with a maximum of 3000 output tokens.

### Evidence cited by the initial reviewer

- `backend/main.py:90` — Public catalog router is mounted without global auth dependency.
- `backend/api/v1/content_market.py:122` — Search term length and language-tag bounds are real controls; they cap input shape rather than aggregate calls.
- `backend/services/ai_dependencies.py:12` — Translation client uses configured GEMINI_API_KEY and MODEL_USE_IN_TRANSLATION.
- `backend/api/v1/field_recommendations.py:41` — Recommendation inference uses enforce_ai_rate_limit, providing a source-visible contrasting provider-admission control absent from localized market routes.
- `backend/api/v1/content_market.py:60` — List/detail may also translate returned products; search can perform a second call when matches exist.

### Unresolved facts

- MODEL_USE_IN_TRANSLATION activation and effective upstream/provider budgets are external facts; missing model causes a fallback without provider execution.
- No isolated mock request counter or aggregate-budget fixture ran; paid calls were not made.

### Bounded local validation plan

In the required offline sandbox, replace the translation client with a counter-only dummy client. Invoke one anonymous search with a harmless unmatched term and language=en, and compare repeat requests to the intended anonymous translation allowance. Verify a source-side cache/admission rule before invoking a paid client; stop at counter evidence.

### Owner-observed deployment check

Owner should inspect translation model enablement, public translation policy, edge admission and provider spend/quotas. Do not probe or generate traffic on the deployed service.

## C10 — Unregistered MQTT identities can remain in the monitor indefinitely

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `backend/services/device_status_monitor.py:register_message:unbounded-identity-retention`

Messages naming distinct nonempty string device IDs add permanent entries to the process-wide last-seen map, including when the database rejects the telemetry. The periodic check visits registered database devices but never removes map entries. Persistent memory growth is source-grounded; meaningful shared-service impact and effective admission bounds need validation.

Proposed root cause: The monitor admits any truthy hashable identifier before proving registration and has no TTL pruning or cardinality cap. Persistence failure does not gate this bookkeeping.

### Source trace

- `backend/services/mqtt_subscriber.py:34` — on_message: Accepts JSON supplied by a publisher admitted to the shared topic namespace.
- `backend/services/mqtt_subscriber.py:42` — on_message: Attempts persistence; save_telemetry returns without a success signal even after a rejected insert.
- `backend/services/mqtt_subscriber.py:47` — on_message: Calls register_message on the body device_id regardless of persistence success.
- `backend/services/device_status_monitor.py:53` — register_message: Adds a distinct identifier and timestamp to the shared _last_seen dictionary with no registration or cardinality check.

### Evidence cited by the initial reviewer

- `backend/db/database.py:104` — Database insertion errors are caught and logged, allowing callback execution to continue to the monitor.
- `backend/services/device_status_monitor.py:43` — The identity-to-timestamp dictionary is owned for the lifetime of the monitor.
- `backend/services/device_status_monitor.py:79` — check_devices iterates database-registered devices; it does not delete expired, unknown or removed entries from _last_seen.
- `backend/services/device_status_monitor.py:68` — Timeout affects the online decision only; it is not data-retention expiry.
- `backend/tests/unit/test_device_status_monitor.py:110` — Tests check empty identifiers but do not assert pruning or rejection of unknown identifiers.

### Unresolved facts

- No small retention/cleanup fixture was run because the full execution sandbox is not established.
- Actual untrusted publisher admission, effective broker per-producer quotas, listener process lifetime/memory limits and restart policy are unobserved; service exhaustion is not an observed result.

### Bounded local validation plan

In the approved isolated fixture with a fake clock, a tiny dummy registered-device set and mocked rejected inserts, deliver two or three distinct short unknown IDs. Advance beyond the offline timeout and run one check. Inspect retained cardinality without generating load. The regression should reject unknown identifiers and remove expired/removed-device entries according to a bounded retention policy.

### Owner-observed deployment check

An owner should inspect broker publish admission/rate limits and the listener’s process memory/lifetime limits. Determine whether untrusted identities can accumulate across the normal process lifetime without a cap or reset.

## C11 — MQTT payload identity can select another device’s telemetry and online status

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `backend/services/mqtt_subscriber.py:on_message:unbound-device-authority`

A publisher admitted to the subscribed MQTT namespace can name an existing device belonging to another farmer. The consumer uses that claimed identifier for privileged telemetry insertion and for the online-status calculation without authenticating the device or binding it to the topic. Actual publisher admission and successful persistence remain unverified.

Proposed root cause: The consumer treats payload.device_id as authoritative, independently of MQTT publisher identity or the field topic. HTTP ownership checks and the telemetry foreign key establish registration/ownership for other paths but do not prove message origin.

### Source trace

- `backend/services/mqtt_subscriber.py:24` — on_connect: Subscribes to agritwin/sensors/#, spanning all field topics.
- `backend/services/mqtt_subscriber.py:34` — on_message: Decodes JSON; msg.topic is logged but does not authorize the body device identifier.
- `backend/services/mqtt_subscriber.py:42` — on_message: Passes the publisher-controlled body directly to save_telemetry.
- `backend/db/database.py:86` — save_telemetry: Copies device_id and sensor values into a telemetry row without a principal-to-device check.
- `backend/db/database.py:101` — save_telemetry: Inserts that row using the configured Supabase client; a second source-visible branch can update the selected registered device’s online status.

### Evidence cited by the initial reviewer

- `backend/db/database.py:67` — The telemetry client uses SUPABASE_URL and SUPABASE_SECRET_KEY, rather than an identity supplied by the MQTT publisher.
- `backend/services/mqtt_subscriber.py:65` — The listener creates a client and connects at line 74 without source-visible TLS or username/password setup. Broker-side policy is not established.
- `backend/services/mqtt_subscriber.py:47` — The same unverified device_id is registered with the monitor even when persistence returned without success.
- `backend/services/device_status_monitor.py:79` — The monitor restricts actual status updates to database-registered devices and compares their recent-message state.
- `backend/db/database.py:115` — Status mutation selects the devices row solely by id.
- `backend/db/schema.py:376` — Telemetry has a foreign key to devices.id; it can reject an unknown device but does not authenticate a publisher claiming an existing id.
- `backend/api/v1/fields.py:366` — HTTP registration separately verifies the account owns the target field; this control is not invoked by MQTT.
- `iot/firmware/agritwin_esp32/telemetry.cpp:67` — Firmware supplies deviceId as MQTT client id and publishes field topic at lines 80/91; consumer does not bind either to a trusted publisher.

### Unresolved facts

- No local dummy publisher/consumer/database result was executed because the required OS-enforced sandbox is not established.
- The listener’s actual activation, broker ACLs and publisher restrictions, effective Supabase permissions/policies, and device registration in that persistence path are unobserved. The HTTP image alone does not establish MQTT reachability.
- Whether the HTTP dashboard reads the same telemetry store is deployment-dependent; no cross-store readback is claimed.

### Bounded local validation plan

In the approved isolated sandbox, mock the transport and Supabase with two dummy registered devices owned by distinct dummy principals. Feed one message admitted under dummy A’s topic but naming dummy B. Inspect only the attempted insert and B’s mock online-status update. Bind the authorized producer/topic to the registered device and assert both operations are denied for the mismatch.

### Owner-observed deployment check

An owner should inspect the deployed listener command/revision, broker authentication and per-device publish ACLs, and effective database policies. Establish whether an untrusted publisher can reach this consumer and whether claimed identifiers are independently constrained; do not send audit messages to the shared broker.

## C12 — Malformed message errors can escape the shared MQTT callback

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `backend/services/mqtt_subscriber.py:on_message:uncontained-message-errors`

A publisher whose message reaches the consumer can supply invalid UTF-8 or a JSON object with an unhashable device_id. These paths raise outside the callback’s sole JSONDecodeError handler. A stop of the shared telemetry loop is conditional on the locked Paho callback handling and supervisor behavior, neither reproduced here.

Proposed root cause: The callback validates JSON syntax only. UTF-8 decoding and monitor registration may fail with other exception types, and start_mqtt_listener has no surrounding recovery boundary.

### Source trace

- `backend/services/mqtt_subscriber.py:30` — on_message: Receives a broker message under the shared subscribed namespace.
- `backend/services/mqtt_subscriber.py:34` — on_message: Strict UTF-8 decoding precedes JSON parsing and can raise UnicodeDecodeError.
- `backend/services/mqtt_subscriber.py:47` — on_message: For dictionary payloads, forwards device_id without checking its scalar type.
- `backend/services/device_status_monitor.py:53` — register_message: Uses a truthy device_id as a dictionary key; a nonempty JSON list/dictionary is unhashable.
- `backend/services/mqtt_subscriber.py:49` — on_message exception boundary: Catches JSONDecodeError only; the other exception types can escape into the MQTT network-loop caller.

### Evidence cited by the initial reviewer

- `backend/services/mqtt_subscriber.py:77` — The listener runs loop_forever without a surrounding try/restart boundary and does not set callback exception suppression in this module.
- `backend/db/database.py:104` — save_telemetry catches its own exceptions; this does not contain an earlier decode error or the later monitor error.
- `backend/services/device_status_monitor.py:94` — The background check thread contains its own exceptions, but register_message is called synchronously in the separate MQTT callback path.
- `backend/tests/unit/test_mqtt_subscriber.py:90` — Existing callback tests cover syntactically invalid JSON and non-object payloads, not invalid UTF-8 or an unhashable device_id.
- `backend/uv.lock:1675` — The source lock selects paho-mqtt 2.1.0; this exact consumer-loop behavior was not executed.

### Unresolved facts

- The bounded malformed-message checks and exact locked Paho 2.1.0 loop effect were not executed because the required sandbox is unavailable. A cached local Paho 2.2.0 source is not evidence for the locked version.
- Actual listener exposure, broker filtering, process isolation and supervisor restart behavior remain unobserved. No claim is made that the FastAPI process stops.

### Bounded local validation plan

Under the approved sandbox, replace persistence and broker I/O with dummy functions, then deliver one invalid UTF-8 byte sequence and separately one small object with a nonempty list as device_id through the locked callback/loop adapter. Record the exception boundary and whether a subsequent valid dummy message is handled. Stop after that result; reject malformed shapes and contain per-message failures without concealing infrastructure failures.

### Owner-observed deployment check

An owner should inspect the actual listener’s deployment, broker message validation, supervisor/restart configuration and its isolation from the HTTP service. These observations determine the scope and duration of any telemetry interruption.

## C13 — Per-field AI claims do not bound one account's aggregate scheduled inference

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `backend/tasks/aggregate-inference-budget`

A signed-in user can create multiple located fields; owner-authorized task reads or the operator scheduler can ask Gemini about each eligible field. The atomic claim and cron semaphore limit per-field duplication/concurrency, but no source-visible per-account field/inference budget bounds aggregate operator-funded work. No spend or load test was performed.

Proposed root cause: Scheduled and lazy task generation account at field scope; user-controlled field cardinality is not charged against an account-level entitlement/budget before inference.

### Source trace

- `backend/api/v1/fields.py:228` — create_field: Authenticated creation inserts a field owned by the caller without an account field-count budget in this path.
- `backend/api/v1/tasks.py:54` — list_tasks: Owner-authorized task reads enqueue refresh when the field is stale.
- `backend/services/task_service.py:323` — refresh_field: Checks eligibility and claims the field before assembling provider context.
- `backend/services/task_service.py:359` — refresh_field: Calls ask_gemini for the selected field with operator-configured provider authority.

### Evidence cited by the initial reviewer

- `backend/api/v1/tasks.py:170` — Cron is protected by a configured nonempty constant-time secret check; the claim does not allege bypass of that secret.
- `backend/api/v1/tasks.py:40` — Cron bounds simultaneous reviews to three but processes all selected gardens.
- `backend/services/task_service.py:382` — Conditional committed _claim prevents duplicate reviews of one field and implements retry/freshness windows.
- `backend/services/rate_limit.py:56` — The AI account limiter is applied by recommendation/diagnosis routes, not the lazy task-read route.

### Unresolved facts

- Configured account entitlements, provider spend caps and upstream controls are not visible in this repository.
- A bounded mocked two-field accounting/claim fixture has not run; no actual provider work was generated.

### Bounded local validation plan

With a dummy account, two eligible dummy fields and a mocked ask_gemini counter in the required sandbox, compare permitted calls against a declared one-account inference budget. Check both lazy reads and an authorized dummy scheduler invocation, retaining claim/dedup controls. Stop after the minimal counter difference.

### Owner-observed deployment check

Owner should inspect plan entitlements, aggregate provider budgets and field-count limits; do not infer uncapped real billing from absent application counters alone.

## C14 — Anonymous user listing serializes account email addresses

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `backend/users/anonymous-email-directory`

A visitor can call the source-defined users list without credentials and the response model includes each account email. The intended privacy policy and deployed row filtering require owner validation.

Proposed root cause: The list route and service accept no principal or owner constraint while serializing a global User query into UserRead.

### Source trace

- `backend/api/v1/user.py:34` — get_users: Anonymous GET /users delegates offset and limit to UserService.
- `backend/services/user_service.py:19` — list_users: Selects global User rows without caller or row ownership predicate.
- `backend/models/user.py:13` — UserRead: Response serializes username and email.

### Evidence cited by the initial reviewer

- `backend/main.py:82` — Router is mounted without global identity dependency.
- `backend/api/v1/user.py:36` — Only service injection is required by the list endpoint.
- `backend/api/v1/auth.py:243` — The separate /me route does bind the returned email/profile to get_current_user.

### Unresolved facts

- The owner must establish whether publishing all account emails anonymously is intentional and authorized.
- Effective database/ingress filtering and actual response contents were not reproduced locally.

### Bounded local validation plan

Seed two harmless dummy users in a local isolated DB, invoke the anonymous list once and inspect only those fixture emails. Compare the result with the owner-approved directory policy.

### Owner-observed deployment check

Owner should inspect directory/privacy requirements and effective routing/database policies; existing 200 status alone does not establish what data was returned.

## C15 — Issue titles can reach cost reports as spreadsheet formulas

**Severity: Unrated. Status: preliminary; independent validation pending.**

Fingerprint: `scripts/generate_costs_csv.py:write_xlsx:issue-title-as-formula`

A principal allowed to edit an included sprint issue title can place formula-prefixed text in the Task column consumed by a report reader. The generator does not distinguish external text from formula syntax. Formula interpretation and the effective author/reader boundary have not been observed.

Proposed root cause: The sprint prefix is removed without neutralizing formula prefixes; external Task text is passed to CSV and openpyxl cell assignment without an explicit text-only type.

### Source trace

- `scripts/generate_costs_csv.py:215` — parent_task_row: Included parent issue title becomes Task after clean_parent_title.
- `scripts/generate_costs_csv.py:73` — clean_parent_title: Removes sprint prefix and whitespace only; leading formula syntax remains.
- `scripts/generate_costs_csv.py:617` — write_sprint_sheet: Task is passed as a cell value without forcing text; CSV sibling writes the same Task.

### Evidence cited by the initial reviewer

- `scripts/generate_costs_csv.py:246` — Only sprint-tagged parent issues are selected; a fixture title can retain the required sprint prefix before a harmless formula.
- `scripts/generate_costs_csv.py:423` — CSV quoting is used but no spreadsheet text neutralization is applied.
- `.github/workflows/generate-costs-csv.yml:67` — Generator executes against the default branch and reports are uploaded/committed; no source execution injection is claimed.

### Unresolved facts

- The required OS-enforced execution sandbox is not established, so no dummy workbook/CSV interpretation check ran.
- Effective permission to edit an included issue and the intended authority separation between issue editor and report consumer are not established.

### Bounded local validation plan

In the required offline sandbox use a single dummy included sprint issue with harmless title [SPRINT 2] =1+1; generate one report, inspect XML/cell type without invoking external links or macros, then verify text-only remediation retains a literal string.

### Owner-observed deployment check

Owner should inspect who may edit included issues/Project items and who opens generated CSV/XLSX, and confirm whether their trust/authority differs. No live document evaluation is requested.
