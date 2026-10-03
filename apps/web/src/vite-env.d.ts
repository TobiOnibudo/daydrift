/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API origin, e.g. http://localhost:3000 (see docs/05-frontend.md §1). */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
