import { Page } from "puppeteer";
import { errTuple } from "libskynet/dist";
export declare const KERNEL_TEST_SUITE = "AQCPJ9WRzMpKQHIsPo8no3XJpUydcDCjw7VJy8lG1MCZ3g";
export declare const KERNEL_HELPER_MODULE = "AQCoaLP6JexdZshDDZRQaIwN3B7DqFjlY7byMikR7u1IEA";
export declare const TEST_KERNEL_SKLINK = "AQDJDoXMJiiEMBxXodQvUV89qtQHsnXWyV1ViQ9M1pMjUg";
export declare function generateSeedPhrase(): string;
export declare function login(page: Page, seed?: string): Promise<void>;
export declare function loadTester(page: Page, port?: number): Promise<void>;
declare class Tester {
    private page;
    constructor(page: Page);
    callModule(id: string, method: string, data?: {}): Promise<errTuple>;
}
export declare const tester: (page: Page) => Tester;
export {};
