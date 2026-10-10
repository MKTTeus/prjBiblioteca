"""Cria o primeiro gestor de uma instalação nova, usando credenciais do servidor."""
import sys
from pathlib import Path
from getpass import getpass
from pydantic import EmailStr, TypeAdapter
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src/backend'))
from database import supabase
from core import hash_password
if supabase.table('Administrador').select('idAdmin',count='exact',head=True).eq('admStatus',True).eq('admProfessor',False).execute().count:
 sys.exit('Já existe gestor ativo. Use a área administrativa para novos cadastros.')
nome=input('Nome do primeiro gestor: ').strip()
email=str(TypeAdapter(EmailStr).validate_python(input('Email: ').strip())).lower()
if not nome:sys.exit('Nome obrigatório')
senha=getpass('Senha: ')
if senha!=getpass('Repita a senha: '):sys.exit('Senhas diferentes')
supabase.table('Administrador').insert({'admNome':nome,'admEmail':email,'admSenha':hash_password(senha),'admStatus':True,'admProfessor':False}).execute()
print('Gestor criado. Faça login na aplicação; a senha não foi registrada neste terminal.')
