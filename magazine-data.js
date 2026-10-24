/*
  MAGAZINE DATA: the only file you edit to publish a new edition.

  1. Turn the PDF into page images:  python tools/pdf-to-pages.py "Edition 01.pdf" edition-01
     (this makes assets/magazine/edition-01/1.jpg, 2.jpg, 3.jpg ... and prints the entry to paste below)
  2. Paste a new { ... } entry at the TOP of the list (newest first).

  - id:     short name used in the link (magazine-viewer.html?issue=edition-01)
  - title:  shown under the cover, e.g. "Edition 01"
  - date:   shown under the title, e.g. "November 2026"
  - folder: folder inside assets/magazine/ that holds the page images
  - pages:  how many page images there are (1.jpg ... N.jpg)
  - ext:    image type, "jpg" by default
  - pdf:    optional, path to the PDF so readers can download it, e.g. "assets/magazine/edition-01/edition-01.pdf"

  Delete the "sample" entry when you publish your first real edition.
*/
window.MAGAZINES = [
  { id: "sample", title: "Sample Edition", date: "Delete me when you publish", folder: "sample", pages: 8, ext: "svg" }
];
