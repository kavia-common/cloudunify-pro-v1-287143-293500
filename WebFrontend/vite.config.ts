import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// PUBLIC_INTERFACE
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  },
  preview: {
    port: 4173
  },
  test: {
    environment: 'node',
    include: ['src/lib/mapping/**/*.test.ts']
  }
});
