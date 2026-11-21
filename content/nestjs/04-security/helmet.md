# Helmet

## 1. 개요

Helmet은 HTTP 응답에 다양한 보안 관련 헤더(Security Headers)를 설정하여 웹 애플리케이션의 보안 수준을 높이는 Node.js 라이브러리입니다.

웹 브라우저는 서버가 반환하는 HTTP 응답 헤더를 바탕으로 스크립트 실행, 외부 리소스 로딩, HTTPS 연결, iframe 삽입 등의 동작을 제어할 수 있습니다.

Helmet은 이러한 보안 헤더를 일관되게 적용하여 Cross-Site Scripting(XSS), Clickjacking, MIME Type Sniffing 등 일부 웹 보안 위협을 완화하는 데 도움을 줍니다.

NestJS에서는 사용하는 버전과 HTTP Adapter에 따라 다음과 같은 방법으로 보안 헤더를 설정할 수 있습니다.

| 방식 | 설명 |
|---|---|
| `app.useSecurityHeaders()` | NestJS v12.1 이상에서 제공하는 내장 보안 헤더 설정 API입니다. |
| `helmet` | Express 기반 애플리케이션에서 사용하는 HTTP 보안 헤더 Middleware입니다. |
| `@fastify/helmet` | Fastify 기반 애플리케이션에서 사용하는 보안 헤더 Plugin입니다. |

NestJS의 내장 `useSecurityHeaders()`는 Helmet 8의 기본 설정을 기반으로 하며, 추가적인 Helmet 패키지 설치 없이 보안 헤더를 구성할 수 있습니다.

반면 기존 NestJS 버전에서는 사용하는 HTTP Adapter에 맞는 Helmet 라이브러리를 설치하여 적용합니다.

이 문서에서는 Helmet의 역할과 주요 HTTP 보안 헤더의 동작 원리, NestJS에서의 설정 방법 및 운영 환경의 보안 고려사항을 설명합니다.

---

## 2. HTTP Security Headers

HTTP Security Headers는 서버가 브라우저에 전달하는 보안 정책입니다.

브라우저는 응답에 포함된 보안 헤더를 해석하여 특정 동작을 허용하거나 제한합니다.

### 2.1. 기본 동작 구조

```text
Client
   |
   | HTTP Request
   v
NestJS Application
   |
   v
Security Headers Middleware
   |
   +----> CSP 설정
   |
   +----> HSTS 설정
   |
   +----> X-Frame-Options 설정
   |
   +----> X-Content-Type-Options 설정
   |
   +----> 기타 보안 헤더 설정
   |
   v
HTTP Response
   |
   v
Browser
   |
   v
Security Policy 적용
```

Helmet은 주로 HTTP 응답에 보안 헤더를 추가하거나 기존 헤더를 조정하는 역할을 담당합니다.

사용자 인증이나 요청 데이터 검증을 직접 수행하는 것은 아닙니다.

### 2.2. HTTP 응답 예제

보안 헤더가 적용된 HTTP 응답은 다음과 같은 형태를 가질 수 있습니다.

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Security-Policy: default-src 'self'; object-src 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: no-referrer
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

각 헤더는 서로 다른 보안 목적을 가지고 있습니다.

일부 헤더는 HTML 페이지에서 중요한 역할을 수행하며, 일부 헤더는 이미지 및 정적 리소스에도 영향을 미칩니다.

---

## 3. Helmet에서 관리하는 주요 보안 헤더

Helmet은 여러 HTTP 보안 헤더를 기본적으로 설정합니다.

대표적인 헤더는 다음과 같습니다.

| HTTP Header | 주요 목적 |
|---|---|
| Content-Security-Policy | 스크립트 및 외부 리소스 로딩 제한 |
| Strict-Transport-Security | HTTPS 연결 사용 강제 |
| X-Content-Type-Options | MIME Type Sniffing 방지 |
| X-Frame-Options | iframe 삽입 제한 |
| Referrer-Policy | Referer 정보 노출 제어 |
| Cross-Origin-Opener-Policy | 브라우징 컨텍스트 분리 |
| Cross-Origin-Resource-Policy | Cross-Origin 리소스 로딩 제한 |
| Cross-Origin-Embedder-Policy | Cross-Origin 리소스 포함 정책 제어 |
| Origin-Agent-Cluster | Origin 단위 격리 요청 |
| X-DNS-Prefetch-Control | DNS Prefetch 동작 제어 |
| X-Permitted-Cross-Domain-Policies | 일부 레거시 클라이언트의 정책 파일 사용 제한 |
| X-Download-Options | 레거시 브라우저의 다운로드 동작 제어 |
| X-XSS-Protection | 레거시 XSS 필터 비활성화 |
| X-Powered-By | 서버 기술 정보가 포함된 헤더 제거 |

**모든 헤더가 기본적으로 활성화되는 것은 아닙니다.**

예를 들어 Helmet 8에서는 `Cross-Origin-Embedder-Policy`가 기본적으로 설정되지 않으며, `X-XSS-Protection`은 레거시 브라우저의 문제가 있는 필터를 비활성화하기 위해 `0`으로 설정됩니다.

또한 기본값은 Helmet 버전에 따라 변경될 수 있으므로 실제 프로젝트에서 사용하는 버전의 공식 문서를 확인해야 합니다.

---

## 4. NestJS에서 Security Headers 활성화

NestJS에서는 프레임워크 버전에 따라 보안 헤더를 적용하는 방법이 다릅니다.

### 4.1. NestJS v12.1 이상

NestJS v12.1 이상에서는 `useSecurityHeaders()`를 사용할 수 있습니다.

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useSecurityHeaders();

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

이 방식은 NestJS가 제공하는 내장 Security Headers 기능을 사용합니다.

주요 특징은 다음과 같습니다.

- 추가적인 Helmet 패키지 설치가 필요하지 않습니다.
- Express와 Fastify에서 공통 API를 사용할 수 있습니다.
- Helmet 8과 동일한 기본 보안 헤더 정책을 제공합니다.
- 애플리케이션별로 보안 헤더 설정을 변경할 수 있습니다.

`useSecurityHeaders()`는 일반적인 Middleware 또는 Route 등록보다 먼저 설정하는 것이 좋습니다.

### 4.2. 기존 NestJS 버전

`useSecurityHeaders()`를 지원하지 않는 버전에서는 사용하는 HTTP Adapter에 따라 Helmet을 직접 등록해야 합니다.

Express에서는 `helmet`을 사용하고, Fastify에서는 `@fastify/helmet`을 사용합니다.

두 방식은 적용 방법이 다르므로 혼동하지 않아야 합니다.

---

## 5. Express에서 Helmet 사용

NestJS는 기본적으로 Express 기반 HTTP Adapter를 사용합니다.

Express 환경에서는 `helmet` 패키지를 Middleware로 등록할 수 있습니다.

### 5.1. 패키지 설치

```bash
npm install helmet
```

### 5.2. 기본 설정

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

`helmet()`은 HTTP 보안 헤더를 설정하는 Middleware 함수를 반환합니다.

NestJS의 `app.use()`는 해당 Middleware를 HTTP 요청 및 응답 처리 과정에 등록합니다.

### 5.3. Middleware 실행 순서

Helmet은 가능한 한 애플리케이션 초기화 과정의 앞부분에서 등록하는 것이 좋습니다.

```typescript
const app = await NestFactory.create(AppModule);

app.use(helmet());

app.enableCors({
  origin: 'https://app.example.com',
});

await app.listen(3000);
```

HTTP Middleware는 등록 순서와 Route 구성에 따라 적용 범위가 달라질 수 있습니다.

따라서 Helmet을 Route 등록 이후에 적용하면 일부 응답에 보안 헤더가 누락될 수 있습니다.

`main.ts`에서 전역적으로 Helmet을 먼저 등록하는 방식이 일반적입니다.

---

## 6. Fastify에서 Helmet 사용

NestJS에서 Fastify Adapter를 사용하는 경우에는 `@fastify/helmet` 패키지를 사용합니다.

### 6.1. 패키지 설치

```bash
npm install @nestjs/platform-fastify
npm install @fastify/helmet
```

설치할 `@fastify/helmet` 버전은 프로젝트의 Fastify 버전과 호환되어야 합니다.

### 6.2. 기본 설정

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import fastifyHelmet from '@fastify/helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
    );

  await app.register(fastifyHelmet);

  await app.listen({
    port: 3000,
    host: '0.0.0.0',
  });
}

bootstrap();
```

Fastify에서는 Helmet을 Middleware가 아닌 Plugin 형태로 등록합니다.

```typescript
await app.register(fastifyHelmet);
```

Express에서 사용하는 `app.use(helmet())`과 구분해야 합니다.

### 6.3. Express와 Fastify 비교

| 항목 | Express | Fastify |
|---|---|---|
| 패키지 | `helmet` | `@fastify/helmet` |
| 등록 방식 | `app.use()` | `app.register()` |
| 구성 요소 | Middleware | Fastify Plugin |
| 보안 헤더 설정 | Helmet 옵션 | Fastify Helmet 옵션 |
| NestJS 내장 API | `useSecurityHeaders()` 지원 버전에서 사용 가능 | 동일 |

---

## 7. Content Security Policy (CSP)

Content Security Policy(CSP)는 브라우저가 로드하거나 실행할 수 있는 리소스의 출처를 제한하는 보안 정책입니다.

CSP는 XSS 공격과 코드 삽입 공격으로 인한 피해를 완화하는 데 중요한 역할을 합니다.

### 7.1. CSP 동작 원리

```text
Browser
   |
   v
HTML Response
   |
   | Content-Security-Policy
   v
CSP Policy 확인
   |
   +----> Script Source 검사
   |
   +----> Style Source 검사
   |
   +----> Image Source 검사
   |
   +----> Connection Source 검사
   |
   v
Resource Loading
   |
   +---- 허용 ----> 리소스 로드
   |
   +---- 거부 ----> 브라우저 차단
```

CSP는 브라우저가 외부 리소스를 로드하거나 스크립트를 실행할 때 적용됩니다.

따라서 JSON 응답만 제공하는 REST API보다 HTML을 렌더링하는 애플리케이션에서 직접적인 영향이 큰 경우가 많습니다.

다만 REST API 서버에서도 Swagger UI, GraphQL Playground 또는 정적 파일을 제공한다면 CSP 설정이 중요할 수 있습니다.

### 7.2. 주요 CSP Directive

| Directive | 역할 |
|---|---|
| `default-src` | 다른 Fetch Directive의 기본 리소스 정책 |
| `script-src` | JavaScript 로딩 및 실행 제한 |
| `style-src` | CSS 로딩 및 인라인 스타일 제한 |
| `img-src` | 이미지 로딩 출처 제한 |
| `font-src` | 웹 폰트 로딩 출처 제한 |
| `connect-src` | Fetch, XMLHttpRequest, WebSocket 등의 연결 제한 |
| `frame-src` | 페이지가 포함할 수 있는 Frame 출처 제한 |
| `frame-ancestors` | 현재 페이지를 포함할 수 있는 상위 Frame 제한 |
| `object-src` | Object 및 Embed 리소스 제한 |
| `form-action` | HTML Form 제출 대상 제한 |
| `base-uri` | HTML Base URL 설정 제한 |
| `upgrade-insecure-requests` | 지원되는 HTTP 리소스 요청을 HTTPS로 업그레이드 |

### 7.3. CSP Header 예제

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'
```

위 정책의 의미는 다음과 같습니다.

- `default-src 'self'`: 기본적으로 동일 Origin의 리소스만 허용합니다.
- `script-src 'self'`: 동일 Origin에서 제공되는 JavaScript만 허용합니다.
- `object-src 'none'`: Object 및 Embed 리소스 로딩을 차단합니다.

`'self'`는 현재 문서의 Origin을 기준으로 판단합니다.

### 7.4. Helmet에서 CSP 설정

```typescript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
      },
    },
  }),
);
```

Helmet은 `contentSecurityPolicy.directives`를 이용하여 정책을 구성합니다.

기본적으로 지정한 Directive는 Helmet의 기본 CSP 정책과 병합됩니다.

모든 기본 Directive를 대체하려면 `useDefaults: false`를 명시해야 하지만, 이 경우 필요한 보안 정책을 직접 구성해야 하므로 주의가 필요합니다.

---

## 8. CSP Nonce

Nonce는 특정 응답에서 허용할 인라인 스크립트를 식별하기 위해 사용하는 일회성 값입니다.

CSP에서 인라인 스크립트를 일괄 허용하는 대신, 서버가 생성한 Nonce가 일치하는 스크립트만 실행하도록 제한할 수 있습니다.

### 8.1. 동작 원리

```text
NestJS Server
    |
    +----> Random Nonce 생성
    |
    +----> CSP Header에 Nonce 등록
    |
    +----> HTML Script에 Nonce 등록
    |
    v
Browser
    |
    +----> Nonce 일치 여부 확인
    |
    +---- 일치 ----> Script 실행
    |
    +---- 불일치 ----> Script 차단
```

### 8.2. Express에서 Nonce 생성

```typescript
import { randomBytes } from 'node:crypto';
import helmet from 'helmet';

app.use((req, res, next) => {
  res.locals.cspNonce = randomBytes(16).toString('base64');

  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: [
          "'self'",
          (req, res) =>
            `'nonce-${res.locals.cspNonce}'`,
        ],
      },
    },
  }),
);
```

서버가 HTML을 생성하는 경우에는 해당 응답의 Script 요소에도 동일한 Nonce를 지정해야 합니다.

```html
<script nonce="<server-generated-nonce>">
  // 허용된 인라인 스크립트
</script>
```

Nonce는 응답마다 새롭게 생성해야 합니다.

정적인 Nonce를 반복 사용하면 CSP의 보안 효과가 감소할 수 있습니다.

또한 Helmet의 CSP Directive Callback은 외부 Helmet 라이브러리에서 지원하는 방식입니다. NestJS 내장 `useSecurityHeaders()`에서는 CSP Directive 값에 함수를 전달할 수 없으므로 동일한 코드를 그대로 사용할 수 없습니다.

---

## 9. CSP Report-Only

CSP는 정책을 즉시 강제하는 방식 외에도 위반 사항만 보고하는 Report-Only 모드를 지원합니다.

운영 환경에 새로운 CSP 정책을 적용하기 전에 정상적인 리소스가 차단되는지 확인하는 데 유용합니다.

### 9.1. 설정 예제

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
      reportOnly: true,
    },
  }),
);
```

이 설정은 `Content-Security-Policy-Report-Only` 헤더를 생성합니다.

브라우저는 정책 위반을 보고하지만 해당 정책만으로 리소스를 차단하지는 않습니다.

### 9.2. 적용 절차

```text
CSP Policy 작성
    |
    v
Report-Only 적용
    |
    v
위반 사항 수집
    |
    v
정상 리소스 검토
    |
    v
CSP Policy 수정
    |
    v
Enforcing CSP 적용
```

위반 보고를 서버에 수집하려면 `report-to` 또는 지원되는 보고 설정과 수집 엔드포인트를 별도로 구성해야 합니다.

CSP가 보고하는 URL이나 리소스 정보에는 민감한 데이터가 포함될 수 있으므로 보고서 저장 및 접근 권한도 관리해야 합니다.

---

## 10. Strict Transport Security (HSTS)

HSTS(HTTP Strict Transport Security)는 브라우저가 특정 호스트에 대해 HTTPS 연결을 사용하도록 지시하는 보안 메커니즘입니다.

서버는 `Strict-Transport-Security` 헤더로 정책을 전달합니다.

### 10.1. HSTS Header

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

주요 Directive는 다음과 같습니다.

| Directive | 설명 |
|---|---|
| `max-age` | 브라우저가 HSTS 정책을 유지할 시간(초) |
| `includeSubDomains` | 하위 도메인에도 정책을 적용 |
| `preload` | HSTS Preload List 등록 의사를 표시 |

HSTS는 브라우저가 유효한 HTTPS 응답에서 정책을 수신한 이후 적용됩니다.

처음 접속하는 사용자의 최초 HTTP 연결까지 보호하려면 HSTS Preload와 같은 추가적인 방법을 고려해야 합니다.

### 10.2. Helmet에서 HSTS 설정

```typescript
app.use(
  helmet({
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false,
    },
  }),
);
```

Helmet 8의 기본 HSTS 설정은 일반적으로 1년의 `max-age`와 `includeSubDomains`를 사용합니다.

### 10.3. 운영 환경 주의사항

`includeSubDomains`는 모든 하위 도메인에 영향을 줄 수 있습니다.

따라서 해당 도메인 아래에 HTTPS를 지원하지 않는 서비스가 존재한다면 연결 문제가 발생할 수 있습니다.

`preload: true`를 설정한다고 해서 자동으로 브라우저의 HSTS Preload List에 등록되는 것은 아닙니다.

Preload 등록에는 별도의 요구사항과 등록 절차가 필요합니다.

### 10.4. 개발 환경의 HSTS

로컬 개발 환경에서 HTTP를 사용하는 경우 HSTS 설정 때문에 브라우저가 HTTPS 연결을 시도할 수 있습니다.

이러한 문제가 발생하지 않도록 개발 환경에서는 HSTS를 비활성화할 수 있습니다.

```typescript
const isProduction =
  process.env.NODE_ENV === 'production';

app.use(
  helmet({
    strictTransportSecurity: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
        }
      : false,
  }),
);
```

운영 환경에서 HSTS를 적용하기 전에는 HTTPS 설정과 하위 도메인의 지원 여부를 확인해야 합니다.

---

## 11. X-Content-Type-Options

`X-Content-Type-Options`는 브라우저가 응답의 Content-Type을 임의로 추측하는 MIME Type Sniffing 동작을 제한합니다.

### 11.1. 설정

```http
X-Content-Type-Options: nosniff
```

`nosniff`를 사용하면 브라우저가 특정 리소스에 대해 선언된 MIME Type을 엄격하게 적용합니다.

예를 들어 JavaScript 파일이 잘못된 Content-Type으로 반환되면 브라우저가 실행을 거부할 수 있습니다.

### 11.2. Helmet 설정

Helmet은 기본적으로 해당 헤더를 설정합니다.

```typescript
app.use(
  helmet({
    xContentTypeOptions: true,
  }),
);
```

이 설정은 MIME Type Sniffing으로 인한 일부 보안 문제를 완화하는 데 도움이 됩니다.

단, 서버가 올바른 Content-Type을 반환하도록 구성하는 것 역시 중요합니다.

---

## 12. X-Frame-Options

`X-Frame-Options`는 다른 웹페이지에서 현재 페이지를 iframe 등의 Frame으로 삽입할 수 있는지 제어합니다.

Clickjacking 공격을 완화하는 데 사용됩니다.

### 12.1. Clickjacking

Clickjacking은 공격자가 정상 웹페이지를 다른 화면에 겹쳐 배치하여 사용자가 의도하지 않은 버튼이나 UI 요소를 클릭하도록 유도하는 공격입니다.

```text
Malicious Website
        |
        +----> Hidden iframe
                    |
                    v
             Legitimate Website
                    |
                    v
             사용자 클릭 유도
```

### 12.2. 주요 정책

| 값 | 설명 |
|---|---|
| `DENY` | 모든 Frame 삽입을 거부합니다. |
| `SAMEORIGIN` | 동일 Origin에서의 Frame 삽입을 허용합니다. |

### 12.3. Helmet 설정

```typescript
app.use(
  helmet({
    xFrameOptions: {
      action: 'deny',
    },
  }),
);
```

위 설정은 다음 헤더를 생성합니다.

```http
X-Frame-Options: DENY
```

최신 브라우저에서는 CSP의 `frame-ancestors` Directive를 통해 보다 세밀한 Frame 정책을 구성할 수 있습니다.

```http
Content-Security-Policy: frame-ancestors 'self'
```

`frame-ancestors`는 허용할 상위 Frame의 출처를 지정할 수 있어 `X-Frame-Options`보다 유연합니다.

다만 레거시 브라우저 호환성을 위해 두 방식을 함께 사용하는 경우도 있습니다.

---

## 13. Referrer-Policy

`Referrer-Policy`는 브라우저가 다른 페이지 또는 리소스로 요청할 때 전달하는 Referer 정보의 범위를 제어합니다.

### 13.1. Referer Header

브라우저는 요청이 발생한 페이지의 URL 정보를 Referer 헤더로 전달할 수 있습니다.

```http
Referer: https://app.example.com/articles/100
```

이 정보는 분석이나 로그 처리에 활용될 수 있지만, 경우에 따라 URL 경로나 Query String에 포함된 정보가 외부 서비스에 노출될 수 있습니다.

### 13.2. 주요 정책

| 정책 | 설명 |
|---|---|
| `no-referrer` | Referer 헤더를 전달하지 않습니다. |
| `same-origin` | 동일 Origin 요청에만 Referer 정보를 전달합니다. |
| `strict-origin` | 안전한 조건에서 Origin 정보만 전달합니다. |
| `strict-origin-when-cross-origin` | 요청 관계에 따라 전체 URL 또는 Origin을 전달합니다. |

### 13.3. Helmet 설정

```typescript
app.use(
  helmet({
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  }),
);
```

Helmet 8의 기본값은 `no-referrer`입니다.

필요한 분석 기능이나 외부 서비스 연동 요구사항을 고려하여 정책을 변경할 수 있습니다.

---

## 14. Cross-Origin 관련 보안 헤더

Helmet은 CORS와는 별도로 Cross-Origin 리소스 및 브라우징 컨텍스트를 제어하기 위한 여러 헤더를 제공합니다.

### 14.1. Cross-Origin-Resource-Policy (CORP)

CORP는 다른 Origin 또는 Site에서 특정 리소스를 로드할 수 있는지 제한합니다.

```http
Cross-Origin-Resource-Policy: same-origin
```

대표적인 값은 다음과 같습니다.

| 값 | 설명 |
|---|---|
| `same-origin` | 동일 Origin에서의 로딩만 허용 |
| `same-site` | 동일 Site에서의 로딩 허용 |
| `cross-origin` | Cross-Origin 로딩 허용 |

Helmet에서 다음과 같이 설정할 수 있습니다.

```typescript
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'same-site',
    },
  }),
);
```

### 14.2. Cross-Origin-Opener-Policy (COOP)

COOP는 브라우저의 최상위 문서가 다른 Origin의 문서와 브라우징 컨텍스트 그룹을 공유하는 방식을 제어합니다.

```http
Cross-Origin-Opener-Policy: same-origin
```

일부 Cross-Origin Window 참조를 분리하여 보안 경계를 강화할 수 있습니다.

다만 외부 로그인 Popup 등과 연동할 때는 정책에 따라 정상적인 통신이 제한될 수 있습니다.

### 14.3. Cross-Origin-Embedder-Policy (COEP)

COEP는 문서가 Cross-Origin 리소스를 포함하는 조건을 제어합니다.

```http
Cross-Origin-Embedder-Policy: require-corp
```

Helmet 8에서는 COEP가 기본적으로 활성화되지 않습니다.

필요한 경우 다음과 같이 설정할 수 있습니다.

```typescript
app.use(
  helmet({
    crossOriginEmbedderPolicy: true,
  }),
);
```

COEP를 활성화하면 외부 이미지, 스크립트 등의 리소스 로딩이 제한될 수 있으므로 실제 서비스에서 사용하는 리소스와의 호환성을 확인해야 합니다.

### 14.4. CORS와의 차이

| 구분 | 주요 목적 |
|---|---|
| CORS | Cross-Origin 응답을 JavaScript가 읽을 수 있는지 제어 |
| CORP | Cross-Origin 리소스 로딩 제한 |
| COOP | 브라우징 컨텍스트 그룹 분리 |
| COEP | Cross-Origin 리소스 포함 조건 제어 |
| CSP | 리소스 출처와 실행 정책 제어 |

각 헤더는 서로 다른 보안 경계를 담당하므로 하나의 헤더로 모든 Cross-Origin 보안 요구사항을 충족할 수는 없습니다.

---

## 15. NestJS Security Headers 설정 사용자 정의

보안 헤더는 애플리케이션의 동작 방식에 따라 조정해야 합니다.

특히 REST API, Server-Side Rendering, Swagger UI 및 GraphQL 환경에서는 필요한 정책이 다를 수 있습니다.

### 15.1. Express 기반 설정

다음 예제는 Express와 Helmet을 사용하는 애플리케이션의 설정 예시입니다.

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction =
    process.env.NODE_ENV === 'production';

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProduction
            ? []
            : null,
        },
      },
      strictTransportSecurity: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
          }
        : false,
      referrerPolicy: {
        policy: 'no-referrer',
      },
      xFrameOptions: {
        action: 'sameorigin',
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

위 예제는 기본 CSP 정책을 유지하면서 일부 Directive를 변경합니다.

`upgradeInsecureRequests`를 개발 환경에서 비활성화하는 이유는 HTTP 기반 로컬 개발 환경에서 브라우저가 HTTPS 연결을 강제하는 문제를 줄이기 위해서입니다.

실제 운영 환경에서는 애플리케이션의 외부 리소스와 배포 구조를 확인하여 CSP 및 HSTS를 조정해야 합니다.

### 15.2. NestJS 내장 Security Headers 설정

NestJS v12.1 이상에서는 다음과 같은 방식으로 구성할 수 있습니다.

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction =
    process.env.NODE_ENV === 'production';

  app.useSecurityHeaders({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction
          ? []
          : null,
      },
    },
    strictTransportSecurity: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
        }
      : false,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

내장 API는 Helmet과 유사한 옵션 이름을 사용합니다.

다만 기존 Helmet의 일부 레거시 별칭은 지원하지 않으므로 다음과 같은 현재 옵션 이름을 사용해야 합니다.

| 기존 별칭 | 현재 옵션 이름 |
|---|---|
| `hsts` | `strictTransportSecurity` |
| `frameguard` | `xFrameOptions` |
| `noSniff` | `xContentTypeOptions` |
| `hidePoweredBy` | `xPoweredBy` |
| `dnsPrefetchControl` | `xDnsPrefetchControl` |

또한 외부 Helmet에서는 CSP Directive 값에 함수를 지정할 수 있지만, NestJS 내장 API에서는 해당 기능을 지원하지 않습니다.

---

## 16. Swagger UI와 Helmet

NestJS에서 Swagger UI를 제공하는 경우 Helmet의 CSP 설정과 충돌할 수 있습니다.

Swagger UI는 JavaScript 및 CSS 리소스를 사용하므로 CSP 정책이 지나치게 엄격하면 UI가 정상적으로 표시되지 않을 수 있습니다.

### 16.1. 문제 발생 구조

```text
Browser
   |
   | GET /api-docs
   v
NestJS Server
   |
   v
Swagger UI HTML
   |
   +----> JavaScript 로드
   |
   +----> CSS 로드
   |
   v
CSP 검사
   |
   +---- 허용 ----> Swagger UI 실행
   |
   +---- 거부 ----> 리소스 차단
```

### 16.2. 문제 확인

브라우저 개발자 도구의 Console에서 CSP 관련 오류를 확인할 수 있습니다.

```text
Refused to execute script because
it violates the Content Security Policy.
```

### 16.3. 해결 방법

우선 현재 사용하는 `@nestjs/swagger` 버전과 Swagger UI의 실제 리소스 구성을 확인해야 합니다.

최신 NestJS 공식 Security Headers 문서에서는 내장 `useSecurityHeaders()`의 기본 정책이 `@nestjs/swagger`에서 제공하는 Swagger UI와 호환되도록 구성되어 있다고 설명합니다.

반면 Helmet을 직접 사용하는 경우에는 적용한 CSP 정책과 HTTP Adapter 구성에 따라 추가 조정이 필요할 수 있습니다.

문제가 발생하면 다음과 같은 순서로 확인하는 것이 좋습니다.

1. 브라우저 Console에서 차단된 CSP Directive를 확인합니다.
2. 차단된 JavaScript 또는 CSS 리소스의 출처를 확인합니다.
3. 필요한 리소스 출처만 CSP에 추가합니다.
4. 인라인 Script가 필요한 경우 Nonce 또는 Hash 기반 허용 방식을 검토합니다.
5. 정상 동작 여부를 테스트합니다.

CSP 오류를 해결하기 위해 무조건 `contentSecurityPolicy: false`로 변경하는 것은 권장되지 않습니다.

개발 편의를 위해 제한적으로 비활성화하더라도 운영 환경에서는 필요한 정책을 복원해야 합니다.

---

## 17. GraphQL과 Helmet

GraphQL API를 사용하는 경우에도 Helmet을 적용할 수 있습니다.

다만 Apollo Sandbox 또는 GraphQL Playground 등의 개발 도구가 외부 리소스를 사용하는 경우 CSP 또는 COEP와 충돌할 수 있습니다.

### 17.1. Apollo Sandbox

Apollo Sandbox는 개발 도구를 표시하기 위해 외부 Script 및 Frame 등을 사용할 수 있습니다.

이러한 리소스의 출처가 CSP에서 허용되지 않으면 Sandbox 화면이 표시되지 않을 수 있습니다.

### 17.2. 개발 환경과 운영 환경 분리

GraphQL 개발 도구는 개발 환경에서만 활성화하거나 별도의 접근 제어를 적용하는 것이 좋습니다.

보안 헤더를 설정할 때는 다음 사항을 고려해야 합니다.

- GraphQL API 자체의 인증 및 인가 정책
- Apollo Sandbox의 외부 리소스
- CSP의 `script-src` 및 `frame-src`
- Cross-Origin 관련 보안 헤더
- 운영 환경에서 개발 도구의 공개 여부

`'unsafe-inline'` 또는 `'unsafe-eval'`을 추가하면 일부 도구와의 호환성은 높일 수 있지만 XSS 방어 수준이 낮아질 수 있습니다.

따라서 이러한 설정은 필요한 범위로 제한하고 가능한 경우 Nonce 또는 Hash 기반 정책을 사용하는 것이 좋습니다.

---

## 18. Reverse Proxy 환경에서의 Helmet

운영 환경에서는 NestJS 앞에 Reverse Proxy 또는 API Gateway를 배치하는 경우가 많습니다.

```text
Browser
   |
   v
Nginx / API Gateway
   |
   v
NestJS Application
   |
   v
HTTP Response
```

이러한 환경에서는 보안 헤더를 어느 계층에서 생성하고 관리할지 결정해야 합니다.

### 18.1. NestJS에서 관리

NestJS가 Helmet 또는 `useSecurityHeaders()`를 통해 보안 헤더를 설정합니다.

이 방식은 애플리케이션 코드와 보안 정책을 함께 관리할 수 있다는 장점이 있습니다.

### 18.2. Reverse Proxy에서 관리

Nginx나 API Gateway에서 보안 헤더를 설정할 수도 있습니다.

이 방식은 여러 애플리케이션에 공통 정책을 적용할 때 유용합니다.

### 18.3. 중복 설정 주의

NestJS와 Reverse Proxy가 동일한 보안 헤더를 서로 다른 값으로 설정하면 브라우저에서 예상하지 못한 동작이 발생할 수 있습니다.

예를 들어 서로 다른 CSP 정책을 각각 전달하면 브라우저가 두 정책을 모두 적용할 수 있으며, 결과적으로 리소스 로딩이 더 엄격하게 제한될 수 있습니다.

따라서 보안 헤더별 정책 관리 위치와 책임을 명확하게 구분해야 합니다.

---

## 19. 개발 환경과 운영 환경의 설정 차이

보안 헤더는 개발 환경과 운영 환경에서 서로 다른 요구사항을 가질 수 있습니다.

| 설정 | 개발 환경 | 운영 환경 |
|---|---|---|
| CSP | 개발 도구를 고려하여 조정 | 필요한 출처만 허용 |
| HSTS | 로컬 HTTP 환경에서는 비활성화 가능 | HTTPS 구성을 확인한 뒤 활성화 |
| Referrer-Policy | 서비스 요구사항에 맞게 설정 | 정보 노출 최소화 |
| X-Frame-Options | 개발 도구 구성 고려 | Frame 삽입 정책 명시 |
| COEP | 외부 개발 도구 호환성 고려 | 필요한 경우 활성화 |
| Swagger UI | 개발 편의에 따라 제공 | 접근 제한 또는 비활성화 검토 |

### 19.1. 환경별 구성 예제

```typescript
const isProduction =
  process.env.NODE_ENV === 'production';

app.use(
  helmet({
    strictTransportSecurity: isProduction,
    contentSecurityPolicy: {
      directives: {
        upgradeInsecureRequests: isProduction
          ? []
          : null,
      },
    },
  }),
);
```

운영 환경에서는 HTTPS를 실제로 제공하는지 확인한 뒤 HSTS를 활성화해야 합니다.

환경별 설정을 분리하더라도 보안 헤더 전체를 개발 환경에서 일괄 비활성화하는 방식은 피하는 것이 좋습니다.

---

## 20. Helmet과 다른 보안 기능의 관계

Helmet은 HTTP 응답 헤더를 설정하는 기능이므로 다른 보안 기술을 대체할 수 없습니다.

| 보안 기능 | 역할 |
|---|---|
| Helmet | HTTP 응답 보안 헤더 설정 |
| Authentication | 사용자 신원 검증 |
| Authorization | 사용자 접근 권한 검증 |
| CORS | Cross-Origin 응답 접근 제어 |
| CSRF Protection | 위조된 상태 변경 요청 방어 |
| Validation | 요청 데이터 유효성 검증 |
| Rate Limiting | 과도한 요청 제한 |
| HTTPS / TLS | 네트워크 통신 암호화 |

예를 들어 CSP는 XSS 공격의 위험을 줄일 수 있지만 입력값 검증이나 안전한 출력 인코딩을 대체하지 않습니다.

HSTS는 HTTPS 연결 사용을 강제하는 데 도움을 주지만 TLS 인증서 관리나 서버의 HTTPS 구성을 대신하지 않습니다.

따라서 Helmet은 다중 계층 보안(Defense in Depth)의 한 구성 요소로 이해해야 합니다.

---

## 21. Helmet 테스트

Helmet 설정은 실제 HTTP 응답에 필요한 헤더가 포함되는지 확인하여 검증할 수 있습니다.

### 21.1. curl 테스트

NestJS 애플리케이션 실행 후 다음 명령어를 사용합니다.

```bash
curl -I http://localhost:3000
```

응답 헤더에서 다음 항목을 확인할 수 있습니다.

```http
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: no-referrer
```

HSTS는 실제 HTTPS 응답을 기준으로 검증하는 것이 적절합니다.

또한 `curl -I`는 HEAD 요청을 보내므로 테스트 대상 경로의 HEAD 처리 여부에 따라 다른 응답이 나타날 수 있습니다.

GET 응답 헤더를 확인하려면 다음과 같이 요청할 수도 있습니다.

```bash
curl -s -D - -o /dev/null http://localhost:3000
```

### 21.2. E2E 테스트

NestJS의 E2E 테스트에서 HTTP 응답 헤더를 검증할 수 있습니다.

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import helmet from 'helmet';

import { AppModule } from '../src/app.module';

describe('Security Headers (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.use(helmet());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('보안 헤더를 반환합니다.', async () => {
    const response = await request(
      app.getHttpServer(),
    ).get('/');

    expect(
      response.headers['x-content-type-options'],
    ).toBe('nosniff');

    expect(
      response.headers['x-frame-options'],
    ).toBe('SAMEORIGIN');

    expect(
      response.headers['content-security-policy'],
    ).toBeDefined();
  });
});
```

이 예제는 Express 기반 테스트 환경을 가정합니다.

`supertest` 및 관련 테스트 패키지가 설치되어 있어야 하며, 실제 애플리케이션의 응답 경로와 보안 헤더 설정에 맞게 테스트를 조정해야 합니다.

### 21.3. 테스트 항목

| 테스트 항목 | 검증 내용 |
|---|---|
| CSP | 허용되지 않은 리소스가 차단되는지 확인 |
| HSTS | HTTPS 응답에서 올바른 정책을 반환하는지 확인 |
| X-Frame-Options | Frame 삽입 정책 확인 |
| X-Content-Type-Options | `nosniff` 설정 확인 |
| Referrer-Policy | URL 정보 전달 정책 확인 |
| Swagger UI | 보안 정책 적용 후 정상 동작 확인 |
| GraphQL 개발 도구 | 필요한 리소스가 정상적으로 로드되는지 확인 |
| Reverse Proxy | 중복되거나 충돌하는 헤더가 없는지 확인 |

CSP와 같은 브라우저 보안 정책은 HTTP 응답 헤더 검사만으로 충분히 검증하기 어렵습니다.

실제 브라우저에서 리소스 로딩 및 차단 동작을 추가로 테스트하는 것이 좋습니다.

---

## 22. 운영 환경의 보안 고려사항

### 22.1. 기본 설정만으로 충분하다고 가정하지 않습니다

Helmet의 기본 설정은 일반적인 보안 수준을 개선하는 데 도움을 주지만 모든 애플리케이션의 요구사항을 충족하지는 않습니다.

정적 리소스, 외부 CDN, 인증 방식 및 배포 환경에 따라 필요한 정책이 다릅니다.

### 22.2. CSP를 과도하게 완화하지 않습니다

다음과 같은 설정은 CSP의 XSS 방어 효과를 약화시킬 수 있습니다.

```http
Content-Security-Policy: script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

필요한 경우에도 적용 범위를 최소화해야 합니다.

특히 운영 환경에서는 Nonce 또는 Hash 기반 정책을 우선적으로 검토하는 것이 좋습니다.

### 22.3. HSTS 적용 범위를 검증합니다

`includeSubDomains`와 `preload`는 도메인 전체에 장기간 영향을 줄 수 있습니다.

따라서 모든 하위 도메인의 HTTPS 지원 여부와 향후 운영 계획을 확인해야 합니다.

### 22.4. 서버 정보 노출 최소화

Helmet은 `X-Powered-By` 헤더를 제거할 수 있습니다.

```http
X-Powered-By: Express
```

이러한 헤더를 제거하면 불필요한 기술 정보 노출을 줄일 수 있습니다.

다만 이것만으로 서버의 프레임워크나 버전을 완전히 숨길 수 있는 것은 아닙니다.

### 22.5. CSP 정책을 지속적으로 검증합니다

프론트엔드 애플리케이션에 새로운 CDN, Analytics, 결제 SDK 또는 외부 인증 기능을 추가하면 CSP 정책을 변경해야 할 수 있습니다.

따라서 새로운 외부 리소스가 도입될 때마다 다음 사항을 확인해야 합니다.

- Script 및 Style 출처
- Image 및 Font 출처
- API 및 WebSocket 연결 출처
- 외부 Frame 사용 여부
- 인라인 Script 사용 여부
- CSP 위반 보고

### 22.6. 라이브러리 버전을 관리합니다

Helmet과 HTTP Adapter 관련 패키지는 보안 수정 및 기본 정책 변경이 발생할 수 있습니다.

따라서 다음 사항을 관리해야 합니다.

- NestJS 버전
- Helmet 버전
- Fastify 및 관련 Plugin 버전
- 보안 취약점 공지
- 변경된 기본 HTTP 보안 헤더
- 애플리케이션 호환성 테스트

---

## 23. 관련 문서

- `00-overview/request-lifecycle.md`: HTTP 요청 처리 과정
- `02-request-lifecycle/middleware.md`: Middleware의 실행 구조
- `03-techniques/configuration.md`: 환경변수 및 애플리케이션 설정
- `04-security/authentication.md`: 사용자 인증
- `04-security/authorization.md`: 접근 권한 검증
- `04-security/encryption-and-hashing.md`: 데이터 암호화 및 해싱
- `04-security/cors.md`: Cross-Origin Resource Sharing
- `04-security/csrf.md`: CSRF 공격 방어
- `04-security/rate-limiting.md`: HTTP 요청 제한
- `05-platforms/rest-api.md`: REST API 구성
- `05-platforms/graphql.md`: GraphQL API 구성
- `06-testing/e2e-testing.md`: E2E 테스트
- `08-deployment/environment-configuration.md`: 운영 환경 구성

---

## 24. 정리

Helmet은 HTTP 응답에 보안 관련 헤더를 설정하여 웹 애플리케이션의 보안 수준을 높이는 라이브러리입니다.

NestJS에서는 내장 Security Headers API 또는 HTTP Adapter에 적합한 Helmet 라이브러리를 이용하여 보안 정책을 적용할 수 있습니다.

핵심 사항은 다음과 같습니다.

1. **Helmet**은 HTTP 보안 헤더 설정을 통해 일부 웹 보안 취약점을 완화합니다.
2. **NestJS v12.1 이상**에서는 `useSecurityHeaders()`를 통해 내장 보안 헤더 기능을 사용할 수 있습니다.
3. **Express**에서는 `helmet`을 Middleware로 등록합니다.
4. **Fastify**에서는 `@fastify/helmet`을 Plugin으로 등록합니다.
5. **CSP**는 브라우저가 실행하거나 로드할 수 있는 리소스의 출처를 제어합니다.
6. **HSTS**는 브라우저가 HTTPS 연결을 사용하도록 지시합니다.
7. **X-Content-Type-Options**는 MIME Type Sniffing을 제한합니다.
8. **X-Frame-Options**는 Clickjacking 공격을 완화하는 데 사용합니다.
9. **Referrer-Policy**는 Referer 헤더에 포함되는 정보의 범위를 제한합니다.
10. **COOP, CORP, COEP**는 Cross-Origin 브라우징 컨텍스트 및 리소스 로딩을 제어합니다.
11. **Swagger UI와 GraphQL 개발 도구**는 CSP 정책과 충돌할 수 있으므로 호환성을 검증해야 합니다.
12. **Helmet은 인증, 인가, CORS, CSRF 및 입력값 검증을 대체하지 않습니다.**

운영 환경에서는 Helmet을 단순히 활성화하는 것에 그치지 않고, 실제 애플리케이션의 리소스 구성과 배포 환경에 맞는 보안 헤더 정책을 정의해야 합니다.

특히 CSP와 HSTS는 잘못된 설정이 정상적인 서비스 동작에 영향을 줄 수 있으므로 단계적으로 적용하고 테스트하는 것이 중요합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - Security Headers (Helmet)](https://docs.nestjs.com/security/helmet)
- [NestJS - CORS](https://docs.nestjs.com/security/cors)
- [NestJS - CSRF Protection](https://docs.nestjs.com/security/csrf)
- [NestJS - Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS - Middleware](https://docs.nestjs.com/middleware)
- [NestJS - HTTP Adapters](https://docs.nestjs.com/techniques/performance)
- [NestJS - OpenAPI (Swagger)](https://docs.nestjs.com/openapi/introduction)

### Helmet 공식 자료

- [Helmet 공식 사이트](https://helmetjs.org/)
- [Helmet GitHub Repository](https://github.com/helmetjs/helmet)
- [Helmet npm](https://www.npmjs.com/package/helmet)
- [Fastify Helmet GitHub Repository](https://github.com/fastify/fastify-helmet)
- [Fastify Helmet npm](https://www.npmjs.com/package/@fastify/helmet)

### MDN Web Docs

- [MDN - HTTP Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides)
- [MDN - Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
- [MDN - Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
- [MDN - X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options)
- [MDN - X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)
- [MDN - Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [MDN - Cross-Origin-Opener-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy)
- [MDN - Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)
- [MDN - Cross-Origin-Resource-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Resource-Policy)

### OWASP 보안 가이드

- [OWASP - HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [OWASP - Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [OWASP - Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
- [OWASP - Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP - Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)

### 보안 정책 검증 도구

- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SecurityHeaders.com](https://securityheaders.com/)
- [HSTS Preload](https://hstspreload.org/)