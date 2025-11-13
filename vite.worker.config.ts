import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist/workers',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: 'src/workers/umap-placement.worker.ts',
      formats: ['es'],
      fileName: () => 'umap-worker.js',
    },
  },
})
