import axios from 'axios';
import { getToken, setAuthHeader } from './auth.js';

// Dynamic API base:
// - If VITE_API_BASE is provided, use it (e.g., production API URL)
// - In dev, default to localhost:3000 to talk to the backend dev server
// - In production, default to relative '/api' (same-origin)
const BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

// Initialize Authorization header from localStorage token on load
setAuthHeader(getToken());

// Export the resolved API base for other UI parts (e.g., Swagger link)
export const API_BASE = BASE;

export async function runQuery(query_text) {
  const { data } = await axios.post(`${BASE}/run`, { query_text });
  return data;
}

export async function createJob(payload) {
  const { data } = await axios.post(`${BASE}/jobs`, payload);
  return data;
}

export async function listJobs() {
  const { data } = await axios.get(`${BASE}/jobs`);
  return data;
}

export async function deleteJob(id) {
  const { data } = await axios.delete(`${BASE}/jobs/${id}`);
  return data;
}

export async function listLogs() {
  const { data } = await axios.get(`${BASE}/logs`);
  return data;
}