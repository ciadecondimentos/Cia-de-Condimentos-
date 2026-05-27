# 🌶️ GUIA DO ADMINISTRADOR - PAINEL CIA DE CONDIMENTOS

## Como Acessar o Painel no Celular

### 1️⃣ **Primeiro: Certifique-se que o Backend está rodando**

Se você está **em casa com computador**:
- Abra o terminal/CMD na pasta do projeto
- Execute: `npm start` (na pasta backend/)
- Deixe aberto enquanto usa o painel

Se você quer **acessar remotamente** (de qualquer lugar):
- Peça ao desenvolvedor para hospedar o servidor em um servidor online (Heroku, AWS, etc)

---

### 2️⃣ **Acessar o Painel no Celular**

**URL no navegador:**
```
http://localhost:3000/admin.html
```

(Se estiver em outra máquina da rede, use o IP: `http://192.168.x.x:3000/admin.html`)

---

### 3️⃣ **Fazer Login**

Você será redirecionado para a tela de login. Preencha com:

**E-mail:** `ciadecondimentos@outlook.com`
**Senha:** `Robsondeni2007!`

✓ Clique em "Lembrar-me" para não precisar digitar toda vez

---

### 4️⃣ **Pronto!** 🎉

Agora você tem acesso total ao painel administrativo:
- 📊 Dashboard
- 📦 Produtos
- 📋 Pedidos
- 👥 Clientes (CRM)
- 🏭 Fornecedores
- 🎁 Promoções
- 📤 Enviar via WhatsApp

---

## ❓ Problemas Comuns

### "Não consigo conectar"
- ❌ Certifique-se que o backend está rodando (npm start)
- ❌ Verifique se não há outra aplicação usando a porta 3000

### "Credenciais incorretas"
- ✓ E-mail: **ciadecondimentos@outlook.com**
- ✓ Senha: **Robsondeni2007!**
- ✓ Verifique se a CAPS LOCK está desativada

### "Fui desconectado"
- O token expira a cada 24h
- É normal, faça login novamente

---

## 🔒 Segurança

- ✅ Sua senha é criptografada
- ✅ Token expira automaticamente a cada 24h
- ✅ Use senhas fortes em produção
- ✅ Nunca compartilhe suas credenciais

---

**Dúvidas?** Entre em contato com o desenvolvedor.
