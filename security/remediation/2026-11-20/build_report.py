"""Render this controlled Markdown report as a standalone English HTML artifact."""

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def inline(text):
    text = html.escape(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"!\[([^]]*)\]\(([^)]+)\)", r'<img alt="\1" src="\2" loading="lazy">', text)
    return re.sub(r"\[([^]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)


def render():
    lines = (ROOT / "REPORT.md").read_text().splitlines()
    blocks = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue
        if line.startswith("# "):
            blocks.append("<h1>" + inline(line[2:]) + "</h1>")
        elif line.startswith("## "):
            blocks.append("<h2>" + inline(line[3:]) + "</h2>")
        elif line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].startswith("|"):
                cells = [cell.strip() for cell in lines[index].strip("|").split("|")]
                if not all(re.fullmatch(r"[-: ]+", cell) for cell in cells):
                    rows.append(cells)
                index += 1
            header = "<tr>" + "".join("<th>" + inline(cell) + "</th>" for cell in rows[0]) + "</tr>"
            body = "".join("<tr>" + "".join("<td>" + inline(cell) + "</td>" for cell in row) + "</tr>" for row in rows[1:])
            blocks.append('<div class="table"><table><thead>' + header + "</thead><tbody>" + body + "</tbody></table></div>")
            continue
        else:
            blocks.append("<p>" + inline(line) + "</p>")
        index += 1
    css = """
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f3f6f8;color:#172c3d;font:15px/1.65 system-ui,sans-serif}
    header{background:#102a43;color:white;padding:34px max(24px,calc((100% - 1240px)/2));font-size:14px;letter-spacing:.06em}
    header a{color:#d4eaff}main{max-width:1288px;margin:auto;padding:28px 24px 70px}h1{font-size:34px;line-height:1.2;letter-spacing:-.03em}
    h2{margin-top:38px;font-size:23px}p{max-width:1100px}main>p:first-of-type{background:#e8f6ef;border-left:5px solid #187052;padding:18px 22px;max-width:none}
    a{color:#1a5fa1;text-underline-offset:3px}code{font:12px/1.5 ui-monospace,monospace;background:#e9eef2;padding:2px 5px;border-radius:4px;overflow-wrap:anywhere}
    .table{overflow:auto;background:white;border:1px solid #d5dfe7;border-radius:8px}table{border-collapse:collapse;width:100%;min-width:850px;font-size:13px}
    th,td{text-align:left;vertical-align:top;padding:14px 16px;border-bottom:1px solid #dce4eb}th{background:#e9f0f5;font-size:12px}tr:last-child td{border-bottom:0}
    img{display:block;max-width:100%;height:auto;border:1px solid #ccd7df;border-radius:8px;margin:20px 0}footer{color:#526477;margin-top:40px;font-size:12px}
    @media print{body{background:white}header{padding:10px 24px}main{padding-top:10px}h2{break-after:avoid}tr,img{break-inside:avoid}.table{overflow:visible}table{min-width:0;font-size:10px}th,td{padding:8px}}
    """
    page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AGRITWIN security remediation | 20 Nov 2026</title><style>' + css + '</style></head><body><header>AGRITWIN / SECURITY / <a href="../../reports/2026-11-20-audit/REPORT.html">Baseline audit and tool evidence</a></header><main>'
    page += "\n".join(blocks)
    page += '<footer>Local remediation evidence · Deployment validation pending · <a href="REPORT.md">Markdown version</a></footer></main></body></html>'
    (ROOT / "REPORT.html").write_text(page)


if __name__ == "__main__":
    render()
