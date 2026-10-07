"use client";
import {FormEvent,useState} from "react";
import {createClient} from "@/lib/supabase/client";
export default function Login(){
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [message,setMessage]=useState("");const supabase=createClient();
 async function submit(e:FormEvent){e.preventDefault();setMessage("Signing in...");const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setMessage(error.message);return}location.href="/";}
 async function signup(){setMessage("Creating account...");const {error}=await supabase.auth.signUp({email,password});setMessage(error?error.message:"Check your email to confirm your Council account.");}
 return <main className="authShell"><section className="authCard"><span className="eyebrow">COUNCIL.AI BY AHG</span><h1>Enter the Council</h1><p>Your projects, deliberations and memory stay tied to your account.</p><form onSubmit={submit}><input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/><button className="primary">Sign in</button><button type="button" className="secondary" onClick={signup}>Create account</button></form><small>{message}</small></section></main>
}