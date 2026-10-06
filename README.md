# Council AI - V1

Council is a mobile-first personal AI deliberation workspace. It gives independent model positions, lets the user challenge either model or both, accepts new evidence, and only enters a final round when the user requests it.

## V1 implemented
- Next.js + TypeScript mobile-first Council Room
- OpenAI Responses API adapter
- Anthropic Messages API adapter
- Parallel independent model calls
- Challenge GPT / Challenge Claude / Challenge Both modes
- User-controlled final round
- Memory interface ready for persistent storage and retrieval
- Media evidence interface ready for images, documents, audio and video
- API keys remain server-side

## Run locally
1. Copy .env.example to .env.local
2. Add OPENAI_API_KEY and ANTHROPIC_API_KEY
3. Run npm install
4. Run npm run dev

## Next build
Authentication, database-backed projects/memory, real file uploads, audio transcription, image generation/editing, evidence citations, live voice, and provider-neutral video generation.

## Product principle
The models advise. The human decides.
