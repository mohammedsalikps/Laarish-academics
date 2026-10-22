# Curriculum roadmap

Laarish lessons are original content written for **Classes 1–8**, using the official 2026-27 books as the guide to
learning objectives and order: NCERT under NCF-SE 2023 for Mathematics, Science/The World Around Us, English, Hindi
and Social Science, and Karnataka's KTBS books for Kannada (see [curriculum-sources.md](curriculum-sources.md)).
Every lesson records its source and a label (aligned by chapter title, curriculum-inspired or proposed); nothing
has been reviewed by teachers yet. Current numbers and gaps: [curriculum-audit.md](curriculum-audit.md).
Generated lesson map: [curriculum-status.md](curriculum-status.md).

## Learning hierarchy

```
Home
 └─ Subject (Science, Mathematics, English, Hindi, Kannada, Social Science)
     └─ Class (level ids class-1 … class-8)
         └─ Branch (e.g. Science: Forces and Energy, Materials and Matter, Living Things, Earth, Space and Environment)
             └─ Lesson (ordered within the class branch; each needs the one before it in that branch only)
                 └─ Topic (ordered; unlocks at 60% mastery of the one before)
                     └─ Watch (video or temporary explainer) → Play (mini-game) → Practice (quiz) → Complete
```

- **Stable ids.** Learner progress is stored per topic id, so ids never change. The 24 original topics kept their ids
  and lessons when the curriculum moved to classes; their lessons were placed in the class their verified chapter
  belongs to (for example Friction in Class 8 *Curiosity* "Exploring Forces", Magnets in Class 6 "Exploring Magnets").
- **No cross-class prerequisites.** A learner can start their own class directly. Inside a class, lessons in a branch
  unlock in order and planned lessons always come after playable ones.
- **Migration from grade bands.** Levels were three grade bands (1–2, 3–4, 5–7); they are now one level per class and
  Class 8 was added. Links to the old level ids redirect to the learner's class within the old band (or the band's
  first class). The learner-facing word changed from "Grade" to "Class", matching NCERT and CBSE usage.

## Branches by subject

| Subject | Branches |
|---|---|
| Science | Forces and Energy (physics) · Materials and Matter (chemistry) · Living Things (biology) · Earth, Space and Environment |
| Mathematics | Numbers and Arithmetic · Fractions and Decimals · Shapes and Geometry · Measurement, Time and Money · Patterns and Early Algebra · Algebra (Class 6 and above) · Data Handling |
| English | Phonics, Listening and Speaking · Vocabulary and Grammar · Sentences and Punctuation · Reading and Stories · Writing and Expression |
| Hindi, Kannada | Letters and Sounds · Words and Vocabulary · Grammar · Sentences, Reading and Writing |
| Social Science | Family and Community · Maps and Places · Our Past · Culture and Heritage · Resources and Livelihoods |

In Classes 1–5 Science and Social Science are learning branches drawn from the integrated stage (no separate textbook
in Classes 1–2; *Our Wondrous World* in Classes 3–5), not separate school subjects.

## Phases

### Done (October 2026)

1. **Audit**: the earlier sample map had 11 playable lessons and 24 topics in three grade bands, plus 56 empty
   "coming soon" cards with no source.
2. **Sources**: NCERT, CBSE, NCF-SE 2023 and Karnataka KTBS books for 2026-27 verified and recorded.
3. **Structure**: classes 1–8, per-subject branches, source and review fields on lessons, difficulty on topics, five
   new game types (number line, area builder, clock setter, bar chart builder, circuit lab).
4. **Content**: 99 playable lessons and 240 complete topics; every subject has a playable lesson in every class.
5. **Checks**: automated curriculum, progress and navigation tests; browser checks; live AI checks of the
   curriculum-aware tutor.
6. **Download size**: topic content loads per subject on demand; the main curriculum chunk went from 426 kB to
   71 kB gzipped.

### Next

1. **Teacher review** of all 174 lessons against the chapter text, starting with the 42 playable lessons labelled
   aligned; **native-speaker review** of the 22 Hindi and Kannada lessons using the authors' lists of uncertain items.
2. **Write the 75 planned lessons**, in this order: Science and Mathematics Classes 6–8, then Science Classes 3–5,
   then Social Science Classes 6–8.
3. **Lesson videos** for the most-used topics first, replacing the temporary explainers (see
   [video-production.md](video-production.md)).
4. **End-of-lesson assessments** and recorded pronunciation audio for Hindi, Kannada and English phonics.
