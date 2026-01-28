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
    courier: 'TPC'
  });

  // Service check state
  const [pincodeStatus, setPincodeStatus] = useState(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [areaSuggestions, setAreaSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch orders that have completed inspection
  useEffect(() => {
    fetchInspectedOrders();
  }, []);

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
    
    // Pre-fill form with order data
    setFormData({
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
    });

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
      setPincodeStatus(result);
      
      // Show detailed information about service availability
      if (!result.success) {
        alert(`❌ Error: ${result.error}`);
      } else if (!result.parcelDelivery && !result.docDelivery && !result.proPremiumDelivery) {
        alert(`⚠️ No TPC services available for PIN ${pincode}\n\nArea: ${result.areaName || 'Unknown'}\nStation: ${result.stationCode || 'N/A'}\n\nPlease contact TPC support or try a different courier.`);
      } else if (!result.parcelDelivery) {
        // Some services available but not parcel delivery
        const availableServices = [];
        if (result.docDelivery) availableServices.push('Document Delivery');
        if (result.proPremiumDelivery) availableServices.push('Pro Premium');
        
        alert(`⚠️ Parcel delivery not available for PIN ${pincode}\n\nAvailable services: ${availableServices.join(', ')}\n\nPlease contact TPC support.`);
      }
    } catch (error) {
      console.error('Error checking pincode:', error);
      setPincodeStatus({
        success: false,
        error: 'Failed to check PIN code service'
      });
      alert(`❌ Error checking PIN code: ${error.message}`);
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
      // Step 1: Request Consignment Note (AWB)
      const cnResult = await tpcService.requestConsignmentNote(1);
      
      if (!cnResult.success) {
        // CN stock not available - notify admin
        alert('❌ Consignment Note stock not available. Admin has been notified.');
        
        // Create admin notification
        await addDoc(collection(db, 'admin_notifications'), {
          type: 'cn_stock_unavailable',
          message: 'TPC Consignment Note stock is unavailable',
          orderId: selectedOrder.id,
          created_at: serverTimestamp(),
          read: false
        });
        
        setLoading(false);
        return;
      }

      const consignmentNo = cnResult.consignmentNumbers[0];

      // Step 2: Save dispatch order to database
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
        
        // Service status
        service_available: pincodeStatus.parcelDelivery,
        cod_available: pincodeStatus.codAvailable,
        
        // Dispatch status
        dispatch_status: 'DISPATCHED',
        dispatch_date: serverTimestamp(),
        created_at: serverTimestamp()
      };

      await addDoc(collection(db, 'dispatch_orders'), dispatchData);

      // Step 3: Update original order status
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        status: 'Shipped',
        dispatchStatus: 'DISPATCHED',
        courierName: 'TPC',
        trackingNumber: consignmentNo,
        consignmentNo: consignmentNo,
        dispatchedAt: serverTimestamp()
      });

      alert(`✅ Order dispatched successfully!\nTracking Number: ${consignmentNo}`);
      
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
      alert('Failed to dispatch order. Please try again.');
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
        <p className="dispatch-subtitle">TPC Courier Integration - Ship orders with tracking</p>
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
