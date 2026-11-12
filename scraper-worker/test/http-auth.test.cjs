'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

async function freePort() {
  return new Promise((resolve, reject) => {
    const listener=net.createServer();
    listener.once('error',reject);
    listener.listen(0,'127.0.0.1',()=> {
      const port=listener.address().port;
      listener.close(()=>resolve(port));
    });
  });
}

test('ANI-W10 HTTP health sem credencial; rotas internas protegidas', async () => {
  const port=await freePort();
  const secret='0123456789abcdef0123456789abcdef';
  const child=spawn(process.execPath,[path.join(__dirname,'../server.js')],{
    env:{...process.env,PORT:String(port),SCRAPER_WORKER_TOKEN:secret},
    stdio:['ignore','pipe','pipe'],
  });
  let errors='';
  child.stderr.on('data',buf=>errors+=buf.toString());
  try {
    let healthy=false;
    for (let i=0; i<60; i++) {
      if (child.exitCode!==null) throw new Error('worker encerrou inesperadamente: '+errors);
      try { const res=await fetch('http://127.0.0.1:'+port+'/health'); if(res.ok) {healthy=true;break;} } catch (_) {}
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    assert.equal(healthy,true,'worker não iniciou: '+errors);
    const stats=await fetch('http://127.0.0.1:'+port+'/api/cache/stats');
    assert.equal(stats.status,401);
    const render=await fetch('http://127.0.0.1:'+port+'/render?url=https%3A%2F%2Fanimefire.one');
    assert.equal(render.status,401);
    const valid=await fetch('http://127.0.0.1:'+port+'/api/cache/stats',{headers:{Authorization:'Bearer '+secret}});
    assert.equal(valid.status,200);
    const wrong=await fetch('http://127.0.0.1:'+port+'/api/cache/stats',{headers:{Authorization:'Bearer bad'}});
    assert.equal(wrong.status,401);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve=>{if(child.exitCode!==null)resolve();else{child.once('exit',resolve);setTimeout(resolve,4000).unref();}});
  }
});
