export type CouncilMode="ask"|"challenge-gpt"|"challenge-claude"|"challenge-both"|"final";
export type CouncilRequest={prompt:string;mode:CouncilMode;history?:{role:"user"|"assistant";content:string}[]};
export type CouncilResponse={gpt?:string;claude?:string;synthesis?:string;status:"deliberating"|"final"};
