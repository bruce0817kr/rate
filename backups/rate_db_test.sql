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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: audit_logs_action_enum; Type: TYPE; Schema: public; Owner: rate_user
--

CREATE TYPE public.audit_logs_action_enum AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE'
);


ALTER TYPE public.audit_logs_action_enum OWNER TO rate_user;

--
-- Name: personnel_costs_documentstatus_enum; Type: TYPE; Schema: public; Owner: rate_user
--

CREATE TYPE public.personnel_costs_documentstatus_enum AS ENUM (
    'NOT_SUBMITTED',
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.personnel_costs_documentstatus_enum OWNER TO rate_user;

--
-- Name: personnel_costs_insurancecoverage_enum; Type: TYPE; Schema: public; Owner: rate_user
--

CREATE TYPE public.personnel_costs_insurancecoverage_enum AS ENUM (
    'EMPLOYEE_PART',
    'EMPLOYER_PART',
    'FULLY_COVERED'
);


ALTER TYPE public.personnel_costs_insurancecoverage_enum OWNER TO rate_user;

--
-- Name: personnel_employmenttype_enum; Type: TYPE; Schema: public; Owner: rate_user
--

CREATE TYPE public.personnel_employmenttype_enum AS ENUM (
    'FULL_TIME',
    'CONTRACT',
    'PART_TIME',
    'DISPATCHED'
);


ALTER TYPE public.personnel_employmenttype_enum OWNER TO rate_user;

--
-- Name: project_personnel_calculationmethod_enum; Type: TYPE; Schema: public; Owner: rate_user
--

CREATE TYPE public.project_personnel_calculationmethod_enum AS ENUM (
    'MONTHLY',
    'DAILY',
    'HOURLY'
);


ALTER TYPE public.project_personnel_calculationmethod_enum OWNER TO rate_user;

--
-- Name: project_personnel_role_enum; Type: TYPE; Schema: public; Owner: rate_user
--

CREATE TYPE public.project_personnel_role_enum AS ENUM (
    'PRINCIPAL_INVESTIGATOR',
    'CO_RESEARCHER',
    'PARTICIPATING_RESEARCHER'
);


ALTER TYPE public.project_personnel_role_enum OWNER TO rate_user;

--
-- Name: projects_projecttype_enum; Type: TYPE; Schema: public; Owner: rate_user
--

CREATE TYPE public.projects_projecttype_enum AS ENUM (
    'NATIONAL_RD',
    'LOCAL_SUBSIDY',
    'MIXED'
);


ALTER TYPE public.projects_projecttype_enum OWNER TO rate_user;

--
-- Name: projects_status_enum; Type: TYPE; Schema: public; Owner: rate_user
--

CREATE TYPE public.projects_status_enum AS ENUM (
    'PLANNING',
    'APPROVED',
    'IN_PROGRESS',
    'COMPLETED',
    'AUDITING'
);


ALTER TYPE public.projects_status_enum OWNER TO rate_user;

--
-- Name: regulation_documents_filetype_enum; Type: TYPE; Schema: public; Owner: rate_user
--

CREATE TYPE public.regulation_documents_filetype_enum AS ENUM (
    'PDF',
    'HWP',
    'DOC',
    'DOCX',
    'TXT'
);


ALTER TYPE public.regulation_documents_filetype_enum OWNER TO rate_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: rate_user
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "entityType" character varying NOT NULL,
    "entityId" character varying NOT NULL,
    action public.audit_logs_action_enum NOT NULL,
    changes jsonb NOT NULL,
    "performedBy" character varying NOT NULL,
    "ipAddress" character varying,
    "userAgent" character varying,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO rate_user;

--
-- Name: personnel; Type: TABLE; Schema: public; Owner: rate_user
--

CREATE TABLE public.personnel (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "employeeId" character varying NOT NULL,
    name character varying NOT NULL,
    gender character varying NOT NULL,
    "highestEducation" character varying NOT NULL,
    "educationYear" integer NOT NULL,
    "nationalResearcherNumber" character varying NOT NULL,
    "birthDate" timestamp without time zone NOT NULL,
    ssn character varying NOT NULL,
    department character varying NOT NULL,
    team character varying NOT NULL,
    "position" character varying NOT NULL,
    "salaryBand" character varying NOT NULL,
    "employmentType" public.personnel_employmenttype_enum NOT NULL,
    "hireDate" timestamp without time zone NOT NULL,
    "terminationDate" timestamp without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "salaryValidity" jsonb NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.personnel OWNER TO rate_user;

--
-- Name: personnel_costs; Type: TABLE; Schema: public; Owner: rate_user
--

CREATE TABLE public.personnel_costs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "fiscalYear" integer NOT NULL,
    "fiscalMonth" integer NOT NULL,
    "calculationDate" timestamp without time zone NOT NULL,
    "baseSalary" numeric(15,2) NOT NULL,
    "appliedParticipationRate" numeric(5,2) NOT NULL,
    "calculatedAmount" numeric(15,2) NOT NULL,
    "expenseItem" character varying NOT NULL,
    "insuranceCoverage" public.personnel_costs_insurancecoverage_enum NOT NULL,
    "documentStatus" public.personnel_costs_documentstatus_enum NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    project_personnel_id uuid,
    personnel_id uuid
);


ALTER TABLE public.personnel_costs OWNER TO rate_user;

--
-- Name: project_personnel; Type: TABLE; Schema: public; Owner: rate_user
--

CREATE TABLE public.project_personnel (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "participationRate" numeric(5,2) NOT NULL,
    "startDate" timestamp without time zone NOT NULL,
    "endDate" timestamp without time zone,
    "calculationMethod" public.project_personnel_calculationmethod_enum NOT NULL,
    "expenseCode" character varying NOT NULL,
    "legalBasisCode" character varying NOT NULL,
    "participatingTeam" character varying NOT NULL,
    role public.project_personnel_role_enum DEFAULT 'PARTICIPATING_RESEARCHER'::public.project_personnel_role_enum NOT NULL,
    notes character varying,
    version integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    project_id uuid,
    personnel_id uuid
);


ALTER TABLE public.project_personnel OWNER TO rate_user;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: rate_user
--

CREATE TABLE public.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    "projectType" public.projects_projecttype_enum NOT NULL,
    "managingDepartment" character varying NOT NULL,
    "startDate" timestamp without time zone NOT NULL,
    "endDate" timestamp without time zone NOT NULL,
    "totalBudget" numeric(15,2) NOT NULL,
    "personnelBudget" numeric(15,2) NOT NULL,
    status public.projects_status_enum NOT NULL,
    "legalBasis" jsonb NOT NULL,
    "internalRules" jsonb NOT NULL,
    "managingTeam" character varying NOT NULL,
    "participatingTeams" text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.projects OWNER TO rate_user;

--
-- Name: regulation_documents; Type: TABLE; Schema: public; Owner: rate_user
--

CREATE TABLE public.regulation_documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying NOT NULL,
    description text NOT NULL,
    "filePath" character varying NOT NULL,
    "fileType" public.regulation_documents_filetype_enum NOT NULL,
    version character varying NOT NULL,
    "effectiveDate" timestamp without time zone NOT NULL,
    "expiryDate" timestamp without time zone,
    "applicableProjectTypes" text NOT NULL,
    "applicableTeams" text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.regulation_documents OWNER TO rate_user;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: rate_user
--

COPY public.audit_logs (id, "entityType", "entityId", action, changes, "performedBy", "ipAddress", "userAgent", "timestamp") FROM stdin;
\.


--
-- Data for Name: personnel; Type: TABLE DATA; Schema: public; Owner: rate_user
--

COPY public.personnel (id, "employeeId", name, gender, "highestEducation", "educationYear", "nationalResearcherNumber", "birthDate", ssn, department, team, "position", "salaryBand", "employmentType", "hireDate", "terminationDate", "isActive", "salaryValidity", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: personnel_costs; Type: TABLE DATA; Schema: public; Owner: rate_user
--

COPY public.personnel_costs (id, "fiscalYear", "fiscalMonth", "calculationDate", "baseSalary", "appliedParticipationRate", "calculatedAmount", "expenseItem", "insuranceCoverage", "documentStatus", "createdAt", "updatedAt", project_personnel_id, personnel_id) FROM stdin;
\.


--
-- Data for Name: project_personnel; Type: TABLE DATA; Schema: public; Owner: rate_user
--

COPY public.project_personnel (id, "participationRate", "startDate", "endDate", "calculationMethod", "expenseCode", "legalBasisCode", "participatingTeam", role, notes, version, "createdAt", "updatedAt", project_id, personnel_id) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: rate_user
--

COPY public.projects (id, name, "projectType", "managingDepartment", "startDate", "endDate", "totalBudget", "personnelBudget", status, "legalBasis", "internalRules", "managingTeam", "participatingTeams", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: regulation_documents; Type: TABLE DATA; Schema: public; Owner: rate_user
--

COPY public.regulation_documents (id, title, description, "filePath", "fileType", version, "effectiveDate", "expiryDate", "applicableProjectTypes", "applicableTeams", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: personnel_costs PK_052fd826131ef4b39719cdd83d0; Type: CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.personnel_costs
    ADD CONSTRAINT "PK_052fd826131ef4b39719cdd83d0" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: personnel PK_33a7253a5d2a326fec3cdc0baa5; Type: CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.personnel
    ADD CONSTRAINT "PK_33a7253a5d2a326fec3cdc0baa5" PRIMARY KEY (id);


--
-- Name: regulation_documents PK_3f0d14c4abefb4d4bdaae682941; Type: CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.regulation_documents
    ADD CONSTRAINT "PK_3f0d14c4abefb4d4bdaae682941" PRIMARY KEY (id);


--
-- Name: projects PK_6271df0a7aed1d6c0691ce6ac50; Type: CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY (id);


--
-- Name: project_personnel PK_6f8a487897c9ad76960e16f175f; Type: CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.project_personnel
    ADD CONSTRAINT "PK_6f8a487897c9ad76960e16f175f" PRIMARY KEY (id);


--
-- Name: personnel UQ_b680fca34c8f272ca5f5d2db314; Type: CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.personnel
    ADD CONSTRAINT "UQ_b680fca34c8f272ca5f5d2db314" UNIQUE ("employeeId");


--
-- Name: project_personnel FK_086a642dcd1caeee843c8d24d4a; Type: FK CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.project_personnel
    ADD CONSTRAINT "FK_086a642dcd1caeee843c8d24d4a" FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: project_personnel FK_8dc48de341be1bc54720171501d; Type: FK CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.project_personnel
    ADD CONSTRAINT "FK_8dc48de341be1bc54720171501d" FOREIGN KEY (personnel_id) REFERENCES public.personnel(id);


--
-- Name: personnel_costs FK_a0b1fcca17e26a46ba90e1347b0; Type: FK CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.personnel_costs
    ADD CONSTRAINT "FK_a0b1fcca17e26a46ba90e1347b0" FOREIGN KEY (project_personnel_id) REFERENCES public.project_personnel(id);


--
-- Name: personnel_costs FK_e8070c8d60a8d8ae893f835cc6b; Type: FK CONSTRAINT; Schema: public; Owner: rate_user
--

ALTER TABLE ONLY public.personnel_costs
    ADD CONSTRAINT "FK_e8070c8d60a8d8ae893f835cc6b" FOREIGN KEY (personnel_id) REFERENCES public.personnel(id);


--
-- PostgreSQL database dump complete
--

