# Admin guide

Written for office staff and owners. Sign in at `/sign-in/`; staff land on `/admin/`. The sidebar only shows the sections your role allows.

## Daily routine

1. **Dashboard → Needs attention** lists:
   - bookings to review;
   - bookings to assign;
   - accepted bookings to confirm;
   - cancellation and reschedule requests;
   - documents to review;
   - open support messages.

   Click a row to open the filtered list.
2. **Bookings → open a booking**:
   1. Set the status to **Pending assignment** to approve the request.
   2. Under **Assign a professional**, pick someone marked "Available" and click **Assign & notify**. They're asked to accept.
   3. When they accept, set the status to **Confirmed**. The customer is told.
   4. **Reschedule** moves the visit. The professional is kept only if they're still free.
   5. A customer cancellation request appears at the top: choose **Cancelled** to approve it, or the previous status to decline it.
3. **Calendar** gives a month view of every booking, coloured by status.

## People

- **Employee Verification** lists professionals waiting for review, oldest first. Open one to:
  - read their profile;
  - open documents (each download is logged);
  - approve or reject documents and certifications;
  - set the verification status. The employee is emailed.
  - **Approve the services** they may be assigned to. Only approved professionals with approved services and working hours can be assigned.
- **Customers**: search and view a profile, addresses, family members and bookings. Add internal notes, and suspend or reactivate the account.
- **Job Applications**: review an application and its résumé, add notes, and set the status. With "Email the applicant" ticked:
  - **Approved** sends an invitation to create an employee account;
  - **Rejected** sends a polite decline.
- **Care Requests**: every website form submission (care request, consultation, contact, newsletter), with status and notes.

## Communication

- **Notifications**:
  - send announcements to customers, employees or everyone;
  - view the email log, where failed emails can be retried.

  Without an email provider configured, emails are logged but **not** sent. A banner says so.
- **Support Messages**: reply to customers and employees; mark threads resolved or closed.
- **Email Templates**: edit the wording of every transactional email, with a live preview. **Restore default** undoes your changes.

## Content, reports and settings

- **Service Management**: create, edit, archive or restore services. You can set categories, visit lengths, images and optional prices. Changes appear on the public Services pages.
- **Website Content**: a site-wide announcement banner, the FAQs and the homepage testimonials. Only publish real testimonials you have permission to use.
- **Reports & Analytics**: bookings, people and recruitment figures for any date range, plus CSV exports. Exports contain personal data and are audit-logged.
- **Settings**: booking hours, notice period, booking window, limits and time zone.
- **Admin Users** (Super Admin): invite staff by email, change roles, suspend access.
- **Roles & Permissions** (Super Admin): create roles such as "Scheduler" and tick exactly what each role can do.
- **Audit Logs**: who did what, and when, including sign-ins, lockouts, exports and permission changes.

## Creating the first Super Admin

There is no default admin. On a computer with the production `DATABASE_URL`:

```
npm run admin:create -- --email owner@yourdomain.com --first Jane --last Doe
```

Open the printed link within 72 hours to set the password. Invite everyone else from **Admin Users**.
