"use client";
import {useEffect,useRef,useState} from "react";
type SpeechResult={results:ArrayLike<{isFinal:boolean;[index:number]:{transcript:string}}>;resultIndex:number};
type Recognition={continuous:boolean;interimResults:boolean;lang:string;onresult:((e:SpeechResult)=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export default function DictationButton({onTranscript}:{onTranscript:(text:string)=>void}){
 const recognition=useRef<Recognition|null>(null);const [listening,setListening]=useState(false);const [error,setError]=useState("");
 useEffect(()=>()=>{if(recognition.current){recognition.current.onend=null;recognition.current.stop()}},[]);
 function toggle(){
  if(recognition.current){recognition.current.stop();recognition.current=null;setListening(false);return}
  const w=window as SpeechWindow;const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!Speech){setError("Live dictation is unavailable in this browser. You can still type your question.");return}
  try{
   const r=new Speech();r.lang="en-US";r.continuous=true;r.interimResults=true;
   r.onresult=e=>{let final="";for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)final+=e.results[i][0].transcript+" "}if(final.trim())onTranscript(final.trim())};
   r.onerror=e=>{setError("Microphone: "+e.error);setListening(false);recognition.current=null};
   r.onend=()=>{setListening(false);recognition.current=null};
   r.start();recognition.current=r;setListening(true);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Microphone unavailable")}
 }
 return <><button type="button" onClick={toggle} aria-pressed={listening}>{listening?"■ Stop dictation":"🎙 Dictate"}</button>{error&&<small role="alert">{error}</small>}</>;
}
