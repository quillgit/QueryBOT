<template>
  <div class="bg-light min-vh-100">
    <header class="navbar navbar-light bg-white border-bottom">
      <div class="container py-3 d-flex align-items-center justify-content-between">
        <div>
          <h1 class="h4 mb-0">Query Bot Admin</h1>
          <small class="text-muted">Schedule, execute, and review MySQL queries</small>
        </div>
        <div class="d-flex gap-2">
          <a :href="docsUrl" target="_blank" class="btn btn-outline-primary">API Docs</a>
          <button class="btn btn-outline-secondary" @click="refreshData">Refresh</button>
          <button v-if="authed" class="btn btn-outline-danger" @click="doLogout">Logout</button>
        </div>
      </div>
    </header>
    <main class="container py-4">
      <div v-if="errors.length" class="alert alert-danger d-flex justify-content-between align-items-start" role="alert">
        <div>
          <strong>Backend Errors Detected:</strong>
          <ul class="mb-0 mt-2 ps-3">
            <li v-for="(err, idx) in errors" :key="idx" class="small">{{ err }}</li>
          </ul>
        </div>
        <div class="ms-3 d-flex flex-column align-items-end">
          <button class="btn btn-sm btn-outline-light text-dark" @click="viewErrors">View details</button>
          <button class="btn btn-sm btn-outline-secondary mt-2" @click="clearErrors">Dismiss</button>
        </div>
      </div>
      <div class="row g-4">
        <div class="col-lg-8">
          <div v-if="authed">
            <QueryForm @run-now="onRunNow" @schedule-job="onScheduleJob" />
          </div>
          <div v-else class="card">
            <div class="card-body">
              <h5 class="card-title mb-2">Login Required</h5>
              <p class="text-muted">Please login to run or schedule queries.</p>
              <Login @logged-in="onLoggedIn" />
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title mb-2">Tips</h5>
              <ul class="text-muted small mb-0">
                <li>Use safe SELECT queries to preview data.</li>
                <li>Cron example: <code>0 8 * * *</code> (08:00 daily).</li>
                <li>Results and errors are saved to logs.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <section class="row g-4 mt-1" v-if="authed">
        <div class="col-lg-6">
          <JobList :jobs="jobs" @delete-job="onDeleteJob" @view-job="onViewJob" />
        </div>
        <div class="col-lg-6">
          <JobLogs :logs="logs" @view-log="onViewLog" />
        </div>
      </section>
      <section v-else class="row g-4 mt-1">
        <div class="col-12">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title mb-2">Login Required</h5>
              <p class="text-muted">Please login to view scheduled jobs and execution logs.</p>
              <Login @logged-in="onLoggedIn" />
            </div>
          </div>
        </div>
      </section>
    </main>

    <Modal :open="modalOpen" :title="modalTitle" @close="closeModal">
      <pre class="small bg-light p-3 rounded" style="max-height: 70vh; overflow:auto;">{{ modalBody }}</pre>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Login from './components/Login.vue';
import QueryForm from './components/QueryForm.vue';
import JobList from './components/JobList.vue';
import JobLogs from './components/JobLogs.vue';
import Modal from './components/Modal.vue';
import { runQuery, createJob, listJobs, deleteJob, listLogs, API_BASE } from './services/api.js';
import { getToken, logout } from './services/auth.js';

const jobs = ref([]);
const logs = ref([]);
const modalOpen = ref(false);
const modalTitle = ref('');
const modalBody = ref('');
const errors = ref([]);
const authed = ref(!!getToken());
const docsUrl = `${API_BASE.replace(/\/api$/, '')}/api-docs`;

async function refreshData() {
  errors.value = [];
  if (!authed.value) { jobs.value = []; logs.value = []; return; }
  try {
    jobs.value = await listJobs();
  } catch (e) {
    errors.value.push(normalizeError(e));
  }
  try {
    logs.value = await listLogs();
  } catch (e) {
    errors.value.push(normalizeError(e));
  }
}

async function onRunNow(query_text) {
  const res = await runQuery(query_text);
  await refreshData();
  if (res?.error) {
    modalTitle.value = 'Execution Error';
    modalBody.value = res.error;
    modalOpen.value = true;
    errors.value.push(String(res.error));
  } else {
    modalTitle.value = 'Execution Preview';
    modalBody.value = pretty(res.preview);
    modalOpen.value = true;
  }
}

async function onScheduleJob(payload) {
  const res = await createJob(payload);
  await refreshData();
  if (res?.error) {
    modalTitle.value = 'Schedule Error';
    modalBody.value = res.error;
    errors.value.push(String(res.error));
  } else {
    modalTitle.value = 'Job Scheduled';
    modalBody.value = `Job "${payload.name}" scheduled (cron: ${payload.cron_time}).`;
  }
  modalOpen.value = true;
}

async function onDeleteJob(id) {
  const res = await deleteJob(id);
  await refreshData();
  if (res?.error) {
    modalTitle.value = 'Delete Error';
    modalBody.value = res.error;
    modalOpen.value = true;
    errors.value.push(String(res.error));
  }
}

onMounted(() => {
  refreshData();
});

function onViewJob(job) {
  modalTitle.value = `Job: ${job.name}`;
  modalBody.value = `Cron: ${job.cron_time}\n\nSQL:\n${job.query_text}`;
  modalOpen.value = true;
}

function onViewLog(log) {
  modalTitle.value = `Log for Job ${log.job_id}`;
  modalBody.value = pretty(log.result_json);
  modalOpen.value = true;
}

function closeModal() { modalOpen.value = false; }

function pretty(obj) { try { return JSON.stringify(obj, null, 2); } catch { return String(obj); } }

function normalizeError(e) {
  if (!e) return 'Unknown error';
  if (typeof e === 'string') return e;
  if (e?.response?.data?.error) return e.response.data.error;
  if (e?.message) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

function viewErrors() {
  modalTitle.value = 'Backend Error Details';
  modalBody.value = errors.value.map((x, i) => `#${i + 1} ${x}`).join('\n\n');
  modalOpen.value = true;
}

function clearErrors() { errors.value = []; }

function onLoggedIn() {
  authed.value = true;
  refreshData();
}

function doLogout() {
  logout();
  authed.value = false;
}
</script>

<style scoped>
</style>