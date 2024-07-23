document.getElementById('cadastroFerramentaForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    var nomeFerramenta = document.getElementById('nomeFerramenta').value;
    
    try {
        const response = await fetch('/cadastrar-ferramenta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nome: nomeFerramenta }),
        });
        const data = await response.json();

        // Exibindo o QRCode e o ID da ferramenta na tela
        if(data.qrcode) {
            document.getElementById('qrcodeDisplay').src = data.qrcode;
            document.getElementById('ferramentaIdDisplay').textContent = 'ID da Ferramenta: ' + data.id;
            document.getElementById('printButton').style.display = 'block'; // Mostra o botão de impressão
        }
    } catch (error) {
        console.error('Erro ao cadastrar ferramenta:', error);
    }
});

function printQRCode() {
    var originalContents = document.body.innerHTML;
    var printArea = document.createElement("div");
    printArea.innerHTML = document.getElementById('cadastroFerramentaForm').innerHTML;
    document.body.innerHTML = printArea.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
}
