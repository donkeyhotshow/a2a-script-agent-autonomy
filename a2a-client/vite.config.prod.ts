import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Production Vite Configuration (vanilla JS shell + Vue SFCs for sequence inspector)
 */
export default defineConfig({
  root: 'packages/web',
  base: process.env.NODE_ENV === 'production' ? '/ui/' : '/',
    build: {
      outDir: path.resolve(__dirname, 'public/ui'),
      emptyOutDir: true,
      target: 'es2020',
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          entryFileNames: 'js/[name]-[hash].js',
          chunkFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
              return 'img/[name]-[hash][extname]';
            }
            if (/\.css$/i.test(assetInfo.name)) {
              return 'css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'packages/web/src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
});
