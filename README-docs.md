# LLM Genie

LLM Genie is an (ultra light-weight) JavaScript library that simplies advanced usage of Large Language Model APIs such as GPT from OpenAI. It's compatible with browser and Node.js JavaScript runtime environments.


## Browser Usage:

### From a CDN:

<p class="codepen" data-height="700" data-theme-id="dark" data-default-tab="js,result" data-slug-hash="xxyeBaj" data-user="jt0dd1995" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/jt0dd1995/pen/xxyeBaj">
  Untitled</a> by Jonathan Todd (<a href="https://codepen.io/jt0dd1995">@jt0dd1995</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### From NPM:

1. npm install --save llm-genie

## Node.js Usage:

1. Create a folder named `test` and navigate to it in your command prompt of choice. Ensure Node.js is installed. Not sure what that means? [Get started with Node.js](https://nodejs.org/en/docs/guides/getting-started-guide)

2. Install a few dependencies:

npm install dotenv openai

3. Create a file named `.env` with the contents:

```
OPENAI_API_KEY=your key
```

4. Then create a file named `basic.js` with the contents:

```javascript
require('dotenv').config();
const LLMGenie = require("../dist/index.js")
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const encode = require("gpt-3-encoder");

const llm = new LLMGenie({

    // You must supply a query function which will be used by LLMGenie to actually perform
    // the LLM queries.

    queryFunc: async (messages, options = {}) => {
        const request = {
            model: "gpt-4-0314", //"gpt-3.5-turbo",
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 1,
            temperature: 1,
            messages: messages,
            ...options
        }
        return await openai.createChatCompletion(request);
    },
    modelConfig: {
        currentModel: "gpt-4",
        maxModelTokens: 4096,
    }
})

    (async () => {
        const yum = await llm.query({ primaryContent: 'List the steps to make a PB&J sandwich.' })
        console.log('Yum!', yum)

        const mmmm = await llm.queryList({ primaryContent: 'List the steps to make a PB&J sandwich.' })
        console.log('Mmmm!', mmmm)

        const yes = await llm.queryBoolean({ primaryContent: 'Should I make a PB&J sandwich?' })
        console.log('Yes?', yes)

        const help = await llm.queryList({ primaryContent: 'Help! I have all these ingredients and don\'t know which ones to use for a PB&J :(', constrainedChoices: ['mayo', 'mustard', 'jelly', 'peanut butter'] })
        console.log('Help!', help)
    })()
```

5. In your command prompt, run: `node basic.js`.

Questions? Consult the LLM-Genie documentation, and if the guidance there is missing something, feel free to create an issue.

## Build (apply changes) & Generate Documentation

- JSDocs: `npm run build-quick`

## Testing

Run tests with Mocha:

```bash
npm run test
```

## Contributing

Please feel free to open an issue or submit a pull request for any bug fixes, features, or documentation improvements.

## License

LLM Genie is released under the <> License.