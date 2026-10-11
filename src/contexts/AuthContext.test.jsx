import { render,screen,waitFor,fireEvent } from '@testing-library/react';
import { AuthProvider,useAuth } from './AuthContext';
import Login from '../pages/Login';
jest.mock('react-router-dom',()=>({useNavigate:()=>jest.fn()}));
function Probe(){const {user,loadingUser}=useAuth();return <div>{loadingUser ? 'carregando' : user ? `perfil:${user.professor}` : 'sem sessão'}</div>;}
beforeEach(()=>{localStorage.clear();global.fetch=jest.fn();});
test('metadados persistidos cedem ao perfil confirmado pelo servidor',async()=>{
 localStorage.setItem('token','token');localStorage.setItem('user',JSON.stringify({tipo:'admin',professor:false}));
 fetch.mockResolvedValueOnce({ok:true,status:200,json:async()=>({nome:'Professor',email:'prof@example.com',professor:true})}).mockResolvedValueOnce({ok:true,json:async()=>[]});
 render(<AuthProvider><Probe/></AuthProvider>);
 await screen.findByText('perfil:true');
 expect(fetch.mock.calls[0][0]).toContain('/admin/me');
});
test('perfil validado libera a rota mesmo se a configuração ainda estiver pendente',async()=>{
 localStorage.setItem('token','token');localStorage.setItem('user',JSON.stringify({tipo:'admin'}));
 fetch.mockResolvedValueOnce({ok:true,status:200,json:async()=>({nome:'Gestor',professor:false})})
   .mockImplementationOnce(()=>new Promise(()=>{}));
 render(<AuthProvider><Probe/></AuthProvider>);
 await screen.findByText('perfil:false');
 expect(fetch.mock.calls[1][0]).toContain('/configuracoes');
 expect(localStorage.getItem('token')).toBe('token');
});
test('um erro ao validar o servidor não restaura uma sessão do armazenamento',async()=>{
 localStorage.setItem('token','token');localStorage.setItem('user',JSON.stringify({tipo:'Aluno'}));
 fetch.mockResolvedValue({ok:false,status:503});
 render(<AuthProvider><Probe/></AuthProvider>);
 await screen.findByText('sem sessão');await waitFor(()=>expect(localStorage.getItem('token')).toBeNull());
});
test('JSON inválido do armazenamento não quebra a aplicação',async()=>{
 localStorage.setItem('user','{inválido');localStorage.setItem('token','token');
 render(<AuthProvider><Probe/></AuthProvider>);
 await screen.findByText('sem sessão');expect(fetch).not.toHaveBeenCalled();
});
test('formulário de login aparece mesmo durante a validação de uma sessão anterior',()=>{
 localStorage.setItem('token','antigo');localStorage.setItem('user',JSON.stringify({tipo:'admin'}));
 fetch.mockImplementation(()=>new Promise(()=>{}));
 render(<AuthProvider><Login/></AuthProvider>);
 expect(screen.getByText('Fazer Login')).toBeInTheDocument();
});
test('validação atrasada da sessão anterior não remove um novo login',async()=>{
 let responderPerfil;
 localStorage.setItem('token','antigo');localStorage.setItem('user',JSON.stringify({tipo:'admin'}));
 fetch.mockImplementation((url)=>{
   if(url.endsWith('/admin/me')) return new Promise(resolve=>{responderPerfil=resolve;});
   if(url.endsWith('/login')) return Promise.resolve({ok:true,json:async()=>({access_token:'novo',tipo:'admin',nome:'Gestor'})});
   return Promise.resolve({ok:true,json:async()=>[]});
 });
 function NewLogin(){const {login,user}=useAuth();return <><button onClick={()=>login({email:'a@b.com',senha:'senha',UserType:'Administrador'})}>Entrar</button><span>{user?.nome}</span></>;}
 render(<AuthProvider><NewLogin/></AuthProvider>);
 fireEvent.click(screen.getByText('Entrar'));
 await waitFor(()=>expect(localStorage.getItem('token')).toBe('novo'));
 responderPerfil({ok:false,status:401});
 await waitFor(()=>expect(screen.getByText('Gestor')).toBeInTheDocument());
 expect(localStorage.getItem('token')).toBe('novo');
});
