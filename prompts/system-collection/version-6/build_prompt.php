<?php
// build_prompt.php
// Использование: php build_prompt.php --combo combo1.json --combo combo2.json ...
// combo1.json: { "parts": ["types/bool.json", "includes/recommendation1.txt", ...] }
// Генерирует markdown файлы с сериями промтов для даемона.

if ($argc < 2) {
    fwrite(STDERR, "Usage: php build_prompt.php --combo combo1.json [--combo combo2.json ...]\n");
    exit(1);
}

if (!is_dir('output')) {
    mkdir('output');
}

$combos = [];
for ($i = 1; $i < $argc; $i++) {
    if ($argv[$i] === '--combo' && isset($argv[$i+1])) {
        $combos[] = $argv[++$i];
    }
}

if (empty($combos)) {
    fwrite(STDERR, "No combo files specified.\n");
    exit(1);
}

foreach ($combos as $comboFile) {
    if (!file_exists($comboFile)) {
        fwrite(STDERR, "Combo file not found: $comboFile\n");
        continue;
    }
    $combo = json_decode(file_get_contents($comboFile), true);
    if (!isset($combo['parts']) || !is_array($combo['parts'])) {
        fwrite(STDERR, "Invalid combo file: $comboFile\n");
        continue;
    }

    $markdownContent = "# Prompt Sequence: " . basename($comboFile, '.json') . "\n\n";
    $markdownContent .= "This sequence is generated from the combo file: {$comboFile}\n\n";

    $step = 1;
    foreach ($combo['parts'] as $part) {
        if (!file_exists($part)) {
            fwrite(STDERR, "Part not found: $part\n");
            continue;
        }
        $content = file_get_contents($part);

        // Если это JSON с recommendations, добавляем их
        if (substr($part, -5) === '.json') {
            $json = json_decode($content, true);
            if (isset($json['recommendations']) && is_array($json['recommendations'])) {
                // Добавляем рекомендации внутри контента JSON, перед помещением в блок кода
                $content = trim($content) . "\n\n// Recommendations:\n" . implode("\n", $json['recommendations']);
            }
        }

        $markdownContent .= "## Step {$step}\n\n";
        $markdownContent .= "```text\n";
        $markdownContent .= $content;
        $markdownContent .= "\n```\n\n";
        $markdownContent .= "---\n\n";

        $step++;
    }

    $outFile = 'output/' . basename($comboFile, '.json') . '.md';
    file_put_contents($outFile, trim($markdownContent)); // trim для удаления лишней пустой строки в конце
    echo "Prompt sequence built: $outFile\n";
} 