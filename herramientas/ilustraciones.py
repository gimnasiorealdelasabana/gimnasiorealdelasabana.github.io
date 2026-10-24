"""Ilustraciones planas para el sitio del Colegio Gimnasio Real de la Sabana."""
import os, sys, math, random
from PIL import Image, ImageDraw, ImageFilter

OUT = r"C:\Users\DEPERAVI\notebooml\gimnasio-real-sabana-web\img"
K = 2  # supersampling

RED = (211, 24, 43); RED_D = (161, 15, 31); NAVY = (29, 58, 117); WHITE = (255, 255, 255)
YEL = (255, 196, 61); GREEN = (47, 158, 91); GREEN_L = (120, 190, 90); SKY = (58, 166, 220)
ORANGE = (242, 138, 46); PINK = (232, 87, 138); PURPLE = (122, 82, 179); CREAM = (255, 248, 239)
WOOD = (196, 140, 88); WOOD_D = (150, 100, 60); DARK = (45, 40, 55)
SKINS = [(255, 220, 177), (240, 192, 140), (222, 170, 115), (196, 135, 82), (150, 95, 55), (112, 70, 40)]
HAIRS = [(45, 30, 25), (25, 22, 22), (100, 62, 35), (150, 100, 55), (70, 45, 30)]


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


class C:
    def __init__(s, W, H, bg=WHITE):
        s.W, s.H = W, H
        s.im = Image.new("RGB", (W * K, H * K), bg)
        s.d = ImageDraw.Draw(s.im)

    def sc(s, *v):
        return [int(round(a * K)) for a in v]

    def rect(s, x0, y0, x1, y1, fill, r=0, outline=None, w=0):
        s.d.rounded_rectangle(s.sc(x0, y0, x1, y1), radius=int(r * K), fill=fill, outline=outline, width=int(w * K))

    def ell(s, cx, cy, rx, ry, fill, outline=None, w=0):
        s.d.ellipse(s.sc(cx - rx, cy - ry, cx + rx, cy + ry), fill=fill, outline=outline, width=int(w * K))

    def circ(s, cx, cy, r, fill, outline=None, w=0):
        s.ell(cx, cy, r, r, fill, outline, w)

    def poly(s, pts, fill):
        s.d.polygon([tuple(s.sc(*p)) for p in pts], fill=fill)

    def line(s, pts, fill, w, caps=True):
        s.d.line([tuple(s.sc(*p)) for p in pts], fill=fill, width=int(w * K), joint="curve")
        if caps:
            for p in (pts[0], pts[-1]):
                s.circ(p[0], p[1], w / 2, fill)

    def arc(s, cx, cy, rx, ry, a0, a1, fill, w):
        s.d.arc(s.sc(cx - rx, cy - ry, cx + rx, cy + ry), a0, a1, fill=fill, width=max(1, int(w * K)))

    def pie(s, bbox, a0, a1, fill):
        s.d.pieslice(s.sc(*bbox), a0, a1, fill=fill)

    def vgrad(s, y0, y1, c0, c1, x0=0, x1=None):
        x1 = s.W if x1 is None else x1
        for y in range(int(y0 * K), int(y1 * K)):
            t = (y - y0 * K) / max(1, (y1 - y0) * K)
            s.d.line([(x0 * K, y), (x1 * K, y)], fill=mix(c0, c1, t))

    def glow(s, cx, cy, r, color, alpha=120):
        lay = Image.new("RGBA", s.im.size, (0, 0, 0, 0))
        ImageDraw.Draw(lay).ellipse(s.sc(cx - r, cy - r, cx + r, cy + r), fill=color + (alpha,))
        lay = lay.filter(ImageFilter.GaussianBlur(r * K * 0.35))
        s.im = Image.alpha_composite(s.im.convert("RGBA"), lay).convert("RGB")
        s.d = ImageDraw.Draw(s.im)

    def save(s, name):
        s.im.resize((s.W, s.H), Image.LANCZOS).save(os.path.join(OUT, name), quality=86, optimize=True, progressive=True)
        print("ok", name)


# ---------------- personas ----------------
POSES = {"down": (0.07, 0.27), "up": (0.10, -0.28), "wave": (0.21, -0.17), "fwd": (0.19, 0.13),
         "out": (0.26, 0.02), "front": (-0.07, 0.21), "hold": (0.02, 0.17), "high": (0.15, -0.24)}


def person(c, x, y, h, skin, hair, style="short", top=RED, bottom=NAVY, arms=("down", "down"),
           skirt=False, collar=True, shoes=DARK, legs=None):
    """Dibuja una persona con los pies en (x, y) y altura h. Devuelve posiciones de manos y cabeza."""
    hr = h * 0.15
    hcy = y - h + hr
    ttop = hcy + hr * 0.92
    th = h * 0.33
    tw = h * 0.27
    hip = ttop + th
    lw = h * 0.085
    legc = legs or (bottom if not skirt else (245, 245, 245))
    for dx in (-tw * 0.22, tw * 0.22):
        c.line([(x + dx, hip - 4), (x + dx, y - h * 0.035)], legc, lw)
        c.ell(x + dx + h * 0.018, y - h * 0.025, h * 0.058, h * 0.028, shoes)
    if skirt:
        c.poly([(x - tw * 0.5, hip - h * 0.03), (x + tw * 0.5, hip - h * 0.03), (x + tw * 0.68, hip + h * 0.13), (x - tw * 0.68, hip + h * 0.13)], bottom)
    else:
        c.rect(x - tw * 0.47, hip - h * 0.05, x + tw * 0.47, hip + h * 0.05, bottom, r=h * 0.03)
    # long hair behind
    if style in ("long", "pigtails_long"):
        c.ell(x, hcy + hr * 0.55, hr * 1.12, hr * 1.25, hair)
    hands = {}
    sh = ttop + h * 0.055
    aw = h * 0.072
    later = []
    for side, pose in ((-1, arms[0]), (1, arms[1])):
        v = POSES[pose] if isinstance(pose, str) else pose
        sx = x + side * tw * 0.40
        ex, ey = sx + side * v[0] * h, sh + v[1] * h
        hands["L" if side < 0 else "R"] = (ex, ey)
        (later if v[0] < 0.05 else []).append((sx, ex, ey))
        if v[0] >= 0.05:
            c.line([(sx, sh), (ex, ey)], top, aw)
            c.circ(ex, ey, h * 0.042, skin)
    c.rect(x - tw / 2, ttop, x + tw / 2, hip + h * 0.01, top, r=h * 0.08)
    for sx, ex, ey in later:  # brazos hacia el frente, encima del torso
        c.line([(sx, sh), (ex, ey)], mix(top, (0, 0, 0), .12), aw)
        c.circ(ex, ey, h * 0.042, skin)
    if collar:
        c.poly([(x - h * 0.05, ttop + 1), (x + h * 0.05, ttop + 1), (x, ttop + h * 0.06)], WHITE)
    c.rect(x - h * 0.03, ttop - h * 0.03, x + h * 0.03, ttop + h * 0.02, skin)
    # head
    c.circ(x, hcy, hr, skin)
    cap = (x - hr * 1.08, hcy - hr * 1.25, x + hr * 1.08, hcy + hr * 0.95)
    if style == "curly":
        for a in range(190, 360, 28):
            r = math.radians(a)
            c.circ(x + math.cos(r) * hr * 0.95, hcy - hr * 0.1 + math.sin(r) * hr * 0.95, hr * 0.38, hair)
        c.pie(cap, 180, 360, hair)
    elif style == "bald":
        pass
    else:
        c.pie(cap, 180, 360, hair)
    if style in ("pigtails", "pigtails_long"):
        for sd in (-1, 1):
            c.circ(x + sd * hr * 1.12, hcy - hr * 0.05, hr * 0.38, hair)
            c.circ(x + sd * hr * 0.95, hcy - hr * 0.35, hr * 0.12, RED)
    if style == "bun":
        c.circ(x, hcy - hr * 1.15, hr * 0.42, hair)
    if style == "long":
        c.rect(x - hr * 1.1, hcy - hr * 0.2, x - hr * 0.78, hcy + hr * 1.1, hair, r=hr * 0.2)
        c.rect(x + hr * 0.78, hcy - hr * 0.2, x + hr * 1.1, hcy + hr * 1.1, hair, r=hr * 0.2)
    # face
    eye = mix(DARK, (0, 0, 0), .3)
    for sd in (-1, 1):
        c.circ(x + sd * hr * 0.36, hcy + hr * 0.14, hr * 0.095, eye)
        c.ell(x + sd * hr * 0.58, hcy + hr * 0.42, hr * 0.15, hr * 0.09, mix(skin, PINK, .35))
    c.arc(x, hcy + hr * 0.36, hr * 0.3, hr * 0.22, 20, 160, mix(DARK, RED_D, .4), hr * 0.08)
    hands["head"] = (x, hcy, hr)
    return hands


def kid(c, x, y, h, i, **kw):
    """Niño con uniforme; i elige piel/cabello/estilo de forma variada."""
    styles = ["short", "pigtails", "curly", "long", "short", "bun", "pigtails_long", "short"]
    st = kw.pop("style", styles[i % len(styles)])
    girl = st in ("pigtails", "long", "bun", "pigtails_long")
    kw.setdefault("skirt", girl and i % 3 != 0)
    return person(c, x, y, h, SKINS[(i * 2 + 1) % len(SKINS)], HAIRS[i % len(HAIRS)], st, **kw)


def adult(c, x, y, h, i, top, bottom=(70, 80, 105), **kw):
    styles = ["short", "long", "bun", "short", "curly"]
    return person(c, x, y, h, SKINS[(i * 3) % len(SKINS)], HAIRS[(i + 2) % len(HAIRS)], kw.pop("style", styles[i % 5]),
                  top=top, bottom=bottom, collar=False, **kw)


# ---------------- escenarios ----------------
def outdoor(c, horizon, sun=(0.82, 0.18)):
    c.vgrad(0, horizon, (150, 207, 240), (226, 243, 252))
    sx, sy = c.W * sun[0], c.H * sun[1]
    c.glow(sx, sy, c.W * 0.09, (255, 230, 140), 150)
    c.circ(sx, sy, c.W * 0.045, (255, 214, 90))
    random.seed(3)
    for cx, cy, s in ((0.18, 0.12, 1), (0.5, 0.08, .8), (0.66, 0.2, .6)):
        cloud(c, c.W * cx, c.H * cy, c.W * 0.05 * s)
    # montañas de la Sabana
    c.poly([(0, horizon), (0, horizon - c.H * .13), (c.W * .2, horizon - c.H * .2), (c.W * .42, horizon - c.H * .1),
            (c.W * .62, horizon - c.H * .22), (c.W * .85, horizon - c.H * .12), (c.W, horizon - c.H * .17), (c.W, horizon)], (150, 185, 200))
    c.poly([(0, horizon), (0, horizon - c.H * .07), (c.W * .3, horizon - c.H * .12), (c.W * .55, horizon - c.H * .05),
            (c.W * .8, horizon - c.H * .1), (c.W, horizon - c.H * .06), (c.W, horizon)], (120, 170, 140))
    c.vgrad(horizon, c.H, (150, 205, 110), (95, 170, 85))


def cloud(c, x, y, r):
    for dx, dy, k in ((-1.1, .2, .7), (0, 0, 1), (1.1, .15, .75), (.5, .35, .7), (-.5, .35, .7)):
        c.circ(x + dx * r, y + dy * r, r * k, WHITE)


def tree(c, x, y, h):
    c.line([(x, y), (x, y - h * .55)], (140, 100, 70), h * .05)
    for dx, dy, r in ((0, -.75, .2), (-.12, -.6, .16), (.12, -.62, .17), (0, -.92, .14)):
        c.circ(x + dx * h, y + dy * h, r * h, (95, 150, 115))


def indoor(c, wall=(253, 240, 222), floor_y=None):
    floor_y = floor_y or c.H * .74
    c.vgrad(0, floor_y, wall, mix(wall, WHITE, .3))
    c.vgrad(floor_y, c.H, (214, 170, 120), (190, 145, 98))
    for i in range(0, c.W, 90):
        c.line([(i, floor_y), (i - 60, c.H)], (180, 135, 90), 2, caps=False)
    return floor_y


def window(c, x0, y0, x1, y1):
    c.rect(x0 - 10, y0 - 10, x1 + 10, y1 + 10, WHITE, r=14)
    c.vgrad(y0, y1, (160, 210, 240), (225, 243, 252), x0, x1)
    hy = y0 + (y1 - y0) * .7
    c.poly([(x0, y1), (x0, hy), ((x0 + x1) / 2, hy - (y1 - y0) * .15), (x1, hy), (x1, y1)], (130, 185, 120))
    c.circ(x1 - (x1 - x0) * .2, y0 + (y1 - y0) * .25, (x1 - x0) * .07, (255, 214, 90))
    c.line([((x0 + x1) / 2, y0), ((x0 + x1) / 2, y1)], WHITE, 8, caps=False)
    c.line([(x0, (y0 + y1) / 2), (x1, (y0 + y1) / 2)], WHITE, 8, caps=False)


def garland(c, y, colors=(RED, NAVY, YEL, GREEN)):
    pts = [(x, y + 26 * math.sin(x / c.W * math.pi)) for x in range(0, c.W + 1, 20)]
    c.line(pts, (120, 100, 90), 3, caps=False)
    for i, x in enumerate(range(30, c.W, 70)):
        yy = y + 26 * math.sin(x / c.W * math.pi)
        c.poly([(x - 22, yy), (x + 22, yy), (x, yy + 44)], colors[i % len(colors)])


# ---------------- objetos ----------------
def table(c, x0, x1, y, h=170, top=WOOD):
    c.rect(x0, y, x1, y + 26, top, r=8)
    c.rect(x0 + 10, y + 22, x1 - 10, y + 40, WOOD_D, r=4)
    for lx in (x0 + 30, x1 - 50):
        c.rect(lx, y + 30, lx + 20, y + h, WOOD_D, r=4)


def pot(c, x, y, s=1, leaf=GREEN):
    c.poly([(x - 30 * s, y - 50 * s), (x + 30 * s, y - 50 * s), (x + 22 * s, y), (x - 22 * s, y)], (205, 100, 60))
    c.rect(x - 34 * s, y - 60 * s, x + 34 * s, y - 46 * s, (225, 120, 75), r=4 * s)
    c.line([(x, y - 58 * s), (x, y - 120 * s)], (70, 130, 60), 6 * s)
    for dx, dy, a in ((-1, -95, 1), (1, -110, 1), (-1, -125, .8), (1, -80, .9)):
        c.ell(x + dx * 24 * s * a, y + dy * s, 24 * s * a, 12 * s * a, leaf)


def magnifier(c, x, y, s=1, angle=-40):
    a = math.radians(angle)
    hx, hy = x + math.cos(a + math.pi) * 70 * s, y - math.sin(a + math.pi) * 70 * s
    c.line([(x, y), (hx, hy)], DARK, 14 * s)
    c.circ(x, y, 36 * s, (200, 235, 255), outline=NAVY, w=9 * s)
    c.ell(x - 10 * s, y - 10 * s, 9 * s, 5 * s, WHITE)


def notebook(c, x, y, w=150, h=100):
    c.rect(x, y, x + w, y + h, WHITE, r=6)
    c.line([(x + w / 2, y + 4), (x + w / 2, y + h - 4)], (220, 220, 230), 3, caps=False)
    c.circ(x + w * .25, y + h * .4, h * .15, YEL)
    c.line([(x + w * .58, y + h * .35), (x + w * .9, y + h * .35)], SKY, 4)
    c.line([(x + w * .58, y + h * .55), (x + w * .85, y + h * .55)], GREEN, 4)
    c.line([(x + w * .58, y + h * .75), (x + w * .8, y + h * .75)], RED, 4)


def leaf_pile(c, x, y):
    for dx, col in ((-30, (120, 180, 70)), (0, (220, 150, 50)), (30, GREEN)):
        c.ell(x + dx, y, 22, 11, col)


def blocks(c, x, y, n=5, s=60):
    cols = [RED, YEL, SKY, GREEN, ORANGE, PURPLE, NAVY]
    for i in range(n):
        off = (i % 2) * 10 - 5
        c.rect(x - s / 2 + off, y - s * (i + 1), x + s / 2 + off, y - s * i - 2, cols[i % len(cols)], r=6)


def bulb(c, x, y, s=1):
    c.glow(x, y, 70 * s, (255, 235, 120), 150)
    c.circ(x, y, 34 * s, (255, 236, 130))
    c.rect(x - 16 * s, y + 26 * s, x + 16 * s, y + 52 * s, (150, 150, 160), r=4)


def bed(c, x0, x1, y, h=90):
    c.rect(x0, y - h, x1, y, WOOD, r=8)
    c.rect(x0, y - h, x1, y - h + 22, WOOD_D, r=8)
    for i, x in enumerate(range(int(x0 + 40), int(x1 - 20), 70)):
        cx, cy = x, y - h - 18
        for dx, dy, r in ((0, 0, 28), (-18, 8, 20), (18, 8, 20), (0, -14, 18)):
            c.circ(cx + dx, cy + dy, r, (90, 175, 80) if i % 2 else (125, 200, 95))


def watering_can(c, x, y, s=1, col=RED):
    c.rect(x - 40 * s, y - 60 * s, x + 30 * s, y, col, r=12 * s)
    c.line([(x + 25 * s, y - 20 * s), (x + 80 * s, y - 70 * s)], col, 12 * s)
    c.arc(x - 5 * s, y - 60 * s, 28 * s, 26 * s, 180, 360, col, 9 * s)
    for i in range(4):
        c.circ(x + (92 + i * 6) * s, y - (60 - i * 14) * s, 4 * s, (110, 190, 240))


def tank(c, x, y, s=1):
    c.rect(x - 60 * s, y - 170 * s, x + 60 * s, y, (90, 160, 210), r=20 * s)
    c.ell(x, y - 170 * s, 60 * s, 16 * s, (120, 185, 230))
    c.poly([(x, y - 120 * s), (x - 18 * s, y - 85 * s), (x + 18 * s, y - 85 * s)], WHITE)
    c.circ(x, y - 80 * s, 18 * s, WHITE)


def robot(c, x, y, s=1):
    c.rect(x - 70 * s, y - 120 * s, x + 70 * s, y - 20 * s, (150, 175, 205), r=16 * s)
    c.rect(x - 50 * s, y - 200 * s, x + 50 * s, y - 128 * s, (175, 200, 225), r=16 * s)
    c.line([(x, y - 200 * s), (x, y - 235 * s)], DARK, 6 * s)
    c.circ(x, y - 240 * s, 10 * s, RED)
    for sd in (-1, 1):
        c.circ(x + sd * 22 * s, y - 165 * s, 13 * s, WHITE)
        c.circ(x + sd * 22 * s, y - 165 * s, 6 * s, NAVY)
        c.circ(x + sd * 62 * s, y - 14 * s, 22 * s, DARK)
    c.rect(x - 35 * s, y - 95 * s, x + 35 * s, y - 55 * s, (60, 80, 110), r=8 * s)
    for i, col in enumerate((RED, YEL, GREEN)):
        c.circ(x - 18 * s + i * 18 * s, y - 75 * s, 6 * s, col)


def tablet(c, x, y, w=200, h=140):
    c.rect(x, y, x + w, y + h, DARK, r=14)
    c.rect(x + 10, y + 10, x + w - 10, y + h - 10, (240, 245, 255), r=6)
    cols = [YEL, SKY, GREEN, ORANGE, PURPLE]
    for i in range(4):
        c.rect(x + 22 + (i % 2) * 18, y + 22 + i * 26, x + 22 + (i % 2) * 18 + w * .5, y + 42 + i * 26, cols[i], r=5)


def pegboard(c, x0, y0, x1, y1):
    c.rect(x0, y0, x1, y1, (225, 205, 175), r=10)
    for xx in range(int(x0 + 20), int(x1), 30):
        for yy in range(int(y0 + 20), int(y1), 30):
            c.circ(xx, yy, 3, (200, 180, 150))
    c.line([(x0 + 60, y0 + 40), (x0 + 60, y0 + 150)], (110, 110, 120), 10)
    c.rect(x0 + 40, y0 + 30, x0 + 80, y0 + 60, RED, r=6)
    c.line([(x0 + 150, y0 + 40), (x0 + 150, y0 + 160)], ORANGE, 14)
    c.circ(x0 + 250, y0 + 90, 40, None, outline=SKY, w=10)
    c.rect(x0 + 330, y0 + 50, x0 + 400, y0 + 150, YEL, r=8)


def shelf(c, x0, y0, x1, y1, rows=4):
    c.rect(x0, y0, x1, y1, WOOD_D, r=10)
    rh = (y1 - y0) / rows
    cols = [RED, NAVY, YEL, GREEN, ORANGE, SKY, PURPLE, PINK, WHITE]
    random.seed(int(x0))
    for r in range(rows):
        yb = y0 + (r + 1) * rh - 10
        c.rect(x0 + 10, y0 + r * rh + 10, x1 - 10, yb, (120, 80, 50), r=4)
        x = x0 + 18
        while x < x1 - 40:
            w = random.randint(18, 32); hh = rh * random.uniform(.55, .8)
            c.rect(x, yb - hh, x + w, yb, random.choice(cols), r=3)
            x += w + 4


def book(c, x, y, w=120, h=90, col=RED):
    c.poly([(x - w, y), (x, y + 12), (x, y - h + 12), (x - w, y - h)], WHITE)
    c.poly([(x + w, y), (x, y + 12), (x, y - h + 12), (x + w, y - h)], (245, 245, 250))
    c.line([(x - w, y), (x, y + 12), (x + w, y)], col, 8)


def easel(c, x, y, h=380):
    c.line([(x - 90, y), (x, y - h)], WOOD_D, 12)
    c.line([(x + 90, y), (x, y - h)], WOOD_D, 12)
    c.line([(x, y - h * .9), (x, y)], WOOD_D, 10)
    c.rect(x - 120, y - h * .88, x + 120, y - h * .35, WHITE, r=6)
    cx0, cy0, cx1, cy1 = x - 110, y - h * .86, x + 110, y - h * .37
    c.vgrad(cy0, cy1, (175, 220, 245), (230, 245, 252), cx0, cx1)
    c.poly([(cx0, cy1), (cx0, cy1 - 60), (x - 20, cy1 - 100), (cx1, cy1 - 50), (cx1, cy1)], (110, 185, 100))
    c.circ(x + 60, cy0 + 40, 22, YEL)
    for i, col in enumerate((RED, PINK, ORANGE)):
        c.circ(x - 70 + i * 30, cy1 - 40, 10, col)
    c.rect(x - 130, y - h * .36, x + 130, y - h * .33, WOOD_D, r=4)


def drum(c, x, y, s=1):
    c.rect(x - 70 * s, y - 90 * s, x + 70 * s, y, RED, r=10 * s)
    c.ell(x, y - 90 * s, 70 * s, 20 * s, (250, 240, 225))
    for i in range(5):
        xx = x - 60 * s + i * 30 * s
        c.line([(xx, y - 80 * s), (xx + 15 * s, y - 8 * s)], YEL, 5 * s)
    c.rect(x - 72 * s, y - 12 * s, x + 72 * s, y, NAVY, r=4)


def xylophone(c, x, y, s=1):
    cols = [RED, ORANGE, YEL, GREEN, SKY, NAVY, PURPLE]
    for i, col in enumerate(cols):
        h = (110 - i * 10) * s
        c.rect(x + i * 26 * s, y - h / 2 - 40 * s, x + i * 26 * s + 20 * s, y + h / 2 - 40 * s, col, r=5)
    c.line([(x - 10 * s, y - 70 * s), (x + 190 * s, y - 55 * s)], WOOD_D, 6 * s, caps=False)
    c.line([(x - 10 * s, y - 10 * s), (x + 190 * s, y - 25 * s)], WOOD_D, 6 * s, caps=False)


def palette(c, x, y, s=1):
    c.ell(x, y, 60 * s, 42 * s, (240, 210, 160))
    for i, col in enumerate((RED, YEL, SKY, GREEN, PURPLE)):
        a = math.radians(200 + i * 35)
        c.circ(x + math.cos(a) * 35 * s, y + math.sin(a) * 22 * s, 10 * s, col)


def cone(c, x, y, s=1):
    c.poly([(x - 30 * s, y), (x + 30 * s, y), (x, y - 70 * s)], ORANGE)
    c.rect(x - 38 * s, y - 8 * s, x + 38 * s, y + 4 * s, ORANGE, r=4)
    c.poly([(x - 16 * s, y - 34 * s), (x + 16 * s, y - 34 * s), (x + 10 * s, y - 48 * s), (x - 10 * s, y - 48 * s)], WHITE)


def ball(c, x, y, r=36):
    c.circ(x, y, r, WHITE, outline=DARK, w=3)
    c.poly([(x, y - r * .45), (x + r * .42, y - r * .12), (x + r * .27, y + r * .38), (x - r * .27, y + r * .38), (x - r * .42, y - r * .12)], DARK)


def school(c, x0, y_base, w, h):
    c.rect(x0, y_base - h, x0 + w, y_base, (250, 236, 215), r=6)
    c.poly([(x0 - 30, y_base - h), (x0 + w / 2, y_base - h - h * .45), (x0 + w + 30, y_base - h)], RED_D)
    for i in range(4):
        wx = x0 + 40 + i * (w - 80) / 3.6
        c.rect(wx, y_base - h * .78, wx + w * .13, y_base - h * .42, (165, 210, 240), r=6)
        c.line([(wx + w * .065, y_base - h * .78), (wx + w * .065, y_base - h * .42)], WHITE, 5, caps=False)
    c.rect(x0 + w * .44, y_base - h * .45, x0 + w * .56, y_base, NAVY, r=10)
    c.circ(x0 + w * .5, y_base - h - h * .2, h * .08, WHITE)


def flag(c, x, y_base, h=320):
    c.line([(x, y_base), (x, y_base - h)], (200, 200, 210), 10)
    c.circ(x, y_base - h - 8, 10, YEL)
    fx0, fy0, fw, fh = x + 5, y_base - h + 10, 190, 120
    pts_top = [(fx0 + t, fy0 + 10 * math.sin(t / fw * 2 * math.pi)) for t in range(0, fw + 1, 10)]
    pts_bot = [(fx0 + t, fy0 + fh + 10 * math.sin(t / fw * 2 * math.pi)) for t in range(fw, -1, -10)]
    c.poly(pts_top + pts_bot, RED)
    sx, sy = fx0 + fw / 2, fy0 + fh / 2
    c.poly([(sx - 28, sy - 34), (sx + 28, sy - 34), (sx + 28, sy + 6), (sx, sy + 34), (sx - 28, sy + 6)], WHITE)
    c.poly([(sx - 22, sy - 28), (sx + 22, sy - 28), (sx + 22, sy + 4), (sx, sy + 26), (sx - 22, sy + 4)], RED)


def diploma(c, x, y, s=1):
    c.rect(x - 50 * s, y - 36 * s, x + 50 * s, y + 36 * s, WHITE, r=6, outline=YEL, w=4 * s)
    c.line([(x - 30 * s, y - 12 * s), (x + 30 * s, y - 12 * s)], NAVY, 4 * s)
    c.line([(x - 22 * s, y + 4 * s), (x + 22 * s, y + 4 * s)], (180, 180, 190), 3 * s)
    c.circ(x + 30 * s, y + 22 * s, 11 * s, RED)


def medal(c, x, y, s=1):
    c.poly([(x - 14 * s, y - 50 * s), (x - 2 * s, y - 50 * s), (x + 4 * s, y - 10 * s), (x - 8 * s, y - 10 * s)], RED)
    c.poly([(x + 14 * s, y - 50 * s), (x + 2 * s, y - 50 * s), (x - 4 * s, y - 10 * s), (x + 8 * s, y - 10 * s)], NAVY)
    c.circ(x, y + 6 * s, 20 * s, YEL, outline=(230, 160, 30), w=4 * s)


def balloon(c, x, y, col, s=1):
    c.line([(x, y + 50 * s), (x + 8 * s, y + 170 * s)], (150, 150, 150), 2, caps=False)
    c.ell(x, y, 38 * s, 48 * s, col)
    c.ell(x - 12 * s, y - 16 * s, 8 * s, 12 * s, mix(col, WHITE, .5))


def heart(c, x, y, r, col):
    c.circ(x - r * .5, y, r * .55, col); c.circ(x + r * .5, y, r * .55, col)
    c.poly([(x - r * 1.03, y + r * .12), (x + r * 1.03, y + r * .12), (x, y + r * 1.2)], col)


def sparkles(c, pts, col=YEL):
    for x, y, r in pts:
        c.poly([(x, y - r), (x + r * .25, y - r * .25), (x + r, y), (x + r * .25, y + r * .25), (x, y + r), (x - r * .25, y + r * .25), (x - r, y), (x - r * .25, y - r * .25)], col)


# =================== ESCENAS ===================
def hero():
    c = C(1600, 1100)
    outdoor(c, 600, sun=(.72, .16))
    tree(c, 1450, 640, 420); tree(c, 180, 630, 360)
    garland(c, 0)
    c.ell(820, 1030, 560, 40, (110, 170, 85))
    for i, (x, arms) in enumerate(((560, ("down", "fwd")), (760, ("fwd", "up")), (990, ("front", "fwd")), (1200, ("wave", "down")))):
        h = kid(c, x, 1000, 430, i + 1, arms=arms)
        if i == 1:
            sparkles(c, [(h["R"][0] + 30, h["R"][1] - 40, 18)])
    table(c, 450, 1300, 760, 260)
    pot(c, 660, 760, .75)
    notebook(c, 720, 700, 170, 58)
    magnifier(c, 1090, 738, .75, angle=10)
    leaf_pile(c, 1150, 745)
    c.rect(890, 700, 940, 760, (200, 230, 245), r=8); c.line([(915, 745), (915, 712)], GREEN, 5); c.ell(905, 712, 12, 6, GREEN_L)
    h = kid(c, 330, 1060, 400, 0, arms=("down", "high"))
    magnifier(c, h["R"][0] + 10, h["R"][1] - 40, .9, angle=-60)
    kid(c, 1360, 1070, 330, 5, arms=("up", "up"))
    sparkles(c, [(1320, 560, 14), (300, 520, 12), (1100, 480, 10)])
    c.save("hero.jpg")


def quienes():
    c = C(1200, 900)
    outdoor(c, 520, sun=(.15, .15))
    school(c, 520, 560, 560, 230)
    flag(c, 420, 600, 360)
    garland(c, 0)
    kids = [(170, 3), (290, 4), (930, 6), (1050, 7)]
    for x, i in kids:
        kid(c, x, 760, 280, i, arms=("front", "front"))
        sparkles(c, [(x, 440, 10)], WHITE)
    adult(c, 620, 870, 470, 1, top=NAVY, arms=("down", "fwd"))
    k1 = kid(c, 470, 880, 330, 1, arms=("hold", "high"))
    medal(c, k1["R"][0] + 4, k1["R"][1] - 20)
    k2 = kid(c, 790, 880, 330, 2, arms=("front", "front"))
    diploma(c, 790, k2["R"][1] - 6, 1.1)
    sparkles(c, [(470, 470, 18), (800, 470, 16), (640, 330, 12)])
    c.save("quienes-somos.jpg")


def preescolar():
    c = C(1200, 900)
    fy = indoor(c, (255, 238, 225))
    window(c, 720, 90, 1100, 380)
    garland(c, 10)
    c.rect(80, 120, 420, 330, WHITE, r=14)
    for i, col in enumerate((RED, YEL, SKY, GREEN)):
        c.circ(140 + i * 80, 200, 28, col)
    for i, col in enumerate((ORANGE, PURPLE, PINK)):
        c.rect(150 + i * 80, 255, 200 + i * 80, 300, col, r=8)
    c.ell(600, 830, 520, 50, (225, 120, 110))
    c.ell(600, 830, 440, 38, (245, 160, 140))
    blocks(c, 330, 820, 5, 54)
    kid(c, 470, 860, 280, 1, arms=("fwd", "up"))
    kid(c, 720, 870, 300, 2, arms=("front", "wave"))
    adult(c, 960, 880, 420, 4, top=(46, 140, 120), arms=("fwd", "down"))
    for i, (x, col) in enumerate(((600, RED), (640, YEL), (560, SKY))):
        c.rect(x - 20, 840 - i * 6, x + 20, 870 - i * 6, col, r=6)
    c.circ(250, 850, 26, ORANGE); c.circ(860, 860, 20, GREEN)
    sparkles(c, [(330, 470, 14), (520, 520, 10)])
    c.save("preescolar.jpg")


def primaria():
    c = C(1200, 900)
    fy = indoor(c, (232, 240, 252))
    window(c, 80, 90, 420, 360)
    c.rect(700, 90, 1120, 340, WHITE, r=14)
    c.d.text(tuple(c.sc(730, 110)), "", fill=NAVY)
    for i in range(5):
        c.circ(760 + i * 80, 200 + 30 * math.sin(i), 18, SKY)
    c.poly([(760, 300), (860, 240), (980, 280), (1080, 230), (1080, 320), (760, 320)], (110, 185, 120))
    for i, x in enumerate((300, 520, 760, 960)):
        kid(c, x, 860, 360, i + 3, arms=(("fwd", "up"), ("front", "fwd"), ("fwd", "front"), ("down", "high"))[i])
    table(c, 180, 1080, 640, 260)
    bulb(c, 640, 560)
    c.line([(560, 640), (520, 610), (600, 600), (640, 612)], RED, 6, caps=False)
    c.line([(720, 640), (760, 610), (700, 600), (640, 612)], NAVY, 6, caps=False)
    c.rect(480, 610, 560, 648, (60, 60, 70), r=6)
    c.rect(520, 600, 540, 612, (200, 200, 210))
    notebook(c, 820, 600, 150, 46)
    c.rect(260, 610, 380, 650, (255, 230, 150), r=6)
    sparkles(c, [(980, 400, 14), (300, 420, 10)])
    c.save("primaria.jpg")


def huerta(name="huerta.jpg", W=1200, H=900):
    c = C(W, H)
    outdoor(c, H * .5, sun=(.2, .16))
    tree(c, W * .9, H * .55, 380)
    tank(c, W * .82, H * .7, 1.1)
    bed(c, W * .08, W * .92, H * .97, 120)
    kids = [(W * .28, ("down", "fwd")), (W * .5, ("front", "front")), (W * .72, ("fwd", "wave"))]
    for i, (x, arms) in enumerate(kids):
        h = kid(c, x, H * .86, 340, i + 2, arms=arms, shoes=(240, 200, 40))
        if i == 0:
            watering_can(c, h["R"][0] + 20, h["R"][1] + 30, .8)
    bed(c, -20, W + 20, H + 40, 110)
    c.circ(W * .5 + 2, H * .62, 1, GREEN)
    sparkles(c, [(W * .5, H * .3, 14)], WHITE)
    c.save(name)


def maker():
    c = C(1200, 900)
    indoor(c, (236, 232, 250))
    pegboard(c, 90, 90, 600, 330)
    window(c, 760, 90, 1100, 330)
    for i, (x, arms) in enumerate(((290, ("fwd", "up")), (560, ("front", "fwd")), (900, ("fwd", "front")))):
        kid(c, x, 880, 380, i + 4, arms=arms)
    table(c, 140, 1080, 640, 260, top=(230, 200, 150))
    robot(c, 425, 645, .68)
    tablet(c, 640, 515, 170, 128)
    for i, col in enumerate((RED, YEL, SKY, GREEN)):
        c.circ(260 + i * 40, 625, 12, col)
    c.rect(330, 590, 420, 640, (210, 170, 120), r=6)
    c.line([(200, 600), (240, 640)], (120, 120, 130), 8)
    sparkles(c, [(600, 360, 16), (690, 400, 10)])
    c.save("maker.jpg")


def biblioteca():
    c = C(1200, 900)
    indoor(c, (250, 236, 220))
    shelf(c, 60, 140, 420, 680)
    shelf(c, 820, 140, 1150, 680)
    window(c, 500, 110, 740, 330)
    for x, col in ((350, RED), (520, NAVY), (700, YEL), (880, SKY)):
        c.rect(x - 90, 760, x + 90, 830, col, r=30)
    kid(c, 420, 840, 300, 6, arms=("front", "front"))
    k = kid(c, 610, 830, 330, 1, arms=("front", "front"))
    book(c, 610, k["R"][1] + 10, 90, 70, RED)
    kid(c, 800, 845, 280, 2, arms=("front", "down"))
    book(c, 420, 770, 60, 50, GREEN)
    sparkles(c, [(610, 410, 16), (560, 450, 10), (660, 440, 10)])
    c.save("biblioteca.jpg")


def arte():
    c = C(1200, 900)
    indoor(c, (255, 236, 236))
    garland(c, 0, (RED, YEL, SKY, PINK, GREEN))
    for i, col in enumerate((SKY, ORANGE, PURPLE)):
        c.rect(80 + i * 140, 120, 190 + i * 140, 220, WHITE, r=8)
        c.circ(135 + i * 140, 170, 30, col)
    easel(c, 300, 860, 520)
    k = kid(c, 480, 870, 330, 3, arms=("down", "high"))
    c.line([(k["R"][0], k["R"][1]), (k["R"][0] - 50, k["R"][1] - 40)], WOOD_D, 7)
    c.circ(k["R"][0] - 52, k["R"][1] - 42, 8, RED)
    palette(c, 160, 820, 1)
    k2 = kid(c, 760, 870, 320, 5, arms=("fwd", "fwd"))
    drum(c, 760, 870, 1)
    kid(c, 1000, 880, 300, 0, arms=("fwd", "fwd"))
    xylophone(c, 920, 830, .9)
    for x, y in ((700, 400), (840, 360), (1040, 420)):
        c.circ(x, y, 10, NAVY); c.line([(x + 8, y), (x + 8, y - 50), (x + 30, y - 40)], NAVY, 5)
    c.save("arte.jpg")


def deporte():
    c = C(1200, 900)
    outdoor(c, 460, sun=(.85, .15))
    tree(c, 90, 500, 320)
    for x in (230, 520, 810, 1100):
        cone(c, x, 860, 1)
    c.line([(0, 620), (1200, 600)], WHITE, 6, caps=False)
    pants = (29, 58, 117)
    kid(c, 330, 840, 320, 1, arms=("high", (0.2, 0.05)), top=RED, bottom=pants)
    kid(c, 600, 800, 330, 2, arms=((0.2, 0.05), "high"), top=NAVY, bottom=pants, collar=False)
    kid(c, 880, 830, 310, 3, arms=("up", "up"), top=RED, bottom=pants)
    ball(c, 720, 820, 36)
    for x, y in ((470, 640), (1000, 600)):
        c.line([(x, y), (x - 40, y)], WHITE, 4)
    sparkles(c, [(880, 400, 14)], WHITE)
    c.save("deporte.jpg")


def familias():
    c = C(1200, 900)
    outdoor(c, 520, sun=(.8, .14))
    school(c, 760, 560, 400, 170)
    garland(c, 0)
    adult(c, 230, 880, 480, 0, top=SKY, arms=("down", "fwd"))
    kid(c, 360, 880, 300, 1, arms=("up", "down"))
    adult(c, 520, 880, 500, 1, top=ORANGE, arms=("fwd", "front"))
    kid(c, 700, 880, 280, 4, arms=("up", "up"))
    adult(c, 880, 880, 460, 2, top=PURPLE, arms=("down", "fwd"), style="short")
    kid(c, 1020, 880, 320, 5, arms=("up", "down"))
    pot(c, 620, 880, 1)
    for x, y, r in ((380, 330, 22), (720, 300, 28), (1060, 360, 20)):
        heart(c, x, y, r, PINK)
    c.save("familias.jpg")


def admisiones():
    c = C(1200, 900)
    outdoor(c, 600, sun=(.85, .14))
    school(c, 250, 700, 700, 340)
    for col, x in ((RED, 260), (NAVY, 320), (YEL, 950)):
        balloon(c, x, 330, col)
    adult(c, 420, 880, 480, 3, top=(46, 140, 120), arms=("down", "fwd"))
    kid(c, 560, 880, 290, 2, arms=("up", "wave"))
    adult(c, 700, 880, 500, 0, top=SKY, arms=("fwd", "down"))
    adult(c, 920, 880, 470, 1, top=RED, arms=("down", "wave"))
    sparkles(c, [(600, 520, 14), (880, 380, 12)])
    c.save("admisiones.jpg")


def noticia_inscripciones():
    c = C(1200, 800)
    outdoor(c, 520, sun=(.1, .16))
    school(c, 640, 560, 480, 200)
    for col, x, y in ((RED, 180, 220), (NAVY, 260, 260), (YEL, 1000, 230), (SKY, 1080, 280)):
        balloon(c, x, y, col)
    adult(c, 420, 790, 460, 4, top=PINK, arms=("down", (0.08, 0.1)))
    c.rect(455, 470, 500, 545, DARK, r=8); c.rect(460, 478, 495, 538, (220, 240, 255), r=4)
    kid(c, 560, 790, 270, 1, arms=("up", "down"))
    adult(c, 840, 790, 440, 2, top=NAVY, arms=("fwd", "down"))
    table(c, 620, 1120, 600, 200, top=WHITE)
    c.rect(620, 620, 1120, 700, RED, r=6)
    for i, col in enumerate((YEL, SKY, WHITE)):
        c.rect(700 + i * 110, 560, 780 + i * 110, 600, col, r=4)
    c.save("noticia-inscripciones.jpg")


def noticia_huerta():
    c = C(1200, 800)
    outdoor(c, 380, sun=(.12, .16))
    tree(c, 1100, 420, 320)
    k = kid(c, 820, 700, 470, 3, arms=("down", (0.2, 0.06)), shoes=(240, 200, 40))
    watering_can(c, k["R"][0] - 10, k["R"][1] + 40, 1.1)
    k2 = kid(c, 330, 700, 400, 6, arms=("fwd", "fwd"), shoes=(240, 200, 40))
    c.ell(600, 790, 760, 150, (110, 75, 50))
    c.ell(600, 780, 680, 120, (130, 90, 60))
    for x, s in ((470, 1), (600, 1.3), (730, 1)):
        c.line([(x, 730), (x, 730 - 110 * s)], (70, 140, 60), 10 * s)
        for dx, dy, r in ((-40, -80, 38), (40, -100, 40), (0, -125, 26)):
            c.ell(x + dx * s, 730 + dy * s, r * s, r * .5 * s, (100, 190, 85))
    sparkles(c, [(600, 520, 22), (690, 560, 12)], WHITE)
    c.save("noticia-huerta.jpg")


def noticia_reconocimientos():
    c = C(1200, 800)
    outdoor(c, 470, sun=(.86, .15))
    school(c, 120, 500, 420, 170)
    flag(c, 640, 520, 300)
    garland(c, 0, (RED, NAVY, YEL))
    for i, x in enumerate((250, 480, 720, 960)):
        k = kid(c, x, 790, 380, i + 2, arms=("front", "front") if i % 2 == 0 else ("high", "down"))
        if i % 2 == 0:
            diploma(c, x, k["R"][1] - 4, 1.1)
        else:
            medal(c, k["L"][0], k["L"][1] + 30)
    sparkles(c, [(360, 330, 16), (850, 300, 18), (600, 240, 12)])
    c.save("noticia-reconocimientos.jpg")


SCENES = {"hero": hero, "quienes": quienes, "preescolar": preescolar, "primaria": primaria, "huerta": huerta,
          "maker": maker, "biblioteca": biblioteca, "arte": arte, "deporte": deporte, "familias": familias,
          "admisiones": admisiones, "n1": noticia_inscripciones, "n2": noticia_huerta, "n3": noticia_reconocimientos}

if __name__ == "__main__":
    names = sys.argv[1:] or list(SCENES)
    for n in names:
        SCENES[n]()
