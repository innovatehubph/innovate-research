import axios, { AxiosInstance } from 'axios';

export interface BraveSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

export interface BraveSearchOptions {
  count?: number;
  offset?: number;
  country?: string;
  freshness?: 'pd' | 'pw' | 'pm' | 'py'; // past day/week/month/year
}

export class BraveSearch {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BRAVE_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('BRAVE_API_KEY is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.search.brave.com/res/v1',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.apiKey,
      },
      timeout: 30000,
    });
  }

  async searchWeb(query: string, count: number = 10, options: BraveSearchOptions = {}): Promise<BraveSearchResult[]> {
    try {
      const params: Record<string, any> = {
        q: query,
        count: Math.min(count, 20), // Brave API max is 20
        offset: options.offset || 0,
      };

      if (options.country) {
        params.country = options.country;
      }

      if (options.freshness) {
        params.freshness = options.freshness;
      }

      const response = await this.client.get('/web/search', { params });
      
      const results: BraveSearchResult[] = [];

      if (response.data?.web?.results) {
        for (const result of response.data.web.results) {
          results.push({
            title: result.title || '',
            url: result.url || '',
            snippet: result.description || '',
            publishedDate: result.age || result.page_age || undefined,
          });
        }
      }

      return results;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid BRAVE_API_KEY');
        }
        if (error.response?.status === 429) {
          throw new Error('Brave API rate limit exceeded');
        }
        throw new Error(`Brave Search API error: ${error.response?.status} - ${error.message}`);
      }
      throw error;
    }
  }

  async searchNews(query: string, count: number = 10): Promise<BraveSearchResult[]> {
    try {
      const params = {
        q: query,
        count: Math.min(count, 20),
      };

      const response = await this.client.get('/news/search', { params });
      
      const results: BraveSearchResult[] = [];

      if (response.data?.results) {
        for (const result of response.data.results) {
          results.push({
            title: result.title || '',
            url: result.url || '',
            snippet: result.description || '',
            publishedDate: result.age || undefined,
          });
        }
      }

      return results;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Brave News API error: ${error.response?.status} - ${error.message}`);
      }
      throw error;
    }
  }
}

export default BraveSearch;
