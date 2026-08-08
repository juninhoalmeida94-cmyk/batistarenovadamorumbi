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
const prayerIframe = document.querySelector("#hidden_iframe_prayer");
const prayerSuccess = document.querySelector("#prayer-success");
let prayerSubmitting = false;

function showFieldError(errorId, show) {
  const error = document.querySelector(errorId);
  if (error) error.style.display = show ? "block" : "none";
}

function hasValue(selector) {
  return Boolean(document.querySelector(selector)?.value.trim());
}

function isValidWhatsapp(value) {
  return /^[0-9\s()+-]+$/.test(value.trim());
}

function showFormSuccess(messageElement, message) {
  if (!messageElement) return;
  messageElement.textContent = message;
  messageElement.style.display = "block";
}

function completePrayerSubmission() {
  if (!prayerSubmitting) return;
  prayerSubmitting = false;
  prayerForm?.reset();
  showFormSuccess(prayerSuccess, "Seu pedido foi recebido. Nossa equipe de intercessão estará orando por você.");
}

if (prayerForm) {
  prayerForm.addEventListener("submit", (event) => {
    if (prayerSuccess) prayerSuccess.style.display = "none";

    const whatsapp = document.querySelector("#oracao-whatsapp")?.value.trim() || "";
    const contactChecked = Boolean(document.querySelector('input[name="entry.270962273"]:checked'));

    const validations = [
      ["#erro-whatsapp", "#oracao-whatsapp", whatsapp && isValidWhatsapp(whatsapp)],
      ["#erro-nome", "#oracao-nome", hasValue("#oracao-nome")],
      ["#erro-pedido", "#pedido", hasValue("#pedido")],
      ["#erro-area", "#pedido-area", hasValue("#pedido-area")],
      ["#erro-idade", "#oracao-idade", hasValue("#oracao-idade")],
      ["#erro-bairro", "#oracao-bairro", hasValue("#oracao-bairro")],
      ["#erro-contato", 'input[name="entry.270962273"]', contactChecked]
    ];

    validations.forEach(([errorId, fieldSelector, valid]) => {
      showFieldError(errorId, !valid);
      document.querySelectorAll(fieldSelector).forEach((field) => {
        field.setAttribute("aria-invalid", String(!valid));
      });
    });

    const firstInvalid = validations.find(([, , valid]) => !valid);
    if (firstInvalid) {
      event.preventDefault();
      document.querySelector(firstInvalid[1])?.focus();
      return;
    }

    prayerSubmitting = true;
    window.setTimeout(completePrayerSubmission, 2500);
  });
}

if (prayerIframe) {
  prayerIframe.addEventListener("load", completePrayerSubmission);
}

/* =========================================================
   FORMULÁRIO DE CÉLULAS
========================================================= */
const cellsOpenModal = document.querySelector("#cells-open-modal");
const cellsModal = document.querySelector("#cells-modal");
const cellsModalClose = document.querySelector("#cells-modal-close");
const cellsForm = document.querySelector("#cells-form");
const cellsIframe = document.querySelector("#hidden_iframe_cells");
const cellsSuccess = document.querySelector("#cells-success");
let cellsSubmitting = false;
let cellsPreviousFocus = null;
let cellsPreviousBodyOverflow = "";

function completeCellsSubmission() {
  if (!cellsSubmitting) return;
  cellsSubmitting = false;
  cellsForm?.reset();
  showFormSuccess(cellsSuccess, "Recebemos seus dados! Em breve entraremos em contato para ajudar você a encontrar uma célula.");
}

function openCellsModal() {
  if (!cellsModal) return;
  cellsPreviousFocus = document.activeElement;
  cellsPreviousBodyOverflow = document.body.style.overflow;
  cellsModal.classList.add("open");
  cellsModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.querySelector("#cells-name-phone")?.focus(), 80);
}

function closeCellsModal() {
  if (!cellsModal) return;
  cellsModal.classList.remove("open");
  cellsModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = cellsPreviousBodyOverflow;
  if (cellsPreviousFocus instanceof HTMLElement) cellsPreviousFocus.focus();
}

if (cellsOpenModal) cellsOpenModal.addEventListener("click", openCellsModal);
if (cellsModalClose) cellsModalClose.addEventListener("click", closeCellsModal);
if (cellsModal) {
  cellsModal.addEventListener("click", (event) => {
    if (event.target === cellsModal) closeCellsModal();
  });
}

document.addEventListener("keydown", (event) => {
  if (!cellsModal?.classList.contains("open")) return;

  if (event.key === "Escape") {
    closeCellsModal();
    return;
  }

  if (event.key === "Tab") {
    const focusable = [...cellsModal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

if (cellsForm) {
  cellsForm.addEventListener("submit", (event) => {
    if (cellsSuccess) cellsSuccess.style.display = "none";

    const validations = [
      ["#cells-error-name-phone", hasValue("#cells-name-phone")],
      ["#cells-error-address", hasValue("#cells-address")]
    ];

    validations.forEach(([errorId, valid]) => showFieldError(errorId, !valid));

    if (validations.some(([, valid]) => !valid)) {
      event.preventDefault();
      return;
    }

    cellsSubmitting = true;
    window.setTimeout(completeCellsSubmission, 2500);
  });
}

if (cellsIframe) {
  cellsIframe.addEventListener("load", completeCellsSubmission);
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

  heroVideo.addEventListener("error", () => {
    heroVideo.style.display = "none";
    document.querySelector(".hero-video-controls")?.style.setProperty("display", "none");
  }, true);

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
  { src: "assets/pibr-culto/culto-13.jpg", alt: "Foto 13 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-14.jpg", alt: "Foto 14 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-15.jpg", alt: "Foto 15 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-16.jpg", alt: "Foto 16 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-17.jpg", alt: "Foto 17 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-18.jpg", alt: "Foto 18 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-19.jpg", alt: "Foto 19 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-20.jpg", alt: "Foto 20 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-21.jpg", alt: "Foto 21 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-22.jpg", alt: "Foto 22 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-23.jpg", alt: "Foto 23 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-24.jpg", alt: "Foto 24 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-25.jpg", alt: "Foto 25 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-26.jpg", alt: "Foto 26 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-27.jpg", alt: "Foto 27 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-28.jpg", alt: "Foto 28 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-29.jpg", alt: "Foto 29 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-30.jpg", alt: "Foto 30 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-31.jpg", alt: "Foto 31 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-32.jpg", alt: "Foto 32 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-33.jpg", alt: "Foto 33 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-34.jpg", alt: "Foto 34 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-35.jpg", alt: "Foto 35 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-36.jpg", alt: "Foto 36 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-37.jpg", alt: "Foto 37 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-38.jpg", alt: "Foto 38 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-39.jpg", alt: "Foto 39 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-40.jpg", alt: "Foto 40 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-41.jpg", alt: "Foto 41 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-42.jpg", alt: "Foto 42 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-43.jpg", alt: "Foto 43 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-44.jpg", alt: "Foto 44 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-45.jpg", alt: "Foto 45 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-46.jpg", alt: "Foto 46 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-47.jpg", alt: "Foto 47 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-48.jpg", alt: "Foto 48 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-49.jpg", alt: "Foto 49 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-50.jpg", alt: "Foto 50 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-51.jpg", alt: "Foto 51 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-52.jpg", alt: "Foto 52 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-53.jpg", alt: "Foto 53 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-54.jpg", alt: "Foto 54 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-55.jpg", alt: "Foto 55 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-56.jpg", alt: "Foto 56 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-57.jpg", alt: "Foto 57 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-58.jpg", alt: "Foto 58 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-59.jpg", alt: "Foto 59 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-60.jpg", alt: "Foto 60 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-61.jpg", alt: "Foto 61 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-62.jpg", alt: "Foto 62 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-63.jpg", alt: "Foto 63 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-64.jpg", alt: "Foto 64 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-65.jpg", alt: "Foto 65 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-66.jpg", alt: "Foto 66 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-67.jpg", alt: "Foto 67 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-68.jpg", alt: "Foto 68 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-69.jpg", alt: "Foto 69 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-70.jpg", alt: "Foto 70 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-71.jpg", alt: "Foto 71 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-72.jpg", alt: "Foto 72 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-73.jpg", alt: "Foto 73 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-74.jpg", alt: "Foto 74 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-75.jpg", alt: "Foto 75 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-76.jpg", alt: "Foto 76 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-77.jpg", alt: "Foto 77 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-78.jpg", alt: "Foto 78 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-79.jpg", alt: "Foto 79 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-80.jpg", alt: "Foto 80 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-81.jpg", alt: "Foto 81 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-82.jpg", alt: "Foto 82 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-83.jpg", alt: "Foto 83 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-84.jpg", alt: "Foto 84 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-85.jpg", alt: "Foto 85 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-86.jpg", alt: "Foto 86 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-87.jpg", alt: "Foto 87 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-88.jpg", alt: "Foto 88 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-89.jpg", alt: "Foto 89 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-90.jpg", alt: "Foto 90 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-91.jpg", alt: "Foto 91 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-92.jpg", alt: "Foto 92 do último culto — Batista Renovada Morumbi" },
  { src: "assets/pibr-culto/culto-93.jpg", alt: "Foto 93 do último culto — Batista Renovada Morumbi" },
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

  const frame = document.createElement("span");
  frame.className = "culto-photo-frame";

  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = photo.alt;
  img.loading = "lazy";
  img.decoding = "async";

  frame.appendChild(img);
  button.appendChild(frame);
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
