# Prompt: สร้าง Backend ใหม่สำหรับ URU Research App

ช่วยออกแบบและพัฒนา REST API Backend สำหรับแอป URU Research โดยใช้ Laravel 11 + MySQL 8 (หรือเทคโนโลยีเทียบเท่า) ให้เป็น API กลางแทน LocalStorage และ Backend เดิมทั้งหมด

## 1. กติกาหลัก

- Base URL: `/api`
- Authentication: Bearer token (Laravel Sanctum หรือ JWT)
- Response เป็น JSON และรองรับ pagination
- ผู้ใช้ทั่วไปค้นหาและเห็นข้อมูลทั่วไปของผู้ใช้อื่นได้
- ผู้ใช้เห็นงบประมาณเฉพาะรายการที่ตนเองเป็นเจ้าของ
- API ต้องส่ง `budget: null` สำหรับรายการของผู้อื่น
- ผู้ใช้แก้ไขและลบได้เฉพาะข้อมูลของตนเอง
- Admin เห็นงบประมาณและจัดการข้อมูลทั้งหมดได้
- ตรวจ ownership ด้วย `owner_user_id` เท่านั้น ห้ามตรวจด้วยชื่อผู้วิจัย
- ทุก endpoint ต้อง validate input และตอบ HTTP status ที่ถูกต้อง: 200, 201, 204, 401, 403, 404, 422, 429
- รองรับ CORS สำหรับ Web และ Mobile
- เนื่องจาก IIS อาจส่ง PUT/PATCH/DELETE ไป PHP คนละเวอร์ชัน ต้องรองรับ POST พร้อม `X-HTTP-Method-Override: PUT|PATCH|DELETE`

## 2. ตารางฐานข้อมูล

### users

- id
- external_user_id nullable, unique (รหัสจาก URU Smart/SSO)
- name
- email unique
- password nullable (ถ้าใช้ SSO ให้เป็น null)
- role enum: `admin`, `user`
- faculty nullable
- major nullable
- position nullable
- phone nullable
- avatar_url nullable
- email_verified_at nullable
- timestamps

### user_profiles

- id
- user_id foreign unique
- prefix nullable
- first_name nullable
- last_name nullable
- work_type nullable
- group_name nullable
- address nullable
- birthday date nullable
- line_id nullable
- national_id nullable (เข้ารหัส และห้ามส่งใน public profile)
- main_unit_id nullable
- sub_unit_id nullable
- timestamps

### educations

- id
- user_id foreign
- level
- degree nullable
- field nullable
- institution nullable
- graduation_year nullable
- sort_order default 0
- timestamps

### expertises

- id
- user_id foreign
- name_th
- name_en nullable
- expertise_group nullable
- field nullable
- timestamps

### researches

- id
- owner_user_id foreign
- title
- description/abstract nullable
- research_type_id nullable
- research_level_id nullable
- budget decimal(15,2) nullable
- budget_year nullable
- status enum เช่น `draft`, `active`, `approved`, `completed`, `cancelled`
- start_date nullable
- end_date nullable
- timestamps
- soft_deletes

### research_members

- id
- research_id foreign
- user_id foreign
- role เช่น `หัวหน้าโครงการ`, `ผู้ร่วมวิจัย`
- timestamps
- unique(research_id, user_id)

### journals

- id
- owner_user_id foreign
- title
- journal_name nullable
- journal_type_id nullable
- publication_year nullable
- status เช่น `draft`, `reviewing`, `published`
- citation_count unsigned default 0
- doi nullable
- url nullable
- timestamps
- soft_deletes

### proposals

- id
- owner_user_id foreign
- title
- funding_type nullable
- budget decimal(15,2) nullable
- budget_year nullable
- status enum: `pending`, `approved`, `rejected`
- remark nullable
- timestamps
- soft_deletes

### reports

- id
- owner_user_id foreign
- research_id foreign nullable
- title
- abstract text nullable
- report_date date nullable
- status enum: `draft`, `submitted`, `approved`, `revision_required`
- timestamps
- soft_deletes

### uploaded_files

- id
- owner_user_id foreign
- entity_type nullable (`research`, `journal`, `proposal`, `report`, `profile`)
- entity_id nullable
- original_name
- storage_path
- mime_type
- size_bytes
- checksum nullable
- created_at

ไฟล์ต้องเก็บใน private storage และดาวน์โหลดผ่าน protected endpoint ห้ามเปิด storage path โดยตรง

### notifications

- id UUID หรือ bigint
- user_id foreign (ผู้รับแจ้งเตือน)
- type
- title
- body
- entity_type nullable
- entity_id nullable
- route nullable
- data json nullable
- read_at nullable
- created_at

### push_tokens

- id
- user_id foreign
- token unique
- platform enum: `ios`, `android`, `web`
- device_name nullable
- last_used_at nullable
- timestamps

### notification_settings

- id
- user_id foreign unique
- enabled boolean default true
- research_updates boolean default true
- proposal_updates boolean default true
- journal_updates boolean default true
- report_updates boolean default true
- announcements boolean default true
- timestamps

### announcements

- id
- title
- body
- starts_at nullable
- ends_at nullable
- published_at nullable
- created_by foreign users
- timestamps

ควรมี reference tables สำหรับ prefixes, positions, main_units, sub_units, research_types, research_levels, journal_types, expertise_groups และ departments

## 3. API ที่ต้องมี

### System และ Authentication

- `GET /api/ping`
- `POST /api/auth/login`
- `POST /api/auth/sso-token`
- `POST /api/auth/logout` [Protected]
- `GET /api/me` [Protected]
- `PUT /api/me` [Protected]
- `POST /api/me/photo` [Protected, multipart]
- `DELETE /api/me/photo` [Protected]

Login response:

```json
{
  "token": "bearer-token",
  "user": {
    "id": 1,
    "name": "ชื่อผู้ใช้",
    "email": "user@uru.ac.th",
    "role": "user"
  }
}
```

### Profile และ Search

- `GET /api/profile/{id}` เผยเฉพาะข้อมูลสาธารณะ
- `GET /api/profile/{id}/pdf`
- `GET /api/profile-search?q=&faculty=&position=&page=&per_page=` [Protected]
- `GET /api/educations` / `POST /api/educations`
- `PUT /api/educations/{id}` / `DELETE /api/educations/{id}`
- `GET /api/expertises` / `POST /api/expertises`
- `PUT /api/expertises/{id}` / `DELETE /api/expertises/{id}`

### Research CRUD

- `GET /api/researches?scope=mine|all&q=&status=&year=&page=&per_page=`
- `POST /api/researches`
- `GET /api/researches/{id}`
- `PUT /api/researches/{id}`
- `DELETE /api/researches/{id}`

เมื่อ `scope=all` ผู้ใช้ทั่วไปเห็นรายการทั้งหมด แต่ `budget` ของรายการที่ไม่ใช่เจ้าของต้องเป็น null

### Journal CRUD

- `GET /api/journals?scope=mine|all&q=&status=&year=&page=&per_page=`
- `POST /api/journals`
- `GET /api/journals/{id}`
- `PUT /api/journals/{id}`
- `DELETE /api/journals/{id}`

### Proposal CRUD

- `GET /api/proposals?scope=mine|all&q=&status=&year=&page=&per_page=`
- `POST /api/proposals`
- `GET /api/proposals/{id}`
- `PUT /api/proposals/{id}`
- `DELETE /api/proposals/{id}`
- เฉพาะ Admin เปลี่ยนสถานะเป็น approved/rejected ได้

### Report CRUD

- `GET /api/reports?scope=mine|all&q=&status=&page=&per_page=`
- `POST /api/reports`
- `GET /api/reports/{id}`
- `PUT /api/reports/{id}`
- `DELETE /api/reports/{id}`

### Files

- `GET /api/files?entity_type=&entity_id=&page=&per_page=`
- `POST /api/files` [multipart/form-data]
- `GET /api/files/{id}/download`
- `DELETE /api/files/{id}`
- เจ้าของไฟล์หรือ Admin เท่านั้นที่ดาวน์โหลดและลบได้

### Notifications

- `GET /api/notifications?page=1&per_page=20`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/{id}/read`
- `POST /api/notifications/read-all`
- `DELETE /api/notifications/{id}`
- `POST /api/push-token`
- `DELETE /api/push-token`
- `PUT /api/notification-settings`

ให้สร้าง notification เฉพาะผู้เกี่ยวข้องเมื่อ:

- ข้อเสนอถูกอนุมัติหรือปฏิเสธ
- สถานะโครงการเปลี่ยน
- บทความเปลี่ยนสถานะ
- รายงานถูกส่ง/ขอแก้ไข/อนุมัติ
- มีประกาศใหม่

notification response ต้องมี `entity_type`, `entity_id` และ `route` เพื่อให้แอปกดเข้าไปดูรายละเอียดได้

### Admin

- `GET /api/admin/users?q=&role=&page=&per_page=`
- `GET /api/admin/users/{id}`
- `PUT /api/admin/users/{id}`
- `PATCH /api/admin/users/{id}/role`
- `DELETE /api/admin/users/{id}`
- ทุก endpoint ใช้ admin middleware

### Reference Data

- `GET /api/ref/profile-options`
- `GET /api/ref/search-options`
- `GET /api/ref/research-types`
- `GET /api/ref/research-levels`
- `GET /api/ref/journal-types`
- `GET /api/ref/degrees`
- `GET /api/ref/departments`
- `GET /api/ref/expertise-groups`

## 4. รูปแบบ Response

รายการแบบ pagination:

```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 0,
    "last_page": 1
  }
}
```

Validation error:

```json
{
  "message": "ข้อมูลไม่ถูกต้อง",
  "errors": {
    "title": ["กรุณากรอกชื่อโครงการ"]
  }
}
```

## 5. Security และ Privacy

- ใช้ Policy/Gate ทุก show/update/delete/download endpoint
- ห้ามเชื่อ `owner_user_id`, `researcher` หรือ `author` จาก request ของ User ให้กำหนด owner จาก token เท่านั้น
- Admin เท่านั้นที่กำหนด owner ให้ผู้อื่นได้
- ซ่อน budget ด้วย API Resource/Serializer ไม่ใช่ซ่อนเฉพาะ Frontend
- Public profile ห้ามส่ง national_id, address, birthday, line_id, phone หากไม่ได้รับอนุญาต
- ใช้ rate limiting แยก authentication และ API ปกติ
- บันทึก audit log สำหรับการเปลี่ยน role, status, budget และการลบข้อมูล
- Validate MIME type, ขนาดไฟล์ และสุ่มชื่อไฟล์
- เพิ่ม database indexes ให้ owner_user_id, status, year, created_at และ foreign keys

## 6. งานส่งมอบ

- migrations, models, controllers, requests, resources, policies และ routes
- OpenAPI/Swagger documentation
- Postman collection
- seeders สำหรับ reference data และ admin เริ่มต้น
- automated tests ครอบคลุม authentication, ownership, budget privacy, admin permissions, notifications และ file access
- migration/import script สำหรับย้ายข้อมูลจากฐานข้อมูลเก่าและ LocalStorage JSON

