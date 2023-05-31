import FormatValidator from "../classes/format-validator";

const validator = new FormatValidator();

type ChunkType = {
  role: string;
  content: string;
};

type ExtendedConstrainedResult = ConstrainedResult | "yes" | "no";
type ConstrainedResult = ValidatorResult<string> | Array<string> | boolean;

interface ValidatorResult<T = any> {
  list?: T[];
  bool?: boolean;
}

interface Message {
  role: string;
  content: string;
}

function isValidList(obj: any): obj is { list: any[] } {
  return !!obj.list;
}

function isValidatorResultWithStringList(
  obj: any
): obj is ValidatorResult<string> {
  return obj && typeof obj.list !== "undefined";
}

async function createChatCompletion(
  messages: any,
  queryFunc: any,
  options = {},
  maxRetries = 5,
  initialDelay = 1000,
  maxDelay = 60000
): Promise<any> {
  let delay = initialDelay;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await queryFunc(messages, options);
      return response;
    } catch (error) {
      const jitter = Math.random() * 0.2 * delay;
      const waitTime = Math.min(delay + jitter, maxDelay);
      if (attempt < maxRetries) {
        console.log(
          `Retrying GPT query ( ${waitTime} ms delay... ), Error:`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        console.log("done waiting");
        delay *= 2;
      } else {
        throw new Error(
          `Max retries reached (${maxRetries}). Failed to create chat completion.`
        );
      }
    }
  }
}

const trackers: Tracker[] = [];
let uniqueId = 0;

class Tracker {
  id: number;
  nodes: Array<{ name: string; timestamp: number; details?: any }>;

  constructor() {
    trackers.push(this);
    this.id = uniqueId;
    uniqueId++;
    this.nodes = [];
  }

  addNode(name: string, details?: any) {
    this.nodes.push({
      name,
      timestamp: new Date().getTime(),
      ...(details ? { details } : {}),
    });
  }
}

/**
 * A class for interacting with the GPT.
 */
class LLMGenie {
  jobs: any[];
  queryFunc: Function;
  encode: Function;
  maxAttempts: number;
  currentQueryCount: number;
  maxQueryCount: number;
  modelConfig: any;
  /**
   * Constructs a GPT instance.
   */
  constructor(settings) {
    this.jobs = [];
    this.maxAttempts = 10;
    this.currentQueryCount = 0;
    this.maxQueryCount = 250;
    this.queryFunc = settings.queryFunc;
    this.encode = settings.encode;
    // Store model configuration
    this.modelConfig = settings.modelConfig;
  }

  /**
   * Query the GPT model with given settings and tracker returns the generated results.
   * @param {Object} settings
   * @param {Tracker?} tracker
   * @returns {Promise<Array<String> | string>}
   */
  async query(
    settings: any = { primaryContent: false },
    tracker?: Tracker
  ): Promise<string | Array<string>> {
    if (!tracker) {
      tracker = new Tracker();
    }
    const defaults = {
      debug: true,
      systemPrompt: false,
      summarize: false,
      topP: 1,
      maxQueryResponseTokens: false,
      improve: {
        passes: 0,
        maintainLength: false,
      },
      preContent: "",
      postContent: "",
      ...settings,
    };
    console.log("query defaults", defaults);
    let preContent = defaults.preContent;
    if (!preContent) preContent = "";
    if (preContent.length > 0) preContent += "\n";
    let primaryContent = defaults.primaryContent;
    let postContent = defaults.postContent;
    if (!postContent) postContent = "";
    if (postContent.length > 0) postContent = "\n" + postContent;
    this.currentQueryCount++;
    if (this.currentQueryCount > this.maxQueryCount)
      throw new Error("Safety error: currentQueryCount > maxQueryCount");

    // Use the modelConfig provided by the user
    const maxModelTokens = this.modelConfig.maxModelTokens;
    let maxQueryResponseTokens;
    if (defaults.maxQueryResponseTokens)
      maxQueryResponseTokens = Math.min(
        maxModelTokens,
        defaults.maxQueryResponseTokens
      );
    else maxQueryResponseTokens = Math.round(maxModelTokens / 2);
    let chunks: string[] = [];

    let preContentTokens;
    if (!preContent || preContent.length === 0) preContentTokens = 0;
    else preContentTokens = this.encode(preContent).length;

    let primaryContentTokens;
    if (!primaryContent || primaryContent.length === 0)
      throw new Error(
        `primaryContent must be a non-empty string: ${primaryContent}`
      );
    else primaryContentTokens = this.encode(primaryContent).length;

    let postContentTokens;
    if (!postContent || postContent.length === 0) postContentTokens = 0;
    else postContentTokens = this.encode(postContent).length;

    let allTokens = preContentTokens + primaryContentTokens + postContentTokens;
    let usedTokens = allTokens + maxQueryResponseTokens;

    let currentChunkTokens = 0;
    let chunkStartIndex = 0;

    for (let i = 0; i < primaryContent.length; i++) {
      currentChunkTokens =
        this.encode(primaryContent.slice(chunkStartIndex, i)).length +
        preContentTokens +
        postContentTokens;

      if (
        currentChunkTokens + maxQueryResponseTokens > maxModelTokens ||
        i === primaryContent.length - 1
      ) {
        let chunk = primaryContent.slice(chunkStartIndex, i);
        if (chunkStartIndex > 0) {
          chunk += " [text truncated]\n";
        }
        let chunkWithContent = "";

        if (preContent.length > 0) chunkWithContent += preContent + "\n";
        chunkWithContent += chunk;
        if (postContent.length > 0) chunkWithContent += postContent;
        chunks.push(chunkWithContent);
        chunkStartIndex = i;
      }
    }

    const chatChunks: ChunkType[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      chatChunks.push({ role: "user", content: chunk });
    }

    console.log(
      `GPT Query:\n\nsystemPrompt (\n\n${defaults.systemPrompt}\n\n)\n\npreContent (\n\n${preContent}\n\n)\n\nprimaryContent (\n\n${primaryContent}\n\n)\n\npostContent (\n\n${postContent}\n\n)\n\n ...breakdown: usedTokens:`,
      usedTokens,
      "\nallTokens:",
      `${allTokens} = preContentTokens (${preContentTokens}) + primaryContentTokens (${primaryContentTokens}) + postContentTokens (${postContentTokens})`,
      "\nmaxModelTokens:",
      maxModelTokens,
      "\nmaxQueryResponseTokens:",
      maxQueryResponseTokens,
      "\nchunks:",
      chunks
    );

    const results: string[] = [];
    for (let i = 0; i < chatChunks.length; i++) {
      const chunk = chatChunks[i];
      const messages: Message[] = [];
      if (defaults.systemPrompt)
        messages.push({ role: "system", content: defaults.systemPrompt });
      messages.push(chunk);
      const options = {
        max_tokens: maxQueryResponseTokens,
        temperature: defaults.temperature,
      };
      if (defaults.topP) options["top_p"] = defaults.topP;
      if (defaults.maxQueryResponseTokens)
      options["max_tokens"] = defaults.maxQueryResponseTokens;
      if (defaults.temperature) options["temperature"] = defaults.temperature;
      const response = await createChatCompletion(messages, this.queryFunc, options);
      console.log("response", response);
      results.push(response.content);
      tracker.addNode("query", {
        usage: response.usage,
      });
    }

    if (defaults.improve.passes > 0) {
      console.log("Fact checking...");
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        console.log(`Fact check of result:\n\n${result}`);
        const revised = await this.improve({
          input: result,
          passes: defaults.improve.passes,
          maintainLength: defaults.improve.maintainLength,
        });
        console.log(`Revision:\n\n${revised}`);
      }
    }

    if (defaults.summarize) {
      const result = await this.summarizeCompletionSet(results);
      console.log(`Summarized query result:\n${result}`);
      return result;
    }
    console.log(`Raw query results:`, results);
    return results;
  }

  /**
   * Summarizes the input completion set.
   * @param {Array<string>} completionSet
   * @param {boolean} polish
   * @param {Tracker} tracker
   * @returns {Promise<string>}
   */
  async summarizeCompletionSet(
    completionSet: Array<string>,
    polish = false,
    tracker?: Tracker
  ): Promise<string> {
    let summary: string;
    if (!tracker) {
      tracker = new Tracker();
    }
    tracker.addNode("summarizeCompletionSet");
    if (completionSet.length > 1) {
      let combinationPrompt =
        "The following texts are responses based on chunks of the same input text. Combine the texts into a single, overarching summary, broken into paragraphs. Preserve as many details as possible and even elaborate on any vague concepts:\n\n";
      let content = "";
      completionSet.forEach((completion) => {
        content += completion + "\n\n";
      });

      const combinationResult = await this.query({
        primaryContent: content,
        systemPrompt: combinationPrompt,
      });

      // Wrap single string result to an Array.
      const combinationCompletions = Array.isArray(combinationResult)
        ? combinationResult
        : [combinationResult];
      summary = combinationCompletions[0];

      if (polish) {
        let polishPrompt =
          "Rephrase the following text without losing any detail, but with elaboration and professional wording.";
        let polishedCompletions = await this.query({
          primaryContent: summary,
          systemPrompt: polishPrompt,
        });
        summary = polishedCompletions[0];
      }

      if (polish && summary.length > 1500) {
        const separationPrompt = `Break the following text into separate paragraphs and remove any duplicate or redundant information:\n\n`;
        let separationCompletions = await this.query({
          primaryContent: summary,
          systemPrompt: separationPrompt,
        });
        summary = separationCompletions[0];
      }

      // Recursive call if the result of this.query is longer than one item
      if (combinationCompletions.length > 1) {
        summary = await this.summarizeCompletionSet(
          combinationCompletions,
          polish
        );
      }
    } else {
      summary = completionSet[0];
    }

    return summary;
  }

  /**
   * Query GPT model with given settings and tracker for valid output, returns the generated result.
   * @param {Object} settings
   * @param {Tracker} tracker
   * @returns {Promise<ValidatorResult | Array<any>>}
   */
  async queryValid(
    settings: any,
    tracker?: Tracker
  ): Promise<ExtendedConstrainedResult> {
    if (!tracker) {
      tracker = new Tracker();
    }
    tracker.addNode("queryValid");

    const {
      preContent = false,
      postContent = false,
      maxQueryResponseTokens = false,
      constraintType = "numbered",
      debug = false,
      ...rest
    } = settings;

    const receivedSettings = {
      preContent,
      postContent,
      maxQueryResponseTokens,
      constraintType,
      debug,
      ...rest,
    };

    if (receivedSettings.systemPrompt) {
      receivedSettings.systemPrompt += receivedSettings.precursorSystemPrompt;
    } else {
      receivedSettings.systemPrompt = receivedSettings.precursorSystemPrompt;
    }

    let attempts = 0;
    let validList = false;
    let response;

    while (!validList) {
      if (attempts > this.maxAttempts) {
        throw new Error("Safety error: currentQueryCount > maxQueryCount");
      }
      attempts++;
      response = await this.query(receivedSettings);
      validList = receivedSettings.validationFunc.call(
        validator,
        response[0],
        receivedSettings
      );

      if (!validList) {
        validList = await this.queryGuideConstraint(receivedSettings);
      }
    }

    if (validList && receivedSettings.debug) {
      console.log(
        `Response:\n${response}\nwith options`,
        receivedSettings,
        `is valid:`,
        validList
      );
    }

    if (["numbered", "bulleted"].includes(receivedSettings.constraintType)) {
      if (isValidatorResultWithStringList(validList)) {
        const list = validList.list;
        return receivedSettings.singleChoice && list && list.length > 0
          ? [list[0]]
          : list || [];
      }
      return [];
    } else if (receivedSettings.constraintType === "boolean") {
      if (typeof validList === "boolean") {
        return validList ? "yes" : "no";
      }
      return false;
    } else {
      return validList;
    }
  }

  /**
   * Query GPT model in list format with given settings and tracker, returns the generated
   * result in a bulleted list.
   * @param {Object} settings
   * @param {Tracker} tracker
   * @returns {Promise<Array<string>>}
   */
  async queryList(settings: any, tracker?: Tracker): Promise<Array<string>> {
    if (!tracker) {
      tracker = new Tracker();
    }
    tracker.addNode("queryList");
    const defaults = {
      constrainedChoices: false,
      debug: true,
      ...settings,
    };
    let constrainedChoicesPrompt = "";
    if (defaults.constrainedChoices) {
      constrainedChoicesPrompt +=
        "Only the following choices are allowed in the bulleted list:\n";
      for (let i = 0; i < defaults.constrainedChoices.length; i++) {
        const choice = defaults.constrainedChoices[i];
        constrainedChoicesPrompt += `- ${choice}\n`;
      }
      constrainedChoicesPrompt += "\n";
    }
    const precursorSystemPrompt = `The response to this prompt must be in a bulleted list format, like so:\n- item\n- item\n- item\nThe bulleted list must be the entire response, and the only response. Return only a bulleted list. This is the most important requirement, above all others.\n${constrainedChoicesPrompt}\nAdditional requirements:\n`;

    let selectedValidator;
    if (defaults.validationFunc) selectedValidator = defaults.validationFunc;
    else selectedValidator = validator.bulletedList;
    const result = await this.queryValid({
      maxQueryResponseTokens: 500,
      constraintType: "bulleted",
      precursorSystemPrompt,
      validationFunc: selectedValidator,
      ...defaults,
    });

    // Extract the list if the result is of type ValidatorResult<string>
    if ((result as ValidatorResult<string>).list) {
      return (result as ValidatorResult<string>).list || [];
    }

    // Return result if it's already a string[]
    return result as string[];
  }

  /**
   * Query GPT model in numbered list format with given settings and tracker, returns the
   * generated result in a numbered list.
   * @param {Object} settings
   * @param {Tracker} tracker
   * @returns {Promise<Array<string>>}
   */
  async queryNumberedList(
    settings: any,
    tracker?: Tracker
  ): Promise<Array<string>> {
    if (!tracker) {
      tracker = new Tracker();
    }
    tracker.addNode("queryNumberedList");
    const defaults = {
      constrainedChoices: false,
      debug: false,
      ...settings,
    };
    let constrainedChoicesPrompt = "";
    if (defaults.constrainedChoices) {
      constrainedChoicesPrompt +=
        "Only the following choices are allowed in the numbered list, and they must be copied verbatim, and the order can be modified. If the order is changed, the number associated with the choice must be changed accordingly.  Changing the choices by even one character will invalidate the output:\n";
      (defaults.constrainedChoices as any[]).forEach((choice, i) => {
        constrainedChoicesPrompt += `${i}. ${choice}\n`;
      });
      constrainedChoicesPrompt += "\n";
    }
    const precursorSystemPrompt = `The response to this prompt must be in a numbered list format, like so:\n1. item\n2. item\n3. item\nThe numbered list must be the entire response, and the only response. Return only a numbered list.\n${constrainedChoicesPrompt}\nAdditional requirements:\n`;
    const selectedValidator = validator.numberedList;
    return (await this.queryValid({
      maxQueryResponseTokens: 500,
      constraintType: "numbered",
      precursorSystemPrompt,
      validationFunc: selectedValidator,
      ...defaults,
    })) as string[];
  }

  /**
   * Query GPT model for boolean output with given settings and tracker, returns "yes" or "no".
   * @param {Object} settings
   * @param {Tracker} tracker
   * @returns {Promise<string>}
   */
  async queryBoolean(settings: any, tracker?: Tracker): Promise<boolean> {
    if (!tracker) {
      tracker = new Tracker();
    }
    tracker.addNode("queryBoolean");
    const defaults = {
      ...settings,
      debug: true,
    };
    const precursorSystemPrompt = `Respond by choosing only "yes" or "no"\nThe output strictly must be a single bullet 'yes' or 'no' depending on the answer to the question.`;

    const result: string = (await this.queryValid({
      maxQueryResponseTokens: 100,
      constraintType: "boolean",
      precursorSystemPrompt,
      validationFunc: validator.yesNo,
      ...defaults,
    })) as string;
    return result === "yes";
  }

  /**
   * Query GPT model to guide and transform output to meet constraint requirements with given
   * settings and tracker, returns the generated result.
   * @param {Object} settings
   * @param {Tracker} tracker
   * @returns {Promise<any>}
   */
  async queryGuideConstraint(settings: any, tracker?: Tracker): Promise<any> {
    if (!tracker) {
      tracker = new Tracker();
    }
    tracker.addNode("queryGuideConstraint");

    const defaults = {
      debug: true,
      singleChoice: false,
      temperature: 0.7,
      ...settings,
    };
    const constraintType = defaults.constraintType;
    const primaryContent = defaults.primaryContent;
    const preContent = defaults.preContent;
    const postContent = defaults.postContent;

    const numberedListPrompt = `The response to this prompt must be in a numbered list format, like so:\n1. item\n2. item\n3. item\nThe numbered list must be the entire response, and the only response. Return only a numbered list.`;

    const bulletedListPrompt = `The response to this prompt must be in a bulleted list format, like so:\n- item\n- item\n- item\nThe bulleted list must be the entire response, and the only response. Return only a culleted list.`;

    const booleanPrompt = `The response to this prompt must be yes or no, like:\nyes\nor like:\nno\nThe yes or no must be the entire response.  Return only a single word: yes or no.`;

    let systemPrompt = `The text does not match the required format. Please correct the format based on the following formatting requirements:\n`;

    let validationFunc;

    if (constraintType == "bulleted") {
      systemPrompt += bulletedListPrompt;
      validationFunc = validator.bulletedList;
    } else if (constraintType == "numbered") {
      systemPrompt += numberedListPrompt;
      validationFunc = validator.numberedList;
    } else if (constraintType == "boolean") {
      systemPrompt += booleanPrompt;
      validationFunc = validator.yesNo;
    } else {
      throw new Error(
        "Parameter Error: settings.constraintType is either not defined or does not match one of the expected values: bulleted, numbered."
      );
    }

    let attempts = 0;
    const maxAttempts = 5;
    let validFormat = false;

    while (!validFormat) {
      if (attempts > maxAttempts) {
        throw new Error(
          "Safety Error: Exceeded maximum attempts to generate a valid list."
        );
      }
      attempts++;

      const response = await this.query({
        primaryContent: primaryContent,
        preContent: preContent,
        postContent: postContent,
        temperature: defaults.temperature,
        systemPrompt,
      });
      defaults.temperature = Math.min(1, defaults.temperature + 0.1);

      const boundValidationFunc = validationFunc.bind(validator);
      const valid = boundValidationFunc(response[0], defaults);

      if (valid) {
        validFormat = true;
        if (defaults.constrainedChoices) {
          if (
            !validator.constrainedArray(
              isValidList(valid) ? valid.list : [],
              defaults.constrainedChoices,
              {
                debug: defaults.debug,
                singleChoice: defaults.singleChoice,
              }
            )
          ) {
            validFormat = false;
            continue;
          }
        }
      }
      return valid;
    }
  }

  /**
   * Improve the input text with given settings and tracker, returns the improved result.
   * @param {Object} settings
   * @param {Object} tracker
   * @returns {String}
   */
  async improve(
    settings: {
      input: string;
      maintainLength?: boolean;
      maintainStyle?: boolean;
      passes?: number;
    },
    tracker?: Tracker
  ): Promise<string> {
    if (!tracker) {
      tracker = new Tracker();
    }
    tracker.addNode("improve");
    const defaults = {
      maintainLength: false,
      passes: 1,
      ...settings,
    };

    if (!defaults.input)
      throw new Error(
        "Input must be provided to the improve settings argument."
      );

    let input = defaults.input;
    const maintainLength = defaults.maintainLength;
    const maintainStyle = defaults.maintainStyle;
    const passes = defaults.passes;

    let revisedInput = input;

    for (let pass = 0; pass < passes; pass++) {
      const assumptions = await this.queryList({
        primaryContent: `Input:\n"${input}"`,
        systemPrompt: `Break the following input into a list of facts, assertions, or controversial ideas assumed by the author: `,
      });

      console.log("assumptions", assumptions);

      const resolutions = await Promise.all(
        assumptions.map(async (assumption) => {
          const resolution = await this.query({
            primaryContent: `Consider alternative perspectives, self-reflect on alternative perspectives, possibilities, mistakes, and biases, and write about them, weighing the validity of each one against the original information for concern: "${assumption}"`,
            summarize: true,
          });

          console.log("assumption:", assumption);
          console.log("resolution:", resolution);

          return resolution;
        })
      );

      const resolutionsText = resolutions.join("\n\n");
      console.log("resolutionsText", resolutionsText);

      const result = await this.query({
        preContent: `When considering the revisions, keep in mind this analysis:`,
        primaryContent: `${resolutionsText}`,
        postContent: `Decide on the most reasonable, accurate, and concise way to modify the revised input with that information in mind.`,
        systemPrompt: `Reconcile these considerations with the original input:\n\n${revisedInput}`,
        summarize: true,
      });

      revisedInput = Array.isArray(result) ? result.join(", ") : result;

      console.log("revisedInput", revisedInput);

      if (maintainLength) {
        console.log("maintaining length...");
        const targetLength = input.length;

        const shorten = async (text: string): Promise<string> => {
          const shorterText = await this.query({
            primaryContent: `Shorten the text "${text}" while keeping as much detail as possible.`,
            summarize: true,
          });

          const shorterTextStr = Array.isArray(shorterText)
            ? shorterText.join(", ")
            : shorterText;

          console.log("Shortening:\n", text);
          console.log("shorterText:\n", shorterTextStr);

          if (shorterTextStr.length > targetLength) {
            return await shorten(shorterTextStr);
          } else {
            return shorterTextStr;
          }
        };

        revisedInput = await shorten(revisedInput);
      }
    }

    if (maintainStyle) {
      console.log("maintaining style...");

      const restyle = async (text: string): Promise<string> => {
        const isSimilar = await this.queryBoolean({
          primaryContent: `Is the modified text: "${text}" very similar in style in flow to the original text? Original text: "${input}"`,
        });

        if (!isSimilar) {
          const restyledText = await this.query({
            primaryContent: `Rephrase the text: "${text}" to be as similar in style and flow to the original text, while maintaining as much of the meaning as possible. Original text: "${input}"`,
            summarize: true,
          });
          const restyledTextStr = Array.isArray(restyledText)
            ? restyledText.join(", ")
            : restyledText;
          restyle(restyledTextStr);
        } else {
          return text;
        }
      };
      revisedInput = await restyle(revisedInput);
    }

    return revisedInput;
  }
}

export default LLMGenie;