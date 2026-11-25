import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { defineConfig } from 'vite';

const archiveTag = 'ui-assets-20261125';
const repository = 'https://github.com/AlbertXXuu/alvenx-liquid-glass';
const recordPath = fileURLToPath(new URL('./docs/design-record.md', import.meta.url));
const recordModule = 'virtual:alvenx-design-record';
const trustedSource = `${repository}/blob/${archiveTag}/docs/design-record.md`;
const recordMarkdown = new Marked({
  renderer: {
    html() { return ''; },
    image() { return ''; },
    heading({ depth, tokens }) {
      if (depth === 1) return '';
      const level = Math.min(6, depth + 1);
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
  },
  walkTokens(token) {
    if (token.type !== 'link') return;
    try {
      const link = new URL(token.href, trustedSource);
      token.href = link.protocol === 'https:' ? link.href : '#asset-record';
    } catch {
      token.href = '#asset-record';
    }
  },
});

export default defineConfig({
  base: './',
  plugins: [{
    name: 'alvenx-design-record',
    resolveId(id) { return id === recordModule ? '\0' + id : null; },
    async load(id) {
      if (id !== '\0' + recordModule) return null;
      this.addWatchFile(recordPath);
      const markup = recordMarkdown.parse(await readFile(recordPath, 'utf8'));
      return `export const archiveTag = ${JSON.stringify(archiveTag)}; export const markup = ${JSON.stringify(markup)};`;
    },
  }],
  build: {
    outDir: 'site-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        showcase: 'index.html',
        mobileReview: 'mobile-review.html',
        fieldSizingReview: 'field-sizing-review.html',
        buddingRefinementReview: 'showcase/budding-refinement-review/index.html',
      },
    },
  },
});
