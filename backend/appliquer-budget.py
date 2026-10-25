#!/usr/bin/env python3
"""Usage :  python appliquer-budget.py  <dossier backend>   (ex. python appliquer-budget.py ../backend)
Ajoute 2 lignes dans app.ts et 1 ligne dans projects/activities.routes.ts. Idempotent."""
import sys, pathlib
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".") / "src"

def patch(rel, fn):
    p = root / rel
    b = p.read_bytes().decode("utf-8"); crlf = "\r\n" in b
    t = b.replace("\r\n", "\n"); t2 = fn(t)
    if t2 == t: print("déjà fait / rien à faire :", rel); return
    p.write_bytes((t2.replace("\n", "\r\n") if crlf else t2).encode("utf-8")); print("modifié :", rel)

def app(t):
    if "budgetGuard" in t: return t
    t = t.replace('import { errorMiddleware }', 'import { budgetGuard } from "./middlewares/budgetGuard.middleware";\nimport { errorMiddleware }', 1)
    return t.replace("app.use(auditMiddleware);", "app.use(budgetGuard);\napp.use(auditMiddleware);", 1)

def routes(t):
    if "ignoreBudgetInput" in t: return t
    t = t.replace('import { authenticate } from "../middlewares/auth.middleware";', 'import { authenticate } from "../middlewares/auth.middleware";\nimport { ignoreBudgetInput } from "../middlewares/budgetGuard.middleware";', 1)
    return t.replace("router.use(authenticate);", "router.use(authenticate);\nrouter.use(ignoreBudgetInput);", 1)

patch("app.ts", app)
patch("routes/projects.routes.ts", routes)
patch("routes/activities.routes.ts", routes)
