document.addEventListener('DOMContentLoaded', function() {
    const select = document.getElementById('usuarioSelect');
    const btnExcluir = document.getElementById('btnExcluir');

    // Função para carregar usuários
    function carregarUsuarios() {
        fetch('/api/usuarios')
        .then(response => response.json())
        .then(usuarios => {
            usuarios.forEach(usuario => {
                let option = new Option(usuario.nome, usuario.id);
                select.add(option);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar usuários:', error);
        });
    }

    // Carrega os usuários quando a página é carregada
    carregarUsuarios();

    select.addEventListener('change', function() {
        // Habilita o botão de exclusão quando um usuário é selecionado
        btnExcluir.disabled = !this.value;
    });

    btnExcluir.addEventListener('click', function() {
        const usuarioId = select.value;
        if (usuarioId && confirm('Tem certeza que deseja excluir este usuário?')) {
            fetch(`/api/usuarios/${usuarioId}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    alert('Usuário excluído com sucesso.');
                    // Remove o usuário excluído da lista sem recarregar todos os usuários
                    let optionToRemove = [...select.options].find(option => option.value === usuarioId);
                    optionToRemove && optionToRemove.remove();
                    btnExcluir.disabled = true; // Desabilita o botão após a exclusão bem-sucedida
                } else {
                    alert('Falha ao excluir usuário.');
                }
            })
            .catch(error => {
                console.error('Erro ao excluir usuário:', error);
            });
        }
    });
});
