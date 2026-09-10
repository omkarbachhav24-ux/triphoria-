# TRIPHORIA UX Flow

## Three Roles

### Customer
Sees: Dashboard, Projects, Start a Project, Our Work, Profile

### Editor
Sees: Dashboard, Assigned Projects, Project Details, Profile

### Super Admin
Sees: Operations, Projects, Editors, CMS, Audit, Settings

## Customer Journey

```
Homepage → Browse Work → Start a Project
                              ↓
                        /login (if not authenticated)
                              ↓
                        Project Creation Flow
                              ↓
                    Step 1: Project Details
                    Step 2: Google Drive Link
                    Step 3: Review & Submit
                              ↓
                    Confirmation (Project ID, status, next steps)
                              ↓
                    Dashboard → Track Progress
                              ↓
                    Review Output (when in Review)
                              ↓
                    Approve → Completed → Download Final
```

## Project Lifecycle States

| Status | Customer Language | Internal State |
| :--- | :--- | :--- |
| Pending Approval | "Your project has been submitted and is waiting for our team." | `Pending Approval` |
| In Progress | "Your project is currently being edited." | `In Progress` |
| Review | "Your edited video is ready for review." | `Review` |
| Completed | "Your final video is ready." | `Completed` |
| Rejected | "Your project was not approved. See feedback." | `Rejected` |

## Admin Journey

```
/login → Admin Dashboard
              ↓
    ┌─────────┼──────────┐──────────┐
    ↓         ↓          ↓          ↓
  Pending   Active     Editors    CMS
  Projects  Projects   Mgmt      Manager
    ↓         ↓          ↓          ↓
  Approve   Reassign   Create    Portfolio
  + Assign  Editor     Editor    Featured
  Editor               Enable/   Social
    ↓                  Disable   CTAs
  Reject                         ↓
  with                         Audit
  Reason                       Logs
```

## Editor Journey

```
/login → Editor Dashboard
              ↓
        Assigned Projects
              ↓
        Open Project
              ↓
    View Requirements + Google Drive Link
              ↓
    Download footage from Drive
              ↓
    Edit externally
              ↓
    Upload output version
              ↓
    Submit for Review
              ↓
    Wait for approval or revision request
```

## Google Drive Integration

Customer provides a shareable Google Drive link during project creation.

- Link format validated (must be `drive.google.com`)
- Clear instructions displayed about sharing settings
- Link stored in project record
- Editor accesses footage via the link
- TRIPHORIA does NOT download or proxy the media

## Authentication

- Single `/login` page for all roles
- Server determines role from authenticated user record
- HttpOnly session cookies
- Server-side authorization on all protected endpoints
- Role never trusted from browser
