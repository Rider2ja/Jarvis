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
