"""Configuration : variables d'environnement, avec repli sur les fichiers .env du projet.

Le service lit (sans jamais écraser une variable déjà définie) :
  1. ai-service/.env
  2. ../backend/.env      (DATABASE_URL et AI_SERVICE_KEY sont donc partagés avec le backend)
"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SHARED_KEYS = {"DATABASE_URL", "AI_SERVICE_KEY"}


def _parse(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}

    try:
        lines = path.read_text(encoding="utf-8-sig").splitlines()
    except OSError:
        return values

    for line in lines:
        text = line.strip()
        if not text or text.startswith("#") or "=" not in text:
            continue

        key, _, raw = text.partition("=")
        key = key.strip().removeprefix("export ").strip()
        raw = raw.strip()

        if raw[:1] in ("'", '"') and raw[-1:] == raw[:1] and len(raw) >= 2:
            raw = raw[1:-1]
        elif " #" in raw:
            raw = raw.split(" #", 1)[0].strip()

        if key in SHARED_KEYS and raw:
            values[key] = raw

    return values


def load_env() -> None:
    for candidate in (BASE_DIR / ".env", BASE_DIR.parent / "backend" / ".env"):
        for key, value in _parse(candidate).items():
            os.environ.setdefault(key, value)


load_env()


def database_url() -> str:
    return os.getenv("DATABASE_URL", "").strip()


def service_key() -> str:
    return os.getenv("AI_SERVICE_KEY", "")
