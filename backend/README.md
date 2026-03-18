# Cia de Condimentos — Backend

Este backend fornece endpoints de autenticação para o site (register, login, me). Planejado para deploy no Render com Postgres.

## Instalação local:

```bash
cd backend
# Se o PowerShell bloquear scripts, execute:
#   npm.cmd install
npm install

# criar migrations no banco
psql "$DATABASE_URL" -f migrations/create_users.sql
npm start
```

## Variáveis de ambiente (use o painel do Render):
- `DATABASE_URL` — URL de conexão do Postgres
- `JWT_SECRET` — segredo JWT
- `PORT` — porta (opcional)
- `CLOUDINARY_CLOUD_NAME` — nome da nuvem Cloudinary
- `CLOUDINARY_API_KEY` — chave API do Cloudinary
- `CLOUDINARY_API_SECRET` — segredo API do Cloudinary

## Configuração do Cloudinary:
1. Crie uma conta gratuita em [cloudinary.com](https://cloudinary.com)
2. Vá para Dashboard > Account Details para obter as credenciais
3. Adicione as variáveis de ambiente no Render

No Render: defina `DATABASE_URL` apontando para a base Postgres criada e `JWT_SECRET`. Execute a migration com `psql $DATABASE_URL -f backend/migrations/create_users.sql`.
