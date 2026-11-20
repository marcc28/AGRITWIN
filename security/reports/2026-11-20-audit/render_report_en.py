"""Render the retained audit evidence in English without changing audit verdicts."""
import collections
import hashlib
import html
import json
import subprocess
from pathlib import Path
from urllib.parse import quote

OUT = Path(__file__).resolve().parent
TARGET = Path(json.loads((OUT / "run-metadata.json").read_text())["target"])
CI = OUT / "ci/security-report-44761212902-1"
METHOD = "https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/skills/security-audit/SKILL.md"
ORDER = {"critical": 0, "high": 1, "medium": 2, "moderate": 2, "low": 3, "informational": 4, "unrated": 5}


def read(name):
    return json.loads((OUT / name).read_text())


def esc(value):
    return html.escape(str(value), quote=True)


def badge(label, style):
    return f'<span class="badge {esc(style)}">{esc(label)}</span>'


def sev(label, count=None):
    text = label.title() if count is None else f"{label.title()} · {count}"
    return badge(text, label)


def link(label, href):
    return f'<a href="{esc(href)}">{esc(label)}</a>'


def source_link(file, line, ref):
    return link(f"{file}:{line}", f"https://github.com/marcc28/AGRITWIN/blob/{ref}/{quote(file, safe='/')}#L{line}")


def entry_attrs(tool, severity):
    normalized = "medium" if severity == "moderate" else severity
    return f'data-entry data-tool="{esc(tool)}" data-severity="{esc(normalized)}"'


def md_cell(value):
    return str(value).replace("|", "/").replace("\n", " ")


def main():
    meta = read("run-metadata.json")
    dependency = read("dependency-audit.json")
    sonar = read("sonar-ci-evidence.json")
    secret = read("secret-scan.json")
    ledger = read("coverage-ledger.json")
    candidates = read("candidates.json")
    findings = read("findings.json")
    external = json.loads((CI / "external-analyses.json").read_text())
    source_ref = meta["source_ref"]
    counts = collections.Counter(u["status"] for u in ledger)
    assert meta["run_status"] == "incomplete" and not findings
    assert len(candidates) == 15 and len(ledger) == 22

    # Deduplicate scanner records by their retained identity; preserve the highest
    # recorded severity and all scan-source labels if duplicate rows differ.
    zap = {}
    raw_count = 0
    for name in ["zap-baseline.json", "zap-api.json"]:
        content = json.loads((CI / name).read_text())
        for original in content["findings"]:
            raw_count += 1
            item = dict(original)
            if item["id"] in zap:
                prior = zap[item["id"]]
                item["sources"] = sorted(set(prior["sources"] + item["sources"]))
                if ORDER[prior["severity"]] < ORDER[item["severity"]]:
                    item["severity"] = prior["severity"]
            zap[item["id"]] = item
    zap_counts = collections.Counter(r["severity"] for r in zap.values())
    assert raw_count == 33 and len(zap) == 32
    assert zap_counts == {"medium": 3, "low": 16, "informational": 13}
    rules = {}
    for item in zap.values():
        group = rules.setdefault((item["rule_id"], item["title"], item["severity"]), {"title": item["title"], "alerts": [], "urls": set()})
        group["alerts"].append(item)
        group["urls"].add(item["url"])

    npm = dependency["frontend"]["vulnerabilities"]
    npm_counts = collections.Counter(v["severity"] for v in npm.values())
    assert npm_counts == {"high": 5, "moderate": 22}
    lock_path = TARGET / "agritwin-app/package-lock.json"
    lock_versions = {}
    if hashlib.sha256(lock_path.read_bytes()).hexdigest() == dependency["lockfile_sha256"]["agritwin-app/package-lock.json"]:
        lock_versions = json.loads(lock_path.read_text())["packages"]
    else:
        # A later remediation must not replace baseline versions with live ones.
        baseline_lock = subprocess.check_output(
            ["git", "show", f"{source_ref}:agritwin-app/package-lock.json"],
            cwd=TARGET,
        )
        assert hashlib.sha256(baseline_lock).hexdigest() == dependency["lockfile_sha256"]["agritwin-app/package-lock.json"]
        lock_versions = json.loads(baseline_lock)["packages"]

    tools = [
        dict(name="TruffleHog", version="3.99.9", status="Executed locally", style="executed", kind="Fresh static scan", result="2 URI detector hits; both are intentional credential-rejection fixtures. No new leaked credential identified.", severity="No credential severity assigned", badge="no-findings", scope="All history reachable from local dev; 7,378 chunks / 9,967,788 bytes.", limit="Credential verification and update checks disabled; archives and additional refs skipped. Official 3.100.0 was observed but was not used.", evidence="secret-scan.json", official="https://github.com/trufflesecurity/trufflehog"),
        dict(name="npm audit", version="Lockfile advisory query", status="Executed this review", style="executed", kind="Fresh metadata query", result="27 affected package entries, including direct, transitive and development dependencies.", severity="5 high · 22 moderate", badge="high", scope="Copied frontend lockfile; package-lock-only and ignore-scripts; no install or automatic fixes.", limit="Entries include dependency-chain effects. They are not 27 distinct advisories or proven application exploits.", evidence="dependency-audit.json", official="https://docs.npmjs.com/cli/commands/npm-audit"),
        dict(name="OSV", version="Python batch API", status="Queried this review", style="queried", kind="Fresh metadata query", result="5 Python package/version matches from 99 queried locked versions.", severity="Unrated · 5 packages", badge="unrated", scope="authlib, certifi, dnspython, joserfc and opentelemetry-api.", limit="Retained batch results contain advisory IDs, not severity ratings. GHSA and PYSEC IDs may be aliases; reachability was not tested.", evidence="dependency-audit.json", official="https://google.github.io/osv.dev/api/"),
        dict(name="OWASP ZAP", version="2.17.0", status="Existing CI reviewed", style="ci", kind="Existing deployment scan", result="32 unique alerts: baseline 15 + passive API 18 = 33 raw records, with 1 duplicate removed.", severity="3 medium · 16 low · 13 informational", badge="medium", scope="Anonymous passive GET checks against the Render deployment; CI run 44761212902.", limit="No new ZAP run. Deployment SHA unverified; no authenticated ownership, mutation or MQTT checks.", evidence="zap-ci-evidence.json", official="https://github.com/marcc28/AGRITWIN/actions/runs/44761212902"),
        dict(name="SonarQube / SonarCloud", version="Public API + existing CI", status="Results queried", style="ci", kind="Existing source analysis", result="Quality gate OK; 0 reported vulnerabilities; 0 security hotspots; 92.0% overall coverage.", severity="No issues reported", badge="no-findings", scope="dev analysis 1963366, 20 Nov 2026 at 16:17 Europe/Madrid. Only reports/costes.xlsx differs from reviewed HEAD.", limit="Scanner success is not a security certification. Configured exclusions and LCOV / SQL parsing warnings limit coverage.", evidence="sonar-ci-evidence.json", official="https://sonarcloud.io/dashboard?id=marcc28_AGRITWIN&branch=dev"),
        dict(name="CodeQL", version="2.27.4 in retained CI", status="Existing CI reviewed", style="ci", kind="Earlier scheduled analysis", result="0 open branch alerts in the retained report; Python and JavaScript/TypeScript analyses available.", severity="No open alerts reported", badge="no-findings", scope="Weekly analysis on 18 Nov 2026, commit 684d883.", limit="An earlier revision; it does not validate all changes in 5410a38. No new analysis was triggered.", evidence="ci/security-report-44761212902-1/external-analyses.json", official="https://github.com/marcc28/AGRITWIN/security/code-scanning"),
        dict(name="Cloudflare security-audit skill", version="c1c8a8c · methodology", status="Partially applied", style="partial", kind="Agent-assisted source review", result="4 reconnaissance agents and backend, client and IoT source reviews; 15 preliminary candidates across the ledger.", severity="Unrated · 15 candidates", badge="unrated", scope="22 coverage units: 6 covered, 10 candidate, 5 blocked and 1 deferred. Source reviewed at 5410a38.", limit="Coverage critics and independent candidate / final-record verification were not run. This is an incomplete application of the workflow, not a completed Cloudflare audit.", evidence="coverage-ledger.json", official=METHOD),
        dict(name="BLA", version="3.5.2 documentation observed", status="Not executed", style="not-run", kind="Documentation only", result="CLI purpose, read-only lint / inspect-release commands and runtime requirements evaluated. No scan results exist.", severity="Not assessed", badge="not-run", scope="Release packaging / source-map inspection capabilities reviewed.", limit="Requires Node ^22.23.4 or >=24.0.0; available runtime was 22.17.0. No setup, install, harden, protect or apply operation ran.", evidence="tool-evaluation.md", official="https://github.com/qybaihe/bla"),
        dict(name="Backend / frontend test CI", version="pytest + Jest", status="Existing CI reviewed", style="ci", kind="Existing regression suites", result="947 backend tests and 1,169 frontend tests passed; 130 frontend suites passed.", severity="Not a severity assessment", badge="not-run", scope="CI run 44761212933 on 1963366; identical application source to the reviewed HEAD.", limit="No local test rerun and no reproduction of the 15 code candidates. A passing test suite is not an absence-of-vulnerabilities claim.", evidence="sonar-ci-evidence.json", official="https://github.com/marcc28/AGRITWIN/actions/runs/44761212933"),
    ]

    severity_policy = [
        "Severity labels are retained from the originating scanner; no overall application risk score is invented.",
        "npm high/moderate counts refer to affected package entries. ZAP medium/low/informational counts refer to deduplicated alerts. Do not add these counts together.",
        "Unrated means a severity was not captured or cannot yet be assigned. It does not mean low severity.",
        "All 15 source candidates remain preliminary and unvalidated. They receive no vulnerability severity and are not final needs_validation records.",
        "Not executed / not assessed is not a clean result. Sonar's zero reported issues is limited to its analyzed revision and configuration.",
    ]

    rule_actions = {
        "10038": "Review a page-specific CSP, including frame-ancestors and permitted script/style sources.",
        "10020": "Review frame-ancestors or X-Frame-Options on HTML responses intended to resist framing.",
        "90003": "Review integrity attributes or self-host externally loaded static resources where practical.",
        "10017": "Review each external script's origin and integrity; the inclusion alone does not establish an exploit.",
        "90004": "Set an explicit resource-sharing policy where applicable to the response and client architecture.",
        "10063": "Review and restrict browser feature permissions required by the affected HTML page.",
        "10021": "Return X-Content-Type-Options: nosniff with correct content types on applicable responses.",
        "10109": "Informational application detection; review scan coverage rather than treating this as a defect.",
        "10049": "Non-storable responses can be intentional for sensitive data; review the intended cache policy.",
        "100000": "Review the client-error response in context; an expected 401 is not itself a vulnerability.",
    }

    tool_rows = []
    for t in tools:
        tool_rows.append(f'''<tr><td><span class="tool-name">{link(t['name'], t['official'])}</span><span class="tool-version">{esc(t['version'])}</span><small>{esc(t['kind'])}</small></td><td>{badge(t['status'],t['style'])}</td><td>{esc(t['result'])}</td><td>{badge(t['severity'],t['badge'])}</td><td><p>{esc(t['scope'])}</p><small>{esc(t['limit'])}</small><small>{link('Retained evidence ↗',t['evidence'])}</small></td></tr>''')

    zap_rows = []
    zap_md = []
    rule_data = []
    for (rule_id, title, severity), group in sorted(rules.items(), key=lambda x:(ORDER[x[0][2]],x[0][0],x[0][1])):
        urls = sorted(group["urls"])
        action = rule_actions[rule_id]
        if rule_id == "90004" and "Embedder" in title:
            action = "Review cross-origin isolation requirements and embedded-resource compatibility before setting COEP."
        elif rule_id == "90004" and "Opener" in title:
            action = "Review browsing-context isolation and OAuth / popup compatibility before setting COOP."
        rule_data.append(dict(rule_id=rule_id,title=group['title'],severity=severity,unique_alerts=len(group['alerts']),urls=urls))
        endpoint_html = "<br>".join(f'<code>{esc(url.replace("https://backend-web-ur8z.onrender.com", ""))}</code>' for url in urls)
        zap_rows.append(f'''<tr {entry_attrs('zap',severity)}><td>{sev(severity)}</td><td><strong>{esc(group['title'])}</strong><small>Rule {esc(rule_id)}</small></td><td><strong>{len(group['alerts'])}</strong></td><td>{endpoint_html}</td><td>{esc(action)}</td></tr>''')
        zap_md.append(f"| {severity.title()} | {rule_id} | {md_cell(group['title'])} | {len(group['alerts'])} | {', '.join(url.replace('https://backend-web-ur8z.onrender.com','') or '/' for url in urls)} |")

    npm_rows = []
    npm_md = []
    package_data = []
    for name, item in sorted(npm.items(),key=lambda pair:(ORDER[pair[1]['severity']],pair[0])):
        versions = sorted({lock_versions[node]["version"] for node in item["nodes"] if node in lock_versions and "version" in lock_versions[node]})
        relation = "Direct" if item["isDirect"] else "Transitive"
        via = []
        for v in item["via"]:
            via.append(link(v['title'],v['url']) if isinstance(v,dict) else f'<code>{esc(v)}</code>')
        version_text = ", ".join(versions) or "See retained affected range"
        package_data.append(dict(name=name,severity=item['severity'],relation=relation,locked_versions=versions,via=item['via']))
        npm_rows.append(f'''<tr {entry_attrs('npm',item['severity'])}><td>{sev(item['severity'])}</td><td class="package-name">{esc(name)}</td><td><code>{esc(version_text)}</code><small>{esc(relation)}</small></td><td>{'<br>'.join(via)}</td></tr>''')
        npm_md.append(f"| {item['severity'].title()} | `{name}` | {version_text} | {relation} |")

    osv_rows = []
    osv_md = []
    for item in dependency['python']['affected']:
        ids = [a['id'] for a in item['advisories']]
        links = " ".join(link(id,f"https://osv.dev/vulnerability/{quote(id)}") for id in ids)
        osv_rows.append(f'''<tr {entry_attrs('osv','unrated')}><td>{sev('unrated')}</td><td class="package-name">{esc(item['name'])}</td><td><code>{esc(item['version'])}</code></td><td class="ids">{links}</td></tr>''')
        osv_md.append(f"| Unrated | `{item['name']}` | {item['version']} | {', '.join(ids)} |")

    cards = []
    candidate_md = []
    detail_md = ["# Preliminary code candidates\n\nStatus: initial source review only. Independent validation and final-record verification were not performed. All entries are **Unrated** and may be false positives. They are not confirmed vulnerabilities or final needs_validation records.\n"]
    candidate_data = []
    for index, c in enumerate(candidates,1):
        cid=f"C{index:02d}"
        fp=c['fingerprint']
        domain = "IoT / provisioning" if 'bleProvisioning' in fp else "Client / session" if fp.startswith('agritwin-app') else "IoT / telemetry" if 'mqtt_subscriber' in fp or 'device_status_monitor' in fp else "CI / report generation" if fp.startswith('scripts/') else "Backend / API"
        first=c['trace'][0]
        trace="".join(f'<li>{source_link(s["file"],s["line"],source_ref)}<br><strong>{esc(s["scope"])}</strong> — {esc(s["description"])}</li>' for s in c['trace'])
        cited="".join(f'<li>{source_link(e["file"],e["line"],source_ref)} — {esc(e["description"])}</li>' for e in c['evidence'])
        blockers="".join(f'<li>{esc(b)}</li>' for b in c['blockers'])
        plans="".join(f'<h4>{"Bounded local validation plan" if k=="local" else "Owner-observed deployment check"}</h4><p>{esc(v)}</p>' for k,v in c['validation_plan'].items())
        cards.append(f'''<details class="candidate" id="{cid}" {entry_attrs('code','unrated')}><summary><span class="candidate-id">{cid}</span><div><h3>{esc(c['title'])}</h3><div class="summary-meta">{esc(domain)} · {esc(first['file'])}:{first['line']}</div>{sev('unrated')}{badge('Independent validation pending','pending')}</div><span class="chevron" aria-hidden="true">+</span></summary><div class="candidate-body"><p>{esc(c['description'])}</p><h4>Proposed root cause</h4><p>{esc(c['claimed_root_cause'])}</p><h4>Source trace</h4><ol>{trace}</ol><h4>Evidence cited by the initial reviewer</h4><ul>{cited}</ul><h4>Unresolved facts</h4><ul>{blockers}</ul>{plans}<h4>Record identity</h4><code>{esc(fp)}</code></div></details>''')
        candidate_md.append(f"| {cid} | Unrated | {md_cell(c['title'])} | `{first['file']}:{first['line']}` | Pending independent validation |")
        candidate_data.append(dict(id=cid,fingerprint=fp,title=c['title'],domain=domain,severity_assessment='not_assessed',validation_status='preliminary_unvalidated'))
        detail_md.append(f"\n## {cid} — {c['title']}\n\n**Severity: Unrated. Status: preliminary; independent validation pending.**\n\nFingerprint: `{fp}`\n\n{c['description']}\n\nProposed root cause: {c['claimed_root_cause']}\n\n### Source trace\n\n")
        detail_md += [f"- `{s['file']}:{s['line']}` — {s['scope']}: {s['description']}\n" for s in c['trace']]
        detail_md.append("\n### Evidence cited by the initial reviewer\n\n")
        detail_md += [f"- `{e['file']}:{e['line']}` — {e['description']}\n" for e in c['evidence']]
        detail_md.append("\n### Unresolved facts\n\n")
        detail_md += [f"- {b}\n" for b in c['blockers']]
        for key, plan in c['validation_plan'].items():
            detail_md.append(f"\n### {'Bounded local validation plan' if key=='local' else 'Owner-observed deployment check'}\n\n{plan}\n")

    def bars(items,total):
        colors={'high':'#b92b3f','moderate':'#c68b28','medium':'#c68b28','low':'#397ab0','informational':'#8b9dac'}
        return ''.join(f'<div class="bar-row"><span>{sev(s)}</span><div class="bar-track"><div class="bar-fill" style="width:{n/total*100:.2f}%;background:{colors[s]}"></div></div><strong>{n}</strong></div>' for s,n in items)

    evidence_links=[('Audit metadata','run-metadata.json'),('TruffleHog output summary','secret-scan.json'),('npm / OSV response','dependency-audit.json'),('ZAP scan provenance','zap-ci-evidence.json'),('Current Sonar evidence','sonar-ci-evidence.json'),('Coverage ledger','coverage-ledger.json'),('Preliminary candidates','candidates.json'),('Final findings (empty)','findings.json'),('English detailed notes','NEEDS-VALIDATION.md'),('English tool notes','tool-evaluation.md'),('English architecture','architecture.md'),('English Markdown report','REPORT.md')]
    coverage_html=''.join(f'<span><b>{counts[state]}</b>{label}</span>' for state,label in [('covered','covered'),('candidate','candidate'),('blocked','blocked'),('deferred','deferred')])
    html_page=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="AGRITWIN security review: tools, retained results, scanner severities, evidence provenance and validation gaps."><title>AGRITWIN | Security audit · 20 Nov 2026</title><style>{(OUT/'report.css').read_text()}</style></head>
<body><header class="masthead"><div class="shell"><p class="eyebrow">AGRITWIN / SECURITY REVIEW / 20 NOV 2026</p><h1>Security audit<br>Tools, results &amp; severity</h1><p class="lead">A clear view of the evidence collected, the ratings each scanner reported, and the code candidates that still need validation.</p><div class="header-meta"><span><strong>Branch</strong> <code>{esc(meta['branch'])}</code></span><span><strong>Reviewed source</strong> <code>5410a38</code></span><span><strong>dev sync at audit</strong> 0 ahead / 0 behind</span><span><strong>Evidence snapshot</strong> 20 Nov 2026 · Europe/Madrid</span></div></div></header>
<div class="nav-wrap"><nav class="shell" aria-label="Report sections"><a href="#overview">Overview</a><a href="#tools">Tools used</a><a href="#ratings">Severity</a><a href="#zap">ZAP</a><a href="#dependencies">Dependencies</a><a href="#candidates">Code candidates</a><a href="#evidence">Evidence &amp; limits</a><button class="print" id="print-report" type="button">Print / Save PDF</button></nav></div>
<main class="shell"><section id="overview"><div class="status-banner" role="note"><span class="status-mark" aria-hidden="true">!</span><div><strong>Report finalized · independent validation incomplete</strong><p>15 source candidates remain preliminary. Coverage critics and independent candidate verification were not completed. No application vulnerability has been confirmed by this review; this does not establish that the application is secure.</p></div></div>
<div class="stats"><div class="stat" style="--accent:#b92b3f"><span class="stat-num">5</span><div class="stat-label">High package entries</div><small>npm audit · plus 22 moderate</small></div><div class="stat" style="--accent:#c68b28"><span class="stat-num">3</span><div class="stat-label">Medium deployment alerts</div><small>ZAP · plus 16 low and 13 informational</small></div><div class="stat" style="--accent:#6941a5"><span class="stat-num">15</span><div class="stat-label">Unrated code candidates</div><small>Initial source review · verification pending</small></div><div class="stat" style="--accent:#397ab0"><span class="stat-num">2,116</span><div class="stat-label">Tests passed in existing CI</div><small>947 backend + 1,169 frontend</small></div></div></section>
<section class="section" id="tools"><div class="section-head"><h2>01 / Tools used and actual results</h2><p>Execution status is explicit for every tool.</p></div><div class="panel"><div class="table-wrap"><table class="tool-table"><thead><tr><th>Tool / version</th><th>Actual use</th><th>Result obtained</th><th>Reported severity</th><th>Scope, limitations &amp; evidence</th></tr></thead><tbody>{''.join(tool_rows)}</tbody></table></div><div class="legend"><p><strong>Executed / queried:</strong> a new local static scan or metadata request was performed during this review.</p><p><strong>Existing CI:</strong> retained results were inspected; no new deployment scan or CI run is claimed.</p><p><strong>Not executed:</strong> documentation was assessed; the tool produced no scan result.</p></div></div></section>
<section class="section" id="ratings"><div class="section-head"><h2>02 / Severity, without mixing the evidence</h2><p>Package entries and deployment alerts are different units.</p></div><div class="two-col"><div class="panel panel-body"><h3>npm audit · 27 package entries</h3><div class="distribution">{bars([('high',5),('moderate',22)],27)}</div><p class="note">0 critical entries reported by npm. High ratings include indirect dependency-chain effects; no exploitation has been reproduced.</p></div><div class="panel panel-body"><h3>OWASP ZAP · 32 unique alerts</h3><div class="distribution">{bars([('medium',3),('low',16),('informational',13)],32)}</div><p class="note">0 critical or high alerts in this passive scan. 33 raw records were deduplicated to 32 alert identities.</p></div></div><div class="panel panel-body" style="margin-top:18px"><h3>How to read a rating</h3><div class="fact-grid"><div><strong>{sev('high')} {sev('medium')} {badge('Moderate','moderate')}</strong><p>These are the originating scanner's labels. npm uses “moderate”; ZAP uses “medium”. Ratings are not silently converted to application verdicts.</p></div><div><strong>{sev('unrated')}</strong><p>15 code candidates and 5 Python package matches have no assigned rating in the retained evidence. Unrated does not mean low risk.</p></div><div><strong>{badge('Not executed','not-run')} {badge('No reported issues','no-findings')}</strong><p>Not executed means no result exists. No reported issues means the specific tool reported none within its revision, configuration and coverage.</p></div></div></div></section>
<div class="filter-bar" role="search" aria-label="Filter report entries"><label for="report-search">SEARCH EVIDENCE<input id="report-search" type="search" placeholder="Package, rule, file or candidate…"></label><label for="severity-filter">SEVERITY<select id="severity-filter"><option value="all">All severity ratings</option><option value="high">High</option><option value="medium">Medium / Moderate</option><option value="low">Low</option><option value="informational">Informational</option><option value="unrated">Unrated</option></select></label><label for="tool-filter">SOURCE<select id="tool-filter"><option value="all">All evidence sources</option><option value="zap">OWASP ZAP</option><option value="npm">npm audit</option><option value="osv">OSV</option><option value="code">Agent source review</option></select></label><button type="button" id="reset-filters">Reset filters</button><p class="filter-note" id="filter-message" aria-live="polite">Filter scanner rows and code candidates. Tool totals remain unchanged.</p></div>
<section class="section" id="zap" data-result-group><div class="section-head"><h2>03 / ZAP alerts by rule and type</h2><p>{len(rules)} alert-type groups · 32 unique alert identities</p></div><p class="section-intro">Anonymous passive checks of the Render deployment. The deployed revision is unverified; the report does not establish authenticated authorization or mutation behavior.</p><div class="panel"><div class="table-wrap"><table class="results-table"><thead><tr><th>Severity</th><th>Rule / alert</th><th>Alerts</th><th>Affected response paths</th><th>Review action</th></tr></thead><tbody>{''.join(zap_rows)}</tbody></table></div><p class="empty-message">No ZAP rule groups match the active filters.</p></div><p class="note">{link('Baseline evidence','ci/security-report-44761212902-1/zap-baseline.json')} · {link('Passive API evidence','ci/security-report-44761212902-1/zap-api.json')} · Informational detections and expected 401 responses are not automatically vulnerabilities.</p></section>
<section class="section" id="dependencies"><div class="section-head"><h2>04 / Dependency advisory results</h2><p>No packages installed or lockfiles changed.</p></div><p class="section-intro">A matching package version or an inherited dependency rating does not establish an exploitable application path. Review SDK compatibility before changing versions; avoid unreviewed forced upgrades or downgrades.</p><div data-result-group><div class="panel"><div class="panel-body"><h3>npm audit · affected package entries</h3><p class="note">Locked versions below are shown only after verifying the lockfile hash against the audit snapshot. “Via” distinguishes direct advisories from inherited dependency-chain ratings.</p></div><div class="table-wrap"><table class="package-table"><thead><tr><th>Severity</th><th>Package</th><th>Locked version / relation</th><th>Advisory or upstream dependency (“via”)</th></tr></thead><tbody>{''.join(npm_rows)}</tbody></table></div><p class="empty-message">No npm entries match the active filters.</p></div></div><div data-result-group style="margin-top:20px"><div class="panel"><div class="panel-body"><h3>OSV · Python matches</h3><p class="note">5 package matches from 99 versions. Severity is Unrated because only IDs and modification dates are present in the retained batch response. IDs can be aliases; this is not a count of unique CVEs.</p></div><div class="table-wrap"><table class="results-table"><thead><tr><th>Severity</th><th>Package</th><th>Locked version</th><th>Advisory references</th></tr></thead><tbody>{''.join(osv_rows)}</tbody></table></div><p class="empty-message">No OSV matches match the active filters.</p></div></div></section>
<section class="section" id="candidates" data-result-group><div class="section-head"><h2>05 / Preliminary code candidates</h2><p><button type="button" id="expand-candidates">Expand visible</button> <button type="button" id="collapse-candidates">Collapse all</button></p></div><p class="section-intro">15 initial source-review proposals. Every entry is Unrated and pending independent verification. The original proposed verdict is not a final audit verdict; {link('findings.json','findings.json')} contains no final records.</p><p class="scope-note">Recommended validation order: identity and credential boundaries first; then account/device isolation; then shared-content authority, provider budgets and report handling. This order is a triage suggestion, not a severity assignment.</p><div class="candidate-list">{''.join(cards)}</div><p class="empty-message">No code candidates match the active filters.</p></section>
<section class="section" id="evidence"><div class="section-head"><h2>06 / Coverage, provenance and remaining work</h2><p>Evidence is retained separately from its presentation.</p></div><div class="panel panel-body"><h3>Review coverage</h3><div class="coverage-numbers">{coverage_html}</div><p class="note">“Covered” means the specific recorded source check found no surviving candidate; it is not a runtime assurance. Candidate units can link several proposals. The public-market translation boundary also needs a separate follow-up unit, recorded as deferred. Coverage critics were not run; this is not an exhaustive or independently validated audit.</p><div class="two-col" style="margin-top:24px"><div><h4>Completed evidence collection</h4><ul class="timeline"><li>Fetched origin and checked security branch against dev: 0 ahead / 0 behind at 5410a38.</li><li>Performed new TruffleHog history scanning and npm / OSV advisory queries.</li><li>Reviewed existing ZAP, Sonar, CodeQL and test CI results with revision provenance.</li><li>Collected four reconnaissance reviews and backend, client and IoT source checks. The initially blocked client review was replaced with a defensive source review.</li><li>Official format validators passed for 22 coverage units and the empty final findings array. Format validation does not validate candidates.</li></ul></div><div><h4>Still required for an audit verdict</h4><ul class="timeline"><li>Independent candidate validation and final source-record verification.</li><li>Coverage critics and follow-up on blocked/deferred units.</li><li>Offline fixtures for token-purpose separation, session races, account caches, MQTT and BLE using dummy state.</li><li>Owner confirmation of publication/catalog policies, effective broker ACLs, RLS/IAM, firmware pairing, deployed revision and provider budgets.</li></ul></div></div><p class="scope-note">No target-controlled application code, tests, builds, emulators or real devices ran locally. The selected {link('Cloudflare methodology',METHOD)} states: “If every control cannot be enforced, do not execute target code”. Required filesystem / credential isolation, isolated networking and combined resource quotas were not established. Existing CI execution is external evidence; no new live scan or paid provider call is claimed.</p></div><div class="panel panel-body" style="margin-top:18px"><h3>Retained evidence and English documents</h3><div class="links-list">{''.join(link(label,href) for label,href in evidence_links)}</div><p class="note">Presentation updated in English. Original scanner outputs, agent notes and structured audit evidence are retained unchanged; source identifiers and repository paths keep their original spelling. No new security tests or verdicts were added by this report revision.</p></div></section>
<footer class="footer"><span>AGRITWIN · Security review · 20 Nov 2026 · English edition</span><span>Application source unchanged · Snapshot 5410a38 · Validation incomplete</span></footer></main><script>{(OUT/'report.js').read_text()}</script></body></html>'''
    remediation_exists = (OUT.parents[1] / 'remediation/2026-11-20/REPORT.md').is_file()
    if remediation_exists:
        banner = '<div class="status-banner" role="note"><div><strong>Baseline snapshot before remediation</strong><p><a href="../../remediation/2026-11-20/REPORT.html">View current fixes and regression results</a>. Original scanner counts below are retained as historical evidence.</p></div></div>'
        html_page = html_page.replace('<main class="shell">', '<main class="shell">' + banner, 1)
    (OUT/'REPORT.html').write_text(html_page)

    md=[f"""# AGRITWIN security audit — tools, results and severity

Evidence snapshot: **20 November 2026**, Europe/Madrid. Branch: `{meta['branch']}`. Reviewed commit: `{source_ref}`. The security branch matched origin/dev at the audit fetch: **0 commits ahead, 0 behind**.

**FINALIZED REPORT — INDEPENDENT VALIDATION INCOMPLETE.** There are 15 preliminary code candidates. Coverage critics and independent candidate/final-record verification were not completed. No application vulnerability was confirmed by this review, and findings.json contains no final records. This does not establish that the application is secure. The English presentation adds no new scan, test or vulnerability verdict.

## Tools used, execution status and results

| Tool / version | Actual use | Result | Severity | Scope and limitation |
| --- | --- | --- | --- | --- |
"""]
    for t in tools:
        md.append(f"| [{t['name']}]({t['official']}) — {md_cell(t['version'])} | {t['status']} | {md_cell(t['result'])} | **{t['severity']}** | {md_cell(t['scope'])} {md_cell(t['limit'])} [Evidence]({t['evidence']}) |\n")
    md.append("\n## How to read severity\n\n"+"\n".join('- '+s for s in severity_policy)+"\n")
    md.append("\n## OWASP ZAP — deduplicated deployment alerts\n\n15 baseline + 18 passive API = 33 raw records; 1 duplicate removed, leaving **32 unique alerts: 3 medium, 16 low and 13 informational**. No high or critical alerts were reported within this passive scan. The deployed revision is unverified.\n\n| Severity | Rule | Alert | Unique alerts | Response paths |\n| --- | --- | --- | --- | --- |\n"+"\n".join(zap_md)+"\n")
    md.append("\n## npm audit — affected package entries\n\n**5 high and 22 moderate; 0 critical.** These are package entries, including inherited ratings and development tools. Locked versions were compared to the retained lockfile hash. Review dependency chains and compatibility before remediation.\n\n| Severity | Package | Locked versions | Relationship |\n| --- | --- | --- | --- |\n"+"\n".join(npm_md)+"\n")
    md.append("\n## OSV — Python package/version matches\n\n**5 matched packages from 99 queried versions. All Unrated in this report**: the retained batch response has advisory IDs but no severity values. GHSA/PYSEC IDs may be aliases of the same issue.\n\n| Severity | Package | Version | Advisory IDs |\n| --- | --- | --- | --- |\n"+"\n".join(osv_md)+"\n")
    md.append("\n## Preliminary code candidates — not independently validated\n\nEvery entry below is **Unrated**, may be a false positive and requires the exact unresolved facts listed in [NEEDS-VALIDATION.md](NEEDS-VALIDATION.md). These are not final needs_validation records or confirmed vulnerabilities.\n\n| ID | Severity | Candidate | Initial source reference | Validation status |\n| --- | --- | --- | --- | --- |\n"+"\n".join(candidate_md)+"\n")
    md.append(f"""
## Evidence provenance

- **ZAP:** existing CI run [44761212902](https://github.com/marcc28/AGRITWIN/actions/runs/44761212902); anonymous passive GET only, no new scan. Deployed SHA not established.
- **Sonar and regression CI:** [44761212933](https://github.com/marcc28/AGRITWIN/actions/runs/44761212933), analyzed revision `{sonar['workflow']['commit']}`. Only `reports/costes.xlsx` differs from the reviewed HEAD. Sonar analysis time: 20 Nov 2026 at 16:17 Europe/Madrid. Gate OK; 92.0% overall coverage; 0 reported vulnerabilities/hotspots. Warnings concern excluded layouts/unresolved LCOV, assets parsed as text, migration parsing and unset Python version.
- **CodeQL:** existing weekly analysis dated 18 Nov at `684d883`; 0 open alerts in the retained report. It does not establish coverage of the newer HEAD.
- **TruffleHog:** new local static history scan, 3.99.9, no external credential verification. Both hits were source-triaged as deliberate URI fixtures. Official 3.100.0 was observed but not executed.
- **BLA:** documentation only, version 3.5.2 observed. No scan result; runtime mismatch: Node 22.17.0 available vs ^22.23.4 or >=24.0.0 required.

## Coverage and completion limits

Profile: standard. No strict agent budget was requested. Four reconnaissance agents and backend/client/IoT source reviewers contributed. The initial client agent was automatically blocked; a replacement defensive source reviewer completed that source assignment. Prior ledgers contained no final verified findings; prior leads were not promoted by age.

**22 units: {counts['covered']} covered, {counts['candidate']} candidate, {counts['blocked']} blocked and {counts['deferred']} deferred.** The deferred unit is the public-market translation admission boundary. Candidate units can link multiple proposals. Covered refers only to the recorded source invariant, not runtime behavior. Coverage critics and independent candidate verification were not completed, so no clean-coverage or exhaustive-audit claim is made.

The official validators passed for the ledger and the empty final findings array. They validate format, not security conclusions. Source checks have artifact:null; no target execution artifact is claimed.

No local target-controlled tests, imports, builds, browsers/emulators, brokers, providers or real devices ran. The selected [Cloudflare SKILL.md]({METHOD}) requires: “If every control cannot be enforced, do not execute target code”. Complete filesystem/credential isolation, isolated networking and combined CPU/memory/process/disk controls were not established. Existing CI is external evidence identified by date and revision.

Outstanding facts include deployed digest/SHA, broker activation and ACLs, RLS/IAM, shipped pairing/firmware, editorial/privacy authority, provider budgets and asynchronous session behavior.

## Recommended validation and remediation order

1. Validate identity and credential boundaries with isolated dummy fixtures: JWT purpose/subject separation, native callback correlation and late refresh handling.
2. Validate account/device isolation: pending-request retries, garden cache writes, message identity binding and BLE recipient proof.
3. Confirm intended directory, catalog and news publication authority before classifying public/shared behavior as unauthorized.
4. Confirm aggregate AI/translation budgets, cache and admission rules while preserving per-field claims and concurrency controls.
5. Review dependency advisories and Expo/toolchain compatibility. Avoid unreviewed npm audit fix --force upgrades or downgrades.
6. Triage ZAP headers and resource rules on the affected HTML/JSON responses; preserve intentional no-store and expected 401 behavior.
7. Bind future reports to a deployed SHA/digest and review Sonar coverage exclusions/warnings.

This is a validation order, not a severity classification of unvalidated candidates.

## Unvalidated candidate-to-coverage mapping

| Candidate | Fingerprint | Coverage unit(s) |
| --- | --- | --- |
""")
    for index,c in enumerate(candidates,1):
        units=[u['coverage_id'] for u in ledger if c['fingerprint'] in u['result_fingerprints']]
        md.append(f"| C{index:02d} | `{c['fingerprint']}` | {'; '.join('`'+u+'`' for u in units)} |\n")
    md.append("\n## Files\n\n"+"\n".join(f"- [{label}]({href})" for label,href in evidence_links)+"\n\nOriginal scanner/agent evidence is retained unchanged. Human-facing report documents are in English; repository paths and identifiers preserve their original spelling. Application source is unchanged.\n")
    markdown = ''.join(md)
    if remediation_exists:
        notice = '**Baseline snapshot before remediation.** See the [current fixes and regression results](../../remediation/2026-11-20/REPORT.html). Counts below retain the original scanner results.\n\n'
        start = markdown.index('\n\n') + 2
        markdown = markdown[:start] + notice + markdown[start:]
    (OUT/'REPORT.md').write_text(markdown)
    (OUT/'NEEDS-VALIDATION.md').write_text(''.join(detail_md))
    (OUT/'FINDINGS-DETAIL.md').write_text('# Confirmed findings\n\nNo final confirmed vulnerability records were issued. Independent candidate validation was not completed. This is not a finding that the application has no vulnerabilities.\n\nSee [REPORT.md](REPORT.md) and [the 15 preliminary candidates](NEEDS-VALIDATION.md). All candidates remain Unrated.\n')
    (OUT/'README.md').write_text('# AGRITWIN security audit — English edition\n\nOpen [the interactive report](REPORT.html) or [the Markdown report](REPORT.md). Tool execution, results and scanner severity are separated explicitly.\n\nStatus: finalized with independent validation incomplete. 15 code candidates remain preliminary and Unrated; findings.json is empty. There are 22 coverage units, including 5 blocked and 1 deferred. No application changes or new scans were made by this presentation revision.\n\nDetails: [candidate notes](NEEDS-VALIDATION.md), [tool notes](tool-evaluation.md), [retained evidence](report-presentation.json). Original scanner/agent evidence is preserved.\n')
    notes=['# Tool execution and result interpretation\n\nEvidence snapshot: 20 November 2026. Presentation: English. No new scans or tests were run for this report revision.\n']
    for t in tools:
        notes.append(f"\n## {t['name']} — {t['version']}\n\n**Use:** {t['status']}. **Reported severity:** {t['severity']}.\n\n{t['result']}\n\nScope: {t['scope']}\n\nLimitations: {t['limit']}\n\n[Retained evidence]({t['evidence']}) · [Tool or execution reference]({t['official']})\n")
    notes.append('\n## Severity policy\n\n'+'\n'.join('- '+s for s in severity_policy)+f'\n\n## Local execution restriction\n\nThe [selected Cloudflare SKILL.md]({METHOD}) states: “If every control cannot be enforced, do not execute target code”. Required isolation was not established. No target-controlled code or real credential verification ran locally. Existing CI and deployment results are separate external evidence. Raw secret detector values are omitted from the report.\n')
    (OUT/'tool-evaluation.md').write_text(''.join(notes))
    (OUT/'architecture.md').write_text(f'''# Review architecture and scope

AGRITWIN combines a Python/FastAPI/SQLAlchemy API, an Expo/React Native/TypeScript web and mobile client, ESP32 BLE/MQTT firmware and GitHub Actions. The audit snapshot is `{source_ref}` on `{meta['branch']}`, matching origin/dev at fetch. Untracked docs/security files are outside the reviewed commit.

The farmer account manages owned fields, field crops, devices, tasks, recommendations and profile data. Anonymous visitors use registration, login and recovery; some directory/content/payment routes have no global identity dependency. A cron secret authorizes aggregate AI work. MQTT publishers and selected BLE peripherals are separate principals from authenticated HTTP users.

Source-visible boundaries include JWT purpose/subject resolution, OAuth ticket consumption, owner-scoped SQL queries, asynchronous session transitions, shared/persistent client caches, native callbacks, WebView messaging, uploads and privileged provider/storage access. AI output is parsed as data in the reviewed paths; no model tool execution was established.

The normal backend image runs uvicorn main:app as appuser; the Lambda image selects main.handler. PROD=True selects Aurora DSQL/IAM; alternative application persistence uses DATABASE_URL. Telemetry uses a separate Supabase client. The MQTT subscriber has an independent module entrypoint and is not started by the HTTP CMD. Shipped activation, broker ACLs, RLS/IAM, firmware/pairing and effective deployment configuration remain owner-observed facts.

Client logout and account installation clear credential/cache state, but pending continuations are a distinct lifecycle boundary. Initial source candidates concern refresh completion, request retries, garden persistence and native callback correlation. The map has source-visible serialization, navigation and bridge controls; forms use explicit text/enum/numeric validation.

The review also covers shared catalog/news authority, public directory output, aggregate provider-work admission, CI/release inputs, issue-derived cost reports and lockfile advisory matching. No comparable product baseline was identified; firmware and simulator document the same MQTT interface.

Previous ledgers contained no final independently verified findings. Current source was compared with prior refs; earlier proposals were not confirmations or exclusions. Four reconnaissance reviews and backend/client/IoT source reviews contributed. The initial client agent was replaced after an automatic block. The ledger holds 22 units: 6 covered, 10 candidate, 5 blocked and 1 deferred. Coverage critics and independent verification were not completed.

No local target-controlled code, imports, tests, builds, emulators, providers, brokers or real devices ran. The required OS-enforced isolation and combined resource controls were not established. Source checks use artifact:null. Trusted static scans, public advisory queries and existing CI evidence are retained separately. Only the parent writes shared report records; original agent/scanner evidence is preserved. Application source remains unchanged.
''')
    presentation=dict(language='en',audit_status=meta['run_status'],source_ref=source_ref,presentation_only=True,new_scans_started=False,severity_policy=severity_policy,tools=tools,zap=dict(raw_records=raw_count,unique_alerts=len(zap),severity_counts=dict(zap_counts),rule_groups=rule_data),npm=dict(package_entries=len(npm),severity_counts=dict(npm_counts),packages=package_data),osv=dict(package_matches=5,severity_assessment='not_captured_in_retained_batch'),candidates=candidate_data,coverage=dict(counts),original_evidence_preserved=True)
    (OUT/'report-presentation.json').write_text(json.dumps(presentation,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(dict(language='en',tools=len(tools),zap_unique_alerts=len(zap),npm_package_entries=len(npm),osv_package_matches=5,preliminary_unrated_candidates=len(candidates),coverage=dict(counts),html_bytes=len(html_page.encode())),indent=2))


if __name__ == '__main__':
    main()
