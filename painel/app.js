(() => {
  "use strict";

  const config = window.PIBR_CONFIG || {};
  const hasSupabaseConfig = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const supabaseClient = hasSupabaseConfig
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = "") => String(value).replace(/[&<>'"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[ch]));
  const normalize = value => String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const initials = name => String(name || "PIBR").trim().split(/\s+/).slice(0, 2).map(v => v[0]).join("").toUpperCase();
  const todayIso = () => new Date().toISOString().slice(0, 10);

  const state = {
    currentView: "dashboard",
    currentModule: null,
    editingId: null,
    authMode: "login",
    user: null,
    profile: { name: "Administrador", role: null },
    roles: [],
    data: {
      events: [], cells: [], ministries: [], leaders: [], visitors: [], prayers: [], cell_interests: [], media: [],
      program: [], content: [], site_settings: [], profiles: [], invites: []
    },
    search: {}
  };

  const labels = {
    admin: "Administrador", leader: "Líder", media: "Mídia", pending: "Sem liberação", invited: "Aguardando cadastro", site: "Site", panel: "Painel",
    draft: "Rascunho", published: "Publicado", archived: "Arquivado",
    new: "Novo", contacted: "Contatado", referred: "Encaminhado", integrated: "Integrado",
    praying: "Em oração", answered: "Respondido",
    true: "Sim", false: "Não"
  };

  const weekdays = [
    ["0", "Domingo"], ["1", "Segunda-feira"], ["2", "Terça-feira"],
    ["3", "Quarta-feira"], ["4", "Quinta-feira"], ["5", "Sexta-feira"], ["6", "Sábado"]
  ];

  const siteSettingFields = [
    { key: "site_name", label: "Nome curto", placeholder: "PIBR Morumbi", section: "Identidade", public: true },
    { key: "church_full_name", label: "Nome completo da igreja", placeholder: "Igreja Batista Renovada Morumbi", section: "Identidade", public: true },
    { key: "whatsapp", label: "WhatsApp", placeholder: "(44) 99999-9999", section: "Contato", public: true },
    { key: "instagram", label: "Instagram", placeholder: "@perfil ou URL", section: "Contato", public: true },
    { key: "youtube", label: "YouTube", placeholder: "URL do canal", section: "Contato", public: true },
    { key: "address", label: "Endereço", placeholder: "Rua, número e bairro", section: "Localização", public: true },
    { key: "city", label: "Cidade", placeholder: "Paranavaí", section: "Localização", public: true },
    { key: "state", label: "UF", placeholder: "PR", section: "Localização", public: true },
    { key: "hero_title", label: "Título principal do site", placeholder: "Uma igreja para sua família.", section: "Página inicial", public: true },
    { key: "hero_subtitle", label: "Texto de apoio", placeholder: "Uma comunidade para viver a fé em família.", section: "Página inicial", public: true }
  ];

  const moduleDefs = {
    events: {
      title: "Eventos", subtitle: "Agenda, inscrições e publicações da PIBR Morumbi", singular: "evento",
      table: "pibr_events", icon: "calendar-days", order: ["starts_at", true],
      columns: [
        { key: "title", label: "Evento", type: "primary" },
        { key: "starts_at", label: "Data", type: "datetime" },
        { key: "location", label: "Local" },
        { key: "status", label: "Status", type: "status" }
      ],
      fields: [
        { key: "title", label: "Nome do evento", type: "text", required: true, full: true },
        { key: "starts_at", label: "Início", type: "datetime-local", required: true },
        { key: "ends_at", label: "Término", type: "datetime-local" },
        { key: "location", label: "Local", type: "text", full: true },
        { key: "status", label: "Status", type: "select", default: "draft", options: [["draft","Rascunho"],["published","Publicado"],["archived","Arquivado"]] },
        { key: "registration_url", label: "Link de inscrição", type: "url", full: true },
        { key: "image_url", label: "URL da imagem", type: "url", full: true },
        { key: "description", label: "Descrição", type: "textarea", full: true }
      ]
    },
    cells: {
      title: "Células", subtitle: "Líderes, dias, horários e locais", singular: "célula",
      table: "pibr_cells", icon: "house-heart", order: ["created_at", false],
      columns: [
        { key: "name", label: "Célula", type: "primary" },
        { key: "leader_id", label: "Líder", type: "relation", relation: "leaders", relationLabel: "full_name" },
        { key: "weekday", label: "Dia", type: "weekday" },
        { key: "meeting_time", label: "Horário", type: "time" },
        { key: "is_active", label: "Ativa", type: "boolean" }
      ],
      fields: [
        { key: "name", label: "Nome da célula", type: "text", required: true, full: true },
        { key: "leader_id", label: "Líder", type: "select", optionsFrom: "leaders", optionLabel: "full_name" },
        { key: "weekday", label: "Dia", type: "select", options: weekdays },
        { key: "meeting_time", label: "Horário", type: "time" },
        { key: "contact_phone", label: "Contato", type: "tel" },
        { key: "neighborhood", label: "Bairro", type: "text" },
        { key: "address", label: "Endereço", type: "text", full: true },
        { key: "city", label: "Cidade", type: "text", default: "Paranavaí" },
        { key: "state", label: "UF", type: "text", default: "PR" },
        { key: "description", label: "Descrição", type: "textarea", full: true },
        { key: "is_published", label: "Exibir no site", type: "checkbox", default: true },
        { key: "is_active", label: "Célula ativa", type: "checkbox", default: true }
      ]
    },
    ministries: {
      title: "Ministérios", subtitle: "Áreas de serviço e líderes responsáveis", singular: "ministério",
      table: "pibr_ministries", icon: "badge-plus", order: ["name", true],
      columns: [
        { key: "name", label: "Ministério", type: "primary" },
        { key: "leader_id", label: "Líder", type: "relation", relation: "leaders", relationLabel: "full_name" },
        { key: "contact_phone", label: "Contato" },
        { key: "is_active", label: "Ativo", type: "boolean" }
      ],
      fields: [
        { key: "name", label: "Nome do ministério", type: "text", required: true, full: true },
        { key: "leader_id", label: "Líder", type: "select", optionsFrom: "leaders", optionLabel: "full_name" },
        { key: "contact_phone", label: "Contato", type: "tel" },
        { key: "image_url", label: "URL da imagem", type: "url", full: true },
        { key: "description", label: "Descrição", type: "textarea", full: true },
        { key: "is_published", label: "Exibir no site", type: "checkbox", default: true },
        { key: "is_active", label: "Ministério ativo", type: "checkbox", default: true }
      ]
    },
    leaders: {
      title: "Líderes", subtitle: "Cadastros e responsáveis da PIBR Morumbi", singular: "líder",
      table: "pibr_leaders", icon: "contact-round", order: ["full_name", true],
      columns: [
        { key: "full_name", label: "Líder", type: "person" },
        { key: "title", label: "Função" },
        { key: "phone", label: "Telefone" },
        { key: "is_active", label: "Ativo", type: "boolean" }
      ],
      fields: [
        { key: "full_name", label: "Nome completo", type: "text", required: true, full: true },
        { key: "title", label: "Função / título", type: "text" },
        { key: "phone", label: "Telefone", type: "tel" },
        { key: "email", label: "E-mail", type: "email" },
        { key: "photo_url", label: "URL da foto", type: "url", full: true },
        { key: "bio", label: "Apresentação", type: "textarea", full: true },
        { key: "is_public", label: "Exibir no site", type: "checkbox", default: true },
        { key: "is_active", label: "Líder ativo", type: "checkbox", default: true }
      ]
    },
    visitors: {
      title: "Visitantes", subtitle: "Primeiro contato e acompanhamento", singular: "visitante",
      table: "pibr_visitors", icon: "user-round-plus", order: ["first_visit_date", false],
      columns: [
        { key: "full_name", label: "Visitante", type: "person" },
        { key: "phone", label: "Telefone" },
        { key: "first_visit_date", label: "Primeira visita", type: "date" },
        { key: "status", label: "Status", type: "status" },
        { key: "assigned_leader_id", label: "Responsável", type: "relation", relation: "leaders", relationLabel: "full_name" }
      ],
      fields: [
        { key: "full_name", label: "Nome completo", type: "text", required: true, full: true },
        { key: "phone", label: "Telefone", type: "tel" },
        { key: "email", label: "E-mail", type: "email" },
        { key: "first_visit_date", label: "Primeira visita", type: "date", default: todayIso() },
        { key: "status", label: "Status", type: "select", default: "new", options: [["new","Novo"],["contacted","Contatado"],["integrated","Integrado"],["archived","Arquivado"]] },
        { key: "assigned_leader_id", label: "Líder responsável", type: "select", optionsFrom: "leaders", optionLabel: "full_name" },
        { key: "notes", label: "Observações", type: "textarea", full: true }
      ]
    },
    prayers: {
      title: "Pedidos de oração", subtitle: "Pedidos recebidos do site e acompanhamento pastoral", singular: "pedido de oração",
      table: "pibr_prayer_requests", icon: "hand-heart", order: ["created_at", false],
      columns: [
        { key: "requester_name", label: "Pessoa", type: "person" },
        { key: "message", label: "Pedido", type: "truncate" },
        { key: "category", label: "Área" },
        { key: "source", label: "Origem", type: "status" },
        { key: "wants_contact", label: "Contato", type: "boolean" },
        { key: "created_at", label: "Recebido", type: "datetime" },
        { key: "status", label: "Status", type: "status" }
      ],
      fields: [
        { key: "requester_name", label: "Nome", type: "text", full: true },
        { key: "requester_phone", label: "WhatsApp", type: "tel" },
        { key: "requester_email", label: "E-mail", type: "email" },
        { key: "message", label: "Pedido", type: "textarea", required: true, full: true },
        { key: "category", label: "Área do pedido", type: "text" },
        { key: "age", label: "Idade", type: "number", min: 1, max: 120, nullable: true },
        { key: "location_text", label: "Bairro e cidade", type: "text", full: true },
        { key: "church_info", label: "É cristão? Qual igreja frequenta?", type: "textarea", full: true },
        { key: "wants_contact", label: "Solicitou contato da equipe", type: "checkbox", default: false },
        { key: "cell_info", label: "Informação sobre célula", type: "text", full: true },
        { key: "status", label: "Status", type: "select", default: "new", options: [["new","Novo"],["praying","Em oração"],["answered","Respondido"],["archived","Arquivado"]] },
        { key: "assigned_leader_id", label: "Líder responsável", type: "select", optionsFrom: "leaders", optionLabel: "full_name" },
        { key: "is_private", label: "Pedido privado", type: "checkbox", default: true },
        { key: "admin_notes", label: "Observações internas", type: "textarea", full: true }
      ]
    },

    cell_interests: {
      title: "Interessados em Célula", subtitle: "Pessoas que preencheram o formulário para participar de uma célula", singular: "interessado",
      table: "pibr_cell_interests", icon: "users-round", order: ["created_at", false],
      columns: [
        { key: "full_name", label: "Pessoa", type: "person" },
        { key: "phone", label: "WhatsApp" },
        { key: "location_text", label: "Bairro / endereço" },
        { key: "assigned_cell_id", label: "Célula", type: "relation", relation: "cells", relationLabel: "name" },
        { key: "assigned_leader_id", label: "Responsável", type: "relation", relation: "leaders", relationLabel: "full_name" },
        { key: "status", label: "Status", type: "status" },
        { key: "created_at", label: "Recebido", type: "datetime" }
      ],
      fields: [
        { key: "full_name", label: "Nome", type: "text", required: true, full: true },
        { key: "phone", label: "WhatsApp", type: "tel", required: true },
        { key: "email", label: "E-mail", type: "email" },
        { key: "location_text", label: "Bairro / endereço", type: "text", full: true },
        { key: "status", label: "Status", type: "select", default: "new", options: [["new","Novo"],["contacted","Contatado"],["referred","Encaminhado"],["integrated","Integrado"],["archived","Arquivado"]] },
        { key: "assigned_cell_id", label: "Célula indicada", type: "select", optionsFrom: "cells", optionLabel: "name" },
        { key: "assigned_leader_id", label: "Líder responsável", type: "select", optionsFrom: "leaders", optionLabel: "full_name" },
        { key: "notes", label: "Observações", type: "textarea", full: true }
      ]
    },
    media: {
      title: "Mídia / Galeria", subtitle: "Fotos publicadas pela equipe de mídia no site", singular: "foto",
      table: "pibr_media_items", icon: "images", order: ["created_at", false], special: true,
      columns: [
        { key: "public_url", label: "Foto", type: "image" },
        { key: "event_name", label: "Culto / evento", type: "primary" },
        { key: "title", label: "Título" },
        { key: "status", label: "Status", type: "status" },
        { key: "is_cover", label: "Capa", type: "boolean" },
        { key: "created_at", label: "Enviada", type: "datetime" }
      ],
      fields: [
        { key: "title", label: "Título", type: "text", full: true },
        { key: "event_name", label: "Culto / evento", type: "text", full: true, placeholder: "Ex.: Culto de Celebração — 17/08/2026" },
        { key: "caption", label: "Legenda", type: "textarea", full: true },
        { key: "alt_text", label: "Texto alternativo", type: "text", full: true },
        { key: "status", label: "Status", type: "select", default: "draft", options: [["draft","Rascunho"],["published","Publicado"],["archived","Arquivado"]] },
        { key: "is_cover", label: "Usar como capa", type: "checkbox", default: false },
        { key: "sort_order", label: "Ordem", type: "number", default: 0, min: 0 }
      ]
    },
    program: {
      title: "Programação", subtitle: "Programação recorrente exibida no site", singular: "programação",
      table: "pibr_program_schedule", icon: "calendar-clock", order: ["sort_order", true],
      columns: [
        { key: "title", label: "Programação", type: "primary" },
        { key: "weekday", label: "Dia", type: "weekday" },
        { key: "meeting_time", label: "Horário", type: "time" },
        { key: "recurrence_note", label: "Recorrência" },
        { key: "is_published", label: "Publicada", type: "boolean" }
      ],
      fields: [
        { key: "title", label: "Título", type: "text", required: true, full: true },
        { key: "weekday", label: "Dia", type: "select", options: weekdays },
        { key: "meeting_time", label: "Horário", type: "time" },
        { key: "recurrence_note", label: "Recorrência", type: "text", full: true, placeholder: "Ex.: Toda terça-feira" },
        { key: "location", label: "Local", type: "text", full: true },
        { key: "sort_order", label: "Ordem", type: "number", default: 0, min: 0 },
        { key: "description", label: "Descrição", type: "textarea", full: true },
        { key: "is_published", label: "Exibir no site", type: "checkbox", default: true }
      ]
    },
    content: {
      title: "Conteúdo do site", subtitle: "Blocos de conteúdo administráveis do site público", singular: "conteúdo",
      table: "pibr_site_content", icon: "panels-top-left", order: ["key", true],
      columns: [
        { key: "key", label: "Chave", type: "primary" },
        { key: "title", label: "Título" },
        { key: "is_published", label: "Publicado", type: "boolean" },
        { key: "updated_at", label: "Atualizado", type: "datetime" }
      ],
      fields: [
        { key: "key", label: "Chave do conteúdo", type: "text", required: true, full: true, placeholder: "Ex.: hero, sobre, chamada_evento" },
        { key: "title", label: "Título interno", type: "text", full: true },
        { key: "content", label: "Conteúdo (JSON)", type: "json", required: true, full: true },
        { key: "is_published", label: "Publicado", type: "checkbox", default: false }
      ]
    },
    site_settings: {
      title: "Configurações do site", subtitle: "Dados gerais usados pelo site público", singular: "configuração",
      table: "pibr_site_settings", icon: "settings-2", order: ["key", true], special: true, noAdd: true, noDelete: true,
      columns: [
        { key: "key", label: "Chave", type: "primary" },
        { key: "value", label: "Valor", type: "jsonPreview" },
        { key: "is_public", label: "Público", type: "boolean" },
        { key: "updated_at", label: "Atualizado", type: "datetime" }
      ],
      fields: [
        { key: "key", label: "Chave", type: "text", required: true, full: true },
        { key: "value", label: "Valor (JSON)", type: "json", required: true, full: true },
        { key: "description", label: "Descrição", type: "textarea", full: true },
        { key: "is_public", label: "Disponível para o site público", type: "checkbox", default: false }
      ]
    },
    profiles: {
      title: "Usuários e permissões", subtitle: "Controle de acesso ao painel PIBR", singular: "usuário",
      icon: "shield-check", special: true, noAdd: true, noDelete: true,
      columns: [
        { key: "full_name", label: "Usuário", type: "person" },
        { key: "email", label: "E-mail" },
        { key: "role", label: "Perfil", type: "role" },
        { key: "created_at", label: "Criado", type: "datetime" }
      ],
      fields: [
        { key: "full_name", label: "Nome", type: "text", readonly: true, full: true },
        { key: "email", label: "E-mail", type: "email", readonly: true, full: true },
        { key: "role", label: "Permissão PIBR", type: "select", required: true, options: [["leader","Líder"],["media","Mídia"],["admin","Administrador"]] }
      ]
    }
  };

  const rolePermissions = {
    admin: { view: "*", write: "*" },
    leader: {
      view: ["dashboard","events","cells","ministries","leaders","visitors","prayers","cell_interests","program"],
      write: ["cells","ministries","visitors","prayers","cell_interests"]
    },
    media: {
      view: ["dashboard","media"],
      write: ["media"]
    }
  };

  function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }

  function toast(message, type = "") {
    const root = $("#toast-root");
    const el = document.createElement("div");
    el.className = `toast ${type}`.trim();
    el.innerHTML = `<span data-lucide="${type === "error" ? "circle-alert" : type === "success" ? "circle-check" : "info"}"></span><span>${esc(message)}</span>`;
    root.appendChild(el); refreshIcons(); setTimeout(() => el.remove(), 3800);
  }

  function roleLabel(role) { return labels[role] || role || "Sem permissão"; }
  function currentRole() {
    if (state.roles.includes("admin")) return "admin";
    if (state.roles.includes("media")) return "media";
    if (state.roles.includes("leader")) return "leader";
    return null;
  }
  function can(module, action = "view") {
    const role = currentRole();
    const rule = role ? rolePermissions[role] : null;
    if (!rule) return false;
    const source = action === "view" ? rule.view : rule.write;
    return source === "*" || (Array.isArray(source) && source.includes(module));
  }

  function formatDate(value, withTime = false) {
    if (!value) return "—";
    const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("pt-BR", withTime ? { dateStyle: "short", timeStyle: "short" } : { day:"2-digit", month:"2-digit", year:"numeric" }).format(date);
  }
  function formatTime(value) { return value ? String(value).slice(0, 5) : "—"; }
  function formatWeekday(value) { return weekdays.find(([v]) => String(v) === String(value))?.[1] || "—"; }
  function inputDateTime(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function relationLabel(module, id, labelKey = "name") {
    if (!id) return "—";
    const item = (state.data[module] || []).find(row => String(row.id) === String(id));
    return item?.[labelKey] || "—";
  }
  function optionsFor(field) {
    if (field.optionsFrom) return (state.data[field.optionsFrom] || []).map(item => [String(item.id), item[field.optionLabel || "name"] || "Sem nome"]);
    return field.options || [];
  }

  async function ensureFirstAdminOrLoadRoles() {
    const { data: rolesData, error: rolesError } = await supabaseClient.from("pibr_user_roles").select("role").eq("user_id", state.user.id);
    if (rolesError) throw rolesError;
    let roles = (rolesData || []).map(r => r.role);
    if (!roles.length) {
      const { error: claimError } = await supabaseClient.from("pibr_user_roles").insert({ user_id: state.user.id, role: "admin" });
      if (!claimError) {
        roles = ["admin"];
        toast("Primeira conta configurada como Administrador PIBR.", "success");
      }
    }
    state.roles = roles;
  }

  async function loadIdentity() {
    await ensureFirstAdminOrLoadRoles();
    const { data: profile } = await supabaseClient.from("profiles").select("id,full_name,avatar_url").eq("id", state.user.id).maybeSingle();
    state.profile = {
      name: profile?.full_name || state.user.user_metadata?.full_name || state.user.email?.split("@")[0] || "Usuário",
      role: currentRole(),
      email: state.user.email
    };
  }

  function updateAuthMode() {
    const signup = state.authMode === "signup";
    $("#auth-title").textContent = signup ? "Criar acesso autorizado" : "Entrar no painel";
    $("#name-field").classList.toggle("hidden", !signup);
    $("#signup-name").required = signup;
    $("#login-password").autocomplete = signup ? "new-password" : "current-password";
    $("#auth-submit").innerHTML = signup ? `<span data-lucide="user-plus"></span> Criar conta` : `<span data-lucide="log-in"></span> Entrar`;
    $("#toggle-auth-mode").innerHTML = signup ? `<span data-lucide="log-in"></span> Já tenho conta` : `<span data-lucide="user-plus"></span> Criar conta`;
    $("#auth-help").textContent = signup
      ? "Somente e-mails previamente liberados pelo Administrador podem criar acesso ao painel."
      : "Acesso restrito às contas autorizadas da Batista Renovada Morumbi.";
    refreshIcons();
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!hasSupabaseConfig) return toast("Supabase não configurado.", "error");
    const email = $("#login-email").value.trim();
    const password = $("#login-password").value;
    const name = $("#signup-name").value.trim();
    const button = $("#auth-submit");
    button.disabled = true;
    try {
      if (state.authMode === "signup") {
        const normalizedEmail = email.toLowerCase();
        const { data: allowed, error: inviteError } = await supabaseClient.rpc("pibr_check_signup_invite", { p_email: normalizedEmail });
        if (inviteError) throw inviteError;
        if (!allowed) throw new Error("Este e-mail ainda não foi liberado pelo administrador.");

        const { data, error } = await supabaseClient.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: name, pibr_panel: true } }
        });
        if (error) throw error;
        if (data.session) {
          state.user = data.user;
          await enterApp();
        } else {
          toast("Conta criada com a permissão definida pelo Administrador. Confirme o e-mail e depois faça login.", "success");
          state.authMode = "login"; updateAuthMode();
        }
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        state.user = data.user;
        await enterApp();
      }
    } catch (error) {
      console.error(error);
      toast(error?.message || "Não foi possível autenticar.", "error");
    } finally {
      button.disabled = false; updateAuthMode();
    }
  }

  async function initAuth() {
    $("#login-mode-copy").textContent = hasSupabaseConfig ? "Conectado ao Supabase. Entre com sua conta PIBR." : "Supabase não configurado.";
    if (!hasSupabaseConfig) return;
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) { state.user = data.session.user; await enterApp(); }
    supabaseClient.auth.onAuthStateChange((_event, session) => { state.user = session?.user || null; });
  }

  async function loadModule(module) {
    const def = moduleDefs[module];
    if (module === "profiles") {
      if (!state.roles.includes("admin")) { state.data.profiles = []; return []; }
      const [{ data: profiles, error: profileError }, { data: roles, error: roleError }, { data: invites, error: inviteError }] = await Promise.all([
        supabaseClient.from("profiles").select("id,full_name,email,created_at"),
        supabaseClient.from("pibr_user_roles").select("user_id,role"),
        supabaseClient.from("pibr_signup_invites").select("id,email,full_name,role,status,created_at").order("created_at", { ascending: false })
      ]);
      if (profileError) throw profileError;
      if (roleError) throw roleError;
      if (inviteError) throw inviteError;
      state.data.invites = invites || [];
      const rolesByUser = new Map();
      (roles || []).forEach(row => {
        const list = rolesByUser.get(row.user_id) || [];
        list.push(row.role);
        rolesByUser.set(row.user_id, list);
      });
      const pibrUserIds = new Set((roles || []).map(row => String(row.user_id)));
      state.data.profiles = (profiles || []).filter(row => pibrUserIds.has(String(row.id))).map(row => {
        const userRoles = rolesByUser.get(row.id) || [];
        return { ...row, role: userRoles.includes("admin") ? "admin" : userRoles.includes("media") ? "media" : userRoles.includes("leader") ? "leader" : "pending" };
      });
      if (state.user && !state.data.profiles.some(row => String(row.id) === String(state.user.id))) {
        state.data.profiles.unshift({
          id: state.user.id,
          full_name: state.profile.name || state.user.user_metadata?.full_name || "Usuário",
          email: state.user.email || "",
          created_at: state.user.created_at || null,
          role: currentRole() || "pending"
        });
      }
      return state.data.profiles;
    }
    let query = supabaseClient.from(def.table).select("*");
    if (def.order) query = query.order(def.order[0], { ascending: def.order[1] });
    const { data, error } = await query;
    if (error) throw error;
    state.data[module] = data || [];
    return state.data[module];
  }

  async function loadAllData() {
    const modules = ["leaders","cells","ministries","events","visitors","prayers","cell_interests","media","program","content","site_settings"];
    for (const module of modules) {
      try { await loadModule(module); }
      catch (error) { console.error(module, error); }
    }
    if (state.roles.includes("admin")) {
      try { await loadModule("profiles"); } catch (error) { console.error("profiles", error); }
    }
  }

  function sanitizeRecord(module, record, editing = false) {
    const out = { ...record };
    Object.keys(out).forEach(key => { if (out[key] === "") out[key] = null; });
    if (["events","program","visitors","media"].includes(module) && !editing) out.created_by = state.user.id;
    if (["content","site_settings"].includes(module)) out.updated_by = state.user.id;
    return out;
  }

  async function saveRecord(module, record) {
    if (!can(module, "write")) throw new Error("Sem permissão para alterar este módulo.");
    if (module === "profiles") return saveProfileRole(record);
    const def = moduleDefs[module];
    const payload = sanitizeRecord(module, record, Boolean(state.editingId));
    if (state.editingId) {
      const { data, error } = await supabaseClient.from(def.table).update(payload).eq("id", state.editingId).select().single();
      if (error) throw error; return data;
    }
    const { data, error } = await supabaseClient.from(def.table).insert(payload).select().single();
    if (error) throw error; return data;
  }

  async function saveProfileRole(record) {
    const targetUser = state.editingId;
    if (!state.roles.includes("admin")) throw new Error("Somente administradores podem alterar permissões.");
    const desired = record.role;
    if (!["admin", "leader", "media"].includes(desired)) throw new Error("Escolha uma permissão válida.");

    if (String(targetUser) === String(state.user.id) && desired !== "admin") {
      const { data: admins, error: adminReadError } = await supabaseClient
        .from("pibr_user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (adminReadError) throw adminReadError;
      const uniqueAdmins = new Set((admins || []).map(row => row.user_id));
      if (uniqueAdmins.size <= 1) {
        throw new Error("Não é possível remover o último administrador do Painel PIBR.");
      }
    }

    const { data: existing, error: readError } = await supabaseClient
      .from("pibr_user_roles")
      .select("id,role")
      .eq("user_id", targetUser);
    if (readError) throw readError;

    const current = existing || [];
    const desiredExists = current.some(row => row.role === desired);

    // Insere a nova permissão antes de remover a anterior para evitar perder
    // a autorização no meio da própria alteração.
    if (!desiredExists) {
      const { error } = await supabaseClient
        .from("pibr_user_roles")
        .insert({ user_id: targetUser, role: desired, created_by: state.user.id });
      if (error) throw error;
    }

    for (const row of current) {
      if (row.role !== desired) {
        const { error } = await supabaseClient.from("pibr_user_roles").delete().eq("id", row.id);
        if (error) throw error;
      }
    }
  }

  async function createSignupInvite(record) {
    if (!state.roles.includes("admin")) throw new Error("Somente administradores podem liberar novos acessos.");
    const email = String(record.email || "").trim().toLowerCase();
    const fullName = String(record.full_name || "").trim();
    const role = String(record.role || "");
    if (!fullName) throw new Error("Informe o nome da pessoa.");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Informe um e-mail válido.");
    if (!["admin","leader","media"].includes(role)) throw new Error("Escolha um perfil válido.");

    const { data, error } = await supabaseClient.rpc("pibr_authorize_email", {
      p_email: email,
      p_full_name: fullName,
      p_role: role
    });
    if (error) throw error;
    return data;
  }

  async function revokeSignupInvite(id) {
    if (!state.roles.includes("admin")) return toast("Somente administradores podem revogar acessos.", "error");
    const invite = (state.data.invites || []).find(row => String(row.id) === String(id));
    if (!invite || !confirm(`Cancelar a liberação de ${invite.full_name || invite.email}?`)) return;
    setSyncing(true);
    try {
      const { error } = await supabaseClient.from("pibr_signup_invites").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await loadModule("profiles");
      renderProfilesView();
      toast("Liberação cancelada.", "success");
    } catch (error) {
      console.error(error); toast(error?.message || "Não foi possível cancelar a liberação.", "error");
    } finally { setSyncing(false); }
  }

  function openInviteModal() {
    state.currentModule = "invite";
    state.editingId = null;
    $("#modal-eyebrow").textContent = "Novo acesso";
    $("#modal-title").textContent = "Liberar usuário";
    $("#record-form").innerHTML = `
      <label class="field full"><span>Nome</span><input name="full_name" type="text" required placeholder="Nome completo" /></label>
      <label class="field full"><span>E-mail autorizado</span><input name="email" type="email" required placeholder="usuario@email.com" /></label>
      <label class="field full"><span>Perfil no painel</span><select name="role" required><option value="">Selecione</option><option value="leader">Líder</option><option value="media">Mídia</option><option value="admin">Administrador</option></select></label>
      <div class="notice-inline"><span data-lucide="shield-check"></span><span>A pessoa só conseguirá criar a conta usando exatamente este e-mail.</span></div>
      <div class="form-actions"><button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button><button class="btn btn-primary" type="submit"><span data-lucide="user-check"></span>Liberar acesso</button></div>`;
    $("#modal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    $$('[data-close-modal]',$('#record-form')).forEach(el => el.addEventListener("click", closeModal));
    refreshIcons();
  }

  async function saveSiteSettings(values) {
    if (!can("site_settings", "write")) throw new Error("Somente administradores podem alterar as configurações do site.");
    const existingByKey = new Map((state.data.site_settings || []).map(row => [row.key, row]));
    for (const field of siteSettingFields) {
      const value = String(values[field.key] ?? "").trim();
      const existing = existingByKey.get(field.key);
      const payload = {
        key: field.key,
        value,
        description: field.label,
        is_public: field.public !== false,
        updated_by: state.user.id
      };
      if (existing?.id) {
        const { error } = await supabaseClient.from("pibr_site_settings").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else if (value) {
        const { error } = await supabaseClient.from("pibr_site_settings").insert(payload);
        if (error) throw error;
      }
    }
    await loadModule("site_settings");
  }

  async function deleteRecord(module, id) {
    const def = moduleDefs[module];
    if (!can(module, "write") || def.noDelete) throw new Error("Sem permissão para excluir.");
    const { error } = await supabaseClient.from(def.table).delete().eq("id", id);
    if (error) throw error;
  }

  function setModeChip() {
    $("#mode-chip").innerHTML = hasSupabaseConfig
      ? `<span data-lucide="cloud-check"></span><span>Supabase conectado</span>`
      : `<span data-lucide="cloud-off"></span><span>Sem conexão</span>`;
    refreshIcons();
  }

  let syncDepth = 0;
  function setSyncing(active) {
    syncDepth = Math.max(0, syncDepth + (active ? 1 : -1));
    if (syncDepth > 0) {
      $("#mode-chip").innerHTML = `<span class="spin" data-lucide="loader-circle"></span><span>Atualizando...</span>`;
      document.body.classList.add("is-syncing");
      refreshIcons();
    } else {
      document.body.classList.remove("is-syncing");
      setModeChip();
    }
  }

  async function refreshViewData(view) {
    if (!supabaseClient) return;
    if (view === "dashboard") {
      const modules = ["events","cells","ministries","leaders","visitors","prayers","content"];
      await Promise.all(modules.map(module => loadModule(module)));
      return;
    }
    if (view === "settings") return;
    if (view === "profiles") {
      await loadModule("profiles");
      return;
    }
    if (["cells","ministries","visitors","prayers"].includes(view)) {
      await loadModule("leaders");
    }
    await loadModule(view);
  }

  function applyNavigationPermissions() {
    $$(".nav-item[data-view]").forEach(item => {
      const view = item.dataset.view;
      const allowed = can(view, "view");
      item.classList.toggle("hidden", !allowed);
    });
  }

  async function enterApp() {
    try {
      await loadIdentity();
      if (!state.roles.length) {
        await supabaseClient.auth.signOut();
        state.user = null;
        toast("Sua conta existe, mas ainda não recebeu permissão para o Painel PIBR. Peça a um administrador para liberar o acesso.", "error");
        return;
      }
      $("#login-screen").classList.add("hidden");
      $("#app").classList.remove("hidden");
      setModeChip();
      $("#profile-name").textContent = state.profile.name;
      $("#profile-role").textContent = roleLabel(currentRole());
      $(".avatar").textContent = initials(state.profile.name);
      applyNavigationPermissions();
      await loadAllData();
      renderAll();
      await navigate("dashboard");
    } catch (error) {
      console.error(error);
      toast("Não foi possível carregar o painel. Verifique a conta e as permissões.", "error");
    }
  }

  async function logout() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    state.user = null; state.roles = [];
    $("#app").classList.add("hidden");
    $("#login-screen").classList.remove("hidden");
  }

  async function navigate(view) {
    if (!can(view, "view")) return toast("Seu perfil não possui acesso a este módulo.", "error");

    state.currentView = view;
    $$(".nav-item[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === view));
    $$(".view").forEach(el => el.classList.toggle("active", el.id === `view-${view}`));

    if (view === "dashboard") {
      $("#page-title").textContent = "Dashboard";
      $("#page-subtitle").textContent = "Visão geral da PIBR Morumbi";
    } else if (view === "settings") {
      $("#page-title").textContent = "Sistema";
      $("#page-subtitle").textContent = "Conexão e informações do painel";
    } else {
      const def = moduleDefs[view];
      $("#page-title").textContent = def.title;
      $("#page-subtitle").textContent = def.subtitle;
    }

    closeSidebar();
    setSyncing(true);
    try {
      await refreshViewData(view);
      if (view === "dashboard") renderDashboard();
      else if (view === "settings") renderSettings();
      else if (view === "site_settings") renderSiteSettings();
      else if (view === "media") renderMediaView();
      else renderModuleView(view);
    } catch (error) {
      console.error("refresh", view, error);
      toast(error?.message || "Não foi possível atualizar os dados deste módulo.", "error");
    } finally {
      setSyncing(false);
    }
  }

  function metricCard(icon, label, value, foot) {
    return `<div class="metric-card"><div class="metric-top"><div><div class="metric-label">${esc(label)}</div><div class="metric-value">${esc(value)}</div></div><div class="metric-icon"><span data-lucide="${icon}"></span></div></div><div class="metric-foot"><span data-lucide="activity"></span>${esc(foot)}</div></div>`;
  }

  function renderDashboard() {
    const events = state.data.events || [];
    const futureEvents = events.filter(e => new Date(e.starts_at).getTime() >= Date.now()).sort((a,b) => new Date(a.starts_at)-new Date(b.starts_at));
    const prayers = state.data.prayers || [];
    const visitors = state.data.visitors || [];
    const publishedContent = (state.data.content || []).filter(c => c.is_published).length;
    const cellInterests = state.data.cell_interests || [];
    const mediaItems = state.data.media || [];
    const view = $("#view-dashboard");
    view.innerHTML = `
      <div class="metric-grid metric-grid-v2">
        ${metricCard("calendar-days", "Próximos eventos", futureEvents.length, futureEvents[0] ? formatDate(futureEvents[0].starts_at, true) : "Nenhum agendado")}
        ${metricCard("house-heart", "Células", (state.data.cells || []).filter(c => c.is_active).length, "células ativas")}
        ${metricCard("badge-plus", "Ministérios", (state.data.ministries || []).filter(m => m.is_active).length, "ministérios ativos")}
        ${metricCard("contact-round", "Líderes", (state.data.leaders || []).filter(l => l.is_active).length, "líderes ativos")}
        ${metricCard("user-round-plus", "Visitantes", visitors.length, `${visitors.filter(v => v.status === "new").length} novos para acompanhar`)}
        ${metricCard("hand-heart", "Pedidos de oração", prayers.filter(p => ["new","praying"].includes(p.status)).length, "em acompanhamento")}
        ${currentRole() !== "media" ? metricCard("users-round", "Interessados em célula", cellInterests.filter(i => ["new","contacted","referred"].includes(i.status)).length, `${cellInterests.filter(i => i.status === "new").length} novos`) : ""}
        ${["admin","media"].includes(currentRole()) ? metricCard("images", "Fotos publicadas", mediaItems.filter(m => m.status === "published").length, `${mediaItems.filter(m => m.status === "draft").length} em rascunho`) : ""}
      </div>
      <div class="dashboard-grid" style="margin-top:14px">
        <div class="panel">
          <div class="panel-head"><div><h3>Próximos eventos</h3><p>Agenda da igreja</p></div>${can("events","write") ? `<button class="btn btn-primary" data-quick-add="events"><span data-lucide="plus"></span>Novo evento</button>` : ""}</div>
          <div class="panel-body event-list">
            ${futureEvents.length ? futureEvents.slice(0,5).map(e => `<div class="activity-item"><div class="activity-icon"><span data-lucide="calendar"></span></div><div class="activity-copy"><strong>${esc(e.title)}</strong><span>${esc(formatDate(e.starts_at,true))}${e.location ? ` · ${esc(e.location)}` : ""}</span></div><span class="status ${esc(e.status)}">${esc(labels[e.status] || e.status)}</span></div>`).join("") : `<div class="empty-state"><h3>Nenhum evento futuro</h3><p>Cadastre o próximo evento da PIBR Morumbi.</p></div>`}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Atendimento</h3><p>Itens que precisam de atenção</p></div></div>
          <div class="panel-body event-list">
            <div class="activity-item"><div class="activity-icon"><span data-lucide="user-round-plus"></span></div><div class="activity-copy"><strong>${visitors.filter(v => v.status === "new").length} visitantes novos</strong><span>Aguardando primeiro contato</span></div><button class="btn btn-secondary" data-go="visitors">Abrir</button></div>
            <div class="activity-item"><div class="activity-icon"><span data-lucide="hand-heart"></span></div><div class="activity-copy"><strong>${prayers.filter(p => p.status === "new").length} pedidos novos</strong><span>Pedidos ainda não iniciados</span></div><button class="btn btn-secondary" data-go="prayers">Abrir</button></div>
            ${can("cell_interests","view") ? `<div class="activity-item"><div class="activity-icon"><span data-lucide="users-round"></span></div><div class="activity-copy"><strong>${cellInterests.filter(i => i.status === "new").length} interessados em célula</strong><span>Aguardando primeiro contato</span></div><button class="btn btn-secondary" data-go="cell_interests">Abrir</button></div>` : ""}
            ${can("media","view") ? `<div class="activity-item"><div class="activity-icon"><span data-lucide="images"></span></div><div class="activity-copy"><strong>${mediaItems.filter(m => m.status === "draft").length} fotos em rascunho</strong><span>Aguardando publicação</span></div><button class="btn btn-secondary" data-go="media">Abrir</button></div>` : ""}
            <div class="activity-item"><div class="activity-icon"><span data-lucide="panels-top-left"></span></div><div class="activity-copy"><strong>${publishedContent} conteúdos publicados</strong><span>Conteúdo administrável do site</span></div><button class="btn btn-secondary" data-go="content">Abrir</button></div>
          </div>
        </div>
      </div>`;
    $$('[data-go]', view).forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.go)));
    $$('[data-quick-add]', view).forEach(btn => btn.addEventListener("click", () => openModal(btn.dataset.quickAdd)));
    refreshIcons();
  }

  function renderAll() {
    renderDashboard();
    Object.keys(moduleDefs).forEach(key => {
      if (!$(`#view-${key}`)) return;
      if (key === "site_settings") renderSiteSettings();
      else if (key === "media") renderMediaView();
      else renderModuleView(key);
    });
    renderSettings();
  }

  function renderSiteSettings() {
    const view = $("#view-site_settings");
    if (!view) return;
    const rowsByKey = new Map((state.data.site_settings || []).map(row => [row.key, row]));
    const sections = [...new Set(siteSettingFields.map(field => field.section))];

    view.innerHTML = `
      <div class="notice-card">
        <span data-lucide="sparkles"></span>
        <div>
          <strong>Configuração simplificada</strong>
          <p>Edite os dados em campos comuns. O painel salva tudo no Supabase sem exigir chaves ou JSON.</p>
        </div>
      </div>
      <form id="site-settings-form" class="site-settings-editor">
        ${sections.map(section => `
          <div class="settings-card settings-section">
            <div class="settings-section-head">
              <div><h3>${esc(section)}</h3><p>Informações usadas pelo site público.</p></div>
              <span data-lucide="${section === "Contato" ? "messages-square" : section === "Localização" ? "map-pin" : section === "Página inicial" ? "panel-top" : "badge-check"}"></span>
            </div>
            <div class="settings-field-grid">
              ${siteSettingFields.filter(field => field.section === section).map(field => {
                const raw = rowsByKey.get(field.key)?.value;
                const value = raw == null ? "" : (typeof raw === "string" ? raw : JSON.stringify(raw));
                const multiline = field.key === "hero_subtitle" || field.key === "address";
                return `<label class="friendly-field ${multiline ? "full" : ""}">
                  <span>${esc(field.label)}</span>
                  ${multiline
                    ? `<textarea name="${esc(field.key)}" placeholder="${esc(field.placeholder || "")}">${esc(value)}</textarea>`
                    : `<input name="${esc(field.key)}" type="text" value="${esc(value)}" placeholder="${esc(field.placeholder || "")}" />`}
                </label>`;
              }).join("")}
            </div>
          </div>`).join("")}
        <div class="settings-savebar">
          <div><strong>Alterações do site</strong><span>Os dados são salvos no Supabase e ficam prontos para consumo pelo site público.</span></div>
          <button class="btn btn-primary" type="submit"><span data-lucide="save"></span>Salvar configurações</button>
        </div>
      </form>`;

    const form = $("#site-settings-form", view);
    form?.addEventListener("submit", async event => {
      event.preventDefault();
      const button = $("button[type=submit]", form);
      button.disabled = true;
      setSyncing(true);
      try {
        const values = Object.fromEntries(new FormData(form).entries());
        await saveSiteSettings(values);
        renderSiteSettings();
        toast("Configurações do site salvas.", "success");
      } catch (error) {
        console.error(error);
        toast(error?.message || "Não foi possível salvar as configurações.", "error");
      } finally {
        button.disabled = false;
        setSyncing(false);
      }
    });
    refreshIcons();
  }


  async function uploadMediaFiles(form) {
    if (!can("media","write")) throw new Error("Sem permissão para enviar mídia.");
    const input = form.elements.media_files;
    const files = [...(input?.files || [])];
    if (!files.length) throw new Error("Selecione pelo menos uma foto.");
    if (files.length > 30) throw new Error("Envie no máximo 30 fotos por vez.");

    const eventName = form.elements.event_name.value.trim();
    const title = form.elements.title.value.trim();
    const caption = form.elements.caption.value.trim();
    const status = form.elements.status.value || "draft";
    const isCover = form.elements.is_cover.checked;
    const baseOrder = Number(form.elements.sort_order.value || 0);

    const created = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error(`Formato não aceito: ${file.name}`);
      if (file.size > 8 * 1024 * 1024) throw new Error(`A foto ${file.name} ultrapassa 8 MB.`);

      const clean = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"-").toLowerCase();
      const path = `${new Date().toISOString().slice(0,10)}/${state.user.id}/${crypto.randomUUID()}-${clean}`;
      const { error: uploadError } = await supabaseClient.storage.from("pibr-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabaseClient.storage.from("pibr-media").getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      const record = {
        title: title || file.name.replace(/\.[^.]+$/,""),
        event_name: eventName || null,
        alt_text: title || `Foto da PIBR Morumbi${eventName ? ` — ${eventName}` : ""}`,
        caption: caption || null,
        storage_path: path,
        public_url: publicUrl,
        mime_type: file.type,
        file_size: file.size,
        status,
        is_cover: isCover && index === 0,
        sort_order: baseOrder + index,
        created_by: state.user.id
      };
      const { data, error } = await supabaseClient.from("pibr_media_items").insert(record).select().single();
      if (error) {
        await supabaseClient.storage.from("pibr-media").remove([path]).catch(()=>{});
        throw error;
      }
      created.push(data);
    }
    return created;
  }

  function openMediaUploadModal() {
    state.currentModule = "media"; state.editingId = null;
    $("#modal-eyebrow").textContent = "Equipe de mídia";
    $("#modal-title").textContent = "Enviar fotos";
    $("#record-form").innerHTML = `
      <label class="field full"><span>Fotos</span><input name="media_files" type="file" accept="image/jpeg,image/png,image/webp" multiple required><small class="json-hint">JPG, PNG ou WebP. Máximo 8 MB por foto e até 30 fotos por envio.</small></label>
      <label class="field full"><span>Culto / evento</span><input name="event_name" type="text" placeholder="Ex.: Culto de Celebração — 17/08/2026"></label>
      <label class="field full"><span>Título</span><input name="title" type="text" placeholder="Opcional"></label>
      <label class="field full"><span>Legenda</span><textarea name="caption" placeholder="Opcional"></textarea></label>
      <label class="field"><span>Status</span><select name="status"><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label>
      <label class="field"><span>Ordem inicial</span><input name="sort_order" type="number" min="0" value="0"></label>
      <label class="field full checkbox-field"><input name="is_cover" type="checkbox"><span>Primeira foto será a capa</span></label>
      <div class="form-actions"><button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button><button class="btn btn-primary" type="submit"><span data-lucide="upload"></span>Enviar fotos</button></div>`;
    $("#modal").classList.remove("hidden"); document.body.style.overflow = "hidden";
    $$('[data-close-modal]',$("#record-form")).forEach(el=>el.addEventListener("click",closeModal)); refreshIcons();
  }

  function renderMediaView() {
    const view = $("#view-media");
    if (!view) return;
    const query = state.search.media || "";
    const list = (state.data.media || []).filter(item => !query || normalize(Object.values(item).join(" ")).includes(normalize(query)));
    view.innerHTML = `
      <div class="notice-card"><span data-lucide="images"></span><div><strong>Galeria conectada ao site</strong><p>Fotos com status Publicado entram automaticamente na galeria pública. Rascunhos ficam visíveis somente no painel.</p></div></div>
      <div class="page-toolbar">
        <div class="search-box"><span data-lucide="search"></span><input type="search" data-search="media" value="${esc(query)}" placeholder="Buscar em mídia..." /></div>
        <div class="toolbar-actions"><button class="btn btn-secondary" data-export="media"><span data-lucide="download"></span>Exportar CSV</button>${can("media","write") ? `<button class="btn btn-primary" id="media-upload-button"><span data-lucide="upload"></span>Enviar fotos</button>` : ""}</div>
      </div>
      ${list.length ? `<div class="media-grid">${list.map(item => `
        <article class="media-card">
          <div class="media-photo"><img src="${esc(item.public_url)}" alt="${esc(item.alt_text || item.title || "")}" loading="lazy">${item.is_cover ? `<span class="media-cover">Capa</span>` : ""}</div>
          <div class="media-card-body"><div><strong>${esc(item.event_name || item.title || "Foto PIBR")}</strong><small>${esc(formatDate(item.created_at,true))}</small></div><span class="status ${esc(item.status)}">${esc(labels[item.status] || item.status)}</span></div>
          ${item.caption ? `<p>${esc(item.caption)}</p>` : ""}
          <div class="media-card-actions">${can("media","write") ? `<button class="btn btn-secondary" data-media-edit="${esc(item.id)}"><span data-lucide="pencil"></span>Editar</button><button class="btn btn-secondary danger-soft" data-media-delete="${esc(item.id)}"><span data-lucide="trash-2"></span>Excluir</button>` : ""}</div>
        </article>`).join("")}</div>` : `<div class="table-card">${emptyState("media",query)}</div>`}`;

    $(`[data-search="media"]`, view)?.addEventListener("input", e => { state.search.media=e.target.value; renderMediaView(); });
    $("#media-upload-button", view)?.addEventListener("click", openMediaUploadModal);
    $$(`[data-add="media"]`, view).forEach(btn => btn.addEventListener("click", openMediaUploadModal));
    $(`[data-export="media"]`, view)?.addEventListener("click",()=>exportModuleCsv("media"));
    $$("[data-media-edit]",view).forEach(btn=>btn.addEventListener("click",()=>openModal("media",btn.dataset.mediaEdit)));
    $$("[data-media-delete]",view).forEach(btn=>btn.addEventListener("click",()=>handleMediaDelete(btn.dataset.mediaDelete)));
    refreshIcons();
  }

  async function handleMediaDelete(id) {
    const item = state.data.media.find(row => String(row.id) === String(id));
    if (!item || !confirm(`Excluir esta foto${item.title ? ` “${item.title}”` : ""}?`)) return;
    setSyncing(true);
    try {
      const { error } = await supabaseClient.from("pibr_media_items").delete().eq("id",id);
      if (error) throw error;
      if (item.storage_path) await supabaseClient.storage.from("pibr-media").remove([item.storage_path]);
      await loadModule("media"); renderMediaView(); renderDashboard(); toast("Foto excluída.","success");
    } catch(error) { console.error(error); toast(error?.message || "Não foi possível excluir a foto.","error"); }
    finally { setSyncing(false); }
  }

  function renderProfilesView() {
    const view = $("#view-profiles");
    if (!view) return;
    const query = state.search.profiles || "";
    const matches = item => !query || normalize(Object.values(item).join(" ")).includes(normalize(query));
    const users = (state.data.profiles || []).filter(matches);
    const invites = (state.data.invites || []).filter(item => item.status === "pending" && matches(item));

    const userRows = users.length ? `<div class="table-wrap"><table><thead><tr>${moduleDefs.profiles.columns.map(c=>`<th>${esc(c.label)}</th>`).join("")}<th style="text-align:right">Ações</th></tr></thead><tbody>${users.map(item=>renderRow("profiles",item)).join("")}</tbody></table></div><div class="table-footer"><span>${users.length} usuário${users.length===1?"":"s"}</span><span>Contas existentes</span></div>` : emptyState("profiles", query);

    const inviteRows = invites.length ? `<div class="table-wrap"><table><thead><tr><th>Pessoa</th><th>E-mail liberado</th><th>Perfil</th><th>Liberado em</th><th style="text-align:right">Ações</th></tr></thead><tbody>${invites.map(item=>`<tr><td><strong>${esc(item.full_name)}</strong></td><td>${esc(item.email)}</td><td><span class="role-badge role-${esc(item.role)}">${esc(roleLabel(item.role))}</span></td><td>${esc(formatDate(item.created_at,true))}</td><td><div class="row-actions"><button class="delete" title="Cancelar liberação" data-revoke-invite="${esc(item.id)}"><span data-lucide="user-x"></span></button></div></td></tr>`).join("")}</tbody></table></div><div class="table-footer"><span>${invites.length} aguardando cadastro</span><span>Somente estes e-mails podem criar nova conta PIBR</span></div>` : `<div class="empty-state compact"><div class="empty-icon"><span data-lucide="user-check"></span></div><h3>Nenhum convite pendente</h3><p>Use “Liberar usuário” para autorizar um novo e-mail.</p></div>`;

    view.innerHTML = `
      <div class="notice-card"><span data-lucide="shield-check"></span><div><strong>Acesso por liberação prévia</strong><p>Administrador libera nome, e-mail e perfil. Depois a pessoa cria a conta usando exatamente o e-mail autorizado.</p></div></div>
      <div class="page-toolbar"><div class="search-box"><span data-lucide="search"></span><input type="search" data-search="profiles" value="${esc(query)}" placeholder="Buscar usuários ou e-mails..." /></div><div class="toolbar-actions"><button class="btn btn-primary" id="invite-user-button"><span data-lucide="user-plus"></span>Liberar usuário</button></div></div>
      <div class="section-stack"><div><div class="section-title-row"><div><h3>E-mails liberados</h3><p>Aguardando a pessoa criar a conta.</p></div></div><div class="table-card">${inviteRows}</div></div><div><div class="section-title-row"><div><h3>Usuários com acesso</h3><p>Contas já criadas e seus perfis atuais.</p></div></div><div class="table-card">${userRows}</div></div></div>`;

    $("#invite-user-button", view)?.addEventListener("click", openInviteModal);
    $(`[data-search="profiles"]`, view)?.addEventListener("input", e => { state.search.profiles=e.target.value; renderProfilesView(); const next=$(`[data-search="profiles"]`,$("#view-profiles")); if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length);} });
    $$('[data-edit]', view).forEach(btn=>btn.addEventListener('click',()=>openModal('profiles',btn.dataset.edit)));
    $$('[data-revoke-invite]', view).forEach(btn=>btn.addEventListener('click',()=>revokeSignupInvite(btn.dataset.revokeInvite)));
    refreshIcons();
  }

  function renderModuleView(module) {
    if (module === "profiles") return renderProfilesView();
    const def = moduleDefs[module];
    const view = $(`#view-${module}`);
    if (!view) return;
    const query = state.search[module] || "";
    const list = (state.data[module] || []).filter(item => !query || normalize(Object.values(item).join(" ")).includes(normalize(query)));
    const intro = module === "profiles" ? `<div class="notice-card"><span data-lucide="shield-check"></span><div><strong>Permissões exclusivas do Painel PIBR</strong><p>Administrador possui acesso completo. Líder acompanha os módulos pastorais e de célula. Mídia acessa somente Dashboard e Mídia/Galeria.</p></div></div>` : "";
    view.innerHTML = `${intro}
      <div class="page-toolbar">
        <div class="search-box"><span data-lucide="search"></span><input type="search" data-search="${module}" value="${esc(query)}" placeholder="Buscar em ${esc(def.title.toLowerCase())}..." /></div>
        <div class="toolbar-actions">
          <button class="btn btn-secondary" data-export="${module}"><span data-lucide="download"></span>Exportar CSV</button>
          ${!def.noAdd && can(module,"write") ? `<button class="btn btn-primary" data-add="${module}"><span data-lucide="plus"></span>Novo ${esc(def.singular)}</button>` : ""}
        </div>
      </div>
      <div class="table-card">${list.length ? `<div class="table-wrap"><table><thead><tr>${def.columns.map(c => `<th>${esc(c.label)}</th>`).join("")}<th style="text-align:right">Ações</th></tr></thead><tbody>${list.map(item => renderRow(module,item)).join("")}</tbody></table></div><div class="table-footer"><span>${list.length} registro${list.length===1?"":"s"}</span><span>Sincronizado com Supabase</span></div>` : emptyState(module,query)}</div>`;
    const input = $(`[data-search="${module}"]`, view);
    input?.addEventListener("input", e => { state.search[module]=e.target.value; renderModuleView(module); const next=$(`[data-search="${module}"]`,$(`#view-${module}`)); if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length);} });
    $$(`[data-add="${module}"]`,view).forEach(btn => btn.addEventListener("click",()=>openModal(module)));
    $$(`[data-export="${module}"]`,view).forEach(btn => btn.addEventListener("click",()=>exportModuleCsv(module)));
    $$(`[data-edit]`,view).forEach(btn => btn.addEventListener("click",()=>openModal(module,btn.dataset.edit)));
    $$(`[data-delete]`,view).forEach(btn => btn.addEventListener("click",()=>handleDelete(module,btn.dataset.delete)));
    refreshIcons();
  }

  function renderRow(module,item) {
    const def = moduleDefs[module];
    const editable = can(module,"write");
    const actions = editable ? `<div class="row-actions"><button title="Editar" data-edit="${esc(item.id)}"><span data-lucide="pencil"></span></button>${def.noDelete?"":`<button class="delete" title="Excluir" data-delete="${esc(item.id)}"><span data-lucide="trash-2"></span></button>`}</div>` : `<span class="read-only-note">Somente leitura</span>`;
    return `<tr>${def.columns.map(col=>`<td>${renderCell(col,item)}</td>`).join("")}<td>${actions}</td></tr>`;
  }

  function renderCell(col,item) {
    const value=item[col.key];
    if(col.type==="image") return value ? `<img class="table-thumb" src="${esc(value)}" alt="" loading="lazy">` : "—";
    if(col.type==="person") { const secondary=item.email||item.phone||item.requester_phone||"Sem contato informado"; return `<div class="person-cell"><div class="person-avatar">${esc(initials(value||"?"))}</div><div><strong>${esc(value||"Sem nome")}</strong><small>${esc(secondary)}</small></div></div>`; }
    if(col.type==="primary") return `<strong>${esc(value||"—")}</strong>`;
    if(col.type==="date") return esc(formatDate(value));
    if(col.type==="datetime") return esc(formatDate(value,true));
    if(col.type==="time") return esc(formatTime(value));
    if(col.type==="weekday") return esc(formatWeekday(value));
    if(col.type==="status") return `<span class="status ${esc(value||"")}">${esc(labels[value]||value||"—")}</span>`;
    if(col.type==="boolean") return value ? `<span class="status published">Sim</span>` : `<span class="status archived">Não</span>`;
    if(col.type==="truncate") { const text=String(value||"—"); return `<span title="${esc(text)}">${esc(text.slice(0,64))}${text.length>64?"…":""}</span>`; }
    if(col.type==="relation") return esc(relationLabel(col.relation,value,col.relationLabel||"name"));
    if(col.type==="role") return `<span class="role-badge role-${esc(value||"pending")}">${esc(roleLabel(value))}</span>`;
    if(col.type==="jsonPreview") { const text=typeof value==="string"?value:JSON.stringify(value); return esc(text.length>70?`${text.slice(0,70)}…`:text); }
    return esc(value??"—");
  }

  function emptyState(module,query) {
    const def=moduleDefs[module];
    return `<div class="empty-state"><div class="empty-icon"><span data-lucide="${query?"search-x":def.icon}"></span></div><h3>${query?"Nenhum resultado encontrado":`Nenhum ${esc(def.singular)} cadastrado`}</h3><p>${query?"Tente outro termo de busca.":"A base está limpa para receber somente os dados da PIBR Morumbi."}</p>${query||def.noAdd||!can(module,"write")?"":`<button class="btn btn-primary" data-add="${module}"><span data-lucide="plus"></span>Adicionar</button>`}</div>`;
  }

  function fieldValue(field,value) {
    if(field.type==="datetime-local") return inputDateTime(value);
    if(field.type==="time") return value?String(value).slice(0,5):"";
    if(field.type==="json") return value==null ? "{}" : typeof value==="string" ? value : JSON.stringify(value,null,2);
    return value ?? field.default ?? "";
  }

  function fieldHtml(field,value) {
    const val=fieldValue(field,value);
    const cls=`field ${field.full?"full":""}`.trim();
    if(field.type==="select") return `<label class="${cls}"><span>${esc(field.label)}</span><select name="${esc(field.key)}" ${field.required?"required":""}><option value="">Selecione</option>${optionsFor(field).map(([v,l])=>`<option value="${esc(v)}" ${String(val)===String(v)?"selected":""}>${esc(l)}</option>`).join("")}</select></label>`;
    if(field.type==="textarea"||field.type==="json") return `<label class="${cls}"><span>${esc(field.label)}</span><textarea name="${esc(field.key)}" ${field.required?"required":""} placeholder="${field.type==="json"?'{ "texto": "..." }':esc(field.placeholder||"")}">${esc(val)}</textarea>${field.type==="json"?'<small class="json-hint">Use JSON válido. Ex.: { "titulo": "Bem-vindo" }</small>':""}</label>`;
    if(field.type==="checkbox") return `<label class="${cls} checkbox-field"><input name="${esc(field.key)}" type="checkbox" ${val?"checked":""}/><span>${esc(field.label)}</span></label>`;
    return `<label class="${cls}"><span>${esc(field.label)}</span><input name="${esc(field.key)}" type="${esc(field.type||"text")}" value="${esc(val)}" ${field.required?"required":""} ${field.readonly?"readonly":""} ${field.min!=null?`min="${esc(field.min)}"`:""} ${field.max!=null?`max="${esc(field.max)}"`:""} placeholder="${esc(field.placeholder||"")}"/></label>`;
  }

  function openModal(module,id=null) {
    const def=moduleDefs[module]; state.currentModule=module; state.editingId=id;
    const record=id ? state.data[module].find(item=>String(item.id)===String(id)) : {};
    $("#modal-eyebrow").textContent=id?"Editar cadastro":"Novo cadastro";
    $("#modal-title").textContent=id?`Editar ${def.singular}`:`Novo ${def.singular}`;
    $("#record-form").innerHTML=`${def.fields.map(field=>fieldHtml(field,record?.[field.key])).join("")}<div class="form-actions"><button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button><button class="btn btn-primary" type="submit"><span data-lucide="save"></span>Salvar</button></div>`;
    $("#modal").classList.remove("hidden"); document.body.style.overflow="hidden";
    $$('[data-close-modal]',$("#record-form")).forEach(el=>el.addEventListener("click",closeModal)); refreshIcons();
  }
  function closeModal(){ $("#modal").classList.add("hidden"); document.body.style.overflow=""; state.currentModule=null; state.editingId=null; }

  async function submitRecord(event) {
    event.preventDefault(); const module=state.currentModule; if(!module)return;
    const form=event.currentTarget;
    if (module === "invite") {
      const button=$("button[type=submit]",form); button.disabled=true; setSyncing(true);
      try {
        const result = await createSignupInvite({ full_name: form.elements.full_name.value, email: form.elements.email.value, role: form.elements.role.value });
        await loadModule("profiles"); closeModal(); renderProfilesView();
        toast(result === "authorized_existing" ? "Conta existente liberada para o Painel PIBR." : "E-mail liberado. A pessoa já pode criar a conta.", "success");
      } catch(error) { console.error(error); toast(error?.message || "Não foi possível liberar o acesso.", "error"); }
      finally { button.disabled=false; setSyncing(false); }
      return;
    }
    const def=moduleDefs[module], record={};
    if (module === "media" && !state.editingId && form.elements.media_files) {
      const button=$("button[type=submit]",form); button.disabled=true; setSyncing(true);
      try { const created=await uploadMediaFiles(form); await loadModule("media"); closeModal(); renderMediaView(); renderDashboard(); toast(`${created.length} foto${created.length===1?"":"s"} enviada${created.length===1?"":"s"}.`,"success"); }
      catch(error){ console.error(error); toast(error?.message||"Erro ao enviar fotos.","error"); }
      finally { button.disabled=false; setSyncing(false); }
      return;
    }
    try {
      def.fields.forEach(field=>{
        const input=form.elements[field.key]; if(!input||field.readonly)return;
        if(field.type==="checkbox") record[field.key]=input.checked;
        else if(field.type==="number") record[field.key]=input.value===""?(field.nullable?null:0):Number(input.value);
        else if(field.type==="datetime-local") record[field.key]=input.value?new Date(input.value).toISOString():null;
        else if(field.type==="json") record[field.key]=input.value.trim()?JSON.parse(input.value):{};
        else record[field.key]=input.value.trim();
      });
    } catch (error) { return toast("O campo JSON possui conteúdo inválido.","error"); }
    const button=$("button[type=submit]",form); button.disabled=true;
    const editingId = state.editingId;
    const editedSelf = module === "profiles" && String(editingId) === String(state.user?.id);
    setSyncing(true);
    try {
      await saveRecord(module,record);
      await loadModule(module);
      closeModal();
      if (editedSelf) {
        await loadIdentity();
        $("#profile-role").textContent = roleLabel(currentRole());
        applyNavigationPermissions();
      }
      renderModuleView(module);
      renderDashboard();
      toast("Salvo com sucesso.","success");
      if (editedSelf && !can("profiles","view")) await navigate("dashboard");
    } catch(error){ console.error(error); toast(error?.message||"Erro ao salvar. Verifique as permissões.","error"); }
    finally{ button.disabled=false; setSyncing(false); }
  }

  async function handleDelete(module,id) {
    if (module === "media") return handleMediaDelete(id);
    const def=moduleDefs[module], record=state.data[module].find(i=>String(i.id)===String(id));
    if(!confirm(`Excluir “${record?.title||record?.name||record?.full_name||def.singular}”?`))return;
    setSyncing(true);
    try{ await deleteRecord(module,id); await loadModule(module); renderModuleView(module); renderDashboard(); toast("Registro excluído.","success"); }
    catch(error){ console.error(error); toast(error?.message||"Não foi possível excluir.","error"); }
    finally{ setSyncing(false); }
  }

  function renderSettings() {
    const view=$("#view-settings");
    if(!view)return;
    view.innerHTML=`<div class="settings-grid">
      <div class="settings-card"><h3>Supabase</h3><p>O Painel PIBR Morumbi usa tabelas e permissões próprias no Supabase.</p><div class="info-row"><span>Status</span><strong>Conectado</strong></div><div class="info-row"><span>Versão</span><strong>${esc(config.version)}</strong></div><div class="info-row"><span>Projeto</span><strong>PIBR Morumbi</strong></div></div>
      <div class="settings-card"><h3>Seu acesso</h3><p>Seu perfil de acesso é exclusivo deste painel administrativo.</p><div class="info-row"><span>Usuário</span><strong>${esc(state.profile.name)}</strong></div><div class="info-row"><span>E-mail</span><strong>${esc(state.profile.email||"")}</strong></div><div class="info-row"><span>Perfil PIBR</span><strong>${esc(roleLabel(currentRole()))}</strong></div></div>
      <div class="settings-card"><h3>Escopo atual</h3><p>O painel mantém somente os módulos definidos para a operação da PIBR Morumbi.</p><div class="info-row"><span>Gestão</span><strong>Eventos, células, ministérios e líderes</strong></div><div class="info-row"><span>Pessoas</span><strong>Visitantes, oração e interessados em célula</strong></div><div class="info-row"><span>Site</span><strong>Programação, conteúdo e galeria</strong></div></div>
      <div class="settings-card"><h3>Segurança</h3><p>As regras RLS do Supabase restringem leitura e alteração conforme o papel PIBR do usuário.</p><div class="info-row"><span>Administrador</span><strong>Acesso completo</strong></div><div class="info-row"><span>Líder</span><strong>Acompanhamento e gestão de célula</strong></div><div class="info-row"><span>Mídia</span><strong>Somente Dashboard e Galeria</strong></div><div class="info-row"><span>Sem permissão</span><strong>Conta não acessa o painel</strong></div></div>
    </div>`; refreshIcons();
  }

  function exportModuleCsv(module) {
    const def=moduleDefs[module], rows=state.data[module]||[]; if(!rows.length)return toast("Não há registros para exportar.","error");
    const keys=def.columns.map(c=>c.key), header=def.columns.map(c=>c.label), csv=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const lines=[header.map(csv).join(";")];
    rows.forEach(item=>lines.push(keys.map((key,index)=>{ const col=def.columns[index]; let value=item[key]??""; if(col.type==="relation")value=relationLabel(col.relation,value,col.relationLabel); if(col.type==="date")value=formatDate(value); if(col.type==="datetime")value=formatDate(value,true); if(col.type==="weekday")value=formatWeekday(value); if(col.type==="boolean")value=value?"Sim":"Não"; if(col.type==="status"||col.type==="role")value=labels[value]||value; if(typeof value==="object")value=JSON.stringify(value); return csv(value); }).join(";")));
    const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a"); a.href=url;a.download=`pibr-${module}-${todayIso()}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url); toast("CSV gerado.","success");
  }

  function openSidebar(){ $("#sidebar").classList.add("open"); $("#sidebar-overlay").classList.remove("hidden"); }
  function closeSidebar(){ $("#sidebar").classList.remove("open"); $("#sidebar-overlay").classList.add("hidden"); }

  function bindEvents() {
    $("#login-form").addEventListener("submit",handleAuthSubmit);
    $("#toggle-auth-mode").addEventListener("click",()=>{ state.authMode=state.authMode==="login"?"signup":"login"; updateAuthMode(); });
    $("#nav-menu").addEventListener("click",event=>{ const btn=event.target.closest("[data-view]"); if(btn)navigate(btn.dataset.view); });
    $("#logout-button").addEventListener("click",logout);
    $("#sidebar-open").addEventListener("click",openSidebar); $("#sidebar-close").addEventListener("click",closeSidebar); $("#sidebar-overlay").addEventListener("click",closeSidebar);
    $$('[data-close-modal]',$("#modal")).forEach(el=>el.addEventListener("click",closeModal));
    $("#record-form").addEventListener("submit",submitRecord);
    document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("#modal").classList.contains("hidden"))closeModal(); });
    window.addEventListener("focus",()=>{ if(state.user && !$("#app").classList.contains("hidden")) navigate(state.currentView); });
  }

  async function bootstrap(){ bindEvents(); updateAuthMode(); refreshIcons(); await initAuth(); }
  bootstrap().catch(error=>{ console.error(error); toast("Não foi possível iniciar o painel.","error"); });
})();
