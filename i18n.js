(function () {
  "use strict";

  var STRINGS = {
    en: {
      title: "Jellyfin for Titan OS",
      tagline: "Unofficial client for Titan OS",
      yourServers: "Your servers",
      addServer: "+ Add server",
      addServerTitle: "Add server",
      serverAddress: "Server address",
      hint: "Enter the IP or domain of your Jellyfin server. Port 8096 is tried if none is given.",
      connect: "Connect",
      cancel: "Cancel",
      connecting: "Connecting…",
      exitQuestion: "Do you want to exit?",
      exit: "Exit",
      noServers: "You haven't added any servers yet.",
      remove: "Remove",
      removeLabel: "Remove {name}",
      opening: "Opening {name}…",
      searching: "Looking for server…",
      invalidAddress: "The address is not valid.",
      notFound: "No Jellyfin server was found at that address.",
      notJellyfin: "Not a Jellyfin server"
    },
    es: {
      title: "Jellyfin para Titan OS",
      tagline: "Cliente no oficial para Titan OS",
      yourServers: "Tus servidores",
      addServer: "+ Añadir servidor",
      addServerTitle: "Añadir servidor",
      serverAddress: "Dirección del servidor",
      hint: "Escribe la IP o el dominio de tu servidor Jellyfin. Si no indicas puerto se prueba el 8096.",
      connect: "Conectar",
      cancel: "Cancelar",
      connecting: "Conectando…",
      exitQuestion: "¿Quieres salir?",
      exit: "Salir",
      noServers: "Aún no has añadido ningún servidor.",
      remove: "Quitar",
      removeLabel: "Quitar {name}",
      opening: "Abriendo {name}…",
      searching: "Buscando servidor…",
      invalidAddress: "La dirección no es válida.",
      notFound: "No se encontró ningún servidor Jellyfin en esa dirección.",
      notJellyfin: "No es un servidor Jellyfin"
    }
  };

  var langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"]);
  var lang = "en";
  for (var i = 0; i < langs.length; i++) {
    var code = String(langs[i]).toLowerCase().split("-")[0];
    if (STRINGS[code]) { lang = code; break; }
  }

  window.t = function (key, vars) {
    var s = STRINGS[lang][key] || STRINGS.en[key] || key;
    return s.replace(/\{(\w+)\}/g, function (_, k) { return vars && k in vars ? vars[k] : ""; });
  };

  document.documentElement.lang = lang;
  document.title = window.t("title");
  Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
    el.textContent = window.t(el.getAttribute("data-i18n"));
  });
})();
