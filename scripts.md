### 1. Chạy project LOCAL

```bash
npm install
npm run start:dev
```

### 2. Prisma – Database

## Generate Prisma Client
```bash
docker compose exec backend npx prisma generate 
```

## Tạo migration mới
```bash
npx prisma migrate dev --name <migration_name>
```

## Mở Prisma Studio
```bash
docker compose exec backend sh npx prisma studio --port 5555
```

### 3. Docker

## Build & run containers
```bash
docker compose up --build
```

## Run ngầm
```bash
docker compose up -d
```

## Stop containers
```bash
docker compose down
```

## Vào container backend
```bash
docker compose exec backend sh
```

## Xem log backend trực tiếp 
```bash
docker compose logs -f backend
```