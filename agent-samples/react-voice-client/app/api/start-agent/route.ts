import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from "agora-token";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const connect = searchParams.get("connect") || "true";
    const profile = (searchParams.get("profile") || "VOICE").toUpperCase();
    const channel = searchParams.get("channel") || `tokai_${Math.random().toString(36).substring(2, 9)}`;
    const prompt = searchParams.get("prompt") || "";
    const greeting = searchParams.get("greeting") || "Hello! I am Tokai, your AI tutor. What would you like to explore today?";
    const asrLanguage = searchParams.get("asr_language") || "en-US";
    const debug = searchParams.get("debug") === "true";

    // Read environment variables (supports standard or PROFILE_ prefix)
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

    const userUid = 101;
    const agentUid = 100;
    const agentVideoUid = 102;
    const userRtmUid = `${userUid}-${channel}`;
    const agentRtmUid = `${agentUid}-${channel}`;

    const hasCertificate = Boolean(appId && appCertificate && appCertificate.trim());

    // Generate tokens if certificate is present
    let userToken = appId;
    let agentToken = appId;
    let agentVideoToken = appId;

    if (hasCertificate) {
      const expireTime = Math.floor(Date.now() / 1000) + 24 * 3600;
      userToken = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channel,
        userUid,
        RtcRole.PUBLISHER,
        expireTime,
        expireTime
      );
      agentToken = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channel,
        agentUid,
        RtcRole.PUBLISHER,
        expireTime,
        expireTime
      );
      agentVideoToken = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channel,
        agentVideoUid,
        RtcRole.PUBLISHER,
        expireTime,
        expireTime
      );
    }

    // Token-only mode (Phase 1)
    if (connect.toLowerCase() === "false") {
      return NextResponse.json({
        audio_scenario: "10",
        token: userToken,
        uid: String(userUid),
        channel,
        appid: appId || "tokai_standalone_mode",
        user_token: { token: userToken, uid: userUid },
        agent_video_token: { token: agentVideoToken, uid: agentVideoUid },
        agent: { uid: String(agentUid) },
        agent_rtm_uid: agentRtmUid,
        user_rtm_uid: userRtmUid,
        enable_string_uid: false,
        token_generation_method: hasCertificate
          ? "v007 tokens with RTC+RTM services"
          : "APP_ID only (no APP_CERTIFICATE)",
        agent_response: {
          status_code: 200,
          response: {
            message: "Token-only mode: tokens generated successfully",
            mode: "token_only",
            connect: false,
          },
          success: true,
        },
      });
    }

    // Phase 3: Start Agent
    let agentResponse: any = {
      status_code: 200,
      response: { agent_id: `tokai-agent-${Date.now()}` },
      success: true,
    };

    // If legitimate Agora App ID and Certificate are set, trigger Agora ConvoAI REST API
    if (hasCertificate && appId && !appId.startsWith("dummy")) {
      try {
        const joinUrl = `${agentEndpoint}/${appId}/join`;
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

        const ttsVendor = process.env.VOICE_TTS_VENDOR || "openai";
        const ttsKey = process.env.VOICE_TTS_KEY || process.env.OPENAI_API_KEY || "";
        const llmKey = process.env.VOICE_LLM_API_KEY || process.env.OPENAI_API_KEY || "";

        const payload = {
          name: channel,
          properties: {
            channel,
            token: agentToken,
            agent_rtc_uid: String(agentUid),
            remote_rtc_uids: ["*"],
            enable_string_uid: false,
            idle_timeout: 120,
            asr: {
              vendor: "ares",
              params: { language: asrLanguage },
            },
            llm: {
              url: process.env.VOICE_LLM_URL || "https://api.openai.com/v1/chat/completions",
              api_key: llmKey,
              style: "openai",
              params: {
                model: process.env.VOICE_LLM_MODEL || "gpt-4o-mini",
              },
              system_messages: [
                {
                  role: "system",
                  content:
                    prompt ||
                    "You are Tokai, a brilliant and encouraging Socratic AI tutor. Teach on a live whiteboard. Use simple, intuitive explanations. Whenever explaining a visual topic or process, say 'Let me draw that for you' or illustrate with clear steps.",
                },
              ],
              greeting_message: greeting,
            },
            tts: {
              vendor: ttsVendor,
              params: {
                api_key: ttsKey,
                model: "tts-1",
                voice: "alloy",
              },
            },
            advanced_features: {
              enable_rtm: true,
              enable_aivad: true,
            },
          },
        };

        const res = await fetch(joinUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `agora token=${apiAuthToken}`,
          },
          body: JSON.stringify(payload),
        });

        const resText = await res.text();
        agentResponse = {
          status_code: res.status,
          response: resText,
          success: res.ok,
        };
      } catch (err: any) {
        console.error("Agora agent start error:", err);
      }
    }

    const responseData: any = {
      audio_scenario: "10",
      token: userToken,
      uid: String(userUid),
      channel,
      appid: appId || "tokai_standalone_mode",
      user_token: { token: userToken, uid: userUid },
      agent_video_token: { token: agentVideoToken, uid: agentVideoUid },
      agent: { uid: String(agentUid) },
      agent_rtm_uid: agentRtmUid,
      user_rtm_uid: userRtmUid,
      enable_string_uid: false,
      agent_response: agentResponse,
    };

    if (debug) {
      responseData.debug = {
        channel,
        has_app_certificate: hasCertificate,
      };
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("start-agent route error:", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}
