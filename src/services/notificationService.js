import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Checks if any users are waiting for a product to be back in stock
 * and sends them notifications.
 * @param {string} productId 
 * @param {string} productName 
 */
export const checkAndNotifyBackInStock = async (productId, productName) => {
  try {
    // 1. Get all pending notifications for this product
    const q = query(
      collection(db, 'stockNotifications'),
      where('productId', '==', productId),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('No pending notifications for', productName);
      return;
    }

    console.log(`Found ${snapshot.size} pending notifications for ${productName}. Sending now...`);

    // 2. For each notification request, create a user notification
    const notificationPromises = snapshot.docs.map(async (notifDoc) => {
      const data = notifDoc.data();
      const userId = data.userId;

      if (!userId) return;

      // Create the notification in users/{userId}/notifications
      // This matches the listener in Header.js
      await addDoc(collection(db, 'users', userId, 'notifications'), {
        title: 'Back in Stock!',
        message: `${productName} is now back in stock! Order now before it runs out.`,
        type: 'back_in_stock',
        productId: productId,
        productName: productName,
        status: 'unread',
        createdAt: serverTimestamp()
      });

      // Update the request status to completed/notified
      await updateDoc(doc(db, 'stockNotifications', notifDoc.id), {
        status: 'notified',
        notifiedAt: serverTimestamp()
      });
    });

    await Promise.all(notificationPromises);
    console.log(`Successfully notified users for ${productName}`);
  } catch (error) {
    console.error('Error in checkAndNotifyBackInStock:', error);
  }
};
