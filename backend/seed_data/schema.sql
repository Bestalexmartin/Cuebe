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
    'crew',
    'assistant_director',
    'stage_manager',
    'assistant_stage_manager',
    'technical_director',
    'lighting_designer',
    'sound_designer',
    'costume_designer',
    'set_designer',
    'props_master',
    'electrician',
    'sound_technician',
    'wardrobe',
    'makeup_artist',
    'hair_stylist',
    'choreographer',
    'music_director',
    'producer',
    'director',
    'other'
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
    date_assigned timestamp with time zone DEFAULT now()
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
-- Name: script_shares; Type: TABLE; Schema: public; Owner: alex
--

CREATE TABLE public.script_shares (
    share_id uuid NOT NULL,
    script_id uuid NOT NULL,
    created_by uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    share_token character varying(255) NOT NULL,
    permissions json,
    expires_at timestamp with time zone,
    is_active boolean NOT NULL,
    access_count integer NOT NULL,
    last_accessed_at timestamp with time zone,
    last_accessed_by_ip character varying(45),
    share_name character varying(255),
    notes text,
    date_created timestamp with time zone DEFAULT now(),
    date_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public.script_shares OWNER TO alex;

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
    user_role public.user_role_enum,
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
-- Name: script_shares script_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.script_shares
    ADD CONSTRAINT script_shares_pkey PRIMARY KEY (share_id);


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
-- Name: ix_script_shares_script_id; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX ix_script_shares_script_id ON public.script_shares USING btree (script_id);


--
-- Name: ix_script_shares_share_id; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX ix_script_shares_share_id ON public.script_shares USING btree (share_id);


--
-- Name: ix_script_shares_share_token; Type: INDEX; Schema: public; Owner: alex
--

CREATE UNIQUE INDEX ix_script_shares_share_token ON public.script_shares USING btree (share_token);


--
-- Name: ix_script_shares_shared_with_user_id; Type: INDEX; Schema: public; Owner: alex
--

CREATE INDEX ix_script_shares_shared_with_user_id ON public.script_shares USING btree (shared_with_user_id);


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
    ADD CONSTRAINT "scriptElementsTable_parent_element_id_fkey" FOREIGN KEY (parent_element_id) REFERENCES public."scriptElementsTable"(element_id) DEFERRABLE INITIALLY DEFERRED;


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
-- Name: script_shares script_shares_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.script_shares
    ADD CONSTRAINT script_shares_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."userTable"(user_id);


--
-- Name: script_shares script_shares_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.script_shares
    ADD CONSTRAINT script_shares_script_id_fkey FOREIGN KEY (script_id) REFERENCES public."scriptsTable"(script_id);


--
-- Name: script_shares script_shares_shared_with_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public.script_shares
    ADD CONSTRAINT script_shares_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public."userTable"(user_id);


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
    ADD CONSTRAINT "userTable_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."userTable"(user_id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: venuesTable venuesTable_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alex
--

ALTER TABLE ONLY public."venuesTable"
    ADD CONSTRAINT "venuesTable_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public."userTable"(user_id);


--
-- PostgreSQL database dump complete
--

