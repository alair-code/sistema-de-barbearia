(() => {
  "use strict";

  const STORAGE_KEYS = {
    appointments: "barbearia_agendamentos",
    clients: "barbearia_clientes",
    payments: "barbearia_pagamentos",
    settings: "barbearia_configuracoes"
  };

  const readList = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const sameDay = (value, date) => {
    if (!value) return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toDateString() === date.toDateString();
  };

  const money = (value) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value) || 0);

  const formatDate = (date) => new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(date);

  const renderDashboard = () => {
    const today = new Date();
    const appointments = readList(STORAGE_KEYS.appointments);
    const payments = readList(STORAGE_KEYS.payments);
    const clients = readList(STORAGE_KEYS.clients);

    const todayAppointments = appointments
      .filter(item => sameDay(item.date || item.start, today))
      .sort((a,b) => String(a.time || "").localeCompare(String(b.time || "")));

    const todayPayments = payments.filter(item => sameDay(item.date, today));
    const revenue = todayPayments.reduce((sum, item) => sum + (Number(item.amount ?? item.valor) || 0), 0);
    const served = todayAppointments.filter(item => ["concluido","concluida","atendido","atendida"].includes(String(item.status || "").toLowerCase())).length;

    document.querySelector("#today-label").textContent = formatDate(today);
    document.querySelector("#appointments-today").textContent = todayAppointments.length;
    document.querySelector("#available-slots").textContent = "—";
    document.querySelector("#clients-served").textContent = served;
    document.querySelector("#revenue-today").textContent = money(revenue);

    const list = document.querySelector("#appointments-list");
    if (todayAppointments.length) {
      list.className = "appointment-list";
      list.innerHTML = todayAppointments.slice(0, 8).map(item => {
        const time = item.time || (item.start ? new Date(item.start).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--:--");
        const name = item.clientName || item.clienteNome || "Cliente";
        const service = item.serviceName || item.servicoNome || "Serviço";
        return '<div class="appointment-row"><strong>'+time+'</strong><span>'+name+'</span><small>'+service+'</small></div>';
      }).join("");
    }

    const alertBox = document.querySelector("#alerts");
    if (appointments.length === 0 && clients.length === 0) {
      alertBox.innerHTML = '<div class="alert-item"><span>ℹ️</span><p>O sistema está pronto para receber os primeiros dados.</p></div>';
    }
  };

  document.addEventListener("DOMContentLoaded", renderDashboard);
})();