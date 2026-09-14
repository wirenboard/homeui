import os
import shutil
import tempfile
import unittest

from wb.homeui_backend.fonts import FontsStore

FONT_DATA_BY_EXTENSION = {
    ".ttf": b"\x00\x01\x00\x00ttf-data",
    ".otf": b"OTTOotf-data",
    ".woff": b"wOFFwoff-data",
    ".woff2": b"wOF2woff2-data",
}


class FontsStoreTest(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.fonts_dir = os.path.join(self.tmp_dir, "fonts")
        self.addCleanup(shutil.rmtree, self.tmp_dir, ignore_errors=True)
        self.store = FontsStore(fonts_dir=self.fonts_dir)

    def test_list_empty(self):
        self.assertEqual(self.store.list_fonts(), [])

    def test_save_and_list(self):
        self.store.save_font("MyFont.ttf", FONT_DATA_BY_EXTENSION[".ttf"])
        fonts = self.store.list_fonts()
        self.assertEqual(len(fonts), 1)
        self.assertEqual(fonts[0]["name"], "MyFont.ttf")
        self.assertEqual(fonts[0]["size"], len(FONT_DATA_BY_EXTENSION[".ttf"]))

    def test_save_returns_info(self):
        result = self.store.save_font("Test.woff2", FONT_DATA_BY_EXTENSION[".woff2"])
        self.assertEqual(result, {"name": "Test.woff2", "size": len(FONT_DATA_BY_EXTENSION[".woff2"])})

    def test_save_bad_extension(self):
        with self.assertRaises(ValueError):
            self.store.save_font("bad.txt", b"data")

    def test_save_accepts_all_allowed_extensions(self):
        for ext, data in FONT_DATA_BY_EXTENSION.items():
            self.store.save_font(f"font{ext}", data)

    def test_save_rejects_non_font_content(self):
        with self.assertRaisesRegex(ValueError, "File content does not match font extension: .ttf"):
            self.store.save_font("NotAFont.ttf", b"not-font-data")
        self.assertEqual(self.store.list_fonts(), [])

    def test_save_rejects_font_content_with_mismatched_extension(self):
        with self.assertRaisesRegex(ValueError, "File content does not match font extension: .ttf"):
            self.store.save_font("WrongFormat.ttf", FONT_DATA_BY_EXTENSION[".woff"])
        self.assertEqual(self.store.list_fonts(), [])

    def test_delete_existing(self):
        self.store.save_font("ToDelete.ttf", FONT_DATA_BY_EXTENSION[".ttf"])
        self.assertTrue(self.store.delete_font("ToDelete.ttf"))
        self.assertEqual(self.store.list_fonts(), [])

    def test_delete_nonexistent(self):
        self.assertFalse(self.store.delete_font("NoSuchFont.ttf"))

    def test_overwrite(self):
        self.store.save_font("Font.ttf", b"\x00\x01\x00\x00old")
        self.store.save_font("Font.ttf", b"\x00\x01\x00\x00new-data")
        fonts = self.store.list_fonts()
        self.assertEqual(len(fonts), 1)
        self.assertEqual(fonts[0]["size"], len(b"\x00\x01\x00\x00new-data"))

    def test_list_sorted_by_name(self):
        self.store.save_font("Zebra.ttf", FONT_DATA_BY_EXTENSION[".ttf"])
        self.store.save_font("Alpha.woff", FONT_DATA_BY_EXTENSION[".woff"])
        self.store.save_font("Middle.otf", FONT_DATA_BY_EXTENSION[".otf"])
        names = [f["name"] for f in self.store.list_fonts()]
        self.assertEqual(names, ["Alpha.woff", "Middle.otf", "Zebra.ttf"])

    def test_creates_directory(self):
        """The store creates its directory on construction."""
        new_dir = os.path.join(self.tmp_dir, "new-fonts")
        FontsStore(fonts_dir=new_dir)
        self.assertTrue(os.path.isdir(new_dir))
