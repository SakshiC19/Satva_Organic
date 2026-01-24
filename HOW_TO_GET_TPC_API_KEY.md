# TPC API Credentials - Complete Guide

## 🎯 Understanding API Credentials

### What is an API Key?
An **API Key** is a unique identifier and password provided by TPC (The Professional Couriers) that allows your system to securely communicate with their web services.

**Important**: You **CANNOT create** TPC API keys yourself. They must be issued by TPC company.

---

## 📋 How to Get TPC API Credentials (Step-by-Step)

### Step 1: Check if You Have a TPC Account

**Do you already use TPC courier services?**

#### ✅ If YES:
- You likely have a TPC customer account number
- Contact your TPC account manager
- Request API access for your existing account
- This is the **fastest route**

#### ❌ If NO:
- You need to first become a TPC customer
- Visit TPC office or website
- Register for business courier services
- Then request API access

---

### Step 2: Contact TPC for API Access

#### Method 1: Visit TPC Office (Recommended)
```
1. Find your nearest TPC branch
2. Ask to meet with Business Development team
3. Bring these documents:
   - Business registration
   - GST certificate
   - ID proof
4. Request: "API credentials for web service integration"
```

#### Method 2: Call TPC
```
1. Call TPC customer service: [Find number on TPC website]
2. Ask for: "API Support" or "Developer Relations"
3. Explain: You need web service API for automated dispatch
4. They will guide you through the process
```

#### Method 3: Email TPC
```
To: [TPC API Support Email]
Subject: API Credentials Request

Dear TPC Team,

I represent Satva Organics and we would like to integrate 
TPC courier services into our workflow management system.

We need API access for:
- PIN code service validation
- Area/city search
- Consignment note generation

Please provide the process to obtain API credentials.

Business Details:
- Company: Satva Organics
- Contact: [Your Name]
- Phone: [Your Phone]
- Email: [Your Email]

Thank you.
```

---

### Step 3: Provide Required Information

TPC will ask for:

#### Business Documents:
- [ ] Business Registration Certificate
- [ ] GST Certificate
- [ ] PAN Card
- [ ] Address Proof
- [ ] Bank Details (for billing)

#### Technical Details:
- [ ] Your server IP address
- [ ] Integration purpose (automated dispatch)
- [ ] Expected monthly shipment volume
- [ ] Technical contact person

#### Account Information:
- [ ] Existing TPC account number (if any)
- [ ] Preferred payment terms
- [ ] Billing address

---

### Step 4: Receive Credentials

Once approved, TPC will provide:

```
Example Credentials Package:

API Base URL: https://tpcwebservice.com
Client ID/Username: SATVA_ORG_12345
API Password/Key: tpc_live_sk_abc123xyz789

Additional Information:
- API Documentation PDF
- Rate card
- Service level agreement
- IP whitelisting requirements
```

---

### Step 5: Configure in Your System

1. **Go to Admin Panel** → **Courier Settings**

2. **Enter the credentials TPC provided:**
   ```
   API Base URL: https://tpcwebservice.com
   Username: SATVA_ORG_12345
   Password: tpc_live_sk_abc123xyz789
   ```

3. **Enable Integration:**
   - Check "Enable TPC courier integration"
   - Click "Save Settings"

4. **Test Connection:**
   - Click "Test Connection" button
   - Verify successful response

---

## 🧪 Testing Without Real Credentials (Development Mode)

### Option 1: Use Mock Service (Recommended for Testing)

I've created a **mock TPC service** that simulates API responses for testing:

#### To Use Mock Service:

1. **Open**: `src/pages/Admin/Dispatch.js`

2. **Change the import** at the top:
   ```javascript
   // Comment out real service
   // import tpcService from '../../services/tpcCourierService';
   
   // Use mock service for testing
   import tpcService from '../../services/mockTPCService';
   ```

3. **Test Features:**
   - PIN Code Check: Try `400001`, `110001`, `560001` (will show as available)
   - PIN Code Check: Try `999999` (will show as unavailable)
   - Area Search: Try "Andheri", "Bandra", "Koramangala"
   - Dispatch: Will generate mock tracking numbers like `TPC123456789`

4. **Switch Back to Real Service** when you get TPC credentials:
   ```javascript
   // Use real service
   import tpcService from '../../services/tpcCourierService';
   
   // Comment out mock service
   // import tpcService from '../../services/mockTPCService';
   ```

### Option 2: Use Dummy Credentials

You can also enter dummy credentials in Courier Settings:

```
Username: test_user
Password: test_password
Active: ❌ (Keep unchecked)
```

This allows you to see the UI without making real API calls.

---

## 🔍 Finding TPC Contact Information

### Official TPC Channels:

1. **Website**: 
   - Search Google for "TPC courier India"
   - Look for "Business Solutions" or "API Services"

2. **Customer Service**:
   - Call their main customer service number
   - Ask to be transferred to "Corporate Sales" or "API Support"

3. **Social Media**:
   - LinkedIn: Search for TPC India
   - Contact their business development team

4. **Local Branch**:
   - Visit your nearest TPC office
   - Ask for the branch manager
   - Request API access information

---

## ⚠️ Important Notes

### Timeline:
- **Account Setup**: 1-3 business days
- **API Access Approval**: 3-7 business days
- **Credential Generation**: 1-2 business days
- **Total**: Approximately 1-2 weeks

### Costs:
- **API Access Fee**: May have one-time setup fee
- **Monthly Charges**: Possible monthly API access fee
- **Per Shipment**: Regular courier charges apply
- **Ask TPC** for complete pricing details

### Security:
- ✅ Never share your API credentials
- ✅ Store credentials securely (our system encrypts them)
- ✅ Use HTTPS only
- ✅ Monitor API logs regularly
- ✅ Rotate credentials periodically

---

## 📞 Quick Reference

### What to Ask TPC:

1. **"Do you provide API access for web service integration?"**
2. **"What is the process to get API credentials?"**
3. **"What documents do I need to provide?"**
4. **"Is there a setup fee for API access?"**
5. **"What is the API documentation URL?"**
6. **"Do you need to whitelist our IP address?"**
7. **"What is the SLA for API uptime?"**

---

## 🎓 Summary

### You CANNOT Create API Keys Yourself Because:
- ❌ API keys are proprietary to TPC
- ❌ They control access to their systems
- ❌ Security and authentication managed by TPC
- ❌ Billing tied to API credentials

### You MUST Get API Keys From TPC By:
- ✅ Contacting TPC directly
- ✅ Becoming a registered customer
- ✅ Requesting API access
- ✅ Providing business documentation
- ✅ Waiting for approval

### For Testing NOW:
- ✅ Use the mock service I created
- ✅ Test all features with dummy data
- ✅ Switch to real service when you get credentials

---

## 🚀 Next Steps

### Immediate (Today):
1. **Use Mock Service** to test your system
2. **Contact TPC** to start the credential request process
3. **Prepare documents** TPC will need

### Short Term (This Week):
1. **Follow up** with TPC on credential request
2. **Test thoroughly** with mock service
3. **Train staff** on dispatch process

### Once You Get Credentials:
1. **Enter credentials** in Courier Settings
2. **Switch to real service** in code
3. **Test with real PIN codes**
4. **Go live** with actual orders

---

**Remember**: The mock service is for **testing only**. For production use, you **must** get real credentials from TPC.

Need help with anything else? Let me know! 🚀
