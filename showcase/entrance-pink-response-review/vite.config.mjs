import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'./',build:{outDir:'output/playwright/entrance-pink-response-20261023/dist',emptyOutDir:true,rollupOptions:{input:fileURLToPath(new URL('./index.html',import.meta.url))}}});
