import React from "react";
import ConfirmModal from "../ConfirmModal/ConfirmModal";

/**
 * ConfirmExitModal
 *
 * Camada fina sobre o ConfirmModal genérico, com textos padrão para o
 * cenário de "sair de um cadastro com alterações não salvas". Pensado para
 * ser reaproveitado em qualquer formulário/modal de cadastro do sistema
 * (livros, alunos/usuários, empréstimos, comunidade, admins etc.) — basta
 * o formulário saber informar se está "sujo" (isDirty) e chamar este modal
 * antes de fechar de fato.
 *
 * Uso típico no componente de cadastro:
 *
 *   const [confirmandoSaida, setConfirmandoSaida] = useState(false);
 *
 *   function handleRequestClose() {
 *     if (isDirty) setConfirmandoSaida(true);
 *     else onClose();
 *   }
 *
 *   <ConfirmExitModal
 *     show={confirmandoSaida}
 *     onConfirm={() => { setConfirmandoSaida(false); onClose(); }}
 *     onCancel={() => setConfirmandoSaida(false)}
 *   />
 */
export default function ConfirmExitModal({
  show,
  onConfirm,
  onCancel,
  title = "Sair sem salvar?",
  message = "Você tem alterações não salvas neste cadastro. Se sair agora, elas serão perdidas.",
  confirmText = "Sair sem salvar",
  cancelText = "Continuar editando",
}) {
  return (
    <ConfirmModal
      show={show}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}