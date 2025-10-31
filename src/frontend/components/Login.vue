<template>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title mb-3">Admin Login</h5>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Username</label>
          <input v-model="username" type="text" class="form-control" placeholder="admin" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Password</label>
          <input v-model="password" type="password" class="form-control" placeholder="••••••" />
        </div>
      </div>
      <div class="d-flex gap-2 justify-content-end mt-3">
        <button @click="submit" class="btn btn-primary" :disabled="loading">Login</button>
      </div>
      <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { login } from '../services/auth.js';
const emit = defineEmits(['logged-in']);
const username = ref('admin');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const res = await login(username.value, password.value);
    if (res?.token) emit('logged-in', res.user);
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
</style>