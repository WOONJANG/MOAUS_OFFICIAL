(async () => {
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

  // ✅ 실행 순서: include로 DOM 들어온 다음 초기화해야 함
  await includePartials();
  setActiveLinks();
  initHeaderScroll();
  initDrawer();
  initDevCredit();
})();
