# CM8 · progresso XML, backups e PWA

**Coleção atual (16/11/2026): 1202 flashcards, 31 temas, 254 cartões de casos clínicos.** A área de Hemato-oncologia/Emergências foi reorganizada em sete temas, cada um com níveis 1–3 e casos de aplicação. As fichas editoriais e fontes estão em `auditorias/2026-11-16/hemato-onco/`. Outros 24 temas preservam seus cartões e IDs. As seções abaixo documentam versões e auditorias anteriores.


## Importar / exportar
O formato oficial é XML versão 1, validado com `DOMParser` e regras equivalentes ao esquema em `schema/progress-v1.xsd`. Arquivos XML malformados, com DOCTYPE, elementos ou atributos desconhecidos, IDs repetidos, status inválido ou entradas sem marcação são rejeitados **antes** de substituir o progresso. O usuário confere a contagem e confirma a substituição. Arquivos JSON exportados pela versão anterior continuam aceitos. A exportação agora é somente XML.

Dados clínicos, respostas e IDs dos 970 cartões não são alterados. O backup armazena apenas status, favoritos e ocultação.

## Offline / PWA
O `sw.js` guarda o HTML de estudo (incluindo os 970 cartões), o parser XML e ícones após a primeira visita online bem-sucedida em HTTPS. O manifesto usa caminhos relativos à raiz do projeto, compatíveis com GitHub Pages em `/cm8resumos/`. Quando a rede falha, o documento é servido do cache. As atualizações de HTML são buscadas online e substituem o cache; os dados de progresso continuam em `localStorage`.

**Limitação:** modo privado, bloqueio de armazenamento e limpeza de dados do navegador podem remover o cache e o progresso. O PWA não sincroniza dados entre dispositivos; para isso use o backup XML. A instalação/offline exige primeiro abrir a página online.

## Testes
`npm install`, `npx playwright install chromium webkit`, `npm test` e `npm run test:mobile` em máquina com Node. No GitHub Actions, o smoke test simula Safari/iPhone com WebKit e Chrome/Pixel com Chromium — **não equivale a teste em aparelhos físicos**.

A publicação da página continua estática, sem build em tempo de execução. `package.json` e testes são exclusivamente para desenvolvimento/CI.

## Auditoria de design e experiência · 15/11/2026

Escopo: Lista, Foco e Revisão FSRS. Referências: documentos enviados **Design System Inspired by Figma** e **Design System Inspired by Notion**. A auditoria compara a [main em `fa80550`](https://github.com/ptk3emd/cm8resumos/tree/fa805503979309c4c1f3a59329d5c1e3b0dfeb75) com a [revisão de design em `c01a386`](https://github.com/ptk3emd/cm8resumos/tree/c01a3867bf8e412bc47851e71a9367c15bbc355a). O PR #5 foi mesclado antes dos commits posteriores na branch.

### Auditoria técnica

| Dimensão | Main | Revisão | Evidência |
| --- | ---: | ---: | --- |
| Acessibilidade | 2/4 | 3/4 | Na main o foco volta ao body ao revelar. A revisão leva o foco à resposta. Rótulos de estatísticas ainda medem 10 px a 320 px. |
| Desempenho | 3/4 | 3/4 | A captura por largura mostrou navegação funcional. Sem perfil de CPU ou métricas em hardware lento. |
| Tema | 2/4 | 3/4 | A revisão usa tokens da interface nos controles e no painel FSRS. |
| Responsividade | 2/4 | 3/4 | Sem estouro horizontal nas larguras medidas. Na main o seletor de modo mede 37 px de altura a 1280 px. Na revisão mede 44 px. |
| Integridade | 2/4 | 3/4 | A revisão corrige a cota e aproxima a sessão do cartão. O estado vazio ainda confunde filtro e vencimento. |
| **Total** | **11/20** | **15/20** | Pontuação de revisão manual, sem certificação de acessibilidade. |

O detector Impeccable retornou oito avisos em cada versão: quatro textos funcionais pequenos, um alerta de tipografia de 9 px, dois espaçamentos junto à divisória de estatística e um aviso sobre Inter. A família Inter é uma decisão coerente com a referência Notion. Confirmado em renderização: estatísticas de 10 px a 320 px. O aviso genérico de 9 px não foi atribuído a um controle específico. A crítica foi conduzida em um único contexto com inspeção de código, detector e screenshots Playwright, sem overlay. Larguras de 320 e 1280 px no Chromium. WebKit, hardware físico e leitor de tela ficaram fora da rodada.

### Crítica à luz das referências

- **Figma** orienta os controles arredondados, o seletor de modo ativo e o contorno tracejado. A revisão já aplica essa linguagem à navegação entre os três modos. Os metadados podem ser compactos, com tamanho suficiente para leitura.
- **Notion** orienta superfícies neutras quentes, divisórias finas, azul na ação primária e hierarquia tipográfica. A resposta clínica e os selos de auditoria já têm boa separação. O resumo introdutório e os controles da biblioteca ainda competem com o primeiro cartão, sobretudo em Lista e Foco. Em 320 × 850 px, as perguntas começam em y=1094 e y=1032, respectivamente.
- **Decisão de convivência**: usar o foco tracejado de Figma com cor acessível do tema e manter o azul funcional de Notion. A composição é de estudo. Gradientes e escala de títulos de marketing ficam fora do escopo.
- **Carga cognitiva**: a revelação e as quatro notas em grade são claras. A biblioteca combina busca, filtros, modos, estatísticas e ações antes da pergunta. No FSRS, o filtro “Ocultos” pode levar a “Revisões em dia”, sem explicar a incompatibilidade. O rótulo “Revisar” também aparece nas marcações manuais e pode ser confundido com vencimentos do agendador.

### Backlog para a correção

| Prioridade | Correção | Aceite |
| --- | --- | --- |
| P1 | Trazer para a main as correções de fila, foco e histórico da branch existente após revisar o diff. | Após uma avaliação, limite 0 oferece 0 novos e persiste ao recarregar. Testar retorno no vencimento sem recarga e foco na resposta. Na main, reproduzidos 968 novos com limite 0 e perda de foco para o body. Na revisão, cota e foco confirmados corrigidos. |
| P2 | Diferenciar fila concluída, ausência de resultados por filtro e cota de novos esgotada. Ajustar o filtro “Ocultos” no FSRS. | “Revisões em dia” só aparece quando descrever a situação. Uma combinação de filtros sem cartões informa a causa e oferece limpar filtros. |
| P2 | Priorizar o cartão ao entrar em Foco e reduzir a competição entre estatísticas e filtros na Lista. | Em 320 px, a ação de entrada em Foco leva ao enunciado. O fluxo por Tab acompanha a ordem visual e não pula a vinheta. |
| P2 | Subir os rótulos das estatísticas para pelo menos 12 px e ajustar o respiro junto à divisória. | Estados e contagens permanecem legíveis em 320 px e zoom de 200%, com controles principais de pelo menos 44 px de altura. |
| P3 | Usar nomes de estado que diferenciem marcação manual e agendamento FSRS. | O usuário identifica o que é marcação manual, cartão vencido e cartão novo em leitura rápida. |

Sequência sugerida: validar integração da branch, executar `$impeccable harden` para fila e estados vazios, `$impeccable layout` e `$impeccable clarify` para entrada e controles, e `$impeccable polish` para fechar. A correção deve preservar o HTML semântico e o conteúdo dos 970 cartões, concentrando mudanças da aplicação em `index.html`.
