(() => {
  "use strict";

  const cfg = window.PIBR_CONFIG || {};
  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  if (!configured) return;

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const state = { ready: false, leaders: [], ministries: new Map() };

  const esc = (value = "") => String(value).replace(/[&<>'"]/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[ch]));

  function toast(message, type = "") {
    const root = document.querySelector("#toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`.trim();
    const icon = type === "error" ? "circle-alert" : type === "success" ? "circle-check" : "info";
    el.innerHTML = `<span data-lucide="${icon}"></span><span>${esc(message)}</span>`;
    root.appendChild(el);
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => el.remove(), 3800);
  }

  function activeMinistryId() {
    return document.querySelector("[data-select-ministry].active")?.dataset.selectMinistry || null;
  }

  function leaderById(id) {
    return state.leaders.find(item => String(item.id) === String(id)) || null;
  }

  function leaderOptions(selectedId) {
    return `<option value="">Nenhum</option>${state.leaders
      .filter(item => item.is_active !== false)
      .map(item => {
        const selected = String(item.id) === String(selectedId) ? "selected" : "";
        const role = item.title ? ` — ${esc(item.title)}` : "";
        return `<option value="${esc(item.id)}" ${selected}>${esc(item.full_name)}${role}</option>`;
      }).join("")}`;
  }

  async function refreshReferenceData() {
    const [leadersQuery, ministriesQuery] = await Promise.all([
      sb.from("pibr_leaders").select("id,full_name,title,is_active").order("full_name", { ascending: true }),
      sb.from("pibr_ministries").select("id,name,is_published,leader_id,vice_leader_id").order("name", { ascending: true })
    ]);
    if (leadersQuery.error) throw leadersQuery.error;
    if (ministriesQuery.error) throw ministriesQuery.error;
    state.leaders = leadersQuery.data || [];
    state.ministries = new Map((ministriesQuery.data || []).map(item => [String(item.id), item]));
    state.ready = true;
  }

  function patchHero() {
    if (!state.ready) return;
    const ministry = state.ministries.get(String(activeMinistryId() || ""));
    const target = document.querySelector(".ministry-hero-title p");
    if (!ministry || !target) return;
    const leader = leaderById(ministry.leader_id);
    const vice = leaderById(ministry.vice_leader_id);
    target.textContent = leader
      ? `Líder: ${leader.full_name}${vice ? ` · Vice: ${vice.full_name}` : ""}`
      : `Líder administrativo ainda não definido${vice ? ` · Vice: ${vice.full_name}` : ""}`;
  }

  function patchOverviewForm() {
    if (!state.ready) return;
    const form = document.querySelector("#ministry-overview-form");
    if (!form || form.dataset.leadersFixReady === "1") return;
    const ministry = state.ministries.get(String(activeMinistryId() || ""));
    if (!ministry) return;
    const leaderSelect = form.querySelector("#ov-leader");
    const viceSelect = form.querySelector("#ov-vice");
    if (!leaderSelect || !viceSelect) return;
    leaderSelect.innerHTML = leaderOptions(ministry.leader_id);
    viceSelect.innerHTML = leaderOptions(ministry.vice_leader_id);
    form.dataset.leadersFixReady = "1";

    form.addEventListener("submit", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const button = form.querySelector('button[type="submit"]');
      const originalButton = button?.innerHTML;
      if (button) { button.disabled = true; button.textContent = "Salvando..."; }
      try {
        const payload = {
          leader_id: leaderSelect.value || null,
          vice_leader_id: viceSelect.value || null,
          leader_member_id: null,
          vice_leader_member_id: null,
          started_at: form.querySelector("#ov-started")?.value || null,
          meeting_weekday: form.querySelector("#ov-weekday")?.value === "" ? null : Number(form.querySelector("#ov-weekday")?.value),
          meeting_time: form.querySelector("#ov-time")?.value || null,
          is_active: form.querySelector("#ov-active")?.value === "true",
          internal_notes: form.querySelector("#ov-notes")?.value.trim() || null
        };
        if (!ministry.is_published) payload.name = form.querySelector("#ov-name")?.value.trim() || ministry.name;
        const { error } = await sb.from("pibr_ministries").update(payload).eq("id", ministry.id);
        if (error) throw error;
        sessionStorage.setItem("pibr_restore_ministry", String(ministry.id));
        toast("Dados administrativos e lideranças salvos.", "success");
        setTimeout(() => location.reload(), 450);
      } catch (error) {
        console.error(error);
        toast(error.message || "Não foi possível salvar as lideranças.", "error");
        if (button) {
          button.disabled = false;
          button.innerHTML = originalButton || "Salvar dados administrativos";
          if (window.lucide) window.lucide.createIcons();
        }
      }
    }, true);
  }

  function patchNewMinistryForm() {
    if (!state.ready) return;
    const form = document.querySelector("#new-ministry-form");
    if (!form || form.dataset.leadersFixReady === "1") return;
    const leaderSelect = form.querySelector("#new-ministry-leader");
    if (!leaderSelect) return;
    leaderSelect.innerHTML = leaderOptions(null);
    form.dataset.leadersFixReady = "1";
    form.addEventListener("submit", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const button = form.querySelector('button[type="submit"]');
      const originalButton = button?.innerHTML;
      if (button) { button.disabled = true; button.textContent = "Criando..."; }
      try {
        const payload = {
          name: form.querySelector("#new-ministry-name")?.value.trim(),
          leader_id: leaderSelect.value || null,
          leader_member_id: null,
          started_at: form.querySelector("#new-ministry-started")?.value || null,
          internal_notes: form.querySelector("#new-ministry-notes")?.value.trim() || null,
          is_published: false,
          is_active: true
        };
        const { data, error } = await sb.from("pibr_ministries").insert(payload).select("id").single();
        if (error) throw error;
        sessionStorage.setItem("pibr_restore_ministry", String(data.id));
        toast("Ministério interno criado.", "success");
        setTimeout(() => location.reload(), 450);
      } catch (error) {
        console.error(error);
        toast(error.message || "Não foi possível criar o ministério.", "error");
        if (button) { button.disabled = false; button.innerHTML = originalButton || "Criar ministério"; }
      }
    }, true);
  }

  function restoreSelectedMinistry() {
    const ministryId = sessionStorage.getItem("pibr_restore_ministry");
    if (!ministryId) return;
    const button = document.querySelector(`[data-select-ministry="${CSS.escape(ministryId)}"]`);
    if (!button) return;
    sessionStorage.removeItem("pibr_restore_ministry");
    if (!button.classList.contains("active")) button.click();
  }

  function patchAll() {
    patchOverviewForm();
    patchNewMinistryForm();
    patchHero();
    restoreSelectedMinistry();
  }

  async function init() {
    try {
      await refreshReferenceData();
      patchAll();
      const observer = new MutationObserver(() => patchAll());
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      console.error("Falha ao integrar líderes aos ministérios:", error);
      toast("Não foi possível carregar os líderes cadastrados.", "error");
    }
  }

  init();
})();
