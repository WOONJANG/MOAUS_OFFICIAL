// Swiper init (Swiper 스크립트가 먼저 로드되어 있어야 함)
(function () {
  if (typeof Swiper === "undefined") return;

  new Swiper("#heroSwiper", {
    loop: true,
    speed: 650,
    autoplay: { delay: 3500, disableOnInteraction: false },
    pagination: { el: ".swiper-pagination", clickable: true },
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
  });
})();
