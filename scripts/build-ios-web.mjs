import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const web=path.join(root,'web');
const input=fs.readFileSync(path.join(web,'index.html'),'utf8');
const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script');
const escapeStyle=s=>s.replace(/<\/style/gi,'<\\/style');
let html=input.replace(/\s*<link rel="(?:manifest|icon)"[^>]*>/g,'');
html=html.replace('<link rel="stylesheet" href="styles.css">',`<style>${escapeStyle(fs.readFileSync(path.join(web,'styles.css'),'utf8'))}</style>`);
for(const filename of ['app-config.js','arcade-rules.js','mobile-utils.js','game.js','online.js']){
  const tag=`<script src="${filename}" defer></script>`;
  if(!html.includes(tag))throw Error(`Expected script tag missing: ${tag}`);
  let code=fs.readFileSync(path.join(web,filename),'utf8');
  if(filename==='app-config.js')code="window.NEON_API_BASE = 'https://dulmens.dk/neon';";
  html=html.replace(tag,`<script>${escapeScript(code)}</script>`);
}
if(/<(?:script|link)[^>]+(?:src|href)="(?:\.\/)?(?:game|styles|online|mobile-utils|arcade-rules|app-config)\./.test(html))throw Error('Unbundled game asset');
const output=path.join(root,'expo-ios','neon-bundle.generated.json');
fs.writeFileSync(output,JSON.stringify({html,version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version})+'\n');
console.log(`Generated embedded offline Neon for Expo (${Buffer.byteLength(html)} bytes)`);
