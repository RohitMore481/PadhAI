import { useState } from "react";

function Home() {
    const [file, setFile] = useState(null);
    const [mode, setMode] = useState("midsem");

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold text-blue-700 mb-6">📚 PadhA.I.</h1>

            <div className="bg-white shadow-2xl rounded-2xl p-6 w-full max-w-md space-y-6">

                {/* PDF Upload */}
                <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                        Upload Syllabus
                    </label>
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="w-full border border-gray-300 p-2 rounded-md"
                    />
                </div>

                {/* Mode Selector */}
                <div>
                    <label className="block text-gray-700 font-semibold mb-1">
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

                {/* Start Button */}
                <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition-all"
                    onClick={() => {
                        if (!file) {
                          alert("Please upload a syllabus file.");
                          return;
                        }
                      
                        const validTypes = [
                          "application/pdf",
                          "application/msword",
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                          "image/png",
                          "image/jpeg",
                          "image/webp",
                          "text/plain",
                        ];
                      
                        if (!validTypes.includes(file.type)) {
                          alert("Unsupported file format. Please upload PDF, Word, Image or Text file.");
                          return;
                        }
                      
                        alert(`📚 Starting ${mode} preparation with "${file.name}"`);
                      }}
                      
                >
                    🚀 Start Preparation
                </button>

                {/* Mascot */}
                <div className="text-center text-gray-400 text-sm mt-6">
                    🤖 Stickman Mascot Placeholder (coming soon)
                </div>
            </div>
        </div>
    );
}

export default Home;
