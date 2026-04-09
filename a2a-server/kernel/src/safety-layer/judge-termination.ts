export async function summarizeContext(context: any): Promise<string> {
    return "mock_summary_of_context";
}

export async function llmFlash(prompt: string): Promise<string> {
    // Mock call to gemini-flash
    return "YES";
}

export async function judgeLoopDone(context: any, iteration: number): Promise<boolean> {
  if (iteration <= 7) return false;
  
  const summary = await summarizeContext(context);
  const prompt = `Task summary: ${summary}\nIs this task COMPLETELY DONE? Reply ONLY "YES" or "NO":`;
  
  const verdict = await llmFlash(prompt);
  return verdict.trim().toUpperCase() === "YES";
}
