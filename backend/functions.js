const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const aposToLexForm = require("apos-to-lex-form");
const natural = require("natural");
const asyncc = require("async");
const SW = require("stopword");
const SpellCorrector = require("spelling-corrector");
// const { translate } = require("free-translate");
const translate = require("@iamtraction/google-translate");

const spellCorrector = new SpellCorrector();
spellCorrector.loadDictionary();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function gpt(prompt, temperature = 0, stop = ["\n"]) {
  // const messages = [
  //   {
  //     role: "system",
  //     content: promptTemplate
  //   },
  //   {
  //     role: "user",
  //     content: `Here are the comments that need to be simplified:
  //     ${comments
  //       .map(
  //         (comment, index) =>
  //           `id: ${comment.id}, comment_no.: ${index + 1}, comment: ${
  //             comment.text
  //           }`
  //       )
  //       .join(
  //         "; "
  //       )}. Please return simplified comments grouped by their similarities.`
  //   }
  // ];

  const messages = [
    {
      role: "system",
      content: prompt
    }
  ];

  const chatCompletion = await openai.chat.completions.create({
    // model: "ft:gpt-3.5-turbo-0125:personal:commentgpt:9UsykgOR",
    model: "gpt-3.5-turbo",
    messages: messages,
    temperature: temperature,
    stop: stop
    // functions: custom_functions,
    // function_call: "auto"
  });

  const responseText = chatCompletion.choices[0].message.content;
  // const responseText =
  //   chatCompletion.choices[0].message.function_call.arguments;

  // return JSON.parse(responseText);
  return responseText;
}

async function gemini(prompt) {
  // Access your API key as an environment variable (see "Set up your API key" above)

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "gemini-1.0-pro"
    // tools: {
    //   functionDeclarations: [getGroupCommentsWithSimplified]
    // }
  });

  const { response } = await model.generateContent(
    prompt
    // , {
    // toolConfig: { functionCallingConfig: "ANY" }
    // }
  );

  // console.log("response", response.text());
  return response.text();
  // fc = response.candidates[0].content.parts[0].functionCall.args.comments;
  // return fc;
}

function isQuestion(comment) {
  if (comment.includes("?")) {
    return true;
  }

  const lowercaseComment = comment.toLowerCase();

  if (
    lowercaseComment.startsWith("what") ||
    lowercaseComment.startsWith("how") ||
    lowercaseComment.startsWith("when") ||
    lowercaseComment.startsWith("where") ||
    lowercaseComment.startsWith("which") ||
    lowercaseComment.startsWith("why") ||
    lowercaseComment.startsWith("who") ||
    lowercaseComment.startsWith("were") ||
    lowercaseComment.startsWith("are") ||
    lowercaseComment.startsWith("is") ||
    lowercaseComment.startsWith("can") ||
    lowercaseComment.startsWith("could") ||
    lowercaseComment.startsWith("will") ||
    lowercaseComment.startsWith("would") ||
    lowercaseComment.startsWith("should") ||
    lowercaseComment.startsWith("does") ||
    lowercaseComment.startsWith("do") ||
    lowercaseComment.startsWith("did") ||
    lowercaseComment.startsWith("tell") ||
    lowercaseComment.startsWith("if") ||
    lowercaseComment.startsWith("have") ||
    lowercaseComment.startsWith("had") ||
    lowercaseComment.startsWith("has")
  ) {
    return true;
  }

  if (
    // lowercaseComment.includes("what") ||
    // lowercaseComment.includes("how") ||
    // lowercaseComment.includes("when") ||
    // lowercaseComment.includes("where") ||
    // lowercaseComment.includes("why") ||
    lowercaseComment.includes("tell") ||
    lowercaseComment.includes("could you") ||
    lowercaseComment.includes("could any") ||
    lowercaseComment.includes("have a question") ||
    lowercaseComment.includes("any suggestion") ||
    lowercaseComment.includes("any advice")
  ) {
    return true;
  }

  return false;
}

function isEnglish(text) {
  // Regex pattern to match English characters (including common punctuation and spaces)
  const englishPattern = /[\u0000-\u007F]/gi;
  return englishPattern.test(text);
}

function removeEmojis(string) {
  const regex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
  return string.replace(regex, "");
}

async function analyzeComment(comment) {
  try {
    // Make a request to the sentiment analysis endpoint

    // const sentiment = await gpt(
    //   `Understand the emotion of '${comment.text}' and  Rewrite in simple words whether its a 'question' or 'negative' or 'positive'.`
    // ).then((response) => response.trim().toLowerCase());

    const text = removeEmojis(comment.text);

    if (text === "" || !text) return "neutrals";

    let translatedText = comment.text;

    if (!isEnglish(comment.text)) {
      translatedText = await translate(comment.text, { to: "en" })
        .then(res => {
          // console.log("original", comment.text); // OUTPUT: You are amazing!
          // console.log("translated", res.text); // OUTPUT: You are amazing!
          // console.log("id", comment.cid); // OUTPUT: You are amazing!

          return res.text;
        })
        .catch(err => {
          console.error("error while translation", err);
        });
    }

    if (isQuestion(translatedText)) return "questions";
    const lexedReview = aposToLexForm(translatedText);
    const casedReview = lexedReview.toLowerCase();
    const alphaOnlyReview = casedReview.replace(/[^a-zA-Z\s]+/g, "");
    const { WordTokenizer } = natural;
    const tokenizer = new WordTokenizer();
    const tokenizedReview = tokenizer.tokenize(alphaOnlyReview);

    tokenizedReview.forEach((word, index) => {
      tokenizedReview[index] = spellCorrector.correct(word);
    });

    const filteredReview = SW.removeStopwords(tokenizedReview);

    const { SentimentAnalyzer, PorterStemmer } = natural;
    const analyzer = new SentimentAnalyzer("English", PorterStemmer, "afinn");
    const analysis = analyzer.getSentiment(filteredReview);

    console.log(analysis);

    if (analysis < 0) {
      return "negatives";
    } else if (analysis > 0) {
      return "positives";
    } else {
      return "neutrals"; // Could not determine sentiment or question
    }
  } catch (e) {
    console.error("Error analyzing comment:", e);
    return e;
  }
}

async function analyzeComments(comments) {
  const categorizedComments = {};

  await asyncc.each(comments, async comment => {
    const category = await analyzeComment(comment);

    if (!categorizedComments[category]) {
      categorizedComments[category] = [];
    }

    categorizedComments[category].push(comment.cid);
  });

  return categorizedComments;
}

const promptTemplate = `### Task: Group and Simplify Comments
You have a collection of comments that need to be processed. Your goal is to group similar comments together and then generate a single, simplified comment for each group. Also ensure no comment should be left ignored, every single one of them should be considered.  Follow the steps outlined below:

#### Step 1: Group Similar Comments

1. *Identify Similarities*: One by one analyze the content of each comment to identify similarities. Consider aspects such as:
   - The main idea or topic.
   - The sentiment (positive, negative, neutral).
   - Specific keywords or phrases.
   - The overall tone or style of the comment.

2. *Create Groups*: Based on the identified similarities, group comments together. Each group should contain comments that convey the same or very similar messages. Do not hallucinate.

#### Step 2: Generate Simplified Comments

1. *Summarize*: For each group of comments, create a single, simplified comment that captures the essence of the group. Ensure that the simplified comment:
   - Uses simple, clear language.
   - Accurately represents the main idea conveyed by the group.
   - Retains the sentiment and key points of the original comments.

2. *Check for Clarity*: Review the simplified comments to ensure they are easy to understand and free of jargon or complex language.

#### Example

*Original Comments:*

- "I love the new update! It’s so user-friendly and intuitive."
- "The update is fantastic, much easier to use now."
- "Great job on the update, it’s much more intuitive."

*Simplified Comment:*

- "The new update is user-friendly and easy to use."

---

*Instructions:*

1. *Input*: Provide the collection of comments.
2. *Process*: Follow the steps outlined above to group and simplify the comments.
3. *Output*: Present the simplified comments, one for each group.

---

*Additional Tips:*

- Ensure that each simplified comment is concise, ideally one or two sentences long.
- Maintain the original intent and tone of the comments as much as possible.
`;

const getGroupCommentsWithSimplified = [
  {
    group_about: "(Group Name based on the questions included in it)",
    group_of_comments: [
      {
        cid: "(cid of question)",
        text: "(text of simplified question)"
      }
    ]
  }
];

module.exports = {
  gpt,
  gemini,
  analyzeComments,
  promptTemplate,
  getGroupCommentsWithSimplified,
  isEnglish
};
