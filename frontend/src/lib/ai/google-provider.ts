import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Returns configured Google Generative AI provider.
 * - Development: Uses local proxy at GEMINI_LOCAL_BASE_URL
 * - Production: Uses official Google Generative AI API
 */
export function getGoogleProvider() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    const localApiKey = process.env.GEMINI_LOCAL_API_KEY;
    const localBaseUrl = process.env.GEMINI_LOCAL_BASE_URL;
    
    if (!localApiKey || !localBaseUrl) {
      console.warn(
        'Local Gemini proxy not configured. Falling back to official API. ' +
        'Set GEMINI_LOCAL_API_KEY and GEMINI_LOCAL_BASE_URL in .env'
      );
      // Fall back to official API
      return createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
    }
    
    console.log(`[DEV] Using local Gemini proxy: ${localBaseUrl}`);
    return createGoogleGenerativeAI({
      apiKey: localApiKey,
      baseURL: localBaseUrl,
    });
  }
  
  // Production: Use official API
  return createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}
