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
   GALERIA / CARROSSEL
========================================================= */
const galleryTrack = document.querySelector(".gallery-track");
const galleryCards = document.querySelectorAll(".photo-card");
const galleryPrev = document.querySelector(".gallery-btn-prev");
const galleryNext = document.querySelector(".gallery-btn-next");
const galleryDotsContainer = document.querySelector(".gallery-dots");

let galleryIndex = 0;
let galleryTimer = null;
let cachedCardWidth = 0;
let cachedGap = 0;

function getVisibleGalleryCount() {
  if (window.innerWidth <= 600) return 1;
  if (window.innerWidth <= 980) return 2;
  return 3;
}

function getMaxGalleryIndex() {
  const visibleCount = getVisibleGalleryCount();
  return Math.max(galleryCards.length - visibleCount, 0);
}

function measureGallery() {
  if (!galleryCards.length) return;
  cachedCardWidth = galleryCards[0].getBoundingClientRect().width;
  cachedGap = parseFloat(getComputedStyle(galleryTrack).gap) || 0;
}

function showGallerySlide(index) {
  const maxIndex = getMaxGalleryIndex();
  galleryIndex = Math.min(Math.max(index, 0), maxIndex);

  galleryTrack.style.transform = `translateX(-${galleryIndex * (cachedCardWidth + cachedGap)}px)`;

  galleryDotsContainer.querySelectorAll("button").forEach((dot, dotIndex) => {
    const isActive = dotIndex === galleryIndex;
    dot.classList.toggle("active", isActive);
    dot.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function restartGallery() {
  clearInterval(galleryTimer);
  galleryTimer = setInterval(() => {
    const maxIndex = getMaxGalleryIndex();
    showGallerySlide(galleryIndex >= maxIndex ? 0 : galleryIndex + 1);
  }, 5000);
}

function stopGallery() {
  clearInterval(galleryTimer);
  galleryTimer = null;
}

if (galleryTrack && galleryCards.length && galleryDotsContainer) {
  const maxIndex = getMaxGalleryIndex();
  const shouldShowDots = maxIndex <= 12;

  if (shouldShowDots) {
    galleryDotsContainer.hidden = false;
    // um dot por POSIÇÃO possível, não por card
    for (let i = 0; i <= maxIndex; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Ir para posição ${i + 1}`);
      dot.addEventListener("click", () => {
        showGallerySlide(i);
        restartGallery();
      });
      galleryDotsContainer.appendChild(dot);
    }
  } else {
    galleryDotsContainer.hidden = true;
  }

  galleryCards.forEach((card) => {
    card.addEventListener("click", () => {
      const image = card.querySelector("img");
      if (image) openLightbox("image", image.src, image.alt);
    });
  });

  if (galleryPrev) {
    galleryPrev.addEventListener("click", () => {
      showGallerySlide(galleryIndex - 1);
      restartGallery();
    });
  }

  if (galleryNext) {
    galleryNext.addEventListener("click", () => {
      showGallerySlide(galleryIndex + 1);
      restartGallery();
    });
  }

  measureGallery();
  showGallerySlide(0);
  restartGallery();

  // pausa o autoplay quando a galeria sai da tela (economiza ciclos)
  if ("IntersectionObserver" in window) {
    const galleryObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          restartGallery();
        } else {
          stopGallery();
        }
      });
    }, { threshold: 0.2 });

    galleryObserver.observe(galleryTrack);
  }

  // debounce no resize: recalcula medidas e reposiciona sem rajada de chamadas
  let resizeTimeout = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      measureGallery();
      showGallerySlide(galleryIndex);
    }, 150);
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
