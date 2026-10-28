(function () {
  "use strict";

  var STORAGE_KEY = "jf.servers";
  var LAST_KEY = "jf.last";
  var AUTO_FLAG = "jf.autoConnected";
  var DEFAULT_PORT = "8096";
  var PROBE_TIMEOUT = 6000;

  // Philips sends 8, JVC/Vestel 461; Escape is for desktop testing.
  var BACK_CODES = [8, 461, 27];
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13 };

  var $ = function (id) { return document.getElementById(id); };
  var views = ["servers-view", "add-view", "loading-view"];
  var currentView = "servers-view";
  var focused = null;
  var pendingConnect = null;

  // ---------- Storage ----------

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  function getServers() { return load(STORAGE_KEY, []); }

  function upsertServer(server) {
    var list = getServers().filter(function (s) { return s.url !== server.url; });
    list.unshift(server);
    save(STORAGE_KEY, list);
    save(LAST_KEY, server.url);
  }

  function removeServer(url) {
    save(STORAGE_KEY, getServers().filter(function (s) { return s.url !== url; }));
    if (load(LAST_KEY, null) === url) save(LAST_KEY, null);
  }

  // ---------- URL handling ----------

  // Returns the candidate base URLs to try for what the user typed.
  function candidates(input) {
    var text = input.trim().replace(/\/+$/, "").replace(/\/web(\/.*)?$/, "");
    if (!text) return [];
    var hasScheme = /^https?:\/\//i.test(text);
    var withScheme = hasScheme ? text : "http://" + text;
    var url;
    try { url = new URL(withScheme); } catch (e) { return []; }
    var base = url.origin + url.pathname.replace(/\/+$/, "");
    var list = [base];
    if (!url.port && !hasScheme) {
      list.unshift("http://" + url.hostname + ":" + DEFAULT_PORT + url.pathname.replace(/\/+$/, ""));
      list.push("https://" + url.host + url.pathname.replace(/\/+$/, ""));
    } else if (!url.port && url.protocol === "http:") {
      list.push("http://" + url.hostname + ":" + DEFAULT_PORT + url.pathname.replace(/\/+$/, ""));
    }
    return list.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  // An https page cannot fetch http URLs (mixed content), so those can't be probed.
  function canProbe(base) {
    return !(location.protocol === "https:" && base.indexOf("http:") === 0);
  }

  function probe(base) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, PROBE_TIMEOUT);
    return fetch(base + "/System/Info/Public", { signal: controller ? controller.signal : undefined })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (info) {
        if (!info || !info.Id) throw new Error("No es un servidor Jellyfin");
        return { url: base, name: info.ServerName || base, version: info.Version || "" };
      })
      .finally(function () { clearTimeout(timer); });
  }

  function findServer(input) {
    var list = candidates(input);
    if (!list.length) return Promise.reject(new Error("La dirección no es válida."));
    var probeable = list.filter(canProbe);
    if (!probeable.length) {
      // Can't verify from here; trust the most likely candidate.
      return Promise.resolve({ url: list[0], name: new URL(list[0]).host, version: "", unverified: true });
    }
    var i = 0;
    function next() {
      if (i >= probeable.length) {
        return Promise.reject(new Error("No se encontró ningún servidor Jellyfin en esa dirección."));
      }
      return probe(probeable[i++]).catch(next);
    }
    return next();
  }

  function openServer(server) {
    save(LAST_KEY, server.url);
    showView("loading-view");
    $("loading-text").textContent = "Abriendo " + server.name + "…";
    var token = {};
    pendingConnect = token;
    // Small delay so the user can still cancel an auto-connect.
    setTimeout(function () {
      if (pendingConnect === token) location.href = server.url + "/web/index.html";
    }, 800);
  }

  // ---------- Views ----------

  function showView(id) {
    views.forEach(function (v) { $(v).classList.toggle("hidden", v !== id); });
    currentView = id;
    if (id === "servers-view") renderServers();
    var first = focusables()[0];
    setFocus(id === "add-view" ? $("server-input") : first);
  }

  function renderServers() {
    var ul = $("server-list");
    ul.innerHTML = "";
    var servers = getServers();
    if (!servers.length) {
      var p = document.createElement("li");
      p.className = "empty";
      p.textContent = "Aún no has añadido ningún servidor.";
      ul.appendChild(p);
      return;
    }
    servers.forEach(function (s) {
      var li = document.createElement("li");
      var open = document.createElement("button");
      open.className = "focusable btn server";
      open.innerHTML = '<span class="name"></span><span class="url"></span>';
      open.querySelector(".name").textContent = s.name;
      open.querySelector(".url").textContent = s.url;
      open.addEventListener("click", function () { openServer(s); });
      var del = document.createElement("button");
      del.className = "focusable btn remove";
      del.textContent = "Quitar";
      del.setAttribute("aria-label", "Quitar " + s.name);
      del.addEventListener("click", function () {
        removeServer(s.url);
        showView("servers-view");
      });
      li.appendChild(open);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function submitServer() {
    var input = $("server-input").value;
    $("add-error").textContent = "";
    showView("loading-view");
    $("loading-text").textContent = "Buscando servidor…";
    var token = {};
    pendingConnect = token;
    findServer(input).then(function (server) {
      if (pendingConnect !== token) return;
      upsertServer(server);
      openServer(server);
    }).catch(function (err) {
      if (pendingConnect !== token) return;
      showView("add-view");
      $("add-error").textContent = err.message;
    });
  }

  // ---------- Exit ----------

  function showExit() {
    $("exit-dialog").classList.remove("hidden");
    setFocus($("exit-no"));
  }

  function hideExit() {
    $("exit-dialog").classList.add("hidden");
    setFocus(focusables()[0]);
  }

  function exitApp() {
    if (typeof SmartTvA_API !== "undefined" && SmartTvA_API.exit) {
      SmartTvA_API.exit();
    } else {
      window.close();
    }
  }

  function dialogOpen() { return !$("exit-dialog").classList.contains("hidden"); }

  // ---------- Spatial navigation ----------

  function focusables() {
    var scope = dialogOpen() ? $("exit-dialog") : $(currentView);
    return Array.prototype.filter.call(scope.querySelectorAll(".focusable"), function (el) {
      return el.offsetParent !== null;
    });
  }

  function setFocus(el) {
    if (focused) focused.classList.remove("focused");
    focused = el || null;
    if (!focused) return;
    focused.classList.add("focused");
    focused.focus({ preventScroll: true });
    if (focused.scrollIntoView) focused.scrollIntoView({ block: "nearest" });
  }

  function move(dir) {
    var items = focusables();
    if (!focused || items.indexOf(focused) === -1) { setFocus(items[0]); return; }
    var from = focused.getBoundingClientRect();
    var fx = from.left + from.width / 2, fy = from.top + from.height / 2;
    var best = null, bestScore = Infinity;
    items.forEach(function (el) {
      if (el === focused) return;
      var r = el.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var dx = x - fx, dy = y - fy;
      var ok = (dir === KEY.LEFT && dx < -1) || (dir === KEY.RIGHT && dx > 1) ||
               (dir === KEY.UP && dy < -1) || (dir === KEY.DOWN && dy > 1);
      if (!ok) return;
      var horizontal = dir === KEY.LEFT || dir === KEY.RIGHT;
      var score = horizontal ? Math.abs(dx) + Math.abs(dy) * 3 : Math.abs(dy) + Math.abs(dx) * 3;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) setFocus(best);
  }

  function back() {
    if (dialogOpen()) { hideExit(); return; }
    if (currentView === "loading-view") { pendingConnect = null; showView(getServers().length ? "servers-view" : "add-view"); return; }
    if (currentView === "add-view" && getServers().length) { showView("servers-view"); return; }
    showExit();
  }

  document.addEventListener("keydown", function (e) {
    var code = e.keyCode;
    var inInput = document.activeElement && document.activeElement.tagName === "INPUT";

    if (BACK_CODES.indexOf(code) !== -1) {
      // Keep Backspace usable for deleting text on a physical keyboard.
      if (code === 8 && inInput && document.activeElement.value) return;
      e.preventDefault();
      back();
      return;
    }
    if (code === KEY.ENTER) {
      if (inInput) { e.preventDefault(); submitServer(); return; }
      if (focused) { e.preventDefault(); focused.click(); }
      return;
    }
    if (code === KEY.UP || code === KEY.DOWN || (!inInput && (code === KEY.LEFT || code === KEY.RIGHT))) {
      e.preventDefault();
      move(code);
    }
  }, true);

  // Mouse/pointer remotes: keep the focus ring in sync.
  document.addEventListener("mouseover", function (e) {
    var el = e.target.closest && e.target.closest(".focusable");
    if (el && focusables().indexOf(el) !== -1) setFocus(el);
  });

  // ---------- Wiring ----------

  $("add-server").addEventListener("click", function () {
    $("server-input").value = "";
    $("add-error").textContent = "";
    showView("add-view");
  });
  $("connect").addEventListener("click", submitServer);
  $("cancel-add").addEventListener("click", back);
  $("cancel-loading").addEventListener("click", back);
  $("exit-yes").addEventListener("click", exitApp);
  $("exit-no").addEventListener("click", hideExit);

  function start() {
    var servers = getServers();
    var last = load(LAST_KEY, null);
    var lastServer = servers.filter(function (s) { return s.url === last; })[0];
    var already = false;
    try { already = sessionStorage.getItem(AUTO_FLAG) === "1"; } catch (e) { /* ignore */ }

    // Auto-open the last server on a fresh launch only. Coming back from
    // jellyfin-web (Back on its home screen) shows the list instead, so
    // Back again reaches the exit dialog rather than looping.
    if (lastServer && !already) {
      try { sessionStorage.setItem(AUTO_FLAG, "1"); } catch (e) { /* ignore */ }
      openServer(lastServer);
    } else {
      showView(servers.length ? "servers-view" : "add-view");
    }
  }

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { pendingConnect = null; showView(getServers().length ? "servers-view" : "add-view"); }
  });

  start();
})();
