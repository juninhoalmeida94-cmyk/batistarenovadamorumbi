(() => {
  "use strict";

  const SUPABASE_URL = "https://trurqjrypocuojhmpuur.supabase.co";
  const SUPABASE_KEY = "sb_publishable_pPf62PLIo5zdicp6eskbJA_Z-vfaDeP";
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  async function read(table, query = "") {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers });
    if (!response.ok) throw new Error(`Falha ao consultar ${table}`);
    return response.json();
  }

  function text(selector, value) {
    if (value == null || value === "") return;
    document.querySelectorAll(selector).forEach(el => { el.textContent = value; });
  }

  function href(selector, value) {
    if (!value) return;
    document.querySelectorAll(selector).forEach(el => { el.href = value; });
  }

  async function syncSettings() {
    const rows = await read("pibr_site_settings", "select=key,value&is_public=eq.true");
    const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
    text("[data-pibr-site-name]", settings.site_name);
    text("[data-pibr-church-name]", settings.church_full_name);
    text("[data-pibr-hero-title]", settings.hero_title);
    text("[data-pibr-hero-subtitle]", settings.hero_subtitle);
    text("[data-pibr-address]", settings.address);
    text("[data-pibr-city]", settings.city);
    text("[data-pibr-state]", settings.state);
    text("[data-pibr-whatsapp-text]", settings.whatsapp);
    href("[data-pibr-instagram-link]", settings.instagram);
    href("[data-pibr-youtube-link]", settings.youtube);
  }

  async function syncProgram() {
    const target = document.querySelector("[data-pibr-program-list]");
    if (!target) return;
    const rows = await read("pibr_program_schedule", "select=*&is_published=eq.true&order=sort_order.asc");
    if (!rows.length) return;
    const weekday = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
    target.innerHTML = rows.map(row => `
      <article class="pibr-program-item">
        <strong>${escapeHtml(row.title || "")}</strong>
        <span>${escapeHtml(weekday[Number(row.weekday)] || "")}${row.meeting_time ? ` · ${escapeHtml(String(row.meeting_time).slice(0,5))}` : ""}</span>
        ${row.location ? `<small>${escapeHtml(row.location)}</small>` : ""}
      </article>`).join("");
  }

  async function syncEvents() {
    const target = document.querySelector("[data-pibr-events-list]");
    if (!target) return;
    const now = new Date().toISOString();
    const rows = await read("pibr_events", `select=*&status=eq.published&starts_at=gte.${encodeURIComponent(now)}&order=starts_at.asc`);
    if (!rows.length) return;
    target.innerHTML = rows.map(row => `
      <article class="pibr-event-item">
        ${row.image_url ? `<img src="${escapeAttr(row.image_url)}" alt="">` : ""}
        <div>
          <strong>${escapeHtml(row.title || "")}</strong>
          <span>${escapeHtml(new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(row.starts_at)))}</span>
          ${row.location ? `<small>${escapeHtml(row.location)}</small>` : ""}
        </div>
      </article>`).join("");
  }

  async function syncContent() {
    const rows = await read("pibr_site_content", "select=key,title,content&is_published=eq.true");
    rows.forEach(row => {
      const target = document.querySelector(`[data-pibr-content="${CSS.escape(row.key)}"]`);
      if (!target) return;
      const content = row.content || {};
      if (typeof content === "string") target.textContent = content;
      else if (content.texto) target.textContent = content.texto;
      else if (content.text) target.textContent = content.text;
      else if (content.html) target.innerHTML = content.html;
    });
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
  }
  function escapeAttr(value = "") {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  async function init() {
    try {
      await Promise.allSettled([syncSettings(), syncProgram(), syncEvents(), syncContent()]);
      document.dispatchEvent(new CustomEvent("pibr:public-sync-complete"));
    } catch (error) {
      console.warn("[PIBR] Sincronização pública indisponível:", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
