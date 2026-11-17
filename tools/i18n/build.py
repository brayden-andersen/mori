"""Build the dictionaries the site loads (assets/i18n/id.js, assets/i18n/zh.js) from
tools/i18n/translations.json: { "English phrase": { "id": "…", "zh": "…" }, … }.

Placeholders: {#} is a number, {1}, {2}… a value (a name, a title). Each translation keeps the
same placeholders. Numbers fill in the order they appear; values can move. A value that is only an
English word ending ("project{2}" → "projects") can be dropped by writing it as {2=}. A phrase
whose translation is missing or blank is left out, and shows in English.

Run: python3 tools/i18n/build.py
"""
import json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
data = json.loads((HERE / "translations.json").read_text())
problems = []
for lang in ("id", "zh"):
    out = {}
    for en, tr in data.items():
        t = (tr or {}).get(lang, "")
        if not t or not t.strip():
            continue
        dropped = re.findall(r"\{(\d)=\}", t)
        t = re.sub(r"\{\d=\}", "", t)
        # The same placeholders on both sides, or the phrase would come out wrong.
        want = sorted(x for x in re.findall(r"\{(#|\d)\}", en) if x not in dropped)
        if want != sorted(re.findall(r"\{(#|\d)\}", t)):
            problems.append(f"{lang}: placeholders differ: {en!r} → {t!r}")
            continue
        out[en] = t
    body = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    (ROOT / "assets/i18n").mkdir(exist_ok=True)
    (ROOT / f"assets/i18n/{lang}.js").write_text(
        "/* Built by tools/i18n/build.py from tools/i18n/translations.json. Don't edit by hand. */\n"
        f"window.MORI_I18N = window.MORI_I18N || {{}};\nwindow.MORI_I18N.{lang} = {body};\n")
    print(f"{lang}: {len(out)} phrases, {len(body) // 1024} KB")
if problems:
    print("\n".join(problems))
    sys.exit(1)
