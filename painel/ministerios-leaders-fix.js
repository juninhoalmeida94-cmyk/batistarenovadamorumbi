(() => {
  "use strict";

  const cfg = window.PIBR_CONFIG || {};
  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  if (!configured) return;

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  const state = {
    leaders: [],
    ministries: new Map(),
    ready: false,
    restoring: false
  };

  const esc = (value = "") => String(value).replace(/[&<>'"]/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[ch]));

  function toast(message, type = "") {
    const root = document.querySelector("#toast-root");
    if (!root) return;

    const el = document.createElement("div");
    el.className = `toast ${type}`.trim();
    const icon = type === "error"
      ? "circle-alert"
      : type === "success"
        ? "circle-check"
        : "info";

    el.innerHTML = `<span data-lucide="${icon}"></span><span>${esc(message)}</span>`;
    root.appendChild(el);

    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => el.remove(), 3800);
  }

  function activeMinistryId() {
    return document.querySelector("[data-select-ministry].active")?.dataset.selectMinistry || null;
  }

  function leaderById(id) {
    return state.leaders.find(leader => String(leader.id) === String(id)) || null;
  }

  // Regra importante:
  // - líderes ativos aparecem normalmente;
  // - se o líder atualmente vinculado estiver inativo, ele CONTINUA na lista,
  //   selecionado e identificado como "(inativo)", evitando apagar o vínculo por acidente.
  function selectableLeaders(selectedId = null) {
    return state.leaders.filter(leader =>
      leader.is_active !== false || String(leader.id) === String(selectedId)
    );
  }

  function leaderOptions(selectedId = null) {
    return `<option value="">Nenhum</option>${selectableLeaders(selectedId)
      .map(leader => {
        const selected = String(leader.id) === String(selectedId) ? "selected" : "";
        const status = leader.is_active === false ? " (inativo)" : "";
        const title = leader.title ? ` — ${leader.title}` : "";

        return `<option value="${esc(leader.id)}" ${selected}>${esc(leader.full_name)}${esc(title)}${esc(status)}</option>`;
      })
      .join("")}`;
  }

  async function refreshReferenceData() {
    const [leadersQuery, ministriesQuery] = await Promise.all([
      sb.from("pibr_leaders")
        .select("id,full_name,title,is_active")
        .order("full_name", { ascending: true }),

      sb.from("pibr_ministries")
        .select("id,name,is_published,leader_id,vice_leader_id")
        .order("name", { ascending: true })
    ]);

    if (leadersQuery.error) throw leadersQuery.error;
    if (ministriesQuery.error) throw ministriesQuery.error;

    state.leaders = leadersQuery.data || [];
    state.ministries = new Map(
      (ministriesQuery.data || []).map(ministry => [String(ministry.id), ministry])
    );
    state.ready = true;
  }

  function patchHero() {
    if (!state.ready) return;

    const ministry = state.ministries.get(String(activeMinistryId() || ""));
    const heroText = document.querySelector(".ministry-hero-title p");
    if (!ministry || !heroText) return;

    const leader = leaderById(ministry.leader_id);
    const vice = leaderById(ministry.vice_leader_id);

    const desiredText = leader
      ? `Líder: ${leader.full_name}${vice ? ` · Vice: ${vice.full_name}` : ""}`
      : `Líder administrativo ainda não definido${vice ? ` · Vice: ${vice.full_name}` : ""}`;

    // Evita escrita desnecessária no DOM.
    if (heroText.textContent !== desiredText) {
      heroText.textContent = desiredText;
    }
  }

  function closeModal() {
    document.querySelector("#ministry-modal")?.classList.add("hidden");
  }

  function patchOverviewForm() {
    if (!state.ready) return false;

    const originalForm = document.querySelector("#ministry-overview-form");
    if (!originalForm || originalForm.dataset.leadersFixReady === "1") return false;

    const ministry = state.ministries.get(String(activeMinistryId() || ""));
    if (!ministry) return false;

    // Clona o formulário para remover o submit handler do script antigo.
    // Assim existe somente UM fluxo de salvamento para este formulário.
    const form = originalForm.cloneNode(true);
    originalForm.replaceWith(form);

    const leaderSelect = form.querySelector("#ov-leader");
    const viceSelect = form.querySelector("#ov-vice");
    if (!leaderSelect || !viceSelect) return false;

    leaderSelect.innerHTML = leaderOptions(ministry.leader_id);
    viceSelect.innerHTML = leaderOptions(ministry.vice_leader_id);
    form.dataset.leadersFixReady = "1";

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const button = form.querySelector('button[type="submit"]');
      const originalButtonHtml = button?.innerHTML;

      if (button) {
        button.disabled = true;
        button.textContent = "Salvando...";
      }

      try {
        const weekdayValue = form.querySelector("#ov-weekday")?.value ?? "";

        const payload = {
          leader_id: leaderSelect.value || null,
          vice_leader_id: viceSelect.value || null,

          // Campos antigos deixam de ser fonte de liderança administrativa.
          leader_member_id: null,
          vice_leader_member_id: null,

          started_at: form.querySelector("#ov-started")?.value || null,
          meeting_weekday: weekdayValue === "" ? null : Number(weekdayValue),
          meeting_time: form.querySelector("#ov-time")?.value || null,
          is_active: form.querySelector("#ov-active")?.value === "true",
          internal_notes: form.querySelector("#ov-notes")?.value.trim() || null
        };

        if (!ministry.is_published) {
          payload.name = form.querySelector("#ov-name")?.value.trim() || ministry.name;
        }

        const { error } = await sb
          .from("pibr_ministries")
          .update(payload)
          .eq("id", ministry.id);

        if (error) throw error;

        sessionStorage.setItem("pibr_restore_ministry", String(ministry.id));
        toast("Dados administrativos e lideranças salvos.", "success");

        // Recarrega o estado oficial do módulo sem manter handlers duplicados.
        setTimeout(() => location.reload(), 350);
      } catch (error) {
        console.error(error);
        toast(error.message || "Não foi possível salvar as lideranças.", "error");

        if (button) {
          button.disabled = false;
          button.innerHTML = originalButtonHtml || "Salvar dados administrativos";
          if (window.lucide) window.lucide.createIcons();
        }
      }
    });

    return true;
  }

  function patchNewMinistryForm() {
    if (!state.ready) return false;

    const originalForm = document.querySelector("#new-ministry-form");
    if (!originalForm || originalForm.dataset.leadersFixReady === "1") return false;

    // Mesma estratégia: remove o handler de submit antigo ao substituir pelo clone.
    const form = originalForm.cloneNode(true);
    originalForm.replaceWith(form);

    const leaderSelect = form.querySelector("#new-ministry-leader");
    if (!leaderSelect) return false;

    leaderSelect.innerHTML = leaderOptions(null);
    form.dataset.leadersFixReady = "1";

    form.querySelectorAll("[data-close-ministry-modal]").forEach(button => {
      button.addEventListener("click", closeModal);
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const button = form.querySelector('button[type="submit"]');
      const originalButtonHtml = button?.innerHTML;

      if (button) {
        button.disabled = true;
        button.textContent = "Criando...";
      }

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

        const { data, error } = await sb
          .from("pibr_ministries")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        sessionStorage.setItem("pibr_restore_ministry", String(data.id));
        toast("Ministério interno criado.", "success");
        setTimeout(() => location.reload(), 350);
      } catch (error) {
        console.error(error);
        toast(error.message || "Não foi possível criar o ministério.", "error");

        if (button) {
          button.disabled = false;
          button.innerHTML = originalButtonHtml || "Criar ministério";
        }
      }
    });

    return true;
  }

  function restoreSelectedMinistry() {
    if (state.restoring) return;

    const ministryId = sessionStorage.getItem("pibr_restore_ministry");
    if (!ministryId) return;

    const selector = `[data-select-ministry="${CSS.escape(ministryId)}"]`;
    const button = document.querySelector(selector);
    if (!button) return;

    state.restoring = true;
    sessionStorage.removeItem("pibr_restore_ministry");

    if (!button.classList.contains("active")) {
      button.click();
    }

    state.restoring = false;
  }

  function patchAll() {
    if (!state.ready) return;

    restoreSelectedMinistry();
    patchOverviewForm();
    patchNewMinistryForm();
    patchHero();
  }

  function schedulePatch() {
    // Executa depois dos handlers normais do módulo principal terminarem.
    setTimeout(patchAll, 0);
  }

  function bindNavigationHooks() {
    // Sem observador de mutações do DOM.
    // Só repatcha quando uma ação do usuário realmente recria o conteúdo.
    document.addEventListener("click", event => {
      const target = event.target.closest(
        "[data-select-ministry], .ministry-tab, #new-ministry"
      );

      if (target) schedulePatch();
    });
  }

  function waitForInitialRender() {
    let attempts = 0;
    const maxAttempts = 100;

    const timer = setInterval(() => {
      attempts += 1;
      patchAll();

      const formReady =
        document.querySelector("#ministry-overview-form")?.dataset.leadersFixReady === "1";

      if (formReady || attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, 50);
  }

  async function init() {
    try {
      await refreshReferenceData();
      bindNavigationHooks();
      waitForInitialRender();
    } catch (error) {
      console.error("Falha ao integrar líderes aos ministérios:", error);
      toast("Não foi possível carregar os líderes cadastrados.", "error");
    }
  }

  init();
})();
