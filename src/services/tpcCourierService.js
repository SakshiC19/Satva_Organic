/**
 * TPC (The Professional Couriers) Web API Integration Service
 * 
 * This service handles all TPC API interactions through a secure backend handler.
 * Features:
 * - PIN code service check
 * - Create Pickup Request (Main Booking)
 * - Tracking API Integration
 * - Cancel Booking API
 * - Area/City search (auto-suggest)
 * 
 * All API calls are logged for monitoring and debugging.
 */

import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import config from '../config';

// Regional transit time mapping (from User Data)
const TRANSIT_TIME_MAPPING = {
  '415110': '1 Day', '415111': '1 Day', '415115': '1 Day', '415002': '1 Day',
  '415001': '1 Day', '415004': '1 Day', '416001': '1 Day', '416002': '1 Day',
  '416003': '1 Day', '416004': '1 Day', '416005': '1 Day', '416007': '1 Day',
  '416008': '1 Day', '416010': '1 Day', '416012': '1 Day', '416013': '1 Day',
  '416101': '1 Day', '416102': '1 Day', '413001': '1 Day', '413003': '1 Day',
  '413004': '1 Day', '413005': '1 Day', '413007': '1 Day', '416112': '1 Day',
  '416113': '1 Day', '416114': '1 Day', '416115': '1 Day', '416117': '1 Day',
  '416416': '1 Day', '416410': '1 Day', '413304': '1 Day', '413401': '1 Day'
};

class TPCCourierService {
  constructor() {
    this.handlerURL = config.TPC_HANDLER_URL;
  }

  /**
   * Log API request and response to Firebase
   */
  async logAPICall(apiName, requestPayload, responsePayload, status) {
    try {
      await addDoc(collection(db, 'courier_api_logs'), {
        api_name: apiName,
        request_payload: JSON.stringify(requestPayload),
        response_payload: JSON.stringify(responsePayload),
        status: status,
        created_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging API call:', error);
    }
  }

  /**
   * Universal fetch wrapper for TPC Handler
   */
  async callHandler(action, data = {}) {
    try {
      const response = await fetch(this.handlerURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...data
        })
      });

      let result;
      const responseText = await response.text();
      
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { 
          success: false, 
          error: 'Invalid response from server',
          raw: responseText.substring(0, 200)
        };
      }

      if (!response.ok) {
        const errorMsg = result.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg);
      }

      // Log failure if the result indicates one (but still a 200 OK from handler)
      if (result.success === false || result.ERROR || result.error) {
        await this.logAPICall(action, data, result, 'failed');
      } else {
        await this.logAPICall(action, data, result, 'success');
      }

      return result;
    } catch (error) {
      console.error(`❌ TPC ${action} error:`, error);
      await this.logAPICall(action, data, { error: error.message }, 'failed');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 1. PIN Code Service Check
   * Checks if delivery and COD are available for a given PIN code
   */
  async checkPinCodeService(pincode) {
    console.log('🔍 Checking PIN code:', pincode);
    const data = await this.callHandler('pincode_check', { pincode });
    
    if (!data || data.error) {
      return {
        success: false,
        error: data?.error || 'Unknown error',
        parcelDelivery: false,
        codAvailable: false
      };
    }

    // Handle Array Response vs Single Object
    let pinData = Array.isArray(data) ? data[0] : data;
    
    if (!pinData) {
      return { success: false, error: 'No data returned for this PIN code' };
    }

    return {
      success: true,
      pincode: pinData.PINCODE || pincode,
      areaName: pinData.AREANAME || '',
      parcelDelivery: pinData.PARCEL_DELIVERY === 'YES',
      codAvailable: pinData.COD_DELIVERY === 'YES',
      transitTime: TRANSIT_TIME_MAPPING[pincode] || (TRANSIT_TIME_MAPPING[pinData.PINCODE] || '2-5 Days'),
      rawResponse: data
    };
  }

  /**
   * 2. Create Pickup Request (Main Booking API)
   * Automatically switches to COD API if payment mode is COD
   */
  async createPickupRequest(bookingData) {
    try {
      console.log('📦 Creating Booking for:', bookingData.REF_NO);
      
      // Validation
      const mandatoryFields = [
        'REF_NO', 'BDATE', 'SENDER', 'SENDER_ADDRESS', 'SENDER_CITY', 
        'SENDER_PINCODE', 'SENDER_MOB', 'RECIPIENT', 'RECIPIENT_ADDRESS', 
        'RECIPIENT_CITY', 'RECIPIENT_PINCODE', 'RECIPIENT_MOB', 'WEIGHT', 
        'PIECES', 'DESCRIPTION', 'PAYMENT_MODE', 'TYPE', 'MODE', 'SERVICE'
      ];

      for (const field of mandatoryFields) {
        if (!bookingData[field]) {
          throw new Error(`Missing mandatory field: ${field}`);
        }
      }

      // Choose action based on payment mode
      const isCOD = bookingData.PAYMENT_MODE === 'COD' || bookingData.PAYMENT_MODE === 'CASH';
      const action = isCOD ? 'create_cod_booking' : 'create_pickup';
      
      // TPC COD API requirements: PAYMENT_MODE must be 'CASH' and needs COD_AMOUNT
      if (isCOD) {
        bookingData.PAYMENT_MODE = 'CASH';
        if (!bookingData.COD_AMOUNT) {
          console.warn('⚠️ COD booking without COD_AMOUNT. TPC API might reject this.');
        }
      }

      const resultRaw = await this.callHandler(action, { data: bookingData });
      
      // TPC often returns an array [ { STATUS: '...', ... } ]
      const result = Array.isArray(resultRaw) ? resultRaw[0] : resultRaw;
      
      console.log('📦 TPC Booking Response:', result);

      if (result && (result.STATUS === 'SUCCESS' || result.success === true || result.POD_NO || result.pod_no)) {
        return {
          success: true,
          pod_no: result.POD_NO || result.pod_no,
          message: result.MESSAGE || result.message || 'Booking successful',
          rawResponse: result
        };
      }

      return {
        success: false,
        error: result?.MESSAGE || result?.error || result?.message || 'Booking failed',
        rawResponse: result
      };
    } catch (error) {
      console.error('❌ TPC Booking Setup Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stock Management APIs
   */
  async checkCnoteStock() {
    return await this.callHandler('stock_check');
  }

  async getStockDetails() {
    return await this.callHandler('stock_details');
  }

  async requestNewCnotes(data) {
    // data: { QUANTITY, TYPE }
    return await this.callHandler('request_cnotes', { data });
  }

  /**
   * 3. Tracking API Integration
   */
  async trackOrder(podNo) {
    if (!podNo) throw new Error('POD Number is required for tracking');
    console.log('📡 Tracking order:', podNo);
    
    const result = await this.callHandler('track_trace', { podno: podNo });
    return result;
  }

  /**
   * 4. Cancel Booking API
   */
  async cancelBooking(podNo) {
    if (!podNo) throw new Error('POD Number is required for cancellation');
    console.log('🚫 Cancelling booking:', podNo);
    
    const result = await this.callHandler('cancel_booking', { podno: podNo });
    return result;
  }

  /**
   * Area/City Search (Auto-Suggest)
   */
  async searchAreaCity(areaName) {
    if (!areaName || areaName.length < 3) return { success: true, results: [] };
    
    // We can reuse the pincode_city_search if we add it to the handler
    // For now, let's keep it consistent and add it to handler
    const result = await this.callHandler('area_search', { areaName });
    
    if (Array.isArray(result)) {
      return {
        success: true,
        results: result.map(item => ({
          areaName: item.AREANAME || '',
          pincode: item.PINCODE || '',
          city: item.CITY || item.AREANAME
        }))
      };
    }
    
    return { success: false, results: [], error: result.error };
  }

  /**
   * Get API logs from Firestore
   */
  async getAPILogs(limitCount = 50) {
    try {
      const logsRef = collection(db, 'courier_api_logs');
      const q = query(logsRef, orderBy('created_at', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching API logs:', error);
      return [];
    }
  }
}

const tpcService = new TPCCourierService();
export default tpcService;
