// src/renderer.js

// Funções para controle de tempo
let tempoInicio = null;
let tempoPausa = null;
let tempoTotal = 0;
let intervalo = null;
let tarefaAtual = null;

// Função para iniciar contagem
function iniciarContagem() {
    const tarefaSelecionada = document.getElementById('tarefas-dropdown').value;
    if (!tarefaSelecionada) {
        alert('Selecione uma tarefa primeiro!');
        return;
    }

    tarefaAtual = tarefaSelecionada;
    tempoInicio = new Date();
    
    // Atualiza os botões
    document.querySelector('.btn-controle.play').disabled = true;
    document.querySelector('.btn-controle.pause').disabled = false;
    document.querySelector('.btn-controle.stop').disabled = false;

    // Inicia o contador
    intervalo = setInterval(atualizarContador, 1000);
}

// Função para pausar contagem
function pausarContagem() {
    if (intervalo) {
        clearInterval(intervalo);
        tempoPausa = new Date();
        tempoTotal += (tempoPausa - tempoInicio);
        
        // Atualiza os botões
        document.querySelector('.btn-controle.play').disabled = false;
        document.querySelector('.btn-controle.pause').disabled = true;
    }
}

// Função para finalizar contagem
async function finalizarContagem() {
    if (intervalo) {
        clearInterval(intervalo);
    }
    
    const tempoFinal = new Date();
    const tempoTotal = tempoPausa ? 
        (tempoPausa - tempoInicio) : 
        (tempoFinal - tempoInicio);

    // Prepara os dados para salvar
    const dados = {
        tarefa: tarefaAtual,
        matricula: document.getElementById('matricula').value,
        inicio: tempoInicio,
        pausa: tempoPausa,
        fim: tempoFinal,
        tempoTotal: tempoTotal
    };

    // Salva os dados
    const sucesso = await window.electron.ipcRenderer.invoke('salvar-dados', dados);
    
    if (sucesso) {
        console.log('Dados salvos com sucesso!');
    } else {
        alert('Erro ao salvar os dados. Por favor, tente novamente.');
    }

    // Reseta o contador
    document.querySelector('.tempo-contador').textContent = '00:00:00';
    document.querySelector('.btn-controle.play').disabled = false;
    document.querySelector('.btn-controle.pause').disabled = true;
    document.querySelector('.btn-controle.stop').disabled = true;
    
    tempoInicio = null;
    tempoPausa = null;
    tempoTotal = 0;
    tarefaAtual = null;
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
    
    document.querySelector('.tempo-contador').textContent = 
        `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

// Função para exportar dados do dia
async function exportarDadosDoDia() {
    const sucesso = await window.electron.ipcRenderer.invoke('exportar-dados-dia');
    if (sucesso) {
        alert('Dados do dia exportados com sucesso!');
    } else {
        alert('Não há dados do dia atual para exportar!');
    }
}

// Adiciona os event listeners quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Adiciona o evento de Enter no campo de matrícula
    document.getElementById('matricula').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarTarefas();
        }
    });

    const clockElement = document.getElementById('clock');

    function updateClock() {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    setInterval(updateClock, 1000);
    updateClock();

    clockElement.addEventListener('dblclick', () => {
        ipcRenderer.send('abrir-cronograma');
    });
});