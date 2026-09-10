# TRIPHORIA Operations Workflow

This document outlines the exact operational sequence for processing a project from Customer brief to Final Delivery.

## Core Roles
- **Customer**: Submits projects, provides footage, reviews cuts, requests revisions, and approves final deliveries.
- **Super Admin**: Reviews new project briefs, manages editor capacity, assigns projects to editors, and oversees studio operations.
- **Lead Editor**: Receives assigned projects, downloads footage, uploads review cuts, and delivers final high-res renders.

---

## 1. Customer Creates Project
- **UI Location**: Customer Dashboard &rarr; "Start New Project"
- **Action**: The Customer fills out the Project Brief, selects a service tier, defines styling guidelines, and provides a shareable Google Drive link containing their raw footage.
- **Result**: A new Order is created with the status `Pending Approval`.

## 2. Admin Reviews & Approves
- **UI Location**: Admin Dashboard &rarr; "Pending Project Approvals" (or Orders Queue)
- **Action**: The Super Admin reviews the brief and verifies that the provided Google Drive link has the correct permissions ("Anyone with the link can view").
- **Result**: If valid, the Admin clicks **Approve**.

## 3. Admin Assigns Editor
- **UI Location**: Admin Dashboard &rarr; Orders Queue
- **Action**: The Admin selects an approved project and clicks **Approve & Assign**. They select an Editor from the dropdown (based on the Editor's specialty and current active workload).
- **Result**: The Order status changes to `In Progress` and is placed into the selected Editor's personal queue.

## 4. Editor Begins Work
- **UI Location**: Editor Dashboard &rarr; "Assigned Projects"
- **Action**: The assigned Editor logs into `/login` using their credentials. The server automatically routes them to the Editor Dashboard.
- **Action**: The Editor opens the assigned project, reviews the brief, and accesses the Customer's Google Drive link to ingest footage.

## 5. Editor Submits Review Cut
- **UI Location**: Editor Dashboard &rarr; Open Project &rarr; "Upload Cut"
- **Action**: The Editor completes a draft/review cut and uploads it (or pastes a frame.io/review link). They click **Submit Cut for Review**.
- **Result**: The Order status changes to `Review`.

## 6. Customer Reviews Cut
- **UI Location**: Customer Dashboard &rarr; Open Project
- **Action**: The Customer is notified (or logs in) to review the submitted cut.
- **Branch A - Request Revision**: The Customer enters feedback and clicks **Request Revision**. The status reverts to `In Progress` and alerts the Editor.
- **Branch B - Approve Final**: The Customer clicks **Approve & Request Final Output**.

## 7. Project Completed
- **UI Location**: Editor Dashboard &rarr; Open Project
- **Action**: Once the Customer approves the cut, the Editor delivers the final uncompressed (e.g., ProRes) file link.
- **Result**: The project is marked `Completed` and archived from active operational queues.
