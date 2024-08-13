from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import os
import qrcode
import io
import base64
from datetime import datetime

app = Flask(__name__)
port = 3000

# Configuração para servir arquivos estáticos
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'client', 'public'), filename)

# Conectar ao banco de dados SQLite
db_path = os.path.join(os.path.dirname(__file__), '..', 'server', 'ferramentaria.db')
conn = sqlite3.connect(db_path, check_same_thread=False)
cursor = conn.cursor()

# Banco de dados de usuários
db_usuarios_path = os.path.join(os.path.dirname(__file__), 'usuarios.db')
conn_usuarios = sqlite3.connect(db_usuarios_path, check_same_thread=False)
cursor_usuarios = conn_usuarios.cursor()

# Banco de dados de cautelas
db_cautelas_path = os.path.join(os.path.dirname(__file__), 'cautelas.db')
conn_cautelas = sqlite3.connect(db_cautelas_path, check_same_thread=False)
cursor_cautelas = conn_cautelas.cursor()

# Criar tabelas se não existirem
cursor.execute('''CREATE TABLE IF NOT EXISTS ferramentas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    qrcode TEXT NOT NULL)''')

cursor_usuarios.execute('''CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    funcao TEXT NOT NULL,
    senha TEXT NOT NULL)''')

cursor_cautelas.execute('''CREATE TABLE IF NOT EXISTS cautelas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_ferramenta INTEGER,
    nome_usuario TEXT NOT NULL,
    nome_ferramenta TEXT NOT NULL,
    data_emprestimo DATE NOT NULL,
    local TEXT NOT NULL,
    status TEXT CHECK(status IN ('emprestado', 'devolvido')) NOT NULL DEFAULT 'emprestado')''')

# Endpoint para o cadastro de ferramentas
@app.route('/cadastrar-ferramenta', methods=['POST'])
def cadastrar_ferramenta():
    data = request.json
    nome = data['nome']
    try:
        img = qrcode.make(nome)
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qrcode_str = base64.b64encode(buffered.getvalue()).decode('utf-8')

        cursor.execute("INSERT INTO ferramentas (nome, qrcode) VALUES (?, ?)", (nome, qrcode_str))
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'nome': nome, 'qrcode': qrcode_str})
    except Exception as e:
        return str(e), 500

# Endpoint para buscar todas as ferramentas cadastradas
@app.route('/api/ferramentas', methods=['GET'])
def get_ferramentas():
    cursor.execute("SELECT * FROM ferramentas")
    rows = cursor.fetchall()
    return jsonify({"message": "success", "data": rows})

# Endpoint para deletar uma ferramenta específica
@app.route('/api/ferramentas/<int:id>', methods=['DELETE'])
def delete_ferramenta(id):
    cursor.execute("DELETE FROM ferramentas WHERE id = ?", (id,))
    conn.commit()
    return jsonify({"message": "Ferramenta deletada com sucesso"})

# Endpoint para cadastro de usuários
@app.route('/api/usuarios', methods=['POST'])
def cadastrar_usuario():
    data = request.json
    cursor_usuarios.execute("INSERT INTO usuarios (nome, funcao, senha) VALUES (?, ?, ?)", 
                            (data['nome'], data['funcao'], data['senha']))
    conn_usuarios.commit()
    return jsonify({"message": "Usuário cadastrado com sucesso", "id": cursor_usuarios.lastrowid})

# Endpoint para buscar todos os usuários cadastrados
@app.route('/api/usuarios', methods=['GET'])
def get_usuarios():
    cursor_usuarios.execute("SELECT * FROM usuarios ORDER BY LOWER(nome) ASC")
    rows = cursor_usuarios.fetchall()
    return jsonify(rows)

# Endpoint de login
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    valid_users = {
        'daniel': 'danielmlcdz',
    }
    username = data['username']
    password = data['password']
    if valid_users.get(username) == password:
        return jsonify({'success': True, 'redirectUrl': 'geral.html'})
    return jsonify({'success': False})

# Endpoint para verificar se a ferramenta está cautelada
@app.route('/api/cautelas/verificar', methods=['POST'])
def verificar_cautela():
    nome_ferramenta = request.json.get('nome_ferramenta')
    if not nome_ferramenta:
        return jsonify({'error': "Nome da ferramenta é obrigatório"}), 400

    cursor_cautelas.execute("SELECT * FROM cautelas WHERE nome_ferramenta = ? AND status = 'emprestado'", (nome_ferramenta,))
    row = cursor_cautelas.fetchone()
    return jsonify({'cautelada': bool(row)})

# Endpoint para salvar cautela
@app.route('/api/cautelas/finalizar', methods=['POST'])
def finalizar_cautela():
    data = request.json
    senha = data['senha']
    ferramentas = data['ferramentas']
    usuario_id = data['usuarioId']
    local = data['local']

    cursor_usuarios.execute("SELECT * FROM usuarios WHERE id = ? AND senha = ?", (usuario_id, senha))
    user = cursor_usuarios.fetchone()
    if not user:
        return jsonify({'success': False, 'message': 'Senha incorreta.'}), 401

    for ferramenta in ferramentas:
        cursor_cautelas.execute("""INSERT INTO cautelas (id_ferramenta, nome_usuario, nome_ferramenta, data_emprestimo, local, status) 
                                   VALUES (?, ?, ?, ?, ?, ?)""", 
                                (ferramenta['id'], user[1], ferramenta['nome'], datetime.now().strftime("%Y-%m-%d"), local, 'emprestado'))
    conn_cautelas.commit()
    return jsonify({'success': True, 'message': 'Ferramentas emprestadas salvas com sucesso.'})

# Endpoint para listar usuários com ferramentas emprestadas
@app.route('/api/usuarios-com-ferramentas-emprestadas', methods=['GET'])
def get_usuarios_com_ferramentas():
    cursor_cautelas.execute("SELECT nome_usuario, status FROM cautelas WHERE status = 'emprestado'")
    rows = cursor_cautelas.fetchall()
    return jsonify(rows)

# Endpoint para listar ferramentas emprestadas por usuário
@app.route('/api/ferramentas-emprestadas/<string:nomeUsuario>', methods=['GET'])
def get_ferramentas_emprestadas(nomeUsuario):
    cursor_cautelas.execute("SELECT * FROM cautelas WHERE nome_usuario = ? AND status = 'emprestado'", (nomeUsuario,))
    rows = cursor_cautelas.fetchall()
    return jsonify(rows)

# Endpoint para devolver uma ferramenta
@app.route('/api/devolver-ferramenta/<int:idFerramenta>', methods=['POST'])
def devolver_ferramenta(idFerramenta):
    cursor_cautelas.execute("UPDATE cautelas SET status = 'devolvido' WHERE id = ?", (idFerramenta,))
    conn_cautelas.commit()
    return jsonify({"message": "Ferramenta devolvida com sucesso"})

# Endpoint para retornar o histórico de empréstimos
@app.route('/api/historico-emprestimos', methods=['GET'])
def get_historico_emprestimos():
    cursor_cautelas.execute("SELECT id_ferramenta, nome_ferramenta, nome_usuario, status, data_emprestimo, local FROM cautelas")
    rows = cursor_cautelas.fetchall()
    return jsonify(rows)

# Endpoint para excluir usuário
@app.route('/api/usuarios/<int:id>', methods=['DELETE'])
def delete_usuario(id):
    cursor_usuarios.execute("DELETE FROM usuarios WHERE id = ?", (id,))
    conn_usuarios.commit()
    if cursor_usuarios.rowcount > 0:
        return jsonify({'message': 'Usuário excluído com sucesso'})
    return jsonify({'error': 'Usuário não encontrado'}), 404

# Iniciar o servidor
if __name__ == '__main__':
    app.run(port=port)
