# SheCanCode Application Portal

## Local development

Use Node.js 20.9 or newer and npm. Copy `.env.example` to `.env` and fill in
the required configuration for your environment.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Installation and development startup generate the Prisma client. After changing the
Prisma schema while the server is running, restart `npm run dev` so the loaded
client recognizes the new fields.

## Production

```sh
npm run build
npm start
```

Keep `package-lock.json` in sync with `package.json`. Tiptap dependencies use
version 2, and date-fns uses version 3 for compatibility with react-day-picker 8.
Install without `--force` or `--legacy-peer-deps` so npm checks compatibility.

## Application education documents

The form collects current occupation details separately from the highest completed
education level, plus an ID or refugee registration number. Education evidence is
required unless the applicant selects no formal education. Attachments support
PDF, JPG and PNG files up to 2 MB and are stored with the application in MongoDB,
rather than at a public file URL. Existing applications keep working with the
new optional database fields.

After deploying these schema changes, synchronize MongoDB's new document relation
and unique index with `npx prisma db push`, then restart the app so it uses the
regenerated Prisma client. Attachment downloads use the existing Firebase project
configuration and require a signed-in `@igirerwanda.org` administrator.

Run the focused validation, submission and download authorization checks with:

```sh
node tests/application-fields.test.cjs
```

## Four-step application flow

Applicants choose an open program, complete personal/contact details, enter their
education and background, then review and submit. Each step validates independently;
the server validates the full application and rejects closed programs. Back navigation
retains answers and the selected file. Browser drafts resume at the first unfinished step after revalidating saved answers.
ID numbers are excluded from local storage and must be re-entered when resuming.
Attachments are stored separately as binary files in IndexedDB on the same browser
and device, revalidated when restored, and deleted from the draft after successful
submission or removal. Browser storage restrictions can prevent saving; the form
shows an error if that happens. The URL records the current step but cannot unlock later steps. Desktop step
navigation sits outside the form, at the left of the page, and stays visible while
scrolling; the form is centered independently. Programs are preloaded on the server
and cached briefly, with a browser cache fallback and background updates.
Attachments use a large native file picker and are checked for size, type and file
signature before being accepted. Identity validation checks format, not registry records.

Administrators can hide a whole program or independently open/close its cohorts.
Existing courses default to visible; closing a program or cohort preserves applications.

## Cohorts, capacity and Rwanda addresses

A program contains many cohorts. In **Admin → Courses**, create a program once,
then use **Add cohort** inside that program. Each cohort has its own number
(`cohort-1`, `cohort-2`, ...), capacity, closing date/time, and open/closed state.
The same cohort number can exist in different programs, but is unique within one
program. Applicants select the program and an open cohort. Every submitted
application uses a space in that cohort, not in other cohorts of the program.

The server checks program/cohort membership, closing time and capacity in a
transaction, and locks the chosen cohort during submission. New programs do not
accept applications until they have an open cohort. Legacy programs and existing
applications are preserved; no cohort numbers are invented or backfilled for old
applications. Adding a first cohort switches that program to cohort-based intake.
Cohorts with applications can be closed but cannot be deleted or renumbered.

Apply the additive MongoDB model/index changes with `npx prisma db push` and
regenerate the client with `npx prisma generate`. Restart the development server
after generation. Admin dropdowns use the shared Select controls, and closing dates
use a calendar popover with separate 24-hour hour/minute controls in Kigali time.

The published package is `rwanda-admin@1.4.1` (the requested scoped name returned
npm 404). It supplies linked, searchable province → district → sector → cell →
village options through a server endpoint, without bundling the full dataset into
the browser. Submitted address chains are checked against that dataset. Rwanda
phone numbers normalize to +250 format; international numbers require a country
code. The final review includes all four sections and preserves punctuation in
IDs, email addresses and profile URLs.


## Admin application workspace

The applications list supports combined program, cohort, status, submission year,
and inclusive date-range filters. Dates and times use Kigali (UTC+2). Sort by newest,
oldest, applicant name, cohort number, program, or status. Cohort numbers sort
naturally (`cohort-2` before `cohort-10`), and missing cohort data is labeled
“Data not available.” Pagination offers 10, 25, 50, or 100 records per page; the URL
preserves filters, sorting, page, and page size when returning from applicant details.

Analytics and Excel export use all matching records across pages. Analytics show
status distribution, program/cohort counts, and 12 calendar months ending with the
latest matching submission, including months with zero applications. The header
checkbox selects the current page. Selections can span pages, are explicitly labeled,
and clear when filters change.

The course manager supports search, availability filters, sorting, and pagination.
New or reopened open cohorts require a future closing deadline in Kigali time.
Program details are independent of cohort settings. Cohort edits can retain an
unchanged expired deadline. Editing an expired deadline does not reopen it; the application
server continues enforcing its actual closing time. Validation appears inline before
saving, and server validation remains authoritative.


## Prefetching, navigation and document previews

The homepage prefetches the application route, and admin navigation prefetches its
linked pages. Programs and cohorts are included in the server-rendered application
and admin program pages. The initial server-rendered data uses a five-second tagged cache. Live API requests
bypass that cache and browser/CDN caches, so database edits appear without a
redeployment. Visible pages poll every five seconds and refresh on focus. Admin lists keep their
current content visible while refreshing in the background or on window focus.
Portal cards show up to three per row on larger screens, with cohort/status at the
top, program name centered, and capacity/closing time below (no countdown shown).

Admin navigation highlights the current section on nested detail routes. Applicant
detail tabs and return links preserve the selected view and filtered list URL.
Education attachments have separate Preview and Download buttons. PDF, JPG and PNG
can be viewed in a modal; both operations use the existing authenticated attachment
endpoint. Preview URLs are released when closed, and preview URLs are not stored in browser local storage. Draft attachments use
IndexedDB separately and are only uploaded on submission. Unsupported formats offer download without rendering HTML.

The cohort number editor is one input displaying the full label, such as `cohort-18`.
Applicant detail sections use a shared, self-contained layout and Prisma relation
payload type; regenerate Prisma and restart the editor TypeScript server after schema
changes if it still reports an old generated model.


The admin program manager has an **Open cohorts only** focus toggle that hides
closed, expired, full cohorts and hidden programs. Edit/delete actions remain visible;
cohorts containing applications must be closed instead of deleted. **Hide details**
on the application list/detail screen masks values on screen; exported files are
unchanged. Masking is a presentation control for authorized admins, not access control.

Database content updates propagate through the runtime API within roughly five
seconds while the page is visible. Frontend code/design changes still require a
normal deployment. The deployment must run Next.js server/API routes rather than a
static HTML export, and connect to the intended MongoDB database.

### Application workspace updates

- Applications has an **Open cohorts** focus toggle. It limits the table, analytics and export to cohorts that are open, not full and not past their deadline; the filter stays in the URL.
- Applicant answers can be edited from the detail page. The authenticated endpoint validates only changed answers, normalizes email/phone/ID formats and rejects stale saves. Program/cohort assignments, attachments and review decisions remain separate.
- Public program cards show a static cohort label, program, status and closing date; closed/full cohorts are excluded. Family/equipment questions use standard native checkboxes with linked labels.
- Applications refresh quietly in the background. Detail views refresh while reading, pausing while editing or reviewing so typed changes are retained.
- Submission-trend bars explain their month/count on hover or keyboard focus. Email and telephone values open mail/call handlers. Bulk updates explain when every selected record already has the chosen status.

### Secure website entry

The application form and submission API now require a one-time encrypted website entry link, redeemed into a 24-hour private browser session. Verified source domain/page/time are saved with each application and shown in admin records and analytics. See [integration setup and rollout](integrations/APPLICATION-ENTRY.md) for the required environment variables, the two connected website repositories, production rollout and `/entry/development` testing. Do not deploy the gate without configuring the website endpoints and matching server-only secrets.
