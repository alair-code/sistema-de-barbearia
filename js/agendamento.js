(() => {
  "use strict";

  const KEYS={appointments:"barbearia_agendamentos",blocks:"barbearia_horarios_bloqueados",settings:"barbearia_configuracoes",services:"barbearia_servicos",barbers:"barbearia_barbeiros"};
  const state={service:null,barber:null,date:new Date(),time:""};
  const defaults={services:[
    {id:"serv-corte",name:"Corte",description:"Corte tradicional ou personalizado",price:35,duration:45,active:true},
    {id:"serv-barba",name:"Barba",description:"Barba com acabamento",price:25,duration:30,active:true},
    {id:"serv-combo",name:"Corte + Barba",description:"Atendimento completo",price:55,duration:60,active:true}
  ],barbers:[{id:"bar-principal",name:"Barbeiro principal",active:true}]};

  const read=(key,fallback=[])=>{try{const value=JSON.parse(localStorage.getItem(key)||"null");return Array.isArray(value)?value:value&&typeof value==="object"?value:fallback}catch{return fallback}};
  const readList=key=>read(key,[]);
  const writeList=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
  const dateKey=d=>{const x=new Date(d);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,"0"),String(x.getDate()).padStart(2,"0")].join("-")};
  const parseKey=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return null;const [y,m,d]=value.split("-").map(Number);return new Date(y,m-1,d)};
  const timeToMinutes=v=>{const [h,m]=String(v||"").split(":").map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:NaN};
  const minutesToTime=m=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
  const isCanceled=item=>["cancelado","cancelada","canceled"].includes(String(item.status||"").toLowerCase());
  const getSettings=()=>read(KEYS.settings,{});
  const getHours=()=>{const s=getSettings();return {open:s.openingTime||s.horaAbertura||"09:00",close:s.closingTime||s.horaFechamento||"19:00"}};
  const getDays=()=>{const s=getSettings(),days=s.operatingDays||s.diasFuncionamento;return Array.isArray(days)&&days.length?days.map(Number):[1,2,3,4,5,6]};
  const formatDate=d=>new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long"}).format(d);
  const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
  const getServices=()=>{const list=readList(KEYS.services).filter(x=>x.active!==false);return list.length?list:defaults.services};
  const getBarbers=()=>{const list=readList(KEYS.barbers).filter(x=>x.active!==false);return list.length?list:defaults.barbers};
  const getServiceDuration=s=>Number(s?.duration)>0?Number(s.duration):45;

  function getAppointments(){return readList(KEYS.appointments).filter(x=>!isCanceled(x))}
  function getBlocks(){return readList(KEYS.blocks)}
  function buildSlots(date,duration){
    const days=getDays(); if(!days.includes(date.getDay()))return [];
    const {open,close}=getHours(),start=timeToMinutes(open),end=timeToMinutes(close),step=30,slots=[];
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return slots;
    for(let minute=start;minute+duration<=end;minute+=step)slots.push(minutesToTime(minute));
    return slots;
  }
  function overlaps(start,end,otherStart,otherEnd){return start<otherEnd&&end>otherStart}
  function slotAvailable(date,time,duration,barberId){
    const day=dateKey(date),start=timeToMinutes(time),end=start+duration;
    if(!Number.isFinite(start)||!buildSlots(date,duration).includes(time))return false;
    const appointments=getAppointments();
    if(appointments.some(item=>{
      if(dateKey(item.date||item.start)!==day)return false;
      if(barberId&&item.barberId&&item.barberId!==barberId)return false;
      const otherStart=timeToMinutes(item.time||item.horario||"");
      const otherEnd=otherStart+(Number(item.duration)||45);
      return overlaps(start,end,otherStart,otherEnd);
    }))return false;
    return !getBlocks().some(item=>{
      if(dateKey(item.date)!==day)return false;
      const otherStart=timeToMinutes(item.time),otherEnd=otherStart+(Number(item.duration)||30);
      return overlaps(start,end,otherStart,otherEnd);
    });
  }

  function renderServices(){
    const container=document.querySelector("#service-options");
    container.innerHTML=getServices().map((service,i)=>'<div class="choice"><input id="service-'+service.id+'" type="radio" name="service" value="'+service.id+'" '+(i===0?'checked':'')+'><label for="service-'+service.id+'"><span class="choice-title">'+escapeHtml(service.name)+'</span><span class="choice-meta">'+escapeHtml(service.description||"")+" · "+escapeHtml(money(service.price))+" · "+escapeHtml(getServiceDuration(service)+" min")+'</span></label></div>').join("");
    const first=getServices()[0];if(first)state.service=first.id;
    container.addEventListener("change",()=>{state.service=document.querySelector('input[name="service"]:checked')?.value||null;state.time="";renderSlots();renderSummary()});
  }
  function renderBarbers(){
    const container=document.querySelector("#barber-options");
    container.innerHTML=getBarbers().map((barber,i)=>'<div class="choice"><input id="barber-'+barber.id+'" type="radio" name="barber" value="'+barber.id+'" '+(i===0?'checked':'')+'><label for="barber-'+barber.id+'"><span class="choice-title">'+escapeHtml(barber.name)+'</span><span class="choice-meta">Disponível para atendimento</span></label></div>').join("");
    const first=getBarbers()[0];if(first)state.barber=first.id;
    container.addEventListener("change",()=>{state.barber=document.querySelector('input[name="barber"]:checked')?.value||null;state.time="";renderSlots();renderSummary()});
  }
  function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

  function renderSlots(){
    const date=document.querySelector("#booking-date").value,container=document.querySelector("#slot-options"),hint=document.querySelector("#date-hint");
    state.date=parseKey(date)||state.date; const service=getServices().find(x=>x.id===state.service),duration=getServiceDuration(service);
    if(!date||!service){container.innerHTML="";return}
    if(state.date<startOfDay(new Date())){hint.textContent="Escolha hoje ou uma data futura.";container.innerHTML="";state.time="";return}
    const slots=buildSlots(state.date,duration).filter(time=>slotAvailable(state.date,time,duration,state.barber));
    hint.textContent=getDays().includes(state.date.getDay())?formatDate(state.date):"A barbearia não funciona nesta data.";
    if(!slots.length){container.innerHTML='<p class="muted">Nenhum horário disponível para esta data.</p>';state.time="";renderSummary();return}
    if(!slots.includes(state.time))state.time="";
    container.innerHTML=slots.map(time=>'<button class="slot-button '+(time===state.time?"selected":"")+'" type="button" data-time="'+time+'">'+time+'</button>').join("");
    container.querySelectorAll("[data-time]").forEach(button=>button.addEventListener("click",()=>{state.time=button.dataset.time;renderSlots();renderSummary()}));
  }

  function renderSummary(){
    const service=getServices().find(x=>x.id===state.service),barber=getBarbers().find(x=>x.id===state.barber),date=parseKey(document.querySelector("#booking-date").value);
    document.querySelector("#summary-service").textContent=service?.name||"Selecione um serviço";
    document.querySelector("#summary-barber").textContent=barber?.name||"Selecione um barbeiro";
    document.querySelector("#summary-date").textContent=date?formatDate(date):"Selecione uma data";
    document.querySelector("#summary-time").textContent=state.time||"Selecione um horário";
    document.querySelector("#summary-duration").textContent=service?getServiceDuration(service)+" minutos":"—";
    document.querySelector("#summary-price").textContent=service?money(service.price):"—";
  }

  function changeDate(amount){const input=document.querySelector("#booking-date"),date=parseKey(input.value)||startOfDay(new Date());date.setDate(date.getDate()+amount);input.value=dateKey(date);state.time="";renderSlots();renderSummary()}
  function nextAvailable(){let date=startOfDay(new Date());for(let i=0;i<31;i++){const service=getServices().find(x=>x.id===state.service),slots=service?buildSlots(date,getServiceDuration(service)).filter(t=>slotAvailable(date,t,getServiceDuration(service),state.barber)):[];if(slots.length){document.querySelector("#booking-date").value=dateKey(date);state.time=slots[0];renderSlots();renderSummary();return}date.setDate(date.getDate()+1)}}

  function getWhatsappNumber(){
    const s=getSettings();return String(s.whatsapp||s.whatsappNumber||s.telefoneWhatsapp||"").replace(/\D/g,"");
  }
  function saveAppointment(event){
    event.preventDefault();
    const error=document.querySelector("#booking-error"),name=document.querySelector("#client-name").value.trim(),phone=document.querySelector("#client-phone").value.trim(),notes=document.querySelector("#client-notes").value.trim(),date=document.querySelector("#booking-date").value;
    const service=getServices().find(x=>x.id===state.service),barber=getBarbers().find(x=>x.id===state.barber),duration=getServiceDuration(service);
    error.textContent="";
    if(!name||!phone){error.textContent="Informe seu nome e WhatsApp.";return}
    if(!service||!barber||!date||!state.time){error.textContent="Escolha serviço, barbeiro, data e horário.";return}
    const selected=parseKey(date);if(!selected||selected<startOfDay(new Date())){error.textContent="Escolha uma data válida.";return}
    if(!slotAvailable(selected,state.time,duration,state.barber)){error.textContent="Esse horário acabou de ficar indisponível. Escolha outro.";renderSlots();return}
    const appointments=readList(KEYS.appointments);
    const record={id:"ag-"+Date.now(),date,time:state.time,duration,clientName:name,clientPhone:phone,serviceId:service.id,serviceName:service.name,barberId:barber.id,barberName:barber.name,notes,status:"Agendado",createdAt:new Date().toISOString()};
    appointments.push(record);writeList(KEYS.appointments,appointments);
    const dateText=formatDate(selected),messageText="Olá! Gostaria de confirmar meu agendamento na barbearia.\n\nCliente: "+name+"\nServiço: "+service.name+"\nBarbeiro: "+barber.name+"\nData: "+dateText+"\nHorário: "+state.time+(notes?"\nObservação: "+notes:"");
    const number=getWhatsappNumber(),url=number?"https://wa.me/"+number+"?text="+encodeURIComponent(messageText):"";
    document.querySelector("#success-message").textContent=name+", seu horário foi reservado para "+dateText+" às "+state.time+".";
    const whatsapp=document.querySelector("#whatsapp-button");whatsapp.dataset.url=url;whatsapp.disabled=!url;whatsapp.textContent=url?"Confirmar pelo WhatsApp":"WhatsApp não configurado";
    document.querySelector("#success-dialog").showModal();
    state.time="";document.querySelector("#client-name").value="";document.querySelector("#client-phone").value="";document.querySelector("#client-notes").value="";document.querySelector("#booking-date").value=date;renderSlots();renderSummary();
  }

  document.addEventListener("DOMContentLoaded",()=>{
    const today=dateKey(new Date());document.querySelector("#booking-date").value=today;
    renderServices();renderBarbers();renderSlots();renderSummary();
    document.querySelector("#booking-date").addEventListener("change",()=>{state.time="";renderSlots();renderSummary()});
    document.querySelector("#previous-date").addEventListener("click",()=>changeDate(-1));
    document.querySelector("#next-date").addEventListener("click",()=>changeDate(1));
    document.querySelector("#whatsapp-button").addEventListener("click",()=>{const url=document.querySelector("#whatsapp-button").dataset.url;if(url)window.open(url,"_blank","noopener,noreferrer")});
    document.querySelector("#close-success").addEventListener("click",()=>document.querySelector("#success-dialog").close());
    document.querySelectorAll(".nav-link[aria-disabled='true']").forEach(link=>link.addEventListener("click",e=>e.preventDefault()));
  });
})();