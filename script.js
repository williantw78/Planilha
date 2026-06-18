// ESTRUTURA CENTRAL DE DADOS DO SISTEMA (Persistido no LocalStorage)
let appData = {
    users: ["Willian", "Duda"],
    months: ["2026-06", "2026-07"], // Alterada a ordem inicial para os meses crescerem para a direita
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
};

function saveToStorage() {
    localStorage.setItem("finance_app_data", JSON.stringify(appData));
}

function formatEuro(value) {
    if (value === undefined || value === null || isNaN(value)) return "€0,00";
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatMonthLabel(monthString) {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleString('pt-PT', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

function renderAll() {
    renderUsers();
    updateDropdowns();
    renderMonthsSelector();
    renderExpensesTable();
    renderIncomesTable();
    updateDashboard();
    saveToStorage();
}

// GESTÃO DE UTILIZADORES
function renderUsers() {
    const listContainer = document.getElementById("users-list");
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

// GESTÃO DE MESES (ADICIONAR À DIREITA)
function addMonth() {
    const input = document.getElementById("new-month-input");
    const month = input.value;
    if (!month) return;
    if (appData.months.includes(month)) return alert("Mês já existe!");
    
    // Captura o último mês da tabela antes da inserção
    const lastActiveMonth = appData.months[appData.months.length - 1];
    
    appData.months.push(month); // Adiciona ao final da lista (extrema direita)
    
    // Copia os valores recorrentes do mês anterior para o novo mês à direita
    if (lastActiveMonth) {
        appData.expenses.forEach(exp => {
            if (exp.type === 'recorrente' && exp.values[lastActiveMonth] !== undefined) {
                exp.values[month] = exp.values[lastActiveMonth];
            }
        });
    }
    renderAll();
}

function deleteMonth(month) {
    if (confirm(`Eliminar o mês ${formatMonthLabel(month)}?`)) {
        appData.months = appData.months.filter(m => m !== month);
        renderAll();
    }
}

function renderMonthsSelector() {
    const select = document.getElementById("dashboard-month-select");
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
    if (appData.months.includes(current)) select.value = current;
}

// TABELA CONTAS A PAGAR
function renderExpensesTable() {
    const table = document.getElementById("expenses-table");
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    const tfoot = table.querySelector("tfoot");

    thead.innerHTML = `<tr><th>Serviços</th>${appData.months.map(m => `<th>${formatMonthLabel(m)} <button class="delete-row-btn" onclick="deleteMonth('${m}')">🗑️</button></th>`).join('')}</tr>`;

    if (appData.expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${appData.months.length + 1}" style="text-align:center;">Nenhum serviço.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    appData.expenses.forEach(exp => {
        const tr = document.createElement("tr");
        let html = `<td><button class="delete-row-btn" onclick="deleteExpense(${exp.id})">❌</button> ${exp.name}<span class="meta-info">${exp.user} (${exp.type})</span></td>`;
        appData.months.forEach(m => {
            const val = exp.values[m] !== undefined ? exp.values[m].toFixed(2).replace('.', ',') : "0,00";
            html += `<td><input type="text" class="currency-input" data-type="expense" data-id="${exp.id}" data-month="${m}" value="${val}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" onkeydown="handleInputKeyDown(this, event)"></td>`;
        });
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });

    let footHtml = `<tr><td>TOTAL A PAGAR</td>`;
    appData.months.forEach(m => {
        let total = appData.expenses.reduce((acc, curr) => acc + (curr.values[m] || 0), 0);
        footHtml += `<td style="text-align:right; font-family:monospace;">${formatEuro(total)}</td>`;
    });
    tfoot.innerHTML = footHtml + "</tr>";
}

// MODAIS EXPENSES
function openExpenseModal() { document.getElementById("expense-modal").style.display = "flex"; }
function closeExpenseModal() { document.getElementById("expense-modal").style.display = "none"; }
function saveNewExpense() {
    const name = document.getElementById("exp-name").value.trim();
    const type = document.getElementById("exp-type").value;
    const user = document.getElementById("exp-user").value;
    if (!name || !user) return alert("Preencha tudo!");
    const newId = appData.expenses.length > 0 ? Math.max(...appData.expenses.map(e => e.id)) + 1 : 1;
    appData.expenses.push({ id: newId, name, type, user, values: {} });
    document.getElementById("exp-name").value = "";
    closeExpenseModal();
    renderAll();
}
function deleteExpense(id) {
    if (confirm("Eliminar este serviço?")) { appData.expenses = appData.expenses.filter(e => e.id !== id); renderAll(); }
}

// TABELA VALORES A RECEBER
function renderIncomesTable() {
    const table = document.getElementById("incomes-table");
    const tbody = table.querySelector("tbody");
    const tfoot = table.querySelector("tfoot");
    table.querySelector("thead").innerHTML = `<tr><th>Ganhos / Receitas</th>${appData.months.map(m => `<th>${formatMonthLabel(m)}</th>`).join('')}</tr>`;

    if (appData.incomes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${appData.months.length + 1}" style="text-align:center;">Nenhuma receita.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    appData.incomes.forEach(inc => {
        const tr = document.createElement("tr");
        let html = `<td><button class="delete-row-btn" onclick="deleteIncome(${inc.id})">❌</button> ${inc.name}<span class="meta-info">${inc.user}</span></td>`;
        appData.months.forEach(m => {
            const val = inc.values[m] !== undefined ? inc.values[m].toFixed(2).replace('.', ',') : "0,00";
            html += `<td><input type="text" class="currency-input" data-type="income" data-id="${inc.id}" data-month="${m}" value="${val}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" onkeydown="handleInputKeyDown(this, event)"></td>`;
        });
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });

    let footHtml = `<tr><td>TOTAL A RECEBER</td>`;
    appData.months.forEach(m => {
        let total = appData.incomes.reduce((acc, curr) => acc + (curr.values[m] || 0), 0);
        footHtml += `<td style="text-align:right; font-family:monospace;">${formatEuro(total)}</td>`;
    });
    tfoot.innerHTML = footHtml + "</tr>";
}

// MODAIS INCOME
function openIncomeModal() { document.getElementById("income-modal").style.display = "flex"; }
function closeIncomeModal() { document.getElementById("income-modal").style.display = "none"; }
function saveNewIncome() {
    const name = document.getElementById("inc-name").value.trim();
    const user = document.getElementById("inc-user").value;
    if (!name || !user) return alert("Preencha tudo!");
    const newId = appData.incomes.length > 0 ? Math.max(...appData.incomes.map(i => i.id)) + 1 : 1;
    appData.incomes.push({ id: newId, name, user, values: {} });
    document.getElementById("inc-name").value = "";
    closeIncomeModal();
    renderAll();
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

    input.value = num.toFixed(2).replace('.', ',');
    renderExpensesTable();
    renderIncomesTable();
    updateDashboard();
    saveToStorage();
}

// DASHBOARD E RESUMO MENSAL
function updateDashboard() {
    const m = document.getElementById("dashboard-month-select").value;
    if (!m || m === "Nenhum mês criado") {
        document.getElementById("dash-balance-box").className = "dash-box balance-box";
        return;
    }

    let tInc = appData.incomes.reduce((acc, c) => acc + (c.values[m] || 0), 0);
    let tExp = appData.expenses.reduce((acc, c) => acc + (c.values[m] || 0), 0);
    let bal = tInc - tExp;

    document.getElementById("dash-total-income").textContent = formatEuro(tInc);
    document.getElementById("dash-total-expense").textContent = formatEuro(tExp);
    document.getElementById("dash-balance-value").textContent = formatEuro(bal);
    document.getElementById("dash-balance-box").className = "dash-box balance-box " + (bal >= 0 ? "balance-positive" : "balance-negative");

    // Divisão por Pessoa
    const tbody = document.getElementById("breakdown-table").querySelector("tbody");
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

/* EXPORTAÇÃO TXT
function exportToTxt() {
    let t = "==================================================\n   RELATÓRIO FINANCEIRO EXTRAÍDO DO SISTEMA\n==================================================\n\n";
    t += "1. CONTAS A PAGAR (SERVIÇOS)\n";
    appData.expenses.forEach(e => {
        t += `Serviço: ${e.name} [${e.user} - ${e.type}]\n`;
        appData.months.forEach(m => t += `   ${formatMonthLabel(m)}: ${formatEuro(e.values[m])}\n`);
    });
    t += "\n2. VALORES A RECEBER\n";
    appData.incomes.forEach(i => {
        t += `Receita: ${i.name} [${i.user}]\n`;
        appData.months.forEach(m => t += `   ${formatMonthLabel(m)}: ${formatEuro(i.values[m])}\n`);
    });
    
    const blob = new Blob([t], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `relatorio-financeiro.txt`;
    link.click();
} */
// EXPORTAÇÃO PARA RELATÓRIO TXT (Formato estruturado seguro para leitura)
function exportToTxt() {
    // Convertemos os dados atuais do sistema numa string de texto organizada
    const dataStr = JSON.stringify(appData, null, 4);
    
    const blob = new Blob([dataStr], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; 
    link.download = `backup-financeiro-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// IMPORTAÇÃO DE ARQUIVO TXT
function importFromTxt(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    // Esta função roda assim que o navegador terminar de ler o arquivo de texto
    reader.onload = function(e) {
        try {
            const textContent = e.target.result;
            // Tenta converter o texto de volta para o objeto do sistema
            const parsedData = JSON.parse(textContent);
            
            // Validação simples para garantir que o arquivo tem a estrutura correta
            if (parsedData.users && parsedData.months && parsedData.expenses && parsedData.incomes) {
                if (confirm("Atenção: Importar este arquivo irá substituir TODOS os dados atuais na tela. Desejas continuar?")) {
                    appData = parsedData;
                    renderAll(); // Atualiza toda a tela com os novos dados
                    alert("Dados importados com sucesso!");
                    // Limpa o campo do arquivo para permitir importar o mesmo arquivo de novo se necessário
                    document.getElementById("import-file").value = "";
                }
            } else {
                alert("Erro: O arquivo .txt selecionado não possui uma estrutura de backup válida deste sistema.");
            }
        } catch (error) {
            alert("Erro ao ler o arquivo. Certifica-te de que selecionaste um arquivo .txt de backup gerado por este sistema.");
            console.error(error);
        }
    };

    reader.readAsText(file);
}

// --- INTEGRAÇÃO COM A API DO GITHUB ---

// Carrega as configurações guardadas do GitHub ao abrir a página (se existirem)
window.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem("gh_user")) document.getElementById("gh-user").value = localStorage.getItem("gh_user");
    if(localStorage.getItem("gh_repo")) document.getElementById("gh-repo").value = localStorage.getItem("gh_repo");
    if(localStorage.getItem("gh_token")) document.getElementById("gh-token").value = localStorage.getItem("gh_token");
});

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
        file: "backup.txt" // Nome do arquivo dentro do repositório
    };
}

// 1. ENVIAR / GRAVAR NO GITHUB
async function saveToGitHub() {
    const { user, repo, token, file } = getGitHubCredentials();
    if (!user || !repo || !token) return alert("Por favor, configura o acesso ao GitHub primeiro.");

    const url = `https://api.github.com/repos/${user}/${repo}/contents/${file}`;
    const dataStr = JSON.stringify(appData, null, 4);
    
    // O GitHub exige converter o texto para Base64 antes de enviar
    const contentBase64 = btoa(unescape(encodeURIComponent(dataStr)));

    try {
        // Passo A: Precisamos saber se o arquivo já existe para pegar o "sha" (identificador de versão)
        let sha = "";
        const resGet = await fetch(url, {
            headers: { "Authorization": `token ${token}` }
        });
        
        if (resGet.ok) {
            const fileInfo = await resGet.json();
            sha = fileInfo.sha; // Se o arquivo existe, pegamos o SHA dele para poder atualizar
        }

        // Passo B: Enviar a atualização
        const resPut = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Atualização de dados via App Financeiro",
                content: contentBase64,
                sha: sha || undefined // Se for um arquivo novo, não envia SHA
            })
        });

        if (resPut.ok) {
            alert("Sucesso! Dados guardados no GitHub.");
        } else {
            const errData = await resPut.json();
            alert("Erro ao gravar: " + errData.message);
        }
    } catch (error) {
        console.error(error);
        alert("Erro de rede ao tentar conectar ao GitHub.");
    }
}

// 2. PUXAR / CARREGAR DO GITHUB
async function loadFromGitHub() {
    const { user, repo, token, file } = getGitHubCredentials();
    if (!user || !repo || !token) return alert("Por favor, configura o acesso ao GitHub primeiro.");

    const url = `https://api.github.com/repos/${user}/${repo}/contents/${file}?timestamp=${new Date().getTime()}`;

    try {
        const response = await fetch(url, {
            headers: { "Authorization": `token ${token}` }
        });

        if (!response.ok) {
            if (response.status === 404) alert("Arquivo backup.txt não foi encontrado no repositório.");
            else alert("Erro ao carregar dados do GitHub.");
            return;
        }

        const fileInfo = await response.json();
        
        // O GitHub responde em Base64, precisamos decodificar de volta para texto
        const decodedText = decodeURIComponent(escape(atob(fileInfo.content)));
        const parsedData = JSON.parse(decodedText);

        if (parsedData.users && parsedData.months) {
            if (confirm("Desejas substituir TODOS os dados atuais da tela pelos guardados no GitHub?")) {
                appData = parsedData;
                renderAll();
                alert("Dados sincronizados com sucesso a partir do GitHub!");
            }
        } else {
            alert("O arquivo no GitHub não contém um formato válido.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao ler dados da nuvem.");
    }
}