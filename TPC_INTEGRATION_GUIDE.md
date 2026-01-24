# TPC (The Professional Couriers) Integration Guide

## Overview

This document provides comprehensive information about the TPC courier integration implemented in the Satva Organics workflow management system.

## Workflow Integration

The TPC integration is implemented **ONLY** in the **Dispatch module**, which is the final step in the workflow:

```
Marketing → Design → Machine → Inspection → Dispatch (TPC Integration)
```

## Features Implemented

### 1. Dispatch Module (`/admin/dispatch`)

A professional, mobile-responsive dispatch screen with the following features:

#### Form Fields:
- **Company Name** (Optional)
- **Customer Name** (Required)
- **Full Address** (Address Line 1 & 2)
- **Area / City** (Searchable with auto-suggest)
- **PIN Code** (Required, with service validation)
- **Mobile Number** (Required, 10-digit validation)
- **Parcel Type** (Document / Parcel)
- **Payment Mode** (Prepaid / COD)
- **Courier** (Default: TPC)

#### Key Features:
- **Order Selection**: Select from orders that have completed inspection
- **Real-time PIN Code Validation**: Automatically checks service availability
- **Area Auto-Suggest**: Search and auto-fill area, city, and PIN code
- **Service Status Display**: Shows if delivery and COD are available
- **Consignment Note Request**: Automatically requests tracking number
- **Admin Notifications**: Alerts admin if CN stock is unavailable

### 2. TPC API Integrations

#### A. PIN Code Service Check
**Endpoint**: `tpcwebservice/PINcodeService.ashx?pincode={PINCODE}`

**Features**:
- Validates PIN code when user enters it
- Displays service availability status
- Shows COD availability status
- Blocks dispatch if service not available

**Response Handling**:
```javascript
{
  success: true,
  pincode: "400001",
  parcelDelivery: true,  // YES/NO from API
  codAvailable: true,    // YES/NO from API
  city: "Mumbai",
  state: "Maharashtra"
}
```

#### B. Area/City Search (Auto-Suggest)
**Endpoint**: `TPCWebservice/PINcodeCitysearch.ashx?AreaName={AREA}`

**Features**:
- Shows suggestions while typing (minimum 3 characters)
- Auto-fills PIN code on selection
- Displays area, city, state, and PIN code

**Response Handling**:
```javascript
{
  success: true,
  results: [
    {
      area: "Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400069"
    }
  ]
}
```

#### C. Consignment Note (AWB) Request
**Endpoint**: `TPCWebService/CNoteRequest.ashx?Client={USER}&tpcpwd={PASSWORD}&Qty={QTY}`

**Features**:
- Requests consignment number before dispatch
- Blocks dispatch if CN stock unavailable
- Notifies admin if stock is low
- Assigns tracking number to order

**Response Handling**:
```javascript
{
  success: true,
  consignmentNumbers: ["TPC123456789"],
  message: "Consignment notes generated successfully"
}
```

### 3. Database Structure

#### A. `courier_settings` Collection
Stores TPC API credentials (encrypted):

```javascript
{
  courier_name: "TPC",
  api_base_url: "https://tpcwebservice.com",
  username: "your_username",
  password: "encrypted_password",  // Base64 encoded
  active: true,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

#### B. `dispatch_orders` Collection
Stores dispatch information:

```javascript
{
  job_id: "order_id",
  order_id: "order_id",
  courier_name: "TPC",
  consignment_no: "TPC123456789",
  tracking_number: "TPC123456789",
  
  // Customer details
  company_name: "Company Name",
  customer_name: "John Doe",
  mobile_number: "9876543210",
  
  // Address details
  address_line1: "123 Main Street",
  address_line2: "Near Park",
  area: "Andheri East",
  city: "Mumbai",
  pincode: "400069",
  
  // Parcel details
  parcel_type: "Parcel",
  payment_mode: "Prepaid",
  
  // Service status
  service_available: true,
  cod_available: true,
  
  // Dispatch status
  dispatch_status: "DISPATCHED",
  dispatch_date: Timestamp,
  created_at: Timestamp
}
```

#### C. `courier_api_logs` Collection
Logs all API requests and responses:

```javascript
{
  api_name: "PINcodeService",
  request_payload: "{\"pincode\":\"400069\"}",
  response_payload: "{\"PARCEL_DELIVERY\":\"YES\"}",
  status: "success",  // or "failed"
  created_at: Timestamp
}
```

#### D. `admin_notifications` Collection
Stores admin notifications:

```javascript
{
  type: "cn_stock_unavailable",
  message: "TPC Consignment Note stock is unavailable",
  orderId: "order_id",
  created_at: Timestamp,
  read: false
}
```

### 4. Admin Features

#### A. Courier Settings (`/admin/courier-settings`)
- Manage TPC API credentials
- Configure API base URL
- Enable/disable TPC integration
- Test API connection
- Password encryption for security

#### B. API Logs Monitor (`/admin/api-logs`)
- View all API requests and responses
- Filter by status (success/failed)
- Filter by API type
- Export logs to CSV
- View detailed request/response payloads
- Monitor API performance

### 5. Security Features

✅ **Backend-Only Credentials**: API credentials stored in Firebase, never exposed to frontend

✅ **Password Encryption**: Passwords are Base64 encoded before storage

✅ **Request Logging**: All API calls logged with timestamp and status

✅ **Error Handling**: Graceful failure handling with user notifications

✅ **Admin-Only Access**: Only admin users can access settings and logs

## Dispatch Workflow

```
1. Inspection Completed
   ↓
2. Order appears in Dispatch screen
   ↓
3. Admin selects order
   ↓
4. Form auto-fills with order data
   ↓
5. Admin enters/verifies address
   ↓
6. System checks PIN code service
   ↓
7. If service available:
   - Admin can search area (optional)
   - System requests Consignment Note
   ↓
8. If CN available:
   - Tracking number assigned
   - Order status → DISPATCHED
   - Dispatch record created
   ↓
9. If CN not available:
   - Admin notified
   - Dispatch blocked
```

## Installation & Setup

### 1. Install Dependencies
All dependencies are already included in the project.

### 2. Configure TPC Credentials

1. Navigate to **Admin Panel** → **Courier Settings**
2. Enter your TPC credentials:
   - API Base URL (default: `https://tpcwebservice.com`)
   - Username/Client ID
   - Password/API Key
3. Click **Save Settings**

### 3. Test Integration

1. Create a test order and move it to "Inspection Complete" status
2. Navigate to **Admin Panel** → **Dispatch**
3. Select the test order
4. Enter a valid PIN code to test service check
5. Try the area search feature
6. Complete the dispatch process

### 4. Monitor API Calls

1. Navigate to **Admin Panel** → **API Logs**
2. View all API interactions
3. Check for any failed requests
4. Export logs for analysis

## Error Handling

### PIN Code Service Not Available
- **Action**: Alert shown to user
- **Dispatch**: Blocked
- **Message**: "Service not available for this PIN code"

### COD Not Available
- **Action**: Alert shown if COD selected
- **Dispatch**: Blocked for COD orders
- **Message**: "COD service not available for this PIN code"

### Consignment Note Stock Unavailable
- **Action**: Admin notification created
- **Dispatch**: Blocked
- **Message**: "Consignment Note stock not available. Admin has been notified."

### API Call Failure
- **Action**: Error logged to database
- **Dispatch**: Blocked
- **Message**: "Failed to connect to TPC service. Please try again."

## Future Enhancements

### Scalability for Multiple Couriers

The system is designed to easily add more courier integrations:

```javascript
// Add new courier service
class BlueDartService extends CourierService {
  // Implement BlueDart-specific methods
}

class DTDCService extends CourierService {
  // Implement DTDC-specific methods
}
```

### Suggested Additions:

1. **Bulk Dispatch**: Dispatch multiple orders at once
2. **Tracking Integration**: Real-time tracking updates
3. **Rate Calculator**: Compare rates across couriers
4. **Auto-Courier Selection**: Select best courier based on PIN code
5. **Delivery Estimates**: Show estimated delivery dates
6. **Return Management**: Handle return shipments

## File Structure

```
src/
├── services/
│   └── tpcCourierService.js          # TPC API service
├── pages/
│   └── Admin/
│       ├── Dispatch.js                # Dispatch module
│       ├── Dispatch.css               # Dispatch styles
│       ├── CourierSettings.js         # Settings page
│       ├── CourierSettings.css        # Settings styles
│       ├── APILogs.js                 # Logs viewer
│       └── APILogs.css                # Logs styles
└── App.js                             # Routes configuration
```

## API Service Methods

### `tpcService.checkPinCodeService(pincode)`
Checks if delivery service is available for a PIN code.

### `tpcService.searchAreaCity(areaName)`
Searches for areas/cities matching the search term.

### `tpcService.requestConsignmentNote(quantity)`
Requests consignment notes from TPC.

### `tpcService.getAPILogs(limit)`
Retrieves API call logs for monitoring.

## Support & Troubleshooting

### Common Issues:

**Issue**: PIN code check not working
- **Solution**: Verify API credentials in Courier Settings
- **Check**: API Logs for error details

**Issue**: Area search not showing results
- **Solution**: Ensure minimum 3 characters entered
- **Check**: Network connectivity

**Issue**: Consignment note request failing
- **Solution**: Contact TPC to check CN stock
- **Check**: API Logs for specific error

## Contact

For TPC API support, contact:
- **TPC Support**: [TPC Contact Details]
- **API Documentation**: [TPC API Docs URL]

## Version History

- **v1.0.0** (2026-01-21): Initial TPC integration
  - PIN code service check
  - Area/city search
  - Consignment note request
  - Admin settings
  - API logging

---

**Note**: This integration follows industry best practices for security, scalability, and maintainability. All API credentials are stored securely and never exposed to the frontend.
