(() => {
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("drawerOverlay");
  const openBtn = document.getElementById("openDrawer");
  const closeBtn = document.getElementById("closeDrawer");

  if(!drawer || !openBtn) return;

  let lastFocus = null;

  const focusableSelector = `
    a[href], button:not([disabled]), input:not([disabled]),
    select:not([disabled]), textarea:not([disabled]),
    [tabindex]:not([tabindex="-1"])
  `.replace(/\s+/g," ");

  const getFocusables = () =>
    [...drawer.querySelectorAll(focusableSelector)]
      .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));

  const isOpen = () => drawer.classList.contains("is-open");

  function open(){
    if(isOpen()) return;
    lastFocus = document.activeElement;

    drawer.classList.add("is-open");
    overlay?.classList.add("is-open");

    drawer.setAttribute("aria-hidden", "false");
    openBtn.setAttribute("aria-expanded", "true");
    document.body.classList.add("drawer-open");

    const f = getFocusables();
    (f[0] || drawer).focus?.();
  }

  function close(){
    if(!isOpen()) return;

    drawer.classList.remove("is-open");
    overlay?.classList.remove("is-open");

    drawer.setAttribute("aria-hidden", "true");
    openBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-open");

    lastFocus?.focus?.();
    lastFocus = null;
  }

  openBtn.addEventListener("click", () => isOpen() ? close() : open());
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);

  // ESC + focus trap
  document.addEventListener("keydown", (e) => {
    if(!isOpen()) return;

    if(e.key === "Escape"){
      e.preventDefault();
      close();
      return;
    }

    if(e.key !== "Tab") return;

    const f = getFocusables();
    if(f.length === 0) return;

    const first = f[0];
    const last = f[f.length - 1];

    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    }else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  });

  // close on link click
  drawer.addEventListener("click", (e) => {
    const a = e.target.closest?.("a[href]");
    if(!a) return;
    close();
  });

})();
