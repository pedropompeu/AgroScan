# ADR 001: Modelagem Espacial e Estratégia Offline-First

**Status:** Aprovado
**Data:** 23-05-2026
**Participantes:** Comitê de Arquitetura

## Contexto
O AgroScan exige alta precisão geográfica e funcionamento em áreas sem conectividade.

## Decisões
1. **Banco de Dados:** PostgreSQL + PostGIS (Core), SQLite (Mobile).
2. **Identificadores:** Uso de UUID v7 para PKs para permitir geração offline sem colisões.
3. **Sincronismo:** Protocolo baseado em JSON Batch com timestamps de controle (last_sync_at).
4. **Imagens:** Upload via S3 Presigned URLs com suporte a Multipart para resiliência.

## Consequências
- Aumento na complexidade do mobile para gerenciar o estado local.
- Necessidade de extensões específicas no Laravel para lidar com UUID v7 e PostGIS de forma fluida.
