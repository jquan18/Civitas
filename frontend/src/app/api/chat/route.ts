import { streamText } from 'ai';
import { getGoogleProvider } from '@/lib/ai/google-provider';
import { getTemplatePrompt } from '@/lib/ai/prompts';
import type { TimezoneInfo } from '@/hooks/useUserTimezone';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, templateId, timezone, walletAddress } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the appropriate system prompt based on template (with timezone and wallet context)
    const systemPrompt = getTemplatePrompt(
      templateId || null, 
      timezone as TimezoneInfo | undefined,
      walletAddress as string | undefined
    );

    // Get configured provider (local proxy in dev, official API in production)
    const google = getGoogleProvider();

    // Pass messages directly - the AI SDK handles conversion internally
    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: messages as any,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
