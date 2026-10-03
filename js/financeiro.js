(() => {
"use strict";
const KEY="barbearia_pagamentos";
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const normalize=v=>String(v||"").trim().toLowerCase();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const dateKey=d=>d?d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()):"";
const todayKey=dateKey(new Date()), monthKey=todayKey.slice(0,7);
const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}};
const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v));return true}catch{return false}};
const amount=p=>Number(p.amount??p.valor??p.value)||0;
const paymentDate=p=>String(p.date||p.data||p.createdAt||"").slice(0,10);
const canceled=p=>["cancelado","cancelada","estornado","estornada","refunded"].includes(normalize(p.status));
const methodLabel=m=>({pix:"Pix",dinheiro:"Dinheiro",debito:"Débito",credito:"Crédito"}[normalize(m)]||"Outro");
const inPeriod=(p,period)=>{const d=paymentDate(p);if(period==="today")return d===todayKey;if(period==="month")return d.startsWith(monthKey);return true};
const validPayments=()=>read().filter(p=>!canceled(p));
const sum=items=>items.reduce((t,p)=>t+amount(p),0);

function renderStats(){
 const payments=validPayments(),today=payments.filter(p=>inPeriod(p,"today")),month=payments.filter(p=>inPeriod(p,"month")),total=sum(month);
 document.querySelector("#revenue-today").textContent=money(sum(today));
 document.querySelector("#revenue-month").textContent=money(total);
 document.querySelector("#paid-count").textContent=month.length;
 document.querySelector("#average-ticket").textContent=money(month.length?total/month.length:0);
}
function renderMethods(){
 const items=validPayments().filter(p=>inPeriod(p,"month")),box=document.querySelector("#method-summary"),methods=["pix","dinheiro","debito","credito"];
 if(!items.length){box.innerHTML='<div class="empty-finance"><strong>Nenhum recebimento no mês</strong>Registre o primeiro pagamento para acompanhar os valores.</div>';return}
 const total=sum(items);
 box.innerHTML=methods.map(m=>{const group=items.filter(p=>normalize(p.method||p.formaPagamento)===m),value=sum(group),pct=total?(value/total*100).toFixed(1):"0.0";return '<div class="method-row"><div><strong>'+methodLabel(m)+'</strong><span>'+group.length+' pagamento'+(group.length===1?"":"s")+'</span></div><strong>'+money(value)+'</strong><small>'+pct+'% do faturamento do mês</small></div>'}).join("");
}
function renderList(){
 const search=normalize(document.querySelector("#payment-search").value),period=document.querySelector("#payment-period").value,method=document.querySelector("#payment-method").value;
 let items=read().filter(p=>inPeriod(p,period));
 if(method!=="todos")items=items.filter(p=>normalize(p.method||p.formaPagamento)===method);
 if(search)items=items.filter(p=>[p.clientName,p.clienteNome,p.serviceName,p.servicoNome,p.notes].some(v=>normalize(v).includes(search)));
 items.sort((a,b)=>String(b.createdAt||b.date||"").localeCompare(String(a.createdAt||a.date||"")));
 const box=document.querySelector("#payments-list");
 if(!items.length){box.innerHTML='<div class="empty-finance"><strong>Nenhum pagamento encontrado</strong>Ajuste os filtros ou registre um novo recebimento.</div>';return}
 box.innerHTML=items.slice(0,50).map(p=>{const client=esc(p.clientName||p.clienteNome||"Cliente"),service=esc(p.serviceName||p.servicoNome||"Serviço"),date=paymentDate(p),displayDate=date?new Date(date+"T12:00:00").toLocaleDateString("pt-BR"):"—",status=canceled(p)?"Estornado/Cancelado":"Recebido";return '<div class="payment-row"><strong>'+displayDate+'</strong><div class="payment-main"><strong>'+client+'</strong><span>'+service+'</span><small>'+methodLabel(p.method||p.formaPagamento)+(p.notes?" · "+esc(p.notes):"")+'</small></div><div class="payment-value"><strong>'+money(amount(p))+'</strong><small class="status-pill">'+status+'</small></div></div>'}).join("");
}
const render=()=>{renderStats();renderMethods();renderList()};
function openForm(){
 const form=document.querySelector("#payment-form");form.reset();form.elements.id.value="";form.elements.date.value=todayKey;form.elements.method.value="pix";document.querySelector("#payment-dialog-title").textContent="Registrar pagamento";document.querySelector("#payment-form-error").textContent="";document.querySelector("#payment-dialog").showModal();form.elements.clientName.focus();
}
function savePayment(e){
 e.preventDefault();const form=e.currentTarget,data=Object.fromEntries(new FormData(form).entries()),value=Number(data.amount),error=document.querySelector("#payment-form-error");error.textContent="";
 if(!data.clientName.trim()||!data.serviceName.trim()){error.textContent="Informe cliente e serviço.";return}
 if(!Number.isFinite(value)||value<=0){error.textContent="Informe um valor válido maior que zero.";return}
 if(!data.date){error.textContent="Informe a data do pagamento.";return}
 const payments=read(),item={id:"pag_"+Date.now()+"_"+Math.random().toString(36).slice(2,8),clientName:data.clientName.trim(),clientPhone:data.clientPhone.trim(),serviceName:data.serviceName.trim(),amount:value,date:data.date,method:data.method,notes:data.notes.trim(),status:"recebido",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
 payments.push(item);
 if(!write(payments)){error.textContent="Não foi possível salvar o pagamento neste navegador.";return}
 document.querySelector("#payment-dialog").close();render();
}
document.addEventListener("DOMContentLoaded",()=>{
 document.querySelectorAll(".nav-link[aria-disabled='true']").forEach(link=>link.addEventListener("click",e=>e.preventDefault()));
 document.querySelector("#new-payment").addEventListener("click",openForm);
 document.querySelector("#cancel-payment-dialog").addEventListener("click",()=>document.querySelector("#payment-dialog").close());
 document.querySelector("#close-payment-dialog").addEventListener("click",()=>document.querySelector("#payment-dialog").close());
 document.querySelector("#payment-form").addEventListener("submit",savePayment);
 document.querySelector("#payment-search").addEventListener("input",renderList);
 document.querySelector("#payment-period").addEventListener("change",renderList);
 document.querySelector("#payment-method").addEventListener("change",renderList);
 render();
});
})();