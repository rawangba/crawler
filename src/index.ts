import { argv, exit } from 'node:process';
import { getHTML, crawlPage, crawlSiteAsync } from './crawl.ts';
import { writeJSONReport } from './report.ts';

async function main() {
  if (argv.length !== 5) {
    console.error("Usage: npm run start <url> <maxConcurrency> <maxPages>");
    process.exit(1);
  } 

  const baseURL = argv[2];
  const maxConcurrency = Number(argv[3]);
  const maxPages = Number(argv[4]);

  if (isNaN(maxConcurrency) || isNaN(maxPages) || maxConcurrency < 1 || maxPages < 1) {
    console.error("maxConcurrency and maxPages must by a positive non-zero integer");
    process.exit(-1);
  }


  console.log(`Crawler starting at ${baseURL}`);
  //console.log(await getHTML(baseURL));
  //const pages = await crawlPage(baseURL);
  const pages: Record<string, ExtractedPageData> = await crawlSiteAsync(baseURL, maxConcurrency, maxPages);

  console.log("Finished crawling.");
  const firstPage = Object.values(pages)[0];
  if (firstPage) {
    console.log(
      `First page record: ${firstPage["url"]} - ${firstPage["heading"]}`,
    );
  }

  writeJSONReport(pages, "report.json");

  process.exit(0);
}

main();

