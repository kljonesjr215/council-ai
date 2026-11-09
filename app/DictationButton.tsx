"use client";
import {useEffect,useRef,useState} from "react";
type SpeechResult={results:ArrayLike<{isFinal:boolean;[index:number]:{transcript:string}}>;resultIndex:number};
type Recognition={continuous:boolean;interimResults:boolean;lang:string;onresult:((e:SpeechResult)=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export default function DictationButton({onTranscript}:{onTranscript:(text:string)=>void}){
 const recognition=useRef<Recognition|null>(null);
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const chunks=useRef<Blob[]>([]);
 const [listening,setListening]=useState(false),[processing,setProcessing]=useState(false),[error,setError]=useState("");
 useEffect(()=>()=>{recognition.current?.stop();recorder.current?.stop();stream.current?.getTracks().forEach(t=>t.stop())},[]);
 async function toggle(){
  if(recognition.current){recognition.current.stop();recognition.current=null;setListening(false);return}
  if(recorder.current?.state==="recording"){recorder.current.stop();setListening(false);setProcessing(true);return}
  setError("");
  const w=window as SpeechWindow;const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(Speech){
   try{
    const r=new Speech();r.lang="en-US";r.continuous=true;r.interimResults=true;
    r.onresult=e=>{let final="";for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)final+=e.results[i][0].transcript+" ";if(final.trim())onTranscript(final.trim())};
    r.onerror=e=>{setError("Microphone: "+e.error);setListening(false);recognition.current=null};
    r.onend=()=>{setListening(false);recognition.current=null};
    r.start();recognition.current=r;setListening(true);return;
   }catch{/* Fall back to recorded transcription */}
  }
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setError("This browser cannot access microphone recording.");return}
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:true});stream.current=media;
   const preferred=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(t=>MediaRecorder.isTypeSupported(t));
   const r=new MediaRecorder(media,preferred?{mimeType:preferred}:undefined);recorder.current=r;chunks.current=[];
   r.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};
   r.onstop=async()=>{
    media.getTracks().forEach(t=>t.stop());stream.current=null;recorder.current=null;
    try{
     const blob=new Blob(chunks.current,{type:r.mimeType||"audio/webm"});
     const form=new FormData();form.append("audio",blob,r.mimeType.includes("mp4")?"dictation.mp4":r.mimeType.includes("ogg")?"dictation.ogg":"dictation.webm");
     const response=await fetch("/api/transcribe",{method:"POST",body:form});
     const contentType=response.headers.get("content-type")||"";
     if(!contentType.includes("application/json"))throw new Error("Transcription service is unavailable ("+response.status+").");
     const data=await response.json();
     if(!response.ok)throw new Error(data.error||"Transcription failed");
     if(data.text)onTranscript(data.text);
    }catch(e){setError(e instanceof Error?e.message:"Transcription failed")}finally{setProcessing(false)}
   };
   r.start();setListening(true);
  }catch(e){setError(e instanceof Error?e.message:"Microphone permission was denied")}
 }
 return <><button type="button" onClick={toggle} disabled={processing} aria-pressed={listening}>{processing?"Transcribing…":listening?"■ Stop dictation":"🎙 Dictate"}</button>{error&&<small role="alert">{error}</small>}</>;
}
