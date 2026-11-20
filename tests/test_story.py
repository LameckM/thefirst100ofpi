import re
import unittest

from major import LINKS, OPENERS, build_story

MARK = re.compile(r"\[\[([^\]|]+)\|?[^\]]*\]\]")
WORDS = ["mapboy", "assessor", "actor", "tulip", "young", "cicero", "zebra", "owl", "igloo"]
DIGITS = ["399", "004", "714", "159", "2", "012", "093", "5", "5"]


class StoryTemplateTests(unittest.TestCase):
    def test_every_template_has_exactly_one_word_slot(self):
        for t in OPENERS + LINKS:
            self.assertEqual(t.count("{B}"), 1, t)

    def test_words_appear_once_each_in_order(self):
        story = build_story(WORDS, DIGITS)
        found = MARK.findall(" ".join(story))
        self.assertEqual(found, WORDS)

    def test_no_word_is_written_outside_its_marker(self):
        # a swapped word must never leave the old one behind in the sentence text
        for variant in range(5):
            text = MARK.sub("", " ".join(build_story(WORDS, DIGITS, variant))).lower()
            for w in WORDS:
                self.assertNotIn(w, text)

    def test_no_article_sits_in_front_of_a_word(self):
        # "a" vs "an" depends on the word, so it would break when the word is swapped
        for variant in range(5):
            text = " ".join(build_story(WORDS, DIGITS, variant))
            self.assertIsNone(re.search(r"\b(a|an)\s+\[\[", text, re.I), text)

    def test_markers_carry_the_digits(self):
        story = " ".join(build_story(["map", "boy"], ["39", "9"]))
        self.assertIn("[[map|39]]", story)
        self.assertIn("[[boy|9]]", story)

    def test_same_input_gives_same_story_and_variants_differ(self):
        self.assertEqual(build_story(WORDS, DIGITS, 0), build_story(WORDS, DIGITS, 0))
        self.assertNotEqual(build_story(WORDS, DIGITS, 0), build_story(WORDS, DIGITS, 1))

    def test_empty_input(self):
        self.assertEqual(build_story([]), [])
        self.assertEqual(build_story(["", ""]), [])

    def test_long_numbers_do_not_run_out_of_templates(self):
        words = [f"w{i}" for i in range(100)]
        story = build_story(words, [""] * 100)
        self.assertEqual(len(story), 100)


if __name__ == "__main__":
    unittest.main()
