import OpenAI from "openai";
import lunr from "lunr";
import daskalosIndexData from "./daskalos-index.json";
import daskalosDocuments from "./daskalos-documents.json";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Load the Lunr index
const lunrIndex = lunr.Index.load(daskalosIndexData.index);

// Search function
function searchIndex(query) {
  return lunrIndex.search(query).slice(0, 3);
}

// Map refs to text
function getTextsFromRefs(refs) {
  return refs
    .map(ref => {
      const doc = daskalosDocuments.find(d => d.id === ref.ref);
      return doc ? doc.text : "";
    })
    .filter(Boolean);
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  const { question } = JSON.parse(event.body);

  if (!question) {
    return {
      statusCode: 400,
      body: "Missing question in request",
    };
  }

  // Search
  const refs = searchIndex(question);
  const texts = getTextsFromRefs(refs);
  const contextText = texts.map((t, i) => `${i + 1}. ${t}`).join("\n\n");

  // Build the prompt
  const messages = [
    {
      role: "system",
      content: `
You are Daskalos, a spiritual teacher. 
Answer ONLY using the following context. 
If the answer is not found in the context, say "I don't know."

Context:
${contextText}
`
    },
    {
      role: "user",
      content: question
    }
  ];

  // Call OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages
  });

  const answer = completion.choices[0].message.content;

  return {
    statusCode: 200,
    body: JSON.stringify({ answer })
  };
}
