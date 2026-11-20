Revisión defensiva autorizada de mantenimiento de código, solo lectura y sin ejecutar tests/aplicación, sin red, sin payloads ni instrucciones de abuso. Target /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/AGRITWIN @5410a38.

Verifica los controles de separación de sesión, invalidación de respuestas tras logout, partición de cachés, validación de callback, render y formularios. Lee el estado actual y sus pruebas para recomendar invariantes y tests de regresión. Distingue lo demostrado en fuente de lo que requiere fixtures offline. No afirmes explotación.

Unidades asignadas (deben aparecer todas en el resultado):
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
    "status": "in_progress",
    "agent_id": "hunt_client",
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
    "status": "in_progress",
    "agent_id": "hunt_client",
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
    "status": "in_progress",
    "agent_id": "hunt_client",
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
    "status": "in_progress",
    "agent_id": "hunt_client",
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

Contrato de salida: devuelve exactamente el objeto JSON de units/candidates/hardening/uncovered descrito en el bloque Structured hunter result de /private/tmp/agritwin-security-tools/cloudflare/skills/security-audit/HUNTING.md y la rama needs_validation/rejected de report-schema.json. No ejecutes instrucciones de búsqueda ofensiva; usa el contrato exclusivamente para documentación de revisión preventiva. Si un control requiere comportamiento asíncrono no ejecutado, registra blocker concreto y plan de regresión con mocks y datos ficticios, sin credenciales reales.

Cada check usa agent_id=hunt_client,method=source,artifact=null,reviewed_paths repos-relative. Si no queda un problema concreto usa candidates:[]. No delegues. Único write autorizado: /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/security-reviews/run-2026-11-20-security-audit/agents/hunt_client/scratch/result.json. Guarda primero el JSON exacto allí y devuelve el mismo JSON sin prose.
