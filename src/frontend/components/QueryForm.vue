<template>
  <div class="card">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h5 class="card-title mb-0">Run or Schedule a Query</h5>
        <a href="https://crontab.guru/" target="_blank" rel="noreferrer" class="small">Cron help</a>
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Job Name</label>
          <input v-model="name" type="text" class="form-control" placeholder="Daily Report" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Cron Expression</label>
          <input v-model="cron_time" type="text" class="form-control" placeholder="0 8 * * *" />
          <div class="form-text">Example: 0 8 * * * (08:00 daily)</div>
        </div>
      </div>
      <div class="mt-3">
        <label class="form-label">SQL Query</label>
        <textarea v-model="query_text" rows="6" class="form-control" placeholder="SELECT COUNT(*) AS total FROM orders WHERE DATE(created_at)=CURDATE();"></textarea>
      </div>
      <div class="d-flex gap-2 justify-content-end mt-3">
        <button @click="runNow" class="btn btn-primary">Run Now</button>
        <button @click="schedule" class="btn btn-success">Schedule Query</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const emit = defineEmits(['run-now', 'schedule-job']);
const name = ref('New Job');
const query_text = ref('');
const cron_time = ref('');

function runNow() {
  if (!query_text.value) return alert('Please enter a SQL query');
  emit('run-now', query_text.value);
}

function schedule() {
  if (!query_text.value || !cron_time.value || !name.value) return alert('Please enter name, query and cron');
  emit('schedule-job', { name: name.value, cron_time: cron_time.value, query_text: query_text.value });
}
</script>

<style scoped>
</style>