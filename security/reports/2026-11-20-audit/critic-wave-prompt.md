You are a fresh post-wave coverage critic. Read current source only; no writes, target execution, network or delegation. Check coverage, not findings. Do not invent a clean pass when blockers or gaps remain.

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
    "canonical_refs": {
      "surface": ".github/workflows/garden_tasks.yml#scheduled-post",
      "boundary": "backend/api/v1/tasks.py#generate_tasks",
      "subsystem": "repository/cron",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "New schedule authority, retry and aggregate work",
    "boundary": "backend/api/v1/tasks.py#generate_tasks",
    "attack_class": "Business logic",
    "starting_paths": [
      ".github/workflows/garden_tasks.yml",
      "backend/api/v1/tasks.py",
      "backend/services/task_service.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
      "SUPPLY-CHAIN-AND-RELEASE.md#CI and automation attack classes",
      "SUPPLY-CHAIN-AND-RELEASE.md#Universal moves",
      "SUPPLY-CHAIN-AND-RELEASE.md#Validation rules",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Universal moves",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "SUPPLY-CHAIN-AND-RELEASE.md#Dependency and build-input attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "SUPPLY-CHAIN-AND-RELEASE.md#Release and update attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Computational amplification attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Failure and recovery attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      }
    ],
    "subsystem": "repository/cron",
    "coverage_id": ".github%2Fworkflows%2Fgarden_tasks.yml%23scheduled-post::backend%2Fapi%2Fv1%2Ftasks.py%23generate_tasks::repository%2Fcron::ATTACK-CLASSES.md%23Business%20logic",
    "prior_status": "prior_covered_changed_source",
    "attempts": [],
    "wave": 1,
    "status": "blocked",
    "agent_id": "parent",
    "reviewed_paths": [
      ".github/workflows/garden_tasks.yml",
      "backend/api/v1/tasks.py",
      "backend/services/task_service.py"
    ],
    "local_checks": [
      {
        "agent_id": "parent",
        "reviewed_paths": [
          ".github/workflows/garden_tasks.yml",
          "backend/api/v1/tasks.py",
          "backend/services/task_service.py"
        ],
        "invariant": "New schedule authority, retry and aggregate work",
        "method": "source",
        "result": "Garden scheduler has fixed HTTPS endpoint, secret supplied via quoted environment expansion, rejects empty secret; backend compare_digest rejects absent/configuration-empty values. Workflow concurrency serializes scheduler; endpoint bounds concurrent field processing and persistent per-field claim. Timeout 900s with retries vs20min job can replay work; actual retry/idempotency, aggregate entitlement and provider quota remain owner-observed facts. Backend provider-work unit reviews aggregate cost hypothesis separately.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [
      "Effective scheduler activation/secret rotation, timeout recovery and aggregate provider quota not observed."
    ],
    "assigned_owner": "parent",
    "prior_fingerprints": [],
    "hardening": []
  },
  {
    "coverage_id": ".github%2Fworkflows%2Fgenerate-costs-csv.yml%23issues::scripts%2Fgenerate_costs_csv.py%23write_csv-write_xlsx::repository%2Freport-automation::ATTACK-CLASSES.md%23Injection",
    "canonical_refs": {
      "surface": ".github/workflows/generate-costs-csv.yml#issues",
      "boundary": "scripts/generate_costs_csv.py#write_csv-write_xlsx",
      "subsystem": "repository/report-automation",
      "attack_class": "ATTACK-CLASSES.md#Injection"
    },
    "surface": ".github/workflows/generate-costs-csv.yml#issues",
    "boundary": "scripts/generate_costs_csv.py#write_csv-write_xlsx",
    "subsystem": "repository/report-automation",
    "attack_class": "Injection",
    "starting_paths": [
      ".github/workflows/generate-costs-csv.yml",
      "scripts/generate_costs_csv.py",
      ".github/workflows/burndown.yml",
      "scripts/burndown.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Injection",
    "selected_companion_blocks": [
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
      "SUPPLY-CHAIN-AND-RELEASE.md#CI and automation attack classes",
      "SUPPLY-CHAIN-AND-RELEASE.md#Universal moves",
      "SUPPLY-CHAIN-AND-RELEASE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "SUPPLY-CHAIN-AND-RELEASE.md#Dependency and build-input attack classes",
        "reason": "Dependency inventory and release-build inputs already have separate ledger coverage; this bounded gap concerns issue-derived report inputs, workflow authority and generated artifact interpretation."
      },
      {
        "block": "SUPPLY-CHAIN-AND-RELEASE.md#Release and update attack classes",
        "reason": "These workflows generate and commit reports rather than deploy application releases; release promotion is already represented by the existing release unit."
      }
    ],
    "prior_status": "prior_deferred",
    "attempts": [],
    "wave": 1,
    "status": "candidate",
    "agent_id": "parent",
    "reviewed_paths": [
      ".github/workflows/generate-costs-csv.yml",
      "scripts/generate_costs_csv.py",
      ".github/workflows/burndown.yml",
      "scripts/burndown.py"
    ],
    "local_checks": [
      {
        "agent_id": "parent",
        "reviewed_paths": [
          ".github/workflows/generate-costs-csv.yml",
          "scripts/generate_costs_csv.py",
          ".github/workflows/burndown.yml",
          "scripts/burndown.py"
        ],
        "invariant": ".github/workflows/generate-costs-csv.yml#issues",
        "method": "source",
        "result": "Issue title enters clean_parent_title (73), removes sprint prefix only, is stored in Task (215), written to CSV through csv.DictWriter (413-423) and to XLSX via ws.cell without forcing string type (612-617). Workflow checks out default branch, installs fixed openpyxl and runs generator; no issue text is interpolated into shell. Downstream formula interpretation and effective issue/Project author permissions require bounded validation. Burndown workflow uses fixed environment selectors and default-branch source; no direct issue-controlled code expression found.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "scripts/generate_costs_csv.py:write_xlsx:issue-title-as-formula"
    ],
    "unresolved": [
      "Spreadsheet parser behavior and reader trust policy need dummy fixture validation; no target execution."
    ],
    "assigned_owner": "parent",
    "prior_fingerprints": [],
    "source_comparison_changed_paths": {
      "421e90d": [
        ".github/workflows/generate-costs-csv.yml"
      ],
      "4e8be50": [
        ".github/workflows/generate-costs-csv.yml"
      ]
    },
    "hardening": []
  },
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
    "status": "candidate",
    "agent_id": "hunt_client",
    "reviewed_paths": [
      "agritwin-app/src/components/SocialLoginButtons.tsx",
      "agritwin-app/src/app/auth/oauth-callback.tsx",
      "agritwin-app/src/services/api_oauth.ts",
      "agritwin-app/src/components/field-location/MapCanvas.tsx",
      "agritwin-app/src/components/field-location/MapCanvas.web.tsx",
      "agritwin-app/src/components/field-location/mapDocument.ts",
      "agritwin-app/src/components/field-location/types.ts",
      "agritwin-app/src/components/checkout-form.web.tsx",
      "agritwin-app/app.json",
      "backend/services/social_auth_service.py",
      "backend/api/v1/social_auth.py",
      "backend/api/v1/google_auth.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_client",
        "reviewed_paths": [
          "agritwin-app/src/components/SocialLoginButtons.tsx",
          "agritwin-app/src/app/auth/oauth-callback.tsx",
          "agritwin-app/src/services/api_oauth.ts",
          "agritwin-app/src/components/field-location/MapCanvas.tsx",
          "agritwin-app/src/components/field-location/MapCanvas.web.tsx",
          "agritwin-app/src/components/field-location/mapDocument.ts",
          "agritwin-app/src/components/field-location/types.ts",
          "agritwin-app/src/components/checkout-form.web.tsx",
          "agritwin-app/app.json",
          "backend/services/social_auth_service.py",
          "backend/api/v1/social_auth.py",
          "backend/api/v1/google_auth.py"
        ],
        "invariant": "Rendering, callback binding, map HTML/messages and native/external navigation",
        "method": "source",
        "result": "Native callback hypothesis survives with provider/random/TTL/one-use/browser-state controls considered. Map HTML escapes <, Leaflet has SRI/CSP, updates serialize JS data; navigation exact about:blank/BASE_URL, external-link allowlist exact, bridge only finite/range geometry/readOnly. Web variant uses Leaflet API. No attacker-controlled arbitrary checkout URL established.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "agritwin-app/src/app/auth/oauth-callback.tsx:unbound_native_ticket"
    ],
    "unresolved": [
      "Native manifest/routing and dummy callback-account effect unobserved."
    ],
    "assigned_owner": "hunt_client",
    "prior_fingerprints": [
      "agritwin-app/src/app/auth/oauth-callback.tsx:unbound_native_ticket"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    },
    "hardening": [
      "Bind refresh/retry/commit to monotonic session generation; advance before logout/account replacement and abort older work.",
      "Reset/cancel picker state on session changes; capture cache principal on request start and validate again at commit.",
      "Bind native social tickets to receiving-instance operation verifier before setAuth, retaining state/provider/TTL/one-use controls.",
      "Add deferred dummy regression schedules for the three session hypotheses; no target tests ran."
    ]
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
    "status": "covered",
    "agent_id": "hunt_client",
    "reviewed_paths": [
      "agritwin-app/src/app/create-field.tsx",
      "agritwin-app/src/app/edit-field.tsx",
      "agritwin-app/src/app/field-data.tsx",
      "agritwin-app/src/app/editar_crops.tsx",
      "agritwin-app/src/hooks/use-infinite-field-crops.ts",
      "agritwin-app/src/services/api_fieldCrops.ts",
      "agritwin-app/src/services/queries.ts",
      "agritwin-app/src/services/queryKeys.ts",
      "agritwin-app/src/services/cacheInvalidation.ts",
      "agritwin-app/src/utils/fieldCropDraft.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_client",
        "reviewed_paths": [
          "agritwin-app/src/app/create-field.tsx",
          "agritwin-app/src/app/edit-field.tsx",
          "agritwin-app/src/app/field-data.tsx",
          "agritwin-app/src/app/editar_crops.tsx",
          "agritwin-app/src/hooks/use-infinite-field-crops.ts",
          "agritwin-app/src/services/api_fieldCrops.ts",
          "agritwin-app/src/services/queries.ts",
          "agritwin-app/src/services/queryKeys.ts",
          "agritwin-app/src/services/cacheInvalidation.ts",
          "agritwin-app/src/utils/fieldCropDraft.ts"
        ],
        "invariant": "Changed cached forms, polling and principal/state boundaries",
        "method": "source",
        "result": "Forms/crop/detail use finite fieldId, authenticated calls and field-scoped query keys. Edit-field has mounted/fieldId draft guards, related requests follow detail. Infinite crops uses page20 and parallel-load guard. Recommendations/market keys include language. Sensor polling focused. No additional bypass established; session lifecycle issues remain separately assigned.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_client",
    "prior_fingerprints": [],
    "hardening": [
      "Bind refresh/retry/commit to monotonic session generation; advance before logout/account replacement and abort older work.",
      "Reset/cancel picker state on session changes; capture cache principal on request start and validate again at commit.",
      "Bind native social tickets to receiving-instance operation verifier before setAuth, retaining state/provider/TTL/one-use controls.",
      "Add deferred dummy regression schedules for the three session hypotheses; no target tests ran."
    ]
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
    "status": "covered",
    "agent_id": "hunt_client",
    "reviewed_paths": [
      "agritwin-app/src/components/FieldFormSteps.tsx",
      "agritwin-app/src/components/FieldOptionChips.tsx",
      "agritwin-app/src/utils/fieldFormValidation.ts",
      "agritwin-app/src/components/FieldCropForm.tsx",
      "agritwin-app/src/styles/responsive.ts",
      "agritwin-app/src/utils/fieldCropDraft.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_client",
        "reviewed_paths": [
          "agritwin-app/src/components/FieldFormSteps.tsx",
          "agritwin-app/src/components/FieldOptionChips.tsx",
          "agritwin-app/src/utils/fieldFormValidation.ts",
          "agritwin-app/src/components/FieldCropForm.tsx",
          "agritwin-app/src/styles/responsive.ts",
          "agritwin-app/src/utils/fieldCropDraft.ts"
        ],
        "invariant": "Form/rendering/input changes and responsive siblings",
        "method": "source",
        "result": "React Text/TextInput/FlatList render form values without HTML/eval/path execution. UX validation checks name100/type/finite coordinates/area and dates. Draft creates JSON/numeric ID/notes string. Responsive styles grant no authority. No cross-principal injection established.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_client",
    "prior_fingerprints": [],
    "hardening": [
      "Bind refresh/retry/commit to monotonic session generation; advance before logout/account replacement and abort older work.",
      "Reset/cancel picker state on session changes; capture cache principal on request start and validate again at commit.",
      "Bind native social tickets to receiving-instance operation verifier before setAuth, retaining state/provider/TTL/one-use controls.",
      "Add deferred dummy regression schedules for the three session hypotheses; no target tests ran."
    ]
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
    "status": "candidate",
    "agent_id": "hunt_client",
    "reviewed_paths": [
      "agritwin-app/src/services/auth.ts",
      "agritwin-app/src/services/gardenPicker.ts",
      "agritwin-app/src/services/api.ts",
      "backend/api/v1/auth.py",
      "agritwin-app/src/services/queryPersistence.ts",
      "agritwin-app/src/services/queryKeys.ts",
      "agritwin-app/src/services/queries.ts",
      "agritwin-app/src/services/queryClient.ts",
      "agritwin-app/src/services/currentField.ts",
      "agritwin-app/src/services/routeAfterAuth.ts",
      "agritwin-app/src/components/AccountCard.tsx",
      "agritwin-app/src/components/AppHeader.tsx",
      "agritwin-app/src/app/field-selection.tsx",
      "agritwin-app/src/app/auth/login.tsx",
      "agritwin-app/src/app/_layout.tsx",
      "agritwin-app/__tests__/unit/services/auth-refresh.test.ts",
      "agritwin-app/__tests__/unit/services/gardenPicker.test.ts"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_client",
        "reviewed_paths": [
          "agritwin-app/src/services/auth.ts",
          "agritwin-app/src/services/gardenPicker.ts",
          "agritwin-app/src/services/api.ts",
          "backend/api/v1/auth.py",
          "agritwin-app/src/services/queryPersistence.ts",
          "agritwin-app/src/services/queryKeys.ts",
          "agritwin-app/src/services/queries.ts",
          "agritwin-app/src/services/queryClient.ts",
          "agritwin-app/src/services/currentField.ts",
          "agritwin-app/src/services/routeAfterAuth.ts",
          "agritwin-app/src/components/AccountCard.tsx",
          "agritwin-app/src/components/AppHeader.tsx",
          "agritwin-app/src/app/field-selection.tsx",
          "agritwin-app/src/app/auth/login.tsx",
          "agritwin-app/src/app/_layout.tsx",
          "agritwin-app/__tests__/unit/services/auth-refresh.test.ts",
          "agritwin-app/__tests__/unit/services/gardenPicker.test.ts"
        ],
        "invariant": "Account switching, logout, asynchronous requests and cache persistence",
        "method": "source",
        "result": "Current expireSession handles invalid refresh/second401 without adding generation checks on refresh commit/replay. clearAuth/setAuth clear credentials/query cache. Picker guard protects after B picker begins, leaving conditional logout-to-new-load schedule. New tests cover same-account renewal, not replacement. Three conditional paths retained; no runtime effect asserted.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "agritwin-app/src/services/auth.ts:authenticatedFetch_cross_account_retry",
      "agritwin-app/src/services/auth.ts:refreshAuth_late_session_commit",
      "agritwin-app/src/services/gardenPicker.ts:late_response_current_account_cache_key"
    ],
    "unresolved": [
      "Dummy schedules and token/body/record/cache/UI results unobserved."
    ],
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
    },
    "hardening": [
      "Bind refresh/retry/commit to monotonic session generation; advance before logout/account replacement and abort older work.",
      "Reset/cancel picker state on session changes; capture cache principal on request start and validate again at commit.",
      "Bind native social tickets to receiving-instance operation verifier before setAuth, retaining state/provider/TTL/one-use controls.",
      "Add deferred dummy regression schedules for the three session hypotheses; no target tests ran."
    ]
  },
  {
    "coverage_id": "backend%2Fapi%2Fv1%2Fauth.py%23identity-lifecycle::backend%2Fapi%2Fv1%2Fauth.py%23get_current_user::backend%2Fauth::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "backend/api/v1/auth.py#identity-lifecycle",
      "boundary": "backend/api/v1/auth.py#get_current_user",
      "subsystem": "backend/auth",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Login, refresh, recovery and external identity lifecycle",
    "boundary": "backend/api/v1/auth.py#get_current_user",
    "subsystem": "backend/auth",
    "attack_class": "Access control",
    "starting_paths": [
      "backend/api/v1/auth.py",
      "backend/api/v1/forgot_password.py",
      "backend/services/social_auth_service.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules",
      "WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#Federated-identity attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#MFA, passkey, and account-transition attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#HTTP framing and cache attack classes",
      "WEB-PROTOCOL-AND-AUTH.md#API-key and mTLS attack classes"
    ],
    "excluded_blocks": [
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
    "status": "candidate",
    "agent_id": "hunt_backend",
    "reviewed_paths": [
      "backend/api/v1/auth.py",
      "backend/api/v1/forgot_password.py",
      "backend/services/password_service.py",
      "backend/services/user_service.py",
      "backend/models/user.py",
      "backend/db/schema.py",
      "backend/services/social_auth_service.py",
      "backend/api/v1/google_auth.py",
      "backend/api/v1/fb_auth.py",
      "backend/api/v1/xauth.py",
      "backend/services/google_auth_service.py",
      "backend/services/fb_auth_service.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_backend",
        "reviewed_paths": [
          "backend/api/v1/auth.py",
          "backend/api/v1/forgot_password.py",
          "backend/services/password_service.py",
          "backend/services/user_service.py",
          "backend/models/user.py",
          "backend/db/schema.py",
          "backend/services/social_auth_service.py",
          "backend/api/v1/google_auth.py",
          "backend/api/v1/fb_auth.py",
          "backend/api/v1/xauth.py",
          "backend/services/google_auth_service.py",
          "backend/services/fb_auth_service.py"
        ],
        "invariant": "Access artifacts must retain purpose and principal namespace across lifecycle.",
        "method": "source",
        "result": "Signature uses a fixed HS256 key; refresh consumer checks type, reset consumer checks purpose and atomically consumes jti, social identities use provider+subject and reject email auto-linking. Bearer get_current_user instead accepts any same-key JWT with sub and interprets it as username; complete reset-email collision trace retained as candidate.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "backend/auth/reset-jwt-as-bearer"
    ],
    "unresolved": [],
    "assigned_owner": "hunt_backend",
    "prior_fingerprints": [
      "backend/auth/reset-jwt-as-bearer"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    },
    "hardening": [
      "Make access-token purpose explicit and consistent for local/social/refresh issuance; use immutable account identifiers as JWT subjects.",
      "Preserve the existing owner-filtered queries and per-field atomic AI claim while adding any approved aggregate admission controls.",
      "Market/news upload paths should enforce a bounded byte read and validate content signatures consistently with diagnosis; no storage abuse is claimed from missing limits alone.",
      "The shared provider work unit contains a new public translation spend boundary that deserves its own deterministic coverage unit.",
      "Do not treat guest Stripe initiation or absent fulfillment code as a demonstrated authorization or payment bypass."
    ]
  },
  {
    "coverage_id": "backend%2Fapi%2Fv1%2Fcontent_market.py%23uploads::backend%2Fservices%2Fsupabase_storage_service.py%23uploads::backend%2Fuploads::ATTACK-CLASSES.md%23Resource%20and%20file%20handling",
    "canonical_refs": {
      "surface": "backend/api/v1/content_market.py#uploads",
      "boundary": "backend/services/supabase_storage_service.py#uploads",
      "subsystem": "backend/uploads",
      "attack_class": "ATTACK-CLASSES.md#Resource and file handling"
    },
    "surface": "Upload byte/type limits and privileged storage",
    "boundary": "backend/services/supabase_storage_service.py#uploads",
    "subsystem": "backend/uploads",
    "attack_class": "Resource and file handling",
    "starting_paths": [
      "backend/api/v1/content_market.py",
      "backend/api/v1/anunces.py",
      "backend/api/v1/diagnosis.py",
      "backend/services/supabase_storage_service.py",
      "backend/services/plant_diagnosis_service.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Resource and file handling",
    "selected_companion_blocks": [],
    "excluded_blocks": [],
    "prior_status": "new",
    "attempts": [],
    "wave": 1,
    "status": "blocked",
    "agent_id": "hunt_backend",
    "reviewed_paths": [
      "backend/api/v1/content_market.py",
      "backend/api/v1/anunces.py",
      "backend/api/v1/diagnosis.py",
      "backend/services/supabase_storage_service.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_backend",
        "reviewed_paths": [
          "backend/api/v1/content_market.py",
          "backend/api/v1/anunces.py",
          "backend/api/v1/diagnosis.py",
          "backend/services/supabase_storage_service.py"
        ],
        "invariant": "File bytes and storage authority must have effective size/type/admission bounds.",
        "method": "source",
        "result": "Diagnosis reads MAX_IMAGE_BYTES+1 and calls validate_image. Market/news upload uses a MIME allowlist and UUID-generated bucket paths, but reads the whole file; caller-provided filename does not choose their path. Public market creation has no account dependency; news creation has an IP limiter. No executing renderer/path traversal or bounded cross-user resource result was established.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [
      "Effective multipart/ingress and bucket byte/storage limits, signature validation behavior and a bounded fake-upload fixture were not established; no availability or storage-cost conclusion is made."
    ],
    "assigned_owner": "hunt_backend",
    "hardening": [
      "Make access-token purpose explicit and consistent for local/social/refresh issuance; use immutable account identifiers as JWT subjects.",
      "Preserve the existing owner-filtered queries and per-field atomic AI claim while adding any approved aggregate admission controls.",
      "Market/news upload paths should enforce a bounded byte read and validate content signatures consistently with diagnosis; no storage abuse is claimed from missing limits alone.",
      "The shared provider work unit contains a new public translation spend boundary that deserves its own deterministic coverage unit.",
      "Do not treat guest Stripe initiation or absent fulfillment code as a demonstrated authorization or payment bypass."
    ]
  },
  {
    "coverage_id": "backend%2Fapi%2Fv1%2Ffield_recommendations.py%23translation::backend%2Fservices%2Ftranslation_service.py%23translate::backend%2Fai-output::ATTACK-CLASSES.md%23Injection",
    "canonical_refs": {
      "surface": "backend/api/v1/field_recommendations.py#translation",
      "boundary": "backend/services/translation_service.py#translate",
      "subsystem": "backend/ai-output",
      "attack_class": "ATTACK-CLASSES.md#Injection"
    },
    "surface": "Changed AI translation, output validation, ownership and provider routing",
    "boundary": "backend/services/translation_service.py#translate",
    "subsystem": "backend/ai-output",
    "attack_class": "Injection",
    "starting_paths": [
      "backend/api/v1/field_recommendations.py",
      "backend/services/field_recommendations_service.py",
      "backend/services/translation_service.py",
      "backend/services/ai_dependencies.py",
      "backend/api/v1/content_market.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Injection",
    "selected_companion_blocks": [
      "AI-AND-LLM.md#Core discipline",
      "AI-AND-LLM.md#Context, retrieval, and memory attack classes",
      "AI-AND-LLM.md#Tool and action attack classes",
      "AI-AND-LLM.md#MCP and sub-agent trust classes",
      "AI-AND-LLM.md#Output and disclosure attack classes",
      "AI-AND-LLM.md#Universal moves",
      "AI-AND-LLM.md#Validation rules"
    ],
    "excluded_blocks": [],
    "prior_status": "new",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunt_backend",
    "reviewed_paths": [
      "backend/api/v1/field_recommendations.py",
      "backend/services/field_recommendations_service.py",
      "backend/services/translation_service.py",
      "backend/services/ai_dependencies.py",
      "backend/api/v1/content_market.py",
      "backend/prompts/field_recommendation_translation_prompt.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_backend",
        "reviewed_paths": [
          "backend/api/v1/field_recommendations.py",
          "backend/services/field_recommendations_service.py",
          "backend/services/translation_service.py",
          "backend/services/ai_dependencies.py",
          "backend/api/v1/content_market.py",
          "backend/prompts/field_recommendation_translation_prompt.py"
        ],
        "invariant": "Untrusted translated JSON must not gain resource or execution authority.",
        "method": "source",
        "result": "Changed recommendation translation takes only owner-selected records and returns validated text/based_on while copying ids, field_id, category, severity, model and timestamps from source records. Market translation accepts only matching list length with nonempty product strings and preserves price/id using ConteMercatRead; malformed output falls back. Language input is syntactically bounded; JSON output is parsed, not executed, and no tool/command sink exists in these backend paths. Provider admission is tracked separately in the provider-work unit.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_backend",
    "hardening": [
      "Make access-token purpose explicit and consistent for local/social/refresh issuance; use immutable account identifiers as JWT subjects.",
      "Preserve the existing owner-filtered queries and per-field atomic AI claim while adding any approved aggregate admission controls.",
      "Market/news upload paths should enforce a bounded byte read and validate content signatures consistently with diagnosis; no storage abuse is claimed from missing limits alone.",
      "The shared provider work unit contains a new public translation spend boundary that deserves its own deterministic coverage unit.",
      "Do not treat guest Stripe initiation or absent fulfillment code as a demonstrated authorization or payment bypass."
    ]
  },
  {
    "canonical_refs": {
      "surface": "backend/api/v1/fields.py#field-writes",
      "boundary": "backend/api/v1/fields.py#owner-update",
      "subsystem": "backend/agricultural-data",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Field write identity, required values and geometry lifecycle",
    "boundary": "backend/api/v1/fields.py#owner-update",
    "attack_class": "Access control",
    "starting_paths": [
      "backend/api/v1/fields.py",
      "backend/services/field_geometry_service.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      },
      {
        "block": "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes",
        "reason": "Different boundary or lifecycle; not part of this changed-path assignment"
      }
    ],
    "subsystem": "backend/agricultural-data",
    "coverage_id": "backend%2Fapi%2Fv1%2Ffields.py%23field-writes::backend%2Fapi%2Fv1%2Ffields.py%23owner-update::backend%2Fagricultural-data::ATTACK-CLASSES.md%23Access%20control",
    "prior_status": "prior_covered_changed_source",
    "attempts": [],
    "wave": 1,
    "status": "blocked",
    "agent_id": "hunt_backend",
    "reviewed_paths": [
      "backend/api/v1/fields.py",
      "backend/services/field_geometry_service.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_backend",
        "reviewed_paths": [
          "backend/api/v1/fields.py",
          "backend/services/field_geometry_service.py"
        ],
        "invariant": "Field writes must preserve authenticated ownership and validate bounded geometry.",
        "method": "source",
        "result": "Creation inserts current_user.id; detail/device queries use owner predicates. Geometry code enforces 3\u2013200 points per ring, at most 20 exclusions and 1000 total corners before hole intersection work; finite coordinates, self-intersection and area controls are present. No caller-supplied user_id is used by creation.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [
      "The final field update/delete body paths were not completely traced in this bounded wave and require a follow-up source check before this unit can close."
    ],
    "assigned_owner": "hunt_backend",
    "prior_fingerprints": [],
    "hardening": [
      "Make access-token purpose explicit and consistent for local/social/refresh issuance; use immutable account identifiers as JWT subjects.",
      "Preserve the existing owner-filtered queries and per-field atomic AI claim while adding any approved aggregate admission controls.",
      "Market/news upload paths should enforce a bounded byte read and validate content signatures consistently with diagnosis; no storage abuse is claimed from missing limits alone.",
      "The shared provider work unit contains a new public translation spend boundary that deserves its own deterministic coverage unit.",
      "Do not treat guest Stripe initiation or absent fulfillment code as a demonstrated authorization or payment bypass."
    ]
  },
  {
    "coverage_id": "backend%2Fapi%2Fv1%2Ffields.py%23geocode_location::backend%2Fservices%2Fgeocode_service.py%23_request::backend%2Fgeocoding-work::ATTACK-CLASSES.md%23Resource%20and%20file%20handling",
    "canonical_refs": {
      "surface": "backend/api/v1/fields.py#geocode_location",
      "boundary": "backend/services/geocode_service.py#_request",
      "subsystem": "backend/geocoding-work",
      "attack_class": "ATTACK-CLASSES.md#Resource and file handling"
    },
    "surface": "backend/api/v1/fields.py#geocode_location",
    "boundary": "backend/services/geocode_service.py#_request",
    "subsystem": "backend/geocoding-work",
    "attack_class": "Resource and file handling",
    "starting_paths": [
      "backend/api/v1/fields.py",
      "backend/services/geocode_service.py",
      "backend/services/rate_limit.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Resource and file handling",
    "selected_companion_blocks": [
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Failure and recovery attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Universal moves",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "ATTACK-CLASSES.md#Injection",
        "reason": "The source-visible provider base URL is operator configuration, route paths are fixed and query parameters use urlencode; this unit concerns shared resource admission and failure handling, not an established attacker-controlled destination or executable sink."
      },
      {
        "block": "ATTACK-CLASSES.md#Access control",
        "reason": "Both routes visibly require get_current_user; existing field ownership review remains separate from cross-request worker/cache/provider resource isolation."
      }
    ],
    "prior_status": "prior_needs_validation",
    "attempts": [],
    "wave": 1,
    "status": "blocked",
    "agent_id": "hunt_backend",
    "reviewed_paths": [
      "backend/api/v1/fields.py",
      "backend/services/geocode_service.py",
      "backend/services/rate_limit.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_backend",
        "reviewed_paths": [
          "backend/api/v1/fields.py",
          "backend/services/geocode_service.py",
          "backend/services/rate_limit.py"
        ],
        "invariant": "One caller must not retain unrelated shared workers beyond effective admission/deadlines.",
        "method": "source",
        "result": "Both routes require get_current_user and use run_in_threadpool. The global lock surrounds cache lookup, pacing sleep and urlopen/read; URLs are operator-selected and query values encoded, cache cardinality is capped at 512 and upstream calls use timeout=8. Reverse fallback re-enters the same pacing system. No SSRF to a caller-selected destination or observed shared worker denial was established.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [
      "Threadpool capacity/admission, cancellation behavior, effective ingress limits and a bounded two-principal delayed-upstream fixture were not validated; the earlier starvation lead is not confirmed."
    ],
    "assigned_owner": "hunt_backend",
    "prior_fingerprints": [
      "geocoding:global-lock-threadpool-retention"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [
        "backend/api/v1/fields.py",
        "backend/services/geocode_service.py"
      ],
      "4e8be50": []
    },
    "hardening": [
      "Make access-token purpose explicit and consistent for local/social/refresh issuance; use immutable account identifiers as JWT subjects.",
      "Preserve the existing owner-filtered queries and per-field atomic AI claim while adding any approved aggregate admission controls.",
      "Market/news upload paths should enforce a bounded byte read and validate content signatures consistently with diagnosis; no storage abuse is claimed from missing limits alone.",
      "The shared provider work unit contains a new public translation spend boundary that deserves its own deterministic coverage unit.",
      "Do not treat guest Stripe initiation or absent fulfillment code as a demonstrated authorization or payment bypass."
    ]
  },
  {
    "coverage_id": "backend%2Fapi%2Fv1%2Fpayments.py%23payment-initiation::backend%2Fservices%2Fpayment_service.py%23price::backend%2Fpayments::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "backend/api/v1/payments.py#payment-initiation",
      "boundary": "backend/services/payment_service.py#price",
      "subsystem": "backend/payments",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "Product price authority and payment initiation",
    "boundary": "backend/services/payment_service.py#price",
    "subsystem": "backend/payments",
    "attack_class": "Business logic",
    "starting_paths": [
      "backend/api/v1/payments.py",
      "backend/services/payment_service.py",
      "backend/models/payments.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [],
    "excluded_blocks": [],
    "prior_status": "new",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunt_backend",
    "reviewed_paths": [
      "backend/api/v1/payments.py",
      "backend/models/payments.py",
      "backend/services/payment_service.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_backend",
        "reviewed_paths": [
          "backend/api/v1/payments.py",
          "backend/models/payments.py",
          "backend/services/payment_service.py"
        ],
        "invariant": "Checkout amount must come from server product price and validated positive quantity.",
        "method": "source",
        "result": "Both interfaces accept product UUID and positive Decimal quantity, look up server product.price and calculate finite positive integer cents with ROUND_HALF_UP. Client cannot submit price/amount or return URLs; those URLs are operator environment. Provider exceptions are normalized. Anonymous initiation alone does not prove unauthorized purchase/fulfillment or underpayment; no fulfillment grant path was established.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_backend",
    "hardening": [
      "Make access-token purpose explicit and consistent for local/social/refresh issuance; use immutable account identifiers as JWT subjects.",
      "Preserve the existing owner-filtered queries and per-field atomic AI claim while adding any approved aggregate admission controls.",
      "Market/news upload paths should enforce a bounded byte read and validate content signatures consistently with diagnosis; no storage abuse is claimed from missing limits alone.",
      "The shared provider work unit contains a new public translation spend boundary that deserves its own deterministic coverage unit.",
      "Do not treat guest Stripe initiation or absent fulfillment code as a demonstrated authorization or payment bypass."
    ]
  },
  {
    "coverage_id": "backend%2Fapi%2Fv1%2Fweather.py%23forecast::backend%2Fservices%2Fweather_service.py%23_request::backend%2Fweather-provider-work::ATTACK-CLASSES.md%23Resource%20and%20file%20handling",
    "canonical_refs": {
      "surface": "backend/api/v1/weather.py#forecast",
      "boundary": "backend/services/weather_service.py#_request",
      "subsystem": "backend/weather-provider-work",
      "attack_class": "ATTACK-CLASSES.md#Resource and file handling"
    },
    "surface": "backend/api/v1/weather.py#forecast",
    "boundary": "backend/services/weather_service.py#_request",
    "subsystem": "backend/weather-provider-work",
    "attack_class": "Resource and file handling",
    "starting_paths": [
      "backend/api/v1/weather.py",
      "backend/services/weather_service.py",
      "backend/services/fallback_weather_service.py",
      "backend/services/open_meteo_service.py",
      "backend/services/field_weather_service.py",
      "backend/services/city_search.py",
      "backend/services/rate_limit.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Resource and file handling",
    "selected_companion_blocks": [
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Failure and recovery attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Universal moves",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "ATTACK-CLASSES.md#Access control",
        "reason": "Field-owner authorization is already checked in the agricultural-data unit; this unit reviews anonymous and authenticated provider-work accounting rather than repeating ownership queries."
      },
      {
        "block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes",
        "reason": "The selected boundary is outbound work admission, retry and fallback; persistent telemetry accumulation already has a separate unit."
      }
    ],
    "prior_status": "prior_covered_same_source",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "hunt_backend",
    "reviewed_paths": [
      "backend/api/v1/weather.py",
      "backend/services/weather_service.py",
      "backend/services/fallback_weather_service.py",
      "backend/services/open_meteo_service.py",
      "backend/services/field_weather_service.py",
      "backend/services/city_search.py",
      "backend/services/rate_limit.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_backend",
        "reviewed_paths": [
          "backend/api/v1/weather.py",
          "backend/services/weather_service.py",
          "backend/services/fallback_weather_service.py",
          "backend/services/open_meteo_service.py",
          "backend/services/field_weather_service.py",
          "backend/services/city_search.py",
          "backend/services/rate_limit.py"
        ],
        "invariant": "Outbound weather work must use bounded retries, known destinations and owner scope for private fields.",
        "method": "source",
        "result": "Forecast inputs restrict coordinates, days, units and city/language shape; provider URLs are fixed. Primary calls have a ten-second timeout and at most two attempts, 429 fails to bounded fallback, Open-Meteo performs one bounded call per requested operation. Field weather passes current username and checks ownership before using the cache; cache considers language/units/location. No unbounded retry or input-controlled destination was found. General public-provider budgeting remains hardening, not demonstrated abuse.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_backend",
    "prior_fingerprints": [],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    },
    "hardening": [
      "Make access-token purpose explicit and consistent for local/social/refresh issuance; use immutable account identifiers as JWT subjects.",
      "Preserve the existing owner-filtered queries and per-field atomic AI claim while adding any approved aggregate admission controls.",
      "Market/news upload paths should enforce a bounded byte read and validate content signatures consistently with diagnosis; no storage abuse is claimed from missing limits alone.",
      "The shared provider work unit contains a new public translation spend boundary that deserves its own deterministic coverage unit.",
      "Do not treat guest Stripe initiation or absent fulfillment code as a demonstrated authorization or payment bypass."
    ]
  },
  {
    "coverage_id": "backend%2Fmain.py%23owned-api::backend%2Fapi%2Fv1%2Ffields.py%23_require_owned_field::backend%2Fagricultural-data::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "backend/main.py#owned-api",
      "boundary": "backend/api/v1/fields.py#_require_owned_field",
      "subsystem": "backend/agricultural-data",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "Owner-bound fields, devices, crops, recommendations, tasks and dashboards",
    "boundary": "backend/api/v1/fields.py#_require_owned_field",
    "subsystem": "backend/agricultural-data",
    "attack_class": "Access control",
    "starting_paths": [
      "backend/api/v1/fields.py",
      "backend/services/field_crops_service.py",
      "backend/services/task_service.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Tenant and object-isolation attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Universal moves",
      "DATA-ISOLATION-AND-LIFECYCLE.md#Validation rules"
    ],
    "excluded_blocks": [
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
    "status": "candidate",
    "agent_id": "hunt_backend",
    "reviewed_paths": [
      "backend/api/v1/fields.py",
      "backend/api/v1/crops_field.py",
      "backend/services/field_crops_service.py",
      "backend/api/v1/crops.py",
      "backend/services/crops_service.py",
      "backend/api/v1/field_recommendations.py",
      "backend/services/field_recommendations_service.py",
      "backend/api/v1/tasks.py",
      "backend/services/task_service.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_backend",
        "reviewed_paths": [
          "backend/api/v1/fields.py",
          "backend/api/v1/crops_field.py",
          "backend/services/field_crops_service.py",
          "backend/api/v1/crops.py",
          "backend/services/crops_service.py",
          "backend/api/v1/field_recommendations.py",
          "backend/services/field_recommendations_service.py",
          "backend/api/v1/tasks.py",
          "backend/services/task_service.py"
        ],
        "invariant": "Object access must bind the current owner while shared catalog writes require appropriate authority.",
        "method": "source",
        "result": "Field/device reads and device writes verify parent field ownership. FieldCrop list/count/detail join Field.user_id; creation and field transfer check target ownership. Recommendations verify the selected field and join ownership on list/detail/update/delete, disallowing field reassignment; nearby-context queries restrict same-user fields. Tasks verify owned field before task/recommendation selectors. Shared Crop PATCH instead gates only on authentication and affects globally referenced catalog data; policy-dependent candidate retained.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "backend/crops/shared-catalog-write-authority"
    ],
    "unresolved": [],
    "assigned_owner": "hunt_backend",
    "prior_fingerprints": [
      "backend/crops/shared-catalog-write-authority"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [
        "backend/api/v1/fields.py",
        "backend/services/field_crops_service.py"
      ],
      "4e8be50": [
        "backend/services/field_crops_service.py"
      ]
    },
    "hardening": [
      "Make access-token purpose explicit and consistent for local/social/refresh issuance; use immutable account identifiers as JWT subjects.",
      "Preserve the existing owner-filtered queries and per-field atomic AI claim while adding any approved aggregate admission controls.",
      "Market/news upload paths should enforce a bounded byte read and validate content signatures consistently with diagnosis; no storage abuse is claimed from missing limits alone.",
      "The shared provider work unit contains a new public translation spend boundary that deserves its own deterministic coverage unit.",
      "Do not treat guest Stripe initiation or absent fulfillment code as a demonstrated authorization or payment bypass."
    ]
  },
  {
    "coverage_id": "backend%2Fmain.py%23provider-work::backend%2Fapi%2Fv1%2Ftasks.py%23verify_cron_secret::backend%2Fprovider-work::ATTACK-CLASSES.md%23Business%20logic",
    "canonical_refs": {
      "surface": "backend/main.py#provider-work",
      "boundary": "backend/api/v1/tasks.py#verify_cron_secret",
      "subsystem": "backend/provider-work",
      "attack_class": "ATTACK-CLASSES.md#Business logic"
    },
    "surface": "Payment authority, server prices, inference cost and scheduler authorization",
    "boundary": "backend/api/v1/tasks.py#verify_cron_secret",
    "subsystem": "backend/provider-work",
    "attack_class": "Business logic",
    "starting_paths": [
      "backend/api/v1/payments.py",
      "backend/services/payment_service.py",
      "backend/api/v1/diagnosis.py",
      "backend/api/v1/field_recommendations.py",
      "backend/api/v1/tasks.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Business logic",
    "selected_companion_blocks": [
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Universal moves",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Computational amplification attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes",
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
        "block": "ATTACK-CLASSES.md#Resource and file handling",
        "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"
      },
      {
        "block": "ATTACK-CLASSES.md#Cryptography and secrets",
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
    "status": "candidate",
    "agent_id": "hunt_backend",
    "reviewed_paths": [
      "backend/api/v1/fields.py",
      "backend/api/v1/tasks.py",
      "backend/services/task_service.py",
      "backend/services/rate_limit.py",
      "backend/api/v1/field_recommendations.py",
      "backend/api/v1/diagnosis.py",
      "backend/api/v1/content_market.py",
      "backend/services/translation_service.py",
      "backend/services/ai_dependencies.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_backend",
        "reviewed_paths": [
          "backend/api/v1/fields.py",
          "backend/api/v1/tasks.py",
          "backend/services/task_service.py",
          "backend/services/rate_limit.py",
          "backend/api/v1/field_recommendations.py",
          "backend/api/v1/diagnosis.py",
          "backend/api/v1/content_market.py",
          "backend/services/translation_service.py",
          "backend/services/ai_dependencies.py"
        ],
        "invariant": "Provider authority must charge work against the requester scope before scheduling or inference.",
        "method": "source",
        "result": "Task cron uses nonempty compare_digest secret, concurrency=3 and an atomic field claim/retry window. Those controls do not aggregate by the account that can create multiple eligible fields and cause lazy or scheduled work. Newly localized public market GETs also invoke translation before search results without the AI route limiter; bounded term/tag/output limits do not admit or meter callers. Each path remains conditional on effective entitlements/provider configuration.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "backend/tasks/aggregate-inference-budget",
      "backend/market/anonymous-translation-budget"
    ],
    "unresolved": [],
    "assigned_owner": "hunt_backend",
    "prior_fingerprints": [
      "backend/tasks/aggregate-inference-budget"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [
        "backend/api/v1/field_recommendations.py"
      ],
      "4e8be50": [
        "backend/api/v1/field_recommendations.py"
      ]
    },
    "hardening": [
      "Make access-token purpose explicit and consistent for local/social/refresh issuance; use immutable account identifiers as JWT subjects.",
      "Preserve the existing owner-filtered queries and per-field atomic AI claim while adding any approved aggregate admission controls.",
      "Market/news upload paths should enforce a bounded byte read and validate content signatures consistently with diagnosis; no storage abuse is claimed from missing limits alone.",
      "The shared provider work unit contains a new public translation spend boundary that deserves its own deterministic coverage unit.",
      "Do not treat guest Stripe initiation or absent fulfillment code as a demonstrated authorization or payment bypass."
    ]
  },
  {
    "coverage_id": "backend%2Fmain.py%23public-api::backend%2Fapi%2Fv1%2Fuser.py%23router::backend%2Fshared-content::ATTACK-CLASSES.md%23Feature%20abuse%20and%20data%20leakage",
    "canonical_refs": {
      "surface": "backend/main.py#public-api",
      "boundary": "backend/api/v1/user.py#router",
      "subsystem": "backend/shared-content",
      "attack_class": "ATTACK-CLASSES.md#Feature abuse and data leakage"
    },
    "surface": "Anonymous directories, shared content mutations, catalogs and uploads",
    "boundary": "backend/api/v1/user.py#router",
    "subsystem": "backend/shared-content",
    "attack_class": "Feature abuse and data leakage",
    "starting_paths": [
      "backend/api/v1/user.py",
      "backend/api/v1/anunces.py",
      "backend/api/v1/content_market.py",
      "backend/services/supabase_storage_service.py"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Feature abuse and data leakage",
    "selected_companion_blocks": [
      "WEB-PROTOCOL-AND-AUTH.md#Core discipline",
      "WEB-PROTOCOL-AND-AUTH.md#Universal moves",
      "WEB-PROTOCOL-AND-AUTH.md#Validation rules",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Universal moves",
      "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "WEB-PROTOCOL-AND-AUTH.md#HTTP framing and cache attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "WEB-PROTOCOL-AND-AUTH.md#Federated-identity attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "WEB-PROTOCOL-AND-AUTH.md#MFA, passkey, and account-transition attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "WEB-PROTOCOL-AND-AUTH.md#API-key and mTLS attack classes",
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
    "status": "candidate",
    "agent_id": "hunt_backend",
    "reviewed_paths": [
      "backend/main.py",
      "backend/api/v1/user.py",
      "backend/models/user.py",
      "backend/models/userProfile.py",
      "backend/services/user_service.py",
      "backend/services/userprofile_service.py",
      "backend/api/v1/anunces.py",
      "backend/services/anunce_service.py",
      "backend/db/schema.py"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_backend",
        "reviewed_paths": [
          "backend/main.py",
          "backend/api/v1/user.py",
          "backend/models/user.py",
          "backend/models/userProfile.py",
          "backend/services/user_service.py",
          "backend/services/userprofile_service.py",
          "backend/api/v1/anunces.py",
          "backend/services/anunce_service.py",
          "backend/db/schema.py"
        ],
        "invariant": "Public visibility and shared deletion authority must match account/privacy and publication policy.",
        "method": "source",
        "result": "User list performs a global User query serialized with email and has no auth dependency. News DELETE fetches by public UUID and commits without a caller; creation IP limiting does not authorize deletion. The unauthenticated PUT /users/{user_id} calls an absent UserService.update_user method, so it does not establish a functioning account mutation path. Policy-dependent directory/deletion traces retained; no live data was read or deleted.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "backend/users/anonymous-email-directory",
      "backend/anunces/anonymous-shared-delete"
    ],
    "unresolved": [],
    "assigned_owner": "hunt_backend",
    "prior_fingerprints": [
      "backend/users/anonymous-email-directory",
      "backend/anunces/anonymous-shared-delete"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [
        "backend/api/v1/content_market.py"
      ],
      "4e8be50": [
        "backend/api/v1/content_market.py"
      ]
    },
    "hardening": [
      "Make access-token purpose explicit and consistent for local/social/refresh issuance; use immutable account identifiers as JWT subjects.",
      "Preserve the existing owner-filtered queries and per-field atomic AI claim while adding any approved aggregate admission controls.",
      "Market/news upload paths should enforce a bounded byte read and validate content signatures consistently with diagnosis; no storage abuse is claimed from missing limits alone.",
      "The shared provider work unit contains a new public translation spend boundary that deserves its own deterministic coverage unit.",
      "Do not treat guest Stripe initiation or absent fulfillment code as a demonstrated authorization or payment bypass."
    ]
  },
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
    "status": "candidate",
    "agent_id": "hunt_iot",
    "reviewed_paths": [
      "backend/services/mqtt_subscriber.py",
      "backend/db/database.py",
      "backend/services/device_status_monitor.py",
      "iot/firmware/agritwin_esp32/telemetry.cpp",
      "iot/firmware/agritwin_esp32/config.h",
      "iot/mqtt_sensor_simulator.py",
      "backend/db/schema.py",
      "backend/migrations/migrations.sql",
      "backend/api/v1/fields.py",
      "backend/services/dashboard_service.py",
      "backend/tests/unit/test_mqtt_subscriber.py",
      "iot/firmware/README.md",
      "backend/main.py",
      "backend/Dockerfile",
      "backend/Dockerfile.lambda"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_iot",
        "reviewed_paths": [
          "backend/services/mqtt_subscriber.py",
          "backend/db/database.py",
          "backend/services/device_status_monitor.py",
          "iot/firmware/agritwin_esp32/telemetry.cpp",
          "iot/firmware/agritwin_esp32/config.h",
          "iot/mqtt_sensor_simulator.py",
          "backend/db/schema.py",
          "backend/migrations/migrations.sql",
          "backend/api/v1/fields.py",
          "backend/services/dashboard_service.py",
          "backend/tests/unit/test_mqtt_subscriber.py",
          "iot/firmware/README.md",
          "backend/main.py",
          "backend/Dockerfile",
          "backend/Dockerfile.lambda"
        ],
        "invariant": "Only the authenticated registered device producer may insert its telemetry or affect its online status.",
        "method": "source",
        "result": "Current source subscribes across fields and does not bind publisher/topic to payload.device_id. The Supabase insertion and online-status branches select that claimed id. Registration ownership, FK constraints, registered-only status iteration and owner-scoped dashboard selection are real controls on other boundaries; none authenticates MQTT origin. HTTP CMDs do not start this separate listener. Broker ACL/RLS/activation and successful dummy mutation remain unresolved. Firmware and simulator construct consistent normal payloads; no source-defined authenticated envelope was found.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "backend/services/mqtt_subscriber.py:on_message:unbound-device-authority"
    ],
    "unresolved": [],
    "assigned_owner": "hunt_iot",
    "prior_fingerprints": [
      "backend/services/mqtt_subscriber.py:on_message:unbound-device-authority"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    },
    "hardening": [
      "Require an authenticated per-device message principal and bind it to the registered device/topic before telemetry or status mutation; use broker ACLs plus a source-visible consumer invariant.",
      "Validate MQTT payload byte size, object shape, scalar identifiers, sensor ranges and timestamp freshness before persistence or monitoring. Add bounded malformed-message and replay/identity-mismatch cases with dummy data.",
      "Keep the monitor\u2019s state limited to registered devices and prune expired/removed identities; a foreign-key rejection must not create unrelated retained bookkeeping.",
      "Provisioning should prove the intended board\u2019s identity before credential release, for example with a device-bound setup secret or verified out-of-band identity. Preserve explicit mobile selection and remove automatic first-peer selection in the tester.",
      "Physical flash/NVS encryption and release pairing settings are owner-verification/hardening topics; source alone does not demonstrate extraction of stored Wi-Fi credentials."
    ]
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
    "status": "candidate",
    "agent_id": "hunt_iot",
    "reviewed_paths": [
      "backend/services/mqtt_subscriber.py",
      "backend/db/database.py",
      "backend/services/device_status_monitor.py",
      "backend/db/schema.py",
      "backend/services/dashboard_service.py",
      "backend/tests/unit/test_mqtt_subscriber.py",
      "backend/tests/unit/test_device_status_monitor.py",
      "backend/uv.lock"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_iot",
        "reviewed_paths": [
          "backend/services/mqtt_subscriber.py",
          "backend/db/database.py",
          "backend/services/device_status_monitor.py",
          "backend/db/schema.py",
          "backend/services/dashboard_service.py",
          "backend/tests/unit/test_mqtt_subscriber.py",
          "backend/tests/unit/test_device_status_monitor.py",
          "backend/uv.lock"
        ],
        "invariant": "One malformed or unregistered message must not escape into shared listener control flow or cause indefinite unregistered identity retention.",
        "method": "source",
        "result": "Source handles JSONDecodeError and persistence exceptions, but strict UTF-8 errors and monitor unhashable-key errors are outside containment. The registered-only periodic status loop catches its own failures, yet unknown string ids can accumulate in _last_seen because insertion failure does not gate register_message and no code prunes that map. A timeout changes status only. Dashboard reads are owner filtered with a 50-entry result cap. No local retention/failure fixture or consumer-loop effect was executed; locked Paho is 2.1.0, while a different cached 2.2.0 was not treated as locked-version evidence.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "backend/services/mqtt_subscriber.py:on_message:uncontained-message-errors",
      "backend/services/device_status_monitor.py:register_message:unbounded-identity-retention"
    ],
    "unresolved": [],
    "assigned_owner": "hunt_iot",
    "prior_fingerprints": [
      "backend/services/mqtt_subscriber.py:on_message:uncontained-message-errors",
      "backend/services/device_status_monitor.py:register_message:unbounded-identity-retention"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    },
    "hardening": [
      "Require an authenticated per-device message principal and bind it to the registered device/topic before telemetry or status mutation; use broker ACLs plus a source-visible consumer invariant.",
      "Validate MQTT payload byte size, object shape, scalar identifiers, sensor ranges and timestamp freshness before persistence or monitoring. Add bounded malformed-message and replay/identity-mismatch cases with dummy data.",
      "Keep the monitor\u2019s state limited to registered devices and prune expired/removed identities; a foreign-key rejection must not create unrelated retained bookkeeping.",
      "Provisioning should prove the intended board\u2019s identity before credential release, for example with a device-bound setup secret or verified out-of-band identity. Preserve explicit mobile selection and remove automatic first-peer selection in the tester.",
      "Physical flash/NVS encryption and release pairing settings are owner-verification/hardening topics; source alone does not demonstrate extraction of stored Wi-Fi credentials."
    ]
  },
  {
    "coverage_id": "cloud-and-ci%23release::backend%2FDockerfile%23runtime::release::ATTACK-CLASSES.md%23Access%20control",
    "canonical_refs": {
      "surface": "cloud-and-ci#release",
      "boundary": "backend/Dockerfile#runtime",
      "subsystem": "release",
      "attack_class": "ATTACK-CLASSES.md#Access control"
    },
    "surface": "CI trust, deployment inputs, security coverage and runtime identity",
    "boundary": "backend/Dockerfile#runtime",
    "subsystem": "release",
    "attack_class": "Access control",
    "starting_paths": [
      ".github/workflows",
      "backend/Dockerfile",
      "backend/docker-compose.yaml",
      "scripts/security"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Access control",
    "selected_companion_blocks": [
      "CLOUD-AND-DEPLOYMENT.md#Core discipline",
      "CLOUD-AND-DEPLOYMENT.md#Container and orchestration attack classes",
      "CLOUD-AND-DEPLOYMENT.md#Configuration and secret lifecycle attack classes",
      "CLOUD-AND-DEPLOYMENT.md#Universal moves",
      "CLOUD-AND-DEPLOYMENT.md#Validation rules",
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
      "SUPPLY-CHAIN-AND-RELEASE.md#Dependency and build-input attack classes",
      "SUPPLY-CHAIN-AND-RELEASE.md#CI and automation attack classes",
      "SUPPLY-CHAIN-AND-RELEASE.md#Universal moves",
      "SUPPLY-CHAIN-AND-RELEASE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "CLOUD-AND-DEPLOYMENT.md#Workload identity and IAM attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "CLOUD-AND-DEPLOYMENT.md#Ingress, network, and control-plane attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "CLOUD-AND-DEPLOYMENT.md#Managed storage, events, and edge attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "SUPPLY-CHAIN-AND-RELEASE.md#Release and update attack classes",
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
    "prior_status": "prior_blocked",
    "attempts": [],
    "wave": 1,
    "status": "blocked",
    "agent_id": "parent",
    "reviewed_paths": [
      ".github/workflows",
      "backend/Dockerfile",
      "backend/docker-compose.yaml",
      "scripts/security"
    ],
    "local_checks": [
      {
        "agent_id": "parent",
        "reviewed_paths": [
          ".github/workflows",
          "backend/Dockerfile",
          "backend/docker-compose.yaml",
          "scripts/security"
        ],
        "invariant": "CI trust, deployment inputs, security coverage and runtime identity",
        "method": "source",
        "result": "Reviewed workflows and both Dockerfiles: ordinary runtime appuser; frozen uv resolution, Lambda require-hashes; deployment runs from staging/manual and pushes mutable latest then Render hooks. No pull_request_target execution path found in workflows. ZAP/sonar independently report deployment/source with coverage limits; CI tests are successful on identical application source. Effective workflow permissions, cloud/IAM/RLS, deployed digest, Node support and container package CVEs are not established by source.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [
      "Effective cloud policies, exact deployed image/SHA and base-image package inventory unavailable; no image runtime analysis."
    ],
    "assigned_owner": "parent",
    "prior_fingerprints": [],
    "source_comparison_changed_paths": {
      "421e90d": [
        ".github/workflows"
      ],
      "4e8be50": [
        ".github/workflows"
      ]
    },
    "hardening": []
  },
  {
    "coverage_id": "git%23history-and-lockfiles::git%23tracked-source::repository::ATTACK-CLASSES.md%23Cryptography%20and%20secrets",
    "canonical_refs": {
      "surface": "git#history-and-lockfiles",
      "boundary": "git#tracked-source",
      "subsystem": "repository",
      "attack_class": "ATTACK-CLASSES.md#Cryptography and secrets"
    },
    "surface": "Credential history and vulnerable dependency inventory",
    "boundary": "git#tracked-source",
    "subsystem": "repository",
    "attack_class": "Cryptography and secrets",
    "starting_paths": [
      "backend/uv.lock",
      "agritwin-app/package-lock.json",
      ".gitignore"
    ],
    "ordinary_attack_class_block": "ATTACK-CLASSES.md#Cryptography and secrets",
    "selected_companion_blocks": [
      "SUPPLY-CHAIN-AND-RELEASE.md#Core discipline",
      "SUPPLY-CHAIN-AND-RELEASE.md#Dependency and build-input attack classes",
      "SUPPLY-CHAIN-AND-RELEASE.md#Universal moves",
      "SUPPLY-CHAIN-AND-RELEASE.md#Validation rules"
    ],
    "excluded_blocks": [
      {
        "block": "SUPPLY-CHAIN-AND-RELEASE.md#CI and automation attack classes",
        "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"
      },
      {
        "block": "SUPPLY-CHAIN-AND-RELEASE.md#Release and update attack classes",
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
    "prior_status": "prior_covered_same_source",
    "attempts": [],
    "wave": 1,
    "status": "covered",
    "agent_id": "parent",
    "reviewed_paths": [
      "backend/uv.lock",
      "agritwin-app/package-lock.json",
      ".gitignore",
      "backend/tests/unit/services/test_social_auth_service.py",
      "scripts/security/tests/test_deployed_security_report.py"
    ],
    "local_checks": [
      {
        "agent_id": "parent",
        "reviewed_paths": [
          "backend/uv.lock",
          "agritwin-app/package-lock.json",
          ".gitignore",
          "backend/tests/unit/services/test_social_auth_service.py",
          "scripts/security/tests/test_deployed_security_report.py"
        ],
        "invariant": "Credential history and vulnerable dependency inventory",
        "method": "source",
        "result": "Fresh TruffleHog3.99.9 dev-history scan with verification/updates disabled, archives skipped returned two URI detector hits in intentional credential-rejection fixtures, no newly identified credentials. Public latest version is3.100.0; this run reused locally available checksum-checked3.99.9. npm advisory query of copied lockfile reports27 affected entries(5high22moderate); OSV99 Python name/version queries match5 packages. No target install/scripts executed; package/advisory matches are metadata, not exploit proof. Existing untracked docs excluded from commit scan.",
        "artifact": null
      }
    ],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "parent",
    "prior_fingerprints": [],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    },
    "hardening": []
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
    "status": "candidate",
    "agent_id": "hunt_iot",
    "reviewed_paths": [
      "agritwin-app/src/services/bleProvisioning.ts",
      "agritwin-app/src/hooks/use-ble-provisioning.ts",
      "iot/firmware/agritwin_esp32/provisioning.cpp",
      "iot/firmware/agritwin_esp32/settings.cpp",
      "iot/firmware/agritwin_esp32/agritwin_esp32.ino",
      "iot/firmware/agritwin_esp32/config.h",
      "iot/firmware/tools/provision_ble.py",
      "agritwin-app/src/hooks/use-device-setup.ts",
      "agritwin-app/src/app/add-device.tsx",
      "agritwin-app/src/services/bleManager.ts",
      "agritwin-app/src/services/blePermissions.ts",
      "agritwin-app/src/components/device-setup/ScanSteps.tsx",
      "agritwin-app/src/components/device-setup/DeviceSetupScreen.tsx",
      "agritwin-app/__tests__/unit/helpers/fakeBleManager.ts",
      "agritwin-app/__tests__/unit/services/bleProvisioning.test.ts",
      "agritwin-app/app.json"
    ],
    "local_checks": [
      {
        "agent_id": "hunt_iot",
        "reviewed_paths": [
          "agritwin-app/src/services/bleProvisioning.ts",
          "agritwin-app/src/hooks/use-ble-provisioning.ts",
          "iot/firmware/agritwin_esp32/provisioning.cpp",
          "iot/firmware/agritwin_esp32/settings.cpp",
          "iot/firmware/agritwin_esp32/agritwin_esp32.ino",
          "iot/firmware/agritwin_esp32/config.h",
          "iot/firmware/tools/provision_ble.py",
          "agritwin-app/src/hooks/use-device-setup.ts",
          "agritwin-app/src/app/add-device.tsx",
          "agritwin-app/src/services/bleManager.ts",
          "agritwin-app/src/services/blePermissions.ts",
          "agritwin-app/src/components/device-setup/ScanSteps.tsx",
          "agritwin-app/src/components/device-setup/DeviceSetupScreen.tsx",
          "agritwin-app/__tests__/unit/helpers/fakeBleManager.ts",
          "agritwin-app/__tests__/unit/services/bleProvisioning.test.ts",
          "agritwin-app/app.json"
        ],
        "invariant": "Wi-Fi credentials must be released only to the intended authenticated physical board, with setup/normal-mode and user-consent boundaries preserved.",
        "method": "source",
        "result": "The real Add device route re-exports useBleProvisioning. Mobile requires Bluetooth permission and explicit board selection, validates INFO structure, then writes password before HTTP registration. No independent recipient proof is present. The companion tester selects the first UUID/name-matching board and follows the same release order. Firmware password is write-only and not logged; boot with valid settings avoids BLE and physical BOOT hold resets settings. These limit exposure but do not authenticate an impostor recipient. Effective pairing, firmware and any physical/out-of-band procedure are unknown; no native fixture was executed.",
        "artifact": null
      }
    ],
    "result_fingerprints": [
      "agritwin-app/src/services/bleProvisioning.ts:sendWifiSettings:unverified-credential-recipient"
    ],
    "unresolved": [],
    "assigned_owner": "hunt_iot",
    "prior_fingerprints": [
      "agritwin-app/src/services/bleProvisioning.ts:sendWifiSettings:unverified-credential-recipient"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    },
    "hardening": [
      "Require an authenticated per-device message principal and bind it to the registered device/topic before telemetry or status mutation; use broker ACLs plus a source-visible consumer invariant.",
      "Validate MQTT payload byte size, object shape, scalar identifiers, sensor ranges and timestamp freshness before persistence or monitoring. Add bounded malformed-message and replay/identity-mismatch cases with dummy data.",
      "Keep the monitor\u2019s state limited to registered devices and prune expired/removed identities; a foreign-key rejection must not create unrelated retained bookkeeping.",
      "Provisioning should prove the intended board\u2019s identity before credential release, for example with a device-bound setup secret or verified out-of-band identity. Preserve explicit mobile selection and remove automatic first-peer selection in the tester.",
      "Physical flash/NVS encryption and release pairing settings are owner-verification/hardening topics; source alone does not demonstrate extraction of stored Wi-Fi credentials."
    ]
  }
]

Current candidate fingerprints: ["agritwin-app/src/app/auth/oauth-callback.tsx:unbound_native_ticket", "agritwin-app/src/services/auth.ts:authenticatedFetch_cross_account_retry", "agritwin-app/src/services/auth.ts:refreshAuth_late_session_commit", "agritwin-app/src/services/bleProvisioning.ts:sendWifiSettings:unverified-credential-recipient", "agritwin-app/src/services/gardenPicker.ts:late_response_current_account_cache_key", "backend/anunces/anonymous-shared-delete", "backend/auth/reset-jwt-as-bearer", "backend/crops/shared-catalog-write-authority", "backend/market/anonymous-translation-budget", "backend/services/device_status_monitor.py:register_message:unbounded-identity-retention", "backend/services/mqtt_subscriber.py:on_message:unbound-device-authority", "backend/services/mqtt_subscriber.py:on_message:uncontained-message-errors", "backend/tasks/aggregate-inference-budget", "backend/users/anonymous-email-directory", "scripts/generate_costs_csv.py:write_xlsx:issue-title-as-formula"]

Hunter-proposed gaps: [
  {
    "surface": "backend/api/v1/content_market.py#localized-public-reads",
    "boundary": "backend/services/translation_service.py#translate",
    "subsystem": "backend/market-translation",
    "attack_class": "Business logic",
    "starting_paths": [
      "backend/api/v1/content_market.py",
      "backend/services/translation_service.py",
      "backend/services/ai_dependencies.py",
      "backend/services/rate_limit.py"
    ],
    "reason": "Localized public GETs were added since 4e8be50 and cross anonymous caller to provider-spend authority. Source trace is tracked under provider-work but its entry/admission differs from the cron-secret task boundary; candidate backend/market/anonymous-translation-budget needs an explicit unit."
  }
]

Prior coverage: general run 421e90d incomplete (14 preliminary candidates, no final records); quick delta 4e8be50 reviewed changed forms/geocoding/cron, other units outside scope. Both ledgers source-compared; no prior confirmed exclusions. Prior paths are in run-metadata.json. Inspect whether any unresolved old lead lacks a current unit, and check changed source since4e8be50.



Immediately after each hunter wave, spend the reserved invocation on one fresh `research` post-wave coverage critic. It receives `architecture.md`, the full coverage ledger including each assignment block map, current candidate fingerprints and states, and the prior-ledger gap summary. It reads source but does not write or run targets. Require exactly this JSON:

```json
{
  "missing_units": [
    {
      "surface": "...",
      "boundary": "...",
      "subsystem": "...",
      "attack_class": "...",
      "starting_paths": ["repo/relative/path"],
      "selected_companion_blocks": ["FILE.md#section"],
      "excluded_blocks": [{"block": "FILE.md#section", "reason": "..."}],
      "reason": "source-backed coverage gap"
    }
  ],
  "reassign_ids": ["existing-id-that-did-not-close"],
  "resolved_prior_leads": ["fingerprint"],
  "stop": false
}
```

The critic checks for unmapped entry points, unchecked parallel paths, missing lifecycle modes, selected companion classes without a unit, unjustified exclusions, units closed without paths/checks, and prior `needs_validation` or changed-source gaps that no unit addresses. It proposes coverage, not findings. `stop` is the critic's own assessment: `true` only when it accepts no `missing_units` and no `reassign_ids`; the parent's loop condition below, not `stop` alone, decides whether another wave runs. For each fingerprint in `resolved_prior_leads`, the parent marks the linked unit or prior-lead entry resolved and records the critic's source-backed reason.

The parent rejects proposed units outside the review scope or source/local boundary, derives canonical IDs for accepted units, and deduplicates them against current units. A prior same-source completed unit may supply evidence; prior `deferred`, `blocked`, `out_of_scope`, or changed-source units become current work and never suppress an accepted unit. Fail rather than merge a canonical ID collision. For each legitimate `reassign_id` with live `blocked`, `covered`, or `candidate` evidence, append that exact terminal record to the unit's `attempts` with the critic's source-backed `reassignment_reason`. Preserve its owner, checks, artifacts, fingerprints, and unresolved facts in that archive. Increment the live `wave`; the next hunter must be a fresh owner and receives an `in_progress` unit with empty live evidence. The hunter's terminal result writes only its new evidence into the live fields. Never copy an archived owner's checks or artifacts into the new live attempt. Sort IDs and validate the ledger before another assignment. In `standard` and `deep`, when the post-wave critic reports no accepted `missing_units` or legitimate `reassign_ids` and no `planned` units remain, spend the separately reserved invocation on a distinct final-clean critic. Complete coverage only when that critic also returns no accepted work. If it finds work, queue it and repeat the wave, post-wave critic, and final-clean process. If time or resources force an early stop, mark every untouched unit `deferred`, preserve the critic's reason, and disclose the gap in the report. Never use a silent wave or agent cap as evidence of complete coverage.

The run profile bounds this loop. A `quick` run has exactly one hunter wave followed by exactly one final critic pass. Add each accepted `missing_unit` to the current ledger and mark it `deferred` with reason `quick_profile_final_critic`. For each legitimate evidence-bearing `reassign_id`, archive the live terminal state in `attempts`, increment `wave`, and set the live state to unassigned `deferred` with empty evidence and reason `quick_profile_final_critic`. Do not launch a second hunter wave or another critic. In a scoped run, the critic still reports out-of-scope gaps it notices, but the parent records them as `out_of_scope` with the critic's reason instead of assigning them. The early-stop rule above is the same mechanism: `quick` is a pre-declared early stop, not evidence of complete coverage.

A budget bounds it the same way. Before assigning each wave, compare remaining budget against its hunter count, the validation reserve, the immediate post-wave critic, and the retained final-clean critic (`quick` reserves only its single final post-wave critic). Shrink the hunter wave to fit, taking units in priority order. If those mandatory reserves do not fit, launch no hunter from that wave and mark its planned units `deferred` with reason `budget_cannot_reserve_critics_and_validation`. Critic-proposed units enter the same ranked queue rather than extending the budget. If surviving candidates exceed the validation reserve, follow the incomplete-run rule in `SKILL.md`: stop hunting, validate in fingerprint order, retain unvalidated units as unresolved candidates, and never present them as findings.


Target: /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/AGRITWIN. Return exactly the required JSON object. Save same JSON to /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/security-reviews/run-2026-11-20-security-audit/agents/critic_wave/scratch/result.json. Your scratch is your only writable directory; artifacts parent-owned, promotion allowlist empty. Source-only limitation is explicit: effective deployment and missing runtime observations remain blockers, not a reason to fake source coverage. Return source-backed reasoning in each missing unit.