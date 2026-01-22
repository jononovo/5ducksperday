import type { SearchPlan, SuperSearchResult, StreamEvent } from './types';
import { SUPER_SEARCH_SYSTEM_PROMPT } from './system-prompt';

interface PerplexityStreamChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export class PerplexityStreamParser {
  private buffer = '';
  private plan: SearchPlan | null = null;
  private results: SuperSearchResult[] = [];

  parseChunk(chunk: string): StreamEvent[] {
    this.buffer += chunk;
    const events: StreamEvent[] = [];

    // Try to extract plan
    if (!this.plan) {
      const planMatch = this.buffer.match(/###PLAN###\s*([\s\S]*?)\s*###END_PLAN###/);
      if (planMatch) {
        try {
          this.plan = JSON.parse(planMatch[1]);
          if (this.plan) {
            events.push({ type: 'plan', data: this.plan });
          }
          this.buffer = this.buffer.replace(planMatch[0], '');
        } catch (e) {
          console.error('[SuperSearch] Failed to parse plan:', e);
        }
      }
    }

    // Try to extract results
    const resultRegex = /###RESULT###\s*([\s\S]*?)\s*###END_RESULT###/g;
    let match;
    while ((match = resultRegex.exec(this.buffer)) !== null) {
      try {
        const result = JSON.parse(match[1]) as SuperSearchResult;
        this.results.push(result);
        events.push({ type: 'result', data: result });
      } catch (e) {
        console.error('[SuperSearch] Failed to parse result:', e);
      }
    }
    this.buffer = this.buffer.replace(resultRegex, '');

    // Extract progress text (anything not in markers)
    const cleanBuffer = this.buffer
      .replace(/###PLAN###[\s\S]*?$/m, '')
      .replace(/###RESULT###[\s\S]*?$/m, '')
      .trim();

    if (cleanBuffer.length > 20 && !cleanBuffer.includes('###')) {
      const lines = cleanBuffer.split('\n').filter(l => l.trim().length > 10);
      for (const line of lines) {
        if (!line.includes('{') && !line.includes('}')) {
          events.push({ type: 'progress', data: line.trim() });
        }
      }
      this.buffer = this.buffer.substring(this.buffer.lastIndexOf('\n') + 1);
    }

    return events;
  }

  getPlan(): SearchPlan | null {
    return this.plan;
  }

  getResults(): SuperSearchResult[] {
    return this.results;
  }
}

export async function* streamSuperSearch(query: string): AsyncGenerator<StreamEvent> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    yield { type: 'error', data: 'Perplexity API key is not configured' };
    return;
  }

  console.log(`[SuperSearch] Starting streaming search for: "${query}"`);

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: SUPER_SEARCH_SYSTEM_PROMPT },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SuperSearch] API error: ${response.status} - ${errorText}`);
      yield { type: 'error', data: `API error: ${response.status}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', data: 'No response stream available' };
      return;
    }

    const decoder = new TextDecoder();
    const parser = new PerplexityStreamParser();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as PerplexityStreamChunk;
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              const events = parser.parseChunk(content);
              for (const event of events) {
                yield event;
              }
            }
          } catch (e) {
            // Skip non-JSON lines
          }
        }
      }
    }

    // DEBUG: Log the full content received from Perplexity
    console.log(`[SuperSearch] ========== RAW RESPONSE START ==========`);
    console.log(fullContent);
    console.log(`[SuperSearch] ========== RAW RESPONSE END ==========`);
    console.log(`[SuperSearch] Stream complete. Found ${parser.getResults().length} results`);
    console.log(`[SuperSearch] Plan parsed:`, parser.getPlan());
    yield { type: 'complete', data: { totalResults: parser.getResults().length } };

  } catch (error) {
    console.error('[SuperSearch] Stream error:', error);
    yield { type: 'error', data: error instanceof Error ? error.message : 'Unknown error' };
  }
}
