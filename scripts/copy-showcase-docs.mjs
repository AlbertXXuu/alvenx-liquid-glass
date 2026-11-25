import { mkdir, readdir, copyFile, readFile, writeFile, cp } from 'node:fs/promises';
import { join } from 'node:path';
const output = process.argv[2] ?? 'site-dist';
const docs = join(output, 'docs');
const licenses = join(output, 'licenses');
await mkdir(docs, { recursive: true });
for (const file of await readdir('docs')) if (file.endsWith('.md')) await copyFile(`docs/${file}`, join(docs, file));
await copyFile('docs/hover-comparison.html', join(docs, 'hover-comparison.html'));
await copyFile('tokens.json', join(output, 'tokens.json'));
// Reviewed records are public/sanitized. Do not copy local docs/validation,
// which can contain machine-specific install paths and unreviewed raw logs.
for(const directory of ['reviews','baseline','releases'])await cp(`docs/${directory}`,join(docs, directory),{recursive:true});
// Font agreements travel with every hosted build, not just the source package.
await mkdir(licenses, { recursive: true });
await copyFile('LICENSE-NOTICE.md', join(licenses, 'LICENSE-NOTICE.md'));
await copyFile('assets/fonts/InstrumentSans-OFL.txt', join(licenses, 'InstrumentSans-OFL.txt'));
for (const file of await readdir('assets/fonts/misans')) {
  if (/NOTICE|agreement|license/i.test(file)) await copyFile(`assets/fonts/misans/${file}`, join(licenses, file));
}
const thirdParty = [];
for (const name of ['react', 'react-dom', 'scheduler']) {
  thirdParty.push(`${name}\n${'='.repeat(name.length)}\n${await readFile(`node_modules/${name}/LICENSE`, 'utf8')}`);
}
await writeFile(join(licenses, 'THIRD-PARTY-NOTICES.txt'), thirdParty.join('\n\n'));
