const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkerAuth, assertAllowedSourceUrl, fetchWithAllowedRedirects } = require('../security.js');
const secret = 'a'.repeat(64), hosts = new Set(['animefire.one', 'animefire.io']);
function auth(header) {
  let next = 0;
  const res = { statusCode: 200, headers: {}, body: null,
    set(k,v){this.headers[k]=v;return this;}, status(n){this.statusCode=n;return this;}, json(v){this.body=v;return this;} };
  createWorkerAuth(secret)({headers:header?{authorization:header}:{}},res,()=>next++);
  return {next,res};
}
test('ANI-SEC-W01 token obrigatório forte',()=>{
  assert.throws(()=>createWorkerAuth(),/TOKEN/);
  assert.throws(()=>createWorkerAuth('short'),/TOKEN/);
  assert.throws(()=>createWorkerAuth('a'.repeat(32)+'\n'),/TOKEN/);
});
test('ANI-SEC-W02 bearer correto',()=>assert.equal(auth('Bearer '+secret).next,1));
test('ANI-SEC-W03 credenciais ausentes/inválidas não chegam às rotas',()=>{
  for(const header of [undefined,'Bearer wrong','Basic '+secret,'bearer '+secret,'Bearer '+secret+' extra']){
    const x=auth(header); assert.equal(x.next,0);assert.equal(x.res.statusCode,401);
    assert.deepEqual(x.res.body,{error:'não autorizado'});
  }
});
test('ANI-SEC-W04 whitelist HTTPS exata',()=>assert.equal(assertAllowedSourceUrl('https://animefire.one/anime/1',hosts).hostname,'animefire.one'));
test('ANI-SEC-W05 bloqueia IP local, esquema, host falso, credenciais e porta',()=>{
  for(const u of ['http://animefire.one','http://127.0.0.1','https://localhost','https://127.0.0.1','https://animefire.one.evil.test','https://a@animefire.one','https://animefire.one:8443','file:///etc/passwd']){
    assert.throws(()=>assertAllowedSourceUrl(u,hosts),/não permitido|inválida/);
  }
});
test('ANI-SEC-W06 redirect para endereço interno rejeitado antes do segundo fetch',async()=>{
  let calls=0;
  await assert.rejects(fetchWithAllowedRedirects('https://animefire.one/a',{},hosts,async(url,opts)=>{
    calls++;assert.equal(opts.redirect,'manual');
    return new Response(null,{status:302,headers:{location:'http://127.0.0.1/internal'}});
  }),/não permitido/);
  assert.equal(calls,1);
});
test('ANI-SEC-W07 redirect permitido dentro da whitelist',async()=>{
  let calls=0;
  const response=await fetchWithAllowedRedirects('https://animefire.one/a',{},hosts,async()=>{
    calls++;
    return calls===1?new Response(null,{status:301,headers:{location:'https://animefire.io/a'}}):new Response('ok',{status:200});
  });
  assert.equal(await response.text(),'ok');assert.equal(calls,2);
});
test('ANI-SEC-W08 limite de redirects',async()=>{
  let calls=0;
  await assert.rejects(fetchWithAllowedRedirects('https://animefire.one/a',{},hosts,async()=>{
    calls++;return new Response(null,{status:302,headers:{location:'/a'}});
  }),/limite/);
  assert.equal(calls,4);
});
