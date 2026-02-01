import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { RENTAL_ASSISTANT_PROMPT } from '@/lib/ai/prompts';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-2.0-flash-exp'),
    system: RENTAL_ASSISTANT_PROMPT,
    messages,
  });

  return result.toDataStreamResponse();
}
