export type MediaKind="image"|"document"|"audio"|"video";
export type MediaEvidence={id:string;kind:MediaKind;name:string;mimeType:string;transcript?:string;summary?:string;frameRefs?:string[]};
export interface MediaPipeline{ingest(file:File):Promise<MediaEvidence>}
