import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  FiPackage, FiMapPin, FiPhone, FiUser, FiTruck, 
  FiCheckCircle, FiAlertCircle, FiSearch, FiLoader, FiX
} from 'react-icons/fi';
import tpcService from '../../services/tpcCourierService';
import './Dispatch.css';

const Dispatch = () => {
  const [loading, setLoading] = useState(false);
  const [inspectedOrders, setInspectedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    customerName: '',
    addressLine1: '',
    addressLine2: '',
    area: '',
    city: '',
    pincode: '',
    mobileNumber: '',
    parcelType: 'Parcel',
    paymentMode: 'Prepaid',
    courier: 'TPC',
    // TPC mandatory extras
    weight: '0.5',
    pieces: '1',
    description: 'Organic Products',
    service: 'STD',
    mode: 'S',
    manualPodNo: ''
  });

  // Service check state
  const [pincodeStatus, setPincodeStatus] = useState(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [areaSuggestions, setAreaSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cnoteStock, setCnoteStock] = useState(null);

  // Fetch orders that have completed inspection
  useEffect(() => {
    fetchInspectedOrders();
    checkStock();
  }, []);

  const checkStock = async () => {
    try {
      const result = await tpcService.checkCnoteStock();
      console.log('📦 TPC Stock Result:', result);
      
      // Handle array or object response
      const data = Array.isArray(result) ? result[0] : result;
      
      if (data && data.status === 'failed') {
        console.warn('⚠️ TPC Stock check failed:', data.description);
        setCnoteStock({ STOCK_AVAILABLE: '0', error: data.description });
      } else if (data && data.STOCK_AVAILABLE !== undefined) {
        setCnoteStock(data);
      }
    } catch (error) {
      console.error('Error checking TPC stock:', error);
    }
  };

  const fetchInspectedOrders = async () => {
    try {
      setLoading(true);
      const ordersRef = collection(db, 'orders');
      // Fetch orders with status 'Packed' or 'Inspection Complete'
      const q = query(ordersRef, where('status', 'in', ['Packed', 'Inspection Complete']));
      const snapshot = await getDocs(q);
      
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setInspectedOrders(orders);
    } catch (error) {
      console.error('Error fetching inspected orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Handle order selection
  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
    
    // Extract address data with fallbacks
    const addr = order.shippingAddress || order.address || {};
    
    // Pre-fill form with order data, but keep existing defaults for other fields
    setFormData(prev => ({
      ...prev,
      companyName: order.companyName || '',
      customerName: order.customerName || addr.name || order.userName || '',
      addressLine1: addr.addressLine1 || addr.address || addr.street || '',
      addressLine2: addr.addressLine2 || '',
      area: addr.area || addr.city || '', // Fallback to city if area is missing
      city: addr.city || '',
      pincode: addr.pincode || addr.postalCode || '',
      mobileNumber: order.phone || order.phoneNumber || addr.phone || '',
      parcelType: 'Parcel',
      paymentMode: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      courier: 'TPC'
    }));

    // Auto-check pincode if available
    if (addr.pincode || addr.postalCode) {
      checkPincodeService(addr.pincode || addr.postalCode);
    }
  };

  // PIN Code Service Check
  const checkPincodeService = async (pincode) => {
    if (!pincode || pincode.length !== 6) {
      setPincodeStatus(null);
      return;
    }

    setCheckingPincode(true);
    try {
      const result = await tpcService.checkPinCodeService(pincode);
      console.log('🔍 PIN Code Check Result:', result);
      
      if (!result.success) {
        setPincodeStatus({
          success: false,
          error: result.error || 'Service check failed'
        });
        // We show the error in the UI instead of an alert for a better UX
        return;
      }

      setPincodeStatus(result);
      
      // Show detailed information about service availability
      if (!result.parcelDelivery && !result.docDelivery && !result.proPremiumDelivery) {
        alert(`⚠️ No TPC services available for PIN ${pincode}\n\nArea: ${result.areaName || 'Unknown'}\n\nPlease contact TPC support or try a different courier.`);
      } else if (!result.parcelDelivery) {
        const availableServices = [];
        if (result.docDelivery) availableServices.push('Document Delivery');
        if (result.proPremiumDelivery) availableServices.push('Pro Premium');
        
        alert(`⚠️ Parcel delivery not available for PIN ${pincode}\n\nAvailable services: ${availableServices.join(', ')}`);
      }
    } catch (error) {
      console.error('Error checking pincode:', error);
      setPincodeStatus({
        success: false,
        error: error.message || 'Failed to check PIN code service'
      });
    } finally {
      setCheckingPincode(false);
    }
  };

  // Area/City Search with Auto-Suggest
  const handleAreaSearch = async (searchTerm) => {
    setFormData({ ...formData, area: searchTerm });
    
    if (searchTerm.length < 3) {
      setAreaSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const result = await tpcService.searchAreaCity(searchTerm);
      if (result.success && result.results.length > 0) {
        setAreaSuggestions(result.results);
        setShowSuggestions(true);
      } else {
        setAreaSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching area:', error);
    }
  };

  // Handle area selection from suggestions
  const handleAreaSelect = (suggestion) => {
    setFormData({
      ...formData,
      area: suggestion.areaName,
      city: suggestion.areaName, // TPC doesn't provide separate city field
      pincode: suggestion.pincode
    });
    setShowSuggestions(false);
    
    // Auto-check the selected pincode
    checkPincodeService(suggestion.pincode);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Auto-check pincode when it's 6 digits
    if (name === 'pincode' && value.length === 6) {
      checkPincodeService(value);
    }
  };

  // Dispatch Order
  const handleDispatch = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!selectedOrder) {
      alert('Please select an order to dispatch');
      return;
    }

    if (!pincodeStatus || !pincodeStatus.parcelDelivery) {
      alert('Cannot dispatch: Service not available for this PIN code');
      return;
    }

    if (formData.paymentMode === 'COD' && !pincodeStatus.codAvailable) {
      alert('COD service not available for this PIN code. Please change payment mode.');
      return;
    }

    setLoading(true);
    
    try {
      // Step 1: Prepare TPC Booking Data
      const today = new Date();
      const bDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`; // YYYY-MM-DD
      
      const bookingData = {
        REF_NO: (selectedOrder.id.substring(0, 10) + Date.now().toString().slice(-5)), 
        BDATE: bDate, 
        SENDER: 'Satva Organics',
        SENDER_CODE: 'JSPSAT',
        SENDER_ADDRESS: 'Satva Organics Farm, Coimbatore',
        SENDER_CITY: 'Coimbatore',
        SENDER_PINCODE: '641001',
        SENDER_MOB: '9876543210',
        SENDER_EMAIL: "info@satvaorganics.com",
        GSTIN: "",
        RECIPIENT: formData.customerName.trim(),
        RECIPIENT_COMPANY: formData.companyName || "",
        RECIPIENT_ADDRESS: `${formData.addressLine1} ${formData.addressLine2}`.trim().substring(0, 100),
        RECIPIENT_CITY: formData.city,
        RECIPIENT_PINCODE: formData.pincode,
        RECIPIENT_MOB: formData.mobileNumber,
        RECIPIENT_EMAIL: formData.email || "",
        WEIGHT: (parseFloat(formData.weight) || 0.5).toString(),
        PIECES: (parseInt(formData.pieces) || 1).toString(),
        DESCRIPTION: formData.description || 'Organic Products',
        REMARKS: "Fresh organic products from Satva Organics",
        PAYMENT_MODE: formData.paymentMode === 'COD' ? 'CASH' : 'PREPAID',
        COD_AMOUNT: (formData.paymentMode === 'COD' ? (parseFloat(selectedOrder.totalAmount || selectedOrder.total) || 0).toFixed(2) : ""),
        TYPE: 'PICKUP',
        MODE: formData.mode,
        SERVICE: formData.service,
        VOL_LENGTH: "10",
        VOL_WIDTH: "10",
        VOL_HEIGHT: "10",
        RECIPIENT_GSTIN: "",
        FLYER_NO: "",
        CUST_INVOICE: selectedOrder.id.substring(0, 15),
        CUST_INVOICEAMT: (parseFloat(selectedOrder.totalAmount || selectedOrder.total) || 0).toFixed(2),
        ORDER_STATUS: "HOLD",
        POD_NO: formData.manualPodNo || ""
      };

      // Step 2: Call TPC Pickup Request API
      const bookingResult = await tpcService.createPickupRequest(bookingData);
      
      if (!bookingResult.success) {
        alert(`❌ TPC Booking Failed: ${bookingResult.error}`);
        setLoading(false);
        return;
      }

      const consignmentNo = bookingResult.pod_no;

      // Step 3: Save dispatch order to database
      const dispatchData = {
        job_id: selectedOrder.id,
        order_id: selectedOrder.id,
        courier_name: 'TPC',
        consignment_no: consignmentNo,
        tracking_number: consignmentNo,
        
        // Customer details
        company_name: formData.companyName,
        customer_name: formData.customerName,
        mobile_number: formData.mobileNumber,
        
        // Address details
        address_line1: formData.addressLine1,
        address_line2: formData.addressLine2,
        area: formData.area,
        city: formData.city,
        pincode: formData.pincode,
        
        // Parcel details
        parcel_type: formData.parcelType,
        payment_mode: formData.paymentMode,
        weight: formData.weight,
        pieces: formData.pieces,
        
        // Service status
        service_available: pincodeStatus.parcelDelivery,
        cod_available: pincodeStatus.codAvailable,
        
        // Dispatch status
        dispatch_status: 'DISPATCHED',
        dispatch_date: serverTimestamp(),
        created_at: serverTimestamp()
      };

      await addDoc(collection(db, 'dispatch_orders'), dispatchData);

      // Step 4: Update original order status
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        status: 'Shipped',
        dispatchStatus: 'DISPATCHED',
        courierName: 'TPC',
        trackingNumber: consignmentNo,
        consignmentNo: consignmentNo,
        dispatchedAt: serverTimestamp()
      });

      alert(`✅ Order dispatched successfully!\nTPC Consignment Number (POD): ${consignmentNo}`);
      
      // Reset form
      setSelectedOrder(null);
      setFormData({
        companyName: '',
        customerName: '',
        addressLine1: '',
        addressLine2: '',
        area: '',
        city: '',
        pincode: '',
        mobileNumber: '',
        parcelType: 'Parcel',
        paymentMode: 'Prepaid',
        courier: 'TPC'
      });
      setPincodeStatus(null);
      
      // Refresh orders list
      fetchInspectedOrders();

    } catch (error) {
      console.error('Error dispatching order:', error);
      alert(`Failed to dispatch order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dispatch-container">
      <div className="dispatch-header">
        <h1 className="dispatch-title">
          <FiTruck /> Dispatch Management
        </h1>
        <div className="header-meta">
          <p className="dispatch-subtitle">TPC Courier Integration - Ship orders with tracking</p>
          {cnoteStock && (
            <div className={`stock-badge ${parseInt(cnoteStock.STOCK_AVAILABLE || 0) < 10 ? 'low' : ''}`}>
              <FiPackage /> TPC Stock: {cnoteStock.STOCK_AVAILABLE || 'None'}
              {cnoteStock.error && <span className="stock-error">!</span>}
            </div>
          )}
        </div>
      </div>

      <div className="dispatch-content">
        {/* Left Panel - Orders List */}
        <div className="dispatch-orders-panel">
          <div className="panel-header">
            <h2>Ready for Dispatch</h2>
            <span className="order-count">{inspectedOrders.length} orders</span>
          </div>
          
          <div className="orders-list">
            {loading && inspectedOrders.length === 0 ? (
              <div className="loading-state">
                <FiLoader className="spinner" />
                <p>Loading orders...</p>
              </div>
            ) : inspectedOrders.length === 0 ? (
              <div className="empty-state">
                <FiPackage />
                <p>No orders ready for dispatch</p>
                <small>Orders will appear here after inspection</small>
              </div>
            ) : (
              inspectedOrders.map(order => (
                <div 
                  key={order.id}
                  className={`order-card ${selectedOrder?.id === order.id ? 'selected' : ''}`}
                  onClick={() => handleOrderSelect(order)}
                >
                  <div className="order-card-header">
                    <span className="order-id">#{order.id.substring(0, 8)}</span>
                    <span className="order-status">{order.status}</span>
                  </div>
                  <div className="order-card-body">
                    <p className="customer-name">
                      <FiUser /> {order.customerName || 'Guest'}
                    </p>
                    <p className="order-items">
                      <FiPackage /> {order.items?.length || 0} items
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Dispatch Form */}
        <div className="dispatch-form-panel">
          {!selectedOrder ? (
            <div className="no-selection">
              <FiPackage className="icon" />
              <h3>Select an Order</h3>
              <p>Choose an order from the left panel to begin dispatch process</p>
            </div>
          ) : (
            <form onSubmit={handleDispatch} className="dispatch-form">
              <div className="form-section">
                <h3>Customer Information</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Company Name (Optional)</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="Enter company name"
                    />
                  </div>
                  
                  <div className="form-group required">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                </div>

                <div className="form-group required">
                  <label>Mobile Number *</label>
                  <div className="input-with-icon">
                    <FiPhone />
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      placeholder="10-digit mobile number"
                      pattern="[0-9]{10}"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Delivery Address</h3>
                
                <div className="form-group required">
                  <label>Address Line 1 *</label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleInputChange}
                    placeholder="House/Flat No., Building Name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Address Line 2</label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleInputChange}
                    placeholder="Street, Landmark"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group required">
                    <label>Area / Locality *</label>
                    <div className="autocomplete-wrapper">
                      <div className="input-with-icon">
                        <FiSearch />
                        <input
                          type="text"
                          name="area"
                          value={formData.area}
                          onChange={(e) => handleAreaSearch(e.target.value)}
                          placeholder="Search area..."
                          required
                        />
                      </div>
                      
                      {showSuggestions && areaSuggestions.length > 0 && (
                        <div className="suggestions-dropdown">
                          {areaSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="suggestion-item"
                              onClick={() => handleAreaSelect(suggestion)}
                            >
                              <div className="suggestion-area">{suggestion.areaName}</div>
                              <div className="suggestion-details">
                                PIN: {suggestion.pincode} | Station: {suggestion.stationCode}
                                {suggestion.parcelDelivery && <span className="service-badge">✓ Parcel</span>}
                                {suggestion.codDelivery && <span className="service-badge">✓ COD</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group required">
                    <label>City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                      required
                    />
                  </div>
                </div>

                <div className="form-group required">
                  <label>PIN Code *</label>
                  <div className="input-with-status">
                    <div className="input-with-icon">
                      <FiMapPin />
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        placeholder="6-digit PIN code"
                        pattern="[0-9]{6}"
                        maxLength="6"
                        required
                      />
                    </div>
                    
                    {checkingPincode && (
                      <div className="pincode-status checking">
                        <FiLoader className="spinner" /> Checking...
                      </div>
                    )}
                    
                    {pincodeStatus && !checkingPincode && (
                      <div className={`pincode-status ${pincodeStatus.parcelDelivery ? 'available' : 'unavailable'}`}>
                        <div className="status-item">
                          {pincodeStatus.parcelDelivery ? (
                            <><FiCheckCircle /> Service Available</>
                          ) : (
                            <><FiAlertCircle /> Service Not Available</>
                          )}
                        </div>
                        <div className="status-item">
                          {pincodeStatus.codAvailable ? (
                            <><FiCheckCircle /> COD Available</>
                          ) : (
                            <><FiAlertCircle /> COD Not Available</>
                          )}
                        </div>
                        {pincodeStatus.transitTime && (
                          <div className="status-item transit-time" style={{ marginTop: '4px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '4px' }}>
                            <FiTruck style={{ color: '#4f46e5' }} /> Est. Delivery: <strong>{pincodeStatus.transitTime}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Parcel Details</h3>
                
                <div className="form-row">
                  <div className="form-group required">
                    <label>Parcel Type *</label>
                    <select
                      name="parcelType"
                      value={formData.parcelType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Document">Document</option>
                      <option value="Parcel">Parcel</option>
                    </select>
                  </div>

                  <div className="form-group required">
                    <label>Payment Mode *</label>
                    <select
                      name="paymentMode"
                      value={formData.paymentMode}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Prepaid">Prepaid</option>
                      <option value="COD">COD (Cash on Delivery)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group required">
                    <label>Weight (kg) *</label>
                    <input
                      type="number"
                      step="0.01"
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group required">
                    <label>Pieces *</label>
                    <input
                      type="number"
                      name="pieces"
                      value={formData.pieces}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group required">
                    <label>Service *</label>
                    <select
                      name="service"
                      value={formData.service}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="STD">Standard (STD)</option>
                      <option value="PRO">Professional (PRO)</option>
                      <option value="PRC">PRC</option>
                      <option value="OTP">OTP</option>
                    </select>
                  </div>
                  <div className="form-group required">
                    <label>Mode *</label>
                    <select
                      name="mode"
                      value={formData.mode}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="S">Surface (S)</option>
                      <option value="A">Air (A)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Manual POD Number (Optional)</label>
                  <input
                    type="text"
                    name="manualPodNo"
                    value={formData.manualPodNo}
                    onChange={handleInputChange}
                    placeholder="Enter POD number if manual"
                  />
                  <small className="help-text">Leave blank to let TPC assign automatically from stock</small>
                </div>

                <div className="form-group">
                  <label>Courier Service</label>
                  <div className="courier-display">
                    <FiTruck />
                    <span>TPC (The Professional Couriers)</span>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => {
                    setSelectedOrder(null);
                    setPincodeStatus(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-dispatch"
                  disabled={loading || !pincodeStatus?.parcelDelivery}
                >
                  {loading ? (
                    <><FiLoader className="spinner" /> Processing...</>
                  ) : (
                    <><FiCheckCircle /> Dispatch Order</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dispatch;
