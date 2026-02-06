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

  /* =========================================================
     PARTIALS
     ========================================================= */
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

  /* =========================================================
     UTIL
     ========================================================= */
  function getCurrentFile(){
    return (location.pathname.split("/").pop() || "index.html").toLowerCase();
  }

  function safeURL(href){
    try{
      return new URL(href, location.href);
    }catch(_){
      return null;
    }
  }

  function isExternalHref(href){
    if(!href) return true;
    const h = href.trim();
    if(!h) return true;
    if(h.startsWith("#")) return false;
    if(/^https?:\/\//i.test(h)) return true;
    if(/^mailto:/i.test(h)) return true;
    if(/^tel:/i.test(h)) return true;
    return false;
  }

  function getHeaderHeight(){
    const header = document.getElementById("siteHeader");
    if(!header) return 0;

    // CSS 토큰(--headerH)이 px로 잡혀있으면 그걸 우선
    const cssVal = getComputedStyle(document.documentElement).getPropertyValue("--headerH").trim();
    if(cssVal.endsWith("px")){
      const n = parseFloat(cssVal);
      if(!Number.isNaN(n)) return n;
    }
    return header.getBoundingClientRect().height || 0;
  }

  /* =========================================================
     SKIP LINK / MAIN ID (없으면 자동 생성)
     ========================================================= */
  function ensureMainAndSkipLink(){
    const main = document.querySelector("main");
    if(main && !main.id) main.id = "main";

    // skip-link가 이미 있으면 건드리지 않음
    if(document.querySelector(".skip-link")) return;

    const a = document.createElement("a");
    a.className = "skip-link";
    a.href = "#main";
    a.textContent = "본문으로 바로가기";

    // body 맨 앞에 삽입
    document.body.insertBefore(a, document.body.firstChild);

    // 최소 스타일 주입(레이아웃 CSS에 이미 있으면 무시될 수 있음)
    const id = "skip-link-style";
    if(document.getElementById(id)) return;
    const st = document.createElement("style");
    st.id = id;
    st.textContent = `
      .skip-link{
        position:absolute; left:-9999px; top:10px;
        padding:10px 12px; border-radius:12px;
        background: rgba(255,255,255,.10);
        border:1px solid rgba(255,255,255,.18);
        color: var(--fg, #fff);
        z-index:2000;
      }
      .skip-link:focus{ left:12px; }
    `;
    document.head.appendChild(st);
  }

  /* =========================================================
     ACTIVE LINKS (hash까지 정확히)
     + aria-current 자동 처리
     ========================================================= */
  function setActiveLinks(){
    const curFile = getCurrentFile();
    const curHash = (location.hash || "").toLowerCase();

    const applyTo = (selector) => {
      document.querySelectorAll(selector).forEach(a => {
        const hrefRaw = (a.getAttribute("href") || "").trim();
        a.classList.remove("active");
        a.removeAttribute("aria-current");

        if(!hrefRaw) return;

        // 해시만(#shop)
        if(hrefRaw.startsWith("#")){
          const h = hrefRaw.toLowerCase();
          const isActive = curHash && h === curHash;
          if(isActive){
            a.classList.add("active");
            a.setAttribute("aria-current", "location");
          }
          return;
        }

        // 외부/특수 링크는 활성 처리 안 함
        if(/^https?:\/\//i.test(hrefRaw)) return;
        if(/^mailto:/i.test(hrefRaw)) return;
        if(/^tel:/i.test(hrefRaw)) return;

        const u = safeURL(hrefRaw);
        if(!u) return;

        const file = (u.pathname.split("/").pop() || "index.html").toLowerCase();
        const hash = (u.hash || "").toLowerCase();

        if(file !== curFile) return;

        // 같은 파일이라도 hash가 있으면 hash까지 같을 때만 active
        if(hash){
          const isActive = !!curHash && (hash === curHash);
          if(isActive){
            a.classList.add("active");
            a.setAttribute("aria-current", "location");
          }
          return;
        }

        // 순수 페이지 링크는 현재 hash가 없을 때만 active
        if(!curHash){
          a.classList.add("active");
          a.setAttribute("aria-current", "page");
        }
      });
    };

    applyTo(".nav a");
    applyTo(".drawer a");
  }

  /* =========================================================
     Drawer(aside)에서 "현재 페이지(파일)" 링크 숨김
     - 섹션 링크(index.html#shop)는 숨기지 않음
     ========================================================= */
  function hideCurrentLinkInDrawer(){
    const drawer = document.getElementById("drawer") || document.querySelector(".drawer");
    if(!drawer) return;

    const curFile = getCurrentFile();

    drawer.querySelectorAll("a[href]").forEach(a => {
      a.classList.remove("is-current");

      const href = (a.getAttribute("href") || "").trim();
      if(!href) return;

      if(href.startsWith("#")) return;
      if(/^https?:\/\//i.test(href)) return;
      if(/^mailto:/i.test(href)) return;
      if(/^tel:/i.test(href)) return;

      const u = safeURL(href);
      if(!u) return;

      const file = (u.pathname.split("/").pop() || "index.html").toLowerCase();
      const hash = (u.hash || "");

      // 같은 파일 + 해시 없는 "페이지 링크"만 숨김
      if(file === curFile && !hash){
        a.classList.add("is-current");
      }
    });
  }

  /* =========================================================
     HEADER SCROLL (scrolled class)
     ========================================================= */
  function initHeaderScroll(){
    const header = document.getElementById("siteHeader");
    if(!header) return;

    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* =========================================================
     HEADER PROGRESS BAR (자동 생성 + CSS 주입)
     ========================================================= */
  function ensureHeaderProgress(){
    const header = document.getElementById("siteHeader");
    if(!header) return;

    // position이 없으면 absolute 배치가 깨지니 보정 (이미 fixed면 괜찮음)
    const cs = getComputedStyle(header);
    if(cs.position === "static"){
      header.style.position = "relative";
    }

    // progress element 없으면 생성
    if(!header.querySelector(".headerProgress")){
      const bar = document.createElement("div");
      bar.className = "headerProgress";
      bar.setAttribute("aria-hidden", "true");
      header.appendChild(bar);
    }

    // CSS 없으면 주입
    const styleId = "header-progress-style";
    if(!document.getElementById(styleId)){
      const st = document.createElement("style");
      st.id = styleId;
      st.textContent = `
        .headerProgress{
          position:absolute;
          left:0; right:0; bottom:0;
          height:2px;
          background: rgba(255,255,255,.08);
          overflow:hidden;
          pointer-events:none;
        }
        .headerProgress::before{
          content:"";
          display:block;
          height:100%;
          width: var(--scrollP, 0%);
          background: rgba(255,255,255,.75);
          transform: translateZ(0);
        }
        html[data-theme="light"] .headerProgress{
          background: rgba(0,0,0,.08);
        }
        html[data-theme="light"] .headerProgress::before{
          background: rgba(0,0,0,.65);
        }
      `;
      document.head.appendChild(st);
    }
  }

  function initScrollProgress(){
    const doc = document.documentElement;

    const update = () => {
      const max = (doc.scrollHeight - doc.clientHeight) || 1;
      const p = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
      doc.style.setProperty("--scrollP", p.toFixed(2) + "%");
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  /* =========================================================
     ANCHOR OFFSET (헤더에 가리지 않게)
     - index.html#shop 같은 링크 클릭/새로고침 모두 보정
     ========================================================= */
  function scrollToHash(hash, behavior="smooth"){
    const id = (hash || "").replace("#", "");
    if(!id) return;

    const el = document.getElementById(id);
    if(!el) return;

    const top = window.scrollY + el.getBoundingClientRect().top - getHeaderHeight() - 12;
    window.scrollTo({ top, behavior });
  }

  function initAnchorOffset(){
    // 로드 시 hash 있으면 보정
    window.addEventListener("load", () => {
      if(location.hash){
        // 첫 렌더 후 보정이 안정적
        setTimeout(() => scrollToHash(location.hash, "auto"), 0);
      }
    });

    // 클릭으로 hash 이동 시 보정
    document.addEventListener("click", (e) => {
      const a = e.target.closest?.('a[href]');
      if(!a) return;

      const href = (a.getAttribute("href") || "").trim();
      if(!href) return;

      // 외부/특수 제외
      if(/^https?:\/\//i.test(href)) return;
      if(/^mailto:/i.test(href)) return;
      if(/^tel:/i.test(href)) return;

      const u = safeURL(href);
      if(!u || !u.hash) return;

      // 같은 페이지 내 hash 이동만 가로챔
      if(u.pathname !== location.pathname) return;

      e.preventDefault();
      history.pushState(null, "", u.hash);
      scrollToHash(u.hash, "smooth");

      // active 갱신
      setActiveLinks();
      hideCurrentLinkInDrawer();
    });

    // 뒤로/앞으로 시 hash 보정
    window.addEventListener("popstate", () => {
      if(location.hash){
        scrollToHash(location.hash, "auto");
      }
      setActiveLinks();
      hideCurrentLinkInDrawer();
    });
  }

  /* =========================================================
     DRAWER (open/close + focus trap + ESC + link click close)
     ========================================================= */
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

    function getFocusable(){
      return [...drawer.querySelectorAll(focusable)].filter(el => !el.hasAttribute("disabled"));
    }

    function trapFocus(e){
      if(e.key !== "Tab") return;

      const items = getFocusable();
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

    function onKeydown(e){
      if(e.key === "Escape") closeDrawer();
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

    // 링크 클릭 시 닫기(페이지 이동/섹션 이동 모두)
    drawer.addEventListener("click", (e) => {
      const a = e.target.closest?.("a[href]");
      if(!a) return;
      closeDrawer();
    });

    openBtn.addEventListener("click", openDrawer);
    closeBtn.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
  }

  /* =========================================================
     EXTERNAL LINK SAFETY (target=_blank => rel noopener noreferrer)
     ========================================================= */
  function fixExternalBlankRel(){
    document.querySelectorAll('a[target="_blank"]').forEach(a => {
      const rel = (a.getAttribute("rel") || "").toLowerCase().split(/\s+/).filter(Boolean);
      ["noopener", "noreferrer"].forEach(v => { if(!rel.includes(v)) rel.push(v); });
      a.setAttribute("rel", rel.join(" "));
    });
  }

  /* =========================================================
     PREFETCH (hover 시 다음 문서 미리 받기)
     - 과하면 트래픽 늘어남. 메뉴에만 자연스럽게 적용됨.
     ========================================================= */
  function initPrefetchOnHover(){
    const seen = new Set();

    function shouldPrefetch(href){
      if(!href) return false;
      if(href.startsWith("#")) return false;
      if(/^https?:\/\//i.test(href)) return false;
      if(/^mailto:/i.test(href) || /^tel:/i.test(href)) return false;
      return true;
    }

    function prefetch(href){
      const u = safeURL(href);
      if(!u) return;

      // 같은 문서만 대상으로(쿼리/해시 제거)
      const key = u.pathname + u.search;
      if(seen.has(key)) return;
      seen.add(key);

      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = u.href;
      link.as = "document";
      document.head.appendChild(link);
    }

    document.addEventListener("mouseover", (e) => {
      const a = e.target.closest?.("a[href]");
      if(!a) return;

      // nav/drawer 위주로만
      if(!a.closest(".nav") && !a.closest(".drawer")) return;

      const href = (a.getAttribute("href") || "").trim();
      if(!shouldPrefetch(href)) return;
      prefetch(href);
    });
  }

  /* =========================================================
     DEV CREDIT TOGGLE (WOONIVERSE → build badge)
     ========================================================= */
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

      if(showingBadge){
        timer = setTimeout(() => show(false), 1500);
      }
    }

    el.style.cursor = "pointer";
    el.addEventListener("click", toggle);

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
     ========================================================= */
  initThemeEarly();

  await includePartials();

  // partial 들어온 뒤
  initThemeToggle();
  applyTheme(document.documentElement.dataset.theme); // 버튼 aria/title 동기화

  ensureMainAndSkipLink();

  initHeaderScroll();
  ensureHeaderProgress();
  initScrollProgress();

  initAnchorOffset();

  setActiveLinks();
  hideCurrentLinkInDrawer();

  initDrawer();
  initDevCredit();

  fixExternalBlankRel();
  initPrefetchOnHover();

})();
