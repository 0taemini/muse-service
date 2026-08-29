# 뮤즈 서비스 모니터링

Spring Boot, PostgreSQL, Redis 지표를 Prometheus가 수집하고 Grafana에서 조회한다.

## 로컬 실행

먼저 `backend` 디렉터리에서 Spring Boot를 8080 포트로 실행한다.

```bash
./gradlew bootRun
```

그다음 모니터링 profile을 포함해 인프라를 실행한다.

```bash
docker compose --profile monitoring up -d
```

- Grafana: http://localhost:3000 (`admin` / `admin`, 환경 변수로 변경 가능)
- Prometheus: http://localhost:9090
- 애플리케이션 상태: http://localhost:8080/actuator/health
- 애플리케이션 메트릭: http://localhost:8080/actuator/prometheus

Prometheus의 **Status > Targets**에서 `muse-backend`, `muse-postgres`, `muse-redis`가 모두 `UP`인지 확인한다.

## 운영 실행

운영 서버의 `.env`에 다음 값을 설정한다. CD는 `GRAFANA_ADMIN_PASSWORD`가 없으면 배포를 중단한다.

```dotenv
GRAFANA_ADMIN_USER=muse_monitor
GRAFANA_ADMIN_PASSWORD=충분히_강력한_비밀번호
PROMETHEUS_RETENTION=15d
PROMETHEUS_RETENTION_SIZE=5GB
```

`main` 브랜치 배포 시 CD가 모니터링 설정 파일을 서버로 전송하고 `monitoring` profile을 자동으로 실행한다. 서버에서 직접 실행할 때는 배포 디렉터리에서 다음 명령을 사용한다.

```bash
docker compose --profile monitoring --env-file .env -f docker-compose.prod.yml up -d
```

운영 환경의 Grafana와 Prometheus 포트는 보안을 위해 `127.0.0.1`에만 바인딩된다. SSH 터널로 접속한다.

```bash
ssh -L 3000:127.0.0.1:3000 -L 9090:127.0.0.1:9090 <서버>
```

Actuator는 `health`, `prometheus` endpoint만 노출하며 health 상세 정보는 공개하지 않는다.
