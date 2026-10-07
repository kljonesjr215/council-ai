import type {CouncilMode} from "../types";
export type ProviderId="openai"|"anthropic"|"google"|"custom";
export type ProviderCapabilities={text:boolean;reasoning?:boolean;web?:boolean;imageInput?:boolean;documentInput?:boolean;audioInput?:boolean;videoInput?:boolean;imageGeneration?:boolean;imageEditing?:boolean;structuredOutput?:boolean;live?:boolean};
export type CouncilMember={id:string;provider:ProviderId;label:string;model:string;enabled:boolean;role?:string};
export interface CouncilProvider{ id:ProviderId; capabilities:ProviderCapabilities; isConfigured():boolean; ask(input:{prompt:string;mode:CouncilMode;model:string;role?:string}):Promise<string> }
