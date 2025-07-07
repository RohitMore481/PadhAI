import { useState, useEffect } from "react";
import {
  FaBook,
  FaRocket,
  FaFileAlt,
  FaPuzzlePiece,
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaCheckCircle,
  FaEdit,
  FaHourglassHalf,
  FaBars,
  FaEyeSlash,
  FaStickyNote,
  FaBullseye,
} from "react-icons/fa";

export default function Home() {
  /* ---------- STATE ---------- */
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("midsem");
  const [stage, setStage] = useState("upload");

  const [rawText, setRawText] = useState("");
  const [topics, setTopics] = useState([]);
  const [notes, setNotes] = useState({});
  const [fullNotes, setFullNotes] = useState("");
  const [current, setCurrent] = useState(0);

  const [editingIndex, setEditingIndex] = useState(null);
  const [editedTopic, setEditedTopic] = useState("");

  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState({});

  const [loadingNotes, setLoadingNotes] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);

  /* completion list saved by topic text */
  const [completedTopics, setCompletedTopics] = useState(() =>
    JSON.parse(localStorage.getItem("completedTopics") || "[]")
  );
  useEffect(() => {
    localStorage.setItem("completedTopics", JSON.stringify(completedTopics));
  }, [completedTopics]);

  /* sidebar visibility */
  const [showSidebar, setShowSidebar] = useState(true);

  /* ---------- HANDLERS ---------- */
  const handleUpload = async () => {
    if (!file) return alert("Please choose a file.");
    setGlobalLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("http://127.0.0.1:8000/upload", {
      method: "POST",
      body: fd,
    });
    const { text } = await res.json();
    setRawText(text);

    // Clear completion state
    setCompletedTopics([]);
    localStorage.removeItem("completedTopics");

    setStage("choose_mode");
    setGlobalLoading(false);
  };

  const splitTopics = async () => {
    setGlobalLoading(true);
    const res = await fetch("http://127.0.0.1:8000/split_topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText }),
    });
    const { topics } = await res.json();
    setTopics(topics);
    setStage("topic_list");
    setGlobalLoading(false);
  };

  const generateOne = async (topic) => {
    if (notes[topic]) return;
    setLoadingNotes((p) => ({ ...p, [topic]: true }));
    const res = await fetch("http://127.0.0.1:8000/generate_notes_stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, mode }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunk = decoder.decode(value);
      setNotes((prev) => ({ ...prev, [topic]: (prev[topic] || "") + chunk }));
    }
    setLoadingNotes((p) => ({ ...p, [topic]: false }));
  };

  const generateQuestions = async (topic) => {
    if (questions[topic]) return;
    setLoadingQuestions((p) => ({ ...p, [topic]: true }));
    const res = await fetch("http://127.0.0.1:8000/generate_questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, count: questionCount }),
    });
    const { questions: qs } = await res.json();
    setQuestions((prev) => ({ ...prev, [topic]: qs }));
    setLoadingQuestions((p) => ({ ...p, [topic]: false }));
  };

  const generateFull = () => setStage("edit_syllabus");

  const generateFullNotes = async () => {
    setFullNotes("");
    setStage("full_generate");
    const res = await fetch("http://127.0.0.1:8000/generate_notes_stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText, mode }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunk = decoder.decode(value);
      setFullNotes((prev) => prev + chunk);
    }
  };

  const saveEdit = (i) => {
    const upd = [...topics];
    upd[i] = editedTopic.trim();
    setTopics(upd);
    setEditingIndex(null);
    setEditedTopic("");
  };

  const deleteTopic = (i) => {
    const upd = [...topics];
    const removed = upd.splice(i, 1)[0];
    setTopics(upd);
    setNotes((p) => {
      const cp = { ...p };
      delete cp[removed];
      return cp;
    });
    setQuestions((p) => {
      const cp = { ...p };
      delete cp[removed];
      return cp;
    });
    setCompletedTopics((p) => p.filter((t) => t !== removed));
    if (current >= upd.length) setCurrent(upd.length - 1);
  };

  /* ---------- RENDER ---------- */
  return (
    <div className="min-h-screen p-6 bg-[#f7f9fb] flex flex-col items-center">
      {/* Title */}
      <h1 className="text-4xl font-bold text-[#2a4365] mb-6 flex items-center gap-2">
        <FaBook className="w-8 h-8" /> PadhA.I.
      </h1>

      {/* ===== UPLOAD ===== */}
      {stage === "upload" && (
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg space-y-4">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full border p-2 rounded-md"
          >
            <option value="midsem">Midsem</option>
            <option value="endsem">Endsem</option>
            <option value="viva">Viva</option>
          </select>
          <button
            onClick={handleUpload}
            disabled={globalLoading}
            className={`w-full py-2 rounded-xl text-white font-semibold transition-all duration-300 ${globalLoading ? "bg-[#b0c4de]" : "bg-[#4c8bf5] hover:bg-[#3b6ee0]"
              }`}
          >
            {globalLoading ? (
              "Uploading..."
            ) : (
              <>
                <FaRocket className="inline-block mr-2" />
                Start Preparation
              </>
            )}
          </button>
        </div>
      )}

      {/* ===== CHOOSE MODE ===== */}
      {stage === "choose_mode" && (
        <div className="bg-white max-w-xl p-6 rounded-2xl shadow-lg text-center space-y-4">
          <h2 className="text-xl font-semibold text-[#2a4365]">
            How do you want to study?
          </h2>
          <button
            onClick={generateFull}
            className="bg-[#36b37e] hover:bg-[#2e9c6c] text-white py-2 px-4 rounded-xl w-full flex items-center justify-center gap-2 transition-all duration-300"
          >
            <FaFileAlt /> Generate Notes for Full Syllabus
          </button>
          <button
            onClick={splitTopics}
            className="bg-[#ffc34d] hover:bg-[#e0a732] text-white py-2 px-4 rounded-xl w-full flex items-center justify-center gap-2 transition-all duration-300"
          >
            <FaPuzzlePiece /> Split into Topics (Edit & Study)
          </button>
          <button
            onClick={() => setStage("upload")}
            className="text-sm text-[#4c8bf5] underline mt-2 flex items-center justify-center gap-1"
          >
            <FaArrowLeft /> Back to Upload
          </button>
        </div>
      )}

      {/* ===== EDIT SYLLABUS ===== */}
      {stage === "edit_syllabus" && (
        <div className="max-w-3xl w-full bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-[#2a4365] flex items-center gap-2">
            <FaEdit /> Edit Extracted Syllabus
          </h2>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full h-64 border p-4 rounded-md font-mono text-sm"
          />
          <div className="flex justify-between mt-4">
            <button
              onClick={() => setStage("choose_mode")}
              className="bg-[#dee3ea] hover:bg-[#c3cbd6] text-black px-4 py-2 rounded-xl flex items-center gap-1"
            >
              <FaArrowLeft /> Back
            </button>
            <button
              onClick={generateFullNotes}
              className="bg-[#36b37e] hover:bg-[#2e9c6c] text-white px-4 py-2 rounded-xl flex items-center gap-1 transition-all duration-300"
            >
              <FaCheck /> Confirm & Generate
            </button>
          </div>
        </div>
      )}

      {/* ===== FULL NOTES ===== */}
      {stage === "full_generate" && (
        <div className="max-w-3xl w-full bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-[#2a4365] flex items-center gap-2">
            <FaFileAlt /> Full Notes
          </h2>
          <div className="border p-4 rounded-md max-h-[600px] overflow-y-auto bg-[#edf2f7]">
            {fullNotes ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-800">
                {fullNotes}
              </pre>
            ) : (
              <div className="text-center text-[#4c8bf5] font-semibold flex items-center justify-center gap-2 animate-pulse">
                <FaHourglassHalf className="animate-spin" /> Generating…
              </div>
            )}
          </div>
          <div className="text-right mt-4">
            <button
              onClick={() => setStage("edit_syllabus")}
              className="text-[#4c8bf5] underline flex items-center gap-1"
            >
              <FaArrowLeft /> Back
            </button>
          </div>
        </div>
      )}

      {/* ===== STUDY ===== */}
      {stage === "study" && topics.length > 0 && (
        <div className="flex w-full max-w-5xl">
          {/* Sidebar */}
          {showSidebar && (
            <div className="w-48 bg-white shadow-md rounded-2xl py-4 px-2 mr-4 sticky top-6">
              <h3 className="text-sm font-semibold mb-3 text-center text-[#2a4365]">
                Topics
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {topics.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrent(idx)}
                    className={`w-10 h-10 rounded-full border-2 text-sm font-bold transition-all duration-200
                ${current === idx ? "border-[#4c8bf5]" : "border-gray-300"}
                ${completedTopics.includes(topics[idx])
                        ? "bg-[#36b37e] text-white"
                        : "bg-[#f0f4f8] text-gray-700 hover:bg-[#e2e8f0]"
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Study Panel */}
          <div className="flex-1 space-y-4 bg-white p-6 rounded-2xl shadow-lg">

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
                <span>Completed: {completedTopics.length}</span>
                <span>Total: {topics.length}</span>
              </div>
              <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#36b37e] transition-all duration-300"
                  style={{
                    width: `${(completedTopics.length / topics.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowSidebar((s) => !s)}
                className="text-gray-600 text-sm underline flex items-center gap-1"
              >
                {showSidebar ? (
                  <>
                    <FaEyeSlash /> Hide Topics
                  </>
                ) : (
                  <>
                    <FaBars /> Show Topics
                  </>
                )}
              </button>
            </div>

            <h2 className="text-lg font-semibold text-[#2a4365]">
              Topic {current + 1} of {topics.length}
            </h2>
            <p className="font-bold text-[#2a4365] bg-[#ebf4ff] inline-block px-3 py-1 rounded-md">
              {topics[current]}
            </p>

            {/* Notes */}
            {notes[topics[current]] ? (
              <pre className="whitespace-pre-wrap bg-[#edf2f7] p-3 rounded-md text-sm">
                {notes[topics[current]]}
              </pre>
            ) : (
              <button
                onClick={() => generateOne(topics[current])}
                disabled={loadingNotes[topics[current]]}
                className={`bg-[#4c8bf5] hover:bg-[#3b6ee0] text-white px-4 py-2 rounded-xl flex items-center gap-1 transition-all duration-300 ${loadingNotes[topics[current]] ? "opacity-50" : ""
                  }`}
              >
                {loadingNotes[topics[current]] ? (
                  "Generating..."
                ) : (
                  <>
                    <FaStickyNote /> Generate Notes
                  </>
                )}
              </button>
            )}

            {/* Questions */}
            <div className="pt-4 space-y-2">
              <label className="block font-medium text-gray-700">
                Select number of questions:
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className="border rounded-md p-2"
              >
                {[3, 5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <button
                onClick={() => generateQuestions(topics[current])}
                disabled={loadingQuestions[topics[current]]}
                className={`bg-[#a259ff] hover:bg-[#8f45e5] text-white px-4 py-2 rounded-xl flex items-center gap-1 transition-all duration-300 ${loadingQuestions[topics[current]] ? "opacity-50" : ""
                  }`}
              >
                {loadingQuestions[topics[current]] ? (
                  "Generating..."
                ) : (
                  <>
                    <FaBullseye /> Generate Questions
                  </>
                )}
              </button>

              {questions[topics[current]] && (
                <ul className="list-disc list-inside bg-[#f7f9fb] p-4 rounded-md text-sm space-y-1">
                  {questions[topics[current]].map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Mark Complete */}
            <button
              onClick={() => {
                const t = topics[current];
                if (!completedTopics.includes(t)) {
                  setCompletedTopics((prev) => [...prev, t]);
                }
              }}
              className="mt-2 bg-[#36b37e] hover:bg-[#2e9c6c] text-white px-4 py-2 rounded-xl flex items-center gap-1 transition-all duration-300"
            >
              <FaCheckCircle /> Mark Topic {current + 1} as Done
            </button>

            {/* Prev / Next */}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrent((i) => i - 1)}
                disabled={current === 0}
                className="bg-[#dee3ea] px-4 py-2 rounded-xl disabled:opacity-50 flex items-center gap-1 transition-all duration-300"
              >
                <FaArrowLeft /> Previous
              </button>
              <button
                onClick={() => setCurrent((i) => i + 1)}
                disabled={current === topics.length - 1}
                className="bg-[#dee3ea] px-4 py-2 rounded-xl disabled:opacity-50 flex items-center gap-1 transition-all duration-300"
              >
                Next <FaArrowRight />
              </button>
            </div>

            <div className="text-right">
              <button
                onClick={() => setStage("topic_list")}
                className="text-[#4c8bf5] underline flex items-center gap-1"
              >
                <FaArrowLeft /> Back to Topic List
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ===== TOPIC LIST ===== */}
      {stage === "topic_list" && (
        <div className="max-w-2xl w-full bg-white p-6 rounded-2xl shadow-lg space-y-4">
          <h2 className="text-xl font-bold text-[#2a4365] flex items-center gap-2">
            <FaEdit /> Edit Topics
          </h2>
          {topics.map((topic, i) => (
            <div key={i} className="flex items-center space-x-2">
              {editingIndex === i ? (
                <>
                  <input
                    value={editedTopic}
                    onChange={(e) => setEditedTopic(e.target.value)}
                    className="flex-1 border p-2 rounded-md"
                  />
                  <button
                    onClick={() => saveEdit(i)}
                    className="bg-[#36b37e] text-white px-2 py-1 rounded-md flex items-center gap-1 transition-all duration-300"
                  >
                    <FaCheck /> Save
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1">{topic}</span>
                  <button
                    onClick={() => {
                      setEditingIndex(i);
                      setEditedTopic(topic);
                    }}
                    className="text-[#4c8bf5] underline flex items-center gap-1"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => deleteTopic(i)}
                    className="text-red-600 underline flex items-center gap-1"
                  >
                    <FaArrowLeft /> Delete
                  </button>
                </>
              )}
            </div>
          ))}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStage("choose_mode")}
              className="bg-[#dee3ea] px-4 py-2 rounded-xl flex items-center gap-1 transition-all duration-300"
            >
              <FaArrowLeft /> Back
            </button>
            <button
              onClick={() => setStage("study")}
              disabled={topics.length === 0}
              className="bg-[#36b37e] text-white px-4 py-2 rounded-xl disabled:bg-gray-300 flex items-center gap-1 transition-all duration-300"
            >
              <FaCheck /> Start Studying
            </button>
          </div>
        </div>
      )}
      {(stage === "study" || stage === "full_generate") && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 bg-[#4c8bf5] hover:bg-[#3b6ee0] text-white px-4 py-2 rounded-full shadow-lg transition duration-300"
        >
          ↑ Top
        </button>
      )}

    </div>
  );
}
