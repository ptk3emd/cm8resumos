# Arquitetura cognitiva experimental do CM8

## Base preservada e estado da implementação

Esta alteração foi desenvolvida sobre `d34b6af` e integrada à main `a0b308e` (após os PRs #19, #20 e #21). Preserva byte a byte o `sourceData` vigente com **1.206 cartões, 31 temas e 240 casos**, incluindo a revisão de LES, assim como o bundle FSRS-7 já embutido. O contador manual do PR #21 permanece independente do status Estudado e do FSRS. Mantém o mapa, estatísticas clicáveis, busca com destaque, seletor de temas e filtros implementados no PR #17. Não restaura a versão anterior de 25 temas.

`assets/cognitive.js` contém funções puras e dados derivados. `index.html` integra essas funções à interface e à persistência. Não há dependência de runtime, rede para gerar perguntas, framework, servidor ou build obrigatório. Os exemplos e o grafo são derivados localmente; o service worker inclui o módulo no cache.

A opção **“Ativar arquitetura cognitiva experimental”** fica em Mapa de conteúdos → Práticas cognitivas. Começa desligada para não reprogramar silenciosamente um histórico existente. Desligar restaura retenção 0,90 nas avaliações futuras e interrompe a propagação; **não desfaz alterações já gravadas**. Para voltar integralmente a um histórico anterior, importe seu backup FSRS anterior. Contraste e contexto podem ser praticados independentemente da opção, porque não alteram o FSRS.

## Cinco inspirações, quatro camadas

| Inspiração | Decisão de engenharia | Limite da interpretação |
|---|---|---|
| Ausubel: organizadores e relações com conhecimento prévio | Hub por tema, pré-requisitos declarados, cartões-âncora | Um vínculo editorial não mede covariância entre memórias. +15%/+8% são parâmetros experimentais solicitados, não estimativas publicadas. |
| Fuzzy-Trace: representações verbatim e gist | `traceType`, metas por tipo e avaliação qualitativa do núcleo | Uma classificação de pergunta não observa diretamente traços mentais; a heurística precisa de revisão editorial. |
| Goldstone: aprendizagem perceptiva e discriminação | Correspondência simultânea entre perguntas e respostas confundíveis, a cada quatro avaliações do item | Acertar a associação não demonstra discriminação em uma situação clínica real. |
| Spiro: flexibilidade e transferência | Banco local de variações, selecionado ciclicamente para o mesmo ID agendado | As duas variações iniciais são um piloto limitado; não demonstram transferência distante nem abrangem todos os temas. |
| Brown, Collins e Duguid: cognição situada | Recuperação com o mapa e outros cartões disponíveis como pistas | Um mapa de flashcards não reproduz a atividade social/profissional de uma situação autêntica. |

Estas escolhas **não “superam” nem validam as teorias**. Os números e protocolos implementados são hipóteses de produto que precisam de avaliação empírica. Retenção estimada do FSRS e métricas de prática não são intercambiáveis.

Referências de enquadramento:

- Ausubel (1960), *The use of advance organizers in the learning and retention of meaningful verbal material*: https://doi.org/10.1037/h0046669
- Brainerd & Reyna (2001), *Fuzzy-trace theory: dual processes in memory, reasoning, and cognitive neuroscience*: https://pubmed.ncbi.nlm.nih.gov/11605365/
- Goldstone (1998), *Perceptual Learning*: https://doi.org/10.1146/annurev.psych.49.1.585
- Spiro et al. (1988), *Cognitive Flexibility Theory: Advanced Knowledge Acquisition in Ill-Structured Domains*: https://eric.ed.gov/?id=ED302821
- Brown, Collins & Duguid (1989), *Situated Cognition and the Culture of Learning*: https://people.ischool.berkeley.edu/~duguid/articles/Situated_Learning.htm
- API do motor utilizado: https://open-spaced-repetition.github.io/ts-fsrs/guide/scheduler/default-scheduler
- Limites entre modelo e políticas: https://open-spaced-repetition.github.io/ts-fsrs/guide/model/

## 1. Grafo e propagação

`graph(cards, state)` produz `cardId → {prerequisites, dependents, hubId}` e hubs `theme:1` a `theme:31`. Os hubs são agrupamentos, não cartões fictícios com histórico FSRS. `dependsOn` declara pré-requisitos do cartão; o grafo inverte essas arestas para construir os dependentes. A validação faz ordenação topológica iterativa e rejeita ciclos, autorreferências, IDs desconhecidos e metadados incompletos.

Após Good ou Easy, **antes de calcular o resultado FSRS do item avaliado**, a transação lê os registros atuais e calcula a propagação:

- Dependente direto: `S' = min(1.5 × S_base, S × (1 + 0.15 × peso))`.
- Outros cartões do mesmo hub quando a origem é âncora: fator 0,08.
- Se um cartão recebe ambas as relações, usa o maior fator, não soma os bônus.
- Pesos opcionais são maiores que zero e no máximo 1. Padrão 1.
- `S_base` é a estabilidade registrada após a última avaliação real desse dependente; o teto é cumulativo entre avaliações reais, evitando crescimento ilimitado por revisar a mesma âncora.
- Apenas cartões existentes em estado Review (2), com estabilidade positiva e data de última revisão, são elegíveis. Novos, Learning e Relearning não são artificialmente aprendidos ou retirados das etapas curtas.
- Recalcula o intervalo com `scheduler.nextInterval`, usando a memória já calculada e a meta do dependente. A data é ancorada na última revisão real. Não antecipa uma data já futura.
- Não altera dificuldade, estabilidade rápida, número de repetições, lapsos, data da última revisão ou logs de avaliação dos dependentes.
- Não propaga recursivamente: segue somente as arestas diretas e os filhos do hub solicitados. Ciclos são proibidos mesmo sem recursão.

A transação IndexedDB grava os dependentes e o resultado da avaliação da origem de forma atômica. Um erro aborta tudo. Conflitos entre abas e a cota diária de novos são verificados dentro dessa transação. O próximo evento de avaliação real reinicia o teto daquele cartão. `graphBonus` e `graphBaseStability` acompanham o registro no backup FSRS JSON.

**Critério de um dia:** o teste usa três dependentes maduros, verifica aumento de pelo menos um dia, teto e preservação de D/repetições/logs. Não é uma garantia para cartões arbitrários: um bônus percentual não implica um dia inteiro em intervalos curtos. O código não fabrica esse mínimo.

O exemplo editorial inicial é a âncora `26.1.1` (alterações da SLT), com três dependências explícitas (`26.1.2`, `.3`, `.4`) e os demais cartões do tema ligados pelo hub. Não se inferem automaticamente relações clínicas entre todos os cartões do baralho. O mapa mostra um elo nos cartões com dependentes ou âncora do tema escolhido.

## 2. Tipologia e retenção

A migração é derivada e idempotente; não reescreve o JSON médico original. Campos explicitamente declarados têm preferência. Casos/cenários → gist; cloze e definições curtas → verbatim; demais respostas curtas → verbatim e abertas → gist. Variações declaradas → transfer. A classificação fica em `cognitive.metadata` e é preservada pelo XML.

| Tipo | Meta experimental | Avaliação |
|---|---:|---|
| verbatim | 0,90 | Again / Hard / Good / Easy |
| gist | 0,80 | Não recuperei → Again; parcialmente → Hard; núcleo → Good |
| transfer | 0,75 | Avaliação da variação apresentada |

São instâncias do **mesmo** DefaultScheduler, com os mesmos pesos e etapas; muda apenas `desiredRetention`. Não há reimplementação ou modificação de S/D/R no motor. A propagação de S é uma política externa explicitamente identificada, não uma revisão inventada.

### Incompatibilidade no critério de 20–30%

Metas 0,90/0,80/0,75 **não garantem** intervalos 20–30% maiores. No teste determinístico com seis Good em datas comuns separadas por 30 dias, o FSRS-7 embutido produziu razão média gist/verbatim de aproximadamente **6,137**. O teste verifica metas reais e intervalos maiores, sem fixar artificialmente a razão. Impor 20–30% exigiria calibrar outras metas ou limitar externamente intervalos, contrariando a preservação da política especificada. Não há afirmação de que gist seja naturalmente compatível com 80% neste baralho.

## 3. Protocolos

### Contraste deliberado

Um cartão verbatim com `confusableWith` gera uma pendência a cada ciclo `floor(reps / 4)`. Concluir o ciclo atual elimina a pendência; ciclos antigos não se acumulam em uma avalanche. O exemplo inicial compara os mecanismos de **alopurinol (`26.2.1`) e rasburicase (`26.2.2`)**, usando respostas já presentes no baralho.

Perguntas aparecem juntas. Respostas ficam inicialmente em um disclosure fechado e, ao abrir o banco, recebem letras com ordem embaralhada. O usuário associa cada pergunta a uma resposta por selects nativos. Duplicação de uma mesma resposta é rejeitada; a correção compara IDs, não texto. O resultado registra acertos por associação e mostra o gabarito. Não grava notas nem estados FSRS.

### Transferência

`transferVariants: [{prompt, answer}]` armazena texto puro, escapado ao renderizar. O índice é `reps % quantidadeDeVariacoes`, estável ao revelar, recarregar ou alternar abas. Good/Hard/Again/Easy atualizam **o cardId original**. O evento guarda tipo, índice e sucesso; notas ≥ Good contam como sucesso.

O botão do mapa abre a fila filtrada de transferência. **Não força revisão antes da data**. Se a variação ainda não está devida, a fila informa que não há revisão disponível. O piloto de `26.1.3` mantém a resposta já existente (“Hipercalemia”) em dois contextos de SLT. Não há chamada a IA ou geração livre de conduta. As variantes não são apresentadas como nova revisão médica certificada.

### Contexto

Uma pendência por tema reaparece sete dias após a última conclusão. Na primeira utilização todos os temas têm uma pendência. Escolhe ciclicamente uma resposta oculta; as perguntas e as outras respostas do tema ficam visíveis, com pré-requisitos/hub como pistas. Após revelar, o usuário registra se recuperou o essencial. Não dá nota FSRS e não adia individualmente os cartões do tema. A sessão contextual ocupa uma atividade do Pool C; não cancela revisões FSRS devidas.

Práticas manuais continuam acessíveis no mapa. Temas sem pares ou variantes mostram a ausência e não geram associações clínicas inventadas. Cartões ocultos não aparecem nas sessões.

## 4. Fila híbrida e métricas

O painel permite escolher Todas, A, B ou C. Os números A/B são revisões vencidas; os novos continuam subordinados à cota diária compartilhada.

- **A:** itens verbatim. Órfãos mantêm FSRS puro. Verbatim relacionados também permanecem acessíveis aqui, identificados pelo grafo — não são descartados pela lacuna da especificação entre “órfãos” e “gist/transfer”.
- **B:** gist e transfer. Mantêm prioridade de vencimento e etapas de aprendizagem da fila existente, usando as metas por tipo.
- **C:** contraste/contexto pendentes. Ações não consomem ratings FSRS nem cota de novos.

As filas respeitam a seleção de cartões; o mapa permite iniciar uma prática no tema escolhido. Métricas em “Qualidade cognitiva”:

- `discriminationAccuracy`: associações corretas / associações respondidas (não porcentagem de sessões totalmente corretas).
- `transferSuccessRate`: avaliações Good/Easy em variações / avaliações de variações.
- `gistRetrievalRate`: núcleo recuperado / avaliações gist; parcial não conta como núcleo completo.

Cada taxa mostra numerador/denominador. Sem observações aparece “Sem práticas”, não 0%. Não se combinam com R. O contador de revisões FSRS de hoje conta cartões distintos, enquanto intervenções contam sessões.

## Persistência, backup e atualização

- Marcações e metadados/eventos cognitivos ficam no envelope já existente `cmn-flashcards-v1`, em `localStorage`.
- Avaliações gist/transfer acompanham os registros IndexedDB como `cognitiveEvents`; a coleta combina eventos por ID, sem duplicá-los. Exportação XML lê o IndexedDB atualizado antes de construir o snapshot.
- Intervenções são salvas com Web Locks quando disponível e leitura atualizada do envelope; sem essa API há fallback local, sem garantia de exclusão mútua entre gravações simultâneas de localStorage.
- XML v1 acrescenta `<cognitive>` **opcional**. Contém `<cognitive-card>` com `trace-type`, `anchor`, `<depends-on>`, `<confusable-with>`, `<transfer-variant>` e `<event>` com resultado/ciclo/variante. O XSD descreve a estrutura; o parser nativo valida também limites, IDs, ciclos e coerência dos resultados.
- Backups XML antigos e JSON legado continuam aceitos e não apagam metadados cognitivos por ausência da extensão. Uma extensão cognitiva inválida rejeita a importação inteira antes de alterar as marcações.
- XML **não substitui** o backup FSRS JSON: o estado S/D/datas continua neste último, como antes. Para transferir o histórico completo entre dispositivos, leve ambos. A extensão preserva metadados e métricas, não recria avaliações FSRS a partir de métricas.
- Atualizações via BroadcastChannel/storage/focus renovam a fila sem remover a resposta aberta quando o registro continua igual. Backup FSRS consulta IndexedDB, não um Map possivelmente desatualizado.
- O cache inclui `assets/cognitive.js`; navegação offline usa o shell. Erros HTTP 5xx também usam o shell disponível.

## Extensão editorial

Campos opcionais no cartão de `sourceData` (ou metadados equivalentes no XML):

```js
{
  traceType: 'verbatim',
  anchor: false,
  dependsOn: ['26.1.1'],
  weights: {'26.1.1': 0.6},
  confusableWith: ['26.2.2'],
  transferVariants: []
}
```

Para `transfer`, forneça pelo menos uma variação. `hubId` é derivado do tema. A geração inicial usa os campos explícitos; edições persistidas são restauradas do backup. Não declare relações de pré-requisito ou pares apenas porque pertencem à mesma especialidade. A revisão editorial deve verificar os estímulos, respostas e seus avisos clínicos.

## Verificação e limites

A suíte nova cobre grafo/ciclos/teto, propagação real via interface e IndexedDB, separação completa dos pools, contraste, contexto semanal, variantes cíclicas, metas reais, backup em outra aba e rejeição de importação inválida. Inclui round trip XML, além das regressões existentes de PWA e conteúdo.

Na base inicial, três expectativas antigas ainda refletiam o PR #16; a main posterior já atualizou essas expectativas e sua versão foi preservada. A nova suíte usa o total vigente de 1.206 cartões. A contagem de auditoria dos não derivados inclui explicitamente os 15 cartões a revisar. Os testes existentes não foram excluídos.

A integração com os PRs #20/#21 mantém `read-count` no XML, acrescenta esse atributo opcional ao XSD e aplica as leituras importadas somente na confirmação efetiva da importação. Se outra aba alterar as marcações, a primeira confirmação apenas solicita confirmação renovada, sem restaurar leituras prematuramente.

Na etapa anterior, a suíte ampliada registrou 83 testes aprovados, 1 ignorado e 2 falhas no teste de cota compartilhada. Após corrigir a perda de clique na mudança do limite diário, os dois casos passaram na execução dirigida. A última execução completa não pôde ser consultada após a indisponibilidade do ambiente. A integração com os PRs #19–#21 ainda precisa da execução completa no CI; resultados anteriores não validam essa nova combinação.

Esta implementação não treina parâmetros, estima covariâncias, calibra metas por aluno, mede transferência distante nem valida eficácia pedagógica/assistencial. Não foi testada em dispositivos físicos ou com leitor de tela real. Veja o PR para os resultados de execução e a disponibilidade dos navegadores no ambiente.
