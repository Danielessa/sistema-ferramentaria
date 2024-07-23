const sqlite3 = require('sqlite3').verbose();

// Abre o banco de dados SQLite
let db = new sqlite3.Database('ferramentaria.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Conectado ao banco de dados.');
});

// Seleciona todos os dados de uma tabela específica
const tableName = 'ferramentas'; // Substitua pelo nome da sua tabela
db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
    if (err) {
        throw err;
    }
    // Imprime cada linha no console
    rows.forEach((row) => {
        console.log(row);
    });
});

// Fecha a conexão com o banco de dados
db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Conexão com o banco de dados fechada.');
});
