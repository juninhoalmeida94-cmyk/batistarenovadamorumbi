# PIBR Morumbi — Painel V3.1

Atualização incremental sobre a V3 conectada ao Supabase.

## O que foi corrigido

- Dashboard agora mostra o total real de visitantes.
- O detalhe abaixo do card informa quantos ainda estão com status `Novo`.
- Cada módulo recarrega dados do Supabase ao ser aberto.
- O painel também atualiza o módulo atual quando a janela volta ao foco.
- Usuários e permissões passam a recarregar a lista real de perfis.
- O usuário autenticado aparece como fallback mesmo se o perfil ainda estiver sendo criado.
- Permissões visíveis ficaram somente em `Administrador` e `Líder`.
- Contas sem permissão ficam como `Aguardando liberação`.
- Líder não vê Configurações do site, Usuários e permissões ou Sistema.
- Proteção contra remover o último administrador.
- Melhor feedback visual durante sincronização e gravação.
- Configurações do site viraram formulário amigável, sem edição manual de chave/JSON.
- Cache busting adicionado aos arquivos do painel.
- Versão exibida no sistema: `3.1.0`.

## Escopo do painel

Gestão:
- Dashboard
- Eventos
- Células
- Ministérios
- Líderes
- Visitantes
- Pedidos de oração

Site:
- Programação
- Conteúdo
- Configurações do site

Sistema:
- Usuários e permissões
- Sistema

## Supabase

O projeto continua usando o mesmo Supabase já conectado:

`trurqjrypocuojhmpuur`

Não é necessário criar outro projeto ou trocar a chave pública.

## Integração com o site público

O arquivo `pibr-public-sync.js` foi incluído como ponte segura para o site público.

Ele não altera nada sozinho. Para ativá-lo em uma página pública, inclua antes de `</body>`:

```html
<script src="pibr-public-sync.js"></script>
```

A sincronização usa atributos opt-in, então elementos atuais do site não são alterados por acidente.

Exemplos:

```html
<h1 data-pibr-hero-title>Uma igreja para sua família.</h1>
<p data-pibr-hero-subtitle>Texto atual</p>
<div data-pibr-program-list></div>
<div data-pibr-events-list></div>
<div data-pibr-content="sobre"></div>
```

A ponte lê apenas dados que as políticas públicas do Supabase permitem.

## Como atualizar

Extraia o ZIP na raiz do projeto PIBR M.

Pode substituir:
- `painel/index.html`
- `painel/style.css`
- `painel/app.js`
- `painel/config.js`

O pacote não substitui o `index.html`, `style.css`, `script.js` ou páginas públicas atuais.

## Observação de segurança

As regras RLS já protegem as tabelas PIBR. O Supabase também sinalizou que a proteção contra senhas vazadas pode ser habilitada no Auth como reforço adicional; isso é opcional e não impede o funcionamento da V3.1.
