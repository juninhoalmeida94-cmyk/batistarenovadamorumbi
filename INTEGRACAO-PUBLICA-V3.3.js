/* === PIBR V3.3 — CÉLULAS + GALERIA SUPABASE START === */
(() => {
  "use strict";

  const PIBR_V33_URL = "https://trurqjrypocuojhmpuur.supabase.co";
  const PIBR_V33_KEY = "sb_publishable_pPf62PLIo5zdicp6eskbJA_Z-vfaDeP";

  function parseCellContact(raw) {
    const value = String(raw || "").trim();
    const matches = [...value.matchAll(/(?:\+?\d[\d\s().-]{6,}\d)/g)];
    const match = matches.length ? matches[matches.length - 1][0] : "";
    const digits = match.replace(/\D/g, "");
    let name = match ? value.replace(match, " ") : value;
    name = name.replace(/[|,;:/-]+$/g, "").replace(/\s{2,}/g, " ").trim();
    return { name, phone: match.trim(), digits };
  }

  const cellForm = document.querySelector("#cells-form");
  if (cellForm && cellForm.dataset.pibrV33 !== "true") {
    cellForm.dataset.pibrV33 = "true";
    cellForm.addEventListener("submit", () => {
      const contactRaw = document.querySelector("#cells-name-phone")?.value?.trim() || "";
      const location = document.querySelector("#cells-address")?.value?.trim() || "";
      const parsed = parseCellContact(contactRaw);
      if (parsed.name.length < 2 || parsed.digits.length < 8 || !location) return;

      fetch(`${PIBR_V33_URL}/rest/v1/rpc/pibr_submit_cell_interest`, {
        method: "POST",
        headers: {
          "apikey": PIBR_V33_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_full_name: parsed.name,
          p_phone: parsed.phone,
          p_location_text: location,
          p_notes: "Enviado pelo formulário Encontre uma Célula",
          p_honeypot: null
        })
      }).then(async response => {
        if (!response.ok) throw new Error(await response.text());
        console.info("[PIBR V3.3] Interesse em célula sincronizado com o painel.");
      }).catch(error => console.error("[PIBR V3.3] Falha ao sincronizar interesse em célula:", error));
    }, true);
  }

  async function loadPanelGallery() {
    if (typeof cultoPhotos === "undefined" || !Array.isArray(cultoPhotos)) return;
    try {
      const url = `${PIBR_V33_URL}/rest/v1/pibr_media_items?select=public_url,alt_text,title,caption,event_name,is_cover,sort_order,created_at&status=eq.published&order=created_at.desc`;
      const response = await fetch(url, { headers: { "apikey": PIBR_V33_KEY } });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      if (!Array.isArray(rows) || !rows.length) return;

      const latestEvent = rows.find(row => row.event_name)?.event_name || null;
      const chosen = latestEvent ? rows.filter(row => row.event_name === latestEvent) : rows;
      chosen.sort((a,b) => Number(b.is_cover)-Number(a.is_cover) || Number(a.sort_order||0)-Number(b.sort_order||0) || new Date(b.created_at)-new Date(a.created_at));

      const remote = chosen.map((row, index) => ({
        src: row.public_url,
        alt: row.alt_text || row.title || `Foto ${index + 1} — Batista Renovada Morumbi`
      })).filter(item => item.src);

      if (!remote.length) return;
      cultoPhotos.splice(0, cultoPhotos.length, ...remote);

      if (typeof cultoFeaturedGrid !== "undefined" && cultoFeaturedGrid) {
        cultoFeaturedGrid.innerHTML = "";
        cultoPhotos.slice(0, CULTO_FEATURED_COUNT).forEach((photo,index) => cultoFeaturedGrid.appendChild(buildCultoPhotoButton(photo,index)));
      }
      if (typeof cultoCountEl !== "undefined" && cultoCountEl) cultoCountEl.textContent = `(${cultoPhotos.length})`;
      if (typeof cultoModalThumbs !== "undefined" && cultoModalThumbs) cultoModalThumbs.innerHTML = "";
      if (typeof cultoModalTotal !== "undefined" && cultoModalTotal) cultoModalTotal.textContent = `${cultoPhotos.length} fotos`;
      console.info(`[PIBR V3.3] Galeria carregada do painel: ${cultoPhotos.length} foto(s).`);
    } catch (error) {
      console.warn("[PIBR V3.3] Galeria do painel indisponível; mantendo fotos locais.", error);
    }
  }

  loadPanelGallery();
})();
/* === PIBR V3.3 — CÉLULAS + GALERIA SUPABASE END === */