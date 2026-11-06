// Matricule automatique : projets (NH-AAAA-PRJ-0001) et bénéficiaires (NH-AAAA-BEN-0001)
// FICHIER NOUVEAU : ne modifie aucune fonctionnalité existante.
// Ovay ny import Prisma raha tsy mitovy ny lalanao.
const prisma = require('../config/prisma');

const year = () => new Date().getFullYear();

function makeMatricule({ model, field, prefix }) {
  const re = new RegExp(`^NH-\\d{4}-${prefix}-(\\d+)$`);
  const format = (n) => `NH-${year()}-${prefix}-${String(n).padStart(4, '0')}`;

  // Isa manaraka = isa lehibe indrindra efa misy + 1 (manomboka amin'ny farany)
  async function next(client = prisma) {
    const rows = await client[model].findMany({ select: { [field]: true } });
    let max = 0;
    for (const r of rows) {
      const m = re.exec(r[field] || '');
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return format(max + 1);
  }

  // Remettre en ordre (0001, 0002, ...) selon la date de création.
  // 2 phases pour éviter tout conflit @unique. Les relations utilisent l'id : rien ne casse.
  async function renumber(orderBy = { createdAt: 'asc' }) {
    return prisma.$transaction(
      async (tx) => {
        const rows = await tx[model].findMany({ select: { id: true }, orderBy });
        let i = 1;
        for (const r of rows)
          await tx[model].update({ where: { id: r.id }, data: { [field]: `TMP-${i++}` } });
        i = 1;
        for (const r of rows)
          await tx[model].update({ where: { id: r.id }, data: { [field]: format(i++) } });
        return rows.length;
      },
      { timeout: 60000 }
    );
  }

  // Création sûre : génère si vide, réessaie si deux créations simultanées
  async function createWith(provided, createFn) {
    const given = provided && String(provided).trim() ? String(provided).trim() : null;
    for (let t = 0; t < 4; t++) {
      const value = given || (await next());
      try {
        return await createFn(value);
      } catch (e) {
        if (e.code === 'P2002' && !given) continue;
        throw e;
      }
    }
    throw new Error('Impossible de générer le matricule');
  }

  return { next, renumber, createWith, format };
}

module.exports = {
  projectCode: makeMatricule({ model: 'project', field: 'code', prefix: 'PRJ' }),
  beneficiaryMatricule: makeMatricule({ model: 'beneficiary', field: 'matricule', prefix: 'BEN' }),
};
