(async () => {

  /* =========================================================
     THEME (dark/light)
     - html[data-theme]="dark|light" 로 CSS 토큰 스위칭
     - localStorage("theme") 저장
     ========================================================= */
  const THEME_KEY = "theme";

  function getSystemTheme(){
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
  }

  function normalizeTheme(t){
    return (t === "dark" || t === "light") ? t : null;
  }

  function readStoredTheme(){
    try{
      return normalizeTheme(localStorage.getItem(THEME_KEY));
    }catch(e){
      return null;
    }
  }

  function writeStoredTheme(t){
    try{
      localStorage.setItem(THEME_KEY, t);
    }catch(e){}
  }

  function applyTheme(t){
    const theme = normalizeTheme(t) || getSystemTheme();
    const root = document.documentElement;

    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    // 버튼 상태 동기화 (header partial이 들어온 뒤에도 호출될 수 있음)
    const btn = document.getElementById("themeToggle");
    if(btn){
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      btn.title = theme === "dark" ? "라이트 모드" : "다크 모드";
    }
  }

  function initThemeEarly(){
    // 저장값 우선, 없으면 OS 테마
    const stored = readStoredTheme();
    applyTheme(stored || getSystemTheme());
  }

  function initThemeToggle(){
    const btn = document.getElementById("themeToggle");
    if(!btn) return;

    btn.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme || getSystemTheme();
      const next = (cur === "light") ? "dark" : "light";
      writeStoredTheme(next);
      applyTheme(next);
    });
  }

  async function includePartials(){
    const nodes = document.querySelectorAll("[data-include]");
    await Promise.all([...nodes].map(async (el) => {
      const url = el.getAttribute("data-include");
      if(!url) return;

      try{
        const res = await fetch(url, { cache: "no-cache" });
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        el.innerHTML = await res.text();
      }catch(err){
        el.innerHTML = `<div style="color:#f66;font-size:12px;padding:8px;border:1px solid rgba(255,0,0,.3)">
          include failed: ${url} (${err.message})
        </div>`;
      }
    }));
  }

  function setActiveLinks(){
    const cur = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    const mark = (selector) => {
      document.querySelectorAll(selector).forEach(a => {
        const href = (a.getAttribute("href") || "").toLowerCase();
        if(!href || href.startsWith("http") || href.startsWith("#")) return;

        const file = href.split("/").pop().split("#")[0].split("?")[0];
        a.classList.toggle("active", file === cur);
      });
    };

    mark(".nav a");
    mark(".drawer a");
  }

  function initHeaderScroll(){
    const header = document.getElementById("siteHeader");
    if(!header) return;

    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function initDrawer(){
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("drawerBackdrop");
    const openBtn = document.getElementById("openDrawer");
    const closeBtn = document.getElementById("closeDrawer");

    if(!drawer || !backdrop || !openBtn || !closeBtn) return;

    openBtn.setAttribute("aria-expanded", "false");
    drawer.setAttribute("aria-hidden", "true");

    let lastFocus = null;
    const focusable = 'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])';

    function trapFocus(e){
      if(e.key !== "Tab") return;

      const items = [...drawer.querySelectorAll(focusable)].filter(el => !el.hasAttribute("disabled"));
      if(items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if(e.shiftKey && document.activeElement === first){
        e.preventDefault();
        last.focus();
      } else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault();
        first.focus();
      }
    }

    function closeDrawer(){
      drawer.classList.remove("open");
      backdrop.classList.remove("show");
      document.body.style.overflow = "";

      openBtn.setAttribute("aria-expanded", "false");
      drawer.setAttribute("aria-hidden", "true");

      drawer.removeEventListener("keydown", trapFocus);
      window.removeEventListener("keydown", onKeydown);

      if(lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    function onKeydown(e){
      if(e.key === "Escape") closeDrawer();
    }

    function openDrawer(){
      lastFocus = document.activeElement;

      drawer.classList.add("open");
      backdrop.classList.add("show");
      document.body.style.overflow = "hidden";

      openBtn.setAttribute("aria-expanded", "true");
      drawer.setAttribute("aria-hidden", "false");

      const first = drawer.querySelector(focusable);
      if(first) first.focus();

      drawer.addEventListener("keydown", trapFocus);
      window.addEventListener("keydown", onKeydown);
    }

    openBtn.addEventListener("click", openDrawer);
    closeBtn.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
  }

  // ✅ Dev credit toggle (WOONIVERSE → build badge)
  function initDevCredit(){
    const el = document.getElementById("devCredit");
    if(!el) return;

    const defaultText = ((el.dataset.default || el.textContent) || "").trim();
    const badgeText = (el.dataset.badge || "Build v1.0.0").trim();

    let timer = null;
    let showingBadge = false;

    function setText(next){
      el.textContent = next;
    }

    function show(flag){
      showingBadge = flag;
      setText(showingBadge ? badgeText : defaultText);
    }

    function toggle(){
      clearTimeout(timer);
      show(!showingBadge);

      // 과하지 않게 자동 원복 (원하면 제거 가능)
      if(showingBadge){
        timer = setTimeout(() => show(false), 1500);
      }
    }

    el.style.cursor = "pointer";
    el.addEventListener("click", toggle);

    // 키보드 사용자 배려: Enter/Space 토글, ESC 원복
    el.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        toggle();
      }
      if(e.key === "Escape"){
        clearTimeout(timer);
        show(false);
        el.blur();
      }
    });
  }

  /* =========================================================
     ✅ 실행 순서
     1) 테마 먼저 적용 (partial include 전)
     2) includePartials로 header/footer DOM 삽입
     3) 토글 버튼 이벤트 바인딩 (include 이후)
     ========================================================= */
  initThemeEarly();

  await includePartials();

  initThemeToggle();
  applyTheme(document.documentElement.dataset.theme); // 버튼 aria/title 동기화

  setActiveLinks();
  initHeaderScroll();
  initDrawer();
  initDevCredit();
})();
