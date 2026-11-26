import {test} from "node:test";
import assert from "node:assert/strict";
import {addWord,removeWord,applyWords,loadWords,saveWords} from "./words.js";

test("own words come first only for their digits",()=>{
 const list=addWord(addWord([],"older","314"),"newer","314");
 const [a,b,c]=applyWords([{digits:"314",word:"mother",alternatives:["mother"]},{digits:"314",word:"motor",alternatives:[]},{digits:"159",word:"tulip",alternatives:["tulip"]}],list);
 assert.equal(a.word,"newer");
 assert.deepEqual(a.alternatives,["newer","older","mother"]);
 assert.equal(b.word,"older");
 assert.equal(c.word,"tulip");
 assert.deepEqual(removeWord(list,"newer","314"),[{word:"older",digits:"314"}]);
 assert.equal(addWord(list,"older","314").length,2);
});

test("bad or unavailable storage is ignored safely",()=>{
 globalThis.localStorage={getItem:()=>'[{"word":"<img>","digits":"1"},{"word":"ok","digits":"7"},null]',setItem:()=>{throw new Error("full");}};
 assert.deepEqual(loadWords(),[{word:"ok",digits:"7"}]);
 assert.equal(saveWords([]),false);
 globalThis.localStorage={getItem:()=>"not json"};
 assert.deepEqual(loadWords(),[]);
});
