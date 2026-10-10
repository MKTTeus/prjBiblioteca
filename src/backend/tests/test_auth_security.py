import sys
from pathlib import Path
from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from jose import jwt
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import core
from routers import auth
from schemas import Login

class DB:
    def __init__(self, account): self.account = account
    def table(self, name): self.name = name; return self
    def select(self, columns): self.columns = columns; return self
    def eq(self, *args): return self
    def limit(self, *args): return self
    def execute(self):
        row = {'epoch': 'epoch-1'} if self.name == 'SegurancaSessao' else self.account
        return SimpleNamespace(data=[] if row is None else [row if self.columns == '*' else {k: row[k] for k in self.columns.split(', ') if k in row}])

def account(**kwargs):
    return {'idUsuario': 1, 'usuEmail': 'user@example.com', 'usuTipo': 'Aluno', 'usuStatus': True,
            'usuExcluido': False, 'usuSenhaProvisoria': False, 'usuTokenVersion': 4, 'usuSenha': 'fake', 'usuNome': 'Aluno', **kwargs}

def token(**kwargs):
    return jwt.encode({'sub': 'user@example.com', 'tipo': 'Aluno', 'tv': 4, 'epoch': 'epoch-1', **kwargs}, core.SECRET_KEY, algorithm='HS256')

def test_login_emits_current_version(monkeypatch):
    db = DB(account()); monkeypatch.setattr(auth, 'supabase', db); monkeypatch.setattr(core, 'supabase', db)
    monkeypatch.setattr(auth, 'verify_password', lambda *args: True)
    monkeypatch.setattr(auth, 'limitar_login', lambda *args: None)
    monkeypatch.setattr(core, 'get_session_timeout_minutes', lambda: 30)
    result = auth.login(Login(email='user@example.com', senha='password', UserType='Aluno'), SimpleNamespace())
    assert jwt.decode(result['access_token'], core.SECRET_KEY, algorithms=['HS256'])['tv'] == 4

@pytest.mark.parametrize('changes', [{'usuStatus': False}, {'usuExcluido': True}, {'usuTokenVersion': 5}])
def test_rejects_revoked_account(monkeypatch, changes):
    monkeypatch.setattr(core, 'supabase', DB(account(**changes)))
    with pytest.raises(HTTPException) as exc: core.get_user(token())
    assert exc.value.status_code == 401

def test_missing_account_fails_closed(monkeypatch):
    monkeypatch.setattr(core, 'supabase', DB(None))
    with pytest.raises(HTTPException): core.get_user(token())

def test_restore_epoch_revokes_tokens(monkeypatch):
    monkeypatch.setattr(core, 'supabase', DB(account()))
    with pytest.raises(HTTPException): core.get_user(token(epoch='old'))

def test_provisional_password_is_restricted(monkeypatch):
    monkeypatch.setattr(core, 'supabase', DB(account(usuSenhaProvisoria=True)))
    assert core.get_user_profile(token())['senhaProvisoria']
    with pytest.raises(HTTPException) as exc: core.get_user(token())
    assert exc.value.status_code == 403

def test_admin_can_list_loans_but_professor_cannot(monkeypatch):
    adm = {'idAdmin': 1, 'admEmail': 'user@example.com', 'admStatus': True, 'admProfessor': False, 'admTokenVersion': 4}
    monkeypatch.setattr(core, 'supabase', DB(adm))
    assert core.get_loan_reader(token(tipo='admin'))['id'] == 1
    adm['admProfessor'] = True
    with pytest.raises(HTTPException): core.get_loan_reader(token(tipo='admin', admProfessor=False))

def test_optional_auth_is_optional():
    assert core.get_optional_user(None) is None

def test_password_minimum():
    with pytest.raises(HTTPException): core.hash_password('x')
    with pytest.raises(HTTPException): core.hash_password('á' * 40)
