#!/usr/bin/env python3
# Usage: python3 patch_zones.py chemin/vers/zones.routes.ts   (overpass_block.ts doit être dans le même dossier)
import sys, os, shutil
p = sys.argv[1]
s = open(p, encoding="utf8").read()
shutil.copy(p, p + ".bak")
done = []

def rep(name, old, new):
    global s
    if old in s:
        s = s.replace(old, new, 1); done.append("OK   " + name)
    else:
        done.append("SKIP " + name + " (ancre introuvable)")

a = s.find("let overpassActive = 0;")
b = s.find("/** Emprise + centre d'un élément Overpass")
if a >= 0 and b > a:
    blk = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "overpass_block.ts"), encoding="utf8").read()
    s = s[:a] + blk + "\n" + s[b:]
    done.append("OK   overpass")
else:
    done.append("SKIP overpass")
rep("geom basse priorité", 'out geom;`, 60000);', 'out geom;`, 60000, false);')

rep("attente parent 2,5 s",
"""    // Le contour du parent sert à écarter les zones voisines ; on l'attend 12 s au plus, sans quoi on filtre sur l'emprise
    let parent: ShapeInfo;
    if (info.stub) {
      parent = await Promise.race([
        shapePromise,
        new Promise<ShapeInfo>((resolve) => setTimeout(() => resolve(info.stub as ShapeInfo), 12000)),""",
"""    shapePromise.catch(() => null);
    let parent: ShapeInfo;
    if (info.stub) {
      parent = await Promise.race([
        shapePromise,
        new Promise<ShapeInfo>((resolve) => setTimeout(() => resolve(info.stub as ShapeInfo), 2500)),""")

rep("cache brut enfants",
"""      const elements = await overpass(
        // Recherche par emprise : beaucoup plus légère pour Overpass qu'une recherche par surface (map_to_area)
        `[out:json][timeout:50];rel["boundary"="administrative"]["admin_level"~"^(${levels.join("|")})$"](${south},${west},${north},${east});out tags bb;`,
        55000
      );
""",
"""      const rawKey = `kidsraw:v1:R${relId}:${levels.join("-")}`;
      let elements = memoGet<Json[]>(rawKey);

      if (!elements) {
        elements = await overpass(
          `[out:json][timeout:50];rel["boundary"="administrative"]["admin_level"~"^(${levels.join("|")})$"](${south},${west},${north},${east});out tags bb;`,
          55000
        );
        if (elements.length) {
          memoSet(rawKey, elements.map((e) => ({ id: e.id, type: e.type, tags: { name: e.tags?.name, admin_level: e.tags?.admin_level }, bounds: e.bounds, center: e.center })));
        }
      }
""")

rep("plus de préchargement massif",
"""        // Contours des enfants préchargés par lots : cocher un élément est ensuite instantané
        void requestShapes(list.filter((c) => c.id.startsWith("R:")).slice(0, 80).map((c) => Number(c.id.slice(2))));
""", "")
rep("cache v5", "const key = `children:v4:R${relId}`;", "const key = `children:v5:R${relId}`;")

rep("staticShape rapide",
"""    const parent = await staticParentShape(unit);
    const { shape, final } = await locateStatic(unit, parent, fast);

    if (shape) {
      if (final && !shape.partial && (shape.geometry || unit.level === "FOKONTANY" || shape.bbox.length === 4)) memoSet(key, shape);
      return shape;
    }

    if (!parent) throw new Error("Zone introuvable : le parent n'est pas localisable pour le moment");

    const fallback = boxAround(parent.center.lat, parent.center.lng, circleHalf(unit.level));
    if (final) memoSet(key, fallback);
    return fallback;""",
"""    const parent = await staticParentShape(unit);

    // La recherche continue en arrière-plan et son résultat est mis en cache même si on répond avant la fin
    const located = locateStatic(unit, parent, fast).then((r) => {
      if (r.shape) {
        if (r.final && !r.shape.partial && (r.shape.geometry || unit.level === "FOKONTANY" || r.shape.bbox.length === 4)) memoSet(key, r.shape);
      } else if (parent && r.final) {
        memoSet(key, boxAround(parent.center.lat, parent.center.lng, circleHalf(unit.level)));
      }
      return r;
    });

    let result: { shape: ShapeInfo | null; final: boolean } | null;
    if (fast && parent) {
      located.catch(() => null);
      result = await Promise.race([located, new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))]);
      // Pas encore trouvé : cercle provisoire au centre du parent ; le client redemande et obtient ensuite le vrai résultat
      if (!result) return { ...boxAround(parent.center.lat, parent.center.lng, circleHalf(unit.level)), partial: true };
    } else {
      result = await located;
    }

    if (result.shape) return result.shape;
    if (!parent) throw new Error("Zone introuvable : le parent n'est pas localisable pour le moment");
    return boxAround(parent.center.lat, parent.center.lng, circleHalf(unit.level));""")

open(p, "w", encoding="utf8").write(s)
print("\n".join(done))
