import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-token";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agent_id");
    const profile = (searchParams.get("profile") || "VOICE").toUpperCase();

    if (!agentId) {
      return NextResponse.json({ error: "Missing agent_id" }, { status: 400 });
    }

    const appId =
      process.env[`${profile}_APP_ID`] ||
      process.env.AGORA_APP_ID ||
      process.env.NEXT_PUBLIC_AGORA_APP_ID ||
      "";
    const appCertificate =
      process.env[`${profile}_APP_CERTIFICATE`] ||
      process.env.AGORA_APP_CERTIFICATE ||
      "";
    const agentEndpoint =
      process.env[`${profile}_AGENT_ENDPOINT`] ||
      process.env.AGORA_AGENT_ENDPOINT ||
      "https://api.agora.io/api/conversational-ai-agent/v2/projects";

    if (appId && appCertificate && !agentId.startsWith("tokai-agent-")) {
      try {
        const hangupUrl = `${agentEndpoint}/${appId}/agents/${agentId}/leave`;
        const authExpire = Math.floor(Date.now() / 1000) + 3600;
        const apiAuthToken = RtcTokenBuilder.buildTokenWithUid(
          appId,
          appCertificate,
          "",
          0,
          RtcRole.PUBLISHER,
          authExpire,
          authExpire
        );

        await fetch(hangupUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `agora token=${apiAuthToken}`,
          },
        });
      } catch (e) {
        console.error("Hangup Agora agent error:", e);
      }
    }

    return NextResponse.json({ success: true, message: "Agent stopped successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
