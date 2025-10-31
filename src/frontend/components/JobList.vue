<template>
  <div class="card">
    <div class="card-body">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h5 class="card-title mb-0">Scheduled Jobs</h5>
        <span class="text-muted small">{{ jobs.length }} jobs</span>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Cron</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in jobs" :key="job.id">
              <td>{{ job.name }}</td>
              <td><code>{{ job.cron_time }}</code></td>
              <td>
                <span class="badge" :class="job.status === 'active' ? 'text-bg-success' : 'text-bg-secondary'">{{ job.status }}</span>
              </td>
              <td>{{ formatDate(job.created_at) }}</td>
              <td class="d-flex gap-2">
                <button @click="$emit('view-job', job)" class="btn btn-outline-secondary btn-sm">View SQL</button>
                <button @click="$emit('delete-job', job.id)" class="btn btn-danger btn-sm">Delete</button>
              </td>
            </tr>
            <tr v-if="!jobs.length">
              <td colspan="5" class="text-center text-muted">No jobs scheduled</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ jobs: { type: Array, default: () => [] } });

function formatDate(d) {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}
</script>

<style scoped>
</style>