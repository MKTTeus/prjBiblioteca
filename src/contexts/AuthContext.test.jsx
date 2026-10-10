import { render,screen,waitFor } from '@testing-library/react';
import { AuthProvider,useAuth } from './AuthContext';
function Probe(){const {user,loadingUser}=useAuth();return <div>{loadingUser ? 'carregando' : user ? `perfil:${user.professor}` : 'sem sessão'}</div>;}
beforeEach(()=>{localStorage.clear();global.fetch=jest.fn();});
test('metadados persistidos cedem ao perfil confirmado pelo servidor',async()=>{
 localStorage.setItem('token','token');localStorage.setItem('user',JSON.stringify({tipo:'admin',professor:false}));
 fetch.mockResolvedValueOnce({ok:true,status:200,json:async()=>({nome:'Professor',email:'prof@example.com',professor:true})}).mockResolvedValueOnce({ok:true,json:async()=>[]});
 render(<AuthProvider><Probe/></AuthProvider>);
 await screen.findByText('perfil:true');
 expect(fetch.mock.calls[0][0]).toContain('/admin/me');
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
