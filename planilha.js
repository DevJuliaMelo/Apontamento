const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

class GerenciadorPlanilha {
    constructor() {
        this.nomeArquivo = 'Apontamento_Horas.xlsx';
        this.caminhoArquivo = path.join(process.cwd(), this.nomeArquivo);
        console.log('Caminho da planilha:', this.caminhoArquivo);
        this.sequencialDia = this.obterSequencialDia();
        this.inicializarPlanilha();
    }

    obterSequencialDia() {
        try {
            if (fs.existsSync(this.caminhoArquivo)) {
                const workbook = XLSX.readFile(this.caminhoArquivo);
                const worksheet = workbook.Sheets['Apontamentos'];
                const dados = XLSX.utils.sheet_to_json(worksheet);
                
                const dataAtual = new Date().toLocaleDateString('pt-BR');
                const dadosDoDia = dados.filter(linha => linha['NMFIELD04'] === dataAtual);
                
                return dadosDoDia.length + 1;
            }
        } catch (erro) {
            console.error('Erro ao obter sequencial do dia:', erro);
        }
        return 1;
    }

    inicializarPlanilha() {
        try {
            if (!fs.existsSync(this.caminhoArquivo)) {
                console.log('Criando nova planilha em:', this.caminhoArquivo);
                const workbook = XLSX.utils.book_new();
                const dados = [
                    ['OIDINTERFACE', 'FGIMPORT', 'CDISOSYSTEM', 'FGOPTION', 'NMFIELD01', 'NMFIELD02', 
                     'NMFIELD04', 'NMFIELD05', 'NMFIELD06', 'NMFIELD08', 'NMFIELD09', 'NMFIELD10']
                ];
                const worksheet = XLSX.utils.aoa_to_sheet(dados);
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Apontamentos');
                XLSX.writeFile(workbook, this.caminhoArquivo);
                console.log('Planilha criada com sucesso!');
            }
        } catch (erro) {
            console.error('Erro ao inicializar planilha:', erro);
        }
    }

    salvarApontamento(dados) {
        try {
            console.log('Salvando apontamento em:', this.caminhoArquivo);
            const workbook = XLSX.readFile(this.caminhoArquivo);
            const worksheet = workbook.Sheets['Apontamentos'];
            
            const dataAtual = new Date().toLocaleDateString('pt-BR');
            const horaInicio = this.formatarHora(dados.inicio);
            const horaFim = this.formatarHora(dados.fim);

            const dadosFormatados = {
                'OIDINTERFACE': this.sequencialDia++,
                'FGIMPORT': 2,
                'CDISOSYSTEM': 205,
                'FGOPTION': 1,
                'NMFIELD01': '',
                'NMFIELD02': '',
                'NMFIELD04': dataAtual,
                'NMFIELD05': horaInicio,
                'NMFIELD06': horaFim,
                'NMFIELD08': 1,
                'NMFIELD09': '',
                'NMFIELD10': 1
            };

            const dadosExistentes = XLSX.utils.sheet_to_json(worksheet);
            dadosExistentes.push(dadosFormatados);
            
            const novaWorksheet = XLSX.utils.json_to_sheet(dadosExistentes);
            workbook.Sheets['Apontamentos'] = novaWorksheet;
            
            XLSX.writeFile(workbook, this.caminhoArquivo);
            console.log('Dados salvos com sucesso!');
            return true;
        } catch (erro) {
            console.error('Erro ao salvar apontamento:', erro);
            return false;
        }
    }

    exportarDadosDia() {
        try {
            console.log('Exportando dados do dia de:', this.caminhoArquivo);
            const workbook = XLSX.readFile(this.caminhoArquivo);
            const worksheet = workbook.Sheets['Apontamentos'];
            const dados = XLSX.utils.sheet_to_json(worksheet);
            
            const dataAtual = new Date().toLocaleDateString('pt-BR');
            const dadosDoDia = dados.filter(linha => linha['NMFIELD04'] === dataAtual);

            if (dadosDoDia.length === 0) {
                console.log('Nenhum dado encontrado para o dia atual');
                return false;
            }

            const workbookDia = XLSX.utils.book_new();
            const worksheetDia = XLSX.utils.json_to_sheet(dadosDoDia);
            XLSX.utils.book_append_sheet(workbookDia, worksheetDia, 'Apontamentos_Dia');

            const nomeArquivoDia = `Apontamento_Horas_${dataAtual.replace(/\//g, '-')}.xlsx`;
            const caminhoArquivoDia = path.join(process.cwd(), nomeArquivoDia);
            
            XLSX.writeFile(workbookDia, caminhoArquivoDia);
            console.log('Dados do dia exportados com sucesso para:', caminhoArquivoDia);
            return true;
        } catch (erro) {
            console.error('Erro ao exportar dados do dia:', erro);
            return false;
        }
    }

    formatarHora(data) {
        if (!data) return '';
        return data.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

module.exports = GerenciadorPlanilha;