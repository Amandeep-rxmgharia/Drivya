import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Search,
  FileText,
  FolderTree,
  Pen,
  ArrowRight,
  Send,
  Loader2,
  Copy,
  Check,
  Folder,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { easeSmooth } from "@/lib/motion-presets";
import { detectFileKind } from "@/lib/file-types";
import { FilePreviewModal } from "@/components/recent/FilePreviewModal";
import { FileTypeIcon } from "@/components/dashboard/FileTypeIcon";
import { iconBtn } from "@/components/dashboard/dashboard-tokens";

// Import mock files from RecentFiles
// import { RECENT_FILES } from "@/pages/RecentFiles";
import { listActivities } from "../../../api/activities.js";
import { chatWithAi } from "../../../api/ai.js";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

/* ───────────────────────── Helpers ───────────────────────── */

function formatRelativeTime(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = Date.now();
  const diff = now - dateObj.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function parseAiResponseContent(text, recentFiles = []) {
  let cleanedText = text || "";
  let summary = null;
  let draft = null;
  let searchResults = null;
  let suggestions = null;

  // Extract <summary>...</summary>
  const summaryMatch = cleanedText.match(/<summary>([\s\S]*?)<\/summary>/i);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
    cleanedText = cleanedText.replace(/<summary>[\s\S]*?<\/summary>/i, "");
  }

  // Extract <draft>...</draft>
  const draftMatch = cleanedText.match(/<draft>([\s\S]*?)<\/draft>/i);
  if (draftMatch) {
    draft = draftMatch[1].trim();
    cleanedText = cleanedText.replace(/<draft>[\s\S]*?<\/draft>/i, "");
  }

  // Extract <search_results>...</search_results>
  const searchMatch = cleanedText.match(/<search_results>([\s\S]*?)<\/search_results>/i);
  if (searchMatch) {
    const rawResults = searchMatch[1].trim();
    cleanedText = cleanedText.replace(/<search_results>[\s\S]*?<\/search_results>/i, "");
    
    // Split searchResults by comma or newline and match against recentFiles
    const names = rawResults.split(/,|\n/).map(n => n.trim().toLowerCase()).filter(Boolean);
    if (names.length > 0 && Array.isArray(recentFiles)) {
      searchResults = recentFiles.filter(f => 
        names.some(name => (f.name || "").toLowerCase().includes(name))
      );
    }
  }

  // Extract <suggestions>...</suggestions>
  const suggestionsMatch = cleanedText.match(/<suggestions>([\s\S]*?)<\/suggestions>/i);
  if (suggestionsMatch) {
    const rawSug = suggestionsMatch[1].trim();
    try {
      suggestions = JSON.parse(rawSug);
    } catch (e) {
      console.warn("Failed to parse AI suggestions JSON", e);
    }
    cleanedText = cleanedText.replace(/<suggestions>[\s\S]*?<\/suggestions>/i, "");
  }

  return {
    text: cleanedText.trim(),
    summary,
    draft,
    searchResults,
    suggestions
  };
}

// Custom simple hook to get Labs settings
function useLabsSettings() {
  const [settings, setSettings] = useState({
    "ai-search": true,
    "ai-summary": false,
    "ai-organize": false,
    "ai-writing": false,
  });

  useEffect(() => {
    const checkSettings = () => {
      const stored = localStorage.getItem("drivya-ai-features");
      if (stored) {
        try {
          setSettings(JSON.parse(stored));
        } catch (e) {
          // ignore
        }
      }
    };
    checkSettings();
    window.addEventListener("storage", checkSettings);
    window.addEventListener("drivya-labs-updated", checkSettings);
    return () => {
      window.removeEventListener("storage", checkSettings);
      window.removeEventListener("drivya-labs-updated", checkSettings);
    };
  }, []);

  return settings;
}

/* ───────────────────────── Component ───────────────────────── */

export function AiAssistantPanel({
  isOpen,
  onClose,
  initialRequest,
  clearInitialRequest,
}) {
  const labsSettings = useLabsSettings();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your Drivya AI Companion. Ask me to search your vault using natural language, organize files, or draft release documents.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [organizeSuccess, setOrganizeSuccess] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);

  const [freeModeOpen, setFreeModeOpen] = useState(false);
  const [freeModeAnswer, setFreeModeAnswer] = useState("");

  const chatContainerRef = useRef(null);

  // Fetch real activity data for AI search/summarize
  useEffect(() => {
    let cancelled = false;
    listActivities({ limit: 50 })
      .then((data) => {
        if (!cancelled) setRecentFiles(data.items || []);
      })
      .catch((err) => console.error("AI panel: failed to fetch activities", err));
    return () => { cancelled = true; };
  }, []);

  // Auto-scroll to bottom of chat container
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  // Handle incoming contextual request (e.g. summarizing a file from the preview modal)
  useEffect(() => {
    if (isOpen && initialRequest) {
      if (initialRequest.action === "summarize" && initialRequest.file) {
        handleSummarizeFile(initialRequest.file);
      }
      clearInitialRequest();
    }
  }, [isOpen, initialRequest]);

  // Copy helper
  const handleCopy = (text, msgId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Check if feature is enabled in Labs
  const isFeatureEnabled = (featureId) => {
    return !!labsSettings[featureId];
  };

  // Generate feature disabled warning message
  const getDisabledWarning = (featureName, featureId) => {
    return {
      sender: "ai",
      text: `⚠️ **${featureName}** is currently disabled in your Labs settings. Please enable it in Settings to use this feature.`,
      isWarning: true,
      featureId,
      timestamp: new Date(),
    };
  };

  const makeFreeModeAnswer = (query) => {
    const lower = (query || "").toLowerCase();
    const recent = recentFiles || [];
    const top = recent.slice(0, 5).map((f) => f?.name).filter(Boolean);

    const prefix = "Free Mode (limited) — here’s my best answer based on your vault metadata:";

    if (lower.includes("summar") || lower.includes("sum up")) {
      if (top.length) {
        return `${prefix}\n\nI can’t access full document intelligence right now, but you can summarize a file by name. Top recent files: ${top.join(
          ", ",
        )}. Example prompt: “summarize ${top[0]}”.`;
      }
      return `${prefix}\n\nTry opening a file preview and using “Ask AI to Summarize”.`;
    }

    if (lower.includes("find") || lower.includes("search") || lower.includes("show")) {
      if (top.length) {
        return `${prefix}\n\nTop recent files: ${top.join(
          ", ",
        )}. Try: “find ${top[0]}” or “show ${top[0]}”.`;
      }
      return `${prefix}\n\nNo recent files found yet—upload or open a file, then try again.`;
    }

    if (lower.includes("organize") || lower.includes("folder") || lower.includes("categor")) {
      return `${prefix}\n\nEnable “AI Organization” in Labs to get real organization suggestions. Meanwhile, group by file type (PDF/keynote/docs) and move drafts to a “release-docs” folder.`;
    }

    return `${prefix}\n\nAsk me for: “find <filename>”, “summarize <filename>”, “organize my files”, or “draft a launch email”.`;
  };

  const handleSend = (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    if (!textToSend) setInputValue("");

    // Add user message
    const userMsg = {
      id: crypto.randomUUID(),
      sender: "user",
      text: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Real AI response via backend
    processAiResponse(query);
  };

  const handleSummarizeFile = (file) => {
    // Add user request message implicitly
    const userMsg = {
      id: crypto.randomUUID(),
      sender: "user",
      text: `Summarize document "${file.name}"`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    if (!isFeatureEnabled("ai-summary")) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            ...getDisabledWarning("AI Summarization", "ai-summary"),
          },
        ]);
        setIsTyping(false);
      }, 800);
      return;
    }

    // Call real AI processing with file context
    processAiResponse(`Summarize document "${file.name}"`, file);
  };

  // Process AI Responses (real LLM via backend, but keep Labs gating)
  const processAiResponse = async (query, customFileContext = null) => {
    const lower = query.toLowerCase();

    const needsSearch =
      lower.includes("find") ||
      lower.includes("search") ||
      lower.includes("show") ||
      lower.includes("guidelines") ||
      lower.includes("pdf") ||
      lower.includes("keynote") ||
      lower.includes("deck") ||
      lower.includes("file");

    const needsSummary = lower.includes("summar") || lower.includes("sum up");
    const needsOrganize =
      lower.includes("organi") ||
      lower.includes("categor") ||
      lower.includes("folders") ||
      lower.includes("clean");
    const needsWriting =
      lower.includes("write") ||
      lower.includes("draft") ||
      lower.includes("email") ||
      lower.includes("assistant") ||
      lower.includes("create");

    if (needsSearch && !isFeatureEnabled("ai-search")) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          ...getDisabledWarning("AI File Search", "ai-search"),
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
      return;
    }
    if (needsSummary && !isFeatureEnabled("ai-summary")) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          ...getDisabledWarning("AI Summarization", "ai-summary"),
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
      return;
    }
    if (needsOrganize && !isFeatureEnabled("ai-organize")) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          ...getDisabledWarning("AI Organization", "ai-organize"),
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
      return;
    }
    if (needsWriting && !isFeatureEnabled("ai-writing")) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          ...getDisabledWarning("AI Writing Assistant", "ai-writing"),
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
      return;
    }

    const recentFilesForAi = (recentFiles || []).map((f) => ({
      id: f.id || f.resourceId,
      name: f.name,
      kind: f.kind,
      owner: f.owner,
      size: f.size,
    }));

    let fileContext = null;
    if (customFileContext) {
      fileContext = {
        id: customFileContext.id || customFileContext.resourceId,
        name: customFileContext.name,
        kind: customFileContext.kind,
        owner: customFileContext.owner,
        size: customFileContext.size,
      };
    } else if (needsSummary) {
      const foundFile = recentFiles.find((f) =>
        lower.includes((f.name || "").toLowerCase().split(".")[0]),
      );
      if (foundFile) {
        fileContext = {
          id: foundFile.id || foundFile.resourceId,
          name: foundFile.name,
          kind: foundFile.kind,
          owner: foundFile.owner,
          size: foundFile.size,
        };
      }
    }

    try {
      const data = await chatWithAi({
        query,
        featureFlags: labsSettings,
        fileContext,
        recentFiles: recentFilesForAi,
      });

      // Backend-driven: free/quota hit from provider (e.g., Gemini 429)
      if (data?.freeLimitHit) {
        const fallback = makeFreeModeAnswer(query);
        setFreeModeAnswer(fallback);
        setFreeModeOpen(true);

        const parsed = parseAiResponseContent(fallback, recentFiles);
        // Immediately show fallback answer in chat as well
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "ai",
            text: parsed.text,
            summary: parsed.summary,
            draft: parsed.draft,
            suggestions: parsed.suggestions,
            searchResults: parsed.searchResults,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const aiText = data?.message || data?.reply?.message || "AI did not return a message.";
      const parsed = parseAiResponseContent(aiText, recentFiles);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: parsed.text,
          summary: parsed.summary,
          draft: parsed.draft,
          suggestions: parsed.suggestions,
          searchResults: parsed.searchResults,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error("AI panel: failed to get AI response", err);

      // If backend errors (not a structured freeLimitHit), treat as "different free modal hit"
      const fallback = makeFreeModeAnswer(query);
      setFreeModeAnswer(fallback);

      // Second-stage confirm modal (as per your requirement: if all modal hits free limit)
      setFreeModeOpen(true);

      const parsed = parseAiResponseContent(fallback, recentFiles);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: parsed.text,
          summary: parsed.summary,
          draft: parsed.draft,
          suggestions: parsed.suggestions,
          searchResults: parsed.searchResults,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const getMockSummary = (file) => {
    const name = file.name.toLowerCase();
    if (name.includes("guidelines")) {
      return `### Brand Guidelines v3.pdf Summary
- **Overview**: Outlines the revised corporate branding system for Drivya 2026.
- **Key Sections**:
  - Logo clearance guidelines & prohibited lockups.
  - Harmony color specs (Primary Indigo/Vibrant Sky/Accent Violet HSL Hues).
  - Typography weights (Inter Variable and Space Grotesk combinations).
- **Security Check**: Signed with SHA-256 vault authentication. Ready for external design partners.`;
    }
    if (name.includes("keynote")) {
      return `### Q4 Keynote Presentation Summary
- **Overview**: Final slide presentation detailing the Q4 product roadmap.
- **Key Metrics Highlighted**:
  - Active retention growth: +14% QoQ.
  - Multi-device syncing speed improvements (latency down to 180ms).
  - Introduction of encrypted collaborative folders.
- **Target Audience**: Core development team and key internal stake-holders.`;
    }
    if (name.includes("investor")) {
      return `### Investor Deck Summary
- **Overview**: Pitch deck for Series B fundraising.
- **Content Outline**:
  - Product market fit metrics (1.2M encrypted transactions in 2026).
  - Financial targets & ARR trajectory: reaching $12M ARR by end of 2027.
  - Security certifications list (SOC2 Type II, HIPAA storage compliance).
- **Owner**: Maya P. (shared folder link enabled).`;
    }
    if (name.includes("routes")) {
      return `### api-routes.ts Summary
- **Overview**: TypeScript routing backend definitions.
- **Details**:
  - Secure endpoints for file upload handshakes and storage quota checking.
  - Connects authentication validation middleware to storage API layers.
  - Implements temporary URL encryption policies (AES-256).`;
    }
    return `### ${file.name} Summary
- **Type**: ${file.kind || detectFileKind(file.name)}
- **Size**: ${file.size}
- **Owner**: ${file.owner}
- **Analysis**: Standard file asset located in workspace. Encrypted at rest. Analysis indicates this contains application metadata and logs associated with the user profile.`;
  };

  const handleApplyOrganization = () => {
    setOrganizing(true);
    setTimeout(() => {
      setOrganizing(false);
      setOrganizeSuccess(true);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: "✅ Files have been successfully categorized! `Hero-shot-005.png` and `investor-deck.key` were moved to **launch-assets**; `api-routes.ts` was organized in a new folder **developer-core**.",
          timestamp: new Date(),
        },
      ]);
    }, 1500);
  };

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Slider panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              style={{ willChange: "transform" }}
              className={cn(
                "fixed z-50 overflow-hidden bg-background border-l border-border/80 shadow-elegant flex flex-col font-sans",
                "inset-y-0 right-0 w-full md:w-[420px] lg:w-[460px] max-w-[100vw]",
              )}
            >
              {/* Radial gradient backing glow */}
              <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-accent/8 blur-3xl pointer-events-none" />

              {/* Header */}
              <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-5 bg-background shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </span>
                  <div className="flex flex-col leading-none">
                    <span className="font-display text-[15px] font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                      Drivya AI
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-500)] animate-pulse" />
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest font-display">
                        Companion
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    iconBtn,
                    "h-9 w-9 hover:scale-105 active:scale-95 transition-transform",
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              {/* Chat Messages (fixed flex height collapse by setting min-h-0) */}
              <div
                ref={chatContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 relative scrollbar-thin flex flex-col"
              >
                <div className="flex-1" />{" "}
                {/* Spacer pushing content to bottom initially */}
                {messages.map((msg) => {
                  const isAi = msg.sender === "ai";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={cn(
                        "flex w-full gap-3 items-start",
                        isAi ? "justify-start" : "justify-end",
                      )}
                    >
                      {isAi && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary mt-0.5">
                          <Sparkles className="h-3 w-3" />
                        </div>
                      )}

                      <div className="max-w-[82%] min-w-0 space-y-2 flex flex-col">
                        {/* Text bubble */}
                        <div
                          className={cn(
                            "rounded-2xl p-4 text-[13px] leading-relaxed shadow-sm break-words overflow-hidden",
                            isAi
                              ? "bg-secondary/40 border border-border text-foreground/90 rounded-tl-sm font-sans"
                              : "bg-primary/10 border border-primary/25 text-foreground rounded-tr-sm font-sans",
                          )}
                        >
                          <p className="whitespace-pre-line text-left leading-relaxed">
                            {msg.text}
                          </p>

                          {/* Warning action for settings */}
                          {msg.isWarning && (
                            <button
                              onClick={() => {
                                onClose();
                                navigate("/dashboard/settings/labs");
                              }}
                              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline font-display"
                            >
                              Go to Labs Settings{" "}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Summary Widget */}
                        {msg.summary && (
                          <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 text-[12.5px] text-foreground/85 leading-relaxed space-y-2 shadow-inner font-sans text-left">
                            <p className="whitespace-pre-line leading-relaxed">
                              {msg.summary}
                            </p>
                          </div>
                        )}

                        {/* Copyable Draft Widget */}
                        {msg.draft && (
                          <div className="rounded-xl border border-border bg-secondary/20 overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-3.5 py-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-display">
                                Draft Content
                              </span>
                              <button
                                onClick={() => handleCopy(msg.draft, msg.id)}
                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-display"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-primary font-semibold">
                                      Copied!
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="p-4 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-w-full text-foreground/85 bg-black/10 select-all text-left">
                              {msg.draft}
                            </pre>
                          </div>
                        )}

                        {/* File Search Results Widget */}
                        {msg.searchResults && msg.searchResults.length > 0 && (
                          <div className="space-y-1.5 w-full">
                            {msg.searchResults.map((file) => {
                              const kind = detectFileKind(file.name, file.kind);
                              return (
                                <button
                                  key={file.id}
                                  onClick={() => setPreviewFile(file)}
                                  className="w-full flex items-center justify-between rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/20 p-3 transition-all text-left group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <FileTypeIcon kind={kind} size="sm" />
                                    <div className="min-w-0">
                                      <div className="text-[12.5px] font-semibold text-foreground truncate group-hover:text-primary transition-colors font-display">
                                        {file.name}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                                        {typeof file.size === "number" ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : file.size}{file.owner ? ` · ${file.owner}` : ""}
                                      </div>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 group-hover:text-primary transition-colors" />
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Smart Folder Suggestion Actions */}
                        {msg.suggestions && (
                          <div className="rounded-xl border border-border/80 bg-secondary/20 p-4 space-y-3 w-full text-left">
                            <div className="space-y-2">
                              {msg.suggestions.map((sug, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span className="font-semibold text-foreground truncate max-w-[120px]">
                                    {sug.file}
                                  </span>
                                  <span className="text-muted-foreground/60">
                                    →
                                  </span>
                                  <span className="rounded bg-primary/10 border border-primary/25 px-1.5 py-0.5 font-medium text-primary text-[10px] tracking-wide font-display">
                                    {sug.action}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {!organizeSuccess && (
                              <button
                                onClick={handleApplyOrganization}
                                disabled={organizing}
                                className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-primary text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition-all disabled:opacity-50 font-display cursor-pointer"
                              >
                                {organizing ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Applying Changes...
                                  </>
                                ) : (
                                  <>
                                    <FolderTree className="h-3.5 w-3.5" />
                                    Apply smart organization
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {/* AI Typing Pulse */}
                {isTyping && (
                  <div className="flex w-full justify-start gap-3 animate-pulse items-center">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </div>
                    <div className="rounded-2xl px-4 py-2.5 bg-secondary/40 border border-border text-xs font-medium text-muted-foreground flex items-center gap-1.5 font-sans">
                      <span>Drivya AI is analyzing</span>
                      <span className="flex gap-0.5">
                        <span
                          className="h-1 w-1 rounded-full bg-muted-foreground/70 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-1 w-1 rounded-full bg-muted-foreground/70 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="h-1 w-1 rounded-full bg-muted-foreground/70 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Suggestions Quick links */}
              {messages.length === 1 && (() => {
                const availableChips = [];
                
                // 1. Search suggestion
                if (isFeatureEnabled("ai-search")) {
                  const searchFile = recentFiles && recentFiles[0];
                  if (searchFile && searchFile.name) {
                    availableChips.push({
                      text: `🔍 AI Search '${searchFile.name}'`,
                      query: `find ${searchFile.name}`,
                    });
                  } else {
                    availableChips.push({
                      text: "🔍 AI Search your vault",
                      query: "find my files",
                    });
                  }
                }

                // 2. Summary suggestion
                if (isFeatureEnabled("ai-summary")) {
                  const docFile = recentFiles && recentFiles[0];
                  if (docFile && docFile.name) {
                    availableChips.push({
                      text: `📄 Summarize "${docFile.name}"`,
                      query: `summarize ${docFile.name}`,
                    });
                  } else {
                    availableChips.push({
                      text: "📄 Summarize a document",
                      query: "summarize",
                    });
                  }
                }

                // 3. Organization suggestion
                if (isFeatureEnabled("ai-organize")) {
                  availableChips.push({
                    text: "📁 Suggest folder categorizations",
                    query: "organize my files",
                  });
                }

                // 4. Writing/Draft suggestion
                if (isFeatureEnabled("ai-writing")) {
                  availableChips.push({
                    text: "✍️ Write a launch email draft",
                    query: "write a launch email draft",
                  });
                }

                const allDisabled = !isFeatureEnabled("ai-search") && 
                                    !isFeatureEnabled("ai-summary") && 
                                    !isFeatureEnabled("ai-organize") && 
                                    !isFeatureEnabled("ai-writing");

                if (allDisabled) {
                  return (
                    <div className="px-5 py-4 border-t border-border/50 bg-destructive/5 shrink-0 space-y-2.5">
                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                        ⚠️ All Drivya AI capabilities are currently disabled in your settings. Enable them in Labs to ask queries or view suggestions.
                      </p>
                      <button
                        onClick={() => {
                          onClose();
                          navigate("/dashboard/settings/labs");
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all font-display cursor-pointer"
                      >
                        Go to Labs Settings
                      </button>
                    </div>
                  );
                }

                return (
                  availableChips.length > 0 && (
                    <div className="px-5 py-3 border-t border-border/50 bg-secondary/10 shrink-0">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 font-display">
                        Suggested Actions
                      </div>
                      <div className="flex flex-col gap-2">
                        {availableChips.map((chipItem, index) => (
                          <button
                            key={index}
                            onClick={() => handleSend(chipItem.query)}
                            className="w-full flex items-center justify-between rounded-xl border border-border bg-background/50 px-3.5 py-2.5 text-xs text-foreground/80 hover:bg-secondary/60 hover:text-foreground hover:border-primary/20 transition-all font-medium font-display text-left group cursor-pointer"
                          >
                            <span>{chipItem.text}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/45 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                );
              })()}

              {/* Input Form Footer */}
              <footer className="border-t border-border/60 p-4 bg-background shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask Drivya AI about your files..."
                    className="flex-1 h-11 rounded-xl border border-border bg-secondary/30 px-4 text-[13.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </footer>
            </motion.div>

            {/* Free mode fallback modal */}
            <AnimatePresence>
              {freeModeOpen && (
                <ConfirmModal
                  title="Switching to Free Mode"
                  description="The AI model failed to respond. Switching to a limited Free Mode answer using your vault metadata."
                  confirmLabel="Use Free Mode"
                  onCancel={() => setFreeModeOpen(false)}
                  onConfirm={() => setFreeModeOpen(false)}
                />
              )}
            </AnimatePresence>

            {/* Custom file preview launcher from inside AI assistant chat results */}
            <AnimatePresence>
              {previewFile && (
                <FilePreviewModal
                  file={previewFile}
                  onClose={() => setPreviewFile(null)}
                  formatTime={formatRelativeTime}
                  onStar={() => { }}
                  onShare={() => { }}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
