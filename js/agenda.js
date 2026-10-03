(() => {
  "use strict";

  const STORAGE_KEYS = {
    appointments: "barbearia_agendamentos",
    blocks: "barbearia_horarios_bloqueados",
    settings: "barbearia_configuracoes"
  };

  const state = {
    date: startOfDay(new Date()),
    view: "day"
  };

  const readList = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const writeList = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function startOfDay(value) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function dateKey(value) {
    const date = value instanceof Date ? value : parseDate(value);
    if (!date) return "";
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(value);
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isCanceled(item) {
    return ["cancelado", "cancelada", "canceled"].includes(normalizeStatus(item.status));
  }

  function formatDateLong(date) {
    return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(date);
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function getTime(item) {
    if (item.time && /^\d{2}:\d{2}/.test(item.time)) return item.time.slice(0, 5);
    const start = parseDate(item.start);
    return start ? start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  }

  function getDuration(item) {
    const value = Number(item.duration);
    return Number.isFinite(value) && value > 0 ? value : 45;
  }

  function getAppointments() {
    return readList(STORAGE_KEYS.appointments).filter(item => !isCanceled(item));
  }

  function getBlocks() {
    return readList(STORAGE_KEYS.blocks);
  }

  function getSettings() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  }

  function getOperatingDays(settings) {
    const configured = settings.operatingDays || settings.diasFuncionamento;
    if (Array.isArray(configured) && configured.length) return configured;
    return null;
  }

  function getHours(settings) {
    const open = settings.openingTime || settings.horaAbertura || "09:00";
    const close = settings.closingTime || settings.horaFechamento || "19:00";
    return { open, close };
  }

  function timeToMinutes(value) {
    const [hours, minutes] = String(value || "00:00").split(":").map(Number);
    return (hours * 60) + minutes;
  }

  function minutesToTime(minutes) {
    return String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
  }

  function buildSlots(date) {
    const settings = getSettings();
    const days = getOperatingDays(settings);
    const weekday = date.getDay();
    const isOpen = days ? days.includes(weekday) || days.includes(String(weekday)) : true;
    if (!isOpen) return [];

    const { open, close } = getHours(settings);
    const start = timeToMinutes(open);
    const end = timeToMinutes(close);
    const slots = [];
    for (let minute = start; minute < end; minute += 30) {
      slots.push(minutesToTime(minute));
    }
    return slots;
  }

  function getDayAppointments(date) {
    const key = dateKey(date);
    return getAppointments()
      .filter(item => dateKey(item.date || item.start) === key)
      .sort((a, b) => getTime(a).localeCompare(getTime(b)));
  }

  function getDayBlocks(date) {
    const key = dateKey(date);
    return getBlocks()
      .filter(item => dateKey(item.date) === key)
      .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
  }

  function findAppointmentAt(date, time) {
    return getDayAppointments(date).find(item => {
      const start = getTime(item);
      const duration = getDuration(item);
      return timeToMinutes(time) >= timeToMinutes(start) &&
        timeToMinutes(time) < timeToMinutes(start) + duration;
    });
  }

  function findBlockAt(date, time) {
    return getDayBlocks(date).find(item => String(item.time || "").slice(0, 5) === time);
  }

  function renderDay(date) {
    const appointments = getDayAppointments(date);
    const blocks = getDayBlocks(date);
    const slots = buildSlots(date);
    const open = slots.length > 0;

    if (!open) {
      return '<article class="panel day-card"><div class="day-header"><div><h2>' +
        escapeHtml(formatDateLong(date)) +
        '</h2><p>Data selecionada</p></div></div><div class="empty-agenda"><span class="empty-icon" aria-hidden="true">🔒</span><strong>Dia sem funcionamento configurado</strong><p>Configure os dias e horários de funcionamento para gerar a grade automaticamente.</p><button class="button button-secondary" type="button" data-action="open-settings">Configurar depois</button></div></article>';
    }

    const slotMarkup = slots.map(time => {
      const appointment = findAppointmentAt(date, time);
      const block = findBlockAt(date, time);

      if (appointment) {
        if (getTime(appointment) !== time) return "";
        const name = appointment.clientName || appointment.clienteNome || appointment.client || "Cliente";
        const service = appointment.serviceName || appointment.servicoNome || appointment.service || "Serviço";
        const barber = appointment.barberName || appointment.barbeiroNome || appointment.barber || "";
        const status = appointment.status || "Agendado";
        return '<div class="slot"><div class="slot-time">' + time + '</div><div class="slot-content"><div class="appointment"><div class="appointment-info"><strong>' +
          escapeHtml(name) + '</strong><span>' + escapeHtml(service) + (barber ? " · " + escapeHtml(barber) : "") +
          '</span></div><div class="appointment-meta"><span class="status-badge">' + escapeHtml(status) +
          '</span><button class="text-button" type="button" data-action="cancel-appointment" data-id="' + escapeHtml(appointment.id || "") + '">Cancelar</button></div></div></div></div>';
      }

      if (block) {
        return '<div class="slot blocked"><div class="slot-time">' + time + '</div><div class="slot-content"><div class="blocked-item"><span>🔒 ' +
          escapeHtml(block.reason || "Horário bloqueado") +
          '</span><button class="text-button" type="button" data-action="unblock" data-id="' + escapeHtml(block.id || "") + '">Liberar</button></div></div></div>';
      }

      return '<div class="slot"><div class="slot-time">' + time + '</div><div class="slot-content"><span class="slot-empty">Horário disponível</span><button class="text-button" type="button" data-action="new-at-time" data-time="' + time + '">Agendar</button></div></div>';
    }).join("");

    return '<article class="panel day-card"><div class="day-header"><div><h2>' +
      escapeHtml(formatDateLong(date)) +
      '</h2><p>' + appointments.length + ' agendamento(s) · ' + blocks.length + ' bloqueio(s)</p></div><div class="day-actions"><button class="button button-secondary" type="button" data-action="block-time">🔒 Bloquear</button></div></div><div class="schedule">' +
      slotMarkup + '</div></article>';
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return startOfDay(result);
  }

  function getWeekStart(date) {
    const result = startOfDay(date);
    const day = result.getDay();
    result.setDate(result.getDate() - day);
    return result;
  }

  function renderWeek(date) {
    const start = getWeekStart(date);
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    return '<div class="week-grid">' + days.map(day => {
      const appointments = getDayAppointments(day);
      const blocks = getDayBlocks(day);
      const slots = buildSlots(day).slice(0, 8);
      const content = slots.length ? slots.map(time => {
        const appointment = findAppointmentAt(day, time);
        const block = findBlockAt(day, time);
        if (appointment && getTime(appointment) === time) {
          const name = appointment.clientName || appointment.clienteNome || appointment.client || "Cliente";
          const service = appointment.serviceName || appointment.servicoNome || appointment.service || "Serviço";
          return '<div class="slot"><div class="slot-time">' + time + '</div><div class="slot-content"><div class="appointment"><div class="appointment-info"><strong>' + escapeHtml(name) + '</strong><span>' + escapeHtml(service) + '</span></div><div class="appointment-meta"><span class="status-badge">Agendado</span></div></div></div></div>';
        }
        if (block) {
          return '<div class="slot blocked"><div class="slot-time">' + time + '</div><div class="slot-content"><div class="blocked-item"><span>🔒 Bloqueado</span></div></div></div>';
        }
        return '<div class="slot"><div class="slot-time">' + time + '</div><div class="slot-content"><span class="slot-empty">Livre</span></div></div>';
      }).join("") : '<div class="empty-agenda"><span class="empty-icon" aria-hidden="true">🔒</span><strong>Sem grade</strong><p>Configure o funcionamento.</p></div>';

      return '<article class="panel week-day"><div class="day-header"><h2>' +
        escapeHtml(new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day)) +
        '</h2><p>' + formatShortDate(day) + ' · ' + appointments.length + ' agenda(s) · ' + blocks.length + ' bloqueio(s)</p></div><div class="schedule">' +
        content + '</div></article>';
    }).join("") + '</div>';
  }

  function render() {
    const container = document.querySelector("#agenda-container");
    const label = document.querySelector("#agenda-period-label");
    if (state.view === "day") {
      label.textContent = formatDateLong(state.date);
      container.innerHTML = renderDay(state.date);
    } else {
      const start = getWeekStart(state.date);
      const end = addDays(start, 6);
      label.textContent = formatShortDate(start) + " — " + formatShortDate(end);
      container.innerHTML = renderWeek(state.date);
    }

    document.querySelector("#scheduled-count").textContent =
      state.view === "day" ? getDayAppointments(state.date).length : getWeekAppointments(state.date).length;
    document.querySelector("#blocked-count").textContent =
      state.view === "day" ? getDayBlocks(state.date).length : getWeekBlocks(state.date).length;
  }

  function getWeekAppointments(date) {
    const start = getWeekStart(date);
    const end = addDays(start, 6);
    return getAppointments().filter(item => {
      const value = parseDate(item.date || item.start);
      return value && value >= start && value <= end;
    });
  }

  function getWeekBlocks(date) {
    const start = getWeekStart(date);
    const end = addDays(start, 6);
    return getBlocks().filter(item => {
      const value = parseDate(item.date);
      return value && value >= start && value <= end;
    });
  }

  function openAppointmentDialog(time = "") {
    const form = document.querySelector("#appointment-form");
    form.reset();
    form.elements.date.value = dateKey(state.date);
    form.elements.time.value = time;
    document.querySelector("#form-error").textContent = "";
    document.querySelector("#appointment-dialog").showModal();
    form.elements.clientName.focus();
  }

  function closeDialog() {
    document.querySelector("#appointment-dialog").close();
  }

  function openBlockDialog(time = "") {
    const form = document.querySelector("#block-form");
    form.reset();
    form.elements.date.value = dateKey(state.date);
    form.elements.time.value = time;
    document.querySelector("#block-error").textContent = "";
    document.querySelector("#block-dialog").showModal();
    form.elements.time.focus();
  }

  function closeBlockDialog() {
    document.querySelector("#block-dialog").close();
  }

  function saveAppointment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const error = document.querySelector("#form-error");
    const appointments = getAppointments();
    const key = data.date;
    const start = timeToMinutes(data.time);
    const duration = Number(data.duration) || 45;
    const end = start + duration;

    const conflict = appointments.some(item => {
      if (dateKey(item.date || item.start) !== key) return false;
      const otherStart = timeToMinutes(getTime(item));
      const otherEnd = otherStart + getDuration(item);
      return start < otherEnd && end > otherStart;
    });

    const blockConflict = getBlocks().some(item =>
      dateKey(item.date) === key && timeToMinutes(item.time) >= start && timeToMinutes(item.time) < end
    );

    if (conflict || blockConflict) {
      error.textContent = "Esse horário já possui um atendimento ou bloqueio.";
      return;
    }

    const appointmentsData = readList(STORAGE_KEYS.appointments);
    appointmentsData.push({
      id: "ag-" + Date.now(),
      date: data.date,
      time: data.time,
      duration,
      clientName: data.clientName.trim(),
      clientPhone: data.clientPhone.trim(),
      serviceName: data.serviceName.trim(),
      barberName: data.barberName.trim(),
      notes: data.notes.trim(),
      status: "Agendado",
      createdAt: new Date().toISOString()
    });
    writeList(STORAGE_KEYS.appointments, appointmentsData);
    closeDialog();
    state.date = parseDate(data.date) || state.date;
    render();
  }

  function saveBlock(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const error = document.querySelector("#block-error");

    if (getDayAppointments(parseDate(data.date)).some(item => getTime(item) === data.time)) {
      error.textContent = "Já existe um atendimento nesse horário.";
      return;
    }

    const blocks = readList(STORAGE_KEYS.blocks);
    if (blocks.some(item => dateKey(item.date) === data.date && String(item.time).slice(0, 5) === data.time)) {
      error.textContent = "Esse horário já está bloqueado.";
      return;
    }

    blocks.push({
      id: "bloq-" + Date.now(),
      date: data.date,
      time: data.time,
      reason: data.reason.trim() || "Horário bloqueado",
      createdAt: new Date().toISOString()
    });
    writeList(STORAGE_KEYS.blocks, blocks);
    closeBlockDialog();
    state.date = parseDate(data.date) || state.date;
    render();
  }

  function cancelAppointment(id) {
    const appointments = readList(STORAGE_KEYS.appointments);
    const target = appointments.find(item => item.id === id);
    if (!target) return;
    if (!window.confirm("Cancelar este agendamento?")) return;
    target.status = "Cancelado";
    target.canceledAt = new Date().toISOString();
    writeList(STORAGE_KEYS.appointments, appointments);
    render();
  }

  function unblock(id) {
    const blocks = readList(STORAGE_KEYS.blocks);
    if (!window.confirm("Liberar este horário?")) return;
    writeList(STORAGE_KEYS.blocks, blocks.filter(item => item.id !== id));
    render();
  }

  function bindEvents() {
    document.querySelector("#previous-day").addEventListener("click", () => {
      state.date = addDays(state.date, state.view === "week" ? -7 : -1);
      render();
    });
    document.querySelector("#next-day").addEventListener("click", () => {
      state.date = addDays(state.date, state.view === "week" ? 7 : 1);
      render();
    });
    document.querySelector("#today-button").addEventListener("click", () => {
      state.date = startOfDay(new Date());
      render();
    });
    document.querySelector("#new-appointment").addEventListener("click", () => openAppointmentDialog());
    document.querySelector("#close-dialog").addEventListener("click", closeDialog);
    document.querySelector("#cancel-dialog").addEventListener("click", closeDialog);
    document.querySelector("#close-block-dialog").addEventListener("click", closeBlockDialog);
    document.querySelector("#cancel-block-dialog").addEventListener("click", closeBlockDialog);
    document.querySelector("#appointment-form").addEventListener("submit", saveAppointment);
    document.querySelector("#block-form").addEventListener("submit", saveBlock);

    document.querySelectorAll(".view-button").forEach(button => {
      button.addEventListener("click", () => {
        state.view = button.dataset.view;
        document.querySelectorAll(".view-button").forEach(item => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        render();
      });
    });

    document.querySelector("#agenda-container").addEventListener("click", event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "new-at-time") openAppointmentDialog(button.dataset.time);
      if (action === "block-time") openBlockDialog();
      if (action === "cancel-appointment") cancelAppointment(button.dataset.id);
      if (action === "unblock") unblock(button.dataset.id);
    });

    document.querySelectorAll(".nav-link[aria-disabled='true']").forEach(link => {
      link.addEventListener("click", event => event.preventDefault());
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    render();
  });
})();