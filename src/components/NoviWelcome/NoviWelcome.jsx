import React from "react";
import Modal from "../Modal/Modal";
import "./NoviWelcome.css";

export default function NoviWelcome({ show, onClose }) {
  return (
    <Modal show={show} onClose={onClose} className="novi-welcome" ariaLabel="Apresentação da Novi">
      <img className="novi-welcome__logo" src="/novi-logo.png" alt="Novi" width="72" height="72" />
      <h2>Conheça a Novi</h2>
      <p>A Novi já está disponível para ajudar você na Sala de Leitura. Pergunte como cadastrar um livro, registrar uma devolução ou encontrar os relatórios.</p>
      <p>Para conversar, clique no ícone da Novi no canto inferior direito da tela.</p>
      <button type="button" className="novi-welcome__button" onClick={onClose}>Entendi</button>
    </Modal>
  );
}
