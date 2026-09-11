import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { getEnv } from '@config/env';

export interface LlmJsonCompletionParams {
  /** System prompt — task framing, output-format instructions. */
  system: string;
  /** The user-turn prompt — the actual data (resume/JD/transcript/etc). */
  prompt: string;
  maxTokens?: number;
}

/**
 * Thin, generic "call the LLM with a prompt, get structured JSON back" wrapper —
 * config-driven provider so it's swappable (`LLM_PROVIDER`/`LLM_API_KEY`/`LLM_MODEL`
 * in env). Every call site (question generation, email drafting, interview evaluation)
 * goes through `completeJson`.
 *
 * `LLM_PROVIDER=mock` (no API key needed) makes every call site return its own
 * deterministic canned response instead of calling out to a real model — useful for
 * local development and for exercising the rest of the pipeline (prompt building,
 * response validation, persistence, BullMQ retry/idempotency) without depending on a
 * live key. `LLM_PROVIDER=anthropic` (the default) makes a real call.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private client?: Anthropic;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = getEnv('LLM_API_KEY', '');
      if (!apiKey) {
        throw new Error(
          'LLM_API_KEY is not set. Set it in .env to make real LLM calls, or set ' +
            'LLM_PROVIDER=mock for local development without one.',
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * @param mock Deterministic canned response for this call site, used only when
   *   `LLM_PROVIDER=mock`. Each caller supplies its own — a generic mock couldn't
   *   produce data shaped like a real question list vs. a real evaluation result.
   */
  async completeJson<T>(params: LlmJsonCompletionParams, mock: () => T): Promise<T> {
    if (getEnv('LLM_PROVIDER', 'anthropic') === 'mock') {
      this.logger.warn('LLM_PROVIDER=mock — returning a canned response, not calling a real LLM');
      return mock();
    }

    const client = this.getClient();
    const model = getEnv('LLM_MODEL', 'claude-sonnet-5');
    const response = await client.messages.create({
      model,
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      messages: [{ role: 'user', content: params.prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    return this.parseJson<T>(text);
  }

  private parseJson<T>(text: string): T {
    // Models often wrap JSON in a ```json fence even when asked not to — strip it.
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch (err) {
      throw new Error(
        `LLM response was not valid JSON (${(err as Error).message}):\n${text.slice(0, 2000)}`,
      );
    }
  }
}
