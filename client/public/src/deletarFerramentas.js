async function fetchFerramentas() {
    try {
        const response = await fetch('/api/ferramentas');
        const result = await response.json();
        const tbody = document.querySelector('.tabela-ferramentas tbody');
        tbody.innerHTML = ''; // Limpa as linhas existentes

        result.data.forEach(ferramenta => {
            const tr = document.createElement('tr');
            const tdNome = document.createElement('td');
            tdNome.textContent = ferramenta.nome;

            const tdAcao = document.createElement('td');
            const btnExcluir = document.createElement('button');
            btnExcluir.textContent = 'Excluir Ferramenta';
            btnExcluir.addEventListener('click', () => deletarFerramenta(ferramenta.id));

            tdAcao.appendChild(btnExcluir);
            tr.appendChild(tdNome);
            tr.appendChild(tdAcao);

            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao buscar as ferramentas:', error);
    }
}

function deletarFerramenta(id) {
    if (confirm('Deseja realmente apagar esta ferramenta?')) {
        fetch(`/api/ferramentas/${id}`, { method: 'DELETE' })
            .then(() => fetchFerramentas()) // Atualiza a lista após a exclusão
            .catch(error => console.error('Erro ao deletar a ferramenta:', error));
    }
}

window.onload = fetchFerramentas;
