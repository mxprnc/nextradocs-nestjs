# Modular Monolith

## 1. 개요

Modular Monolith(모듈형 모놀리스)는 하나의 애플리케이션을 단일 프로세스 또는 배포 단위로 운영하면서, 내부 기능을 명확한 책임과 경계를 가진 여러 모듈로 분리하는 소프트웨어 아키텍처 패턴입니다.

일반적인 Monolithic Architecture는 애플리케이션의 여러 기능을 하나의 실행 및 배포 단위로 구성합니다. 이러한 방식은 개발과 배포가 비교적 단순하지만, 기능 간 의존성이 복잡해지면 유지보수가 어려워질 수 있습니다.

Modular Monolith는 모놀리스의 운영상 장점을 유지하면서 내부 모듈의 독립성과 응집도를 높이기 위한 설계 방식입니다.

NestJS는 `@Module()` 데코레이터를 통해 관련 Controller와 Provider를 그룹화하고, 모듈 사이에서 공개할 Provider를 명시적으로 정의할 수 있습니다.

따라서 NestJS의 Module 시스템은 Modular Monolith를 구현하기 위한 기본적인 구성 요소로 활용할 수 있습니다.

일반적인 구조는 다음과 같습니다.

```text
                    Client
                      │
                      ▼
┌────────────────────────────────────────────┐
│             NestJS Application             │
│                                            │
│  ┌────────────┐  ┌────────────┐            │
│  │UsersModule │  │OrdersModule│            │
│  │            │  │            │            │
│  │ Controller │  │ Controller │            │
│  │ Service    │  │ Service    │            │
│  │ Repository │  │ Repository │            │
│  └────────────┘  └────────────┘            │
│                                            │
│             ┌──────────────┐               │
│             │PaymentsModule│               │
│             │              │               │
│             │ Controller   │               │
│             │ Service      │               │
│             │ Repository   │               │
│             └──────────────┘               │
│                                            │
└──────────────────────┬─────────────────────┘
                       │
                       ▼
                   Database
```

위 구조의 주요 특징은 다음과 같습니다.

- 하나의 NestJS 애플리케이션으로 실행하고 배포합니다.
- 사용자, 주문, 결제 등 비즈니스 기능을 기준으로 모듈을 분리합니다.
- 각 모듈은 자신이 담당하는 기능과 데이터에 대한 책임을 가집니다.
- 모듈 간 통신은 명시적으로 공개된 인터페이스를 사용합니다.
- 모듈의 내부 구현에 다른 모듈이 직접 의존하지 않도록 설계합니다.

다만 **NestJS에서 여러 Module을 정의했다고 해서 자동으로 Modular Monolith가 완성되는 것은 아닙니다.**

NestJS Module은 기본적인 Provider 가시성과 의존성 관리 기능을 제공하지만, 소스 코드의 직접 참조나 데이터베이스 접근까지 모두 차단하는 완전한 격리 장치는 아닙니다.

Modular Monolith를 구성하려면 Module 시스템과 함께 모듈 경계 및 의존성 규칙을 설계하고 관리해야 합니다.

---

## 2. Modular Monolith의 목적

Modular Monolith의 주요 목적은 하나의 애플리케이션을 유지하면서 기능별 독립성과 응집도를 확보하는 것입니다.

### 2.1. 기능별 책임 분리

애플리케이션의 기능이 증가하면 사용자 관리, 주문 처리, 결제, 알림 등의 로직이 서로 영향을 주게 됩니다.

이러한 기능을 명확한 경계 없이 구현하면 특정 기능을 수정할 때 관련 없는 코드까지 변경해야 하는 상황이 발생할 수 있습니다.

Modular Monolith에서는 비즈니스 기능별로 모듈을 구성합니다.

| 모듈 | 주요 책임 |
|---|---|
| UsersModule | 사용자 등록, 조회 및 계정 관리 |
| OrdersModule | 주문 생성, 조회 및 상태 관리 |
| PaymentsModule | 결제 요청 및 결제 상태 관리 |
| NotificationsModule | 이메일, 알림 및 메시지 발송 |

각 모듈은 자신이 담당하는 기능을 내부적으로 처리합니다.

### 2.2. 높은 응집도와 낮은 결합도

Modular Monolith에서는 High Cohesion(높은 응집도)과 Low Coupling(낮은 결합도)을 중요한 설계 목표로 사용합니다.

**High Cohesion**은 서로 밀접하게 관련된 기능을 동일한 모듈에 배치하는 것을 의미합니다.

예를 들어 주문 생성, 주문 상태 변경, 주문 취소는 주문 도메인과 밀접하게 관련되어 있으므로 `OrdersModule`에 배치할 수 있습니다.

**Low Coupling**은 모듈이 다른 모듈의 내부 구현에 의존하지 않도록 만드는 것을 의미합니다.

예를 들어 `OrdersModule`이 사용자 정보를 확인해야 한다면 `UsersRepository`에 직접 접근하기보다 `UsersModule`에서 공개한 인터페이스를 사용하는 것이 좋습니다.

### 2.3. 배포 복잡도 감소

Microservices Architecture에서는 여러 서비스가 독립적으로 실행되고 배포됩니다.

따라서 서비스 디스커버리, 네트워크 통신, 분산 추적, 장애 대응 및 데이터 일관성 관리 등의 추가적인 운영 요소가 필요할 수 있습니다.

반면 Modular Monolith는 일반적으로 하나의 애플리케이션으로 실행됩니다.

따라서 다음과 같은 특징이 있습니다.

- 단일 애플리케이션 빌드 및 배포
- 프로세스 내부 함수 호출을 통한 통신
- 상대적으로 단순한 로컬 개발 환경
- 애플리케이션 수준의 통합 테스트 용이
- 분산 시스템에서 발생하는 네트워크 통신 복잡도 감소

단, 모듈별 독립 배포와 독립적인 자원 확장은 기본적으로 제공되지 않습니다.

### 2.4. 아키텍처 변경에 대한 유연성

Modular Monolith는 향후 특정 기능을 별도 서비스로 분리하기 위한 기반이 될 수 있습니다.

모듈 간 의존성이 명확하고 각 모듈이 자신의 데이터를 관리한다면, 일부 기능을 별도 서비스로 이전할 때 변경해야 하는 범위를 줄일 수 있습니다.

그러나 Modular Monolith에서 Microservices로의 전환이 자동으로 이루어지는 것은 아닙니다.

네트워크 통신, 분산 트랜잭션, 데이터 동기화 및 장애 복구와 같은 추가적인 설계가 필요합니다.

---

## 3. Monolith, Modular Monolith, Microservices 비교

### 3.1. Traditional Monolith

Traditional Monolith는 여러 기능을 하나의 애플리케이션에 구성하는 방식입니다.

```text
┌────────────────────────────────┐
│       Monolithic Application   │
│                                │
│  User Logic                    │
│  Order Logic                   │
│  Payment Logic                 │
│  Notification Logic            │
│                                │
│  Shared Services               │
│  Shared Repositories           │
│                                │
└────────────────────────────────┘
                │
                ▼
             Database
```

모놀리스라는 사실 자체가 내부 구조의 무질서를 의미하지는 않습니다.

다만 기능 간 경계가 제대로 관리되지 않으면 클래스와 데이터베이스 접근이 복잡하게 결합될 수 있습니다.

### 3.2. Modular Monolith

Modular Monolith는 하나의 애플리케이션 내부에 기능별 모듈 경계를 정의합니다.

```text
┌──────────────────────────────────────┐
│           Single Application         │
│                                      │
│   ┌──────────┐   ┌──────────┐        │
│   │  Users   │   │  Orders  │        │
│   │  Module  │   │  Module  │        │
│   └──────────┘   └──────────┘        │
│                                      │
│   ┌──────────┐   ┌──────────┐        │
│   │ Payments │   │Notifications│     │
│   │  Module  │   │   Module    │     │
│   └──────────┘   └──────────┘        │
│                                      │
└──────────────────────────────────────┘
                  │
                  ▼
               Database
```

각 모듈은 명시적인 인터페이스를 통해 필요한 기능을 사용합니다.

내부 데이터 구조와 구현 세부사항은 가능한 한 외부에 공개하지 않습니다.

### 3.3. Microservices

Microservices는 기능을 여러 개의 독립적인 서비스로 분리합니다.

```text
                API Gateway
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
  Users Service  Orders Service  Payments Service
       │             │             │
       ▼             ▼             ▼
   Users DB      Orders DB     Payments DB
```

각 서비스는 별도 프로세스로 실행되며, 독립적으로 배포하고 확장할 수 있도록 설계합니다.

서비스 간 통신에는 HTTP, gRPC, Message Broker 등 네트워크 기반 통신 방식을 사용할 수 있습니다.

### 3.4. 아키텍처 비교

| 구분 | Traditional Monolith | Modular Monolith | Microservices |
|---|---|---|---|
| 실행 단위 | 단일 애플리케이션 | 단일 애플리케이션 | 여러 독립 서비스 |
| 배포 단위 | 일반적으로 하나 | 일반적으로 하나 | 서비스별 독립 배포 |
| 내부 모듈 경계 | 설계에 따라 다름 | 명확한 경계 강조 | 서비스 경계로 분리 |
| 통신 방식 | 프로세스 내부 호출 | 통제된 내부 호출 및 이벤트 | 네트워크 통신 |
| 데이터베이스 | 공유 가능 | 공유 가능하나 소유권 분리 권장 | 서비스별 소유권 권장 |
| 독립 확장 | 제한적 | 제한적 | 서비스별 확장 가능 |
| 운영 복잡도 | 상대적으로 낮음 | 상대적으로 낮음 | 상대적으로 높음 |
| 테스트 | 통합 테스트 용이 | 모듈별 및 통합 테스트 용이 | 계약 및 분산 통합 테스트 필요 |

Modular Monolith는 내부 모듈 경계를 명확히 유지하면서도 분산 시스템의 운영 복잡도를 피하고 싶은 경우에 적합합니다.

---

## 4. NestJS Module과 Modular Monolith

NestJS의 Module은 관련 Controller와 Provider를 하나의 구성 단위로 그룹화합니다.

일반적인 Module의 구성은 다음과 같습니다.

```typescript
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class UsersModule {}
```

각 메타데이터의 역할은 다음과 같습니다.

| 속성 | 역할 |
|---|---|
| `imports` | 다른 Module이 공개한 Provider를 사용하기 위해 Module을 가져옵니다. |
| `controllers` | 현재 Module의 Controller를 등록합니다. |
| `providers` | 현재 Module의 Provider를 등록합니다. |
| `exports` | 다른 Module에서 사용할 수 있도록 Provider를 공개합니다. |

### 4.1. Module은 기본적으로 Provider를 캡슐화합니다

NestJS에서 Module에 등록한 일반적인 Provider는 다른 Module에서 자동으로 주입할 수 없습니다.

예를 들어 다음과 같은 Module을 정의했다고 가정합니다.

```typescript
@Module({
  providers: [
    UsersService,
    UsersRepository,
  ],
})
export class UsersModule {}
```

이 경우 `UsersService`와 `UsersRepository`는 기본적으로 `UsersModule`의 Provider로 관리됩니다.

다른 Module에서 `UsersService`를 주입받으려면 해당 Provider를 공개해야 합니다.

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

이제 다른 Module은 `UsersModule`을 `imports`에 등록하여 `UsersService`를 주입받을 수 있습니다.

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

이 구조에서는 `UsersService`를 공개하지만 `UsersRepository`는 공개하지 않습니다.

따라서 다른 Module은 `UsersModule`의 공개 계약을 통해 기능을 사용하도록 구성할 수 있습니다.

단, NestJS의 `exports`는 DI 관점의 Provider 공개 범위를 제어합니다.

TypeScript 소스 코드의 직접 `import`나 데이터베이스 테이블 접근까지 차단하는 보안 또는 격리 기능은 아닙니다.

### 4.2. 모듈 경계와 Provider 공개 범위

Modular Monolith에서는 외부에 공개하는 Provider의 수를 최소화하는 것이 좋습니다.

예를 들어 다음과 같은 구조를 권장할 수 있습니다.

```text
UsersModule
│
├── Public API
│   └── UsersService
│
└── Internal Components
    ├── UsersRepository
    ├── UserEntity
    └── Internal Validators
```

`OrdersModule`은 사용자 기능이 필요할 때 공개된 `UsersService` 또는 별도의 공개 Facade를 호출합니다.

반면 `UsersRepository`나 사용자 데이터베이스 테이블에 직접 접근하지 않도록 설계합니다.

### 4.3. Global Module 사용 시 주의사항

NestJS에서는 `@Global()`을 사용하여 전역 Module을 정의할 수 있습니다.

```typescript
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [
    CommonService,
  ],
  exports: [
    CommonService,
  ],
})
export class CommonModule {}
```

Global Module에서 공개한 Provider는 해당 Module을 매번 가져오지 않아도 다른 Module에서 주입받을 수 있습니다. 단, Global Module 자체는 애플리케이션에 등록되어 있어야 합니다.

이 방식은 설정이나 공통 인프라 기능처럼 널리 사용되는 Provider에 유용할 수 있습니다.

그러나 비즈니스 기능을 무분별하게 Global Module로 구성하면 모듈 간 의존성이 명시적으로 드러나지 않을 수 있습니다.

따라서 Modular Monolith에서는 기능별 Module의 명시적인 `imports`와 `exports`를 우선적으로 사용하는 것이 좋습니다.

---

## 5. 모듈 경계 설계

Modular Monolith에서 가장 중요한 요소는 Module을 얼마나 많이 생성했는지가 아니라 각 모듈의 책임과 경계를 어떻게 정의했는지입니다.

### 5.1. 기술 계층 중심 분리

다음은 기술적 역할을 기준으로 디렉터리를 분리한 구조입니다.

```text
src/
├── controllers/
│   ├── users.controller.ts
│   └── orders.controller.ts
│
├── services/
│   ├── users.service.ts
│   └── orders.service.ts
│
├── repositories/
│   ├── users.repository.ts
│   └── orders.repository.ts
│
└── entities/
    ├── user.entity.ts
    └── order.entity.ts
```

이 구조는 Layered Architecture의 책임 분리를 표현하기에는 적합할 수 있습니다.

그러나 기능을 변경할 때 여러 디렉터리를 탐색해야 하며, 기능별 경계가 명확하게 드러나지 않습니다.

### 5.2. 기능 중심 분리

Modular Monolith에서는 일반적으로 비즈니스 기능을 기준으로 디렉터리를 구성합니다.

```text
src/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.repository.ts
│   ├── entities/
│   └── dto/
│
├── orders/
│   ├── orders.module.ts
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.repository.ts
│   ├── entities/
│   └── dto/
│
└── app.module.ts
```

각 디렉터리는 하나의 비즈니스 기능을 중심으로 구성됩니다.

해당 기능의 Controller, Service, Repository 및 Entity가 같은 모듈 내부에 위치하므로 변경 범위를 파악하기 쉽습니다.

이러한 방식은 Feature-based Structure라고 부를 수 있습니다.

다만 기능별 디렉터리 구조 자체가 모듈 간 의존성 규칙을 보장하는 것은 아닙니다.

### 5.3. Bounded Context 기반 분리

도메인이 복잡한 애플리케이션에서는 Domain-Driven Design(DDD)의 Bounded Context 개념을 활용하여 모듈 경계를 설계할 수 있습니다.

Bounded Context는 특정 도메인 모델과 용어가 일관된 의미를 갖는 경계를 의미합니다.

예를 들어 전자상거래 시스템에서는 다음과 같이 구분할 수 있습니다.

| Bounded Context | 주요 책임 |
|---|---|
| Identity | 사용자 식별 및 계정 관리 |
| Catalog | 상품 정보 관리 |
| Ordering | 주문 생성 및 주문 상태 관리 |
| Billing | 결제 및 청구 처리 |
| Fulfillment | 출고 및 배송 처리 |

각 Bounded Context를 하나 이상의 NestJS Module로 구현할 수 있습니다.

중요한 점은 Bounded Context와 NestJS Module이 반드시 일대일로 대응하는 것은 아니라는 사실입니다.

하나의 Bounded Context에 여러 NestJS Module이 포함될 수도 있습니다.

---

## 6. Modular Monolith 구현 예제

이번 예제에서는 사용자 모듈과 주문 모듈을 구성하고, 주문 생성 과정에서 사용자 정보를 확인하는 기능을 구현합니다.

예제의 목표는 다음과 같습니다.

- 사용자와 주문 기능을 서로 다른 Module로 분리합니다.
- 사용자 데이터 접근 로직을 `UsersModule` 내부에 유지합니다.
- 주문 모듈은 사용자 모듈의 공개 인터페이스만 사용합니다.
- NestJS DI를 이용하여 모듈 간 의존성을 연결합니다.

설명을 간결하게 유지하기 위해 데이터베이스 대신 메모리 기반 Repository를 사용합니다.

운영 환경에서는 Repository를 TypeORM이나 Prisma 등의 실제 영속성 구현으로 교체할 수 있습니다.

### 6.1. 프로젝트 구조

```text
src/
├── app.module.ts
│
├── users/
│   ├── dto/
│   │   └── user.dto.ts
│   ├── users.module.ts
│   ├── users.service.ts
│   └── users.repository.ts
│
└── orders/
    ├── dto/
    │   └── create-order.dto.ts
    ├── orders.module.ts
    ├── orders.controller.ts
    ├── orders.service.ts
    └── orders.repository.ts
```

### 6.2. 사용자 Repository 구현

`users/users.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  name: string;
}

@Injectable()
export class UsersRepository {
  private readonly users: User[] = [
    {
      id: 1,
      name: 'Alice',
    },
    {
      id: 2,
      name: 'Bob',
    },
  ];

  async findById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }
}
```

`UsersRepository`는 사용자 데이터에 대한 접근을 담당합니다.

실제 애플리케이션에서는 데이터베이스를 사용하겠지만, 이 예제에서는 모듈 경계에 집중하기 위해 메모리 배열을 사용합니다.

### 6.3. 사용자 공개 DTO 정의

`users/dto/user.dto.ts`

```typescript
export interface UserDto {
  id: number;
  name: string;
}
```

`UserDto`는 다른 모듈에 전달할 사용자 정보의 구조를 정의합니다.

실제 프로젝트에서는 내부 Entity와 공개 DTO를 분리하여 데이터베이스 구현이 외부로 노출되지 않도록 구성할 수 있습니다.

### 6.4. 사용자 Service 구현

`users/users.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersRepository } from './users.repository';
import { UserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  async findById(id: number): Promise<UserDto> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    return {
      id: user.id,
      name: user.name,
    };
  }
}
```

`UsersService`는 사용자 조회 기능을 외부에 제공하는 역할을 수행합니다.

현재 예제에서 Service는 HTTP 예외 클래스를 사용하지만, HTTP와 무관한 모듈 간 계약이 필요한 경우에는 도메인 예외를 정의하고 외부 계층에서 변환하는 방식을 고려할 수 있습니다.

### 6.5. UsersModule 구성

`users/users.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

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

여기서 중요한 부분은 `exports`입니다.

`UsersService`만 외부에 공개하고 `UsersRepository`는 공개하지 않습니다.

따라서 다른 Module은 `UsersModule`을 가져와 `UsersService`를 사용할 수 있지만, `UsersRepository`를 해당 Module의 공개 Provider로 주입받을 수는 없습니다.

이 방식은 사용자 데이터 접근 로직을 사용자 모듈 내부에 유지하는 데 도움이 됩니다.

### 6.6. 주문 생성 DTO 정의

`orders/dto/create-order.dto.ts`

```typescript
export class CreateOrderDto {
  userId: number;
  productId: number;
  quantity: number;
}
```

이 클래스는 요청 데이터를 표현합니다.

실제 HTTP 요청에 대한 런타임 유효성 검증이 필요한 경우 `class-validator`, `class-transformer` 및 `ValidationPipe` 등을 함께 사용할 수 있습니다.

현재 예제는 모듈 설계를 설명하기 위한 코드이므로 DTO 검증 구현은 생략합니다.

### 6.7. 주문 Repository 구현

`orders/orders.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';

export interface Order {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
}

@Injectable()
export class OrdersRepository {
  private readonly orders: Order[] = [];

  async save(
    order: Omit<Order, 'id'>,
  ): Promise<Order> {
    const savedOrder: Order = {
      id: this.orders.length + 1,
      ...order,
    };

    this.orders.push(savedOrder);

    return savedOrder;
  }
}
```

이 Repository는 주문 데이터 저장을 담당합니다.

메모리 기반 구현이므로 애플리케이션 재시작 시 데이터가 사라지며, 동시성이나 영속성을 보장하지 않습니다.

### 6.8. 주문 Service 구현

`orders/orders.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

import { UsersService } from '../users/users.service';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async create(dto: CreateOrderDto) {
    await this.usersService.findById(dto.userId);

    return this.ordersRepository.save({
      userId: dto.userId,
      productId: dto.productId,
      quantity: dto.quantity,
    });
  }
}
```

`OrdersService`는 주문 생성 시 사용자가 존재하는지 확인합니다.

이때 `UsersRepository`에 직접 접근하지 않고 `UsersService`를 사용합니다.

따라서 사용자 데이터의 조회 방식이 변경되어도 `UsersService`의 공개 계약이 유지된다면 주문 모듈의 변경을 줄일 수 있습니다.

다만 이 예제에서는 `OrdersService`가 `UsersService`라는 구체적인 클래스에 의존합니다.

더 엄격한 모듈 독립성이 필요한 경우 공개 인터페이스와 Injection Token을 사용하는 방식으로 확장할 수 있습니다.

### 6.9. 주문 Controller 구현

`orders/orders.controller.ts`

```typescript
import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }
}
```

Controller는 HTTP 요청을 수신하고 주문 생성 처리를 Service에 위임합니다.

### 6.10. OrdersModule 구성

`orders/orders.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';

@Module({
  imports: [
    UsersModule,
  ],
  controllers: [
    OrdersController,
  ],
  providers: [
    OrdersService,
    OrdersRepository,
  ],
})
export class OrdersModule {}
```

`OrdersModule`은 `UsersModule`을 가져옵니다.

따라서 `UsersModule`에서 공개한 `UsersService`를 `OrdersService`에 주입할 수 있습니다.

이 구조의 의존성은 다음과 같습니다.

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

### 6.11. Root Module 구성

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    UsersModule,
    OrdersModule,
  ],
})
export class AppModule {}
```

`AppModule`은 애플리케이션의 Root Module입니다.

NestJS는 Root Module을 시작점으로 Module과 Provider의 의존성 관계를 구성합니다.

### 6.12. 요청 처리 과정

클라이언트가 다음과 같은 요청을 전송한다고 가정합니다.

```http
POST /orders
Content-Type: application/json

{
  "userId": 1,
  "productId": 100,
  "quantity": 2
}
```

요청 처리 과정은 다음과 같습니다.

```text
HTTP POST /orders
        │
        ▼
OrdersController
        │
        ▼
OrdersService
        │
        ├────────────────────────────┐
        │                            │
        ▼                            ▼
UsersService                  OrdersRepository
        │                            │
        ▼                            ▼
UsersRepository               Save Order
        │                            │
        ▼                            │
Check User                    │
        │                            │
        └────────────────────────────┘
                     │
                     ▼
                HTTP Response
```

실제 실행 순서는 먼저 사용자 존재 여부를 확인한 후, 사용자가 존재하면 주문을 저장합니다.

사용자 조회가 실패하면 주문은 저장되지 않습니다.

처리가 정상적으로 완료되면 다음과 같은 응답이 반환될 수 있습니다.

```json
{
  "id": 1,
  "userId": 1,
  "productId": 100,
  "quantity": 2
}
```

이 예제에서 사용자 모듈과 주문 모듈은 동일한 NestJS 애플리케이션 안에서 실행되지만, 서로의 내부 Repository를 직접 호출하지 않는 구조를 갖습니다.

---

## 7. 모듈 간 통신 방식

Modular Monolith에서는 모듈 간 통신 방식을 명확하게 정의해야 합니다.

대표적인 방식은 직접 호출과 이벤트 기반 통신입니다.

### 7.1. 직접 호출 방식

직접 호출은 다른 모듈에서 공개한 Provider를 주입받아 메서드를 호출하는 방식입니다.

```text
OrdersModule
     │
     │ synchronous dependency
     ▼
UsersModule
```

예를 들어 주문 생성 시 사용자 존재 여부를 확인하는 작업은 직접 호출 방식이 적합할 수 있습니다.

주요 특징은 다음과 같습니다.

- 메서드 호출 결과를 직접 전달받을 수 있습니다.
- 구현과 디버깅이 비교적 단순합니다.
- 호출 관계가 코드에 명확하게 드러납니다.
- 호출 대상 모듈에 대한 의존성이 발생합니다.

여기서 동기적 의존성이란 작업의 결과를 기다리는 호출 관계를 의미합니다.

메서드가 `Promise`를 반환하더라도 응답 결과가 필요한 호출이라는 점은 같습니다.

### 7.2. 이벤트 기반 통신

이벤트 기반 통신은 특정 모듈에서 발생한 사건을 이벤트로 발행하고 다른 모듈이 이를 구독하는 방식입니다.

예를 들어 주문이 생성되었을 때 다음과 같은 처리가 필요할 수 있습니다.

- 주문 완료 이메일 발송
- 주문 생성 로그 기록
- 통계 데이터 갱신

이러한 기능을 모두 `OrdersService`에서 직접 호출하면 주문 모듈이 여러 모듈에 의존하게 됩니다.

이벤트를 활용하면 다음과 같이 구성할 수 있습니다.

```text
                OrdersModule
                     │
                     │ OrderCreatedEvent
                     ▼
                EventEmitter
                     │
           ┌─────────┴─────────┐
           │                   │
           ▼                   ▼
    NotificationsModule   AnalyticsModule
```

NestJS에서는 `@nestjs/event-emitter` 패키지를 이용하여 애플리케이션 내부 이벤트 기반 통신을 구현할 수 있습니다.

먼저 패키지를 설치합니다.

```bash
npm install @nestjs/event-emitter
```

Root Module에 EventEmitter를 등록합니다.

```typescript
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { OrdersModule } from './orders/orders.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    OrdersModule,
    NotificationsModule,
  ],
})
export class AppModule {}
```

주문 생성 이벤트를 정의합니다.

`orders/events/order-created.event.ts`

```typescript
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: number,
    public readonly userId: number,
  ) {}
}
```

주문 Service에서 이벤트를 발행합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OrdersService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  publishOrderCreated(
    orderId: number,
    userId: number,
  ) {
    this.eventEmitter.emit(
      'order.created',
      new OrderCreatedEvent(orderId, userId),
    );
  }
}
```

다른 모듈에서는 이벤트를 구독할 수 있습니다.

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationsListener {
  @OnEvent('order.created')
  handleOrderCreated(event: OrderCreatedEvent) {
    console.log(
      `Order ${event.orderId} created`,
    );
  }
}
```

실제 구현에서는 이벤트 클래스와 `NotificationsListener`를 적절한 파일에 배치하고, Listener를 소속 Module의 `providers`에 등록해야 합니다.

이벤트를 발행하는 코드도 주문 저장이 성공한 후 실행되도록 구성해야 합니다.

### 7.3. 이벤트 기반 통신의 주의사항

`@nestjs/event-emitter`는 기본적으로 애플리케이션 프로세스 내부에서 동작하는 이벤트 시스템입니다.

따라서 다음 사항을 고려해야 합니다.

- 이벤트가 외부 저장소에 영속적으로 저장되는 것은 아닙니다.
- 프로세스가 종료되면 처리되지 않은 이벤트를 복구할 수 있다고 보장하지 않습니다.
- 기본 이벤트 발행만으로 트랜잭션과 이벤트 처리가 원자적으로 묶이지 않습니다.
- 다중 Replica 환경에서 다른 프로세스에 자동으로 이벤트가 전달되는 것은 아닙니다.
- 이벤트 Listener의 실행 결과와 오류 처리 방식은 사용하는 API 및 설정에 따라 달라질 수 있습니다.

여러 프로세스 사이의 안정적인 이벤트 전달이 필요하다면 Message Broker 또는 Transactional Outbox Pattern 등을 검토할 수 있습니다.

따라서 이벤트 기반 통신을 도입할 때는 애플리케이션 내부 이벤트와 분산 메시징 시스템을 구분해야 합니다.

---

## 8. 데이터 소유권과 데이터베이스 설계

Modular Monolith에서는 여러 모듈이 동일한 데이터베이스를 사용할 수 있습니다.

그러나 데이터베이스를 공유한다고 해서 모든 모듈이 모든 테이블에 자유롭게 접근하도록 설계하는 것은 바람직하지 않습니다.

### 8.1. Shared Database와 Module Ownership

예를 들어 다음과 같이 테이블의 소유권을 정의할 수 있습니다.

```text
┌─────────────────────────────────────────┐
│               Application               │
│                                         │
│   UsersModule          OrdersModule     │
│        │                    │           │
└────────┼────────────────────┼───────────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────┐
│               Database                  │
│                                         │
│     users                 orders        │
│   (UsersModule)         (OrdersModule)  │
│                                         │
└─────────────────────────────────────────┘
```

주요 원칙은 다음과 같습니다.

- `UsersModule`은 사용자 데이터를 관리합니다.
- `OrdersModule`은 주문 데이터를 관리합니다.
- 주문 모듈은 사용자 테이블을 직접 수정하지 않습니다.
- 사용자 정보가 필요하면 사용자 모듈의 공개 기능을 이용합니다.
- 데이터 소유권과 변경 책임을 명확히 정의합니다.

데이터 소유권은 반드시 별도 데이터베이스 서버를 사용해야 한다는 의미는 아닙니다.

같은 데이터베이스 안에서도 테이블이나 스키마 단위로 소유권을 구분할 수 있습니다.

### 8.2. 직접 테이블 접근의 문제

다음과 같은 구조는 모듈 간 결합도를 높일 수 있습니다.

```text
OrdersService
     │
     ▼
UsersRepository
     │
     ▼
users table
```

이 경우 사용자 데이터 구조가 변경되면 주문 모듈에도 영향을 줄 수 있습니다.

더 엄격한 모듈 경계가 필요하다면 다음과 같이 공개 API를 통해 접근하도록 구성합니다.

```text
OrdersService
     │
     ▼
UsersService
     │
     ▼
UsersRepository
     │
     ▼
users table
```

이 방식은 사용자 데이터 접근 책임을 `UsersModule` 내부에 유지합니다.

### 8.3. 트랜잭션 경계

Modular Monolith는 하나의 애플리케이션으로 실행되므로 동일한 데이터베이스를 사용하는 여러 모듈이 하나의 데이터베이스 트랜잭션에 참여하도록 설계할 수 있습니다.

예를 들어 주문 생성과 재고 차감이 반드시 함께 성공해야 하는 경우가 있습니다.

```text
Create Order
     │
     ▼
Check Inventory
     │
     ▼
Save Order
     │
     ▼
Decrease Stock
     │
     ▼
Commit Transaction
```

그러나 단순히 여러 Service를 순서대로 호출한다고 해서 하나의 트랜잭션이 자동으로 구성되는 것은 아닙니다.

TypeORM에서는 `DataSource.transaction()`이나 `QueryRunner` 등을 이용하여 명시적으로 트랜잭션을 관리할 수 있습니다.

트랜잭션 내부에서 실행되는 데이터베이스 작업은 동일한 트랜잭션 컨텍스트를 사용해야 합니다.

다음 사항도 고려해야 합니다.

- 여러 모듈이 공유하는 트랜잭션이 모듈 경계를 약화시키지 않는지 검토합니다.
- 긴 트랜잭션은 잠금 경합과 성능 문제를 일으킬 수 있습니다.
- 외부 API 호출을 데이터베이스 트랜잭션 안에 포함하는 것은 신중하게 판단해야 합니다.
- 향후 Microservices 분리가 필요한 경우 모듈 간 트랜잭션 의존성이 이전을 어렵게 만들 수 있습니다.

따라서 트랜잭션의 원자성과 모듈 간 독립성 사이의 균형이 필요합니다.

---

## 9. 모듈 간 의존성 관리

Modular Monolith에서는 Module의 의존성 구조를 명확하게 유지해야 합니다.

### 9.1. 단방향 의존성

가능하면 다음과 같이 단방향 의존성을 유지하는 것이 좋습니다.

```text
OrdersModule
     │
     ▼
UsersModule
```

`OrdersModule`이 `UsersModule`에 의존하더라도 `UsersModule`은 `OrdersModule`을 참조하지 않도록 구성할 수 있습니다.

이러한 구조는 모듈 간 결합도를 줄이고 변경 영향을 제한하는 데 도움이 됩니다.

### 9.2. 순환 의존성 문제

다음과 같은 구조에서는 순환 의존성이 발생합니다.

```text
UsersModule
     │
     ▼
OrdersModule
     │
     ▼
UsersModule
```

NestJS는 일부 순환 의존성을 해결하기 위해 `forwardRef()`를 제공합니다.

그러나 `forwardRef()`는 순환 의존성의 구조적 원인을 제거하는 기능이 아닙니다.

순환 의존성이 발생한다면 다음과 같은 설계 변경을 검토할 수 있습니다.

- 두 모듈의 책임을 다시 정의합니다.
- 공통 기능을 별도의 모듈로 분리합니다.
- 별도의 Application Service가 처리 흐름을 조정하도록 구성합니다.
- 적절한 경우 이벤트 기반 통신으로 결합도를 낮춥니다.

### 9.3. Orchestration Module 도입

여러 모듈을 조합하여 하나의 비즈니스 작업을 수행해야 하는 경우 Orchestration을 담당하는 Service를 별도로 구성할 수 있습니다.

예를 들어 주문 생성 시 사용자 확인, 결제 및 주문 저장이 필요하다고 가정합니다.

```text
             CheckoutService
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   UsersModule OrdersModule PaymentsModule
```

`CheckoutService`는 여러 모듈의 공개 API를 조합하여 전체 작업 흐름을 제어합니다.

이 방식은 특정 기능 모듈이 다른 여러 기능 모듈의 내부 구현에 과도하게 의존하는 문제를 줄일 수 있습니다.

다만 새로운 Orchestration 계층을 만들면 의존성과 트랜잭션 경계를 추가로 관리해야 하므로 실제 복잡도에 따라 도입 여부를 결정해야 합니다.

---

## 10. Public API와 Internal Implementation

Modular Monolith에서는 각 모듈의 외부 계약과 내부 구현을 구분하는 것이 중요합니다.

### 10.1. Public API

Public API는 다른 모듈이 사용할 수 있도록 의도적으로 공개한 기능입니다.

예를 들어 사용자 모듈에서는 다음과 같은 기능만 외부에 제공할 수 있습니다.

```typescript
export interface UsersReader {
  findById(id: number): Promise<UserDto>;
}
```

이 인터페이스는 다른 모듈에서 사용할 사용자 조회 기능의 계약을 정의합니다.

TypeScript의 Interface는 런타임에 존재하지 않으므로 NestJS DI에서는 별도의 Injection Token이 필요합니다.

### 10.2. Injection Token을 이용한 계약 정의

```typescript
export const USERS_READER = Symbol('USERS_READER');

export interface UsersReader {
  findById(id: number): Promise<UserDto>;
}
```

Module에서 다음과 같이 연결할 수 있습니다.

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

여기서 `useExisting`은 이미 등록된 `UsersService` Provider를 다른 Token으로 참조하도록 구성합니다.

따라서 동일한 기본 Provider 인스턴스를 활용할 수 있습니다.

다른 모듈에서는 다음과 같이 주입받습니다.

```typescript
@Injectable()
export class OrdersService {
  constructor(
    @Inject(USERS_READER)
    private readonly usersReader: UsersReader,
  ) {}
}
```

실제 파일에서는 `Inject`, `Injectable`, `Module` 등을 import해야 합니다.

이 구조를 적용하면 주문 모듈은 사용자 Service의 구체적인 클래스 대신 공개 계약에 의존합니다.

### 10.3. Public Contract 파일 분리

공개 계약을 다음과 같이 별도의 디렉터리로 관리할 수도 있습니다.

```text
users/
├── contracts/
│   ├── users-reader.interface.ts
│   ├── users-reader.token.ts
│   └── user.dto.ts
│
├── internal/
│   ├── users.service.ts
│   ├── users.repository.ts
│   └── user.entity.ts
│
└── users.module.ts
```

이 구조는 다른 모듈이 사용할 수 있는 코드와 내부 구현을 구분하는 데 도움이 됩니다.

다만 디렉터리 이름을 `internal`로 지정하는 것만으로 TypeScript 수준의 접근이 차단되는 것은 아닙니다.

실제 프로젝트에서는 ESLint의 Import 제한 규칙, 패키지 경계 검사 도구 및 아키텍처 테스트 등을 함께 사용하는 것이 좋습니다.

---

## 11. Modular Monolith의 테스트 전략

Modular Monolith에서는 모듈 단위 테스트와 애플리케이션 전체 통합 테스트를 구분할 수 있습니다.

### 11.1. 모듈 내부 단위 테스트

각 모듈의 Service와 Repository를 독립적으로 테스트합니다.

예를 들어 `OrdersService`를 테스트할 때는 `UsersService`와 `OrdersRepository`를 Mock 객체로 대체할 수 있습니다.

```typescript
import { Test } from '@nestjs/testing';

const moduleRef = await Test.createTestingModule({
  providers: [
    OrdersService,
    {
      provide: UsersService,
      useValue: {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          name: 'Alice',
        }),
      },
    },
    {
      provide: OrdersRepository,
      useValue: {
        save: jest.fn().mockImplementation(
          async (order) => ({
            id: 1,
            ...order,
          }),
        ),
      },
    },
  ],
}).compile();
```

위 예제는 구체적인 `UsersService` 클래스를 주입하는 기본 구조를 대상으로 합니다.

공개 Token을 사용하는 구조라면 테스트에서도 해당 Token을 등록해야 합니다.

### 11.2. 모듈 통합 테스트

Module 단위로 실제 Provider를 등록하여 의존성이 정상적으로 연결되는지 확인할 수 있습니다.

예를 들어 `OrdersModule`의 통합 테스트에서는 다음과 같은 항목을 검증할 수 있습니다.

- 필요한 Provider가 정상적으로 주입되는지 확인합니다.
- 다른 Module의 공개 Provider를 사용할 수 있는지 확인합니다.
- 주문 생성 흐름이 올바르게 동작하는지 확인합니다.
- 모듈 간 예외 처리 방식이 일관적인지 확인합니다.

### 11.3. E2E 테스트

E2E 테스트에서는 실제 NestJS 애플리케이션을 실행하고 HTTP 요청을 전송하여 전체 처리 과정을 검증합니다.

이때 다음과 같은 시나리오를 확인할 수 있습니다.

1. 사용자 정보를 준비합니다.
2. 주문 생성 API를 호출합니다.
3. 사용자 존재 여부 검증이 실행되는지 확인합니다.
4. 주문 데이터가 정상적으로 저장되는지 확인합니다.
5. 올바른 HTTP 응답이 반환되는지 확인합니다.

### 11.4. 아키텍처 경계 테스트

Modular Monolith에서는 비즈니스 로직의 정확성뿐 아니라 모듈 경계가 유지되는지도 검증하는 것이 좋습니다.

예를 들어 다음과 같은 규칙을 정의할 수 있습니다.

- `OrdersModule`은 `users/internal` 디렉터리를 직접 참조할 수 없습니다.
- 다른 모듈의 Repository를 직접 import하지 않습니다.
- 공개 계약은 지정된 `contracts` 디렉터리를 통해 접근합니다.
- 특정 Module이 다른 Module을 순환 참조하지 않도록 제한합니다.

이러한 규칙은 ESLint, Dependency Cruiser, Nx의 Module Boundary 규칙 등으로 검사할 수 있습니다.

단, 해당 도구는 NestJS의 기본 내장 기능이 아니며 프로젝트에 별도로 설정해야 합니다.

---

## 12. Modular Monolith의 운영 및 확장

### 12.1. 단일 배포 단위

일반적인 Modular Monolith에서는 모든 모듈이 하나의 NestJS 애플리케이션으로 빌드되고 배포됩니다.

예를 들어 Docker 컨테이너를 사용하는 경우 다음과 같이 구성할 수 있습니다.

```text
Docker Container
       │
       ▼
NestJS Application
       │
       ├── UsersModule
       ├── OrdersModule
       ├── PaymentsModule
       └── NotificationsModule
```

애플리케이션의 새로운 버전을 배포하면 일반적으로 모든 모듈이 포함된 배포 단위가 함께 교체됩니다.

### 12.2. Horizontal Scaling

Modular Monolith도 Kubernetes 등의 환경에서 수평 확장할 수 있습니다.

```text
              Load Balancer
                    │
         ┌──────────┼──────────┐
         │          │          │
         ▼          ▼          ▼
       Pod 1      Pod 2      Pod 3
         │          │          │
         ▼          ▼          ▼
       NestJS     NestJS     NestJS
         │          │          │
      All Modules All Modules All Modules
```

각 Pod에는 일반적으로 동일한 애플리케이션과 모듈이 포함됩니다.

따라서 주문 기능의 부하만 증가하더라도 전체 애플리케이션 Replica를 늘려야 할 수 있습니다.

Microservices처럼 특정 서비스만 독립적으로 확장하는 구조와는 차이가 있습니다.

### 12.3. 프로세스 내부 상태 관리

Replica가 여러 개로 증가하면 각 애플리케이션 프로세스의 메모리는 서로 공유되지 않습니다.

예를 들어 다음과 같은 데이터는 프로세스별로 독립적으로 관리됩니다.

- 메모리 기반 캐시
- 메모리 배열에 저장한 데이터
- 프로세스 내부 이벤트
- 로컬 세션 상태

여러 Replica에서 일관된 데이터 접근이 필요하다면 외부 데이터베이스, 공유 캐시 또는 메시징 시스템 등을 사용해야 할 수 있습니다.

Modular Monolith라는 아키텍처 자체가 여러 Replica 사이의 상태 동기화를 제공하는 것은 아닙니다.

---

## 13. Microservices 전환 시 고려사항

Modular Monolith는 일부 모듈을 Microservices로 분리하기 위한 출발점으로 활용할 수 있습니다.

그러나 이를 위해서는 처음부터 다음과 같은 요소를 고려하는 것이 좋습니다.

### 13.1. 모듈 경계 유지

모듈별 책임과 데이터 소유권이 명확해야 합니다.

다른 모듈의 내부 Repository나 테이블에 직접 접근하는 구조가 많을수록 분리 작업이 어려워집니다.

### 13.2. 공개 계약 안정성

모듈 간 통신에 사용하는 DTO와 Interface를 명확하게 정의합니다.

향후 네트워크 기반 통신으로 변경할 때도 비즈니스 기능의 계약을 최대한 유지할 수 있도록 설계합니다.

다만 프로세스 내부 메서드 호출을 네트워크 호출로 변경할 때는 타임아웃, 재시도, 직렬화 및 오류 처리 등의 설계가 추가로 필요합니다.

### 13.3. 데이터 소유권 분리

모듈별 데이터 변경 책임을 명확하게 정의합니다.

한 모듈이 다른 모듈의 테이블을 직접 수정하는 구조는 독립적인 서비스로 전환할 때 문제가 될 수 있습니다.

### 13.4. 트랜잭션 의존성 검토

단일 데이터베이스의 ACID 트랜잭션에 의존하는 기능을 여러 서비스로 분리하면 기존 트랜잭션 경계를 유지하기 어려울 수 있습니다.

이 경우 Saga Pattern, Transactional Outbox, 보상 트랜잭션 및 최종 일관성(Eventual Consistency) 등의 접근 방식을 검토해야 합니다.

### 13.5. 독립 확장이 필요한 기능 식별

모든 모듈을 Microservices로 분리할 필요는 없습니다.

다음과 같은 특성이 있는 기능은 독립 서비스 분리를 검토할 수 있습니다.

- 다른 기능과 부하 특성이 크게 다릅니다.
- 독립적인 배포 주기가 필요합니다.
- 장애 격리가 중요합니다.
- 별도의 기술 스택이나 실행 환경이 필요합니다.
- 독립적인 팀이 기능을 관리합니다.

반대로 이러한 요구사항이 명확하지 않다면 Modular Monolith를 유지하는 것이 더 단순하고 효율적일 수 있습니다.

---

## 14. Layered Architecture와 Modular Monolith의 관계

Layered Architecture와 Modular Monolith는 서로 다른 관점의 설계 방식입니다.

Layered Architecture는 애플리케이션 내부의 책임을 계층별로 분리합니다.

Modular Monolith는 비즈니스 기능을 기준으로 모듈 경계를 분리합니다.

두 패턴은 함께 적용할 수 있습니다.

```text
┌───────────────────────────────────────────┐
│              NestJS Application           │
│                                           │
│   ┌───────────────────────────────────┐   │
│   │             UsersModule           │   │
│   │                                   │   │
│   │  Controller                       │   │
│   │      │                            │   │
│   │      ▼                            │   │
│   │  Service                          │   │
│   │      │                            │   │
│   │      ▼                            │   │
│   │  Repository                       │   │
│   └───────────────────────────────────┘   │
│                                           │
│   ┌───────────────────────────────────┐   │
│   │            OrdersModule           │   │
│   │                                   │   │
│   │  Controller                       │   │
│   │      │                            │   │
│   │      ▼                            │   │
│   │  Service                          │   │
│   │      │                            │   │
│   │      ▼                            │   │
│   │  Repository                       │   │
│   └───────────────────────────────────┘   │
│                                           │
└───────────────────────────────────────────┘
```

각 모듈은 자신의 내부에 Controller, Service 및 Repository 계층을 가집니다.

이 구조는 기능별 경계와 계층별 책임 분리를 동시에 적용한 예제입니다.

| 구분 | Layered Architecture | Modular Monolith |
|---|---|---|
| 분리 기준 | 기술적 책임 | 비즈니스 기능 및 도메인 |
| 주요 관심사 | 계층 간 역할과 의존성 | 모듈 간 경계와 결합도 |
| 대표 구성 | Controller, Service, Repository | UsersModule, OrdersModule |
| 핵심 목표 | 관심사 분리 | 기능별 독립성과 응집도 |
| 함께 적용 가능 여부 | 가능 | 가능 |

따라서 Modular Monolith를 도입한다고 해서 Layered Architecture를 제거할 필요는 없습니다.

---

## 15. Modular Monolith 설계 시 주의사항

### 15.1. Module 생성만으로 독립성이 보장되지 않습니다

NestJS Module은 Provider의 가시성을 제어하지만 모든 종류의 의존성을 차단하지는 않습니다.

다른 모듈의 내부 클래스를 직접 import하거나 데이터베이스에 접근할 수 있으므로 별도의 아키텍처 규칙이 필요합니다.

### 15.2. Shared Module의 책임을 제한해야 합니다

공통 기능을 모두 Shared Module에 배치하면 Shared Module이 지나치게 커질 수 있습니다.

특히 비즈니스 규칙을 무분별하게 공유하면 여러 모듈이 하나의 공통 모듈에 강하게 결합됩니다.

Shared Module에는 공통 인프라 또는 범용 기능을 배치하되, 도메인별 비즈니스 규칙은 소유 모듈에서 관리하는 것이 좋습니다.

### 15.3. 모듈 간 순환 의존성을 최소화해야 합니다

순환 의존성이 증가하면 모듈 경계가 불명확해집니다.

`forwardRef()`를 사용하기 전에 책임 분리나 Orchestration 구조 변경을 우선적으로 검토해야 합니다.

### 15.4. 이벤트를 과도하게 사용하지 않아야 합니다

이벤트 기반 통신은 결합도를 낮추는 데 도움이 되지만 모든 모듈 간 호출을 이벤트로 대체할 필요는 없습니다.

즉시 결과가 필요한 기능은 직접 호출이 더 적합할 수 있습니다.

이벤트는 발생한 사실을 다른 모듈에 알리거나, 후속 처리를 독립적으로 수행해야 하는 경우에 활용하는 것이 좋습니다.

### 15.5. 트랜잭션 경계를 명확하게 관리해야 합니다

하나의 데이터베이스를 공유하더라도 여러 모듈의 데이터 변경이 자동으로 동일한 트랜잭션에 포함되는 것은 아닙니다.

트랜잭션을 공유할 때는 데이터 일관성과 모듈 독립성에 미치는 영향을 함께 검토해야 합니다.

### 15.6. 지나친 모듈 분리를 피해야 합니다

모든 클래스나 작은 기능을 독립 Module로 분리하면 Module의 수와 의존성 관계가 불필요하게 증가할 수 있습니다.

모듈은 단순한 파일 분리 단위가 아니라 의미 있는 기능과 책임의 경계를 표현해야 합니다.

---

## 16. Modular Monolith의 장점과 한계

### 16.1. 장점

| 장점 | 설명 |
|---|---|
| 기능별 책임 분리 | 각 모듈의 역할과 소유권을 명확하게 정의할 수 있습니다. |
| 유지보수성 | 변경 범위를 특정 모듈로 제한하기 쉽습니다. |
| 테스트 용이성 | 모듈 단위 테스트와 통합 테스트를 구성할 수 있습니다. |
| 단순한 배포 | 하나의 애플리케이션으로 빌드 및 배포할 수 있습니다. |
| 낮은 네트워크 복잡도 | 모듈 간 통신에 프로세스 내부 호출을 사용할 수 있습니다. |
| 점진적 확장 | 필요에 따라 일부 모듈을 별도 서비스로 분리할 수 있습니다. |

### 16.2. 한계

| 한계 | 설명 |
|---|---|
| 독립 배포 제한 | 일반적으로 특정 모듈만 별도로 배포하기 어렵습니다. |
| 독립 확장 제한 | 특정 모듈의 부하에 따라 해당 모듈만 수평 확장하기 어렵습니다. |
| 장애 영향 범위 | 프로세스 수준의 장애가 전체 애플리케이션에 영향을 줄 수 있습니다. |
| 모듈 경계 관리 비용 | 의존성 규칙을 별도로 정의하고 지속적으로 검증해야 합니다. |
| 자원 공유 | 하나의 프로세스에서 CPU와 메모리 등을 공유합니다. |
| 구조적 결합 가능성 | 경계 규칙을 지키지 않으면 모듈 간 결합도가 높아질 수 있습니다. |

Modular Monolith는 내부 구조를 체계적으로 관리하면서 운영 복잡도를 낮추는 데 유용하지만, 완전한 장애 격리와 모듈별 독립 확장이 필요한 시스템에서는 한계가 있습니다.

---

## 17. 실무 적용 권장사항

NestJS에서 Modular Monolith를 설계할 때는 다음 원칙을 고려하는 것이 좋습니다.

1. **비즈니스 기능을 기준으로 Module을 분리합니다.** 기술 계층보다 기능별 책임과 도메인 경계를 우선적으로 고려합니다.

2. **Module의 공개 API를 최소화합니다.** 다른 Module에서 필요한 Provider만 `exports`로 공개합니다.

3. **Repository와 Entity의 소유권을 명확히 정의합니다.** 다른 모듈이 내부 데이터 접근 구현을 직접 사용하는 것을 제한합니다.

4. **모듈 간 의존성을 단방향으로 유지합니다.** 순환 의존성이 발생하면 책임 구조를 재검토합니다.

5. **직접 호출과 이벤트 기반 통신을 목적에 맞게 선택합니다.** 즉시 처리 결과가 필요한 기능과 독립적인 후속 처리를 구분합니다.

6. **모듈 내부에는 Layered Architecture를 적용할 수 있습니다.** Controller, Service, Repository의 역할을 분리하여 내부 응집도를 높입니다.

7. **공개 계약과 내부 구현을 분리합니다.** 필요한 경우 Interface와 Injection Token을 이용하여 구체적인 구현에 대한 의존성을 줄입니다.

8. **트랜잭션 경계를 명확하게 정의합니다.** 데이터 일관성을 유지하면서 모듈 간 결합이 과도해지지 않도록 설계합니다.

9. **아키텍처 규칙을 자동으로 검증합니다.** ESLint 및 의존성 검사 도구 등을 활용하여 모듈 경계 위반을 방지합니다.

10. **Microservices 전환은 실제 요구사항에 따라 결정합니다.** 독립적인 배포, 확장 및 장애 격리가 필요해졌을 때 분리를 검토합니다.

---

## 18. 정리

Modular Monolith는 하나의 애플리케이션을 유지하면서 내부 기능을 명확한 경계를 가진 모듈로 분리하는 아키텍처 패턴입니다.

NestJS는 Module과 Dependency Injection 시스템을 통해 이러한 구조를 구현하기 위한 기본적인 기능을 제공합니다.

Modular Monolith의 핵심 요소는 다음과 같습니다.

| 핵심 요소 | 설명 |
|---|---|
| Module Boundary | 기능별 책임과 접근 경계를 정의합니다. |
| Encapsulation | 모듈 내부 구현을 외부에서 직접 사용하지 않도록 제한합니다. |
| Public API | 다른 모듈에 제공할 기능과 계약을 정의합니다. |
| Dependency Management | 모듈 간 의존성 방향을 명확하게 관리합니다. |
| Data Ownership | 데이터의 소유권과 변경 책임을 모듈별로 구분합니다. |
| Single Deployment Unit | 하나의 애플리케이션으로 빌드 및 배포합니다. |

Modular Monolith에서 중요한 것은 Module의 개수가 아니라 **모듈 간 경계를 얼마나 명확하게 유지하고 있는지**입니다.

NestJS의 `imports`와 `exports`는 Provider의 공개 범위를 관리하는 기능을 제공하지만, 실제 아키텍처 경계를 유지하려면 소스 코드의 의존성 규칙과 데이터 소유권까지 함께 관리해야 합니다.

기능별 Module 구성과 Layered Architecture를 조합하면 비교적 단순한 구조에서 시작하여 애플리케이션의 복잡도에 따라 점진적으로 확장할 수 있습니다.

또한 명확한 모듈 경계는 향후 특정 기능을 독립적인 Microservice로 분리할 때도 유용한 기반이 됩니다.

---

## 19. 관련 문서

다음 문서에서는 Modular Monolith와 관련된 NestJS의 핵심 개념 및 아키텍처 패턴을 확인할 수 있습니다.

- `../01-fundamentals/modules.md` — NestJS Module의 역할과 구성
- `../01-fundamentals/providers.md` — Provider와 DI 시스템
- `../01-fundamentals/dependency-injection.md` — Dependency Injection 동작 원리
- `../01-fundamentals/custom-providers.md` — Injection Token 및 Custom Provider
- `../01-fundamentals/dynamic-modules.md` — Dynamic Module 구성
- `../03-techniques/database.md` — 데이터베이스와 영속성 관리
- `../03-techniques/events.md` — 이벤트 기반 통신
- `../06-testing/integration-testing.md` — 모듈 통합 테스트
- `./layered-architecture.md` — Layered Architecture
- `./clean-architecture.md` — Clean Architecture
- `./cqrs-pattern.md` — CQRS 패턴
- `./dependency-management.md` — 의존성 관리
- `../05-platforms/microservices.md` — NestJS Microservices

---

## 20. 참고 자료

### NestJS 공식 문서

- [NestJS Documentation](https://docs.nestjs.com/) — NestJS 공식 문서
- [NestJS Modules](https://docs.nestjs.com/modules) — Module 구성, Provider 공개 범위 및 의존성 관계
- [NestJS Providers](https://docs.nestjs.com/providers) — Provider와 Dependency Injection
- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers) — Custom Provider 및 Injection Token
- [NestJS Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules) — Dynamic Module 구성
- [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref) — ModuleRef를 통한 Provider 접근
- [NestJS Circular Dependency](https://docs.nestjs.com/fundamentals/circular-dependency) — 순환 의존성 처리
- [NestJS Events](https://docs.nestjs.com/techniques/events) — 애플리케이션 내부 이벤트 시스템
- [NestJS Database](https://docs.nestjs.com/techniques/database) — 데이터베이스 통합
- [NestJS TypeORM](https://docs.nestjs.com/data/typeorm) — TypeORM과 Repository 구성
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing) — Unit Test와 E2E Test
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics) — Microservices의 기본 구성

### 소프트웨어 아키텍처 참고 자료

- [Martin Fowler — Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) — Monolith 기반 개발과 Microservices 전환에 대한 논의
- [Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html) — Microservices Architecture의 특징과 설계 원칙
- [Martin Fowler — Microservice Trade-Offs](https://martinfowler.com/articles/microservice-trade-offs.html) — Microservices의 장점과 운영 비용
- [Chris Richardson — Modular Monolith Patterns](https://microservices.io/post/architecture/2024/09/09/modular-monolith-patterns-for-fast-flow.html) — Modular Monolith의 모듈 캡슐화 및 설계 패턴
- [Martin Fowler — Bounded Context](https://martinfowler.com/bliki/BoundedContext.html) — DDD의 Bounded Context 개념
- [Microsoft — Common Web Application Architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) — Monolith 및 계층형 웹 애플리케이션 아키텍처
- [TypeORM Transactions](https://typeorm.io/docs/advanced-topics/transactions/) — 데이터베이스 트랜잭션 관리

### 아키텍처 경계 검사 도구

- [ESLint — no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) — 특정 모듈 또는 파일의 직접 Import 제한
- [Dependency Cruiser](https://github.com/sverweij/dependency-cruiser) — JavaScript 및 TypeScript 프로젝트의 의존성 분석
- [Nx — Enforce Module Boundaries](https://nx.dev/features/enforce-module-boundaries) — Nx Workspace의 모듈 경계 검사