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
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "BootCrawler/1.0",
      },
    });
    if (!res.ok) {
      throw new Error(`Response status: ${response.status}`);
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


