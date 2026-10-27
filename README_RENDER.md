# Publicação da Aurorium V2 no Render

## Preparação

Este projeto foi adaptado para disponibilizar a interface React e a API Node.js no mesmo endereço público.

No computador:

```powershell
npm install
npm run build
npm run dev
```

Para testar a versão de produção local:

```powershell
npm start
```

Abra http://127.0.0.1:3333. Se o banco ainda não estiver criado, use `npm run db:setup` antes.

## GitHub

1. O repositório `SavyoLimaDEV/Aurorium` já foi criado.
2. Na pasta do projeto, abra um terminal PowerShell e execute:

```powershell
git init
git add .
git commit -m "Preparar Aurorium V2 para publicação"
git branch -M main
git remote add origin https://github.com/SavyoLimaDEV/Aurorium.git
git push -u origin main
```

Use o repositório já criado: https://github.com/SavyoLimaDEV/Aurorium . Se já existe repositório ou commits, ajuste os comandos conforme necessário.

Não publique senhas próprias, telefones ou dados reais no repositório.

## Render

1. Conecte sua conta GitHub ao Render.
2. Escolha **New > Blueprint** e selecione o repositório.
3. O arquivo `render.yaml` já define serviço Node, compilação, porta e verificação de saúde.
4. Confirme o plano Free e inicie o deploy.
5. Abra o endereço `https://NOME_DO_SERVICO.onrender.com` fornecido pelo Render.
6. Teste os perfis e as principais operações antes da apresentação.

## Banco de dados

Neste pacote o SQLite do Render fica em `/tmp/aurorium.sqlite` e é preenchido com dados **fictícios** ao iniciar.

O plano gratuito do Render não fornece disco persistente: alterações feitas no site podem desaparecer ao reiniciar ou republicar o serviço. O ambiente serve **somente para demonstração**.

As contas de demonstração vêm com senhas públicas: não cadastre informações pessoais ou sensíveis. Para uso real, é necessário reforçar autenticação, limitar cadastro e utilizar um banco persistente.

## Solução de problemas

- Frontend não compila: execute `npm install` e `npm run build` no terminal.
- API não inicia: verifique Node 24 e o comando `npm start`.
- Erro 503 em `/`: execute `npm run build`.
- O servidor gratuito pode ficar inativo após períodos sem visitas. Abra o link antes da apresentação e confirme seu funcionamento.
