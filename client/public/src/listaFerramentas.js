// Função para buscar ferramentas do servidor e exibir na tabela
async function fetchFerramentas() {
    try {
        const response = await fetch('/api/ferramentas');
        const result = await response.json(); // Deserializa a resposta para um objeto JSON

        if (result && Array.isArray(result.data)) {
            result.data.forEach(ferramenta => {
                let tableBody = document.querySelector("#ferramentasTable tbody");
                let row = tableBody.insertRow();

                let idCell = row.insertCell(0);
                idCell.textContent = ferramenta.id; // Adicionando ID da ferramenta

                let nomeCell = row.insertCell(1);
                nomeCell.textContent = ferramenta.nome; // Modificado para estar na segunda coluna

                let qrCodeCell = row.insertCell(2);
                let img = document.createElement('img');
                img.src = ferramenta.qrcode;
                img.alt = "QR Code";
                qrCodeCell.appendChild(img);
            });
        } else {
            console.error('A resposta não contém o campo "data" esperado ou não é um array.');
        }
    } catch (error) {
        console.error('Erro ao buscar as ferramentas:', error);
    }
}

// Função para imprimir a lista de ferramentas
function printList() {
    window.print();
}

// Chama a função fetchFerramentas() quando a página carrega
window.onload = fetchFerramentas;
