"""Lecture Quiz Maker — Streamlit UI with spaCy NLP question generation."""
import random
import re

import streamlit as st

st.set_page_config(page_title="Lecture Quiz Maker", page_icon="🎓")
st.title("🎓 Lecture Quiz Maker")
st.caption("spaCy NLP question generation, served live · [Browser demo](https://akash991833.github.io/lecture-quiz-maker/) · [Code](https://github.com/AKASH991833/lecture-quiz-maker)")

@st.cache_resource
def load_nlp():
    import spacy
    return spacy.load("en_core_web_sm")

text = st.text_area("Paste lecture notes or a transcript", height=220,
                    placeholder="Photosynthesis is the process by which green plants ...")
n_q = st.slider("Number of questions", 3, 15, 8)

if st.button("Generate quiz", type="primary") and text.strip():
    nlp = load_nlp()
    doc = nlp(text[:100_000])
    sents = [s.text.strip() for s in doc.sents if 30 <= len(s.text) <= 300]
    chunks = list({c.text.strip() for c in doc.noun_chunks
                   if 2 <= len(c.text.split()) <= 5 and not c.text.lower().startswith(
                       ("this", "that", "these", "those", "it", "they"))})
    ents = [e.text for e in doc.ents if e.label_ in ("PERSON", "ORG", "GPE", "DATE", "PERCENT", "CARDINAL")]
    vocab = sorted(set(chunks + ents), key=len, reverse=True)

    rng = random.Random(42)
    quiz = []
    for s in sents:
        if len(quiz) >= n_q:
            break
        hit = next((v for v in vocab if v.lower() in s.lower()), None)
        if not hit:
            continue
        distractors = [v for v in vocab if v != hit and v.lower() not in s.lower()]
        rng.shuffle(distractors)
        options = [hit] + distractors[:3]
        rng.shuffle(options)
        quiz.append({"q": "Complete: " + re.sub(re.escape(hit), "____", s, count=1, flags=re.I),
                     "options": options, "answer": hit})

    if not quiz:
        st.warning("Not enough usable sentences — paste a longer, factual text.")
    for i, item in enumerate(quiz, 1):
        with st.container(border=True):
            st.markdown(f"**Q{i}.** {item['q']}")
            choice = st.radio("Pick one", item["options"], key=f"q{i}", index=None, label_visibility="collapsed")
            if choice:
                (st.success if choice == item["answer"] else st.error)(
                    f"{'Correct!' if choice == item['answer'] else 'Answer: ' + item['answer']}")

st.info("Questions are cloze-style, built from noun phrases and named entities in your text. "
        "Great for revision; review before using in graded material.", icon="ℹ️")
