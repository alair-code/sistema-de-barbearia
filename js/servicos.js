(() => {
  "use strict";
  const KEY="barbearia_servicos";
  const defaults=[
    {id:"serv-corte",name:"Corte",description:"Corte tradicional ou personalizado",price:35,duration:45,active:true},
    {id:"serv-barba",name:"Barba",description:"Barba com acabamento",price:25,duration:30,active:true},
    {id:"serv-combo",name:"Corte + Barba",description:"Atendimento completo",price:55,duration:60,active:true}
  ];
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"null");return Array.isArray(v)?v:[]}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const norm=v=>String(v??"").trim().toLowerCase();
  const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const services=()=>read();
  const render=()=>{
    const all=services(),q=norm(document.querySelector("#service-search").value),filter=document.querySelector("#service-filter").value;
    const active=all.filter(s=>s.active!==false),inactive=all.filter(s=>s.active===false);
    document.querySelector("#total-services").textContent=all.length;
    document.querySelector("#active-services").textContent=active.length;
    document.querySelector("#inactive-services").textContent=inactive.length;
    document.querySelector("#average-price").textContent=money(active.length?active.reduce((sum,s)=>sum+(Number(s.price)||0),0)/active.length:0);
    const rows=all.filter(s=>(!q||norm(s.name+" "+(s.description||"")).includes(q))&&(filter==="todos"||(filter==="ativos"&&s.active!==false)||(filter==="inativos"&&s.active===false))).sort((a,b)=>norm(a.name).localeCompare(norm(b.name)));
    const box=document.querySelector("#services-list");
    if(!rows.length){box.innerHTML='<div class="empty-services"><span aria-hidden="true">✂️</span><strong>Nenhum serviço encontrado</strong><p>Cadastre um serviço ou ajuste os filtros da busca.</p></div>';return}
    box.innerHTML=rows.map(s=>'<article class="service-row"><div class="service-main"><strong>'+esc(s.name)+'</strong><small>'+esc(s.description||"Sem descrição")+'</small></div><div class="service-metric"><span>Preço</span><strong>'+money(s.price)+'</strong></div><div class="service-metric"><span>Duração</span><strong>'+esc(s.duration)+' min</strong></div><span class="service-status '+(s.active!==false?"active":"")+'">'+(s.active!==false?"Ativo":"Inativo")+'</span><div class="service-actions"><button class="text-button" type="button" data-action="edit" data-id="'+esc(s.id)+'">Editar</button></div></article>').join("");
  };
  const openForm=s=>{
    const f=document.querySelector("#service-form");f.reset();f.elements.id.value=s?.id||"";f.elements.name.value=s?.name||"";f.elements.description.value=s?.description||"";f.elements.price.value=Number(s?.price)||"";f.elements.duration.value=String(s?.duration||45);f.elements.active.checked=s?.active!==false;
    document.querySelector("#service-dialog-title").textContent=s?"Editar serviço":"Novo serviço";document.querySelector("#service-form-error").textContent="";document.querySelector("#service-dialog").showModal();
  };
  const save=e=>{
    e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f).entries()),name=d.name.trim(),price=Number(d.price),duration=Number(d.duration),list=services();
    const error=document.querySelector("#service-form-error");error.textContent="";
    if(!name){error.textContent="Informe o nome do serviço.";return}
    if(!Number.isFinite(price)||price<0){error.textContent="Informe um preço válido.";return}
    if(![30,45,60,90,120,150,180].includes(duration)){error.textContent="Selecione uma duração válida.";return}
    if(list.some(s=>s.id!==d.id&&norm(s.name)===norm(name))){error.textContent="Já existe um serviço com este nome.";return}
    const old=list.find(s=>s.id===d.id),record={id:d.id||"serv-"+Date.now(),name,description:d.description.trim(),price,duration,active:d.active==="on",createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const i=list.findIndex(s=>s.id===record.id);if(i>=0)list[i]=record;else list.push(record);write(list);document.querySelector("#service-dialog").close();render();
  };
  document.addEventListener("DOMContentLoaded",()=>{
    if(!read().length)write(defaults);
    render();
    document.querySelector("#new-service").addEventListener("click",()=>openForm());
    document.querySelector("#service-search").addEventListener("input",render);
    document.querySelector("#service-filter").addEventListener("change",render);
    document.querySelector("#service-form").addEventListener("submit",save);
    document.querySelector("#cancel-service-dialog").addEventListener("click",()=>document.querySelector("#service-dialog").close());
    document.querySelector("#close-service-dialog").addEventListener("click",()=>document.querySelector("#service-dialog").close());
    document.querySelector("#services-list").addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const s=services().find(x=>x.id===b.dataset.id);if(s)openForm(s)});
    document.querySelectorAll(".nav-link[aria-disabled='true']").forEach(link=>link.addEventListener("click",e=>e.preventDefault()));
  });
})();