Write the GitHub issue for this feature request and save it as `issue.md`.

Finance users of our invoicing app need to export invoices to CSV. Today they
copy rows from the invoice list by hand. The export should include the invoice
number, customer name, issue date, due date, amount, currency, and status. It
should respect the filters applied to the invoice list. An export over 10,000
rows should arrive as an emailed download link instead of a direct download.
Dates use ISO 8601. Only users with the Billing Admin role can export.
