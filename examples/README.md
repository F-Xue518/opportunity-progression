# Examples

Sample data + rendered preview for the Phase 7 reading report.

| File | Purpose |
|---|---|
| `sample-data.json` | Canonical data contract. Every field the Jinja2 template expects is present here. Use this as the reference when the agent assembles runtime data in Phase 7. |
| `render_sample.py` | Renders `sample-data.json` through `templates/opportunity-progression.html.j2` and writes `sample-report.html`. Re-run whenever the template or sample data changes. |
| `sample-report.html` | The rendered HTML preview — open in a browser to see the MD3 reading interface. This file is a build artifact; regenerate rather than hand-edit. |
| `export_pdf.py` | Converts a rendered `.html` into `.pdf` via headless Chromium (Playwright first, system Chrome fallback). Tailwind JIT requires a real browser engine, so WeasyPrint would not work. |
| `export_docx.py` | Generates a `.docx` directly from `sample-data.json` via python-docx (no HTML parsing — clean business register, not pixel-for-pixel fidelity, per team-wide output standard). |

## Re-render HTML preview

```bash
# from the skill repo root
python3 examples/render_sample.py
# → writes examples/sample-report.html
```

Requires `jinja2` (`pip install jinja2`).

## Export PDF

```bash
python3 examples/export_pdf.py examples/sample-report.html
# → writes examples/sample-report.pdf next to the HTML
```

Uses Playwright if available (`pip install playwright && playwright install chromium`),
otherwise falls back to the locally installed Chrome / Chromium.

## Export Word (.docx)

```bash
python3 examples/export_docx.py examples/sample-data.json
# → writes examples/sample-data.docx next to the JSON
```

Requires `python-docx` (`pip install python-docx`).

> **Build artifacts:** `.pdf` and `.docx` files are gitignored — regenerate on demand.

## Data contract

The template consumes a single dict with these top-level keys (all optional — missing keys cause the corresponding section to be skipped):

```
meta            always required
rollback_banner optional — omit or set show=false to hide
phase2          optional
phase25         optional
phase3          optional
phase4          optional — set show=false for Simple-tier lite mode
phase5          optional (includes stakeholders + questions sub-blocks)
phase6          optional
```

See `sample-data.json` for the exact shape of each block.
