import { defineConfig } from 'vitest/config';

// The dashboard in web/ has its own project and its own test setup.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
