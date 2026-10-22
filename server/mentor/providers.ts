import Anthropic from '@anthropic-ai/sdk';
import { evaluateExpression } from '../../shared/mentor/calculator.js';
import { demoMentorReply } from '../../shared/mentor/demoMentor.js';
import type { MentorMessage, MentorProviderName, MentorRequest } from '../../shared/mentor/types.js';
import type { MentorServerConfig } from './config.js';
import { buildSystemPrompt } from './prompt.js';

/** Details about a provider call, for diagnostics and cost monitoring (never contains conversation text). */
export interface ProviderMeta {
  model?: string;
  stopReason?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  /** Number of calculate tool calls the model made. */
  toolCalls?: number;
  /** Number of API requests made for this reply. */
  apiCalls?: number;
}

/** Provider adapter interface. Add new AI providers by implementing this. */
export interface MentorProvider {
  readonly name: MentorProviderName;
  readonly model?: string;
  /** Returns the reply text, or null when the provider declined or produced no answer. */
  reply(request: MentorRequest, signal: AbortSignal): Promise<{ text: string | null; followUps?: string[]; meta?: ProviderMeta }>;
}

export class DemoMentorProvider implements MentorProvider {
  readonly name = 'demo' as const;
  async reply(request: MentorRequest) {
    const r = demoMentorReply(request);
    return { text: r.reply, followUps: r.followUps };
  }
}

/** Exact calculator exposed to the model. Results come from shared/mentor/calculator.ts, never from the model. */
export const CALCULATOR_TOOL: Anthropic.Beta.BetaTool = {
  name: 'calculate',
  description:
    'Exact calculator for arithmetic with whole numbers, decimals, fractions written a/b, percentages (20%), "of" (3/4 of 12), + - * / and brackets. Use it for every number you state that is not already given in the verified calculations or facts. Returns the exact result; fractions are simplified and a decimal is added when useful.',
  input_schema: {
    type: 'object',
    properties: { expression: { type: 'string', description: 'One arithmetic expression, for example "3/4 of 12" or "(18 - 4) / 2".' } },
    required: ['expression'],
    additionalProperties: false,
  },
  strict: true,
};

/** Tool rounds allowed before the model must answer in text. */
export const MAX_TOOL_ROUNDS = 2;

export function runCalculatorTool(input: unknown): { content: string; isError: boolean } {
  const expression = typeof input === 'object' && input !== null ? (input as { expression?: unknown }).expression : undefined;
  const result = evaluateExpression(expression);
  return result.ok ? { content: `${result.expression} = ${result.result}`, isError: false } : { content: result.error, isError: true };
}

/** The parts of the Anthropic client the mentor uses. `models` is optional so tests can pass a minimal fake. */
type ClaudeClient = Pick<Anthropic, 'beta'> & { models?: Pick<Anthropic['models'], 'retrieve'> };

/** Claude (Anthropic) provider. The API key stays on the server. */
export class ClaudeMentorProvider implements MentorProvider {
  readonly name = 'claude' as const;
  readonly model: string;
  private readonly client: ClaudeClient;
  private modelReady?: Promise<void>;

  constructor(
    private readonly config: Pick<MentorServerConfig, 'apiKey' | 'model' | 'effort' | 'timeoutMs' | 'maxTokens'>,
    client?: ClaudeClient,
  ) {
    this.model = config.model;
    this.client = client ?? new Anthropic({ apiKey: config.apiKey, maxRetries: 1, timeout: config.timeoutMs });
  }

  /**
   * Confirms once, before the first answer, that the configured model is
   * available to this API key. A failed check is retried on the next request.
   */
  private ensureModel(): Promise<void> {
    if (!this.client.models?.retrieve) return Promise.resolve();
    this.modelReady ??= this.client.models.retrieve(this.model).then(
      () => undefined,
      (err: unknown) => {
        this.modelReady = undefined;
        const status = (err as { status?: number }).status;
        const unavailable = new Error(`Configured model ${this.model} is not available to this API key${status ? ` (HTTP ${status})` : ''}`, { cause: err });
        // The handler logs the error name only, so name it clearly.
        unavailable.name = 'ModelUnavailableError';
        throw unavailable;
      },
    );
    return this.modelReady;
  }

  async reply(request: MentorRequest, signal: AbortSignal) {
    await this.ensureModel();
    const { staticPart, dynamicPart } = buildSystemPrompt(request);
    // The tool list and the static prompt come first and never change, so they form the cached prefix.
    const system: Anthropic.Beta.BetaTextBlockParam[] = [
      { type: 'text', text: staticPart, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: dynamicPart },
    ];
    const messages: Anthropic.Beta.BetaMessageParam[] = toClaudeMessages(request.messages);
    const meta: ProviderMeta = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, toolCalls: 0, apiCalls: 0 };

    for (let round = 0; ; round += 1) {
      const lastRound = round >= MAX_TOOL_ROUNDS;
      const response = await this.client.beta.messages.create(
        {
          model: this.config.model,
          // Thinking is adaptive on current models; this caps thinking + answer for cost, it is not a length target.
          max_tokens: this.config.maxTokens,
          system,
          tools: [CALCULATOR_TOOL],
          // After the allowed tool rounds the model must answer in text.
          ...(lastRound ? { tool_choice: { type: 'none' as const } } : {}),
          messages,
          output_config: { effort: this.config.effort },
          // If a safety classifier declines, let the API retry on its recommended fallback model.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        },
        { signal, timeout: this.config.timeoutMs },
      );
      meta.apiCalls! += 1;
      meta.model = response.model;
      meta.stopReason = response.stop_reason;
      meta.inputTokens! += response.usage?.input_tokens ?? 0;
      meta.outputTokens! += response.usage?.output_tokens ?? 0;
      meta.cacheReadTokens! += response.usage?.cache_read_input_tokens ?? 0;
      meta.cacheWriteTokens! += response.usage?.cache_creation_input_tokens ?? 0;

      if (response.stop_reason === 'refusal') return { text: null, meta };

      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      if (response.stop_reason === 'tool_use' && toolUses.length > 0 && !lastRound) {
        // Pass the whole assistant turn back unchanged (it may contain thinking blocks).
        messages.push({ role: 'assistant', content: response.content });
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = toolUses.map((use) => {
          meta.toolCalls! += 1;
          const out = use.name === 'calculate' ? runCalculatorTool(use.input) : { content: `Unknown tool: ${use.name}`, isError: true };
          return { type: 'tool_result', tool_use_id: use.id, content: out.content, ...(out.isError ? { is_error: true } : {}) };
        });
        messages.push({ role: 'user', content: results });
        continue;
      }

      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return { text: text || null, meta };
    }
  }
}

/** Maps the chat transcript to Claude messages. The conversation must start with a user turn. */
export function toClaudeMessages(messages: MentorMessage[]): Anthropic.Beta.BetaMessageParam[] {
  const firstLearner = messages.findIndex((m) => m.role === 'learner');
  return messages.slice(Math.max(0, firstLearner)).map((m) => ({
    role: m.role === 'learner' ? ('user' as const) : ('assistant' as const),
    content: m.text,
  }));
}

export function createProvider(config: MentorServerConfig): MentorProvider {
  if (config.provider === 'claude' && config.apiKey) return new ClaudeMentorProvider(config);
  return new DemoMentorProvider();
}
