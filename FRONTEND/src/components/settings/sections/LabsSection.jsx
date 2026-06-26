import { useState } from "react";
import {
  Beaker,
  Sparkles,
  Search,
  FileText,
  FolderTree,
  Pen,
  Flag,
  Palette,
  Globe,
  Image,
  MessageSquare,
} from "lucide-react";
import {
  SettingSection,
  SettingRow,
  SettingBanner,
  TierBadge,
} from "../setting-primitives";
import { SettingToggle } from "../setting-controls";

const AI_FEATURES = [
  {
    id: "ai-search",
    name: "AI File Search",
    description:
      'Search your files using natural language queries like "find the marketing deck from last month".',
    icon: Search,
    enabled: true,
  },
  {
    id: "ai-summary",
    name: "AI Summarization",
    description:
      "Generate quick summaries of documents, presentations, and long files.",
    icon: FileText,
    enabled: false,
  },
  {
    id: "ai-organize",
    name: "AI Organization",
    description:
      "Smart suggestions for categorizing and organizing your files into folders.",
    icon: FolderTree,
    enabled: false,
  },
  {
    id: "ai-writing",
    name: "AI Writing Assistant",
    description:
      "In-line editing assistance for text documents with grammar, style, and content suggestions.",
    icon: Pen,
    enabled: false,
  },
];

const EARLY_ACCESS = [
  {
    id: "smart-albums",
    name: "Smart Albums",
    description:
      "AI-powered photo albums that auto-organize by people, places, and events.",
    icon: Image,
    enabled: false,
    status: "Alpha",
  },
  {
    id: "file-comments",
    name: "File Comments",
    description: "Leave comments and annotations directly on any file type.",
    icon: MessageSquare,
    enabled: true,
    status: "Beta",
  },
  {
    id: "custom-themes",
    name: "Custom Themes",
    description:
      "Create and share fully custom color themes beyond the built-in presets.",
    icon: Palette,
    enabled: false,
    status: "Alpha",
  },
];

export default function LabsSection() {
  const [aiFeatures, setAiFeatures] = useState(() => {
    const stored = localStorage.getItem("drivya-ai-features");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // ignore fallback
      }
    }
    const state = {};
    AI_FEATURES.forEach((f) => {
      state[f.id] = f.enabled;
    });
    return state;
  });

  const [earlyAccess, setEarlyAccess] = useState(() => {
    const stored = localStorage.getItem("drivya-early-access");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // ignore fallback
      }
    }
    const state = {};
    EARLY_ACCESS.forEach((f) => {
      state[f.id] = f.enabled;
    });
    return state;
  });

  const toggleAi = (id) => {
    setAiFeatures((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("drivya-ai-features", JSON.stringify(next));
      return next;
    });
  };

  const toggleEarly = (id) => {
    setEarlyAccess((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("drivya-early-access", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="px-1">
        <SettingBanner variant="warning" icon={Beaker}>
          Labs features are experimental and may change or be removed. They may
          be less stable than production features. Your feedback helps shape
          these into final releases.
        </SettingBanner>
      </div>

      {/* Drivya AI */}
      <SettingSection
        id="drivya-ai"
        icon={Sparkles}
        title="Drivya AI"
        description="AI-powered features across the platform."
      >
        <div className="px-6 py-3 space-y-2">
          {AI_FEATURES.map((feature) => (
            <div
              key={feature.id}
              className={`rounded-xl border p-4 transition-all duration-200 ${
                aiFeatures[feature.id]
                  ? "border-primary/20 bg-primary/[0.03]"
                  : "border-border/60 bg-secondary/10 hover:bg-secondary/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    aiFeatures[feature.id]
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <feature.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {feature.name}
                    </span>
                    <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                      Beta
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <SettingToggle
                  checked={aiFeatures[feature.id]}
                  onChange={() => toggleAi(feature.id)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-4">
          <SettingBanner variant="info" icon={Sparkles}>
            AI features process your files securely. Content is encrypted in
            transit and <strong>not stored</strong> after processing. View what
            was processed in your AI Activity log.
          </SettingBanner>
        </div>
      </SettingSection>

    </div>
  );
}
