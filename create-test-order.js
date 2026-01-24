/**
 * Create Test Order for Dispatch Testing
 * Run this script to create a sample order ready for dispatch
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './src/config/firebase';

async function createTestOrder() {
  console.log('🧪 Creating test order for dispatch...\n');

  try {
    const testOrder = {
      // Order Information
      status: 'Packed', // This makes it appear in Dispatch
      orderNumber: `TEST-${Date.now()}`,
      
      // Customer Information
      customerName: 'Test Customer',
      email: 'test@example.com',
      phone: '9876543210',
      phoneNumber: '9876543210',
      
      // Shipping Address
      shippingAddress: {
        name: 'Test Customer',
        phone: '9876543210',
        addressLine1: '123 Test Street',
        addressLine2: 'Near Test Park',
        area: 'Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400069',
        postalCode: '400069',
        address: '123 Test Street, Near Test Park'
      },
      
      // Order Items
      items: [
        {
          id: 'test-product-1',
          name: 'Test Organic Product',
          price: 299,
          quantity: 2,
          weight: '500g',
          image: 'https://via.placeholder.com/150'
        },
        {
          id: 'test-product-2',
          name: 'Test Organic Oil',
          price: 450,
          quantity: 1,
          weight: '1L',
          image: 'https://via.placeholder.com/150'
        }
      ],
      
      // Payment Information
      paymentMethod: 'cod',
      paymentStatus: 'Pending',
      totalAmount: 1048,
      total: 1048,
      subtotal: 1048,
      shippingCost: 0,
      discount: 0,
      
      // Order Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId: 'test-user-123',
      
      // Company Information (optional)
      companyName: 'Test Company Pvt Ltd',
      
      // Order Notes
      notes: 'This is a test order for dispatch testing',
      
      // Workflow Status
      workflowStage: 'Inspection Complete',
      inspectionCompleted: true,
      inspectionDate: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'orders'), testOrder);
    
    console.log('✅ Test order created successfully!');
    console.log('📦 Order ID:', docRef.id);
    console.log('📋 Order Number:', testOrder.orderNumber);
    console.log('👤 Customer:', testOrder.customerName);
    console.log('📍 PIN Code:', testOrder.shippingAddress.pincode);
    console.log('💰 Total Amount: ₹', testOrder.totalAmount);
    console.log('\n🚀 Go to Admin Panel → Dispatch to see this order!\n');
    
    return docRef.id;

  } catch (error) {
    console.error('❌ Error creating test order:', error);
    throw error;
  }
}

// Run the function
createTestOrder()
  .then(() => {
    console.log('✨ Done! Refresh your Dispatch page to see the test order.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create test order:', error);
    process.exit(1);
  });

export default createTestOrder;
