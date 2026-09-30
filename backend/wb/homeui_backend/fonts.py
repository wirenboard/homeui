import os

# OpenType sfnt versions (TrueType 0x00010000 and CFF "OTTO"):
# https://learn.microsoft.com/en-us/typography/opentype/spec/otff
# Legacy Apple TrueType "true" scaler signature:
# https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6AATIntro.html
# WOFF and WOFF2 magic numbers:
# https://www.w3.org/TR/WOFF/ and https://www.w3.org/TR/WOFF2/
_FONT_SIGNATURES = {
    ".ttf": (b"\x00\x01\x00\x00", b"true"),
    ".otf": (b"OTTO",),
    ".woff": (b"wOFF",),
    ".woff2": (b"wOF2",),
}
ALLOWED_EXTENSIONS = set(_FONT_SIGNATURES)
DEFAULT_FONTS_DIR = "/var/lib/wb-homeui/fonts/"


class FontsStore:
    def __init__(self, fonts_dir: str = DEFAULT_FONTS_DIR):
        self._fonts_dir = fonts_dir
        os.makedirs(self._fonts_dir, exist_ok=True)

    def list_fonts(self) -> list:
        try:
            entries = os.listdir(self._fonts_dir)
        except OSError:
            return []
        result = []
        for name in sorted(entries):
            path = os.path.join(self._fonts_dir, name)
            if os.path.isfile(path):
                result.append({"name": name, "size": os.path.getsize(path)})
        return result

    def save_font(self, filename: str, data: bytes) -> dict:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported font extension: {ext}")
        if not data.startswith(_FONT_SIGNATURES[ext]):
            raise ValueError(f"File content does not match font extension: {ext}")
        path = os.path.join(self._fonts_dir, filename)
        with open(path, "wb") as f:
            f.write(data)
        return {"name": filename, "size": len(data)}

    def delete_font(self, filename: str) -> bool:
        path = os.path.join(self._fonts_dir, filename)
        try:
            os.remove(path)
            return True
        except FileNotFoundError:
            return False
