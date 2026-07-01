"""Regex-based JEE/NEET question parser. Zero AI calls."""
import re
from typing import List, Dict, Optional

# Question start: "Q.1", "Q1.", "Q 1)", "1.", "1)" at line start
Q_START = re.compile(r"(?m)^\s*(?:Q\s*\.?\s*)?(\d{1,3})\s*[\.\)]\s+")

# Options: matches (A) | A) | A. | (A). — NTA and other formats
OPT_RE = re.compile(
    r"(?m)(?:^|\s)\(?([ABCD])\)?[\.\)]\s+(.+?)(?=(?:\s*\(?[ABCD]\)?[\.\)]\s)|$)",
    re.M | re.S,
)

# Inline answer: "Ans: B" / "Answer: (C)" / "Correct: D"
ANS_INLINE = re.compile(r"(?:Ans(?:wer)?|Correct)\s*[:\-]?\s*\(?([ABCD])\)?", re.I)

# Standalone answer key rows: "1. A" "2-B" "3) C"
ANS_KEY_ROW = re.compile(r"\b(\d{1,3})\s*[\.\)\-:]\s*\(?([ABCD])\)?")

DIAGRAM_RX = re.compile(
    r"\b(figure|fig\.?|diagram|graph|circuit|shown\s+below|shown\s+above|"
    r"following\s+(?:figure|diagram|graph)|in\s+the\s+figure)\b",
    re.I,
)

INTEGER_RX = re.compile(r"\b(integer|numerical\s+value|nearest\s+integer)\b", re.I)
ASSERTION_RX = re.compile(r"\b(assertion|reason)\b", re.I)

SUBJECT_HEADERS = {
    "PHYSICS": "Physics",
    "CHEMISTRY": "Chemistry",
    "MATHEMATICS": "Maths",
    "MATHS": "Maths",
    "MATH": "Maths",
}


def _guess_subject(running_subject: str, line: str) -> str:
    up = line.strip().upper()
    for k, v in SUBJECT_HEADERS.items():
        if k in up and len(up) < 60:
            return v
    return running_subject


def _has_options_nearby(text: str, from_pos: int, window: int = 800) -> bool:
    """Filter false-positive question starts (e.g. numbered lists inside a stem)."""
    snippet = text[from_pos : from_pos + window]
    return bool(re.search(r"\(?[ABCD]\)?[\.\)]\s", snippet)) or bool(
        INTEGER_RX.search(snippet)
    )


def parse_questions(pages: List[Dict]) -> Dict:
    stitched = []
    page_starts = []  # (offset, page_number)
    offset = 0
    for p in pages:
        page_starts.append((offset, p["page_number"]))
        stitched.append(p["text"])
        offset += len(p["text"]) + 2
    full = "\n\n".join(stitched)

    def page_for_offset(off: int) -> int:
        cur = page_starts[0][1] if page_starts else 1
        for o, pn in page_starts:
            if off >= o:
                cur = pn
            else:
                break
        return cur

    # Standalone answer-key section
    ext_answer_key: Dict[str, str] = {}
    ak_match = re.search(r"\bANSWER\s*KEY\b", full, re.I)
    if ak_match:
        tail = full[ak_match.end() : ak_match.end() + 6000]
        for m in ANS_KEY_ROW.finditer(tail):
            ext_answer_key.setdefault(m.group(1), m.group(2).upper())

    # Question starts with option-window validation
    raw_starts = [(m.start(), int(m.group(1)), m.end()) for m in Q_START.finditer(full)]
    validated = [(s, n) for s, n, e in raw_starts if _has_options_nearby(full, e)]

    # Filter unrealistic numbering jumps
    cleaned = []
    last_num = 0
    for s, n in validated:
        if not cleaned:
            cleaned.append((s, n))
            last_num = n
            continue
        if 0 < n - last_num <= 5 or n == last_num + 1:
            cleaned.append((s, n))
            last_num = n
        elif n == 1 and last_num > 30:
            cleaned.append((s, n))
            last_num = n
    starts = cleaned

    questions: List[Dict] = []
    running_subject = "Physics"
    for i, (start, qnum) in enumerate(starts):
        end = starts[i + 1][0] if i + 1 < len(starts) else min(len(full), start + 4000)
        block = full[start:end]

        head_region = full[max(0, start - 200) : start]
        for line in head_region.splitlines():
            running_subject = _guess_subject(running_subject, line)

        body = re.sub(r"^\s*(?:Q\s*\.?\s*)?\d{1,3}\s*[\.\)]\s+", "", block, count=1)

        opts = {"A": "", "B": "", "C": "", "D": ""}
        first_opt_idx: Optional[int] = None
        for m in OPT_RE.finditer(body):
            letter = m.group(1).upper()
            text = m.group(2).strip()
            if letter in opts and not opts[letter]:
                opts[letter] = text[:500]
            if first_opt_idx is None:
                first_opt_idx = m.start()

        question_text = body[:first_opt_idx].strip() if first_opt_idx else body.strip()

        correct = None
        am = ANS_INLINE.search(body)
        if am:
            correct = am.group(1).upper()
        if not correct:
            correct = ext_answer_key.get(str(qnum))

        has_options = any(v.strip() for v in opts.values())
        if ASSERTION_RX.search(question_text):
            qtype = "AssertionReason"
        elif INTEGER_RX.search(question_text) and not has_options:
            qtype = "Integer"
        elif has_options:
            qtype = "MCQ"
        else:
            qtype = "Numerical"

        questions.append(
            {
                "questionNumber": qnum,
                "subject": running_subject,
                "chapter": "General",
                "question": question_text[:4000],
                "options": opts,
                "correctAnswer": correct,
                "type": qtype,
                "hasDiagram": bool(DIAGRAM_RX.search(question_text)),
                "pdfPageNumber": page_for_offset(start),
            }
        )

    # Dedupe by number
    seen = set()
    deduped = []
    for q in questions:
        if q["questionNumber"] in seen:
            continue
        seen.add(q["questionNumber"])
        deduped.append(q)

    counts: Dict[str, int] = {}
    for q in deduped:
        counts[q["subject"]] = counts.get(q["subject"], 0) + 1

    return {
        "examTitle": "Extracted Test",
        "questions": deduped,
        "totalExtracted": len(deduped),
        "subjectCounts": counts,
        "answerKey": ext_answer_key,
    }


def parse_answer_key_only(pages: List[Dict]) -> Dict[str, str]:
    full = "\n".join(p["text"] for p in pages)
    out: Dict[str, str] = {}
    for m in ANS_KEY_ROW.finditer(full):
        out.setdefault(m.group(1), m.group(2).upper())
    return out
