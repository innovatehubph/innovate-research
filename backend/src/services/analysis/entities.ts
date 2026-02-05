export interface Person {
  name: string;
  title?: string;
  organization?: string;
  relationships: string[];
  mentions: number;
  context: string[];
}

export interface Company {
  name: string;
  industry?: string;
  location?: string;
  type?: 'startup' | 'enterprise' | 'nonprofit' | 'government' | 'unknown';
  mentions: number;
  context: string[];
}

export interface Product {
  name: string;
  company?: string;
  features: string[];
  price?: string;
  mentions: number;
  context: string[];
}

export class EntityExtractor {
  // Common name patterns
  private readonly namePatterns = [
    /(?:CEO|CTO|CFO|COO|President|Director|Manager|Founder|Co-founder)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/g,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}),?\s+(?:CEO|CTO|CFO|COO|President|Director|Manager|Founder|Co-founder)/g,
    /(?:said|says|according to|told|stated)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/g,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s+(?:said|says|announced|stated|explained)/g,
  ];

  // Common title patterns
  private readonly titlePatterns = [
    /(CEO|Chief Executive Officer)/gi,
    /(CTO|Chief Technology Officer)/gi,
    /(CFO|Chief Financial Officer)/gi,
    /(COO|Chief Operating Officer)/gi,
    /(President)/gi,
    /(Vice President|VP)/gi,
    /(Director)/gi,
    /(Manager)/gi,
    /(Founder|Co-founder)/gi,
    /(Engineer|Developer)/gi,
    /(Analyst)/gi,
  ];

  // Company indicators
  private readonly companyIndicators = [
    'Inc.', 'Inc', 'Corp.', 'Corp', 'LLC', 'Ltd.', 'Ltd', 'Company', 'Co.',
    'Corporation', 'Group', 'Holdings', 'Partners', 'Technologies', 'Solutions',
  ];

  // Industry keywords
  private readonly industryKeywords: Record<string, string[]> = {
    'technology': ['software', 'tech', 'digital', 'platform', 'cloud', 'AI', 'data'],
    'finance': ['bank', 'financial', 'investment', 'capital', 'fintech', 'payment'],
    'healthcare': ['health', 'medical', 'pharma', 'biotech', 'healthcare'],
    'retail': ['retail', 'commerce', 'store', 'shopping', 'ecommerce'],
    'media': ['media', 'entertainment', 'news', 'publishing', 'content'],
  };

  extractPeople(text: string): Person[] {
    const peopleMap = new Map<string, Person>();
    const sentences = this.splitIntoSentences(text);

    for (const pattern of this.namePatterns) {
      let match;
      // Reset the regex
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(text)) !== null) {
        const name = this.normalizeName(match[1]);
        if (!this.isValidPersonName(name)) continue;

        const context = this.findSentenceContaining(sentences, name);
        const title = this.extractTitleNearName(text, name);
        const organization = this.extractOrganizationNearName(text, name);

        if (peopleMap.has(name)) {
          const person = peopleMap.get(name)!;
          person.mentions++;
          if (context && !person.context.includes(context)) {
            person.context.push(context);
          }
          if (title && !person.title) {
            person.title = title;
          }
          if (organization && !person.organization) {
            person.organization = organization;
          }
        } else {
          peopleMap.set(name, {
            name,
            title,
            organization,
            relationships: [],
            mentions: 1,
            context: context ? [context] : [],
          });
        }
      }
    }

    // Extract relationships
    for (const [name, person] of peopleMap) {
      person.relationships = this.extractRelationships(text, name, Array.from(peopleMap.keys()));
    }

    return Array.from(peopleMap.values())
      .sort((a, b) => b.mentions - a.mentions);
  }

  extractCompanies(text: string): Company[] {
    const companyMap = new Map<string, Company>();
    const sentences = this.splitIntoSentences(text);

    // Pattern 1: Company with suffix (Inc., Corp., etc.)
    const suffixPattern = new RegExp(
      `([A-Z][A-Za-z0-9]*(?:\\s+[A-Z][A-Za-z0-9]*)*)\\s+(${this.companyIndicators.join('|')})`,
      'g'
    );

    let match;
    while ((match = suffixPattern.exec(text)) !== null) {
      const name = `${match[1]} ${match[2]}`.trim();
      this.addCompany(companyMap, name, text, sentences);
    }

    // Pattern 2: Known company patterns
    const companyPatterns = [
      /(?:company|startup|firm|corporation)\s+(?:called|named)?\s*([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)*)/gi,
      /([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)*)\s+(?:announced|launched|released|acquired|raised)/gi,
    ];

    for (const pattern of companyPatterns) {
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        if (this.isLikelyCompany(name)) {
          this.addCompany(companyMap, name, text, sentences);
        }
      }
    }

    return Array.from(companyMap.values())
      .sort((a, b) => b.mentions - a.mentions);
  }

  extractProducts(text: string): Product[] {
    const productMap = new Map<string, Product>();
    const sentences = this.splitIntoSentences(text);

    // Pattern 1: Product launch/announcement
    const launchPatterns = [
      /(?:launched|announced|released|introduced|unveiled)\s+(?:the\s+)?([A-Z][A-Za-z0-9]+(?:\s+[A-Z]?[A-Za-z0-9]+)*)/gi,
      /(?:new|latest)\s+(?:product|service|platform|tool|app|application)\s+(?:called|named)?\s*([A-Z][A-Za-z0-9]+)/gi,
      /([A-Z][A-Za-z0-9]+(?:\s+[A-Z]?[A-Za-z0-9]+)*)\s+(?:is a|is an|provides|offers|enables)/gi,
    ];

    let match;
    for (const pattern of launchPatterns) {
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        if (this.isLikelyProduct(name)) {
          this.addProduct(productMap, name, text, sentences);
        }
      }
    }

    // Extract features and prices for found products
    for (const [name, product] of productMap) {
      product.features = this.extractProductFeatures(text, name);
      product.price = this.extractPrice(text, name);
      product.company = this.extractProductCompany(text, name);
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.mentions - a.mentions);
  }

  // Helper methods
  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  private findSentenceContaining(sentences: string[], term: string): string | undefined {
    return sentences.find(s => s.includes(term));
  }

  private normalizeName(name: string): string {
    return name.replace(/\s+/g, ' ').trim();
  }

  private isValidPersonName(name: string): boolean {
    if (!name || name.length < 3) return false;
    if (name.split(' ').length < 2) return false; // Require at least first + last name
    if (/^\d/.test(name)) return false;
    if (/[^A-Za-z\s\-']/.test(name)) return false;
    
    // Filter common false positives
    const falsePositives = ['The Company', 'New York', 'United States', 'According To'];
    if (falsePositives.includes(name)) return false;
    
    return true;
  }

  private extractTitleNearName(text: string, name: string): string | undefined {
    const window = 100;
    const idx = text.indexOf(name);
    if (idx === -1) return undefined;

    const surrounding = text.substring(Math.max(0, idx - window), idx + name.length + window);
    
    for (const pattern of this.titlePatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(surrounding);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }

  private extractOrganizationNearName(text: string, name: string): string | undefined {
    const patterns = [
      new RegExp(`${name}[^.]*?(?:at|of|from)\\s+([A-Z][A-Za-z0-9]+(?:\\s+[A-Z][A-Za-z0-9]+)*)`, 'i'),
      new RegExp(`([A-Z][A-Za-z0-9]+(?:\\s+[A-Z][A-Za-z0-9]+)*)'s\\s+${name}`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }

  private extractRelationships(text: string, name: string, allNames: string[]): string[] {
    const relationships: string[] = [];
    const window = 200;
    const idx = text.indexOf(name);
    if (idx === -1) return relationships;

    const surrounding = text.substring(Math.max(0, idx - window), idx + name.length + window);

    for (const otherName of allNames) {
      if (otherName !== name && surrounding.includes(otherName)) {
        relationships.push(otherName);
      }
    }
    return relationships;
  }

  private addCompany(map: Map<string, Company>, name: string, text: string, sentences: string[]): void {
    if (map.has(name)) {
      map.get(name)!.mentions++;
    } else {
      const context = this.findSentenceContaining(sentences, name);
      map.set(name, {
        name,
        industry: this.detectIndustry(text, name),
        location: this.extractLocation(text, name),
        type: 'unknown',
        mentions: 1,
        context: context ? [context] : [],
      });
    }
  }

  private isLikelyCompany(name: string): boolean {
    if (!name || name.length < 2) return false;
    if (!/^[A-Z]/.test(name)) return false;
    
    const falsePositives = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (falsePositives.includes(name)) return false;
    
    return true;
  }

  private detectIndustry(text: string, companyName: string): string | undefined {
    const window = 200;
    const idx = text.indexOf(companyName);
    if (idx === -1) return undefined;

    const surrounding = text.substring(Math.max(0, idx - window), idx + companyName.length + window).toLowerCase();

    for (const [industry, keywords] of Object.entries(this.industryKeywords)) {
      if (keywords.some(kw => surrounding.includes(kw))) {
        return industry;
      }
    }
    return undefined;
  }

  private extractLocation(text: string, name: string): string | undefined {
    const patterns = [
      new RegExp(`${name}[^.]*?(?:based in|headquartered in|located in)\\s+([A-Z][A-Za-z]+(?:,\\s*[A-Z][A-Za-z]+)?)`, 'i'),
      new RegExp(`([A-Z][A-Za-z]+(?:,\\s*[A-Z][A-Za-z]+)?)-based\\s+${name}`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }

  private addProduct(map: Map<string, Product>, name: string, text: string, sentences: string[]): void {
    if (map.has(name)) {
      map.get(name)!.mentions++;
    } else {
      const context = this.findSentenceContaining(sentences, name);
      map.set(name, {
        name,
        features: [],
        mentions: 1,
        context: context ? [context] : [],
      });
    }
  }

  private isLikelyProduct(name: string): boolean {
    if (!name || name.length < 2) return false;
    if (/^\d/.test(name)) return false;
    
    const falsePositives = ['The', 'This', 'That', 'Their', 'Today', 'New', 'Latest'];
    if (falsePositives.includes(name)) return false;
    
    return true;
  }

  private extractProductFeatures(text: string, productName: string): string[] {
    const features: string[] = [];
    const patterns = [
      new RegExp(`${productName}[^.]*?(?:features?|offers?|provides?|includes?)\\s+([^.]+)`, 'i'),
      new RegExp(`(?:features? of|capabilities of)\\s+${productName}[^.]*?:?\\s*([^.]+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        // Split by common separators
        const featureText = match[1];
        const parts = featureText.split(/,|and|;/).map(f => f.trim()).filter(f => f.length > 2);
        features.push(...parts);
      }
    }
    return [...new Set(features)].slice(0, 5);
  }

  private extractPrice(text: string, productName: string): string | undefined {
    const pattern = new RegExp(`${productName}[^.]*?(\\$[\\d,]+(?:\\.\\d{2})?(?:\\/(?:month|year|mo|yr))?)`, 'i');
    const match = pattern.exec(text);
    return match ? match[1] : undefined;
  }

  private extractProductCompany(text: string, productName: string): string | undefined {
    const patterns = [
      new RegExp(`([A-Z][A-Za-z]+(?:\\s+[A-Z][A-Za-z]+)*)'s\\s+${productName}`, 'i'),
      new RegExp(`${productName}[^.]*?(?:by|from)\\s+([A-Z][A-Za-z]+(?:\\s+[A-Z][A-Za-z]+)*)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }
}

export default EntityExtractor;
