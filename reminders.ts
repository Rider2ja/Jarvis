import { readJson, writeJson } from './store';
type Reminder={id:string;text:string;when:string;done:boolean};
export async function addReminder(text:string,when:string){ const a=await readJson<Reminder[]>('reminders.json',[]); const r={id:crypto.randomUUID(),text,when,done:false}; a.push(r); await writeJson('reminders.json',a); return r; }
export async function listReminders(){ return readJson<Reminder[]>('reminders.json',[]); }
