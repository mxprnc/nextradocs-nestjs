# Unit Testing

## 1. 개요

Unit Testing(단위 테스트)은 애플리케이션을 구성하는 개별 함수, 메서드 또는 클래스의 동작을 독립적으로 검증하는 테스트 방식입니다.

NestJS에서는 주로 Service, Controller, Provider 등의 구성 요소를 대상으로 단위 테스트를 작성합니다.

단위 테스트는 특정 기능이 요구사항에 맞게 동작하는지 확인하고, 코드 변경으로 인해 기존 기능이 손상되는 Regression(회귀 오류)을 조기에 발견하는 데 목적이 있습니다.

NestJS는 `@nestjs/testing` 패키지를 통해 Dependency Injection(DI)을 활용한 테스트 환경을 제공합니다. 이를 이용하면 실제 애플리케이션을 실행하지 않고도 테스트 대상 클래스를 생성하고, 외부 의존성을 Mock 객체로 대체할 수 있습니다.

### 1.1. 단위 테스트의 주요 목적

- **기능 검증:** 개별 메서드와 클래스가 의도한 결과를 반환하는지 확인합니다.
- **회귀 오류 방지:** 코드 수정 이후 기존 동작이 유지되는지 검증합니다.
- **의존성 격리:** 데이터베이스, 외부 API 등 외부 시스템에 영향을 받지 않도록 테스트합니다.
- **빠른 피드백:** 애플리케이션 전체를 실행하지 않고 특정 기능을 검증합니다.
- **리팩터링 안정성:** 구현을 변경하더라도 기존 동작이 유지되는지 확인합니다.

### 1.2. Unit Testing과 다른 테스트의 차이

| 구분 | Unit Testing | Integration Testing | E2E Testing |
|---|---|---|---|
| 테스트 대상 | 개별 함수 또는 클래스 | 여러 구성 요소의 연동 | 애플리케이션 전체 흐름 |
| 의존성 처리 | Mock 또는 Stub 사용 | 실제 의존성 또는 일부 대체 | 실제 구성 요소 중심 |
| 실행 속도 | 일반적으로 빠름 | 상대적으로 느림 | 일반적으로 가장 느림 |
| 데이터베이스 | 일반적으로 사용하지 않음 | 테스트 DB 사용 가능 | 테스트 DB 사용 가능 |
| 주요 검증 대상 | 비즈니스 로직 | 컴포넌트 간 상호작용 | 실제 사용자 요청 및 응답 |

단위 테스트는 테스트 범위가 작고 외부 의존성이 제한되므로 일반적으로 빠르고 안정적으로 실행할 수 있습니다.

다만 단위 테스트가 성공하더라도 여러 구성 요소가 실제 환경에서 정상적으로 연동된다는 것을 보장하지는 않습니다.

따라서 Integration Testing 및 E2E Testing과 함께 사용하는 것이 좋습니다.

---

## 2. NestJS의 테스트 구조

NestJS 애플리케이션에서는 일반적으로 테스트 대상 클래스와 테스트 파일을 같은 디렉터리에 배치합니다.

다음은 User 기능을 구현한 프로젝트의 예시입니다.

```text
src/
├── app.module.ts
├── main.ts
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.controller.spec.ts
    ├── users.service.ts
    └── users.service.spec.ts

test/
└── app.e2e-spec.ts
```

각 파일의 역할은 다음과 같습니다.

| 파일 | 설명 |
|---|---|
| `users.service.ts` | 사용자 관련 비즈니스 로직을 구현합니다. |
| `users.service.spec.ts` | UserService의 단위 테스트를 작성합니다. |
| `users.controller.ts` | HTTP 요청을 처리하는 Controller입니다. |
| `users.controller.spec.ts` | UserController의 단위 테스트를 작성합니다. |
| `app.e2e-spec.ts` | 애플리케이션 전체의 E2E 테스트를 작성합니다. |

테스트 파일에는 일반적으로 `.spec.ts` 또는 `.test.ts` 확장자를 사용합니다.

NestJS CLI에서 생성하는 테스트 파일은 보통 `.spec.ts` 형식을 사용합니다.

---

## 3. 테스트 환경 구성

### 3.1. 테스트 관련 라이브러리

NestJS는 특정 테스트 프레임워크에 종속되지 않습니다.

NestJS의 테스트 유틸리티는 `@nestjs/testing` 패키지로 제공되며, 테스트 실행과 Assertion은 별도의 테스트 프레임워크에서 처리합니다.

대표적으로 다음 라이브러리를 사용할 수 있습니다.

| 라이브러리 | 역할 |
|---|---|
| `@nestjs/testing` | NestJS 테스트용 DI 컨테이너와 TestingModule을 제공합니다. |
| `vitest` | 테스트 실행, Assertion, Mock 및 Spy 기능을 제공합니다. |
| `jest` | Vitest 대신 사용할 수 있는 테스트 프레임워크입니다. |
| `@vitest/coverage-v8` | Vitest의 코드 커버리지 측정에 사용합니다. |

NestJS CLI는 ESM 기반 신규 프로젝트에 Vitest를, CommonJS 기반 프로젝트에 Jest를 구성할 수 있습니다.

이 문서에서는 Vitest를 사용하는 예제를 기준으로 설명합니다.

기존 Jest 프로젝트에서는 동일한 NestJS TestingModule 패턴을 유지하면서 `vi.fn()` 등을 Jest API로 변경하여 사용할 수 있습니다.

### 3.2. 패키지 설치

NestJS Testing 유틸리티가 설치되지 않았다면 다음 명령어로 설치합니다.

```bash
npm install --save-dev @nestjs/testing
```

Vitest 역시 설치되어 있지 않다면 추가합니다.

```bash
npm install --save-dev vitest
```

코드 커버리지 측정이 필요한 경우 다음 패키지를 설치합니다.

```bash
npm install --save-dev @vitest/coverage-v8
```

기존 NestJS 프로젝트를 사용하는 경우 `package.json`에서 설치된 테스트 도구와 실행 스크립트를 먼저 확인해야 합니다.

Vitest를 사용할 때는 TypeScript 데코레이터 변환 및 모듈 시스템에 맞는 설정이 필요할 수 있습니다. NestJS CLI가 생성한 설정이 있다면 이를 우선 사용합니다.

---

## 4. 단위 테스트의 기본 구조

Vitest에서는 `describe()`, `it()`, `expect()` 등의 함수를 사용하여 테스트를 작성합니다.

다음은 두 숫자를 더하는 함수의 단위 테스트입니다.

```typescript
// calculator.ts
export function add(a: number, b: number): number {
  return a + b;
}
```

```typescript
// calculator.spec.ts
import { describe, expect, it } from 'vitest';

import { add } from './calculator';

describe('add', () => {
  it('두 숫자의 합계를 반환해야 합니다.', () => {
    const result = add(10, 20);

    expect(result).toBe(30);
  });
});
```

### 4.1. 주요 테스트 API

| API | 설명 |
|---|---|
| `describe()` | 관련 테스트를 하나의 그룹으로 구성합니다. |
| `it()` | 개별 테스트 케이스를 정의합니다. |
| `test()` | `it()`과 동일한 목적으로 사용합니다. |
| `expect()` | 실제 결과를 검증하기 위한 Assertion 객체를 생성합니다. |
| `beforeEach()` | 각 테스트 실행 전에 초기화 작업을 수행합니다. |
| `afterEach()` | 각 테스트 실행 이후 정리 작업을 수행합니다. |
| `beforeAll()` | 테스트 그룹 실행 전에 한 번 실행합니다. |
| `afterAll()` | 테스트 그룹이 완료된 후 한 번 실행합니다. |

### 4.2. AAA 패턴

단위 테스트는 일반적으로 Arrange, Act, Assert의 세 단계로 구성합니다.

**Arrange — 테스트 준비**

테스트 실행에 필요한 데이터와 객체를 준비합니다.

**Act — 테스트 대상 실행**

검증할 함수나 메서드를 호출합니다.

**Assert — 결과 검증**

실행 결과가 기대한 값과 일치하는지 확인합니다.

```typescript
it('두 숫자의 합계를 반환해야 합니다.', () => {
  // Arrange
  const a = 10;
  const b = 20;

  // Act
  const result = add(a, b);

  // Assert
  expect(result).toBe(30);
});
```

AAA 패턴을 사용하면 테스트 코드에서 준비 과정, 실행 과정, 검증 과정을 명확하게 구분할 수 있습니다.

---

## 5. NestJS Service 단위 테스트

NestJS에서 Service는 일반적으로 비즈니스 로직을 담당합니다.

Service의 단위 테스트에서는 메서드의 반환값, 조건 분기, 예외 처리 및 외부 의존성 호출 여부를 검증합니다.

### 5.1. 테스트 대상 Service

다음은 사용자 목록을 관리하는 Service입니다.

```typescript
// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';

export interface User {
  id: number;
  name: string;
}

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  findAll(): User[] {
    return this.users;
  }

  findOne(id: number): User {
    const user = this.users.find(
      (user) => user.id === id,
    );

    if (!user) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    return user;
  }
}
```

`UsersService`에는 다음 기능이 구현되어 있습니다.

- `findAll()`: 전체 사용자 목록을 반환합니다.
- `findOne()`: ID에 해당하는 사용자를 조회합니다.
- 사용자가 존재하지 않으면 `NotFoundException`을 발생시킵니다.

### 5.2. Service 단위 테스트 작성

```typescript
// users.service.spec.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService();
  });

  describe('findAll', () => {
    it('전체 사용자 목록을 반환해야 합니다.', () => {
      const users = service.findAll();

      expect(users).toHaveLength(2);
      expect(users[0].name).toBe('Alice');
    });
  });

  describe('findOne', () => {
    it('ID에 해당하는 사용자를 반환해야 합니다.', () => {
      const user = service.findOne(1);

      expect(user).toEqual({
        id: 1,
        name: 'Alice',
      });
    });

    it('사용자가 없으면 NotFoundException을 발생시켜야 합니다.', () => {
      expect(() => service.findOne(999))
        .toThrow(NotFoundException);
    });
  });
});
```

위 예제에서는 `UsersService`를 직접 생성하여 테스트합니다.

테스트 대상 클래스에 별도의 의존성이 없으므로 NestJS의 DI 컨테이너를 생성할 필요가 없습니다.

이처럼 클래스를 직접 생성하여 검증하는 방식을 Isolated Testing이라고 합니다.

단위 테스트는 반드시 TestingModule을 사용해야 하는 것은 아닙니다.

클래스의 생성과 의존성 주입이 단순하다면 직접 인스턴스를 생성하는 방식이 더 간결할 수 있습니다.

---

## 6. TestingModule을 활용한 단위 테스트

NestJS는 `@nestjs/testing` 패키지에서 `Test` 클래스를 제공합니다.

`Test.createTestingModule()`을 사용하면 실제 애플리케이션을 실행하지 않고도 테스트에 필요한 NestJS DI 컨테이너를 구성할 수 있습니다.

### 6.1. TestingModule 생성

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const moduleRef: TestingModule =
      await Test.createTestingModule({
        providers: [UsersService],
      }).compile();

    service = moduleRef.get<UsersService>(UsersService);
  });

  it('Service 인스턴스가 생성되어야 합니다.', () => {
    expect(service).toBeDefined();
  });
});
```

### 6.2. TestingModule의 동작 과정

```text
Test.createTestingModule()
          │
          ▼
   TestingModuleBuilder
          │
          ▼
       compile()
          │
          ▼
  NestJS DI Container 구성
          │
          ▼
   Provider 인스턴스 생성
          │
          ▼
     TestingModule
          │
          ▼
       get()
          │
          ▼
     UsersService
```

각 단계는 다음과 같이 동작합니다.

**1. `Test.createTestingModule()`**

테스트에 사용할 모듈의 메타데이터를 정의합니다.

`@Module()` 데코레이터와 마찬가지로 `imports`, `controllers`, `providers` 등을 지정할 수 있습니다.

**2. `compile()`**

정의된 모듈과 의존성을 분석하여 테스트용 DI 컨테이너를 구성합니다.

`compile()`은 비동기 메서드이므로 `await`를 사용해야 합니다.

**3. `moduleRef.get()`**

TestingModule에 등록된 Provider 또는 Controller의 인스턴스를 가져옵니다.

**4. 테스트 실행**

가져온 인스턴스의 메서드를 호출하여 실제 동작을 검증합니다.

### 6.3. get()과 resolve()의 차이

TestingModule에서는 `get()`과 `resolve()`를 사용하여 Provider 인스턴스를 가져올 수 있습니다.

| 메서드 | 설명 |
|---|---|
| `get()` | Singleton 등 정적 인스턴스를 가져옵니다. |
| `resolve()` | Request 또는 Transient Scope의 Provider 인스턴스를 동적으로 가져옵니다. |

예를 들어 Request Scope Provider는 다음과 같이 가져옵니다.

```typescript
const service = await moduleRef.resolve(UsersService);
```

단, 이 코드가 Request Scope의 동작을 나타내려면 해당 Provider가 Request Scope로 등록되어 있어야 합니다.

`resolve()`는 새로운 DI Context 하위 트리를 생성할 수 있으므로 동일한 Provider를 여러 번 조회하더라도 서로 다른 인스턴스를 반환할 수 있습니다.

일반적인 Singleton Provider 테스트에서는 `get()`을 사용하는 것이 적절합니다.

---

## 7. Dependency Injection과 Mock Provider

실제 NestJS Service는 다른 Provider에 의존하는 경우가 많습니다.

예를 들어 UserService가 데이터베이스 접근을 담당하는 UserRepository에 의존한다고 가정하겠습니다.

```text
UsersService
     │
     │ Dependency Injection
     ▼
UsersRepository
     │
     ▼
  Database
```

단위 테스트에서는 실제 데이터베이스에 접근하지 않도록 `UsersRepository`를 Mock 객체로 대체할 수 있습니다.

이렇게 하면 Service의 비즈니스 로직을 외부 시스템으로부터 격리할 수 있습니다.

### 7.1. 테스트 대상 Service

다음 예제에서는 데이터 저장소를 추상화한 Repository를 사용합니다.

```typescript
// users.repository.ts
import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  name: string;
}

@Injectable()
export class UsersRepository {
  async findById(id: number): Promise<User | null> {
    // 실제 구현에서는 DB 조회를 수행합니다.
    throw new Error('Not implemented');
  }
}
```

```typescript
// users.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  async findOne(id: number) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    return user;
  }
}
```

`UsersService`는 `UsersRepository`를 Constructor Injection 방식으로 주입받습니다.

실제 애플리케이션에서는 `UsersRepository`가 데이터베이스에 접근하지만, 단위 테스트에서는 해당 의존성을 Mock으로 대체합니다.

### 7.2. Mock Provider 구성

```typescript
// users.service.spec.ts
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    findById: vi.fn(),
  };

  beforeEach(async () => {
    mockUsersRepository.findById.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('findOne', () => {
    it('사용자를 조회해야 합니다.', async () => {
      const user = {
        id: 1,
        name: 'Alice',
      };

      mockUsersRepository.findById
        .mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(result).toEqual(user);

      expect(
        mockUsersRepository.findById,
      ).toHaveBeenCalledWith(1);
    });

    it('사용자가 없으면 예외를 발생시켜야 합니다.', async () => {
      mockUsersRepository.findById
        .mockResolvedValue(null);

      await expect(
        service.findOne(999),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

### 7.3. Mock Provider의 동작 원리

```text
           TestingModule
                │
                ▼
           UsersService
                │
                │ DI
                ▼
       MockUsersRepository
                │
                ▼
        vi.fn() 반환값
```

위 예제에서 중요한 부분은 다음과 같습니다.

```typescript
{
  provide: UsersRepository,
  useValue: mockUsersRepository,
}
```

`provide`는 DI 컨테이너에 등록할 Injection Token을 의미합니다.

`useValue`는 해당 Token에 대응하는 실제 객체를 지정합니다.

따라서 테스트 환경에서는 `UsersRepository` 대신 `mockUsersRepository`가 주입됩니다.

이 방식은 NestJS의 Custom Provider 기능을 활용한 것입니다.

Mock Provider의 구체적인 구성 전략과 `overrideProvider()`, `useMocker()` 등은 `mocking-providers.md` 문서에서 별도로 다룹니다.

---

## 8. Controller 단위 테스트

Controller는 클라이언트 요청을 처리하고 Service를 호출하는 역할을 담당합니다.

Controller의 단위 테스트에서는 주로 다음 항목을 검증합니다.

- 올바른 Service 메서드를 호출하는지 확인합니다.
- 요청으로 전달된 인자를 Service에 정확하게 전달하는지 확인합니다.
- Service에서 반환한 결과를 적절하게 반환하는지 확인합니다.
- 예외를 의도한 방식으로 전달하거나 처리하는지 확인합니다.

### 8.1. 테스트 대상 Controller

```typescript
// users.controller.ts
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOne(id);
  }
}
```

### 8.2. Controller 단위 테스트 작성

```typescript
// users.controller.spec.ts
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { Test } from '@nestjs/testing';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    mockUsersService.findOne.mockReset();

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('Service를 호출하고 결과를 반환해야 합니다.', async () => {
    const user = {
      id: 1,
      name: 'Alice',
    };

    mockUsersService.findOne.mockResolvedValue(user);

    const result = await controller.findOne(1);

    expect(result).toEqual(user);

    expect(
      mockUsersService.findOne,
    ).toHaveBeenCalledWith(1);
  });
});
```

이 테스트에서는 실제 HTTP 요청을 발생시키지 않습니다.

Controller 메서드를 직접 호출하고, 주입된 Mock Service가 정상적으로 사용되는지 검증합니다.

따라서 다음 항목은 이 테스트의 검증 범위에 포함되지 않습니다.

- HTTP Routing
- HTTP Status Code
- `ParseIntPipe`를 통한 요청 파라미터 변환
- Guard 및 Interceptor 실행
- 실제 HTTP Response Serialization

예를 들어 `@Param('id', ParseIntPipe)`의 `ParseIntPipe`는 Controller 메서드를 직접 호출하는 경우 실행되지 않습니다.

이러한 HTTP Request Lifecycle 관련 동작은 Integration Testing 또는 E2E Testing에서 검증해야 합니다.

---

## 9. 비동기 메서드 테스트

NestJS에서는 데이터베이스 조회, HTTP API 호출, 메시지 전송 등 비동기 작업을 수행하는 메서드가 많습니다.

비동기 메서드의 단위 테스트에서는 `async/await`, `resolves`, `rejects` 등을 사용합니다.

### 9.1. Promise 반환값 검증

```typescript
it('비동기 조회 결과를 반환해야 합니다.', async () => {
  const user = {
    id: 1,
    name: 'Alice',
  };

  mockUsersRepository.findById
    .mockResolvedValue(user);

  await expect(
    service.findOne(1),
  ).resolves.toEqual(user);
});
```

`resolves`는 Promise가 성공적으로 완료되었을 때 반환값을 검증합니다.

### 9.2. Promise 예외 검증

```typescript
it('존재하지 않는 사용자에 대해 예외를 발생시켜야 합니다.', async () => {
  mockUsersRepository.findById
    .mockResolvedValue(null);

  await expect(
    service.findOne(999),
  ).rejects.toThrow(NotFoundException);
});
```

`rejects`는 Promise가 Reject되었을 때 발생한 오류를 검증합니다.

### 9.3. 비동기 의존성 오류 검증

```typescript
it('Repository 오류를 전달해야 합니다.', async () => {
  mockUsersRepository.findById
    .mockRejectedValue(
      new Error('Database connection failed'),
    );

  await expect(
    service.findOne(1),
  ).rejects.toThrow('Database connection failed');
});
```

이 예제는 Repository에서 발생한 오류를 Service가 별도로 처리하지 않고 전달하는지 확인합니다.

실제 애플리케이션에서는 요구사항에 따라 오류를 변환하거나 별도의 예외로 처리할 수 있습니다.

비동기 테스트에서는 Promise가 완료될 때까지 테스트 프레임워크가 기다리도록 `await` 또는 Promise 반환 방식을 사용해야 합니다.

---

## 10. Mock Function과 Spy

Mock Function은 실제 구현을 대체하면서 호출 횟수, 전달된 인자 및 반환값을 검증하는 기능입니다.

Spy는 특정 함수의 호출을 관찰하는 기능입니다.

Vitest에서는 `vi.fn()`과 `vi.spyOn()`을 사용합니다.

### 10.1. Mock Function 생성

```typescript
import { expect, vi } from 'vitest';

const mockFunction = vi.fn();

mockFunction('Alice');

expect(mockFunction).toHaveBeenCalled();
expect(mockFunction).toHaveBeenCalledWith('Alice');
expect(mockFunction).toHaveBeenCalledTimes(1);
```

### 10.2. 반환값 지정

```typescript
const mockFunction = vi.fn();

mockFunction.mockReturnValue(100);

expect(mockFunction()).toBe(100);
```

Promise 반환값은 `mockResolvedValue()`를 사용합니다.

```typescript
const mockFunction = vi.fn();

mockFunction.mockResolvedValue({
  id: 1,
  name: 'Alice',
});
```

오류가 발생하는 상황을 재현하려면 `mockRejectedValue()`를 사용합니다.

```typescript
mockFunction.mockRejectedValue(
  new Error('Request failed'),
);
```

### 10.3. Spy 사용

```typescript
import { expect, vi } from 'vitest';

const calculator = {
  add(a: number, b: number) {
    return a + b;
  },
};

const spy = vi.spyOn(calculator, 'add');

const result = calculator.add(10, 20);

expect(result).toBe(30);
expect(spy).toHaveBeenCalledWith(10, 20);

spy.mockRestore();
```

`vi.spyOn()`은 기존 메서드의 호출을 관찰합니다.

기본적으로 원래 구현을 유지하지만, Mock Implementation을 지정하여 동작을 변경할 수도 있습니다.

### 10.4. 주요 Mock API

| API | 설명 |
|---|---|
| `vi.fn()` | 새로운 Mock Function을 생성합니다. |
| `vi.spyOn()` | 기존 메서드의 호출을 감시합니다. |
| `mockReturnValue()` | 동기 함수의 반환값을 지정합니다. |
| `mockResolvedValue()` | Promise가 성공적으로 완료될 값을 지정합니다. |
| `mockRejectedValue()` | Promise가 Reject될 오류를 지정합니다. |
| `mockImplementation()` | Mock Function의 구현을 직접 지정합니다. |
| `toHaveBeenCalled()` | 함수 호출 여부를 검증합니다. |
| `toHaveBeenCalledWith()` | 호출에 전달된 인자를 검증합니다. |
| `toHaveBeenCalledTimes()` | 함수 호출 횟수를 검증합니다. |

---

## 11. 테스트 격리와 초기화

단위 테스트는 개별 테스트 케이스가 서로 영향을 주지 않도록 작성해야 합니다.

특히 Mock Function에 저장된 호출 이력이나 반환값 설정이 다른 테스트에 영향을 주지 않도록 관리해야 합니다.

### 11.1. 테스트 간 상태 공유 문제

```typescript
const mockFunction = vi.fn();
```

동일한 Mock Function을 여러 테스트에서 공유하면 이전 테스트의 호출 이력이나 Mock 설정이 남아 있을 수 있습니다.

이를 방지하기 위해 각 테스트 실행 전에 초기화 작업을 수행할 수 있습니다.

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 11.2. Mock 초기화 메서드

| 메서드 | 설명 |
|---|---|
| `vi.clearAllMocks()` | Mock Function의 호출 이력 등을 초기화합니다. |
| `vi.resetAllMocks()` | 호출 이력과 Mock Implementation을 초기화합니다. |
| `vi.restoreAllMocks()` | `vi.spyOn()` 등으로 변경한 메서드를 원래 구현으로 복구합니다. |

이 메서드들은 서로 동일한 동작을 하지 않습니다.

특히 `clearAllMocks()`는 Mock Function에 지정된 반환값이나 구현을 초기화하지 않습니다.

따라서 각 테스트에서 서로 다른 반환값을 지정하는 경우에는 해당 Mock에 `mockReset()`을 사용하거나 새로운 Mock을 생성하는 방법을 고려해야 합니다.

`resetAllMocks()`는 Mock Implementation까지 초기화하므로, 공통 Mock 구현을 유지해야 하는 테스트에서는 주의해야 합니다.

### 11.3. 테스트별 독립적인 객체 생성

가장 명확한 방법 중 하나는 `beforeEach()`에서 새로운 테스트 대상과 Mock 객체를 생성하는 것입니다.

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: {
    findById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
    };

    service = new UsersService(
      repository as unknown as UsersRepository,
    );
  });

  // 테스트 케이스 작성
});
```

위 예제는 의존성 주입 개념을 설명하기 위해 Type Assertion을 사용한 단순화된 코드입니다.

실제 프로젝트에서는 테스트에 필요한 메서드만 정의한 인터페이스를 사용하거나, 타입이 명확한 Mock 객체를 작성하는 것이 더 적절합니다.

---

## 12. 단위 테스트 실행

NestJS 프로젝트의 테스트 실행 방식은 프로젝트에 설치된 테스트 프레임워크와 `package.json` 설정에 따라 달라집니다.

다음은 Vitest를 사용하는 프로젝트의 실행 스크립트 예시입니다.

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage"
  }
}
```

### 12.1. 전체 테스트 실행

```bash
npm run test
```

전체 테스트 파일을 실행합니다.

### 12.2. Watch Mode 실행

```bash
npm run test:watch
```

파일 변경을 감지하여 관련 테스트를 다시 실행할 수 있습니다.

개발 중 빠른 피드백이 필요한 경우 유용합니다.

### 12.3. 특정 테스트 파일 실행

```bash
npx vitest run src/users/users.service.spec.ts
```

지정한 테스트 파일만 실행합니다.

### 12.4. 코드 커버리지 확인

```bash
npm run test:cov
```

설치된 Coverage Provider를 통해 코드 커버리지 정보를 생성합니다.

일반적으로 다음 항목을 확인할 수 있습니다.

| 항목 | 설명 |
|---|---|
| Statement Coverage | 실행된 구문의 비율을 나타냅니다. |
| Branch Coverage | 조건 분기의 실행 비율을 나타냅니다. |
| Function Coverage | 호출된 함수의 비율을 나타냅니다. |
| Line Coverage | 실행된 코드 라인의 비율을 나타냅니다. |

Coverage가 높다고 해서 모든 비즈니스 요구사항이 검증되었다는 의미는 아닙니다.

코드가 실행되었다는 사실과 올바른 결과가 검증되었다는 사실은 구분해야 합니다.

따라서 Coverage 수치뿐만 아니라 테스트 시나리오의 적절성도 함께 검토해야 합니다.

---

## 13. 단위 테스트 설계 원칙

### 13.1. 테스트 대상의 책임을 명확하게 구분합니다

Service 테스트에서는 비즈니스 로직을 검증하고, Controller 테스트에서는 Service 호출 및 반환값 처리 등을 검증합니다.

각 계층의 책임에 따라 테스트 범위를 설정해야 합니다.

### 13.2. 외부 의존성을 격리합니다

단위 테스트는 가능하면 실제 데이터베이스, 외부 API, 메시지 브로커 등에 접근하지 않도록 구성합니다.

외부 의존성은 Mock 또는 Stub으로 대체하여 테스트 결과의 예측 가능성을 높입니다.

### 13.3. 정상 흐름과 예외 흐름을 함께 검증합니다

정상적으로 동작하는 경우뿐만 아니라 다음 상황도 검증해야 합니다.

- 요청한 데이터가 존재하지 않는 경우
- 잘못된 값이 전달되는 경우
- 외부 의존성에서 오류가 발생하는 경우
- 비즈니스 규칙을 위반하는 경우
- 빈 목록 또는 경계값이 전달되는 경우

### 13.4. 구현 세부사항보다 동작을 검증합니다

단위 테스트는 가능한 한 외부에서 관찰할 수 있는 동작을 기준으로 작성하는 것이 좋습니다.

예를 들어 특정 메서드가 올바른 값을 반환하는지 검증하는 것이 내부 변수의 변경 과정까지 과도하게 검증하는 것보다 유지보수에 유리할 수 있습니다.

단, 의존성 호출 자체가 중요한 비즈니스 계약인 경우에는 호출 여부와 전달 인자를 검증할 수 있습니다.

### 13.5. 테스트의 독립성을 유지합니다

각 테스트 케이스는 다른 테스트의 실행 결과나 실행 순서에 의존하지 않아야 합니다.

이를 위해 테스트별 객체 생성, Mock 초기화 및 공유 상태 제거 등을 적용합니다.

### 13.6. 테스트 이름에 기대 동작을 표현합니다

테스트 이름은 무엇을 검증하는지 이해할 수 있도록 작성합니다.

```typescript
it('존재하는 사용자 ID를 전달하면 사용자 정보를 반환해야 합니다.', async () => {
  // ...
});
```

```typescript
it('존재하지 않는 사용자 ID를 전달하면 NotFoundException을 발생시켜야 합니다.', async () => {
  // ...
});
```

이처럼 테스트 대상의 입력 조건과 기대 결과를 명확하게 표현하면 실패 원인을 파악하기 쉽습니다.

---

## 14. Unit Testing의 한계

Unit Testing은 애플리케이션의 개별 구성 요소를 검증하는 데 효과적이지만 모든 동작을 검증할 수 있는 것은 아닙니다.

특히 Mock 객체를 사용하는 테스트에서는 실제 의존성의 동작을 보장할 수 없습니다.

예를 들어 `UsersRepository`를 Mock으로 대체한 Service 테스트가 성공하더라도 다음 항목은 검증되지 않습니다.

- 실제 데이터베이스 연결이 정상적인지 여부
- SQL 쿼리가 올바르게 실행되는지 여부
- ORM Mapping이 정상적인지 여부
- Controller의 HTTP Routing이 올바른지 여부
- Guard, Pipe 및 Interceptor가 실제 요청에서 정상적으로 실행되는지 여부

따라서 실제 구성 요소 간의 연동은 Integration Testing으로, 애플리케이션 전체의 요청 및 응답 흐름은 E2E Testing으로 검증해야 합니다.

단위 테스트는 전체 테스트 전략의 일부로 활용하는 것이 적절합니다.

---

## 15. 정리

NestJS의 Unit Testing은 개별 클래스와 메서드의 동작을 검증하여 애플리케이션의 안정성과 유지보수성을 높이는 테스트 방식입니다.

NestJS는 `@nestjs/testing` 패키지를 통해 DI 컨테이너 기반의 테스트 환경을 제공하며, 이를 활용하여 실제 애플리케이션을 실행하지 않고도 Controller와 Provider를 검증할 수 있습니다.

핵심 개념은 다음과 같습니다.

| 개념 | 설명 |
|---|---|
| Unit Testing | 개별 함수 또는 클래스의 동작을 검증합니다. |
| Isolated Testing | NestJS DI 컨테이너 없이 클래스를 직접 생성하여 테스트합니다. |
| TestingModule | NestJS 테스트 전용 DI 컨테이너를 제공합니다. |
| `Test.createTestingModule()` | 테스트 모듈의 메타데이터를 정의합니다. |
| `compile()` | 테스트 모듈과 의존성을 구성합니다. |
| `get()` | 정적 Provider 인스턴스를 가져옵니다. |
| `resolve()` | Scoped Provider 인스턴스를 동적으로 가져옵니다. |
| Mock Provider | 실제 의존성을 테스트용 객체로 대체합니다. |
| `vi.fn()` | Mock Function을 생성합니다. |
| `vi.spyOn()` | 기존 메서드의 호출을 관찰합니다. |
| AAA Pattern | Arrange, Act, Assert 단계로 테스트를 구성합니다. |
| Code Coverage | 테스트 과정에서 실행된 코드의 범위를 측정합니다. |

단위 테스트는 외부 의존성을 효과적으로 격리하고 비즈니스 로직에 집중하여 작성하는 것이 중요합니다.

또한 정상 흐름뿐만 아니라 예외 처리와 경계 조건을 함께 검증하여 코드 변경에 대한 안정성을 확보해야 합니다.

---

## 16. 관련 문서

- [Integration Testing](./integration-testing.md): 여러 구성 요소 간의 연동을 검증하는 테스트 방식입니다.
- [E2E Testing](./e2e-testing.md): 실제 HTTP 요청 및 애플리케이션 전체 흐름을 검증하는 테스트 방식입니다.
- [Testing Modules](./testing-modules.md): NestJS TestingModule 구성 및 테스트 환경 관리 방법을 설명합니다.
- [Mocking Providers](./mocking-providers.md): Provider Mocking, Override 및 테스트 대역 구성 방법을 설명합니다.
- [Dependency Injection](../01-fundamentals/dependency-injection.md): NestJS의 의존성 주입 구조와 DI 컨테이너를 설명합니다.
- [Custom Providers](../01-fundamentals/custom-providers.md): `useValue`, `useClass`, `useFactory` 등을 사용한 Provider 등록 방법을 설명합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Documentation — Testing](https://docs.nestjs.com/fundamentals/testing)
  - Unit Testing, TestingModule, Mock Provider 및 테스트 환경 구성 방법을 설명합니다.

- [NestJS Documentation — Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
  - `useValue`, `useClass`, `useFactory` 등을 활용한 의존성 대체 방법을 설명합니다.

- [NestJS Documentation — Module Reference](https://docs.nestjs.com/fundamentals/module-ref)
  - DI 컨테이너에서 Provider를 조회하거나 동적으로 생성하는 방법을 설명합니다.

- [NestJS GitHub Repository](https://github.com/nestjs/nest)
  - NestJS 프레임워크의 소스 코드와 테스트 관련 구현을 확인할 수 있습니다.

- [NestJS Official Samples](https://github.com/nestjs/nest/tree/master/sample)
  - NestJS에서 제공하는 공식 예제 프로젝트를 확인할 수 있습니다.

### Vitest 공식 문서

- [Vitest — Getting Started](https://vitest.dev/guide/)
  - Vitest의 설치, 실행 및 기본 설정 방법을 설명합니다.

- [Vitest — Mocking](https://vitest.dev/guide/mocking)
  - Mock Function, Spy 및 모듈 Mocking 방법을 설명합니다.

- [Vitest — Mock Functions](https://vitest.dev/guide/learn/mock-functions)
  - Mock 반환값과 호출 이력을 설정하고 검증하는 방법을 설명합니다.

- [Vitest — Coverage](https://vitest.dev/guide/coverage)
  - 테스트 코드 커버리지 측정 및 설정 방법을 설명합니다.

### Jest 공식 문서

- [Jest — Getting Started](https://jestjs.io/docs/getting-started)
  - Jest 기반 테스트 환경의 설치 및 구성 방법을 설명합니다.

- [Jest — Mock Functions](https://jestjs.io/docs/mock-functions)
  - Jest Mock Function을 이용한 의존성 대체 및 호출 검증 방법을 설명합니다.

- [Jest — Testing Asynchronous Code](https://jestjs.io/docs/asynchronous)
  - Promise 및 async/await 기반 비동기 테스트 방법을 설명합니다.
