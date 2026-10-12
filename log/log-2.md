# Log-2: สรุปงานต่อจาก Log-1

**วันที่:** 2026-10-09  
**Project:** springboot-angular-k8s

---

## 1. แก้ไข Docker Backend Build (Java 25)

**ปัญหา:** `Dockerfile.backend` ใช้ `maven:3.9-eclipse-temurin-21-alpine` แต่โปรเจคต้องการ Java 25 → build ล้มเหลว

**วิธีแก้:** อัปเดต `docker/Dockerfile.backend`

```dockerfile
# เปลี่ยนจาก
FROM maven:3.9-eclipse-temurin-21-alpine AS build
FROM eclipse-temurin:21-jre-alpine

# เป็น
FROM maven:3.9-eclipse-temurin-25 AS build
FROM eclipse-temurin:25-jre
```

---

## 2. Docker Compose — Full Stack Up

ทุก container รันสำเร็จครั้งแรก:

| Service | Port | Image |
|---|---|---|
| Frontend (Angular + nginx) | 4200 | springboot-angular-k8s-frontend |
| Backend (Spring Boot) | 8080 | springboot-angular-k8s-backend |
| Keycloak | 8082 | quay.io/keycloak/keycloak:26.0 |
| pgAdmin4 | 5050 | dpage/pgadmin4 |
| Jenkins | 8084 | jenkins/jenkins |
| PostgreSQL | 5434 | postgres:18-alpine |

**ปัญหาระหว่างทาง:** port 8080 ชน เพราะ Spring Boot process local ยังรันอยู่ → kill PID แล้ว compose up ใหม่

---

## 3. Kubernetes Manifests (`k8s/`)

สร้าง manifests ครบทุก service ใน namespace `dev`

| ไฟล์ | เนื้อหา |
|---|---|
| `00-namespace.yaml` | Namespace `dev` |
| `01-secrets.yaml` | Secrets: postgres, keycloak, pgadmin |
| `02-postgres.yaml` | PVC 5Gi + Deployment + ClusterIP Service |
| `03-keycloak.yaml` | Deployment (KC_HOSTNAME_STRICT=false) + LoadBalancer :8082 |
| `04-pgadmin.yaml` | PVC 1Gi + Deployment + LoadBalancer :5050 |
| `05-jenkins.yaml` | PVC 10Gi + Deployment + LoadBalancer :8084/:50000 |
| `06-backend.yaml` | Deployment (health probe) + ClusterIP Service |
| `07-frontend.yaml` | ConfigMap(env.js) + Deployment (ConfigMap mount) + LoadBalancer :4200 |
| `08-ingress.yaml` | Nginx Ingress host `app.localhost` (optional) |

**Deploy command:**
```bash
kubectl apply -f k8s/
kubectl get pods -n dev
```

---

## 4. Angular Runtime Config (สำหรับ K8s env override)

ปัญหา: Keycloak URL hardcode ใน `app.config.ts` ทำให้เปลี่ยน per-environment ไม่ได้

**วิธีแก้:** ใช้ `window.env` ที่โหลดจาก `env.js` ก่อน Angular bootstrap

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `frontend/public/env.js` | ไฟล์ใหม่ — default values สำหรับ local dev |
| `frontend/src/index.html` | เพิ่ม `<script src="env.js"></script>` |
| `frontend/src/app/app.config.ts` | อ่าน `window.env?.KEYCLOAK_URL` พร้อม fallback |
| `k8s/07-frontend.yaml` | ConfigMap mount ทับ `/usr/share/nginx/html/env.js` |

ต่อไปนี้แต่ละ environment สามารถ override ค่า Keycloak URL ได้ผ่าน ConfigMap โดยไม่ต้อง rebuild image

---

## 5. Jenkins CI/CD Pipeline

### Dockerfile.jenkins (Custom Image)

`docker/Dockerfile.jenkins` extends `jenkins/jenkins:latest` + ติดตั้ง:
- **Docker CLI** (docker-ce-cli) — สำหรับ build/push images
- **kubectl** — สำหรับ deploy ไปยัง K8s
- เพิ่ม `jenkins` user เข้า `docker` group

### Jenkinsfile (Pipeline)

```
Set Environment → Build (parallel) → Push Images → Deploy to K8s
```

| Stage | รายละเอียด |
|---|---|
| Set Environment | branch → DEPLOY_ENV (dev/sit/uat) |
| Build | parallel: backend + frontend Docker image |
| Push Images | tag + push ไป Docker Hub (when: dev/sit/uat only) |
| Deploy to K8s | kubectl apply + set image + rollout status |

**Image tag format:** `<branch>-<build_number>` เช่น `dev-42`, `sit-7`

**Branch → Namespace mapping:**
```
dev  →  namespace: dev
sit  →  namespace: sit
uat  →  namespace: uat
```

### Jenkins Credentials ที่ต้องตั้งใน UI

| ID | Type | ใช้สำหรับ |
|---|---|---|
| `dockerhub-credentials` | Username/Password | docker login + image tag |
| `kubeconfig` | Secret file | kubectl deploy |

### docker-compose.yml — Jenkins Service Update

```yaml
jenkins:
  build:
    context: .
    dockerfile: docker/Dockerfile.jenkins   # ใช้ custom image
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock  # Docker-in-Docker
    - jenkins_data:/var/jenkins_home
```

### k8s/05-jenkins.yaml Update

เพิ่ม Docker socket mount สำหรับ Jenkins ใน K8s:
```yaml
volumes:
  - name: docker-socket
    hostPath:
      path: /var/run/docker.sock
      type: Socket
```

---

## 6. Rebuild Jenkins Container

```bash
docker compose up -d --build jenkins
```

ผลลัพธ์: Jenkins image ใหม่มี Docker CLI 29.9.0 และ kubectl v1.37.1 พร้อมใช้งาน

---

## 7. สถานะ Kubernetes

Docker Desktop Kubernetes เพิ่งเปิด — ยังรอ initialize (kubeconfig ยังไม่ถูกสร้าง)

ขั้นตอนถัดไปหลัง K8s ready:
```bash
kubectl config get-contexts   # ควรเห็น docker-desktop context
kubectl config view --minify --raw > kubeconfig.yaml
# นำ kubeconfig.yaml ไปสร้าง credential "kubeconfig" ใน Jenkins UI
```

---

## 8. งานที่ยังเหลือ

- [ ] รอ Docker Desktop Kubernetes initialize เสร็จ → export kubeconfig
- [ ] ตั้งค่า credential `dockerhub-credentials` ใน Jenkins UI
- [ ] ตั้งค่า credential `kubeconfig` ใน Jenkins UI
- [ ] สร้าง Multibranch Pipeline job ใน Jenkins ชี้ไป GitHub repo
- [ ] ทดสอบ pipeline รันครั้งแรก (branch dev)
- [ ] deploy ไปยัง K8s namespace `dev` และทดสอบ
- [ ] เพิ่ม Google OAuth2 Redirect URI ใน Google Cloud Console
