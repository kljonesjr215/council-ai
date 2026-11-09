import {NextResponse} from "next/server";
import OpenAI from "openai";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
const MAX_PROMPT=3000;
export async function POST(req:Request){
 try{
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to generate images."},{status:401});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"Image provider is not configured. Add OPENAI_API_KEY to Vercel."},{status:503});
  const body=await req.json();
  const prompt=typeof body.prompt==="string"?body.prompt.trim():"";
  if(!prompt||prompt.length>MAX_PROMPT)return NextResponse.json({error:"Enter an image request under 3000 characters."},{status:400});
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const result=await client.images.generate({model:"gpt-image-1",prompt,n:1,size:"1024x1024"});
  const base64=result.data?.[0]?.b64_json;
  if(!base64)return NextResponse.json({error:"Image provider did not return an image."},{status:502});
  return NextResponse.json({image:"data:image/png;base64,"+base64});
 }catch(e){console.error("Council image generation failed",e);return NextResponse.json({error:e instanceof Error?e.message:"Image generation failed"},{status:500})}
}
