# 📋 PROJECT BRIEF: AgroScan

**Data:** 21-05-2026
**Time:** 🎯 PM, 🏛️ Arq. Chefe, ⚙️ Eng. Backend, 🛡️ Segurança, 📊 Dados, 🚀 Growth, 👤 Cliente, 💰 Financeiro

---

## PARTE 1 — Contexto Completo do Projeto

**1. Visão do Produto**
Democratizar a agricultura de precisão transformando o smartphone de cada trabalhador rural em um agrônomo digital. Detectar problemas na safra (doenças/pragas) antes que eles se tornem prejuízos, utilizando visão computacional e geolocalização.

**2. Usuário Primário**
- *No Campo:* Trabalhador rural/Campeiro (dor: identificar problemas complexos nas folhas).
- *No Escritório:* Dono da Fazenda/Agrônomo (dor: falta de visibilidade em tempo real da saúde da safra).

**3. Proposta de Valor**
Redução imediata no custo de defensivos agrícolas (aplicação variável) e prevenção de quebra de safra por diagnóstico tardio.

**4. MVP — Escopo Mínimo**
1. App Mobile com captura de foto offline e registro de coordenadas GPS.
2. Motor de IA (Python) treinado para detectar 3 doenças core (ex: Ferrugem da Soja).
3. Dashboard Web para visualização de "Focos de Calor" das ocorrências no mapa da fazenda.
4. Sincronização inteligente (Sync de dados quando houver Wi-Fi/4G).

**5. Métrica North Star**
Área total (hectares) monitorada com registros validados pela IA.

**6. Stack Tecnológica**
- **SaaS Core:** PHP/Laravel (Gestão de dados espaciais e usuários).
- **AI Engine:** Python/FastAPI (Inferência e processamento de imagem).
- **Mobile:** React Native (Facilidade de acesso a hardware de câmera/GPS).
- **Dados:** PostgreSQL + PostGIS (Mandatório para cálculos de mapas de calor).

**7. Arquitetura Inicial**
Híbrida. App sincroniza imagens com o Core (Laravel), que despacha para o Motor de IA (FastAPI). Resultados retornam para o Dashboard Geográfico.

**8. Modelo de Monetização**
SaaS B2B: Assinatura por hectare monitorado por ano.

**9. Canal de Validação Inicial**
Cooperativas de produtores no Mato Grosso e Paraná (piloto com 5 fazendas).

**10. Requisitos Mínimos de Compliance**
Privacidade de dados de geolocalização da fazenda (dado sensível de concorrência).

**11. Riscos Assumidos Conscientemente**
- Conectividade precária no campo exigirá UX offline impecável.
- Variabilidade de luz/câmera pode afetar precisão da IA no início.

**12. Roadmap Sugerido**
- **Fase 1 (MVP):** Detecção de 3 pragas/doenças na cultura de Soja.
- **Fase 2:** Integração com telemetria de trator para aplicação automatizada.
- **Fase 3:** Marketplace de insumos baseado na necessidade real detectada.

---

## PARTE 2 — Prompt de Criação para o Claude Code

```prompt
Você é o Orquestrador (PM) do time Creative Team - Holding Modular.
O projeto atual é o AgroScan, uma plataforma de AgTech para detecção de pragas via Visão Computacional.

**Visão:** Transformar smartphones em ferramentas de diagnóstico fitossanitário.
**Stack:** PHP/Laravel (Core), Python/FastAPI (IA), React Native (App), PostgreSQL/PostGIS.

**Sua missão agora:**
Inicie o scaffold da infraestrutura geográfica do projeto.
1. Crie a estrutura básica do `/backend-core` (Laravel) preparando as migrations com suporte a `geography` do PostGIS.
2. Antes de codar, rode `/discuss_comite Modelagem de Dados Espaciais e Estratégia Offline-First` para alinhar como as coordenadas das fotos serão tratadas no banco e como o app funcionará sem internet.
```