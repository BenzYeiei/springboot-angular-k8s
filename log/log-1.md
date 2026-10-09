# Log-1: สรุปงานที่ทำมาทั้งหมด

**วันที่:** 2026-10-09  
**Project:** springboot-angular-k8s

---

## 1. เริ่มต้น Infrastructure (Docker Compose)

- Start Docker Engine และ `docker compose up -d`
- Services ที่ขึ้นมา: PostgreSQL, pgAdmin4, Keycloak, Jenkins

---

## 2. สร้าง Spring Boot Backend

**Tech Stack:** Spring Boot 4.1.1, Java 25, Lombok 1.18.40, Maven

### โครงสร้างไฟล์
```
backend/
  src/main/java/com/example/backend/
    BackendApplication.java
    config/
      SecurityConfig.java        - JWT Resource Server + CORS
      JwtAuthConverter.java      - แปลง realm_access.roles → ROLE_*
    model/
      User.java                  - Entity สำหรับ users table
    repository/
      UserRepository.java
    service/
      UserService.java           - syncUser() บันทึก user จาก JWT ลง PostgreSQL
    controller/
      UserController.java        - GET /api/user/me
      HomeController.java        - GET /api/public/health, /api/public/info
  src/main/resources/
    application.yml
```

### ปัญหาที่พบและแก้
| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| Lombok ไม่ทำงาน | Lombok 1.18.34/1.18.36 ไม่รองรับ Java 25 | อัปเกรดเป็น Lombok 1.18.40 |
| `class file version 69` | Spring Boot 3.3.4 + ASM ไม่รองรับ Java 25 | อัปเกรดเป็น Spring Boot 4.1.1 |
| `Unable to find main class` | spring-boot:run หา main class ไม่เจอ | เพิ่ม `<mainClass>` ใน pom.xml plugin config |

---

## 3. สร้าง Angular Frontend

**Tech Stack:** Angular 22, keycloak-angular 22.0.0, keycloak-js

### โครงสร้างไฟล์
```
frontend/
  src/app/
    app.config.ts        - provideKeycloak + includeBearerTokenInterceptor
    app.routes.ts        - routes พร้อม authGuard
    app.ts               - root component
    core/auth/
      auth.guard.ts      - createAuthGuard redirect ไป Keycloak login
    features/
      home/              - หน้า Home
      profile/           - หน้า Profile (ดึง /api/user/me)
      login/             - หน้า Login redirect
  proxy.conf.json        - /api → http://localhost:8080
```

### ปัญหาที่พบและแก้
| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| TS2558: createAuthGuard 2 type args | type parameter syntax ผิด | เปลี่ยนเป็น single-arg form |
| Keycloak iframe error | checkLoginIframe default เป็น true | เพิ่ม `checkLoginIframe: false` |
| หน้าจอขาว | withAutoRefreshToken config ซับซ้อน | ลบออก ใช้ config เรียบง่าย |
| Keycloak client เสีย (clientId เปลี่ยนเป็น URL) | PowerShell PATCH body ผิดรูปแบบ | ใช้ curl PUT พร้อม UUID แก้ clientId กลับเป็น "shopping-car" |
| "Failed to load profile" (401 /api/user/me) | Bearer token ไม่ถูกส่งไป /api routes | เพิ่ม `INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG` กำหนด `urlPattern: /^\/api\//` |

---

## 4. Keycloak Configuration

- **Realm:** springbootAngularK8s
- **Client:** shopping-car
- **Redirect URIs:** http://localhost:4200/*
- **Web Origins:** http://localhost:4200
- **Google OAuth2 Client ID:** 328905389093-mg0uma02kmp6p9ij6obfcin0f7v4hfq7.apps.googleusercontent.com
- **Role:** admin

**Pending:** เพิ่ม Google OAuth2 Redirect URI ใน Google Cloud Console:  
`http://localhost:8082/realms/springbootAngularK8s/broker/google/endpoint`

---

## 5. Auth Flow (End-to-End)

```
Angular (localhost:4200)
  → Keycloak (localhost:8082) [login/register]
  → JWT Token
  → Angular เก็บ token + ส่งใน Authorization: Bearer header
  → Spring Boot (localhost:8080) validate token กับ Keycloak
  → บันทึก user ลง PostgreSQL (localhost:5434)
```

---

## 6. Git & Branch Strategy

- Commit: `authen version` push ขึ้น GitHub
- Branch flow: `master → dev → sit → uat`
- แตก branch dev, sit, uat เรียบร้อย

---

## 7. Docker

### Dockerfile.backend (`docker/Dockerfile.backend`)
```dockerfile
FROM maven:3.9-eclipse-temurin-25 AS build   # Java 25
# build jar
FROM eclipse-temurin:25-jre                  # runtime
```

### Dockerfile.frontend (`docker/Dockerfile.frontend`)
```dockerfile
FROM node:22-alpine AS build
# npm ci + ng build --configuration production
FROM nginx:alpine
# copy dist + nginx.conf
```

### ปัญหาที่พบและแก้
| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| Backend Docker build ล้มเหลว | Dockerfile ใช้ `eclipse-temurin:21` แต่โปรเจคต้องการ Java 25 | เปลี่ยนเป็น `maven:3.9-eclipse-temurin-25` + `eclipse-temurin:25-jre` |
| docker compose up port 8080 ชน | Spring Boot local process ยังรันอยู่ | Stop process PID 23960 แล้ว compose up ใหม่ |

---

## 8. สถานะปัจจุบัน (Docker Compose)

| Service | Port | Status |
|---|---|---|
| Frontend (Angular + nginx) | 4200 | Running |
| Backend (Spring Boot) | 8080 | Running |
| Keycloak | 8082 | Running |
| pgAdmin4 | 5050 | Running |
| Jenkins | 8084 | Running |
| PostgreSQL | 5434 | Healthy |

---

## 9. งานที่ยังเหลือ

- [ ] เพิ่ม Google OAuth2 Redirect URI ใน Google Cloud Console
- [ ] สร้าง Kubernetes manifests (`k8s/` ยังว่างอยู่)
- [ ] สร้าง Jenkinsfile สำหรับ CI/CD pipeline (dev → sit → uat)
- [ ] ทดสอบ register/login flow ผ่าน Docker containers
