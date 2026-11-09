"use client";
import {useEffect,useState} from "react";
type Props={files:File[];onRemove:(index:number)=>void};
export default function MediaWorkspace({files,onRemove}:Props){
 const [urls,setUrls]=useState<string[]>([]);
 const [brightness,setBrightness]=useState(100);
 const [contrast,setContrast]=useState(100);
 const [reference,setReference]=useState<number[]>([]);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{const next=files.map(f=>URL.createObjectURL(f));setUrls(next);return ()=>next.forEach(u=>URL.revokeObjectURL(u))},[files]);
 const imageIndex=files.findIndex(f=>f.type.startsWith("image/")&&!reference.includes(files.indexOf(f)));
 async function exportEdited(){
  if(imageIndex<0||!urls[imageIndex])return;
  setBusy(true);
  try{
   const image=new Image();image.src=urls[imageIndex];await image.decode();
   const canvas=document.createElement("canvas");canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Image editor unavailable");
   ctx.filter="brightness("+brightness+"%) contrast("+contrast+"%)";ctx.drawImage(image,0,0);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
   if(!blob)throw new Error("Could not export image");
   const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="council-edited-"+files[imageIndex].name.replace(/\.[^.]+$/,"")+".png";a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
  }catch(e){window.alert(e instanceof Error?e.message:"Image export failed")}finally{setBusy(false)}
 }
 if(!files.length)return null;
 return <section className="mediaWorkspace" aria-label="Media workspace">
  <div className="mediaWorkspaceHead"><strong>Media workspace</strong><small>Preview uploads and choose reference photos. AI image/video processing is coming next.</small></div>
  <div className="mediaTiles">{files.map((file,i)=><div className="mediaTile" key={i}>
   {file.type.startsWith("image/")&&urls[i]?<img src={urls[i]} alt={"Preview of "+file.name}/>:file.type.startsWith("video/")&&urls[i]?<video src={urls[i]} controls preload="metadata"/>:file.type.startsWith("audio/")&&urls[i]?<audio src={urls[i]} controls preload="metadata"/>:<span className="fileIcon">File</span>}
   <span className="mediaFilename" title={file.name}>{file.name}</span><small>{(file.size/1024/1024).toFixed(1)} MB</small>
   {file.type.startsWith("image/")&&<label className="referenceToggle"><input type="checkbox" checked={reference.includes(i)} onChange={e=>setReference(old=>e.target.checked?[...old,i]:old.filter(x=>x!==i))}/> Style reference</label>}
   <button type="button" onClick={()=>{onRemove(i);setReference([]);setBrightness(100);setContrast(100)}}>Remove</button>
  </div>)}</div>
  {imageIndex>=0&&<div className="quickEditor"><strong>Quick photo adjustments</strong><small>Edits apply to the first non-reference photo. Original files are unchanged.</small>
   <div className="editorPreview">{urls[imageIndex]&&<img src={urls[imageIndex]} alt="Edited photo preview" style={{filter:"brightness("+brightness+"%) contrast("+contrast+"%)"}}/>}</div>
   <label>Brightness: {brightness}% <input type="range" min="50" max="150" value={brightness} onChange={e=>setBrightness(Number(e.target.value))}/></label>
   <label>Contrast: {contrast}% <input type="range" min="50" max="150" value={contrast} onChange={e=>setContrast(Number(e.target.value))}/></label>
   <button type="button" disabled={busy} onClick={exportEdited}>{busy?"Exporting...":"Save edited photo"}</button>
  </div>}
 </section>;
}
