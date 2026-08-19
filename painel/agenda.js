(() => {
  "use strict";

  const cfg = window.PIBR_CONFIG || {};
  const ready = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const sb = ready ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const esc = (v="")=>String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const initials = name=>String(name||"PIBR").trim().split(/\s+/).slice(0,2).map(v=>v[0]).join("").toUpperCase();
  const pad = n=>String(n).padStart(2,"0");
  const ymd = d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const weekdays = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const monthFmt = new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"});
  const dateFmt = new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"});
  const dateLongFmt = new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});

  const state = {
    user:null,
    currentTab:"calendar",
    month:new Date(new Date().getFullYear(),new Date().getMonth(),1),
    services:[], variations:[], events:[], cells:[], scales:[], scaleMembers:[],
    ministries:[], members:[], editing:null, isMaintenance:false
  };

  function icons(){ if(window.lucide) window.lucide.createIcons(); }
  function show(el){ el?.classList.remove("hidden"); }
  function hide(el){ el?.classList.add("hidden"); }
  function toast(message,type=""){
    const el=document.createElement("div");
    el.className=`toast ${type}`.trim();
    el.innerHTML=`<span data-lucide="${type==="error"?"circle-alert":type==="success"?"circle-check":"info"}"></span><span>${esc(message)}</span>`;
    $("#toast-root").appendChild(el); icons(); setTimeout(()=>el.remove(),3800);
  }
  function time5(v){ return v ? String(v).slice(0,5) : "—"; }
  function isoDateFromTimestamp(v){ return v ? ymd(new Date(v)) : null; }
  function weekOfMonth(d){ return Math.floor((d.getDate()-1)/7)+1; }

  async function ensureAdmin(){
    if(!ready) throw new Error("Supabase não configurado.");
    const {data:{session},error}=await sb.auth.getSession();
    if(error) throw error;
    if(!session){ location.href="index.html"; return false; }
    state.user=session.user;
    const {data:roles,error:roleError}=await sb.from("pibr_user_roles").select("role").eq("user_id",session.user.id);
    if(roleError) throw roleError;
    state.isMaintenance=(roles||[]).some(r=>r.role==="maintenance");
    if(!(roles||[]).some(r=>r.role==="admin" || r.role==="maintenance")) return false;
    const {data:profile}=await sb.from("profiles").select("full_name").eq("id",session.user.id).maybeSingle();
    const name=profile?.full_name||session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"Administrador";
    $("#agenda-profile-name").textContent=name; $("#agenda-avatar").textContent=initials(name);
    return true;
  }

  async function loadData(){
    const queries = await Promise.all([
      sb.from("pibr_fixed_services").select("*").order("weekday",{ascending:true}).order("meeting_time",{ascending:true}),
      sb.from("pibr_fixed_service_variations").select("*"),
      sb.from("pibr_events").select("*").order("starts_at",{ascending:true}),
      sb.from("pibr_cells").select("id,name,weekday,meeting_time,neighborhood,address,is_active").eq("is_active",true),
      sb.from("pibr_ministry_scales").select("*").order("scale_date",{ascending:true}).order("start_time",{ascending:true}),
      sb.from("pibr_ministry_scale_members").select("*"),
      sb.from("pibr_ministries").select("id,name,is_active").order("name",{ascending:true}),
      sb.from("pibr_members").select("id,full_name,phone,category,membership_status").order("full_name",{ascending:true})
    ]);
    const [services,variations,events,cells,scales,scaleMembers,ministries,members]=queries;
    for(const q of queries) if(q.error) throw q.error;
    state.services=services.data||[];
    state.variations=variations.data||[];
    state.events=events.data||[];
    state.cells=cells.data||[];
    state.scales=scales.data||[];
    state.scaleMembers=scaleMembers.data||[];
    state.ministries=ministries.data||[];
    state.members=members.data||[];
    renderAll();
  }

  function setTab(tab){
    state.currentTab=tab;
    $$(".agenda-tab").forEach(btn=>btn.classList.toggle("active",btn.dataset.agendaTab===tab));
    $$(".agenda-section").forEach(sec=>sec.classList.remove("active"));
    $("#agenda-"+tab)?.classList.add("active");
    icons();
  }

  function itemsForDate(date){
    const key=ymd(date), w=date.getDay(), wom=weekOfMonth(date);
    const items=[];
    state.services.filter(s=>s.is_active!==false && Number(s.weekday)===w).forEach(s=>{
      const variation=state.variations.find(v=>String(v.fixed_service_id)===String(s.id) && Number(v.week_of_month)===wom && v.special_title);
      items.push({type:"service",id:s.id,title:variation?.special_title||s.title,time:time5(s.meeting_time),data:{...s,variation}});
    });
    state.cells.filter(c=>c.is_active!==false && Number(c.weekday)===w).forEach(c=>{
      items.push({type:"cell",id:c.id,title:c.name,time:time5(c.meeting_time),data:c});
    });
    state.events.filter(e=>isoDateFromTimestamp(e.starts_at)===key && e.status!=="archived").forEach(e=>{
      items.push({type:"event",id:e.id,title:e.title,time:new Date(e.starts_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),data:e});
    });
    state.scales.filter(s=>s.scale_date===key && s.status!=="cancelled").forEach(s=>{
      items.push({type:"scale",id:s.id,title:s.title,time:time5(s.start_time),data:s});
    });
    return items.sort((a,b)=>String(a.time).localeCompare(String(b.time)));
  }

  function renderCalendar(){
    $("#calendar-title").textContent=monthFmt.format(state.month).replace(/^./,c=>c.toUpperCase());
    const first=new Date(state.month.getFullYear(),state.month.getMonth(),1);
    const start=new Date(first); start.setDate(1-first.getDay());
    const today=ymd(new Date());
    const html=[];
    for(let i=0;i<42;i++){
      const d=new Date(start); d.setDate(start.getDate()+i);
      const outside=d.getMonth()!==state.month.getMonth();
      const items=itemsForDate(d);
      const visible=items.slice(0,4);
      html.push(`<div class="calendar-day ${outside?"outside":""} ${ymd(d)===today?"today":""}">
        <div class="calendar-day-number">${d.getDate()}</div>
        <div class="calendar-items">
          ${visible.map(item=>`<button class="calendar-item ${item.type}" data-calendar-type="${item.type}" data-calendar-id="${esc(item.id)}" data-calendar-date="${ymd(d)}">${esc(item.time)} · ${esc(item.title)}</button>`).join("")}
          ${items.length>4?`<div class="calendar-more">+${items.length-4} itens</div>`:""}
        </div>
      </div>`);
    }
    $("#calendar-grid").innerHTML=html.join("");
  }

  function renderServices(){
    const root=$("#services-list");
    if(!state.services.length){ root.innerHTML=empty("church","Nenhum culto fixo","Cadastre os cultos recorrentes da igreja."); return; }
    root.innerHTML=state.services.map(s=>{
      const vars=state.variations.filter(v=>String(v.fixed_service_id)===String(s.id) && v.special_title);
      return `<article class="agenda-card">
        <div class="agenda-card-top">
          <div><h4>${esc(s.title)}</h4><p>${esc(weekdays[Number(s.weekday)]||"—")} às ${esc(time5(s.meeting_time))}${s.location?` · ${esc(s.location)}`:""}</p></div>
          <div class="agenda-card-actions">
            <button data-edit-service="${esc(s.id)}" title="Editar"><span data-lucide="pencil"></span></button>
            <button class="danger" data-delete-service="${esc(s.id)}" title="Excluir"><span data-lucide="trash-2"></span></button>
          </div>
        </div>
        <div class="agenda-card-meta">
          <span class="mini-pill"><span data-lucide="repeat-2"></span>Semanal</span>
          <span class="mini-pill"><span data-lucide="calendar-range"></span>${vars.length} variação(ões)</span>
          <span class="mini-pill"><span data-lucide="${s.is_active===false?"circle-off":"circle-check"}"></span>${s.is_active===false?"Inativo":"Ativo"}</span>
        </div>
        ${vars.length?`<div class="variation-summary">${vars.map(v=>`${v.week_of_month}ª semana: <strong>${esc(v.special_title)}</strong>`).join("<br>")}</div>`:""}
      </article>`;
    }).join("");
  }

  function renderEvents(){
    const root=$("#special-events-list");
    if(!state.events.length){ root.innerHTML=empty("sparkles","Nenhum evento especial","Adicione conferências, encontros e outras datas."); return; }
    const now=new Date();
    const sorted=[...state.events].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
    root.innerHTML=sorted.map(e=>{
      const d=new Date(e.starts_at), location=e.location||"Local não informado";
      return `<article class="agenda-list-item">
        <div class="agenda-list-main"><strong>${esc(e.title)}</strong><small>${esc(e.description||"Evento especial")}</small></div>
        <div class="agenda-list-meta">${dateFmt.format(d)} · ${d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
        <div class="agenda-list-meta hide-tablet">${esc(location)}</div>
        <span class="agenda-status ${e.status}">${esc(e.status==="published"?"Publicado":e.status==="draft"?"Rascunho":"Arquivado")}</span>
        <div class="agenda-row-actions">
          <button data-edit-event="${esc(e.id)}"><span data-lucide="pencil"></span></button>
          <button class="danger" data-delete-event="${esc(e.id)}"><span data-lucide="trash-2"></span></button>
        </div>
      </article>`;
    }).join("");
  }

  function membersForScale(scaleId){
    return state.scaleMembers.filter(sm=>String(sm.scale_id)===String(scaleId)).map(sm=>({
      ...sm, member:state.members.find(m=>String(m.id)===String(sm.member_id))
    }));
  }

  function renderScales(){
    const root=$("#scales-list");
    if(!state.scales.length){ root.innerHTML=empty("users-round","Nenhuma escala cadastrada","Monte a primeira equipe de culto ou evento."); return; }
    root.innerHTML=state.scales.map(s=>{
      const ministry=state.ministries.find(m=>String(m.id)===String(s.ministry_id))?.name||"Sem ministério";
      const team=membersForScale(s.id);
      return `<article class="agenda-list-item">
        <div class="agenda-list-main"><strong>${esc(s.title)}</strong><small>${esc(ministry)}${s.group_name?` · ${esc(s.group_name)}`:""} · ${team.length} pessoa(s)</small></div>
        <div class="agenda-list-meta">${dateFmt.format(new Date(`${s.scale_date}T12:00:00`))} · ${esc(time5(s.start_time))}</div>
        <div class="agenda-list-meta hide-tablet">${team.slice(0,2).map(x=>esc(x.member?.full_name||"")).filter(Boolean).join(", ")}${team.length>2?` +${team.length-2}`:""}</div>
        <span class="agenda-status ${s.status}">${esc(s.status==="published"?"Publicada":s.status==="completed"?"Concluída":s.status==="cancelled"?"Cancelada":"Rascunho")}</span>
        <div class="agenda-row-actions">
          <button data-edit-scale="${esc(s.id)}"><span data-lucide="pencil"></span></button>
          <button class="danger" data-delete-scale="${esc(s.id)}"><span data-lucide="trash-2"></span></button>
        </div>
      </article>`;
    }).join("");
  }

  function renderAll(){ renderCalendar(); renderServices(); renderEvents(); renderScales(); icons(); }
  function empty(icon,title,text){ return `<div class="agenda-empty"><span data-lucide="${icon}"></span><h4>${esc(title)}</h4><p>${esc(text)}</p></div>`; }

  function openModal(title,eyebrow,body){
    $("#agenda-modal-title").textContent=title; $("#agenda-modal-eyebrow").textContent=eyebrow;
    $("#agenda-modal-body").innerHTML=body; show($("#agenda-modal")); icons();
  }
  function closeModal(){ hide($("#agenda-modal")); state.editing=null; }
  function field(id){ return $("#"+id)?.value?.trim()||null; }

  function serviceForm(service=null){
    const vars=service?state.variations.filter(v=>String(v.fixed_service_id)===String(service.id)):[];
    const v=n=>vars.find(x=>Number(x.week_of_month)===n)?.special_title||"";
    openModal(service?"Editar culto fixo":"Adicionar culto fixo","CULTOS FIXOS",`
      <form id="service-form" class="agenda-form">
        <div class="agenda-form-section">
          <div class="agenda-form-grid">
            <label class="full"><span>Nome do culto *</span><input id="service-title" required value="${esc(service?.title||"")}" placeholder="Ex.: Culto da Família" /></label>
            <label><span>Dia da semana *</span><select id="service-weekday">${weekdays.map((w,i)=>`<option value="${i}" ${Number(service?.weekday)===i?"selected":""}>${w}</option>`).join("")}</select></label>
            <label><span>Horário *</span><input id="service-time" type="time" required value="${esc(time5(service?.meeting_time).replace("—",""))}" /></label>
            <label class="full"><span>Local</span><input id="service-location" value="${esc(service?.location||"")}" placeholder="Ex.: Templo principal" /></label>
            <label class="full"><span>Descrição</span><textarea id="service-description" rows="3">${esc(service?.description||"")}</textarea></label>
            <label class="full"><span>Status</span><select id="service-active"><option value="true" ${service?.is_active!==false?"selected":""}>Ativo</option><option value="false" ${service?.is_active===false?"selected":""}>Inativo</option></select></label>
          </div>
        </div>
        <details class="variation-details" ${vars.some(x=>x.special_title)?"open":""}>
          <summary>
            <span><strong>Personalização por semana</strong><small>Opcional — use quando um domingo tiver um nome diferente, como Culto de Ceia.</small></span>
            <span data-lucide="chevron-down"></span>
          </summary>
          <div class="variation-grid">
            ${[1,2,3,4,5].map(n=>`<label class="variation-row"><span>${n}ª semana</span><input id="variation-${n}" value="${esc(v(n))}" placeholder="Nome especial (opcional)" /></label>`).join("")}
          </div>
        </details>
        <div class="agenda-form-actions"><button type="button" class="btn btn-secondary" data-close-agenda-modal>Cancelar</button><button class="btn btn-primary" type="submit"><span data-lucide="save"></span> Salvar culto</button></div>
      </form>`);
    $("#service-form").addEventListener("submit",e=>saveService(e,service?.id));
    $$("[data-close-agenda-modal]",$("#agenda-modal-body")).forEach(x=>x.addEventListener("click",closeModal));
  }

  async function saveService(e,id=null){
    e.preventDefault();
    try{
      const payload={title:field("service-title"),weekday:Number(field("service-weekday")),meeting_time:field("service-time"),location:field("service-location"),description:field("service-description"),is_active:field("service-active")==="true"};
      let serviceId=id;
      if(id){ const {error}=await sb.from("pibr_fixed_services").update(payload).eq("id",id); if(error) throw error; }
      else { const {data,error}=await sb.from("pibr_fixed_services").insert(payload).select("id").single(); if(error) throw error; serviceId=data.id; }
      const {error:delError}=await sb.from("pibr_fixed_service_variations").delete().eq("fixed_service_id",serviceId); if(delError) throw delError;
      const rows=[1,2,3,4,5].map(n=>({fixed_service_id:serviceId,week_of_month:n,special_title:field(`variation-${n}`)})).filter(x=>x.special_title);
      if(rows.length){ const {error}=await sb.from("pibr_fixed_service_variations").insert(rows); if(error) throw error; }
      toast("Culto fixo salvo.","success"); closeModal(); await loadData();
    }catch(err){ console.error(err); toast(err.message||"Não foi possível salvar.","error"); }
  }

  async function deleteService(id){
    if(!confirm("Excluir este culto fixo e suas variações?")) return;
    const {error}=await sb.from("pibr_fixed_services").delete().eq("id",id);
    if(error) return toast(error.message,"error");
    toast("Culto removido.","success"); await loadData();
  }

  function eventForm(event=null){
    const start=event?.starts_at?new Date(event.starts_at):null;
    const end=event?.ends_at?new Date(event.ends_at):null;
    const date=start?ymd(start):ymd(new Date()), time=start?`${pad(start.getHours())}:${pad(start.getMinutes())}`:"18:00";
    const endDate=end?ymd(end):"", endTime=end?`${pad(end.getHours())}:${pad(end.getMinutes())}`:"";
    openModal(event?"Editar evento especial":"Adicionar evento especial","EVENTOS ESPECIAIS",`
      <form id="event-form" class="agenda-form">
        <div class="agenda-form-section"><div class="agenda-form-grid">
          <label class="full"><span>Nome do evento *</span><input id="event-title" required value="${esc(event?.title||"")}" /></label>
          <label><span>Data *</span><input id="event-date" type="date" required value="${date}" /></label>
          <label><span>Horário *</span><input id="event-time" type="time" required value="${time}" /></label>
          <label><span>Data de término</span><input id="event-end-date" type="date" value="${endDate}" /></label>
          <label><span>Horário de término</span><input id="event-end-time" type="time" value="${endTime}" /></label>
          <label class="full"><span>Local</span><input id="event-location" value="${esc(event?.location||"")}" /></label>
          <label class="full"><span>Descrição</span><textarea id="event-description" rows="4">${esc(event?.description||"")}</textarea></label>
          <label class="full"><span>Visibilidade</span><select id="event-status"><option value="draft" ${event?.status!=="published"?"selected":""}>Rascunho — somente painel</option>${state.isMaintenance?`<option value="published" ${event?.status==="published"?"selected":""}>Publicado — aparece no site</option>`:""}</select></label>${state.isMaintenance?"":`<div class="agenda-maintenance-note full"><span data-lucide="lock-keyhole"></span><span>A publicação no site é exclusiva da Manutenção. Administradores organizam o evento internamente.</span></div>`}
        </div></div>
        <div class="agenda-form-actions"><button type="button" class="btn btn-secondary" data-close-agenda-modal>Cancelar</button><button class="btn btn-primary" type="submit"><span data-lucide="save"></span> Salvar evento</button></div>
      </form>`);
    $("#event-form").addEventListener("submit",e=>saveEvent(e,event?.id));
    $$("[data-close-agenda-modal]",$("#agenda-modal-body")).forEach(x=>x.addEventListener("click",closeModal));
  }

  async function saveEvent(e,id=null){
    e.preventDefault();
    try{
      const starts=`${field("event-date")}T${field("event-time")}:00`;
      const endDate=field("event-end-date"), endTime=field("event-end-time");
      const payload={title:field("event-title"),starts_at:new Date(starts).toISOString(),ends_at:endDate&&endTime?new Date(`${endDate}T${endTime}:00`).toISOString():null,location:field("event-location"),description:field("event-description"),status:field("event-status")||"draft"};
      if(id){ const {error}=await sb.from("pibr_events").update(payload).eq("id",id); if(error) throw error; }
      else { const {error}=await sb.from("pibr_events").insert(payload); if(error) throw error; }
      toast("Evento salvo.","success"); closeModal(); await loadData();
    }catch(err){ console.error(err); toast(err.message||"Não foi possível salvar.","error"); }
  }

  async function deleteEvent(id){
    if(!confirm("Excluir este evento especial?")) return;
    const {error}=await sb.from("pibr_events").delete().eq("id",id);
    if(error) return toast(error.message,"error");
    toast("Evento excluído.","success"); await loadData();
  }

  function scaleForm(scale=null){
    const assigned=scale?membersForScale(scale.id):[];
    const assignedMap=new Map(assigned.map(x=>[String(x.member_id),x.role_name||""]));
    const serviceOptions=state.services.map(s=>`<option value="${esc(s.id)}" ${String(scale?.fixed_service_id)===String(s.id)?"selected":""}>${esc(s.title)} · ${esc(weekdays[Number(s.weekday)])}</option>`).join("");
    const eventOptions=state.events.map(e=>`<option value="${esc(e.id)}" ${String(scale?.event_id)===String(e.id)?"selected":""}>${esc(e.title)}</option>`).join("");
    const ministryOptions=state.ministries.filter(m=>m.is_active!==false).map(m=>`<option value="${esc(m.id)}" ${String(scale?.ministry_id)===String(m.id)?"selected":""}>${esc(m.name)}</option>`).join("");
    const memberRows=state.members.filter(m=>m.membership_status==="active").map(m=>{
      const checked=assignedMap.has(String(m.id)), role=assignedMap.get(String(m.id))||"";
      return `<label class="scale-member-row"><input type="checkbox" name="scale-member" value="${esc(m.id)}" ${checked?"checked":""}/><strong>${esc(m.full_name)}</strong><input type="text" data-scale-role="${esc(m.id)}" value="${esc(role)}" placeholder="Função" ${checked?"":"disabled"} /></label>`;
    }).join("");
    openModal(scale?"Editar escala":"Nova escala","ESCALAS",`
      <form id="scale-form" class="agenda-form">
        <div class="agenda-form-section"><div class="agenda-form-grid">
          <label class="full"><span>Título da escala *</span><input id="scale-title" required value="${esc(scale?.title||"")}" placeholder="Ex.: Louvor e Adoração — Culto da Família" /></label>
          <label><span>Ministério</span><select id="scale-ministry"><option value="">Nenhum</option>${ministryOptions}</select></label>
          <label><span>Grupo / equipe</span><input id="scale-group" value="${esc(scale?.group_name||"")}" placeholder="Ex.: Grupo A" /></label>
          <label><span>Data *</span><input id="scale-date" type="date" required value="${esc(scale?.scale_date||ymd(new Date()))}" /></label>
          <label><span>Horário</span><input id="scale-time" type="time" value="${esc(time5(scale?.start_time).replace("—",""))}" /></label>
          <label><span>Vincular a culto fixo</span><select id="scale-service"><option value="">Nenhum</option>${serviceOptions}</select></label>
          <label><span>Vincular a evento especial</span><select id="scale-event"><option value="">Nenhum</option>${eventOptions}</select></label>
          <label class="full"><span>Status</span><select id="scale-status"><option value="draft" ${scale?.status==="draft"||!scale?"selected":""}>Rascunho</option><option value="published" ${scale?.status==="published"?"selected":""}>Publicada</option><option value="completed" ${scale?.status==="completed"?"selected":""}>Concluída</option><option value="cancelled" ${scale?.status==="cancelled"?"selected":""}>Cancelada</option></select></label>
          <label class="full"><span>Observações</span><textarea id="scale-notes" rows="3">${esc(scale?.notes||"")}</textarea></label>
        </div></div>
        <div class="agenda-form-section"><h3>Equipe escalada</h3><div class="scale-members">${memberRows||'<div class="agenda-empty">Cadastre membros primeiro.</div>'}</div></div>
        <div class="agenda-form-actions"><button type="button" class="btn btn-secondary" data-close-agenda-modal>Cancelar</button><button class="btn btn-primary" type="submit"><span data-lucide="save"></span> Salvar escala</button></div>
      </form>`);
    $$('input[name="scale-member"]').forEach(ch=>ch.addEventListener("change",()=>{ const role=$(`[data-scale-role="${ch.value}"]`); role.disabled=!ch.checked; if(!ch.checked) role.value=""; }));
    $("#scale-form").addEventListener("submit",e=>saveScale(e,scale?.id));
    $$("[data-close-agenda-modal]",$("#agenda-modal-body")).forEach(x=>x.addEventListener("click",closeModal));
  }

  async function saveScale(e,id=null){
    e.preventDefault();
    try{
      const payload={title:field("scale-title"),ministry_id:field("scale-ministry"),group_name:field("scale-group"),scale_date:field("scale-date"),start_time:field("scale-time"),fixed_service_id:field("scale-service"),event_id:field("scale-event"),status:field("scale-status")||"draft",notes:field("scale-notes")};
      let scaleId=id;
      if(id){ const {error}=await sb.from("pibr_ministry_scales").update(payload).eq("id",id); if(error) throw error; }
      else { const {data,error}=await sb.from("pibr_ministry_scales").insert(payload).select("id").single(); if(error) throw error; scaleId=data.id; }
      const {error:delError}=await sb.from("pibr_ministry_scale_members").delete().eq("scale_id",scaleId); if(delError) throw delError;
      const rows=$$('input[name="scale-member"]:checked').map(ch=>({scale_id:scaleId,member_id:ch.value,role_name:$(`[data-scale-role="${ch.value}"]`)?.value?.trim()||null}));
      if(rows.length){ const {error}=await sb.from("pibr_ministry_scale_members").insert(rows); if(error) throw error; }
      toast("Escala salva.","success"); closeModal(); await loadData();
    }catch(err){ console.error(err); toast(err.message||"Não foi possível salvar.","error"); }
  }

  async function deleteScale(id){
    if(!confirm("Excluir esta escala?")) return;
    const {error}=await sb.from("pibr_ministry_scales").delete().eq("id",id);
    if(error) return toast(error.message,"error");
    toast("Escala excluída.","success"); await loadData();
  }

  function showCalendarDetail(type,id,date){
    let title="",lines=[],team=[];
    if(type==="service"){
      const s=state.services.find(x=>String(x.id)===String(id)); if(!s)return;
      const d=new Date(`${date}T12:00:00`), variation=state.variations.find(v=>String(v.fixed_service_id)===String(s.id)&&Number(v.week_of_month)===weekOfMonth(d));
      title=variation?.special_title||s.title;
      lines=[["calendar",dateLongFmt.format(d)],["clock",time5(s.meeting_time)],["map-pin",s.location||"Local não informado"],["repeat-2","Culto fixo semanal"]];
      if(variation?.description) lines.push(["info",variation.description]);
    }else if(type==="cell"){
      const c=state.cells.find(x=>String(x.id)===String(id)); if(!c)return;
      title=c.name; lines=[["calendar",dateLongFmt.format(new Date(`${date}T12:00:00`))],["clock",time5(c.meeting_time)],["map-pin",[c.address,c.neighborhood].filter(Boolean).join(" · ")||"Local não informado"],["house-heart","Célula"]];
    }else if(type==="event"){
      const e=state.events.find(x=>String(x.id)===String(id)); if(!e)return;
      const d=new Date(e.starts_at); title=e.title; lines=[["calendar",dateLongFmt.format(d)],["clock",d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})],["map-pin",e.location||"Local não informado"],["sparkles",e.status==="published"?"Publicado":"Rascunho"]]; if(e.description) lines.push(["align-left",e.description]);
    }else if(type==="scale"){
      const s=state.scales.find(x=>String(x.id)===String(id)); if(!s)return;
      title=s.title; const ministry=state.ministries.find(m=>String(m.id)===String(s.ministry_id))?.name||"Sem ministério"; team=membersForScale(s.id);
      lines=[["calendar",dateLongFmt.format(new Date(`${s.scale_date}T12:00:00`))],["clock",time5(s.start_time)],["badge-plus",ministry],["users-round",s.group_name||"Equipe sem nome"]];
    }
    $("#calendar-detail-title").textContent=title;
    $("#calendar-detail-body").innerHTML=lines.map(([icon,text])=>`<div class="detail-line"><span data-lucide="${icon}"></span><span>${esc(text)}</span></div>`).join("")+
      (team.length?`<div class="detail-team"><strong>Equipe escalada</strong>${team.map(x=>`<div class="detail-person">${esc(x.member?.full_name||"Membro")} ${x.role_name?`— ${esc(x.role_name)}`:""}</div>`).join("")}</div>`:"");
    show($("#calendar-detail-modal")); icons();
  }

  function bind(){
    $$(".agenda-tab").forEach(btn=>btn.addEventListener("click",()=>setTab(btn.dataset.agendaTab)));
    $("#calendar-prev").addEventListener("click",()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);renderCalendar();});
    $("#calendar-next").addEventListener("click",()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);renderCalendar();});
    $("#calendar-today").addEventListener("click",()=>{state.month=new Date(new Date().getFullYear(),new Date().getMonth(),1);renderCalendar();});
    $("#new-service").addEventListener("click",()=>serviceForm());
    $("#new-special-event").addEventListener("click",()=>eventForm());
    $("#new-scale").addEventListener("click",()=>scaleForm());
    $("#services-list").addEventListener("click",e=>{ const edit=e.target.closest("[data-edit-service]"),del=e.target.closest("[data-delete-service]"); if(edit)serviceForm(state.services.find(s=>String(s.id)===String(edit.dataset.editService))); if(del)deleteService(del.dataset.deleteService); });
    $("#special-events-list").addEventListener("click",e=>{ const edit=e.target.closest("[data-edit-event]"),del=e.target.closest("[data-delete-event]"); if(edit)eventForm(state.events.find(s=>String(s.id)===String(edit.dataset.editEvent))); if(del)deleteEvent(del.dataset.deleteEvent); });
    $("#scales-list").addEventListener("click",e=>{ const edit=e.target.closest("[data-edit-scale]"),del=e.target.closest("[data-delete-scale]"); if(edit)scaleForm(state.scales.find(s=>String(s.id)===String(edit.dataset.editScale))); if(del)deleteScale(del.dataset.deleteScale); });
    $("#calendar-grid").addEventListener("click",e=>{ const item=e.target.closest("[data-calendar-type]"); if(item) showCalendarDetail(item.dataset.calendarType,item.dataset.calendarId,item.dataset.calendarDate); });
    $$("[data-close-agenda-modal]").forEach(x=>x.addEventListener("click",closeModal));
    $$("[data-close-calendar-detail]").forEach(x=>x.addEventListener("click",()=>hide($("#calendar-detail-modal"))));
    $("#agenda-logout").addEventListener("click",async()=>{await sb.auth.signOut();location.href="index.html";});
    $("#agenda-sidebar-open").addEventListener("click",()=>{$("#agenda-sidebar").classList.add("open");show($("#agenda-sidebar-overlay"));});
    $("#agenda-sidebar-close").addEventListener("click",()=>{$("#agenda-sidebar").classList.remove("open");hide($("#agenda-sidebar-overlay"));});
    $("#agenda-sidebar-overlay").addEventListener("click",()=>{$("#agenda-sidebar").classList.remove("open");hide($("#agenda-sidebar-overlay"));});
  }

  async function init(){
    icons();
    try{
      const admin=await ensureAdmin();
      hide($("#agenda-loading"));
      if(!admin){show($("#agenda-denied"));icons();return;}
      bind();
      await loadData();
      show($("#agenda-app")); icons();
    }catch(err){
      console.error(err); hide($("#agenda-loading")); show($("#agenda-denied"));
      $("#agenda-denied p").textContent=err.message||"Não foi possível carregar a Agenda Central."; icons();
    }
  }
  init();
})();
