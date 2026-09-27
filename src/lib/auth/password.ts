import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
const KEY_LENGTH=64;
function derive(password:string,salt:Buffer,length:number,options:ScryptOptions){return new Promise<Buffer>((resolve,reject)=>scryptCallback(password,salt,length,options,(error,key)=>error?reject(error):resolve(key as Buffer)))}
export function normalizeUsername(value:string){return value.trim().normalize("NFKC").toLocaleLowerCase("en-US")}
export function validateUsername(value:string){const username=value.trim();return /^[\p{L}\p{N}_-]{3,24}$/u.test(username)?null:"用户名需为 3–24 个字母、数字、下划线或短横线"}
export function validatePassword(value:string){return value.length>=8&&value.length<=128?null:"密码长度需为 8–128 位"}
export async function hashPassword(password:string){const salt=randomBytes(16);const derived=await derive(password,salt,KEY_LENGTH,{N:16384,r:8,p:1});return `scrypt-v1$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`}
export async function verifyPassword(password:string,stored:string){const [version,n,r,p,saltValue,hashValue]=stored.split("$");if(version!=="scrypt-v1"||!saltValue||!hashValue)return false;const expected=Buffer.from(hashValue,"base64url");const actual=await derive(password,Buffer.from(saltValue,"base64url"),expected.length,{N:Number(n),r:Number(r),p:Number(p)});return expected.length===actual.length&&timingSafeEqual(expected,actual)}
