(() => {
  "use strict";
  const cfg=window.PIBR_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase)return;
  const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const hide=el=>{if(el)el.style.display="none"};
  const show=el=>{if(el)el.style.removeProperty("display")};

  const moduleMap=[
    ["dashboard",'[data-view="dashboard"],a[href="index.html#dashboard"]'],
    ["members",'a[href="membros.html"]'],
    ["agenda",'a[href="agenda.html"]'],
    ["cells",'a[href="celulas-admin.html"]'],
    ["ministries",'a[href="ministerios-admin.html"]'],
    ["leaders",'[data-view="leaders"],a[href="index.html#leaders"]'],
    ["journey",'a[href="acompanhamento.html"]'],
    ["visitors",'[data-view="visitors"],a[href="index.html#visitors"]'],
    ["prayers",'[data-view="prayers"],a[href="index.html#prayers"]'],
    ["cell_interests",'[data-view="cell_interests"],a[href="index.html#cell_interests"]'],
    ["media",'[data-view="media"],a[href="index.html#media"]'],
    ["users",'[data-permissions-link],a[href="permissoes.html"]'],
    ["system",'[data-view="settings"],a[href="index.html#settings"]']
  ];

  async function getAccess(key){
    try{
      const {data,error}=await sb.rpc("pibr_my_module_access",{p_module:key});
      if(error)return "none";
      return data||"none";
    }catch{return "none"}
  }

  function openHashView(isMaintenance){
    const key=(location.hash||"").replace(/^#/,"");
    if(!key)return;
    const allowed=["dashboard","leaders","visitors","prayers","cell_interests","media","program","content","site_settings","settings"];
    if(!allowed.includes(key))return;
    if(["program","content","site_settings"].includes(key)&&!isMaintenance)return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const btn=document.querySelector(`[data-view="${key}"]`);
      if(btn){btn.click();clearInterval(timer)}
      else if(tries>30)clearInterval(timer);
    },100);
  }

  async function init(){
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return;

    const {data:summary}=await sb.rpc("pibr_my_access_summary");
    const isMaintenance=Boolean(summary?.maintenance), isAdmin=Boolean(summary?.admin);
    document.body.dataset.pibrMaintenance=isMaintenance?"true":"false";

    document.querySelectorAll('[data-maintenance-only]').forEach(el=>isMaintenance?show(el):hide(el));
    document.querySelectorAll('[data-maintenance-shortcuts]').forEach(el=>isMaintenance?show(el):hide(el));
    document.querySelectorAll('[data-maintenance-label]').forEach(el=>isMaintenance?show(el):hide(el));

    if(isMaintenance){
      document.querySelectorAll('.profile-copy small').forEach(el=>{
        if(/Administrador|Administração/i.test(el.textContent||""))el.textContent="Manutenção";
      });
      const chip=document.querySelector('.mode-chip span:last-child');
      if(chip&&/Administrativo|Administrador/i.test(chip.textContent||""))chip.textContent="Manutenção";
    }

    document.querySelectorAll('[data-permissions-link]').forEach(el=>isAdmin?show(el):hide(el));

    for(const [key,selector] of moduleMap){
      const access=await getAccess(key);
      document.querySelectorAll(selector).forEach(el=>access==="none"?hide(el):show(el));
    }

    openHashView(isMaintenance);

    if(!isMaintenance){
      const observer=new MutationObserver(()=>{
        const current=document.querySelector('.nav-item.active[data-view]')?.dataset.view;
        if(["program","content","site_settings"].includes(current||"")){
          document.querySelector('[data-view="dashboard"]')?.click();
        }
      });
      observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
    }
  }
  init().catch(console.error);
})();