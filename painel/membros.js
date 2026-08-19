(() => {
  "use strict";

  const cfg = window.PIBR_CONFIG || {};
  const hasConfig = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const sb = hasConfig ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const norm = v => String(v || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const initials = name => String(name || "PIBR").trim().split(/\s+/).slice(0,2).map(v => v[0]).join("").toUpperCase();

  const categoryLabels = {
    new_convert:"Novo convertido", child:"Criança", leader:"Líder", member:"Membro",
    non_communicant:"Membro não comungante", visitor:"Visitante", congregant:"Congregado"
  };
  const statusLabels = { active:"Ativo", inactive:"Inativo", transferred:"Transferido", deceased:"Falecido" };
  const civilLabels = { not_informed:"Não informado", single:"Solteiro(a)", married:"Casado(a)", stable_union:"União estável", divorced:"Divorciado(a)", widowed:"Viúvo(a)" };

  const state = { user:null, members:[], leaders:[], ministries:[], interests:[], editingId:null };

  function icons(){ if(window.lucide) window.lucide.createIcons(); }
  function toast(message, type=""){
    const el=document.createElement("div");
    el.className=`toast ${type}`.trim();
    el.innerHTML=`<span data-lucide="${type==="error"?"circle-alert":type==="success"?"circle-check":"info"}"></span><span>${esc(message)}</span>`;
    $("#toast-root").appendChild(el); icons(); setTimeout(()=>el.remove(),3800);
  }
  function show(el){ el?.classList.remove("hidden"); }
  function hide(el){ el?.classList.add("hidden"); }
  function age(date){
    if(!date) return null;
    const d=new Date(`${date}T12:00:00`), now=new Date();
    let a=now.getFullYear()-d.getFullYear();
    if(now.getMonth()<d.getMonth() || (now.getMonth()===d.getMonth() && now.getDate()<d.getDate())) a--;
    return a;
  }
  function dateBR(value){
    if(!value) return "—";
    const d=new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat("pt-BR").format(d);
  }
  function monthName(){
    return new Intl.DateTimeFormat("pt-BR",{month:"long"}).format(new Date()).replace(/^./,c=>c.toUpperCase());
  }

  async function ensureAdmin(){
    if(!hasConfig) throw new Error("Supabase não configurado.");
    const {data:{session}, error:sessionError}=await sb.auth.getSession();
    if(sessionError) throw sessionError;
    if(!session){ location.href="index.html"; return false; }
    state.user=session.user;

    const {data:roles,error}=await sb.from("pibr_user_roles").select("role").eq("user_id",session.user.id);
    if(error) throw error;
    if(!(roles||[]).some(r=>r.role==="admin")) return false;

    const {data:profile}=await sb.from("profiles").select("full_name").eq("id",session.user.id).maybeSingle();
    const name=profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Administrador";
    $("#members-profile-name").textContent=name;
    $("#members-avatar").textContent=initials(name);
    return true;
  }

  async function loadData(){
    const [
      {data:members,error:membersError},
      {data:leaders,error:leadersError},
      {data:ministries,error:ministriesError},
      {data:interests,error:interestsError}
    ]=await Promise.all([
      sb.from("pibr_members").select("*").order("full_name",{ascending:true}),
      sb.from("pibr_leaders").select("id,full_name,is_active").order("full_name",{ascending:true}),
      sb.from("pibr_ministries").select("id,name,is_active").order("name",{ascending:true}),
      sb.from("pibr_member_ministry_interests").select("*")
    ]);
    if(membersError) throw membersError;
    if(leadersError) throw leadersError;
    if(ministriesError) throw ministriesError;
    if(interestsError) throw interestsError;
    state.members=members||[];
    state.leaders=leaders||[];
    state.ministries=ministries||[];
    state.interests=interests||[];
    populateRelations();
    render();
  }

  function populateRelations(){
    const leader=$("#assigned_leader_id");
    leader.innerHTML='<option value="">Nenhum</option>'+state.leaders.filter(x=>x.is_active!==false).map(x=>`<option value="${esc(x.id)}">${esc(x.full_name)}</option>`).join("");
    const guardian=$("#guardian_member_id");
    guardian.innerHTML='<option value="">Selecione...</option>'+state.members.filter(x=>x.id!==state.editingId).map(x=>`<option value="${esc(x.id)}">${esc(x.full_name)}</option>`).join("");
    $("#ministry-options").innerHTML = state.ministries.filter(x=>x.is_active!==false).map(x=>`
      <label class="ministry-choice">
        <input type="checkbox" name="ministry_interest" value="${esc(x.id)}" />
        <span>${esc(x.name)}</span>
      </label>`).join("") || '<p class="member-empty">Nenhum ministério cadastrado.</p>';
  }

  function renderStats(){
    const now=new Date(), month=now.getMonth(), year=now.getFullYear();
    const active=state.members.filter(m=>m.membership_status==="active").length;
    const visitors=state.members.filter(m=>m.category==="visitor" && m.membership_status==="active").length;
    const leaders=state.members.filter(m=>m.category==="leader" && m.membership_status==="active").length;
    const newThisMonth=state.members.filter(m=>{
      if(!m.created_at) return false; const d=new Date(m.created_at); return d.getMonth()===month && d.getFullYear()===year;
    }).length;
    const birthdays=state.members.filter(m=>m.birth_date && new Date(`${m.birth_date}T12:00:00`).getMonth()===month).length;
    const stats=[
      ["Membros ativos",active,"users","Cadastros ativos"],
      ["Visitantes",visitors,"user-round-plus","Na base administrativa"],
      ["Novos este mês",newThisMonth,"user-plus","Cadastros recentes"],
      ["Aniversariantes",birthdays,"cake",monthName()],
      ["Líderes",leaders,"contact-round","Cadastrados como líder"]
    ];
    $("#member-stats").innerHTML=stats.map(([label,value,icon,small])=>`
      <article class="member-stat">
        <div class="member-stat-head"><span>${esc(label)}</span><span class="member-stat-icon" data-lucide="${icon}"></span></div>
        <strong>${value}</strong><small>${esc(small)}</small>
      </article>`).join("");
  }

  function filteredMembers(){
    const q=norm($("#member-search").value), cat=$("#member-category-filter").value, status=$("#member-status-filter").value;
    return state.members.filter(m=>{
      const hay=norm([m.full_name,m.phone,m.email,m.neighborhood].join(" "));
      return (!q || hay.includes(q)) && (!cat || m.category===cat) && (!status || m.membership_status===status);
    });
  }

  function renderList(){
    const list=filteredMembers();
    const root=$("#member-list");
    if(!list.length){
      root.innerHTML='<div class="member-empty"><span data-lucide="users"></span><h3>Nenhum cadastro encontrado</h3><p>Use “Novo membro” para começar a base administrativa.</p></div>';
      return;
    }
    root.innerHTML=list.map(m=>{
      const a=age(m.birth_date);
      const photo=m.photo_url?`<img src="${esc(m.photo_url)}" alt="" />`:esc(initials(m.full_name));
      const leader=state.leaders.find(l=>String(l.id)===String(m.assigned_leader_id))?.full_name || "—";
      return `<article class="member-row" data-id="${esc(m.id)}">
        <div class="member-person">
          <div class="member-photo">${photo}</div>
          <div class="member-person-copy">
            <strong>${esc(m.full_name)}</strong>
            <small>${esc(m.phone || m.email || "Sem contato")} ${a!==null?`• ${a} anos`:""}</small>
          </div>
        </div>
        <div class="member-meta">${esc(categoryLabels[m.category]||m.category||"—")}</div>
        <div class="member-meta hide-tablet">${esc(m.neighborhood || "—")}</div>
        <div class="member-badge status-badge ${m.membership_status==="active"?"active":""}">${esc(statusLabels[m.membership_status]||m.membership_status)}</div>
        <div class="member-actions">
          <button class="member-action" data-edit-member="${esc(m.id)}" title="Editar"><span data-lucide="pencil"></span></button>
          <button class="member-action danger" data-delete-member="${esc(m.id)}" title="Excluir"><span data-lucide="trash-2"></span></button>
        </div>
      </article>`;
    }).join("");
  }

  function renderBirthdays(){
    const month=new Date().getMonth();
    $("#birthday-month").textContent=monthName();
    const items=state.members.filter(m=>m.birth_date && new Date(`${m.birth_date}T12:00:00`).getMonth()===month)
      .sort((a,b)=>Number(a.birth_date.slice(8,10))-Number(b.birth_date.slice(8,10)));
    $("#birthday-list").innerHTML=items.length?items.map(m=>`
      <div class="birthday-item">
        <div class="birthday-avatar">${esc(initials(m.full_name))}</div>
        <div class="birthday-copy"><strong>${esc(m.full_name)}</strong><small>${age(m.birth_date)!==null?`Faz ${age(m.birth_date)+(new Date().getDate()<=Number(m.birth_date.slice(8,10))?1:0)} anos`:""}</small></div>
        <span class="birthday-day">Dia ${Number(m.birth_date.slice(8,10))}</span>
      </div>`).join(""):'<div class="member-empty">Nenhum aniversário neste mês.</div>';
  }

  function render(){ renderStats(); renderList(); renderBirthdays(); icons(); }

  function openModal(member=null){
    state.editingId=member?.id || null;
    $("#member-modal-title").textContent=member?"Editar membro":"Novo membro";
    $("#member-form").reset();
    $("#member-id").value=member?.id||"";
    $("#city").value=member?.city||"Paranavaí";
    $("#state").value=member?.state||"PR";
    $("#category").value=member?.category||"member";
    $("#civil_status").value=member?.civil_status||"not_informed";
    $("#membership_status").value=member?.membership_status||"active";
    populateRelations();

    if(member){
      const fields=["photo_url","full_name","email","phone","birth_date","joined_at","category","civil_status","role_title","guardian_member_id","guardian_name","guardian_phone","postal_code","street","address_number","complement","neighborhood","city","state","cpf","rg","gender","decision_date","baptism_date","membership_date","membership_status","assigned_leader_id","notes"];
      fields.forEach(k=>{ const el=$("#"+k); if(el) el.value=member[k]??""; });
      $("#is_minor").checked=Boolean(member.is_minor);
      const selected=new Set(state.interests.filter(i=>String(i.member_id)===String(member.id)).map(i=>String(i.ministry_id)));
      $$('input[name="ministry_interest"]').forEach(el=>el.checked=selected.has(String(el.value)));
    }else{
      $("#is_minor").checked=false;
    }
    toggleGuardian();
    show($("#member-modal"));
    icons();
  }

  function closeModal(){ hide($("#member-modal")); state.editingId=null; }

  function toggleGuardian(){ $("#guardian-fields").classList.toggle("hidden",!$("#is_minor").checked); }

  function payloadFromForm(){
    const get=id=>$("#"+id)?.value?.trim()||null;
    return {
      full_name:get("full_name"),
      photo_url:get("photo_url"),
      email:get("email"),
      phone:get("phone"),
      birth_date:get("birth_date"),
      joined_at:get("joined_at"),
      category:get("category")||"member",
      civil_status:get("civil_status")||"not_informed",
      role_title:get("role_title"),
      is_minor:$("#is_minor").checked,
      guardian_member_id:get("guardian_member_id"),
      guardian_name:get("guardian_name"),
      guardian_phone:get("guardian_phone"),
      postal_code:get("postal_code"),
      street:get("street"),
      address_number:get("address_number"),
      complement:get("complement"),
      neighborhood:get("neighborhood"),
      city:get("city")||"Paranavaí",
      state:(get("state")||"PR").toUpperCase(),
      cpf:get("cpf"),
      rg:get("rg"),
      gender:get("gender"),
      decision_date:get("decision_date"),
      baptism_date:get("baptism_date"),
      membership_date:get("membership_date"),
      membership_status:get("membership_status")||"active",
      assigned_leader_id:get("assigned_leader_id"),
      notes:get("notes")
    };
  }

  async function saveMember(e){
    e.preventDefault();
    const button=$("#save-member"); button.disabled=true;
    try{
      const payload=payloadFromForm();
      if(!payload.full_name) throw new Error("Informe o nome completo.");
      let memberId=state.editingId;
      if(memberId){
        const {error}=await sb.from("pibr_members").update(payload).eq("id",memberId);
        if(error) throw error;
      }else{
        const {data,error}=await sb.from("pibr_members").insert(payload).select("id").single();
        if(error) throw error;
        memberId=data.id;
      }
      const selected=$$('input[name="ministry_interest"]:checked').map(el=>el.value);
      const {error:delError}=await sb.from("pibr_member_ministry_interests").delete().eq("member_id",memberId);
      if(delError) throw delError;
      if(selected.length){
        const rows=selected.map(ministry_id=>({member_id:memberId,ministry_id,status:"interested"}));
        const {error:intError}=await sb.from("pibr_member_ministry_interests").insert(rows);
        if(intError) throw intError;
      }
      toast(state.editingId?"Cadastro atualizado.":"Membro cadastrado com sucesso.","success");
      closeModal(); await loadData();
    }catch(err){ console.error(err); toast(err.message||"Não foi possível salvar.","error"); }
    finally{ button.disabled=false; }
  }

  async function deleteMember(id){
    const member=state.members.find(m=>String(m.id)===String(id));
    if(!member || !confirm(`Excluir o cadastro de ${member.full_name}?`)) return;
    try{
      const {error}=await sb.from("pibr_members").delete().eq("id",id);
      if(error) throw error;
      toast("Cadastro excluído.","success"); await loadData();
    }catch(err){ console.error(err); toast(err.message||"Não foi possível excluir.","error"); }
  }

  function bind(){
    $("#new-member").addEventListener("click",()=>openModal());
    $("#member-form").addEventListener("submit",saveMember);
    $("#is_minor").addEventListener("change",toggleGuardian);
    ["member-search","member-category-filter","member-status-filter"].forEach(id=>$("#"+id).addEventListener("input",()=>{renderList();icons();}));
    $$("[data-close-member-modal]").forEach(el=>el.addEventListener("click",closeModal));
    $("#member-list").addEventListener("click",e=>{
      const edit=e.target.closest("[data-edit-member]"), del=e.target.closest("[data-delete-member]");
      if(edit) openModal(state.members.find(m=>String(m.id)===String(edit.dataset.editMember)));
      if(del) deleteMember(del.dataset.deleteMember);
    });
    $("#members-logout").addEventListener("click",async()=>{await sb.auth.signOut(); location.href="index.html";});
    $("#members-sidebar-open").addEventListener("click",()=>{ $("#members-sidebar").classList.add("open"); show($("#members-sidebar-overlay")); });
    $("#members-sidebar-close").addEventListener("click",()=>{ $("#members-sidebar").classList.remove("open"); hide($("#members-sidebar-overlay")); });
    $("#members-sidebar-overlay").addEventListener("click",()=>{ $("#members-sidebar").classList.remove("open"); hide($("#members-sidebar-overlay")); });
  }

  async function init(){
    icons();
    try{
      const admin=await ensureAdmin();
      hide($("#members-loading"));
      if(!admin){ show($("#members-denied")); icons(); return; }
      bind();
      await loadData();
      show($("#members-app"));
      icons();
    }catch(err){
      console.error(err);
      hide($("#members-loading"));
      show($("#members-denied"));
      $("#members-denied p").textContent=err.message||"Não foi possível validar o acesso.";
      icons();
    }
  }

  init();
})();
