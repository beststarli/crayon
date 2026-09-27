import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerConfig, storageConfigured } from "../env";
let client: S3Client | null = null;
export function getStorage() {
  if (!storageConfigured()) throw new Error("STORAGE_NOT_CONFIGURED");
  const c = getServerConfig();
  client ??= new S3Client({ region:c.rustfsRegion, endpoint:c.rustfsEndpoint, forcePathStyle:true, credentials:{accessKeyId:c.rustfsAccessKey!,secretAccessKey:c.rustfsSecretKey!} });
  return { client, bucket:c.rustfsBucket! };
}
export async function presignPut(key:string,type:string) { const s=getStorage(); return getSignedUrl(s.client,new PutObjectCommand({Bucket:s.bucket,Key:key,ContentType:type}),{expiresIn:300}); }
export async function presignGet(key:string) { const s=getStorage(); return getSignedUrl(s.client,new GetObjectCommand({Bucket:s.bucket,Key:key}),{expiresIn:300}); }
export async function headObject(key:string) { const s=getStorage(); return s.client.send(new HeadObjectCommand({Bucket:s.bucket,Key:key})); }
export async function deleteObject(key:string) { const s=getStorage(); return s.client.send(new DeleteObjectCommand({Bucket:s.bucket,Key:key})); }
