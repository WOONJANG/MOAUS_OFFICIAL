document.addEventListener("DOMContentLoaded", () => {
  const contactImg = document.getElementById("contactImg");
  const imgFallback = document.getElementById("imgFallback");

  if (!contactImg || !imgFallback) return;

  contactImg.addEventListener("error", () => {
    contactImg.style.display = "none";
    imgFallback.style.display = "block";
  });
});
