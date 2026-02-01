import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { NameSuggestionSchema } from '@/lib/ai/schemas';
import { NAME_GENERATION_PROMPT } from '@/lib/ai/prompts';
import type { RentalConfig } from '@/lib/ai/schemas';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { config, conversationContext } = await req.json() as {
    config: RentalConfig;
    conversationContext?: string;
  };

  try {
    const prompt = `${NAME_GENERATION_PROMPT}

Rental Details:
- Tenant: ${config.tenant}
- Monthly Amount: ${config.monthlyAmount} USDC
- Duration: ${config.totalMonths} months

${conversationContext ? `Additional Context:\n${conversationContext}` : ''}

Generate a memorable, semantic subdomain name.`;

    const { object } = await generateObject({
      model: google('gemini-2.0-flash-exp'),
      schema: NameSuggestionSchema,
      prompt,
    });

    return Response.json(object);
  } catch (error) {
    console.error('Name generation error:', error);
    return Response.json(
      { error: 'Failed to generate name' },
      { status: 500 }
    );
  }
}
