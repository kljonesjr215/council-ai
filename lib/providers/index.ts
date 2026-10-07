import {CouncilProvider,ProviderId} from "./types"; import {openAIProvider} from "./openai"; import {anthropicProvider} from "./anthropic";
const providers:Partial<Record<ProviderId,CouncilProvider>>={openai:openAIProvider,anthropic:anthropicProvider};
export function getProvider(id:ProviderId){return providers[id]}
export function providerIsConfigured(id:ProviderId){return Boolean(providers[id]?.isConfigured())}
