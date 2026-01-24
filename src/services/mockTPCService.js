/**
 * Mock TPC Service for Testing
 * Use this for development/testing before getting real TPC credentials
 */

class MockTPCService {
  constructor() {
    this.initialized = true;
  }

  async initialize() {
    console.log('🧪 Using Mock TPC Service (Test Mode)');
    return true;
  }

  /**
   * Mock PIN Code Service Check
   */
  async checkPinCodeService(pincode) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data for specific PIN codes
    const mockData = {
      '400001': { city: 'Mumbai', state: 'Maharashtra', delivery: true, cod: true },
      '110001': { city: 'New Delhi', state: 'Delhi', delivery: true, cod: true },
      '560001': { city: 'Bangalore', state: 'Karnataka', delivery: true, cod: true },
      '600001': { city: 'Chennai', state: 'Tamil Nadu', delivery: true, cod: false },
      '700001': { city: 'Kolkata', state: 'West Bengal', delivery: true, cod: true },
      '411001': { city: 'Pune', state: 'Maharashtra', delivery: true, cod: true },
      '999999': { city: 'Unknown', state: 'Unknown', delivery: false, cod: false },
    };

    // If PIN is in mock list, use it. Otherwise, assume it's serviceable for testing.
    const data = mockData[pincode] || { 
      city: 'Test City', 
      state: 'Test State', 
      delivery: true, 
      cod: true 
    };

    return {
      success: true,
      pincode: pincode,
      parcelDelivery: data.delivery,
      codAvailable: data.cod,
      city: data.city,
      state: data.state,
      rawResponse: {
        PARCEL_DELIVERY: data.delivery ? 'YES' : 'NO',
        COD_AVAILABLE: data.cod ? 'YES' : 'NO',
        CITY: data.city,
        STATE: data.state
      }
    };
  }

  /**
   * Mock Area/City Search
   */
  async searchAreaCity(areaName) {
    await new Promise(resolve => setTimeout(resolve, 300));

    const mockAreas = [
      { area: 'Andheri East', city: 'Mumbai', state: 'Maharashtra', pincode: '400069' },
      { area: 'Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400058' },
      { area: 'Bandra East', city: 'Mumbai', state: 'Maharashtra', pincode: '400051' },
      { area: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
      { area: 'Koramangala', city: 'Bangalore', state: 'Karnataka', pincode: '560034' },
      { area: 'Indiranagar', city: 'Bangalore', state: 'Karnataka', pincode: '560038' },
    ];

    const results = mockAreas.filter(area => 
      area.area.toLowerCase().includes(areaName.toLowerCase()) ||
      area.city.toLowerCase().includes(areaName.toLowerCase())
    );

    return {
      success: true,
      results: results
    };
  }

  /**
   * Mock Consignment Note Request
   */
  async requestConsignmentNote(quantity = 1) {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate mock consignment numbers
    const consignmentNumbers = [];
    for (let i = 0; i < quantity; i++) {
      const randomNum = Math.floor(Math.random() * 1000000000);
      consignmentNumbers.push(`TPC${randomNum}`);
    }

    return {
      success: true,
      consignmentNumbers: consignmentNumbers,
      message: 'Mock consignment notes generated successfully (TEST MODE)'
    };
  }

  async logAPICall(apiName, requestPayload, responsePayload, status) {
    console.log('🧪 Mock API Call:', { apiName, status });
    // In mock mode, we can skip logging to database
  }
}

// Export mock instance
const mockTPCService = new MockTPCService();
export default mockTPCService;
