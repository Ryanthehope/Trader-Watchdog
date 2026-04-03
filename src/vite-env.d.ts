/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APPLICATION_WEBHOOK_URL?: string;
  readonly VITE_APPLICATION_WEBHOOK_SECRET?: string;
  readonly VITE_APPLICATION_INBOX_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
