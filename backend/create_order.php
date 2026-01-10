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

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['amount'])) {
    http_response_code(400);
    echo json_encode(["error" => "Amount is required"]);
    exit;
}

$amount = $input['amount']; // Amount in paise

// RAZORPAY CONFIGURATION
// REPLACE 'YOUR_KEY_SECRET_HERE' WITH YOUR ACTUAL RAZORPAY KEY SECRET
$key_id = "rzp_test_RyAk3DGa85x3tr"; 
$key_secret = "h34O3j50S0KKz4LerxRPz0W1"; 

if ($key_secret === "YOUR_KEY_SECRET_HERE") {
    http_response_code(500);
    echo json_encode(["error" => "Razorpay Key Secret is not configured in PHP backend."]);
    exit;
}

$api_url = "https://api.razorpay.com/v1/orders";

$data = [
    "amount" => $amount,
    "currency" => "INR",
    "receipt" => "receipt_" . uniqid(),
    "payment_capture" => 1
];

// Initialize cURL
$ch = curl_init($api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERPWD, $key_id . ":" . $key_secret);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));

// Execute
$response = curl_exec($ch);
$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);

curl_close($ch);

if ($curl_error) {
    http_response_code(500);
    echo json_encode(["error" => "cURL Error", "details" => $curl_error]);
} elseif ($http_status === 200) {
    echo $response;
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to create order", "details" => json_decode($response)]);
}
?>
