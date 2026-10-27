# Mapa de verificação da V2

## API testada em Node.js + SQLite

- GET `/api/health`: resposta positiva.
- GET `/api/state` sem sessão: HTTP 401.
- Login de Administrador/Jogador: HTTP 200 com cookie de sessão.
- Criação de mesa por Jogador: HTTP 403.
- Criação de mesa pelo Administrador: HTTP 201.
- Solicitação do Jogador: HTTP 201.
- Solicitação duplicada: HTTP 409.
- Aprovação do Jogador: HTTP 200.
- Ocupação refletida no estado consultado.
- Sessões recorrentes criadas para a mesa.
- Registro de presença refletido no estado consultado.
- Capacidade inválida: HTTP 400.

## Interface

Os componentes React e a estrutura Tailwind estão incluídos no pacote. Foi executada verificação de **sintaxe** com o compilador TypeScript, sem erros sintáticos. A compilação completa e os testes no navegador requerem `npm install`; o registro npm estava indisponível neste ambiente de criação. Não confundir código entregue com build de produção validado.

## Funcionalidades simuladas

- Envio WhatsApp: gera um registro no banco, mas **não envia mensagem**.
- Contas de demonstração: dados fictícios, para ambiente local.
- Dados financeiros: acompanhamento administrativo de mensalidades, sem pagamento real.
