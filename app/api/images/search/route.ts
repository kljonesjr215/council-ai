import {NextResponse} from "next/server";
export const runtime="nodejs";
export async function POST(req:Request){
 try{
  const body=await req.json();const query=typeof body.query==="string"?body.query.trim():"";
  if(!query||query.length>180)return NextResponse.json({error:"Enter a shorter photo search."},{status:400});
  const api=new URL("https://commons.wikimedia.org/w/api.php");
  api.searchParams.set("action","query");api.searchParams.set("generator","search");
  api.searchParams.set("gsrsearch",query+" filetype:bitmap");api.searchParams.set("gsrnamespace","6");api.searchParams.set("gsrlimit","8");
  api.searchParams.set("prop","imageinfo");api.searchParams.set("iiprop","url|extmetadata|mime");api.searchParams.set("iiurlwidth","700");api.searchParams.set("format","json");
  const response=await fetch(api.toString(),{headers:{"User-Agent":"CouncilAI/1.0 (image discovery; Wikimedia Commons)","Accept":"application/json"},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error("Photo source unavailable");
  const data=await response.json();
  const results=Object.values(data.query?.pages||{}).map((p:any)=>{const info=p.imageinfo?.[0];const meta=info?.extmetadata||{};return {title:String(p.title||"").replace(/^File:/,""),src:info?.thumburl||info?.url,original:info?.descriptionurl,license:meta.LicenseShortName?.value||"",artist:meta.Artist?.value?.replace(/<[^>]*>/g,"").slice(0,160)||""}}).filter((p:any)=>typeof p.src==="string"&&p.src.startsWith("https://")&&p.original?.startsWith("https://")).slice(0,6);
  return NextResponse.json({results});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Photo search failed"},{status:502})}
}
