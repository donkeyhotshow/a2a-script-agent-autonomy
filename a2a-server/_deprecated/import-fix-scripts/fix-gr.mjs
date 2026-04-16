#!/usr/bin/env node
import{readFileSync,writeFileSync,readdirSync,existsSync}from'fs';
import{join,basename}from'path';
function walk(d){const r=[];try{for(const e of readdirSync(d,{withFileTypes:true})){const f=join(d,e.name);if(e.isDirectory()&&e.name!=='node_modules'&&!e.name.startsWith('.'))walk(f).forEach(x=>r.push(x));else if(e.isFile()&&e.name.endsWith('.ts')&&!e.name.endsWith('.d.ts'))r.push(f);}}catch{}return r;}

// Fix gray-room interrupt handlers (depth: packages/gray-room/src/core/request-processor/gray-room-interrupt-handlers/)
const handlerDir='packages/gray-room/src/core/request-processor/gray-room-interrupt-handlers';
const handlerR=[
  [/from '\.\.\/\.\.\/\.\.\/transform\/types\.js'/g,"from '../../../../../transform/src/types.js'"],
  [/from '\.\.\/\.\.\/\.\.\/transform\/index\.js'/g,"from '../../../../../transform/src/index.js'"],
  [/from '\.\.\/\.\.\/\.\.\/transform\/interrupt-trace-contract\.js'/g,"from '../../../../../transform/src/interrupt-trace-contract.js'"],
  [/from '\.\.\/\.\.\/black-room\/types\.js'/g,"from '../../../black-room/types.js'"],
  [/from '\.\.\/\.\.\/black-room\/black-room-orchestrator\.js'/g,"from '../../../black-room/black-room-orchestrator.js'"],
  [/from '\.\.\/llm-model-resolver\.js'/g,"from '../../../../server/src/request-processor/llm-model-resolver.js'"],
  [/from '\.\.\/\.\.\/agent-swing\.js'/g,"from '../../../../server/src/agent-swing.js'"],
  [/from '\.\.\/\.\.\/\.\.\/daemon\/llm-hub-poll\.js'/g,"from '../../../../../daemon/src/daemon/llm-hub-poll.js'"],
  [/from '\.\.\/\.\.\/rag\/progressive-retriever\.js'/g,"from '../../../../llm/src/rag/progressive-retriever.js'"],
  [/from '\.\.\/\.\.\/\.\.\/actions\/handlers\/file-operations\.js'/g,"from '../../../../actions/src/handlers/file-operations.js'"],
];

// Fix gray-room/src/core/request-processor/ (depth: packages/gray-room/src/core/request-processor/)
const rpDir='packages/gray-room/src/core/request-processor';
const rpR=[
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/transform\/src\/types\.js'/g,"from '../../../../transform/src/types.js'"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/transform\/src\/index\.js'/g,"from '../../../../transform/src/index.js'"],
  [/from '\.\.\/\.\.\/\.\.\/\.\.\/transform\/src\/interrupt-trace-contract\.js'/g,"from '../../../../transform/src/interrupt-trace-contract.js'"],
  [/from '\.\.\/\.\.\/\.\.\/actions\/handlers\/file-operations\.js'/g,"from '../../../actions/src/handlers/file-operations.js'"],
  [/from '\.\.\/\.\.\/\.\.\/llm\/src\/rag\/auto-rag-page-server\.js'/g,"from '../../../llm/src/rag/auto-rag-page-server.js'"],
  [/from '\.\.\/\.\.\/\.\.\/server\/src\/request-processor\/llm-model-resolver\.js'/g,"from '../../../server/src/request-processor/llm-model-resolver.js'"],
  [/from '\.\.\/\.\.\/\.\.\/server\/src\/request-processor\/normalization\.js'/g,"from '../../../server/src/request-processor/normalization.js'"],
  [/from '\.\.\/\.\.\/\.\.\/server\/src\/request-processor\/request-processor\.interfaces\.js'/g,"from '../../../server/src/request-processor/request-processor.interfaces.js'"],
  [/from '\.\.\/\.\.\/\.\.\/server\/src\/request-processor\/llm-orchestration\.js'/g,"from '../../../server/src/request-processor/llm-orchestration.js'"],
  [/from '\.\.\/\.\.\/\.\.\/server\/src\/artifact-store\.js'/g,"from '../../../server/src/artifact-store.js'"],
  [/from '\.\.\/\.\.\/\.\.\/server\/src\/analyzer\.js'/g,"from '../../../server/src/analyzer.js'"],
  [/from '\.\.\/\.\.\/\.\.\/features\/src\/gray-room\/components\/context\/context-discovery\.service\.js'/g,"from '../../../features/src/gray-room/components/context/context-discovery.service.js'"],
  [/from '\.\.\/\.\.\/\.\.\/lib\/ai-hub-url\.js'/g,"from '../../../lib/ai-hub-url.js'"],
  [/from '\.\.\/\.\.\/\.\.\/lib\/mkdtemp-os-tmp\.js'/g,"from '../../../lib/mkdtemp-os-tmp.js'"],
];

// Fix gray-room/src/core/orchestrator/ (depth: packages/gray-room/src/core/orchestrator/)
const orchR=[
  [/from '\.\.\/black-room\/black-room-orchestrator\.js'/g,"from '../../black-room/black-room-orchestrator.js'"],
  [/from '\.\.\/black-room\/types\.js'/g,"from '../../black-room/types.js'"],
  [/from '\.\.\/mcp\/registry\.js'/g,"from '../../mcp/registry.js'"],
  [/from '\.\.\/\.\.\/context\/context-discovery\.service\.js'/g,"from '../../../features/src/gray-room/components/context/context-discovery.service.js'"],
];

// Fix gray-room/src/components/ 
const compR=[
  [/from '\.\.\/\.\.\/lib\/deep-clone-json\.js'/g,"from '../../../../lib/deep-clone-json.js'"],
  [/from '\.\.\/\.\.\/utils\/logger\.js'/g,"from '@a2a/server-utils/logger'"],
];

let n=0;
function applyFixes(dir, rules) {
  if(!existsSync(dir)) return;
  for(const f of walk(dir)){
    let c=readFileSync(f,'utf8'),o=c;
    for(const[p,r]of rules)c=c.replace(p,r);
    if(c!==o){writeFileSync(f,c);n++;console.log('F:'+basename(f));}
  }
}

applyFixes(handlerDir, handlerR);
applyFixes(rpDir, rpR);
applyFixes('packages/gray-room/src/core/orchestrator', orchR);
applyFixes('packages/gray-room/src/components', compR);

// Fix features/src/index.ts
const featIdx='packages/features/src/index.ts';
if(existsSync(featIdx)){
  let c=readFileSync(featIdx,'utf8'),o=c;
  c=c.replace(/from '\.\/gray-room\/components\/context\/context\/AgentSwing\.js'/g,"from './gray-room/components/context/context/AgentSwing.js'");
  c=c.replace(/from '\.\/gray-room\/components\/context\/context\/Ultracontext\.js'/g,"from './gray-room/components/context/context/Ultracontext.js'");
  if(c!==o){writeFileSync(featIdx,c);n++;console.log('F:index.ts');}
}

// Fix write-file.ts swe-verifier path
const wf='packages/actions/src/handlers/file-operations/write-file.ts';
if(existsSync(wf)){
  let c=readFileSync(wf,'utf8'),o=c;
  c=c.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/server\/src\/swe-verifier\.js'/g,"from '../../../../../server/src/swe-verifier.js'");
  if(c!==o){writeFileSync(wf,c);n++;console.log('F:write-file.ts');}
}

console.log('Fixed:'+n);
