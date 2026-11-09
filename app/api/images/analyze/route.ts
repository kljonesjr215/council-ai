import {NextResponse} from "next/server";
import OpenAI from "openai";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
export async function POST(req:Request){
 try{
  const s=await createClient();const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to analyze photos."},{status:401});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"Vision provider is not configured."},{status:503});
  const body=await req.json();const images=body.images;
  if(!Array.isArray(images)||images.length<1||images.length>4||images.some((x:unknown)=>typeof x!=="string"||!/^data:image\/(jpeg|png|webp);base64,/.test(x as string)||(x as string).length>4_000_000))return NextResponse.json({error:"Select up to four JPG, PNG or WebP photos."},{status:400});
  const question=typeof body.question==="string"?body.question.slice(0,2000):"Describe the visible details.";
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const content:OpenAI.Responses.ResponseInputContent[]=[{type:"input_text",text:"Examine the supplied photos and answer the user's question accurately. State what is directly visible and what is uncertain. Do not identify people. Do not invent locations or details. Question: "+question},...images.map((url:string)=>({type:"input_image" as const,image_url:url,detail:"auto" as const}))];
  const result=await client.responses.create({model:process.env.OPENAI_VISION_MODEL||"gpt-4.1-mini",input:[{role:"user",content}]});
  return NextResponse.json({analysis:result.output_text});
 }catch(e){console.error("Council vision error",e);return NextResponse.json({error:e instanceof Error?e.message:"Photo analysis failed"},{status:502})}
}
