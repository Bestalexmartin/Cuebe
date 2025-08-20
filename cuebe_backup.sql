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
-- Name: conditiontype; Type: TYPE; Schema: public; Owner: alex
--

CREATE TYPE public.conditiontype AS ENUM (
    'WEATHER',
    'CAST',
    'EQUIPMENT',
    'TIME',
    'CUSTOM'
);


ALTER TYPE public.conditiontype OWNER TO alex;

--
-- Name: elementtype; Type: TYPE; Schema: public; Owner: alex
--

CREATE TYPE public.elementtype AS ENUM (
    'CUE',
    'NOTE',
    'GROUP'
);


ALTER TYPE public.elementtype OWNER TO alex;

--
-- Name: executionstatus; Type: TYPE; Schema: public; Owner: alex
--

CREATE TYPE public.executionstatus AS ENUM (
    'PENDING',
    'READY',
    'EXECUTING',
    'COMPLETED',
    'SKIPPED',
    'FAILED'
);


ALTER TYPE public.executionstatus OWNER TO alex;

--
-- Name: locationarea; Type: TYPE; Schema: public; Owner: alex
--

CREATE TYPE public.locationarea AS ENUM (
    'STAGE_LEFT',
    'STAGE_RIGHT',
    'CENTER_STAGE',
    'UPSTAGE',
    'DOWNSTAGE',
    'STAGE_LEFT_UP',
    'STAGE_RIGHT_UP',
    'STAGE_LEFT_DOWN',
    'STAGE_RIGHT_DOWN',
    'FLY_GALLERY',
    'BOOTH',
    'HOUSE',
    'BACKSTAGE',
    'WINGS_LEFT',
    'WINGS_RIGHT',
    'GRID',
    'TRAP',
    'PIT',
    'LOBBY',
    'DRESSING_ROOM',
    'OTHER'
);


ALTER TYPE public.locationarea OWNER TO alex;

--
-- Name: operatortype; Type: TYPE; Schema: public; Owner: alex
--

CREATE TYPE public.operatortype AS ENUM (
    'EQUALS',
    'NOT_EQUALS',
    'CONTAINS',
    'GREATER_THAN',
    'LESS_THAN'
);


ALTER TYPE public.operatortype OWNER TO alex;

--
-- Name: prioritylevel; Type: TYPE; Schema: public; Owner: alex
--

CREATE TYPE public.prioritylevel AS ENUM (
    'SAFETY',
    'CRITICAL',
    'HIGH',
    'NORMAL',
    'LOW',
    'OPTIONAL'
);


ALTER TYPE public.prioritylevel OWNER TO alex;

--
-- Name: scriptstatus; Type: TYPE; Schema: public; Owner: alex
--

CREATE TYPE public.scriptstatus AS ENUM (
    'DRAFT',
    'COPY',
    'WORKING',
    'FINAL',
    'BACKUP'
);


ALTER TYPE public.scriptstatus OWNER TO alex;

--
-- Name: triggertype; Type: TYPE; Schema: public; Owner: alex
--

CREATE TYPE public.triggertype AS ENUM (
    'MANUAL',
    'TIME',
    'AUTO',
    'FOLLOW',
    'GO',
    'STANDBY'
);


ALTER TYPE public.triggertype OWNER TO alex;

--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: alex
--

CREATE TYPE public.user_role_enum AS ENUM (
    'CREW',
    'ASSISTANT_DIRECTOR',
    'STAGE_MANAGER',
    'ASSISTANT_STAGE_MANAGER',
    'TECHNICAL_DIRECTOR',
    'LIGHTING_DESIGNER',
    'SOUND_DESIGNER',
    'PROPS_MASTER',
    'ELECTRICIAN',
    'SOUND_TECHNICIAN',
    'PROJECTIONIST',
    'RECORDIST',
    'LEAD_AUDIO',
    'LEAD_VIDEO',
    'GRAPHICS',
    'FLY_OPERATOR',
    'CARPENTER',
    'PRODUCER',
    'DIRECTOR',
    'OTHER'
);


ALTER TYPE public.user_role_enum OWNER TO alex;

--
-- Name: userstatus; Type: TYPE; Schema: public; Owner: alex
--

CREATE TYPE public.userstatus AS ENUM (
    'GUEST',
    'VERIFIED'
);


ALTER TYPE public.userstatus OWNER TO alex;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO alex;

--
-- Name: crewAssignmentsTable; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public."crewAssignmentsTable" (
    assignment_id uuid NOT NULL,
    show_id uuid NOT NULL,
    user_id uuid NOT NULL,
    department_id uuid NOT NULL,
    show_role character varying,
    is_active boolean NOT NULL,
    date_assigned timestamp with time zone DEFAULT now(),
    share_token character varying(255),
    access_count integer DEFAULT 0 NOT NULL,
    last_accessed_at timestamp with time zone
);


ALTER TABLE public."crewAssignmentsTable" OWNER TO alex;

--
-- Name: crewRelationshipsTable; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public."crewRelationshipsTable" (
    relationship_id uuid NOT NULL,
    manager_user_id uuid NOT NULL,
    crew_user_id uuid NOT NULL,
    is_active boolean NOT NULL,
    notes text,
    date_created timestamp with time zone DEFAULT now(),
    date_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public."crewRelationshipsTable" OWNER TO alex;

--
-- Name: departmentsTable; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public."departmentsTable" (
    department_id uuid NOT NULL,
    department_name character varying NOT NULL,
    department_description character varying,
    department_color character varying,
    department_initials character varying(5),
    owner_id uuid NOT NULL,
    date_created timestamp with time zone DEFAULT now(),
    date_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public."departmentsTable" OWNER TO alex;

--
-- Name: scriptElementsTable; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public."scriptElementsTable" (
    element_id uuid NOT NULL,
    script_id uuid NOT NULL,
    department_id uuid,
    parent_element_id uuid,
    created_by uuid,
    updated_by uuid,
    element_type public.elementtype NOT NULL,
    sequence integer,
    element_name text DEFAULT ''::text NOT NULL,
    cue_notes text,
    priority public.prioritylevel DEFAULT 'NORMAL'::public.prioritylevel NOT NULL,
    offset_ms integer DEFAULT 0 NOT NULL,
    duration_ms integer,
    location_details text,
    custom_color character varying(7),
    group_level integer DEFAULT 0 NOT NULL,
    is_collapsed boolean DEFAULT false NOT NULL,
    date_created timestamp with time zone DEFAULT now(),
    date_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public."scriptElementsTable" OWNER TO alex;

--
-- Name: scriptsTable; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public."scriptsTable" (
    script_id uuid NOT NULL,
    script_name character varying NOT NULL,
    script_notes text,
    script_status public.scriptstatus NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    actual_start_time timestamp with time zone,
    show_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    date_created timestamp with time zone DEFAULT now(),
    date_updated timestamp with time zone DEFAULT now(),
    is_shared boolean DEFAULT false NOT NULL
);


ALTER TABLE public."scriptsTable" OWNER TO alex;

--
-- Name: showsTable; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public."showsTable" (
    show_id uuid NOT NULL,
    show_name character varying NOT NULL,
    show_date timestamp with time zone,
    show_end timestamp with time zone,
    show_notes text,
    deadline timestamp with time zone,
    venue_id uuid,
    owner_id uuid NOT NULL,
    date_created timestamp with time zone DEFAULT now(),
    date_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public."showsTable" OWNER TO alex;

--
-- Name: userTable; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public."userTable" (
    user_id uuid NOT NULL,
    clerk_user_id character varying,
    email_address character varying NOT NULL,
    fullname_first character varying NOT NULL,
    fullname_last character varying NOT NULL,
    user_name character varying,
    profile_img_url character varying,
    phone_number character varying,
    user_status public.userstatus NOT NULL,
    user_role character varying,
    created_by uuid,
    invited_at timestamp with time zone,
    invitation_token character varying,
    notes text,
    user_prefs_json json,
    user_prefs_bitmap integer,
    is_active boolean,
    date_created timestamp with time zone DEFAULT now(),
    date_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public."userTable" OWNER TO alex;

--
-- Name: venuesTable; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public."venuesTable" (
    venue_id uuid NOT NULL,
    venue_name character varying NOT NULL,
    owner_id uuid NOT NULL,
    address text,
    city character varying,
    state character varying,
    capacity integer,
    venue_type character varying,
    contact_name character varying,
    contact_email character varying,
    contact_phone character varying,
    stage_width integer,
    stage_depth integer,
    fly_height integer,
    equipment json,
    venue_notes text,
    rental_rate integer,
    minimum_rental integer,
    date_created timestamp with time zone DEFAULT now(),
    date_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public."venuesTable" OWNER TO alex;

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public.alembic_version (version_num) FROM stdin;
640cf4f85a4a
\.


--
-- Data for Name: crewAssignmentsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public."crewAssignmentsTable" (assignment_id, show_id, user_id, department_id, show_role, is_active, date_assigned, share_token, access_count, last_accessed_at) FROM stdin;
8027ec2d-e0ab-4b4f-9ae8-f47c03d9255e	7de2d04e-d65a-4a4b-8315-d1ba5719205d	468444b9-143a-4409-b8b1-41cc728273af	edcdb29a-c6dd-4100-bf96-1b6fdbee36cb	FLY_OPERATOR	t	2025-08-16 22:22:41.297608+00	ytl5lwZdzigSBgqBS5ss7rpvHqnIcZdQ	0	\N
1a478266-61ba-4615-abf7-2e3091e855b1	7de2d04e-d65a-4a4b-8315-d1ba5719205d	79951b8a-efdc-4f59-a07a-ca579ac38c8d	51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	LIGHTING_DESIGNER	t	2025-08-16 22:22:41.297608+00	hpxPADTq117pZfRFkNKwOCvvwKgQuStx	0	\N
fbe5a2d1-6332-411e-828a-e9376f030834	7de2d04e-d65a-4a4b-8315-d1ba5719205d	aac2d7a2-a776-4409-8c83-7680c569f3de	6f282b98-579b-47e1-8618-e8f2f2b122bb	SOUND_DESIGNER	t	2025-08-16 22:22:41.297608+00	EKtOALMBpRjJ5EPCyLEmf1pBECqyF187	0	\N
33b10f4b-3e6c-4967-9f74-95847e5e8e79	7de2d04e-d65a-4a4b-8315-d1ba5719205d	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	14d3d7b3-5c03-4db8-9c1f-c860a52d296a	STAGE_MANAGER	t	2025-08-17 03:50:28.797258+00	umCcLGRMP9y3DBiAL30O4ZRE7x9riE4H	3	2025-08-17 07:54:01.002107+00
\.


--
-- Data for Name: crewRelationshipsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public."crewRelationshipsTable" (relationship_id, manager_user_id, crew_user_id, is_active, notes, date_created, date_updated) FROM stdin;
bd72ab01-f31e-43a2-a6b4-e0b6e28c669e	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	468444b9-143a-4409-b8b1-41cc728273af	t	Bob is just doing Bob things.	2025-08-03 07:45:37.32541+00	2025-08-03 07:58:06.239272+00
156568cc-ca23-49f5-87e0-5e69fb23f6de	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	aac2d7a2-a776-4409-8c83-7680c569f3de	t	Susan represents every woman.	2025-08-08 04:04:59.960514+00	2025-08-08 04:06:57.66022+00
7820043e-060e-46fd-8649-b2624de5a750	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	79951b8a-efdc-4f59-a07a-ca579ac38c8d	t	Dave has a lot of skills but even more cats.	2025-08-08 04:05:40.957532+00	2025-08-08 04:07:13.29804+00
7bbffeac-57b9-4e5e-a3ec-670a002a8118	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	915742ae-3553-48f2-ae2b-32023068db39	t	\N	2025-08-16 17:40:24.522781+00	2025-08-16 17:40:24.522781+00
\.


--
-- Data for Name: departmentsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public."departmentsTable" (department_id, department_name, department_description, department_color, department_initials, owner_id, date_created, date_updated) FROM stdin;
edcdb29a-c6dd-4100-bf96-1b6fdbee36cb	Fly	Curtains and flying scenic elements	#6495ED	FL	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-03 07:08:35.331576+00	2025-08-03 07:08:35.331576+00
51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	Lighting	Stage and house lighting elements	#e79e40	LX	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-03 07:44:31.898153+00	2025-08-03 07:44:31.898153+00
6f282b98-579b-47e1-8618-e8f2f2b122bb	Audio	Stage sound and recording	#48BB78	AU	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-03 07:45:07.110369+00	2025-08-03 07:45:07.110369+00
a2731b2a-9fb1-43be-8c4f-c15bdaf7b397	Graphics	Video and teleprompter control	#F56565	GR	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-07 07:31:19.475591+00	2025-08-07 07:31:19.475591+00
aab3dd0c-23ae-41da-9157-5aafc4031ecc	Projection	Video walls and projectors	#9F7AEA	PR	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-07 07:31:50.008483+00	2025-08-07 07:31:50.008483+00
14d3d7b3-5c03-4db8-9c1f-c860a52d296a	Stage	Stage and talent management	#38B2AC	ST	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-07 07:33:01.828059+00	2025-08-07 07:33:01.828059+00
986c81fb-0e59-49e5-ac59-884ce977550f	Talent	Talent on and off-stage	#ED64A6	TA	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-07 07:33:19.858646+00	2025-08-07 07:33:19.858646+00
13849990-4301-432e-9df6-f81950ebd024	Props	Property and stage element handling	#ECC94B	PR	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-07 07:35:19.085323+00	2025-08-07 07:35:19.085323+00
38adee15-cda1-48c2-846c-0000125d1ae6	Sound	\N	#6B7280	SOU	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-18 16:15:19.263058+00	2025-08-18 16:15:19.263058+00
babce426-7f53-4a6a-bb1c-dea9ee298bd8	Video	\N	#6B7280	VID	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-18 16:15:19.263058+00	2025-08-18 16:15:19.263058+00
c006cf19-f6df-45bb-bb3a-92d21e629806	Properties	\N	#6B7280	PRO	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-18 16:15:19.263058+00	2025-08-18 16:15:19.263058+00
871a26ff-83e4-4d77-809c-ed52c71d5e60	Scenic	\N	#6B7280	SCE	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-18 16:15:19.263058+00	2025-08-18 16:15:19.263058+00
\.


--
-- Data for Name: scriptElementsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public."scriptElementsTable" (element_id, script_id, department_id, parent_element_id, created_by, updated_by, element_type, sequence, element_name, cue_notes, priority, offset_ms, duration_ms, location_details, custom_color, group_level, is_collapsed, date_created, date_updated) FROM stdin;
a68b645c-465f-428e-a425-ced9192cecf6	1bb499e2-792c-4643-be5f-50f5f46ca4ab	\N	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	GROUP	2	Cue Group	Three Lighting Cues 	NORMAL	600000	\N	\N	#808080	0	f	2025-08-16 06:55:24.257116+00	2025-08-20 03:43:13.316835+00
58a1d78b-1d4e-43d8-afa4-692d6b34fbe7	39a7376b-7294-49e8-a35f-9dbe905ac3b2	\N	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	GROUP	1	Cue Group	Three Lighting Cues	NORMAL	600000	\N	\N	#808080	0	f	2025-08-20 03:49:44.689073+00	2025-08-20 03:49:44.689073+00
6e079a14-c50f-476b-8f8f-a35c9016bc12	39a7376b-7294-49e8-a35f-9dbe905ac3b2	\N	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	GROUP	2	Cue Group	\N	NORMAL	600000	\N	\N	#3182CE	0	f	2025-08-20 03:49:44.689073+00	2025-08-20 03:49:44.689073+00
370dc731-d2d0-4365-ad6b-32a9a7500949	39a7376b-7294-49e8-a35f-9dbe905ac3b2	51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	6e079a14-c50f-476b-8f8f-a35c9016bc12	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	3	Cue 01	First Lighting Cue	NORMAL	600000	\N	\N	\N	1	f	2025-08-20 03:49:44.689073+00	2025-08-20 03:49:44.689073+00
bafd0ee5-43a9-4b95-96c4-04364df88a0d	39a7376b-7294-49e8-a35f-9dbe905ac3b2	\N	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	NOTE	5	Disable Power to Elevator	\N	SAFETY	0	\N	\N	#EAB308	0	f	2025-08-20 03:49:44.689073+00	2025-08-20 03:49:44.689073+00
b53c2f14-a28b-41f4-b84d-91dd092d2b23	39a7376b-7294-49e8-a35f-9dbe905ac3b2	51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	6	Cue 02	\N	NORMAL	610000	\N	\N	\N	1	f	2025-08-20 03:49:44.689073+00	2025-08-20 03:49:44.689073+00
f2bc0cc0-6226-4e83-9cbd-f151e6df8d90	39a7376b-7294-49e8-a35f-9dbe905ac3b2	6f282b98-579b-47e1-8618-e8f2f2b122bb	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	7	Music Down	\N	NORMAL	60000	\N	\N	\N	0	f	2025-08-20 03:49:44.689073+00	2025-08-20 03:49:44.689073+00
337ada42-aec3-4960-b9ba-0300f5646611	39a7376b-7294-49e8-a35f-9dbe905ac3b2	51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	8	House lights down	\N	NORMAL	620000	\N	\N	\N	1	f	2025-08-20 03:49:44.689073+00	2025-08-20 03:49:44.689073+00
306639b7-4c73-4da8-9211-9cdab3744441	39a7376b-7294-49e8-a35f-9dbe905ac3b2	6f282b98-579b-47e1-8618-e8f2f2b122bb	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	9	Cue 03	\N	NORMAL	90000	\N	\N	\N	0	f	2025-08-20 03:49:44.689073+00	2025-08-20 03:49:44.689073+00
f019ce86-b9b2-4115-afc3-b98b84401be6	39a7376b-7294-49e8-a35f-9dbe905ac3b2	\N	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	NOTE	4	SHOW START	\N	CRITICAL	0	9000000	\N	#EF4444	0	f	2025-08-20 03:49:44.689073+00	2025-08-20 03:49:44.750572+00
657195dc-bb87-4cbe-89f9-8df57f045987	1bb499e2-792c-4643-be5f-50f5f46ca4ab	51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	a68b645c-465f-428e-a425-ced9192cecf6	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	7	House lights down		NORMAL	620000	\N	\N		1	f	2025-08-11 21:51:59.662677+00	2025-08-19 06:10:35.426798+00
a55c0f01-e09c-401b-bbe8-9e57956fdead	1bb499e2-792c-4643-be5f-50f5f46ca4ab	51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	a68b645c-465f-428e-a425-ced9192cecf6	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	5	Cue 02		NORMAL	610000	\N	\N		1	f	2025-08-11 21:51:59.671298+00	2025-08-19 06:10:35.426801+00
e486ee74-8cdc-4a88-8586-49067bbd217a	1bb499e2-792c-4643-be5f-50f5f46ca4ab	51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	a68b645c-465f-428e-a425-ced9192cecf6	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	3	Cue 01	First Lighting Cue	NORMAL	600000	\N	\N		1	f	2025-08-11 21:51:59.667509+00	2025-08-19 06:19:08.019133+00
10e1eee0-7fca-40f6-bb54-de97075c0ab6	1bb499e2-792c-4643-be5f-50f5f46ca4ab	\N	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	NOTE	1	SHOW START	\N	CRITICAL	0	8400000	\N	#EF4444	0	f	2025-08-11 21:51:59.65809+00	2025-08-16 03:19:26.466055+00
3ef5ea92-fe5e-4daf-9fed-3d71571ff107	1bb499e2-792c-4643-be5f-50f5f46ca4ab	6f282b98-579b-47e1-8618-e8f2f2b122bb	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	8	Cue 03		NORMAL	90000	\N	\N		0	f	2025-08-11 21:51:59.654369+00	2025-08-16 06:55:24.257116+00
ad86aebe-28fc-40f9-82af-164dc0e33183	1bb499e2-792c-4643-be5f-50f5f46ca4ab	6f282b98-579b-47e1-8618-e8f2f2b122bb	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	6	Music Down		NORMAL	60000	\N	\N		0	f	2025-08-16 03:15:03.337535+00	2025-08-16 06:55:24.257116+00
461ce829-d7d7-47ea-a9c2-fd7436a42cd2	1bb499e2-792c-4643-be5f-50f5f46ca4ab	\N	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	NOTE	4	Disable Power to Elevator		SAFETY	0	\N	\N	#EAB308	0	f	2025-08-16 06:55:24.258353+00	2025-08-16 07:40:45.957946+00
42072cca-36df-4f87-a500-40f146a24e32	1eabbc0c-ae77-433a-82ca-1e2adaf005e9	\N	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	NOTE	2	Disable Power to Elevator	\N	SAFETY	0	\N	\N	#EAB308	0	f	2025-08-20 04:10:57.669173+00	2025-08-20 04:10:57.669173+00
c0badeb0-b57f-4b2e-80c4-3439e448a361	1eabbc0c-ae77-433a-82ca-1e2adaf005e9	6f282b98-579b-47e1-8618-e8f2f2b122bb	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	3	Music Down	\N	NORMAL	60000	\N	\N	\N	0	f	2025-08-20 04:10:57.669173+00	2025-08-20 04:10:57.669173+00
7b34e72b-d73e-4754-a76d-d535bda23eca	1eabbc0c-ae77-433a-82ca-1e2adaf005e9	6f282b98-579b-47e1-8618-e8f2f2b122bb	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	4	Cue 03	\N	NORMAL	90000	\N	\N	\N	0	f	2025-08-20 04:10:57.669173+00	2025-08-20 04:10:57.669173+00
95b3cc77-aea7-40be-a691-a7d59cbb6ef5	1eabbc0c-ae77-433a-82ca-1e2adaf005e9	\N	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	GROUP	5	Cue Group	Three Lighting Cues	NORMAL	600000	\N	\N	#808080	0	f	2025-08-20 04:10:57.669173+00	2025-08-20 04:10:57.669173+00
440ab6dc-64da-4f40-8ce3-c52d35de5204	1eabbc0c-ae77-433a-82ca-1e2adaf005e9	51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	95b3cc77-aea7-40be-a691-a7d59cbb6ef5	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	6	Cue 01	First Lighting Cue	NORMAL	600000	\N	\N	\N	1	f	2025-08-20 04:10:57.669173+00	2025-08-20 04:10:57.669173+00
dd0b8493-5151-406c-a54f-73dc3d6dc57c	1eabbc0c-ae77-433a-82ca-1e2adaf005e9	51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	95b3cc77-aea7-40be-a691-a7d59cbb6ef5	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	7	Cue 02	\N	NORMAL	610000	\N	\N	\N	1	f	2025-08-20 04:10:57.669173+00	2025-08-20 04:10:57.669173+00
ece471cb-49bc-48dc-9e1d-b26fef762af7	1eabbc0c-ae77-433a-82ca-1e2adaf005e9	51f3f3b2-e7c1-44bf-bb9b-82acbb50f69e	95b3cc77-aea7-40be-a691-a7d59cbb6ef5	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	CUE	8	House lights down	\N	NORMAL	620000	\N	\N	\N	1	f	2025-08-20 04:10:57.669173+00	2025-08-20 04:10:57.669173+00
d936ff50-cf2b-436c-8629-3bd6bc163725	1eabbc0c-ae77-433a-82ca-1e2adaf005e9	\N	\N	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	NOTE	1	SHOW START	\N	CRITICAL	0	9000000	\N	#EF4444	0	f	2025-08-20 04:10:57.669173+00	2025-08-20 04:10:57.770198+00
\.


--
-- Data for Name: scriptsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public."scriptsTable" (script_id, script_name, script_notes, script_status, start_time, end_time, actual_start_time, show_id, owner_id, date_created, date_updated, is_shared) FROM stdin;
1bb499e2-792c-4643-be5f-50f5f46ca4ab	Seattle Run Script	This is our running script.	BACKUP	2025-08-09 00:40:00+00	2025-08-09 03:00:00+00	\N	7de2d04e-d65a-4a4b-8315-d1ba5719205d	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-11 21:51:59.643288+00	2025-08-16 03:19:26.458963+00	t
39a7376b-7294-49e8-a35f-9dbe905ac3b2	Duplicate Script		DRAFT	2025-08-09 00:30:00+00	2025-08-09 03:00:00+00	\N	7de2d04e-d65a-4a4b-8315-d1ba5719205d	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-20 03:49:44.689073+00	2025-08-20 03:49:44.689073+00	f
1eabbc0c-ae77-433a-82ca-1e2adaf005e9	Second Duplicate		DRAFT	2025-08-09 00:30:00+00	2025-08-09 03:00:00+00	\N	7de2d04e-d65a-4a4b-8315-d1ba5719205d	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-20 04:10:57.669173+00	2025-08-20 04:10:57.669173+00	f
\.


--
-- Data for Name: showsTable; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public."showsTable" (show_id, show_name, show_date, show_end, show_notes, deadline, venue_id, owner_id, date_created, date_updated) FROM stdin;
7de2d04e-d65a-4a4b-8315-d1ba5719205d	The Universe is Absurd!	2025-08-09 00:30:00+00	2025-08-09 03:00:00+00	Featuring Bill and Neil!	2025-08-07 17:15:00+00	c0adee02-3254-42d9-8bb0-ac43112bc31a	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	2025-08-03 07:01:23.346535+00	2025-08-16 22:22:41.262762+00
\.


--
-- Data for Name: userTable; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public."userTable" (user_id, clerk_user_id, email_address, fullname_first, fullname_last, user_name, profile_img_url, phone_number, user_status, user_role, created_by, invited_at, invitation_token, notes, user_prefs_json, user_prefs_bitmap, is_active, date_created, date_updated) FROM stdin;
79951b8a-efdc-4f59-a07a-ca579ac38c8d	\N	dave@thomas.com	Dave	Thomas	\N	\N	(555) 123-4567	GUEST	STAGE_MANAGER	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	\N	\N	\N	\N	6	t	2025-08-08 04:05:40.957532+00	2025-08-08 04:07:13.30226+00
468444b9-143a-4409-b8b1-41cc728273af	\N	bob@dobbs.com	Robert	Dobbs	\N	\N	(555) 123-4567	GUEST	FLY_OPERATOR	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	\N	\N	\N	\N	6	t	2025-08-03 07:45:37.32541+00	2025-08-14 21:47:12.650963+00
ed19ca5c-edf3-4c9b-8092-6843e315e0e0	user_30lXl3HfZsIiEKfqnVF3OjQPvs7	dataless@me.com	Alexander	Martin	bestalexmartin	https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzMxUEEwRTFyZ0VUWGZOcHlpOHZwOGJoN2kzSyJ9	702-580-0808	VERIFIED	TECHNICAL_DIRECTOR	\N	\N	\N	Alex is a cool guy who knows a lot of stuff.	\N	11	t	2025-08-03 02:16:08.344972+00	2025-08-18 16:00:28.447874+00
915742ae-3553-48f2-ae2b-32023068db39	\N	gabe@sapiens.com	Gabe	Sapiens	\N	\N	(555) 123-4567	GUEST	LIGHTING_DESIGNER	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	\N	\N	\N	\N	6	t	2025-08-16 17:40:24.522781+00	2025-08-16 17:40:40.316861+00
aac2d7a2-a776-4409-8c83-7680c569f3de	\N	susan@persons.com	Susan	Persons	\N	\N	(555) 123-4567	GUEST	SOUND_DESIGNER	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	\N	\N	\N	\N	7	t	2025-08-08 04:04:59.960514+00	2025-08-16 21:04:48.902697+00
\.


--
-- Data for Name: venuesTable; Type: TABLE DATA; Schema: public; Owner: alex
--

COPY public."venuesTable" (venue_id, venue_name, owner_id, address, city, state, capacity, venue_type, contact_name, contact_email, contact_phone, stage_width, stage_depth, fly_height, equipment, venue_notes, rental_rate, minimum_rental, date_created, date_updated) FROM stdin;
c0adee02-3254-42d9-8bb0-ac43112bc31a	McCaw Hall	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	321 Mercer St.	Seattle	WA	2800	Proscenium	Michelle Murata	test@test.com	(555) 123-4567	60	60	60	null	McCaw Hall is a beautiful facility	4000	8000	2025-08-03 07:01:23.332743+00	2025-08-07 22:04:49.917237+00
91c88a4c-f0b5-47c8-957a-97e12c43f156	Momma's House	ed19ca5c-edf3-4c9b-8092-6843e315e0e0	221 19th Avenue North	Phenix City	AL	12	Thrust	Myra Currier	myra@mommashouse.com	(555) 123-4567	20	20	20	null	Everyone loves to come to momma's house.	500	1500	2025-08-16 16:44:51.793462+00	2025-08-16 16:46:15.343935+00
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: crewAssignmentsTable crewAssignmentsTable_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."crewAssignmentsTable"
    ADD CONSTRAINT "crewAssignmentsTable_pkey" PRIMARY KEY (assignment_id);


--
-- Name: crewRelationshipsTable crewRelationshipsTable_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."crewRelationshipsTable"
    ADD CONSTRAINT "crewRelationshipsTable_pkey" PRIMARY KEY (relationship_id);


--
-- Name: departmentsTable departmentsTable_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."departmentsTable"
    ADD CONSTRAINT "departmentsTable_pkey" PRIMARY KEY (department_id);


--
-- Name: scriptElementsTable scriptElementsTable_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."scriptElementsTable"
    ADD CONSTRAINT "scriptElementsTable_pkey" PRIMARY KEY (element_id);


--
-- Name: scriptsTable scriptsTable_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."scriptsTable"
    ADD CONSTRAINT "scriptsTable_pkey" PRIMARY KEY (script_id);


--
-- Name: showsTable showsTable_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."showsTable"
    ADD CONSTRAINT "showsTable_pkey" PRIMARY KEY (show_id);


--
-- Name: crewRelationshipsTable unique_manager_crew; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."crewRelationshipsTable"
    ADD CONSTRAINT unique_manager_crew UNIQUE (manager_user_id, crew_user_id);


--
-- Name: crewAssignmentsTable unique_user_show_dept; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."crewAssignmentsTable"
    ADD CONSTRAINT unique_user_show_dept UNIQUE (show_id, user_id, department_id);


--
-- Name: userTable userTable_invitation_token_key; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."userTable"
    ADD CONSTRAINT "userTable_invitation_token_key" UNIQUE (invitation_token);


--
-- Name: userTable userTable_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."userTable"
    ADD CONSTRAINT "userTable_pkey" PRIMARY KEY (user_id);


--
-- Name: venuesTable venuesTable_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."venuesTable"
    ADD CONSTRAINT "venuesTable_pkey" PRIMARY KEY (venue_id);


--
-- Name: idx_department_elements; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX idx_department_elements ON public."scriptElementsTable" USING btree (department_id);


--
-- Name: idx_parent_element; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX idx_parent_element ON public."scriptElementsTable" USING btree (parent_element_id);


--
-- Name: idx_script_sequence; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX idx_script_sequence ON public."scriptElementsTable" USING btree (script_id, sequence);


--
-- Name: idx_script_time_ms; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX idx_script_time_ms ON public."scriptElementsTable" USING btree (script_id, offset_ms);


--
-- Name: ix_crewAssignmentsTable_assignment_id; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX "ix_crewAssignmentsTable_assignment_id" ON public."crewAssignmentsTable" USING btree (assignment_id);


--
-- Name: ix_crewAssignmentsTable_share_token; Type: INDEX; Schema: public; Owner: alex
--

CREATE UNIQUE INDEX "ix_crewAssignmentsTable_share_token" ON public."crewAssignmentsTable" USING btree (share_token);


--
-- Name: ix_crewRelationshipsTable_relationship_id; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX "ix_crewRelationshipsTable_relationship_id" ON public."crewRelationshipsTable" USING btree (relationship_id);


--
-- Name: ix_departmentsTable_department_id; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX "ix_departmentsTable_department_id" ON public."departmentsTable" USING btree (department_id);


--
-- Name: ix_scriptElementsTable_element_id; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX "ix_scriptElementsTable_element_id" ON public."scriptElementsTable" USING btree (element_id);


--
-- Name: ix_showsTable_show_name; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX "ix_showsTable_show_name" ON public."showsTable" USING btree (show_name);


--
-- Name: ix_userTable_clerk_user_id; Type: INDEX; Schema: public; Owner: alex
--

CREATE UNIQUE INDEX "ix_userTable_clerk_user_id" ON public."userTable" USING btree (clerk_user_id);


--
-- Name: ix_userTable_email_address; Type: INDEX; Schema: public; Owner: alex
--

CREATE UNIQUE INDEX "ix_userTable_email_address" ON public."userTable" USING btree (email_address);


--
-- Name: ix_userTable_user_id; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX "ix_userTable_user_id" ON public."userTable" USING btree (user_id);


--
-- Name: ix_userTable_user_name; Type: INDEX; Schema: public; Owner: alex
--

CREATE UNIQUE INDEX "ix_userTable_user_name" ON public."userTable" USING btree (user_name);


--
-- Name: ix_venuesTable_venue_id; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX "ix_venuesTable_venue_id" ON public."venuesTable" USING btree (venue_id);


--
-- Name: crewAssignmentsTable crewAssignmentsTable_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."crewAssignmentsTable"
    ADD CONSTRAINT "crewAssignmentsTable_department_id_fkey" FOREIGN KEY (department_id) REFERENCES public."departmentsTable"(department_id);


--
-- Name: crewAssignmentsTable crewAssignmentsTable_show_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."crewAssignmentsTable"
    ADD CONSTRAINT "crewAssignmentsTable_show_id_fkey" FOREIGN KEY (show_id) REFERENCES public."showsTable"(show_id);


--
-- Name: crewAssignmentsTable crewAssignmentsTable_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."crewAssignmentsTable"
    ADD CONSTRAINT "crewAssignmentsTable_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."userTable"(user_id);


--
-- Name: crewRelationshipsTable crewRelationshipsTable_crew_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."crewRelationshipsTable"
    ADD CONSTRAINT "crewRelationshipsTable_crew_user_id_fkey" FOREIGN KEY (crew_user_id) REFERENCES public."userTable"(user_id);


--
-- Name: crewRelationshipsTable crewRelationshipsTable_manager_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."crewRelationshipsTable"
    ADD CONSTRAINT "crewRelationshipsTable_manager_user_id_fkey" FOREIGN KEY (manager_user_id) REFERENCES public."userTable"(user_id);


--
-- Name: departmentsTable departmentsTable_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."departmentsTable"
    ADD CONSTRAINT "departmentsTable_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public."userTable"(user_id);


--
-- Name: scriptElementsTable scriptElementsTable_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."scriptElementsTable"
    ADD CONSTRAINT "scriptElementsTable_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."userTable"(user_id);


--
-- Name: scriptElementsTable scriptElementsTable_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."scriptElementsTable"
    ADD CONSTRAINT "scriptElementsTable_department_id_fkey" FOREIGN KEY (department_id) REFERENCES public."departmentsTable"(department_id);


--
-- Name: scriptElementsTable scriptElementsTable_parent_element_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."scriptElementsTable"
    ADD CONSTRAINT "scriptElementsTable_parent_element_id_fkey" FOREIGN KEY (parent_element_id) REFERENCES public."scriptElementsTable"(element_id);


--
-- Name: scriptElementsTable scriptElementsTable_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."scriptElementsTable"
    ADD CONSTRAINT "scriptElementsTable_script_id_fkey" FOREIGN KEY (script_id) REFERENCES public."scriptsTable"(script_id);


--
-- Name: scriptElementsTable scriptElementsTable_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."scriptElementsTable"
    ADD CONSTRAINT "scriptElementsTable_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public."userTable"(user_id);


--
-- Name: scriptsTable scriptsTable_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."scriptsTable"
    ADD CONSTRAINT "scriptsTable_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public."userTable"(user_id);


--
-- Name: scriptsTable scriptsTable_show_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."scriptsTable"
    ADD CONSTRAINT "scriptsTable_show_id_fkey" FOREIGN KEY (show_id) REFERENCES public."showsTable"(show_id);


--
-- Name: showsTable showsTable_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."showsTable"
    ADD CONSTRAINT "showsTable_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public."userTable"(user_id);


--
-- Name: showsTable showsTable_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."showsTable"
    ADD CONSTRAINT "showsTable_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public."venuesTable"(venue_id);


--
-- Name: userTable userTable_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."userTable"
    ADD CONSTRAINT "userTable_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."userTable"(user_id);


--
-- Name: venuesTable venuesTable_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."venuesTable"
    ADD CONSTRAINT "venuesTable_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public."userTable"(user_id);


--
-- PostgreSQL database dump complete
--

