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
  {mode!=="reset"&&<button type="button" className="secondary" disabled={busy} onClick={googleSignIn} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:12,background:"#fff",color:"#202124",border:"1px solid #dadce0",fontWeight:600}}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Continue with Google</span></button>}
  {mode!=="reset"&&<div aria-label="Alternative sign-in method" style={{display:"flex",alignItems:"center",gap:12,margin:"18px 0 12px",color:"#b9bdc9",fontSize:13}}><span aria-hidden="true" style={{height:1,flex:1,background:"rgba(255,255,255,0.22)"}}/><span>or sign in with email</span><span aria-hidden="true" style={{height:1,flex:1,background:"rgba(255,255,255,0.22)"}}/></div>}
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
