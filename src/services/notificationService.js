import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Checks if any users are waiting for a product to be back in stock
 * and sends them notifications.
 * @param {string} productId 
 * @param {string} productName 
 * @param {string} size - Optional specific size that came back in stock
 */
export const checkAndNotifyBackInStock = async (productId, productName, size = null) => {
  try {
    console.log(`Checking notifications for ${productName}${size ? ` (${size})` : ''}...`);
    
    // 1. Get all pending notifications for this product
    let q = query(
      collection(db, 'stockNotifications'),
      where('productId', '==', productId),
      where('status', '==', 'pending')
    );

    // If a specific size is provided, we should ideally notify people who asked for THAT size
    // or people who asked for ANY size (if we didn't store size before).
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('No pending notifications for', productName);
      return;
    }

    // 2. Filter by size if necessary (if the notification has a size field)
    const pendingDocs = snapshot.docs.filter(doc => {
      const data = doc.data();
      // If notification has a size, it must match the incoming size (if provided)
      // If notification doesn't have a size, treat it as "any size"
      if (size && data.selectedSize && data.selectedSize !== size) {
        return false;
      }
      return true;
    });

    if (pendingDocs.length === 0) {
      console.log(`No size-matching pending notifications for ${productName} (${size})`);
      return;
    }

    console.log(`Found ${pendingDocs.length} matching pending notifications for ${productName}. Sending now...`);

    // 3. For each notification request, create a user notification
    const notificationPromises = pendingDocs.map(async (notifDoc) => {
      const data = notifDoc.data();
      const userId = data.userId;

      if (!userId) return;

      const displaySize = data.selectedSize || size || '';

      // Create the notification in users/{userId}/notifications
      // This matches the listener in Header.js
      await addDoc(collection(db, 'users', userId, 'notifications'), {
        title: 'Back in Stock!',
        message: `${productName}${displaySize ? ` (${displaySize})` : ''} is now back in stock! Order now before it runs out.`,
        type: 'back_in_stock',
        productId: productId,
        productName: productName,
        selectedSize: displaySize,
        link: `/product/${productId}`,
        read: false,
        createdAt: serverTimestamp()
      });

      // Update the request status to completed/notified
      await updateDoc(doc(db, 'stockNotifications', notifDoc.id), {
        status: 'notified',
        notifiedAt: serverTimestamp()
      });
    });

    await Promise.all(notificationPromises);
    console.log(`Successfully notified ${pendingDocs.length} users for ${productName}`);
  } catch (error) {
    console.error('Error in checkAndNotifyBackInStock:', error);
  }
};
