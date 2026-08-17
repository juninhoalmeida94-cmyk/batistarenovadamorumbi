# PIBR Morumbi — Painel V1

Esta atualização é **aditiva**: ela não substitui nem altera os arquivos atuais do site público.

## O que entra no projeto

- `painel/index.html`
- `painel/style.css`
- `painel/app.js`
- `painel/config.js`
- `supabase/pibr-v1.sql`

O site público continua usando os arquivos atuais da raiz (`index.html`, `style.css`, `script.js` e `assets/`).

## Como testar agora

1. Extraia as pastas `painel` e `supabase` na raiz do projeto atual.
2. Rode o projeto em um servidor local (ex.: Live Server no VS Code) ou publique normalmente.
3. Acesse `/painel/`.
4. Como o Supabase ainda estará vazio em `painel/config.js`, aparecerá o botão **Entrar no modo demonstração**.
5. Nesse modo, os dados de teste ficam no `localStorage` do navegador e você já pode cadastrar, editar, buscar e excluir registros.

## Como ativar o Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor e execute `supabase/pibr-v1.sql`.
3. No Supabase Auth, crie o usuário administrador (e-mail e senha).
4. Abra `painel/config.js` e preencha:

```js
supabaseUrl: "https://SEU-PROJETO.supabase.co",
supabaseAnonKey: "SUA-CHAVE-PUBLISHABLE"
```

5. Publique o site novamente. Ao detectar as chaves, o painel muda automaticamente para login real via Supabase.

> A publishable/anon key pode ficar no frontend quando o banco está protegido por RLS. Nunca coloque `service_role` no site.

## Módulos da V1

- Dashboard
- Membros
- Visitantes
- Células
- Eventos
- Pedidos de oração
- Configurações
- Login via Supabase Auth
- Modo demonstração local
- CRUD completo dos módulos
- Busca em tabelas
- Layout responsivo para desktop e celular

## Próxima evolução sugerida

V2: Escalas, presença, ministérios e permissões por perfil (Admin/Pastor/Líder/Ministério).
