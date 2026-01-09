import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './src/config/firebase.js';

const categoryMapping = {
  'Organic Exotic Products': 'Vegetable Basket',
  'Organic Wood Cold Press Oils Products': 'Satva Pure Oils',
  'Organic Powder': 'Healthy Life Powders',
  'Organic Woodcold press Oils products': 'Satva Pure Oils',
  'Organic Iteams': 'Organic Items'
};

async function syncProductCategories() {
  console.log('Starting category sync...');
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    let updatedCount = 0;
    
    for (const productDoc of snapshot.docs) {
      const data = productDoc.data();
      const currentCategory = data.category;
      
      if (categoryMapping[currentCategory]) {
        const newCategory = categoryMapping[currentCategory];
        console.log(`Updating product "${data.name}": "${currentCategory}" -> "${newCategory}"`);
        
        await updateDoc(doc(db, 'products', productDoc.id), {
          category: newCategory
        });
        updatedCount++;
      }
    }
    
    console.log(`Successfully updated ${updatedCount} products.`);
  } catch (error) {
    console.error('Error syncing categories:', error);
  }
}

syncProductCategories();
