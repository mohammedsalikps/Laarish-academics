import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { mentorApiPlugin } from './server/vitePlugin.ts';

export default defineConfig(({ mode }) => {
  // Server-only variables (e.g. ANTHROPIC_API_KEY) are read here for the API
  // middleware. Only VITE_* variables are ever exposed to browser code.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    plugins: [react(), mode === 'test' ? null : mentorApiPlugin(env)],
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 600,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts', 'server/**/*.test.ts'],
      css: false,
      // Full learning-flow tests click through several lazily loaded screens.
      testTimeout: 30_000,
    },
  };
});
