import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app lives in web/ and builds to dist/, which Vercel serves as static files.
// In development, /api is proxied to the Express server (npm run dev on port 4321).
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          emotion: ['@emotion/react', '@emotion/styled'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': `http://127.0.0.1:${process.env.API_PORT || 4321}` },
  },
});
