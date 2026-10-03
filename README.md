# 💈 Sistema para Barbearias

## 📋 Objetivo

Criar um **sistema profissional de gestão para barbeiros**, desenvolvido **100% no frontend**, com foco em organizar a rotina da barbearia, facilitar o atendimento, controlar a agenda e ajudar na retenção de clientes.

> **Você cuida do corte. O sistema cuida do resto.**

---

## 🛠️ Tecnologias

O projeto deve utilizar exclusivamente:

* **HTML5**
* **CSS3**
* **JavaScript Vanilla**

### Restrições técnicas

* ❌ Não utilizar React
* ❌ Não utilizar Vue
* ❌ Não utilizar Angular
* ❌ Não utilizar frameworks frontend
* ❌ Não utilizar backend
* ❌ Não utilizar banco de dados externo
* ✅ Sistema **100% frontend**
* ✅ Utilizar `LocalStorage` para persistência local dos dados
* ✅ Estrutura preparada para futura integração com backend/banco de dados

---

# 🎯 Principais problemas que o sistema deve resolver

* Agenda desorganizada.
* Dificuldade para controlar horários.
* Excesso de mensagens repetitivas no WhatsApp.
* Perda de clientes.
* Horários vazios.
* Cancelamentos e faltas.
* Clientes que não retornam.
* Falta de controle financeiro.
* Dificuldade para acompanhar o desempenho da barbearia.
* Falta de presença profissional na internet.

---

# 📦 Funcionalidades

## 📊 Dashboard

Exibir de forma simples:

* Agendamentos do dia.
* Horários disponíveis.
* Clientes atendidos.
* Faturamento registrado.
* Alertas importantes.
* Resumo da operação.

---

## 📅 Agenda

Permitir:

* Visualização diária.
* Visualização semanal.
* Criar agendamentos.
* Editar agendamentos.
* Cancelar agendamentos.
* Bloquear horários.
* Configurar dias de funcionamento.
* Configurar horários de funcionamento.
* Definir duração dos serviços.

---

## 📲 Agendamento

O cliente deverá poder:

1. Escolher o serviço.
2. Escolher o barbeiro.
3. Escolher a data.
4. Escolher o horário.
5. Informar seus dados.
6. Confirmar o agendamento.

O sistema deverá permitir direcionar o cliente para o **WhatsApp** para confirmação ou contato.

---

## 👤 Clientes

Cadastro com:

* Nome.
* WhatsApp.
* Histórico de atendimentos.
* Última visita.
* Preferências.
* Observações.
* Total gasto.
* Quantidade de atendimentos.

Separar clientes por situações como:

* Clientes novos.
* Clientes ativos.
* Clientes inativos.

---

## ✂️ Serviços

Permitir cadastrar:

* Nome do serviço.
* Descrição.
* Preço.
* Duração.
* Status ativo/inativo.

Exemplos:

* Corte.
* Barba.
* Corte + Barba.
* Sobrancelha.
* Outros serviços.

---

## 🔄 Retenção de clientes

O sistema deverá ajudar o barbeiro a identificar:

* Clientes que estão há muito tempo sem voltar.
* Clientes recorrentes.
* Clientes novos.
* Clientes com cancelamentos.
* Clientes que faltaram.

Também deverá possuir:

* Lembrete de retorno.
* Lista de espera.
* Registro de faltas.
* Registro de cancelamentos.

---

## 💰 Financeiro

Permitir registrar:

* Valor do atendimento.
* Forma de pagamento.
* Faturamento diário.
* Faturamento mensal.
* Quantidade de atendimentos.
* Ticket médio.

Formas de pagamento:

* Pix.
* Dinheiro.
* Débito.
* Crédito.

> O módulo financeiro será baseado nos dados registrados localmente no sistema.

---

## 🌐 Site da Barbearia

O sistema deverá possuir uma área para apresentar a barbearia profissionalmente.

Informações:

* Nome da barbearia.
* Logo.
* Capa/hero.
* Descrição.
* Serviços.
* Galeria de imagens.
* Equipe.
* Horários.
* Endereço.
* Google Maps.
* WhatsApp.
* Instagram.
* Botão de agendamento.

---

## 📈 Relatórios

Apresentar informações como:

* Faturamento.
* Quantidade de atendimentos.
* Serviços mais realizados.
* Ocupação da agenda.
* Cancelamentos.
* Faltas.
* Clientes novos.
* Clientes recorrentes.

Os relatórios devem ser simples e fáceis de entender.

---

# 💡 Inteligência do sistema

Mesmo sendo um sistema frontend, a interface deverá apresentar **insights baseados nos dados armazenados localmente**.

Exemplos:

> ⚠️ Você possui 3 horários disponíveis hoje.

> 🔄 15 clientes estão há mais de 40 dias sem agendar.

> 📅 Sua terça-feira possui baixa ocupação.

> 👤 João está atrasado para o próximo corte.

Essas informações devem ajudar o barbeiro a entender **o que precisa de atenção**.

---

# 💾 Armazenamento

Como o projeto será **100% frontend**, os dados deverão ser armazenados utilizando:

```text
LocalStorage
```

O sistema deve possuir uma estrutura organizada para armazenamento dos dados.

Exemplo:

```text
Clientes
Agendamentos
Serviços
Barbeiros
Pagamentos
Configurações
```

A arquitetura deve permitir uma futura substituição do `LocalStorage` por uma API ou banco de dados sem necessidade de reconstruir toda a interface.

---

# 📱 Responsividade

O sistema deverá funcionar corretamente em:

* 📱 Celulares
* 📲 Tablets
* 💻 Notebooks
* 🖥️ Desktops

A interface deve ser **mobile-first**, responsiva e adaptada para diferentes tamanhos de tela.

---

# 🎨 Interface

O sistema deve possuir:

* Design moderno.
* Visual profissional.
* Navegação simples.
* Interface intuitiva.
* Boa hierarquia visual.
* Botões claros.
* Feedback visual das ações.
* Estados de carregamento, vazio e erro.
* Boa acessibilidade.

A interface deve priorizar **simplicidade e velocidade**, evitando excesso de informações desnecessárias.

---

# 🚀 MVP

A primeira versão deve priorizar:

1. **Dashboard**
2. **Agenda**
3. **Agendamento**
4. **Clientes**
5. **Serviços**
6. **WhatsApp**
7. **Site da Barbearia**
8. **Configurações**

Funcionalidades adicionais poderão ser desenvolvidas posteriormente.

---

# 🔮 Evolução futura

O projeto poderá futuramente receber:

* Backend.
* Banco de dados.
* Login e autenticação.
* Sincronização entre dispositivos.
* Notificações automáticas.
* WhatsApp API.
* Sistema de pagamentos.
* Comissões dos barbeiros.
* Controle de estoque.
* Programa de fidelidade.
* Campanhas de marketing.
* Múltiplas unidades.
* Aplicativo mobile.
* Inteligência artificial.

Essas funcionalidades **não fazem parte do MVP frontend atual** e não devem ser implementadas antecipadamente.

---

# 📌 Regra principal do projeto

O desenvolvimento deve respeitar o escopo definido neste documento.

**Não adicionar tecnologias, frameworks ou funcionalidades fora do escopo sem necessidade.**

O objetivo inicial é criar um sistema:

> **Simples, profissional, rápido, responsivo e realmente útil para a rotina do barbeiro.**
