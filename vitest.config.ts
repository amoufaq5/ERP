import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts', './src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environmentMatchGlobs: [
      ['src/lib/auth/**/*.test.ts', 'node'],
      ['src/lib/security/**/*.test.ts', 'node'],
      ['src/lib/api/**/*.test.ts', 'node'],
      ['src/lib/workflow/**/*.test.ts', 'node'],
      ['src/lib/platform/**/*.test.ts', 'node'],
      ['src/test/**/*.test.ts', 'node'],
    ] as [string, string][],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**', 'src/components/**'],
      exclude: ['src/__tests__/**', 'src/test/**', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
