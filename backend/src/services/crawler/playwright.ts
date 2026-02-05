import { chromium, Browser, Page, BrowserContext } from 'playwright';

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  html: string;
  metadata: PageMetadata;
  images: ImageInfo[];
  links: string[];
  crawledAt: Date;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: string;
  keywords?: string[];
  ogImage?: string;
  siteName?: string;
}

export interface ImageInfo {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface CrawlOptions {
  timeout?: number;
  waitForSelector?: string;
  userAgent?: string;
  blockResources?: ('image' | 'media' | 'font' | 'stylesheet')[];
  extractImages?: boolean;
}

export class PlaywrightCrawler {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });
    }
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async crawlPage(url: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    await this.init();

    const page = await this.context!.newPage();

    try {
      // Block unnecessary resources if specified
      if (options.blockResources?.length) {
        await page.route('**/*', (route) => {
          const resourceType = route.request().resourceType();
          if (options.blockResources!.includes(resourceType as any)) {
            route.abort();
          } else {
            route.continue();
          }
        });
      }

      // Navigate to page
      await page.goto(url, {
        timeout: options.timeout || 30000,
        waitUntil: 'domcontentloaded',
      });

      // Wait for additional selector if specified
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: 10000,
        }).catch(() => {}); // Don't fail if selector not found
      }

      // Wait a bit for dynamic content
      await page.waitForTimeout(1000);

      // Extract content
      const content = await this.extractContent(page, options);
      const html = await page.content();

      return {
        url,
        title: content.title,
        content: content.text,
        html,
        metadata: content.metadata,
        images: content.images,
        links: content.links,
        crawledAt: new Date(),
      };
    } finally {
      await page.close();
    }
  }

  async extractContent(page: Page, options: CrawlOptions = {}): Promise<{
    title: string;
    text: string;
    metadata: PageMetadata;
    images: ImageInfo[];
    links: string[];
  }> {
    return page.evaluate((extractImages) => {
      // Extract title
      const title = document.title || 
        document.querySelector('h1')?.textContent?.trim() || '';

      // Extract metadata
      const getMeta = (name: string): string | undefined => {
        const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return el?.getAttribute('content') || undefined;
      };

      const metadata: PageMetadata = {
        title: getMeta('og:title') || title,
        description: getMeta('description') || getMeta('og:description'),
        author: getMeta('author') || getMeta('article:author'),
        publishedDate: getMeta('article:published_time') || getMeta('date'),
        keywords: getMeta('keywords')?.split(',').map(k => k.trim()),
        ogImage: getMeta('og:image'),
        siteName: getMeta('og:site_name'),
      };

      // Extract main content text
      const removeElements = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', 'iframe'];
      const clone = document.body.cloneNode(true) as HTMLElement;
      removeElements.forEach(tag => {
        clone.querySelectorAll(tag).forEach(el => el.remove());
      });

      // Try to find main content area
      const mainContent = clone.querySelector('main, article, [role="main"], .content, #content, .post-content, .article-body');
      const textSource = mainContent || clone;
      
      const text = textSource.innerText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      // Extract images
      const images: ImageInfo[] = [];
      if (extractImages) {
        document.querySelectorAll('img').forEach(img => {
          if (img.src && img.src.startsWith('http')) {
            images.push({
              src: img.src,
              alt: img.alt || undefined,
              width: img.naturalWidth || undefined,
              height: img.naturalHeight || undefined,
            });
          }
        });
      }

      // Extract links
      const links: string[] = [];
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (href && href.startsWith('http')) {
          links.push(href);
        }
      });

      return { title, text, metadata, images, links: [...new Set(links)] };
    }, options.extractImages !== false);
  }

  async crawlSite(baseUrl: string, maxPages: number = 10): Promise<CrawlResult[]> {
    await this.init();

    const visited = new Set<string>();
    const toVisit: string[] = [baseUrl];
    const results: CrawlResult[] = [];
    const baseUrlObj = new URL(baseUrl);

    while (toVisit.length > 0 && results.length < maxPages) {
      const url = toVisit.shift()!;
      const normalizedUrl = this.normalizeUrl(url);

      if (visited.has(normalizedUrl)) {
        continue;
      }

      visited.add(normalizedUrl);

      try {
        const result = await this.crawlPage(url, {
          timeout: 20000,
          blockResources: ['image', 'media', 'font'],
        });

        results.push(result);

        // Add internal links to queue
        for (const link of result.links) {
          try {
            const linkUrl = new URL(link);
            if (linkUrl.hostname === baseUrlObj.hostname && 
                !visited.has(this.normalizeUrl(link))) {
              toVisit.push(link);
            }
          } catch {
            // Invalid URL, skip
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to crawl ${url}:`, error);
      }
    }

    return results;
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove hash, trailing slash, and some query params
      let normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
      normalized = normalized.replace(/\/$/, '');
      return normalized.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }
}

export default PlaywrightCrawler;
