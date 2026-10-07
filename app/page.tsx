"use client";
import {useMemo,useRef,useState} from "react";
type Mode="ask"|"challenge-member"|"challenge-council"|"final";
type Member={id:string;provider:"openai"|"anthropic"|"google"|"custom";label:string;model:string;enabled:boolean;role?:string};
type Response={member:Member;text:string;ok:boolean};
const initial:Member[]=[
 {id:"gpt",provider:"openai",label:"GPT",model:"gpt-5.6-luna",enabled:true,role:"Independent"},
 {id:"claude",provider:"anthropic",label:"Claude",model:"claude-sonnet-5-5",enabled:true,role:"Independent"},
 {id:"gemini",provider:"google",label:"Gemini",model:"gemini",enabled:false,role:"Independent"}
];
export default function Home(){
 const [prompt,setPrompt]=useState("");const [members,setMembers]=useState(initial);const [responses,setResponses]=useState<Response[]>([]);const [loading,setLoading]=useState(false);const [status,setStatus]=useState("Council ready");const [conversationId,setConversationId]=useState<string>();const [attachments,setAttachments]=useState<File[]>([]);const fileRef=useRef<HTMLInputElement>(null);
 const active=useMemo(()=>members.filter(m=>m.enabled),[members]);
 function toggle(id:string){setMembers(x=>x.map(m=>m.id===id?{...m,enabled:!m.enabled}:m))}
 function setRole(id:string,role:string){setMembers(x=>x.map(m=>m.id===id?{...m,role}:m))}
 async function uploadSelected(){if(!attachments.length)return;const form=new FormData();attachments.forEach(f=>form.append("files",f));const r=await fetch("/api/assets",{method:"POST",body:form});const d=await r.json();if(!r.ok)throw new Error(d.error||"Upload failed");return d.assets}
 async function run(mode:Mode,targetMemberId?:string){
  if(!prompt.trim()&&mode==="ask")return;setLoading(true);setStatus(mode==="final"?"Preparing final round...":"Council is deliberating...");
  const prior=responses.map(r=>r.member.label+" PRIOR POSITION:\n"+r.text).join("\n\n");const context=[prompt,prior].filter(Boolean).join("\n\n");
  try{if(attachments.length){setStatus("Securing your evidence...");await uploadSelected()}const r=await fetch("/api/council",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:context,mode,targetMemberId,members:active,conversationId})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");setResponses(d.responses||[]);if(d.conversationId)setConversationId(d.conversationId);if(attachments.length)setAttachments([]);setStatus(mode==="final"?"Final round complete — you make the decision.":"Challenge a member, add evidence, or continue deliberating.");}catch(e){setStatus(e instanceof Error?e.message:"Something went wrong");}finally{setLoading(false)}
 }
 return <main>
  <header><div className="brand"><span className="mark">C</span><div><h1>COUNCIL</h1><p>AI deliberation by AHG</p></div></div><a className="memory" href="/login">Account</a></header>
  <section className="hero"><span className="eyebrow">COUNCIL.AI • V1</span><h2>Build your Council. Challenge the answer.</h2><p>Select independent AI members, give them evidence, let them disagree, then decide for yourself.</p></section>
  <section className="roster"><div className="sectionHead"><div><b>Choose Your Council</b><span>{active.length} active member{active.length===1?"":"s"}</span></div><small>More providers can be added without rebuilding Council.</small></div><div className="memberGrid">{members.map(m=><button key={m.id} className={"memberCard "+(m.enabled?"selected":"")} onClick={()=>toggle(m.id)}><span className="memberCheck">{m.enabled?"✓":"+"}</span><b>{m.label}</b><small>Role</small><select value={m.role||"Independent"} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();setRole(m.id,e.target.value)}}><option>Independent</option><option>Strategist</option><option>Skeptic</option><option>Researcher</option><option>Financial Analyst</option><option>Creative</option><option>Devil's Advocate</option></select><em>{m.provider==="google"?"Coming when provider is connected":m.enabled?"Active":"Tap to add"}</em></button>)}</div></section>
  <section className="composer"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="What do you want the Council to think through?"/><input ref={fileRef} hidden multiple type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt" onChange={e=>setAttachments(Array.from(e.target.files||[]))}/><div className="media"><button onClick={()=>fileRef.current?.click()}>+ Photo / File</button><button onClick={()=>fileRef.current?.click()}>Voice</button><button onClick={()=>fileRef.current?.click()}>Video</button>{attachments.length>0&&<span className="attachmentCount">{attachments.length} selected</span>}</div><button className="primary" disabled={loading||active.length<1} onClick={()=>run("ask")}>{loading?"Thinking...":"Ask "+active.length+" Council Member"+(active.length===1?"":"s")}</button></section>
  <div className="status">{status}</div>
  <section className="answers dynamic">{active.map(m=>{const r=responses.find(x=>x.member.id===m.id);return <article key={m.id}><div className="model"><b>{m.label}</b><span>{m.role||"Independent view"}</span></div><div className="answer">{r?.text||m.label+"'s position will appear here."}</div><button disabled={!r||loading} onClick={()=>run("challenge-member",m.id)}>Challenge {m.label}</button></article>})}</section>
  <section className="actions"><button disabled={responses.length<2||loading} onClick={()=>run("challenge-council")}>What is the Council missing?</button><button className="final" disabled={responses.length<2||loading} onClick={()=>run("final")}>Request Final Round</button></section>
  <nav><button>C<small>Council</small></button><button>P<small>Projects</small></button><button>+<small>Create</small></button><button>M<small>Memory</small></button></nav>
 </main>
}