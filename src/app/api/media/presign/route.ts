import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api";
import { currentUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getServerConfig } from "@/lib/env";
import { presignPut } from "@/lib/storage/s3";
const allowed = new Set(["image/jpeg","image/png","image/webp"]);
export async function POST(request:Request) {
 const userId=await currentUserId(request); if(!userId)return apiError("未登录",401,"UNAUTHORIZED");
 try { const body=await request.json(); const type=String(body.mimeType??""); const purpose=String(body.purpose??""); const size=Number(body.byteSize??0);
  if(!allowed.has(type)||size<=0||size>15*1024*1024)return apiError("仅支持 15MB 以内的 JPG、PNG 或 WebP");
  if(!["avatar","artwork-source"].includes(purpose))return apiError("图片用途无效");
  const id=randomUUID(); const ext=type.split("/")[1].replace("jpeg","jpg"); const key=`users/${userId}/${purpose}/${id}.${ext}`; const bucket=getServerConfig().rustfsBucket!;
  await query(`INSERT INTO media_objects(id,owner_id,purpose,bucket,object_key,mime_type,byte_size) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,userId,purpose,bucket,key,type,size]);
  return NextResponse.json({mediaId:id,objectKey:key,uploadUrl:await presignPut(key,type),expiresIn:300});
 } catch(error){ if(error instanceof Error&&error.message==="STORAGE_NOT_CONFIGURED")return apiError("RustFS 尚未配置",503,"STORAGE_NOT_CONFIGURED"); return handleApiError(error); }
}
