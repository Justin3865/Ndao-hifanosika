import test from "node:test";
import assert from "node:assert/strict";
import { __resetQueueForTests, enqueue, queueStats, registerJob, whenIdle } from "../src/utils/jobQueue";

process.env.NODE_ENV = "test";

test("exécute une tâche enregistrée", async () => {
  __resetQueueForTests();
  const seen: number[] = [];
  registerJob<number>("ok", async (n) => { seen.push(n); });
  await enqueue("ok", 1); await enqueue("ok", 2);
  await whenIdle();
  assert.deepEqual(seen.sort(), [1, 2]);
  assert.equal(queueStats().completed, 2);
  assert.equal(queueStats().driver, "memory");
});

test("réessaie puis réussit (dégradation gracieuse)", async () => {
  __resetQueueForTests();
  let calls = 0;
  registerJob("flaky", async () => { calls += 1; if (calls < 3) throw new Error("temporaire"); });
  await enqueue("flaky", {}, { attempts: 3, backoffMs: 5 });
  await whenIdle();
  assert.equal(calls, 3);
  assert.equal(queueStats().completed, 1);
  assert.equal(queueStats().failed, 0);
});

test("abandonne après le nombre d'essais, sans bloquer la file", async () => {
  __resetQueueForTests();
  registerJob("bad", async () => { throw new Error("toujours en erreur"); });
  let after = false;
  registerJob("after", async () => { after = true; });
  await enqueue("bad", {}, { attempts: 2, backoffMs: 5 });
  await enqueue("after", {});
  await whenIdle();
  assert.equal(queueStats().failed, 1);
  assert.equal(after, true);
});

test("respecte la concurrence maximale", async () => {
  __resetQueueForTests();
  process.env.QUEUE_CONCURRENCY = "2";
  let running = 0, peak = 0;
  registerJob("slow", async () => { running++; peak = Math.max(peak, running); await new Promise((r) => setTimeout(r, 15)); running--; });
  for (let i = 0; i < 6; i++) await enqueue("slow", i);
  await whenIdle();
  assert.equal(peak, 2);
  assert.equal(queueStats().completed, 6);
});
