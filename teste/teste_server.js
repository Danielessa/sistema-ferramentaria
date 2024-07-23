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
