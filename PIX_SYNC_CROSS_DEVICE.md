# ✅ Sincronização Cross-Device do FAB PIX

## 🎯 Resumo

O FAB (Floating Action Button) de PIX agora é sincronizado automaticamente:
- **Entre múltiplos dispositivos** (celular, tablet, notebook)
- **Entre múltiplas abas** do mesmo dispositivo
- **Mesmo após recarregar a página**
- **Com fallback para localStorage** se o backend estiver indisponível

---

## 🏗️ Arquitetura

### Backend (Node.js/Express)

**Novo Endpoint:**
```
GET /payments/pix/active
```

**Resposta (PIX ativo):**
```json
{
  "active": true,
  "pix": {
    "mp_payment_id": "123456789",
    "status": "pending",
    "amount": 150.50,
    "qr_code": "00020126360014br.gov.bcb...",
    "qr_code_base64": "iVBORw0KGgoAAAANS...",
    "crm_purchase_id": "purchase-123",
    "expires_at": "2026-05-28T15:30:00Z",
    "expires_in_seconds": 3600
  }
}
```

**Resposta (nenhum PIX ativo):**
```json
{
  "active": false,
  "pix": null
}
```

### Frontend (JavaScript)

**3 Camadas de Sincronização:**

1. **Backend Sync (30s)** - Sincronização entre dispositivos
   ```javascript
   syncCrmPixFromBackend() // Polling a cada 30 segundos
   startCrmPixBackendSync() // Iniciar sincronização
   stopCrmPixBackendSync()  // Parar sincronização
   ```

2. **Storage Events (Real-time)** - Sincronização entre abas
   ```javascript
   setupCrmPixStorageListener() // Listener para storage events
   // Detecta mudanças de localStorage entre abas automaticamente
   ```

3. **LocalStorage (Fallback)** - Persistência local
   ```javascript
   saveCrmPixToStorage()     // Salvar PIX em localStorage
   loadCrmPixFromStorage()   // Carregar PIX do localStorage
   clearCrmPixFromStorage()  // Limpar PIX do localStorage
   ```

---

## 🔄 Fluxo Completo

### Cenário 1: Admin abre 2 dispositivos simultaneamente

```
DISPOSITIVO 1                    DISPOSITIVO 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin abre painel CRM
↓
checkCrmPixOnPageLoad()
↓
syncCrmPixFromBackend()          
↓                                Admin abre painel CRM
GET /payments/pix/active         ↓
↓                                checkCrmPixOnPageLoad()
Backend retorna:                 ↓
"active": true                   syncCrmPixFromBackend()
↓                                ↓
FAB aparece                      GET /payments/pix/active
showCrmPixFab()                  ↓
↓                                Backend retorna:
                                 "active": true
                                 ↓
                                 FAB aparece
                                 showCrmPixFab()
                                 ↓
Ambos com FAB visível após ~2 segundos
```

### Cenário 2: Admin usa 2 abas do mesmo dispositivo

```
ABA 1 (Admin CRM)                ABA 2 (Home Admin)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin abre painel CRM            
↓                                
Gera PIX                         
↓                                
saveCrmPixToStorage()            
✅ storage event disparado       
↓ ←─────────────────────────────┘
                                 window.addEventListener('storage')
                                 ↓
                                 FAB aparece automaticamente
                                 (sem reload, sem delay)
```

### Cenário 3: Admin recarrega página

```
ANTES DO RELOAD           DEPOIS DO RELOAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAB visível               
PIX ativo                 
                          ↓
localStorage:             localStorage:
crmActivePix = {...}      crmActivePix = {...}
                          ↓
                          initializeCrm()
                          ↓
                          checkCrmPixOnPageLoad()
                          ↓
                          syncCrmPixFromBackend()
                          ↓
                          GET /payments/pix/active
                          ↓
                          FAB reaparece
                          ✅ Mesmo countdown continua
```

### Cenário 4: PIX é confirmado em um dispositivo

```
DISPOSITIVO 1            DISPOSITIVO 2 (30s depois)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cliente paga PIX        
↓                        
Webhook recebido         
↓                        
Backend atualiza:        
status = "approved"      
                         ↓
                         Polling sincronização (30s)
                         ↓
                         syncCrmPixFromBackend()
                         ↓
                         GET /payments/pix/active
                         ↓
                         Retorna: "active": false
                         ↓
                         FAB desaparece
                         hideCrmPixFab()
```

---

## 📊 Sincronização Timeline

| Momento | Ação | Intervalo |
|---------|------|-----------|
| 0s | Admin abre página | - |
| <1s | Backend sync (inicial) | Imediato |
| 1s | FAB aparece | Após resposta |
| 30s | 2º backend sync | Periódico |
| 60s | 3º backend sync | Periódico |
| Real-time | Storage event (outra aba) | Event-driven |

---

## 🔌 Integração com Fluxo Existente

**Pontos de Integração:**

1. **Geração de PIX**
   ```javascript
   generateCrmPixQrCode()
   ↓
   saveCrmPixToStorage()        // Salva em localStorage
   ↓
   startCrmPixBackendSync()    // Inicia sincronização
   ↓
   showCrmPixFab()             // Mostra FAB
   ```

2. **Confirmação de PIX**
   ```javascript
   startCrmPixPolling()
   ↓
   Status = "approved"
   ↓
   stopCrmPixBackendSync()     // Parar sincronização
   ↓
   hideCrmPixFab()             // Esconder FAB
   ```

3. **Expiração de PIX**
   ```javascript
   startCrmPixPolling()
   ↓
   Poll count >= 720 (1 hora)
   ↓
   stopCrmPixBackendSync()     // Parar sincronização
   ↓
   hideCrmPixFab()             // Esconder FAB
   ```

---

## 🛡️ Fallback Strategy

```
Tentativa 1: Backend
├─ Sucesso: Usar PIX do backend ✅
└─ Erro: Continuar...

Tentativa 2: LocalStorage
├─ Sucesso: Usar PIX do localStorage ✅
└─ Erro: Nenhum PIX ativo
```

**Benefícios:**
- Se backend cair, sistema continua funcionando
- LocalStorage como cache/fallback
- Sincronização automática quando backend volta

---

## 📱 Responsividade Multi-Device

| Dispositivo | Comportamento | Teste |
|-------------|---------------|-------|
| **Mobile 1** | PIX gerado | ABA 1 |
| **Mobile 2** | PIX aparece (30s) | Novo dispositivo |
| **Tablet** | PIX aparece (30s) | Novo dispositivo |
| **Notebook** | PIX aparece (30s) | Novo dispositivo |
| **Mesmo Mobile - ABA 2** | PIX aparece (real-time) | Storage event |

---

## 🔍 Debug & Logs

Abra **F12 → Console** para ver:

```
✅ Sincronização iniciada
🔄 Sincronização backend iniciada (a cada 30s)
👂 Storage listener configurado (sincronização entre abas)
📲 Storage event detectado (outra aba modificou PIX)
🔄 Sincronizando PIX do backend: 123456789
✅ PIX sincronizado do backend e restaurado
```

---

## 🚀 Exemplo de Uso - 3 Dispositivos

### Setup
- **Dispositivo A**: Notebook (painel aberto)
- **Dispositivo B**: Tablet (painel fechado)
- **Dispositivo C**: Celular (painel fechado)

### Timeline

| Tempo | Ação | Resultado |
|-------|------|-----------|
| T+0 | Admin gera PIX em A | FAB aparece em A |
| T+0 | Backend salva PIX | PIX armazenado |
| T+5 | Admin abre painel em B | FAB aparece em B (backend sync) |
| T+10 | Admin abre painel em C | FAB aparece em C (backend sync) |
| T+15 | Admin clica FAB em B | Modal abre em B |
| T+15 | Storage event em A | A detecta mudança em B |
| T+30 | Próximo backend sync | Todos sincronizados |
| T+60 | Cliente paga | FAB desaparece em A, B e C |

---

## ✅ Checklist de Funcionalidades

- [x] Backend endpoint GET /payments/pix/active
- [x] Frontend sincronização com backend (30s)
- [x] Storage event listeners (real-time entre abas)
- [x] LocalStorage fallback
- [x] FAB persiste após reload
- [x] FAB sincronizado entre múltiplos dispositivos
- [x] FAB sincronizado entre múltiplas abas
- [x] Parar sincronização ao confirmar PIX
- [x] Parar sincronização ao expirar PIX
- [x] Parar sincronização ao fechar página
- [x] Logs detalhados para debug

---

## 🎯 Requisitos Atendidos

✅ **"tudo está funcionando, mas quando recarrego a página, o popup desaparece"**
- Resolvido: PIX restaurado do backend + localStorage

✅ **"mesmo que eu recarregue"**
- Resolvido: `checkCrmPixOnPageLoad()` restaura PIX ao recarregar

✅ **"mesmo que eu abra em outro dispositivo também quero que ele apareça simultaneamente"**
- Resolvido: `syncCrmPixFromBackend()` polling a cada 30s

✅ **"ele apareça simultaneamente"**
- Resolvido: Storage events (real-time) + backend sync (30s)

---

## 🔧 Manutenção

**Se precisar ajustar intervalos:**

```javascript
// Backend sync - alterar de 30s para 10s
crmPixSyncInterval = setInterval(syncCrmPixFromBackend, 10000);

// Storage listener - automático, sem configuração
```

**Se precisar desabilitar sincronização:**

```javascript
// Desabilitar backend sync
stopCrmPixBackendSync();

// Usar apenas localStorage
checkCrmPixOnPageLoad(); // Fallback automático
```

---

**Status:** ✅ Pronto para produção
**Commit:** c572149
**Data:** 28 de maio de 2026
