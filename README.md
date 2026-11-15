# CM8 · progresso XML, backups e PWA

## Importar / exportar
O formato oficial é XML versão 1, validado com `DOMParser` e regras equivalentes ao esquema em `schema/progress-v1.xsd`. Arquivos XML malformados, com DOCTYPE, elementos ou atributos desconhecidos, IDs repetidos, status inválido ou entradas sem marcação são rejeitados **antes** de substituir o progresso. O usuário confere a contagem e confirma a substituição. Arquivos JSON exportados pela versão anterior continuam aceitos. A exportação agora é somente XML.

Dados clínicos, respostas e IDs dos 970 cartões não são alterados. O backup armazena apenas status, favoritos e ocultação.

## Offline / PWA
O `sw.js` guarda o HTML de estudo (incluindo os 970 cartões), o parser XML e ícones após a primeira visita online bem-sucedida em HTTPS. O manifesto usa caminhos relativos à raiz do projeto, compatíveis com GitHub Pages em `/cm8resumos/`. Quando a rede falha, o documento é servido do cache. As atualizações de HTML são buscadas online e substituem o cache; os dados de progresso continuam em `localStorage`.

**Limitação:** modo privado, bloqueio de armazenamento e limpeza de dados do navegador podem remover o cache e o progresso. O PWA não sincroniza dados entre dispositivos; para isso use o backup XML. A instalação/offline exige primeiro abrir a página online.

## Testes
`npm install`, `npx playwright install chromium webkit`, `npm test` e `npm run test:mobile` em máquina com Node. No GitHub Actions, o smoke test simula Safari/iPhone com WebKit e Chrome/Pixel com Chromium — **não equivale a teste em aparelhos físicos**.

A publicação da página continua estática, sem build em tempo de execução. `package.json` e testes são exclusivamente para desenvolvimento/CI.
