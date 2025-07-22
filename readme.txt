Monday Jun 30, 2025
1) This is my first app built with a modern tech stack so let's document it all here... after my first VSCode commit to git, that is!

Tuesday Jul 1, 2025
1) Lots of progress here... got python installed correctly in the virtual environment, set up the database, extracted environment variables into a .env file and confirmed the db is working.
2) And one more commit to include the fixes to the database schema and show write and read API endpoints.
3) Afternoon commit to include progress related to including Clerk... got the login loop, still need to add the webhook to create a user record in my own database

Wednesday Jul 2, 2025
1) Early morning commit to remove faulty webhook work and start fresh
2) Added React Router and some nicer looking Clerk components
3) Spent some time working on the routing logic... still not done but better
4) Finalized the routing for Clerk signup, signin and userpreferences
5) Completed webhook setup via SVIX, updated Clerk logic and made successful new user account round trip

Thursday Jul 3, 2025
1) Implemented soft delete of user accounts and tested updates to user data
2) Secured API endpoints with JWT bearer tokens

Friday Jul 4, 2025
1) Added new data types for scripts, elements, departments, etc, created guest access token interface to retrieve calls and updated show primary key to use UUIDs and 

Saturday Jul 5, 2025
1) Thinking about user journeys and fleshing out the main dashboard functionality

Sunday Jul 6, 2025
1) Implemented Chakra UI components, styled dashboard elements and added "dark mode" with system level config support

Monday Jul 7, 2025
1) Created UI for creating and selecting shows, showing show details and scripts
2) Added modal for creating scripts, sorting and highlighting logic, moved scripts inside of the show card
3) A few more formatting fixes, added some placeholders for the quickstart menu
4) A bit of visual fix to prevent elements from moving around

Tueday Jul 8, 2025
1) Extracted state of dashboard into separate file, extracted show & script card functions into separate file
2) Fixed some issues with passing variables between dashboard and show card files
3) Added hamburger and popout menu to display right side panel on mobile devices

Wednesday Jul 9, 2025
1) Added side panel buttons and extracted views for each data type into separate pages, added proper scrolling and boundary management for cards in the main window, added auto-creation of script file when show is created
2) Added some icons to the quick access menu and screen title areas
3) Extracted menu imports into separate file to be more DRY

Thursday Jul 10, 2025
1) Fixed issue with left side panel rendering and scrolling on mobile devices

Friday Jul 11, 2025
1) Added button for editing the show
2) Fixed the formatting of the show edit page and activated the return button
3) Added stub of edit show page

Wednesday Jul 16, 2025
1) Substantial code review and component architecture revisions - reusable patterns, proper state management, clean separation of concerns... plus more consistent styling
2) Major refactor: distributed sorting, self-contained views and completed CRUD for venues/departments/crew

Thursday Jul 17, 2025
1) Major refactoring to extract modal functionality, complete all creation endpoints and create a form hook to facilitate creation of forms
2) Updated all table IDs to UUID for security, general UI/UX cleanup

Saturday Jul 18, 2025
1) Completed edit pages, major refactor to state management to preserve open cards across edits
2) General UI/UX improvements to cards and edit pages for consistency and readability, updates to data types and improved code quality
3) Indented detail text on cards
4) Cleaned up comments and console logs in preparation for next dev push

Sunday Jul 19, 2025
1) Code review and cleanup, fixed error handling, hook callback usage, dependency management, toast styling and others. Began conversion to TypeScript
2) Completed typescript conversion of all files

Monday Jul 20, 2025
1) Completed delete functionality for all elements, including two stage deletion for show and crew, plus major revisions to modals and edit pages
2) Refactored sort controls and general visual improvements
3) Cleanup of scrolling on edit pages and minor UI fixes
4) General UI/UX cleanup, pruned unused endpoints
5) Major update... enhanced error handling system, added centralized smart form validation, enhanced and unified modals, added initial help page and improved navigation state persistence

Tuesday Jul 22, 2025
1) Separated test tools from future tutorial content, fixed duplicate state restoration code in QuickAccess navigation, added form validation to edit pages, fixed useValidatedForm hook for consistenty
