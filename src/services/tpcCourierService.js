/**
 * TPC (The Professional Couriers) Web API Integration Service
 * 
 * This service handles all TPC API interactions including:
 * - PIN code service check
 * - Area/City search (auto-suggest)
 * - Consignment Note (AWB) request
 * 
 * All API calls are logged for monitoring and debugging
 */

import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import config from '../config';

class TPCCourierService {
  constructor() {
    this.baseURL = null;
    this.username = null;
    this.password = null;
    this.initialized = false;
  }

  /**
   * Initialize service with credentials from Firebase
   */
  async initialize() {
    try {
      const settingsRef = collection(db, 'courier_settings');
      const q = query(settingsRef, where('courier_name', '==', 'TPC'), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const settings = snapshot.docs[0].data();
        this.baseURL = settings.api_base_url || 'https://www.tpcglobe.com';
        this.username = settings.username;
        this.password = this.decryptPassword(settings.password);
        this.initialized = true;
        return true;
      } else {
        console.error('TPC courier settings not found in database');
        return false;
      }
    } catch (error) {
      console.error('Error initializing TPC service:', error);
      return false;
    }
  }

  /**
   * Simple password decryption (implement proper encryption in production)
   */
  decryptPassword(encryptedPassword) {
    // TODO: Implement proper decryption
    // For now, assuming base64 encoding
    try {
      return atob(encryptedPassword);
    } catch {
      return encryptedPassword;
    }
  }

  /**
   * Log API request and response
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
   * Safe JSON parser that handles common API response issues
   * specifically "Bad control character" errors caused by unescaped newlines
   */
  async safeJsonParse(response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (error) {
      console.warn('Standard JSON parse failed, attempting sanitization:', error);
      
      // Check if it's HTML
      if (text.trim().startsWith('<')) {
        throw new Error('Received HTML response instead of JSON');
      }

      // Fix "Bad control character" (newlines in strings)
      // We replace newlines with spaces. This preserves JSON structure (newlines are whitespace)
      // and fixes invalid strings.
      const sanitized = text.replace(/[\n\r]/g, ' ');
      try {
        return JSON.parse(sanitized);
      } catch (e2) {
        console.error('Sanitized JSON parse failed:', e2);
        console.log('Original Text:', text);
        throw new Error(`Failed to parse API response: ${error.message}`);
      }
    }
  }

  /**
   * 1. PIN Code Service Check
   * Checks if delivery and COD are available for a given PIN code
   * 
   * API: http://www.tpcglobe.com/tpcwebservice/PINcodeService.ashx?pincode=563130
   * Method: POST
   * Content-Type: application/json
   * 
   * @param {string} pincode - 6-digit PIN code
   * @returns {Object} - Service availability details
   */
  async checkPinCodeService(pincode) {
    if (!this.initialized) {
      await this.initialize();
    }

    const apiName = 'PINcodeService';
    const requestPayload = { pincode };
    
    try {
      // As per TPC official documentation
      const url = `${this.baseURL}/tpcwebservice/PINcodeService.ashx?pincode=${pincode}`;
      const proxyUrl = `${config.TPC_PROXY_URL}?url=${encodeURIComponent(url)}`;
      
      console.log('🔍 Checking PIN code:', pincode);
      console.log('📡 API URL:', url);
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await this.safeJsonParse(response);
      console.log('📥 TPC Response:', data);
      console.log('📊 Response Type:', typeof data);
      console.log('📋 Response Keys:', Object.keys(data));
      
      // Log successful API call
      await this.logAPICall(apiName, requestPayload, data, 'success');

      // Check if TPC returned an error message
      if (data.error || data.ERROR || data.message || data.MESSAGE) {
        const errorMsg = data.error || data.ERROR || data.message || data.MESSAGE;
        console.warn('⚠️ TPC returned error:', errorMsg);
        return {
          success: false,
          error: errorMsg,
          parcelDelivery: false,
          codAvailable: false,
          rawResponse: data
        };
      }

      // Handle Array Response (Multiple areas for one PIN) vs Single Object
      let pinData = null;
      
      if (Array.isArray(data)) {
        console.log(`📊 Received array with ${data.length} entries. Searching for serviceable area...`);
        // Find first entry with Parcel Delivery available
        pinData = data.find(item => item.PARCEL_DELIVERY === 'YES' || item.parcel_delivery === 'YES');
        
        // If no serviceable area found, just take the first one to show details
        if (!pinData && data.length > 0) {
          pinData = data[0];
        }
      } else {
        pinData = data;
      }

      if (!pinData) {
        throw new Error('Empty response from TPC API');
      }

      // Parse response based on TPC documentation
      const result = {
        success: true,
        pincode: pinData.PINCODE || pincode,
        areaName: pinData.AREANAME || '',
        stationCode: pinData.STATION_CODE || '',
        subBranchCode: pinData.SUB_BRANCH_CODE || '',
        docDelivery: pinData.DOC_DELIVERY === 'YES',
        parcelDelivery: pinData.PARCEL_DELIVERY === 'YES',
        proPremiumDelivery: pinData.PROPREMIUM_DELIVERY === 'YES',
        docDeliverySchedule: pinData.DOC_DELIVERY_SCHEDULE || '',
        parcelDeliverySchedule: pinData.PARCEL_DELIVERY_SCHEDULE || '',
        proPremiumSchedule: pinData.PROPREMIUMSCHEDULE || '',
        codAvailable: pinData.COD_DELIVERY === 'YES',
        rawResponse: data
      };

      console.log('✅ Parsed Result:', {
        parcelDelivery: result.parcelDelivery,
        codAvailable: result.codAvailable,
        areaName: result.areaName
      });

      return result;

    } catch (error) {
      console.error('❌ PIN code service error:', error);
      
      // Log failed API call
      await this.logAPICall(apiName, requestPayload, { error: error.message }, 'failed');
      
      return {
        success: false,
        error: error.message,
        parcelDelivery: false,
        codAvailable: false
      };
    }
  }

  /**
   * 2. Area/City Search (Auto-Suggest)
   * Returns list of areas matching the search term
   * 
   * API: https://www.tpcglobe.com/TPCWebservice/PINcodeCitysearch.ashx?AreaName=coimbatore
   * Method: POST
   * Content-Type: application/json
   * 
   * @param {string} areaName - Search term for area/city
   * @returns {Array} - List of matching areas with PIN codes
   */
  async searchAreaCity(areaName) {
    if (!this.initialized) {
      await this.initialize();
    }

    const apiName = 'PINcodeCitysearch';
    const requestPayload = { areaName };
    
    try {
      // As per TPC official documentation
      const url = `${this.baseURL}/TPCWebservice/PINcodeCitysearch.ashx?AreaName=${encodeURIComponent(areaName)}`;
      const proxyUrl = `${config.TPC_PROXY_URL}?url=${encodeURIComponent(url)}`;
      
      console.log('🔍 Searching area:', areaName);
      console.log('📡 API URL:', url);
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await this.safeJsonParse(response);
      console.log('📥 TPC Response:', data);
      
      // Log successful API call
      await this.logAPICall(apiName, requestPayload, data, 'success');

      // Parse response based on TPC documentation
      // Response format: [{"AREANAME":"COIMBATORE","PINCODE":"641037","STATION_CODE":"CJB",...}]
      const results = Array.isArray(data) ? data.map(item => ({
        areaName: item.AREANAME || '',
        pincode: item.PINCODE || '',
        stationCode: item.STATION_CODE || '',
        subBranchCode: item.SUB_BRANCH_CODE || '',
        docDelivery: item.DOC_DELIVERY === 'YES',
        parcelDelivery: item.PARCEL_DELIVERY === 'YES',
        proPremiumDelivery: item.PROPREMIUM_DELIVERY === 'YES',
        docDeliverySchedule: item.DOC_DELIVERY_SCHEDULE || '',
        parcelDeliverySchedule: item.PARCEL_DELIVERY_SCHEDULE || '',
        proPremiumSchedule: item.PROPREMIUMSCHEDULE || '',
        codDelivery: item.COD_DELIVERY === 'YES'
      })) : [];

      return {
        success: true,
        results: results
      };

    } catch (error) {
      console.error('❌ Area search error:', error);
      
      // Log failed API call
      await this.logAPICall(apiName, requestPayload, { error: error.message }, 'failed');
      
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * 3. Consignment Note (AWB) Request
   * Requests consignment numbers from TPC
   * 
   * @param {number} quantity - Number of consignment notes required
   * @returns {Object} - Consignment numbers or error
   */
  async requestConsignmentNote(quantity = 1) {
    if (!this.initialized) {
      await this.initialize();
    }

    const apiName = 'CNoteRequest';
    const requestPayload = { 
      client: this.username, 
      quantity 
    };
    
    try {
      // Updated URL as per document: https://www.tpcglobe.com/TPCWebService/CnoteRequest.ashx?client=blraveryden&tpcpwd=xxx&Qty=100
      // Note: Using lowercase 'client' and 'tpcpwd' as per document
      const url = `${this.baseURL}/TPCWebService/CnoteRequest.ashx?client=${this.username}&tpcpwd=${this.password}&Qty=${quantity}`;
      const proxyUrl = `${config.TPC_PROXY_URL}?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl, {
        method: 'POST', // As per document: Method Type: Post
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await this.safeJsonParse(response);
      
      // Log successful API call
      await this.logAPICall(apiName, requestPayload, data, 'success');

      // Check if CN stock is available
      if (data.STATUS === 'SUCCESS' || data.status === 'success') {
        return {
          success: true,
          consignmentNumbers: data.CN_NUMBERS || data.consignment_numbers || [],
          message: data.MESSAGE || 'Consignment notes generated successfully'
        };
      } else {
        // CN stock not available
        return {
          success: false,
          error: data.MESSAGE || 'Consignment note stock not available',
          notifyAdmin: true
        };
      }

    } catch (error) {
      console.error('Consignment note request error:', error);
      
      // Log failed API call
      await this.logAPICall(apiName, requestPayload, { error: error.message }, 'failed');
      
      return {
        success: false,
        error: error.message,
        notifyAdmin: true
      };
    }
  }

  /**
   * Get API logs for monitoring
   * @param {number} limitCount - Number of logs to fetch
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

  /**
   * Check consignment note stock availability
   */
  async checkCNStock() {
    // This would call a specific API endpoint if available
    // For now, we'll try requesting 0 quantity to check status
    try {
      const result = await this.requestConsignmentNote(0);
      return result.success;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
const tpcService = new TPCCourierService();
export default tpcService;
