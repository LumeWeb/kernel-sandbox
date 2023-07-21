import * as path from "path";
import * as kernel from "@lumeweb/libkernel/kernel";

// @ts-ignore
import StaticServer from "static-server";
import { Page } from "puppeteer";
import { bufToHex, ed25519 } from "@lumeweb/libkernel";

import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export function generateSeedPhrase() {
  return ed25519.utils.randomPrivateKey();
}

export async function login(page: Page, seed = generateSeedPhrase()) {
  await page.goto("http://kernel.lumeweb.com");

  let seedHex = bufToHex(seed);

  await page.evaluate((seed: string) => {
    window.localStorage.setItem("key", seed);
  }, seedHex);
}

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
}
