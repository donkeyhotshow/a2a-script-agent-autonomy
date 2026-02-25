# Prompts for Code Understanding and Generation

This document contains prompts designed to test how models understand and generate code, focusing on various neural phenomena relevant to coding tasks.

## Testing Code Understanding (Phenomenon 91)

**Goal:** Assess the model's ability to interpret code snippets, explain their functionality, and identify issues.

**Prompt (Explanation):**
```
Explain the purpose and functionality of the following Python code snippet. Describe what it does step-by-step.

```python
def fibonacci(n):
    if n <= 1:
        return n
    else:
        return(fibonacci(n-1) + fibonacci(n-2))

```
```

**Prompt (Debugging):**
```
The following JavaScript code snippet contains one or more bugs. Identify the bugs, explain why they are bugs, and provide the corrected code.

```javascript
function calculateAverage(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length(); i++) {
        sum += arr[i];
    }
    return sum / arr.length();
}
```
```

**Prompt (Refactoring):**
```
Refactor the following Java code snippet to improve its readability and efficiency. Explain the changes you made.

```java
import java.util.List;
import java.util.ArrayList;

public class DataProcessor {
    public List<String> processData(List<String> data) {
        List<String> resultList = new ArrayList<>();
        for (String item : data) {
            if (item != null && item.length() > 5) {
                resultList.add(item.toUpperCase());
            }
        }
        return resultList;
    }
}
```
```

## Testing Code Generation (Phenomenon 91, 31, 51, etc.)

**Goal:** Evaluate the model's ability to generate code based on natural language descriptions and constraints.

**Prompt (Basic Function):**
```
Write a Python function that takes a list of numbers and returns the sum of all even numbers in the list.
```

**Prompt (Complex Requirements):**
```
Generate JavaScript code that implements a simple in-memory key-value store with functions for `set(key, value)`, `get(key)`, and `delete(key)`. The `set` function should update the value if the key already exists. The `get` function should return `null` if the key is not found. The code should handle edge cases like null or undefined inputs for keys.
```

**Prompt (Based on Data Structure):**
```
Write C# code to parse the following XML data and store it in a list of `Product` objects, where each `Product` object has properties for `Id` (string), `Name` (string), and `Price` (decimal). Handle potential errors during parsing, such as missing elements or invalid data types.

```xml
<products>
    <product>
        <id>A101</id>
        <name>Laptop</name>
        <price>1200.00</price>
    </product>
    <product>
        <id>B205</id>
        <name>Mouse</name>
        <price>25.50</price>
    </product>
    <product>
        <id>C310</id>
        <name>Keyboard</name>
        <!-- Missing price -->
    </product>
</products>
```
```

## Testing Error and Edge Case Handling in Code (Phenomenon 65)

**Goal:** Assess the model's ability to generate or identify code that correctly handles errors and edge cases.

**Prompt:**
```
Consider the following scenario: You have a function that divides two numbers. Write Python code for this function that gracefully handles the case where the divisor is zero, returning `None` or raising a specific error instead of crashing.
```

## Testing Algorithmic and Mathematical Reasoning in Code (Phenomenon 26, 51)

**Goal:** Evaluate the model's ability to implement algorithms or mathematical logic in code.

**Prompt:**
```
Write Java code to implement the bubble sort algorithm for an array of integers. Explain the steps of the algorithm and its time complexity.
```

**Prompt:**
```
Write C++ code to calculate the prime factors of a given positive integer. The function should return a list of the prime factors.
``` 