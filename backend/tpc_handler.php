<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Error reporting configuration
ini_set('display_errors', 0); 
error_reporting(E_ALL);

/**
 * Log message to debug.log
 */
function log_msg($msg) {
    file_put_contents('debug.log', date('[Y-m-d H:i:s] ') . $msg . PHP_EOL, FILE_APPEND);
}

// Increase execution time limit for slow courier APIs
set_time_limit(180);

try {
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    /**
     * Function to read .env file securely
     */
    function get_env_var($key, $default = null) {
        $env_file = dirname(__DIR__) . '/.env';
        if (file_exists($env_file)) {
            $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                    list($name, $value) = explode('=', $line, 2);
                    if (trim($name) === $key) {
                        return trim($value);
                    }
                }
            }
        } else {
            log_msg("Warning: .env file not found at $env_file");
        }
        return $default;
    }

    // Read and log incoming request
    $raw_input = file_get_contents('php://input');
    
    if (empty($raw_input)) {
        // Might be a GET request for testing
        if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action'])) {
            $input = $_GET;
        } else {
            throw new Exception("Empty request body");
        }
    } else {
        $input = json_decode($raw_input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            log_msg("JSON Error: " . json_last_error_msg() . " | Input: " . $raw_input);
            throw new Exception("Invalid JSON input: " . json_last_error_msg());
        }
    }

    $action = isset($input['action']) ? $input['action'] : '';
    if (empty($action)) {
        throw new Exception("Action is required");
    }

    $tpc_client = urlencode(get_env_var('TPC_CLIENT_ID', 'JSPSAT'));
    $tpc_pwd = urlencode(get_env_var('TPC_PASSWORD', '2026@SATVA'));
    $base_url = "https://www.tpcglobe.com/TPCWebService";

    $target_url = "";
    $is_post = false;
    $post_payload = null;

    switch ($action) {
        case 'pincode_check':
            $pincode = isset($input['pincode']) ? $input['pincode'] : '';
            if (empty($pincode)) throw new Exception("Pincode is required");
            $target_url = $base_url . "/PINcodeService.ashx?pincode=" . $pincode;
            $is_post = false;
            break;



        case 'track_trace':
            $podno = isset($input['podno']) ? $input['podno'] : '';
            if (empty($podno)) throw new Exception("POD Number is required");
            $target_url = $base_url . "/tracktracejsonnew.ashx?podno=" . $podno . "&client=" . $tpc_client . "&tpcpwd=" . $tpc_pwd;
            $is_post = true; // Still POST but no payload? Let's check docs
            break;

        case 'cancel_booking':
            $podno = isset($input['podno']) ? $input['podno'] : '';
            if (empty($podno)) throw new Exception("POD Number is required");
            $target_url = $base_url . "/CancelCnoteBKG.ashx?client=" . $tpc_client . "&tpcpwd=" . $tpc_pwd . "&podno=" . $podno;
            $is_post = true;
            break;

        case 'area_search':
            $areaName = isset($input['areaName']) ? $input['areaName'] : '';
            if (empty($areaName)) throw new Exception("Area name is required");
            $target_url = $base_url . "/PINcodeCitysearch.ashx?AreaName=" . urlencode($areaName);
            $is_post = false;
            break;
            
        case 'modify_booking':
            $target_url = $base_url . "/PickupAddon.ashx?client=" . $tpc_client . "&tpcpwd=" . $tpc_pwd;
            $is_post = true;
            $post_payload = isset($input['data']) ? $input['data'] : null;
            break;
            
        case 'stock_check':
            $target_url = $base_url . "/ClientCnoteStock.ashx?client=" . $tpc_client . "&tpcpwd=" . $tpc_pwd;
            $is_post = false;
            break;
            
        case 'stock_details':
            $target_url = $base_url . "/ClientStockDetails.ashx?client=" . $tpc_client . "&tpcpwd=" . $tpc_pwd;
            $is_post = false;
            break;
            


        case 'request_cnotes':
            $target_url = $base_url . "/CnoteRequest.ashx?client=" . $tpc_client . "&tpcpwd=" . $tpc_pwd . "&Qty=" . (isset($input['qty']) ? $input['qty'] : 1);
            $is_post = false;
            break;

        case 'create_pickup':
        case 'create_cod_booking':
            $endpoint = ($action === 'create_pickup') ? "/PickupRequest.ashx" : "/CODBooking.ashx";
            $target_url = $base_url . $endpoint . "?client=" . $tpc_client . "&tpcpwd=" . $tpc_pwd;
            $is_post = true;
            $raw_data = isset($input['data']) ? $input['data'] : [];
            
            $post_payload = [];
            foreach ($raw_data as $key => $value) {
                // Keep the input key
                $post_payload[$key] = $value;
                
                // Convert to common TPC PascalCase variants
                $pascalKey = str_replace("_", "", ucwords(strtolower($key), "_"));
                
                // Special fixes for common TPC field abbreviations
                $variantKey = $pascalKey;
                if ($variantKey === "Paymode" || $variantKey === "PaymentMode") $variantKey = "PayMode";
                if ($variantKey === "Bdate") $variantKey = "BDate";
                if ($variantKey === "Senderaddr" || $variantKey === "SenderAddress") $variantKey = "SenderAddr";
                if ($variantKey === "Recipientaddr" || $variantKey === "RecipientAddress") $variantKey = "RecipientAddr";
                if ($variantKey === "Senderpin" || $variantKey === "SenderPincode") $variantKey = "SenderPin";
                if ($variantKey === "Recipientpin" || $variantKey === "RecipientPincode") $variantKey = "RecipientPin";
                if ($variantKey === "Codamt" || $variantKey === "CodAmount") $variantKey = "CodAmt";
                if ($variantKey === "Refno" || $variantKey === "RefNo") {
                    $post_payload["RefNo"] = $value;
                    $post_payload["REF_NO"] = $value;
                    continue;
                }
                
                if ($variantKey === "Podno" || $variantKey === "PodNo") {
                    $post_payload["PodNo"] = $value;
                    $post_payload["POD_NO"] = $value;
                    continue;
                }
                
                // Add the variant if different
                if ($variantKey !== $key) {
                    $post_payload[$variantKey] = $value;
                }
            }
            
            // Explicitly ensure critical fields are present in expected casing
            if (isset($post_payload['PAYMENT_MODE'])) $post_payload['PayMode'] = $post_payload['PAYMENT_MODE'];
            if (isset($post_payload['BDATE'])) $post_payload['BDate'] = $post_payload['BDATE'];
            
            // Add credentials to payload as some TPC APIs require it
            $post_payload['UserID'] = get_env_var('TPC_CLIENT_ID', 'JSPSAT');
            $post_payload['Password'] = get_env_var('TPC_PASSWORD', '2026@SATVA');
            $post_payload['UserCode'] = $post_payload['UserID'];
            $post_payload['client'] = $post_payload['UserID'];
            $post_payload['tpcpwd'] = $post_payload['Password'];
            break;

        default:
            throw new Exception("Invalid action: " . $action);
    }

    log_msg("Ready to call TPC Action: $action | URL: " . $target_url);

    // Initialize cURL
    $ch = curl_init($target_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); 
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 120); 
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    // Force HTTP 1.1 as some ASP.NET handlers struggle with 2.0
    curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);

    if ($is_post) {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($post_payload) {
            // Send as clean raw JSON object/array
            $json_payload = json_encode($post_payload, JSON_UNESCAPED_SLASHES);
            log_msg("Post Payload: " . $json_payload);
            
            curl_setopt($ch, CURLOPT_POSTFIELDS, $json_payload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                'Content-Type: application/json',
                'Content-Length: ' . strlen($json_payload),
                'Accept: application/json',
                'Connection: close' // Avoid keep-alive issues with slow servers
            ));
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, "");
        }
    }

    log_msg("Executing cURL now to: $target_url");
    $startTime = microtime(true);
    $output = curl_exec($ch);
    $endTime = microtime(true);
    $duration = round($endTime - $startTime, 2);
    
    $http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    $effective_url = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    $response_size = curl_getinfo($ch, CURLINFO_SIZE_DOWNLOAD);
    
    log_msg("cURL execution finished in $duration seconds. HTTP Status: $http_status. Effective URL: $effective_url");
    
    if (strpos($effective_url, 'Oops.aspx') !== false) {
        log_msg("Detected redirect to Oops.aspx in effective URL");
        throw new Exception("TPC API Redirect: Server returned error page (Oops.aspx). This usually means invalid data or credentials.");
    }

    if ($curl_error) {
        log_msg("cURL Error: " . $curl_error);
    }
    
    curl_close($ch);

    if ($curl_error) {
        throw new Exception("Network Error (TPC): " . $curl_error);
    }

    log_msg("Response Status: " . $http_status);
    if ($redirect_url) log_msg("Redirected to: " . $redirect_url);

    if ($http_status >= 400) {
        http_response_code($http_status);
        echo json_encode([
            "success" => false, 
            "error" => "TPC API Error (Status $http_status)",
            "details" => substr($output, 0, 1000)
        ]);
        exit;
    }

    // Try to parse JSON response
    $responseData = json_decode($output, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        log_msg("JSON Response: " . $output);
        echo json_encode($responseData);
    } else {
        // Handle malformed JSON or HTML responses
        $clean_output = trim($output);
        log_msg("Non-JSON Raw Output (Part): " . substr($clean_output, 0, 1500));
        
        $error_msg = "TPC API Error: Invalid response format";
        
        // Custom check for the common "broken JSON" error from TPC
        if (strpos($clean_output, '"status":"failed"') !== false) {
             // It's a failure response that simply failed to parse as valid JSON
             $error_msg = "TPC API Failure: Server rejected the request (Details in logs)";
        } else if (stripos($clean_output, "login again") !== false || stripos($clean_output, "session has expired") !== false) {
            $error_msg = "TPC Authentication Failed: Please check your credentials (UserID/Password)";
        }

        echo json_encode([
            "success" => false, 
            "error" => $error_msg,
            "raw" => substr($clean_output, 0, 2000)
        ]);
    }

} catch (Exception $e) {
    log_msg("Catastrophic Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
?>

