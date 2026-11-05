"""Parser regression checks. Run with the same Python environment as build-book-library.py."""
import unittest
from pathlib import Path

from importlib.util import spec_from_file_location, module_from_spec
spec = spec_from_file_location("book_builder", Path(__file__).with_name("build-book-library.py"))
builder = module_from_spec(spec)
spec.loader.exec_module(builder)

SAMPLE = """AZOTAMENTES
Aberración Mediana, legal malvado
Clase de Armadura: 15 (coraza)
Puntos de golpe: 71 (13d8 + 13)
Velocidad: 30 pies
FUE DES CON INT SAB CAR
11 (+0) 12 (+1) 12 (+1) 19 (+4) 17 (+3) 17 (+3)
Tiradas de salvación: Int +7, Sab +6,
Car +6
Habilidades: Conocimiento Arcano +7
Sentidos: Percepción pasiva 16
Idiomas: habla de las profundidades
Desafío: 7 (2.900 PX)
ACCIONES
Tentáculos. Ataque con arma cuerpo a cuerpo: +7 a impactar.
"""
BOOK = {"id": "test", "title": "Manual de Monstruos", "edition": "2014", "origin": "official"}


class ParserTest(unittest.TestCase):
    def test_core_stats_with_wrapped_saves(self):
        [monster] = builder.parse_monsters(SAMPLE, BOOK, 26)
        self.assertEqual(monster["ab"], [11, 12, 12, 19, 17, 17])
        self.assertEqual(monster["saves"], "Int +7, Sab +6, Car +6")
        self.assertEqual(monster["page"], 26)
        self.assertEqual(monster["hd"], "13d8+13")
        self.assertEqual(monster["actions"], [])

    def test_ocr_and_missing_stats_are_not_guessed(self):
        for before, after in [("71 (13d8 + 13)", "710 (13d8 + 13)"),
                              ("19 (+4)", "19 (+9)"), ("2.900 PX", "290 PX"),
                              ("FUE DES CON INT SAB CAR", "FUE CON DES INT SAB CAR")]:
            self.assertEqual(builder.parse_monsters(SAMPLE.replace(before, after), BOOK, 26), [])

    def test_broken_plus_glyph_requires_the_correct_printed_hp(self):
        self.assertEqual(len(builder.parse_monsters(SAMPLE.replace('13d8 + 13', '13d8-+-13'), BOOK, 26)), 1)
        self.assertEqual(builder.parse_monsters(SAMPLE.replace('13d8 + 13', '13d8-+-13').replace('71 (', '72 ('), BOOK, 26), [])

    def test_other_editions_and_homebrew_are_references(self):
        for field, value in [("edition", "2024"), ("origin", "third-party"), ("origin", "unverified")]:
            self.assertEqual(builder.parse_monsters(SAMPLE, {**BOOK, field: value}, 26), [])

    def test_folder_classification(self):
        self.assertEqual(builder.classify(Path("5.5 E/Manual.pdf"))[0], "2024")
        self.assertEqual(builder.classify(Path("5ta Edicion/Suplementos/Bestiarios/Homebrew/Test.pdf")), ("2014", "third-party", "creatures"))
        self.assertEqual(builder.classify(Path("3E y 3.5E/Manual.pdf"))[0], "3.5")


if __name__ == "__main__":
    unittest.main()
