# Layered Architecture

## 1. 개요

Layered Architecture(계층형 아키텍처)는 애플리케이션을 역할과 책임에 따라 여러 계층으로 분리하는 소프트웨어 아키텍처 패턴입니다.

각 계층은 특정한 관심사(Concern)를 담당하며, 계층 사이의 의존성과 호출 관계를 명확하게 정의하여 애플리케이션의 복잡도를 관리합니다.

NestJS는 Module, Controller, Provider 및 Dependency Injection(DI)을 제공하므로 계층형 아키텍처를 구현하기에 적합한 구조를 갖추고 있습니다.

일반적인 NestJS 애플리케이션에서는 다음과 같은 계층 구조를 사용합니다.

```text
Client
  │
  ▼
Controller
(Presentation Layer)
  │
  ▼
Service
(Business Logic Layer)
  │
  ▼
Repository
(Persistence Layer)
  │
  ▼
Database
```

각 계층은 다음과 같은 역할을 담당합니다.

| 계층 | 주요 역할 | NestJS 구성 요소 |
|---|---|---|
| Presentation Layer | 외부 요청 수신 및 응답 처리 | Controller |
| Business Logic Layer | 비즈니스 규칙 및 애플리케이션 로직 처리 | Service |
| Persistence Layer | 데이터 조회 및 영속성 관리 | Repository |
| Database | 데이터의 실제 저장 및 관리 | MySQL, PostgreSQL 등 |

이 구조는 NestJS에서 자주 사용하는 설계 방식이지만, NestJS 프레임워크가 특정 계층형 아키텍처를 강제하는 것은 아닙니다.

NestJS의 Module은 각 구성 요소를 조직하고 의존성을 관리하는 역할을 수행하며, Controller와 Provider를 조합하여 다양한 아키텍처 패턴을 구현할 수 있습니다.

---

## 2. Layered Architecture의 목적

계층형 아키텍처의 주요 목적은 관심사의 분리(Separation of Concerns)를 통해 애플리케이션의 유지보수성과 확장성을 향상하는 것입니다.

### 2.1. 관심사의 분리

애플리케이션의 모든 기능을 하나의 클래스에 구현하면 HTTP 요청 처리, 비즈니스 규칙, 데이터베이스 접근 로직이 서로 결합됩니다.

예를 들어 사용자 등록 기능에는 다음과 같은 작업이 포함될 수 있습니다.

1. HTTP 요청을 수신합니다.
2. 요청 데이터의 형식을 검증합니다.
3. 사용자 이메일의 중복 여부를 확인합니다.
4. 새로운 사용자를 생성합니다.
5. 사용자 정보를 데이터베이스에 저장합니다.
6. 처리 결과를 HTTP 응답으로 반환합니다.

이러한 작업을 하나의 Controller에서 처리하면 HTTP 처리 로직과 비즈니스 로직, 데이터베이스 접근 로직이 강하게 결합됩니다.

계층형 아키텍처에서는 다음과 같이 책임을 분리합니다.

| 처리 작업 | 담당 계층 |
|---|---|
| HTTP 요청 수신 | Controller |
| 요청 데이터 검증 | Controller 경계의 Pipe 및 DTO |
| 이메일 중복 여부 확인 | Service |
| 사용자 생성 규칙 처리 | Service |
| 데이터 조회 및 저장 | Repository |
| HTTP 응답 반환 | Controller 및 NestJS 응답 처리 시스템 |

이를 통해 각 계층은 자신의 책임에 집중할 수 있습니다.

### 2.2. 변경 영향 범위 최소화

계층 간 책임이 명확하면 특정 구현을 변경할 때 다른 계층에 미치는 영향을 줄일 수 있습니다.

예를 들어 데이터베이스 접근 방식을 변경하더라도 Repository의 외부 계약이 유지된다면 Service의 변경을 최소화할 수 있습니다.

다만 Service가 TypeORM Repository나 Entity에 직접 의존하는 구조에서는 데이터 접근 기술 변경 시 Service도 수정해야 할 수 있습니다.

따라서 계층을 분리하는 것만으로 모든 기술적 결합이 제거되는 것은 아닙니다.

### 2.3. 테스트 용이성 향상

각 계층의 책임이 분리되면 개별 구성 요소를 독립적으로 테스트하기 쉬워집니다.

예를 들어 Service의 단위 테스트에서는 실제 데이터베이스에 연결하지 않고 Repository를 Mock 객체로 대체할 수 있습니다.

또한 Controller 테스트에서는 Service를 Mock 객체로 대체하여 HTTP 요청 처리와 위임 동작에 집중할 수 있습니다.

### 2.4. 유지보수성 향상

기능의 책임이 명확하므로 문제 발생 시 관련 코드를 탐색하기 쉬워집니다.

예를 들어 다음과 같이 문제의 위치를 구분할 수 있습니다.

- 요청 파라미터 처리 문제: Controller 또는 Pipe
- 비즈니스 규칙 처리 문제: Service
- 데이터 조회 및 저장 문제: Repository
- 데이터 무결성 및 제약조건 문제: Database 또는 Persistence Layer

이러한 구조는 코드의 이해와 변경을 보다 체계적으로 수행할 수 있도록 지원합니다.

---

## 3. Layered Architecture의 주요 계층

### 3.1. Presentation Layer

Presentation Layer는 외부 클라이언트와 애플리케이션 사이의 통신을 담당합니다.

NestJS에서는 주로 Controller가 해당 역할을 수행합니다.

Controller는 HTTP 요청을 수신하고 필요한 데이터를 추출한 다음, Service를 호출하여 처리 결과를 반환합니다.

주요 책임은 다음과 같습니다.

- HTTP Endpoint 정의
- HTTP Method 및 Route 매핑
- 요청 파라미터와 Body 데이터 추출
- Service 호출
- 응답 데이터 반환
- HTTP 계층과 관련된 처리

다음은 기본적인 Controller 예제입니다.

```typescript
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
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

위 코드의 주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 설명 |
|---|---|
| `@Controller('users')` | `/users` 경로를 처리하는 Controller를 정의합니다. |
| `@Get(':id')` | HTTP GET 요청을 처리합니다. |
| `@Param('id')` | URL 경로에서 `id` 값을 추출합니다. |
| `ParseIntPipe` | 경로 파라미터를 정수로 변환하고 유효성을 검증합니다. |
| `UsersService` | 사용자 조회 처리를 위임할 Service입니다. |

Controller는 데이터베이스 조회나 복잡한 비즈니스 규칙을 직접 구현하지 않습니다.

대신 Service에 처리를 위임하여 HTTP 통신 계층과 비즈니스 로직을 분리합니다.

다만 Controller가 Service를 호출하는 것은 일반적인 설계 방식이며, NestJS가 반드시 이러한 호출 구조를 강제하는 것은 아닙니다.

### 3.2. Business Logic Layer

Business Logic Layer는 애플리케이션의 핵심 비즈니스 규칙과 처리 흐름을 담당합니다.

NestJS에서는 일반적으로 `@Injectable()` 데코레이터가 적용된 Service 클래스를 사용합니다.

Service는 다음과 같은 작업을 수행할 수 있습니다.

- 비즈니스 규칙 검증
- 데이터 처리 및 변환
- 여러 Repository 호출 조정
- 애플리케이션의 작업 흐름 제어
- 도메인 정책 적용
- 트랜잭션 처리 조정

다음은 사용자 조회 기능을 구현한 Service 예제입니다.

```typescript
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

`@Injectable()`은 해당 클래스가 NestJS의 DI 시스템을 통해 관리될 수 있는 Provider임을 나타냅니다.

`UsersService`는 생성자를 통해 `UsersRepository`를 주입받습니다.

사용자 조회 기능의 처리 과정은 다음과 같습니다.

1. Controller가 `UsersService.findOne()`을 호출합니다.
2. Service가 Repository에 사용자 조회를 요청합니다.
3. Repository가 조회 결과를 반환합니다.
4. 사용자가 존재하지 않으면 Service에서 예외를 발생시킵니다.
5. 사용자가 존재하면 조회 결과를 반환합니다.

`NotFoundException`은 NestJS가 제공하는 HTTP 예외 클래스입니다.

이 예제에서는 단순성을 위해 Service에서 HTTP 예외를 직접 발생시키지만, HTTP 기술에 대한 의존성을 줄여야 하는 구조에서는 애플리케이션 또는 도메인 전용 예외를 사용하고 외부 계층에서 HTTP 응답으로 변환할 수도 있습니다.

### 3.3. Persistence Layer

Persistence Layer는 데이터의 조회, 저장, 수정 및 삭제를 담당합니다.

NestJS에서는 TypeORM, Prisma, Mongoose 등의 데이터 접근 기술을 활용할 수 있습니다.

Repository는 데이터 접근 로직을 캡슐화하는 역할을 수행하며, 데이터베이스와 관련된 구현 세부사항을 Service로부터 분리하는 데 사용됩니다.

주요 책임은 다음과 같습니다.

- 데이터 조회
- 데이터 저장
- 데이터 수정 및 삭제
- 조회 조건 구성
- ORM 또는 데이터베이스 클라이언트 호출
- 영속성 관련 구현 세부사항 관리

다음은 TypeORM을 사용하는 Repository 예제입니다.

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }
}
```

위 예제에서는 TypeORM의 `Repository<User>`를 직접 Service에 주입하는 대신, 별도의 `UsersRepository` 클래스로 감싸고 있습니다.

이러한 방식은 다음과 같은 장점이 있습니다.

- 데이터 접근 로직을 하나의 위치에 모을 수 있습니다.
- 여러 Service에서 동일한 조회 로직을 재사용할 수 있습니다.
- Service가 TypeORM API를 직접 호출하지 않도록 구성할 수 있습니다.
- Repository를 Mock 객체로 교체하여 Service를 테스트할 수 있습니다.

다만 별도의 Repository 래퍼 클래스를 만드는 것은 필수사항이 아닙니다.

NestJS와 TypeORM에서는 Service에 `Repository<User>`를 직접 주입하는 방식도 지원합니다.

Repository 래퍼의 필요성은 애플리케이션의 복잡도와 데이터 접근 로직의 규모에 따라 판단해야 합니다.

### 3.4. Database Layer

Database Layer는 실제 데이터를 저장하고 관리하는 시스템입니다.

일반적인 관계형 데이터베이스에는 다음과 같은 기술을 사용할 수 있습니다.

- PostgreSQL
- MySQL
- MariaDB
- SQLite

데이터베이스는 다음과 같은 기능을 제공합니다.

- 데이터 저장 및 검색
- 인덱스 관리
- 데이터 무결성 제약조건 적용
- 트랜잭션 처리
- 동시성 제어

Database는 애플리케이션 내부의 TypeScript 클래스 계층이라기보다, Persistence Layer가 사용하는 외부 저장 시스템으로 구분하는 것이 정확합니다.

---

## 4. 계층 간 의존성 관계

### 4.1. 기본 의존성 방향

일반적인 계층형 아키텍처에서는 상위 계층이 하위 계층에 의존합니다.

```text
┌──────────────────────────┐
│    Presentation Layer    │
│         Controller       │
└────────────┬─────────────┘
             │
             │ depends on
             ▼
┌──────────────────────────┐
│   Business Logic Layer   │
│          Service         │
└────────────┬─────────────┘
             │
             │ depends on
             ▼
┌──────────────────────────┐
│     Persistence Layer    │
│         Repository       │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│          Database        │
└──────────────────────────┘
```

이 구조에서는 일반적으로 다음과 같은 의존성을 갖습니다.

- Controller는 Service를 참조합니다.
- Service는 Repository를 참조합니다.
- Repository는 ORM 또는 데이터베이스 클라이언트를 참조합니다.

반대 방향의 의존성은 최소화해야 합니다.

예를 들어 Repository가 Controller를 참조하거나 Service가 Controller를 직접 호출하는 구조는 계층 간 책임을 불명확하게 만들 수 있습니다.

### 4.2. 의존성과 데이터 흐름의 차이

의존성 방향과 실제 데이터 흐름은 서로 다른 개념입니다.

의존성 방향은 클래스나 모듈이 다른 구성 요소를 참조하는 관계를 나타냅니다.

반면 데이터 흐름은 요청과 응답이 애플리케이션을 통과하는 과정을 나타냅니다.

일반적인 HTTP 요청의 데이터 흐름은 다음과 같습니다.

```text
Request
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
Repository
   │
   ▼
Service
   │
   ▼
Controller
   │
   ▼
Response
```

반환 데이터는 호출 관계를 따라 상위 계층으로 전달되지만, 이것이 하위 계층이 상위 계층에 의존한다는 의미는 아닙니다.

예를 들어 Repository가 데이터를 반환하더라도 Repository가 Service를 참조할 필요는 없습니다.

### 4.3. Strict Layering과 Relaxed Layering

계층형 아키텍처는 계층 사이의 접근 규칙에 따라 구분할 수 있습니다.

**Strict Layering**

각 계층이 바로 아래 계층만 호출하도록 제한하는 방식입니다.

```text
Controller
    │
    ▼
Service
    │
    ▼
Repository
```

**Relaxed Layering**

상위 계층이 필요한 경우 중간 계층을 건너뛰어 하위 계층에 접근할 수 있도록 허용하는 방식입니다.

```text
Controller ───────┐
    │             │
    ▼             ▼
Service       Repository
    │             ▲
    └─────────────┘
```

Relaxed Layering은 간단한 조회 기능 등을 구현할 때 코드의 양을 줄일 수 있습니다.

그러나 Controller가 Repository를 직접 호출하기 시작하면 비즈니스 규칙이 여러 계층에 분산될 위험이 있습니다.

따라서 일반적인 NestJS 비즈니스 애플리케이션에서는 Controller가 Service를 통해 데이터 접근 기능을 사용하도록 구성하는 방식이 이해와 유지보수 측면에서 유리합니다.

Strict Layering과 Relaxed Layering은 일반적인 소프트웨어 아키텍처의 설계 방식이며, NestJS가 별도의 프레임워크 옵션으로 제공하는 기능은 아닙니다.

---

## 5. NestJS Module과 계층형 아키텍처

NestJS의 Module은 관련된 Controller와 Provider를 논리적으로 그룹화하는 구성 단위입니다.

Module은 계층 자체를 의미하지 않습니다.

예를 들어 `UsersModule`은 사용자 기능에 필요한 Controller, Service 및 Repository를 하나의 모듈로 구성할 수 있습니다.

```text
UsersModule
    │
    ├── UsersController
    │       │
    │       ▼
    ├── UsersService
    │       │
    │       ▼
    └── UsersRepository
            │
            ▼
        Database
```

이 구조는 기능별 모듈 구성과 계층별 책임 분리를 함께 적용한 형태입니다.

### 5.1. Module 구성 요소

NestJS의 `@Module()` 데코레이터는 다음과 같은 주요 메타데이터를 사용합니다.

| 속성 | 설명 |
|---|---|
| `imports` | 현재 Module이 사용하는 다른 Module을 선언합니다. |
| `controllers` | 현재 Module에 속하는 Controller를 등록합니다. |
| `providers` | 현재 Module에서 관리할 Provider를 등록합니다. |
| `exports` | 다른 Module에서 사용할 수 있도록 Provider를 공개합니다. |

Controller는 `controllers` 배열에 등록하고, Service와 일반적인 Repository Provider는 `providers` 배열에 등록합니다.

### 5.2. 기능별 Module 구성

일반적으로는 기술 계층별로 전체 애플리케이션을 분리하는 방식보다, 기능별 Module 내부에 계층을 구성하는 방식이 관리하기 편리합니다.

예를 들어 사용자 기능과 주문 기능을 다음과 같이 분리할 수 있습니다.

```text
src/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.repository.ts
│
├── orders/
│   ├── orders.module.ts
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   └── orders.repository.ts
│
└── app.module.ts
```

이러한 구조는 기능별 응집도를 높이고 관련 코드를 쉽게 탐색하도록 지원합니다.

Module 간 의존성이 필요한 경우에는 해당 Provider를 `exports`로 공개하고, 이를 사용하는 Module에서 `imports`로 가져와야 합니다.

Provider를 다른 Module에서 사용하기 위해 무조건 전역 Provider로 등록할 필요는 없습니다.

---

## 6. Layered Architecture 구현 예제

이번 예제에서는 사용자 조회 기능을 구현합니다.

Controller, Service, Repository 및 TypeORM Entity를 분리하여 기본적인 계층형 아키텍처를 구성합니다.

### 6.1. 프로젝트 구조

```text
src/
├── app.module.ts
│
└── users/
    ├── dto/
    │   └── user-response.dto.ts
    │
    ├── entities/
    │   └── user.entity.ts
    │
    ├── users.controller.ts
    ├── users.service.ts
    ├── users.repository.ts
    └── users.module.ts
```

이 예제는 TypeScript 기반 NestJS 애플리케이션과 TypeORM 및 PostgreSQL을 기준으로 작성합니다.

필요한 패키지는 다음과 같습니다.

```bash
npm install @nestjs/typeorm typeorm pg
```

다음 코드에서는 해당 의존성이 설치되어 있고 PostgreSQL 데이터베이스가 준비되어 있다고 가정합니다.

### 6.2. Entity 정의

`users/entities/user.entity.ts`

```typescript
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

  @Column({ unique: true })
  email: string;
}
```

`@Entity()`는 TypeORM에서 데이터베이스 테이블과 매핑할 클래스를 정의합니다.

`@PrimaryGeneratedColumn()`은 자동 생성되는 기본 키를 정의합니다.

`@Column()`은 데이터베이스 테이블의 컬럼과 매핑되는 속성을 정의합니다.

Entity는 TypeORM의 영속성 매핑 정보를 포함하므로 데이터베이스 기술에 대한 의존성을 갖습니다.

따라서 Entity를 순수한 Domain Model과 반드시 동일한 개념으로 취급해서는 안 됩니다.

### 6.3. Repository 구현

`users/users.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }
}
```

`@InjectRepository(User)`는 NestJS의 TypeORM 통합 기능을 통해 `User` Entity에 대한 Repository를 주입받습니다.

`findOneBy()`는 지정된 조건에 해당하는 데이터를 조회합니다.

조회 결과가 없으면 `null`을 반환합니다.

이 예제에서 `UsersRepository`는 TypeORM의 Repository API를 캡슐화합니다.

### 6.4. Service 구현

`users/users.service.ts`

```typescript
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

Service는 Repository를 통해 데이터를 조회하고 비즈니스 처리 결과를 결정합니다.

조회 대상이 존재하지 않으면 `NotFoundException`을 발생시킵니다.

이러한 예외는 기본 HTTP 실행 환경에서 NestJS의 예외 처리 시스템을 통해 HTTP 404 응답으로 변환됩니다.

### 6.5. Response DTO 정의

`users/dto/user-response.dto.ts`

```typescript
export class UserResponseDto {
  id: number;
  name: string;
  email: string;
}
```

Response DTO는 클라이언트에 제공할 응답 데이터의 구조를 정의합니다.

Entity를 그대로 반환하면 내부 영속성 모델이 외부 API에 노출될 수 있습니다.

따라서 응답 구조와 내부 데이터 모델을 분리해야 하는 경우 Response DTO를 사용하는 것이 좋습니다.

다만 TypeScript 클래스 선언만으로 런타임 응답이 자동 변환되거나 검증되는 것은 아닙니다.

### 6.6. Controller 구현

`users/users.controller.ts`

```typescript
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}
```

Controller는 Service의 결과를 받아 외부에 반환할 응답 데이터로 변환합니다.

이 과정에서는 Entity의 모든 속성을 그대로 노출하지 않고 필요한 속성만 선택합니다.

예를 들어 Entity에 비밀번호 해시와 같은 내부 속성이 추가되더라도 Controller에서 명시적으로 지정하지 않는 한 해당 속성은 응답에 포함되지 않습니다.

### 6.7. Module 등록

`users/users.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [
    UsersController,
  ],
  providers: [
    UsersService,
    UsersRepository,
  ],
})
export class UsersModule {}
```

`TypeOrmModule.forFeature([User])`는 현재 Module에서 `User` Entity에 대한 TypeORM Repository를 주입받을 수 있도록 관련 Provider를 등록합니다.

`UsersService`와 `UsersRepository`는 `providers` 배열에 등록됩니다.

NestJS의 DI 컨테이너는 등록된 Provider와 생성자 의존성 정보를 이용하여 필요한 인스턴스를 연결합니다.

### 6.8. Root Module 구성

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'nestjs',
      autoLoadEntities: true,
      synchronize: false,
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

`TypeOrmModule.forRoot()`는 애플리케이션의 데이터베이스 연결 설정을 구성합니다.

`autoLoadEntities`는 TypeORM의 `forFeature()`를 통해 등록된 Entity를 자동으로 연결 설정에 포함하는 기능입니다.

`synchronize: false`는 애플리케이션 실행 시 Entity 정의를 기준으로 데이터베이스 스키마를 자동 동기화하지 않도록 설정합니다.

운영 환경에서는 자동 스키마 동기화보다 명시적인 Migration 관리 방식을 사용하는 것이 안전합니다.

위 접속 정보는 로컬 개발 환경을 위한 예시이며, 실제 프로젝트에서는 환경변수와 `ConfigModule` 등을 이용하여 데이터베이스 접속 정보를 외부화해야 합니다.

또한 `synchronize: false`이므로 예제를 실행하기 전에 Migration 또는 별도의 SQL을 통해 `users` 테이블을 생성해야 합니다.

### 6.9. 요청 처리 과정

클라이언트가 다음과 같은 요청을 전송한다고 가정합니다.

```http
GET /users/1
```

요청 처리 과정은 다음과 같습니다.

```text
HTTP GET /users/1
        │
        ▼
UsersController.findOne(1)
        │
        ▼
UsersService.findOne(1)
        │
        ▼
UsersRepository.findById(1)
        │
        ▼
TypeORM Repository<User>
        │
        ▼
PostgreSQL
        │
        ▼
User Entity
        │
        ▼
UsersService
        │
        ▼
UsersController
        │
        ▼
UserResponseDto
        │
        ▼
HTTP Response
```

사용자가 존재한다면 다음과 같은 응답을 반환할 수 있습니다.

```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com"
}
```

사용자가 존재하지 않는다면 Service에서 `NotFoundException`이 발생합니다.

기본적인 HTTP 환경에서는 다음과 같은 형태의 응답이 생성될 수 있습니다.

```json
{
  "message": "User 1 not found",
  "error": "Not Found",
  "statusCode": 404
}
```

실제 응답 형식은 Exception Filter 및 애플리케이션의 예외 처리 설정에 따라 달라질 수 있습니다.

---

## 7. 계층별 Dependency Injection

NestJS의 계층형 아키텍처에서는 Dependency Injection을 이용하여 구성 요소 간 의존성을 연결합니다.

### 7.1. 생성자 기반 의존성 주입

다음 예제를 살펴보겠습니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}
}
```

`UsersService`는 `UsersRepository`를 직접 생성하지 않습니다.

대신 생성자에서 필요한 의존성을 선언합니다.

NestJS는 Module에 등록된 Provider 정보를 바탕으로 의존성을 해결합니다.

이러한 구조는 객체의 생성 책임과 사용 책임을 분리하는 데 도움이 됩니다.

### 7.2. 직접 객체 생성 방식의 문제

다음과 같은 코드는 DI를 활용하지 않는 방식입니다.

```typescript
export class UsersService {
  private readonly usersRepository =
    new UsersRepository();
}
```

이 방식은 앞서 작성한 `UsersRepository`가 생성자 의존성을 요구하므로 그대로는 사용할 수 없습니다.

또한 의존성이 없는 클래스로 변경하여 직접 생성하더라도 다음과 같은 문제가 발생할 수 있습니다.

- 구현 클래스와 강하게 결합됩니다.
- 테스트에서 의존성을 교체하기 어려워집니다.
- 객체 생성 및 생명주기를 직접 관리해야 합니다.
- 구성 요소 간 의존성이 복잡해질 수 있습니다.

NestJS에서는 이러한 문제를 줄이기 위해 Provider와 DI 시스템을 활용합니다.

### 7.3. 추상화를 통한 의존성 분리

생성자 기반 DI를 사용하더라도 구체적인 Repository 클래스를 직접 참조하면 해당 구현에 대한 의존성이 남아 있습니다.

예를 들어 다음 구조에서는 Service가 구현 클래스에 의존합니다.

```text
UsersService
     │
     ▼
UsersRepository
     │
     ▼
TypeORM
```

이를 개선하기 위해 Repository의 계약을 별도로 정의할 수 있습니다.

`users/user-repository.interface.ts`

```typescript
import { User } from './entities/user.entity';

export interface UserRepositoryPort {
  findById(id: number): Promise<User | null>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
```

`users/users.repository.ts`

```typescript
@Injectable()
export class UsersRepository
  implements UserRepositoryPort {

  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findById(id: number): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }
}
```

`users/users.service.ts`

```typescript
@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly usersRepository: UserRepositoryPort,
  ) {}
}
```

Module에서는 다음과 같이 Provider를 등록합니다.

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [
    UsersController,
  ],
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: UsersRepository,
    },
  ],
})
export class UsersModule {}
```

위 코드에서는 설명에 필요한 부분만 표시했으며, 실제 파일에서는 `Injectable`, `Inject`, `Module`, TypeORM 관련 클래스 및 Repository 계약을 적절하게 import해야 합니다.

TypeScript의 Interface는 컴파일 결과인 JavaScript에 존재하지 않으므로 NestJS의 런타임 DI Token으로 직접 사용할 수 없습니다.

따라서 `Symbol`, 문자열 또는 추상 클래스와 같은 런타임 Token이 필요합니다.

이 구조를 적용하면 Service는 구체적인 Repository 구현 대신 Repository 계약에 의존합니다.

다만 위 예제의 계약이 TypeORM Entity인 `User`를 사용하므로 영속성 모델에 대한 의존성까지 제거된 것은 아닙니다.

영속성 기술로부터 비즈니스 계층을 더 강하게 분리하려면 독립적인 Domain Model과 매핑 계층을 도입할 수 있습니다.

이러한 의존성 역전 방식은 Clean Architecture나 Hexagonal Architecture로 확장할 때 중요한 기반이 됩니다.

---

## 8. Layered Architecture의 테스트 전략

계층별 책임이 분리되면 테스트 대상과 범위를 명확하게 구분할 수 있습니다.

### 8.1. Controller 테스트

Controller 테스트에서는 HTTP 요청 데이터 처리 및 Service 호출 관계를 확인할 수 있습니다.

예를 들어 `UsersService`를 Mock 객체로 대체하여 Controller가 올바른 ID를 전달하는지 확인합니다.

Controller 단위 테스트에서는 데이터베이스에 연결할 필요가 없습니다.

### 8.2. Service 테스트

Service 테스트에서는 비즈니스 규칙과 Repository 호출 결과에 따른 동작을 검증합니다.

다음은 Repository를 Mock 객체로 대체하는 테스트 예제입니다.

`users/users.service.spec.ts`

```typescript
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;

  const usersRepositoryMock = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    usersRepositoryMock.findById.mockReset();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: UsersRepository,
            useValue: usersRepositoryMock,
          },
        ],
      }).compile();

    service = module.get<UsersService>(
      UsersService,
    );
  });

  it('사용자가 존재하면 반환합니다', async () => {
    const user = {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
    };

    usersRepositoryMock.findById.mockResolvedValue(user);

    await expect(
      service.findOne(1),
    ).resolves.toEqual(user);
  });

  it('사용자가 없으면 예외를 발생시킵니다', async () => {
    usersRepositoryMock.findById.mockResolvedValue(null);

    await expect(
      service.findOne(999),
    ).rejects.toThrow(NotFoundException);
  });
});
```

이 테스트는 Service가 구체적인 `UsersRepository` 클래스를 주입받는 앞선 기본 예제를 기준으로 합니다.

Repository 계약과 `USER_REPOSITORY` Token을 사용하는 구조로 변경했다면 테스트의 Provider 등록에서도 동일한 Token을 사용해야 합니다.

Jest 기반 NestJS 테스트 환경이 구성되어 있다고 가정하며, 필요한 테스트 패키지에는 `@nestjs/testing` 등이 포함됩니다.

### 8.3. Repository 테스트

Repository 테스트에서는 실제 데이터베이스 또는 테스트용 데이터베이스를 이용하여 조회 및 저장 동작을 검증할 수 있습니다.

이때 다음과 같은 항목을 확인합니다.

- 조회 조건이 올바르게 적용되는지 확인합니다.
- 데이터가 정상적으로 저장되는지 확인합니다.
- Unique Constraint 등의 제약조건이 적용되는지 확인합니다.
- 트랜잭션 처리가 올바르게 수행되는지 확인합니다.

ORM의 동작이나 데이터베이스 제약조건을 검증하려면 실제 데이터베이스 엔진을 이용하는 통합 테스트가 유용합니다.

### 8.4. 계층별 테스트 범위

| 테스트 대상 | 주요 검증 내용 | 권장 테스트 방식 |
|---|---|---|
| Controller | 요청 처리 및 Service 호출 | Unit Test |
| Service | 비즈니스 규칙 및 처리 결과 | Unit Test |
| Repository | 데이터 조회 및 저장 | Integration Test |
| 전체 요청 흐름 | HTTP 요청부터 응답까지 | E2E Test |

테스트 범위를 분리하면 문제 발생 시 원인을 보다 쉽게 파악할 수 있습니다.

---

## 9. Layered Architecture 설계 시 주의사항

### 9.1. Fat Controller

Fat Controller는 Controller에 지나치게 많은 비즈니스 로직이 포함된 구조를 의미합니다.

예를 들어 Controller가 직접 데이터베이스를 조회하고, 사용자 상태를 검증하며, 여러 데이터 변경 작업을 수행하면 계층 간 책임이 불명확해집니다.

Controller는 외부 요청 처리에 집중하고 비즈니스 규칙은 Service 또는 적절한 도메인 구성 요소에 배치하는 것이 좋습니다.

### 9.2. Fat Service

반대로 Controller의 모든 로직을 Service에 집중시키는 것도 바람직하지 않습니다.

특히 하나의 Service가 사용자 관리, 주문 처리, 결제, 알림 등 여러 기능을 동시에 담당하면 클래스의 책임이 지나치게 커집니다.

이 경우 기능별 Service를 분리하거나 비즈니스 로직을 별도의 도메인 서비스 또는 Use Case 단위로 구성할 수 있습니다.

계층형 아키텍처의 목적은 모든 로직을 Service에 배치하는 것이 아니라 책임을 적절하게 분리하는 데 있습니다.

### 9.3. Anemic Domain Model

Anemic Domain Model은 도메인 객체가 데이터만 보유하고 관련 비즈니스 규칙이 대부분 Service에 집중되는 구조를 의미합니다.

단순한 CRUD 애플리케이션에서는 이러한 구조가 반드시 문제가 되는 것은 아닙니다.

그러나 복잡한 도메인 규칙이 존재하는 애플리케이션에서는 관련 로직을 도메인 객체에 캡슐화하는 설계가 유리할 수 있습니다.

예를 들어 주문 상태 변경에 복잡한 제약조건이 존재한다면 해당 규칙을 단순히 Service의 조건문으로 분산시키기보다 주문 도메인 모델에 배치하는 방식을 고려할 수 있습니다.

### 9.4. 계층 간 순환 의존성

계층 간 순환 의존성이 발생하면 객체 생성 및 모듈 구성 과정이 복잡해집니다.

예를 들어 다음과 같은 구조는 피하는 것이 좋습니다.

```text
UsersService
     │
     ▼
OrdersService
     │
     ▼
UsersService
```

NestJS는 일부 순환 의존성을 해결하기 위한 `forwardRef()` 기능을 제공하지만, 가능한 경우 책임과 의존성 관계를 재구성하여 순환 의존성을 제거하는 것이 바람직합니다.

### 9.5. 불필요한 계층 생성

모든 기능에 반드시 Controller, Service, Repository를 각각 생성해야 하는 것은 아닙니다.

예를 들어 단순한 정적 상태 조회 기능이라면 별도의 Repository가 필요하지 않을 수 있습니다.

반대로 복잡한 비즈니스 로직이 존재한다면 Application Service, Domain Service 및 Infrastructure Adapter와 같은 추가 구성이 필요할 수도 있습니다.

따라서 계층의 수는 기능의 복잡도와 변경 가능성을 고려하여 결정해야 합니다.

### 9.6. 트랜잭션 경계

여러 Repository를 호출하는 작업에서는 트랜잭션 경계를 명확하게 관리해야 합니다.

예를 들어 주문 생성과 재고 차감이 하나의 원자적 작업으로 처리되어야 한다면 두 데이터 변경 작업을 동일한 트랜잭션으로 묶어야 할 수 있습니다.

트랜잭션의 시작과 종료는 애플리케이션의 작업 단위를 기준으로 설계하되, 실제 트랜잭션 실행은 ORM이나 데이터베이스 접근 기술의 기능을 통해 수행합니다.

TypeORM에서는 `DataSource.transaction()` 등의 API를 사용할 수 있습니다.

주의할 점은 트랜잭션 콜백 내부에서 해당 트랜잭션의 EntityManager를 사용해야 한다는 것입니다.

서로 독립적으로 주입된 Repository를 호출하는 것만으로 동일한 트랜잭션에 참여한다고 보장할 수는 없습니다.

---

## 10. Layered Architecture와 다른 아키텍처 비교

NestJS에서는 계층형 아키텍처 외에도 Modular Monolith, Clean Architecture, Hexagonal Architecture 및 CQRS 등의 설계 방식을 적용할 수 있습니다.

각 아키텍처는 서로 완전히 배타적인 개념은 아닙니다.

예를 들어 Modular Monolith의 각 기능 모듈 내부에 계층형 아키텍처를 적용할 수 있습니다.

### 10.1. Layered Architecture와 Clean Architecture

Layered Architecture에서는 일반적으로 상위 계층이 하위 계층의 구현에 의존할 수 있습니다.

반면 Clean Architecture에서는 비즈니스 규칙을 중심으로 의존성이 내부를 향하도록 설계합니다.

```text
Layered Architecture

Controller
    │
    ▼
Service
    │
    ▼
Repository Implementation
```

```text
Clean Architecture

Controller / Infrastructure
           │
           ▼
   Application Use Case
           │
           ▼
       Domain
```

Clean Architecture에서는 Repository 구현이 외부 계층에 위치하고, 내부 계층에서 정의한 Repository 계약을 구현하도록 구성할 수 있습니다.

따라서 데이터베이스나 프레임워크의 구현 세부사항이 핵심 비즈니스 규칙에 직접 영향을 주지 않도록 설계합니다.

### 10.2. Layered Architecture와 Modular Monolith

Layered Architecture는 애플리케이션 내부에서 책임을 계층별로 분리하는 데 중점을 둡니다.

Modular Monolith는 하나의 배포 단위 안에서 기능별 모듈의 경계를 명확하게 분리하는 데 중점을 둡니다.

두 개념은 함께 사용할 수 있습니다.

예를 들어 다음과 같은 구성이 가능합니다.

```text
Application
    │
    ├── UsersModule
    │     ├── Controller
    │     ├── Service
    │     └── Repository
    │
    └── OrdersModule
          ├── Controller
          ├── Service
          └── Repository
```

이 구조에서는 모듈별 기능 경계를 유지하면서 각 모듈 내부에 계층형 아키텍처를 적용합니다.

### 10.3. Layered Architecture와 CQRS

Layered Architecture는 애플리케이션의 책임을 계층별로 분리합니다.

CQRS(Command Query Responsibility Segregation)는 상태를 변경하는 Command와 데이터를 조회하는 Query의 책임을 분리합니다.

두 패턴은 함께 적용할 수 있습니다.

예를 들어 Service 계층의 처리 로직을 Command Handler와 Query Handler로 분리할 수 있습니다.

NestJS에서는 `@nestjs/cqrs` 패키지를 통해 CQRS 패턴을 구현할 수 있습니다.

### 10.4. 아키텍처 비교

| 구분 | 주요 목적 | 핵심 설계 기준 |
|---|---|---|
| Layered Architecture | 관심사 분리 | 계층별 책임 |
| Modular Monolith | 기능 경계 분리 | 모듈별 독립성 |
| Clean Architecture | 핵심 비즈니스 규칙 보호 | 내부를 향하는 의존성 |
| Hexagonal Architecture | 외부 시스템과의 결합 최소화 | Ports and Adapters |
| CQRS | 읽기와 쓰기 책임 분리 | Command와 Query |

애플리케이션의 규모와 요구사항에 따라 하나 이상의 아키텍처 패턴을 조합하여 사용할 수 있습니다.

---

## 11. Layered Architecture의 장점과 한계

### 11.1. 장점

| 장점 | 설명 |
|---|---|
| 책임 분리 | 계층별 역할이 명확합니다. |
| 유지보수성 | 기능 수정 시 관련 코드를 찾기 쉽습니다. |
| 테스트 용이성 | 계층별 단위 테스트와 Mock 적용이 편리합니다. |
| 재사용성 | Service 및 Repository의 기능을 여러 위치에서 활용할 수 있습니다. |
| 학습 용이성 | 구조가 비교적 단순하여 이해하기 쉽습니다. |
| 점진적 확장 | 필요에 따라 추상화 및 추가 계층을 도입할 수 있습니다. |

### 11.2. 한계

| 한계 | 설명 |
|---|---|
| 계층 간 결합 | Service가 구체적인 Repository 구현에 의존할 수 있습니다. |
| 불필요한 코드 증가 | 단순한 기능에도 여러 클래스를 생성할 수 있습니다. |
| 비즈니스 로직 집중 | 복잡한 규칙이 Service에 과도하게 집중될 수 있습니다. |
| 계층 간 호출 증가 | 기능 수행을 위해 여러 계층을 거쳐야 할 수 있습니다. |
| 기술 의존성 전파 | ORM Entity와 같은 기술 모델이 상위 계층까지 전달될 수 있습니다. |

계층형 아키텍처는 이해하기 쉽고 적용하기 편리하지만, 복잡한 도메인과 높은 변경 가능성을 가진 애플리케이션에서는 추가적인 추상화가 필요할 수 있습니다.

---

## 12. 실무 적용 권장사항

NestJS에서 Layered Architecture를 적용할 때는 다음 사항을 고려하는 것이 좋습니다.

1. **기능별 Module을 우선적으로 구성합니다.** 사용자, 주문, 결제 등 비즈니스 기능을 기준으로 Module을 분리합니다.

2. **Controller는 외부 통신 처리에 집중합니다.** HTTP 요청과 응답에 관련된 책임을 담당하고 비즈니스 규칙은 별도로 분리합니다.

3. **Service는 비즈니스 규칙과 애플리케이션의 처리 흐름을 담당합니다.** 단순히 Repository를 호출하는 역할에만 한정하지 않되, 지나치게 많은 책임을 갖지 않도록 설계합니다.

4. **Repository는 데이터 접근 로직을 캡슐화합니다.** 복잡한 조회 조건과 영속성 관련 세부사항이 Service에 분산되지 않도록 구성합니다.

5. **DTO와 Entity의 역할을 구분합니다.** DTO는 외부 데이터 교환 계약을 표현하고, Entity는 ORM의 영속성 매핑 정보를 표현합니다.

6. **DI를 활용하여 의존성을 관리합니다.** 구체적인 구현 변경이나 테스트 대역 교체가 필요한 경우 Provider Token과 추상화를 활용합니다.

7. **순환 의존성을 최소화합니다.** Module과 Service의 책임을 명확하게 정의하여 상호 참조가 발생하지 않도록 설계합니다.

8. **계층별 테스트를 구성합니다.** Controller와 Service의 단위 테스트, Repository의 통합 테스트, 전체 기능의 E2E 테스트를 목적에 따라 구분합니다.

9. **트랜잭션 경계를 명확하게 정의합니다.** 여러 데이터 변경 작업의 원자성이 필요한 경우 동일한 트랜잭션 컨텍스트를 사용하도록 구성합니다.

10. **복잡도에 맞춰 아키텍처를 확장합니다.** 비즈니스 로직과 외부 기술의 결합이 증가한다면 Clean Architecture 또는 Hexagonal Architecture와 같은 설계 방식을 검토할 수 있습니다.

---

## 13. 정리

Layered Architecture는 애플리케이션을 역할과 책임에 따라 여러 계층으로 구분하는 설계 방식입니다.

NestJS에서는 일반적으로 Controller, Service 및 Repository를 사용하여 계층형 아키텍처를 구현합니다.

각 계층의 핵심 책임은 다음과 같습니다.

| 계층 | 핵심 책임 |
|---|---|
| Controller | 외부 요청 수신 및 응답 처리 |
| Service | 비즈니스 로직 및 처리 흐름 제어 |
| Repository | 데이터 조회 및 영속성 관리 |
| Database | 데이터 저장 및 무결성 관리 |

NestJS의 Module은 이러한 구성 요소를 기능별로 조직하고 DI를 통해 의존성을 연결하는 역할을 수행합니다.

계층형 아키텍처는 비교적 단순하고 이해하기 쉬운 구조를 제공하지만, 계층을 분리했다는 사실만으로 기술적 결합이나 도메인 복잡성이 자동으로 해결되지는 않습니다.

따라서 각 계층의 책임을 명확히 정의하고, 필요한 경우 인터페이스 기반 추상화나 도메인 모델을 추가하는 방식으로 설계를 발전시켜야 합니다.

특히 기능별 Module 구성과 계층별 책임 분리를 함께 적용하면 NestJS 애플리케이션의 구조를 보다 체계적으로 관리할 수 있습니다.

---

## 14. 관련 문서

다음 문서에서는 Layered Architecture와 연관된 NestJS의 주요 개념 및 설계 패턴을 확인할 수 있습니다.

- `../01-fundamentals/modules.md` — Module 구성과 의존성 관리
- `../01-fundamentals/controllers.md` — Controller의 역할과 요청 처리
- `../01-fundamentals/providers.md` — Provider의 개념과 역할
- `../01-fundamentals/dependency-injection.md` — Dependency Injection 동작 원리
- `../01-fundamentals/custom-providers.md` — Custom Provider와 Injection Token
- `../03-techniques/database.md` — 데이터베이스 연결과 ORM 활용
- `../06-testing/unit-testing.md` — 단위 테스트 작성 방법
- `../06-testing/integration-testing.md` — 통합 테스트 작성 방법
- `./modular-monolith.md` — Modular Monolith 아키텍처
- `./clean-architecture.md` — Clean Architecture
- `./cqrs-pattern.md` — CQRS 패턴
- `./dependency-management.md` — 의존성 관리와 설계 전략

---

## 15. 참고 자료

### NestJS 공식 문서

- [NestJS Documentation](https://docs.nestjs.com/) — NestJS 공식 문서
- [NestJS Controllers](https://docs.nestjs.com/controllers) — Controller의 역할과 HTTP 요청 처리
- [NestJS Providers](https://docs.nestjs.com/providers) — Provider 및 Dependency Injection의 기본 개념
- [NestJS Modules](https://docs.nestjs.com/modules) — Module 구성 및 Provider 공개 범위
- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers) — Injection Token과 Custom Provider 구성
- [NestJS Circular Dependency](https://docs.nestjs.com/fundamentals/circular-dependency) — 순환 의존성 처리
- [NestJS Database](https://docs.nestjs.com/techniques/database) — 데이터베이스 통합 개요
- [NestJS TypeORM](https://docs.nestjs.com/data/typeorm) — TypeORM 통합과 Repository 사용
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing) — 단위 테스트 및 E2E 테스트
- [NestJS CQRS](https://docs.nestjs.com/recipes/cqrs) — CQRS 패턴 구현

### TypeORM 공식 문서

- [TypeORM Documentation](https://typeorm.io/) — TypeORM 공식 문서
- [TypeORM Repository API](https://typeorm.io/docs/working-with-entity-manager/repository-api/) — Repository API
- [TypeORM Transactions](https://typeorm.io/docs/advanced-topics/transactions/) — 트랜잭션 처리

### 소프트웨어 아키텍처 참고 자료

- [Martin Fowler — Presentation Domain Data Layering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html) — Presentation, Domain 및 Data 계층 분리
- [Martin Fowler — Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html) — Anemic Domain Model의 개념과 한계
- [Martin Fowler — Repository](https://martinfowler.com/eaaCatalog/repository.html) — Repository 패턴
- [Robert C. Martin — The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — Clean Architecture와 의존성 규칙
- [Microsoft — Common Web Application Architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) — 웹 애플리케이션의 일반적인 아키텍처 구성