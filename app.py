#!/usr/bin/env python3
"""Company web product matcher + WhatsApp message generator.

Usage:
    python app.py --company "Tile AU" --url "https://example.com" --stock stock_products.json
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from html import unescape
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "stone",
    "tile",
    "tiles",
    "marble",
    "travertine",
    "product",
    "products",
    "collection",
    "collections",
}


@dataclass
class StockItem:
    name: str
    specification: str


@dataclass
class RankedItem:
    item: StockItem
    score: float


def strip_html(raw_html: str) -> str:
    text = re.sub(r"<script\b[^<]*(?:(?!</script>)<[^<]*)*</script>", " ", raw_html, flags=re.I)
    text = re.sub(r"<style\b[^<]*(?:(?!</style>)<[^<]*)*</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def fetch_website_text(url: str, timeout: int = 12) -> str:
    """Fetch and normalize visible-like text from a target website."""
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ProductMatcherBot/1.0)"})
    try:
        with urlopen(request, timeout=timeout) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            html = response.read().decode(charset, errors="replace")
    except (HTTPError, URLError) as exc:
        raise RuntimeError(f"Website could not be fetched: {exc}") from exc

    return strip_html(html)


def tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z0-9]+", text.lower())
    return [t for t in tokens if t not in STOPWORDS and len(t) > 2]


def keyword_overlap_score(website_text: str, item: StockItem) -> float:
    website_tokens = set(tokenize(website_text))
    item_text = f"{item.name} {item.specification}"
    item_tokens = set(tokenize(item_text))
    if not item_tokens:
        return 0.0

    overlap = len(website_tokens & item_tokens) / len(item_tokens)
    fuzzy_name = SequenceMatcher(None, website_text.lower(), item.name.lower()).ratio()
    return (0.8 * overlap) + (0.2 * fuzzy_name)


def rank_stock_items(website_text: str, stock_items: Iterable[StockItem], top_n: int = 2) -> list[RankedItem]:
    ranked: list[RankedItem] = []
    for item in stock_items:
        ranked.append(RankedItem(item=item, score=keyword_overlap_score(website_text, item)))

    ranked.sort(key=lambda r: r.score, reverse=True)
    return ranked[:top_n]


def build_whatsapp_message(company_name: str, item: StockItem) -> str:
    lines = [
        f"Hi {company_name},",
        "Burak from NELAMAR (Turkey).",
        f"{item.name},",
        item.specification,
        "Are you interested in this stone or others?",
        "Reply STOP to unsubscribe.",
    ]
    return "\n".join(lines)


def load_stock(path: str) -> list[StockItem]:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    items: list[StockItem] = []
    for row in raw:
        items.append(StockItem(name=row["name"], specification=row["specification"]))
    return items


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Find best matching stock products from a company website and produce WhatsApp messages."
    )
    parser.add_argument("--company", required=True, help="Company name (e.g., Tile AU)")
    parser.add_argument("--url", required=True, help="Company website URL")
    parser.add_argument("--stock", default="stock_products.json", help="Stock JSON file path")
    parser.add_argument("--top-n", type=int, default=2, help="How many products to recommend")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    stock_items = load_stock(args.stock)
    try:
        website_text = fetch_website_text(args.url)
    except RuntimeError as exc:
        print(exc)
        return

    top_matches = rank_stock_items(website_text, stock_items, top_n=args.top_n)

    if not top_matches:
        print("No suitable match found.")
        return

    print("Top matched products:\n")
    for i, ranked in enumerate(top_matches, start=1):
        print(f"{i}. {ranked.item.name} ({ranked.score:.2f})")
        print(build_whatsapp_message(args.company, ranked.item))
        print("\n" + "-" * 60 + "\n")


if __name__ == "__main__":
    main()
