--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: alex
--

INSERT INTO public.alembic_version VALUES ('rename_script_element_fields');


--
-- Data for Name: userTable; Type: TABLE DATA; Schema: public; Owner: alex
--

INSERT INTO public."userTable" VALUES ('468444b9-143a-4409-b8b1-41cc728273af', NULL, 'bob@dobbs.com', 'Robert', 'Dobbs', NULL, NULL, '(555) 123-4567', 'GUEST', 'crew', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', NULL, NULL, NULL, NULL, 6, true, '2025-08-03 07:45:37.32541+00', '2025-08-04 22:34:42.197909+00');
INSERT INTO public."userTable" VALUES ('ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'user_30lXl3HfZsIiEKfqnVF3OjQPvs7', 'dataless@me.com', 'Alex', 'Martin', 'alex', 'https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18yeXNqTTZ3TUVCWTQzdWlibVY0dDQzcllaSE8iLCJyaWQiOiJ1c2VyXzMwbFhsM0hmWnNJaUVLZnFuVkYzT2pRUHZzNyIsImluaXRpYWxzIjoiQU0ifQ', '702-580-0808', 'VERIFIED', 'technical_director', NULL, NULL, NULL, 'Alex is a cool guy who knows a lot of stuff.', NULL, 15, true, '2025-08-03 02:16:08.344972+00', '2025-08-11 23:53:31.274896+00');
INSERT INTO public."userTable" VALUES ('aac2d7a2-a776-4409-8c83-7680c569f3de', NULL, 'susan@persons.com', 'Susan', 'Persons', NULL, NULL, '(555) 123-4567', 'GUEST', 'sound_designer', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', NULL, NULL, NULL, NULL, 6, true, '2025-08-08 04:04:59.960514+00', '2025-08-08 04:06:57.664404+00');
INSERT INTO public."userTable" VALUES ('79951b8a-efdc-4f59-a07a-ca579ac38c8d', NULL, 'dave@thomas.com', 'Dave', 'Thomas', NULL, NULL, '(555) 123-4567', 'GUEST', 'stage_manager', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', NULL, NULL, NULL, NULL, 6, true, '2025-08-08 04:05:40.957532+00', '2025-08-08 04:07:13.30226+00');


--
-- Data for Name: departmentsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

INSERT INTO public."departmentsTable" VALUES ('edcdb29a-c6dd-4100-bf96-1b6fdbee36cb', 'Fly', 'Curtains and flying scenic elements', '#6495ED', 'FL', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-03 07:08:35.331576+00', '2025-08-03 07:08:35.331576+00');
INSERT INTO public."departmentsTable" VALUES ('51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e', 'Lighting', 'Stage and house lighting elements', '#e79e40', 'LX', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-03 07:44:31.898153+00', '2025-08-03 07:44:31.898153+00');
INSERT INTO public."departmentsTable" VALUES ('6f282b98-579b-47e1-8618-e8f2f2b122bb', 'Audio', 'Stage sound and recording', '#48BB78', 'AU', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-03 07:45:07.110369+00', '2025-08-03 07:45:07.110369+00');
INSERT INTO public."departmentsTable" VALUES ('a2731b2a-9fb1-43be-8c4f-c15bdaf7b397', 'Graphics', 'Video and teleprompter control', '#F56565', 'GR', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-07 07:31:19.475591+00', '2025-08-07 07:31:19.475591+00');
INSERT INTO public."departmentsTable" VALUES ('aab3dd0c-23ae-41da-9157-5aafc4031ecc', 'Projection', 'Video walls and projectors', '#9F7AEA', 'PR', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-07 07:31:50.008483+00', '2025-08-07 07:31:50.008483+00');
INSERT INTO public."departmentsTable" VALUES ('14d3d7b3-5c03-4db8-9c1f-c860a52d296a', 'Stage', 'Stage and talent management', '#38B2AC', 'ST', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-07 07:33:01.828059+00', '2025-08-07 07:33:01.828059+00');
INSERT INTO public."departmentsTable" VALUES ('986c81fb-0e59-49e5-ac59-884ce977550f', 'Talent', 'Talent on and off-stage', '#ED64A6', 'TA', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-07 07:33:19.858646+00', '2025-08-07 07:33:19.858646+00');
INSERT INTO public."departmentsTable" VALUES ('13849990-4301-432e-9df6-f81950ebd024', 'Props', 'Property and stage element handling', '#ECC94B', 'PR', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-07 07:35:19.085323+00', '2025-08-07 07:35:19.085323+00');


--
-- Data for Name: venuesTable; Type: TABLE DATA; Schema: public; Owner: alex
--

INSERT INTO public."venuesTable" VALUES ('c0adee02-3254-42d9-8bb0-ac43112bc31a', 'McCaw Hall', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '321 Mercer St.', 'Seattle', 'WA', 2800, 'Proscenium', 'Michelle Murata', 'test@test.com', '(555) 123-4567', 60, 60, 60, 'null', 'McCaw Hall is a beautiful facility', 4000, 8000, '2025-08-03 07:01:23.332743+00', '2025-08-07 22:04:49.917237+00');


--
-- Data for Name: showsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

INSERT INTO public."showsTable" VALUES ('7de2d04e-d65a-4a4b-8315-d1ba5719205d', 'The Universe is Absurd!', '2025-08-09 00:30:00+00', '2025-08-09 03:00:00+00', 'Featuring Bill and Neil!', '2025-08-07 17:15:00+00', 'c0adee02-3254-42d9-8bb0-ac43112bc31a', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-03 07:01:23.346535+00', '2025-08-08 08:10:14.783649+00');


--
-- Data for Name: crewAssignmentsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

INSERT INTO public."crewAssignmentsTable" VALUES ('ca088c69-3961-43fb-ab9a-134ea8906bb5', '7de2d04e-d65a-4a4b-8315-d1ba5719205d', '468444b9-143a-4409-b8b1-41cc728273af', 'edcdb29a-c6dd-4100-bf96-1b6fdbee36cb', 'crew', true, '2025-08-08 08:10:14.812138+00');
INSERT INTO public."crewAssignmentsTable" VALUES ('0fe82b50-51c1-41e7-89c1-1d6a790f071c', '7de2d04e-d65a-4a4b-8315-d1ba5719205d', 'aac2d7a2-a776-4409-8c83-7680c569f3de', '6f282b98-579b-47e1-8618-e8f2f2b122bb', 'sound_designer', true, '2025-08-08 08:10:14.812138+00');


--
-- Data for Name: crewRelationshipsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

INSERT INTO public."crewRelationshipsTable" VALUES ('bd72ab01-f31e-43a2-a6b4-e0b6e28c669e', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '468444b9-143a-4409-b8b1-41cc728273af', true, 'Bob is just doing Bob things.', '2025-08-03 07:45:37.32541+00', '2025-08-03 07:58:06.239272+00');
INSERT INTO public."crewRelationshipsTable" VALUES ('156568cc-ca23-49f5-87e0-5e69fb23f6de', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'aac2d7a2-a776-4409-8c83-7680c569f3de', true, 'Susan represents every woman.', '2025-08-08 04:04:59.960514+00', '2025-08-08 04:06:57.66022+00');
INSERT INTO public."crewRelationshipsTable" VALUES ('7820043e-060e-46fd-8649-b2624de5a750', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '79951b8a-efdc-4f59-a07a-ca579ac38c8d', true, 'Dave has a lot of skills but even more cats.', '2025-08-08 04:05:40.957532+00', '2025-08-08 04:07:13.29804+00');


--
-- Data for Name: scriptsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

INSERT INTO public."scriptsTable" VALUES ('fea421cf-3f3a-48e6-9a0d-a25140218abe', 'Test Script', 'This is our test script', 'DRAFT', '2025-08-09 00:30:00+00', '2025-08-09 03:00:00+00', NULL, '7de2d04e-d65a-4a4b-8315-d1ba5719205d', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-09 02:39:44.534141+00', '2025-08-11 23:55:32.830065+00', true);
INSERT INTO public."scriptsTable" VALUES ('1bb499e2-792c-4643-be5f-50f5f46ca4ab', 'Seattle Run Script', 'This is our running script.', 'BACKUP', '2025-08-09 00:30:00+00', '2025-08-09 03:00:00+00', NULL, '7de2d04e-d65a-4a4b-8315-d1ba5719205d', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', '2025-08-11 21:51:59.643288+00', '2025-08-12 00:14:04.271616+00', true);


--
-- Data for Name: scriptElementsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

INSERT INTO public."scriptElementsTable" VALUES ('3ef5ea92-fe5e-4daf-9fed-3d71571ff107', '1bb499e2-792c-4643-be5f-50f5f46ca4ab', '6f282b98-579b-47e1-8618-e8f2f2b122bb', NULL, 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', NULL, 'CUE', 5, 'Cue 03', '', 'NORMAL', 90000, NULL, NULL, '', 0, false, '2025-08-11 21:51:59.654369+00', '2025-08-11 21:51:59.654369+00');
INSERT INTO public."scriptElementsTable" VALUES ('10e1eee0-7fca-40f6-bb54-de97075c0ab6', '1bb499e2-792c-4643-be5f-50f5f46ca4ab', NULL, NULL, 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', NULL, 'NOTE', 1, 'SHOW START', NULL, 'CRITICAL', 0, 9000000, NULL, '#EF4444', 0, false, '2025-08-11 21:51:59.65809+00', '2025-08-11 21:51:59.65809+00');
INSERT INTO public."scriptElementsTable" VALUES ('657195dc-bb87-4cbe-89f9-8df57f045987', '1bb499e2-792c-4643-be5f-50f5f46ca4ab', '51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e', NULL, 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', NULL, 'CUE', 4, 'House lights down', '', 'NORMAL', 30000, NULL, NULL, '', 0, false, '2025-08-11 21:51:59.662677+00', '2025-08-11 21:51:59.662677+00');
INSERT INTO public."scriptElementsTable" VALUES ('9501fba1-0d1f-4df5-8629-bf2a649fd46b', '1bb499e2-792c-4643-be5f-50f5f46ca4ab', NULL, NULL, 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'GROUP', 7, 'Cue Group', '', 'NORMAL', 10000, NULL, NULL, '#3B82F6', 0, true, '2025-08-11 21:51:59.649706+00', '2025-08-12 00:16:27.013595+00');
INSERT INTO public."scriptElementsTable" VALUES ('e486ee74-8cdc-4a88-8586-49067bbd217a', '1bb499e2-792c-4643-be5f-50f5f46ca4ab', '51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e', '9501fba1-0d1f-4df5-8629-bf2a649fd46b', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', NULL, 'CUE', 2, 'Cue 01', '', 'NORMAL', 10000, NULL, NULL, '', 1, false, '2025-08-11 21:51:59.667509+00', '2025-08-11 21:51:59.673684+00');
INSERT INTO public."scriptElementsTable" VALUES ('a55c0f01-e09c-401b-bbe8-9e57956fdead', '1bb499e2-792c-4643-be5f-50f5f46ca4ab', '51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e', '9501fba1-0d1f-4df5-8629-bf2a649fd46b', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', NULL, 'CUE', 3, 'Cue 02', '', 'NORMAL', 20000, NULL, NULL, '', 1, false, '2025-08-11 21:51:59.671298+00', '2025-08-11 21:51:59.673684+00');
INSERT INTO public."scriptElementsTable" VALUES ('144db5c9-c1fc-41b1-940b-3d22fc65becc', 'fea421cf-3f3a-48e6-9a0d-a25140218abe', 'edcdb29a-c6dd-4100-bf96-1b6fdbee36cb', NULL, 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'CUE', 5, 'Curtain Up', '', 'NORMAL', 120000, NULL, NULL, '', 0, false, '2025-08-11 21:52:09.270865+00', '2025-08-11 23:55:32.828616+00');
INSERT INTO public."scriptElementsTable" VALUES ('30657e61-e7eb-429c-82ea-93995012555c', 'fea421cf-3f3a-48e6-9a0d-a25140218abe', '6f282b98-579b-47e1-8618-e8f2f2b122bb', NULL, 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'CUE', 8, 'Cue 03', '', 'NORMAL', 90000, NULL, NULL, '', 0, false, '2025-08-09 02:56:03.539351+00', '2025-08-11 23:55:32.828622+00');
INSERT INTO public."scriptElementsTable" VALUES ('4c4d496b-e5a4-40a4-9fe0-84b68a05a731', 'fea421cf-3f3a-48e6-9a0d-a25140218abe', NULL, NULL, 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'NOTE', 7, 'Disable Elevator Power', '', 'SAFETY', -1800000, NULL, NULL, '#EAB308', 0, false, '2025-08-11 21:52:09.26553+00', '2025-08-11 23:55:32.828619+00');
INSERT INTO public."scriptElementsTable" VALUES ('6fc8a04b-b605-4e2e-b446-4508bbf0eea8', 'fea421cf-3f3a-48e6-9a0d-a25140218abe', NULL, NULL, 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'NOTE', 1, 'SHOW START', NULL, 'CRITICAL', 0, 9000000, NULL, '#EF4444', 0, false, '2025-08-09 02:39:44.540687+00', '2025-08-11 23:55:32.828602+00');
INSERT INTO public."scriptElementsTable" VALUES ('a0d74309-5c09-41be-9f06-da4ac3c56a5b', 'fea421cf-3f3a-48e6-9a0d-a25140218abe', '51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e', NULL, 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'CUE', 4, 'House lights down', '', 'NORMAL', 30000, NULL, NULL, '', 0, false, '2025-08-09 21:03:01.113873+00', '2025-08-11 23:55:32.828613+00');
INSERT INTO public."scriptElementsTable" VALUES ('ca61de01-6828-455d-ab6b-2d70889c210f', 'fea421cf-3f3a-48e6-9a0d-a25140218abe', NULL, NULL, 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'GROUP', 6, 'Cue Group', '', 'NORMAL', 10000, NULL, NULL, '#3B82F6', 0, false, '2025-08-11 23:53:04.774119+00', '2025-08-11 23:55:32.829255+00');
INSERT INTO public."scriptElementsTable" VALUES ('cbd72156-6c91-4a4f-b665-2acf06f3f0a9', 'fea421cf-3f3a-48e6-9a0d-a25140218abe', '51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e', 'ca61de01-6828-455d-ab6b-2d70889c210f', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'CUE', 2, 'Cue 01', '', 'NORMAL', 10000, NULL, NULL, '', 1, false, '2025-08-09 02:40:42.389021+00', '2025-08-11 23:55:32.828609+00');
INSERT INTO public."scriptElementsTable" VALUES ('df2c9e99-69d6-47c6-bb6c-ddcb28cb8b7c', 'fea421cf-3f3a-48e6-9a0d-a25140218abe', '51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e', 'ca61de01-6828-455d-ab6b-2d70889c210f', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'ed19ca5c-edf3-4c9b-8092-6843e315e0e0', 'CUE', 3, 'Cue 02', '', 'NORMAL', 20000, NULL, NULL, '', 1, false, '2025-08-09 02:40:42.392029+00', '2025-08-11 23:55:32.828611+00');


--
-- Data for Name: script_shares; Type: TABLE DATA; Schema: public; Owner: alex
--



--
-- PostgreSQL database dump complete
--

