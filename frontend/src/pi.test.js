import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PI,guess,percent} from "./pi.js";

test("PI holds the first 100 decimals (Machin formula)",()=>{
 const one=10n**110n;
 const atan=x=>{let term=one/x,sum=term;for(let n=3n,s=-1n;term;n+=2n,s=-s){term/=x*x;sum+=s*(term/n);}return sum;};
 assert.equal(PI,String(16n*atan(5n)-4n*atan(239n)).slice(1,101));
});

test("guess counts, stops at a mistake, ignores non-digits, caps at 100",()=>{
 assert.deepEqual(guess(0,"14"),{count:2,wrong:""});
 assert.deepEqual(guess(2,"9"),{count:2,wrong:"9"});
 assert.deepEqual(guess(2,"1"),{count:3,wrong:""});
 assert.deepEqual(guess(0,"1 4-x"),{count:2,wrong:""});
 assert.deepEqual(guess(0,"1495"),{count:2,wrong:"9"});
 assert.deepEqual(guess(0,PI+"5"),{count:100,wrong:""});
});

test("million-digit file, targets and percentages",()=>{
 const million=readFileSync(new URL("./pi-million.txt",import.meta.url),"utf8");
 assert.match(million,/^\d{1000000}$/);
 assert.equal(million.slice(0,100),PI);
 assert.deepEqual(guess(24,million.slice(24,30),million,25),{count:25,wrong:""});
 assert.deepEqual(guess(100,million.slice(100,103),million,1000000),{count:103,wrong:""});
 assert.equal(percent(5,25),"20%");
 assert.equal(percent(25,50),"50%");
 assert.equal(percent(1,1000000),"0.0001%");
});
