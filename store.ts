import fs from 'node:fs/promises';
import path from 'node:path';

const dir = path.join(process.cwd(), '.data');
async function ensure(){ await fs.mkdir(dir,{recursive:true}); }
export async function readJson<T>(name:string, fallback:T):Promise<T>{
  await ensure();
  try { return JSON.parse(await fs.readFile(path.join(dir,name),'utf8')) as T; } catch { return fallback; }
}
export async function writeJson<T>(name:string, value:T){ await ensure(); await fs.writeFile(path.join(dir,name), JSON.stringify(value,null,2),'utf8'); }
