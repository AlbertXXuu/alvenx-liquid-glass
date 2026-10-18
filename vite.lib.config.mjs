import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    outDir: 'dist', emptyOutDir: true,
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rollupOptions: { external: id => /^react(?:-dom)?(?:\/|$)/.test(id) }
  }
});
