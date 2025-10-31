<template>
  <div v-if="open" class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="z-index:1050;">
    <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50" @click="$emit('close')"></div>
    <div class="modal-dialog modal-lg position-relative">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" @click="$emit('close')">Close</button>
          <button v-if="confirmText" type="button" class="btn btn-primary" @click="$emit('confirm')">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  confirmText: { type: String, default: '' }
});
defineEmits(['close', 'confirm']);
</script>

<style scoped>
</style>