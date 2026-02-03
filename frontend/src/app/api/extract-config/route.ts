import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { RentalConfigSchema } from '@/lib/ai/schemas';
import { CONFIG_EXTRACTION_PROMPT } from '@/lib/ai/prompts';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  try {
    const { object } = await generateObject({
      model: google('gemini-3-flash-preview'),
      schema: RentalConfigSchema,
      prompt: `${CONFIG_EXTRACTION_PROMPT}\n\nConversation:\n${JSON.stringify(messages)}`,
    });

    return Response.json(object);
  } catch (error) {
    console.error('Config extraction error:', error);
    return Response.json(
      { error: 'Failed to extract configuration' },
      { status: 500 }
    );
  }
}
