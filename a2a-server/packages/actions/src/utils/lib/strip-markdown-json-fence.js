export function stripMarkdownJsonFence(text) { return text.replace(/^```(json)?\n/, "").replace(/```$/, ""); }
