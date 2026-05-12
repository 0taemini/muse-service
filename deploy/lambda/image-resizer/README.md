# Muse image-resizer Lambda

S3 `original/` 업로드 이벤트를 받아 WebP 리사이즈 이미지를 만들고 Spring Boot 백엔드에 결과를 콜백하는 Lambda입니다.

## 입력 key 규칙

```text
original/poster/{imageId}/{uuid}.jpg
original/memory/{imageId}/{uuid}.jpg
original/album/{imageId}/{uuid}.jpg
```

## 출력 key 규칙

```text
resized/poster/{imageId}/{uuid}_480.webp
resized/poster/{imageId}/{uuid}_1600.webp
resized/memory/{imageId}/{uuid}_320.webp
resized/memory/{imageId}/{uuid}_480.webp
resized/memory/{imageId}/{uuid}_1200.webp
resized/album/{imageId}/{uuid}_320.webp
resized/album/{imageId}/{uuid}_480.webp
resized/album/{imageId}/{uuid}_1200.webp
```

## Lambda 환경변수

```text
BACKEND_BASE_URL=https://api.example.com
BACKEND_CALLBACK_TOKEN=Spring Boot의 MUSE_IMAGE_LAMBDA_CALLBACK_TOKEN과 같은 값
OUTPUT_BUCKET=출력 S3 버킷명, 비우면 이벤트가 발생한 버킷 사용
```

## Lambda Role 권한

```text
s3:GetObject  arn:aws:s3:::버킷명/original/*
s3:PutObject  arn:aws:s3:::버킷명/resized/*
```

## 배포 zip 생성

Windows PowerShell 기준:

```powershell
npm run package
```

생성된 `image-resizer.zip`을 Lambda 함수 코드로 업로드합니다. `node_modules`와 zip 파일은 git에 포함하지 않습니다.

## S3 Event 설정

```text
Event type: s3:ObjectCreated:Put
Prefix: original/
Destination: 이 Lambda 함수
```

`resized/`에는 이벤트를 걸지 마세요. Lambda가 생성한 결과물로 다시 Lambda가 실행될 수 있습니다.
