import knex from 'knex';
import knexConfig from '../knexfile.js';
import mysql from 'mysql2/promise';

const db = knex(knexConfig);

export default db;

export async function ensureSchema() {
  const hasJobs = await db.schema.hasTable('jobs');
  if (!hasJobs) {
    await db.schema.createTable('jobs', (table) => {
      table.string('id', 64).primary();
      table.string('name', 255);
      table.string('cron_time', 64);
      table.text('query_text');
      table.string('status', 20);
      table.dateTime('created_at');
    });
  }

  const hasLogs = await db.schema.hasTable('job_logs');
  if (!hasLogs) {
    await db.schema.createTable('job_logs', (table) => {
      table.increments('id').primary();
      table.string('job_id', 64);
      table.dateTime('executed_at');
      table.json('result_json');
    });
  }
}

export async function createDatabaseIfNotExists() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS || '';
  const dbName = process.env.DB_NAME;
  const conn = await mysql.createConnection({ host, user, password });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await conn.end();
}