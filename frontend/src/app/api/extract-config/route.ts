import { generateObject } from 'ai';
import { getGoogleProvider } from '@/lib/ai/google-provider';
import { 
  RentalConfigSchema,
  RentVaultConfigSchema,
  GroupBuyEscrowConfigSchema,
  StableAllowanceTreasuryConfigSchema,
} from '@/lib/ai/schemas';

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
function getExtractionPrompt(templateId: string): string {
  switch (templateId) {
    case 'rent-vault':
      return `Extract Rent Vault configuration from the conversation.

Fields to extract (leave as undefined if not mentioned):
- recipient: Landlord Ethereum address (0x...) - ONLY extract if explicitly mentioned
- rentAmount: Total rent in USDC (as string) - ONLY extract if explicitly mentioned
- dueDate: Due date (ISO string or timestamp) - ONLY extract if explicitly mentioned
- tenants: Array of tenant addresses - ONLY extract if explicitly mentioned
- shareBps: Array of share basis points - ONLY extract if explicitly mentioned

IMPORTANT: If the conversation doesn't contain specific values, leave all fields undefined. 
Do NOT invent or guess values. Return an empty object if no contract data is available.`

    case 'group-buy-escrow':
      return `Extract Group Buy Escrow configuration from the conversation.

Fields to extract (leave as undefined if not mentioned):
- recipient: Seller Ethereum address (0x...) - ONLY extract if explicitly mentioned
- fundingGoal: Total goal in USDC (as string) - ONLY extract if explicitly mentioned
- expiryDate: Funding deadline (ISO string or timestamp) - ONLY extract if explicitly mentioned
- timelockRefundDelay: Refund delay in seconds (as string) - ONLY extract if explicitly mentioned
- participants: Array of participant addresses - ONLY extract if explicitly mentioned
- shareBps: Array of share basis points - ONLY extract if explicitly mentioned

IMPORTANT: If the conversation doesn't contain specific values, leave all fields undefined. 
Do NOT invent or guess values. Return an empty object if no contract data is available.`

    case 'stable-allowance-treasury':
      return `Extract Stable Allowance Treasury configuration from the conversation.

Fields to extract (leave as undefined if not mentioned):
- owner: Controller Ethereum address (0x...) - ONLY extract if explicitly mentioned
- recipient: Beneficiary Ethereum address (0x...) - ONLY extract if explicitly mentioned
- allowancePerIncrement: USDC per claim (as string) - ONLY extract if explicitly mentioned

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
  const { messages, templateId } = await req.json();

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
    const extractionPrompt = getExtractionPrompt(templateId);
    
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
