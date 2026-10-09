"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

export default function Login(){
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 const [mode,setMode]=useState<"signin"|"signup"|"reset">("signin");
 async function submit(e:FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setMessage("");
  try{
   const supabase=createClient();
   if(mode==="reset"){
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/auth/callback?next=/reset-password"});
    if(error)throw error;
    setMessage("If this email has an account, you'll receive password reset instructions.");
   }else if(mode==="signup"){
    const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin+"/auth/callback"}});
    if(error)throw error;
    if(data.session)location.assign("/");
    else setMessage("Check your email to confirm your Council account.");
   }else{
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error)throw error;
    location.assign("/");
   }
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to continue. Please try again.");}
  finally{setBusy(false)}
 }
 async function googleSignIn(){
  if(busy)return;setBusy(true);setMessage("");
  try{
   const {error}=await createClient().auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/auth/callback"}});
   if(error)throw error;
  }catch(e){setMessage(e instanceof Error?e.message:"Google sign-in is unavailable.");setBusy(false)}
 }
 return <main className="authShell"><section className="authCard">
  <span className="eyebrow">COUNCIL.AI</span><h1>{mode==="signup"?"Join the Council":mode==="reset"?"Reset your password":"Enter the Council"}</h1>
  <p>Your Council conversations stay connected to your account.</p>
  {mode!=="reset"&&<button type="button" className="secondary" disabled={busy} onClick={googleSignIn}>Continue with Google</button>}
  <form onSubmit={submit}>
   <input type="email" autoComplete="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} required/>
   {mode!=="reset"&&<input type="password" autoComplete={mode==="signup"?"new-password":"current-password"} placeholder="Password (8+ characters)" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/>}
   <button className="primary" type="submit" disabled={busy}>{busy?"Please wait...":mode==="signup"?"Create account":mode==="reset"?"Send reset link":"Sign in"}</button>
  </form>
  <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:16}}>
   {mode!=="signin"&&<button type="button" className="secondary" disabled={busy} onClick={()=>{setMode("signin");setMessage("")}}>Sign in instead</button>}
   {mode!=="signup"&&<button type="button" className="secondary" disabled={busy} onClick={()=>{setMode("signup");setMessage("")}}>Create account</button>}
   {mode!=="reset"&&<button type="button" className="secondary" disabled={busy} onClick={()=>{setMode("reset");setMessage("")}}>Forgot password?</button>}
  </div>
  <p role="status" aria-live="polite">{message}</p><p><Link href="/">Back to Council</Link></p>
 </section></main>;
}
