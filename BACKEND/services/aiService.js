import "dotenv/config";

function mustEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing environment variable: ${name}`);
    return v;
}

function buildPrompt({ query, featureFlags, fileContext, recentFiles }) {
    const enabled = (id) => !!featureFlags?.[id];

    const flagsText = [
        `ai-search: ${enabled("ai-search") ? "enabled" : "disabled"}`,
        `ai-summary: ${enabled("ai-summary") ? "enabled" : "disabled"}`,
        `ai-organize: ${enabled("ai-organize") ? "enabled" : "disabled"}`,
        `ai-writing: ${enabled("ai-writing") ? "enabled" : "disabled"}`,
    ].join("\n");

    const recentText = Array.isArray(recentFiles) && recentFiles.length
        ? recentFiles
            .slice(0, 12)
            .map((f) => {
                const kind = f.kind ? `(${f.kind})` : "";
                const owner = f.owner ? ` · owner: ${f.owner}` : "";
                const size = typeof f.size === "number" ? ` · ${f.size} bytes` : "";
                return `- ${f.name} ${kind}${owner}${size}`;
            })
            .join("\n")
        : "No recent file metadata provided.";

    const fileContextText = fileContext
        ? `Selected file context:
- name: ${fileContext.name}
- kind: ${fileContext.kind || "unknown"}
- owner: ${fileContext.owner || "unknown"}
- size: ${fileContext.size ?? "unknown"}`
        : "No selected file context provided.";

    const system = `You are Drivya AI, a helpful assistant for a secure cloud file vault.
Rules:
- Respect feature flags strictly. If a capability is disabled, do NOT claim you can do it; instead ask the user to enable it in Labs settings.
- Be concise and practical for a file-management assistant.
- When you mention files, prefer using the provided file names from metadata.
- If summarizing, summarize based on context provided. If context is missing, ask for the file to summarize.`;

    const user = `Feature flags:
${flagsText}

Recent files (metadata only):
${recentText}

${fileContextText}

User request:
${query}

Respond with:
- A short assistant message (max ~600 chars).
- If you are able to produce a summary/draft/search results, include it plainly in the same response.`;

    return { system, user };
}

export async function chat({ query, featureFlags, fileContext, recentFiles }) {
    const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

    const API_KEY = mustEnv("AI_API_KEY");
    const MODEL = process.env.AI_MODEL || "gemini-2.5-flash";

    if (provider === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

        const { system, user } = buildPrompt({
            query,
            featureFlags,
            fileContext,
            recentFiles,
        });

        const body = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: `${system}\n\n${user}` }],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 800,
            },
        };

        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const text = await resp.text().catch(() => "");

            // Gemini free-tier/quota style failures often show up as 429.
            if (resp.status === 429 || /quota|rate limit|exceeded|RESOURCE_EXHAUSTED/i.test(text)) {
                return {
                    message: "Free limit hit. Switching to Free Mode.",
                    freeLimitHit: true,
                };
            }

            throw new Error(`AI provider error: ${resp.status} ${text}`);
        }

        const data = await resp.json();
        const message =
            data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).join("") ||
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!message) throw new Error("AI provider returned empty content");
        return { message };
    }

    // Fallback: OpenAI-compatible chat/completions
    const BASE_URL = process.env.AI_BASE_URL || "https://api.openai.com/v1";

    const { system, user } = buildPrompt({
        query,
        featureFlags,
        fileContext,
        recentFiles,
    });

    const body = {
        model: MODEL,
        messages: [
            { role: "system", content: system },
            { role: "user", content: user },
        ],
        temperature: 0.2,
    };

    const resp = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`AI provider error: ${resp.status} ${text}`);
    }

    const data = await resp.json();
    const message = data?.choices?.[0]?.message?.content;

    if (!message) {
        throw new Error("AI provider returned empty content");
    }

    return { message };
}
