document.addEventListener('DOMContentLoaded', function() {
    const selectUsuario = document.getElementById('usuario');
    const btnEmprestar = document.getElementById('btnEmprestar');
    const tabelaFerramentas = document.getElementById('tabelaFerramentas'); 
    const btnAdicionarPeloId = document.getElementById('btnAdicionarPeloId');
    const inputIdFerramenta = document.getElementById('idFerramenta');
    const inputLocal = document.getElementById('local'); 

    // Inicialmente ocultar o campo Local
    inputLocal.style.display = 'none';

    // Busca os usuários cadastrados do servidor
    fetch('/api/usuarios')
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao buscar os usuários');
            }
            return response.json();
        })
        .then(usuarios => {
            usuarios.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.id;
                option.textContent = usuario.nome;
                selectUsuario.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar os usuários:', error);
        });

    selectUsuario.addEventListener('change', () => {
        const isUserSelected = selectUsuario.value;
        btnEmprestar.disabled = !isUserSelected;
        btnAdicionarPeloId.disabled = !isUserSelected;
    });

    btnAdicionarPeloId.addEventListener('click', function() {
        if (!selectUsuario.value) {
            alert('Por favor, selecione um usuário antes de adicionar uma ferramenta.');
            return;
        }
        const idFerramenta = inputIdFerramenta.value;
        if (idFerramenta) {
            fetch(`/api/ferramentas/${idFerramenta}`)
                .then(response => response.ok ? response.json() : Promise.reject('Ferramenta não encontrada'))
                .then(ferramenta => {
                    verificarCautela(ferramenta.id, ferramenta.nome);
                })
                .catch(error => {
                    console.error('Erro ao adicionar ferramenta:', error);
                    alert('Erro ao buscar a ferramenta com o ID fornecido.');
                });
        }
    });

    function verificarCautela(idFerramenta, nomeFerramenta) {
        fetch('/api/cautelas/verificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome_ferramenta: nomeFerramenta })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.cautelada) {
                adicionarFerramentaTabela(idFerramenta, nomeFerramenta);
            } else {
                alert('Ferramenta já está em cautela.');
            }
        })
        .catch(error => console.error('Erro ao verificar cautela:', error));
    }

    function adicionarFerramentaTabela(idFerramenta, nomeFerramenta) {
        const linhas = tabelaFerramentas.getElementsByTagName('tr');
        for (let i = 0; i < linhas.length; i++) {
            if (linhas[i].cells[0].textContent === nomeFerramenta) {
                alert('Esta ferramenta já foi adicionada à lista.');
                return;
            }
        }

        const linha = tabelaFerramentas.insertRow();
        const celulaFerramenta = linha.insertCell(0);
        celulaFerramenta.textContent = nomeFerramenta;
        celulaFerramenta.dataset.idFerramenta = idFerramenta; // Armazena o ID da ferramenta como um atributo de dados

        const celulaBotao = linha.insertCell(1);
        const btnCancelar = document.createElement('button');
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.className = 'btn-cancelar';
        btnCancelar.onclick = function() {
            linha.remove();
        };
        celulaBotao.appendChild(btnCancelar);
    }

    const qrcodeReader = new Html5Qrcode("reader");
    btnEmprestar.addEventListener('click', () => {
        qrcodeReader.start({ facingMode: "environment" }, {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        }, (qrCodeMessage) => {
            verificarCautela(qrCodeMessage);
            qrcodeReader.stop();
        }).catch(err => {
            console.error('Erro ao abrir a câmera:', err);
        });
    });

    const inputSenha = document.createElement('input');
    inputSenha.type = 'password';
    inputSenha.placeholder = 'Digite sua senha';
    inputSenha.style.display = 'none';
    document.querySelector('.container').appendChild(inputSenha);

    const btnFinalizar = document.createElement('button');
    btnFinalizar.textContent = 'Finalizar';
    btnFinalizar.style.display = 'block';
    btnFinalizar.style.marginTop = '10px';
    document.querySelector('.container').appendChild(btnFinalizar);

    btnFinalizar.addEventListener('click', () => {
        inputSenha.style.display = 'block';
        inputLocal.style.display = 'block';
        inputSenha.focus();
    });

    inputSenha.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const local = inputLocal.value.trim();
            if (!local) {
                alert('Por favor, preencha o campo "Local" antes de finalizar.');
                inputLocal.focus();
                return;
            }
            const senha = inputSenha.value;
            const ferramentas = Array.from(tabelaFerramentas.getElementsByTagName('tr'))
                                    .slice(1)
                                    .map(row => ({
                                        id: row.cells[0].dataset.idFerramenta,
                                        nome: row.cells[0].textContent
                                    }));

            fetch('/api/cautelas/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senha, ferramentas, usuarioId: selectUsuario.value, local })
            })
            .then(response => {
                if (!response.ok) throw new Error('Falha na resposta do servidor');
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    alert('Ferramentas salvas com sucesso!');
                    while (tabelaFerramentas.rows.length > 1) {
                        tabelaFerramentas.deleteRow(1);
                    }
                    inputSenha.value = '';
                    inputSenha.style.display = 'none';
                    inputLocal.value = '';
                    inputLocal.style.display = 'none';
                } else {
                    alert(data.message || 'Erro ao salvar ferramentas.');
                }
            })
            .catch(error => {
                console.error('Erro ao finalizar:', error);
                alert('senha incorreta.');
            });
        }
    });

});