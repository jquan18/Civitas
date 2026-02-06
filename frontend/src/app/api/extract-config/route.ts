import { generateObject } from 'ai';
import { getGoogleProvider } from '@/lib/ai/google-provider';
import {
  RentalConfigSchema,
  RentVaultConfigSchema,
  GroupBuyEscrowConfigSchema,
  StableAllowanceTreasuryConfigSchema,
} from '@/lib/ai/schemas';
import type { TimezoneInfo } from '@/hooks/useUserTimezone';
import { getCurrentDateTimeContext, getDateConversionExamples } from '@/lib/ai/temporal-context';

export const runtime = 'edge';

// Map template IDs to their schemas
const schemaMap = {
  'rent-vault': RentVaultConfigSchema,
  'group-buy-escrow': GroupBuyEscrowConfigSchema,
  'stable-allowance-treasury': StableAllowanceTreasuryConfigSchema,
  // Legacy support
  'rental': RentalConfigSchema,
}

// Get extraction prompt based on template
function getExtractionPrompt(templateId: string, timezoneInfo?: TimezoneInfo, walletAddress?: string): string {
  const dateTimeContext = getCurrentDateTimeContext(timezoneInfo);
  const dateExamples = getDateConversionExamples(timezoneInfo);

  switch (templateId) {
    case 'rent-vault':
      return `${dateTimeContext}

Extract Rent Vault configuration from the conversation.

Fields to extract (leave as undefined if not mentioned):
- recipient: Landlord Ethereum address (0x...) - DEFAULT to connected wallet if user is landlord
- rentAmount: Total rent in USDC (as string) - ONLY extract if explicitly mentioned
- dueDate: Due date in ISO 8601 format - ONLY extract if explicitly mentioned
- tenants: Array of tenant addresses - ONLY extract if explicitly mentioned
- shareBps: Array of share basis points - ONLY extract if explicitly mentioned

IMPORTANT USER CONTEXT:
Connected Wallet Address: ${walletAddress || 'Not available'}
- Use this when the user refers to themselves ("me", "myself", "I").

WALLET ADDRESS HANDLING:
- If user indicates they are the landlord/recipient, USE ${walletAddress || 'connected_wallet'}
- DO NOT wait for them to provide their own address manually
- Connected wallet: ${walletAddress || 'Not available'}

CRITICAL DATE HANDLING RULES:
1. Output format MUST be ISO 8601: "YYYY-MM-DDTHH:MM:SS.000Z"
2. If user provides relative dates, calculate the NEXT occurrence as a specific date
3. Use the user's local timezone (provided in context above) for all date calculations
4. NEVER output natural language like "2nd of each month"

${dateExamples}

- shareBps: Array of share basis points - ONLY extract if explicitly mentioned`

    case 'group-buy-escrow':
      return `Extract Group Buy Escrow configuration from the conversation.

<strict_constraints>
- ONLY extract values explicitly stated.
- Do NOT infer funding goals from partial mentions.
- Ensure "expiryDate" is a specific calendar date.
</strict_constraints>

<chain_of_thought>
1. Identify the "Seller" address.
2. Confirm the "Funding Goal".
3. Validate the "Expiry Date".
4. List all "Participants".
</chain_of_thought>

Fields to extract (leave as undefined if not mentioned):
- recipient: Seller Ethereum address (0x...) - ONLY extract if explicitly mentioned
- fundingGoal: Total goal in USDC (as string) - ONLY extract if explicitly mentioned
- expiryDate: Funding deadline (ISO string or timestamp) - ONLY extract if explicitly mentioned
- timelockRefundDelay: Refund delay in seconds (as string) - ONLY extract if explicitly mentioned
- participants: Array of participant addresses - ONLY extract if explicitly mentioned
- shareBps: Array of share basis points - ONLY extract if explicitly mentioned

WALLET ADDRESS HANDLING:
- If user indicates they are a participant ("I'm joining", "I want to contribute"), extract "me" for that participant entry
- If user refers to themselves for any role, extract the literal string "me" (not the wallet address)
- DO NOT substitute wallet addresses - keep "me" as-is for frontend resolution
- Connected wallet: ${walletAddress || 'Not available'}
IMPORTANT USER CONTEXT:
Connected Wallet Address: ${walletAddress || 'Not available'}`

    case 'stable-allowance-treasury':
      return `Extract Stable Allowance Treasury configuration from the conversation.

<strict_constraints>
- Owner and Recipient MUST be different.
- Amount must be fixed per claim.
</strict_constraints>

Fields to extract (leave as undefined if not mentioned):
- owner: Controller Ethereum address (0x...) - ONLY extract if explicitly mentioned
- recipient: Beneficiary Ethereum address (0x...) - ONLY extract if explicitly mentioned
- allowancePerIncrement: USDC per claim (as string) - ONLY extract if explicitly mentioned

WALLET ADDRESS HANDLING:
- If user indicates they are the owner ("I'm the parent", "I'm managing"), extract "me" for owner field
- If user indicates they are the recipient ("I'm the child", "it's my allowance"), extract "me" for recipient field
- Extract the literal string "me" (not the wallet address) for frontend resolution
- DO NOT substitute wallet addresses directly
- Connected wallet: ${walletAddress || 'Not available'}
IMPORTANT USER CONTEXT:
Connected Wallet Address: ${walletAddress || 'Not available'}

IMPORTANT: If the conversation doesn't contain specific values, leave all fields undefined.
Do NOT invent or guess values. Return an empty object if no contract data is available.
Owner and recipient must be different addresses when both are provided.`

    default:
      return `Extract contract configuration from the conversation.

IMPORTANT: Only extract values that are explicitly mentioned in the conversation.
Leave all fields undefined if not mentioned. Do NOT invent or guess values.`
  }
}

export async function POST(req: Request) {
  const { messages, templateId, timezone, walletAddress } = await req.json();

  if (!templateId) {
    return Response.json(
      { error: 'Template ID is required' },
      { status: 400 }
    );
  }

  const schema = schemaMap[templateId as keyof typeof schemaMap];

  if (!schema) {
    return Response.json(
      { error: `Unknown template: ${templateId}` },
      { status: 400 }
    );
  }

  try {
    const extractionPrompt = getExtractionPrompt(templateId, timezone, walletAddress);

    // Get configured provider (local proxy in dev, official API in production)
    const google = getGoogleProvider();

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema,
      prompt: `${extractionPrompt}\n\nConversation:\n${JSON.stringify(messages)}`,
    });

    // Calculate completeness (handle optional fields)
    const requiredFields = Object.keys(schema.shape);
    const filledFields = requiredFields.filter((key) => {
      const value = (object as any)[key];
      if (value === undefined || value === null) return false;
      if (Array.isArray(value)) return value.length > 0;
      return value !== '';
    });

    const completeness = requiredFields.length > 0
      ? (filledFields.length / requiredFields.length) * 100
      : 0;

    return Response.json({
      config: object,
      completeness,
    });
  } catch (error) {
    console.error('Config extraction error:', error);
    // Return empty config instead of 500 error
    return Response.json({
      config: {},
      completeness: 0,
    });
  }
}
