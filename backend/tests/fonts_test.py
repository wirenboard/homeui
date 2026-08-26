import os
import shutil
import tempfile
import unittest

from wb.homeui_backend.fonts import FontsStore


class FontsStoreTest(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.fonts_dir = os.path.join(self.tmp_dir, "fonts")
        self.addCleanup(shutil.rmtree, self.tmp_dir, ignore_errors=True)
        self.store = FontsStore(fonts_dir=self.fonts_dir)

    def test_list_empty(self):
        self.assertEqual(self.store.list_fonts(), [])

    def test_save_and_list(self):
        self.store.save_font("MyFont.ttf", b"fake-ttf-data")
        fonts = self.store.list_fonts()
        self.assertEqual(len(fonts), 1)
        self.assertEqual(fonts[0]["name"], "MyFont.ttf")
        self.assertEqual(fonts[0]["size"], len(b"fake-ttf-data"))

    def test_save_returns_info(self):
        result = self.store.save_font("Test.woff2", b"woff2-data")
        self.assertEqual(result, {"name": "Test.woff2", "size": len(b"woff2-data")})

    def test_save_bad_extension(self):
        with self.assertRaises(ValueError):
            self.store.save_font("bad.txt", b"data")

    def test_save_accepts_all_allowed_extensions(self):
        for ext in (".ttf", ".woff", ".woff2", ".otf"):
            self.store.save_font(f"font{ext}", b"data")

    def test_delete_existing(self):
        self.store.save_font("ToDelete.ttf", b"data")
        self.assertTrue(self.store.delete_font("ToDelete.ttf"))
        self.assertEqual(self.store.list_fonts(), [])

    def test_delete_nonexistent(self):
        self.assertFalse(self.store.delete_font("NoSuchFont.ttf"))

    def test_overwrite(self):
        self.store.save_font("Font.ttf", b"old")
        self.store.save_font("Font.ttf", b"new-data")
        fonts = self.store.list_fonts()
        self.assertEqual(len(fonts), 1)
        self.assertEqual(fonts[0]["size"], len(b"new-data"))

    def test_list_sorted_by_name(self):
        self.store.save_font("Zebra.ttf", b"z")
        self.store.save_font("Alpha.woff", b"a")
        self.store.save_font("Middle.otf", b"m")
        names = [f["name"] for f in self.store.list_fonts()]
        self.assertEqual(names, ["Alpha.woff", "Middle.otf", "Zebra.ttf"])

    def test_creates_directory(self):
        """The store creates its directory on construction."""
        new_dir = os.path.join(self.tmp_dir, "new-fonts")
        FontsStore(fonts_dir=new_dir)
        self.assertTrue(os.path.isdir(new_dir))
