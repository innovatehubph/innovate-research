import { BraveSearch, BraveSearchResult } from './brave';

export interface AggregatedResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source: string;
  relevanceScore: number;
}

export interface SearchSource {
  name: string;
  search: (query: string, count: number) => Promise<BraveSearchResult[]>;
  weight: number;
}

export class SearchAggregator {
  private sources: SearchSource[] = [];

  constructor() {
    // Initialize default sources
    this.initDefaultSources();
  }

  private initDefaultSources(): void {
    // Add Brave Search as default source
    try {
      const brave = new BraveSearch();
      this.addSource({
        name: 'brave',
        search: (query, count) => brave.searchWeb(query, count),
        weight: 1.0,
      });
    } catch (error) {
      console.warn('Brave Search not configured:', (error as Error).message);
    }
  }

  addSource(source: SearchSource): void {
    this.sources.push(source);
  }

  removeSource(name: string): void {
    this.sources = this.sources.filter(s => s.name !== name);
  }

  async search(query: string, count: number = 10): Promise<AggregatedResult[]> {
    if (this.sources.length === 0) {
      throw new Error('No search sources configured');
    }

    // Execute all searches in parallel
    const searchPromises = this.sources.map(async (source) => {
      try {
        const results = await source.search(query, count);
        return results.map(r => ({
          ...r,
          source: source.name,
          weight: source.weight,
        }));
      } catch (error) {
        console.error(`Search source ${source.name} failed:`, error);
        return [];
      }
    });

    const allResults = await Promise.all(searchPromises);
    const flatResults = allResults.flat();

    // Deduplicate and rank
    const deduped = this.deduplicateByUrl(flatResults);
    const ranked = this.rankByRelevance(deduped, query);

    return ranked.slice(0, count);
  }

  private deduplicateByUrl(results: (BraveSearchResult & { source: string; weight: number })[]): (BraveSearchResult & { source: string; weight: number })[] {
    const urlMap = new Map<string, (BraveSearchResult & { source: string; weight: number })>();
    
    for (const result of results) {
      const normalizedUrl = this.normalizeUrl(result.url);
      
      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, result);
      } else {
        // Keep the one with higher weight or longer snippet
        const existing = urlMap.get(normalizedUrl)!;
        if (result.weight > existing.weight || 
            (result.weight === existing.weight && result.snippet.length > existing.snippet.length)) {
          urlMap.set(normalizedUrl, result);
        }
      }
    }

    return Array.from(urlMap.values());
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash, www prefix, and query params for dedup
      let normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
      normalized = normalized.replace(/^(https?:\/\/)www\./, '$1');
      normalized = normalized.replace(/\/$/, '');
      return normalized.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  private rankByRelevance(
    results: (BraveSearchResult & { source: string; weight: number })[],
    query: string
  ): AggregatedResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    return results
      .map(result => {
        let score = result.weight;

        // Title match boost
        const titleLower = result.title.toLowerCase();
        for (const term of queryTerms) {
          if (titleLower.includes(term)) {
            score += 0.3;
          }
        }

        // Exact title match
        if (titleLower.includes(query.toLowerCase())) {
          score += 0.5;
        }

        // Snippet match boost
        const snippetLower = result.snippet.toLowerCase();
        for (const term of queryTerms) {
          if (snippetLower.includes(term)) {
            score += 0.1;
          }
        }

        // Recency boost (if date available)
        if (result.publishedDate) {
          const age = this.parseAge(result.publishedDate);
          if (age < 7) score += 0.3; // Past week
          else if (age < 30) score += 0.2; // Past month
          else if (age < 90) score += 0.1; // Past quarter
        }

        // Domain authority heuristics
        const domain = this.getDomain(result.url);
        if (this.isAuthorityDomain(domain)) {
          score += 0.2;
        }

        return {
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          publishedDate: result.publishedDate,
          source: result.source,
          relevanceScore: Math.round(score * 100) / 100,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private parseAge(ageString: string): number {
    // Parse strings like "2 days ago", "1 week ago", etc.
    const match = ageString.match(/(\d+)\s*(day|week|month|year|hour|minute)/i);
    if (!match) return 365; // Default to old if can't parse

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'minute':
      case 'hour':
        return 0;
      case 'day':
        return value;
      case 'week':
        return value * 7;
      case 'month':
        return value * 30;
      case 'year':
        return value * 365;
      default:
        return 365;
    }
  }

  private getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  private isAuthorityDomain(domain: string): boolean {
    const authorityDomains = [
      'wikipedia.org',
      'github.com',
      'stackoverflow.com',
      'medium.com',
      'reuters.com',
      'bbc.com',
      'nytimes.com',
      'techcrunch.com',
      'wired.com',
      'forbes.com',
      'bloomberg.com',
      'arxiv.org',
      'nature.com',
      'sciencedirect.com',
    ];
    return authorityDomains.some(d => domain.endsWith(d));
  }
}

export default SearchAggregator;
