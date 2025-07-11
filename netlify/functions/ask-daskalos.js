import OpenAI from "openai";
import lunr from "lunr";
import daskalosIndexData from "./daskalos-index.json";
import daskalosDocuments from "./daskalos-documents.json";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ Load the Lunr index
const lunrIndex = lunr.Index.load(daskalosIndexData.index);

// ✅ Search function with top 10 results
function searchIndex(query) {
  try {
    return lunrIndex.search(query).slice(0, 10);
  } catch (e) {
    console.error("Lunr search error:", e);
    return [];
  }
}

// ✅ Map lunr refs to document text with safe truncation
function getTextsFromRefs(refs) {
  const MAX_CHARS_PER_DOC = 1500;
  return refs
    .map(ref => {
      const doc = daskalosDocuments.find(d => d.id === ref.ref);
      if (!doc) return "";
      const text = doc.text || doc.content || "";
      return text.length > MAX_CHARS_PER_DOC
        ? text.slice(0, MAX_CHARS_PER_DOC) + "..."
        : text;
    })
    .filter(t => t && t.trim().length > 50); // Filter out tiny junk
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
    refs = daskalosDocuments.slice(0, 10).map(doc => ({ ref: doc.id }));
  }

  // 🗂 Build context text with global trimming
  const texts = getTextsFromRefs(refs);

  let contextText = '';
  let count = 0;
  for (const t of texts) {
    if (count >= 10) break;
    if ((contextText + '\n\n' + t).length > 8000) break;
    contextText += `\n\n${count + 1}. ${t.trim()}`;
    count++;
  }

  if (!contextText) {
    contextText = "No relevant context found in the archive.";
  }

  // ✅ Log context for debugging
  console.log("==== GPT CONTEXT SENT ====");
  console.log(contextText);

  // 🧠 Build the prompt
  const messages = [
    {
      role: "system",
      content: `
You are Daskalos, a spiritual teacher. 
Answer ONLY using the context below. 
If you truly cannot answer, say "I don't know." 
Be as helpful and complete as possible within the context.

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
      model: "gpt-3.5-turbo",
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
