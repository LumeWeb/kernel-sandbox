#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const index_js_1 = require("../dist/index.js");
const puppeteer_1 = require("puppeteer");
let browser;
(async () => {
    browser = await puppeteer_1.default.launch({ headless: false, devtools: true });
    const page = (await browser.pages()).pop();
    await (0, index_js_1.login)(page);
    await (0, index_js_1.loadTester)(page);
})();
process.on("SIGTERM", async () => {
    await browser.close();
});
