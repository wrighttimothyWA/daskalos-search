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

  // 🔍 Search with fallback
  let refs = searchIndex(question);

  if (refs.length === 0) {
    // Fallback if nothing found
    refs = daskalosDocuments.slice(0, 3).map(doc => ({ ref: doc.id }));
  }

  // Map refs to texts
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
}
