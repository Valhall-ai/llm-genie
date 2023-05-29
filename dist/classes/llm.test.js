"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const llm_1 = require("./llm");
const openai_1 = require("openai");
const configuration = new openai_1.Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new openai_1.OpenAIApi(configuration);
describe("LLM", function () {
    this.timeout(0);
    let llm;
    beforeEach(() => {
        llm = new llm_1.LLMGenie({
            queryFunc: (messages, options = {}) => __awaiter(this, void 0, void 0, function* () {
                const request = Object.assign({ model: "gpt-4-0314", temperature: 0.7, max_tokens: 2000, top_p: 1, messages: messages }, options);
                return yield openai.createChatCompletion(request);
            }),
            modelConfig: {
                currentModel: "gpt-4",
                maxModelTokens: 4096,
            }
        });
    });
    describe("query", () => {
        it("should return a non-empty response", () => __awaiter(this, void 0, void 0, function* () {
            const response = yield llm.query({
                primaryContent: "What is the capital of France?",
            });
            assert.strictEqual(response.length > 0, true);
        }));
    });
    describe("summarizeCompletionSet", () => {
        function isDifferent(summary, completions) {
            return completions.every((completion) => completion !== summary);
        }
        it("should return a single summary from multiple inputs", () => __awaiter(this, void 0, void 0, function* () {
            const completions = [
                "The session was successful, and we achieved our goals.",
                "We made progress in the meeting and fulfilled our objectives.",
            ];
            const summary = yield llm.summarizeCompletionSet(completions);
            assert.strictEqual(typeof summary, "string");
        }));
        it("should not return an identical input as summary", () => __awaiter(this, void 0, void 0, function* () {
            const completions = [
                "The session was successful, and we achieved our goals.",
                "We made progress in the meeting and fulfilled our objectives.",
            ];
            const summary = yield llm.summarizeCompletionSet(completions);
            assert(isDifferent(summary, completions), "The summary should not be identical to any of the inputs.");
        }));
        it("should return a summary different from all the given inputs", () => __awaiter(this, void 0, void 0, function* () {
            const completions = [
                "Apple is a technology company that produces iPhones and iPads.",
                "Apple Inc. is known for creating various electronic devices including the iPhone and iPad.",
            ];
            const summary = yield llm.summarizeCompletionSet(completions);
            assert(isDifferent(summary, completions), "The summary should not be identical to any of the inputs.");
        }));
    });
    describe("queryValid", () => {
        it("should return a valid response", () => __awaiter(this, void 0, void 0, function* () {
            const response = yield llm.queryValid({
                primaryContent: "List the colors of the rainbow",
                validationFunc: (resp) => resp.includes("red") &&
                    resp.includes("blue") &&
                    resp.includes("green"),
            });
            assert.strictEqual(response !== undefined, true);
        }));
    });
    describe("queryNumberedList", () => {
        it("should return a list response format without numbers", () => __awaiter(this, void 0, void 0, function* () {
            const response = yield llm.queryNumberedList({
                primaryContent: "List the top 3 programming languages",
            });
            assert.strictEqual(Array.isArray(response), true);
            response.forEach((item) => {
                assert.strictEqual(item.match(/^\d+\./), null);
            });
        }));
    });
    describe("queryList", () => {
        it("should return an array without bulleted elements", () => __awaiter(this, void 0, void 0, function* () {
            const response = yield llm.queryList({
                primaryContent: "List the top 3 fruits",
            });
            assert(Array.isArray(response));
            assert.strictEqual(response.every((item) => !item.startsWith("-")), true);
        }));
    });
    describe("queryBoolean", () => {
        it("should return a 'yes' or 'no' response", () => __awaiter(this, void 0, void 0, function* () {
            const response = yield llm.queryBoolean({
                primaryContent: "Is water wet?",
            });
            assert.strictEqual([true, false].includes(response), true);
        }));
    });
    describe("queryGuideConstraint", () => {
        it("should return a valid response", () => __awaiter(this, void 0, void 0, function* () {
            const response = yield llm.queryGuideConstraint({
                constraintType: "bulleted",
                primaryContent: "List the top 3 soft drinks",
            });
            assert.strictEqual(response !== undefined, true);
        }));
    });
    describe("improve", () => {
        it("should return a revised input with more polish and not identical to the input", () => __awaiter(this, void 0, void 0, function* () {
            const input = "The quick brown fox jumps over the lazy dog.";
            // Run multiple passes and ensure the revised input is different from the input each time
            for (let i = 1; i <= 2; i++) {
                const response = yield llm.improve({
                    input: input,
                    passes: i,
                });
                assert.notStrictEqual(input, response, `Passes: ${i} - Input and output are identical`);
            }
        }));
    });
});
//# sourceMappingURL=llm.test.js.map