# LES — revisão médico-pedagógica (16/11/2026)

## Escopo
Revisão do tema 11 (**Lúpus Eritematoso Sistêmico**) em `index.html`, preservando os outros 30 temas e o front-end HTML/JS estático.

| Indicador | Antes | Depois |
|---|---:|---:|
| Cartões teóricos/complementares LES | 35 | 95 |
| Cartões de casos LES | 10 | 10 |
| Cartões nos níveis 1, 2, 3, 4, 5 | 5 por nível | 17 por nível |
| Cartões complementares | 10 | 10 |
| Média de caracteres por resposta teórica | 664 | 58 |
| Maior resposta teórica | 1.080 | 91 |
| Total de cartões no site | 1.146 | 1.206 |

## Política editorial
- **Uma pergunta e uma resposta curta por cartão.** Evitar listas heterogêneas e misturar diagnósticos, fisiopatologia e conduta.
- **Nível 1:** definições, critérios de entrada, sinais gerais, sorologia fundamental.
- **Nível 2:** nefrite lúpica por classe, biópsia, exames úteis e interpretação.
- **Nível 3:** hidroxicloroquina, corticoide, terapias poupadoras, metas de resposta renal.
- **Nível 4:** diferenciais de febre, infecção e atividade, citopenias, manifestações cardiopulmonares e articulares, emergências.
- **Nível 5:** gestação, nefrite refratária, anticoagulação em contexto de aPL e decisões com risco clínico.
- Redução de subtemas de baixa utilidade para provas: padrões raros do FAN, deficiência mendeliana isolada do complemento, paniculite/túmido, detalhes de shrinking lung e síndrome de ativação macrofágica.
- Recuperação de conceitos de alto rendimento: artropatia de Jaccoud, síndrome de Evans, endocardite de Libman–Sacks, alças em fio de arame, PTT e nefrite.
- Sintomas e exames isolados não estabelecem atividade, classe histológica ou indicação automática de imunossupressão. **Critérios EULAR/ACR 2019 são de classificação, não substituem diagnóstico clínico.**

## Integridade do progresso
Alguns IDs antigos foram mantidos quando representam um conceito clínico reconhecível, embora a pergunta tenha sido simplificada. Cartões semanticamente diferentes receberam IDs novos para evitar sobreposição evidente com revisões antigas; o progresso dos cartões removidos permanece no armazenamento local, mas não se associa a cartões inexistentes. Sem migração automática de progresso.

IDs originais sem correspondência ativa: `11.3.1`, `11.3.2`, `11.3.3`, `11.3.4`, `11.4.5`, `11.5.1`, `11.5.4`, `11.5.5`.

## Referências clínicas
- [ACR 2025 — LES, publicado em 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13711245/).
- [ACR 2024 — Nefrite lúpica, publicado em 2025](https://acrjournals.onlinelibrary.wiley.com/doi/10.1002/acr.25528).
- [EULAR/ACR 2019 — Classificação de LES](https://ard.bmj.com/content/78/9/1151).
- [ACR 2020 — Saúde reprodutiva](https://assets.contentstack.io/v3/assets/bltee37abb6b278ab2c/blt171087f2bde8b36c/acr-reproductive-health-guidelines-handouts.pdf).

## Validação
Amostra de conteúdo e estrutura revisada com fontes primárias; restrições verificadas: 17 cartões por nível, 10 complementares, 10 cartões de caso, perguntas/respostas <=120 caracteres, IDs únicos, 1.101 cartões dos demais temas sem alterações. Testes Playwright previstos em CI para Chrome e WebKit emulados. Recomenda-se revisão clínica humana antes de mesclar.
