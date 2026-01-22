import Anthropic from '@anthropic-ai/sdk';
import type { SearchPlan, TableRow, SuperSearchTableResult, StreamEvent, SuperSearchVariant } from '../shared/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function perplexitySearch(query: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  console.log('[Search1] Perplexity search:', query);

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'user', content: query }
      ],
      temperature: 0.1,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  console.log('[Search1] Perplexity response length:', content.length);
  return content;
}

async function claudeAnalyze(query: string, perplexityResults: string): Promise<{ plan: SearchPlan; entities: string[] }> {
  console.log('[Search1] Claude analyzing results...');

  const systemPrompt = `You are a research assistant that extracts structured data from search results.

Given a user's query and raw search results, you must:
1. Identify the key entities (companies, organizations, products, etc.) mentioned
2. Determine what custom data columns would be most valuable for comparing these entities
3. Create a search plan

Respond with JSON only:
{
  "plan": {
    "targetCount": <number 5-20>,
    "columns": [
      {"key": "column_key", "label": "Column Label", "description": "What this column measures"}
    ],
    "searchStrategy": "Brief explanation of approach",
    "reasoning": "Why these columns were chosen"
  },
  "entities": ["Entity Name 1", "Entity Name 2", ...]
}

Choose columns that:
- Are directly relevant to the user's query intent
- Can be researched and compared across entities
- Would enable meaningful comparison or analysis`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `User Query: "${query}"

Raw Search Results:
${perplexityResults}

Extract entities and create a research plan.`
      }
    ]
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  console.log('[Search1] Claude response:', responseText.substring(0, 500));

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    plan: parsed.plan,
    entities: parsed.entities || []
  };
}

async function claudeEnrichEntity(
  entity: string,
  query: string,
  columns: { key: string; label: string }[],
  perplexityData: string
): Promise<TableRow> {
  const columnsList = columns.map(c => `- ${c.key}: ${c.label}`).join('\n');

  const systemPrompt = `You extract structured data from research results.

Given entity research data, extract values for specific columns.
Return JSON only:
{
  "name": "Entity Name",
  "website": "https://...",
  "description": "Brief description",
  "customFields": {
    "column_key": "value or null if unknown"
  }
}

Be accurate. Use null for unknown values. Do not fabricate data.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Entity: "${entity}"
Original Query Context: "${query}"

Columns to extract:
${columnsList}

Research Data:
${perplexityData}

Extract structured data for this entity.`
      }
    ]
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      name: entity,
      customFields: {}
    };
  }

  return JSON.parse(jsonMatch[0]);
}

export const search1Variant: SuperSearchVariant = {
  name: 'Super Search v1',
  description: 'Perplexity explore → Claude analyze → Perplexity enrich',

  async execute(query: string, onEvent: (event: StreamEvent) => void): Promise<SuperSearchTableResult> {
    try {
      onEvent({ type: 'status', data: 'Searching the web for relevant information...' });

      const exploratoryResults = await perplexitySearch(
        `Find companies, organizations, or entities relevant to: ${query}. Include specific names, details, and any available data points.`
      );

      onEvent({ type: 'status', data: 'Analyzing results and planning research...' });

      const { plan, entities } = await claudeAnalyze(query, exploratoryResults);
      console.log('[Search1] Plan:', plan);
      console.log('[Search1] Entities found:', entities);

      onEvent({ type: 'plan', data: plan });

      const limitedEntities = entities.slice(0, plan.targetCount);
      const rows: TableRow[] = [];

      for (let i = 0; i < limitedEntities.length; i++) {
        const entity = limitedEntities[i];
        onEvent({ type: 'status', data: `Researching ${entity} (${i + 1}/${limitedEntities.length})...` });

        try {
          const columnQueries = plan.columns.map(c => c.label).join(', ');
          const enrichmentQuery = `${entity}: ${columnQueries} related to ${query}`;
          const enrichmentData = await perplexitySearch(enrichmentQuery);

          const row = await claudeEnrichEntity(entity, query, plan.columns, enrichmentData);
          rows.push(row);
          onEvent({ type: 'row', data: row });
        } catch (err) {
          console.error(`[Search1] Error enriching ${entity}:`, err);
          rows.push({
            name: entity,
            customFields: {}
          });
        }
      }

      const result: SuperSearchTableResult = {
        plan,
        rows
      };

      onEvent({ type: 'complete', data: result });
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Search1] Error:', error);
      onEvent({ type: 'error', data: errorMessage });
      throw error;
    }
  }
};

export default search1Variant;
