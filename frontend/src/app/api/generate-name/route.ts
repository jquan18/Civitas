import { generateObject } from 'ai';
import { getGoogleProvider } from '@/lib/ai/google-provider';
import { NameSuggestionSchema } from '@/lib/ai/schemas';
import { getNameGenerationPrompt } from '@/lib/ai/prompts';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { templateId, config, conversationContext } = await req.json() as {
    templateId?: string;
    config: Record<string, any>;
    conversationContext?: string;
  };

  try {
    const basePrompt = getNameGenerationPrompt(templateId || 'rent-vault');

    // Build template-specific detail section
    let details = '';
    const tid = templateId || 'rent-vault';

    if (tid === 'rent-vault' || tid === 'RentVault') {
      details = `Contract Details:
- Tenant count: ${config.tenants?.length || 1}
- Rent Amount: ${config.rentAmount || config.monthlyAmount || 'unknown'} USDC
- Duration: ${config.totalMonths || 'ongoing'}`;
    } else if (tid === 'group-buy-escrow' || tid === 'GroupBuyEscrow') {
      details = `Contract Details:
- Funding Goal: ${config.fundingGoal || 'unknown'} USDC
- Participant count: ${config.participants?.length || 'unknown'}`;
    } else if (tid === 'stable-allowance-treasury' || tid === 'StableAllowanceTreasury') {
      details = `Contract Details:
- Allowance per increment: ${config.allowancePerIncrement || 'unknown'} USDC`;
    } else {
      details = `Contract Details:\n${JSON.stringify(config, null, 2)}`;
    }

    const prompt = `${basePrompt}

${details}

${conversationContext ? `Additional Context:\n${conversationContext}` : ''}

Generate a memorable, semantic subdomain name.`;

    const google = getGoogleProvider();

    const { object } = await generateObject({
      model: google('gemini-3-flash-preview'),
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
