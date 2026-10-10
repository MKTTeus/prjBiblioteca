import { devolverEmprestimo, atualizarMeuPerfil, solicitarLivro } from './api';
beforeEach(()=>{localStorage.clear();global.fetch=jest.fn();Object.defineProperty(window,'crypto',{configurable:true,value:{randomUUID:jest.fn(()=> '11111111-1111-4111-8111-111111111111')}});});
test('devolução envia os IDs das cópias escolhidas',async()=>{
  fetch.mockResolvedValue({ok:true,json:async()=>({message:'OK'})});
  await devolverEmprestimo(10,[21,22]);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({idExemplares:[21,22]});
});
test('instala novo token devolvido pelo perfil e notifica o contexto',async()=>{
  const listener=jest.fn();window.addEventListener('session-token',listener);
  fetch.mockResolvedValue({ok:true,json:async()=>({access_token:'novo'})});
  await atualizarMeuPerfil({novaSenha:'Senha@123',senhaAtual:'antiga'});
  expect(localStorage.getItem('token')).toBe('novo');expect(listener).toHaveBeenCalled();
  window.removeEventListener('session-token',listener);
});

test('reutiliza idempotência após resposta 503',async()=>{
  fetch.mockResolvedValueOnce({ok:false,status:503,text:async()=>'{"detail":"indisponível"}'}).mockResolvedValueOnce({ok:true,json:async()=>({idMovimentacao:1})});
  await expect(solicitarLivro({idLivro:1})).rejects.toThrow();
  await solicitarLivro({idLivro:1});
  expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe(fetch.mock.calls[1][1].headers['Idempotency-Key']);
  expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
});
