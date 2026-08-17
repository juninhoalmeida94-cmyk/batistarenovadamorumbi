# PIBR M — Correção V3.2.1

Correção da integração do formulário público de Pedido de Oração.

## O que muda
- O formulário atual continua enviando ao Google Forms/Sheets como backup.
- O mesmo pedido é enviado em paralelo ao Supabase.
- O pedido passa a aparecer no módulo **Pedidos de oração** do painel.
- Nenhuma página visual do site é substituída.

## Como instalar
1. Extraia este ZIP na **raiz do projeto PIBR M**.
2. Substitua `pibr-prayer-supabase.js` se o Windows perguntar.
3. Execute `ATUALIZAR-V3.2.1.bat`.
4. Aguarde a mensagem `instalada e VERIFICADA com sucesso`.
5. Abra pelo Live Server e pressione `Ctrl + F5`.
6. Envie um pedido de oração de teste.
7. Confira a planilha e o painel.

O instalador cria `index.html.backup-v3.2.1` antes de alterar o HTML.
