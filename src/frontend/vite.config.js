import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  root: path.resolve(__dirname),
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
});