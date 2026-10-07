import type {CouncilMember} from "./providers/types";
export type CouncilMode="ask"|"challenge-gpt"|"challenge-claude"|"challenge-both"|"final";
export type CouncilRequest={prompt:string;mode:CouncilMode;members?:CouncilMember[];history?:{role:"user"|"assistant";content:string}[]};
export type CouncilMemberResponse={member:CouncilMember;text:string;ok:boolean};
export type CouncilResponse={responses?:CouncilMemberResponse[];gpt?:string;claude?:string;synthesis?:string;status:"deliberating"|"final"};
