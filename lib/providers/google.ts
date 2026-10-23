import {CouncilProvider} from "./types"; import {councilInstruction} from "../prompts";
export const googleProvider:CouncilProvider={
 id:"google",
 capabilities:{text:true,reasoning:true,web:true,imageInput:true,documentInput:true,audioInput:true,videoInput:true,structuredOutput:true},
 isConfigured:()=>Boolean(process.env.GOOGLE_API_KEY),
 async ask({prompt,mode,model,role}){
  const apiKey=process.env.GOOGLE_API_KEY;if(!apiKey)throw new Error("google is not configured");
  const selectedModel=model&&model!=="gemini"?model:(process.env.GOOGLE_MODEL||"gemini-3.8-flash");
  async function call(modelName:string){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),11000);try{return await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(modelName)+":generateContent",{
   method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json","x-goog-api-key":apiKey as string},
   body:JSON.stringify({system_instruction:{parts:[{text:councilInstruction(mode)+(role?("\nYour Council role: "+role):"")}]},contents:[{role:"user",parts:[{text:prompt}]}]})
  })}finally{clearTimeout(timer)}}
  // Retry temporary Google capacity errors without changing the selected model.
  // The previous fallback accidentally retried the exact same model as a "fallback".
  let r:Response|undefined;let data:any;
  for(let attempt=0;attempt<3;attempt++){
   try{r=await call(selectedModel);data=await r.json()}
   catch(e){
    if(attempt===2)throw new Error("Gemini request timed out after three attempts. Please retry shortly.");
    await new Promise(resolve=>setTimeout(resolve,450*(attempt+1)));
    continue;
   }
   if(r.ok)break;
   const temporary=r.status===503||r.status===429||/high demand|overloaded|try again later/i.test(data?.error?.message||"");
   if(!temporary||attempt===2)break;
   await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
  }
  if(!r||!r.ok)throw new Error("Gemini API "+(r?.status||"error")+": "+(data?.error?.message||"Request failed"));
  const text=(data?.candidates?.[0]?.content?.parts||[]).map((p:{text?:string})=>p.text||"").join("\n");
  if(!text.trim())throw new Error("Gemini returned no text. Please retry.");
  const u=data?.usageMetadata;
  return {text,usage:u?{inputTokens:u.promptTokenCount,outputTokens:u.candidatesTokenCount,totalTokens:u.totalTokenCount}:undefined};
 }
};
