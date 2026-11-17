# Guia de estudo e diretrizes de UX · CM8

Esta revisão mantém **HTML/CSS/JavaScript nativo**, os dados médicos e os backups intactos. Referências de processo: [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) e [Impeccable](https://github.com/pbakaus/impeccable) (clarify, adapt, harden, polish).

## Guia rápido do estudante

- **Estudado / Revisar manualmente**: marcações organizacionais. Não atribuem nota nem agendam revisão FSRS.
- **Registrar leitura**: contador independente por cartão, incrementado somente quando se aciona o controle de leitura; não é equivalente a "Estudado".
- **Revisão FSRS**: revele a resposta, avalie a recordação e deixe o agendador calcular a próxima revisão. O histórico FSRS não é o contador manual.
- **Práticas cognitivas**: exercícios experimentais de contraste, essência ou transferência, com métricas próprias. A política padrão do FSRS continua independente quando a extensão está desativada.

O guia está disponível no disclosure **"Guia rápido de estudo"** próximo às estatísticas. As ferramentas avançadas permanecem disponíveis abaixo da área de flashcards, em **"Ferramentas avançadas"**, sem competir com o primeiro cartão.

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
