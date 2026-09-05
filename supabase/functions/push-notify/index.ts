import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://il-chta.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

webpush.setVapidDetails(
  "https://il-chta.github.io/",
  Deno.env.get("VAPID_PUBLIC_KEY") || "",
  Deno.env.get("VAPID_PRIVATE_KEY") || "",
);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authorization = request.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const callerClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: authData } = await callerClient.auth.getUser();
    const caller = authData.user;
    if (!caller) return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });

    const body = await request.json();
    if (body.sender_id !== caller.id) return Response.json({ error: "invalid sender" }, { status: 403, headers: cors });
    const admin = createClient(url, service);
    let recipients: string[] = [];

    if (body.type === "call" && body.recipient_id) {
      recipients = [body.recipient_id];
    } else if (body.type === "message" && body.conversation_id) {
      const { data } = await admin.from("conversation_members").select("user_id")
        .eq("conversation_id", body.conversation_id).neq("user_id", caller.id);
      recipients = (data || []).map((item) => item.user_id);
    }
    if (!recipients.length) return Response.json({ sent: 0 }, { headers: cors });

    const { data: profile } = await admin.from("profiles").select("display_name").eq("id", caller.id).maybeSingle();
    const sender = profile?.display_name || "Alguém";
    const isCall = body.type === "call";
    const mode = body.mode === "video" ? "vídeo" : "voz";
    const payload = JSON.stringify({
      type: isCall ? "call" : "message",
      title: isCall ? `Ligação de ${mode} no IL Chats` : `Mensagem de ${sender}`,
      body: isCall ? `${sender} está ligando para você.` : String(body.preview || "Nova mensagem").slice(0, 140),
      tag: isCall ? `call-${body.call_id}` : `message-${body.conversation_id}`,
      url: "/",
    });
    const { data: subscriptions } = await admin.from("push_subscriptions").select("id,subscription").in("user_id", recipients);
    let sent = 0;
    for (const item of subscriptions || []) {
      try {
        await webpush.sendNotification(item.subscription, payload);
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", item.id);
        }
      }
    }
    return Response.json({ sent }, { headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500, headers: cors });
  }
});
