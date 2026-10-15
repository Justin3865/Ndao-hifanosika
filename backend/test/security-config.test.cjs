const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('configuration exige deux secrets JWT séparés', () => {
  const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.match(envExample, /^JWT_SECRET=.+$/m);
  assert.match(envExample, /^JWT_REFRESH_SECRET=.+$/m);
  assert.notEqual(envExample.match(/^JWT_SECRET=(.*)$/m)?.[1], envExample.match(/^JWT_REFRESH_SECRET=(.*)$/m)?.[1]);
});

test('réinitialisation mot de passe utilise jetons hachés et expiration', () => {
  const controller = fs.readFileSync(path.join(root, 'src/controllers/auth.controller.ts'), 'utf8');
  assert.match(controller, /createHash\("sha256"\)/);
  assert.match(controller, /30 \* 60 \* 1000/);
  assert.match(controller, /usedAt/);
  assert.match(controller, /RESEND_API_KEY/);
});

test('refresh tokens révoqués sont stockés sous forme de hash et vérifiés', () => {
  const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
  const controller = fs.readFileSync(path.join(root, 'src/controllers/auth.controller.ts'), 'utf8');
  assert.match(schema, /model RevokedRefreshToken/);
  assert.match(controller, /hashRefreshToken/);
  assert.match(controller, /prisma\.revokedRefreshToken\.findUnique/);
  assert.match(controller, /prisma\.revokedRefreshToken\.create/);
});
