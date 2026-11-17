#!/usr/bin/env python3
"""Exporta os cartões atuais do CM8 Resumos para pacotes Anki organizados por tema.

Fonte imutável de conteúdo: data/flashcards.json.
Não altera perguntas, respostas, cenários, IDs ou metadados originais.
"""
import hashlib
import html
import json
import re
import sqlite3
import tempfile
import unicodedata
import zipfile
from collections import Counter
from pathlib import Path

import genanki

SOURCE = Path("data/flashcards.json")
DEST = Path("artifacts")
MASTER_NAME = "CM8_1206_Flashcards_31_Temas.apkg"
ZIP_NAME = "CM8_31_Temas_APKG_Individualizados.zip"

MODEL = genanki.Model(
    1721206120,
    "CM8 Resumos • Básico com contexto",
    fields=[
        {"name": "ID"},
        {"name": "Tema"},
        {"name": "Nivel"},
        {"name": "Prioridade"},
        {"name": "Pergunta"},
        {"name": "Resposta"},
        {"name": "Contexto"},
        {"name": "Fonte"},
    ],
    templates=[{
        "name": "Pergunta e resposta",
        "qfmt": '<div class="context">{{#Contexto}}<p class="kicker">CASO CLÍNICO</p>'
                '<div class="scenario">{{Contexto}}</div>{{/Contexto}}</div>'
                '<div class="question">{{Pergunta}}</div>',
        "afmt": '{{FrontSide}}<hr id="answer"><div class="answer">{{Resposta}}</div>'
                '<div class="foot">{{Tema}} • {{Nivel}} • {{ID}}</div>'
                '{{#Fonte}}<div class="source">Fonte declarada: {{Fonte}}</div>{{/Fonte}}',
    }],
    css="""
.card {font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       font-size: 19px; line-height: 1.55; text-align: left; color: #17212b;
       background: #ffffff; padding: 18px 24px; overflow-wrap: anywhere;}
.nightMode.card {color: #e9eef4; background: #14181e;}
.question {font-size: 1.12em; font-weight: 600; margin: 14px 0;}
.answer {margin: 18px 0; white-space: normal;}
.kicker {font-size: .68em; font-weight: 800; letter-spacing: .08em; color: #586779; margin: 0 0 8px;}
.scenario {padding: 12px 16px; border-left: 3px solid #697e94; background: rgba(127,127,127,.08);
           border-radius: 5px; font-size: .95em; font-weight: 400;}
.foot {font-size: .68em; opacity: .62; margin-top: 22px;}
.source {font-size: .63em; opacity: .7; overflow-wrap: anywhere; margin-top: 6px;}
hr#answer {border: none; border-top: 1px solid #9995; margin: 20px 0;}
"""
)

def to_html(value):
    return html.escape(str(value if value is not None else ""), quote=False).replace("\n", "<br>")

def slug(text):
    s = unicodedata.normalize("NFKD", text)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")
    return s[:72]

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def audit_apkg(path, wanted):
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, f"ZIP inválido: {path}"
        assert "collection.anki2" in archive.namelist(), f"Arquivo sem coleção: {path}"
        assert "media" in archive.namelist(), f"Arquivo sem mapa de mídia: {path}"
        with tempfile.TemporaryDirectory() as tmp:
            db = Path(tmp) / "collection.anki2"
            db.write_bytes(archive.read("collection.anki2"))
            connection = sqlite3.connect(str(db))
            try:
                got_cards = connection.execute("select count(*) from cards").fetchone()[0]
                got_notes = connection.execute("select count(*) from notes").fetchone()[0]
                uniq_guid = connection.execute("select count(distinct guid) from notes").fetchone()[0]
                assert got_cards == wanted, (path, "cartões", got_cards, wanted)
                assert got_notes == wanted, (path, "notas", got_notes, wanted)
                assert uniq_guid == wanted, (path, "GUIDs", uniq_guid, wanted)
            finally:
                connection.close()

def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    themes = data["themes"]
    cards = data["cards"]
    assert len(themes) == 31, f"Esperados 31 temas; encontrados {len(themes)}"
    assert len(cards) == 1206, f"Esperados 1206 cartões; encontrados {len(cards)}"
    ids = [str(c["id"]) for c in cards]
    assert len(set(ids)) == len(ids), "IDs duplicados na fonte"
    theme_map = {int(t["id"]): t for t in themes}
    assert len(theme_map) == 31
    assert all(int(c["topic"]) in theme_map for c in cards)
    assert all(c.get("question") and c.get("answer") for c in cards)
    assert sum(c.get("kind") == "case" for c in cards) == 240
    assert all(c.get("scenario") for c in cards if c.get("kind") == "case")

    DEST.mkdir(exist_ok=True)
    individual = DEST / "temas"
    individual.mkdir(exist_ok=True)
    count_by_theme = Counter(int(c["topic"]) for c in cards)
    decks = {}
    for t in themes:
        topic = int(t["id"])
        deck_name = f'CM8 Resumos::{topic:02d} - {t["title"]}'
        decks[topic] = genanki.Deck(1750000000 + topic, deck_name)

    for c in cards:
        t = theme_map[int(c["topic"])]
        c_id = str(c["id"])
        audit = c.get("audit") or {}
        taglist = ["CM8", f'tema_{int(c["topic"]):02d}', f'nivel_{c["level"]}']
        if c.get("kind") == "case":
            taglist.append("caso_clinico")
        if c.get("priority") in ("P0", "P1", "P2"):
            taglist.append(c["priority"])
        note = genanki.Note(
            model=MODEL,
            guid=genanki.guid_for("cm8resumos", c_id),
            fields=[
                to_html(c_id),
                to_html(t["title"]),
                to_html("Caso clínico" if c.get("kind") == "case" else f'Nível {c["level"]}'),
                to_html(c.get("priority") or ""),
                to_html(c["question"]),
                to_html(c["answer"]),
                to_html(c.get("scenario") or ""),
                to_html(audit.get("fonte") or ""),
            ],
            tags=taglist,
        )
        decks[int(c["topic"])].add_note(note)

    manifest = {
        "repository": "https://github.com/ptk3emd/cm8resumos",
        "source": "data/flashcards.json",
        "source_sha256": sha256(SOURCE),
        "total_cards": len(cards),
        "total_themes": len(themes),
        "clinical_cases": 240,
        "has_schedule": False,
        "note_type": "Básico com contexto (1 nota = 1 cartão)",
        "themes": [],
    }

    for t in themes:
        topic = int(t["id"])
        file = individual / f'{topic:02d}_{slug(t["title"])}.apkg'
        genanki.Package(decks[topic]).write_to_file(str(file))
        audit_apkg(file, count_by_theme[topic])
        manifest["themes"].append({
            "id": topic,
            "title": t["title"],
            "cards": count_by_theme[topic],
            "deck_name": decks[topic].name,
            "file": file.name,
            "sha256": sha256(file),
        })

    combined = DEST / MASTER_NAME
    genanki.Package([decks[int(t["id"])] for t in themes]).write_to_file(str(combined))
    audit_apkg(combined, 1206)
    # A tabela de baralhos no pacote contém os 31 temas, além do baralho padrão do Anki.
    with zipfile.ZipFile(combined) as archive, tempfile.TemporaryDirectory() as tmp:
        db = Path(tmp) / "col.anki2"
        db.write_bytes(archive.read("collection.anki2"))
        with sqlite3.connect(str(db)) as con:
            decks_json = json.loads(con.execute("select decks from col").fetchone()[0])
            actual = [d["name"] for d in decks_json.values() if d["name"].startswith("CM8 Resumos::")]
            assert len(actual) == 31, (len(actual), actual)
    manifest["master"] = {"file": MASTER_NAME, "sha256": sha256(combined)}
    mf = DEST / "MANIFESTO.json"
    mf.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    zpath = DEST / ZIP_NAME
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED, compresslevel=7) as bundle:
        bundle.write(mf, "MANIFESTO.json")
        for f in sorted(individual.glob("*.apkg")):
            bundle.write(f, f"temas/{f.name}")
    with zipfile.ZipFile(zpath) as check:
        assert check.testzip() is None
        assert len([n for n in check.namelist() if n.endswith(".apkg")]) == 31
    print("Exportação validada: 1206 flashcards, 31 subbaralhos, 240 casos.")
    for t in manifest["themes"]:
        print(f'{t["id"]:02d} · {t["cards"]:3d} · {t["title"]}')
    print(f"Pacote principal: {combined} ({combined.stat().st_size} bytes)")
    print(f"Pacotes individuais: {zpath} ({zpath.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
