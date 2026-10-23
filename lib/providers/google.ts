import {CouncilProvider} from "./types"; import {councilInstruction} from "../prompts";
export const googleProvider:CouncilProvider={
 id:"google",
 capabilities:{text:true,reasoning:true,web:true,imageInput:true,documentInput:true,audioInput:true,videoInput:true,structuredOutput:true},
 isConfigured:()=>Boolean(process.env.GOOGLE_API_KEY),
 async ask({prompt,mode,model,role}){
  const apiKey=process.env.GOOGLE_API_KEY;if(!apiKey)throw new Error("google is not configured");
  const selectedModel=model&&model!=="gemini"?model:(process.env.GOOGLE_MODEL||"gemini-2.5-flash");
  async function call(modelName:string){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),11000);try{return await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(modelName)+":generateContent",{
   method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json","x-goog-api-key":apiKey as string},
   body:JSON.stringify({system_instruction:{parts:[{text:councilInstruction(mode)+(role?("\nYour Council role: "+role):"")}]},contents:[{role:"user",parts:[{text:prompt}]}]})
  })}finally{clearTimeout(timer)}}
  let usedModel=selectedModel;let r:Response;let data:any;
  try{r=await call(usedModel);data=await r.json()}catch(e){if(selectedModel==="gemini-2.5-flash-lite")throw new Error("Gemini did not respond within 11 seconds. Check Google API access and try again.");usedModel="gemini-2.5-flash-lite";try{r=await call(usedModel);data=await r.json()}catch{throw new Error("Both Gemini models timed out. Check Google API key, billing, and API access.")}}
  if(!r.ok&&(r.status===429||r.status===503||/high demand|try again later|overloaded|not found|not supported/i.test(data?.error?.message||""))&&selectedModel!=="gemini-2.5-flash-lite"){usedModel="gemini-2.5-flash-lite";r=await call(usedModel);data=await r.json()}
  if(!r.ok)throw new Error("Gemini API "+r.status+": "+(data?.error?.message||"Request failed"));
  const text=(data?.candidates?.[0]?.content?.parts||[]).map((p:{text?:string})=>p.text||"").join("\n");
  if(!text.trim())throw new Error("Gemini returned no text. Please retry.");
  const u=data?.usageMetadata;
  return {text,usage:u?{inputTokens:u.promptTokenCount,outputTokens:u.candidatesTokenCount,totalTokens:u.totalTokenCount}:undefined};
 }
};
