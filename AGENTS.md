# CM8 Resumos — regras do projeto para agentes de código

## Plataforma: sempre HTML nativo

- **Preservar o frontend 100% como página estática**, usando HTML semântico, CSS e JavaScript nativo (vanilla JS).
- **Não migrar para React, Vue, Angular, Svelte, Next.js, SPA framework, canvas ou outra plataforma de interface.** Não criar etapa obrigatória de build para GitHub Pages.
- `index.html` é a entrada da aplicação. `assets/progress-io.js`, `sw.js` e o manifesto pertencem ao PWA estático e não exigem runtime de servidor.
- Manter URLs relativas (GitHub Pages é publicado sob `/cm8resumos/`). Preservar a leitura de backups XML e JSON legado.
- Para conteúdo médico, a fonte da verdade é `data/flashcards.json`. **Não reescrever o conteúdo médico, doses, referências, IDs ou metadados durante tarefas **apenas de formatação**. Revisões clínicas explícitas podem modificar cartões, desde que com fontes documentadas e testes de integridade.**
- Para tornar respostas mais claras, modificar exclusivamente sua apresentação no DOM: parágrafos `<p>`, seções `<section>`, cabeçalhos `<h4>`, listas `<ol>`/`<ul>`/`<li>`, links `<a>` e fórmulas com `<sup>`/`<sub>`. Escapar sempre o texto de usuário e preservar a informação original.
- O formato dos 240 casos clínicos mantém cenário, pergunta e resposta distinguíveis. Preservar os avisos e fontes de auditoria médica.
- Respeitar WCAG, teclado, áreas de toque de 44px, tema claro/escuro, movimento reduzido e layout responsivo. Não impor efeitos visuais incompatíveis com estudo prolongado.
- Verificar renderização e regressões nos perfis desktop Chromium, Android Chromium emulado e iOS WebKit emulado via `npm test`. O npm/Playwright é só ferramenta de desenvolvimento; não integra o site publicado.
- A publicação é responsabilidade do GitHub Pages. Não mesclar um PR de UI com testes vermelhos.

## Critério de aceite

Cada modificação de formatação deve preservar a contagem corrente de **1206 cartões**, **31 temas**, **240 casos clínicos** e os IDs originais, exceto quando a tarefa envolver explicitamente edição do conteúdo ou reorganização temática. Comparar o JSON de origem antes e depois byte a byte, quando a alteração for apenas visual.
