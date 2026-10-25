#!/usr/bin/env python3
"""Applique les petites modifications nécessaires dans VOS fichiers existants (idempotent, CRLF conservé).

Usage (depuis le dossier qui contient backend/ et frontend/) :
    python appliquer.py            (ou  python appliquer.py C:\\ndao-hifanosika)
"""
import sys, pathlib

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
BACK, FRONT = root / "backend" / "src", root / "frontend" / "src"
if not BACK.exists() or not FRONT.exists():
    sys.exit("Dossiers backend/src et frontend/src introuvables : lancez le script depuis la racine du projet.")

def patch(path, fn):
    b = path.read_bytes().decode("utf-8")
    crlf = "\r\n" in b
    t = b.replace("\r\n", "\n")
    t2 = fn(t)
    if t2 == t:
        print("  déjà fait ou repère introuvable :", path.relative_to(root)); return
    path.write_bytes((t2.replace("\n", "\r\n") if crlf else t2).encode("utf-8"))
    print("  modifié :", path.relative_to(root))

def need(t, old, new, label):
    if old not in t:
        print("  !! repère introuvable pour", label, "-> à faire à la main (voir LISEZMOI)")
        return t
    return t.replace(old, new, 1)

# ---------------- backend ----------------
def app_ts(t):
    if "activitySpaceRoutes" in t: return t
    t = need(t, 'import { errorMiddleware }', 'import activitySpaceRoutes from "./routes/activitySpace.routes";\nimport { errorMiddleware }', "app.ts import")
    return need(t, 'app.use("/api/activities", activitiesRoutes);', 'app.use("/api/activities", activitiesRoutes);\napp.use("/api/activity-space", activitySpaceRoutes);', "app.ts route")

def server_ts(t):
    if "startActivityReminders" in t: return t
    t = need(t, 'import { logger } from "./config/logger";', 'import { logger } from "./config/logger";\nimport { startActivityReminders } from "./services/activityReminders.service";', "server.ts import")
    return need(t, "void ensureDefaultZones();", "void ensureDefaultZones();\n    startActivityReminders();", "server.ts start")

patch(BACK / "app.ts", app_ts)
patch(BACK / "server.ts", server_ts)

# ---------------- frontend ----------------
def resources(t):
    if "ActivitySpace" in t: return t
    t = need(t, 'import { StatusBadge } from "@/components/crud/StatusBadge";', 'import { ActivitySpace } from "@/components/activities/ActivitySpace";\nimport { StatusBadge } from "@/components/crud/StatusBadge";', "resources import")
    marker = "  titleOf: (a) => a.title,"
    i = t.find("export const activitiesConfig")
    j = t.find(marker, i)
    if i < 0 or j < 0:
        print("  !! activitiesConfig introuvable -> ajouter à la main : extra: (a) => <ActivitySpace activity={a} />,"); return t
    return t[:j] + "  extra: (a) => <ActivitySpace activity={a} />,\n" + t[j:]

def access(t):
    if "/^\\/merit" in t: return t
    return need(t, "  // Rapports\n", "  // Ordre de mérite (stagiaires : leur propre position ; encadrement : classement)\n  {\n    pattern: /^\\/merit(\\/|$)/,\n    roles: [\"ADMIN\", \"DIRECTION\", \"COORDINATOR\", \"RH\", ...TUTEURS, ...STAGIAIRES],\n  },\n\n  // Rapports\n", "access.ts")

def sidebar(t):
    if "/merit" in t: return t
    t = need(t, "  Sparkles,\n", "  Sparkles,\n  Trophy,\n", "Sidebar import")
    return need(t, '      { href: "/internships", label: "Stages", icon: GraduationCap },', '      { href: "/internships", label: "Stages", icon: GraduationCap },\n      { href: "/merit", label: "Ordre de mérite", icon: Trophy },', "Sidebar item")

patch(FRONT / "lib" / "resources.tsx", resources)
patch(FRONT / "lib" / "access.ts", access)
patch(FRONT / "components" / "layout" / "Sidebar.tsx", sidebar)
print("Terminé.")
