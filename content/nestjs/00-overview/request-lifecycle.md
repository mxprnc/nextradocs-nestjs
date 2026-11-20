# NestJS Request Lifecycle

## 1. Request Lifecycle 개요

NestJS의 Request Lifecycle은 클라이언트의 요청이 애플리케이션에 진입한 시점부터 처리 과정을 거쳐 최종 응답으로 반환되기까지의 전체 흐름을 의미합니다.

NestJS는 요청 처리 과정에서 여러 구성 요소를 활용하여 공통 관심사를 분리합니다.

- **Middleware:** 요청이 Route Handler에 도달하기 전에 공통 로직을 실행합니다.
- **Guard:** 요청을 처리할 수 있는지 판단합니다.
- **Interceptor:** 요청과 응답을 가로채 추가 로직을 실행합니다.
- **Pipe:** 입력값을 변환하거나 유효성을 검증합니다.
- **Controller:** 요청을 수신하고 적절한 처리 로직을 호출합니다.
- **Provider:** 비즈니스 로직과 애플리케이션 기능을 수행합니다.
- **Exception Filter:** 처리 과정에서 발생한 예외를 처리합니다.

각 구성 요소는 정해진 실행 순서와 책임을 가지며, 이를 통해 인증, 인가, 입력 검증, 로깅, 응답 변환 및 예외 처리 등을 비즈니스 로직과 분리할 수 있습니다.

## 2. 전체 요청 처리 흐름

NestJS의 일반적인 HTTP 요청 처리 순서는 다음과 같습니다.

```text
                    Incoming Request
                           │
                           ▼
                    ┌────────────┐
                    │ Middleware │
                    └─────┬──────┘
                          │
                          ▼
                    ┌────────────┐
                    │   Guards   │
                    └─────┬──────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │   Interceptors  │
                 │  (Before Route) │
                 └────────┬────────┘
                          │
                          ▼
                    ┌────────────┐
                    │    Pipes   │
                    └─────┬──────┘
                          │
                          ▼
                    ┌────────────┐
                    │ Controller │
                    └─────┬──────┘
                          │
                          ▼
                    ┌────────────┐
                    │  Provider  │
                    └─────┬──────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │   Interceptors  │
                 │  (After Route)  │
                 └────────┬────────┘
                          │
                          ▼
                    Server Response
```

예외가 발생하면 일반적인 응답 처리 흐름 대신 Exception Filter를 통한 예외 처리 흐름으로 전환됩니다.

```text
       Middleware / Guard / Interceptor
                    / Pipe
                     │
                     ▼
              Controller / Provider
                     │
                     │ Uncaught Exception
                     ▼
             ┌──────────────────┐
             │ Exception Filter │
             └────────┬─────────┘
                      │
                      ▼
                Error Response
```

위 흐름은 일반적인 HTTP 요청을 기준으로 표현한 것입니다. 실제 실행 순서는 구성 요소의 등록 범위와 요청 처리 중 발생하는 예외에 따라 달라질 수 있습니다.

## 3. Middleware

### 3.1. 역할

Middleware는 요청이 Route Handler에 도달하기 전에 실행되는 함수 또는 클래스입니다.

NestJS의 Middleware는 기본적으로 Express Middleware와 유사한 방식으로 동작하며, Request와 Response 객체 및 다음 Middleware를 호출하기 위한 `next()` 함수에 접근할 수 있습니다.

주요 역할은 다음과 같습니다.

- 요청 및 응답 객체 접근
- 요청 데이터의 사전 처리
- 로깅 및 요청 추적
- 공통 헤더 설정
- 요청 처리 흐름 제어

Middleware는 다음과 같은 방식으로 구현할 수 있습니다.

- Function Middleware
- Class Middleware

### 3.2. 실행 순서

Middleware는 등록된 순서에 따라 순차적으로 실행됩니다.

일반적으로 다음 순서를 따릅니다.

1. Global Middleware
2. Module-bound Middleware

Global Middleware는 `app.use()`를 통해 등록할 수 있습니다.

```typescript
const app = await NestFactory.create(AppModule);

app.use(logger);

await app.listen(3000);
```

Module에 등록하는 Middleware는 `NestModule` 인터페이스와 `MiddlewareConsumer`를 사용합니다.

```typescript
import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
  }
}
```

여러 Module에 Middleware가 등록된 경우에는 Global Module, Root Module, 그리고 Root Module로부터의 Module Import Graph상 거리에 따라 실행 순서가 결정됩니다.

### 3.3. 요청 처리 흐름 제어

Middleware는 `next()`를 호출하여 다음 Middleware로 제어를 전달합니다.

```typescript
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.url}`);

    next();
  }
}
```

현재 Middleware가 요청-응답 사이클을 종료하지 않는다면 다음 Middleware로 제어를 전달해야 합니다.

`next()`를 호출하지 않고 응답도 종료하지 않으면 요청이 완료되지 않고 대기 상태에 머무를 수 있습니다.

### 3.4. 활용 사례

| 활용 사례 | 설명 |
|---|---|
| Request Logging | 요청 Method, URL 및 요청 시각 등을 기록합니다. |
| Request Tracking | 요청별 Trace ID 또는 Correlation ID를 설정합니다. |
| Header Processing | 공통 요청 Header를 확인하거나 응답 Header를 설정합니다. |
| Request Preprocessing | 요청 데이터를 사전에 처리합니다. |

Middleware는 특정 Route Handler의 실행 여부나 메타데이터를 판단하는 기능보다는 요청 전반에 적용되는 공통 처리에 적합합니다.

## 4. Guard

### 4.1. 역할

Guard는 현재 요청을 특정 Route Handler가 처리해도 되는지 판단하는 구성 요소입니다.

`CanActivate` 인터페이스를 구현하며, `canActivate()` 메서드의 반환값을 기준으로 요청의 진행 여부를 결정합니다.

주요 활용 목적은 다음과 같습니다.

- Authentication
- Authorization
- Role-based Access Control
- Permission 검증
- 접근 정책 검사

Middleware와 달리 Guard는 `ExecutionContext`에 접근할 수 있습니다.

이를 통해 현재 실행될 Controller와 Route Handler에 대한 정보를 확인하고, 해당 요청에 적합한 접근 제어 로직을 수행할 수 있습니다.

### 4.2. 구현 예제

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    return Boolean(request.headers.authorization);
  }
}
```

`canActivate()`가 `true`를 반환하면 다음 처리 단계로 진행하고, `false`를 반환하면 요청 처리가 거부됩니다.

또한 `Promise` 또는 RxJS `Observable`을 반환하여 비동기 검증도 수행할 수 있습니다.

### 4.3. 실행 순서

Guard는 다음 순서로 실행됩니다.

1. Global Guards
2. Controller Guards
3. Route Guards

```typescript
@UseGuards(Guard1, Guard2)
@Controller('users')
export class UsersController {
  @UseGuards(Guard3)
  @Get()
  findAll() {
    return [];
  }
}
```

위 코드에서는 다음 순서로 Guard가 실행됩니다.

```text
Guard1 → Guard2 → Guard3
```

### 4.4. 활용 사례

| 활용 사례 | 설명 |
|---|---|
| Authentication | 사용자의 인증 상태를 확인합니다. |
| Authorization | 사용자의 권한에 따라 접근을 허용하거나 거부합니다. |
| Role Validation | 사용자 Role을 확인합니다. |
| Permission Validation | 특정 리소스에 대한 접근 권한을 확인합니다. |

Guard는 요청을 처리할 수 있는지 판단하는 역할을 담당하며, 인증 및 인가 정책을 구현할 때 주로 사용합니다.

## 5. Interceptor

### 5.1. 역할

Interceptor는 요청 처리 전후에 추가 로직을 실행할 수 있도록 요청과 응답을 가로채는 구성 요소입니다.

NestJS의 Interceptor는 `NestInterceptor` 인터페이스를 구현하며, `intercept()` 메서드에서 요청 처리 전후의 동작을 정의합니다.

주요 활용 목적은 다음과 같습니다.

- 요청 및 응답 로깅
- 응답 데이터 변환
- 응답 데이터 캐싱
- 실행 시간 측정
- 예외 및 오류 처리
- 비즈니스 로직 실행 전후의 공통 처리

### 5.2. 구현 예제

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const now = Date.now();

    console.log('Before Handler');

    return next.handle().pipe(
      tap(() => {
        console.log(`After Handler: ${Date.now() - now}ms`);
      }),
    );
  }
}
```

Interceptor는 `next.handle()`을 호출하여 다음 처리 단계로 진행합니다.

`next.handle()`은 Route Handler의 실행 결과를 RxJS `Observable` 형태로 반환합니다.

따라서 Observable Operator를 활용하여 요청 처리 전후에 필요한 작업을 수행할 수 있습니다.

### 5.3. 실행 순서

Interceptor는 다음 순서로 실행됩니다.

**요청 진입 방향**

1. Global Interceptors
2. Controller Interceptors
3. Route Interceptors

**응답 반환 방향**

1. Route Interceptors
2. Controller Interceptors
3. Global Interceptors

이는 Interceptor가 RxJS Observable을 반환하고, 중첩된 Observable 처리 구조를 가지기 때문입니다.

```text
Request
   │
   ▼
Global Interceptor
   │ Before
   ▼
Controller Interceptor
   │ Before
   ▼
Route Interceptor
   │ Before
   ▼
Controller / Provider
   │
   ▼
Route Interceptor
   │ After
   ▼
Controller Interceptor
   │ After
   ▼
Global Interceptor
   │ After
   ▼
Response
```

즉, 요청이 진입할 때는 Global에서 Route 방향으로 실행되고, 응답이 반환될 때는 Route에서 Global 방향으로 실행됩니다.

### 5.4. 활용 사례

| 활용 사례 | 설명 |
|---|---|
| Logging | 요청 처리 전후의 정보를 기록합니다. |
| Response Transformation | 반환 데이터를 공통 응답 형식으로 변환합니다. |
| Performance Monitoring | Route Handler의 실행 시간을 측정합니다. |
| Caching | 요청 결과를 캐싱하고 재사용합니다. |
| Error Handling | Observable의 `catchError()` 등을 활용하여 오류를 처리합니다. |

Interceptor는 요청 처리 전후의 공통 로직을 구현할 때 적합합니다.

## 6. Pipe

### 6.1. 역할

Pipe는 Controller의 Route Handler에 전달되는 입력 데이터를 변환하거나 유효성을 검증하는 구성 요소입니다.

NestJS의 Pipe는 `PipeTransform` 인터페이스를 구현하며, `transform()` 메서드에서 입력 데이터를 처리합니다.

주요 역할은 다음과 같습니다.

- 입력 데이터 변환
- 입력 데이터 유효성 검증
- 잘못된 요청 데이터에 대한 예외 발생
- Controller에 전달되는 데이터의 타입 및 형식 관리

### 6.2. 구현 예제

```typescript
import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata): number {
    const parsedValue = parseInt(value, 10);

    if (Number.isNaN(parsedValue)) {
      throw new BadRequestException('Invalid number');
    }

    return parsedValue;
  }
}
```

Pipe는 전달받은 입력값을 처리한 후 변환된 값을 반환합니다.

유효하지 않은 값이 전달되면 Exception을 발생시켜 이후 Controller 실행을 중단할 수 있습니다.

### 6.3. 기본 제공 Pipe

NestJS는 자주 사용하는 입력값 변환 및 검증을 위한 Built-in Pipe를 제공합니다.

| Pipe | 역할 |
|---|---|
| `ValidationPipe` | DTO 기반 입력 데이터 유효성을 검증합니다. |
| `ParseIntPipe` | 문자열을 정수로 변환합니다. |
| `ParseFloatPipe` | 문자열을 실수로 변환합니다. |
| `ParseBoolPipe` | 문자열을 Boolean으로 변환합니다. |
| `ParseArrayPipe` | 입력값을 배열로 변환하고 검증합니다. |
| `ParseUUIDPipe` | UUID 형식의 입력값을 검증합니다. |
| `ParseEnumPipe` | 입력값이 지정된 Enum에 포함되는지 검증합니다. |
| `DefaultValuePipe` | 입력값이 없을 때 기본값을 제공합니다. |

### 6.4. 실행 순서

Pipe는 다음 범위에 등록할 수 있습니다.

1. Global Pipes
2. Controller Pipes
3. Route Pipes
4. Route Parameter Pipes

Global, Controller, Route 범위의 Pipe는 해당 범위에 등록된 순서대로 실행됩니다.

다만 하나의 Route Handler에 여러 Parameter가 존재하고 각각 Pipe가 적용되는 경우에는 Parameter의 마지막 항목부터 첫 번째 항목 순서로 처리됩니다.

예를 들어 다음과 같은 Controller가 있다고 가정합니다.

```typescript
@UsePipes(GeneralValidationPipe)
@Controller('cats')
export class CatsController {
  @UsePipes(RouteSpecificPipe)
  @Patch(':id')
  updateCat(
    @Body() body: UpdateCatDto,
    @Param() params: UpdateCatParams,
    @Query() query: UpdateCatQuery,
  ) {
    return this.catsService.updateCat(body, params, query);
  }
}
```

Parameter별 처리 순서는 다음과 같습니다.

```text
Query
  ↓
Params
  ↓
Body
```

이 순서는 Global, Controller, Route 및 Parameter 범위의 Pipe 적용 관계를 이해할 때 고려해야 합니다.

### 6.5. 활용 사례

| 활용 사례 | 설명 |
|---|---|
| Input Validation | DTO를 기반으로 입력 데이터의 유효성을 검증합니다. |
| Type Conversion | 문자열을 숫자나 Boolean 등으로 변환합니다. |
| Default Value | 입력값이 없는 경우 기본값을 설정합니다. |
| Format Validation | UUID, Enum 등 지정된 형식을 검증합니다. |

Pipe는 Controller에 전달되는 입력 데이터를 안전하고 일관된 형태로 관리하는 데 사용합니다.

## 7. Controller와 Provider

### 7.1. Controller

Controller는 Guard, Interceptor 및 Pipe의 처리를 거친 요청을 최종적으로 전달받아 Route Handler를 실행합니다.

Controller의 주요 역할은 다음과 같습니다.

- HTTP 요청 처리
- Route 정의
- 요청 Parameter 및 Body 전달받기
- Provider 호출
- 처리 결과 반환

```typescript
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}
```

Controller는 요청 처리와 응답 반환에 집중하며, 복잡한 비즈니스 로직은 Provider에 위임하는 것이 권장됩니다.

### 7.2. Provider

Provider는 실제 비즈니스 로직과 애플리케이션 기능을 수행합니다.

Controller에서 호출한 Service는 데이터베이스 접근, 비즈니스 규칙 적용 및 외부 시스템 연동 등의 작업을 수행할 수 있습니다.

```typescript
@Injectable()
export class UsersService {
  findOne(id: number) {
    return {
      id,
      name: 'Alice',
    };
  }
}
```

Controller와 Provider의 역할을 분리하면 요청 처리 방식과 비즈니스 로직을 독립적으로 관리할 수 있습니다.

## 8. Exception Filter

### 8.1. 역할

Exception Filter는 요청 처리 과정에서 발생한 예외를 처리하고 적절한 응답을 반환하는 구성 요소입니다.

NestJS는 예외 처리를 위한 기본 Exception Layer를 제공하며, 애플리케이션에서 처리되지 않은 예외는 해당 계층에서 처리됩니다.

Exception Filter는 `ExceptionFilter` 인터페이스를 구현하며, `catch()` 메서드에서 예외 처리 로직을 정의합니다.

주요 역할은 다음과 같습니다.

- 예외 유형에 따른 응답 구성
- HTTP Status Code 설정
- 예외 메시지 및 응답 형식 표준화
- 예외 로그 기록
- 애플리케이션 내부 오류 정보 노출 방지

### 8.2. 구현 예제

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}
```

위 예제는 `HttpException`을 대상으로 예외를 처리하는 Custom Exception Filter입니다.

`ArgumentsHost`를 사용하면 현재 실행 중인 Context에 접근할 수 있으며, HTTP Context에서는 Request와 Response 객체를 가져올 수 있습니다.

### 8.3. 실행 순서

Exception Filter는 다른 요청 처리 구성 요소와 달리 Global에서 Route 방향으로 실행되지 않습니다.

가장 구체적인 범위에 등록된 Filter부터 예외 처리 기회를 가집니다.

1. Route Exception Filters
2. Controller Exception Filters
3. Global Exception Filters

예를 들어 Route 수준의 Exception Filter가 예외를 처리하면 동일한 예외가 Controller 또는 Global Exception Filter로 전달되지 않습니다.

```text
          Uncaught Exception
                  │
                  ▼
          Route Exception Filter
                  │
          ┌───────┴────────┐
          │                │
       Handled         Not Handled
          │                │
          ▼                ▼
      Error Response  Controller Filter
                           │
                    ┌──────┴──────┐
                    │             │
                 Handled      Not Handled
                    │             │
                    ▼             ▼
                Response     Global Filter
```

NestJS의 Exception Filter는 예외를 Filter 간에 자동으로 전달하는 체인이 아닙니다. 특정 Filter가 예외를 처리하면 이후 범위의 Filter는 해당 예외를 처리하지 않습니다.

### 8.4. 예외 발생 시 주의 사항

Exception Filter는 처리되지 않은 예외(Uncaught Exception)가 발생했을 때 실행됩니다.

따라서 다음과 같이 예외를 직접 처리한 경우에는 Exception Filter가 실행되지 않습니다.

```typescript
try {
  await this.usersService.findOne(id);
} catch (error) {
  console.error(error);
}
```

반면 예외를 다시 발생시키거나 처리하지 않고 상위 처리 계층으로 전달하면 NestJS의 예외 처리 메커니즘이 동작합니다.

또한 Middleware에서 발생한 예외는 Route Handler가 선택되기 전에 발생하므로 Global Exception Filter만 적용됩니다.

## 9. Global, Controller, Route 범위

NestJS의 Middleware, Guard, Interceptor, Pipe 및 Exception Filter는 적용 범위에 따라 등록할 수 있습니다.

일반적으로 다음 세 가지 범위로 구분합니다.

| 범위 | 설명 | 등록 방법 |
|---|---|---|
| Global | 애플리케이션 전체에 적용합니다. | `app.useGlobalGuards()` 등 |
| Controller | 특정 Controller의 모든 Route에 적용합니다. | `@UseGuards()` 등 |
| Route | 특정 Route Handler에만 적용합니다. | `@UseGuards()` 등 |

예를 들어 Guard를 등록하는 경우 다음과 같이 구성할 수 있습니다.

**Global**

```typescript
app.useGlobalGuards(new AuthGuard());
```

**Controller**

```typescript
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {}
```

**Route**

```typescript
@Controller('users')
export class UsersController {
  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return [];
  }
}
```

Global 범위의 구성 요소는 `APP_GUARD`, `APP_INTERCEPTOR`, `APP_PIPE`, `APP_FILTER`와 같은 Custom Provider Token을 사용하여 Module의 Provider로 등록할 수도 있습니다.

이 방식은 해당 구성 요소에 Dependency Injection이 필요한 경우 유용합니다.

Middleware는 다른 구성 요소와 등록 방식이 다르며, `app.use()` 또는 Module의 `configure()`를 통해 등록합니다.

## 10. 요청 처리 구성 요소의 실행 순서

각 구성 요소의 등록 범위와 실행 순서를 종합하면 다음과 같습니다.

| 순서 | 구성 요소 | 실행 범위 및 순서 |
|---|---|---|
| 1 | Middleware | Global → Module |
| 2 | Guard | Global → Controller → Route |
| 3 | Interceptor (요청 진입) | Global → Controller → Route |
| 4 | Pipe | Global → Controller → Route → Parameter |
| 5 | Controller | Route Handler 실행 |
| 6 | Provider | Controller에서 호출하는 경우 실행 |
| 7 | Interceptor (응답 반환) | Route → Controller → Global |
| 8 | Exception Filter | Route → Controller → Global |

위 표에서 Exception Filter는 정상적인 요청 처리 단계가 아닙니다. 처리되지 않은 예외가 발생했을 때 실행되는 별도의 예외 처리 경로입니다.

또한 Provider는 NestJS가 요청 처리 단계에서 일괄 실행하는 구성 요소가 아닙니다. Controller 또는 다른 Provider가 호출하는 시점에 해당 로직이 실행됩니다.

### 10.1. 실행 순서 요약

```text
Incoming Request
       │
       ▼
   Middleware
       │
       ▼
     Guards
       │
       ▼
  Interceptors
    (Before)
       │
       ▼
     Pipes
       │
       ▼
   Controller
       │
       ▼
    Provider
       │
       ▼
  Interceptors
     (After)
       │
       ▼
     Response


Exception 발생 시

       │
       ▼
 Uncaught Exception
       │
       ▼
 Route Exception Filter
       │
       ▼
 Controller Exception Filter
       │
       ▼
 Global Exception Filter
       │
       ▼
   Error Response
```

## 11. Request Lifecycle과 Application Lifecycle의 차이

NestJS에서 Request Lifecycle과 Application Lifecycle은 서로 다른 개념입니다.

**Request Lifecycle**은 개별 요청이 애플리케이션에 진입하고 응답으로 반환되기까지의 처리 과정입니다.

반면 **Application Lifecycle**은 애플리케이션이 시작되고 종료되는 과정에서 발생하는 생명주기입니다.

Application Lifecycle에서는 다음과 같은 Lifecycle Hook을 사용할 수 있습니다.

| Lifecycle Hook | 설명 |
|---|---|
| `onModuleInit()` | Host Module의 의존성이 해결된 후 호출됩니다. |
| `onApplicationBootstrap()` | 모든 Module이 초기화된 후, 연결을 수신하기 전에 호출됩니다. |
| `onModuleDestroy()` | 애플리케이션 종료 신호를 받은 후 호출됩니다. |
| `beforeApplicationShutdown()` | Module 종료 Hook이 완료된 후 호출됩니다. |
| `onApplicationShutdown()` | 연결 종료 이후 마지막 단계에서 호출됩니다. |

종료 관련 Hook은 일반적으로 `app.close()`를 호출하거나, 운영체제 종료 신호에 대응하도록 Shutdown Hooks를 활성화했을 때 실행됩니다.

두 생명주기의 차이는 다음과 같습니다.

| 구분 | Request Lifecycle | Application Lifecycle |
|---|---|---|
| 대상 | 개별 요청 | 애플리케이션 전체 |
| 시작 | Incoming Request | 애플리케이션 초기화 |
| 종료 | Response 반환 | 애플리케이션 종료 |
| 주요 구성 요소 | Middleware, Guard, Interceptor, Pipe 등 | Lifecycle Hooks |
| 주요 목적 | 요청 처리 및 응답 생성 | 초기화 및 종료 작업 관리 |

Application Lifecycle의 상세 내용은 `08-deployment/graceful-shutdown.md` 및 관련 문서에서 다룹니다.

## 12. 정리

NestJS의 Request Lifecycle은 요청 처리 과정에서 각 구성 요소가 명확한 책임을 가지고 순서에 따라 동작하도록 설계되어 있습니다.

- Middleware는 요청 전처리와 공통 요청 처리를 담당합니다.
- Guard는 요청의 접근 가능 여부를 판단합니다.
- Interceptor는 요청과 응답을 가로채 전후 처리 로직을 수행합니다.
- Pipe는 입력 데이터의 변환과 유효성 검증을 담당합니다.
- Controller는 요청을 처리할 Route Handler를 실행합니다.
- Provider는 비즈니스 로직과 애플리케이션 기능을 수행합니다.
- Exception Filter는 처리되지 않은 예외를 처리합니다.

특히 다음 세 가지 사항을 이해하는 것이 중요합니다.

1. Guard는 Middleware 이후, Interceptor와 Pipe 이전에 실행됩니다.
2. Interceptor는 요청 진입 시 Global에서 Route 순서로 실행되지만, 응답 반환 시 Route에서 Global 순서로 실행됩니다.
3. Exception Filter는 정상적인 요청 처리 흐름과 별도로 동작하며, 가장 구체적인 범위의 Filter부터 예외를 처리합니다.

이러한 실행 구조를 이해하면 인증, 인가, 입력 검증, 로깅, 응답 변환 및 예외 처리 등을 적절한 구성 요소에 배치할 수 있습니다.

## 참고 자료

### NestJS 공식 문서

- [Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [Middleware](https://docs.nestjs.com/middleware)
- [Guards](https://docs.nestjs.com/guards)
- [Interceptors](https://docs.nestjs.com/interceptors)
- [Pipes](https://docs.nestjs.com/pipes)
- [Exception Filters](https://docs.nestjs.com/exception-filters)
- [Execution Context](https://docs.nestjs.com/fundamentals/execution-context)
- [Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)

### 관련 문서

- [introduction.md](./introduction.md)
- [architecture.md](./architecture.md)
- [project-structure.md](./project-structure.md)

### 관련 학습 영역

- `02-request-lifecycle/`: Middleware, Guards, Interceptors, Pipes 및 Exception Filters의 상세 구현
- `01-fundamentals/`: Provider, Dependency Injection 및 Injection Scopes
- `08-deployment/`: 애플리케이션 초기화, 종료 및 Graceful Shutdown