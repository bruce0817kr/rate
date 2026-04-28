# GTP Rate Firewall Nginx Config

`ai.gtp.or.kr` 앞단 방화벽 PC의 Nginx에 `/gtp_rate` 앱을 연결하기 위한 복사용 문서다.

## 목적

- `https://ai.gtp.or.kr/gtp_rate` 를 `218.38.240.188:3033` 프론트엔드로 프록시
- `https://ai.gtp.or.kr/gtp_rate/api/*` 를 `218.38.240.188:3030/api/*` 백엔드로 프록시
- `/gtp_rate` 접속 시 `/gtp_rate/` 로 정규화

## 적용 블록

아래 3개 블록을 `server { listen 8443 ssl; ... }` 안에 추가한다.

```nginx
location = /gtp_rate {
    return 301 /gtp_rate/;
}

location /gtp_rate/api/ {
    proxy_pass http://218.38.240.188:3030/api/;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

location /gtp_rate/ {
    proxy_pass http://218.38.240.188:3033/;

    add_header X-Debug-IP "Real-$remote_addr-Forwarded-$http_x_forwarded_for";

    proxy_set_header Host $host;

    proxy_redirect https://ai.gtp.or.kr:8443/ /;
    proxy_redirect http://ai.gtp.or.kr:8443/ /;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    access_log /var/log/nginx/ip_debug.log debug_ip;
}
```

## 배치 위치

- `location /gtp_rate/api/` 는 `location /gtp_rate/` 보다 위에 둔다.
- `location = /gtp_rate` 는 `/gtp_rate/` 블록 위에 둔다.
- 기존 `location / { ... }` 보다 앞에 두는 편이 안전하다.

## 교체 대상

기존에 아래처럼 되어 있었다면:

```nginx
location /gtp_rate/ {
    proxy_pass http://218.38.240.188:3033/;

    add_header X-Debug-IP "Real-$remote_addr-Forwarded-$http_x_forwarded_for";

    sub_filter 'href="/static/' 'href="/gtp_rate/static/';
    sub_filter 'src="/static/' 'src="/gtp_rate/static/';

    proxy_set_header Host $host;

    proxy_redirect https://ai.gtp.or.kr:8443/ /;
    proxy_redirect http://ai.gtp.or.kr:8443/ /;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    access_log /var/log/nginx/ip_debug.log debug_ip;
}
```

이제는 위 `sub_filter` 2줄은 제거해도 된다. 앱 자체가 `/gtp_rate` 하위 경로를 처리하도록 수정돼 있다.

## 적용 후 명령

```bash
nginx -t
nginx -s reload
```

시스템 서비스 기반이면:

```bash
systemctl reload nginx
```

## 확인 항목

브라우저 확인:

- `https://ai.gtp.or.kr/gtp_rate`
- `https://ai.gtp.or.kr/gtp_rate/login`

로그인 확인:

- 운영 관리자 계정으로 로그인한다.

API 경로 확인:

- 로그인 요청이 `https://ai.gtp.or.kr/gtp_rate/api/auth/login` 으로 나가야 함

## 빠른 점검 명령

```bash
curl -I https://ai.gtp.or.kr/gtp_rate
curl -I https://ai.gtp.or.kr/gtp_rate/login
curl -i -X POST https://ai.gtp.or.kr/gtp_rate/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<ADMIN_USERNAME>","password":"<ADMIN_PASSWORD>"}'
```

## 참고

- 프론트엔드: `218.38.240.188:3033`
- 백엔드: `218.38.240.188:3030`
- `/gtp_rate` exact path redirect가 없으면 요청이 다른 기본 `location /` 로 빠질 수 있다.
