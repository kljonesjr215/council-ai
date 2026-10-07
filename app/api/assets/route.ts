import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

const MAX_BYTES=25*1024*1024;
const ALLOWED_DOCS=new Set(["application/pdf","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
function classify(type:string){
 if(type.startsWith("image/")) return "image";
 if(type.startsWith("audio/")) return "audio";
 if(type.startsWith("video/")) return "video";
 if(ALLOWED_DOCS.has(type)) return "document";
 return null;
}
export async function POST(req:Request){
 try{
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user) return NextResponse.json({error:"Sign in required"},{status:401});
  const form=await req.formData();
  const files=form.getAll("files").filter((v):v is File=>v instanceof File);
  if(!files.length) return NextResponse.json({error:"No files selected"},{status:400});
  const saved=[];
  for(const file of files){
   const kind=classify(file.type);
   if(!kind) return NextResponse.json({error:"Unsupported file type"},{status:415});
   if(file.size>MAX_BYTES) return NextResponse.json({error:"A file exceeds the 25 MB limit"},{status:413});
   const path=user.id+"/"+crypto.randomUUID();
   const {error:uploadError}=await s.storage.from("council-private").upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError) throw uploadError;
   const {data,error}=await s.from("assets").insert({user_id:user.id,kind,storage_path:path,mime_type:file.type,metadata:{size:file.size}}).select("id,kind,mime_type").single();
   if(error){await s.storage.from("council-private").remove([path]);throw error}
   saved.push(data);
  }
  return NextResponse.json({assets:saved});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Upload failed"},{status:400})}
}
