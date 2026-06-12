// sidebar.js — Handles mobile sidebar toggle + close on outside click
(function() {
  function init() {
    const toggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    if (!toggle || !sidebar) return;

    // Toggle open/close
    toggle.addEventListener("click", function(e) {
      e.stopPropagation();
      const isOpen = sidebar.classList.contains("open");
      if (isOpen) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    // Close when clicking outside
    document.addEventListener("click", function(e) {
      if (sidebar.classList.contains("open") &&
          !sidebar.contains(e.target) &&
          e.target !== toggle) {
        closeSidebar();
      }
    });

    // Close when a nav link is clicked (mobile UX)
    sidebar.querySelectorAll(".nav-item").forEach(function(link) {
      link.addEventListener("click", function() {
        closeSidebar();
      });
    });

    // Close on Escape key
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") closeSidebar();
    });
  }

  function openSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("menuToggle");
    sidebar.classList.add("open");
    if (toggle) toggle.textContent = "✕";
  }

  function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("menuToggle");
    sidebar.classList.remove("open");
    if (toggle) toggle.textContent = "☰";
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
