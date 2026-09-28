import url from 'node:url';
import { JSDOM } from 'jsdom';

export type ExtractedPageData = {
    url: string;
    heading: string;
    first_paragraph: string;
    outgoing_links: string[];
    image_urls: string[];
};

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

  for (const element of elements) {
    let URI = element.getAttribute("href");
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

export async function getHTML(url: string): string {
  console.log(`Fetching ${url}`);
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
}

export async function crawlPage(baseURL: string, currentURL: string = baseURL, pages: Record<string, number> = {}): Record<string, number> {
  const baseCheck = new URL(baseURL);
  const currentCheck = new URL(currentURL);
  if (baseCheck.hostname !== currentCheck.hostname) {
    return pages;
  }

  const normalizedURL = normalizeURL(currentURL);
  if (pages[normalizedURL] > 0) {
    pages[normalizedURL]++;
    return pages;
  } else {
    pages[normalizedURL] = 1;
  }

  const html: string = await getHTML(currentURL);
  console.log("Getting next URLs")
  const pageData: ExtractedPageData = extractPageData(html, currentCheck.origin);
  for (const nextURL of pageData.outgoing_links) {
    pages = await crawlPage(baseURL, nextURL, pages);
  }
  return pages;
}

