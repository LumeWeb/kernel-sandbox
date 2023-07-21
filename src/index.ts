import * as path from "path";
import * as kernel from "@lumeweb/libkernel/kernel";

// @ts-ignore
import StaticServer from "static-server";
import { Page } from "puppeteer";

import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export async function loadTester(page: Page, port = 8080) {
  const server = new StaticServer({
    rootPath: path.resolve(__dirname, "..", "public"),
    port,
    host: "localhost",
  });
  await new Promise((resolve) => {
    server.start(resolve);
  });
  const stop = () => server.stop();

  process.on("SIGTERM", stop);
  page.browser().on("disconnected", stop);

  await page.goto(`http://localhost:${port}/`);
  await page.evaluate(() => {
    return kernel.init();
  });
  await page.evaluate(() => {
    // @ts-ignore
    return window.main.loginRandom();
  });
}
declare function loginRandom(): Promise<any>;
declare global {
  interface Window {
    loginRandom: typeof loginRandom;
  }
}
