# Jenkins CI/CD Guide

## เข้าใช้งาน

URL: `http://localhost:8084`

### Login

ใช้ credentials จาก `.env`:

| Field | ค่า |
|---|---|
| Username | `JENKINS_ADMIN_USERNAME` |
| Password | `JENKINS_ADMIN_PASSWORD` |

---

### ถ้า Jenkins ถามรหัสผ่านครั้งแรก (Unlock Jenkins)

```powershell
kubectl logs -n dev deployment/jenkins | Select-String "initialAdminPassword" -A 2
```

หรือดูจาก log หา section นี้:

```
*************************************************************
Jenkins initial setup is required. An admin user has been created
and a password written to the console. Password: <ตัวเลข>
*************************************************************
```

---

## 1. ติดตั้ง Plugins ที่จำเป็น

**Manage Jenkins → Plugins → Available plugins**

ค้นหาและติดตั้ง (ถ้ายังไม่มี):

| Plugin | ใช้ทำอะไร |
|---|---|
| `Docker Pipeline` | รัน docker build/push ใน pipeline |
| `Kubernetes CLI` | รัน kubectl ใน pipeline |
| `Credentials Binding` | inject secret เข้า pipeline |
| `Git` | checkout code จาก GitHub |
| `Pipeline` | รัน Jenkinsfile |

กด **Install** แล้วรอจนเสร็จ → **Restart Jenkins**

---

## 2. เพิ่ม Credentials

**Manage Jenkins → Credentials → System → Global credentials → Add Credentials**

### 2.1 Docker Hub

| Field | ค่า |
|---|---|
| Kind | `Username with password` |
| Scope | Global |
| Username | Docker Hub username |
| Password | Docker Hub password หรือ Access Token |
| ID | `dockerhub-credentials` |
| Description | Docker Hub |

> แนะนำสร้าง Access Token แทน password ที่ Docker Hub → Account Settings → Security → New Access Token

### 2.2 GitHub (Personal Access Token)

> GitHub ไม่รับ password แล้ว ต้องใช้ PAT แทน — ค่าอยู่ใน `.env` ที่ key `GIT_TOKEN`

| Field | ค่า |
|---|---|
| Kind | `Username with password` |
| Scope | Global |
| Username | GitHub username (`BenzYeiei`) |
| Password | `GIT_TOKEN` จาก `.env` |
| ID | `github-credentials` |
| Description | GitHub PAT |

**ถ้า Add Credentials มีแค่ GitHub App:**
ไปที่ **Manage Jenkins → Plugins → Available plugins** ค้นหา `Credentials Binding` แล้วติดตั้ง จากนั้น restart Jenkins

### 2.3 Kubeconfig

| Field | ค่า |
|---|---|
| Kind | `Secret file` |
| Scope | Global |
| File | upload ไฟล์ `%USERPROFILE%\.kube\config` |
| ID | `kubeconfig` |
| Description | Kubernetes config |

---

## 3. สร้าง Pipeline Job

### 3.1 New Item

1. หน้าแรก → **New Item**
2. ใส่ชื่อ: `springboot-angular-k8s`
3. เลือก **Pipeline** → **OK**

### 3.2 ตั้งค่า Pipeline

**แท็บ General:**
- เช็ค `GitHub project`
- Project url: `https://github.com/BenzYeiei/springboot-angular-k8s`

**แท็บ Build Triggers:**
- เช็ค `GitHub hook trigger for GITScm polling` (ถ้าใช้ webhook)
- หรือ `Poll SCM` แล้วใส่ schedule: `H/5 * * * *` (check ทุก 5 นาที)

**แท็บ Pipeline:**

| Field | ค่า |
|---|---|
| Definition | `Pipeline script from SCM` |
| SCM | `Git` |
| Repository URL | `https://github.com/BenzYeiei/springboot-angular-k8s.git` |
| Credentials | เพิ่ม GitHub credentials ถ้า repo เป็น private |
| Branches to build | `*/dev` |
| Script Path | `Jenkinsfile` |

กด **Save**

---

## 4. รัน Pipeline

### รันด้วยตัวเอง
- เข้าไปใน job → **Build Now**

### ดู Progress
- คลิก build number ด้านซ้าย (เช่น `#1`)
- คลิก **Console Output** เพื่อดู log แบบ real-time

### Stage View
- หน้า job จะเห็น pipeline stages แบบ visual:
  ```
  Set Environment → Build → Push Images → Deploy to K8s
  ```

---

## 5. Pipeline Stages อธิบาย

```
Set Environment
  └─ กำหนด namespace ตาม branch
     dev   → namespace: dev
     sit   → namespace: sit
     uat   → namespace: uat

Build (parallel)
  ├─ Backend  → docker build springboot-angular-k8s-backend:<tag>
  └─ Frontend → docker build springboot-angular-k8s-frontend:<tag>

Push Images (เฉพาะ branch dev/sit/uat)
  ├─ docker tag → <dockerhub-user>/springboot-angular-k8s-backend:<tag>
  ├─ docker push
  └─ docker logout

Deploy to K8s
  ├─ kubectl apply -f k8s/ (แก้ namespace อัตโนมัติ)
  ├─ kubectl set image deployment/backend ...
  ├─ kubectl set image deployment/frontend ...
  └─ kubectl rollout status (รอให้ deploy เสร็จ)
```

**Image tag format:** `<branch>-<build-number>` เช่น `dev-42`

---

## 6. Multi-branch Flow

| Branch | Namespace | ทำอะไร |
|---|---|---|
| `dev` | `dev` | build + push + deploy |
| `sit` | `sit` | build + push + deploy |
| `uat` | `uat` | build + push + deploy |
| อื่นๆ | - | build อย่างเดียว ไม่ push/deploy |

### Promote จาก dev → sit

```bash
git checkout sit
git merge dev
git push origin sit
# Jenkins จะ trigger อัตโนมัติ (ถ้าตั้ง webhook/poll)
```

---

## 7. ตั้ง GitHub Webhook (auto trigger)

เพื่อให้ Jenkins build ทันทีเมื่อ push code

1. GitHub repo → **Settings → Webhooks → Add webhook**
2. Payload URL: `http://<jenkins-public-ip>:8084/github-webhook/`
3. Content type: `application/json`
4. Events: `Just the push event`
5. กด **Add webhook**

> หมายเหตุ: Jenkins ต้องเข้าถึงได้จาก internet ถ้าใช้ local ให้ใช้ ngrok หรือ poll SCM แทน

---

## 8. Troubleshooting

### Build fail — docker: permission denied
Jenkins pod ต้องเข้าถึง docker socket ได้ ตรวจสอบ:
```powershell
kubectl exec -n dev deployment/jenkins -- sh -c "docker ps"
```

### Push fail — unauthorized
ตรวจสอบ credential `dockerhub-credentials` ว่า username/password ถูกต้อง

### Deploy fail — Unable to connect to cluster
ตรวจสอบ credential `kubeconfig` ว่า upload ไฟล์ถูก และ cluster เข้าถึงได้จาก Jenkins pod

### ดู build log ย้อนหลัง
**Jenkins → job → Build History → #N → Console Output**
