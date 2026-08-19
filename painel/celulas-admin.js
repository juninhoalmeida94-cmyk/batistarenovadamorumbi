(() => {
  "use strict";

  const cfg=window.PIBR_CONFIG||{};
  const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase);
  const sb=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const norm=v=>String(v||"").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const initials=name=>String(name||"PIBR").trim().split(/\s+/).slice(0,2).map(v=>v[0]).join("").toUpperCase();
  const weekdays=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const dateBR=v=>v?new Intl.DateTimeFormat("pt-BR").format(new Date(`${v}T12:00:00`)):"—";
  const dateTimeBR=v=>v?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(v)):"—";
  const time5=v=>v?String(v).slice(0,5):"—";

  const state={user:null,cells:[],members:[],cellMembers:[],interests:[],meetings:[],media:[],selectedId:null,tab:"overview"};

  function icons(){if(window.lucide)window.lucide.createIcons()}
  function show(el){el?.classList.remove("hidden")} function hide(el){el?.classList.add("hidden")}
  function toast(message,type=""){const el=document.createElement("div");el.className=`toast ${type}`.trim();el.innerHTML=`<span data-lucide="${type==="error"?"circle-alert":type==="success"?"circle-check":"info"}"></span><span>${esc(message)}</span>`;$("#toast-root").appendChild(el);icons();setTimeout(()=>el.remove(),3800)}
  function selected(){return state.cells.find(c=>String(c.id)===String(state.selectedId))||null}
  function member(id){return state.members.find(m=>String(m.id)===String(id))||null}
  function cellMembers(id=state.selectedId){return state.cellMembers.filter(x=>String(x.cell_id)===String(id))}
  function cellInterests(id=state.selectedId){return state.interests.filter(x=>String(x.assigned_cell_id)===String(id))}
  function cellMeetings(id=state.selectedId){return state.meetings.filter(x=>String(x.cell_id)===String(id))}
  function cellMedia(id=state.selectedId){return state.media.filter(x=>String(x.cell_id)===String(id))}
  function statusLabel(s){return {active:"Ativa",paused:"Pausada",closed:"Encerrada"}[s]||s||"—"}

  async function ensureAdmin(){
    if(!configured)throw new Error("Supabase não configurado.");
    const {data:{session},error}=await sb.auth.getSession();if(error)throw error;
    if(!session){location.href="index.html";return false}
    state.user=session.user;
    const {data:roles,error:re}=await sb.from("pibr_user_roles").select("role").eq("user_id",session.user.id);if(re)throw re;
    if(!(roles||[]).some(r=>r.role==="admin"))return false;
    const {data:profile}=await sb.from("profiles").select("full_name").eq("id",session.user.id).maybeSingle();
    const name=profile?.full_name||session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"Administrador";
    $("#cells-profile-name").textContent=name;$("#cells-avatar").textContent=initials(name);return true;
  }

  async function loadData(){
    const qs=await Promise.all([
      sb.from("pibr_cells").select("*").order("name",{ascending:true}),
      sb.from("pibr_members").select("id,full_name,photo_url,email,phone,category,membership_status").order("full_name",{ascending:true}),
      sb.from("pibr_cell_members").select("*"),
      sb.from("pibr_cell_interests").select("*").order("created_at",{ascending:false}),
      sb.from("pibr_cell_meetings").select("*").order("meeting_date",{ascending:false}),
      sb.from("pibr_media_items").select("id,title,event_name,public_url,status,created_at,cell_id,media_category").order("created_at",{ascending:false})
    ]);
    for(const q of qs)if(q.error)throw q.error;
    [state.cells,state.members,state.cellMembers,state.interests,state.meetings,state.media]=qs.map(q=>q.data||[]);
    if(!state.selectedId&&state.cells.length)state.selectedId=state.cells[0].id;
    if(state.selectedId&&!state.cells.some(c=>String(c.id)===String(state.selectedId)))state.selectedId=state.cells[0]?.id||null;
    renderAll();
  }

  function renderOverallStats(){
    const active=state.cells.filter(c=>c.internal_status==="active").length;
    const participants=state.cellMembers.filter(x=>x.status==="active").length;
    const unassigned=state.interests.filter(x=>!x.assigned_cell_id&&["new","contacted","referred"].includes(x.status)).length;
    const now=new Date(),month=now.getMonth(),year=now.getFullYear();
    const meetings=state.meetings.filter(x=>{const d=new Date(`${x.meeting_date}T12:00:00`);return d.getMonth()===month&&d.getFullYear()===year}).length;
    const stats=[["Células ativas",active,"house-heart","Status administrativo"],["Participantes",participants,"users","Vínculos ativos"],["Interessados sem célula",unassigned,"user-plus","Aguardando encaminhamento"],["Encontros no mês",meetings,"calendar-check","Histórico registrado"]];
    $("#cells-overall-stats").innerHTML=stats.map(([l,v,i,s])=>`<article class="overall-stat"><div class="overall-stat-head"><span>${esc(l)}</span><span class="overall-stat-icon" data-lucide="${i}"></span></div><strong>${v}</strong><small>${esc(s)}</small></article>`).join("");
  }

  function renderList(){
    const q=norm($("#cell-search").value);
    const list=state.cells.filter(c=>!q||norm([c.name,c.neighborhood,c.internal_neighborhood].join(" ")).includes(q));
    $("#cell-list").innerHTML=list.length?list.map(c=>{
      const count=cellMembers(c.id).filter(x=>x.status==="active").length,active=String(c.id)===String(state.selectedId);
      const n=c.internal_neighborhood||c.neighborhood||"Bairro não informado";
      return `<button class="cell-list-item ${active?"active":""}" data-select-cell="${esc(c.id)}"><div class="cell-list-top"><strong>${esc(c.name)}</strong><span>${count} participante(s)</span></div><small>${esc(n)} · ${esc(statusLabel(c.internal_status))}${c.is_published?" · possui página pública":""}</small></button>`;
    }).join(""):'<div class="module-empty"><h4>Nenhuma célula</h4><p>Use o botão para criar uma célula interna.</p></div>';
  }

  function tabBtn(tab,icon,label,count){return `<button class="cell-tab ${state.tab===tab?"active":""}" data-cell-tab="${tab}"><span data-lucide="${icon}"></span>${label}${count!==""?`<span class="count">${count}</span>`:""}</button>`}

  function renderDetail(){
    const c=selected(),root=$("#cell-detail");
    if(!c){root.innerHTML='<div class="cell-empty-detail"><span data-lucide="house-heart"></span><h3>Selecione uma célula</h3><p>Escolha uma célula ao lado.</p></div>';return}
    const leader=member(c.leader_member_id),vice=member(c.vice_leader_member_id);
    const counts={members:cellMembers().filter(x=>x.status==="active").length,interests:cellInterests().filter(x=>x.status!=="integrated"&&x.status!=="archived").length,meetings:cellMeetings().length,media:cellMedia().length};
    root.innerHTML=`
      <div class="cell-hero">
        <div class="cell-hero-main">
          <div class="cell-hero-title"><div class="cell-hero-icon"><span data-lucide="house-heart"></span></div><div><h2>${esc(c.name)}</h2><p>${esc(leader?`Líder: ${leader.full_name}`:"Líder administrativo ainda não definido")}${vice?` · Vice: ${esc(vice.full_name)}`:""}</p></div></div>
          <span class="entity-pill ${esc(c.internal_status)}">${esc(statusLabel(c.internal_status))}</span>
        </div>
        <div class="public-warning ${c.is_published?"":"internal"}"><span data-lucide="${c.is_published?"shield-check":"lock-keyhole"}"></span><span>${c.is_published?"Esta célula possui dados públicos no site. Dia, horário, endereço e apresentação pública ficam somente para consulta aqui e não são alterados pela gestão administrativa.":"Esta célula é interna e não está publicada no site."}</span></div>
      </div>
      <div class="cell-tabs">
        ${tabBtn("overview","layout-dashboard","Visão geral","")}
        ${tabBtn("members","users","Participantes",counts.members)}
        ${tabBtn("interests","user-plus","Interessados",counts.interests)}
        ${tabBtn("meetings","calendar-check","Encontros",counts.meetings)}
        ${tabBtn("media","images","Fotos",counts.media)}
      </div>
      <div id="cell-panel-overview" class="cell-tab-panel ${state.tab==="overview"?"active":""}">${overviewPanel(c,counts)}</div>
      <div id="cell-panel-members" class="cell-tab-panel ${state.tab==="members"?"active":""}">${membersPanel()}</div>
      <div id="cell-panel-interests" class="cell-tab-panel ${state.tab==="interests"?"active":""}">${interestsPanel()}</div>
      <div id="cell-panel-meetings" class="cell-tab-panel ${state.tab==="meetings"?"active":""}">${meetingsPanel()}</div>
      <div id="cell-panel-media" class="cell-tab-panel ${state.tab==="media"?"active":""}">${mediaPanel()}</div>`;
    bindDetail();icons();
  }

  function overviewPanel(c,counts){
    const publicAddress=[c.address,c.neighborhood,c.city,c.state].filter(Boolean).join(" · ")||"Não informado";
    const internalDay=c.internal_weekday===null||c.internal_weekday===undefined?c.weekday:c.internal_weekday;
    const internalTime=c.internal_meeting_time||c.meeting_time||"";
    return `<div class="detail-stats"><div class="detail-stat"><span>Participantes</span><strong>${counts.members}</strong></div><div class="detail-stat"><span>Interessados</span><strong>${counts.interests}</strong></div><div class="detail-stat"><span>Encontros registrados</span><strong>${counts.meetings}</strong></div><div class="detail-stat"><span>Fotos vinculadas</span><strong>${counts.media}</strong></div></div>
    <div class="info-grid">
      <div class="overview-card">
        <div class="overview-card-head"><h3>Informações públicas</h3><span class="entity-pill">Somente leitura</span></div>
        <div class="overview-card-body"><div class="public-data-list">
          <div class="public-data-line"><span>Nome no site</span><strong>${esc(c.name)}</strong></div>
          <div class="public-data-line"><span>Dia</span><strong>${esc(weekdays[Number(c.weekday)]||"Não informado")}</strong></div>
          <div class="public-data-line"><span>Horário</span><strong>${esc(time5(c.meeting_time))}</strong></div>
          <div class="public-data-line"><span>Endereço</span><strong>${esc(publicAddress)}</strong></div>
          <div class="public-data-line"><span>Publicação</span><strong>${c.is_published?"Publicada":"Não publicada"}</strong></div>
        </div></div>
      </div>
      <div class="overview-card">
        <div class="overview-card-head"><h3>Dados administrativos reais</h3><span class="entity-pill">Interno</span></div>
        <div class="overview-card-body"><form id="cell-overview-form"><div class="overview-form">
          <label><span>Líder administrativo</span><select id="ov-leader"><option value="">Nenhum</option>${memberOptions(c.leader_member_id)}</select></label>
          <label><span>Vice-líder</span><select id="ov-vice"><option value="">Nenhum</option>${memberOptions(c.vice_leader_member_id)}</select></label>
          <label><span>Anfitrião / responsável pela casa</span><select id="ov-host"><option value="">Nenhum</option>${memberOptions(c.host_member_id)}</select></label>
          <label><span>Data de início</span><input id="ov-started" type="date" value="${esc(c.started_at||"")}"/></label>
          <label><span>Dia real da reunião</span><select id="ov-weekday"><option value="">Usar informação pública</option>${weekdays.map((w,i)=>`<option value="${i}" ${Number(internalDay)===i&&c.internal_weekday!==null?"selected":""}>${w}</option>`).join("")}</select></label>
          <label><span>Horário real</span><input id="ov-time" type="time" value="${esc(time5(internalTime).replace("—",""))}"/></label>
          <label class="full"><span>Endereço interno</span><input id="ov-address" value="${esc(c.internal_address||c.address||"")}"/></label>
          <label><span>Bairro</span><input id="ov-neighborhood" value="${esc(c.internal_neighborhood||c.neighborhood||"")}"/></label>
          <label><span>Capacidade estimada</span><input id="ov-max" type="number" min="0" value="${esc(c.max_people??"")}"/></label>
          <label><span>Cidade</span><input id="ov-city" value="${esc(c.internal_city||c.city||"Paranavaí")}"/></label>
          <label><span>UF</span><input id="ov-state" maxlength="2" value="${esc(c.internal_state||c.state||"PR")}"/></label>
          <label class="full"><span>Status administrativo</span><select id="ov-status"><option value="active" ${c.internal_status==="active"?"selected":""}>Ativa</option><option value="paused" ${c.internal_status==="paused"?"selected":""}>Pausada</option><option value="closed" ${c.internal_status==="closed"?"selected":""}>Encerrada</option></select></label>
          <label class="full"><span>Observações internas</span><textarea id="ov-notes" rows="5">${esc(c.internal_notes||"")}</textarea></label>
        </div><div class="overview-actions"><button class="btn btn-primary" type="submit"><span data-lucide="save"></span> Salvar dados internos</button></div></form></div>
      </div>
    </div>`;
  }

  function memberOptions(selectedId){return state.members.filter(x=>x.membership_status==="active").map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selectedId)?"selected":""}>${esc(x.full_name)}</option>`).join("")}

  function personRow(m,subtitle,meta,pill,actions){
    const photo=m?.photo_url?`<img src="${esc(m.photo_url)}" alt=""/>`:esc(initials(m?.full_name));
    return `<div class="entity-row"><div class="entity-main"><div class="entity-avatar">${photo}</div><div class="entity-copy"><strong>${esc(m?.full_name||"Pessoa não encontrada")}</strong><small>${esc(subtitle||"Sem contato")}</small></div></div><div class="entity-meta">${esc(meta||"—")}</div><span class="entity-pill ${pill?.cls||""}">${esc(pill?.text||"—")}</span><div class="entity-actions">${actions}</div></div>`;
  }

  function membersPanel(){
    const rows=cellMembers().map(rel=>personRow(member(rel.member_id),member(rel.member_id)?.phone||member(rel.member_id)?.email,rel.role_name||"Participante",{text:rel.status==="active"?"Ativo":"Inativo",cls:rel.status==="active"?"active":""},`<button data-edit-cell-member="${esc(rel.id)}"><span data-lucide="pencil"></span></button><button class="danger" data-remove-cell-member="${esc(rel.id)}"><span data-lucide="trash-2"></span></button>`)).join("");
    return `<div class="entity-toolbar"><div><h3>Participantes da célula</h3><p>Pessoas cadastradas em Membros e vinculadas oficialmente a esta célula.</p></div><button id="add-cell-member" class="btn btn-primary"><span data-lucide="user-plus"></span> Adicionar participante</button></div><div class="entity-list">${rows||empty("users","Nenhum participante","Adicione pessoas cadastradas em Membros.")}</div>`;
  }

  function interestsPanel(){
    const rows=cellInterests().map(i=>{
      const status={new:"Novo",contacted:"Contatado",referred:"Encaminhado",integrated:"Integrado",archived:"Arquivado"}[i.status]||i.status;
      return `<div class="entity-row"><div class="entity-main"><div class="entity-avatar">${esc(initials(i.full_name))}</div><div class="entity-copy"><strong>${esc(i.full_name||"Interessado")}</strong><small>${esc(i.phone||i.email||"Sem contato")}</small></div></div><div class="entity-meta">${esc(i.location_text||"Local não informado")}</div><span class="entity-pill ${esc(i.status)}">${esc(status)}</span><div class="entity-actions"><button data-edit-cell-interest="${esc(i.id)}"><span data-lucide="pencil"></span></button><button class="danger" data-unassign-interest="${esc(i.id)}" title="Retirar encaminhamento"><span data-lucide="unlink"></span></button></div></div>`;
    }).join("");
    return `<div class="entity-toolbar"><div><h3>Interessados encaminhados</h3><p>Pessoas que pediram contato e foram direcionadas para esta célula.</p></div><button id="assign-interest" class="btn btn-primary"><span data-lucide="user-plus"></span> Encaminhar interessado</button></div><div class="entity-list">${rows||empty("user-plus","Nenhum interessado encaminhado","Encaminhe uma pessoa da lista geral de interessados.")}</div>`;
  }

  function meetingsPanel(){
    const list=cellMeetings(),total=list.length,avg=total?Math.round(list.reduce((a,x)=>a+(x.attendees_count||0),0)/total):0,visitors=list.reduce((a,x)=>a+(x.visitors_count||0),0);
    const rows=list.map(m=>`<div class="meeting-row"><strong>${dateBR(m.meeting_date)}</strong><span>${m.attendees_count} participantes</span><span>${m.visitors_count} visitantes</span><span class="hide-tablet">${m.decisions_count} decisões</span><span class="hide-mobile">${esc(m.notes||"Sem observações")}</span><div class="entity-actions"><button data-edit-meeting="${esc(m.id)}"><span data-lucide="pencil"></span></button><button class="danger" data-delete-meeting="${esc(m.id)}"><span data-lucide="trash-2"></span></button></div></div>`).join("");
    return `<div class="meetings-grid"><div class="meeting-stat"><span>Encontros registrados</span><strong>${total}</strong></div><div class="meeting-stat"><span>Média de participantes</span><strong>${avg}</strong></div><div class="meeting-stat"><span>Visitantes registrados</span><strong>${visitors}</strong></div></div><div class="entity-toolbar"><div><h3>Histórico de encontros</h3><p>Resumo administrativo da reunião — sem criar módulo de presença individual.</p></div><button id="add-meeting" class="btn btn-primary"><span data-lucide="plus"></span> Registrar encontro</button></div><div class="entity-list">${rows||empty("calendar-check","Nenhum encontro registrado","Registre data, quantidade de participantes e observações.")}</div>`;
  }

  function mediaPanel(){
    const cards=cellMedia().map(x=>`<article class="media-card-admin"><img src="${esc(x.public_url||"")}" alt="${esc(x.title||"Foto da célula")}" onerror="this.style.display='none'"/><div class="media-card-admin-body"><strong>${esc(x.title||x.event_name||"Foto da célula")}</strong><small>${x.status==="published"?"Publicada":"Rascunho"} · ${dateTimeBR(x.created_at)}</small><button data-unlink-media="${esc(x.id)}">Desvincular desta célula</button></div></article>`).join("");
    return `<div class="entity-toolbar"><div><h3>Fotos da célula</h3><p>Vincule fotos já enviadas pela equipe de Mídia. O vínculo não altera a publicação da foto.</p></div><button id="link-media" class="btn btn-primary"><span data-lucide="link"></span> Vincular foto existente</button></div><div class="media-grid-admin">${cards||empty("images","Nenhuma foto vinculada","A Mídia pode enviar a foto e depois ela é vinculada à célula.")}</div>`;
  }

  function empty(icon,title,text){return `<div class="module-empty"><span data-lucide="${icon}"></span><h4>${esc(title)}</h4><p>${esc(text)}</p></div>`}

  function bindDetail(){
    $$(".cell-tab").forEach(b=>b.addEventListener("click",()=>{state.tab=b.dataset.cellTab;renderDetail()}));
    $("#cell-overview-form")?.addEventListener("submit",saveOverview);
    $("#add-cell-member")?.addEventListener("click",()=>cellMemberForm());
    $("#assign-interest")?.addEventListener("click",()=>interestAssignForm());
    $("#add-meeting")?.addEventListener("click",()=>meetingForm());
    $("#link-media")?.addEventListener("click",()=>mediaLinkForm());
    $("#cell-panel-members")?.addEventListener("click",e=>{const ed=e.target.closest("[data-edit-cell-member]"),rm=e.target.closest("[data-remove-cell-member]");if(ed)cellMemberForm(state.cellMembers.find(x=>String(x.id)===String(ed.dataset.editCellMember)));if(rm)removeCellMember(rm.dataset.removeCellMember)});
    $("#cell-panel-interests")?.addEventListener("click",e=>{const ed=e.target.closest("[data-edit-cell-interest]"),rm=e.target.closest("[data-unassign-interest]");if(ed)interestEditForm(state.interests.find(x=>String(x.id)===String(ed.dataset.editCellInterest)));if(rm)unassignInterest(rm.dataset.unassignInterest)});
    $("#cell-panel-meetings")?.addEventListener("click",e=>{const ed=e.target.closest("[data-edit-meeting]"),rm=e.target.closest("[data-delete-meeting]");if(ed)meetingForm(state.meetings.find(x=>String(x.id)===String(ed.dataset.editMeeting)));if(rm)deleteMeeting(rm.dataset.deleteMeeting)});
    $("#cell-panel-media")?.addEventListener("click",e=>{const x=e.target.closest("[data-unlink-media]");if(x)unlinkMedia(x.dataset.unlinkMedia)});
  }

  async function saveOverview(e){
    e.preventDefault();const c=selected();if(!c)return;
    try{
      const payload={leader_member_id:$("#ov-leader").value||null,vice_leader_member_id:$("#ov-vice").value||null,host_member_id:$("#ov-host").value||null,started_at:$("#ov-started").value||null,internal_weekday:$("#ov-weekday").value===""?null:Number($("#ov-weekday").value),internal_meeting_time:$("#ov-time").value||null,internal_address:$("#ov-address").value.trim()||null,internal_neighborhood:$("#ov-neighborhood").value.trim()||null,max_people:$("#ov-max").value===""?null:Number($("#ov-max").value),internal_city:$("#ov-city").value.trim()||null,internal_state:$("#ov-state").value.trim().toUpperCase()||null,internal_status:$("#ov-status").value,internal_notes:$("#ov-notes").value.trim()||null};
      const {error}=await sb.from("pibr_cells").update(payload).eq("id",c.id);if(error)throw error;
      toast("Dados internos da célula salvos.","success");await loadData();
    }catch(err){console.error(err);toast(err.message||"Não foi possível salvar.","error")}
  }

  function openModal(title,body){$("#cell-modal-title").textContent=title;$("#cell-modal-body").innerHTML=body;show($("#cell-modal"));icons();$$("[data-close-cell-modal]",$("#cell-modal-body")).forEach(x=>x.addEventListener("click",closeModal))}
  function closeModal(){hide($("#cell-modal"))}

  function newCellForm(){
    openModal("Nova célula interna",`<form id="new-cell-form" class="module-form"><div class="module-form-grid"><label class="full"><span>Nome interno *</span><input id="new-cell-name" required placeholder="Ex.: Célula Morumbi 2"/></label><label><span>Líder administrativo</span><select id="new-cell-leader"><option value="">Nenhum</option>${memberOptions()}</select></label><label><span>Vice-líder</span><select id="new-cell-vice"><option value="">Nenhum</option>${memberOptions()}</select></label><label><span>Dia real</span><select id="new-cell-weekday"><option value="">Não definido</option>${weekdays.map((w,i)=>`<option value="${i}">${w}</option>`).join("")}</select></label><label><span>Horário</span><input id="new-cell-time" type="time"/></label><label class="full"><span>Endereço interno</span><input id="new-cell-address"/></label><label><span>Bairro</span><input id="new-cell-neighborhood"/></label><label><span>Capacidade estimada</span><input id="new-cell-max" type="number" min="0"/></label><label class="full"><span>Observações internas</span><textarea id="new-cell-notes" rows="4"></textarea></label></div><div class="modal-info">A nova célula será criada como <strong>não publicada</strong>. Ela só poderá aparecer no site futuramente pela área de Manutenção.</div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-cell-modal>Cancelar</button><button class="btn btn-primary" type="submit">Criar célula</button></div></form>`);
    $("#new-cell-form").addEventListener("submit",async e=>{e.preventDefault();try{const payload={name:$("#new-cell-name").value.trim(),leader_member_id:$("#new-cell-leader").value||null,vice_leader_member_id:$("#new-cell-vice").value||null,internal_weekday:$("#new-cell-weekday").value===""?null:Number($("#new-cell-weekday").value),internal_meeting_time:$("#new-cell-time").value||null,internal_address:$("#new-cell-address").value.trim()||null,internal_neighborhood:$("#new-cell-neighborhood").value.trim()||null,max_people:$("#new-cell-max").value===""?null:Number($("#new-cell-max").value),internal_notes:$("#new-cell-notes").value.trim()||null,internal_status:"active",is_published:false,is_active:true,city:"Paranavaí",state:"PR"};const {data,error}=await sb.from("pibr_cells").insert(payload).select("id").single();if(error)throw error;state.selectedId=data.id;state.tab="overview";closeModal();toast("Célula interna criada.","success");await loadData()}catch(err){toast(err.message||"Não foi possível criar.","error")}})
  }

  function cellMemberForm(rel=null){
    const used=new Set(cellMembers().map(x=>String(x.member_id)));if(rel)used.delete(String(rel.member_id));
    const options=state.members.filter(m=>m.membership_status==="active"&&!used.has(String(m.id))).map(m=>`<option value="${esc(m.id)}" ${String(rel?.member_id)===String(m.id)?"selected":""}>${esc(m.full_name)}</option>`).join("");
    openModal(rel?"Editar participante":"Adicionar participante",`<form id="cell-member-form" class="module-form"><div class="module-form-grid"><label class="full"><span>Pessoa *</span><select id="cm-member" required><option value="">Selecione...</option>${options}</select></label><label><span>Função na célula</span><input id="cm-role" value="${esc(rel?.role_name||"")}" placeholder="Ex.: Participante, anfitrião"/></label><label><span>Data de entrada</span><input id="cm-joined" type="date" value="${esc(rel?.joined_at||"")}"/></label><label><span>Status</span><select id="cm-status"><option value="active" ${rel?.status!=="inactive"?"selected":""}>Ativo</option><option value="inactive" ${rel?.status==="inactive"?"selected":""}>Inativo</option></select></label><label class="full"><span>Observações</span><textarea id="cm-notes" rows="3">${esc(rel?.notes||"")}</textarea></label></div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-cell-modal>Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div></form>`);
    $("#cell-member-form").addEventListener("submit",async e=>{e.preventDefault();try{const payload={cell_id:state.selectedId,member_id:$("#cm-member").value,role_name:$("#cm-role").value.trim()||null,joined_at:$("#cm-joined").value||null,status:$("#cm-status").value,notes:$("#cm-notes").value.trim()||null};const q=rel?sb.from("pibr_cell_members").update(payload).eq("id",rel.id):sb.from("pibr_cell_members").insert(payload);const {error}=await q;if(error)throw error;closeModal();toast("Participantes atualizados.","success");await loadData()}catch(err){toast(err.message||"Não foi possível salvar.","error")}})
  }
  async function removeCellMember(id){if(!confirm("Remover esta pessoa da célula?"))return;const {error}=await sb.from("pibr_cell_members").delete().eq("id",id);if(error)return toast(error.message,"error");toast("Participante removido.","success");await loadData()}

  function interestAssignForm(){
    const available=state.interests.filter(i=>String(i.assigned_cell_id)!==String(state.selectedId)&&i.status!=="integrated"&&i.status!=="archived");
    openModal("Encaminhar interessado",`<form id="assign-interest-form" class="module-form"><div class="module-form-grid"><label class="full"><span>Interessado *</span><select id="assign-interest-id" required><option value="">Selecione...</option>${available.map(i=>`<option value="${esc(i.id)}">${esc(i.full_name||"Sem nome")} · ${esc(i.location_text||i.phone||"")}</option>`).join("")}</select></label><label class="full"><span>Observação</span><textarea id="assign-interest-notes" rows="3" placeholder="Ex.: Líder fará contato amanhã"></textarea></label></div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-cell-modal>Cancelar</button><button class="btn btn-primary" type="submit">Encaminhar</button></div></form>`);
    $("#assign-interest-form").addEventListener("submit",async e=>{e.preventDefault();try{const id=$("#assign-interest-id").value,item=state.interests.find(x=>String(x.id)===String(id));const note=$("#assign-interest-notes").value.trim(),notes=[item?.notes,note].filter(Boolean).join("\n");const {error}=await sb.from("pibr_cell_interests").update({assigned_cell_id:state.selectedId,status:"referred",notes:notes||null}).eq("id",id);if(error)throw error;closeModal();toast("Interessado encaminhado para a célula.","success");await loadData()}catch(err){toast(err.message||"Não foi possível encaminhar.","error")}})
  }

  function interestEditForm(item){
    if(!item)return;
    openModal("Atualizar interessado",`<form id="edit-interest-form" class="module-form"><div class="module-form-grid"><label class="full"><span>Pessoa</span><input value="${esc(item.full_name||"")}" disabled/></label><label><span>Status</span><select id="edit-interest-status"><option value="new" ${item.status==="new"?"selected":""}>Novo</option><option value="contacted" ${item.status==="contacted"?"selected":""}>Contatado</option><option value="referred" ${item.status==="referred"?"selected":""}>Encaminhado</option><option value="integrated" ${item.status==="integrated"?"selected":""}>Integrado</option><option value="archived" ${item.status==="archived"?"selected":""}>Arquivado</option></select></label><label class="full"><span>Observações</span><textarea id="edit-interest-notes" rows="4">${esc(item.notes||"")}</textarea></label></div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-cell-modal>Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div></form>`);
    $("#edit-interest-form").addEventListener("submit",async e=>{e.preventDefault();try{const {error}=await sb.from("pibr_cell_interests").update({status:$("#edit-interest-status").value,notes:$("#edit-interest-notes").value.trim()||null}).eq("id",item.id);if(error)throw error;closeModal();toast("Interessado atualizado.","success");await loadData()}catch(err){toast(err.message||"Não foi possível salvar.","error")}})
  }
  async function unassignInterest(id){if(!confirm("Retirar este interessado desta célula?"))return;const {error}=await sb.from("pibr_cell_interests").update({assigned_cell_id:null,status:"contacted"}).eq("id",id);if(error)return toast(error.message,"error");toast("Encaminhamento removido.","success");await loadData()}

  function meetingForm(meeting=null){
    openModal(meeting?"Editar encontro":"Registrar encontro",`<form id="meeting-form" class="module-form"><div class="module-form-grid"><label><span>Data *</span><input id="meet-date" type="date" required value="${esc(meeting?.meeting_date||new Date().toISOString().slice(0,10))}"/></label><label><span>Participantes</span><input id="meet-attendees" type="number" min="0" value="${meeting?.attendees_count??0}"/></label><label><span>Visitantes</span><input id="meet-visitors" type="number" min="0" value="${meeting?.visitors_count??0}"/></label><label><span>Decisões / conversões</span><input id="meet-decisions" type="number" min="0" value="${meeting?.decisions_count??0}"/></label><label class="full"><span>Resumo / observações</span><textarea id="meet-notes" rows="4">${esc(meeting?.notes||"")}</textarea></label></div><div class="modal-info">Registramos somente o resumo do encontro. Não estamos criando controle individual de presença.</div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-cell-modal>Cancelar</button><button class="btn btn-primary" type="submit">Salvar encontro</button></div></form>`);
    $("#meeting-form").addEventListener("submit",async e=>{e.preventDefault();try{const payload={cell_id:state.selectedId,meeting_date:$("#meet-date").value,attendees_count:Number($("#meet-attendees").value||0),visitors_count:Number($("#meet-visitors").value||0),decisions_count:Number($("#meet-decisions").value||0),notes:$("#meet-notes").value.trim()||null};const q=meeting?sb.from("pibr_cell_meetings").update(payload).eq("id",meeting.id):sb.from("pibr_cell_meetings").insert(payload);const {error}=await q;if(error)throw error;closeModal();toast("Encontro registrado.","success");await loadData()}catch(err){toast(err.message||"Não foi possível salvar.","error")}})
  }
  async function deleteMeeting(id){if(!confirm("Excluir este registro de encontro?"))return;const {error}=await sb.from("pibr_cell_meetings").delete().eq("id",id);if(error)return toast(error.message,"error");toast("Registro excluído.","success");await loadData()}

  function mediaLinkForm(){
    const unlinked=state.media.filter(x=>String(x.cell_id)!==String(state.selectedId));
    openModal("Vincular foto existente",`<form id="media-link-form" class="module-form"><div class="module-form-grid"><label class="full"><span>Foto / mídia *</span><select id="media-link-id" required><option value="">Selecione...</option>${unlinked.map(x=>`<option value="${esc(x.id)}">${esc(x.title||x.event_name||"Mídia")} · ${x.status==="published"?"Publicada":"Rascunho"}</option>`).join("")}</select></label></div><div class="modal-info">Vincular a foto à célula apenas organiza o acervo. A publicação continua sendo controlada pela equipe de Mídia.</div><div class="module-form-actions"><button type="button" class="btn btn-secondary" data-close-cell-modal>Cancelar</button><button class="btn btn-primary" type="submit">Vincular</button></div></form>`);
    $("#media-link-form").addEventListener("submit",async e=>{e.preventDefault();try{const {error}=await sb.from("pibr_media_items").update({cell_id:state.selectedId,media_category:"celula"}).eq("id",$("#media-link-id").value);if(error)throw error;closeModal();toast("Foto vinculada à célula.","success");await loadData()}catch(err){toast(err.message||"Não foi possível vincular.","error")}})
  }
  async function unlinkMedia(id){const {error}=await sb.from("pibr_media_items").update({cell_id:null}).eq("id",id);if(error)return toast(error.message,"error");toast("Foto desvinculada.","success");await loadData()}

  function bindGlobal(){
    $("#new-cell").addEventListener("click",newCellForm);
    $("#cell-search").addEventListener("input",renderList);
    $("#cell-list").addEventListener("click",e=>{const b=e.target.closest("[data-select-cell]");if(b){state.selectedId=b.dataset.selectCell;state.tab="overview";renderList();renderDetail()}});
    $$("[data-close-cell-modal]").forEach(x=>x.addEventListener("click",closeModal));
    $("#cells-logout").addEventListener("click",async()=>{await sb.auth.signOut();location.href="index.html"});
    $("#cells-sidebar-open").addEventListener("click",()=>{$("#cells-sidebar").classList.add("open");show($("#cells-sidebar-overlay"))});
    $("#cells-sidebar-close").addEventListener("click",()=>{$("#cells-sidebar").classList.remove("open");hide($("#cells-sidebar-overlay"))});
    $("#cells-sidebar-overlay").addEventListener("click",()=>{$("#cells-sidebar").classList.remove("open");hide($("#cells-sidebar-overlay"))});
  }

  function renderAll(){renderOverallStats();renderList();renderDetail();icons()}

  async function init(){
    icons();
    try{const admin=await ensureAdmin();hide($("#cells-loading"));if(!admin){show($("#cells-denied"));icons();return}bindGlobal();await loadData();show($("#cells-app"));icons()}
    catch(err){console.error(err);hide($("#cells-loading"));show($("#cells-denied"));$("#cells-denied p").textContent=err.message||"Não foi possível carregar as células.";icons()}
  }
  init();
})();