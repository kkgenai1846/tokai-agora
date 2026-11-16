import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ description: "" });
    }

    const groqKey = process.env.GROQ_API_KEY || "";

    const prompt = `You are an AI tutor analyzing the student's whiteboard canvas.
Describe what the student drew, annotated, circled, or highlighted in 1-2 concise, natural sentences.
Start directly with "The canvas shows..." or "The student has highlighted...".`;

    if (groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/png;base64,${imageBase64}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.2,
            max_tokens: 150,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const desc = data.choices?.[0]?.message?.content?.trim();
          if (desc) {
            return NextResponse.json({ description: desc });
          }
        }
      } catch (e) {
        console.warn("Groq vision analysis failed:", e);
      }
    }

    return NextResponse.json({
      description: "The student has annotated concepts on the active whiteboard canvas.",
    });
  } catch (error: any) {
    console.error("Canvas analysis error:", error);
    return NextResponse.json({
      description: "Active whiteboard canvas with educational diagram and annotations.",
    });
  }
}
