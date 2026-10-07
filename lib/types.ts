import type {CouncilMember} from "./providers/types";
export type CouncilMode="ask"|"challenge-member"|"challenge-council"|"final";
export type CouncilRequest={prompt:string;mode:CouncilMode;targetMemberId?:string;members?:CouncilMember[];history?:{role:"user"|"assistant";content:string}[]};
export type CouncilMemberResponse={member:CouncilMember;text:string;ok:boolean};
export type CouncilResponse={responses?:CouncilMemberResponse[];status:"deliberating"|"final"};
