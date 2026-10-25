import React from "react";
import { LuBarcode } from "react-icons/lu";
import { HiOutlineSparkles } from "react-icons/hi2";

export default function FieldOriginIcon({ name, fieldOrigins }) {
  const origin = fieldOrigins?.[name];
  if (origin !== "isbn" && origin !== "ia") return null;

  const label = origin === "isbn" ? "Preenchido pelo ISBN" : "Preenchido pela IA";
  return (
    <span className={`field-origin-icon field-origin-icon--${origin}`} role="img" aria-label={label} title={label}>
      {origin === "isbn" ? <LuBarcode aria-hidden="true" /> : <HiOutlineSparkles aria-hidden="true" />}
    </span>
  );
}
