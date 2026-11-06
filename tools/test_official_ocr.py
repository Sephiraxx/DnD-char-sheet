import importlib.util
from pathlib import Path
import sys
import types
import unittest

try:
    import pymupdf
except ImportError:
    sys.modules['pymupdf'] = types.ModuleType('pymupdf')

spec = importlib.util.spec_from_file_location('extractor',Path(__file__).with_name('extract-official-pdfs.py'))
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)


class OCRTests(unittest.TestCase):
    def test_empty_successful_process_is_not_a_valid_ocr_result(self):
        with self.assertRaises(RuntimeError):
            extractor.parse_ocr_tsv('',2)

    def test_line_ids_preserve_order_on_tilted_scans_and_filter_art_noise(self):
        header = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'
        rows = [
            '5\t1\t1\t1\t1\t1\t280\t200\t40\t10\t95\tClase',
            '5\t1\t1\t1\t1\t2\t325\t204\t14\t10\t95\tde',
            '5\t1\t1\t1\t1\t3\t345\t208\t60\t10\t95\tArmadura',
            '5\t1\t1\t1\t1\t4\t265\t198\t10\t10\t12\t4',
        ]
        result = extractor.parse_ocr_tsv(header+'\n'.join(rows),2)
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]['s'],'Clase de Armadura')
        self.assertEqual(result[0]['x'],140)
        self.assertEqual(result[0]['f'],'OCR')


if __name__ == '__main__':
    unittest.main()
