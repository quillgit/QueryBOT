import axios from 'axios';
// Match dynamic base logic used by services/api.js
const BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

export function setAuthHeader(token) {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}

export async function login(username, password) {
  const { data } = await axios.post(`${BASE}/auth/login`, { username, password });
  const token = data?.token;
  if (token) {
    localStorage.setItem('token', token);
    setAuthHeader(token);
  }
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  setAuthHeader(null);
}

export function getToken() {
  return localStorage.getItem('token');
}