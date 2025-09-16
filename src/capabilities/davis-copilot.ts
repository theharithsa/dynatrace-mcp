/**
 * Davis CoPilot API Integration
 *
 * This module provides access to Davis CoPilot AI capabilities including:
 * - Natural Language to DQL conversion
 * - DQL explanation in plain English
 * - AI-powered conversation assistance
 * - Feedback submission for continuous improvement
 *
 * Note: While Davis CoPilot AI is generally available (GA),
 * the Davis CoPilot APIs are currently in preview.
 * For more information: https://dt-url.net/copilot-community
 *
 * DQL (Dynatrace Query Language) is the most powerful way to query any data
 * in Dynatrace, including problem events, security issues, logs, metrics, and spans.
 */

import { HttpClient } from '@dynatrace-sdk/http-client';
import {
  PublicClient,
  Nl2DqlResponse,
  Dql2NlResponse,
  ConversationResponse,
  ConversationContext,
  State,
} from '@dynatrace-sdk/client-davis-copilot';

// Re-export types that are used externally
export type { Dql2NlResponse };

/**
 * Generate DQL from natural language
 * Converts plain English descriptions into powerful Dynatrace Query Language (DQL) statements.
 * DQL is the most powerful way to query any data in Dynatrace, including problem events,
 * security issues, logs, metrics, spans, and custom data.
 */
export const generateDqlFromNaturalLanguage = async (dtClient: HttpClient, text: string): Promise<Nl2DqlResponse> => {
  const client = new PublicClient(dtClient);

  return await client.nl2dql({
    body: { text },
  });
};

/**
 * Explain DQL in natural language
 * Provides plain English explanations of complex DQL queries.
 * Helps users understand what powerful DQL statements do, including
 * queries for problem events, security issues, and performance metrics.
 */
export const explainDqlInNaturalLanguage = async (dtClient: HttpClient, dql: string): Promise<Dql2NlResponse> => {
  const client = new PublicClient(dtClient);

  return await client.dql2nl({
    body: { dql },
  });
};

export const chatWithDavisCopilot = async (
  dtClient: HttpClient,
  text: string,
  context?: ConversationContext[],
  annotations?: Record<string, string>,
  state?: State,
): Promise<ConversationResponse> => {
  const client = new PublicClient(dtClient);

  const response = await client.recommenderConversation({
    body: {
      text,
      context,
      annotations,
      state,
    },
  });

  // Handle both streaming and non-streaming responses
  // If it's an array (streaming), we need to extract the final response
  // If it's already a ConversationResponse, return it directly
  if (Array.isArray(response)) {
    // For streaming responses, find the end event with the final response
    const endEvent = response.find((event) => event.event === 'end') as any;
    if (endEvent?.data) {
      return {
        text: endEvent.data.answer || '',
        messageToken: '', // Will need to get from start event
        status: 'SUCCESSFUL',
        state: endEvent.data.state || {},
        metadata: {
          sources: endEvent.data.sources || [],
        },
      };
    }

    // Fallback: try to construct response from available events
    const startEvent = response.find((event) => event.event === 'start') as any;
    const messageToken = startEvent?.data?.messageToken || '';

    const contentEvents = response.filter((event) => event.event === 'content');
    const text = contentEvents.map((event: any) => event.data?.text || '').join('');

    return {
      text,
      messageToken,
      status: 'SUCCESSFUL',
      state: {},
      metadata: { sources: [] },
    };
  }

  // Direct ConversationResponse
  return response;
};
