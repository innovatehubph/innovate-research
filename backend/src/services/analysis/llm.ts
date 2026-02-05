import OpenAI from 'openai';

interface AnalysisResult {
  summary: string;
  entities: {
    people: string[];
    companies: string[];
    products: string[];
    locations: string[];
  };
  keyFacts: string[];
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  themes: string[];
  confidence: number;
}

interface ReportSection {
  id: string;
  title: string;
  content: string;
}

export class LLMAnalyzer {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
    });
    this.model = 'anthropic/claude-3-haiku';
  }

  async analyzeContent(content: string, context?: string): Promise<AnalysisResult> {
    const prompt = `Analyze the following content and extract structured information.

${context ? `Context: ${context}\n\n` : ''}Content to analyze:
${content.slice(0, 15000)}

Provide a JSON response with:
{
  "summary": "2-3 sentence summary",
  "entities": {
    "people": ["list of people mentioned"],
    "companies": ["list of companies mentioned"],
    "products": ["list of products mentioned"],
    "locations": ["list of locations mentioned"]
  },
  "keyFacts": ["list of 5-10 key facts"],
  "sentiment": "positive|negative|neutral|mixed",
  "themes": ["main themes discussed"],
  "confidence": 0.0-1.0
}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a research analyst. Provide structured analysis in JSON format only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '{}';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from LLM response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  async generateSummary(content: string, maxLength: number = 500): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a skilled summarizer. Create concise, informative summaries.' },
        { role: 'user', content: `Summarize the following content in ${maxLength} characters or less:\n\n${content.slice(0, 10000)}` },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || '';
  }

  async extractEntities(text: string): Promise<{
    people: Array<{ name: string; role?: string }>;
    companies: Array<{ name: string; industry?: string }>;
    products: Array<{ name: string; type?: string }>;
  }> {
    const prompt = `Extract named entities from this text and categorize them:

${text.slice(0, 8000)}

Return JSON:
{
  "people": [{"name": "...", "role": "if mentioned"}],
  "companies": [{"name": "...", "industry": "if known"}],
  "products": [{"name": "...", "type": "if known"}]
}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are an entity extraction specialist. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const text2 = response.choices[0]?.message?.content || '{}';
    const jsonMatch = text2.match(/\{[\s\S]*\}/);
    
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { people: [], companies: [], products: [] };
  }

  async generateReport(
    sources: Array<{ url: string; title: string; content: string }>,
    template: { name: string; sections: Array<{ id: string; title: string }>; analysisPrompt: string },
    query: string
  ): Promise<{
    title: string;
    summary: string;
    sections: ReportSection[];
    sources: Array<{ url: string; title: string }>;
    generatedAt: string;
  }> {
    // Combine source content
    const combinedContent = sources.map(s => 
      `--- Source: ${s.title} (${s.url}) ---\n${s.content.slice(0, 3000)}`
    ).join('\n\n');

    const sectionPrompts = template.sections.map(s => `- ${s.title}: ${s.id}`).join('\n');

    const prompt = `You are creating a ${template.name} report about: "${query}"

Based on the following source material:
${combinedContent.slice(0, 20000)}

${template.analysisPrompt}

Generate a comprehensive report with these sections:
${sectionPrompts}

Return as JSON:
{
  "title": "Report title",
  "summary": "Executive summary (2-3 paragraphs)",
  "sections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "content": "Section content in markdown format"
    }
  ]
}`;

    const response = await this.client.chat.completions.create({
      model: 'anthropic/claude-3-sonnet', // Use a stronger model for reports
      messages: [
        { role: 'system', content: 'You are an expert research analyst creating comprehensive reports. Return valid JSON with markdown content in sections.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    });

    const responseText = response.choices[0]?.message?.content || '{}';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to generate report');
    }

    const reportData = JSON.parse(jsonMatch[0]);

    return {
      title: reportData.title || `${template.name}: ${query}`,
      summary: reportData.summary || '',
      sections: reportData.sections || [],
      sources: sources.map(s => ({ url: s.url, title: s.title })),
      generatedAt: new Date().toISOString(),
    };
  }

  async assessRelevance(content: string, query: string): Promise<{
    relevant: boolean;
    score: number;
    reason: string;
  }> {
    const prompt = `Assess if this content is relevant to the query: "${query}"

Content (first 2000 chars):
${content.slice(0, 2000)}

Return JSON:
{
  "relevant": true/false,
  "score": 0.0-1.0,
  "reason": "brief explanation"
}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You assess content relevance. Return only JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const text = response.choices[0]?.message?.content || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { relevant: false, score: 0, reason: 'Parse error' };
  }
}

export const llmAnalyzer = new LLMAnalyzer();
export default llmAnalyzer;
