import { useState } from "react";

export default function Home() {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("midsem");
  const [stage, setStage] = useState("upload"); // upload ▸ review ▸ generate ▸ done
  const [extracted, setExtracted] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------- 1. upload syllabus & extract text ---------- */
  const handleUpload = async () => {
    if (!file) return alert("Choose a file first");
    const fd = new FormData();
    fd.append("file", file);
    setLoading(true);
    const res = await fetch("http://127.0.0.1:8000/upload", {
      method: "POST",
      body: fd,
    });
    const { text } = await res.json();
    setLoading(false);
    if (!text) return alert("Nothing extracted!");
    setExtracted(text);
    setStage("review");
  };

  /* ---------- 2. stream notes token‑by‑token ------------- */
  const generateNotes = async () => {
    setStage("generate");
    setNotes("");
    const res = await fetch("http://127.0.0.1:8000/generate_notes_stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: extracted, mode }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      setNotes((prev) => prev + decoder.decode(value));
    }
    setStage("done");
  };

  /* --------------------------- UI ------------------------ */
  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-gray-100">
      <h1 className="text-4xl font-bold mb-6 text-blue-700">📚 PadhA.I.</h1>

      {stage === "upload" && (
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl space-y-6">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <div>
            <label className="block text-gray-700 font-semibold mb-1 mt-4">
              Select Exam Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-md"
            >
              <option value="midsem">Midsem</option>
              <option value="endsem">Endsem</option>
              <option value="viva">Viva</option>
            </select>
          </div>

          <button
            onClick={handleUpload}
            disabled={loading}
            className={`w-full py-2 rounded-xl text-white font-semibold ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Uploading…" : "🚀 Start Preparation"}
          </button>
        </div>
      )}

      {stage === "review" && (
        <div className="w-full max-w-3xl bg-white p-6 mt-6 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold mb-3">📝 Review Extracted Syllabus</h2>
          <textarea
            className="w-full h-64 border p-3 rounded-md"
            value={extracted}
            onChange={(e) => setExtracted(e.target.value)}
          />
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setStage("upload")}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-xl"
            >
              🔙 Back to Upload
            </button>
            <button
              onClick={generateNotes}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-xl"
            >
              ✅ Confirm & Generate Notes
            </button>
          </div>
        </div>
      )}

      {stage === "generate" && (
        <div className="text-center text-blue-700 font-bold mt-10">
          ⏳ Generating… <span className="animate-pulse">|</span>
          <pre className="whitespace-pre-wrap text-left mt-4">{notes}</pre>
        </div>
      )}

      {stage === "done" && (
        <div className="w-full max-w-3xl bg-white p-6 rounded-2xl shadow-xl mt-6 text-gray-800">
          <h2 className="text-2xl font-bold mb-4">🎓 Study Guide</h2>
          <pre className="whitespace-pre-wrap text-sm">{notes}</pre>

          {/* 🔙 Back to Edit Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStage("review")}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-4 py-2 rounded-xl"
            >
              🔙 Back to Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
