# Navegação · revisão UI/UX Pro Max + Impeccable

## Escopo
Correção incremental da interface estática `index.html`, sem framework, build obrigatório ou bibliotecas extras. Referências: [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (navegação hierárquica, estado ativo, links diretos, Voltar previsível, touch e acessibilidade) e [Impeccable](https://github.com/pbakaus/impeccable) (`critique`, `adapt`, `harden`, `clarify` e `polish`).

## Problemas de navegação identificados no código anterior
- **P1 · Histórico ausente:** a troca de tema e modo alterava só `ui.topic`/`ui.mode`; a URL permanecia igual e Voltar não restaurava a localização.
- **P1 · Descoberta móvel:** 31 temas e “Todos” estavam apenas em uma faixa horizontal, exigindo muitas rolagens sequenciais, embora houvesse busca textual de temas.
- **P2 · Orientação na leitura:** a mudança de tema via barra lateral rolava para o conteúdo só no viewport móvel; a entrada em outra seção no desktop podia deixar o leitor sem o título.
- **P2 · Navegação sequencial:** não havia ação contextual anterior/próximo tema; o usuário precisava voltar ao índice.
- **P2 · Fechamento por teclado:** os painéis móveis de temas/filtros não tinham fechamento explícito via Escape com retorno de foco.

## Correções
1. Tema e modo entram em parâmetros de URL opcionais: `?topic=4&mode=focus`; o estado inicial hidrata a interface, e `popstate` restaura a navegação. Histórico não registra digitação na busca, avaliações FSRS nem movimento entre cartões, e âncoras de respostas continuam intactas.
2. Navegação entre temas centralizada em `selectTopic()`, com rolagem e foco no título depois da troca em qualquer largura.
3. Seletor nativo de temas no painel móvel, em paralelo à faixa horizontal existente — o gesto e as setas anteriores permanecem disponíveis.
4. Anterior/próximo tema com indicador “Tema N de 31”, controles mínimos 44px e extremos desabilitados.
5. Escape fecha temas/filtros no móvel, atualiza `aria-expanded` e devolve o foco ao botão.
6. Versão do cache do PWA atualizada para o novo shell.

## Integridade e validação
- `sourceData` (conteúdo, IDs e metadados médicos) comparado byte a byte com `main`, sem mudanças.
- Sem alteração em `assets/cognitive.js`, `assets/progress-io.js`, FSRS, contadores ou estrutura de backups.
- Testes Playwright adicionados para navegação por histórico, links diretos, seletor móvel, Escape e âncoras internas, em Chromium desktop/Android emulado/WebKit iOS emulado.
- Executar `npm test` e revisar o CI **antes de mesclar**. Emulação não substitui teste em iPhone/Android físico.

## Riscos a observar em QA
- Fluxo de voltar/avançar no histórico do Safari e atalhos do navegador.
- Várias mudanças de tema durante uma revisão FSRS em andamento.
- Nomes longos de temas e orientação paisagem de telas pequenas.
- Cache do PWA após atualização de versões existentes.
