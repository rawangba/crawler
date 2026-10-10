import url from 'node:url';
import { JSDOM } from 'jsdom';
import pLimit from 'p-limit';

export type ExtractedPageData = {
    url: string;
    heading: string;
    first_paragraph: string;
    outgoing_links: string[];
    image_urls: string[];
};

export class ConcurrentCrawler {
  private baseURL: string;
  private pages: Record<string, ExtractedPageData>;
  private limit: <T>(fn: () => Promise<T>) => Promise<T>; // A function created with pLimit(maxConcurrency), use through this.limit(()=>{})
  private maxPages: number;
  private shouldStop: boolean;
  private allTasks: Set<Promise<void>>;
  private visited: Set<string>;

  constructor(baseURL: string, maxConcurrency: number, maxPages: number) {
    this.baseURL = baseURL;
    this.pages = {};
    this.limit = pLimit(maxConcurrency);
    this.maxPages = maxPages;
    this.shouldStop = false;
    this.allTasks = new Set();
    this.visited = new Set();
  }

  // Returns true if this is the first visit to the page, false otherwise
  private addPageVisit(normalizedURL: string): boolean {
    if (this.shouldStop) {
      return false;
    }

    if (this.visited.size >= this.maxPages) {
      this.shouldStop = true;
      console.log("Reached maximum number of pages to crawl.");
      return false;
    }

    this.visited.add(normalizedURL);
    return true;
  }

  private async getHTML(url: string): Promise<string> {
    return await this.limit(async () => {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "BootCrawler/1.0",
          },
        });
        if (!res.ok) {
          throw new Error(`Response status: ${res.status}`);
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("text/html")) {
          throw new Error(`Response is ${contentType}, not text/html`);
        }

        return await res.text();
      } catch (error) {
        console.error(error.message);
        console.error("Underlying cause:", (error as any)?.cause);
      }
    });
  }

  private async crawlPage(currentURL: string): Promise<void> {
    if (this.shouldStop) {
      return;
    }

    try {
      const baseCheck = new URL(this.baseURL);
      const currentCheck = new URL(currentURL);
      if (baseCheck.hostname !== currentCheck.hostname) {
        return;
      }
    } catch (err) {
      console.error(`invalid URI '${this.baseURL}' or '${currentURL}':`, err);
      return;
    }

    const normalizedURL = normalizeURL(currentURL);
    if (!this.addPageVisit(normalizedURL)) {
      return;
    }

    console.log(`Now crawling ${normalizedURL}`);

    let html: string = "";
    try {
      html = await this.getHTML(currentURL);
    } catch (err) {
      console.error(`Error getting HTML: ${(err as Error).message}`);
    }
    const pageData: ExtractedPageData = extractPageData(html, currentURL);
    this.pages[normalizedURL] = pageData;
    
    const nextPages: Promise<void>[] = [];
    for (const nextURL of pageData.outgoing_links) {
      const task = this.crawlPage(nextURL);
      this.allTasks.add(task);
      task.finally(() => this.allTasks.delete(task));
      nextPages.push(task);
    }
									
    await Promise.all(nextPages);
  }

  async crawl(): Record<string, ExtractedPageData> {
    const rootTask = this.crawlPage(this.baseURL);
    this.allTasks.add(rootTask);
    try {
      await rootTask;
    } finally {
      this.allTasks.delete(rootTask);
    }
    await Promise.allSettled(Array.from(this.allTasks));
    return this.pages;
  }
}


export function normalizeURL(inputURL: string): string {
  const baseURL: url = new URL(inputURL);
  let path: string = baseURL.pathname;
  if (path.endsWith("/")) {
    path = path.slice(0, path.length - 1);
  }
  return `${baseURL.hostname}${path}`;
}

export function getHeadingFromHTML(html: string): string {
  const dom = new JSDOM(html);
  let elements = dom.window.document.querySelectorAll('h1');
  if (elements.length === 0) {
    elements = dom.window.document.querySelectorAll('h2');
  }
  
  if (elements.length === 0) {
    return "";
  }
  return elements[0].textContent;
}

export function getFirstParagraphFromHTML(html: string): string {
  const dom = new JSDOM(html);
  
  const mainElements = dom.window.document.querySelectorAll('main');
  if (mainElements.length !== 0) {
    const elements = mainElements[0].getElementsByTagName('p');
    if (elements.length !== 0) {
      return elements[0].textContent;
    }
  }
  
  const elements = dom.window.document.querySelectorAll('p');
  if (elements.length !== 0) {
    return elements[0].textContent;
  }

  return "";
}

export function getURLsFromHTML(html: string, baseURL: string): string[] {
  const results = [];
  const dom = new JSDOM(html);
  const elements = dom.window.document.querySelectorAll('a');

  elements.forEach((element) => {
    const URI = element.getAttribute("href");
    if (!URI) {
      return;
    }
    try {
      const absoluteURL = new URL(URI, baseURL).toString();
      results.push(absoluteURL);
    } catch (err) {
      console.error(`invalid URI '${URI}':`, err);
    }
  });
  return results;
}

export function getImagesFromHTML(html: string, baseURL: string): string[] {
  const results = [];
  const dom = new JSDOM(html);
  const elements = dom.window.document.querySelectorAll('img');

  for (const element of elements) {
    let URI = element.getAttribute("src");
    if (URI === null) {
      continue;
    }
    if (URI.startsWith("/")) {
      URI = `${baseURL}${URI}`;
    }
    results.push(URI);
  }
  return results;
}

export function extractPageData(html: string, pageURL: string): ExtractedPageData {
  return {
    url: pageURL,
    heading: getHeadingFromHTML(html),
    first_paragraph: getFirstParagraphFromHTML(html),
    outgoing_links: getURLsFromHTML(html, pageURL),
    image_urls: getImagesFromHTML(html, pageURL)
  } satisfies ExtractedPageData;
}

export async function crawlSiteAsync(baseURL: string, maxConcurrency: number = 1, maxPages: number = 1): Record<string, ExtractedPageData> {
  const concurrentCrawler: ConcurrentCrawler = new ConcurrentCrawler(baseURL, maxConcurrency, maxPages);
  return await concurrentCrawler.crawl();
}

