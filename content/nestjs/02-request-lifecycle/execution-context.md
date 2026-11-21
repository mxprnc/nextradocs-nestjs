# Execution Context

## 1. 개요

Execution Context는 NestJS에서 현재 실행 중인 요청 처리 환경과 실행 대상 Handler에 관한 정보를 제공하는 추상화 인터페이스입니다.

NestJS는 HTTP, WebSocket, Microservices 등 다양한 통신 방식을 지원합니다. 각 통신 방식은 요청을 처리하는 구조와 Handler에 전달되는 인자가 서로 다릅니다.

Execution Context는 이러한 차이를 추상화하여 Guard, Interceptor 등의 구성 요소가 현재 실행 환경과 Handler의 정보를 일관된 방식으로 확인할 수 있도록 합니다.

대표적인 활용 사례는 다음과 같습니다.

- 현재 요청의 실행 환경 식별
- HTTP Request 및 Response 객체 접근
- WebSocket Client 및 메시지 데이터 접근
- RPC 메시지 및 Transport Context 접근
- 현재 실행될 Controller와 Handler 확인
- Handler에 설정된 Custom Metadata 조회
- Controller 단위의 접근 정책 확인
- 사용자 역할(Role) 및 권한(Permission) 검사
- Handler별 Logging 또는 Monitoring 정책 적용
- 여러 전송 방식을 지원하는 공통 Guard 및 Interceptor 구현

Execution Context의 핵심적인 역할은 **현재 어떤 Handler가 어떤 실행 환경에서 호출되는지 확인할 수 있도록 필요한 정보를 제공하는 것**입니다.

이를 통해 NestJS의 공통 구성 요소를 특정 HTTP Route에 종속시키지 않고 구현할 수 있습니다.

---

## 2. Request Lifecycle에서 Execution Context의 역할

NestJS는 요청을 처리하는 과정에서 Middleware, Guard, Interceptor, Pipe 등의 구성 요소를 실행합니다.

일반적인 HTTP 요청 처리 순서는 다음과 같습니다.

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

Execution Context는 위 흐름에서 독립적인 실행 단계로 존재하지 않습니다.

대신 NestJS가 Guard나 Interceptor를 실행할 때 현재 요청과 Handler에 관한 정보를 전달하기 위한 객체로 사용됩니다.

### 2.1. Execution Context의 사용 위치

```text
HTTP Request
     │
     ▼
   Middleware
     │
     ▼
    Guard
     │
     ├── ExecutionContext
     │      ├── getType()
     │      ├── getClass()
     │      ├── getHandler()
     │      └── switchToHttp()
     │
     ▼
  Interceptor
     │
     ├── ExecutionContext
     │      ├── getType()
     │      ├── getClass()
     │      ├── getHandler()
     │      └── switchToHttp()
     │
     ▼
     Pipes
     │
     ▼
   Controller
```

Guard와 Interceptor는 각각 다음 메서드를 통해 Execution Context를 전달받습니다.

**Guard**

```typescript
canActivate(context: ExecutionContext): boolean {
  return true;
}
```

**Interceptor**

```typescript
intercept(
  context: ExecutionContext,
  next: CallHandler,
): Observable<unknown> {
  return next.handle();
}
```

두 구성 요소 모두 동일한 `ExecutionContext` 인터페이스를 사용합니다.

따라서 Guard와 Interceptor는 동일한 방식으로 현재 Handler의 메타데이터나 실행 환경에 접근할 수 있습니다.

다만 Exception Filter는 `ExecutionContext`가 아니라 `ArgumentsHost`를 전달받습니다.

---

## 3. ArgumentsHost

Execution Context를 이해하려면 먼저 `ArgumentsHost`의 개념을 알아야 합니다.

`ArgumentsHost`는 현재 Handler에 전달되는 인자들을 추상화한 인터페이스입니다.

NestJS는 HTTP, WebSocket, RPC 등 실행 환경마다 서로 다른 인자 구조를 사용합니다.

`ArgumentsHost`는 이러한 인자들에 공통적인 API로 접근할 수 있도록 합니다.

### 3.1. ArgumentsHost의 기본 구조

`ArgumentsHost`는 개념적으로 다음과 같은 인터페이스를 제공합니다.

```typescript
export interface ArgumentsHost {
  getArgs<T extends Array<any> = any[]>(): T;

  getArgByIndex<T = any>(index: number): T;

  switchToHttp(): HttpArgumentsHost;

  switchToWs(): WsArgumentsHost;

  switchToRpc(): RpcArgumentsHost;

  getType<TContext extends string = ContextType>(): TContext;
}
```

주요 메서드는 다음과 같습니다.

| 메서드 | 설명 |
|---|---|
| `getArgs()` | Handler에 전달되는 인자 배열을 반환합니다. |
| `getArgByIndex()` | 지정한 인덱스의 인자를 반환합니다. |
| `switchToHttp()` | HTTP 실행 환경의 인자에 접근합니다. |
| `switchToWs()` | WebSocket 실행 환경의 인자에 접근합니다. |
| `switchToRpc()` | RPC 실행 환경의 인자에 접근합니다. |
| `getType()` | 현재 실행 환경의 유형을 반환합니다. |

### 3.2. 실행 환경별 Handler 인자

각 실행 환경에서 Handler에 전달되는 인자 구조는 다음과 같이 다릅니다.

| 실행 환경 | 대표적인 인자 |
|---|---|
| HTTP (Express) | Request, Response, Next |
| WebSocket | Client, Message Data |
| RPC | Message Data, Transport Context |
| GraphQL | Root, Args, Context, Info |

예를 들어 Express 기반 HTTP 요청에서는 다음과 같은 인자 배열을 사용할 수 있습니다.

```typescript
const [request, response, next] = host.getArgs();
```

반면 GraphQL 환경에서는 서로 다른 인자 구조가 사용됩니다.

```typescript
const [root, args, context, info] = host.getArgs();
```

따라서 인덱스에 직접 의존하여 인자를 가져오면 특정 실행 환경에 종속될 수 있습니다.

NestJS 공식 문서에서는 가능한 경우 `switchToHttp()`, `switchToWs()`, `switchToRpc()`와 같은 전용 메서드를 사용하는 방식을 권장합니다.

---

## 4. ExecutionContext와 ArgumentsHost의 관계

`ExecutionContext`는 `ArgumentsHost`를 확장한 인터페이스입니다.

따라서 `ArgumentsHost`가 제공하는 모든 메서드를 사용할 수 있으며, 추가로 실행 대상 Controller와 Handler에 관한 정보를 제공합니다.

### 4.1. ExecutionContext 인터페이스

```typescript
import {
  ArgumentsHost,
  Type,
} from '@nestjs/common';

export interface ExecutionContext extends ArgumentsHost {
  getClass<T = any>(): Type<T>;

  getHandler(): Function;
}
```

위 코드는 핵심 구조를 설명하기 위한 것으로, 실제 NestJS의 타입 선언은 버전에 따라 세부적인 Generic 제약이 다를 수 있습니다.

Execution Context는 다음 두 기능을 추가로 제공합니다.

| 메서드 | 설명 |
|---|---|
| `getClass()` | 현재 Handler가 속한 Controller 또는 Gateway 등의 클래스 참조를 반환합니다. |
| `getHandler()` | 현재 실행 대상 Handler 함수의 참조를 반환합니다. |

### 4.2. 상속 관계

```text
       ArgumentsHost
             │
             ├── getArgs()
             ├── getArgByIndex()
             ├── getType()
             ├── switchToHttp()
             ├── switchToWs()
             └── switchToRpc()
             │
             ▼
       ExecutionContext
             │
             ├── getClass()
             └── getHandler()
```

Execution Context는 ArgumentsHost가 제공하는 실행 환경 인자 접근 기능에 Controller 및 Handler 식별 기능을 추가한 구조입니다.

### 4.3. 두 인터페이스의 차이

| 항목 | ArgumentsHost | ExecutionContext |
|---|---|---|
| 실행 환경 식별 | 지원 | 지원 |
| HTTP Request 접근 | 지원 | 지원 |
| WebSocket Client 접근 | 지원 | 지원 |
| RPC Context 접근 | 지원 | 지원 |
| Handler 인자 접근 | 지원 | 지원 |
| `getClass()` | 미지원 | 지원 |
| `getHandler()` | 미지원 | 지원 |
| 대표 사용처 | Exception Filter | Guard, Interceptor |

이 차이 때문에 Exception Filter에서는 `getClass()`나 `getHandler()`를 직접 사용할 수 없지만, Guard와 Interceptor에서는 해당 메서드를 사용할 수 있습니다.

---

## 5. getType()을 이용한 실행 환경 식별

`getType()`은 현재 Handler가 실행되는 애플리케이션 환경의 유형을 반환합니다.

NestJS는 기본적으로 다음과 같은 실행 환경을 지원합니다.

| 반환값 | 실행 환경 |
|---|---|
| `http` | HTTP 기반 요청 |
| `ws` | WebSocket 기반 요청 |
| `rpc` | Microservices 기반 요청 |
| `graphql` | GraphQL 기반 요청(별도 패키지에서 제공) |

### 5.1. 기본 사용법

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

@Injectable()
export class ContextTypeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const type = context.getType();

    console.log('Context type:', type);

    return true;
  }
}
```

HTTP Controller에 적용된 경우 다음과 같은 결과를 확인할 수 있습니다.

```text
Context type: http
```

### 5.2. 실행 환경별 분기 처리

하나의 Guard가 여러 실행 환경에서 사용될 경우 다음과 같이 분기할 수 있습니다.

```typescript
canActivate(context: ExecutionContext): boolean {
  const type = context.getType();

  switch (type) {
    case 'http':
      // HTTP 전용 검증
      return true;

    case 'ws':
      // WebSocket 전용 검증
      return true;

    case 'rpc':
      // RPC 전용 검증
      return true;

    default:
      return false;
  }
}
```

위 코드는 실행 환경별 분기 구조를 설명하기 위한 예제입니다.

실제 애플리케이션에서는 각 실행 환경에 맞는 인증 정보 추출 및 검증 로직을 구현해야 합니다.

### 5.3. GraphQL 실행 환경

GraphQL을 사용하는 경우에는 `@nestjs/graphql` 패키지에서 제공하는 `GqlContextType`을 사용할 수 있습니다.

```typescript
import { GqlContextType } from '@nestjs/graphql';

const type = context.getType<GqlContextType>();

if (type === 'graphql') {
  // GraphQL 실행 환경 처리
}
```

GraphQL은 별도의 실행 컨텍스트 변환 기능을 제공합니다.

이에 대해서는 이후 GraphQL 관련 절에서 설명합니다.

---

## 6. HTTP Execution Context

HTTP 기반 애플리케이션에서는 `switchToHttp()`를 사용하여 HTTP 요청과 응답 객체에 접근합니다.

### 6.1. HTTP Request 접근

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

import type { Request } from 'express';

@Injectable()
export class HttpContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request>();

    console.log(request.method);
    console.log(request.url);
    console.log(request.headers);

    return true;
  }
}
```

위 예제는 Express Adapter를 기준으로 작성했습니다.

### 6.2. HTTP Response 접근

HTTP Response 객체도 가져올 수 있습니다.

```typescript
import type {
  Request,
  Response,
} from 'express';

const httpContext = context.switchToHttp();

const request = httpContext.getRequest<Request>();
const response = httpContext.getResponse<Response>();
```

주요 메서드는 다음과 같습니다.

| 메서드 | 설명 |
|---|---|
| `getRequest()` | HTTP Request 객체를 반환합니다. |
| `getResponse()` | HTTP Response 객체를 반환합니다. |
| `getNext()` | HTTP Adapter에서 제공하는 다음 처리 함수에 접근합니다. |

### 6.3. HTTP Adapter에 따른 차이

NestJS는 Express와 Fastify를 지원합니다.

따라서 HTTP 실행 환경에 접근하는 방식은 동일하지만 반환되는 객체의 타입은 다를 수 있습니다.

Express 기반:

```typescript
import type { Request } from 'express';

const request = context
  .switchToHttp()
  .getRequest<Request>();
```

Fastify 기반:

```typescript
import type { FastifyRequest } from 'fastify';

const request = context
  .switchToHttp()
  .getRequest<FastifyRequest>();
```

`getRequest<T>()`의 Generic은 TypeScript에서 반환값의 타입을 지정하기 위한 것입니다.

이 Generic을 변경한다고 실제 HTTP Adapter나 런타임 Request 객체가 변환되는 것은 아닙니다.

---

## 7. WebSocket Execution Context

WebSocket 환경에서는 HTTP Request 대신 연결된 Client와 전달된 메시지 데이터에 접근하는 방식이 사용됩니다.

NestJS는 `switchToWs()`를 제공합니다.

### 7.1. 주요 메서드

```typescript
const wsContext = context.switchToWs();

const client = wsContext.getClient();
const data = wsContext.getData();
```

| 메서드 | 설명 |
|---|---|
| `getClient()` | 현재 메시지를 전달한 WebSocket Client를 반환합니다. |
| `getData()` | Handler에 전달되는 메시지 데이터를 반환합니다. |

### 7.2. WebSocket Guard 예제

다음은 Socket.IO Adapter를 사용하는 경우의 예제입니다.

**ws-auth.guard.ts**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  WsException,
} from '@nestjs/common';

import type { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context
      .switchToWs()
      .getClient<Socket>();

    const user = client.data.user;

    if (!user) {
      throw new WsException('Unauthorized');
    }

    return true;
  }
}
```

위 예제는 앞선 인증 과정에서 검증된 사용자 정보가 `client.data.user`에 설정되어 있다는 전제하에 작성했습니다.

`client.data.user`가 존재한다는 사실만으로 사용자가 인증되었다고 판단해서는 안 됩니다. 실제 인증 과정에서 토큰이나 세션 등을 검증하고 해당 값을 신뢰할 수 있는 방식으로 설정해야 합니다.

또한 `Socket` 타입은 Socket.IO를 기준으로 사용했으므로, `ws` Adapter에서는 해당 Adapter에 맞는 Client 타입을 사용해야 합니다.

### 7.3. WebSocket Gateway에 적용

```typescript
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';

import { UseGuards } from '@nestjs/common';
import { WsAuthGuard } from './ws-auth.guard';

@WebSocketGateway()
@UseGuards(WsAuthGuard)
export class EventsGateway {
  @SubscribeMessage('events')
  handleEvent(
    @MessageBody() data: unknown,
  ) {
    return data;
  }
}
```

위 예제에서는 `events` 메시지 Handler가 실행되기 전에 `WsAuthGuard`가 요청을 검사합니다.

WebSocket 환경에서는 메시지 Handler 실행을 위한 Context와 연결(Connection) 수명주기를 구분해야 합니다.

특히 `ExecutionContext` 자체가 WebSocket Client의 연결 상태나 세션 저장소를 관리하는 것은 아닙니다.

---

## 8. RPC Execution Context

NestJS Microservices에서는 `switchToRpc()`를 사용하여 RPC 메시지 데이터와 Transport Context에 접근할 수 있습니다.

### 8.1. 기본 사용법

```typescript
const rpcContext = context.switchToRpc();

const data = rpcContext.getData();
const transportContext = rpcContext.getContext();
```

| 메서드 | 설명 |
|---|---|
| `getData()` | 현재 RPC Handler에 전달되는 메시지 데이터를 반환합니다. |
| `getContext()` | 사용 중인 Transport에 해당하는 Context 객체를 반환합니다. |

### 8.2. RPC Guard 예제

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

@Injectable()
export class RpcContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const rpcContext = context.switchToRpc();

    const data = rpcContext.getData<unknown>();

    console.log('RPC Message:', data);

    return true;
  }
}
```

위 예제는 RPC 메시지 데이터 접근을 설명하기 위한 것입니다.

실제 인증 및 인가 기능은 사용 중인 Transport의 메시지 구조와 신뢰할 수 있는 인증 정보에 기반하여 구현해야 합니다.

### 8.3. Transport별 Context

Microservices에서는 Transport에 따라 Context 객체가 달라집니다.

예를 들어 다음과 같은 Context가 사용될 수 있습니다.

- Kafka: `KafkaContext`
- RabbitMQ: `RmqContext`
- MQTT: `MqttContext`
- Redis: `RedisContext`

각 Context는 메시지 메타데이터, Channel, Topic 또는 Transport별 정보를 제공할 수 있습니다.

따라서 RPC 실행 환경에서는 `getContext()`를 통해 실제 사용하는 Transport에 맞는 객체를 가져와야 합니다.

---

## 9. GraphQL Execution Context

NestJS에서 GraphQL을 사용하는 경우 일반적인 HTTP Controller와 다른 Handler 인자 구조가 사용됩니다.

GraphQL에서는 `GqlExecutionContext`를 사용하여 GraphQL 실행 환경에 접근할 수 있습니다.

이 기능은 `@nestjs/graphql` 패키지에서 제공합니다.

### 9.1. GqlExecutionContext

```typescript
import { GqlExecutionContext } from '@nestjs/graphql';

const gqlContext = GqlExecutionContext.create(context);
```

`GqlExecutionContext.create()`는 NestJS의 일반 Execution Context를 GraphQL 처리에 적합한 컨텍스트로 다룰 수 있도록 합니다.

### 9.2. 주요 메서드

```typescript
const gqlContext = GqlExecutionContext.create(context);

const root = gqlContext.getRoot();
const args = gqlContext.getArgs();
const ctx = gqlContext.getContext();
const info = gqlContext.getInfo();
```

| 메서드 | 설명 |
|---|---|
| `getRoot()` | GraphQL Root 또는 Parent 객체를 반환합니다. |
| `getArgs()` | GraphQL Resolver 인자를 반환합니다. |
| `getContext()` | GraphQL 요청 Context를 반환합니다. |
| `getInfo()` | GraphQL ResolveInfo 객체를 반환합니다. |

### 9.3. GraphQL Guard 예제

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const gqlContext = GqlExecutionContext.create(context);

    const graphqlContext = gqlContext.getContext<{
      req?: {
        user?: unknown;
      };
    }>();

    return Boolean(graphqlContext.req?.user);
  }
}
```

위 예제는 GraphQL Context에 인증된 사용자 정보가 포함되어 있다는 전제하에 작성했습니다.

GraphQL Context의 구조는 GraphQL Module 설정에 따라 달라집니다.

또한 Query, Mutation, Subscription에서 인증 정보를 전달하는 방식이 서로 다를 수 있으므로 실행 환경에 맞게 구현해야 합니다.

---

## 10. getClass()와 getHandler()

`ExecutionContext`에서 가장 중요한 메서드 중 하나는 `getClass()`와 `getHandler()`입니다.

두 메서드를 사용하면 현재 실행 대상 Controller와 Handler를 식별할 수 있습니다.

### 10.1. getClass()

`getClass()`는 현재 Handler가 속한 클래스의 참조를 반환합니다.

```typescript
const controller = context.getClass();

console.log(controller.name);
```

예를 들어 다음 Controller가 있다고 가정합니다.

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return [];
  }
}
```

`GET /users` 요청을 처리할 때 다음과 같은 정보를 확인할 수 있습니다.

```text
UsersController
```

반환값은 Controller의 인스턴스가 아니라 클래스 참조입니다.

### 10.2. getHandler()

`getHandler()`는 현재 실행 대상 Handler 함수의 참조를 반환합니다.

```typescript
const handler = context.getHandler();

console.log(handler.name);
```

앞선 Controller에서는 다음 값이 출력될 수 있습니다.

```text
findAll
```

### 10.3. 두 메서드의 비교

| 메서드 | 반환 대상 | 주요 활용 |
|---|---|---|
| `getClass()` | Controller 또는 Gateway 등의 클래스 참조 | 클래스 단위 메타데이터 조회 |
| `getHandler()` | 실행 대상 Handler 함수 참조 | Handler 단위 메타데이터 조회 |

### 10.4. Logging 활용 예제

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
export class HandlerLoggingInterceptor
  implements NestInterceptor
{
  private readonly logger = new Logger(
    HandlerLoggingInterceptor.name,
  );

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    const start = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const elapsed =
          Number(process.hrtime.bigint() - start) / 1_000_000;

        this.logger.log(
          `${className}.${handlerName} - ${elapsed.toFixed(2)}ms`,
        );
      }),
    );
  }
}
```

이 Interceptor는 현재 Handler의 이름과 Observable 처리 시간을 기록합니다.

예상 로그는 다음과 같습니다.

```text
UsersController.findAll - 12.35ms
```

`finalize()`는 Observable의 정상 완료, 오류 또는 구독 해제 시 실행됩니다.

따라서 이 값은 HTTP 응답의 실제 네트워크 전송 완료 시간이 아니라 Interceptor가 감싸는 Observable 처리 흐름을 기준으로 측정한 시간입니다.

---

## 11. Reflection과 Metadata

NestJS에서는 데코레이터를 사용하여 Controller나 Handler에 메타데이터를 추가할 수 있습니다.

메타데이터는 클래스 또는 메서드에 연결된 부가 정보입니다.

예를 들어 다음과 같은 정책을 선언할 수 있습니다.

- 특정 Handler에는 관리자 권한이 필요합니다.
- 특정 Handler는 인증 없이 접근할 수 있습니다.
- 특정 Handler는 별도의 Logging 정책을 사용합니다.
- 특정 Handler는 캐싱 대상에서 제외합니다.

이러한 정책을 구현할 때 `ExecutionContext`와 `Reflector`를 함께 사용합니다.

### 11.1. Metadata 적용 구조

```text
Controller / Handler
        │
        ▼
 Custom Decorator
        │
        ▼
   Metadata 저장
        │
        ▼
Guard / Interceptor
        │
        ▼
 ExecutionContext
        │
        ├── getClass()
        └── getHandler()
        │
        ▼
      Reflector
        │
        ▼
   Metadata 조회
        │
        ▼
    정책 적용
```

`ExecutionContext`가 메타데이터 자체를 저장하거나 조회하는 것은 아닙니다.

Execution Context는 메타데이터가 연결된 Controller 및 Handler의 참조를 제공하고, `Reflector`가 해당 대상의 메타데이터를 조회합니다.

---

## 12. Reflector

`Reflector`는 NestJS에서 메타데이터를 읽기 위해 제공하는 유틸리티 클래스입니다.

`@nestjs/core` 패키지에서 가져올 수 있습니다.

```typescript
import { Reflector } from '@nestjs/core';
```

대표적인 메서드는 다음과 같습니다.

| 메서드 | 설명 |
|---|---|
| `get()` | 특정 대상의 메타데이터를 조회합니다. |
| `getAll()` | 여러 대상의 메타데이터를 각각 조회합니다. |
| `getAllAndOverride()` | 여러 대상 중 우선순위가 높은 메타데이터를 선택합니다. |
| `getAllAndMerge()` | 여러 대상의 메타데이터를 병합합니다. |
| `Reflector.createDecorator()` | 타입이 지정된 사용자 정의 메타데이터 데코레이터를 생성합니다. |

### 12.1. @SetMetadata()를 이용한 데코레이터

다음은 Handler에 필요한 역할 정보를 저장하는 예제입니다.

**roles.decorator.ts**

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);
```

Controller:

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

import { Roles } from './roles.decorator';

@Controller('users')
export class UsersController {
  @Get('admin')
  @Roles('admin')
  getAdminUsers() {
    return [];
  }
}
```

`@Roles('admin')`은 `getAdminUsers()` Handler에 다음과 같은 메타데이터를 추가합니다.

```text
Metadata Key: roles
Metadata Value: ['admin']
```

이 데코레이터 자체가 사용자 권한을 검사하는 것은 아닙니다.

실제 접근 제어는 메타데이터를 읽는 Guard에서 수행합니다.

### 12.2. Reflector.get()

`get()`은 지정된 대상의 메타데이터를 조회합니다.

```typescript
const roles = this.reflector.get<string[]>(
  ROLES_KEY,
  context.getHandler(),
);
```

위 코드는 현재 Handler에 설정된 `roles` 메타데이터를 조회합니다.

반면 Controller 클래스의 메타데이터를 조회하려면 다음과 같이 사용합니다.

```typescript
const roles = this.reflector.get<string[]>(
  ROLES_KEY,
  context.getClass(),
);
```

`get()`은 지정한 대상의 메타데이터를 조회하므로 Handler와 Controller에 설정된 값을 자동으로 결합하지 않습니다.

---

## 13. getAllAndOverride()

`getAllAndOverride()`는 여러 대상의 메타데이터를 지정된 순서대로 조회하고, 처음 발견한 `undefined`가 아닌 값을 반환합니다.

Controller에 기본 정책을 설정하고 특정 Handler에서 정책을 재정의할 때 유용합니다.

### 13.1. 기본 사용법

```typescript
const roles = this.reflector.getAllAndOverride<string[]>(
  ROLES_KEY,
  [
    context.getHandler(),
    context.getClass(),
  ],
);
```

위 예제는 다음 순서로 메타데이터를 검색합니다.

1. Handler
2. Controller

Handler에 메타데이터가 존재하면 해당 값을 사용합니다.

Handler에 메타데이터가 없으면 Controller의 메타데이터를 사용합니다.

### 13.2. 예제

```typescript
@Controller('users')
@Roles('user')
export class UsersController {
  @Get()
  findAll() {
    return [];
  }

  @Get('admin')
  @Roles('admin')
  findAdmins() {
    return [];
  }
}
```

각 Handler에서 조회한 결과는 다음과 같습니다.

| Handler | Controller Metadata | Handler Metadata | 최종 결과 |
|---|---|---|---|
| `findAll()` | `['user']` | 없음 | `['user']` |
| `findAdmins()` | `['user']` | `['admin']` | `['admin']` |

`findAdmins()`에는 별도로 `admin` 역할이 설정되어 있으므로 Controller의 `user` 역할을 대체합니다.

이 방식은 Handler별로 상위 정책을 재정의해야 하는 경우에 적합합니다.

---

## 14. getAllAndMerge()

`getAllAndMerge()`는 여러 대상에 설정된 메타데이터를 병합합니다.

Controller와 Handler의 설정을 함께 적용해야 할 때 활용할 수 있습니다.

### 14.1. 기본 사용법

```typescript
const roles = this.reflector.getAllAndMerge<string[]>(
  ROLES_KEY,
  [
    context.getClass(),
    context.getHandler(),
  ],
);
```

위 코드는 Controller와 Handler에 설정된 역할 배열을 병합합니다.

### 14.2. 예제

```typescript
@Controller('users')
@Roles('user')
export class UsersController {
  @Get('admin')
  @Roles('admin')
  findAdmins() {
    return [];
  }
}
```

각 대상에 설정된 메타데이터는 다음과 같습니다.

```text
Controller: ['user']
Handler:    ['admin']
```

병합 결과는 다음과 같습니다.

```typescript
['user', 'admin']
```

### 14.3. Override와 Merge의 차이

| 항목 | getAllAndOverride() | getAllAndMerge() |
|---|---|---|
| 처리 방식 | 우선순위가 높은 값 선택 | 여러 값 병합 |
| 배열 처리 | 선택된 배열 반환 | 배열 병합 |
| 객체 처리 | 선택된 객체 반환 | 객체 병합 |
| 주요 사용 사례 | 정책 재정의 | 정책 결합 |

두 메서드 모두 전달한 대상 배열의 순서가 중요합니다.

특히 `getAllAndMerge()`에서 객체를 병합하는 경우 동일한 속성의 우선순위를 고려해야 합니다.

또한 메타데이터를 병합하는 것과 접근 권한을 판단하는 것은 서로 다른 작업입니다.

예를 들어 병합된 역할 배열이 다음과 같다고 가정합니다.

```typescript
['user', 'admin']
```

다음 코드는 둘 중 하나의 역할만 가지고 있어도 접근을 허용합니다.

```typescript
const allowed = roles.some((role) =>
  user.roles.includes(role),
);
```

반면 다음 코드는 모든 역할을 가지고 있어야 접근을 허용합니다.

```typescript
const allowed = roles.every((role) =>
  user.roles.includes(role),
);
```

따라서 `getAllAndMerge()`를 사용할 때는 메타데이터의 병합 정책뿐 아니라 실제 인가 정책도 명확하게 정의해야 합니다.

---

## 15. Reflector.createDecorator()

NestJS는 `Reflector.createDecorator()`를 사용하여 타입이 지정된 Custom Metadata Decorator를 생성할 수 있습니다.

이는 `@SetMetadata()`를 사용하는 방식의 대안입니다.

### 15.1. 데코레이터 생성

**roles.decorator.ts**

```typescript
import { Reflector } from '@nestjs/core';

export const Roles = Reflector.createDecorator<string[]>();
```

위 코드는 문자열 배열을 인자로 받는 `Roles` 데코레이터를 생성합니다.

### 15.2. Controller에서 사용

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

import { Roles } from './roles.decorator';

@Controller('users')
export class UsersController {
  @Get('admin')
  @Roles(['admin'])
  findAdmins() {
    return [];
  }
}
```

`Reflector.createDecorator<string[]>()`로 생성한 데코레이터는 문자열 배열을 하나의 인자로 전달받습니다.

따라서 앞서 정의한 `@Roles('admin')`과 사용법이 다릅니다.

### 15.3. 메타데이터 조회

```typescript
const roles = this.reflector.get(
  Roles,
  context.getHandler(),
);
```

`Reflector.createDecorator()`로 생성한 데코레이터는 데코레이터 참조 자체를 메타데이터 조회에 사용할 수 있습니다.

### 15.4. 두 방식 비교

| 항목 | @SetMetadata() | Reflector.createDecorator() |
|---|---|---|
| 패키지 | `@nestjs/common` | `@nestjs/core` |
| 메타데이터 Key | 직접 지정 가능 | 데코레이터에서 관리 |
| 타입 지정 | 별도 타입 선언 가능 | Generic을 통한 타입 지원 |
| 인자 구성 | 자유롭게 정의 가능 | 기본적으로 단일 값 전달 |
| 조회 방식 | Metadata Key 사용 | Decorator 참조 사용 |

`Reflector.createDecorator()`는 타입 안전성을 유지하면서 메타데이터를 관리하려는 경우에 적합합니다.

반면 메타데이터 Key를 직접 관리하거나 여러 인자를 받는 데코레이터를 구현해야 한다면 `@SetMetadata()`를 활용할 수 있습니다.

---

## 16. ExecutionContext를 활용한 RolesGuard

Execution Context와 Reflector를 조합하는 대표적인 사례는 RBAC(Role-Based Access Control) 구현입니다.

다음은 사용자 역할을 검사하는 Guard의 전체 예제입니다.

### 16.1. Roles Decorator

**roles.decorator.ts**

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);
```

### 16.2. RolesGuard

**roles.guard.ts**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import type { Request } from 'express';

import { ROLES_KEY } from './roles.decorator';

interface AuthenticatedUser {
  id: number;
  roles: string[];
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (requiredRoles === undefined) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const hasRole = requiredRoles.some((role) =>
      user.roles.includes(role),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        'Insufficient permissions',
      );
    }

    return true;
  }
}
```

위 예제는 앞선 인증 과정에서 검증된 사용자 정보가 `request.user`에 저장되어 있다는 전제하에 작성했습니다.

또한 역할 메타데이터가 없는 Handler에 대해서는 추가 역할 제한 없이 통과하도록 구현했습니다.

따라서 인증이 필요한 시스템에서는 별도의 인증 Guard를 함께 적용해야 합니다.

### 16.3. Controller

**users.controller.ts**

```typescript
import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('users')
@UseGuards(RolesGuard)
@Roles('user')
export class UsersController {
  @Get()
  findAll() {
    return [];
  }

  @Get('admin')
  @Roles('admin')
  findAdmins() {
    return [];
  }
}
```

### 16.4. Module 등록

**users.module.ts**

```typescript
import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { RolesGuard } from './roles.guard';

@Module({
  controllers: [UsersController],
  providers: [RolesGuard],
})
export class UsersModule {}
```

### 16.5. 요청 처리 과정

```text
GET /users/admin
       │
       ▼
    RolesGuard
       │
       ▼
 ExecutionContext
       │
       ├── getClass()
       │      └── UsersController
       │
       ├── getHandler()
       │      └── findAdmins
       │
       ▼
     Reflector
       │
       ▼
@Roles('admin') 조회
       │
       ▼
HTTP Request의 user 확인
       │
       ▼
 사용자 Role 검사
       │
       ├── 허용 ───► Controller 실행
       │
       └── 거부 ───► HTTP 403
```

이처럼 Execution Context는 현재 요청의 Handler와 Controller 정보를 제공하고, Reflector는 해당 대상에 설정된 메타데이터를 조회합니다.

Guard는 두 기능을 조합하여 접근 제어 정책을 구현합니다.

---

## 17. Custom Parameter Decorator와 ExecutionContext

Execution Context는 Guard와 Interceptor 외에도 사용자 정의 Parameter Decorator를 구현할 때 사용할 수 있습니다.

NestJS는 `createParamDecorator()`를 제공합니다.

### 17.1. 사용자 정의 User Decorator

**current-user.decorator.ts**

```typescript
import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import type { Request } from 'express';

interface AuthenticatedUser {
  id: number;
  email: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    context: ExecutionContext,
  ) => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
```

위 데코레이터는 HTTP Request에 저장된 사용자 정보를 추출합니다.

인증 여부를 검사하지는 않으므로 별도의 인증 과정이 선행되어야 합니다.

### 17.2. Controller에서 사용

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

import { CurrentUser } from './current-user.decorator';

@Controller('users')
export class UsersController {
  @Get('profile')
  getProfile(
    @CurrentUser() user: {
      id: number;
      email: string;
    },
  ) {
    return user;
  }

  @Get('email')
  getEmail(
    @CurrentUser('email') email: string,
  ) {
    return {
      email,
    };
  }
}
```

`@CurrentUser()`는 전체 사용자 정보를 반환합니다.

`@CurrentUser('email')`은 사용자 정보 중 `email` 속성만 반환합니다.

이렇게 구현하면 각 Controller에서 반복적으로 HTTP Request 객체에 접근할 필요가 없습니다.

---

## 18. ExecutionContext와 Dependency Injection

Execution Context와 Dependency Injection은 서로 다른 목적을 가진 기능입니다.

Execution Context는 현재 요청의 실행 환경과 Handler 정보를 제공합니다.

Dependency Injection은 클래스에서 필요한 Provider를 외부로부터 주입받도록 하는 메커니즘입니다.

### 18.1. 역할 비교

| 항목 | Execution Context | Dependency Injection |
|---|---|---|
| 주요 목적 | 현재 실행 환경 정보 제공 | 객체 간 의존성 관리 |
| 대표 API | `getHandler()`, `getClass()` | `@Injectable()`, 생성자 주입 |
| 관리 대상 | Handler 및 요청 실행 정보 | Provider 인스턴스 |
| 주요 사용처 | Guard, Interceptor | Service, Controller, Guard 등 |
| Scope와의 관계 | 실행 컨텍스트 정보 제공 | Provider의 생명주기 관리 |

### 18.2. 생성자 주입과 ExecutionContext 사용

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();

    const roles = this.reflector.get<string[]>(
      ROLES_KEY,
      handler,
    );

    return roles !== undefined;
  }
}
```

위 예제에서 다음 두 기능은 서로 구분됩니다.

- `Reflector`: NestJS Dependency Injection을 통해 생성자에 주입됩니다.
- `ExecutionContext`: Guard의 `canActivate()`가 실행될 때 메서드 인자로 전달됩니다.

`ExecutionContext`는 일반적으로 생성자에 주입받는 Provider가 아닙니다.

NestJS가 요청 처리 과정에서 필요한 시점에 전달하는 실행 컨텍스트입니다.

위 Guard는 메타데이터 조회만을 설명하는 예제로, 실제 인증이나 역할 일치 검사는 수행하지 않습니다.

### 18.3. Request Scope와의 차이

NestJS의 Provider는 다음과 같은 Scope를 사용할 수 있습니다.

- `DEFAULT`: 기본적으로 Singleton 범위
- `REQUEST`: 요청 단위로 Provider 인스턴스 생성
- `TRANSIENT`: 주입받는 소비자에 따라 독립적인 인스턴스 생성

이러한 Scope는 Provider의 생명주기를 제어합니다.

반면 Execution Context는 현재 요청의 실행 환경을 나타냅니다.

**Execution Context를 사용한다고 해서 해당 Guard나 Interceptor가 자동으로 Request-scoped Provider가 되는 것은 아닙니다.**

또한 Singleton Guard에서 Execution Context를 통해 현재 요청 객체에 접근할 수 있다는 이유만으로 요청별 데이터를 클래스 필드에 저장해서는 안 됩니다.

동시에 처리되는 여러 요청이 동일한 Singleton 인스턴스를 사용할 수 있기 때문입니다.

---

## 19. ExecutionContext 활용 시 주의사항

### 19.1. HTTP 실행 환경에 대한 종속성

다음 코드는 HTTP 실행 환경을 전제로 합니다.

```typescript
context.switchToHttp().getRequest();
```

이 코드를 WebSocket이나 RPC Handler에 적용하면 기대한 요청 객체를 가져올 수 없습니다.

여러 전송 방식을 지원해야 한다면 `getType()`으로 실행 환경을 확인하고 적절한 Context 접근 방식을 사용해야 합니다.

### 19.2. getClass()와 getHandler()의 반환값

`getClass()`는 클래스의 참조를 반환합니다.

`getHandler()`는 함수의 참조를 반환합니다.

두 메서드는 Controller 인스턴스나 Handler 실행 결과를 반환하지 않습니다.

따라서 반환값을 사용하여 Handler의 이름이나 메타데이터를 조회할 수는 있지만, 이미 실행된 결과를 가져오는 용도로 사용하지는 않습니다.

### 19.3. 메타데이터 조회와 권한 검사의 구분

`Reflector`는 메타데이터를 조회하는 역할만 수행합니다.

실제 접근 허용 여부는 Guard에서 판단해야 합니다.

특히 메타데이터가 존재하지 않는 경우 접근을 허용할지 거부할지 명확하게 정의해야 합니다.

인증이 필요한 API에서 메타데이터가 없다는 이유만으로 접근을 허용하면 의도하지 않은 보안 문제가 발생할 수 있습니다.

### 19.4. getAllAndOverride()의 우선순위

`getAllAndOverride()`에 전달하는 대상의 순서는 중요합니다.

```typescript
[
  context.getHandler(),
  context.getClass(),
]
```

위 순서는 Handler 메타데이터를 우선합니다.

반대로 순서를 변경하면 Controller 메타데이터가 우선할 수 있습니다.

따라서 정책의 재정의 방향을 고려하여 조회 순서를 설정해야 합니다.

### 19.5. getAllAndMerge()의 정책 해석

`getAllAndMerge()`는 메타데이터를 병합할 뿐, 병합된 값의 의미를 자동으로 결정하지 않습니다.

역할 배열을 병합하는 경우 OR 조건인지 AND 조건인지에 따라 접근 정책이 달라집니다.

따라서 메타데이터 병합 결과를 실제 정책에 적용할 때는 명확한 검사 규칙이 필요합니다.

### 19.6. Request 객체의 타입 지정

`getRequest<T>()`에 전달하는 Generic은 TypeScript 타입 검사에 사용됩니다.

런타임에서 해당 타입을 검증하거나 객체를 변환하지 않습니다.

따라서 `request.user`와 같은 속성이 존재한다고 가정하려면 인증 과정에서 해당 값이 안전하게 설정되어야 합니다.

### 19.7. Singleton Provider의 요청별 상태

Singleton Guard 또는 Interceptor의 클래스 필드에 요청별 사용자 정보나 Request 객체를 저장하면 여러 요청 간 상태가 섞일 수 있습니다.

예를 들어 다음과 같은 구현은 피해야 합니다.

```typescript
@Injectable()
export class UnsafeGuard implements CanActivate {
  private currentUser: unknown;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    this.currentUser = request.user;

    return true;
  }
}
```

요청별 데이터는 가능한 한 메서드 내부의 지역 변수로 처리하거나, 필요한 경우 적절한 요청 컨텍스트 관리 방식을 사용해야 합니다.

### 19.8. GraphQL과 WebSocket의 실행 환경

GraphQL 및 WebSocket에서는 HTTP Controller와 다른 인자 구조를 사용합니다.

특히 GraphQL Subscription과 WebSocket 연결에서는 연결 수명주기와 메시지 처리 수명주기가 구분될 수 있습니다.

따라서 Execution Context가 제공하는 현재 Handler 정보와 연결 상태 관리 기능을 혼동해서는 안 됩니다.

---

## 20. 핵심 정리

Execution Context는 NestJS에서 현재 실행 중인 Handler와 실행 환경의 정보를 제공하는 인터페이스입니다.

핵심 특징은 다음과 같습니다.

1. **실행 환경 추상화:** HTTP, WebSocket, RPC 등의 실행 환경을 공통 인터페이스로 다룰 수 있습니다.
2. **ArgumentsHost 확장:** Handler 인자 접근 기능을 상속하고 추가적인 실행 정보를 제공합니다.
3. **getType():** 현재 요청의 실행 환경을 식별합니다.
4. **switchToHttp():** HTTP Request 및 Response 객체에 접근합니다.
5. **switchToWs():** WebSocket Client와 메시지 데이터에 접근합니다.
6. **switchToRpc():** RPC 메시지와 Transport Context에 접근합니다.
7. **getClass():** 현재 Handler가 속한 클래스 참조를 반환합니다.
8. **getHandler():** 현재 실행 대상 Handler 함수의 참조를 반환합니다.
9. **Reflector:** Controller 및 Handler에 설정된 메타데이터를 조회할 수 있습니다.
10. **getAllAndOverride():** Handler와 Controller에 설정된 메타데이터의 우선순위를 적용합니다.
11. **getAllAndMerge():** 여러 대상에 설정된 메타데이터를 병합합니다.
12. **Custom Decorator:** `@SetMetadata()`, `Reflector.createDecorator()`, `createParamDecorator()` 등과 조합하여 활용할 수 있습니다.
13. **Dependency Injection과 구분:** 실행 환경 정보 제공과 Provider 생명주기 관리는 서로 다른 기능입니다.

Execution Context의 핵심은 **현재 요청을 처리하는 Handler의 참조와 실행 환경을 공통 방식으로 제공하는 것**입니다.

특히 `ExecutionContext`와 `Reflector`를 함께 사용하면 Controller와 Handler에 선언된 메타데이터를 기반으로 인증, 인가, Logging 등의 공통 정책을 구현할 수 있습니다.

따라서 Execution Context는 NestJS의 Guard, Interceptor 및 Custom Decorator를 이해하고 여러 실행 환경에서 재사용 가능한 공통 구성 요소를 설계하기 위한 핵심 개념입니다.

---

## 참고 자료

- [NestJS 공식 문서 - Execution Context](https://docs.nestjs.com/fundamentals/execution-context)
- [NestJS 공식 문서 - Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [NestJS 공식 문서 - Guards](https://docs.nestjs.com/guards)
- [NestJS 공식 문서 - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS 공식 문서 - Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS 공식 문서 - Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [NestJS 공식 문서 - Authorization](https://docs.nestjs.com/security/authorization)
- [NestJS 공식 문서 - Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [NestJS 공식 문서 - WebSocket Guards](https://docs.nestjs.com/websockets/guards)
- [NestJS 공식 문서 - Microservices Guards](https://docs.nestjs.com/microservices/guards)
- [NestJS 공식 문서 - GraphQL](https://docs.nestjs.com/graphql/quick-start)
- [NestJS 공식 문서 - HTTP Adapter](https://docs.nestjs.com/faq/http-adapter)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)