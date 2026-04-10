# browser-interaction

Interact with web pages using browser automation.

**Priority:** 20

**Project:** general

## Sub-actions

### 1. navigate

Navigate to a URL.

**Input:** { url: string }  
**Output:** { success: boolean, currentUrl: string }

```typescript
import { chromium } from 'playwright';

let browser;
let page;

export default async function navigate(input: { url: string }): Promise<{ success: boolean, currentUrl: string }> {
  try {
    if (!browser) {
      browser = await chromium.launch({ headless: false });
      page = await browser.newPage();
    }
    await page.goto(input.url);
    const currentUrl = page.url();
    return { success: true, currentUrl };
  } catch (error) {
    console.error('Navigation failed:', error);
    return { success: false, currentUrl: '' };
  }
}
```

### 2. click

Click on an element.

**Input:** { selector: string }  
**Output:** { success: boolean }

```typescript
export default async function click(input: { selector: string }): Promise<{ success: boolean }> {
  try {
    await page.click(input.selector);
    return { success: true };
  } catch (error) {
    console.error('Click failed:', error);
    return { success: false };
  }
}
```

### 3. type

Type text into an element.

**Input:** { selector: string, text: string }  
**Output:** { success: boolean }

```typescript
export default async function type(input: { selector: string, text: string }): Promise<{ success: boolean }> {
  try {
    await page.fill(input.selector, input.text);
    return { success: true };
  } catch (error) {
    console.error('Type failed:', error);
    return { success: false };
  }
}
```

### 4. screenshot

Take a screenshot.

**Input:** { path?: string }  
**Output:** { success: boolean, screenshot: string }

```typescript
export default async function screenshot(input: { path?: string }): Promise<{ success: boolean, screenshot: string }> {
  try {
    const buffer = await page.screenshot({ path: input.path });
    return { success: true, screenshot: buffer.toString('base64') };
  } catch (error) {
    console.error('Screenshot failed:', error);
    return { success: false, screenshot: '' };
  }
}
```

### 5. close

Close the browser.

**Input:** none  
**Output:** { success: boolean }

```typescript
export default async function close(input: {}): Promise<{ success: boolean }> {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }
    return { success: true };
  } catch (error) {
    console.error('Close failed:', error);
    return { success: false };
  }
}
```

## Context

| Key | Value |
|-----|-------|
| projectType | general |
| syncMode | async |