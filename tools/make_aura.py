#!/usr/bin/env python3
"""Render the site's background aura to images (assets/img/aura-*.webp).

The aura is the original release-5 background: a grey hue at the top left, the
MORI red at the bottom right, two large soft layers (a 120px blur in CSS) and
three faint orbs. Browsers draw it in 8 bits per channel; Chrome dithers soft
gradients, Safari doesn't, so on Safari the faint dark-mode red fades in
visible steps. Here it's computed with floating-point maths, exactly as the
CSS defines it, and dithered to 8 bits, so it's smooth in every browser.

    python3 tools/make_aura.py            # needs numpy and Pillow

Change a colour below and run it again to rebuild all four images.
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "img")

# The release-5 aura, exactly as its CSS defined it (mori.css + dark-overrides.css).
THEMES = {
    "light": dict(
        bg=(0xEF, 0xEF, 0xF0),
        top=(120, 120, 128, .15), top2=(120, 120, 128, .11),
        red=(184, 0, 0, .15), red2=(184, 0, 0, .13), redsoft=(184, 0, 0, .07),
        orbtop=(120, 120, 128, .08), orbred=(184, 0, 0, .11), orbmid=(155, 121, 234, .06),
        soft=(.7, .6),  # opacity of the two soft (blurred) layers
    ),
    "dark": dict(
        bg=(0x11, 0x11, 0x13),
        # The soft layers' colours are a touch fainter than the CSS said (top-2 .04 → .032,
        # red-2 .13 → .1235): Chrome blurs these very faint layers at 8-bit precision and
        # loses a little brightness, and this matches what Chrome showed (within ~1 level).
        top=(236, 236, 242, .055), top2=(236, 236, 242, .032),
        red=(200, 0, 0, .17), red2=(200, 0, 0, .1235), redsoft=(184, 0, 0, .075),
        orbtop=(236, 236, 242, .03), orbred=(200, 0, 0, .085), orbmid=(110, 40, 150, .08),
        soft=(.85, .85),
    ),
}
# Each image is drawn for a typical screen in CSS pixels, at `scale` pixels per CSS pixel.
SHAPES = {
    "wide": dict(w=1600, h=1000, scale=1.5, blur=120),  # desktops and laptops (16:10): 2400 × 1500
    "tall": dict(w=430, h=932, scale=2, blur=72),       # phones in portrait (72px blur up to 640px wide): 860 × 1864
}


def rgba(c):
    r, g, b, a = c
    return np.array([r, g, b], np.float64) / 255.0, float(a)


def over(dst, color, alpha):
    """Source-over: dst (premultiplied, opaque) ← a layer of one colour with per-pixel alpha."""
    return dst * (1 - alpha[..., None]) + color[None, None, :] * alpha[..., None]


def fade(t, a, stop):
    """A colour at 0 fading to transparent at `stop` (premultiplied interpolation: only alpha changes)."""
    return a * np.clip(1 - t / stop, 0, 1)


def gaussian_blur(img, sigma):
    """Separable Gaussian blur (sigma in pixels) with zero padding, via FFT."""
    pad = int(np.ceil(3.5 * sigma))
    img = np.pad(img, ((pad, pad), (pad, pad), (0, 0)))
    for axis in (0, 1):
        n = img.shape[axis]
        x = np.arange(n) - n // 2
        k = np.exp(-0.5 * (x / sigma) ** 2)
        k = np.fft.ifftshift(k / k.sum())
        K = np.fft.rfft(k)
        f = np.fft.rfft(img, axis=axis)
        f *= K.reshape([-1 if i == axis else 1 for i in range(3)])
        img = np.fft.irfft(f, n=n, axis=axis)
    return img[pad:-pad, pad:-pad]


def soft_layer(W, H, blur, t, step=2.0):
    """The ::before / ::after layer (premultiplied RGBA), blurred, sampled every `step` CSS px.
    Box: inset -28% (1.56 W × 1.56 H), border-radius 50% (an ellipse), two circle gradients."""
    bw, bh = 1.56 * W, 1.56 * H
    nx, ny = int(np.ceil(bw / step)), int(np.ceil(bh / step))
    x = (np.arange(nx) + .5) * step
    y = (np.arange(ny) + .5) * step
    X, Y = np.meshgrid(x, y)
    layer = np.zeros((ny, nx, 4))
    # radial-gradient(circle at 72% 72%, red-2, transparent 60%) — farthest corner is (0, 0)
    c, a = rgba(t["red2"])
    R = np.hypot(.72 * bw, .72 * bh)
    al = fade(np.hypot(X - .72 * bw, Y - .72 * bh) / R, a, .60)
    layer[..., :3] = c * al[..., None]
    layer[..., 3] = al
    # radial-gradient(circle at 30% 40%, top-2, transparent 60%) — farthest corner is (100%, 100%), drawn on top
    c, a = rgba(t["top2"])
    R = np.hypot(.70 * bw, .60 * bh)
    al = fade(np.hypot(X - .30 * bw, Y - .40 * bh) / R, a, .60)
    layer[..., :3] = layer[..., :3] * (1 - al[..., None]) + c * al[..., None]
    layer[..., 3] = layer[..., 3] * (1 - al) + al
    # border-radius: 50% clips to the inscribed ellipse (anti-aliased edge)
    e = np.hypot((X - bw / 2) / (bw / 2), (Y - bh / 2) / (bh / 2))
    edge = np.clip((1 - e) * (min(bw, bh) / 2) / step + .5, 0, 1)
    layer *= edge[..., None]
    layer = gaussian_blur(layer, blur / step)
    return layer, -.28 * W, -.28 * H  # and where the box starts, in CSS px


def render(theme, shape):
    t, s = THEMES[theme], SHAPES[shape]
    W, H, k = s["w"], s["h"], s["scale"]
    pw, ph = int(round(W * k)), int(round(H * k))
    px = (np.arange(pw) + .5) / k  # pixel centres in CSS px
    py = (np.arange(ph) + .5) / k
    X, Y = np.meshgrid(px, py)
    img = np.ones((ph, pw, 3)) * (np.array(t["bg"], np.float64) / 255.0)

    # .aura's own background (bottom to top): soft red from below, the red, the grey
    for key, (cx, cy), (rx, ry), stop in (
        ("redsoft", (.50, 1.10), (900, 1000), .64),
        ("red", (.82, .78), (1300, 900), .62),
        ("top", (.18, .22), (1300, 900), .62),
    ):
        c, a = rgba(t[key])
        tt = np.hypot((X - cx * W) / rx, (Y - cy * H) / ry)
        img = over(img, c, fade(tt, a, stop))

    # ::before and ::after: the same soft layer at two opacities
    layer, ox, oy = soft_layer(W, H, s["blur"], t)
    step = 2.0
    # sample the layer at every output pixel (bilinear; the layer is extremely smooth)
    fx = (X - ox) / step - .5
    fy = (Y - oy) / step - .5
    x0 = np.clip(np.floor(fx).astype(int), 0, layer.shape[1] - 2)
    y0 = np.clip(np.floor(fy).astype(int), 0, layer.shape[0] - 2)
    wx = np.clip(fx - x0, 0, 1)[..., None]
    wy = np.clip(fy - y0, 0, 1)[..., None]
    L = (layer[y0, x0] * (1 - wx) * (1 - wy) + layer[y0, x0 + 1] * wx * (1 - wy)
         + layer[y0 + 1, x0] * (1 - wx) * wy + layer[y0 + 1, x0 + 1] * wx * wy)
    for op in t["soft"]:
        img = img * (1 - op * L[..., 3:4]) + op * L[..., :3]

    # the three orbs (radial-gradient(circle, colour, transparent 62%) in a circle)
    vmax, vh = max(W, H) / 100, H / 100
    for key, size, left, top in (
        ("orbtop", 40 * vmax, -10 * vmax, 4 * vh),
        ("orbred", 36 * vmax, W - 36 * vmax + 8 * vmax, H - 36 * vmax + 8 * vh),
        ("orbmid", 24 * vmax, .48 * W, .34 * H),
    ):
        c, a = rgba(t[key])
        R = np.sqrt(2) * size / 2
        r = np.hypot(X - (left + size / 2), Y - (top + size / 2))
        img = over(img, c, fade(r / R, a, .62))
    return img


# 8×8 ordered dither: spreads each colour between its two nearest 8-bit values
# in a fixed, fine pattern (invisible, and it compresses far better than noise).
BAYER = np.array([[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
                  [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
                  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
                  [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]]) / 64.0 + 1 / 128


def to8(img):
    h, w, _ = img.shape
    d = np.tile(BAYER, (h // 8 + 1, w // 8 + 1))[:h, :w][..., None]
    return np.clip(np.floor(img * 255 + d), 0, 255).astype(np.uint8)


if __name__ == "__main__":
    for theme in THEMES:
        for shape in SHAPES:
            img = render(theme, shape)
            path = os.path.join(OUT, f"aura-{theme}-{shape}.webp")
            Image.fromarray(to8(img), "RGB").save(path, "WEBP", lossless=True, quality=100, method=6)
            print(f"wrote {os.path.relpath(path, ROOT)} ({os.path.getsize(path) // 1024} KB)")
