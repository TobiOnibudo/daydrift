/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Only set when the API is on a different origin than the SPA. Empty means same-origin. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
