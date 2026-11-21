Find source-grounded security invariant failures in your assigned units. Return exactly one JSON object matching the structured hunter result contract below.

# Arquitectura y alcance de la auditoría

AGRITWIN combina FastAPI/Python 3.13 y SQLAlchemy, cliente Expo 55/React Native/TypeScript para web y móvil, firmware Arduino ESP32 con BLE y telemetría MQTT, e infraestructura de GitHub Actions. La revisión usa el commit 5410a38fb8034cafd0374aef65761d8c9b069e21 en security/dev-review-5410a38, idéntico a origin/dev después de fetch. Los archivos no versionados docs/security/ no representan el código de ese commit.

El usuario agricultor puede gestionar sus parcelas, cultivos, dispositivos, recomendaciones, tareas y perfil. El visitante anónimo participa en login, alta y recuperación. Las listas de usuarios/noticias y pagos tienen rutas sin dependencia global de identidad. El operador cron puede ejecutar trabajo agregado de IA con TASKS_CRON_SECRET. El publicador MQTT controla JSON y el periférico BLE seleccionado controla metadatos INFO; estas identidades no equivalen a una cuenta HTTP.

HTTP monta todos los routers en backend/main.py. JWT, recuperación y cuentas sociales resuelven identidad; las consultas de parcelas/tareas suelen filtrar por user_id. Los tickets sociales tienen TTL, consumo único y state en el navegador. La app conserva credenciales en SecureStore o localStorage y copias privadas en cachés; logout y setAuth son fronteras temporales distintas del ownership backend. Los callbacks nativos y el WebView tienen límites diferentes del navegador web. Las imágenes y texto almacenado alimentan Supabase, APIs de IA y contenido mostrado; el modelo no dispone de herramientas ejecutables en los caminos inventariados.

El listener MQTT es un módulo independiente: el CMD HTTP no demuestra que esté desplegado. Los mensajes se guardan usando autoridad de Supabase y actualizan estado por device_id. BLE envía credenciales Wi-Fi antes de registrar el dispositivo por HTTP. El firmware arranca BLE solo al configurar. Broker efectivo, ACL, RLS, pairing y firmware distribuido son hechos externos.

La imagen normal selecciona uvicorn main:app con appuser; Lambda selecciona main.handler/Mangum. PROD=True elige Aurora DSQL/IAM; la ruta alternativa usa DATABASE_URL; telemetría usa Supabase separado. No se presupone la configuración de proxy/WAF/DB/roles/callbacks ni la revisión desplegada. No hay comparable de producto identificado; simulador y firmware documentan el mismo protocolo MQTT.

La revisión anterior general quedó incompleta, con catorce candidatos preliminares y cero registros finales verificados. La posterior fue un pase quick de cambios. Sus ledgers se leyeron; los candidatos no son hallazgos confirmados ni exclusiones. Se comparan blobs de los starting_paths actuales con ambos refs. Todo estado pendiente vuelve a ser trabajo actual. La selección cubre fuente de identidad/ownership, recursos/proveedores, cliente, IoT, CI y lockfiles. La cobertura solo se sostiene por checks concretos, no por número de agentes.

No se ejecutará código controlado por el target. No están acreditados target/toolchain read-only, invisibilidad de credenciales, escritura limitada a scratch, cuotas conjuntas CPU/memoria/procesos/disco y loopback aislado. No se ejecutan tests/builds/imports, servicios, emuladores, proveedores o brokers. Las comprobaciones son de fuente; artifact:null. Solo el padre ejecuta scanners estáticos confiables y consulta metadatos públicos y resultados CI ya existentes. La CI se considera evidencia externa con SHA/fecha/cobertura, nunca reproducción local. El padre es único escritor de registros compartidos; agentes escriben exclusivamente su scratch. No hay allowlist de artefactos de ejecución: ningún archivo de target puede promoverse.


[
  {
    "coverage_id": "backend%2Fservices%2Fmqtt_subscriber.py%23on_message::backend%2Fservices%2Fmqtt_subscriber.py%23start_mqtt::iot%2Fmessages::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "backend/services/mqtt_subscriber.py#on_message",
      "boundary": "backend/services/mqtt_subscriber.py#start_mqtt",
      "subsystem": "iot/messages",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Broker transport, publisher identity and topic/device/field authority",
    "boundary": "backend/services/mqtt_subscriber.py#start_mqtt",
    "subsystem": "iot/messages",
    "attack_class": "Access control",
    "starting_paths": [
      "backend/services/mqtt_subscriber.py",
      "iot/firmware/agritwin_esp32/telemetry.cpp",
      "iot/mqtt_sensor_simulator.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "PROTOCOLS-RPC-AND-MESSAGING.md#Core discipline",
      "PROTOCOLS-RPC-AND-MESSAGING.md#RPC identity and authorization attack classes",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Broker and queue isolation attack classes",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Universal moves",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "PROTOCOLS-RPC-AND-MESSAGING.md#Framing, schema, and interpretation attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "ATTACK-CLASSES.md#Injection",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Resource and file handling",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Cryptography and secrets",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Business logic",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Wildcard",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Obvious things",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      }
    ],
    "prior_status": "prior_needs_validation",
    "attempts": [],
    "wave": 1,
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_iot",
    "prior_fingerprints": [
      "backend/services/mqtt_subscriber.py:on_message:unbound-device-authority"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    }
  },
  {
    "coverage_id": "backend%2Fservices%2Fmqtt_subscriber.py%23telemetry::backend%2Fdb%2Fdatabase.py%23save_telemetry::iot%2Ftelemetry::ATTACK-CLASSES.md%23Resource%20and%20file%20handling",
    "canonical_refs": {
      "surface": "backend/services/mqtt_subscriber.py#telemetry",
      "boundary": "backend/db/database.py#save_telemetry",
      "subsystem": "iot/telemetry",
      "attack_class": "ATTACK-CLASSES.md#Resource and file handling"
    },
    "surface": "Telemetry validation, storage, replay, state and owner-scoped readback",
    "boundary": "backend/db/database.py#save_telemetry",
    "subsystem": "iot/telemetry",
    "attack_class": "Resource and file handling",
    "starting_paths": [
      "backend/db/database.py",
      "backend/services/device_status_monitor.py",
      "backend/services/dashboard_service.py",
      "backend/db/schema.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Resource and file handling",
    "selected_companion_blocks": [
      "PROTOCOLS-RPC-AND-MESSAGING.md#Core discipline",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Framing, schema, and interpretation attack classes",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Universal moves",
      "PROTOCOLS-RPC-AND-MESSAGING.md#Validation rules",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Universal moves",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "PROTOCOLS-RPC-AND-MESSAGING.md#RPC identity and authorization attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "PROTOCOLS-RPC-AND-MESSAGING.md#Broker and queue isolation attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Computational amplification attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Failure and recovery attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "ATTACK-CLASSES.md#Injection",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Access control",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Cryptography and secrets",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Business logic",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Wildcard",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Obvious things",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      }
    ],
    "prior_status": "prior_needs_validation",
    "attempts": [],
    "wave": 1,
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_iot",
    "prior_fingerprints": [
      "backend/services/mqtt_subscriber.py:on_message:uncontained-message-errors",
      "backend/services/device_status_monitor.py:register_message:unbounded-identity-retention"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    }
  },
  {
    "coverage_id": "iot%2Ffirmware%2Fagritwin_esp32%2Fprovisioning.cpp%23BLE::iot%2Ffirmware%2Fagritwin_esp32%2Fprovisioning.cpp%23provisioningBegin::iot%2Fprovisioning::ATTACK-CLASSES.md%23Cryptography%20and%20secrets",
    "canonical_refs": {
      "surface": "iot/firmware/agritwin_esp32/provisioning.cpp#BLE",
      "boundary": "iot/firmware/agritwin_esp32/provisioning.cpp#provisioningBegin",
      "subsystem": "iot/provisioning",
      "attack_class": "ATTACK-CLASSES.md#Cryptography and secrets"
    },
    "surface": "Nearby peer identity, Wi-Fi credentials and registration lifecycle",
    "boundary": "iot/firmware/agritwin_esp32/provisioning.cpp#provisioningBegin",
    "subsystem": "iot/provisioning",
    "attack_class": "Cryptography and secrets",
    "starting_paths": [
      "iot/firmware/agritwin_esp32/provisioning.cpp",
      "iot/firmware/agritwin_esp32/settings.cpp",
      "agritwin-app/src/services/bleProvisioning.ts",
      "agritwin-app/src/hooks/use-ble-provisioning.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Cryptography and secrets",
    "selected_companion_blocks": [
      "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
      "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Local IPC and exported-component attack classes",
      "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Application-state and device-lifecycle attack classes",
      "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Universal moves",
      "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Deep-link, callback, and navigation attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Webview and native-bridge attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Privileged-helper and local-file attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "ATTACK-CLASSES.md#Injection",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Access control",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Resource and file handling",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Business logic",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Wildcard",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Obvious things",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      }
    ],
    "prior_status": "prior_needs_validation",
    "attempts": [],
    "wave": 1,
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_iot",
    "prior_fingerprints": [
      "agritwin-app/src/services/bleProvisioning.ts:sendWifiSettings:unverified-credential-recipient"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    }
  }
]

**Access control** (subagent_type: `general`)
Verify that a caller cannot do something outside its authority. Go beyond checking whether permission checks exist — verify they check the *right* permission for the *right* resource via the *right* mechanism:
- Is there a path to the same state change that checks a different (weaker) permission?
- Can a field in the request body override what the permission system intended to restrict?
- Are there endpoints that gate on authentication but forget authorization?
- Does the same resource have multiple access paths with inconsistent checks?
- What about bulk/batch/export/import operations — do they enforce per-item permissions?

For complex access models, split into separate agents for auth bypass vs authorization logic.



**Resource and file handling** (subagent_type: `general`)
- Path traversal (reading/writing outside intended directories) — including through symlinks, encoded sequences, and null bytes
- SSRF (making the application fetch attacker-controlled URLs) — including through redirects, DNS rebinding, and URL parser differentials
- Unsafe deserialization, archive extraction (zip slip), temp file handling
- Memory safety (if applicable): buffer overflows, use-after-free, integer overflow
- Race conditions on file operations (TOCTOU between check and use)



**Cryptography and secrets** (subagent_type: `general`)
- Weak randomness for security-critical values (tokens, keys, nonces)
- Hardcoded secrets, secrets in logs, error messages, URLs, or client-visible responses
- Broken key derivation, missing HMAC verification, nonce reuse
- Timing side-channels on secret comparison
- Misuse of crypto primitives (ECB mode, unauthenticated encryption, static IVs, etc.)
- What happens when crypto operations fail? Does the error path fall back to no-crypto?



## Core discipline (include in every agent prompt for this domain)

```
- "Internal" is not authentication. Name the peer identity at every hop and show how it becomes the application principal used for authorization.
- Schema validation proves message shape, not provenance, resource authority, ordering, or safe values. Follow decoded fields to policy and side effects.
- Broker guarantees and application guarantees differ. Write down retry, ordering, acknowledgement, deduplication, and transaction behavior before evaluating state changes.
- Parser disagreement requires two concrete consumers, schema versions, or wire representations and one security-relevant divergent value.
- Use `confirmed` for source-complete paths plus bounded local producer/consumer tests. Use `needs_validation` for broker ACL, service-mesh identity, topic attachment, or compatibility behavior outside the repository.
```



## RPC identity and authorization attack classes (subagent_type: `general`)

**Interceptor and method-path inconsistency**
An authn/authz interceptor applies to unary methods but not streams, reflection, health, gateway-transcoded paths, compatibility services, or individual stream messages. Compare every registration and route to the same operation.

**Peer identity to application-principal confusion**
mTLS, workload identity, bearer metadata, forwarded identity, or broker credentials authenticate a channel, but a caller-controlled field selects the user or tenant. The channel identity and claimed principal must be bound by deterministic policy.

**Per-item and streaming authorization gaps**
A stream, subscription, batch, or bulk message is authorized once, then later items name different resources or continue after role, membership, or token revocation. Re-check where scope can change and bind subscriptions to their original principal.

**Callback and reply-correlation confusion**
Predictable, reused, or cross-tenant correlation IDs let a response, webhook, cancellation, or acknowledgment satisfy another caller's pending operation. Bind each outstanding request to authenticated peer, tenant, operation, and lifecycle.



## Broker and queue isolation attack classes (subagent_type: `general`)

**Topic, routing-key, and subscription scope gaps**
A publisher or subscriber can select another tenant's topic, wildcard, consumer group, partition, reply queue, or dead-letter route. Check broker-enforced ACLs where visible and application-side namespace construction. Tenant text inside a payload is not isolation.

**Dead-letter, retry, and diagnostic disclosure**
Messages routed to dead-letter queues, error topics, tracing, or operator views contain secrets or cross-tenant payloads accessible to a lower-trust consumer. Review policy and redaction at the failure path, not just normal delivery.

**Untrusted producer treated as control plane**
A message body can declare itself an admin event, provider callback, replication record, or migration instruction without an independently authenticated producer and event type. Verify signatures and source/account/audience binding before privileged handling.



## Universal moves (apply across the above)

- Draw producer → broker/transport → gateway → consumer → storage for each message family. At each hop record authenticated peer, authoritative tenant/resource fields, validation, and side effect.
- Feed the same small fixture to every in-repo schema version or language binding. Test duplicate, missing, unknown, boundary, replayed, and reordered messages without producing load.
- Compare normal, retry, dead-letter, replay, migration, reflection, stream, and gateway-transcoded routes. Security policy must survive transport changes.



## Validation rules (apply before reporting ANY finding here)

1. Name the realistic producer or peer, accepted message, authenticated channel identity, affected principal/resource, and unauthorized mutation or disclosure.
2. For disagreement claims, cite both parsers/consumers and the divergent decoded value. Safe rejection by either side prevents confirmation.
3. For replay/order claims, establish actual delivery guarantees and reproduce the invariant failure with a bounded local/in-memory transport.
4. For authorization and isolation, verify all interceptor, broker ACL, gateway, and consumer layers visible in source. External attachments make the candidate `needs_validation`.
5. Return `confirmed` only with the complete message lifecycle and observed meaningful result. Return `needs_validation` with the exact broker, service identity, route, or delivery fact required.


## Framing, schema, and interpretation attack classes (subagent_type: `general`)

**Message boundary and canonicalization disagreement**
Components disagree on length, compression, duplicate fields, unknown fields, encoding, numeric width, normalization, or envelope/body precedence. Compare generated and custom parsers, gateways, language bindings, and version converters. Confirm which principal, resource, or operation differs after decoding.

**Union, enum, and default confusion**
Unknown variants, missing discriminators, zero values, default privileges, or compatibility mappings reach code that assumes a validated case. Review exhaustive dispatch, default branches, and how old consumers interpret newly added fields.

**Envelope and payload identity mismatch**
Authorization uses trusted-looking routing or envelope metadata while the handler acts on a conflicting tenant, account, subject, object, or sender in the body. Identify which source is authoritative and ensure clients cannot override it.



## Replay, ordering, and transaction attack classes (subagent_type: `general`)

**Duplicate delivery and idempotency gaps**
Retries or redelivery repeat a side effect because deduplication is absent, occurs after mutation, or uses a key that collides across tenants or operations. Confirm the broker's delivery model and the side effect that is not naturally idempotent.

**Out-of-order and stale message acceptance**
Older state, revoked membership, canceled work, or pre-step-up authorization arrives after newer state and overwrites it. Review sequence/version checks, tombstones, partition changes, and restore/replay workflows.

**Acknowledgment/commit ordering defects**
Acknowledgment occurs before durable commit and loses security-relevant work, or commit happens before an unreliable acknowledgment and duplicates a mutation. Evaluate transactional outbox/inbox behavior and failure recovery.

**Partial multi-consumer transitions**
Several consumers jointly implement one authorization or business transition, but retries and partial failure leave only a subset committed. Identify invariants that must become durable atomically or compensate with current authorization.



## Core discipline (include in every agent prompt for this domain)

```
- Require an input-to-cost path, a missing effective bound, and impact on another user, shared service, safety function, or operator-owned spend. Self-limiting work in the requester's own process is not a service vulnerability.
- A missing rate limit is not enough. Check body/message/file caps, concurrency, queues, deadlines, database constraints, upstream gateways, and per-tenant quotas before calling a path unbounded.
- Do not run stress, saturation, or production tests. Use asymptotic analysis, small boundary fixtures, mocked paid calls, strict local resource limits, and deterministic cancellation tests.
- State attacker cost, service work, persistence, scope, and recovery. One bounded input with superlinear or persistent shared effect is materially different from sustained volume.
- Use `confirmed` for source-visible bounds failures demonstrated safely. Use `needs_validation` when upstream caps, deployed topology, autoscaling, paid quota, or recovery behavior is outside the repository.
```



## Resource accumulation attack classes (subagent_type: `general`)

**Unbounded buffering and cardinality**
Bodies, out-of-order streams, uploads, sessions, unique cache keys, metrics labels, log fields, subscriptions, or pending jobs accumulate without per-item and aggregate limits. Find cleanup and expiration on disconnect, timeout, cancellation, and partial parse.

**File descriptor, handle, and temporary-resource leaks**
Malformed or canceled work misses cleanup and retains sockets, files, database cursors, timers, subprocesses, temporary files, or object references. Confirm the leak repeats through bounded local iterations and affects a shared pool.

**Detached work after cancellation**
Client timeout, disconnect, canceled job, or failed authorization returns control but leaves database, model, network, or worker work running. Trace cancellation and deadline propagation through every layer.



## Universal moves (apply across the above)

- Build an input-to-resource table: earliest accepted size/cardinality, work before auth, downstream fan-out, persistence, shared pool, limit and cleanup owner, recovery.
- Compare aggregate limits with per-object limits. Ten thousand valid one-byte items may evade a per-message cap while exhausting tenant-wide or process-wide state.
- Validate only in an isolated fixture with strict CPU/memory/time limits and small growth points. Mock external and paid calls and stop once the missing bound or cancellation is observable.



## Validation rules (apply before reporting ANY finding here)

1. Name untrusted input, requester work, service amplification or retained resource, shared blast radius, and recovery. Missing limits without concrete shared impact are hardening.
2. Confirm no source-visible upstream, parser, queue, tenant, or framework bound prevents the path. Unknown deployed controls require `needs_validation`.
3. For superlinear behavior, establish the accepted complexity and bounded local growth. For leaks, show repeatable retention after cleanup should occur. For fatal paths, identify process/supervisor isolation.
4. Prioritize by low requester work, unauthenticated reachability, cross-tenant scope, persistence, and poor recovery; do not validate with availability impact.
5. Return `confirmed` only with safe local proof and meaningful shared effect. Return `needs_validation` with the exact upstream limit, topology, quota, or recovery observation an owner must check.


## Core discipline (include in every agent prompt for this domain)

```
- Establish the realistic local or remote-content attacker: another app, another OS user, a sandboxed child, an untrusted document, or a remote origin. Self-harm within the same account and authority is not a boundary violation.
- Paths, process names, bundle/package IDs, and claimed sender fields are not peer authentication. Use OS peer credentials, code identity, capability handles, or protected channel state.
- The native bridge or helper must authorize each operation and final resource after parsing. A trusted UI or broker does not make attacker-influenceable arguments trusted.
- OS sandbox, signing, entitlements, permissions, keychain ACLs, exported-component policy, and prompt behavior are real controls when pinned and visible.
- Use `confirmed` for source evidence plus bounded local/emulator tests. Use `needs_validation` when signing, manifest merge, OS version, device policy, installer ACL, or packaging is required but not observable.
```



## Local IPC and exported-component attack classes (subagent_type: `general`)

**IPC peer-authentication gaps**
Unix sockets, named pipes, XPC, Binder, D-Bus, native messaging, RPC, shared memory, or loopback listeners accept a lower-trust peer without checking OS credentials, code identity, sandbox token, or channel ownership. Require a meaningful method or disclosure behind the channel.

**Claimed principal versus channel identity**
The authenticated process/channel belongs to one app or user, but request fields select another user, tenant, profile, or capability. Bind each method and resource to the peer credential rather than a caller-declared identifier.

**Exported service, activity, receiver, or provider overreach**
A mobile component or local automation endpoint is externally invokable and performs an operation intended for the app itself. Review final merged manifests, intent filters, permission/signature level, path grants, and alternate aliases. Manifest status unknown after packaging requires `needs_validation`.

**IPC lifecycle and correlation confusion**
Predictable request IDs, reused handles, stale channels, inherited descriptors, world-writable socket paths, or restart behavior lets one peer answer, cancel, or reuse another peer's operation. Review creation permissions and cleanup of socket files, locks, ports, and shared mappings.



## Application-state and device-lifecycle attack classes (subagent_type: `general`)

**Account switch, logout, and device restore leakage**
Cached data, background tasks, widgets, notifications, local databases, webview storage, or biometric approvals survive logout/account change and appear under a later account. Review backup/restore and multi-profile behavior.

**Pending-action and user-presence confusion**
Notification, widget, shortcut, share sheet, biometric prompt, or deferred operation authorizes a different action than displayed, executes after expiry, or uses another profile's pending state. Bind confirmation to normalized action, resource, account, and current foreground state.



## Universal moves (apply across the above)

- Enumerate every process, app component, local endpoint, URI scheme, file association, webview origin, and helper. Record OS identity, runtime privilege, caller, and callable operation.
- Read final packaging inputs: merged manifest, entitlements, installer rules, native-messaging registration, protocol handlers, and ACL creation. Source declarations can be overwritten downstream.
- Validate with dummy profiles and non-sensitive local fixtures on an isolated machine/emulator. Do not interact with other users' apps, credentials, or production services.



## Validation rules (apply before reporting ANY finding here)

1. Name the attacker starting capability, OS/app principal crossed, entry channel, accepted argument or state, and unauthorized operation or disclosure.
2. Confirm OS sandbox, peer credential, signing, entitlement, permission, user-consent, and installer controls that apply. Unknown packaging/runtime facts require `needs_validation`.
3. For webview bridges, cite both navigation/origin control and privileged native sink. For IPC, cite peer authentication and per-resource authorization. For helpers, verify final normalized destination.
4. Keep local tests bounded and use dummy content/accounts. Stop after proving the boundary result; do not extend proof into persistence or broader system modification.
5. Return `confirmed` only with a complete source and local evidence chain. Return `needs_validation` with the exact OS, manifest, signing, ACL, or device-lifecycle fact required.


Excluded blocks with source reasons: [{"block": "PROTOCOLS-RPC-AND-MESSAGING.md#Framing, schema, and interpretation attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "PROTOCOLS-RPC-AND-MESSAGING.md#Replay, ordering, and transaction attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "ATTACK-CLASSES.md#Injection", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Resource and file handling", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Cryptography and secrets", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Business logic", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Feature abuse and data leakage", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Wildcard", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Obvious things", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "PROTOCOLS-RPC-AND-MESSAGING.md#RPC identity and authorization attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "PROTOCOLS-RPC-AND-MESSAGING.md#Broker and queue isolation attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Computational amplification attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Failure and recovery attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "ATTACK-CLASSES.md#Injection", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Access control", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Cryptography and secrets", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Business logic", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Feature abuse and data leakage", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Wildcard", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Obvious things", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Deep-link, callback, and navigation attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Webview and native-bridge attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Privileged-helper and local-file attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "ATTACK-CLASSES.md#Injection", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Access control", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Resource and file handling", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Business logic", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Feature abuse and data leakage", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Wildcard", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Obvious things", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}]

## Defensive vulnerability-finding method

Your goal is to find source-grounded security invariant failures and the smallest fix,
not to expand harm beyond the boundary result. Stay within source review and bounded local execution.
Do not contact deployed endpoints, provider APIs, registries, identity systems,
message brokers, shared services, or other users. Use local dummy data only.

READ THE CODE AT DEPTH. Follow each assigned input through parsing, identity,
authorization, normalization, state, derived copies, and the final sink. Read sibling,
legacy, batch, retry, cancellation, migration, and error paths that produce the same
effect. Compare sibling controls for equivalence, not only presence, and compare what
one component guarantees with what the next component assumes.

WORK FROM A CONCRETE INVARIANT:
1. Name the lower-trust principal and starting capability.
2. Name the accepted value, action, state transition, or resource selector.
3. Locate the control that should reject, bind, isolate, limit, or revoke it.
4. Trace the exact source path after that decision.
5. Stop at the smallest affected dummy record, wrong return value, process-integrity
   effect, or locally observable shared-resource effect.
6. State a source-level change and regression case that enforce the invariant.

DEPTH BOUND: trace only paths that can reach your assigned boundary or whose
guarantees that boundary relies on. Stop a line of investigation as soon as the
invariant is settled either way, and record the result in your structured output —
a covered, candidate, or blocked disposition, or an `uncovered` entry — instead of
continuing to search.

TEST SAD PATHS AND DISAGREEMENTS. Check absent, empty, zero, negative, maximum,
over-limit, duplicate, mixed encoding, stale, revoked, reordered, concurrent,
partially migrated, failed dependency, and rollback state only where the interface
accepts them. Compare canonicalization and units at every parser or policy handoff.
For multi-step issues, treat each output as a prerequisite and do not assume a later
boundary. If any prerequisite is not established, record a blocker.

When a proposed high or critical candidate reveals a reusable root cause, search paths
owned by the assigned coverage IDs for lexical, structural, and logical variants.
Consolidate the same root cause, but establish each variant's conditions and impact
independently. Do not investigate peer-owned units. Return a variant with no current
coverage unit as `uncovered`.

USE THE NARROWEST LOCAL CHECK THAT SETTLES THE CLAIM. Target-controlled builds,
tests, processes, browsers, emulators, fuzzers, and fixture processing may run only
inside the parent-approved OS-enforced sandbox. It must disable external networking,
start from an empty allowlisted environment, expose target and tools read-only, permit
writes only to your scratch directory, and apply low CPU, memory, process, file-size,
disk, and wall-clock limits. Isolated loopback is allowed only for a local fixture.
If any control is unavailable, do not execute: return needs_validation with that exact
blocker. Prefer an existing unit test, minimal function harness, dummy-tenant service
call, small malformed fixture, deterministic race schedule, or locally rendered policy.
Do not install or fetch tools.

Record the exact input, command, limits, and minimum result. For the environment,
record only allowlisted variable names and safe non-secret values needed to reproduce
the check. Never capture the ambient environment, inherited variables, credentials,
authentication state, or unrelated host paths. The target-controlled process writes
only in scratch. After the sandbox and all its processes terminate, only trusted
parent-side code may promote predeclared scratch-relative files, following the
promotion procedure block included verbatim in this prompt. You and target code never
write retained artifacts. If promotion is unavailable or fails for decisive evidence,
return needs_validation with the exact promotion blocker.
Never stress availability, invoke a live target, use a real credential, publish an
artifact, or continue past the minimum observed effect.

A deployment, browser, provider, broker, OS, proxy, package, secret, or identity fact
outside source is not proof either way. If one such fact is decisive, return a
needs_validation record with the exact missing observation and safe owner-observed check.


Artifact promotion procedure (trusted parent-side code only):
Reference only for you: the parent performs these steps; you never perform them.

Before execution, the parent opens and retains trusted, non-inheritable directory
descriptors for the agent's scratch/ and artifacts/ roots, and records an allowlist
of expected scratch-relative artifact files plus explicit per-file and cumulative
byte limits. Never pass those descriptors to the agent or sandbox. After the sandbox
and all its processes terminate, trusted parent-side code promotes each allowlisted
file separately:

1. Validate the declared relative path: reject absolute, empty, `.`, `..`, or
   symlinked components.
2. Walk each parent component from the retained scratch-root descriptor with
   no-follow directory-relative operations; never reopen by path.
3. Open the leaf no-follow and nonblocking.
4. Verify with `fstat` that it is a regular file with link count exactly one and
   within the recorded per-file and cumulative byte limits.
5. Enforce those limits again while reading from that descriptor.
6. Copy exactly the verified size, repeat `fstat`, and reject a changed identity,
   type, link count, or size.
7. For the destination, walk every parent component from the retained
   artifacts-root descriptor with no-follow directory-relative operations; require
   each existing component to be a real directory, and create any missing directory
   exclusively before reopening and verifying it no-follow.
8. Create the leaf exclusively without following links, verify that the opened
   destination is a regular file with link count exactly one, and copy from the
   verified source descriptor without reopening either path.
9. Use equivalent race-safe APIs on non-POSIX systems.
10. Never recursively copy or glob scratch, extract an archive into artifacts, or
    open or promote a symlink, FIFO, socket, device, directory, hard-linked file,
    changing file, or file that exceeds its bound.
11. If any check is unavailable, cannot be enforced, or fails, discard the scratch
    entry; if it is decisive evidence, retain `needs_validation` with the exact
    promotion blocker.


## Candidate gate

1. A candidate needs a complete repository-relative source trace and evidence for the
   claimed root cause, including the strongest source-visible control.
2. A proposed confirmed record needs a bounded local observed result, meaningful impact
   across a stated boundary, complete conditions, and no visible preventing layer.
3. Do not strengthen a crash into code execution, ordinary work into shared availability,
   or a same-principal action into privilege gain.
4. If a required fact is not source-visible or locally observable, use
   needs_validation. Name exact blockers; do not give it severity or speculative completion.
5. A missing best practice with no affected principal/resource is excluded or hardening,
   not a finding. A candidate disproved by source is not needs_validation.
6. Use the same source-derived fingerprint for the same root cause in every state.
   It must match `^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$` and must not include a line,
   wave, agent, severity, or verdict.
7. Return an empty candidate array when nothing survives these gates.


No carried confirmed exclusions. Existing prior candidates are only leads: independently recheck current controls, do not silently carry or confirm them. Peer IDs: [".github%2Fworkflows%2Fgarden_tasks.yml%23scheduled-post::backend%2Fapi%2Fv1%2Ftasks.py%23generate_tasks::repository%2Fcron::ATTACK-CLASSES.md%23Business%20logic", ".github%2Fworkflows%2Fgenerate-costs-csv.yml%23issues::scripts%2Fgenerate_costs_csv.py%23write_csv-write_xlsx::repository%2Freport-automation::ATTACK-CLASSES.md%23Injection", "agritwin-app%2Fsrc%2Fapp%2Fauth%2Foauth-callback.tsx%23links::agritwin-app%2Fsrc%2Fcomponents%2Ffield-location%2FMapCanvas.tsx%23bridge::agritwin-app%2Frendering::ATTACK-CLASSES.md%23Injection", "agritwin-app%2Fsrc%2Fapp%2Fedit-field.tsx%23cached-forms::agritwin-app%2Fsrc%2Fservices%2FqueryKeys.ts%23field-and-page::agritwin-app%2Fforms::ATTACK-CLASSES.md%23Access%20control", "agritwin-app%2Fsrc%2Fcomponents%2FFieldFormSteps.tsx%23sections::agritwin-app%2Fsrc%2Futils%2FfieldFormValidation.ts%23fieldFormErrors::agritwin-app%2Fforms::ATTACK-CLASSES.md%23Injection", "agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23session::agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23clearAuth::agritwin-app%2Fsession::ATTACK-CLASSES.md%23Access%20control", "backend%2Fapi%2Fv1%2Fauth.py%23identity-lifecycle::backend%2Fapi%2Fv1%2Fauth.py%23get_current_user::backend%2Fauth::ATTACK-CLASSES.md%23Access%20control", "backend%2Fapi%2Fv1%2Fcontent_market.py%23uploads::backend%2Fservices%2Fsupabase_storage_service.py%23uploads::backend%2Fuploads::ATTACK-CLASSES.md%23Resource%20and%20file%20handling", "backend%2Fapi%2Fv1%2Ffield_recommendations.py%23translation::backend%2Fservices%2Ftranslation_service.py%23translate::backend%2Fai-output::ATTACK-CLASSES.md%23Injection", "backend%2Fapi%2Fv1%2Ffields.py%23field-writes::backend%2Fapi%2Fv1%2Ffields.py%23owner-update::backend%2Fagricultural-data::ATTACK-CLASSES.md%23Access%20control", "backend%2Fapi%2Fv1%2Ffields.py%23geocode_location::backend%2Fservices%2Fgeocode_service.py%23_request::backend%2Fgeocoding-work::ATTACK-CLASSES.md%23Resource%20and%20file%20handling", "backend%2Fapi%2Fv1%2Fpayments.py%23payment-initiation::backend%2Fservices%2Fpayment_service.py%23price::backend%2Fpayments::ATTACK-CLASSES.md%23Business%20logic", "backend%2Fapi%2Fv1%2Fweather.py%23forecast::backend%2Fservices%2Fweather_service.py%23_request::backend%2Fweather-provider-work::ATTACK-CLASSES.md%23Resource%20and%20file%20handling", "backend%2Fmain.py%23owned-api::backend%2Fapi%2Fv1%2Ffields.py%23_require_owned_field::backend%2Fagricultural-data::ATTACK-CLASSES.md%23Access%20control", "backend%2Fmain.py%23provider-work::backend%2Fapi%2Fv1%2Ftasks.py%23verify_cron_secret::backend%2Fprovider-work::ATTACK-CLASSES.md%23Business%20logic", "backend%2Fmain.py%23public-api::backend%2Fapi%2Fv1%2Fuser.py%23router::backend%2Fshared-content::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage", "cloud-and-ci%23release::backend%2FDockerfile%23runtime::release::ATTACK-CLASSES.md%23Access%20control", "git%23history-and-lockfiles::git%23tracked-source::repository::ATTACK-CLASSES.md%23Cryptography%20and%20secrets"]

Target /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/AGRITWIN. Agent ID hunt_iot. Only writable area /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/security-reviews/run-2026-11-20-security-audit/agents/hunt_iot/scratch. Parent-owned artifacts /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/security-reviews/run-2026-11-20-security-audit/agents/hunt_iot/artifacts; promotion allowlist empty, zero bytes. No target execution or network. No shared/target edits. Do not delegate. Save exact JSON response to your scratch/result.json; return same JSON. All source checks artifact:null. Prioritize concise source traces and real security boundaries; no artificial cap on candidates. Read changed source relevant to assigned units since 4e8be50. Existing 401 retry handling changed significantly; recheck old hypotheses.

## Structured hunter result

Return exactly one JSON object, with no surrounding prose:

```json
{
  "units": [
    {
      "coverage_id": "one assigned ID",
      "disposition": "covered|candidate|blocked",
      "reviewed_paths": ["repo/relative/path"],
      "checks": [
        {
          "agent_id": "canonical owner of this check",
          "reviewed_paths": ["repo/relative/path owned by this check"],
          "invariant": "specific control checked for this unit",
          "method": "source|local",
          "result": "what source or the bounded check established",
          "artifact": "agents/<agent-id>/artifacts/file for local, null for source"
        }
      ],
      "candidate_fingerprints": [],
      "unresolved": []
    }
  ],
  "candidates": [],
  "hardening": ["concrete non-finding note"],
  "uncovered": [
    {
      "surface": "...",
      "boundary": "...",
      "subsystem": "...",
      "attack_class": "...",
      "starting_paths": ["repo/relative/path"],
      "reason": "why this needs its own deterministic coverage unit"
    }
  ]
}
```

Each `candidates` entry is schema-shaped except that it uses `proposed_verdict` in place of `verdict`:

- `proposed_verdict: "confirmed"`: include every field required by the `confirmed` branch of `report-schema.json` other than `verdict`: `fingerprint`, title, description, `root_cause`, `intended_behavior`, ordered `trace`, `evidence`, `conditions`, target-neutral `execution`, `remediation`, `severity`, and `confidence`. The execution instructions describe only the bounded local check already performed. `payloads` holds the minimum test input, fixture, or native invocation. `observed_result` records actual local output. Overall severity must not exceed observed impact.
- `proposed_verdict: "needs_validation"`: include every field required by that schema branch other than `verdict`: `fingerprint`, title, description, `claimed_root_cause`, ordered `trace`, `evidence`, nonempty `blockers`, and `validation_plan` with at least one applicable `local` or `deployment` step. Do not invent an inapplicable context. Do not include severity, execution, remediation, reason, or a confirmed `root_cause`. `deployment` is an owner-observed check, not a request to probe a live target.

Every assigned coverage ID appears exactly once in `units`. A `covered` unit needs an owner, nonempty `reviewed_paths` and `checks`, no unresolved fact, and no candidate. A `candidate` unit has the same owned evidence and is the only state that carries linked fingerprints. A `blocked` unit is an owned partial review with nonempty paths, checks, and unresolved facts but no fingerprint. All source paths are repository-relative, never absolute or traversal paths. A trace with several entries begins at `entrypoint`, ends at `sink`, and labels intermediate steps `propagation`. Every check has its own canonical lowercase `agent_id` and nonempty `reviewed_paths`; the unit-level list is exactly the union of those owned paths. A `source` check uses `artifact: null`. A `local` check uses one successfully parent-promoted regular file beneath `agents/<check.agent_id>/artifacts/`; this permits a verifier to add independently owned evidence without taking ownership from the hunter. Never link scratch, an output-root file, or another check owner's artifact.



{
  "$comment": "Top-level contract for findings.json. validate-findings.cjs interprets and checks this schema directly.",
  "type": "array",
  "items": {
    "oneOf": [
      {
        "type": "object",
        "description": "A source-grounded vulnerability that was independently demonstrated.",
        "properties": {
          "verdict": {
            "type": "string",
            "const": "confirmed"
          },
          "fingerprint": {
            "type": "string",
            "minLength": 1,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$",
            "description": "A stable source-derived identifier that does not change between validation states."
          },
          "title": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "description": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "root_cause": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "intended_behavior": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "trace": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": {
              "type": "object",
              "properties": {
                "kind": {
                  "type": "string",
                  "enum": ["entrypoint", "propagation", "sink"]
                },
                "file": {
                  "type": "string",
                  "minLength": 1
                },
                "line": {
                  "type": "integer",
                  "minimum": 1
                },
                "scope": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                },
                "description": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                }
              },
              "required": ["kind", "file", "line", "scope", "description"],
              "additionalProperties": false
            }
          },
          "evidence": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": {
              "type": "object",
              "properties": {
                "file": {
                  "type": "string",
                  "minLength": 1
                },
                "line": {
                  "type": "integer",
                  "minimum": 1
                },
                "description": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                }
              },
              "required": ["file", "line", "description"],
              "additionalProperties": false
            }
          },
          "conditions": {
            "type": "array",
            "uniqueItems": true,
            "items": {
              "type": "object",
              "properties": {
                "kind": {
                  "type": "string",
                  "enum": ["authentication_level", "authorization_role", "user_interaction", "system_configuration", "network_routing", "environmental_dependency", "data_state", "timing_dependency", "third_party_dependency"]
                },
                "description": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                }
              },
              "required": ["kind", "description"],
              "additionalProperties": false
            }
          },
          "execution": {
            "type": "object",
            "description": "Target-neutral reproduction in the target's native interface.",
            "properties": {
              "attacker_perspective": {
                "type": "string",
                "minLength": 1,
                "visibleContent": true
              },
              "payloads": {
                "type": "array",
                "minItems": 1,
                "uniqueItems": true,
                "items": {
                  "type": "string"
                }
              },
              "instructions": {
                "type": "array",
                "minItems": 1,
                "items": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                }
              },
              "observed_result": {
                "type": "string",
                "minLength": 1,
                "visibleContent": true
              }
            },
            "required": ["attacker_perspective", "payloads", "instructions", "observed_result"],
            "additionalProperties": false
          },
          "remediation": {
            "type": "object",
            "properties": {
              "strategy": {
                "type": "string",
                "minLength": 1,
                "visibleContent": true
              },
              "code_changes": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "file_name": {
                      "type": "string",
                      "minLength": 1
                    },
                    "fixed_code": {
                      "type": "string"
                    }
                  },
                  "required": ["file_name", "fixed_code"],
                  "additionalProperties": false
                }
              }
            },
            "required": ["strategy"],
            "additionalProperties": false
          },
          "severity": {
            "type": "object",
            "properties": {
              "likelihood": {
                "type": "object",
                "properties": {
                  "score": {
                    "type": "string",
                    "enum": ["informational", "low", "medium", "high", "critical"]
                  },
                  "reason": {
                    "type": "string",
                    "minLength": 1,
                    "visibleContent": true
                  }
                },
                "required": ["score", "reason"],
                "additionalProperties": false
              },
              "impact": {
                "type": "object",
                "properties": {
                  "score": {
                    "type": "string",
                    "enum": ["informational", "low", "medium", "high", "critical"]
                  },
                  "reason": {
                    "type": "string",
                    "minLength": 1,
                    "visibleContent": true
                  }
                },
                "required": ["score", "reason"],
                "additionalProperties": false
              },
              "overall_severity": {
                "type": "string",
                "enum": ["informational", "low", "medium", "high", "critical"]
              }
            },
            "required": ["likelihood", "impact", "overall_severity"],
            "additionalProperties": false
          },
          "confidence": {
            "type": "object",
            "properties": {
              "score": {
                "type": "string",
                "enum": ["low", "medium", "high"]
              },
              "reason": {
                "type": "string",
                "minLength": 1,
                "visibleContent": true
              }
            },
            "required": ["score", "reason"],
            "additionalProperties": false
          }
        },
        "required": ["verdict", "fingerprint", "title", "description", "root_cause", "intended_behavior", "trace", "evidence", "conditions", "execution", "remediation", "severity", "confidence"],
        "additionalProperties": false
      },
      {
        "type": "object",
        "description": "A source-grounded candidate whose decisive validation is blocked.",
        "properties": {
          "verdict": {
            "type": "string",
            "const": "needs_validation"
          },
          "fingerprint": {
            "type": "string",
            "minLength": 1,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$"
          },
          "title": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "description": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "claimed_root_cause": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "trace": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": {
              "type": "object",
              "properties": {
                "kind": {
                  "type": "string",
                  "enum": ["entrypoint", "propagation", "sink"]
                },
                "file": {
                  "type": "string",
                  "minLength": 1
                },
                "line": {
                  "type": "integer",
                  "minimum": 1
                },
                "scope": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                },
                "description": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                }
              },
              "required": ["kind", "file", "line", "scope", "description"],
              "additionalProperties": false
            }
          },
          "evidence": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": {
              "type": "object",
              "properties": {
                "file": {
                  "type": "string",
                  "minLength": 1
                },
                "line": {
                  "type": "integer",
                  "minimum": 1
                },
                "description": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                }
              },
              "required": ["file", "line", "description"],
              "additionalProperties": false
            }
          },
          "blockers": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": {
              "type": "string",
              "minLength": 1,
              "visibleContent": true
            }
          },
          "validation_plan": {
            "type": "object",
            "properties": {
              "local": {
                "type": "string",
                "minLength": 1,
                "visibleContent": true
              },
              "deployment": {
                "type": "string",
                "minLength": 1,
                "visibleContent": true
              }
            },
            "additionalProperties": false
          }
        },
        "required": ["verdict", "fingerprint", "title", "description", "claimed_root_cause", "trace", "evidence", "blockers", "validation_plan"],
        "additionalProperties": false
      },
      {
        "type": "object",
        "description": "A source-grounded candidate refuted during validation.",
        "properties": {
          "verdict": {
            "type": "string",
            "const": "rejected"
          },
          "fingerprint": {
            "type": "string",
            "minLength": 1,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$"
          },
          "title": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "description": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "claimed_root_cause": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          },
          "trace": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": {
              "type": "object",
              "properties": {
                "kind": {
                  "type": "string",
                  "enum": ["entrypoint", "propagation", "sink"]
                },
                "file": {
                  "type": "string",
                  "minLength": 1
                },
                "line": {
                  "type": "integer",
                  "minimum": 1
                },
                "scope": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                },
                "description": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                }
              },
              "required": ["kind", "file", "line", "scope", "description"],
              "additionalProperties": false
            }
          },
          "evidence": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": {
              "type": "object",
              "properties": {
                "file": {
                  "type": "string",
                  "minLength": 1
                },
                "line": {
                  "type": "integer",
                  "minimum": 1
                },
                "description": {
                  "type": "string",
                  "minLength": 1,
                  "visibleContent": true
                }
              },
              "required": ["file", "line", "description"],
              "additionalProperties": false
            }
          },
          "reason": {
            "type": "string",
            "minLength": 1,
            "visibleContent": true
          }
        },
        "required": ["verdict", "fingerprint", "title", "description", "claimed_root_cause", "trace", "evidence", "reason"],
        "additionalProperties": false
      }
    ]
  }
}
