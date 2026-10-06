export type MemoryScope="personal"|"project"|"conversation";
export type MemoryRecord={id:string;scope:MemoryScope;projectId?:string;content:string;source:"user"|"document"|"conversation"|"media";createdAt:string};
export interface MemoryStore{remember(record:Omit<MemoryRecord,"id"|"createdAt">):Promise<MemoryRecord>;recall(query:string,scope?:MemoryScope,projectId?:string):Promise<MemoryRecord[]>;forget(id:string):Promise<void>}
