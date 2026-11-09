"use client";
type Props={files:File[];onRemove:(index:number)=>void};
export default function MediaWorkspace({files,onRemove}:Props){
 if(!files.length)return null;
 const photos=files.filter(f=>f.type.startsWith("image/")).length;
 const videos=files.filter(f=>f.type.startsWith("video/")).length;
 const audio=files.filter(f=>f.type.startsWith("audio/")).length;
 const other=files.length-photos-videos-audio;
 const labels=[photos&&`${photos} photo${photos===1?"":"s"}`,videos&&`${videos} video${videos===1?"":"s"}`,audio&&`${audio} audio file${audio===1?"":"s"}`,other&&`${other} file${other===1?"":"s"}`].filter(Boolean);
 return <section className="mediaWorkspace" aria-label="Attached media" style={{padding:"12px 16px"}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
   <div><strong>✓ {labels.join(", ")} recognized.</strong><div style={{marginTop:4}}>What would you like Council to do next?</div><small>Original files remain unchanged. Type your instructions in the question box.</small></div>
  </div>
  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>{files.map((file,i)=><button key={i} type="button" title={file.name} onClick={()=>onRemove(i)} style={{fontSize:12,padding:"5px 9px",border:"1px solid #53627b",borderRadius:8,background:"transparent",color:"inherit"}}>Remove {files.length>1?`file ${i+1}`:"attachment"} ×</button>)}</div>
 </section>;
}
