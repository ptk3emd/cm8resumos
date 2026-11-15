# CM8 Resumos — formatação pedagógica com Impeccable

A interface continua 100% HTML/CSS/JavaScript, pronta para GitHub Pages e sem framework ou build no navegador.

## Mapa da resposta

Um mapa é mostrado somente quando a resposta contém pelo menos duas seções **já rotuladas pelo texto original** e é suficientemente extensa para justificar navegação. Cada elemento do mapa é um link para o subtítulo daquele mesmo flashcard.

## Correlação visual

O renderizador reconhece somente palavras iniciais explícitas em títulos, por exemplo **Fisiopatologia**, **Diagnóstico**, **Conduta** ou **Cautela**, para aplicar um discreto acento visual correspondente no mapa e no bloco original. Não cria fatos, diagnósticos, vínculos causais, recomendações ou novos títulos médicos. Os demais assuntos permanecem neutros.

## Tipografia e acessibilidade

Parágrafos e listas HTML nativas, índice numerado decorativo (oculto dos leitores de tela), blocos semânticos e navegação por âncoras, visualização de uma coluna no celular, largura de leitura moderada, áreas de clique de 44px, tema escuro e impressão simplificada.

## Integridade e aceitação

- As **970 respostas**, os **25 temas**, os **250 casos clínicos** e seus IDs devem ser preservados.
- \`sourceData\` do HTML deve permanecer **byte a byte idêntico** para mudanças apenas visuais.
- A renderização é verificada contra o texto de origem de todos os cartões, desconsiderando apenas espaços e três fórmulas já apresentadas em HTML.
- Rodar \`npm test\` nos navegadores desktop Chromium, Android Chromium emulado e WebKit iOS emulado.
- Os testes emulados não equivalem à validação em aparelhos físicos.
