import { useMemo, useState } from "react";

export const ITENS_POR_PAGINA_PADRAO = 20;

/**
 * usePagination
 *
 * Hook genérico de paginação client-side (não faz nenhuma requisição, apenas
 * fatia um array já carregado). Pensado para ser usado em qualquer listagem
 * grande do sistema (livros, autores, gêneros, empréstimos, solicitações,
 * alunos, comunidade, admins, etc.) em conjunto com o componente
 * <Pagination />.
 *
 * Uso típico:
 *
 *   const { paginaAtual, totalPaginas, paginaItens, irParaPagina } =
 *     usePagination(itensFiltrados);
 *
 *   ...renderiza paginaItens.map(...) no lugar de itensFiltrados.map(...)...
 *
 *   <Pagination
 *     paginaAtual={paginaAtual}
 *     totalPaginas={totalPaginas}
 *     onChange={irParaPagina}
 *   />
 *
 * Importante: a página atual é sempre "clampada" ao intervalo válido
 * (1..totalPaginas) a cada render — em vez de resetar para a página 1 toda
 * vez que a lista de origem muda de tamanho — para não brigar com filtros
 * de busca recriando o array a cada digitação. Isso evita tanto o bug de
 * ficar numa página "fantasma" (ex.: estava na página 5, o filtro deixou só
 * 2 páginas) quanto resets bruscos e desnecessários enquanto o usuário só
 * está navegando (editar/excluir um item da página atual, por exemplo).
 */
export default function usePagination(items, itemsPerPage = ITENS_POR_PAGINA_PADRAO) {
  const [paginaSolicitada, setPaginaSolicitada] = useState(1);

  const lista = useMemo(
    () => (Array.isArray(items) ? items : []),
    [items]
  );
  const totalItens = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itemsPerPage));

  const paginaAtual = Math.min(Math.max(1, paginaSolicitada), totalPaginas);

  const paginaItens = useMemo(() => {
    const inicio = (paginaAtual - 1) * itemsPerPage;
    return lista.slice(inicio, inicio + itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, paginaAtual, itemsPerPage]);

  return {
    paginaAtual,
    totalPaginas,
    totalItens,
    paginaItens,
    irParaPagina: setPaginaSolicitada,
  };
}
