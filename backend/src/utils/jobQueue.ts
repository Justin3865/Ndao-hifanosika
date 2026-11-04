/**
 * File d'attente de tâches asynchrones (cahier des charges §7.2 : « Redis / BullMQ — optionnel »).
 *
 *  - Sans REDIS_URL (ou sans le paquet `bullmq`) : file EN MÉMOIRE (concurrence limitée,
 *    nouvelles tentatives avec délai exponentiel). Aucun prérequis → dégradation gracieuse.
 *  - Avec REDIS_URL + `npm i bullmq` : les mêmes tâches passent par Redis (persistantes,
 *    partageables entre plusieurs instances).
 *
 * Usage : registerJob("nom", async (data) => {...});  await enqueue("nom", data);
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type JobHandler<T = any> = (data: T) => Promise<void>;

export interface EnqueueOptions {
  attempts?: number;
  backoffMs?: number;
}

export interface QueueStats {
  driver: "memory" | "bullmq";
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface MemJob { name: string; data: unknown; attempts: number; backoffMs: number; tries: number }

const handlers = new Map<string, JobHandler>();
const waiting: MemJob[] = [];
let active = 0;
let delayed = 0;
let completed = 0;
let failed = 0;
let idleWaiters: Array<() => void> = [];
let driver: QueueStats["driver"] = "memory";
let bull: { queue: any } | null = null;

const concurrency = () => Math.max(1, Number(process.env.QUEUE_CONCURRENCY || 2));
const log = (level: "info" | "warn" | "error", msg: string) => {
  if (process.env.NODE_ENV !== "test") console[level === "info" ? "log" : level](`[queue] ${msg}`);
};

export function registerJob<T = any>(name: string, handler: JobHandler<T>): void {
  handlers.set(name, handler);
}

function notifyIdle() {
  if (active === 0 && delayed === 0 && waiting.length === 0) {
    const w = idleWaiters;
    idleWaiters = [];
    w.forEach((resolve) => resolve());
  }
}

function pump(): void {
  while (active < concurrency() && waiting.length > 0) {
    const job = waiting.shift()!;
    active += 1;
    void run(job);
  }
}

async function run(job: MemJob): Promise<void> {
  try {
    const handler = handlers.get(job.name);
    if (!handler) throw new Error(`Aucun gestionnaire enregistré pour « ${job.name} »`);
    await handler(job.data);
    completed += 1;
  } catch (error) {
    job.tries += 1;
    if (job.tries < job.attempts) {
      const delay = job.backoffMs * 2 ** (job.tries - 1);
      log("warn", `« ${job.name} » a échoué (essai ${job.tries}/${job.attempts}), nouvel essai dans ${delay} ms`);
      active -= 1;
      delayed += 1;
      setTimeout(() => { delayed -= 1; waiting.push(job); pump(); }, delay);
      return;
    }
    failed += 1;
    log("error", `« ${job.name} » abandonnée : ${error instanceof Error ? error.message : String(error)}`);
  }
  active -= 1;
  pump();
  notifyIdle();
}

export async function enqueue<T = any>(name: string, data: T, options: EnqueueOptions = {}): Promise<void> {
  const attempts = options.attempts ?? 3;
  const backoffMs = options.backoffMs ?? 2000;

  if (bull) {
    try {
      await bull.queue.add(name, data, { attempts, backoff: { type: "exponential", delay: backoffMs }, removeOnComplete: 500, removeOnFail: 1000 });
      return;
    } catch (error) {
      log("warn", `Redis indisponible, bascule sur la file mémoire (${error instanceof Error ? error.message : error})`);
    }
  }

  waiting.push({ name, data, attempts, backoffMs, tries: 0 });
  setImmediate(pump);
}

/** Initialise BullMQ si REDIS_URL est défini et que `bullmq` est installé ; sinon reste en mémoire. */
export async function startQueue(): Promise<QueueStats["driver"]> {
  const url = process.env.REDIS_URL;
  if (!url) return driver;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Queue, Worker } = require("bullmq");
    const connection = { url, maxRetriesPerRequest: null };
    const queue = new Queue("ndao-jobs", { connection });
    new Worker("ndao-jobs", async (job: { name: string; data: unknown }) => {
      const handler = handlers.get(job.name);
      if (!handler) throw new Error(`Aucun gestionnaire enregistré pour « ${job.name} »`);
      await handler(job.data);
    }, { connection, concurrency: concurrency() });
    bull = { queue };
    driver = "bullmq";
    log("info", "File d'attente BullMQ/Redis active");
  } catch (error) {
    log("warn", `BullMQ non disponible (${error instanceof Error ? error.message : error}) : file en mémoire`);
    driver = "memory";
  }
  return driver;
}

export function queueStats(): QueueStats {
  return { driver, waiting: waiting.length + delayed, active, completed, failed };
}

/** Résout quand la file mémoire est vide (utile pour les tests et l'arrêt propre). */
export function whenIdle(): Promise<void> {
  if (active === 0 && delayed === 0 && waiting.length === 0) return Promise.resolve();
  return new Promise((resolve) => idleWaiters.push(resolve));
}

/** Réservé aux tests. */
export function __resetQueueForTests(): void {
  handlers.clear(); waiting.length = 0; active = 0; delayed = 0; completed = 0; failed = 0; idleWaiters = []; bull = null; driver = "memory";
}
