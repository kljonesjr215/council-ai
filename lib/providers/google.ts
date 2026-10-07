import {CouncilProvider} from "./types"; import {councilInstruction} from "../prompts";
export const googleProvider:CouncilProvider={
 id:"google",
 capabilities:{text:true,reasoning:true,web:true,imageInput:true,documentInput:true,audioInput:true,videoInput:true,structuredOutput:true},
 isConfigured:()=>Boolean(process.env.GOOGLE_API_KEY),
 async ask({prompt,mode,model,role}){
  const apiKey=process.env.GOOGLE_API_KEY;if(!apiKey)throw new Error("google is not configured");
  const selectedModel=model&&model!=="gemini"?model:(process.env.GOOGLE_MODEL||"gemini-3.8-flash");
  const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(selectedModel)+":generateContent",{
   method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
   body:JSON.stringify({system_instruction:{parts:[{text:councilInstruction(mode)+(role?("\nYour Council role: "+role):"")}]},contents:[{role:"user",parts:[{text:prompt}]}]})
  });
  const data=await r.json();if(!r.ok)throw new Error(data?.error?.message||"Gemini request failed");
  const text=(data?.candidates?.[0]?.content?.parts||[]).map((p:{text?:string})=>p.text||"").join("\n");
  const u=data?.usageMetadata;
  return {text,usage:u?{inputTokens:u.promptTokenCount,outputTokens:u.candidatesTokenCount,totalTokens:u.totalTokenCount}:undefined};
 }
};
