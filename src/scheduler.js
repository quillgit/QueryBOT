import cron from 'node-cron';
import db from './db.js';
import { logJobResult } from './utils/logger.js';

const tasks = new Map();

export async function runQuery(queryText, jobId = 'adhoc') {
  try {
    const result = await db.raw(queryText);
    await logJobResult(db, jobId, result);
    return { ok: true, result };
  } catch (err) {
    await logJobResult(db, jobId, null, err);
    return { ok: false, error: err.message };
  }
}

export async function scheduleJob(job) {
  if (tasks.has(job.id)) {
    const old = tasks.get(job.id);
    old.stop();
    tasks.delete(job.id);
  }
  const task = cron.schedule(job.cron_time, async () => {
    await runQuery(job.query_text, job.id);
  });
  tasks.set(job.id, task);
}

export async function loadActiveJobs() {
  const jobs = await db('jobs').where({ status: 'active' });
  for (const job of jobs) {
    try {
      if (!cron.validate(job.cron_time)) {
        await logJobResult(db, job.id, null, new Error('Invalid cron: ' + job.cron_time));
        continue;
      }
      await scheduleJob(job);
    } catch (e) {
      await logJobResult(db, job.id, null, new Error('Schedule failed: ' + e.message));
    }
  }
}

export function cancelJob(id) {
  const task = tasks.get(id);
  if (task) {
    task.stop();
    tasks.delete(id);
  }
}