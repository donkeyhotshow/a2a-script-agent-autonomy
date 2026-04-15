#!/usr/bin/env node
import{readFileSync,writeFileSync,readdirSync,existsSync}from'fs';
import{join,basename}from'path';
function walk(d){const r=[];try{for(const e of readdirSync(d,{withFileTypes:true})){const f=join(d,e.name);if(e.isDirectory()&&e.name!=='node_modules'&&!e.name.startsWith('.'))walk(f).forEach(x=>r.push(x));else if(e.isFile()&&e.name.endsWith('.ts')&&!e.name.endsWith('.d.ts'))r.push(f);}}catch{}return r;}
const R=[
  ["@a2a/server-daemon","../../daemon/src/daemon/llm-hub-poll.js"],
  ["@a2a/server-llm","../../llm/src/llm/llm-service.js"],
  ["@a2a/transform","../../transform/src/index.js"],
  ["@a2a/actions","../../actions/src/index.js"],
  ["@a2a/memory","../../gray-room/src/memory/experience-bank.js"],
  ["@a2a/llm","../../llm/src/index.js"],
];
let n=0;
for(const f of walk('packages')){
  let c=readFileSync(f,'utf8'),o=c;
  for(const[from,to]of R){
    const re=new RegExp("from '"+from.replace(/\//g,'\\/')+"'","g");
    c=c.replace(re,"from '"+to+"'");
  }
  if(c!==o){writeFileSync(f,c);n++;console.log('F:'+basename(f));}
}
console.log('Fixed:'+n);
