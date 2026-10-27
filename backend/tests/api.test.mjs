import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'aurorium-test-'));
const port=33993,origin=`http://127.0.0.1:${port}`;
const proc=spawn(process.execPath,['--experimental-sqlite','backend/server.mjs'],{cwd:root,env:{...process.env,AURORIUM_DB:path.join(folder,'test.sqlite'),PORT:String(port)},stdio:['ignore','pipe','pipe']});
let errorLog='';proc.stderr.on('data',chunk=>errorLog+=chunk.toString());
async function waitForServer(){for(let i=0;i<80;i++){try{const r=await fetch(origin+'/api/health');if(r.ok)return}catch{}await new Promise(resolve=>setTimeout(resolve,70))}throw Error('Servidor indisponível: '+errorLog)}
async function api(route,method='GET',data,cookie){const r=await fetch(origin+'/api'+route,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});const payload=await r.json();return {status:r.status,data:payload,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
test('Aurorium: autenticação, proteção, mesas, inscrição, sessões e presença',async t=>{
 t.after(()=>proc.kill());
 await waitForServer();
 await t.test('API saudável',async()=>{const r=await api('/health');assert.equal(r.status,200);assert.equal(r.data.persistence,'SQLite')});
 const noauth=await api('/state');assert.equal(noauth.status,401);
 const adminLogin=await api('/login','POST',{email:'admin@demo.rpg',password:'AuroriumDemo2026!'});assert.equal(adminLogin.status,200);const admin=adminLogin.cookie;
 const playerLogin=await api('/login','POST',{email:'jogador@demo.rpg',password:'AuroriumDemo2026!'});assert.equal(playerLogin.status,200);const player=playerLogin.cookie;
 const adminState=await api('/state','GET',undefined,admin);assert.equal(adminState.data.me.role,'admin');assert.ok(adminState.data.users.length>=15);
 const comm=adminState.data.communities.find(c=>c.adminId==='u_admin');assert.ok(comm);
 const tableData={name:'Cidadela de Teste',description:'Mesa criada pela suíte de testes.',communityId:comm.id,system:'D&D 5e',genre:'Fantasia',mode:'Online',capacity:1,days:[3],start:'2026-11-01',end:'2026-12-01',time:'19:00',duration:3,recurrence:'weekly',status:'open',waitlist:true,rules:'Respeito'};
 const forbidden=await api('/tables','POST',tableData,player);assert.equal(forbidden.status,403);
 const created=await api('/tables','POST',tableData,admin);assert.equal(created.status,201);const id=created.data.id;
 const request=await api('/requests','POST',{tableId:id},player);assert.equal(request.status,201);assert.equal(request.data.status,'pending');
 const duplicate=await api('/requests','POST',{tableId:id},player);assert.equal(duplicate.status,409);
 const approved=await api('/requests/'+request.data.id,'PATCH',{status:'approved'},admin);assert.equal(approved.status,200);
 const state=await api('/state','GET',undefined,admin);assert.equal(state.data.requests.filter(r=>r.tableId===id&&r.status==='approved').length,1);
 const s=state.data.sessions.find(s=>s.tableId===id);assert.ok(s);
 const attendance=await api('/sessions/'+s.id+'/attendance','PATCH',{userId:'u_player',value:'present'},admin);assert.equal(attendance.status,200);
 const final=await api('/state','GET',undefined,admin);assert.equal(final.data.sessions.find(q=>q.id===s.id).attendance.u_player,'present');
 const invalid=await api('/tables/'+id,'PATCH',{capacity:0},admin);assert.equal(invalid.status,400);
 const registered=await api('/register','POST',{name:'Jogador da Fila',email:'fila@aurorium.test',password:'SenhaTeste2026!'});assert.equal(registered.status,201);
 const loginWait=await api('/login','POST',{email:'fila@aurorium.test',password:'SenhaTeste2026!'});assert.equal(loginWait.status,200);const waitCookie=loginWait.cookie;
 const waPrefs={inApp:true,whatsapp:true,types:['vacancy','approval','session'],lead:3,hours:'09:00-21:00'};
 const prefs=await api('/users/'+registered.data.user.id,'PATCH',{notify:waPrefs},waitCookie);assert.equal(prefs.status,200);
 const waitReq=await api('/requests','POST',{tableId:id},waitCookie);assert.equal(waitReq.status,201);assert.equal(waitReq.data.status,'waitlisted');
 const removal=await api('/requests/'+request.data.id,'PATCH',{status:'cancelled'},admin);assert.equal(removal.status,200);
 const waitState=await api('/state','GET',undefined,waitCookie);assert.ok(waitState.data.notices.some(n=>n.type==='vacancy'));assert.ok(waitState.data.whatsappLog.some(n=>n.type==='vacancy'&&n.status==='Simulado'));
 const interested=await api('/requests/'+waitReq.data.id,'PATCH',{status:'pending'},waitCookie);assert.equal(interested.status,200);
 const approveNew=await api('/requests/'+waitReq.data.id,'PATCH',{status:'approved'},admin);assert.equal(approveNew.status,200);
 const future=await api('/sessions/'+s.id,'PATCH',{time:'20:30',scope:'future'},admin);assert.equal(future.status,200);assert.ok(future.data.affected>=1);

});
process.on('exit',()=>{proc.kill();try{fs.rmSync(folder,{recursive:true,force:true})}catch{}});
