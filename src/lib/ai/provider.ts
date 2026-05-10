// ─── Multi-Model AI Provider Layer ──────────────────────────────────────────
// Production implementations for Anthropic Claude and OpenAI via raw fetch.
// No SDK dependencies — all communication is via the public HTTP APIs.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  systemPrompt?: string;
  /** When true, request JSON output */
  jsonMode?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
  toolCalls: ToolCall[];
  stopReason: string;
}

// ─── Provider interface ─────────────────────────────────────────────────────

export interface AIProvider {
  id: string;
  name: string;
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(messages: Message[], options?: ChatOptions): AsyncGenerator<string>;
  embedding(text: string): Promise<number[]>;
}

// ─── Claude Provider ────────────────────────────────────────────────────────

export class ClaudeProvider implements AIProvider {
  readonly id = 'claude';
  readonly name = 'Anthropic Claude';

  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.defaultModel = defaultModel || 'claude-sonnet-4-20250514';
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

    const model = options.model || this.defaultModel;
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature ?? 0.7;

    // Separate system prompt from messages
    const systemPrompt = options.systemPrompt ||
      messages.find(m => m.role === 'system')?.content || undefined;

    // Convert messages to Anthropic format (no system role in messages array)
    const anthropicMessages = this.toAnthropicMessages(messages);

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: anthropicMessages,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    // Parse content blocks
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of data.content || []) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
      toolCalls,
      stopReason: data.stop_reason || 'end_turn',
    };
  }

  async *chatStream(messages: Message[], options: ChatOptions = {}): AsyncGenerator<string> {
    if (!this.apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

    const model = options.model || this.defaultModel;
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature ?? 0.7;

    const systemPrompt = options.systemPrompt ||
      messages.find(m => m.role === 'system')?.content || undefined;

    const anthropicMessages = this.toAnthropicMessages(messages);

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: anthropicMessages,
      stream: true,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic streaming error (${response.status}): ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body for streaming');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') return;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                yield event.delta.text;
              }
            } catch {
              // Skip malformed JSON in SSE
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embedding(text: string): Promise<number[]> {
    // Anthropic does not have a native embedding endpoint.
    // Fall back to a simple hash-based embedding for compatibility.
    // In production, use the OpenAI embedding or a dedicated provider.
    return simpleHashEmbedding(text, 1536);
  }

  private toAnthropicMessages(messages: Message[]): { role: string; content: string | object[] }[] {
    const result: { role: string; content: string | object[] }[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue; // handled separately

      if (msg.role === 'tool') {
        // Anthropic expects tool results as user messages with tool_result content blocks
        result.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.toolCallId || '',
            content: msg.content,
          }],
        });
      } else {
        result.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    return result;
  }
}

// ─── OpenAI Provider ────────────────────────────────────────────────────────

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';

  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.defaultModel = defaultModel || 'gpt-4o';
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY is not configured');

    const model = options.model || this.defaultModel;
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature ?? 0.7;

    const openaiMessages = this.toOpenAIMessages(messages, options.systemPrompt);

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: openaiMessages,
    };

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    const toolCalls: ToolCall[] = (message?.tool_calls || []).map(
      (tc: { id: string; function: { name: string; arguments: string } }) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      })
    );

    return {
      content: message?.content || '',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
      toolCalls,
      stopReason: choice?.finish_reason || 'stop',
    };
  }

  async *chatStream(messages: Message[], options: ChatOptions = {}): AsyncGenerator<string> {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY is not configured');

    const model = options.model || this.defaultModel;
    const maxTokens = options.maxTokens || 4096;
    const temperature = options.temperature ?? 0.7;

    const openaiMessages = this.toOpenAIMessages(messages, options.systemPrompt);

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: openaiMessages,
      stream: true,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI streaming error (${response.status}): ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body for streaming');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') return;
            try {
              const event = JSON.parse(jsonStr);
              const delta = event.choices?.[0]?.delta?.content;
              if (delta) yield delta;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embedding(text: string): Promise<number[]> {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY is not configured');

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Embedding error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || [];
  }

  private toOpenAIMessages(
    messages: Message[],
    systemPrompt?: string,
  ): { role: string; content: string; tool_call_id?: string; name?: string }[] {
    const result: { role: string; content: string; tool_call_id?: string; name?: string }[] = [];

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'tool') {
        result.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId,
          name: msg.name,
        });
      } else {
        result.push({ role: msg.role, content: msg.content });
      }
    }

    return result;
  }
}

// ─── Provider Registry (Singleton) ──────────────────────────────────────────

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, AIProvider> = new Map();
  private fallbackOrder: string[] = [];

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
      // Auto-register available providers
      ProviderRegistry.instance.autoRegister();
    }
    return ProviderRegistry.instance;
  }

  private autoRegister(): void {
    // Register Claude if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.register(new ClaudeProvider(), true);
    }
    // Register OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.register(new OpenAIProvider(), true);
    }
  }

  register(provider: AIProvider, addToFallback = true): void {
    this.providers.set(provider.id, provider);
    if (addToFallback && !this.fallbackOrder.includes(provider.id)) {
      this.fallbackOrder.push(provider.id);
    }
  }

  get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  /** Returns the primary provider (first in fallback chain) */
  primary(): AIProvider {
    for (const id of this.fallbackOrder) {
      const p = this.providers.get(id);
      if (p) return p;
    }
    throw new Error(
      'No AI providers configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variables.'
    );
  }

  /** Execute chat with automatic fallback across providers */
  async chatWithFallback(
    messages: Message[],
    options?: ChatOptions,
  ): Promise<ChatResponse & { providerId: string }> {
    const errors: string[] = [];

    for (const id of this.fallbackOrder) {
      const provider = this.providers.get(id);
      if (!provider) continue;

      try {
        const result = await provider.chat(messages, options);
        return { ...result, providerId: id };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${id}: ${msg}`);
      }
    }

    throw new Error(
      `All AI providers failed:\n${errors.join('\n')}`
    );
  }

  /** Execute streaming chat with automatic fallback */
  async *chatStreamWithFallback(
    messages: Message[],
    options?: ChatOptions,
  ): AsyncGenerator<string> {
    const errors: string[] = [];

    for (const id of this.fallbackOrder) {
      const provider = this.providers.get(id);
      if (!provider) continue;

      try {
        yield* provider.chatStream(messages, options);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${id}: ${msg}`);
      }
    }

    throw new Error(
      `All AI streaming providers failed:\n${errors.join('\n')}`
    );
  }

  /** Get embedding with automatic fallback */
  async embeddingWithFallback(text: string): Promise<number[]> {
    const errors: string[] = [];

    for (const id of this.fallbackOrder) {
      const provider = this.providers.get(id);
      if (!provider) continue;

      try {
        return await provider.embedding(text);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${id}: ${msg}`);
      }
    }

    throw new Error(
      `All embedding providers failed:\n${errors.join('\n')}`
    );
  }

  listProviders(): { id: string; name: string }[] {
    return Array.from(this.providers.values()).map(p => ({ id: p.id, name: p.name }));
  }
}

// ─── Utility: simple deterministic embedding fallback ───────────────────────

function simpleHashEmbedding(text: string, dimensions: number): number[] {
  const embedding = new Array<number>(dimensions).fill(0);
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = (i * 31 + charCode * 17) % dimensions;
    embedding[idx] += (charCode - 96) / 26;
    // Mix nearby dimensions for smoother distribution
    const next = (idx + 1) % dimensions;
    embedding[next] += (charCode - 96) / 52;
  }

  // L2-normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}
