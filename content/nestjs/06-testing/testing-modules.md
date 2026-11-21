# Testing Modules

## 1. 개요

NestJS의 TestingModule은 테스트 환경에서 NestJS의 Module 및 Dependency Injection(DI) 시스템을 구성하기 위한 테스트 전용 모듈입니다.

NestJS 애플리케이션은 Module을 중심으로 Controller, Provider 및 다른 Module 사이의 의존성을 관리합니다.

일반적인 애플리케이션에서는 `NestFactory`를 사용하여 이러한 의존성 구조를 초기화하지만, 테스트 환경에서는 `@nestjs/testing` 패키지에서 제공하는 `Test.createTestingModule()`을 사용할 수 있습니다.

TestingModule을 사용하면 실제 애플리케이션 전체를 실행하지 않고도 테스트에 필요한 Provider와 Controller를 등록하고, 의존성을 주입하며, 특정 Provider를 Mock 객체로 대체할 수 있습니다.

TestingModule은 Unit Testing, Integration Testing 및 E2E Testing에서 공통적으로 활용됩니다.

### 1.1. TestingModule의 주요 역할

- **테스트용 DI 컨테이너 구성:** 테스트에 필요한 Provider와 Controller를 등록합니다.
- **Dependency Injection:** 실제 NestJS 애플리케이션과 동일한 DI 메커니즘을 활용합니다.
- **Provider 인스턴스 조회:** Injection Token을 통해 등록된 Provider를 가져옵니다.
- **Provider Override:** 실제 구현을 테스트용 구현으로 대체합니다.
- **Module 구성 검증:** Module의 Import, Export 및 의존성 관계를 검증합니다.
- **Scope 관리:** Singleton, Request 및 Transient Scope의 Provider를 처리합니다.
- **테스트 애플리케이션 생성:** E2E 테스트를 위한 Nest Application을 생성할 수 있습니다.

### 1.2. 일반 Module과 TestingModule의 차이

| 구분 | Module | TestingModule |
|---|---|---|
| 주요 목적 | 애플리케이션 기능 구성 | 테스트 환경 구성 |
| 생성 방법 | `@Module()` | `Test.createTestingModule()` |
| Provider 등록 | `providers` | `providers` |
| Module Import | `imports` | `imports` |
| Controller 등록 | `controllers` | `controllers` |
| DI 지원 | 지원 | 지원 |
| Provider Override | Custom Provider 등으로 구성 | 테스트 전용 Override API 제공 |
| HTTP 서버 | 애플리케이션 생성 시 사용 | 별도 애플리케이션 생성 필요 |
| 주요 사용 환경 | 애플리케이션 실행 | 자동화 테스트 |

TestingModule은 일반 Module과 별개의 DI 메커니즘을 사용하는 것이 아닙니다.

NestJS의 기존 Module 및 DI 시스템을 테스트 환경에서 활용할 수 있도록 제공하는 기능입니다.

---

## 2. TestingModule의 구조

NestJS TestingModule은 `Test.createTestingModule()`을 통해 생성합니다.

이 메서드는 `TestingModuleBuilder`를 반환하며, `compile()`을 호출하면 테스트용 모듈이 구성됩니다.

### 2.1. TestingModule 생성 과정

```text
       Test.createTestingModule()
                  │
                  ▼
        TestingModuleBuilder
                  │
                  ▼
           Module Metadata
                  │
          ┌───────┼───────┐
          ▼       ▼       ▼
       imports providers controllers
          │       │       │
          └───────┼───────┘
                  ▼
               compile()
                  │
                  ▼
          Dependency Scanner
                  │
                  ▼
          DI Container 구성
                  │
                  ▼
          Provider 인스턴스 생성
                  │
                  ▼
             TestingModule
                  │
                  ▼
             get() / resolve()
                  │
                  ▼
              테스트 실행
```

### 2.2. 주요 구성 요소

| 구성 요소 | 설명 |
|---|---|
| `Test` | NestJS 테스트 환경을 구성하기 위한 진입점입니다. |
| `createTestingModule()` | 테스트 모듈의 메타데이터를 정의합니다. |
| `TestingModuleBuilder` | 테스트 모듈 설정 및 Override를 수행합니다. |
| `compile()` | 모듈과 Provider 의존성을 분석하고 인스턴스를 구성합니다. |
| `TestingModule` | 컴파일된 테스트 모듈을 나타냅니다. |
| `get()` | 등록된 정적 Provider 또는 Controller 인스턴스를 조회합니다. |
| `resolve()` | Scoped Provider를 동적으로 조회합니다. |
| `select()` | 특정 Module Context를 선택합니다. |

### 2.3. TestingModule과 DI Container

TestingModule은 NestJS의 DI Container를 활용합니다.

예를 들어 `UsersService`가 `UsersRepository`에 의존한다면 다음과 같은 관계가 구성됩니다.

```text
          TestingModule
                │
                ▼
            DI Container
                │
                ▼
           UsersService
                │
                │ Constructor Injection
                ▼
          UsersRepository
```

NestJS는 Provider의 Injection Token을 기반으로 의존성을 해결합니다.

따라서 테스트 환경에서도 실제 애플리케이션과 동일한 Constructor Injection 패턴을 사용할 수 있습니다.

---

## 3. 테스트 환경 구성

### 3.1. 패키지 설치

TestingModule은 `@nestjs/testing` 패키지에서 제공합니다.

해당 패키지가 설치되어 있지 않다면 다음 명령어로 설치합니다.

```bash
npm install --save-dev @nestjs/testing
```

테스트 실행 프레임워크로 Vitest를 사용하는 경우 다음 패키지를 설치할 수 있습니다.

```bash
npm install --save-dev vitest
```

`@nestjs/testing`은 특정 테스트 실행 프레임워크에 종속되지 않습니다.

따라서 Jest를 사용하는 프로젝트에서도 동일한 TestingModule API를 활용할 수 있습니다.

NestJS와 `@nestjs/testing`의 주요 버전은 서로 호환되도록 관리해야 합니다.

### 3.2. 프로젝트 구조

```text
src/
├── app.module.ts
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.service.ts
    ├── users.repository.ts
    ├── users.service.spec.ts
    └── users.module.spec.ts

test/
├── integration/
│   └── users.integration.spec.ts
└── e2e/
    └── users.e2e-spec.ts
```

TestingModule은 특정 테스트 파일 위치를 요구하지 않습니다.

프로젝트에서는 테스트 목적에 따라 Unit, Integration 및 E2E 테스트 파일을 분리하여 관리할 수 있습니다.

---

## 4. 기본 TestingModule 생성

TestingModule을 생성하는 가장 기본적인 방법은 `Test.createTestingModule()`에 Provider를 등록하는 것입니다.

### 4.1. 테스트 대상 Service

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  findAll(): string[] {
    return ['Alice', 'Bob'];
  }
}
```

### 4.2. TestingModule 작성

```typescript
// users.service.spec.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from './users.service';

describe('UsersService', () => {
  let moduleRef: TestingModule;
  let usersService: UsersService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    usersService =
      moduleRef.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('UsersService가 생성되어야 합니다.', () => {
    expect(usersService).toBeDefined();
  });

  it('사용자 목록을 반환해야 합니다.', () => {
    expect(usersService.findAll()).toEqual([
      'Alice',
      'Bob',
    ]);
  });
});
```

### 4.3. 코드 분석

**`Test.createTestingModule()`**

테스트 모듈의 메타데이터를 정의합니다.

```typescript
Test.createTestingModule({
  providers: [UsersService],
});
```

일반적인 `@Module()`과 유사하게 Provider, Controller 및 Import할 Module을 지정할 수 있습니다.

**`compile()`**

모듈 메타데이터와 의존성 관계를 분석하여 테스트용 DI Container를 구성합니다.

```typescript
const moduleRef =
  await Test.createTestingModule({
    providers: [UsersService],
  }).compile();
```

`compile()`은 비동기 메서드이므로 `await`를 사용해야 합니다.

**`moduleRef.get()`**

등록된 Provider의 인스턴스를 가져옵니다.

```typescript
const usersService =
  moduleRef.get<UsersService>(UsersService);
```

`UsersService` 클래스가 Injection Token으로 사용됩니다.

**`moduleRef.close()`**

테스트 모듈의 종료 절차를 수행합니다.

테스트에서 외부 연결이나 종료 Lifecycle을 사용하는 경우 리소스 정리를 위해 중요합니다.

---

## 5. TestingModule 메타데이터

`Test.createTestingModule()`은 NestJS Module과 유사한 메타데이터를 사용합니다.

대표적인 설정 항목은 다음과 같습니다.

| 속성 | 설명 |
|---|---|
| `imports` | 다른 Module을 가져옵니다. |
| `controllers` | 테스트할 Controller를 등록합니다. |
| `providers` | Provider를 등록합니다. |
| `exports` | 다른 Module에 공개할 Provider 또는 Module을 지정합니다. |

### 5.1. providers

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    UsersRepository,
  ],
}).compile();
```

등록된 Provider들은 DI Container에서 관리됩니다.

각 Provider의 의존성이 정상적으로 해결되면 필요한 인스턴스가 생성됩니다.

### 5.2. controllers

```typescript
const moduleRef = await Test.createTestingModule({
  controllers: [UsersController],
  providers: [UsersService],
}).compile();
```

Controller에 필요한 Provider도 함께 등록해야 합니다.

### 5.3. imports

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [UsersModule],
}).compile();
```

실제 Module을 Import하면 해당 Module의 Provider 및 의존성 구성을 테스트 환경에 포함할 수 있습니다.

단, Import된 Module이 데이터베이스 또는 외부 시스템과 연결되는 경우 테스트 환경에서도 해당 의존성이 생성될 수 있습니다.

### 5.4. exports

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [UsersService],
  exports: [UsersService],
}).compile();
```

`exports`는 Module의 공개 Provider를 정의하는 메타데이터입니다.

단일 테스트 모듈에서 Provider를 조회하기 위해 반드시 `exports`를 설정해야 하는 것은 아닙니다.

Provider의 Export 계약을 검증하려면 실제 Module 간 Import 및 Export 관계를 구성하는 것이 적절합니다.

---

## 6. Constructor Injection 테스트

TestingModule은 NestJS의 Constructor Injection을 실제로 수행합니다.

### 6.1. Repository 구현

```typescript
// users.repository.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersRepository {
  findAll(): string[] {
    return ['Alice', 'Bob'];
  }
}
```

### 6.2. Service 구현

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';

import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  findAll(): string[] {
    return this.usersRepository.findAll();
  }
}
```

### 6.3. 의존성 주입 테스트

```typescript
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService DI', () => {
  let moduleRef: TestingModule;
  let usersService: UsersService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        UsersRepository,
      ],
    }).compile();

    usersService =
      moduleRef.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('Repository 의존성이 정상적으로 주입되어야 합니다.', () => {
    expect(usersService.findAll()).toEqual([
      'Alice',
      'Bob',
    ]);
  });
});
```

이 테스트에서는 `UsersService`를 직접 생성하지 않습니다.

NestJS DI Container가 `UsersRepository`의 인스턴스를 생성하고 `UsersService`에 주입합니다.

따라서 Service와 Repository 사이의 의존성 구성이 정상적으로 동작하는지 검증할 수 있습니다.

---

## 7. Provider 조회: get()

`TestingModule.get()`은 테스트 모듈에 등록된 정적 Provider 또는 Controller 인스턴스를 가져옵니다.

일반적으로 Singleton Scope의 Provider를 조회할 때 사용합니다.

### 7.1. 기본 조회

```typescript
const usersService =
  moduleRef.get<UsersService>(UsersService);
```

### 7.2. 문자열 Injection Token 조회

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    {
      provide: 'API_URL',
      useValue: 'https://api.example.com',
    },
  ],
}).compile();

const apiUrl = moduleRef.get<string>('API_URL');
```

Provider가 문자열 Token으로 등록되어 있다면 조회할 때도 동일한 Token을 사용해야 합니다.

### 7.3. Symbol Injection Token 조회

```typescript
const API_TOKEN = Symbol('API_TOKEN');

const moduleRef = await Test.createTestingModule({
  providers: [
    {
      provide: API_TOKEN,
      useValue: 'test-value',
    },
  ],
}).compile();

const value = moduleRef.get<string>(API_TOKEN);
```

Symbol Token은 문자열 충돌을 방지하는 데 활용할 수 있습니다.

단, 동일한 설명 문자열을 사용하더라도 서로 다른 `Symbol()` 호출로 생성한 Token은 동일하지 않습니다.

### 7.4. get()의 주요 특징

- Injection Token을 기준으로 Provider를 조회합니다.
- 정적으로 생성된 Provider 인스턴스를 가져옵니다.
- 기본적인 Singleton Provider 테스트에 적합합니다.
- 등록되지 않은 Provider를 조회하면 예외가 발생합니다.
- Request 또는 Transient Scope Provider는 일반적으로 `resolve()`를 사용해야 합니다.

---

## 8. Provider Scope와 resolve()

NestJS Provider에는 Singleton, Request 및 Transient Scope가 있습니다.

TestingModule에서 Provider를 조회할 때는 Scope에 따라 적절한 API를 사용해야 합니다.

### 8.1. Provider Scope 비교

| Scope | 설명 | 주요 조회 방식 |
|---|---|---|
| DEFAULT | 일반적으로 하나의 인스턴스를 공유합니다. | `get()` |
| REQUEST | 요청 Context마다 인스턴스를 생성합니다. | `resolve()` |
| TRANSIENT | 주입받는 소비자별로 별도 인스턴스를 생성합니다. | `resolve()` |

### 8.2. Request Scope Provider

```typescript
// request.service.ts
import {
  Injectable,
  Scope,
} from '@nestjs/common';

@Injectable({
  scope: Scope.REQUEST,
})
export class RequestService {
  readonly createdAt = Date.now();
}
```

Request Scope Provider는 일반적인 `get()`으로 조회할 수 없습니다.

`resolve()`를 사용해야 합니다.

```typescript
const first =
  await moduleRef.resolve(RequestService);

const second =
  await moduleRef.resolve(RequestService);

expect(first).not.toBe(second);
```

각 `resolve()` 호출은 기본적으로 별도의 DI Context 하위 트리를 생성하므로 서로 다른 인스턴스를 반환할 수 있습니다.

### 8.3. ContextIdFactory 사용

동일한 DI Context에서 Provider를 조회하려면 `ContextIdFactory`를 사용할 수 있습니다.

```typescript
import { ContextIdFactory } from '@nestjs/core';

const contextId = ContextIdFactory.create();

const first = await moduleRef.resolve(
  RequestService,
  contextId,
);

const second = await moduleRef.resolve(
  RequestService,
  contextId,
);

expect(first).toBe(second);
```

`ContextIdFactory.create()`는 새로운 Context Identifier를 생성합니다.

동일한 Context Identifier를 전달하면 같은 DI 하위 트리에서 해당 Provider를 조회할 수 있습니다.

### 8.4. REQUEST 객체 등록

Request Scope Provider에서 `REQUEST` Token을 사용하는 경우 테스트용 Request 객체를 등록할 수 있습니다.

```typescript
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST, ContextIdFactory } from '@nestjs/core';

@Injectable({
  scope: Scope.REQUEST,
})
export class RequestInfoService {
  constructor(
    @Inject(REQUEST)
    private readonly request: {
      user?: { id: number };
    },
  ) {}

  getUserId(): number | undefined {
    return this.request.user?.id;
  }
}
```

테스트에서는 다음과 같이 Context를 구성합니다.

```typescript
const contextId = ContextIdFactory.create();

moduleRef.registerRequestByContextId(
  {
    user: {
      id: 100,
    },
  },
  contextId,
);

const service = await moduleRef.resolve(
  RequestInfoService,
  contextId,
);

expect(service.getUserId()).toBe(100);
```

`registerRequestByContextId()`는 특정 DI Context에 테스트용 Request 객체를 등록합니다.

이 방식은 Request Scope Provider가 HTTP Request에 포함된 사용자 정보나 요청 메타데이터를 참조하는 경우 유용합니다.

---

## 9. Module 선택: select()

`TestingModule.select()`는 Module의 의존성 그래프에서 특정 Module Context를 선택할 때 사용합니다.

여러 Module에 동일한 Injection Token이 등록되어 있는 경우 원하는 Module의 Provider를 명확하게 조회할 수 있습니다.

### 9.1. 기본 사용법

```typescript
const usersModuleRef =
  moduleRef.select(UsersModule);

const usersService =
  usersModuleRef.get(UsersService, {
    strict: true,
  });
```

`strict: true`는 선택한 Module Context를 기준으로 Provider를 조회하도록 지정합니다.

### 9.2. strict 옵션

| 옵션 | 설명 |
|---|---|
| `strict: true` | 선택한 Module Context 내에서 Provider를 조회합니다. |
| `strict: false` | 현재 선택한 Module을 넘어 다른 Module의 Provider도 탐색할 수 있습니다. |

예를 들어 다음과 같은 구조가 있다고 가정하겠습니다.

```text
             AppModule
                 │
        ┌────────┴────────┐
        ▼                 ▼
    UsersModule       OrdersModule
        │                 │
        ▼                 ▼
    UsersService      OrdersService
```

특정 Module에 등록된 Provider를 명확하게 조회하려면 `select()`와 `strict: true`를 함께 사용할 수 있습니다.

### 9.3. 사용 시 주의사항

`get()`과 `select()`를 통해 Provider를 조회할 수 있다는 사실이 해당 Provider가 다른 Module에 Export되어 있다는 의미는 아닙니다.

Module의 Import 및 Export 관계를 검증하려면 실제 소비자 Module을 구성하고 의존성 주입이 성공하는지 확인해야 합니다.

---

## 10. Provider Override

TestingModule에서는 실제 Provider 구현을 테스트용 구현으로 대체할 수 있습니다.

이를 통해 데이터베이스, 외부 API 또는 메시지 브로커 등에 대한 의존성을 분리할 수 있습니다.

### 10.1. overrideProvider()

다음은 실제 Service에 주입되는 Repository를 Mock 객체로 대체하는 예제입니다.

```typescript
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

const mockUsersRepository = {
  findAll: vi.fn().mockReturnValue([
    'Alice',
    'Bob',
  ]),
};

const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    UsersRepository,
  ],
})
  .overrideProvider(UsersRepository)
  .useValue(mockUsersRepository)
  .compile();
```

이 코드에서는 `UsersRepository`를 실제로 생성하는 대신 `mockUsersRepository` 객체를 사용합니다.

### 10.2. Override 방식 비교

| API | 설명 |
|---|---|
| `useValue()` | 기존 객체 또는 Mock 객체를 주입합니다. |
| `useClass()` | 지정한 클래스로 Provider 구현을 대체합니다. |
| `useFactory()` | Factory Function을 사용하여 Provider를 생성합니다. |

### 10.3. useClass()

```typescript
class MockUsersRepository {
  findAll(): string[] {
    return ['Mock User'];
  }
}

const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    UsersRepository,
  ],
})
  .overrideProvider(UsersRepository)
  .useClass(MockUsersRepository)
  .compile();
```

`useClass()`는 테스트용 클래스를 NestJS DI Container에서 생성하도록 구성합니다.

### 10.4. useFactory()

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    UsersRepository,
  ],
})
  .overrideProvider(UsersRepository)
  .useFactory({
    factory: () => ({
      findAll: () => ['Factory User'],
    }),
  })
  .compile();
```

`useFactory()`는 Factory Function의 반환값을 Provider로 사용합니다.

필요한 경우 다른 Provider를 Factory에 주입하는 방식도 구성할 수 있습니다.

### 10.5. Override 적용 시점

Override는 `compile()`을 호출하기 전에 설정해야 합니다.

```text
       createTestingModule()
                 │
                 ▼
          overrideProvider()
                 │
                 ▼
             useValue()
                 │
                 ▼
              compile()
                 │
                 ▼
          TestingModule
```

컴파일이 완료된 이후에는 일반적으로 TestingModuleBuilder의 Override 설정을 추가하는 방식으로 기존 모듈 구성을 변경하지 않습니다.

Provider Mocking의 구체적인 전략과 사용법은 `mocking-providers.md` 문서에서 별도로 설명합니다.

---

## 11. Module Override

NestJS에서는 특정 Provider뿐만 아니라 Module 전체를 테스트용 Module로 대체할 수 있습니다.

이를 위해 `overrideModule()`을 사용합니다.

### 11.1. Module Override 예제

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideModule(ExternalApiModule)
  .useModule(MockExternalApiModule)
  .compile();
```

이 예제는 `AppModule`이 `ExternalApiModule`을 Import하고 있으며, `MockExternalApiModule`이 이를 대체할 수 있도록 구성되어 있다고 가정합니다.

### 11.2. 사용 목적

Module Override는 다음과 같은 상황에서 유용합니다.

- 외부 API Module을 테스트용 Module로 교체하는 경우
- 실제 데이터베이스 연결 Module을 테스트 구성으로 교체하는 경우
- 특정 기능 Module 전체를 테스트 범위에서 제외하거나 대체하는 경우
- 복잡한 Module 의존성을 테스트 환경에 맞게 단순화하는 경우

### 11.3. Provider Override와 비교

| 구분 | Provider Override | Module Override |
|---|---|---|
| API | `overrideProvider()` | `overrideModule()` |
| 대체 범위 | 개별 Provider | Module 전체 |
| 대체 방법 | `useValue`, `useClass`, `useFactory` | `useModule` |
| 주요 목적 | 특정 의존성 대체 | Module 구성 전체 대체 |

Module Override는 교체 범위가 넓으므로 실제 Module의 연동을 검증해야 하는 Integration Testing에서는 신중하게 사용해야 합니다.

---

## 12. Guard, Pipe, Interceptor 및 Filter Override

TestingModuleBuilder에서는 Provider 외에도 NestJS의 Request Lifecycle 구성 요소를 대체할 수 있습니다.

| API | 설명 |
|---|---|
| `overrideGuard()` | Guard를 대체합니다. |
| `overridePipe()` | Pipe를 대체합니다. |
| `overrideInterceptor()` | Interceptor를 대체합니다. |
| `overrideFilter()` | Exception Filter를 대체합니다. |

### 12.1. Guard Override

```typescript
import { CanActivate, ExecutionContext } from '@nestjs/common';

class MockAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean {
    return true;
  }
}
```

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideGuard(AuthGuard)
  .useClass(MockAuthGuard)
  .compile();
```

이 예제는 `AuthGuard`가 실제 애플리케이션의 Controller 또는 Route에 적용되어 있다고 가정합니다.

테스트 환경에서는 해당 Guard를 `MockAuthGuard`로 대체합니다.

### 12.2. Global Guard Override

`APP_GUARD`를 사용하여 전역 Guard를 등록한 경우에는 주의가 필요합니다.

다음과 같이 `useClass`로 직접 등록한 Global Guard는 해당 클래스 Token을 이용한 Override가 바로 적용되지 않을 수 있습니다.

```typescript
{
  provide: APP_GUARD,
  useClass: AuthGuard,
}
```

전역 Guard를 일반 Provider로도 등록하고 `useExisting`으로 참조하도록 구성하면 테스트에서 해당 Provider를 Override할 수 있습니다.

```typescript
providers: [
  AuthGuard,
  {
    provide: APP_GUARD,
    useExisting: AuthGuard,
  },
]
```

테스트에서는 다음과 같이 구성합니다.

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(AuthGuard)
  .useClass(MockAuthGuard)
  .compile();
```

`APP_GUARD`, `APP_PIPE`, `APP_INTERCEPTOR`, `APP_FILTER`는 전역 구성 요소 등록에 사용되는 Token이므로, 일반 Provider와 동일한 방식으로 무조건 Override할 수 있다고 가정해서는 안 됩니다.

---

## 13. useMocker()를 이용한 자동 Mock 생성

NestJS는 `TestingModuleBuilder.useMocker()`를 통해 누락된 의존성에 대한 Mock 생성 함수를 등록할 수 있습니다.

여러 의존성을 가진 클래스를 테스트하는 경우 모든 Provider를 수동으로 등록하는 작업을 줄일 수 있습니다.

### 13.1. 기본 구조

```typescript
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

const moduleRef = await Test.createTestingModule({
  controllers: [UsersController],
})
  .useMocker((token) => {
    if (token === UsersService) {
      return {
        findAll: vi.fn().mockReturnValue([
          'Alice',
          'Bob',
        ]),
      };
    }

    return undefined;
  })
  .compile();
```

이 예제는 `UsersController`가 `UsersService`를 Constructor Injection으로 주입받는다고 가정합니다.

`UsersService`가 테스트 모듈에 등록되지 않았기 때문에 `useMocker()`가 해당 의존성을 처리할 수 있습니다.

### 13.2. 주요 특징

- 누락된 의존성에 대해 Mock Factory를 사용할 수 있습니다.
- Class Token을 기준으로 Mock 객체를 반환할 수 있습니다.
- 복잡한 의존성 구조를 가진 클래스를 테스트할 때 유용합니다.
- 반환할 Mock이 없는 경우 `undefined`를 반환할 수 있습니다.

다만 `useMocker()`는 이미 정상적으로 등록된 모든 Provider를 자동으로 대체하는 기능이 아닙니다.

이미 등록된 Provider를 명시적으로 대체하려면 `overrideProvider()`를 사용하는 것이 적절합니다.

또한 `REQUEST`, `INQUIRER`와 같은 특별한 Context Provider는 일반적인 자동 Mock 대상과 구분하여 처리해야 합니다.

---

## 14. TestingModule과 Nest Application

TestingModule과 Nest Application은 서로 다른 역할을 담당합니다.

TestingModule은 Provider와 Module의 의존성 구성을 관리하며, Nest Application은 실제 애플리케이션의 요청 처리 환경을 제공합니다.

### 14.1. TestingModule만 사용하는 경우

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [UsersService],
}).compile();

const usersService =
  moduleRef.get<UsersService>(UsersService);
```

이 방식은 Service나 Repository의 메서드를 직접 호출하는 Unit Testing 및 Integration Testing에 적합합니다.

HTTP 서버를 생성하지 않습니다.

### 14.2. Nest Application을 생성하는 경우

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
}).compile();

const app = moduleRef.createNestApplication();

await app.init();
```

`createNestApplication()`은 TestingModule을 기반으로 Nest Application을 생성합니다.

`app.init()`은 애플리케이션 초기화 과정을 수행합니다.

### 14.3. 구조 비교

```text
           TestingModule
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
   get() / resolve()  createNestApplication()
         │                │
         ▼                ▼
    Provider 호출       app.init()
         │                │
         ▼                ▼
   Unit / Integration    HTTP Request
                          │
                          ▼
                       E2E Test
```

### 14.4. 주요 차이

| 구분 | TestingModule | Nest Application |
|---|---|---|
| 목적 | DI 및 Module 테스트 | 애플리케이션 동작 테스트 |
| HTTP 요청 처리 | 직접 제공하지 않음 | 지원 |
| Provider 조회 | 지원 | 지원 |
| Lifecycle 초기화 | 컴파일 중심 | `app.init()` 수행 |
| 대표 사용 | Unit, Integration | E2E |
| 종료 | `moduleRef.close()` | `app.close()` |

HTTP 관련 기능을 검증할 필요가 없다면 Nest Application을 생성하지 않고 TestingModule만 사용하는 것이 더 간단합니다.

---

## 15. TestingModule과 Lifecycle

NestJS는 Module과 Provider의 생성 및 종료 과정에서 Lifecycle Hook을 제공합니다.

대표적인 Lifecycle Hook은 다음과 같습니다.

| Hook | 설명 |
|---|---|
| `onModuleInit()` | Module 초기화 과정에서 호출됩니다. |
| `onApplicationBootstrap()` | 애플리케이션 초기화 이후 호출됩니다. |
| `onModuleDestroy()` | 종료 과정에서 호출됩니다. |
| `beforeApplicationShutdown()` | 애플리케이션 종료 과정에서 호출됩니다. |
| `onApplicationShutdown()` | 애플리케이션 종료 과정에서 호출됩니다. |

### 15.1. compile()과 초기화의 차이

`compile()`은 테스트 모듈의 의존성을 구성하고 Provider 인스턴스를 생성하는 과정입니다.

하지만 `compile()`을 호출했다고 해서 애플리케이션의 모든 초기화 Lifecycle Hook이 실행되는 것은 아닙니다.

예를 들어 `OnModuleInit`에 의존하는 기능을 테스트하려면 애플리케이션 초기화 과정이 필요할 수 있습니다.

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
}).compile();

const app = moduleRef.createNestApplication();

await app.init();
```

### 15.2. Lifecycle 테스트 예제

```typescript
import {
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class InitializationService
  implements OnModuleInit
{
  initialized = false;

  onModuleInit(): void {
    this.initialized = true;
  }
}
```

다음 테스트에서는 `app.init()` 이후 Lifecycle Hook이 실행되었는지 확인합니다.

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [InitializationService],
}).compile();

const app = moduleRef.createNestApplication();

try {
  const service =
    moduleRef.get<InitializationService>(
      InitializationService,
    );

  expect(service.initialized).toBe(false);

  await app.init();

  expect(service.initialized).toBe(true);
} finally {
  await app.close();
}
```

이 예제는 `onModuleInit()`이 애플리케이션 초기화 과정에서 실행된다는 점을 보여줍니다.

### 15.3. 리소스 정리

테스트에서 생성한 Nest Application은 테스트 종료 시 닫아야 합니다.

```typescript
afterAll(async () => {
  await app.close();
});
```

TestingModule만 사용하는 경우에는 다음과 같이 종료할 수 있습니다.

```typescript
afterAll(async () => {
  await moduleRef.close();
});
```

다만 애플리케이션 외부에서 직접 생성한 리소스는 별도로 정리해야 합니다.

예를 들어 Testcontainers로 생성한 Docker 컨테이너나 테스트 코드에서 직접 생성한 독립적인 데이터베이스 연결은 Nest Application 종료만으로 정리되지 않을 수 있습니다.

---

## 16. TestingModule 재사용과 테스트 격리

TestingModule은 테스트마다 새로 생성하거나 테스트 그룹에서 재사용할 수 있습니다.

어떤 방식을 선택할지는 테스트 대상의 상태 관리 방식과 실행 비용에 따라 달라집니다.

### 16.1. 테스트마다 생성

```typescript
let moduleRef: TestingModule;

beforeEach(async () => {
  moduleRef = await Test.createTestingModule({
    providers: [UsersService],
  }).compile();
});

afterEach(async () => {
  await moduleRef.close();
});
```

이 방식은 테스트마다 새로운 DI Container를 구성합니다.

따라서 테스트 모듈 내부의 Singleton Provider 상태가 테스트 사이에 공유되는 문제를 줄일 수 있습니다.

### 16.2. 테스트 그룹에서 재사용

```typescript
let moduleRef: TestingModule;

beforeAll(async () => {
  moduleRef = await Test.createTestingModule({
    providers: [UsersService],
  }).compile();
});

afterAll(async () => {
  await moduleRef.close();
});
```

이 방식은 TestingModule 생성 비용을 줄일 수 있습니다.

하지만 여러 테스트가 동일한 Singleton Provider 인스턴스를 공유할 수 있습니다.

### 16.3. 재사용 전략 비교

| 구분 | 테스트마다 생성 | 테스트 그룹에서 재사용 |
|---|---|---|
| 생성 시점 | `beforeEach()` | `beforeAll()` |
| 실행 비용 | 상대적으로 높음 | 상대적으로 낮음 |
| Provider 상태 | 테스트별로 분리 | 공유 가능 |
| 테스트 격리 | 관리하기 쉬움 | 별도 초기화 필요 |
| 주요 사용 | 상태가 변경되는 테스트 | 상태가 없는 Provider 테스트 |

### 16.4. 외부 리소스의 상태

새로운 TestingModule을 생성하더라도 실제 데이터베이스나 외부 서비스의 상태까지 자동으로 초기화되지는 않습니다.

따라서 테스트 격리는 다음 두 영역을 구분하여 관리해야 합니다.

**DI Container 격리**

TestingModule을 새로 생성하여 Provider 인스턴스의 상태를 분리합니다.

**외부 리소스 격리**

데이터베이스, Redis, 파일 시스템 등의 상태를 별도로 정리합니다.

실제 데이터베이스를 사용하는 Integration 및 E2E 테스트에서는 외부 리소스 격리가 특히 중요합니다.

---

## 17. TestingModule 구성 오류

TestingModule에서는 Provider 등록이나 Module Import 구성이 잘못되면 `compile()` 과정에서 오류가 발생할 수 있습니다.

대표적인 오류는 Dependency Resolution 실패입니다.

### 17.1. Provider 누락

다음과 같이 `UsersService`가 `UsersRepository`에 의존하지만 Repository를 등록하지 않았다고 가정하겠습니다.

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [UsersService],
}).compile();
```

이 경우 NestJS는 `UsersRepository` 의존성을 해결하지 못할 수 있습니다.

### 17.2. 해결 방법

테스트 대상의 의존성을 실제 Provider로 등록합니다.

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    UsersRepository,
  ],
}).compile();
```

또는 Mock Provider로 대체합니다.

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: UsersRepository,
      useValue: {
        findAll: () => [],
      },
    },
  ],
}).compile();
```

### 17.3. Injection Token 불일치

```typescript
{
  provide: 'USERS_REPOSITORY',
  useValue: mockRepository,
}
```

Provider를 문자열 Token으로 등록했다면 Service에서도 동일한 Token을 사용해야 합니다.

```typescript
constructor(
  @Inject('USERS_REPOSITORY')
  private readonly repository: UsersRepository,
) {}
```

Class Token과 문자열 Token은 서로 다른 Injection Token입니다.

### 17.4. Module Import 및 Export 오류

실제 Module을 Import하는 테스트에서는 다음 사항을 확인해야 합니다.

- Provider가 해당 Module에 등록되어 있는지 확인합니다.
- 다른 Module에서 사용하는 Provider가 Export되어 있는지 확인합니다.
- 필요한 Module이 `imports`에 포함되어 있는지 확인합니다.
- 동일한 Provider가 불필요하게 여러 Module에 중복 등록되지 않았는지 확인합니다.
- Circular Dependency가 발생하지 않는지 확인합니다.

### 17.5. 주요 오류와 점검 항목

| 증상 | 가능한 원인 | 점검 사항 |
|---|---|---|
| Dependency Resolution 실패 | Provider 누락 | `providers`, `imports`, `exports` |
| Token 조회 실패 | Token 불일치 | Class, String, Symbol Token |
| `get()` 조회 실패 | Scoped Provider 조회 | `resolve()` 사용 여부 |
| 예상과 다른 Provider 조회 | Module Context 모호성 | `select()`, `strict` 옵션 |
| 테스트 간 결과 차이 | 공유 Provider 상태 | TestingModule 재생성 |
| 프로세스 종료 지연 | 미정리 리소스 | `close()`, 외부 연결 정리 |
| 초기화 관련 오류 | Lifecycle 미실행 | `app.init()` 필요 여부 |

---

## 18. TestingModule 사용 시 권장사항

### 18.1. 테스트에 필요한 최소한의 Provider를 등록합니다

단위 테스트에서는 전체 AppModule을 Import하기보다 테스트 대상과 필요한 의존성만 등록하는 것이 좋습니다.

이를 통해 테스트 실행 비용과 불필요한 외부 의존성을 줄일 수 있습니다.

### 18.2. 실제 Module 구성 검증이 필요한 경우 Import를 사용합니다

Integration Testing에서는 실제 Module을 Import하여 Provider 등록과 의존성 관계가 정상적으로 구성되는지 검증할 수 있습니다.

### 18.3. Provider Scope를 고려하여 조회 API를 선택합니다

Singleton Provider에는 `get()`을 사용하고 Request 또는 Transient Scope Provider에는 `resolve()`를 사용합니다.

### 18.4. Override 범위를 명확하게 관리합니다

검증하려는 Provider 자체를 Mock으로 대체하면 실제 구현의 동작을 검증할 수 없습니다.

따라서 검증 대상과 테스트 대역을 구분해야 합니다.

### 18.5. Lifecycle이 필요한 테스트는 애플리케이션을 초기화합니다

단순한 Provider 메서드 테스트에는 `compile()`만으로 충분할 수 있습니다.

반면 `OnModuleInit`, 전역 Pipe 또는 HTTP Request Lifecycle을 검증해야 한다면 Nest Application 초기화가 필요할 수 있습니다.

### 18.6. 테스트 간 상태 공유를 방지합니다

Singleton Provider가 내부 상태를 변경하는 경우 TestingModule을 테스트마다 새로 생성하거나 명시적인 초기화 전략을 적용해야 합니다.

### 18.7. 외부 리소스를 명시적으로 정리합니다

TestingModule과 Nest Application뿐만 아니라 테스트에서 직접 생성한 데이터베이스 연결, 컨테이너 및 기타 리소스를 정리해야 합니다.

---

## 19. 정리

NestJS의 TestingModule은 테스트 환경에서 NestJS의 Module 및 Dependency Injection 시스템을 재사용하기 위한 핵심 기능입니다.

`Test.createTestingModule()`을 통해 테스트 모듈을 정의하고, `compile()`을 사용하여 DI Container를 구성할 수 있습니다.

컴파일된 TestingModule에서는 `get()`, `resolve()`, `select()` 등의 API로 Provider를 조회할 수 있으며, 테스트 대상에 따라 Provider 또는 Module을 대체할 수도 있습니다.

주요 개념은 다음과 같습니다.

| 개념 | 설명 |
|---|---|
| `Test` | 테스트 모듈 생성을 위한 진입점입니다. |
| `createTestingModule()` | 테스트 모듈의 메타데이터를 정의합니다. |
| `TestingModuleBuilder` | 테스트 모듈 설정 및 Override를 수행합니다. |
| `compile()` | DI Container와 Provider 인스턴스를 구성합니다. |
| `TestingModule` | 컴파일된 테스트 모듈을 나타냅니다. |
| `get()` | 정적 Provider 또는 Controller 인스턴스를 조회합니다. |
| `resolve()` | Scoped Provider 인스턴스를 동적으로 조회합니다. |
| `select()` | 특정 Module Context를 선택합니다. |
| `ContextIdFactory` | Scoped Provider를 위한 DI Context Identifier를 생성합니다. |
| `registerRequestByContextId()` | 특정 Context에 Request 객체를 등록합니다. |
| `overrideProvider()` | Provider를 테스트용 구현으로 대체합니다. |
| `overrideModule()` | Module 전체를 테스트용 Module로 대체합니다. |
| `overrideGuard()` | Guard를 테스트용 구현으로 대체합니다. |
| `useMocker()` | 누락된 의존성에 대한 Mock Factory를 등록합니다. |
| `createNestApplication()` | 테스트용 Nest Application을 생성합니다. |
| `app.init()` | 애플리케이션 Lifecycle 초기화를 수행합니다. |
| `close()` | 테스트 모듈 또는 애플리케이션의 종료 절차를 수행합니다. |

TestingModule은 Unit Testing, Integration Testing 및 E2E Testing에서 공통적으로 활용되지만, 각 테스트 유형에 따라 구성 범위를 다르게 설정해야 합니다.

테스트 목적에 맞는 최소한의 Module 구성을 사용하고, Scope와 Lifecycle 및 외부 리소스의 상태를 적절하게 관리하는 것이 중요합니다.

---

## 20. 관련 문서

- [Unit Testing](./unit-testing.md): TestingModule을 활용한 Service와 Controller 단위 테스트를 설명합니다.
- [Integration Testing](./integration-testing.md): 여러 Provider 및 Module 간 연동을 검증하는 방법을 설명합니다.
- [E2E Testing](./e2e-testing.md): TestingModule과 Nest Application을 이용한 HTTP E2E 테스트를 설명합니다.
- [Mocking Providers](./mocking-providers.md): Provider Mocking, Override 및 테스트 대역 구성 전략을 설명합니다.
- [Modules](../01-fundamentals/modules.md): NestJS Module의 구조와 Import 및 Export 관계를 설명합니다.
- [Providers](../01-fundamentals/providers.md): Provider 등록과 DI Container 관리 방식을 설명합니다.
- [Dependency Injection](../01-fundamentals/dependency-injection.md): Constructor Injection과 Injection Token의 동작 원리를 설명합니다.
- [Injection Scopes](../01-fundamentals/injection-scopes.md): Singleton, Request 및 Transient Scope를 설명합니다.
- [Custom Providers](../01-fundamentals/custom-providers.md): `useValue`, `useClass`, `useFactory` 등을 활용한 Provider 구성을 설명합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Documentation — Testing](https://docs.nestjs.com/fundamentals/testing)
  - TestingModule 생성, Provider 조회, Override 및 테스트 애플리케이션 구성 방법을 설명합니다.

- [NestJS Documentation — Module Reference](https://docs.nestjs.com/fundamentals/module-ref)
  - ModuleRef의 `get()`, `resolve()` 및 Context 관리 방법을 설명합니다.

- [NestJS Documentation — Modules](https://docs.nestjs.com/modules)
  - Module의 구성과 Import, Export 및 Provider 관계를 설명합니다.

- [NestJS Documentation — Providers](https://docs.nestjs.com/providers)
  - NestJS Provider의 등록과 Dependency Injection 구조를 설명합니다.

- [NestJS Documentation — Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
  - Custom Provider 및 Injection Token 구성 방법을 설명합니다.

- [NestJS Documentation — Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
  - Singleton, Request 및 Transient Scope의 동작을 설명합니다.

- [NestJS Documentation — Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
  - Module 및 Application 초기화와 종료 Lifecycle을 설명합니다.

- [NestJS Documentation — Common Errors](https://docs.nestjs.com/faq/common-errors)
  - Dependency Resolution 실패 등 일반적인 오류와 해결 방법을 설명합니다.

### Vitest 공식 문서

- [Vitest — Getting Started](https://vitest.dev/guide/)
  - Vitest 테스트 환경의 설치와 실행 방법을 설명합니다.

- [Vitest — Mocking](https://vitest.dev/guide/mocking)
  - Mock Function과 Spy 및 Mock 관리 방법을 설명합니다.

- [Vitest — Setup and Teardown](https://vitest.dev/guide/learn/setup-teardown)
  - `beforeEach`, `afterEach`, `beforeAll`, `afterAll` 등의 Lifecycle Hook을 설명합니다.

### 기타 참고 자료

- [NestJS GitHub Repository](https://github.com/nestjs/nest)
  - NestJS 프레임워크의 TestingModule 및 DI Container 구현을 확인할 수 있습니다.

- [NestJS Official Samples](https://github.com/nestjs/nest/tree/master/sample)
  - TestingModule을 사용하는 다양한 공식 예제 프로젝트를 확인할 수 있습니다.
