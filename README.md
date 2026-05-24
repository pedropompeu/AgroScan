# AgroScan

![PHP](https://img.shields.io/badge/PHP-8.4-777BB4?logo=php&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

Plataforma de AgTech para detecção de pragas e doenças em lavouras via visão computacional. Transforma o smartphone do trabalhador rural em um agrônomo digital com funcionamento offline e diagnóstico por IA.

---

## Arquitetura

```
                    ┌─────────────────┐
                    │  Mobile App      │  React Native
                    │  (offline-first) │  Câmera + GPS
                    └────────┬────────┘
                             │ sync (Bearer token)
                    ┌────────▼────────┐       ┌──────────────┐
                    │  Backend Core   │──────▶│  MinIO (S3)  │
                    │  Laravel 11     │       │  Imagens     │
                    │  :8000          │       │  :9000/:9001 │
                    └────────┬────────┘       └──────────────┘
                    /api/    │ POST /analyze-async
          ┌─────────┘        │            ┌──────────────────┐
          │         ┌────────▼────────┐   │  PostgreSQL      │
          │         │  Backend AI     │   │  + PostGIS       │
  ┌───────▼──────┐  │  FastAPI        │   │  :5435           │
  │  Dashboard   │  │  PlantVillage   │   └──────────────────┘
  │  React + Map │  │  :8001          │
  │  :3000       │  └─────────────────┘
  └──────────────┘
```

---

## Stack

| Serviço | Tecnologia | Porta |
|---|---|---|
| Backend Core | Laravel 11 + PHP 8.4 + PostGIS | 8000 |
| Motor de IA | FastAPI + Python 3.12 + HuggingFace | 8001 |
| Dashboard Web | React 18 + TypeScript + Nginx | 3000 |
| Storage | MinIO (S3-compatível) | 9000 / 9001 |
| Banco de Dados | PostgreSQL 15 + PostGIS | 5435 |
| App Mobile | React Native 0.73 | — |

---

## Pré-requisitos

- **Docker** >= 24 e **Docker Compose** >= 2.20
- **Node.js** >= 18 — somente para desenvolvimento local do dashboard ou do app mobile
- **Android Studio** ou **Xcode** — somente para rodar o app mobile

---

## Subindo com Docker

Este é o caminho principal. Todos os serviços sobem com um único comando.

```bash
# 1. Clonar o repositório
git clone https://github.com/pedropompeu/AgroScan.git
cd AgroScan

# 2. Criar o .env do backend a partir do exemplo
cp backend-core/.env.example backend-core/.env

# 3. Build e inicialização de todos os serviços
docker compose up -d --build

# 4. Gerar a APP_KEY do Laravel
docker exec agroscan_app php artisan key:generate

# 5. Rodar as migrations e criar o usuário padrão
docker exec agroscan_app php artisan migrate --seed
```

> **Atenção — primeira execução:** o serviço `backend-ai` baixa o modelo de IA do HuggingFace (~1.5 GB) na primeira vez que é iniciado. As execuções seguintes usam o cache do volume `ai_model_cache` e sobem normalmente. Acompanhe com `docker compose logs -f backend-ai`.

---

## Acessando os Serviços

| Serviço | URL | Credenciais |
|---|---|---|
| Dashboard Web | http://localhost:3000 | `admin@agroscan.com` / `password` |
| API Laravel | http://localhost:8000 | Bearer token via `/api/auth/login` |
| Documentação da IA | http://localhost:8001/docs | — |
| MinIO Console | http://localhost:9001 | `minio_user` / `minio_pass123` |
| PostgreSQL | `localhost:5435` | `usuario` / `password123` |

---

## Endpoints Principais da API

Todas as rotas abaixo requerem o header `Authorization: Bearer <token>` obtido no login.

```
POST   /api/auth/login              Autenticar e obter token
POST   /api/auth/logout             Revogar token

GET    /api/farms                   Listar fazendas do usuário
POST   /api/farms                   Criar fazenda (nome + boundary GeoJSON)
GET    /api/farms/{id}              Detalhe da fazenda + estatísticas de doenças
PUT    /api/farms/{id}              Atualizar fazenda
DELETE /api/farms/{id}              Remover fazenda

POST   /api/scoutings/sync          Sincronizar monitoramentos do mobile
GET    /api/scoutings               Listar ocorrências
GET    /api/scoutings/heatmap       Dados do mapa de calor (PostGIS)

POST   /api/storage/presigned-url   Gerar URL de upload para o MinIO/S3
```

---

## Rodando os Testes E2E

Com o stack em execução:

```bash
# Teste do fluxo completo: sync → IA → callback → validação
python test_e2e_flow.py

# Teste de detecção multiclasse com 5 registros
python test_expansion_flow.py
```

---

## App Mobile (React Native)

O app requer emulador Android ou dispositivo físico.

```bash
cd mobile-app
npm install

# Android
npm run android

# iOS
npm run ios
```

O app aponta para `http://10.0.2.2:8000` por padrão, que é o IP do host no emulador Android. Para dispositivo físico, substitua pelo IP da sua máquina na rede local.

---

## Desenvolvimento Local do Dashboard (sem Docker)

```bash
cd dashboard
npm install
npm run dev   # disponível em http://localhost:5173
```

---

## Variáveis de Ambiente

As variáveis críticas já vêm pré-configuradas para o ambiente Docker. Para produção ou ambientes personalizados:

| Variável | Descrição |
|---|---|
| `AI_ENGINE_URL` | URL interna do motor de IA (`http://backend-ai:8001`) |
| `AI_CALLBACK_SECRET` | Secret compartilhado entre Laravel e FastAPI para o callback de resultados |
| `AWS_ENDPOINT` | Endpoint do MinIO ou S3 (`http://minio:9000` para Docker local) |
| `AWS_USE_PATH_STYLE_ENDPOINT` | Deve ser `true` para MinIO, `false` para AWS S3 real |
| `AWS_BUCKET` | Nome do bucket (`agroscan`) |

---

## Comandos Úteis

```bash
# Acompanhar logs do motor de IA (inferência do modelo)
docker compose logs -f backend-ai

# Reiniciar apenas o backend Laravel
docker compose restart app

# Reset completo do banco de dados
docker exec agroscan_app php artisan migrate:fresh --seed

# Parar todos os serviços e remover volumes
docker compose down -v
```

---

## Roadmap

- **Fase 1 (MVP atual):** Detecção de 3 doenças na cultura de Soja via app mobile
- **Fase 2:** Integração com telemetria de trator para aplicação automatizada de defensivos
- **Fase 3:** Marketplace de insumos baseado na necessidade real detectada
