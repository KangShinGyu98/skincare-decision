# infra/ — Docker / GitHub Actions / IaC

> 본 폴더는 EXECUTION_PLAN.md Phase 6에서 채워진다. 본 파일은 사양과 진입 규칙을 정의한다.

## 폴더 구조 (목표)

```
infra/
├─ AGENTS.md              ← 본 파일
├─ docker/
│  ├─ Dockerfile.backend
│  ├─ Dockerfile.frontend
│  └─ docker-compose.yml      ← 로컬 (Postgres, Redis, app, web)
├─ github-actions/
│  ├─ ci.yml                  ← lint + typecheck + test (PR/push)
│  ├─ build-and-push.yml      ← ECR push (main 머지)
│  └─ deploy.yml              ← ECS Fargate 배포 (수동 dispatch)
├─ aws/
│  ├─ ecs/                    ← task definition, service, ALB
│  ├─ rds/                    ← Postgres parameter group, snapshot 정책
│  ├─ elasticache/            ← Redis 7 subnet group / parameter group
│  ├─ s3-cloudfront/          ← S3 정적 자산 + CloudFront 배포
│  ├─ route53-acm/            ← 도메인 / 인증서
│  └─ iam/                    ← role / policy
└─ scripts/
   ├─ build-backend.sh
   ├─ build-frontend.sh
   └─ deploy.sh
```

## 환경 분리

- `local`: docker-compose (Postgres + Redis + backend + frontend hot reload)
- `dev`: AWS staging (ECS Fargate, RDS t4g.micro)
- `prod`: AWS prod (ECS Fargate, RDS t4g.small + Multi-AZ)

## 시크릿

- AWS Secrets Manager: `skincare-decision/{env}/database`, `skincare-decision/{env}/redis`, `skincare-decision/{env}/app`
- GitHub Actions: OIDC로 IAM role assume (long-lived AWS key 금지)

## 배포 흐름

1. PR → CI(lint + typecheck + test).
2. main 머지 → build-and-push → ECR.
3. 수동 dispatch (또는 main 자동) → deploy.yml → ECS service update.
4. CloudFront invalidation은 frontend 정적 자산이 바뀐 경우만.

## 진입 규칙

1. 새 환경/스택 추가 시 본 파일의 표를 갱신.
2. IAM 정책은 최소 권한으로(특정 ECR repo, 특정 Secrets prefix만).
3. RDS migration은 ECS deploy 전 별도 step에서 `prisma migrate deploy` 실행.
4. local docker-compose는 backend/frontend init 후 `infra/docker/docker-compose.yml`을 root로 옮기지 말고 본 폴더에서 관리.
