const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;


// Middleware para parsear o corpo das requisições em JSON
app.use(bodyParser.json());

// Configuração para servir arquivos estáticos da pasta 'public' dentro de 'client'
app.use(express.static(path.join(__dirname, '..', 'client', 'public')));
//app.use(express.json());
// Conectar ao banco de dados SQLite
let db = new sqlite3.Database(path.join(__dirname, '..', 'server', 'ferramentaria.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the ferramentaria database.');
    }
});

let dbUsuarios = new sqlite3.Database(path.join(__dirname, 'usuarios.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the usuarios database.');
        // Mova o script de criação da tabela para dentro deste bloco
        dbUsuarios.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            funcao TEXT NOT NULL,
            senha TEXT NOT NULL
        )`, (err) => {
            if (err) {
                // Trate o erro de criação da tabela, se houver
                console.error('Error creating the usuarios table:', err.message);
            } else {
                console.log('Usuarios table created or already exists.');
            }
        });
    }
});


let dbCautelas = new sqlite3.Database(path.join(__dirname, 'cautelas.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) console.error(err.message);
    else {
        console.log('Connected to the cautelas database.');
        dbCautelas.run(`CREATE TABLE IF NOT EXISTS cautelas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_ferramenta INTEGER,
            nome_usuario TEXT NOT NULL,
            nome_ferramenta TEXT NOT NULL,
            data_emprestimo DATE NOT NULL,
            local TEXT NOT NULL,
            status TEXT CHECK(status IN ('emprestado', 'devolvido')) NOT NULL DEFAULT 'emprestado'
        )`, (err) => {
            if (err) {
                console.error('Error creating the cautelas table:', err.message);
            } else {
                console.log('Cautelas table created or already exists.');
            }
        });
    }
});



// Cria a tabela de ferramentas se ela não existir
db.run(`CREATE TABLE IF NOT EXISTS ferramentas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    qrcode TEXT NOT NULL
)`);

// Endpoint para o cadastro de ferramentas
app.post('/cadastrar-ferramenta', async (req, res) => {
    const { nome } = req.body;
    try {
        const qrcode = await QRCode.toDataURL(nome);
        db.run(`INSERT INTO ferramentas (nome, qrcode) VALUES (?, ?)`, [nome, qrcode], function(err) {
            if (err) {
                res.status(500).send(err.message);
                return;
            }
            res.json({ id: this.lastID, nome, qrcode });
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

//endpoint para buscar todas as ferramentas cadastradas
app.get('/api/ferramentas', (req, res) => {
    const sql = "SELECT * FROM ferramentas";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// Endpoint para deletar uma ferramenta específica
app.delete('/api/ferramentas/:id', (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM ferramentas WHERE id = ?`;
    db.run(sql, id, function(err) {
        if (err) {
            res.status(500).json({"error": err.message});
            return;
        }
        res.json({ "message": "Ferramenta deletada com sucesso" });
    });
});



app.post('/api/usuarios', (req, res) => {
    const { nome, funcao, senha } = req.body;
    const sql = `INSERT INTO usuarios (nome, funcao, senha) VALUES (?, ?, ?)`;

    dbUsuarios.run(sql, [nome, funcao, senha], function(err) {
        if (err) {
            res.status(500).json({"error": err.message});
            return;
        }
        res.json({ "message": "Usuário cadastrado com sucesso", "id": this.lastID });
    });
});
// Endpoint para buscar todos os usuários cadastrados e retorná-los como uma lista JSON
app.get('/api/usuarios', (req, res) => {
    // Modifica a consulta SQL para usar LOWER() para ordenação case-insensitive
    const sql = "SELECT * FROM usuarios ORDER BY LOWER(nome) ASC"; 
  

    dbUsuarios.all(sql, [], (err, rows) => {
        if (err) {
            // Se ocorrer um erro na consulta ao banco de dados, envia uma resposta de erro
            console.error(err.message);
            res.status(500).json({ "error": err.message });
        } else {
            // Se a consulta for bem-sucedida, envia os usuários como resposta em formato JSON
            res.json(rows);
        }
    });
});


//Validação de usuario e senha
const validUsers = {
    'daniel': 'danielmlcdz',
   
};

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (validUsers[username] && validUsers[username] === password) {
        res.json({ success: true, redirectUrl: 'geral.html' });
    } else {
        res.json({ success: false });
    }
});


// Endpoint para buscar uma ferramenta específica pelo ID
app.get('/api/ferramentas/:id', (req, res) => {
    const { id } = req.params;
    const sql = "SELECT * FROM ferramentas WHERE id = ?";
    db.get(sql, [id], (err, row) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        if (row) {
            res.json(row);
        } else {
            res.status(404).json({ "message": "Ferramenta não encontrada" });
        }
    });
});


// Endpoint para verificar se a ferramenta está cautelada
app.post('/api/cautelas/verificar', (req, res) => {
    const nomeFerramenta = req.body.nome_ferramenta;
    if (!nomeFerramenta) {
        return res.status(400).json({ error: "Nome da ferramenta é obrigatório" });
    }

    const sql = `SELECT * FROM cautelas WHERE nome_ferramenta = ? AND status = 'emprestado'`;
    dbCautelas.get(sql, [nomeFerramenta], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: "Erro ao acessar o banco de dados" });
        } else {
            if (row) {
                res.json({ cautelada: true });
            } else {
                res.json({ cautelada: false });
            }
        }
    });
});

// SALVAR CAUTELA
app.post('/api/cautelas/finalizar', (req, res) => {
    const { senha, ferramentas, usuarioId, local } = req.body;

    // Verifica a senha do usuário
    dbUsuarios.get("SELECT * FROM usuarios WHERE id = ? AND senha = ?", [usuarioId, senha], (err, user) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!user) {
            res.status(401).json({ success: false, message: 'Senha incorreta.' });
            return;
        }

        // Insere cada ferramenta no banco de dados cautelas.db
        ferramentas.forEach(ferramenta => {
            dbCautelas.run("INSERT INTO cautelas (id_ferramenta, nome_usuario, nome_ferramenta, data_emprestimo, local, status) VALUES (?, ?, ?, ?, ?, ?)", 
                [ferramenta.id, user.nome, ferramenta.nome, new Date().toISOString().slice(0, 10), local, 'emprestado'], 
                err => {
                    if (err) {
                        console.error(err.message);
                    }
                });
        });

        res.json({ success: true, message: 'Ferramentas emprestadas salvas com sucesso.' });
    });
});


    //endpoint que envia para o select usuarios que estão com ferramentas
    app.get('/api/usuarios-com-ferramentas-emprestadas', (req, res) => {
        const sql = `
            SELECT nome_usuario, status 
            FROM cautelas
            WHERE status = 'emprestado'
        `;
       
    
        dbCautelas.all(sql, [], (err, rows) => {
            
            if (err) {
                console.error(err.message);
                res.status(500).json({ error: err.message });
            } else {
                // Isso vai retornar um array de objetos com o nome do usuário e o status de cada ferramenta
                res.json(rows);
                
            }
        });
    });

    // endpoint lista de ferramentas emprestadas
    app.get('/api/ferramentas-emprestadas/:nomeUsuario', (req, res) => {
        const { nomeUsuario } = req.params;
        const sql = `
            SELECT * FROM cautelas
            WHERE nome_usuario = ? AND status = 'emprestado'
        `;
    
        dbCautelas.all(sql, [nomeUsuario], (err, rows) => {
            if (err) {
                console.error(err.message);
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
                
            }
        });
    });

    //endpointo de mudança de status para devolvida
    app.post('/api/devolver-ferramenta/:idFerramenta', (req, res) => {
        const { idFerramenta } = req.params;
    
        const sql = `UPDATE cautelas SET status = 'devolvido' WHERE id = ?`;
    
        dbCautelas.run(sql, [idFerramenta], function(err) {
            if (err) {
                console.error(err.message);
                res.status(500).json({ error: 'Erro ao atualizar o status da ferramenta' });
            } else {
                res.json({ message: 'Ferramenta devolvida com sucesso' });
            }
        });
    });
 
    //endpoint que retorna o relatorio das ferramentas
    app.get('/api/historico-emprestimos', (req, res) => {
        const sql = `SELECT id_ferramenta, nome_ferramenta, nome_usuario, status, data_emprestimo, local
                     FROM cautelas`;
        dbCautelas.all(sql, [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    });
    
    
    //endpoint para excluir usuario
    app.delete('/api/usuarios/:id', (req, res) => {
        const { id } = req.params;
        // Código para excluir o usuário do banco de dados
    const sql = `DELETE FROM usuarios WHERE id = ?`;

    // Executa a consulta para deletar o usuário
    dbUsuarios.run(sql, [id], function(err) {
        if (err) {
            console.error(err.message);
            res.status(500).send('Erro ao excluir o usuário');
        } else {
            if (this.changes > 0) {
                // Se algum registro foi deletado, retorna sucesso
                res.status(200).send('Usuário excluído com sucesso');
            } else {
                // Se nenhum registro foi deletado (ID não encontrado), retorna erro
                res.status(404).send('Usuário não encontrado');
            }
        }
    });
    });
    
// Iniciar o servidor
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
