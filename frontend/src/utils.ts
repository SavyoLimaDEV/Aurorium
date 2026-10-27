import type {GameTable,Request,Session,State} from './types';
export const DOW=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
export const SYSTEMS=['D&D 5e','Tormenta20','Ordem Paranormal','Pathfinder 2e','Call of Cthulhu','Vampiro: A Máscara','Outro'];
export const STATUS:Record<string,string>={open:'Aberta',closed:'Encerrada',archived:'Arquivada',pending:'Pendente',approved:'Aprovado',rejected:'Rejeitada',waitlisted:'Em espera',cancelled:'Cancelada',paid:'Pago',late:'Atrasado',scheduled:'Agendada',completed:'Concluída'};
export const ROLE:Record<string,string>={player:'Jogador',master:'Mestre',admin:'Administrador'};
export const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0);
export const date=(s:string)=>s?new Date(`${s.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}):'--';
export const today=()=>new Date().toISOString().slice(0,10);
export const slots=(t:GameTable,requests:Request[])=>Math.max(0,t.capacity-requests.filter(x=>x.tableId===t.id&&x.status==='approved').length);
export const members=(t:GameTable,requests:Request[])=>requests.filter(r=>r.tableId===t.id&&r.status==='approved');
export const nextSessions=(s:State,tid?:string)=>s.sessions.filter(x=>x.date>=today()&&x.status==='scheduled'&&(!tid||x.tableId===tid)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
export const tableImage=(system:string)=>{if(system.includes('Vampiro')||system.includes('Ordem'))return '/assets/bastiao.webp';if(system.includes('Cthulhu'))return '/assets/castelo-dragao.webp';if(system.includes('Tormenta'))return '/assets/hero-castelo.webp';return '/assets/salao-d20.webp'};
export const sampleSchedule=(sessions:Session[],tableIds:string[])=>sessions.filter(x=>tableIds.includes(x.tableId)&&x.date>=today()&&x.status==='scheduled').sort((a,b)=>a.date.localeCompare(b.date));
export async function api<T=unknown>(path:string,method='GET',body?:unknown):Promise<T>{const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await response.json().catch(()=>({error:'Resposta inválida do servidor'}));if(!response.ok)throw new Error(data.error||'Erro na operação');return data as T}
