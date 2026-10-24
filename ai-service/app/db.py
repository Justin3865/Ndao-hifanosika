"""Lecture directe de la base PostgreSQL (mêmes tables que le backend / Prisma).

Le pilote `psycopg` est facultatif : s'il manque, le service continue de fonctionner
en mode « données envoyées par le backend » (voir /v1/insights).
    pip install "psycopg[binary]"
"""
from __future__ import annotations

import re
import time
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .config import database_url

try:  # pragma: no cover - dépend de l'installation
    import psycopg
    from psycopg import errors as pg_errors
    from psycopg.rows import dict_row
except Exception:  # pilote absent
    psycopg = None  # type: ignore[assignment]
    pg_errors = None  # type: ignore[assignment]
    dict_row = None  # type: ignore[assignment]

# Paramètres Prisma que libpq ne comprend pas
PRISMA_ONLY = {"schema", "connection_limit", "pool_timeout", "pgbouncer", "socket_timeout", "statement_cache_size"}


class DatabaseUnavailable(RuntimeError):
    """Base non configurée, pilote absent ou connexion impossible."""


def parse_url(url: str) -> tuple[str, str]:
    """URL Prisma -> (conninfo libpq, schéma)."""
    parts = urlsplit(url)
    schema = "public"
    kept = []

    for key, value in parse_qsl(parts.query):
        if key.lower() == "schema":
            schema = value or "public"
        elif key.lower() not in PRISMA_ONLY:
            kept.append((key, value))

    if not re.fullmatch(r"[A-Za-z0-9_]+", schema):
        schema = "public"

    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(kept), "")), schema


def connect():
    if psycopg is None:
        raise DatabaseUnavailable('Pilote psycopg absent : pip install "psycopg[binary]"')

    url = database_url()
    if not url:
        raise DatabaseUnavailable("DATABASE_URL non configurée (backend/.env ou variable d'environnement).")

    conninfo, schema = parse_url(url)

    try:
        return psycopg.connect(
            conninfo,
            row_factory=dict_row,
            connect_timeout=5,
            autocommit=True,
            options=f"-c search_path={schema} -c default_transaction_read_only=on",
        )
    except Exception as error:  # noqa: BLE001
        raise DatabaseUnavailable(f"Connexion à la base impossible : {str(error).splitlines()[0]}") from error


def _rows(connection, sql: str) -> list[dict[str, Any]]:
    with connection.cursor() as cursor:
        cursor.execute(sql)
        return list(cursor.fetchall())


QUERIES = {
    "projects": 'SELECT id, name, code, status::text AS status, budget, "startDate", "endDate", "beneficiaryTarget", "departmentId", "createdById" FROM "Project"',
    "milestones": 'SELECT id, "projectId", title, progress, "dueDate", "completedAt" FROM "Milestone"',
    "evaluations": 'SELECT id, "projectId", title, score, status::text AS status, "evaluatedAt", "createdAt", "createdById" FROM "Evaluation"',
    "activities": 'SELECT id, "projectId", title, status::text AS status, budget, "startDate", "endDate", "createdById" FROM "Activity"',
    "beneficiaries": 'SELECT id, "projectId", "firstName", "lastName", age, vulnerable, phone, "trackingEnabled", "lastSeenAt" FROM "Beneficiary"',
    "internships": 'SELECT id, "projectId", "studentId", "supervisorId", title, status::text AS status, "startDate", "endDate" FROM "Internship"',
    "pendingUsers": 'SELECT id, "firstName", "lastName", "createdAt" FROM "User" WHERE status::text = \'PENDING\'',
}


def fetch_dataset() -> dict[str, list[dict[str, Any]]]:
    """Toutes les données nécessaires aux analyses, lues directement dans PostgreSQL."""
    with connect() as connection:
        return {name: _rows(connection, sql) for name, sql in QUERIES.items()}


def fetch_alert_history(days: int = 90) -> list[dict[str, Any]]:
    """Historique des alertes (table AiAlert) pour la courbe d'évolution ; vide si la table n'existe pas encore."""
    sql = (
        'SELECT "firstSeenAt", "resolvedAt", severity FROM "AiAlert" '
        f"WHERE type <> 'DIGEST' AND \"firstSeenAt\" >= now() - interval '{int(days)} days'"
    )

    try:
        with connect() as connection:
            return _rows(connection, sql)
    except DatabaseUnavailable:
        raise
    except Exception as error:  # noqa: BLE001
        if pg_errors is not None and isinstance(error, pg_errors.UndefinedTable):
            return []
        raise DatabaseUnavailable(f"Lecture de l'historique impossible : {str(error).splitlines()[0]}") from error


_status_cache: dict[str, Any] = {"at": 0.0, "value": None}


def status(force: bool = False) -> dict[str, Any]:
    """État de la liaison à la base (mis en cache 30 s)."""
    now = time.time()
    if not force and _status_cache["value"] and now - _status_cache["at"] < 30:
        return _status_cache["value"]

    value: dict[str, Any] = {
        "driver": psycopg is not None,
        "configured": bool(database_url()),
        "connected": False,
        "error": None,
    }

    if value["driver"] and value["configured"]:
        try:
            with connect() as connection:
                _rows(connection, "SELECT 1")
            value["connected"] = True
        except DatabaseUnavailable as error:
            value["error"] = str(error)
    elif not value["driver"]:
        value["error"] = 'Pilote psycopg absent : pip install "psycopg[binary]"'
    else:
        value["error"] = "DATABASE_URL non configurée"

    _status_cache.update(at=now, value=value)
    return value
