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