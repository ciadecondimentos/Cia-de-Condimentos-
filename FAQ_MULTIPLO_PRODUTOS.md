# ❓ FAQ - Registrar Múltiplos Produtos (CRM)

## Perguntas Frequentes

---

## 📝 Básico

### **P1: Como faço para registrar múltiplos produtos?**
R: Clique em "+ Registrar Compra" no cliente. Marque os checkboxes dos produtos que o cliente comprou. Cada checkbox marcado mostra um campo de quantidade. Preencha a data e pagamento UMA VEZ e clique salvar.

### **P2: Preciso marcar os produtos um por um?**
R: Sim, mas é muito rápido. Você clica no checkbox, aparece o campo de quantidade, você ajusta, e passa para o próximo. É um sistema visual bem intuitivo.

### **P3: Posso desmarcar um produto que marquei por erro?**
R: Sim! Basta clicar no checkbox novamente para desmarcar. O campo de quantidade desaparece automaticamente.

### **P4: O que aparece se eu desmarcar um produto?**
R: O campo de quantidade Some. O subtotal também desaparece. O total geral recalcula automaticamente.

---

## 🧮 Cálculos

### **P5: Como funciona o cálculo do total?**
R: Cada produto mostra:
```
Cominho → [2] × R$ 8.00 = R$ 16.00
Orégano → [1] × R$ 6.50 = R$ 6.50
──────────────────────────────────
Total Geral: R$ 22.50
```

### **P6: O total atualiza em tempo real?**
R: Sim! Quando você muda a quantidade em qualquer campo, o total geral atualiza instantaneamente.

### **P7: Eu posso mudar a quantidade para 0?**
R: Não deveria. Existe validação. Se escrever 0, o sistema avisa que precisa ser ≥ 1.

### **P8: Posso mudar a quantidade após ver o total?**
R: Sim! O total recalcula cada vez que você ajusta.

---

## 💳 Pagamento

### **P9: Todos os produtos têm que ter a mesma data de compra?**
R: Sim. A data é única para TODA a compra (todos os produtos).

### **P10: Todos têm que ter o mesmo status de pagamento?**
R: Sim. Se um produto foi pago e outro pendente, você precisa fazer em duas compras separadas.

### **P11: Posso deixar o pagamento em branco?**
R: Sim, é opcional. Mas recomendamos preencher.

### **P12: Preciso preencher as observações?**
R: Não, é opcional. Mas é útil colocar algo como "Compra em lote" ou "Reposição".

---

## 💾 Salvando

### **P13: O que acontece quando clico "Salvar Compra"?**
R: O sistema registra CADA PRODUTO como uma compra separada, mas todas com os mesmos dados de data/pagamento.

Exemplo: Se marcar 5 produtos, vão virar 5 compras no histórico.

### **P14: Recebo confirmação ao salvar?**
R: Sim! Uma mensagem aparece: "✓ 5 compra(s) registrada(s) com sucesso!"

### **P15: Posso cancelar após começar?**
R: Sim. Clique em "Cancelar" e o modal fecha sem salvar. Nada é perdido ainda.

### **P16: Posso voltar atrás se cometi um erro?**
R: Sim! Você pode deletar cada compra individualmente no histórico (clique no 🗑️).

---

## 📊 Histórico

### **P17: Como aparecem no histórico do cliente?**
R: Cada produto aparece como uma linha separada, mas com a mesma data e pagamento:

```
Data      | Produto          | Qtd | Valor Unit. | Total
──────────────────────────────────────────────────────────
17/05 PIX | Pimenta          | 2   | R$ 12.50    | R$ 25.00
17/05 PIX | Cominho          | 3   | R$ 8.00     | R$ 24.00
17/05 PIX | Orégano          | 1   | R$ 6.50     | R$ 6.50
```

### **P18: Posso editar uma compra depois?**
R: Sim! Clique no ✏️ (lápis) ao lado da compra. Mas aí você edita só aquela compra (modo individual).

### **P19: Posso deletar uma compra?**
R: Sim! Clique no 🗑️ (lixeira). Mas deleta só aquela compra individual.

### **P20: Posso deletar todas as compras de uma vez?**
R: Não. Você precisa deletar uma por uma. Mas você pode fazer isso rapidamente.

---

## 🔄 Interface

### **P21: Os checkboxes aparecem marcados?**
R: Não. Sempre começam desmarcados (em branco).

### **P22: O campo de quantidade começa com qual valor?**
R: Começa com "1". Você pode mudar para qualquer número ≥ 1.

### **P23: Posso digitar quantidade com decimal?**
R: Não! O campo é do tipo "number" com "step=1", então só aceita números inteiros.

### **P24: Posso ordenar os produtos no checklist?**
R: Não. Eles aparecem na ordem do banco de dados (geralmente por ID).

---

## ✅ Validações

### **P25: Que validações existem?**
R: Estas:
- ✅ Pelo menos 1 produto deve ser selecionado
- ✅ Data é obrigatória
- ✅ Quantidade deve ser ≥ 1
- ✅ Quantidade deve ser número inteiro

### **P26: O que acontece se eu não selecionar nenhum produto?**
R: Aparece: "Selecione pelo menos um produto"

### **P27: O que acontece se não selecionar data?**
R: Aparece: "Selecione a data da compra"

### **P28: Posso deixar a data em branco?**
R: Não. A data é obrigatória.

---

## 🎁 Casos Especiais

### **P29: Posso fazer compra de um único produto com este sistema?**
R: Sim! Funciona. Marca 1 checkbox, ajusta quantidade, salva. Mas é "overkill" para 1 produto.

### **P30: E se o cliente comprou 50 produtos?**
R: Funciona! Mas você pode ficar cansado marcando 50 checkboxes. 😅 Nós recomendamos fazer em lotes de 10-15.

### **P31: Posso registrar compra de produtos que não estão no banco?**
R: Não com o novo sistema. Precisa existir no banco. Se quiser um produto custom, use a edição individual.

### **P32: E se o cliente comprou quantidades fracionadas (0.5 kg)?**
R: Infelizmente não com o novo sistema (só números inteiros). Para isso, use a edição individual.

---

## 🐛 Problemas

### **P33: Os checkboxes não aparecem**
R: Verifique se o servidor está rodando e se há produtos no banco de dados.

### **P34: O total não atualiza**
R: Tente recarregar a página. Se persistir, abra o console (F12) e procure por erros.

### **P35: Cliquei salvar mas nada aconteceu**
R: Abra o console (F12) e veja se há mensagens de erro. Pode ser erro na rede.

### **P36: A compra foi salva mas não aparece no histórico**
R: Recarregue a página do cliente (F5 ou clique em outro cliente e volta).

### **P37: Marcou alguns produtos mas o modal fechou**
R: Se você clicou "Cancelar", nada foi salvo. Se foi um erro, clique "+ Registrar Compra" novamente.

---

## ⚙️ Técnico

### **P38: Quantas chamadas à API são feitas?**
R: 2 chamadas:
1. GET /api/products/admin/all (lista produtos)
2. POST /api/crm/customers/:id/purchases (para CADA produto selecionado)

Exemplo: Se marcar 3 produtos = 1 GET + 3 POSTs = 4 chamadas totais.

### **P39: O que acontece se uma das chamadas falhar?**
R: Uma mensagem de erro aparece. As outras compras podem ter sido salvas. Você pode tentar novamente.

### **P40: Qual navegador é suportado?**
R: Chrome, Firefox, Safari, Edge - todos os modernos.

---

## 💡 Dicas Pro

### **Dica 1: Salve tempo em clientes VIP**
Se um cliente sempre compra os mesmos produtos, salve um screenshot ou lista com os checkboxes. Fica rápido registrar.

### **Dica 2: Use as observações**
Coloque "Compra em lote" ou "Reposição" nas observações. Ajuda a identificar depois.

### **Dica 3: Registre por ordem alfabética**
Comece a marcar os checkboxes de cima para baixo. Fica mais organizado.

### **Dica 4: Verifique o total antes de salvar**
Sempre olhe para o total geral antes de clicar "Salvar". Se parecer errado, revise as quantidades.

### **Dica 5: Use para lotes, não para compras individuais**
O novo sistema é ótimo para 5+ produtos. Para 1-2 produtos, a edição individual também funciona.

---

## 🚀 Performance

### **P41: É rápido salvar múltiplas compras?**
R: Sim! Para 5 produtos = ~1-2 segundos. Para 10 = ~2-3 segundos.

### **P42: A lista de produtos carrega rápido?**
R: Sim! Geralmente < 500ms se o servidor está ok.

---

## 📱 Mobile

### **P43: Funciona em celular?**
R: Sim! O modal é responsivo e funciona perfeitamente em mobile.

### **P44: A lista de produtos cabe no celular?**
R: Sim! Há um scroll interno (max-height: 400px), então não fica desorganizado.

### **P45: Os campos ficam pequenos no mobile?**
R: Não! Font-size é 14px, campos são touch-friendly (min 44px altura).

---

## 🎓 Tutorial Rápido

```
1. Abra Central de Clientes
2. Clique no cliente (ex: João Silva)
3. Clique "+ Registrar Compra"
4. Marque: ☑ Pimenta, ☑ Cominho, ☑ Orégano
5. Ajuste quantidades: [2], [3], [1]
6. Observe total: R$ XX.XX
7. Preencha:
   - Data: 17/05/2026
   - Pagamento: Pix
   - Status: Pago
8. Clique "💾 Salvar Compra"
9. 🎉 Pronto! 3 compras registradas!
```

---

## 🤝 Suporte

**Algo não funciona?**
1. Recarregue a página (Ctrl+F5)
2. Abra console (F12) e procure erros
3. Verifique se o servidor está rodando
4. Tente em outro navegador
5. Se persistir, entre em contato

---

## 📞 Resumo em 3 Linhas

> Novo sistema permite registrar múltiplos produtos em UMA ação.  
> Marque checkboxes → Ajuste quantidades → Preencha data/pagamento UMA VEZ → Salve.  
> 5 minutos vira 30 segundos! 🚀

---

**Versão:** 1.0 - 17/05/2026  
**Último atualizado:** 17/05/2026
