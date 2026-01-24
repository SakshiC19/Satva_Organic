<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get the target URL from the query string or body
$targetUrl = isset($_GET['url']) ? $_GET['url'] : '';

if (empty($targetUrl)) {
    // Check if it's in the JSON body
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['url'])) {
        $targetUrl = $input['url'];
    }
}

if (empty($targetUrl)) {
    http_response_code(400);
    echo json_encode(["error" => "Target URL is required"]);
    exit;
}

// Initialize cURL
$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For testing, might need to be true in production

// Set method
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    // Forward the body if it exists
    $body = file_get_contents('php://input');
    if (!empty($body)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

// Execute
$response = curl_exec($ch);
$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);

curl_close($ch);

if ($curl_error) {
    http_response_code(500);
    echo json_encode(["error" => "cURL Error", "details" => $curl_error]);
} else {
    http_response_code($http_status);
    echo $response;
}
?>
