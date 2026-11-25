import sqlite3
import unittest

from major import compound_words, decode_word, ensure_personal_words, segment


class CompoundWordTests(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        ensure_personal_words(self.conn)
        self.conn.execute("CREATE TABLE words (word TEXT, digits TEXT, score REAL)")
        self.conn.executemany(
            "INSERT INTO words (word, digits, score) VALUES (?, ?, ?)",
            [
                ("map", "39", 8.0), ("boy", "9", 8.0), ("ma", "3", 7.0), ("pipe", "99", 7.0),
                ("tar", "14", 8.0), ("tile", "15", 8.0),
            ],
        )

    def tearDown(self):
        self.conn.close()

    def test_blends_two_real_words(self):
        words = [c["word"] for c in compound_words(self.conn, "399")]
        self.assertIn("mapboy", words)
        self.assertIn("mapipe", words)

    def test_blend_reports_its_parts(self):
        best = compound_words(self.conn, "399")[0]
        self.assertEqual("".join(best["parts"]), best["word"])

    def test_blend_decodes_back_to_the_digits(self):
        for item in compound_words(self.conn, "399"):
            digits = [o["digits"] for o in decode_word(item["word"], compound=True)]
            self.assertIn("399", digits)

    def test_gap_in_a_three_digit_group_is_filled(self):
        chunks = segment(self.conn, "399", target=3)
        self.assertEqual([c["digits"] for c in chunks], ["399"])
        self.assertEqual(chunks[0]["word"], "mapboy")
        self.assertEqual(chunks[0]["hints"]["mapboy"], "map + boy")

    def test_compounds_can_be_switched_off(self):
        chunks = segment(self.conn, "399", target=3, compounds=False)
        self.assertEqual(chunks[0]["word"], "")

    def test_two_digit_gaps_stay_empty(self):
        chunks = segment(self.conn, "88", target=2)
        self.assertEqual(chunks[0]["word"], "")

    def test_group_boundaries_do_not_move(self):
        chunks = segment(self.conn, "399141", target=3)
        self.assertEqual([c["digits"] for c in chunks], ["399", "141"])

    def test_real_word_beats_a_blend(self):
        self.conn.execute("INSERT INTO words VALUES ('mop', '39', 6.0)")
        chunks = segment(self.conn, "39", target=2)
        self.assertEqual(chunks[0]["word"], "map")


if __name__ == "__main__":
    unittest.main()
