# Páginas e navegação

O site continua estático, sem framework, backend ou compilação obrigatória. As três entradas HTML são publicadas diretamente pelo GitHub Pages:

- `index.html`: cartões, busca, filtros, revisão FSRS, mapa e práticas.
- `estatisticas.html`: leituras registradas, cartões FSRS distintos, atividade diária, avaliações, marcações manuais e indicadores das práticas.
- `configuracoes.html`: tema, limite diário de cartões novos, backups XML/JSON FSRS, edições de texto e administração dos dados locais.

A mesma navegação usa links HTML reais: barra horizontal no desktop e barra inferior até 640px, com ícones SVG, rótulos, `aria-current="page"`, foco visível e alvos de pelo menos 44px. A barra móvel respeita a área segura do dispositivo; o documento reserva espaço para não encobrir seu último controle.

As páginas compartilham `assets/app.js`, `assets/app.css`, `assets/pages.css`, os módulos cognitivo/progresso e `data/flashcards.json`. O controlador existente utiliza elementos auxiliares no contêiner `#pageSupport[hidden]` para preservar os contratos de IDs; esse conteúdo não entra na ordem de foco nem na árvore acessível. Cada entrada mantém apenas seus controles e conteúdo relevantes na área principal. Alterações futuras no contrato de IDs devem considerar as três entradas.

Não há migração do progresso: as mesmas chaves de localStorage e o mesmo IndexedDB permanecem válidos. Os eventos de armazenamento sincronizam as abas abertas. Ações das estatísticas levam a URLs de estudo com `status` ou `practice`; a URL mantém tema, modo e filtro manual para recarregar ou navegar pelo histórico.

O service worker pré-armazena as três páginas e todos os recursos. Cada rota tem seu próprio fallback offline, incluindo navegação com query string. A visita a Configurações não substitui o HTML de Estudar no cache.

Os testes existentes de backup e preferências usam a página real de Configurações no mesmo contexto do navegador, mantendo Estudar aberta para também verificar sincronização entre páginas. Testes específicos cobrem rotas, navegação acessível, responsividade, estatísticas compartilhadas, confirmação de importação e fallback offline por página. O JSON médico é preservado byte a byte.
