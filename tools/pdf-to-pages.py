"""
Turn a magazine PDF into page images for the website.

  pip install pymupdf
  python tools/pdf-to-pages.py "Edition 01.pdf" edition-01

Writes assets/magazine/edition-01/1.jpg, 2.jpg, ... and copies the PDF next to them,
then prints the entry to paste at the top of the list in magazine-data.js.
"""
import os
import shutil
import sys

try:
    import pymupdf as fitz  # PyMuPDF
except ImportError:
    try:
        import fitz  # older PyMuPDF
    except ImportError:
        sys.exit("Run this first:  pip install pymupdf")

if len(sys.argv) < 3:
    sys.exit('Usage: python tools/pdf-to-pages.py "Edition 01.pdf" edition-01')

pdf, folder = sys.argv[1], sys.argv[2]
site = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(site, "assets", "magazine", folder)
os.makedirs(out, exist_ok=True)

doc = fitz.open(pdf)
for i, page in enumerate(doc, start=1):
    # ~1400px tall keeps pages sharp when zoomed without making the site slow
    zoom = 1400 / page.rect.height
    page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False).save(
        os.path.join(out, f"{i}.jpg"), jpg_quality=82)

shutil.copy(pdf, os.path.join(out, folder + ".pdf"))
print(f"Made {len(doc)} pages in {out}\n")
print("Paste this at the top of window.MAGAZINES in magazine-data.js (fix the title and date):\n")
print(f'  {{ id: "{folder}", title: "Edition", date: "Month Year", folder: "{folder}", pages: {len(doc)}, pdf: "assets/magazine/{folder}/{folder}.pdf" }},')
