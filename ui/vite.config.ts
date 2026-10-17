import react from '@vitejs/plugin-react';
import path from 'node:path';
import {defineConfig} from 'vite';

// Arayüz geliştirme sunucusu; API ve dosyalar yerel pipeline sunucusuna (3030) yönlenir.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {'/api': 'http://localhost:3030', '/files': 'http://localhost:3030'},
  },
  build: {outDir: path.resolve(import.meta.dirname, '../dist/ui'), emptyOutDir: true},
});
