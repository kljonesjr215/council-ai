import {CouncilMode} from "../types";
export type ProviderId="openai"|"anthropic"|"google"|"custom";
export type CouncilMember={id:string;provider:ProviderId;label:string;model:string;enabled:boolean;role?:string};
export interface CouncilProvider{ id:ProviderId; isConfigured():boolean; ask(input:{prompt:string;mode:CouncilMode;model:string;role?:string}):Promise<string> }
