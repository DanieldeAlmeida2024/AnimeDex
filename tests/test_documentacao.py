import unittest
from pathlib import Path
RAIZ = Path(__file__).resolve().parents[1]
class TestesDocumentacao(unittest.TestCase):
    def test_arquivos(self):
        for nome in ('README.md','AGENTS.md','docs/REQUISITOS.md','docs/ARQUITETURA.md','docs/UML.puml','docs/PLANO_TESTES.md'):
            with self.subTest(nome=nome): self.assertTrue((RAIZ/nome).is_file(), nome)
    def test_uml(self):
        conteudo=(RAIZ/'docs/UML.puml').read_text(encoding='utf-8')
        self.assertIn('@startuml',conteudo)
        self.assertIn('@enduml',conteudo)
