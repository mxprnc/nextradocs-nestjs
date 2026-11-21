# CSRF (Cross-Site Request Forgery)

## 1. 개요

CSRF(Cross-Site Request Forgery, 사이트 간 요청 위조)는 사용자의 브라우저가 인증된 상태를 악용하여 사용자가 의도하지 않은 요청을 웹 애플리케이션에 전송하도록 유도하는 공격입니다.

브라우저는 요청 대상과 Cookie 정책에 따라 인증 Cookie를 자동으로 전송할 수 있습니다. 서버가 이러한 Cookie만으로 요청의 정당성을 판단한다면 공격자가 유도한 요청을 정상적인 사용자 요청으로 처리할 위험이 있습니다.

예를 들어 사용자가 특정 서비스에 로그인한 상태에서 악의적인 웹사이트를 방문하면, 해당 웹사이트가 사용자의 브라우저를 이용하여 비밀번호 변경이나 계정 설정 변경 등의 요청을 전송하도록 시도할 수 있습니다.

NestJS에서는 CSRF 공격을 방어하기 위해 다음과 같은 방식을 사용할 수 있습니다.

| 방어 방식 | 설명 |
|---|---|
| Fetch Metadata 기반 보호 | `Sec-Fetch-Site` 등의 요청 헤더를 검사하여 신뢰하지 않는 출처의 상태 변경 요청을 차단합니다. |
| Origin 검증 | 요청의 `Origin`을 허용된 출처와 비교합니다. |
| Synchronizer Token Pattern | 서버 세션에 연결된 CSRF Token을 검증합니다. |
| Signed Double-Submit Cookie | 세션에 연결된 HMAC 기반 CSRF Token과 Cookie를 검증합니다. |
| SameSite Cookie | Cross-Site 요청에서 Cookie가 전송되는 범위를 제한합니다. |

**NestJS v12.1부터는 `enableCsrfProtection()`을 통해 Fetch Metadata 기반 CSRF 보호 기능을 기본적으로 사용할 수 있습니다.**

이전 버전이나 CSRF Token 기반 검증이 필요한 환경에서는 Express의 `csrf-csrf`, Fastify의 `@fastify/csrf-protection`과 같은 외부 패키지를 사용할 수 있습니다.

이 문서에서는 CSRF 공격 원리, 주요 방어 기법, NestJS의 버전별 구현 방법 및 운영 환경의 보안 고려사항을 설명합니다.

---

## 2. CSRF 공격 원리

CSRF 공격은 일반적으로 사용자가 이미 인증된 상태에서 발생합니다.

### 2.1. 정상적인 요청

사용자가 정상적인 웹 애플리케이션에서 계정 정보를 변경하는 경우를 살펴보겠습니다.

```text
User
  |
  | 정상적인 웹사이트 접속
  v
https://app.example.com
  |
  | POST /account/email
  | Cookie: session=...
  v
NestJS Server
  |
  +----> Session 검증
  |
  +----> 계정 정보 변경
  |
  v
Response
```

서버는 인증 Cookie를 검증하여 사용자를 식별하고 계정 정보를 변경합니다.

### 2.2. CSRF 공격 상황

사용자가 로그인한 상태에서 공격자가 운영하는 웹사이트를 방문했다고 가정합니다.

```text
User Browser
    |
    | 이미 정상 서비스에 로그인
    |
    +-----------------------------+
    |                             |
    v                             v
Legitimate Website          Malicious Website
app.example.com             attacker.example
                                  |
                                  | 위조 요청 유도
                                  v
                            User Browser
                                  |
                                  | POST /account/email
                                  | Cookie: session=...
                                  v
                             NestJS Server
                                  |
                                  +----> Session 검증
                                  |
                                  +----> 요청 출처 검증 누락
                                  |
                                  v
                             계정 정보 변경
```

공격자는 사용자의 Session Cookie 값을 직접 알아내지 못하더라도 브라우저가 해당 Cookie를 자동으로 전송하도록 유도할 수 있습니다.

서버가 요청의 출처나 CSRF Token을 검증하지 않으면 위조된 요청이 처리될 수 있습니다.

다만 실제 공격의 성립 여부는 Cookie의 `SameSite` 설정, 요청 방식, 브라우저 정책 및 서버의 추가 검증 여부에 따라 달라집니다.

### 2.3. 공격 예제

다음은 CSRF 공격의 원리를 설명하기 위한 HTML 예제입니다.

```html
<form
  action="https://app.example.com/account/email"
  method="POST"
>
  <input
    type="hidden"
    name="email"
    value="attacker@example.com"
  />
</form>

<script>
  document.forms[0].submit();
</script>
```

악의적인 웹사이트가 이 페이지를 제공하면 브라우저가 해당 Form을 자동으로 제출할 수 있습니다.

대상 서버가 Form 데이터를 허용하고 인증 Cookie가 전송되는 환경이라면 계정 정보 변경이 발생할 수 있습니다.

이 예제는 공격 원리 설명을 위한 것이며, 모든 브라우저와 Cookie 설정에서 동일하게 성공하는 것은 아닙니다.

---

## 3. CSRF 공격의 성립 조건

CSRF 공격이 발생하려면 일반적으로 다음 조건들이 필요합니다.

### 3.1. 브라우저가 인증 정보를 자동으로 전달합니다

대표적인 사례는 Cookie 기반 인증입니다.

```http
Cookie: session=<session-id>
```

브라우저는 Cookie의 Domain, Path, Secure, SameSite 등의 정책에 따라 요청에 Cookie를 포함합니다.

공격자가 인증 정보를 직접 알지 못해도 인증 상태가 요청에 적용될 수 있습니다.

### 3.2. 상태를 변경하는 API가 존재합니다

대표적인 상태 변경 작업은 다음과 같습니다.

- 계정 이메일 변경
- 비밀번호 변경
- 상품 구매 및 주문 취소
- 게시물 작성 및 삭제
- 결제 및 송금 요청
- 사용자 권한 변경

특히 GET 요청으로 상태를 변경하도록 구현하면 CSRF 공격에 취약해질 수 있습니다.

HTTP의 GET, HEAD, OPTIONS 등 안전한 Method는 서버 상태를 변경하는 용도로 사용하지 않아야 합니다.

### 3.3. 서버가 요청의 정당성을 충분히 검증하지 않습니다

서버가 인증 Cookie만 검증하고 요청 출처, CSRF Token 또는 기타 요청 정당성 검사를 수행하지 않으면 공격 가능성이 증가합니다.

인증에 성공했다는 사실과 사용자가 해당 작업을 의도했다는 사실은 서로 다릅니다.

---

## 4. CSRF와 관련 보안 개념

CSRF는 CORS, XSS, Authentication 및 Authorization과 밀접하게 관련되어 있지만 각각의 목적은 다릅니다.

| 구분 | 주요 목적 | CSRF와의 관계 |
|---|---|---|
| Authentication | 요청 주체의 신원 확인 | 인증 Cookie가 CSRF에 악용될 수 있습니다. |
| Authorization | 요청 주체의 접근 권한 확인 | 위조 요청에도 사용자의 정상 권한이 적용될 수 있습니다. |
| CORS | Cross-Origin 응답 접근 제어 | 일부 요청의 전송 자체를 막지 못하므로 CSRF 방어를 대체하지 않습니다. |
| XSS | 악의적인 스크립트 실행과 관련된 취약점 | XSS가 존재하면 CSRF 방어가 우회될 가능성이 있습니다. |
| CSRF Protection | 위조된 상태 변경 요청 방어 | 출처 검증 또는 Token 검증 등을 사용합니다. |

### 4.1. CORS와 CSRF

CORS는 브라우저 JavaScript가 Cross-Origin 응답에 접근할 수 있는지 제어합니다.

그러나 CORS를 허용하지 않았더라도 일부 Cross-Origin 요청은 서버에 전달될 수 있습니다.

```text
Malicious Website
       |
       | Cross-Origin Form POST
       v
Browser
       |
       | 실제 HTTP 요청 전송 가능
       v
NestJS Server
       |
       | 상태 변경 가능
       v
Browser
       |
       | CORS 정책에 따라 응답 접근 제한
       v
Malicious Website
```

공격자가 응답을 읽을 수 없더라도 서버의 상태 변경 작업이 이미 수행되었다면 CSRF 공격이 성립할 수 있습니다.

따라서 CORS 설정만으로 CSRF 공격을 방지해서는 안 됩니다.

자세한 내용은 `04-security/cors.md`에서 설명합니다.

### 4.2. XSS와 CSRF

XSS(Cross-Site Scripting)는 공격자가 신뢰된 웹사이트의 실행 환경에서 악의적인 스크립트를 실행하도록 만드는 취약점입니다.

XSS에 성공하면 공격자는 정상 웹사이트의 Origin에서 요청을 수행할 수 있으므로 CSRF 방어 기법이 무력화될 수 있습니다.

따라서 CSRF 방어와 함께 XSS 방어도 필요합니다.

---

## 5. NestJS의 CSRF 보호 방식

NestJS에서는 버전과 HTTP Adapter에 따라 CSRF 보호를 적용하는 방법이 달라집니다.

| 환경 | 구현 방식 | 추가 패키지 |
|---|---|---|
| NestJS v12.1 이상 | `app.enableCsrfProtection()` | 불필요 |
| Express 기반 Token 방식 | `csrf-csrf` | 필요 |
| Fastify 기반 Token 방식 | `@fastify/csrf-protection` | 필요 |

NestJS의 내장 방식은 Fetch Metadata 및 Origin 정보를 검사하는 방식입니다.

외부 라이브러리 기반 방식은 CSRF Token을 발급하고 요청에서 검증하는 방식입니다.

두 방식은 서로 다른 방어 메커니즘이며, 반드시 동시에 사용해야 하는 것은 아닙니다.

브라우저 호환성, 인증 방식, Cross-Origin 프론트엔드 구성 및 보안 요구사항에 따라 적절한 방식을 선택해야 합니다.

---

## 6. NestJS 내장 CSRF 보호

NestJS v12.1 이상에서는 `enableCsrfProtection()`을 사용하여 CSRF 보호를 활성화할 수 있습니다.

이 기능은 Express와 Fastify에서 동일한 API로 제공됩니다.

별도의 CSRF Token, Cookie 또는 Session 저장소를 요구하지 않습니다.

### 6.1. 기본 설정

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCsrfProtection();

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

`enableCsrfProtection()`은 브라우저가 전달한 요청 출처 정보를 확인하여 신뢰하지 않는 Cross-Origin 상태 변경 요청을 차단합니다.

추가적인 npm 패키지 설치는 필요하지 않습니다.

### 6.2. 동작 원리

NestJS의 내장 CSRF 보호는 주로 다음 정보를 활용합니다.

- `Sec-Fetch-Site`
- `Origin`
- HTTP Method
- 신뢰할 수 있는 Origin 목록

일반적인 처리 흐름은 다음과 같습니다.

```text
HTTP Request
    |
    v
CSRF Protection
    |
    +----> HTTP Method 검사
    |
    +----> Sec-Fetch-Site 검사
    |
    +----> Origin 검사
    |
    +----> Trusted Origins 확인
    |
    +---- 허용되지 않음 ----> 403 Forbidden
    |
    v
NestJS Middleware
    |
    v
Guard
    |
    v
Controller Handler
```

내장 보호 기능은 NestJS의 일반적인 요청 처리 구성 요소보다 앞선 단계에서 실행됩니다.

### 6.3. 적용 시 주의사항

`enableCsrfProtection()`은 다음 조건을 고려하여 등록해야 합니다.

1. `app.init()` 또는 `app.listen()` 이전에 호출해야 합니다.
2. 중복 호출하면 오류가 발생합니다.
3. 잘못된 설정 옵션을 전달하면 애플리케이션 시작 시 예외가 발생합니다.
4. 일반 Middleware보다 먼저 실행되도록 `NestFactory.create()` 직후에 등록하는 것이 좋습니다.

이 기능은 모든 상태 변경 요청을 일괄적으로 차단하는 것이 아니라 요청의 출처와 HTTP Method를 기준으로 허용 여부를 판단합니다.

---

## 7. Fetch Metadata 기반 보호

Fetch Metadata는 브라우저가 HTTP 요청의 발생 맥락을 서버에 전달하기 위해 사용하는 요청 헤더입니다.

이 중 `Sec-Fetch-Site`는 CSRF 방어에서 중요한 역할을 합니다.

### 7.1. Sec-Fetch-Site

대표적인 값은 다음과 같습니다.

| 값 | 의미 |
|---|---|
| `same-origin` | 요청 출처와 대상이 동일한 Origin입니다. |
| `same-site` | Origin은 다르지만 동일한 Site에 속합니다. |
| `cross-site` | 서로 다른 Site 사이의 요청입니다. |
| `none` | 사용자 직접 탐색 등 특정 출처에 연결되지 않은 요청입니다. |

예를 들어 다음 두 Origin은 서로 다르지만 같은 Site에 속할 수 있습니다.

```text
https://app.example.com
https://api.example.com
```

`same-site`는 반드시 신뢰할 수 있는 요청이라는 의미가 아닙니다.

동일한 Site 내에 공격자가 제어하는 서브도메인이 존재할 수 있기 때문입니다.

### 7.2. 요청 예제

동일한 Origin에서 전송한 요청은 다음과 같은 헤더를 포함할 수 있습니다.

```http
POST /account/profile HTTP/1.1
Host: app.example.com
Origin: https://app.example.com
Sec-Fetch-Site: same-origin
Cookie: session=<session-id>
```

다른 사이트에서 유도한 요청은 다음과 같은 형태일 수 있습니다.

```http
POST /account/profile HTTP/1.1
Host: app.example.com
Origin: https://attacker.example
Sec-Fetch-Site: cross-site
Cookie: session=<session-id>
```

CSRF 보호 기능은 이러한 출처 정보를 확인하여 위험한 요청을 차단할 수 있습니다.

### 7.3. 브라우저 호환성

현대적인 브라우저는 일반적으로 Fetch Metadata 헤더를 지원합니다.

그러나 오래된 브라우저나 일부 특수한 HTTP 클라이언트는 이러한 헤더를 전송하지 않을 수 있습니다.

NestJS의 내장 보호 기능은 `Sec-Fetch-Site`와 `Origin`이 모두 없는 요청을 허용할 수 있습니다.

따라서 오래된 브라우저까지 보호해야 하는 서비스에서는 Token 기반 방어와 같은 추가적인 보호 방식을 검토해야 합니다.

---

## 8. Trusted Origins 설정

React와 NestJS가 서로 다른 Origin에서 실행되면 정상적인 상태 변경 요청도 CSRF 보호 정책에 의해 차단될 수 있습니다.

예를 들어 다음과 같은 환경을 가정합니다.

```text
React Application
http://localhost:5173
        |
        | POST /articles
        v
NestJS API
http://localhost:3000
```

두 애플리케이션은 Port가 다르므로 서로 다른 Origin입니다.

### 8.1. Trusted Origins 등록

```typescript
const app = await NestFactory.create(AppModule);

app.enableCsrfProtection({
  trustedOrigins: [
    'http://localhost:5173',
    'https://app.example.com',
  ],
});
```

`trustedOrigins`에 등록된 Origin에서는 Cross-Origin 상태 변경 요청을 허용할 수 있습니다.

이때 Origin은 다음 형식을 따라야 합니다.

```text
scheme://host[:port]
```

Path, Query String, Fragment 및 Wildcard를 포함할 수 없습니다.

### 8.2. CORS 설정과 함께 사용

```typescript
const app = await NestFactory.create(AppModule);

const trustedOrigins = [
  'http://localhost:5173',
  'https://app.example.com',
];

app.enableCsrfProtection({
  trustedOrigins,
});

app.enableCors({
  origin: trustedOrigins,
  credentials: true,
});

await app.listen(3000);
```

CORS의 허용 Origin과 CSRF의 Trusted Origins는 서로 다른 설정입니다.

**CORS에서 허용한 Origin이 CSRF의 Trusted Origins에 자동으로 등록되는 것은 아닙니다.**

Cookie 기반 인증을 사용하는 Cross-Origin 프론트엔드라면 두 설정을 함께 검토해야 합니다.

또한 Trusted Origins는 요청 출처 검증을 위한 설정이지 인증이나 인가를 대체하는 기능은 아닙니다.

---

## 9. CSRF 검사 제외 경로

일부 API는 일반적인 브라우저 기반 CSRF 검사와 다른 인증 및 보안 정책을 사용할 수 있습니다.

대표적인 예는 외부 서비스가 호출하는 Webhook입니다.

이러한 요청은 브라우저의 Fetch Metadata 헤더를 포함하지 않을 수 있으며, 별도의 서명 검증 방식으로 요청의 진위를 확인하는 경우가 많습니다.

NestJS 내장 CSRF 보호에서는 `exclude` 옵션을 이용하여 특정 경로를 검사 대상에서 제외할 수 있습니다.

### 9.1. 설정 예제

```typescript
app.enableCsrfProtection({
  exclude: [
    '/webhooks/payment',
  ],
});
```

`exclude`는 경로 또는 RouteInfo 기반 설정 등을 지원합니다.

실제 설정 시 사용하는 NestJS 버전에서 지원하는 경로 및 Method 매칭 규칙을 확인해야 합니다.

### 9.2. 제외 경로의 보안 정책

CSRF 검사를 제외했다고 해서 해당 API를 인증 없이 공개해도 된다는 의미는 아닙니다.

예를 들어 결제 Webhook에서는 다음과 같은 검증이 필요할 수 있습니다.

- HMAC Signature 검증
- 요청 Timestamp 검증
- 재전송 공격 방지
- 이벤트 중복 처리 방지
- 요청 Payload 검증

Webhook은 브라우저 기반 CSRF 보호 대신 요청 주체와 메시지의 무결성을 검증하는 방식으로 보호해야 합니다.

---

## 10. CSRF Token 기반 보호

CSRF Token 기반 보호는 요청을 수행하는 클라이언트가 서버에서 발급한 유효한 토큰을 함께 제출하도록 요구하는 방식입니다.

서버는 요청에 포함된 토큰이 해당 인증 세션에 대해 유효한지 검증합니다.

기본 동작 과정은 다음과 같습니다.

```text
Client
   |
   | 페이지 또는 CSRF Token 요청
   v
NestJS Server
   |
   +----> CSRF Token 생성
   |
   +----> Session 또는 Cookie와 연결
   |
   v
Client
   |
   | POST /account/profile
   | X-CSRF-Token: <token>
   v
NestJS Server
   |
   +----> CSRF Token 검증
   |
   +---- 실패 ----> 403 Forbidden
   |
   v
Controller Handler
```

공격자가 정상 사이트의 유효한 CSRF Token을 확보하지 못하도록 보호하면 위조 요청을 차단하는 데 도움이 됩니다.

### 10.1. CSRF Token의 요구사항

CSRF Token은 다음 특성을 갖도록 설계해야 합니다.

- 충분히 예측하기 어려운 난수 또는 안전한 암호학적 방식으로 생성합니다.
- 인증 세션과 연결하여 검증합니다.
- 서버에서 요청마다 유효성을 확인합니다.
- URL에 포함하지 않습니다.
- 로그에 노출하지 않습니다.
- 토큰이 없거나 잘못된 경우 요청을 거부합니다.

CSRF Token은 사용자 인증을 대체하지 않습니다.

유효한 CSRF Token을 가지고 있어도 인증 및 인가 검사는 별도로 필요합니다.

---

## 11. Synchronizer Token Pattern

Synchronizer Token Pattern은 서버 측 Session에 CSRF Token을 저장하고 클라이언트가 제출한 토큰과 비교하는 방식입니다.

일반적으로 Stateful Session 기반 애플리케이션에 적합합니다.

### 11.1. 처리 과정

```text
User Login
    |
    v
Session 생성
    |
    +----> CSRF Token 생성
    |
    +----> Session Store에 Token 저장
    |
    v
Client에 CSRF Token 전달
    |
    v
상태 변경 요청
    |
    +----> Session Cookie
    |
    +----> CSRF Token
    |
    v
Server
    |
    +----> Session 조회
    |
    +----> Token 비교
    |
    v
Allow / Deny
```

### 11.2. 특징

| 항목 | 설명 |
|---|---|
| 토큰 저장 | 서버 측 Session |
| 클라이언트 전달 | HTML, JSON 응답 또는 안전한 방식 |
| 검증 | 요청 토큰과 Session의 토큰 비교 |
| 장점 | 서버 측 인증 상태와 연결된 명확한 검증 |
| 고려사항 | Session Store 및 세션 수명주기 관리 |

Synchronizer Token Pattern에서는 서버가 Session에 보관한 토큰을 기준으로 검증합니다.

따라서 Double-Submit Cookie 방식과 달리 CSRF Token을 Cookie에 저장할 필요가 없습니다.

---

## 12. Double-Submit Cookie Pattern

Double-Submit Cookie Pattern은 CSRF Token을 Cookie와 별도의 요청 필드 또는 Header로 전달하여 검증하는 방식입니다.

일반적인 흐름은 다음과 같습니다.

```text
NestJS Server
    |
    +----> CSRF Cookie 발급
    |
    +----> CSRF Token 전달
    |
    v
Browser
    |
    | Cookie 자동 전송
    |
    | X-CSRF-Token 명시적 전송
    v
NestJS Server
    |
    +----> Token 검증
    |
    v
Allow / Deny
```

### 12.1. Naive Double-Submit Cookie

단순한 구현에서는 Cookie의 값과 요청 헤더의 값이 같은지만 확인합니다.

그러나 이 방식은 공격자가 Cookie를 주입하거나 변경할 수 있는 상황에서 우회될 수 있습니다.

따라서 새로운 시스템에서는 단순 비교 방식보다 Signed Double-Submit Cookie Pattern을 사용하는 것이 권장됩니다.

### 12.2. Signed Double-Submit Cookie

Signed Double-Submit Cookie는 HMAC을 이용하여 CSRF Token의 무결성을 보호하고 인증 세션과 연결하는 방식입니다.

주요 구성 요소는 다음과 같습니다.

- 암호학적으로 안전하게 생성한 난수
- 세션별로 달라지는 식별 정보
- 서버에서 관리하는 HMAC Secret
- HMAC 기반 검증 값

사용자의 이메일이나 고정된 User ID만으로 토큰을 연결하는 것은 적절하지 않습니다.

로그인 세션마다 달라지는 값을 사용해야 합니다.

---

## 13. Express에서 CSRF Token 보호 구현

NestJS의 Express Adapter에서는 `csrf-csrf` 패키지를 사용하여 Signed Double-Submit Cookie 방식을 구현할 수 있습니다.

이 절은 Token 기반 보호를 선택한 경우의 예제입니다.

### 13.1. 패키지 설치

```bash
npm install csrf-csrf cookie-parser express-session

npm install --save-dev \
  @types/cookie-parser \
  @types/express-session
```

각 패키지의 역할은 다음과 같습니다.

| 패키지 | 역할 |
|---|---|
| `csrf-csrf` | Signed Double-Submit Cookie 검증 |
| `cookie-parser` | 요청 Cookie 파싱 |
| `express-session` | 서버 측 Session 관리 |

실제 애플리케이션에서 이미 Session Middleware를 사용하고 있다면 해당 구성을 재사용할 수 있습니다.

### 13.2. 환경변수

```dotenv
SESSION_SECRET=<strong-random-secret>
CSRF_SECRET=<independent-strong-random-secret>
```

Session Secret과 CSRF Secret은 서로 다른 값을 사용해야 합니다.

실제 값은 충분한 엔트로피를 가진 난수로 생성하고 Git 저장소에 포함하지 않아야 합니다.

### 13.3. CSRF Middleware 구성

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';

import { doubleCsrf } from 'csrf-csrf';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.use(cookieParser());

  app.use(
    session({
      name: 'session',
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      },
    }),
  );

  const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () =>
      config.getOrThrow<string>('CSRF_SECRET'),

    getSessionIdentifier: (req) =>
      req.session.id,

    cookieName: '__Host-csrf',

    cookieOptions: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    },
  });

  app.use(doubleCsrfProtection);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

위 코드는 HTTPS 환경에서 사용하는 설정 예제입니다.

`__Host-` 접두사가 붙은 Cookie는 Secure 속성과 `Path=/`가 필요하며 Domain 속성을 지정하지 않아야 합니다.

또한 다음 사항을 고려해야 합니다.

1. Session Middleware가 CSRF Middleware보다 먼저 등록되어야 합니다.
2. Session ID는 사용자 로그인 세션에 연결된 값이어야 합니다.
3. 운영 환경에서는 기본 MemoryStore 대신 적절한 Session Store를 사용해야 합니다.
4. 로그인 시 Session ID 재생성을 포함한 Session Fixation 방어가 필요합니다.
5. 프록시 뒤에서 TLS가 종료된다면 신뢰할 수 있는 프록시 설정을 별도로 구성해야 할 수 있습니다.

위 예제는 CSRF 검증 Middleware 등록 구조를 설명합니다. 실제 사용을 위해서는 CSRF Token을 생성하여 클라이언트에 전달하는 API도 구성해야 합니다.

`csrf-csrf`의 Token 생성 함수명과 세부 옵션은 사용하는 패키지 버전에 따라 확인해야 합니다.

### 13.4. Token 발급

`csrf-csrf`는 CSRF Token을 생성하는 함수를 제공합니다.

현재 패키지 API에서 제공하는 `generateCsrfToken()`을 활용하는 경우의 예시는 다음과 같습니다.

```typescript
const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => csrfSecret,
  getSessionIdentifier: (req) => req.session.id,
});
```

Token 발급은 인증된 Session과 연결하여 수행해야 합니다.

예를 들어 별도의 CSRF Token 조회 API를 제공하고 JSON 응답으로 클라이언트에 전달할 수 있습니다.

```json
{
  "csrfToken": "<generated-csrf-token>"
}
```

구체적인 Controller 구현에서는 Express의 Request 및 Response 객체와 Session 연결을 고려해야 합니다.

### 13.5. 클라이언트 요청

React에서 CSRF Token을 받은 뒤 다음과 같이 요청할 수 있습니다.

```typescript
async function updateProfile(
  csrfToken: string,
  name: string,
) {
  const response = await fetch(
    'https://api.example.com/profile',
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ name }),
    },
  );

  if (!response.ok) {
    throw new Error('Request failed');
  }

  return response.json();
}
```

CSRF Token은 Cookie 자동 전송과 별도로 요청 헤더에 명시적으로 전달합니다.

실제 Header 이름은 `csrf-csrf`에서 설정한 Token 추출 규칙과 일치해야 합니다.

---

## 14. Fastify에서 CSRF Token 보호 구현

NestJS에서 Fastify Adapter를 사용하는 경우 `@fastify/csrf-protection`을 사용할 수 있습니다.

이 패키지는 Fastify Plugin 및 Hook 형태로 CSRF 보호를 제공합니다.

### 14.1. 패키지 설치

Cookie 기반 구성을 사용하는 예제입니다.

```bash
npm install @nestjs/platform-fastify
npm install @fastify/cookie
npm install @fastify/csrf-protection
```

### 14.2. Plugin 등록

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import fastifyCookie from '@fastify/cookie';
import fastifyCsrf from '@fastify/csrf-protection';

import { AppModule } from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
    );

  await app.register(fastifyCookie);

  await app.register(fastifyCsrf);

  await app.listen({
    port: 3000,
  });
}

bootstrap();
```

`@fastify/csrf-protection`은 CSRF Secret을 저장할 수 있는 Cookie 또는 Session Plugin이 먼저 등록되어 있어야 합니다.

지원하는 대표적인 저장 방식은 다음과 같습니다.

- `@fastify/cookie`
- `@fastify/session`
- `@fastify/secure-session`

### 14.3. CSRF 보호 적용

Fastify에서는 `fastify.csrfProtection` Hook을 사용하여 요청을 검증할 수 있습니다.

Token을 발급할 때는 `reply.generateCsrf()`를 사용할 수 있습니다.

Token을 Request Body에서 읽는 경우와 Header에서 읽는 경우에는 적절한 Hook 실행 단계가 달라질 수 있습니다.

특히 Request Body가 필요한 경우에는 Body Parsing 이전의 `onRequest` Hook 대신 `preValidation` 또는 `preHandler` 등을 고려해야 합니다.

Fastify Plugin을 등록하는 것만으로 모든 Controller에 CSRF 검증이 적용된다고 가정해서는 안 됩니다.

실제 적용하려는 라우트와 Hook 등록 범위를 확인해야 합니다.

---

## 15. SameSite Cookie

SameSite는 브라우저가 Cross-Site 요청에 Cookie를 포함할지 제어하는 Cookie 속성입니다.

대표적으로 `Strict`, `Lax`, `None`을 사용할 수 있습니다.

### 15.1. SameSite=Strict

```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Strict
```

일반적인 Cross-Site 요청에는 Cookie를 전송하지 않도록 제한합니다.

CSRF 방어에 유용하지만 외부 사이트에서 애플리케이션으로 이동하는 일부 사용자 경험에 영향을 줄 수 있습니다.

### 15.2. SameSite=Lax

```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax
```

일반적인 Cross-Site Subresource 요청이나 상태 변경 요청에서 Cookie 전송을 제한하면서, 일부 안전한 최상위 탐색에서는 Cookie 전송을 허용합니다.

많은 웹 애플리케이션에서 보안과 사용자 경험 사이의 균형을 고려할 때 사용합니다.

### 15.3. SameSite=None

```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=None
```

Cross-Site 요청에서도 Cookie가 전송될 수 있도록 설정합니다.

이 설정을 사용할 경우 브라우저의 Third-Party Cookie 정책에 따라 Cookie가 차단될 수도 있습니다.

또한 `SameSite=None`은 일반적으로 `Secure` 속성과 함께 사용해야 합니다.

### 15.4. 비교

| 속성 | Cross-Site Cookie 전송 | 특징 |
|---|---|---|
| Strict | 강하게 제한 | 높은 수준의 Cross-Site 전송 제한 |
| Lax | 일부 탐색에 허용 | 보안과 사용자 경험의 균형 |
| None | 허용 가능 | Cross-Site 인증 흐름에 사용 |

SameSite는 CSRF 위험을 줄이는 데 도움이 되지만 모든 공격 상황을 방지하는 완전한 대책은 아닙니다.

특히 동일한 Site에 속한 다른 Origin에서 발생하는 요청은 추가적으로 검증해야 할 수 있습니다.

---

## 16. CSRF와 JWT 인증

CSRF 방어의 필요성은 JWT 자체보다는 인증 정보가 브라우저에서 어떤 방식으로 전달되는지에 따라 달라집니다.

### 16.1. Authorization Header 기반 JWT

다음과 같이 JavaScript가 직접 Authorization 헤더에 Access Token을 추가하는 경우를 살펴보겠습니다.

```typescript
fetch('https://api.example.com/articles', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'NestJS Security',
  }),
});
```

서버가 Authorization 헤더의 Bearer Token만으로 인증을 수행하고, 해당 토큰이 공격자 사이트의 요청에 자동으로 첨부되지 않는 구조라면 일반적인 Cookie 기반 CSRF 위험이 크게 줄어듭니다.

다만 XSS에 의해 토큰이 탈취되거나 악용될 위험은 별도로 고려해야 합니다.

### 16.2. Cookie 기반 JWT

JWT를 Cookie에 저장하면 브라우저가 해당 Cookie를 자동으로 전송할 수 있습니다.

```http
Cookie: access_token=<jwt>
```

이 경우 JWT를 사용하더라도 CSRF 공격 위험이 존재할 수 있습니다.

따라서 다음과 같은 보호가 필요합니다.

- CSRF Token 또는 Fetch Metadata 기반 검증
- SameSite Cookie 설정
- Origin 검증
- CORS 정책 관리
- XSS 방어

### 16.3. 인증 방식별 비교

| 인증 방식 | 일반적인 CSRF 위험 | 주요 고려사항 |
|---|---|---|
| Session Cookie | 존재 | CSRF 보호 및 SameSite |
| Cookie에 저장된 JWT | 존재 | CSRF 보호 및 Cookie 보안 |
| JavaScript가 설정하는 Bearer Token | 상대적으로 낮음 | XSS와 Token 저장 위치 |
| API Key 직접 전달 | 자동 전송되지 않는다면 낮음 | Key 노출 및 권한 관리 |

CSRF 방어를 생략할 수 있는지 판단할 때는 인증 방식뿐 아니라 실제 브라우저 요청 구조를 확인해야 합니다.

---

## 17. React와 NestJS 연동

React와 NestJS를 분리하여 운영하는 경우에는 프론트엔드 Origin과 인증 정보 전달 방식을 함께 고려해야 합니다.

### 17.1. NestJS v12.1 이상

최신 내장 CSRF 보호를 사용하는 경우 React에서 별도의 CSRF Token을 전달할 필요가 없습니다.

```typescript
// src/main.ts

const app = await NestFactory.create(AppModule);

const trustedOrigins = [
  'https://app.example.com',
];

app.enableCsrfProtection({
  trustedOrigins,
});

app.enableCors({
  origin: trustedOrigins,
  credentials: true,
});
```

React에서는 일반적인 HTTP 요청을 전송합니다.

```typescript
await fetch('https://api.example.com/profile', {
  method: 'PATCH',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Alice',
  }),
});
```

서버는 요청의 Fetch Metadata 및 Origin 정보를 바탕으로 허용 여부를 판단합니다.

### 17.2. Token 기반 방식

CSRF Token 기반 방식을 사용하는 경우에는 상태 변경 요청에 유효한 Token을 포함해야 합니다.

```text
React Application
       |
       | GET /csrf-token
       v
NestJS Server
       |
       | CSRF Token 발급
       v
React Application
       |
       | POST /articles
       | X-CSRF-Token: <token>
       v
NestJS Server
       |
       +----> CSRF Token 검증
       |
       v
Controller Handler
```

두 방식은 각각의 장단점과 호환성 조건이 있으므로 프로젝트 요구사항에 따라 선택해야 합니다.

---

## 18. Reverse Proxy와 CSRF

운영 환경에서는 NestJS 애플리케이션 앞에 Nginx, API Gateway 또는 Load Balancer가 배치되는 경우가 많습니다.

```text
Browser
   |
   v
Reverse Proxy
   |
   v
NestJS Application
   |
   v
CSRF Protection
```

이러한 구조에서는 외부에서 접근하는 Origin과 NestJS 내부에서 확인하는 Host 정보가 달라질 수 있습니다.

예를 들어 다음과 같습니다.

```text
External Origin
https://api.example.com

Internal Address
http://nestjs-service:3000
```

Origin 기반 검증에서는 서버가 실제 공개 Origin을 정확하게 식별할 수 있어야 합니다.

따라서 다음 사항을 고려해야 합니다.

- 신뢰할 수 있는 공개 Origin 설정
- Reverse Proxy의 Host 헤더 전달
- `X-Forwarded-Host` 처리 정책
- HTTPS 종료 위치
- 프록시 신뢰 범위 제한
- 외부에서 전달한 Forwarded Header의 위조 방지

클라이언트가 임의로 설정할 수 있는 Forwarded Header를 검증 없이 신뢰해서는 안 됩니다.

---

## 19. WebSocket과 CSRF

WebSocket은 일반적인 Fetch API와 다른 연결 절차를 사용합니다.

NestJS의 내장 `enableCsrfProtection()`은 WebSocket Upgrade Request를 검사하지 않습니다.

따라서 Cookie를 이용하여 WebSocket 연결을 인증한다면 별도의 Origin 검증을 고려해야 합니다.

```text
Browser
   |
   | WebSocket Handshake
   | Origin: https://app.example.com
   | Cookie: session=...
   v
WebSocket Gateway
   |
   +----> Origin 검사
   |
   +----> 사용자 인증
   |
   v
WebSocket Connection
```

특히 공격자가 제어하는 웹사이트에서 사용자의 인증 Cookie를 이용하여 WebSocket 연결을 시도하는 Cross-Site WebSocket Hijacking 위험을 고려해야 합니다.

Origin 검사는 브라우저 기반 공격의 방어 수단이며, 비브라우저 클라이언트가 보내는 Origin 값은 신뢰할 수 있는 인증 정보가 아닙니다.

WebSocket의 실제 사용자 인증 및 권한 검사는 별도로 수행해야 합니다.

---

## 20. CSRF 테스트

CSRF 보호는 정상 요청을 허용하면서 위조된 상태 변경 요청을 차단하는지 확인해야 합니다.

### 20.1. 테스트 시나리오

| 시나리오 | 기대 결과 |
|---|---|
| 동일 Origin의 정상 요청 | 허용 |
| 허용되지 않은 Cross-Origin POST | 403 Forbidden |
| 허용되지 않은 Cross-Origin PATCH | 403 Forbidden |
| Trusted Origin의 정상 요청 | 허용 |
| 잘못된 CSRF Token | 거부 |
| CSRF Token 누락 | Token 기반 방식에서 거부 |
| 인증 정보 누락 | 인증 정책에 따른 거부 |
| Webhook 요청 | 별도 인증 정책 적용 |

### 20.2. curl을 이용한 출처 검증

NestJS v12.1 이상의 내장 CSRF 보호를 사용하는 환경에서 요청 헤더를 직접 지정하여 테스트할 수 있습니다.

```bash
curl -i \
  -X POST \
  -H "Origin: https://attacker.example" \
  -H "Sec-Fetch-Site: cross-site" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice"}' \
  http://localhost:3000/profile
```

허용되지 않은 Cross-Origin 상태 변경 요청이라면 CSRF 보호 정책에 의해 차단되는지 확인합니다.

### 20.3. 정상 요청 테스트

```bash
curl -i \
  -X POST \
  -H "Origin: http://localhost:3000" \
  -H "Sec-Fetch-Site: same-origin" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice"}' \
  http://localhost:3000/profile
```

CSRF 검사에 통과하더라도 Controller의 인증, 인가 및 Validation 정책에 따라 다른 응답이 발생할 수 있습니다.

curl은 브라우저가 아니므로 Fetch Metadata 헤더를 직접 설정할 수 있습니다.

따라서 curl 테스트는 서버의 헤더 처리 결과를 확인하는 용도로 사용하고, 실제 브라우저 환경에서도 테스트해야 합니다.

### 20.4. E2E 테스트

E2E 테스트에서는 다음 사항을 확인하는 것이 좋습니다.

1. CSRF 보호가 전역적으로 적용되었는지 확인합니다.
2. 허용된 Origin의 상태 변경 요청을 테스트합니다.
3. 허용되지 않은 Origin의 요청이 거부되는지 확인합니다.
4. CSRF Token 기반 방식에서는 Token 누락과 변조를 테스트합니다.
5. Cookie 기반 인증과 CSRF 보호가 함께 동작하는지 확인합니다.
6. Reverse Proxy를 경유하는 환경에서 요청 출처 검증이 정확히 수행되는지 확인합니다.

---

## 21. 운영 환경의 보안 고려사항

### 21.1. 상태 변경 작업에 안전한 HTTP Method를 사용하지 않습니다

GET 요청은 서버 상태를 변경하는 데 사용하지 않아야 합니다.

CSRF 보호 기법은 일반적으로 GET, HEAD, OPTIONS 등의 Method를 안전한 요청으로 취급하기 때문입니다.

### 21.2. Trusted Origins를 최소화합니다

필요한 Origin만 명시적으로 허용해야 합니다.

관리되지 않는 서브도메인이나 과도하게 넓은 허용 정책은 공격 표면을 증가시킬 수 있습니다.

### 21.3. CSRF Token을 URL에 포함하지 않습니다

URL에 포함된 Token은 다음 위치에 기록될 수 있습니다.

- 브라우저 방문 기록
- Reverse Proxy 로그
- 애플리케이션 접근 로그
- Referer 헤더

따라서 CSRF Token은 HTTP Header 또는 적절한 Form 필드를 이용하여 전달해야 합니다.

### 21.4. XSS 방어를 함께 적용합니다

CSRF Token이 안전하게 생성되더라도 XSS를 통해 정상 Origin에서 공격 코드가 실행되면 보호가 우회될 수 있습니다.

따라서 입력값 검증, 적절한 출력 인코딩, Content Security Policy 등의 방어를 함께 고려해야 합니다.

### 21.5. 로그인 요청도 고려합니다

로그인 API는 인증 이전에 호출되지만 Login CSRF 공격의 대상이 될 수 있습니다.

공격자가 사용자를 공격자 계정으로 로그인시키는 방식으로 피해를 유발할 수 있습니다.

따라서 로그인 요청 역시 서비스의 위협 모델에 따라 CSRF 보호 대상에 포함해야 합니다.

### 21.6. 민감한 작업에 추가 인증을 적용합니다

다음과 같은 중요한 작업에는 추가적인 보안 검증을 고려할 수 있습니다.

- 비밀번호 변경
- 계정 복구 정보 변경
- 고액 결제
- 계정 삭제
- 관리자 권한 변경

재인증 또는 추가적인 사용자 확인 절차는 CSRF 방어와 별개로 중요한 작업의 보안 수준을 높일 수 있습니다.

---

## 22. 관련 문서

- `00-overview/request-lifecycle.md`: NestJS 요청 처리 흐름
- `02-request-lifecycle/middleware.md`: Middleware의 실행 구조
- `02-request-lifecycle/guards.md`: Guard와 요청 접근 제어
- `03-techniques/configuration.md`: 환경변수 및 보안 설정
- `04-security/authentication.md`: Session과 JWT 인증
- `04-security/authorization.md`: 인가 및 접근 권한 검사
- `04-security/encryption-and-hashing.md`: HMAC과 암호학적 난수
- `04-security/cors.md`: Cross-Origin Resource Sharing
- `04-security/helmet.md`: HTTP 보안 헤더
- `04-security/rate-limiting.md`: 요청 제한
- `05-platforms/websocket.md`: WebSocket 연결 보안
- `06-testing/e2e-testing.md`: E2E 테스트
- `08-deployment/environment-configuration.md`: 운영 환경 설정

---

## 23. 정리

CSRF는 사용자가 인증된 상태를 악용하여 브라우저가 의도하지 않은 요청을 전송하도록 만드는 공격입니다.

NestJS에서는 Fetch Metadata 기반 보호 또는 Token 기반 검증 방식을 이용하여 CSRF 공격을 방어할 수 있습니다.

핵심 사항은 다음과 같습니다.

1. **CSRF는** 브라우저가 인증 정보를 자동으로 전송하는 특성을 악용합니다.
2. **인증과 인가만으로는** 사용자가 해당 요청을 실제로 의도했는지 보장할 수 없습니다.
3. **CORS는** CSRF 방어를 대체하지 않습니다.
4. **NestJS v12.1 이상**에서는 `enableCsrfProtection()`을 사용하여 내장 CSRF 보호를 활성화할 수 있습니다.
5. **Fetch Metadata**는 `Sec-Fetch-Site`와 같은 헤더를 이용하여 요청의 출처를 판단합니다.
6. **Trusted Origins**는 신뢰할 수 있는 Cross-Origin 프론트엔드를 명시적으로 등록하기 위한 설정입니다.
7. **Synchronizer Token Pattern**은 서버 Session에 저장된 CSRF Token을 검증합니다.
8. **Signed Double-Submit Cookie**는 HMAC을 활용하여 세션과 연결된 CSRF Token을 검증합니다.
9. **SameSite Cookie**는 Cross-Site Cookie 전송을 제한하는 추가적인 방어 수단입니다.
10. **Cookie 기반 JWT**도 CSRF 위험이 존재할 수 있으므로 별도의 방어 정책을 고려해야 합니다.
11. **WebSocket은** 일반적인 HTTP CSRF 검사가 적용되지 않을 수 있으므로 Origin 검증과 인증을 별도로 구성해야 합니다.
12. **운영 환경에서는** 인증 방식, 브라우저 호환성, Reverse Proxy 구조 및 허용 Origin 정책을 함께 검토해야 합니다.

CSRF 방어는 단순히 특정 Middleware를 등록하는 작업이 아니라 요청 출처와 사용자 인증 상태를 고려하여 신뢰할 수 있는 상태 변경 요청만 허용하도록 설계하는 과정입니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - CSRF Protection](https://docs.nestjs.com/security/csrf)
- [NestJS - Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS - CORS](https://docs.nestjs.com/security/cors)
- [NestJS - Security](https://docs.nestjs.com/security)
- [NestJS - Middleware](https://docs.nestjs.com/middleware)
- [NestJS - Guards](https://docs.nestjs.com/guards)
- [NestJS - HTTP Adapters](https://docs.nestjs.com/techniques/performance)

### OWASP 보안 가이드

- [OWASP - Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP - CORS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CORS_Security_Cheat_Sheet.html)
- [OWASP - Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP - Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

### MDN Web Docs

- [MDN - Cross-Site Request Forgery](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF)
- [MDN - Sec-Fetch-Site](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site)
- [MDN - Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [MDN - Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [MDN - Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

### CSRF 관련 라이브러리

- [csrf-csrf - GitHub](https://github.com/Psifi-Solutions/csrf-csrf)
- [csrf-csrf - npm](https://www.npmjs.com/package/csrf-csrf)
- [@fastify/csrf-protection - GitHub](https://github.com/fastify/csrf-protection)
- [@fastify/csrf-protection - npm](https://www.npmjs.com/package/@fastify/csrf-protection)
- [@fastify/cookie - GitHub](https://github.com/fastify/fastify-cookie)