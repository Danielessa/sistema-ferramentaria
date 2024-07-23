document.addEventListener('DOMContentLoaded', function() {
    let dados = [];

    fetch('/api/historico-emprestimos')
    .then(response => response.json())
    .then(data => {
        dados = data;
        preencherTabela(dados);
    })
    .catch(error => {
        console.error('Erro ao carregar o histórico de empréstimos:', error);
    });

    const filtros = {
        filtroId: '',
        filtroFerramenta: '',
        filtroPessoa: '',
        filtroStatus: '',
        filtroData: '',
        filtroLocal: ''
    };

    const inputsFiltro = document.querySelectorAll('thead input');
    inputsFiltro.forEach(input => {
        input.addEventListener('input', function() {
            filtros[this.id] = this.value.toLowerCase();
        });
    });

    document.getElementById('buscar').addEventListener('click', () => {
        aplicarFiltros();
        limparFiltros();
    });

    function aplicarFiltros() {
        const dadosFiltrados = dados.filter(emprestimo => {
            return Object.keys(filtros).every(chave => {
                if (!filtros[chave]) return true;

                let propriedade = chave.replace('filtro', '').toLowerCase();
                switch(propriedade) {
                    case 'id':
                        propriedade = 'id_ferramenta';
                        break;
                    case 'ferramenta':
                        propriedade = 'nome_ferramenta';
                        break;
                    case 'pessoa':
                        propriedade = 'nome_usuario';
                        break;
                    case 'data':
                        propriedade = 'data_emprestimo';
                        break;
                    // 'status' and 'local' match directly
                }

                const valorEmprestimo = emprestimo[propriedade] ? emprestimo[propriedade].toString().toLowerCase() : '';
                return valorEmprestimo.includes(filtros[chave]);
            });
        });
        preencherTabela(dadosFiltrados);
    }

    function limparFiltros() {
        inputsFiltro.forEach(input => {
            input.value = '';
        });

        Object.keys(filtros).forEach(chave => {
            filtros[chave] = '';
        });
    }

    function preencherTabela(dados) {
        const tabela = document.getElementById('historicoEmprestimos').querySelector('tbody');
        tabela.innerHTML = '';

        if (dados.length === 0) {
            const linha = tabela.insertRow();
            const celula = linha.insertCell(0);
            celula.colSpan = 6;
            celula.textContent = 'Nenhum resultado encontrado';
            celula.style.textAlign = 'center';
            return;
        }

        dados.forEach(emprestimo => {
            const linha = tabela.insertRow();

            const celulaId = linha.insertCell(0);
            celulaId.textContent = emprestimo.id_ferramenta;

            const celulaFerramenta = linha.insertCell(1);
            celulaFerramenta.textContent = emprestimo.nome_ferramenta;

            const celulaPessoa = linha.insertCell(2);
            celulaPessoa.textContent = emprestimo.nome_usuario;

            const celulaStatus = linha.insertCell(3);
            celulaStatus.textContent = emprestimo.status;

            const celulaData = linha.insertCell(4);
            celulaData.textContent = emprestimo.data_emprestimo;

            const celulaLocal = linha.insertCell(5);
            celulaLocal.textContent = emprestimo.local;
        });
    }
});

