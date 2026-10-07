import {NextResponse} from "next/server";
export async function GET(){
  return NextResponse.json({ok:true,service:"council-ai",supabaseConfigured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),openaiConfigured:Boolean(process.env.OPENAI_API_KEY),anthropicConfigured:Boolean(process.env.ANTHROPIC_API_KEY)});
}
