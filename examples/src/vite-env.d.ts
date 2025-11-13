/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string
  readonly VITE_USE_MOCK_EMBEDDINGS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

