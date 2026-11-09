"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
export default function AccountMenu(){
 const [email,setEmail]=useState<string|null>(null);
 const [checking,setChecking]=useState(true);
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  const supabase=createClient();let alive=true;
  void supabase.auth.getUser().then(({data})=>{if(alive){setEmail(data.user?.email??null);setChecking(false)}}).catch(()=>{if(alive)setChecking(false)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(alive){setEmail(session?.user?.email??null);setChecking(false)}});
  return ()=>{alive=false;subscription.unsubscribe()};
 },[]);
 async function signOut(){setBusy(true);const {error}=await createClient().auth.signOut();if(error){setBusy(false);window.alert("Could not sign out: "+error.message);return}setOpen(false);setEmail(null);setBusy(false)}
 return <div className="accountMenu">
  <button type="button" className="memory" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{checking?"Checking account…":email?"● "+email.split("@")[0]:"Sign in"}</button>
  {open&&<div className="accountDropdown" role="region" aria-label="Council account">
   {email?<><strong>Signed in</strong><span className="accountEmail">{email}</span><small>Your login stays active when you navigate back or refresh on this same site.</small><button type="button" disabled={busy} onClick={signOut}>{busy?"Signing out…":"Sign out"}</button></>:<><span>You're not signed in on this site.</span><a href="/login">Sign in to Council</a></>}
  </div>}
 </div>;
}
