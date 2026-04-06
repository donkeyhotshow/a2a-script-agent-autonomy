Task completed: Extracted the first token receipt logic from the Thread component to the useA2AStream hook.

Changes made:
1. Added firstTokenReceived state and prevMessageLength ref to useA2AStream hook
2. Moved the useEffect that tracks message length changes to the hook
3. Removed duplicated logic from Thread component
4. Updated Thread component to use stream.firstTokenReceived from context
5. Simplified handleRegenerate function

The logic now correctly resides in the useStream hook, eliminating duplication and placing it in the appropriate layer.