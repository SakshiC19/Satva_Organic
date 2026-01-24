/**
 * Firebase Setup Script for TPC Courier Integration
 * 
 * This script initializes the necessary Firebase collections
 * for the TPC courier integration.
 * 
 * Run this once to set up the database structure.
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './src/config/firebase';

async function setupTPCIntegration() {
  console.log('🚀 Setting up TPC Courier Integration...\n');

  try {
    // 1. Create initial courier settings (with placeholder credentials)
    console.log('📦 Creating courier_settings collection...');
    const courierSettingsRef = await addDoc(collection(db, 'courier_settings'), {
      courier_name: 'TPC',
      api_base_url: 'https://tpcwebservice.com',
      username: 'YOUR_TPC_USERNAME',  // Replace with actual credentials
      password: btoa('YOUR_TPC_PASSWORD'),  // Base64 encoded
      active: false,  // Set to true after entering real credentials
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    console.log('✅ Courier settings created with ID:', courierSettingsRef.id);

    // 2. Create sample API log entry
    console.log('\n📊 Creating courier_api_logs collection...');
    const apiLogRef = await addDoc(collection(db, 'courier_api_logs'), {
      api_name: 'Setup',
      request_payload: JSON.stringify({ action: 'initialize' }),
      response_payload: JSON.stringify({ status: 'success', message: 'TPC integration initialized' }),
      status: 'success',
      created_at: serverTimestamp()
    });
    console.log('✅ API log created with ID:', apiLogRef.id);

    // 3. Create sample admin notification
    console.log('\n🔔 Creating admin_notifications collection...');
    const notificationRef = await addDoc(collection(db, 'admin_notifications'), {
      type: 'system',
      message: 'TPC Courier Integration has been set up successfully',
      created_at: serverTimestamp(),
      read: false
    });
    console.log('✅ Admin notification created with ID:', notificationRef.id);

    console.log('\n✨ TPC Integration setup completed successfully!\n');
    console.log('📝 Next Steps:');
    console.log('1. Navigate to Admin Panel → Courier Settings');
    console.log('2. Enter your actual TPC API credentials');
    console.log('3. Enable the integration by setting Active = true');
    console.log('4. Test the integration with a sample order\n');

  } catch (error) {
    console.error('❌ Error setting up TPC integration:', error);
    console.error('Please check your Firebase configuration and try again.');
  }
}

// Run the setup
setupTPCIntegration();

export default setupTPCIntegration;
