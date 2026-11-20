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
    "coverage_id": "agritwin-app%2Fsrc%2Fapp%2Fauth%2Foauth-callback.tsx%23links::agritwin-app%2Fsrc%2Fcomponents%2Ffield-location%2FMapCanvas.tsx%23bridge::agritwin-app%2Frendering::ATTACK-CLASSES.md%23Injection",
    "canonical_refs": {
      "surface": "agritwin-app/src/app/auth/oauth-callback.tsx#links",
      "boundary": "agritwin-app/src/components/field-location/MapCanvas.tsx#bridge",
      "subsystem": "agritwin-app/rendering",
      "attack_class": "ATTACK-CLASSES.md#Injection"
    },
    "surface": "Rendering, callback binding, map HTML/messages and native/external navigation",
    "boundary": "agritwin-app/src/components/field-location/MapCanvas.tsx#bridge",
    "subsystem": "agritwin-app/rendering",
    "attack_class": "Injection",
    "starting_paths": [
      "agritwin-app/src/components/SocialLoginButtons.tsx",
      "agritwin-app/src/app/auth/oauth-callback.tsx",
      "agritwin-app/src/components/field-location",
      "agritwin-app/src/components/checkout-form.web.tsx",
      "agritwin-app/src/services/bleProvisioning.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Injection",
    "selected_companion_blocks": [
      "CLIENT-SIDE.md#Core discipline",
      "CLIENT-SIDE.md#DOM and object-state attack classes",
      "CLIENT-SIDE.md#Cross-origin messaging and network attack classes",
      "CLIENT-SIDE.md#Universal moves",
      "CLIENT-SIDE.md#Validation rules",
      "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline",
      "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Deep-link, callback, and navigation attack classes",
      "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Webview and native-bridge attack classes",
      "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Universal moves",
      "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "CLIENT-SIDE.md#Service-worker and browser-storage attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "CLIENT-SIDE.md#Cross-site information leak classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "CLIENT-SIDE.md#UI-redress and navigation attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Local IPC and exported-component attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Privileged-helper and local-file attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Application-state and device-lifecycle attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
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
    "assigned_owner": "hunt_client",
    "prior_fingerprints": [
      "agritwin-app/src/app/auth/oauth-callback.tsx:unbound_native_ticket"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    }
  },
  {
    "canonical_refs": {
      "surface": "agritwin-app/src/app/edit-field.tsx#cached-forms",
      "boundary": "agritwin-app/src/services/queryKeys.ts#field-and-page",
      "subsystem": "agritwin-app/forms",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Changed cached forms, polling and principal/state boundaries",
    "boundary": "agritwin-app/src/services/queryKeys.ts#field-and-page",
    "attack_class": "Access control",
    "starting_paths": [
      "agritwin-app/src/app/create-field.tsx",
      "agritwin-app/src/app/edit-field.tsx",
      "agritwin-app/src/services/queries.ts",
      "agritwin-app/src/app/field-data.tsx"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "CLIENT-SIDE.md#Core discipline",
      "CLIENT-SIDE.md#Service-worker and browser-storage attack classes",
      "CLIENT-SIDE.md#Universal moves",
      "CLIENT-SIDE.md#Validation rules",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "CLIENT-SIDE.md#DOM and object-state attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "CLIENT-SIDE.md#Cross-origin messaging and network attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "CLIENT-SIDE.md#Cross-site information leak classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "CLIENT-SIDE.md#UI-redress and navigation attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      }
    ],
    "subsystem": "agritwin-app/forms",
    "coverage_id": "agritwin-app%2Fsrc%2Fapp%2Fedit-field.tsx%23cached-forms::agritwin-app%2Fsrc%2Fservices%2FqueryKeys.ts%23field-and-page::agritwin-app%2Fforms::ATTACK-CLASSES.md%23Access%20control",
    "prior_status": "prior_covered_changed_source",
    "attempts": [],
    "wave": 1,
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_client",
    "prior_fingerprints": []
  },
  {
    "canonical_refs": {
      "surface": "agritwin-app/src/components/FieldFormSteps.tsx#sections",
      "boundary": "agritwin-app/src/utils/fieldFormValidation.ts#fieldFormErrors",
      "subsystem": "agritwin-app/forms",
      "attack_class": "ATTACK-CLASSES.md#Injection"
    },
    "surface": "Form/rendering/input changes and responsive siblings",
    "boundary": "agritwin-app/src/utils/fieldFormValidation.ts#fieldFormErrors",
    "attack_class": "Injection",
    "starting_paths": [
      "agritwin-app/src/components/FieldFormSteps.tsx",
      "agritwin-app/src/components/FieldOptionChips.tsx",
      "agritwin-app/src/utils/fieldFormValidation.ts",
      "agritwin-app/src/styles/responsive.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Injection",
    "selected_companion_blocks": [
      "CLIENT-SIDE.md#Core discipline",
      "CLIENT-SIDE.md#DOM and object-state attack classes",
      "CLIENT-SIDE.md#Universal moves",
      "CLIENT-SIDE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "CLIENT-SIDE.md#Cross-origin messaging and network attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "CLIENT-SIDE.md#Service-worker and browser-storage attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "CLIENT-SIDE.md#Cross-site information leak classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "CLIENT-SIDE.md#UI-redress and navigation attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      }
    ],
    "subsystem": "agritwin-app/forms",
    "coverage_id": "agritwin-app%2Fsrc%2Fcomponents%2FFieldFormSteps.tsx%23sections::agritwin-app%2Fsrc%2Futils%2FfieldFormValidation.ts%23fieldFormErrors::agritwin-app%2Fforms::ATTACK-CLASSES.md%23Injection",
    "prior_status": "prior_covered_changed_source",
    "attempts": [],
    "wave": 1,
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_client",
    "prior_fingerprints": []
  },
  {
    "coverage_id": "agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23session::agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23clearAuth::agritwin-app%2Fsession::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "agritwin-app/src/services/auth.ts#session",
      "boundary": "agritwin-app/src/services/auth.ts#clearAuth",
      "subsystem": "agritwin-app/session",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Account switching, logout, asynchronous requests and cache persistence",
    "boundary": "agritwin-app/src/services/auth.ts#clearAuth",
    "subsystem": "agritwin-app/session",
    "attack_class": "Access control",
    "starting_paths": [
      "agritwin-app/src/services/auth.ts",
      "agritwin-app/src/services/queryPersistence.ts",
      "agritwin-app/src/services/gardenPicker.ts",
      "agritwin-app/src/services/queries.ts"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "CLIENT-SIDE.md#Core discipline",
      "CLIENT-SIDE.md#Service-worker and browser-storage attack classes",
      "CLIENT-SIDE.md#Universal moves",
      "CLIENT-SIDE.md#Validation rules",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "CLIENT-SIDE.md#DOM and object-state attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "CLIENT-SIDE.md#Cross-origin messaging and network attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "CLIENT-SIDE.md#Cross-site information leak classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "CLIENT-SIDE.md#UI-redress and navigation attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes",
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
    "assigned_owner": "hunt_client",
    "prior_fingerprints": [
      "agritwin-app/src/services/auth.ts:refreshAuth_late_session_commit",
      "agritwin-app/src/services/auth.ts:authenticatedFetch_cross_account_retry",
      "agritwin-app/src/services/gardenPicker.ts:late_response_current_account_cache_key"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [
        "agritwin-app/src/services/auth.ts",
        "agritwin-app/src/services/queries.ts"
      ],
      "4e8be50": [
        "agritwin-app/src/services/auth.ts",
        "agritwin-app/src/services/queries.ts"
      ]
    }
  }
]

**Injection** (subagent_type: `general`)
Trace untrusted input from entry point to dangerous sink. What counts as a "dangerous sink" depends on the application:
- Web apps: SQL queries, HTML output, shell commands, template engines, file paths, HTTP redirects, deserialization
- Libraries: any function that processes caller-supplied data without validation — buffer operations, parsers, format strings
- CLI tools: shell command construction, file path handling, environment variable interpolation
- Services: query construction, message serialization, log injection, LDAP/XPATH queries
- Client-side (browser/JS): DOM XSS, prototype pollution, `postMessage`/origin trust, and other browser-side classes — covered by the [CLIENT-SIDE.md](CLIENT-SIDE.md) companion blocks when selected

Do not stop at the obvious direct paths. Look for indirect injection: data stored safely, then retrieved and used in a dangerous context by different code. Look for injection through field names, keys, headers, and metadata — not just values. Look for injection into secondary systems (logs, caches, search indexes, analytics).



**Access control** (subagent_type: `general`)
Verify that a caller cannot do something outside its authority. Go beyond checking whether permission checks exist — verify they check the *right* permission for the *right* resource via the *right* mechanism:
- Is there a path to the same state change that checks a different (weaker) permission?
- Can a field in the request body override what the permission system intended to restrict?
- Are there endpoints that gate on authentication but forget authorization?
- Does the same resource have multiple access paths with inconsistent checks?
- What about bulk/batch/export/import operations — do they enforce per-item permissions?

For complex access models, split into separate agents for auth bypass vs authorization logic.



## Core discipline (include in every agent prompt for this domain)

```
- A client-side candidate needs a controllable source and an executing or disclosing sink. Name both and show attacker-influenced data reaching the sink.
- The impact must reach a victim's session, another origin, or shared persistence. Self-injection and disclosure of the attacker's own data are not findings.
- Framework escaping, browser same-origin policy, CSP, COOP/CORP, service-worker scope, and modern noopener defaults are real controls. Verify them before assigning impact.
- Browser storage and caches are shared by origin and may outlive login state. Identify who writes, who reads, and which account, tenant, or worker lifecycle clears each record.
- Use `confirmed` only for complete source evidence plus bounded local browser tests. Use `needs_validation` when renderer, extension permission, deployed header, or browser-policy behavior is required but unavailable.
```



## DOM and object-state attack classes (subagent_type: `general`)

**DOM-based XSS**
Trace `location` fields, `document.referrer`, `window.name`, message data, storage, and browser-controlled document state into `innerHTML`, `outerHTML`, `document.write`, string-evaluating APIs, executable URLs, jQuery HTML APIs, or framework escape hatches. Interpolation escaped by the framework is not a finding.

**DOM clobbering**
Attacker-injected `id` or `name` attributes shadow a global, form property, configuration object, or initialization flag later trusted by code. Require both a markup path that preserves the attribute and a security-relevant use of the clobbered value.

**Prototype pollution and gadget chain**
An attacker-controlled key reaches a recursive write such as deep merge or path assignment and modifies prototype state. Then a reachable gadget consumes the polluted property to change authorization, execution, navigation, or rendering. `JSON.parse`, a shallow copy, or pollution without a gadget is not enough.



## Cross-origin messaging and network attack classes (subagent_type: `general`)

**`postMessage` origin and source trust**
A handler performs a sensitive action with `event.data` without an exact origin allowlist and, where multiple frames share an origin, the expected `event.source`. On the send side, sensitive data sent to `*` reaches an unintended embedder. Weak substring, prefix, suffix, or unanchored-regex origin matching is not an origin check.

**Cross-site WebSocket request use**
A WebSocket upgrade accepts ambient cookies from an untrusted origin without an `Origin` check or channel-specific token, allowing the victim's session to read or mutate data. Confirm both the upgrade behavior and a security-relevant message handler.

**Credentialed CORS trust**
The server reflects or weakly matches `Origin` while allowing credentials and returns sensitive responses. A bare wildcard with credentials is rejected by browsers; report only the actual reflected/allowed origin path and cross-origin data or mutation.



## Universal moves (apply across the above)

- Start from DOM, navigation, worker, message, and storage sinks, then trace backward to browser-only and server-controlled sources. Record the browser policy that should stop the path.
- Test account switch, logout, worker update, offline fallback, and stale-tab state with a local test origin and dummy accounts. Do not use production users, origins, or shared services.
- For XS-Leaks, list only predicates proved by source and local browser behavior. Then identify the response headers or rendering choice that would remove the oracle.



## Validation rules (apply before reporting ANY finding here)

1. Cite the source, sink, browser policy, affected origin/session, and observable mutation or disclosure.
2. For prototype pollution, prove the recursive write and a security-relevant gadget. For DOM clobbering, prove the markup survives and the shadowed value is used.
3. For service workers and storage, prove lifecycle reachability: an attacker-controlled write or cache entry must reach a different account, tenant, or later authorization state.
4. For messaging, CORS, WebSocket, and XS-Leaks, show exact origin/source validation and the protected state or action exposed. Confirm that CSP, COOP/CORP, cookies, and SameSite policy do not already block it.
5. Return `confirmed` findings only with a complete client path and bounded local evidence. Return `needs_validation` with the precise deployed header, extension permission, browser version, or renderer behavior an owner must verify.


## Core discipline (include in every agent prompt for this domain)

```
- Establish the realistic local or remote-content attacker: another app, another OS user, a sandboxed child, an untrusted document, or a remote origin. Self-harm within the same account and authority is not a boundary violation.
- Paths, process names, bundle/package IDs, and claimed sender fields are not peer authentication. Use OS peer credentials, code identity, capability handles, or protected channel state.
- The native bridge or helper must authorize each operation and final resource after parsing. A trusted UI or broker does not make attacker-influenceable arguments trusted.
- OS sandbox, signing, entitlements, permissions, keychain ACLs, exported-component policy, and prompt behavior are real controls when pinned and visible.
- Use `confirmed` for source evidence plus bounded local/emulator tests. Use `needs_validation` when signing, manifest merge, OS version, device policy, installer ACL, or packaging is required but not observable.
```



## Deep-link, callback, and navigation attack classes (subagent_type: `general`)

**Custom-scheme and deep-link ambiguity**
Another app or page can invoke a route that mutates state, imports data, completes authentication, or selects an account without a current-session and one-time callback binding. Review URI normalization, duplicate query fields, scheme/host/path matching, exported activity/handler policy, and stale/replayed links.

**App and account handoff confusion**
OAuth, SSO, magic-link, invite, device pairing, passwordless, or payment callbacks return to the wrong installed app, profile, tenant, or pending transaction. Bind state to the initiating app identity, current session, account, provider, operation, and expiry.

**File-open and intent authority confusion**
An associated file, share intent, drag/drop item, pasteboard/clipboard record, notification action, or open-file event triggers a privileged operation without confirming content type, sender trust where applicable, current user intent, and final target.



## Webview and native-bridge attack classes (subagent_type: `general`)

**Navigation-origin to bridge confusion**
Remote or attacker-controlled frames can reach a JavaScript/native bridge intended only for packaged content. Validate origin at call time and after every navigation, redirect, subframe creation, popup, and error/fallback page. URL-prefix checks and initial-load checks are insufficient.

**Over-broad native bridge capabilities**
Web content can select arbitrary files, commands, IPC methods, credentials, or system actions through a generic bridge. Check method allowlists, normalized arguments, user/tenant authority, gesture/confirmation requirements, and return-value disclosure.

**Webview file and universal access**
Remote content can read app-local files, privileged custom schemes, or internal origins because file access, universal access, mixed content, debug interfaces, or custom protocol handlers join origins unexpectedly. Missing a restrictive setting without reachable protected content is hardening.



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


## Service-worker and browser-storage attack classes (subagent_type: `general`)

**Service-worker registration and scope takeover**
Attacker-influenceable content can become the registered worker script, control a path that receives an over-broad `Service-Worker-Allowed` scope, or alter update imports without integrity control. Verify the final script URL, response MIME type, origin, scope, and who controls every imported script. A normal same-origin worker with intended scope is not a defect.

**Service-worker cache and identity confusion**
The worker caches personalized responses without including account, tenant, authorization state, or request mode in its policy, then serves them after account switch or logout. Review fetch-event routing, cache names and keys, navigation fallbacks, cache cleanup, and whether error/offline paths return another user's prior response.

**Browser-storage disclosure and stale authorization**
Tokens, private responses, draft data, or authorization decisions remain in `localStorage`, `sessionStorage`, IndexedDB, Cache Storage, extension storage, or client state and become readable by another account or less-trusted same-origin component. Storage of a token alone is not a finding; require a realistic reader with less authority, or continued use after revocation/logout.

**Cross-context storage and broadcast confusion**
`storage` events, `BroadcastChannel`, shared workers, or origin-wide caches carry identity or commands between tabs without binding them to the current session. Check account switching, private/public windows, tenant changes, and stale tabs that can overwrite newer auth state.



## Core discipline (include in every agent prompt for this domain)

```
- A tenant or owner field on a record is not isolation. Find the query, key, path, policy, or row-level control that enforces it for each read and write path.
- Trace derived copies. Sanitized primary data can become unsafe in search, cache, analytics, export, previews, logs, replicas, and backups with different ACL and retention rules.
- Deletion and revocation are lifecycle contracts. Check current, historical, cached, indexed, exported, restored, and queued copies within the product's stated boundary.
- Privacy or retention preference is not automatically a security vulnerability. Require an explicit data-access boundary or deletion/revocation guarantee and an unauthorized reader or later operation.
- Use `confirmed` for complete source-visible lineage and bounded dummy-tenant tests. Use `needs_validation` when external storage policy, retention, CDN behavior, replica lag, or backup access is unavailable.
```



## Deletion, revocation, and lifecycle attack classes (subagent_type: `general`)

**Soft-delete and tombstone bypass**
Direct lookup, search, relation traversal, object link, background processor, or restore ignores the lifecycle predicate and returns or acts on a deleted/revoked record. Check whether soft-deleted identifiers can be re-registered before all references are gone.

**Stale authorization and derived copy use**
Membership removal, ACL update, consent withdrawal, secret revocation, or role downgrade does not invalidate sessions, caches, subscriptions, jobs, or materialized data that continue to authorize future operations.

**Retention and queued-work overrun**
Deletion completes in primary storage while queued processors, retries, exports, analytics, or generated artifacts recreate or retain the data beyond the promised boundary. Find idempotent deletion and tombstone propagation.

**Restore reintroduces invalid state**
Backup, undo, undelete, or replica recovery restores data, credentials, memberships, or permissions that current policy no longer allows. Re-authorize restored state and reapply lifecycle changes made after the snapshot.



## Universal moves (apply across the above)

- Pick one protected record and draw primary write, query, cache, index, event, export, backup, deletion, and restore paths. Mark principal and tenant at every edge.
- Compare two dummy tenants through the same local service methods, then repeat after ACL change, deletion, account switch, and restore. Do not use real user data.
- Start at bypass clients, background jobs, migrations, global uniqueness, and cache keys. These paths commonly omit request-scoped identity that interactive endpoints carry.



## Validation rules (apply before reporting ANY finding here)

1. Name attacker or lower-trust principal, protected data/state, affected owner/tenant, alternate copy or operation, and unauthorized disclosure or mutation.
2. Cite both intended source-of-truth policy and the path that omits or disagrees with it. Confirm another layer does not enforce the same tenant/lifecycle condition.
3. Use local dummy tenants and non-sensitive fixtures to prove cross-scope access or stale lifecycle behavior. Stop at the minimum observable record or operation.
4. If external cache, object storage, replicas, analytics, backup, or retention policy is required, classify `needs_validation` and state the owner-observed check.
5. Return `confirmed` only with complete lineage and concrete boundary impact. Return `needs_validation` with the exact unresolved storage, ACL, invalidation, retention, or restore fact.


Excluded blocks with source reasons: [{"block": "CLIENT-SIDE.md#Service-worker and browser-storage attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "CLIENT-SIDE.md#Cross-site information leak classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "CLIENT-SIDE.md#UI-redress and navigation attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Local IPC and exported-component attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Privileged-helper and local-file attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "DESKTOP-MOBILE-AND-LOCAL-IPC.md#Application-state and device-lifecycle attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "ATTACK-CLASSES.md#Access control", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Resource and file handling", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Cryptography and secrets", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Business logic", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Feature abuse and data leakage", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Wildcard", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Obvious things", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "CLIENT-SIDE.md#DOM and object-state attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "CLIENT-SIDE.md#Cross-origin messaging and network attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "CLIENT-SIDE.md#Cross-site information leak classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "CLIENT-SIDE.md#UI-redress and navigation attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "CLIENT-SIDE.md#Cross-origin messaging and network attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "CLIENT-SIDE.md#Service-worker and browser-storage attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "CLIENT-SIDE.md#Cross-site information leak classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "CLIENT-SIDE.md#UI-redress and navigation attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "CLIENT-SIDE.md#DOM and object-state attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "CLIENT-SIDE.md#Cross-origin messaging and network attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "CLIENT-SIDE.md#Cross-site information leak classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "CLIENT-SIDE.md#UI-redress and navigation attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "ATTACK-CLASSES.md#Injection", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Resource and file handling", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Cryptography and secrets", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Business logic", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Feature abuse and data leakage", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Wildcard", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Obvious things", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}]

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


No carried confirmed exclusions. Existing prior candidates are only leads: independently recheck current controls, do not silently carry or confirm them. Peer IDs: [".github%2Fworkflows%2Fgarden_tasks.yml%23scheduled-post::backend%2Fapi%2Fv1%2Ftasks.py%23generate_tasks::repository%2Fcron::ATTACK-CLASSES.md%23Business%20logic", ".github%2Fworkflows%2Fgenerate-costs-csv.yml%23issues::scripts%2Fgenerate_costs_csv.py%23write_csv-write_xlsx::repository%2Freport-automation::ATTACK-CLASSES.md%23Injection", "backend%2Fapi%2Fv1%2Fauth.py%23identity-lifecycle::backend%2Fapi%2Fv1%2Fauth.py%23get_current_user::backend%2Fauth::ATTACK-CLASSES.md%23Access%20control", "backend%2Fapi%2Fv1%2Fcontent_market.py%23uploads::backend%2Fservices%2Fsupabase_storage_service.py%23uploads::backend%2Fuploads::ATTACK-CLASSES.md%23Resource%20and%20file%20handling", "backend%2Fapi%2Fv1%2Ffield_recommendations.py%23translation::backend%2Fservices%2Ftranslation_service.py%23translate::backend%2Fai-output::ATTACK-CLASSES.md%23Injection", "backend%2Fapi%2Fv1%2Ffields.py%23field-writes::backend%2Fapi%2Fv1%2Ffields.py%23owner-update::backend%2Fagricultural-data::ATTACK-CLASSES.md%23Access%20control", "backend%2Fapi%2Fv1%2Ffields.py%23geocode_location::backend%2Fservices%2Fgeocode_service.py%23_request::backend%2Fgeocoding-work::ATTACK-CLASSES.md%23Resource%20and%20file%20handling", "backend%2Fapi%2Fv1%2Fpayments.py%23payment-initiation::backend%2Fservices%2Fpayment_service.py%23price::backend%2Fpayments::ATTACK-CLASSES.md%23Business%20logic", "backend%2Fapi%2Fv1%2Fweather.py%23forecast::backend%2Fservices%2Fweather_service.py%23_request::backend%2Fweather-provider-work::ATTACK-CLASSES.md%23Resource%20and%20file%20handling", "backend%2Fmain.py%23owned-api::backend%2Fapi%2Fv1%2Ffields.py%23_require_owned_field::backend%2Fagricultural-data::ATTACK-CLASSES.md%23Access%20control", "backend%2Fmain.py%23provider-work::backend%2Fapi%2Fv1%2Ftasks.py%23verify_cron_secret::backend%2Fprovider-work::ATTACK-CLASSES.md%23Business%20logic", "backend%2Fmain.py%23public-api::backend%2Fapi%2Fv1%2Fuser.py%23router::backend%2Fshared-content::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage", "backend%2Fservices%2Fmqtt_subscriber.py%23on_message::backend%2Fservices%2Fmqtt_subscriber.py%23start_mqtt::iot%2Fmessages::ATTACK-CLASSES.md%23Access%20control", "backend%2Fservices%2Fmqtt_subscriber.py%23telemetry::backend%2Fdb%2Fdatabase.py%23save_telemetry::iot%2Ftelemetry::ATTACK-CLASSES.md%23Resource%20and%20file%20handling", "cloud-and-ci%23release::backend%2FDockerfile%23runtime::release::ATTACK-CLASSES.md%23Access%20control", "git%23history-and-lockfiles::git%23tracked-source::repository::ATTACK-CLASSES.md%23Cryptography%20and%20secrets", "iot%2Ffirmware%2Fagritwin_esp32%2Fprovisioning.cpp%23BLE::iot%2Ffirmware%2Fagritwin_esp32%2Fprovisioning.cpp%23provisioningBegin::iot%2Fprovisioning::ATTACK-CLASSES.md%23Cryptography%20and%20secrets"]

Target /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/AGRITWIN. Agent ID hunt_client. Only writable area /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/security-reviews/run-2026-11-20-security-audit/agents/hunt_client/scratch. Parent-owned artifacts /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/security-reviews/run-2026-11-20-security-audit/agents/hunt_client/artifacts; promotion allowlist empty, zero bytes. No target execution or network. No shared/target edits. Do not delegate. Save exact JSON response to your scratch/result.json; return same JSON. All source checks artifact:null. Prioritize concise source traces and real security boundaries; no artificial cap on candidates. Read changed source relevant to assigned units since 4e8be50. Existing 401 retry handling changed significantly; recheck old hypotheses.

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
