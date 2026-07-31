function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}

(function themeToggle() {
  try {
    const toggleBtn = document.getElementById("themeToggle");
    const root = document.documentElement;
    const STORAGE_KEY = "portfolio-theme";

    function applyTheme(theme) {
      if (theme === "light") {
        root.setAttribute("data-theme", "light");
      } else {
        root.removeAttribute("data-theme");
      }
    }

    const saved = safeGet(STORAGE_KEY);
    const prefersLight =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(saved || (prefersLight ? "light" : "dark"));

    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
      const isLight = root.getAttribute("data-theme") === "light";
      const nextTheme = isLight ? "dark" : "light";

      const rect = toggleBtn.getBoundingClientRect();
      const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
      root.style.setProperty("--toggle-x", `${x}%`);
      root.style.setProperty("--toggle-y", `${y}%`);

      const switchTheme = () => {
        applyTheme(nextTheme);
        safeSet(STORAGE_KEY, nextTheme);
      };

      if (document.startViewTransition) {
        document.startViewTransition(switchTheme);
      } else {
        switchTheme();
      }
    });
  } catch (err) {
    console.error("Theme toggle failed to initialize:", err);
  }
})();

(function githubActivity() {
  try {
    const GITHUB_USERNAME = "Deuizxc";

    const grid = document.getElementById("ghGrid");
    const monthsRow = document.getElementById("ghMonths");
    const countEl = document.getElementById("ghContribCount");
    const yearTabs = document.getElementById("ghYearTabs");

    if (!grid || !yearTabs) return;

    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    let activeYear = currentYear;

    const MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    function buildYearTabs() {
      yearTabs.innerHTML = "";
      years.forEach((year) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = year;
        btn.className = year === activeYear ? "active" : "";
        btn.addEventListener("click", () => {
          if (year === activeYear) return;
          activeYear = year;
          [...yearTabs.children].forEach((c) => c.classList.remove("active"));
          btn.classList.add("active");
          loadYear(activeYear);
        });
        yearTabs.appendChild(btn);
      });
    }

    function levelFromCount(count) {
      if (count <= 0) return 0;
      if (count <= 2) return 1;
      if (count <= 5) return 2;
      if (count <= 9) return 3;
      return 4;
    }

    function render(contributions, total) {
      grid.innerHTML = "";
      monthsRow.innerHTML = "";
      countEl.textContent = total;

      if (!contributions.length) {
        const status = document.createElement("p");
        status.className = "gh-status";
        status.textContent = "No contribution data available.";
        grid.appendChild(status);
        return;
      }

      const weeks = [];
      let week = new Array(7).fill(null);
      const firstDate = new Date(contributions[0].date + "T00:00:00Z");
      const startPad = firstDate.getUTCDay();
      for (let i = 0; i < startPad; i++) week[i] = null;

      let dayCursor = startPad;
      contributions.forEach((day) => {
        week[dayCursor] = day;
        dayCursor++;
        if (dayCursor === 7) {
          weeks.push(week);
          week = new Array(7).fill(null);
          dayCursor = 0;
        }
      });
      if (week.some((d) => d !== null)) weeks.push(week);

      weeks.forEach((w) => {
        w.forEach((day) => {
          const cell = document.createElement("div");
          cell.className = "gh-day";
          if (day) {
            const level =
              typeof day.level === "number"
                ? day.level
                : levelFromCount(day.count);
            cell.dataset.level = level;
            cell.title = `${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`;
          } else {
            cell.dataset.level = 0;
            cell.style.visibility = "hidden";
          }
          grid.appendChild(cell);
        });
      });

      let lastMonth = -1;
      weeks.forEach((w, i) => {
        const rep = w.find((d) => d);
        if (!rep) return;
        const month = new Date(rep.date + "T00:00:00Z").getUTCMonth();
        if (month !== lastMonth) {
          const label = document.createElement("span");
          label.textContent = MONTHS[month];
          label.style.gridColumn = i + 1;
          monthsRow.appendChild(label);
          lastMonth = month;
        }
      });
    }

    function renderFallback() {
      const days = [];
      const start = new Date(Date.UTC(activeYear, 0, 1));
      const end = new Date(Date.UTC(activeYear, 11, 31));
      for (
        let d = new Date(start);
        d <= end;
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        days.push({
          date: d.toISOString().slice(0, 10),
          count: 0,
          level: 0,
        });
      }
      render(days, "—");
      const note = document.querySelector(".gh-note");
      if (note) {
        note.textContent =
          "Couldn't load contributions right now — check the username in script.js or your connection.";
      }
    }

    async function loadYear(year) {
      grid.innerHTML =
        '<p class="gh-status" id="ghStatus">Loading contribution graph…</p>';
      countEl.textContent = "—";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(
          `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=${year}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        const contributions = data.contributions || [];
        const total =
          (data.total && (data.total[year] ?? data.total[String(year)])) ??
          contributions.reduce((sum, d) => sum + (d.count || 0), 0);
        render(contributions, total);
      } catch (err) {
        renderFallback();
      } finally {
        clearTimeout(timeout);
      }
    }

    buildYearTabs();
    loadYear(activeYear);
  } catch (err) {
    console.error("GitHub Activity widget failed to initialize:", err);
  }
})();

(function certLightbox() {
  try {
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightboxImg");
    const closeBtn = document.getElementById("lightboxClose");
    const triggers = document.querySelectorAll("[data-lightbox]");

    if (!lightbox || !triggers.length) return;

    function openLightbox(imgEl) {
      lightboxImg.src = imgEl.src;
      lightboxImg.alt = imgEl.alt || "Certificate";
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    triggers.forEach((trigger) => {
      const img = trigger.querySelector("img");
      if (!img) return;

      trigger.addEventListener("click", () => openLightbox(img));
      trigger.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(img);
        }
      });
    });

    closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightbox.classList.contains("is-open")) {
        closeLightbox();
      }
    });
  } catch (err) {
    console.error("Certificate lightbox failed to initialize:", err);
  }
})();

(function addModernFeatures() {
  // 1. Page Loader Logic
  window.addEventListener("load", () => {
    const loader = document.getElementById("pageLoader");
    if (loader) {
      loader.classList.add("fade-out");
      setTimeout(() => loader.remove(), 500);
    }
  });

  // 2. Command Palette Logic
  try {
    const palette = document.getElementById("cmdPalette");
    const input = document.getElementById("cmdInput");
    const list = document.getElementById("cmdList");
    const backdrop = document.getElementById("cmdBackdrop");
    const themeToggleBtn = document.getElementById("themeToggle");

    if (!palette || !input || !list) return;

    const items = Array.from(list.querySelectorAll(".cmd-item"));
    let currentIndex = -1;

    function openPalette() {
      palette.classList.add("is-open");
      palette.setAttribute("aria-hidden", "false");
      input.value = "";
      filterItems("");
      input.focus();
      document.body.style.overflow = "hidden";
    }

    function closePalette() {
      palette.classList.remove("is-open");
      palette.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      input.blur();
      currentIndex = -1;
      updateSelection(items);
    }

    function filterItems(query) {
      const q = query.toLowerCase();
      items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? "flex" : "none";
      });
      currentIndex = -1; // Reset selection on typing
      updateSelection(getVisibleItems());
    }

    function getVisibleItems() {
      return items.filter(item => item.style.display !== "none");
    }

    function updateSelection(visibleItems) {
      items.forEach(item => item.classList.remove("active"));
      if (visibleItems.length > 0 && currentIndex >= 0) {
        visibleItems[currentIndex].classList.add("active");
        visibleItems[currentIndex].scrollIntoView({ block: "nearest" });
      }
    }

    function executeAction(item) {
      if (!item) return;
      const action = item.dataset.action;
      
      if (action === "link") {
        const href = item.dataset.href;
        if (href.startsWith("#")) {
          const target = document.querySelector(href);
          if (target) target.scrollIntoView({ behavior: "smooth" });
        } else {
          window.open(href, "_blank", "noopener noreferrer");
        }
      } else if (action === "theme" && themeToggleBtn) {
        themeToggleBtn.click();
      }
      
      closePalette();
    }

    // Keyboard bindings
    document.addEventListener("keydown", (e) => {
      // Toggle on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        palette.classList.contains("is-open") ? closePalette() : openPalette();
      }
      // Close on Escape
      if (e.key === "Escape" && palette.classList.contains("is-open")) {
        closePalette();
      }
    });

    // Arrow navigation inside input
    input.addEventListener("keydown", (e) => {
      const visibleItems = getVisibleItems();
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        currentIndex = (currentIndex + 1) % visibleItems.length;
        updateSelection(visibleItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
        updateSelection(visibleItems);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const targetItem = currentIndex >= 0 ? visibleItems[currentIndex] : visibleItems[0];
        executeAction(targetItem);
      }
    });

    // Mouse interactions
    input.addEventListener("input", (e) => filterItems(e.target.value));
    backdrop.addEventListener("click", closePalette);
    
    items.forEach(item => {
      item.addEventListener("mouseenter", () => {
        currentIndex = getVisibleItems().indexOf(item);
        updateSelection(getVisibleItems());
      });
      item.addEventListener("click", () => executeAction(item));
    });

  } catch (err) {
    console.error("Command Palette failed to initialize:", err);
  }
})();