// Each visitor's own words live in their browser, never on the server.
export const WORD=/^[a-z'-]{1,40}$/;
const KEY="number-stories-words";

export function loadWords(){
 try{
  const list=JSON.parse(localStorage.getItem(KEY)||"[]");
  return Array.isArray(list)?list.filter(x=>x&&typeof x.word==="string"&&WORD.test(x.word)&&/^\d{1,4}$/.test(x.digits)):[];
 }catch{return [];}
}
export function saveWords(list){try{localStorage.setItem(KEY,JSON.stringify(list));return true;}catch{return false;}}
// Newest first, no duplicates.
export function addWord(list,word,digits){return [{word,digits},...list.filter(x=>x.word!==word||x.digits!==digits)];}
export function removeWord(list,word,digits){return list.filter(x=>x.word!==word||x.digits!==digits);}

export function mineFirst(words,digits,list){
 const mine=list.filter(x=>x.digits===digits).map(x=>x.word);
 return [...mine,...words.filter(w=>!mine.includes(w))];
}
// Put the visitor's words ahead of the dictionary's, avoiding repeats across scenes where possible.
export function applyWords(chunks,list){
 const used=new Set();
 return chunks.map(c=>{
  const mine=list.filter(x=>x.digits===c.digits).map(x=>x.word);
  const word=mine.find(w=>!used.has(w))||mine[0]||c.word;
  used.add(word);
  return mine.length?{...c,word,alternatives:mineFirst(c.alternatives||[],c.digits,list)}:c;
 });
}
