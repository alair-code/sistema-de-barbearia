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
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const toLocalDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const sameDay = (value, reference = new Date()) => {
    const date = toLocalDate(value);
    return date &&
      date.getFullYear() === reference.getFullYear() &&
      date.getMonth() === reference.getMonth() &&
      date.getDate() === reference.getDate();
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

  const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

  const isCanceled = (item) => ["cancelado", "cancelada", "canceled"].includes(normalizeStatus(item.status));
  const isServed = (item) => ["concluido", "concluida", "atendido", "atendida"].includes(normalizeStatus(item.status));

  const renderAppointments = (appointments) => {
    const list = document.querySelector("#appointments-list");
    if (!appointments.length) {
      list.className = "empty-state";
      list.innerHTML = '<span class="empty-icon" aria-hidden="true">📅</span><strong>Nenhum atendimento hoje</strong><p>Os agendamentos aparecerão aqui quando forem cadastrados.</p>';
      return;
    }

    list.className = "appointment-list";
    list.innerHTML = appointments.slice(0, 8).map((item) => {
      const start = toLocalDate(item.start);
      const time = item.time || (start ? start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--");
      const name = item.clientName || item.clienteNome || item.client || "Cliente";
      const service = item.serviceName || item.servicoNome || item.service || "Serviço";
      return '<div class="appointment-row"><strong>' + time + '</strong><span>' + name + '</span><small>' + service + '</small></div>';
    }).join("");
  };

  const renderAlerts = (appointments, clients) => {
    const box = document.querySelector("#alerts");
    const alerts = [];

    if (!appointments.length) {
      alerts.push("Nenhum agendamento foi registrado para hoje.");
    }
    if (!clients.length) {
      alerts.push("Nenhum cliente cadastrado ainda.");
    }

    box.innerHTML = alerts.map((message) =>
      '<div class="alert-item"><span aria-hidden="true">ℹ️</span><p>' + message + '</p></div>'
    ).join("");
  };

  const renderDashboard = () => {
    const today = new Date();
    const appointments = readList(STORAGE_KEYS.appointments).filter(item => !isCanceled(item));
    const payments = readList(STORAGE_KEYS.payments);
    const clients = readList(STORAGE_KEYS.clients);

    const todayAppointments = appointments
      .filter(item => sameDay(item.date || item.start, today))
      .sort((a, b) => String(a.time || a.start || "").localeCompare(String(b.time || b.start || "")));

    const todayPayments = payments.filter(item => sameDay(item.date || item.createdAt, today));
    const revenue = todayPayments
      .filter(item => !["cancelado", "cancelada", "estornado", "estornada"].includes(normalizeStatus(item.status)))
      .reduce((sum, item) => sum + (Number(item.amount ?? item.valor ?? item.value) || 0), 0);

    const served = todayAppointments.filter(isServed).length;

    document.querySelector("#today-label").textContent = formatDate(today);
    document.querySelector("#appointments-today").textContent = todayAppointments.length;
    document.querySelector("#available-slots").textContent = "—";
    document.querySelector("#clients-served").textContent = served;
    document.querySelector("#revenue-today").textContent = money(revenue);

    renderAppointments(todayAppointments);
    renderAlerts(todayAppointments, clients);
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-link[aria-disabled='true']").forEach((link) => {
      link.addEventListener("click", (event) => event.preventDefault());
    });
    renderDashboard();
  });
})();