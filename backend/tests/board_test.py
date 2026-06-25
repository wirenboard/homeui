import unittest
from unittest.mock import MagicMock, patch

from wb.homeui_backend.board import of_machine_match


class OfMachineMatchTest(unittest.TestCase):
    def test_returns_true_when_probe_exits_zero(self):
        """A zero wb-utils exit code is reported as a positive match, with the compatible
        string passed through to of_machine_match run via bash and check disabled."""
        result = MagicMock()
        result.returncode = 0
        with patch("wb.homeui_backend.board.subprocess.run", return_value=result) as run:
            self.assertTrue(of_machine_match("wirenboard,wirenboard-85x"))

        args, kwargs = run.call_args
        self.assertEqual(args[0][:2], ["/bin/bash", "-c"])
        self.assertIn('"wirenboard,wirenboard-85x"', args[0][2])
        self.assertFalse(kwargs["check"])

    def test_returns_false_when_probe_exits_nonzero(self):
        """A non-zero wb-utils exit code means the board does not match."""
        result = MagicMock()
        result.returncode = 1
        with patch("wb.homeui_backend.board.subprocess.run", return_value=result):
            self.assertFalse(of_machine_match("contactless,imx6ul-wirenboard60"))
