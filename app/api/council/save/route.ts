import {NextResponse} from "next/server";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";

const member=z.object({id:z.string(),provider:z.enum(["openai","anthropic","google","custom"]),label:z.string(),model:z.string(),enabled:z.boolean(),role:z.string().optional()});
const response=z.object({member,text:z.string(),ok:z.boolean()});
const schema=z.object({prompt:z.string().min(1).max(20000),mode:z.enum(["ask","challenge-member","challenge-council","final","conclusion"]),conversationId:z.string().uuid().optional(),responses:z.array(response).max(8)});
export async function POST(req:Request){
 try{
  const b=schema.parse(await req.json());let conversationId=b.conversationId;const s=await createClient();const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({conversationId:null});
  if(!conversationId){const {data,error}=await s.from("conversations").insert({user_id:user.id,title:b.prompt.slice(0,80)}).select("id").single();if(error)throw error;conversationId=data.id}
  await s.from("messages").insert({user_id:user.id,conversation_id:conversationId,role:"user",content:b.prompt});
  const {data:turn,error}=await s.from("council_turns").insert({user_id:user.id,conversation_id:conversationId,mode:b.mode,prompt:b.prompt,status:(b.mode==="final"||b.mode==="conclusion")?"final":"deliberating"}).select("id").single();if(error)throw error;
  if(b.responses.length){const {error:re}=await s.from("council_responses").insert(b.responses.map(r=>({user_id:user.id,turn_id:turn.id,member_key:r.member.id,provider:r.member.provider,model:r.member.model,label:r.member.label,role:r.member.role||null,content:r.text,ok:r.ok})));if(re)throw re}
  return NextResponse.json({conversationId});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Save failed"},{status:400})}
}
