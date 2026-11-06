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
ID numbers and attachments are excluded from local storage and must be re-entered
when resuming. The URL records the current step but cannot unlock later steps. Desktop step
navigation sits outside the form, at the left of the page, and stays visible while
scrolling; the form is centered independently. Programs are preloaded on the server
and cached for 30 seconds, with a browser cache fallback and background updates.
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
and admin program pages. The shared tagged cache refreshes every 30 seconds and is
invalidated when programs, cohorts, or submissions change. Admin lists keep their
current content visible while refreshing in the background or on window focus.
Portal cards show up to three per row on larger screens, with cohort/status at the
top, program name centered, and capacity/closing time below (no countdown shown).

Admin navigation highlights the current section on nested detail routes. Applicant
detail tabs and return links preserve the selected view and filtered list URL.
Education attachments have separate Preview and Download buttons. PDF, JPG and PNG
can be viewed in a modal; both operations use the existing authenticated attachment
endpoint. Preview URLs are released when closed, and file contents are never stored
in browser local storage. Unsupported formats offer download without rendering HTML.

The cohort number editor is one input displaying the full label, such as `cohort-18`.
Applicant detail sections use a shared, self-contained layout and Prisma relation
payload type; regenerate Prisma and restart the editor TypeScript server after schema
changes if it still reports an old generated model.
