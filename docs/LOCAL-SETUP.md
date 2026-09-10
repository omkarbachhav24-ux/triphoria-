# TRIPHORIA Local Development Setup

This document explains how to bootstrap the TRIPHORIA development environment securely and test the operational workflow.

## 1. Install dependencies
Run the following command to install required packages:
```bash
npm install
```

## 2. Configure local environment variables
Create a `.env` file in the root directory.

## 3. ADMIN_EMAIL
Set your desired Super Admin email in the `.env` file:
```env
ADMIN_EMAIL=your-admin@example.com
```

## 4. ADMIN_PASSWORD
Set a secure local development password:
```env
ADMIN_PASSWORD=your-local-development-password
```
*(Never commit this file or use real production credentials here).*

## 5. Start backend
```bash
npm run server
```
This will seed the initial database securely using the environment variables provided.

## 6. Start frontend
In a separate terminal, start the Vite development server:
```bash
npm run dev
```

## 7. Open /login
Navigate to `http://localhost:5173/login` in your browser.

## 8. Login as Super Admin
Use the credentials you defined in the `.env` file. You will be routed directly to the Admin Operations Console.

## 9. Create Editor
In the Admin Dashboard, click **Manage Editors** -> **Onboard New Editor**. Fill in their details and click Provision Account.

## 10. Give Editor temporary credentials
The system will generate a temporary one-time password (e.g. `TP-A1B2-C3D4`). Copy this securely. It will never be shown again and cannot be recovered from the database. Hand this credential to the Editor.

## 11. Login as Editor
The Editor goes to `/login`, enters their email and the temporary password, and is routed to the Editor Dashboard where they only see their assigned projects.

## 12. Customer workflow
A customer clicks "Need a client account? Register here" on the `/login` page to register. They are routed to the Customer Dashboard. From there, they click **Start New Project**, fill out their brief and Google Drive URL, and submit. The Admin then sees this in their queue, approves it, and assigns it to an Editor.

## 13. Reset local database/credentials if required
If you need to start fresh, delete the `server/triphoria.sqlite` file, update your `.env`, and restart the backend server.
