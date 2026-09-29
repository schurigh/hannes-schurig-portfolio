#!/usr/bin/env python3
"""
=============================================================================
CYBERDECK PORTFOLIO - Offline OCR & Text Extraction Cascade
=============================================================================
Extrahiert Text aus PDF, DOCX, ODT, Bildern (PNG/JPG/WEBP) und Plaintext.
Arbeitet 100% lokal, offline und ohne externe KI-APIs.
Speichert alle Ergebnisse strukturiert in data/documents_extracted.json.

Verwendung:
  python tools/extract_document.py <Dateipfad>
  python tools/extract_document.py data/files/2017_Studium.pdf
  python tools/extract_document.py --all
  python tools/extract_document.py --all --force
=============================================================================
"""

import sys
import os
import io
import re
import json
import zipfile
import argparse
import asyncio
from datetime import datetime
from pathlib import Path
import xml.etree.ElementTree as ET

# Optionale / empfohlene Bibliotheken
try:
    import pymupdf  # PyMuPDF
except ImportError:
    pymupdf = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import winocr
except ImportError:
    winocr = None

try:
    import pytesseract
except ImportError:
    pytesseract = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_JSON = PROJECT_ROOT / "data" / "documents_extracted.json"
PROFILE_JSON = PROJECT_ROOT / "data" / "profile.json"
PROJECTS_JSON = PROJECT_ROOT / "data" / "projects.json"


# =============================================================================
# 1. Textextraktion: DOCX & ODT (Reines Python, 0 Dependencies)
# =============================================================================
def extract_docx(file_path: Path) -> dict:
    """Extrahiert Text, Absätze und Tabellen aus einer .docx-Datei via zipfile."""
    text_parts = []
    with zipfile.ZipFile(file_path) as z:
        if "word/document.xml" not in z.namelist():
            raise ValueError("Ungültige DOCX-Datei: word/document.xml fehlt.")
        xml_content = z.read("word/document.xml")
        tree = ET.fromstring(xml_content)
        # Namespace für Word XML
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        
        for p in tree.iter(f"{{{ns['w']}}}p"):
            texts = [node.text for node in p.iter(f"{{{ns['w']}}}t") if node.text]
            if texts:
                text_parts.append("".join(texts))
    
    full_text = "\n\n".join(text_parts).strip()
    return {
        "method": "native_docx_xml",
        "pages": 1,
        "content": full_text,
        "char_count": len(full_text)
    }


def extract_odt(file_path: Path) -> dict:
    """Extrahiert Text aus einer .odt-Datei via zipfile."""
    text_parts = []
    with zipfile.ZipFile(file_path) as z:
        if "content.xml" not in z.namelist():
            raise ValueError("Ungültige ODT-Datei: content.xml fehlt.")
        xml_content = z.read("content.xml")
        tree = ET.fromstring(xml_content)
        for elem in tree.iter():
            if elem.tag.endswith("}p") or elem.tag.endswith("}h"):
                text = "".join(elem.itertext()).strip()
                if text:
                    text_parts.append(text)
    
    full_text = "\n\n".join(text_parts).strip()
    return {
        "method": "native_odt_xml",
        "pages": 1,
        "content": full_text,
        "char_count": len(full_text)
    }


# =============================================================================
# 2. Lokales OCR auf Bildern (winocr oder pytesseract)
# =============================================================================
async def run_ocr_on_pil_image(image, lang: str = "de") -> str:
    """Führt lokales OCR auf einem PIL Image aus (winocr ➔ Tesseract)."""
    # 1. Prio: Windows Native OCR (winocr)
    if winocr is not None:
        try:
            result = await winocr.recognize_pil(image, lang=lang)
            if result and result.text:
                return result.text.strip()
        except Exception as e:
            # Fallback auf Tesseract falls winocr fehlschlägt
            pass

    # 2. Prio: Tesseract CLI / pytesseract
    if pytesseract is not None:
        try:
            tess_lang = "deu" if lang.startswith("de") else "eng"
            text = pytesseract.image_to_string(image, lang=tess_lang)
            if text:
                return text.strip()
        except Exception:
            pass

    # 3. Keine OCR-Engine verfügbar
    if not hasattr(run_ocr_on_pil_image, "_warned"):
        run_ocr_on_pil_image._warned = True
        print("      [HINWEIS] Kein lokales OCR-Modul verfügbar.")
        print("                Windows:     'pip install winocr'")
        print("                Linux/macOS: 'sudo apt install tesseract-ocr tesseract-ocr-deu' & 'pip install pytesseract'")
    return ""


# =============================================================================
# 3. Textextraktion: PDF (Hybrid: Digitaler Text + OCR für Bildseiten)
# =============================================================================
async def extract_pdf(file_path: Path) -> dict:
    """
    Kaskadierte PDF-Extraktion:
    Liest pro Seite digitalen Text via PyMuPDF aus.
    Enthält eine Seite keinen oder nur minimalen Text (< 40 Zeichen),
    wird die Seite gerastert und per lokaler OCR (winocr / Tesseract) gelesen.
    """
    if pymupdf is None:
        raise RuntimeError("PyMuPDF ist nicht installiert. Bitte 'pip install pymupdf' ausführen.")

    doc = pymupdf.open(str(file_path))
    total_pages = len(doc)
    page_texts = []
    used_methods = set()

    for idx, page in enumerate(doc):
        page_num = idx + 1
        digital_text = page.get_text().strip()

        # Bereinige Whitespace
        digital_text = re.sub(r"\n{3,}", "\n\n", digital_text)

        # Wenn ausreichend Text vorhanden ist (> 40 Zeichen), nutze den digitalen Text
        if len(digital_text) >= 40:
            used_methods.add("pymupdf_text")
            page_texts.append(f"### [Seite {page_num}/{total_pages}]\n\n{digital_text}")
        else:
            # Scann-Seite: Rastern und lokales OCR ausführen
            print(f"      [OCR] Seite {page_num}/{total_pages} ist gescannt -> starte lokales OCR...")
            pix = page.get_pixmap(dpi=150)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            ocr_text = await run_ocr_on_pil_image(img, lang="de")
            
            if ocr_text:
                used_methods.add("local_ocr")
                page_texts.append(f"### [Seite {page_num}/{total_pages} // OCR]\n\n{ocr_text}")
            elif digital_text:
                used_methods.add("pymupdf_text")
                page_texts.append(f"### [Seite {page_num}/{total_pages}]\n\n{digital_text}")
            else:
                page_texts.append(f"### [Seite {page_num}/{total_pages}]\n\n[Kein Text erkannt]")

    full_content = "\n\n---\n\n".join(page_texts).strip()
    return {
        "method": " + ".join(sorted(used_methods)) if used_methods else "pymupdf_text",
        "pages": total_pages,
        "content": full_content,
        "char_count": len(full_content)
    }


# =============================================================================
# 4. Bild-Dateien (PNG, JPG, WEBP, TIFF, BMP)
# =============================================================================
async def extract_image(file_path: Path) -> dict:
    """Extrahiert Text aus Bilddateien via lokaler OCR."""
    if Image is None:
        raise RuntimeError("Pillow ist nicht installiert. Bitte 'pip install pillow' ausführen.")

    img = Image.open(file_path)
    ocr_text = await run_ocr_on_pil_image(img, lang="de")
    return {
        "method": "local_image_ocr",
        "pages": 1,
        "content": ocr_text,
        "char_count": len(ocr_text)
    }


# =============================================================================
# 5. Plaintext, Markdown, HTML, RTF
# =============================================================================
def extract_plaintext(file_path: Path) -> dict:
    """Liest Textdateien mit Kodierungs-Fallback ein."""
    for enc in ["utf-8", "utf-8-sig", "cp1252", "latin1"]:
        try:
            with open(file_path, "r", encoding=enc) as f:
                content = f.read()
                return {
                    "method": f"plaintext_{enc}",
                    "pages": 1,
                    "content": content.strip(),
                    "char_count": len(content.strip())
                }
        except UnicodeDecodeError:
            continue
    raise ValueError("Datei konnte mit keiner Standardkodierung gelesen werden.")


# =============================================================================
# 6. Haupt-Router für Dokumente
# =============================================================================
async def process_single_file(file_path: Path) -> dict:
    """Erkennt den Dateityp und wählt die passende Extraktionsmethode."""
    if not file_path.exists():
        raise FileNotFoundError(f"Datei existiert nicht: {file_path}")

    ext = file_path.suffix.lower()
    stat = file_path.stat()

    print(f"\n[SCAN] Verarbeite: {file_path.name} ({stat.st_size / 1024:.1f} KB, Typ: {ext})")

    if ext == ".pdf":
        res = await extract_pdf(file_path)
    elif ext in [".docx", ".docm"]:
        res = extract_docx(file_path)
    elif ext in [".odt"]:
        res = extract_odt(file_path)
    elif ext in [".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"]:
        res = await extract_image(file_path)
    elif ext in [".txt", ".md", ".markdown", ".csv", ".json", ".log"]:
        res = extract_plaintext(file_path)
    else:
        # Fallback: Versuch als Plaintext
        try:
            res = extract_plaintext(file_path)
        except Exception:
            raise ValueError(f"Nicht unterstütztes Dateiformat: {ext}")

    # Relative Pfadangabe für konsistente Speicherung im Repository
    try:
        rel_path = file_path.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        rel_path = file_path.as_posix()

    return {
        "file": rel_path,
        "filename": file_path.name,
        "file_type": ext.lstrip(".").upper(),
        "file_size_bytes": stat.st_size,
        "pages": res.get("pages", 1),
        "extracted_at": datetime.now().isoformat(),
        "extraction_method": res.get("method", "unknown"),
        "char_count": res.get("char_count", 0),
        "content": res.get("content", "")
    }


# =============================================================================
# 7. Speichern in zentrale JSON-Datenbank
# =============================================================================
def save_to_extracted_json(entry: dict, json_path: Path):
    """Fügt einen Eintrag in data/documents_extracted.json ein oder aktualisiert ihn."""
    data = {"version": "1.0", "updated_at": "", "documents": {}}
    
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = {"version": "1.0", "updated_at": "", "documents": {}}

    if "documents" not in data:
        data["documents"] = {}

    rel_key = entry["file"]
    data["documents"][rel_key] = entry
    data["updated_at"] = datetime.now().isoformat()

    json_path.parent.mkdir(parents=True, exist_ok=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  [OK] Gespeichert in: {json_path.name} -> Key: '{rel_key}' ({entry['char_count']} Zeichen, Methode: {entry['extraction_method']})")


# =============================================================================
# 8. Automatisches Auffinden aller Anhänge aus profile.json & projects.json
# =============================================================================
def find_all_referenced_attachments() -> list:
    """Findet alle Dateianhänge, die in data/profile.json und data/projects.json referenziert sind."""
    referenced = []

    def check_file(rel_path):
        if not rel_path or not isinstance(rel_path, str):
            return
        # Nur lokale Dateien im Projektverzeichnis
        if rel_path.startswith("http://") or rel_path.startswith("https://"):
            return
        p = PROJECT_ROOT / rel_path
        if p.exists() and p.is_file():
            if p not in referenced:
                referenced.append(p)

    # 1. In profile.json suchen
    if PROFILE_JSON.exists():
        try:
            with open(PROFILE_JSON, "r", encoding="utf-8") as f:
                prof = json.load(f)
                # Profil-Anhänge
                for att in prof.get("attachments", []):
                    check_file(att.get("file"))
                # Beruflicher Werdegang Anhänge
                for exp in prof.get("experience", []):
                    for att in exp.get("attachments", []):
                        check_file(att.get("file"))
        except Exception as e:
            print(f"[WARN] Fehler beim Lesen von profile.json: {e}")

    # 2. In projects.json suchen
    if PROJECTS_JSON.exists():
        try:
            with open(PROJECTS_JSON, "r", encoding="utf-8") as f:
                projs = json.load(f)
                for pr in projs:
                    for att in pr.get("attachments", []):
                        check_file(att.get("file"))
        except Exception as e:
            print(f"[WARN] Fehler beim Lesen von projects.json: {e}")

    return referenced


# =============================================================================
# 9. CLI-Einstiegspunkt
# =============================================================================
async def main():
    parser = argparse.ArgumentParser(
        description="CyberDeck Local OCR & Text Extraction Tool\n"
                    "[HINWEIS / DATENSCHUTZ] Bitte prüfe data/documents_extracted.json vor dem Upload auf sensible private Daten."
    )
    parser.add_argument("file", nargs="?", help="Pfad zu einer spezifischen Datei (z.B. data/files/zeugnis.pdf)")
    parser.add_argument("--all", action="store_true", help="Alle in profile.json & projects.json referenzierten Dateien automatisch verarbeiten")
    parser.add_argument("--force", action="store_true", help="Bereits verarbeitete Dateien erneut auslesen")
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT_JSON), help="Pfad zur Ausgabe-JSON")

    args = parser.parse_args()
    out_json = Path(args.out)

    # Liste der zu verarbeitenden Dateien
    files_to_process = []

    if args.all:
        print("[INIT] Ermittle alle referenzierten Dateianhänge aus profile.json & projects.json...")
        files_to_process = find_all_referenced_attachments()
        if not files_to_process:
            print("[INFO] Keine lokalen Dateianhänge in den JSONs gefunden.")
            return
        print(f"[INFO] {len(files_to_process)} referenzierte Datei(en) gefunden.")
    elif args.file:
        p = Path(args.file)
        if not p.is_absolute():
            p = PROJECT_ROOT / p
        files_to_process = [p]
    else:
        parser.print_help()
        print("\nBeispiele:")
        print("  python tools/extract_document.py data/files/2017_Studium.pdf")
        print("  python tools/extract_document.py --all")
        return

    # Lade bestehende Einträge für --force Check
    existing_docs = {}
    if out_json.exists() and not args.force:
        try:
            with open(out_json, "r", encoding="utf-8") as f:
                existing_docs = json.load(f).get("documents", {})
        except Exception:
            existing_docs = {}

    success_count = 0
    for target_file in files_to_process:
        try:
            rel_key = target_file.relative_to(PROJECT_ROOT).as_posix()
        except ValueError:
            rel_key = target_file.as_posix()

        if rel_key in existing_docs and not args.force:
            print(f"[SKIP] Bereits vorhanden: {target_file.name} (nutze --force zum Überschreiben)")
            continue

        try:
            entry = await process_single_file(target_file)
            save_to_extracted_json(entry, out_json)
            success_count += 1
        except Exception as e:
            print(f"  [ERROR] Fehler bei {target_file.name}: {e}")

    print(f"\n[FERTIG] {success_count} Datei(en) erfolgreich verarbeitet. Ausgabedatei: {out_json}")
    print("[HINWEIS / DATENSCHUTZ] Bitte prüfe 'data/documents_extracted.json' vor dem Upload auf sensible private Daten (z. B. Wohnanschrift, Geburtsdatum, Steuernummer) und schwärze diese bei Bedarf.\n")


if __name__ == "__main__":
    asyncio.run(main())
