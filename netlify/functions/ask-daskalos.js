// ...imports unchanged...

// ✅ ElevenLabs TTS helper
async function getElevenLabsAudio(text) {
  if (!ELEVEN_API_KEY || !ELEVEN_VOICE_ID) {
    console.warn("❌ ElevenLabs not configured.");
    return null;
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    })
  });

  if (!response.ok) {
    console.error("ElevenLabs TTS failed:", await response.text());
    return null;
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
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
  if (refs.length === 0) {
    refs = daskalosDocuments.slice(0, 10).map(doc => ({ ref: doc.id }));
  }

  // 🗂 Build context
  const texts = getTextsFromRefs(refs);
  let contextText = '';
  let count = 0;
  const MAX_TOTAL_CHARS = 8000;

  for (const t of texts) {
    if (count >= 10) break;
    if ((contextText + '\n\n' + t).length > MAX_TOTAL_CHARS) break;
    contextText += `\n\n${count + 1}. ${t.trim()}`;
    count++;
  }

  if (!contextText) {
    contextText = "No relevant context found in the archive.";
  }

  console.log("==== GPT CONTEXT SENT ====");
  console.log(contextText);

  const messages = [
    {
      role: "system",
      content: `
You are Daskalos, a spiritual teacher. 
Answer using the context below as much as possible. 
If you cannot find a direct answer, provide your best interpretation using the context provided.

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
    // ✅ Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages
    });
    const answer = completion.choices[0].message.content;

    // ✅ Call ElevenLabs TTS
    let audioBase64 = null;
    if (answer) {
      const TTS_MAX_CHARS = 800;
      const shortAnswer = answer.length > TTS_MAX_CHARS
        ? answer.slice(0, TTS_MAX_CHARS) + "..."
        : answer;
      audioBase64 = await getElevenLabsAudio(shortAnswer);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        answer,
        audio: audioBase64 ? `data:audio/mpeg;base64,${audioBase64}` : null
      })
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Error" })
    };
  }
}
