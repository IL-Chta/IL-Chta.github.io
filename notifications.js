(function () {
  "use strict";
  var URL = "https://ngidsolvxegpyrprlbex.supabase.co";
  var KEY = "sb_publishable_-8u67PtkHJj1yRVWtOIkog_2skdsDcz";
  var VAPID_PUBLIC_KEY = "BGq8IGyauun0vKpXPLksb5I_lrhxD89oxschTLQg8kGhKagxDyPOnXd7nTebG796JhAl_SP4KMa68P7Qz2IMp_c";
  var db, user, channel, registration;
  var seen = new Set(), promptId = "il-push-permission-prompt";
  function logError(stage, error) { console.error("[IL Chats Push] " + stage, error && (error.message || error)); }
  function client() {
    if (db) return db;
    db = window.__ilToolsClient || (window.supabase && window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }));
    if (db) window.__ilToolsClient = db;
    return db;
  }
  function applicationServerKey(value) {
    var padding = "=".repeat((4 - value.length % 4) % 4);
    var raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, function (character) { return character.charCodeAt(0); });
  }
  async function subscribeForPush() {
    if (!registration) throw new Error("Service Worker indisponível");
    if (!user) throw new Error("Usuário não autenticado");
    if (Notification.permission !== "granted") throw new Error("Permissão não concedida");
    var subscription = await registration.pushManager.getSubscription();
    if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(VAPID_PUBLIC_KEY) });
    var result = await client().from("push_subscriptions").upsert({ user_id: user.id, endpoint: subscription.endpoint, subscription: subscription.toJSON(), updated_at: new Date().toISOString() }, { onConflict: "endpoint" }).select("id").single();
    if (result.error) throw result.error;
    console.info("[IL Chats Push] dispositivo registrado", result.data && result.data.id);
  }
  function removePrompt() { var prompt = document.getElementById(promptId); if (prompt) prompt.remove(); }
  function showPermissionPrompt() {
    if (!user || Notification.permission !== "default" || document.getElementById(promptId)) return;
    var box = document.createElement("div");
    box.id = promptId; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Ativar notificações do IL Chats");
    box.style.cssText = "position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:2147483000;max-width:360px;width:calc(100% - 32px);padding:14px;border-radius:16px;background:#07111f;color:#fff;border:1px solid #19d7ff;box-shadow:0 12px 35px rgba(0,0,0,.5);font:14px system-ui";
    box.innerHTML = '<b style="display:block;margin-bottom:6px">Receba mensagens e chamadas</b><span style="display:block;color:#c7d2df;margin-bottom:12px">Ative as notificações para ser avisado mesmo com o IL Chats em segundo plano.</span><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-action="later" style="padding:9px 12px;border-radius:10px;border:1px solid #536274;background:transparent;color:#fff">Agora não</button><button type="button" data-action="enable" style="padding:9px 12px;border:0;border-radius:10px;background:#15c9ef;color:#00131a;font-weight:700">Ativar notificações</button></div>';
    box.querySelector('[data-action="later"]').addEventListener("click", removePrompt);
    box.querySelector('[data-action="enable"]').addEventListener("click", async function () {
      try { var permission = await Notification.requestPermission(); if (permission !== "granted") throw new Error("Permissão: " + permission); await subscribeForPush(); removePrompt(); }
      catch (error) { logError("falha ao ativar", error); var message = box.querySelector("span"); if (message) message.textContent = "Não foi possível ativar. Confira a permissão do navegador e tente novamente."; }
    });
    document.body.appendChild(box);
  }
  async function show(title, body, isCall, tag) {
    if (Notification.permission !== "granted" || !registration || document.visibilityState === "visible") return;
    await registration.showNotification(title, { body: body, icon: "/icon.svg", badge: "/icon.svg", tag: tag, renotify: true, requireInteraction: isCall, vibrate: isCall ? [700,300,700,300,900] : [250,120,250], data: { url: "/", type: isCall ? "call" : "message" } });
  }
  async function senderName(id) { var result = await client().from("profiles").select("display_name").eq("id", id).maybeSingle(); return result.data && result.data.display_name || "Alguém"; }
  async function onMessage(row) {
    if (!user || !row || row.sender_id === user.id || seen.has("m:" + row.id)) return;
    seen.add("m:" + row.id);
    try { var name = await senderName(row.sender_id); var text = row.content || row.body || row.text || "Você recebeu uma nova mensagem."; await show("Mensagem de " + name, String(text).slice(0,140), false, "message-" + row.id); } catch (error) { logError("mensagem", error); }
  }
  async function onCall(row) {
    if (!user || !row || row.recipient_id !== user.id || row.signal_type !== "offer" || seen.has("c:" + row.call_id)) return;
    seen.add("c:" + row.call_id);
    try { var name = await senderName(row.sender_id); var mode = row.payload && row.payload.mode === "video" ? "vídeo" : "voz"; await show("Chamada de " + mode + " recebida", name + " está ligando para você no IL Chats.", true, "call-" + row.call_id); } catch (error) { logError("chamada", error); }
  }
  function startRealtime() {
    if (!user || !client()) return;
    if (channel) client().removeChannel(channel);
    channel = client().channel("il-notifications-" + user.id)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"messages" }, function (event) { onMessage(event.new); })
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"call_signals", filter:"recipient_id=eq." + user.id }, function (event) { onCall(event.new); })
      .subscribe(function (status) { if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") logError("Realtime", status); });
  }
  async function configureForSession(nextUser) {
    user = nextUser || null;
    if (!user) { removePrompt(); return; }
    startRealtime();
    if (Notification.permission === "granted") { try { await subscribeForPush(); } catch (error) { logError("registro", error); } }
    else if (Notification.permission === "default") showPermissionPrompt();
  }
  async function start() {
    if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) { logError("compatibilidade", "Web Push indisponível"); return; }
    registration = await navigator.serviceWorker.register("/sw.js?v=6", { updateViaCache:"none" }); await registration.update();
    var c = client(); if (!c) throw new Error("Cliente Supabase não encontrado");
    var session = await c.auth.getSession(); await configureForSession(session.data && session.data.session && session.data.session.user);
    c.auth.onAuthStateChange(function (_event, nextSession) { setTimeout(function () { configureForSession(nextSession && nextSession.user).catch(function (error) { logError("sessão", error); }); }, 0); });
  }
  window.addEventListener("load", function () { start().catch(function (error) { logError("inicialização", error); }); });
})();
