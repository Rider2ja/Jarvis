import { readJson, writeJson } from './store';
type Memory={id:string;text:string;createdAt:string};
export async function saveMemory(text:string){ const a=await readJson<Memory[]>('memory.json',[]); const m={id:crypto.randomUUID(),text,createdAt:new Date().toISOString()}; a.push(m); await writeJson('memory.json',a); return m; }
export async function searchMemory(q:string){ const a=await readJson<Memory[]>('memory.json',[]); const terms=q.toLowerCase().split(/\s+/).filter(Boolean); return a.filter(m=>terms.some(t=>m.text.toLowerCase().includes(t))).slice(-20); }
