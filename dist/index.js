"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tester = exports.loadTester = exports.login = exports.generateSeedPhrase = exports.TEST_KERNEL_SKLINK = exports.KERNEL_HELPER_MODULE = exports.KERNEL_TEST_SUITE = void 0;
const libskynet_1 = require("libskynet");
const seed_1 = require("libskynet/dist/seed");
const dictionary_1 = require("libskynet/dist/dictionary");
const path = require("path");
const libskynetnode_1 = require("libskynetnode");
const kernel = require("libkernel");
const crypto_1 = require("crypto");
// @ts-ignore
const StaticServer = require("static-server");
exports.KERNEL_TEST_SUITE = "AQCPJ9WRzMpKQHIsPo8no3XJpUydcDCjw7VJy8lG1MCZ3g";
exports.KERNEL_HELPER_MODULE = "AQCoaLP6JexdZshDDZRQaIwN3B7DqFjlY7byMikR7u1IEA";
exports.TEST_KERNEL_SKLINK = "AQDJDoXMJiiEMBxXodQvUV89qtQHsnXWyV1ViQ9M1pMjUg";
const SEED_ENTROPY_WORDS = 13;
const crypto = crypto_1.webcrypto;
function generateSeedPhrase() {
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
        let wordIndex = randNums[i] % libskynet_1.dictionary.length;
        seedWords.push(libskynet_1.dictionary[wordIndex]);
    }
    // Convert the seedWords to a seed.
    let [seed] = seedWordsToSeed(seedWords);
    // Compute the checksum.
    let [checksumOne, checksumTwo, err2] = (0, seed_1.seedToChecksumWords)(seed);
    // Assemble the final seed phrase and set the text field.
    return [...seedWords, checksumOne, checksumTwo].join(" ");
}
exports.generateSeedPhrase = generateSeedPhrase;
function seedWordsToSeed(seedWords) {
    // Input checking.
    if (seedWords.length !== SEED_ENTROPY_WORDS) {
        return [
            new Uint8Array(0),
            `Seed words should have length ${SEED_ENTROPY_WORDS} but has length ${seedWords.length}`,
        ];
    }
    // We are getting 16 bytes of entropy.
    let bytes = new Uint8Array(seed_1.SEED_BYTES);
    let curByte = 0;
    let curBit = 0;
    for (let i = 0; i < SEED_ENTROPY_WORDS; i++) {
        // Determine which number corresponds to the next word.
        let word = -1;
        for (let j = 0; j < libskynet_1.dictionary.length; j++) {
            if (seedWords[i].slice(0, dictionary_1.DICTIONARY_UNIQUE_PREFIX) ===
                libskynet_1.dictionary[j].slice(0, dictionary_1.DICTIONARY_UNIQUE_PREFIX)) {
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
async function login(page, seed = generateSeedPhrase()) {
    await page.goto("http://skt.us");
    let userSeed;
    [userSeed] = (0, libskynet_1.seedPhraseToSeed)(seed);
    let seedHex = (0, libskynet_1.bufToHex)(userSeed);
    await page.evaluate((seed) => {
        window.localStorage.setItem("v1-seed", seed);
    }, seedHex);
    let kernelEntrySeed = (0, libskynet_1.deriveChildSeed)(userSeed, "userPreferredKernel2");
    // Get the registry keys.
    let [keypair, dataKey] = (0, libskynet_1.taggedRegistryEntryKeys)(kernelEntrySeed, "user kernel");
    await (0, libskynetnode_1.overwriteRegistryEntry)(keypair, dataKey, (0, libskynet_1.b64ToBuf)(exports.TEST_KERNEL_SKLINK)[0]);
}
exports.login = login;
async function loadTester(page, port = 8080) {
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
exports.loadTester = loadTester;
class Tester {
    page;
    constructor(page) {
        this.page = page;
    }
    async callModule(id, method, data = {}) {
        return this.page.evaluate(async (id, method, data) => {
            return kernel.callModule(id, method, data);
        }, id, method, data);
    }
}
const tester = (page) => new Tester(page);
exports.tester = tester;
