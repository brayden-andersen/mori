#!/usr/bin/env python3
"""Build assets/css/dark.css, the dark theme, from the light stylesheets.

Run it after changing colours in any assets/css/*.css file:

    python3 tools/make_dark_css.py

For every rule that sets a colour, dark.css has the same rule under
html[data-theme="dark"] with the colours translated:
  - greys and white flip (light surfaces become dark grey, dark text light);
  - shadows get deeper instead of lighter;
  - accent colours become dark, intense versions of the same hue, and accent
    text becomes bright enough to read on dark surfaces;
  - white text on an accent background stays white.
Hand-tuned dark values (the aura, the base colour, a few surfaces) live in
tools/dark-overrides.css and are added at the end.
"""
import colorsys
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCES = ["mori.css", "landing.css", "onboarding.css", "home.css", "projects.css", "network.css"]
OUT = ROOT / "assets/css/dark.css"
OVERRIDES = ROOT / "tools/dark-overrides.css"
DARK = 'html[data-theme="dark"]'

COLOR = re.compile(r"\brgba?\([^()]*\)|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F-])|(?<![\w-])(?:white|black)(?![\w-])")
SHADOW_PROPS = ("box-shadow", "text-shadow")
TEXT_PROPS = ("color", "fill", "stroke", "caret-color", "-webkit-text-fill-color", "outline-color", "text-decoration-color")
MORI_RED = (184, 0, 0)


def parse(tok):
    t = tok.strip().lower()
    if t == "white":
        return (255, 255, 255), 1.0
    if t == "black":
        return (0, 0, 0), 1.0
    if t.startswith("#"):
        hx = t[1:]
        if len(hx) == 3:
            hx = "".join(c * 2 for c in hx)
        return tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4)), 1.0
    parts = [p.strip() for p in t[t.index("(") + 1:-1].split(",")]
    rgb = tuple(float(p) for p in parts[:3])
    a = float(parts[3]) if len(parts) > 3 else 1.0
    return rgb, a


def fmt(rgb, a):
    r, g, b = (max(0, min(255, round(c))) for c in rgb)
    if a >= 0.999:
        return f"#{r:02x}{g:02x}{b:02x}"
    return f"rgba({r},{g},{b},{round(a, 3):g})"


def hls(rgb):
    return colorsys.rgb_to_hls(*(c / 255 for c in rgb))


def from_hls(h, l, s):
    return tuple(c * 255 for c in colorsys.hls_to_rgb(h, max(0, min(1, l)), max(0, min(1, s))))


def is_neutral(rgb):
    h, l, s = hls(rgb)
    return s < 0.16 or l < 0.03 or l > 0.985


def flip_l(l):
    """Lightness of a grey in dark mode: surfaces go dark, ink goes light."""
    if l >= 0.9:
        return 0.105 + (1 - l) * 0.7
    if l <= 0.25:
        return 0.93 - l * 0.3
    return 0.855 - (l - 0.25) * (0.685 / 0.65)


def translate(tok, prop, white_text_ok):
    rgb, a = parse(tok)
    h, l, s = hls(rgb)
    neutral = is_neutral(rgb)
    if prop in SHADOW_PROPS:
        if neutral and l > 0.8 and a >= 0.9:  # solid light rings (around dots, avatars): the surface colour
            return fmt(from_hls(h, flip_l(l), s * 0.6), a)
        if neutral and l > 0.8:   # light highlights: a faint sheen
            return fmt((255, 255, 255), a * 0.12)
        if neutral:               # shadows: deeper
            return fmt((0, 0, 0), min(0.85, a * 2.4 + 0.08))
        return fmt(from_hls(h, 0.4, min(0.8, s * 1.05 + 0.05)), min(1, a * 1.25))
    if tuple(round(c) for c in rgb) == MORI_RED:
        return fmt((255, 92, 92) if prop in TEXT_PROPS else (226, 32, 32), a)
    if neutral:
        if prop in TEXT_PROPS and l > 0.9 and white_text_ok:
            return fmt(rgb, a)    # white text on an accent background
        return fmt(from_hls(h, flip_l(l), s * 0.6), a)
    # Accent colours: dark and intense; text stays readable.
    if prop in TEXT_PROPS:
        return fmt(from_hls(h, 0.74 if l < 0.6 else max(0.74, l), min(0.9, s * 1.05 + 0.1)), a)
    if a < 0.999:                 # tints (chip backgrounds, glows, borders)
        return fmt(from_hls(h, 0.44, min(0.82, s * 1.05 + 0.05)), min(1, a * 2.1 + 0.04))
    if l > 0.85:                  # pale accent surfaces
        return fmt(from_hls(h, 0.17, min(0.5, s)), a)
    return fmt(from_hls(h, max(0.26, min(0.42, l * 0.68)), min(0.82, s * 1.05 + 0.05)), a)


def split_selector(sel):
    parts, depth, cur = [], 0, ""
    for ch in sel:
        depth += ch == "("
        depth -= ch == ")"
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    return parts + [cur]


def dark_selector(sel):
    out = []
    for part in split_selector(sel):
        p = part.strip()
        if not p or "::view-transition" in p:
            continue
        if p == ":root":
            out.append(DARK)
        elif p.startswith("html"):
            out.append(DARK + p[4:])
        else:
            out.append(DARK + " " + p)
    return ", ".join(out)


def split_decls(body):
    decls, depth, cur = [], 0, ""
    for ch in body:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == ";" and depth == 0:
            decls.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        decls.append(cur)
    return decls


def rule_to_dark(sel, body):
    decls = []
    accent_bg = any(
        d.split(":", 1)[0].strip().startswith("background") and any(not is_neutral(parse(t)[0]) for t in COLOR.findall(d.split(":", 1)[1]) if t.lower() not in ("white", "black"))
        or any(v in d for v in ("var(--a1", "var(--c1", "var(--accent", "var(--progress-orange", "var(--mori-red", "var(--brand-grad", "var(--c)"))
        for d in split_decls(body) if ":" in d
    )
    for d in split_decls(body):
        if ":" not in d:
            continue
        prop, val = d.split(":", 1)
        prop = prop.strip()
        if prop.startswith("--") and not COLOR.search(val):
            continue
        if not COLOR.search(val) or "url(" in val:
            continue
        base = prop.lower()
        ctx = "box-shadow" if base.startswith("--") and "shadow" in base else base
        if base.startswith("--") and not ctx.endswith("shadow"):
            ctx = "color" if base in ("--ink", "--ink-2", "--muted", "--subtle", "--accent") else "background"
        if "drop-shadow" in val:
            ctx = "box-shadow"
        new = COLOR.sub(lambda m: translate(m.group(0), ctx, accent_bg), val)
        decls.append(f"{prop}:{new.strip()}")
    if not decls:
        return ""
    ds = dark_selector(sel)
    return f"{ds}{{ {'; '.join(decls)} }}\n" if ds else ""


def walk(css):
    """Yield dark rules, keeping @media / @supports wrappers; skip @keyframes."""
    out = []
    i = 0
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    n = len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            break
        head = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == "{":
                depth += 1
            elif css[k] == "}":
                depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        if head.startswith("@media") or head.startswith("@supports"):
            inner = walk(body)
            if inner.strip():
                out.append(f"{head}{{\n{inner}}}\n")
        elif head.startswith("@"):
            pass  # @keyframes, @view-transition, @font-face…
        else:
            out.append(rule_to_dark(head, body))
        i = k
    return "".join(out)


def main():
    parts = ["/* Dark theme: generated by tools/make_dark_css.py from the light stylesheets. Don't edit by hand. */\n",
             f"{DARK}{{ color-scheme: dark }}\n"]
    for name in SOURCES:
        parts.append(f"\n/* ---- {name} ---- */\n")
        parts.append(walk((ROOT / "assets/css" / name).read_text()))
    parts.append("\n/* ---- hand-tuned (tools/dark-overrides.css) ---- */\n")
    parts.append(OVERRIDES.read_text())
    OUT.write_text("".join(parts))
    print("wrote", OUT.relative_to(ROOT), f"({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
