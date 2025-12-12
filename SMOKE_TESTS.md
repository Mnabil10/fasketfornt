# Admin Web Smoke Tests

1) **Auth**
   - Visit `/signin`, login with valid admin credentials.
   - Click avatar → Logout; verify redirected to `/signin` and tokens cleared (localStorage keys removed).
   - Trigger invalid login; ensure inline error appears, no redirect.
2) **Orders**
   - Go to **Orders**; search by customer/phone/code; results update.
   - Open an order; ensure status select disables disallowed transitions and history timeline renders.
   - Assign driver; verify driver info updates and list refreshes.
   - Cancel order; status becomes CANCELED and actions are disabled.
   - Validate “Stuck > 30m” filter highlights long-running orders.
   - Receipt inline shows items, discounts, delivery fee, totals in correct currency.
3) **Automation Outbox**
   - Navigate to `/automation/outbox`; confirm counters show.
   - Filter by status/type; list updates.
   - Replay single FAILED event (confirm modal); toast shows success.
   - Replay bulk FAILED/DEAD; request sent and list invalidated.
4) **Profit Reports**
   - Navigate to `/reports/profit`; set presets Today/7d/MTD.
   - Verify KPI cards and trend chart render; missing cost warning appears when provided by backend.
   - Export CSV/XLSX triggers file download.
5) **Support Queries**
   - Open `/support/queries`; search by phone/order code.
   - Click an order code → opens that order detail view.
   - Phones are masked for non-PII roles (if applicable).
6) **Dashboard**
   - Quick order lookup in header: enter code/phone, press Enter → navigates to order detail.
   - Notifications/menus respect role (automation/profit/support hidden for unauthorized).
7) **Error/Empty States**
   - Disconnect network or force 500 via devtools; ensure ErrorState appears with retry across lists.
   - Empty list pages show empty state copy (orders, automation, support).
