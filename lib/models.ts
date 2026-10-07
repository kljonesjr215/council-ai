import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {CouncilMode} from "./types";
import {councilInstruction} from "./prompts";

export async function askGPT(prompt:string,mode:CouncilMode){
 const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
 const r=await client.responses.create({model:process.env.OPENAI_MODEL||"gpt-5.6-luna",instructions:councilInstruction(mode),input:prompt});
 return r.output_text;
}
export async function askClaude(prompt:string,mode:CouncilMode){
 const client=new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY});
 const r=await client.messages.create({model:process.env.ANTHROPIC_MODEL||"claude-sonnet-5-5",max_tokens:1800,system:councilInstruction(mode),messages:[{role:"user",content:prompt}]});
 return r.content.filter(x=>x.type==="text").map(x=>x.text).join("\n");
}
