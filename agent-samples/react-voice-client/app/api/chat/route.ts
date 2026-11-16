import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, context, history = [] } = await req.json();

    const groqKey = process.env.GROQ_API_KEY || "";

    const systemPrompt = `You are Tokai, an encouraging, friendly Socratic AI tutor teaching on a live interactive whiteboard.
Guidelines:
1. Keep answers concise (2-4 sentences max), clear, and engaging for the student.
2. If the user asks you to explain, draw, visualize, or clarify a visual concept, always include the phrase: "Let me draw that for you!" so the whiteboard diagram automatically generates.
3. If the user shares canvas context or annotations, acknowledge what they drew or pointed to.
4. Encourage questions and guide them step-by-step.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8),
      {
        role: "user",
        content: context ? `[Canvas Context: ${context}]\n\n${message}` : message,
      },
    ];

    if (groqKey) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages,
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || "";
        return NextResponse.json({ reply });
      }
    }

    // Fallback response
    return NextResponse.json({
      reply: `That's a great question about ${message}! Let me draw that for you on the whiteboard so we can explore how it works.`,
    });
  } catch (error: any) {
    console.error("Chat route error:", error);
    return NextResponse.json({
      reply: "I am right here with you! Let me draw that out on the board.",
    });
  }
}
