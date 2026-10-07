import {NextResponse} from "next/server";
import {z} from "zod";
import {deliberate} from "@/lib/council";
import {createClient} from "@/lib/supabase/server";

const member=z.object({id:z.string(),provider:z.enum(["openai","anthropic","google","custom"]),label:z.string(),model:z.string().min(1),enabled:z.boolean(),role:z.string().optional()});
const schema=z.object({prompt:z.string().min(1).max(20000),mode:z.enum(["ask","challenge-member","challenge-council","final"]).default("ask"),targetMemberId:z.string().optional(),conversationId:z.string().uuid().optional(),members:z.array(member).min(1).max(8)});
export async function POST(req:Request){
 try{
  const b=schema.parse(await req.json());
  const configured=b.members.filter(m=>m.enabled&&m.model.trim());
  if(!configured.length) return NextResponse.json({error:"Choose at least one configured Council member."},{status:400});
  const selected=b.mode==="challenge-member"&&b.targetMemberId?configured.filter(m=>m.id===b.targetMemberId):configured;
  if(!selected.length) return NextResponse.json({error:"That Council member is not active."},{status:400});
  const responses=await deliberate(b.prompt,b.mode,selected);
  let conversationId=b.conversationId;
  try{
   const s=await createClient(); const {data:{user}}=await s.auth.getUser();
   if(user){
    if(!conversationId){const {data,error}=await s.from("conversations").insert({user_id:user.id,title:b.prompt.slice(0,80)}).select("id").single();if(error)throw error;conversationId=data.id}
    await s.from("messages").insert({user_id:user.id,conversation_id:conversationId,role:"user",content:b.prompt});
    const {data:turn,error:turnError}=await s.from("council_turns").insert({user_id:user.id,conversation_id:conversationId,mode:b.mode,prompt:b.prompt,status:b.mode==="final"?"final":"deliberating"}).select("id").single();
    if(turnError)throw turnError;
    if(responses.length){const {error}=await s.from("council_responses").insert(responses.map(r=>({user_id:user.id,turn_id:turn.id,member_key:r.member.id,provider:r.member.provider,model:r.member.model,label:r.member.label,role:r.member.role||null,content:r.text,ok:r.ok})));if(error)throw error}
   }
  }catch(e){console.error("Council persistence failed",e)}
  return NextResponse.json({responses,conversationId,status:b.mode==="final"?"final":"deliberating"});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Request failed"},{status:400})}
}
