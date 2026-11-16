export interface GeneratedImage {
  base64: string
  mimeType: string
}

export async function generateDiagramImage(
  topic: string,
  conversationContext?: string
): Promise<GeneratedImage | null> {
  try {
    console.log("[Diagram] Requesting diagram generation for topic:", topic);

    const res = await fetch("/api/diagram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        context: conversationContext,
      }),
    });

    if (!res.ok) {
      throw new Error(`Diagram API error: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.base64) {
      console.log("[Diagram] Successfully received diagram asset");
      return {
        base64: data.base64,
        mimeType: data.mimeType || "image/svg+xml",
      };
    }

    return null;
  } catch (error) {
    console.error("[Diagram] Error generating diagram image:", error);
    return null;
  }
}

export function isGeminiConfigured(): boolean {
  return true;
}
