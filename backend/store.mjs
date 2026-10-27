import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const file=process.env.AURORIUM_DB||path.join(here,'data','aurorium.sqlite');
const types=['users','communities','tables','requests','sessions','notices','dues','activity','masterApplications','whatsappLog'];
export function connect(){fs.mkdirSync(path.dirname(file),{recursive:true});const db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
for(const type of types)db.exec(`CREATE TABLE IF NOT EXISTS "${type}"(id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
db.exec('CREATE TABLE IF NOT EXISTS credentials (user_id TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL)');return db}
export const database=connect();
export const all=(type)=>database.prepare(`SELECT data FROM "${type}"`).all().map(r=>JSON.parse(r.data));
export const one=(type,id)=>{if(!types.includes(type))throw new Error('Coleção inválida');if(!id)return null;const r=database.prepare(`SELECT data FROM "${type}" WHERE id=?`).get(id);return r?JSON.parse(r.data):null};
export function put(type,rec){if(!types.includes(type))throw new Error('Coleção inválida'); database.prepare(`INSERT INTO "${type}"(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`).run(rec.id,JSON.stringify(rec));return rec}
export function del(type,id){if(!types.includes(type))throw new Error('Coleção inválida');return database.prepare(`DELETE FROM "${type}" WHERE id=?`).run(id).changes>0}
export function transaction(fn){database.exec('BEGIN IMMEDIATE');try{const result=fn();database.exec('COMMIT');return result}catch(error){database.exec('ROLLBACK');throw error}}
export function setPassword(userId,password){const salt=randomBytes(16).toString('hex');const hash=scryptSync(password,salt,64).toString('hex');database.prepare('INSERT INTO credentials(user_id,salt,hash) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET salt=excluded.salt,hash=excluded.hash').run(userId,salt,hash)}
export function verifyPassword(userId,password){const row=database.prepare('SELECT salt,hash FROM credentials WHERE user_id=?').get(userId);if(!row)return false;const hash=scryptSync(password,row.salt,64);return timingSafeEqual(hash,Buffer.from(row.hash,'hex'))}
export function initialize(){if(all('users').length)return false;const seed=JSON.parse(fs.readFileSync(path.join(here,'data','seed.json'),'utf8'));transaction(()=>{for(const type of types)for(const r of seed[type]||[])put(type,r);for(const u of seed.users)setPassword(u.id,process.env.AURORIUM_DEMO_PASSWORD||'AuroriumDemo2026!')});return true}
export function reset(){transaction(()=>{for(const type of types)database.exec(`DELETE FROM "${type}"`);database.exec('DELETE FROM credentials')});initialize()}
export const id=(p)=>`${p}_${randomBytes(7).toString('hex')}`;
export const now=()=>new Date().toISOString();
