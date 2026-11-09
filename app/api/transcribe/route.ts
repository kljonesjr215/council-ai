import {NextResponse} from "next/server";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const key=process.env.OPENAI_API_KEY;
  if(!key)return NextResponse.json({error:"Voice transcription is not configured."},{status:503});
  const data=await request.formData();
  const audio=data.get("audio");
  if(!(audio instanceof File)||!audio.type.startsWith("audio/"))return NextResponse.json({error:"An audio recording is required."},{status:400});
  if(audio.size>10*1024*1024)return NextResponse.json({error:"Recording exceeds the 10 MB limit."},{status:413});
  const form=new FormData();form.append("file",audio,"dictation.webm");form.append("model","whisper-1");form.append("language","en");
  const result=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:"Bearer "+key},body:form,signal:AbortSignal.timeout(45000)});
  const json=await result.json().catch(()=>({}));
  if(!result.ok)return NextResponse.json({error:"Voice transcription failed. Please try again."},{status:502});
  return NextResponse.json({text:typeof json.text==="string"?json.text:""});
 }catch{return NextResponse.json({error:"Unable to process the recording."},{status:500})}
}
