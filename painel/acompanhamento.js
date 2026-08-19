(() => {
  "use strict";
  const cfg=window.PIBR_CONFIG||{}, configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase);
  const sb=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const norm=v=>String(v||"").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const initials=name=>String(name||"PIBR").trim().split(/\s+/).slice(0,2).map(v=>v[0]).join("").toUpperCase();
  const dtLocal=v=>{if(!v)return "";const d=new Date(v),p=n=>String(n).padStart(2,"0");return Number.isNaN(d.getTime())?"":`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`};
  const dtBR=v=>v?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(v)):"—";
  const state={user:null,stages:[],journeys:[],history:[],members:[],visitors:[],cells:[],dueOnly:false};

  function icons(){if(window.lucide)window.lucide.createIcons()}
  function show(el){el?.classList.remove("hidden")} function hide(el){el?.classList.add("hidden")}
  function toast(message,type=""){const el=document.createElement("div");el.className=`toast ${type}`.trim();el.innerHTML=`<span data-lucide="${type==="error"?"circle-alert":type==="success"?"circle-check":"info"}"></span><span>${esc(message)}</span>`;$("#toast-root").appendChild(el);icons();setTimeout(()=>el.remove(),3800)}
  function stage(id){return state.stages.find(s=>String(s.id)===String(id))||null}
  function cell(id){return state.cells.find(c=>String(c.id)===String(id))||null}
  function member(id){return state.members.find(m=>String(m.id)===String(id))||null}
  function visitor(id){return state.visitors.find(v=>String(v.id)===String(id))||null}
  function person(j){if(j.member_id){const m=member(j.member_id);return{type:"member",id:j.member_id,name:m?.full_name||"Membro não encontrado",phone:m?.phone||"",email:m?.email||"",photo:m?.photo_url||""}}const v=visitor(j.visitor_id);return{type:"visitor",id:j.visitor_id,name:v?.full_name||"Visitante não encontrado",phone:v?.phone||"",email:v?.email||"",photo:""}}
  function ownerName(id){return member(id)?.full_name||"Sem responsável"}
  function isOverdue(j){return Boolean(j.next_contact_at&&new Date(j.next_contact_at)<new Date()&&j.status==="active")}
  function dueSoon(j){if(!j.next_contact_at||j.status!=="active")return false;const d=new Date(j.next_contact_at)-new Date();return d>=0&&d<=172800000}
  function statusLabel(s){return{active:"Em andamento",paused:"Pausado",completed:"Concluído",archived:"Arquivado"}[s]||s}
  function actionLabel(t){return{created:"Acompanhamento iniciado",stage_change:"Etapa alterada",note:"Observação",contact:"Contato registrado",assignment:"Responsável alterado",status_change:"Status alterado"}[t]||t}

  async function ensureAdmin(){
    if(!configured)throw new Error("Supabase não configurado.");
    const {data:{session},error}=await sb.auth.getSession();if(error)throw error;
    if(!session){location.href="index.html";return false}
    state.user=session.user;
    const {data:roles,error:re}=await sb.from("pibr_user_roles").select("role").eq("user_id",session.user.id);if(re)throw re;
    if(!(roles||[]).some(r=>r.role==="admin"))return false;
    const {data:profile}=await sb.from("profiles").select("full_name").eq("id",session.user.id).maybeSingle();
    const name=profile?.full_name||session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"Administrador";
    $("#journey-profile-name").textContent=name;$("#journey-avatar").textContent=initials(name);return true;
  }

  async function loadData(){
    const qs=await Promise.all([
      sb.from("pibr_journey_stages").select("*").order("sort_order",{ascending:true}),
      sb.from("pibr_person_journeys").select("*").order("updated_at",{ascending:false}),
      sb.from("pibr_journey_history").select("*").order("created_at",{ascending:false}),
      sb.from("pibr_members").select("id,full_name,photo_url,email,phone,category,membership_status").order("full_name",{ascending:true}),
      sb.from("pibr_visitors").select("id,full_name,phone,email,status,first_visit_date").order("created_at",{ascending:false}),
      sb.from("pibr_cells").select("id,name,internal_status,is_active").order("name",{ascending:true})
    ]);
    for(const q of qs)if(q.error)throw q.error;
    [state.stages,state.journeys,state.history,state.members,state.visitors,state.cells]=qs.map(q=>q.data||[]);
    renderResponsibleFilter();renderAll();
  }

  function renderResponsibleFilter(){
    const current=$("#journey-responsible-filter").value;
    $("#journey-responsible-filter").innerHTML='<option value="">Todos os responsáveis</option>'+state.members.filter(m=>m.membership_status==="active").map(m=>`<option value="${esc(m.id)}">${esc(m.full_name)}</option>`).join("");
    $("#journey-responsible-filter").value=current;
  }
  function filteredJourneys(){
    const q=norm($("#journey-search").value),status=$("#journey-status-filter").value,responsible=$("#journey-responsible-filter").value;
    return state.journeys.filter(j=>{const p=person(j),hay=norm([p.name,p.phone,p.email,j.next_action,j.notes,ownerName(j.assigned_leader_member_id)].join(" "));return(!q||hay.includes(q))&&(!status||j.status===status)&&(!responsible||String(j.assigned_leader_member_id)===String(responsible))&&(!state.dueOnly||isOverdue(j)||dueSoon(j))});
  }
  function renderStats(){
    const active=state.journeys.filter(j=>j.status==="active").length, overdue=state.journeys.filter(isOverdue).length, high=state.journeys.filter(j=>j.status==="active"&&j.priority==="high").length, completed=state.journeys.filter(j=>j.status==="completed").length;
    const stats=[["Em acompanhamento",active,"route","Pessoas ativas"],["Contato atrasado",overdue,"alarm-clock","Precisam de atenção"],["Alta prioridade",high,"circle-alert","Marcados como prioritários"],["Concluídos",completed,"circle-check","Histórico preservado"]];
    $("#journey-stats").innerHTML=stats.map(([l,v,i,s])=>`<article class="journey-stat"><div class="journey-stat-head"><span>${esc(l)}</span><span class="journey-stat-icon" data-lucide="${i}"></span></div><strong>${v}</strong><small>${esc(s)}</small></article>`).join("");
  }
  function renderBoard(){
    const js=filteredJourneys(),visibleStages=state.stages.filter(s=>s.is_active!==false);
    $("#journey-board").innerHTML=visibleStages.map(s=>{const items=js.filter(j=>String(j.current_stage_id)===String(s.id));return`<section class="journey-column"><div class="journey-column-head"><div class="journey-column-title"><strong>${esc(s.title)}</strong><span class="journey-column-count">${items.length}</span></div><p>${esc(s.description||"")}</p></div><div class="journey-column-body">${items.length?items.map(j=>journeyCard(j)).join(""):'<div class="column-empty">Nenhuma pessoa nesta etapa.</div>'}</div></section>`}).join("");icons();
  }
  function journeyCard(j){
    const p=person(j),photo=p.photo?`<img src="${esc(p.photo)}" alt="">`:esc(initials(p.name)),due=isOverdue(j);
    return`<button class="journey-card" data-open-journey="${esc(j.id)}"><div class="journey-card-top"><div class="journey-person"><div class="journey-avatar">${photo}</div><div class="journey-person-copy"><strong>${esc(p.name)}</strong><small>${esc(p.phone||p.email||"Sem contato")}</small></div></div><i class="priority-dot ${esc(j.priority)}"></i></div><div class="journey-next"><strong>Próxima ação</strong><span>${esc(j.next_action||"Definir próximo passo")}</span><span class="journey-next-date ${due?"overdue":""}"><span data-lucide="${due?"alarm-clock":"calendar-clock"}"></span>${esc(j.next_contact_at?dtBR(j.next_contact_at):"Sem data definida")}</span></div><div class="journey-card-footer"><span class="journey-owner">${esc(ownerName(j.assigned_leader_member_id))}</span><span class="journey-type">${p.type==="visitor"?"Visitante":"Membros"}</span></div></button>`;
  }
  function renderAll(){renderStats();renderBoard();icons()}

  function openModal(title,body,eyebrow="ACOMPANHAMENTO"){$("#journey-modal-title").textContent=title;$("#journey-modal-eyebrow").textContent=eyebrow;$("#journey-modal-body").innerHTML=body;show($("#journey-modal"));icons();$$("[data-close-journey-modal]",$("#journey-modal-body")).forEach(x=>x.addEventListener("click",closeModal))}
  function closeModal(){hide($("#journey-modal"))}
  function availablePeople(type){
    const usedM=new Set(state.journeys.filter(j=>j.member_id&&j.status!=="archived").map(j=>String(j.member_id))),usedV=new Set(state.journeys.filter(j=>j.visitor_id&&j.status!=="archived").map(j=>String(j.visitor_id)));
    return type==="member"?state.members.filter(m=>m.membership_status==="active"&&!usedM.has(String(m.id))).map(m=>({id:m.id,name:m.full_name,info:m.phone||m.email||"Membros"})):state.visitors.filter(v=>!usedV.has(String(v.id))).map(v=>({id:v.id,name:v.full_name,info:v.phone||v.email||"Visitante"}));
  }
  function stageOptions(id){return state.stages.filter(s=>s.is_active!==false).map(s=>`<option value="${esc(s.id)}" ${String(s.id)===String(id)?"selected":""}>${esc(s.title)}</option>`).join("")}
  function ownerOptions(id){return state.members.filter(m=>m.membership_status==="active").map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(id)?"selected":""}>${esc(m.full_name)}</option>`).join("")}
  function cellOptions(id){return state.cells.filter(c=>c.internal_status!=="closed").map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(id)?"selected":""}>${esc(c.name)}</option>`).join("")}

  function newJourneyForm(){
    const first=state.stages.find(s=>s.code==="first_contact")||state.stages[0];
    openModal("Novo acompanhamento",`<form id="new-journey-form" class="journey-form"><div class="journey-form-grid"><label><span>Origem da pessoa *</span><select id="nj-type"><option value="visitor">Visitante</option><option value="member">Membros</option></select></label><label><span>Pessoa *</span><select id="nj-person" required></select></label><label><span>Etapa inicial *</span><select id="nj-stage" required>${stageOptions(first?.id)}</select></label><label><span>Responsável</span><select id="nj-owner"><option value="">Sem responsável</option>${ownerOptions()}</select></label><label><span>Célula relacionada</span><select id="nj-cell"><option value="">Nenhuma</option>${cellOptions()}</select></label><label><span>Prioridade</span><select id="nj-priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="low">Baixa</option></select></label><label class="full"><span>Próxima ação</span><input id="nj-action" placeholder="Ex.: Ligar, convidar para célula, confirmar visita..."></label><label class="full"><span>Data do próximo contato</span><input id="nj-next" type="datetime-local"></label><label class="full"><span>Observações iniciais</span><textarea id="nj-notes" rows="4"></textarea></label></div><div class="journey-form-actions"><button type="button" class="btn btn-secondary" data-close-journey-modal>Cancelar</button><button class="btn btn-primary" type="submit"><span data-lucide="save"></span> Iniciar acompanhamento</button></div></form>`);
    const refresh=()=>{$("#nj-person").innerHTML='<option value="">Selecione...</option>'+availablePeople($("#nj-type").value).map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.info)}</option>`).join("")};$("#nj-type").addEventListener("change",refresh);refresh();$("#new-journey-form").addEventListener("submit",saveNewJourney);
  }
  async function saveNewJourney(e){
    e.preventDefault();
    try{const type=$("#nj-type").value,pid=$("#nj-person").value;if(!pid)throw new Error("Selecione uma pessoa.");const payload={member_id:type==="member"?pid:null,visitor_id:type==="visitor"?pid:null,current_stage_id:$("#nj-stage").value,assigned_leader_member_id:$("#nj-owner").value||null,assigned_cell_id:$("#nj-cell").value||null,next_action:$("#nj-action").value.trim()||null,next_contact_at:$("#nj-next").value?new Date($("#nj-next").value).toISOString():null,priority:$("#nj-priority").value,status:"active",notes:$("#nj-notes").value.trim()||null};const {data,error}=await sb.from("pibr_person_journeys").insert(payload).select("id").single();if(error)throw error;const p=type==="member"?member(pid):visitor(pid);const {error:he}=await sb.from("pibr_journey_history").insert({journey_id:data.id,to_stage_id:payload.current_stage_id,action_type:"created",note:`Acompanhamento iniciado para ${p?.full_name||"pessoa"}.`});if(he)throw he;closeModal();toast("Acompanhamento iniciado.","success");await loadData()}catch(err){console.error(err);toast(err.message||"Não foi possível iniciar.","error")}
  }

  function journeyHistory(id){return state.history.filter(h=>String(h.journey_id)===String(id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))}
  function historyText(h){return h.action_type==="stage_change"?`${stage(h.from_stage_id)?.title||"Etapa anterior"} → ${stage(h.to_stage_id)?.title||"Nova etapa"}${h.note?` · ${h.note}`:""}`:(h.note||actionLabel(h.action_type))}
  function openJourneyDetail(id){
    const j=state.journeys.find(x=>String(x.id)===String(id));if(!j)return;const p=person(j),hist=journeyHistory(j.id),photo=p.photo?`<img src="${esc(p.photo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:esc(initials(p.name));
    openModal(p.name,`<div class="person-preview"><div class="person-preview-avatar">${photo}</div><div><strong>${esc(p.name)}</strong><small>${esc(p.phone||p.email||"Sem contato")} · ${p.type==="visitor"?"Visitante":"Membros"}</small></div></div><div class="journey-detail-grid"><section class="journey-edit-card"><div class="detail-card-head"><h3>Plano de acompanhamento</h3><span class="journey-type">${esc(statusLabel(j.status))}</span></div><div class="journey-edit-body"><form id="journey-detail-form"><div class="journey-form-grid"><label><span>Etapa atual</span><select id="jd-stage">${stageOptions(j.current_stage_id)}</select></label><label><span>Responsável</span><select id="jd-owner"><option value="">Sem responsável</option>${ownerOptions(j.assigned_leader_member_id)}</select></label><label><span>Célula relacionada</span><select id="jd-cell"><option value="">Nenhuma</option>${cellOptions(j.assigned_cell_id)}</select></label><label><span>Prioridade</span><select id="jd-priority"><option value="normal" ${j.priority==="normal"?"selected":""}>Normal</option><option value="high" ${j.priority==="high"?"selected":""}>Alta</option><option value="low" ${j.priority==="low"?"selected":""}>Baixa</option></select></label><label class="full"><span>Próxima ação</span><input id="jd-action" value="${esc(j.next_action||"")}"></label><label class="full"><span>Próximo contato</span><input id="jd-next" type="datetime-local" value="${esc(dtLocal(j.next_contact_at))}"></label><label><span>Status</span><select id="jd-status"><option value="active" ${j.status==="active"?"selected":""}>Em andamento</option><option value="paused" ${j.status==="paused"?"selected":""}>Pausado</option><option value="completed" ${j.status==="completed"?"selected":""}>Concluído</option><option value="archived" ${j.status==="archived"?"selected":""}>Arquivado</option></select></label><label><span>Iniciado em</span><input value="${esc(dtBR(j.started_at))}" disabled></label><label class="full"><span>Observações gerais</span><textarea id="jd-notes" rows="4">${esc(j.notes||"")}</textarea></label></div></form></div><div class="detail-actions"><button id="save-journey-detail" class="btn btn-primary"><span data-lucide="save"></span> Salvar alterações</button><button id="register-contact" class="btn btn-secondary"><span data-lucide="phone-call"></span> Registrar contato</button><button id="add-history-note" class="btn btn-secondary"><span data-lucide="message-square-plus"></span> Observação</button></div></section><aside class="history-card"><div class="detail-card-head"><h3>Histórico</h3><span class="journey-type">${hist.length} registro(s)</span></div><div class="history-list">${hist.length?hist.map(h=>`<div class="history-item"><i class="history-dot"></i><strong>${esc(actionLabel(h.action_type))}</strong><p>${esc(historyText(h))}</p><small>${esc(dtBR(h.created_at))}</small></div>`).join(""):'<div class="history-empty">Nenhum histórico registrado.</div>'}</div></aside></div>`);
    $("#save-journey-detail").addEventListener("click",()=>saveJourneyDetail(j));$("#register-contact").addEventListener("click",()=>quickHistoryForm(j,"contact","Registrar contato","Descreva resumidamente o contato realizado."));$("#add-history-note").addEventListener("click",()=>quickHistoryForm(j,"note","Adicionar observação","Registre uma informação importante."));
  }

  async function saveJourneyDetail(j){
    try{const oldStage=j.current_stage_id,oldOwner=j.assigned_leader_member_id,oldStatus=j.status,newStage=$("#jd-stage").value,newOwner=$("#jd-owner").value||null,newStatus=$("#jd-status").value;const payload={current_stage_id:newStage,assigned_leader_member_id:newOwner,assigned_cell_id:$("#jd-cell").value||null,priority:$("#jd-priority").value,next_action:$("#jd-action").value.trim()||null,next_contact_at:$("#jd-next").value?new Date($("#jd-next").value).toISOString():null,status:newStatus,notes:$("#jd-notes").value.trim()||null,completed_at:newStatus==="completed"?(j.completed_at||new Date().toISOString()):null};const {error}=await sb.from("pibr_person_journeys").update(payload).eq("id",j.id);if(error)throw error;const logs=[];if(String(oldStage)!==String(newStage))logs.push({journey_id:j.id,from_stage_id:oldStage,to_stage_id:newStage,action_type:"stage_change"});if(String(oldOwner||"")!==String(newOwner||""))logs.push({journey_id:j.id,action_type:"assignment",note:`Responsável: ${ownerName(newOwner)}.`});if(oldStatus!==newStatus)logs.push({journey_id:j.id,action_type:"status_change",note:`Status alterado para ${statusLabel(newStatus)}.`});if(logs.length){const {error:he}=await sb.from("pibr_journey_history").insert(logs);if(he)throw he}closeModal();toast("Acompanhamento atualizado.","success");await loadData()}catch(err){console.error(err);toast(err.message||"Não foi possível salvar.","error")}
  }

  function quickHistoryForm(j,type,title,placeholder){
    openModal(title,`<form id="quick-history-form" class="journey-form"><div class="journey-form-grid"><label class="full"><span>${type==="contact"?"Resumo do contato":"Observação"} *</span><textarea id="qh-note" rows="5" required placeholder="${esc(placeholder)}"></textarea></label>${type==="contact"?'<label class="full"><span>Próxima ação (opcional)</span><input id="qh-next-action"></label><label class="full"><span>Próximo contato (opcional)</span><input id="qh-next-date" type="datetime-local"></label>':""}</div><div class="journey-form-actions"><button type="button" class="btn btn-secondary" data-close-journey-modal>Cancelar</button><button class="btn btn-primary" type="submit">Registrar</button></div></form>`,type==="contact"?"CONTATO":"HISTÓRICO");
    $("#quick-history-form").addEventListener("submit",async e=>{e.preventDefault();try{const note=$("#qh-note").value.trim();const {error}=await sb.from("pibr_journey_history").insert({journey_id:j.id,action_type:type,note});if(error)throw error;if(type==="contact"){const update={},a=$("#qh-next-action").value.trim(),d=$("#qh-next-date").value;if(a)update.next_action=a;if(d)update.next_contact_at=new Date(d).toISOString();if(Object.keys(update).length){const {error:ue}=await sb.from("pibr_person_journeys").update(update).eq("id",j.id);if(ue)throw ue}}closeModal();toast(type==="contact"?"Contato registrado.":"Observação adicionada.","success");await loadData()}catch(err){toast(err.message||"Não foi possível registrar.","error")}})
  }

  function stagesSettings(){
    openModal("Configurar etapas",`<div class="stage-settings"><div class="stage-settings-intro">Você pode renomear as etapas e ajustar a ordem. Isso continua sendo organização administrativa, não avaliação espiritual.</div><div class="stage-setting-list">${state.stages.map(s=>`<div class="stage-setting-row"><input class="stage-order" type="number" data-stage-order="${esc(s.id)}" value="${s.sort_order}" step="10"><input class="stage-title-input" data-stage-title="${esc(s.id)}" value="${esc(s.title)}"><small>${esc(s.code)}</small><button data-save-stage="${esc(s.id)}"><span data-lucide="save"></span></button></div>`).join("")}</div><div class="stage-modal-note">Para preservar históricos, as etapas padrão não são excluídas por esta tela. Você pode renomear e reordenar.</div></div>`);
    $("#journey-modal-body").addEventListener("click",async e=>{const btn=e.target.closest("[data-save-stage]");if(!btn)return;const id=btn.dataset.saveStage;try{const title=$(`[data-stage-title="${id}"]`).value.trim(),sort=Number($(`[data-stage-order="${id}"]`).value||0);if(!title)throw new Error("Informe o nome da etapa.");const {error}=await sb.from("pibr_journey_stages").update({title,sort_order:sort}).eq("id",id);if(error)throw error;toast("Etapa atualizada.","success");await loadData();stagesSettings()}catch(err){toast(err.message||"Não foi possível salvar.","error")}});
  }

  function bind(){
    $("#new-journey").addEventListener("click",newJourneyForm);$("#configure-stages").addEventListener("click",stagesSettings);
    ["journey-search","journey-status-filter","journey-responsible-filter"].forEach(id=>$("#"+id).addEventListener("input",renderBoard));
    $("#show-due-only").addEventListener("click",()=>{state.dueOnly=!state.dueOnly;$("#show-due-only").classList.toggle("active",state.dueOnly);renderBoard()});
    $("#journey-board").addEventListener("click",e=>{const card=e.target.closest("[data-open-journey]");if(card)openJourneyDetail(card.dataset.openJourney)});
    $$("[data-close-journey-modal]").forEach(x=>x.addEventListener("click",closeModal));
    $("#journey-logout").addEventListener("click",async()=>{await sb.auth.signOut();location.href="index.html"});
    $("#journey-sidebar-open").addEventListener("click",()=>{$("#journey-sidebar").classList.add("open");show($("#journey-sidebar-overlay"))});
    $("#journey-sidebar-close").addEventListener("click",()=>{$("#journey-sidebar").classList.remove("open");hide($("#journey-sidebar-overlay"))});
    $("#journey-sidebar-overlay").addEventListener("click",()=>{$("#journey-sidebar").classList.remove("open");hide($("#journey-sidebar-overlay"))});
  }
  async function init(){icons();try{const admin=await ensureAdmin();hide($("#journey-loading"));if(!admin){show($("#journey-denied"));icons();return}bind();await loadData();show($("#journey-app"));icons()}catch(err){console.error(err);hide($("#journey-loading"));show($("#journey-denied"));$("#journey-denied p").textContent=err.message||"Não foi possível carregar o acompanhamento.";icons()}}
  init();
})();