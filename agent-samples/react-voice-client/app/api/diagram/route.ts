import { NextRequest, NextResponse } from "next/server";

function generateProceduralSvg(topic: string): string {
  const cleanTopic = topic.trim() || "Concept Map";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 450" width="700" height="450" style="background:#f8fafc; font-family:system-ui, sans-serif;">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1b4d3e" />
      <stop offset="100%" stop-color="#2d6a4f" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a9d8f" />
      <stop offset="100%" stop-color="#52b788" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1" />
    </filter>
  </defs>

  <!-- Connectors -->
  <path d="M 350 140 C 350 200, 180 210, 180 270" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-dasharray="6,4" />
  <path d="M 350 140 C 350 200, 350 210, 350 270" fill="none" stroke="#94a3b8" stroke-width="2.5" />
  <path d="M 350 140 C 350 200, 520 210, 520 270" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-dasharray="6,4" />

  <!-- Central Topic -->
  <g filter="url(#shadow)">
    <rect x="220" y="60" width="260" height="80" rx="16" fill="url(#primaryGrad)" />
    <text x="350" y="98" fill="#ffffff" font-size="19" font-weight="700" text-anchor="middle">${cleanTopic.toUpperCase()}</text>
    <text x="350" y="122" fill="#a7f3d0" font-size="12" text-anchor="middle">Core Learning Objective</text>
  </g>

  <!-- Node 1: Fundamentals -->
  <g filter="url(#shadow)">
    <rect x="80" y="270" width="200" height="90" rx="14" fill="#ffffff" stroke="#2a9d8f" stroke-width="2" />
    <circle cx="110" cy="300" r="10" fill="#2a9d8f" />
    <text x="130" y="305" fill="#1b4d3e" font-size="15" font-weight="700">Fundamentals</text>
    <text x="100" y="335" fill="#64748b" font-size="12">Key concepts &amp; principles</text>
  </g>

  <!-- Node 2: Core Mechanism -->
  <g filter="url(#shadow)">
    <rect x="250" y="270" width="200" height="90" rx="14" fill="url(#accentGrad)" />
    <text x="350" y="305" fill="#ffffff" font-size="15" font-weight="700" text-anchor="middle">Mechanisms</text>
    <text x="350" y="335" fill="#e2e8f0" font-size="12" text-anchor="middle">Step-by-step process</text>
  </g>

  <!-- Node 3: Applications -->
  <g filter="url(#shadow)">
    <rect x="420" y="270" width="200" height="90" rx="14" fill="#ffffff" stroke="#f59e0b" stroke-width="2" />
    <circle cx="450" cy="300" r="10" fill="#f59e0b" />
    <text x="470" y="305" fill="#92400e" font-size="15" font-weight="700">Applications</text>
    <text x="440" y="335" fill="#64748b" font-size="12">Real-world examples</text>
  </g>
</svg>`;
}

export async function POST(req: NextRequest) {
  try {
    const { topic, context } = await req.json();
    const groqKey = process.env.GROQ_API_KEY || "";

    let svgContent = "";

    if (groqKey) {
      try {
        const prompt = `You are an expert educational illustrator for a live tutoring whiteboard.
Generate a clean, standalone, visually informative SVG diagram explaining: "${topic}".
${context ? `Context from the lesson: "${context}"` : ""}

CRITICAL REQUIREMENTS:
- Output MUST be valid SVG code only (start with <svg and end with </svg>).
- NO markdown formatting, NO backticks (\`\`\`), NO preamble, NO explanations.
- width="700" height="450" viewBox="0 0 700 450"
- Modern educational colors: #1b4d3e (emerald dark), #2a9d8f (teal), #f59e0b (amber), #3b82f6 (blue), #ffffff (white cards), #0f172a (text).
- Include clear boxes, labels, and connecting arrows.`;

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          let text = data.choices?.[0]?.message?.content || "";
          text = text.replace(/```xml/gi, "").replace(/```svg/gi, "").replace(/```/g, "").trim();
          const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
          if (svgMatch) {
            svgContent = svgMatch[0];
          }
        }
      } catch (err) {
        console.warn("Groq SVG diagram generation failed, falling back to procedural:", err);
      }
    }

    if (!svgContent) {
      svgContent = generateProceduralSvg(topic);
    }

    const base64 = Buffer.from(svgContent, "utf-8").toString("base64");

    return NextResponse.json({
      base64,
      mimeType: "image/svg+xml",
    });
  } catch (error: any) {
    console.error("Diagram route error:", error);
    const fallbackSvg = generateProceduralSvg("Educational Concept");
    return NextResponse.json({
      base64: Buffer.from(fallbackSvg, "utf-8").toString("base64"),
      mimeType: "image/svg+xml",
    });
  }
}
