"""
Generates AlgoLens flat 2D "Algorithm Focus" raster assets:
- multi-resolution favicon.ico (16x16, 32x32, 48x48)
- 180x180 apple-icon.png
- 192x192 icon-192.png & 512x512 icon-512.png
- 1200x630 Open Graph PNG social preview cards (default + route + 23 algorithms)
Requires Pillow >= 10.
"""

from __future__ import annotations

import math
import os
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "frontend" / "public"
OG_DIR = PUBLIC_DIR / "og"
ALGO_META_FILE = ROOT / "frontend" / "src" / "data" / "algorithmMeta.ts"


def load_font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    fonts_dir = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
    if mono:
        candidates = ["consolab.ttf" if bold else "consola.ttf", "courbd.ttf" if bold else "cour.ttf"]
    else:
        candidates = ["segoeuib.ttf" if bold else "segoeui.ttf", "arialbd.ttf" if bold else "arial.ttf"]

    for name in candidates:
        font_path = fonts_dir / name
        if font_path.exists():
            try:
                return ImageFont.truetype(str(font_path), size=size)
            except OSError:
                pass
    return ImageFont.load_default()


def draw_polyline(
    draw: ImageDraw.ImageDraw,
    pts: list[tuple[float, float]],
    color: tuple[int, int, int, int],
    width: int,
) -> None:
    if len(pts) < 2:
        return
    draw.line(pts, fill=color, width=width, joint="curve")
    cap_r = width * 0.48
    for x, y in (pts[0], pts[-1]):
        draw.ellipse([x - cap_r, y - cap_r, x + cap_r, y + cap_r], fill=color)


def draw_arc_with_grad(
    img: Image.Image,
    center: tuple[float, float],
    radius: float,
    start_deg: float,
    end_deg: float,
    width: float,
    c1: tuple[int, int, int, int],
    c2: tuple[int, int, int, int],
) -> None:
    mask = Image.new("L", img.size, 0)
    mdraw = ImageDraw.Draw(mask)
    cx, cy = center
    r_out = radius + width * 0.5
    mdraw.arc([cx - r_out, cy - r_out, cx + r_out, cy + r_out], start=start_deg, end=end_deg, fill=255, width=max(1, int(round(width))))

    cap_r = width * 0.46
    for deg in (start_deg, end_deg):
        rad = math.radians(deg)
        kx, ky = cx + radius * math.cos(rad), cy + radius * math.sin(rad)
        mdraw.ellipse([kx - cap_r, ky - cap_r, kx + cap_r, ky + cap_r], fill=255)

    a_rad = math.radians(start_deg)
    b_rad = math.radians(end_deg)
    p0x, p0y = cx + radius * math.cos(a_rad), cy + radius * math.sin(a_rad)
    p1x, p1y = cx + radius * math.cos(b_rad), cy + radius * math.sin(b_rad)
    dx, dy = p1x - p0x, p1y - p0y
    denom = max(1.0, dx * dx + dy * dy)

    grad_img = Image.new("RGBA", img.size, (0, 0, 0, 0))
    px = grad_img.load()
    bbox = mask.getbbox()
    if not bbox:
        return
    for y in range(bbox[1], bbox[3]):
        for x in range(bbox[0], bbox[2]):
            if mask.getpixel((x, y)) == 0:
                continue
            t = max(0.0, min(1.0, ((x - p0x) * dx + (y - p0y) * dy) / denom))
            px[x, y] = tuple(int(c1[j] * (1 - t) + c2[j] * t) for j in range(4))

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    overlay.paste(grad_img, (0, 0), mask)
    img.alpha_composite(overlay)


def render_brand_icon(size: int, squircle_backdrop: bool = False) -> Image.Image:
    """
    Renders the flat 2D Algorithm Focus mark at 4x supersampling (512px) and
    downsamples sharply with Lanczos resampling.
    """
    s = 4
    dim = 128 * s
    base = Image.new("RGBA", (dim, dim), (16, 36, 56, 255) if squircle_backdrop else (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)

    # Slight padding if rasterizing for iOS square apple-icon
    scale = 0.88 if squircle_backdrop else 1.0
    offset = (dim * (1 - scale)) * 0.5

    def tx(x: float) -> float:
        return offset + x * s * scale

    def ty(y: float) -> float:
        return offset + y * s * scale

    def tr(r: float) -> float:
        return r * s * scale

    # Outer shell
    draw.ellipse([tx(4), ty(4), tx(124), ty(124)], fill=(16, 41, 64, 255))
    draw.ellipse([tx(5.5), ty(5.5), tx(122.5), ty(122.5)], outline=(35, 81, 120, 255), width=max(1, int(round(2 * s * scale))))
    draw.ellipse([tx(17.5), ty(17.5), tx(110.5), ty(110.5)], fill=(19, 49, 76, 255), outline=(27, 68, 105, 255), width=max(1, int(round(1.5 * s * scale))))

    # Clipping mask inside r=53 shell contour
    clip_mask = Image.new("L", (dim, dim), 0)
    cm_draw = ImageDraw.Draw(clip_mask)
    cm_draw.ellipse([tx(11), ty(11), tx(117), ty(117)], fill=255)

    # Stepped sorting bars clipped inside circular contour
    bars_layer = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bars_layer)
    bars = [
        (16, 49, 10, 15, (27, 85, 133, 255)),
        (26, 42, 10, 22, (29, 103, 146, 255)),
        (36, 34, 10, 30, (21, 110, 107, 255)),
        (46, 26, 11, 38, (31, 134, 125, 255)),
        (57, 21, 11, 43, (230, 153, 52, 255)),
        (68, 16, 11, 48, (239, 154, 40, 255)),
        (79, 13, 11, 51, (132, 66, 125, 255)),
    ]
    for bx, by, bw, bh, bcol in bars:
        bdraw.rectangle([tx(bx), ty(by), tx(bx + bw), ty(by + bh)], fill=bcol)

    clipped_bars = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    clipped_bars.paste(bars_layer, (0, 0), clip_mask)
    base.alpha_composite(clipped_bars)

    # Center aperture hole
    draw = ImageDraw.Draw(base)
    draw.ellipse([tx(44), ty(44), tx(84), ty(84)], fill=(14, 34, 53, 255), outline=(30, 75, 114, 255), width=max(1, int(round(1.5 * s * scale))))

    # Network branches layer (translucent teal + violet + amber)
    net_layer = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    ndraw = ImageDraw.Draw(net_layer)

    # Boost line thickness slightly for 16px/32px crisp readability
    w_boost = 1.25 if size <= 32 else 1.0

    # Violet branch
    draw_polyline(ndraw, [(tx(44), ty(76)), (tx(58), ty(106))], (142, 72, 132, 210), max(1, int(round(4 * s * scale * w_boost))))

    # Teal network path + nodes
    teal_pts = [(tx(x), ty(y)) for x, y in ((37, 86), (55, 96), (73, 82), (89, 94), (103, 77), (93, 58))]
    draw_polyline(ndraw, teal_pts, (33, 139, 127, 200), max(1, int(round(3.5 * s * scale * w_boost))))
    draw_polyline(ndraw, [(tx(89), ty(94)), (tx(83), ty(68))], (33, 139, 127, 165), max(1, int(round(2.5 * s * scale * w_boost))))
    for nx, ny, nr, ncol in (
        (37, 86, 3.4, (44, 163, 148, 230)),
        (55, 96, 3.6, (33, 139, 127, 240)),
        (73, 82, 3.8, (54, 168, 153, 235)),
        (89, 94, 3.4, (33, 139, 127, 240)),
        (103, 77, 3.2, (54, 168, 153, 230)),
    ):
        rr = tr(nr * w_boost)
        ndraw.ellipse([tx(nx) - rr, ty(ny) - rr, tx(nx) + rr, ty(ny) + rr], fill=ncol)

    # Primary sunset amber path + nodes
    amber_pts = [(tx(x), ty(y)) for x, y in ((21, 67), (35, 68), (42, 90), (56, 93), (71, 102), (83, 81), (96, 76), (91, 61))]
    draw_polyline(ndraw, amber_pts, (238, 154, 44, 255), max(1, int(round(3.8 * s * scale * w_boost))))
    draw_polyline(ndraw, [(tx(56), ty(93)), (tx(83), ty(81))], (245, 174, 66, 185), max(1, int(round(2.8 * s * scale * w_boost))))
    for nx, ny, nr, ncol in (
        (21, 67, 4.0, (245, 174, 66, 255)),
        (35, 68, 4.2, (238, 154, 44, 255)),
        (42, 90, 3.8, (245, 174, 66, 255)),
        (56, 93, 4.2, (238, 154, 44, 255)),
        (71, 102, 3.8, (245, 174, 66, 255)),
        (83, 81, 4.2, (238, 154, 44, 255)),
        (96, 76, 3.8, (245, 174, 66, 255)),
        (91, 61, 3.6, (248, 201, 120, 255)),
    ):
        rr = tr(nr * w_boost)
        ndraw.ellipse([tx(nx) - rr, ty(ny) - rr, tx(nx) + rr, ty(ny) + rr], fill=ncol)

    clipped_net = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    clipped_net.paste(net_layer, (0, 0), clip_mask)
    base.alpha_composite(clipped_net)

    # Outer directional path loops & arrowheads
    draw_arc_with_grad(
        base,
        (tx(64), ty(64)),
        tr(46),
        start_deg=-48,
        end_deg=48,
        width=3.8 * s * scale * w_boost,
        c1=(142, 72, 132, 255),
        c2=(234, 143, 50, 255),
    )
    draw_arc_with_grad(
        base,
        (tx(64), ty(64)),
        tr(48),
        start_deg=56,
        end_deg=135,
        width=3.6 * s * scale * w_boost,
        c1=(238, 154, 44, 255),
        c2=(154, 77, 134, 255),
    )

    draw = ImageDraw.Draw(base)
    draw.polygon([(tx(89), ty(100)), (tx(100), ty(96)), (tx(94), ty(107))], fill=(234, 143, 50, 255))
    draw.polygon([(tx(34), ty(92)), (tx(25), ty(96)), (tx(34), ty(104))], fill=(154, 77, 134, 255))

    return base.resize((size, size), Image.Resampling.LANCZOS)


def parse_algorithms_from_ts() -> list[dict[str, str]]:
    text = ALGO_META_FILE.read_text(encoding="utf-8")
    entries: list[dict[str, str]] = []
    for m in re.finditer(r"\{[^{}]*?id:\s*\"([^\"]+)\"[^{}]*?\}", text, flags=re.DOTALL):
        block = m.group(0)

        def extract(field: str, default: str = "") -> str:
            fm = re.search(rf"{field}:\s*\"([^\"]*)\"", block)
            return fm.group(1) if fm else default

        entries.append(
            {
                "id": extract("id"),
                "name": extract("name"),
                "category": extract("category", "DSA"),
                "difficulty": extract("difficulty", "Medium"),
                "time": extract("timeComplexity", "O(n)"),
                "space": extract("spaceComplexity", "O(1)"),
                "description": extract("description"),
            }
        )
    return entries


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur: list[str] = []
    for word in words:
        candidate = " ".join([*cur, word])
        if draw.textlength(candidate, font=font) <= max_width or not cur:
            cur.append(word)
        else:
            lines.append(" ".join(cur))
            cur = [word]
    if cur:
        lines.append(" ".join(cur))
    return lines[:3]


def render_og_card(
    out_path: Path,
    title: str,
    subtitle: str,
    badge_text: str,
    metrics: list[str],
) -> None:
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), (14, 34, 53, 255))
    draw = ImageDraw.Draw(img)

    # Subtle architectural engineering grid (flat 2D)
    grid_color = (30, 75, 114, 95)
    for gx in range(48, W, 64):
        draw.line([(gx, 0), (gx, H)], fill=grid_color, width=1)
    for gy in range(48, H, 64):
        draw.line([(0, gy), (W, gy)], fill=grid_color, width=1)

    # Outer bezel border
    draw.rounded_rectangle([(28, 28), (W - 28, H - 28)], radius=24, outline=(35, 81, 120, 220), width=2)

    # Brand lockup top-left
    mark = render_brand_icon(74, squircle_backdrop=False)
    img.paste(mark, (68, 60), mark)

    font_brand = load_font(38, bold=True)
    font_brand_sub = load_font(17, bold=False)
    font_tag = load_font(20, bold=True, mono=True)
    font_title = load_font(54, bold=True)
    font_sub = load_font(26, bold=False)
    font_pill = load_font(22, bold=True, mono=True)
    font_foot = load_font(20, bold=False)

    algo_w = draw.textlength("Algo", font=font_brand)
    draw.text((158, 66), "Algo", font=font_brand, fill=(244, 245, 247, 255))
    draw.text((158 + algo_w, 66), "Lens", font=font_brand, fill=(238, 154, 44, 255))
    draw.text((160, 112), "Interactive DSA Platform", font=font_brand_sub, fill=(152, 166, 184, 255))

    # Category / Mode badge top-right
    pill_w = int(draw.textlength(badge_text, font=font_tag)) + 36
    draw.rounded_rectangle(
        [(W - 68 - pill_w, 72), (W - 68, 118)],
        radius=23,
        fill=(19, 49, 76, 255),
        outline=(33, 139, 127, 230),
        width=2,
    )
    draw.text((W - 68 - pill_w + 18, 83), badge_text, font=font_tag, fill=(140, 222, 210, 255))

    # Main Title & Description
    title_lines = wrap_text(draw, title, font_title, W - 470)
    ty = 192
    for line in title_lines[:2]:
        draw.text((68, ty), line, font=font_title, fill=(244, 245, 247, 255))
        ty += 68

    sub_lines = wrap_text(draw, subtitle, font_sub, W - 470)
    sy = ty + 18
    for line in sub_lines[:3]:
        draw.text((68, sy), line, font=font_sub, fill=(168, 184, 202, 255))
        sy += 38

    # Flat stepped chart graphic bottom-right matching Algorithm Focus colors
    card_x0, card_y0, card_x1, card_y1 = 835, 178, 1132, 470
    draw.rounded_rectangle(
        [(card_x0, card_y0), (card_x1, card_y1)],
        radius=18,
        fill=(16, 41, 64, 255),
        outline=(35, 81, 120, 220),
        width=2,
    )
    bar_heights = [48, 74, 102, 128, 152, 174, 192]
    bar_colors = [
        (27, 85, 133, 255),
        (29, 103, 146, 255),
        (21, 110, 107, 255),
        (31, 134, 125, 255),
        (230, 153, 52, 255),
        (239, 154, 40, 255),
        (132, 66, 125, 255),
    ]
    bx = card_x0 + 28
    for bh, bcol in zip(bar_heights, bar_colors):
        draw.rectangle([(bx, card_y1 - 42 - bh), (bx + 28, card_y1 - 42)], fill=bcol)
        bx += 35
    draw.text((card_x0 + 26, card_y0 + 18), "STEP EXECUTION VIEW", font=load_font(16, bold=True, mono=True), fill=(245, 174, 66, 240))

    # Complexity / Feature pills bottom-left
    px_cur = 68
    for metric in metrics:
        mw = int(draw.textlength(metric, font=font_pill)) + 34
        draw.rounded_rectangle(
            [(px_cur, 502), (px_cur + mw, 548)],
            radius=12,
            fill=(19, 49, 76, 255),
            outline=(238, 154, 44, 190),
            width=2,
        )
        draw.text((px_cur + 17, 513), metric, font=font_pill, fill=(248, 226, 188, 255))
        px_cur += mw + 16

    draw.text(
        (W - 418, 515),
        "Visualize. Understand. Master.",
        font=font_foot,
        fill=(152, 166, 184, 230),
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, format="PNG", optimize=True)


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    OG_DIR.mkdir(parents=True, exist_ok=True)

    # Remove superseded prism asset files cleanly
    for stale in ("apple-touch-icon.png", "site.webmanifest", "favicon.svg", "icons.svg"):
        stale_path = PUBLIC_DIR / stale
        if stale_path.exists():
            stale_path.unlink()

    # 1. App Icons & Multi-size Favicon
    render_brand_icon(512, squircle_backdrop=False).save(PUBLIC_DIR / "icon-512.png", format="PNG", optimize=True)
    render_brand_icon(192, squircle_backdrop=False).save(PUBLIC_DIR / "icon-192.png", format="PNG", optimize=True)
    render_brand_icon(180, squircle_backdrop=True).save(PUBLIC_DIR / "apple-icon.png", format="PNG", optimize=True)

    # Multi-resolution favicon.ico (16x16, 32x32, 48x48) generated separately per target DPI for maximum sharpness
    ico_48 = render_brand_icon(48, squircle_backdrop=False)
    ico_32 = render_brand_icon(32, squircle_backdrop=False)
    ico_16 = render_brand_icon(16, squircle_backdrop=False)
    ico_48.save(
        PUBLIC_DIR / "favicon.ico",
        format="ICO",
        append_images=[ico_32, ico_16],
        sizes=[(48, 48), (32, 32), (16, 16)],
    )

    # 2. Default & Route Open Graph PNGs (1200x630)
    algos = parse_algorithms_from_ts()
    algo_count = len(algos)

    render_og_card(
        PUBLIC_DIR / "og-image.png",
        title="See Algorithms Think in Real-Time",
        subtitle="Step-by-step DSA visualizer, Java JDI debugger traces, Big-O race arena, and Gemini Socratic tutoring.",
        badge_text="DSA PLATFORM",
        metrics=[f"{algo_count} Visualizers", "Java JDI Trace", "Big-O Benchmarks"],
    )

    static_route_cards = [
        ("explore", "Algorithm Explorer", f"Browse {algo_count} interactive algorithms across Arrays, Trees, Graphs, Sorting, Recursion, and DP.", "CATALOG", [f"{algo_count} Algorithms", "Arrays & Trees", "Interactive Steps"]),
        ("playground", "Multi-Language Sandbox & JDI Tracer", "Compile and step through live OpenJDK JDI traces or run Python, C++, Java, and JS code.", "JDI DEBUGGER", ["OpenJDK JDI", "Call Stack Frames", "Variable State"]),
        ("race", "Algorithm Big-O Race", "Compare sorting and searching algorithms side-by-side on identical datasets to measure real work.", "COMPARISON", ["Comparisons", "Swaps & Writes", "Space Depth"]),
        ("builder", "Interactive Graph Builder", "Construct custom weighted graphs and visualize BFS, DFS, and Dijkstra shortest paths live.", "GRAPH LAB", ["BFS", "DFS", "Dijkstra"]),
    ]
    for slug, title, desc, badge, metrics in static_route_cards:
        render_og_card(OG_DIR / f"{slug}.png", title=title, subtitle=desc, badge_text=badge, metrics=metrics)

    # 3. Per-Algorithm Open Graph Cards (1200x630)
    for alg in algos:
        render_og_card(
            OG_DIR / f"{alg['id']}.png",
            title=f"{alg['name']} Visualizer",
            subtitle=alg["description"],
            badge_text=f"{alg['category'].upper()} • {alg['difficulty'].upper()}",
            metrics=[f"Time: {alg['time']}", f"Space: {alg['space']}", "Live Stepping"],
        )

    print(f"Generated Algorithm Focus icons and {len(static_route_cards) + len(algos) + 1} Open Graph PNG cards successfully.")


if __name__ == "__main__":
    main()
