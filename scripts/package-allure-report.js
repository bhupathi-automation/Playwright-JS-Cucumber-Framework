import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';

const reportPath = path.resolve('reports', 'allure-share', 'index.html');
const archivePath = path.resolve('reports', 'allure-report-share.zip');
const report = await readFile(reportPath);
const instructions = `Allure test report

Extract this ZIP file and open report.html in a modern web browser.
The report is a standalone HTML file and does not require Node.js, Allure, or this project.

This report may contain sensitive test data, screenshots, traces, and other attachments.
Share it only with authorized team members and store it in an approved location.
`;

const archive = zipSync(
  {
    'report.html': new Uint8Array(report),
    'README.txt': strToU8(instructions),
  },
  { level: 6 },
);

await writeFile(archivePath, archive);
console.log(`Shareable Allure report created: ${archivePath}`);
