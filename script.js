/* =========================================================
   MENU MOBILE
========================================================= */
const burger = document.querySelector(".burger");
const mobileOverlay = document.querySelector(".mobile-overlay");

if (burger && mobileOverlay) {
  burger.addEventListener("click", () => {
    const open = mobileOverlay.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    mobileOverlay.setAttribute("aria-hidden", String(!open));
  });

  mobileOverlay.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileOverlay.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
      mobileOverlay.setAttribute("aria-hidden", "true");
    });
  });
}

/* =========================================================
   FORMULÁRIO DE ORAÇÃO
========================================================= */
const prayerForm = document.querySelector("#prayer-form");

if (prayerForm) {
  prayerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const whatsappNumber = "5544998338663";
    const nameInput = document.querySelector("#nome");
    const emailInput = document.querySelector("#email");
    const prayerInput = document.querySelector("#pedido");
    const nameError = document.querySelector("#erro-nome");
    const prayerError = document.querySelector("#erro-pedido");

    const name = nameInput?.value.trim() || "";
    const email = emailInput?.value.trim() || "";
    const prayer = prayerInput?.value.trim() || "";

    if (nameError) nameError.style.display = name ? "none" : "block";
    if (prayerError) prayerError.style.display = prayer ? "none" : "block";

    if (!name || !prayer) return;

    let message = `Pedido de oração\n\nNome: ${name}`;
    if (email) message += `\nE-mail: ${email}`;
    message += `\n\n${prayer}`;

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  });
}

/* =========================================================
   PARALLAX HERO MINISTÉRIOS (com requestAnimationFrame)
========================================================= */
const ministriesHero = document.querySelector(".ministries-hero");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (ministriesHero && !reduceMotion) {
  let ticking = false;

  const updateParallax = () => {
    const offset = ministriesHero.getBoundingClientRect().top;

    if (offset < window.innerHeight && offset > -window.innerHeight) {
      ministriesHero.style.backgroundPosition = `center ${offset * -0.12}px`;
    }

    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
}

/* =========================================================
   VÍDEO DO HERO
========================================================= */
const heroVideo = document.querySelector(".hero-video");
const videoSoundButton = document.querySelector(".video-sound");
const videoPauseButton = document.querySelector(".video-pause");

// helper seguro para chamar .play() sem warning no console
function safePlay(video) {
  const result = video.play();
  if (result && typeof result.catch === "function") {
    result.catch(() => {
      /* autoplay bloqueado pelo navegador — ignora silenciosamente */
    });
  }
}

if (heroVideo) {
  heroVideo.muted = true;

  heroVideo.addEventListener("click", () => {
    const source = heroVideo.querySelector("source");
    const videoSource = heroVideo.currentSrc || source?.src;
    if (videoSource) openLightbox("video", videoSource);
  });
}

if (heroVideo && videoSoundButton) {
  videoSoundButton.addEventListener("click", () => {
    heroVideo.muted = !heroVideo.muted;
    safePlay(heroVideo);
    videoSoundButton.innerHTML = heroVideo.muted
      ? '<i class="fas fa-volume-mute"></i>'
      : '<i class="fas fa-volume-up"></i>';
    videoSoundButton.setAttribute("aria-label", heroVideo.muted ? "Ativar som" : "Desativar som");
  });
}

if (heroVideo && videoPauseButton) {
  videoPauseButton.addEventListener("click", () => {
    if (heroVideo.paused) {
      safePlay(heroVideo);
      videoPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
      videoPauseButton.setAttribute("aria-label", "Pausar vídeo");
    } else {
      heroVideo.pause();
      videoPauseButton.innerHTML = '<i class="fas fa-play"></i>';
      videoPauseButton.setAttribute("aria-label", "Reproduzir vídeo");
    }
  });
}

/* =========================================================
   ASSISTA AO CULTO (vídeo sob demanda, via lightbox)
========================================================= */
document.querySelectorAll(".watch-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const videoSrc = trigger.dataset.videoSrc;
    const videoPoster = trigger.dataset.videoPoster || "";
    if (videoSrc) openLightbox("video", videoSrc, videoPoster);
  });
});

/* =========================================================
   GALERIA: FOTOS DO ÚLTIMO CULTO
   (grade de destaque + modal com todas as fotos + visualizador)
========================================================= */

// LISTA DE FOTOS — para adicionar mais fotos, é só incluir novas
// linhas aqui. A grade de destaque, o contador e o modal "ver
// todas" se atualizam sozinhos, sem precisar mexer em mais nada.
const cultoPhotos = [
  { src: "assets/pibr-culto/culto-01.jpg", alt: "Foto 1 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-02.jpg", alt: "Foto 2 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-03.jpg", alt: "Foto 3 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-04.jpg", alt: "Foto 4 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-05.jpg", alt: "Foto 5 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-06.jpg", alt: "Foto 6 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-07.jpg", alt: "Foto 7 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-08.jpg", alt: "Foto 8 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-09.jpg", alt: "Foto 9 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-10.jpg", alt: "Foto 10 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-11.jpg", alt: "Foto 11 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-12.jpg", alt: "Foto 12 do último culto — Batista Renovada Morumbi" },
];

const CULTO_FEATURED_COUNT = 12;

const cultoFeaturedGrid = document.querySelector("#cultoFeaturedGrid");
const cultoOpenAllBtn = document.querySelector("#cultoOpenAll");
const cultoCountEl = document.querySelector("#cultoCount");
const cultoModal = document.querySelector("#cultoModal");
const cultoModalThumbs = document.querySelector("#cultoModalThumbs");
const cultoModalTotal = document.querySelector("#cultoModalTotal");
const cultoModalClose = document.querySelector("#cultoModalClose");
const cultoViewer = document.querySelector("#cultoViewer");
const cultoViewerImg = document.querySelector("#cultoViewerImg");
const cultoViewerCounter = document.querySelector("#cultoViewerCounter");
const cultoViewerPrev = document.querySelector("#cultoViewerPrev");
const cultoViewerNext = document.querySelector("#cultoViewerNext");
const cultoViewerClose = document.querySelector("#cultoViewerClose");

let cultoViewerIndex = 0;

function buildCultoPhotoButton(photo, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "culto-photo";
  button.setAttribute("aria-label", `Ampliar foto ${index + 1}`);

  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = photo.alt;
  img.loading = "lazy";
  img.decoding = "async";

  button.appendChild(img);
  button.addEventListener("click", () => openCultoViewer(index));
  return button;
}

function lockScroll(lock) {
  document.body.style.overflow = lock ? "hidden" : "";
}

// grade de destaque (as primeiras fotos, sempre visíveis na seção)
if (cultoFeaturedGrid && cultoPhotos.length) {
  cultoPhotos.slice(0, CULTO_FEATURED_COUNT).forEach((photo, index) => {
    cultoFeaturedGrid.appendChild(buildCultoPhotoButton(photo, index));
  });

  if (cultoCountEl) cultoCountEl.textContent = `(${cultoPhotos.length})`;

}

// modal com todas as fotos (miniaturas carregadas sob demanda, só quando aberto)
function openCultoModal() {
  if (!cultoModal || !cultoModalThumbs) return;

  if (!cultoModalThumbs.childElementCount) {
    cultoPhotos.forEach((photo, index) => {
      cultoModalThumbs.appendChild(buildCultoPhotoButton(photo, index));
    });
  }

  if (cultoModalTotal) cultoModalTotal.textContent = `${cultoPhotos.length} fotos`;

  cultoModal.classList.add("open");
  cultoModal.setAttribute("aria-hidden", "false");
  lockScroll(true);
}

function closeCultoModal() {
  if (!cultoModal) return;
  cultoModal.classList.remove("open");
  cultoModal.setAttribute("aria-hidden", "true");
  if (!cultoViewer?.classList.contains("open")) lockScroll(false);
}

// visualizador de foto única, com navegação prev/next, teclado e swipe
function updateCultoViewer() {
  const photo = cultoPhotos[cultoViewerIndex];
  if (!photo || !cultoViewerImg) return;
  cultoViewerImg.src = photo.src;
  cultoViewerImg.alt = photo.alt;
  if (cultoViewerCounter) {
    cultoViewerCounter.textContent = `${cultoViewerIndex + 1} de ${cultoPhotos.length}`;
  }
}

function openCultoViewer(index) {
  if (!cultoViewer || !cultoPhotos[index]) return;
  cultoViewerIndex = index;
  updateCultoViewer();
  cultoViewer.classList.add("open");
  cultoViewer.setAttribute("aria-hidden", "false");
  lockScroll(true);
}

function showCultoViewer(delta) {
  const total = cultoPhotos.length;
  cultoViewerIndex = (cultoViewerIndex + delta + total) % total;
  updateCultoViewer();
}

function closeCultoViewer() {
  if (!cultoViewer) return;
  cultoViewer.classList.remove("open");
  cultoViewer.setAttribute("aria-hidden", "true");
  if (cultoViewerImg) cultoViewerImg.src = "";
  if (!cultoModal?.classList.contains("open")) lockScroll(false);
}

if (cultoOpenAllBtn) cultoOpenAllBtn.addEventListener("click", openCultoModal);
if (cultoModalClose) cultoModalClose.addEventListener("click", closeCultoModal);
if (cultoModal) {
  cultoModal.addEventListener("click", (event) => {
    if (event.target === cultoModal) closeCultoModal();
  });
}

if (cultoViewerClose) cultoViewerClose.addEventListener("click", closeCultoViewer);
if (cultoViewerPrev) cultoViewerPrev.addEventListener("click", () => showCultoViewer(-1));
if (cultoViewerNext) cultoViewerNext.addEventListener("click", () => showCultoViewer(1));
if (cultoViewer) {
  cultoViewer.addEventListener("click", (event) => {
    if (event.target === cultoViewer) closeCultoViewer();
  });
}

document.addEventListener("keydown", (event) => {
  if (cultoViewer && cultoViewer.classList.contains("open")) {
    if (event.key === "Escape") closeCultoViewer();
    if (event.key === "ArrowLeft") showCultoViewer(-1);
    if (event.key === "ArrowRight") showCultoViewer(1);
  } else if (cultoModal && cultoModal.classList.contains("open") && event.key === "Escape") {
    closeCultoModal();
  }
});

// swipe no visualizador (mobile)
let cultoTouchStartX = 0;
if (cultoViewer) {
  cultoViewer.addEventListener("touchstart", (event) => {
    cultoTouchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  cultoViewer.addEventListener("touchend", (event) => {
    const deltaX = event.changedTouches[0].clientX - cultoTouchStartX;
    if (Math.abs(deltaX) > 40) showCultoViewer(deltaX > 0 ? -1 : 1);
  }, { passive: true });
}

/* =========================================================
   LIGHTBOX
========================================================= */
const lightbox = document.querySelector(".lightbox");
const lightboxContent = document.querySelector(".lightbox-content");
const lightboxClose = document.querySelector(".lightbox-close");

function openLightbox(type, src, alt = "") {
  if (!lightbox || !lightboxContent) return;

  lightboxContent.innerHTML = "";

  if (type === "video") {
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    if (alt) video.poster = alt;
    lightboxContent.appendChild(video);
    safePlay(video);
  } else {
    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    lightboxContent.appendChild(image);
  }

  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  if (!lightbox || !lightboxContent) return;

  // pausa qualquer vídeo antes de remover do DOM, evita áudio "fantasma"
  const playingVideo = lightboxContent.querySelector("video");
  if (playingVideo) {
    playingVideo.pause();
    playingVideo.removeAttribute("src");
    playingVideo.load();
  }

  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxContent.innerHTML = "";
}

if (lightbox && lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("open")) {
      closeLightbox();
    }
  });
}
