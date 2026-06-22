#!/usr/bin/env python3
"""
get_transcript.py — Descarga la transcripción de un vídeo de YouTube.
Uso: python get_transcript.py <URL_o_VideoID> [--lang es,en]

Compatible con youtube-transcript-api >= 0.6.x (nueva API instanciada).
"""

import sys
import re
import argparse


def extract_video_id(url_or_id: str) -> str:
    """Extrae el video ID de cualquier formato de URL de YouTube."""
    patterns = [
        r'(?:v=|/v/|youtu\.be/|/embed/|/shorts/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$',  # ya es un ID directo
    ]
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    raise ValueError(f"No se pudo extraer el video ID de: {url_or_id}")


def get_transcript(url_or_id: str, languages: list = None) -> str:
    """
    Descarga la transcripción de YouTube y la devuelve como texto limpio.
    Compatible con youtube-transcript-api tanto antigua como nueva API.
    """
    from youtube_transcript_api import YouTubeTranscriptApi

    if languages is None:
        languages = ['es', 'en', 'es-ES', 'es-MX', 'es-419', 'en-US']

    video_id = extract_video_id(url_or_id)

    # Detectar si es nueva API (instanciada) o antigua (estática)
    api = YouTubeTranscriptApi()  # nueva API >= 0.6.x

    try:
        # Intentar con idiomas preferidos directamente
        try:
            transcript_list = api.list(video_id)
            transcript = transcript_list.find_transcript(languages)
            entries = transcript.fetch()
        except Exception:
            # Fallback: coger cualquier transcripción disponible
            transcript_list = api.list(video_id)
            available = list(transcript_list)
            if not available:
                raise RuntimeError("No hay transcripciones disponibles para este vídeo")
            transcript = available[0]
            entries = transcript.fetch()

        # Extraer texto limpio
        text = ' '.join(
            e.get('text', e.text if hasattr(e, 'text') else '')
            for e in entries
        )
        # Limpiar artefactos comunes de auto-transcripción
        text = re.sub(r'\[.*?\]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()

        # Info de contexto a stderr (no contamina el output del script)
        word_count = len(text.split())
        print(f"# Video ID: {video_id} | Palabras: {word_count}", file=sys.stderr)

        return text

    except Exception as e:
        # Si la API instanciada falla, intentar API estática (versiones antiguas)
        try:
            result = YouTubeTranscriptApi.fetch(video_id, languages=languages)
            text = ' '.join(e.get('text', '') for e in result)
            text = re.sub(r'\[.*?\]', '', text)
            return re.sub(r'\s+', ' ', text).strip()
        except Exception:
            print(f"ERROR: No se pudo obtener la transcripción. {e}", file=sys.stderr)
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Descarga transcripción de YouTube')
    parser.add_argument('url', help='URL del vídeo o Video ID')
    parser.add_argument('--lang', default='es,en',
                        help='Idiomas en orden de preferencia (default: es,en)')
    args = parser.parse_args()

    languages = [l.strip() for l in args.lang.split(',')]
    text = get_transcript(args.url, languages)
    print(text)


if __name__ == '__main__':
    main()
