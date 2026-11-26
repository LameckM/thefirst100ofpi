import { useRef, useState } from "react";
import { PI, guess } from "./pi.js";

const BEST_KEY="number-stories-pi-best";
function loadBest(){try{const n=Number(localStorage.getItem(BEST_KEY));return Number.isInteger(n)&&n>0?Math.min(n,PI.length):0;}catch{return 0;}}

export default function Pi(){
 const [run,setRun]=useState({count:0,wrong:""});
 const [best,setBest]=useState(loadBest);
 const [peek,setPeek]=useState(false);
 const [peeked,setPeeked]=useState(false);
 const input=useRef(null);
 const {count,wrong}=run;
 const done=count===PI.length;
 function type(text){
  if(!/\d/.test(text))return;
  const next=guess(count,text);
  setRun(next);setPeek(false);
  // A run that used a hint does not set a personal best.
  if(!peeked&&next.count>best){setBest(next.count);try{localStorage.setItem(BEST_KEY,String(next.count));}catch{}}
 }
 function restart(){setRun({count:0,wrong:""});setPeek(false);setPeeked(false);input.current.focus();}
 return <section>
  <div className="hero"><span className="eyebrow">MEMORY CHALLENGE</span><h1>Recall <em>pi.</em></h1><p>Type the digits after 3. one at a time. Green is right. Red is wrong, and your next guess replaces it.</p></div>
  <div className="review-stats pi-stats">
   <div><b>{count}</b><span>Correct digits</span></div>
   <div><b>{best}</b><span>Personal best</span></div>
   <div><b>{PI.length-count}</b><span>Remaining</span></div>
  </div>
  <div className="input-panel">
   <div className="result-head"><h2>Keep the sequence going</h2>
    <div className="storyboard-actions">
     <button type="button" className="button secondary" disabled={done} onClick={()=>{setRun({count,wrong:""});setPeek(true);setPeeked(true);input.current.focus();}}>Hint</button>
     <button type="button" className="button secondary" onClick={restart}>Start over</button>
    </div>
   </div>
   <div className="pi-board" onClick={()=>input.current.focus()}>
    <span>3.</span><span className="pi-right">{PI.slice(0,count)}</span>{wrong&&<span className="pi-wrong">{wrong}</span>}{peek&&<span className="pi-hint">{PI[count]}</span>}
   </div>
   <label htmlFor="pi-input">{done?"All 100 digits. Well done.":"Next digit"}</label>
   <div className="input-row"><input id="pi-input" ref={input} value="" onChange={e=>type(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="Type here" disabled={done}/></div>
   <p className="hint" role="status">{wrong?wrong+" is wrong. Try again.":peek?"Hint: the next digit is "+PI[count]+".":count+" correct."}{peeked&&" Hint used, so this run will not change your best."}</p>
  </div>
 </section>;
}
