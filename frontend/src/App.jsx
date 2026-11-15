import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "";
const MAP = [
 ["0","S · Z","Zero starts with Z","sea"],["1","T · D · TH","T has one downstroke","tie"],
 ["2","N","N has two legs","hen"],["3","M","M has three legs","ham"],
 ["4","R","R ends the word four","ray"],["5","L","L is the Roman numeral for 50","owl"],
 ["6","J · CH · SH","A flipped 6 looks like J","shoe"],["7","K · hard G","A capital K is built from two 7s","key"],
 ["8","F · V","A handwritten f has two loops","ivy"],["9","P · B","A flipped 9 looks like P","bee"]
];
async function api(path, options) {
 const response = await fetch(API + path, options);
 const data = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request failed.");
 return data;
}
function Button({children,kind="primary",...props}) { return <button className={"button "+kind} {...props}>{children}</button>; }

export default function App() {
 const [view,setView]=useState(location.hash.slice(1)||"create");
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

 function go(next) {
  setView(next); history.replaceState(null,"",location.pathname+location.search+"#"+next);
  window.scrollTo({top:0,behavior:"smooth"});
 }
 async function create(targetValue=target) {
  if(!number.trim()){setError("Enter a number first.");return;}
  setBusy(true);setError("");
  try { setResult(await api("/api/encode?number="+encodeURIComponent(number)+"&target="+target)); }
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
  try {const r=await api("/api/words?digits="+result.chunks[i].digits+"&limit=40");setResult(v=>({...v,chunks:v.chunks.map((c,n)=>n===i?{...c,alternatives:r.words,expanded:true}:c)}));}
  catch(e){setError(e.message);}
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
   setRound(v=>fresh?{n:1,score:0,missed:[],total:10}:{...v,n:v.n+1});
  } catch(e){setError(e.message);}
 }
 function start(){setRound({n:0,score:0,missed:[],total:10});setQuestion(null);loadQuestion(true);}
 function answer(ok,value) {
  if(feedback)return;
  setPicked(value||"");
  setRound(v=>({...v,score:v.score+(ok?1:0),missed:ok?v.missed:[...v.missed,{prompt:question.prompt,answer:question.answer,explanation:question.explanation}]}));
  setFeedback({ok});
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
 useEffect(()=>{if(number)create();},[]);

 return <div className="shell">
  <header className="topbar">
   <button className="brand" onClick={()=>go("create")}><span className="brand-icon">N<span>.</span></span><span>number stories<small>MAKE NUMBERS MEMORABLE</small></span></button>
   <nav>{["create","learn","practice"].map(v=><button key={v} className={view===v?"active":""} onClick={()=>go(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</nav>
   <span className="top-note">THE MAJOR SYSTEM <i/></span>
  </header>
  <main>
   {error&&<div className="alert" role="alert">{error}<button onClick={()=>setError("")}>Dismiss</button></div>}
   {view==="create"&&<section>
    <div className="hero"><span className="eyebrow">YOUR MEMORY STUDIO</span><h1>Make a number <em>stick.</em></h1><p>Turn digits into vivid images, then connect those images into a story your mind can replay.</p></div>
    <div className="input-panel"><div className="panel-label"><span>01 / NUMBER INPUT</span><span>UP TO 300 DIGITS</span></div><form onSubmit={e=>{e.preventDefault();create();}}><label htmlFor="number">What do you want to remember?</label><div className="input-row"><input id="number" value={number} onChange={e=>setNumber(e.target.value)} inputMode="numeric" placeholder="Try 314159265358979..."/><Button disabled={busy}>{busy?"Building...":"Create story ↗"}</Button></div></form><div className="target-row"><span>Words should represent</span>{[2,3,4].map(n=><button key={n} className={target===n?"chosen":""} onClick={()=>{setTarget(n);if(result)create(n);}}>{n} digits</button>)}</div></div>
    {result&&<section className="results"><div className="result-head"><div><span className="eyebrow">02 / YOUR MEMORY MAP</span><h2>{result.chunks.length} images for your number</h2><p className="digits">{result.grouped}</p></div><Button kind="quiet" onClick={async()=>{try{const r=await story(result.chunks.map(c=>c.word),result.chunks.map(c=>c.digits),Date.now());setResult(v=>({...v,story:r.story}));}catch(e){setError(e.message);}}}>↻ Another story</Button></div>
     <div className="word-grid">{result.chunks.map((c,i)=><article className="word-card" key={i}><div className="word-meta"><span>SCENE {String(i+1).padStart(2,"0")}</span><span>{c.digits}</span></div><h3>{c.word}</h3><div className="alternatives"><small>SWAP IMAGE</small>{(c.alternatives||[]).filter(w=>w!==c.word).slice(0,c.expanded?40:4).map(w=><button key={w} onClick={()=>swap(i,w)}>{w}</button>)}{!c.expanded&&<button className="more" onClick={()=>more(i)}>More +</button>}</div></article>)}</div>
     <div className="story-panel"><div className="result-head"><div><span className="eyebrow">03 / CONNECT THE SCENES</span><h2>Your story</h2></div><Button kind="secondary" onClick={()=>navigator.clipboard.writeText(result.grouped+"\n\n"+result.chunks.map(c=>c.digits+" = "+c.word).join("\n")+"\n\n"+result.story.map(s=>s.replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g,"$1")).join(" "))}>Copy story</Button></div>{result.story.map((s,i)=><p className="story-line" key={i}>{s.split(/(\[\[[^\]]+\]\])/g).map((part,j)=>part.startsWith("[[")?<mark key={j}>{part.match(/\[\[([^\]|]+)/)?.[1]}</mark>:part)}</p>)}<small className="hint">Make each scene unusual, oversized and full of movement. The stranger it feels, the easier it is to recall.</small></div>
    </section>}
    {!result&&<div className="starter"><h2>From abstract digits to unforgettable scenes.</h2><p><b>01 Encode</b> — digits become consonant sounds and words.</p><p><b>02 Visualise</b> — choose images that feel clear and personal.</p><p><b>03 Connect</b> — link each image into one memorable story.</p></div>}
    <div className="callout"><span>NEW TO THIS TECHNIQUE?</span><p>Learn the simple sound code behind every number.</p><Button kind="secondary" onClick={()=>go("learn")}>Explore the method ↗</Button></div>
   </section>}
   {view==="learn"&&<section><div className="hero"><span className="eyebrow">THE METHOD</span><h1>Learn the <em>Major System.</em></h1><p>A sound-based code that turns hard-to-recall numbers into words, pictures and stories.</p></div><div className="lesson"><span className="eyebrow">01 / THE BIG IDEA</span><h2>Your brain remembers pictures better than digits.</h2><p>Each digit maps to a consonant sound. Add vowels to make a word, turn that word into a mental image, and connect images in sequence.</p></div><div className="input-panel"><span className="eyebrow">02 / THE SOUND CODE</span><h2>Ten digits. Ten sound groups.</h2><div className="digit-grid">{MAP.map(([d,s,h,w])=><article key={d}><b>{d}</b><div><strong>{s}</strong><p>{h}</p><small>EXAMPLE · {w}</small></div></article>)}</div></div><div className="lesson"><span className="eyebrow">03 / FOUR RULES</span><h2>Sound matters. Spelling doesn't.</h2><ul><li><b>Ignore vowels, H, W and Y.</b> They help form words but carry no digits.</li><li><b>Listen for consonant sounds.</b> Phone begins with an F sound, so it maps to 8.</li><li><b>One sound, one digit.</b> A double letter making one sound counts once.</li><li><b>Letters can change sound.</b> Soft C sounds like S; hard C sounds like K.</li></ul></div><div className="input-panel"><span className="eyebrow">04 / TRY IT YOURSELF</span><h2>Decode any word.</h2><form className="input-row" onSubmit={e=>{e.preventDefault();decode();}}><input value={word} onChange={e=>setWord(e.target.value)} placeholder="Try phone..." aria-label="Word to decode"/><Button>Decode word</Button></form>{decoded&&(!decoded.found?<p>Word not found. Try another.</p>:decoded.options.map((o,i)=><p key={i} className="decode-line">{o.steps.map(s=>s.sound+" = "+s.digit).join(" · ")} <b>→ {o.digits||"no digits"}</b></p>))}</div><Button onClick={()=>go("practice")}>I'm ready to practise ↗</Button></section>}
   {view==="practice"&&<section><div className="hero"><span className="eyebrow">BUILD RECALL</span><h1>Train your <em>memory.</em></h1><p>Short, focused rounds help you learn the sound code until it becomes automatic.</p></div>{!round&&<div className="input-panel"><h2>Set up a practice round</h2><label>Question type</label><div className="target-row wrap">{[["mix","Everything"],["sounds","Digit to sounds"],["digit","Sound to digit"],["word","Word to number"],["number","Number to word"]].map(([v,l])=><button key={v} className={kind===v?"chosen":""} onClick={()=>setKind(v)}>{l}</button>)}</div><label>Difficulty</label><div className="target-row"><button className={level==="easy"?"chosen":""} onClick={()=>setLevel("easy")}>Easy</button><button className={level==="medium"?"chosen":""} onClick={()=>setLevel("medium")}>Medium</button></div><p className="hint">Easy uses 1–2 digit numbers. Medium uses 3-digit numbers and trickier spellings.</p><Button onClick={start}>Start 10-question round ↗</Button></div>}
    {round&&!finished&&question&&<div className="quiz-panel"><div className="panel-label"><span>QUESTION {round.n} / 10</span><b>{round.score} CORRECT</b></div><div className="progress"><span style={{width:(round.n*10)+"%"}}/></div><h2>{question.prompt}</h2>{question.type==="choice"&&<div className="answer-grid">{question.options.map(o=><button key={o} disabled={!!feedback} className={feedback&&o===question.answer?"right":feedback&&o===picked?"wrong":""} onClick={()=>answer(o===question.answer,o)}>{o}</button>)}</div>}{question.type==="digit-grid"&&<div className="answer-grid digits">{Array.from("0123456789").map(d=><button key={d} disabled={!!feedback} onClick={()=>answer(d===question.answer,d)}>{d}</button>)}</div>}{question.type==="number-input"&&<form className="input-row" onSubmit={e=>{e.preventDefault();answer(question.accepted.includes(picked),picked);}}><input inputMode="numeric" placeholder="Enter digits" value={picked} onChange={e=>setPicked(e.target.value.replace(/\D/g,""))} disabled={!!feedback}/><Button disabled={!!feedback}>Check</Button></form>}{question.own_word&&<form className="own-form" onSubmit={checkOwn}><label>Or create your own word for {question.digits}</label><div className="input-row"><input value={own} onChange={e=>setOwn(e.target.value)} placeholder="Your word" disabled={!!feedback}/><Button kind="secondary" disabled={!!feedback}>Check my word</Button></div><small>{ownMessage}</small></form>}{feedback&&<div className={feedback.ok?"feedback good":"feedback bad"}><b>{feedback.ok?"Correct — nice work.":"Not quite. The answer is "+question.answer+"."}</b><p>{question.explanation}</p><Button onClick={()=>finished?undefined:loadQuestion()} disabled={!!finished}>{finished?"Round complete":"Next question →"}</Button></div>}</div>}
    {finished&&<div className="input-panel"><span className="eyebrow">SESSION COMPLETE</span><div className="score">{round.score} / 10</div><h2>{round.score===10?"Perfect round.":round.score>=8?"Strong recall.":round.score>=5?"You're making progress.":"Keep practising — repetition builds recall."}</h2>{round.missed.map((m,i)=><div className="missed" key={i}><b>{m.prompt}</b><p>Answer: {m.answer}</p><small>{m.explanation}</small></div>)}<Button onClick={start}>Start another round ↗</Button> <Button kind="secondary" onClick={()=>setRound(null)}>Change settings</Button></div>}
   </section>}
  </main>
  <footer><span className="brand-icon small">N<span>.</span></span><b>NUMBER STORIES</b><span>Turn numbers into stories worth remembering.</span></footer>
 </div>;
}
