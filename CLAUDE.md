# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
- โปรเจคเน้น tech stack ให้ทำงานได้ มีหน้าจอ home, login, register
- ใช้ keycloak จัดการ user
- สามารถใช้ oauth2 จาก google ได้โดยใช้ clientid 328905389093-mg0uma02kmp6p9ij6obfcin0f7v4hfq7.apps.googleusercontent.com
- สามารถสมัครโดยตรง แค่มี email และ password
- ข้อมูล user ต้องถูกบันทึกลง postgesql
- การเข้าถึง database จาก admin ผ่าน pgadmin4
- มีการแตก branch dev, sit และ uat ทำที่ dev และจัดการ deploy ไปแต่ละ branch
- Branch flow: dev → sit → uat, deploy ผ่าน Jenkins CD/CI


## Auth Flow

### Overview
- Angular ใช้ `keycloak-angular` redirect ไป Keycloak → ได้ JWT token → ส่งใน `Authorization: Bearer` header ทุก request ไปหา Spring Boot
- รองรับ 2 วิธี login: สมัครตรงด้วย email/password และ OAuth2 ผ่าน Google

### Spring Boot
- ใช้ `spring-boot-starter-oauth2-resource-server` validate token กับ Keycloak
- `issuer-uri`: http://keycloak:8082/realms/springbootAngularK8s

### Keycloak Config
- Realm: springbootAngularK8s
- Client: //shopping-car
- Google OAuth2 Client ID: `328905389093-mg0uma02kmp6p9ij6obfcin0f7v4hfq7.apps.googleusercontent.com`
- Roles: admin

### User Sync Strategy
- Keycloak Event Listener SPI → บันทึก user ลง PostgreSQL อัตโนมัติเมื่อ register

## Service Ports

| Service | Port |
|---|---|
| Spring Boot | 8080 |
| Angular | 4200 |
| Keycloak | 8082 |
| PostgreSQL | 5434 |
| pgAdmin4 | 5050 |
| Jenkins | 8084 (UI) / 50000 (agent) |
| nginx | 80 / 443 |

## Tech Stack

- **Backend:** Spring Boot (Java 25)
- **Frontend:** Angular (TypeScript)
- **Orchestration:** Kubernetes
- **Database:** Postgresql (postgres:18-alpine)
- dpage/pgadmin4 (latest)
- **Oauth2:** Keycloak (26.0)
- **CD/CI:** Jenkins (latest)
- nginx

## Repository Structure

```
backend/       Spring Boot application
frontend/      Angular application
k8s/           Kubernetes manifests
docker/        Dockerfiles
```


## Backend (Spring Boot)

### Build & Run

```bash
# Build
cd backend
./mvnw clean package

# Run locally
./mvnw spring-boot:run

# Run tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=ClassName

# Run a single test method
./mvnw test -Dtest=ClassName#methodName
```

<!-- Fill in: active profiles, environment variables required, port -->

### Architecture

<!-- Fill in: package structure, key layers (controller/service/repository), DB, auth mechanism -->

## Frontend (Angular)

### Build & Run

```bash
# Install dependencies
cd frontend
npm install

# Run dev server (default: http://localhost:4200)
ng serve

# Build for production
ng build --configuration production

# Run tests
ng test

# Run a single spec file
ng test --include='**/some.spec.ts'

# Lint
ng lint
```

<!-- Fill in: proxy config, environment files, key libraries -->

### Architecture

<!-- Fill in: module structure, state management, API base URL config -->

## Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check pod status
kubectl get pods -n <namespace>

# View logs
kubectl logs -f deployment/<name> -n <namespace>
```

<!-- Fill in: namespace, cluster context, required secrets/configmaps -->

## Docker

```bash
# Build backend image
docker build -t <image>:<tag> ./backend

# Build frontend image
docker build -t <image>:<tag> ./frontend

# Run with docker compose (if applicable)
docker compose up
```

<!-- Fill in: image registry, compose file location -->

## Environment Variables

<!-- List required env vars per service, e.g.:
| Variable | Service | Description |
|---|---|---|
| DB_URL | backend | JDBC connection string |
| API_URL | frontend | Backend base URL |
-->

## Notes

<!-- Any gotchas, known issues, or non-obvious decisions worth documenting -->
