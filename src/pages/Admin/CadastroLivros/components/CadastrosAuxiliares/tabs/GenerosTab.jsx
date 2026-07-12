import React from "react";
import SimpleTaxonomyTab from "../SimpleTaxonomyTab";
import {
  getGeneros,
  createGenero,
  updateGenero,
  deleteGenero,
  getGeneroUso,
  mesclarGenero,
} from "../../../../../../services/api";

export default function GenerosTab() {
  return (
    <SimpleTaxonomyTab
      titulo="Gêneros"
      singular="gênero"
      artigo="o"
      placeholderNovo="Nome do novo gênero..."
      nomeField="genNome"
      idField="idGenero"
      api={{
        listar: getGeneros,
        criar: createGenero,
        atualizar: updateGenero,
        excluir: deleteGenero,
        getUso: getGeneroUso,
        mesclar: mesclarGenero,
      }}
    />
  );
}
