<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$questionsFile = __DIR__ . '/questions.json';
$answersFile = __DIR__ . '/answers.json';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (file_exists($questionsFile)) {
        echo file_get_contents($questionsFile);
    } else {
        echo json_encode(['error' => 'No questions found']);
    }
} elseif ($method === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data) {
        $existingAnswers = [];
        if (file_exists($answersFile)) {
            $existingAnswers = json_decode(file_get_contents($answersFile), true);
        }
        
        if (isset($data['partial']) && $data['partial']) {
            // Partial save - single question
            if (!isset($existingAnswers['answers'])) {
                $existingAnswers['answers'] = [];
            }
            $existingAnswers['answers'][$data['questionId']] = $data['answer'];
            $existingAnswers['sessionId'] = $data['sessionId'] ?? 'unknown';
            $existingAnswers['lastUpdated'] = date('c');
        } else {
            // Full save - all answers
            $existingAnswers = [
                'sessionId' => $data['sessionId'] ?? 'unknown',
                'answeredAt' => date('c'),
                'answers' => $data['answers'] ?? []
            ];
        }
        
        file_put_contents($answersFile, json_encode($existingAnswers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        echo json_encode(['success' => true, 'message' => 'Answers saved']);
    } else {
        echo json_encode(['error' => 'Invalid data']);
    }
}
