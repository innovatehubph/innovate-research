import * as cheerio from 'cheerio';

interface ExtractedContent {
  title: string;
  description: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  mainContent: string;
  images: string[];
  links: { text: string; url: string }[];
  structuredData: any[];
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
}

export class ContentExtractor {
  extractMetadata(html: string): {
    title: string;
    description: string;
    author?: string;
    publishedDate?: string;
    keywords?: string[];
  } {
    const $ = cheerio.load(html);

    const title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      '';

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    const author =
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('[rel="author"]').text() ||
      undefined;

    const publishedDate =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="date"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      undefined;

    const keywordsStr = $('meta[name="keywords"]').attr('content');
    const keywords = keywordsStr ? keywordsStr.split(',').map(k => k.trim()) : undefined;

    return { title, description, author, publishedDate, keywords };
  }

  extractMainContent(html: string): string {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .sidebar, .ads, .advertisement, .social-share, .comments, [role="navigation"], [role="banner"]').remove();

    // Try to find main content area
    const mainSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '#content',
      '.post',
      '.article',
    ];

    let content = '';

    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // Fallback to body
    if (!content) {
      content = $('body').text();
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return content;
  }

  extractLinks(html: string, baseUrl: string): { text: string; url: string }[] {
    const $ = cheerio.load(html);
    const links: { text: string; url: string }[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();

      if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
        return;
      }

      try {
        const url = new URL(href, baseUrl).toString();
        
        if (!seen.has(url) && text.length > 0 && text.length < 200) {
          seen.add(url);
          links.push({ text, url });
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return links;
  }

  extractStructuredData(html: string): any[] {
    const $ = cheerio.load(html);
    const structuredData: any[] = [];

    // JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (content) {
          const data = JSON.parse(content);
          structuredData.push(data);
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    return structuredData;
  }

  extractOpenGraph(html: string): Record<string, string> {
    const $ = cheerio.load(html);
    const og: Record<string, string> = {};

    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property')?.replace('og:', '');
      const content = $(el).attr('content');
      if (property && content) {
        og[property] = content;
      }
    });

    return og;
  }

  extractTwitterCard(html: string): Record<string, string> {
    const $ = cheerio.load(html);
    const twitter: Record<string, string> = {};

    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name')?.replace('twitter:', '');
      const content = $(el).attr('content');
      if (name && content) {
        twitter[name] = content;
      }
    });

    return twitter;
  }

  extractImages(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const images: string[] = [];
    const seen = new Set<string>();

    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (!src) return;

      try {
        const url = new URL(src, baseUrl).toString();
        if (!seen.has(url)) {
          seen.add(url);
          images.push(url);
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return images;
  }

  extractAll(html: string, baseUrl: string): ExtractedContent {
    const metadata = this.extractMetadata(html);
    
    return {
      title: metadata.title,
      description: metadata.description,
      author: metadata.author,
      publishedDate: metadata.publishedDate,
      mainContent: this.extractMainContent(html),
      images: this.extractImages(html, baseUrl),
      links: this.extractLinks(html, baseUrl),
      structuredData: this.extractStructuredData(html),
      openGraph: this.extractOpenGraph(html),
      twitterCard: this.extractTwitterCard(html),
    };
  }
}

export const contentExtractor = new ContentExtractor();
export default contentExtractor;
