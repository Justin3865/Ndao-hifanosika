const { readdirSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const dir = join(__dirname, "..", ".test-build", "test");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".test.js"))
  .map((f) => join(dir, f));

if (files.length === 0) {
  console.error("Aucun test compilé dans " + dir);
  process.exit(1);
}

const r = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(r.status ?? 1);