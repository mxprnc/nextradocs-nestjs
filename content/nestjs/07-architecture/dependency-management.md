# Dependency Management

## 1. 개요

Dependency Management(의존성 관리)는 애플리케이션을 구성하는 클래스, 모듈 및 서비스 사이의 의존 관계를 명확하게 정의하고 제어하는 설계 활동입니다.

소프트웨어에서 의존성(Dependency)은 하나의 구성 요소가 다른 구성 요소의 기능, 타입 또는 구현을 사용하는 관계를 의미합니다.

예를 들어 `OrdersService`가 주문 데이터를 저장하기 위해 `OrdersRepository`를 사용한다면 `OrdersService`는 `OrdersRepository`에 의존합니다.

```text
OrdersService
      │
      │ depends on
      ▼
OrdersRepository
      │
      ▼
Database
```

의존성 자체가 문제가 되는 것은 아닙니다.

애플리케이션은 여러 구성 요소가 협력하여 동작하므로 의존성은 자연스럽게 발생합니다.

그러나 의존성이 복잡해지거나 서로 다른 책임을 가진 구성 요소들이 강하게 결합되면 다음과 같은 문제가 발생할 수 있습니다.

- 특정 클래스의 변경이 여러 클래스에 영향을 줍니다.
- 기능을 독립적으로 테스트하기 어려워집니다.
- 객체의 생성 및 초기화 순서가 복잡해집니다.
- 모듈 간 순환 의존성이 발생할 수 있습니다.
- 외부 기술을 변경할 때 비즈니스 로직까지 수정해야 할 수 있습니다.
- 시스템의 기능별 경계가 불명확해집니다.

NestJS는 이러한 의존성을 관리하기 위해 Dependency Injection(DI) 시스템과 Module 기반 Provider 관리 기능을 제공합니다.

NestJS의 DI Container는 Module에 등록된 Provider를 관리하고, 생성자 또는 명시적으로 정의된 Injection Token을 통해 필요한 의존성을 연결합니다.

그러나 DI Container를 사용한다고 해서 애플리케이션의 아키텍처가 자동으로 적절하게 설계되는 것은 아닙니다.

**Dependency Injection은 의존성을 연결하는 기술적 메커니즘이고, Dependency Management는 의존성의 방향과 경계를 설계하는 활동입니다.**

---

## 2. Dependency Management의 목적

### 2.1. 결합도 감소

Coupling(결합도)은 구성 요소들이 서로 얼마나 강하게 연결되어 있는지를 나타내는 개념입니다.

예를 들어 다음과 같은 구조에서는 `OrdersService`가 구체적인 Repository 구현을 직접 생성합니다.

```typescript
export class OrdersService {
  private readonly repository =
    new OrdersRepository();
}
```

이 방식은 `OrdersService`가 `OrdersRepository`의 생성 방법과 구현 클래스에 직접 의존하도록 만듭니다.

Repository 생성에 필요한 의존성이 추가되면 Service도 수정해야 할 수 있습니다.

NestJS에서는 생성자 기반 Dependency Injection을 이용하여 객체 생성 책임을 분리할 수 있습니다.

```typescript
import { Injectable } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(
    private readonly repository: OrdersRepository,
  ) {}
}
```

이 경우 Service는 Repository 인스턴스를 직접 생성하지 않습니다.

NestJS의 DI Container가 등록된 Provider 정보를 이용하여 인스턴스를 연결합니다.

다만 이 구조에서도 `OrdersService`가 `OrdersRepository`라는 구체적인 클래스에 의존한다는 점은 변하지 않습니다.

따라서 생성 책임의 분리와 구현 의존성의 분리는 구분해야 합니다.

### 2.2. 변경 영향 범위 최소화

의존성 관리가 적절하게 이루어지면 특정 구성 요소의 변경이 다른 구성 요소에 미치는 영향을 줄일 수 있습니다.

예를 들어 데이터 접근 구현을 다음과 같이 변경한다고 가정합니다.

```text
Before

OrdersService
      │
      ▼
TypeOrmOrdersRepository
```

```text
After

OrdersService
      │
      ▼
PrismaOrdersRepository
```

Service가 구체적인 Repository 구현에 의존한다면 변경 과정에서 Service를 수정해야 할 수 있습니다.

반면 Repository 계약을 별도로 정의하면 다음과 같이 구성할 수 있습니다.

```text
             OrdersService
                   │
                   ▼
           OrderRepositoryPort
                   ▲
                   │
          ┌────────┴────────┐
          │                 │
TypeOrmRepository    PrismaRepository
```

Service는 동일한 계약에 의존하고 실제 구현은 외부에서 선택할 수 있습니다.

이러한 구조는 외부 기술의 변경 가능성이 높은 시스템에서 유용합니다.

### 2.3. 테스트 용이성 향상

의존성을 외부에서 주입받도록 구성하면 테스트 시 실제 구현을 Mock이나 Fake로 대체할 수 있습니다.

예를 들어 주문 생성 기능을 테스트하면서 실제 데이터베이스를 실행하지 않아도 됩니다.

```text
Production

OrdersService
      │
      ▼
TypeOrmOrdersRepository
```

```text
Unit Test

OrdersService
      │
      ▼
FakeOrdersRepository
```

이를 통해 비즈니스 로직과 외부 시스템 연동을 구분하여 검증할 수 있습니다.

### 2.4. 모듈 경계 유지

규모가 큰 NestJS 애플리케이션에서는 여러 기능 Module이 서로 협력합니다.

예를 들어 다음과 같은 Module이 존재할 수 있습니다.

- UsersModule
- OrdersModule
- PaymentsModule
- NotificationsModule

각 Module의 내부 구현을 다른 Module이 자유롭게 사용하도록 허용하면 기능별 경계가 약해집니다.

Dependency Management에서는 모듈의 공개 API와 내부 구현을 구분하여 이러한 문제를 줄입니다.

---

## 3. 의존성의 유형

의존성은 여러 관점으로 구분할 수 있습니다.

### 3.1. Compile-time Dependency

Compile-time Dependency는 소스 코드에서 다른 클래스나 타입을 참조하는 관계입니다.

TypeScript에서는 일반적으로 `import`를 통해 표현됩니다.

```typescript
import { OrdersRepository } from './orders.repository';

export class OrdersService {
  constructor(
    private readonly repository: OrdersRepository,
  ) {}
}
```

이 코드에서 `OrdersService`는 `OrdersRepository`를 소스 코드 수준에서 참조합니다.

따라서 Repository 클래스의 공개 계약이 변경되면 Service에도 영향을 줄 수 있습니다.

### 3.2. Runtime Dependency

Runtime Dependency는 애플리케이션 실행 중 실제 객체가 다른 객체를 사용하는 관계입니다.

NestJS에서는 DI Container가 이러한 객체 관계를 구성합니다.

```text
DI Container
     │
     ├── OrdersService Instance
     │           │
     │           ▼
     └── OrdersRepository Instance
```

Compile-time Dependency와 Runtime Dependency는 반드시 동일한 방향이나 형태를 가져야 하는 것은 아닙니다.

Dependency Inversion을 적용하면 Service가 추상화에 의존하면서 런타임에는 구체적인 구현을 호출하도록 구성할 수 있습니다.

### 3.3. Module Dependency

Module Dependency는 하나의 NestJS Module이 다른 Module에서 제공하는 기능을 사용하는 관계입니다.

```typescript
@Module({
  imports: [
    UsersModule,
  ],
})
export class OrdersModule {}
```

위 코드에서 `OrdersModule`은 `UsersModule`을 가져옵니다.

다만 `imports`는 해당 Module의 모든 내부 Provider에 대한 접근을 허용하는 것이 아닙니다.

`UsersModule`에서 공개한 Provider만 일반적인 Module DI 경계를 통해 사용할 수 있습니다.

### 3.4. Infrastructure Dependency

Infrastructure Dependency는 애플리케이션이 데이터베이스, 캐시, 메시지 브로커 및 외부 API 등의 기술에 의존하는 관계입니다.

예를 들어 다음과 같습니다.

```text
OrdersService
      │
      ▼
PaymentApiClient
      │
      ▼
External Payment API
```

이러한 외부 기술은 비즈니스 규칙과 변경 주기가 다를 수 있습니다.

따라서 필요한 경우 Port와 Adapter를 이용해 의존성을 분리할 수 있습니다.

### 3.5. 의존성 유형 비교

| 유형 | 설명 | 예시 |
|---|---|---|
| Compile-time | 소스 코드의 참조 관계 | TypeScript Import |
| Runtime | 실행 중 객체 간 연결 | DI Container |
| Module | Module 간 기능 사용 관계 | `imports`, `exports` |
| Infrastructure | 외부 기술에 대한 의존성 | TypeORM, Redis, HTTP Client |

이러한 유형은 서로 배타적인 분류가 아닙니다.

하나의 의존성이 여러 유형에 해당할 수 있습니다.

---

## 4. NestJS Dependency Injection 시스템

NestJS는 IoC(Inversion of Control) 원칙을 기반으로 Dependency Injection 기능을 제공합니다.

IoC는 객체 생성이나 실행 흐름의 일부 제어 책임을 애플리케이션 코드 외부의 프레임워크 또는 컨테이너로 이전하는 설계 원칙입니다.

Dependency Injection은 IoC를 구현하는 대표적인 방식입니다.

### 4.1. Provider

Provider는 NestJS의 DI Container가 관리할 수 있는 구성 요소입니다.

대표적인 Provider에는 다음과 같은 클래스가 포함됩니다.

- Service
- Repository
- Factory
- Helper
- Adapter

일반적으로 `@Injectable()` 데코레이터를 사용하여 주입 가능한 클래스를 정의합니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class OrdersRepository {
  findAll() {
    return [];
  }
}
```

다만 `@Injectable()`만 선언했다고 해서 모든 Module에서 해당 Provider를 사용할 수 있는 것은 아닙니다.

Provider는 적절한 Module에 등록되어야 합니다.

### 4.2. Provider 등록

```typescript
import { Module } from '@nestjs/common';

import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';

@Module({
  providers: [
    OrdersService,
    OrdersRepository,
  ],
})
export class OrdersModule {}
```

NestJS는 Module에 등록된 Provider 정보를 이용하여 의존성을 해결합니다.

### 4.3. 생성자 기반 Injection

```typescript
@Injectable()
export class OrdersService {
  constructor(
    private readonly repository: OrdersRepository,
  ) {}
}
```

NestJS는 생성자의 의존성 정보를 이용하여 `OrdersRepository` Provider를 찾고 주입합니다.

클래스 기반 Token을 사용하는 일반적인 구조에서는 TypeScript의 데코레이터 메타데이터를 활용할 수 있습니다.

정상적인 의존성 주입을 위해서는 프로젝트의 TypeScript 컴파일 및 데코레이터 관련 설정이 적절하게 구성되어 있어야 합니다.

### 4.4. 의존성 해결 과정

일반적인 Provider 의존성 해결 과정을 개념적으로 표현하면 다음과 같습니다.

```text
Application Bootstrap
          │
          ▼
Module Metadata Analysis
          │
          ▼
Provider Registration
          │
          ▼
Dependency Resolution
          │
          ▼
Provider Instance Creation
          │
          ▼
Dependency Injection
          │
          ▼
Application Ready
```

이는 의존성 해결의 주요 개념을 설명하기 위한 흐름입니다.

실제 NestJS 내부에서는 Module 탐색, Provider 인스턴스 관리, 비동기 Factory 해결 및 Scope 처리 등이 함께 이루어집니다.

또한 Request Scope나 Transient Scope를 사용하는 Provider는 애플리케이션 시작 시 모든 인스턴스가 생성되는 것은 아닙니다.

---

## 5. NestJS Module과 Provider 가시성

NestJS의 Module은 Provider의 등록과 공개 범위를 관리하는 기본 단위입니다.

### 5.1. Module 내부 Provider

```typescript
@Module({
  providers: [
    UsersService,
    UsersRepository,
  ],
})
export class UsersModule {}
```

이 구조에서 `UsersService`와 `UsersRepository`는 `UsersModule`의 Provider로 등록됩니다.

다른 Module에서는 이 Provider들을 자동으로 주입받을 수 없습니다.

### 5.2. Provider 공개

다른 Module에서 특정 Provider를 사용해야 한다면 `exports`에 등록합니다.

```typescript
@Module({
  providers: [
    UsersService,
    UsersRepository,
  ],
  exports: [
    UsersService,
  ],
})
export class UsersModule {}
```

이제 `UsersService`는 다른 Module에서 사용할 수 있는 공개 Provider가 됩니다.

반면 `UsersRepository`는 공개하지 않았으므로 다른 Module에서 해당 Module의 공개 Provider로 직접 주입받을 수 없습니다.

### 5.3. 다른 Module의 Provider 사용

```typescript
@Module({
  imports: [
    UsersModule,
  ],
  providers: [
    OrdersService,
  ],
})
export class OrdersModule {}
```

`OrdersModule`은 `UsersModule`에서 공개한 `UsersService`를 주입받을 수 있습니다.

```typescript
@Injectable()
export class OrdersService {
  constructor(
    private readonly usersService: UsersService,
  ) {}
}
```

모듈 간 관계는 다음과 같습니다.

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
     │
     ▼
UsersRepository
```

`OrdersModule`은 사용자 정보가 필요할 때 공개된 Service를 사용합니다.

### 5.4. Provider 가시성과 코드 접근 제한의 차이

NestJS의 `exports`는 DI Container에서 Provider를 다른 Module에 공개하는 기능입니다.

이는 TypeScript의 소스 코드 Import를 제한하는 기능은 아닙니다.

예를 들어 다음과 같은 코드는 컴파일 설정과 파일 접근 경로가 허용된다면 작성할 수 있습니다.

```typescript
import { UsersRepository } from '../users/users.repository';
```

따라서 `UsersRepository`를 Module의 `exports`에 등록하지 않았더라도 소스 코드 수준에서 직접 참조하는 행위를 자동으로 막지는 못합니다.

실제 모듈 경계를 유지하려면 다음과 같은 추가 규칙이 필요할 수 있습니다.

- 내부 구현 디렉터리에 대한 Import 제한
- 모듈별 Public API 정의
- ESLint 규칙
- 의존성 분석
- 아키텍처 테스트

---

## 6. Custom Provider와 Injection Token

NestJS에서는 클래스 자체를 Provider Token으로 사용하는 방식 외에도 Custom Provider를 정의할 수 있습니다.

Custom Provider는 구현을 선택하거나 외부에서 생성된 객체를 주입하고, 테스트에서 의존성을 대체할 때 유용합니다.

### 6.1. Injection Token

Injection Token은 DI Container가 Provider를 식별하는 데 사용하는 값입니다.

NestJS에서는 클래스, 문자열 및 Symbol 등을 Token으로 사용할 수 있습니다.

예를 들어 다음과 같습니다.

```typescript
export const ORDER_REPOSITORY =
  Symbol('ORDER_REPOSITORY');
```

### 6.2. useClass

`useClass`는 특정 Token에 사용할 구현 클래스를 지정합니다.

```typescript
{
  provide: ORDER_REPOSITORY,
  useClass: TypeOrmOrdersRepository,
}
```

이 구성을 통해 `ORDER_REPOSITORY`를 요청하면 `TypeOrmOrdersRepository` 구현을 주입하도록 설정할 수 있습니다.

### 6.3. useValue

`useValue`는 미리 생성된 객체나 값을 Provider로 등록합니다.

```typescript
{
  provide: 'APP_CONFIG',
  useValue: {
    environment: 'development',
    debug: true,
  },
}
```

외부 라이브러리 객체를 등록하거나 테스트에서 Mock 객체를 주입하는 경우에 활용할 수 있습니다.

### 6.4. useFactory

`useFactory`는 Factory 함수를 이용하여 Provider를 생성합니다.

```typescript
{
  provide: 'API_CLIENT',
  useFactory: (configService: ConfigService) => {
    return new ApiClient(
      configService.getOrThrow<string>('API_URL'),
    );
  },
  inject: [
    ConfigService,
  ],
}
```

이 예제의 `ApiClient`는 외부 API Client를 나타내는 예시 클래스입니다.

Factory Provider는 생성 조건이 복잡하거나 기존 라이브러리의 객체를 DI Container에 연결해야 하는 경우 유용합니다.

Factory는 Promise를 반환하는 비동기 Provider로도 구성할 수 있습니다.

### 6.5. useExisting

`useExisting`은 이미 등록된 Provider에 새로운 Token을 연결합니다.

```typescript
providers: [
  OrdersService,
  {
    provide: 'ORDER_READER',
    useExisting: OrdersService,
  },
]
```

이 경우 `ORDER_READER`는 기존 `OrdersService` Provider에 대한 별칭으로 작동합니다.

`useClass`로 별도의 Provider를 등록하는 것과는 차이가 있습니다.

### 6.6. Provider 등록 방식 비교

| 방식 | 역할 | 대표적인 사용 사례 |
|---|---|---|
| `useClass` | 구현 클래스 지정 | Repository Adapter 교체 |
| `useValue` | 객체 또는 값 등록 | 설정값, Mock |
| `useFactory` | Factory로 객체 생성 | 외부 Client 구성 |
| `useExisting` | 기존 Provider의 별칭 생성 | 공개 계약 연결 |

---

## 7. Dependency Inversion Principle

Dependency Inversion Principle(DIP)은 고수준 정책이 저수준 구현에 직접 의존하지 않도록 추상화를 중심으로 의존성을 구성하는 설계 원칙입니다.

SOLID 원칙 중 하나이며 Clean Architecture의 핵심적인 기반입니다.

### 7.1. 직접 구현 의존

```text
OrdersService
      │
      ▼
TypeOrmOrdersRepository
      │
      ▼
TypeORM
```

이 구조에서는 비즈니스 로직이 특정 Repository 구현에 직접 의존합니다.

Repository 구현이 변경되면 Service에도 영향을 줄 수 있습니다.

### 7.2. 추상화 기반 의존

```text
              OrdersService
                    │
                    ▼
            OrderRepositoryPort
                    ▲
                    │ implements
                    │
         TypeOrmOrdersRepository
                    │
                    ▼
                  TypeORM
```

Application은 Repository의 계약에 의존합니다.

Infrastructure는 해당 계약을 구현합니다.

이렇게 구성하면 소스 코드의 의존성이 비즈니스 계층에서 외부 기술 구현을 향하지 않도록 설계할 수 있습니다.

### 7.3. Dependency Injection과 DIP의 차이

두 개념은 서로 관련되어 있지만 동일하지 않습니다.

| 구분 | Dependency Injection | Dependency Inversion |
|---|---|---|
| 의미 | 의존성을 외부에서 주입하는 방식 | 추상화를 중심으로 의존성 방향을 구성하는 원칙 |
| 주요 목적 | 객체 생성과 연결 책임 분리 | 고수준 정책과 저수준 구현의 결합 감소 |
| NestJS 구현 | DI Container, Provider | Interface, Port, Adapter |
| 주요 구성 요소 | `@Injectable()`, `@Inject()` | Interface, Injection Token, 구현 Adapter |

Dependency Injection을 사용해도 구체적인 구현 클래스에 직접 의존할 수 있습니다.

반대로 DIP는 NestJS DI Container를 사용하지 않고도 일반적인 TypeScript 코드로 구현할 수 있습니다.

---

## 8. Repository Port를 이용한 의존성 관리

이번 예제에서는 주문 기능에서 Repository 구현을 추상화하는 방법을 설명합니다.

기본적인 프로젝트 구조는 다음과 같습니다.

```text
src/
└── orders/
    ├── domain/
    │   └── order.ts
    │
    ├── application/
    │   ├── ports/
    │   │   └── order-repository.port.ts
    │   └── create-order.use-case.ts
    │
    ├── infrastructure/
    │   └── in-memory-order.repository.ts
    │
    ├── presentation/
    │   └── orders.controller.ts
    │
    └── orders.module.ts
```

이 구조는 Clean Architecture를 적용한 예제입니다.

### 8.1. Domain Model 정의

`orders/domain/order.ts`

```typescript
export interface Order {
  id: string;
  productId: number;
  quantity: number;
}
```

이 예제에서는 의존성 관리에 집중하기 위해 간단한 Domain Model을 사용합니다.

실제 도메인 모델에는 비즈니스 규칙과 상태 변경 메서드를 추가할 수 있습니다.

### 8.2. Repository Port 정의

`orders/application/ports/order-repository.port.ts`

```typescript
import { Order } from '../../domain/order';

export interface OrderRepositoryPort {
  save(order: Order): Promise<void>;

  findById(id: string): Promise<Order | null>;
}
```

Repository Port는 Application에서 필요한 데이터 접근 기능을 정의합니다.

여기에는 TypeORM이나 Prisma와 같은 특정 기술의 타입이 포함되지 않습니다.

### 8.3. Application Use Case 구현

`orders/application/create-order.use-case.ts`

```typescript
import { randomUUID } from 'node:crypto';

import { Order } from '../domain/order';
import { OrderRepositoryPort } from './ports/order-repository.port';

export interface CreateOrderInput {
  productId: number;
  quantity: number;
}

export class CreateOrderUseCase {
  constructor(
    private readonly repository: OrderRepositoryPort,
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    if (
      !Number.isInteger(input.productId) ||
      input.productId < 1 ||
      !Number.isInteger(input.quantity) ||
      input.quantity < 1
    ) {
      throw new Error('Invalid order input');
    }

    const order: Order = {
      id: randomUUID(),
      productId: input.productId,
      quantity: input.quantity,
    };

    await this.repository.save(order);

    return order;
  }
}
```

이 Use Case는 Repository Port만 참조합니다.

따라서 실제 데이터 저장 방식은 알 필요가 없습니다.

다만 `randomUUID()`는 Node.js 런타임 기능이므로, 런타임 독립성까지 요구하는 경우 ID 생성 기능을 별도 Port로 추상화할 수 있습니다.

### 8.4. Infrastructure Adapter 구현

`orders/infrastructure/in-memory-order.repository.ts`

```typescript
import { Order } from '../domain/order';
import { OrderRepositoryPort } from '../application/ports/order-repository.port';

export class InMemoryOrderRepository
  implements OrderRepositoryPort {

  private readonly orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }
}
```

이 클래스는 `OrderRepositoryPort`의 구체적인 구현입니다.

Application은 구현 클래스를 참조하지 않습니다.

### 8.5. Controller 구현

`orders/presentation/orders.controller.ts`

```typescript
import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import {
  CreateOrderInput,
  CreateOrderUseCase,
} from '../application/create-order.use-case';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
  ) {}

  @Post()
  create(@Body() input: CreateOrderInput) {
    return this.createOrderUseCase.execute(input);
  }
}
```

Controller는 HTTP 요청을 받아 Use Case를 호출합니다.

이 예제에서는 설명을 간결하게 유지하기 위해 입력 Interface를 직접 사용합니다.

실제 서비스에서는 HTTP Request DTO를 별도로 정의하고 `ValidationPipe` 등을 통해 런타임 입력 검증을 적용하는 것이 좋습니다.

### 8.6. Module에서 의존성 연결

`orders/orders.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { OrderRepositoryPort } from './application/ports/order-repository.port';
import { CreateOrderUseCase } from './application/create-order.use-case';
import { InMemoryOrderRepository } from './infrastructure/in-memory-order.repository';
import { OrdersController } from './presentation/orders.controller';

const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

@Module({
  controllers: [
    OrdersController,
  ],
  providers: [
    {
      provide: ORDER_REPOSITORY,
      useClass: InMemoryOrderRepository,
    },
    {
      provide: CreateOrderUseCase,
      useFactory: (
        repository: OrderRepositoryPort,
      ) => new CreateOrderUseCase(repository),
      inject: [
        ORDER_REPOSITORY,
      ],
    },
  ],
})
export class OrdersModule {}
```

이 Module은 의존성을 연결하는 Composition Root 역할을 수행합니다.

여기서 중요한 점은 다음과 같습니다.

1. Application은 `OrderRepositoryPort`만 참조합니다.
2. Infrastructure는 해당 Port를 구현합니다.
3. Module은 Port에 연결할 실제 구현을 결정합니다.
4. Controller는 Use Case를 호출합니다.
5. Use Case는 데이터 저장 기술을 직접 알 필요가 없습니다.

이 구조에서는 Use Case를 `@Injectable()`로 선언하지 않아도 NestJS의 `useFactory`를 통해 Provider로 생성할 수 있습니다.

---

## 9. Module 간 의존성 설계

여러 기능 Module로 구성된 애플리케이션에서는 Module 간 의존성을 명확하게 관리해야 합니다.

### 9.1. 기능별 Module 구성

```text
Application
    │
    ├── UsersModule
    ├── OrdersModule
    ├── PaymentsModule
    └── NotificationsModule
```

각 Module은 자신이 담당하는 기능과 데이터를 관리합니다.

### 9.2. 공개 API를 통한 의존성

예를 들어 주문 기능에서 사용자 존재 여부를 확인해야 한다고 가정합니다.

다음과 같은 직접 접근은 모듈 간 결합도를 높일 수 있습니다.

```text
OrdersService
      │
      ▼
UsersRepository
      │
      ▼
users table
```

대신 사용자 모듈에서 공개한 기능을 사용하도록 구성할 수 있습니다.

```text
OrdersService
      │
      ▼
UsersReader
      │
      ▼
UsersService
      │
      ▼
UsersRepository
```

이 방식에서는 주문 모듈이 사용자 데이터의 저장 방식에 직접 의존하지 않습니다.

### 9.3. Public Contract 정의

`users/contracts/users-reader.contract.ts`

```typescript
export interface UsersReader {
  exists(userId: string): Promise<boolean>;
}

export const USERS_READER =
  Symbol('USERS_READER');
```

`UsersService`가 계약을 구현합니다.

```typescript
@Injectable()
export class UsersService implements UsersReader {
  constructor(
    private readonly repository: UsersRepository,
  ) {}

  async exists(userId: string): Promise<boolean> {
    return this.repository.exists(userId);
  }
}
```

여기서 `UsersRepository`는 사용자 조회 기능을 제공하는 기존 Repository로 가정합니다.

### 9.4. 공개 Provider 등록

```typescript
@Module({
  providers: [
    UsersRepository,
    UsersService,
    {
      provide: USERS_READER,
      useExisting: UsersService,
    },
  ],
  exports: [
    USERS_READER,
  ],
})
export class UsersModule {}
```

이 구조에서는 `UsersReader` 계약을 통해 사용자 조회 기능을 공개합니다.

### 9.5. 다른 Module에서 계약 사용

```typescript
@Injectable()
export class OrdersService {
  constructor(
    @Inject(USERS_READER)
    private readonly usersReader: UsersReader,
  ) {}

  async validateUser(userId: string): Promise<void> {
    const exists = await this.usersReader.exists(userId);

    if (!exists) {
      throw new Error('User not found');
    }
  }
}
```

`OrdersModule`에서는 `UsersModule`을 가져와야 합니다.

```typescript
@Module({
  imports: [
    UsersModule,
  ],
  providers: [
    OrdersService,
  ],
})
export class OrdersModule {}
```

위 예제에서는 핵심 의존성 관계를 설명하기 위해 일부 import 문과 Repository의 세부 구현을 생략했습니다.

실제 구현에서는 계약 Interface 및 Injection Token의 import가 필요합니다.

### 9.6. 계약의 위치

공개 계약을 다른 모듈에서 사용할 수 있도록 `contracts` 디렉터리를 정의할 수 있습니다.

```text
users/
├── contracts/
│   └── users-reader.contract.ts
│
├── internal/
│   ├── users.service.ts
│   └── users.repository.ts
│
└── users.module.ts
```

다른 모듈에서는 공개 계약 파일만 참조하도록 규칙을 정의할 수 있습니다.

다만 이러한 계약도 사용자 모듈에서 제공하는 API에 대한 의존성을 의미합니다.

모듈 간 의존성을 완전히 없애는 것이 아니라, 구체적인 구현 대신 명확한 계약에 의존하도록 만드는 것이 목적입니다.

---

## 10. 순환 의존성

Circular Dependency(순환 의존성)는 둘 이상의 구성 요소가 서로를 참조하여 의존성의 순환 경로가 형성되는 상황을 의미합니다.

### 10.1. Provider 간 순환 의존성

다음과 같은 구조를 생각할 수 있습니다.

```text
OrdersService
      │
      ▼
PaymentsService
      │
      ▼
OrdersService
```

`OrdersService`가 `PaymentsService`를 주입받고, `PaymentsService`가 다시 `OrdersService`를 주입받으면 순환 의존성이 발생합니다.

이러한 구조는 객체 생성 및 책임 분리를 어렵게 만들 수 있습니다.

### 10.2. Module 간 순환 의존성

Module 사이에서도 순환 의존성이 발생할 수 있습니다.

```text
OrdersModule
      │
      ▼
PaymentsModule
      │
      ▼
OrdersModule
```

이 경우 Module의 의존성 관계가 순환 구조를 갖습니다.

NestJS에서는 이러한 상황을 해결하기 위한 `forwardRef()` 기능을 제공합니다.

### 10.3. forwardRef 사용

```typescript
import {
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}
}
```

반대쪽 Provider에서도 순환 참조를 처리해야 합니다.

```typescript
@Injectable()
export class PaymentsService {
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}
}
```

Module 간 순환 의존성이 존재하는 경우에는 Module의 `imports`에서도 `forwardRef()`를 사용할 수 있습니다.

다만 `forwardRef()`는 순환 의존성을 해결하기 위한 기술적인 방법이며, 구조적인 결합을 제거하는 것은 아닙니다.

또한 순환 의존성이 존재하는 Provider의 인스턴스 생성 순서에 의존해서는 안 됩니다.

### 10.4. Orchestration Service를 통한 해결

순환 의존성이 발생하는 이유가 여러 기능을 조합하는 작업 때문이라면 별도의 Orchestration Service를 구성할 수 있습니다.

기존 구조:

```text
OrdersService ◄────► PaymentsService
```

개선 구조:

```text
             CheckoutService
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
    OrdersService     PaymentsService
```

`CheckoutService`는 주문 및 결제 작업을 조정합니다.

주문 Service와 결제 Service가 서로를 직접 호출할 필요가 없도록 역할을 분리합니다.

예를 들어 다음과 같습니다.

```typescript
@Injectable()
export class CheckoutService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async checkout(orderId: string): Promise<void> {
    const order = await this.ordersService.findById(orderId);

    await this.paymentsService.process(order);

    await this.ordersService.markAsPaid(orderId);
  }
}
```

이 코드는 작업 흐름을 설명하기 위한 예제입니다.

실제 결제 처리에서는 실패 보상, 멱등성 및 트랜잭션 경계 등을 추가로 설계해야 합니다.

### 10.5. 순환 의존성 해결 방법 비교

| 방법 | 설명 | 고려사항 |
|---|---|---|
| 책임 재분리 | 클래스와 Module의 역할을 재정의합니다. | 구조적 해결에 적합 |
| Orchestration Service | 여러 Service의 작업 흐름을 조정합니다. | 새로운 조정 계층 필요 |
| 이벤트 기반 통신 | 직접 호출을 이벤트로 전환합니다. | 처리 시점과 일관성 고려 |
| `forwardRef()` | 순환 참조를 지연 해결합니다. | 순환 구조 자체는 유지 |
| `ModuleRef` | 런타임에 Provider를 조회합니다. | 의존성이 코드에 덜 명시적으로 드러날 수 있음 |

가능한 경우 `forwardRef()`를 반복적으로 사용하는 것보다 의존성 구조를 재설계하는 것이 바람직합니다.

---

## 11. Provider Scope와 의존성 생명주기

NestJS의 Provider는 Scope에 따라 인스턴스의 생명주기가 달라집니다.

### 11.1. Singleton Scope

Singleton은 NestJS Provider의 기본 Scope입니다.

```typescript
@Injectable()
export class OrdersService {}
```

일반적으로 애플리케이션의 DI 컨텍스트에서 해당 Provider 등록에 대한 인스턴스를 공유합니다.

다만 동일한 클래스를 여러 Module에 별도의 Provider로 등록하면 서로 다른 인스턴스가 생성될 수 있습니다.

따라서 Singleton을 반드시 전체 Node.js 프로세스에서 클래스당 하나의 인스턴스만 존재한다는 의미로 이해해서는 안 됩니다.

### 11.2. Request Scope

Request Scope는 요청 컨텍스트별로 Provider 인스턴스를 생성하는 방식입니다.

```typescript
import {
  Injectable,
  Scope,
} from '@nestjs/common';

@Injectable({
  scope: Scope.REQUEST,
})
export class RequestContextService {}
```

HTTP 요청과 연결된 Provider의 경우 요청별 인스턴스를 사용할 수 있습니다.

인증 사용자 정보나 요청별 컨텍스트를 관리할 때 활용할 수 있습니다.

그러나 Request Scope Provider에 의존하는 구성 요소도 Request Scope의 영향을 받을 수 있습니다.

따라서 광범위하게 사용하면 객체 생성 비용이 증가할 수 있습니다.

### 11.3. Transient Scope

Transient Scope는 Provider를 주입받는 소비자에 따라 별도의 인스턴스를 제공하는 방식입니다.

```typescript
@Injectable({
  scope: Scope.TRANSIENT,
})
export class OperationLogger {}
```

각 소비자가 독립적인 인스턴스를 필요로 하는 경우 활용할 수 있습니다.

Transient Scope는 반드시 HTTP 요청마다 새로운 인스턴스를 생성한다는 의미는 아닙니다.

요청 단위의 생명주기가 필요한 경우에는 Request Scope와 구분해야 합니다.

### 11.4. Provider Scope 비교

| Scope | 주요 특징 | 사용 사례 |
|---|---|---|
| Singleton | 기본 Provider 생명주기, 인스턴스 공유 | 일반적인 Service 및 Repository |
| Request | 요청 컨텍스트별 인스턴스 | 요청별 상태 관리 |
| Transient | 소비자별 인스턴스 | 독립적인 상태가 필요한 Helper |

### 11.5. Scope 선택 시 주의사항

NestJS 공식 문서는 일반적인 경우 기본 Singleton Scope 사용을 권장합니다.

Request Scope를 과도하게 사용하면 인스턴스 생성 비용과 메모리 사용량이 증가할 수 있기 때문입니다.

특히 다수의 Provider가 의존하는 공통 Service를 Request Scope로 구성하면 의존성 체인 전체에 영향을 줄 수 있습니다.

요청별 데이터를 전달하는 것이 목적이라면 `AsyncLocalStorage` 기반 컨텍스트 관리도 대안으로 검토할 수 있습니다.

---

## 12. ModuleRef와 동적 의존성 조회

NestJS는 `ModuleRef`를 통해 DI Container에 등록된 Provider를 프로그래밍 방식으로 조회할 수 있습니다.

### 12.1. ModuleRef 사용

```typescript
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class OrdersService {
  constructor(
    private readonly moduleRef: ModuleRef,
  ) {}

  getRepository(): OrdersRepository {
    return this.moduleRef.get(
      OrdersRepository,
      { strict: false },
    );
  }
}
```

`ModuleRef.get()`은 등록된 Provider 인스턴스를 조회합니다.

`strict: false`를 사용하면 현재 Module의 조회 범위 밖에 있는 Provider도 탐색할 수 있습니다.

단, 대상 Provider는 DI Container에 등록되어 있어야 합니다.

또한 `get()`은 Request-scoped 또는 Transient Provider를 조회하는 용도로 사용하지 않습니다.

이러한 Provider는 필요한 컨텍스트와 함께 `resolve()`를 사용하는 방식을 검토해야 합니다.

### 12.2. ModuleRef의 사용 목적

ModuleRef는 다음과 같은 상황에서 활용할 수 있습니다.

- 동적으로 Provider를 조회해야 하는 경우
- 특수한 초기화 및 의존성 연결이 필요한 경우
- 직접적인 생성자 Injection이 적절하지 않은 경우
- Request-scoped Provider를 명시적으로 해결해야 하는 경우

### 12.3. Service Locator 문제

ModuleRef를 과도하게 사용하면 Service Locator와 유사한 구조가 형성될 수 있습니다.

```typescript
const repository = this.moduleRef.get(
  OrdersRepository,
  { strict: false },
);
```

이 방식에서는 클래스가 필요로 하는 의존성이 생성자에 명확하게 나타나지 않습니다.

또한 Module의 공개 API를 우회하는 의존성 구조가 만들어질 수 있습니다.

따라서 일반적인 비즈니스 Service에서는 생성자 기반 DI를 우선적으로 사용하는 것이 좋습니다.

ModuleRef는 특별한 동적 의존성 해결 요구사항이 있는 경우에 선택적으로 사용하는 것이 적합합니다.

---

## 13. Dynamic Module과 의존성 구성

Dynamic Module은 실행 환경이나 설정값에 따라 Module의 Provider 구성을 동적으로 결정할 수 있는 기능입니다.

### 13.1. 기본적인 Dynamic Module

```typescript
import {
  DynamicModule,
  Module,
} from '@nestjs/common';

export interface ApiClientOptions {
  baseUrl: string;
}

export const API_CLIENT_OPTIONS =
  Symbol('API_CLIENT_OPTIONS');

@Module({})
export class ApiClientModule {
  static register(
    options: ApiClientOptions,
  ): DynamicModule {
    return {
      module: ApiClientModule,
      providers: [
        {
          provide: API_CLIENT_OPTIONS,
          useValue: options,
        },
      ],
      exports: [
        API_CLIENT_OPTIONS,
      ],
    };
  }
}
```

Dynamic Module은 다음과 같이 사용할 수 있습니다.

```typescript
@Module({
  imports: [
    ApiClientModule.register({
      baseUrl: 'https://api.example.com',
    }),
  ],
})
export class AppModule {}
```

이 예제에서는 설정값을 Provider로 등록합니다.

실제 프로젝트에서는 설정값을 기반으로 외부 API Client 등을 생성하는 Factory Provider를 추가할 수 있습니다.

### 13.2. Dynamic Module의 활용

Dynamic Module은 다음과 같은 상황에서 유용합니다.

- 설정에 따라 다른 Provider 등록
- 외부 API Client 초기화
- 데이터베이스 연결 구성
- 재사용 가능한 라이브러리 Module 개발
- 환경별 구현 선택

Dynamic Module도 일반 Module과 마찬가지로 적절한 Provider 공개 범위를 정의해야 합니다.

자세한 구현 방식은 `01-fundamentals/dynamic-modules.md`에서 다룹니다.

---

## 14. 아키텍처별 의존성 관리 전략

Dependency Management는 특정 아키텍처에만 적용되는 개념이 아닙니다.

다만 아키텍처 패턴에 따라 중요하게 관리해야 할 의존성의 범위와 방향이 다릅니다.

### 14.1. Layered Architecture

Layered Architecture는 계층별 책임과 호출 관계를 구분합니다.

```text
Controller
    │
    ▼
Service
    │
    ▼
Repository
```

일반적으로 상위 계층이 하위 계층을 참조합니다.

핵심 관리 대상은 다음과 같습니다.

- Controller와 Service의 책임 분리
- Service와 Repository의 책임 분리
- 역방향 호출 및 순환 의존성 최소화
- 계층 간 불필요한 직접 접근 제한

### 14.2. Modular Monolith

Modular Monolith는 기능별 Module 경계를 관리합니다.

```text
OrdersModule
     │
     ▼
UsersModule Public API
```

핵심 관리 대상은 다음과 같습니다.

- Module 간 의존성 방향
- 공개 Provider의 최소화
- 다른 Module의 내부 구현 직접 접근 제한
- 데이터 소유권 관리
- 순환 의존성 방지

NestJS의 `imports`와 `exports`는 이러한 구조를 구현하는 기반으로 활용할 수 있습니다.

그러나 모듈 경계 전체를 자동으로 강제하지는 않습니다.

### 14.3. Clean Architecture

Clean Architecture는 핵심 비즈니스 규칙을 외부 구현으로부터 보호합니다.

```text
Presentation ──────┐
                   │
                   ▼
               Application
                   │
                   ▼
                 Domain
                   ▲
                   │
Infrastructure ────┘
```

Infrastructure는 Application에서 정의한 Port를 구현할 수 있습니다.

핵심 관리 대상은 다음과 같습니다.

- Domain의 프레임워크 독립성
- Application의 ORM 의존성 제거
- Port와 Adapter의 역할 구분
- 내부 계층을 향하는 소스 코드 의존성 유지

### 14.4. CQRS

CQRS는 Command와 Query의 책임을 분리합니다.

```text
Controller
    │
    ├── CommandBus
    │      │
    │      ▼
    │   CommandHandler
    │
    └── QueryBus
           │
           ▼
        QueryHandler
```

핵심 관리 대상은 다음과 같습니다.

- CommandHandler와 QueryHandler의 책임 분리
- Handler와 Repository의 의존성
- EventHandler 간 결합도
- 모듈 간 이벤트 계약
- 트랜잭션 및 데이터 일관성

CQRS를 적용해도 Handler가 지나치게 많은 외부 구현에 의존하면 결합도 문제가 발생할 수 있습니다.

### 14.5. 아키텍처별 비교

| 아키텍처 | 주요 의존성 관리 대상 |
|---|---|
| Layered Architecture | 계층 간 책임 및 호출 방향 |
| Modular Monolith | 기능별 Module 경계 |
| Clean Architecture | 내부를 향하는 소스 코드 의존성 |
| CQRS | Command, Query, Event의 처리 책임 |

이러한 아키텍처는 서로 배타적이지 않으며 하나의 NestJS 프로젝트에서 함께 적용할 수 있습니다.

---

## 15. 테스트에서의 의존성 관리

의존성이 명확하게 구성되어 있으면 테스트 시 실제 Provider를 다른 구현으로 대체하기 쉽습니다.

### 15.1. Mock Provider 등록

다음은 Repository를 Mock으로 대체하는 예제입니다.

```typescript
import { Test } from '@nestjs/testing';

describe('OrdersService', () => {
  const repositoryMock = {
    findById: jest.fn(),
  };

  it('주문 정보를 조회합니다', async () => {
    repositoryMock.findById.mockResolvedValue({
      id: 'order-1',
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    const service = moduleRef.get(OrdersService);

    const result = await service.findById('order-1');

    expect(result.id).toBe('order-1');
  });
});
```

이 예제는 `OrdersService.findById()`가 `OrdersRepository.findById()`를 호출하는 일반적인 Service 구현을 전제로 합니다.

이를 통해 실제 데이터베이스 없이 Service의 의존성 호출 및 처리 결과를 검증할 수 있습니다.

### 15.2. overrideProvider

NestJS TestingModule에서는 기존 Provider를 다른 구현으로 교체할 수 있습니다.

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [
    OrdersModule,
  ],
})
  .overrideProvider(OrdersRepository)
  .useValue(repositoryMock)
  .compile();
```

`overrideProvider()`는 기존 Module 구성을 활용하면서 특정 Provider를 교체할 때 유용합니다.

### 15.3. Port 기반 테스트

Application이 Repository Port에만 의존한다면 NestJS TestingModule 없이 일반적인 TypeScript 객체로 테스트할 수 있습니다.

```typescript
const repository: OrderRepositoryPort = {
  save: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(null),
};

const useCase = new CreateOrderUseCase(repository);
```

이 구조에서는 Use Case가 NestJS에 직접 의존하지 않으므로 프레임워크 초기화 과정 없이 비즈니스 로직을 검증할 수 있습니다.

### 15.4. 테스트 방식 비교

| 테스트 방식 | 주요 목적 |
|---|---|
| Mock Provider | 의존성 호출 및 결과 검증 |
| Fake Repository | 간단한 동작을 가진 대체 저장소 사용 |
| `overrideProvider()` | 기존 Module의 Provider 교체 |
| Integration Test | 실제 Provider 연결 및 외부 시스템 검증 |
| E2E Test | 전체 요청 처리 흐름 검증 |

Mock과 Fake는 모두 Test Double의 일종이지만 목적과 구현 방식이 다릅니다.

Mock은 호출 여부 및 상호작용 검증에 집중할 수 있으며, Fake는 단순화된 실제 동작을 제공하는 구현으로 사용할 수 있습니다.

---

## 16. 아키텍처 경계 검증

NestJS의 DI Container만으로는 모든 소스 코드 의존성 규칙을 강제할 수 없습니다.

따라서 규모가 큰 프로젝트에서는 정적 분석 도구와 아키텍처 검사를 활용할 수 있습니다.

### 16.1. ESLint Import 제한

ESLint의 `no-restricted-imports` 규칙을 이용하면 특정 경로의 직접 Import를 제한할 수 있습니다.

예를 들어 주문 모듈에서 사용자 모듈의 내부 구현에 접근하지 못하도록 규칙을 정의할 수 있습니다.

```javascript
// eslint.config.mjs의 rules 일부 예시

'no-restricted-imports': [
  'error',
  {
    patterns: [
      {
        group: ['**/users/internal/**'],
        message:
          'Use the public contract of UsersModule.',
      },
    ],
  },
],
```

위 코드는 ESLint Flat Config의 `rules`에 추가할 수 있는 설정 예제입니다.

실제 프로젝트에서는 디렉터리 구조와 Import 경로에 맞게 규칙을 조정해야 합니다.

### 16.2. Dependency Cruiser

Dependency Cruiser는 JavaScript 및 TypeScript 프로젝트의 모듈 의존성을 분석하는 도구입니다.

다음과 같은 문제를 검사할 수 있습니다.

- 순환 의존성
- 금지된 Module 간 Import
- 계층 간 의존성 위반
- 의도하지 않은 외부 패키지 참조

예를 들어 다음과 같은 아키텍처 규칙을 정의할 수 있습니다.

```text
Domain
  └── Infrastructure Import 금지

Application
  └── Presentation Import 금지

OrdersModule
  └── UsersModule Internal Import 금지
```

이러한 규칙을 CI에서 검사하면 아키텍처 경계의 지속적인 유지에 도움이 됩니다.

### 16.3. Nx Module Boundary

Nx를 사용하는 Monorepo 환경에서는 Module Boundary 규칙으로 프로젝트 또는 라이브러리 간 의존성을 제한할 수 있습니다.

예를 들어 다음과 같은 정책을 정의할 수 있습니다.

- Domain Library는 Infrastructure Library를 참조하지 않습니다.
- Application Library는 Presentation Library를 참조하지 않습니다.
- 서로 다른 기능 모듈은 공개 계약을 통해 통신합니다.

다만 Nx는 NestJS의 필수 구성 요소가 아니므로 프로젝트에서 사용하는 경우에만 적용하면 됩니다.

### 16.4. CI 기반 검증

아키텍처 경계 검사를 CI Pipeline에 포함할 수 있습니다.

```text
Pull Request
      │
      ▼
ESLint
      │
      ▼
Dependency Analysis
      │
      ▼
Unit Tests
      │
      ▼
Integration Tests
      │
      ▼
Build
```

이 과정에서 금지된 의존성이 발견되면 Pull Request의 검증을 실패 처리하도록 구성할 수 있습니다.

---

## 17. 의존성 관리 시 주의사항

### 17.1. 지나친 추상화

모든 클래스에 Interface를 생성하는 것은 바람직하지 않을 수 있습니다.

추상화는 구현 교체 가능성, 테스트 요구사항 및 아키텍처 경계를 고려하여 도입해야 합니다.

특히 단순한 내부 Helper에 불필요한 Interface를 추가하면 코드 탐색과 유지보수가 어려워질 수 있습니다.

### 17.2. 모든 Provider를 Global로 등록하지 않아야 합니다

Global Module은 편리하지만 지나치게 사용하면 Module 간 의존성이 명시적으로 드러나지 않을 수 있습니다.

공통 인프라 기능에는 유용할 수 있지만 비즈니스 기능의 Provider는 명시적인 Module Import를 우선적으로 고려해야 합니다.

### 17.3. 동일한 Provider의 중복 등록

다음과 같이 서로 다른 Module에서 같은 클래스를 각각 Provider로 등록하면 Module별로 별도의 Provider 인스턴스가 관리될 수 있습니다.

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
export class OrdersModule {}
```

같은 인스턴스를 의도적으로 공유해야 한다면 `UsersModule`에서 Provider를 공개하고 `OrdersModule`이 이를 Import하도록 구성하는 것이 좋습니다.

### 17.4. 순환 의존성에 대한 무분별한 forwardRef 사용

`forwardRef()`는 의존성 해결을 지원하지만 설계상 순환 구조를 제거하지는 않습니다.

순환 의존성이 반복적으로 발생한다면 기능 경계와 Service의 책임을 재검토해야 합니다.

### 17.5. Scope와 상태 관리의 혼동

Singleton Provider는 여러 요청에서 공유될 수 있으므로 요청별로 변경되는 데이터를 인스턴스 필드에 저장하면 문제가 발생할 수 있습니다.

예를 들어 다음과 같은 코드는 주의해야 합니다.

```typescript
@Injectable()
export class UserContextService {
  private currentUserId: string;
}
```

여러 요청에서 공유되는 Singleton Provider가 요청별 사용자 ID를 저장하면 데이터가 서로 영향을 줄 수 있습니다.

요청별 데이터가 필요하다면 Request Scope 또는 적절한 요청 컨텍스트 관리 방식을 사용해야 합니다.

### 17.6. ModuleRef를 통한 의존성 우회

`ModuleRef.get()`의 `strict: false`를 무분별하게 사용하면 Module 경계가 불명확해질 수 있습니다.

특별한 동적 의존성 해결 요구사항이 없다면 생성자 기반 DI와 명시적인 Module Import를 우선적으로 사용해야 합니다.

### 17.7. 외부 시스템 구현의 직접 노출

Service가 TypeORM의 Repository, HTTP Client 또는 Redis Client에 직접 의존하는 것이 항상 잘못된 것은 아닙니다.

그러나 해당 기술의 변경 가능성이 높거나 핵심 비즈니스 로직의 독립성이 필요한 경우 Port와 Adapter를 도입할 수 있습니다.

중요한 것은 모든 기술 의존성을 제거하는 것이 아니라 변경 가능성이 높은 경계에서 적절하게 추상화하는 것입니다.

---

## 18. Dependency Management의 장점과 한계

### 18.1. 장점

| 장점 | 설명 |
|---|---|
| 유지보수성 | 변경 영향을 예측하고 관리하기 쉽습니다. |
| 테스트 용이성 | Mock과 Fake로 의존성을 교체할 수 있습니다. |
| 모듈 독립성 | 기능별 경계를 명확하게 유지할 수 있습니다. |
| 기술 교체 유연성 | 외부 구현을 추상화하여 변경 범위를 줄일 수 있습니다. |
| 확장성 | 기능과 Module이 증가해도 의존성 구조를 관리할 수 있습니다. |
| 코드 이해도 | 구성 요소 간 관계가 명시적으로 드러납니다. |

### 18.2. 한계

| 한계 | 설명 |
|---|---|
| 추상화 비용 | Interface, Token 및 Adapter 코드가 증가할 수 있습니다. |
| 초기 설계 비용 | 의존성 방향과 공개 계약을 정의해야 합니다. |
| DI 구성 복잡도 | Provider 등록과 Module Import 관리가 필요합니다. |
| 디버깅 복잡도 | Factory Provider와 동적 Provider의 생성 과정을 추적해야 할 수 있습니다. |
| 런타임 오류 가능성 | Token 누락이나 Provider 등록 오류가 발생할 수 있습니다. |
| 경계 검증 필요 | DI Container만으로 모든 아키텍처 규칙을 강제할 수 없습니다. |

따라서 의존성 관리는 프로젝트의 규모와 복잡도에 맞게 적용해야 합니다.

---

## 19. 실무 적용 권장사항

NestJS에서 Dependency Management를 설계할 때는 다음 원칙을 고려하는 것이 좋습니다.

1. **생성자 기반 Dependency Injection을 우선적으로 사용합니다.** 클래스의 의존성이 명시적으로 드러나도록 구성합니다.

2. **Provider는 적절한 Module에 등록합니다.** 동일한 Provider를 여러 Module에 불필요하게 중복 등록하지 않습니다.

3. **Module의 공개 Provider를 최소화합니다.** 다른 Module에서 필요한 기능만 `exports`를 통해 공개합니다.

4. **기능별 모듈 경계를 유지합니다.** 다른 Module의 내부 Repository나 Entity에 직접 의존하지 않도록 설계합니다.

5. **필요한 경계에 Dependency Inversion을 적용합니다.** 외부 기술의 변경 가능성이 높거나 핵심 비즈니스 로직의 독립성이 필요한 경우 Port와 Adapter를 도입합니다.

6. **Injection Token을 명확하게 관리합니다.** 문자열이나 Symbol 기반 Token을 사용하는 경우 중앙에서 정의하고 일관되게 사용합니다.

7. **순환 의존성을 구조적으로 해결합니다.** `forwardRef()`를 사용하기 전에 책임 분리 및 Orchestration 구조를 검토합니다.

8. **기본 Singleton Scope를 우선적으로 사용합니다.** 요청별 인스턴스가 필요한 경우에만 Request Scope를 적용합니다.

9. **ModuleRef의 사용을 제한합니다.** 일반적인 의존성 연결에는 명시적인 DI를 우선합니다.

10. **아키텍처 경계를 자동으로 검사합니다.** ESLint, Dependency Cruiser 및 CI 등을 이용하여 의존성 규칙 위반을 검증합니다.

11. **테스트에서 의존성을 교체할 수 있도록 설계합니다.** Mock Provider, Fake Repository 및 `overrideProvider()`를 활용합니다.

12. **추상화의 수준을 프로젝트 복잡도에 맞게 결정합니다.** 모든 의존성을 무조건 Interface로 분리하기보다 실제 변경 가능성과 유지보수 비용을 고려합니다.

---

## 20. 정리

Dependency Management는 애플리케이션을 구성하는 클래스와 모듈 사이의 의존성을 명확하게 정의하고 제어하는 설계 활동입니다.

NestJS는 Provider, Module 및 DI Container를 통해 객체 생성과 의존성 연결을 관리할 수 있는 기능을 제공합니다.

핵심 개념은 다음과 같습니다.

| 개념 | 핵심 역할 |
|---|---|
| Dependency Injection | 객체의 의존성을 외부에서 주입합니다. |
| DI Container | Provider 등록과 인스턴스 연결을 관리합니다. |
| Module | Provider의 구성 및 공개 범위를 관리합니다. |
| Injection Token | 주입할 Provider를 식별합니다. |
| Custom Provider | 구현 클래스와 생성 방식을 구성합니다. |
| Dependency Inversion | 추상화를 중심으로 의존성 방향을 설계합니다. |
| Provider Scope | 인스턴스의 생명주기를 관리합니다. |
| ModuleRef | 등록된 Provider를 동적으로 조회합니다. |
| Architecture Boundary | 계층 및 모듈 간 허용되는 의존성을 정의합니다. |

NestJS의 Dependency Injection은 객체 생성과 연결을 관리하는 데 유용하지만, 아키텍처의 의존성 방향과 모듈 경계를 자동으로 보장하지는 않습니다.

따라서 개발자는 기능별 책임과 모듈의 공개 계약을 명확하게 정의하고, 필요한 경우 Dependency Inversion과 정적 분석 도구를 함께 사용해야 합니다.

특히 Layered Architecture, Modular Monolith, Clean Architecture 및 CQRS에서는 서로 다른 관점에서 의존성을 관리합니다.

이러한 설계 원칙을 이해하면 기능 확장과 외부 기술 변경에 유연하게 대응하면서 유지보수성과 테스트 용이성을 확보하는 데 도움이 됩니다.

---

## 21. 관련 문서

- `../01-fundamentals/modules.md` — NestJS Module의 역할 및 구성
- `../01-fundamentals/providers.md` — Provider와 DI Container
- `../01-fundamentals/dependency-injection.md` — Dependency Injection의 개념과 동작 원리
- `../01-fundamentals/custom-providers.md` — Custom Provider 및 Injection Token
- `../01-fundamentals/injection-scopes.md` — Provider Scope와 생명주기
- `../01-fundamentals/dynamic-modules.md` — Dynamic Module 구성
- `../06-testing/unit-testing.md` — 단위 테스트
- `../06-testing/integration-testing.md` — 통합 테스트
- `../06-testing/mocking-providers.md` — Mock Provider 구성
- `./layered-architecture.md` — Layered Architecture
- `./modular-monolith.md` — Modular Monolith
- `./clean-architecture.md` — Clean Architecture
- `./cqrs-pattern.md` — CQRS Pattern

---

## 22. 참고 자료

### NestJS 공식 문서

- [NestJS Documentation](https://docs.nestjs.com/) — NestJS 공식 문서
- [NestJS Providers](https://docs.nestjs.com/providers) — Provider와 Dependency Injection
- [NestJS Modules](https://docs.nestjs.com/modules) — Module 구성, Provider의 공개 범위 및 의존성 관계
- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers) — `useClass`, `useValue`, `useFactory`, `useExisting` 및 Injection Token
- [NestJS Asynchronous Providers](https://docs.nestjs.com/fundamentals/async-providers) — 비동기 Provider 생성
- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes) — Singleton, Request 및 Transient Scope
- [NestJS Circular Dependency](https://docs.nestjs.com/fundamentals/circular-dependency) — 순환 의존성과 `forwardRef()`
- [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref) — `ModuleRef`를 통한 Provider 접근
- [NestJS Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules) — Dynamic Module 구성
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing) — Mock Provider 및 TestingModule

### 소프트웨어 설계 및 아키텍처

- [Robert C. Martin — The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — Clean Architecture의 Dependency Rule
- [Martin Fowler — Inversion of Control Containers and Dependency Injection Pattern](https://martinfowler.com/articles/injection.html) — IoC Container와 Dependency Injection
- [Martin Fowler — Presentation Domain Data Layering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html) — 계층형 아키텍처와 책임 분리
- [Martin Fowler — Repository](https://martinfowler.com/eaaCatalog/repository.html) — Repository 패턴
- [Martin Fowler — Bounded Context](https://martinfowler.com/bliki/BoundedContext.html) — 기능별 경계와 도메인 모델
- [Microsoft — Common Web Application Architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) — 웹 애플리케이션 아키텍처와 의존성 관리

### 의존성 분석 및 아키텍처 검증

- [ESLint — no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) — 특정 모듈 Import 제한
- [Dependency Cruiser](https://github.com/sverweij/dependency-cruiser) — JavaScript 및 TypeScript 의존성 분석
- [Nx — Enforce Module Boundaries](https://nx.dev/features/enforce-module-boundaries) — Module 간 의존성 경계 검사
- [TypeScript Handbook — Modules](https://www.typescriptlang.org/docs/handbook/modules/introduction.html) — TypeScript 모듈 및 Import 구조