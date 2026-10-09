/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "local" builds the browser-only (localStorage) version. */
  readonly VITE_STORAGE?: string;
  /** API base URL for server mode; defaults to "/api". */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
