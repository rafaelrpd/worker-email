# worker-email

Um serverless backend worker construído com Cloudflare Workers para lidar com formulários de contato e emails.

## 🚀 Features

- **Integração com Cloudflare**:
  - **D1 Database**: Armazenamento de mensagens e logs.
  - **KV Namespace**: (Opcional) Cache e configurações rápidas.
  - **Queues**: (Opcional) Processamento assíncrono de emails.
- **Segurança**:
  - Cloudflare Turnstile para proteção contra bots.
  - Rate Limiting configurável.
- **Ambiente de Desenvolvimento**:
  - **Bun**: Runtime rápido e compatível.
  - **TypeScript**: Tipagem estática para maior segurança.
  - **ESLint + Prettier**: Padronização de código.

## 🛠️ Tecnologias

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Bun](https://bun.sh/)
- [TypeScript](https://www.typescriptlang.org/)
- [D1](https://developers.cloudflare.com/d1/)
- [Resend](https://resend.com/) (para envio de emails, se aplicável)

## ⚙️ Configuração

### Pré-requisitos

- [Bun](https://bun.sh/) instalado.
- Conta na Cloudflare.

### Instalação

```bash
bun install
```

### Variáveis de Ambiente

O arquivo `wrangler.jsonc` gerencia a configuração do worker e os bindings. As variáveis de ambiente locais são definidas em `.dev.vars`.

1. Copie o exemplo:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Preencha `.dev.vars` com seus valores locais.

**Nota:** O arquivo `wrangler.jsonc` mapeia as variáveis para o ambiente do Cloudflare. Certifique-se de que as variáveis definidas em `.dev.vars` correspondam ao esperado pelo worker ou use `"keep_vars": true` no `wrangler.jsonc` para manter as variáveis de ambiente locais sem sobrescrever as do dashboard.

Sempre criar o objeto `vars` no `wrangler.jsonc` para as variáveis de ambiente locais possam ser mapeadas para o worker.

No Dashboard da Cloudflare, adicione as variáveis de produção em **Build > Compute & AI > Workers && Pages > Settings > Variables and Secrets**.

## 🗄️ Banco de Dados (D1)

O projeto utiliza o D1 da Cloudflare.

### Migrations

Para criar uma nova migration (alteração no esquema do banco):

```bash
bunx wrangler d1 migrations create rafaeldias_email "descricao_da_mudanca"
```

Isso criará um arquivo SQL na pasta `migrations`.

Para aplicar as migrations localmente:

```bash
bunx wrangler d1 migrations apply rafaeldias_email
```

Para aplicar em produção:

```bash
bunx wrangler d1 migrations apply rafaeldias_email --remote
```

## 💻 Desenvolvimento

Rodar o servidor de desenvolvimento local:

```bash
bun run dev
```

Rodar o servidor de desenvolvimento local mas usando as vars e secrets do dashboard:

```bash
bun run dev:remote
```

Rodar testes:

```bash
bun run test
```

Lint e formatação:

```bash
bun run lint
bun run lint:fix
bun run format
```

## 🚀 Deploy

Para fazer o deploy para a Cloudflare rede global:

```bash
bun run deploy
```

## 📁 Estrutura do Projeto

- `src/`: Código fonte do worker.
- `migrations/`: Arquivos SQL para o D1.
- `test/`: Testes com Vitest.
- `wrangler.jsonc`: Configuração do Cloudflare Worker.
