# PIBR Morumbi — Painel V3.2

## O que mudou

- O formulário público **Pedido de oração** agora envia diretamente ao Supabase.
- O pedido entra no painel com status **Novo**, origem **Site** e como **Privado**.
- Os campos do formulário são preservados: WhatsApp, nome, pedido, área, idade, bairro/cidade, igreja, solicitação de contato e célula.
- O site público não recebe permissão para consultar pedidos existentes.
- Foi criado limite básico de envio por origem e honeypot contra robôs.
- O painel mostra **Área**, **Origem** e se a pessoa solicitou **Contato**.
- Versão do painel: **3.2.0**.

## Instalação

1. Extraia o ZIP na **raiz do projeto PIBR M**.
2. Permita substituir os arquivos da pasta `painel/`.
3. Dê dois cliques em `ATUALIZAR-V3.2.bat`.
4. O instalador apenas adiciona a chamada para `pibr-prayer-supabase.js` ao seu `index.html` atual e cria `index.html.backup-v3.2` antes da alteração.
5. Abra o projeto pelo **Live Server** e faça um pedido de teste.
6. Abra `painel/` → **Pedidos de oração**. O registro deve aparecer automaticamente como **Novo / Site**.

## Supabase

A migração `supabase/pibr-v3.2-prayer-site.sql` já foi aplicada no Supabase conectado. O arquivo fica no pacote como histórico e para reinstalação futura.

## Segurança

A chave presente no JavaScript é uma **publishable key** de baixa permissão, própria para uso em site público. O formulário chama apenas a RPC pública de envio. Leitura, edição e exclusão dos pedidos continuam protegidas para usuários autorizados do painel.
