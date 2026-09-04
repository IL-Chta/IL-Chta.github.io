(function () {
  "use strict";

  var originalFetch = window.fetch.bind(window);
  var callKinds = {};
  var callStartedAt = {};

  function durationText(startedAt) {
    if (!startedAt) return "";
    var seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    if (seconds < 60) return seconds + " s";
    var minutes = Math.floor(seconds / 60);
    var remainder = seconds % 60;
    return minutes + " min" + (remainder ? " " + remainder + " s" : "");
  }

  function callLabel(signal, mode) {
    var payload = signal.payload || {};
    var kind = payload.mode || mode || callKinds[signal.call_id] || "audio";
    return kind === "video" ? "🎥 Chamada de vídeo" : "📞 Chamada de voz";
  }

  function historyText(signal, info) {
    var payload = signal.payload || {};
    var kind = payload.mode || info.mode || callKinds[signal.call_id] || "audio";
    var label = callLabel(signal, kind);

    if (signal.signal_type === "offer") {
      callKinds[signal.call_id] = kind;
      callStartedAt[signal.call_id] = Date.now();
      return label + " iniciada";
    }

    if (signal.signal_type !== "hangup") return "";
    if (payload.reason === "rejected" || info.answered === false) return label + " não atendida";
    var duration = durationText(callStartedAt[signal.call_id]);
    return label + " encerrada" + (duration ? " · " + duration : "");
  }

  async function callInfo(signal, headers) {
    if (signal.signal_type !== "hangup") return { answered: null, mode: "" };
    var authorization = headers.get("authorization");
    var apikey = headers.get("apikey");
    if (!authorization || !apikey) return { answered: null, mode: "" };
    var url = "https://ngidsolvxegpyrprlbex.supabase.co/rest/v1/call_signals" +
      "?select=signal_type,payload&call_id=eq." + encodeURIComponent(signal.call_id) +
      "&signal_type=in.(offer,answer)";
    var response = await originalFetch(url, {
      headers: { Authorization: authorization, apikey: apikey }
    });
    if (!response.ok) return { answered: null, mode: "" };
    var rows = await response.json();
    var offer = (rows || []).find(function (row) { return row.signal_type === "offer"; });
    return {
      answered: (rows || []).some(function (row) { return row.signal_type === "answer"; }),
      mode: offer && offer.payload && offer.payload.mode || ""
    };
  }

  async function addHistory(signal, headers) {
    var info = await callInfo(signal, headers);
    var body = historyText(signal, info);
    if (!body || !signal.conversation_id || !signal.sender_id) return;

    var authorization = headers.get("authorization");
    var apikey = headers.get("apikey");
    if (!authorization || !apikey) return;

    await originalFetch("https://ngidsolvxegpyrprlbex.supabase.co/rest/v1/messages", {
      method: "POST",
      headers: {
        "Authorization": authorization,
        "apikey": apikey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        conversation_id: signal.conversation_id,
        sender_id: signal.sender_id,
        body: body
      })
    });
  }

  window.fetch = async function (input, init) {
    var response = await originalFetch(input, init);
    try {
      var url = typeof input === "string" ? input : input.url;
      var method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
      if (!response.ok || method !== "POST" || !url.includes("/rest/v1/call_signals")) return response;

      var rawBody = init && init.body;
      if (!rawBody) return response;
      var parsed = JSON.parse(rawBody);
      var signals = Array.isArray(parsed) ? parsed : [parsed];
      var headers = new Headers((init && init.headers) || (input && input.headers) || {});
      signals.forEach(function (signal) {
        if (signal.signal_type === "offer" || signal.signal_type === "hangup") {
          addHistory(signal, headers).catch(function () {});
        }
      });
    } catch (_) {}
    return response;
  };
})();
