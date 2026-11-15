import sqlite3
import unittest
from unittest.mock import patch

from major import (
    delete_personal_word,
    ensure_personal_words,
    personal_words_for,
    save_personal_word,
    segment,
    validate_personal_word,
)


class PersonalWordLibraryTests(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("CREATE TABLE words (word TEXT, digits TEXT, score REAL)")
        self.conn.execute("INSERT INTO words VALUES ('tarot', '141', 8.0)")
        ensure_personal_words(self.conn)

    def tearDown(self):
        self.conn.close()

    def test_save_and_retrieve_personal_word(self):
        save_personal_word(self.conn, "myword", "141")
        self.assertEqual(personal_words_for(self.conn, "141"), ["myword"])

    def test_personal_word_is_prioritized_in_segmentation(self):
        save_personal_word(self.conn, "myword", "141")
        chunks = segment(self.conn, "141", target=3)
        self.assertEqual(chunks[0]["word"], "myword")

    def test_personal_word_is_not_used_for_another_number(self):
        save_personal_word(self.conn, "myword", "141")
        self.assertEqual(personal_words_for(self.conn, "142"), [])

    def test_unknown_word_can_be_saved_as_user_confirmed_mapping(self):
        self.assertEqual(validate_personal_word("wordnotindictionaryxyz", "589"), (True, "custom"))

    def test_known_word_must_match_dictionary_pronunciation(self):
        dictionary_options = [{"digits": "141", "steps": []}]
        with patch("major.decode_word", return_value=dictionary_options):
            self.assertEqual(
                validate_personal_word("testword", "141"),
                (True, "dictionary"),
            )
            valid, mapping = validate_personal_word("testword", "999")
            self.assertFalse(valid)
            self.assertEqual(mapping, "141")

    def test_delete_personal_word(self):
        save_personal_word(self.conn, "myword", "141")
        delete_personal_word(self.conn, "myword", "141")
        self.assertEqual(personal_words_for(self.conn, "141"), [])


if __name__ == "__main__":
    unittest.main()
