(() => {
  "use strict";

  const cfg = window.PIBR_CONFIG || {};
  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const sb = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const norm=v=>String(v||"").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const initials=name=>String(name||"PIBR").trim().split(/\s+/).slice(0,2).map(v=>v[0]).join("").toUpperCase();
  const weekdays=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const dateBR=v=>v?new Intl.DateTimeFormat("pt-BR").format(new Date(`${v}T12:00:00`)):"—";
  const dateTimeBR=v=>v?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(v)):"—";
  const time5=v=>v?String(v).slice(0,5):"—";

  const state={
    user:null, ministries:[], members:[], ministryMembers:[], interests:[], groups:[], groupMembers:[],
    scales:[], media:[], selectedId:null, tab:"overview"
  };

  function icons(){ if(window.lucide) window.lucide.createIcons(); }
  function show(el){el?.classList.remove("hidden")} function hide(el){el?.classList.add("hidden")}
  function toast(message,type=""){
    const el=document.createElement("div"); el.className=`toast ${type}`.trim();
    el.innerHTML=`<span data-lucide="${type==="error"?"circle-alert":type==="success"?"circle-check":"info"}"></span><span>${esc(message)}</span>`;
    $("#toast-root").appendChild(el);icons();setTimeout(()=>el.remove(),3800);
  }
  function selected(){return state.ministries.find(m=>String(m.id)===String(state.selectedId))||null}
  function member(id){return state.members.find(m=>String(m.id)===String(id))||null}
  function ministryMembers(id=state.selectedId){return state.ministryMembers.filter(x=>String(x.ministry_id)===String(id))}
  function ministryInterests(id=state.selectedId){return state.interests.filter(x=>String(x.ministry_id)===String(id))}
  function ministryGroups(id=state.selectedId){return state.groups.filter(x=>String(x.ministry_id)===String(id))}
  function ministryScales(id=state.selectedId){return state.scales.filter(x=>String(x.ministry_id)===String(id))}
  function ministryMedia(id=state.selectedId){return state.media.filter(x=>String(x.ministry_id)===String(id))}
  function groupMemberIds(groupId){return state.groupMembers.filter(x=>String(x.group_id)===String(groupId)).map(x=>String(x.member_id))}
  function memberDisplay(m){return m?.full_name||"Pessoa não encontrada"}

  async function ensureAdmin(){
    if(!configured) throw new Error("Supabase não configurado.");
    const {data:{session},error}=await sb.auth.getSession(); if(error)throw error;
    if(!session){location.href="index.html";return false}
    state.user=session.user;
    const {data:roles,error:re}=await sb.from("pibr_user_roles").select("role").eq("user_id",session.user.id);if(re)throw re;
    if(!(roles||[]).some(r=>r.role==="admin"))return false;
    const {data:profile}=await sb.from("profiles").select("full_name").eq("id",session.user.id).maybeSingle();
    const name=profile?.full_name||session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"Administrador";
    $("#ministries-profile-name").textContent=name;$("#ministries-avatar").textContent=initials(name);return true;
  }

  async function loadData(){
    const qs=await Promise.all([
      sb.from("pibr_ministries").select("*").order("name",{ascending:true}),
      sb.from("pibr_members").select("id,full_name,photo_url,email,phone,category,membership_status").order("full_name",{ascending:true}),
      sb.from("pibr_ministry_members").select("*"),
      sb.from("pibr_member_ministry_interests").select("*"),
      sb.from("pibr_ministry_groups").select("*").order("name",{ascending:true}),
      sb.from("pibr_ministry_group_members").select("*"),
      sb.from("pibr_ministry_scales").select("*").order("scale_date",{ascending:false}),
      sb.from("pibr_media_items").select("id,title,event_name,public_url,status,created_at,ministry_id,media_category").order("created_at",{ascending:false})
    ]);
    for(const q of qs)if(q.error)throw q.error;
    [state.ministries,state.members,state.ministryMembers,state.interests,state.groups,state.groupMembers,state.scales,state.media]=qs.map(q=>q.data||[]);
    if(!state.selectedId&&state.ministries.length)state.selectedId=state.ministries[0].id;
    if(state.selectedId&&!state.ministries.some(m=>String(m.id)===String(state.selectedId)))state.selectedId=state.ministries[0]?.id||null;
    renderAll();
  }

  function renderOverallStats(){
    const active=state.ministries.filter(m=>m.is_active!==false).length;
    const totalMembers=state.ministryMembers.filter(m=>m.status==="active").length;
    const pending=state.interests.filter(i=>["interested","contacted"].includes(i.status)).length;
    const groups=state.groups.filter(g=>g.is_active!==false).length;
    const stats=[["Ministérios ativos",active,"badge-plus","Cadastros administrativos"],["Pessoas servindo",totalMembers,"users","Vínculos ativos"],["Interessados",pending,"user-plus","Aguardando integração"],["Grupos / equipes",groups,"layers-3","Estruturas internas"]];
    $("#ministries-overall-stats").innerHTML=stats.map(([l,v,i,s])=>`<article class="overall-stat"><div class="overall-stat-head"><span>${esc(l)}</span><span class="overall-stat-icon" data-lucide="${i}"></span></div><strong>${v}</strong><small>${esc(s)}</small></article>`).join("");
  }

  function renderList(){
    const q=norm($("#ministry-search").value);
    const list=state.ministries.filter(m=>!q||norm(m.name).includes(q));
    $("#ministry-list").innerHTML=list.length?list.map(m=>{
      const count=ministryMembers(m.id).filter(x=>x.status==="active").length;
      const active=String(m.id)===String(state.selectedId);
      return `<button class="ministry-list-item ${active?"active":""}" data-select-ministry="${esc(m.id)}"><div class="ministry-list-top"><strong>${esc(m.name)}</strong><span>${count} pessoa(s)</span></div><small>${m.is_published?"Também possui cadastro público":"Uso interno"} · ${m.is_active===false?"Inativo":"Ativo"}</small></button>`;
    }).join(""):'<div class="module-empty"><h4>Nenhum ministério</h4><p>Use o botão para criar um cadastro interno.</p></div>';
  }

  function renderDetail(){
    const m=selected(),root=$("#ministry-detail");
    if(!m){root.innerHTML='<div class="ministry-empty-detail"><span data-lucide="badge-plus"></span><h3>Selecione um ministério</h3><p>Escolha um item ao lado.</p></div>';return}
    const leader=member(m.leader_member_id),vice=member(m.vice_leader_member_id);
    const counts={members:ministryMembers().filter(x=>x.status==="active").length,interests:ministryInterests().filter(x=>x.status!=="declined"&&x.status!=="integrated").length,groups:ministryGroups().filter(x=>x.is_active!==false).length,scales:ministryScales().length,media:ministryMedia().length};
    root.innerHTML=`
      <div class="ministry-hero">
        <div class="ministry-hero-main">
          <div class="ministry-hero-title"><div class="ministry-hero-icon"><span data-lucide="badge-plus"></span></div><div><h2>${esc(m.name)}</h2><p>${esc(leader?`Líder: ${leader.full_name}`:"Líder administrativo ainda não definido")}${vice?` · Vice: ${esc(vice.full_name)}`:""}</p></div></div>
          <span class="entity-pill ${m.is_active===false?"":"active"}">${m.is_active===false?"Inativo":"Ativo"}</span>
        </div>
        <div class="ministry-public-warning ${m.is_published?"":"internal"}"><span data-lucide="${m.is_published?"triangle-alert":"lock-keyhole"}"></span><span>${m.is_published?"Este ministério também possui conteúdo público no site. O nome público e a apresentação estão protegidos nesta área; aqui você altera somente dados administrativos.":"Este cadastro é interno e não está publicado no site."}</span></div>
      </div>
      <div class="ministry-tabs">
        ${tabBtn("overview","layout-dashboard","Visão geral","")}
        ${tabBtn("members","users","Membros",counts.members)}
        ${tabBtn("interests","user-plus","Interessados",counts.interests)}
        ${tabBtn("groups","layers-3","Grupos",counts.groups)}
        ${tabBtn("scales","calendar-check","Escalas",counts.scales)}
        ${tabBtn("media","images","Mídias",counts.media)}
      </div>
      <div id="ministry-panel-overview" class="ministry-tab-panel ${state.tab==="overview"?"active":""}">${overviewPanel(m,counts)}</div>
      <div id="ministry-panel-members" class="ministry-tab-panel ${state.tab==="members"?"active":""}">${membersPanel()}</div>
      <div id="ministry-panel-interests" class="ministry-tab-panel ${state.tab==="interests"?"active":""}">${interestsPanel()}</div>
      <div id="ministry-panel-groups" class="ministry-tab-panel ${state.tab==="groups"?"active":""}">${groupsPanel()}</div>
      <div id="ministry-panel-scales" class="ministry-tab-panel ${state.tab==="scales"?"active":""}">${scalesPanel()}</div>
      <div id="ministry-panel-media" class="ministry-tab-panel ${state.tab==="media"?"active":""}">${mediaPanel()}</div>`;
    bindDetail();icons();
  }

  function tabBtn(tab,icon,label,count){return `<button class="ministry-tab ${state.tab===tab?"active":""}" data-ministry-tab="${tab}"><span data-lucide="${icon}"></span>${label}${count!==""?`<span class="count">${count}</span>`:""}</button>`}

  function overviewPanel(m,c){
    return `<div class="detail-stats">
      <div class="detail-stat"><span>Membros ativos</span><strong>${c.members}</strong></div>
      <div class="detail-stat"><span>Interessados</span><strong>${c.interests}</strong></div>
      <div class="detail-stat"><span>Grupos</span><strong>${c.groups}</strong></div>
      <div class="detail-stat"><span>Escalas registradas</span><strong>${c.scales}</strong></div>
    </div>
    <div class="overview-card">
      <div class="overview-card-head"><h3>Dados administrativos</h3><span class="entity-pill">Não altera o site</span></div>
      <div class="overview-card-body">
        <form id="ministry-overview-form">
          <div class="overview-form">
            <label class="full"><span>Nome do ministério ${m.is_published?"(protegido por estar publicado)":""}</span><input id="ov-name" value="${esc(m.name)}" ${m.is_published?"readonly":""}/></label>
            <label><span>Líder administrativo</span><select id="ov-leader"><option value="">Nenhum</option>${memberOptions(m.leader_member_id)}</select></label>
            <label><span>Vice-líder</span><select id="ov-vice"><option value="">Nenhum</option>${memberOptions(m.vice_leader_member_id)}</select></label>
            <label><span>Início do ministério</span><input id="ov-started" type="date" value="${esc(m.started_at||"")}"/></label>
            <label><span>Dia de reunião</span><select id="ov-weekday"><option value="">Não definido</option>${weekdays.map((w,i)=>`<option value="${i}" ${Number(m.meeting_weekday)===i?"selected":""}>${w}</option>`).join("")}</select></label>
            <label><span>Horário de reunião</span><input id="ov-time" type="time" value="${esc(time5(m.meeting_time).replace("—",""))}"/></label>
            <label><span>Status</span><select id="ov-active"><option value="true" ${m.is_active!==false?"selected":""}>Ativo</option><option value="false" ${m.is_active===false?"selected":""}>Inativo</option></select></label>
            <label class="full"><span>Observações internas</span><textarea id="ov-notes" rows="5" placeholder="Informações para a administração, necessidades, planejamento...">${esc(m.internal_notes||"")}</textarea></label>
          </div>
          <div class="overview-actions"><button class="btn btn-primary" type="submit"><span data-lucide="save"></span> Salvar dados administrativos</button></div>
        </form>
      </div>
    </div>`;
  }

  function memberOptions(selectedId){return state.members.filter(x=>x.membership_status==="active").map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selectedId)?"selected":""}>${esc(x.full_name)}</option>`).join("")}

  function personRow(m,subtitle,meta,pill,actions){
    const photo=m?.photo_url?`<img src="${esc(m.photo_url)}" alt=""/>`:esc(initials(m?.full_name));
    return `<div class="entity-row"><div class="entity-main"><div class="entity-avatar">${photo}</div><div class="entity-copy"><strong>${esc(memberDisplay(m))}</strong><small>${esc(subtitle||"Sem contato")}</small></div></div><div class="entity-meta">${esc(meta||"—")}</div><span class="entity-pill ${pill?.cls||""}">${esc(pill?.text||"—")}</span><div class="entity-actions">${actions}</div></div>`;
  }

  function membersPanel(){
    const rows=ministryMembers().map(rel=>{
      const m=member(rel.member_id);
      return personRow(m,m?.phone||m?.email,rel.role_name||"Sem função",{text:rel.status==="active"?"Ativo":"Inativo",cls:rel.status==="active"?"active":""},`<button data-edit-ministry-member="${esc(rel.id)}"><span data-lucide="pencil"></span></button><button class="danger" data-remove-ministry-member="${esc(rel.id)}"><span data-lucide="trash-2"></span></button>`);
    }).join("");
    return `<div class="entity-toolbar"><div><h3>Equipe do ministério</h3><p>Pessoas que já servem oficialmente neste ministério.</p></div><button class="btn btn-primary" id="add-ministry-member"><span data-lucide="user-plus"></span> Adicionar membro</button></div><div class="entity-list">${rows||empty("users","Nenhum membro na equipe","Adicione pessoas cadastradas em Membros.")}</div>`;
  }

  function interestsPanel(){
    const rows=ministryInterests().map(rel=>{
      const m=member(rel.member_id);
      const status={interested:"Interessado",contacted:"Contatado",integrated:"Integrado",declined:"Não seguirá"}[rel.status]||rel.status;
      return personRow(m,m?.phone||m?.email,rel.notes||"Sem observações",{text:status,cls:rel.status},`<button data-edit-interest="${esc(rel.id)}"><span data-lucide="pencil"></span></button><button class="danger" data-remove-interest="${esc(rel.id)}"><span data-lucide="trash-2"></span></button>`);
    }).join("");
    return `<div class="entity-toolbar"><div><h3>Interessados em servir</h3><p>Acompanhe pessoas que demonstraram interesse neste ministério.</p></div><button class="btn btn-primary" id="add-interest"><span data-lucide="user-plus"></span> Adicionar interessado</button></div><div class="entity-list">${rows||empty("user-plus","Nenhum interessado","Os interesses registrados em Membros aparecem aqui.")}</div>`;
  }

  function groupsPanel(){
    const rows=ministryGroups().map(g=>{
      const ids=groupMemberIds(g.id),leader=member(g.leader_member_id);
      return `<article class="group-card"><div class="group-card-head"><div><h4>${esc(g.name)}</h4><p>${esc(g.description||"Grupo interno do ministério")}</p></div><div class="group-card-actions"><button data-edit-group="${esc(g.id)}"><span data-lucide="pencil"></span></button><button class="danger" data-delete-group="${esc(g.id)}"><span data-lucide="trash-2"></span></button></div></div><div class="group-card-meta"><span class="group-chip">${ids.length} pessoa(s)</span><span class="group-chip">Líder: ${esc(leader?.full_name||"Não definido")}</span><span class="group-chip">${g.is_active===false?"Inativo":"Ativo"}</span></div></article>`;
    }).join("");
    return `<div class="entity-toolbar"><div><h3>Grupos e equipes</h3><p>Organize Grupo A, Grupo B, equipe técnica, recepção e outras subdivisões.</p></div><button class="btn btn-primary" id="add-group"><span data-lucide="plus"></span> Novo grupo</button></div><div class="group-grid">${rows||empty("layers-3","Nenhum grupo","Crie equipes internas dentro deste ministério.")}</div>`;
  }

  function scalesPanel(){
    const rows=ministryScales().map(s=>`<div class="entity-row"><div class="entity-main"><div class="entity-avatar"><span data-lucide="calendar-check"></span></div><div class="entity-copy"><strong>${esc(s.title)}</strong><small>${esc(s.group_name||"Sem grupo")}</small></div></div><div class="entity-meta">${dateBR(s.scale_date)} · ${esc(time5(s.start_time))}</div><span class="entity-pill ${s.status==="published"?"active":""}">${esc({draft:"Rascunho",published:"Publicada",completed:"Concluída",cancelled:"Cancelada"}[s.status]||s.status)}</span><div class="entity-actions"><a class="entity-link-action" href="agenda.html" title="Abrir Agenda"><span data-lucide="external-link"></span></a></div></div>`).join("");
    return `<div class="entity-toolbar"><div><h3>Escalas do ministério</h3><p>As escalas são criadas e editadas pela Agenda Central.</p></div><a class="btn btn-primary" href="agenda.html"><span data-lucide="calendar-range"></span> Abrir Agenda Central</a></div><div class="entity-list">${rows||empty("calendar-check","Nenhuma escala","Crie a primeira escala pela Agenda Central.")}</div>`;
  }

  function mediaPanel(){
    const linked=ministryMedia();
    const cards=linked.map(x=>`<article class="media-card-admin"><img src="${esc(x.public_url||"")}" alt="${esc(x.title||"Foto do ministério")}" onerror="this.style.display='none'"/><div class="media-card-admin-body"><strong>${esc(x.title||x.event_name||"Mídia")}</strong><small>${esc(x.status==="published"?"Publicada":"Rascunho")} · ${dateTimeBR(x.created_at)}</small><button data-unlink-media="${esc(x.id)}">Desvincular deste ministério</button></div></article>`).join("");
    return `<div class="entity-toolbar"><div><h3>Mídias do ministério</h3><p>Fotos enviadas pela Mídia podem ser vinculadas aqui. Vincular não muda o status de publicação.</p></div><button class="btn btn-primary" id="link-media"><span data-lucide="link"></span> Vincular foto existente</button></div><div class="media-grid-admin">${cards||empty("images","Nenhuma mídia vinculada","Vincule uma foto já enviada pela equipe de Mídia.")}</div>`;
  }

  function empty(icon,title,text){return `<div class="module-empty"><span data-lucide="${icon}"></span><h4>${esc(title)}</h4><p>${esc(text)}</p></div>`}

  function bindDetail(){
    $$(".ministry-tab").forEach(btn=>btn.addEventListener("click",()=>{state.tab=btn.dataset.ministryTab;renderDetail()}));
    $("#ministry-overview-form")?.addEventListener("submit",saveOverview);
    $("#add-ministry-member")?.addEventListener("click",()=>ministryMemberForm());
    $("#add-interest")?.addEventListener("click",()=>interestForm());
    $("#add-group")?.addEventListener("click",()=>groupForm());
    $("#link-media")?.addEventListener("click",()=>mediaLinkForm());
    $("#ministry-panel-members")?.addEventListener("click",e=>{const ed=e.target.closest("[data-edit-ministry-member]"),rm=e.target.closest("[data-remove-ministry-member]");if(ed)ministryMemberForm(state.ministryMembers.find(x=>String(x.id)===String(ed.dataset.editMinistryMember)));if(rm)removeMinistryMember(rm.dataset.removeMinistryMember)});
    $("#ministry-panel-interests")?.addEventListener("click",e=>{const ed=e.target.closest("[data-edit-interest]"),rm=e.target.closest("[data-remove-interest]");if(ed)interestForm(state.interests.find(x=>String(x.id)===String(ed.dataset.editInterest)));if(rm)removeInterest(rm.dataset.removeInterest)});
    $("#ministry-panel-groups")?.addEventListener("click",e=>{const ed=e.target.closest("[data-edit-group]"),rm=e.target.closest("[data-delete-group]");if(ed)groupForm(state.groups.find(x=>String(x.id)===String(ed.dataset.editGroup)));if(rm)deleteGroup(rm.dataset.deleteGroup)});
    $("#ministry-panel-media")?.addEventListener("click",e=>{const x=e.target.closest("[data-unlink-media]");if(x)unlinkMedia(x.dataset.unlinkMedia)});
  }

  async function saveOverview(e){
    e.preventDefault();const m=selected();if(!m)return;
    try{
      const payload={leader_member_id:$("#ov-leader").value||null,vice_leader_member_id:$("#ov-vice").value||null,started_at:$("#ov-started").value||null,meeting_weekday:$("#ov-weekday").value===""?null:Number($("#ov-weekday").value),meeting_time:$("#ov-time").value||null,is_active:$("#ov-active").value==="true",internal_notes:$("#ov-notes").value.trim()||null};
      if(!m.is_published)payload.name=$("#ov-name").value.trim()||m.name;
      const {error}=await sb.from("pibr_ministries").update(payload).eq("id",m.id);if(error)throw error;
      toast("Dados administrativos salvos.","success");await loadData();
    }catch(err){console.error(err);toast(err.message||"Não foi possível salvar.","error")}
  }

  function openModal(title,body){$("#ministry-modal-title").textContent=title;$("#ministry-modal-body").innerHTML=body;show($("#ministry-modal"));icons();$$("[data-close-ministry-modal]",$("#ministry-modal-body")).forEach(x=>x.addEventListener("click",closeModal))}
  function closeModal(){hide($("#ministry-modal"))}

  function newMinistryForm(){
    openModal("Novo ministério interno",`<form id="new-ministry-form" class="module-form"><div class="module-form-grid"><label class="full"><span>Nome *</span><input id="new-ministry-name" required placeholder="Ex.: Intercessão"/></label><label><span>Líder administrativo</span><select id="new-ministry-leader"><option value="">Nenhum</option>${memberOptions()}</select></label><label><span>Data de início</span><input id="new-ministry-started" type="date"/></label><label class="full"><span>Observações internas</span><textarea id="new-ministry-notes" rows="4"></textarea></label></div><div class="ministry-public-warning internal"><span data-lucide="lock-keyhole"></span><span>O novo ministério será criado como interno e não será publicado no site.</span></div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-ministry-modal>Cancelar</button><button class="btn btn-primary" type="submit">Criar ministério</button></div></form>`);
    $("#new-ministry-form").addEventListener("submit",async e=>{e.preventDefault();try{const {data,error}=await sb.from("pibr_ministries").insert({name:$("#new-ministry-name").value.trim(),leader_member_id:$("#new-ministry-leader").value||null,started_at:$("#new-ministry-started").value||null,internal_notes:$("#new-ministry-notes").value.trim()||null,is_published:false,is_active:true}).select("id").single();if(error)throw error;state.selectedId=data.id;state.tab="overview";closeModal();toast("Ministério interno criado.","success");await loadData()}catch(err){toast(err.message||"Não foi possível criar.","error")}})
  }

  function ministryMemberForm(rel=null){
    const used=new Set(ministryMembers().map(x=>String(x.member_id)));if(rel)used.delete(String(rel.member_id));
    const options=state.members.filter(m=>m.membership_status==="active"&&!used.has(String(m.id))).map(m=>`<option value="${esc(m.id)}" ${String(rel?.member_id)===String(m.id)?"selected":""}>${esc(m.full_name)}</option>`).join("");
    openModal(rel?"Editar membro da equipe":"Adicionar membro à equipe",`<form id="ministry-member-form" class="module-form"><div class="module-form-grid"><label class="full"><span>Pessoa *</span><select id="mm-member" required><option value="">Selecione...</option>${options}</select></label><label><span>Função</span><input id="mm-role" value="${esc(rel?.role_name||"")}" placeholder="Ex.: Vocal, câmera, recepção"/></label><label><span>Data de entrada</span><input id="mm-joined" type="date" value="${esc(rel?.joined_at||"")}"/></label><label><span>Status</span><select id="mm-status"><option value="active" ${rel?.status!=="inactive"?"selected":""}>Ativo</option><option value="inactive" ${rel?.status==="inactive"?"selected":""}>Inativo</option></select></label><label class="full"><span>Observações</span><textarea id="mm-notes" rows="3">${esc(rel?.notes||"")}</textarea></label></div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-ministry-modal>Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div></form>`);
    $("#ministry-member-form").addEventListener("submit",async e=>{e.preventDefault();try{const payload={ministry_id:state.selectedId,member_id:$("#mm-member").value,role_name:$("#mm-role").value.trim()||null,joined_at:$("#mm-joined").value||null,status:$("#mm-status").value,notes:$("#mm-notes").value.trim()||null};const q=rel?sb.from("pibr_ministry_members").update(payload).eq("id",rel.id):sb.from("pibr_ministry_members").insert(payload);const {error}=await q;if(error)throw error;closeModal();toast("Equipe atualizada.","success");await loadData()}catch(err){toast(err.message||"Não foi possível salvar.","error")}})
  }
  async function removeMinistryMember(id){if(!confirm("Remover esta pessoa da equipe do ministério?"))return;const {error}=await sb.from("pibr_ministry_members").delete().eq("id",id);if(error)return toast(error.message,"error");toast("Pessoa removida da equipe.","success");await loadData()}

  function interestForm(rel=null){
    const existing=new Set(ministryInterests().map(x=>String(x.member_id)));if(rel)existing.delete(String(rel.member_id));
    const options=state.members.filter(m=>m.membership_status==="active"&&!existing.has(String(m.id))).map(m=>`<option value="${esc(m.id)}" ${String(rel?.member_id)===String(m.id)?"selected":""}>${esc(m.full_name)}</option>`).join("");
    openModal(rel?"Atualizar interessado":"Adicionar interessado",`<form id="interest-form" class="module-form"><div class="module-form-grid"><label class="full"><span>Pessoa *</span><select id="int-member" required><option value="">Selecione...</option>${options}</select></label><label><span>Status</span><select id="int-status"><option value="interested" ${rel?.status==="interested"||!rel?"selected":""}>Interessado</option><option value="contacted" ${rel?.status==="contacted"?"selected":""}>Contatado</option><option value="integrated" ${rel?.status==="integrated"?"selected":""}>Integrado</option><option value="declined" ${rel?.status==="declined"?"selected":""}>Não seguirá</option></select></label><label class="full"><span>Observações</span><textarea id="int-notes" rows="4">${esc(rel?.notes||"")}</textarea></label></div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-ministry-modal>Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div></form>`);
    $("#interest-form").addEventListener("submit",async e=>{e.preventDefault();try{const payload={ministry_id:state.selectedId,member_id:$("#int-member").value,status:$("#int-status").value,notes:$("#int-notes").value.trim()||null};const q=rel?sb.from("pibr_member_ministry_interests").update(payload).eq("id",rel.id):sb.from("pibr_member_ministry_interests").insert(payload);const {error}=await q;if(error)throw error;closeModal();toast("Interessado atualizado.","success");await loadData()}catch(err){toast(err.message||"Não foi possível salvar.","error")}})
  }
  async function removeInterest(id){if(!confirm("Remover este interesse do ministério?"))return;const {error}=await sb.from("pibr_member_ministry_interests").delete().eq("id",id);if(error)return toast(error.message,"error");toast("Interesse removido.","success");await loadData()}

  function groupForm(group=null){
    const eligible=ministryMembers().filter(x=>x.status==="active").map(x=>member(x.member_id)).filter(Boolean),selectedIds=new Set(group?groupMemberIds(group.id):[]);
    const rows=eligible.map(m=>`<label class="checkbox-member"><input type="checkbox" name="group-member" value="${esc(m.id)}" ${selectedIds.has(String(m.id))?"checked":""}/><strong>${esc(m.full_name)}</strong><input type="text" data-group-role="${esc(m.id)}" placeholder="Função no grupo" ${selectedIds.has(String(m.id))?"":"disabled"}/></label>`).join("");
    openModal(group?"Editar grupo":"Novo grupo / equipe",`<form id="group-form" class="module-form"><div class="module-form-grid"><label class="full"><span>Nome do grupo *</span><input id="group-name" required value="${esc(group?.name||"")}" placeholder="Ex.: Grupo A"/></label><label><span>Líder do grupo</span><select id="group-leader"><option value="">Nenhum</option>${eligible.map(m=>`<option value="${esc(m.id)}" ${String(group?.leader_member_id)===String(m.id)?"selected":""}>${esc(m.full_name)}</option>`).join("")}</select></label><label><span>Status</span><select id="group-active"><option value="true" ${group?.is_active!==false?"selected":""}>Ativo</option><option value="false" ${group?.is_active===false?"selected":""}>Inativo</option></select></label><label class="full"><span>Descrição</span><textarea id="group-description" rows="3">${esc(group?.description||"")}</textarea></label><label class="full"><span>Pessoas do grupo</span><div class="checkbox-members">${rows||'<div class="module-empty">Adicione membros ao ministério antes de montar grupos.</div>'}</div></label></div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-ministry-modal>Cancelar</button><button class="btn btn-primary" type="submit">Salvar grupo</button></div></form>`);
    $$('input[name="group-member"]').forEach(ch=>ch.addEventListener("change",()=>{const r=$(`[data-group-role="${ch.value}"]`);r.disabled=!ch.checked;if(!ch.checked)r.value=""}));
    if(group){state.groupMembers.filter(x=>String(x.group_id)===String(group.id)).forEach(x=>{const inp=$(`[data-group-role="${x.member_id}"]`);if(inp)inp.value=x.role_name||""})}
    $("#group-form").addEventListener("submit",async e=>{e.preventDefault();try{const payload={ministry_id:state.selectedId,name:$("#group-name").value.trim(),leader_member_id:$("#group-leader").value||null,is_active:$("#group-active").value==="true",description:$("#group-description").value.trim()||null};let gid=group?.id;if(group){const {error}=await sb.from("pibr_ministry_groups").update(payload).eq("id",group.id);if(error)throw error}else{const {data,error}=await sb.from("pibr_ministry_groups").insert(payload).select("id").single();if(error)throw error;gid=data.id}const {error:de}=await sb.from("pibr_ministry_group_members").delete().eq("group_id",gid);if(de)throw de;const members=$$('input[name="group-member"]:checked').map(ch=>({group_id:gid,member_id:ch.value,role_name:$(`[data-group-role="${ch.value}"]`)?.value?.trim()||null}));if(members.length){const {error}=await sb.from("pibr_ministry_group_members").insert(members);if(error)throw error}closeModal();toast("Grupo salvo.","success");await loadData()}catch(err){toast(err.message||"Não foi possível salvar.","error")}})
  }
  async function deleteGroup(id){if(!confirm("Excluir este grupo e seus vínculos?"))return;const {error}=await sb.from("pibr_ministry_groups").delete().eq("id",id);if(error)return toast(error.message,"error");toast("Grupo excluído.","success");await loadData()}

  function mediaLinkForm(){
    const unlinked=state.media.filter(x=>String(x.ministry_id)!==String(state.selectedId));
    openModal("Vincular mídia existente",`<form id="media-link-form" class="module-form"><div class="module-form-grid"><label class="full"><span>Foto / mídia *</span><select id="media-link-id" required><option value="">Selecione...</option>${unlinked.map(x=>`<option value="${esc(x.id)}">${esc(x.title||x.event_name||"Mídia")} · ${x.status==="published"?"Publicada":"Rascunho"}</option>`).join("")}</select></label><div class="ministry-public-warning internal full"><span data-lucide="info"></span><span>Vincular uma foto ao ministério apenas organiza o acervo. O status de publicação da mídia não será alterado.</span></div></div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-ministry-modal>Cancelar</button><button class="btn btn-primary" type="submit">Vincular</button></div></form>`);
    $("#media-link-form").addEventListener("submit",async e=>{e.preventDefault();try{const {error}=await sb.from("pibr_media_items").update({ministry_id:state.selectedId,media_category:"ministerio"}).eq("id",$("#media-link-id").value);if(error)throw error;closeModal();toast("Mídia vinculada.","success");await loadData()}catch(err){toast(err.message||"Não foi possível vincular.","error")}})
  }
  async function unlinkMedia(id){const {error}=await sb.from("pibr_media_items").update({ministry_id:null}).eq("id",id);if(error)return toast(error.message,"error");toast("Mídia desvinculada.","success");await loadData()}

  function bindGlobal(){
    $("#new-ministry").addEventListener("click",newMinistryForm);
    $("#ministry-search").addEventListener("input",renderList);
    $("#ministry-list").addEventListener("click",e=>{const b=e.target.closest("[data-select-ministry]");if(b){state.selectedId=b.dataset.selectMinistry;state.tab="overview";renderList();renderDetail()}});
    $$("[data-close-ministry-modal]").forEach(x=>x.addEventListener("click",closeModal));
    $("#ministries-logout").addEventListener("click",async()=>{await sb.auth.signOut();location.href="index.html"});
    $("#ministries-sidebar-open").addEventListener("click",()=>{$("#ministries-sidebar").classList.add("open");show($("#ministries-sidebar-overlay"))});
    $("#ministries-sidebar-close").addEventListener("click",()=>{$("#ministries-sidebar").classList.remove("open");hide($("#ministries-sidebar-overlay"))});
    $("#ministries-sidebar-overlay").addEventListener("click",()=>{$("#ministries-sidebar").classList.remove("open");hide($("#ministries-sidebar-overlay"))});
  }

  function renderAll(){renderOverallStats();renderList();renderDetail();icons()}

  async function init(){
    icons();
    try{
      const admin=await ensureAdmin();hide($("#ministries-loading"));
      if(!admin){show($("#ministries-denied"));icons();return}
      bindGlobal();await loadData();show($("#ministries-app"));icons();
    }catch(err){console.error(err);hide($("#ministries-loading"));show($("#ministries-denied"));$("#ministries-denied p").textContent=err.message||"Não foi possível carregar os ministérios.";icons()}
  }
  init();
})();