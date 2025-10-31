import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { runQuery, scheduleJob, cancelJob } from '../scheduler.js';
import { createJob, getAllJobs, deleteJob as deleteJobDb, getLogs, getJobById } from '../models/jobModel.js';

function previewRows(result) {
  try {
    const rows = Array.isArray(result) ? result : result?.[0] || result?.rows || [];
    return Array.isArray(rows) ? rows.slice(0, 10) : rows;
  } catch {
    return null;
  }
}

export async function runNow(req, res) {
  const { query_text } = req.body || {};
  if (!query_text) return res.status(400).json({ error: 'query_text required' });
  const outcome = await runQuery(query_text, 'adhoc');
  if (outcome.ok) return res.json({ message: 'Executed', preview: previewRows(outcome.result) });
  return res.status(400).json({ error: outcome.error });
}

export async function createScheduledJob(req, res) {
  const { name, cron_time, query_text } = req.body || {};
  if (!name || !cron_time || !query_text) return res.status(400).json({ error: 'name, cron_time, query_text required' });
  if (!cron.validate(cron_time)) return res.status(400).json({ error: 'Invalid cron expression' });

  // Basic destructive query guard (optional bonus)
  const lowered = String(query_text).toLowerCase();
  if (/(drop|truncate|delete\s+from)/.test(lowered)) {
    return res.status(400).json({ error: 'Destructive queries are not allowed' });
  }

  const id = uuidv4();
  const job = { id, name, cron_time, query_text, status: 'active' };
  try {
    await createJob(job);
    await scheduleJob(job);
    res.status(201).json({ id, message: 'Job scheduled' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function listJobs(req, res) {
  const jobs = await getAllJobs();
  res.json(jobs);
}

export async function deleteJob(req, res) {
  const { id } = req.params;
  try {
    const existing = await getJobById(id);
    if (!existing) return res.status(404).json({ error: 'Job not found' });
    await deleteJobDb(id);
    cancelJob(id);
    res.json({ message: 'Job deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function listLogs(req, res) {
  const logs = await getLogs(100);
  const formatted = logs.map(l => ({
    ...l,
    result_json: safeParseJson(l.result_json)
  }));
  res.json(formatted);
}

function safeParseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}