# Firebase Configuration Instructions

This file contains template configuration for Firebase. Follow these steps to set up your Firebase project:

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: "satva-organics"
4. Follow the setup wizard

## Step 2: Enable Firebase Services

Enable the following services in your Firebase console:

### Authentication
- Email/Password
- Phone (OTP)
- Google Sign-In

### Firestore Database
- Create database in production or test mode
- Set up security rules

### Storage
- Enable Firebase Storage for product images

## Step 3: Get Firebase Config

1. Go to Project Settings
2. Scroll to "Your apps" section
3. Click the web icon (</>)
4. Register your app
5. Copy the firebaseConfig object

## Step 4: Create .env File

Create a `.env` file in the root directory with:

```
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key (for production)
```

## Security Rules

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Products collection
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Orders collection
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Reviews collection
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.resource.size < 5 * 1024 * 1024 &&
        request.resource.contentType.matches('image/.*');
    }
    
    match /reviews/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.resource.size < 2 * 1024 * 1024;
    }
  }
}
```

## Note
- Never commit your .env file to version control
- The current firebase.js uses placeholder values
- Replace them with actual values from your Firebase project
