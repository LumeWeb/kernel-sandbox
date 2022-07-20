import {
  b64ToBuf,
  bufToHex,
  deriveChildSeed,
  dictionary,
  seedPhraseToSeed,
  taggedRegistryEntryKeys,
} from "libskynet";
import { SEED_BYTES, seedToChecksumWords } from "libskynet/dist/seed";
import { DICTIONARY_UNIQUE_PREFIX } from "libskynet/dist/dictionary";
import * as path from "path";
import { overwriteRegistryEntry } from "libskynetnode";
import * as kernel from "libkernel";
import { webcrypto } from "crypto";
// @ts-ignore
import * as StaticServer from "static-server";
import { Page } from "puppeteer";
import { errTuple } from "libskynet/dist";

export const KERNEL_TEST_SUITE =
  "AQCPJ9WRzMpKQHIsPo8no3XJpUydcDCjw7VJy8lG1MCZ3g";
export const KERNEL_HELPER_MODULE =
  "AQCoaLP6JexdZshDDZRQaIwN3B7DqFjlY7byMikR7u1IEA";
export const TEST_KERNEL_SKLINK =
  "AQDJDoXMJiiEMBxXodQvUV89qtQHsnXWyV1ViQ9M1pMjUg";
const SEED_ENTROPY_WORDS = 13;
const crypto = webcrypto as unknown as Crypto;

export function generateSeedPhrase() {
  // Get the random numbers for the seed phrase. Typically, you need to
  // have code that avoids bias by checking the random results and
  // re-rolling the random numbers if the result is outside of the range
  // of numbers that would produce no bias. Because the search space
  // (1024) evenly divides the random number space (2^16), we can skip
  // this step and just use a modulus instead. The result will have no
  // bias, but only because the search space is a power of 2.
  let randNums = new Uint16Array(SEED_ENTROPY_WORDS);
  crypto.getRandomValues(randNums);
  // Generate the seed phrase from the randNums.
  let seedWords = [];
  for (let i = 0; i < SEED_ENTROPY_WORDS; i++) {
    let wordIndex = randNums[i] % dictionary.length;
    seedWords.push(dictionary[wordIndex]);
  }
  // Convert the seedWords to a seed.
  let [seed] = seedWordsToSeed(seedWords);
  // Compute the checksum.
  let [checksumOne, checksumTwo, err2] = seedToChecksumWords(
    seed as Uint8Array
  );
  // Assemble the final seed phrase and set the text field.
  return [...seedWords, checksumOne, checksumTwo].join(" ");
}

function seedWordsToSeed(seedWords: string[]) {
  // Input checking.
  if (seedWords.length !== SEED_ENTROPY_WORDS) {
    return [
      new Uint8Array(0),
      `Seed words should have length ${SEED_ENTROPY_WORDS} but has length ${seedWords.length}`,
    ];
  }
  // We are getting 16 bytes of entropy.
  let bytes = new Uint8Array(SEED_BYTES);
  let curByte = 0;
  let curBit = 0;
  for (let i = 0; i < SEED_ENTROPY_WORDS; i++) {
    // Determine which number corresponds to the next word.
    let word = -1;
    for (let j = 0; j < dictionary.length; j++) {
      if (
        seedWords[i].slice(0, DICTIONARY_UNIQUE_PREFIX) ===
        dictionary[j].slice(0, DICTIONARY_UNIQUE_PREFIX)
      ) {
        word = j;
        break;
      }
    }
    if (word === -1) {
      return [
        new Uint8Array(0),
        `word '${seedWords[i]}' at index ${i} not found in dictionary`,
      ];
    }
    let wordBits = 10;
    if (i === SEED_ENTROPY_WORDS - 1) {
      wordBits = 8;
    }
    // Iterate over the bits of the 10- or 8-bit word.
    for (let j = 0; j < wordBits; j++) {
      let bitSet = (word & (1 << (wordBits - j - 1))) > 0;
      if (bitSet) {
        bytes[curByte] |= 1 << (8 - curBit - 1);
      }
      curBit += 1;
      if (curBit >= 8) {
        // Current byte has 8 bits, go to the next byte.
        curByte += 1;
        curBit = 0;
      }
    }
  }
  return [bytes, null];
}

export async function login(page: Page, seed = generateSeedPhrase()) {
  await page.goto("http://skt.us");

  let userSeed: Uint8Array;

  [userSeed] = seedPhraseToSeed(seed);
  let seedHex = bufToHex(userSeed);

  await page.evaluate((seed: string) => {
    window.localStorage.setItem("v1-seed", seed);
  }, seedHex);

  let kernelEntrySeed = deriveChildSeed(userSeed, "userPreferredKernel2");

  // Get the registry keys.
  let [keypair, dataKey] = taggedRegistryEntryKeys(
    kernelEntrySeed,
    "user kernel"
  );

  await overwriteRegistryEntry(
    keypair,
    dataKey,
    b64ToBuf(TEST_KERNEL_SKLINK)[0]
  );
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
  await page.goto(`http://localhost:${port}/`);
  await page.evaluate(() => {
    return kernel.init();
  });
}

class Tester {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async callModule(id: string, method: string, data = {}): Promise<errTuple> {
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

export const tester = (page: Page) => new Tester(page);
