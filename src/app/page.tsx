"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface UploadedDoc {
  name: string;
  chunks: number;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [question, setQuestion] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      alert("Only PDF files are supported!");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setUploadedDocs((prev) => [...prev, { name: data.filename, chunks: data.chunks }]);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;

    const userMsg: Message = { id: Date.now().toString(), type: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setIsAsking(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.content }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: data.answer || data.error || "Something went wrong.",
          sources: data.sources,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: "assistant", content: "Failed to get answer. Try again." },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            🧠 <span>Ask My Docs</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Upload PDFs, ask questions</p>
        </div>

        {/* Upload Area */}
        <div className="p-4">
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
              ${isDragging ? "border-violet-500 bg-violet-500/10" : "border-gray-700 hover:border-gray-500"}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Processing PDF...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl">📄</div>
                <p className="text-sm font-medium text-gray-300">Drop PDF here</p>
                <p className="text-xs text-gray-500">or click to browse</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {/* Uploaded Docs */}
        <div className="flex-1 overflow-y-auto px-4">
          {uploadedDocs.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Uploaded Documents
              </p>
              <div className="flex flex-col gap-2">
                {uploadedDocs.map((doc, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <p className="text-sm text-white font-medium truncate">📄 {doc.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{doc.chunks} chunks indexed</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MAIN CHAT AREA ── */}
      <div className="flex-1 flex flex-col">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <div className="text-6xl">🧠</div>
              <h2 className="text-2xl font-bold text-white">Ask Anything</h2>
              <p className="text-gray-400 max-w-md">
                Upload a PDF on the left, then ask questions about it here.
                I&apos;ll find the relevant parts and answer based on your documents.
              </p>
              <div className="grid grid-cols-1 gap-2 mt-4 w-full max-w-md">
                {["What is the main topic of this document?", "Summarize the key points", "What are the conclusions?"].map((q) => (
                  <button key={q} onClick={() => setQuestion(q)}
                    className="text-left px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 border border-gray-700 transition-colors">
                    💬 {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-2xl rounded-2xl px-4 py-3 ${msg.type === "user"
                    ? "bg-violet-600 text-white"
                    : "bg-gray-800 text-gray-100 border border-gray-700"
                  }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-xs text-gray-500 mb-1">📎 Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {msg.sources.map((s, i) => (
                          <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isAsking && (
            <div className="flex justify-start">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
              placeholder={uploadedDocs.length === 0 ? "Upload a PDF first..." : "Ask a question about your documents..."}
              disabled={uploadedDocs.length === 0 || isAsking}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={handleAsk}
              disabled={!question.trim() || isAsking || uploadedDocs.length === 0}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Ask →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
