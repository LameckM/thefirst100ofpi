import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "";
const MAP = [
 ["0","S · Z","Zero starts with Z","sea"],["1","T · D · TH","T has one downstroke","tie"],
 ["2","N","N has two legs","hen"],["3","M","M has three legs","ham"],
 ["4","R","R ends the word four","ray"],["5","L","L is the Roman numeral for 50","owl"],
 ["6","J · CH · SH","A flipped 6 looks like J","shoe"],["7","K · C · Q · CK hard G","A capital K is built from two 7s","key"],
 ["8","F · V· PH","A handwritten f has two loops","ivy"],["9","P · B","A flipped 9 looks like P","bee"]
];
async function api(path, options) {
 const response = await fetch(API + path, options);
 const data = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request failed.");
 return data;
}
const SCORE_KEY="number-stories-scores";
const KIND_LABEL={mix:"Everything",sounds:"Digit to sounds",digit:"Sound to digit",word:"Word to number",number:"Number to word"};
function loadScores(){try{const v=JSON.parse(localStorage.getItem(SCORE_KEY)||"[]");return Array.isArray(v)?v:[];}catch{return [];}}
function saveScores(list){try{localStorage.setItem(SCORE_KEY,JSON.stringify(list));}catch{}}
function Progress({scores,onClear}) {
 if(!scores.length)return <p className="hint">Your scores will show up here after your first round.</p>;
 const best=Math.max(...scores.map(s=>s.score));
 const avg=(scores.reduce((a,s)=>a+s.score,0)/scores.length).toFixed(1);
 const recent=scores.slice(-10);
 return <div className="progress-card">
  <div className="stat-row"><div><b>{scores.length}</b><small>rounds played</small></div><div><b>{best}/10</b><small>best score</small></div><div><b>{avg}</b><small>average</small></div></div>
  <div className="trend" role="img" aria-label={"Last "+recent.length+" scores: "+recent.map(s=>s.score).join(", ")}>{recent.map((s,i)=><span key={i} title={s.score+"/10 · "+(KIND_LABEL[s.kind]||s.kind)+" · "+s.level+" · "+new Date(s.at).toLocaleDateString()}><i style={{height:(s.score*10)+"%"}}/><em>{s.score}</em></span>)}</div>
  <button className="link-btn" onClick={()=>{if(confirm("Clear all saved scores?"))onClear();}}>Clear scores</button>
 </div>;
}
const PALACE_KEY="number-stories-palace";
const EXAMPLE_STOPS=["front gate","front door","shoe rack","sofa","tv","dining table","fridge","kitchen sink","bedroom door","bed","wardrobe","bathroom mirror"];
function loadStops(){try{const v=JSON.parse(localStorage.getItem(PALACE_KEY)||"[]");return Array.isArray(v)?v.filter(x=>typeof x==="string"):[];}catch{return [];}}
function article(w){return /^(a|e|i|o)/i.test(w)||/^u(?!ni|se|su|ro|ten)/i.test(w)?"an":"a";}
function Palace({chunks}) {
 const [stops,setStops]=useState(loadStops);
 const [text,setText]=useState("");
 function commit(next){setStops(next);try{localStorage.setItem(PALACE_KEY,JSON.stringify(next));}catch{}}
 function add(e){
  e.preventDefault();
  addParts(text);
  setText("");
 }
 function addParts(raw){
  const parts=raw.split(/[,\n]/).map(x=>x.trim()).filter(Boolean);
  if(parts.length)commit([...stops,...parts].slice(0,120));
 }
 function paste(e){
  const t=e.clipboardData.getData("text");
  if(/[\n,]/.test(t)){e.preventDefault();addParts(text+t);setText("");}
 }
 function move(i,d){const j=i+d;if(j<0||j>=stops.length)return;const n=[...stops];[n[i],n[j]]=[n[j],n[i]];commit(n);}
 const missing=Math.max(0,chunks.length-stops.length);
 return <div className="input-panel palace">
  <div className="result-head"><div><span className="eyebrow">Walk your route</span><h2>Memory palace</h2><p>List the places you pass in order. Each image from your number goes on the next place.</p></div>
   {stops.length>0&&<Button kind="quiet" onClick={()=>{if(confirm("Remove all stops?"))commit([]);}}>Clear stops</Button>}</div>
  <form className="input-row" onSubmit={add}><input aria-label="Add stops" value={text} onChange={e=>setText(e.target.value)} onPaste={paste} placeholder="gate, door, sofa..."/><Button kind="secondary">Add stop</Button></form>
  <small className="hint">Type one place, or paste several separated by commas. Use places you can picture without effort.</small>
  {!stops.length&&<div className="palace-empty"><Button kind="quiet" onClick={()=>commit(EXAMPLE_STOPS)}>Use example stops</Button></div>}
  {stops.length>0&&<ol className="route">{stops.map((st,i)=>{const c=chunks[i];return <li key={i+st}>
   <span className="stop-n">{i+1}</span>
   <div className="stop-body"><b>{st}</b>{c&&(c.word?<p>Picture {article(c.word)} <mark>{c.word}</mark> at the {st}. <span className="stop-digits">{c.digits}</span></p>:<p className="hint">No word for {c.digits} yet. Add one above.</p>)}</div>
   <div className="stop-actions"><button aria-label={"Move "+st+" up"} disabled={i===0} onClick={()=>move(i,-1)}>↑</button><button aria-label={"Move "+st+" down"} disabled={i===stops.length-1} onClick={()=>move(i,1)}>↓</button><button className="rm" aria-label={"Remove "+st} onClick={()=>commit(stops.filter((_,n)=>n!==i))}>✕</button></div>
  </li>;})}</ol>}
  {chunks.length>0&&(missing>0?<p className="palace-warn">Your number has {chunks.length} images but you have {stops.length} stops. Add {missing} more to place them all.</p>:stops.length>0&&<p className="palace-ok">Every image has a place. Walk the route a few times, seeing each scene.</p>)}
 </div>;
}
const OWN_KEY="number-stories-own-stories";
function loadOwn(){try{const v=JSON.parse(localStorage.getItem(OWN_KEY)||"{}");return v&&typeof v==="object"&&!Array.isArray(v)?v:{};}catch{return {};}}
function saveOwn(key,entry){
 try{
  const all=loadOwn();
  if(entry)all[key]=entry;else delete all[key];
  const next={};
  Object.keys(all).sort((a,b)=>(all[b].at||0)-(all[a].at||0)).slice(0,60).forEach(k=>{next[k]=all[k];});
  localStorage.setItem(OWN_KEY,JSON.stringify(next));
 }catch{}
}
// Text can sit before every image and after the last one. slots[i] is the text right before image i; slots[n] is the ending.
function suggestedSlots(sentences,chunks){
 const text=(sentences||[]).join(" ");
 const re=/\[\[([^\]|]+)\|?[^\]]*\]\]/g;
 const pieces=[];let last=0,m;
 while((m=re.exec(text))!==null){pieces.push(text.slice(last,m.index).trim());last=m.index+m[0].length;}
 pieces.push(text.slice(last).trim());
 const slots=Array(chunks.length+1).fill("");
 let k=0;
 chunks.forEach((c,i)=>{if(c.word)slots[i]=pieces[k++]||"";});
 slots[chunks.length]=pieces[k]||"";
 return slots;
}
function weave(slots,chunks){
 const out=[];let plain="";
 const add=(type,value,digits)=>{
  const v=(value||"").trim();if(!v)return;
  const space=plain&&!/^[,.;:!?)'’]/.test(v)&&!/[(\s]$/.test(plain);
  plain+=(space?" ":"")+v;
  out.push({type,value:v,digits,space:!!space});
 };
 chunks.forEach((c,i)=>{add("text",slots[i]);if(c.word)add("word",c.word,c.digits);});
 add("text",slots[chunks.length]);
 return {parts:out,plain};
}
function Slot({value,onChange,placeholder,label}) {
 const ref=useRef(null);
 useEffect(()=>{const el=ref.current;if(el){el.style.height="auto";el.style.height=el.scrollHeight+"px";}},[value]);
 return <textarea ref={ref} className="own-slot" rows={1} value={value} maxLength={600} placeholder={placeholder} aria-label={label} onChange={e=>onChange(e.target.value)}/>;
}
function OwnStory({chunks,suggested,grouped,number,openedId,openedTitle,onSave,onShowHistory}) {
 const n=chunks.length;
 const [slots,setSlots]=useState(()=>{const e=loadOwn()[grouped];const s=e&&Array.isArray(e.slots)?e.slots:[];return Array.from({length:n+1},(_,i)=>typeof s[i]==="string"?s[i]:"");});
 const [snap,setSnap]=useState(()=>{const e=loadOwn()[grouped];return e&&Array.isArray(e.words)&&e.words.length===n?e.words:chunks.map(c=>c.word);});
 const [copied,setCopied]=useState(false);
 const [mode,setMode]=useState(null);
 const [title,setTitle]=useState("");
 const [note,setNote]=useState(null);
 const hasText=slots.some(x=>x.trim());
 useEffect(()=>{saveOwn(grouped,hasText?{slots,words:snap,at:Date.now()}:null);},[slots,snap]);
 useEffect(()=>{if(!hasText)setSnap(chunks.map(c=>c.word));},[chunks,hasText]);
 useEffect(()=>{setNote(null);},[slots]);
 const setSlot=(i,v)=>setSlots(a=>a.map((x,k)=>k===i?v:x));
 const changed=i=>snap[i]&&chunks[i].word&&snap[i]!==chunks[i].word&&((slots[i]||"").trim()||(slots[i+1]||"").trim());
 const {parts,plain}=weave(slots,chunks);
 function useSuggested(){
  if(hasText&&!confirm("Replace what you wrote with the suggested story?"))return;
  setSlots(suggestedSlots(suggested,chunks));setSnap(chunks.map(c=>c.word));
 }
 const pieces=grouped.split("-");
 const defaultTitle="Story for "+pieces.slice(0,3).join("-")+(pieces.length>3?"…":"");
 function startNew(){setTitle(defaultTitle);setMode("new");}
 function doSave(updateId){
  const base={number,size:Math.max(2,chunks[0]?chunks[0].digits.length:3),grouped,words:chunks.map(c=>c.word),digits:chunks.map(c=>c.digits),slots,plain};
  const r=onSave(base,updateId,title);
  setMode(null);
  setNote(r.ok?{ok:true,text:updateId?"Updated in your history.":"Saved to your history."}:{ok:false,text:"Couldn't save. Your browser may be blocking storage or it may be full."});
 }
 function clearAll(){if(confirm("Clear everything you wrote for this number?"))setSlots(Array(n+1).fill(""));}
 async function copy(){
  try{await navigator.clipboard.writeText(grouped+"\n\n"+chunks.map(c=>c.digits+" = "+c.word).join("\n")+"\n\n"+plain);setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{}
 }
 return <div className="input-panel own-story">
  <div className="result-head"><div><span className="eyebrow">04 / WRITE IT YOURSELF</span><h2>Your own story</h2><p>Your images stay in order. Write anything you like before, between and after them. Stories you invent yourself are the ones you remember.</p></div>
   <Button kind="secondary" onClick={useSuggested} disabled={!suggested||!suggested.length}>Start from the suggested story</Button></div>
  <div className="own-flow">
   {chunks.map((c,i)=><div key={i}>
    <Slot value={slots[i]||""} onChange={v=>setSlot(i,v)} label={"Your text before scene "+(i+1)} placeholder={i===0?"How does your story begin? (optional)":"What happens between "+(chunks[i-1].word||chunks[i-1].digits)+" and "+(c.word||c.digits)+"? (optional)"}/>
    {c.word?<div className="own-chip"><mark>{c.word}</mark><span className="own-digits">{c.digits}</span><small>scene {String(i+1).padStart(2,"0")} · locked in place</small></div>
     :<div className="own-chip empty"><span>No word for {c.digits} yet</span><small>scene {String(i+1).padStart(2,"0")} · add a word in its card above</small></div>}
    {changed(i)&&<p className="own-note">You swapped “{snap[i]}” for “{c.word}”. Check your sentences still fit. <button type="button" onClick={()=>setSnap(a=>a.map((w,k)=>k===i?c.word:w))}>Dismiss</button></p>}
   </div>)}
   <Slot value={slots[n]||""} onChange={v=>setSlot(n,v)} label="Your text after the last scene" placeholder="How does it end? (optional)"/>
  </div>
  {hasText&&<div className="own-preview"><span className="eyebrow">Your story so far</span>
   <p className="story-line"><Parts parts={parts}/></p>
   <div className="own-actions">
    {openedId?<Button onClick={()=>doSave(openedId)}>Update “{openedTitle}”</Button>:<Button onClick={startNew}>Save to history</Button>}
    {openedId&&<Button kind="secondary" onClick={startNew}>Save as new copy</Button>}
    <Button kind="secondary" onClick={copy}>{copied?"Copied":"Copy my story"}</Button>
    <Button kind="quiet" onClick={clearAll}>Clear my text</Button>
   </div>
   {mode==="new"&&<form className="input-row save-form" onSubmit={e=>{e.preventDefault();doSave(null);}}><label htmlFor="story-title">Name this story so you can find it later</label><input id="story-title" value={title} maxLength={80} autoFocus onFocus={e=>e.target.select()} onChange={e=>setTitle(e.target.value)} placeholder="My story for this number"/><Button>Save</Button><Button kind="quiet" type="button" onClick={()=>setMode(null)}>Cancel</Button></form>}
   {note&&<p className={note.ok?"save-ok":"palace-warn"} role="status">{note.text}{note.ok&&<> <button type="button" className="link-inline" onClick={onShowHistory}>View history</button></>}</p>}
  </div>}
 </div>;
}
const HISTORY_KEY="number-stories-history";
function loadHistory(){try{const v=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&typeof x.id==="string"&&Array.isArray(x.slots)&&Array.isArray(x.words)&&Array.isArray(x.digits)):[];}catch{return [];}}
function persistHistory(list){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(list));return true;}catch{return false;}}
function newId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function Parts({parts}){return parts.map((p,i)=><span key={i}>{p.space&&" "}{p.type==="word"?<mark title={p.digits}>{p.value}</mark>:p.value}</span>);}
function HistoryCard({item,onOpen,onRename,onDelete}) {
 const [editing,setEditing]=useState(false);
 const [title,setTitle]=useState(item.title);
 const [expanded,setExpanded]=useState(false);
 const [copied,setCopied]=useState(false);
 const chunks=item.words.map((w,i)=>({word:w,digits:item.digits[i]}));
 const {parts,plain}=weave(item.slots,chunks);
 const date=new Date(item.updatedAt||item.savedAt||Date.now()).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
 async function copy(){
  try{await navigator.clipboard.writeText(item.title+"\n"+item.grouped+"\n\n"+chunks.map(c=>c.digits+" = "+c.word).join("\n")+"\n\n"+plain);setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{}
 }
 function submit(e){e.preventDefault();const t=title.trim();if(t){onRename(item.id,t);setEditing(false);}}
 return <article className="input-panel history-card">
  {editing
   ?<form className="input-row" onSubmit={submit}><input aria-label="Story title" value={title} maxLength={80} autoFocus onFocus={e=>e.target.select()} onChange={e=>setTitle(e.target.value)}/><Button kind="secondary">Save</Button><Button kind="quiet" type="button" onClick={()=>{setTitle(item.title);setEditing(false);}}>Cancel</Button></form>
   :<h2>{item.title}</h2>}
  <p className="digits">{item.grouped}</p>
  <small className="hint">{item.words.filter(Boolean).length} images · saved {date}</small>
  <p className={"story-line history-story"+(expanded?" open":"")}><Parts parts={parts}/></p>
  {plain.length>240&&<button type="button" className="link-inline history-more" onClick={()=>setExpanded(v=>!v)}>{expanded?"Show less":"Read the full story"}</button>}
  <div className="own-actions">
   <Button onClick={()=>onOpen(item)}>Open in editor</Button>
   <Button kind="secondary" onClick={copy}>{copied?"Copied":"Copy"}</Button>
   <Button kind="quiet" onClick={()=>setEditing(true)}>Rename</Button>
   <button type="button" className="link-btn" onClick={()=>{if(confirm("Delete “"+item.title+"”? This can't be undone."))onDelete(item.id);}}>Delete</button>
  </div>
 </article>;
}
function History({items,onOpen,onRename,onDelete,onCreate}) {
 const [q,setQ]=useState("");
 if(!items.length)return <div className="input-panel history-empty"><h2>Nothing saved yet</h2><p className="hint">Write a story on the Create page, press “Save to history” and give it a title. It will be waiting here.</p><Button onClick={onCreate}>Go to Create ↗</Button></div>;
 const sorted=[...items].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 const needle=q.trim().toLowerCase();
 const shown=needle?sorted.filter(x=>(x.title+" "+x.number+" "+x.words.join(" ")).toLowerCase().includes(needle)):sorted;
 return <>
  {items.length>3&&<div className="input-row history-toolbar"><input type="search" aria-label="Search saved stories" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by title, number or word..."/></div>}
  <small className="hint history-note">Saved on this device only. Clearing your browser data removes them.</small>
  <div className="history-list">{shown.map(item=><HistoryCard key={item.id} item={item} onOpen={onOpen} onRename={onRename} onDelete={onDelete}/>)}</div>
  {needle&&!shown.length&&<p className="hint">No stories match “{q}”.</p>}
 </>;
}
function Button({children,kind="primary",...props}) { return <button className={"button "+kind} {...props}>{children}</button>; }

export default function App() {
 const [view,setView]=useState(location.hash.slice(1)||"create");
 const [theme,setTheme]=useState(()=>localStorage.getItem("number-stories-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));
 const [number,setNumber]=useState(new URLSearchParams(location.search).get("n")||"");
 const [target,setTarget]=useState(3);
 const [result,setResult]=useState(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [word,setWord]=useState("");
 const [decoded,setDecoded]=useState(null);
 const [kind,setKind]=useState("mix");
 const [level,setLevel]=useState("easy");
 const [round,setRound]=useState(null);
 const [question,setQuestion]=useState(null);
 const [feedback,setFeedback]=useState(null);
 const [picked,setPicked]=useState("");
 const [own,setOwn]=useState("");
 const [ownMessage,setOwnMessage]=useState("");
 const [customWords,setCustomWords]=useState({});
 const [customMessages,setCustomMessages]=useState({});
 const [library,setLibrary]=useState([]);
 const [libraryOpen,setLibraryOpen]=useState(false);
 const [scores,setScores]=useState(loadScores);
 const [history,setHistory]=useState(loadHistory);
 const [opened,setOpened]=useState(null);
 const [ownNonce,setOwnNonce]=useState(0);
 const [selectedScene,setSelectedScene]=useState(0);
 const [recallMode,setRecallMode]=useState(false);
 const [revealedScenes,setRevealedScenes]=useState([]);
 const savedRound=useRef(null);

 function go(next) {
  setView(next); history.replaceState(null,"",location.pathname+location.search+"#"+next);
  window.scrollTo({top:0,behavior:"smooth"});
 }
 async function create(targetValue=target) {
  if(!number.trim()){setError("Enter a number first.");return;}
  setBusy(true);setError("");
  try { setResult(await api("/api/encode?number="+encodeURIComponent(number)+"&target="+targetValue)); }
  catch(e){setError(e.message);} finally{setBusy(false);}
 }
 async function story(words,digits,variant) {
  return api("/api/story",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({words,digits,variant})});
 }
 async function swap(i,newWord) {
  const chunks=result.chunks.map((c,n)=>n===i?{...c,word:newWord}:c);
  setResult({...result,chunks});
  try {const r=await story(chunks.map(c=>c.word),chunks.map(c=>c.digits),0);setResult(v=>({...v,story:r.story}));}
  catch(e){setError(e.message);}
 }
 async function more(i) {
  try {const r=await api("/api/words?digits="+result.chunks[i].digits+"&limit=40");setResult(v=>({...v,chunks:v.chunks.map((c,n)=>n===i?{...c,alternatives:r.words,hints:{...(c.hints||{}),...(r.hints||{})},expanded:true}:c)}));}
  catch(e){setError(e.message);}
 }
 function saveStory(base,updateId,title) {
  const now=Date.now();
  const existing=updateId&&history.find(x=>x.id===updateId);
  let next,id;
  if(existing){id=existing.id;next=history.map(x=>x.id===id?{...x,...base,updatedAt:now}:x);}
  else{id=newId();next=[{...base,id,title:(title||"").trim()||"Untitled story",savedAt:now,updatedAt:now},...history].slice(0,200);}
  const ok=persistHistory(next);
  setHistory(next);setOpened({id,grouped:base.grouped});
  return {ok,id};
 }
 function renameStory(id,title) {
  const next=history.map(x=>x.id===id?{...x,title,updatedAt:Date.now()}:x);
  persistHistory(next);setHistory(next);
 }
 function deleteStory(id) {
  const next=history.filter(x=>x.id!==id);
  persistHistory(next);setHistory(next);
  if(opened&&opened.id===id)setOpened(null);
 }
 async function openSaved(item) {
  setError("");setBusy(true);
  try {
   const r=await api("/api/encode?number="+encodeURIComponent(item.number)+"&target="+item.size);
   const draft=loadOwn()[r.grouped];
   if(draft&&Array.isArray(draft.slots)&&draft.slots.some(x=>x.trim())&&JSON.stringify(draft.slots)!==JSON.stringify(item.slots)&&!confirm("You already have a draft for this number on the Create page. Replace it with this saved story?"))return;
   const chunks=r.chunks.map((c,i)=>{const w=item.words[i];if(!w)return c;return {...c,word:w,alternatives:[w,...(c.alternatives||[]).filter(a=>a!==w)]};});
   let suggested=r.story;
   try{suggested=(await story(chunks.map(c=>c.word),chunks.map(c=>c.digits),0)).story;}catch{}
   saveOwn(r.grouped,{slots:item.slots,words:item.words,at:Date.now()});
   setNumber(item.number);setTarget(item.size);
   setResult({...r,chunks,story:suggested});
   setOpened({id:item.id,grouped:r.grouped});
   setOwnNonce(n=>n+1);
   go("create");
   setTimeout(()=>document.querySelector(".own-story")?.scrollIntoView({behavior:"smooth",block:"start"}),250);
  } catch(e){setError(e.message);} finally{setBusy(false);}
 }
 async function decode() {
  try {setDecoded(await api("/api/decode?word="+encodeURIComponent(word.trim())));}
  catch(e){setError(e.message);}
 }
 async function loadQuestion(fresh=false) {
  setFeedback(null);setPicked("");setOwn("");setOwnMessage("");
  try {
   const q=await api("/api/quiz?kind="+kind+"&level="+level);
   setQuestion(q);
   setRound(v=>fresh?{id:Date.now(),n:1,score:0,missed:[],total:10}:{...v,n:v.n+1});
  } catch(e){setError(e.message);}
 }
 function start(){setRound({n:0,score:0,missed:[],total:10});setQuestion(null);loadQuestion(true);}
 function answer(ok,value) {
  if(feedback)return;
  setPicked(value||"");
  setRound(v=>({...v,score:v.score+(ok?1:0),missed:ok?v.missed:[...v.missed,{prompt:question.prompt,answer:question.answer,explanation:question.explanation}]}));
  setFeedback({ok});
 }
 async function saveCustomWord(e, digits) {
  e.preventDefault();
  const value=(customWords[digits]||"").trim();
  if(!value){setCustomMessages(v=>({...v,[digits]:"Enter a word first."}));return;}
  try {
   const saved=await api("/api/personal-words",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({word:value,digits})});
   setCustomMessages(v=>({...v,[digits]:saved.verification==="dictionary"?"Saved — pronunciation verified by the dictionary.":"Saved as a custom mapping. Check that the spoken consonant sounds match "+digits+"."}));
   const updated=await api("/api/encode?number="+encodeURIComponent(number)+"&target="+target);
   setResult(updated);
   if(libraryOpen)loadLibrary();
  } catch(e){setCustomMessages(v=>({...v,[digits]:e.message}));}
 }
 async function loadLibrary() {
  try {const r=await api("/api/personal-words");setLibrary(r.words);setLibraryOpen(true);}
  catch(e){setError(e.message);}
 }
 async function removeLibraryWord(word,digits) {
  try {
   await api("/api/personal-words?word="+encodeURIComponent(word)+"&digits="+digits,{method:"DELETE"});
   await loadLibrary();
   if(number)create();
  } catch(e){setError(e.message);}
 }
 async function checkOwn(e) {
  e.preventDefault();
  try {
   const r=await api("/api/check-word?word="+encodeURIComponent(own.trim())+"&digits="+question.digits);
   if(!r.found)setOwnMessage("Word not found. Try another.");
   else if(!r.ok)setOwnMessage("That word maps to "+(r.digits||"no digits")+", not "+question.digits+".");
   else {setQuestion(v=>({...v,explanation:"Good choice. "+r.steps.map(s=>s.sound+"="+s.digit).join(" · ")+" → "+r.digits}));answer(true,own);}
  } catch(e){setOwnMessage(e.message);}
 }
 const finished=round&&round.n===round.total&&feedback;
 const openedItem=opened&&result&&opened.grouped===result.grouped?history.find(x=>x.id===opened.id):null;
 useEffect(()=>{
  if(!finished||savedRound.current===round.id)return;
  savedRound.current=round.id;
  setScores(v=>{const next=[...v,{at:Date.now(),score:round.score,kind,level}].slice(-100);saveScores(next);return next;});
 },[finished]);
 useEffect(()=>{if(number)create();},[]);
 useEffect(()=>{
  document.documentElement.dataset.theme=theme;
  localStorage.setItem("number-stories-theme",theme);
 },[theme]);

 return <div className="shell">
  <header className="topbar">
   <button className="brand" onClick={()=>go("create")}><span className="brand-icon">N<span>.</span></span><span>number stories<small>MAKE NUMBERS MEMORABLE</small></span></button>
   <nav>{["create","learn","practice","history"].map(v=><button key={v} className={view===v?"active":""} onClick={()=>go(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</nav>
   <div className="header-actions"><button className="theme-toggle" onClick={()=>setTheme(v=>v==="light"?"dark":"light")} aria-label={"Switch to "+(theme==="light"?"dark":"light")+" mode"} title={"Switch to "+(theme==="light"?"dark":"light")+" mode"}><span aria-hidden="true">{theme==="light"?"☾":"☀"}</span><span>{theme==="light"?"Dark mode":"Light mode"}</span></button><span className="top-note">THE MAJOR SYSTEM <i/></span></div>
  </header>
  <main>
   {error&&<div className="alert" role="alert">{error}<button onClick={()=>setError("")}>Dismiss</button></div>}
   {view==="create"&&<section>
    <div className="hero"><span className="eyebrow">YOUR MEMORY STUDIO</span><h1>Make a number <em>stick.</em></h1><p>Turn digits into vivid images, then connect those images into a story your mind can replay.</p></div>
    <div className="input-panel"><div className="panel-label"><span>01 / NUMBER INPUT</span><span>UP TO 300 DIGITS</span></div><form onSubmit={e=>{e.preventDefault();create();}}><label htmlFor="number">What do you want to remember?</label><div className="input-row"><input id="number" value={number} onChange={e=>setNumber(e.target.value)} inputMode="numeric" placeholder="Try 314159265358979..."/><Button disabled={busy}>{busy?"Building...":"Create story ↗"}</Button></div></form><div className="target-row"><span>Words should represent</span>{[2,3,4].map(n=><button key={n} className={target===n?"chosen":""} onClick={()=>{setTarget(n);if(result)create(n);}}>{n} digits</button>)}</div></div>
    {result&&<section className="results"><div className="result-head"><div><span className="eyebrow">02 / YOUR MEMORY MAP</span><h2>{result.chunks.length} images for your number</h2><p className="digits">{result.grouped}</p></div><div className="storyboard-actions"><Button kind="secondary" onClick={()=>{setRecallMode(v=>!v);setRevealedScenes([]);}}>{recallMode?"Exit recall mode":"Practice recall ↗"}</Button><Button kind="quiet" onClick={async()=>{try{const r=await story(result.chunks.map(c=>c.word),result.chunks.map(c=>c.digits),Date.now());setResult(v=>({...v,story:r.story}));}catch(e){setError(e.message);}}}>↻ Another story</Button></div></div>{recallMode&&<div className="recall-instructions"><b>Recall mode</b><span>Use each number group as a cue. Picture the scene, say the word aloud, then reveal it to check your memory.</span></div>}
     <div className="storyboard" aria-label="Number story scenes"><div className="storyboard-track" aria-hidden="true"><span style={{width:((selectedScene+1)/Math.max(result.chunks.length,1))*100+"%"}}/></div><div className="word-grid">{result.chunks.map((c,i)=><article className={"word-card scene-card"+(selectedScene===i?" selected":"")} key={i}><button type="button" className="scene-select" aria-pressed={selectedScene===i} onClick={()=>setSelectedScene(i)}><span className="word-meta"><span>SCENE {String(i+1).padStart(2,"0")}</span><span>{c.digits}</span></span><h3>{recallMode&&!revealedScenes.includes(i)?"••••••":(c.word || "Choose a word")}</h3><span className="scene-hint">{selectedScene===i?"Viewing this scene":"Explore scene ↗"}</span></button>{!recallMode&&c.hints&&c.hints[c.word]&&<small className="hint">{c.hints[c.word]}</small>}{!recallMode&&!c.word&&<small className="hint">No dictionary match for this group yet</small>}{!recallMode&&<><div className="alternatives"><small>SWAP IMAGE</small>{(c.alternatives||[]).filter(w=>w!==c.word).slice(0,c.expanded?40:4).map(w=><button key={w} onClick={()=>swap(i,w)}>{w}</button>)}{c.word&&!c.expanded&&<button className="more" onClick={()=>more(i)}>More +</button>}{!c.word&&<small>Word not assigned</small>}</div><form className="personal-word-form" onSubmit={e=>saveCustomWord(e,c.digits)}><label htmlFor={"custom-"+i}>Add your own word for {c.digits}</label><small className="hint">Words outside the dictionary can still be saved. You confirm their sound-to-number mapping.</small><div className="input-row"><input id={"custom-"+i} value={customWords[c.digits]||""} onChange={e=>setCustomWords(v=>({...v,[c.digits]:e.target.value}))} placeholder="Type a word..."/><Button kind="secondary">Save word</Button></div>{customMessages[c.digits]&&<small className="personal-message">{customMessages[c.digits]}</small>}</form></>}</article>)}</div></div>
     <div className="scene-focus" aria-live="polite"><div><span className="eyebrow">SCENE {String(selectedScene+1).padStart(2,"0")} OF {String(result.chunks.length).padStart(2,"0")}</span><h3>{recallMode&&!revealedScenes.includes(selectedScene)?"What image represents this group?":(result.chunks[selectedScene]?.word||"Choose an image")}</h3><p><b>{result.chunks[selectedScene]?.digits}</b> — {recallMode&&!revealedScenes.includes(selectedScene)?"Try to recall the word and picture before revealing the answer.":"Picture "+(result.chunks[selectedScene]?.word?article(result.chunks[selectedScene].word)+" "+result.chunks[selectedScene].word:"a vivid image")+" as something oversized, unusual and full of movement."}</p>{recallMode&&<button type="button" className="button secondary reveal-scene" disabled={revealedScenes.includes(selectedScene)} onClick={()=>setRevealedScenes(v=>[...v,selectedScene])}>{revealedScenes.includes(selectedScene)?"Answer revealed":"Reveal answer"}</button>}</div><div className="scene-controls"><button type="button" className="button secondary" disabled={selectedScene===0} onClick={()=>setSelectedScene(i=>Math.max(0,i-1))}>← Previous</button><button type="button" className="button primary" disabled={selectedScene>=result.chunks.length-1} onClick={()=>setSelectedScene(i=>Math.min(result.chunks.length-1,i+1))}>Next scene →</button></div></div>
     {!recallMode&&<div className="story-panel"><div className="result-head"><div><span className="eyebrow">03 / CONNECT THE SCENES</span><h2>Your story</h2></div><Button kind="secondary" onClick={()=>navigator.clipboard.writeText(result.grouped+"\n\n"+result.chunks.map(c=>c.digits+" = "+c.word).join("\n")+"\n\n"+result.story.map(s=>s.replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g,"$1")).join(" "))}>Copy story</Button></div>{result.story.map((s,i)=><p className="story-line" key={i}>{s.split(/(\[\[[^\]]+\]\])/g).map((part,j)=>part.startsWith("[[")?<mark key={j}>{part.match(/\[\[([^\]|]+)/)?.[1]}</mark>:part)}</p>)}<small className="hint">Make each scene unusual, oversized and full of movement. The stranger it feels, the easier it is to recall.</small></div>}
    </section>}
    {!result&&<div className="starter"><h2>From abstract digits to unforgettable scenes.</h2><p><b>01 Encode</b> — digits become consonant sounds and words.</p><p><b>02 Visualise</b> — choose images that feel clear and personal.</p><p><b>03 Connect</b> — link each image into one memorable story.</p></div>}
    {result&&<OwnStory key={result.grouped+":"+ownNonce} chunks={result.chunks} suggested={result.story} grouped={result.grouped} number={result.digits} openedId={openedItem?openedItem.id:null} openedTitle={openedItem?openedItem.title:""} onSave={saveStory} onShowHistory={()=>go("history")}/>}
    <Palace chunks={result?result.chunks:[]}/>
    <div className="input-panel personal-library"><div className="result-head"><div><span className="eyebrow">YOUR CUSTOM VOCABULARY</span><h2>Personal Word Library</h2><p>Words you save are preferred whenever the same number group appears again.</p></div><Button kind="secondary" onClick={loadLibrary}>{libraryOpen?"Refresh library":"View saved words"}</Button></div>{libraryOpen&&<div className="library-list">{library.length?library.map((item,i)=><div className="library-item" key={item.word+"-"+item.digits}><span><b>{item.word}</b><small>{item.digits}</small></span><button onClick={()=>removeLibraryWord(item.word,item.digits)}>Remove</button></div>):<p className="hint">No personal words saved yet. Add one to a number group above.</p>}</div>}</div>
    <div className="callout"><span>NEW TO THIS TECHNIQUE?</span><p>Learn the simple sound code behind every number.</p><Button kind="secondary" onClick={()=>go("learn")}>Explore the method ↗</Button></div>
   </section>}
   {view==="history"&&<section><div className="hero"><span className="eyebrow">YOUR LIBRARY</span><h1>Your saved <em>stories.</em></h1><p>Every story you save lives here. Open one to keep working on it, or read it again to recall the number.</p></div><History items={history} onOpen={openSaved} onRename={renameStory} onDelete={deleteStory} onCreate={()=>go("create")}/></section>}
   {view==="learn"&&<section><div className="hero"><span className="eyebrow">THE METHOD</span><h1>Learn the <em>Major System.</em></h1><p>A sound-based code that turns hard-to-recall numbers into words, pictures and stories.</p></div><div className="lesson"><span className="eyebrow">01 / THE BIG IDEA</span><h2>Your brain remembers pictures better than digits.</h2><p>Each digit maps to a consonant sound. Add vowels to make a word, turn that word into a mental image, and connect images in sequence.</p></div><div className="input-panel"><span className="eyebrow">02 / THE SOUND CODE</span><h2>Ten digits. Ten sound groups.</h2><div className="digit-grid">{MAP.map(([d,s,h,w])=><article key={d}><b>{d}</b><div><strong>{s}</strong><p>{h}</p><small>EXAMPLE · {w}</small></div></article>)}</div></div><div className="lesson"><span className="eyebrow">03 / FOUR RULES</span><h2>Sound matters. Spelling doesn't.</h2><ul><li><b>Ignore vowels, H, W and Y.</b> They help form words but carry no digits.</li><li><b>Listen for consonant sounds.</b> Phone begins with an F sound, so it maps to 8.</li><li><b>One sound, one digit.</b> A double letter making one sound counts once.</li><li><b>Letters can change sound.</b> Soft C sounds like S; hard C sounds like K.</li></ul></div><div className="input-panel"><span className="eyebrow">04 / TRY IT YOURSELF</span><h2>Decode any word.</h2><form className="input-row" onSubmit={e=>{e.preventDefault();decode();}}><input value={word} onChange={e=>setWord(e.target.value)} placeholder="Try phone..." aria-label="Word to decode"/><Button>Decode word</Button></form>{decoded&&(!decoded.found?<p>Word not found. Try another.</p>:decoded.options.map((o,i)=><p key={i} className="decode-line">{o.steps.map(s=>s.sound+" = "+s.digit).join(" · ")} <b>→ {o.digits||"no digits"}</b></p>))}</div><Button onClick={()=>go("practice")}>I'm ready to practise ↗</Button></section>}
   {view==="practice"&&<section><div className="hero"><span className="eyebrow">BUILD RECALL</span><h1>Train your <em>memory.</em></h1><p>Short, focused rounds help you learn the sound code until it becomes automatic.</p></div>{!round&&<div className="input-panel"><h2>Set up a practice round</h2><label>Question type</label><div className="target-row wrap">{[["mix","Everything"],["sounds","Digit to sounds"],["digit","Sound to digit"],["word","Word to number"],["number","Number to word"]].map(([v,l])=><button key={v} className={kind===v?"chosen":""} onClick={()=>setKind(v)}>{l}</button>)}</div><label>Difficulty</label><div className="target-row"><button className={level==="easy"?"chosen":""} onClick={()=>setLevel("easy")}>Easy</button><button className={level==="medium"?"chosen":""} onClick={()=>setLevel("medium")}>Medium</button></div><p className="hint">Easy uses 1–2 digit numbers. Medium uses 3-digit numbers and trickier spellings.</p><Button onClick={start}>Start 10-question round ↗</Button></div>}
    {!round&&<div className="input-panel"><h2>Your progress</h2><Progress scores={scores} onClear={()=>{setScores([]);saveScores([]);}}/></div>}
    {round&&!finished&&question&&<div className="quiz-panel"><div className="panel-label"><span>QUESTION {round.n} / 10</span><b>{round.score} CORRECT</b></div><div className="progress"><span style={{width:(round.n*10)+"%"}}/></div><h2>{question.prompt}</h2>{question.type==="choice"&&<div className="answer-grid">{question.options.map(o=><button key={o} disabled={!!feedback} className={feedback&&o===question.answer?"right":feedback&&o===picked?"wrong":""} onClick={()=>answer(o===question.answer,o)}>{o}</button>)}</div>}{question.type==="digit-grid"&&<div className="answer-grid digits">{Array.from("0123456789").map(d=><button key={d} disabled={!!feedback} onClick={()=>answer(d===question.answer,d)}>{d}</button>)}</div>}{question.type==="number-input"&&<form className="input-row" onSubmit={e=>{e.preventDefault();answer(question.accepted.includes(picked),picked);}}><input inputMode="numeric" placeholder="Enter digits" value={picked} onChange={e=>setPicked(e.target.value.replace(/\D/g,""))} disabled={!!feedback}/><Button disabled={!!feedback}>Check</Button></form>}{question.own_word&&<form className="own-form" onSubmit={checkOwn}><label>Or create your own word for {question.digits}</label><div className="input-row"><input value={own} onChange={e=>setOwn(e.target.value)} placeholder="Your word" disabled={!!feedback}/><Button kind="secondary" disabled={!!feedback}>Check my word</Button></div><small>{ownMessage}</small></form>}{feedback&&<div className={feedback.ok?"feedback good":"feedback bad"}><b>{feedback.ok?"Correct — nice work.":"Not quite. The answer is "+question.answer+"."}</b><p>{question.explanation}</p><Button onClick={()=>finished?undefined:loadQuestion()} disabled={!!finished}>{finished?"Round complete":"Next question →"}</Button></div>}</div>}
    {finished&&<div className="input-panel"><span className="eyebrow">SESSION COMPLETE</span><div className="score">{round.score} / 10</div>{scores.length>1&&round.score>Math.max(...scores.slice(0,-1).map(s=>s.score))&&<p className="new-best">New personal best.</p>}<h2>{round.score===10?"Perfect round.":round.score>=8?"Strong recall.":round.score>=5?"You're making progress.":"Keep practising — repetition builds recall."}</h2>{round.missed.map((m,i)=><div className="missed" key={i}><b>{m.prompt}</b><p>Answer: {m.answer}</p><small>{m.explanation}</small></div>)}<Button onClick={start}>Start another round ↗</Button> <Button kind="secondary" onClick={()=>setRound(null)}>Change settings</Button></div>}
   </section>}
  </main>
  <footer><span className="brand-icon small">N<span>.</span></span><b>NUMBER STORIES</b><span>Turn numbers into stories worth remembering.</span></footer>
 </div>;
}
