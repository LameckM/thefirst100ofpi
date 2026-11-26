export const PI="1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679";

// Apply typed text to a run. Wrong digit is remembered but not counted; next guess replaces it.
export function guess(count,text){
 let wrong="";
 for(const d of text.replace(/\D/g,"")){
  if(count>=PI.length)break;
  if(d===PI[count]){count++;wrong="";}else{wrong=d;break;}
 }
 return {count,wrong};
}
