from io import BytesIO
import sys
from pathlib import Path
from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import core
from routers import backup, capas, emprestimos, relatorios, ficha_catalografica

class Query:
    def __init__(self,data): self.data=data;self.start=0;self.end=len(data)-1;self.orders=[]
    def select(self,*args):return self
    def in_(self,*args):return self
    def order(self,col):self.orders.append(col);return self
    def range(self,start,end):self.start=start;self.end=end;return self
    def execute(self):return SimpleNamespace(data=self.data[self.start:self.end+1])
class DB:
    def __init__(self,data):self.data=data
    def table(self,*args):return Query(self.data)

def test_paging_more_than_supabase_limit():
    rows=[{'idUsuario':i} for i in range(255)]
    assert core.consultar_completo(lambda:Query(rows),'Usuario').data==rows

def test_public_account_never_contains_credentials():
    assert core.conta_publica({'idUsuario':1,'usuSenha':'hash','usuTokenVersion':3,'newSecret':'secret'})=={'idUsuario':1}

def test_password_policy_is_enforced(monkeypatch):
    monkeypatch.setattr(core,'supabase',DB([{'chave':'tamanho_minimo_senha','valor':'10'},{'chave':'exigir_senha_forte','valor':'true'}]))
    with pytest.raises(HTTPException) as ex:core.hash_password('password12')
    assert ex.value.status_code==422
    senha='Password@12';assert core.verify_password(senha,core.hash_password(senha))

def test_password_policy_fails_closed(monkeypatch):
    monkeypatch.setattr(core,'supabase',SimpleNamespace(table=lambda *_:(_ for _ in ()).throw(RuntimeError())))
    with pytest.raises(HTTPException) as ex:core.hash_password('Password@12')
    assert ex.value.status_code==503

def backup_payload():
    import hashlib,json
    dados={t:[] for t in backup.TABELAS}
    return {'versao_backup':3,'dados':dados,'arquivos':{},'contagem_registros':{t:0 for t in dados},'hash_dados':hashlib.sha256(json.dumps(dados,ensure_ascii=False,sort_keys=True,default=str).encode()).hexdigest()}

def test_backup_rejects_partial_old_or_tampered_payload():
    p=backup_payload();backup._validar_backup(p)
    p['dados']['Usuario'].append({'idUsuario':1})
    with pytest.raises(ValueError):backup._validar_backup(p)
    p=backup_payload();p['versao_backup']=2
    with pytest.raises(ValueError):backup._validar_backup(p)
    p=backup_payload();p['hash_dados']='0'*64
    with pytest.raises(ValueError):backup._validar_backup(p)

def test_backup_checks_every_row_not_just_first():
    p=backup_payload();p['dados']['Usuario']=[{'idUsuario':1},'invalid'];p['contagem_registros']['Usuario']=2
    with pytest.raises(ValueError):backup._validar_backup(p)

def test_backup_file_names_prevent_paths():
    backup._validar_nome('backup_20261007_123456_1234567890abcdef1234567890abcdef.json.gz')
    with pytest.raises(HTTPException):backup._validar_nome('../another/object')

def test_corrupted_image_is_rejected():
    with pytest.raises(HTTPException):capas._comprimir_capa(b'<script>alert(1)</script>','png','image/png')

def test_image_is_reencoded_and_mime_is_detected():
    b=BytesIO();Image.new('RGB',(10,10)).save(b,format='PNG')
    data,ext,mime=capas._comprimir_capa(b.getvalue(),'gif','text/html')
    assert ext=='webp' and mime=='image/webp'
    assert Image.open(BytesIO(data)).format=='WEBP'

@pytest.mark.parametrize('ip',['127.0.0.1','169.254.169.254','10.0.0.1','::1','0.0.0.0'])
def test_cover_proxy_blocks_nonpublic_dns(monkeypatch,ip):
    monkeypatch.setattr(capas.socket,'getaddrinfo',lambda *a,**kw:[(2,1,6,'',(ip,443))])
    with pytest.raises(HTTPException):capas._resolver_host_seguro('test.example',443)

def test_cdd_html_escapes_untrusted_text():
    html=ficha_catalografica.formatar_ficha_html('<img src=x onerror=alert(1)>','<script>bad</script>','','','',[],[],'100')
    assert '<img src=x' not in html and '<script>' not in html and '&lt;script&gt;' in html

def test_public_config_omits_secrets(monkeypatch):
    monkeypatch.setattr(emprestimos,'consultar_completo',lambda *a:SimpleNamespace(data=[{'chave':'smtp_senha','valor':'secret'},{'chave':'dias_emprestimo','valor':'14'}]))
    assert emprestimos.listar_configuracoes(None)==[{'chave':'dias_emprestimo','valor':'14'}]

def test_report_counts_all_copies_and_separates_professors(monkeypatch):
    itens=[{'idUsuario':None,'idAdminProfessor':idprof,'idLivro':1,'titulo':'Livro','usuario':str(idprof),'turma':'A','serie':'6º Ano','status':'ativo'} for idprof in (2,3,3)]
    monkeypatch.setattr(relatorios,'_buscar_itens_emprestimos',lambda **kw:itens)
    result=relatorios.relatorio_emprestimos(agrupador='usuario',admin={})
    assert result['resumo']=={'ativos':3,'atrasados':0,'devolvidos':0,'total':3}
    assert len(result['ranking'])==2
