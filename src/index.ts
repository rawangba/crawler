import { argv, exit } from 'node:process';
import { getHTML, crawlPage } from './crawl.ts';

async function main() {
  if (argv.length !== 3) {
    console.error("Usage: npm run start <BASE_URL>");
    process.exit(1);
  } 

  const baseURL = argv[2];
  console.log(`Crawler starting at ${baseURL}`);
  //console.log(await getHTML(baseURL));
  const pages = await crawlPage(baseURL);
  console.log(pages);
  process.exit(0);
}

main();

