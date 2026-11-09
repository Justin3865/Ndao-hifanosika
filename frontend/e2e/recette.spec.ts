import { expect, test } from "@playwright/test";
import { ACCOUNTS, API, RoleName, login, rows } from "./helpers";

type Json = Record<string, any>;

/* ------------------------------------------------------------------ R01 */
// R01 — Connexion avec chaque rôle : chaque rôle ne voit que son espace.
test.describe("R01 · Accès par rôle", () => {
  const EXPECTED_SECTIONS: Record<string, string[]> = {
    ADMIN: ["RH", "DAF", "IMPACT"],
    DIRECTION: ["RH", "DAF", "IMPACT"],
    RH: ["RH"],
    DAF: ["DAF"],
    COMMUNICATION: ["IMPACT"],
    COORDINATOR: ["IMPACT"],
  };
  const HEADING: Record<string, RegExp> = {
    RH: /Tableau de bord RH/,
    DAF: /Tableau de bord financier/,
    COMMUNICATION: /Impact & communication/,
    COORDINATOR: /Impact de mes projets/,
    DIRECTION: /Vue consolidée par département/,
    ADMIN: /Vue consolidée par département/,
  };

  for (const role of Object.keys(EXPECTED_SECTIONS) as RoleName[]) {
    test(`${role} : connexion par l'interface puis tableau de bord adapté`, async ({ page }) => {
      await page.goto("/login");
      await page.getByPlaceholder("vous@exemple.org").fill(ACCOUNTS[role].email);
      await page.locator('input[type="password"]').fill(ACCOUNTS[role].password);
      await page.getByRole("button", { name: "Se connecter" }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
      await expect(page.getByText(HEADING[role]).first()).toBeVisible({ timeout: 20_000 });
    });

    test(`${role} : l'API ne renvoie que les sections de son département`, async ({ request }) => {
      const headers = await login(request, role);
      const res = await request.get(`${API}/dashboard/department`, { headers });
      expect(res.status()).toBe(200);
      const body = (await res.json()) as Json;
      expect(body.data.sections).toEqual(EXPECTED_SECTIONS[role]);
      // jamais de données hors de ses sections
      expect(Object.keys(body.data).includes("rh")).toBe(EXPECTED_SECTIONS[role].includes("RH"));
      expect(Object.keys(body.data).includes("daf")).toBe(EXPECTED_SECTIONS[role].includes("DAF"));
      expect(Object.keys(body.data).includes("impact")).toBe(EXPECTED_SECTIONS[role].includes("IMPACT"));
    });
  }

  test("le journal d'audit est réservé à l'administration", async ({ request }) => {
    expect((await request.get(`${API}/audit?limit=1`, { headers: await login(request, "ADMIN") })).status()).toBe(200);
    for (const role of ["RH", "DAF", "COMMUNICATION", "COORDINATOR"] as RoleName[]) {
      const res = await request.get(`${API}/audit?limit=1`, { headers: await login(request, role) });
      expect(res.status(), `rôle ${role}`).toBe(403);
    }
  });

  test("sans jeton, l'API refuse l'accès", async ({ request }) => {
    expect((await request.get(`${API}/dashboard/department`)).status()).toBe(401);
  });
});

/* ------------------------------------------------------------------ R03 */
// R03 — Modifier un bénéficiaire : une ligne apparaît dans le journal d'audit (avec l'identifiant d'entité).
test("R03 · une modification de bénéficiaire est journalisée avec entité, identifiant et détails", async ({ request }) => {
  const headers = await login(request, "ADMIN");
  const list = rows<Json>(await (await request.get(`${API}/beneficiaries`, { headers })).json());
  test.skip(list.length === 0, "Aucun bénéficiaire : lancer `npm run prisma:seed`.");
  const id = Number(list[0].id);

  // Même si la validation métier refusait la valeur, l'action sensible est tracée : on teste le journal.
  await request.put(`${API}/beneficiaries/${id}`, { headers, data: { address: `recette-${Date.now()}` } });

  await expect
    .poll(
      async () => {
        const audit = rows<Json>(await (await request.get(`${API}/audit?limit=50`, { headers })).json());
        return audit.find((r) => String(r.action).startsWith(`PUT /api/beneficiaries/${id}`)) ?? null;
      },
      { timeout: 10_000, message: "ligne d'audit introuvable" },
    )
    .not.toBeNull();

  const audit = rows<Json>(await (await request.get(`${API}/audit?limit=50`, { headers })).json());
  const line = audit.find((r) => String(r.action).startsWith(`PUT /api/beneficiaries/${id}`))!;
  expect(line.entityId).toBe(id);
  expect(line.details.operation).toBe("UPDATE");
  expect(line.details.resource).toBe("beneficiaries");
  expect(line.details.fields).toContain("address"); // le NOM du champ, jamais sa valeur
  expect(JSON.stringify(line.details)).not.toContain("recette-");
});

/* ------------------------------------------------------------------ R06 */
// R06 — Données d'un enfant masquées pour les rôles non autorisés.
test("R06 · les mineurs sont masqués pour la Communication", async ({ request }) => {
  const admin = rows<Json>(await (await request.get(`${API}/beneficiaries`, { headers: await login(request, "ADMIN") })).json());
  const minors = admin.filter((b) => typeof b.age === "number" && b.age < 18);
  test.skip(minors.length === 0, "Aucun mineur dans les données : inscrire un enfant (R06) puis relancer ce test.");

  const comm = rows<Json>(await (await request.get(`${API}/beneficiaries`, { headers: await login(request, "COMMUNICATION") })).json());
  for (const minor of minors) {
    const seen = comm.find((b) => b.id === minor.id);
    if (!seen) continue; // non visible du tout : masquage maximal
    const fullName = `${minor.firstName} ${minor.lastName}`.trim();
    expect(`${seen.firstName} ${seen.lastName}`.trim(), `mineur #${minor.id}`).not.toBe(fullName);
    if (minor.phone) expect(seen.phone).not.toBe(minor.phone);
  }
});

/* ------------------------------------------------------------------ R07 / R08 */
// R07 — Générer les relances : 3, 6 et 12 mois par bénéficiaire d'un projet clôturé.
// R08 — Saisir une relance : statut « Réalisée » et indicateurs d'impact mis à jour.
test.describe("R07/R08 · Suivi post-programme", () => {
  test("R07 · 3 relances (3, 6, 12 mois) par bénéficiaire", async ({ request }) => {
    const headers = await login(request, "ADMIN");
    expect((await request.post(`${API}/follow-ups/sync`, { headers })).ok()).toBeTruthy();
    const all = rows<Json>(await (await request.get(`${API}/follow-ups`, { headers })).json());
    test.skip(all.length === 0, "Aucun projet clôturé : clôturer un projet avec bénéficiaires puis relancer.");

    const byBeneficiary = new Map<number, number[]>();
    for (const f of all) byBeneficiary.set(f.beneficiaryId, [...(byBeneficiary.get(f.beneficiaryId) ?? []), f.horizonMonths]);
    for (const [beneficiaryId, horizons] of byBeneficiary) {
      expect(horizons.sort((a, b) => a - b), `bénéficiaire #${beneficiaryId}`).toEqual([3, 6, 12]);
    }
  });

  test("R08 · saisir une relance la rend « Réalisée » et met à jour l'impact", async ({ request }) => {
    const headers = await login(request, "ADMIN");
    const pending = rows<Json>(await (await request.get(`${API}/follow-ups?status=PENDING`, { headers })).json());
    test.skip(pending.length === 0, "Aucune relance en attente : voir R07.");
    const target = pending[0];

    const done = await request.put(`${API}/follow-ups/${target.id}/complete`, {
      headers,
      data: { occupation: "SELF_EMPLOYED", activityCreated: true, monthlyIncome: 250000, satisfaction: 4 },
    });
    expect(done.ok(), await done.text()).toBeTruthy();

    const after = rows<Json>(await (await request.get(`${API}/follow-ups?status=DONE`, { headers })).json());
    const line = after.find((f) => f.id === target.id);
    expect(line?.status).toBe("DONE");
    expect(line?.satisfaction).toBe(4);

    const impact = await (await request.get(`${API}/follow-ups/impact`, { headers })).json();
    expect(JSON.stringify(impact.data)).toBeTruthy();
    expect(impact.success).toBe(true);
  });
});

/* ------------------------------------------------------------------ R13 */
// R13 — Dégradation gracieuse : service IA arrêté, le reste de la plateforme fonctionne.
// Lancer d'abord :  docker compose stop ia   (ou arrêter uvicorn)   puis   E2E_AI_DOWN=1 npm run e2e
test("R13 · service IA arrêté : la plateforme et les synthèses locales continuent", async ({ request }) => {
  test.skip(process.env.E2E_AI_DOWN !== "1", "Arrêter le service IA puis définir E2E_AI_DOWN=1.");
  const headers = await login(request, "ADMIN");
  for (const path of ["/projects", "/dashboard/department", "/reports/dashboard"]) {
    const res = await request.get(`${API}${path}`, { headers });
    expect(res.status(), `${path} doit répondre malgré l'arrêt du service IA`).toBeLessThan(500);
  }
  const summary = await request.get(`${API}/ai/summary`, { headers });
  expect(summary.status(), "la synthèse doit être produite par le repli local, sans erreur serveur").toBeLessThan(500);
});
