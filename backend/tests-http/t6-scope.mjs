// Test d'intégration du périmètre « coordinateur → ses projets » (lot 20261108).
// Appelle l'API réelle (backend + PostgreSQL). À lancer sur une base de DÉVELOPPEMENT/TEST.
//   node tests-http/t6-scope.mjs            (COORDINATOR_SCOPE non défini : mode transition)
//   STRICT=1 node tests-http/t6-scope.mjs   (backend lancé avec COORDINATOR_SCOPE=strict)
import { call, login, setTok } from './h.mjs';

let pass = 0, skipped = [];
const fail = [];
const t = (name, cond, detail = '') => { if (cond) pass++; else fail.push(name + (detail ? '  -> ' + detail : '')); };
const skip = (name) => skipped.push(name);
const D = (r) => JSON.stringify(r.j).slice(0, 160);
const pick = (r, k) => r.j?.[k] ?? r.j?.data ?? null;
const rows = (r) => (Array.isArray(r.j?.data) ? r.j.data : (r.j?.[Object.keys(r.j || {}).find((k) => Array.isArray(r.j[k]))] ?? []));
const ids = (r) => new Set(rows(r).map((x) => x.id));
const STRICT = process.env.STRICT === '1';
const rnd = Math.random().toString(36).slice(2, 7);

// ---------- Mise en place (ADMIN) ----------
const A = await login('admin@ndao-hifanosika.org', 'admin');
if (A.s !== 200) { console.error('Connexion ADMIN impossible : lancer prisma/create-admin.ts'); process.exit(2); }
const adm = A.j.data.accessToken; setTok(adm);

let r = await call('POST', '/departements', { name: 'DS' + rnd, code: 'DS' + rnd });
const did = r.j?.department?.id;
const mkProject = async (tag) => {
  const body = { code: tag + rnd, name: `Projet ${tag} ${rnd}`, description: 'scope', status: 'ACTIVE', startDate: '2026-01-01', endDate: '2026-12-31', budget: 1000, departmentId: did };
  const x = await call('POST', '/projects', body);
  return { body, id: pick(x, 'project')?.id };
};
const PA = await mkProject('A'), PB = await mkProject('B');
t('setup : projets A et B créés', !!PA.id && !!PB.id, `${PA.id}/${PB.id}`);

const ben = (projectId, name) => ({ projectId, firstName: name, lastName: 'Scope' + rnd, gender: 'MALE', age: 30, vulnerable: true, homeLatitude: -21.46, homeLongitude: 47.09, householdSize: 4, monthlyIncome: 40000, childrenUnder5: 1, hasDisability: false, locality: 'Test' });
r = await call('POST', '/beneficiaries', ben(PA.id, 'BenA')); const bA = pick(r, 'beneficiary')?.id;
r = await call('POST', '/beneficiaries', ben(PB.id, 'BenB')); const bB = pick(r, 'beneficiary')?.id;
t('setup : bénéficiaires A et B créés', !!bA && !!bB, `${bA}/${bB}`);

const ev = (projectId, tag) => ({ projectId, title: `Eval ${tag} ${rnd}`, description: 'd', score: 12, status: 'DRAFT' });
const eid = (x) => x.j?.evaluation?.id ?? x.j?.data?.id;
r = await call('POST', '/evaluations', ev(PA.id, 'A')); const eA = eid(r);
r = await call('POST', '/evaluations', ev(PB.id, 'B')); const eB = eid(r);
t('setup : évaluations A et B créées', !!eA && !!eB, `${eA}/${eB}`);

const mkCoord = async (tag) => {
  const email = `coord${tag}${rnd}@test.org`;
  const c = await call('POST', '/users', { firstName: 'Coord', lastName: tag, email, password: 'secret123', role: 'COORDINATOR', status: 'ACTIVE' });
  const id = c.j?.user?.id ?? c.j?.data?.id;
  const l = await login(email, 'secret123');
  return { id, token: l.j?.data?.accessToken };
};
const C1 = await mkCoord('1');   // sera affecté au projet A
const C0 = await mkCoord('0');   // jamais affecté (transition / strict)
t('setup : 2 coordinateurs connectés', !!C1.token && !!C0.token);

// ---------- Avant toute affectation ----------
r = await call('GET', '/beneficiaries', null, C1.token);
t('transition : coordinateur sans affectation voit A et B (mode non strict)', STRICT ? true : (ids(r).has(bA) && ids(r).has(bB)), D(r));

// ---------- Affectation (ADMIN) + droits de la route ----------
r = await call('POST', '/project-coordinators', { projectId: PA.id, userId: C1.id }, adm);
t('affectation C1→A = 201', r.s === 201, D(r));
const assignId = r.j?.data?.id;
r = await call('POST', '/project-coordinators', { projectId: PA.id, userId: C1.id }, adm);
t('affectation en double = idempotente (201)', r.s === 201, D(r));
r = await call('POST', '/project-coordinators', { projectId: PB.id, userId: A.j.data.user?.id ?? 1 }, adm);
t('affecter un non-coordinateur = 400', r.s === 400, D(r));
r = await call('POST', '/project-coordinators', { projectId: 999999, userId: C1.id }, adm);
t('affectation projet inconnu = 404', r.s === 404, D(r));
r = await call('POST', '/project-coordinators', { projectId: PB.id, userId: C1.id }, C1.token);
t('un coordinateur ne peut pas s\'affecter lui-même (403)', r.s === 403, D(r));
r = await call('GET', '/project-coordinators', null, C1.token);
t('un coordinateur ne peut pas lister les affectations (403)', r.s === 403, D(r));

// ---------- Bénéficiaires ----------
r = await call('GET', '/beneficiaries', null, C1.token);
t('bénéficiaires : C1 voit A', ids(r).has(bA), D(r));
t('bénéficiaires : C1 ne voit PAS B', !ids(r).has(bB));
r = await call('GET', `/beneficiaries?projectId=${PB.id}`, null, C1.token);
t('bénéficiaires ?projectId=B = 403', r.s === 403, D(r));
r = await call('GET', `/beneficiaries/${bA}`, null, C1.token); t('bénéficiaire A = 200', r.s === 200, D(r));
r = await call('GET', `/beneficiaries/${bB}`, null, C1.token); t('bénéficiaire B = 403', r.s === 403, D(r));
r = await call('PUT', `/beneficiaries/${bB}`, { ...ben(PB.id, 'Pirate') }, C1.token); t('modifier bénéficiaire B = 403', r.s === 403, D(r));
r = await call('DELETE', `/beneficiaries/${bB}`, null, C1.token); t('supprimer bénéficiaire B = 403', r.s === 403, D(r));
r = await call('POST', '/beneficiaries', ben(PB.id, 'Intrus'), C1.token); t('créer un bénéficiaire dans B = 403', r.s === 403, D(r));
r = await call('PUT', `/beneficiaries/${bA}`, ben(PB.id, 'Deplace'), C1.token); t('déplacer un bénéficiaire A vers B = 403', r.s === 403, D(r));
r = await call('POST', '/beneficiaries', ben(PA.id, 'Legit'), C1.token); t('créer un bénéficiaire dans A = 201', r.s === 201, D(r));
r = await call('GET', `/beneficiaries/${bB}`, null, adm); t('ADMIN voit toujours B', r.s === 200, D(r));
r = await call('GET', '/beneficiaries', null, adm); t('ADMIN voit A et B dans la liste', ids(r).has(bA) && ids(r).has(bB));

// ---------- Évaluations ----------
r = await call('GET', '/evaluations', null, C1.token);
t('évaluations : C1 voit A', ids(r).has(eA), D(r));
t('évaluations : C1 ne voit PAS B', !ids(r).has(eB));
r = await call('GET', `/evaluations/${eB}`, null, C1.token); t('évaluation B = 403', r.s === 403, D(r));
r = await call('GET', `/evaluations/${eA}`, null, C1.token); t('évaluation A = 200', r.s === 200, D(r));
r = await call('POST', '/evaluations', ev(PB.id, 'Intrus'), C1.token); t('créer une évaluation dans B = 403', r.s === 403, D(r));
r = await call('PUT', `/evaluations/${eB}`, ev(PB.id, 'Pirate'), C1.token); t('modifier évaluation B = 403', r.s === 403, D(r));

// ---------- Ménages vulnérables ----------
r = await call('GET', '/vulnerability/households', null, C1.token);
const hh = new Set((r.j?.data?.households ?? []).map((h) => h.id));
t('ménages : C1 voit le ménage A', hh.has(bA), D(r));
t('ménages : C1 ne voit PAS le ménage B', !hh.has(bB));
r = await call('GET', '/vulnerability/households', null, adm);
t('ménages : ADMIN voit A et B', (r.j?.data?.households ?? []).some((h) => h.id === bB));

// ---------- Statut du parcours (abandon) ----------
r = await call('GET', '/journey', null, C1.token);
t('parcours : C1 voit A et pas B', ids(r).has(bA) && !ids(r).has(bB), D(r));
r = await call('PUT', `/journey/beneficiary/${bB}`, { status: 'DROPPED_OUT', dropoutReason: 'x' }, C1.token); t('parcours : modifier B = 403', r.s === 403, D(r));
r = await call('PUT', `/journey/beneficiary/${bA}`, { status: 'BIDON' }, C1.token); t('parcours : statut invalide = 400', r.s === 400, D(r));
r = await call('PUT', `/journey/beneficiary/${bA}`, { status: 'DROPPED_OUT', dropoutReason: 'déménagement' }, C1.token); t('parcours : abandon A = 200', r.s === 200, D(r));
r = await call('PUT', `/journey/beneficiary/999999`, { status: 'COMPLETED' }, adm); t('parcours : bénéficiaire inconnu = 404', r.s === 404, D(r));
r = await call('PUT', `/journey/beneficiary/${bB}`, { status: 'COMPLETED' }, adm); t('parcours : ADMIN termine B = 200', r.s === 200, D(r));
r = await call('GET', `/journey/summary?projectId=${PB.id}`, null, C1.token); t('parcours : summary projet B = 403', r.s === 403, D(r));
r = await call('GET', `/journey/summary?projectId=${PA.id}`, null, C1.token);
t('parcours : summary A = 1 abandon, taux 100 %', r.s === 200 && r.j?.data?.counts?.DROPPED_OUT === 1 && r.j?.data?.rate === 1, D(r));
r = await call('GET', '/journey/labels', null, C1.token); t('parcours : labels réservés ADMIN/DIRECTION (403)', r.s === 403, D(r));
r = await call('GET', '/journey/labels', null, adm);
const lab = (r.j?.data ?? []);
t('parcours : labels ADMIN = A→1, B→0', lab.find((x) => x.beneficiaryId === bA)?.dropout === 1 && lab.find((x) => x.beneficiaryId === bB)?.dropout === 0, D(r));

// ---------- Suivi post-programme ----------
for (const P of [PA, PB]) await call('PUT', `/projects/${P.id}`, { ...P.body, status: 'COMPLETED', endDate: '2026-05-01' }, adm);
await call('POST', '/follow-ups/sync', null, adm);
const fl = await call('GET', `/follow-ups?projectId=${PA.id}`, null, adm);
const flB = await call('GET', `/follow-ups?projectId=${PB.id}`, null, adm);
const fA = rows(fl).find((x) => x.beneficiary?.projectId === PA.id)?.id;
const fB = rows(flB).find((x) => x.beneficiary?.projectId === PB.id)?.id;
if (!fA || !fB) {
  skip('suivi post-programme : aucune relance générée (règles de calendrier) — vérifier manuellement');
} else {
  r = await call('GET', '/follow-ups', null, C1.token);
  t('relances : C1 ne voit que A', rows(r).length > 0 && rows(r).every((x) => x.beneficiary?.projectId === PA.id), D(r));
  r = await call('GET', `/follow-ups?projectId=${PB.id}`, null, C1.token); t('relances ?projectId=B = 403', r.s === 403, D(r));
  r = await call('GET', '/follow-ups/impact', null, C1.token); t('relances impact sans projectId = 400', r.s === 400, D(r));
  r = await call('GET', `/follow-ups/impact?projectId=${PA.id}`, null, C1.token); t('relances impact A = 200', r.s === 200, D(r));
  r = await call('PUT', `/follow-ups/${fB}/complete`, { occupation: 'EMPLOYED' }, C1.token); t('compléter relance B = 403', r.s === 403, D(r));
  r = await call('PUT', `/follow-ups/${fA}/complete`, { occupation: 'EMPLOYED', satisfaction: 4 }, C1.token); t('compléter relance A = 200', r.s === 200, D(r));
}

// ---------- Coordinateur jamais affecté ----------
r = await call('GET', '/beneficiaries', null, C0.token);
if (STRICT) {
  t('strict : coordinateur sans affectation ne voit rien', r.s === 200 && rows(r).length === 0, D(r));
  r = await call('GET', `/beneficiaries/${bA}`, null, C0.token); t('strict : fiche A = 403', r.s === 403, D(r));
} else {
  t('transition : coordinateur sans affectation garde l\'accès historique', ids(r).has(bA) && ids(r).has(bB), D(r));
}

// ---------- Retrait de l'affectation ----------
if (assignId) {
  r = await call('DELETE', `/project-coordinators/${assignId}`, null, adm); t('retrait affectation = 200', r.s === 200, D(r));
  r = await call('GET', '/beneficiaries', null, C1.token);
  t(STRICT ? 'strict : après retrait, C1 ne voit plus rien' : 'après retrait, C1 retrouve l\'accès historique (non strict)',
    STRICT ? rows(r).length === 0 : ids(r).has(bB), D(r));
}

console.log(`PASS ${pass} FAIL ${fail.length} SKIP ${skipped.length}${STRICT ? ' (mode strict)' : ''}`);
for (const s of skipped) console.log('SKIP:', s);
for (const f of fail) console.log('FAIL:', f);
process.exit(fail.length ? 1 : 0);
