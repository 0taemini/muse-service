# 운영 보조 도구

## Dozzle

Dozzle은 Docker 컨테이너 로그를 브라우저에서 확인하는 운영 보조 도구이다.
인터넷에 직접 공개하지 않도록 서버의 `127.0.0.1:9999`에만 바인딩한다.

### 서버 파일 작성

서버에서 직접 `docker-compose.ops.yml` 파일을 만든다.

```bash
cd /home/opc/apps/muse-service
vi docker-compose.ops.yml
```

내용:

```yaml
services:
  dozzle:
    image: amir20/dozzle:latest
    container_name: muse-dozzle
    restart: unless-stopped
    environment:
      TZ: Asia/Seoul
      DOZZLE_NO_ANALYTICS: "true"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "127.0.0.1:9999:8080"
```

### 실행

서버에서 실행한다.

```bash
cd /home/opc/apps/muse-service
docker compose -f docker-compose.ops.yml up -d
```

### 접속

로컬 PC에서 SSH 터널을 연다.

```bash
ssh -i <키파일경로> -L 9999:127.0.0.1:9999 opc@<서버IP>
```

브라우저에서 접속한다.

```text
http://127.0.0.1:9999
```

### 중지

```bash
cd /home/opc/apps/muse-service
docker compose -f docker-compose.ops.yml down
```

### 주의

Dozzle은 Docker 로그를 읽기 위해 Docker socket을 읽기 전용으로 마운트한다.
관리 UI를 외부에 공개하지 말고 SSH 터널로만 접근한다.
