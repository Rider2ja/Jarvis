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
