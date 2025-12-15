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

// Allow-list the reverse proxy hostname to avoid "blocked host" errors behind HTTPS proxying.
const ALLOWED_HOSTS = ['vscode-internal-17021-beta.beta01.cloud.kavia.ai'];

// Note: We cast to any to remain compatible with older Vite type definitions while
// still enabling the runtime-supported `allowedHosts` option.
const devServer = {
  host: '0.0.0.0',
  port: 3000,
  strictPort: true,
  open: false,
  allowedHosts: ALLOWED_HOSTS
} as any;

const previewServer = {
  host: '0.0.0.0',
  port: 3000,
  strictPort: true,
  allowedHosts: ALLOWED_HOSTS
} as any;

// PUBLIC_INTERFACE
export default defineConfig({
  plugins: [react(), healthPlugin()],
  server: devServer,
  preview: previewServer,
  test: {
    environment: 'node',
    include: ['src/lib/mapping/**/*.test.ts']
  }
});
