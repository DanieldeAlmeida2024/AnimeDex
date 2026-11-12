import { configureWorker } from './worker-connection.ts';
function eq(a: unknown,b: unknown){if(a!==b) throw new Error(`expected ${String(b)}, got ${String(a)}`)}
function fails(fn:()=>unknown){let failed=false;try{fn()}catch{failed=true}if(!failed)throw new Error('expected failure')}
const t='a'.repeat(64);
Deno.test('E01 ausente: modo sem worker',()=>eq(configureWorker(null,null),null));
Deno.test('E02 HTTPS e bearer interno',()=>{const c=configureWorker('https://worker.example.test/',t);eq(c?.baseUrl,'https://worker.example.test');eq(c?.token,t)});
Deno.test('E03 par URL/token obrigatório',()=>{fails(()=>configureWorker('https://worker.example.test',null));fails(()=>configureWorker(null,t))});
Deno.test('E04 token curto rejeitado',()=>fails(()=>configureWorker('https://worker.example.test','short')));
Deno.test('E05 HTTP público rejeitado',()=>fails(()=>configureWorker('http://worker.example.test:8787',t)));
Deno.test('E06 loopback HTTP permitido para teste local',()=>eq(configureWorker('http://127.0.0.1:8787',t)?.baseUrl,'http://127.0.0.1:8787'));
Deno.test('E07 credenciais URL rejeitadas',()=>fails(()=>configureWorker('https://user:pass@worker.example.test',t)));
Deno.test('E08 paths/query/fragment proibidos',()=>{for(const u of ['https://worker.example.test/api','https://worker.example.test/?x=1','https://worker.example.test/#x'])fails(()=>configureWorker(u,t))});

Deno.test('E09 recusa token com espaço e URL malformada',()=>{fails(()=>configureWorker('https://worker.example.test',t+' '));fails(()=>configureWorker('worker.example.test',t))});
Deno.test('E10 recusa HTTP IP privado e host falso',()=>{for(const u of ['http://10.0.0.9:8787','http://169.254.169.254','http://127.0.0.1.evil.test'])fails(()=>configureWorker(u,t))});
