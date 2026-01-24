# TPC Courier Integration - Quick Reference Card

## 🚀 Quick Start

### Step 1: Configure API Credentials
1. Go to **Admin Panel** → **Courier Settings**
2. Enter TPC credentials:
   - Username: `[Your TPC Username]`
   - Password: `[Your TPC Password]`
   - API URL: `https://tpcwebservice.com`
3. Click **Save Settings**

### Step 2: Test Integration
1. Go to **Admin Panel** → **Dispatch**
2. Select a test order
3. Enter PIN code: `400001` (Mumbai - for testing)
4. Verify service availability shows

### Step 3: Dispatch First Order
1. Select order from left panel
2. Verify/edit customer details
3. Check PIN code service (auto-checked)
4. Click **Dispatch Order**
5. Tracking number assigned automatically

---

## 📋 Dispatch Workflow Checklist

- [ ] Order status = "Packed" or "Inspection Complete"
- [ ] Order appears in Dispatch screen
- [ ] Customer details verified
- [ ] Address complete and accurate
- [ ] PIN code entered (6 digits)
- [ ] Service availability = ✅ Available
- [ ] COD availability checked (if COD order)
- [ ] Click "Dispatch Order"
- [ ] Tracking number received
- [ ] Order status → "Shipped"

---

## 🎯 Key Features

### PIN Code Validation
- **Auto-check**: Triggers when 6 digits entered
- **Shows**: Service Available / Not Available
- **Shows**: COD Available / Not Available
- **Blocks**: Dispatch if service unavailable

### Area Search
- **Type**: Minimum 3 characters
- **Shows**: Area, City, State, PIN code
- **Auto-fill**: Selects PIN code automatically

### Consignment Note
- **Auto-request**: Before dispatch
- **Blocks**: If CN stock unavailable
- **Notifies**: Admin if stock low

---

## 🔍 Monitoring

### API Logs
**Location**: Admin Panel → API Logs

**View**:
- All API calls (PIN check, area search, CN request)
- Success/failure status
- Request and response details
- Export to CSV

**Filter by**:
- Status (Success/Failed)
- API Type (PIN Code/City Search/CN Request)

---

## ⚠️ Troubleshooting

### Issue: "Service Not Available"
**Cause**: PIN code not serviceable by TPC
**Action**: 
- Verify PIN code is correct
- Contact TPC to confirm coverage
- Use alternative courier

### Issue: "CN Stock Unavailable"
**Cause**: TPC has no consignment notes
**Action**:
- Admin notification sent
- Contact TPC support
- Request CN stock replenishment

### Issue: "API Call Failed"
**Cause**: Network or credentials issue
**Action**:
- Check internet connection
- Verify credentials in Courier Settings
- Check API Logs for error details

---

## 📊 Status Indicators

| Indicator | Meaning |
|-----------|---------|
| 🟢 Service Available | Can dispatch to this PIN |
| 🔴 Service Not Available | Cannot dispatch to this PIN |
| 🟢 COD Available | COD accepted for this PIN |
| 🔴 COD Not Available | Only prepaid for this PIN |
| ⏳ Checking... | Validating PIN code |

---

## 🔐 Security Notes

✅ Credentials encrypted in database
✅ API calls logged for audit
✅ Admin-only access
✅ No frontend credential exposure

---

## 📞 Support Contacts

**TPC Support**: [Contact TPC for API issues]
**System Admin**: [Your internal admin contact]

---

## 🎓 Training Tips

1. **Practice**: Use test orders before live dispatch
2. **Verify**: Always check PIN code service before dispatch
3. **Monitor**: Review API logs regularly
4. **Update**: Keep credentials current in settings
5. **Backup**: Export dispatch records periodically

---

## 📈 Best Practices

### Before Dispatch
- ✅ Verify customer phone number
- ✅ Confirm complete address
- ✅ Check PIN code service
- ✅ Verify parcel type
- ✅ Confirm payment mode

### After Dispatch
- ✅ Note tracking number
- ✅ Update customer with tracking
- ✅ Monitor API logs for errors
- ✅ Check order status updated

### Daily Tasks
- ✅ Review pending dispatch orders
- ✅ Check API logs for failures
- ✅ Monitor CN stock availability
- ✅ Clear admin notifications

---

## 🔄 Order Status Flow

```
Pending → Accepted → Processing → Packed
                                    ↓
                            Inspection Complete
                                    ↓
                              DISPATCH MODULE
                                    ↓
                                 Shipped
                                    ↓
                                Delivered
```

---

## 💡 Pro Tips

1. **Bulk Dispatch**: Select multiple orders (coming soon)
2. **Quick Search**: Use area search to save time
3. **Favorites**: Save frequently used addresses
4. **Reports**: Export dispatch logs monthly
5. **Alerts**: Enable browser notifications

---

**Version**: 1.0.0
**Last Updated**: January 21, 2026
**Integration**: TPC (The Professional Couriers)
