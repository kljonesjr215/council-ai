"use client";
import {useEffect,useState} from "react";
type Props={files:File[];onRemove:(index:number)=>void};
export default function MediaWorkspace({files,onRemove}:Props){
 const [urls,setUrls]=useState<string[]>([]);
 const [selected,setSelected]=useState<File[]>([]);
 useEffect(()=>{const next=files.map(file=>file.type.startsWith("image/")?URL.createObjectURL(file):"");setUrls(next);return ()=>next.forEach(url=>{if(url)URL.revokeObjectURL(url)})},[files]);
 useEffect(()=>{setSelected(old=>old.filter(file=>files.includes(file)))},[files]);
 if(!files.length)return null;
 const images=files.filter(f=>f.type.startsWith("image/"));
 function toggle(file:File){setSelected(old=>old.includes(file)?old.filter(f=>f!==file):[...old,file])}
 return <section className="mediaWorkspace" aria-label="Uploaded media" style={{padding:"12px 16px"}}>
  <strong>{images.length?`${images.length} photo${images.length===1?"":"s"} uploaded`:`${files.length} file${files.length===1?"":"s"} uploaded`}</strong>
  <div style={{marginTop:5}}>Select the photo or photos you want to reference.</div>
  <div className="referencePhotoGrid" style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:12}}>
   {files.map((file,i)=>{const active=selected.includes(file);return <div key={i} style={{width:132,maxWidth:"45%"}}>
    <button type="button" onClick={()=>toggle(file)} aria-pressed={active} aria-label={`${active?"Deselect":"Select"} ${file.name} as reference`} style={{width:"100%",padding:6,borderRadius:10,border:active?"3px solid #e5bd65":"2px solid #60718c",background:active?"#243c51":"#17283f",color:"#fff",cursor:"pointer",position:"relative"}}>
     {urls[i]?<img src={urls[i]} alt={file.name} style={{width:"100%",height:100,objectFit:"contain",display:"block"}}/>:<div style={{height:100,display:"grid",placeItems:"center"}}>{file.type.startsWith("video/")?"Video":file.name}</div>}
     <span style={{display:"block",fontSize:12,marginTop:4}}>{active?"✓ Reference selected":"Select as reference"}</span>
    </button>
    <div title={file.name} style={{fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:4}}>{file.name}</div>
    <button type="button" onClick={()=>onRemove(i)} style={{border:0,background:"transparent",color:"#c9d7e6",fontSize:11,cursor:"pointer",padding:"4px 0"}}>Remove ×</button>
   </div>})}
  </div>
  <small style={{display:"block",marginTop:8}}>{selected.length? `${selected.length} selected as reference. `:""}What would you like Council to do with {selected.length?"the selected photo"+(selected.length===1?"":"s"):"your upload"}? Enter your instructions above.</small>
 </section>;
}
