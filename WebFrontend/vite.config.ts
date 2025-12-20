/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Create a simple health endpoint for both dev and preview to signal readiness.
function healthPlugin() {
  const handler = (_req: any, res: any) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('ok');
  };

  return {
    name: 'health-endpoint',
    configureServer(server: any) {
      // Support both /health and /healthz (some preview/CI systems expect /healthz)
      server.middlewares.use('/health', handler);
      server.middlewares.use('/healthz', handler);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/health', handler);
      server.middlewares.use('/healthz', handler);
    }
  };
}

/**
 * SPA history fallback plugin:
 * - Ensures that non-asset, non-API GET requests return index.html
 * - Avoids 404 on client-side routes (e.g., /app) when refreshing or deep-linking
 * - Keeps /health and static assets untouched
 */
function spaFallbackPlugin() {
  const isAssetPath = (url: string): boolean => {
    // Treat common asset URL patterns as assets so they bypass HTML fallback
    if (
      url.startsWith('/@vite') ||
      url.startsWith('/node_modules') ||
      url.startsWith('/assets') ||
      url.startsWith('/@fs') ||
      url.includes('/src/')
    ) return true;

    // File extension indicates asset (js, css, images, fonts, maps, wasm, etc.)
    if (/\.(js|mjs|cjs|ts|tsx|jsx|css|map|json|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|wasm|txt|xml)$/i.test(url)) {
      return true;
    }
    return false;
  };

  const shouldServeIndex = (req: any): boolean => {
    const method = req?.method || 'GET';
    if (method !== 'GET') return false;

    const url: string = req?.url || '/';
    // Keep healthcheck and API calls intact
    if (url.startsWith('/health') || url.startsWith('/healthz') || url.startsWith('/api/')) return false;

    if (isAssetPath(url)) return false;

    const accept = req.headers?.accept || '';
    return typeof accept === 'string' && accept.includes('text/html');
  };

  const readIndex = (root: string): string => {
    return fs.readFileSync(path.resolve(root, 'index.html'), 'utf-8');
  };

  return {
    name: 'spa-fallback',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        try {
          if (!shouldServeIndex(req)) return next();
          const url: string = req.url || '/';
          const root = server.config?.root || process.cwd();
          const html = readIndex(root);
          const transformed = await server.transformIndexHtml(url, html);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(transformed);
        } catch (err: any) {
          next(err);
        }
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        try {
          if (!shouldServeIndex(req)) return next();
          const url: string = req.url || '/';
          const root = server.config?.root || process.cwd();
          const html = readIndex(root);
          const maybeTransform = (server as any).transformIndexHtml;
          const transformed = typeof maybeTransform === 'function'
            ? await maybeTransform(url, html)
            : html;
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(transformed);
        } catch (err: any) {
          next(err);
        }
      });
    }
  };
}

// NOTE: In preview environments behind proxies, hostnames may vary. Allow all hosts to avoid
// "Blocked request. This host is not allowed" issues.
const devServer = {
  host: '0.0.0.0',
  port: 3000,
  strictPort: true,
  open: false,
  allowedHosts: true
} as any;

const previewServer = {
  host: '0.0.0.0',
  port: 3000,
  strictPort: true,
  allowedHosts: true
} as any;

// PUBLIC_INTERFACE
export default defineConfig({
  // Allow legacy CRA-style env vars in preview/CI while still preferring VITE_* in code.
  envPrefix: ['VITE_', 'REACT_APP_'],
  plugins: [react(), healthPlugin(), spaFallbackPlugin()],
  server: devServer,
  preview: previewServer,

  // Vitest configuration:
  // - jsdom provides localStorage/sessionStorage for auth hydration/storage tests
  // - setupFiles loads jest-dom matchers used by setupTests.js
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js']
  }
});
