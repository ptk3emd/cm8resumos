# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Estudantes de medicina no 8º período que estudam Clínica Médica para as provas da faculdade e também revisam para a prova de residência médica. O uso é individual, em sessões longas, alternando celular e notebook. O mesmo conteúdo precisa servir aos dois objetivos.

## Product Purpose
CM8 Resumos é uma biblioteca de flashcards de Clínica Médica: 1206 cartões em 31 temas, incluindo 240 casos clínicos. O estudante lê, marca o que estudou ou precisa revisar e faz revisão espaçada (FSRS). Ter sucesso é conseguir estudar todos os dias sem atrito, encontrar rapidamente qualquer assunto e confiar no estado do próprio progresso.

## Positioning
Material produzido a partir do PDF "Flashcards — 8º Período · CMN", com auditoria clínica cartão a cartão registrada no próprio conteúdo. Cada cartão diz se foi revisado clinicamente ou só triado.

## Operating Context
- Estudo diário com revisão FSRS (fila de vencidos e novos), modos Lista, Foco e Revisão FSRS, registro de leituras e práticas cognitivas opcionais.
- Busca por pergunta, resposta, tema ou ID do cartão.
- O progresso fica no navegador; backup e restauração por XML, com leitura de JSON legado.

## Capabilities and Constraints
- Site estático em HTML, CSS e JavaScript nativos, publicado no GitHub Pages sob `/cm8resumos/`. Sem framework e sem etapa de build (AGENTS.md).
- PWA com cache offline; URLs relativas.
- Fonte da verdade médica: `data/flashcards.json`. Tarefas de formatação não alteram conteúdo, doses, referências, IDs nem metadados; comparar o arquivo byte a byte.
- Casos clínicos mantêm cenário, pergunta e resposta distinguíveis.
- `npm test` (Playwright) cobre desktop Chromium, Android Chromium e iOS WebKit emulados. Não mesclar UI com testes vermelhos.

## Brand Commitments
- Nome: CM8 Resumos / Biblioteca de flashcards.
- Referência visual vinculante: `DESIGN.md` (sistema inspirado no Notion), confirmada pelo usuário para aplicação estrita.

## Evidence on Hand
- `data/flashcards.json`: conteúdo e status de auditoria de cada cartão.
- `auditorias/`, `audits/`: registros de auditoria clínica.
- Não existem depoimentos, métricas de uso ou validação externa. Não inventar.

## Product Principles
1. **Avisos de auditoria nunca somem.** Cartões não validados clinicamente mostram isso, e o produto nunca se apresenta como fonte clínica definitiva.
2. **O conteúdo vem antes da interface.** O cartão e a pergunta são o centro; os controles servem ao estudo e não competem com ele.
3. **O estado é confiável.** Marcações, fila FSRS e backups dizem a verdade e nunca se perdem silenciosamente.
4. **Estudo prolongado.** Nada que canse ou distraia em sessões longas.

## Accessibility & Inclusion
WCAG AA de contraste nos temas claro e escuro, navegação completa por teclado, alvos de toque de 44px, respeito a `prefers-reduced-motion` e layout responsivo de 320px a desktop (AGENTS.md).
