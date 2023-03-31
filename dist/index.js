import { bufToHex } from "libskynet";
import * as path from "path";
import * as kernel from "libkernel";
import * as ed from "@noble/ed25519";
// @ts-ignore
import StaticServer from "static-server";
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
export function generateSeedPhrase() {
  return ed.utils.randomPrivateKey();
}
export async function login(page, seed = generateSeedPhrase()) {
  await page.goto("http://kernel.lumeweb.com");
  let userSeed = seed;
  let seedHex = bufToHex(userSeed);
  await page.evaluate((seed) => {
    window.localStorage.setItem("v1-key", seed);
  }, seedHex);
}
export async function loadTester(page, port = 8081) {
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
class Tester {
  page;
  constructor(page) {
    this.page = page;
  }
  async callModule(id, method, data = {}) {
    return this.page.evaluate(
      async (id, method, data) => {
        return kernel.callModule(id, method, data);
      },
      id,
      method,
      data
    );
  }
}
export const tester = (page) => new Tester(page);
