"""Collect the English phrases written in the site's scripts: plain strings, and the text between
tags in template literals, where an inserted value becomes {1}, {2}… (a number in the text becomes
{#} later, when phrases are merged). Catches messages the crawler can't easily reach (errors,
confirmations, toasts). Output: tools/i18n/js_strings.json.

Run: python3 tools/i18n/scan_js.py
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
FILES = [p for p in sorted((ROOT / "assets/js").glob("*.js")) if p.name not in ("i18n.js", "config.js")]
# Inserted values that are numbers (a count, a length, a percentage, a rung) become {#}, so a
# short pattern like "{#} page" can only ever match a number, never a sentence that ends in "page".
NUMERIC_EXPR = re.compile(r"(\.length|\b(count|\w+Count|pct|total|done|rung|next|ticked|leads|late|soon|n|m|h|d|unread|requests|messages)\b|\bmin\[\d\]|Math\.\w+)\s*([-+*/]\s*[\w.]+\s*)?$|^\s*\w+\s*[-+]\s*\d+\s*$")
MARKUP_EXPR = re.compile(r"^\s*(icon|avatar|Mori\.ui\.sampleTag|sampleTag|panel|emptyState|row|switchHTML|segHTML|googleG|brandMark|linkButtons|factPills|shareBtn|safetyBtns|blocksHTML|list|render|\w+HTML|\w+\.map|\w+\.join|\(|`)")


def parse(src):
    """Yield ('s', text) for plain strings and ('t', parts) for template literals (parts: str or ('x', expr))."""
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            j = src.find("\n", i)
            i = n if j < 0 else j
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in "\"'":
            j = i + 1
            buf = []
            while j < n and src[j] != c:
                if src[j] == "\\" and j + 1 < n:
                    buf.append(src[j:j + 2]); j += 2; continue
                if src[j] == "\n":
                    break
                buf.append(src[j]); j += 1
            yield ("s", "".join(buf))
            i = j + 1
            continue
        if c == "`":
            parts, j = template(src, i + 1)
            yield ("t", parts)
            i = j
            continue
        i += 1


def template(src, i):
    """Read a template literal from just after its backtick; returns (parts, index after the closing backtick)."""
    parts, buf, n = [], [], len(src)
    while i < n:
        c = src[i]
        if c == "\\" and i + 1 < n:
            buf.append(src[i + 1]); i += 2; continue
        if c == "`":
            if buf: parts.append("".join(buf))
            return parts, i + 1
        if c == "$" and i + 1 < n and src[i + 1] == "{":
            if buf: parts.append("".join(buf)); buf = []
            depth, j = 1, i + 2
            while j < n and depth:
                ch = src[j]
                if ch == "`":
                    _, j = template(src, j + 1); continue
                if ch in "\"'":
                    q = ch; j += 1
                    while j < n and src[j] != q:
                        j += 2 if src[j] == "\\" else 1
                    j += 1; continue
                if ch == "{": depth += 1
                elif ch == "}": depth -= 1
                j += 1
            parts.append(("x", src[i + 2:j - 1]))
            i = j
            continue
        buf.append(c); i += 1
    return parts, n


CODEY = re.compile(r"[{}<>=;#\[\]\\]|\.js\b|\.html|\bdata-|^[\w.-]+$|^\s*$|https?:|px\b|rgba?\(|var\(--|\.svg|\$\{")
def is_phrase(s):
    s = s.strip()
    if len(s) < 2 or not re.search(r"[A-Za-z]{2}", s) or CODEY.search(s):
        return False
    if " " not in s and not re.match(r"^[A-Z][a-z]+[.!?]?$", s):  # single words: only capitalised ones (labels)
        return False
    if re.match(r"^[a-z]+(\.[a-z]+)+$", s):  # dotted keys
        return False
    return True


found = {}
def add(text, where):
    t = re.sub(r"\s+", " ", text).strip()
    if is_phrase(t) or re.search(r"\{(?:\d|#)\}", t):
        found.setdefault(t, set()).add(where)

def scan(src, name, depth=0):
    for kind, val in parse(src):
        if kind == "s":
            if is_phrase(val):
                add(val.replace("\\n", " ").replace("\\'", "'").replace('\\"', '"'), name)
            continue
        # Strings and templates inside ${…} (a row("Label", "Help text", …) call) are phrases too.
        if depth < 6:
            for part in val:
                if isinstance(part, tuple):
                    scan(part[1], name, depth + 1)
        template_phrases(val, name)


def template_phrases(val, name):
        # Template literal: rebuild the text with markup boundaries, then cut it at tags.
        text, k = "", 0
        for part in val:
            if isinstance(part, tuple):
                expr = part[1]
                if MARKUP_EXPR.match(expr) or "?" in expr and "`" in expr:
                    text += "<x>"  # inserts markup (or a choice of markup): a boundary
                elif NUMERIC_EXPR.search(expr):
                    text += "{#}"  # a count, a percentage, a rung: a number
                else:
                    k += 1
                    text += "{%d}" % k
            else:
                text += part
        for seg in re.split(r"<[^>]*>", text):
            seg = seg.strip()
            if not seg or not re.search(r"[A-Za-z]{2}", seg):
                continue
            # renumber the slots in this piece from 1
            slots = re.findall(r"\{(\d+)\}", seg)
            mapping = {}
            for s_ in slots:
                if s_ not in mapping:
                    mapping[s_] = str(len(mapping) + 1)
            seg2 = re.sub(r"\{(\d+)\}", lambda m: "{%s}" % mapping[m.group(1)], seg)
            if re.fullmatch(r"(\{(?:\d|#)\}\s*[·:,.\-–/%+]?\s*)+", seg2):
                continue  # nothing but values
            if CODEY.search(re.sub(r"\{(?:\d|#)\}", "", seg2)) and not re.search(r"[A-Za-z]{3,}\s+[A-Za-z]{2,}", seg2):
                continue
            add(seg2, name)


for f in FILES:
    scan(f.read_text(), f.name)

out = {k: sorted(v) for k, v in sorted(found.items())}
(ROOT / "tools/i18n/js_strings.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
print("phrases:", len(out), "with values:", sum(1 for k in out if re.search(r"\{\d\}", k)))
