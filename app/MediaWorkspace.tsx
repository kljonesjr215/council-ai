"use client";
import {useEffect,useState} from "react";
type Props={files:File[];onRemove:(index:number)=>void};
export default function MediaWorkspace({files,onRemove}:Props){
 const [urls,setUrls]=useState<string[]>([]);
 const [brightness,setBrightness]=useState(100);
 const [contrast,setContrast]=useState(100);
 const [saturation,setSaturation]=useState(100);
 const [grayscale,setGrayscale]=useState(0);
 const [sepia,setSepia]=useState(0);
 const [hue,setHue]=useState(0);
 const [editorOpen,setEditorOpen]=useState(false);
 const [action,setAction]=useState("");
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
   ctx.filter="brightness("+brightness+"%) contrast("+contrast+"%) saturate("+saturation+"%) grayscale("+grayscale+"%) sepia("+sepia+"%) hue-rotate("+hue+"deg)";ctx.drawImage(image,0,0);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
   if(!blob)throw new Error("Could not export image");
   const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="council-edited-"+files[imageIndex].name.replace(/\.[^.]+$/,"")+".png";a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
  }catch(e){window.alert(e instanceof Error?e.message:"Image export failed")}finally{setBusy(false)}
 }
 if(!files.length)return null;
 return <section className="mediaWorkspace" aria-label="Media workspace">
  <div className="mediaWorkspaceHead"><strong>Media workspace</strong><small>Preview uploads and choose reference photos. Original uploads are kept unchanged. Choose what Council should do before editing.</small></div>
  <div className="mediaTiles">{files.map((file,i)=><div className="mediaTile" key={i}>
   {file.type.startsWith("image/")&&urls[i]?<img src={urls[i]} alt={"Preview of "+file.name}/>:file.type.startsWith("video/")&&urls[i]?<video src={urls[i]} controls preload="metadata"/>:file.type.startsWith("audio/")&&urls[i]?<audio src={urls[i]} controls preload="metadata"/>:<span className="fileIcon">File</span>}
   <span className="mediaFilename" title={file.name}>{file.name}</span><small>{(file.size/1024/1024).toFixed(1)} MB</small>
   {file.type.startsWith("image/")&&<label className="referenceToggle"><input type="checkbox" checked={reference.includes(i)} onChange={e=>setReference(old=>e.target.checked?[...old,i]:old.filter(x=>x!==i))}/> Style reference</label>}
   <button type="button" onClick={()=>{onRemove(i);setReference([]);setBrightness(100);setContrast(100);setSaturation(100);setGrayscale(0);setSepia(0);setHue(0);setAction("");setEditorOpen(false)}}>Remove</button>
  </div>)}</div>
  {imageIndex>=0&&<div className="quickEditor"><strong>What would you like Council to do with this photo?</strong><small>The original is preserved. Choose a task; nothing is changed automatically.</small>
 <div className="photoActionGrid">{["Analyze or describe","Identify objects","Find location or source","Search similar images","Enhance automatically","Remove an object","Use as design reference","Manual adjustments"].map(option=><button type="button" className={action===option?"selected":""} key={option} onClick={()=>{setAction(option);setEditorOpen(option==="Manual adjustments")}}>{option}</button>)}</div>
 {action&&action!=="Manual adjustments"&&<p className="photoActionNote">{action==="Enhance automatically"?"Automatic enhancement requires an AI editing connection; your original is unchanged.":action==="Remove an object"?"Object removal requires an AI editing connection and a description of what to remove.":action==="Find location or source"?"Council will need visual analysis and source search to investigate this photo.":action==="Analyze or describe"?"Visual analysis by Council members is the next integration.":action==="Identify objects"?"Object recognition by Council members is the next integration.":action==="Search similar images"?"Reverse-image search is not yet connected.":"This photo is available as a style reference during this session."}</p>}
 {editorOpen&&<><strong>Optional manual adjustments</strong><small>These controls only affect the preview and exported copy.</small>
   <div className="editorPreview">{urls[imageIndex]&&<img src={urls[imageIndex]} alt="Edited photo preview" style={{filter:"brightness("+brightness+"%) contrast("+contrast+"%) saturate("+saturation+"%) grayscale("+grayscale+"%) sepia("+sepia+"%) hue-rotate("+hue+"deg)"}}/>}</div>
   <label>Brightness: {brightness}% <input type="range" min="50" max="150" value={brightness} onChange={e=>setBrightness(Number(e.target.value))}/></label>
   <label>Contrast: {contrast}% <input type="range" min="50" max="150" value={contrast} onChange={e=>setContrast(Number(e.target.value))}/></label>
   <label>Saturation: {saturation}% <input type="range" min="0" max="200" value={saturation} onChange={e=>setSaturation(Number(e.target.value))}/></label>
 <label>Grayscale: {grayscale}% <input type="range" min="0" max="100" value={grayscale} onChange={e=>setGrayscale(Number(e.target.value))}/></label>
 <label>Warmth (sepia): {sepia}% <input type="range" min="0" max="100" value={sepia} onChange={e=>setSepia(Number(e.target.value))}/></label>
 <label>Hue: {hue}° <input type="range" min="-180" max="180" value={hue} onChange={e=>setHue(Number(e.target.value))}/></label>
 <button type="button" onClick={()=>{setBrightness(100);setContrast(100);setSaturation(100);setGrayscale(0);setSepia(0);setHue(0)}}>Reset adjustments</button>
 <button type="button" disabled={busy} onClick={exportEdited}>{busy?"Exporting...":"Save edited photo"}</button></>}
  </div>}
 </section>;
}
