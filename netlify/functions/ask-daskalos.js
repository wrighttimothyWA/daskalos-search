import OpenAI from "openai";
import lunr from "lunr";
import daskalosIndexData from "./daskalos-index.json";
import daskalosDocuments from "./daskalos-documents.json";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ Load the Lunr index
const lunrIndex = lunr.Index.load(daskalosIndexData.index);

// ✅ Search function with top 3 results
function searchIndex(query) {
  try {
    return lunrIndex.search(query).slice(0, 3);
  } catch (e) {
    console.error("Lunr search error:", e);
    return [];
  }
}

// ✅ Map lunr refs to document text
function getTextsFromRefs(refs) {
  return refs
    .map(ref => {
      const doc = daskalosDocuments.find(d => d.id === ref.ref);
      return doc ? (doc.text || doc.content || "") : "";
    })
    .filter(Boolean);
}

// ✅ Netlify Lambda Handler
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  let question;
  try {
    const body = JSON.parse(event.body);
    question = body.question;
  } catch (err) {
    return {
      statusCode: 400,
      body: "Invalid JSON",
    };
  }

  if (!question) {
    return {
      statusCode: 400,
      body: "Missing question in request",
    };
  }

  // 🔍 Search the index
  let refs = searchIndex(question);

  // ✅ Fallback if no matches found
  if (refs.length === 0) {
    refs = daskalosDocuments.slice(0, 3).map(doc => ({ ref: doc.id }));
  }

  // 🗂 Build context text
  const texts = getTextsFromRefs(refs);
  const contextText = texts
    .slice(0, 3)
    .map((t, i) => `${i + 1}. ${t}`)
    .join("\n\n");

  // 🧠 Build the prompt
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

  try {
    // 🤖 Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages
    });

    const answer = completion.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ answer })
    };
  } catch (error) {
    console.error("OpenAI Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OpenAI request failed" })
    };
  }
}
