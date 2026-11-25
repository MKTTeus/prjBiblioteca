import React, { useRef, useState, useEffect } from "react";
import "./PolicyLinks.css";

const policies = {
  privacy: {
    title: "Política de Privacidade",
    sections: [
      ["Finalidade e dados tratados", "O Sistema de Biblioteca da Escola 9 de Julho de Taquaritinga utiliza dados cadastrais, como nome, RA ou CPF, e-mail, data de nascimento, endereço e contatos, conforme o perfil, para identificar usuários, administrar empréstimos, devoluções, reservas, comunicações e segurança. Registros de acesso e movimentações podem ser utilizados para administração e proteção do serviço."],
      ["Bases legais e menores de idade", "O tratamento deve observar a Lei Geral de Proteção de Dados (Lei 13.709/2018), a finalidade educacional, as atribuições da instituição e as bases legais aplicáveis a cada operação. No tratamento de dados de crianças e adolescentes, deve prevalecer seu melhor interesse, com participação dos responsáveis quando exigida pela legislação."],
      ["Serviços e inteligência artificial", "O sistema utiliza serviços de hospedagem, banco de dados e envio de e-mails. Recursos de inteligência artificial, incluindo o Novi, podem processar informações necessárias à solicitação. Evite inserir dados pessoais desnecessários ou sensíveis nas interações. O acesso e compartilhamento devem limitar-se às finalidades autorizadas e às obrigações legais."],
      ["Segurança e armazenamento local", "O sistema utiliza autenticação, controles de acesso por perfil e mecanismos de segurança. O navegador pode armazenar informações de sessão e preferências. Encerre a sessão ao utilizar equipamentos compartilhados."],
      ["Direitos e contato", "Para solicitar confirmação de tratamento, acesso, correção, informações sobre compartilhamento, anonimização, bloqueio ou eliminação, quando aplicáveis, procure a direção da escola ou o responsável pela Sala de Leitura, que deverá encaminhar a solicitação ao responsável institucional. Também é possível peticionar perante a ANPD, nos termos da legislação."],
      ["Situação do documento", "Versão preliminar para validação institucional. A identificação formal do controlador, do encarregado e do canal oficial de atendimento deverá ser confirmada pela instituição."]
    ]
  },
  retention: {
    title: "Política de Retenção de Dados",
    sections: [
      ["Critérios gerais", "Os dados devem ser mantidos pelo período necessário à finalidade do tratamento, às obrigações legais e administrativas e à proteção de direitos, observadas as hipóteses de conservação previstas na LGPD."],
      ["Cadastros e movimentações", "Cadastros devem ser avaliados após o encerramento do vínculo com a biblioteca. Registros de empréstimos, devoluções e pendências podem exigir conservação para prestação de contas, resolução de pendências e cumprimento de obrigações. A desativação de uma conta não equivale à eliminação de seus dados."],
      ["Registros técnicos e backups", "Registros técnicos e cópias de segurança devem ter acesso restrito e períodos de conservação definidos conforme necessidades de segurança, recuperação e obrigações aplicáveis. A eliminação em sistemas ativos deve considerar também o ciclo de expiração das cópias de segurança."],
      ["Descarte e solicitações", "Quando cessarem as finalidades e não houver hipótese legal de conservação, os dados deverão ser eliminados ou anonimizados de forma adequada. Solicitações podem ser encaminhadas à direção da escola ou ao responsável pela Sala de Leitura."],
      ["Prazos e implementação", "Os prazos específicos por categoria de dados e o procedimento institucional de descarte ainda dependem de validação pela escola. Este documento preliminar não estabelece exclusão automática nem garante prazos de descarte ainda não implementados."]
    ]
  }
};

export default function PolicyLinks() {
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [selected]);
  function open(key, event) {
    trigger.current = event.currentTarget;
    setSelected(key);
  }
  function close() {
    setSelected(null);
    trigger.current?.focus();
  }
  const policy = selected ? policies[selected] : null;
  return (
    <footer className="library-policy-links" aria-label="Privacidade e proteção de dados">
      {Object.entries(policies).map(([key, item]) => (
        <button key={key} type="button" onClick={event => open(key, event)}>{item.title}</button>
      ))}
      <dialog ref={dialog} className="library-policy-dialog" aria-label={policy?.title || "Políticas"} onClose={close}>
        {policy && <>
          <header><h2>{policy.title}</h2><button type="button" aria-label="Fechar" onClick={() => dialog.current.close()}>×</button></header>
          <div className="library-policy-body">
            {policy.sections.map(([title, body]) => <section key={title}><h3>{title}</h3><p>{body}</p></section>)}
          </div>
          <div className="library-policy-actions"><button type="button" onClick={() => dialog.current.close()}>Fechar</button></div>
        </>}
      </dialog>
    </footer>
  );
}
