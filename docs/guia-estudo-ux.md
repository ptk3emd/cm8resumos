# Guia de estudo e diretrizes de UX · CM8

Esta revisão mantém **HTML/CSS/JavaScript nativo**, os dados médicos e os backups intactos. Referências de processo: [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) e [Impeccable](https://github.com/pbakaus/impeccable) (clarify, adapt, harden, polish).

## Guia rápido do estudante

- **Estudado / Revisar manualmente**: marcações organizacionais. Não atribuem nota nem agendam revisão FSRS.
- **Registrar leitura**: contador independente por cartão, incrementado somente quando se aciona o controle de leitura; não é equivalente a "Estudado".
- **Revisão FSRS**: revele a resposta, avalie a recordação e deixe o agendador calcular a próxima revisão. O histórico FSRS não é o contador manual.
- **Práticas cognitivas**: exercícios experimentais de contraste, essência ou transferência, com métricas próprias. A política padrão do FSRS continua independente quando a extensão está desativada.

As duas áreas são preservadas e reformuladas, **antes dos filtros e dos flashcards**: o disclosure **"Marcações manuais · como funcionam as contagens"** apresenta um resumo compacto e quatro explicações independentes; o painel **"Explorar temas, estatísticas e práticas"** contém o mapa com 31 temas, as práticas cognitivas e os indicadores originais. Ambos abrem com teclado/toque, anunciam seu estado pelo elemento nativo `details` e preservam a escolha local de expansão.

## Critérios de aceitação desta auditoria

1. **Navegação**: exibir temas 01–31 em ordem numérica no índice, no mapa e no seletor móvel. Conservar IDs, títulos e a fonte de dados original.
2. **Modo escuro**: textos secundários, campos, chips, indicadores e controles devem ser legíveis. Teste automatizado calcula contraste WCAG para elementos representativos (meta **4,5:1** para texto comum), mas não equivale a certificação WCAG do site.
3. **Filtragem**: limpar o texto da busca não redefine o nível. Em um tema, um resultado vazio oferece limpeza de filtros sem mudar o tema selecionado. As marcações FSRS não se alteram.
4. **Carregar mais**: após acrescentar cartões, levar o foco ao primeiro enunciado novo e rolar até ele (respeitando movimento reduzido).
5. **Mobile**: a faixa horizontal de estados tem setas reais de anterior/próximo, área de toque de 44px e mantém o filtro ativo no campo visível.
6. **Segurança de mudanças**: comparar `#sourceData` byte a byte com `main`, executar `npm test` nos projetos Chromium desktop, Chromium Android e WebKit iOS, manter PR isolado e não mesclar testes vermelhos.

## Resultado da exploração

O índice antes desta mudança mostrava temas 01–20, depois 26–31, depois 21–25; isso era a ordem de carregamento da fonte. A camada de apresentação agora organiza os temas numericamente sem regravar os IDs. Também foram substituídas as descrições extensas da página inicial por um guia de quatro tópicos e uma seção de ferramentas avançadas após os cartões.

### Limites

Os testes Playwright emulados não substituem validação visual em aparelhos físicos. A revisão de UI não altera doses, conteúdo clínico, auditoria médica, FSRS, contadores, importação ou exportação.


## Correção de regressão — 17/11/2026 · Impeccable overdrive / harden

O PR #25 ocultou excessivamente duas áreas que deveriam ter sido **reformuladas**, não deslocadas/renomeadas. Esta correção recupera as duas chamadas reconhecíveis acima dos filtros, sem banner permanente e sem competir com as ações principais. Os detalhes usam hierarquia textual, alvos de toque confortáveis, foco visível, ícones de expansão por CSS (sem ícones decorativos ambíguos), e estados abertos persistidos defensivamente no navegador. A área avançada mantém os IDs e handlers preexistentes; o mapa também reabre seu contêiner quando sua expansão foi salva e não houve escolha explícita de fechar a exploração.

### Invariantes

- Os cinco filtros de situação e seus contadores continuam independentes do contador de leituras e do FSRS.
- O JSON `#sourceData` é idêntico ao da `main`; nenhuma classificação, dose, ID ou resposta clínica foi reescrita.
- São mantidas a semântica nativa `summary/details`, a navegação por teclado, a responsividade, o modo escuro e a opção de movimento reduzido.
- O cache do PWA foi versionado para disponibilizar a interface corrigida após atualização.
- Os testes Playwright cobrem localização dos painéis, abertura por teclado, persistência de expansão, conteúdo preservado, contraste no dark mode e visibilidade do mapa. As verificações locais completas dependem de um ambiente com Playwright instalado; confira o CI antes de mesclar.

## Passe de acabamento — Impeccable polish

- A apresentação foi alinhada ao sistema editorial Figma × Notion existente: tipografia consistente, espaçamentos de 4/8/12/16/24px, cores semânticas e contornos discretos.
- As quatro explicações de contagem deixam de parecer quatro cartões encaixados em outro cartão: agora usam divisórias e duas colunas no desktop, com uma única coluna no celular.
- As duas áreas continuam identificáveis antes da pesquisa e dos cartões. A versão compacta do título de marcações evita que os controles se tornem desproporcionalmente altos no celular.
- Nos telefones, a descrição secundária dos resumos é omitida visualmente, mas o texto de ajuda continua disponível dentro do painel. Os próprios títulos e indicadores de expansão permanecem visíveis.
- Correção de regressão verificada no CI anterior: o primeiro flashcard chegava a **1182 px (Android Chromium)** e **1175 px (iOS WebKit)**, ultrapassando o limite de 1100 px. Os painéis foram compactados sem reduzir alvos interativos abaixo de 44px; o teste existente `study-refinements.spec.mjs` continua exigindo a mesma altura máxima.
- Nova verificação Playwright mede ausência de overflow horizontal em 320/768/1280 px, altura dos resumos e posição do primeiro cartão nos perfis móveis. Validar novamente no CI do PR antes do merge.
