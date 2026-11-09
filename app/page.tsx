"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import MediaWorkspace from "./MediaWorkspace";
import AccountMenu from "./AccountMenu";
type Mode="ask"|"challenge-member"|"challenge-council"|"final"|"conclusion";
type Member={id:string;provider:"openai"|"anthropic"|"google"|"xai"|"custom";label:string;model:string;enabled:boolean;role?:string};
type Response={member:Member;text:string;ok:boolean};
type DebateEntry={id:number;memberId:string;mode:Mode;text:string;ok:boolean};
function friendlyError(r:Response){const t=r.text.toLowerCase();if(t.includes("high demand")||t.includes("try again later")||t.includes("overloaded")||t.includes("503"))return r.member.label+" provider response: "+r.text+" (You can retry this member.)";if(t.includes("429")||t.includes("quota")||t.includes("credits"))return r.member.label+" is temporarily unavailable because its provider limit was reached.";return r.text}
const initial:Member[]=[
 {id:"gpt",provider:"openai",label:"GPT",model:"gpt-4.1-mini",enabled:true,role:"Independent"},
 {id:"claude",provider:"anthropic",label:"Claude",model:"claude-sonnet-5-5",enabled:true,role:"Independent"},
 {id:"grok",provider:"xai",label:"Grok",model:"grok-4-fast-non-reasoning",enabled:true,role:"Independent"},
 {id:"gemini",provider:"google",label:"Gemini",model:"gemini-3.8-flash",enabled:false,role:"Independent"}
];
function normalizeAnswer(text:string){
 return text.replace(/<br\s*\/?\s*>/gi,"\n").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").trim();
}
function extractSvg(text:string){
 const match=text.match(/<svg\b[\s\S]*?<\/svg>/i);
 if(!match)return null;
 const svg=match[0];
 if(/<\s*(script|foreignObject|iframe|object|embed|image|use|animate|set)\b|\bon[a-z]+\s*=|javascript:|\b(?:href|src)\s*=|url\s*\(/i.test(svg))return null;
 if(!/xmlns=/.test(svg))return svg.replace(/<svg\b/i,'<svg xmlns="http://www.w3.org/2000/svg"');
 return svg;
}
function FormattedAnswer({text}:{text:string}){
 const parts=normalizeAnswer(text).split(/(\*\*[^*\n]+\*\*)/g);
 return <>{parts.map((part,i)=>part.startsWith("**")&&part.endsWith("**")?<strong key={i}>{part.slice(2,-2)}</strong>:<span key={i}>{part}</span>)}</>;
}
function VisualAnswer({text}:{text:string}){
 const [expanded,setExpanded]=useState(false);
 const [zoom,setZoom]=useState(1);
 const svg=extractSvg(text);
 const src=svg?"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg):null;
 const remaining=svg?text.replace(/<svg\b[\s\S]*?<\/svg>/i,"").trim():text;
 function save(){if(!svg)return;const blob=new Blob([svg],{type:"image/svg+xml"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="council-design.svg";a.click();window.setTimeout(()=>URL.revokeObjectURL(url),2000)}
 return <>{src?<><button className="generatedImageButton" type="button" onClick={()=>{setZoom(1);setExpanded(true)}} aria-label="Expand generated design"><img src={src} alt="AI-generated SVG design. Click to expand."/><span>Click to expand design</span></button>{remaining&&<FormattedAnswer text={remaining}/>}</>:<AnimatedAnswer text={text}/>}
 {expanded&&src&&<div className="imageLightbox" role="dialog" aria-modal="true" aria-label="Expanded Council image" onClick={()=>setExpanded(false)}>
 <div className="imageLightboxToolbar" onClick={e=>e.stopPropagation()}><button onClick={()=>setZoom(v=>Math.max(0.5,v-0.25))}>− Zoom</button><button onClick={()=>setZoom(1)}>Reset</button><button onClick={()=>setZoom(v=>Math.min(4,v+0.25))}>+ Zoom</button><button onClick={save}>Download SVG</button><button onClick={()=>setExpanded(false)}>Close ✕</button></div>
 <div className="imageLightboxViewport" onClick={e=>e.stopPropagation()}><img src={src} alt="Expanded AI-generated design" style={{transform:"scale("+zoom+")"}}/></div>
 </div>}</>;
}
function GeneratedImage({src}:{src:string}){
 const [open,setOpen]=useState(false);const [zoom,setZoom]=useState(1);
 function download(){const a=document.createElement("a");a.href=src;a.download="council-generated-image.png";a.click()}
 return <section className="imageResult"><strong>Created by Council</strong><button className="generatedImageButton" type="button" onClick={()=>{setZoom(1);setOpen(true)}}><img src={src} alt="Council generated image"/><span>Click to expand</span></button><button onClick={download}>Download image</button>
 {open&&<div className="imageLightbox" role="dialog" aria-modal="true" aria-label="Expanded generated image"><div className="imageLightboxToolbar"><button onClick={()=>setZoom(z=>Math.max(.5,z-.25))}>− Zoom</button><button onClick={()=>setZoom(1)}>Reset</button><button onClick={()=>setZoom(z=>Math.min(4,z+.25))}>+ Zoom</button><button onClick={download}>Download</button><button onClick={()=>setOpen(false)}>Close ✕</button></div><div className="imageLightboxViewport"><img src={src} alt="Expanded Council generated image" style={{transform:"scale("+zoom+")"}}/></div></div>}</section>;
}
type PhotoResult={title:string;src:string;original:string;license:string;artist:string};
function isPhotoSearch(text:string){return /\\b(show|find|search|look up|display|see)\\b[\\s\\S]{0,90}\\b(photo|photograph|picture|image|photos|pictures|images)\\b|\\b(photo|photograph|picture|image)\\b[\\s\\S]{0,90}\\b(of|from|show|find)\\b/i.test(text)&&!/\\b(create|generate|draw|design|render|illustrate|make)\\b/i.test(text)}
function PhotoResults({photos}:{photos:PhotoResult[]}){
 const [selected,setSelected]=useState<PhotoResult|null>(null);
 return <section className="photoResults"><strong>Real photos · Wikimedia Commons</strong><div className="photoGrid">{photos.map((photo,i)=><div className="photoCard" key={photo.original+i}><button type="button" onClick={()=>setSelected(photo)}><img src={photo.src} alt={photo.title}/><span>Expand photo</span></button><small>{photo.title}</small><a href={photo.original} target="_blank" rel="noopener noreferrer">Source and license {photo.license?"("+photo.license+")":""}</a></div>)}</div>{selected&&<div className="imageLightbox" role="dialog" aria-modal="true" aria-label="Expanded photo"><div className="imageLightboxToolbar"><a href={selected.original} target="_blank" rel="noopener noreferrer">Open original and license</a><button onClick={()=>setSelected(null)}>Close ✕</button></div><div className="imageLightboxViewport"><img src={selected.src} alt={selected.title}/></div></div>}</section>
}
function isImageRequest(text:string){return /\b(create|generate|make|draw|design|render|illustrate)\b[\s\S]{0,100}\b(image|picture|photo|photograph|logo|poster|artwork|illustration|graphic)\b|\b(image|picture|photo|logo|poster)\b[\s\S]{0,50}\b(create|generate|make|draw|design)\b/i.test(text)}
function AnimatedAnswer({text}:{text:string}){
 const cleaned=normalizeAnswer(text);
 const [visible,setVisible]=useState("");
 useEffect(()=>{
  setVisible("");
  let index=0;
  const timer=window.setInterval(()=>{
   index=Math.min(cleaned.length,index+Math.max(1,Math.ceil((cleaned.length-index)/110)));
   setVisible(cleaned.slice(0,index));
   if(index>=cleaned.length)window.clearInterval(timer);
  },24);
  return ()=>window.clearInterval(timer);
 },[cleaned]);
 return <span aria-label={cleaned}><FormattedAnswer text={visible}/><span className="typingCursor" aria-hidden="true">{visible.length<cleaned.length?"▍":""}</span></span>;
}
export default function Home(){
 const [prompt,setPrompt]=useState("");const [generatedImage,setGeneratedImage]=useState<string>();const [imageError,setImageError]=useState("");const [imageBusy,setImageBusy]=useState(false);const [photoResults,setPhotoResults]=useState<PhotoResult[]>([]);const [photoBusy,setPhotoBusy]=useState(false);const [photoError,setPhotoError]=useState("");const [directQuestions,setDirectQuestions]=useState<Record<string,string>>({});const [debate,setDebate]=useState<DebateEntry[]>([]);const debateId=useRef(0);const [members,setMembers]=useState(initial);const [responses,setResponses]=useState<Response[]>([]);const [finalComplete,setFinalComplete]=useState(false);const [conclusion,setConclusion]=useState<Response>();const [loading,setLoading]=useState(false);const [status,setStatus]=useState("Council ready");const [conversationId,setConversationId]=useState<string>();const [attachments,setAttachments]=useState<File[]>([]);const fileRef=useRef<HTMLInputElement>(null);
 const active=useMemo(()=>members.filter(m=>m.enabled),[members]);
 function recordAnswer(memberId:string,mode:Mode,r:Response){setDebate(old=>[...old,{id:++debateId.current,memberId,mode,text:r.text,ok:r.ok}])}
 function toggle(id:string){setMembers(x=>x.map(m=>m.id===id?{...m,enabled:!m.enabled}:m))}
 function setRole(id:string,role:string){setMembers(x=>x.map(m=>m.id===id?{...m,role}:m))}
 async function uploadSelected(){if(!attachments.length)return;const form=new FormData();attachments.forEach(f=>form.append("files",f));const r=await fetch("/api/assets",{method:"POST",body:form});const d=await r.json();if(!r.ok)throw new Error(d.error||"Upload failed");return d.assets}
 async function findPhotos(request:string){setPhotoBusy(true);setPhotoError("");setPhotoResults([]);try{const r=await fetch("/api/images/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:request.replace(/^(show|find|search|display)\\s+(me\\s+)?(an?\\s+)?(image|photo|photograph|picture|photos|images|pictures)\\s+(of\\s+)?/i,"").replace(/[?.!]+$/,"")})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Search failed");setPhotoResults(d.results||[]);if(!d.results?.length)setPhotoError("No matching public photos found. Try a more specific search.")}catch(e){setPhotoError(e instanceof Error?e.message:"Photo search failed")}finally{setPhotoBusy(false)}}
 async function createImage(request:string){
  setImageBusy(true);setImageError("");setGeneratedImage(undefined);
  try{const r=await fetch("/api/images/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:request})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Image generation failed");setGeneratedImage(d.image)}
  catch(e){setImageError(e instanceof Error?e.message:"Image generation failed")}
  finally{setImageBusy(false)}
 }
 async function retryMember(member:Member){
  if(!prompt.trim())return;setLoading(true);setStatus("Retrying "+member.label+"...");
  const prior=responses.filter(r=>r.member.id!==member.id&&r.ok).map(r=>r.member.label+" PRIOR POSITION:\n"+r.text).join("\n\n");const context=[prompt,prior].filter(Boolean).join("\n\n");
  try{const r=await fetch("/api/council",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:context,mode:"ask",members:[member],conversationId})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");const next=d.responses?.[0];if(next){setResponses(old=>old.map(x=>x.member.id===member.id?next:x));recordAnswer(member.id,"ask",next)}if(d.conversationId)setConversationId(d.conversationId);setStatus(next?.ok?member.label+" is back in the Council.":member.label+" is still temporarily unavailable.");}catch(e){setStatus(e instanceof Error?e.message:"Retry failed");}finally{setLoading(false)}
 }
 async function askMemberDirect(member:Member){
  const question=(directQuestions[member.id]||"").trim();
  if(!question||loading||!responses.some(r=>r.member.id===member.id&&r.ok))return;
  setLoading(true);setStatus("Asking "+member.label+"...");
  const history=debate.filter(e=>e.memberId===member.id).map(e=>(e.mode==="ask"?"Initial answer":e.mode==="challenge-member"?"Follow-up answer":"Previous answer")+":\n"+e.text).join("\n\n");
  const context="Original Council question:\n"+prompt+"\n\n"+member.label+" previous answers:\n"+history+"\n\nUser's direct follow-up question to "+member.label+":\n"+question+"\n\nAnswer the direct follow-up, maintaining the context above.";
  try{
   const r=await fetch("/api/council",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:context,mode:"challenge-member",targetMemberId:member.id,members:[member],conversationId})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");
   const next=d.responses?.[0] as Response|undefined;
   if(next){setResponses(old=>[...old.filter(x=>x.member.id!==member.id),next]);recordAnswer(member.id,"challenge-member",next);if(next.ok)setDirectQuestions(old=>({...old,[member.id]:""}));}
   if(d.conversationId)setConversationId(d.conversationId);
   setStatus(next?.ok?member.label+" answered your follow-up.":member.label+" could not answer. Please retry.");
  }catch(e){setStatus(e instanceof Error?e.message:"Follow-up failed");}
  finally{setLoading(false);}
 }
 async function runConclusion(){
  const chair=active.find(m=>m.id==="claude"&&responses.some(r=>r.member.id===m.id&&r.ok))||active.find(m=>responses.some(r=>r.member.id===m.id&&r.ok));if(!chair)return;
  setLoading(true);setStatus("Preparing one Council conclusion...");const prior=responses.filter(r=>r.ok).map(r=>r.member.label+" FINAL POSITION:\n"+r.text).join("\n\n");const context=[prompt,prior].filter(Boolean).join("\n\n");
  try{const r=await fetch("/api/council",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:context,mode:"conclusion",members:[chair],conversationId})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");const next=d.responses?.[0];if(next)setConclusion(next);if(d.conversationId)setConversationId(d.conversationId);setStatus("Council conclusion ready — you make the decision.");}catch(e){setStatus(e instanceof Error?e.message:"Conclusion failed");}finally{setLoading(false)}
 }
 async function run(mode:Mode,targetMemberId?:string){
  if(!prompt.trim()&&mode==="ask")return;setLoading(true);setStatus(mode==="final"?"Preparing final round...":"Council members are responding...");
  const prior=responses.filter(r=>r.ok).map(r=>r.member.label+" PRIOR POSITION:\n"+r.text).join("\n\n");const context=mode==="ask"?prompt:[prompt,prior].filter(Boolean).join("\n\n");
  try{
   if(attachments.length){setStatus("Securing your evidence...");await uploadSelected()}
   const selected=mode==="challenge-member"&&targetMemberId?active.filter(m=>m.id===targetMemberId):active;
   if(mode==="ask"){setFinalComplete(false);setConclusion(undefined);setResponses([]);setDebate([]);setGeneratedImage(undefined);setImageError("");setPhotoResults([]);setPhotoError("");if(isPhotoSearch(prompt))void findPhotos(prompt);else if(isImageRequest(prompt))void createImage(prompt)}
   let cid=conversationId;let completed=0;
   const jobs=selected.map(async member=>{
    try{
     const r=await fetch("/api/council",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:context,mode,targetMemberId,members:[member],conversationId:cid})});
     const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");const next=d.responses?.[0] as Response|undefined;if(d.conversationId&&!cid){cid=d.conversationId;setConversationId(d.conversationId)}
     if(next){setResponses(old=>{const rest=old.filter(x=>x.member.id!==member.id);return [...rest,next]});recordAnswer(member.id,mode,next)}
    }catch(e){const next:Response={member,text:e instanceof Error?e.message:"Unavailable",ok:false};setResponses(old=>[...old.filter(x=>x.member.id!==member.id),next]);recordAnswer(member.id,mode,next)}
    finally{completed++;setStatus(completed<selected.length?completed+" of "+selected.length+" Council members responded...":"Council round complete.")}
   });
   await Promise.all(jobs);if(attachments.length)setAttachments([]);if(mode==="final"){setFinalComplete(true);setStatus("Final round complete — request one Council conclusion when ready.")}else setStatus("Challenge a member, add evidence, or continue deliberating.");
  }catch(e){setStatus(e instanceof Error?e.message:"Something went wrong");}finally{setLoading(false)}
 }
 return <main>
  <header><div className="brand"><span className="mark"><svg viewBox="0 0 80 80" role="img" aria-label="Council monogram"><path d="M58 18 A30 30 0 1 0 58 62" stroke="#D6B777" strokeWidth="9" strokeLinecap="round" fill="none"/><path d="M44 29 L58 40 L44 51" stroke="#4FD0C5" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg></span><div><h1>COUNCIL</h1><p>AI deliberation by AHG</p></div></div><AccountMenu/></header>
  <section className="hero"><span className="eyebrow">COUNCIL.AI • V1</span><h2>Build your Council. Challenge the answer.</h2><p>Select independent AI members, give them evidence, let them disagree, then decide for yourself.</p></section>
  <section className="roster"><div className="sectionHead"><div><b>Choose Your Council</b><span>{active.length} active member{active.length===1?"":"s"}</span></div><small>More providers can be added without rebuilding Council.</small></div><div className="memberGrid">{members.map(m=><button key={m.id} className={"memberCard "+(m.enabled?"selected":"")} onClick={()=>toggle(m.id)}><span className="memberCheck">{m.enabled?"✓":"+"}</span><b>{m.label}</b><small>Role</small><select value={m.role||"Independent"} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();setRole(m.id,e.target.value)}}><option>Independent</option><option>Strategist</option><option>Skeptic</option><option>Researcher</option><option>Financial Analyst</option><option>Creative</option><option>Devil's Advocate</option></select><em>{m.enabled?"Active":"Tap to add"}</em></button>)}</div></section>
  <section className="composer"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="What do you want the Council to think through?"/><input ref={fileRef} hidden multiple type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt" onChange={e=>setAttachments(Array.from(e.target.files||[]))}/><div className="media"><button onClick={()=>fileRef.current?.click()}>+ Photo / File</button><button onClick={()=>fileRef.current?.click()}>Voice</button><button onClick={()=>fileRef.current?.click()}>Video</button>{attachments.length>0&&<span className="attachmentCount">{attachments.length} selected</span>}</div><MediaWorkspace files={attachments} onRemove={index=>setAttachments(old=>old.filter((_,i)=>i!==index))}/><button className="primary" disabled={loading||active.length<1} onClick={()=>run("ask")}>{loading?"Thinking...":"Ask "+active.length+" Council Member"+(active.length===1?"":"s")}</button></section>
  <div className="status">{status}</div>{imageBusy&&<div className="status">Creating your image…</div>}{imageError&&<div className="imageNotice" role="alert">Image generation: {imageError}</div>}{generatedImage&&<GeneratedImage src={generatedImage}/>} {photoBusy&&<div className="status">Finding real photographs…</div>}{photoError&&<div className="imageNotice" role="alert">{photoError}</div>}{photoResults.length>0&&<PhotoResults photos={photoResults}/>}
  <section className="answers dynamic">{active.map(m=>{const r=responses.find(x=>x.member.id===m.id);return <article key={m.id}><div className="model"><b>{m.label}</b><span>{m.role||"Independent view"}</span></div><div className="answer">{debate.filter(entry=>entry.memberId===m.id).length?debate.filter(entry=>entry.memberId===m.id).map((entry,i)=><div key={entry.id} style={{marginBottom:16,paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,.16)"}}><strong style={{display:"block",marginBottom:8,color:"#D6B777"}}>{entry.mode==="ask"?(i===0?"Original recommendation":"Updated recommendation"):entry.mode==="challenge-member"?"Challenge response":entry.mode==="challenge-council"?"Council discussion":entry.mode==="final"?"Final round":"Follow-up"}</strong>{entry.ok?<VisualAnswer text={entry.text}/>:<span role="alert" className="providerError">{entry.text}</span>}</div>):m.label+"'s position will appear here."}</div>{r?.ok&&<div className="directAsk"><label htmlFor={"direct-"+m.id}>Ask {m.label} a direct follow-up</label><textarea id={"direct-"+m.id} rows={2} value={directQuestions[m.id]||""} onChange={e=>setDirectQuestions(old=>({...old,[m.id]:e.target.value}))} placeholder={"Ask "+m.label+" about their answer..."} /><button disabled={loading||!(directQuestions[m.id]||"").trim()} onClick={()=>askMemberDirect(m)}>Send to {m.label}</button></div>}{r&&!r.ok?<button disabled={loading} onClick={()=>retryMember(m)}>Retry {m.label}</button>:<button disabled={!r||loading} onClick={()=>run("challenge-member",m.id)}>Challenge {m.label}</button>}</article>})}</section>
  <section className="actions"><button disabled={responses.length<2||loading||finalComplete} onClick={()=>run("challenge-council")}>What is the Council missing?</button><button className="final" disabled={responses.length<2||loading||finalComplete} onClick={()=>run("final")}>{finalComplete?"Final Round Complete":"Request Final Round"}</button></section>{finalComplete&&<section className="actions"><button className="final" disabled={loading||Boolean(conclusion)} onClick={runConclusion}>{conclusion?"Council Conclusion Complete":"Generate Council Conclusion"}</button></section>}{conclusion&&<section className="answers dynamic"><article><div className="model"><b>Council Conclusion</b><span>Prepared by {conclusion.member.label}</span></div><div className="answer">{conclusion.ok?<VisualAnswer text={conclusion.text}/>:friendlyError(conclusion)}</div></article></section>}
  <nav><button>C<small>Council</small></button><button>P<small>Projects</small></button><button>+<small>Create</small></button><button>M<small>Memory</small></button></nav>
 </main>
}