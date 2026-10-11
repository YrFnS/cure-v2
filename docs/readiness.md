# Demo routing readiness

Scope: removing the patient web test build on 2026-10-11. Patients use the mobile app;
the web serves the login-free PDF upload page. This is not a full production audit.

- **Endpoint reachability — done:** the live HTTPS root redirects to `/lab/`, preserving
  query parameters. `/lab/` returns 200; missing or invalid link codes cannot authorize an
  upload. `/api/users/me` still returns 401 without a session, and malformed login requests
  still return 401. API authentication remains required for mobile patients.
- **Release verification — done:** nginx configuration validated before a graceful reload;
  `/login`, `/index.html`, and a previously served patient JavaScript bundle return 404.
  Lab page and API response hashes match their pre-change values. Other named HTTPS
  virtual hosts retain their pre-change status codes.
- **Rollback — available:** the vhost is backed up in `/etc/nginx/sites-available/` and
  the exported web build is retired outside the app checkout. Restore the saved vhost and
  build, validate nginx, then reload if the routing change must be reversed.
- **PDF upload and mobile device flow — not retested:** this change only alters nginx
  routing; it does not change backend or mobile code.
