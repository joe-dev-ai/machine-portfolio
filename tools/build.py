#!/usr/bin/env python3
"""Build the work gallery for index.html from tools/work.json.

Usage:
  python3 tools/build.py                      # re-render gallery markup only
  python3 tools/build.py --images SRC_DIR     # also convert SRC_DIR/<src>.png into web images

Each item in work.json names a source image (`src`, without extension). With
--images, the script writes:
  assets/img/work/full/<id>.webp   full size (drawings lossless, renders q88)
  assets/img/work/thumb/<id>.webp  720 px wide card thumbnail
and then rewrites everything between the GALLERY markers in index.html.
"""
import argparse
import html
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "tools" / "work.json"
INDEX = ROOT / "index.html"
FULL = ROOT / "assets" / "img" / "work" / "full"
THUMB = ROOT / "assets" / "img" / "work" / "thumb"
START, END = "<!-- GALLERY:START -->", "<!-- GALLERY:END -->"
THUMB_W = 720
FULL_MAX = 1600


def convert(src_dir: Path, item: dict) -> None:
    src = next(src_dir.glob(item["src"] + ".*"))
    im = Image.open(src).convert("RGB")
    drawing = item["cat"] == "drawings"
    full = im.copy()
    full.thumbnail((FULL_MAX, FULL_MAX), Image.LANCZOS)
    if drawing:
        full.save(FULL / f"{item['id']}.webp", "WEBP", lossless=True, method=6)
    else:
        full.save(FULL / f"{item['id']}.webp", "WEBP", quality=88, method=6)
    if drawing:
        # Line art on black compresses to a few KB losslessly at full size, while any
        # downscale adds anti-aliased pixels that bloat the file. Reuse the full image.
        full.save(THUMB / f"{item['id']}.webp", "WEBP", lossless=True, method=6)
        return
    th = im.copy()
    if th.width > THUMB_W:
        th = th.resize((THUMB_W, round(th.height * THUMB_W / th.width)), Image.LANCZOS)
    th.save(THUMB / f"{item['id']}.webp", "WEBP", quality=80, method=6)


def card(n: int, item: dict, cats: dict) -> str:
    e = html.escape
    w, h = Image.open(THUMB / f"{item['id']}.webp").size
    fw, fh = Image.open(FULL / f"{item['id']}.webp").size
    kind = "drawing" if item["cat"] == "drawings" else "render"
    chips = "".join(f"<span>{e(t)}</span>" for t in item["tags"])
    return f"""        <li class="work-item" data-cat="{item['cat']}">
          <a class="work-card" href="assets/img/work/full/{item['id']}.webp" data-id="{item['id']}" data-w="{fw}" data-h="{fh}" data-caption="{e(item['caption'])}" data-tags="{e('|'.join(item['tags']))}" data-cat-label="{e(cats[item['cat']])}">
            <span class="work-media" data-kind="{kind}"><img src="assets/img/work/thumb/{item['id']}.webp" width="{w}" height="{h}" loading="lazy" decoding="async" alt="{e(item['title'])}"></span>
            <span class="work-meta">
              <span class="fig">FIG. {n:02d} · {e(cats[item['cat']])}</span>
              <span class="work-title">{e(item['title'])}</span>
              <span class="chips">{chips}</span>
            </span>
          </a>
        </li>"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--images", type=Path, help="folder with the source images")
    args = ap.parse_args()

    data = json.loads(DATA.read_text())
    cats, items = data["categories"], data["items"]
    if args.images:
        FULL.mkdir(parents=True, exist_ok=True)
        THUMB.mkdir(parents=True, exist_ok=True)
        for it in items:
            convert(args.images, it)

    counts = {c: sum(1 for i in items if i["cat"] == c) for c in cats}
    filters = [f'<button type="button" class="filter is-active" data-filter="all" aria-pressed="true">All <span>{len(items)}</span></button>']
    filters += [f'<button type="button" class="filter" data-filter="{c}" aria-pressed="false">{html.escape(label)} <span>{counts[c]}</span></button>' for c, label in cats.items()]
    block = "\n".join([
        START,
        '      <div class="filters" role="group" aria-label="Filter work">',
        "        " + "\n        ".join(filters),
        "      </div>",
        '      <ul class="work-grid" id="work-grid">',
        "\n".join(card(n, it, cats) for n, it in enumerate(items, 1)),
        "      </ul>",
        "      " + END,
    ])
    page = INDEX.read_text()
    a, b = page.index(START), page.index(END) + len(END)
    INDEX.write_text(page[:a] + block + page[b:])
    print(f"gallery: {len(items)} items", counts)


if __name__ == "__main__":
    main()
