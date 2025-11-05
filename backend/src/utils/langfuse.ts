import { Langfuse } from 'langfuse';

/**
 * Langfuse client for AI observability
 * Optional: Only enabled if LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are set
 */

let langfuseClient: Langfuse | null = null;

// Initialize Langfuse only if keys are provided
if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) {
  langfuseClient = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
  });
  console.log('✅ Langfuse initialized for AI observability');
} else {
  console.log('ℹ️  Langfuse disabled (no API keys provided)');
}

export const langfuse = langfuseClient;

/**
 * Helper to check if Langfuse is enabled
 */
export function isLangfuseEnabled(): boolean {
  return langfuseClient !== null;
}

/**
 * Trace a Gemini API call with Langfuse
 */
export function traceGeminiCall(params: {
  name: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}) {
  if (!langfuseClient) return null;

  return langfuseClient.trace({
    name: params.name,
    sessionId: params.sessionId,
    userId: params.userId,
    metadata: params.metadata,
  });
}

/**
 * Log a generation event
 */
export function logGeneration(params: {
  trace: any;
  name: string;
  model: string;
  prompt: string;
  completion: string;
  startTime: number;
  endTime: number;
  metadata?: Record<string, any>;
}) {
  if (!params.trace) return;

  params.trace.generation({
    name: params.name,
    model: params.model,
    modelParameters: {
      temperature: params.metadata?.temperature,
      maxTokens: params.metadata?.maxTokens,
    },
    input: params.prompt,
    output: params.completion,
    startTime: new Date(params.startTime),
    endTime: new Date(params.endTime),
    metadata: params.metadata,
  });
}
