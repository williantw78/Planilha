// ESTRUTURA CENTRAL DE DADOS DO SISTEMA (Persistido no LocalStorage)
let appData = {
    users: ["Willian", "Duda"],
    months: ["2026-06", "2026-07"], // Os meses crescem para a direita nas configurações
    expenses: [
        { id: 1, name: "Aluguel", type: "recorrente", user: "Willian", values: { "2026-06": 650.00, "2026-07": 650.00 } },
        { id: 2, name: "Água", type: "unico", user: "Duda", values: { "2026-06": 35.40 } },
        { id: 3, name: "Luz", type: "unico", user: "Willian", values: { "2026-06": 72.10, "2026-07": 85.00 } }
    ],
    incomes: [
        { id: 1, name: "Salário Willian", user: "Willian", values: { "2026-06": 1800.00, "2026-07": 1800.00 } },
        { id: 2, name: "Salário Duda", user: "Duda", values: { "2026-06": 1500.00, "2026-07": 1500.00 } }
    ]
};

let isFirstKey = true;

window.onload = function() {
    if (localStorage.getItem("finance_app_data")) {
        appData = JSON.parse(localStorage.getItem("finance_app_data"));
    }
    renderAll();
    
    // Se estivermos na página de configurações, carrega as credenciais salvas do GitHub
    if (document.getElementById("gh-user")) {
        if(localStorage.getItem("gh_user")) document.getElementById("gh-user").value = localStorage.getItem("gh_user");
        if(localStorage.getItem("gh_repo")) document.getElementById("gh-repo").value = localStorage.getItem("gh_repo");
        if(localStorage.getItem("gh_token")) document.getElementById("gh-token").value = localStorage.getItem("gh_token");
    }
};

function saveToStorage() {
    localStorage.setItem("finance_app_data", JSON.stringify(appData));
}

function formatEuro(value) {
    if (value === undefined || value === null || isNaN(value)) return "€0,00";
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatMonthLabel(monthString) {
    if (!monthString || monthString === "Nenhum mês criado") return "";
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleString('pt-PT', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

// FUNÇÃO CENTRAL DE RENDERIZAÇÃO
function renderAll() {
    if (document.getElementById("users-list")) renderUsers();
    if (document.querySelectorAll(".user-dropdown-select").length > 0) updateDropdowns();
    if (document.getElementById("dashboard-month-select")) renderMonthsSelector();
    
    // O Dashboard e as Tabelas agora dependem diretamente do mês selecionado
    updateDashboard();
    
    saveToStorage();
}

// GESTÃO DE UTILIZADORES / RESPONSÁVEIS
function renderUsers() {
    const listContainer = document.getElementById("users-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";
    appData.users.forEach(user => {
        const tag = document.createElement("div");
        tag.className = "tag";
        tag.innerHTML = `${user} <span class="remove-btn" onclick="deleteUser('${user}')">&times;</span>`;
        listContainer.appendChild(tag);
    });
}

function addUser() {
    const input = document.getElementById("new-user-name");
    const name = input.value.trim();
    if (!name) return;
    if (appData.users.includes(name)) return alert("Responsável já existe!");
    appData.users.push(name);
    input.value = "";
    renderAll();
}

function deleteUser(name) {
    if (confirm(`Remover "${name}"? Registos antigos continuam guardados.`)) {
        appData.users = appData.users.filter(u => u !== name);
        renderAll();
    }
}

function updateDropdowns() {
    document.querySelectorAll(".user-dropdown-select").forEach(select => {
        select.innerHTML = "";
        appData.users.forEach(user => {
            const opt = document.createElement("option");
            opt.value = user; opt.textContent = user;
            select.appendChild(opt);
        });
    });
}

// GESTÃO DE MESES
function addMonth() {
    const input = document.getElementById("new-month-input");
    const month = input.value;
    if (!month) return;
    if (appData.months.includes(month)) return alert("Mês já existe!");
    
    const lastActiveMonth = appData.months[appData.months.length - 1];
    appData.months.push(month);
    
    if (lastActiveMonth) {
        appData.expenses.forEach(exp => {
            if (exp.type === 'recorrente' && exp.values[lastActiveMonth] !== undefined) {
                exp.values[month] = exp.values[lastActiveMonth];
            }
        });
    }
    if (input) input.value = "";
    renderAll();
    alert("Mês adicionado com sucesso!");
}

function deleteMonth(month) {
    if (confirm(`Eliminar o mês ${formatMonthLabel(month)}? Isto removerá os valores deste mês em todos os serviços.`)) {
        appData.months = appData.months.filter(m => m !== month);
        renderAll();
    }
}

function renderMonthsSelector() {
    const select = document.getElementById("dashboard-month-select");
    if (!select) return;
    const current = select.value;
    select.innerHTML = "";
    if (appData.months.length === 0) {
        select.innerHTML = "<option>Nenhum mês criado</option>";
        return;
    }
    appData.months.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m; opt.textContent = formatMonthLabel(m);
        select.appendChild(opt);
    });
    // Tenta manter o mês selecionado anteriormente se ele ainda existir
    if (appData.months.includes(current)) {
        select.value = current;
    } else {
        select.value = appData.months[appData.months.length - 1]; // Por padrão pega o último criado (mais recente)
    }
}

// TABELA CONTAS A PAGAR (Filtrada pelo mês ativo)
function renderExpensesTable(activeMonth) {
    const table = document.getElementById("expenses-table");
    if (!table) return;
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    const tfoot = table.querySelector("tfoot");

    if (!activeMonth || activeMonth === "Nenhum mês criado") {
        thead.innerHTML = "<tr><th>Serviços</th><th>Nenhum mês selecionado</th></tr>";
        tbody.innerHTML = "<tr><td colspan='2' style='text-align:center;'>Crie um mês na página de configurações.</td></tr>";
        tfoot.innerHTML = "";
        return;
    }

    // O Cabeçalho agora mostra apenas um mês específico com a opção de o eliminar
    thead.innerHTML = `<tr>
        <th>Serviços</th>
        <th>${formatMonthLabel(activeMonth)} <button class="delete-row-btn" onclick="deleteMonth('${activeMonth}')" title="Eliminar este mês inteiro">🗑️</button></th>
    </tr>`;

    if (appData.expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;">Nenhum serviço cadastrado.</td></tr>`;
        tfoot.innerHTML = "";
        return;
    }

    tbody.innerHTML = "";
    appData.expenses.forEach(exp => {
        const tr = document.createElement("tr");
        let html = `<td><button class="delete-row-btn" onclick="deleteExpense(${exp.id})">❌</button> ${exp.name}<span class="meta-info">${exp.user} (${exp.type})</span></td>`;
        
        // Renderiza apenas o input do mês selecionado
        const val = exp.values[activeMonth] !== undefined ? exp.values[activeMonth].toFixed(2).replace('.', ',') : "0,00";
        html += `<td><input type="text" class="currency-input" data-type="expense" data-id="${exp.id}" data-month="${activeMonth}" value="${val}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" onkeydown="handleInputKeyDown(this, event)"></td>`;
        
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });

    // Total da coluna ativa
    let total = appData.expenses.reduce((acc, curr) => acc + (curr.values[activeMonth] || 0), 0);
    tfoot.innerHTML = `<tr>
        <td>TOTAL A PAGAR</td>
        <td style="text-align:right; font-family:monospace; font-weight:bold;">${formatEuro(total)}</td>
    </tr>`;
}

// TABELA VALORES A RECEBER (Filtrada pelo mês ativo)
function renderIncomesTable(activeMonth) {
    const table = document.getElementById("incomes-table");
    if (!table) return;
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    const tfoot = table.querySelector("tfoot");

    if (!activeMonth || activeMonth === "Nenhum mês criado") {
        thead.innerHTML = "<tr><th>Ganhos / Receitas</th><th>Nenhum mês selecionado</th></tr>";
        tbody.innerHTML = "<tr><td colspan='2' style='text-align:center;'>Crie um mês na página de configurações.</td></tr>";
        tfoot.innerHTML = "";
        return;
    }

    thead.innerHTML = `<tr>
        <th>Ganhos / Receitas</th>
        <th>${formatMonthLabel(activeMonth)}</th>
    </tr>`;

    if (appData.incomes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;">Nenhuma receita cadastrada.</td></tr>`;
        tfoot.innerHTML = "";
        return;
    }

    tbody.innerHTML = "";
    appData.incomes.forEach(inc => {
        const tr = document.createElement("tr");
        let html = `<td><button class="delete-row-btn" onclick="deleteIncome(${inc.id})">❌</button> ${inc.name}<span class="meta-info">${inc.user}</span></td>`;
        
        // Renderiza apenas o input do mês selecionado
        const val = inc.values[activeMonth] !== undefined ? inc.values[activeMonth].toFixed(2).replace('.', ',') : "0,00";
        html += `<td><input type="text" class="currency-input" data-type="income" data-id="${inc.id}" data-month="${activeMonth}" value="${val}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" onkeydown="handleInputKeyDown(this, event)"></td>`;
        
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });

    // Total do mês ativo
    let total = appData.incomes.reduce((acc, curr) => acc + (curr.values[activeMonth] || 0), 0);
    tfoot.innerHTML = `<tr>
        <td>TOTAL A RECEBER</td>
        <td style="text-align:right; font-family:monospace; font-weight:bold;">${formatEuro(total)}</td>
    </tr>`;
}

// CRIAÇÃO INLINE (PÁGINA CONFIG)
function saveNewExpenseInline() {
    const name = document.getElementById("exp-name").value.trim();
    const type = document.getElementById("exp-type").value;
    const user = document.getElementById("exp-user").value;
    
    if (!name || !user) return alert("Por favor, preencha o nome do serviço e selecione um responsável!");
    
    const newId = appData.expenses.length > 0 ? Math.max(...appData.expenses.map(e => e.id)) + 1 : 1;
    appData.expenses.push({ id: newId, name, type, user, values: {} });
    
    document.getElementById("exp-name").value = "";
    renderAll();
    alert(`Serviço "${name}" adicionado com sucesso!`);
}

function deleteExpense(id) {
    if (confirm("Eliminar este serviço?")) { appData.expenses = appData.expenses.filter(e => e.id !== id); renderAll(); }
}

function saveNewIncomeInline() {
    const name = document.getElementById("inc-name").value.trim();
    const user = document.getElementById("inc-user").value;
    
    if (!name || !user) return alert("Por favor, preencha a origem da receita e selecione um responsável!");
    
    const newId = appData.incomes.length > 0 ? Math.max(...appData.incomes.map(i => i.id)) + 1 : 1;
    appData.incomes.push({ id: newId, name, user, values: {} });
    
    document.getElementById("inc-name").value = "";
    renderAll();
    alert(`Receita "${name}" adicionada com sucesso!`);
}

function deleteIncome(id) {
    if (confirm("Eliminar esta receita?")) { appData.incomes = appData.incomes.filter(i => i.id !== id); renderAll(); }
}

// GESTÃO DOS INPUTS MONETÁRIOS
function handleInputFocus(input) {
    isFirstKey = true;
    setTimeout(() => input.select(), 50);
}

function handleInputKeyDown(input, event) {
    if (["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        if (event.key === "Enter") input.blur();
        return;
    }
    if (!/[0-9.,]/.test(event.key)) { event.preventDefault(); return; }
    if (isFirstKey) { input.value = ""; isFirstKey = false; }
}

function handleInputBlur(input) {
    let raw = input.value.trim().replace(/,/g, '.');
    let num = parseFloat(raw);
    if (isNaN(num) || num < 0) num = 0.00;

    const type = input.dataset.type;
    const id = parseInt(input.dataset.id);
    const m = input.dataset.month;

    if (type === "expense") {
        let item = appData.expenses.find(e => e.id === id);
        if (item) item.values[m] = num;
    } else {
        let item = appData.incomes.find(i => i.id === id);
        if (item) item.values[m] = num;
    }

    // Salva os dados sem re-renderizar tudo imediatamente para não perder o foco do input de forma abrupta
    saveToStorage();

    // Atualiza apenas os blocos de totais e tabelas mantendo o contexto do mês ativo
    const activeMonth = document.getElementById("dashboard-month-select") ? document.getElementById("dashboard-month-select").value : m;
    renderExpensesTable(activeMonth);
    renderIncomesTable(activeMonth);
    updateDashboard();
}

// DASHBOARD, RESUMO MENSAL E ACIONADOR DE FILTROS DAS TABELAS
function updateDashboard() {
    const select = document.getElementById("dashboard-month-select");
    
    // Se o select não existe (ex: estamos na config.html), pegamos o último mês disponível apenas para fins de cálculo interno
    const m = select ? select.value : appData.months[appData.months.length - 1];
    
    // Manda renderizar as duas tabelas principais com base no mês ativo detetado
    if (document.getElementById("expenses-table")) renderExpensesTable(m);
    if (document.getElementById("incomes-table")) renderIncomesTable(m);

    if (!m || m === "Nenhum mês criado") {
        const box = document.getElementById("dash-balance-box");
        if(box) box.className = "dash-box balance-box";
        return;
    }

    let tInc = appData.incomes.reduce((acc, c) => acc + (c.values[m] || 0), 0);
    let tExp = appData.expenses.reduce((acc, c) => acc + (c.values[m] || 0), 0);
    let bal = tInc - tExp;

    if(document.getElementById("dash-total-income")) document.getElementById("dash-total-income").textContent = formatEuro(tInc);
    if(document.getElementById("dash-total-expense")) document.getElementById("dash-total-expense").textContent = formatEuro(tExp);
    if(document.getElementById("dash-balance-value")) document.getElementById("dash-balance-value").textContent = formatEuro(bal);
    
    const balanceBox = document.getElementById("dash-balance-box");
    if (balanceBox) {
        balanceBox.className = "dash-box balance-box " + (bal >= 0 ? "balance-positive" : "balance-negative");
    }

    // Divisão por Pessoa
    const tableBreakdown = document.getElementById("breakdown-table");
    if (tableBreakdown) {
        const tbody = tableBreakdown.querySelector("tbody");
        tbody.innerHTML = "";
        appData.users.forEach(u => {
            let pInc = appData.incomes.filter(i => i.user === u).reduce((acc, c) => acc + (c.values[m] || 0), 0);
            let pExp = appData.expenses.filter(e => e.user === u).reduce((acc, c) => acc + (c.values[m] || 0), 0);
            let pBal = pInc - pExp;

            tbody.innerHTML += `<tr>
                <td><strong>${u}</strong></td>
                <td style="color:var(--success); text-align:right; font-family:monospace;">${formatEuro(pInc)}</td>
                <td style="color:var(--danger); text-align:right; font-family:monospace;">${formatEuro(pExp)}</td>
                <td style="text-align:right; font-family:monospace; font-weight:bold; color:${pBal >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatEuro(pBal)}</td>
            </tr>`;
        });
    }
}

// --- INTEGRACAO COM GITHUB E REQUISICOES DE BACKUP ---
function saveGitHubConfig() {
    localStorage.setItem("gh_user", document.getElementById("gh-user").value.trim());
    localStorage.setItem("gh_repo", document.getElementById("gh-repo").value.trim());
    localStorage.setItem("gh_token", document.getElementById("gh-token").value.trim());
    alert("Configurações do GitHub gravadas localmente!");
}

function getGitHubCredentials() {
    return {
        user: localStorage.getItem("gh_user"),
        repo: localStorage.getItem("gh_repo"),
        token: localStorage.getItem("gh_token"),
        file: "backup.txt"
    };
}

async function saveToGitHub() {
    const { user, repo, token, file } = getGitHubCredentials();
    if (!user || !repo || !token) return alert("Por favor, configura o acesso ao GitHub primeiro.");

    const url = `https://api.github.com/repos/${user}/${repo}/contents/${file}`;
    const dataStr = JSON.stringify(appData, null, 4);
    const contentBase64 = btoa(unescape(encodeURIComponent(dataStr)));

    try {
        let sha = "";
        const resGet = await fetch(url, { headers: { "Authorization": `token ${token}` } });
        if (resGet.ok) {
            const fileInfo = await resGet.json();
            sha = fileInfo.sha;
        }

        const resPut = await fetch(url, {
            method: "PUT",
            headers: { "Authorization": `token ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Atualização de dados via App Financeiro",
                content: contentBase64,
                sha: sha || undefined
            })
        });

        if (resPut.ok) alert("Sucesso! Dados guardados no GitHub.");
        else alert("Erro ao gravar: " + (await resPut.json()).message);
    } catch (error) {
        console.error(error);
        alert("Erro de rede ao tentar conectar ao GitHub.");
    }
}

async function loadFromGitHub() {
    const { user, repo, token, file } = getGitHubCredentials();
    if (!user || !repo || !token) return alert("Por favor, configura o acesso ao GitHub primeiro.");

    const url = `https://api.github.com/repos/${user}/${repo}/contents/${file}?timestamp=${new Date().getTime()}`;

    try {
        const response = await fetch(url, { headers: { "Authorization": `token ${token}` } });
        if (!response.ok) {
            alert(response.status === 404 ? "Arquivo backup.txt não encontrado." : "Erro ao carregar do GitHub.");
            return;
        }

        const fileInfo = await response.json();
        const decodedText = decodeURIComponent(escape(atob(fileInfo.content)));
        const parsedData = JSON.parse(decodedText);

        if (parsedData.users && parsedData.months) {
            if (confirm("Desejas substituir TODOS os dados locais pelos salvos no GitHub?")) {
                appData = parsedData;
                renderAll();
                alert("Dados sincronizados com sucesso a partir do GitHub!");
            }
        } else alert("O arquivo no GitHub não contém um formato válido.");
    } catch (error) {
        console.error(error);
        alert("Erro ao ler dados da nuvem.");
    }
}

function exportToTxt() {
    const dataStr = JSON.stringify(appData, null, 4);
    const blob = new Blob([dataStr], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `backup-financeiro-${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
}

function importFromTxt(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            if (parsedData.users && parsedData.months) {
                if (confirm("Substituir todos os dados atuais na tela pelo arquivo?")) {
                    appData = parsedData;
                    renderAll();
                    alert("Dados importados com sucesso!");
                    document.getElementById("import-file").value = "";
                }
            } else alert("Arquivo inválido.");
        } catch (error) { alert("Erro ao ler o arquivo txt."); }
    };
    reader.readAsText(file);
}