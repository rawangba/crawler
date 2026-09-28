import { describe, expect, test } from 'vitest'
import { normalizeURL, getHeadingFromHTML, getFirstParagraphFromHTML, getURLsFromHTML, getImagesFromHTML, extractPageData } from './crawl.ts'
import type { ExtractedPageData } from './crawl.ts'

describe('normalizeURL', () => {
  test('Check secure with trailing slash', () => {
    expect(normalizeURL("https://www.boot.dev/blog/path/")).toBe("www.boot.dev/blog/path");
  })
  test('Check secure without trailing slash', () => {
    expect(normalizeURL("https://www.boot.dev/blog/path")).toBe("www.boot.dev/blog/path");
  })
  test('Check unsecure with trailing slash', () => {
    expect(normalizeURL("http://www.boot.dev/blog/path/")).toBe("www.boot.dev/blog/path");
  })
  test('Check unsecure without trailing slash', () => {
    expect(normalizeURL("http://www.boot.dev/blog/path")).toBe("www.boot.dev/blog/path");
  })
})

describe('get HTML Elements', () => {
  test("getHeadingFromHTML basic", () => {
    const inputBody = `<html><body><h1>Test Title</h1></body></html>`;
    const actual = getHeadingFromHTML(inputBody);
    const expected = "Test Title";
    expect(actual).toEqual(expected);
  });
  
  test("getHeadingFromHTML h2 only", () => {
    const inputBody = `<html><body><h2>Test Title 2</h2></body></html>`;
    const actual = getHeadingFromHTML(inputBody);
    const expected = "Test Title 2";
    expect(actual).toEqual(expected);
  });
  
  test("getHeadingFromHTML no headers", () => {
    const inputBody = `<html><body></body></html>`;
    const actual = getHeadingFromHTML(inputBody);
    const expected = "";
    expect(actual).toEqual(expected);
  });
  
  test("getFirstParagraphFromHTML main priority", () => {
    const inputBody = `
      <html><body>
        <p>Outside paragraph.</p>
        <main>
          <p>Main paragraph.</p>
        </main>
      </body></html>
    `;
    const actual = getFirstParagraphFromHTML(inputBody);
    const expected = "Main paragraph.";
    expect(actual).toEqual(expected);
  });

  test("getFirstParagraphFromHTML no main", () => {
    const inputBody = `
      <html><body>
        <p>Outside paragraph.</p>
        <div>
          <p>Main paragraph.</p>
        </div>
      </body></html>
    `;
    const actual = getFirstParagraphFromHTML(inputBody);
    const expected = "Outside paragraph.";
    expect(actual).toEqual(expected);
  });

  test("getFirstParagraphFromHTML all in a div", () => {
    const inputBody = `
      <html><body>
        <div>
          <p>First paragraph.</p>
          <p>Main paragraph.</p>
        </div>
      </body></html>
    `;
    const actual = getFirstParagraphFromHTML(inputBody);
    const expected = "First paragraph.";
    expect(actual).toEqual(expected);
  });

  test("getFirstParagraphFromHTML no paragraphs", () => {
    const inputBody = `
      <html><body>
        <main>
        </main>
      </body></html>
    `;
    const actual = getFirstParagraphFromHTML(inputBody);
    const expected = "";
    expect(actual).toEqual(expected);
  });

})

describe('get URLs and Images', () => {
  test("getURLsFromHTML absolute", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `<html><body><a href="/path/one"><span>Boot.dev</span></a></body></html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    const expected = ["https://crawler-test.com/path/one"];

    expect(actual).toEqual(expected);
  });

  test("getURLsFromHTML already absolute", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `<html><body><a href="https://boot.dev"><span>Go to Boot.dev</span></a></body></html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    const expected = ["https://boot.dev"];

    expect(actual).toEqual(expected);
  });

  test("getURLsFromHTML only a href", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `<html>
  <body>
    <a href="https://crawler-test.com">Go to Boot.dev</a>
    <img src="/logo.png" alt="Boot.dev Logo" />
  </body>
</html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    const expected = ["https://crawler-test.com"];

    expect(actual).toEqual(expected);
  });

  test("getURLsFromHTML no links", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `<html><body><span>Go to Boot.dev</span></body></html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    const expected = [];

    expect(actual).toEqual(expected);
  });

  test("getURLsFromHTML multiple links", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `<html>
  <body>
    <a href="https://boot.dev">Go to Boot.dev</a>
    <a href="/blog/new">Go to Blog</a>
  </body>
</html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    const expected = ["https://boot.dev", "https://crawler-test.com/blog/new"];

    expect(actual).toEqual(expected);
  });

  test("getImagesFromHTML relative", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `<html><body><img src="/logo.png" alt="Logo"></body></html>`;

    const actual = getImagesFromHTML(inputBody, inputURL);
    const expected = ["https://crawler-test.com/logo.png"];

    expect(actual).toEqual(expected);
  });

  test("getImagesFromHTML absolute", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `<html><body><img src="https://boot.dev/logo.png" alt="Logo"></body></html>`;

    const actual = getImagesFromHTML(inputBody, inputURL);
    const expected = ["https://boot.dev/logo.png"];

    expect(actual).toEqual(expected);
  });

  test("getImagesFromHTML no image", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `<html><body><a href="https://boot.dev"><span>Go to Boot.dev</span></a></body></html>`;

    const actual = getImagesFromHTML(inputBody, inputURL);
    const expected = [];

    expect(actual).toEqual(expected);
  });

  test("getImagesFromHTML multiple images", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `<html><body><img src="/logo.png" alt="Logo"><img src="/logo2.png" alt="Logo2"></body></html>`;

    const actual = getImagesFromHTML(inputBody, inputURL);
    const expected = ["https://crawler-test.com/logo.png", "https://crawler-test.com/logo2.png"];

    expect(actual).toEqual(expected);
  });

})

describe('extractPageData', () => {
  test("extractPageData basic", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `
      <html><body>
        <h1>Test Title</h1>
        <p>This is the first paragraph.</p>
        <a href="/link1">Link 1</a>
        <img src="/image1.jpg" alt="Image 1">
      </body></html>
    `;

    const actual = extractPageData(inputBody, inputURL);
    const expected = {
      url: "https://crawler-test.com",
      heading: "Test Title",
      first_paragraph: "This is the first paragraph.",
      outgoing_links: ["https://crawler-test.com/link1"],
      image_urls: ["https://crawler-test.com/image1.jpg"],
    };

    expect(actual).toEqual(expected);
  });

  test("extractPageData no external data", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `
      <html><body>
        <h1>Test Title</h1>
        <p>This is the first paragraph.</p>
      </body></html>
    `;

    const actual = extractPageData(inputBody, inputURL);
    const expected = {
      url: "https://crawler-test.com",
      heading: "Test Title",
      first_paragraph: "This is the first paragraph.",
      outgoing_links: [],
      image_urls: [],
    };

    expect(actual).toEqual(expected);
  });

  test("extractPageData only external data", () => {
    const inputURL = "https://crawler-test.com";
    const inputBody = `
      <html><body>
        <a href="/link1">Link 1</a>
        <img src="/image1.jpg" alt="Image 1">
      </body></html>
    `;

    const actual = extractPageData(inputBody, inputURL);
    const expected = {
      url: "https://crawler-test.com",
      heading: "",
      first_paragraph: "",
      outgoing_links: ["https://crawler-test.com/link1"],
      image_urls: ["https://crawler-test.com/image1.jpg"],
    };

    expect(actual).toEqual(expected);
  });

})
