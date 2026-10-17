"""BELGE işareti için PDF sayfasını PNG'ye çevirir ve vurgulanacak metnin kutularını bulur.

Kullanım: .venv/bin/python scripts/pdf_highlight.py <pdf> <sayfa> <çıktı.png> [--text "vurgu metni"]
Stdout: {"image": ..., "width": ..., "height": ..., "rects": [...], "found": bool}
"""

import argparse
import json

import pymupdf as fitz


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("page", type=int)
    ap.add_argument("out")
    ap.add_argument("--text", default=None)
    ap.add_argument("--zoom", type=float, default=2.5)
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    if not 1 <= args.page <= doc.page_count:
        raise SystemExit(f"Sayfa {args.page} yok (belge {doc.page_count} sayfa)")
    page = doc[args.page - 1]
    mat = fitz.Matrix(args.zoom, args.zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    pix.save(args.out)

    rects = []
    if args.text:
        hits = page.search_for(args.text, quads=False)
        if not hits:
            # Satır sonu tirelemesi ve fazla boşluklar yüzünden kaçabilir; boşlukları sadeleştirip tekrar dene.
            hits = page.search_for(" ".join(args.text.split()), quads=False)
        for r in hits:
            r = r * mat
            rects.append({"x": r.x0, "y": r.y0, "width": r.width, "height": r.height})

    print(json.dumps({"image": args.out, "width": pix.width, "height": pix.height, "rects": rects, "found": bool(rects)}))


if __name__ == "__main__":
    main()
