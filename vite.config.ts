import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
  // Library build mode
  if (mode === 'library') {
    return {
      plugins: [
        react(),
        dts({
          insertTypesEntry: true,
          include: ['src/**/*'],
          exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'examples/**/*'],
        }),
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'LivingHiveReact',
          formats: ['es', 'umd'],
          fileName: (format) => `living-hive-react.${format === 'es' ? 'js' : 'umd.cjs'}`,
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'tailwindcss', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
          },
        },
      },
    }
  }

  // Examples/dev mode (default)
  return {
    plugins: [react()],
    root: resolve(__dirname, 'examples'),
    publicDir: resolve(__dirname, 'examples/public'),
    envDir: resolve(__dirname), // Look for .env files in root directory
    resolve: {
      alias: {
        '@living-hive/react': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      open: true,
      fs: {
        allow: [resolve(__dirname)],
      },
    },
    worker: {
      format: 'es',
    },
    build: {
      outDir: resolve(__dirname, 'examples/dist'),
      emptyOutDir: true,
    },
  }
})
