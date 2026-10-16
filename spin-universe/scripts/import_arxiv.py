#!/usr/bin/env python3
"""Import pinned arXiv HTML, keeping article contents and local figure assets.

Usage: python scripts/import_arxiv.py [spin siren miner tacit] [--refresh]
Change scripts/papers.json to import a newer arXiv version. No runtime build is
needed on GitHub Pages. Cached downloads make repeated imports inexpensive.
"""

import argparse
import hashlib
import html
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "arxiv"
BASE = "https://csslab.github.io/spin-universe"


def fetch(url, target, refresh=False):
    if refresh or not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(
            url, headers={"User-Agent": "ReadoutResearchWebsite/1.0 (author-maintained HTML copy)"}
        )
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    data = response.read()
                target.write_bytes(data)
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(2 * (attempt + 1))
        time.sleep(0.35)
    return target.read_bytes()


def author_names(article):
    names = []
    for person in article.select(".ltx_authors .ltx_personname"):
        copy = BeautifulSoup(str(person), "html.parser")
        for note in copy.select(".ltx_note"):
            note.decompose()
        name = copy.get_text(" ", strip=True)
        name = re.sub(r"[\u2000-\u200a]{2,}", ", ", name)
        names.append(re.sub(r"\s+", " ", name))
    return ", ".join(names)


def import_paper(paper, refresh=False):
    slug, version = paper["slug"], paper["arxiv"]
    if paper.get("presentation") == "editorial":
        print(f"{slug}: keeping the edited research article; edit {slug}/index.html directly")
        return
    source_url = f"https://arxiv.org/html/{version}"
    raw = fetch(source_url, CACHE / f"{version}.html", refresh)
    soup = BeautifulSoup(raw, "html.parser")
    article = soup.select_one("article.ltx_document")
    if not article:
        raise ValueError(f"No full article found at {source_url}")
    # The article is separate from arXiv's navigation and issue-reporting UI.
    # Keep every section, appendix, reference, equation, caption and footnote.
    for script in article.select("script"):
        script.decompose()
    source_text = re.sub(r"\s+", " ", article.get_text(" ", strip=True))
    source_ids = {node["id"] for node in article.select("[id]")}
    source_counts = {key: len(article.select(key)) for key in ["figure", "math", ".ltx_note", "figcaption"]}
    title = article.select_one("h1").get_text(" ", strip=True)
    names = author_names(article)
    assets = {}

    def local_asset(value, relative_to=source_url):
        if value.startswith(("data:", "#")):
            return value
        url = urllib.parse.urljoin(relative_to, value)
        if url in assets:
            return assets[url]
        parsed = urllib.parse.urlparse(url)
        if parsed.hostname != "arxiv.org":
            raise ValueError(f"Review unexpected figure host: {url}")
        filename = Path(urllib.parse.unquote(parsed.path)).name
        # Prefix prevents basename collisions across subdirectories.
        filename = hashlib.sha256(url.encode()).hexdigest()[:10] + "-" + filename
        dest = ROOT / "assets" / "papers" / slug / filename
        data = fetch(url, dest, refresh)
        relative = "../assets/papers/" + slug + "/" + filename
        assets[url] = relative
        if parsed.path.endswith(".svg"):
            # Most SVGs are self-contained. Localize any nested image references
            # too; leave data URLs and internal <use> references untouched.
            svg = data.decode("utf-8")

            def replace_ref(match):
                value = match.group(3)
                if value.startswith(("data:", "#")):
                    return match.group(0)
                nested = local_asset(value, url)
                return match.group(1) + match.group(2) + Path(nested).name + match.group(2)

            svg = re.sub(r'((?:xlink:)?href=)([\"\'])(.*?)[\"\']', replace_ref, svg)
            dest.write_text(svg)
        return relative

    for node in article.select("img[src], object[data], image[href], image[xlink\\:href]"):
        attr = "data" if node.name == "object" else "src" if node.name == "img" else "href" if node.has_attr("href") else "xlink:href"
        value = local_asset(node[attr])
        if node.name == "object":
            # Images size responsively and do not create nested SVG documents.
            node.name = "img"
            del node["data"]
            node.attrs.pop("type", None)
            node["src"] = value
        else:
            node[attr] = value
        if node.name == "img":
            caption = node.find_parent("figure")
            caption = caption.find("figcaption") if caption else None
            node["alt"] = node.get("alt") or (caption.get_text(" ", strip=True) if caption else "Paper figure")
            node["loading"] = "lazy"
            node["decoding"] = "async"

    # Author and affiliation details remain intact, with a compact name line
    # above them. Some older arXiv conversions have imperfect email layout.
    h1 = article.select_one("h1").extract()
    h1["class"] = ["paper-title"]
    authors = article.select_one(".ltx_authors").extract()
    contents = []
    for section in article.find_all("section", recursive=False):
        heading = section.find(re.compile("^h[2-6]$"), recursive=False)
        if heading and section.get("id"):
            contents.append(f'<li><a href="#{html.escape(section["id"], quote=True)}">{html.escape(heading.get_text(" ", strip=True))}</a></li>')

    # Keep wide tables scrollable within their own region on small screens.
    # Nested layout tables are left alone so figure panels stay together.
    for table in list(article.select("table")):
        if table.find_parent("table"):
            continue
        wrapper = soup.new_tag("div", attrs={"class": "paper-table-scroll", "tabindex": "0", "role": "region", "aria-label": "Scrollable table or equation"})
        table.wrap(wrapper)
    for note in article.select(".ltx_note") + authors.select(".ltx_note"):
        mark = note.find(class_="ltx_note_mark", recursive=False)
        if mark and note.find(class_="ltx_note_outer", recursive=False):
            mark["tabindex"] = "0"
            mark["role"] = "button"
            mark["aria-expanded"] = "false"
            mark["aria-label"] = "Footnote " + mark.get_text(strip=True)
    when = date.fromisoformat(paper["date"]).strftime("%B %d, %Y").replace(" 0", " ")
    abstract = article.select_one(".ltx_abstract")
    description = abstract.get_text(" ", strip=True) if abstract else title
    page = f'''<!doctype html>
<!-- Generated by scripts/import_arxiv.py from {source_url}. Edit the importer or its shared styles, not this file. -->
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} | Readout</title>
<meta name="description" content="{html.escape(description, quote=True)}">
<meta name="citation_title" content="{html.escape(title, quote=True)}">
<meta name="citation_arxiv_id" content="{version}">
<meta name="citation_pdf_url" content="https://arxiv.org/pdf/{version}">
<link rel="canonical" href="{BASE}/{slug}/">
<meta property="og:title" content="{html.escape(title, quote=True)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{BASE}/{slug}/">
<link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../assets/vendor/ar5iv/ar5iv.min.css">
<link rel="stylesheet" href="../assets/css/paper.css">
<link rel="stylesheet" href="../assets/css/readout-nav.css">
<script defer src="../assets/js/paper.js"></script>
</head><body>
<a class="skip-link" href="#paper">Skip to paper</a>
<nav class="readout-nav" aria-label="Site navigation"><a class="readout-home" href="../"><span aria-hidden="true">←</span> Readout</a><a href="https://arxiv.org/abs/{version}">arXiv ↗</a></nav>
<header class="paper-header">{h1}
<div class="paper-meta"><p>{html.escape(names)}</p><time datetime="{paper['date']}">{when}</time></div>
<div class="paper-links"><a href="https://arxiv.org/pdf/{version}">Download PDF</a><a href="{source_url}">Original HTML</a></div>
</header>
<main id="paper">
<div class="paper-frontmatter">
<details class="author-details"><summary>Authors and affiliations</summary>{authors}</details>
<details class="paper-contents"><summary>Contents</summary><ol>{''.join(contents)}</ol></details>
</div>
{article}
</main>
<footer class="paper-footer"><a class="readout-home" href="../"><span aria-hidden="true">←</span> Readout</a><p>Full paper from <a href="{source_url}">arXiv:{version}</a>. Figures, references and appendices are included.</p></footer>
</body></html>
'''
    output = BeautifulSoup(page, "html.parser")
    # Assert the scientific elements survived the generic transformation.
    for selector, count in source_counts.items():
        assert len(output.select(selector)) == count, (slug, selector, count)
    assert source_ids <= {node["id"] for node in output.select("[id]")}, f"Lost anchors in {slug}"
    restored_text = " ".join(node.get_text(" ", strip=True) for node in (h1, authors, article))
    assert re.sub(r"\s+", " ", restored_text) == source_text, f"Changed paper text in {slug}"
    target = ROOT / slug / "index.html"
    target.write_text("\n".join(line.rstrip() for line in page.splitlines()) + "\n")
    record = {"source": source_url, "sha256": hashlib.sha256(raw).hexdigest(), "elements": source_counts, "assets": assets}
    (ROOT / "assets" / "papers" / slug / "source.json").write_text(json.dumps(record, indent=2) + "\n")
    print(f"{slug}: {len(assets)} local figures; {source_counts['math']} equations/math expressions; {target.relative_to(ROOT)}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("papers", nargs="*")
    parser.add_argument("--refresh", action="store_true", help="Download sources and figures again")
    args = parser.parse_args()
    papers = json.loads((ROOT / "scripts" / "papers.json").read_text())
    valid = {paper["slug"] for paper in papers}
    if set(args.papers) - valid:
        parser.error("Unknown paper slug")
    for paper in papers:
        if not args.papers or paper["slug"] in args.papers:
            import_paper(paper, args.refresh)


if __name__ == "__main__":
    main()
