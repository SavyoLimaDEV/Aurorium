import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { randomBytes } from 'node:crypto';
import {all,one,put,del,transaction,verifyPassword,setPassword,initialize,id,now} from './store.mjs';
initialize();
const port=Number(process.env.PORT||3333);
const sessions=new Map();
const allowedOrigins=['http://127.0.0.1:5173','http://localhost:5173'];
const weekDays=[0,1,2,3,4,5,6];
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/dist');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon','.woff2':'font/woff2'};
function serveFrontend(pathname,res){
 if(!fs.existsSync(dist))return json(res,503,{error:'Frontend ainda não compilado. Execute npm run build.'});
 let filename;
 try{filename=decodeURIComponent(pathname)}catch{return json(res,400,{error:'Caminho inválido'})}
 const requested=path.resolve(dist,'.'+filename);
 if(requested!==dist&&!requested.startsWith(dist+path.sep))return json(res,403,{error:'Acesso negado'});
 const file=fs.existsSync(requested)&&fs.statSync(requested).isFile()?requested:path.join(dist,'index.html');
 res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':file.endsWith('index.html')?'no-cache':'public, max-age=3600'});
 fs.createReadStream(file).pipe(res);
}

class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new HttpError(status,message)};
function json(res,status,obj,headers={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers});res.end(JSON.stringify(obj))}
const canAdmin=(actor,c)=>!!actor && actor.role==='admin'&&c?.adminId===actor.id;
const canMaster=(actor,t)=>!!actor&&(canAdmin(actor,one('communities',t?.communityId))||(actor.role==='master'&&t?.masterId===actor.id&&actor.masterCommunities?.includes(t.communityId)));
const members=tid=>all('requests').filter(r=>r.tableId===tid&&r.status==='approved');
const slots=t=>Math.max(0,Number(t.capacity||0)-members(t.id).length);
function notify(userId,type,text,href='notices'){
 const user=one('users',userId);if(!user)return;const prefs=user.notify||{};
 if(prefs.inApp!==false)put('notices',{id:id('n'),userId,type,text,date:now(),read:false,href,whatsappStatus:prefs.whatsapp&&prefs.types?.includes(type)?'Simulado':'Não autorizado'});
 if(prefs.whatsapp&&prefs.types?.includes(type))put('whatsappLog',{id:id('wa'),userId,type,text,date:now(),status:'Simulado'});
}
function record(text){put('activity',{id:id('a'),text,date:now()})}
function parseCookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(a=>a.length===2))}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>200000)fail(413,'Requisição muito grande')}try{return raw?JSON.parse(raw):{}}catch{fail(400,'JSON inválido')}}
const dateOnly=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||''));
function schedule(t,p){
 const start=new Date(`${p.start||t.start}T12:00:00`),end=new Date(`${p.end||t.end}T12:00:00`),days=(p.days||t.days||[]).map(Number),recurrence=p.recurrence||t.recurrence||'weekly';let out=[];
 if(!(start<=end))fail(400,'Intervalo de datas inválido');const len=Math.min(370,Math.round((end-start)/86400000));const seriesId=id('series');
 for(let i=0;i<=len&&out.length<80;i++){
  const d=new Date(start);d.setDate(start.getDate()+i);
  if(recurrence==='once'&&i>0)break;
  if(recurrence==='weekly'&&!days.includes(d.getDay()))continue;
  if(recurrence==='biweekly'&&(!days.includes(d.getDay())||Math.floor(i/7)%2!==0))continue;
  if(recurrence==='monthly'&&d.getDate()!==start.getDate())continue;
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');
  out.push({id:id('s'),tableId:t.id,title:p.title||'Sessão de campanha',date:`${y}-${m}-${dd}`,time:p.time||t.time,duration:Number(p.duration||t.duration||3),status:'scheduled',seriesId,attendance:{}});
 }
 return out;
}
function state(actor){const communities=all('communities');const users=all('users').map(u=>({...u,email:actor.id===u.id||actor.role==='admin'&&communities.some(c=>c.adminId===actor.id&&u.joined?.includes(c.id))?u.email:'',phone:actor.id===u.id?u.phone:'',notify:actor.id===u.id?u.notify:undefined}));return {me:actor,users,communities:all('communities'),tables:all('tables'),requests:all('requests'),sessions:all('sessions'),notices:all('notices').filter(n=>n.userId===actor.id),dues:all('dues').filter(d=>actor.role==='admin'&&canAdmin(actor,one('communities',d.communityId))),activity:all('activity').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,40),masterApplications:all('masterApplications'),whatsappLog:all('whatsappLog').filter(w=>w.userId===actor.id)}}
function validateTable(data,actor,existing){const c=one('communities',data.communityId||existing?.communityId);if(!c)fail(400,'Comunidade inválida');if(existing&&data.communityId&&data.communityId!==existing.communityId)fail(400,'Não é possível transferir uma mesa entre comunidades por edição');const master=existing?.masterId||actor.id;
 if(!existing&&!((actor.role==='master'&&actor.masterCommunities?.includes(c.id))||canAdmin(actor,c)))fail(403,'Sem autorização na comunidade');
 if(existing&&!canMaster(actor,existing))fail(403,'Você não pode editar esta mesa');
 const capacity=Number(data.capacity??existing?.capacity);if(!(capacity>=1&&capacity<=30))fail(400,'Capacidade deve estar entre 1 e 30');if(existing&&capacity<members(existing.id).length)fail(400,'Capacidade menor que número de participantes aprovados');
 if(!(data.name||existing?.name)?.trim())fail(400,'Informe o nome da mesa');
 const days=(data.days||existing?.days||[]).map(Number).filter(x=>weekDays.includes(x));
 if(!days.length&&data.recurrence!=='once')fail(400,'Selecione um dia da semana');
 const start=data.start||existing?.start, end=data.end||existing?.end;if(!dateOnly(start)||!dateOnly(end)||end<start)fail(400,'Datas inválidas');
 return {...existing,...data, id:existing?.id||id('t'),name:String(data.name||existing?.name).trim(),communityId:c.id,masterId:master,capacity,days,time:data.time||existing?.time||'19:00',start,end,recurrence:data.recurrence||existing?.recurrence||'weekly',duration:Number(data.duration||existing?.duration||3),status:data.status||existing?.status||'open',waitlist:data.waitlist!==false};
}
export async function app(req,res){try{
 const url=new URL(req.url,'http://localhost');const pathname=url.pathname,method=req.method;
 if(method==='GET'&&!pathname.startsWith('/api/'))return serveFrontend(pathname,res);
 const origin=req.headers.origin;
 if(origin){
  let sameOrigin=false;
  try{
   const urlOrigin=new URL(origin);
   sameOrigin=urlOrigin.host===req.headers.host &&
    (urlOrigin.protocol==='https:' || (urlOrigin.protocol==='http:' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||'')));
  }catch{}
  if(!sameOrigin&&!allowedOrigins.includes(origin))fail(403,'Origem não autorizada');
 }
 if(method==='GET'&&pathname==='/api/health')return json(res,200,{ok:true,service:'aurorium-api',persistence:'SQLite'});
 if(method==='POST'&&pathname==='/api/login'){
  const b=await body(req);const user=all('users').find(u=>u.email.toLowerCase()===String(b.email||'').toLowerCase());
  if(!user||!verifyPassword(user.id,String(b.password||'')))fail(401,'E-mail ou senha inválidos');
  const token=randomBytes(28).toString('hex');sessions.set(token,user.id);return json(res,200,{user},{'set-cookie':`aurorium_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`});
 }
 if(method==='POST'&&pathname==='/api/register'){
  const b=await body(req);if(!b.name?.trim()||!/^\S+@\S+\.\S+$/.test(b.email||'')||String(b.password||'').length<8)fail(400,'Nome, e-mail válido e senha de pelo menos 8 caracteres são obrigatórios');if(all('users').some(u=>u.email.toLowerCase()===b.email.toLowerCase()))fail(409,'E-mail já cadastrado');
  const user={id:id('u'),name:b.name.trim(),email:b.email.toLowerCase(),role:'player',joined:[],masterCommunities:[],systems:[],days:[],mode:'Online',phone:'',notify:{inApp:true,whatsapp:false,types:['vacancy','approval','session'],lead:3,hours:'09:00-21:00'}};transaction(()=>{put('users',user);setPassword(user.id,b.password)});return json(res,201,{user});
 }
 const token=parseCookies(req).aurorium_session;const sessionUserId=token?sessions.get(token):null;const actor=sessionUserId?one('users',sessionUserId):null;
 if(!actor)fail(401,'Faça login para continuar');
 if(method==='POST'&&pathname==='/api/logout'){sessions.delete(token);return json(res,200,{ok:true},{'set-cookie':'aurorium_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'})}
 if(method==='GET'&&pathname==='/api/state')return json(res,200,state(actor));
 if(method==='POST'&&pathname==='/api/tables'){
  const b=await body(req),t=validateTable(b,actor);transaction(()=>{put('tables',t);for(const s of schedule(t,t))put('sessions',s);record(`${actor.name} publicou a mesa ${t.name}`)});return json(res,201,t)
 }
 let m=pathname.match(/^\/api\/tables\/([^/]+)$/);
 if(m&&method==='PATCH'){
  const original=one('tables',m[1]);if(!original)fail(404,'Mesa não encontrada');const b=await body(req),t=validateTable(b,actor,original);transaction(()=>{put('tables',t);record(`${actor.name} atualizou ${t.name}`)});return json(res,200,t)
 }
 if(m&&method==='DELETE'){
  const t=one('tables',m[1]);if(!t)fail(404,'Mesa não encontrada');if(!canMaster(actor,t))fail(403,'Acesso negado');transaction(()=>{put('tables',{...t,status:'archived'});record(`Mesa arquivada: ${t.name}`)});return json(res,200,{ok:true})
 }
 if(method==='POST'&&pathname==='/api/requests'){
  const b=await body(req),t=one('tables',b.tableId);if(!t||t.status!=='open')fail(400,'Mesa indisponível');if(actor.role!=='player')fail(403,'Use um perfil de Jogador');
  if(all('requests').some(r=>r.tableId===t.id&&r.userId===actor.id&&['pending','waitlisted','approved'].includes(r.status)))fail(409,'Você já tem inscrição ativa');
  const kind=slots(t)===0?'waitlisted':'pending';if(kind==='waitlisted'&&!t.waitlist)fail(400,'Lista de espera indisponível');
  const r={id:id('r'),tableId:t.id,userId:actor.id,status:kind,date:now()};transaction(()=>{put('requests',r);notify(t.masterId,'request',`${actor.name} demonstrou interesse na mesa ${t.name}.`,'requests');record(`Nova inscrição para ${t.name}`)});return json(res,201,r)
 }
 m=pathname.match(/^\/api\/requests\/([^/]+)$/);
 if(m&&method==='PATCH'){
  const r=one('requests',m[1]),t=one('tables',r?.tableId);if(!r||!t)fail(404,'Solicitação não encontrada');const b=await body(req);
  if(b.status==='cancelled'){if(r.userId!==actor.id&&!canMaster(actor,t))fail(403,'Acesso negado');}
  else if(b.status==='pending'&&r.status==='waitlisted'&&r.userId===actor.id){if(slots(t)<1)fail(409,'Ainda não há vagas disponíveis');notify(t.masterId,'request',`${actor.name} confirmou interesse em uma vaga de ${t.name}.`,'requests');}
  else {if(!canMaster(actor,t))fail(403,'Somente o Mestre ou Administrador pode aprovar');if(!['approved','rejected','pending'].includes(b.status))fail(400,'Status inválido');if(b.status==='approved'&&slots(t)<=0&&r.status!=='approved')fail(409,'Mesa lotada');}
  const originalStatus=r.status;r.status=b.status;transaction(()=>{put('requests',r);notify(r.userId,'approval',`Sua inscrição em ${t.name} está: ${r.status}.`,'requests');if(originalStatus==='approved'&&r.status!=='approved'){const waiting=all('requests').filter(x=>x.tableId===t.id&&x.status==='waitlisted');waiting.forEach(w=>notify(w.userId,'vacancy',`Uma vaga surgiu em ${t.name}. Confira a mesa para solicitar participação.`,'explore'));}record(`Inscrição atualizada em ${t.name}`)});return json(res,200,r)
 }
 if(method==='POST'&&pathname==='/api/sessions'){
  const b=await body(req),t=one('tables',b.tableId);if(!t||!canMaster(actor,t))fail(403,'Sem autorização para agendar');const arr=schedule(t,b);if(!arr.length)fail(400,'Recorrência não produziu sessões');transaction(()=>{for(const s of arr)put('sessions',s);for(const r of members(t.id))notify(r.userId,'session',`Novas sessões foram agendadas em ${t.name}.`,'calendar');record(`Agenda atualizada: ${t.name}`)});return json(res,201,{created:arr.length})
 }
 m=pathname.match(/^\/api\/sessions\/([^/]+)$/);
 if(m&&method==='PATCH'){
  const s=one('sessions',m[1]),t=one('tables',s?.tableId);if(!s||!canMaster(actor,t))fail(403,'Sem autorização');const b=await body(req);const fields=Object.fromEntries(Object.entries(b).filter(([k])=>['date','time','title','duration','status'].includes(k)));const updated={...s,...fields};if(!dateOnly(updated.date))fail(400,'Data inválida');const affected=b.scope==='future'&&s.seriesId?all('sessions').filter(x=>x.seriesId===s.seriesId&&x.date>=s.date):[s];transaction(()=>{for(const old of affected)put('sessions',{...old,...Object.fromEntries(Object.entries(fields).filter(([k])=>k!=='date'||old.id===s.id))});members(t.id).forEach(r=>notify(r.userId,'session',`Sessão de ${t.name} alterada ou cancelada.`,'calendar'));record(`Sessão atualizada: ${t.name}`)});return json(res,200,{...updated,affected:affected.length})
 }
 m=pathname.match(/^\/api\/sessions\/([^/]+)\/attendance$/);
 if(m&&method==='PATCH'){
  const s=one('sessions',m[1]),t=one('tables',s?.tableId);if(!s||!canMaster(actor,t))fail(403,'Sem autorização');const b=await body(req);if(!members(t.id).some(r=>r.userId===b.userId))fail(400,'Jogador não pertence à mesa');if(!['present','absent','unmarked'].includes(b.value))fail(400,'Presença inválida');s.attendance={...s.attendance,[b.userId]:b.value};put('sessions',s);return json(res,200,s)
 }
 if(method==='POST'&&pathname==='/api/communities'){
  if(actor.role!=='admin')fail(403,'Acesso restrito');const b=await body(req);if(!String(b.name||'').trim())fail(400,'Nome obrigatório');const c={id:id('c'),name:b.name.trim(),description:b.description||'',adminId:actor.id,type:b.type==='paid'?'paid':'free',fee:Number(b.fee||0),active:true,rules:b.rules||''};put('communities',c);return json(res,201,c)
 }
 m=pathname.match(/^\/api\/communities\/([^/]+)$/);
 if(m&&method==='PATCH'){
  const c=one('communities',m[1]);if(!canAdmin(actor,c))fail(403,'Acesso restrito');const b=await body(req);const updated={...c,...Object.fromEntries(Object.entries(b).filter(([k])=>['name','description','rules','type','fee','active'].includes(k)))};put('communities',updated);return json(res,200,updated)
 }
 m=pathname.match(/^\/api\/users\/([^/]+)$/);
 if(m&&method==='PATCH'){
  const target=one('users',m[1]);if(!target)fail(404,'Usuário não encontrado');const b=await body(req);
  if(b.action==='approve-master'){
   const c=one('communities',b.communityId);if(!canAdmin(actor,c))fail(403,'Acesso restrito');target.role='master';target.masterCommunities=[...new Set([...(target.masterCommunities||[]),c.id])];target.joined=[...new Set([...(target.joined||[]),c.id])];notify(target.id,'community',`Você foi habilitado como Mestre em ${c.name}.`);put('users',target);return json(res,200,target)
  }
  if(actor.id!==target.id)fail(403,'Só é possível editar o próprio perfil');
  const updated={...target,...Object.fromEntries(Object.entries(b).filter(([k])=>['name','phone','systems','days','mode','notify'].includes(k)))};put('users',updated);return json(res,200,updated)
 }
 if(method==='POST'&&pathname==='/api/master-applications'){
  const b=await body(req),c=one('communities',b.communityId);if(!c)fail(400,'Comunidade inexistente');if(all('masterApplications').some(x=>x.userId===actor.id&&x.communityId===c.id&&x.status==='pending'))fail(409,'Já existe solicitação pendente');const r={id:id('ma'),userId:actor.id,communityId:c.id,status:'pending',date:now()};transaction(()=>{put('masterApplications',r);notify(c.adminId,'community',`${actor.name} pediu habilitação como Mestre em ${c.name}.`,'admin-users')});return json(res,201,r)
 }
 m=pathname.match(/^\/api\/master-applications\/([^/]+)$/);
 if(m&&method==='PATCH'){
  const r=one('masterApplications',m[1]),c=one('communities',r?.communityId);if(!r||!canAdmin(actor,c))fail(403,'Acesso negado');const b=await body(req);if(!['approved','rejected'].includes(b.status))fail(400,'Status inválido');r.status=b.status;transaction(()=>{put('masterApplications',r);if(r.status==='approved'){const u=one('users',r.userId);u.role='master';u.joined=[...new Set([...(u.joined||[]),c.id])];u.masterCommunities=[...new Set([...(u.masterCommunities||[]),c.id])];put('users',u)}notify(r.userId,'community',`Pedido para ser mestre em ${c.name}: ${r.status}.`)});return json(res,200,r)
 }
 if(method==='POST'&&pathname==='/api/join-community'){
  const b=await body(req),c=one('communities',b.communityId);if(!c||!c.active)fail(400,'Comunidade indisponível');actor.joined=[...new Set([...(actor.joined||[]),c.id])];put('users',actor);return json(res,200,actor)
 }
 if(method==='POST'&&pathname==='/api/dues'){
  if(actor.role!=='admin')fail(403,'Acesso negado');const b=await body(req),c=one('communities',b.communityId);if(!canAdmin(actor,c)||c.type!=='paid')fail(403,'Comunidade inválida');if(!one('users',b.userId))fail(400,'Usuário inválido');const d={id:id('d'),communityId:c.id,userId:b.userId,period:b.period||new Date().toISOString().slice(0,7),amount:Number(b.amount||0),due:b.due||new Date().toISOString().slice(0,10),status:'pending'};put('dues',d);return json(res,201,d)
 }
 m=pathname.match(/^\/api\/dues\/([^/]+)$/);
 if(m&&method==='PATCH'){
  const d=one('dues',m[1]),c=one('communities',d?.communityId);if(!d||!canAdmin(actor,c))fail(403,'Acesso negado');const b=await body(req);if(!['paid','pending','late'].includes(b.status))fail(400,'Situação inválida');d.status=b.status;put('dues',d);return json(res,200,d)
 }
 m=pathname.match(/^\/api\/notices\/([^/]+)$/);
 if(m&&method==='PATCH'){
  const n=one('notices',m[1]);if(!n||n.userId!==actor.id)fail(403,'Acesso negado');n.read=true;put('notices',n);return json(res,200,n)
 }
 if(method==='POST'&&pathname==='/api/notices/read-all'){
  for(const n of all('notices').filter(n=>n.userId===actor.id&&!n.read))put('notices',{...n,read:true});return json(res,200,{ok:true})
 }
 fail(404,'Rota não encontrada');
 }catch(error){console.error('API:',error.status||500,error.message);json(res,error.status||500,{error:error.status?error.message:'Erro interno do servidor'})}}
const server=http.createServer(app);
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll('\\','/')))server.listen(port,process.env.RENDER?'0.0.0.0':'127.0.0.1',()=>console.log(`Aurorium API iniciada na porta ${port}`));
export {server};
