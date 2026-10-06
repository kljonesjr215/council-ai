import {NextResponse} from "next/server";
import {z} from "zod";
import {askClaude,askGPT} from "@/lib/models";
const schema=z.object({prompt:z.string().min(1).max(20000),mode:z.enum(["ask","challenge-gpt","challenge-claude","challenge-both","final"]).default("ask")});
export async function POST(req:Request){try{const {prompt,mode}=schema.parse(await req.json()); const [gpt,claude]=await Promise.allSettled([askGPT(prompt,mode),askClaude(prompt,mode)]); const result={gpt:gpt.status==="fulfilled"?gpt.value:"GPT unavailable",claude:claude.status==="fulfilled"?claude.value:"Claude unavailable",status:mode==="final"?"final":"deliberating"}; return NextResponse.json(result);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Request failed"},{status:400});}}
