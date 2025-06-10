const { ipcRenderer } = require('electron');

// Funções para controle de tempo
let tempoInicio = null;
let tempoPausa = null;
let tempoTotal = 0;
let intervalo = null;
let tarefaAtual = null;
let ultimaAcao = null; // 'play', 'pause' ou 'stop'

// Função para mostrar/esconder botões
function mostrarBotao(id, mostrar) {
    const botao = document.getElementById(id);
    if (botao) {
        botao.style.display = mostrar ? 'flex' : 'none';
        console.log(`Botão ${id} ${mostrar ? 'mostrado' : 'escondido'}`);
    }
}

// Função para enviar estado do cronômetro para o relógio
function enviarEstadoCronometro() {
    let ultimoApontamento = null;
    
    // Se acabou de finalizar um apontamento, usa o horário atual
    if (ultimaAcao === 'stop') {
        ultimoApontamento = new Date();
    } 
    // Se está em um apontamento, usa o horário de início
    else if (tempoInicio) {
        ultimoApontamento = tempoInicio;
    }
    
    const estado = {
        parado: !intervalo,
        ultimoApontamento: ultimoApontamento
    };
    
    console.log('Enviando estado do cronômetro:', {
        parado: estado.parado,
        ultimoApontamento: ultimoApontamento ? ultimoApontamento.toLocaleTimeString() : null,
        ultimaAcao: ultimaAcao
    });
    
    ipcRenderer.send('cronometro-estado', estado);
}

// Função para iniciar contagem
function iniciarContagem() {
    const tarefaSelecionada = document.getElementById('tarefas-dropdown').value;
    if (!tarefaSelecionada) {
        alert('Selecione uma tarefa primeiro!');
        return;
    }

    tarefaAtual = tarefaSelecionada;
    tempoInicio = new Date();
    ultimaAcao = 'play';
    
    // Atualiza os botões
    mostrarBotao('btn-play', false);
    mostrarBotao('btn-pause', true);
    mostrarBotao('btn-stop', true);

    // Inicia o contador
    intervalo = setInterval(atualizarContador, 1000);
    
    // Envia estado atualizado
    enviarEstadoCronometro();
}

// Função para pausar contagem
async function pausarContagem() {
    if (intervalo) {
        clearInterval(intervalo);
        tempoPausa = new Date();
        tempoTotal += (tempoPausa - tempoInicio);
        ultimaAcao = 'pause';
        
        // Salva os dados da pausa
        const dados = {
            tarefa: tarefaAtual,
            matricula: document.getElementById('matricula').value,
            inicio: tempoInicio,
            pausa: tempoPausa,
            fim: tempoPausa, // Usa o tempo de pausa como fim
            tempoTotal: tempoPausa - tempoInicio
        };

        // Salva os dados
        const sucesso = await ipcRenderer.invoke('salvar-dados', dados);
        if (!sucesso) {
            alert('Erro ao salvar os dados da pausa. Por favor, tente novamente.');
        }
        
        // Atualiza os botões
        mostrarBotao('btn-play', true);
        mostrarBotao('btn-pause', false);
        mostrarBotao('btn-stop', true);
        
        // Envia estado atualizado
        enviarEstadoCronometro();
    }
}

// Função para finalizar contagem
async function finalizarContagem() {
    // Limpa o intervalo primeiro
    if (intervalo) {
        clearInterval(intervalo);
        intervalo = null;
    }
    
    const tempoFinal = new Date();
    const tempoTotalCalculado = tempoPausa ? 
        (tempoPausa - tempoInicio) : 
        (tempoFinal - tempoInicio);

    // Prepara os dados para salvar
    const dados = {
        tarefa: tarefaAtual,
        matricula: document.getElementById('matricula').value,
        inicio: tempoInicio,
        pausa: tempoPausa,
        fim: tempoFinal,
        tempoTotal: tempoTotalCalculado
    };

    // Salva os dados
    const sucesso = await ipcRenderer.invoke('salvar-dados', dados);
    
    if (sucesso) {
        console.log('Dados salvos com sucesso!');
    } else {
        alert('Erro ao salvar os dados. Por favor, tente novamente.');
    }

    // Reseta o contador e os botões
    document.getElementById('clock').textContent = '00:00:00';
    
    // Atualiza os botões
    mostrarBotao('btn-play', true);
    mostrarBotao('btn-pause', false);
    mostrarBotao('btn-stop', false);
    
    // Reseta todas as variáveis de tempo
    tempoInicio = null;
    tempoPausa = null;
    tempoTotal = 0;
    tarefaAtual = null;
    ultimaAcao = 'stop';

    // Envia estado atualizado com o último apontamento
    enviarEstadoCronometro();
}

// Função para atualizar o contador
function atualizarContador() {
    const agora = new Date();
    const tempoDecorrido = tempoPausa ? 
        tempoTotal + (agora - tempoInicio) : 
        (agora - tempoInicio);
    
    const horas = Math.floor(tempoDecorrido / 3600000);
    const minutos = Math.floor((tempoDecorrido % 3600000) / 60000);
    const segundos = Math.floor((tempoDecorrido % 60000) / 1000);
    
    document.getElementById('clock').textContent = 
        `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

// Função para exportar dados do dia
async function exportarDadosDoDia() {
    const sucesso = await ipcRenderer.invoke('exportar-dados-dia');
    if (sucesso) {
        alert('Dados do dia exportados com sucesso!');
    } else {
        alert('Não há dados do dia atual para exportar!');
    }
}

// Função para selecionar a primeira tarefa do dropdown
function selecionarTarefaDropdown() {
    const dropdown = document.getElementById('tarefas-dropdown');
    if (dropdown && dropdown.options.length > 0) {
        dropdown.selectedIndex = 0;
        // Dispara o evento change para notificar que uma tarefa foi selecionada
        const event = new Event('change');
        dropdown.dispatchEvent(event);
    }
}

// Função para atualizar o dia
function atualizarDia() {
    const agora = new Date();
    const opcoes = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const diaFormatado = agora.toLocaleDateString('pt-BR', opcoes);
    document.getElementById('day').textContent = diaFormatado;
}

// Adiciona os event listeners quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Atualiza o dia
    atualizarDia();
    
    // Adiciona o evento de Enter no campo de matrícula
    document.getElementById('matricula').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarTarefas();
        }
    });
}); 