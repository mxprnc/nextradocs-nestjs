# Rate Limiting

## 1. 개요

Rate Limiting은 일정 시간 동안 클라이언트가 서버에 전송할 수 있는 요청 횟수를 제한하는 기술입니다.

웹 애플리케이션에서는 특정 사용자가 짧은 시간에 지나치게 많은 요청을 보내거나, 자동화된 프로그램이 API를 반복적으로 호출하여 서버 자원을 소모하는 상황이 발생할 수 있습니다.

Rate Limiting은 이러한 요청을 제한하여 애플리케이션의 안정성을 높이고, Brute-Force Attack, API Abuse 및 일부 서비스 거부 공격의 영향을 완화하는 데 활용됩니다.

NestJS에서는 공식 패키지인 `@nestjs/throttler`를 이용하여 Rate Limiting을 구현할 수 있습니다.

`@nestjs/throttler`는 NestJS의 Guard와 통합되며, 전역 또는 Controller 및 Handler 수준에서 요청 제한 정책을 적용할 수 있습니다.

대표적인 활용 사례는 다음과 같습니다.

| 활용 사례 | 설명 |
|---|---|
| 로그인 API 보호 | 반복적인 비밀번호 추측 요청을 제한합니다. |
| 회원가입 API 보호 | 자동화된 계정 생성 요청을 제한합니다. |
| 비밀번호 재설정 | 이메일 발송 및 복구 요청의 남용을 방지합니다. |
| 공개 API 보호 | 과도한 API 호출을 제한합니다. |
| 외부 서비스 연동 | API 사용량 정책을 적용합니다. |
| 고비용 작업 보호 | CPU, 메모리 및 데이터베이스 자원을 많이 사용하는 요청을 제한합니다. |
| WebSocket 메시지 제한 | 클라이언트의 과도한 메시지 전송을 제어합니다. |

Rate Limiting은 애플리케이션 보안과 안정성을 향상하는 수단이지만, 모든 종류의 DDoS 공격을 방어할 수 있는 것은 아닙니다.

대규모 트래픽 공격에 대응하려면 Load Balancer, API Gateway, WAF 및 네트워크 수준의 보호 기능을 함께 고려해야 합니다.

---

## 2. Rate Limiting의 동작 원리

Rate Limiting은 요청을 구분하는 식별자와 제한 시간 및 최대 요청 횟수를 기준으로 동작합니다.

예를 들어 특정 IP 주소에서 60초 동안 최대 10개의 요청만 허용하도록 설정할 수 있습니다.

```text
Client
   |
   | HTTP Request
   v
Rate Limiter
   |
   +----> Client 식별
   |
   +----> 요청 횟수 조회
   |
   +----> 제한 정책 검사
   |
   +---- 허용 ----> Controller Handler
   |
   +---- 초과 ----> 429 Too Many Requests
```

요청을 식별하는 기준으로는 다음과 같은 정보를 사용할 수 있습니다.

- IP Address
- User ID
- API Key
- Tenant ID
- Session ID
- API Endpoint

실제 구현에서는 식별 기준을 조합하여 적용할 수도 있습니다.

### 2.1. 주요 구성 요소

| 구성 요소 | 설명 |
|---|---|
| Tracker | 요청을 보낸 클라이언트를 식별하는 값 |
| Key | 요청 제한 상태를 저장하기 위한 식별자 |
| Limit | 허용할 최대 요청 횟수 |
| TTL | 요청 횟수를 추적할 시간 범위 |
| Storage | 요청 횟수와 제한 상태를 관리하는 저장소 |
| Guard | 요청 제한 정책을 검사하는 NestJS 구성 요소 |

### 2.2. 요청 제한 예제

다음과 같은 정책을 가정합니다.

```text
Limit = 5 requests
TTL   = 60 seconds
```

같은 클라이언트가 제한 시간 안에 요청하는 경우 다음과 같이 처리됩니다.

| 요청 | 요청 횟수 | 결과 |
|---|---:|---|
| 첫 번째 | 1 | 허용 |
| 두 번째 | 2 | 허용 |
| 세 번째 | 3 | 허용 |
| 네 번째 | 4 | 허용 |
| 다섯 번째 | 5 | 허용 |
| 여섯 번째 | 6 | 429 Too Many Requests |

설정된 시간 범위가 만료되면 저장소의 상태와 알고리즘에 따라 다시 요청할 수 있습니다.

`@nestjs/throttler`의 기본 구현은 요청별 만료 정보를 관리하는 방식이며, 정확한 제한 및 차단 동작은 Storage 구현과 `blockDuration` 설정에 따라 달라질 수 있습니다.

---

## 3. Rate Limiting 알고리즘

Rate Limiting은 요청 횟수를 계산하는 방식에 따라 여러 알고리즘으로 구현할 수 있습니다.

대표적인 알고리즘은 다음과 같습니다.

| 알고리즘 | 특징 |
|---|---|
| Fixed Window Counter | 고정된 시간 구간에서 요청 횟수를 계산합니다. |
| Sliding Window Log | 개별 요청 시각을 기록하여 이동하는 시간 구간의 요청을 계산합니다. |
| Sliding Window Counter | 여러 시간 구간의 카운터를 조합하여 요청량을 근사하거나 계산합니다. |
| Token Bucket | 일정한 속도로 Token을 보충하고 요청마다 Token을 소비합니다. |
| Leaky Bucket | 요청을 일정한 속도로 처리하거나 유출시키는 방식입니다. |

### 3.1. Fixed Window Counter

Fixed Window Counter는 시간을 고정된 구간으로 나누어 요청 횟수를 계산합니다.

예를 들어 1분 동안 최대 5개의 요청을 허용합니다.

```text
Window 1                Window 2
0s ----------- 60s      60s ----------- 120s

[1][2][3][4][5]         [1][2][3][4][5]
```

구현이 비교적 단순하고 저장소 사용량이 적다는 장점이 있습니다.

그러나 시간 구간의 경계에서 요청이 집중될 수 있습니다.

예를 들어 첫 번째 구간의 마지막 순간에 5개, 다음 구간의 시작 순간에 5개 요청이 발생하면 매우 짧은 시간에 총 10개 요청이 처리될 수 있습니다.

### 3.2. Sliding Window

Sliding Window는 현재 요청 시점을 기준으로 일정 시간 범위의 요청을 계산합니다.

```text
Current Time
     |
     v
<-------- 60 seconds -------->
     Request History
       [1][2][3][4]
```

고정된 구간 경계에서 발생하는 요청 집중 문제를 완화할 수 있습니다.

다만 정확한 요청 기록을 저장하는 구현은 메모리와 저장소 사용량이 증가할 수 있습니다.

### 3.3. Token Bucket

Token Bucket은 일정한 속도로 Token을 보충하고, 요청이 발생할 때 Token을 소비하는 방식입니다.

```text
Token Refill
     |
     v
+----------------+
|  Token Bucket  |
|   ● ● ● ● ●    |
+----------------+
     |
     | Request
     v
Consume Token
     |
     +---- Token 있음 ----> Allow
     |
     +---- Token 없음 ----> Reject / Wait
```

Token Bucket은 일정 수준의 Burst Traffic을 허용하면서 장기적인 평균 요청 속도를 제한하는 데 적합합니다.

### 3.4. Leaky Bucket

Leaky Bucket은 요청을 일정한 속도로 처리하도록 제어하는 방식입니다.

```text
Incoming Requests
       |
       v
+-----------------+
| Request Queue   |
+-----------------+
       |
       | Fixed Processing Rate
       v
Application
```

요청 처리량을 일정하게 유지하는 데 유용합니다.

다만 대기열이 가득 차면 요청을 거부하거나 별도의 Backpressure 정책이 필요합니다.

### 3.5. 알고리즘 선택

각 알고리즘은 처리량, Burst 허용 여부, 저장소 비용, 구현 복잡도에 따라 장단점이 다릅니다.

`@nestjs/throttler`는 설정된 TTL과 요청 횟수를 추적하는 기본 Storage를 제공하며, Token Bucket이나 Sliding Window Log와 같은 알고리즘을 선택하는 범용 옵션을 제공하는 것은 아닙니다.

특정 알고리즘이 필요한 경우 별도의 Rate Limiter 또는 Custom Storage 구현을 검토해야 합니다.

---

## 4. NestJS Rate Limiting 아키텍처

NestJS의 Rate Limiting은 `ThrottlerModule`, `ThrottlerGuard`, `ThrottlerStorage`를 중심으로 구성됩니다.

```text
HTTP Request
    |
    v
ThrottlerGuard
    |
    +----> Tracker 생성
    |
    +----> Storage Key 생성
    |
    +----> ThrottlerStorage
    |          |
    |          +----> 요청 횟수 갱신
    |          |
    |          +----> 제한 상태 확인
    |
    +---- 제한 초과 ----> 429
    |
    v
Controller Handler
    |
    v
Service
    |
    v
HTTP Response
```

### 4.1. 주요 구성 요소

| 구성 요소 | 역할 |
|---|---|
| `ThrottlerModule` | Rate Limiting 설정을 등록합니다. |
| `ThrottlerGuard` | 요청 횟수를 검사하고 접근 여부를 결정합니다. |
| `ThrottlerStorage` | 요청 횟수와 만료 상태를 관리합니다. |
| `@Throttle()` | Controller 또는 Handler의 제한 정책을 변경합니다. |
| `@SkipThrottle()` | 특정 Controller 또는 Handler의 제한 정책을 제외합니다. |
| `APP_GUARD` | ThrottlerGuard를 전역으로 등록합니다. |
| `ExecutionContext` | 현재 요청의 실행 환경과 Handler 정보를 제공합니다. |

`ThrottlerModule`에 제한 정책을 등록하더라도 Guard를 적용하지 않으면 해당 정책이 자동으로 모든 요청에 적용되는 것은 아닙니다.

따라서 Module 설정과 Guard 등록을 함께 수행해야 합니다.

---

## 5. @nestjs/throttler 설치

NestJS의 Rate Limiting 기능은 공식 패키지인 `@nestjs/throttler`를 사용합니다.

### 5.1. 패키지 설치

```bash
npm install @nestjs/throttler
```

`@nestjs/throttler`는 NestJS의 Module과 Guard 구조에 통합되는 패키지입니다.

실제 프로젝트에 설치할 때는 NestJS의 주요 패키지 버전과 호환되는 `@nestjs/throttler` 버전을 선택해야 합니다.

### 5.2. 기본 설정

```typescript
// src/app.module.ts

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import {
  ThrottlerModule,
  ThrottlerGuard,
} from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 10,
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

이 설정은 다음 정책을 적용합니다.

```text
TTL   = 60,000 ms
Limit = 10 requests
```

즉, 기본적으로 동일한 요청 추적 단위에 대해 60초 동안 최대 10개의 요청을 허용합니다.

### 5.3. 주요 설정값

| 속성 | 설명 |
|---|---|
| `ttl` | 요청 횟수를 추적할 시간(밀리초) |
| `limit` | 설정된 시간 동안 허용할 요청 횟수 |
| `name` | 제한 정책의 이름 |
| `blockDuration` | 제한 초과 후 차단 상태를 유지할 시간(밀리초) |

**`@nestjs/throttler` v5 이후에서는 `ttl`을 밀리초 단위로 지정합니다.**

이전 버전의 문서나 예제에서는 초 단위를 사용하는 경우가 있으므로 주의해야 합니다.

---

## 6. Global Rate Limiting

Global Rate Limiting은 애플리케이션의 여러 Controller에 공통 요청 제한 정책을 적용하는 방식입니다.

### 6.1. APP_GUARD 등록

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },
]
```

`APP_GUARD`를 통해 등록한 Guard는 NestJS DI 컨테이너에서 관리됩니다.

따라서 ThrottlerGuard에 필요한 Storage 및 설정 Provider를 정상적으로 주입받을 수 있습니다.

### 6.2. 적용 범위

전역 Guard를 등록하면 기본적으로 HTTP Controller의 요청에 Rate Limiting을 적용할 수 있습니다.

단, HTTP와 WebSocket 또는 Microservice가 혼합된 애플리케이션에서는 전역 Guard 등록만으로 모든 전송 방식에 동일한 Rate Limiting이 자동 적용되는 것은 아닙니다.

WebSocket 및 GraphQL에서는 해당 실행 환경에 맞게 Guard를 확장해야 할 수 있습니다.

### 6.3. 전역 정책의 장점

전역 정책을 사용하면 다음과 같은 장점이 있습니다.

- 새로운 Controller에 기본적인 요청 제한을 적용할 수 있습니다.
- API별 설정 누락을 줄일 수 있습니다.
- 공통 보안 정책을 중앙에서 관리할 수 있습니다.
- 필요한 Handler에서 별도 제한 정책을 적용할 수 있습니다.

일반적으로 전역 제한 정책을 먼저 설정하고, 로그인 또는 고비용 API에 더 엄격한 제한을 추가하는 방식이 유용합니다.

---

## 7. @Throttle() Decorator

`@Throttle()`은 특정 Controller 또는 Handler에 별도의 Rate Limiting 정책을 적용하는 Decorator입니다.

### 7.1. Handler별 요청 제한

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  Throttle,
} from '@nestjs/throttler';

@Controller('articles')
export class ArticlesController {
  @Get()
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  findAll() {
    return [];
  }
}
```

위 Handler에는 60초 동안 최대 5회의 요청을 허용하는 정책이 적용됩니다.

`default`는 이름을 별도로 지정하지 않은 Throttler 정책을 의미합니다.

### 7.2. Controller 수준 적용

```typescript
@Throttle({
  default: {
    limit: 20,
    ttl: 60_000,
  },
})
@Controller('articles')
export class ArticlesController {
  @Get()
  findAll() {
    return [];
  }

  @Get(':id')
  findOne() {
    return {};
  }
}
```

Controller에 선언하면 해당 Controller의 Handler에 기본 제한 정책이 적용됩니다.

특정 Handler에 별도의 설정을 선언하면 해당 Handler의 제한 정책을 변경할 수 있습니다.

### 7.3. 버전별 문법 차이

`@nestjs/throttler` v5 이후에는 다음 형식을 사용합니다.

```typescript
@Throttle({
  default: {
    limit: 5,
    ttl: 60_000,
  },
})
```

이전 버전에서 사용하던 다음 형태와 구분해야 합니다.

```typescript
// 이전 버전의 API 형식
@Throttle(5, 60)
```

최신 API에서는 정책 이름을 Key로 사용하는 객체 구조를 사용합니다.

---

## 8. @SkipThrottle() Decorator

`@SkipThrottle()`은 특정 Controller 또는 Handler에서 Rate Limiting 검사를 생략하도록 지정합니다.

### 8.1. Controller 전체 제외

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  SkipThrottle,
} from '@nestjs/throttler';

@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
    };
  }
}
```

위 예제에서는 기본 이름인 `default` Throttler의 검사를 생략합니다.

다만 여러 개의 Named Throttler를 사용하는 경우에는 제외할 정책 이름을 명시해야 합니다.

### 8.2. 특정 Handler만 제외

```typescript
@Controller('articles')
export class ArticlesController {
  @Get()
  findAll() {
    return [];
  }

  @SkipThrottle()
  @Get('public')
  findPublic() {
    return [];
  }
}
```

`findPublic()`은 기본 Rate Limiting 검사에서 제외됩니다.

### 8.3. 제외 정책 재적용

Controller 수준에서 Rate Limiting을 제외했더라도 특정 Handler에는 다시 적용할 수 있습니다.

```typescript
@SkipThrottle()
@Controller('articles')
export class ArticlesController {
  @Get()
  findAll() {
    return [];
  }

  @SkipThrottle({
    default: false,
  })
  @Post()
  create() {
    return {};
  }
}
```

`default: false`는 해당 Handler에서 기본 Throttler의 제외 설정을 해제합니다.

### 8.4. 적용 시 주의사항

Health Check 또는 내부 관리 API가 반드시 Rate Limiting에서 제외되어야 하는 것은 아닙니다.

특히 공개적으로 접근 가능한 Health Check나 관리 API를 무제한으로 허용하면 해당 API가 공격에 악용될 수 있습니다.

제외 여부는 호출 주체와 인프라 구성에 따라 결정해야 합니다.

---

## 9. Multiple Throttler Definitions

하나의 API에 여러 시간 범위의 제한 정책을 동시에 적용할 수 있습니다.

예를 들어 다음 정책을 설정할 수 있습니다.

| 정책 | TTL | Limit |
|---|---:|---:|
| short | 1초 | 3회 |
| medium | 10초 | 20회 |
| long | 60초 | 100회 |

### 9.1. 다중 제한 정책 설정

```typescript
// src/app.module.ts

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import {
  ThrottlerModule,
  ThrottlerGuard,
} from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1_000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10_000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60_000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

이 설정은 단기간의 Burst Traffic과 지속적인 요청 증가를 함께 제한하는 데 활용할 수 있습니다.

### 9.2. Named Throttler 변경

특정 Handler에서 하나의 제한 정책을 변경할 수 있습니다.

```typescript
@Throttle({
  short: {
    limit: 2,
    ttl: 1_000,
  },
})
@Post('login')
login() {
  return {};
}
```

이 예제는 `short` 정책을 변경합니다.

다른 `medium`, `long` 정책은 해당 Handler에 계속 적용될 수 있습니다.

### 9.3. Named Throttler 제외

```typescript
@SkipThrottle({
  short: true,
  medium: true,
})
@Get('reports')
findReports() {
  return [];
}
```

위 코드는 `short`와 `medium` 제한을 제외합니다.

`long` 정책은 계속 적용됩니다.

여러 제한 정책을 사용하는 경우에는 `@SkipThrottle()`만 작성하는 것으로 모든 정책이 제외된다고 가정해서는 안 됩니다.

---

## 10. 시간 단위 Helper

`@nestjs/throttler`는 밀리초를 직접 계산하지 않아도 되도록 시간 Helper를 제공합니다.

대표적인 Helper는 다음과 같습니다.

| Helper | 의미 |
|---|---|
| `seconds()` | 초를 밀리초로 변환합니다. |
| `minutes()` | 분을 밀리초로 변환합니다. |
| `hours()` | 시간을 밀리초로 변환합니다. |
| `days()` | 일을 밀리초로 변환합니다. |
| `weeks()` | 주를 밀리초로 변환합니다. |

### 10.1. 사용 예제

```typescript
import {
  ThrottlerModule,
  seconds,
  minutes,
} from '@nestjs/throttler';

ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: seconds(1),
    limit: 3,
  },
  {
    name: 'long',
    ttl: minutes(1),
    limit: 100,
  },
]);
```

Helper를 사용하면 시간 단위의 의미를 코드에서 명확하게 표현할 수 있습니다.

특히 여러 제한 정책을 함께 사용하는 경우 밀리초 계산 오류를 줄이는 데 도움이 됩니다.

---

## 11. 환경변수 기반 설정

운영 환경에서는 Rate Limiting 설정을 환경변수로 관리할 수 있습니다.

### 11.1. 패키지 설치

```bash
npm install @nestjs/config
```

### 11.2. 환경변수 정의

```dotenv
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

`THROTTLE_TTL`은 밀리초 단위로 지정합니다.

### 11.3. forRootAsync() 사용

```typescript
// src/app.module.ts

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import {
  ThrottlerModule,
  ThrottlerGuard,
} from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const ttl = Number(
          config.getOrThrow<string>('THROTTLE_TTL'),
        );

        const limit = Number(
          config.getOrThrow<string>('THROTTLE_LIMIT'),
        );

        if (
          !Number.isSafeInteger(ttl) ||
          ttl <= 0 ||
          !Number.isSafeInteger(limit) ||
          limit <= 0
        ) {
          throw new Error(
            'Invalid rate limiting configuration',
          );
        }

        return {
          throttlers: [
            {
              ttl,
              limit,
            },
          ],
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

`forRootAsync()`는 `ConfigService`와 같은 Provider를 주입받아 설정을 구성할 때 사용합니다.

환경변수는 문자열로 전달되므로 숫자로 변환하고 유효한 범위인지 검증해야 합니다.

---

## 12. 클라이언트 식별과 Tracker

Rate Limiting에서는 어떤 요청을 동일한 클라이언트의 요청으로 볼 것인지 결정해야 합니다.

`@nestjs/throttler`는 기본적으로 클라이언트 IP 주소를 요청 추적에 활용합니다.

그러나 서비스의 요구사항에 따라 다른 식별자를 사용할 수 있습니다.

### 12.1. IP 기반 제한

```text
Client A: 192.0.2.10
Client B: 192.0.2.20
```

클라이언트 IP 주소가 서로 다르면 별도의 요청 추적 상태를 가질 수 있습니다.

IP 기반 제한은 인증되지 않은 요청에도 적용할 수 있다는 장점이 있습니다.

그러나 NAT, VPN 및 공유 네트워크 환경에서는 여러 사용자가 같은 IP 주소를 사용할 수 있습니다.

### 12.2. 사용자 ID 기반 제한

인증된 사용자의 ID를 기준으로 요청을 제한할 수도 있습니다.

```text
User A: user-100
User B: user-200
```

이 경우 사용자의 IP 주소가 변경되더라도 동일한 사용자 ID를 기준으로 요청을 추적할 수 있습니다.

다만 사용자 ID는 신뢰할 수 있는 인증 결과에서 가져와야 합니다.

클라이언트가 임의로 전달한 Header나 Query Parameter를 사용자 식별자로 사용해서는 안 됩니다.

---

## 13. Custom ThrottlerGuard

`ThrottlerGuard`를 상속하여 요청 추적 방식을 변경할 수 있습니다.

### 13.1. getTracker() 재정의

```typescript
// src/auth/user-throttler.guard.ts

import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface TrackedRequest {
  ip?: string;
  user?: {
    id: string;
  };
}

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(
    req: TrackedRequest,
  ): Promise<string> {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }

    return `ip:${req.ip ?? 'unknown'}`;
  }
}
```

위 예제는 인증된 사용자에게는 User ID를 사용하고, 인증되지 않은 요청에는 IP 주소를 사용합니다.

단, 실제 애플리케이션에서는 `request.user`가 ThrottlerGuard 실행 전에 설정되어 있어야 합니다.

### 13.2. Authentication Guard와 실행 순서

```text
HTTP Request
    |
    v
Authentication Guard
    |
    +----> request.user 설정
    |
    v
UserThrottlerGuard
    |
    +----> User ID 추출
    |
    v
Controller Handler
```

이러한 구조를 사용하려면 Guard 등록 범위와 실행 순서를 명확하게 구성해야 합니다.

전역 `APP_GUARD`로 등록된 ThrottlerGuard가 Controller 수준의 Authentication Guard보다 먼저 실행되면 아직 `request.user`가 존재하지 않을 수 있습니다.

사용자별 요청 제한을 구현할 때는 이 점을 반드시 고려해야 합니다.

### 13.3. generateKey()

`getTracker()`는 클라이언트를 식별하는 값을 생성합니다.

`generateKey()`는 해당 Tracker와 요청 실행 정보를 이용하여 Storage에 저장할 최종 Key를 생성합니다.

다음과 같은 옵션을 사용할 수 있습니다.

```typescript
ThrottlerModule.forRoot({
  throttlers: [
    {
      ttl: 60_000,
      limit: 100,
    },
  ],
  generateKey: (context, tracker, throttlerName) => {
    const handler = context.getHandler().name;
    const controller = context.getClass().name;

    return [
      throttlerName,
      controller,
      handler,
      tracker,
    ].join(':');
  },
});
```

위 코드는 Key 생성 방식을 설명하기 위한 예제입니다.

실제 프로젝트에서는 서로 다른 Controller 또는 Handler가 같은 이름을 가질 수 있으므로 충돌 가능성을 고려해야 합니다.

또한 Key를 변경하면 요청 카운터가 서로 다른 단위로 집계될 수 있으므로 정책의 목적에 맞는 Key 구조를 설계해야 합니다.

---

## 14. Reverse Proxy 환경

운영 환경에서는 NestJS 앞에 Nginx, Load Balancer 또는 API Gateway가 배치되는 경우가 많습니다.

```text
Client
   |
   v
Load Balancer
   |
   v
Reverse Proxy
   |
   v
NestJS Application
   |
   v
ThrottlerGuard
```

이러한 구조에서는 NestJS가 확인하는 IP 주소가 실제 클라이언트 IP가 아니라 Reverse Proxy의 IP일 수 있습니다.

이 경우 모든 사용자의 요청이 동일한 IP에서 발생한 것으로 집계될 위험이 있습니다.

### 14.1. Express trust proxy 설정

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
    );

  app.set('trust proxy', 'loopback');

  await app.listen(3000);
}

bootstrap();
```

`trust proxy`는 어떤 Reverse Proxy의 Forwarded Header를 신뢰할지 결정합니다.

위 예제의 `loopback`은 Loopback 주소의 프록시를 신뢰하는 설정입니다.

실제 운영 환경에서는 신뢰할 수 있는 프록시의 IP 주소 또는 네트워크 범위를 정확하게 설정해야 합니다.

### 14.2. X-Forwarded-For

Reverse Proxy는 다음과 같은 Header를 전달할 수 있습니다.

```http
X-Forwarded-For: 192.0.2.10
```

이 Header는 원래 클라이언트 IP 주소를 식별하는 데 사용될 수 있습니다.

그러나 외부 클라이언트가 해당 Header를 임의로 작성할 수도 있으므로 무조건 신뢰해서는 안 됩니다.

### 14.3. 보안 고려사항

다음과 같은 설정은 신중하게 적용해야 합니다.

```typescript
app.set('trust proxy', true);
```

실제 프록시 구성이 이를 안전하게 보장하지 않는다면 클라이언트가 전달한 Forwarded Header를 이용하여 IP 기반 Rate Limiting을 우회할 수 있습니다.

따라서 실제 네트워크 토폴로지에 맞게 신뢰할 프록시를 제한해야 합니다.

---

## 15. Storage와 요청 카운터 관리

`@nestjs/throttler`는 요청 횟수를 관리하기 위해 Storage를 사용합니다.

### 15.1. 기본 Storage

기본 Storage는 애플리케이션 프로세스의 메모리를 사용합니다.

```text
NestJS Instance
     |
     v
ThrottlerGuard
     |
     v
In-Memory Storage
     |
     +----> Request Counter
     |
     +----> Expiration State
```

단일 인스턴스에서는 별도의 외부 저장소 없이 Rate Limiting을 적용할 수 있습니다.

그러나 여러 NestJS 인스턴스를 실행하면 각 인스턴스가 서로 다른 요청 카운터를 관리합니다.

### 15.2. 다중 인스턴스 환경

```text
              Load Balancer
                    |
          +---------+---------+
          |                   |
          v                   v
    NestJS Instance A   NestJS Instance B
          |                   |
          v                   v
     Memory Store A      Memory Store B
```

예를 들어 각 인스턴스에 60초당 10회 제한을 설정했다고 가정합니다.

요청이 여러 인스턴스로 분산되면 실제 사용자는 시스템 전체에서 의도한 10회를 초과하여 요청할 수 있습니다.

따라서 여러 인스턴스에서 동일한 요청 제한 정책을 적용하려면 공유 Storage가 필요합니다.

---

## 16. Redis 기반 Distributed Rate Limiting

Redis는 여러 NestJS 인스턴스가 요청 제한 상태를 공유하는 데 사용할 수 있습니다.

```text
                  Load Balancer
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
      NestJS A      NestJS B      NestJS C
          |             |             |
          +-------------+-------------+
                        |
                        v
                       Redis
                        |
                        v
                Shared Rate Limit
                    Counters
```

### 16.1. Redis를 사용하는 이유

Redis를 사용하면 다음과 같은 장점이 있습니다.

- 여러 애플리케이션 인스턴스에서 요청 횟수를 공유할 수 있습니다.
- 카운터를 빠르게 조회하고 갱신할 수 있습니다.
- Key별 만료시간을 관리할 수 있습니다.
- 원자적 명령 또는 Lua Script 등을 이용하여 경쟁 조건을 제어할 수 있습니다.

Redis를 사용한다고 해서 모든 Rate Limiting 알고리즘이 자동으로 정확하게 구현되는 것은 아닙니다.

제한 정책에 필요한 카운터 갱신과 만료 처리가 원자적으로 수행되는지 확인해야 합니다.

### 16.2. Custom Storage

`@nestjs/throttler`는 Storage 구현을 교체할 수 있는 구조를 제공합니다.

`ThrottlerStorage` 인터페이스를 구현하는 Provider를 이용하여 기본 메모리 Storage를 Redis 등의 외부 저장소로 대체할 수 있습니다.

공식 문서에서는 Redis 기반 Community Storage Provider를 활용하는 방법도 안내합니다.

### 16.3. Storage 설정 구조

다음은 이미 구현된 Storage Provider를 등록하는 구조를 보여주는 예제입니다.

```typescript
ThrottlerModule.forRoot({
  throttlers: [
    {
      ttl: 60_000,
      limit: 100,
    },
  ],
  storage: customThrottlerStorage,
});
```

위 예제의 `customThrottlerStorage`는 사전에 생성하거나 주입받은 Storage 구현체를 의미합니다.

실행 가능한 완전한 예제가 아니며, 실제 프로젝트에서는 사용하는 Redis Storage 패키지의 생성자와 NestJS DI 구성에 따라 등록 방식을 결정해야 합니다.

### 16.4. Redis Storage 구현 시 고려사항

공유 Storage를 사용할 때는 다음 항목을 확인해야 합니다.

| 항목 | 고려사항 |
|---|---|
| Atomicity | 동시 요청에서도 정확한 카운터를 유지해야 합니다. |
| TTL | 요청 제한 상태의 만료시간을 정확히 관리해야 합니다. |
| Key Design | 사용자 및 API별 Key 충돌을 방지해야 합니다. |
| Memory | 많은 Tracker가 생성될 때 메모리 사용량을 제한해야 합니다. |
| Availability | Redis 장애가 발생했을 때의 정책을 정의해야 합니다. |
| Security | Redis 인증 및 네트워크 접근을 제한해야 합니다. |
| Compatibility | Storage 구현체와 Throttler 버전의 호환성을 확인해야 합니다. |

### 16.5. Fail-Open과 Fail-Closed

공유 Rate Limiting Storage에 장애가 발생하면 애플리케이션은 두 가지 방식 중 하나를 선택할 수 있습니다.

| 정책 | 동작 | 특징 |
|---|---|---|
| Fail-Open | 요청을 허용합니다. | 서비스 가용성에 유리하지만 제한 정책을 우회할 수 있습니다. |
| Fail-Closed | 요청을 거부합니다. | 제한 정책을 유지하지만 정상 요청까지 차단할 수 있습니다. |

어느 방식이 적절한지는 API의 보안 요구사항과 서비스 가용성 목표에 따라 달라집니다.

예를 들어 로그인 API와 공개 조회 API는 서로 다른 장애 대응 정책을 사용할 수 있습니다.

---

## 17. 로그인 API에 Rate Limiting 적용

로그인 API는 Brute-Force Attack과 Credential Stuffing 공격의 주요 대상입니다.

일반적인 공개 조회 API보다 엄격한 제한 정책을 적용할 수 있습니다.

### 17.1. AuthController 설정

```typescript
// src/auth/auth.controller.ts

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import {
  Throttle,
  minutes,
} from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 5,
      ttl: minutes(1),
    },
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.signIn(
      loginDto.email,
      loginDto.password,
    );
  }
}
```

위 예제는 기본 Tracker 기준으로 1분 동안 최대 5회 요청을 허용합니다.

실제 운영 환경에서는 정상 사용자에게 미치는 영향과 예상 공격 패턴을 고려하여 값을 조정해야 합니다.

### 17.2. IP 기반 제한의 한계

IP 주소만을 기준으로 로그인 요청을 제한하면 다음과 같은 문제가 발생할 수 있습니다.

- 여러 사용자가 동일한 공인 IP를 공유할 수 있습니다.
- 공격자가 여러 IP 주소를 사용하여 제한을 우회할 수 있습니다.
- 특정 사용자의 계정에 대한 공격을 정확하게 식별하기 어렵습니다.

따라서 인증 API에서는 IP 기반 제한과 계정 식별자 기반 제한을 함께 사용하는 방법을 고려할 수 있습니다.

### 17.3. 계정별 제한

예를 들어 다음과 같은 정책을 사용할 수 있습니다.

```text
IP-based Limit
      +
Account-based Limit
      +
Global Limit
```

계정별 제한을 구현할 때는 이메일 주소 등을 정규화하고, 계정 존재 여부가 응답 메시지나 응답 시간으로 노출되지 않도록 주의해야 합니다.

또한 계정별 요청 제한을 지나치게 엄격하게 적용하면 공격자가 다른 사용자의 로그인을 의도적으로 방해할 수 있습니다.

---

## 18. HTTP 429 Too Many Requests

Rate Limiting 정책을 초과하면 일반적으로 HTTP `429 Too Many Requests` 응답을 반환합니다.

### 18.1. 응답 예제

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60
```

응답 Body는 다음과 같이 구성할 수 있습니다.

```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "Too Many Requests"
}
```

실제 응답 메시지와 Header 구성은 NestJS 및 Throttler 설정에 따라 달라질 수 있습니다.

### 18.2. Retry-After

`Retry-After`는 클라이언트가 요청을 다시 시도하기 전에 기다려야 할 시간을 나타냅니다.

```http
Retry-After: 60
```

위 값은 60초 이후 재시도하도록 안내합니다.

단, `@nestjs/throttler`가 모든 설정에서 자동으로 `Retry-After`를 반환한다고 가정해서는 안 됩니다.

필요한 경우 실제 설정에서 제공되는 Header를 확인하고 별도로 구현해야 합니다.

### 18.3. 클라이언트의 재시도 처리

클라이언트는 429 응답을 수신하면 즉시 반복 요청하지 않도록 구성해야 합니다.

```text
HTTP Request
    |
    v
HTTP 429
    |
    v
Retry-After 확인
    |
    v
Backoff 적용
    |
    v
Retry
```

재시도에는 Exponential Backoff 및 Jitter를 적용하여 여러 클라이언트가 동시에 다시 요청하는 문제를 완화할 수 있습니다.

요청 재시도 정책은 API의 멱등성(Idempotency)과도 함께 고려해야 합니다.

---

## 19. blockDuration

`blockDuration`은 요청 제한을 초과했을 때 클라이언트를 일정 시간 차단하기 위한 설정입니다.

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60_000,
    limit: 10,
    blockDuration: 120_000,
  },
]);
```

이 예제에서는 요청 제한을 초과한 Tracker에 대해 별도의 차단 기간을 적용하도록 구성합니다.

| 옵션 | 값 |
|---|---:|
| TTL | 60초 |
| Limit | 10회 |
| Block Duration | 120초 |

`ttl`은 요청 횟수를 추적하는 시간과 관련되고, `blockDuration`은 제한 초과 후 차단 상태와 관련됩니다.

Storage 구현에 따라 카운터 만료와 차단 상태가 별도로 관리될 수 있습니다.

---

## 20. WebSocket Rate Limiting

WebSocket은 HTTP와 달리 연결이 수립된 후 하나의 연결을 통해 여러 메시지를 전송할 수 있습니다.

따라서 HTTP 요청 제한과 WebSocket 메시지 제한은 구분해야 합니다.

### 20.1. WebSocket 요청 흐름

```text
WebSocket Client
      |
      | Connection
      v
WebSocket Gateway
      |
      | Subscribe Message
      v
WsThrottlerGuard
      |
      +----> Client 식별
      |
      +----> 메시지 횟수 확인
      |
      +---- 초과 ----> Exception
      |
      v
Message Handler
```

### 20.2. WebSocket Guard

`@nestjs/throttler`는 WebSocket에서도 사용할 수 있지만 HTTP용 ThrottlerGuard를 그대로 적용하는 것은 적절하지 않습니다.

WebSocket 실행 환경에서는 `ExecutionContext.switchToWs()`를 통해 클라이언트 객체를 가져오도록 Guard를 확장해야 합니다.

또한 현재 패키지에서는 `handleRequest()`의 인자로 전달되는 `ThrottlerRequest` 객체를 이용하여 Storage Key와 제한 상태를 처리할 수 있습니다.

### 20.3. WebSocket 환경의 주의사항

공식 문서에서는 WebSocket ThrottlerGuard 사용 시 다음 사항을 안내합니다.

- WebSocket Guard는 `APP_GUARD` 또는 `app.useGlobalGuards()`를 통해 등록하는 HTTP 전역 방식과 구분하여 적용해야 합니다.
- 제한에 도달하면 WebSocket `exception` 이벤트가 발생할 수 있습니다.
- Socket.IO와 `ws`는 클라이언트의 실제 연결 객체 구조가 다를 수 있습니다.
- 다중 Throttler 정책을 사용하는 경우 정책 이름별 Storage Key를 구분해야 합니다.

### 20.4. WebSocket 메시지 제한 설계

WebSocket 애플리케이션에서는 다음과 같은 단위로 제한 정책을 구성할 수 있습니다.

| 제한 대상 | 예시 |
|---|---|
| 연결 시도 | 클라이언트별 연결 생성 횟수 |
| 구독 요청 | 일정 시간 동안 구독 가능한 Symbol 수 |
| 메시지 전송 | 초당 클라이언트 메시지 수 |
| 재연결 | 반복적인 연결 및 해제 시도 |
| 전체 구독량 | 사용자별 동시 구독 개수 |

특히 WebSocket 기반 스트리밍 서비스에서는 클라이언트의 구독 요청 제한과 서버의 Push 전송량 관리를 구분해야 합니다.

`@nestjs/throttler`로 메시지 수신 빈도를 제한한다고 해서 Gateway의 송신 처리량이나 Fan-out 부하가 자동으로 제어되는 것은 아닙니다.

송신 부하와 Backpressure를 관리하려면 별도의 스트리밍 정책이 필요합니다.

---

## 21. GraphQL Rate Limiting

GraphQL 환경에서는 HTTP Controller와 다른 ExecutionContext를 사용합니다.

따라서 `ThrottlerGuard`를 확장하여 GraphQL 요청 객체를 가져오도록 구성할 수 있습니다.

### 21.1. GqlThrottlerGuard

```typescript
// src/common/guards/gql-throttler.guard.ts

import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(
    context: ExecutionContext,
  ) {
    const gqlContext =
      GqlExecutionContext.create(context);

    const ctx = gqlContext.getContext();

    return {
      req: ctx.req,
      res: ctx.res,
    };
  }
}
```

위 예제는 GraphQL Context에 `req`와 `res`가 등록되어 있는 환경을 가정합니다.

### 21.2. GraphQL Context 설정

GraphQL Module에서 다음과 같이 HTTP Request와 Response를 전달할 수 있습니다.

```typescript
GraphQLModule.forRoot({
  // 기존 GraphQL Driver 및 Schema 설정을 유지합니다.
  context: ({ req, res }) => ({
    req,
    res,
  }),
});
```

위 코드는 Context 설정 부분을 설명하기 위한 예제입니다.

실제 실행 시에는 사용하는 GraphQL Driver와 Schema 구성에 필요한 옵션을 추가해야 합니다.

### 21.3. GraphQL 특성

GraphQL에서는 하나의 Endpoint를 통해 여러 Query와 Mutation을 처리할 수 있습니다.

따라서 HTTP 요청 횟수만으로는 실제 서버 작업 비용을 충분히 제어하기 어려울 수 있습니다.

다음과 같은 정책을 함께 고려해야 합니다.

- Query Complexity 제한
- Query Depth 제한
- Field별 비용 계산
- 사용자별 요청 제한
- Resolver 수준 권한 검증

Rate Limiting과 Query Complexity 제한은 서로 다른 문제를 해결하는 보완적인 기술입니다.

---

## 22. Rate Limiting과 Request Lifecycle

NestJS에서는 Guard가 Middleware 이후, Interceptor 및 Pipe 이전에 실행됩니다.

```text
HTTP Request
    |
    v
Middleware
    |
    v
Authentication Guard
    |
    v
ThrottlerGuard
    |
    +----> Rate Limit 검사
    |
    +---- 초과 ----> 429
    |
    v
Authorization Guard
    |
    v
Interceptor (Before)
    |
    v
Pipe
    |
    v
Controller Handler
    |
    v
Service
```

위 순서는 인증 Guard가 먼저 실행되도록 명시적으로 구성한 예시입니다.

실제 Guard의 실행 순서는 등록 범위와 순서에 따라 달라집니다.

### 22.1. 인증 전 Rate Limiting

IP 기반 제한처럼 인증 정보가 없어도 적용 가능한 정책은 인증 이전에 실행할 수 있습니다.

이 방식은 로그인 API와 공개 API를 보호하는 데 적합합니다.

### 22.2. 인증 후 Rate Limiting

사용자 ID 또는 권한 정보를 사용하는 제한은 인증이 완료된 후에 적용하는 것이 적절합니다.

따라서 사용자별 Rate Limiting에서는 인증 정보의 생성 시점과 Guard 실행 순서를 함께 설계해야 합니다.

---

## 23. Rate Limiting 테스트

Rate Limiting은 설정값만 확인하는 것이 아니라 실제 요청이 제한되는지 검증해야 합니다.

### 23.1. 테스트 시나리오

| 테스트 항목 | 기대 결과 |
|---|---|
| Limit 이하 요청 | 정상 처리 |
| Limit 초과 요청 | HTTP 429 |
| TTL 만료 이후 요청 | 제한 상태에 따라 재허용 |
| 다른 Tracker의 요청 | 별도 카운터 적용 |
| `@Throttle()` 설정 | Handler별 제한 적용 |
| `@SkipThrottle()` 설정 | 지정된 정책 제외 |
| Named Throttler | 정책별 제한 독립 적용 |
| 다중 인스턴스 | 공유 Storage를 이용한 제한 유지 |
| Redis 장애 | 정의된 장애 대응 정책 적용 |
| Reverse Proxy | 올바른 클라이언트 IP 식별 |

### 23.2. E2E 테스트 예제

```typescript
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('요청 제한을 초과하면 429를 반환합니다.', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .get('/test-rate-limit')
        .expect(200);
    }

    await request(app.getHttpServer())
      .get('/test-rate-limit')
      .expect(429);
  });
});
```

이 테스트는 `/test-rate-limit` 경로에 60초당 5회 제한이 설정되어 있고, 다른 요청으로 인한 카운터 누적이 없는 테스트 환경을 가정합니다.

실제 프로젝트에서는 테스트 전용 제한 정책을 사용하고, 각 테스트가 서로의 카운터에 영향을 주지 않도록 격리해야 합니다.

### 23.3. 부하 테스트

높은 요청량에서 Rate Limiting 동작을 확인하려면 k6, Artillery 또는 기타 HTTP 부하 테스트 도구를 사용할 수 있습니다.

주요 측정 항목은 다음과 같습니다.

- 초당 요청 수(RPS)
- 정상 처리된 요청 수
- HTTP 429 응답 수
- 응답 지연시간
- CPU 및 메모리 사용량
- Rate Limiting Storage의 지연시간
- Redis 명령 처리량

성능 테스트에서는 Rate Limiting이 정상적으로 동작하는지뿐 아니라 Storage가 새로운 병목 지점이 되는지도 확인해야 합니다.

---

## 24. 운영 환경의 보안 및 성능 고려사항

### 24.1. Rate Limiting은 다중 계층으로 구성합니다

애플리케이션 수준의 Rate Limiting만으로 모든 요청을 방어하기는 어렵습니다.

```text
Internet
    |
    v
CDN / WAF
    |
    v
API Gateway
    |
    v
Load Balancer
    |
    v
NestJS ThrottlerGuard
    |
    v
Application
```

각 계층은 서로 다른 수준의 제한 정책을 담당할 수 있습니다.

### 24.2. 사용자별 제한과 IP 제한을 조합합니다

IP 기반 제한은 인증되지 않은 요청에 유용하지만 공유 IP 환경에서 정상 사용자를 차단할 수 있습니다.

사용자별 제한은 인증된 요청에 유용하지만 계정 생성 및 로그인 이전의 요청에는 적용하기 어렵습니다.

따라서 서비스 요구사항에 따라 두 방식을 조합하는 것이 좋습니다.

### 24.3. Burst Traffic을 고려합니다

짧은 시간의 요청 집중이 반드시 공격을 의미하는 것은 아닙니다.

브라우저의 초기 데이터 로딩, 여러 API의 병렬 호출 및 모바일 앱의 재연결 과정에서도 Burst Traffic이 발생할 수 있습니다.

Rate Limiting 정책은 정상적인 사용 패턴을 측정한 후 결정해야 합니다.

### 24.4. Storage의 가용성을 확보합니다

분산 환경에서 공유 Rate Limiting Storage를 사용하면 Storage 장애가 여러 애플리케이션 인스턴스에 동시에 영향을 줄 수 있습니다.

따라서 다음 사항을 고려해야 합니다.

- Redis 가용성
- 네트워크 연결 안정성
- Timeout 설정
- 장애 시 요청 처리 정책
- Storage 모니터링
- Key 만료 정책

### 24.5. 429 응답을 모니터링합니다

429 응답이 급격히 증가하면 자동화된 공격이나 잘못된 클라이언트 요청 패턴이 발생했을 수 있습니다.

다만 제한값이 지나치게 낮아 정상 사용자의 요청이 차단되는 상황일 수도 있습니다.

따라서 429 발생률과 정상 요청의 지연시간 및 오류율을 함께 분석해야 합니다.

### 24.6. 비즈니스 Quota와 구분합니다

Rate Limiting과 Quota는 비슷하지만 적용 목적이 다릅니다.

| 구분 | Rate Limiting | Quota |
|---|---|---|
| 목적 | 짧은 시간의 요청 속도 제한 | 일정 기간의 사용량 제한 |
| 예시 | 초당 10회 요청 | 월간 100,000회 API 호출 |
| 일반적인 처리 | 429 응답 | 사용량 정책에 따른 차단 또는 과금 |
| 관리 기준 | 시간 및 요청 빈도 | 계정, 상품, 요금제, 사용량 |

API 상품의 월간 호출량이나 사용자의 구독 요금제별 사용량은 별도의 Quota 관리 기능으로 구현하는 것이 적절할 수 있습니다.

---

## 25. 관련 문서

- `00-overview/request-lifecycle.md`: HTTP 요청 처리 흐름
- `01-fundamentals/modules.md`: Module 구성
- `01-fundamentals/providers.md`: Provider와 DI
- `02-request-lifecycle/guards.md`: Guard 실행 구조
- `02-request-lifecycle/execution-context.md`: ExecutionContext
- `03-techniques/configuration.md`: 환경변수 관리
- `03-techniques/caching.md`: Cache 및 외부 저장소
- `04-security/authentication.md`: 사용자 인증
- `04-security/authorization.md`: 접근 권한 검증
- `04-security/cors.md`: Cross-Origin 요청 정책
- `05-platforms/rest-api.md`: REST API 구현
- `05-platforms/graphql.md`: GraphQL 요청 처리
- `05-platforms/websocket.md`: WebSocket Gateway
- `06-testing/e2e-testing.md`: E2E 테스트
- `08-deployment/performance.md`: 애플리케이션 성능 관리

---

## 26. 정리

Rate Limiting은 일정 시간 동안 허용할 요청 횟수를 제한하여 과도한 API 사용과 자동화된 공격을 완화하는 기술입니다.

NestJS에서는 공식 패키지인 `@nestjs/throttler`를 이용하여 Guard 기반 Rate Limiting을 구현할 수 있습니다.

핵심 사항은 다음과 같습니다.

1. **ThrottlerModule**은 요청 제한 정책을 등록합니다.
2. **ThrottlerGuard**는 요청 횟수를 검사하고 제한 초과 시 요청을 차단합니다.
3. **TTL과 Limit**은 요청 제한을 구성하는 핵심 설정입니다.
4. **@Throttle()**은 Controller 또는 Handler에 별도의 제한 정책을 적용합니다.
5. **@SkipThrottle()**은 지정된 제한 정책을 제외합니다.
6. **Named Throttler**를 사용하면 여러 시간 범위의 제한을 동시에 적용할 수 있습니다.
7. **getTracker()**는 요청을 보낸 클라이언트를 식별하는 데 사용합니다.
8. **generateKey()**는 요청 제한 상태를 저장할 Key를 생성합니다.
9. **Redis 기반 Storage**는 여러 NestJS 인스턴스에서 요청 카운터를 공유할 때 활용합니다.
10. **Reverse Proxy 환경**에서는 신뢰할 수 있는 클라이언트 IP를 정확하게 식별해야 합니다.
11. **WebSocket과 GraphQL**에서는 각 실행 환경에 맞는 Guard 구현이 필요할 수 있습니다.
12. **429 Too Many Requests**는 요청 제한 초과를 나타내는 HTTP 상태 코드입니다.
13. **Rate Limiting은 인증, 인가, Quota 및 DDoS 방어를 완전히 대체하지 않습니다.**

운영 환경에서는 요청 제한값뿐 아니라 사용자 식별 방식, 다중 인스턴스 환경, 공유 Storage의 가용성, 정상적인 Burst Traffic 및 클라이언트 재시도 정책까지 함께 고려해야 합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - Rate Limiting](https://docs.nestjs.com/security/rate-limiting)
- [NestJS - Guards](https://docs.nestjs.com/guards)
- [NestJS - Execution Context](https://docs.nestjs.com/fundamentals/execution-context)
- [NestJS - Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - Caching](https://docs.nestjs.com/techniques/caching)
- [NestJS - WebSocket Guards](https://docs.nestjs.com/websockets/guards)
- [NestJS - GraphQL](https://docs.nestjs.com/graphql/quick-start)

### @nestjs/throttler

- [@nestjs/throttler - GitHub](https://github.com/nestjs/throttler)
- [@nestjs/throttler - npm](https://www.npmjs.com/package/@nestjs/throttler)
- [@nestjs/throttler - README](https://github.com/nestjs/throttler/blob/master/README.md)
- [@nestjs/throttler - Releases](https://github.com/nestjs/throttler/releases)

### Redis 및 분산 처리

- [Redis - Documentation](https://redis.io/docs/latest/)
- [Redis - INCR](https://redis.io/docs/latest/commands/incr/)
- [Redis - EXPIRE](https://redis.io/docs/latest/commands/expire/)
- [Redis - Rate Limiting Patterns](https://redis.io/redis-best-practices/basic-rate-limiting/)

### HTTP 및 관련 표준

- [RFC 6585 - Additional HTTP Status Codes](https://www.rfc-editor.org/rfc/rfc6585)
- [RFC 9110 - HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [MDN - 429 Too Many Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429)
- [MDN - Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After)

### OWASP 보안 가이드

- [OWASP - Blocking Brute Force Attacks](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- [OWASP - Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP - Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [OWASP - REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)