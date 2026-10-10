import { useEffect,useState } from 'react';
import { getEmailStatus } from '../../../../../services/api';
export default function Email() {
  const [status,setStatus]=useState(null);
  const [erro,setErro]=useState(false);
  useEffect(()=>{getEmailStatus().then(setStatus).catch(()=>setErro(true));},[]);
  return <div className="card"><h3>Envio de e-mail</h3>
    <p>{erro ? 'Não foi possível consultar o envio.' : status ? (status.configurado ? 'Serviço configurado.' : 'Serviço ainda não configurado.') : 'Consultando serviço…'}</p>
    {status?.remetente && <p>Remetente: {status.remetente}</p>}
    <p>A equipe responsável pela instalação configura o serviço de envio. Credenciais não são exibidas nesta tela.</p>
  </div>;
}
