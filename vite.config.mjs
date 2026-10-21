import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { outDir: 'site-dist', emptyOutDir: true, rollupOptions:{input:{showcase:'index.html',mobileReview:'mobile-review.html',fieldSizingReview:'field-sizing-review.html',buddingRefinementReview:'showcase/budding-refinement-review/index.html'}} } });
