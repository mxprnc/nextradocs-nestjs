# Exception Filters

## 1. 개요

Exception Filter는 NestJS 애플리케이션에서 처리되지 않은 예외를 포착하고, 클라이언트에 반환할 오류 응답을 생성하거나 제어하는 구성 요소입니다.

NestJS는 기본적으로 예외 처리 계층(Exception Layer)을 제공하며, 애플리케이션에서 처리하지 않은 예외가 발생하면 해당 예외를 포착하여 적절한 응답으로 변환합니다.

개발자는 `@Catch()` 데코레이터와 `ExceptionFilter` 인터페이스를 사용하여 사용자 정의 Exception Filter를 구현할 수 있습니다.

대표적인 활용 사례는 다음과 같습니다.

- HTTP 예외를 일관된 응답 형식으로 변환
- 예외 발생 시 요청 정보와 오류 내용 로깅
- 사용자 정의 예외 처리
- HTTP 상태 코드 및 오류 메시지 제어
- 처리되지 않은 예외에 대한 공통 응답 생성
- 내부 오류 정보의 외부 노출 방지
- 오류 추적을 위한 Request ID 및 Timestamp 추가
- 애플리케이션의 공통 오류 응답 정책 적용

Exception Filter의 핵심 역할은 **요청 처리 과정에서 발생한 예외를 최종적으로 처리하고, 클라이언트에 적절한 오류 응답을 반환하는 것**입니다.

Guard, Pipe, Interceptor 등의 구성 요소도 예외를 발생시킬 수 있지만, Exception Filter는 이러한 예외를 처리하는 별도의 계층에 해당합니다.

---

## 2. Request Lifecycle에서 Exception Filter의 위치

NestJS는 HTTP 요청을 처리할 때 Middleware, Guard, Interceptor, Pipe 등의 구성 요소를 순차적으로 실행합니다.

Exception Filter는 정상적인 요청 처리 과정에서 항상 실행되는 구성 요소가 아닙니다.

요청 처리 도중 처리되지 않은 예외가 발생했을 때 실행됩니다.

### 2.1. 정상적인 요청 처리 흐름

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

위 흐름에서는 처리되지 않은 예외가 발생하지 않았으므로 Exception Filter가 실행되지 않습니다.

### 2.2. 예외 발생 시 처리 흐름

```text
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
   Exception
     │
     ▼
Exception Layer
     │
     ▼
Exception Filter
     │
     ▼
 HTTP Error Response
     │
     ▼
   Client
```

예외가 발생하면 일반적인 요청 처리 흐름이 중단되고 예외 처리 과정으로 전환됩니다.

예를 들어 다음과 같은 상황에서 Exception Filter가 실행될 수 있습니다.

- Guard가 `UnauthorizedException`을 발생시킨 경우
- Pipe가 `BadRequestException`을 발생시킨 경우
- Controller에서 `NotFoundException`을 발생시킨 경우
- Service에서 처리되지 않은 예외가 발생한 경우
- Interceptor에서 발생한 오류가 복구되지 않고 전달된 경우

단, 예외가 발생했다고 해서 항상 Exception Filter까지 전달되는 것은 아닙니다.

예를 들어 Service에서 `try/catch`로 예외를 처리하거나 Interceptor에서 `catchError()`를 사용하여 오류를 정상적인 응답으로 복구한 경우에는 해당 예외가 Exception Filter까지 전달되지 않을 수 있습니다.

또한 HTTP 응답이 이미 전송된 이후에는 Exception Filter가 새로운 오류 응답을 정상적으로 전송하지 못할 수 있습니다.

---

## 3. NestJS의 기본 Exception Layer

NestJS는 별도의 Exception Filter를 구현하지 않더라도 기본적인 예외 처리를 수행합니다.

이를 위해 프레임워크 내부에 기본 Exception Layer가 존재합니다.

기본 Exception Filter는 주로 다음 두 가지 경우를 처리합니다.

1. `HttpException` 또는 이를 상속한 예외
2. NestJS가 인식하지 못하는 일반적인 예외

### 3.1. HttpException 처리

NestJS에서 제공하는 HTTP 예외는 `HttpException` 클래스를 기반으로 합니다.

예를 들어 다음과 같이 예외를 발생시킬 수 있습니다.

```typescript
import {
  Controller,
  Get,
  NotFoundException,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  findOne() {
    throw new NotFoundException('User not found');
  }
}
```

위 예제에서는 `NotFoundException`이 발생합니다.

NestJS의 기본 Exception Layer는 해당 예외를 처리하여 HTTP 404 응답을 생성합니다.

```json
{
  "message": "User not found",
  "error": "Not Found",
  "statusCode": 404
}
```

위 응답은 NestJS의 기본 HTTP 예외 응답 형식을 기준으로 합니다.

사용자 정의 Exception Filter나 전역 응답 처리 정책에 따라 실제 응답 구조는 달라질 수 있습니다.

### 3.2. 인식되지 않은 예외 처리

NestJS가 인식하지 못하는 예외가 발생하면 기본적으로 HTTP 500 응답을 생성합니다.

```typescript
@Get()
findAll() {
  throw new Error('Database connection failed');
}
```

기본 오류 응답은 다음과 같습니다.

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

이 경우 실제 예외 메시지인 `Database connection failed`는 기본 응답에 포함되지 않습니다.

이는 내부 시스템의 오류 정보를 클라이언트에 직접 노출하지 않도록 하기 위한 동작입니다.

다만 NestJS의 기본 Exception Layer는 `http-errors` 라이브러리에서 사용하는 형태의 `statusCode` 및 `message` 속성을 가진 일부 오류도 인식하여 처리할 수 있습니다.

따라서 모든 비 `HttpException` 예외가 반드시 HTTP 500으로 처리되는 것은 아닙니다.

---

## 4. HttpException

`HttpException`은 NestJS에서 HTTP 오류를 표현하기 위해 제공하는 기본 예외 클래스입니다.

`@nestjs/common` 패키지에서 가져와 사용할 수 있습니다.

### 4.1. HttpException 생성

`HttpException`은 일반적으로 다음과 같이 사용합니다.

```typescript
import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';

throw new HttpException(
  'Resource not found',
  HttpStatus.NOT_FOUND,
);
```

주요 인자는 다음과 같습니다.

| 인자 | 설명 |
|---|---|
| `response` | 오류 응답에 사용할 문자열 또는 객체입니다. |
| `status` | HTTP 상태 코드입니다. |
| `options` | 오류 원인(`cause`) 등의 추가 정보를 지정할 수 있습니다. |

### 4.2. 문자열 응답

```typescript
throw new HttpException(
  'Access denied',
  HttpStatus.FORBIDDEN,
);
```

기본 처리 결과는 다음과 같습니다.

```json
{
  "statusCode": 403,
  "message": "Access denied"
}
```

### 4.3. 객체 응답

오류 응답 구조를 직접 지정할 수도 있습니다.

```typescript
throw new HttpException(
  {
    statusCode: 403,
    errorCode: 'ACCESS_DENIED',
    message: 'Access denied',
  },
  HttpStatus.FORBIDDEN,
);
```

이 경우 지정한 객체를 HTTP 응답 본문으로 사용할 수 있습니다.

```json
{
  "statusCode": 403,
  "errorCode": "ACCESS_DENIED",
  "message": "Access denied"
}
```

단, `HttpException`에 객체를 전달하는 방식은 해당 예외의 응답 데이터를 직접 지정하는 것입니다.

모든 예외 응답을 일관된 구조로 관리해야 한다면 Exception Filter에서 공통 응답 정책을 구현하는 방식을 고려할 수 있습니다.

### 4.4. getStatus()와 getResponse()

`HttpException`은 다음과 같은 주요 메서드를 제공합니다.

| 메서드 | 설명 |
|---|---|
| `getStatus()` | 예외에 설정된 HTTP 상태 코드를 반환합니다. |
| `getResponse()` | 예외에 설정된 응답 데이터를 반환합니다. |

예를 들어 다음과 같이 사용할 수 있습니다.

```typescript
const exception = new HttpException(
  'Invalid request',
  HttpStatus.BAD_REQUEST,
);

console.log(exception.getStatus());
console.log(exception.getResponse());
```

결과는 다음과 같습니다.

```text
400
Invalid request
```

이 두 메서드는 사용자 정의 Exception Filter에서 예외의 상태 코드와 응답 내용을 가져올 때 자주 사용합니다.

---

## 5. NestJS 내장 HTTP Exception

NestJS는 자주 사용하는 HTTP 오류에 대응하는 예외 클래스를 제공합니다.

이러한 클래스는 `HttpException`을 상속합니다.

대표적인 예외는 다음과 같습니다.

| Exception | HTTP Status | 주요 사용 사례 |
|---|---|---|
| `BadRequestException` | 400 | 잘못된 요청 데이터 |
| `UnauthorizedException` | 401 | 인증 실패 |
| `ForbiddenException` | 403 | 접근 권한 부족 |
| `NotFoundException` | 404 | 리소스가 존재하지 않음 |
| `MethodNotAllowedException` | 405 | 허용되지 않은 HTTP Method |
| `NotAcceptableException` | 406 | 요청한 응답 형식을 제공할 수 없음 |
| `RequestTimeoutException` | 408 | 요청 처리 시간 초과 |
| `ConflictException` | 409 | 리소스 상태 충돌 |
| `GoneException` | 410 | 더 이상 제공되지 않는 리소스 |
| `PayloadTooLargeException` | 413 | 요청 본문 크기 제한 초과 |
| `UnsupportedMediaTypeException` | 415 | 지원하지 않는 Content-Type |
| `UnprocessableEntityException` | 422 | 의미적으로 처리할 수 없는 요청 |
| `InternalServerErrorException` | 500 | 내부 서버 오류 |
| `NotImplementedException` | 501 | 구현되지 않은 기능 |
| `BadGatewayException` | 502 | 상위 서버 또는 외부 서비스 응답 오류 |
| `ServiceUnavailableException` | 503 | 서비스 이용 불가 |
| `GatewayTimeoutException` | 504 | 상위 서버 응답 시간 초과 |

### 5.1. 내장 Exception 사용 예제

```typescript
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

// 잘못된 요청 데이터
throw new BadRequestException('Invalid input');

// 리소스가 존재하지 않는 경우
throw new NotFoundException('User not found');

// 리소스 상태 충돌
throw new ConflictException('Email already exists');
```

내장 Exception을 사용하면 직접 HTTP 상태 코드를 지정하지 않아도 됩니다.

따라서 일반적인 HTTP API에서는 `HttpException`을 직접 생성하기보다 의미에 맞는 내장 Exception을 사용하는 것이 적합합니다.

---

## 6. ExceptionFilter 인터페이스

사용자 정의 Exception Filter는 `ExceptionFilter` 인터페이스를 구현하여 작성합니다.

### 6.1. ExceptionFilter 구조

```typescript
export interface ExceptionFilter<T = any> {
  catch(
    exception: T,
    host: ArgumentsHost,
  ): any;
}
```

주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 설명 |
|---|---|
| `ExceptionFilter` | Exception Filter 구현을 위한 인터페이스입니다. |
| `catch()` | 포착한 예외를 처리하는 메서드입니다. |
| `exception` | 현재 발생한 예외 객체입니다. |
| `ArgumentsHost` | 예외가 발생한 실행 환경의 인자에 접근할 수 있도록 합니다. |
| `T` | 처리할 예외의 타입입니다. |

`catch()`에서는 예외 정보를 확인하고, 필요한 로그를 기록하거나 클라이언트에 오류 응답을 생성할 수 있습니다.

### 6.2. 기본 Exception Filter 구현

다음은 `HttpException`을 처리하는 가장 기본적인 사용자 정의 Exception Filter입니다.

**http-exception.filter.ts**

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';

import type {
  Request,
  Response,
} from 'express';

@Catch(HttpException)
export class HttpExceptionFilter
  implements ExceptionFilter<HttpException>
{
  catch(
    exception: HttpException,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

위 예제에서는 다음 작업을 수행합니다.

1. `@Catch(HttpException)`을 통해 처리할 예외 유형을 지정합니다.
2. `catch()` 메서드에서 발생한 예외를 전달받습니다.
3. `ArgumentsHost`에서 HTTP Request와 Response 객체를 가져옵니다.
4. `exception.getStatus()`로 HTTP 상태 코드를 확인합니다.
5. 오류 응답 객체를 생성합니다.
6. 클라이언트에 HTTP 응답을 반환합니다.

이 예제는 Express Adapter를 기준으로 작성했습니다.

Fastify Adapter를 사용하는 경우에는 해당 플랫폼의 Response 인터페이스와 응답 메서드를 사용해야 합니다.

---

## 7. @Catch() 데코레이터

`@Catch()`는 Exception Filter가 처리할 예외의 유형을 지정하는 데코레이터입니다.

### 7.1. 특정 Exception 처리

```typescript
@Catch(NotFoundException)
export class NotFoundExceptionFilter
  implements ExceptionFilter<NotFoundException>
{
  catch(
    exception: NotFoundException,
    host: ArgumentsHost,
  ): void {
    // 예외 처리
  }
}
```

위 Filter는 `NotFoundException` 유형의 예외를 처리하도록 설정됩니다.

### 7.2. 여러 Exception 처리

하나의 Filter에서 여러 예외 유형을 처리할 수도 있습니다.

```typescript
@Catch(
  BadRequestException,
  UnauthorizedException,
)
export class ClientExceptionFilter
  implements ExceptionFilter<HttpException>
{
  catch(
    exception: HttpException,
    host: ArgumentsHost,
  ): void {
    // 예외 처리
  }
}
```

이 방식은 서로 관련된 여러 예외에 동일한 처리 정책을 적용할 때 사용할 수 있습니다.

### 7.3. 모든 Exception 처리

`@Catch()`에 인자를 전달하지 않으면 처리되지 않은 모든 유형의 예외를 대상으로 하는 Catch-all Filter를 정의할 수 있습니다.

```typescript
@Catch()
export class AllExceptionsFilter
  implements ExceptionFilter
{
  catch(
    exception: unknown,
    host: ArgumentsHost,
  ): void {
    // 모든 유형의 예외 처리
  }
}
```

이 방식에서는 `HttpException`뿐 아니라 일반적인 JavaScript `Error`도 처리 대상이 됩니다.

따라서 Exception 객체의 타입을 확인한 후 HTTP 상태 코드와 응답 내용을 결정해야 합니다.

---

## 8. ArgumentsHost

`ArgumentsHost`는 예외가 발생한 실행 환경에서 전달된 인자에 접근할 수 있도록 제공하는 NestJS 인터페이스입니다.

HTTP, WebSocket, RPC 등 다양한 실행 환경에서 사용할 수 있습니다.

### 8.1. 주요 메서드

| 메서드 | 설명 |
|---|---|
| `switchToHttp()` | HTTP 실행 환경의 인자에 접근합니다. |
| `switchToWs()` | WebSocket 실행 환경의 인자에 접근합니다. |
| `switchToRpc()` | RPC 실행 환경의 인자에 접근합니다. |
| `getType()` | 현재 실행 환경의 유형을 반환합니다. |
| `getArgs()` | 현재 실행 환경의 인자 배열을 반환합니다. |
| `getArgByIndex()` | 지정된 인덱스의 인자를 반환합니다. |

### 8.2. HTTP Request 및 Response 접근

```typescript
catch(
  exception: HttpException,
  host: ArgumentsHost,
): void {
  const ctx = host.switchToHttp();

  const request = ctx.getRequest<Request>();
  const response = ctx.getResponse<Response>();

  console.log(request.method);
  console.log(request.url);
}
```

이 방식을 사용하면 예외가 발생한 요청의 Method, URL 및 Header 등의 정보를 확인할 수 있습니다.

### 8.3. ArgumentsHost와 ExecutionContext의 차이

`ExecutionContext`는 `ArgumentsHost`를 확장한 인터페이스입니다.

| 항목 | ArgumentsHost | ExecutionContext |
|---|---|---|
| 주요 목적 | 실행 환경의 인자 접근 | 실행 환경 및 Handler 정보 접근 |
| HTTP Request 접근 | 지원 | 지원 |
| WebSocket Context 접근 | 지원 | 지원 |
| RPC Context 접근 | 지원 | 지원 |
| `getClass()` | 제공하지 않음 | 지원 |
| `getHandler()` | 제공하지 않음 | 지원 |
| 주요 사용처 | Exception Filter | Guard, Interceptor |

Exception Filter의 `catch()` 메서드에는 `ArgumentsHost`가 전달됩니다.

따라서 Guard나 Interceptor에서처럼 `getHandler()` 또는 `getClass()`를 직접 호출할 수는 없습니다.

자세한 내용은 `execution-context.md` 문서에서 다룹니다.

---

## 9. Exception Filter 적용 범위

NestJS에서는 Exception Filter를 다음 세 가지 범위로 등록할 수 있습니다.

1. Global Filter
2. Controller-scoped Filter
3. Method-scoped Filter

### 9.1. Method-scoped Filter

특정 Route Handler에만 Filter를 적용할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  UseFilters,
  NotFoundException,
} from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

@Controller('users')
export class UsersController {
  @Get(':id')
  @UseFilters(HttpExceptionFilter)
  findOne() {
    throw new NotFoundException('User not found');
  }
}
```

위 예제에서는 `findOne()` Handler에서 발생한 `HttpException`을 `HttpExceptionFilter`가 처리하도록 설정합니다.

### 9.2. Controller-scoped Filter

Controller 클래스에 `@UseFilters()`를 적용하면 해당 Controller의 Route Handler에서 발생한 예외를 처리할 수 있습니다.

```typescript
@Controller('users')
@UseFilters(HttpExceptionFilter)
export class UsersController {
  @Get()
  findAll() {
    return [];
  }

  @Get(':id')
  findOne() {
    throw new NotFoundException('User not found');
  }
}
```

### 9.3. Global Filter

애플리케이션 전체에 Exception Filter를 적용하려면 `main.ts`에서 `useGlobalFilters()`를 사용할 수 있습니다.

```typescript
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(
    new HttpExceptionFilter(),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

이 방식에서는 HTTP 요청 처리 과정에서 발생한 예외를 전역적으로 처리할 수 있습니다.

다만 `new HttpExceptionFilter()`로 직접 인스턴스를 생성하므로 NestJS DI Container를 통한 생성자 주입을 사용할 수 없습니다.

또한 위 예제의 `HttpExceptionFilter`는 `HttpException`만 처리하도록 선언되어 있으므로, 모든 예외 유형을 처리하는 것은 아닙니다.

### 9.4. APP_FILTER를 이용한 전역 등록

Dependency Injection이 필요한 Global Filter는 `APP_FILTER` 토큰을 사용하여 등록할 수 있습니다.

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { HttpExceptionFilter } from './http-exception.filter';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

이 방식에서는 NestJS DI Container가 Exception Filter 인스턴스를 생성하고 관리합니다.

`APP_FILTER`로 등록된 Filter는 해당 Module에만 국한되지 않고 애플리케이션 전체에 적용됩니다.

---

## 10. Exception Filter의 실행 순서

Exception Filter는 다른 Request Lifecycle 구성 요소와 실행 순서가 다릅니다.

Guard, Interceptor의 사전 처리, Pipe 등은 일반적으로 Global 범위에서 시작하여 Controller와 Method 범위로 진행합니다.

반면 Exception Filter는 가장 구체적인 범위부터 검사합니다.

### 10.1. Exception Filter의 우선순위

```text
Unhandled Exception
        │
        ▼
 Method-scoped Filter
        │
        ▼
Controller-scoped Filter
        │
        ▼
    Global Filter
```

위 흐름은 Filter의 우선순위를 개념적으로 표현한 것입니다.

**각 Filter가 예외를 순차적으로 전달받는다는 의미는 아닙니다.**

NestJS는 예외 유형과 등록 범위를 기준으로 처리할 Filter를 선택합니다.

일치하는 Filter가 예외를 처리하면 동일한 예외를 상위 범위의 다른 Filter에 다시 전달하지 않습니다.

### 10.2. 예외를 처리한 후 다음 Filter가 실행되는가?

예를 들어 다음과 같이 Filter가 등록되어 있다고 가정합니다.

```typescript
@Controller('users')
@UseFilters(ControllerExceptionFilter)
export class UsersController {
  @Get()
  @UseFilters(MethodExceptionFilter)
  findAll() {
    throw new NotFoundException();
  }
}
```

이때 `MethodExceptionFilter`가 해당 예외를 처리하면 `ControllerExceptionFilter`가 동일한 예외를 다시 처리하지 않습니다.

즉, 다음과 같은 실행 흐름은 지원되지 않습니다.

```text
Method Filter
     │
     ▼
Controller Filter
     │
     ▼
Global Filter
```

모든 Filter가 하나의 예외를 순차적으로 처리하는 구조로 이해해서는 안 됩니다.

여러 예외 처리 정책을 조합해야 한다면 공통 로직을 별도의 Provider로 분리하거나 Filter 상속을 통해 기능을 재사용하는 방식을 고려할 수 있습니다.

### 10.3. Middleware에서 발생한 예외

Middleware는 Route Handler가 선택되기 전에 실행됩니다.

따라서 Middleware에서 발생한 예외에는 Controller 또는 Method 범위의 Exception Filter가 적용되지 않습니다.

NestJS의 Exception Layer로 전달된 Middleware 예외는 Global Exception Filter를 통해 처리할 수 있습니다.

이러한 특성 때문에 Middleware에서 발생하는 예외까지 공통 처리해야 한다면 Global Exception Filter를 사용하는 것이 적합합니다.

---

## 11. 모든 예외를 처리하는 Global Exception Filter

실무에서는 애플리케이션 전체의 오류 응답 형식을 통일하기 위해 Catch-all Exception Filter를 구현할 수 있습니다.

### 11.1. 공통 오류 응답 구조

다음과 같은 응답 형식을 정의한다고 가정합니다.

```json
{
  "statusCode": 404,
  "message": "User not found",
  "timestamp": "2026-11-20T16:00:00.000Z",
  "path": "/users/1"
}
```

각 필드의 역할은 다음과 같습니다.

| 필드 | 설명 |
|---|---|
| `statusCode` | HTTP 상태 코드입니다. |
| `message` | 클라이언트에 전달할 오류 메시지입니다. |
| `timestamp` | 오류 응답을 생성한 시각입니다. |
| `path` | 요청 URL입니다. |

### 11.2. Catch-all Exception Filter 구현

다음 예제에서는 Express와 Fastify에 대한 종속성을 줄이기 위해 `HttpAdapterHost`를 사용합니다.

**all-exceptions.filter.ts**

```typescript
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';

import { HttpAdapterHost } from '@nestjs/core';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  catch(
    exception: unknown,
    host: ArgumentsHost,
  ): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? this.getExceptionMessage(exception)
        : 'Internal server error';

    const responseBody = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    if (
      status >= HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      this.logger.error(
        'Unhandled server error',
        exception instanceof Error
          ? exception.stack
          : String(exception),
      );
    }

    httpAdapter.reply(
      ctx.getResponse(),
      responseBody,
      status,
    );
  }

  private getExceptionMessage(
    exception: HttpException,
  ): string | string[] {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const message = response.message;

      if (
        typeof message === 'string' ||
        (
          Array.isArray(message) &&
          message.every(
            (item) => typeof item === 'string',
          )
        )
      ) {
        return message;
      }
    }

    return exception.message;
  }
}
```

위 예제에서는 다음과 같은 처리를 수행합니다.

1. `@Catch()`를 사용하여 모든 유형의 예외를 대상으로 설정합니다.
2. `HttpException`인지 확인합니다.
3. HTTP 예외라면 해당 상태 코드를 사용합니다.
4. 일반적인 예외라면 HTTP 500을 사용합니다.
5. 내부 서버 오류는 로그로 기록합니다.
6. 공통 오류 응답 객체를 생성합니다.
7. HTTP Adapter를 통해 응답을 반환합니다.

`HttpAdapterHost`를 활용하면 Express의 `response.json()`이나 Fastify의 `response.send()`를 직접 호출하지 않고 응답을 처리할 수 있습니다.

다만 이 예제는 HTTP 요청 처리에 사용하도록 작성했습니다.

WebSocket 및 RPC 예외 처리에 그대로 적용하는 것은 적합하지 않습니다.

또한 실제 운영 환경에서는 응답이 이미 전송되었는지 확인하는 처리와 로그에 포함되는 민감 정보에 대한 보호 정책을 추가로 고려해야 합니다.

---

## 12. BaseExceptionFilter

NestJS는 기본 예외 처리 기능을 재사용할 수 있도록 `BaseExceptionFilter`를 제공합니다.

`BaseExceptionFilter`는 `@nestjs/core` 패키지에서 가져올 수 있습니다.

### 12.1. BaseExceptionFilter 상속

기본 Exception Filter의 동작을 유지하면서 일부 처리만 확장해야 하는 경우에 사용할 수 있습니다.

**all-exceptions.filter.ts**

```typescript
import {
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';

import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(
    exception: unknown,
    host: ArgumentsHost,
  ): void {
    if (exception instanceof Error) {
      this.logger.error(
        exception.message,
        exception.stack,
      );
    }

    super.catch(exception, host);
  }
}
```

위 예제는 오류를 기록한 다음 `BaseExceptionFilter`의 기본 처리 기능을 호출합니다.

### 12.2. super.catch()

`super.catch()`는 부모 클래스인 `BaseExceptionFilter`의 예외 처리 기능을 호출합니다.

```typescript
super.catch(exception, host);
```

이를 통해 기본 Exception Layer가 제공하는 응답 생성 기능을 재사용할 수 있습니다.

### 12.3. Global Filter 등록

`BaseExceptionFilter`를 상속한 클래스를 수동으로 전역 등록할 경우 HTTP Adapter를 전달할 수 있습니다.

**main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const { httpAdapter } = app.get(HttpAdapterHost);

  app.useGlobalFilters(
    new AllExceptionsFilter(httpAdapter),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

또는 `APP_FILTER`를 사용하여 DI Container에 등록할 수도 있습니다.

Method 또는 Controller 범위에서 `BaseExceptionFilter`를 상속한 Filter를 사용하는 경우에는 `new`로 직접 생성하지 않고 프레임워크가 생성하도록 등록하는 것이 권장됩니다.

---

## 13. Custom Exception

NestJS의 내장 Exception으로 표현하기 어려운 오류는 사용자 정의 Exception으로 구현할 수 있습니다.

HTTP 기반 애플리케이션에서는 `HttpException`을 상속하여 Custom Exception을 생성할 수 있습니다.

### 13.1. 사용자 정의 Exception 구현

**resource-not-found.exception.ts**

```typescript
import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export class ResourceNotFoundException extends HttpException {
  constructor(
    resource: string,
    id: string | number,
  ) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'RESOURCE_NOT_FOUND',
        message: `${resource} ${id} not found`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
```

### 13.2. Service에서 사용

```typescript
import { Injectable } from '@nestjs/common';

import { ResourceNotFoundException } from './resource-not-found.exception';

@Injectable()
export class UsersService {
  findOne(id: number) {
    const user = null;

    if (!user) {
      throw new ResourceNotFoundException(
        'User',
        id,
      );
    }

    return user;
  }
}
```

이 예제는 예외 발생 방식을 설명하기 위해 사용자 조회 결과를 `null`로 고정했습니다.

실제 구현에서는 Repository 또는 데이터베이스 조회 결과에 따라 예외를 발생시킬 수 있습니다.

### 13.3. 오류 응답

```json
{
  "statusCode": 404,
  "errorCode": "RESOURCE_NOT_FOUND",
  "message": "User 1 not found"
}
```

위 응답은 해당 Custom Exception을 NestJS의 기본 Exception Layer가 처리했을 때의 형태입니다.

전역 Exception Filter에서 응답 구조를 새로 생성하도록 구현했다면 `errorCode` 등의 사용자 정의 필드를 별도로 보존해야 합니다.

---

## 14. Exception Filter와 Dependency Injection

Exception Filter는 다른 NestJS Provider를 주입받아 사용할 수 있습니다.

예를 들어 LoggerService, 오류 추적 서비스 또는 Request Context 관리 서비스를 주입받을 수 있습니다.

### 14.1. LoggerService 구현

**exception-logger.service.ts**

```typescript
import {
  Injectable,
  Logger,
} from '@nestjs/common';

@Injectable()
export class ExceptionLoggerService {
  private readonly logger = new Logger(
    ExceptionLoggerService.name,
  );

  log(
    message: string,
    stack?: string,
  ): void {
    this.logger.error(message, stack);
  }
}
```

### 14.2. Exception Filter에 Service 주입

```typescript
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  Injectable,
} from '@nestjs/common';

import type { Response } from 'express';

import { ExceptionLoggerService } from './exception-logger.service';

@Injectable()
@Catch(HttpException)
export class HttpExceptionFilter
  implements ExceptionFilter<HttpException>
{
  constructor(
    private readonly exceptionLogger: ExceptionLoggerService,
  ) {}

  catch(
    exception: HttpException,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    this.exceptionLogger.log(exception.message);

    response.status(status).json({
      statusCode: status,
      message: exception.message,
    });
  }
}
```

### 14.3. Module에 등록

```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { HttpExceptionFilter } from './http-exception.filter';
import { ExceptionLoggerService } from './exception-logger.service';

@Module({
  providers: [
    ExceptionLoggerService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

위 구성에서는 NestJS DI Container가 `HttpExceptionFilter`에 필요한 `ExceptionLoggerService`를 주입합니다.

이처럼 공통 예외 처리와 로깅 기능을 분리하면 Exception Filter의 책임을 명확하게 유지할 수 있습니다.

---

## 15. Exception Filter와 Interceptor의 차이

Exception Filter와 Interceptor는 모두 오류 처리에 관여할 수 있지만 역할이 다릅니다.

| 항목 | Exception Filter | Interceptor |
|---|---|---|
| 주요 목적 | 처리되지 않은 예외 처리 | Handler 실행 전후 처리 |
| 주요 메서드 | `catch()` | `intercept()` |
| 정상 요청 시 실행 | 일반적으로 실행되지 않음 | 적용된 경우 실행 |
| 오류 처리 | 예외를 포착하여 응답 생성 | RxJS 오류 변환 및 복구 가능 |
| 응답 변환 | 오류 응답 생성 | 정상 응답 및 오류 흐름 변환 |
| ExecutionContext | 직접 전달되지 않음 | 제공 |
| ArgumentsHost | 제공 | ExecutionContext를 통해 관련 기능 제공 |
| 대표 활용 | 공통 오류 응답, 예외 로깅 | 응답 변환, 캐싱, Timeout |

### 15.1. Interceptor에서 오류를 처리하는 경우

Interceptor는 RxJS의 `catchError()`를 통해 오류를 가공할 수 있습니다.

```typescript
return next.handle().pipe(
  catchError((error: unknown) => {
    return throwError(() => error);
  }),
);
```

위 예제에서는 오류를 다시 전달하므로 후속 예외 처리 계층에서 해당 오류를 처리할 수 있습니다.

반면 다음과 같이 정상 값을 반환하면 오류를 복구할 수 있습니다.

```typescript
return next.handle().pipe(
  catchError(() => {
    return of({
      message: 'Fallback response',
    });
  }),
);
```

이 경우 오류가 정상적인 Observable 결과로 대체되므로 해당 오류에 대해 Exception Filter가 실행되지 않을 수 있습니다.

### 15.2. Exception Filter가 적합한 경우

Exception Filter는 다음과 같은 기능에 적합합니다.

- 공통 오류 응답 형식 생성
- 예외별 HTTP 상태 코드 적용
- 처리되지 않은 예외의 로깅
- 내부 오류 정보 보호
- 오류 응답에 Request ID 추가

반면 특정 작업 실패 시 대체 데이터를 반환하거나 Observable 처리 과정에서 오류를 복구해야 한다면 Interceptor가 적합할 수 있습니다.

---

## 16. HTTP, WebSocket, Microservices의 예외 처리

NestJS는 HTTP뿐 아니라 WebSocket과 Microservices를 지원합니다.

각 실행 환경에서는 예외를 표현하는 클래스와 Exception Filter의 구현 방식이 달라질 수 있습니다.

### 16.1. HTTP

HTTP 환경에서는 주로 `HttpException`과 이를 상속한 예외를 사용합니다.

```typescript
throw new NotFoundException('User not found');
```

이 경우 HTTP 상태 코드와 오류 응답을 생성합니다.

### 16.2. WebSocket

WebSocket 환경에서는 `WsException`을 사용할 수 있습니다.

```typescript
import { WsException } from '@nestjs/websockets';

throw new WsException('Invalid message');
```

WebSocket의 Exception Filter는 HTTP 응답 객체를 통해 상태 코드를 반환하는 방식과 다릅니다.

Socket.IO 또는 사용하는 WebSocket Adapter에 따라 오류 이벤트 및 예외 처리 방식이 달라질 수 있습니다.

또한 HTTP 애플리케이션에 등록한 Global Exception Filter가 WebSocket Gateway에 자동으로 적용되는 것은 아닙니다.

WebSocket 전용 예외 처리가 필요한 경우에는 해당 실행 환경에 맞는 Filter를 등록해야 합니다.

### 16.3. Microservices

Microservices 환경에서는 `RpcException`을 사용할 수 있습니다.

```typescript
import { RpcException } from '@nestjs/microservices';

throw new RpcException('Resource unavailable');
```

RPC Exception Filter는 메시지 기반 통신에서 발생한 오류를 처리하도록 설계됩니다.

반환 형식과 오류 전달 방식은 사용하는 Transport에 따라 달라질 수 있습니다.

### 16.4. 실행 환경별 비교

| 항목 | HTTP | WebSocket | Microservices |
|---|---|---|---|
| 대표 예외 | `HttpException` | `WsException` | `RpcException` |
| 주요 처리 대상 | HTTP Request | WebSocket 메시지 | RPC 메시지 |
| 결과 전달 | HTTP 오류 응답 | Socket 오류 처리 | RPC 오류 전달 |
| 주요 기반 클래스 | `BaseExceptionFilter` | `BaseWsExceptionFilter` | `BaseRpcExceptionFilter` |

여러 전송 방식을 함께 사용하는 애플리케이션에서는 예외 처리 정책을 실행 환경별로 구분하여 설계하는 것이 적합합니다.

---

## 17. 실무 활용 시 고려사항

### 17.1. 공통 오류 응답 구조 정의

API마다 서로 다른 오류 응답 형식을 사용하면 클라이언트에서 오류를 처리하기 어려워질 수 있습니다.

따라서 다음과 같은 공통 오류 응답 구조를 정의할 수 있습니다.

```json
{
  "statusCode": 400,
  "errorCode": "INVALID_REQUEST",
  "message": "Invalid request data",
  "timestamp": "2026-11-20T16:00:00.000Z",
  "path": "/users"
}
```

단, 공통 오류 응답 구조를 적용할 때 기존 Custom Exception의 추가 정보를 누락하지 않도록 주의해야 합니다.

### 17.2. HTTP 상태 코드와 비즈니스 오류 코드 분리

HTTP 상태 코드는 요청 처리 결과의 일반적인 의미를 나타냅니다.

반면 비즈니스 오류 코드는 애플리케이션에서 정의한 구체적인 오류 유형을 나타낼 수 있습니다.

예를 들어 다음과 같이 구분할 수 있습니다.

| HTTP Status | Error Code | 설명 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 잘못된 요청 데이터 |
| 401 | `AUTHENTICATION_FAILED` | 인증 실패 |
| 403 | `ACCESS_DENIED` | 접근 권한 부족 |
| 404 | `USER_NOT_FOUND` | 사용자가 존재하지 않음 |
| 409 | `DUPLICATE_EMAIL` | 이메일 중복 |
| 500 | `INTERNAL_ERROR` | 내부 서버 오류 |

위 오류 코드는 NestJS에 내장된 값이 아니라 애플리케이션에서 정의한 예시입니다.

### 17.3. 민감 정보 노출 방지

운영 환경에서 내부 예외 메시지나 Stack Trace를 그대로 반환하면 보안상 문제가 발생할 수 있습니다.

특히 다음과 같은 정보가 외부에 노출되지 않도록 주의해야 합니다.

- 데이터베이스 연결 문자열
- 인증 토큰과 비밀번호
- 서버 내부 파일 경로
- SQL Query 및 내부 테이블 정보
- 내부 API 주소
- Stack Trace의 상세 정보

예외의 상세 내용은 서버 로그 또는 오류 모니터링 시스템에 기록하고, 클라이언트에는 필요한 정보만 반환하는 것이 적합합니다.

### 17.4. Exception Filter에서 비즈니스 로직 최소화

Exception Filter는 예외를 최종적으로 처리하는 역할에 집중해야 합니다.

복잡한 도메인 정책이나 데이터베이스 갱신 로직을 Exception Filter에 배치하면 책임이 불명확해질 수 있습니다.

예외를 발생시킬지 판단하는 로직은 Service나 Guard 등 적절한 계층에 배치하고, Exception Filter는 해당 예외를 응답으로 변환하는 역할에 집중하는 것이 좋습니다.

### 17.5. 중복 로깅 방지

Service, Interceptor, Exception Filter에서 동일한 오류를 모두 기록하면 중복 로그가 발생할 수 있습니다.

따라서 예외 로깅의 책임을 명확하게 정의하는 것이 중요합니다.

예를 들어 다음과 같은 정책을 사용할 수 있습니다.

- Service: 오류 원인을 파악하는 데 필요한 도메인 정보 기록
- Interceptor: 요청 처리 시간 및 흐름 기록
- Exception Filter: 처리되지 않은 예외에 대한 최종 오류 기록

오류의 중요도에 따라 로그 레벨을 구분하는 것도 필요합니다.

### 17.6. Request ID와 오류 추적

분산 환경에서는 요청마다 Request ID 또는 Trace ID를 부여하여 오류 발생 지점을 추적할 수 있습니다.

예를 들어 다음과 같은 응답 구조를 사용할 수 있습니다.

```json
{
  "statusCode": 500,
  "errorCode": "INTERNAL_ERROR",
  "message": "Internal server error",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Request ID를 Middleware에서 생성하고, Exception Filter에서 해당 값을 오류 응답에 포함하도록 설계할 수 있습니다.

다만 실제 분산 추적을 위해서는 서비스 간 Context 전파와 로그의 상관관계 설정이 추가로 필요합니다.

### 17.7. 이미 전송된 HTTP 응답

HTTP 응답 Header 또는 Body가 이미 전송된 상태라면 새로운 오류 응답을 생성할 수 없습니다.

따라서 Stream이나 파일 다운로드처럼 응답 전송이 시작된 이후에도 오류가 발생할 수 있는 기능에서는 별도의 처리 전략이 필요합니다.

`BaseExceptionFilter`를 상속하여 기본 처리 방식을 재사용하면 이러한 상황에 대한 NestJS의 기본 대응을 활용할 수 있습니다.

사용자 정의 Catch-all Filter를 직접 구현하는 경우에는 HTTP Adapter의 응답 완료 여부 확인 기능 등을 고려해야 합니다.

### 17.8. 오류 모니터링과 Exception Filter

Exception Filter는 클라이언트에 전달할 오류 응답을 결정하는 역할을 수행합니다.

하지만 오류가 얼마나 자주 발생하는지, 어떤 배포 버전에서 증가했는지, 어떤 요청과 연관되어 있는지 등을 분석하려면 별도의 관측 가능성(Observability) 체계가 필요합니다.

실제 운영 환경에서는 다음 기능을 함께 고려할 수 있습니다.

- Structured Logging
- Distributed Tracing
- Error Monitoring
- Metrics
- Alerting

Exception Filter와 오류 모니터링 시스템은 서로 대체하는 관계가 아니라 보완하는 관계입니다.

---

## 18. Exception Filter 사용 시 주의사항

### 18.1. 모든 예외가 HttpException은 아님

일반적인 JavaScript `Error`, 외부 라이브러리 예외 또는 데이터베이스 오류 등은 `HttpException`이 아닐 수 있습니다.

따라서 Catch-all Filter에서는 `instanceof HttpException` 등의 타입 검사를 수행해야 합니다.

### 18.2. Filter 간 예외 전달은 지원되지 않음

Method Filter가 예외를 처리한 뒤 Controller Filter와 Global Filter가 동일한 예외를 순차적으로 처리하는 구조는 지원되지 않습니다.

여러 공통 처리 기능이 필요하다면 Filter 상속 또는 별도 Provider를 통한 기능 재사용을 고려해야 합니다.

### 18.3. 예외 처리 시점 구분

Exception Filter는 처리되지 않은 예외가 발생했을 때 실행됩니다.

Service나 Controller에서 `try/catch`로 이미 처리한 예외는 다시 발생시키지 않는 한 Exception Filter로 전달되지 않습니다.

### 18.4. HTTP Adapter 의존성

Express의 `response.status().json()`을 사용하는 코드는 Express Adapter에 종속됩니다.

Fastify 등 다른 HTTP Adapter를 사용하는 경우에는 해당 플랫폼의 응답 API를 사용해야 합니다.

플랫폼 독립성이 필요한 경우에는 `HttpAdapterHost`를 활용할 수 있습니다.

### 18.5. 모든 오류를 HTTP 500으로 변환하지 않음

Validation 오류, 인증 오류, 리소스 미존재 오류 등을 모두 HTTP 500으로 처리하면 클라이언트가 오류 원인을 구분하기 어려워집니다.

가능하면 기존 `HttpException`의 상태 코드를 유지하고, 알 수 없는 서버 오류에 대해서만 적절한 5xx 응답을 사용하는 것이 좋습니다.

### 18.6. 전역 Filter의 적용 범위

HTTP 애플리케이션의 Global Exception Filter가 WebSocket Gateway와 Microservices에 동일하게 적용된다고 가정해서는 안 됩니다.

각 실행 환경에 맞는 Exception Filter와 등록 정책을 구성해야 합니다.

### 18.7. 프레임워크 기본 Exception 로깅

NestJS의 기본 Exception Filter는 `HttpException`과 같은 내장 예외를 일반적인 애플리케이션 흐름의 일부로 취급하여 기본적으로 로그를 기록하지 않습니다.

NestJS는 이러한 예외를 구분하기 위해 `IntrinsicException` 기반의 예외 계층을 사용합니다.

따라서 HTTP 400 또는 404와 같은 예외도 기록해야 한다면 사용자 정의 Exception Filter에서 로깅 정책을 구현해야 합니다.

다만 모든 클라이언트 오류를 오류 레벨로 기록하면 불필요한 로그가 증가할 수 있으므로 로그 레벨과 기록 범위를 적절하게 구분해야 합니다.

---

## 19. 핵심 정리

Exception Filter는 NestJS Request Lifecycle에서 처리되지 않은 예외를 포착하고 클라이언트에 오류 응답을 생성하는 구성 요소입니다.

핵심 특징은 다음과 같습니다.

1. **예외 처리 계층:** NestJS는 기본 Exception Layer를 제공하므로 별도의 Filter 없이도 일반적인 HTTP 예외를 처리할 수 있습니다.
2. **HttpException:** HTTP 오류를 표현하기 위한 기본 예외 클래스를 제공합니다.
3. **내장 Exception:** `BadRequestException`, `UnauthorizedException`, `NotFoundException` 등 자주 사용하는 HTTP 예외를 제공합니다.
4. **ExceptionFilter:** `catch()` 메서드를 구현하여 사용자 정의 Exception Filter를 생성합니다.
5. **@Catch():** 처리할 예외 유형을 지정하며, 인자 없이 선언하면 모든 유형의 예외를 대상으로 설정할 수 있습니다.
6. **ArgumentsHost:** 예외가 발생한 실행 환경의 요청 및 응답 객체 등에 접근할 수 있습니다.
7. **적용 범위:** Global, Controller 및 Method 단위로 등록할 수 있습니다.
8. **실행 우선순위:** Method, Controller, Global 순서로 적절한 Filter를 선택하며, 동일한 예외를 여러 Filter에 순차적으로 전달하지 않습니다.
9. **Dependency Injection:** `APP_FILTER`를 통해 전역 등록하면 다른 Provider를 주입받을 수 있습니다.
10. **BaseExceptionFilter:** NestJS의 기본 예외 처리 기능을 상속하고 확장할 수 있습니다.
11. **공통 오류 응답:** HTTP 상태 코드, 오류 코드, 메시지, 요청 정보 등을 일관된 구조로 반환할 수 있습니다.
12. **전송 계층 구분:** HTTP, WebSocket 및 Microservices 환경에 따라 예외 클래스와 Filter의 구현 방식이 달라집니다.

Exception Filter의 핵심은 **애플리케이션에서 처리되지 않은 예외를 최종적으로 관리하고, 클라이언트에 전달할 오류 응답을 일관된 정책에 따라 생성하는 것**입니다.

따라서 Guard에서는 요청의 접근 권한을 판단하고, Pipe에서는 입력값을 검증하며, Service에서는 비즈니스 규칙에 따라 예외를 발생시키고, Exception Filter에서는 이러한 예외를 최종 응답으로 변환하는 방식으로 책임을 구분하는 것이 적합합니다.

---

## 참고 자료

- [NestJS 공식 문서 - Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS 공식 문서 - Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [NestJS 공식 문서 - Execution Context](https://docs.nestjs.com/fundamentals/execution-context)
- [NestJS 공식 문서 - Middleware](https://docs.nestjs.com/middleware)
- [NestJS 공식 문서 - Guards](https://docs.nestjs.com/guards)
- [NestJS 공식 문서 - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS 공식 문서 - Pipes](https://docs.nestjs.com/pipes)
- [NestJS 공식 문서 - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS 공식 문서 - HTTP Adapter](https://docs.nestjs.com/faq/http-adapter)
- [NestJS 공식 문서 - WebSocket Exception Filters](https://docs.nestjs.com/websockets/exception-filters)
- [NestJS 공식 문서 - Microservices Exception Filters](https://docs.nestjs.com/microservices/exception-filters)
- [NestJS 공식 문서 - Logging](https://docs.nestjs.com/techniques/logger)
- [MDN - HTTP Response Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)