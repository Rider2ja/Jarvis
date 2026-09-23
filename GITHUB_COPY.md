# JARVIS – alle Dateien zum Kopieren in GitHub
> Lege jede Datei mit dem angegebenen Pfad an und kopiere den folgenden Inhalt hinein.

## Datei: `.env.example`

```text
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-luna
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
JARVIS_BASE_URL=http://localhost:3000

```

## Datei: `.gitignore`

```text
node_modules
.next
.env.local
.env
.data
.DS_Store

```

## Datei: `README.md`

```md
# JARVIS – Voice-first personal AI assistant

Dieses Projekt ist für Mahery gedacht. Es ist eine Next.js-App ohne Texteingabefeld: Sprache rein, Sprache raus.

## Enthalten
- Sprachsteuerung im Browser (Web Speech API)
- Sprachantworten mit ruhiger, tiefer Stimme (Browser-TTS; verfügbare Stimme hängt vom Betriebssystem ab)
- OpenAI als Gehirn
- aktuelle Websuche über OpenAI Responses API
- Rechnen/Reasoning über das Modell
- Gmail: suchen, lesen, Entwürfe, senden (Versand nur nach Bestätigung)
- Google Calendar: Termine lesen/erstellen
- lokale Memory
- Erinnerungen
- Links aus Webantworten können in der UI angezeigt werden, sofern verfügbar

## Start
1. Node.js 20+ installieren.
2. `.env.example` nach `.env.local` kopieren.
3. OpenAI API Key eintragen.
4. Für Gmail/Calendar ein Google OAuth Client-ID/Secret anlegen und die APIs aktivieren.
5. `npm install`
6. `npm run dev`
7. `http://localhost:3000` öffnen.
8. Auf **Google verbinden** klicken und Google-Zugriff erlauben.
9. Auf das Mikrofon klicken und sprechen.

## Wichtig
- `.env.local` niemals auf GitHub hochladen.
- Der Ordner `.data` enthält den Google Refresh Token und darf nicht committed werden.
- Für einen öffentlichen/produktiven Dienst braucht die OAuth-Token-Speicherung eine echte Datenbank und zusätzliche Authentifizierung.
- Browser-Spracherkennung/TTS ist die einfache erste Voice-Schicht. Die Stimme wird automatisch aus den verfügbaren deutschen Browser-Stimmen gewählt und auf ruhig/tief eingestellt. Für echte Low-Latency Speech-to-Speech kann später die OpenAI Realtime API ergänzt werden.


## Neue Stimme
JARVIS nutzt die deutsche Browser-Sprachausgabe mit ruhigerer, tieferer Einstellung (Tempo 0,92 / Tonhöhe 0,78). Die tatsächlich verfügbare Stimme hängt vom Browser und Betriebssystem ab. Für die beste Wirkung kannst du in Windows eine deutsche männliche TTS-Stimme installieren.

```

## Datei: `app/api/assistant/route.ts`

```ts
import {NextRequest,NextResponse} from 'next/server';
import OpenAI from 'openai';
import {config} from '@/lib/config';
import {gmailSearch,gmailRead,gmailDraft,gmailSend} from '@/lib/gmail';
import {calendarList,calendarCreate} from '@/lib/calendar';
import {saveMemory,searchMemory} from '@/lib/memory';
import {addReminder,listReminders} from '@/lib/reminders';

const client=new OpenAI({apiKey:config.openaiKey});
const tools:any[]=[
 {type:'web_search'},
 {type:'function',name:'gmail_search',description:'Suche E-Mails in Gmail.',parameters:{type:'object',properties:{query:{type:'string'},max:{type:'number'}},required:['query'],additionalProperties:false}},
 {type:'function',name:'gmail_read',description:'Lese eine konkrete Gmail Nachricht per ID.',parameters:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}},
 {type:'function',name:'gmail_draft',description:'Erstelle einen Gmail-Entwurf. Nicht senden.',parameters:{type:'object',properties:{to:{type:'string'},subject:{type:'string'},body:{type:'string'}},required:['to','subject','body'],additionalProperties:false}},
 {type:'function',name:'gmail_send',description:'Sende eine Gmail. Nur nach expliziter Bestätigung des Benutzers verwenden.',parameters:{type:'object',properties:{to:{type:'string'},subject:{type:'string'},body:{type:'string'}},required:['to','subject','body'],additionalProperties:false}},
 {type:'function',name:'calendar_list',description:'Zeige kommende Kalendertermine.',parameters:{type:'object',properties:{days:{type:'number'}},additionalProperties:false}},
 {type:'function',name:'calendar_create',description:'Erstelle einen Kalendertermin. ISO-Zeit verwenden.',parameters:{type:'object',properties:{summary:{type:'string'},start:{type:'string'},end:{type:'string'},description:{type:'string'}},required:['summary','start','end'],additionalProperties:false}},
 {type:'function',name:'memory_save',description:'Speichere eine nützliche persönliche Information für später.',parameters:{type:'object',properties:{text:{type:'string'}},required:['text'],additionalProperties:false}},
 {type:'function',name:'memory_search',description:'Suche gespeicherte persönliche Informationen.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false}},
 {type:'function',name:'reminder_create',description:'Erstelle eine Erinnerung. Zeitpunkt als ISO-Zeit oder verständliche Zeit speichern.',parameters:{type:'object',properties:{text:{type:'string'},when:{type:'string'}},required:['text','when'],additionalProperties:false}},
 {type:'function',name:'reminder_list',description:'Liste Erinnerungen.',parameters:{type:'object',properties:{},additionalProperties:false}}
];
const instructions=`Du bist JARVIS, Maherys persönlicher Sprachassistent. Antworte auf Deutsch, natürlich, kurz und direkt. Die Benutzeroberfläche spricht deine Antwort laut aus. Keine langen Listen, außer Mahery verlangt sie. Du kannst rechnen und logisch denken. Für aktuelle Informationen nutze Websuche. Bei E-Mails: Lesen/Suchen/Entwürfe sind erlaubt. E-Mails SENDEN ist eine folgenreiche Aktion: Fordere vor dem tatsächlichen Versand eine klare Bestätigung an. Wenn noch keine Bestätigung vorliegt, darfst du nicht gmail_send aufrufen. Erkläre keine internen Tooldetails. Wenn Google nicht verbunden ist, sage kurz, dass Mahery Google verbinden muss.`;
async function runTool(name:string,args:any){switch(name){case'gmail_search':return gmailSearch(args.query,args.max||10);case'gmail_read':return gmailRead(args.id);case'gmail_draft':return gmailDraft(args.to,args.subject,args.body);case'gmail_send':return gmailSend(args.to,args.subject,args.body);case'calendar_list':return calendarList(args.days||7);case'calendar_create':return calendarCreate(args.summary,args.start,args.end,args.description||'');case'memory_save':return saveMemory(args.text);case'memory_search':return searchMemory(args.query);case'reminder_create':return addReminder(args.text,args.when);case'reminder_list':return listReminders();default:throw new Error('Unknown tool');}}
export async function POST(req:NextRequest){try{if(!config.openaiKey)return NextResponse.json({error:'OPENAI_API_KEY fehlt.'},{status:500});const {message}=await req.json();if(!message)return NextResponse.json({error:'Keine Spracheingabe erhalten.'},{status:400});let response=await client.responses.create({model:config.openaiModel,instructions,input:message,tools});
 const links:any[]=[]; let rounds=0;
 while(rounds++<6){const calls=(response.output as any[]).filter(x=>x.type==='function_call'); if(!calls.length)break; const outputs=[] as any[]; for(const c of calls){if(c.name==='gmail_send' && !/\b(bestätige|ja|sende|abschicken|verschick)\b/i.test(message)){return NextResponse.json({text:`Ich kann die E-Mail an ${c.arguments ? JSON.parse(c.arguments).to : 'den Empfänger'} erst senden, wenn du ausdrücklich sagst: „Ja, senden.“`,links});} const args=JSON.parse(c.arguments||'{}'); try{const result=await runTool(c.name,args);outputs.push({type:'function_call_output',call_id:c.call_id,output:JSON.stringify(result)});}catch(e:any){outputs.push({type:'function_call_output',call_id:c.call_id,output:JSON.stringify({error:e.message||'Tool fehlgeschlagen'})});}}
 response=await client.responses.create({model:config.openaiModel,instructions,input:[...response.output,...outputs],tools}); }
 const text=response.output_text||'Ich habe keine Antwort erzeugt.'; return NextResponse.json({text,links});
}catch(e:any){const msg=e?.message||'JARVIS konnte die Anfrage nicht ausführen.'; return NextResponse.json({error:msg},{status:500});}}

```

## Datei: `app/api/google/auth/route.ts`

```ts
import { NextResponse } from 'next/server'; import { googleAuthUrl } from '@/lib/google';
export async function GET(){return NextResponse.redirect(googleAuthUrl());}

```

## Datei: `app/api/google/callback/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'; import { googleOAuth, saveGoogleTokens } from '@/lib/google';
export async function GET(req:NextRequest){const code=req.nextUrl.searchParams.get('code'); if(!code)return NextResponse.json({error:'missing code'},{status:400}); const o=googleOAuth(); const {tokens}=await o.getToken(code); await saveGoogleTokens(tokens); return NextResponse.redirect(new URL('/?google=connected',req.url));}

```

## Datei: `app/api/google/status/route.ts`

```ts
import {NextResponse} from 'next/server'; import {readJson} from '@/lib/store';
export async function GET(){const t=await readJson<any>('google-token.json',{});return NextResponse.json({connected:Boolean(t.refresh_token||t.access_token)});}

```

## Datei: `app/globals.css`

```css
*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Inter,system-ui,sans-serif;background:#05070b;color:#f4f7fb}button{font:inherit}.page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 30%,#152238 0,#05070b 45%,#020306 100%)}.panel{width:min(900px,100%);border:1px solid #263247;border-radius:28px;background:rgba(9,13,21,.86);box-shadow:0 30px 100px #0008;padding:28px}.top{display:flex;justify-content:space-between;align-items:center}.brand{font-size:28px;font-weight:800;letter-spacing:4px}.status{font-size:13px;color:#91a0b7}.orb{width:230px;height:230px;margin:60px auto 35px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#1f8fff 0,#0b2d55 38%,#07101d 65%,transparent 70%);box-shadow:0 0 90px #1687ff66;cursor:pointer;transition:.2s}.orb.listening{background:radial-gradient(circle,#8c2cff 0,#3a1464 38%,#11051e 65%,transparent 70%);box-shadow:0 0 110px #8c2cff77}.mic{font-size:56px}.hint{text-align:center;color:#9aa9bd}.response{min-height:80px;margin:25px auto 0;max-width:720px;text-align:center;font-size:18px;line-height:1.55}.actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px}.small{background:#111927;border:1px solid #29374b;color:#dce5f2;border-radius:12px;padding:10px 14px;cursor:pointer}.links{margin-top:18px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.links a{color:#79b7ff}.footer{margin-top:30px;text-align:center;font-size:12px;color:#66758b}@media(max-width:600px){.panel{padding:20px}.orb{width:190px;height:190px;margin:45px auto 25px}}

```

## Datei: `app/layout.tsx`

```tsx
import './globals.css';
export const metadata={title:'JARVIS',description:'Voice-first personal AI assistant'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="de"><body>{children}</body></html>}

```

## Datei: `app/page.tsx`

```tsx
'use client';
import {useEffect,useRef,useState} from 'react';

type SR=any;
export default function Home(){
 const [listening,setListening]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('Bereit'),[answer,setAnswer]=useState('Sag „Hey JARVIS“ oder klicke auf das Mikrofon.'),[links,setLinks]=useState<any[]>([]);
 const rec=useRef<SR>(null);
 useEffect(()=>{
  const C=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  if(!C){setStatus('Spracherkennung wird von diesem Browser nicht unterstützt.');return;}
  const r=new C(); r.lang='de-DE'; r.interimResults=false; r.continuous=false;
  r.onstart=()=>{setListening(true);setStatus('Ich höre zu…')};
  r.onerror=(e:any)=>{setListening(false);setStatus('Mikrofonfehler: '+e.error)};
  r.onend=()=>setListening(false);
  r.onresult=async(e:any)=>{const text=e.results[0][0].transcript; await ask(text)};
  rec.current=r;
 },[]);
 const speak=(text:string)=>{ if(!('speechSynthesis' in window))return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text);u.lang='de-DE';u.rate=0.92;u.pitch=0.78; const voices=speechSynthesis.getVoices(); const preferred=voices.find(v=>/de(-|_)DE/i.test(v.lang)&&/(male|männ|markus|hans|stefan|thomas|daniel|google deutsch)/i.test(v.name))||voices.find(v=>/de(-|_)DE/i.test(v.lang))||voices.find(v=>/^de/i.test(v.lang)); if(preferred)u.voice=preferred; speechSynthesis.speak(u); };
 const ask=async(text:string)=>{setBusy(true);setStatus('JARVIS denkt…');setAnswer('');setLinks([]);try{const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Fehler');setAnswer(d.text);setLinks(d.links||[]);speak(d.text);}catch(e:any){const m=e.message||'Unbekannter Fehler';setAnswer(m);speak(m)}finally{setBusy(false);setStatus('Bereit')}};
 const start=()=>{if(!rec.current||busy)return;try{rec.current.start()}catch{}};
 return <main className="page"><section className="panel"><div className="top"><div className="brand">JARVIS</div><div className="status">{status}</div></div><div className={'orb '+(listening?'listening':'')} onClick={start}><div className="mic">{busy?'◌':'🎙️'}</div></div><div className="hint">{listening?'Sprich jetzt…':'Nur Stimme – kein Texteingabefeld'}</div><div className="response">{answer}</div><div className="actions"><button className="small" onClick={start}>🎙️ Sprechen</button><button className="small" onClick={()=>{speechSynthesis.cancel();setAnswer('')}}>Antwort löschen</button><a className="small" href="/api/google/auth">Google verbinden</a></div>{links.length>0&&<div className="links">{links.map((x,i)=><a key={i} href={x.url} target="_blank">{x.title||x.url}</a>)}</div>}<div className="footer">JARVIS • Mahery • Voice-first personal assistant</div></section></main>
}

```

## Datei: `lib/calendar.ts`

```ts
import { google, getGoogleClient } from './google';
export async function calendarList(days=7){
  const auth=await getGoogleClient(); const calendar=google.calendar({version:'v3',auth});
  const now=new Date(); const end=new Date(now.getTime()+days*86400000);
  const r=await calendar.events.list({calendarId:'primary',timeMin:now.toISOString(),timeMax:end.toISOString(),singleEvents:true,orderBy:'startTime',maxResults:50});
  return (r.data.items||[]).map(e=>({id:e.id,summary:e.summary,start:e.start?.dateTime||e.start?.date,end:e.end?.dateTime||e.end?.date,description:e.description||'',location:e.location||''}));
}
export async function calendarCreate(summary:string,start:string,end:string,description=''){ const auth=await getGoogleClient(); const calendar=google.calendar({version:'v3',auth}); const r=await calendar.events.insert({calendarId:'primary',requestBody:{summary,description,start:{dateTime:start},end:{dateTime:end}}}); return r.data; }

```

## Datei: `lib/config.ts`

```ts
export const config = {
  openaiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback',
  baseUrl: process.env.JARVIS_BASE_URL || 'http://localhost:3000'
};

```

## Datei: `lib/gmail.ts`

```ts
import { google, getGoogleClient } from './google';

function decode(data?:string){ if(!data) return ''; return Buffer.from(data.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'); }
function header(headers:any[]|undefined,name:string){ return headers?.find(h=>h.name?.toLowerCase()===name.toLowerCase())?.value || ''; }
function bodyFromPart(part:any):string{
  if(part?.mimeType==='text/plain' && part.body?.data) return decode(part.body.data);
  for(const p of part?.parts||[]) { const b=bodyFromPart(p); if(b) return b; }
  if(part?.body?.data) return decode(part.body.data);
  return '';
}
export async function gmailSearch(q:string,max=10){
  const auth=await getGoogleClient(); const gmail=google.gmail({version:'v1',auth});
  const r=await gmail.users.messages.list({userId:'me',q,maxResults:max});
  const msgs=[] as any[];
  for(const m of r.data.messages||[]) {
    const x=await gmail.users.messages.get({userId:'me',id:m.id!,format:'full'});
    const p=x.data.payload; msgs.push({id:m.id,threadId:m.threadId,from:header(p?.headers,'From'),to:header(p?.headers,'To'),subject:header(p?.headers,'Subject'),date:header(p?.headers,'Date'),snippet:x.data.snippet||'',body:bodyFromPart(p)});
  }
  return msgs;
}
export async function gmailRead(id:string){
  const auth=await getGoogleClient(); const gmail=google.gmail({version:'v1',auth});
  const x=await gmail.users.messages.get({userId:'me',id,format:'full'}); const p=x.data.payload;
  return {id,threadId:x.data.threadId,from:header(p?.headers,'From'),to:header(p?.headers,'To'),subject:header(p?.headers,'Subject'),date:header(p?.headers,'Date'),body:bodyFromPart(p),snippet:x.data.snippet||''};
}
function rawEmail(to:string,subject:string,body:string,replyToId?:string){
  const lines=[`To: ${to}`,`Subject: ${subject}`]; if(replyToId) lines.push(`In-Reply-To: ${replyToId}`); lines.push('Content-Type: text/plain; charset="UTF-8"','',body);
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}
export async function gmailSend(to:string,subject:string,body:string,replyToId?:string){
  const auth=await getGoogleClient(); const gmail=google.gmail({version:'v1',auth});
  const r=await gmail.users.messages.send({userId:'me',requestBody:{raw:rawEmail(to,subject,body,replyToId)}}); return r.data;
}
export async function gmailDraft(to:string,subject:string,body:string){
  const auth=await getGoogleClient(); const gmail=google.gmail({version:'v1',auth});
  const r=await gmail.users.drafts.create({userId:'me',requestBody:{message:{raw:rawEmail(to,subject,body)}}}); return r.data;
}

```

## Datei: `lib/google.ts`

```ts
import { google } from 'googleapis';
import { config } from './config';
import { readJson, writeJson } from './store';

const scopes = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar'
];

type Token = {access_token?:string; refresh_token?:string; scope?:string; token_type?:string; expiry_date?:number};
export function googleOAuth(){
  return new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, config.googleRedirectUri);
}
export function googleAuthUrl(){
  return googleOAuth().generateAuthUrl({access_type:'offline',prompt:'consent',scope:scopes});
}
export async function getGoogleClient(){
  const token = await readJson<Token>('google-token.json',{});
  if(!token.access_token && !token.refresh_token) throw new Error('GOOGLE_NOT_CONNECTED');
  const auth=googleOAuth(); auth.setCredentials(token);
  auth.on('tokens', async t => { await writeJson('google-token.json',{...token,...t}); });
  return auth;
}
export async function saveGoogleTokens(tokens:Token){ await writeJson('google-token.json',tokens); }
export { google };

```

## Datei: `lib/memory.ts`

```ts
import { readJson, writeJson } from './store';
type Memory={id:string;text:string;createdAt:string};
export async function saveMemory(text:string){ const a=await readJson<Memory[]>('memory.json',[]); const m={id:crypto.randomUUID(),text,createdAt:new Date().toISOString()}; a.push(m); await writeJson('memory.json',a); return m; }
export async function searchMemory(q:string){ const a=await readJson<Memory[]>('memory.json',[]); const terms=q.toLowerCase().split(/\s+/).filter(Boolean); return a.filter(m=>terms.some(t=>m.text.toLowerCase().includes(t))).slice(-20); }

```

## Datei: `lib/reminders.ts`

```ts
import { readJson, writeJson } from './store';
type Reminder={id:string;text:string;when:string;done:boolean};
export async function addReminder(text:string,when:string){ const a=await readJson<Reminder[]>('reminders.json',[]); const r={id:crypto.randomUUID(),text,when,done:false}; a.push(r); await writeJson('reminders.json',a); return r; }
export async function listReminders(){ return readJson<Reminder[]>('reminders.json',[]); }

```

## Datei: `lib/store.ts`

```ts
import fs from 'node:fs/promises';
import path from 'node:path';

const dir = path.join(process.cwd(), '.data');
async function ensure(){ await fs.mkdir(dir,{recursive:true}); }
export async function readJson<T>(name:string, fallback:T):Promise<T>{
  await ensure();
  try { return JSON.parse(await fs.readFile(path.join(dir,name),'utf8')) as T; } catch { return fallback; }
}
export async function writeJson<T>(name:string, value:T){ await ensure(); await fs.writeFile(path.join(dir,name), JSON.stringify(value,null,2),'utf8'); }

```

## Datei: `next-env.d.ts`

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
// NOTE: This file should not be edited

```

## Datei: `next.config.mjs`

```text
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;

```

## Datei: `package.json`

```json
{
  "name": "jarvis-voice-assistant",
  "version": "1.0.0",
  "private": true,
  "scripts": {"dev":"next dev","build":"next build","start":"next start","lint":"next lint"},
  "dependencies": {
    "googleapis":"^160.0.0",
    "next":"^15.5.0",
    "openai":"^5.12.0",
    "react":"^19.1.0",
    "react-dom":"^19.1.0"
  },
  "devDependencies": {"@types/node":"^22.10.0","@types/react":"^19.0.0","@types/react-dom":"^19.0.0","typescript":"^5.7.0"}
}

```

## Datei: `tsconfig.json`

```json
{"compilerOptions":{"target":"ES2022","lib":["dom","dom.iterable","esnext"],"allowJs":false,"skipLibCheck":true,"strict":true,"noEmit":true,"esModuleInterop":true,"module":"esnext","moduleResolution":"bundler","baseUrl":".","paths":{"@/*":["./*"]},"resolveJsonModule":true,"isolatedModules":true,"jsx":"preserve","incremental":true,"plugins":[{"name":"next"}]},"include":["next-env.d.ts","**/*.ts","**/*.tsx",".next/types/**/*.ts"],"exclude":["node_modules"]}

```
