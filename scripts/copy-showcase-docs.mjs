import { mkdir, readdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('site-dist/docs', { recursive: true });
for (const file of await readdir('docs')) if (file.endsWith('.md')) await copyFile(`docs/${file}`, `site-dist/docs/${file}`);
await copyFile('docs/hover-comparison.html', 'site-dist/docs/hover-comparison.html');
// Font agreements travel with every hosted build, not just the source package.
await mkdir('site-dist/licenses', { recursive: true });
await copyFile('LICENSE-NOTICE.md', 'site-dist/licenses/LICENSE-NOTICE.md');
await copyFile('assets/fonts/InstrumentSans-OFL.txt', 'site-dist/licenses/InstrumentSans-OFL.txt');
for (const file of await readdir('assets/fonts/misans')) {
  if (/NOTICE|agreement|license/i.test(file)) await copyFile(`assets/fonts/misans/${file}`, `site-dist/licenses/${file}`);
}
const thirdParty = [];
for (const name of ['react', 'react-dom', 'scheduler']) {
  thirdParty.push(`${name}\n${'='.repeat(name.length)}\n${await readFile(`node_modules/${name}/LICENSE`, 'utf8')}`);
}
await writeFile('site-dist/licenses/THIRD-PARTY-NOTICES.txt', thirdParty.join('\n\n'));
