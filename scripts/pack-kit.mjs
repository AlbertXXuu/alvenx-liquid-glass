import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

// Local artifacts only: never publish, create a Git remote or change host apps.
const root = process.cwd(), release = path.join(root, 'releases');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir(release, { recursive: true });
const roots = ['src','styles','assets','docs','showcase','scripts','dist','public','work'];
const files = ['package.json','package-lock.json','tsconfig.json','tsconfig.lib.json','vite.config.mjs','vite.lib.config.mjs','index.html','mobile-review.html','tokens.json','README.md','SKILL.md','TODO.md','LICENSE-NOTICE.md','.gitignore','.gitattributes','.github/workflows/verify.yml'];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const name = `${dir}/${item.name}`;
    if (item.isDirectory()) await walk(name);
    else if (item.isFile()) files.push(name);
  }
}
for (const dir of roots) await walk(dir);
files.sort();
const hash = data => createHash('sha256').update(data).digest('hex');
const entries=[];
for (const file of files) { const data=await readFile(file);entries.push({path:file,bytes:data.length,sha256:hash(data)}); }
const manifest={version:pkg.version,baseline:'Owner-confirmed v6',baselineOwnerConfirmedOn:'2026-10-16',scope:'Reusable library and public showcase; publication authorized 2026-10-18; original prototype integration removed',files:entries};
await writeFile('KIT-MANIFEST.json', JSON.stringify(manifest,null,2)+'\n');
files.push('KIT-MANIFEST.json');
if (!process.env.npm_execpath) throw new Error('Run npm run pack:kit so the current npm CLI can create the local tarball.');
const packed=spawnSync(process.execPath,[process.env.npm_execpath,'pack','--json','--pack-destination',release],{cwd:root,encoding:'utf8'});
if(packed.status!==0)throw new Error(packed.stderr||packed.stdout||'npm pack failed');
const tarball=JSON.parse(packed.stdout)[0].filename;
files.push(`releases/${tarball}`);

// Small ZIP32 writer using Node's standard library. UTF-8 paths and deflated
// file contents; no platform shell, third-party dependency or symlinks.
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xEDB88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(data){let n=0xFFFFFFFF;for(const b of data)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xFFFFFFFF)>>>0;}
const local=[],central=[];let offset=0;
for(const file of files){
  const data=await readFile(file),compressed=deflateRawSync(data),name=Buffer.from(`alvenx-design-kit/${file}`),crc=crc32(data);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
  local.push(header,name,compressed);
  const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(0x800,8);directory.writeUInt16LE(8,10);directory.writeUInt16LE(33,14);directory.writeUInt32LE(crc,16);directory.writeUInt32LE(compressed.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(name.length,28);directory.writeUInt32LE(offset,42);
  central.push(directory,name);offset+=header.length+name.length+compressed.length;
}
const center=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(center.length,12);end.writeUInt32LE(offset,16);
const archive=Buffer.concat([...local,center,end]),zip=`alvenx-design-kit-${pkg.version}.zip`;
await writeFile(path.join(release,zip),archive);
const sums=[`${hash(archive)}  ${zip}`,`${hash(await readFile(path.join(release,tarball)))}  ${tarball}`];
await writeFile(path.join(release,'SHA256SUMS.txt'),sums.join('\n')+'\n');
console.log(JSON.stringify({zip:`releases/${zip}`,tarball:`releases/${tarball}`,files:files.length,zipBytes:archive.length,manifest:'KIT-MANIFEST.json'},null,2));
