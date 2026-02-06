import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { getGoogleProvider } from '@/lib/ai/google-provider';
import { getTemplatePrompt } from '@/lib/ai/prompts';
import { civitasTools } from '@/lib/ai/tools';
import type { TimezoneInfo } from '@/hooks/useUserTimezone';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, templateId, timezone, walletAddress, chainId } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the appropriate system prompt based on template (with timezone, wallet, and network context)
    const systemPrompt = getTemplatePrompt(
      templateId || null,
      timezone as TimezoneInfo | undefined,
      walletAddress as string | undefined,
      chainId as number | undefined
    );

    // DEBUG: Trace wallet address
    console.log('[API] Chat Request Body:', {
      templateId,
      walletAddress,
      hasWalletAddress: !!walletAddress
    });
    console.log('[API] System Prompt has wallet:', systemPrompt.includes('Connected Wallet Address:'));
    if (walletAddress) {
      console.log('[API] System Prompt includes explicit address:', systemPrompt.includes(walletAddress));
    }

    // Get configured provider (local proxy in dev, official API in production)
    const google = getGoogleProvider();

    // Convert UI messages to model messages
    // Note: In ai@6.0.72, this is async and must be awaited
    // Pass tools to handle multi-modal tool responses properly
    const modelMessages = await convertToModelMessages(messages, {
      tools: civitasTools,
    });

    // Pass converted messages to streamText
    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: modelMessages,
      tools: civitasTools,
      stopWhen: stepCountIs(5),
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
