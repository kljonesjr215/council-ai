"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {createClient} from "@/lib/supabase/client";
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
const logos:Record<string,string>={gpt:"openai.com",claude:"claude.ai",gemini:"gemini.google.com",grok:"x.ai",deepseek:"deepseek.com",llama:"meta.ai",mistral:"mistral.ai",qwen:"qwen.ai"};
const descriptions:Record<string,string>={gpt:"OpenAI · General reasoning",claude:"Anthropic · Thoughtful analysis",gemini:"Google · Multimodal research",grok:"xAI · Alternative perspectives",deepseek:"DeepSeek · Reasoning",llama:"Meta · Open-weight models",mistral:"Mistral AI · Fast analysis",qwen:"Alibaba · Multilingual reasoning"};
const library:Member[]=[
 {id:"grok",provider:"custom",label:"Grok",model:"x-ai/grok-4",enabled:true,role:"Skeptic"},
 {id:"deepseek",provider:"custom",label:"DeepSeek",model:"deepseek/deepseek-chat",enabled:true,role:"Strategist"},
 {id:"llama",provider:"custom",label:"Llama",model:"meta-llama/llama-4-maverick",enabled:true,role:"Independent"},
 {id:"mistral",provider:"custom",label:"Mistral",model:"mistralai/mistral-medium-3",enabled:true,role:"Researcher"},
 {id:"qwen",provider:"custom",label:"Qwen",model:"qwen/qwen3-235b-a22b",enabled:true,role:"Independent"}
];
const initial:Member[]=[
 {id:"gpt",provider:"openai",label:"GPT",model:"gpt-5.6-luna",enabled:true,role:"Independent"},
 {id:"claude",provider:"anthropic",label:"Claude",model:"claude-sonnet-5-5",enabled:true,role:"Independent"},
 {id:"gemini",provider:"google",label:"Gemini",model:"gemini-3.5-flash-lite",enabled:true,role:"Independent"}
];
export default function Home(){
 const [libraryOpen,setLibraryOpen]=useState(false);const [librarySearch,setLibrarySearch]=useState("");const [customName,setCustomName]=useState("");const [customModel,setCustomModel]=useState("");
 const [workspaceMode,setWorkspaceMode]=useState<"individual"|"council">("council");
 const [assignment,setAssignment]=useState("");
 const [teamResult,setTeamResult]=useState("");
 const [teamFeedback,setTeamFeedback]=useState("");
 const [teamBusy,setTeamBusy]=useState(false);
 const [teamHistory,setTeamHistory]=useState<string[]>([]);
 const [focusedMemberId,setFocusedMemberId]=useState("gpt");const [typingMembers,setTypingMembers]=useState<string[]>([]);const [prompt,setPrompt]=useState("");const [followUp,setFollowUp]=useState("");const [challengeOpen,setChallengeOpen]=useState<string>();const [memberChallenges,setMemberChallenges]=useState<Record<string,string>>({});const [members,setMembers]=useState(initial);const [responses,setResponses]=useState<Response[]>([]);const [finalComplete,setFinalComplete]=useState(false);const [conclusion,setConclusion]=useState<Response>();const [loading,setLoading]=useState(false);const [status,setStatus]=useState("Council ready");const [conversationId,setConversationId]=useState<string>();const [attachments,setAttachments]=useState<File[]>([]);const fileRef=useRef<HTMLInputElement>(null);
 const [account,setAccount]=useState<{email:string;name:string;avatar?:string}|null>(null);
 const [accountLoading,setAccountLoading]=useState(true);
 const [accountOpen,setAccountOpen]=useState(false);
 useEffect(()=>{
  const supabase=createClient();
  let mounted=true;
  const update=(user:import("@supabase/supabase-js").User|null)=>{
   if(!mounted)return;
   const metadata=user?.user_metadata||{};
   setAccount(user?{email:user.email||"",name:metadata.full_name||metadata.name||user.email?.split("@")[0]||"Council member",avatar:metadata.avatar_url||metadata.picture}:null);
   setAccountLoading(false);
  };
  supabase.auth.getUser().then(({data})=>update(data.user)).catch(()=>{if(mounted)setAccountLoading(false)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>update(session?.user||null));
  return ()=>{mounted=false;subscription.unsubscribe()};
 },[]);
 async function signOut(){
  try{await createClient().auth.signOut();setAccount(null);setAccountOpen(false);window.location.assign("/login")}
  catch{setStatus("Could not sign out. Please try again.")}
 }
 const active=useMemo(()=>members.filter(m=>m.enabled),[members]);
 function addMember(m:Member){setMembers(old=>old.some(x=>x.id===m.id)?old.map(x=>x.id===m.id?{...x,enabled:!x.enabled}:x):[...old,{...m,enabled:true}]);setStatus(m.label+" selection updated.");}
 function addCustom(){const name=customName.trim(),model=customModel.trim();if(!name||!model||!model.includes("/")){setStatus("Enter a name and a valid OpenRouter model ID (provider/model).");return}addMember({id:"custom-"+Date.now(),provider:"custom",label:name,model,enabled:true,role:"Independent"});setCustomName("");setCustomModel("")}
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
   if(!r.ok||!r.body){const detail=(await r.text().catch(()=>"")).slice(0,500);let message=detail;try{const parsed=JSON.parse(detail);message=parsed.error?.message||parsed.message||detail}catch{}throw new Error(member.label+" could not respond (server status "+r.status+"): "+(message||"Unknown provider error"))}
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
 async function assignTeam(revise=false){
  const task=assignment.trim();if(!task||active.length<2||teamBusy)return;
  setTeamBusy(true);setStatus(revise?"Council is revising the assignment...":"Council team is collaborating...");
  try{
   const context=revise?[task,"PREVIOUS DELIVERABLE:",teamResult,"CHAIRPERSON FEEDBACK:",teamFeedback].join("\\n\\n"):task;
   const contributions:string[]=[];
   for(const member of active){
    setStatus(member.label+" is working on the Council assignment...");
    const r=await streamMember(member,context+"\\n\\nYour role: "+(member.role||"Independent")+". Provide a useful contribution for the team.", "ask");
    if(r.ok)contributions.push(member.label+":\\n"+r.text);
   }
   if(!contributions.length)throw new Error("No Council members completed their contributions.");
   const lead=active.find(m=>m.id==="gpt")||active[0];
   setStatus("Combining the Council's work into one deliverable...");
   const response=await fetch("/api/council/stream",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({member:lead,mode:"conclusion",prompt:"You are preparing the Council's single coordinated deliverable for its Chairperson. Original assignment:\\n"+context+"\\n\\nTEAM CONTRIBUTIONS:\\n"+contributions.join("\\n\\n")+"\\n\\nCombine the strongest compatible ideas, resolve conflicts, identify any uncertainties, and deliver a clear actionable result. Do not claim consensus where members disagree."})});
   if(!response.ok)throw new Error("The Council could not prepare its combined deliverable ("+response.status+").");
   const reader=response.body?.getReader();if(!reader)throw new Error("No Council deliverable was returned.");
   const decoder=new TextDecoder();let result="";while(true){const chunk=await reader.read();if(chunk.done)break;result+=decoder.decode(chunk.value,{stream:true})}result+=decoder.decode();
   if(!result.trim())throw new Error("The Council returned an empty deliverable.");
   setTeamResult(result);setTeamHistory(h=>[...h,result]);setTeamFeedback("");setStatus("Council deliverable ready for your review.");
  }catch(e){setStatus(e instanceof Error?e.message:"Council assignment failed");}finally{setTeamBusy(false)}
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
  <header><div className="brand"><span className="mark">C</span><div><h1>COUNCIL</h1><p>AI deliberation by AHG</p></div></div><div style={{position:"relative"}}>
   {account?<button className="memory" type="button" aria-expanded={accountOpen} onClick={()=>setAccountOpen(v=>!v)} style={{display:"flex",alignItems:"center",gap:8}}>
    {account.avatar&&<img src={account.avatar} alt="" referrerPolicy="no-referrer" style={{width:26,height:26,borderRadius:"50%"}}/>}
    <span>{account.name}</span>
   </button>:<a className="memory" href="/login">{accountLoading?"Checking account…":"Sign in"}</a>}
   {account&&accountOpen&&<div style={{position:"absolute",right:0,top:"calc(100% + 10px)",zIndex:20,minWidth:240,padding:16,background:"#242a36",border:"1px solid #6d6370",borderRadius:12,boxShadow:"0 12px 28px #0008",color:"#fff"}}>
    <strong style={{display:"block",marginBottom:6}}>{account.name}</strong>
    <span style={{display:"block",fontSize:13,overflowWrap:"anywhere",marginBottom:14}}>{account.email}</span>
    <button type="button" className="secondary" onClick={signOut}>Sign out</button>
   </div>}
  </div></header>
  <section className="hero"><span className="eyebrow">COUNCIL.AI • V1</span><h2>Build your Council. Challenge the answer.</h2><p>Select independent AI members, give them evidence, let them disagree, then decide for yourself.</p></section>
  <section className="roster"><div className="sectionHead"><div><b>Choose Your Council</b><span>{active.length} active member{active.length===1?"":"s"}</span></div><small>More providers can be added without rebuilding Council.</small></div><div className="memberGrid">{members.map(m=><button key={m.id} className={"memberCard "+(m.enabled?"selected":"")} onClick={()=>toggle(m.id)}><span className="memberCheck">{m.enabled?"✓":"+"}</span><span style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><span style={{width:32,height:32,borderRadius:8,background:"#f4f4f4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><img src={"https://www.google.com/s2/favicons?domain="+(logos[m.id]||"openrouter.ai")+"&sz=64"} alt={m.label+" logo"} width={24} height={24} style={{objectFit:"contain"}}/></span><b>{m.label}</b></span><small>Role</small><select value={m.role||"Independent"} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();setRole(m.id,e.target.value)}}><option>Independent</option><option>Strategist</option><option>Skeptic</option><option>Researcher</option><option>Financial Analyst</option><option>Creative</option><option>Devil's Advocate</option></select><em>{m.enabled?"Active":"Tap to add"}</em></button>)}</div><button type="button" className="secondary" style={{marginTop:16,width:"100%",padding:13,display:"flex",justifyContent:"center",alignItems:"center",gap:8}} onClick={()=>setLibraryOpen(v=>!v)} aria-expanded={libraryOpen}><span>{libraryOpen?"⌃":"+"}</span> {libraryOpen?"Close Member Library":"Add Council Member"}</button>
  {libraryOpen&&<div style={{margin:"12px auto 0",width:"100%",maxWidth:570,padding:16,border:"1px solid #8c7958",borderRadius:14,background:"#1e2530",boxShadow:"0 14px 32px #0005"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:8}}><h3 style={{margin:0}}>Choose AI Members</h3><span style={{fontSize:12,color:"#d7c39e"}}>{members.filter(m=>m.enabled).length} selected</span></div>
   <p style={{fontSize:13,marginTop:4}}>Select the models you want on your Council. Checkmarks show active members.</p>
   <input value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)} placeholder="Search AI members..." aria-label="Search AI members" style={{width:"100%",padding:12,marginBottom:12,borderRadius:8}}/>
   <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {[...initial,...library].filter(m=>(m.label+" "+m.model+" "+(descriptions[m.id]||"")).toLowerCase().includes(librarySearch.toLowerCase())).map(m=>{
     const checked=members.some(x=>x.id===m.id&&x.enabled);
     return <button key={m.id} type="button" aria-pressed={checked} onClick={()=>addMember(m)} style={{display:"flex",alignItems:"center",width:"100%",gap:12,textAlign:"left",padding:"11px 12px",border:"1px solid "+(checked?"#b79b65":"#48505e"),background:checked?"#303744":"#242b36",color:"#fff",borderRadius:10,cursor:"pointer"}}>
      <span style={{display:"flex",alignItems:"center",justifyContent:"center",width:38,height:38,flexShrink:0,borderRadius:10,background:"#f4f4f4",color:"#202631",fontWeight:700,fontSize:17,overflow:"hidden"}}><img src={"https://www.google.com/s2/favicons?domain="+(logos[m.id]||"openrouter.ai")+"&sz=64"} alt={m.label+" logo"} width={28} height={28} style={{objectFit:"contain"}}/></span>
      <span style={{flex:1,minWidth:0}}><strong style={{display:"block",fontSize:14}}>{m.label}</strong><span style={{display:"block",fontSize:12,color:"#c4cad2"}}>{descriptions[m.id]||m.model}</span></span>
      <span aria-hidden="true" style={{display:"flex",alignItems:"center",justifyContent:"center",width:23,height:23,borderRadius:6,border:"2px solid "+(checked?"#d9b976":"#9098a4"),background:checked?"#d9b976":"transparent",color:"#18202a",fontWeight:800,flexShrink:0}}>{checked?"✓":""}</span>
     </button>
    })}
   </div>
   <div style={{marginTop:15,paddingTop:14,borderTop:"1px solid #555"}}><b>Bring your own model</b><p style={{fontSize:12}}>Enter a supported OpenRouter model ID. Never paste API keys here.</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}><input value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="Member name" aria-label="Custom member name" style={{padding:10,flex:"1 1 145px",minWidth:0}}/><input value={customModel} onChange={e=>setCustomModel(e.target.value)} placeholder="provider/model ID" aria-label="OpenRouter model ID" style={{padding:10,flex:"1 1 165px",minWidth:0}}/><button type="button" className="secondary" onClick={addCustom}>+ Add Custom</button></div></div>
   <button type="button" className="primary" style={{width:"100%",marginTop:16}} onClick={()=>setLibraryOpen(false)}>Done · {members.filter(m=>m.enabled).length} selected</button>
   <p style={{fontSize:11,marginBottom:0,color:"#b8bec8"}}>Additional AI providers require server-side OpenRouter configuration before they can respond.</p>
  </div>}</section>
  <section className="composer" style={{marginTop:16,padding:14,borderRadius:14}}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:12}}>
    <div><b style={{fontSize:15}}>Your Workspace</b><div style={{fontSize:12,color:"#aeb8c5",marginTop:3}}>{workspaceMode==="council"?"One assignment. One team. One result.":"A conversation with one AI."}</div></div>
    <div style={{display:"inline-flex",gap:3,padding:3,background:"#1c2531",borderRadius:10,border:"1px solid #4c5563"}}>
     {(["individual","council"] as const).map(mode=><button type="button" key={mode} onClick={()=>setWorkspaceMode(mode)} style={{border:0,borderRadius:8,padding:"8px 13px",fontSize:12,fontWeight:600,cursor:"pointer",background:workspaceMode===mode?"#b99a57":"transparent",color:workspaceMode===mode?"#161b23":"#d3d9e1"}}>{mode==="individual"?"Chat Solo":"Work Together"}</button>)}
    </div>
   </div>
   <textarea value={workspaceMode==="council"?assignment:prompt} onChange={e=>workspaceMode==="council"?setAssignment(e.target.value):setPrompt(e.target.value)} placeholder={workspaceMode==="council"?"What would you like your AI team to work on?":"Ask your selected AI anything..."} style={{width:"100%",minHeight:88,boxSizing:"border-box",marginBottom:10}}/>
   {workspaceMode==="individual"&&<div className="media" style={{marginBottom:10}}><input ref={fileRef} hidden multiple type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt" onChange={e=>setAttachments(Array.from(e.target.files||[]))}/><button type="button" onClick={()=>fileRef.current?.click()}>+ Photo / File</button>{attachments.length>0&&<span className="attachmentCount">{attachments.length} selected</span>}</div>}
   <button type="button" className="primary" style={{width:"100%",padding:"11px 14px"}} disabled={workspaceMode==="council"?teamBusy||active.length<2||!assignment.trim():loading||active.length!==1||!prompt.trim()} onClick={()=>workspaceMode==="council"?assignTeam():run("ask")}>{workspaceMode==="council"?(teamBusy?"Team is working...":"Assign to Team"):(loading?"Thinking...":"Chat with "+(active.length===1?active[0].label:"One AI"))}</button>
   {workspaceMode==="individual"&&active.length!==1&&<div style={{fontSize:12,color:"#cbd3dd",marginTop:8}}>Select one AI member above for a solo chat.</div>}
   {workspaceMode==="council"&&active.length<2&&<div style={{fontSize:12,color:"#cbd3dd",marginTop:8}}>Select at least two AI members to work together.</div>}
   {workspaceMode==="council"&&teamResult&&<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #596271"}}><div style={{fontWeight:600,fontSize:14}}>Team Result · Version {teamHistory.length}</div><div className="answer" style={{maxHeight:400,overflowY:"auto",marginTop:10}}><FormattedAnswer text={teamResult}/></div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><button type="button" className="secondary" onClick={()=>setStatus("Result noted. Permanent project saving is not yet available.")}>Looks Good!</button><button type="button" className="secondary" onClick={()=>setTeamFeedback("Please offer a different approach to: ")}>Try Another Take</button></div><textarea aria-label="Feedback to Council" value={teamFeedback} onChange={e=>setTeamFeedback(e.target.value)} placeholder="What should the team change?" style={{width:"100%",minHeight:60,boxSizing:"border-box",marginTop:10}}/><button type="button" disabled={teamBusy||!teamFeedback.trim()} onClick={()=>assignTeam(true)}>Send Back to Council</button></div>}
  </section>
  <div className="status">{status}</div>
  {workspaceMode==="individual"&&<section style={{marginTop:18}}>
   <div className="sectionHead"><div><b>Individual Perspectives</b><span>Explore what each AI contributed to the discussion</span></div><small>Tap to inspect a response</small></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:10,marginBottom:14}}>
    {active.map(m=>{const r=responses.find(x=>x.member.id===m.id);const selected=(active.some(x=>x.id===focusedMemberId)?focusedMemberId:active[0]?.id)===m.id;return <button type="button" key={m.id} onClick={()=>setFocusedMemberId(m.id)} aria-pressed={selected} style={{textAlign:"left",minWidth:0,padding:12,borderRadius:12,border:selected?"2px solid #d9ba75":"1px solid #586171",background:selected?"#364153":"#252e3b",color:"#fff",cursor:"pointer"}}>
     <span style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><img src={"https://www.google.com/s2/favicons?domain="+(logos[m.id]||"openrouter.ai")+"&sz=64"} alt="" width={26} height={26} style={{background:"#fff",borderRadius:6,padding:3}}/><b>{m.label}</b></span>
     <span style={{fontSize:11,color:r?(r.ok?"#dec68f":"#ffb6aa"):"#b8c1cd"}}>{typingMembers.includes(m.id)?"● Responding…":r?(r.ok?"✓ Answer available":"! Needs attention"):"Waiting"}</span>
     <span style={{display:"-webkit-box",WebkitBoxOrient:"vertical",WebkitLineClamp:5,overflow:"hidden",fontSize:12,lineHeight:"19px",height:95,marginTop:8,color:"#d0d6df",overflowWrap:"anywhere"}}>{r?.text||"Select to view this Council member's response."}</span>
    </button>})}
   </div>
   {active.filter(m=>m.id===(active.some(x=>x.id===focusedMemberId)?focusedMemberId:active[0]?.id)).map(m=>{const r=responses.find(x=>x.member.id===m.id);const i=active.findIndex(x=>x.id===m.id);return <article key={m.id} style={{padding:18,border:"1px solid #8c7958",borderRadius:14,background:"#252e3b",color:"#fff"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12}}><div className="model"><b>{m.label}</b><span>{m.role||"Independent view"}</span></div><div style={{display:"flex",gap:8}}><button type="button" className="secondary" aria-label="Previous Council member" onClick={()=>setFocusedMemberId(active[(i-1+active.length)%active.length].id)}>←</button><button type="button" className="secondary" aria-label="Next Council member" onClick={()=>setFocusedMemberId(active[(i+1)%active.length].id)}>→</button></div></div>
    <div className="answer" style={{height:"min(46vh,420px)",minHeight:200,overflowY:"auto",overscrollBehavior:"contain",paddingRight:8}}>{r?(r.ok?(r.text?<><FormattedAnswer text={r.text}/>{typingMembers.includes(m.id)&&<span className="typing-cursor" aria-label="Typing"/>}</>:<span className="thinking-indicator">{m.label} is thinking<span className="thinking-dots">...</span></span>):friendlyError(r)):m.label+"'s position will appear here."}</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>{r&&!r.ok?<button disabled={loading} onClick={()=>retryMember(m)}>Retry {m.label}</button>:<>{r&&<button disabled={loading} onClick={()=>setChallengeOpen(challengeOpen===m.id?undefined:m.id)}>Challenge {m.label}</button>}<button disabled={!r||loading} onClick={()=>run("challenge-member",m.id)}>Rethink {m.label}</button></>}</div>
    {challengeOpen===m.id&&r&&r.ok&&<div className="memberChallenge"><textarea value={memberChallenges[m.id]||""} onChange={e=>setMemberChallenges(x=>({...x,[m.id]:e.target.value}))} placeholder={"Type your challenge to "+m.label+"…"} /><div className="media"><button disabled={loading||!(memberChallenges[m.id]||"").trim()} onClick={()=>challengeMember(m)}>Send to {m.label}</button></div></div>}
   </article>})}
  </section>}
  {workspaceMode==="individual"&&<section className="composer"><textarea value={followUp} onChange={e=>setFollowUp(e.target.value)} placeholder="Ask a follow-up or challenge the Council in your own words…"/><button className="primary" disabled={loading||!followUp.trim()||responses.length<1} onClick={()=>askFollowUp()}>Ask the Council</button></section>}{workspaceMode==="individual"&&<section className="actions"><button disabled={(active.some(m=>!responses.some(r=>r.member.id===m.id&&r.ok)))||loading||finalComplete} onClick={()=>run("challenge-council")}>What is the Council missing?</button><button className="final" disabled={responses.length<2||loading||finalComplete} onClick={()=>run("final")}>{finalComplete?"Final Round Complete":"Request Final Round"}</button></section>}{finalComplete&&workspaceMode==="individual"&&<section className="actions"><button className="final" disabled={loading||Boolean(conclusion)} onClick={runConclusion}>{conclusion?"Council Conclusion Complete":"Generate Council Conclusion"}</button></section>}{conclusion&&workspaceMode==="individual"&&<section className="answers dynamic"><article><div className="model"><b>Council Conclusion</b><span>Prepared by {conclusion.member.label}</span></div><div className="answer">{conclusion.ok?<FormattedAnswer text={conclusion.text}/>:friendlyError(conclusion)}</div></article></section>}
  <nav><button>C<small>Council</small></button><button>P<small>Projects</small></button><button>+<small>Create</small></button><button>M<small>Memory</small></button></nav>
 </main>
}