"""Génère un jeu SYNTHÉTIQUE 'DemoML' (SQL d'insertion + SQL de nettoyage) pour la base de démonstration."""
import sys, numpy as np, pandas as pd
sys.path.insert(0, "../ml")
import dropout as dp

def make(n=240, n_act=30, seed=1):
    rng = np.random.default_rng(seed)
    age = rng.integers(9, 25, n)
    T = rng.integers(8, n_act + 1, n)                            # séances pointées
    eng = rng.normal(0, 1, n)
    p_pres = np.clip(0.78 + 0.12 * eng + rng.normal(0, 0.04, n), 0.15, 0.98)
    present = rng.binomial(T, p_pres)
    missed = T - present
    # l'abandon dépend surtout du NOMBRE absolu d'absences et de l'âge (mal pondérés par les règles)
    z = 0.42 * (missed - 5) + 0.30 * (age - 16) - 0.05 * (present - 18) + rng.normal(0, 0.8, n)
    z = z - np.quantile(z, 0.70)
    y = (rng.random(n) < 1 / (1 + np.exp(-1.8 * z))).astype(int)
    return pd.DataFrame(dict(i=np.arange(1, n + 1), age=age, dropout=y, T=T, present=present))

def features(d):
    f = pd.DataFrame({"beneficiaryId": d.i, "dropout": d.dropout, "age": d.age})
    f["attendance_rate"] = (d.present / d["T"] * 1000).round() / 10
    f["activities_completed"] = d.present
    f["missed_activities"] = d["T"] - d.present
    f["eval_avg"] = np.nan                                       # note de projet : constante/absente en base
    return f

if __name__ == "__main__":
    for s in range(1, 9):
        r = dp.train(features(make(seed=s)), seed=s)["report"]
        print(s, r["stats"]["dropouts"], r["decision"]["verdict"], r["decision"]["message"][:100])


def sql(d, seed):
    L = ["-- DEMO SYNTHÉTIQUE (marqueur firstName='DemoML', code 'DEMO-ML'). À SUPPRIMER avec demo_ml_cleanup.sql.",
         "-- Lancer sur la base de DÉMO uniquement. Seed=%d" % seed, "BEGIN;",
         "-- Projet de démo (évite de polluer un projet réel)",
         'INSERT INTO "Project" (name, code, status, "createdById", "updatedAt") SELECT \'[DEMO-ML] Projet synthétique\', \'DEMO-ML\', \'ACTIVE\', (SELECT MIN(id) FROM "User"), now() '
         'WHERE NOT EXISTS (SELECT 1 FROM "Project" WHERE code = \'DEMO-ML\');',
         "-- Séances de démo (nombre = max des séances pointées)"]
    nmax = int(d["T"].max())
    L.append('INSERT INTO "Activity" ("projectId", title, "createdById", "updatedAt") '
             "SELECT (SELECT id FROM \"Project\" WHERE code='DEMO-ML'), '[DEMO-ML] Séance ' || g, "
             '(SELECT MIN(id) FROM "User"), now() FROM generate_series(1,%d) g;' % nmax)
    vals = ",\n".join("(%d,%d,%d,%d,%d)" % (r.i, r.age, r.dropout, r["T"], r.present) for _, r in d.iterrows())
    L += ["CREATE TEMP TABLE demo_src (i int, age int, dropout int, t int, pres int);",
          "INSERT INTO demo_src VALUES\n" + vals + ";",
          'INSERT INTO "Beneficiary" ("projectId", "firstName", "lastName", age, "updatedAt") '
          "SELECT (SELECT id FROM \"Project\" WHERE code='DEMO-ML'), 'DemoML', 'N' || i, age, now() FROM demo_src;",
          'INSERT INTO "BeneficiaryJourney" ("beneficiaryId", status, "statusDate", "updatedAt") '
          "SELECT b.id, CASE WHEN s.dropout=1 THEN 'DROPPED_OUT'::\"JourneyStatus\" ELSE 'COMPLETED'::\"JourneyStatus\" END, now(), now() "
          'FROM demo_src s JOIN "Beneficiary" b ON b."firstName"=\'DemoML\' AND b."lastName"=\'N\'||s.i;',
          "-- Pointages : séances 1..t ; les 'pres' premières = présent, le reste = absent",
          'INSERT INTO "BeneficiaryAttendance" ("activityId", "beneficiaryId", present) '
          "SELECT a.id, b.id, (a.rn <= s.pres) FROM demo_src s "
          'JOIN "Beneficiary" b ON b."firstName"=\'DemoML\' AND b."lastName"=\'N\'||s.i '
          "JOIN (SELECT id, row_number() OVER (ORDER BY id) rn FROM \"Activity\" WHERE title LIKE '[DEMO-ML]%') a ON a.rn <= s.t;",
          "COMMIT;",
          "SELECT status, COUNT(*) FROM \"BeneficiaryJourney\" GROUP BY status;"]
    return "\n".join(L)

CLEAN = """-- Nettoyage complet de la démo synthétique
BEGIN;
DELETE FROM "BeneficiaryAttendance" WHERE "beneficiaryId" IN (SELECT id FROM "Beneficiary" WHERE "firstName"='DemoML');
DELETE FROM "BeneficiaryJourney"   WHERE "beneficiaryId" IN (SELECT id FROM "Beneficiary" WHERE "firstName"='DemoML');
DELETE FROM "Beneficiary" WHERE "firstName"='DemoML';
DELETE FROM "Activity" WHERE title LIKE '[DEMO-ML]%';
DELETE FROM "Project" WHERE code='DEMO-ML';
COMMIT;
SELECT status, COUNT(*) FROM "BeneficiaryJourney" GROUP BY status;  -- attendu : COMPLETED = 22 (état initial)
"""

def write(seed=1):
    d = make(seed=seed)
    open("demo_ml_concluant.sql", "w", encoding="utf-8").write(sql(d, seed))
    open("demo_ml_cleanup.sql", "w", encoding="utf-8").write(CLEAN)
    return d
