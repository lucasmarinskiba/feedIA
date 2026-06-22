#!/usr/bin/env python3
"""
fetch_article.py — Extrae el texto principal de un artículo web.
Uso: python fetch_article.py <URL> [--max-words 2000]
"""

import sys
import re
import argparse
import urllib.request
from html.parser import HTMLParser


class ArticleExtractor(HTMLParser):
    """Parser simple que extrae texto de los tags relevantes del artículo."""

    SKIP_TAGS = {'script', 'style', 'nav', 'header', 'footer', 'aside',
                 'form', 'button', 'noscript', 'iframe', 'svg'}
    CONTENT_TAGS = {'p', 'h1', 'h2', 'h3', 'h4', 'li', 'blockquote', 'article', 'main'}

    def __init__(self):
        super().__init__()
        self.skip_depth = 0
        self.current_tag = ''
        self.chunks = []
        self._buffer = ''

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP_TAGS:
            self.skip_depth += 1
        self.current_tag = tag

    def handle_endtag(self, tag):
        if tag in self.SKIP_TAGS and self.skip_depth > 0:
            self.skip_depth -= 1
        if tag in self.CONTENT_TAGS and self._buffer.strip():
            self.chunks.append(self._buffer.strip())
            self._buffer = ''

    def handle_data(self, data):
        if self.skip_depth == 0 and self.current_tag in self.CONTENT_TAGS:
            self._buffer += data

    def get_text(self) -> str:
        return '\n\n'.join(chunk for chunk in self.chunks if len(chunk) > 30)


def fetch_article(url: str, max_words: int = 3000) -> str:
    """Descarga y extrae el texto principal de un artículo web."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                      'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode('utf-8', errors='replace')
    except Exception as e:
        print(f"ERROR al descargar {url}: {e}", file=sys.stderr)
        sys.exit(1)

    # Extraer título
    title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip() if title_match else 'Sin título'

    # Extraer contenido
    parser = ArticleExtractor()
    parser.feed(html)
    text = parser.get_text()

    # Si el parser simple no extrajo suficiente, intento básico
    if len(text.split()) < 100:
        clean = re.sub(r'<[^>]+>', ' ', html)
        clean = re.sub(r'\s+', ' ', clean).strip()
        text = clean

    # Truncar a max_words
    words = text.split()
    if len(words) > max_words:
        text = ' '.join(words[:max_words]) + '\n\n[... artículo truncado ...]'

    print(f"# Artículo: {title}", file=sys.stderr)
    print(f"# Palabras extraídas: {len(text.split())}", file=sys.stderr)

    return f"# {title}\n\n{text}"


def main():
    parser = argparse.ArgumentParser(description='Extrae texto de un artículo web')
    parser.add_argument('url', help='URL del artículo')
    parser.add_argument('--max-words', type=int, default=3000,
                        help='Máximo de palabras a extraer (default: 3000)')
    args = parser.parse_args()

    text = fetch_article(args.url, args.max_words)
    print(text)


if __name__ == '__main__':
    main()
