(() => {
  "use strict";

  const STORAGE_KEYS = { appointments: "barbearia_agendamentos", blocks: "barbearia_horarios_bloqueados", settings: "barbearia_configuracoes" };
  const state = { date: startOfDay(new Date()), view: "day" };

  const readList = key => { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };
  const writeList = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function startOfDay(value) { const date = value instanceof Date ? new Date(value) : new Date(value); date.setHours(0, 0, 0, 0); return date; }
  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(value);
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }
    const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date;
  }
  function dateKey(value) { const date = value instanceof Date ? value : parseDate(value); if (!date) return ""; return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-"); }
  function normalizeStatus(value) { return String(value || "").trim().toLowerCase(); }
  function isCanceled(item) { return ["cancelado","cancelada","canceled"].includes(normalizeStatus(item.status)); }
  function formatDateLong(date) { return new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long"}).format(date); }
  function formatShortDate(date) { return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit"}).format(date); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char])); }
  function getTime(item) { if (item.time && /^\d{2}:\d{2}/.test(item.time)) return item.time.slice(0,5); const start = parseDate(item.start); return start ? start.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : ""; }
  function getDuration(item) { const value = Number(item.duration); return Number.isFinite(value) && value > 0 ? value : 45; }
  function getAppointments() { return readList(STORAGE_KEYS.appointments).filter(item => !isCanceled(item)); }
  function getBlocks() { return readList(STORAGE_KEYS.blocks); }

  function getSettings() {
    try { const value = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}"); return value && typeof value === "object" ? value : {}; }
    catch { return {}; }
  }

  function getOperatingDays(settings) {
    const configured = settings.operatingDays || settings.diasFuncionamento;
    return Array.isArray(configured) && configured.length ? configured : null;
  }

  function getHours(settings) {
    return { open: settings.openingTime || settings.horaAbertura || "09:00", close: settings.closingTime || settings.horaFechamento || "19:00" };
  }

  function timeToMinutes(value) { const [hours, minutes] = String(value || "00:00").split(":").map(Number); if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN; return hours * 60 + minutes; }
  function minutesToTime(minutes) { return String(Math.floor(minutes/60)).padStart(2,"0") + ":" + String(minutes%60).padStart(2,"0"); }

  function buildSlots(date) {
    const settings = getSettings(), days = getOperatingDays(settings), weekday = date.getDay();
    if (days && !days.includes(weekday) && !days.includes(String(weekday))) return [];
    const { open, close } = getHours(settings), start = timeToMinutes(open), end = timeToMinutes(close);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    const slots = []; for (let minute = start; minute < end; minute += 30) slots.push(minutesToTime(minute)); return slots;
  }

  function getDayAppointments(date) { const key = dateKey(date); return getAppointments().filter(item => dateKey(item.date || item.start) === key).sort((a,b) => getTime(a).localeCompare(getTime(b))); }
  function getDayBlocks(date) { const key = dateKey(date); return getBlocks().filter(item => dateKey(item.date) === key).sort((a,b) => String(a.time||"").localeCompare(String(b.time||""))); }

  function findAppointmentAt(date,time) {
    const minute = timeToMinutes(time);
    return getDayAppointments(date).find(item => { const start = timeToMinutes(getTime(item)); return Number.isFinite(start) && minute >= start && minute < start + getDuration(item); });
  }

  function findBlockAt(date,time) {
    const minute = timeToMinutes(time);
    return getDayBlocks(date).find(item => { const start = timeToMinutes(item.time), duration = Number(item.duration) > 0 ? Number(item.duration) : 30; return Number.isFinite(start) && minute >= start && minute < start + duration; });
  }

  function appointmentMarkup(appointment,time) {
    const name = appointment.clientName || appointment.clienteNome || appointment.client || "Cliente";
    const service = appointment.serviceName || appointment.servicoNome || appointment.service || "Serviço";
    const barber = appointment.barberName || appointment.barbeiroNome || appointment.barber || "";
    const status = appointment.status || "Agendado";
    return '<div class="slot"><div class="slot-time">'+escapeHtml(time)+'</div><div class="slot-content"><div class="appointment"><div class="appointment-info"><strong>'+
      escapeHtml(name)+'</strong><span>'+escapeHtml(service)+(barber ? " · "+escapeHtml(barber) : "")+
      '</span></div><div class="appointment-meta"><span class="status-badge">'+escapeHtml(status)+'</span><button class="text-button" type="button" data-action="edit-appointment" data-id="'+escapeHtml(appointment.id||"")+'">Editar</button><button class="text-button" type="button" data-action="cancel-appointment" data-id="'+escapeHtml(appointment.id||"")+'">Cancelar</button></div></div></div></div>';
  }

  function renderDay(date) {
    const appointments = getDayAppointments(date), blocks = getDayBlocks(date), slots = buildSlots(date);
    if (!slots.length) return '<article class="panel day-card"><div class="day-header"><div><h2>'+escapeHtml(formatDateLong(date))+'</h2><p>Data selecionada</p></div></div><div class="empty-agenda"><span class="empty-icon" aria-hidden="true">🔒</span><strong>Dia sem funcionamento configurado</strong><p>Configure os dias e horários de funcionamento para gerar a grade automaticamente.</p><button class="button button-secondary" type="button" data-action="open-settings">Configurar funcionamento</button></div></article>';

    const renderedAppointments = new Set();
    const slotMarkup = slots.map(time => {
      const appointment = findAppointmentAt(date,time), block = findBlockAt(date,time);
      if (appointment) { if (renderedAppointments.has(appointment.id) || getTime(appointment)!==time) return ""; renderedAppointments.add(appointment.id); return appointmentMarkup(appointment,time); }
      if (block) { if (timeToMinutes(time)!==timeToMinutes(block.time)) return ""; return '<div class="slot blocked"><div class="slot-time">'+escapeHtml(time)+'</div><div class="slot-content"><div class="blocked-item"><span>🔒 '+escapeHtml(block.reason||"Horário bloqueado")+'</span><button class="text-button" type="button" data-action="unblock" data-id="'+escapeHtml(block.id||"")+'">Liberar</button></div></div></div>'; }
      return '<div class="slot"><div class="slot-time">'+time+'</div><div class="slot-content"><span class="slot-empty">Horário disponível</span><button class="text-button" type="button" data-action="new-at-time" data-time="'+time+'">Agendar</button></div></div>';
    }).join("");

    return '<article class="panel day-card"><div class="day-header"><div><h2>'+escapeHtml(formatDateLong(date))+'</h2><p>'+appointments.length+' agendamento(s) · '+blocks.length+' bloqueio(s)</p></div><div class="day-actions"><button class="button button-secondary" type="button" data-action="block-time">🔒 Bloquear</button></div></div><div class="schedule">'+slotMarkup+'</div></article>';
  }

  function addDays(date,amount) { const result = new Date(date); result.setDate(result.getDate()+amount); return startOfDay(result); }
  function getWeekStart(date) { const result = startOfDay(date); result.setDate(result.getDate()-result.getDay()); return result; }

  function renderWeek(date) {
    const start = getWeekStart(date), days = Array.from({length:7},(_,index)=>addDays(start,index));
    return '<div class="week-scroll"><div class="week-grid">'+days.map(day => {
      const appointments = getDayAppointments(day), blocks = getDayBlocks(day), slots = buildSlots(day).slice(0,8), rendered = new Set();
      const content = slots.length ? slots.map(time => {
        const appointment = findAppointmentAt(day,time), block = findBlockAt(day,time);
        if (appointment) { if (rendered.has(appointment.id)||getTime(appointment)!==time) return ""; rendered.add(appointment.id); return appointmentMarkup(appointment,time); }
        if (block && timeToMinutes(block.time)===timeToMinutes(time)) return '<div class="slot blocked"><div class="slot-time">'+time+'</div><div class="slot-content"><div class="blocked-item"><span>🔒 Bloqueado</span></div></div></div>';
        return '<div class="slot"><div class="slot-time">'+time+'</div><div class="slot-content"><span class="slot-empty">Livre</span></div></div>';
      }).join("") : '<div class="empty-agenda"><span class="empty-icon" aria-hidden="true">🔒</span><strong>Sem grade</strong><p>Configure o funcionamento.</p></div>';
      return '<article class="panel week-day"><div class="day-header"><h2>'+escapeHtml(new Intl.DateTimeFormat("pt-BR",{weekday:"short"}).format(day))+'</h2><p>'+formatShortDate(day)+' · '+appointments.length+' agenda(s) · '+blocks.length+' bloqueio(s)</p></div><div class="schedule">'+content+'</div></article>';
    }).join("")+'</div></div>';
  }

  function getWeekAppointments(date) { const start=getWeekStart(date), end=addDays(start,6); return getAppointments().filter(item => { const value=parseDate(item.date||item.start); return value&&value>=start&&value<addDays(end,1); }); }
  function getWeekBlocks(date) { const start=getWeekStart(date), end=addDays(start,6); return getBlocks().filter(item => { const value=parseDate(item.date); return value&&value>=start&&value<addDays(end,1); }); }

  function render() {
    const container=document.querySelector("#agenda-container"), label=document.querySelector("#agenda-period-label");
    if (state.view==="day") { label.textContent=formatDateLong(state.date); container.innerHTML=renderDay(state.date); }
    else { const start=getWeekStart(state.date), end=addDays(start,6); label.textContent=formatShortDate(start)+" — "+formatShortDate(end); container.innerHTML=renderWeek(state.date); }
    document.querySelector("#scheduled-count").textContent=state.view==="day"?getDayAppointments(state.date).length:getWeekAppointments(state.date).length;
    document.querySelector("#blocked-count").textContent=state.view==="day"?getDayBlocks(state.date).length:getWeekBlocks(state.date).length;
  }

  function openAppointmentDialog(time="",appointment=null) {
    const form=document.querySelector("#appointment-form"); form.reset();
    form.elements.id.value=appointment?.id||""; form.elements.date.value=appointment?.date||dateKey(state.date); form.elements.time.value=appointment?.time||time;
    form.elements.clientName.value=appointment?.clientName||appointment?.clienteNome||""; form.elements.clientPhone.value=appointment?.clientPhone||"";
    form.elements.serviceName.value=appointment?.serviceName||appointment?.servicoNome||""; form.elements.barberName.value=appointment?.barberName||appointment?.barbeiroNome||"";
    form.elements.duration.value=String(appointment?.duration||45); form.elements.notes.value=appointment?.notes||"";
    document.querySelector("#appointment-dialog-title").textContent=appointment?"Editar agendamento":"Agendar horário";
    document.querySelector("#save-appointment").textContent=appointment?"Salvar alterações":"Salvar agendamento";
    document.querySelector("#form-error").textContent=""; document.querySelector("#appointment-dialog").showModal(); form.elements.clientName.focus();
  }
  function closeDialog(){document.querySelector("#appointment-dialog").close();}
  function openBlockDialog(time=""){const form=document.querySelector("#block-form");form.reset();form.elements.date.value=dateKey(state.date);form.elements.time.value=time;document.querySelector("#block-error").textContent="";document.querySelector("#block-dialog").showModal();form.elements.time.focus();}
  function closeBlockDialog(){document.querySelector("#block-dialog").close();}

  function openSettingsDialog() {
    const form=document.querySelector("#settings-form"), settings=getSettings(), days=getOperatingDays(settings);
    form.reset();
    const configuredDays=days ? days.map(Number) : [1,2,3,4,5,6];
    form.querySelectorAll('input[name="operatingDays"]').forEach(input => { input.checked=configuredDays.includes(Number(input.value)); });
    const hours=getHours(settings); form.elements.openingTime.value=hours.open; form.elements.closingTime.value=hours.close;
    document.querySelector("#settings-error").textContent=""; document.querySelector("#settings-dialog").showModal();
  }

  function closeSettingsDialog(){document.querySelector("#settings-dialog").close();}

  function saveSettings(event) {
    event.preventDefault();
    const form=event.currentTarget, data=Object.fromEntries(new FormData(form).entries());
    const error=document.querySelector("#settings-error"), days=[...form.querySelectorAll('input[name="operatingDays"]:checked')].map(input=>Number(input.value));
    const open=timeToMinutes(data.openingTime), close=timeToMinutes(data.closingTime);
    if (!days.length) { error.textContent="Selecione pelo menos um dia de funcionamento."; return; }
    if (!Number.isFinite(open)||!Number.isFinite(close)||close<=open) { error.textContent="O horário de fechamento deve ser depois da abertura."; return; }
    const current=getSettings();
    writeList(STORAGE_KEYS.settings,{...current,operatingDays:days,openingTime:data.openingTime,closingTime:data.closingTime});
    closeSettingsDialog(); render();
  }

  function saveAppointment(event) {
    event.preventDefault();
    const form=event.currentTarget, data=Object.fromEntries(new FormData(form).entries()), error=document.querySelector("#form-error");
    const appointments=readList(STORAGE_KEYS.appointments), editingId=data.id, activeAppointments=appointments.filter(item=>!isCanceled(item)&&item.id!==editingId);
    const start=timeToMinutes(data.time), duration=Number(data.duration)||45, end=start+duration;
    if (!data.date||!Number.isFinite(start)||start<0||start>=1440||end>1440) { error.textContent="Informe uma data, horário e duração válidos."; return; }
    const conflict=activeAppointments.some(item=>{if(dateKey(item.date||item.start)!==data.date)return false;const otherStart=timeToMinutes(getTime(item)),otherEnd=otherStart+getDuration(item);return start<otherEnd&&end>otherStart;});
    const blockConflict=getBlocks().some(item=>{if(dateKey(item.date)!==data.date)return false;const blockStart=timeToMinutes(item.time),blockEnd=blockStart+(Number(item.duration)>0?Number(item.duration):30);return start<blockEnd&&end>blockStart;});
    if(conflict||blockConflict){error.textContent="Esse período já possui um atendimento ou bloqueio.";return;}
    const record={id:editingId||"ag-"+Date.now(),date:data.date,time:data.time,duration,clientName:data.clientName.trim(),clientPhone:data.clientPhone.trim(),serviceName:data.serviceName.trim(),barberName:data.barberName.trim(),notes:data.notes.trim(),status:editingId?(appointments.find(item=>item.id===editingId)?.status||"Agendado"):"Agendado",createdAt:appointments.find(item=>item.id===editingId)?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(!record.clientName||!record.serviceName){error.textContent="Informe o cliente e o serviço.";return;}
    const index=appointments.findIndex(item=>item.id===editingId); if(index>=0)appointments[index]={...appointments[index],...record}; else appointments.push(record);
    writeList(STORAGE_KEYS.appointments,appointments); closeDialog(); state.date=parseDate(data.date)||state.date; render();
  }

  function saveBlock(event) {
    event.preventDefault(); const form=event.currentTarget,data=Object.fromEntries(new FormData(form).entries()),error=document.querySelector("#block-error"),date=parseDate(data.date),time=timeToMinutes(data.time);
    if(!date||!Number.isFinite(time)||time<0||time>=1440){error.textContent="Informe uma data e horário válidos.";return;}
    if(getDayAppointments(date).some(item=>getTime(item)===data.time)){error.textContent="Já existe um atendimento nesse horário.";return;}
    const blocks=readList(STORAGE_KEYS.blocks); if(blocks.some(item=>dateKey(item.date)===data.date&&String(item.time).slice(0,5)===data.time)){error.textContent="Esse horário já está bloqueado.";return;}
    blocks.push({id:"bloq-"+Date.now(),date:data.date,time:data.time,duration:30,reason:data.reason.trim()||"Horário bloqueado",createdAt:new Date().toISOString()});
    writeList(STORAGE_KEYS.blocks,blocks); closeBlockDialog(); state.date=date; render();
  }

  function cancelAppointment(id){const appointments=readList(STORAGE_KEYS.appointments),target=appointments.find(item=>item.id===id);if(!target||!window.confirm("Cancelar este agendamento?"))return;target.status="Cancelado";target.canceledAt=new Date().toISOString();writeList(STORAGE_KEYS.appointments,appointments);render();}
  function unblock(id){const blocks=readList(STORAGE_KEYS.blocks);if(!window.confirm("Liberar este horário?"))return;writeList(STORAGE_KEYS.blocks,blocks.filter(item=>item.id!==id));render();}

  function bindEvents() {
    document.querySelector("#previous-day").addEventListener("click",()=>{state.date=addDays(state.date,state.view==="week"?-7:-1);render();});
    document.querySelector("#next-day").addEventListener("click",()=>{state.date=addDays(state.date,state.view==="week"?7:1);render();});
    document.querySelector("#today-button").addEventListener("click",()=>{state.date=startOfDay(new Date());render();});
    document.querySelector("#settings-button").addEventListener("click",openSettingsDialog);
    document.querySelector("#new-appointment").addEventListener("click",()=>openAppointmentDialog());
    document.querySelector("#close-dialog").addEventListener("click",closeDialog);
    document.querySelector("#cancel-dialog").addEventListener("click",closeDialog);
    document.querySelector("#close-block-dialog").addEventListener("click",closeBlockDialog);
    document.querySelector("#cancel-block-dialog").addEventListener("click",closeBlockDialog);
    document.querySelector("#close-settings-dialog").addEventListener("click",closeSettingsDialog);
    document.querySelector("#cancel-settings-dialog").addEventListener("click",closeSettingsDialog);
    document.querySelector("#appointment-form").addEventListener("submit",saveAppointment);
    document.querySelector("#block-form").addEventListener("submit",saveBlock);
    document.querySelector("#settings-form").addEventListener("submit",saveSettings);

    document.querySelectorAll(".view-button").forEach(button=>button.addEventListener("click",()=>{state.view=button.dataset.view;document.querySelectorAll(".view-button").forEach(item=>{const active=item===button;item.classList.toggle("active",active);item.setAttribute("aria-pressed",String(active));});render();}));
    document.querySelector("#agenda-container").addEventListener("click",event=>{
      const button=event.target.closest("[data-action]"); if(!button)return;
      const action=button.dataset.action;
      if(action==="new-at-time")openAppointmentDialog(button.dataset.time);
      if(action==="block-time")openBlockDialog();
      if(action==="open-settings")openSettingsDialog();
      if(action==="edit-appointment"){const appointment=readList(STORAGE_KEYS.appointments).find(item=>item.id===button.dataset.id);if(appointment)openAppointmentDialog("",appointment);}
      if(action==="cancel-appointment")cancelAppointment(button.dataset.id);
      if(action==="unblock")unblock(button.dataset.id);
    });
    document.querySelectorAll(".nav-link[aria-disabled='true']").forEach(link=>link.addEventListener("click",event=>event.preventDefault()));
  }

  document.addEventListener("DOMContentLoaded",()=>{bindEvents();render();});
})();