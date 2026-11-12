# machine-portfolio

Personal portfolio site for Joe Etzkorn, mechanical design engineer: BIW and heavy-industrial weld fixtures, simulation, and AI model evaluation.

Static site with no build step: plain HTML, CSS and JavaScript, ready for GitHub Pages.

## Structure

```
index.html               page content
assets/css/style.css     styles (dark "engineering blueprint" theme)
assets/js/main.js        nav, scroll reveal, gallery filters, lightbox
assets/img/work/full/    full-size work samples (WebP)
assets/img/work/thumb/   gallery thumbnails (WebP)
tools/work.json          gallery data: title, caption, category and tags per sample
tools/build.py           converts images and regenerates the gallery markup
```

## Preview locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Add or edit a work sample

1. Add an entry to `tools/work.json` (`id`, `src`, `cat`, `title`, `caption`, `tags`).
2. Put the source image in a folder as `<src>.png` (or .jpg).
3. Run:

```bash
python3 tools/build.py --images path/to/source-folder
```

To change only titles or captions, run `python3 tools/build.py` with no options. It rewrites the gallery between the `GALLERY:START` and `GALLERY:END` markers in `index.html` and leaves the rest of the page alone. The build needs Pillow (`pip install pillow`).
