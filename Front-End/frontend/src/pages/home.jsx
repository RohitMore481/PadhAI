import { useState } from "react";

export default function Home() {
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
    setLoadingNotes((prev) => ({ ...prev, [topic]: true }));

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
      setNotes((prev) => ({
        ...prev,
        [topic]: (prev[topic] || "") + chunk,
      }));
    }

    setLoadingNotes((prev) => ({ ...prev, [topic]: false }));
  };

  const generateQuestions = async (topic) => {
    if (questions[topic]) return;
    setLoadingQuestions((prev) => ({ ...prev, [topic]: true }));

    const res = await fetch("http://127.0.0.1:8000/generate_questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, count: questionCount }),
    });

    const { questions: q } = await res.json();
    setQuestions((prev) => ({ ...prev, [topic]: q }));

    setLoadingQuestions((prev) => ({ ...prev, [topic]: false }));
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

  const saveEdit = (index) => {
    const updated = [...topics];
    updated[index] = editedTopic.trim();
    setTopics(updated);
    setEditingIndex(null);
    setEditedTopic("");
  };

  const deleteTopic = (index) => {
    const updated = [...topics];
    updated.splice(index, 1);
    setTopics(updated);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-blue-700 mb-6">📚 PadhA.I.</h1>

      {/* Upload */}
      {stage === "upload" && (
        <div className="w-full max-w-md bg-white p-6 rounded-xl shadow space-y-4">
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
            className={`w-full py-2 rounded-xl text-white font-semibold ${
              globalLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {globalLoading ? "Uploading..." : "🚀 Start Preparation"}
          </button>
        </div>
      )}

      {/* Choose Mode */}
      {stage === "choose_mode" && (
        <div className="bg-white max-w-xl p-6 rounded-xl shadow-xl text-center space-y-4">
          <h2 className="text-xl font-semibold">How do you want to study?</h2>
          <button
            onClick={generateFull}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-xl w-full"
          >
            📜 Generate Notes for Full Syllabus
          </button>
          <button
            onClick={splitTopics}
            className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-xl w-full"
          >
            🧩 Split into Topics (Edit & Study One by One)
          </button>
          <button
            onClick={() => setStage("upload")}
            className="text-sm text-blue-600 underline mt-2"
          >
            🔙 Back to Upload
          </button>
        </div>
      )}

      {/* Edit Syllabus */}
      {stage === "edit_syllabus" && (
        <div className="max-w-3xl w-full bg-white p-6 rounded-xl shadow-xl">
          <h2 className="text-xl font-bold mb-4 text-gray-800">✏️ Edit Extracted Syllabus</h2>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full h-64 border p-4 rounded-md font-mono text-sm"
          />
          <div className="flex justify-between mt-4">
            <button
              onClick={() => setStage("choose_mode")}
              className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded-xl"
            >
              🔙 Back
            </button>
            <button
              onClick={generateFullNotes}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl"
            >
              ✅ Confirm & Generate Notes
            </button>
          </div>
        </div>
      )}

      {/* Full Notes View */}
      {stage === "full_generate" && (
        <div className="max-w-3xl w-full bg-white p-6 rounded-xl shadow-xl">
          <h2 className="text-2xl font-bold mb-4 text-blue-800">🧾 Full Notes</h2>
          <div className="border p-4 rounded-md max-h-[600px] overflow-y-auto bg-gray-50">
            {fullNotes ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-800">{fullNotes}</pre>
            ) : (
              <div className="text-center text-blue-600 font-semibold animate-pulse">
                ⏳ Generating full syllabus notes...
              </div>
            )}
          </div>
          <div className="text-right mt-4">
            <button
              onClick={() => setStage("edit_syllabus")}
              className="text-blue-600 underline"
            >
              🔙 Back to Edit Syllabus
            </button>
          </div>
        </div>
      )}

      {/* Topic-wise Study Mode */}
      {stage === "study" && topics.length > 0 && (
        <div className="max-w-3xl w-full bg-white p-6 rounded-xl shadow-xl space-y-4">
          <h2 className="text-lg font-semibold">
            Topic {current + 1} of {topics.length}
          </h2>
          <p className="font-bold text-gray-800">{topics[current]}</p>

          {/* Notes */}
          {notes[topics[current]] ? (
            <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded-md text-sm">
              {notes[topics[current]]}
            </pre>
          ) : (
            <button
              onClick={() => generateOne(topics[current])}
              disabled={loadingNotes[topics[current]]}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl ${
                loadingNotes[topics[current]] ? "opacity-50" : ""
              }`}
            >
              {loadingNotes[topics[current]] ? "Generating Notes..." : "📄 Generate Notes"}
            </button>
          )}

          {/* Questions */}
          <div className="pt-4 space-y-2">
            <label className="block font-medium text-gray-700">Select number of questions:</label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="border rounded-md p-2"
            >
              {[3, 5, 10, 15, 20].map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>

            <button
              onClick={() => generateQuestions(topics[current])}
              disabled={loadingQuestions[topics[current]]}
              className={`bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl ${
                loadingQuestions[topics[current]] ? "opacity-50" : ""
              }`}
            >
              {loadingQuestions[topics[current]] ? "Generating Questions..." : "🎯 Generate Questions"}
            </button>

            {questions[topics[current]] && (
              <ul className="list-disc list-inside bg-gray-50 p-4 rounded-md text-sm space-y-1">
                {questions[topics[current]].map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrent((i) => i - 1)}
              disabled={current === 0}
              className="bg-gray-300 px-4 py-2 rounded-xl disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrent((i) => i + 1)}
              disabled={current === topics.length - 1}
              className="bg-gray-300 px-4 py-2 rounded-xl disabled:opacity-50"
            >
              Next →
            </button>
          </div>
          <div className="text-right">
            <button
              onClick={() => setStage("topic_list")}
              className="text-blue-600 underline"
            >
              🔙 Back to Topic List
            </button>
          </div>
        </div>
      )}

      {/* Topic Editor */}
      {stage === "topic_list" && (
        <div className="max-w-2xl w-full bg-white p-6 rounded-xl shadow-xl space-y-4">
          <h2 className="text-xl font-bold text-gray-800">✏️ Edit Topics</h2>
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
                    className="bg-green-600 text-white px-2 py-1 rounded-md"
                  >
                    Save
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
                    className="text-blue-600 underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTopic(i)}
                    className="text-red-600 underline"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStage("choose_mode")}
              className="bg-gray-300 px-4 py-2 rounded-xl"
            >
              🔙 Back
            </button>
            <button
              onClick={() => setStage("study")}
              disabled={topics.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-xl disabled:bg-gray-300"
            >
              ✅ Start Studying
            </button>
          </div>
        </div>
      )}
    </div>
  );
}