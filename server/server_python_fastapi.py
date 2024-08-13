from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse, FileResponse
import sqlite3
import os
import qrcode
import io
import base64
from datetime import datetime

app = FastAPI()

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

# Configuração para servir arquivos estáticos
@app.get("/{filename:path}")
async def serve_static(filename: str):
    file_path = os.path.join(os.path.dirname(__file__), '..', 'client', 'public', filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

# Endpoint para o cadastro de ferramentas
@app.post("/cadastrar-ferramenta")
async def cadastrar_ferramenta(request: Request):
    data = await request.json()
    nome = data['nome']
    try:
        img = qrcode.make(nome)
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qrcode_str = base64.b64encode(buffered.getvalue()).decode('utf-8')

        cursor.execute("INSERT INTO ferramentas (nome, qrcode) VALUES (?, ?)", (nome, qrcode_str))
        conn.commit()
        return {"id": cursor.lastrowid, "nome": nome, "qrcode": qrcode_str}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para buscar todas as ferramentas cadastradas
@app.get("/api/ferramentas")
async def get_ferramentas():
    cursor.execute("SELECT * FROM ferramentas")
    rows = cursor.fetchall()
    return {"message": "success", "data": rows}

# Endpoint para deletar uma ferramenta específica
@app.delete("/api/ferramentas/{id}")
async def delete_ferramenta(id: int):
    cursor.execute("DELETE FROM ferramentas WHERE id = ?", (id,))
    conn.commit()
    return {"message": "Ferramenta deletada com sucesso"}

# Endpoint para cadastro de usuários
@app.post("/api/usuarios")
async def cadastrar_usuario(request: Request):
    data = await request.json()
    cursor_usuarios.execute("INSERT INTO usuarios (nome, funcao, senha) VALUES (?, ?, ?)", 
                            (data['nome'], data['funcao'], data['senha']))
    conn_usuarios.commit()
    return {"message": "Usuário cadastrado com sucesso", "id": cursor_usuarios.lastrowid}

# Endpoint para buscar todos os usuários cadastrados
@app.get("/api/usuarios")
async def get_usuarios():
    cursor_usuarios.execute("SELECT * FROM usuarios ORDER BY LOWER(nome) ASC")
    rows = cursor_usuarios.fetchall()
    return rows

# Endpoint de login
@app.post("/login")
async def login(request: Request):
    data = await request.json()
    valid_users = {
        'daniel': 'danielmlcdz',
    }
    username = data['username']
    password = data['password']
    if valid_users.get(username) == password:
        return {'success': True, 'redirectUrl': 'geral.html'}
    return {'success': False}

# Endpoint para verificar se a ferramenta está cautelada
@app.post("/api/cautelas/verificar")
async def verificar_cautela(request: Request):
    data = await request.json()
    nome_ferramenta = data.get('nome_ferramenta')
    if not nome_ferramenta:
        raise HTTPException(status_code=400, detail="Nome da ferramenta é obrigatório")

    cursor_cautelas.execute("SELECT * FROM cautelas WHERE nome_ferramenta = ? AND status = 'emprestado'", (nome_ferramenta,))
    row = cursor_cautelas.fetchone()
    return {'cautelada': bool(row)}

# Endpoint para salvar cautela
@app.post("/api/cautelas/finalizar")
async def finalizar_cautela(request: Request):
    data = await request.json()
    senha = data['senha']
    ferramentas = data['ferramentas']
    usuario_id = data['usuarioId']
    local = data['local']

    cursor_usuarios.execute("SELECT * FROM usuarios WHERE id = ? AND senha = ?", (usuario_id, senha))
    user = cursor_usuarios.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail='Senha incorreta.')

    for ferramenta in ferramentas:
        cursor_cautelas.execute("""INSERT INTO cautelas (id_ferramenta, nome_usuario, nome_ferramenta, data_emprestimo, local, status) 
                                   VALUES (?, ?, ?, ?, ?, ?)""", 
                                (ferramenta['id'], user[1], ferramenta['nome'], datetime.now().strftime("%Y-%m-%d"), local, 'emprestado'))
    conn_cautelas.commit()
    return {'success': True, 'message': 'Ferramentas emprestadas salvas com sucesso.'}

# Endpoint para listar usuários com ferramentas emprestadas
@app.get("/api/usuarios-com-ferramentas-emprestadas")
async def get_usuarios_com_ferramentas():
    cursor_cautelas.execute("SELECT nome_usuario, status FROM cautelas WHERE status = 'emprestado'")
    rows = cursor_cautelas.fetchall()
    return rows

# Endpoint para listar ferramentas emprestadas por usuário
@app.get("/api/ferramentas-emprestadas/{nomeUsuario}")
async def get_ferramentas_emprestadas(nomeUsuario: str):
    cursor_cautelas.execute("SELECT * FROM cautelas WHERE nome_usuario = ? AND status = 'emprestado'", (nomeUsuario,))
    rows = cursor_cautelas.fetchall()
    return rows

# Endpoint para devolver uma ferramenta
@app.post("/api/devolver-ferramenta/{idFerramenta}")
async def devolver_ferramenta(idFerramenta: int):
    cursor_cautelas.execute("UPDATE cautelas SET status = 'devolvido' WHERE id = ?", (idFerramenta,))
    conn_cautelas.commit()
    return {"message": "Ferramenta devolvida com sucesso"}

# Endpoint para retornar o histórico de empréstimos
@app.get("/api/historico-emprestimos")
async def get_historico_emprestimos():
    cursor_cautelas.execute("SELECT id_ferramenta, nome_ferramenta, nome_usuario, status, data_emprestimo, local FROM cautelas")
    rows = cursor_cautelas.fetchall()
    return rows

# Endpoint para excluir usuário
@app.delete("/api/usuarios/{id}")
async def delete_usuario(id: int):
    cursor_usuarios.execute("DELETE FROM usuarios WHERE id = ?", (id,))
    conn_usuarios.commit()
    if cursor_usuarios.rowcount > 0:
        return {'message': 'Usuário excluído com sucesso'}
    raise HTTPException(status_code=404, detail='Usuário não encontrado')

# Iniciar o servidor
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
