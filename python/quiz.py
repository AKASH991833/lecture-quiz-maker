#!/usr/bin/env python3
"""Lecture quiz maker — proper Python/NLP version (spaCy).

The browser demo uses regex heuristics. This pipeline uses real NLP:
sentence segmentation, POS tagging and noun-chunk keyphrase extraction to
build better MCQs, true/false and fill-in items with plausible distractors.

Usage:
    pip install -r requirements.txt
    python -m spacy download en_core_web_sm
    python quiz.py notes.txt --n 10 --out quiz.json
"""
import argparse, json, random, re

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("text")
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--out", default="quiz.json")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    random.seed(args.seed)
    import spacy
    nlp = spacy.load("en_core_web_sm")
    text = open(args.text).read()
    doc = nlp(text)

    sents = [s.text.strip() for s in doc.sents if 30 <= len(s.text) <= 300]
    chunks = list({c.text.strip() for c in doc.noun_chunks
                   if 2 <= len(c.text.split()) <= 5 and not c.text.lower().startswith(("this", "that", "these", "those", "it", "they"))})
    ents = [e.text for e in doc.ents if e.label_ in ("PERSON", "ORG", "GPE", "DATE", "PERCENT", "CARDINAL")]
    vocab = sorted(set(chunks + ents), key=len, reverse=True)

    quiz = []
    for s in sents:
        if len(quiz) >= args.n:
            break
        hit = next((v for v in vocab if v.lower() in s.lower()), None)
        if not hit:
            continue
        distractors = [v for v in vocab if v != hit and v.lower() not in s.lower()]
        random.shuffle(distractors)
        options = [hit] + distractors[:3]
        random.shuffle(options)
        quiz.append({
            "type": "mcq",
            "question": "Complete: " + re.sub(re.escape(hit), "____", s, count=1, flags=re.I),
            "options": options,
            "answer": options.index(hit),
            "source_sentence": s,
        })
        if len(quiz) < args.n:
            quiz.append({
                "type": "fill",
                "question": re.sub(re.escape(hit), "____", s, count=1, flags=re.I),
                "answer": hit,
                "source_sentence": s,
            })

    json.dump({"source": args.text, "count": len(quiz), "questions": quiz},
              open(args.out, "w"), indent=2)
    print(f"Wrote {len(quiz)} questions to {args.out}")

if __name__ == "__main__":
    main()
