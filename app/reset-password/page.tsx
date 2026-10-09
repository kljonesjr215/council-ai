"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
export default function ResetPassword(){
 const [password,setPassword]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   const {error}=await createClient().auth.updateUser({password});
   if(error)throw error;
   setMessage("Password updated. You can return to your Council.");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to update password. Request a new reset link.");}
  finally{setBusy(false)}
 }
 return <main className="authShell"><section className="authCard"><span className="eyebrow">COUNCIL.AI</span><h1>Choose a new password</h1>
  <form onSubmit={submit}><input type="password" autoComplete="new-password" placeholder="New password (8+ characters)" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/><button className="primary" type="submit" disabled={busy}>{busy?"Updating...":"Update password"}</button></form>
  <p role="status" aria-live="polite">{message}</p><Link href="/login">Return to sign in</Link>
 </section></main>;
}
