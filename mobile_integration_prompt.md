# 🚀 MASTER PROMPT: PUAC FaithLy Mobile App Backend Integration

Copy and paste this entire document directly into the AI assistant you are using to build the **FaithLy Mobile App** (React Native / Expo / Flutter / Swift / Kotlin). It provides full architectural context, API endpoints, schema definitions, authentication states, push notification setup, and ready-to-use client-side services.

---

```markdown
## Context & System Architecture

You are an expert mobile developer building the mobile client app for **FaithLy** (the digital community portal for the Philippine United Apostolic Church - PUAC). 
Our backend is already fully operational, running on Node.js (Express) with MongoDB Atlas, hosted on Render. 

Your objective is to build the mobile application, implementing the UI, client-side state, and seamless connection to the backend REST API.

### 🌐 Server Environments
- **Production Server Base URL:** `https://faithly-server.onrender.com/api` (or custom domain `https://api.puacfaithly.com/api`)
- **Local Dev Server Base URL:** `http://10.0.2.2:5000/api` (Android Emulator) or `http://localhost:5000/api` (iOS Simulator)

---

## 🔒 Authentication & Session Management

We use **JWT (JSON Web Tokens)** for session authorization. All protected routes require the HTTP header:
`Authorization: Bearer <JWT_TOKEN>`

### 🔑 Token Lifespan
*   **User Token Expiry:** 1 hour
*   **Role Type:** "user"

### 🚦 The Authentication Flow
1.  **Register (`POST /register`):** Sends a 6-digit OTP to the user's email.
2.  **Verify OTP (`POST /verify-otp`):** Moves the user from the pending state to the active database.
3.  **Resend OTP (`POST /resend-otp`):** Resends OTP if requested (limited to 3 times/15 mins).
4.  **Login (`POST /login`):** Generates JWT token and returns user details.
5.  **Secure Storage:** Store the JWT token securely on the device using a secure storage module (e.g., `expo-secure-store` or `react-native-keychain`).
6.  **Auto-Auth & Refresh:** On app launch, check for the token. If present and valid, perform auto-login. If an API call fails with `401 Unauthorized`, clear the token and redirect the user to the login screen.

---

## ⚙️ Setup Axios Client (React Native / Javascript Example)

Implement this exact Axios client with request/response interceptors to automatically append the token and handle expiration:

```javascript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://faithly-server.onrender.com/api'; // Replace with active base URL

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically inject JWT
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Unauthorized (Expired Tokens)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to Login
      await SecureStore.deleteItemAsync('user_token');
      // Dispatch a navigation reset or broadcast event to trigger redirect
      console.log('Session expired. Redirecting...');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 📡 Core API Modules & Endpoints

### 1. Authentication
*   **Sign Up:** `POST /register`
    *   **Body:** `{ email, password, fullName, phone (+63XXXXXXXXXX format), birthday (ISO String), branch, position, gender, churchId }`
*   **Verify OTP:** `POST /verify-otp`
    *   **Body:** `{ email, otp }`
*   **Resend OTP:** `POST /resend-otp`
    *   **Body:** `{ email }`
*   **Login:** `POST /login`
    *   **Body:** `{ email, password }`
    *   **Response:** `{ success: true, token: "...", user: { email, fullName, phone, branch, position, churchId, gender, birthday, role: 'user' } }`
*   **Password Reset Request:** `POST /reset-password-request`
    *   **Body:** `{ email }` (Sends OTP to email)
*   **Password Reset Verify:** `POST /reset-password-verify-otp`
    *   **Body:** `{ email, otp }`
*   **Password Reset Complete:** `POST /reset-password-update`
    *   **Body:** `{ email, otp, newPassword }`
*   **Deactivate Account:** `DELETE /delete-account` (Protected)
    *   **Body:** `{ password }` (Soft deactivates account)

---

### 2. User Profile & Settings (Protected)
*   **Get Profile (`GET /me`):** Returns the active logged-in user profile document.
*   **Update Profile (`PUT /update-profile`):**
    *   **Body (All fields optional):** `{ fullName, phone, branch, position, dateOfBirth, emailNotifications (bool), pushNotifications (bool), notifPrefs (obj), expoPushToken }`
*   **Upload Profile Photo (Base64):** `PUT /upload-photo`
    *   **Body:** `{ photoBase64: "data:image/jpeg;base64,..." }` (Max 2MB)
*   **Upload Profile Photo (Multipart File - Easiest for Mobile):** `PUT /upload-photo-file`
    *   **Content-Type:** `multipart/form-data`
    *   **FormData field:** `photo` (Upload as a file binary, max 2MB)
*   **Request Email Change:** `POST /request-email-change`
    *   **Body:** `{ newEmail }` (Sends confirmation code to the new address)
*   **Confirm Email Change:** `POST /verify-email-change`
    *   **Body:** `{ otp }` (Updates email and returns a fresh JWT)
*   **Get Saved Payment Accounts:** `GET /saved-accounts` (Returns previously used GCash/E-Wallet details)
*   **Save New Payment Account:** `POST /saved-accounts`
    *   **Body:** `{ method, accountNumber, accountName, label }`

---

### 3. Smart Payment Flow: Gateway vs. Manual Modes
The system can toggle between online automated checkouts (PayMongo gateway) and manual receipt verification (admin panel review). You **MUST** query this global setting on page load to dynamically adapt the app's UI:

*   **Query System Setting:** `GET /settings/public`
    *   **Response:** `{ "paymentApprovalMethod": "gateway" | "manual" }`

#### 💳 If Gateway Mode:
1.  Initiate payment (Donation, Loan Pay, Savings Deposit).
2.  Backend returns a PayMongo checkout URL: `{ success: true, checkoutUrl: "https://paymongo.tri/..." }`.
3.  **Mobile Action:** Open this URL inside a React Native **WebView** (`react-native-webview`) or using Expo's **WebBrowser**.
4.  Redirect the user back when they hit the `successUrl` / `cancelUrl` parameter.
5.  Webhooks handle confirmation automatically on the server.

#### 🧾 If Manual Mode:
1.  Render manual church details (e.g. Bank Account details / GCash QR).
2.  Ask the user to copy/paste or enter details.
3.  The user must upload a screenshot of the payment receipt.
4.  **Body Payload:** Include `proofOfPayment` (or `proofData`) as a **base64 encoded image string**.
5.  Submit. Status is set to `pending`. Admins will confirm via their web dashboard.

---

### 4. Savings Module (Protected)
*   **Get Savings Dashboard (`GET /savings/overview?txnLimit=5`):** Returns core stats (Total Savings, This Month Deposits, Max Loanable amount based on 2x savings rule), recent transactions, and goal list.
*   **Get Goals:** `GET /savings/goals?all=true`
*   **Create Goal:** `POST /savings/goals`
    *   **Body:** `{ name, targetAmount, color (string CSS or hex), iconType }`
*   **Update Goal:** `PUT /savings/goals/:id`
    *   **Body:** `{ name, targetAmount, color, iconType }`
*   **Delete Goal:** `DELETE /savings/goals/:id`
*   **Savings Deposit:** `POST /savings/deposit`
    *   **Body:** `{ goalId, amount, description, source, paymentMethod, proofOfPayment (if manual), subMethod, accountName, accountNumber }`
    *   **Response:** Returns `checkoutUrl` (if gateway mode) or success message (if manual mode).
*   **Savings Withdrawal:** `POST /savings/withdraw`
    *   **Body:** `{ goalId, amount, reason, sendMethod, accountNumber, accountName }` (Deducts instantly)
*   **Transfer Funds Between Goals:** `POST /savings/transfer`
    *   **Body:** `{ fromGoalId, toGoalId, amount, note }`

---

### 5. Loans Module (Protected)
*   **Get Active & Historical Loans (`GET /loans/my-loans`):** Returns all loan applications. Each active loan is enriched with real-time fields: `nextPaymentDate`, `upcomingPaymentAmount`, and `isLate` (overdue past 3-day grace period, applying 3% late penalty automatically).
*   **Apply for a Loan:** `POST /loans/apply`
    *   **Body:**
        ```json
        {
          "amount": 10000,
          "loanType": "personal | emergency | short-term",
          "purpose": "Tuition / Medical / Business / etc.",
          "termMonths": 12,
          "interestRate": 0.02,
          "totalInterest": 2400,
          "totalRepayment": 12400,
          "monthlyPayment": 1033.33,
          "disbursementMethod": "e-wallet | bank | cash",
          "disbursementAccount": "Juan Dela Cruz - 09171234567",
          "selfieData": "base64 image",
          "idData": "base64 image",
          "coeData": "base64 image (optional)",
          "itrData": "base64 image (optional)"
        }
        ```
*   **Get Single Loan Details:** `GET /loans/:id` (id can be the customized `LN-YYYY-XXX` string or MongoDB `_id`)
*   **Get Amortization Schedule:** `GET /loans/:id/schedule`
*   **Make Loan Payment:** `POST /loans/:id/pay`
    *   **Body:**
        ```json
        {
          "paymentMethod": "gcash | maya | card | cash",
          "paymentType": "regular | full | advance | open",
          "amount": 1033.33,
          "monthsCovered": 1,
          "proofData": "base64 image (if manual approval)",
          "subMethod": "GCash",
          "successUrl": "faithlyapp://loans/success",
          "cancelUrl": "faithlyapp://loans/cancel"
        }
        ```
*   **Accept or Decline Admin proposed Terms:** `PUT /loans/:id/respond-terms`
    *   **Body:** `{ "accepted": true | false }`
*   **Cancel Loan:** `PUT /loans/:id/cancel`
    *   **Body:** `{ "reason": "Text reason string" }`

---

### 6. Donations Module (Protected)
*   **Submit Donation:** `POST /donations`
    *   **Body:** `{ amount, category (General Fund / Youth / Mission / etc.), isRecurring (bool), paymentMethod, proofOfPayment (if manual), subMethod, accountName, accountNumber }`
    *   **Response:** Checkout URL (Gateway) or pending response (Manual).
*   **Donation History:** `GET /donations/my-donations?page=1&limit=10`
    *   **Response includes:** Category breakdown and monthly data metrics for plotting beautiful charts locally.

---

### 7. Attendance Checking via QR Scan (Protected)
Our church tracks service attendance dynamically. Members use their mobile app to scan a QR code presented on the sanctuary screen. The QR code contains a simple unique `sessionId`.

*   **Submit Scan:** `POST /attendance/scan-qr`
    *   **Body:** `{ "sessionId": "SESS-YYYY-XXXX" }`
    *   **Response:** `{ "success": true, "message": "Checked in as Present successfully!" }`
*   **My Attendance History:** `GET /attendance/my-attendance?page=1&limit=10` (includes stats of total check-ins)

---

### 8. AI Church Assistant / Chatbot (Protected)
*   **Send Chat Message:** `POST /chat`
    *   **Body:**
        ```json
        {
          "message": "How much have I saved so far?",
          "history": [
            { "sender": "user", "text": "Hello" },
            { "sender": "bot", "text": "Hello! I am your PUAC Assistant..." }
          ]
        }
        ```
    *   **Response:**
        ```json
        {
          "success": true,
          "reply": "You have currently saved ₱15,200 across your active goals.",
          "quickReplies": ["My active loans", "Make a deposit", "Church announcements"],
          "source": "ai"
        }
        ```
    *   **Note:** The backend automatically injects the user's real-time financial stats and church branch info into the LLM system prompt context, ensuring hyper-personalized answers.

---

### 9. Unified Notifications & Announcements
*   **Public Announcements Feed:** `GET /admin/announcements?branch=YOUR_BRANCH_NAME` (Returns active events and target banner data)
*   **Public Branch Selector:** `GET /public/branches` (Lists all active churches for the registration dropdown)
*   **Member Notification Feed:** `GET /notifications/feed`
    *   **Response:** Unified feed containing loan statuses, savings activities, donations, attendance records, and active church alerts.
*   **Read State Synchronizer:**
    *   `GET /read-notifications` (Returns string array of already read notification IDs)
    *   `POST /read-notifications`
        *   **Body:** `{ "ids": ["notification-id-abc", "notification-id-xyz"] }`

---

## 🔔 Setting Up Expo Push Notifications

Integrate these steps in your app initialization file to subscribe the device to the server's push engine:

1.  Request notification permissions.
2.  Acquire the unique Expo Push Token.
3.  Upload the token to our profile update endpoint:

```javascript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import apiClient from './apiClient';

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }
  
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'YOUR-EXPO-PROJECT-ID-HERE', // Replace with your Expo project ID
  });
  const token = tokenData.data;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Upload token to backend
  try {
    await apiClient.put('/update-profile', { expoPushToken: token });
    console.log('Push token successfully registered with backend:', token);
  } catch (err) {
    console.error('Failed to sync push token with backend:', err);
  }

  return token;
}
```

---

## 🎨 Premium Design System Tokens (For UI/UX consistency)
To match the existing web dashboard, style the mobile app using these parameters:
- **Primary Color (Premium Gold/Cream):** `#C5A880` (Gold highlight), `#D4AF37` (Metallic Gold)
- **Deep Accent (Navy/Slate):** `#1E293B` (Background containers), `#0F172A` (Deep dark mode canvas)
- **Status Colors:**
  *   *Pending / Warning:* `#F59E0B` (Amber)
  *   *Success / Confirmed:* `#10B981` (Emerald)
  *   *Rejected / Overdue:* `#EF4444` (Rose Red)
- **Typography:** Sleek geometric sans-serif (e.g., `Inter` or `Outfit` Google Fonts).

---

## 🎯 Your Task
Now that you have the complete backend API blueprint, let's start implementing the mobile screens. Let me know which component we should build first (e.g., Auth forms with OTP verification, the Savings tracker with charts, the Loan Application form with document uploads, or the QR Scanner for attendance check-in). I am ready to write complete, clean React Native / Expo components!
```
