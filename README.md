# CRM - Grupo Gomes & Rosiane

Este pacote contém apenas o CRM administrativo para hospedagem na Vercel.

## Arquivos principais

- `index.html`: tela inicial do CRM.
- `css/`: estilos do painel.
- `js/admin.js`: lógica do painel administrativo.
- `js/storage.js`: conexão com Supabase, Auth e banco.
- `js/config.js`: configuração do Supabase e link do site.
- `database/supabase.sql`: estrutura e políticas do banco.
- `vercel.json`: configuração simples para Vercel.

## Configurar Supabase

1. Crie um projeto em https://supabase.com.
2. Abra `SQL Editor`.
3. Execute o arquivo `database/supabase.sql`.
4. Vá em `Project Settings` > `API`.
5. Copie `Project URL` e `anon public key`.
6. Abra `js/config.js`.
7. Preencha:

```js
SUPABASE_URL: "https://seu-projeto.supabase.co",
SUPABASE_ANON_KEY: "sua-chave-anon",
SITE_URL: "https://site-teste-mauve.vercel.app"
```

## Criar usuário do CRM

1. No Supabase, acesse `Authentication`.
2. Entre em `Users`.
3. Clique em `Add user`.
4. Cadastre o e-mail e a senha do administrador.
5. Use esse e-mail e senha na tela de login do CRM.

## Hospedar o CRM na Vercel

1. Suba este pacote para um repositório GitHub separado do site público.
2. Acesse https://vercel.com.
3. Clique em `Add New Project`.
4. Importe o repositório do CRM.
5. Não precisa configurar build command.
6. Publique.

Como o arquivo principal é `index.html`, o domínio raiz do CRM abrirá a tela de login automaticamente.

## Funcionamento correto

- O botão `Ver site` aponta para `https://site-teste-mauve.vercel.app`.
- O CRM usa Supabase Auth.
- O CRM só consegue criar, editar e excluir dados quando o usuário está autenticado.
- O site público e o CRM devem usar o mesmo `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
