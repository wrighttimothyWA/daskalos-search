import OpenAI from "openai";
import daskalosIndex from "./daskalos-index.json";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple search
function searchIndex(query, index) {
  const words = query.toLowerCase().split(/\s+/);
  return index
    .map(entry => {
      const text = entry.text.toLowerCase();
      let score = 0;
      words.forEach(word => {
        if (text.includes(word)) score += 1;
      });
      return { ...entry, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
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
  const results = searchIndex(question, daskalosIndex);
  const contextText = results.map((r, i) => `${i + 1}. ${r.text}`).join("\n\n");

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
