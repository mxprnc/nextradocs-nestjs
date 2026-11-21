# Clean Architecture

## 1. 개요

Clean Architecture(클린 아키텍처)는 애플리케이션의 핵심 비즈니스 규칙을 프레임워크, 데이터베이스, 사용자 인터페이스 및 외부 시스템의 구현 세부사항으로부터 분리하는 소프트웨어 아키텍처 패턴입니다.

Robert C. Martin이 제안한 Clean Architecture는 관심사의 분리(Separation of Concerns)와 의존성 역전 원칙(Dependency Inversion Principle)을 기반으로 합니다.

핵심 목표는 비즈니스 로직이 외부 기술의 변경에 직접적인 영향을 받지 않도록 설계하는 것입니다.

일반적인 NestJS 애플리케이션에서는 Controller, Service, Repository를 사용하여 계층을 구분할 수 있습니다.

그러나 이러한 계층 분리만으로 Clean Architecture가 구현되는 것은 아닙니다.

Clean Architecture에서는 계층의 역할뿐 아니라 **소스 코드의 의존성 방향**을 중요하게 다룹니다.

대표적인 구성은 다음과 같습니다.

```text
┌────────────────────────────────────────────────────┐
│             Frameworks & Drivers                   │
│                                                    │
│   NestJS, TypeORM, PostgreSQL, External APIs       │
│                                                    │
│    ┌──────────────────────────────────────────┐    │
│    │          Interface Adapters              │    │
│    │                                          │    │
│    │ Controllers, Presenters, DB Adapters     │    │
│    │                                          │    │
│    │    ┌────────────────────────────────┐    │    │
│    │    │        Application             │    │    │
│    │    │                                │    │    │
│    │    │ Use Cases, Input/Output Ports  │    │    │
│    │    │                                │    │    │
│    │    │    ┌──────────────────────┐    │    │    │
│    │    │    │        Domain        │    │    │    │
│    │    │    │                      │    │    │    │
│    │    │    │ Entities, Business   │    │    │    │
│    │    │    │ Rules, Value Objects │    │    │    │
│    │    │    └──────────────────────┘    │    │    │
│    │    └────────────────────────────────┘    │    │
│    └──────────────────────────────────────────┘    │
└────────────────────────────────────────────────────┘
```

이 구조에서 안쪽에 위치할수록 핵심 비즈니스 정책을 담당하고, 바깥쪽에 위치할수록 구체적인 기술 구현을 담당합니다.

Clean Architecture의 가장 중요한 규칙은 다음과 같습니다.

**외부 계층은 내부 계층에 의존할 수 있지만, 내부 계층은 외부 계층의 구현 세부사항에 의존하지 않아야 합니다.**

NestJS는 Clean Architecture를 강제하지 않지만, Module 및 Custom Provider 기능을 활용하면 필요한 의존성 구성을 구현할 수 있습니다.

---

## 2. Clean Architecture의 목적

Clean Architecture의 주요 목적은 비즈니스 규칙의 독립성과 테스트 용이성, 그리고 외부 기술 변경에 대한 유연성을 확보하는 것입니다.

### 2.1. 프레임워크 독립성

Clean Architecture에서는 핵심 비즈니스 로직이 특정 웹 프레임워크에 종속되지 않도록 설계합니다.

예를 들어 주문 생성 기능의 비즈니스 규칙은 NestJS의 `@Controller()`, `@Injectable()`, `@Module()`과 같은 데코레이터를 알 필요가 없습니다.

주문 생성이라는 비즈니스 기능은 HTTP 요청뿐 아니라 다음과 같은 방식으로도 실행될 수 있기 때문입니다.

- HTTP REST API
- GraphQL Resolver
- Message Queue Consumer
- CLI Command
- Scheduled Job

이러한 외부 실행 방식이 변경되더라도 핵심 비즈니스 로직을 재사용할 수 있도록 구성합니다.

### 2.2. 데이터베이스 독립성

비즈니스 계층이 TypeORM이나 Prisma의 구체적인 API에 직접 의존하면 데이터 접근 기술을 변경할 때 비즈니스 로직까지 수정해야 할 수 있습니다.

Clean Architecture에서는 Repository의 계약을 내부 계층에서 정의하고, 실제 데이터베이스 접근 구현을 외부 계층에 배치합니다.

```text
Application
     │
     ▼
Repository Port
     ▲
     │ implements
     │
TypeORM Repository Adapter
     │
     ▼
PostgreSQL
```

이렇게 구성하면 Repository의 외부 계약이 유지되는 범위에서 영속성 구현을 교체할 수 있습니다.

다만 실제 데이터베이스 변경 과정에서는 트랜잭션, 조회 기능, 데이터 타입 및 성능 특성 등의 차이로 인해 추가적인 수정이 필요할 수 있습니다.

### 2.3. 테스트 용이성

핵심 비즈니스 로직이 외부 시스템과 분리되어 있으면 실제 데이터베이스나 HTTP 서버를 실행하지 않고 테스트할 수 있습니다.

예를 들어 주문 생성 Use Case에서 Repository Port를 Mock 또는 Fake 객체로 대체하면 데이터베이스 연결 없이 비즈니스 처리 결과를 검증할 수 있습니다.

### 2.4. 변경 영향 최소화

각 계층의 책임과 의존성 방향이 명확하면 외부 시스템 변경이 내부 비즈니스 로직으로 전파되는 것을 줄일 수 있습니다.

예를 들어 다음과 같은 변경에 대응하기 쉬워집니다.

| 변경 사항 | 주로 영향을 받는 계층 |
|---|---|
| REST API를 GraphQL로 변경 | Interface Adapters |
| TypeORM을 다른 ORM으로 변경 | Infrastructure 및 Persistence Adapter |
| 데이터베이스 연결 설정 변경 | Infrastructure |
| 비즈니스 규칙 변경 | Domain 또는 Application |
| 외부 결제 API 교체 | Infrastructure Adapter |
| 응답 데이터 형식 변경 | Interface Adapters 및 공개 계약 |

실제 영향 범위는 계층 간 계약과 변경 내용에 따라 달라질 수 있습니다.

---

## 3. Clean Architecture의 핵심 원칙

### 3.1. Dependency Rule

Dependency Rule(의존성 규칙)은 Clean Architecture의 가장 중요한 원칙입니다.

소스 코드의 의존성은 바깥쪽 계층에서 안쪽 계층을 향해야 합니다.

```text
Infrastructure ─────┐
                    │
Presentation ───────┼──► Application ───► Domain
                    │
Adapters ───────────┘
```

여기서 화살표는 런타임 데이터 흐름이 아니라 **소스 코드의 의존성 방향**을 의미합니다.

예를 들어 Application 계층은 Domain 계층의 클래스를 import할 수 있습니다.

반대로 Domain 계층이 Application이나 Infrastructure 계층의 클래스를 import해서는 안 됩니다.

대표적인 의존성 규칙은 다음과 같습니다.

| 계층 | 허용되는 주요 의존성 |
|---|---|
| Domain | 자체 도메인 모델 및 규칙 |
| Application | Domain 및 내부에 정의한 계약 |
| Interface Adapters | Application 및 Domain |
| Infrastructure | Application의 Port, Domain 및 외부 기술 |
| Composition Root | 구성에 필요한 여러 계층 |

Composition Root는 실제 객체와 의존성을 연결하는 위치로, NestJS에서는 주로 Module의 Provider 등록 부분이 이 역할을 수행합니다.

### 3.2. Dependency Inversion Principle

Dependency Inversion Principle(DIP)은 고수준 정책이 저수준 구현에 직접 의존하지 않고 추상화에 의존하도록 만드는 설계 원칙입니다.

일반적인 구현에서는 다음과 같은 의존성이 발생할 수 있습니다.

```text
OrdersService
     │
     ▼
TypeOrmOrdersRepository
     │
     ▼
TypeORM
```

이 구조에서는 비즈니스 로직이 구체적인 데이터 접근 기술에 의존합니다.

DIP를 적용하면 다음과 같이 구성할 수 있습니다.

```text
               Application
                    │
                    ▼
             OrderRepository
               (Interface)
                    ▲
                    │
                  implements
                    │
         TypeOrmOrderRepository
                    │
                    ▼
                  TypeORM
```

Application은 Repository Interface를 참조합니다.

Infrastructure의 Repository 구현 클래스도 해당 Interface를 참조하여 구현합니다.

따라서 실제 Repository를 호출하는 런타임 흐름과 소스 코드의 의존성 방향이 달라질 수 있습니다.

이러한 구조를 Dependency Inversion이라고 합니다.

### 3.3. Separation of Concerns

관심사의 분리는 서로 다른 역할과 변경 이유를 가진 코드를 별도의 구성 요소로 구분하는 원칙입니다.

Clean Architecture에서는 다음과 같이 책임을 구분합니다.

- Domain: 비즈니스 개념과 핵심 규칙
- Application: 사용 사례와 작업 흐름
- Interface Adapters: 외부 입력 및 출력 형식 변환
- Infrastructure: 데이터베이스 및 외부 시스템 연동

계층을 나누는 목적은 파일 개수를 늘리는 것이 아니라 변경 이유가 다른 코드를 분리하는 데 있습니다.

### 3.4. Dependency Injection

Dependency Injection(DI)은 필요한 의존성을 외부에서 주입받는 방식입니다.

NestJS는 DI Container를 기본적으로 제공하므로 추상화와 구현을 연결할 수 있습니다.

다만 Dependency Injection과 Dependency Inversion은 서로 다른 개념입니다.

Dependency Injection은 객체의 의존성을 제공하는 메커니즘이며, Dependency Inversion은 소스 코드의 의존성 방향을 설계하는 원칙입니다.

DI를 사용하더라도 비즈니스 로직이 구체적인 TypeORM Repository 클래스에 의존한다면 Dependency Inversion이 충분히 적용되지 않은 구조일 수 있습니다.

---

## 4. Clean Architecture의 주요 계층

Clean Architecture의 원래 모델은 Entities, Use Cases, Interface Adapters, Frameworks & Drivers를 대표적인 계층으로 설명합니다.

NestJS 프로젝트에서는 이를 Domain, Application, Interface Adapters, Infrastructure 등으로 표현하는 경우가 많습니다.

이러한 명칭은 실무에서 자주 사용하는 매핑 방식이며, Clean Architecture가 특정한 디렉터리 이름이나 정확히 네 개의 계층을 강제하는 것은 아닙니다.

### 4.1. Domain Layer

Domain Layer는 애플리케이션의 핵심 비즈니스 개념과 규칙을 표현합니다.

주요 구성 요소는 다음과 같습니다.

- Domain Entity
- Value Object
- Domain Service
- Domain Exception
- Business Rule

예를 들어 주문 도메인에서는 다음과 같은 규칙을 정의할 수 있습니다.

- 주문 수량은 1 이상이어야 합니다.
- 주문 총액은 단가와 수량을 기준으로 계산합니다.
- 취소된 주문은 다시 취소할 수 없습니다.

Domain Layer는 이러한 규칙을 NestJS나 ORM에 의존하지 않는 TypeScript 코드로 표현할 수 있습니다.

```typescript
export class Order {
  constructor(
    public readonly productId: number,
    public readonly quantity: number,
    public readonly unitPrice: number,
  ) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Invalid order quantity');
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Invalid unit price');
    }
  }

  get totalPrice(): number {
    return this.quantity * this.unitPrice;
  }
}
```

위 코드는 순수 TypeScript 클래스로 작성되어 있습니다.

`@Entity()`, `@Injectable()` 등의 프레임워크 또는 ORM 데코레이터가 필요하지 않습니다.

실무에서는 금액 계산에 부동소수점 오차가 발생하지 않도록 정수 최소 화폐 단위 또는 Decimal 타입을 사용하는 방식을 고려해야 합니다.

### 4.2. Application Layer

Application Layer는 애플리케이션이 제공하는 Use Case를 구현합니다.

Use Case는 사용자가 수행하려는 작업이나 시스템의 비즈니스 기능을 표현합니다.

예를 들어 다음과 같은 Use Case를 정의할 수 있습니다.

- CreateOrderUseCase
- CancelOrderUseCase
- GetOrderUseCase
- RegisterUserUseCase

Application Layer는 Domain 객체를 사용하여 작업 흐름을 조정하고 필요한 Repository 및 외부 서비스의 계약을 호출합니다.

주요 책임은 다음과 같습니다.

- Use Case 실행
- 입력 데이터 처리
- Domain 객체 호출
- Repository Port 호출
- 작업 흐름 및 결과 조정
- 애플리케이션 수준의 정책 적용

Application Layer는 구체적인 데이터베이스 연결이나 HTTP 요청 처리 방식을 직접 구현하지 않습니다.

### 4.3. Interface Adapters Layer

Interface Adapters는 외부 시스템이 사용하는 데이터 형식과 내부 Use Case가 사용하는 형식을 서로 변환합니다.

주요 구성 요소는 다음과 같습니다.

- HTTP Controller
- GraphQL Resolver
- Presenter
- Request/Response Mapper
- Persistence Adapter

NestJS의 Controller는 대표적인 입력 Adapter로 사용할 수 있습니다.

```text
HTTP Request
     │
     ▼
NestJS Controller
     │
     ▼
Application Use Case
```

Controller는 HTTP 요청을 해석하고 Use Case를 실행한 후 처리 결과를 HTTP 응답으로 변환합니다.

반대로 데이터베이스 접근 Adapter는 Application에서 정의한 Repository Port를 구현하여 외부 저장 시스템과 연결합니다.

### 4.4. Infrastructure Layer

Infrastructure Layer는 데이터베이스, 외부 API, 메시징 시스템 및 프레임워크 구성 등 기술적인 구현 세부사항을 담당합니다.

예를 들어 다음과 같은 구성 요소가 포함될 수 있습니다.

- TypeORM Repository 구현
- Prisma Client Adapter
- PostgreSQL 연결
- Redis Adapter
- 외부 HTTP API Client
- 메시지 브로커 Adapter
- 파일 저장소 Adapter

Infrastructure의 구현 클래스는 Application 계층에서 정의한 Port를 구현할 수 있습니다.

이때 Application은 Infrastructure의 구체적인 클래스에 의존하지 않습니다.

### 4.5. 계층별 책임 비교

| 계층 | 주요 책임 | 예시 |
|---|---|---|
| Domain | 핵심 비즈니스 규칙 | Order, Money, DomainException |
| Application | Use Case와 작업 흐름 | CreateOrderUseCase |
| Interface Adapters | 데이터 형식 변환 및 외부 인터페이스 | OrdersController, Mapper |
| Infrastructure | 외부 기술 구현 | TypeOrmOrderRepository |
| Composition Root | 의존성 구성 및 연결 | OrdersModule, AppModule |

---

## 5. 데이터 흐름과 의존성 방향

Clean Architecture에서는 실제 데이터 흐름과 소스 코드의 의존성 방향을 구분해야 합니다.

### 5.1. 런타임 데이터 흐름

주문 생성 요청의 데이터 흐름은 다음과 같을 수 있습니다.

```text
HTTP Client
     │
     ▼
OrdersController
     │
     ▼
CreateOrderUseCase
     │
     ▼
OrderRepository Port
     │
     ▼
TypeOrmOrderRepository
     │
     ▼
Database
     │
     ▼
TypeOrmOrderRepository
     │
     ▼
CreateOrderUseCase
     │
     ▼
OrdersController
     │
     ▼
HTTP Response
```

실제 실행 과정에서는 Use Case가 Repository의 메서드를 호출하고, 데이터베이스 조회 및 저장 결과를 전달받습니다.

### 5.2. 소스 코드 의존성 방향

반면 코드의 의존성은 다음과 같이 구성됩니다.

```text
OrdersController ───────► CreateOrderUseCase
                                  │
                                  ▼
                               Domain
                                  ▲
                                  │
TypeOrmOrderRepository ───────────┘
          │
          ▼
   OrderRepository Port
        (Application)
```

`CreateOrderUseCase`는 Repository Port에 의존하지만 TypeORM 구현 클래스에는 의존하지 않습니다.

`TypeOrmOrderRepository`는 Application의 Repository Port를 구현합니다.

이러한 구조에서 Repository 호출은 외부 구현으로 전달되지만, 코드의 의존성은 내부 계층을 향하게 됩니다.

### 5.3. Dependency Rule 위반 사례

다음 코드는 Application Layer가 TypeORM을 직접 참조하는 예제입니다.

```typescript
import { Repository } from 'typeorm';

export class CreateOrderUseCase {
  constructor(
    private readonly repository: Repository<OrderEntity>,
  ) {}
}
```

이 구조에서는 Use Case가 ORM에 직접 의존합니다.

Clean Architecture를 엄격하게 적용하려면 다음과 같이 Repository Port를 정의할 수 있습니다.

```typescript
export interface OrderRepository {
  save(order: Order): Promise<Order>;
}
```

Use Case는 Repository Port를 사용합니다.

```typescript
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
  ) {}
}
```

실제 TypeORM 구현은 Infrastructure 계층에서 제공합니다.

이 방식은 Application에서 ORM의 구체적인 API를 알 필요가 없도록 만듭니다.

---

## 6. Port와 Adapter

Port와 Adapter는 Clean Architecture를 구현할 때 자주 사용하는 설계 개념입니다.

Ports and Adapters는 Hexagonal Architecture에서 강조하는 방식이며, Clean Architecture에서도 의존성 역전을 구현하기 위한 방법으로 활용할 수 있습니다.

### 6.1. Port

Port는 내부 계층과 외부 계층 사이의 계약을 정의합니다.

주요 유형은 다음과 같습니다.

| 유형 | 설명 | 예시 |
|---|---|---|
| Input Port | 외부에서 실행할 애플리케이션 기능의 계약 | CreateOrderUseCase |
| Output Port | 애플리케이션이 외부 기능을 사용하기 위한 계약 | OrderRepository |

Input Port는 Use Case의 공개 계약을 나타내며, Output Port는 Repository나 외부 API 등 애플리케이션이 필요로 하는 기능을 추상화합니다.

### 6.2. Adapter

Adapter는 Port와 연결되는 실제 구현입니다.

예를 들어 다음과 같습니다.

| Adapter 유형 | 구현 예시 |
|---|---|
| Input Adapter | NestJS Controller |
| Input Adapter | GraphQL Resolver |
| Output Adapter | TypeORM Repository 구현 |
| Output Adapter | External Payment API Client |
| Output Adapter | Redis Cache Adapter |

### 6.3. Port와 Adapter의 관계

```text
                Input Adapter
              (NestJS Controller)
                       │
                       ▼
                 Input Port
                       │
                       ▼
                  Use Case
                       │
                       ▼
                 Output Port
                       ▲
                       │
                  implements
                       │
                 Output Adapter
               (TypeORM Repository)
                       │
                       ▼
                    Database
```

실제 애플리케이션에서는 Input Port를 별도의 Interface로 정의할 수도 있고, Use Case의 공개 메서드 자체를 입력 계약으로 사용할 수도 있습니다.

모든 Use Case에 별도의 Interface를 만들어야 하는 것은 아닙니다.

---

## 7. NestJS 프로젝트 디렉터리 구조

Clean Architecture는 특정한 디렉터리 구조를 강제하지 않습니다.

그러나 계층 간 책임과 의존성 관계를 코드 구조에 반영하면 아키텍처를 이해하고 유지하는 데 도움이 됩니다.

### 7.1. 전체 계층 중심 구조

다음은 계층별로 디렉터리를 구성한 예제입니다.

```text
src/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── exceptions/
│
├── application/
│   ├── use-cases/
│   └── ports/
│
├── infrastructure/
│   ├── persistence/
│   └── external/
│
├── presentation/
│   ├── controllers/
│   └── dto/
│
└── app.module.ts
```

이 구조는 계층별 책임을 명확하게 표현합니다.

하지만 기능이 많아지면 하나의 기능을 수정하기 위해 여러 디렉터리를 탐색해야 할 수 있습니다.

### 7.2. 기능별 모듈 중심 구조

NestJS에서는 기능별 Module 내부에 Clean Architecture의 계층을 구성하는 방식도 사용할 수 있습니다.

```text
src/
├── users/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   ├── presentation/
│   └── users.module.ts
│
├── orders/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   ├── presentation/
│   └── orders.module.ts
│
└── app.module.ts
```

이 구조는 Modular Monolith와 Clean Architecture를 함께 적용한 형태입니다.

각 기능 모듈이 자신의 Domain, Application, Infrastructure 및 Presentation 구성 요소를 관리합니다.

기능별 변경 범위를 제한하고 모듈 경계를 유지하기에 적합합니다.

다만 계층별 디렉터리를 만드는 것만으로 의존성 규칙이 자동으로 강제되지는 않습니다.

---

## 8. Clean Architecture 구현 예제

이번 예제에서는 주문 생성 기능을 구현합니다.

구현 목표는 다음과 같습니다.

1. Domain 객체에 핵심 비즈니스 규칙을 작성합니다.
2. Application에 주문 생성 Use Case를 정의합니다.
3. Repository Port를 Application에 배치합니다.
4. Infrastructure에서 Repository Port를 구현합니다.
5. Presentation에서 HTTP Controller를 구현합니다.
6. NestJS Module에서 실제 의존성을 연결합니다.

예제에서는 별도의 ORM 없이 In-Memory Repository를 사용합니다.

이는 Clean Architecture 자체가 특정 데이터베이스에 의존하지 않는다는 점을 설명하기 위한 구성입니다.

실제 서비스에서는 Infrastructure Adapter를 TypeORM이나 Prisma 기반 구현으로 교체할 수 있습니다.

### 8.1. 프로젝트 구조

```text
src/
├── app.module.ts
│
└── orders/
    ├── domain/
    │   ├── entities/
    │   │   └── order.ts
    │   └── exceptions/
    │       └── invalid-order.exception.ts
    │
    ├── application/
    │   ├── dto/
    │   │   └── create-order.command.ts
    │   ├── ports/
    │   │   └── order-repository.port.ts
    │   └── use-cases/
    │       └── create-order.use-case.ts
    │
    ├── infrastructure/
    │   └── persistence/
    │       └── in-memory-order.repository.ts
    │
    ├── presentation/
    │   ├── controllers/
    │   │   └── orders.controller.ts
    │   └── dto/
    │       └── create-order-request.dto.ts
    │
    └── orders.module.ts
```

### 8.2. Domain Exception 정의

`orders/domain/exceptions/invalid-order.exception.ts`

```typescript
export class InvalidOrderException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderException';
  }
}
```

도메인 예외는 비즈니스 규칙을 위반했을 때 발생하는 오류를 표현합니다.

`BadRequestException`과 같은 NestJS HTTP 예외를 사용하지 않으므로 Domain이 HTTP 프레임워크에 의존하지 않습니다.

### 8.3. Domain Entity 구현

`orders/domain/entities/order.ts`

```typescript
import { InvalidOrderException } from '../exceptions/invalid-order.exception';

export class Order {
  private constructor(
    public readonly id: string,
    public readonly productId: number,
    public readonly quantity: number,
    public readonly unitPrice: number,
  ) {}

  static create(
    id: string,
    productId: number,
    quantity: number,
    unitPrice: number,
  ): Order {
    if (!Number.isInteger(productId) || productId < 1) {
      throw new InvalidOrderException(
        'Product ID must be a positive integer',
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new InvalidOrderException(
        'Quantity must be a positive integer',
      );
    }

    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) {
      throw new InvalidOrderException(
        'Unit price must be a non-negative safe integer',
      );
    }

    return new Order(
      id,
      productId,
      quantity,
      unitPrice,
    );
  }

  get totalPrice(): number {
    const total = this.quantity * this.unitPrice;

    if (!Number.isSafeInteger(total)) {
      throw new InvalidOrderException(
        'Total price exceeds the safe integer range',
      );
    }

    return total;
  }
}
```

이 예제에서는 가격을 정수 금액으로 표현합니다.

실제 서비스에서는 통화별 최소 화폐 단위와 정밀도 정책을 별도로 정의해야 합니다.

Domain Entity에는 NestJS나 TypeORM의 데코레이터가 존재하지 않습니다.

또한 외부 시스템의 입력 형식이나 데이터베이스 테이블 구조도 직접 참조하지 않습니다.

비즈니스 규칙은 `Order.create()`와 `totalPrice`에 캡슐화됩니다.

### 8.4. Repository Port 정의

`orders/application/ports/order-repository.port.ts`

```typescript
import { Order } from '../../domain/entities/order';

export interface OrderRepositoryPort {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}
```

Repository Port는 Application이 필요로 하는 데이터 저장 및 조회 기능의 계약입니다.

TypeORM이나 Prisma의 구체적인 API를 포함하지 않습니다.

따라서 Application은 해당 Interface만 참조하면 됩니다.

TypeScript의 Interface는 런타임에 존재하지 않으므로 NestJS DI를 위해서는 별도의 Token이 필요합니다.

이 예제에서는 Token을 Composition Root인 Module에 정의하고 사용하겠습니다.

### 8.5. Application Command 정의

`orders/application/dto/create-order.command.ts`

```typescript
export interface CreateOrderCommand {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderResult {
  id: string;
  productId: number;
  quantity: number;
  totalPrice: number;
}
```

Command는 Use Case를 실행하는 데 필요한 입력 데이터를 표현합니다.

Result는 Use Case 실행 결과를 나타냅니다.

이러한 타입은 HTTP Request DTO와 별개의 개념입니다.

HTTP 요청 형식이 변경되더라도 Application Command의 계약이 유지된다면 Use Case를 수정할 필요가 없습니다.

### 8.6. Use Case 구현

`orders/application/use-cases/create-order.use-case.ts`

```typescript
import { randomUUID } from 'node:crypto';

import { Order } from '../../domain/entities/order';
import { OrderRepositoryPort } from '../ports/order-repository.port';
import {
  CreateOrderCommand,
  CreateOrderResult,
} from '../dto/create-order.command';

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepositoryPort,
  ) {}

  async execute(
    command: CreateOrderCommand,
  ): Promise<CreateOrderResult> {
    const order = Order.create(
      randomUUID(),
      command.productId,
      command.quantity,
      command.unitPrice,
    );

    await this.orderRepository.save(order);

    return {
      id: order.id,
      productId: order.productId,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
    };
  }
}
```

`CreateOrderUseCase`는 주문 생성이라는 애플리케이션 작업을 수행합니다.

처리 순서는 다음과 같습니다.

1. 주문 식별자를 생성합니다.
2. Domain Entity를 생성하고 비즈니스 규칙을 검증합니다.
3. Repository Port를 통해 주문 저장을 요청합니다.
4. 저장이 성공하면 처리 결과를 반환합니다.

이 코드에는 NestJS나 ORM에 대한 직접적인 의존성이 없습니다.

다만 `node:crypto`는 Node.js 런타임 API이므로, 이 예제의 Application이 실행 환경으로부터 완전히 독립적인 것은 아닙니다.

플랫폼 독립성까지 높이려면 ID 생성 기능도 별도의 Port로 추상화할 수 있습니다.

Clean Architecture에서는 모든 작은 기술 의존성을 반드시 추상화해야 하는 것은 아니며, 변경 가능성과 테스트 요구사항에 따라 추상화 범위를 결정할 수 있습니다.

### 8.7. Infrastructure Repository 구현

`orders/infrastructure/persistence/in-memory-order.repository.ts`

```typescript
import { Order } from '../../domain/entities/order';
import { OrderRepositoryPort } from '../../application/ports/order-repository.port';

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

이 Repository는 Application의 `OrderRepositoryPort`를 구현합니다.

`InMemoryOrderRepository`는 Infrastructure 계층에 위치하며, 실제 데이터 저장 방식을 담당합니다.

Use Case는 이 구현 클래스의 존재를 알 필요가 없습니다.

Repository 구현을 TypeORM 기반으로 교체하더라도 Port의 계약을 유지하면 Use Case에 대한 변경을 최소화할 수 있습니다.

단, 이 구현은 프로세스 내부 메모리에 데이터를 저장하므로 데이터 영속성과 여러 Replica 간 데이터 공유를 지원하지 않습니다.

### 8.8. HTTP Request DTO 구현

`orders/presentation/dto/create-order-request.dto.ts`

```typescript
export class CreateOrderRequestDto {
  productId: number;
  quantity: number;
  unitPrice: number;
}
```

이 DTO는 HTTP 요청의 입력 형식을 정의합니다.

예제에서는 별도의 런타임 검증 라이브러리를 사용하지 않습니다.

실제 NestJS 애플리케이션에서는 `class-validator`, `class-transformer` 및 `ValidationPipe`를 이용하여 HTTP 경계에서 입력을 검증할 수 있습니다.

다만 HTTP 입력 검증과 Domain의 비즈니스 규칙 검증은 서로 다른 책임입니다.

HTTP 입력 검증은 요청 데이터의 형식과 기본적인 제약조건을 검증하고, Domain 검증은 비즈니스 규칙의 유효성을 보장합니다.

### 8.9. Controller 구현

`orders/presentation/controllers/orders.controller.ts`

```typescript
import {
  Body,
  BadRequestException,
  Controller,
  Post,
} from '@nestjs/common';

import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { InvalidOrderException } from '../../domain/exceptions/invalid-order.exception';
import { CreateOrderRequestDto } from '../dto/create-order-request.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateOrderRequestDto) {
    try {
      return await this.createOrderUseCase.execute({
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
      });
    } catch (error) {
      if (error instanceof InvalidOrderException) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
```

Controller는 HTTP 요청을 받아 Application Use Case에 전달합니다.

Domain에서 발생한 `InvalidOrderException`은 HTTP 400 응답에 해당하는 `BadRequestException`으로 변환합니다.

이 예제에서는 이해를 돕기 위해 Controller에서 직접 예외를 변환합니다.

실무에서는 여러 Controller에서 동일한 예외 변환이 필요한 경우 Exception Filter 또는 별도의 Presentation Adapter로 분리할 수 있습니다.

이렇게 구성하면 Domain이 HTTP 상태 코드에 의존하지 않으면서도 클라이언트에 적절한 응답을 제공할 수 있습니다.

### 8.10. NestJS Module에서 의존성 연결

`orders/orders.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { OrdersController } from './presentation/controllers/orders.controller';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { OrderRepositoryPort } from './application/ports/order-repository.port';
import { InMemoryOrderRepository } from './infrastructure/persistence/in-memory-order.repository';

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
        orderRepository: OrderRepositoryPort,
      ) => new CreateOrderUseCase(orderRepository),
      inject: [
        ORDER_REPOSITORY,
      ],
    },
  ],
})
export class OrdersModule {}
```

이 부분은 Clean Architecture와 NestJS DI를 연결하는 핵심 구성입니다.

`ORDER_REPOSITORY`는 Repository Port의 런타임 Injection Token입니다.

`useClass`는 해당 Token에 대한 구현 클래스로 `InMemoryOrderRepository`를 사용하도록 지정합니다.

`useFactory`는 Repository Port의 구현 인스턴스를 전달하여 `CreateOrderUseCase`를 생성합니다.

NestJS에서는 다음과 같은 방식도 사용할 수 있습니다.

```typescript
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly repository: OrderRepositoryPort,
  ) {}
}
```

이 방식은 코드가 간결하지만 Application 계층이 NestJS의 `@Injectable()`과 `@Inject()`에 의존하게 됩니다.

반대로 `useFactory`를 이용하면 Use Case를 순수 TypeScript 클래스로 유지할 수 있습니다.

엄격한 Clean Architecture를 지향한다면 Application의 프레임워크 의존성을 줄이기 위해 Composition Root에서 의존성을 조립하는 방식을 고려할 수 있습니다.

### 8.11. Root Module 구성

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    OrdersModule,
  ],
})
export class AppModule {}
```

`AppModule`은 `OrdersModule`을 등록합니다.

`OrdersModule` 내부에서는 Controller, Use Case 및 Repository Adapter의 의존성을 연결합니다.

### 8.12. 요청 처리 과정

클라이언트가 다음 요청을 전송한다고 가정합니다.

```http
POST /orders
Content-Type: application/json

{
  "productId": 100,
  "quantity": 2,
  "unitPrice": 15000
}
```

처리 과정은 다음과 같습니다.

```text
HTTP Request
     │
     ▼
OrdersController
     │
     ▼
CreateOrderUseCase
     │
     ├── Generate Order ID
     │
     ▼
Order.create()
     │
     ├── Validate Product ID
     ├── Validate Quantity
     └── Validate Unit Price
     │
     ▼
OrderRepositoryPort.save()
     │
     ▼
InMemoryOrderRepository
     │
     ▼
Save Order
     │
     ▼
CreateOrderUseCase
     │
     ▼
OrdersController
     │
     ▼
HTTP Response
```

정상적으로 처리되면 다음과 같은 응답을 반환합니다.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "productId": 100,
  "quantity": 2,
  "totalPrice": 30000
}
```

`id`는 UUID로 생성되므로 실제 실행 시 값이 달라집니다.

위 구조에서는 HTTP Controller와 Repository Adapter가 Application 및 Domain에 의존하지만, Application과 Domain은 Controller나 Repository 구현을 직접 참조하지 않습니다.

---

## 9. TypeORM을 이용한 Infrastructure 구현

실제 애플리케이션에서는 메모리 Repository 대신 TypeORM 등의 ORM을 사용할 수 있습니다.

이 경우 Domain Entity와 TypeORM Entity를 분리하는 것이 Clean Architecture의 의존성 규칙을 유지하는 데 도움이 됩니다.

### 9.1. Domain Entity와 Persistence Entity

Domain Entity는 비즈니스 규칙을 표현합니다.

Persistence Entity는 ORM을 이용하여 데이터를 저장하기 위한 매핑 정보를 표현합니다.

두 객체는 목적이 다르므로 반드시 동일한 클래스로 구현할 필요는 없습니다.

```text
Domain Entity
     │
     │ Mapping
     ▼
Persistence Entity
     │
     ▼
TypeORM
     │
     ▼
Database
```

### 9.2. TypeORM Entity 구현

`orders/infrastructure/persistence/typeorm/order.orm-entity.ts`

```typescript
import {
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('orders')
export class OrderOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('int')
  productId: number;

  @Column('int')
  quantity: number;

  @Column('int')
  unitPrice: number;
}
```

이 클래스는 TypeORM에 의존하므로 Infrastructure 계층에 배치합니다.

### 9.3. TypeORM Repository Adapter 구현

`orders/infrastructure/persistence/typeorm/typeorm-order.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order } from '../../../domain/entities/order';
import { OrderRepositoryPort } from '../../../application/ports/order-repository.port';
import { OrderOrmEntity } from './order.orm-entity';

@Injectable()
export class TypeOrmOrderRepository
  implements OrderRepositoryPort {

  constructor(
    @InjectRepository(OrderOrmEntity)
    private readonly repository: Repository<OrderOrmEntity>,
  ) {}

  async save(order: Order): Promise<void> {
    await this.repository.save({
      id: order.id,
      productId: order.productId,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
    });
  }

  async findById(id: string): Promise<Order | null> {
    const entity = await this.repository.findOneBy({
      id,
    });

    if (!entity) {
      return null;
    }

    return Order.create(
      entity.id,
      entity.productId,
      entity.quantity,
      entity.unitPrice,
    );
  }
}
```

Repository Adapter는 Domain Entity와 Persistence Entity 사이의 변환을 담당합니다.

이 코드에서는 TypeORM의 Entity를 Domain 객체로 변환할 때 `Order.create()`를 사용합니다.

따라서 데이터베이스에서 읽어 온 데이터도 Domain의 생성 규칙을 통과합니다.

다만 실제 도메인 모델에서는 신규 생성과 기존 객체의 복원을 구분해야 할 수 있습니다.

예를 들어 신규 주문 생성 시에만 적용되는 규칙이 존재한다면 `create()`와 `reconstitute()` 등의 별도 생성 메서드를 정의하는 방식이 적합할 수 있습니다.

### 9.4. Module 등록 변경

TypeORM 구현을 사용하려면 Module의 Provider 구성을 변경합니다.

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderOrmEntity,
    ]),
  ],
  controllers: [
    OrdersController,
  ],
  providers: [
    {
      provide: ORDER_REPOSITORY,
      useClass: TypeOrmOrderRepository,
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

위 코드는 핵심 Provider 구성만 나타낸 것으로, 실제 사용 시 `TypeOrmModule`, `Module`, `OrdersController` 및 관련 클래스의 import가 필요합니다.

또한 Root Module에서 `TypeOrmModule.forRoot()` 등을 통해 데이터베이스 연결을 설정해야 합니다.

앞선 In-Memory Repository 구현과 비교하면 Use Case 코드는 변경되지 않습니다.

변경되는 주요 부분은 Infrastructure 구현과 Module의 의존성 등록입니다.

이는 Repository Port를 통한 Dependency Inversion의 대표적인 활용 사례입니다.

---

## 10. 트랜잭션 관리

Clean Architecture에서는 트랜잭션의 비즈니스 경계와 실제 데이터베이스 트랜잭션 구현을 구분할 수 있습니다.

### 10.1. 트랜잭션 경계의 책임

예를 들어 주문 생성과 재고 차감이 하나의 원자적 작업이어야 한다고 가정합니다.

```text
CreateOrderUseCase
        │
        ├── Save Order
        │
        └── Decrease Stock
```

Application은 두 작업이 함께 성공해야 한다는 요구사항을 알고 있습니다.

그러나 구체적인 TypeORM 트랜잭션 API까지 직접 호출할 필요는 없습니다.

이를 위해 Unit of Work 또는 Transaction Manager에 대한 Port를 정의할 수 있습니다.

### 10.2. Unit of Work Port

```typescript
export interface UnitOfWorkPort {
  execute<T>(
    operation: () => Promise<T>,
  ): Promise<T>;
}
```

Application은 이 계약을 통해 하나의 작업 단위를 표현할 수 있습니다.

다만 이 Interface만으로 실제 트랜잭션이 구현되는 것은 아닙니다.

### 10.3. Infrastructure 구현

TypeORM에서는 `DataSource.transaction()`을 이용하여 데이터베이스 트랜잭션을 실행할 수 있습니다.

```typescript
await dataSource.transaction(async (manager) => {
  await manager.save(orderEntity);
  await manager.save(inventoryEntity);
});
```

TypeORM 트랜잭션에 참여하는 모든 데이터베이스 작업은 해당 트랜잭션의 EntityManager를 사용해야 합니다.

따라서 Unit of Work Port를 도입할 때는 Repository Adapter가 동일한 트랜잭션 컨텍스트를 사용하도록 설계해야 합니다.

단순히 트랜잭션 콜백 안에서 기존에 주입된 Repository를 호출한다고 해서 자동으로 동일한 트랜잭션에 참여하는 것은 아닙니다.

실무에서는 Transaction-scoped Repository, Unit of Work 또는 명시적인 Transaction Context 전달 방식 등을 검토할 수 있습니다.

### 10.4. 외부 시스템과 트랜잭션

데이터베이스 트랜잭션은 일반적으로 외부 HTTP API나 메시지 브로커까지 원자적으로 제어하지 못합니다.

예를 들어 주문 저장과 외부 결제 요청을 하나의 데이터베이스 트랜잭션으로 완전히 보장할 수는 없습니다.

이 경우 요구사항에 따라 다음과 같은 패턴을 고려할 수 있습니다.

- Transactional Outbox
- Saga Pattern
- Idempotency
- Retry 및 보상 처리

Clean Architecture는 이러한 분산 일관성 문제를 자동으로 해결하지 않으며, Use Case의 책임과 외부 기술의 구현 경계를 명확하게 만드는 기반을 제공합니다.

---

## 11. 예외 처리 전략

Clean Architecture에서는 Domain 또는 Application에서 발생하는 오류를 외부 통신 프로토콜의 오류와 구분하는 것이 좋습니다.

### 11.1. Domain Exception

Domain Exception은 비즈니스 규칙의 위반을 표현합니다.

예를 들어 다음과 같습니다.

```typescript
export class InsufficientStockException extends Error {
  constructor() {
    super('Insufficient stock');
    this.name = 'InsufficientStockException';
  }
}
```

이 예외는 HTTP나 GraphQL의 상태 코드에 의존하지 않습니다.

### 11.2. Application Exception

Application Exception은 Use Case를 실행하는 과정에서 발생하는 애플리케이션 수준의 실패를 표현할 수 있습니다.

예를 들어 다음과 같은 경우입니다.

- 조회 대상이 존재하지 않습니다.
- 요청한 작업을 현재 상태에서 수행할 수 없습니다.
- 필요한 비즈니스 리소스를 확보하지 못했습니다.

Domain Exception과 Application Exception의 구분은 프로젝트의 도메인 모델 및 예외 처리 정책에 따라 달라질 수 있습니다.

### 11.3. HTTP 예외 변환

Presentation에서는 내부 예외를 HTTP 응답으로 변환할 수 있습니다.

```text
Domain Exception
        │
        ▼
Presentation Exception Mapper
        │
        ▼
HTTP Status Code
```

예를 들어 다음과 같이 대응할 수 있습니다.

| 내부 예외 | HTTP 응답 예시 |
|---|---|
| InvalidOrderException | 400 Bad Request |
| OrderNotFoundException | 404 Not Found |
| OrderConflictException | 409 Conflict |
| InsufficientStockException | 409 Conflict |

이 매핑은 예시이며 실제 상태 코드는 API 계약에 따라 결정해야 합니다.

NestJS에서는 Exception Filter를 사용하여 공통 예외 변환 정책을 구현할 수 있습니다.

---

## 12. Clean Architecture의 테스트 전략

Clean Architecture에서는 내부 계층을 외부 기술 없이 테스트할 수 있도록 구성하는 것이 중요합니다.

### 12.1. Domain Unit Test

Domain Entity는 순수 TypeScript 클래스로 구현할 수 있으므로 NestJS TestingModule 없이 테스트할 수 있습니다.

```typescript
import { Order } from './order';
import { InvalidOrderException } from '../exceptions/invalid-order.exception';

describe('Order', () => {
  it('주문 총액을 계산합니다', () => {
    const order = Order.create(
      'order-1',
      100,
      2,
      15000,
    );

    expect(order.totalPrice).toBe(30000);
  });

  it('잘못된 수량을 거부합니다', () => {
    expect(() =>
      Order.create('order-1', 100, 0, 15000),
    ).toThrow(InvalidOrderException);
  });
});
```

이 테스트는 NestJS 애플리케이션이나 데이터베이스를 실행하지 않습니다.

### 12.2. Application Unit Test

Application Use Case도 Fake Repository를 이용하여 독립적으로 테스트할 수 있습니다.

```typescript
import { Order } from '../../domain/entities/order';
import { OrderRepositoryPort } from '../ports/order-repository.port';
import { CreateOrderUseCase } from './create-order.use-case';

class FakeOrderRepository implements OrderRepositoryPort {
  private readonly orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }
}

describe('CreateOrderUseCase', () => {
  it('주문을 생성하고 저장합니다', async () => {
    const repository = new FakeOrderRepository();
    const useCase = new CreateOrderUseCase(repository);

    const result = await useCase.execute({
      productId: 100,
      quantity: 2,
      unitPrice: 15000,
    });

    expect(result.totalPrice).toBe(30000);

    const savedOrder = await repository.findById(result.id);

    expect(savedOrder).not.toBeNull();
    expect(savedOrder?.quantity).toBe(2);
  });
});
```

이 테스트는 실제 데이터베이스 없이 Use Case의 처리 결과를 검증합니다.

NestJS TestingModule을 사용할 필요도 없습니다.

이는 Use Case가 NestJS 프레임워크로부터 분리되어 있을 때 얻을 수 있는 주요 장점입니다.

### 12.3. Infrastructure Integration Test

Infrastructure Adapter에서는 실제 데이터베이스를 사용하는 통합 테스트가 유용합니다.

예를 들어 다음과 같은 동작을 검증할 수 있습니다.

- ORM Entity 매핑
- 데이터 저장 및 조회
- Unique Constraint
- 트랜잭션 처리
- Domain Entity와 Persistence Entity 간 변환

데이터베이스 특성에 의존하는 기능은 가능하면 운영 환경과 같은 데이터베이스 엔진을 사용하여 검증하는 것이 좋습니다.

### 12.4. Presentation Test

Controller는 Use Case를 Mock 객체로 대체하여 테스트할 수 있습니다.

이 테스트에서는 다음 사항을 확인할 수 있습니다.

- HTTP 요청 데이터 매핑
- Use Case 호출
- 응답 데이터 변환
- Domain 및 Application 예외의 HTTP 변환

### 12.5. 테스트 범위 비교

| 테스트 대상 | 주요 검증 내용 | 외부 시스템 필요 여부 |
|---|---|---|
| Domain | 비즈니스 규칙 | 일반적으로 불필요 |
| Application | Use Case 흐름 | Fake 또는 Mock으로 대체 가능 |
| Infrastructure | 데이터 저장 및 외부 연동 | 통합 테스트에서 필요 |
| Presentation | 입력 및 응답 변환 | 단위 테스트에서는 대체 가능 |
| E2E | 전체 요청 처리 | 테스트 구성에 따라 필요 |

---

## 13. Layered Architecture와 Clean Architecture 비교

Layered Architecture와 Clean Architecture는 모두 관심사를 분리하지만 의존성을 관리하는 방식에서 차이가 있습니다.

### 13.1. Layered Architecture

일반적인 Layered Architecture에서는 다음과 같은 의존성을 가질 수 있습니다.

```text
Controller
    │
    ▼
Service
    │
    ▼
Repository Implementation
    │
    ▼
Database
```

Service는 Repository 구현 클래스나 ORM에 직접 의존할 수 있습니다.

이 구조는 비교적 단순하며 CRUD 중심 애플리케이션에 적합할 수 있습니다.

### 13.2. Clean Architecture

Clean Architecture에서는 비즈니스 계층이 Repository 구현 대신 추상화에 의존합니다.

```text
Controller ─────────► Use Case
                         │
                         ▼
                   Repository Port
                         ▲
                         │
                      implements
                         │
                Repository Adapter
                         │
                         ▼
                      Database
```

이 구조에서는 Repository 구현을 교체하더라도 Application의 변경을 줄일 수 있습니다.

### 13.3. 비교

| 구분 | Layered Architecture | Clean Architecture |
|---|---|---|
| 핵심 관심사 | 계층별 책임 분리 | 핵심 정책 보호와 의존성 방향 |
| 의존성 방향 | 일반적으로 상위 → 하위 | 외부 → 내부 |
| Service의 Repository 의존성 | 구체적인 구현에 의존 가능 | Port에 의존 |
| ORM 의존성 | Service에 전파될 수 있음 | Infrastructure로 격리 |
| Domain 독립성 | 설계에 따라 다름 | 중요한 설계 목표 |
| 초기 구현 복잡도 | 상대적으로 낮음 | 추상화로 인해 증가 가능 |
| 테스트 | Mock 기반 테스트 가능 | 내부 계층의 독립 테스트에 유리 |
| 주요 적용 대상 | 단순한 업무 애플리케이션 | 복잡한 비즈니스 규칙과 높은 변경 가능성 |

Layered Architecture에서도 Dependency Inversion을 적용할 수 있으므로 두 패턴을 완전히 배타적인 개념으로 이해해서는 안 됩니다.

---

## 14. Modular Monolith와 Clean Architecture의 관계

Modular Monolith는 기능별 모듈 경계를 정의하는 아키텍처입니다.

Clean Architecture는 각 계층의 책임과 의존성 방향을 관리하는 아키텍처입니다.

따라서 두 패턴은 함께 적용할 수 있습니다.

```text
┌────────────────────────────────────────────┐
│              NestJS Application            │
│                                            │
│   ┌────────────────────────────────────┐   │
│   │             UsersModule            │   │
│   │                                    │   │
│   │  Presentation                      │   │
│   │       │                            │   │
│   │       ▼                            │   │
│   │  Application                       │   │
│   │       │                            │   │
│   │       ▼                            │   │
│   │     Domain                         │   │
│   │                                    │   │
│   │  Infrastructure → Application Port │   │
│   └────────────────────────────────────┘   │
│                                            │
│   ┌────────────────────────────────────┐   │
│   │            OrdersModule            │   │
│   │                                    │   │
│   │  Presentation                      │   │
│   │       │                            │   │
│   │       ▼                            │   │
│   │  Application                       │   │
│   │       │                            │   │
│   │       ▼                            │   │
│   │     Domain                         │   │
│   │                                    │   │
│   │  Infrastructure → Application Port │   │
│   └────────────────────────────────────┘   │
│                                            │
└────────────────────────────────────────────┘
```

위 구조에서는 각 Module 내부에 Clean Architecture를 적용합니다.

Modular Monolith는 모듈 간 경계를 관리하고, Clean Architecture는 각 모듈 내부의 의존성 방향을 관리합니다.

다만 모듈 내부에 Clean Architecture를 적용했다고 해서 모듈 간 의존성 문제가 자동으로 해결되는 것은 아닙니다.

모듈 간 Public API, 데이터 소유권 및 직접 참조 제한 등의 규칙도 별도로 정의해야 합니다.

---

## 15. Clean Architecture와 CQRS

CQRS(Command Query Responsibility Segregation)는 상태를 변경하는 Command와 데이터를 조회하는 Query의 책임을 분리하는 패턴입니다.

Clean Architecture와 CQRS는 서로 다른 목적을 가지므로 함께 적용할 수 있습니다.

예를 들어 Application Layer를 다음과 같이 구성할 수 있습니다.

```text
application/
├── commands/
│   ├── create-order.command.ts
│   └── cancel-order.command.ts
│
├── queries/
│   ├── get-order.query.ts
│   └── list-orders.query.ts
│
├── handlers/
│   ├── create-order.handler.ts
│   ├── cancel-order.handler.ts
│   ├── get-order.handler.ts
│   └── list-orders.handler.ts
│
└── ports/
    ├── order-command.repository.ts
    └── order-query.repository.ts
```

NestJS에서는 `@nestjs/cqrs` 패키지를 통해 Command Handler와 Query Handler를 구현할 수 있습니다.

다만 `@nestjs/cqrs`의 데코레이터를 Application 계층에서 직접 사용하면 해당 계층이 NestJS의 CQRS 라이브러리에 의존하게 됩니다.

엄격한 프레임워크 독립성이 필요한 경우 순수 Use Case를 Application에 유지하고, CQRS Handler를 외부 Adapter로 구성하는 방식을 검토할 수 있습니다.

CQRS를 도입한다고 해서 반드시 읽기 데이터베이스와 쓰기 데이터베이스를 분리해야 하는 것은 아닙니다.

---

## 16. Clean Architecture 적용 시 주의사항

### 16.1. 불필요한 추상화

모든 클래스에 Interface를 추가하면 코드 구조가 복잡해질 수 있습니다.

Clean Architecture의 목적은 Interface의 수를 늘리는 것이 아니라 변화 가능성이 있는 구현 세부사항으로부터 핵심 비즈니스 로직을 보호하는 것입니다.

따라서 단순한 내부 계산 로직처럼 변경 가능성이 낮은 부분까지 무조건 추상화할 필요는 없습니다.

### 16.2. Anemic Domain Model

Domain Entity가 데이터만 보유하고 모든 비즈니스 규칙을 Use Case에 작성하면 Domain Model의 의미가 약해질 수 있습니다.

예를 들어 주문의 상태 전이 규칙은 해당 주문 객체에 캡슐화하는 것이 적합할 수 있습니다.

반면 여러 Domain 객체를 조정하는 애플리케이션 작업 흐름은 Use Case에서 관리할 수 있습니다.

### 16.3. Domain과 ORM Entity 혼용

TypeORM의 `@Entity()`가 적용된 클래스를 Domain과 Application 전반에서 사용하면 ORM 의존성이 내부 계층으로 전파될 수 있습니다.

엄격한 Clean Architecture에서는 Domain Entity와 Persistence Entity를 분리하는 것이 좋습니다.

그러나 단순한 애플리케이션에서는 매핑 코드의 비용도 고려해야 하므로 복잡도와 기술 독립성 요구사항에 따라 선택할 수 있습니다.

### 16.4. NestJS 데코레이터의 내부 계층 사용

`@Injectable()`은 NestJS의 DI 기능을 사용하기 위한 데코레이터입니다.

Domain이나 Application에 해당 데코레이터를 사용하면 NestJS에 대한 직접적인 의존성이 발생합니다.

프레임워크 독립성을 엄격하게 유지하려면 순수 TypeScript 클래스를 사용하고 Module에서 `useFactory` 등으로 의존성을 연결할 수 있습니다.

반면 실용적인 구현에서는 Application Use Case에 `@Injectable()`을 허용하고 생산성과 코드의 단순성을 우선할 수도 있습니다.

이 선택은 아키텍처의 제약 조건에 따라 결정해야 합니다.

### 16.5. 계층 간 순환 의존성

Domain은 Application을 참조하지 않고, Application은 Infrastructure를 참조하지 않도록 구성해야 합니다.

이러한 의존성 방향이 무너지면 Clean Architecture의 핵심 원칙을 유지하기 어려워집니다.

### 16.6. Domain과 Application 책임 혼동

Domain은 비즈니스 개념과 핵심 규칙을 표현합니다.

Application은 여러 Domain 객체와 Repository를 조합하여 사용 사례를 실행합니다.

예를 들어 주문 수량 검증은 Domain에 배치할 수 있으며, 주문을 저장하고 결제를 요청하는 전체 흐름은 Application에서 조정할 수 있습니다.

### 16.7. 계층별 데이터 모델 분리 비용

Domain Entity, Application DTO, Persistence Entity 및 HTTP DTO를 모두 분리하면 Mapper 코드가 증가할 수 있습니다.

모든 데이터 모델을 무조건 분리하기보다 각 모델이 서로 다른 변경 이유를 갖는지 검토하는 것이 좋습니다.

특히 외부 API 계약과 내부 Domain Model을 분리해야 하는 요구사항이 명확할수록 별도의 DTO와 Mapper를 도입할 가치가 높아집니다.

---

## 17. Clean Architecture의 장점과 한계

### 17.1. 장점

| 장점 | 설명 |
|---|---|
| 비즈니스 로직 독립성 | 핵심 규칙을 외부 기술의 구현 세부사항으로부터 분리할 수 있습니다. |
| 테스트 용이성 | Domain과 Use Case를 독립적으로 테스트하기 쉽습니다. |
| 유지보수성 | 변경 이유에 따라 코드를 구분할 수 있습니다. |
| 기술 교체 유연성 | Repository 및 외부 시스템 Adapter를 교체하기 쉽습니다. |
| 재사용성 | 동일한 Use Case를 여러 입력 방식에서 활용할 수 있습니다. |
| 도메인 중심 설계 | 기술 구현보다 비즈니스 규칙을 중심으로 설계할 수 있습니다. |

### 17.2. 한계

| 한계 | 설명 |
|---|---|
| 초기 구현 비용 | Port, Adapter 및 Mapper 등의 추가 코드가 필요할 수 있습니다. |
| 구조적 복잡도 | 작은 프로젝트에서는 계층 구분이 과도할 수 있습니다. |
| 추상화 관리 비용 | Interface와 구현 클래스 사이의 계약을 관리해야 합니다. |
| 학습 비용 | 의존성 방향과 계층 책임에 대한 이해가 필요합니다. |
| 데이터 변환 비용 | Domain과 Persistence 모델 사이의 변환이 필요할 수 있습니다. |
| 운영 문제의 별도 해결 필요 | 확장성, 트랜잭션, 장애 복구 등을 자동으로 해결하지는 않습니다. |

Clean Architecture는 복잡한 비즈니스 규칙이나 외부 기술 변경 가능성이 높은 애플리케이션에 유용합니다.

반면 단순한 CRUD 중심 애플리케이션에서는 추가적인 추상화가 개발 속도와 유지보수성에 불리하게 작용할 수도 있습니다.

---

## 18. 실무 적용 권장사항

NestJS에서 Clean Architecture를 적용할 때는 다음 사항을 고려하는 것이 좋습니다.

1. **Domain Layer의 프레임워크 의존성을 최소화합니다.** 핵심 비즈니스 규칙은 가능한 한 순수 TypeScript 클래스로 구현합니다.

2. **Use Case 중심으로 Application을 구성합니다.** 단순히 모든 비즈니스 로직을 하나의 Service에 집중시키지 않고 작업 단위를 명확하게 정의합니다.

3. **Repository Port를 내부 계층에 정의합니다.** Use Case가 구체적인 ORM 구현 대신 필요한 기능의 계약에 의존하도록 구성합니다.

4. **Infrastructure에서 외부 기술을 구현합니다.** ORM, 외부 API, 메시지 브로커 및 파일 저장소 연동을 Adapter로 분리합니다.

5. **Composition Root에서 의존성을 연결합니다.** NestJS Module의 `useClass`, `useFactory`, `useExisting` 등의 Provider 등록 방식을 활용합니다.

6. **HTTP DTO와 Application Command를 구분합니다.** 외부 요청 형식이 비즈니스 로직에 직접 전파되지 않도록 설계합니다.

7. **Domain Exception과 HTTP Exception을 구분합니다.** 외부 통신 계층에서 비즈니스 오류를 적절한 프로토콜 응답으로 변환합니다.

8. **트랜잭션 경계를 명확히 관리합니다.** 여러 Repository 작업이 동일한 트랜잭션에 참여해야 하는 경우 Infrastructure에서 올바른 트랜잭션 컨텍스트를 제공하도록 설계합니다.

9. **아키텍처 의존성 규칙을 검증합니다.** ESLint 및 의존성 분석 도구를 활용하여 내부 계층이 외부 구현을 직접 참조하지 않도록 관리합니다.

10. **프로젝트의 복잡도에 맞게 적용합니다.** 모든 기능에 동일한 수준의 추상화를 강제하기보다 중요한 비즈니스 규칙과 변경 가능성이 높은 경계부터 적용하는 것이 좋습니다.

---

## 19. 정리

Clean Architecture는 핵심 비즈니스 규칙을 외부 기술의 구현 세부사항으로부터 분리하기 위한 아키텍처 패턴입니다.

가장 중요한 원칙은 Dependency Rule입니다.

**소스 코드의 의존성은 외부 계층에서 내부 계층을 향해야 하며, 핵심 비즈니스 규칙은 외부 기술 구현을 알 필요가 없어야 합니다.**

NestJS에서는 다음과 같은 구성 요소를 활용할 수 있습니다.

| Clean Architecture 요소 | NestJS 적용 예시 |
|---|---|
| Domain | 순수 TypeScript Entity, Value Object |
| Application | Use Case 클래스 |
| Input Adapter | Controller, Resolver, Message Handler |
| Output Port | Repository Interface |
| Output Adapter | TypeORM, Prisma 및 외부 API Adapter |
| Composition Root | NestJS Module과 Custom Provider |
| Dependency Injection | Injection Token, useFactory, useClass |

Clean Architecture는 Layered Architecture와 마찬가지로 책임을 분리하지만, 계층 간 의존성 방향을 더욱 엄격하게 관리합니다.

또한 Modular Monolith와 함께 적용하여 기능별 모듈 내부의 비즈니스 규칙을 보호할 수 있습니다.

다만 Clean Architecture가 모든 프로젝트에서 최선의 선택은 아닙니다.

단순한 애플리케이션에서는 추가 계층과 추상화가 불필요한 복잡도를 만들 수 있으므로 비즈니스 규칙의 복잡도, 외부 기술 변경 가능성, 테스트 요구사항 및 유지보수 비용을 고려하여 적용 범위를 결정해야 합니다.

---

## 20. 관련 문서

- `../01-fundamentals/modules.md` — NestJS Module 구성
- `../01-fundamentals/providers.md` — Provider와 DI 시스템
- `../01-fundamentals/dependency-injection.md` — Dependency Injection
- `../01-fundamentals/custom-providers.md` — Injection Token과 Custom Provider
- `../03-techniques/database.md` — 데이터베이스 통합 및 ORM
- `../03-techniques/cqrs.md` — NestJS CQRS 기능
- `../06-testing/unit-testing.md` — 단위 테스트
- `../06-testing/integration-testing.md` — 통합 테스트
- `./layered-architecture.md` — Layered Architecture
- `./modular-monolith.md` — Modular Monolith
- `./cqrs-pattern.md` — CQRS Pattern
- `./dependency-management.md` — 의존성 관리와 아키텍처 경계

---

## 21. 참고 자료

### NestJS 공식 문서

- [NestJS Documentation](https://docs.nestjs.com/) — NestJS 공식 문서
- [NestJS Modules](https://docs.nestjs.com/modules) — Module 구성과 Provider 공개 범위
- [NestJS Providers](https://docs.nestjs.com/providers) — Provider와 Dependency Injection
- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers) — Custom Provider 및 Injection Token
- [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref) — ModuleRef를 통한 Provider 접근
- [NestJS Controllers](https://docs.nestjs.com/controllers) — HTTP Controller 구성
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters) — HTTP 예외 처리 및 Exception Filter
- [NestJS TypeORM](https://docs.nestjs.com/data/typeorm) — TypeORM과 Repository 통합
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing) — 단위 테스트 및 E2E 테스트
- [NestJS CQRS](https://docs.nestjs.com/recipes/cqrs) — CQRS 패턴 구현

### Clean Architecture 및 소프트웨어 설계

- [Robert C. Martin — The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — Clean Architecture의 핵심 개념과 설계 원칙
- [Robert C. Martin — The Clean Architecture Dependency Rule](https://www.informit.com/articles/article.aspx?p=2832399) — Dependency Rule과 계층 간 의존성
- [Martin Fowler — Presentation Domain Data Layering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html) — 계층형 아키텍처와 관심사 분리
- [Martin Fowler — Repository](https://martinfowler.com/eaaCatalog/repository.html) — Repository 패턴
- [Martin Fowler — Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html) — Domain Model의 역할과 Anemic Domain Model
- [Alistair Cockburn — Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) — Ports and Adapters 아키텍처
- [Microsoft — Common Web Application Architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) — 웹 애플리케이션의 계층 및 Clean Architecture

### 데이터베이스 및 의존성 관리

- [TypeORM Documentation](https://typeorm.io/) — TypeORM 공식 문서
- [TypeORM Transactions](https://typeorm.io/docs/advanced-topics/transactions/) — 트랜잭션 처리
- [ESLint — no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) — 계층 간 Import 제한
- [Dependency Cruiser](https://github.com/sverweij/dependency-cruiser) — TypeScript 프로젝트의 의존성 분석
- [Nx — Enforce Module Boundaries](https://nx.dev/features/enforce-module-boundaries) — 모듈 경계 검사