import { useEffect, useRef, useState } from "react";
import { PI, TARGETS, guess, percent } from "./pi.js";

const BEST_KEY="number-stories-pi-best";
function loadBest(){try{const n=Number(localStorage.getItem(BEST_KEY));return Number.isInteger(n)&&n>0?Math.min(n,1000000):0;}catch{return 0;}}

export default function Pi(){
 const [run,setRun]=useState({count:0,wrong:""});
 const [best,setBest]=useState(loadBest);
 const [peek,setPeek]=useState(false);
 const [peeked,setPeeked]=useState(false);
 const [target,setTarget]=useState(TARGETS[0]);
 const [digits,setDigits]=useState(PI);
 const [loading,setLoading]=useState("");
 const input=useRef(null);
 const wanted=useRef(TARGETS[0]);
 const refocus=useRef(false);
 // "Keep going" can only focus the box once the new goal has re-enabled it.
 useEffect(()=>{if(refocus.current){refocus.current=false;input.current.focus();}},[target]);
 const {count,wrong}=run;
 const done=count>=target;
 const next=TARGETS[TARGETS.indexOf(target)+1];
 // Keeps the digits already typed when moving up; moving below them starts again.
 async function choose(value){
  wanted.current=value;
  if(value>digits.length){
   setLoading("Loading digits...");
   try{setDigits((await import("./pi-million.txt?raw")).default);}
   catch{setLoading("Could not load the digits. Check your connection and try again.");return;}
  }
  if(wanted.current!==value)return; // another goal was picked while loading
  setLoading("");setTarget(value);setPeek(false);
  if(count>value){setRun({count:0,wrong:""});setPeeked(false);}
 }
 function type(text){
  if(!/\d/.test(text))return;
  const result=guess(count,text,digits,target);
  setRun(result);setPeek(false);
  // A run that used a hint does not set a personal best.
  if(!peeked&&result.count>best){setBest(result.count);try{localStorage.setItem(BEST_KEY,String(result.count));}catch{}}
 }
 function restart(){setRun({count:0,wrong:""});setPeek(false);setPeeked(false);input.current.focus();}
 return <section>
  <div className="hero"><span className="eyebrow">MEMORY CHALLENGE</span><h1>Recall <em>pi.</em></h1><p>Type the digits after 3. one at a time. Green is right. Red is wrong, and your next guess replaces it.</p></div>
  <div className="target-row pi-targets" role="group" aria-label="How many digits to recall"><span>My goal</span>
   {TARGETS.map(t=><button key={t} type="button" className={t===target?"chosen":""} aria-pressed={t===target} onClick={()=>choose(t)}>{t.toLocaleString("en")} digits</button>)}
  </div>
  {loading&&<p className="hint" role="status">{loading}</p>}
  <div className="review-stats pi-stats">
   <div><b>{count}</b><span>Correct digits</span></div>
   <div><b>{best}</b><span>Personal best</span></div>
   <div><b>{target-count}</b><span>Remaining</span></div>
  </div>
  <div className="input-panel">
   <div className="result-head"><h2>Keep the sequence going</h2>
    <div className="storyboard-actions">
     <button type="button" className="button secondary" disabled={done} onClick={()=>{setRun({count,wrong:""});setPeek(true);setPeeked(true);input.current.focus();}}>Hint</button>
     <button type="button" className="button secondary" onClick={restart}>Start over</button>
    </div>
   </div>
   <div className="pi-board">
    <span>3.</span><span className="pi-right">{digits.slice(0,count)}</span>{wrong&&<span className="pi-wrong">{wrong}</span>}{peek&&<span className="pi-hint">{digits[count]}</span>}{!done&&<span className="pi-caret" aria-hidden="true"/>}
    <input ref={input} value="" onChange={e=>type(e.target.value)} inputMode="numeric" autoComplete="off" aria-label="Type the next digit of pi" disabled={done}/>
   </div>
   <div className="pi-progress"><progress value={count} max={target} aria-label="Progress to your goal"/><b>{percent(count,target)}</b></div>
   {done&&<div className="pi-win" role="status"><b>You recalled {target.toLocaleString("en")} digits.</b>{next&&<button type="button" className="button primary" onClick={()=>{refocus.current=true;choose(next);}}>Keep going to {next.toLocaleString("en")}</button>}</div>}
   <p className="hint" role="status">{wrong?wrong+" is wrong. Try again.":peek?"Hint: the next digit is "+digits[count]+".":!done&&"Click or tap the box, then type."}{peeked&&" Hint used, so this run will not change your best."}</p>
  </div>
 </section>;
}
