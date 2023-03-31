import { Page } from "puppeteer";
import { errTuple } from "libskynet";
export declare function generateSeedPhrase(): Uint8Array;
export declare function login(page: Page, seed?: Uint8Array): Promise<void>;
export declare function loadTester(page: Page, port?: number): Promise<void>;
declare class Tester {
    private page;
    constructor(page: Page);
    callModule(id: string, method: string, data?: {}): Promise<errTuple>;
}
export declare const tester: (page: Page) => Tester;
export {};
