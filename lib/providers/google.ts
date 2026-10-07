import {CouncilProvider} from "./types"; import {councilInstruction} from "../prompts";
export const googleProvider:CouncilProvider={
 id:"google",
 capabilities:{text:true,reasoning:true,web:true,imageInput:true,documentInput:true,audioInput:true,videoInput:true,structuredOutput:true},
 isConfigured:()=>Boolean(process.env.GOOGLE_API_KEY),
 async ask({prompt,mode,model,role}){
  const apiKey=process.env.GOOGLE_API_KEY;if(!apiKey)throw new Error("google is not configured");
  const selectedModel=model&&model!=="gemini"?model:(process.env.GOOGLE_MODEL||"gemini-3.8-flash");
  async function call(modelName:string){return fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(modelName)+":generateContent",{
   method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
   body:JSON.stringify({system_instruction:{parts:[{text:councilInstruction(mode)+(role?("\nYour Council role: "+role):"")}]},contents:[{role:"user",parts:[{text:prompt}]}]})
  })}
  let usedModel=selectedModel;let r=await call(usedModel);let data=await r.json();
  if(!r.ok&&(/high demand|try again later|overloaded/i.test(data?.error?.message||""))&&selectedModel!=="gemini-3.5-flash-lite"){usedModel="gemini-3.5-flash-lite";r=await call(usedModel);data=await r.json()}
  if(!r.ok)throw new Error(data?.error?.message||"Gemini request failed");
  const text=(data?.candidates?.[0]?.content?.parts||[]).map((p:{text?:string})=>p.text||"").join("\n");
  const u=data?.usageMetadata;
  return {text,usage:u?{inputTokens:u.promptTokenCount,outputTokens:u.candidatesTokenCount,totalTokens:u.totalTokenCount}:undefined};
 }
};
