# Mocking Providers

## 1. 개요

Mocking은 테스트 대상이 의존하는 실제 객체를 테스트용 객체로 대체하여 특정 동작을 독립적으로 검증하는 기법입니다.

NestJS 애플리케이션은 Dependency Injection(DI)을 통해 Service, Repository, 외부 API Client 등의 의존성을 관리합니다.

이러한 구조에서는 실제 Provider 대신 Mock 객체를 주입하여 데이터베이스나 외부 서비스에 접근하지 않고도 테스트를 수행할 수 있습니다.

NestJS는 `@nestjs/testing` 패키지와 Custom Provider 기능을 통해 테스트 대상의 의존성을 대체하는 방법을 제공합니다.

대표적인 방법은 다음과 같습니다.

- `useValue`: 테스트용 객체를 Provider로 등록합니다.
- `useClass`: 테스트용 클래스를 Provider로 등록합니다.
- `useFactory`: Factory Function을 통해 테스트용 Provider를 생성합니다.
- `overrideProvider()`: 기존 Provider를 테스트용 구현으로 대체합니다.
- `useMocker()`: 누락된 의존성을 자동으로 Mocking하는 Factory를 등록합니다.

Mocking의 핵심은 **검증하려는 컴포넌트의 실제 구현을 유지하면서, 해당 컴포넌트가 의존하는 외부 구성 요소의 동작을 통제하는 것**입니다.

### 1.1. Mocking의 목적

Mocking은 다음과 같은 목적으로 사용합니다.

- **의존성 격리:** 데이터베이스, 외부 API 및 메시지 브로커 등의 실제 구현을 테스트에서 분리합니다.
- **실행 결과 제어:** 의존성이 반환하는 값이나 발생시키는 예외를 지정합니다.
- **호출 검증:** 의존성의 메서드가 올바른 인자로 호출되었는지 확인합니다.
- **오류 상황 재현:** 외부 시스템의 장애나 예외 상황을 의도적으로 생성합니다.
- **테스트 실행 속도 개선:** 실제 네트워크나 데이터베이스 작업을 생략합니다.
- **테스트 안정성 확보:** 외부 시스템의 상태에 따른 테스트 결과 변동을 줄입니다.

### 1.2. Mocking 적용 전후의 구조

다음은 `UsersService`가 `UsersRepository`를 통해 데이터베이스에 접근하는 구조입니다.

**실제 애플리케이션**

```text
       UsersController
              │
              ▼
         UsersService
              │
              ▼
        UsersRepository
              │
              ▼
           Database
```

**Mocking을 적용한 테스트 환경**

```text
         Unit Test
              │
              ▼
         UsersService
              │
              ▼
      MockUsersRepository
              │
              ▼
       지정된 테스트 값
```

실제 애플리케이션에서는 Repository가 데이터베이스에서 데이터를 조회합니다.

반면 테스트 환경에서는 Mock Repository가 미리 지정한 데이터를 반환합니다.

따라서 Service의 비즈니스 로직을 데이터베이스의 상태와 관계없이 검증할 수 있습니다.

---

## 2. Test Double의 종류

Mocking을 이해하려면 먼저 Test Double의 개념을 구분해야 합니다.

Test Double은 테스트에서 실제 의존성을 대신하는 객체를 의미하는 포괄적인 용어입니다.

대표적으로 Dummy, Stub, Fake, Spy, Mock 등이 있습니다.

### 2.1. Test Double 비교

| 종류 | 설명 | 주요 목적 |
|---|---|---|
| Dummy | 실제로 사용되지 않는 인자를 채우는 객체 | 의존성 또는 인자 충족 |
| Stub | 미리 지정한 값을 반환하는 객체 | 반환값 제어 |
| Fake | 단순화된 실제 동작을 구현한 객체 | 실제 의존성 대체 |
| Spy | 메서드 호출을 기록하고 관찰하는 객체 | 호출 여부 및 인자 검증 |
| Mock | 예상한 상호작용을 검증하기 위한 객체 | 호출 및 동작 검증 |

이 용어들은 테스트 설계 관점에서 구분되지만, 실제 테스트 프레임워크에서는 여러 역할을 하나의 Mock Function으로 구현할 수 있습니다.

### 2.2. Dummy

Dummy는 테스트 실행을 위해 필요한 인자를 채우지만 실제 검증에는 사용되지 않는 객체입니다.

```typescript
const dummyLogger = {} as Logger;
```

이 예제에서는 `dummyLogger`를 실제로 호출하지 않는다고 가정합니다.

만약 테스트 대상에서 Logger 메서드를 호출한다면 빈 객체를 전달하는 방식은 적절하지 않을 수 있습니다.

### 2.3. Stub

Stub은 미리 정의한 값을 반환하는 테스트 대역입니다.

```typescript
const stubRepository = {
  findById: async (id: number) => ({
    id,
    name: 'Alice',
  }),
};
```

이 객체는 실제 데이터베이스에 접근하지 않고 지정된 사용자 정보를 반환합니다.

Stub은 주로 테스트 대상이 의존성으로부터 어떤 데이터를 전달받았을 때 어떻게 동작하는지 검증하는 데 사용합니다.

### 2.4. Fake

Fake는 실제 구현을 단순화한 대체 구현입니다.

대표적으로 In-Memory Repository가 있습니다.

```typescript
interface User {
  id: number;
  name: string;
}

class FakeUsersRepository {
  private readonly users = new Map<number, User>();

  async save(user: User): Promise<User> {
    this.users.set(user.id, user);

    return user;
  }

  async findById(id: number): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
}
```

Fake는 실제 Repository와 유사한 저장 및 조회 기능을 제공하지만 실제 데이터베이스를 사용하지 않습니다.

복잡한 데이터 처리 흐름을 테스트하거나 여러 Service의 연동을 검증할 때 활용할 수 있습니다.

### 2.5. Spy

Spy는 실제 또는 대체 함수의 호출 이력과 전달된 인자를 관찰합니다.

Vitest에서는 `vi.spyOn()`을 사용할 수 있습니다.

```typescript
import { expect, vi } from 'vitest';

const calculator = {
  add(a: number, b: number) {
    return a + b;
  },
};

const spy = vi.spyOn(calculator, 'add');

calculator.add(10, 20);

expect(spy).toHaveBeenCalledWith(10, 20);
expect(spy).toHaveBeenCalledTimes(1);

spy.mockRestore();
```

`vi.spyOn()`은 기본적으로 원래 구현을 실행하면서 호출을 기록합니다.

필요한 경우 `mockImplementation()`을 사용하여 기존 구현을 변경할 수도 있습니다.

### 2.6. Mock

Mock은 테스트 대상과 의존성 사이의 상호작용을 검증하는 데 사용합니다.

```typescript
import { expect, vi } from 'vitest';

const mockRepository = {
  findById: vi.fn(),
};

mockRepository.findById.mockResolvedValue({
  id: 1,
  name: 'Alice',
});

await mockRepository.findById(1);

expect(mockRepository.findById)
  .toHaveBeenCalledWith(1);
```

Vitest의 `vi.fn()`은 Stub과 Spy의 역할을 모두 수행할 수 있습니다.

따라서 실무에서는 이러한 테스트 대역을 통칭하여 Mock이라고 부르는 경우가 많습니다.

---

## 3. NestJS Mock Provider의 동작 원리

NestJS는 Provider를 Injection Token으로 식별합니다.

일반적인 Constructor Injection에서는 클래스가 Injection Token으로 사용됩니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}
}
```

NestJS DI Container는 `UsersRepository` Token에 등록된 Provider를 찾아 `UsersService`에 주입합니다.

테스트 환경에서는 동일한 Token에 Mock 객체를 등록할 수 있습니다.

```typescript
{
  provide: UsersRepository,
  useValue: mockUsersRepository,
}
```

### 3.1. Mock Provider의 의존성 주입

```text
             TestingModule
                   │
                   ▼
              DI Container
                   │
                   ▼
         UsersRepository Token
                   │
                   ▼
          mockUsersRepository
                   │
                   ▼
              UsersService
```

이 과정에서 `UsersService`의 코드를 수정할 필요는 없습니다.

실제 애플리케이션과 테스트 환경이 동일한 Injection Token을 사용하되, 주입되는 Provider 구현만 달라집니다.

### 3.2. Mock Provider의 주요 구성 요소

| 구성 요소 | 역할 |
|---|---|
| Injection Token | Provider를 식별합니다. |
| `provide` | 등록하거나 대체할 Token을 지정합니다. |
| `useValue` | 주입할 객체를 지정합니다. |
| `useClass` | 생성할 Provider 클래스를 지정합니다. |
| `useFactory` | Provider를 생성하는 함수를 지정합니다. |
| TestingModule | 테스트용 Provider 구성을 관리합니다. |

---

## 4. 테스트 환경 구성

NestJS에서 Mock Provider를 사용하려면 `@nestjs/testing` 패키지가 필요합니다.

테스트 실행 프레임워크로는 Vitest 또는 Jest를 사용할 수 있습니다.

이 문서에서는 TypeScript와 Vitest를 기준으로 설명합니다.

### 4.1. 필요한 패키지

```bash
npm install --save-dev @nestjs/testing vitest
```

이미 설치되어 있다면 추가 설치할 필요는 없습니다.

NestJS 프로젝트에서는 `@nestjs/common`, `@nestjs/core` 및 `@nestjs/testing`의 버전 호환성을 확인해야 합니다.

### 4.2. 프로젝트 구조

```text
src/
└── users/
    ├── user.interface.ts
    ├── users.repository.ts
    ├── users.service.ts
    ├── users.controller.ts
    ├── users.service.spec.ts
    └── users.controller.spec.ts
```

Mock Provider는 주로 `.spec.ts` 파일에서 생성하여 사용합니다.

공통 Mock 구현이 필요한 경우에는 별도의 테스트 유틸리티 디렉터리에서 관리할 수도 있습니다.

---

## 5. 기본 테스트 대상 구현

Mock Provider의 사용 방법을 설명하기 위해 `UsersService`와 `UsersRepository`를 구성하겠습니다.

### 5.1. User 인터페이스

```typescript
// user.interface.ts
export interface User {
  id: number;
  name: string;
}
```

### 5.2. UsersRepository

```typescript
// users.repository.ts
import { Injectable } from '@nestjs/common';

import { User } from './user.interface';

@Injectable()
export class UsersRepository {
  async findById(id: number): Promise<User | null> {
    // 실제 구현에서는 데이터베이스를 조회합니다.
    throw new Error('Not implemented');
  }

  async save(user: User): Promise<User> {
    // 실제 구현에서는 데이터베이스에 저장합니다.
    throw new Error('Not implemented');
  }
}
```

위 Repository는 Mocking 예제를 설명하기 위한 인터페이스 역할의 클래스입니다.

실제 데이터베이스 접근 구현은 생략했습니다.

### 5.3. UsersService

```typescript
// users.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersRepository } from './users.repository';
import { User } from './user.interface';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    return user;
  }

  async create(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }
}
```

`UsersService`는 Repository에서 조회한 결과를 확인하고, 사용자가 존재하지 않으면 `NotFoundException`을 발생시킵니다.

이제 Repository를 Mock으로 대체하여 Service의 동작을 검증하겠습니다.

---

## 6. useValue를 이용한 Mock Provider

`useValue`는 테스트용 객체를 직접 Provider로 등록하는 가장 기본적인 방법입니다.

### 6.1. Mock Repository 생성

```typescript
import { vi } from 'vitest';

const mockUsersRepository = {
  findById: vi.fn(),
  save: vi.fn(),
};
```

`vi.fn()`은 Mock Function을 생성합니다.

Mock Function에서는 반환값, 예외 및 호출 이력을 관리할 수 있습니다.

### 6.2. TestingModule에 등록

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: UsersRepository,
      useValue: mockUsersRepository,
    },
  ],
}).compile();
```

이 구조에서 `UsersService`는 실제 구현을 사용하지만, 주입되는 `UsersRepository`는 Mock 객체로 대체됩니다.

### 6.3. 전체 테스트 코드

```typescript
// users.service.spec.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  NotFoundException,
} from '@nestjs/common';

import {
  Test,
  TestingModule,
} from '@nestjs/testing';

import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let moduleRef: TestingModule;
  let service: UsersService;

  const mockRepository = {
    findById: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(async () => {
    mockRepository.findById.mockReset();
    mockRepository.save.mockReset();

    moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('사용자를 정상적으로 조회해야 합니다.', async () => {
    const user = {
      id: 1,
      name: 'Alice',
    };

    mockRepository.findById.mockResolvedValue(user);

    const result = await service.findOne(1);

    expect(result).toEqual(user);

    expect(mockRepository.findById)
      .toHaveBeenCalledWith(1);

    expect(mockRepository.findById)
      .toHaveBeenCalledTimes(1);
  });

  it('사용자가 없으면 NotFoundException을 발생시켜야 합니다.', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      service.findOne(999),
    ).rejects.toThrow(NotFoundException);
  });

  it('사용자를 저장해야 합니다.', async () => {
    const user = {
      id: 2,
      name: 'Bob',
    };

    mockRepository.save.mockResolvedValue(user);

    const result = await service.create(user);

    expect(result).toEqual(user);

    expect(mockRepository.save)
      .toHaveBeenCalledWith(user);
  });
});
```

### 6.4. 테스트 동작 과정

```text
           Unit Test
               │
               ▼
          UsersService
               │
               ▼
     mockRepository.findById()
               │
               ▼
       mockResolvedValue()
               │
               ▼
          결과 반환
               │
               ▼
       Assertion 검증
```

이 테스트에서는 실제 Repository가 실행되지 않습니다.

Mock Function이 지정한 결과를 반환하므로 Service의 동작을 독립적으로 검증할 수 있습니다.

---

## 7. useClass를 이용한 Mock Provider

`useClass`는 실제 Provider 대신 테스트용 클래스를 등록하는 방법입니다.

복잡한 동작이나 내부 상태가 필요한 테스트 대역을 구성할 때 활용할 수 있습니다.

### 7.1. Mock Repository 클래스

```typescript
// mock-users.repository.ts
import { User } from './user.interface';

export class MockUsersRepository {
  private readonly users = new Map<number, User>();

  async findById(id: number): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async save(user: User): Promise<User> {
    this.users.set(user.id, user);

    return user;
  }
}
```

이 클래스는 실제 데이터베이스를 사용하지 않고 Map에 데이터를 저장합니다.

테스트 대역의 분류에서는 Fake에 해당하지만, NestJS에서는 테스트용 Provider로 등록할 수 있습니다.

### 7.2. useClass 등록

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: UsersRepository,
      useClass: MockUsersRepository,
    },
  ],
}).compile();
```

NestJS DI Container는 `MockUsersRepository` 인스턴스를 생성하여 `UsersService`에 주입합니다.

### 7.3. useValue와 useClass 비교

| 구분 | useValue | useClass |
|---|---|---|
| 등록 대상 | 객체 | 클래스 |
| 인스턴스 생성 | 이미 생성된 객체 사용 | NestJS가 생성 |
| DI 처리 | 객체 자체에는 DI 수행하지 않음 | 클래스 생성 시 DI 사용 가능 |
| 주요 용도 | 단순 Mock, Stub | Fake, 상태를 가진 테스트 대역 |
| 구성 복잡도 | 낮음 | 상대적으로 높음 |

간단한 Mock Function만 필요한 경우 `useValue`가 적합합니다.

반면 실제 Repository와 유사한 동작을 제공해야 한다면 `useClass`를 이용한 Fake 구현을 고려할 수 있습니다.

---

## 8. useFactory를 이용한 Mock Provider

`useFactory`는 Factory Function의 반환값을 Provider로 등록하는 방법입니다.

테스트 설정이나 다른 Provider에 따라 Mock 객체를 동적으로 생성해야 하는 경우 사용할 수 있습니다.

### 8.1. 기본 사용법

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: UsersRepository,
      useFactory: () => ({
        findById: vi.fn().mockResolvedValue({
          id: 1,
          name: 'Alice',
        }),
        save: vi.fn(),
      }),
    },
  ],
}).compile();
```

`useFactory`는 Factory Function이 반환한 객체를 Provider로 사용합니다.

### 8.2. 다른 Provider를 주입받는 Factory

다음은 테스트 설정값을 주입받아 Mock 객체를 구성하는 예제입니다.

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: 'MOCK_USER_NAME',
      useValue: 'Test User',
    },
    {
      provide: UsersRepository,
      useFactory: (name: string) => ({
        findById: vi.fn().mockImplementation(
          async (id: number) => ({
            id,
            name,
          }),
        ),
        save: vi.fn(),
      }),
      inject: ['MOCK_USER_NAME'],
    },
  ],
}).compile();
```

`inject`는 Factory Function에서 사용할 의존성의 Injection Token을 지정합니다.

`useFactory`는 동적으로 생성해야 하는 테스트 대역에 유용하지만, 단순한 Mock 객체를 생성하는 경우에는 `useValue`가 더 간결할 수 있습니다.

---

## 9. overrideProvider()를 이용한 Provider 대체

`overrideProvider()`는 이미 Module에 등록된 Provider를 테스트용 구현으로 대체하는 기능입니다.

특히 실제 Feature Module이나 AppModule을 Import하는 테스트에서 유용합니다.

### 9.1. 실제 UsersModule

```typescript
// users.module.ts
import { Module } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  providers: [
    UsersService,
    UsersRepository,
  ],
  exports: [UsersService],
})
export class UsersModule {}
```

### 9.2. Provider Override

```typescript
const mockRepository = {
  findById: vi.fn(),
  save: vi.fn(),
};

const moduleRef = await Test.createTestingModule({
  imports: [UsersModule],
})
  .overrideProvider(UsersRepository)
  .useValue(mockRepository)
  .compile();
```

`UsersModule`에 등록된 `UsersRepository`를 Mock 객체로 대체합니다.

### 9.3. 동작 구조

```text
             UsersModule
                  │
           ┌──────┴──────┐
           ▼             ▼
      UsersService  UsersRepository
           │             │
           │       overrideProvider()
           │             │
           │             ▼
           └──────► MockRepository
```

### 9.4. Override의 주요 특징

- 실제 Module 구성을 유지하면서 특정 Provider만 대체할 수 있습니다.
- `compile()`을 호출하기 전에 Override를 설정해야 합니다.
- Class, String, Symbol 등의 Injection Token을 사용할 수 있습니다.
- `useValue`, `useClass`, `useFactory` 방식으로 대체할 수 있습니다.

### 9.5. useValue 등록과 overrideProvider() 비교

| 구분 | useValue 직접 등록 | overrideProvider() |
|---|---|---|
| 사용 위치 | TestingModule의 `providers` | TestingModuleBuilder |
| 주요 목적 | 테스트용 Provider 등록 | 기존 Provider 대체 |
| 실제 Module Import | 필수 아님 | 주로 함께 사용 |
| 대상 Provider | 직접 정의 | 기존 등록 Provider |
| 주요 테스트 | Unit Testing | Integration, E2E Testing |

`overrideProvider()`는 이미 구성된 Module의 특정 의존성을 대체하는 데 적합합니다.

---

## 10. Injection Token별 Mocking

NestJS에서는 Provider를 Class Token, String Token 또는 Symbol Token으로 등록할 수 있습니다.

Mock Provider를 등록할 때는 실제 의존성에서 사용하는 Injection Token과 동일한 Token을 지정해야 합니다.

### 10.1. Class Token

```typescript
{
  provide: UsersRepository,
  useValue: mockRepository,
}
```

Service에서는 Constructor Injection을 사용할 수 있습니다.

```typescript
constructor(
  private readonly usersRepository: UsersRepository,
) {}
```

### 10.2. String Token

```typescript
export const USERS_REPOSITORY = 'USERS_REPOSITORY';
```

Service에서는 `@Inject()`를 사용합니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly repository: UsersRepository,
  ) {}
}
```

테스트에서는 동일한 Token을 사용합니다.

```typescript
{
  provide: USERS_REPOSITORY,
  useValue: mockRepository,
}
```

### 10.3. Symbol Token

```typescript
export const USERS_REPOSITORY_TOKEN =
  Symbol('USERS_REPOSITORY');
```

Service에서는 다음과 같이 주입받습니다.

```typescript
constructor(
  @Inject(USERS_REPOSITORY_TOKEN)
  private readonly repository: UsersRepository,
) {}
```

테스트에서는 동일한 Symbol 객체를 사용해야 합니다.

```typescript
{
  provide: USERS_REPOSITORY_TOKEN,
  useValue: mockRepository,
}
```

동일한 이름으로 새로운 `Symbol()`을 생성하더라도 원래 Symbol과 동일한 Token이 되지는 않습니다.

따라서 Symbol Token은 별도의 상수로 정의하여 공유하는 것이 좋습니다.

### 10.4. Injection Token 비교

| Token 종류 | 예제 | 특징 |
|---|---|---|
| Class | `UsersRepository` | 클래스 기반 DI에 적합합니다. |
| String | `'USERS_REPOSITORY'` | 설정 및 추상화된 의존성에 사용할 수 있습니다. |
| Symbol | `Symbol('USERS_REPOSITORY')` | Token 충돌을 줄일 수 있습니다. |

---

## 11. Interface 기반 의존성 Mocking

TypeScript의 Interface는 컴파일 과정에서 제거되므로 런타임의 Injection Token으로 직접 사용할 수 없습니다.

따라서 Interface 기반 의존성을 사용하는 경우 별도의 Token을 정의해야 합니다.

### 11.1. Repository Interface

```typescript
// users.repository.interface.ts
import { User } from './user.interface';

export interface UsersRepositoryPort {
  findById(id: number): Promise<User | null>;
  save(user: User): Promise<User>;
}
```

### 11.2. Injection Token

```typescript
// users.tokens.ts
export const USERS_REPOSITORY =
  Symbol('USERS_REPOSITORY');
```

### 11.3. Service 구현

```typescript
import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersRepositoryPort } from './users.repository.interface';
import { USERS_REPOSITORY } from './users.tokens';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly repository: UsersRepositoryPort,
  ) {}

  async findOne(id: number) {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }
}
```

### 11.4. 타입이 지정된 Mock Provider

```typescript
import { vi } from 'vitest';

const mockRepository = {
  findById: vi.fn<UsersRepositoryPort['findById']>(),
  save: vi.fn<UsersRepositoryPort['save']>(),
};
```

이후 TestingModule에 등록합니다.

```typescript
const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useValue: mockRepository,
    },
  ],
}).compile();
```

이 방식은 Interface를 통해 비즈니스 계층과 인프라 계층의 의존성을 분리한 아키텍처에서 유용합니다.

---

## 12. Vitest Mock Function

Vitest는 `vi.fn()`을 통해 Mock Function을 생성합니다.

Mock Function은 반환값, 예외, 호출 횟수 및 전달된 인자를 제어하거나 검증할 수 있습니다.

### 12.1. 주요 Mock API

| API | 설명 |
|---|---|
| `vi.fn()` | Mock Function을 생성합니다. |
| `vi.spyOn()` | 기존 메서드의 호출을 관찰합니다. |
| `mockReturnValue()` | 동기 반환값을 지정합니다. |
| `mockReturnValueOnce()` | 다음 호출의 반환값을 지정합니다. |
| `mockResolvedValue()` | Promise 성공값을 지정합니다. |
| `mockResolvedValueOnce()` | 다음 Promise 호출의 성공값을 지정합니다. |
| `mockRejectedValue()` | Promise 실패값을 지정합니다. |
| `mockRejectedValueOnce()` | 다음 Promise 호출의 실패값을 지정합니다. |
| `mockImplementation()` | 함수 구현을 지정합니다. |
| `mockImplementationOnce()` | 다음 호출에서 사용할 구현을 지정합니다. |

### 12.2. 동기 반환값

```typescript
const mockFunction = vi.fn();

mockFunction.mockReturnValue(100);

expect(mockFunction()).toBe(100);
```

### 12.3. 비동기 반환값

```typescript
const mockFunction = vi.fn();

mockFunction.mockResolvedValue({
  id: 1,
  name: 'Alice',
});

await expect(mockFunction()).resolves.toEqual({
  id: 1,
  name: 'Alice',
});
```

### 12.4. 비동기 예외

```typescript
const mockFunction = vi.fn();

mockFunction.mockRejectedValue(
  new Error('Database connection failed'),
);

await expect(mockFunction())
  .rejects.toThrow('Database connection failed');
```

### 12.5. 호출마다 다른 반환값

```typescript
const mockFunction = vi.fn();

mockFunction
  .mockResolvedValueOnce(null)
  .mockResolvedValueOnce({
    id: 1,
    name: 'Alice',
  });

expect(await mockFunction()).toBeNull();

expect(await mockFunction()).toEqual({
  id: 1,
  name: 'Alice',
});
```

이러한 기능을 활용하면 일시적 장애, 재시도 및 상태 변화 등 다양한 상황을 재현할 수 있습니다.

---

## 13. Mock 호출 검증

Mocking은 단순히 반환값을 지정하는 데 그치지 않고 의존성이 올바르게 호출되었는지 검증하는 데에도 활용됩니다.

### 13.1. 주요 Assertion

| Assertion | 설명 |
|---|---|
| `toHaveBeenCalled()` | Mock 함수가 호출되었는지 검증합니다. |
| `toHaveBeenCalledTimes()` | 호출 횟수를 검증합니다. |
| `toHaveBeenCalledWith()` | 특정 인자로 호출되었는지 검증합니다. |
| `toHaveBeenLastCalledWith()` | 마지막 호출 인자를 검증합니다. |
| `toHaveBeenNthCalledWith()` | 지정한 순서의 호출 인자를 검증합니다. |
| `toHaveReturnedWith()` | 특정 반환값을 반환했는지 검증합니다. |
| `not.toHaveBeenCalled()` | 호출되지 않았는지 검증합니다. |

### 13.2. 호출 인자 검증

```typescript
const mockRepository = {
  findById: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Alice',
  }),
};

await mockRepository.findById(1);

expect(mockRepository.findById)
  .toHaveBeenCalledWith(1);
```

### 13.3. 호출 횟수 검증

```typescript
expect(mockRepository.findById)
  .toHaveBeenCalledTimes(1);
```

### 13.4. 호출되지 않은 경우 검증

```typescript
expect(mockRepository.save)
  .not.toHaveBeenCalled();
```

호출 여부를 검증할 때는 해당 호출이 실제 비즈니스 요구사항의 일부인지 고려해야 합니다.

내부 구현의 모든 메서드 호출을 과도하게 검증하면 리팩터링 과정에서 테스트가 불필요하게 실패할 수 있습니다.

---

## 14. 외부 API 의존성 Mocking

실제 NestJS 애플리케이션에서는 외부 API Client에 의존하는 Service를 구현하는 경우가 많습니다.

외부 API를 직접 호출하는 단위 테스트는 네트워크 상태와 외부 서비스의 응답에 영향을 받을 수 있습니다.

이러한 경우 외부 API Client를 Mock Provider로 대체할 수 있습니다.

### 14.1. 외부 API Client

```typescript
// payment.client.ts
import { Injectable } from '@nestjs/common';

export interface PaymentResult {
  transactionId: string;
  success: boolean;
}

@Injectable()
export class PaymentClient {
  async requestPayment(
    amount: number,
  ): Promise<PaymentResult> {
    // 실제 외부 결제 API 호출
    throw new Error('Not implemented');
  }
}
```

### 14.2. PaymentService

```typescript
// payment.service.ts
import { Injectable } from '@nestjs/common';

import { PaymentClient } from './payment.client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentClient: PaymentClient,
  ) {}

  async pay(amount: number): Promise<string> {
    const result =
      await this.paymentClient.requestPayment(amount);

    if (!result.success) {
      throw new Error('Payment failed');
    }

    return result.transactionId;
  }
}
```

### 14.3. Mock Provider 적용

```typescript
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { Test } from '@nestjs/testing';

import { PaymentService } from './payment.service';
import { PaymentClient } from './payment.client';

describe('PaymentService', () => {
  let service: PaymentService;

  const mockPaymentClient = {
    requestPayment: vi.fn(),
  };

  beforeEach(async () => {
    mockPaymentClient.requestPayment.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentClient,
          useValue: mockPaymentClient,
        },
      ],
    }).compile();

    service = moduleRef.get(PaymentService);
  });

  it('결제가 성공하면 거래 ID를 반환해야 합니다.', async () => {
    mockPaymentClient.requestPayment.mockResolvedValue({
      transactionId: 'TX-001',
      success: true,
    });

    const result = await service.pay(10000);

    expect(result).toBe('TX-001');

    expect(mockPaymentClient.requestPayment)
      .toHaveBeenCalledWith(10000);
  });

  it('결제가 실패하면 예외를 발생시켜야 합니다.', async () => {
    mockPaymentClient.requestPayment.mockResolvedValue({
      transactionId: '',
      success: false,
    });

    await expect(
      service.pay(10000),
    ).rejects.toThrow('Payment failed');
  });
});
```

이 테스트에서는 실제 결제 API가 호출되지 않습니다.

따라서 결제 Service의 성공 및 실패 처리 로직을 외부 결제 시스템과 독립적으로 검증할 수 있습니다.

다만 외부 API와의 실제 연동은 별도의 Integration Testing에서 검증해야 합니다.

---

## 15. TypeORM Repository Mocking

NestJS에서 TypeORM을 사용하는 경우 Repository가 일반 Class Token이 아닌 별도의 Injection Token으로 등록됩니다.

이때 `getRepositoryToken()`을 사용하여 Repository의 Token을 가져올 수 있습니다.

### 15.1. TypeORM Entity

```typescript
// user.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
```

### 15.2. Repository를 주입받는 Service

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findOne(id: number): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }
}
```

### 15.3. Repository Mock 등록

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';

const mockRepository = {
  findOneBy: vi.fn(),
};

const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: getRepositoryToken(User),
      useValue: mockRepository,
    },
  ],
}).compile();
```

### 15.4. 조회 테스트

```typescript
const service = moduleRef.get(UsersService);

mockRepository.findOneBy.mockResolvedValue({
  id: 1,
  name: 'Alice',
});

const result = await service.findOne(1);

expect(result).toEqual({
  id: 1,
  name: 'Alice',
});

expect(mockRepository.findOneBy)
  .toHaveBeenCalledWith({
    id: 1,
  });
```

TypeORM Repository를 Mock으로 대체한 단위 테스트에서는 실제 데이터베이스 연결이 필요하지 않습니다.

다만 SQL 실행, Entity Mapping, Transaction 등의 동작은 검증되지 않습니다.

이러한 기능은 실제 데이터베이스를 사용하는 Integration Testing에서 확인해야 합니다.

---

## 16. useMocker()를 이용한 자동 Mocking

`useMocker()`는 NestJS TestingModuleBuilder에서 제공하는 자동 Mock 생성 기능입니다.

테스트 모듈에서 의존성을 해결할 수 없는 경우 Mock Factory를 통해 해당 의존성의 테스트 대역을 생성할 수 있습니다.

여러 의존성을 가진 Controller나 Service를 테스트할 때 유용합니다.

### 16.1. 기본 사용법

```typescript
const moduleRef = await Test.createTestingModule({
  controllers: [UsersController],
})
  .useMocker((token) => {
    if (token === UsersService) {
      return {
        findAll: vi.fn().mockResolvedValue([
          { id: 1, name: 'Alice' },
        ]),
      };
    }

    return undefined;
  })
  .compile();
```

이 예제에서는 `UsersService`를 직접 Provider로 등록하지 않았습니다.

NestJS는 `UsersController`의 의존성을 해결하는 과정에서 `useMocker()`에 등록된 Factory를 사용합니다.

### 16.2. useMocker() 동작 구조

```text
        createTestingModule()
                 │
                 ▼
             compile()
                 │
                 ▼
          의존성 분석
                 │
          ┌──────┴──────┐
          ▼             ▼
     등록된 Provider   누락된 Provider
          │             │
          ▼             ▼
      실제 Provider    useMocker()
          │             │
          │             ▼
          │          Mock Factory
          │             │
          └──────┬──────┘
                 ▼
           DI Container
```

### 16.3. 여러 의존성 처리

```typescript
.useMocker((token) => {
  if (token === UsersService) {
    return {
      findAll: vi.fn().mockResolvedValue([]),
    };
  }

  if (token === PaymentClient) {
    return {
      requestPayment: vi.fn(),
    };
  }

  return undefined;
})
```

`useMocker()`는 누락된 모든 의존성을 자동으로 완전하게 구현하는 기능이 아닙니다.

Mock Factory에서 필요한 Token을 식별하고 적절한 객체를 반환해야 합니다.

또한 이미 정상적으로 등록된 Provider를 명시적으로 대체해야 한다면 `overrideProvider()`가 더 적절합니다.

### 16.4. 특수 Context Provider

NestJS의 `REQUEST`, `INQUIRER` 등의 특수 Provider는 일반적인 `useMocker()`를 통해 자동으로 Mocking되지 않습니다.

이러한 Token은 이미 NestJS Context에 정의되어 있기 때문입니다.

필요한 경우 Custom Provider 또는 `overrideProvider()` 등을 사용하여 명시적으로 처리해야 합니다.

---

## 17. Request Scope Provider Mocking

NestJS는 Singleton 외에도 Request 및 Transient Scope를 지원합니다.

Request Scope Provider는 요청별 DI Context에서 생성되므로 일반적인 Singleton Provider와 테스트 방법이 다를 수 있습니다.

### 17.1. Request Scope Provider 예제

```typescript
import {
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';

import { REQUEST } from '@nestjs/core';

interface RequestData {
  user?: {
    id: number;
  };
}

@Injectable({
  scope: Scope.REQUEST,
})
export class RequestContextService {
  constructor(
    @Inject(REQUEST)
    private readonly request: RequestData,
  ) {}

  getUserId(): number | undefined {
    return this.request.user?.id;
  }
}
```

### 17.2. 테스트 Context 구성

```typescript
import { ContextIdFactory } from '@nestjs/core';

const contextId = ContextIdFactory.create();

moduleRef.registerRequestByContextId(
  {
    user: {
      id: 100,
    },
  },
  contextId,
);
```

### 17.3. resolve() 사용

```typescript
const service = await moduleRef.resolve(
  RequestContextService,
  contextId,
);

expect(service.getUserId()).toBe(100);
```

이 방식은 Request Scope Provider의 동작을 테스트하기 위한 방법입니다.

별도의 `REQUEST` Mock Provider를 직접 등록하는 대신 특정 Context에 테스트용 Request 객체를 연결합니다.

Request Scope와 ContextIdFactory의 자세한 사용 방법은 `testing-modules.md` 및 `injection-scopes.md` 문서를 참고할 수 있습니다.

---

## 18. Guard, Pipe 및 Interceptor Mocking

NestJS에서는 일반 Provider 외에도 Guard, Pipe, Interceptor 및 Exception Filter를 테스트용 구현으로 대체할 수 있습니다.

이러한 대체 기능은 E2E 테스트에서 일부 Request Lifecycle 구성 요소를 격리하는 데 활용됩니다.

### 18.1. Guard Mocking

```typescript
import {
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

class MockAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean {
    return true;
  }
}
```

TestingModuleBuilder에서 Guard를 대체합니다.

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideGuard(AuthGuard)
  .useClass(MockAuthGuard)
  .compile();
```

이 코드는 `AuthGuard`가 실제 애플리케이션에 등록되어 있다고 가정합니다.

### 18.2. 관련 Override API

| API | 대상 |
|---|---|
| `overrideProvider()` | 일반 Provider |
| `overrideGuard()` | Guard |
| `overridePipe()` | Pipe |
| `overrideInterceptor()` | Interceptor |
| `overrideFilter()` | Exception Filter |
| `overrideModule()` | Module 전체 |

### 18.3. Global Guard Mocking

`APP_GUARD`를 사용하여 전역 Guard를 등록하는 경우에는 Provider 등록 방식을 고려해야 합니다.

다음과 같이 등록하면 Guard가 전역 Provider로 사용됩니다.

```typescript
{
  provide: APP_GUARD,
  useClass: AuthGuard,
}
```

테스트에서 `AuthGuard` 클래스를 명시적으로 Override할 수 있도록 구성하려면 다음처럼 `useExisting`을 사용할 수 있습니다.

```typescript
providers: [
  AuthGuard,
  {
    provide: APP_GUARD,
    useExisting: AuthGuard,
  },
]
```

테스트에서는 다음과 같이 대체합니다.

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(AuthGuard)
  .useClass(MockAuthGuard)
  .compile();
```

`useExisting`은 이미 등록된 Provider의 인스턴스를 다른 Token으로 참조하도록 구성합니다.

이 패턴을 사용하면 전역 Guard로 등록된 Provider를 테스트에서 명시적으로 대체할 수 있습니다.

---

## 19. Mock 초기화와 테스트 격리

Mock Function에는 호출 횟수, 전달된 인자 및 Mock Implementation 등의 상태가 저장됩니다.

동일한 Mock Function을 여러 테스트에서 공유하면 이전 테스트의 상태가 이후 테스트에 영향을 줄 수 있습니다.

따라서 Mock 초기화 전략을 명확하게 구성해야 합니다.

### 19.1. Mock 초기화 API

| API | 역할 |
|---|---|
| `mockClear()` | 호출 이력을 초기화합니다. |
| `mockReset()` | 호출 이력과 Mock Implementation을 초기화합니다. |
| `mockRestore()` | Spy의 원래 구현을 복원합니다. |
| `vi.clearAllMocks()` | 여러 Mock의 호출 이력을 초기화합니다. |
| `vi.resetAllMocks()` | 여러 Mock의 호출 이력 및 구현을 초기화합니다. |
| `vi.restoreAllMocks()` | Spy로 변경한 원래 메서드를 복원합니다. |

### 19.2. mockClear()

```typescript
const mockFunction = vi.fn();

mockFunction('Alice');

mockFunction.mockClear();
```

`mockClear()`는 호출 이력을 초기화하지만 지정한 Mock Implementation은 유지합니다.

### 19.3. mockReset()

```typescript
const mockFunction = vi.fn();

mockFunction.mockResolvedValue({
  id: 1,
});

mockFunction.mockReset();
```

`mockReset()`은 호출 이력과 변경된 Mock Implementation을 초기화합니다.

`vi.fn()`에 초기 구현 없이 생성한 경우 초기화 후에는 기본적으로 `undefined`를 반환합니다.

반면 `vi.fn(implementation)`처럼 초기 구현을 전달했다면 해당 초기 구현으로 복원되는 동작을 고려해야 합니다.

### 19.4. mockRestore()

```typescript
const service = {
  findAll: () => ['Alice'],
};

const spy = vi.spyOn(service, 'findAll');

spy.mockReturnValue(['Mock User']);

spy.mockRestore();
```

`mockRestore()`는 `vi.spyOn()`으로 변경한 메서드를 원래 구현으로 복원합니다.

### 19.5. 테스트별 Mock 객체 생성

테스트 간 상태 공유를 줄이기 위해 `beforeEach()`에서 새로운 Mock 객체를 생성할 수 있습니다.

```typescript
describe('UsersService', () => {
  let service: UsersService;

  let mockRepository: {
    findById: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockRepository = {
      findById: vi.fn(),
      save: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });
});
```

각 테스트에서 새로운 Mock 객체와 TestingModule을 사용하므로 호출 이력 및 Mock 구현이 다른 테스트와 공유되지 않습니다.

실제 프로젝트에서는 생성한 TestingModule을 `afterEach()`에서 종료하도록 관리하는 것이 좋습니다.

---

## 20. 공통 Mock Factory 구성

프로젝트 규모가 커지면 동일한 Provider의 Mock 객체가 여러 테스트 파일에서 반복적으로 사용될 수 있습니다.

이러한 경우 공통 Mock Factory를 정의하면 테스트 코드의 중복을 줄일 수 있습니다.

### 20.1. Mock Factory 구현

```typescript
// test/mocks/users.repository.mock.ts
import { vi } from 'vitest';

import { UsersRepository } from '../../src/users/users.repository';

export function createMockUsersRepository() {
  return {
    findById: vi.fn<UsersRepository['findById']>(),
    save: vi.fn<UsersRepository['save']>(),
  };
}
```

### 20.2. Mock Factory 사용

```typescript
const mockRepository = createMockUsersRepository();

const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: UsersRepository,
      useValue: mockRepository,
    },
  ],
}).compile();
```

### 20.3. 주요 장점

- 테스트 파일마다 Mock 객체를 중복 정의하지 않아도 됩니다.
- 동일한 Provider에 대해 일관된 Mock 구조를 사용할 수 있습니다.
- Repository의 메서드가 변경되었을 때 공통 Mock 구현을 관리하기 쉽습니다.
- 새로운 Mock 인스턴스를 생성하여 테스트 간 상태 공유를 줄일 수 있습니다.

다만 공통 Mock Factory에서 모든 메서드에 임의의 성공 반환값을 지정하는 것은 주의해야 합니다.

테스트에서 필요한 반환값을 명시적으로 설정하면 테스트의 전제조건과 기대 동작을 쉽게 이해할 수 있습니다.

---

## 21. Mocking과 Integration Testing의 경계

Mocking은 테스트 대상의 의존성을 격리하지만, 그만큼 실제 연동에 대한 검증 범위가 줄어듭니다.

예를 들어 다음과 같은 구조가 있다고 가정하겠습니다.

```text
      OrdersService
            │
            ▼
      PaymentService
            │
            ▼
       PaymentClient
            │
            ▼
      External Payment API
```

### 21.1. OrdersService 단위 테스트

```text
      OrdersService
            │
            ▼
     MockPaymentService
```

`PaymentService`를 Mock으로 대체하여 `OrdersService`의 동작을 독립적으로 검증합니다.

### 21.2. Service 간 통합 테스트

```text
      OrdersService
            │
            ▼
      PaymentService
            │
            ▼
     MockPaymentClient
```

두 Service의 실제 구현을 유지하고 외부 API Client만 Mock으로 대체합니다.

이 경우 `OrdersService`와 `PaymentService` 사이의 연동을 검증할 수 있습니다.

### 21.3. 실제 외부 시스템 통합 테스트

```text
      OrdersService
            │
            ▼
      PaymentService
            │
            ▼
       PaymentClient
            │
            ▼
      Sandbox Payment API
```

실제 API Client와 외부 시스템의 연동을 검증하려면 Sandbox 환경 등을 사용할 수 있습니다.

### 21.4. 테스트 범위 비교

| 테스트 유형 | 실제 구현 | Mock 대상 |
|---|---|---|
| Unit Testing | 테스트 대상 Service | 다른 Service, Repository, 외부 API |
| Integration Testing | 연동을 검증할 여러 Provider | 검증 범위 밖의 의존성 |
| E2E Testing | HTTP 요청 처리 흐름 | 필요에 따라 일부 외부 시스템 |
| 외부 시스템 통합 테스트 | 실제 API Client 및 프로토콜 | 일부 주변 의존성 |

Mocking을 많이 적용한다고 해서 항상 좋은 테스트가 되는 것은 아닙니다.

검증하려는 기능에 필요한 실제 구현까지 Mock으로 대체하지 않도록 주의해야 합니다.

---

## 22. Mocking 설계 원칙

### 22.1. 검증 대상은 실제 구현으로 유지합니다

테스트 대상 자체를 Mock으로 대체하면 실제 비즈니스 로직을 검증할 수 없습니다.

따라서 Service를 테스트한다면 해당 Service의 실제 구현을 유지하고 외부 의존성만 Mock으로 대체하는 것이 일반적입니다.

### 22.2. 필요한 메서드만 Mocking합니다

테스트 대상이 사용하지 않는 메서드까지 불필요하게 구현할 필요는 없습니다.

다만 테스트에 사용되는 모든 의존성 메서드는 실제 호출 시 유효한 결과를 제공하도록 구성해야 합니다.

### 22.3. 반환값과 예외를 명시적으로 설정합니다

테스트의 목적에 따라 Mock의 반환값과 예외 상황을 지정해야 합니다.

특히 비동기 메서드에는 `mockResolvedValue()` 또는 `mockRejectedValue()`를 사용하는 것이 적절합니다.

### 22.4. 테스트마다 Mock 상태를 초기화합니다

이전 테스트에서 설정한 반환값이나 호출 이력이 다음 테스트에 영향을 주지 않도록 해야 합니다.

새로운 Mock 객체를 생성하거나 적절한 초기화 API를 사용합니다.

### 22.5. 과도한 상호작용 검증을 피합니다

모든 내부 메서드 호출을 검증하면 구현 변경에 민감한 테스트가 될 수 있습니다.

반환값과 외부에서 관찰할 수 있는 동작을 우선 검증하고, 호출 자체가 중요한 계약일 때 상호작용을 검증하는 것이 좋습니다.

### 22.6. 실제 의존성의 계약을 유지합니다

Mock 객체는 실제 Provider가 반환하는 데이터 구조와 오류 처리 계약을 가능한 한 동일하게 유지해야 합니다.

실제 구현과 다른 동작을 제공하는 Mock은 잘못된 테스트 결과를 유발할 수 있습니다.

### 22.7. 외부 시스템 통합은 별도로 검증합니다

Mock 기반 단위 테스트가 성공하더라도 실제 데이터베이스나 외부 API와 정상적으로 연동된다는 것을 보장하지는 않습니다.

따라서 주요 외부 시스템 연동은 Integration Testing 또는 별도의 Contract Testing 등으로 보완할 수 있습니다.

---

## 23. 주요 오류와 해결 방법

### 23.1. Provider 의존성 해결 실패

**원인**

테스트 대상이 요구하는 Provider가 TestingModule에 등록되지 않았을 수 있습니다.

**해결 방법**

실제 Provider를 등록하거나 Mock Provider를 추가합니다.

```typescript
{
  provide: UsersRepository,
  useValue: mockRepository,
}
```

### 23.2. Injection Token 불일치

**원인**

Service에서 사용하는 Injection Token과 테스트에서 등록한 Token이 다를 수 있습니다.

**해결 방법**

Class, String, Symbol 중 실제로 사용하는 Token을 확인하여 동일하게 등록합니다.

### 23.3. Mock Function이 undefined를 반환하는 문제

**원인**

`vi.fn()`에 반환값을 설정하지 않았거나 `mockReset()` 이후 반환값을 다시 설정하지 않았을 수 있습니다.

**해결 방법**

테스트에서 필요한 값을 명시적으로 설정합니다.

```typescript
mockRepository.findById.mockResolvedValue({
  id: 1,
  name: 'Alice',
});
```

### 23.4. 테스트 간 Mock 상태가 공유되는 문제

**원인**

동일한 Mock 객체를 여러 테스트에서 재사용하면서 초기화하지 않았을 수 있습니다.

**해결 방법**

`beforeEach()`에서 Mock을 초기화하거나 새로운 Mock 객체를 생성합니다.

### 23.5. overrideProvider()가 적용되지 않는 문제

**원인**

잘못된 Injection Token을 지정했거나 해당 Provider가 예상과 다른 방식으로 등록되어 있을 수 있습니다.

**해결 방법**

실제 Module의 Provider 등록 방식을 확인하고 `compile()` 이전에 Override를 설정합니다.

### 23.6. 테스트는 성공하지만 실제 연동이 실패하는 문제

**원인**

Mock 객체가 실제 외부 시스템과 다른 동작을 제공하거나 실제 연동 자체가 테스트되지 않았을 수 있습니다.

**해결 방법**

실제 데이터베이스 또는 Sandbox API를 사용하는 Integration Testing을 추가합니다.

---

## 24. 정리

NestJS의 Mocking Providers는 DI 시스템을 활용하여 실제 의존성을 테스트용 구현으로 대체하는 기능입니다.

`useValue`, `useClass`, `useFactory` 등의 Custom Provider 기능으로 Mock 객체를 등록할 수 있으며, `overrideProvider()`를 통해 기존 Module에 등록된 Provider를 대체할 수 있습니다.

또한 `useMocker()`를 활용하면 누락된 의존성에 대한 Mock 객체를 생성하는 Factory를 등록할 수 있습니다.

핵심 개념은 다음과 같습니다.

| 개념 | 설명 |
|---|---|
| Test Double | 실제 의존성을 대신하는 테스트용 객체입니다. |
| Dummy | 테스트 실행에 필요한 인자를 채우는 객체입니다. |
| Stub | 미리 지정한 값을 반환하는 테스트 대역입니다. |
| Fake | 단순화된 실제 동작을 제공하는 테스트 대역입니다. |
| Spy | 함수 호출과 전달된 인자를 관찰합니다. |
| Mock | 테스트 대상과 의존성 사이의 상호작용을 검증합니다. |
| `useValue` | 테스트용 객체를 Provider로 등록합니다. |
| `useClass` | 테스트용 클래스를 Provider로 등록합니다. |
| `useFactory` | Factory Function으로 테스트용 Provider를 생성합니다. |
| `overrideProvider()` | 기존 Provider를 테스트용 구현으로 대체합니다. |
| `useMocker()` | 누락된 의존성에 대한 Mock Factory를 등록합니다. |
| `vi.fn()` | Vitest Mock Function을 생성합니다. |
| `vi.spyOn()` | 기존 메서드의 호출을 관찰합니다. |
| `mockResolvedValue()` | 비동기 성공 결과를 설정합니다. |
| `mockRejectedValue()` | 비동기 실패 결과를 설정합니다. |
| `mockReset()` | Mock 호출 이력 및 구현을 초기화합니다. |
| `getRepositoryToken()` | TypeORM Repository의 Injection Token을 가져옵니다. |
| Mock Factory | 여러 테스트에서 재사용할 Mock 객체를 생성합니다. |

Mocking을 사용할 때는 검증할 실제 구현과 테스트 대역으로 대체할 의존성의 경계를 명확하게 구분해야 합니다.

특히 Mock 객체의 반환값과 동작이 실제 의존성의 계약에 부합하도록 구성하고, 테스트 간 Mock 상태를 독립적으로 관리하는 것이 중요합니다.

---

## 25. 관련 문서

- [Unit Testing](./unit-testing.md): Mock Provider를 활용한 Service 및 Controller 단위 테스트를 설명합니다.
- [Integration Testing](./integration-testing.md): 실제 Provider 간 연동과 외부 의존성 처리 전략을 설명합니다.
- [E2E Testing](./e2e-testing.md): HTTP 요청 처리 흐름에서 일부 Provider를 대체하는 방법을 설명합니다.
- [Testing Modules](./testing-modules.md): TestingModule 생성 및 Override API를 설명합니다.
- [Providers](../01-fundamentals/providers.md): NestJS Provider의 개념과 역할을 설명합니다.
- [Dependency Injection](../01-fundamentals/dependency-injection.md): DI Container와 Constructor Injection의 동작 원리를 설명합니다.
- [Custom Providers](../01-fundamentals/custom-providers.md): `useValue`, `useClass`, `useFactory`, `useExisting`을 설명합니다.
- [Injection Scopes](../01-fundamentals/injection-scopes.md): Singleton, Request 및 Transient Scope를 설명합니다.
- [Database](../03-techniques/database.md): ORM 및 Repository 기반 데이터베이스 연동을 설명합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Documentation — Testing](https://docs.nestjs.com/fundamentals/testing)
  - TestingModule, Mock Provider, `overrideProvider()` 및 `useMocker()`를 설명합니다.

- [NestJS Documentation — Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
  - `useValue`, `useClass`, `useFactory`, `useExisting` 등의 Provider 등록 방법을 설명합니다.

- [NestJS Documentation — Providers](https://docs.nestjs.com/providers)
  - Provider의 역할과 NestJS DI Container의 기본 동작을 설명합니다.

- [NestJS Documentation — Module Reference](https://docs.nestjs.com/fundamentals/module-ref)
  - Provider 조회 및 Scoped Provider의 Context 관리 방법을 설명합니다.

- [NestJS Documentation — Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
  - Singleton, Request 및 Transient Scope의 동작을 설명합니다.

- [NestJS Documentation — TypeORM](https://docs.nestjs.com/techniques/database)
  - TypeORM Repository Injection과 데이터베이스 테스트 관련 기능을 설명합니다.

- [NestJS Documentation — Common Errors](https://docs.nestjs.com/faq/common-errors)
  - Provider 등록 및 의존성 해결 과정에서 발생할 수 있는 오류를 설명합니다.

### Vitest 공식 문서

- [Vitest — Mocking](https://vitest.dev/guide/mocking)
  - Vitest의 Mocking 기능과 테스트 대역 사용 방법을 설명합니다.

- [Vitest — Mock Functions](https://vitest.dev/guide/learn/mock-functions)
  - Mock Function 생성, 반환값 지정 및 호출 검증 방법을 설명합니다.

- [Vitest — Mock API](https://vitest.dev/api/mock)
  - `mockClear()`, `mockReset()`, `mockRestore()` 등의 세부 API를 설명합니다.

- [Vitest — vi API](https://vitest.dev/api/vi)
  - `vi.fn()`, `vi.spyOn()`, `vi.mock()` 등 Mocking 관련 유틸리티를 설명합니다.

- [Vitest — Setup and Teardown](https://vitest.dev/guide/learn/setup-teardown)
  - 테스트 간 Mock 상태 초기화 및 Lifecycle 관리 방법을 설명합니다.

### Jest 공식 문서

- [Jest — Mock Functions](https://jestjs.io/docs/mock-functions)
  - Jest Mock Function과 반환값 및 호출 검증 방법을 설명합니다.

- [Jest — Jest Object](https://jestjs.io/docs/jest-object)
  - Jest에서 제공하는 Mocking 및 Spy 관련 API를 설명합니다.

### 기타 참고 자료

- [NestJS GitHub Repository](https://github.com/nestjs/nest)
  - NestJS 프레임워크의 DI 및 TestingModule 구현을 확인할 수 있습니다.

- [NestJS Official Samples](https://github.com/nestjs/nest/tree/master/sample)
  - NestJS에서 제공하는 다양한 Provider 및 테스트 구현 예제를 확인할 수 있습니다.
