// Test script to check Firebase connection and add sample orders
// Run this in browser console or create a test page

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config/firebase';

// Sample order data
const sampleOrders = [
    {
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '9876543210',
        items: [
            {
                id: 'prod1',
                name: 'Organic Wheat Flour',
                price: 150,
                quantity: 2,
                image: 'https://via.placeholder.com/100'
            }
        ],
        totalAmount: 300,
        status: 'pending',
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        shippingAddress: {
            street: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400001'
        },
        createdAt: serverTimestamp()
    },
    {
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        customerPhone: '9876543211',
        items: [
            {
                id: 'prod2',
                name: 'Organic Rice',
                price: 200,
                quantity: 1,
                image: 'https://via.placeholder.com/100'
            },
            {
                id: 'prod3',
                name: 'Organic Dal',
                price: 120,
                quantity: 2,
                image: 'https://via.placeholder.com/100'
            }
        ],
        totalAmount: 440,
        status: 'processing',
        paymentMethod: 'upi',
        paymentStatus: 'paid',
        shippingAddress: {
            street: '456 Park Ave',
            city: 'Delhi',
            state: 'Delhi',
            zipCode: '110001'
        },
        createdAt: serverTimestamp()
    },
    {
        customerName: 'Mike Johnson',
        customerEmail: 'mike@example.com',
        customerPhone: '9876543212',
        items: [
            {
                id: 'prod4',
                name: 'Organic Honey',
                price: 350,
                quantity: 1,
                image: 'https://via.placeholder.com/100'
            }
        ],
        totalAmount: 350,
        status: 'delivered',
        paymentMethod: 'card',
        paymentStatus: 'paid',
        shippingAddress: {
            street: '789 Lake Road',
            city: 'Bangalore',
            state: 'Karnataka',
            zipCode: '560001'
        },
        createdAt: serverTimestamp()
    }
];

// Function to add sample orders
export const addSampleOrders = async () => {
    try {
        console.log('Adding sample orders...');
        const ordersRef = collection(db, 'orders');

        for (const order of sampleOrders) {
            const docRef = await addDoc(ordersRef, order);
            console.log('Order added with ID:', docRef.id);
        }

        console.log('All sample orders added successfully!');
        return true;
    } catch (error) {
        console.error('Error adding sample orders:', error);
        return false;
    }
};

// To use this, you can:
// 1. Import this function in your component
// 2. Add a button to trigger it
// 3. Or run it once in useEffect
