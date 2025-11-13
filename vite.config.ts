import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'

export default defineConfig(({ command, mode }) => {
  const isLibraryBuild = command === 'build' && mode === 'library'
  // Library build mode
  if (isLibraryBuild) {
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
          fileName: format => `living-hive-react.${format === 'es' ? 'js' : 'umd.cjs'}`,
        },
        emptyOutDir: false,
        rollupOptions: {
          external: [
            'react',
            'react-dom',
            'tailwindcss',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
          output: {
            globals: {
              clsx: 'clsx',
              'tailwind-merge': 'tailwind-merge',
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
    envDir: __dirname, // Look for .env files in root directory
    resolve: {
      alias: {
        '@hively/living-hive': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      open: true,
      fs: {
        allow: [__dirname],
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
