import React from "react";
import { UserRound, Phone, MapPin } from "lucide-react";
import { IMaskInput } from "react-imask";
import PessoaModal, { PessoaField, PessoaPassword, PessoaSection } from "../../../../components/PessoaModal/PessoaModal";
import PessoaSelect from "../../../../components/PessoaModal/PessoaSelect";
import { MASK_CPF, MASK_TELEFONE } from "../../../../utils/masks";

export default function ComunidadeModal({
  aberto, modoEdicao, membro, isProcessing, isDirty, onChange, onClose, onSave, errors = {},
}) {
  if (!aberto) return null;

  return (
    <PessoaModal
      aberto={aberto} tipo="comunidade" modalClassName="comunidade-editor-modal"
      titulo={modoEdicao ? "Editar membro" : "Cadastrar novo membro"}
      descricao={modoEdicao ? "Atualize os dados do membro da comunidade." : "Preencha as informações para adicionar um membro à comunidade."}
      modoEdicao={modoEdicao} isProcessing={isProcessing} isDirty={isDirty}
      onClose={onClose} onSave={onSave} errors={errors}>
      <PessoaSection title="Identificação" icon={UserRound}>
        <PessoaField title="Nome completo *">
          <input name="nome" value={membro.nome || ""} onChange={onChange}
            aria-invalid={Boolean(errors.nome)} placeholder="Digite o nome completo do membro" />
        </PessoaField>
        <PessoaField title="CPF *">
          <IMaskInput name="cpf" mask={MASK_CPF} value={membro.cpf || ""}
            aria-invalid={Boolean(errors.cpf)} placeholder="000.000.000-00"
            onAccept={(value) => onChange({ target: { name: "cpf", value: value.replace(/\D/g, "") } })} />
        </PessoaField>
      </PessoaSection>

      <PessoaSection title="Contato e acesso" icon={Phone}>
        <PessoaField title="E-mail">
          <input name="email" type="email" value={membro.email || ""} onChange={onChange}
            aria-invalid={Boolean(errors.email)} placeholder="membro@comunidade.com" />
        </PessoaField>
        <PessoaField title="Telefone">
          <IMaskInput name="telefone" mask={MASK_TELEFONE} value={membro.telefone || ""}
            aria-invalid={Boolean(errors.telefone)} placeholder="(00) 00000-0000"
            onAccept={(value) => onChange({ target: { name: "telefone", value: value.replace(/\D/g, "") } })} />
        </PessoaField>
        <PessoaField title="Telefone secundário">
          <IMaskInput name="telefone2" mask={MASK_TELEFONE} value={membro.telefone2 || ""}
            placeholder="(00) 00000-0000"
            onAccept={(value) => onChange({ target: { name: "telefone2", value: value.replace(/\D/g, "") } })} />
        </PessoaField>
        <PessoaField title="Senha *">
          <PessoaPassword value={membro.senha} onChange={onChange}
            invalid={errors.senha} disabled={modoEdicao} />
        </PessoaField>
      </PessoaSection>

      <PessoaSection title="Endereço e status" icon={MapPin}>
        <PessoaField title="Endereço *">
          <input name="endereco" value={membro.endereco || ""} onChange={onChange}
            aria-invalid={Boolean(errors.endereco)} placeholder="Rua, número e complemento" />
        </PessoaField>
        <PessoaField title="Status">
          <PessoaSelect name="status" value={membro.status || "Ativo"} onChange={onChange}
            options={["Ativo", "Inativo"]} />
        </PessoaField>
      </PessoaSection>
    </PessoaModal>
  );
}
