# Software Requirements Specification

## CHDC Student Registration Portal and Authentication API

| Document field | Value |
| --- | --- |
| Version | 1.0 |
| Status | Baseline for the current implementation |
| Date | 2026-10-20 |
| System | CHDC Full-Stack Application |

## 1. Purpose

This document specifies the observable requirements and verified behavior of the CHDC web portal and its Django REST API. It is based on the source code in this repository. Requirements describe the current product boundary; known implementation gaps and decisions that need product or security-owner confirmation are called out separately rather than treated as completed behavior.

## 2. Scope

The system provides a browser-based student account registration form and API endpoints for student registration and credential login. The backend stores account credentials using Django password hashing, stores student identity/contact details separately from the authentication record, encrypts that profile data before database storage, and returns JWT access and refresh tokens on successful registration or login.

The repository does not currently implement the CHDC mobile application, case creation or case management, alias generation, password reset, account verification, profile editing, or a browser login flow. The portal directs successfully registered users to continue in the mobile application; the mobile application is outside this specification.

## 3. Stakeholders and Users

| Role | Interest |
| --- | --- |
| Student | Create an account using a matriculation number, contact number, and password. |
| CHDC application client | Authenticate students and consume the API's JWT response. |
| Application operator | Configure secrets and allowed hosts, run migrations, and operate the web/API services. |
| Privacy/security owner | Define acceptable handling, retention, key management, transport security, and access to student PII. |

## 4. System Context

- The frontend is a React, TypeScript, and Vite single-page application.
- The API is a Django REST Framework service.
- The frontend's default API base is `/api/v1`; the Vite development server proxies `/api` to Django on port 8000.
- The API also exposes the same authentication routes under the compatibility prefix `/api/auth/`.
- The development database is SQLite at `backend/db.sqlite3`.
- Root `.env` values configure `VITE_API_BASE_URL`, `SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS`.

## 5. Functional Requirements

### 5.1 Student Registration

| ID | Requirement |
| --- | --- |
| FR-REG-01 | The portal shall collect first name, last name, mobile number, matriculation number, password, and password confirmation. |
| FR-REG-02 | The portal shall trim first and last names and send the matriculation number in uppercase. |
| FR-REG-03 | The portal shall normalize Nigerian mobile values beginning with `0` to the `+234` country code, values beginning with `00` to a leading `+`, and values beginning with `234` to `+234`. |
| FR-REG-04 | The registration API shall accept `first_name` and `last_name` up to 150 characters, `mobile_number` up to 14 characters, `matric_number` up to 32 characters, and a password of at least 8 characters. |
| FR-REG-05 | The registration API shall require a matriculation number matching `UG` plus two digits, `/`, 2 to 4 uppercase letters, `/`, and four digits (example: `UG19/CS/1042`). |
| FR-REG-06 | The registration API shall require a mobile number matching `+234` followed by exactly 10 digits. |
| FR-REG-07 | The registration API shall reject a matriculation number already assigned to an account. |
| FR-REG-08 | The registration API shall create the user and PII profile atomically; failure to create either record shall not leave a partial registration. |
| FR-REG-09 | A successful registration shall return HTTP 201, a success status and message, user ID, matriculation number as `username`, and JWT access and refresh tokens. |
| FR-REG-10 | Invalid registration input shall return HTTP 400 with a failure status, message, and field-level validation errors. |
| FR-REG-11 | The portal shall display field errors and a general service/network error, disable submission while the form is invalid or a request is pending, and show a dismissible success dialog after registration. |
| FR-REG-12 | The portal shall allow the user to toggle visibility of each password field. |

### 5.2 Login and Authentication

| ID | Requirement |
| --- | --- |
| FR-AUTH-01 | The login API shall accept a matriculation number and password. |
| FR-AUTH-02 | A successful login shall return HTTP 200, a success status and message, user ID, matriculation number as `username`, and JWT access and refresh tokens. |
| FR-AUTH-03 | A failed login shall return HTTP 401 and a failure response. |
| FR-AUTH-04 | The API shall use JWT authentication as the configured default REST framework authentication mechanism. |
| FR-AUTH-05 | The registration and login endpoints shall be callable without an existing authenticated session. |
| FR-AUTH-06 | The frontend currently implements registration only. The login endpoint is an API capability and is not exposed as a portal workflow. |

### 5.3 Student Data

| ID | Requirement |
| --- | --- |
| FR-DATA-01 | Each account shall have a unique matriculation number used as its authentication identifier. |
| FR-DATA-02 | The authentication user record shall not store first name, last name, or email fields. |
| FR-DATA-03 | A student PII profile shall be associated one-to-one with its account and contain first name, last name, and mobile number. |
| FR-DATA-04 | The PII profile shall be deleted when its associated user is deleted. |

## 6. External Interface Requirements

### 6.1 Browser Interface

- The portal shall present labeled controls for all registration fields and associate validation messages with the relevant field.
- Field errors shall be announced using an alert role; the successful-registration confirmation shall be presented as a modal dialog with a close control and Escape-key dismissal.
- The portal shall provide a pending state while submitting and must prevent duplicate submission during that state.

### 6.2 HTTP API

All request and response bodies use JSON.

| Operation | Path | Method | Success response |
| --- | --- | --- | --- |
| Register | `/api/v1/auth/register/` and `/api/auth/register/` | POST | 201 Created |
| Login | `/api/v1/auth/login/` and `/api/auth/login/` | POST | 200 OK |

Registration request fields: `first_name`, `last_name`, `mobile_number`, `matric_number`, `password`. The current frontend additionally sends `confirm_password`; the API currently ignores that field.

Login request fields: `matric_number`, `password`.

Successful response data includes `user_id`, `username`, and `tokens.access` and `tokens.refresh`. Error responses include `status`, `message`, and, for validation failures, `errors` keyed by field.

## 7. Security and Privacy Requirements

| ID | Requirement |
| --- | --- |
| SEC-01 | The system shall store passwords through Django's password-hashing mechanism; plaintext passwords shall not be stored. |
| SEC-02 | The system shall encrypt PII profile data before writing it to the database and decrypt it when reading through the model field. |
| SEC-03 | The PII encryption key shall be derived from Django `SECRET_KEY`; operators shall provide and protect a stable, high-entropy secret outside local development. Changing the secret can make previously encrypted PII unreadable. |
| SEC-04 | The system shall keep PII fields separate from the authentication user record. |
| SEC-05 | Production deployments shall use HTTPS for browser-to-service and client-to-API traffic. The local development configuration uses HTTP and does not itself satisfy this production requirement. |
| SEC-06 | Production deployments shall set `DEBUG=False`, configure `ALLOWED_HOSTS` explicitly, and must not use the development fallback secret. |
| SEC-07 | CORS shall be restricted to approved origins in production. The current configuration allows all origins while `DEBUG=True`. |

### 7.1 Security Claims Requiring Confirmation

The interface currently displays “AES-256 encrypted” and states that identity is isolated from case logs and anonymized into aliases. The inspected implementation uses Fernet with a key derived from `SECRET_KEY`; it does not implement case records, case-log isolation, or alias generation in this repository. These UI statements are not treated as verified system requirements or capabilities here. The security owner must approve accurate user-facing language and any future case-data privacy requirements.

## 8. Nonfunctional Requirements

| ID | Requirement |
| --- | --- |
| NFR-01 | The browser application shall support current evergreen desktop and mobile browsers with a responsive registration layout. |
| NFR-02 | Registration requests shall use a 15-second client timeout; timeout and connection failures shall be communicated to the user without exposing secrets. |
| NFR-03 | The frontend shall provide keyboard-operable controls, visible focus treatment, associated labels, and accessible status/error semantics for the registration workflow. |
| NFR-04 | User PII and credentials shall not be included in routine application logs or error messages. |
| NFR-05 | Production performance, availability, recovery-time, recovery-point, retention, and capacity objectives are not defined by the current implementation and require stakeholder decisions. |

## 9. Constraints and Assumptions

- The current database engine is SQLite; no production database platform is specified.
- Account registration is presently constrained to a Nigerian mobile-number format.
- Matriculation-number format and institution policy are controlled by the API validator until product owners approve a canonical format.
- Django password-validator classes are configured, but the registration serializer currently enforces only an eight-character minimum and does not invoke Django's full password-validation API.
- The API does not currently define a JWT refresh route, logout/revocation mechanism, account verification flow, password reset flow, or login rate limiting.
- Development-only settings and the Vite proxy are not a production deployment architecture.

## 10. Known Gaps and Decisions

These items must be resolved before the affected behavior can be considered consistent or production-ready.

| ID | Gap or decision |
| --- | --- |
| GAP-01 | **Registration format mismatch:** frontend validation accepts a 9-character value such as `U21CO1234`, while the API requires a slash-delimited value such as `UG19/CS/1042`. The form also caps input at 9 characters. Agree on one canonical matriculation format and use it in both layers. |
| GAP-02 | **Mobile validation mismatch:** the portal accepts numbers according to `libphonenumber-js`, while the API accepts only `+234` plus 10 digits. Align the client rule or broaden the API according to product policy. |
| GAP-03 | **Password confirmation is client-only:** the portal sends `confirm_password`, but the API does not validate it. The API should enforce equality if confirmation is part of the registration contract. |
| GAP-04 | **Password strength mismatch:** the UI requires uppercase, numeric, and special characters, while API registration checks only minimum length. Decide the required password policy and enforce it server-side. |
| GAP-05 | **Login user workflow:** the API supports login but no login form or frontend login service is currently implemented. Confirm whether login belongs in this portal or remains exclusively a mobile-client responsibility. |
| GAP-06 | **PII and case privacy claims:** case-log separation and alias generation are not implemented in this repository; clarify ownership and scope before relying on these claims. |
| GAP-07 | **Cryptographic/key-management policy:** validate the displayed algorithm claim, key rotation strategy, backup/restore behavior, and migration procedure for encrypted PII with the security owner. |
| GAP-08 | **Operational controls:** define production database, HTTPS termination, monitoring, backups, retention, incident response, rate limiting, and service-level objectives. |

## 11. Acceptance Criteria

The baseline registration/API requirements are accepted when automated tests or equivalent API checks demonstrate that:

1. A valid API registration creates exactly one user and one encrypted PII profile and returns HTTP 201 with an access/refresh token pair.
2. Duplicate matriculation numbers and invalid backend matriculation/mobile formats are rejected with HTTP 400 field errors.
3. A valid credential pair returns HTTP 200 and JWTs; invalid credentials return HTTP 401.
4. PII is stored encrypted in the raw database column and is returned decrypted through the model field; the password is stored as a hash.
5. The registration page exposes validation feedback, prevents invalid/pending submission, and presents success or service failure feedback accessibly.
6. Before release, GAP-01 through GAP-04 are resolved so values accepted by the portal are accepted by the API and critical security policy is enforced server-side.

## 12. Traceability References

- Frontend registration behavior: `frontend/src/RegisterForm.tsx`
- Frontend API client: `frontend/src/services/api.ts`
- API routes: `backend/chdc_backend/urls.py`, `backend/authentication/urls.py`
- API behavior and validation: `backend/authentication/views.py`, `backend/authentication/serializers.py`
- Account and PII storage: `backend/authentication/models.py`, `backend/authentication/crypto.py`
- Backend settings: `backend/chdc_backend/settings.py`
- Automated backend coverage: `backend/authentication/tests.py`