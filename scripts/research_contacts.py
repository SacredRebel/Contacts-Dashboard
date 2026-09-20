"""Bounded public-page research. Never guesses email addresses or sends messages.

Email regex adapted from Kremilly/Linkscraper core/scraper.py (MIT),
copyright 2023 Emily Silva. See vendor/linkscraper/LICENSE.
The fetch, evidence recording and HTML parser are local additions.
"""
import concurrent.futures
import datetime
import hashlib
import html
import json
import re
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

EMAIL_PATTERN = r'[\w.+-]+@[\w-]+\.[\w.-]+'

class PublicText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.parts = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'noscript'):
            self.skip += 1
        if tag == 'a':
            href = dict(attrs).get('href', '')
            if href:
                self.links.append(href)

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript'):
            self.skip = max(0, self.skip - 1)

    def handle_data(self, value):
        if not self.skip and value.strip():
            self.parts.append(value.strip())

def research(item):
    url = item['url']
    if urllib.parse.urlparse(url).scheme not in ('http', 'https'):
        return {**item, 'error': 'Public HTTP(S) URLs only'}
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'PortfolioResearch/1.0 (public business contact review)'})
        with urllib.request.urlopen(request, timeout=16) as response:
            raw = response.read(3_000_000).decode('utf-8', errors='replace')
            parser = PublicText()
            parser.feed(raw)
            visible = ' '.join(parser.parts)
            mailtos = [urllib.parse.unquote(v[7:].split('?')[0]) for v in parser.links if v.lower().startswith('mailto:')]
            emails = sorted(set(v.rstrip('.') for v in re.findall(EMAIL_PATTERN, visible + ' ' + ' '.join(mailtos))))
            record = {**item, 'status': response.status, 'finalUrl': response.url, 'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'emails': emails, 'text': visible, 'contactLinks': [urllib.parse.urljoin(response.url, v) for v in parser.links if any(word in v.lower() for word in ('contact', 'about', 'service'))][:20]}
            return record
    except Exception as error:
        return {**item, 'error': str(error)}

if __name__ == '__main__':
    candidates = json.loads(Path(sys.argv[1]).read_text())
    output = Path(sys.argv[2])
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(research, candidates))
    output.write_text(json.dumps(results, indent=2))
    for item in results:
        print(json.dumps({k:v for k,v in item.items() if k not in ('text',)}, ensure_ascii=False))
