"use client";
import {useMemo,useRef,useState} from "react";
type Mode="ask"|"challenge-member"|"challenge-council"|"final"|"conclusion";
type Member={id:string;provider:"openai"|"anthropic"|"google"|"custom";label:string;model:string;enabled:boolean;role?:string};
type Response={member:Member;text:string;ok:boolean};
function friendlyError(r:Response){const t=r.text.toLowerCase();if(t.includes("high demand")||t.includes("try again later")||t.includes("overloaded")||t.includes("503"))return r.member.label+" is temporarily busy. Retry this member in a moment.";if(t.includes("429")||t.includes("quota")||t.includes("credits"))return r.member.label+" is temporarily unavailable because its provider limit was reached.";return r.text}

function formatInline(value:string){
 const parts=value.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g);
 return parts.map((part,i)=>part.startsWith("**")&&part.endsWith("**")?<strong key={i}>{part.slice(2,-2)}</strong>:part.startsWith("*")&&part.endsWith("*")?<em key={i}>{part.slice(1,-1)}</em>:part.startsWith("`")&&part.endsWith("`")?<code key={i}>{part.slice(1,-1)}</code>:part);
}
function FormattedAnswer({text}:{text:string}){
 const lines=text.split(/\r?\n/);
 return <div className="formatted-answer">{lines.map((line,i)=>{
  const heading=line.match(/^(#{1,6})\s+(.+)$/);
  if(heading)return <div key={i} className="answer-heading"><strong>{formatInline(heading[2])}</strong></div>;
  const bullet=line.match(/^\s*[-*•]\s+(.+)$/);
  if(bullet)return <div key={i} className="answer-list-item"><span aria-hidden="true">•</span><span>{formatInline(bullet[1])}</span></div>;
  const number=line.match(/^\s*(\d+)[.)]\s+(.+)$/);
  if(number)return <div key={i} className="answer-list-item answer-numbered"><span>{number[1]}.</span><span>{formatInline(number[2])}</span></div>;
  if(!line.trim())return <div key={i} className="answer-paragraph-gap"/>;
  return <div key={i}>{formatInline(line)}</div>;
 })}</div>;
}
const initial:Member[]=[
 {id:"gpt",provider:"openai",label:"GPT",model:"gpt-5.6-luna",enabled:true,role:"Independent"},
 {id:"claude",provider:"anthropic",label:"Claude",model:"claude-sonnet-5-5",enabled:true,role:"Independent"},
 {id:"gemini",provider:"google",label:"Gemini",model:"gemini-3.5-flash-lite",enabled:true,role:"Independent"}
];
export default function Home(){
 const [typingMembers,setTypingMembers]=useState<string[]>([]);const [prompt,setPrompt]=useState("");const [followUp,setFollowUp]=useState("");const [challengeOpen,setChallengeOpen]=useState<string>();const [memberChallenges,setMemberChallenges]=useState<Record<string,string>>({});const [members,setMembers]=useState(initial);const [responses,setResponses]=useState<Response[]>([]);const [finalComplete,setFinalComplete]=useState(false);const [conclusion,setConclusion]=useState<Response>();const [loading,setLoading]=useState(false);const [status,setStatus]=useState("Council ready");const [conversationId,setConversationId]=useState<string>();const [attachments,setAttachments]=useState<File[]>([]);const fileRef=useRef<HTMLInputElement>(null);
 const active=useMemo(()=>members.filter(m=>m.enabled),[members]);
 function toggle(id:string){setMembers(x=>x.map(m=>m.id===id?{...m,enabled:!m.enabled}:m))}
 function setRole(id:string,role:string){setMembers(x=>x.map(m=>m.id===id?{...m,role}:m))}
 async function uploadSelected(){if(!attachments.length)return;const form=new FormData();attachments.forEach(f=>form.append("files",f));const r=await fetch("/api/assets",{method:"POST",body:form});const d=await r.json();if(!r.ok)throw new Error(d.error||"Upload failed");return d.assets}
 async function retryMember(member:Member){
  if(!prompt.trim())return;setLoading(true);setStatus("Retrying "+member.label+"...");
  const prior=responses.filter(r=>r.member.id!==member.id&&r.ok).map(r=>r.member.label+" PRIOR POSITION:\n"+r.text).join("\n\n");const context=[prompt,prior].filter(Boolean).join("\n\n");
  try{const r=await fetch("/api/council",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:context,mode:"ask",members:[member],conversationId})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");const next=d.responses?.[0];if(next)setResponses(old=>old.map(x=>x.member.id===member.id?next:x));if(d.conversationId)setConversationId(d.conversationId);setStatus(next?.ok?member.label+" is back in the Council.":member.label+" is still temporarily unavailable.");}catch(e){setStatus(e instanceof Error?e.message:"Retry failed");}finally{setLoading(false)}
 }
 async function challengeMember(member:Member){
  const q=(memberChallenges[member.id]||"").trim();if(!q||loading)return;setLoading(true);setStatus("Sending your challenge to "+member.label+"...");
  const prior=responses.filter(r=>r.text).map(r=>r.member.label+" PRIOR POSITION:\n"+r.text).join("\n\n");
  const context=["ORIGINAL QUESTION:\n"+prompt,prior,"USER CHALLENGE TO "+member.label.toUpperCase()+":\n"+q,"Answer the user's specific challenge directly. Reconsider your prior position where warranted. Do not substitute a generic alternative answer and do not answer on behalf of other Council members."].filter(Boolean).join("\n\n");
  try{await streamMember(member,context,"challenge-member",member.id);setMemberChallenges(x=>({...x,[member.id]:""}));setStatus(member.label+" answered your challenge.");}finally{setLoading(false)}
 }
 async function askFollowUp(memberId?:string){
  const q=followUp.trim();if(!q||loading)return;setLoading(true);setStatus(memberId?"Asking a follow-up...":"The Council is considering your follow-up...");
  const prior=responses.filter(r=>r.text).map(r=>r.member.label+" PRIOR POSITION:\n"+r.text).join("\n\n");
  const context=["ORIGINAL QUESTION:\n"+prompt,prior,"USER FOLLOW-UP / CHALLENGE:\n"+q,"Respond directly to the user's new question or information. Reconsider your prior position only where the follow-up warrants it; do not merely repeat your previous answer."].filter(Boolean).join("\n\n");
  const selected=memberId?active.filter(m=>m.id===memberId):active;
  try{await Promise.all(selected.map(m=>streamMember(m,context,"challenge-member",memberId)));setFollowUp("");setStatus("Follow-up answered — continue the discussion or request a rethink.");}finally{setLoading(false)}
 }
 async function runConclusion(){
  const chair=active.find(m=>m.id==="claude"&&responses.some(r=>r.member.id===m.id&&r.ok))||active.find(m=>responses.some(r=>r.member.id===m.id&&r.ok));if(!chair)return;
  setLoading(true);setStatus("Preparing one Council conclusion...");const prior=responses.filter(r=>r.ok).map(r=>r.member.label+" FINAL POSITION:\n"+r.text).join("\n\n");const context=[prompt,prior].filter(Boolean).join("\n\n");
  try{const r=await fetch("/api/council",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:context,mode:"conclusion",members:[chair],conversationId})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");const next=d.responses?.[0];if(next)setConclusion(next);if(d.conversationId)setConversationId(d.conversationId);setStatus("Council conclusion ready — you make the decision.");}catch(e){setStatus(e instanceof Error?e.message:"Conclusion failed");}finally{setLoading(false)}
 }
 async function streamMember(member:Member,context:string,mode:Mode,targetMemberId?:string){
  const pending:Response={member,text:"",ok:true};setResponses(old=>[...old.filter(x=>x.member.id!==member.id),pending]);
  setTypingMembers(old=>old.includes(member.id)?old:[...old,member.id]);
  let networkDone=false;let received="";let visible="";
  try{
   const r=await fetch("/api/council/stream",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:context,mode,targetMemberId,member})});
   if(!r.ok||!r.body){throw new Error(member.label+" could not respond (server status "+r.status+"). Please retry this member.")}
   const reader=r.body.getReader();const decoder=new TextDecoder();
   let typingDoneResolve:()=>void=()=>{};
   const typingDone=new Promise<void>(resolve=>{typingDoneResolve=resolve});
   const render=()=>{
    if(visible.length<received.length){
     const remaining=received.length-visible.length;const step=remaining>500?Math.min(remaining,100):remaining>180?Math.min(remaining,45):remaining>60?Math.min(remaining,16):remaining>20?8:3;
     visible=received.slice(0,Math.min(received.length,visible.length+step));
     setResponses(old=>[...old.filter(x=>x.member.id!==member.id),{member,text:visible,ok:true}]);
    }
    if(networkDone&&visible.length>=received.length){typingDoneResolve();return}
    window.setTimeout(render,18);
   };
   render();
   while(true){
    let timer:ReturnType<typeof setTimeout>|undefined;
    const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error("Council response stalled")),30000)});
    let result:ReadableStreamReadResult<Uint8Array>;
    try{result=await Promise.race([reader.read(),timeout])}finally{if(timer)clearTimeout(timer)}
    if(result.done)break;
    received+=decoder.decode(result.value,{stream:true});
   }
   received+=decoder.decode();networkDone=true;if(!received.trim())throw new Error(member.label+" did not return a response");
   await typingDone;setTypingMembers(old=>old.filter(id=>id!==member.id));return {member,text:received,ok:true} as Response;
  }catch(e){
   networkDone=true;setTypingMembers(old=>old.filter(id=>id!==member.id));
   const raw=e instanceof Error?e.message:"Unavailable";
   const message=/abort|stalled|timed out|no stream text|did not return|<!doctype|<html|internal server error/i.test(raw)?member.label+" paused unexpectedly. Retry this member to continue.":raw;
   const failed:Response={member,text:received.trim()?received+"\n\n[Response interrupted — retry "+member.label+" to continue.]":message,ok:false};setResponses(old=>[...old.filter(x=>x.member.id!==member.id),failed]);return failed
  }
 }
 async function run(mode:Mode,targetMemberId?:string){
  if(!prompt.trim()&&mode==="ask")return;setLoading(true);setStatus(mode==="final"?"Council members are forming their final positions...":"Council members are thinking...");
  const prior=responses.filter(r=>r.text).map(r=>r.member.label+" PRIOR POSITION:\n"+r.text).join("\n\n");const context=mode==="ask"?prompt:[prompt,prior].filter(Boolean).join("\n\n");
  try{
   if(attachments.length){setStatus("Securing your evidence...");await uploadSelected()}
   const selected=mode==="challenge-member"&&targetMemberId?active.filter(m=>m.id===targetMemberId):active;if(mode==="ask"){setFinalComplete(false);setConclusion(undefined);setResponses([])}
   let completed=0;const results=await Promise.all(selected.map(async member=>{const result=await streamMember(member,context,mode,targetMemberId);completed++;setStatus(completed<selected.length?completed+" of "+selected.length+" Council members finished — others are still thinking...":"Council round complete.");return result}));
   if(attachments.length)setAttachments([]);
   try{const save=await fetch("/api/council/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:context,mode,conversationId,responses:results})});const d=await save.json();if(save.ok&&d.conversationId)setConversationId(d.conversationId)}catch{}
   if(mode==="final"&&results.every(r=>r.ok)){setFinalComplete(true);setStatus("Final round complete — request one Council conclusion when ready.")}else if(results.some(r=>!r.ok)){setStatus("Some Council responses were interrupted. Retry the affected members before requesting a final round.")}else setStatus("Challenge a member, add evidence, or continue deliberating.");
  }catch(e){setStatus(e instanceof Error?e.message:"Something went wrong")}finally{setLoading(false)}
 }
 return <main>
  <header><div className="brand"><span className="mark">C</span><div><h1>COUNCIL</h1><p>AI deliberation by AHG</p></div></div><a className="memory" href="/login">Account</a></header>
  <section className="hero"><span className="eyebrow">COUNCIL.AI • V1</span><h2>Build your Council. Challenge the answer.</h2><p>Select independent AI members, give them evidence, let them disagree, then decide for yourself.</p></section>
  <section className="roster"><div className="sectionHead"><div><b>Choose Your Council</b><span>{active.length} active member{active.length===1?"":"s"}</span></div><small>More providers can be added without rebuilding Council.</small></div><div className="memberGrid">{members.map(m=><button key={m.id} className={"memberCard "+(m.enabled?"selected":"")} onClick={()=>toggle(m.id)}><span className="memberCheck">{m.enabled?"✓":"+"}</span><b>{m.label}</b><small>Role</small><select value={m.role||"Independent"} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();setRole(m.id,e.target.value)}}><option>Independent</option><option>Strategist</option><option>Skeptic</option><option>Researcher</option><option>Financial Analyst</option><option>Creative</option><option>Devil's Advocate</option></select><em>{m.enabled?"Active":"Tap to add"}</em></button>)}</div></section>
  <section className="composer"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="What do you want the Council to think through?"/><input ref={fileRef} hidden multiple type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt" onChange={e=>setAttachments(Array.from(e.target.files||[]))}/><div className="media"><button onClick={()=>fileRef.current?.click()}>+ Photo / File</button><button onClick={()=>fileRef.current?.click()}>Voice</button><button onClick={()=>fileRef.current?.click()}>Video</button>{attachments.length>0&&<span className="attachmentCount">{attachments.length} selected</span>}</div><button className="primary" disabled={loading||active.length<1} onClick={()=>run("ask")}>{loading?"Thinking...":"Ask "+active.length+" Council Member"+(active.length===1?"":"s")}</button></section>
  <div className="status">{status}</div>
  <section className="answers dynamic">{active.map(m=>{const r=responses.find(x=>x.member.id===m.id);return <article key={m.id}><div className="model"><b>{m.label}</b><span>{m.role||"Independent view"}</span></div><div className="answer">{r?(r.ok?(r.text?<><FormattedAnswer text={r.text}/>{typingMembers.includes(m.id)&&<span className="typing-cursor" aria-label="Typing"/>}</>:<span className="thinking-indicator">{m.label} is thinking<span className="thinking-dots">...</span></span>):friendlyError(r)):m.label+"'s position will appear here."}</div>{r&&!r.ok?<button disabled={loading} onClick={()=>retryMember(m)}>Retry {m.label}</button>:<>{r&&<button disabled={loading} onClick={()=>setChallengeOpen(challengeOpen===m.id?undefined:m.id)}>Challenge {m.label}</button>}{challengeOpen===m.id&&r&&<div className="memberChallenge"><textarea value={memberChallenges[m.id]||""} onChange={e=>setMemberChallenges(x=>({...x,[m.id]:e.target.value}))} placeholder={"Type or speak your challenge to "+m.label+"…"} /><div className="media"><button type="button" onClick={()=>setStatus("Microphone input for "+m.label+" is next to connect.")}>🎤</button><button disabled={loading||!(memberChallenges[m.id]||"").trim()} onClick={()=>challengeMember(m)}>Send to {m.label}</button></div></div>}<button disabled={!r||loading} onClick={()=>run("challenge-member",m.id)}>Rethink {m.label}</button></>}</article>})}</section>
  <section className="composer"><textarea value={followUp} onChange={e=>setFollowUp(e.target.value)} placeholder="Ask a follow-up or challenge the Council in your own words…"/><button className="primary" disabled={loading||!followUp.trim()||responses.length<1} onClick={()=>askFollowUp()}>Ask the Council</button></section><section className="actions"><button disabled={(active.some(m=>!responses.some(r=>r.member.id===m.id&&r.ok)))||loading||finalComplete} onClick={()=>run("challenge-council")}>What is the Council missing?</button><button className="final" disabled={responses.length<2||loading||finalComplete} onClick={()=>run("final")}>{finalComplete?"Final Round Complete":"Request Final Round"}</button></section>{finalComplete&&<section className="actions"><button className="final" disabled={loading||Boolean(conclusion)} onClick={runConclusion}>{conclusion?"Council Conclusion Complete":"Generate Council Conclusion"}</button></section>}{conclusion&&<section className="answers dynamic"><article><div className="model"><b>Council Conclusion</b><span>Prepared by {conclusion.member.label}</span></div><div className="answer">{conclusion.ok?<FormattedAnswer text={conclusion.text}/>:friendlyError(conclusion)}</div></article></section>}
  <nav><button>C<small>Council</small></button><button>P<small>Projects</small></button><button>+<small>Create</small></button><button>M<small>Memory</small></button></nav>
 </main>
}