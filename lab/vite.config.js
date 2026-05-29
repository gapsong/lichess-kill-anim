import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    fs: {
      // Allow Vite to read files from the project root (../src/* re-use).
      allow: ['..']
    }
  }
});
