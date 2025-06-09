const {app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');

let mainWindow;
let cronogramaWindow = null;
let moveTimeout = null;
let tempoInicio = null;
let tempoPausa = null;
let tempoTotal = 0;
let intervalo = null;
let tarefaAtual = null;

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const relogioWidth = 100;
    const relogioHeight = 100;

    // Cria a janela do relógio
    mainWindow = new BrowserWindow({
        width: relogioWidth,
        height: relogioHeight,
        x: 0, // canto esquerdo
        y: height - relogioHeight, // parte inferior
        resizable: false,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        autoHideMenuBar: true,
        title: '',
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Força a transparência no Windows
    mainWindow.setBackgroundColor('#00000000');
    
    // Carrega o arquivo HTML do relógio
    const relogioPath = path.join(__dirname, 'relogio.html');
    console.log('Carregando relogio.html de:', relogioPath);
    mainWindow.loadFile(relogioPath).catch(err => {
        console.error('Erro ao carregar relogio.html:', err);
    });

    // Adiciona evento para atualizar a posição do cronograma quando o relógio for movido
    mainWindow.on('moved', () => {
        if (cronogramaWindow && !cronogramaWindow.isDestroyed()) {
            const relogioBounds = mainWindow.getBounds();
            const display = screen.getDisplayMatching(relogioBounds);
            const { width: scrW, height: scrH, x: scrX, y: scrY } = display.workArea;

            const cronogramaWidth = 400;
            const cronogramaHeight = 200;

            // Calcula a posição central do relógio
            let cronogramaX = relogioBounds.x + (relogioBounds.width - cronogramaWidth) / 2;
            let cronogramaY = relogioBounds.y + (relogioBounds.height - cronogramaHeight) / 2;

            // Ajusta a posição para garantir que o cronograma fique dentro dos limites da tela
            if (cronogramaX < scrX) {
                cronogramaX = scrX;
            } else if (cronogramaX + cronogramaWidth > scrX + scrW) {
                cronogramaX = scrX + scrW - cronogramaWidth;
            }

            if (cronogramaY < scrY) {
                cronogramaY = scrY;
            } else if (cronogramaY + cronogramaHeight > scrY + scrH) {
                cronogramaY = scrY + scrH - cronogramaHeight;
            }

            cronogramaWindow.setPosition(cronogramaX, cronogramaY);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (cronogramaWindow) cronogramaWindow.close();
    });

    // Evento para snap-to-edge em qualquer monitor
    mainWindow.on('move', () => {
        if (moveTimeout) clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
            snapToEdge(mainWindow);
        }, 200); // 200ms após parar de mover, faz o snap
    });
    
    mainWindow.on('focus', () => {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.setBackgroundColor('#00000000');
    });

    mainWindow.on('blur', () => {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.setBackgroundColor('#00000000');
    });

    // Força a transparência ao iniciar
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.setBackgroundColor('#00000000');
    });
}

function createCronogramaWindow() {
    // Verifica se a janela do cronograma já existe
    if (cronogramaWindow && !cronogramaWindow.isDestroyed()) {
        // Atualiza a posição da janela existente
        const relogioBounds = mainWindow.getBounds();
        const display = screen.getDisplayMatching(relogioBounds);
        const { width: scrW, height: scrH, x: scrX, y: scrY } = display.workArea;

        const cronogramaWidth = 400;
        const cronogramaHeight = 300;

        // Calcula a posição central do relógio
        let cronogramaX = relogioBounds.x + (relogioBounds.width - cronogramaWidth) / 2;
        let cronogramaY = relogioBounds.y + (relogioBounds.height - cronogramaHeight) / 2;

        // Ajusta a posição para garantir que o cronograma fique dentro dos limites da tela
        if (cronogramaX < scrX) {
            cronogramaX = scrX;
        } else if (cronogramaX + cronogramaWidth > scrX + scrW) {
            cronogramaX = scrX + scrW - cronogramaWidth;
        }

        if (cronogramaY < scrY) {
            cronogramaY = scrY;
        } else if (cronogramaY + cronogramaHeight > scrY + scrH) {
            cronogramaY = scrY + scrH - cronogramaHeight;
        }

        cronogramaWindow.setPosition(cronogramaX, cronogramaY);
        cronogramaWindow.show();
        cronogramaWindow.focus();
        return;
    }

    // Obtém a posição atual do relógio
    const relogioBounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(relogioBounds);
    const { width: scrW, height: scrH, x: scrX, y: scrY } = display.workArea;

    // Dimensões do cronograma
    const cronogramaWidth = 400;
    const cronogramaHeight = 300;

    // Calcula a posição central do relógio
    let cronogramaX = relogioBounds.x + (relogioBounds.width - cronogramaWidth) / 2;
    let cronogramaY = relogioBounds.y + (relogioBounds.height - cronogramaHeight) / 2;

    // Ajusta a posição para garantir que o cronograma fique dentro dos limites da tela
    if (cronogramaX < scrX) {
        cronogramaX = scrX;
    } else if (cronogramaX + cronogramaWidth > scrX + scrW) {
        cronogramaX = scrX + scrW - cronogramaWidth;
    }

    if (cronogramaY < scrY) {
        cronogramaY = scrY;
    } else if (cronogramaY + cronogramaHeight > scrY + scrH) {
        cronogramaY = scrY + scrH - cronogramaHeight;
    }

    // Cria a janela do cronograma
    cronogramaWindow = new BrowserWindow({
        width: cronogramaWidth,
        height: cronogramaHeight,
        x: cronogramaX,
        y: cronogramaY,
        resizable: false,
        parent: mainWindow,
        modal: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        autoHideMenuBar: false,
        frame: false,
    });

    // Carrega o arquivo HTML do cronograma
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Carregando index.html de:', indexPath);
    cronogramaWindow.loadFile(indexPath).catch(err => {
        console.error('Erro ao carregar index.html:', err);
    });
    
    cronogramaWindow.on('closed', () => {
        cronogramaWindow = null;
    });
}

// Snap para a borda mais próxima do monitor atual
function snapToEdge(win) {
    if (!win) return;
    const bounds = win.getBounds();
    const display = screen.getDisplayMatching(bounds);
    const { width: scrW, height: scrH, x: scrX, y: scrY } = display.workArea;
    const winW = bounds.width;
    const winH = bounds.height;
    let x = bounds.x;
    let y = bounds.y;

    // Calcula distâncias para cada borda do monitor atual
    const distLeft = x - scrX;
    const distRight = (scrX + scrW) - (x + winW);
    const distTop = y - scrY;
    const distBottom = (scrY + scrH) - (y + winH);

    // Encontra a menor distância
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    // Sempre aplica o snap para a borda mais próxima
    if (minDist === distLeft) x = scrX;
    else if (minDist === distRight) x = scrX + scrW - winW;
    else if (minDist === distTop) y = scrY;
    else if (minDist === distBottom) y = scrY + scrH - winH;

    win.setPosition(x, y);
}

ipcMain.on('abrir-cronograma', () => {
    createCronogramaWindow();
});

ipcMain.on('minimizar-cronograma', () => {
    if (cronogramaWindow && !cronogramaWindow.isDestroyed()) {
        cronogramaWindow.hide();
    }
});

app.whenReady().then(() => {
    createWindow();
    agendarExportacaoAutomatica();
});

app.on('window-all-closed', () => {
    app.quit();
});

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

function finalizarContagem() {
    if (intervalo) {
        clearInterval(intervalo);
    }
    
    const tempoFinal = new Date();
    const tempoTotal = tempoPausa ? 
        (tempoPausa - tempoInicio) : 
        (tempoFinal - tempoInicio);

    // Salva os dados
    const dados = {
        matricula: document.getElementById('matricula').value,
        tarefa: tarefaAtual,
        inicio: tempoInicio,
        pausa: tempoPausa,
        fim: tempoFinal,
        tempoTotal: tempoTotal
    };

    // Salva os dados na planilha
    salvarDados(dados);

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

function salvarDados(dados) {
    try {
        const nomeArquivo = 'Apontamento_Horas.xlsx';
        const caminhoArquivo = path.join(process.cwd(), nomeArquivo);
        console.log('Tentando salvar dados em:', caminhoArquivo);
        console.log('Dados a serem salvos:', dados);
        
        let workbook;
        if (fs.existsSync(caminhoArquivo)) {
            console.log('Arquivo existente encontrado, lendo...');
            workbook = XLSX.readFile(caminhoArquivo);
        } else {
            console.log('Criando novo arquivo...');
            workbook = XLSX.utils.book_new();
            const dadosIniciais = [
                ['OIDINTERFACE', 'FGIMPORT', 'CDISOSYSTEM', 'FGOPTION', 'NMFIELD01', 'NMFIELD02', 
                 'NMFIELD04', 'NMFIELD05', 'NMFIELD06', 'NMFIELD08', 'NMFIELD09', 'NMFIELD10']
            ];
            const worksheet = XLSX.utils.aoa_to_sheet(dadosIniciais);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Apontamentos');
        }

        const worksheet = workbook.Sheets['Apontamentos'];
        const dadosExistentes = XLSX.utils.sheet_to_json(worksheet);
        console.log('Dados existentes:', dadosExistentes);

        // Gera o próximo número sequencial
        const proximoSequencial = dadosExistentes.length + 1;

        // Formata a data e hora
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const horaInicio = formatarDataHora(dados.inicio);
        const horaFim = formatarDataHora(dados.fim);

        const dadosFormatados = {
            'OIDINTERFACE': proximoSequencial.toString(),
            'FGIMPORT': '2',
            'CDISOSYSTEM': '205',
            'FGOPTION': '1',
            'NMFIELD01': dados.matricula,
            'NMFIELD02': dados.tarefa,
            'NMFIELD04': dataAtual,
            'NMFIELD05': horaInicio,
            'NMFIELD06': horaFim,
            'NMFIELD08': '1',
            'NMFIELD09': '',
            'NMFIELD10': '1'
        };
        console.log('Dados formatados:', dadosFormatados);

        dadosExistentes.push(dadosFormatados);
        const novaWorksheet = XLSX.utils.json_to_sheet(dadosExistentes);
        workbook.Sheets['Apontamentos'] = novaWorksheet;

        // Garante que o diretório existe
        const diretorio = path.dirname(caminhoArquivo);
        if (!fs.existsSync(diretorio)) {
            fs.mkdirSync(diretorio, { recursive: true });
        }

        // Tenta salvar o arquivo
        try {
            XLSX.writeFile(workbook, caminhoArquivo);
            console.log('Dados salvos com sucesso em:', caminhoArquivo);
            
            // Verifica se o arquivo foi realmente criado
            if (fs.existsSync(caminhoArquivo)) {
                console.log('Arquivo confirmado como criado');
                // Notifica a janela do relógio sobre o novo apontamento
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('atualizar-apontamento');
                }
                return true;
            } else {
                console.error('Arquivo não foi criado, apesar de não ter erros');
                return false;
            }
        } catch (erroEscrita) {
            console.error('Erro ao escrever o arquivo:', erroEscrita);
            return false;
        }
    } catch (erro) {
        console.error('Erro ao salvar dados:', erro);
        return false;
    }
}

// Função para formatar data e hora
function formatarDataHora(data) {
    if (!data) return '';
    return data.toLocaleString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Função para exportar dados do dia
function exportarDadosDia() {
    try {
        const nomeArquivo = 'Apontamento_Horas.xlsx';
        const caminhoArquivo = path.join(process.cwd(), nomeArquivo);
        console.log('Tentando exportar dados de:', caminhoArquivo);
        
        if (!fs.existsSync(caminhoArquivo)) {
            console.log('Arquivo não encontrado em:', caminhoArquivo);
            return false;
        }

        const workbook = XLSX.readFile(caminhoArquivo);
        const worksheet = workbook.Sheets['Apontamentos'];
        const dados = XLSX.utils.sheet_to_json(worksheet);
        console.log('Todos os dados encontrados:', dados);

        const dataAtual = new Date().toLocaleDateString('pt-BR');
        console.log('Data atual:', dataAtual);
        
        const dadosDoDia = dados.filter(linha => linha['Data'] === dataAtual);
        console.log('Dados do dia:', dadosDoDia);

        if (dadosDoDia.length === 0) {
            console.log('Nenhum dado encontrado para hoje');
            return false;
        }

        const workbookDia = XLSX.utils.book_new();
        const worksheetDia = XLSX.utils.json_to_sheet(dadosDoDia);
        XLSX.utils.book_append_sheet(workbookDia, worksheetDia, 'Apontamentos_Dia');

        const nomeArquivoDia = `Apontamento_Horas_${dataAtual.replace(/\//g, '-')}.xlsx`;
        const caminhoArquivoDia = path.join(process.cwd(), nomeArquivoDia);
        console.log('Salvando arquivo do dia em:', caminhoArquivoDia);

        // Garante que o diretório existe
        const diretorio = path.dirname(caminhoArquivoDia);
        if (!fs.existsSync(diretorio)) {
            fs.mkdirSync(diretorio, { recursive: true });
        }

        // Tenta salvar o arquivo
        try {
            XLSX.writeFile(workbookDia, caminhoArquivoDia);
            console.log('Arquivo do dia salvo com sucesso em:', caminhoArquivoDia);
            
            // Verifica se o arquivo foi realmente criado
            if (fs.existsSync(caminhoArquivoDia)) {
                console.log('Arquivo confirmado como criado');
                return true;
            } else {
                console.error('Arquivo não foi criado, apesar de não ter erros');
                return false;
            }
        } catch (erroEscrita) {
            console.error('Erro ao escrever o arquivo:', erroEscrita);
            return false;
        }
    } catch (erro) {
        console.error('Erro ao exportar dados:', erro);
        return false;
    }
}

// Adiciona os handlers do IPC
ipcMain.handle('salvar-dados', async (event, dados) => {
    console.log('Recebendo dados para salvar:', dados);
    try {
        await salvarDados(dados);
        console.log('Dados salvos com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        return false;
    }
});

ipcMain.handle('exportar-dados-dia', async () => {
    console.log('Iniciando exportação de dados do dia');
    try {
        await exportarDadosDia();
        console.log('Dados exportados com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        return false;
    }
});

// Função para calcular o tempo até a próxima meia-noite
function getTimeUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
}

// Função para exportar automaticamente à meia-noite
function agendarExportacaoAutomatica() {
    const tempoAteMeiaNoite = getTimeUntilMidnight();
    
    // Agenda a exportação para a próxima meia-noite
    setTimeout(() => {
        console.log('Iniciando exportação automática...');
        exportarDadosDia();
        
        // Agenda a próxima exportação para 24 horas depois
        setInterval(() => {
            console.log('Iniciando exportação automática...');
            exportarDadosDia();
        }, 24 * 60 * 60 * 1000); // 24 horas em milissegundos
    }, tempoAteMeiaNoite);
}
