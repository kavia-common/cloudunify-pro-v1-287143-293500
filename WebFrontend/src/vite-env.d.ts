/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_WS_URL?: string;

  // Legacy CRA-style env vars (supported in this project via vite.config.ts envPrefix)
  readonly REACT_APP_API_BASE?: string;
  readonly REACT_APP_BACKEND_URL?: string;
  readonly REACT_APP_WS_URL?: string;
  readonly REACT_APP_PORT?: string;
  readonly REACT_APP_NODE_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
