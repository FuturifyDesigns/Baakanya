(function () {
  "use strict";
  var route = window.location.pathname + window.location.search + window.location.hash;
  if (!route || route === "/") {
    window.location.replace("/");
    return;
  }
  window.location.replace("/?route=" + encodeURIComponent(route));
})();
