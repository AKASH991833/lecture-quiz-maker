# Python/NLP version (spaCy)

> Part of **[lecture-quiz-maker](https://github.com/AKASH991833/lecture-quiz-maker)** — live browser demo: https://akash991833.github.io/lecture-quiz-maker/ · screenshots in the repo-root `screenshots/` folder.


The Pages demo generates quizzes with regex heuristics. This pipeline uses
spaCy (sentence segmentation, noun-chunk keyphrases, entity recognition) for
better question and distractor selection.

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python quiz.py notes.txt --n 10 --out quiz.json
```

Every question keeps its `source_sentence` so answers are auditable against
the notes — no invented facts.
