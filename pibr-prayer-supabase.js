(() => {
  "use strict";

  const SUPABASE_URL = "https://trurqjrypocuojhmpuur.supabase.co";
  const SUPABASE_KEY = "sb_publishable_pPf62PLIo5zdicp6eskbJA_Z-vfaDeP";
  const ENDPOINT = `${SUPABASE_URL}/rest/v1/rpc/pibr_submit_prayer_request`;

  function getValue(form, selector) {
    return form.querySelector(selector)?.value?.trim() || "";
  }

  function isValidWhatsapp(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13;
  }

  function isFormValid(form) {
    const whatsapp = getValue(form, "#oracao-whatsapp");
    const name = getValue(form, "#oracao-nome");
    const message = getValue(form, "#pedido");
    const category = getValue(form, "#pedido-area");
    const age = Number.parseInt(getValue(form, "#oracao-idade"), 10);
    const location = getValue(form, "#oracao-bairro");
    const contact = form.querySelector('input[name="entry.270962273"]:checked');

    return (
      isValidWhatsapp(whatsapp) &&
      name.length >= 2 &&
      message.length >= 5 &&
      Boolean(category) &&
      Number.isInteger(age) && age >= 1 && age <= 120 &&
      Boolean(location) &&
      Boolean(contact)
    );
  }

  async function sendToSupabase(form) {
    const whatsapp = getValue(form, "#oracao-whatsapp");
    const name = getValue(form, "#oracao-nome");
    const message = getValue(form, "#pedido");
    const category = getValue(form, "#pedido-area");
    const age = Number.parseInt(getValue(form, "#oracao-idade"), 10);
    const locationText = getValue(form, "#oracao-bairro");
    const churchInfo = getValue(form, "#oracao-cristao");
    const cellInfo = getValue(form, "#oracao-celula");
    const contact = form.querySelector('input[name="entry.270962273"]:checked');

    const response = await fetch(ENDPOINT, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_requester_name: name,
        p_requester_phone: whatsapp,
        p_message: message,
        p_category: category || null,
        p_age: age,
        p_location_text: locationText || null,
        p_church_info: churchInfo || null,
        p_wants_contact: contact?.value === "Sim",
        p_cell_info: cellInfo || null,
        p_honeypot: null
      })
    });

    if (!response.ok) {
      let detail = "";
      try {
        const payload = await response.json();
        detail = payload?.message || payload?.details || "";
      } catch (_) {}
      throw new Error(detail || `HTTP ${response.status}`);
    }

    const createdId = await response.json().catch(() => null);
    console.info("[PIBR] Pedido sincronizado com o painel.", createdId || "");
    document.dispatchEvent(new CustomEvent("pibr:prayer-synced", { detail: { id: createdId } }));
  }

  function init() {
    const form = document.querySelector("#prayer-form");
    if (!form || form.dataset.pibrSupabaseDual === "true") return;

    form.dataset.pibrSupabaseDual = "true";

    // Captura o mesmo submit do formulário atual. Não bloqueia o Google Forms:
    // a planilha continua recebendo como backup, e o Supabase recebe em paralelo.
    form.addEventListener("submit", () => {
      if (!isFormValid(form)) return;
      if (form.dataset.pibrSyncing === "true") return;

      form.dataset.pibrSyncing = "true";

      // Captura os valores no mesmo instante do submit, antes do script antigo resetar o form.
      sendToSupabase(form)
        .catch((error) => {
          console.error("[PIBR] Google Forms recebeu, mas houve falha ao sincronizar com o painel:", error);
          document.dispatchEvent(new CustomEvent("pibr:prayer-sync-error", { detail: { message: error?.message || "Falha de sincronização" } }));
        })
        .finally(() => {
          window.setTimeout(() => {
            form.dataset.pibrSyncing = "false";
          }, 1200);
        });
    }, true);

    console.info("[PIBR] Integração Pedido de Oração → Supabase ativa (V3.2.1). Google Forms mantido como backup.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
