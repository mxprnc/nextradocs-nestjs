# Middleware

## 1. 개요

Middleware는 클라이언트의 HTTP 요청이 Controller의 Route Handler에 도달하기 전에 실행되는 함수 또는 클래스입니다.

NestJS에서는 Middleware를 사용하여 요청과 응답 객체에 접근하고, 요청을 전처리하거나 다음 처리 단계로 전달할 수 있습니다.

Middleware는 주로 여러 API에서 공통적으로 필요한 기능을 구현할 때 사용합니다.

대표적인 활용 사례는 다음과 같습니다.

- HTTP 요청 정보 로깅
- 요청별 고유 식별자(Request ID) 생성
- HTTP Header 검사 및 추가
- 요청 및 응답 객체의 속성 변경
- 공통적인 요청 데이터 전처리
- 특정 조건에 따른 요청 차단
- 외부 Middleware 라이브러리 연동

NestJS의 Middleware는 기본 HTTP 플랫폼인 Express의 Middleware 동작 방식을 기반으로 합니다.

다만 NestJS는 Express뿐만 아니라 Fastify도 지원하므로, 사용하는 HTTP Adapter에 따라 Middleware의 등록 방식과 요청 및 응답 객체의 인터페이스가 달라질 수 있습니다.

---

## 2. Request Lifecycle에서 Middleware의 위치

NestJS는 HTTP 요청을 처리할 때 여러 구성 요소를 순차적으로 실행합니다.

일반적인 요청 처리 흐름은 다음과 같습니다.

```text
Client
  │
  ▼
HTTP Request
  │
  ▼
Middleware
  │
  ▼
Guards
  │
  ▼
Interceptors (Before)
  │
  ▼
Pipes
  │
  ▼
Controller
  │
  ▼
Service
  │
  ▼
Interceptors (After)
  │
  ▼
HTTP Response
  │
  ▼
Client
```

위 흐름은 요청이 정상적으로 처리되는 일반적인 경우를 나타냅니다.

Middleware는 Guard, Interceptor, Pipe보다 먼저 실행되며, Controller에 요청을 전달하기 전에 공통적인 처리를 수행할 수 있습니다.

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 주요 역할 |
|---|---|
| Middleware | HTTP 요청 및 응답 객체에 대한 공통 처리 |
| Guard | 요청의 실행 권한 확인 |
| Interceptor | Handler 실행 전후의 공통 처리 및 응답 변환 |
| Pipe | 입력 데이터의 검증 및 변환 |
| Controller | HTTP 요청을 처리하는 Route Handler 제공 |
| Exception Filter | 처리되지 않은 예외를 포착하여 응답 생성 |

Middleware는 요청 처리 과정의 가장 앞부분에 위치하지만, 모든 요청이 반드시 Controller까지 전달되는 것은 아닙니다.

Middleware가 직접 HTTP 응답을 반환하면 이후의 요청 처리 과정은 실행되지 않습니다.

또한 요청 처리 중 예외가 발생하면 정상적인 실행 흐름이 중단되고 예외 처리 과정으로 전환될 수 있습니다.

---

## 3. Middleware의 동작 원리

### 3.1. Middleware 함수의 구조

Express 기반 NestJS Middleware는 일반적으로 다음 세 가지 인자를 전달받습니다.

```typescript
function middleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // 요청 처리

  next();
}
```

각 인자의 역할은 다음과 같습니다.

| 인자 | 타입 | 설명 |
|---|---|---|
| `req` | `Request` | 클라이언트의 HTTP 요청 정보를 제공합니다. |
| `res` | `Response` | HTTP 응답을 생성하거나 수정할 수 있습니다. |
| `next` | `NextFunction` | 다음 Middleware 또는 후속 요청 처리 단계로 제어를 전달합니다. |

`Request`, `Response`, `NextFunction`은 Express에서 제공하는 타입입니다.

따라서 해당 타입을 사용하는 예제는 Express Adapter를 기준으로 합니다.

### 3.2. next()의 역할

`next()`는 현재 Middleware의 처리가 완료되었음을 알리고 다음 처리 단계로 제어를 전달하는 함수입니다.

```typescript
import { Request, Response, NextFunction } from 'express';

export function logger(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log('Middleware 실행');

  next();
}
```

위 Middleware가 실행되면 다음 과정이 진행됩니다.

1. HTTP 요청이 Middleware에 전달됩니다.
2. Middleware에서 요청 정보를 출력합니다.
3. `next()`를 호출합니다.
4. 다음 Middleware 또는 후속 요청 처리 단계가 실행됩니다.

`next()`를 호출하지 않고 응답도 종료하지 않으면 요청 처리가 완료되지 않아 클라이언트가 응답을 계속 기다릴 수 있습니다.

### 3.3. 요청 처리 중단

Middleware는 조건에 따라 요청 처리를 직접 종료할 수도 있습니다.

```typescript
import { Request, Response, NextFunction } from 'express';

export function maintenanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const maintenanceMode = true;

  if (maintenanceMode) {
    res.status(503).json({
      message: '서비스 점검 중입니다.',
    });

    return;
  }

  next();
}
```

위 예제에서는 `maintenanceMode`가 `true`인 경우 HTTP 503 응답을 반환합니다.

이때는 `next()`를 호출하지 않으므로 요청이 다음 처리 단계로 전달되지 않습니다.

반대로 서비스 점검 상태가 아니라면 `next()`를 호출하여 요청 처리를 계속 진행합니다.

> Middleware에서 직접 응답을 완료한 이후에는 일반적으로 `next()`를 다시 호출하지 않아야 합니다. 응답 완료 후 추가 처리가 진행되면 중복 응답 등의 문제가 발생할 수 있습니다.

---

## 4. Middleware 구현 방식

NestJS는 다음 두 가지 Middleware 구현 방식을 지원합니다.

1. Class-based Middleware
2. Functional Middleware

두 방식 모두 HTTP 요청을 전처리할 수 있지만, 클래스 기반 Middleware는 NestJS Dependency Injection을 지원한다는 차이가 있습니다.

### 4.1. Class-based Middleware

Class-based Middleware는 `@Injectable()` 데코레이터와 `NestMiddleware` 인터페이스를 사용하여 구현합니다.

**logger.middleware.ts**

```typescript
import {
  Injectable,
  NestMiddleware,
  Logger,
} from '@nestjs/common';

import {
  Request,
  Response,
  NextFunction,
} from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    this.logger.log(`${req.method} ${req.originalUrl}`);

    next();
  }
}
```

주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 설명 |
|---|---|
| `@Injectable()` | NestJS의 Dependency Injection 시스템에서 관리할 수 있는 클래스임을 나타냅니다. |
| `NestMiddleware` | Middleware 구현에 필요한 인터페이스입니다. |
| `use()` | HTTP 요청이 전달될 때 실행되는 메서드입니다. |
| `Logger` | NestJS에서 제공하는 로깅 클래스입니다. |
| `next()` | 후속 요청 처리 단계로 제어를 전달합니다. |

`NestMiddleware` 인터페이스를 구현한 클래스는 `use()` 메서드를 제공해야 합니다.

`use()` 메서드는 Middleware가 적용된 요청이 들어올 때 실행됩니다.

### 4.2. Functional Middleware

Functional Middleware는 별도의 클래스 없이 일반 함수로 구현합니다.

**logger.middleware.ts**

```typescript
import {
  Request,
  Response,
  NextFunction,
} from 'express';

export function logger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log(`${req.method} ${req.originalUrl}`);

  next();
}
```

Functional Middleware는 다음과 같은 경우에 적합합니다.

- 단순한 요청 로깅
- HTTP Header 확인
- 간단한 요청 전처리
- Dependency Injection이 필요하지 않은 공통 처리

Class-based Middleware와 Functional Middleware의 차이점은 다음과 같습니다.

| 항목 | Class-based | Functional |
|---|---|---|
| 구현 방식 | 클래스 | 함수 |
| `NestMiddleware` | 구현 | 불필요 |
| `@Injectable()` | 일반적으로 사용 | 불필요 |
| Dependency Injection | 지원 | NestJS 생성자 주입 미지원 |
| 구현 복잡도 | 상대적으로 높음 | 낮음 |
| 권장 사용 사례 | 외부 서비스나 Provider가 필요한 처리 | 단순한 요청 전처리 |

단순한 Middleware를 구현하는 경우에는 Functional Middleware를 우선 고려할 수 있습니다.

반면 NestJS Provider를 주입하거나 여러 메서드와 상태를 관리해야 한다면 Class-based Middleware가 적합합니다.

---

## 5. Middleware 등록 방법

NestJS에서는 Middleware를 `@Module()` 데코레이터의 속성으로 직접 등록하지 않습니다.

Module 클래스에서 `NestModule` 인터페이스를 구현하고, `configure()` 메서드에서 `MiddlewareConsumer`를 사용하여 등록합니다.

### 5.1. NestModule과 MiddlewareConsumer

다음은 `LoggerMiddleware`를 특정 Controller에 적용하는 예제입니다.

**app.module.ts**

```typescript
import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';

import { LoggerMiddleware } from './logger.middleware';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(UsersController);
  }
}
```

주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 설명 |
|---|---|
| `NestModule` | Module 클래스에 `configure()` 메서드를 정의하기 위한 인터페이스입니다. |
| `configure()` | Module의 Middleware 설정을 수행하는 메서드입니다. |
| `MiddlewareConsumer` | Middleware와 적용 대상을 연결하는 API를 제공합니다. |
| `apply()` | 적용할 Middleware를 지정합니다. |
| `forRoutes()` | Middleware가 적용될 Route 또는 Controller를 지정합니다. |

위 예제에서 `LoggerMiddleware`는 `UsersController`에 정의된 Route Handler에 적용됩니다.

`configure()`는 요청마다 호출되는 메서드가 아니라, 애플리케이션 초기화 과정에서 Middleware를 설정하기 위해 실행됩니다.

실제 HTTP 요청이 들어오면 등록된 Middleware의 `use()` 메서드가 실행됩니다.

### 5.2. 특정 URL에 적용

특정 경로에 Middleware를 적용할 수도 있습니다.

```typescript
configure(consumer: MiddlewareConsumer): void {
  consumer
    .apply(LoggerMiddleware)
    .forRoutes('users');
}
```

위 설정은 `/users` 경로에 해당하는 Route Handler에 Middleware를 적용합니다.

### 5.3. 특정 HTTP Method에 적용

특정 HTTP Method에만 Middleware를 적용할 수도 있습니다.

```typescript
import { RequestMethod } from '@nestjs/common';

configure(consumer: MiddlewareConsumer): void {
  consumer
    .apply(LoggerMiddleware)
    .forRoutes({
      path: 'users',
      method: RequestMethod.GET,
    });
}
```

위 설정은 `GET /users`에 Middleware를 적용합니다.

`POST /users`처럼 다른 HTTP Method를 사용하는 요청에는 해당 설정이 적용되지 않습니다.

`RequestMethod.ALL`을 사용하면 지정한 경로에서 여러 HTTP Method를 대상으로 Middleware를 설정할 수 있습니다.

---

## 6. Middleware 적용 범위

Middleware는 전체 애플리케이션, 특정 Controller 또는 특정 Route를 대상으로 적용할 수 있습니다.

### 6.1. Global Middleware

애플리케이션 전체에 Middleware를 적용하려면 `main.ts`에서 `app.use()`를 사용할 수 있습니다.

**main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logger } from './logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(logger);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

`app.use()`로 등록한 Middleware는 애플리케이션의 HTTP 요청 처리 과정에 전역적으로 적용됩니다.

다만 `app.use()`에서 직접 등록하는 Middleware는 NestJS DI Container를 통한 생성자 주입을 사용할 수 없습니다.

Dependency Injection이 필요한 Class-based Middleware를 넓은 범위에 적용하려면 `MiddlewareConsumer`를 사용하는 방식을 고려해야 합니다.

### 6.2. Controller 단위 적용

특정 Controller에만 Middleware를 적용할 수 있습니다.

```typescript
consumer
  .apply(LoggerMiddleware)
  .forRoutes(UsersController);
```

이 경우 해당 Controller에 정의된 Route Handler를 대상으로 Middleware가 적용됩니다.

### 6.3. 여러 Controller에 적용

여러 Controller를 지정하는 것도 가능합니다.

```typescript
consumer
  .apply(LoggerMiddleware)
  .forRoutes(UsersController, ProductsController);
```

이렇게 등록하면 `UsersController`와 `ProductsController`에 동일한 Middleware를 적용할 수 있습니다.

### 6.4. 여러 Middleware 적용

하나의 Route에 여러 Middleware를 순서대로 적용할 수 있습니다.

```typescript
consumer
  .apply(
    LoggerMiddleware,
    RequestIdMiddleware,
  )
  .forRoutes(UsersController);
```

각 Middleware가 `next()`를 호출하여 제어를 전달하면 다음 순서로 실행됩니다.

```text
HTTP Request
    │
    ▼
LoggerMiddleware
    │
    ▼
RequestIdMiddleware
    │
    ▼
Guards
    │
    ▼
Interceptors
    │
    ▼
Controller
```

Middleware는 등록된 순서에 따라 실행됩니다.

일반적으로 전역 Middleware가 먼저 실행되고, 이후 Module에 등록된 Middleware가 실행됩니다.

Module에 등록된 Middleware는 Root Module에서 등록된 항목이 먼저 실행되며, 다른 Module의 Middleware는 Module import 순서에 영향을 받습니다.

---

## 7. MiddlewareConsumer 주요 API

`MiddlewareConsumer`는 Middleware의 적용 대상과 제외 대상을 설정하는 기능을 제공합니다.

| API | 설명 |
|---|---|
| `apply()` | 하나 이상의 Middleware를 등록합니다. |
| `forRoutes()` | Middleware를 적용할 Route 또는 Controller를 지정합니다. |
| `exclude()` | Middleware 적용 대상에서 특정 Route를 제외합니다. |

### 7.1. exclude()

특정 Route를 Middleware 적용 대상에서 제외할 수 있습니다.

```typescript
import { RequestMethod } from '@nestjs/common';

configure(consumer: MiddlewareConsumer): void {
  consumer
    .apply(LoggerMiddleware)
    .exclude({
      path: 'users/health',
      method: RequestMethod.GET,
    })
    .forRoutes(UsersController);
}
```

위 예제에서는 `UsersController`의 Route Handler에 Middleware를 적용하되, `GET /users/health`는 제외합니다.

이를 통해 Health Check API처럼 별도의 공통 처리가 필요하지 않은 요청을 제외할 수 있습니다.

### 7.2. Route Wildcard

Middleware는 Wildcard를 사용하여 여러 경로를 대상으로 등록할 수 있습니다.

NestJS 11과 Express 5에서 사용하는 경로 패턴을 기준으로 하면, 이름이 있는 Wildcard를 사용하는 것이 중요합니다.

```typescript
consumer
  .apply(LoggerMiddleware)
  .forRoutes({
    path: 'users/*splat',
    method: RequestMethod.ALL,
  });
```

위 패턴은 다음과 같은 경로를 대상으로 사용할 수 있습니다.

```text
/users/1
/users/profile
/users/profile/settings
```

`*splat`은 하나 이상의 경로 부분을 매칭하는 이름이 있는 Wildcard입니다.

`/users` 자체까지 포함해야 한다면 다음과 같이 중괄호를 사용할 수 있습니다.

```typescript
consumer
  .apply(LoggerMiddleware)
  .forRoutes({
    path: 'users/{*splat}',
    method: RequestMethod.ALL,
  });
```

버전에 따라 Wildcard 문법이 달라질 수 있으므로, 이전 버전에서 사용하던 `*` 형태의 경로 패턴을 그대로 사용하기보다는 현재 NestJS 및 HTTP Adapter의 경로 매칭 규칙을 확인해야 합니다.

---

## 8. Middleware와 Dependency Injection

NestJS의 Class-based Middleware는 Dependency Injection을 지원합니다.

따라서 Middleware에서도 다른 Provider를 생성자를 통해 주입받아 사용할 수 있습니다.

### 8.1. Provider를 주입하는 Middleware

다음은 별도의 로깅 서비스를 사용하는 예제입니다.

**request-logger.service.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RequestLoggerService {
  private readonly logger = new Logger(RequestLoggerService.name);

  log(method: string, url: string): void {
    this.logger.log(`${method} ${url}`);
  }
}
```

**logger.middleware.ts**

```typescript
import {
  Injectable,
  NestMiddleware,
} from '@nestjs/common';

import {
  Request,
  Response,
  NextFunction,
} from 'express';

import { RequestLoggerService } from './request-logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly requestLogger: RequestLoggerService,
  ) {}

  use(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    this.requestLogger.log(req.method, req.originalUrl);

    next();
  }
}
```

**app.module.ts**

```typescript
import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';

import { RequestLoggerService } from './request-logger.service';
import { LoggerMiddleware } from './logger.middleware';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [RequestLoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(UsersController);
  }
}
```

이 예제에서는 다음과 같은 과정이 진행됩니다.

1. `RequestLoggerService`가 Module의 Provider로 등록됩니다.
2. NestJS DI Container가 `LoggerMiddleware` 생성에 필요한 의존성을 확인합니다.
3. `RequestLoggerService` 인스턴스를 Middleware 생성자에 주입합니다.
4. HTTP 요청이 들어오면 Middleware의 `use()` 메서드가 실행됩니다.
5. Middleware가 주입받은 서비스를 사용하여 요청 정보를 기록합니다.

### 8.2. Module 범위와 의존성 접근

Middleware는 자신이 등록된 Module에서 접근할 수 있는 Provider를 주입받을 수 있습니다.

다른 Module에 선언된 Provider를 사용하려면 해당 Provider가 `exports`를 통해 공개되고, Middleware를 등록하는 Module에서 해당 Module을 `imports`해야 합니다.

이러한 의존성 접근 규칙은 일반적인 NestJS Provider의 Dependency Injection과 동일한 원칙을 따릅니다.

Middleware 클래스 자체는 `configure()`의 `apply()`를 통해 등록할 수 있으므로, 위 예제처럼 단순히 Middleware를 적용하기 위한 목적으로 `providers` 배열에 별도로 추가할 필요는 없습니다.

---

## 9. 실무 활용 예제

### 9.1. Request ID 생성

분산 환경에서는 하나의 HTTP 요청이 여러 서비스와 구성 요소를 거칠 수 있습니다.

이때 Request ID를 생성하면 로그를 통해 특정 요청의 처리 흐름을 추적하는 데 도움이 됩니다.

다음은 HTTP Header에 Request ID를 추가하는 간단한 예제입니다.

**request-id.middleware.ts**

```typescript
import { randomUUID } from 'node:crypto';

import {
  Injectable,
  NestMiddleware,
} from '@nestjs/common';

import {
  Request,
  Response,
  NextFunction,
} from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const requestId = randomUUID();

    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
```

이 Middleware는 HTTP 요청마다 UUID를 생성하여 응답 Header에 추가합니다.

```http
HTTP/1.1 200 OK
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

실제 분산 추적 환경에서는 Request ID를 응답에 추가하는 것뿐만 아니라, 이후 서비스 호출과 로그에도 동일한 식별자가 전달되도록 설계해야 합니다.

OpenTelemetry와 같은 분산 추적 시스템을 사용하는 경우에는 표준 Trace Context를 우선적으로 활용하는 것이 좋습니다.

### 9.2. HTTP 요청 처리 시간 측정

Middleware를 사용하여 HTTP 요청의 처리 시간을 측정할 수 있습니다.

```typescript
import {
  Injectable,
  NestMiddleware,
  Logger,
} from '@nestjs/common';

import {
  Request,
  Response,
  NextFunction,
} from 'express';

@Injectable()
export class RequestTimingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestTimingMiddleware.name);

  use(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const start = process.hrtime.bigint();

    res.once('finish', () => {
      const duration =
        Number(process.hrtime.bigint() - start) / 1_000_000;

      this.logger.log(
        `${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`,
      );
    });

    next();
  }
}
```

`finish` 이벤트는 HTTP 응답이 서버 측에서 전송 처리를 완료했을 때 발생합니다.

따라서 위 예제는 `next()` 이후의 Controller와 후속 처리 과정을 포함한 요청 처리 시간을 측정하는 데 사용할 수 있습니다.

다만 `finish` 이벤트는 클라이언트가 응답을 실제로 수신했음을 보장하지 않습니다. 연결이 중간에 종료되는 경우 등을 포함하려면 `close` 이벤트도 고려해야 합니다.

또한 이 값은 서버 측에서 측정한 시간이므로 클라이언트의 네트워크 지연을 포함한 전체 응답 시간과는 다를 수 있습니다.

---

## 10. Middleware와 Guard, Interceptor의 차이

Middleware, Guard, Interceptor는 모두 요청 처리 과정에서 공통 기능을 제공하지만 실행 시점과 접근 가능한 정보가 다릅니다.

| 항목 | Middleware | Guard | Interceptor |
|---|---|---|---|
| 실행 시점 | Guard 이전 | Middleware 이후 | Guard 이후 |
| 주요 목적 | 요청 전처리 | 접근 권한 판단 | 실행 전후 처리 |
| HTTP Request 접근 | 가능 | 가능 | 가능 |
| ExecutionContext 접근 | 기본 API에서 미지원 | 지원 | 지원 |
| Handler 메타데이터 접근 | 기본 API에서 미지원 | 지원 | 지원 |
| 응답 데이터 변환 | 직접적인 HTTP 응답 처리 가능 | 주된 목적 아님 | 지원 |
| Dependency Injection | 클래스 기반에서 지원 | 지원 | 지원 |

### 10.1. Middleware와 Guard

Middleware는 HTTP 요청에 대한 공통 전처리를 수행하는 데 적합합니다.

Guard는 현재 요청이 특정 Route Handler를 실행할 권한이 있는지 판단하는 데 적합합니다.

예를 들어 인증 토큰의 단순한 전처리는 Middleware에서 수행할 수 있지만, 특정 API에 대한 사용자 권한 검사는 Guard가 더 적합합니다.

Guard는 `ExecutionContext`를 통해 현재 Controller와 Handler에 접근할 수 있으므로, `@Public()` 또는 역할 기반 권한 정보처럼 Handler에 부여된 메타데이터를 활용할 수 있습니다.

### 10.2. Middleware와 Interceptor

Middleware는 Controller 실행 이전에 요청을 처리하는 데 초점을 맞춥니다.

Interceptor는 Controller 실행 전후의 흐름을 제어할 수 있습니다.

예를 들어 다음과 같이 역할을 구분할 수 있습니다.

- Middleware: Request ID 생성, 공통 HTTP Header 처리
- Interceptor: 응답 데이터 변환, Handler 실행 시간 측정, 응답 로깅

Middleware에서도 HTTP 응답 완료 이벤트를 통해 처리 시간을 측정할 수 있으므로, 어떤 방식이 적합한지는 측정 범위와 목적에 따라 달라집니다.

---

## 11. Middleware 사용 시 주의사항

### 11.1. next() 호출 여부

Middleware가 직접 HTTP 응답을 종료하지 않는 경우에는 `next()`를 호출하여 후속 처리가 진행되도록 해야 합니다.

`next()` 호출이 누락되면 HTTP 요청이 완료되지 않을 수 있습니다.

### 11.2. Blocking 작업 최소화

Middleware는 Controller보다 먼저 실행되므로, 오래 걸리는 작업을 수행하면 요청 처리 지연이 발생합니다.

특히 CPU를 장시간 점유하는 동기 작업은 Node.js Event Loop에 영향을 줄 수 있으므로 피해야 합니다.

### 11.3. 비동기 작업과 오류 처리

Middleware에서 비동기 작업을 수행할 때는 오류가 정상적인 처리 경로로 전달되도록 주의해야 합니다.

Express Adapter를 사용하는 경우 Express 버전과 Middleware 등록 방식에 따라 비동기 오류 전달 방식이 달라질 수 있습니다.

또한 NestJS 공식 문서에서는 일반 Middleware를 Nest의 Exception Filter가 자동으로 처리하는 대상으로 보장하지 않습니다.

따라서 Middleware에서 직접 수행하는 비동기 작업은 적절한 오류 처리와 응답 종료 방식을 설계해야 합니다.

### 11.4. HTTP Adapter 의존성

Express의 `Request`, `Response`, `NextFunction`을 사용하는 코드는 Express Adapter에 종속적입니다.

Fastify Adapter에서는 Middleware 호환 계층과 요청 및 응답 객체의 동작이 다를 수 있습니다.

플랫폼 전환 가능성이 중요한 프로젝트에서는 특정 HTTP 플랫폼에 종속된 API 사용을 최소화하는 것이 좋습니다.

### 11.5. 민감 정보 로깅 방지

요청을 로깅하는 Middleware에서는 다음과 같은 민감 정보가 로그에 기록되지 않도록 주의해야 합니다.

- Authorization Header
- Password
- Access Token 및 Refresh Token
- Session Cookie
- 개인정보가 포함된 Request Body

운영 환경에서는 필요한 정보를 선별적으로 기록하고, 민감한 값은 마스킹하거나 제외하는 방식이 적합합니다.

### 11.6. Middleware에서 비즈니스 로직 분리

Middleware는 여러 요청에 공통적으로 적용되는 전처리에 집중하는 것이 좋습니다.

도메인 정책이나 복잡한 비즈니스 로직은 Service에서 처리하고, 인증 및 인가 판단은 Guard를 활용하는 방식이 책임 분리에 유리합니다.

---

## 12. 핵심 정리

Middleware는 NestJS의 HTTP Request Lifecycle에서 Controller보다 먼저 실행되는 공통 처리 구성 요소입니다.

주요 특징은 다음과 같습니다.

1. **요청 전처리:** HTTP 요청이 Guard 및 Controller에 도달하기 전에 공통 처리를 수행합니다.
2. **실행 흐름 제어:** `next()`를 호출하여 다음 처리 단계로 전달하거나 직접 응답을 종료할 수 있습니다.
3. **다양한 구현 방식:** Class-based Middleware와 Functional Middleware를 지원합니다.
4. **Dependency Injection:** Class-based Middleware는 NestJS Provider를 주입받아 사용할 수 있습니다.
5. **유연한 적용 범위:** Global, Controller 및 Route 단위로 적용할 수 있습니다.
6. **실행 순서:** 전역 Middleware와 Module Middleware가 설정된 순서에 따라 실행됩니다.
7. **HTTP 플랫폼 고려:** Express와 Fastify는 Middleware 처리 방식에 차이가 있으므로 Adapter에 따른 제약을 고려해야 합니다.

Middleware는 Request Lifecycle의 초기 단계에서 공통 기능을 구현하는 데 적합하지만, 모든 횡단 관심사를 Middleware에 배치하는 것은 권장되지 않습니다.

기능의 목적과 실행 시점에 따라 Guard, Interceptor, Pipe 등 다른 NestJS 구성 요소와 역할을 구분하는 것이 중요합니다.

---

## 참고 자료

- [NestJS 공식 문서 - Middleware](https://docs.nestjs.com/middleware)
- [NestJS 공식 문서 - Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [NestJS 공식 문서 - Modules](https://docs.nestjs.com/modules)
- [NestJS 공식 문서 - Providers](https://docs.nestjs.com/providers)
- [NestJS 공식 문서 - Guards](https://docs.nestjs.com/guards)
- [NestJS 공식 문서 - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS 공식 문서 - Exception Filters](https://docs.nestjs.com/exception-filters)
- [Express 공식 문서 - Using Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)