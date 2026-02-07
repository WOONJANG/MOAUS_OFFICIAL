(async () => {

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
     HEADER PROGRESS BAR (스크롤 진행률)
     - .headerProgress는 header.html/layout.css에 이미 있으니 JS는 값만 갱신
     ========================================================= */
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
     CURSOR EASTER EGG (V-EXX 11 clicks)
     - includePartials() 이후에 DOM이 있어야 동작함
     ========================================================= */
  function initCursorEasterEgg(){
    const trigger = document.getElementById("vexxTrigger");
    const follower = document.getElementById("cursorFollower");
    if(!trigger || !follower) return;

    const REQUIRED_CLICKS = 11;
    let clicks = 0;
    let active = false;

    // 마지막 포인터 위치를 저장해두면, 활성화 직후에도 바로 등장 가능
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;

    // 목표/현재 위치 (부드럽게 따라오기)
    let targetX = -9999, targetY = -9999;
    let curX = -9999, curY = -9999;

    // 커서에서 살짝 떨어진 위치
    const offsetX = 10;
    const offsetY = 14;

    // span을 클릭/키보드로도 쓸 수 있게 최소 세팅
    trigger.style.cursor = "pointer";
    trigger.setAttribute("role", "button");
    trigger.tabIndex = 0;

    function activate(){
      active = true;

      targetX = lastX + offsetX;
      targetY = lastY + offsetY;
      curX = targetX;
      curY = targetY;

      follower.style.opacity = "1";
      follower.style.transform = `translate(${curX}px, ${curY}px)`;
      requestAnimationFrame(tick);
    }

    function deactivate(){
      active = false;
      follower.style.opacity = "0";
      follower.style.transform = "translate(-9999px, -9999px)";
      clicks = 0;
    }

    function countClick(){
      if(active) return; // 켜진 뒤에는 카운트 멈춤 (토글 원하면 여기 수정)
      clicks += 1;
      if(clicks >= REQUIRED_CLICKS) activate();
    }

    trigger.addEventListener("click", countClick);
    trigger.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        countClick();
      }
      if(e.key === "Escape" && active){
        deactivate();
        trigger.blur();
      }
    });

    // 포인터 위치는 항상 저장
    window.addEventListener("pointermove", (e) => {
      lastX = e.clientX;
      lastY = e.clientY;

      if(!active) return;
      targetX = lastX + offsetX;
      targetY = lastY + offsetY;
    }, { passive: true });

    function tick(){
      if(!active) return;

      // 스무딩(값 올리면 더 빨리 따라옴)
      curX += (targetX - curX) * 0.22;
      curY += (targetY - curY) * 0.22;

      follower.style.transform = `translate(${curX}px, ${curY}px)`;
      requestAnimationFrame(tick);
    }

    // 전역 ESC로도 끄기
    window.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && active) deactivate();
    });
  }

  /* =========================================================
     실행 순서
     ========================================================= */
  await includePartials();

  // ✅ include로 footer가 들어온 뒤에 실행돼야 함
  initCursorEasterEgg();

  ensureMainAndSkipLink();

  initHeaderScroll();
  initScrollProgress();

  initAnchorOffset();

  setActiveLinks();
  hideCurrentLinkInDrawer();

  initDrawer();
  initDevCredit();

  fixExternalBlankRel();

})();
