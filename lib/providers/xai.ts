import OpenAI from "openai";
import {CouncilProvider} from "./types";
import {councilInstruction} from "../prompts";

export const xaiProvider:CouncilProvider={
 id:"xai",
 capabilities:{text:true,reasoning:true},
 isConfigured:()=>Boolean(process.env.XAI_API_KEY),
 async ask({prompt,mode,model,role}){
  const client=new OpenAI({apiKey:process.env.XAI_API_KEY,baseURL:"https://api.x.ai/v1",timeout:25000,maxRetries:0});
  const response=await client.chat.completions.create({
   model,
   messages:[
    {role:"system",content:councilInstruction(mode)+(role?"\nYour Council role: "+role:"")},
    {role:"user",content:prompt}
   ]
  });
  const answer=response.choices[0]?.message?.content||"";
  if(!answer.trim())throw new Error("Grok returned an empty response. Retry this member.");
  const usage=response.usage;
  return {text:answer,usage:usage?{inputTokens:usage.prompt_tokens,outputTokens:usage.completion_tokens,totalTokens:usage.total_tokens}:undefined};
 }
};
