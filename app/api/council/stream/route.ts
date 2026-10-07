import {z} from "zod";
import {councilInstruction} from "@/lib/prompts";

const member=z.object({id:z.string(),provider:z.enum(["openai","anthropic","google","custom"]),label:z.string(),model:z.string().min(1),enabled:z.boolean(),role:z.string().optional()});
const schema=z.object({prompt:z.string().min(1).max(20000),mode:z.enum(["ask","challenge-member","challenge-council","final","conclusion"]).default("ask"),member});
const encoder=new TextEncoder();

function system(mode:z.infer<typeof schema>["mode"],role?:string){return councilInstruction(mode)+(role?"\nYour Council role: "+role:"")}
function errorResponse(message:string,status=400){return new Response(message,{status,headers:{"Content-Type":"text/plain; charset=utf-8"}})}
async function upstream(b:z.infer<typeof schema>){
 const m=b.member;
 if(m.provider==="anthropic"){
  const key=process.env.ANTHROPIC_API_KEY;if(!key)return errorResponse("anthropic is not configured",503);
  return fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:m.model,max_tokens:900,stream:true,system:system(b.mode,m.role),messages:[{role:"user",content:b.prompt}]})});
 }
 if(m.provider==="google"){
  const key=process.env.GOOGLE_API_KEY;if(!key)return errorResponse("google is not configured",503);
  const primary=m.model&&m.model!=="gemini"?m.model:(process.env.GOOGLE_MODEL||"gemini-3.8-flash");
  const call=(model:string)=>fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":streamGenerateContent?alt=sse",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify({system_instruction:{parts:[{text:system(b.mode,m.role)}]},contents:[{role:"user",parts:[{text:b.prompt}]}]}),signal:AbortSignal.timeout(20000)});
  let r:Response;
  try{r=await call(primary)}catch{if(primary==="gemini-3.5-flash-lite")return errorResponse("Gemini timed out before responding",504);r=await call("gemini-3.5-flash-lite")}
  if(!r.ok){const msg=await r.clone().text();if(/high demand|try again later|overloaded|timeout/i.test(msg)&&primary!=="gemini-3.5-flash-lite")r=await call("gemini-3.5-flash-lite")}
  return r;
 }
 if(m.provider==="openai"){
  const key=process.env.OPENAI_API_KEY;if(!key)return errorResponse("openai is not configured",503);
  return fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({model:m.model,instructions:system(b.mode,m.role),input:b.prompt,stream:true})});
 }
 return errorResponse("Provider streaming is not installed yet",501);
}

function extract(provider:string,data:string){
 try{
  const j=JSON.parse(data);
  if(provider==="anthropic"&&j.type==="content_block_delta"&&j.delta?.type==="text_delta")return j.delta.text||"";
  if(provider==="google")return (j.candidates?.[0]?.content?.parts||[]).map((p:{text?:string})=>p.text||"").join("");
  if(provider==="openai"&&j.type==="response.output_text.delta")return j.delta||"";
 }catch{}
 return "";
}

export async function POST(req:Request){
 try{
  const b=schema.parse(await req.json());const r=await upstream(b);
  if(!r.ok||!r.body){const msg=await r.text();return errorResponse(msg||b.member.label+" is unavailable",r.status||502)}
  const reader=r.body.getReader();const decoder=new TextDecoder();let buffer="";let emitted=false;let lastData=Date.now();
  const body=new ReadableStream({
   async start(controller){
    try{
     while(true){
      const read=reader.read();
      const timeout=new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("Provider stream stalled")),25000));
      const {done,value}=await Promise.race([read,timeout]);
      if(done)break;
      lastData=Date.now();
      buffer+=decoder.decode(value,{stream:true});
      const lines=buffer.split(/\r?\n/);buffer=lines.pop()||"";
      for(const line of lines){
       if(!line.startsWith("data:"))continue;
       const data=line.slice(5).trim();if(!data||data==="[DONE]")continue;
       const chunk=extract(b.member.provider,data);if(chunk){emitted=true;controller.enqueue(encoder.encode(chunk));}
      }
     }
     if(buffer.startsWith("data:")){const data=buffer.slice(5).trim();if(data&&data!=="[DONE]"){const chunk=extract(b.member.provider,data);if(chunk){emitted=true;controller.enqueue(encoder.encode(chunk))}}}
     if(!emitted)throw new Error(b.member.label+" returned no stream text");
     controller.close();
    }catch(e){controller.error(e)}
   },
   cancel(){reader.cancel()}
  });
  return new Response(body,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no"}});

 }catch(e){return errorResponse(e instanceof Error?e.message:"Streaming request failed")}
}
