(() => {
  "use strict";
  const KEYS={clients:"barbearia_clientes",appointments:"barbearia_agendamentos",waiting:"barbearia_lista_espera"};
  const state={tab:"retorno"};
  const read=(key,fallback=[])=>{try{const v=JSON.parse(localStorage.getItem(key)||"null");return v??fallback}catch{return fallback}};
  const list=key=>{const v=read(key,[]);return Array.isArray(v)?v:[]};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
  const norm=v=>String(v??"").trim().toLowerCase();
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const dateOf=v=>{if(!v)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(String(v))){const[y,m,d]=String(v).split("-").map(Number);return new Date(y,m-1,d)}const d=new Date(v);return Number.isNaN(d.getTime())?null:d};
  const dateKey=v=>{const d=dateOf(v);return d?[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"):""};
  const fmt=v=>{const d=dateOf(v);return d?new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d):"—"};
  const daysAgo=v=>{const d=dateOf(v),now=new Date();if(!d)return Infinity;const a=new Date(now.getFullYear(),now.getMonth(),now.getDate()),b=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.floor((a-b)/86400000)};
  const canceled=a=>["cancelado","cancelada","canceled"].includes(norm(a.status));
  const missed=a=>["faltou","falta","no-show","noshow"].includes(norm(a.status));
  const completed=a=>["concluido","concluida","atendido","atendida"].includes(norm(a.status));
  const appointmentsFor=c=>list(KEYS.appointments).filter(a=>(c.id&&a.clientId===c.id)||(norm(a.clientName||a.clienteNome)===norm(c.name)&&(!c.phone||!a.clientPhone||String(a.clientPhone).replace(/\D/g,"")===String(c.phone).replace(/\D/g,""))));
  const metrics=c=>{const ap=appointmentsFor(c),done=ap.filter(completed),dates=done.map(a=>dateOf(a.date||a.start)).filter(Boolean).sort((a,b)=>a-b);return{appointments:ap,done,last:dates.at(-1)||null,canceled:ap.filter(canceled).length,missed:ap.filter(missed).length}};
  const clients=()=>list(KEYS.clients);
  const retentionData=()=>clients().map(c=>({...c,...metrics(c)}));
  const returnClients=()=>retentionData().filter(c=>c.last&&daysAgo(c.last)>40).sort((a,b)=>daysAgo(b.last)-daysAgo(a.last));
  const recurring=()=>retentionData().filter(c=>c.done.length>=3).sort((a,b)=>b.done.length-a.done.length);
  const newClients=()=>retentionData().filter(c=>c.last&&daysAgo(c.last)<=30).sort((a,b)=>dateOf(b.last)-dateOf(a.last));
  const occurrences=()=>retentionData().filter(c=>c.canceled||c.missed).sort((a,b)=>(b.canceled+b.missed)-(a.canceled+a.missed));
  const waiting=()=>list(KEYS.waiting).filter(x=>norm(x.status)!=="removido");
  const searchMatch=(c,q)=>!q||norm((c.name||c.clientName)+" "+(c.phone||c.clientPhone)).includes(q);
  const row=c=>{
    const occurrencesCount=c.canceled+c.missed;
    const action=state.tab==="espera"?'<button class="text-button" type="button" data-action="remove-waiting" data-id="'+esc(c.id)+'">Remover</button>':'<button class="text-button" type="button" data-action="remind" data-id="'+esc(c.id)+'">Lembrar retorno</button>';
    return '<article class="retention-row"><div class="retention-main"><strong>'+esc(c.name||c.clientName)+'</strong><small>'+esc(c.phone||c.clientPhone||"WhatsApp não informado")+'</small></div><div class="retention-metric"><span>'+ (state.tab==="ocorrencias"?"Ocorrências":state.tab==="espera"?"Serviço":"Última visita")+'</span><strong>'+ (state.tab==="ocorrencias"?occurrencesCount:state.tab==="espera"?esc(c.serviceName||"Não informado"):fmt(c.last))+'</strong></div><div class="retention-metric"><span>'+ (state.tab==="espera"?"Preferência":"Atendimentos")+'</span><strong>'+ (state.tab==="espera"?fmt(c.preferredDate):c.done.length)+'</strong></div><span class="retention-badge">'+ (state.tab==="ocorrencias"?(c.canceled+" cancelamento(s) · "+c.missed+" falta(s)"):state.tab==="espera"?(c.status||"Aguardando"):(state.tab==="recorrentes"?"Recorrente":state.tab==="novos"?"Novo":"Retorno")) +'</span><div class="retention-actions">'+action+(state.tab==="ocorrencias"?'<button class="text-button" type="button" data-action="mark-return" data-id="'+esc(c.id)+'">Registrar retorno</button>':"")+'</div></article>';
  };
  const render=()=>{
    const data={retorno:returnClients,recorrentes:recurring,novos:newClients,ocorrencias:occurrences,espera:waiting}[state.tab]();
    const q=norm(document.querySelector("#retention-search").value),rows=data.filter(x=>searchMatch(x,q));
    document.querySelector("#return-count").textContent=returnClients().length;
    document.querySelector("#recurring-count").textContent=recurring().length;
    document.querySelector("#new-count").textContent=newClients().length;
    document.querySelector("#occurrence-count").textContent=occurrences().reduce((n,c)=>n+c.canceled+c.missed,0);
    const box=document.querySelector("#retention-list");
    if(!rows.length){box.innerHTML='<div class="empty-retention"><span aria-hidden="true">🔄</span><strong>Nenhum registro nesta lista</strong><p>Os dados aparecerão conforme clientes e atendimentos forem registrados.</p></div>';return}
    box.innerHTML=rows.map(row).join("");
  };
  const whatsapp=(phone,message)=>{const digits=String(phone||"").replace(/\D/g,"");if(!digits){window.alert("Este cliente não possui WhatsApp informado.");return}window.open("https://wa.me/"+(digits.startsWith("55")?digits:"55"+digits)+"?text="+encodeURIComponent(message),"_blank","noopener")};
  const remind=id=>{const c=retentionData().find(x=>x.id===id);if(!c)return;whatsapp(c.phone,"Olá, "+c.name+"! Tudo bem? Passando para lembrar que já está na hora de cuidar do próximo atendimento. Quando quiser, posso verificar um horário para você.")};
  const markReturn=id=>{const c=retentionData().find(x=>x.id===id);if(!c)return;const today=new Date().toISOString().slice(0,10);const ap=list(KEYS.appointments);ap.push({id:"ag-"+Date.now(),clientId:c.id,clientName:c.name,clientPhone:c.phone||"",serviceName:"Retorno registrado",barberName:"",date:today,time:"00:00",duration:30,status:"Concluído",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});if(!write(KEYS.appointments,ap))window.alert("Não foi possível registrar o retorno.");render()};
  const openWaiting=()=>{const f=document.querySelector("#waiting-form");f.reset();document.querySelector("#waiting-error").textContent="";f.elements.preferredDate.min=new Date().toISOString().slice(0,10);document.querySelector("#waiting-dialog").showModal();f.elements.clientName.focus()};
  const saveWaiting=e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f).entries()),name=d.clientName.trim(),items=waiting();if(!name){document.querySelector("#waiting-error").textContent="Informe o nome do cliente.";return}if(items.some(x=>norm(x.clientName)===norm(name)&&String(x.clientPhone||"").replace(/\D/g,"")===String(d.clientPhone||"").replace(/\D/g,""))){document.querySelector("#waiting-error").textContent="Este cliente já está na lista de espera.";return}items.push({id:"esp-"+Date.now(),clientName:name,clientPhone:d.clientPhone.trim(),serviceName:d.serviceName.trim(),preferredDate:d.preferredDate,notes:d.notes.trim(),status:"Aguardando",createdAt:new Date().toISOString()});if(!write(KEYS.waiting,items)){document.querySelector("#waiting-error").textContent="Não foi possível salvar a lista de espera.";return}document.querySelector("#waiting-dialog").close();state.tab="espera";document.querySelectorAll(".retention-tab").forEach(b=>{const a=b.dataset.tab===state.tab;b.classList.toggle("active",a);b.setAttribute("aria-selected",String(a))});render()};
  document.addEventListener("DOMContentLoaded",()=>{
    render();
    document.querySelector("#retention-search").addEventListener("input",render);
    document.querySelectorAll(".retention-tab").forEach(b=>b.addEventListener("click",()=>{state.tab=b.dataset.tab;document.querySelectorAll(".retention-tab").forEach(x=>{const a=x===b;x.classList.toggle("active",a);x.setAttribute("aria-selected",String(a))});render()}));
    document.querySelector("#new-waiting").addEventListener("click",openWaiting);
    document.querySelector("#cancel-waiting").addEventListener("click",()=>document.querySelector("#waiting-dialog").close());
    document.querySelector("#close-waiting").addEventListener("click",()=>document.querySelector("#waiting-dialog").close());
    document.querySelector("#retention-list").addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;if(b.dataset.action==="remind")remind(b.dataset.id);if(b.dataset.action==="remove-waiting"){const items=list(KEYS.waiting);if(window.confirm("Remover este cliente da lista de espera?")){if(!write(KEYS.waiting,items.filter(x=>x.id!==b.dataset.id)))window.alert("Não foi possível atualizar a lista de espera.");render()}}if(b.dataset.action==="mark-return"&&window.confirm("Registrar um atendimento concluído para este cliente hoje?"))markReturn(b.dataset.id)});
  });
})();