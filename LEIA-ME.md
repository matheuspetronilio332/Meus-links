# Meus links

Um mural simples de cards para guardar seus sites favoritos. Sem instalação, sem dependências.

## Como abrir
Dê dois cliques em `index.html`. Pronto. (Se preferir um servidor local: `python3 -m http.server 5173` dentro desta pasta e acesse http://localhost:5173.)

## O que dá para fazer
- **Adicionar**: cole um link no campo grande e aperte Enter. Nome e capa são criados automaticamente.
- **Abrir**: clique no card para abrir o site em outra aba.
- **Editar** (lápis): nome, descrição, link, categoria e imagem (enviar do computador ou colar um link de imagem). "Imagem automática" volta ao padrão.
- **Favoritar** (estrela), **excluir** (lixeira, com opção de desfazer).
- **Reordenar**: arraste os cards (quando não há busca ou filtro ativos).
- **Buscar** por nome, descrição, link ou categoria; **filtrar** por categoria ou favoritos. Atalho: `/` para buscar.
- **Tema** claro/escuro, **Exportar/Importar** backup em JSON.

## Onde ficam os dados
No `localStorage` do navegador, separados por endereço: abrir por `index.html` e por `localhost` mostra listas diferentes. Para levar seus cards de um lugar para outro, use Exportar e Importar.

## Personalizar
As cores estão no começo de `style.css` (variáveis em `:root`).

## Arquivos
`index.html`, `style.css`, `app.js`
