# CQRS Pattern

## 1. 개요

CQRS(Command Query Responsibility Segregation)는 애플리케이션에서 데이터를 변경하는 작업(Command)과 데이터를 조회하는 작업(Query)의 책임을 분리하는 소프트웨어 아키텍처 패턴입니다.

일반적인 CRUD(Create, Read, Update, Delete) 애플리케이션에서는 하나의 Service와 데이터 모델을 사용하여 데이터의 생성, 조회, 수정 및 삭제를 처리하는 경우가 많습니다.

이러한 구조는 비교적 단순하고 구현하기 쉽지만, 애플리케이션의 비즈니스 규칙과 조회 요구사항이 복잡해지면 다음과 같은 문제가 발생할 수 있습니다.

- 데이터 변경과 조회 로직이 하나의 Service에 집중됩니다.
- 복잡한 조회 요구사항 때문에 도메인 모델이 불필요하게 확장됩니다.
- 읽기와 쓰기의 성능 특성이 달라도 동일한 데이터 접근 구조를 사용합니다.
- 데이터 변경에 필요한 검증 규칙과 조회에 필요한 데이터 변환 로직이 혼재합니다.
- 특정 기능의 변경이 다른 기능에 영향을 미칠 수 있습니다.

CQRS는 이러한 문제를 해결하기 위해 읽기와 쓰기의 책임을 분리합니다.

```text
                      Client
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
           Command               Query
          (Write)                (Read)
              │                   │
              ▼                   ▼
        Command Handler       Query Handler
              │                   │
              ▼                   ▼
         Write Model           Read Model
              │                   │
              └─────────┬─────────┘
                        │
                        ▼
                    Database
```

Command는 시스템의 상태를 변경하는 작업을 표현합니다.

Query는 시스템의 상태를 변경하지 않고 필요한 데이터를 반환하는 작업을 표현합니다.

NestJS에서는 `@nestjs/cqrs` 패키지를 통해 Command, Query, Event, Handler 및 Saga를 구현할 수 있습니다.

다만 CQRS는 NestJS에 종속된 개념이 아니라 다양한 언어와 프레임워크에서 적용할 수 있는 일반적인 아키텍처 패턴입니다.

또한 CQRS를 적용한다고 해서 반드시 데이터베이스를 분리하거나 Event Sourcing을 함께 도입해야 하는 것은 아닙니다.

---

## 2. CQRS의 목적

CQRS의 핵심 목적은 데이터 변경과 조회의 책임을 분리하여 각 작업의 요구사항에 맞는 모델과 처리 방식을 구성하는 것입니다.

### 2.1. Command와 Query의 책임 분리

일반적인 Service는 다음과 같은 메서드를 포함할 수 있습니다.

```typescript
@Injectable()
export class OrdersService {
  createOrder() {}
  cancelOrder() {}
  updateOrder() {}

  getOrder() {}
  getOrders() {}
  getOrderStatistics() {}
}
```

이 구조에서는 데이터 변경과 조회가 하나의 클래스에 존재합니다.

CQRS를 적용하면 다음과 같이 책임을 분리할 수 있습니다.

```text
Orders
│
├── Commands
│   ├── CreateOrderCommand
│   ├── CancelOrderCommand
│   └── UpdateOrderCommand
│
└── Queries
    ├── GetOrderQuery
    ├── GetOrdersQuery
    └── GetOrderStatisticsQuery
```

각 Command와 Query는 해당 작업을 처리하는 Handler를 가집니다.

### 2.2. 비즈니스 로직의 명확성

Command는 데이터 변경 작업의 목적을 명확하게 표현합니다.

예를 들어 다음과 같은 이름을 사용할 수 있습니다.

- `CreateOrderCommand`
- `CancelOrderCommand`
- `ApprovePaymentCommand`
- `DeactivateUserCommand`

이러한 명칭은 단순한 데이터 변경이 아니라 수행하려는 비즈니스 작업을 나타냅니다.

반면 Query는 조회 목적을 표현합니다.

- `GetOrderQuery`
- `GetOrderHistoryQuery`
- `GetUserProfileQuery`
- `GetSalesStatisticsQuery`

이를 통해 각 작업의 책임과 실행 흐름을 명확하게 구분할 수 있습니다.

### 2.3. 읽기와 쓰기의 독립적인 최적화

데이터 변경 작업과 조회 작업은 서로 다른 성능 특성을 가질 수 있습니다.

예를 들어 주문 생성에는 다음과 같은 처리가 필요할 수 있습니다.

1. 사용자 상태를 확인합니다.
2. 주문 가능 여부를 검증합니다.
3. 재고를 확인합니다.
4. 주문 데이터를 저장합니다.
5. 재고를 차감합니다.

반면 주문 목록 조회에는 다음과 같은 작업이 필요할 수 있습니다.

1. 주문 테이블을 조회합니다.
2. 상품 정보를 결합합니다.
3. 사용자에게 필요한 필드만 선택합니다.
4. 정렬 및 페이지네이션을 적용합니다.

CQRS에서는 이러한 차이를 고려하여 읽기와 쓰기 모델을 독립적으로 설계할 수 있습니다.

### 2.4. 복잡도 관리

CQRS는 기능별 책임을 세분화하므로 복잡한 비즈니스 애플리케이션의 구조를 관리하는 데 도움이 됩니다.

그러나 Command, Query 및 Handler 클래스가 증가하므로 단순한 CRUD 애플리케이션에서는 오히려 불필요한 복잡도를 유발할 수 있습니다.

따라서 CQRS는 모든 애플리케이션에 필수적으로 적용해야 하는 패턴이 아닙니다.

---

## 3. CQS와 CQRS의 차이

CQRS는 CQS(Command Query Separation) 원칙과 밀접한 관련이 있습니다.

### 3.1. CQS

CQS는 메서드가 다음 두 역할 중 하나를 담당해야 한다는 설계 원칙입니다.

- Command: 시스템의 상태를 변경합니다.
- Query: 시스템의 상태를 조회하며 변경하지 않습니다.

예를 들어 다음과 같습니다.

```typescript
class OrderService {
  createOrder(): void {
    // 상태 변경
  }

  getOrder(): Order {
    // 상태 조회
  }
}
```

CQS의 기본 원칙에서는 하나의 메서드가 상태 변경과 조회 결과 반환이라는 두 역할을 동시에 수행하지 않도록 구분합니다.

### 3.2. CQRS

CQRS는 이러한 구분을 애플리케이션의 모델과 처리 구조 수준으로 확장합니다.

```text
                 Application
                      │
           ┌──────────┴──────────┐
           │                     │
           ▼                     ▼
      Command Model         Query Model
           │                     │
           ▼                     ▼
      Write Handler         Read Handler
```

CQRS에서는 Command와 Query에 서로 다른 모델, Handler 및 데이터 접근 방식을 적용할 수 있습니다.

또한 CQRS의 Command는 작업 결과로 생성된 식별자나 처리 결과를 반환할 수 있습니다.

따라서 CQS의 엄격한 메서드 규칙을 CQRS의 Command 반환값에 그대로 적용할 필요는 없습니다.

### 3.3. 비교

| 구분 | CQS | CQRS |
|---|---|---|
| 적용 범위 | 메서드 수준 | 애플리케이션 구조 및 모델 수준 |
| 주요 목적 | 상태 변경과 조회의 역할 구분 | 읽기와 쓰기 책임 분리 |
| 구현 방식 | 메서드 역할 구분 | Command/Query Model 및 Handler 분리 |
| 데이터베이스 분리 | 관련 없음 | 선택적으로 적용 가능 |
| 별도 아키텍처 구성 | 필요하지 않음 | 요구사항에 따라 필요 |

---

## 4. CQRS의 주요 구성 요소

NestJS의 `@nestjs/cqrs`에서는 다음과 같은 구성 요소를 제공합니다.

| 구성 요소 | 주요 역할 |
|---|---|
| Command | 상태 변경 작업을 표현합니다. |
| CommandHandler | Command를 처리합니다. |
| CommandBus | Command를 해당 Handler로 전달합니다. |
| Query | 데이터 조회 작업을 표현합니다. |
| QueryHandler | Query를 처리합니다. |
| QueryBus | Query를 해당 Handler로 전달합니다. |
| Event | 발생한 사건을 표현합니다. |
| EventHandler | Event에 반응하여 후속 작업을 처리합니다. |
| EventBus | Event를 발행합니다. |
| Saga | Event를 기반으로 후속 Command를 생성합니다. |
| AggregateRoot | 도메인 객체에서 Event를 기록하고 발행할 수 있도록 지원합니다. |
| EventPublisher | Aggregate와 EventBus를 연결하는 데 사용합니다. |

### 4.1. Command 처리 흐름

```text
HTTP Request
     │
     ▼
Controller
     │
     ▼
CommandBus.execute()
     │
     ▼
CommandHandler
     │
     ▼
Domain / Repository
     │
     ▼
Database
     │
     ▼
Command Result
```

CommandBus는 Command의 타입에 따라 등록된 Handler를 찾아 실행합니다.

### 4.2. Query 처리 흐름

```text
HTTP Request
     │
     ▼
Controller
     │
     ▼
QueryBus.execute()
     │
     ▼
QueryHandler
     │
     ▼
Read Repository
     │
     ▼
Database
     │
     ▼
Query Result
```

QueryBus는 Query에 대응하는 Handler를 실행하고 조회 결과를 반환합니다.

### 4.3. Event 처리 흐름

```text
CommandHandler
     │
     ▼
EventBus.publish()
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
EventHandler A      EventHandler B
     │                  │
     ▼                  ▼
Notification         Audit Log
```

하나의 Event를 여러 EventHandler가 처리할 수 있습니다.

이와 달리 일반적인 Command는 특정 작업을 처리하는 하나의 Handler에 전달됩니다.

---

## 5. NestJS CQRS 환경 구성

NestJS에서 CQRS를 사용하려면 `@nestjs/cqrs` 패키지를 설치해야 합니다.

### 5.1. 패키지 설치

```bash
npm install @nestjs/cqrs
```

`@nestjs/cqrs`는 NestJS가 공식적으로 제공하는 CQRS 구현 패키지입니다.

### 5.2. CqrsModule 등록

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    OrdersModule,
  ],
})
export class AppModule {}
```

`CqrsModule.forRoot()`는 CQRS 시스템에 필요한 기반 구성을 초기화합니다.

이 모듈을 통해 CommandBus, QueryBus 및 EventBus 등의 구성 요소를 사용할 수 있습니다.

현재 NestJS 공식 문서에서는 Root Module에 `CqrsModule.forRoot()`를 등록하는 방식을 안내합니다.

과거 버전의 예제에서는 `CqrsModule`을 직접 `imports`에 등록하는 형태를 볼 수 있으므로 사용 중인 `@nestjs/cqrs` 버전의 API를 확인해야 합니다.

---

## 6. CQRS 기반 프로젝트 구조

이번 문서에서는 주문 관리 기능을 예제로 사용합니다.

Command와 Query를 각각 다른 Handler에서 처리하고, EventHandler를 통해 주문 생성 후속 작업을 수행합니다.

### 6.1. 디렉터리 구조

```text
src/
├── app.module.ts
│
└── orders/
    ├── commands/
    │   ├── impl/
    │   │   └── create-order.command.ts
    │   └── handlers/
    │       └── create-order.handler.ts
    │
    ├── queries/
    │   ├── impl/
    │   │   └── get-order.query.ts
    │   └── handlers/
    │       └── get-order.handler.ts
    │
    ├── events/
    │   ├── impl/
    │   │   └── order-created.event.ts
    │   └── handlers/
    │       └── order-created.handler.ts
    │
    ├── dto/
    │   ├── create-order.dto.ts
    │   └── order-response.dto.ts
    │
    ├── repositories/
    │   └── orders.repository.ts
    │
    ├── orders.controller.ts
    └── orders.module.ts
```

이 구조에서는 다음과 같이 책임을 구분합니다.

- `commands`: 상태 변경을 위한 Command와 Handler
- `queries`: 데이터 조회를 위한 Query와 Handler
- `events`: 발생한 사건과 후속 처리 Handler
- `dto`: 요청 및 응답 데이터 구조
- `repositories`: 데이터 저장 및 조회 기능
- `orders.controller.ts`: HTTP 요청을 CommandBus 또는 QueryBus로 전달
- `orders.module.ts`: 관련 Handler와 Provider 등록

`impl`과 `handlers` 디렉터리 구분은 하나의 구성 예시이며, NestJS가 특정 디렉터리 구조를 강제하지는 않습니다.

---

## 7. Command 구현

Command는 시스템의 상태를 변경하려는 요청을 표현합니다.

예를 들어 주문을 생성하는 기능은 `CreateOrderCommand`로 정의할 수 있습니다.

### 7.1. Command 정의

`orders/commands/impl/create-order.command.ts`

```typescript
import { Command } from '@nestjs/cqrs';

export class CreateOrderCommand extends Command<string> {
  constructor(
    public readonly productId: number,
    public readonly quantity: number,
  ) {
    super();
  }
}
```

`CreateOrderCommand`는 주문 생성에 필요한 데이터를 보유합니다.

`Command<string>`은 Command 실행 결과가 `string` 타입이라는 의미입니다.

이 예제에서는 생성된 주문 ID를 반환하도록 정의합니다.

`Command<T>` 상속은 반환 타입 추론을 지원하기 위한 편의 기능입니다. 일반 클래스로 Command를 정의하는 것도 가능합니다.

### 7.2. CommandHandler 구현

`orders/commands/handlers/create-order.handler.ts`

```typescript
import {
  CommandHandler,
  EventBus,
  ICommandHandler,
} from '@nestjs/cqrs';

import { CreateOrderCommand } from '../impl/create-order.command';
import { OrdersRepository } from '../../repositories/orders.repository';
import { OrderCreatedEvent } from '../../events/impl/order-created.event';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler
  implements ICommandHandler<CreateOrderCommand> {

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateOrderCommand): Promise<string> {
    const { productId, quantity } = command;

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Invalid order quantity');
    }

    const order = await this.ordersRepository.create({
      productId,
      quantity,
    });

    this.eventBus.publish(
      new OrderCreatedEvent(order.id, order.productId),
    );

    return order.id;
  }
}
```

`@CommandHandler(CreateOrderCommand)`는 해당 Command를 처리할 Handler를 등록합니다.

`ICommandHandler<CreateOrderCommand>`는 CommandHandler가 구현해야 하는 `execute()` 계약을 표현합니다.

Handler는 다음 순서로 동작합니다.

1. Command에서 주문 정보를 추출합니다.
2. 주문 수량을 검증합니다.
3. Repository를 이용하여 주문을 저장합니다.
4. 주문 생성 이벤트를 발행합니다.
5. 생성된 주문 ID를 반환합니다.

이 예제는 구조를 설명하기 위한 최소 구현입니다.

실제 애플리케이션에서는 주문 검증을 Domain 객체로 분리하고, 데이터 저장과 이벤트 발행 사이의 안정성을 확보해야 합니다.

특히 이벤트 발행에 실패하거나 프로세스가 종료될 경우에 대비한 처리 정책이 필요합니다.

### 7.3. Repository 구현

`orders/repositories/orders.repository.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface Order {
  id: string;
  productId: number;
  quantity: number;
}

@Injectable()
export class OrdersRepository {
  private readonly orders = new Map<string, Order>();

  async create(
    data: Pick<Order, 'productId' | 'quantity'>,
  ): Promise<Order> {
    const order: Order = {
      id: randomUUID(),
      ...data,
    };

    this.orders.set(order.id, order);

    return order;
  }

  async findById(id: string): Promise<Order> {
    const order = this.orders.get(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
```

이 예제에서는 CQRS의 동작을 이해하기 위해 메모리 기반 Repository를 사용합니다.

실제 서비스에서는 TypeORM이나 Prisma 등을 이용하여 영속성 계층을 구현할 수 있습니다.

메모리 기반 Repository는 여러 프로세스 사이에서 데이터를 공유하지 못하며, 애플리케이션을 재시작하면 저장된 데이터가 사라집니다.

---

## 8. Query 구현

Query는 애플리케이션의 상태를 변경하지 않고 데이터를 조회하는 작업을 표현합니다.

### 8.1. Query 정의

`orders/queries/impl/get-order.query.ts`

```typescript
import { Query } from '@nestjs/cqrs';
import { Order } from '../../repositories/orders.repository';

export class GetOrderQuery extends Query<Order> {
  constructor(
    public readonly orderId: string,
  ) {
    super();
  }
}
```

`Query<Order>`는 Query 실행 결과가 `Order` 타입이라는 의미입니다.

Query는 조회 대상의 식별자와 검색 조건 등의 데이터를 포함할 수 있습니다.

### 8.2. QueryHandler 구현

`orders/queries/handlers/get-order.handler.ts`

```typescript
import {
  IQueryHandler,
  QueryHandler,
} from '@nestjs/cqrs';

import { GetOrderQuery } from '../impl/get-order.query';
import { OrdersRepository } from '../../repositories/orders.repository';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler
  implements IQueryHandler<GetOrderQuery> {

  constructor(
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async execute(query: GetOrderQuery) {
    return this.ordersRepository.findById(query.orderId);
  }
}
```

`@QueryHandler(GetOrderQuery)`는 해당 Query를 처리할 Handler를 정의합니다.

`IQueryHandler<GetOrderQuery>`는 QueryHandler의 실행 계약을 표현합니다.

QueryHandler는 데이터 조회에 필요한 작업만 수행합니다.

CQRS에서 Query는 애플리케이션의 비즈니스 상태를 변경하지 않도록 설계해야 합니다.

단, 데이터베이스의 내부 통계나 캐시 접근 기록과 같은 기술적인 부수 효과까지 모두 금지한다는 의미는 아닙니다.

### 8.3. Command와 Query 비교

| 구분 | Command | Query |
|---|---|---|
| 목적 | 상태 변경 | 상태 조회 |
| 대표 클래스 | CreateOrderCommand | GetOrderQuery |
| Handler | CommandHandler | QueryHandler |
| Bus | CommandBus | QueryBus |
| 데이터 변경 | 수행 가능 | 수행하지 않도록 설계 |
| 반환값 | 처리 결과 또는 식별자 | 조회 데이터 |
| 주요 관심사 | 비즈니스 규칙, 트랜잭션 | 검색, 정렬, 조회 성능 |

---

## 9. Controller에서 CommandBus와 QueryBus 사용

Controller는 HTTP 요청을 받아 CommandBus 또는 QueryBus로 전달할 수 있습니다.

### 9.1. 요청 DTO

`orders/dto/create-order.dto.ts`

```typescript
export class CreateOrderDto {
  productId: number;
  quantity: number;
}
```

이 DTO는 HTTP 요청의 데이터 구조를 표현합니다.

런타임 검증이 필요하다면 `class-validator` 및 `ValidationPipe`를 적용할 수 있습니다.

### 9.2. Controller 구현

`orders/orders.controller.ts`

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import {
  CommandBus,
  QueryBus,
} from '@nestjs/cqrs';

import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderCommand } from './commands/impl/create-order.command';
import { GetOrderQuery } from './queries/impl/get-order.query';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    const orderId = await this.commandBus.execute(
      new CreateOrderCommand(
        dto.productId,
        dto.quantity,
      ),
    );

    return { orderId };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(
      new GetOrderQuery(id),
    );
  }
}
```

Controller는 CommandHandler나 QueryHandler를 직접 주입받지 않습니다.

대신 `CommandBus`와 `QueryBus`를 통해 작업을 전달합니다.

이러한 구조를 사용하면 Controller가 구체적인 Handler 구현에 직접 의존하지 않도록 구성할 수 있습니다.

### 9.3. 요청 처리 흐름

주문 생성 요청:

```text
POST /orders
     │
     ▼
OrdersController.create()
     │
     ▼
CommandBus.execute()
     │
     ▼
CreateOrderCommand
     │
     ▼
CreateOrderHandler.execute()
     │
     ▼
OrdersRepository.create()
     │
     ▼
Return Order ID
```

주문 조회 요청:

```text
GET /orders/:id
     │
     ▼
OrdersController.findOne()
     │
     ▼
QueryBus.execute()
     │
     ▼
GetOrderQuery
     │
     ▼
GetOrderHandler.execute()
     │
     ▼
OrdersRepository.findById()
     │
     ▼
Return Order
```

---

## 10. Event와 EventHandler

CQRS는 Command와 Query의 책임을 분리하는 패턴이지만, 데이터 변경 이후의 후속 작업을 처리하기 위해 Event를 함께 사용할 수 있습니다.

Event는 이미 발생한 사건을 표현합니다.

예를 들어 다음과 같은 Event를 정의할 수 있습니다.

- `OrderCreatedEvent`
- `OrderCancelledEvent`
- `PaymentCompletedEvent`
- `UserRegisteredEvent`

### 10.1. Event 정의

`orders/events/impl/order-created.event.ts`

```typescript
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly productId: number,
  ) {}
}
```

Command와 Event는 의미가 다릅니다.

Command는 수행하려는 작업을 나타내고, Event는 이미 발생한 사건을 나타냅니다.

```text
CreateOrderCommand
        │
        ▼
CreateOrderHandler
        │
        ▼
OrderCreatedEvent
```

### 10.2. EventHandler 구현

`orders/events/handlers/order-created.handler.ts`

```typescript
import {
  EventsHandler,
  IEventHandler,
} from '@nestjs/cqrs';

import { OrderCreatedEvent } from '../impl/order-created.event';

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler
  implements IEventHandler<OrderCreatedEvent> {

  handle(event: OrderCreatedEvent): void {
    console.log(
      `Order created: ${event.orderId}`,
    );
  }
}
```

`@EventsHandler(OrderCreatedEvent)`는 해당 Event에 반응하는 Handler를 등록합니다.

EventHandler는 `execute()`가 아닌 `handle()` 메서드를 구현합니다.

하나의 Event에 여러 Handler를 등록할 수 있습니다.

예를 들어 주문이 생성되었을 때 알림 발송, 감사 로그 기록, 통계 반영 등의 작업을 서로 다른 EventHandler로 분리할 수 있습니다.

### 10.3. CommandHandler와 EventHandler의 차이

| 구분 | CommandHandler | EventHandler |
|---|---|---|
| 처리 대상 | Command | Event |
| 의미 | 수행할 작업 | 발생한 사건 |
| 실행 메서드 | `execute()` | `handle()` |
| 일반적인 처리 관계 | Command별 하나의 Handler | Event별 여러 Handler 가능 |
| 반환값 | Command 실행 결과 | 발행자에게 반환하는 응답으로 사용하지 않음 |
| 주요 목적 | 비즈니스 상태 변경 | 후속 처리 및 이벤트 반응 |

### 10.4. 이벤트 처리 시 주의사항

NestJS의 기본 EventBus는 프로세스 내부에서 Event를 발행합니다.

따라서 EventBus를 사용하는 것만으로 외부 Message Broker와 같은 내구성이나 전달 보장이 제공되는 것은 아닙니다.

특히 다음 사항에 주의해야 합니다.

- 이벤트 발행과 데이터베이스 트랜잭션이 자동으로 원자적으로 처리되지 않습니다.
- EventHandler에서 발생한 오류가 원래 HTTP 요청의 Exception Filter로 자동 전달되지 않습니다.
- 비동기 EventHandler의 작업 완료를 Command 실행 성공과 동일하게 취급해서는 안 됩니다.
- 여러 NestJS Replica 사이에서 Event가 자동으로 공유되지 않습니다.

안정적인 이벤트 전달이 필요하다면 Transactional Outbox 또는 외부 메시징 시스템을 검토해야 합니다.

---

## 11. AggregateRoot와 EventPublisher

NestJS CQRS는 도메인 객체에서 Event를 관리하기 위한 `AggregateRoot`와 `EventPublisher`를 제공합니다.

### 11.1. AggregateRoot

Aggregate는 Domain-Driven Design에서 데이터와 비즈니스 규칙의 일관성 경계를 표현하는 개념입니다.

AggregateRoot는 Aggregate의 외부 접근 지점 역할을 수행하는 도메인 객체입니다.

NestJS의 `AggregateRoot` 클래스는 도메인 이벤트를 기록하고 발행하는 기능을 제공합니다.

다음은 주문 Aggregate 예제입니다.

```typescript
import { AggregateRoot } from '@nestjs/cqrs';
import { OrderCreatedEvent } from './order-created.event';

export class OrderAggregate extends AggregateRoot {
  constructor(
    public readonly id: string,
  ) {
    super();
  }

  createOrder(productId: number): void {
    this.apply(
      new OrderCreatedEvent(this.id, productId),
    );
  }
}
```

`apply()`는 Aggregate에 Event를 적용하는 API입니다.

기본적인 자동 커밋 설정을 사용하지 않는 경우 Event는 기록되며, `commit()`을 호출하여 발행할 수 있습니다.

다만 `apply()` 자체가 주문 데이터를 데이터베이스에 저장하거나, 도메인 상태를 자동으로 변경하는 것은 아닙니다.

도메인 상태 변경 로직은 Aggregate에 별도로 구현해야 합니다.

### 11.2. EventPublisher

`EventPublisher`를 이용하면 Aggregate의 Event 발행 기능을 EventBus와 연결할 수 있습니다.

```typescript
import {
  CommandHandler,
  EventPublisher,
  ICommandHandler,
} from '@nestjs/cqrs';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler
  implements ICommandHandler<CreateOrderCommand> {

  constructor(
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CreateOrderCommand): Promise<string> {
    const order = this.publisher.mergeObjectContext(
      new OrderAggregate('order-1'),
    );

    order.createOrder(command.productId);

    order.commit();

    return order.id;
  }
}
```

이 코드는 Aggregate와 EventPublisher의 관계를 설명하기 위한 최소 예제이며, 실제 주문 저장 과정은 생략했습니다.

실제 애플리케이션에서는 도메인 상태를 변경하고 영속성 저장이 성공한 후 이벤트를 발행하는 흐름을 설계해야 합니다.

`commit()`은 일반적인 데이터베이스의 COMMIT과 동일한 개념이 아닙니다.

NestJS의 AggregateRoot에서 `commit()`은 기록된 도메인 이벤트를 발행하는 기능입니다.

데이터베이스 트랜잭션의 Commit과는 별도로 관리해야 합니다.

---

## 12. Saga Pattern

Saga는 여러 단계로 구성된 비즈니스 작업 흐름을 조정하기 위한 패턴입니다.

NestJS CQRS에서는 `@Saga()`를 이용해 Event 스트림을 수신하고 후속 Command를 생성할 수 있습니다.

예를 들어 주문 생성 이후 결제를 요청하는 흐름을 생각할 수 있습니다.

```text
CreateOrderCommand
        │
        ▼
CreateOrderHandler
        │
        ▼
OrderCreatedEvent
        │
        ▼
OrderSaga
        │
        ▼
ProcessPaymentCommand
        │
        ▼
ProcessPaymentHandler
```

### 12.1. 후속 Command 정의

```typescript
import { Command } from '@nestjs/cqrs';

export class ProcessPaymentCommand extends Command<void> {
  constructor(
    public readonly orderId: string,
  ) {
    super();
  }
}
```

### 12.2. Saga 구현

```typescript
import { Injectable } from '@nestjs/common';
import {
  ICommand,
  ofType,
  Saga,
} from '@nestjs/cqrs';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { OrderCreatedEvent } from '../events/impl/order-created.event';
import { ProcessPaymentCommand } from '../commands/impl/process-payment.command';

@Injectable()
export class OrderSaga {
  @Saga()
  orderCreated = (
    events$: Observable<unknown>,
  ): Observable<ICommand> => {
    return events$.pipe(
      ofType(OrderCreatedEvent),
      map(
        (event) => new ProcessPaymentCommand(event.orderId),
      ),
    );
  };
}
```

`@Saga()`는 해당 메서드 또는 속성이 Saga임을 나타냅니다.

`ofType()`은 Event 스트림에서 지정한 이벤트 타입만 선택합니다.

`map()`은 Event를 새로운 Command로 변환합니다.

생성된 Command는 NestJS CQRS 시스템에 의해 CommandBus로 전달됩니다.

실제 실행을 위해서는 `ProcessPaymentCommand`에 대응하는 CommandHandler와 Saga Provider를 Module에 등록해야 합니다.

### 12.3. Saga와 트랜잭션의 관계

Saga는 여러 단계의 작업 흐름을 구성할 때 활용할 수 있지만, 그 자체로 분산 트랜잭션의 원자성을 보장하지 않습니다.

예를 들어 다음과 같은 상황이 발생할 수 있습니다.

1. 주문 생성에 성공합니다.
2. 결제 요청을 실행합니다.
3. 결제에 실패합니다.
4. 주문을 취소하거나 결제 재시도를 수행해야 합니다.

이 경우 실패 보상 처리를 별도로 설계해야 합니다.

### 12.4. In-Memory Saga의 한계

`@nestjs/cqrs`의 기본 Saga는 프로세스 메모리에서 실행됩니다.

따라서 애플리케이션이 종료되면 진행 중인 이벤트 흐름과 상태가 손실될 수 있습니다.

장시간 실행되는 작업이나 프로세스 재시작 이후에도 복구가 필요한 비즈니스 프로세스는 별도의 영속적 워크플로 실행 시스템이 필요할 수 있습니다.

NestJS 공식 문서에서는 이러한 요구사항을 위한 Durable Workflow 구성도 별도로 설명합니다.

---

## 13. CQRS Module 등록

CommandHandler, QueryHandler, EventHandler 및 Saga는 NestJS Provider로 등록해야 합니다.

`orders/orders.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { OrdersController } from './orders.controller';
import { OrdersRepository } from './repositories/orders.repository';

import { CreateOrderHandler } from './commands/handlers/create-order.handler';
import { GetOrderHandler } from './queries/handlers/get-order.handler';
import { OrderCreatedHandler } from './events/handlers/order-created.handler';

@Module({
  controllers: [
    OrdersController,
  ],
  providers: [
    OrdersRepository,
    CreateOrderHandler,
    GetOrderHandler,
    OrderCreatedHandler,
  ],
})
export class OrdersModule {}
```

Saga를 사용하는 경우 해당 Saga 클래스도 `providers`에 추가해야 합니다.

또한 Saga가 생성하는 Command에 대응하는 Handler도 등록해야 합니다.

예를 들어 다음과 같이 구성할 수 있습니다.

```typescript
providers: [
  OrdersRepository,

  CreateOrderHandler,
  GetOrderHandler,

  OrderCreatedHandler,

  ProcessPaymentHandler,
  OrderSaga,
]
```

여기서 `ProcessPaymentHandler`는 앞서 정의한 `ProcessPaymentCommand`를 실제로 처리하는 Handler입니다.

NestJS는 Module에 등록된 Handler 메타데이터를 바탕으로 CommandBus, QueryBus 및 EventBus와 Handler를 연결합니다.

---

## 14. Read Model과 Write Model 분리

CQRS에서는 읽기와 쓰기 모델을 서로 다르게 구성할 수 있습니다.

### 14.1. 동일한 데이터베이스 사용

가장 단순한 방식은 Command와 Query에 다른 Handler를 사용하되 동일한 데이터베이스에 접근하는 것입니다.

```text
             Application
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
     CommandBus          QueryBus
          │                 │
          ▼                 ▼
    CommandHandler      QueryHandler
          │                 │
          ▼                 ▼
    Write Repository    Read Repository
          │                 │
          └────────┬────────┘
                   │
                   ▼
              PostgreSQL
```

이 구조에서는 별도의 데이터 동기화 시스템이 필요하지 않을 수 있습니다.

또한 QueryHandler는 Domain 객체를 모두 생성하지 않고 필요한 데이터를 직접 DTO 형태로 조회할 수 있습니다.

### 14.2. 별도의 Read Model 사용

조회 요구사항이 복잡하다면 쓰기 모델과 별도의 읽기 모델을 구성할 수 있습니다.

예를 들어 주문 데이터는 여러 테이블로 정규화되어 있지만, 주문 목록 화면에서는 주문, 사용자, 상품 정보를 결합해야 할 수 있습니다.

이 경우 별도의 조회 전용 모델을 유지할 수 있습니다.

```text
Write Model
    │
    ▼
Normalized Tables
    │
    ▼
Read Projection
    │
    ▼
Order Summary View
```

Read Projection은 원본 데이터에서 조회에 최적화된 형태의 데이터를 생성하는 작업 또는 결과 모델을 의미합니다.

### 14.3. 데이터베이스 분리

읽기 부하가 크거나 서로 다른 저장 기술이 필요한 경우 Read Database와 Write Database를 분리할 수 있습니다.

```text
                      Client
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
          CommandBus           QueryBus
              │                   │
              ▼                   ▼
        CommandHandler       QueryHandler
              │                   │
              ▼                   ▼
         Write Database      Read Database
              │                   ▲
              │                   │
              └── Synchronization┘
```

이때 읽기와 쓰기 저장소 사이의 데이터 동기화가 필요합니다.

동기화 방식으로는 다음과 같은 접근을 고려할 수 있습니다.

- Change Data Capture(CDC)
- Transactional Outbox
- Message Broker 기반 이벤트 전달
- Database Replication
- 별도의 Projection Processor

각 방식은 서로 다른 일관성 및 장애 복구 특성을 가집니다.

**CQRS를 적용했다고 해서 읽기와 쓰기 데이터베이스를 반드시 분리해야 하는 것은 아닙니다.**

또한 CommandBus와 QueryBus를 분리하는 것만으로 데이터베이스가 자동으로 분리되거나 독립적으로 확장되는 것은 아닙니다.

---

## 15. Eventual Consistency

쓰기 모델과 읽기 모델이 서로 다른 저장소에 존재한다면 데이터 동기화에 시간이 필요할 수 있습니다.

이로 인해 Eventual Consistency(최종 일관성)가 발생할 수 있습니다.

### 15.1. 데이터 동기화 과정

```text
Time ──────────────────────────────────────►

T1                 T2                 T3
│                  │                  │
▼                  ▼                  ▼
Write Database     Event Processed    Read Database
Updated            / Projection       Updated
```

T1에서 주문 데이터가 변경되었더라도 T3 이전에는 Read Database가 이전 상태를 반환할 수 있습니다.

### 15.2. Read-after-Write 문제

예를 들어 사용자가 주문을 생성한 직후 주문 목록을 조회한다고 가정합니다.

1. 주문 생성 Command가 성공합니다.
2. Write Database에 주문이 저장됩니다.
3. 주문 생성 API가 성공 응답을 반환합니다.
4. 사용자가 주문 목록 API를 호출합니다.
5. Read Model에 아직 동기화되지 않아 신규 주문이 보이지 않을 수 있습니다.

이 문제는 분리된 Read Model을 사용하는 CQRS에서 고려해야 할 대표적인 일관성 문제입니다.

### 15.3. 대응 전략

요구사항에 따라 다음과 같은 방식으로 대응할 수 있습니다.

| 전략 | 설명 |
|---|---|
| Write Model 직접 조회 | 즉시 일관성이 필요한 작업에서 쓰기 저장소를 조회합니다. |
| 동기식 Projection | 트랜잭션 범위 안에서 읽기 모델을 함께 갱신합니다. |
| Version 기반 확인 | Read Model이 특정 버전 이상으로 갱신되었는지 확인합니다. |
| 클라이언트 재조회 | 일정 조건에 따라 조회를 재시도합니다. |
| 사용자 상태 표시 | 동기화가 진행 중임을 사용자에게 표시합니다. |

최종 일관성은 항상 허용할 수 있는 특성이 아닙니다.

예를 들어 잔액, 재고, 결제와 같이 일관성이 중요한 비즈니스 규칙은 쓰기 모델에서 적절한 트랜잭션 및 동시성 제어를 통해 보장해야 합니다.

---

## 16. CQRS와 Event Sourcing

CQRS와 Event Sourcing은 서로 다른 아키텍처 패턴입니다.

### 16.1. CQRS

CQRS는 읽기와 쓰기의 책임을 분리합니다.

```text
Command Model      Query Model
      │                 │
      ▼                 ▼
Write Operation     Read Operation
```

### 16.2. Event Sourcing

Event Sourcing은 현재 상태만 저장하는 대신 상태 변화를 나타내는 이벤트를 순서대로 저장하는 패턴입니다.

```text
OrderCreated
     │
     ▼
OrderPaid
     │
     ▼
OrderShipped
     │
     ▼
Current Order State
```

현재 상태는 저장된 이벤트를 재생하여 재구성할 수 있습니다.

실제 구현에서는 Snapshot 등을 이용하여 재구성 비용을 줄일 수 있습니다.

### 16.3. 비교

| 구분 | CQRS | Event Sourcing |
|---|---|---|
| 핵심 목적 | 읽기와 쓰기 책임 분리 | 상태 변경 이력 보존 |
| 주요 개념 | Command, Query, Handler | Event Store, Event Replay |
| 데이터 저장 | 일반적인 DB 사용 가능 | 이벤트 로그 중심 |
| 독립 적용 | 가능 | 가능 |
| 함께 적용 | 가능 | 가능 |

NestJS의 `@nestjs/cqrs`는 AggregateRoot와 EventPublisher를 제공하지만, 이를 사용한다고 해서 Event Sourcing이 자동으로 구현되는 것은 아닙니다.

완전한 Event Sourcing을 구현하려면 Event Store, 이벤트 버전 관리, 재생 및 Snapshot 등의 기능을 별도로 설계해야 합니다.

---

## 17. 트랜잭션 및 이벤트 발행 전략

CQRS에서 CommandHandler는 여러 데이터 변경 작업을 처리할 수 있습니다.

이때 트랜잭션 경계를 명확하게 정의해야 합니다.

### 17.1. CommandHandler의 트랜잭션

예를 들어 주문 생성과 재고 차감이 하나의 작업이라면 다음과 같은 흐름이 필요할 수 있습니다.

```text
CreateOrderCommand
        │
        ▼
CreateOrderHandler
        │
        ▼
Begin Transaction
        │
        ├── Save Order
        │
        └── Decrease Inventory
        │
        ▼
Commit Transaction
```

NestJS CQRS는 CommandHandler를 실행하는 기능을 제공하지만 데이터베이스 트랜잭션을 자동으로 시작하거나 관리하지는 않습니다.

트랜잭션은 TypeORM, Prisma 또는 별도의 Unit of Work 구현을 통해 관리해야 합니다.

### 17.2. 이벤트 발행과 트랜잭션의 불일치

다음과 같은 상황을 고려해야 합니다.

```text
Save Order
    │
    ▼
Commit Database
    │
    ▼
Publish Event
    │
    X  Process Crashed
```

데이터베이스에는 주문이 저장되었지만 이벤트가 발행되지 않을 수 있습니다.

반대로 트랜잭션 커밋 전에 이벤트를 발행하면 이후 트랜잭션이 롤백되더라도 외부 후속 작업이 실행될 수 있습니다.

### 17.3. Transactional Outbox

Transactional Outbox는 비즈니스 데이터 변경과 이벤트 발행에 필요한 메시지 기록을 동일한 데이터베이스 트랜잭션에서 저장하는 패턴입니다.

```text
CommandHandler
      │
      ▼
Database Transaction
      │
      ├── Save Order
      │
      └── Save Outbox Event
      │
      ▼
Commit
      │
      ▼
Outbox Publisher
      │
      ▼
Message Broker
      │
      ▼
Event Consumer
```

이 방식은 데이터 변경과 이벤트 기록 사이의 불일치를 줄일 수 있습니다.

그러나 메시지 발행 과정에서 중복 전달이 발생할 수 있으므로 Consumer의 멱등성(Idempotency)도 고려해야 합니다.

---

## 18. 예외 처리

CQRS에서는 CommandHandler, QueryHandler 및 EventHandler의 예외 처리 특성을 구분해야 합니다.

### 18.1. CommandHandler 예외

CommandHandler에서 발생한 예외는 `CommandBus.execute()`의 Promise를 통해 호출자에게 전달될 수 있습니다.

```typescript
try {
  await this.commandBus.execute(
    new CreateOrderCommand(100, 2),
  );
} catch (error) {
  // Command 처리 실패
}
```

Controller가 CommandBus를 호출하는 경우 NestJS의 HTTP 예외 처리 체계와 연결할 수 있습니다.

### 18.2. QueryHandler 예외

QueryHandler에서도 조회 실패나 접근 권한 문제 등이 발생할 수 있습니다.

```typescript
try {
  const order = await this.queryBus.execute(
    new GetOrderQuery('order-1'),
  );
} catch (error) {
  // Query 처리 실패
}
```

### 18.3. EventHandler 예외

EventHandler에서 발생한 예외는 CommandHandler와 다르게 처리해야 합니다.

NestJS CQRS는 처리되지 않은 이벤트 관련 예외를 `UnhandledExceptionBus`를 통해 관찰할 수 있는 기능을 제공합니다.

이러한 예외는 일반적인 HTTP Exception Filter에 자동으로 전달되지 않습니다.

따라서 EventHandler에서는 다음과 같은 정책을 고려해야 합니다.

- 오류 로깅
- 재시도
- 보상 처리
- 실패 이벤트 기록
- Dead Letter Queue 활용
- 모니터링 및 알림

단, Dead Letter Queue나 영속적 재시도 기능은 기본 EventBus만으로 자동 제공되지 않습니다.

---

## 19. Request Scope와 AsyncContext

NestJS에서는 Provider Scope를 이용하여 Provider의 인스턴스 생명주기를 관리할 수 있습니다.

CQRS에서도 특정 Handler를 Request Scope로 구성할 수 있습니다.

### 19.1. Request-scoped Handler

```typescript
import { Scope } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

@CommandHandler(CreateOrderCommand, {
  scope: Scope.REQUEST,
})
export class CreateOrderHandler {
  // ...
}
```

이 설정은 Command 처리 시 Request Scope에 따라 Handler 인스턴스를 생성하도록 지정합니다.

### 19.2. AsyncContext

CQRS 작업은 HTTP 요청뿐 아니라 이벤트, 스케줄러 및 메시지 처리 과정에서도 실행될 수 있습니다.

따라서 단순히 HTTP Request 객체에만 의존하는 구조는 적합하지 않을 수 있습니다.

NestJS CQRS에서는 `AsyncContext`를 이용하여 작업 컨텍스트를 전달할 수 있습니다.

```typescript
import { AsyncContext } from '@nestjs/cqrs';

export class OrderRequestContext extends AsyncContext {
  constructor(
    public readonly userId: string,
  ) {
    super();
  }
}
```

CommandBus 실행 시 컨텍스트를 전달할 수 있습니다.

```typescript
const context = new OrderRequestContext('user-1');

await this.commandBus.execute(
  new CreateOrderCommand(100, 2),
  context,
);
```

이러한 기능은 사용자 식별, 요청 추적 및 멀티테넌트 환경에서 활용할 수 있습니다.

다만 Request Scope는 인스턴스 생성 비용을 증가시킬 수 있으므로 필요한 경우에 선택적으로 사용하는 것이 좋습니다.

---

## 20. CQRS 테스트 전략

CQRS는 Command와 Query의 책임이 분리되어 있으므로 작업 단위로 테스트를 구성하기 쉽습니다.

### 20.1. CommandHandler Unit Test

CommandHandler의 테스트에서는 Repository와 EventBus를 Mock으로 대체할 수 있습니다.

```typescript
import { Test } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';

describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler;

  const repositoryMock = {
    create: jest.fn(),
  };

  const eventBusMock = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateOrderHandler,
        {
          provide: OrdersRepository,
          useValue: repositoryMock,
        },
        {
          provide: EventBus,
          useValue: eventBusMock,
        },
      ],
    }).compile();

    handler = moduleRef.get(CreateOrderHandler);
  });

  it('주문을 생성하고 이벤트를 발행합니다', async () => {
    repositoryMock.create.mockResolvedValue({
      id: 'order-1',
      productId: 100,
      quantity: 2,
    });

    const result = await handler.execute(
      new CreateOrderCommand(100, 2),
    );

    expect(result).toBe('order-1');

    expect(repositoryMock.create).toHaveBeenCalledWith({
      productId: 100,
      quantity: 2,
    });

    expect(eventBusMock.publish).toHaveBeenCalledWith(
      expect.any(OrderCreatedEvent),
    );
  });
});
```

이 테스트는 데이터베이스를 사용하지 않고 CommandHandler의 작업 흐름을 검증합니다.

### 20.2. QueryHandler Unit Test

QueryHandler에서는 조회 조건과 반환 결과를 검증합니다.

```typescript
describe('GetOrderHandler', () => {
  it('주문 정보를 반환합니다', async () => {
    const order = {
      id: 'order-1',
      productId: 100,
      quantity: 2,
    };

    const repository = {
      findById: jest.fn().mockResolvedValue(order),
    };

    const handler = new GetOrderHandler(
      repository as unknown as OrdersRepository,
    );

    const result = await handler.execute(
      new GetOrderQuery('order-1'),
    );

    expect(result).toEqual(order);
    expect(repository.findById).toHaveBeenCalledWith(
      'order-1',
    );
  });
});
```

### 20.3. EventHandler 테스트

EventHandler에서는 특정 이벤트가 발생했을 때 의도한 후속 작업이 실행되는지 확인합니다.

실제 외부 알림이나 메시지 전송 기능은 Mock으로 대체할 수 있습니다.

### 20.4. Integration Test

통합 테스트에서는 다음 사항을 검증할 수 있습니다.

- CommandBus와 CommandHandler의 연결
- QueryBus와 QueryHandler의 연결
- EventBus와 EventHandler의 연결
- 실제 Repository를 통한 데이터 저장 및 조회
- 데이터베이스 트랜잭션
- 이벤트 기반 Read Model 갱신

### 20.5. E2E Test

E2E 테스트에서는 실제 HTTP 요청을 통해 Command 및 Query 실행 결과를 검증합니다.

예를 들어 다음과 같은 시나리오를 구성할 수 있습니다.

1. `POST /orders` 요청을 전송합니다.
2. CommandHandler가 주문을 저장하는지 확인합니다.
3. 주문 ID가 반환되는지 확인합니다.
4. `GET /orders/:id` 요청을 전송합니다.
5. QueryHandler가 저장된 주문을 반환하는지 확인합니다.

읽기 모델과 쓰기 모델이 비동기적으로 동기화되는 구조에서는 E2E 테스트에서 데이터 동기화 지연도 고려해야 합니다.

---

## 21. CQRS와 다른 아키텍처 패턴의 관계

### 21.1. Layered Architecture

Layered Architecture는 Controller, Service, Repository 등의 기술적 책임을 분리합니다.

CQRS는 데이터 변경과 조회의 책임을 분리합니다.

따라서 Layered Architecture의 Service 계층을 CommandHandler와 QueryHandler 중심으로 재구성할 수 있습니다.

### 21.2. Modular Monolith

Modular Monolith는 비즈니스 기능별 Module 경계를 정의합니다.

각 Module 내부에 CQRS를 적용할 수 있습니다.

```text
NestJS Application
│
├── UsersModule
│   ├── Commands
│   └── Queries
│
├── OrdersModule
│   ├── Commands
│   ├── Queries
│   └── Events
│
└── PaymentsModule
    ├── Commands
    └── Queries
```

이러한 구조는 기능별 경계와 읽기/쓰기 책임을 함께 분리합니다.

### 21.3. Clean Architecture

Clean Architecture에서는 Use Case를 Application Layer에 배치할 수 있습니다.

CQRS를 적용하면 Use Case를 Command와 Query로 구분하여 구성할 수 있습니다.

```text
Application
│
├── Commands
│   └── CreateOrderUseCase
│
└── Queries
    └── GetOrderUseCase
```

다만 `@nestjs/cqrs`의 데코레이터와 Handler를 Application Layer에서 직접 사용하면 해당 계층이 NestJS 라이브러리에 의존하게 됩니다.

프레임워크 독립성을 엄격하게 유지해야 한다면 순수 Use Case를 Application에 배치하고 CQRS Handler를 Adapter로 구성하는 방식을 고려할 수 있습니다.

### 21.4. Microservices

Microservices 환경에서도 CQRS를 적용할 수 있습니다.

예를 들어 쓰기 처리를 담당하는 서비스와 읽기 처리를 담당하는 서비스를 분리할 수 있습니다.

그러나 `@nestjs/cqrs`의 CommandBus와 QueryBus가 기본적으로 원격 서비스 간 메시징을 자동으로 수행하는 것은 아닙니다.

서비스 간 통신이 필요하다면 별도의 Transport, Message Broker 또는 API 연동을 구성해야 합니다.

---

## 22. CQRS 적용 시 주의사항

### 22.1. 모든 CRUD 기능에 CQRS를 적용할 필요는 없습니다

단순한 데이터 등록과 조회 기능에 Command 및 Query 클래스를 모두 생성하면 코드의 양이 불필요하게 증가할 수 있습니다.

복잡한 비즈니스 규칙이나 조회 요구사항이 존재하는 기능에 선택적으로 적용할 수 있습니다.

### 22.2. CommandHandler가 지나치게 비대해지지 않도록 설계합니다

CommandHandler에 모든 비즈니스 규칙을 집중시키면 기존의 Fat Service 문제가 Handler로 이동할 수 있습니다.

복잡한 비즈니스 규칙은 Domain Entity 또는 Domain Service에 배치하는 방식을 고려해야 합니다.

### 22.3. QueryHandler는 조회에 집중해야 합니다

QueryHandler에서 주문 상태 변경이나 재고 차감과 같은 비즈니스 상태 변경을 수행하지 않도록 설계합니다.

조회 모델은 필요한 데이터를 효율적으로 반환하는 데 집중해야 합니다.

### 22.4. 이벤트 전달과 트랜잭션을 구분해야 합니다

EventBus를 통한 이벤트 발행은 데이터베이스 트랜잭션과 자동으로 원자적 관계를 갖지 않습니다.

중요한 비즈니스 이벤트는 Transactional Outbox 등의 안정적인 전달 구조를 검토해야 합니다.

### 22.5. Read Model의 일관성을 고려해야 합니다

별도의 Read Database를 사용하는 경우 데이터 동기화 지연이 발생할 수 있습니다.

특히 결제, 재고 및 금융 데이터와 같이 강한 일관성이 필요한 영역에서는 적절한 동시성 제어와 트랜잭션 처리가 필요합니다.

### 22.6. Event Sourcing과 혼동하지 않아야 합니다

CQRS는 Event Sourcing 없이도 구현할 수 있습니다.

`AggregateRoot`, `EventPublisher`, `EventBus`를 사용하는 것만으로 Event Store가 생성되는 것은 아닙니다.

### 22.7. CQRS가 자동으로 성능을 향상하지는 않습니다

Command와 Query를 분리하는 것만으로 처리량이 증가하는 것은 아닙니다.

실제 성능은 데이터베이스 구조, 인덱스, 캐시, 네트워크, 트랜잭션 및 시스템 확장 방식에 따라 달라집니다.

---

## 23. CQRS의 장점과 한계

### 23.1. 장점

| 장점 | 설명 |
|---|---|
| 책임 분리 | 데이터 변경과 조회 로직을 독립적으로 관리할 수 있습니다. |
| 비즈니스 명확성 | Command와 Query를 통해 작업 목적이 드러납니다. |
| 테스트 용이성 | Handler 단위 테스트를 구성하기 쉽습니다. |
| 조회 최적화 | 조회 전용 모델을 독립적으로 설계할 수 있습니다. |
| 확장 유연성 | 필요에 따라 읽기와 쓰기 저장소를 별도로 확장할 수 있습니다. |
| 아키텍처 조합 | DDD, Clean Architecture, Modular Monolith 등과 함께 적용할 수 있습니다. |

### 23.2. 한계

| 한계 | 설명 |
|---|---|
| 코드 증가 | Command, Query 및 Handler 클래스가 증가합니다. |
| 학습 비용 | Bus, Handler, Event 및 Saga의 동작을 이해해야 합니다. |
| 구성 복잡도 | Handler 등록과 모듈 구성이 추가됩니다. |
| 데이터 동기화 | 저장소 분리 시 동기화 시스템이 필요합니다. |
| 최종 일관성 | 비동기 Read Model에서 조회 지연이 발생할 수 있습니다. |
| 이벤트 안정성 | 별도 메시징 시스템이나 Outbox가 필요할 수 있습니다. |

---

## 24. 실무 적용 권장사항

NestJS에서 CQRS를 적용할 때는 다음 사항을 고려하는 것이 좋습니다.

1. **Command와 Query의 책임을 명확하게 구분합니다.** Command는 상태 변경, Query는 데이터 조회를 담당하도록 설계합니다.

2. **비즈니스 작업을 기준으로 Command를 정의합니다.** 단순한 필드 변경보다 `ApproveOrderCommand`, `CancelPaymentCommand`처럼 비즈니스 의도를 표현하는 이름을 사용합니다.

3. **Handler의 책임을 제한합니다.** Handler는 작업의 흐름을 조정하고, 복잡한 비즈니스 규칙은 적절한 Domain 구성 요소에 배치합니다.

4. **초기에는 동일한 데이터베이스를 사용할 수 있습니다.** CQRS 도입과 데이터베이스 분리를 동시에 수행할 필요는 없습니다.

5. **조회가 복잡한 경우 Read Model을 별도로 설계합니다.** DTO Projection, 데이터베이스 View, Materialized View 등의 방식으로 조회를 최적화할 수 있습니다.

6. **이벤트는 이미 발생한 사실을 표현하도록 설계합니다.** Command와 Event의 의미를 구분합니다.

7. **데이터 변경과 이벤트 발행의 안정성을 고려합니다.** 중요한 이벤트는 Transactional Outbox 및 메시지 중복 처리 전략을 검토합니다.

8. **Saga의 영속성 요구사항을 확인합니다.** 기본 In-Memory Saga가 장시간 실행되는 작업의 복구를 보장한다고 가정하지 않아야 합니다.

9. **CommandHandler와 QueryHandler를 독립적으로 테스트합니다.** Mock Repository를 사용한 단위 테스트와 실제 DB를 사용하는 통합 테스트를 구분합니다.

10. **비즈니스 복잡도에 맞게 CQRS를 선택적으로 적용합니다.** 단순한 CRUD 기능에는 기존 Service 중심 구조를 유지할 수도 있습니다.

---

## 25. 정리

CQRS는 애플리케이션의 데이터 변경 작업과 조회 작업을 분리하는 아키텍처 패턴입니다.

NestJS에서는 `@nestjs/cqrs` 패키지를 통해 CommandBus, QueryBus, EventBus 및 각종 Handler를 구성할 수 있습니다.

주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 핵심 역할 |
|---|---|
| Command | 상태 변경 요청 |
| CommandHandler | Command 실행 |
| CommandBus | Command 전달 |
| Query | 데이터 조회 요청 |
| QueryHandler | Query 실행 |
| QueryBus | Query 전달 |
| Event | 발생한 사건 |
| EventHandler | 이벤트 후속 처리 |
| EventBus | 이벤트 발행 |
| Saga | 이벤트 기반 작업 흐름 조정 |

CQRS를 적용할 때 가장 중요한 점은 **Command와 Query의 책임을 분리하는 것과 데이터베이스를 물리적으로 분리하는 것은 서로 다른 문제**라는 사실입니다.

작은 애플리케이션에서는 동일한 데이터베이스와 Repository를 사용하면서 Handler만 분리할 수 있습니다.

이후 조회 요구사항이나 성능 문제가 증가하면 Read Model, Projection 및 별도 Read Database를 점진적으로 도입할 수 있습니다.

또한 CQRS는 Event Sourcing, Saga 또는 Microservices를 반드시 요구하지 않습니다.

따라서 애플리케이션의 비즈니스 복잡도와 운영 요구사항에 따라 필요한 구성 요소만 선택적으로 도입하는 것이 바람직합니다.

---

## 26. 관련 문서

- `../01-fundamentals/modules.md` — NestJS Module 구성
- `../01-fundamentals/providers.md` — Provider와 Dependency Injection
- `../01-fundamentals/dependency-injection.md` — 의존성 주입
- `../01-fundamentals/custom-providers.md` — Custom Provider
- `../03-techniques/cqrs.md` — NestJS CQRS API와 구현 기능
- `../03-techniques/events.md` — 이벤트 기반 통신
- `../03-techniques/queues.md` — Queue와 비동기 작업
- `../03-techniques/database.md` — 데이터베이스 및 ORM
- `../06-testing/unit-testing.md` — 단위 테스트
- `../06-testing/integration-testing.md` — 통합 테스트
- `./layered-architecture.md` — Layered Architecture
- `./modular-monolith.md` — Modular Monolith
- `./clean-architecture.md` — Clean Architecture
- `./dependency-management.md` — 의존성 관리
- `../05-platforms/microservices.md` — NestJS Microservices

---

## 27. 참고 자료

### NestJS 공식 문서

- [NestJS CQRS](https://docs.nestjs.com/recipes/cqrs) — CQRS의 주요 구성 요소, Command, Query, Event, Saga 및 Request Scope
- [NestJS CQRS GitHub Repository](https://github.com/nestjs/cqrs) — `@nestjs/cqrs` 공식 소스 코드
- [NestJS Providers](https://docs.nestjs.com/providers) — Provider와 Dependency Injection
- [NestJS Modules](https://docs.nestjs.com/modules) — Module 구성 및 Handler 등록
- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers) — Custom Provider 및 Injection Token
- [NestJS Events](https://docs.nestjs.com/techniques/events) — 애플리케이션 이벤트 처리
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing) — Unit Test 및 E2E Test
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics) — Microservices 통신
- [NestJS Durable Workflows](https://docs.nestjs.com/reliability/workflows) — 재시작 이후에도 복구 가능한 워크플로 구성

### CQRS 및 소프트웨어 아키텍처

- [Martin Fowler — CQRS](https://martinfowler.com/bliki/CQRS.html) — CQRS 패턴의 개념과 적용 시 주의사항
- [Martin Fowler — Command Query Separation](https://martinfowler.com/bliki/CommandQuerySeparation.html) — CQS 원칙
- [Microsoft Azure Architecture Center — CQRS Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) — CQRS 구성 방식 및 Read/Write Model 설계
- [AWS Prescriptive Guidance — CQRS Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/cqrs-pattern.html) — CQRS 아키텍처와 데이터 저장소 분리
- [Martin Fowler — What do you mean by Event-Driven?](https://martinfowler.com/articles/201701-event-driven.html) — Event-Driven Architecture의 의미와 다양한 패턴
- [Martin Fowler — Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) — Event Sourcing의 개념과 동작 원리
- [Microsoft — A CQRS Journey](https://github.com/microsoftarchive/cqrs-journey) — CQRS 및 Event Sourcing 설계 사례

### 데이터 일관성 및 메시징

- [Microservices.io — Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html) — 데이터 변경과 이벤트 기록의 원자성
- [Microservices.io — Saga Pattern](https://microservices.io/patterns/data/saga.html) — 분산 작업 흐름과 보상 트랜잭션
- [TypeORM Transactions](https://typeorm.io/docs/advanced-topics/transactions/) — TypeORM 트랜잭션 처리
- [Microsoft — Eventual Consistency](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) — CQRS에서의 데이터 동기화 및 최종 일관성