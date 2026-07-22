import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Agent worktrees live under .claude/worktrees and contain a full copy of
    // src/. Without this, a run picks up their tests too and reports failures
    // from a checkout that is mid-edit and not the one you are working in.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
});
