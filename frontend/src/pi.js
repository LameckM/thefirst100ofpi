export const PI="1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679";

export const TARGETS=[25,50,100,1000000];

// Whole numbers up to 100 digits; four decimals for longer targets so each digit visibly counts.
export function percent(count,target){return target>100?(count/target*100).toFixed(4)+"%":Math.floor(count*100/target)+"%";}

// Apply typed text to a run. Wrong digit is remembered but not counted; next guess replaces it.
export function guess(count,text,digits=PI,target=digits.length){
 let wrong="";
 for(const d of text.replace(/\D/g,"")){
  if(count>=Math.min(target,digits.length))break;
  if(d===digits[count]){count++;wrong="";}else{wrong=d;break;}
 }
 return {count,wrong};
}
