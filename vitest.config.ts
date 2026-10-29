import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Reuses the app's Vite config (React plugin) so tests compile exactly like the app.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      // src: component and hook tests. tests/static: file/config checks (node environment).
      include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
      restoreMocks: true,
    },
  }),
)
