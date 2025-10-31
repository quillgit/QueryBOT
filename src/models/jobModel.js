import db from '../db.js';

export async function createJob(job) {
  return db('jobs').insert({
    id: job.id,
    name: job.name,
    cron_time: job.cron_time,
    query_text: job.query_text,
    status: job.status || 'active',
    created_at: new Date()
  });
}

export function getAllJobs() {
  return db('jobs').select('*').orderBy('created_at', 'desc');
}

export function getJobById(id) {
  return db('jobs').where({ id }).first();
}

export function deleteJob(id) {
  return db('jobs').where({ id }).del();
}

export function getLogs(limit = 100) {
  return db('job_logs').select('*').orderBy('executed_at', 'desc').limit(limit);
}