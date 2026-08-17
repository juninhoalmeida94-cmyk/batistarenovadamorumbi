# PIBR Morumbi — Painel Administrativo V3

Esta versão substitui o Painel V2 e já está conectada ao Supabase do projeto.

## Como atualizar

Extraia este ZIP na raiz do projeto PIBR Morumbi, substituindo os arquivos da pasta `painel` quando solicitado.

Depois abra com Live Server e acesse:

`/painel/index.html`

## Primeiro administrador

1. Clique em **Criar conta**.
2. Cadastre o e-mail oficial da igreja.
3. Se o Supabase solicitar confirmação por e-mail, confirme a conta.
4. Faça login.
5. Como ainda não existe nenhum papel PIBR cadastrado, a primeira conta autenticada poderá assumir automaticamente o papel `admin`.

Depois disso, somente administradores existentes conseguem conceder novas permissões.

## Módulos desta versão

- Dashboard
- Eventos
- Células
- Ministérios
- Líderes
- Visitantes
- Pedidos de oração
- Programação
- Conteúdo do site
- Configurações do site
- Usuários e permissões

Não foram incluídos **Presença**, **Escalas** ou um módulo genérico de **Membros**.

## Supabase

O arquivo `painel/config.js` já contém a URL e a chave pública (`publishable`) do projeto. Nenhuma chave `service_role` é usada no navegador.

As permissões da PIBR são independentes das permissões da Mentoria, apesar dos dois sistemas compartilharem o mesmo projeto Supabase.
