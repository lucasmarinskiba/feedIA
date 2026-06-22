#!/usr/bin/env python3
"""
run.py — Orquestador completo del carrusel de Instagram.

Este script es para ejecución standalone (fuera de Claude).
Claude normalmente gestiona el flujo directamente, pero este script
permite automatización completa sin intervención manual.

Uso:
  python run.py --input "https://youtube.com/watch?v=..." --output-dir "./mi-carrusel/"
  python run.py --input "https://ejemplo.com/articulo" --output-dir "./mi-carrusel/"
  python run.py --input "Idea: Los mejores hábitos de productividad" --output-dir "./mi-carrusel/"

Nota: Requiere FAL_KEY en el entorno o en .env
"""

import os
import sys
import re
import json
import argparse
import subprocess
from pathlib import Path
from datetime import datetime


def load_env():
    """Carga variables de .env si existe."""
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, val = line.partition('=')
                    os.environ.setdefault(key.strip(), val.strip().strip('"\''))


def detect_input_type(input_str: str) -> str:
    """Detecta si el input es URL YouTube, URL artículo o texto."""
    if re.search(r'(?:youtube\.com/watch|youtu\.be/)', input_str):
        return 'youtube'
    elif input_str.startswith(('http://', 'https://')):
        return 'article'
    else:
        return 'text'


def get_content(input_str: str, input_type: str, scripts_dir: Path) -> str:
    """Obtiene el contenido fuente según el tipo de input."""
    if input_type == 'youtube':
        print(f"📥 Descargando transcripción de YouTube...")
        result = subprocess.run(
            [sys.executable, str(scripts_dir / 'get_transcript.py'), input_str],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"Error: {result.stderr}", file=sys.stderr)
            sys.exit(1)
        return result.stdout

    elif input_type == 'article':
        print(f"📥 Extrayendo contenido del artículo...")
        result = subprocess.run(
            [sys.executable, str(scripts_dir / 'fetch_article.py'), input_str],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"Error: {result.stderr}", file=sys.stderr)
            sys.exit(1)
        return result.stdout

    else:  # text
        print(f"📝 Usando texto directo como fuente...")
        return input_str


def slugify(text: str) -> str:
    """Convierte texto a slug para nombre de carpeta."""
    text = text.lower()
    text = re.sub(r'[áàäâ]', 'a', text)
    text = re.sub(r'[éèëê]', 'e', text)
    text = re.sub(r'[íìïî]', 'i', text)
    text = re.sub(r'[óòöô]', 'o', text)
    text = re.sub(r'[úùüû]', 'u', text)
    text = re.sub(r'[ñ]', 'n', text)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '-', text).strip('-')
    return text[:50]


def main():
    parser = argparse.ArgumentParser(description='Genera carrusel de Instagram')
    parser.add_argument('--input', required=True,
                        help='URL de YouTube, URL de artículo, o texto/idea')
    parser.add_argument('--output-dir',
                        default=f'./carrusel-{datetime.now().strftime("%Y%m%d-%H%M")}/',
                        help='Carpeta de salida')
    parser.add_argument('--strategy-file',
                        help='JSON con estrategia pre-generada por Claude (skip análisis)')
    parser.add_argument('--yes', action='store_true',
                        help='Confirmar automáticamente sin pausa interactiva')
    args = parser.parse_args()

    load_env()

    scripts_dir = Path(__file__).parent
    output_dir = Path(args.output_dir)
    slides_dir = output_dir / 'slides'
    slides_dir.mkdir(parents=True, exist_ok=True)

    # ── Obtener contenido ──
    input_type = detect_input_type(args.input)
    print(f"🔍 Tipo de input detectado: {input_type}")

    if args.strategy_file:
        # Si Claude ya generó la estrategia, cargarla directamente
        with open(args.strategy_file) as f:
            strategy = json.load(f)
        print(f"📋 Usando estrategia cargada desde {args.strategy_file}")
    else:
        content = get_content(args.input, input_type, scripts_dir)
        print(f"\n✅ Contenido obtenido ({len(content.split())} palabras)")
        print("\n⚠️  NOTA: Para análisis y generación de estrategia, Claude debe orquestar este paso.")
        print("   Usa el flag --strategy-file para pasar la estrategia generada por Claude.")
        print("   O ejecuta directamente desde Claude con la skill activa.")
        sys.exit(0)

    # ── Generar slides ──
    slides = strategy.get('slides', [])
    total = len(slides)
    style = strategy.get('style', 'modern flat design, deep purple and indigo palette')

    print(f"\n🎨 Generando {total} slides...")

    generated = []
    failed = []

    for slide in slides:
        num = slide['num']
        try:
            result = subprocess.run(
                [
                    sys.executable, str(scripts_dir / 'generate_image.py'),
                    '--slide-num', str(num),
                    '--total', str(total),
                    '--title', slide.get('title', ''),
                    '--body', slide.get('body', ''),
                    '--prompt', slide.get('visual_prompt', 'abstract background'),
                    '--style', style,
                    '--output-dir', str(slides_dir),
                ],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode == 0:
                generated.append(result.stdout.strip())
            else:
                failed.append((num, result.stderr))
        except subprocess.TimeoutExpired:
            failed.append((num, "Timeout después de 120s"))
        except Exception as e:
            failed.append((num, str(e)))

    # ── Crear archivos de texto ──
    if 'caption' in strategy:
        (output_dir / 'caption.md').write_text(strategy['caption'], encoding='utf-8')

    if 'hashtags' in strategy:
        (output_dir / 'hashtags.md').write_text(strategy['hashtags'], encoding='utf-8')

    # Guardar la estrategia completa
    (output_dir / 'strategy.json').write_text(
        json.dumps(strategy, ensure_ascii=False, indent=2), encoding='utf-8')

    # ── Resumen ──
    print(f"\n{'='*50}")
    print(f"✅ Carrusel generado en: {output_dir.resolve()}")
    print(f"   Slides generados: {len(generated)}/{total}")
    if failed:
        print(f"   ⚠️  Slides fallidos: {[f[0] for f in failed]}")
        for num, err in failed:
            print(f"      Slide {num}: {err}")
    print(f"{'='*50}")


if __name__ == '__main__':
    main()
