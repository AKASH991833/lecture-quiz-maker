# Python/NLP version (spaCy)

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
