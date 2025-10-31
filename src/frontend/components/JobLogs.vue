<template>
  <div class="card">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h5 class="card-title mb-0">Execution Logs</h5>
        <span class="text-muted small">Latest first</span>
      </div>
      <div class="input-group mb-3">
        <span class="input-group-text">Filter</span>
        <input v-model="term" type="text" class="form-control" placeholder="By Job ID or text..." />
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Executed At</th>
              <th>Preview</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in filtered" :key="log.id">
              <td><code>{{ log.job_id }}</code></td>
              <td>{{ formatDate(log.executed_at) }}</td>
              <td>
                <pre class="bg-light p-2 rounded small" style="max-height: 200px; overflow:auto;">{{ jsonPreview(log.result_json) }}</pre>
              </td>
              <td>
                <button class="btn btn-outline-secondary btn-sm" @click="$emit('view-log', log)">View</button>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td colspan="4" class="text-center text-muted">No logs found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
const props = defineProps({ logs: { type: Array, default: () => [] } });
const term = ref('');
const filtered = computed(() => {
  const t = term.value.toLowerCase();
  if (!t) return props.logs;
  return props.logs.filter(l => {
    const hay = `${l.job_id} ${JSON.stringify(l.result_json)}`.toLowerCase();
    return hay.includes(t);
  });
});

function formatDate(d) {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function jsonPreview(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}
</script>

<style scoped>
</style>