# CORS (Cross-Origin Resource Sharing)

## 1. 개요

CORS(Cross-Origin Resource Sharing, 교차 출처 리소스 공유)는 브라우저에서 실행되는 웹 애플리케이션이 서로 다른 출처(Origin)의 서버 리소스에 접근할 수 있도록 허용하는 HTTP 헤더 기반 메커니즘입니다.

웹 브라우저는 기본적으로 Same-Origin Policy(동일 출처 정책)를 적용하여 다른 출처의 리소스에 대한 JavaScript의 접근을 제한합니다.

예를 들어 React 애플리케이션과 NestJS API 서버가 서로 다른 포트에서 실행되는 경우 두 애플리케이션은 서로 다른 Origin에 해당합니다.

```text
React Application
http://localhost:5173
        |
        | HTTP Request
        v
NestJS API Server
http://localhost:3000
```

이러한 환경에서 브라우저가 API 응답을 JavaScript에 제공하려면 서버가 적절한 CORS 응답 헤더를 반환해야 합니다.

NestJS는 `enableCors()` 메서드와 애플리케이션 생성 옵션을 통해 CORS를 설정할 수 있습니다.

이 문서에서는 CORS의 동작 원리를 이해하고, NestJS에서 CORS를 구성하는 방법과 보안상 주의해야 할 사항을 설명합니다.

---

## 2. Origin

Origin은 웹 리소스의 출처를 식별하는 개념입니다.

일반적으로 다음 세 가지 요소로 구성됩니다.

```text
Origin = Scheme + Host + Port
```

예를 들어 다음 URL을 살펴볼 수 있습니다.

```text
https://api.example.com:8443/users
```

각 구성 요소는 다음과 같습니다.

| 구성 요소 | 값 | 설명 |
|---|---|---|
| Scheme | https | 통신 프로토콜 |
| Host | api.example.com | 호스트 이름 |
| Port | 8443 | 네트워크 포트 |
| Path | /users | 리소스 경로이며 Origin에 포함되지 않습니다. |

따라서 위 URL의 Origin은 다음과 같습니다.

```text
https://api.example.com:8443
```

### 2.1. Same-Origin

두 URL의 Scheme, Host, Port가 모두 동일하면 Same-Origin으로 판단합니다.

기준 URL이 `https://example.com`인 경우 다음과 같습니다.

| URL | 동일 Origin | 이유 |
|---|---|---|
| https://example.com/users | O | Scheme, Host, Port 동일 |
| https://example.com/articles | O | Path만 다름 |
| http://example.com | X | Scheme이 다름 |
| https://api.example.com | X | Host가 다름 |
| https://example.com:8443 | X | Port가 다름 |
| https://other.example.com | X | Host가 다름 |

HTTPS의 기본 포트는 443이고 HTTP의 기본 포트는 80입니다.

따라서 `https://example.com`과 `https://example.com:443`은 동일한 Origin으로 취급됩니다.

### 2.2. Cross-Origin

다음과 같이 React와 NestJS가 서로 다른 Origin에서 실행된다면 Cross-Origin 요청에 해당합니다.

```text
Frontend
http://localhost:5173

Backend
http://localhost:3000
```

Host와 Scheme이 같더라도 Port가 다르므로 두 애플리케이션은 서로 다른 Origin입니다.

브라우저는 이러한 요청에 대해 CORS 정책을 적용합니다.

---

## 3. Same-Origin Policy

Same-Origin Policy는 서로 다른 Origin에서 로드된 문서나 스크립트 사이의 상호작용을 제한하는 브라우저 보안 정책입니다.

이 정책은 악의적인 웹사이트가 사용자가 로그인한 다른 웹사이트의 민감한 정보를 임의로 읽는 것을 방지하는 데 중요한 역할을 합니다.

예를 들어 사용자가 은행 웹사이트에 로그인한 상태에서 악의적인 웹사이트를 방문했다고 가정합니다.

```text
Malicious Website
https://attacker.example
        |
        | JavaScript Request
        v
Bank API
https://bank.example
```

Same-Origin Policy와 CORS는 악의적인 웹사이트의 JavaScript가 은행 API의 응답을 읽을 수 있는지 제한합니다.

단, Same-Origin Policy가 모든 Cross-Origin HTTP 요청의 전송 자체를 차단하는 것은 아닙니다.

일부 요청은 실제 서버에 전달될 수 있으며, 브라우저가 응답을 JavaScript에 노출하지 않는 방식으로 제한합니다.

이 때문에 CORS는 인증, 인가 또는 CSRF 방어를 대체하지 못합니다.

---

## 4. CORS 동작 원리

CORS는 브라우저와 서버가 HTTP 요청 및 응답 헤더를 이용하여 Cross-Origin 접근 가능 여부를 판단하는 방식입니다.

브라우저는 요청에 `Origin` 헤더를 포함할 수 있으며, 서버는 `Access-Control-Allow-Origin` 등의 응답 헤더로 허용 정책을 전달합니다.

### 4.1. 기본 요청 흐름

```text
Browser
  |
  | GET /users
  | Origin: http://localhost:5173
  v
NestJS Server
  |
  | HTTP/1.1 200 OK
  | Access-Control-Allow-Origin:
  |   http://localhost:5173
  v
Browser
  |
  | CORS 정책 검사
  v
JavaScript에서 응답 접근 허용
```

서버가 요청 Origin을 허용하면 브라우저는 해당 응답을 JavaScript 코드에 노출할 수 있습니다.

반대로 서버가 적절한 CORS 헤더를 반환하지 않거나 허용되지 않은 Origin을 반환하면 브라우저가 응답 접근을 차단합니다.

### 4.2. CORS 요청 예제

클라이언트 요청은 다음과 같습니다.

```http
GET /users HTTP/1.1
Host: localhost:3000
Origin: http://localhost:5173
```

서버가 해당 Origin을 허용한다면 다음과 같은 응답을 반환할 수 있습니다.

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json

[
  {
    "id": 1,
    "name": "Alice"
  }
]
```

브라우저는 `Access-Control-Allow-Origin` 헤더를 확인하여 응답 접근 가능 여부를 판단합니다.

---

## 5. Simple Request와 Preflight Request

CORS 요청은 요청 조건에 따라 Preflight Request가 필요한 경우와 그렇지 않은 경우로 구분할 수 있습니다.

### 5.1. Simple Request

일정한 조건을 만족하는 Cross-Origin 요청은 별도의 Preflight Request 없이 실제 요청을 먼저 전송할 수 있습니다.

일반적으로 다음 조건을 만족해야 합니다.

- HTTP Method가 GET, HEAD, POST 중 하나입니다.
- 요청 헤더가 CORS-safelisted Request Header의 조건을 만족합니다.
- Content-Type을 명시했다면 허용되는 Media Type 및 추가 제약을 만족해야 합니다.

대표적인 허용 Content-Type은 다음과 같습니다.

```text
application/x-www-form-urlencoded
multipart/form-data
text/plain
```

예를 들어 다음 요청은 다른 조건도 충족한다면 Preflight 없이 전송될 수 있습니다.

```javascript
fetch('http://localhost:3000/users');
```

중요한 점은 Preflight가 없더라도 CORS 검사가 생략되는 것은 아니라는 사실입니다.

브라우저는 실제 응답의 CORS 헤더를 확인합니다.

### 5.2. Preflight Request

Preflight Request는 브라우저가 실제 Cross-Origin 요청을 전송하기 전에 서버의 허용 정책을 확인하기 위해 보내는 사전 요청입니다.

HTTP `OPTIONS` Method를 사용합니다.

예를 들어 다음과 같은 조건에서는 일반적으로 Preflight가 발생합니다.

- PUT, PATCH, DELETE 등의 Method를 사용하는 경우
- `Authorization`과 같은 CORS-safelisted 범위 밖의 요청 헤더를 사용하는 경우
- `Content-Type: application/json`을 사용하는 경우

### 5.3. Preflight 동작 흐름

```text
Browser
    |
    | OPTIONS /users
    | Origin: http://localhost:5173
    | Access-Control-Request-Method: POST
    | Access-Control-Request-Headers:
    |   content-type, authorization
    v
NestJS Server
    |
    | Access-Control-Allow-Origin:
    |   http://localhost:5173
    | Access-Control-Allow-Methods: POST
    | Access-Control-Allow-Headers:
    |   Content-Type, Authorization
    v
Browser
    |
    | Preflight 응답 검사
    |
    +---- 허용되지 않음 ----> 요청 중단
    |
    v
POST /users
    |
    v
NestJS Controller
    |
    v
HTTP Response
```

Preflight 검사가 성공하면 브라우저는 실제 요청을 전송합니다.

### 5.4. Preflight 요청 예제

```http
OPTIONS /users HTTP/1.1
Host: localhost:3000
Origin: http://localhost:5173
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type,authorization
```

서버는 다음과 같이 응답할 수 있습니다.

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE
Access-Control-Allow-Headers: Content-Type,Authorization
Access-Control-Max-Age: 600
```

`Access-Control-Max-Age`는 브라우저가 Preflight 결과를 캐시할 수 있는 시간을 초 단위로 지정합니다.

다만 브라우저 자체의 최대 캐시 시간 제한이 우선 적용될 수 있습니다.

Preflight 요청 자체에는 일반적으로 Cookie 등의 Credentials가 포함되지 않으므로, 서버에서 Preflight 요청을 인증된 API 요청과 동일하게 처리하지 않도록 주의해야 합니다.

---

## 6. CORS 관련 HTTP Header

CORS는 여러 HTTP 헤더를 조합하여 동작합니다.

### 6.1. Request Header

| Header | 설명 |
|---|---|
| Origin | 요청을 발생시킨 Origin을 나타냅니다. |
| Access-Control-Request-Method | Preflight에서 실제 요청에 사용할 HTTP Method를 전달합니다. |
| Access-Control-Request-Headers | Preflight에서 실제 요청에 사용할 추가 Header를 전달합니다. |

### 6.2. Response Header

| Header | 설명 |
|---|---|
| Access-Control-Allow-Origin | 응답 접근을 허용할 Origin을 지정합니다. |
| Access-Control-Allow-Methods | 허용되는 HTTP Method를 지정합니다. |
| Access-Control-Allow-Headers | 허용되는 요청 Header를 지정합니다. |
| Access-Control-Allow-Credentials | Credentials를 포함한 Cross-Origin 응답의 노출 허용 여부를 지정합니다. |
| Access-Control-Expose-Headers | JavaScript에서 접근할 수 있는 추가 응답 Header를 지정합니다. |
| Access-Control-Max-Age | Preflight 결과의 캐시 시간을 지정합니다. |

### 6.3. Access-Control-Allow-Origin

```http
Access-Control-Allow-Origin: https://app.example.com
```

특정 Origin의 접근을 허용합니다.

자격 증명을 포함하지 않는 공개 리소스에는 다음과 같이 설정할 수도 있습니다.

```http
Access-Control-Allow-Origin: *
```

`*`는 모든 Origin을 허용하는 Wildcard입니다.

다만 Credentials를 포함한 Cross-Origin 요청에서는 `Access-Control-Allow-Origin: *`를 사용할 수 없습니다.

### 6.4. Access-Control-Allow-Credentials

```http
Access-Control-Allow-Credentials: true
```

Credentials를 포함한 Cross-Origin 요청의 응답을 브라우저에서 사용할 수 있도록 허용합니다.

주로 Cookie 기반 인증에서 중요한 설정입니다.

다만 이 헤더를 설정한다고 해서 Cookie가 자동으로 전송되는 것은 아닙니다.

브라우저의 Credentials 설정과 Cookie 속성 및 브라우저 정책도 함께 충족해야 합니다.

### 6.5. Access-Control-Expose-Headers

브라우저 JavaScript가 기본적으로 읽을 수 있는 응답 헤더는 제한되어 있습니다.

사용자 정의 응답 헤더를 읽어야 하는 경우 다음과 같이 설정할 수 있습니다.

```http
Access-Control-Expose-Headers: X-Request-Id
```

예를 들어 클라이언트에서는 다음과 같이 읽을 수 있습니다.

```typescript
const response = await fetch(
  'https://api.example.com/users',
);

const requestId = response.headers.get('X-Request-Id');
```

서버에서 해당 헤더를 실제로 반환해야 하며, Cross-Origin 응답의 CORS 검사도 성공해야 합니다.

---

## 7. NestJS에서 CORS 활성화

NestJS는 `enableCors()`를 이용하여 CORS를 활성화할 수 있습니다.

### 7.1. 기본 설정

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

`app.enableCors()`를 호출하면 기본 CORS 설정이 적용됩니다.

Express 기반 NestJS에서는 내부적으로 `cors` Middleware를 사용합니다.

인자를 전달하지 않은 기본 설정은 Origin에 `*`를 허용하므로, 실제 운영 환경에서는 허용할 Origin을 명시하는 것이 좋습니다.

### 7.2. NestFactory.create() 옵션 사용

애플리케이션을 생성할 때 CORS를 활성화할 수도 있습니다.

```typescript
const app = await NestFactory.create(AppModule, {
  cors: true,
});
```

또는 설정 객체를 전달할 수 있습니다.

```typescript
const app = await NestFactory.create(AppModule, {
  cors: {
    origin: 'http://localhost:5173',
  },
});
```

`enableCors()`와 `NestFactory.create()`의 `cors` 옵션은 모두 CORS를 구성하기 위한 방법입니다.

일반적으로 한 가지 방식을 선택하여 일관되게 관리하는 것이 좋습니다.

---

## 8. CORS 설정 옵션

`enableCors()`에는 다양한 설정 옵션을 전달할 수 있습니다.

### 8.1. 주요 옵션

| 옵션 | 설명 |
|---|---|
| `origin` | 접근을 허용할 Origin을 지정합니다. |
| `methods` | 허용할 HTTP Method를 지정합니다. |
| `allowedHeaders` | 요청에 허용할 Header를 지정합니다. |
| `exposedHeaders` | 클라이언트에 노출할 응답 Header를 지정합니다. |
| `credentials` | Credentials가 포함된 Cross-Origin 요청을 허용할지 설정합니다. |
| `maxAge` | Preflight 결과의 캐시 시간을 초 단위로 지정합니다. |
| `preflightContinue` | Preflight 요청을 다음 Handler로 전달할지 지정합니다. |
| `optionsSuccessStatus` | 성공한 Preflight 응답의 HTTP 상태 코드를 설정합니다. |

이 옵션들은 사용하는 HTTP Adapter의 CORS 구현에 따라 지원 범위나 타입이 달라질 수 있습니다.

### 8.2. 일반적인 설정 예제

```typescript
app.enableCors({
  origin: [
    'http://localhost:5173',
    'https://app.example.com',
  ],
  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
  ],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
  ],
  exposedHeaders: [
    'X-Request-Id',
  ],
  credentials: true,
  maxAge: 600,
  optionsSuccessStatus: 204,
});
```

위 설정의 의미는 다음과 같습니다.

1. 지정된 두 Origin만 Cross-Origin 접근을 허용합니다.
2. 명시된 HTTP Method를 허용합니다.
3. Content-Type 및 Authorization 요청 헤더를 허용합니다.
4. 브라우저 JavaScript에 X-Request-Id 응답 헤더를 노출합니다.
5. Credentials를 포함한 Cross-Origin 요청을 지원합니다.
6. Preflight 결과를 최대 600초 동안 캐시하도록 안내합니다.

`methods` 및 `allowedHeaders`는 CORS 검사에 사용되는 설정이며, 실제 API의 Method 지원 여부나 인증 권한까지 결정하지는 않습니다.

---

## 9. 환경변수를 이용한 CORS 설정

개발 환경과 운영 환경에서는 허용해야 하는 Origin이 다를 수 있습니다.

예를 들어 다음과 같이 구성할 수 있습니다.

| 환경 | 허용 Origin |
|---|---|
| Development | http://localhost:5173 |
| Staging | https://staging.example.com |
| Production | https://app.example.com |

Origin을 소스 코드에 직접 작성하지 않고 환경변수를 통해 관리할 수 있습니다.

### 9.1. 패키지 설치

```bash
npm install @nestjs/config
```

### 9.2. 환경변수 정의

```dotenv
CORS_ORIGINS=http://localhost:5173,https://app.example.com
```

Origin이 여러 개라면 쉼표로 구분하여 전달합니다.

### 9.3. ConfigModule 등록

```typescript
// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

실제 프로젝트에서는 기존 AppModule의 다른 Module 구성을 유지해야 합니다.

### 9.4. main.ts 구성

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const allowedOrigins = configService
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must not be empty');
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

이 방식에서는 애플리케이션을 재배포하거나 환경변수를 변경하여 Origin 허용 목록을 관리할 수 있습니다.

운영 환경에서는 잘못된 설정이나 빈 Origin 목록이 적용되지 않도록 환경변수 검증을 추가하는 것이 좋습니다.

---

## 10. Dynamic Origin 설정

허용할 Origin을 요청에 따라 동적으로 판단해야 하는 경우 Callback을 사용할 수 있습니다.

예를 들어 여러 프론트엔드 애플리케이션이 하나의 NestJS API를 사용하는 경우에 활용할 수 있습니다.

### 10.1. Callback 기반 설정

다음 예제는 Express 기반 CORS Middleware의 Origin Callback 방식을 사용합니다.

```typescript
const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://app.example.com',
]);

app.enableCors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, false);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
});
```

동작은 다음과 같습니다.

- 허용 목록에 포함된 Origin이면 CORS 허용 헤더를 반환합니다.
- 허용 목록에 없는 Origin이면 CORS 허용 헤더를 반환하지 않습니다.
- Origin 헤더가 없는 요청에도 CORS를 허용하지 않습니다.

`Origin`이 없는 요청에 대해 CORS 헤더를 반환하지 않는다는 것이 해당 HTTP 요청 자체를 차단한다는 의미는 아닙니다.

이러한 요청에 대한 인증과 접근 제어는 별도로 수행해야 합니다.

### 10.2. Origin을 그대로 반영하는 설정

```typescript
app.enableCors({
  origin: true,
  credentials: true,
});
```

위 설정은 요청의 Origin을 응답에 반영하는 방식입니다.

모든 요청 Origin을 사실상 허용할 수 있으므로 운영 환경의 인증된 API에서 무분별하게 사용하지 않아야 합니다.

특히 `credentials: true`와 조합할 경우 허용되지 않은 웹사이트가 인증된 사용자의 API 응답을 읽을 위험이 있습니다.

---

## 11. Cookie 기반 인증과 CORS

Cookie 기반 인증에서는 CORS 설정과 Cookie 속성 및 브라우저의 Credentials 정책을 함께 고려해야 합니다.

### 11.1. NestJS 설정

```typescript
app.enableCors({
  origin: 'https://app.example.com',
  credentials: true,
});
```

서버는 해당 Origin에서 Credentials를 포함한 요청에 접근할 수 있도록 허용합니다.

### 11.2. React 클라이언트 설정

```typescript
const response = await fetch(
  'https://api.example.com/auth/profile',
  {
    method: 'GET',
    credentials: 'include',
  },
);

const data = await response.json();
```

`credentials: 'include'`는 Cross-Origin 요청에서도 브라우저의 자격 증명 전송 정책에 따라 Cookie 등을 포함하도록 지정합니다.

다만 Cookie가 실제 전송되려면 Domain, Path, SameSite, Secure 등의 속성과 브라우저 정책을 충족해야 합니다.

### 11.3. Cookie 속성

| 속성 | 설명 |
|---|---|
| HttpOnly | JavaScript를 통한 Cookie 직접 접근을 제한합니다. |
| Secure | 보안 연결을 통한 Cookie 전송을 요구합니다. |
| SameSite | Cross-Site 요청에서 Cookie 전송 범위를 제어합니다. |
| Domain | Cookie가 적용될 도메인 범위를 지정합니다. |
| Path | Cookie가 적용될 URL 경로를 지정합니다. |

서로 다른 Site 간 Cookie 전송이 필요한 경우에는 일반적으로 다음 설정을 고려합니다.

```http
Set-Cookie: session=example; HttpOnly; Secure; SameSite=None; Path=/
```

다만 Cross-Origin과 Cross-Site는 동일한 개념이 아닙니다.

예를 들어 다음 두 주소는 서로 다른 Origin이지만 일반적으로 동일한 Site에 해당할 수 있습니다.

```text
https://app.example.com
https://api.example.com
```

따라서 서로 다른 Origin이라는 이유만으로 항상 `SameSite=None`을 설정해야 하는 것은 아닙니다.

Cookie 설정은 실제 배포 도메인과 인증 구조에 따라 결정해야 합니다.

### 11.4. Wildcard와 Credentials

다음과 같은 조합은 브라우저의 Credentialed CORS 요청에서 허용되지 않습니다.

```typescript
app.enableCors({
  origin: '*',
  credentials: true,
});
```

Credentials를 포함한 요청을 허용하려면 명시적인 Origin을 지정해야 합니다.

```typescript
app.enableCors({
  origin: 'https://app.example.com',
  credentials: true,
});
```

---

## 12. JWT 인증과 CORS

JWT 기반 인증에서는 클라이언트가 Authorization 헤더에 Access Token을 포함하여 요청하는 경우가 많습니다.

```http
GET /users/me
Authorization: Bearer <access_token>
```

### 12.1. NestJS 설정

```typescript
app.enableCors({
  origin: 'https://app.example.com',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
  ],
});
```

`Authorization`은 CORS-safelisted Request Header가 아니므로 Cross-Origin 요청에 포함되면 일반적으로 Preflight Request가 필요합니다.

### 12.2. 클라이언트 요청

```typescript
const response = await fetch(
  'https://api.example.com/users/me',
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  },
);
```

위 요청에서 브라우저는 필요한 경우 Preflight를 수행하고 서버가 Authorization 헤더를 허용하는지 확인합니다.

### 12.3. Credentials 옵션과의 관계

Authorization 헤더를 JavaScript에서 명시적으로 설정하는 Bearer Token 방식에서는 Cookie 인증과 동일한 설정이 반드시 필요한 것은 아닙니다.

특히 다음 설정은 모든 JWT API에서 필수인 것은 아닙니다.

```typescript
credentials: true
```

Access Token을 Authorization 헤더로 전달하고 Cookie를 사용하지 않는 경우에는 일반적으로 `credentials: true`를 설정할 필요가 없습니다.

반대로 JWT를 Cookie에 저장하고 자동으로 전송하는 구조라면 Cookie 기반 인증의 CORS 요구사항을 따라야 합니다.

---

## 13. CORS와 CSRF

CORS와 CSRF는 모두 브라우저 보안과 관련되지만 해결하는 문제가 다릅니다.

### 13.1. CORS

CORS는 Cross-Origin 요청의 응답을 브라우저 JavaScript가 사용할 수 있는지 제어합니다.

### 13.2. CSRF

CSRF(Cross-Site Request Forgery)는 사용자가 로그인한 웹사이트에 대해 공격자가 사용자의 브라우저를 이용하여 의도하지 않은 요청을 수행하도록 유도하는 공격입니다.

### 13.3. 비교

| 구분 | CORS | CSRF |
|---|---|---|
| 목적 | Cross-Origin 응답 접근 제어 | 위조 요청 방어 |
| 주요 공격 상황 | 허용되지 않은 Origin에서 응답 읽기 | 사용자의 인증 상태를 이용한 요청 위조 |
| 주요 적용 계층 | 브라우저 및 서버의 CORS 정책 | 서버의 요청 검증 |
| 주요 수단 | CORS 응답 헤더 | CSRF Token, Origin 검증, SameSite Cookie 등 |
| 인증 대체 여부 | 불가능 | 불가능 |

CORS를 엄격하게 설정하더라도 모든 CSRF 공격을 방지할 수 있는 것은 아닙니다.

특히 브라우저가 실제 요청을 전송할 수 있는 상황에서는 응답을 읽지 못하더라도 서버의 상태 변경이 발생할 수 있습니다.

Cookie 기반 인증을 사용하는 시스템에서는 별도의 CSRF 방어 정책을 적용해야 합니다.

자세한 내용은 `04-security/csrf.md`에서 설명합니다.

---

## 14. CORS와 WebSocket

일반적인 브라우저 HTTP 요청에 적용되는 CORS 정책과 WebSocket 연결의 보안 정책은 구분해야 합니다.

### 14.1. HTTP 요청

```text
Browser
   |
   | HTTP Request
   v
NestJS REST API
   |
   v
CORS 검사
```

브라우저는 Fetch API 및 XMLHttpRequest 등의 Cross-Origin 요청에 대해 CORS 정책을 적용합니다.

### 14.2. WebSocket 연결

```text
Browser
   |
   | WebSocket Handshake
   v
NestJS WebSocket Gateway
   |
   v
Origin 및 인증 정책 검사
   |
   v
WebSocket Connection
```

브라우저의 기본 WebSocket API는 일반적인 Fetch CORS 검사와 동일한 방식으로 연결을 제한하지 않습니다.

따라서 서버에서 Origin 검증과 인증 및 권한 검사를 별도로 수행해야 할 수 있습니다.

특히 Cookie를 사용하는 WebSocket 인증에서는 허용되지 않은 Origin에서 연결을 시도하는 공격을 고려해야 합니다.

Socket.IO를 사용하는 경우에는 HTTP Long-Polling Transport의 CORS 설정과 WebSocket 연결 제어를 구분해야 합니다.

Socket.IO의 `cors` 옵션만으로 모든 WebSocket 연결의 Origin이 제한되는 것은 아니며, 필요하다면 `allowRequest` 등의 연결 검증 기능을 함께 사용해야 합니다.

NestJS WebSocket Gateway의 인증 및 연결 정책은 `05-platforms/websocket.md`에서 설명합니다.

---

## 15. Reverse Proxy와 CORS

실제 운영 환경에서는 NestJS 앞단에 Reverse Proxy, API Gateway 또는 Load Balancer를 배치하는 경우가 많습니다.

```text
Browser
   |
   v
Reverse Proxy
   |
   v
NestJS Application
```

이러한 환경에서는 CORS 헤더를 Reverse Proxy 또는 NestJS 중 어느 계층에서 관리할지 결정해야 합니다.

### 15.1. NestJS에서 관리

NestJS의 `enableCors()`를 사용하여 CORS 헤더를 생성합니다.

장점은 애플리케이션의 설정과 CORS 정책을 함께 관리할 수 있다는 점입니다.

### 15.2. Reverse Proxy에서 관리

Nginx 또는 API Gateway가 CORS 헤더를 생성하도록 구성할 수도 있습니다.

이 방식에서는 Preflight Request 처리와 오류 응답에 대한 CORS 헤더 적용 여부를 함께 고려해야 합니다.

### 15.3. 중복 설정 방지

Reverse Proxy와 NestJS가 동시에 CORS 헤더를 생성하면 중복된 응답 헤더가 전달될 수 있습니다.

예를 들어 다음과 같은 응답은 잘못된 구성입니다.

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Origin: *
```

`Access-Control-Allow-Origin`은 여러 Origin을 별도의 헤더로 나열하여 전달하는 방식으로 사용할 수 없습니다.

따라서 CORS 정책을 담당할 계층을 명확하게 지정하는 것이 좋습니다.

---

## 16. CORS 오류와 문제 해결

브라우저에서 발생하는 CORS 오류는 일반적으로 서버 응답의 CORS 헤더가 요청 조건을 충족하지 못할 때 나타납니다.

### 16.1. Access-Control-Allow-Origin 누락

대표적인 오류 메시지는 다음과 같습니다.

```text
No 'Access-Control-Allow-Origin' header
is present on the requested resource.
```

가능한 원인은 다음과 같습니다.

- NestJS에서 CORS가 활성화되지 않았습니다.
- 요청 Origin이 허용 목록에 포함되지 않았습니다.
- Reverse Proxy가 응답 헤더를 제거했습니다.
- 오류 응답에 CORS 헤더가 포함되지 않았습니다.

### 16.2. Wildcard와 Credentials 충돌

```text
The value of the 'Access-Control-Allow-Origin'
header must not be '*' when the request's
credentials mode is 'include'.
```

Credentials를 포함한 요청에서 Wildcard Origin을 사용하면 발생할 수 있습니다.

해결 방법은 명시적인 Origin을 지정하는 것입니다.

```typescript
app.enableCors({
  origin: 'https://app.example.com',
  credentials: true,
});
```

### 16.3. Authorization Header 허용 누락

```text
Request header field authorization
is not allowed by Access-Control-Allow-Headers.
```

서버가 Preflight 응답에서 Authorization 헤더를 허용하지 않은 경우 발생할 수 있습니다.

```typescript
app.enableCors({
  origin: 'https://app.example.com',
  allowedHeaders: [
    'Content-Type',
    'Authorization',
  ],
});
```

### 16.4. Preflight 요청 실패

Preflight 요청에 대해 서버가 적절한 CORS 응답을 반환하지 못하면 실제 요청이 전송되지 않을 수 있습니다.

주요 원인은 다음과 같습니다.

- OPTIONS 요청이 Reverse Proxy에서 차단되었습니다.
- Preflight 요청에 인증을 요구하고 있습니다.
- 서버가 요청 Method를 허용하지 않습니다.
- 요청 Header가 허용 목록에 포함되지 않았습니다.

### 16.5. 브라우저 개발자 도구 활용

Chrome DevTools의 Network 탭에서 다음 항목을 확인할 수 있습니다.

1. OPTIONS 요청이 발생했는지 확인합니다.
2. 요청의 Origin을 확인합니다.
3. Access-Control-Request-Method를 확인합니다.
4. Access-Control-Request-Headers를 확인합니다.
5. 서버가 반환한 Access-Control-Allow-* 헤더를 확인합니다.
6. 실제 요청이 전송되었는지 확인합니다.

CORS 오류로 표시되더라도 실제 원인은 API 서버 오류, Reverse Proxy 설정, 네트워크 장애 등일 수 있습니다.

따라서 브라우저 오류 메시지와 서버 로그를 함께 확인해야 합니다.

---

## 17. CORS 테스트

CORS 설정은 허용된 Origin과 허용되지 않은 Origin을 모두 대상으로 검증해야 합니다.

### 17.1. 허용된 Origin 테스트

```bash
curl -i \
  -H "Origin: https://app.example.com" \
  http://localhost:3000/users
```

서버에서 해당 Origin을 허용하도록 설정했다면 다음과 같은 응답 헤더를 확인할 수 있습니다.

```http
Access-Control-Allow-Origin: https://app.example.com
```

### 17.2. Preflight 테스트

```bash
curl -i \
  -X OPTIONS \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  http://localhost:3000/users
```

확인할 주요 응답 헤더는 다음과 같습니다.

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE
Access-Control-Allow-Headers: Content-Type,Authorization
```

실제 출력은 서버의 설정과 CORS Middleware 구현에 따라 다를 수 있습니다.

### 17.3. 허용되지 않은 Origin 테스트

```bash
curl -i \
  -H "Origin: https://untrusted.example" \
  http://localhost:3000/users
```

요청 Origin이 허용되지 않았다면 해당 Origin에 대한 CORS 허용 헤더가 반환되지 않아야 합니다.

단, curl은 브라우저가 아니므로 CORS 정책을 자동으로 강제하지 않습니다.

따라서 curl 테스트는 CORS 응답 헤더를 확인하는 용도로 사용하며, 최종 동작은 실제 브라우저 환경에서도 검증해야 합니다.

### 17.4. E2E 테스트 고려사항

| 테스트 시나리오 | 기대 결과 |
|---|---|
| 허용된 Origin의 일반 요청 | 적절한 CORS 응답 헤더 반환 |
| 허용되지 않은 Origin의 요청 | 해당 Origin에 대한 허용 헤더 미반환 |
| 허용된 Preflight 요청 | 요청 Method 및 Header 허용 |
| 허용되지 않은 Method | Preflight에서 해당 Method를 허용하지 않음 |
| Cookie 기반 Cross-Origin 요청 | 명시적인 Origin과 Credentials 허용 헤더 반환 |
| Wildcard Origin과 Credentials 조합 | 사용하지 않도록 검증 |
| Reverse Proxy 경유 요청 | 중복되지 않은 CORS 헤더 반환 |

---

## 18. 운영 환경의 보안 고려사항

### 18.1. 허용 Origin 최소화

운영 환경에서는 실제 서비스를 제공하는 Origin만 허용하는 것이 좋습니다.

```typescript
app.enableCors({
  origin: [
    'https://app.example.com',
    'https://admin.example.com',
  ],
});
```

민감한 데이터를 제공하는 인증 API에서는 무분별하게 `*`를 사용하지 않아야 합니다.

### 18.2. CORS를 인증 수단으로 사용하지 않습니다

CORS는 요청 사용자의 신원을 검증하지 않습니다.

따라서 다음 기능은 별도로 구현해야 합니다.

- JWT 및 Session 인증
- Role 및 Permission 검증
- 리소스 소유권 확인
- API Rate Limiting
- 요청 데이터 검증

### 18.3. Origin Header를 신뢰할 수 있는 인증 정보로 사용하지 않습니다

`Origin` 헤더는 브라우저의 Cross-Origin 요청을 판단하기 위한 정보입니다.

브라우저가 아닌 HTTP 클라이언트는 Origin 헤더를 임의로 설정할 수 있습니다.

따라서 Origin이 허용 목록에 포함되었다는 이유만으로 해당 요청을 인증된 요청으로 간주해서는 안 됩니다.

### 18.4. 정규식 기반 Origin 검증 주의

정규식을 이용한 Origin 허용 정책에서는 의도하지 않은 도메인이 허용되지 않도록 주의해야 합니다.

예를 들어 다음과 같은 검사는 부적절합니다.

```typescript
origin: /example.com/
```

이 정규식은 예상하지 못한 문자열까지 일치시킬 수 있습니다.

가능하면 명시적인 Origin 목록을 사용하는 것이 좋습니다.

동적인 도메인 검증이 필요하다면 URL을 파싱하고 Hostname의 정확한 일치 여부를 확인해야 합니다.

### 18.5. Cache와 Vary Header

서버가 요청 Origin에 따라 서로 다른 `Access-Control-Allow-Origin` 값을 반환한다면 공유 캐시가 해당 차이를 구분할 수 있도록 해야 합니다.

```http
Vary: Origin
```

`Vary: Origin`은 응답이 요청 Origin에 따라 달라질 수 있음을 캐시에 알립니다.

Express의 표준 CORS Middleware는 동적으로 Origin을 반환하는 경우 관련 `Vary` 헤더를 처리할 수 있습니다.

Reverse Proxy나 CDN을 사용하는 경우에는 캐시 키 및 헤더 전달 설정을 추가로 확인해야 합니다.

### 18.6. Preflight 캐싱

Preflight Request는 추가적인 HTTP 요청을 발생시키므로 성능에 영향을 줄 수 있습니다.

```typescript
app.enableCors({
  origin: 'https://app.example.com',
  maxAge: 600,
});
```

`maxAge`를 통해 브라우저가 Preflight 결과를 일정 시간 재사용하도록 할 수 있습니다.

다만 허용 정책을 자주 변경하는 환경에서는 캐시된 Preflight 결과가 즉시 갱신되지 않을 수 있으므로 적절한 만료시간을 선택해야 합니다.

---

## 19. 관련 문서

- `00-overview/request-lifecycle.md`: NestJS 요청 처리 흐름
- `02-request-lifecycle/middleware.md`: Middleware의 역할
- `02-request-lifecycle/guards.md`: Guard의 실행 방식
- `03-techniques/configuration.md`: 환경변수와 설정 관리
- `04-security/authentication.md`: JWT 및 Session 인증
- `04-security/authorization.md`: Role과 Permission 기반 접근 제어
- `04-security/csrf.md`: Cross-Site Request Forgery 방어
- `04-security/helmet.md`: HTTP 보안 헤더
- `05-platforms/rest-api.md`: REST API 설계 및 구현
- `05-platforms/websocket.md`: WebSocket 연결과 인증
- `08-deployment/environment-configuration.md`: 운영 환경 설정

---

## 20. 정리

CORS는 서로 다른 Origin에서 실행되는 웹 애플리케이션이 서버 리소스에 접근할 수 있도록 허용하는 HTTP 헤더 기반 메커니즘입니다.

NestJS에서는 `enableCors()` 또는 `NestFactory.create()`의 `cors` 옵션을 사용하여 CORS 정책을 구성할 수 있습니다.

핵심 사항은 다음과 같습니다.

1. **Origin**은 Scheme, Host, Port로 구성됩니다.
2. **Same-Origin Policy**는 다른 Origin의 리소스에 대한 브라우저 JavaScript의 접근을 제한합니다.
3. **CORS**는 서버가 허용하는 Cross-Origin 응답 접근 범위를 브라우저에 전달합니다.
4. **Preflight Request**는 실제 요청 전에 OPTIONS Method로 서버의 허용 정책을 확인합니다.
5. **Access-Control-Allow-Origin**은 응답에 접근할 수 있는 Origin을 지정합니다.
6. **Access-Control-Allow-Credentials**는 Credentials를 포함한 Cross-Origin 요청의 응답 접근을 제어합니다.
7. **enableCors()**는 NestJS 애플리케이션에서 CORS를 활성화하는 기본적인 방법입니다.
8. **Cookie 기반 인증**에서는 CORS 설정과 Cookie 속성 및 브라우저 정책을 함께 고려해야 합니다.
9. **JWT 기반 인증**에서는 Authorization Header로 인한 Preflight와 필요한 요청 Header 허용 설정을 고려해야 합니다.
10. **CORS는 인증, 인가 또는 CSRF 방어를 대체하지 못합니다.**

운영 환경에서는 허용된 Origin을 명시적으로 관리하고, 인증 방식과 Reverse Proxy 구성 및 Preflight 처리 정책을 함께 고려하여 CORS를 설정해야 합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - CORS](https://docs.nestjs.com/security/cors)
- [NestJS - Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS - CSRF Protection](https://docs.nestjs.com/security/csrf)
- [NestJS - Security](https://docs.nestjs.com/security)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - WebSockets](https://docs.nestjs.com/websockets/gateways)

### MDN Web Docs

- [MDN - Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [MDN - Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [MDN - Access-Control-Allow-Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin)
- [MDN - Access-Control-Allow-Credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Credentials)
- [MDN - Access-Control-Allow-Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Headers)
- [MDN - Access-Control-Max-Age](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Max-Age)
- [MDN - CORS Errors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors)
- [MDN - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

### Express 및 Socket.IO

- [Express - CORS Middleware](https://expressjs.com/en/resources/middleware/cors/)
- [cors - GitHub Repository](https://github.com/expressjs/cors)
- [Socket.IO - Handling CORS](https://socket.io/docs/v4/handling-cors/)

### 보안 관련 자료

- [OWASP - Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP - REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [WHATWG - Fetch Standard](https://fetch.spec.whatwg.org/)