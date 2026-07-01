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

const SUGGESTIONS = [
  "What is the main topic of this document?",
  "Summarize the key points",
  "What are the main conclusions?",
];

const MAX_UPLOADS = 2;
const MAX_QUESTIONS = 5;
const MAX_FILE_SIZE_MB = 5;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("amd_docs");
    return saved ? JSON.parse(saved) : [];
  });
  const [question, setQuestion] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadCount, setUploadCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("amd_uploads") || "0");
  });
  const [questionCount, setQuestionCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("amd_questions") || "0");
  });
  const [limitError, setLimitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // On mount: if no saved docs, wipe the vector store for a clean start
  useEffect(() => {
    const savedDocs = localStorage.getItem("amd_docs");
    if (!savedDocs) {
      fetch("/api/clear", { method: "DELETE" }).catch(() => { });
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAsking]);

  const handleFile = async (file: File) => {
    setLimitError("");

    if (!file.name.endsWith(".pdf")) {
      setLimitError("Only PDF files are supported.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setLimitError(`File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    if (uploadCount >= MAX_UPLOADS) {
      setLimitError(`Upload limit reached. You can upload a maximum of ${MAX_UPLOADS} documents.`);
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        const newDoc = { name: data.filename, chunks: data.chunks };
        setUploadedDocs((prev) => {
          const updated = [...prev, newDoc];
          localStorage.setItem("amd_docs", JSON.stringify(updated));
          return updated;
        });
        const newCount = uploadCount + 1;
        setUploadCount(newCount);
        localStorage.setItem("amd_uploads", String(newCount));
      } else {
        setLimitError(data.error || "Upload failed. Please try again.");
      }
    } catch {
      setLimitError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = async () => {
    try {
      await fetch("/api/clear", { method: "DELETE" });
    } catch { /* ignore */ }
    // Reset all state and localStorage
    setUploadedDocs([]);
    setMessages([]);
    setQuestion("");
    setLimitError("");
    setUploadCount(0);
    setQuestionCount(0);
    localStorage.removeItem("amd_docs");
    localStorage.removeItem("amd_uploads");
    localStorage.removeItem("amd_questions");
  };

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;
    setLimitError("");

    if (questionCount >= MAX_QUESTIONS) {
      setLimitError(`Question limit reached. You can ask a maximum of ${MAX_QUESTIONS} questions per session.`);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), type: "user", content: question.trim() };
    setMessages((p) => [...p, userMsg]);
    setQuestion("");
    setIsAsking(true);

    const newQCount = questionCount + 1;
    setQuestionCount(newQCount);
    localStorage.setItem("amd_questions", String(newQCount));

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.content }),
      });
      const data = await res.json();
      setMessages((p) => [...p, {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.answer || data.error || "Something went wrong.",
        sources: data.sources,
      }]);
    } catch {
      setMessages((p) => [...p, {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Failed to get answer. Try again.",
      }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: "#030712" }}>
      {/* Background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* ── SIDEBAR ── */}
      <aside className="relative z-10 w-72 flex-shrink-0 flex flex-col border-r" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              🧠
            </div>
            <h1 className="font-bold text-lg gradient-text">Ask My Docs</h1>
          </div>
          <p className="text-xs mt-2" style={{ color: "#64748b" }}>AI-powered document Q&A</p>
        </div>

        {/* Upload Zone */}
        <div className="p-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className="rounded-2xl p-5 text-center cursor-pointer transition-all duration-300"
            style={{
              border: `2px dashed ${isDragging ? "#7c3aed" : "rgba(255,255,255,0.12)"}`,
              background: isDragging ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
              boxShadow: isDragging ? "0 0 20px rgba(124,58,237,0.2)" : "none",
            }}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#7c3aed", borderTopColor: "transparent" }} />
                <p className="text-sm" style={{ color: "#94a3b8" }}>Processing PDF...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-1" style={{ background: "rgba(124,58,237,0.15)" }}>📄</div>
                <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>Drop PDF here</p>
                <p className="text-xs" style={{ color: "#475569" }}>or click to browse</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {uploadedDocs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>Indexed Documents</p>
                <button
                  onClick={handleClear}
                  className="text-xs px-2 py-1 rounded-lg transition-all duration-200 hover:opacity-80"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {uploadedDocs.map((doc, i) => (
                  <div key={i} className="rounded-xl p-3 transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-start gap-2">
                      <span className="text-base mt-0.5">📄</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#e2e8f0" }}>{doc.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{doc.chunks} chunks indexed</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Usage counters */}
        <div className="px-4 pb-2">
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs" style={{ color: "#475569" }}>Uploads used</span>
              <span className="text-xs font-semibold" style={{ color: uploadCount >= MAX_UPLOADS ? "#ef4444" : "#a78bfa" }}>
                {uploadCount} / {MAX_UPLOADS}
              </span>
            </div>
            <div className="w-full rounded-full h-1" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-1 rounded-full transition-all duration-300" style={{ width: `${(uploadCount / MAX_UPLOADS) * 100}%`, background: uploadCount >= MAX_UPLOADS ? "#ef4444" : "linear-gradient(90deg, #7c3aed, #4f46e5)" }} />
            </div>
            <div className="flex justify-between items-center mt-2 mb-1">
              <span className="text-xs" style={{ color: "#475569" }}>Questions used</span>
              <span className="text-xs font-semibold" style={{ color: questionCount >= MAX_QUESTIONS ? "#ef4444" : "#a78bfa" }}>
                {questionCount} / {MAX_QUESTIONS}
              </span>
            </div>
            <div className="w-full rounded-full h-1" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-1 rounded-full transition-all duration-300" style={{ width: `${(questionCount / MAX_QUESTIONS) * 100}%`, background: questionCount >= MAX_QUESTIONS ? "#ef4444" : "linear-gradient(90deg, #7c3aed, #4f46e5)" }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-xs text-center" style={{ color: "#334155" }}>Powered by OpenAI + RAG</p>
        </div>
      </aside>

      {/* ── MAIN CHAT ── */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)" }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "#e2e8f0" }}>
              {uploadedDocs.length > 0 ? `Chatting with ${uploadedDocs.length} document${uploadedDocs.length > 1 ? "s" : ""}` : "No documents loaded"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
              {uploadedDocs.length > 0 ? "Ask anything about your documents" : "Upload a PDF to get started"}
            </p>
          </div>
          {uploadedDocs.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-xs font-medium" style={{ color: "#a78bfa" }}>Ready</span>
            </div>
          )}
        </div>

        {/* Error banner */}
        {limitError && (
          <div className="mx-8 mt-4 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            {limitError}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-20">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.3))", border: "1px solid rgba(124,58,237,0.3)" }}>
                <span className="text-2xl font-bold gradient-text">Hola</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2 gradient-text">Ask Anything</h2>
                <p className="text-sm max-w-sm" style={{ color: "#64748b" }}>
                  Upload a PDF on the left, then ask questions. I&apos;ll search through your documents and give you accurate answers.
                </p>
              </div>
              {uploadedDocs.length > 0 && (
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setQuestion(s)}
                      className="text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 hover:scale-[1.01]"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                      💬 {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex message-enter ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                {msg.type === "assistant" && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mr-3 mt-1" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                    🧠
                  </div>
                )}
                <div className="max-w-2xl">
                  <div className="rounded-2xl px-4 py-3"
                    style={msg.type === "user"
                      ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff" }
                      : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#e2e8f0" }
                    }>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                        <p className="text-xs mb-2" style={{ color: "#64748b" }}>📎 Sources</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((s, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                              style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {isAsking && (
            <div className="flex justify-start items-start message-enter">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mr-3" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>🧠</div>
              <div className="rounded-2xl px-4 py-3.5 flex items-center gap-2"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full dot-1" style={{ background: "#7c3aed" }} />
                  <div className="w-2 h-2 rounded-full dot-2" style={{ background: "#7c3aed" }} />
                  <div className="w-2 h-2 rounded-full dot-3" style={{ background: "#7c3aed" }} />
                </div>
                <span className="text-xs" style={{ color: "#64748b" }}>Searching documents...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="px-8 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)" }}>
          <div className="flex gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
                placeholder={uploadedDocs.length === 0 ? "Upload a PDF first..." : "Ask a question about your documents..."}
                disabled={uploadedDocs.length === 0 || isAsking}
                className="w-full rounded-2xl px-5 py-3.5 text-sm outline-none transition-all duration-300 disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#e2e8f0",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(124,58,237,0.6)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>
            <button
              onClick={handleAsk}
              disabled={!question.trim() || isAsking || uploadedDocs.length === 0}
              className="px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", minWidth: "90px" }}
            >
              {isAsking ? "..." : "Ask →"}
            </button>
          </div>
          <p className="text-center text-xs mt-3" style={{ color: "#1e293b" }}>Press Enter to send</p>
        </div>
      </main>
    </div>
  );
}
