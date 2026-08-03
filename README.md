# UFMG Salas

Consulte as salas das suas matérias a partir da sua grade do SIGA.

O frontend é feito com React + Vite e o backend é um Cloudflare Worker que faz proxy das requisições ao SIGA e cruza os horários com dados de salas extraídos do ICEx e da Engenharia.

> **Aviso:** este projeto não tem nenhuma ligação oficial com a UFMG.

## Estrutura

```
    /                 → Frontend (React + Vite) + Backend (Cloudflare Worker)
    /worker/scraping/ → Extração de dados de salas (roda automaticamente via cron no Worker)
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) ≥ 18
- [npm](https://www.npmjs.com/) ≥ 9 (vem com o Node.js)
- Uma conta na [Cloudflare](https://dash.cloudflare.com/) (para deploy e KV)

## Setup

### 1. Clone o repositório

```bash
git clone https://github.com/fidelis05/UFMG-Salas.git
cd UFMG-Salas
```

### 2. App (Frontend + Worker)

```bash
npm install
```

#### Configurar o Cloudflare KV

O worker usa um KV namespace chamado `Salas` para armazenar os dados das salas. Você precisa criar o seu próprio:

```bash
npx wrangler kv namespace create Salas
```

Copie o `id` retornado e atualize o campo `kv_namespaces[0].id` em `wrangler.jsonc`.

#### Configurar o segredo das correções

As correções de sala enviadas por estudantes são associadas a um identificador
pseudônimo derivado da matrícula. Esse identificador é um HMAC, não um hash
simples: matrículas da UFMG são curtas e sequenciais, então um SHA-256 sem
segredo seria reversível e revelaria quem sugeriu cada sala.

```bash
npx wrangler secret put CORRECTION_HASH_SECRET
```

Sem esse segredo o worker **recusa** gravar correções (`503`), em vez de gravar
com identificadores fracos. A leitura da grade e da busca continua funcionando
normalmente. Para desenvolvimento local, defina a variável em um arquivo `.env`.

#### Rodar em desenvolvimento

```bash
npm run dev
```

O Vite serve o frontend e o plugin `@cloudflare/vite-plugin` roda o worker localmente.

#### Deploy

```bash
npm run deploy
```

### 3. Extração de dados de salas

Não há nenhum passo manual aqui. O próprio Worker extrai os horários/salas de fontes
públicas (ICEX e Engenharia) e escreve o resultado direto na KV — veja
`app/worker/scraping/` e o handler `scheduled` em `app/worker/index.ts`.

Isso roda automaticamente a cada 4 horas via cron trigger, configurado em
`wrangler.jsonc`:

```jsonc
"triggers": {
  "crons": ["0 */4 * * *"]
}
```

Para rodar a extração manualmente durante o desenvolvimento (sem esperar o cron):

```bash
npx wrangler dev --test-scheduled
# em outro terminal
curl "http://localhost:8787/__scheduled?cron=0+*/4+*+*+*"
```

## Como funciona

1. **Login**: O usuário faz login com credenciais UFMG. O worker repassa ao IdP da UFMG e devolve o cookie `LtpaToken2`.
2. **Grade**: Com o token, o worker consulta a API do SIGA (`WsMatriculas`) via WebSocket para buscar as matérias do semestre.
3. **Salas**: O worker cruza cada matéria/turma/horário com os dados do KV (mantidos atualizados pelo cron de scraping) para encontrar a sala.
4. **Frontend**: Exibe a grade completa com as salas.

## Tecnologias

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Cloudflare Workers, KV, Cron Triggers

## Licença

MIT
