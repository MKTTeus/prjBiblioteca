import React from "react";
import SimpleTaxonomyTab from "../SimpleTaxonomyTab";
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getCategoriaUso,
  mesclarCategoria,
} from "../../../../../../services/api";

export default function CategoriasTab() {
  return (
    <SimpleTaxonomyTab
      titulo="Categorias"
      singular="categoria"
      artigo="a"
      placeholderNovo="Nome da nova categoria..."
      nomeField="catNome"
      idField="idCategoria"
      api={{
        listar: getCategorias,
        criar: createCategoria,
        atualizar: updateCategoria,
        excluir: deleteCategoria,
        getUso: getCategoriaUso,
        mesclar: mesclarCategoria,
      }}
    />
  );
}
