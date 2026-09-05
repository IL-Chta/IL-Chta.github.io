(function () {
  "use strict";
  var originalFetch = window.fetch.bind(window);
  var functionUrl = "https://ngidsolvxegpyrprlbex.supabase.co/functions/v1/push-notify";

  function sendPush(payload, headers) {
    var authorization = headers.get("authorization");
    var apikey = headers.get("apikey");
    if (!authorization || !apikey) return;
    originalFetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: authorization,
        apikey: apikey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).catch(function () {});
  }

  window.fetch = async function (input, init) {
    var response = await originalFetch(input, init);
    try {
      var url = typeof input === "string" ? input : input.url;
      var method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
      if (!response.ok || method !== "POST" || !url.includes("/rest/v1/")) return response;
      var parsed = JSON.parse(init && init.body || "null");
      var rows = Array.isArray(parsed) ? parsed : [parsed];
      var headers = new Headers((init && init.headers) || (input && input.headers) || {});
      rows.forEach(function (row) {
        if (url.includes("/call_signals") && row.signal_type === "offer") {
          sendPush({
            type: "call",
            sender_id: row.sender_id,
            recipient_id: row.recipient_id,
            call_id: row.call_id,
            mode: row.payload && row.payload.mode || "audio"
          }, headers);
        } else if (url.includes("/messages") && row.conversation_id && row.sender_id) {
          sendPush({
            type: "message",
            sender_id: row.sender_id,
            conversation_id: row.conversation_id,
            preview: row.body || "Você recebeu um arquivo."
          }, headers);
        }
      });
    } catch (_) {}
    return response;
  };
})();
