document.getElementById('cadastroUsuarioForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = {
        nome: document.getElementById('nome').value,
        funcao: document.getElementById('funcao').value,
        senha: document.getElementById('senha').value
    };

    fetch('/api/usuarios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
    })
    .then(response => response.json())
    .then(data => {
        // Remove a mensagem anterior, se existir
        const oldMessage = document.getElementById('successMessage');
        if (oldMessage) {
            oldMessage.remove();
        }

        // Cria a nova mensagem de sucesso
        const messageContainer = document.createElement('div');
        messageContainer.id = 'successMessage';
        messageContainer.textContent = data.message; // Mensagem do servidor
        messageContainer.style.color = 'green'; // Define a cor do texto para verde

        const form = document.getElementById('cadastroUsuarioForm');
        form.parentNode.insertBefore(messageContainer, form.nextSibling); // Insere a mensagem após o formulário
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro ao cadastrar usuário');
    });
});
