# Aurorium V2 - Plataforma para gestão de comunidades de RPG

Evolução do MVP acadêmico da UniCesumar. A aplicação administra **comunidades**, **mesas**, **vagas**, **inscrições**, **sessões**, **presença**, **notificações** e **mensalidades administrativas**. Não é uma mesa virtual (VTT) e não processa pagamentos.

## O que há neste pacote

- `frontend/`: React 19 + TypeScript + Vite + Tailwind CSS 4, componentes próprios, navegação dos três perfis, logo D20 e fundos de fantasia produzidos por IA nesta conversa.
- `frontend/public/assets/`: quatro imagens originais em WebP, incluídas no projeto, sem dependência de links externos.
- `backend/`: API HTTP Node.js, SQLite nativo (`node:sqlite`), autenticação local, validação básica de permissões, e operações de cadastro/consulta/edição.
- `backend/data/seed.json`: 21 usuários fictícios, 2 comunidades, 6 mesas, 54 sessões, inscrições e mensalidades de demonstração.
- `backend/tests/`: testes integrados da API sem bibliotecas externas.
- `legacy/`: cópia da V1 em HTML com os fundos originais, utilizável diretamente no navegador, como referência e alternativa offline.

## Requisitos

- Windows 10/11, macOS ou Linux.
- Node.js 24 LTS recomendado (ou Node 22.13+ com `--experimental-sqlite`).
- npm e VS Code opcionais, recomendados para editar.
- Conexão à internet **na primeira instalação das dependências do React/Tailwind**, caso ainda não estejam em cache.

## Execução local

Abra o diretório `aurorium-v2` no VS Code, abra o terminal na raiz e execute:

```powershell
npm install
npm run db:setup
npm run dev
```

Acesse **http://127.0.0.1:5173**. O Vite oferece o site e encaminha `/api` para `http://127.0.0.1:3333`. Ambos iniciam pelo comando `npm run dev`.

### Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Jogador | `jogador@demo.rpg` | `AuroriumDemo2026!` |
| Mestre | `mestre@demo.rpg` | `AuroriumDemo2026!` |
| Administrador | `admin@demo.rpg` | `AuroriumDemo2026!` |

Credenciais **exclusivamente para testes locais**. Não utilize esse seed em ambiente público.

### Outros comandos

```powershell
npm run test:api   # teste de login, permissões, mesas, inscrição, agendamento e presença
npm run typecheck  # conferir tipagem depois de instalar dependências
npm run build      # compilar para frontend/dist
npm run db:reset   # APAGA alterações e restaura os dados fictícios originais
npm run dev:api    # iniciar apenas a API, porta 3333
npm run dev:web    # iniciar apenas React, porta 5173
```

O banco fica em `backend/data/aurorium.sqlite` e persiste mudanças entre reinicializações. Para não perder dados de testes, evite `db:reset`.

## O que foi migrado

- Telas de Jogador, Mestre e Administrador; catálogo de mesas com pesquisa e filtros; gerenciamento de comunidades; criação/edição/arquivamento de mesas; aprovação de inscrições; filas de espera e liberação de vagas; agendamento avulso e recorrente; edição individual e das próximas ocorrências; presenças; notificações internas; preferências de WhatsApp com **envio somente simulado**; controle de mensalidades e relatórios administrativos.
- O cadastro público cria apenas Jogadores; habilitação para Mestre depende de aprovação do Administrador.
- O sistema usa os mesmos conceitos e conjuntos de dados da V1. A V1 legada continua no diretório `legacy`.

## Ressalvas importantes

1. A interface React depende de instalar bibliotecas via `npm install`. Durante a preparação deste pacote, o registro do npm não estava acessível no ambiente de criação, de modo que **não foi possível completar a compilação ou o teste no navegador do frontend**. A sintaxe TSX foi analisada pelo compilador TypeScript instalado localmente, e a **API teve testes automatizados passando**.
2. A API usa o SQLite incluído no Node (sem Prisma) para reduzir a quantidade de dependências e facilitar a execução. A versão local ainda **não foi auditada para uso público/produção**; devem ser acrescentados rate limiting, políticas de sessão persistente, logs controlados e revisões de privacidade e autorização antes da publicação.
3. O WhatsApp não envia mensagens. Os registros gerados são rotulados como simulação.
4. O sistema registra situações administrativas de mensalidades. Não captura cartões, não transfere valores e não processa pagamentos.
5. Os fundos são utilizados como arte ambiental. As páginas administrativas mantêm sobreposições escuras para legibilidade.

## Identidade visual

Verde #071A14 e #0A2119, detalhes dourados #C6A15B e #D0AF62, off-white #F2F0E8, símbolo D20 vetorial criado para a plataforma. Quatro fundos originais: castelo em vale, castelo e dragão, bastião gótico, salão do D20.

## Possíveis melhorias de uma V3

Importar dados pessoais armazenados previamente em localStorage da V1 (além do seed já migrado); integração oficial e opt-in do WhatsApp; testes visuais e de acessibilidade; banco PostgreSQL e deploy; autorização refinada por participação em múltiplas comunidades; imagens exclusivas para cada campanha e gestão de upload.
