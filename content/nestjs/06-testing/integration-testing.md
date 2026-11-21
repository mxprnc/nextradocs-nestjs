# Integration Testing

## 1. 개요

Integration Testing(통합 테스트)은 애플리케이션을 구성하는 여러 컴포넌트가 실제로 연동되었을 때 의도한 대로 동작하는지 검증하는 테스트 방식입니다.

Unit Testing이 개별 함수나 클래스의 동작을 독립적으로 검증하는 데 집중한다면, Integration Testing은 여러 Provider, Module 또는 외부 시스템 사이의 상호작용을 검증합니다.

NestJS에서는 `@nestjs/testing` 패키지의 `TestingModule`을 사용하여 실제 Dependency Injection(DI) 구조를 구성하고, 여러 컴포넌트를 함께 실행할 수 있습니다.

대표적인 검증 대상은 다음과 같습니다.

- Service와 Repository 간의 연동
- 여러 Service 사이의 비즈니스 로직 연동
- Module 간 Provider 등록 및 의존성 주입
- ORM과 실제 데이터베이스 사이의 데이터 처리
- Service와 외부 API Client 간의 상호작용
- 이벤트 발행과 이벤트 처리 컴포넌트 간의 연동

Integration Testing의 핵심은 개별 메서드의 동작뿐만 아니라 **여러 구성 요소가 연결된 상태에서 데이터와 제어 흐름이 올바르게 처리되는지 검증하는 것**입니다.

### 1.1. Integration Testing의 목적

Integration Testing은 다음과 같은 목적을 가집니다.

- **컴포넌트 간 연동 검증:** 여러 Service와 Repository가 정상적으로 협력하는지 확인합니다.
- **Dependency Injection 검증:** Module에 등록된 Provider가 올바르게 주입되는지 확인합니다.
- **데이터 처리 검증:** 여러 계층을 거쳐 데이터가 정상적으로 전달되고 저장되는지 확인합니다.
- **설정 오류 발견:** 잘못된 Provider 등록, Module Import 및 Export 구성을 조기에 발견합니다.
- **외부 시스템 연동 검증:** 데이터베이스나 메시지 브로커 등과의 연동을 확인합니다.
- **회귀 오류 방지:** 여러 구성 요소의 변경으로 발생하는 연동 오류를 탐지합니다.

### 1.2. Unit Testing과 Integration Testing의 차이

| 구분 | Unit Testing | Integration Testing |
|---|---|---|
| 테스트 범위 | 개별 함수 또는 클래스 | 여러 컴포넌트의 연동 |
| 주요 검증 대상 | 개별 비즈니스 로직 | 컴포넌트 간 상호작용 |
| 의존성 처리 | 일반적으로 Mock 사용 | 실제 구현을 우선 사용 |
| DI 컨테이너 | 선택적 | NestJS 연동 검증 시 사용 |
| 데이터베이스 | 일반적으로 Mock 사용 | 실제 테스트 DB 사용 가능 |
| 실행 속도 | 일반적으로 빠름 | 상대적으로 느릴 수 있음 |
| 오류 발견 | 개별 로직 오류 | 구성 및 연동 오류 |

예를 들어 `UsersService`가 `UsersRepository`를 호출하는 상황을 가정하겠습니다.

Unit Testing에서는 Repository를 Mock 객체로 대체하고 Service의 동작을 검증할 수 있습니다.

반면 Integration Testing에서는 실제 Repository 구현을 사용하여 Service에서 전달한 데이터가 Repository를 거쳐 올바르게 처리되는지 확인합니다.

다만 통합 테스트가 반드시 실제 데이터베이스나 네트워크를 사용해야 하는 것은 아닙니다.

테스트하려는 통합 경계에 따라 일부 외부 의존성은 Mock으로 대체할 수 있습니다.

---

## 2. NestJS 통합 테스트의 구조

NestJS는 Module과 Provider를 중심으로 애플리케이션을 구성합니다.

통합 테스트에서는 이러한 구조를 테스트 환경에서도 재현하여 실제 Provider 간의 의존성 주입과 메서드 호출을 검증합니다.

### 2.1. 일반적인 애플리케이션 구조

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

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| UsersController | HTTP 요청을 처리합니다. |
| UsersService | 사용자 관련 비즈니스 로직을 수행합니다. |
| UsersRepository | 데이터 저장 및 조회 작업을 수행합니다. |
| Database | 사용자 데이터를 영속적으로 저장합니다. |

통합 테스트에서는 검증 목적에 따라 연결할 구성 요소의 범위를 선택합니다.

### 2.2. Service와 Repository 통합 테스트

```text
       TestingModule
             │
             ▼
       UsersService
             │
             ▼
      UsersRepository
             │
             ▼
       Test Database
```

이 구조에서는 실제 Service와 Repository를 사용하여 비즈니스 로직과 데이터 접근 기능의 연동을 검증합니다.

### 2.3. Service 간 통합 테스트

```text
       TestingModule
             │
             ▼
       OrdersService
             │
       ┌─────┴─────┐
       ▼           ▼
  UsersService  InventoryService
```

여러 Service가 하나의 비즈니스 기능을 수행하는 경우, 해당 Service들을 함께 등록하여 호출 흐름을 검증할 수 있습니다.

### 2.4. 통합 테스트 범위 결정

통합 테스트를 작성하기 전에 어떤 경계를 실제 구현으로 검증할 것인지 결정해야 합니다.

예를 들어 다음과 같이 구분할 수 있습니다.

| 테스트 범위 | 실제 구현 | 대체 가능한 의존성 |
|---|---|---|
| Service 간 연동 | 여러 Service | 외부 API, Repository |
| Service-Repository 연동 | Service, Repository | 실제 DB 또는 테스트용 저장소 |
| Database Integration | Service, ORM, Database | 외부 API |
| Module Integration | Module, Provider | 외부 시스템 일부 |

통합 테스트에서는 모든 구성 요소를 실제 구현으로 사용할 필요는 없습니다.

다만 검증하려는 컴포넌트 간의 연결은 실제 구현을 유지해야 통합 테스트의 목적을 달성할 수 있습니다.

---

## 3. 테스트 환경 구성

NestJS 통합 테스트는 Unit Testing과 마찬가지로 `@nestjs/testing` 패키지를 사용합니다.

테스트 실행에는 Vitest 또는 Jest와 같은 테스트 프레임워크를 사용할 수 있습니다.

이 문서에서는 Vitest를 기준으로 설명합니다.

### 3.1. 패키지 설치

프로젝트에 테스트 관련 패키지가 설치되어 있지 않다면 다음 명령어로 설치합니다.

```bash
npm install --save-dev @nestjs/testing vitest
```

실제 데이터베이스를 사용하는 예제에서는 사용하는 ORM과 데이터베이스 드라이버에 따라 추가 패키지가 필요합니다.

예를 들어 PostgreSQL과 TypeORM을 사용하는 경우 다음 패키지를 설치합니다.

```bash
npm install @nestjs/typeorm typeorm pg
```

이 문서의 기본 예제는 데이터베이스 없이도 실행할 수 있도록 구성하며, 실제 데이터베이스를 사용하는 방법은 별도 섹션에서 설명합니다.

### 3.2. 테스트 디렉터리 구조

```text
src/
├── app.module.ts
└── users/
    ├── users.module.ts
    ├── users.service.ts
    ├── users.repository.ts
    ├── users.service.spec.ts
    └── users.integration.spec.ts

test/
├── integration/
│   └── users.integration.spec.ts
└── e2e/
    └── app.e2e-spec.ts
```

통합 테스트 파일은 대상 컴포넌트와 같은 디렉터리에 배치하거나 별도의 `test/integration` 디렉터리에서 관리할 수 있습니다.

NestJS가 통합 테스트 파일의 위치를 강제하지는 않습니다.

프로젝트 규모와 테스트 실행 전략에 따라 일관된 구조를 선택하는 것이 중요합니다.

---

## 4. TestingModule을 이용한 통합 테스트

NestJS에서는 `Test.createTestingModule()`을 사용하여 테스트에 필요한 Module과 Provider를 구성할 수 있습니다.

단위 테스트와 동일한 API를 사용하지만, 여러 실제 Provider를 함께 구성한다는 점에서 차이가 있습니다.

### 4.1. 기본 구조

```typescript
import { Test, TestingModule } from '@nestjs/testing';

const moduleRef: TestingModule =
  await Test.createTestingModule({
    providers: [
      UsersService,
      UsersRepository,
    ],
  }).compile();

const usersService =
  moduleRef.get<UsersService>(UsersService);
```

위 코드는 `UsersService`와 `UsersRepository`를 실제 Provider로 등록합니다.

NestJS DI 컨테이너는 각 Provider의 의존성을 분석하고 필요한 인스턴스를 생성합니다.

이때 `UsersService`가 Constructor Injection을 통해 `UsersRepository`에 의존한다면, 실제 Repository 인스턴스가 주입됩니다.

### 4.2. TestingModule 동작 과정

```text
Test.createTestingModule()
           │
           ▼
     Module Metadata
           │
           ▼
        compile()
           │
           ▼
     DI Container 구성
           │
           ▼
     Provider 인스턴스 생성
           │
           ▼
     Dependency Injection
           │
           ▼
    TestingModule.get()
           │
           ▼
      테스트 실행
```

`compile()`은 모듈을 컴파일하고 Provider 의존성을 구성합니다.

단, `compile()`만으로 HTTP 서버가 실행되는 것은 아닙니다.

또한 `OnModuleInit` 및 `OnApplicationBootstrap`과 같은 애플리케이션 초기화 Lifecycle Hook은 별도의 애플리케이션 초기화 과정이 필요합니다.

일반적인 Provider 간 통합 테스트에서는 HTTP 서버를 생성하지 않고도 충분히 검증할 수 있습니다.

---

## 5. Service와 Repository 통합 테스트

이번 예제에서는 사용자 등록과 조회 기능을 구현하고, 실제 Service와 Repository가 연동되는지 확인합니다.

외부 데이터베이스 없이도 통합 테스트의 구조를 이해할 수 있도록 In-Memory Repository를 사용합니다.

이 예제는 **Service와 Repository 사이의 통합을 검증하며, 실제 데이터베이스 영속성은 검증하지 않습니다.**

### 5.1. User 인터페이스 정의

```typescript
// user.interface.ts
export interface User {
  id: number;
  name: string;
}
```

### 5.2. Repository 구현

```typescript
// users.repository.ts
import { Injectable } from '@nestjs/common';

import { User } from './user.interface';

@Injectable()
export class UsersRepository {
  private readonly users = new Map<number, User>();

  async save(user: User): Promise<User> {
    this.users.set(user.id, user);

    return user;
  }

  async findById(id: number): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}
```

`UsersRepository`는 In-Memory Map을 사용하여 데이터를 저장합니다.

실제 데이터베이스와 통신하지는 않지만 Repository의 저장 및 조회 메서드를 실제로 실행합니다.

### 5.3. Service 구현

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

  async create(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    return user;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }
}
```

`UsersService`는 Repository를 직접 생성하지 않고 Constructor Injection을 통해 주입받습니다.

### 5.4. 통합 테스트 작성

```typescript
// users.integration.spec.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService Integration', () => {
  let moduleRef: TestingModule;
  let usersService: UsersService;
  let usersRepository: UsersRepository;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        UsersRepository,
      ],
    }).compile();

    usersService =
      moduleRef.get<UsersService>(UsersService);

    usersRepository =
      moduleRef.get<UsersRepository>(UsersRepository);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('사용자를 저장한 후 조회할 수 있어야 합니다.', async () => {
    const user = {
      id: 1,
      name: 'Alice',
    };

    await usersService.create(user);

    const result = await usersService.findOne(1);

    expect(result).toEqual(user);
  });

  it('Service를 통해 저장한 데이터가 Repository에 존재해야 합니다.', async () => {
    const user = {
      id: 2,
      name: 'Bob',
    };

    await usersService.create(user);

    const result = await usersRepository.findById(2);

    expect(result).toEqual(user);
  });

  it('존재하지 않는 사용자는 예외를 발생시켜야 합니다.', async () => {
    await expect(
      usersService.findOne(999),
    ).rejects.toThrow(NotFoundException);
  });

  it('여러 사용자를 저장하고 조회할 수 있어야 합니다.', async () => {
    await usersService.create({
      id: 1,
      name: 'Alice',
    });

    await usersService.create({
      id: 2,
      name: 'Bob',
    });

    const users = await usersService.findAll();

    expect(users).toHaveLength(2);
  });
});
```

### 5.5. 테스트 동작 분석

테스트 실행 과정은 다음과 같습니다.

```text
        Integration Test
                │
                ▼
          TestingModule
                │
                ▼
          UsersService
                │
                ▼
         UsersRepository
                │
                ▼
           In-Memory Map
                │
                ▼
           결과 반환
                │
                ▼
          expect() 검증
```

이 테스트에서는 다음 항목을 검증합니다.

1. `UsersService`가 실제 `UsersRepository`를 주입받는지 확인합니다.
2. Service의 `create()` 메서드가 Repository의 `save()` 메서드와 연동되는지 확인합니다.
3. 저장한 데이터를 Repository에서 조회할 수 있는지 확인합니다.
4. 저장되지 않은 데이터에 대한 예외 처리가 정상적으로 이루어지는지 확인합니다.

Unit Testing이었다면 Repository를 Mock으로 대체하고 반환값만 지정했을 것입니다.

반면 이 예제에서는 실제 Repository 메서드가 실행되므로 Service와 Repository 사이의 연동이 검증됩니다.

---

## 6. Module 단위의 통합 테스트

앞선 예제에서는 TestingModule에 Provider를 직접 등록했습니다.

하지만 실제 NestJS 프로젝트에서는 기능별 Module을 통해 Provider를 등록하고 관리합니다.

통합 테스트에서 실제 Module을 Import하면 Provider 등록과 Export 및 Import 관계까지 검증할 수 있습니다.

### 6.1. UsersModule 정의

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

`UsersModule`은 두 Provider를 등록하고 `UsersService`를 외부 Module에 공개합니다.

### 6.2. 실제 Module Import

```typescript
// users.module.integration.spec.ts
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { Test, TestingModule } from '@nestjs/testing';

import { UsersModule } from './users.module';
import { UsersService } from './users.service';

describe('UsersModule Integration', () => {
  let moduleRef: TestingModule;
  let usersService: UsersService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    usersService =
      moduleRef.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('UsersService가 정상적으로 등록되어야 합니다.', () => {
    expect(usersService).toBeDefined();
  });

  it('사용자를 저장하고 조회할 수 있어야 합니다.', async () => {
    await usersService.create({
      id: 1,
      name: 'Alice',
    });

    const user = await usersService.findOne(1);

    expect(user.name).toBe('Alice');
  });
});
```

이 방식에서는 실제 `UsersModule`에 정의된 Provider 구성을 테스트합니다.

따라서 필요한 Provider가 등록되지 않았거나 의존성이 해결되지 않는 경우 TestingModule의 컴파일 과정에서 오류가 발생할 수 있습니다.

다만 `moduleRef.get()`은 기본적으로 테스트 컨테이너에서 접근 가능한 Provider를 탐색하므로, 이것만으로 Module의 Export 계약을 완전히 검증하는 것은 아닙니다.

다른 Module에서 해당 Provider를 실제로 주입받을 수 있는지 검증하려면 소비자 Module을 함께 구성해야 합니다.

---

## 7. 여러 Module 간의 통합 테스트

실제 애플리케이션에서는 하나의 Module이 다른 Module에서 제공하는 Service를 사용하는 경우가 많습니다.

예를 들어 주문 기능이 사용자 정보를 조회한다고 가정하겠습니다.

```text
       OrdersModule
             │
             │ imports
             ▼
        UsersModule
             │
             │ exports
             ▼
        UsersService
```

### 7.1. OrdersService 구현

```typescript
// orders.service.ts
import { Injectable } from '@nestjs/common';

import { UsersService } from '../users/users.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  async validateUser(userId: number): Promise<boolean> {
    const user = await this.usersService.findOne(userId);

    return user.id === userId;
  }
}
```

### 7.2. OrdersModule 정의

```typescript
// orders.module.ts
import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { OrdersService } from './orders.service';

@Module({
  imports: [UsersModule],
  providers: [OrdersService],
})
export class OrdersModule {}
```

`OrdersModule`은 `UsersModule`을 Import합니다.

`UsersModule`에서 `UsersService`를 Export했으므로 `OrdersService`에서 해당 Provider를 주입받을 수 있습니다.

### 7.3. Module 통합 테스트

```typescript
// orders.integration.spec.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { Test, TestingModule } from '@nestjs/testing';

import { OrdersModule } from './orders.module';
import { OrdersService } from './orders.service';
import { UsersService } from '../users/users.service';

describe('OrdersModule Integration', () => {
  let moduleRef: TestingModule;
  let ordersService: OrdersService;
  let usersService: UsersService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [OrdersModule],
    }).compile();

    ordersService =
      moduleRef.get<OrdersService>(OrdersService);

    usersService =
      moduleRef.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('OrdersService가 UsersService와 연동되어야 합니다.', async () => {
    await usersService.create({
      id: 1,
      name: 'Alice',
    });

    const result = await ordersService.validateUser(1);

    expect(result).toBe(true);
  });
});
```

이 테스트는 다음 항목을 함께 검증합니다.

- `OrdersModule`이 `UsersModule`을 정상적으로 Import하는지 확인합니다.
- `UsersModule`이 `UsersService`를 올바르게 Export하는지 확인합니다.
- `OrdersService`에 `UsersService`가 주입되는지 확인합니다.
- 실제 Service 간 메서드 호출이 정상적으로 수행되는지 확인합니다.

이처럼 여러 Module의 실제 구성을 사용하면 개별 Service 테스트에서 발견하기 어려운 의존성 구성 오류를 확인할 수 있습니다.

---

## 8. 데이터베이스 통합 테스트

실무에서는 Service와 Repository 사이의 연동뿐만 아니라 ORM 및 실제 데이터베이스까지 검증해야 하는 경우가 많습니다.

데이터베이스 통합 테스트는 다음과 같은 기능을 검증합니다.

- Entity Mapping
- Repository CRUD 동작
- 실제 SQL 실행
- 데이터베이스 제약조건
- 트랜잭션 처리
- 데이터베이스별 쿼리 동작

단위 테스트에서 Repository를 Mock으로 대체하는 것과 달리, 데이터베이스 통합 테스트에서는 실제 데이터베이스 연결을 사용합니다.

### 8.1. 데이터베이스 통합 테스트 구조

```text
       Integration Test
               │
               ▼
          TestingModule
               │
               ▼
          UsersService
               │
               ▼
       TypeORM Repository
               │
               ▼
          TypeORM Driver
               │
               ▼
         Test Database
```

이 예제에서는 PostgreSQL과 TypeORM을 사용합니다.

다른 ORM이나 데이터베이스를 사용하는 프로젝트에서도 동일한 테스트 전략을 적용할 수 있습니다.

### 8.2. User Entity 정의

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

### 8.3. UsersService 구현

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(name: string): Promise<User> {
    const user = this.usersRepository.create({
      name,
    });

    return this.usersRepository.save(user);
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({
      id,
    });
  }
}
```

### 8.4. 테스트 데이터베이스 설정

실제 운영 데이터베이스와 테스트 데이터베이스는 반드시 분리해야 합니다.

예를 들어 PostgreSQL에 다음과 같은 별도 데이터베이스를 준비할 수 있습니다.

```text
Application Database: app_db
Test Database:        app_test_db
```

테스트 환경에서는 환경변수를 사용하여 데이터베이스 연결을 구성할 수 있습니다.

```dotenv
# .env.test
TEST_DATABASE_HOST=localhost
TEST_DATABASE_PORT=5432
TEST_DATABASE_USER=test_user
TEST_DATABASE_PASSWORD=test_password
TEST_DATABASE_NAME=app_test_db
```

위 값은 예시이며, 실제 환경에 맞게 변경해야 합니다.

테스트 데이터베이스에는 테스트에 필요한 권한만 부여하고 운영 데이터베이스에 접근할 수 없도록 구성하는 것이 중요합니다.

### 8.5. 실제 데이터베이스 통합 테스트

다음 예제는 테스트 전용 PostgreSQL 데이터베이스가 실행 중이고, `users` 테이블이 생성되어 있다고 가정합니다.

또한 테스트 실행 전에 `.env.test`의 환경변수가 프로세스에 로드되어 있어야 합니다.

테이블 생성에는 테스트 전용 Migration을 사용하는 방식을 권장합니다.

```typescript
// users.database.integration.spec.ts
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataSource } from 'typeorm';

import { User } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService Database Integration', () => {
  let moduleRef: TestingModule;
  let usersService: UsersService;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DATABASE_HOST,
          port: Number(
            process.env.TEST_DATABASE_PORT ?? 5432,
          ),
          username: process.env.TEST_DATABASE_USER,
          password: process.env.TEST_DATABASE_PASSWORD,
          database: process.env.TEST_DATABASE_NAME,
          entities: [User],
          synchronize: false,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UsersService],
    }).compile();

    usersService =
      moduleRef.get<UsersService>(UsersService);

    dataSource =
      moduleRef.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await dataSource
      .getRepository(User)
      .clear();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('사용자가 데이터베이스에 저장되어야 합니다.', async () => {
    const created = await usersService.create('Alice');

    const found = await usersService.findOne(created.id);

    expect(found).not.toBeNull();
    expect(found?.name).toBe('Alice');
  });

  it('저장한 사용자 정보를 조회할 수 있어야 합니다.', async () => {
    const created = await usersService.create('Bob');

    const found = await usersService.findOne(created.id);

    expect(found?.id).toBe(created.id);
  });
});
```

위 예제에서는 `UsersService`, TypeORM Repository 및 PostgreSQL 데이터베이스가 실제로 연동됩니다.

테스트가 실행되면 다음 과정이 수행됩니다.

1. TestingModule에서 TypeORM 연결을 구성합니다.
2. 실제 Repository가 `UsersService`에 주입됩니다.
3. Service를 통해 데이터를 저장합니다.
4. TypeORM이 실제 SQL을 실행합니다.
5. 저장된 데이터를 다시 조회합니다.
6. 조회 결과를 검증합니다.
7. 테스트 데이터를 삭제하여 다음 테스트에 영향을 주지 않도록 처리합니다.

`Repository.clear()`는 테이블의 데이터를 삭제하는 작업이므로 운영 데이터베이스에서 실행해서는 안 됩니다.

또한 `clear()`의 세부 동작과 제약조건 처리는 데이터베이스에 따라 다를 수 있습니다.

이 예제는 독립적인 테스트 데이터베이스와 단일 테이블을 사용하는 단순한 상황을 전제로 합니다.

외래 키 관계가 있거나 여러 테이블을 사용하는 경우에는 별도의 데이터 정리 전략이 필요합니다.

---

## 9. 테스트 데이터 격리

데이터베이스 통합 테스트에서는 테스트 간의 데이터 간섭을 방지하는 것이 중요합니다.

예를 들어 첫 번째 테스트에서 생성한 사용자가 두 번째 테스트에도 남아 있다면 테스트 실행 순서에 따라 결과가 달라질 수 있습니다.

이를 방지하기 위해 테스트 데이터 격리 전략을 적용해야 합니다.

### 9.1. 데이터 격리 전략 비교

| 전략 | 설명 | 특징 |
|---|---|---|
| 테스트별 데이터 초기화 | 테스트 전후에 데이터를 삭제합니다. | 구현이 비교적 단순합니다. |
| 트랜잭션 롤백 | 테스트를 트랜잭션으로 실행하고 롤백합니다. | 빠른 초기화가 가능할 수 있습니다. |
| 데이터베이스 재생성 | 테스트마다 DB 또는 Schema를 재생성합니다. | 높은 격리 수준을 제공합니다. |
| Testcontainers | 테스트용 데이터베이스 컨테이너를 생성합니다. | 실제 DB 환경에 가까운 테스트가 가능합니다. |
| 고유 테스트 데이터 | 테스트별 고유 ID를 사용합니다. | 충돌을 줄이지만 완전한 격리를 보장하지는 않습니다. |

### 9.2. 테스트별 데이터 초기화

간단한 방법은 `beforeEach()` 또는 `afterEach()`에서 데이터를 정리하는 것입니다.

```typescript
afterEach(async () => {
  await dataSource
    .getRepository(User)
    .clear();
});
```

하지만 여러 테스트가 동일한 데이터베이스를 병렬로 사용할 경우 다른 테스트에서 생성한 데이터까지 삭제할 수 있습니다.

따라서 병렬 테스트 환경에서는 테스트별 데이터베이스나 Schema를 분리하는 방식 등을 고려해야 합니다.

### 9.3. 트랜잭션 롤백

트랜잭션을 이용하면 테스트에서 수행한 변경사항을 롤백할 수 있습니다.

TypeORM의 `QueryRunner`를 사용하면 다음과 같이 트랜잭션을 제어할 수 있습니다.

```typescript
import { QueryRunner } from 'typeorm';

let queryRunner: QueryRunner;

beforeEach(async () => {
  queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();
});

afterEach(async () => {
  try {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
  } finally {
    await queryRunner.release();
  }
});
```

단, 이 코드만으로 `UsersService`에서 실행되는 모든 Repository 작업이 해당 트랜잭션에 포함되는 것은 아닙니다.

TypeORM의 트랜잭션은 해당 트랜잭션의 `EntityManager`를 통해 실행한 작업에 적용됩니다.

따라서 테스트 대상 Service가 일반 Repository를 사용한다면 별도의 연결이나 EntityManager를 통해 작업이 실행될 수 있습니다.

트랜잭션 롤백 방식으로 테스트를 격리하려면 Service와 Repository가 동일한 트랜잭션 Context를 사용하도록 설계해야 합니다.

이러한 구조를 구성하지 않았다면 테스트 전후의 데이터 초기화나 독립된 데이터베이스를 사용하는 방식이 더 명확할 수 있습니다.

---

## 10. Testcontainers를 활용한 통합 테스트

Testcontainers는 테스트 실행 중 Docker 컨테이너를 생성하여 외부 의존성을 제공하는 테스트 도구입니다.

PostgreSQL, MySQL, Redis 등 실제 서비스에서 사용하는 시스템을 테스트 컨테이너로 실행할 수 있습니다.

이를 통해 별도의 공유 테스트 서버를 유지하지 않고도 실제 데이터베이스와의 연동을 검증할 수 있습니다.

### 10.1. Testcontainers 구조

```text
       Integration Test
               │
               ▼
          NestJS Service
               │
               ▼
        TypeORM Repository
               │
               ▼
      PostgreSQL Container
               │
               ▼
           Test Data
```

### 10.2. 패키지 설치

PostgreSQL Testcontainers를 사용하려면 다음 패키지를 설치합니다.

```bash
npm install --save-dev @testcontainers/postgresql
```

Testcontainers를 실행하려면 호환되는 컨테이너 런타임이 필요합니다.

일반적으로 Docker Engine 등을 사용합니다.

### 10.3. PostgreSQL 컨테이너 생성

```typescript
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer(
    'postgres:16-alpine',
  )
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_password')
    .start();
});

afterAll(async () => {
  await container.stop();
});
```

컨테이너를 시작한 후에는 다음 메서드를 통해 실제 연결 정보를 가져올 수 있습니다.

```typescript
const host = container.getHost();
const port = container.getPort();
const username = container.getUsername();
const password = container.getPassword();
const database = container.getDatabase();
```

이 값을 `TypeOrmModule.forRoot()`에 전달하면 컨테이너 기반 테스트 데이터베이스를 사용할 수 있습니다.

컨테이너가 준비된 후 TypeORM 연결을 생성하고, 필요한 Migration을 실행해야 합니다.

### 10.4. Testcontainers의 장점과 고려사항

**장점**

- 실제 데이터베이스 엔진을 사용하여 테스트할 수 있습니다.
- 개발 환경과 CI 환경에서 비교적 일관된 실행 환경을 구성할 수 있습니다.
- 테스트 전용 데이터베이스를 생성하여 운영 데이터와 분리할 수 있습니다.
- 데이터베이스 버전을 명시하여 환경 차이를 줄일 수 있습니다.

**고려사항**

- Docker 등 컨테이너 런타임이 필요합니다.
- 컨테이너 생성 및 초기화 시간이 발생합니다.
- 테스트 병렬 실행 시 리소스 사용량이 증가할 수 있습니다.
- Migration과 초기 데이터 구성이 추가로 필요합니다.

따라서 모든 단위 테스트에 Testcontainers를 사용하는 것보다는 실제 데이터베이스 동작 검증이 필요한 통합 테스트에 선택적으로 사용하는 것이 적절합니다.

---

## 11. 외부 의존성 처리와 Provider Override

통합 테스트에서는 검증 대상이 아닌 외부 시스템을 Mock으로 대체할 수 있습니다.

예를 들어 `OrdersService`와 `PaymentService` 사이의 연동을 검증하되, 실제 외부 결제 API는 호출하지 않도록 구성할 수 있습니다.

```text
        OrdersService
              │
              ▼
        PaymentService
              │
              ▼
       Mock PaymentClient
```

이 구조에서는 `OrdersService`와 `PaymentService`의 실제 구현을 유지합니다.

반면 외부 결제 API에 접근하는 `PaymentClient`만 Mock으로 대체합니다.

### 11.1. overrideProvider() 사용

다음은 실제 Module을 Import하면서 일부 Provider만 대체하는 예제입니다.

```typescript
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { OrdersModule } from './orders.module';
import { OrdersService } from './orders.service';
import { PaymentClient } from './payment.client';

const mockPaymentClient = {
  requestPayment: vi.fn().mockResolvedValue({
    success: true,
  }),
};

const moduleRef = await Test.createTestingModule({
  imports: [OrdersModule],
})
  .overrideProvider(PaymentClient)
  .useValue(mockPaymentClient)
  .compile();

const ordersService =
  moduleRef.get<OrdersService>(OrdersService);
```

이 예제는 `OrdersModule`의 의존성 그래프에 `PaymentClient`가 Provider로 등록되어 있다고 가정합니다.

또한 `PaymentClient`가 Class Token으로 사용된다고 가정하며, 실제 프로젝트에서 문자열이나 Symbol Token을 사용한다면 해당 Token을 지정해야 합니다.

`overrideProvider()`는 Module에 등록된 특정 Provider를 테스트용 구현으로 대체할 때 사용합니다.

### 11.2. Mock 범위 결정

통합 테스트에서는 Mock의 적용 범위가 중요합니다.

다음 원칙을 고려할 수 있습니다.

- 검증하려는 컴포넌트의 실제 구현은 유지합니다.
- 테스트 대상 밖에 있는 외부 시스템은 필요에 따라 대체합니다.
- 실제 연동을 검증해야 하는 의존성까지 Mock으로 대체하지 않습니다.
- Mock으로 대체한 부분은 해당 테스트에서 실제 연동이 검증되지 않는다는 점을 명확하게 인식해야 합니다.

예를 들어 `OrdersService`와 `PaymentService` 사이의 연동을 검증하려는데 `PaymentService` 자체를 Mock으로 대체한다면, 두 Service의 실제 연동은 검증되지 않습니다.

Provider Mocking에 관한 구체적인 구현 방법은 `mocking-providers.md` 문서에서 별도로 설명합니다.

---

## 12. 테스트 Lifecycle 관리

통합 테스트에서는 여러 Provider와 외부 리소스를 사용하므로 테스트 환경의 생성 및 종료 과정을 명확하게 관리해야 합니다.

Vitest에서는 `beforeAll()`, `beforeEach()`, `afterEach()`, `afterAll()` 등의 Lifecycle Hook을 제공합니다.

### 12.1. 주요 Lifecycle Hook

| Hook | 실행 시점 | 주요 용도 |
|---|---|---|
| `beforeAll()` | 테스트 그룹 실행 전 한 번 | TestingModule 및 DB 연결 생성 |
| `beforeEach()` | 각 테스트 실행 전 | 테스트 데이터 초기화 |
| `afterEach()` | 각 테스트 실행 후 | 테스트 데이터 정리 |
| `afterAll()` | 테스트 그룹 종료 후 한 번 | Module 및 외부 리소스 종료 |

### 12.2. 테스트 환경 생성과 종료

```typescript
let moduleRef: TestingModule;
let usersService: UsersService;

beforeAll(async () => {
  moduleRef = await Test.createTestingModule({
    providers: [
      UsersService,
      UsersRepository,
    ],
  }).compile();

  usersService =
    moduleRef.get<UsersService>(UsersService);
});

afterAll(async () => {
  await moduleRef.close();
});
```

TestingModule을 재사용하면 매 테스트마다 DI 컨테이너를 다시 구성하는 비용을 줄일 수 있습니다.

하지만 Singleton Provider에 상태가 저장되는 경우 테스트 간 상태가 공유될 수 있습니다.

따라서 상태가 변경되는 Provider를 테스트할 때는 다음 방법 중 하나를 적용해야 합니다.

- 테스트마다 새로운 TestingModule을 생성합니다.
- 테스트 실행 전에 Provider의 내부 상태를 초기화합니다.
- 테스트 간 공유 상태가 없도록 Provider를 설계합니다.
- 외부 저장소를 사용하는 경우 테스트 데이터를 정리합니다.

테스트 독립성이 중요하다면 실행 속도만을 이유로 TestingModule을 무조건 공유해서는 안 됩니다.

### 12.3. Application Lifecycle Hook

NestJS에서는 `OnModuleInit`, `OnApplicationBootstrap` 등의 Lifecycle Hook을 사용할 수 있습니다.

이러한 Hook은 일반적인 TestingModule의 `compile()`만으로 모두 실행되는 것이 아닙니다.

애플리케이션 초기화 동작까지 검증해야 한다면 다음과 같이 Nest Application을 생성하고 초기화할 수 있습니다.

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
}).compile();

const app = moduleRef.createNestApplication();

await app.init();

// 테스트 실행

await app.close();
```

`app.init()`은 Nest Application을 초기화하지만 HTTP 포트를 자동으로 열지는 않습니다.

또한 이 방식은 Application Lifecycle 및 HTTP 관련 구성을 포함하므로 단순한 Provider 통합 테스트보다 테스트 범위가 넓어집니다.

실제 HTTP 요청까지 검증하는 경우에는 E2E Testing과의 경계를 명확히 설정해야 합니다.

---

## 13. Integration Testing과 E2E Testing의 차이

Integration Testing과 E2E Testing은 모두 여러 구성 요소의 연동을 검증할 수 있습니다.

차이는 테스트의 범위와 검증을 시작하는 진입점에 있습니다.

### 13.1. Integration Testing

```text
       Integration Test
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

통합 테스트는 특정 컴포넌트 또는 Module을 직접 호출하여 연동을 검증할 수 있습니다.

실제 HTTP 요청을 발생시키지 않아도 됩니다.

### 13.2. E2E Testing

```text
          HTTP Request
               │
               ▼
           HTTP Server
               │
               ▼
           Controller
               │
               ▼
            Service
               │
               ▼
           Repository
               │
               ▼
            Database
               │
               ▼
          HTTP Response
```

E2E Testing은 일반적으로 실제 HTTP 요청을 발생시키고 애플리케이션의 전체 요청 처리 흐름을 검증합니다.

이 과정에는 Routing, Middleware, Guard, Pipe, Interceptor 등의 동작이 포함될 수 있습니다.

### 13.3. 비교

| 항목 | Integration Testing | E2E Testing |
|---|---|---|
| 주요 목적 | 구성 요소 간 연동 검증 | 전체 사용자 요청 흐름 검증 |
| 테스트 진입점 | Service, Repository, Module 등 | HTTP 또는 외부 통신 인터페이스 |
| HTTP 서버 | 필수 아님 | HTTP 기반 E2E에서는 사용 |
| DI 검증 | 가능 | 가능 |
| 실제 DB 사용 | 선택적 | 선택적 |
| 테스트 범위 | 선택한 통합 경계 | 애플리케이션 외부 인터페이스 중심 |
| 주요 오류 | 연동 및 구성 오류 | 요청 처리 전체 흐름의 오류 |

통합 테스트와 E2E 테스트의 경계는 프로젝트의 테스트 전략에 따라 일부 겹칠 수 있습니다.

따라서 테스트의 이름보다 실제 검증 범위와 목적을 명확하게 정의하는 것이 중요합니다.

---

## 14. 통합 테스트 실행

통합 테스트는 Unit Testing과 분리하여 실행할 수 있도록 구성하는 것이 좋습니다.

특히 실제 데이터베이스나 외부 시스템을 사용하는 경우 별도 테스트 명령어를 제공하면 관리하기 편리합니다.

### 14.1. package.json 설정

다음은 Vitest를 사용하는 프로젝트의 스크립트 예시입니다.

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --exclude '**/*.integration.spec.ts' --exclude '**/*.e2e-spec.ts'",
    "test:integration": "vitest run --include '**/*.integration.spec.ts'"
  }
}
```

`--include` 지원 여부와 명령행 옵션은 사용하는 Vitest 버전에 따라 확인해야 합니다.

통합 테스트 전용 설정 파일을 구성하면 테스트 대상과 실행 환경을 더욱 명확하게 관리할 수 있습니다.

### 14.2. 통합 테스트 전용 설정

```typescript
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.integration.spec.ts',
      'test/integration/**/*.spec.ts',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
```

`testTimeout`은 개별 테스트의 제한 시간을, `hookTimeout`은 Setup 및 Teardown Hook의 제한 시간을 설정합니다.

데이터베이스 연결이나 컨테이너 초기화가 필요한 경우 적절한 제한 시간을 설정할 수 있습니다.

### 14.3. 실행 스크립트

```json
{
  "scripts": {
    "test:integration": "vitest run --config vitest.integration.config.ts"
  }
}
```

### 14.4. 테스트 실행

```bash
npm run test:integration
```

Vitest는 설정 파일에 지정된 통합 테스트 파일을 찾아 실행합니다.

데이터베이스 기반 통합 테스트라면 실행 전에 테스트 데이터베이스가 준비되어 있어야 합니다.

Testcontainers를 사용하는 경우에는 컨테이너 런타임이 정상적으로 실행 중이어야 합니다.

---

## 15. CI 환경에서의 통합 테스트

통합 테스트는 CI 파이프라인에서도 자동으로 실행할 수 있습니다.

일반적으로 다음 순서로 구성합니다.

```text
        Source Checkout
               │
               ▼
        Dependency Install
               │
               ▼
          Type Checking
               │
               ▼
           Unit Testing
               │
               ▼
     Test Database 준비
               │
               ▼
       Database Migration
               │
               ▼
       Integration Testing
               │
               ▼
       결과 및 리포트 확인
               │
               ▼
         CI Job 종료
```

### 15.1. CI 구성 시 고려사항

**테스트 환경 분리**

운영 환경과 테스트 환경의 데이터베이스 연결 정보를 분리해야 합니다.

**데이터베이스 준비**

통합 테스트 실행 전에 데이터베이스를 시작하고 필요한 Migration을 완료해야 합니다.

**환경변수 관리**

접속 정보 등은 CI 플랫폼의 환경변수 또는 Secret 관리 기능을 사용합니다.

**테스트 데이터 초기화**

이전 테스트 결과가 다음 테스트에 영향을 주지 않도록 데이터 격리 전략을 적용합니다.

**리소스 정리**

테스트 종료 후 데이터베이스 연결과 컨테이너 등의 리소스를 정리해야 합니다.

**실패 원인 확인**

테스트 실패 시 Assertion 결과뿐만 아니라 데이터베이스 연결 오류, Migration 실패 및 시간 초과 등의 원인도 확인해야 합니다.

---

## 16. 통합 테스트 설계 원칙

### 16.1. 검증할 통합 경계를 명확하게 정의합니다

통합 테스트를 작성하기 전에 어떤 구성 요소 사이의 연동을 검증할 것인지 결정해야 합니다.

예를 들어 Service와 Repository 간의 연동을 검증한다면 두 구성 요소의 실제 구현을 유지해야 합니다.

### 16.2. 검증 대상이 아닌 외부 의존성은 분리합니다

외부 API, 메시지 브로커 등 검증 대상이 아닌 시스템은 필요에 따라 Mock으로 대체할 수 있습니다.

다만 실제 외부 시스템과의 호환성을 확인해야 하는 경우에는 별도의 통합 테스트를 구성해야 합니다.

### 16.3. 테스트 데이터를 독립적으로 관리합니다

테스트 실행 순서나 이전 실행 결과에 따라 테스트 결과가 달라지지 않도록 구성해야 합니다.

테스트별 데이터 초기화, 트랜잭션 격리 또는 독립된 데이터베이스를 사용할 수 있습니다.

### 16.4. 실제 운영 환경과의 차이를 고려합니다

In-Memory Repository는 Service 간 연동을 검증하는 데 유용하지만 실제 데이터베이스의 SQL 실행과 제약조건을 검증하지는 못합니다.

데이터베이스 관련 동작이 중요한 경우 실제 운영 환경과 동일한 종류의 데이터베이스를 사용하는 것이 적절합니다.

### 16.5. 테스트 리소스를 정리합니다

TestingModule, 데이터베이스 연결, 외부 서버 및 컨테이너 등은 테스트가 종료될 때 적절하게 정리해야 합니다.

리소스가 정리되지 않으면 테스트 프로세스가 종료되지 않거나 이후 테스트에 영향을 줄 수 있습니다.

### 16.6. 성공 및 실패 시나리오를 함께 검증합니다

정상적인 연동뿐만 아니라 다음 상황도 확인해야 합니다.

- 의존성에서 오류가 발생하는 경우
- 데이터가 존재하지 않는 경우
- 데이터베이스 제약조건을 위반하는 경우
- 트랜잭션 실행 중 오류가 발생하는 경우
- 외부 시스템의 응답이 지연되거나 실패하는 경우

### 16.7. 테스트 실행 비용을 관리합니다

통합 테스트는 단위 테스트보다 많은 리소스를 사용하고 실행 시간이 길어질 수 있습니다.

따라서 모든 테스트를 통합 테스트로 작성하기보다는 핵심 비즈니스 흐름과 중요한 연동 경계를 중심으로 구성하는 것이 좋습니다.

---

## 17. 정리

NestJS의 Integration Testing은 여러 Provider, Module 및 외부 시스템 사이의 연동을 검증하는 테스트 방식입니다.

`@nestjs/testing` 패키지의 `TestingModule`을 사용하면 실제 NestJS DI 구조를 구성하고 여러 Provider를 함께 실행할 수 있습니다.

또한 TypeORM, Prisma 등의 데이터 접근 기술 및 Testcontainers를 활용하여 실제 데이터베이스와의 연동을 검증할 수 있습니다.

핵심 개념은 다음과 같습니다.

| 개념 | 설명 |
|---|---|
| Integration Testing | 여러 컴포넌트 사이의 연동을 검증합니다. |
| TestingModule | 테스트용 NestJS DI 컨테이너를 구성합니다. |
| Module Integration | Module의 Import, Export 및 Provider 의존성을 검증합니다. |
| Service Integration | 여러 Service 사이의 호출과 데이터 흐름을 검증합니다. |
| Repository Integration | Service와 Repository 사이의 연동을 검증합니다. |
| Database Integration | ORM과 실제 데이터베이스 동작을 검증합니다. |
| Test Database | 운영 환경과 분리된 테스트 전용 데이터베이스입니다. |
| Testcontainers | 컨테이너 기반 외부 의존성을 테스트 환경에 제공합니다. |
| Provider Override | 일부 Provider를 테스트용 구현으로 대체합니다. |
| Test Isolation | 테스트 간 상태와 데이터 간섭을 방지합니다. |
| Transaction Rollback | 테스트에서 수행한 변경사항을 트랜잭션으로 롤백합니다. |
| Test Lifecycle | 테스트 환경의 생성, 초기화 및 종료를 관리합니다. |

통합 테스트에서는 검증하려는 컴포넌트의 실제 구현을 유지하고, 외부 의존성의 사용 여부를 테스트 목적에 따라 결정하는 것이 중요합니다.

또한 데이터베이스 및 외부 리소스를 사용하는 경우 테스트 환경과 운영 환경을 분리하고, 테스트 데이터 격리와 리소스 정리를 철저히 관리해야 합니다.

---

## 18. 관련 문서

- [Unit Testing](./unit-testing.md): 개별 Service, Controller 및 Provider의 단위 테스트 방법을 설명합니다.
- [E2E Testing](./e2e-testing.md): 실제 HTTP 요청을 통한 애플리케이션 전체 흐름의 검증 방법을 설명합니다.
- [Testing Modules](./testing-modules.md): NestJS TestingModule의 구성과 Provider 조회 및 테스트 환경 관리 방법을 설명합니다.
- [Mocking Providers](./mocking-providers.md): Provider Mocking 및 Override 전략을 설명합니다.
- [Modules](../01-fundamentals/modules.md): Module의 Import, Export 및 Provider 구성 방법을 설명합니다.
- [Dependency Injection](../01-fundamentals/dependency-injection.md): NestJS DI 컨테이너와 의존성 주입 원리를 설명합니다.
- [Database](../03-techniques/database.md): NestJS의 데이터베이스 연동 및 ORM 사용 방법을 설명합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Documentation — Testing](https://docs.nestjs.com/fundamentals/testing)
  - TestingModule, Provider Override, 테스트 환경 구성 및 E2E 테스트 방법을 설명합니다.

- [NestJS Documentation — Modules](https://docs.nestjs.com/modules)
  - Module의 Import, Export 및 Provider 등록 구조를 설명합니다.

- [NestJS Documentation — Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
  - Provider를 테스트용 구현으로 대체하는 방법을 이해하는 데 활용할 수 있습니다.

- [NestJS Documentation — Module Reference](https://docs.nestjs.com/fundamentals/module-ref)
  - NestJS DI 컨테이너에서 Provider 인스턴스를 조회하고 관리하는 방법을 설명합니다.

- [NestJS Documentation — TypeORM](https://docs.nestjs.com/data/typeorm)
  - TypeORM을 이용한 데이터베이스 연결, Repository Injection 및 테스트 관련 기능을 설명합니다.

- [NestJS Documentation — Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
  - Module과 Application의 초기화 및 종료 Lifecycle을 설명합니다.

### TypeORM 공식 문서

- [TypeORM — DataSource](https://typeorm.io/docs/data-source/data-source/)
  - 데이터베이스 연결과 DataSource 관리 방법을 설명합니다.

- [TypeORM — Transactions](https://typeorm.io/docs/advanced-topics/transactions/)
  - 트랜잭션 생성, 실행 및 롤백 방법을 설명합니다.

- [TypeORM — QueryRunner](https://typeorm.io/docs/query-runner/)
  - QueryRunner를 이용한 데이터베이스 연결 및 트랜잭션 제어 방법을 설명합니다.

### Testcontainers 공식 문서

- [Testcontainers for Node.js](https://node.testcontainers.org/)
  - Node.js에서 Docker 컨테이너 기반 통합 테스트를 구성하는 방법을 설명합니다.

- [Testcontainers — PostgreSQL Module](https://node.testcontainers.org/modules/postgresql/)
  - PostgreSQL 테스트 컨테이너의 생성 및 연결 방법을 설명합니다.

### Vitest 공식 문서

- [Vitest — Getting Started](https://vitest.dev/guide/)
  - Vitest 설치와 테스트 실행 방법을 설명합니다.

- [Vitest — Setup and Teardown](https://vitest.dev/guide/learn/setup-teardown)
  - 테스트 Lifecycle Hook을 이용한 초기화 및 정리 방법을 설명합니다.

- [Vitest — Mocking](https://vitest.dev/guide/mocking)
  - 외부 의존성 Mocking 및 테스트 격리 방법을 설명합니다.

### 기타 참고 자료

- [NestJS GitHub Repository](https://github.com/nestjs/nest)
  - NestJS 프레임워크의 실제 구현과 테스트 코드를 확인할 수 있습니다.

- [NestJS Official Samples](https://github.com/nestjs/nest/tree/master/sample)
  - NestJS의 공식 예제 프로젝트와 다양한 기술 구성 사례를 확인할 수 있습니다.
