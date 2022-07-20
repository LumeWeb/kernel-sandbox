#!/usr/bin/env node
import { loadTester, login } from "../dist/index.js";

import puppeteer, { Browser, Page } from "puppeteer";

let browser: Browser;

(async () => {
  browser = await puppeteer.launch({ headless: false, devtools: true });

  const page = (await browser.pages()).pop() as Page;
  await login(page);
  await loadTester(page);
})();

process.on("SIGTERM", async () => {
  await browser.close();
});
