# Correção de Erros - 17/02/2026

## Problemas Identificados e Resolvidos

### 1. **CORS Policy Error (Bloqueio de localhost)**
**Problema:** Frontend em produção (Netlify) tentando acessar API local (localhost:3000)
```
Access to fetch at 'http://localhost:3000/api/products' from origin 
'https://spiffy-toffee-4276f3.netlify.app' has been blocked by CORS policy
```

**Causa:** O frontend estava com URL hardcoded para `http://localhost:3000`

**Solução Aplicada:**
- ✅ Adicionada função `getApiUrl()` em `frontend/index.html` (linha 218-228)
- ✅ Adicionada função `getApiUrl()` em `frontend/admin.html` (linha 462-471)
- Detecta automaticamente se está em desenvolvimento (localhost) ou produção
- Em produção, você deve configurar `SEU_DOMINIO_API.com` na função

### 2. **Failed to Fetch Error**
**Problema:** Impossível conectar a localhost:3000 de um domínio remoto
```
GET http://localhost:3000/api/products net::ERR_FAILED
```

**Solução:** Mesmo que o item 1 - função `getApiUrl()` resolve isso

### 3. **URLs de API Incorretas no Admin**
**Problema:** Admin.html tinha URLs incompatíveis após mudança de API_URL base
- Estava: `API_URL + '/admin/all'` onde API_URL = `.../api/products`
- Resultado incorreto: `.../api/products/admin/all` ✓ Correto (mantém funcional)
- Mas `API_URL + '/{id}'` = `.../api/products/{id}` ✓ Correto

**Soluções:**
- ✅ Atualizada `checkApiAvailability()` - linha 477
- ✅ Atualizada `getProducts()` - linha 487
- ✅ Atualizada `toggleProductActive()` - linha 861
- ✅ Atualizada `deleteProduct()` - linha 896
- ✅ Atualizada `saveProduct()` - linha 809: Corrigida URL para POST

### 4. **MonkeyConfig is not defined**
**Problema:** Script de userscript externo (Tampermonkey - "Bypass All Shortlinks")
```
ReferenceError: MonkeyConfig is not defined
```

**Nota:** Este é um erro de script de terceiros instalado no seu navegador, não do projeto
- Remova a extensão "Bypass All Shortlinks" se não precisar
- Ou desabilite-a em `about:config` do Tampermonkey

---

## Como Usar em Produção

1. **Desenvolvimento Local:**
   - Acesse em `http://localhost:3000` (frontend local ou via Node)
   - A função `getApiUrl()` detectará e usará `http://localhost:3000/api`

2. **Produção (Netlify/Outro Host):**
   - Edite a função `getApiUrl()` em ambos os arquivos:
   ```javascript
   // Substitua 'SEU_DOMINIO_API.com' pela URL real da sua API
   return window.location.origin.replace(/.../g, 'SEU_DOMINIO_API.com') + '/api';
   ```
   - Ou use variáveis de ambiente se Netlify suportar

---

## Arquivos Modificados

- ✅ `frontend/index.html`
- ✅ `frontend/admin.html`
- ⓘ `admin.html` (raiz) - Usa localStorage, sem alterações necessárias

---

## Teste Recomendado

1. Inicie o backend: `npm start` em `/backend`
2. Acesse `http://localhost:3000` (ou configure um frontend local)
3. Verifique console do navegador (F12) para erros de CORS
4. Teste funcionalidades: listar produtos, criar, atualizar, deletar

---

## CORS Configuração Atual (Backend)

O backend já está com CORS habilitado (`cors()` middleware em `index.js`), portanto:
- ✅ Acesso local: Funciona normalmente
- ⚠️ Acesso remoto: Depende da variável `getApiUrl()` estar correta

