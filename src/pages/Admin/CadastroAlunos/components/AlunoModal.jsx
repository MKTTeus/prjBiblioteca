import React, { useState } from "react";
import { UserRound, Phone, GraduationCap } from "lucide-react";
import { IMaskInput } from "react-imask";
import PessoaModal, { PessoaField, PessoaPassword, PessoaSection } from "../../../../components/PessoaModal/PessoaModal";
import PessoaSelect from "../../../../components/PessoaModal/PessoaSelect";
import ConfirmExitModal from "../../../../components/ConfirmExitModal/ConfirmExitModal";
import { MASK_TELEFONE } from "../../../../utils/masks";
import { SERIES } from "../../../../utils/series";

export default function AlunoModal({
  aberto, modoEdicao, aluno, isProcessing, isDirty, onChange, onClose, onSave, errors = {},
}) {
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  if (!aberto) return null;

  function handleRequestClose() {
    if (isDirty) setConfirmandoSaida(true);
    else onClose();
  }

  function confirmarSaida() {
    setConfirmandoSaida(false);
    onClose();
  }

  return (
    <>
      <PessoaModal
        aberto={aberto} tipo="aluno" modalClassName="aluno-editor-modal"
        titulo={modoEdicao ? "Editar aluno" : "Cadastrar novo aluno"}
        descricao={modoEdicao ? "Atualize as informações do aluno." : "Preencha as informações para adicionar um aluno ao sistema."}
        modoEdicao={modoEdicao} isProcessing={isProcessing} isDirty={isDirty}
        onClose={handleRequestClose} onSave={onSave} errors={errors}>
        <PessoaSection title="Identificação" icon={UserRound}>
          <PessoaField title="Nome completo *">
            <input name="nome" value={aluno.nome || ""} onChange={onChange}
              aria-invalid={Boolean(errors.nome)} placeholder="Digite o nome completo do aluno" />
          </PessoaField>
          <PessoaField title="RA *">
            <input name="ra" value={aluno.ra || ""} onChange={onChange}
              aria-invalid={Boolean(errors.ra)} placeholder="Informe o RA do aluno" />
          </PessoaField>
        </PessoaSection>

        <PessoaSection title="Contato e acesso" icon={Phone}>
          <PessoaField title="E-mail *">
            <input name="email" type="email" value={aluno.email || ""} onChange={onChange}
              aria-invalid={Boolean(errors.email)} placeholder="aluno@escola.com" />
          </PessoaField>
          <PessoaField title="Telefone *">
            <IMaskInput name="telefone" mask={MASK_TELEFONE} value={aluno.telefone || ""}
              aria-invalid={Boolean(errors.telefone)} placeholder="(00) 00000-0000"
              onAccept={(value) => onChange({ target: { name: "telefone", value: value.replace(/\D/g, "") } })} />
          </PessoaField>
          <PessoaField title="Telefone secundário">
            <IMaskInput name="telefone2" mask={MASK_TELEFONE} value={aluno.telefone2 || ""}
              placeholder="(00) 00000-0000"
              onAccept={(value) => onChange({ target: { name: "telefone2", value: value.replace(/\D/g, "") } })} />
          </PessoaField>
          <PessoaField title="Senha *">
            <PessoaPassword value={aluno.senha} onChange={onChange}
              invalid={errors.senha} disabled={modoEdicao} />
          </PessoaField>
        </PessoaSection>

        <PessoaSection title="Informações escolares" icon={GraduationCap}>
          <PessoaField title="Série *">
            <PessoaSelect name="serie" value={aluno.serie || ""} onChange={onChange}
              invalid={errors.serie} placeholder="Selecione a série" options={SERIES} />
          </PessoaField>
          <PessoaField title="Turma">
            <input name="turma" value={aluno.turma || ""} onChange={onChange} placeholder="Ex.: A, B, Única" />
          </PessoaField>
          <PessoaField title="Endereço *">
            <input name="endereco" value={aluno.endereco || ""} onChange={onChange}
              aria-invalid={Boolean(errors.endereco)} placeholder="Rua, número e complemento" />
          </PessoaField>
          <PessoaField title="Status">
            <PessoaSelect name="status" value={aluno.status || "Ativo"} onChange={onChange}
              invalid={errors.status} options={["Ativo", "Inativo"]} />
          </PessoaField>
        </PessoaSection>
      </PessoaModal>

      <ConfirmExitModal show={confirmandoSaida}
        onConfirm={confirmarSaida} onCancel={() => setConfirmandoSaida(false)} />
    </>
  );
}
