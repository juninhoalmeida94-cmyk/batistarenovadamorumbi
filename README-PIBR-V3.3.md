# PIBR M — V3.3

## Novidades

### Mídia / Galeria
- Novo perfil **Mídia**.
- Perfil Mídia vê apenas **Dashboard + Mídia/Galeria**.
- Upload de várias fotos JPG/PNG/WebP para o Supabase Storage.
- Até 30 fotos por envio, máximo 8 MB por arquivo.
- Rascunho / Publicado / Arquivado.
- Capa, legenda, culto/evento e ordem.
- Fotos publicadas passam a alimentar a galeria pública.
- Se não houver foto publicada no painel, o site mantém as fotos locais atuais.

### Interessados em Célula
- Novo módulo **Interessados em Célula**.
- Formulário `#cells-form` do site envia também ao Supabase.
- Google Forms atual continua funcionando.
- Status: Novo → Contatado → Encaminhado → Integrado → Arquivado.
- Pode atribuir uma célula e um líder responsável.
- Administrador e Líder podem acompanhar.
- Exclusão somente por Administrador.

## Como instalar

1. Extraia este ZIP na **raiz do projeto PIBR M**.
2. Substitua a pasta `painel/`.
3. Execute `ATUALIZAR-V3.3.bat`.
4. Abra pelo Live Server e pressione `Ctrl + F5`.
5. Teste o formulário **Encontre uma célula**.
6. Confira no painel em **Interessados em Célula**.
7. Em **Usuários e permissões**, o Admin pode definir um usuário como **Mídia**.
8. Entre em **Mídia / Galeria**, envie uma foto como Publicado e atualize o site público.

O Supabase conectado já recebeu as alterações necessárias nesta sessão.
