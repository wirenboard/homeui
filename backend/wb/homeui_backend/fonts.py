import os

ALLOWED_EXTENSIONS = {".ttf", ".woff", ".woff2", ".otf"}
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
