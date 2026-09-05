(function () {
  "use strict";

  function safeRoute(value) {
    if (!value || value.length > 2048 || value[0] !== "/" || value.slice(0, 2) === "//") {
      return "";
    }
    try {
      var parsed = new URL(value, window.location.origin);
      if (parsed.origin !== window.location.origin) return "";
      return parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return "";
    }
  }

  var route = safeRoute(new URLSearchParams(window.location.search).get("route"));
  if (!route && window.location.hash.indexOf("#/") === 0) {
    route = safeRoute(window.location.hash.slice(1));
  }
  if (route) window.history.replaceState(null, "", route);

  var reloadKey = "baakanya-html-reload";
  window.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      if (!target || (target.tagName !== "SCRIPT" && target.tagName !== "LINK")) return;
      var href = target.src || target.href || "";
      if (href.indexOf("/assets/") === -1 || sessionStorage.getItem(reloadKey)) return;
      sessionStorage.setItem(reloadKey, String(Date.now()));
      window.location.reload();
    },
    true,
  );
})();
