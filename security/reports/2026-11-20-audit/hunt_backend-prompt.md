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
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_backend",
    "prior_fingerprints": [
      "backend/auth/reset-jwt-as-bearer"
    ],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    }
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
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_backend"
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
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_backend"
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
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_backend",
    "prior_fingerprints": []
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
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
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
    }
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
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_backend"
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
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
    "unresolved": [],
    "assigned_owner": "hunt_backend",
    "prior_fingerprints": [],
    "source_comparison_changed_paths": {
      "421e90d": [],
      "4e8be50": []
    }
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
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
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
    }
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
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
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
    }
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
    "status": "planned",
    "agent_id": null,
    "reviewed_paths": [],
    "local_checks": [],
    "result_fingerprints": [],
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



**Injection** (subagent_type: `general`)
Trace untrusted input from entry point to dangerous sink. What counts as a "dangerous sink" depends on the application:
- Web apps: SQL queries, HTML output, shell commands, template engines, file paths, HTTP redirects, deserialization
- Libraries: any function that processes caller-supplied data without validation — buffer operations, parsers, format strings
- CLI tools: shell command construction, file path handling, environment variable interpolation
- Services: query construction, message serialization, log injection, LDAP/XPATH queries
- Client-side (browser/JS): DOM XSS, prototype pollution, `postMessage`/origin trust, and other browser-side classes — covered by the [CLIENT-SIDE.md](CLIENT-SIDE.md) companion blocks when selected

Do not stop at the obvious direct paths. Look for indirect injection: data stored safely, then retrieved and used in a dangerous context by different code. Look for injection through field names, keys, headers, and metadata — not just values. Look for injection into secondary systems (logs, caches, search indexes, analytics).



**Business logic** (subagent_type: `general`)
Hunt logic errors by hand: standard scanners cannot find them, and they yield high-impact findings. For each major workflow:
- **State machine violations**: Can you skip steps? Go backwards? Reach an invalid state? What happens if you replay a completed flow? What about partial failure — if step 2 of 3 fails, is step 1 rolled back?
- **Race conditions with business impact**: Concurrent operations that produce invalid states (double-spend, double-approve, lost updates). Focus on operations that check-then-act non-atomically.
- **Numeric/quantity manipulation**: Negative values, zero values, overflow, precision loss, type coercion between string and number.
- **Access boundary violations**: Not "does the permission check exist" but "is it the right check for the business rule?" Can input to one operation bypass a restriction enforced on a different operation for the same effect?
- **Implicit trust assumptions**: Data from storage, config, other components, or plugins assumed safe because "we validated it on the way in." What if a different code path wrote it?
- **Time-based logic**: Expiry checks, scheduling, rate windows, clock skew. What happens at exact boundary moments? What about timezone differences between components?
- **Default and fallback behavior**: What is the security posture when config is missing? When a feature flag is off? When a dependency is unavailable? When the system is mid-migration?



**Feature abuse and data leakage** (subagent_type: `general`)
Legitimate features used for unintended purposes. Look for bugs in the design, not only in the code:
- **Export/backup as exfiltration**: Can a low-privilege user trigger an export, snapshot, or backup that includes data above their access level? Can they export other users' data? Does the export include deleted/draft/private content? Revision history that was supposed to be pruned?
- **Import/restore as injection**: Can import overwrite existing data? Can it create records that bypass normal validation? Can it inject content into collections the user has no write access to? Does it respect the same permission model as the UI?
- **Search/filter/sort as oracle**: Can search queries reveal whether content exists that the user cannot directly access? Do filter parameters let users probe statuses, roles, or fields they should not know about? Does sorting by a hidden field reveal its values through result ordering?
- **Enumeration through side effects**: Do error messages differ between "does not exist" and "no access"? Do response times differ? Response sizes? HTTP status codes? Can you enumerate users through password reset, invite, or registration flows?
- **Preview/draft/staging leakage**: Are preview tokens scoped to one item or do they unlock broader access? Can draft content be discovered through search, RSS feeds, sitemaps, or API listing endpoints? Can cache headers cause a CDN to serve private content publicly?
- **Notification/webhook as SSRF**: Can a user set a notification URL, webhook URL, or callback URL that the server fetches? Is it validated against internal networks? What about after a redirect?



## Core discipline (include in every agent prompt for this domain)

```
- Framing and cache findings require two interpretations of the same request, response, or key. Name both components and the exact normalized value on each side.
- For every credential, find the signature or secret verification and every binding required for its role: issuer, audience, origin, RP, client, session, principal, resource, assurance, expiry, and one-time state.
- Host, Forwarded, X-Forwarded-*, Origin, Referer, redirect targets, callback state, and request-derived URLs are trust decisions. Trace each to the affected identity or response.
- A missing header, cookie attribute, MFA prompt, or rate limit is not a finding alone. Require an accepted invalid request, cross-principal impact, assurance downgrade, or credential disclosure.
- Classify `confirmed` only from complete source evidence and bounded local request/token tests. Use `needs_validation` when proxy, IdP, browser, certificate, secret, or deployed configuration is required but not visible.
```



## Universal moves (apply across the above)

- Walk issue → store → transmit → consume → refresh → revoke for every credential and challenge. Compare normal, error, retry, migration, legacy, and account-switch paths.
- Enumerate every door to the same identity and every route to the same sensitive operation. The effective policy is the weakest parallel path, not the most polished UI.
- Diff parser, proxy, router, cache, and application normalization side by side. For local validation, feed identical bounded request fixtures into each component rather than sending traffic to a live deployment.
- For recovery and linking, draw the account before/after graph. Each edge must name the current principal, proof of the new identity, required assurance, callback/session binding, and revocation effect.



## Validation rules (apply before reporting ANY finding here)

1. Apply a source-visibility gate. Proxy chains, edge cache keys, IdP policy, certificate trust, browser cookie behavior, secrets, and deployed auth modes may be outside the repository. Record a precise `needs_validation` candidate instead of asserting missing infrastructure behavior.
2. For framing and cache findings, name both components and the divergent parse/key. Confirm cross-request, cross-user, or private-response impact with bounded local fixtures.
3. For token, MFA, passkey, account-link, recovery, API-key, and mTLS findings, cite the verification line and missing principal/session/resource/origin/audience/action/assurance binding. Prove the server accepts the invalid transition or credential.
4. For CSRF, name the ambient credential, state-changing route, accepted cross-site request shape, browser cookie policy, and missing effective check. Read-only actions and routes requiring a non-ambient bearer token do not qualify.
5. Verify framework and library defaults. If version or configuration is unknown, use `needs_validation`; do not turn an unverified critical claim into a lower-severity confirmed finding.
6. Return `confirmed` only with a complete source trace and observable unauthorized identity, state, or disclosure. For `needs_validation`, name the missing fact and safe local or owner-observed check that resolves it.


## Browser-session attack classes (subagent_type: `general`)

**Ordinary CSRF**
A browser sends ambient credentials to a state-changing endpoint that accepts a cross-site request without an effective anti-CSRF token, same-site request binding, or strict Origin/Referer validation. Inventory every cookie-authenticated mutation, including form, JSON-like, multipart, method-override, and legacy routes. SameSite is effective only for the cookie and browser contexts actually used; login CSRF and cross-site subresource requests can have different requirements.

**Session fixation and invalidation**
Session identifiers are not rotated on login, account switch, MFA completion, impersonation, or other privilege changes, or remain valid after logout, password change, revocation, and account disable. Check server sessions, refresh tokens, signed cookies, websocket state, cache copies, and fallback endpoints.

**Cookie scope and transport**
A sensitive cookie has an over-broad `Domain` or `Path`, can cross an insecure transport, or conflicts with a sibling cookie that another component selects differently. Bare missing flags remain hardening notes unless a realistic less-trusted origin, network position, or browser path can gain or replace the credential.



## Federated-identity attack classes (subagent_type: `general`)

First establish role. Authorization-server controls such as redirect allowlisting and code issuance do not belong to a relying-party client. Verification and binding defects belong to the component consuming the artifact.

**JWT verification and claim binding**
Check signature verification, server-pinned algorithm and key source, then `exp`, `nbf`, `aud`, and `iss`. Review `kid`, `jku`, and `x5u` as untrusted key selectors, duplicate/header normalization, and decode-without-verify paths. A valid token for another service is invalid here even when signed by a trusted issuer.

**OAuth/OIDC request and callback binding**
Validate exact `redirect_uri` ownership where the target is the authorization server; session-bound `state`; PKCE and authorization-code binding where applicable; ID-token issuer/audience/signature/nonce; and selected-IdP binding in multi-provider flows. Compare initial callback, retry, mobile/deep-link, and account-link routes.

**SAML signed-object and assertion binding**
Ensure the element whose signature is validated is the element used as identity. Review unsigned/fallback paths, safe XML parser configuration, canonicalization differences, and freshness/binding fields such as validity windows, audience/recipient, request correlation, and replay state.



## MFA, passkey, and account-transition attack classes (subagent_type: `general`)

**MFA enrollment and assurance downgrade**
Enrollment, replacement, disablement, recovery-code generation, trusted-device creation, and fallback login require the intended prior assurance. Check that a valid first factor cannot enroll or replace the second factor without policy-required fresh authentication, and that disabled or stale factors stop authorizing sessions.

**Step-up binding and bypass**
A successful challenge upgrades the wrong session, account, tenant, action, or API request, or an alternate route omits the assurance check. Bind the challenge to principal, current session, assurance target, operation or resource when required, expiry, and one-time completion. Compare UI, API, batch, recovery, and resumed-flow paths.

**WebAuthn and passkey verification**
At registration, bind challenge, RP ID, expected origin, credential, user/userHandle, algorithm, and policy-required user verification to the initiating session. At authentication, verify challenge, RP/origin, credential membership, signature, and intended user presence/verification. Check account-discovery and linking flows for userHandle or credential-to-account confusion. Signature-counter handling is meaningful only when the product treats regressions as a clone signal.

**Account linking and identity collision**
Adding an IdP, passkey, email, phone, device, or external account to an existing account must require a current authenticated session, verified ownership of the new identity, policy-required step-up, and callback state bound to the account that initiated linking. Review unlink/relink and invite-acceptance paths for verified-identifier or tenant collisions.

**Password reset and broader recovery**
Recovery tokens, support/admin recovery, backup codes, device migration, and email or phone change often become the weakest authentication path. Verify token randomness, user/action binding, expiry, one-time state, rate/accounting controls, delivery URL trust, and invalidation of prior tokens and sessions. Different responses that only reveal public account existence are not automatically security findings.



## HTTP framing and cache attack classes (subagent_type: `general`)

**Request framing and desynchronization**
Front end and back end disagree on request length or header normalization. Review multiple `Content-Length` values, `Transfer-Encoding`, HTTP/2 or HTTP/3 downgrade, header-name normalization, forbidden connection headers, and CR/LF conversion. Confirm which bytes one component assigns to a request and which bytes its peer assigns to the next request.

**Web cache poisoning through unkeyed input**
A request value changes cached content or security-relevant headers but is absent from the cache key. Compare cache key construction with every response variant, including forwarded host/scheme, selected cookies, query normalization, language/device headers, and authorization state.

**Cache deception and private-response caching**
Cache routing treats a private dynamic path as a public static asset, or caches a response whose identity and authorization inputs are missing from policy. Compare edge cacheability with application route parsing, suffix/path-parameter normalization, and response cache directives.

**Host and forwarded-header trust**
Untrusted host/proxy metadata determines absolute URLs, tenant routing, callbacks, reset links, cache keys, or the client address used by authorization. Confirm who can supply the header and whether trusted ingress removes client-provided copies.

**Response-header injection**
Untrusted data reaches `Location`, `Set-Cookie`, CSP, or another response header with unsafe control characters or normalization. Verify framework rejection before reporting and require a security-relevant response change.



## API-key and mTLS attack classes (subagent_type: `general`)

**API-key scope and resource binding**
A key authenticates to broader tenants, resources, actions, or environments than its server-side record grants, or request parameters override those bindings. Review key lookup, prefix/full-secret verification, type confusion between publishable and secret keys, scope checks, rotation, revocation caches, and bulk endpoints.

**API-key exposure and unsafe transport**
Keys appear in client bundles, URLs, redirects, logs, error paths, build artifacts, or responses accessible to a lower-trust principal. A public identifier called a key is not a secret. Confirm key type and the authority gained by disclosure.

**mTLS peer and application-identity confusion**
A process trusts client-certificate identity headers from any network peer, verifies a chain but maps attacker-influenceable subject text to an account incorrectly, or accepts a certificate for the wrong trust domain, extended usage, audience, or validity policy. Where a trusted proxy terminates mTLS, verify only that proxy can connect, it removes incoming identity headers, and the backend binds the sanitized identity to the request.

**Certificate lifecycle fallback**
Expired, revoked, missing, or renewal-failed certificates cause silent fallback to bearer-only or anonymous operation, or long-lived pooled connections retain authorization after revocation. Missing deployment revocation data makes the result `needs_validation`; an in-repo fail-open branch is source-confirmable.



## Core discipline (include in every agent prompt for this domain)

```
- Prompt injection alone is not a finding. Require a code-level boundary failure: content reaches another principal's context, invokes authority the requester lacks, discloses data they cannot read, or drives a sink they cannot reach directly.
- Model output, memory, tool descriptions, and MCP responses are untrusted inputs. Point to the code that grants authority, trusts output, writes durable state, or feeds a sink.
- A guardrail prompt is not a security boundary. Count only deterministic checks, resource-scoped authorization, isolation, binding, and constrained credentials.
- State the attacker, affected principal, effective execution identity, resource, exact action, authority used, and observable impact. An intentional direct request to use the requester's existing authority is not a delegation defect merely because a model executes it.
- Authorization and action binding are separate controls. Attacker-controlled content that causes an action under an affected principal's valid authority is an action-binding failure when that principal did not intentionally request or approve the exact action.
- Classify every candidate as `confirmed` only after source evidence and bounded local validation establish the boundary and result. Use `needs_validation` when a required provider, deployment, model, renderer, or identity behavior is not observable locally.
```



## Context, retrieval, and memory attack classes (subagent_type: `general`)

**Indirect injection through retrieved or ingested content**
An attacker can write a RAG document, indexed page, file, email, issue body, tool response, or metadata that enters a different principal's model context. Trace who can write each source, how retrieval scopes it, whose session consumes it, and what capability is enabled there. Check isolation, resource authorization, and binding to the consuming principal's intent separately. The defect is a missing deterministic control, not persuasive text by itself.

**Cross-session or cross-tenant context bleed**
Conversation history, embeddings, retrieval results, or prompt caches are keyed too broadly. Verify tenant and ACL filters in the query itself and every cache key. A tenant field stored on an object is not enforcement if an alternate query, shared cache, or batch path omits it.

**Persistent memory poisoning**
Attacker-controlled content or model summaries are written into memory that later shapes another task, user, or privileged session. Review who may create, update, merge, and delete memory; its provenance and tenant scope; whether low-trust observations become durable instructions or facts; and whether retrieval distinguishes user preferences from tool policy. Memory intentionally saved by a user and used only for that user's intentional, allowed requests is not a cross-boundary finding.

**Prompt role and provenance confusion**
Prompt assembly lets untrusted text impersonate a system message, prior turn, tool result, policy, or memory record. Look for string concatenation, untyped history, caller-controlled role fields, and serialization round trips that lose source labels. Confirm that the forged provenance changes a deterministic trust decision or reaches a meaningful capability.



## Tool and action attack classes (subagent_type: `general`)

**Tool-argument injection into a downstream sink**
Model-produced arguments reach SQL, shell, file, URL-fetch, or privileged APIs without handler-side validation. Treat the tool schema as input parsing, then follow each field from decoded call to sink. Structured output narrows shape; it does not establish authorization, safe paths, safe URLs, or query semantics.

**Excessive agency and confused-deputy authority**
The agent uses a service identity or broad credential, while the tool handler does not re-check the requesting principal's permission on the named resource. Verify both the effective identity and whether the caller could perform that exact operation through the normal product interface. A shared credential with enforced per-user query scope is not a defect.

**Action-confirmation and approval binding**
A user approves one described action but execution can use changed arguments, a different resource, a different principal, or a later model turn. An action-binding defect also exists when attacker-controlled content causes a side effect under a victim's valid authority without the victim's intentional request or approval, even if generic authorization permits the victim to perform it. Review whether intent or confirmation binds the normalized tool name, complete argument object, requester, target, amount, expiry, and batch membership. Check retries and resumed sessions: an approval must not authorize a mutated or duplicate side effect.

**Tool-schema and dispatcher disagreement**
The schema accepts aliases, extra fields, duplicate keys, coercions, nested free-form objects, or out-of-range values that the dispatcher or handler interprets differently. Compare schema validation, canonicalization, generated bindings, and handler defaults. Validate again where values become resource selectors or security-relevant options.

**Unbounded delegated action loops**
A bounded request can enqueue repeated spend, send, mutation, or external API work without a per-request budget, per-action authorization, cancellation, or idempotency control. Confirm impact on shared cost, quotas, other users, or durable state. Do not test by exhausting a service; use code-level accounting and a locally bounded loop.



## MCP and sub-agent trust classes (subagent_type: `general`)

**Sub-agent and MCP trust inheritance**
A delegated task receives the full session, credentials, memory, or capabilities rather than the least authority required. Check the principal and tenant carried into each call, capability narrowing, credential audience, and whether delegated results are treated as untrusted on return.

**MCP server and tool identity confusion**
Calls or results are routed by attacker-influenceable server names, tool names, request IDs, resource URIs, or model-selected aliases rather than the authenticated connection and outstanding request. Check whether two servers can claim the same tool or resource identity, whether reconnect changes the binding, and whether a response from one server can satisfy another server's pending call.

**MCP metadata and schema as policy**
Tool descriptions, resource metadata, prompts, completion hints, or schemas supplied by an MCP peer are trusted as policy or authorization. These fields can guide the model but cannot grant capability. Find the deterministic allowlist, server identity check, and handler authorization that remain authoritative when metadata conflicts.



## Output and disclosure attack classes (subagent_type: `general`)

**Insecure output rendering**
Model output reaches an executing HTML, Markdown, template, URL, or command sink without the sink's required encoding and policy. For browser rendering, verify auto-loaded resources and CSP or sanitization in `CLIENT-SIDE.md`; renderer behavior outside the repository makes the candidate `needs_validation`.

**Sensitive context extraction**
The assembled context contains credentials, another user's data, private source, or policy values that themselves grant access, and user-influenced output exposes them. Read prompt assembly and data-fetch code. Disclosure of generic instructions or behavior that does not cross a data boundary is not a finding.



## Universal moves (apply across the above)

- Draw four maps first: each execution identity, each capability, every writable context or memory source, and each output destination. Then connect the principal at the start to the authority at the end.
- Start at side-effecting tools and work backward through dispatcher, schema, confirmation, model context, retrieval, and ingestion. Start at durable memory reads and trace every writer.
- Compare direct, queued, retry, resume, batch, and delegated paths for the same action. The strongest gate must apply after arguments are final and before every side effect.



## Validation rules (apply before reporting ANY finding here)

1. Name the crossed boundary and observable result: attacker, affected principal or shared resource, execution identity, target, and unauthorized or unrequested action or disclosure.
2. For confused-deputy authority claims, prove the tool lacks requester-and-resource authorization and that the attacker cannot perform the same action normally. For action-binding claims, instead prove attacker-controlled content caused an action under the affected principal's authority that the principal did not intentionally request or approve. Valid generic authorization does not establish that intent.
3. For memory or retrieval claims, cite both the attacker-controlled write and the later cross-principal read or privileged decision. A shared record without a reachable consumer is not enough.
4. For action binding, establish the intentional request or normalized approved object, if any, and compare it with the object the handler uses. Confirm a locally observable unrequested action, mutation, duplicate, or authority change without extending the test into harmful execution. For schema disagreement, compare the normalized validated object with the handler's object.
5. For MCP identity claims, verify the authenticated connection, request correlation, tool namespace, and effective credential. Mark `needs_validation` if external server identity or deployment routing is required.
6. Return `confirmed` findings only with a complete source trace and meaningful result. Return `needs_validation` for a specific unresolved boundary fact and state the bounded local or owner-observed check needed to resolve it.


## Core discipline (include in every agent prompt for this domain)

```
- A tenant or owner field on a record is not isolation. Find the query, key, path, policy, or row-level control that enforces it for each read and write path.
- Trace derived copies. Sanitized primary data can become unsafe in search, cache, analytics, export, previews, logs, replicas, and backups with different ACL and retention rules.
- Deletion and revocation are lifecycle contracts. Check current, historical, cached, indexed, exported, restored, and queued copies within the product's stated boundary.
- Privacy or retention preference is not automatically a security vulnerability. Require an explicit data-access boundary or deletion/revocation guarantee and an unauthorized reader or later operation.
- Use `confirmed` for complete source-visible lineage and bounded dummy-tenant tests. Use `needs_validation` when external storage policy, retention, CDN behavior, replica lag, or backup access is unavailable.
```



## Tenant and object-isolation attack classes (subagent_type: `general`)

**Missing tenant or owner enforcement**
A read, update, delete, list, count, or bulk query identifies an object without binding it to the authenticated tenant/owner, or trusts body fields to supply that identity. Compare direct lookup, nested relationship, background, admin, import, and legacy paths.

**Composite-key and namespace collision**
Cache keys, object paths, database uniqueness, search document IDs, temporary files, or deduplication keys omit tenant or environment. Two principals can overwrite or retrieve the same logical key even though application records carry separate owners.

**Policy and query disagreement**
Row-level policy, ORM default scopes, authorization filters, and raw/bypass clients apply different predicates. Check joins, aggregates, aliases, views, transactions, `unscoped` or service clients, and error paths where context is missing.

**Blob and signed-reference overreach**
Object keys, attachment IDs, version IDs, shared links, or signed URLs permit operations or namespaces beyond the issuing principal's access, or remain valid after the underlying ACL changes. Bind operation, exact object/version, audience, expiry, and tenant.



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


## Core discipline (include in every agent prompt for this domain)

```
- Require an input-to-cost path, a missing effective bound, and impact on another user, shared service, safety function, or operator-owned spend. Self-limiting work in the requester's own process is not a service vulnerability.
- A missing rate limit is not enough. Check body/message/file caps, concurrency, queues, deadlines, database constraints, upstream gateways, and per-tenant quotas before calling a path unbounded.
- Do not run stress, saturation, or production tests. Use asymptotic analysis, small boundary fixtures, mocked paid calls, strict local resource limits, and deterministic cancellation tests.
- State attacker cost, service work, persistence, scope, and recovery. One bounded input with superlinear or persistent shared effect is materially different from sustained volume.
- Use `confirmed` for source-visible bounds failures demonstrated safely. Use `needs_validation` when upstream caps, deployed topology, autoscaling, paid quota, or recovery behavior is outside the repository.
```



## Quota and scheduling attack classes (subagent_type: `general`)

**Pre-authentication work imbalance**
Expensive parsing, key lookup, cryptography, decompression, or external requests happen before authentication and the earliest size/rate gate. Compare minimal requester effort to shared service cost and check upstream limits.

**Quota-accounting scope and reset gaps**
Accounting uses attacker-influenceable IP, route, tenant, key prefix, task ID, or other dimension, allowing one principal's work to escape its intended budget or consume another principal's allocation. Review integer overflow, distributed races, retries, reconnects, and account switching.

**Worker, pool, and priority starvation**
Low-priority or attacker-controlled jobs hold shared locks, workers, database pools, event-loop turns, or scheduler priority needed by unrelated users. Require a path that bypasses queue/concurrency fairness or retains a slot beyond its deadline.



## Resource accumulation attack classes (subagent_type: `general`)

**Unbounded buffering and cardinality**
Bodies, out-of-order streams, uploads, sessions, unique cache keys, metrics labels, log fields, subscriptions, or pending jobs accumulate without per-item and aggregate limits. Find cleanup and expiration on disconnect, timeout, cancellation, and partial parse.

**File descriptor, handle, and temporary-resource leaks**
Malformed or canceled work misses cleanup and retains sockets, files, database cursors, timers, subprocesses, temporary files, or object references. Confirm the leak repeats through bounded local iterations and affects a shared pool.

**Detached work after cancellation**
Client timeout, disconnect, canceled job, or failed authorization returns control but leaves database, model, network, or worker work running. Trace cancellation and deadline propagation through every layer.



## Failure and recovery attack classes (subagent_type: `general`)

**Reachable fatal error or deadlock**
An untrusted input reaches `panic`, abort, fatal assertion, unhandled exception, process exit, lock cycle, or infinite loop in a shared process. Confirm supervisor scope and whether one worker or the whole service becomes unavailable. A restarted isolated worker may reduce impact but does not erase the defect.

**Retry storm and fail-open amplification**
Timeouts, dependency errors, partially processed messages, or health-check failures trigger synchronized or unbounded retries without jitter, ceilings, circuit breaking, or deduplication. Verify one bounded failure source can create persistent aggregate work.

**Poison-record and head-of-line blocking**
One malformed record or message repeatedly fails at the front of a shared queue, partition, startup scan, migration, or recovery loop. Review skip/quarantine policy, offsets, and whether other tenants share the blocked unit.

**Unsafe recovery and capacity rollback**
A restart, restore, fallback, or cleanup path rebuilds unbounded state, ignores current quotas, or restores the input that immediately repeats failure. Recovery correctness is part of availability.



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


## Deletion, revocation, and lifecycle attack classes (subagent_type: `general`)

**Soft-delete and tombstone bypass**
Direct lookup, search, relation traversal, object link, background processor, or restore ignores the lifecycle predicate and returns or acts on a deleted/revoked record. Check whether soft-deleted identifiers can be re-registered before all references are gone.

**Stale authorization and derived copy use**
Membership removal, ACL update, consent withdrawal, secret revocation, or role downgrade does not invalidate sessions, caches, subscriptions, jobs, or materialized data that continue to authorize future operations.

**Retention and queued-work overrun**
Deletion completes in primary storage while queued processors, retries, exports, analytics, or generated artifacts recreate or retain the data beyond the promised boundary. Find idempotent deletion and tombstone propagation.

**Restore reintroduces invalid state**
Backup, undo, undelete, or replica recovery restores data, credentials, memberships, or permissions that current policy no longer allows. Re-authorize restored state and reapply lifecycle changes made after the snapshot.



Excluded blocks with source reasons: [{"block": "WEB-PROTOCOL-AND-AUTH.md#HTTP framing and cache attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "WEB-PROTOCOL-AND-AUTH.md#API-key and mTLS attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "ATTACK-CLASSES.md#Injection", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Resource and file handling", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Cryptography and secrets", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Business logic", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Feature abuse and data leakage", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Wildcard", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Obvious things", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Deletion, revocation, and lifecycle attack classes", "reason": "Different boundary or lifecycle; not part of this changed-path assignment"}, {"block": "ATTACK-CLASSES.md#Injection", "reason": "The source-visible provider base URL is operator configuration, route paths are fixed and query parameters use urlencode; this unit concerns shared resource admission and failure handling, not an established attacker-controlled destination or executable sink."}, {"block": "ATTACK-CLASSES.md#Access control", "reason": "Both routes visibly require get_current_user; existing field ownership review remains separate from cross-request worker/cache/provider resource isolation."}, {"block": "ATTACK-CLASSES.md#Access control", "reason": "Field-owner authorization is already checked in the agricultural-data unit; this unit reviews anonymous and authenticated provider-work accounting rather than repeating ownership queries."}, {"block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes", "reason": "The selected boundary is outbound work admission, retry and fallback; persistent telemetry accumulation already has a separate unit."}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Derived-data and disclosure attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "DATA-ISOLATION-AND-LIFECYCLE.md#Export, backup, restore, and migration attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "ATTACK-CLASSES.md#Injection", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Resource and file handling", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Cryptography and secrets", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Business logic", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Feature abuse and data leakage", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Wildcard", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Obvious things", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Computational amplification attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Resource accumulation attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Failure and recovery attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "ATTACK-CLASSES.md#Injection", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Access control", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Resource and file handling", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Cryptography and secrets", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Feature abuse and data leakage", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Wildcard", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Obvious things", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "WEB-PROTOCOL-AND-AUTH.md#HTTP framing and cache attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "WEB-PROTOCOL-AND-AUTH.md#Browser-session attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "WEB-PROTOCOL-AND-AUTH.md#Federated-identity attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "WEB-PROTOCOL-AND-AUTH.md#MFA, passkey, and account-transition attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "WEB-PROTOCOL-AND-AUTH.md#API-key and mTLS attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Computational amplification attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Quota and scheduling attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Failure and recovery attack classes", "reason": "Different boundary/class; assigned in another unit or no selected source interface supports it"}, {"block": "ATTACK-CLASSES.md#Injection", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Access control", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Resource and file handling", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Cryptography and secrets", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Business logic", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Chained vulnerabilities and trust boundaries", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Wildcard", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}, {"block": "ATTACK-CLASSES.md#Obvious things", "reason": "Different ordinary class; reviewed by its assigned unit or no corresponding entry-to-sink interface selected here"}]

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


No carried confirmed exclusions. Existing prior candidates are only leads: independently recheck current controls, do not silently carry or confirm them. Peer IDs: [".github%2Fworkflows%2Fgarden_tasks.yml%23scheduled-post::backend%2Fapi%2Fv1%2Ftasks.py%23generate_tasks::repository%2Fcron::ATTACK-CLASSES.md%23Business%20logic", ".github%2Fworkflows%2Fgenerate-costs-csv.yml%23issues::scripts%2Fgenerate_costs_csv.py%23write_csv-write_xlsx::repository%2Freport-automation::ATTACK-CLASSES.md%23Injection", "agritwin-app%2Fsrc%2Fapp%2Fauth%2Foauth-callback.tsx%23links::agritwin-app%2Fsrc%2Fcomponents%2Ffield-location%2FMapCanvas.tsx%23bridge::agritwin-app%2Frendering::ATTACK-CLASSES.md%23Injection", "agritwin-app%2Fsrc%2Fapp%2Fedit-field.tsx%23cached-forms::agritwin-app%2Fsrc%2Fservices%2FqueryKeys.ts%23field-and-page::agritwin-app%2Fforms::ATTACK-CLASSES.md%23Access%20control", "agritwin-app%2Fsrc%2Fcomponents%2FFieldFormSteps.tsx%23sections::agritwin-app%2Fsrc%2Futils%2FfieldFormValidation.ts%23fieldFormErrors::agritwin-app%2Fforms::ATTACK-CLASSES.md%23Injection", "agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23session::agritwin-app%2Fsrc%2Fservices%2Fauth.ts%23clearAuth::agritwin-app%2Fsession::ATTACK-CLASSES.md%23Access%20control", "backend%2Fservices%2Fmqtt_subscriber.py%23on_message::backend%2Fservices%2Fmqtt_subscriber.py%23start_mqtt::iot%2Fmessages::ATTACK-CLASSES.md%23Access%20control", "backend%2Fservices%2Fmqtt_subscriber.py%23telemetry::backend%2Fdb%2Fdatabase.py%23save_telemetry::iot%2Ftelemetry::ATTACK-CLASSES.md%23Resource%20and%20file%20handling", "cloud-and-ci%23release::backend%2FDockerfile%23runtime::release::ATTACK-CLASSES.md%23Access%20control", "git%23history-and-lockfiles::git%23tracked-source::repository::ATTACK-CLASSES.md%23Cryptography%20and%20secrets", "iot%2Ffirmware%2Fagritwin_esp32%2Fprovisioning.cpp%23BLE::iot%2Ffirmware%2Fagritwin_esp32%2Fprovisioning.cpp%23provisioningBegin::iot%2Fprovisioning::ATTACK-CLASSES.md%23Cryptography%20and%20secrets"]

Target /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/AGRITWIN. Agent ID hunt_backend. Only writable area /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/security-reviews/run-2026-11-20-security-audit/agents/hunt_backend/scratch. Parent-owned artifacts /Users/marccompanysgasulla/Documents/ChatGPT/PROJECTE IT ICT/security-reviews/run-2026-11-20-security-audit/agents/hunt_backend/artifacts; promotion allowlist empty, zero bytes. No target execution or network. No shared/target edits. Do not delegate. Save exact JSON response to your scratch/result.json; return same JSON. All source checks artifact:null. Prioritize concise source traces and real security boundaries; no artificial cap on candidates. Read changed source relevant to assigned units since 4e8be50. Existing 401 retry handling changed significantly; recheck old hypotheses.

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
