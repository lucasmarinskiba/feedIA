#!/usr/bin/env python3
"""
generate_image.py — Genera una imagen de slide para carrusel de Instagram.

Soporta dos modelos:
  - gpt-image-2   (openai/gpt-image-2 via fal.ai): renderiza texto en la imagen nativamente.
  - nano-banana-2 (fal-ai/nano-banana-2): también renderiza texto nativamente via prompt.

En ambos casos el modelo genera TODO: fondo + texto. No se añade texto con Pillow encima.
Pillow solo se usa como fallback total si el API falla.

Uso:
  python generate_image.py \
    --slide-num 1 --total 9 \
    --title "El 87% lo hace mal." \
    --body "Y ni siquiera lo sabe." \
    --prompt "[ESCENA]...[ELEMENTOS]...[ESTILO]...[CONSTRAINTS]..." \
    --model gpt-image-2 \
    --output-dir "./slides/"
"""

import os
import sys
import argparse
import textwrap
import urllib.request
from io import BytesIO
from pathlib import Path
from typing import Optional

# ──────────────────────────────────────────────
#  Constantes de diseño (paleta IA Masters Academy)
# ──────────────────────────────────────────────
CANVAS_W, CANVAS_H = 1080, 1350

COLOR_BG      = (15, 10, 18)
COLOR_ACCENT  = (91, 33, 182)
COLOR_ACCENT2 = (124, 58, 237)
COLOR_LILA    = (237, 233, 254)
COLOR_WHITE   = (255, 255, 255)
COLOR_SUBTEXT = (210, 200, 240)

FAL_MODEL_GPT  = "openai/gpt-image-2"
FAL_MODEL_NANO = "fal-ai/nano-banana-2"


# ──────────────────────────────────────────────
#  Generación con gpt-image-2
# ──────────────────────────────────────────────
def generate_gpt_image2(prompt: str) -> tuple:
    """
    Llama a openai/gpt-image-2 via fal.ai.
    Devuelve (img_bytes, fal_url) — url es None si falla.
    """
    fal_key = os.environ.get('FAL_KEY')
    if not fal_key:
        print("  ⚠️  FAL_KEY no encontrada.", file=sys.stderr)
        return None, None

    try:
        import fal_client
        os.environ['FAL_KEY'] = fal_key

        result = fal_client.run(
            FAL_MODEL_GPT,
            arguments={
                "prompt": prompt,
                "image_size": {"width": 1024, "height": 1280},
                "quality": "high",
                "num_images": 1,
                "output_format": "png",
            }
        )

        image_url = result['images'][0]['url']
        req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read(), image_url

    except ImportError:
        print("  ⚠️  fal-client no instalado.", file=sys.stderr)
        return None, None
    except Exception as e:
        print(f"  ⚠️  gpt-image-2 error: {e}", file=sys.stderr)
        return None, None


# ──────────────────────────────────────────────
#  Generación con nano-banana-2
# ──────────────────────────────────────────────
def generate_nano_banana(prompt: str) -> tuple:
    """
    Llama a fal-ai/nano-banana-2.
    El modelo genera TODO: fondo visual + texto tal como se especifica en el prompt.
    Devuelve (img_bytes, fal_url) — url es None si falla.
    """
    fal_key = os.environ.get('FAL_KEY')
    if not fal_key:
        print("  ⚠️  FAL_KEY no encontrada.", file=sys.stderr)
        return None, None

    try:
        import fal_client
        os.environ['FAL_KEY'] = fal_key

        result = fal_client.run(
            FAL_MODEL_NANO,
            arguments={
                "prompt": prompt,
                "num_images": 1,
                "aspect_ratio": "4:5",
                "resolution": "1K",
                "output_format": "png",
            }
        )

        image_url = result['images'][0]['url']
        req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read(), image_url

    except Exception as e:
        print(f"  ⚠️  nano-banana-2 error: {e}", file=sys.stderr)
        return None, None


# ──────────────────────────────────────────────
#  Resize al canvas Instagram
# ──────────────────────────────────────────────
def resize_to_instagram(img_bytes: bytes) -> bytes:
    """Redimensiona al canvas 1080x1350 si es necesario."""
    from PIL import Image
    img = Image.open(BytesIO(img_bytes)).convert('RGB')
    if img.size != (CANVAS_W, CANVAS_H):
        img = img.resize((CANVAS_W, CANVAS_H), Image.LANCZOS)
    out = BytesIO()
    img.save(out, 'PNG', quality=95)
    return out.getvalue()


# ──────────────────────────────────────────────
#  Fallback Pillow (solo si el API falla totalmente)
# ──────────────────────────────────────────────
def fallback_pillow(title: str, body: str, slide_num: int, total: int, output_path: str) -> str:
    """Fallback solo cuando el API no responde. Genera slide con Pillow."""
    from PIL import Image, ImageDraw

    bg = _gradient_bg()
    canvas = bg.copy()
    overlay = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    ov = ImageDraw.Draw(overlay)
    zone_top = int(CANVAS_H * 0.42)
    for y in range(zone_top, CANVAS_H):
        alpha = int(200 * (y - zone_top) / (CANVAS_H - zone_top))
        ov.line([(0, y), (CANVAS_W, y)], fill=(10, 5, 15, alpha))
    canvas = Image.alpha_composite(canvas, overlay)
    draw = ImageDraw.Draw(canvas)

    draw.rectangle([(0, 0), (CANVAS_W, 10)], fill=(*COLOR_ACCENT, 255))

    font_sm = _font(38)
    draw.text(
        (CANVAS_W - 90, 26), f"{slide_num} / {total}",
        font=font_sm, fill=(*COLOR_LILA, 180), anchor='ra'
    )

    font_title = _font(84, bold=True)
    title_y = int(CANVAS_H * 0.48)
    wrapped = textwrap.wrap(title, width=20)
    line_h = 96
    for i, line in enumerate(wrapped[:4]):
        draw.text((80, title_y + i * line_h), line,
                  font=font_title, fill=(*COLOR_WHITE, 255))

    if body and body.strip():
        font_body = _font(50)
        body_y = title_y + len(wrapped[:4]) * line_h + 36
        for i, line in enumerate(textwrap.wrap(body, width=36)[:3]):
            draw.text((80, body_y + i * 62), line,
                      font=font_body, fill=(*COLOR_SUBTEXT, 220))

    footer_y = CANVAS_H - 56
    bar_w = CANVAS_W - 160
    draw.rectangle([(80, footer_y), (80 + bar_w, footer_y + 6)],
                   fill=(255, 255, 255, 40))
    draw.rectangle([(80, footer_y), (80 + int(bar_w * slide_num / total), footer_y + 6)],
                   fill=(*COLOR_ACCENT2, 255))

    canvas.convert('RGB').save(output_path, 'PNG', quality=95)
    return output_path


def _gradient_bg() -> 'Image':
    from PIL import Image, ImageDraw
    img = Image.new('RGBA', (CANVAS_W, CANVAS_H))
    draw = ImageDraw.Draw(img)
    r1, g1, b1 = COLOR_BG
    r2, g2, b2 = COLOR_ACCENT
    for y in range(CANVAS_H):
        t = y / CANVAS_H
        r = int(r1 + (r2 - r1) * t * 0.5)
        g = int(g1 + (g2 - g1) * t * 0.5)
        b = int(b1 + (b2 - b1) * t * 0.5)
        draw.line([(0, y), (CANVAS_W, y)], fill=(r, g, b, 255))
    return img


def _font(size: int, bold: bool = False) -> 'ImageFont':
    from PIL import ImageFont
    candidates = (
        ['/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
         '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']
        if bold else
        ['/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
         '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
    )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


# ──────────────────────────────────────────────
#  Main
# ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='Genera slide PNG para carrusel Instagram')
    parser.add_argument('--slide-num', type=int, required=True)
    parser.add_argument('--total',     type=int, required=True)
    parser.add_argument('--title',     required=True, help='Texto del headline (para fallback)')
    parser.add_argument('--body',      default='',    help='Texto del subtítulo (para fallback)')
    parser.add_argument('--prompt',    required=True, help='Prompt completo para fal.ai')
    parser.add_argument('--model',     choices=['gpt-image-2', 'nano-banana-2'],
                        default='gpt-image-2', help='Modelo de generación de imagen')
    parser.add_argument('--output-dir', required=True)
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    output_path = str(out_dir / f"slide_{args.slide_num:02d}.png")

    print(f"  [{args.model}] Generando slide {args.slide_num}/{args.total}...",
          end=' ', file=sys.stderr, flush=True)

    # Ambos modelos: el API genera todo, incluido el texto del prompt
    if args.model == 'gpt-image-2':
        img_bytes, fal_url = generate_gpt_image2(args.prompt)
    else:
        img_bytes, fal_url = generate_nano_banana(args.prompt)

    if img_bytes:
        img_bytes = resize_to_instagram(img_bytes)
        Path(output_path).write_bytes(img_bytes)
        print(f"✓ → {output_path}", file=sys.stderr)
    else:
        print(f"\n  ⚠️  API falló. Usando fallback Pillow...", file=sys.stderr, end=' ')
        fallback_pillow(args.title, args.body, args.slide_num, args.total, output_path)
        fal_url = None
        print(f"✓ (fallback) → {output_path}", file=sys.stderr)

    # stdout: URL (o "fallback") seguida del path — el orquestador los usa para mostrar en chat
    print(fal_url if fal_url else "fallback")
    print(output_path)


if __name__ == '__main__':
    main()
