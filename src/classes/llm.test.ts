import assert = require("assert");
import LLMGenie from "./llm";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

describe("LLM", function () {
  this.timeout(0);
  let llm: LLMGenie;
  beforeEach(() => {
    llm = new LLMGenie(
      {
        queryFunc: async (messages, options = {}) => {
          const request = {
            model: "gpt-4-0314", //"gpt-3.5-turbo",
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 1,
            messages: messages,
            ...options,
          };
          return await openai.createChatCompletion(request);
        },
        modelConfig: {
          currentModel: "gpt-4",
          maxModelTokens: 4096,
        }
      },
    );
  });

  describe("query", () => {
    it("should return a non-empty response", async () => {
      const response = await llm.query({
        primaryContent: "What is the capital of France?",
      });
      assert.strictEqual(response.length > 0, true);
    });
  });

  describe("summarizeCompletionSet", () => {
    function isDifferent(summary: string, completions: string[]) {
      return completions.every((completion) => completion !== summary);
    }

    it("should return a single summary from multiple inputs", async () => {
      const completions = [
        "The session was successful, and we achieved our goals.",
        "We made progress in the meeting and fulfilled our objectives.",
      ];
      const summary = await llm.summarizeCompletionSet(completions);
      assert.strictEqual(typeof summary, "string");
    });

    it("should not return an identical input as summary", async () => {
      const completions = [
        "The session was successful, and we achieved our goals.",
        "We made progress in the meeting and fulfilled our objectives.",
      ];
      const summary = await llm.summarizeCompletionSet(completions);
      assert(
        isDifferent(summary, completions),
        "The summary should not be identical to any of the inputs."
      );
    });

    it("should return a summary different from all the given inputs", async () => {
      const completions = [
        "Apple is a technology company that produces iPhones and iPads.",
        "Apple Inc. is known for creating various electronic devices including the iPhone and iPad.",
      ];
      const summary = await llm.summarizeCompletionSet(completions);
      assert(
        isDifferent(summary, completions),
        "The summary should not be identical to any of the inputs."
      );
    });
  });

  describe("queryValid", () => {
    it("should return a valid response", async () => {
      const response = await llm.queryValid({
        primaryContent: "List the colors of the rainbow",
        validationFunc: (resp: string) =>
          resp.includes("red") &&
          resp.includes("blue") &&
          resp.includes("green"),
      });
      assert.strictEqual(response !== undefined, true);
    });
  });

  describe("queryNumberedList", () => {
    it("should return a list response format without numbers", async () => {
      const response = await llm.queryNumberedList({
        primaryContent: "List the top 3 programming languages",
      });
      assert.strictEqual(Array.isArray(response), true);
      response.forEach((item) => {
        assert.strictEqual(item.match(/^\d+\./), null);
      });
    });
  });

  describe("queryList", () => {
    it("should return an array without bulleted elements", async () => {
      const response = await llm.queryList({
        primaryContent: "List the top 3 fruits",
      });
      assert(Array.isArray(response));
      assert.strictEqual(
        response.every((item) => !item.startsWith("-")),
        true
      );
    });
  });

  describe("queryBoolean", () => {
    it("should return a 'yes' or 'no' response", async () => {
      const response = await llm.queryBoolean({
        primaryContent: "Is water wet?",
      });
      assert.strictEqual([true, false].includes(response), true);
    });
  });

  describe("queryGuideConstraint", () => {
    it("should return a valid response", async () => {
      const response = await llm.queryGuideConstraint({
        constraintType: "bulleted",
        primaryContent: "List the top 3 soft drinks",
      });
      assert.strictEqual(response !== undefined, true);
    });
  });

  describe("improve", () => {
    it("should return a revised input with more polish and not identical to the input", async () => {
      const input = "The quick brown fox jumps over the lazy dog.";

      // Run multiple passes and ensure the revised input is different from the input each time
      for (let i = 1; i <= 2; i++) {
        const response = await llm.improve({
          input: input,
          passes: i,
        });
        assert.notStrictEqual(
          input,
          response,
          `Passes: ${i} - Input and output are identical`
        );
      }
    });
  });
});
