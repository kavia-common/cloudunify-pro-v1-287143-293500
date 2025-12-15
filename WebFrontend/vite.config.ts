import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Create a simple health endpoint for both dev and preview to signal readiness.
function healthPlugin() {
  return {
    name: 'health-endpoint',
    configureServer(server: any) {
      server.middlewares.use('/health', (_req: any, res: any) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('ok');
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/health', (_req: any, res: any) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('ok');
      });
    }
  };
}

// PUBLIC_INTERFACE
export default defineConfig({
  plugins: [react(), healthPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    open: false
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true
  },
  test: {
    environment: 'node',
    include: ['src/lib/mapping/**/*.test.ts']
  }
});
