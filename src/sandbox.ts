#!/usr/bin/env node
// @ts-ignore
import { loadTester } from "../lib/index.js";

import puppeteer, { Browser, Page, ProtocolError } from "puppeteer";

let browser: Browser;

(async () => {
  browser = await puppeteer.launch({ headless: false, devtools: true });

  const page = (await browser.pages()).pop() as Page;
  await loadTester(page);
})();

process.on("SIGTERM", async () => {
  await browser.close();
});
process.on("uncaughtException", (e) => {
  if (!(e instanceof ProtocolError)) {
    throw e;
  }
});
