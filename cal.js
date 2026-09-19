// ================================================================
// ==================== CONFIGURAÇÕES INICIAIS ====================
// ================================================================

let MINUTOS_DIA_SEMANA = parseInt(localStorage.getItem('configJornada')) || 480;
let MINUTOS_SABADO = parseInt(localStorage.getItem('configSabado')) || 240;
let TOLERANCIA_MINUTOS = parseInt(localStorage.getItem('configTolerancia')) || 15;
let LIMITE_HORAS_EXTRAS = parseInt(localStorage.getItem('configLimiteExtra')) || 120;
const SNPTC = ['XFE1','','XBR1','XLU1','XWE1','XSU1','XHU1','0000'];
let MODO_MOBILE = localStorage.getItem('configMobile') || 'auto';

let chartInstance = null;
let valorHoraAtual = 0;
let idRegistroEmEdicao = null;   // guarda o ID do registro sendo editado
// ================================================================
// ==================== TOAST ====================
// ================================================================

function mostrarToast(mensagem, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const icons = { success: '', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[tipo] || 'ℹ️'}</span> ${mensagem}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

// ================================================================
// ==================== MENU ====================
// ================================================================

function abrirMenu() {
    document.getElementById("menu").classList.toggle("ativo");
}

document.addEventListener('click', function(event) {
    const menu = document.getElementById('menu');
    const btn = document.getElementById('icone');
    if (!menu.contains(event.target) && !btn.contains(event.target)) {
        menu.classList.remove('ativo');
    }
});

// ================================================================
// ==================== TEMA ====================
// ================================================================

function toggleTema() {
    document.body.classList.toggle("dark");
    const tema = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("tema", tema);
    mostrarToast(tema === 'dark' ? '🌙 Modo escuro ativado' : '☀️ Modo claro ativado', 'info');
}

// ================================================================
// ==================== FUNÇÕES DE VALOR ====================
// ================================================================

function parseMoney(str) {
    if (!str) return 0;
    let cleaned = str.replace(/[R$\s.]/g, '').replace(',', '.');
    let num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function formatMoney(value) {
    return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcularValorHora() {
    const salario = parseMoney(document.getElementById('salarioInputModal').value);
    const carga = parseFloat(document.getElementById('cargaInputModal').value) || 220;
    
    if (salario > 0 && carga > 0) {
        valorHoraAtual = salario / carga;
        document.getElementById('valorHoraInputModal').value = formatMoney(valorHoraAtual);
        document.getElementById('rValorHora').textContent = formatMoney(valorHoraAtual);
        return valorHoraAtual;
    }
    return 0;
}

function calcularValorExtra(minutos, isFeriado = false) {
    if (minutos <= 0 || valorHoraAtual <= 0) return 0;
    const horas = minutos / 60;
    const multiplicador = isFeriado ? 2.0 : 1.5;
    return valorHoraAtual * horas * multiplicador;
}

// ================================================================
// ==================== MODAL REAIS ====================
// ================================================================

function abrirModalReais() {
    const modal = document.getElementById('modalReais');
    modal.classList.add('ativo');
    sincronizarValoresModal();
    atualizarModalReais();
}

function fecharModalReais() {
    document.getElementById('modalReais').classList.remove('ativo');
}

document.getElementById('modalReais').addEventListener('click', function(e) {
    if (e.target === this) {
        fecharModalReais();
    }
});

function sincronizarValoresModal() {
    const salarioSalvo = localStorage.getItem('salarioModal') || '1621,00';
    const cargaSalva = localStorage.getItem('cargaModal') || '220';
    
    document.getElementById('salarioInputModal').value = salarioSalvo;
    document.getElementById('cargaInputModal').value = cargaSalva;
    
    calcularValorHora();
}

function salvarValoresModal() {
    const salario = document.getElementById('salarioInputModal').value;
    const carga = document.getElementById('cargaInputModal').value;
    localStorage.setItem('salarioModal', salario);
    localStorage.setItem('cargaModal', carga);
}

function atualizarModalReais() {
    salvarValoresModal();
    calcularValorHora();
    
    const linhas = document.querySelectorAll("#tabelaBody tr");
    let totalExtra50 = 0;
    let totalExtra100 = 0;
    let detalhes = [];
    
    linhas.forEach((linha, index) => {
        const isFeriado = linha.querySelector(".feriado").checked;
        const extraTexto = linha.querySelector(".extra-dia")?.innerText || '00:00';
        const totalTexto = linha.querySelector(".total-dia")?.innerText || '00:00';
        const entrada = linha.querySelector(".entrada")?.value;
        const saida = linha.querySelector(".saida")?.value;
        const nota = linha.querySelector(".nota-dia")?.value || '';
        
        const extraMinutos = hToM(extraTexto) || 0;
        const totalMinutos = hToM(totalTexto) || 0;
        
        let valor = 0;
        let tipo = '';
        
        if (entrada && saida) {
            if (isFeriado && totalMinutos > 0) {
                valor = calcularValorExtra(totalMinutos, true);
                totalExtra100 += valor;
                tipo = '100%';
            } else if (extraMinutos > 0) {
                valor = calcularValorExtra(extraMinutos, false);
                totalExtra50 += valor;
                tipo = '50%';
            }
            
            if (valor > 0 || totalMinutos > 0) {
                detalhes.push({
                    dia: index + 1,
                    total: totalTexto,
                    extra: extraTexto,
                    valor: formatMoney(valor),
                    tipo: tipo,
                    nota: nota,
                    isFeriado: isFeriado
                });
            }
        }
    });
    
    document.getElementById('rValorHora').textContent = formatMoney(valorHoraAtual);
    document.getElementById('rExtra50').textContent = formatMoney(totalExtra50);
    document.getElementById('rExtra100').textContent = formatMoney(totalExtra100);
    document.getElementById('rTotal').textContent = formatMoney(totalExtra50 + totalExtra100);
    
    const listaContainer = document.getElementById('listaDiasReais');
    if (detalhes.length === 0) {
        listaContainer.innerHTML = '<div style="text-align:center;opacity:0.5;padding:10px;">Nenhum dado de hora extra encontrado</div>';
    } else {
        let html = '';
        detalhes.forEach(d => {
            const cor = d.isFeriado ? '#f59e0b' : '#16a34a';
            html += `
                <div class="linha-detalhe">
                    <span><strong>Dia ${String(d.dia).padStart(2, '0')}</strong> 
                        ${d.nota ? `<span style="opacity:0.5;font-size:12px;">(${d.nota})</span>` : ''}
                    </span>
                    <span>
                        ${d.total} 
                        ${d.extra !== '00:00' ? `<span style="color:${cor};font-weight:600;">(+${d.extra})</span>` : ''}
                        <span style="font-weight:600;margin-left:10px;">${d.valor}</span>
                    </span>
                </div>
            `;
        });
        listaContainer.innerHTML = html;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('salarioInputModal').addEventListener('input', function() {
        calcularValorHora();
        atualizarModalReais();
    });
    document.getElementById('cargaInputModal').addEventListener('input', function() {
        calcularValorHora();
        atualizarModalReais();
    });
});

// ================================================================
// ==================== INICIALIZAÇÃO ====================
// ================================================================

window.onload = function() {
    if (localStorage.getItem("tema") === "dark") {
        document.body.classList.add("dark");
    }
    
    // Tela de login: se já autenticou nesta sessão, esconde
    if (sessionStorage.getItem('autenticado') === 'true') {
        document.getElementById('telaLogin').classList.add('escondida');
    } else {
        const campo = document.getElementById('senhaLogin');
        if (campo) campo.focus();
    }

    gerarTabela();
    configurarRegistroAuto();
    configurarEventosTempoReal();
    carregarRegistro();
    aplicarConfigMobile();
    atualizarStatsResumo();
    sincronizarValoresModal();
    configurarAvancoAutomatico();
};

// ================================================================
// ==================== GERAR TABELA ====================
// ================================================================

function gerarTabela() {
    const tabela = document.getElementById("tabelaBody");
    tabela.innerHTML = '';
    for(let i = 1; i <= 31; i++){
        tabela.innerHTML += `
            <tr id="dia-${i}">
                <td><input type="checkbox" class="selecionar-dia" data-dia="${i}" onchange="atualizarSelecaoTodos()"></td>
                <td><strong>${String(i).padStart(2, '0')}</strong></td>
                <td><input type="time" class="entrada" data-dia="${i}"></td>
                <td><input type="time" class="saidaAlmoco" data-dia="${i}"></td>
                <td><input type="time" class="voltaAlmoco" data-dia="${i}"></td>
                <td><input type="time" class="saida" data-dia="${i}"></td>
                <td><input type="checkbox" class="isSabado" onchange="marcarLinha(${i})"></td>
                <td><input type="checkbox" class="feriado" onchange="marcarLinha(${i})"></td>
                <td class="total-dia">00:00</td>
                <td class="extra-dia">00:00</td>
                <td class="valor-dia">R$ 0,00</td>
                <td class="status-dia">-</td>
                <td><input type="text" class="nota-dia" placeholder="Obs..." style="width:70px;font-size:11px;padding:4px;"></td>
            </tr>
        `;
    }
}

// ================================================================
// ==================== AVANÇO AUTOMÁTICO ====================
// ================================================================

function configurarAvancoAutomatico() {
    const ordem = ['entrada', 'saidaAlmoco', 'voltaAlmoco', 'saida'];
    
    document.addEventListener('input', function(e) {
        const input = e.target;
        if (input.tagName !== 'INPUT' || input.type !== 'time') return;
        if (!input.classList.contains('entrada') && !input.classList.contains('saidaAlmoco') &&
            !input.classList.contains('voltaAlmoco') && !input.classList.contains('saida')) return;
        
        const chkAvancar = document.getElementById('chkAvancarAutomatico');
        if (!chkAvancar || !chkAvancar.checked) return;
        
        if (input.value.length === 5) {
            const linha = input.closest('tr');
            if (!linha) return;
            
            const classes = Array.from(input.classList);
            let idx = -1;
            for (let i = 0; i < ordem.length; i++) {
                if (classes.includes(ordem[i])) {
                    idx = i;
                    break;
                }
            }
            if (idx === -1) return;
            
            let proximo = null;
            
            if (idx < ordem.length - 1) {
                const proximoNome = ordem[idx + 1];
                proximo = linha.querySelector('.' + proximoNome);
            } else {
                const diaAtual = parseInt(linha.id.replace('dia-', ''));
                const proximaLinha = document.getElementById(`dia-${diaAtual + 1}`);
                
                if (proximaLinha) {
                    proximo = proximaLinha.querySelector('.entrada');
                } else {
                    mostrarToast(' Último dia preenchido!', 'info');
                    return;
                }
            }
            
            if (proximo) {
                setTimeout(() => {
                    proximo.focus();
                    proximo.select();
                }, 600);
            }
        }
    });
}

// ================================================================
// ==================== SELEÇÃO DE DIAS ====================
// ================================================================

function toggleSelecionarTodos() {
    const checked = document.getElementById('selecionarTodos').checked;
    document.querySelectorAll('.selecionar-dia').forEach(cb => {
        cb.checked = checked;
        const tr = cb.closest('tr');
        if (tr) {
            if (checked) tr.classList.add('selecionado');
            else tr.classList.remove('selecionado');
        }
    });
}

function atualizarSelecaoTodos() {
    const todos = document.querySelectorAll('.selecionar-dia');
    const marcados = document.querySelectorAll('.selecionar-dia:checked');
    const selecionarTodos = document.getElementById('selecionarTodos');
    selecionarTodos.checked = todos.length === marcados.length && todos.length > 0;
    
    todos.forEach(cb => {
        const tr = cb.closest('tr');
        if (tr) {
            if (cb.checked) tr.classList.add('selecionado');
            else tr.classList.remove('selecionado');
        }
    });
}

function limparSelecao() {
    document.querySelectorAll('.selecionar-dia').forEach(cb => {
        cb.checked = false;
        const tr = cb.closest('tr');
        if (tr) tr.classList.remove('selecionado');
    });
    document.getElementById('selecionarTodos').checked = false;
    fecharModal('modalMovimentacao');
    mostrarToast('🧹 Seleção limpa', 'info');
}

function getDiasSelecionados() {
    const dias = [];
    document.querySelectorAll('.selecionar-dia:checked').forEach(cb => {
        dias.push(parseInt(cb.dataset.dia));
    });
    return dias;
}

// ================================================================
// ==================== PREENCHER SELECIONADOS ====================
// ================================================================

function preencherSelecionados() {
    const diaOrigem = parseInt(document.getElementById('diaOrigem').value);
    if (diaOrigem < 1 || diaOrigem > 31) {
        mostrarToast(' Dia de origem inválido!', 'error');
        return;
    }

    const diasDestino = getDiasSelecionados();
    if (diasDestino.length === 0) {
        mostrarToast('Selecione pelo menos um dia para preencher!', 'warning');
        return;
    }

    const linhaOrigem = document.getElementById(`dia-${diaOrigem}`);
    if (!linhaOrigem) {
        mostrarToast(' Dia de origem não encontrado!', 'error');
        return;
    }

    const entrada = linhaOrigem.querySelector(".entrada").value;
    const saidaAlmoco = linhaOrigem.querySelector(".saidaAlmoco").value;
    const voltaAlmoco = linhaOrigem.querySelector(".voltaAlmoco").value;
    const saida = linhaOrigem.querySelector(".saida").value;
    const nota = linhaOrigem.querySelector(".nota-dia")?.value || '';

    if (!entrada && !saida) {
        mostrarToast('O dia de origem não tem horários para copiar!', 'warning');
        return;
    }

    let copiados = 0;
    diasDestino.forEach(dia => {
        const linhaDestino = document.getElementById(`dia-${dia}`);
        if (linhaDestino) {
            linhaDestino.querySelector(".entrada").value = entrada;
            linhaDestino.querySelector(".saidaAlmoco").value = saidaAlmoco;
            linhaDestino.querySelector(".voltaAlmoco").value = voltaAlmoco;
            linhaDestino.querySelector(".saida").value = saida;
            if (linhaDestino.querySelector(".nota-dia")) {
                linhaDestino.querySelector(".nota-dia").value = nota;
            }
            calcularLinha(linhaDestino);
            copiados++;
        }
    });

    fecharModal('modalMovimentacao');
    mostrarToast(` Horários copiados para ${copiados} dia(s) selecionado(s)!`, 'success');
    atualizarStatsResumo();
}

// ================================================================
// ==================== MOVER HORÁRIO ====================
// ================================================================

function moverHorario() {
    const diaOrigem = parseInt(document.getElementById('diaOrigem').value);
    const diaDestino = parseInt(document.getElementById('diaDestino').value);
    const limparOrigem = document.getElementById('limparOrigemAoMover').checked;

    if (diaOrigem < 1 || diaOrigem > 31 || diaDestino < 1 || diaDestino > 31) {
        mostrarToast('️ Dias inválidos!', 'error');
        return;
    }

    if (diaOrigem === diaDestino) {
        mostrarToast('️ Origem e destino não podem ser o mesmo dia!', 'warning');
        return;
    }

    const linhaOrigem = document.getElementById(`dia-${diaOrigem}`);
    const linhaDestino = document.getElementById(`dia-${diaDestino}`);

    if (!linhaOrigem || !linhaDestino) {
        mostrarToast('️ Dia de origem ou destino não encontrado!', 'error');
        return;
    }

    const entrada = linhaOrigem.querySelector(".entrada").value;
    const saidaAlmoco = linhaOrigem.querySelector(".saidaAlmoco").value;
    const voltaAlmoco = linhaOrigem.querySelector(".voltaAlmoco").value;
    const saida = linhaOrigem.querySelector(".saida").value;
    const isSabado = linhaOrigem.querySelector(".isSabado").checked;
    const isFeriado = linhaOrigem.querySelector(".feriado").checked;
    const nota = linhaOrigem.querySelector(".nota-dia")?.value || '';

    if (!entrada && !saida) {
        mostrarToast('️ O dia de origem não tem horários para mover!', 'warning');
        return;
    }

    linhaDestino.querySelector(".entrada").value = entrada;
    linhaDestino.querySelector(".saidaAlmoco").value = saidaAlmoco;
    linhaDestino.querySelector(".voltaAlmoco").value = voltaAlmoco;
    linhaDestino.querySelector(".saida").value = saida;
    linhaDestino.querySelector(".isSabado").checked = isSabado;
    linhaDestino.querySelector(".feriado").checked = isFeriado;
    if (linhaDestino.querySelector(".nota-dia")) {
        linhaDestino.querySelector(".nota-dia").value = nota;
    }
    calcularLinha(linhaDestino);
    marcarLinha(diaDestino);

    if (limparOrigem) {
        linhaOrigem.querySelector(".entrada").value = '';
        linhaOrigem.querySelector(".saidaAlmoco").value = '';
        linhaOrigem.querySelector(".voltaAlmoco").value = '';
        linhaOrigem.querySelector(".saida").value = '';
        linhaOrigem.querySelector(".isSabado").checked = false;
        linhaOrigem.querySelector(".feriado").checked = false;
        if (linhaOrigem.querySelector(".nota-dia")) {
            linhaOrigem.querySelector(".nota-dia").value = '';
        }
        calcularLinha(linhaOrigem);
        marcarLinha(diaOrigem);
        mostrarToast(`🔄 Horário movido do dia ${diaOrigem} para o dia ${diaDestino}!`, 'success');
    } else {
        mostrarToast(`📋 Horário copiado do dia ${diaOrigem} para o dia ${diaDestino}!`, 'success');
    }

    fecharModal('modalMovimentacao');
    atualizarStatsResumo();
}

// ================================================================
// ==================== FUNÇÕES AUXILIARES ====================
// ================================================================

function hToM(horario) {
    if (!horario) return null;
    const [h, m] = horario.split(':').map(Number);
    return (h * 60) + m;
}

function mToH(minutos) {
    const negativo = minutos < 0;
    const abs = Math.abs(minutos);
    const h = Math.floor(abs / 60);
    const m = Math.round(abs % 60);
    return `${negativo ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calcularDiferenca(inicio, fim) {
    if (inicio === null || fim === null) return 0;
    let diff = fim - inicio;
    if (diff < 0) diff += 1440;
    return diff;
}

function marcarLinha(index) {
    const linha = document.getElementById(`dia-${index}`);
    if (!linha) return;
    const isSab = linha.querySelector(".isSabado").checked;
    const isFer = linha.querySelector(".feriado").checked;
    linha.classList.remove("feriado-row", "sabado-row");
    if (isFer) linha.classList.add("feriado-row");
    else if (isSab) linha.classList.add("sabado-row");
}

// ================================================================
// ==================== CÁLCULO DA LINHA ====================
// ================================================================

function calcularLinha(linha) {
    const v = (classe) => linha.querySelector(classe)?.value || '';
    const c = (classe) => linha.querySelector(classe)?.checked || false;

    const tEntrada = hToM(v(".entrada"));
    const tSaidaAlm = hToM(v(".saidaAlmoco"));
    const tVoltaAlm = hToM(v(".voltaAlmoco"));
    const tSaidaFin = hToM(v(".saida"));
    
    const isSabado = c(".isSabado");
    const isFeriado = c(".feriado");

    const displayTotal = linha.querySelector(".total-dia");
    const displayExtra = linha.querySelector(".extra-dia");
    const displayStatus = linha.querySelector(".status-dia");
    const displayValor = linha.querySelector(".valor-dia");

    let totalMinutos = 0;
    let extraMinutos = 0;
    let status = '-';

    if (tEntrada !== null && tSaidaFin !== null) {
        if (tSaidaAlm !== null && tVoltaAlm !== null) {
            totalMinutos = calcularDiferenca(tEntrada, tSaidaAlm) + calcularDiferenca(tVoltaAlm, tSaidaFin);
        } else {
            totalMinutos = calcularDiferenca(tEntrada, tSaidaFin);
        }

        displayTotal.innerText = mToH(totalMinutos);

        const jornadaObrigatoria = isFeriado ? 0 : (isSabado ? MINUTOS_SABADO : MINUTOS_DIA_SEMANA);
        
        if (isFeriado) {
            extraMinutos = totalMinutos;
            displayExtra.innerText = mToH(totalMinutos);
            displayExtra.className = "extra-dia extra";
            status = '100%';
            displayStatus.innerHTML = `<span class="status-tag bg-feriado">💯 100%</span>`;
        } else {
            if (totalMinutos > (jornadaObrigatoria + TOLERANCIA_MINUTOS)) {
                extraMinutos = totalMinutos - jornadaObrigatoria;
                if (extraMinutos > LIMITE_HORAS_EXTRAS) {
                    mostrarToast(`️ Dia ${linha.id.replace('dia-', '')}: Excedeu limite de 2h extras`, 'warning');
                }
                displayExtra.innerText = mToH(extraMinutos);
                displayExtra.className = "extra-dia extra";
                status = 'Extra';
                displayStatus.innerHTML = `<span class="status-tag bg-extra">Hora Extra</span>`;
            } else {
                displayExtra.innerText = "00:00";
                displayExtra.className = "extra-dia normal";
                status = 'Normal';
                displayStatus.innerHTML = `<span class="status-tag bg-normal">☑️ Normal</span>`;
            }
        }
        
        let valor = 0;
        if (isFeriado && totalMinutos > 0) {
            valor = calcularValorExtra(totalMinutos, true);
        } else if (extraMinutos > 0) {
            valor = calcularValorExtra(extraMinutos, false);
        }
        if (displayValor) {
            displayValor.textContent = formatMoney(valor);
            displayValor.className = 'valor-dia' + (isFeriado ? ' feriado-valor' : ' valor-cell');
        }
    }

    return { totalMinutos, extraMinutos, isFeriado };
}

// ================================================================
// ==================== EVENTOS EM TEMPO REAL ====================
// ================================================================

function configurarEventosTempoReal() {
    document.addEventListener('input', function(e) {
        if (e.target.closest('input[type="time"]') || e.target.closest('.nota-dia')) {
            const linha = e.target.closest('tr');
            if (linha) {
                calcularLinha(linha);
                salvarRegistroAuto();
                atualizarStatsResumo();
            }
        }
    });

    document.addEventListener('change', function(e) {
        if (e.target.closest('input[type="checkbox"]')) {
            const linha = e.target.closest('tr');
            if (linha) {
                calcularLinha(linha);
                salvarRegistroAuto();
                atualizarStatsResumo();
            }
        }
    });
}

// ================================================================
// ==================== Registro AUTOMÁTICO ====================
// ================================================================

function configurarRegistroAuto() {
    setInterval(salvarRegistroAuto, 30000);
}

function salvarRegistroAuto() {
    const dados = coletarDadosTabela();
    if (dados && dados.some(d => d.entrada || d.saida)) {
        localStorage.setItem('Registro_ponto', JSON.stringify(dados));
    }
}

function coletarDadosTabela() {
    const linhas = document.querySelectorAll("#tabelaBody tr");
    const dados = [];
    linhas.forEach(linha => {
        const v = (classe) => linha.querySelector(classe)?.value || '';
        const c = (classe) => linha.querySelector(classe)?.checked || false;
        dados.push({
            entrada: v(".entrada"),
            saidaAlmoco: v(".saidaAlmoco"),
            voltaAlmoco: v(".voltaAlmoco"),
            saida: v(".saida"),
            isSabado: c(".isSabado"),
            isFeriado: c(".feriado"),
            nota: v(".nota-dia")
        });
    });
    return dados;
}

function carregarRegistro() {
    const Registro = localStorage.getItem('Registro_ponto');
    if (Registro) {
        try {
            const dados = JSON.parse(Registro);
            const linhas = document.querySelectorAll("#tabelaBody tr");
            linhas.forEach((linha, index) => {
                if (dados[index]) {
                    const d = dados[index];
                    linha.querySelector(".entrada").value = d.entrada || '';
                    linha.querySelector(".saidaAlmoco").value = d.saidaAlmoco || '';
                    linha.querySelector(".voltaAlmoco").value = d.voltaAlmoco || '';
                    linha.querySelector(".saida").value = d.saida || '';
                    linha.querySelector(".isSabado").checked = d.isSabado || false;
                    linha.querySelector(".feriado").checked = d.isFeriado || false;
                    if (linha.querySelector(".nota-dia")) {
                        linha.querySelector(".nota-dia").value = d.nota || '';
                    }
                    calcularLinha(linha);
                }
            });
            marcarTodasLinhas();
        } catch (e) { console.log('Erro ao carregar Registro'); }
    }
}

function marcarTodasLinhas() {
    for(let i = 1; i <= 31; i++) {
        const linha = document.getElementById(`dia-${i}`);
        if (linha) {
            const isSab = linha.querySelector(".isSabado").checked;
            const isFer = linha.querySelector(".feriado").checked;
            linha.classList.remove("feriado-row", "sabado-row");
            if (isFer) linha.classList.add("feriado-row");
            else if (isSab) linha.classList.add("sabado-row");
        }
    }
}

// ================================================================
// ==================== MARCAR FIM DE SEMANA ====================
// ================================================================

function marcarFimDeSemana() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    
    let sabados = 0;
    let domingos = 0;
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const linha = document.getElementById(`dia-${dia}`);
        if (!linha) continue;
        
        const data = new Date(ano, mes, dia);
        const diaSemana = data.getDay();
        
        const chkSabado = linha.querySelector(".isSabado");
        const chkFeriado = linha.querySelector(".feriado");
        
        if (diaSemana === 6) {
            if (!chkSabado.checked) {
                chkSabado.checked = true;
                sabados++;
            }
        } else if (diaSemana === 0) {
            if (!chkFeriado.checked) {
                chkFeriado.checked = true;
                domingos++;
            }
        }
    }
    
    marcarTodasLinhas();
    document.querySelectorAll("#tabelaBody tr").forEach(linha => calcularLinha(linha));
    atualizarStatsResumo();
    salvarRegistroAuto();
    
    if (sabados === 0 && domingos === 0) {
        mostrarToast('ℹ️ Fins de semana já estavam marcados!', 'info');
    } else {
        mostrarToast(` Marcados: ${sabados} sábado(s) e ${domingos} domingo(s)!`, 'success');
    }
}

// ================================================================
// ==================== DESMARCAR FIM DE SEMANA ====================
// ================================================================

function desmarcarFimDeSemana() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const linha = document.getElementById(`dia-${dia}`);
        if (!linha) continue;
        
        const data = new Date(ano, mes, dia);
        const diaSemana = data.getDay();
        
        if (diaSemana === 6) {
            linha.querySelector(".isSabado").checked = false;
        } else if (diaSemana === 0) {
            linha.querySelector(".feriado").checked = false;
        }
    }
    
    marcarTodasLinhas();
    document.querySelectorAll("#tabelaBody tr").forEach(linha => calcularLinha(linha));
    atualizarStatsResumo();
    salvarRegistroAuto();
    mostrarToast('🧹 Fins de semana desmarcados!', 'info');
}

// ================================================================
// ==================== PREENCHER PADRÃO (MODAL) ====================
// ================================================================

function preencherHorarioPadrao() {
    document.getElementById('modalPreencherPadrao').style.display = 'block';
}

function fecharModalPreencherPadrao() {
    document.getElementById('modalPreencherPadrao').style.display = 'none';
}

function aplicarPreencherPadrao() {
    const entrada = document.getElementById('padraoEntrada').value;
    const saidaAlmoco = document.getElementById('padraoSaidaAlmoco').value;
    const voltaAlmoco = document.getElementById('padraoVoltaAlmoco').value;
    const saida = document.getElementById('padraoSaida').value;
    const incluirSabados = document.getElementById('incluirSabados').checked;
    const incluirFeriados = document.getElementById('incluirFeriados').checked;

    if (!entrada || !saida) {
        mostrarToast('️ Preencha pelo menos Entrada e Saída!', 'warning');
        return;
    }

    const linhas = document.querySelectorAll("#tabelaBody tr");
    let preenchidos = 0;

    linhas.forEach(linha => {
        const isSabado = linha.querySelector(".isSabado").checked;
        const isFeriado = linha.querySelector(".feriado").checked;

        let devePreencher = false;
        if (isFeriado && incluirFeriados) devePreencher = true;
        else if (isSabado && incluirSabados) devePreencher = true;
        else if (!isSabado && !isFeriado) devePreencher = true;

        if (devePreencher) {
            linha.querySelector(".entrada").value = entrada;
            linha.querySelector(".saidaAlmoco").value = saidaAlmoco;
            linha.querySelector(".voltaAlmoco").value = voltaAlmoco;
            linha.querySelector(".saida").value = saida;
            calcularLinha(linha);
            preenchidos++;
        }
    });

    fecharModalPreencherPadrao();
    mostrarToast(` Horários padrão aplicados a ${preenchidos} dia(s)!`, 'success');
    atualizarStatsResumo();
}

document.getElementById('modalPreencherPadrao').addEventListener('click', function(e) {
    if (e.target === this) {
        fecharModalPreencherPadrao();
    }
});

// ================================================================
// ==================== COPIAR HORÁRIOS (LEGADO) ====================
// ================================================================

function copiarHorarios() {
    const dia = prompt('Digite o número do dia para copiar (1-31):', '1');
    if (!dia) return;
    const numDia = parseInt(dia);
    if (numDia < 1 || numDia > 31) {
        mostrarToast('️ Dia inválido!', 'error');
        return;
    }

    const linhaOrigem = document.getElementById(`dia-${numDia}`);
    if (!linhaOrigem) {
        mostrarToast('️ Dia não encontrado!', 'error');
        return;
    }

    const entrada = linhaOrigem.querySelector(".entrada").value;
    const saidaAlmoco = linhaOrigem.querySelector(".saidaAlmoco").value;
    const voltaAlmoco = linhaOrigem.querySelector(".voltaAlmoco").value;
    const saida = linhaOrigem.querySelector(".saida").value;
    const nota = linhaOrigem.querySelector(".nota-dia")?.value || '';

    if (!entrada && !saida) {
        mostrarToast('️ Este dia não tem horários para copiar!', 'warning');
        return;
    }

    const linhas = document.querySelectorAll("#tabelaBody tr");
    let copiados = 0;
    linhas.forEach(linha => {
        const isFer = linha.querySelector(".feriado").checked;
        const isSab = linha.querySelector(".isSabado").checked;
        if (!isFer && !isSab) {
            linha.querySelector(".entrada").value = entrada;
            linha.querySelector(".saidaAlmoco").value = saidaAlmoco;
            linha.querySelector(".voltaAlmoco").value = voltaAlmoco;
            linha.querySelector(".saida").value = saida;
            if (linha.querySelector(".nota-dia")) {
                linha.querySelector(".nota-dia").value = nota;
            }
            calcularLinha(linha);
            copiados++;
        }
    });
    mostrarToast(` Horários copiados para ${copiados} dias!`, 'success');
    atualizarStatsResumo();
}

// ================================================================
// ==================== LIMPAR NOTAS ====================
// ================================================================

function limparNotas() {
    if (!confirm('Tem certeza que deseja limpar todas as notas?')) return;
    document.querySelectorAll(".nota-dia").forEach(input => input.value = '');
    mostrarToast('🗑️ Notas limpas!', 'info');
}

// ================================================================
// ==================== LIMPAR FORMULÁRIO ====================
// ================================================================

function limparFormulario() {
    if (!confirm("Tem certeza que deseja limpar todos os dados?")) return;

    const linhas = document.querySelectorAll("#tabelaBody tr");
    linhas.forEach(linha => {
        linha.querySelectorAll("input[type='time']").forEach(input => input.value = "");
        linha.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = false);
        if (linha.querySelector(".nota-dia")) linha.querySelector(".nota-dia").value = "";
        linha.querySelector(".total-dia").innerText = "00:00";
        linha.querySelector(".extra-dia").innerText = "00:00";
        linha.querySelector(".valor-dia").textContent = "R$ 0,00";
        linha.querySelector(".status-dia").innerHTML = "-";
        linha.classList.remove("feriado-row", "sabado-row", "extra-positiva", "extra-negativa", "jornada-reduzida");
    });

    document.getElementById("totalExtras").innerText = "00:00";
    document.getElementById("totalFeriado").innerText = "00:00";
    document.getElementById("totalDias").innerText = "0";
    document.getElementById("diasExtra").innerText = "0";
    localStorage.removeItem('Registro_ponto');
    mostrarToast('🗑️ Dados limpos com sucesso!', 'info');
    atualizarStatsResumo();
}

// ================================================================
// ==================== CALCULAR FOLHA ====================
// ================================================================

function calcularFolha() {
    const linhas = document.querySelectorAll("#tabelaBody tr");
    let somaExtras = 0;
    let somaFeriados = 0;
    let totalDias = 0;
    let diasExtra = 0;
    let dadosLinhas = [];

    linhas.forEach((linha, index) => {
        const resultado = calcularLinha(linha);
        if (resultado) {
            const { totalMinutos, extraMinutos, isFeriado } = resultado;
            if (totalMinutos > 0) totalDias++;
            if (isFeriado) {
                somaFeriados += totalMinutos;
            } else {
                somaExtras += extraMinutos;
                if (extraMinutos > 0) diasExtra++;
            }
        }

        const v = (classe) => linha.querySelector(classe)?.value || '';
        const c = (classe) => linha.querySelector(classe)?.checked || false;
        const nota = linha.querySelector(".nota-dia")?.value || '';
        const valorTexto = linha.querySelector(".valor-dia")?.textContent || 'R$ 0,00';
        dadosLinhas.push({
            dia: index + 1,
            entrada: v(".entrada"),
            saidaAlmoco: v(".saidaAlmoco"),
            voltaAlmoco: v(".voltaAlmoco"),
            saida: v(".saida"),
            isSabado: c(".isSabado"),
            isFeriado: c(".feriado"),
            total: linha.querySelector(".total-dia").innerText,
            extra: linha.querySelector(".extra-dia").innerText,
            valor: valorTexto,
            status: linha.querySelector(".status-dia").innerText,
            nota: nota
        });
    });

    document.getElementById("totalExtras").innerText = mToH(somaExtras);
    document.getElementById("totalFeriado").innerText = mToH(somaFeriados);
    document.getElementById("totalDias").innerText = totalDias;
    document.getElementById("diasExtra").innerText = diasExtra;

    window.dadosCalculados = {
        linhas: dadosLinhas,
        totalExtras: mToH(somaExtras),
        totalFeriado: mToH(somaFeriados),
        totalDias: totalDias,
        diasExtra: diasExtra,
        data: new Date().toLocaleString()
    };

    mostrarToast(' Cálculo concluído!', 'success');
    atualizarStatsResumo();
    if (document.getElementById('dashboardContainer').style.display !== 'none') {
        gerarDashboard();
    }
}

// ================================================================
// ==================== ATUALIZAR STATS RESUMO ====================
// ================================================================

function atualizarStatsResumo() {
    const linhas = document.querySelectorAll("#tabelaBody tr");
    let normais = 0, extras = 0, feriados = 0, reduzidos = 0;
    
    linhas.forEach(linha => {
        const total = linha.querySelector(".total-dia")?.innerText || '00:00';
        const status = linha.querySelector(".status-dia")?.innerText || '';
        const isFer = linha.querySelector(".feriado")?.checked || false;
        
        if (total !== '00:00') {
            if (isFer) feriados++;
            else if (status.includes('Extra')) extras++;
            else if (status.includes('Normal')) normais++;
            else reduzidos++;
        }
    });
    
    document.getElementById('statNormais').textContent = normais;
    document.getElementById('statExtras').textContent = extras;
    document.getElementById('statFeriados').textContent = feriados;
    document.getElementById('statReduzidos').textContent = reduzidos;
}

// ================================================================
// ==================== DASHBOARD ====================
// ================================================================

function abrirDashboard() {
    const modal = document.getElementById('modalDashboard');
    modal.style.display = 'block';
    gerarDashboard();
}

function gerarDashboard() {
    const container = document.getElementById('dashboardContent');
    
    const linhas = document.querySelectorAll("#tabelaBody tr");
    const dias = [];
    const extras = [];
    let totalExtra = 0;
    let totalFeriado = 0;
    let diasComExtra = 0;
    let diasNormais = 0;
    let diasFeriados = 0;

    linhas.forEach((linha, index) => {
        const dia = index + 1;
        const isFer = linha.querySelector(".feriado")?.checked || false;
        const total = linha.querySelector(".total-dia")?.innerText || '00:00';
        const extra = linha.querySelector(".extra-dia")?.innerText || '00:00';
        
        if (total !== '00:00') {
            dias.push(dia);
            extras.push(extra);
            
            if (isFer) {
                diasFeriados++;
                const min = hToM(total) || 0;
                totalFeriado += min;
            } else {
                const min = hToM(extra) || 0;
                if (min > 0) {
                    diasComExtra++;
                    totalExtra += min;
                } else {
                    diasNormais++;
                }
            }
        }
    });

    let html = `
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <h3>📊 Distribuição de Horas Extras</h3>
                <div class="chart-container">
                    <canvas id="chartExtrasModal"></canvas>
                </div>
            </div>
            <div class="dashboard-card">
                <h3>📈 Resumo do Mês</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="number">${diasNormais}</div>
                        <div class="label">Dias Normais</div>
                    </div>
                    <div class="stat-item">
                        <div class="number">${diasComExtra}</div>
                        <div class="label">Dias com Extra</div>
                    </div>
                    <div class="stat-item">
                        <div class="number">${diasFeriados}</div>
                        <div class="label">Feriados</div>
                    </div>
                    <div class="stat-item">
                        <div class="number">${mToH(totalExtra)}</div>
                        <div class="label">Total Extra 50%</div>
                    </div>
                    <div class="stat-item" style="grid-column: span 2;">
                        <div class="number">${mToH(totalFeriado)}</div>
                        <div class="label">Total Extra 100% (Feriados)</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="dashboard-card" style="margin-top:20px;">
            <h3>📋 Detalhamento por Dia</h3>
            <div style="overflow-x:auto;max-height:300px;">
                <table style="min-width:auto;font-size:13px;">
                    <thead>
                        <tr><th>Dia</th><th>Total</th><th>Extra</th><th>Status</th></tr>
                    </thead>
                    <tbody>
    `;
    
    linhas.forEach((linha, index) => {
        const dia = index + 1;
        const total = linha.querySelector(".total-dia")?.innerText || '00:00';
        const extra = linha.querySelector(".extra-dia")?.innerText || '00:00';
        const status = linha.querySelector(".status-dia")?.innerHTML || '-';
        if (total !== '00:00') {
            html += `<tr><td>${String(dia).padStart(2,'0')}</td><td>${total}</td><td>${extra}</td><td>${status}</td></tr>`;
        }
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    setTimeout(() => {
        const ctx = document.getElementById('chartExtrasModal');
        if (ctx) {
            if (window.chartModalInstance) {
                window.chartModalInstance.destroy();
            }
            
            const labels = dias.map(d => String(d).padStart(2,'0'));
            const data = extras.map(e => {
                const min = hToM(e) || 0;
                return Math.round(min / 60 * 100) / 100;
            });
            
            window.chartModalInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Horas Extras (h)',
                        data: data,
                        backgroundColor: data.map(v => v > 0 ? '#16a34a' : '#94a3b8'),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Horas' }
                        }
                    }
                }
            });
        }
    }, 100);
}

// ================================================================
// ==================== CALENDÁRIO ====================
// ================================================================

function abrirCalendario() {
    const modal = document.getElementById('modalCalendario');
    modal.style.display = 'block';
    gerarCalendario();
}

function gerarCalendario() {
    const container = document.getElementById('calendarioContent');
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    let html = `
        <div class="calendario-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
            <span style="font-size:18px;font-weight:600;">${new Date(ano, mes).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            <div>
                <button onclick="mudarMes(-1)" style="background:var(--primary);color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">◀</button>
                <button onclick="mudarMes(1)" style="background:var(--primary);color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">▶</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:10px;text-align:center;font-weight:600;font-size:12px;color:#64748b;">
            ${nomesDias.map(d => `<span>${d}</span>`).join('')}
        </div>
        <div class="calendario-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:15px;">
    `;
    
    for (let i = 0; i < primeiroDia; i++) {
        html += `<div class="dia-cal vazio" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;font-size:14px;font-weight:600;background:transparent;"></div>`;
    }
    
    for (let d = 1; d <= diasNoMes; d++) {
        const linha = document.getElementById(`dia-${d}`);
        let classe = 'dia-cal';
        let sub = '';
        let cor = '';
        
        if (linha) {
            const isFer = linha.querySelector(".feriado")?.checked || false;
            const status = linha.querySelector(".status-dia")?.innerText || '';
            const total = linha.querySelector(".total-dia")?.innerText || '00:00';
            
            if (isFer) {
                classe += ' feriado';
                sub = 'Feriado';
                cor = 'background:#fef3c7;color:#92400e;';
            } else if (status.includes('Extra')) {
                classe += ' extra';
                sub = 'Extra';
                cor = 'background:#dcfce7;color:#166534;';
            } else if (total !== '00:00') {
                classe += ' normal';
                sub = total;
                cor = 'background:#dbeafe;color:#1e40af;';
            }
        }
        
        html += `<div class="${classe}" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;font-size:14px;font-weight:600;${cor}padding:4px;"><span class="num" style="font-size:18px;">${d}</span><span class="sub" style="font-size:9px;opacity:0.7;">${sub}</span></div>`;
    }
    
    html += `</div>`;
    html += `
        <div style="margin-top:15px;display:flex;gap:15px;flex-wrap:wrap;font-size:13px;">
            <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:#dbeafe;vertical-align:middle;margin-right:4px;"></span> Normal</span>
            <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:#dcfce7;vertical-align:middle;margin-right:4px;"></span> Extra</span>
            <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:#fef3c7;vertical-align:middle;margin-right:4px;"></span> Feriado</span>
        </div>
    `;
    
    container.innerHTML = html;
}

let calendarioOffset = 0;

function mudarMes(delta) {
    calendarioOffset += delta;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + calendarioOffset;
    const container = document.getElementById('calendarioContent');
    const novoMes = new Date(ano, mes);
    const primeiroDia = new Date(novoMes.getFullYear(), novoMes.getMonth(), 1).getDay();
    const diasNoMes = new Date(novoMes.getFullYear(), novoMes.getMonth() + 1, 0).getDate();
    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    let html = `
        <div class="calendario-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
            <span style="font-size:18px;font-weight:600;">${novoMes.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            <div>
                <button onclick="mudarMes(-1)" style="background:var(--primary);color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">◀</button>
                <button onclick="mudarMes(1)" style="background:var(--primary);color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;">▶</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:10px;text-align:center;font-weight:600;font-size:12px;color:#64748b;">
            ${nomesDias.map(d => `<span>${d}</span>`).join('')}
        </div>
        <div class="calendario-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:15px;">
    `;
    
    for (let i = 0; i < primeiroDia; i++) {
        html += `<div class="dia-cal vazio" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;font-size:14px;font-weight:600;background:transparent;"></div>`;
    }
    
    for (let d = 1; d <= diasNoMes; d++) {
        const linha = document.getElementById(`dia-${d}`);
        let classe = 'dia-cal';
        let sub = '';
        let cor = '';
        
        if (linha) {
            const isFer = linha.querySelector(".feriado")?.checked || false;
            const status = linha.querySelector(".status-dia")?.innerText || '';
            const total = linha.querySelector(".total-dia")?.innerText || '00:00';
            
            if (isFer) {
                classe += ' feriado';
                sub = 'Feriado';
                cor = 'background:#fef3c7;color:#92400e;';
            } else if (status.includes('Extra')) {
                classe += ' extra';
                sub = 'Extra';
                cor = 'background:#dcfce7;color:#166534;';
            } else if (total !== '00:00') {
                classe += ' normal';
                sub = total;
                cor = 'background:#dbeafe;color:#1e40af;';
            }
        }
        
        html += `<div class="${classe}" style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;font-size:14px;font-weight:600;${cor}padding:4px;"><span class="num" style="font-size:18px;">${d}</span><span class="sub" style="font-size:9px;opacity:0.7;">${sub}</span></div>`;
    }
    
    html += `</div>`;
    html += `
        <div style="margin-top:15px;display:flex;gap:15px;flex-wrap:wrap;font-size:13px;">
            <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:#dbeafe;vertical-align:middle;margin-right:4px;"></span> Normal</span>
            <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:#dcfce7;vertical-align:middle;margin-right:4px;"></span> Extra</span>
            <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:#fef3c7;vertical-align:middle;margin-right:4px;"></span> Feriado</span>
        </div>
    `;
    
    container.innerHTML = html;
}

// ================================================================
// ==================== CONFIGURAÇÕES ====================
// ================================================================

function abrirConfiguracoes() {
    document.getElementById('modalConfig').style.display = 'block';
    document.getElementById('configJornada').value = MINUTOS_DIA_SEMANA;
    document.getElementById('configSabado').value = MINUTOS_SABADO;
    document.getElementById('configTolerancia').value = TOLERANCIA_MINUTOS;
    document.getElementById('configLimiteExtra').value = LIMITE_HORAS_EXTRAS;
    document.getElementById('configMobile').value = MODO_MOBILE;
}

function salvarConfiguracoes() {
    MINUTOS_DIA_SEMANA = parseInt(document.getElementById('configJornada').value) || 480;
    MINUTOS_SABADO = parseInt(document.getElementById('configSabado').value) || 240;
    TOLERANCIA_MINUTOS = parseInt(document.getElementById('configTolerancia').value) || 15;
    LIMITE_HORAS_EXTRAS = parseInt(document.getElementById('configLimiteExtra').value) || 120;
    MODO_MOBILE = document.getElementById('configMobile').value || 'auto';
    
    localStorage.setItem('configJornada', MINUTOS_DIA_SEMANA);
    localStorage.setItem('configSabado', MINUTOS_SABADO);
    localStorage.setItem('configTolerancia', TOLERANCIA_MINUTOS);
    localStorage.setItem('configLimiteExtra', LIMITE_HORAS_EXTRAS);
    localStorage.setItem('configMobile', MODO_MOBILE);
    
    aplicarConfigMobile();
    document.querySelectorAll("#tabelaBody tr").forEach(linha => calcularLinha(linha));
    mostrarToast(' Configurações salvas!', 'success');
    fecharModal('modalConfig');
    atualizarStatsResumo();
}

function resetarConfiguracoes() {
    if (!confirm('Restaurar configurações padrão?')) return;
    localStorage.removeItem('configJornada');
    localStorage.removeItem('configSabado');
    localStorage.removeItem('configTolerancia');
    localStorage.removeItem('configLimiteExtra');
    localStorage.removeItem('configMobile');
    location.reload();
}

function aplicarConfigMobile() {
    if (MODO_MOBILE === 'on' || (MODO_MOBILE === 'auto' && window.innerWidth < 768)) {
        document.querySelectorAll('input[type="time"]').forEach(el => el.style.width = '70px');
        document.querySelectorAll('.nota-dia').forEach(el => el.style.width = '50px');
    } else {
        document.querySelectorAll('input[type="time"]').forEach(el => el.style.width = '');
        document.querySelectorAll('.nota-dia').forEach(el => el.style.width = '');
    }
}

// ================================================================
// ==================== REGISTRO (BACKUP) ====================
// ================================================================

function abrirRegistro() {
    document.getElementById('modalRegistro').style.display = 'block';
    const registros = JSON.parse(localStorage.getItem('registrosPonto')) || [];
    document.getElementById('totalRegistros').textContent = registros.length;
    document.getElementById('ultimoRegistro').textContent = localStorage.getItem('ultimoRegistro') || 'Nenhum';
}

function fazerRegistro() {
    const dados = {
        RegistroPonto: localStorage.getItem('Registro_ponto'),
        registrosPonto: localStorage.getItem('registrosPonto'),
        config: {
            jornada: MINUTOS_DIA_SEMANA,
            sabado: MINUTOS_SABADO,
            tolerancia: TOLERANCIA_MINUTOS,
            limiteExtra: LIMITE_HORAS_EXTRAS,
            mobile: MODO_MOBILE,
            tema: localStorage.getItem('tema')
        },
        data: new Date().toLocaleString()
    };
    
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Registro_de_ponto_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    localStorage.setItem('ultimoRegistro', new Date().toLocaleString());
    mostrarToast(' Registro criado com sucesso!', 'success');
}

function restaurarRegistro(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (dados.RegistroPonto) localStorage.setItem('Registro_ponto', dados.RegistroPonto);
            if (dados.registrosPonto) localStorage.setItem('registrosPonto', dados.registrosPonto);
            if (dados.config) {
                if (dados.config.jornada) localStorage.setItem('configJornada', dados.config.jornada);
                if (dados.config.sabado) localStorage.setItem('configSabado', dados.config.sabado);
                if (dados.config.tolerancia) localStorage.setItem('configTolerancia', dados.config.tolerancia);
                if (dados.config.limiteExtra) localStorage.setItem('configLimiteExtra', dados.config.limiteExtra);
                if (dados.config.mobile) localStorage.setItem('configMobile', dados.config.mobile);
                if (dados.config.tema) localStorage.setItem('tema', dados.config.tema);
            }
            mostrarToast(' Registro restaurado com sucesso! Recarregando...', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            mostrarToast('❌ Erro ao restaurar Registro: arquivo inválido', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function limparTodosDados() {
    if (!confirm('️ Tem certeza que deseja limpar TODOS os dados? Esta ação é irreversível!')) return;
    if (!confirm('Confirme novamente: Limpar todos os dados do sistema?')) return;
    localStorage.clear();
    mostrarToast('🗑️ Todos os dados foram limpos!', 'warning');
    setTimeout(() => location.reload(), 1000);
}

// ================================================================
// ==================== COMPARTILHAR ====================
// ================================================================

function compartilharResultados() {
    calcularFolha();
    if (!window.dadosCalculados) {
        mostrarToast('️ Calcule os resultados primeiro!', 'error');
        return;
    }
    
    const dados = window.dadosCalculados;
    let texto = '📊 *RELATÓRIO DE PONTO*\n';
    texto += `📅 ${new Date().toLocaleDateString()}\n`;
    texto += `⏱️ Total Extra 50%: ${dados.totalExtras}\n`;
    texto += `🎯 Total Extra 100%: ${dados.totalFeriado}\n`;
    texto += `📊 Total de Dias: ${dados.totalDias}\n`;
    texto += `⚡ Dias com Extra: ${dados.diasExtra}\n\n`;
    texto += `📋 *Detalhamento:*\n`;
    
    dados.linhas.forEach(l => {
        if (l.entrada || l.saida) {
            texto += `${String(l.dia).padStart(2,'0')} | ${l.entrada} → ${l.saida} | Total: ${l.total} | ${l.valor} | ${l.status.replace(/<[^>]*>/g, '').trim()}`;
            if (l.nota) texto += ` | Obs: ${l.nota}`;
            texto += '\n';
        }
    });
    
    navigator.clipboard.writeText(texto).then(() => {
        mostrarToast('📋 Relatório copiado para área de transferência!', 'success');
    }).catch(() => {
        alert(texto);
    });
    
    if (navigator.share) {
        navigator.share({
            title: 'Relatório de Ponto',
            text: texto
        }).catch(() => {});
    }
}

// ================================================================
// ==================== SALVAR CÁLCULO (COM NOME) ====================
// ================================================================

function salvarRegistro() {
    calcularFolha();

    if (!window.dadosCalculados) {
        mostrarToast('️ Nenhum dado para salvar. Calcule os resultados primeiro!', 'error');
        return;
    }

    const temDados = window.dadosCalculados.linhas.some(l => l.entrada || l.saida);
    if (!temDados) {
        mostrarToast('️ Nenhum horário preenchido para salvar!', 'error');
        return;
    }

    document.getElementById('resumoExtra50').textContent = window.dadosCalculados.totalExtras;
    document.getElementById('resumoExtra100').textContent = window.dadosCalculados.totalFeriado;
    document.getElementById('resumoDias').textContent = window.dadosCalculados.totalDias;

    const mesInput = document.getElementById('salvarMes');
    if (!mesInput.value) {
        const hoje = new Date();
        mesInput.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    }

    document.getElementById('modalSalvarCalculo').style.display = 'block';
    setTimeout(() => document.getElementById('salvarNome').focus(), 100);
}

function confirmarSalvarCalculo() {
    const nomeInput = document.getElementById('salvarNome');
    const nome = nomeInput.value.trim();

    if (!nome) {
        nomeInput.classList.add('erro');
        nomeInput.focus();
        setTimeout(() => nomeInput.classList.remove('erro'), 400);
        mostrarToast('Informe o nome do funcionário!', 'warning');
        return;
    }

    const cargo = document.getElementById('salvarCargo').value.trim();
    const mes = document.getElementById('salvarMes').value;
    const obs = document.getElementById('salvarObs').value.trim();

    const codID = sessionStorage.getItem('usuarioSenha') || '—';

    // Recalcula para garantir dados atualizados
    calcularFolha();

    if (!window.dadosCalculados) {
        mostrarToast('Nenhum dado calculado!', 'error');
        return;
    }

    let registros = JSON.parse(localStorage.getItem('registrosPonto')) || [];

    if (idRegistroEmEdicao !== null) {
        // ============ MODO EDIÇÃO ============
        const index = registros.findIndex(reg => reg.id === idRegistroEmEdicao);

        if (index === -1) {
            mostrarToast('❌ Registro original não encontrado!', 'error');
            idRegistroEmEdicao = null;
            return;
        }

        registros[index] = {
            ...registros[index],
            nomeFuncionario: nome,
            cargoFuncionario: cargo,
            mesReferencia: mes,
            observacoes: obs,
            codID: codID,
            dados: window.dadosCalculados,
            totalExtras: window.dadosCalculados.totalExtras,
            totalFeriado: window.dadosCalculados.totalFeriado,
            dataHoraEdicao: new Date().toLocaleString()
        };

        localStorage.setItem('registrosPonto', JSON.stringify(registros));
        mostrarToast(` Cálculo de "${nome}" atualizado com sucesso!`, 'success');

        idRegistroEmEdicao = null;
    } else {
        // ============ MODO NOVO ============
        const registro = {
            id: Date.now(),
            dataHora: new Date().toLocaleString(),
            nomeFuncionario: nome,
            cargoFuncionario: cargo,
            mesReferencia: mes,
            observacoes: obs,
            codID: codID,
            dados: window.dadosCalculados,
            totalExtras: window.dadosCalculados.totalExtras,
            totalFeriado: window.dadosCalculados.totalFeriado
        };

        registros.push(registro);
        localStorage.setItem('registrosPonto', JSON.stringify(registros));

        mostrarToast(` Cálculo de "${nome}" salvo com sucesso!`, 'success');
    }

    // Limpa os campos do modal
    document.getElementById('salvarNome').value = '';
    document.getElementById('salvarCargo').value = '';
    document.getElementById('salvarObs').value = '';

    fecharModal('modalSalvarCalculo');

    // Reseta o modo edição (por segurança)
    resetarModalSalvar();
}
document.getElementById('modalSalvarCalculo').addEventListener('click', function(e) {
    if (e.target === this) fecharModal('modalSalvarCalculo');
});

document.getElementById('salvarNome')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        confirmarSalvarCalculo();
    }
});

// ================================================================
// ==================== CONSULTAR REGISTROS ====================
// ================================================================

function abrirModalConsulta() {
    document.getElementById('modalConsulta').style.display = 'block';
    carregarRegistros();
}

function carregarRegistros() {
    const container = document.getElementById('listaRegistros');
    const registros = JSON.parse(localStorage.getItem('registrosPonto')) || [];

    if (registros.length === 0) {
        container.innerHTML = '<div class="sem-registros" style="text-align:center;padding:20px;opacity:0.5;">📭 Nenhum registro encontrado.</div>';
        return;
    }

    let html = '';
    registros.slice().reverse().forEach((reg) => {
        const nome = reg.nomeFuncionario || '(Sem nome)';
        const cargo = reg.cargoFuncionario ? `<span class="registro-cargo">• ${reg.cargoFuncionario}</span>` : '';
        const mes = reg.mesReferencia
            ? `<span class="registro-mes">📅 ${formatarMesReferencia(reg.mesReferencia)}</span>`
            : '';
        const codID = reg.codID
            ? `<span class="registro-codid" title="Código do operador">🔑 ${reg.codID}</span>`
            : '';
        const obs = reg.observacoes
            ? `<div class="registro-obs">📝 ${reg.observacoes}</div>`
            : '';

        html += `
            <div class="registro-item" style="background:var(--bg);padding:15px;border-radius:12px;margin-bottom:12px;border-left:4px solid #3b82f6;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                    <div style="flex:1; min-width:200px;">
                        <div>
                            <span class="registro-nome">👤 ${nome}</span>
                            ${codID}
                            ${cargo}
                            ${mes}
                        </div>
                        <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:14px; font-size:13px;">
                            <span class="registro-data">🕒 ${reg.dataHora}</span>
                            <span>Extra 50%: <strong>${reg.totalExtras}</strong></span>
                            <span>Extra 100%: <strong>${reg.totalFeriado}</strong></span>
                        </div>
                        ${obs}
                    </div>
                    <div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
    <button 
        class="btn btn-warning"
        style="padding:6px 12px;font-size:12px;"
        onclick="editarRegistro(${reg.id})"
        title="Editar este cálculo">
        ✏️ Editar Cálculo
    </button>
    <button 
        class="btn btn-purple"
        style="padding:6px 12px;font-size:12px;"
        onclick="imprimirRegistro(${reg.id})">
        🖨️ Imprimir
    </button>
    <button 
        class="btn btn-danger"
        style="padding:6px 12px;font-size:12px;"
        onclick="excluirRegistro(${reg.id})">
        🗑️
    </button>
</div>
                    </div>
                </div>
                <div style="margin-top:10px; font-size:13px; color:#64748b; overflow-x:auto;">
                    <table style="width:100%; min-width:auto; font-size:12px;">
                        <thead>
                            <tr>
                                <th>Dia</th><th>Entrada</th><th>Saída Alm.</th><th>Volta Alm.</th>
                                <th>Saída</th><th>Sáb.</th><th>Fer.</th><th>Total</th>
                                <th>Extra</th><th>Valor</th><th>Status</th><th>Nota</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        reg.dados.linhas.forEach(l => {
            html += `
                <tr>
                    <td>${String(l.dia).padStart(2, '0')}</td>
                    <td>${l.entrada}</td>
                    <td>${l.saidaAlmoco}</td>
                    <td>${l.voltaAlmoco}</td>
                    <td>${l.saida}</td>
                    <td>${l.isSabado ? '' : ''}</td>
                    <td>${l.isFeriado ? '' : ''}</td>
                    <td>${l.total}</td>
                    <td>${l.extra}</td>
                    <td>${l.valor || 'R$ 0,00'}</td>
                    <td>${l.status.replace(/<[^>]*>/g, '').trim()}</td>
                    <td>${l.nota || ''}</td>
                </tr>
            `;
        });
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function formatarMesReferencia(mesISO) {
    if (!mesISO) return '';
    const [ano, mes] = mesISO.split('-');
    const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${nomes[parseInt(mes) - 1]} / ${ano}`;
}

function excluirRegistro(id) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    let registros = JSON.parse(localStorage.getItem('registrosPonto')) || [];
    registros = registros.filter(reg => reg.id !== id);
    localStorage.setItem('registrosPonto', JSON.stringify(registros));
    carregarRegistros();
    mostrarToast('🗑️ Registro excluído!', 'info');
}

// ================================================================
// ==================== EDITAR REGISTRO ====================
// ================================================================

function editarRegistro(id) {
    const registros = JSON.parse(localStorage.getItem('registrosPonto')) || [];
    const registro = registros.find(reg => reg.id === id);

    if (!registro) {
        mostrarToast('❌ Registro não encontrado!', 'error');
        return;
    }

    if (!confirm('Os dados atuais da tabela serão substituídos pelos do registro. Continuar?')) {
        return;
    }

    // 1) Fecha o modal de consulta
    fecharModal('modalConsulta');

    // 2) Preenche a tabela com os dados do registro
    const linhas = document.querySelectorAll("#tabelaBody tr");

    linhas.forEach((linha, index) => {
        const d = registro.dados.linhas[index];

        if (d) {
            linha.querySelector(".entrada").value = d.entrada || '';
            linha.querySelector(".saidaAlmoco").value = d.saidaAlmoco || '';
            linha.querySelector(".voltaAlmoco").value = d.voltaAlmoco || '';
            linha.querySelector(".saida").value = d.saida || '';
            linha.querySelector(".isSabado").checked = d.isSabado || false;
            linha.querySelector(".feriado").checked = d.isFeriado || false;
            if (linha.querySelector(".nota-dia")) {
                linha.querySelector(".nota-dia").value = d.nota || '';
            }
        } else {
            linha.querySelector(".entrada").value = '';
            linha.querySelector(".saidaAlmoco").value = '';
            linha.querySelector(".voltaAlmoco").value = '';
            linha.querySelector(".saida").value = '';
            linha.querySelector(".isSabado").checked = false;
            linha.querySelector(".feriado").checked = false;
            if (linha.querySelector(".nota-dia")) {
                linha.querySelector(".nota-dia").value = '';
            }
        }
        calcularLinha(linha);
    });

    marcarTodasLinhas();
    atualizarStatsResumo();

    // 3) Guarda o ID do registro sendo editado
    idRegistroEmEdicao = id;

    // 4) Recalcula a folha
    calcularFolha();

    // 5) Preenche o resumo do modal
    document.getElementById('resumoExtra50').textContent = window.dadosCalculados.totalExtras;
    document.getElementById('resumoExtra100').textContent = window.dadosCalculados.totalFeriado;
    document.getElementById('resumoDias').textContent = window.dadosCalculados.totalDias;

    // 6) Preenche os campos do modal com os dados do registro
    document.getElementById('salvarNome').value = registro.nomeFuncionario || '';
    document.getElementById('salvarCargo').value = registro.cargoFuncionario || '';
    document.getElementById('salvarMes').value = registro.mesReferencia || '';
    document.getElementById('salvarObs').value = registro.observacoes || '';

    // 7) Muda o título e o botão do modal
    const tituloModal = document.querySelector('#modalSalvarCalculo h2');
    if (tituloModal) {
        tituloModal.innerHTML = '<i class="fas fa-edit"></i> Editar Cálculo';
    }

    const btnSalvar = document.querySelector('#modalSalvarCalculo .btn-success');
    if (btnSalvar) {
        btnSalvar.innerHTML = '<i class="fas fa-save"></i> Atualizar Cálculo';
    }

    // 8) Abre o modal
    document.getElementById('modalSalvarCalculo').style.display = 'block';
    setTimeout(() => document.getElementById('salvarNome').focus(), 100);

    mostrarToast('✏️ Editando registro de ' + (registro.nomeFuncionario || '(Sem nome)'), 'info');
}

// ================================================================
// ==================== RESETAR MODAL SALVAR ====================
// ================================================================

function resetarModalSalvar() {
    idRegistroEmEdicao = null;

    const tituloModal = document.querySelector('#modalSalvarCalculo h2');
    if (tituloModal) {
        tituloModal.innerHTML = '<i class="fas fa-user-tie"></i> Salvar Cálculo';
    }

    const btnSalvar = document.querySelector('#modalSalvarCalculo .btn-success');
    if (btnSalvar) {
        btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar Cálculo';
    }
}
// ================================================================
// ==================== IMPRIMIR REGISTRO ====================
// ================================================================

function imprimirRegistro(id) {
    const registros = JSON.parse(localStorage.getItem('registrosPonto')) || [];
    const registro = registros.find(reg => reg.id === id);

    if (!registro) {
        mostrarToast('❌ Registro não encontrado!', 'error');
        return;
    }

    const dados = registro.dados;
    const nomefunc = registro.nomeFuncionario || '(Sem nome)';
    const cargofunc = registro.cargoFuncionario || '';
    const mesref = registro.mesReferencia
        ? formatarMesReferencia(registro.mesReferencia)
        : '';
    const obsfunc = registro.observacoes || '';
    const codIDfunc = registro.codID || '—';

    // Cria as linhas da tabela
    let linhasTabela = '';

    dados.linhas.forEach(l => {
        if (l.entrada || l.saida) {
            linhasTabela += `
                <tr>
                    <td>${String(l.dia).padStart(2, '0')}</td>
                    <td>${l.entrada || '-'}</td>
                    <td>${l.saidaAlmoco || '-'}</td>
                    <td>${l.voltaAlmoco || '-'}</td>
                    <td>${l.saida || '-'}</td>
                    <td>${l.isSabado ? 'SIM' : 'NÃO'}</td>
                    <td>${l.isFeriado ? 'SIM' : 'NÃO'}</td>
                    <td>${l.total || '00:00'}</td>
                    <td>${l.extra || '00:00'}</td>
                    <td>${l.valor || 'R$ 0,00'}</td>
                    <td>${l.status ? l.status.replace(/<[^>]*>/g, '').trim() : '-'}</td>
                    <td>${l.nota || ''}</td>
                </tr>
            `;
        }
    });

    // Abre nova janela para impressão
    const janela = window.open('', '_blank', 'width=1200,height=800');

    if (!janela) {
        mostrarToast('O navegador bloqueou a janela de impressão. Permita pop-ups.', 'warning');
        return;
    }

    janela.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
   <title>Relatório - ${nomefunc} - ${mesref || 'Ponto'}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 25px;
            color: #111;
            background: white;
        }
        .cabecalho {
            text-align: center;
            border-bottom: 2px solid #111;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .cabecalho h1 { margin: 0; font-size: 24px; }
        .cabecalho p { margin: 5px 0; font-size: 13px; color: #555; }
        .informacoes {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }
        .info {
            border: 1px solid #ccc;
            padding: 10px;
            border-radius: 6px;
        }
        .info strong {
            display: block;
            font-size: 11px;
            color: #666;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .info span { font-size: 15px; font-weight: bold; }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
        }
        th {
            background: #111;
            color: white;
            padding: 7px 4px;
            border: 1px solid #111;
        }
        td {
            padding: 6px 4px;
            border: 1px solid #ccc;
            text-align: center;
        }
        tr { page-break-inside: avoid; }
        .resumo { margin-top: 25px; }
        .resumo h2 {
            font-size: 18px;
            border-bottom: 1px solid #111;
            padding-bottom: 6px;
        }
        .resumo-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
        }
        .resumo-item {
            border: 1px solid #ccc;
            padding: 12px;
            text-align: center;
            border-radius: 6px;
        }
        .resumo-item strong {
            display: block;
            font-size: 11px;
            color: #666;
        }
        .resumo-item span {
            display: block;
            margin-top: 5px;
            font-size: 18px;
            font-weight: bold;
        }
        .rodape {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        .obs-box {
            margin-top: 20px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-size: 12px;
        }
        .obs-box strong {
            display: block;
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        @page { size: A4 landscape; margin: 10mm; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>

    <div class="cabecalho">
        <h1>RELATÓRIO DE CÁLCULO DE PONTO</h1>
        <p>Sistema de Cálculo de Ponto</p>
        <p>Registro realizado em: ${registro.dataHora}</p>
    </div>

    <div class="informacoes">
        <div class="info">
            <strong>Total Extra 50%</strong>
            <span>${dados.totalExtras}</span>
        </div>
        <div class="info">
            <strong>Total Extra 100%</strong>
            <span>${dados.totalFeriado}</span>
        </div>
        <div class="info">
            <strong>Total de Dias</strong>
            <span>${dados.totalDias}</span>
        </div>
        <div class="info">
            <strong>Dias com Extra</strong>
            <span>${dados.diasExtra}</span>
        </div>
        <div class="info">
            <strong>cod-ID</strong>
            <span>${codIDfunc}</span>
        </div>
        <div class="info">
            <strong>COLABORADOR</strong>
            <span>${nomefunc}</span>
        </div>
        <div class="info">
            <strong>Cargo / Função</strong>
            <span>${cargofunc || '—'}</span>
        </div>
        <div class="info">
            <strong>Mês de Referência</strong>
            <span>${mesref || '—'}</span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Dia</th>
                <th>Entrada</th>
                <th>Saída Alm.</th>
                <th>Volta Alm.</th>
                <th>Saída</th>
                <th>Sábado</th>
                <th>Feriado</th>
                <th>Total</th>
                <th>Extra</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Nota</th>
            </tr>
        </thead>
        <tbody>
            ${linhasTabela}
        </tbody>
    </table>

    <div class="resumo">
        <h2>Resumo do Cálculo</h2>
        <div class="resumo-grid">
            <div class="resumo-item">
                <strong>Extra 50%</strong>
                <span>${dados.totalExtras}</span>
            </div>
            <div class="resumo-item">
                <strong>Extra 100%</strong>
                <span>${dados.totalFeriado}</span>
            </div>
            <div class="resumo-item">
                <strong>Total de Dias</strong>
                <span>${dados.totalDias}</span>
            </div>
            <div class="resumo-item">
                <strong>Dias com Extra</strong>
                <span>${dados.diasExtra}</span>
            </div>
        </div>
    </div>

    ${obsfunc ? `
    <div class="obs-box">
        <strong>Observações</strong>
        ${obsfunc}
    </div>
    ` : ''}

    <div class="rodape">
        Relatório gerado pelo Sistema de Cálculo de Ponto
        <br>
        ${new Date().toLocaleString('pt-BR')}
    </div>

</body>
</html>
    `);

    janela.document.close();

    janela.onload = function() {
        janela.focus();
        janela.print();
    };
}

// ================================================================
// ==================== EXPORTAR EXCEL (CSV) ====================
// ================================================================

function exportarExcel() {
    calcularFolha();
    if (!window.dadosCalculados) {
        mostrarToast('Calcule os resultados primeiro!', 'error');
        return;
    }

    let csv = '\uFEFFDia,Entrada,Saída Almoço,Volta Almoço,Saída,Sábado,Feriado,Total,Extra,Valor,Status,Nota\n';
    window.dadosCalculados.linhas.forEach(l => {
        csv += `${String(l.dia).padStart(2, '0')},${l.entrada},${l.saidaAlmoco},${l.voltaAlmoco},${l.saida},${l.isSabado ? 'Sim' : 'Não'},${l.isFeriado ? 'Sim' : 'Não'},${l.total},${l.extra},${l.valor || 'R$ 0,00'},${l.status.replace(/<[^>]*>/g, '').trim()},${l.nota || ''}\n`;
    });
    
    csv += `\nResumo,,,,,,,,,,,\n`;
    csv += `Total Extra 50%,${window.dadosCalculados.totalExtras},,,,,,,,,,\n`;
    csv += `Total Extra 100%,${window.dadosCalculados.totalFeriado},,,,,,,,,,\n`;
    csv += `Total de Dias,${window.dadosCalculados.totalDias},,,,,,,,,,\n`;
    csv += `Dias com Extra,${window.dadosCalculados.diasExtra},,,,,,,,,,\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ponto_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    mostrarToast('📊 Excel exportado com sucesso!', 'success');
}

// ================================================================
// ==================== IMPORTAR CSV ====================
// ================================================================

function importarCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const texto = event.target.result;
                const linhas = texto.split('\n').filter(line => line.trim());
                const dados = linhas.slice(1).filter(line => {
                    const cols = line.split(',');
                    return cols.length >= 9 && (cols[1] || cols[4]);
                });
                
                if (dados.length === 0) {
                    mostrarToast('Nenhum dado válido encontrado no CSV', 'warning');
                    return;
                }
                
                let importados = 0;
                dados.forEach(line => {
                    const cols = line.split(',');
                    const dia = parseInt(cols[0]);
                    if (dia >= 1 && dia <= 31) {
                        const linha = document.getElementById(`dia-${dia}`);
                        if (linha) {
                            linha.querySelector(".entrada").value = cols[1] || '';
                            linha.querySelector(".saidaAlmoco").value = cols[2] || '';
                            linha.querySelector(".voltaAlmoco").value = cols[3] || '';
                            linha.querySelector(".saida").value = cols[4] || '';
                            linha.querySelector(".isSabado").checked = cols[5]?.toLowerCase().includes('sim') || false;
                            linha.querySelector(".feriado").checked = cols[6]?.toLowerCase().includes('sim') || false;
                            if (linha.querySelector(".nota-dia") && cols[11]) {
                                linha.querySelector(".nota-dia").value = cols[11] || '';
                            }
                            calcularLinha(linha);
                            importados++;
                        }
                    }
                });
                
                marcarTodasLinhas();
                mostrarToast(` ${importados} dias importados com sucesso!`, 'success');
                atualizarStatsResumo();
            } catch (err) {
                mostrarToast('❌ Erro ao importar CSV: formato inválido', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ================================================================
// ==================== MODAIS ====================
// ================================================================

function fecharModal(id) {
    document.getElementById(id).style.display = 'none';
}

window.onclick = function(event) {
    const modais = ['modalConsulta', 'modalDashboard', 'modalCalendario', 'modalConfig', 'modalRegistro', 'modalPreencherPadrao', 'modalMovimentacao', 'modalSalvarCalculo'];
    modais.forEach(id => {
        const modal = document.getElementById(id);
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });
};

// ================================================================
// ==================== PREVENÇÃO DE PERDA ====================
// ================================================================

window.addEventListener('beforeunload', function(e) {
    const temDados = document.querySelectorAll("#tabelaBody input[type='time']");
    let temPreenchido = false;
    temDados.forEach(input => {
        if (input.value) temPreenchido = true;
    });
    if (temPreenchido) {
        e.preventDefault();
        e.returnValue = 'Você tem dados não salvos. Deseja realmente sair?';
    }
});

// ================================================================
// ==================== REDIMENSIONAMENTO ====================
// ================================================================

window.addEventListener('resize', function() {
    aplicarConfigMobile();
});

// ================================================================
// ==================== TELA DE LOGIN ====================
// ================================================================

function verificarLogin() {
    const input = document.getElementById('senhaLogin');
    const erro = document.getElementById('loginErro');
    const box = document.querySelector('.login-box');
    const senha = input.value.trim();

    if (!senha) {
        erro.textContent = 'Digite a senha para continuar.';
        box.classList.add('erro');
        setTimeout(() => box.classList.remove('erro'), 400);
        return;
    }

    if (SNPTC.includes(senha)) {
        // Sucesso — guarda a senha para usar como cod-ID
        sessionStorage.setItem('autenticado', 'true');
        sessionStorage.setItem('usuarioSenha', senha);
        document.getElementById('telaLogin').classList.add('escondida');
        erro.textContent = '';
        input.value = '';
        mostrarToast('Bem-vindo!', 'success');
    } else {
        // Erro
        erro.textContent = '❌ Senha incorreta. Tente novamente.';
        box.classList.add('erro');
        setTimeout(() => box.classList.remove('erro'), 400);
        input.value = '';
        input.focus();
    }
}

function toggleSenha() {
    const input = document.getElementById('senhaLogin');
    const icone = document.getElementById('iconeOlho');
    if (input.type === 'password') {
        input.type = 'text';
        icone.classList.remove('fa-eye');
        icone.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icone.classList.remove('fa-eye-slash');
        icone.classList.add('fa-eye');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const inputSenha = document.getElementById('senhaLogin');
    if (inputSenha) {
        inputSenha.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                verificarLogin();
            }
        });
    }
});

console.log('🚀 Calculadora Profissional de Ponto carregada com sucesso!');
console.log(' Tela de login com cod-ID');
console.log(' Modal de salvar com nome do funcionário');
console.log(' Relatório com cod-ID, nome, cargo e mês');
