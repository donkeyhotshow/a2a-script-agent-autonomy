const fs = require('fs').promises; // Используем нативный fs.promises

function printServerResult(result) {
  if (result && result.result && result.result.content && result.result.content[0] && typeof result.result.content[0].text === 'string') {
    console.log(result.result.content[0].text);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

async function runAndPrint(executor) {
  try {
    const result = await executor();
    printServerResult(result);
  } catch (e) {
    const message = (e && e.message) ? e.message : String(e);
    console.error(`❌ ${message}`);
    process.exit(1);
  }
}

export { printServerResult,
  runAndPrint, };
