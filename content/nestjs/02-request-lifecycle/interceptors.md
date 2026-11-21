# Interceptors

## 1. 개요

Interceptor는 Controller의 Route Handler 실행 전후에 공통 로직을 적용하거나, Handler가 반환하는 데이터와 예외를 가공할 수 있도록 제공하는 NestJS 구성 요소입니다.

NestJS에서는 `@Injectable()` 데코레이터와 `NestInterceptor` 인터페이스를 사용하여 Interceptor를 구현합니다.

Interceptor는 AOP(Aspect-Oriented Programming, 관점 지향 프로그래밍)의 개념을 기반으로 하며, 비즈니스 로직과 공통 관심사(Cross-Cutting Concerns)를 분리하는 데 활용됩니다.

대표적인 활용 사례는 다음과 같습니다.

- Controller 실행 전후의 로깅
- API 응답 데이터 변환
- HTTP 응답 구조의 표준화
- 요청 처리 시간 측정
- 예외 변환 및 공통 오류 처리
- 캐싱을 통한 Handler 실행 생략
- 요청 처리 Timeout 적용
- 응답 데이터 직렬화(Serialization)

Interceptor의 가장 중요한 특징은 **Controller 실행 전후의 처리 흐름을 제어할 수 있다는 점**입니다.

Middleware가 주로 요청 전처리를 담당하고 Guard가 접근 권한을 판단하는 반면, Interceptor는 Handler 실행을 감싸는 구조로 동작합니다.

이를 통해 여러 Controller에서 반복되는 공통 기능을 재사용 가능한 형태로 구현할 수 있습니다.

---

## 2. Request Lifecycle에서 Interceptor의 위치

NestJS는 HTTP 요청을 처리할 때 Middleware, Guard, Interceptor, Pipe 등의 구성 요소를 순차적으로 실행합니다.

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

Interceptor는 Guard가 요청 실행을 허용한 이후에 실행됩니다.

Interceptor는 Controller 실행 이전의 처리뿐 아니라, Controller가 반환하는 결과에 대한 후처리도 수행할 수 있습니다.

따라서 요청이 들어오는 방향(Inbound)과 응답이 반환되는 방향(Outbound) 모두에 관여합니다.

### 2.1. Interceptor의 실행 구조

```text
HTTP Request
     │
     ▼
Interceptor
     │
     ├── Before Logic
     │
     ▼
  next.handle()
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
Controller Result
     │
     ▼
RxJS Observable
     │
     ▼
Interceptor
     │
     ├── After Logic
     │
     ▼
HTTP Response
```

Interceptor는 `next.handle()`을 통해 후속 요청 처리 흐름을 연결합니다.

Handler가 반환한 결과는 Observable을 통해 전달되며, Interceptor는 RxJS 연산자를 사용하여 데이터를 변환하거나 추가 작업을 수행할 수 있습니다.

> 위 구조는 정상적으로 요청이 처리되는 일반적인 HTTP 요청을 기준으로 합니다. Guard에서 요청을 거부하거나 중간 처리 과정에서 예외가 발생하면 실행 흐름이 달라질 수 있습니다.

---

## 3. Interceptor의 기본 구조

NestJS Interceptor는 `NestInterceptor` 인터페이스를 구현한 클래스입니다.

### 3.1. NestInterceptor 인터페이스

`NestInterceptor` 인터페이스는 다음과 같은 구조를 가집니다.

```typescript
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

export interface NestInterceptor<T = any, R = any> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<R> | Promise<Observable<R>>;
}
```

`NestInterceptor`는 두 가지 Generic Type을 지원합니다.

| Generic | 설명 |
|---|---|
| `T` | 후속 처리 흐름에서 반환하는 데이터 타입입니다. |
| `R` | Interceptor가 최종적으로 반환하는 데이터 타입입니다. |

`intercept()` 메서드는 다음 두 인자를 전달받습니다.

| 인자 | 타입 | 설명 |
|---|---|---|
| `context` | `ExecutionContext` | 현재 Handler와 실행 환경의 정보를 제공합니다. |
| `next` | `CallHandler` | 후속 처리 흐름을 실행하는 기능을 제공합니다. |

### 3.2. 기본 Interceptor 구현

다음은 Controller 실행 전후에 로그를 출력하는 Interceptor입니다.

**logging.interceptor.ts**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    this.logger.log('Before...');

    return next.handle().pipe(
      tap(() => this.logger.log('After...')),
    );
  }
}
```

주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 설명 |
|---|---|
| `@Injectable()` | NestJS Dependency Injection 시스템에서 관리할 수 있는 클래스임을 나타냅니다. |
| `NestInterceptor` | Interceptor 구현에 필요한 인터페이스입니다. |
| `intercept()` | 요청 처리 흐름을 가로채는 메서드입니다. |
| `ExecutionContext` | 현재 실행 대상 Handler와 Controller 등의 정보를 제공합니다. |
| `CallHandler` | 후속 요청 처리 흐름을 실행하는 API를 제공합니다. |
| `next.handle()` | Handler 실행으로 이어지는 Observable을 반환합니다. |
| `pipe()` | Observable에 RxJS 연산자를 적용합니다. |
| `tap()` | Observable에서 값이 전달될 때 부수 효과를 수행합니다. |

위 예제에서 `tap()`은 정상적인 데이터가 전달될 때 로그를 출력합니다.

오류나 취소를 포함한 Observable의 종료 시점에 공통 작업을 수행해야 한다면 `finalize()`를 사용하는 것이 더 적합합니다.

---

## 4. ExecutionContext와 CallHandler

Interceptor는 `ExecutionContext`와 `CallHandler`를 사용하여 현재 요청의 실행 환경과 Handler 실행 흐름을 제어합니다.

### 4.1. ExecutionContext

`ExecutionContext`는 현재 요청을 처리하는 Controller와 Handler 및 실행 환경에 관한 정보를 제공합니다.

주요 메서드는 다음과 같습니다.

| 메서드 | 설명 |
|---|---|
| `switchToHttp()` | HTTP 실행 컨텍스트에 접근합니다. |
| `switchToWs()` | WebSocket 실행 컨텍스트에 접근합니다. |
| `switchToRpc()` | RPC 실행 컨텍스트에 접근합니다. |
| `getHandler()` | 실행 대상 Handler의 참조를 반환합니다. |
| `getClass()` | Handler가 속한 Controller 클래스의 참조를 반환합니다. |
| `getType()` | 현재 실행 환경의 유형을 반환합니다. |

HTTP 요청의 정보를 확인하는 예제는 다음과 같습니다.

```typescript
import { Request } from 'express';

intercept(
  context: ExecutionContext,
  next: CallHandler,
): Observable<any> {
  const request = context.switchToHttp().getRequest<Request>();

  console.log(request.method);
  console.log(request.url);

  return next.handle();
}
```

위 예제는 Express Adapter를 기준으로 작성했습니다.

Fastify Adapter를 사용하는 경우에는 해당 플랫폼의 요청 객체 인터페이스를 고려해야 합니다.

### 4.2. CallHandler

`CallHandler`는 후속 요청 처리 흐름을 실행하기 위한 인터페이스입니다.

다음과 같은 `handle()` 메서드를 제공합니다.

```typescript
export interface CallHandler<T = any> {
  handle(): Observable<T>;
}
```

`next.handle()`은 Controller Handler의 결과를 전달하는 Observable을 반환합니다.

다음과 같이 사용할 수 있습니다.

```typescript
intercept(
  context: ExecutionContext,
  next: CallHandler,
): Observable<any> {
  return next.handle();
}
```

이 경우 Interceptor는 응답 데이터를 별도로 변경하지 않고 후속 처리 결과를 그대로 전달합니다.

### 4.3. next.handle()을 호출하지 않는 경우

Interceptor는 반드시 `next.handle()`을 호출해야 하는 것은 아닙니다.

다른 Observable을 직접 반환하면 Controller Handler 실행을 생략할 수 있습니다.

```typescript
import { of } from 'rxjs';

intercept(
  context: ExecutionContext,
  next: CallHandler,
): Observable<any> {
  return of({
    message: 'Cached response',
  });
}
```

이 경우 Controller Handler는 호출되지 않습니다.

이러한 특성은 캐싱이나 조건부 응답 처리에 활용할 수 있습니다.

---

## 5. RxJS와 Observable

NestJS Interceptor는 RxJS의 Observable을 사용하여 Handler 실행 결과를 처리합니다.

Observable은 시간이 흐르면서 전달되는 하나 이상의 값과 오류 및 완료 신호를 표현하는 추상화입니다.

Interceptor에서는 `next.handle()`이 반환한 Observable에 RxJS 연산자를 적용하여 응답 처리 흐름을 구성합니다.

### 5.1. Observable 처리 구조

```text
next.handle()
      │
      ▼
  Observable
      │
      ▼
    pipe()
      │
      ├── tap()
      │
      ├── map()
      │
      ├── catchError()
      │
      └── finalize()
      │
      ▼
Final Observable
      │
      ▼
HTTP Response
```

대표적인 RxJS 연산자는 다음과 같습니다.

| 연산자 | 역할 |
|---|---|
| `tap()` | 데이터에 영향을 주지 않고 로깅 등의 부수 효과를 수행합니다. |
| `map()` | Observable에서 전달되는 데이터를 변환합니다. |
| `catchError()` | Observable 처리 중 발생한 오류를 처리하거나 변환합니다. |
| `finalize()` | 정상 완료, 오류 또는 구독 해제 시 정리 작업을 실행합니다. |
| `timeout()` | 지정된 시간 안에 값이 전달되지 않으면 Timeout 오류를 발생시킵니다. |
| `of()` | 지정한 값을 전달하는 Observable을 생성합니다. |
| `throwError()` | 오류를 전달하는 Observable을 생성합니다. |

`of()`와 `throwError()`는 Pipeable Operator가 아니라 Observable 생성 함수입니다.

Interceptor에서는 이러한 함수와 연산자를 조합하여 응답 처리 과정을 구성할 수 있습니다.

---

## 6. Interceptor 등록 방법

NestJS Interceptor는 다음 세 가지 범위로 등록할 수 있습니다.

1. Global Interceptor
2. Controller-scoped Interceptor
3. Method-scoped Interceptor

### 6.1. Method-scoped Interceptor

특정 Route Handler에만 Interceptor를 적용할 수 있습니다.

**users.controller.ts**

```typescript
import {
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';

import { LoggingInterceptor } from './logging.interceptor';

@Controller('users')
export class UsersController {
  @Get()
  @UseInterceptors(LoggingInterceptor)
  findAll() {
    return ['user1', 'user2'];
  }
}
```

위 설정에서는 `GET /users` 요청이 처리될 때 `LoggingInterceptor`가 실행됩니다.

`@UseInterceptors()`는 `@nestjs/common` 패키지에서 제공하는 데코레이터입니다.

### 6.2. Controller-scoped Interceptor

Controller 클래스에 Interceptor를 적용하면 해당 Controller의 모든 Route Handler에 적용됩니다.

```typescript
import {
  Controller,
  Get,
  Post,
  UseInterceptors,
} from '@nestjs/common';

import { LoggingInterceptor } from './logging.interceptor';

@Controller('users')
@UseInterceptors(LoggingInterceptor)
export class UsersController {
  @Get()
  findAll() {
    return ['user1', 'user2'];
  }

  @Post()
  create() {
    return {
      message: 'User created',
    };
  }
}
```

위 예제에서는 다음 API 모두 Interceptor가 적용됩니다.

```text
GET  /users
POST /users
```

### 6.3. Global Interceptor

애플리케이션 전체에 Interceptor를 적용하려면 `main.ts`에서 `useGlobalInterceptors()`를 사용할 수 있습니다.

**main.ts**

```typescript
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { LoggingInterceptor } from './logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

이 방식은 애플리케이션 전체의 Controller와 Route Handler에 Interceptor를 적용합니다.

다만 `new LoggingInterceptor()`로 인스턴스를 직접 생성하면 NestJS DI Container의 생성자 주입을 사용할 수 없습니다.

### 6.4. APP_INTERCEPTOR를 이용한 전역 등록

Dependency Injection이 필요한 Global Interceptor는 `APP_INTERCEPTOR` 토큰을 사용하여 등록할 수 있습니다.

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { LoggingInterceptor } from './logging.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

이 방식에서는 NestJS DI Container가 Interceptor를 생성하고 관리합니다.

`APP_INTERCEPTOR`로 등록한 Interceptor는 선언된 Module에만 한정되지 않고 애플리케이션 전체에 적용됩니다.

---

## 7. 여러 Interceptor의 실행 순서

여러 Interceptor가 등록되어 있으면 요청 처리와 응답 처리에서 실행 순서가 달라집니다.

요청이 들어오는 방향에서는 다음 순서로 실행됩니다.

1. Global Interceptor
2. Controller Interceptor
3. Method Interceptor

반대로 응답이 반환되는 방향에서는 다음 순서로 후처리가 수행됩니다.

1. Method Interceptor
2. Controller Interceptor
3. Global Interceptor

이러한 실행 구조를 First In, Last Out(FILO) 방식이라고 합니다.

### 7.1. 실행 순서 예제

다음 세 Interceptor가 등록되어 있다고 가정합니다.

```typescript
@UseInterceptors(ControllerInterceptor)
@Controller('users')
export class UsersController {
  @Get()
  @UseInterceptors(MethodInterceptor)
  findAll() {
    return [];
  }
}
```

Global Interceptor는 별도로 등록되어 있다고 가정합니다.

전체 실행 흐름은 다음과 같습니다.

```text
HTTP Request
     │
     ▼
GlobalInterceptor (Before)
     │
     ▼
ControllerInterceptor (Before)
     │
     ▼
MethodInterceptor (Before)
     │
     ▼
Pipes
     │
     ▼
Controller Handler
     │
     ▼
MethodInterceptor (After)
     │
     ▼
ControllerInterceptor (After)
     │
     ▼
GlobalInterceptor (After)
     │
     ▼
HTTP Response
```

즉, Interceptor는 중첩된 함수 호출과 유사하게 동작합니다.

### 7.2. 실행 순서가 중요한 이유

여러 Interceptor를 조합하면 데이터 변환 순서에 따라 최종 응답이 달라질 수 있습니다.

예를 들어 Method Interceptor가 데이터를 변환한 다음 Global Interceptor가 응답을 공통 구조로 감싸도록 구성할 수 있습니다.

이때 Global Interceptor는 Method Interceptor가 변환한 데이터를 전달받습니다.

따라서 Logging, Serialization, Response Mapping, Cache 등의 Interceptor를 함께 사용할 때는 적용 순서를 고려해야 합니다.

---

## 8. 응답 데이터 변환(Response Mapping)

Interceptor는 Controller가 반환한 데이터를 가공하여 클라이언트에 전달할 수 있습니다.

RxJS의 `map()` 연산자를 사용하면 Observable에 전달되는 데이터를 원하는 형태로 변환할 수 있습니다.

### 8.1. TransformInterceptor 구현

**transform.interceptor.ts**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
      })),
    );
  }
}
```

이 Interceptor는 Controller에서 반환한 데이터를 `data` 속성으로 감쌉니다.

### 8.2. Controller에 적용

```typescript
import {
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';

import { TransformInterceptor } from './transform.interceptor';

@Controller('users')
@UseInterceptors(TransformInterceptor)
export class UsersController {
  @Get()
  findAll() {
    return [
      {
        id: 1,
        name: 'Alice',
      },
      {
        id: 2,
        name: 'Bob',
      },
    ];
  }
}
```

Controller가 반환하는 데이터는 다음과 같습니다.

```json
[
  {
    "id": 1,
    "name": "Alice"
  },
  {
    "id": 2,
    "name": "Bob"
  }
]
```

Interceptor를 통과한 최종 응답은 다음과 같습니다.

```json
{
  "data": [
    {
      "id": 1,
      "name": "Alice"
    },
    {
      "id": 2,
      "name": "Bob"
    }
  ]
}
```

이 방식을 활용하면 여러 API의 응답 구조를 일관되게 유지할 수 있습니다.

### 8.3. Response Mapping의 제약

NestJS의 표준 응답 처리 방식을 사용하는 경우에 Response Mapping을 적용할 수 있습니다.

반면 `@Res()`를 통해 Express나 Fastify의 응답 객체를 직접 제어하고 응답을 종료하면 NestJS의 자동 응답 처리와 Interceptor 기반 응답 변환이 정상적으로 적용되지 않을 수 있습니다.

따라서 일반적인 JSON API에서는 가능하면 Controller가 데이터를 반환하고 NestJS가 응답을 처리하도록 구성하는 것이 좋습니다.

---

## 9. 요청 처리 시간 측정

Interceptor는 Controller 실행 전후의 처리 시간을 측정하는 데 사용할 수 있습니다.

### 9.1. LoggingInterceptor 구현

**logging.interceptor.ts**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    const start = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const elapsed =
          Number(process.hrtime.bigint() - start) / 1_000_000;

        this.logger.log(
          `${controller}.${handler} - ${elapsed.toFixed(2)}ms`,
        );
      }),
    );
  }
}
```

이 Interceptor는 다음 정보를 기록합니다.

- Controller 이름
- Handler 이름
- 처리에 소요된 시간

예상 로그는 다음과 같습니다.

```text
[LoggingInterceptor] UsersController.findAll - 12.35ms
```

### 9.2. tap()과 finalize()의 차이

| 연산자 | 실행 시점 | 주요 활용 |
|---|---|---|
| `tap()` | 데이터, 오류 또는 완료 신호를 관찰할 때 | 데이터 로깅 및 부수 효과 |
| `finalize()` | Observable이 정상 완료, 오류 또는 구독 해제로 종료될 때 | 시간 측정 및 리소스 정리 |

단순한 HTTP 응답 값의 로깅에는 `tap()`을 사용할 수 있습니다.

반면 정상 처리와 오류 처리를 모두 포함하여 종료 시점에 공통 작업을 수행하려면 `finalize()`가 적합합니다.

> Interceptor에서 측정한 시간은 Interceptor가 감싸는 요청 처리 흐름을 기준으로 합니다. 네트워크 전송 완료 시간이나 전체 Middleware 처리 시간을 정확하게 나타내는 것은 아닙니다.

---

## 10. 예외 변환(Exception Mapping)

Interceptor는 Controller 또는 Service에서 발생한 예외를 다른 예외로 변환할 수 있습니다.

RxJS의 `catchError()` 연산자를 사용합니다.

### 10.1. ErrorsInterceptor 구현

**errors.interceptor.ts**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  Observable,
  throwError,
} from 'rxjs';

import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        // 오류 변환을 위한 예제입니다.
        return throwError(
          () => new ServiceUnavailableException(),
        );
      }),
    );
  }
}
```

위 예제에서는 Handler 처리 과정에서 발생한 오류를 `ServiceUnavailableException`으로 변환합니다.

따라서 기본 HTTP 예외 처리 방식에서는 HTTP 503 응답이 생성됩니다.

다만 모든 오류를 HTTP 503으로 변환하는 방식은 실제 운영 환경에서 권장되지 않습니다.

Validation 오류, 인증 오류, 비즈니스 오류 등을 구분하지 못하기 때문입니다.

### 10.2. 특정 예외만 변환

일반적으로는 특정 오류만 변환하고 나머지 오류는 그대로 전달하는 방식이 적합합니다.

```typescript
import {
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// intercept() 내부의 Observable 처리 부분입니다.
return next.handle().pipe(
  catchError((error: unknown) => {
    if (error instanceof HttpException) {
      return throwError(() => error);
    }

    return throwError(
      () => new ServiceUnavailableException(),
    );
  }),
);
```

위 예제에서는 이미 `HttpException`으로 표현된 오류를 유지합니다.

그 외 오류는 HTTP 503 예외로 변환합니다.

이 예제 역시 비 HTTP 오류를 모두 서비스 장애로 간주하므로, 실제 구현에서는 오류의 종류와 원인을 더 구체적으로 구분해야 합니다.

### 10.3. Exception Filter와의 관계

Interceptor에서 `catchError()`로 오류를 처리할 수 있지만, 모든 예외 처리를 Interceptor가 담당해야 하는 것은 아닙니다.

일반적으로 다음과 같이 역할을 구분할 수 있습니다.

- Interceptor: 특정 처리 흐름에서 발생한 오류를 변환하거나 복구합니다.
- Exception Filter: 처리되지 않은 예외를 HTTP 응답 등으로 변환합니다.

Interceptor에서 오류를 새로운 Observable 값으로 복구하면 해당 오류는 이후 Exception Filter까지 전달되지 않을 수 있습니다.

반대로 오류를 다시 발생시키면 NestJS의 예외 처리 흐름으로 전달됩니다.

---

## 11. 캐싱(Cache)과 Handler 실행 생략

Interceptor는 특정 조건에서 Controller Handler를 실행하지 않고 다른 결과를 반환할 수 있습니다.

이 기능은 캐싱과 같은 처리에 활용할 수 있습니다.

### 11.1. 간단한 Cache Interceptor

다음은 캐시된 데이터가 존재한다고 가정하고 Handler 실행을 생략하는 개념 예제입니다.

**example-cache.interceptor.ts**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

import { Observable, of } from 'rxjs';

@Injectable()
export class ExampleCacheInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const cachedData = {
      id: 1,
      name: 'Alice',
    };

    if (cachedData) {
      return of(cachedData);
    }

    return next.handle();
  }
}
```

위 예제는 캐싱의 동작 원리를 설명하기 위해 데이터를 고정했습니다.

실제 캐시 저장소 조회나 TTL, 데이터 갱신 및 무효화 기능은 구현되어 있지 않습니다.

실행 흐름은 다음과 같습니다.

```text
HTTP Request
     │
     ▼
Cache Interceptor
     │
     ▼
  Cache Hit?
     │
     ├── Yes ─────► Cached Data
     │                    │
     │                    ▼
     │                Response
     │
     └── No ──────► next.handle()
                          │
                          ▼
                      Controller
                          │
                          ▼
                       Response
```

### 11.2. NestJS CacheInterceptor

실제 애플리케이션에서는 직접 캐시 Interceptor를 구현하기보다 NestJS의 캐싱 기능을 고려할 수 있습니다.

NestJS는 `@nestjs/cache-manager` 패키지에서 `CacheInterceptor`를 제공합니다.

다음은 필요한 패키지가 설치되고 CacheModule이 설정되어 있다는 전제하에 작성한 예제입니다.

```typescript
import {
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';

import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('users')
@UseInterceptors(CacheInterceptor)
export class UsersController {
  @Get()
  findAll() {
    return [
      {
        id: 1,
        name: 'Alice',
      },
    ];
  }
}
```

기본적인 HTTP 캐싱은 주로 GET 요청을 대상으로 합니다.

`CacheInterceptor`를 사용하기 위해서는 캐시 저장소와 캐시 Module 구성이 필요합니다.

구체적인 설정과 캐시 정책은 `03-techniques/caching.md` 문서에서 다룹니다.

---

## 12. Timeout Interceptor

Interceptor는 요청 처리 과정에 시간 제한을 적용할 수도 있습니다.

RxJS의 `timeout()` 연산자를 사용하면 지정한 시간 안에 Observable이 값을 전달하지 않을 경우 Timeout 오류를 발생시킬 수 있습니다.

### 12.1. TimeoutInterceptor 구현

**timeout.interceptor.ts**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';

import {
  Observable,
  throwError,
  TimeoutError,
} from 'rxjs';

import {
  timeout,
  catchError,
} from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException(),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
```

위 예제에서는 Observable이 5초 안에 값을 전달하지 않으면 `RequestTimeoutException`을 발생시킵니다.

기본 HTTP 예외 처리 방식에서는 HTTP 408 응답이 생성됩니다.

### 12.2. Timeout 사용 시 주의사항

RxJS의 `timeout()`은 Observable에 적용되는 시간 제한입니다.

따라서 Timeout이 발생했다고 해서 데이터베이스 쿼리나 외부 API 요청 등 이미 진행 중인 모든 비동기 작업이 자동으로 중단되는 것은 아닙니다.

실제 작업 취소가 필요한 경우에는 다음과 같은 방식을 별도로 고려해야 합니다.

- AbortController를 통한 외부 HTTP 요청 취소
- 데이터베이스 쿼리 Timeout 설정
- 외부 서비스 호출의 Timeout 정책
- 작업 취소와 리소스 정리 로직

또한 값을 여러 번 전달하는 Observable에서는 각 값이 전달되는 간격에 따라 Timeout이 판단될 수 있습니다.

따라서 `timeout(5000)`이 모든 상황에서 요청 전체 실행 시간을 정확히 5초로 제한하는 것은 아닙니다.

---

## 13. Serialization Interceptor

Serialization은 Controller가 반환하는 객체를 클라이언트에 전달하기 적합한 형태로 변환하는 과정입니다.

NestJS는 응답 직렬화를 위한 내장 Interceptor를 제공합니다.

대표적으로 `ClassSerializerInterceptor`를 사용할 수 있습니다.

### 13.1. ClassSerializerInterceptor

`ClassSerializerInterceptor`는 `class-transformer` 패키지를 사용하여 클래스 인스턴스를 직렬화합니다.

`@Exclude()`, `@Expose()` 등의 데코레이터를 활용하여 특정 필드를 제외하거나 변환할 수 있습니다.

**user.entity.ts**

```typescript
import { Exclude } from 'class-transformer';

export class UserEntity {
  id: number;
  name: string;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
```

**users.controller.ts**

```typescript
import {
  Controller,
  Get,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';

import { UserEntity } from './user.entity';

@Controller('users')
export class UsersController {
  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  findOne(): UserEntity {
    return new UserEntity({
      id: 1,
      name: 'Alice',
      password: 'secret',
    });
  }
}
```

Controller가 생성한 객체에는 다음 정보가 포함됩니다.

```json
{
  "id": 1,
  "name": "Alice",
  "password": "secret"
}
```

그러나 `ClassSerializerInterceptor`가 적용된 최종 응답에서는 `password` 필드가 제외됩니다.

```json
{
  "id": 1,
  "name": "Alice"
}
```

### 13.2. Serialization 사용 시 주의사항

`ClassSerializerInterceptor`는 기본적으로 클래스 인스턴스의 데코레이터를 기반으로 동작합니다.

따라서 단순한 JavaScript 객체를 반환하는 경우에는 기대한 직렬화 규칙이 적용되지 않을 수 있습니다.

필요한 경우 `@SerializeOptions()`를 통해 반환 객체를 지정된 클래스 형태로 변환하도록 설정할 수 있습니다.

또한 HTTP 응답을 `@Res()`로 직접 처리하는 경우 자동 응답 직렬화가 제한될 수 있습니다.

NestJS의 직렬화 기능은 `03-techniques/serialization.md` 문서에서 자세히 다룹니다.

---

## 14. Interceptor와 Dependency Injection

Interceptor는 `@Injectable()` 데코레이터를 통해 NestJS의 Dependency Injection 기능을 활용할 수 있습니다.

따라서 다른 Provider를 생성자로 주입받아 사용할 수 있습니다.

### 14.1. LoggerService 주입

다음은 별도의 로깅 서비스를 사용하는 예제입니다.

**request-logger.service.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RequestLoggerService {
  private readonly logger = new Logger(RequestLoggerService.name);

  log(message: string): void {
    this.logger.log(message);
  }
}
```

**logging.interceptor.ts**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { RequestLoggerService } from './request-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly requestLogger: RequestLoggerService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const handler = context.getHandler().name;

    this.requestLogger.log(`Before: ${handler}`);

    return next.handle().pipe(
      tap(() => {
        this.requestLogger.log(`After: ${handler}`);
      }),
    );
  }
}
```

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { LoggingInterceptor } from './logging.interceptor';
import { RequestLoggerService } from './request-logger.service';

@Module({
  providers: [
    RequestLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

이 예제에서는 다음과 같은 과정이 진행됩니다.

1. `RequestLoggerService`를 Provider로 등록합니다.
2. `APP_INTERCEPTOR` 토큰을 통해 `LoggingInterceptor`를 전역 등록합니다.
3. NestJS DI Container가 Interceptor 인스턴스를 생성합니다.
4. 생성자에 `RequestLoggerService`를 주입합니다.
5. 요청이 들어오면 Interceptor에서 주입받은 서비스를 사용합니다.

이 방식을 통해 Interceptor 내부에 직접 로깅 구현을 작성하지 않고 별도의 서비스에 위임할 수 있습니다.

---

## 15. Middleware, Guard, Interceptor의 차이

Middleware, Guard, Interceptor는 모두 HTTP 요청 처리 과정에서 공통 기능을 제공하지만 역할과 실행 시점이 다릅니다.

| 항목 | Middleware | Guard | Interceptor |
|---|---|---|---|
| 실행 시점 | Guard 이전 | Interceptor 이전 | Guard 이후 |
| 주요 목적 | 요청 전처리 | 접근 권한 검사 | Handler 실행 전후 처리 |
| 주요 메서드 | `use()` | `canActivate()` | `intercept()` |
| ExecutionContext | 기본 API에서 미지원 | 지원 | 지원 |
| Handler 정보 접근 | 기본 API에서 미지원 | 지원 | 지원 |
| 요청 차단 | 가능 | 가능 | Handler 실행 생략 가능 |
| 응답 변환 | 직접 응답 처리 가능 | 주된 목적 아님 | 지원 |
| Dependency Injection | 클래스 기반에서 지원 | 지원 | 지원 |
| 주요 활용 사례 | HTTP Header, 로깅 | 인증, 인가 | 응답 변환, 캐싱, Timeout |

### 15.1. Middleware와 Interceptor

Middleware는 Controller 실행 이전에 HTTP 요청을 전처리하는 데 적합합니다.

Interceptor는 Handler 실행을 감싸는 구조이므로 Handler 실행 전후의 처리와 응답 데이터 변환에 적합합니다.

예를 들어 Request ID 생성은 Middleware에서 처리하고, Handler 실행 시간 측정은 Interceptor에서 처리할 수 있습니다.

### 15.2. Guard와 Interceptor

Guard는 요청이 특정 Handler를 실행할 수 있는지 판단합니다.

Interceptor는 Handler 실행이 허용된 이후 해당 실행 흐름을 감싸고 결과를 가공합니다.

따라서 인증과 인가는 Guard에서 처리하고, 응답 변환이나 캐싱은 Interceptor에서 처리하는 것이 일반적입니다.

---

## 16. Interceptor 사용 시 주의사항

### 16.1. next.handle() 호출 여부

Interceptor에서 `next.handle()`을 호출하지 않으면 후속 Controller Handler가 실행되지 않습니다.

따라서 캐시된 응답을 반환하는 등 의도적으로 Handler 실행을 생략하는 경우가 아니라면 `next.handle()`을 호출해야 합니다.

### 16.2. Observable 반환

Interceptor의 `intercept()` 메서드는 Observable 또는 Observable을 반환하는 Promise를 반환해야 합니다.

Observable을 생성하기만 하고 반환하지 않으면 정상적인 응답 처리가 진행되지 않습니다.

### 16.3. 응답 변환의 일관성

전역 Response Mapping Interceptor를 사용하는 경우 모든 API의 응답에 동일한 변환이 적용될 수 있습니다.

파일 다운로드, Streaming, SSE 등 특수한 응답 형식에서는 일반적인 JSON 응답 변환을 적용하는 것이 적절하지 않을 수 있습니다.

따라서 응답 유형에 따라 변환을 제외하거나 별도의 처리 방식을 사용하는 것이 좋습니다.

### 16.4. 예외 처리의 책임 분리

Interceptor에서 모든 예외를 무조건 변환하면 실제 오류의 의미가 사라질 수 있습니다.

예를 들어 Validation 실패와 인증 실패를 모두 HTTP 500으로 변환하면 클라이언트가 오류 원인을 구분하기 어렵습니다.

예외 변환은 필요한 범위로 제한하고, 최종 HTTP 예외 응답 생성은 Exception Filter와 역할을 구분하는 것이 좋습니다.

### 16.5. 비동기 작업과 리소스 정리

Interceptor에서 비동기 작업을 수행하는 경우 오류와 취소 상황을 고려해야 합니다.

특히 `timeout()`, `catchError()`, `finalize()` 등의 연산자를 사용할 때는 Observable의 오류 전파와 구독 해제가 실제 외부 작업의 취소를 보장하지 않는다는 점에 주의해야 합니다.

### 16.6. Interceptor 실행 순서

여러 Interceptor가 적용된 경우 응답 데이터는 중첩된 순서의 역순으로 처리됩니다.

따라서 응답 직렬화, 응답 구조 변환, 캐싱 등의 기능을 조합할 때는 Interceptor의 등록 순서와 데이터 변환 결과를 확인해야 합니다.

### 16.7. WebSocket 및 Microservices 환경

Interceptor는 HTTP뿐 아니라 WebSocket 및 Microservices에서도 사용할 수 있습니다.

다만 실행 환경에 따라 Context에 접근하는 방식과 반환 데이터의 처리 방식이 달라집니다.

HTTP 환경에 종속된 `Request`, `Response` 객체를 직접 사용하는 Interceptor는 다른 전송 계층에서 그대로 재사용하기 어렵습니다.

여러 전송 방식을 지원하는 애플리케이션에서는 `context.getType()` 등을 통해 실행 환경을 구분하는 방식을 고려해야 합니다.

---

## 17. 핵심 정리

Interceptor는 NestJS Request Lifecycle에서 Controller Handler 실행 전후의 공통 로직을 처리하는 구성 요소입니다.

핵심 특징은 다음과 같습니다.

1. **실행 전후 처리:** Controller Handler 실행 전후에 공통 로직을 적용합니다.
2. **AOP 기반 구조:** 공통 관심사를 비즈니스 로직에서 분리합니다.
3. **NestInterceptor:** `intercept()` 메서드를 구현하여 요청 처리 흐름을 제어합니다.
4. **CallHandler:** `next.handle()`을 통해 후속 요청 처리 흐름을 실행합니다.
5. **RxJS Observable:** Observable과 RxJS 연산자를 활용하여 응답 데이터와 오류를 처리합니다.
6. **Response Mapping:** Controller가 반환한 데이터를 원하는 응답 구조로 변환합니다.
7. **Exception Mapping:** 처리 과정에서 발생한 예외를 변환하거나 복구할 수 있습니다.
8. **Handler 실행 생략:** 캐싱 등의 목적으로 Controller 실행을 생략할 수 있습니다.
9. **적용 범위:** Global, Controller 및 Method 단위로 적용할 수 있습니다.
10. **Dependency Injection:** 다른 Provider를 주입받아 공통 기능을 구현할 수 있습니다.

Interceptor의 핵심은 **`next.handle()`이 반환하는 Observable을 중심으로 Handler 실행 전후의 흐름을 구성하고 제어하는 것**입니다.

따라서 요청의 접근 권한 판단에는 Guard를 사용하고, Handler 실행 전후의 공통 기능과 반환 데이터 처리에는 Interceptor를 활용하는 것이 적합합니다.

---

## 참고 자료

- [NestJS 공식 문서 - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS 공식 문서 - Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [NestJS 공식 문서 - Execution Context](https://docs.nestjs.com/fundamentals/execution-context)
- [NestJS 공식 문서 - Middleware](https://docs.nestjs.com/middleware)
- [NestJS 공식 문서 - Guards](https://docs.nestjs.com/guards)
- [NestJS 공식 문서 - Pipes](https://docs.nestjs.com/pipes)
- [NestJS 공식 문서 - Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS 공식 문서 - Serialization](https://docs.nestjs.com/techniques/serialization)
- [NestJS 공식 문서 - Caching](https://docs.nestjs.com/techniques/caching)
- [RxJS 공식 문서](https://rxjs.dev/)
- [RxJS 공식 문서 - Operators](https://rxjs.dev/guide/operators)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)