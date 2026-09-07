import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  orderBy,
  query,
  getDoc,
} from "firebase/firestore";
import { firestore } from "../firebase";
import { uploadImage } from "../firebase/image";
import type {
  Course,
  LessonSummary,
  Lesson,
  Section,
  SectionType,
  QuizQuestion,
  QuizOption,
  Task,
} from "../types";

// ─── utility helpers ──────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function newSection(order: number): Section {
  return { type: "body", text: "", order };
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = {
  // SectionEditor
  sectionCard: {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 12,
    marginBottom: 10,
    background: "var(--bg)",
  },
  sectionHeader: { marginBottom: 8, flexWrap: "wrap" as const },
  sectionTypeSelect: { width: 160, padding: "4px 8px" },
  sectionActions: { marginLeft: "auto", display: "flex", gap: 4 },
  infoboxFields: { display: "flex", flexDirection: "column" as const, gap: 6 },
  infoboxColorSelect: { width: 180 },
  bulletsContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  addBulletBtn: { alignSelf: "flex-start" as const, marginTop: 4 },
  tableContainer: { display: "flex", flexDirection: "column" as const, gap: 4 },
  addRowBtn: { alignSelf: "flex-start" as const, marginTop: 4 },

  // QuizEditor
  questionCard: {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 12,
    marginBottom: 12,
    background: "var(--bg)",
  },
  questionHeader: { marginBottom: 8 },
  questionTextarea: { marginBottom: 8 },
  optionsContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    marginBottom: 8,
  },
  quizHint: { marginTop: 6 },

  // TaskEditor
  taskToggleRow: { marginBottom: 12 },
  taskToggleLabel: {
    cursor: "pointer" as const,
    fontWeight: 600,
    fontSize: 13,
  },
  taskCard: {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 12,
    background: "var(--bg)",
  },
  taskChoiceHint: { marginTop: 4 },

  // LessonModal
  lessonModal: { maxWidth: 700, maxHeight: "90vh" },
  lessonModalSubheader: {
    padding: "12px 20px 0",
    borderBottom: "1px solid var(--border)",
  },
  lessonFormGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 100px",
    gap: 12,
    marginBottom: 12,
  },
  lessonFormGroupNoMargin: { marginBottom: 0 },
  lessonTabs: { marginBottom: 0 },
  lessonQuizBadge: { marginLeft: 6, fontSize: 10 },
  lessonModalBody: {
    overflowY: "auto" as const,
    maxHeight: "calc(90vh - 260px)",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    fontSize: 20,
    cursor: "pointer" as const,
  },

  // CourseModal
  courseOrderInput: { width: 100 },

  // LessonsPanel
  lessonIdCode: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "var(--text-secondary)",
  },

  // Courses (main page)
  coursesGrid: { display: "flex", flexDirection: "column" as const, gap: 12 },
  coursesEmpty: { textAlign: "center" as const, padding: 32 },
  courseImage: {
    width: 64,
    height: 48,
    objectFit: "cover" as const,
    borderRadius: 4,
    flexShrink: 0,
  },
  courseContent: { flex: 1 },
  courseDescription: { marginTop: 4 },
  courseId: { marginTop: 4, fontFamily: "monospace", fontSize: 11 },
  courseTitleText: { fontSize: 15 },
  pageTitle: { margin: 0 },
};

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionEditor({
  section,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  section: Section;
  index: number;
  total: number;
  onChange: (s: Section) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const TYPES: SectionType[] = [
    "heading",
    "body",
    "infobox",
    "bullets",
    "table",
    "definition_table",
  ];

  return (
    <div style={styles.sectionCard}>
      <div className="flex items-center gap-2" style={styles.sectionHeader}>
        <select
          className="form-control"
          style={styles.sectionTypeSelect}
          value={section.type}
          onChange={(e) =>
            onChange({ ...section, type: e.target.value as SectionType })
          }
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="text-muted text-sm">#{index + 1}</span>
        <div style={styles.sectionActions}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            ↑
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onMoveDown}
            disabled={index === total - 1}
          >
            ↓
          </button>
          <button className="btn btn-danger btn-sm" onClick={onRemove}>
            ✕
          </button>
        </div>
      </div>

      {(section.type === "heading" || section.type === "body") && (
        <textarea
          className="form-control"
          rows={section.type === "heading" ? 1 : 3}
          value={section.text ?? ""}
          onChange={(e) => onChange({ ...section, text: e.target.value })}
          placeholder={
            section.type === "heading" ? "Heading text" : "Body text"
          }
        />
      )}

      {section.type === "infobox" && (
        <div style={styles.infoboxFields}>
          <input
            className="form-control"
            value={section.title ?? ""}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder="InfoBox title"
          />
          <textarea
            className="form-control"
            rows={2}
            value={section.text ?? ""}
            onChange={(e) => onChange({ ...section, text: e.target.value })}
            placeholder="InfoBox body"
          />
          <select
            className="form-control"
            style={styles.infoboxColorSelect}
            value={section.color ?? "lightBlue"}
            onChange={(e) => onChange({ ...section, color: e.target.value })}
          >
            <option value="lightBlue">Light Blue</option>
            <option value="lightGreen">Light Green</option>
            <option value="lightYellow">Light Yellow</option>
            <option value="accent">Accent</option>
          </select>
        </div>
      )}

      {section.type === "bullets" && (
        <div style={styles.bulletsContainer}>
          {(section.items ?? [""]).map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="form-control"
                value={item}
                onChange={(e) => {
                  const items = [...(section.items ?? [])];
                  items[i] = e.target.value;
                  onChange({ ...section, items });
                }}
                placeholder={`Bullet ${i + 1}`}
              />
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  const items = (section.items ?? []).filter((_, j) => j !== i);
                  onChange({ ...section, items });
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn btn-outline btn-sm"
            style={styles.addBulletBtn}
            onClick={() =>
              onChange({ ...section, items: [...(section.items ?? []), ""] })
            }
          >
            + Add Bullet
          </button>
        </div>
      )}

      {(section.type === "table" || section.type === "definition_table") && (
        <div style={styles.tableContainer}>
          {(section.rows ?? [["", ""]]).map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="form-control"
                value={row[0]}
                onChange={(e) => {
                  const rows = [...(section.rows ?? [])] as [string, string][];
                  rows[i] = [e.target.value, rows[i]?.[1] ?? ""];
                  onChange({ ...section, rows });
                }}
                placeholder="Term / Column 1"
              />
              <input
                className="form-control"
                value={row[1]}
                onChange={(e) => {
                  const rows = [...(section.rows ?? [])] as [string, string][];
                  rows[i] = [rows[i]?.[0] ?? "", e.target.value];
                  onChange({ ...section, rows });
                }}
                placeholder="Definition / Column 2"
              />
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  const rows = (section.rows ?? []).filter(
                    (_, j) => j !== i,
                  ) as [string, string][];
                  onChange({ ...section, rows });
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn btn-outline btn-sm"
            style={styles.addRowBtn}
            onClick={() =>
              onChange({
                ...section,
                rows: [...(section.rows ?? []), ["", ""]] as [string, string][],
              })
            }
          >
            + Add Row
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Quiz editor ──────────────────────────────────────────────────────────────

function QuizEditor({
  questions,
  onChange,
}: {
  questions: QuizQuestion[];
  onChange: (qs: QuizQuestion[]) => void;
}) {
  const addQuestion = () => {
    onChange([
      ...questions,
      {
        text: "",
        options: [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
        order: questions.length + 1,
      },
    ]);
  };

  const updateQuestion = (idx: number, q: QuizQuestion) => {
    const updated = [...questions];
    updated[idx] = q;
    onChange(updated);
  };

  const removeQuestion = (idx: number) => {
    onChange(
      questions
        .filter((_, i) => i !== idx)
        .map((q, i) => ({ ...q, order: i + 1 })),
    );
  };

  const updateOption = (qIdx: number, oIdx: number, opt: QuizOption) => {
    const updated = [...questions];
    const opts = [...updated[qIdx].options];
    opts[oIdx] = opt;
    updated[qIdx] = { ...updated[qIdx], options: opts };
    onChange(updated);
  };

  const setCorrect = (qIdx: number, oIdx: number) => {
    const updated = [...questions];
    updated[qIdx] = {
      ...updated[qIdx],
      options: updated[qIdx].options.map((o, i) => ({
        ...o,
        isCorrect: i === oIdx,
      })),
    };
    onChange(updated);
  };

  const addOption = (qIdx: number) => {
    const updated = [...questions];
    updated[qIdx] = {
      ...updated[qIdx],
      options: [...updated[qIdx].options, { text: "", isCorrect: false }],
    };
    onChange(updated);
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const updated = [...questions];
    updated[qIdx] = {
      ...updated[qIdx],
      options: updated[qIdx].options.filter((_, i) => i !== oIdx),
    };
    onChange(updated);
  };

  return (
    <div>
      {questions.map((q, qIdx) => (
        <div key={qIdx} style={styles.questionCard}>
          <div
            className="flex justify-between items-center"
            style={styles.questionHeader}
          >
            <strong className="text-sm">Question {qIdx + 1}</strong>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => removeQuestion(qIdx)}
            >
              Delete Q
            </button>
          </div>
          <textarea
            className="form-control"
            rows={2}
            value={q.text}
            onChange={(e) =>
              updateQuestion(qIdx, { ...q, text: e.target.value })
            }
            placeholder="Question text"
            style={styles.questionTextarea}
          />
          <div style={styles.optionsContainer}>
            {q.options.map((opt, oIdx) => (
              <div key={oIdx} className="flex gap-2 items-center">
                <input
                  type="radio"
                  name={`correct-${qIdx}`}
                  checked={opt.isCorrect}
                  onChange={() => setCorrect(qIdx, oIdx)}
                  title="Mark as correct"
                />
                <input
                  className="form-control"
                  value={opt.text}
                  onChange={(e) =>
                    updateOption(qIdx, oIdx, { ...opt, text: e.target.value })
                  }
                  placeholder={`Option ${oIdx + 1}`}
                />
                {q.options.length > 2 && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeOption(qIdx, oIdx)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => addOption(qIdx)}
          >
            + Add Option
          </button>
          <div className="text-sm text-muted" style={styles.quizHint}>
            Select the radio button next to the correct answer.
          </div>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" onClick={addQuestion}>
        + Add Question
      </button>
    </div>
  );
}

// ─── Task editor ──────────────────────────────────────────────────────────────

function TaskEditor({
  task,
  onChange,
}: {
  task: Task | null;
  onChange: (t: Task | null) => void;
}) {
  const [enabled, setEnabled] = useState(task !== null);
  const [imageUploading, setImageUploading] = useState(false);

  const handleToggle = (on: boolean) => {
    setEnabled(on);
    if (!on) {
      onChange(null);
    } else {
      onChange({ text: "", options: ["", ""], correctOptionIndex: 0 });
    }
  };

  const updateOption = (oIdx: number, text: string) => {
    if (!task) return;
    const opts = [...(task.options ?? [])];
    opts[oIdx] = text;
    onChange({ ...task, options: opts });
  };

  const setCorrect = (oIdx: number) => {
    if (!task) return;
    onChange({ ...task, correctOptionIndex: oIdx });
  };

  const addOption = () => {
    if (!task) return;
    onChange({ ...task, options: [...(task.options ?? []), ""] });
  };

  const removeOption = (oIdx: number) => {
    if (!task) return;
    const opts = (task.options ?? []).filter((_, i) => i !== oIdx);
    const ci = task.correctOptionIndex ?? 0;
    onChange({ ...task, options: opts, correctOptionIndex: ci >= opts.length ? 0 : ci });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    setImageUploading(true);
    const url = await uploadImage(file);
    setImageUploading(false);
    if (url) onChange({ ...task, imageUrl: url });
  };

  return (
    <div>
      <div className="flex items-center gap-2" style={styles.taskToggleRow}>
        <input
          type="checkbox"
          id="task-enabled"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
        />
        <label htmlFor="task-enabled" style={styles.taskToggleLabel}>
          Include a practical task in this lesson
        </label>
      </div>

      {enabled && task && (
        <div style={styles.taskCard}>
          <div className="form-group">
            <label className="form-label">Task Text</label>
            <textarea
              className="form-control"
              rows={3}
              value={task.text}
              onChange={(e) => onChange({ ...task, text: e.target.value })}
              placeholder="Describe the task"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Options</label>
            <div style={styles.optionsContainer}>
              {(task.options ?? []).map((opt, oIdx) => (
                <div key={oIdx} className="flex gap-2 items-center">
                  <input
                    type="radio"
                    name="task-correct"
                    checked={oIdx === (task.correctOptionIndex ?? 0)}
                    onChange={() => setCorrect(oIdx)}
                    title="Mark as correct"
                  />
                  <input
                    className="form-control"
                    value={opt}
                    onChange={(e) => updateOption(oIdx, e.target.value)}
                    placeholder={`Option ${oIdx + 1}`}
                  />
                  {(task.options ?? []).length > 2 && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeOption(oIdx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={addOption}
              style={{ marginTop: 8 }}
            >
              + Add Option
            </button>
            <div className="text-sm text-muted" style={styles.taskChoiceHint}>
              Select the radio button next to the correct answer.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Task Image (optional)</label>
            {task.imageUrl && (
              <div style={{ marginBottom: 6 }}>
                <img
                  src={task.imageUrl}
                  alt="Task"
                  style={{
                    width: 160,
                    height: 100,
                    objectFit: "cover",
                    borderRadius: 4,
                  }}
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={imageUploading}
            />
            {imageUploading && (
              <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                Uploading…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lesson editor modal ──────────────────────────────────────────────────────

function LessonModal({
  courseId,
  lesson,
  existingLessons,
  onClose,
  onSaved,
}: {
  courseId: string;
  lesson: Lesson | null; // null = new
  existingLessons: LessonSummary[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = lesson === null;
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [order, setOrder] = useState(
    lesson?.order ?? Math.max(0, ...existingLessons.map((l) => l.order)) + 1,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    lesson?.imageUrl ?? null,
  );
  const [sections, setSections] = useState<Section[]>(
    lesson?.sections ?? [newSection(1)],
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    lesson?.questions ?? [],
  );
  const [task, setTask] = useState<Task | null>(lesson?.task ?? null);
  const [tab, setTab] = useState<"content" | "quiz" | "task">("content");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSection = () => {
    setSections((prev) => [...prev, newSection(prev.length + 1)]);
  };

  const updateSection = (idx: number, s: Section) => {
    setSections((prev) => {
      const updated = [...prev];
      updated[idx] = s;
      return updated;
    });
  };

  const removeSection = (idx: number) => {
    setSections((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })),
    );
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    setSections((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Lesson title is required");
      return;
    }
    if (sections.length === 0) {
      setError("At least one section is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const lessonId = lesson?.id ?? generateId();
      const lessonRef = doc(
        firestore,
        "courses",
        courseId,
        "lessons",
        lessonId,
      );

      // Upload lesson image if a new file was selected
      let finalImageUrl = lesson?.imageUrl;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        if (uploaded) finalImageUrl = uploaded;
      }

      // Save lesson metadata
      const lessonMeta: Record<string, unknown> = {
        title: title.trim(),
        order,
      };
      if (finalImageUrl) lessonMeta.imageUrl = finalImageUrl;
      await setDoc(lessonRef, lessonMeta, { merge: true });

      // Save sections as subcollection
      const sectionsCol = collection(
        firestore,
        "courses",
        courseId,
        "lessons",
        lessonId,
        "sections",
      );
      // Delete old sections first for edits
      if (!isNew) {
        const oldSnap = await getDocs(sectionsCol);
        await Promise.all(oldSnap.docs.map((d) => deleteDoc(d.ref)));
      }
      await Promise.all(
        sections.map((s, i) => {
          const sId = s.id ?? generateId();
          const sRef = doc(sectionsCol, sId);
          const data: Record<string, unknown> = { type: s.type, order: i + 1 };
          if (s.text !== undefined) data.text = s.text;
          if (s.title !== undefined) data.title = s.title;
          if (s.color !== undefined) data.color = s.color;
          if (s.items !== undefined) data.items = s.items;
          if (s.rows !== undefined)
            data.rows = s.rows.map(([key, value]) => ({ key, value }));
          return setDoc(sRef, data);
        }),
      );

      // Save quiz questions as subcollection (only write to Firestore)
      const questionsCol = collection(
        firestore,
        "courses",
        courseId,
        "lessons",
        lessonId,
        "questions",
      );
      if (!isNew) {
        const oldSnap = await getDocs(questionsCol);
        await Promise.all(oldSnap.docs.map((d) => deleteDoc(d.ref)));
      }
      await Promise.all(
        questions.map((q, i) => {
          const qId = q.id ?? generateId();
          const qRef = doc(questionsCol, qId);
          return setDoc(qRef, {
            text: q.text,
            options: q.options,
            order: i + 1,
          });
        }),
      );

      // Save task document (only to Firestore)
      const taskRef = doc(
        firestore,
        "courses",
        courseId,
        "lessons",
        lessonId,
        "task",
        "main",
      );
      if (task) {
        await setDoc(taskRef, task);
      } else {
        // Remove task if disabled
        try {
          await deleteDoc(taskRef);
        } catch {
          /* ignore if doesn't exist */
        }
      }

      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div
        className="modal"
        style={styles.lessonModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span>{isNew ? "New Lesson" : `Edit: ${lesson?.title}`}</span>
          <button
            style={styles.modalCloseBtn}
            onClick={() => !saving && onClose()}
          >
            ×
          </button>
        </div>

        <div style={styles.lessonModalSubheader}>
          <div style={styles.lessonFormGrid}>
            <div className="form-group" style={styles.lessonFormGroupNoMargin}>
              <label className="form-label">Title *</label>
              <input
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Lesson title"
                disabled={saving}
              />
            </div>
            <div className="form-group" style={styles.lessonFormGroupNoMargin}>
              <label className="form-label">Order</label>
              <input
                className="form-control"
                type="number"
                min={1}
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                disabled={saving}
              />
            </div>
          </div>
          <div className="tabs" style={styles.lessonTabs}>
            {(["content", "quiz", "task"] as const).map((t) => (
              <button
                key={t}
                className={`tab-btn ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "content"
                  ? "📄 Content"
                  : t === "quiz"
                    ? "🧠 Quiz"
                    : "✏️ Task"}
                {t === "quiz" && questions.length > 0 && (
                  <span
                    className="badge badge-blue"
                    style={styles.lessonQuizBadge}
                  >
                    {questions.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-body" style={styles.lessonModalBody}>
          {error && <div className="alert alert-error">{error}</div>}

          {tab === "content" && (
            <div>
              {sections.map((s, i) => (
                <SectionEditor
                  key={i}
                  section={s}
                  index={i}
                  total={sections.length}
                  onChange={(updated) => updateSection(i, updated)}
                  onRemove={() => removeSection(i)}
                  onMoveUp={() => moveSection(i, -1)}
                  onMoveDown={() => moveSection(i, 1)}
                />
              ))}
              <button className="btn btn-outline btn-sm" onClick={addSection}>
                + Add Section
              </button>
            </div>
          )}

          {tab === "quiz" && (
            <QuizEditor questions={questions} onChange={setQuestions} />
          )}

          {tab === "task" && <TaskEditor task={task} onChange={setTask} />}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Lesson"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Course modal ─────────────────────────────────────────────────────────────

function CourseModal({
  course,
  onClose,
  onSaved,
}: {
  course: Course | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = course === null;
  const [title, setTitle] = useState(course?.title ?? "");
  const [order, setOrder] = useState(course?.order ?? 1);
  const [description, setDescription] = useState(course?.description ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    course?.imageUrl ?? null,
  );
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const courseId = course?.id ?? generateId();
      const courseRef = doc(firestore, "courses", courseId);
      const data: Record<string, unknown> = {
        title: title.trim(),
        order,
        description: description.trim(),
      };

      await setDoc(courseRef, data, { merge: true });

      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{isNew ? "New Course" : `Edit: ${course?.title}`}</span>
          <button
            style={styles.modalCloseBtn}
            onClick={() => !saving && onClose()}
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Order</label>
            <input
              className="form-control"
              type="number"
              min={1}
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
              disabled={saving}
              style={styles.courseOrderInput}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="form-group"></div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Course"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lessons list panel ───────────────────────────────────────────────────────

function LessonsPanel({
  course,
  onBack,
}: {
  course: Course;
  onBack: () => void;
}) {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null | "new">(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(firestore, "courses", course.id, "lessons"),
          orderBy("order"),
        ),
      );
      setLessons(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<LessonSummary, "id">),
        })),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [course.id]);

  const loadLessonForEdit = async (lessonId: string) => {
    try {
      const lessonDoc = await getDoc(
        doc(firestore, "courses", course.id, "lessons", lessonId),
      );
      if (!lessonDoc.exists()) return;
      const data = lessonDoc.data();

      const sectionsSnap = await getDocs(
        query(
          collection(
            firestore,
            "courses",
            course.id,
            "lessons",
            lessonId,
            "sections",
          ),
          orderBy("order"),
        ),
      );
      const sections: Section[] = sectionsSnap.docs.map((d) => {
        const { rows: rawRows, ...rest } = d.data() as Omit<
          Section,
          "id" | "rows"
        > & {
          rows?: { key: string; value: string }[];
        };
        const section: Section = { id: d.id, ...rest };
        if (rawRows !== undefined)
          section.rows = rawRows.map(
            ({ key, value }) => [key, value] as [string, string],
          );
        return section;
      });

      const questionsSnap = await getDocs(
        query(
          collection(
            firestore,
            "courses",
            course.id,
            "lessons",
            lessonId,
            "questions",
          ),
          orderBy("order"),
        ),
      );
      const questions: QuizQuestion[] = questionsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<QuizQuestion, "id">),
      }));

      let taskData: Task | null = null;
      try {
        const taskSnap = await getDoc(
          doc(
            firestore,
            "courses",
            course.id,
            "lessons",
            lessonId,
            "task",
            "main",
          ),
        );
        if (taskSnap.exists()) taskData = taskSnap.data() as Task;
      } catch {
        /* no task */
      }

      setEditingLesson({
        id: lessonId,
        title: data.title ?? "",
        order: data.order ?? 1,
        imageUrl: data.imageUrl as string | undefined,
        sections,
        questions,
        task: taskData,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load lesson";
      alert(msg);
    }
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm("Delete this lesson and all its content?")) return;
    setDeletingId(lessonId);
    try {
      // Delete subcollections first
      for (const col of ["sections", "questions"]) {
        const snap = await getDocs(
          collection(firestore, "courses", course.id, "lessons", lessonId, col),
        );
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }
      try {
        await deleteDoc(
          doc(
            firestore,
            "courses",
            course.id,
            "lessons",
            lessonId,
            "task",
            "main",
          ),
        );
      } catch {
        /* ignore */
      }
      await deleteDoc(
        doc(firestore, "courses", course.id, "lessons", lessonId),
      );
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      alert("Error: " + msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-sm" onClick={onBack}>
            ← Back
          </button>
          <h1 className="page-title" style={styles.pageTitle}>
            {course.title} — Lessons
          </h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setEditingLesson("new")}
        >
          + Add Lesson
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="centered">
          <span className="spinner" />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lesson Title</th>
                  <th>ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => (
                  <tr key={l.id}>
                    <td>{l.order}</td>
                    <td className="fw-bold">{l.title}</td>
                    <td>
                      <code style={styles.lessonIdCode}>{l.id}</code>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => loadLessonForEdit(l.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(l.id)}
                          disabled={deletingId === l.id}
                        >
                          {deletingId === l.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {lessons.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={styles.coursesEmpty}
                      className="text-muted"
                    >
                      No lessons yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingLesson !== null && (
        <LessonModal
          courseId={course.id}
          lesson={editingLesson === "new" ? null : editingLesson}
          existingLessons={lessons}
          onClose={() => setEditingLesson(null)}
          onSaved={fetchLessons}
        />
      )}
    </>
  );
}

// ─── Main Courses page ────────────────────────────────────────────────────────

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null | "new">(
    null,
  );
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(firestore, "courses"), orderBy("order")),
      );
      setCourses(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Course, "id">),
        })),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDeleteCourse = async (courseId: string) => {
    if (
      !confirm(
        "Delete this course? This will NOT delete its lessons (they must be removed individually).",
      )
    ) {
      return;
    }
    setDeletingId(courseId);
    try {
      await deleteDoc(doc(firestore, "courses", courseId));
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      alert("Error: " + msg);
    } finally {
      setDeletingId(null);
    }
  };

  if (selectedCourse) {
    return (
      <LessonsPanel
        course={selectedCourse}
        onBack={() => {
          setSelectedCourse(null);
          fetchCourses();
        }}
      />
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Courses</h1>
        <button
          className="btn btn-primary"
          onClick={() => setEditingCourse("new")}
        >
          + New Course
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="centered">
          <span className="spinner" />
        </div>
      ) : (
        <div style={styles.coursesGrid}>
          {courses.length === 0 && (
            <div
              className="card card-body text-muted"
              style={styles.coursesEmpty}
            >
              No courses yet. Create the first one!
            </div>
          )}
          {courses.map((c) => (
            <div className="card" key={c.id}>
              <div className="card-body">
                <div className="flex items-center gap-3">
                  {c.imageUrl && (
                    <img
                      src={c.imageUrl}
                      alt={c.title}
                      style={styles.courseImage}
                    />
                  )}
                  <div style={styles.courseContent}>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-gray">#{c.order}</span>
                      <span className="fw-bold" style={styles.courseTitleText}>
                        {c.title}
                      </span>
                    </div>
                    {c.description && (
                      <div
                        className="text-sm text-muted"
                        style={styles.courseDescription}
                      >
                        {c.description}
                      </div>
                    )}
                    <div className="text-sm text-muted" style={styles.courseId}>
                      ID: {c.id}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setSelectedCourse(c)}
                    >
                      Lessons →
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingCourse(c)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteCourse(c.id)}
                      disabled={deletingId === c.id}
                    >
                      {deletingId === c.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingCourse !== null && (
        <CourseModal
          course={editingCourse === "new" ? null : editingCourse}
          onClose={() => setEditingCourse(null)}
          onSaved={fetchCourses}
        />
      )}
    </>
  );
}
