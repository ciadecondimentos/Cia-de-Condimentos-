# ❓ FAQ - Perguntas Frequentes sobre o Sistema de Promoções

## Geral

### P: O sistema está pronto para usar?
**R:** ✅ SIM! Está 100% pronto. Você só precisa:
1. Ter o DATABASE_URL configurado
2. Reiniciar o servidor
3. Começar a criar promoções

### P: Preciso mudar meu banco de dados?
**R:** ❌ NÃO! O sistema usa as mesmas tabelas que você tem. Apenas adiciona 4 tabelas novas (não afeta nada existente).

### P: Isso vai quebrar o que já existe?
**R:** ❌ NÃO! O sistema é completamente separado. Produtos, pedidos, etc. funcionam normalmente.

### P: Qual é a diferença com o sistema anterior?
**R:** O anterior tinha "códigos de promoção" (ex: PROMO2024). O novo é muito mais simples:
- ❌ Antes: Admin cria código → Cliente coloca código no carrinho
- ✅ Agora: Admin cria promoção → Aparece automaticamente no produto

---

## Promoções de Produto

### P: Como o cliente vê a promoção?
**R:** Automaticamente no card do produto:
- Selo vermelho com "X% OFF"
- Preço antigo com risco
- Preço novo em vermelho
- Tempo restante

### P: O cliente precisa fazer algo?
**R:** ❌ NÃO! É automático. Ele vê a promoção e clica.

### P: Posso aplicar a mesma promoção em vários produtos?
**R:** ❌ NÃO por enquanto. Cada promoção é para 1 produto. Mas é rápido criar vários!

### P: E se eu mudar de ideia?
**R:** Fácil! Você pode:
- Editar: Mudar preço ou data
- Desativar: Status = "Inativa" (sem deletar)
- Deletar: Remover completamente

### P: Quanto tempo a promoção dura?
**R:** Você decide! Pode ser 1 dia, 1 semana, 1 mês, etc. Escolhe a data de validade.

---

## Kits

### P: O que exatamente é um kit?
**R:** Um pacote com vários produtos por um preço especial. Exemplo:
- Cliente compra 5 temperos separados = R$ 25,00
- Cliente compra "Kit 5 Temperos" = R$ 19,90 (economia!)

### P: O produto original fica à venda?
**R:** ✅ SIM! O kit é uma OPÇÃO adicional, não substitui o produto original.

### P: Quantos produtos posso colocar no kit?
**R:** Quantos quiser! 2, 5, 10, 50... sem limite.

### P: Posso usar o mesmo produto em vários kits?
**R:** ✅ SIM! Um produto pode estar em vários kits.

### P: Como o cliente vê o kit?
**R:** Como um "pseudo-produto" na loja. Mostra:
- Nome do kit
- Quantos produtos tem
- Preço especial

### P: E o desconto do kit?
**R:** Você define! Exemplo: 5 temperos = R$ 29,90 (você escolhe esse valor).

---

## Promoção por Quantidade

### P: Como funciona exatamente?
**R:** Você define:
- **Quantidade mínima**: "Se comprar 5 ou mais..."
- **Desconto**: "...ganha 15% de desconto"
- **Produtos**: "...nesses produtos específicos ou todos"

Quando cliente compra, o desconto é aplicado automaticamente no carrinho.

### P: É só para 1 tipo de produto?
**R:** NÃO! Você pode:
- Deixar em branco = Aplica a TODOS os produtos
- Selecionar alguns = Aplica só nesses

### P: Funciona em combinação?
**R:** Depende! Se cliente compra:
- 5x Orégano = ganha desconto
- 3x Orégano + 2x Manjericão = também ganha (se configurado)

---

## Preços e Descontos

### P: Como calculo o preço de promoção?
**R:** Simples! Exemplo:
- Preço original: R$ 10,00
- Você quer 30% de desconto: 10 × 0.70 = R$ 7,00
- Coloque R$ 7,00 como preço da promoção

O sistema calcula automaticamente que é 30% OFF!

### P: O desconto aparece em centavos?
**R:** ✅ SIM! Você coloca R$ 2.99, vai aparecer R$ 2.99.

### P: Posso colocar desconto de 1%?
**R:** Sim, mas não faz sentido 😄. O sistema aceita qualquer valor.

### P: E os centavos?
**R:** Funcionam normalmente: R$ 4.90, R$ 12.99, etc.

---

## Datas

### P: Qual é a data exata de expiração?
**R:** Você escolhe a DATA, mas não a HORA. A promoção expira no final do dia.

### P: E se a data passar?
**R:** A promoção não desaparece do banco, mas não aparece mais para o cliente. Status pode ser "Expirada".

### P: Posso estender uma promoção?
**R:** ✅ SIM! Edite e coloque uma nova data.

### P: Que data devo usar?
**R:** Sempre data futura! Se colocar data do passado, não vai aparecer.

---

## Admin Panel

### P: Onde fico as promoções no admin?
**R:** Menu esquerdo → "🎯 Promoções" → 3 abas

### P: Preciso estar logado?
**R:** ✅ SIM! Apenas admin vê essa seção.

### P: Posso editar depois de criar?
**R:** ✅ SIM! Clique no botão ✏️ na tabela.

### P: Posso deletar uma promoção?
**R:** ✅ SIM! Clique no botão 🗑️. Cuidado: é irreversível!

### P: Tem limite de promoções?
**R:** ❌ NÃO! Quantas quiser.

### P: Como ordena as promoções?
**R:** Por data de criação (mais recente primeiro).

---

## Site do Cliente

### P: Quando aparece a promoção no site?
**R:** IMEDIATAMENTE! Sem precisar recarregar (mas pode recarregar com Ctrl+F5 se não vir).

### P: O que aparece no card?
**R:** 4 coisas:
1. 🔴 Selo: "X% OFF"
2. ⏰ Tempo: "5 dias"
3. ~~R$ 4.90~~ Preço antigo riscado
4. R$ 2.99 Preço novo em vermelho

### P: Posso ocultár a promoção?
**R:** ✅ SIM! Coloque Status = "Inativa". Desaparece do site mas não deleta.

### P: O cliente vê a economia?
**R:** Não explicitamente, mas vê:
- O preço que PAGA (vermelho)
- O preço que ECONOMIZA (riscado)

### P: Funciona em mobile?
**R:** ✅ SIM! 100% responsivo. O selo fica menor em mobile mas tudo funciona.

---

## Cálculos e Validações

### P: O sistema recalcula o desconto?
**R:** ✅ SIM! Automaticamente. Exemplo:
- Preço original: R$ 19.90
- Preço promoção: R$ 9.90
- Desconto: 50% (calculado automaticamente)

### P: Posso colocar um preço MAIOR como "promoção"?
**R:** ❌ NÃO! O sistema valida e não deixa. Preço de promoção DEVE ser menor.

### P: Preciso preencher TUDO?
**R:** ✅ SIM! Campos com * são obrigatórios. O sistema avisa se esquecer.

### P: O que é "Status"?
**R:** "Ativa" = aparece no site  
"Inativa" = não aparece mas fica salva  
"Expirada" = data passou (automático)

---

## Segurança

### P: O cliente pode ver o admin?
**R:** ❌ NÃO! Está protegido por login.

### P: Alguém pode roubar meus descontos?
**R:** ❌ NÃO! O desconto é aplicado no backend, não no frontend.

### P: Posso ter promoção negativa?
**R:** ❌ NÃO! Sistema valida.

### P: Preciso fazer backup?
**R:** ✅ SIM! Mas as promoções ficam no banco de dados normal.

---

## Integração

### P: Funciona com carrinho?
**R:** ✅ SIM! O preço da promoção já aparece no carrinho.

### P: Funciona com cupom antigo?
**R:** ✅ SIM! São sistemas separados, podem coexistir.

### P: Funciona com frete?
**R:** ✅ SIM! O frete é calculado no total correto (com promoção).

### P: Funciona com estoque?
**R:** ✅ SIM! Produto sem estoque não deixa adicionar, promocionado ou não.

---

## Problemas Comuns

### P: Não vejo a promoção no site
**R:** Verifique:
1. Status = "Ativa"?
2. Data ainda é futura?
3. Recarreguou o site (Ctrl+F5)?
4. Produto existe no banco?

### P: Preço está errado
**R:** Verifique:
1. Preço de promoção < preço original?
2. Salvou corretamente (mensagem verde)?
3. Recarregou o site?

### P: Não consigo editar
**R:** Tente:
1. Recarregue a página
2. Clique em editar novamente
3. Se persistir, delete e crie novo

### P: Erro ao salvar
**R:** Verifique:
1. Todos os campos obrigatórios preenchidos?
2. Servidor está rodando?
3. Database connected?

---

## Performance

### P: Fica lento com muitas promoções?
**R:** ❌ NÃO! Mesmo com 1000 promoções, funciona rápido.

### P: Afeta a velocidade do site?
**R:** ❌ NÃO! Promoções são carregadas uma vez ao iniciar.

### P: Tem limite?
**R:** ❌ NÃO! Sem limite técnico.

---

## Suporte

### P: Onde me ajudam se tiver problema?
**R:** Revise:
1. `PROMOCOES_SIMPLIFICADO.md` - Como usar
2. `GUIA_IMPLEMENTACAO_PROMOCOES.md` - Como instalar
3. `TESTE_RAPIDO_PROMOCOES.md` - Como testar
4. Logs do servidor (console)

### P: Como reportar bug?
**R:** Documente:
- O que tentou fazer
- O que esperava
- O que aconteceu
- Print de erros/logs

### P: Posso adicionar mais funcionalidades?
**R:** ✅ SIM! Sistema é modular. Mas comece com esses 3 tipos.

---

**Última atualização**: 15 de maio de 2026  
**Versão**: 1.0 Stable
