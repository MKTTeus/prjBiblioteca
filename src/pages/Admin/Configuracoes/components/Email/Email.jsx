import { useEffect, useState } from "react";
import { Mail, CircleCheck, AlertCircle, Info } from "lucide-react";
import { getEmailStatus } from "../../../../../services/api";

export default function Email() {
  const [status,setStatus] = useState(null);
  const [erro,setErro] = useState(false);
  useEffect(() => {
    let active = true;
    getEmailStatus().then(data => { if (active) setStatus(data); }).catch(() => { if (active) setErro(true); });
    return () => { active = false; };
  }, []);
  return <section className="card config-email-card">
    <div className="config-section-heading"><span className="config-icon"><Mail size={19}/></span><div><h3>Envio de E-mail</h3><p>Informações sobre o serviço de envio de mensagens.</p></div></div>
    {erro ? <div className="config-email-status is-error"><AlertCircle size={20}/><div><strong>Não foi possível consultar o serviço</strong><small>Verifique a conexão e tente novamente.</small></div></div> :
      status ? <div className={`config-email-status ${status.configurado ? "is-ready" : "is-error"}`}>
        {status.configurado ? <CircleCheck size={20}/> : <AlertCircle size={20}/>}
        <div><strong>{status.configurado ? "Serviço configurado" : "Serviço não configurado"}</strong><small>{status.configurado ? "O sistema está configurado para envio de e-mails." : "O envio de e-mails precisa ser configurado pela equipe responsável."}</small></div>
      </div> : <p className="config-email-loading" role="status">Consultando serviço…</p>}
    {status?.remetente && <div className="config-email-sender"><label>Remetente</label><div>{status.remetente}</div></div>}
    <p className="config-email-notice"><Info size={16}/> A equipe responsável pela instalação configura o serviço de envio. As credenciais não são exibidas nesta tela.</p>
  </section>;
}
