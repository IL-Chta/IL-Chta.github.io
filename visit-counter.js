(function () {
  "use strict";

  var GEO_ENDPOINTS = [
    "https://ipwho.is/?fields=success,country_code,country,region,city",
    "https://ipapi.co/json/"
  ];
  var VISIT_MARKER = "ilchats-visit-recorded-v1";
  var SUPABASE_URL = "https://ngidsolvxegpyrprlbex.supabase.co";
  var SUPABASE_KEY = "sb_publishable_-8u67PtkHJj1yRVWtOIkog_2skdsDcz";

  function getClient() {
    if (window.__ilToolsClient) return window.__ilToolsClient;
    if (typeof window.makeClient === "function") return window.makeClient();
    if (!window.supabase || !window.supabase.createClient) return null;
    window.__ilToolsClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return window.__ilToolsClient;
  }

  function text(value, fallback) {
    var cleaned = String(value || "").trim();
    return cleaned || fallback;
  }

  function flag(code) {
    var countryCode = String(code || "").trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(countryCode)) return '<span aria-hidden="true">🌐</span>';
    return '<img src="https://flagcdn.com/32x24/' + countryCode + '.png" ' +
      'width="32" height="24" alt="Bandeira ' + countryCode.toUpperCase() + '" loading="lazy">';
  }

  async function locateVisit() {
    var lastError;
    for (var i = 0; i < GEO_ENDPOINTS.length; i += 1) {
      try {
        var response = await fetch(GEO_ENDPOINTS[i], { cache: "no-store" });
        if (!response.ok) throw new Error("Localização indisponível");
        var data = await response.json();
        var code = data.country_code || data.countryCode;
        if (data.success === false || !code) throw new Error("Localização incompleta");
        return {
          country_code: code,
          country: data.country_name || data.country,
          region: data.region || data.region_name,
          city: data.city
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Localização indisponível");
  }

  async function sendVisit(geo) {
    var response = await fetch(SUPABASE_URL + "/rest/v1/rpc/record_visit", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_country_code: text(geo.country_code, ""),
        p_country: text(geo.country, "Desconhecido"),
        p_region: text(geo.region, "Desconhecido"),
        p_city: text(geo.city, "Desconhecida")
      })
    });
    if (!response.ok) throw new Error("Não foi possível registrar a visita");
  }

  async function recordVisit() {
    try {
      if (sessionStorage.getItem(VISIT_MARKER)) return;
      sessionStorage.setItem(VISIT_MARKER, "1");
    } catch (_) {}

    try {
      var geo = await locateVisit();
      await sendVisit(geo);
    } catch (error) {
      try { sessionStorage.removeItem(VISIT_MARKER); } catch (_) {}
      console.warn("IL Chats: contador de visitas temporariamente indisponível.", error);
    }
  }

  function groupVisits(rows) {
    var groups = {};
    (rows || []).forEach(function (row) {
      var key = [row.country_code, row.country, row.region, row.city].join("|");
      if (!groups[key]) {
        groups[key] = {
          code: row.country_code,
          country: row.country,
          region: row.region,
          city: row.city,
          count: 0,
          last: row.visited_at
        };
      }
      groups[key].count += 1;
      if (row.visited_at > groups[key].last) groups[key].last = row.visited_at;
    });
    return Object.keys(groups).map(function (key) {
      return groups[key];
    }).sort(function (a, b) {
      return b.last.localeCompare(a.last);
    });
  }

  async function renderVisits(section) {
    var client = getClient();
    var list = section.querySelector(".visit-list");
    if (!client) return;

    var result = await client
      .from("visit_events")
      .select("visited_at,country_code,country,region,city")
      .order("visited_at", { ascending: false })
      .limit(500);

    if (result.error) {
      list.innerHTML = '<div class="visit-empty">Não foi possível carregar as visitas.</div>';
      return;
    }

    var visits = groupVisits(result.data);
    if (!visits.length) {
      list.innerHTML = '<div class="visit-empty">Nenhuma visita registrada ainda.</div>';
      return;
    }

    list.innerHTML = visits.map(function (visit) {
      var when = new Date(visit.last).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
      });
      return '<div class="visit-row">' +
        '<span class="visit-flag">' + flag(visit.code) + '</span>' +
        '<span class="visit-place">' + text(visit.city, "Cidade desconhecida") + ', ' +
          text(visit.region, "Estado desconhecido") +
          '<small>' + text(visit.country, "País desconhecido") + ' · última ' + when + '</small>' +
        '</span>' +
        '<span class="visit-count">' + visit.count + '</span>' +
      '</div>';
    }).join("");
  }

  function installAdminPanel() {
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".profile-admin-button")) return;
      setTimeout(function () {
        var card = document.querySelector(".il-tools-card");
        if (!card || card.querySelector(".visit-summary")) return;
        var close = card.querySelector("button");
        var section = document.createElement("section");
        section.className = "visit-summary";
        section.innerHTML =
          '<div class="visit-summary-head"><h4>Visitas por localização</h4>' +
          '<span class="visit-live">● TEMPO REAL</span></div>' +
          '<div class="visit-list"><div class="visit-empty">Carregando visitas…</div></div>';
        card.insertBefore(section, close);
        renderVisits(section);
      }, 60);
    }, true);
  }

  recordVisit();
  installAdminPanel();
})();
