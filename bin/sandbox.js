#!/usr/bin/env node
// @ts-ignore
import { loadTester, login } from "../dist/index.js";
import puppeteer, { ProtocolError } from "puppeteer";
let browser;
(async () => {
    browser = await puppeteer.launch({ headless: false, devtools: true });
    const page = (await browser.pages()).pop();
    await login(page);
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
