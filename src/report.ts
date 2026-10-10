import { writeFileSync } from 'node:fs';
import path from 'node:path';

export function writeJSONReport(
  pageData: Record<string, ExtractedPageData>,
  filename = "report.json",
): void {
  const urls = Object.values(pageData).sort((a, b) => a.url.localeCompare(b.url));
  const toWrite = JSON.stringify(urls, null, 2);
  const filePath = path.resolve(process.cwd(), filename);
  writeFileSync(filePath, toWrite, (err) => {
    if (err) {
      throw err;
    }
    console.log(`Results written to ${filePath}`);
  });
  return;
}

