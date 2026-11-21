# Injection Scopes

## 1. 개요

NestJS의 **Injection Scope**는 Dependency Injection(DI) Container가 Provider 및 Controller의 인스턴스를 생성하고 재사용하는 범위를 결정하는 기능입니다.

NestJS에서는 기본적으로 Provider를 Singleton Scope로 관리합니다. 따라서 일반적인 애플리케이션에서는 동일한 Provider 등록에 대해 생성된 인스턴스를 여러 요청과 Consumer가 공유합니다.

그러나 모든 구성 요소가 동일한 생명주기를 가져야 하는 것은 아닙니다.

예를 들어 요청마다 별도의 상태를 관리하거나, Provider를 사용하는 Consumer별로 독립적인 인스턴스가 필요한 경우가 있습니다.

NestJS는 이러한 요구사항을 처리하기 위해 세 가지 Injection Scope를 제공합니다.

- **DEFAULT (Singleton):** 기본적으로 동일한 Provider 인스턴스를 재사용합니다.
- **REQUEST:** 요청 컨텍스트별로 Provider 인스턴스를 생성합니다.
- **TRANSIENT:** Provider를 주입받는 Consumer별로 별도의 인스턴스를 제공합니다.

Injection Scope를 이해하면 객체의 생명주기, 요청 간 상태 공유, 의존성 전파 및 애플리케이션 성능을 적절하게 관리할 수 있습니다.

---

## 2. Injection Scope의 종류

NestJS는 `@nestjs/common` 패키지의 `Scope` 열거형을 사용하여 Injection Scope를 정의합니다.

```typescript
import { Scope } from '@nestjs/common';
```

주요 Scope는 다음과 같습니다.

| Scope | 인스턴스 생성 기준 | 주요 특징 |
|---|---|---|
| `Scope.DEFAULT` | 일반적으로 애플리케이션 초기화 시점 | 동일한 Provider 등록의 인스턴스를 재사용합니다. |
| `Scope.REQUEST` | 요청 컨텍스트 | 요청별로 독립적인 인스턴스를 제공합니다. |
| `Scope.TRANSIENT` | Provider를 주입받는 Consumer | Consumer별로 독립적인 인스턴스를 제공합니다. |

세 Scope의 차이를 단순화하면 다음과 같습니다.

```text
DEFAULT (Singleton)

Request A ──┐
            ├──► Service Instance A
Request B ──┘


REQUEST

Request A ─────► Service Instance A

Request B ─────► Service Instance B


TRANSIENT

Consumer A ────► Service Instance A

Consumer B ────► Service Instance B
```

여기서 REQUEST와 TRANSIENT는 서로 다른 기준으로 인스턴스를 구분한다는 점이 중요합니다.

REQUEST는 요청 컨텍스트를 기준으로 인스턴스를 구분하지만, TRANSIENT는 의존성을 주입받는 Consumer를 기준으로 인스턴스를 구분합니다.

따라서 TRANSIENT가 HTTP 요청마다 반드시 새로운 인스턴스를 생성한다는 의미는 아닙니다.

---

## 3. DEFAULT Scope (Singleton)

`Scope.DEFAULT`는 NestJS의 기본 Injection Scope입니다.

별도의 Scope를 지정하지 않은 Provider는 기본적으로 Singleton Scope로 관리됩니다.

Singleton Provider는 일반적으로 애플리케이션 초기화 과정에서 인스턴스가 생성되며, 이후 여러 요청에서 동일한 인스턴스를 재사용합니다.

### 3.1. 기본 사용법

다음과 같이 Provider를 정의할 수 있습니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  findAll() {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
  }
}
```

별도의 Scope를 지정하지 않았으므로 `UsersService`에는 DEFAULT Scope가 적용됩니다.

이를 명시적으로 선언할 수도 있습니다.

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({
  scope: Scope.DEFAULT,
})
export class UsersService {}
```

두 방식은 동일한 Scope를 사용합니다.

### 3.2. Singleton Provider의 인스턴스 공유

다음과 같이 `UsersService`를 여러 Controller에서 사용한다고 가정합니다.

**users.controller.ts**

```typescript
import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

**admin.controller.ts**

```typescript
import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('users')
  findAll() {
    return this.usersService.findAll();
  }
}
```

Module은 다음과 같이 구성합니다.

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { AdminController } from './admin.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [
    UsersController,
    AdminController,
  ],
  providers: [UsersService],
})
export class UsersModule {}
```

이 경우 두 Controller는 기본적으로 동일한 `UsersService` 인스턴스를 주입받습니다.

```text
UsersModule
    │
    └── UsersService (Singleton)
              ▲
              │
        ┌─────┴─────┐
        │           │
UsersController  AdminController
```

이는 두 Controller가 동일한 Module에 등록된 `UsersService` Provider를 참조하기 때문입니다.

### 3.3. Singleton의 인스턴스 생성 시점

일반적인 정적 의존성 트리에 속한 Singleton Provider는 애플리케이션 초기화 과정에서 인스턴스화됩니다.

NestJS는 Module에 등록된 Provider의 의존성을 분석하고 필요한 객체를 생성합니다.

이후 HTTP 요청이 발생하면 기존에 생성된 인스턴스를 재사용합니다.

```text
Application Bootstrap
         │
         ▼
UsersService 생성
         │
         ▼
DI Container에서 관리
         │
         ├── Request A에서 사용
         │
         ├── Request B에서 사용
         │
         └── Request C에서 사용
```

단, `ModuleRef` 등을 활용한 동적 인스턴스 생성이나 Scope 전파 등의 조건에 따라 실제 생성 과정은 달라질 수 있습니다.

### 3.4. Singleton과 Module의 관계

Singleton Scope는 특정 클래스의 인스턴스가 애플리케이션 전체에서 반드시 하나만 생성된다는 의미는 아닙니다.

다음과 같이 동일한 Provider 클래스를 서로 다른 Module에 직접 등록할 수 있습니다.

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

```typescript
@Module({
  providers: [UsersService],
})
export class AdminModule {}
```

이 경우 각 Module은 독립적인 Provider 등록을 갖습니다.

따라서 기본 Singleton Scope에서도 서로 다른 `UsersService` 인스턴스가 생성될 수 있습니다.

반면 하나의 Module에서 Provider를 등록하고 다른 Module에 공개하면 동일한 Provider 인스턴스를 공유할 수 있습니다.

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

```typescript
@Module({
  imports: [UsersModule],
})
export class AdminModule {}
```

따라서 Singleton Scope를 이해할 때는 **Provider가 어느 Module에 등록되어 있고 어떤 Provider 등록을 참조하는지**를 함께 고려해야 합니다.

### 3.5. Singleton의 장점

Singleton Scope는 다음과 같은 장점을 제공합니다.

- Provider 인스턴스를 반복적으로 생성하지 않아도 됩니다.
- 객체 생성과 초기화 비용을 줄일 수 있습니다.
- 여러 Consumer가 공통 기능을 재사용할 수 있습니다.
- 데이터베이스 연결 풀이나 공통 설정 서비스 등을 효율적으로 관리할 수 있습니다.
- Request Scope에 비해 일반적으로 의존성 관리 비용이 적습니다.

따라서 NestJS에서는 특별한 요구사항이 없다면 DEFAULT Scope를 사용하는 것이 권장됩니다.

### 3.6. Singleton의 공유 상태 주의사항

Singleton Provider는 여러 요청에서 재사용되므로 요청별 상태를 인스턴스 필드에 저장하는 방식은 주의해야 합니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  private currentUserId?: number;

  setCurrentUserId(id: number): void {
    this.currentUserId = id;
  }

  getCurrentUserId(): number | undefined {
    return this.currentUserId;
  }
}
```

위 예제에서는 서로 다른 요청이 동일한 `currentUserId` 필드를 사용합니다.

따라서 한 요청에서 저장한 값이 다른 요청에 영향을 줄 수 있습니다.

Node.js가 일반적인 JavaScript 실행에서 단일 이벤트 루프를 사용하더라도, 비동기 작업 사이에 여러 요청의 실행이 교차할 수 있습니다.

그러므로 Singleton Provider에서는 요청별 데이터를 메서드 매개변수나 지역 변수로 관리하는 것이 좋습니다.

---

## 4. REQUEST Scope

`Scope.REQUEST`는 요청 컨텍스트별로 별도의 Provider 인스턴스를 생성하는 Scope입니다.

HTTP 애플리케이션에서는 일반적으로 각 HTTP 요청에 대해 독립적인 Provider 인스턴스를 제공합니다.

### 4.1. 기본 사용법

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({
  scope: Scope.REQUEST,
})
export class RequestContextService {
  private readonly createdAt = Date.now();

  getCreatedAt(): number {
    return this.createdAt;
  }
}
```

`RequestContextService`는 REQUEST Scope로 선언되었습니다.

서로 다른 요청에서는 별도의 인스턴스가 제공됩니다.

### 4.2. Request별 인스턴스 생성

다음과 같은 요청이 발생한다고 가정합니다.

```http
GET /users
```

```http
GET /orders
```

REQUEST Scope Provider를 두 요청에서 사용한다면 각각 별도의 인스턴스가 생성됩니다.

```text
Request A
    │
    ▼
RequestContextService A


Request B
    │
    ▼
RequestContextService B
```

두 인스턴스는 서로 독립적인 상태를 가질 수 있습니다.

반면 동일한 요청 컨텍스트에서 동일한 REQUEST Scope Provider를 여러 구성 요소가 사용한다면 해당 요청 컨텍스트의 인스턴스를 공유합니다.

### 4.3. Request Scope의 생명주기

HTTP 요청을 기준으로 REQUEST Scope의 일반적인 생명주기는 다음과 같습니다.

1. HTTP 요청이 애플리케이션에 전달됩니다.
2. NestJS가 요청에 대응하는 DI Context를 사용합니다.
3. 해당 요청에서 필요한 REQUEST Scope Provider를 생성합니다.
4. 요청을 처리하는 동안 동일한 Context에서 인스턴스를 재사용합니다.
5. 요청 처리가 완료되면 해당 인스턴스는 더 이상 필요하지 않게 됩니다.
6. 다른 참조가 남아 있지 않으면 JavaScript Garbage Collector의 정리 대상이 됩니다.

REQUEST Scope Provider의 메모리가 요청 종료 즉시 강제로 해제되는 것은 아닙니다.

실제 메모리 회수 시점은 JavaScript 런타임의 Garbage Collector에 따라 결정됩니다.

### 4.4. Request Scope의 활용 사례

REQUEST Scope는 다음과 같은 상황에서 활용할 수 있습니다.

- 요청별 사용자 정보 관리
- 요청별 추적 정보 관리
- 요청별 캐시 구성
- Multi-tenancy 환경의 요청 컨텍스트 관리
- 요청별로 분리된 상태가 반드시 필요한 처리

다만 이러한 요구사항이 존재한다고 해서 반드시 REQUEST Scope를 사용해야 하는 것은 아닙니다.

요청별 값을 메서드 매개변수로 전달하거나 `AsyncLocalStorage`를 활용하는 방법도 고려할 수 있습니다.

---

## 5. REQUEST Provider

NestJS는 현재 HTTP 요청 객체를 주입받기 위한 `REQUEST` Injection Token을 제공합니다.

`REQUEST` Provider는 본질적으로 Request-scoped입니다.

따라서 이를 주입받는 Provider도 요청별 Scope의 영향을 받습니다.

### 5.1. HTTP Request 객체 주입

다음 예제는 Express Adapter를 사용하는 환경을 전제로 합니다.

```typescript
import {
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';

import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

@Injectable({
  scope: Scope.REQUEST,
})
export class RequestContextService {
  constructor(
    @Inject(REQUEST)
    private readonly request: Request,
  ) {}

  getUserAgent(): string | undefined {
    return this.request.headers['user-agent'];
  }
}
```

위 예제에서 `REQUEST` 토큰은 현재 요청 객체를 제공합니다.

`RequestContextService`는 요청마다 별도의 인스턴스로 관리되므로 해당 요청의 Header에 접근할 수 있습니다.

Express의 `Request` 타입은 `@types/express`에서 제공됩니다.

필요한 경우 다음과 같이 설치할 수 있습니다.

```bash
npm install -D @types/express
```

Fastify Adapter를 사용하는 경우에는 해당 플랫폼의 Request 타입을 사용해야 합니다.

### 5.2. REQUEST Provider의 Scope 전파

`REQUEST` 토큰은 기본적으로 Request-scoped이므로 다음과 같이 명시적으로 `Scope.REQUEST`를 선언하지 않아도 됩니다.

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

@Injectable()
export class RequestContextService {
  constructor(
    @Inject(REQUEST)
    private readonly request: Request,
  ) {}
}
```

이 경우 `RequestContextService`는 REQUEST Provider에 의존하므로 실질적으로 Request-scoped로 동작합니다.

또한 `RequestContextService`를 주입받는 상위 Provider에도 Scope가 전파될 수 있습니다.

따라서 요청 객체를 직접 주입받는 구조를 설계할 때는 의존성 체인 전체의 인스턴스 생성 범위를 고려해야 합니다.

### 5.3. GraphQL과 Microservices의 요청 컨텍스트

HTTP 애플리케이션에서는 `REQUEST` 토큰을 통해 요청 객체에 접근합니다.

그러나 GraphQL과 Microservices에서는 프로토콜 및 실행 환경에 따라 사용하는 컨텍스트 객체가 달라집니다.

예를 들어 GraphQL에서는 `@nestjs/graphql` 패키지에서 제공하는 `CONTEXT` 토큰을 사용할 수 있습니다.

Microservices에서는 Transport와 메시지 처리 방식에 따라 요청 컨텍스트를 구성할 수 있습니다.

따라서 REQUEST Scope를 사용하더라도 모든 플랫폼에서 동일한 HTTP Request 객체가 제공된다고 가정해서는 안 됩니다.

---

## 6. TRANSIENT Scope

`Scope.TRANSIENT`는 Provider를 주입받는 Consumer별로 독립적인 인스턴스를 제공하는 Scope입니다.

REQUEST Scope가 요청을 기준으로 인스턴스를 구분한다면, TRANSIENT Scope는 의존성을 사용하는 Consumer를 기준으로 인스턴스를 구분합니다.

### 6.1. 기본 사용법

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({
  scope: Scope.TRANSIENT,
})
export class LoggerService {
  private readonly createdAt = Date.now();

  log(message: string): void {
    console.log(message);
  }

  getCreatedAt(): number {
    return this.createdAt;
  }
}
```

`LoggerService`는 TRANSIENT Scope로 선언되었습니다.

### 6.2. Consumer별 인스턴스 생성

다음과 같이 두 Service가 `LoggerService`를 주입받는다고 가정합니다.

**users.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly logger: LoggerService,
  ) {}
}
```

**orders.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly logger: LoggerService,
  ) {}
}
```

두 Service가 동일한 Module에 등록되어 있더라도 각각 별도의 `LoggerService` 인스턴스를 주입받습니다.

```text
UsersService
     │
     ▼
LoggerService Instance A


OrdersService
     │
     ▼
LoggerService Instance B
```

따라서 Consumer별로 독립적인 상태를 유지할 수 있습니다.

### 6.3. TRANSIENT와 HTTP 요청의 관계

TRANSIENT Scope는 HTTP 요청마다 새로운 인스턴스를 생성한다는 의미가 아닙니다.

예를 들어 `UsersService`가 Singleton이고 `LoggerService`가 TRANSIENT인 경우를 가정합니다.

```text
UsersService (DEFAULT)
       │
       ▼
LoggerService (TRANSIENT)
```

`UsersService`는 애플리케이션 생명주기 동안 재사용됩니다.

`LoggerService`는 `UsersService`에 주입될 때 별도의 인스턴스를 제공받지만, 이후 `UsersService`를 사용하는 모든 HTTP 요청에서 해당 인스턴스를 계속 사용할 수 있습니다.

즉, 다음과 같이 동작할 수 있습니다.

```text
Request A ──┐
            │
Request B ──┼──► UsersService
            │         │
Request C ──┘         ▼
                 LoggerService A
```

여기서 새로운 HTTP 요청이 발생한다고 해서 `LoggerService`가 매번 재생성되지는 않습니다.

이는 REQUEST Scope와 TRANSIENT Scope의 중요한 차이입니다.

### 6.4. TRANSIENT Scope의 활용 사례

TRANSIENT Scope는 Consumer마다 독립적인 설정이나 상태를 가진 Provider가 필요한 경우에 활용할 수 있습니다.

대표적인 사례는 다음과 같습니다.

- Consumer별 로깅 컨텍스트
- Consumer별로 독립적인 상태를 유지하는 Helper
- 개별 Consumer에 특화된 객체 구성
- Consumer별 설정을 갖는 Adapter

다만 상태가 필요하지 않은 단순한 Utility 클래스라면 반드시 TRANSIENT Provider로 구성할 필요는 없습니다.

---

## 7. Scope Hierarchy

NestJS에서는 Provider 간 의존성 관계에 따라 Injection Scope가 영향을 받을 수 있습니다.

이러한 동작을 이해하기 위해서는 **Scope Hierarchy**와 **Scope Bubbling**을 구분해야 합니다.

특히 REQUEST Scope는 의존성 체인의 상위 구성 요소로 전파될 수 있습니다.

반면 TRANSIENT Scope는 동일한 방식으로 전파되지 않습니다.

### 7.1. REQUEST Scope의 전파

다음과 같은 의존성 관계를 가정합니다.

```text
UsersController
       │
       ▼
UsersService
       │
       ▼
UsersRepository
```

각 구성 요소의 Scope는 다음과 같습니다.

| 구성 요소 | 선언된 Scope |
|---|---|
| `UsersController` | DEFAULT |
| `UsersService` | REQUEST |
| `UsersRepository` | DEFAULT |

`UsersService`가 REQUEST Scope인 경우 이를 주입받는 `UsersController`도 요청별 Scope의 영향을 받습니다.

반면 `UsersRepository`는 `UsersService`에 의존하는 것이 아니라, `UsersService`가 사용하는 의존성이므로 DEFAULT Scope를 유지할 수 있습니다.

```text
UsersController (REQUEST로 동작)
       │
       ▼
UsersService (REQUEST)
       │
       ▼
UsersRepository (DEFAULT)
```

이러한 전파를 Scope Bubbling이라고 합니다.

### 7.2. REQUEST Scope가 전파되는 이유

`UsersController`가 생성자에서 `UsersService`를 주입받는다고 가정합니다.

```typescript
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}
}
```

`UsersService`는 요청마다 다른 인스턴스를 제공해야 합니다.

그런데 `UsersController`가 Singleton으로 유지된다면 생성자에 주입받은 `UsersService` 인스턴스를 모든 요청에서 공유하게 됩니다.

이는 REQUEST Scope의 목적과 충돌합니다.

따라서 NestJS는 필요한 의존성 체인에 요청 컨텍스트를 전파하여 상위 구성 요소도 요청별로 구성될 수 있도록 합니다.

### 7.3. TRANSIENT Scope는 동일하게 전파되지 않습니다

다음과 같은 구조를 가정합니다.

```text
UsersController (DEFAULT)
       │
       ▼
UsersService (DEFAULT)
       │
       ▼
LoggerService (TRANSIENT)
```

`LoggerService`가 TRANSIENT라고 해서 `UsersService`와 `UsersController`가 자동으로 TRANSIENT가 되지는 않습니다.

`UsersService`는 Singleton으로 유지될 수 있으며, 자신의 인스턴스에 주입된 `LoggerService`를 계속 사용합니다.

따라서 TRANSIENT Scope를 사용하는 경우에는 Consumer의 생명주기를 함께 고려해야 합니다.

### 7.4. Scope 전파 비교

| 항목 | REQUEST | TRANSIENT |
|---|---|---|
| 인스턴스 구분 기준 | 요청 컨텍스트 | Consumer |
| 상위 의존성 체인에 Scope 전파 | 발생할 수 있음 | REQUEST와 동일한 방식으로 전파되지 않음 |
| Singleton Consumer에 미치는 영향 | Consumer가 Request-scoped로 동작할 수 있음 | Consumer는 Singleton으로 유지 가능 |
| HTTP 요청별 독립 인스턴스 | 일반적인 HTTP 요청에서 제공 | 보장하지 않음 |

이 차이는 REQUEST Scope와 TRANSIENT Scope 중 어떤 방식을 사용할지 결정할 때 중요합니다.

---

## 8. Controller의 Injection Scope

NestJS에서는 Provider뿐 아니라 Controller에도 Injection Scope를 설정할 수 있습니다.

Controller의 Scope는 해당 Controller에 선언된 Route Handler 전체에 적용됩니다.

### 8.1. DEFAULT Controller

별도의 Scope를 지정하지 않으면 Controller도 기본적으로 Singleton으로 관리됩니다.

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return [];
  }
}
```

일반적인 HTTP 요청에서는 동일한 Controller 인스턴스를 재사용합니다.

### 8.2. REQUEST Controller

Controller를 REQUEST Scope로 선언할 수도 있습니다.

```typescript
import {
  Controller,
  Get,
  Scope,
} from '@nestjs/common';

@Controller({
  path: 'users',
  scope: Scope.REQUEST,
})
export class UsersController {
  @Get()
  findAll() {
    return [];
  }
}
```

이 경우 HTTP 요청별로 Controller 인스턴스를 생성합니다.

### 8.3. Controller Scope와 Provider Scope

Controller가 REQUEST Scope라고 해서 Controller가 사용하는 모든 Provider가 자동으로 REQUEST Scope가 되는 것은 아닙니다.

예를 들어 다음과 같이 구성할 수 있습니다.

```text
UsersController (REQUEST)
       │
       ▼
UsersService (DEFAULT)
       │
       ▼
UsersRepository (DEFAULT)
```

이 경우 요청마다 `UsersController` 인스턴스가 생성되더라도 `UsersService`와 `UsersRepository`는 기존 Singleton 인스턴스를 공유할 수 있습니다.

따라서 Scope 전파는 의존성 방향을 기준으로 이해해야 합니다.

---

## 9. Custom Provider의 Injection Scope

NestJS에서는 Custom Provider에도 Injection Scope를 지정할 수 있습니다.

Class Provider와 Factory Provider 등에서 Scope를 설정할 수 있습니다.

### 9.1. Class Provider

```typescript
import { Scope } from '@nestjs/common';

const requestContextProvider = {
  provide: 'REQUEST_CONTEXT',
  useClass: RequestContextService,
  scope: Scope.REQUEST,
};
```

이 예제는 `RequestContextService` 클래스가 별도로 정의되어 있다고 가정합니다.

`REQUEST_CONTEXT` 토큰으로 등록된 Provider는 REQUEST Scope를 사용합니다.

### 9.2. Factory Provider

```typescript
import { Scope } from '@nestjs/common';

const requestMetadataProvider = {
  provide: 'REQUEST_METADATA',
  scope: Scope.REQUEST,
  useFactory: () => {
    return {
      createdAt: Date.now(),
    };
  },
};
```

이 경우 Factory 함수는 해당 Provider가 요청 컨텍스트에서 필요할 때 실행되며, 요청별로 값을 제공할 수 있습니다.

### 9.3. Value Provider

`useValue`는 기존 객체나 값을 Provider로 제공하는 방식입니다.

```typescript
const appOptionsProvider = {
  provide: 'APP_OPTIONS',
  useValue: {
    name: 'NestJS Application',
  },
};
```

이 방식에서는 개발자가 생성한 객체 참조가 제공됩니다.

요청마다 새로운 객체를 생성해야 한다면 `useValue`보다는 `useClass` 또는 `useFactory`를 활용하는 것이 적합합니다.

---

## 10. ModuleRef와 Scoped Provider

NestJS는 `ModuleRef`를 통해 Provider를 프로그래밍 방식으로 조회하거나 해결할 수 있습니다.

이 기능은 일반적인 생성자 주입과 달리, 런타임에 특정 Provider 인스턴스를 조회해야 할 때 사용합니다.

### 10.1. ModuleRef의 기본 구조

```typescript
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class ExampleService {
  constructor(
    private readonly moduleRef: ModuleRef,
  ) {}
}
```

`ModuleRef`는 `@nestjs/core` 패키지에서 제공됩니다.

### 10.2. get()

`get()`은 이미 등록된 정적 Provider 인스턴스를 조회하는 데 사용합니다.

```typescript
const usersService = this.moduleRef.get(UsersService);
```

`get()`은 일반적으로 Singleton Provider를 조회할 때 사용합니다.

REQUEST 또는 TRANSIENT Scope Provider를 조회하는 용도로 사용할 수 없습니다.

### 10.3. resolve()

REQUEST 또는 TRANSIENT Scope Provider를 동적으로 해결하려면 `resolve()`를 사용합니다.

```typescript
const contextService = await this.moduleRef.resolve(
  RequestContextService,
);
```

`resolve()`는 Promise를 반환하는 비동기 메서드입니다.

또한 Context ID를 명시하지 않고 반복적으로 호출하면 서로 다른 DI Context Sub-tree에서 인스턴스가 해결될 수 있습니다.

따라서 동일한 Scoped Provider 인스턴스를 공유해야 한다면 Context ID를 함께 사용해야 합니다.

### 10.4. ContextIdFactory

`ContextIdFactory`는 DI Context를 식별하기 위한 Context ID를 생성하거나 조회하는 기능을 제공합니다.

```typescript
import { ContextIdFactory } from '@nestjs/core';
```

다음과 같이 Context ID를 생성할 수 있습니다.

```typescript
const contextId = ContextIdFactory.create();
```

이 Context ID를 사용하여 Scoped Provider를 해결할 수 있습니다.

```typescript
const instanceA = await this.moduleRef.resolve(
  RequestContextService,
  contextId,
);

const instanceB = await this.moduleRef.resolve(
  RequestContextService,
  contextId,
);

console.log(instanceA === instanceB); // true
```

동일한 Context ID로 동일한 REQUEST Scope Provider를 해결하면 같은 DI Context Sub-tree에 속한 인스턴스를 공유할 수 있습니다.

반면 다른 Context ID를 사용하면 서로 독립적인 인스턴스를 해결할 수 있습니다.

### 10.5. REQUEST 객체 등록

`ContextIdFactory.create()`로 직접 생성한 Context ID에는 HTTP 요청 객체가 자동으로 연결되지 않습니다.

따라서 해당 Context에서 `REQUEST` Provider를 사용해야 한다면 요청 객체를 등록해야 합니다.

```typescript
const contextId = ContextIdFactory.create();

this.moduleRef.registerRequestByContextId(
  { requestId: 'request-001' },
  contextId,
);
```

이후 해당 Context ID를 사용하여 REQUEST Scope Provider를 해결할 수 있습니다.

여기서 등록하는 객체는 개발자가 직접 구성한 요청 컨텍스트 객체이며, 실제 HTTP 요청 객체와 동일하다고 가정해서는 안 됩니다.

### 10.6. 현재 HTTP 요청의 Context ID 조회

현재 HTTP 요청에 대응하는 Context ID를 가져오려면 `ContextIdFactory.getByRequest()`를 사용할 수 있습니다.

```typescript
const contextId = ContextIdFactory.getByRequest(request);

const contextService = await this.moduleRef.resolve(
  RequestContextService,
  contextId,
);
```

이 방식은 기존 HTTP 요청과 동일한 DI Context Sub-tree에서 Scoped Provider를 해결해야 할 때 유용합니다.

단, 예제의 `request`는 현재 NestJS 요청 처리 컨텍스트에 연결된 실제 요청 객체여야 합니다.

---

## 11. Lifecycle Hooks와 Injection Scope

NestJS는 Module과 Provider의 초기화 및 종료를 처리하기 위한 Lifecycle Hook을 지원합니다.

대표적인 Hook은 다음과 같습니다.

| Lifecycle Hook | 역할 |
|---|---|
| `onModuleInit()` | Module의 의존성 해결 이후 초기화 작업을 수행합니다. |
| `onApplicationBootstrap()` | 애플리케이션 초기화 완료 단계에서 실행됩니다. |
| `onModuleDestroy()` | 애플리케이션 종료 과정의 정리 작업을 수행합니다. |
| `beforeApplicationShutdown()` | 애플리케이션 종료 전 추가 정리 작업을 수행합니다. |
| `onApplicationShutdown()` | 종료 과정의 마지막 단계에서 실행됩니다. |

### 11.1. DEFAULT Scope와 Lifecycle Hook

Singleton Provider는 일반적으로 애플리케이션 생명주기와 연결되어 있습니다.

따라서 다음과 같이 Lifecycle Hook을 구현할 수 있습니다.

```typescript
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

@Injectable()
export class ResourceService
  implements OnModuleInit, OnModuleDestroy {

  onModuleInit(): void {
    console.log('Resource initialized');
  }

  onModuleDestroy(): void {
    console.log('Resource cleanup');
  }
}
```

애플리케이션 초기화와 종료 과정에서 해당 Hook을 사용할 수 있습니다.

시스템 종료 신호에 대한 Shutdown Hook 실행은 `enableShutdownHooks()` 등의 설정을 추가로 고려해야 합니다.

### 11.2. REQUEST Scope와 Lifecycle Hook

REQUEST Scope Provider는 일반적인 애플리케이션 생명주기와 직접 연결되지 않습니다.

NestJS 공식 문서에서는 애플리케이션 Lifecycle Hook이 Request-scoped 클래스에 대해 실행되지 않는다고 명시하고 있습니다.

따라서 REQUEST Scope Provider에서 `onModuleDestroy()` 등의 Hook이 요청 종료마다 실행될 것이라고 가정해서는 안 됩니다.

특히 요청별로 외부 연결이나 파일 등의 자원을 생성하는 경우에는 명시적인 정리 방법이 필요합니다.

### 11.3. 요청 종료와 자원 정리

REQUEST Scope Provider는 요청별 인스턴스를 제공하지만, 요청 종료 시 자동으로 모든 외부 자원을 닫는 기능을 의미하지는 않습니다.

예를 들어 요청별로 데이터베이스 연결을 생성한다면 연결 해제 책임을 별도로 관리해야 합니다.

따라서 일반적인 데이터베이스 연결 풀은 Singleton Provider로 관리하고, 요청별 트랜잭션이나 컨텍스트는 별도로 구성하는 방식을 고려할 수 있습니다.

---

## 12. Injection Scope와 성능

Injection Scope는 애플리케이션의 객체 생성 비용과 메모리 사용량에 영향을 줄 수 있습니다.

특히 REQUEST Scope는 요청마다 새로운 인스턴스를 생성하므로 DEFAULT Scope보다 추가적인 비용이 발생할 수 있습니다.

### 12.1. DEFAULT Scope의 성능 특성

DEFAULT Scope에서는 일반적으로 인스턴스를 한 번 생성하고 재사용합니다.

```text
Application Startup
        │
        ▼
Service Instance 생성
        │
        ├── Request 1
        ├── Request 2
        ├── Request 3
        └── Request N
```

따라서 반복적인 객체 생성 비용을 줄일 수 있습니다.

### 12.2. REQUEST Scope의 성능 특성

REQUEST Scope에서는 요청별로 인스턴스가 생성됩니다.

```text
Request 1 ──► Service Instance 1

Request 2 ──► Service Instance 2

Request 3 ──► Service Instance 3

Request N ──► Service Instance N
```

요청량이 증가하면 다음과 같은 비용이 발생할 수 있습니다.

- 요청별 Provider 인스턴스 생성
- 의존성 체인의 추가적인 인스턴스 생성
- DI Context 관리 비용
- 객체 할당에 따른 메모리 사용 증가
- Garbage Collection 부담 증가

특히 REQUEST Scope가 상위 의존성 체인으로 전파되면 실제로 생성되는 객체 수가 예상보다 많아질 수 있습니다.

NestJS 공식 문서는 REQUEST Scope를 적절하게 설계한 애플리케이션에서 성능 영향이 크지 않을 수 있다고 설명하지만, 이는 모든 환경에서 일정한 지연 증가율이 보장된다는 의미는 아닙니다.

실제 영향은 요청량, Provider 수, 의존성 구조 및 실행 환경에 따라 측정해야 합니다.

### 12.3. TRANSIENT Scope의 성능 특성

TRANSIENT Provider는 Consumer별로 인스턴스를 제공하므로 Singleton보다 더 많은 객체가 생성될 수 있습니다.

그러나 항상 HTTP 요청마다 인스턴스를 생성하는 것은 아닙니다.

따라서 Consumer가 Singleton인지 Request-scoped인지에 따라 실제 생성 빈도가 달라집니다.

### 12.4. 성능 관점의 권장사항

일반적으로 다음 원칙을 적용하는 것이 좋습니다.

1. 상태가 없는 일반적인 Service는 DEFAULT Scope를 우선적으로 사용합니다.
2. 요청별 인스턴스가 반드시 필요한 경우에 REQUEST Scope를 고려합니다.
3. Consumer별로 독립적인 인스턴스가 필요한 경우에 TRANSIENT Scope를 사용합니다.
4. REQUEST Scope를 적용하기 전에 의존성 체인의 Scope 전파를 확인합니다.
5. 고부하 애플리케이션에서는 Scope 변경 전후의 성능을 측정합니다.

---

## 13. AsyncLocalStorage와 Request Scope

Node.js는 비동기 실행 흐름에 데이터를 연결하기 위한 `AsyncLocalStorage` API를 제공합니다.

`AsyncLocalStorage`는 요청별 컨텍스트를 관리해야 하지만 Provider 전체를 REQUEST Scope로 변경하고 싶지 않은 경우에 유용할 수 있습니다.

### 13.1. Request Scope와의 차이

REQUEST Scope는 요청별 Provider 인스턴스를 생성하는 방식입니다.

반면 `AsyncLocalStorage`는 비동기 실행 컨텍스트에 데이터를 저장하고, 해당 실행 흐름에서 이를 조회할 수 있도록 합니다.

| 구분 | REQUEST Scope | AsyncLocalStorage |
|---|---|---|
| 관리 대상 | Provider 인스턴스 | 비동기 컨텍스트 데이터 |
| 요청별 데이터 분리 | 지원 | 지원 |
| Provider 인스턴스 생성 | 요청별 생성 | Singleton 유지 가능 |
| Scope 전파 | 발생할 수 있음 | Provider Scope 변경이 필수는 아님 |
| 주요 활용 | 요청별 독립 객체 | 요청 추적, 사용자·테넌트 컨텍스트 |

### 13.2. 기본 구조

Node.js의 `AsyncLocalStorage`는 `node:async_hooks`에서 제공합니다.

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestStore {
  requestId: string;
}

export const requestStorage =
  new AsyncLocalStorage<RequestStore>();
```

비동기 컨텍스트를 생성할 수 있습니다.

```typescript
requestStorage.run(
  { requestId: 'request-001' },
  () => {
    // 이 컨텍스트에서 시작하는 비동기 작업
  },
);
```

동일한 비동기 실행 컨텍스트에서는 다음과 같이 값을 조회할 수 있습니다.

```typescript
const store = requestStorage.getStore();

console.log(store?.requestId);
```

실제 NestJS 애플리케이션에서는 Middleware 또는 다른 적절한 진입 지점에서 요청별 컨텍스트를 구성할 수 있습니다.

단, 비동기 컨텍스트의 전파와 데이터 수명은 Node.js의 비동기 실행 모델에 따라 관리되므로, 외부 라이브러리나 특수한 비동기 처리와의 연동은 검증해야 합니다.

### 13.3. 선택 기준

단순히 요청 ID나 사용자·테넌트 식별자 등 요청별 값을 조회하기 위한 목적이라면 `AsyncLocalStorage`가 유용할 수 있습니다.

반면 요청마다 독립적인 상태와 생명주기를 가지는 객체 자체가 필요하다면 REQUEST Scope를 고려할 수 있습니다.

두 기술은 완전히 동일한 기능이 아니므로 요구사항에 따라 선택해야 합니다.

---

## 14. Durable Providers

NestJS는 다수의 요청이 동일한 논리적 컨텍스트를 공유해야 하는 상황을 위해 Durable Provider 기능을 제공합니다.

예를 들어 Multi-tenancy 환경에서 요청별로 Provider를 생성하는 대신, 동일한 Tenant에 속한 요청들이 일정한 DI Sub-tree를 공유하도록 구성할 수 있습니다.

### 14.1. Durable Provider 기본 선언

```typescript
import {
  Injectable,
  Scope,
} from '@nestjs/common';

@Injectable({
  scope: Scope.REQUEST,
  durable: true,
})
export class TenantContextService {}
```

`durable: true`는 REQUEST Scope Provider에 적용할 수 있는 설정입니다.

그러나 이 옵션만 선언했다고 해서 자동으로 Tenant별 Provider 인스턴스가 공유되는 것은 아닙니다.

### 14.2. ContextIdStrategy

Durable Provider를 실제로 활용하려면 요청을 어떤 DI Context에 연결할지 결정하는 `ContextIdStrategy`를 구성해야 합니다.

NestJS는 `ContextIdFactory.apply()`를 통해 사용자 정의 Context ID 전략을 등록할 수 있습니다.

```typescript
ContextIdFactory.apply(customContextIdStrategy);
```

이 예제의 `customContextIdStrategy`는 애플리케이션 요구사항에 맞게 구현한 전략 객체를 의미합니다.

전략은 요청의 Tenant 정보 등을 기준으로 재사용할 DI Context를 결정할 수 있습니다.

### 14.3. Durable Provider 사용 시 고려사항

Durable Provider는 여러 요청이 동일한 인스턴스를 공유하도록 구성할 수 있으므로 다음 사항을 주의해야 합니다.

- 공유되는 인스턴스에 특정 HTTP 요청의 개인정보를 저장하지 않습니다.
- Tenant 식별 및 접근 권한 검증을 별도로 수행합니다.
- Tenant 수가 증가할 때 메모리 사용량을 고려합니다.
- Context ID와 Provider 인스턴스의 관리 정책을 정의합니다.
- 공유 인스턴스가 어떤 범위에서 재사용되는지 명확하게 문서화합니다.

Durable Provider는 일반적인 CRUD 애플리케이션에 반드시 필요한 기능은 아닙니다.

요청별 인스턴스 생성 비용을 줄이면서 특정 논리적 컨텍스트를 공유해야 하는 경우에 고려할 수 있습니다.

---

## 15. WebSocket 및 기타 구성 요소의 Scope

Injection Scope는 HTTP Controller뿐 아니라 NestJS의 다른 구성 요소와도 관련됩니다.

다만 플랫폼별로 Scope 지원 범위와 요청 컨텍스트의 의미가 다를 수 있습니다.

### 15.1. WebSocket Gateway

WebSocket은 하나의 연결을 유지하면서 여러 메시지를 주고받을 수 있는 통신 방식입니다.

따라서 HTTP 요청과 WebSocket 메시지 또는 연결의 생명주기는 서로 다릅니다.

NestJS v11 및 이전 버전의 공식 문서에서는 WebSocket Gateway를 Singleton으로 유지해야 한다고 설명했습니다.

반면 **NestJS v12부터는 WebSocket Gateway에서 Request-scoped Provider를 지원하며, 해당 Scope는 개별 메시지가 아니라 Socket 연결에 연결됩니다.**

따라서 WebSocket Gateway의 Scope를 설계할 때는 사용하는 NestJS 버전을 반드시 확인해야 합니다.

예를 들어 하나의 WebSocket 연결에서 여러 메시지가 수신되더라도 연결 단위 Request Scope가 메시지마다 새로운 Provider를 생성한다는 의미는 아닙니다.

또한 Gateway 인스턴스의 Scope와 연결별 Provider Scope는 구분해서 이해해야 합니다.

WebSocket Gateway의 연결 관리, 세션 관리 및 Provider 구성에 관한 자세한 내용은 `05-platforms/websocket.md`에서 설명합니다.

### 15.2. Passport Strategy와 Scheduled Job

NestJS의 일부 구성 요소는 Singleton으로 동작해야 하는 제약이 있습니다.

대표적으로 Passport Strategy 및 Cron Controller와 같은 구성 요소에서는 Request-scoped 의존성의 사용에 주의해야 합니다.

이러한 구성 요소가 REQUEST Scope Provider에 직접 의존하면 생명주기와 인스턴스 관리 방식이 충돌할 수 있습니다.

따라서 요청 관련 데이터가 필요한 경우에는 해당 플랫폼에서 지원하는 적절한 Context 전달 방식이나 별도의 설계를 고려해야 합니다.

---

## 16. Injection Scope 선택 기준

Injection Scope는 인스턴스를 어떤 범위에서 공유해야 하는지에 따라 선택해야 합니다.

### 16.1. DEFAULT Scope가 적합한 경우

다음과 같은 Provider는 일반적으로 DEFAULT Scope가 적합합니다.

- 상태가 없는 비즈니스 Service
- Repository 및 데이터 접근 Service
- 데이터베이스 연결 풀 관리 Service
- 공통 설정 Service
- 애플리케이션 공통 로깅 Service
- 여러 요청에서 공유해도 안전한 기능

### 16.2. REQUEST Scope가 적합한 경우

다음과 같이 요청별로 독립적인 객체 상태가 필요한 경우 REQUEST Scope를 고려할 수 있습니다.

- 요청별 상태를 유지해야 하는 Service
- 요청 단위의 독립적인 처리 컨텍스트
- 요청별 객체 생성이 필수적인 기능
- 요청 단위로 격리해야 하는 특정 캐시

단순히 요청 ID나 사용자 정보를 조회하려는 목적이라면 REQUEST Scope 대신 다른 방법을 사용할 수도 있습니다.

### 16.3. TRANSIENT Scope가 적합한 경우

다음과 같이 Consumer별로 독립적인 인스턴스가 필요한 경우 TRANSIENT Scope를 고려할 수 있습니다.

- Consumer별 설정을 갖는 Logger
- Consumer별 내부 상태가 필요한 Helper
- 주입받는 클래스마다 독립적인 객체가 필요한 구성 요소

### 16.4. 선택 기준 비교

| 요구사항 | 우선 고려할 방식 |
|---|---|
| 여러 요청에서 동일한 Service를 재사용 | DEFAULT |
| 요청마다 독립적인 Provider 인스턴스가 필요 | REQUEST |
| Consumer마다 독립적인 Provider 인스턴스가 필요 | TRANSIENT |
| 요청별 ID만 전달하면 됨 | 메서드 매개변수 또는 AsyncLocalStorage |
| 데이터베이스 연결 풀 공유 | DEFAULT |
| 요청 단위의 상태 격리 | REQUEST 또는 별도 컨텍스트 관리 |
| Tenant별 Provider 인스턴스 공유 | Durable Provider 검토 |

---

## 17. 전체 구현 예제

세 가지 Scope의 차이를 확인할 수 있는 간단한 NestJS 애플리케이션을 구성합니다.

이 예제에서는 Provider 인스턴스에 생성 시점의 고유 식별자를 부여하고, Controller를 통해 해당 값을 확인합니다.

### 17.1. 디렉터리 구조

```text
src/
├── main.ts
├── app.module.ts
│
└── scopes/
    ├── instance-id.ts
    ├── singleton.service.ts
    ├── request.service.ts
    ├── transient.service.ts
    ├── consumers.service.ts
    ├── scopes.controller.ts
    └── scopes.module.ts
```

### 17.2. 인스턴스 식별자 생성

**scopes/instance-id.ts**

```typescript
import { randomUUID } from 'node:crypto';

export function createInstanceId(): string {
  return randomUUID();
}
```

`randomUUID()`를 사용하여 객체 생성 시점에 고유한 식별자를 생성합니다.

### 17.3. Singleton Provider

**scopes/singleton.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { createInstanceId } from './instance-id';

@Injectable()
export class SingletonService {
  readonly instanceId = createInstanceId();
}
```

별도의 Scope를 지정하지 않았으므로 DEFAULT Scope가 적용됩니다.

### 17.4. Request-scoped Provider

**scopes/request.service.ts**

```typescript
import {
  Injectable,
  Scope,
} from '@nestjs/common';

import { createInstanceId } from './instance-id';

@Injectable({
  scope: Scope.REQUEST,
})
export class RequestService {
  readonly instanceId = createInstanceId();
}
```

`RequestService`는 요청 컨텍스트별로 인스턴스를 생성합니다.

### 17.5. Transient Provider

**scopes/transient.service.ts**

```typescript
import {
  Injectable,
  Scope,
} from '@nestjs/common';

import { createInstanceId } from './instance-id';

@Injectable({
  scope: Scope.TRANSIENT,
})
export class TransientService {
  readonly instanceId = createInstanceId();
}
```

`TransientService`는 Consumer별로 별도의 인스턴스를 제공합니다.

### 17.6. Consumer Provider

두 Consumer에서 동일한 Transient Provider를 주입받도록 구성합니다.

**scopes/consumers.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { TransientService } from './transient.service';

@Injectable()
export class FirstConsumerService {
  constructor(
    private readonly transientService: TransientService,
  ) {}

  getInstanceId(): string {
    return this.transientService.instanceId;
  }
}

@Injectable()
export class SecondConsumerService {
  constructor(
    private readonly transientService: TransientService,
  ) {}

  getInstanceId(): string {
    return this.transientService.instanceId;
  }
}
```

두 Consumer는 각각 별도의 `TransientService` 인스턴스를 주입받습니다.

Consumer 자체는 기본 Singleton Scope입니다.

### 17.7. Controller 구현

**scopes/scopes.controller.ts**

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

import { SingletonService } from './singleton.service';
import { RequestService } from './request.service';

import {
  FirstConsumerService,
  SecondConsumerService,
} from './consumers.service';

@Controller('scopes')
export class ScopesController {
  constructor(
    private readonly singletonService: SingletonService,
    private readonly requestService: RequestService,
    private readonly firstConsumer: FirstConsumerService,
    private readonly secondConsumer: SecondConsumerService,
  ) {}

  @Get()
  getScopes() {
    return {
      singleton: this.singletonService.instanceId,
      request: this.requestService.instanceId,
      transient: {
        firstConsumer:
          this.firstConsumer.getInstanceId(),
        secondConsumer:
          this.secondConsumer.getInstanceId(),
      },
    };
  }
}
```

`ScopesController`는 Request-scoped Provider인 `RequestService`에 의존하므로 요청별 Scope의 영향을 받습니다.

그러나 Singleton Provider와 Singleton Consumer는 동일한 인스턴스를 재사용합니다.

### 17.8. Module 등록

**scopes/scopes.module.ts**

```typescript
import { Module } from '@nestjs/common';

import { ScopesController } from './scopes.controller';
import { SingletonService } from './singleton.service';
import { RequestService } from './request.service';
import { TransientService } from './transient.service';

import {
  FirstConsumerService,
  SecondConsumerService,
} from './consumers.service';

@Module({
  controllers: [ScopesController],
  providers: [
    SingletonService,
    RequestService,
    TransientService,
    FirstConsumerService,
    SecondConsumerService,
  ],
})
export class ScopesModule {}
```

### 17.9. Root Module

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ScopesModule } from './scopes/scopes.module';

@Module({
  imports: [ScopesModule],
})
export class AppModule {}
```

### 17.10. Bootstrap

**main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

### 17.11. API 요청

다음 엔드포인트를 호출합니다.

```http
GET /scopes
```

첫 번째 요청의 응답 예제는 다음과 같습니다.

```json
{
  "singleton": "singleton-instance-id",
  "request": "request-instance-a",
  "transient": {
    "firstConsumer": "transient-instance-a",
    "secondConsumer": "transient-instance-b"
  }
}
```

두 번째 요청의 응답 예제는 다음과 같습니다.

```json
{
  "singleton": "singleton-instance-id",
  "request": "request-instance-b",
  "transient": {
    "firstConsumer": "transient-instance-a",
    "secondConsumer": "transient-instance-b"
  }
}
```

위 JSON은 실제 UUID 대신 인스턴스의 공유 관계를 알아보기 쉬운 문자열로 표현한 예시입니다.

실행 시에는 UUID 문자열이 반환됩니다.

응답을 비교하면 다음과 같은 차이를 확인할 수 있습니다.

| 항목 | 첫 번째 요청과 두 번째 요청 |
|---|---|
| Singleton Provider | 동일한 Instance ID |
| Request Provider | 서로 다른 Instance ID |
| First Consumer의 Transient | 동일한 Consumer에서 재사용하므로 동일한 Instance ID |
| Second Consumer의 Transient | 동일한 Consumer에서 재사용하므로 동일한 Instance ID |
| First/Second Consumer 간 Transient | 서로 다른 Instance ID |

이 예제에서 중요한 점은 **Transient Provider가 Request Provider와 다르게 동작한다는 것**입니다.

Transient Provider는 Consumer별로 독립적인 인스턴스를 제공하지만, Singleton Consumer에 주입된 인스턴스는 여러 HTTP 요청에서 계속 사용될 수 있습니다.

---

## 18. 주요 개념 비교

Injection Scope와 관련된 주요 개념은 다음과 같습니다.

| 개념 | 설명 |
|---|---|
| Injection Scope | Provider 및 Controller의 인스턴스 생성과 공유 범위를 결정합니다. |
| DEFAULT | 기본 Singleton Scope입니다. |
| REQUEST | 요청 컨텍스트별로 인스턴스를 제공합니다. |
| TRANSIENT | Consumer별로 독립적인 인스턴스를 제공합니다. |
| Scope Bubbling | REQUEST Scope가 상위 의존성 체인에 영향을 주는 동작입니다. |
| `REQUEST` Token | 현재 요청 객체 또는 해당 실행 환경의 요청 컨텍스트에 접근하기 위한 토큰입니다. |
| `ModuleRef` | Provider를 프로그래밍 방식으로 조회하거나 해결하는 기능입니다. |
| Context ID | DI Context Sub-tree를 식별하는 값입니다. |
| `ContextIdFactory` | Context ID를 생성하거나 조회하는 기능을 제공합니다. |
| AsyncLocalStorage | 비동기 실행 흐름에서 컨텍스트 데이터를 관리하는 Node.js API입니다. |
| Durable Provider | 사용자 정의 Context ID 전략을 활용하여 논리적 컨텍스트별 인스턴스 공유를 구성할 수 있는 Provider입니다. |

---

## 19. 정리

NestJS의 Injection Scope는 Provider 및 Controller의 인스턴스가 생성되고 공유되는 범위를 정의하는 기능입니다.

주요 특징은 다음과 같습니다.

1. **DEFAULT Scope는 NestJS의 기본값입니다.** 일반적으로 애플리케이션 생명주기 동안 동일한 Provider 인스턴스를 재사용합니다.
2. **REQUEST Scope는 요청별 인스턴스를 제공합니다.** HTTP 요청마다 독립적인 Provider 상태가 필요한 경우에 사용할 수 있습니다.
3. **TRANSIENT Scope는 Consumer별 인스턴스를 제공합니다.** 요청마다 반드시 새로운 인스턴스를 생성하는 것은 아닙니다.
4. **REQUEST Scope는 상위 의존성 체인으로 전파될 수 있습니다.** Request-scoped Provider를 주입받는 Controller나 Provider도 요청별 Scope의 영향을 받을 수 있습니다.
5. **Singleton Provider의 공유 상태는 신중하게 관리해야 합니다.** 요청별 데이터를 인스턴스 필드에 저장하면 다른 요청과 상태가 공유될 수 있습니다.
6. **ModuleRef와 Context ID로 Scoped Provider를 동적으로 해결할 수 있습니다.** 동일한 Context ID를 사용하면 요청 컨텍스트의 Provider 인스턴스를 공유할 수 있습니다.
7. **REQUEST Scope는 추가적인 인스턴스 생성 비용을 발생시킵니다.** 성능과 메모리 사용량을 고려하여 필요한 경우에만 적용하는 것이 좋습니다.
8. **AsyncLocalStorage는 요청별 컨텍스트 관리의 대안이 될 수 있습니다.** Provider를 Singleton으로 유지하면서 비동기 실행 컨텍스트의 값을 조회할 수 있습니다.
9. **Durable Provider는 논리적 컨텍스트별 인스턴스 공유를 지원합니다.** Multi-tenancy와 같이 다수의 요청을 특정 컨텍스트로 묶어야 하는 경우에 활용할 수 있습니다.
10. **Scope의 의미는 실행 플랫폼에 따라 달라질 수 있습니다.** 특히 WebSocket과 HTTP는 요청 및 연결 생명주기가 서로 다릅니다.

Injection Scope를 이해할 때 가장 중요한 점은 **DEFAULT는 Provider 등록 단위의 재사용, REQUEST는 요청 컨텍스트 단위의 분리, TRANSIENT는 Consumer 단위의 분리라는 서로 다른 인스턴스 관리 기준을 가진다는 것**입니다.

일반적인 NestJS 애플리케이션에서는 DEFAULT Scope를 우선적으로 사용하고, 요청 또는 Consumer별 인스턴스 분리가 실제로 필요한 경우에 다른 Scope를 적용하는 것이 좋습니다.

---

## 20. 관련 문서

- `modules.md`: Module의 Provider 등록 및 공유 범위
- `controllers.md`: Controller의 역할과 인스턴스 관리
- `providers.md`: Provider의 기본 개념과 역할
- `dependency-injection.md`: DI Container와 의존성 해결 과정
- `custom-providers.md`: Custom Provider 및 Injection Token
- `dynamic-modules.md`: Dynamic Module과 설정 가능한 Provider
- `../02-request-lifecycle/execution-context.md`: 요청 처리 과정의 실행 컨텍스트
- `../03-techniques/logging.md`: 요청 추적 및 로깅 구성
- `../05-platforms/websocket.md`: WebSocket Gateway와 연결 생명주기
- `../06-testing/testing-modules.md`: Testing Module과 Provider 조회
- `../07-architecture/dependency-management.md`: 의존성 관리와 Scope 설계
- `../08-deployment/performance.md`: 인스턴스 생성 비용 및 성능 관리

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)  
  DEFAULT, REQUEST, TRANSIENT Scope와 Scope Hierarchy, REQUEST Provider, Durable Provider 및 성능 고려사항을 설명합니다.

- [NestJS Providers](https://docs.nestjs.com/providers)  
  Provider의 기본 개념과 Dependency Injection을 통한 인스턴스 관리 방식을 설명합니다.

- [NestJS Modules](https://docs.nestjs.com/modules)  
  Module의 Provider 등록 및 공유 방식을 설명합니다.

- [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref)  
  ModuleRef, `get()`, `resolve()`, Context ID 및 요청 컨텍스트에서 Provider를 해결하는 방법을 설명합니다.

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)  
  Custom Provider의 등록 방식과 Injection Token 구성을 설명합니다.

- [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)  
  Provider의 초기화와 종료 과정에서 실행되는 Lifecycle Hook을 설명합니다.

- [NestJS Async Local Storage](https://docs.nestjs.com/recipes/async-local-storage)  
  AsyncLocalStorage를 사용하여 비동기 실행 컨텍스트에서 요청별 데이터를 관리하는 방법을 설명합니다.

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)  
  Scoped Provider와 Testing Module의 구성 및 테스트 방법을 설명합니다.

- [NestJS WebSocket Gateways](https://docs.nestjs.com/websockets/gateways)  
  WebSocket Gateway의 구성과 Request-scoped Provider 지원 범위를 설명합니다.

### Node.js 공식 문서

- [Node.js Async Context](https://nodejs.org/api/async_context.html)  
  AsyncLocalStorage와 비동기 실행 컨텍스트 관리 API를 설명합니다.

### GitHub Repository

- [NestJS 공식 GitHub Repository](https://github.com/nestjs/nest)  
  NestJS 프레임워크의 소스 코드와 내부 구현을 확인할 수 있습니다.

- [NestJS Core Injector 구현](https://github.com/nestjs/nest/tree/master/packages/core/injector)  
  Provider 인스턴스 생성, Scope 및 Context ID 처리와 관련된 내부 구현을 확인할 수 있습니다.

- [NestJS 공식 예제 Repository](https://github.com/nestjs/nest/tree/master/sample)  
  Provider, Dependency Injection 및 다양한 기능의 구현 예제를 확인할 수 있습니다.