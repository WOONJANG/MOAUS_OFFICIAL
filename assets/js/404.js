// 중요:
// - 유저/조직 페이지: BASE_PATH = "/"
// - 프로젝트 페이지: BASE_PATH = "/repo-name/"
const BASE_PATH = "/"; // ← 프로젝트 페이지면 "/repo-name/"로 바꾸세요.

document.addEventListener("DOMContentLoaded", () => {
  const fullPath = (location.pathname || "/") + (location.search || "") + (location.hash || "");
  const req = document.getElementById("reqPath");
  if (req) req.textContent = fullPath;

  const home = document.getElementById("homeLink");
  if (home) home.setAttribute("href", BASE_PATH);

  const contact = document.getElementById("contactLink");
  if (contact) contact.setAttribute("href", BASE_PATH.replace(/\/?$/, "/") + "contact.html");
});
