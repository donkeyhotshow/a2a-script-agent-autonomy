# Process Response Patches Action

**ID:** `process-response-patches`  
**Description:** Extract patches from AI response, store them using PatchStorage, and return modified response with patch file paths.  
**Source:** `laravel-agent-workspace-tools/scripts/process-response-patches.js`

## Metadata

| Field | Value |
|-------|-------|
| version | 1.0.0 |
| author | greedy-dump integration |
| tags | patches, ai-response, processing |

## Input Schema

```json
{
  "response": "string (required) - AI response containing patches to extract"
}
```

## Output Schema

```json
{
  "success": "boolean",
  "modifiedResponse": "string - Response with patch content replaced by file references",
  "patchPaths": "array - Array of paths where patches were stored",
  "error": "string (optional) - Error message if processing failed"
}
```

## Sub-actions

### `extract-patches`

Extracts patches from AI response and stores them.

```typescript
export default async function run(input: {
  response: string;
}): Promise<{
  success: boolean;
  modifiedResponse: string;
  patchPaths: string[];
  error?: string;
}> {
  const { response } = input;

  if (!response) {
    return {
      success: false,
      modifiedResponse: "",
      patchPaths: [],
      error: "Response is required"
    };
  }

  try {
    // The original script uses:
    // - PatchStorage from packages/patch-manager/src/index.js
    // - extractPatchesFromResponse from src/application/scenarios/scenario-executor.js
    
    // In a real implementation:
    // 1. Extract patches from response using extractPatchesFromResponse
    // 2. Store each patch using PatchStorage
    // 3. Replace patch content with file path references
    
    // Simulate patch extraction
    const patches: string[] = [];
    const patchPaths: string[] = [];
    
    // This is a placeholder - real implementation would parse the response
    // for patch markers like ```diff, @@, etc.
    
    if (patches.length === 0) {
      // No patches found, return original response
      return {
        success: true,
        modifiedResponse: response,
        patchPaths: []
      };
    }

    let modifiedResponse = response;
    
    for (let i = 0; i < patches.length; i++) {
      const patchContent = patches[i];
      const filename = `response-patch-${Date.now()}-${i}.patch`;
      const patchPath = `./patches/${filename}`;
      
      patchPaths.push(patchPath);
      
      // Replace patch content with file reference
      const patchIndex = modifiedResponse.indexOf(patchContent);
      if (patchIndex !== -1) {
        const beforePatch = modifiedResponse.substring(0, patchIndex);
        const afterPatch = modifiedResponse.substring(patchIndex + patchContent.length);
        modifiedResponse = beforePatch + `[Patch stored at: ${patchPath}]` + afterPatch;
      }
    }

    return {
      success: true,
      modifiedResponse,
      patchPaths
    };
  } catch (error) {
    return {
      success: false,
      modifiedResponse: response,
      patchPaths: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

## Patch Storage

Patches are stored with metadata:
- `source`: "response"
- `extractedAt`: ISO timestamp
- `originalFile`: Original file path if applicable

## Usage Example

```json
{
  "execute": {
    "process-response-patches": {
      "response": "AI response containing patch content..."
    }
  }
}