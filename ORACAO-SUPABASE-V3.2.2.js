/* === PIBR ORAÇÃO -> SUPABASE V3.2.2 START === */
(() => {
  "use strict";

  const PIBR_SUPABASE_URL = "https://trurqjrypocuojhmpuur.supabase.co";
  const PIBR_SUPABASE_KEY = "sb_publishable_pPf62PLIo5zdicp6eskbJA_Z-vfaDeP";
  const PIBR_PRAYER_RPC = `${PIBR_SUPABASE_URL}/rest/v1/rpc/pibr_submit_prayer_request`;

  const valueOf = (form, selector) => form.querySelector(selector)?.value?.trim() || "";

  async function pibrSyncPrayerToPanel(form) {
    const contact = form.querySelector('input[name="entry.270962273"]:checked');
    const ageRaw = valueOf(form, "#oracao-idade");
    const age = Number.parseInt(ageRaw, 10);

    const payload = {
      p_requester_name: valueOf(form, "#oracao-nome"),
      p_requester_phone: valueOf(form, "#oracao-whatsapp"),
      p_message: valueOf(form, "#pedido"),
      p_category: valueOf(form, "#pedido-area") || null,
      p_age: Number.isInteger(age) ? age : null,
      p_location_text: valueOf(form, "#oracao-bairro") || null,
      p_church_info: valueOf(form, "#oracao-cristao") || null,
      p_wants_contact: contact?.value === "Sim",
      p_cell_info: valueOf(form, "#oracao-celula") || null,
      p_honeypot: null
    };

    if (
      !payload.p_requester_name ||
      !payload.p_requester_phone ||
      !payload.p_message ||
      !payload.p_category ||
      !payload.p_age ||
      !payload.p_location_text ||
      !contact
    ) return;

    const response = await fetch(PIBR_PRAYER_RPC, {
      method: "POST",
      headers: {
        "apikey": PIBR_SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Supabase ${response.status}: ${errorText}`);
    }

    const result = await response.json().catch(() => null);
    console.info("[PIBR V3.2.2] Pedido enviado ao painel.", result);
  }

  function pibrEnablePrayerSync() {
    const form = document.querySelector("#prayer-form");
    if (!form || form.dataset.pibrPrayerV322 === "true") return;

    form.dataset.pibrPrayerV322 = "true";

    form.addEventListener("submit", (event) => {
      if (event.defaultPrevented) return;

      // Captura os valores antes do código antigo limpar o formulário.
      pibrSyncPrayerToPanel(form).catch((error) => {
        console.error("[PIBR V3.2.2] Falha ao enviar pedido ao painel:", error);
      });
    }, true);

    console.info("[PIBR V3.2.2] Sincronização oração -> painel ATIVA.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pibrEnablePrayerSync, { once: true });
  } else {
    pibrEnablePrayerSync();
  }
})();
/* === PIBR ORAÇÃO -> SUPABASE V3.2.2 END === */