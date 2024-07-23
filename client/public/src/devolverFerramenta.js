document.addEventListener('DOMContentLoaded', function() {
    // Refere-se ao mesmo elemento em ambos os códigos, mas com IDs diferentes. Ajuste conforme necessário.
    const selectUsuario = document.getElementById('usuarioSelect'); // Supondo que 'usuarioSelect' seja o ID correto
    const tabelaFerramentas = document.getElementById('tabelaFerramentas').querySelector('tbody');

    // Busca usuários que têm ferramentas emprestadas e preenche o <select>
    fetch('/api/usuarios-com-ferramentas-emprestadas')
    .then(response => response.json())
    .then(data => {
       // selectUsuario.innerHTML = ''; // Limpa o select

        const nomesUnicos = new Set(); // Usa um Set para evitar nomes duplicados

        data.forEach(usuario => {
            nomesUnicos.add(usuario.nome_usuario); // Adiciona nomes ao Set
        });

        nomesUnicos.forEach(nome => {
            const option = document.createElement('option');
            option.value = nome; // Define o nome do usuário como valor
            option.textContent = nome; // e como texto da opção
            selectUsuario.appendChild(option); // Adiciona a opção ao <select>
        });
    })
    .catch(error => console.error('Erro ao carregar os usuários:', error));

    // Função para exibir ferramentas emprestadas pelo usuário selecionado
    function exibirFerramentasDoUsuario(nomeUsuario) {
        fetch(`/api/ferramentas-emprestadas/${nomeUsuario}`)
        .then(response => response.json())
        .then(ferramentas => {
            tabelaFerramentas.innerHTML = ''; // Limpa a tabela antes de adicionar novas linhas
            ferramentas.forEach(ferramenta => {
                const linha = tabelaFerramentas.insertRow();
                linha.insertCell(0).textContent = ferramenta.nome_ferramenta; // Nome da ferramenta

                // Adiciona o botão "Devolver" para cada ferramenta
                const celulaBotao = linha.insertCell(1);
                const btnDevolver = document.createElement('button');
                btnDevolver.textContent = 'Devolver';
                btnDevolver.addEventListener('click', () => devolverFerramenta(ferramenta.id, linha));
                celulaBotao.appendChild(btnDevolver);
            });
        })
        .catch(error => console.error('Erro ao carregar ferramentas:', error));
    }

    // Evento ao mudar a seleção do usuário para carregar as ferramentas emprestadas
    selectUsuario.addEventListener('change', () => {
        const nomeUsuarioSelecionado = selectUsuario.options[selectUsuario.selectedIndex].text;
        exibirFerramentasDoUsuario(nomeUsuarioSelecionado);
    });

    // Função para devolver uma ferramenta e remover sua linha da tabela
    function devolverFerramenta(idFerramenta, linha) {
        fetch(`/api/devolver-ferramenta/${idFerramenta}`, {
            method: 'POST',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao devolver ferramenta');
            }
            return response.json();
        })
        .then(data => {
            alert(data.message); // Exibe mensagem de sucesso
            linha.remove(); // Remove a linha correspondente à ferramenta devolvida
        })
        .catch(error => {
            console.error('Erro ao devolver a ferramenta:', error);
            alert('Erro ao devolver a ferramenta.');
        });
    }
});
