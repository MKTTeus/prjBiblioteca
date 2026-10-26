import React from "react";
import { LuBarcode } from "react-icons/lu";
import { HiOutlineSparkles } from "react-icons/hi2";
import { HiOutlineArrowPath } from "react-icons/hi2";

export const FIELD_LABELS = {
  livTitulo: "título", exemplarISBN: "ISBN", livAutor: "autor", autorAnoNascimento: "ano de nascimento",
  autorAnoFalecimento: "ano de falecimento", idGenero: "gênero", livDescricao: "descrição",
  livCapaURL: "URL da capa", livEditora: "editora", ediCidade: "cidade da editora",
  ediEstado: "estado da editora", ediPais: "país da editora", livAnoPublicacao: "ano de publicação",
  livPaginas: "páginas", livEdicao: "edição", livSubtitulo: "subtítulo", livIdioma: "idioma",
  livFaixaEtaria: "faixa etária", livCDD: "CDD", livAlturaCm: "altura", livLarguraCm: "largura",
  livIlustrado: "livro ilustrado", livPalavrasChave: "palavras-chave",
};

export default function FieldOriginIcon({ name, fieldOrigins, onRegenerate, regeneratingField }) {
  const origin = fieldOrigins?.[name];
  const label = origin === "isbn" ? "Preenchido pelo ISBN" : "Preenchido pela IA";
  return (
    <>
      {(origin === "isbn" || origin === "ia") && (
        <span className={`field-origin-icon field-origin-icon--${origin}`} role="img" aria-label={label} title={label}>
          {origin === "isbn" ? <LuBarcode aria-hidden="true" /> : <HiOutlineSparkles aria-hidden="true" />}
        </span>
      )}
      {onRegenerate && <button type="button" className={`field-regenerate-button${regeneratingField === name ? " is-loading" : ""}`} title="Gerar nova sugestão só para este campo" aria-label={`Gerar nova sugestão para ${FIELD_LABELS[name] || name}`} disabled={Boolean(regeneratingField)} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onRegenerate(name); }}><HiOutlineArrowPath aria-hidden="true" /></button>}
    </>
  );
}
