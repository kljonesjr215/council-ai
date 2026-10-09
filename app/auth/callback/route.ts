import {NextRequest,NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";

export async function GET(request:NextRequest){
 const url=new URL(request.url);
 const code=url.searchParams.get("code");
 const requested=url.searchParams.get("next")||"/";
 const next=requested.startsWith("/")&&!requested.startsWith("//")?requested:"/";
 const redirectUrl=new URL(next,url.origin);
 let response=NextResponse.redirect(redirectUrl);

 if(!code)return NextResponse.redirect(new URL("/login?error=missing_code",url.origin));

 const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!supabaseUrl||!supabaseKey)return NextResponse.redirect(new URL("/login?error=config",url.origin));

 const supabase=createServerClient(supabaseUrl,supabaseKey,{
  cookies:{
   getAll(){return request.cookies.getAll()},
   setAll(cookies){
    cookies.forEach(({name,value})=>request.cookies.set(name,value));
    response=NextResponse.redirect(redirectUrl);
    cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options));
   }
  }
 });
 const {error}=await supabase.auth.exchangeCodeForSession(code);
 if(error){
  console.error("Council auth callback: code exchange failed",error.message);
  return NextResponse.redirect(new URL("/login?error=auth",url.origin));
 }
 return response;
}
