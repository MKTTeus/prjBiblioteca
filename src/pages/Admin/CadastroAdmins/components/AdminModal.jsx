import React from "react";
import { UserRound, ShieldCheck, Mail, LockKeyhole } from "lucide-react";
import PessoaModal, { PessoaField, PessoaPassword, PessoaSection } from "../../../../components/PessoaModal/PessoaModal";
import PessoaSelect from "../../../../components/PessoaModal/PessoaSelect";

export default function AdminModal({
  aberto, modoEdicao, admin, isProcessing, isDirty, onChange, onClose, onSave, errors = {},
}) {
  if (!aberto) return null;

  return (
    <PessoaModal
      aberto={aberto} tipo="admin" modalClassName="admin-editor-modal"
      titulo={modoEdicao ? "Editar administrador" : "Cadastrar novo administrador"}
      descricao={modoEdicao ? "Atualize as informações e permissões do administrador." : "Preencha as informações para cadastrar um administrador."}
      modoEdicao={modoEdicao} isProcessing={isProcessing} isDirty={isDirty}
      onClose={onClose} onSave={onSave} errors={errors}>
      <PessoaSection title="Identificação" icon={UserRound}>
        <PessoaField title="Nome *" icon={UserRound}>
          <input name="nome" value={admin.nome || ""} onChange={onChange}
            aria-invalid={Boolean(errors.nome)} placeholder="Digite o nome do administrador" />
        </PessoaField>
        <PessoaField title="E-mail" icon={Mail}>
          <input name="email" type="email" value={admin.email || ""} onChange={onChange}
            aria-invalid={Boolean(errors.email)} placeholder="admin@sistema.com" />
        </PessoaField>
      </PessoaSection>

      <PessoaSection title="Acesso e permissões" icon={ShieldCheck}>
        <PessoaField title="Senha *" icon={LockKeyhole}>
          <PessoaPassword value={admin.senha} onChange={onChange}
            invalid={errors.senha} disabled={modoEdicao} />
        </PessoaField>
        <PessoaField title="Status">
          <PessoaSelect name="status" value={admin.status || "Ativo"} onChange={onChange}
            options={["Ativo", "Inativo"]} />
        </PessoaField>
        <PessoaField title="Perfil" icon={ShieldCheck}>
          <PessoaSelect name="perfil" value={admin.perfil || "Gestor"} onChange={onChange}
            options={[
              { value: "Gestor", label: "Gestor (acesso administrativo completo)" },
              { value: "Professor", label: "Professor (acesso restrito)" },
            ]} />
        </PessoaField>
      </PessoaSection>
    </PessoaModal>
  );
}
