export type Role = 'player' | 'master' | 'admin';
export type Status = 'open'|'closed'|'archived'|'pending'|'approved'|'rejected'|'waitlisted'|'cancelled'|'paid'|'late'|'scheduled'|'completed';
export interface Prefs {inApp:boolean;whatsapp:boolean;types:string[];lead:number;hours:string}
export interface User {id:string;name:string;email:string;username?:string;role:Role;phone?:string;joined:string[];masterCommunities:string[];systems:string[];days:number[];mode?:string;notify:Prefs}
export interface Community {id:string;name:string;description:string;adminId:string;type:'free'|'paid';active:boolean;rules:string;fee:number}
export interface GameTable {id:string;name:string;communityId:string;masterId:string;system:string;genre:string;description:string;mode:string;capacity:number;days:number[];time:string;duration:number;recurrence:string;start:string;end:string;status:Status;waitlist:boolean;rules:string}
export interface Request {id:string;tableId:string;userId:string;status:Status;date:string}
export interface Session {id:string;tableId:string;title:string;date:string;time:string;duration:number;status:Status;seriesId:string;attendance:Record<string,'present'|'absent'|'unmarked'>}
export interface Notice {id:string;userId:string;type:string;text:string;date:string;read:boolean;href:string;whatsappStatus?:string}
export interface Due {id:string;communityId:string;userId:string;period:string;amount:number;due:string;status:Status}
export interface Application {id:string;userId:string;communityId:string;status:Status;date:string}
export interface Activity {id:string;text:string;date:string}
export interface WLog {id:string;userId:string;type:string;text:string;date:string;status:string}
export interface State {me:User;users:User[];communities:Community[];tables:GameTable[];requests:Request[];sessions:Session[];notices:Notice[];dues:Due[];activity:Activity[];masterApplications:Application[];whatsappLog:WLog[]}
export type Page = 'inicio'|'login'|'painel'|'explorar'|'comunidades'|'administrar-comunidades'|'minhas-mesas'|'inscricoes'|'agenda'|'presencas'|'usuarios'|'mensalidades'|'relatorios'|'notificacoes'|'preferencias'|'perfil';
