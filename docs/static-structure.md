# Estrutura estática e entrada de estudo

A entrada continua sendo `index.html`, servida diretamente pelo GitHub Pages em `/cm8resumos/`. Não há framework, compilação, API ou servidor de aplicação.

- `assets/app.css`: estilos, tokens claros/escuros e regras responsivas; inclui o contador de leituras, antes injetado por JavaScript.
- `assets/app.js`: interface e inicialização assíncrona da biblioteca.
- `assets/fsrs.js`: biblioteca FSRS já distribuída no projeto, extraída sem alteração do código original e de sua licença.
- `assets/cognitive.js` e `assets/progress-io.js`: práticas e leitura/gravação dos backups existentes.
- `data/flashcards.json`: única fonte de conteúdo médico, copiada byte a byte do antigo `sourceData`.
- `sw.js`: pré-cache de HTML, CSS, JavaScript, JSON, manifesto e ícones para uso offline após a primeira visita completa.

O JSON mantém 1.206 cartões, 31 temas e 240 casos, com SHA-256 `b14362b069985d9ae1c01b02e3ee5c8ef521f5a0269f9e15fcc0aa3abb0526df`. IDs, doses, respostas, auditorias e metadados não foram reescritos. A referência à fonte em AGENTS.md acompanha a extração; os números foram alinhados à biblioteca efetivamente existente.

Para testar localmente, sirva a pasta por HTTP, por exemplo `python3 -m http.server 4173`. Abrir o arquivo por `file://` não oferece o ambiente de fetch/service worker necessário ao PWA. npm/Playwright continuam sendo apenas ferramentas de desenvolvimento.

## Carregamento e preservação de dados

A página informa o carregamento e bloqueia a área de estudo até o JSON estar disponível. Uma falha de rede ou leitura apresenta “Tentar novamente”; não apaga nem regrava o progresso. A inicialização registra o service worker mesmo quando o evento `load` já ocorreu. Caminhos são resolvidos relativamente ao arquivo da aplicação.

As chaves de localStorage e o banco IndexedDB FSRS permanecem os mesmos. Exportação XML, JSON legado, leituras, edições e desfazer avaliação mantêm os formatos existentes. `window.CM8Source` expõe o conteúdo carregado para inspeção e testes; a aplicação trabalha com cópias ordenadas dos arrays.

## Layout e polish

O documento `DESIGN.md` contém a referência Notion fornecida pelo usuário. A aplicação usa seus neutros quentes, azul pontual, bordas leves, controles com raio de 4px e hierarquia tipográfica, com espaçamento adequado ao estudo.

A entrada prioriza título/contexto, Revisar agora, Foco, totais compactos e biblioteca. Leituras e cartões distintos avaliados no FSRS continuam visíveis. Avaliações totais, atividade diária, marcações manuais e explicações ficam em “Estatísticas e guia”; mapa, práticas e indicadores ficam em “Mapa e práticas”. Os detalhes são acessíveis por teclado e começam recolhidos, inclusive para quem possuía preferências antigas de expansão. Essas preferências não são apagadas e o estado interno do mapa é preservado. Iniciar uma sessão também recolhe as ferramentas.

No celular, “Escolher tema” fica junto aos filtros, sem uma segunda cópia da mesma ação no cabeçalho. O seletor mantém foco, Escape, setas e navegação por todos os temas. O cabeçalho usa ícones SVG legíveis nos controles de backup e tema.

Os testes clínicos consultam agora a biblioteca carregada em vez de um JSON incorporado ao HTML. Testes de separação verificam a integridade byte a byte, os arquivos no cache, falha/repetição de carregamento e entrada compacta com preferências antigas. O teste de origem indisponível também cobre publicação sob `/cm8resumos/`.
