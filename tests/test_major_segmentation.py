import sqlite3
import unittest

from major import segment


class FixedWidthSegmentationTests(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute(
            "CREATE TABLE words (word TEXT, digits TEXT, score REAL)"
        )
        self.conn.executemany(
            "INSERT INTO words (word, digits, score) VALUES (?, ?, ?)",
            [
                ("tar", "14", 8.0), ("tile", "15", 8.0),
                ("pan", "92", 8.0), ("jail", "65", 8.0),
                ("mail", "35", 8.0), ("leafbuoy", "589", 8.0),
                ("tarot", "141", 8.0), ("plan", "592", 8.0),
                ("slim", "653", 8.0), ("lifebuoy", "589", 8.0),
                ("tire", "14", 7.0), ("tile", "15", 7.0),
                ("panel", "925", 7.0),
                ("tarot", "1415", 7.0), ("plaid", "9265", 7.0),
                ("flamb", "3589", 7.0),
            ],
        )

    def tearDown(self):
        self.conn.close()

    def test_two_digit_groups_are_fixed(self):
        chunks = segment(self.conn, "141592653589", target=2)
        self.assertEqual(
            [item["digits"] for item in chunks],
            ["14", "15", "92", "65", "35", "89"],
        )

    def test_three_digit_groups_are_fixed(self):
        chunks = segment(self.conn, "141592653589", target=3)
        self.assertEqual(
            [item["digits"] for item in chunks],
            ["141", "592", "653", "589"],
        )

    def test_four_digit_groups_are_fixed(self):
        chunks = segment(self.conn, "141592653589", target=4)
        self.assertEqual(
            [item["digits"] for item in chunks],
            ["1415", "9265", "3589"],
        )

    def test_final_short_chunk_is_kept(self):
        chunks = segment(self.conn, "12345", target=2)
        self.assertEqual(
            [item["digits"] for item in chunks],
            ["12", "34", "5"],
        )

    def test_missing_word_does_not_change_group_boundaries(self):
        chunks = segment(self.conn, "141592653589", target=2)
        self.assertEqual(chunks, [])

    def test_invalid_target_is_rejected(self):
        with self.assertRaises(ValueError):
            segment(self.conn, "1234", target=5)


if __name__ == "__main__":
    unittest.main()
