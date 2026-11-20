# API documentation assets

Swagger UI 5.35.1 and ReDoc 2.5.3 are hosted under `backend/services/docs_static/`. Both Dockerfiles already copy `services/`, so the assets ship with the backend without an external CDN dependency.

[Asset provenance](docs-assets-provenance.json) records official npm archive URLs, SHA-512 integrity, archive SHA-256 hashes and each retained file's SHA-256. Every retained file was compared byte-for-byte against the official archive. Upstream license and notice files are included with each bundle. No third-party JavaScript was edited.

The HTML routes attach SHA-384 subresource integrity attributes to scripts and stylesheets. Documentation pages also receive a fresh CSP nonce, `frame-ancestors 'none'` and `X-Frame-Options: DENY`. ReDoc uses local fonts and its supported nonce option. `X-Content-Type-Options: nosniff` applies throughout the actual backend.

Only the compiled third-party asset directory is added to Sonar's dependency exclusions. The new Python implementation remains in source analysis, and its regression tests remain in the backend test suite.

When updating these libraries, obtain the official archives, verify registry integrity, preserve licenses, update asset paths and hashes in `services/security_docs.py`, update provenance, run `tests/unit/test_security_docs.py` and check both documentation pages in a browser.
