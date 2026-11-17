"""Merge the crawled phrases (strings.json) and the script phrases (js_strings.json) into one list of
English phrases to translate (phrases.json): numbers become {#}, names and code are left out.
Writes the phrases the dictionary can't translate yet to todo.json: a phrase counts as covered when
translations.json has it, or when the site's engine (assets/js/i18n.js) would translate it anyway
through a pattern ("Welcome, {1}") or by its parts ("A · B"); this script copies those rules.

Run: python3 tools/i18n/merge.py
"""
import json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
NUM = re.compile(r"\d+(?:[.,]\d+)*")

def load(name):
    p = HERE / name
    return json.loads(p.read_text()) if p.exists() else {}

crawl, js = load("strings.json"), load("js_strings.json")
translations = load("translations.json")

# Names in the sample data, sample firms and the brand stay as they are.
sample = (ROOT / "assets/js/sample.js").read_text() + (ROOT / "assets/js/data.js").read_text()
names = set(re.findall(r'name: "([^"]+)"', sample)) | {"SandBox", "Sandbox", "MORI", "Mori", "SandBox by MORI Group", "Google", "LinkedIn",
    "Nadia Pratiwi", "Eka Putri", "WarungPay", "Warung Pay", "Kebun Data", "Sawah Data", "Studio Sampel", "Sampel Accounting", "Sampel Law Office",
    "Sampel Tax Advisory", "Kantor Notaris Sampel & Rekan", "SandBox • {1}", "SandBox • {1}{2}", "X (Twitter)", "GitHub", "Instagram", "WhatsApp"}
first_names = {n.split()[0] for n in names if " " in n}
NOISE = re.compile(r"^(use strict|[\w-]+(, ?[.#\w-]+)+|[.#][\w-]+.*|\(.*:.*\)|.*\)\..*\(.*|assets/.*|, body|.*\.webp|[a-z]+ \(\w+\)"
                   r"|M\{#\} .*|translate\(.*|mailto:.*|modal-.*|noopener noreferrer|duplicate key .*|id, owner_id.*|\{1\}, updated_at"
                   r"|\{1\}/\{2\}\{3\}\.jpg|.*/ span .*|[\w.-]+\.(com|id|org)(/.*)?|localhost|[A-Z]{2,3}|dbt)$")

def key_of(s):
    s = re.sub(r"\s+", " ", s).strip()
    # numbers become {#}; value slots ({1}, {2}…) stay as they are
    return "".join(part if re.fullmatch(r"\{\d\}", part) else NUM.sub("{#}", part) for part in re.split(r"(\{\d\})", s))

def is_name(k):
    if k in names or re.fullmatch(r"[A-Z][a-z]+ [A-Z]\.", k):
        return True
    return bool(re.fullmatch(r"[A-Z][a-z]+( [A-Z][a-z]+)?", k)) and (k in first_names or any(k in n for n in names))

phrases = {}
for src, where in list(crawl.items()) + list(js.items()):
    k = key_of(src)
    if not re.search(r"[A-Za-z]{2}", k) or is_name(k) or NOISE.match(k):
        continue
    if re.fullmatch(r"(\{#\}|\{\d\}|[\s·:,./+\-–%()])+", k):
        continue
    phrases.setdefault(k, set()).update(where if isinstance(where, list) else [where])

# ---- the engine's rules, to see what the dictionary already covers ----
exact, digits, patterns = {}, {}, []
for en, tr in translations.items():
    if not (tr or {}).get("id"):
        continue
    if re.search(r"\{\d\}", en):
        slots = []
        def slot(m):
            slots.append(m.group(2).lstrip("\\"))  # re.escape writes "#" as "\#"
            if slots[-1] == "#":
                return r"(\d+(?:[.,]\d+)*)"
            return "(.*?)" if re.match(r"[A-Za-z]", m.group(1) or "") else "(.+?)"
        # group 1 is the character before the slot: after a letter, a value may be empty ("project{2}")
        rx = re.sub(r"(.?)\\\{(\\?#|\d)\\\}", lambda m: m.group(1) + slot(m), re.escape(en))
        fixed = re.sub(r"\{(#|\d)\}", " ", en)
        weak = len(re.findall(r"[A-Za-z]+", fixed)) <= 2 and not re.search(r"[:“”·•()…→!%]", fixed)
        patterns.append((re.compile("^" + rx + "$"), slots, weak, len(en)))
    elif "{#}" in en:
        digits[en] = True
    else:
        exact[en] = True
patterns.sort(key=lambda p: -p[3])

def fits(slots, weak, m):
    for i, s in enumerate(slots):
        if s == "#":
            continue
        v = m.group(i + 1) or ""
        if len(v) > 120 or weak and (len(v) > 32 or len(v.split(" ")) > 4 or re.search(r"[.,;:!?“”\"]", v)):
            return False
    return True

def covered(text):
    if text in exact or (NUM.search(text) and NUM.sub("{#}", text) in digits):
        return True
    for rx, slots, weak, _ in patterns:
        m = rx.match(text)
        if m and fits(slots, weak, m):
            return True
    for sep in (" · ", " • "):
        if sep in text and any(part and covered(part) for part in text.split(sep)):
            return True
    return False

out = {k: sorted(v)[:3] for k, v in sorted(phrases.items(), key=lambda kv: kv[0].lower())}
(HERE / "phrases.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
todo = {k: v for k, v in out.items() if k not in translations and not covered(k.replace("{#}", "7"))}
(HERE / "todo.json").write_text(json.dumps(todo, indent=1, ensure_ascii=False))
print(f"phrases: {len(out)}  in the dictionary: {sum(1 for k in out if k in translations)}  to do: {len(todo)}  words to do: {sum(len(k.split()) for k in todo)}")
