// Persist fill-in-the-blank answers per page in localStorage.
(function () {
  var page = location.pathname.replace(/\/+$/, "");
  var blanks = document.querySelectorAll(".blank[contenteditable]");
  blanks.forEach(function (el, i) {
    var key = "biblestory:" + page + ":" + i;
    var saved = localStorage.getItem(key);
    if (saved) el.textContent = saved;
    el.addEventListener("input", function () {
      localStorage.setItem(key, el.textContent.trim());
    });
    // Keep answers plain text — no pasted formatting.
    el.addEventListener("paste", function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData("text/plain");
      document.execCommand("insertText", false, text);
    });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); el.blur(); }
    });
  });
})();
