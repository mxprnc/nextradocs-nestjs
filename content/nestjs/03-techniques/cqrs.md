# CQRS

## 1. 개요

CQRS(Command Query Responsibility Segregation)는 애플리케이션에서 데이터를 변경하는 작업과 데이터를 조회하는 작업의 책임을 분리하는 아키텍처 패턴입니다.

일반적인 CRUD(Create, Read, Update, Delete) 애플리케이션에서는 하나의 Service가 데이터 조회와 변경을 모두 담당하는 경우가 많습니다.

```typescript
@Injectable()
export class OrdersService {
  createOrder() {
    // 주문 생성
  }

  updateOrder() {
    // 주문 수정
  }

  cancelOrder() {
    // 주문 취소
  }

  findOrder() {
    // 주문 조회
  }

  findOrders() {
    // 주문 목록 조회
  }
}
```

이러한 구조는 규모가 작고 비즈니스 규칙이 단순한 애플리케이션에서 효과적입니다.

하지만 시스템의 규모가 증가하면 데이터 변경과 조회에 서로 다른 요구사항이 발생할 수 있습니다.

예를 들어 주문 생성에서는 재고 확인, 결제 상태 검증, 트랜잭션 및 데이터 정합성이 중요합니다. 반면 주문 목록 조회에서는 검색 조건, 정렬, Pagination 및 조회 성능이 중요합니다.

CQRS는 이러한 서로 다른 책임을 분리하여 각 작업의 요구사항에 적합한 구조를 설계할 수 있도록 합니다.

NestJS는 CQRS 패턴을 구현하기 위해 `@nestjs/cqrs` 패키지를 제공합니다.

이 패키지는 다음 기능을 지원합니다.

- Command와 Command Handler
- Query와 Query Handler
- CommandBus 및 QueryBus
- Event와 Event Handler
- EventBus
- AggregateRoot
- EventPublisher
- Saga
- UnhandledExceptionBus
- Request-scoped Handler와 AsyncContext

이 문서에서는 `@nestjs/cqrs`를 이용한 CQRS 구현 방법을 설명합니다.

CQRS의 아키텍처적 배경과 Read Model·Write Model의 분리 전략은 `07-architecture/cqrs-pattern.md`에서 추가로 다룰 수 있습니다.

---

## 2. CQRS가 필요한 이유

### 2.1. 조회와 변경의 책임 분리

일반적인 CRUD 구조는 다음과 같습니다.

```text
HTTP Request
     |
     v
 Controller
     |
     v
   Service
     |
     +-- Create
     +-- Update
     +-- Delete
     +-- Read
     |
     v
 Repository
     |
     v
  Database
```

CQRS에서는 데이터 변경과 조회에 서로 다른 처리 흐름을 구성할 수 있습니다.

```text
                HTTP Request
                     |
                     v
                 Controller
                     |
           +---------+---------+
           |                   |
           v                   v
       CommandBus           QueryBus
           |                   |
           v                   v
     CommandHandler       QueryHandler
           |                   |
           v                   v
       Write Model          Read Model
           |                   |
           v                   v
      Persistence            Query
```

Command는 애플리케이션 상태를 변경하는 작업을 표현합니다.

Query는 애플리케이션 상태를 조회하는 작업을 표현합니다.

이렇게 분리하면 변경 로직과 조회 로직을 독립적으로 설계하고 테스트할 수 있습니다.

### 2.2. 비즈니스 로직의 복잡성 관리

주문 생성 과정에서는 여러 비즈니스 규칙이 적용될 수 있습니다.

```text
CreateOrderCommand
        |
        v
CreateOrderHandler
        |
        +-- Validate Order
        |
        +-- Check Inventory
        |
        +-- Calculate Price
        |
        +-- Save Order
        |
        +-- Publish Event
```

반면 주문 조회에서는 데이터 검색과 응답 변환에 집중할 수 있습니다.

```text
GetOrderQuery
      |
      v
GetOrderHandler
      |
      v
Order Read Repository
      |
      v
OrderResponse
```

이러한 구조는 변경 작업의 비즈니스 규칙이 복잡한 애플리케이션에서 특히 유용합니다.

### 2.3. 읽기와 쓰기의 독립적인 최적화

CQRS를 적용하면 읽기와 쓰기에 서로 다른 데이터 모델을 사용할 수 있습니다.

예를 들어 Write Model은 데이터 정합성을 중심으로 설계하고, Read Model은 조회 성능을 중심으로 설계할 수 있습니다.

다만 CQRS를 구현한다고 해서 반드시 서로 다른 데이터베이스를 사용해야 하는 것은 아닙니다.

하나의 데이터베이스와 동일한 Repository를 사용하면서 Handler만 분리하는 방식도 가능합니다.

## 3. CQRS의 핵심 구성 요소

| 구성 요소 | 역할 |
|---|---|
| Command | 상태 변경 작업 표현 |
| CommandHandler | Command 처리 |
| CommandBus | Command를 Handler로 전달 |
| Query | 데이터 조회 요청 표현 |
| QueryHandler | Query 처리 |
| QueryBus | Query를 Handler로 전달 |
| Event | 발생한 사건 표현 |
| EventHandler | Event 처리 |
| EventBus | Event 발행 및 전달 |
| AggregateRoot | 도메인 상태 변경과 이벤트 관리 |
| EventPublisher | Aggregate와 EventBus 연결 |
| Saga | 이벤트를 수신하여 후속 Command 생성 |

### 3.1. Command, Query, Event 비교

| 구분 | Command | Query | Event |
|---|---|---|---|
| 의미 | 수행할 작업 | 조회할 데이터 | 이미 발생한 사건 |
| 주요 목적 | 상태 변경 | 데이터 조회 | 상태 변경 사실 전달 |
| 이름 예시 | `CreateOrderCommand` | `GetOrderQuery` | `OrderCreatedEvent` |
| 처리 주체 | CommandHandler | QueryHandler | EventHandler |
| 전달 객체 | CommandBus | QueryBus | EventBus |
| 기본 Handler 관계 | Command당 하나 | Query당 하나 | Event당 여러 개 가능 |
| 결과 반환 | 가능 | 가능 | 호출자에 대한 직접 반환 계약 없음 |

Command는 일반적으로 동작을 나타내는 명령형 이름을 사용합니다.

Query는 조회하려는 데이터를 명확하게 표현합니다.

Event는 이미 발생한 사건을 과거형으로 표현하는 것이 일반적입니다.

## 4. CQRS 환경 구성

### 4.1. 패키지 설치

NestJS에서 CQRS를 사용하려면 다음 패키지를 설치합니다.

```bash
npm install @nestjs/cqrs
```

Saga에서 RxJS Operator를 사용하는 경우에는 `rxjs`가 필요합니다.

일반적인 NestJS 프로젝트에는 이미 설치되어 있지만 의존성 구성을 확인해야 합니다.

### 4.2. CqrsModule 등록

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

`CqrsModule.forRoot()`는 CQRS의 Bus와 관련 Provider를 초기화합니다.

기존 버전의 예제에서는 `CqrsModule`을 직접 Import하는 경우도 있습니다. 신규 코드에서는 사용 중인 `@nestjs/cqrs` 버전에 맞춰 `forRoot()` 설정 방식을 확인하는 것이 좋습니다.

### 4.3. 프로젝트 구조

주문 기능에 CQRS를 적용한다고 가정합니다.

```text
src/
├── orders/
│   ├── commands/
│   │   ├── impl/
│   │   │   ├── create-order.command.ts
│   │   │   └── cancel-order.command.ts
│   │   └── handlers/
│   │       ├── create-order.handler.ts
│   │       └── cancel-order.handler.ts
│   │
│   ├── queries/
│   │   ├── impl/
│   │   │   ├── get-order.query.ts
│   │   │   └── get-orders.query.ts
│   │   └── handlers/
│   │       ├── get-order.handler.ts
│   │       └── get-orders.handler.ts
│   │
│   ├── events/
│   │   ├── impl/
│   │   │   └── order-created.event.ts
│   │   └── handlers/
│   │       └── order-created.handler.ts
│   │
│   ├── sagas/
│   │   └── orders.saga.ts
│   │
│   ├── dto/
│   │   ├── create-order.dto.ts
│   │   └── order-response.dto.ts
│   │
│   ├── orders.controller.ts
│   └── orders.module.ts
│
├── app.module.ts
└── main.ts
```

이 구조는 CQRS의 구성 요소를 학습하기 위한 예시입니다.

실제 프로젝트에서는 `commands/handlers`와 `queries/handlers`를 기능별로 묶거나, Handler와 Command를 같은 디렉터리에 배치할 수도 있습니다.

## 5. Command

Command는 애플리케이션의 상태를 변경하도록 요청하는 객체입니다.

예를 들어 다음과 같은 작업을 Command로 표현할 수 있습니다.

- 주문 생성
- 주문 취소
- 사용자 정보 수정
- 결제 승인
- 재고 차감

### 5.1. Command 정의

`orders/commands/impl/create-order.command.ts`

```typescript
import { Command } from '@nestjs/cqrs';

export class CreateOrderCommand extends Command<{
  orderId: number;
}> {
  constructor(
    public readonly userId: number,
    public readonly productId: number,
    public readonly quantity: number,
  ) {
    super();
  }
}
```

`Command<TResult>`는 Command의 처리 결과 타입을 지정하는 유틸리티 클래스입니다.

이 예제에서는 Command 처리 결과가 다음 타입임을 나타냅니다.

```typescript
{
  orderId: number;
}
```

`Command` 클래스를 반드시 상속해야 하는 것은 아닙니다.

일반 TypeScript 클래스로도 Command를 정의할 수 있습니다.

다만 `Command<TResult>`를 상속하면 `CommandBus.execute()`의 반환 타입을 추론하는 데 유용합니다.

### 5.2. Command와 DTO의 차이

Command와 DTO는 서로 다른 책임을 가집니다.

| 구분 | DTO | Command |
|---|---|---|
| 목적 | 계층 사이의 데이터 전달 | 애플리케이션 상태 변경 요청 |
| 주로 사용되는 위치 | Controller 입력 | Application 계층 |
| 주요 관심사 | 입력 형식과 검증 | 수행할 비즈니스 작업 |
| 예시 | `CreateOrderDto` | `CreateOrderCommand` |

예를 들어 DTO는 클라이언트가 전달한 `productId`와 `quantity`를 검증합니다.

Command는 검증된 데이터와 인증된 사용자 ID를 결합하여 주문 생성 작업을 요청할 수 있습니다.

## 6. CommandHandler

CommandHandler는 특정 Command의 실제 처리 로직을 구현합니다.

### 6.1. 기본 구현

`orders/commands/handlers/create-order.handler.ts`

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CreateOrderCommand } from '../impl/create-order.command';
import { OrdersRepository } from '../../repositories/orders.repository';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler
  implements ICommandHandler<CreateOrderCommand>
{
  constructor(
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async execute(
    command: CreateOrderCommand,
  ): Promise<{ orderId: number }> {
    const order = await this.ordersRepository.create({
      userId: command.userId,
      productId: command.productId,
      quantity: command.quantity,
    });

    return {
      orderId: order.id,
    };
  }
}
```

이 예제의 `OrdersRepository`는 애플리케이션에서 별도로 구현한 데이터 접근 추상화입니다.

`create()`는 주문을 저장하고 생성된 주문 객체를 반환하는 메서드라고 가정합니다.

### 6.2. @CommandHandler()

```typescript
@CommandHandler(CreateOrderCommand)
```

`@CommandHandler()`는 해당 클래스가 어떤 Command를 처리하는지 지정합니다.

NestJS는 등록된 Handler의 메타데이터를 이용하여 Command와 Handler를 연결합니다.

### 6.3. ICommandHandler

```typescript
implements ICommandHandler<CreateOrderCommand>
```

`ICommandHandler`는 Command 처리 메서드의 계약을 정의합니다.

Handler는 `execute()`를 구현해야 합니다.

```typescript
execute(command: CreateOrderCommand)
```

`Command<TResult>`를 상속한 Command는 Handler의 반환 타입을 제한하는 데에도 활용할 수 있습니다.

### 6.4. 하나의 Command와 하나의 Handler

일반적인 CQRS 구현에서는 하나의 Command를 하나의 CommandHandler가 처리합니다.

```text
CreateOrderCommand
       |
       v
   CommandBus
       |
       v
CreateOrderHandler
```

하나의 Command를 여러 Handler가 각각 처리하도록 설계하는 방식은 CommandBus의 기본 모델과 맞지 않습니다.

여러 후속 작업이 필요하다면 CommandHandler에서 도메인 이벤트를 발행하고 여러 EventHandler가 처리하도록 구성할 수 있습니다.

## 7. CommandBus

`CommandBus`는 Command를 적절한 CommandHandler에 전달하는 역할을 담당합니다.

### 7.1. CommandBus 주입

```typescript
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CreateOrderCommand } from './commands/impl/create-order.command';

@Injectable()
export class OrdersApplicationService {
  constructor(
    private readonly commandBus: CommandBus,
  ) {}

  createOrder(
    userId: number,
    productId: number,
    quantity: number,
  ): Promise<{ orderId: number }> {
    return this.commandBus.execute(
      new CreateOrderCommand(
        userId,
        productId,
        quantity,
      ),
    );
  }
}
```

`CommandBus.execute()`는 Command에 대응하는 Handler를 찾아 실행합니다.

반환값은 Handler의 실행 결과를 담은 Promise입니다.

### 7.2. 실행 흐름

```text
OrdersController
       |
       v
CommandBus.execute()
       |
       v
CreateOrderCommand
       |
       v
CreateOrderHandler.execute()
       |
       v
OrdersRepository
       |
       v
Database
       |
       v
Command Result
```

### 7.3. Command 실행 오류

CommandHandler에서 예외가 발생하면 `CommandBus.execute()`의 Promise가 거부될 수 있습니다.

```typescript
try {
  await this.commandBus.execute(
    new CreateOrderCommand(100, 200, 2),
  );
} catch (error) {
  // Command 실행 오류 처리
}
```

일반적인 HTTP 요청 중 발생한 예외는 NestJS의 Exception Filter를 통해 처리할 수 있습니다.

단, Saga가 비동기적으로 실행한 Command의 오류는 일반적인 HTTP 요청의 예외 처리 흐름과 다를 수 있습니다.

## 8. Query

Query는 애플리케이션 상태를 변경하지 않고 데이터를 조회하기 위한 요청을 표현합니다.

예를 들어 다음과 같은 작업을 Query로 정의할 수 있습니다.

- 주문 상세 조회
- 주문 목록 조회
- 사용자 프로필 조회
- 상품 검색
- 통계 데이터 조회

### 8.1. Query 정의

`orders/queries/impl/get-order.query.ts`

```typescript
import { Query } from '@nestjs/cqrs';

export interface OrderView {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  status: string;
}

export class GetOrderQuery extends Query<OrderView | null> {
  constructor(
    public readonly orderId: number,
  ) {
    super();
  }
}
```

`Query<TResult>`는 Query Handler의 반환 결과 타입을 지정합니다.

이 예제에서는 주문이 존재하면 `OrderView`를 반환하고, 존재하지 않으면 `null`을 반환합니다.

### 8.2. Query의 책임

Query는 조회 조건을 표현합니다.

```typescript
new GetOrderQuery(100)
```

실제 SQL 실행이나 데이터 조합 로직은 QueryHandler가 담당합니다.

Query 객체에 데이터베이스 접근 로직을 직접 포함하지 않는 것이 좋습니다.

## 9. QueryHandler

QueryHandler는 Query에 해당하는 조회 작업을 실행합니다.

### 9.1. 기본 구현

`orders/queries/handlers/get-order.handler.ts`

```typescript
import {
  IQueryHandler,
  QueryHandler,
} from '@nestjs/cqrs';

import {
  GetOrderQuery,
  OrderView,
} from '../impl/get-order.query';

import { OrdersReadRepository } from '../../repositories/orders-read.repository';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler
  implements IQueryHandler<GetOrderQuery>
{
  constructor(
    private readonly ordersReadRepository:
      OrdersReadRepository,
  ) {}

  async execute(
    query: GetOrderQuery,
  ): Promise<OrderView | null> {
    return this.ordersReadRepository.findById(
      query.orderId,
    );
  }
}
```

`OrdersReadRepository`는 조회 작업을 담당하는 데이터 접근 추상화라고 가정합니다.

### 9.2. 조회 최적화

QueryHandler에서는 조회 목적에 따라 필요한 데이터를 직접 구성할 수 있습니다.

예를 들어 주문 목록 API에서 필요한 필드만 조회할 수 있습니다.

```sql
SELECT
  o.id,
  o.user_id,
  o.status,
  o.created_at
FROM orders o
WHERE o.user_id = ?
ORDER BY o.created_at DESC
LIMIT ?;
```

CQRS를 적용했다고 해서 QueryHandler가 반드시 ORM Entity 전체를 반환해야 하는 것은 아닙니다.

조회 성능을 위해 필요한 컬럼만 선택하거나, JOIN 및 Projection을 활용할 수 있습니다.

## 10. QueryBus

`QueryBus`는 Query를 등록된 QueryHandler로 전달합니다.

### 10.1. QueryBus 주입

```typescript
import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { GetOrderQuery } from './queries/impl/get-order.query';

@Injectable()
export class OrdersQueryService {
  constructor(
    private readonly queryBus: QueryBus,
  ) {}

  findOne(orderId: number) {
    return this.queryBus.execute(
      new GetOrderQuery(orderId),
    );
  }
}
```

### 10.2. 실행 흐름

```text
OrdersController
       |
       v
QueryBus.execute()
       |
       v
GetOrderQuery
       |
       v
GetOrderHandler.execute()
       |
       v
Read Repository
       |
       v
Database
       |
       v
Query Result
```

### 10.3. CommandBus와 QueryBus 비교

| 구분 | CommandBus | QueryBus |
|---|---|---|
| 역할 | 변경 요청 전달 | 조회 요청 전달 |
| 입력 | Command | Query |
| Handler | CommandHandler | QueryHandler |
| 메서드 | `execute()` | `execute()` |
| 반환값 | Promise | Promise |
| 주된 관심사 | 비즈니스 규칙 및 상태 변경 | 조회 조건 및 데이터 표현 |

## 11. Controller에서 CQRS 사용

CQRS를 적용한 Controller는 직접 비즈니스 로직을 실행하기보다 CommandBus와 QueryBus에 작업을 위임할 수 있습니다.

### 11.1. 요청 DTO

`orders/dto/create-order.dto.ts`

```typescript
import {
  IsInt,
  IsPositive,
} from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  @IsPositive()
  productId!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;
}
```

DTO 검증에는 `class-validator`와 `class-transformer` 및 `ValidationPipe` 설정이 필요합니다.

관련 내용은 `validation.md`에서 다룹니다.

### 11.2. Controller 구현

```typescript
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
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
  create(
    @Body() dto: CreateOrderDto,
  ) {
    // 예제에서는 사용자 ID를 고정합니다.
    // 실제 서비스에서는 인증 Context에서 가져옵니다.
    const userId = 100;

    return this.commandBus.execute(
      new CreateOrderCommand(
        userId,
        dto.productId,
        dto.quantity,
      ),
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const order = await this.queryBus.execute(
      new GetOrderQuery(id),
    );

    if (!order) {
      throw new NotFoundException(
        `Order ${id} not found`,
      );
    }

    return order;
  }
}
```

Controller는 HTTP 요청과 CQRS 메시지를 연결하는 역할을 담당합니다.

Command 또는 Query를 직접 생성할 수도 있고, 별도의 Application Service를 통해 Bus를 호출할 수도 있습니다.

두 방식 모두 가능하며 프로젝트 규모와 비즈니스 로직 구성에 따라 선택할 수 있습니다.

## 12. Handler Provider 등록

CommandHandler와 QueryHandler는 NestJS의 Provider로 등록해야 합니다.

`orders/orders.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { OrdersController } from './orders.controller';
import { CreateOrderHandler } from './commands/handlers/create-order.handler';
import { GetOrderHandler } from './queries/handlers/get-order.handler';

import { OrdersRepository } from './repositories/orders.repository';
import { OrdersReadRepository } from './repositories/orders-read.repository';

const CommandHandlers = [
  CreateOrderHandler,
];

const QueryHandlers = [
  GetOrderHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [OrdersController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    OrdersRepository,
    OrdersReadRepository,
  ],
})
export class OrdersModule {}
```

이 예제에서는 `OrdersRepository`와 `OrdersReadRepository`가 NestJS Provider로 구현되어 있다고 가정합니다.

루트 모듈에서 `CqrsModule.forRoot()`를 호출하고, 기능 모듈에서는 필요한 CQRS Provider에 접근하도록 구성합니다.

Handler를 `providers`에 등록하지 않으면 해당 Command 또는 Query의 Handler를 찾지 못할 수 있습니다.

## 13. Event

Event는 애플리케이션에서 이미 발생한 사건을 표현합니다.

Command와 달리 Event는 특정 작업의 실행을 요청하는 것이 아니라 발생한 사실을 알립니다.

### 13.1. Event 정의

`orders/events/impl/order-created.event.ts`

```typescript
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: number,
    public readonly userId: number,
    public readonly occurredAt: Date,
  ) {}
}
```

이벤트 이름은 과거형을 사용하여 사건이 이미 발생했다는 사실을 나타내는 것이 일반적입니다.

### 13.2. Event Payload

Event에는 Listener가 후속 처리를 수행하는 데 필요한 데이터를 포함할 수 있습니다.

예를 들어 주문 생성 이벤트에는 다음 정보가 포함될 수 있습니다.

- 주문 식별자
- 사용자 식별자
- 이벤트 발생 시각
- 비즈니스 추적 식별자

이벤트 객체에 ORM Entity 전체나 민감한 정보를 무조건 포함하지 않는 것이 좋습니다.

## 14. EventBus

`EventBus`는 Event를 발행하고 등록된 EventHandler에 전달합니다.

### 14.1. EventBus 주입

```typescript
import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';

import { OrderCreatedEvent } from './events/impl/order-created.event';

@Injectable()
export class OrderEventPublisher {
  constructor(
    private readonly eventBus: EventBus,
  ) {}

  publishOrderCreated(
    orderId: number,
    userId: number,
  ): void {
    this.eventBus.publish(
      new OrderCreatedEvent(
        orderId,
        userId,
        new Date(),
      ),
    );
  }
}
```

### 14.2. Event 발행

```typescript
this.eventBus.publish(
  new OrderCreatedEvent(
    1001,
    100,
    new Date(),
  ),
);
```

Event는 여러 EventHandler가 구독할 수 있습니다.

```text
OrderCreatedEvent
        |
        v
     EventBus
        |
   +----+----+
   |         |
   v         v
Email     Statistics
Handler    Handler
```

### 14.3. Command와 Event의 차이

Command는 특정 작업을 수행해야 한다는 요청입니다.

반면 Event는 특정 사건이 발생했다는 사실을 알립니다.

예를 들어 다음과 같이 구분할 수 있습니다.

```text
CreateOrderCommand
        |
        v
CreateOrderHandler
        |
        v
   Order Saved
        |
        v
OrderCreatedEvent
```

이벤트 발행이 성공했다고 해서 모든 EventHandler의 처리가 완료되었다는 의미는 아닙니다.

## 15. EventHandler

EventHandler는 특정 Event를 수신하여 후속 처리를 수행합니다.

### 15.1. 기본 구현

```typescript
import {
  EventsHandler,
  IEventHandler,
} from '@nestjs/cqrs';

import { OrderCreatedEvent } from '../impl/order-created.event';

import { NotificationsService } from '../../notifications.service';

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler
  implements IEventHandler<OrderCreatedEvent>
{
  constructor(
    private readonly notificationsService:
      NotificationsService,
  ) {}

  async handle(
    event: OrderCreatedEvent,
  ): Promise<void> {
    await this.notificationsService.notifyOrderCreated(
      event.userId,
      event.orderId,
    );
  }
}
```

### 15.2. @EventsHandler()

```typescript
@EventsHandler(OrderCreatedEvent)
```

`@EventsHandler()`는 Handler가 처리할 Event 클래스를 지정합니다.

### 15.3. IEventHandler

```typescript
implements IEventHandler<OrderCreatedEvent>
```

EventHandler는 `handle()` 메서드를 구현합니다.

CommandHandler와 QueryHandler는 `execute()`를 사용하지만 EventHandler는 `handle()`을 사용합니다.

### 15.4. 여러 EventHandler

동일한 Event에 여러 Handler를 등록할 수 있습니다.

```text
OrderCreatedEvent
       |
       v
    EventBus
       |
       +-- OrderNotificationHandler
       |
       +-- OrderStatisticsHandler
       |
       +-- OrderAuditHandler
```

이러한 구조는 이벤트 발생 후 여러 부가 기능을 독립적으로 실행할 때 유용합니다.

다만 Handler의 실행 완료 순서까지 보장되는 것은 아니므로 Handler 간에 순서 의존성을 만들지 않는 것이 좋습니다.

## 16. AggregateRoot

AggregateRoot는 도메인 상태를 변경하는 메서드와 해당 변경에서 발생한 이벤트를 관리하는 데 사용합니다.

NestJS는 `@nestjs/cqrs` 패키지에서 `AggregateRoot` 클래스를 제공합니다.

### 16.1. Aggregate의 개념

DDD(Domain-Driven Design)에서 Aggregate는 일관성을 유지해야 하는 도메인 객체의 집합입니다.

Aggregate Root는 Aggregate 외부에서 접근하는 진입점이며, 내부 상태 변경 시 비즈니스 규칙을 유지하는 책임을 가집니다.

NestJS의 `AggregateRoot`는 여기에 이벤트 수집 및 발행 기능을 추가한 기반 클래스입니다.

### 16.2. AggregateRoot 구현

```typescript
import { AggregateRoot } from '@nestjs/cqrs';

import { OrderCancelledEvent } from './order-cancelled.event';

export class Order extends AggregateRoot {
  constructor(
    public readonly id: number,
    private status: 'CREATED' | 'CANCELLED',
  ) {
    super();
  }

  cancel(): void {
    if (this.status === 'CANCELLED') {
      throw new Error(
        'Order is already cancelled',
      );
    }

    this.status = 'CANCELLED';

    this.apply(
      new OrderCancelledEvent(this.id),
    );
  }

  getStatus(): string {
    return this.status;
  }
}
```

`OrderCancelledEvent`는 다음과 같이 정의할 수 있습니다.

```typescript
export class OrderCancelledEvent {
  constructor(
    public readonly orderId: number,
  ) {}
}
```

### 16.3. apply()

`apply()`는 Aggregate에서 발생한 Event를 등록합니다.

```typescript
this.apply(
  new OrderCancelledEvent(this.id),
);
```

기본 설정에서는 Event가 즉시 EventBus로 전달되지 않고 미발행 이벤트로 보관됩니다.

`autoCommit` 설정에 따라 동작이 달라질 수 있습니다.

### 16.4. commit()

`commit()`은 Aggregate에 누적된 미발행 이벤트를 발행하는 데 사용합니다.

```typescript
order.commit();
```

`AggregateRoot`가 적절한 EventPublisher와 연결되어 있어야 EventBus로 발행할 수 있습니다.

### 16.5. autoCommit

```typescript
export class Order extends AggregateRoot {
  constructor(
    public readonly id: number,
  ) {
    super();

    this.autoCommit = true;
  }
}
```

`autoCommit: true`를 설정하면 `apply()` 호출 시 이벤트를 자동으로 발행할 수 있습니다.

하지만 데이터베이스 트랜잭션이 완료되기 전에 이벤트가 발행될 수 있으므로, 데이터 정합성이 중요한 작업에서는 이벤트 발행 시점을 명시적으로 제어하는 것이 적절합니다.

## 17. EventPublisher

`EventPublisher`는 AggregateRoot와 EventBus를 연결하는 역할을 담당합니다.

### 17.1. mergeObjectContext()

```typescript
import {
  CommandHandler,
  EventPublisher,
  ICommandHandler,
} from '@nestjs/cqrs';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler
  implements ICommandHandler<CancelOrderCommand>
{
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    command: CancelOrderCommand,
  ): Promise<void> {
    const order = await this.ordersRepository.findById(
      command.orderId,
    );

    const aggregate =
      this.eventPublisher.mergeObjectContext(order);

    aggregate.cancel();

    await this.ordersRepository.save(aggregate);

    aggregate.commit();
  }
}
```

이 예제는 `OrdersRepository.findById()`가 `AggregateRoot`를 상속한 도메인 객체를 반환한다고 가정합니다.

또한 `CancelOrderCommand`와 Repository는 별도로 정의되어 있어야 합니다.

### 17.2. 처리 흐름

```text
CancelOrderCommand
        |
        v
CancelOrderHandler
        |
        v
Load Order Aggregate
        |
        v
EventPublisher.mergeObjectContext()
        |
        v
Order.cancel()
        |
        v
OrderCancelledEvent Applied
        |
        v
Persist Order
        |
        v
Aggregate.commit()
        |
        v
EventBus
        |
        v
EventHandlers
```

이 예제에서는 데이터베이스 저장이 성공한 후 `commit()`을 호출합니다.

그러나 데이터베이스 저장과 이벤트 발행이 하나의 원자적 작업으로 처리되는 것은 아닙니다.

저장 성공 직후 프로세스가 종료되면 이벤트가 발행되지 않을 수 있습니다.

이러한 문제는 별도의 이벤트 영속성 전략으로 해결해야 합니다.

### 17.3. AggregateRoot의 확장 방식

최신 `@nestjs/cqrs`는 AggregateRoot 기능을 구성하는 여러 방식을 지원합니다.

| 방식 | 설명 |
|---|---|
| `AggregateRoot` 상속 | 기본적인 도메인 객체 구현 |
| `WithAggregateRoot()` | 기존 클래스 상속 구조에 Aggregate 기능 결합 |
| `IAggregateRoot` 구현 | 사용자 정의 Aggregate 인터페이스 구현 |

기존 도메인 모델이 다른 기반 클래스를 상속해야 한다면 `WithAggregateRoot()`를 고려할 수 있습니다.

도메인 계층에서 NestJS 의존성을 최소화하려면 별도의 이벤트 수집 구조나 사용자 정의 Aggregate 구현을 사용할 수도 있습니다.

## 18. Saga

Saga는 여러 이벤트를 관찰하고, 해당 이벤트에 따라 새로운 Command를 생성하는 구성 요소입니다.

일반적으로 여러 단계로 이루어진 비즈니스 워크플로를 조정하는 데 사용합니다.

### 18.1. Saga의 역할

예를 들어 주문 생성 후 결제 요청을 실행하고, 결제 결과에 따라 후속 작업을 수행하는 흐름을 생각할 수 있습니다.

```text
CreateOrderCommand
        |
        v
OrderCreatedEvent
        |
        v
    OrdersSaga
        |
        v
RequestPaymentCommand
        |
        v
PaymentCommandHandler
```

Saga는 이벤트를 수신하고 새로운 Command를 생성합니다.

CommandBus는 Saga가 생성한 Command를 해당 CommandHandler로 전달합니다.

### 18.2. Saga 구현

```typescript
import { Injectable } from '@nestjs/common';

import {
  ICommand,
  ofType,
  Saga,
} from '@nestjs/cqrs';

import {
  Observable,
  map,
} from 'rxjs';

import { OrderCreatedEvent } from '../events/impl/order-created.event';
import { RequestPaymentCommand } from '../commands/impl/request-payment.command';

@Injectable()
export class OrdersSaga {
  @Saga()
  orderCreated = (
    events$: Observable<unknown>,
  ): Observable<ICommand> => {
    return events$.pipe(
      ofType(OrderCreatedEvent),
      map(
        (event) =>
          new RequestPaymentCommand(
            event.orderId,
          ),
      ),
    );
  };
}
```

`RequestPaymentCommand`는 별도로 정의된 Command 클래스입니다.

### 18.3. @Saga()

`@Saga()`는 해당 클래스의 속성이 Saga임을 표시합니다.

```typescript
@Saga()
```

Saga는 Event Stream을 입력받고 Command를 출력하는 Observable을 반환합니다.

### 18.4. ofType()

```typescript
ofType(OrderCreatedEvent)
```

`ofType()`은 RxJS Operator로, 전달된 Event Stream에서 지정한 Event 타입만 통과시킵니다.

### 18.5. map()

```typescript
map(
  (event) =>
    new RequestPaymentCommand(event.orderId),
)
```

`map()`은 Event를 새로운 Command로 변환합니다.

생성된 Command는 CQRS 모듈에 의해 CommandBus로 전달됩니다.

### 18.6. Saga Provider 등록

```typescript
@Module({
  providers: [
    OrdersSaga,
  ],
})
export class OrdersModule {}
```

Saga 역시 NestJS Provider로 등록해야 합니다.

### 18.7. Saga의 한계

기본적인 NestJS Saga는 애플리케이션 프로세스의 메모리에서 동작합니다.

따라서 다음 기능을 자동으로 제공하지 않습니다.

- 프로세스 재시작 후 작업 상태 복원
- 장기 워크플로의 영속적 진행 상태
- 메시지의 영구 보존
- 정확히 한 번 실행
- 외부 시스템 작업의 자동 보상

Saga에서 이벤트를 새로운 Command로 변환하는 구조만으로 분산 트랜잭션이 완성되는 것은 아닙니다.

## 19. Durable Saga와 Workflow

장시간 실행되는 업무나 프로세스 재시작 이후에도 이어져야 하는 작업은 영속적인 Workflow가 필요할 수 있습니다.

예를 들어 주문 생성 후 결제 승인, 재고 확보, 배송 준비를 수행하는 경우를 생각할 수 있습니다.

```text
Create Order
     |
     v
Request Payment
     |
     v
Reserve Inventory
     |
     v
Prepare Shipment
     |
     v
Complete Order
```

이 과정에서 프로세스가 중단되더라도 이전에 성공한 작업과 다음에 실행해야 하는 작업을 관리할 수 있어야 합니다.

최신 NestJS는 별도의 `@nestjs/workflows` 패키지와 CQRS 통합 기능을 제공합니다.

```bash
npm install @nestjs/workflows
```

관련 모듈은 다음과 같습니다.

```typescript
import { CqrsModule } from '@nestjs/cqrs';
import { WorkflowsModule } from '@nestjs/workflows';
import { WorkflowsCqrsModule } from '@nestjs/workflows/cqrs';
```

이러한 기능은 작업 상태를 외부 저장소에 영속적으로 관리하기 위한 구조입니다.

단, `@nestjs/cqrs`의 기본 Saga와 `@nestjs/workflows`의 Durable Workflow는 별개의 기능입니다.

영속적인 워크플로를 사용하려면 지원되는 데이터베이스, 트랜잭션 경계, 이벤트 발행 방식 및 실패 복구 정책을 추가로 구성해야 합니다.

특히 영속성을 확보하더라도 외부 결제 요청 같은 부수 효과는 재실행될 수 있으므로 Idempotency Key 등의 멱등성 전략이 필요합니다.

## 20. CQRS와 데이터베이스

CQRS는 읽기와 쓰기의 책임을 분리하는 패턴이지만 반드시 데이터베이스를 물리적으로 분리해야 하는 것은 아닙니다.

### 20.1. 단일 데이터베이스

가장 단순한 구조에서는 CommandHandler와 QueryHandler가 같은 데이터베이스를 사용할 수 있습니다.

```text
          NestJS
             |
      +------+------+
      |             |
      v             v
CommandHandler  QueryHandler
      |             |
      v             v
 Write Repo      Read Repo
      |             |
      +------+------+
             |
             v
          Database
```

이 구조에서는 코드 수준에서 읽기와 쓰기의 책임을 분리합니다.

물리적인 데이터베이스 분리는 필요하지 않습니다.

### 20.2. Read Model과 Write Model 분리

비즈니스 요구사항에 따라 조회 전용 모델을 구성할 수도 있습니다.

```text
CommandHandler
      |
      v
 Write Model
      |
      v
 Primary Database
      |
      v
 Data Synchronization
      |
      v
 Read Database
      |
      v
  QueryHandler
```

예를 들어 Write Model은 정규화된 관계형 테이블을 사용하고, Read Model은 검색과 집계에 적합한 구조로 구성할 수 있습니다.

### 20.3. 데이터 동기화

Read Model을 별도로 운영하면 Write Model의 변경 결과를 Read Model에 반영해야 합니다.

대표적인 동기화 방식은 다음과 같습니다.

- 애플리케이션 이벤트
- Transactional Outbox
- Change Data Capture(CDC)
- Message Broker
- Batch Synchronization

동기화 방식에 따라 데이터 변경이 Read Model에 즉시 반영되지 않을 수 있습니다.

따라서 Read Model이 최신 상태를 어느 정도까지 보장해야 하는지 정의해야 합니다.

### 20.4. Eventual Consistency

서로 다른 저장소를 사용하는 CQRS에서는 Eventual Consistency가 발생할 수 있습니다.

예를 들어 주문 생성 직후 Read Model을 조회하면 아직 주문 데이터가 반영되지 않았을 수 있습니다.

```text
CreateOrderCommand
        |
        v
Write Database Updated
        |
        v
HTTP 201 Response
        |
        v
GetOrderQuery
        |
        v
Read Model Not Updated Yet
        |
        v
Temporary Stale Result
```

이 문제는 시스템 설계에 따라 다음 방식으로 대응할 수 있습니다.

- Read Model 동기화 지연 허용
- 일정 시간 동안 Primary Database 조회
- 변경 결과를 Command 응답으로 반환
- Read Model 반영 완료 확인
- 데이터 버전 기반 조회

모든 CQRS 애플리케이션에서 Eventual Consistency가 발생하는 것은 아닙니다.

단일 데이터베이스를 사용하는 구조에서는 일반적인 데이터베이스 트랜잭션의 일관성을 활용할 수 있습니다.

## 21. CQRS와 Event Sourcing

CQRS와 Event Sourcing은 서로 다른 아키텍처 패턴입니다.

### 21.1. CQRS

CQRS는 데이터 변경과 조회의 책임을 분리합니다.

```text
Command -> Write Model
Query   -> Read Model
```

### 21.2. Event Sourcing

Event Sourcing은 현재 상태 자체를 저장하는 대신 상태를 변화시킨 이벤트들의 기록을 주요 데이터 원천으로 사용하는 패턴입니다.

```text
OrderCreated
     |
     v
PaymentCompleted
     |
     v
OrderShipped
     |
     v
Rebuild Current State
```

이벤트를 순서대로 재생하여 현재 상태를 복원할 수 있습니다.

### 21.3. 비교

| 항목 | CQRS | Event Sourcing |
|---|---|---|
| 핵심 목적 | 조회와 변경 책임 분리 | 상태 변경 이력 기반 저장 |
| 데이터 저장 방식 | 제한 없음 | 이벤트 로그 중심 |
| 읽기 모델 | 분리 가능 | Projection으로 생성 가능 |
| 이벤트 영속성 | 필수 아님 | 핵심 요구사항 |
| 이벤트 재생 | 필수 아님 | 핵심 기능 |
| 함께 사용 | 가능 | 가능 |

`AggregateRoot.apply()`나 `EventBus.publish()`를 사용한다고 해서 자동으로 Event Sourcing이 구현되는 것은 아닙니다.

Event Sourcing을 구현하려면 이벤트를 영속적으로 저장하고, 이를 재생하여 상태를 복원하는 별도의 Event Store 및 Projection 구조가 필요합니다.

## 22. CQRS와 EventEmitter 비교

NestJS는 이벤트 처리를 위해 `@nestjs/event-emitter`와 `@nestjs/cqrs`를 제공합니다.

두 패키지는 모두 이벤트 기반 후속 처리를 지원하지만 용도가 다릅니다.

| 항목 | EventEmitter | CQRS EventBus |
|---|---|---|
| 패키지 | `@nestjs/event-emitter` | `@nestjs/cqrs` |
| 이벤트 식별 | 이벤트 이름 또는 패턴 | Event 클래스 |
| 발행 API | `emit()` | `publish()` |
| 수신 Decorator | `@OnEvent()` | `@EventsHandler()` |
| 연계 기능 | 범용 이벤트 전달 | Command, Query, Saga |
| 기본 실행 범위 | 프로세스 내부 | 프로세스 내부 |
| 영속적 이벤트 저장 | 기본 제공하지 않음 | 기본 EventBus만으로 제공하지 않음 |

### 22.1. EventEmitter 활용

범용 애플리케이션 이벤트를 전달할 때 적합합니다.

```typescript
this.eventEmitter.emit(
  'user.created',
  event,
);
```

### 22.2. CQRS EventBus 활용

CQRS 기반의 Command 및 Query 처리 구조와 도메인 이벤트를 연결할 때 유용합니다.

```typescript
this.eventBus.publish(
  new UserCreatedEvent(userId),
);
```

두 방식 모두 기본적으로 동일 프로세스에서 동작합니다.

분산 환경에서 이벤트를 전달하려면 별도의 메시징 시스템 또는 Publisher 구현이 필요합니다.

## 23. CQRS와 Queue 비교

CQRS와 Queue는 서로 다른 문제를 해결합니다.

| 항목 | CQRS | Queue |
|---|---|---|
| 핵심 목적 | 읽기와 쓰기의 책임 분리 | 비동기 작업 저장 및 처리 |
| 주요 구성 요소 | Command, Query, Handler | Producer, Queue, Worker |
| 기본 저장소 | 필수 아님 | 일반적으로 외부 저장소 필요 |
| 재시도 | 별도 설계 | Queue별 재시도 기능 활용 |
| 작업 영속성 | 기본 제공하지 않음 | 저장소 설정에 따라 지원 |
| 수평 확장 | 추가 아키텍처 필요 | 여러 Worker 활용 가능 |

예를 들어 CQRS의 CommandHandler에서 Queue에 작업을 등록할 수 있습니다.

```text
CreateReportCommand
        |
        v
CreateReportHandler
        |
        v
BullMQ Producer
        |
        v
      Queue
        |
        v
      Worker
        |
        v
Generate Report
```

또는 Worker가 CQRS Command를 실행하도록 구성할 수도 있습니다.

이 경우 두 기술은 서로 경쟁하는 방식이 아니라 각자의 책임을 담당합니다.

## 24. 트랜잭션과 이벤트 발행

CQRS에서는 상태 변경과 이벤트 발행 사이의 정합성을 고려해야 합니다.

### 24.1. 이벤트 발행 시점

데이터베이스 트랜잭션이 완료되기 전에 이벤트를 발행하면 이후 Rollback이 발생하더라도 EventHandler가 실행될 수 있습니다.

```text
BEGIN TRANSACTION
        |
        v
Update Order
        |
        v
Publish Event
        |
        v
EventHandler Executed
        |
        v
ROLLBACK
```

이 경우 실제 주문 변경은 취소되었지만 알림 발송 등의 후속 작업은 이미 수행되었을 수 있습니다.

### 24.2. Commit 이후 발행

트랜잭션이 성공적으로 완료된 후 이벤트를 발행하면 이러한 문제를 일부 줄일 수 있습니다.

```text
BEGIN TRANSACTION
        |
        v
Update Order
        |
        v
COMMIT
        |
        v
Publish Event
```

하지만 Commit 직후 이벤트 발행 전에 프로세스가 종료되면 이벤트가 유실될 수 있습니다.

### 24.3. Transactional Outbox

Transactional Outbox는 비즈니스 데이터와 발행할 이벤트를 하나의 트랜잭션으로 저장하는 방식입니다.

```text
CommandHandler
      |
      v
Database Transaction
      |
      +-- Update Order
      |
      +-- Insert Outbox Event
      |
      v
    COMMIT
      |
      v
Outbox Publisher
      |
      v
Message Broker / Worker
```

이 구조는 데이터 변경과 이벤트 발행 대기 기록 사이의 원자성을 확보하는 데 유용합니다.

다만 이벤트의 중복 발행 가능성이 있으므로 소비 측에서도 멱등성을 고려해야 합니다.

최신 NestJS의 Durable Workflow와 CQRS 통합은 특정 트랜잭션 컨텍스트에서 이벤트를 영속적 워크플로와 연결하는 기능도 지원합니다. 해당 기능은 `@nestjs/cqrs` 및 `@nestjs/workflows` 버전과 저장소 지원 범위를 확인해야 합니다.

## 25. 오류 처리

CQRS에서는 Command, Query, Event의 오류 처리 방식이 서로 다릅니다.

### 25.1. CommandHandler 오류

CommandHandler에서 발생한 예외는 `CommandBus.execute()` 호출자에게 전달될 수 있습니다.

```typescript
await this.commandBus.execute(
  new CreateOrderCommand(
    100,
    200,
    2,
  ),
);
```

HTTP 요청 처리 중 발생한 오류는 적절한 Exception Filter에서 응답으로 변환할 수 있습니다.

### 25.2. QueryHandler 오류

QueryHandler의 오류도 `QueryBus.execute()`의 Promise를 통해 전달될 수 있습니다.

예를 들어 데이터베이스 연결 실패가 발생하면 해당 오류를 상위 계층에서 처리할 수 있습니다.

### 25.3. EventHandler 오류

EventHandler는 비동기적으로 실행될 수 있으므로 일반적인 HTTP Exception Filter가 모든 오류를 처리한다고 가정해서는 안 됩니다.

기본적으로 처리되지 않은 EventHandler 오류는 CQRS의 `UnhandledExceptionBus`로 전달될 수 있습니다.

### 25.4. UnhandledExceptionBus

`UnhandledExceptionBus`는 EventHandler나 Saga 등의 비동기 처리 과정에서 발생한 처리되지 않은 예외를 관찰하는 데 사용합니다.

```typescript
import {
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  UnhandledExceptionBus,
} from '@nestjs/cqrs';

import {
  Subject,
  takeUntil,
} from 'rxjs';

@Injectable()
export class CqrsExceptionObserver
  implements OnModuleDestroy
{
  private readonly destroy$ =
    new Subject<void>();

  constructor(
    private readonly unhandledExceptionBus:
      UnhandledExceptionBus,
  ) {
    this.unhandledExceptionBus
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe(({ exception, cause }) => {
        console.error(
          'CQRS unhandled exception',
          exception,
          cause,
        );
      });
  }

  onModuleDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

해당 Provider는 NestJS 모듈에 등록해야 합니다.

### 25.5. rethrowUnhandled

`CqrsModule.forRoot()`에서 오류 전파 정책을 설정할 수 있습니다.

```typescript
CqrsModule.forRoot({
  rethrowUnhandled: false,
});
```

기본값은 `false`입니다.

이 경우 처리되지 않은 예외는 `UnhandledExceptionBus`에 전달됩니다.

`true`로 설정하면 해당 예외를 다시 발생시키도록 구성할 수 있습니다.

다만 비동기 실행 과정에서 예외가 전파되는 위치는 일반적인 HTTP Handler와 다를 수 있으므로 실제 오류 처리 정책을 테스트해야 합니다.

## 26. Request Scope와 AsyncContext

NestJS의 CommandBus, QueryBus 및 EventBus는 기본적으로 Singleton Provider로 동작합니다.

하지만 특정 Handler에서 요청별 상태를 관리해야 하는 경우 Request Scope를 사용할 수 있습니다.

### 26.1. Request-scoped Handler

```typescript
import { Scope } from '@nestjs/common';

import {
  CommandHandler,
} from '@nestjs/cqrs';

@CommandHandler(CreateOrderCommand, {
  scope: Scope.REQUEST,
})
export class CreateOrderHandler {
  // 요청별 Handler 인스턴스
}
```

이 방식에서는 Command 실행에 따라 새로운 Handler 인스턴스를 생성할 수 있습니다.

### 26.2. AsyncContext

CQRS의 실행 주체는 HTTP 요청뿐 아니라 Queue Worker, Scheduler 또는 다른 비동기 작업일 수도 있습니다.

따라서 CQRS는 실행 Context를 전달하기 위한 `AsyncContext`를 제공합니다.

```typescript
import { AsyncContext } from '@nestjs/cqrs';

export class OrderRequestContext extends AsyncContext {
  constructor(
    public readonly userId: number,
    public readonly correlationId: string,
  ) {
    super();
  }
}
```

### 26.3. Context 전달

```typescript
const context = new OrderRequestContext(
  100,
  'correlation-123',
);

await this.commandBus.execute(
  new CreateOrderCommand(
    100,
    200,
    2,
  ),
  context,
);
```

Handler에서는 해당 Context를 주입받을 수 있습니다.

```typescript
import {
  Inject,
  Scope,
} from '@nestjs/common';

import { REQUEST } from '@nestjs/core';

import {
  CommandHandler,
} from '@nestjs/cqrs';

@CommandHandler(CreateOrderCommand, {
  scope: Scope.REQUEST,
})
export class CreateOrderHandler {
  constructor(
    @Inject(REQUEST)
    private readonly context: OrderRequestContext,
  ) {}

  async execute(command: CreateOrderCommand) {
    const userId = this.context.userId;

    // Command 처리
  }
}
```

### 26.4. AsyncContext의 활용

다음과 같은 정보를 CQRS 실행 흐름에 전달할 수 있습니다.

- 인증된 사용자 식별자
- Tenant ID
- Correlation ID
- Request ID
- 실행 환경 관련 메타데이터

다만 모든 Handler를 Request Scope로 구성하면 객체 생성 비용과 DI 관리 비용이 증가할 수 있습니다.

일반적으로 Singleton Handler를 우선 사용하고 요청별 Context가 필요한 경우에만 Request Scope를 적용하는 것이 좋습니다.

Saga는 장기적인 이벤트 스트림을 관찰하므로 Singleton으로 관리됩니다. 필요한 실행 Context는 Event 또는 Command에 연결하여 전달할 수 있습니다.

## 27. CQRS 테스트

CQRS에서는 각 Handler의 책임이 분리되어 있으므로 단위 테스트를 구성하기 쉽습니다.

### 27.1. CommandHandler 테스트

CommandHandler가 Repository에 올바른 저장 요청을 전달하는지 검증할 수 있습니다.

```typescript
import { Test } from '@nestjs/testing';

import { CreateOrderHandler } from './create-order.handler';
import { OrdersRepository } from '../../repositories/orders.repository';

describe('CreateOrderHandler', () => {
  const repositoryMock = {
    create: jest.fn(),
  };

  let handler: CreateOrderHandler;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef =
      await Test.createTestingModule({
        providers: [
          CreateOrderHandler,
          {
            provide: OrdersRepository,
            useValue: repositoryMock,
          },
        ],
      }).compile();

    handler = moduleRef.get(CreateOrderHandler);
  });

  it('creates an order', async () => {
    repositoryMock.create.mockResolvedValue({
      id: 1001,
    });

    const result = await handler.execute(
      new CreateOrderCommand(
        100,
        200,
        2,
      ),
    );

    expect(result).toEqual({
      orderId: 1001,
    });

    expect(repositoryMock.create)
      .toHaveBeenCalledWith({
        userId: 100,
        productId: 200,
        quantity: 2,
      });
  });
});
```

### 27.2. QueryHandler 테스트

```typescript
describe('GetOrderHandler', () => {
  const repositoryMock = {
    findById: jest.fn(),
  };

  it('returns an order', async () => {
    const handler = new GetOrderHandler(
      repositoryMock as unknown as OrdersReadRepository,
    );

    repositoryMock.findById.mockResolvedValue({
      id: 1001,
      status: 'CREATED',
    });

    const result = await handler.execute(
      new GetOrderQuery(1001),
    );

    expect(result).toEqual({
      id: 1001,
      status: 'CREATED',
    });
  });
});
```

### 27.3. Controller 테스트

Controller에서는 CommandBus와 QueryBus를 Mock으로 등록할 수 있습니다.

```typescript
const commandBusMock = {
  execute: jest.fn(),
};

const queryBusMock = {
  execute: jest.fn(),
};

const moduleRef =
  await Test.createTestingModule({
    controllers: [OrdersController],
    providers: [
      {
        provide: CommandBus,
        useValue: commandBusMock,
      },
      {
        provide: QueryBus,
        useValue: queryBusMock,
      },
    ],
  }).compile();
```

이를 통해 Controller가 적절한 Command 또는 Query를 실행하는지 확인할 수 있습니다.

### 27.4. 통합 테스트

통합 테스트에서는 다음 항목을 검증하는 것이 좋습니다.

1. Command와 Handler가 정상적으로 연결되는지 확인합니다.
2. Query와 Handler가 정상적으로 연결되는지 확인합니다.
3. Command 실행 결과가 올바르게 반환되는지 확인합니다.
4. Event가 등록된 EventHandler에 전달되는지 확인합니다.
5. Aggregate의 이벤트가 올바른 시점에 발행되는지 확인합니다.
6. Saga가 Event를 Command로 변환하는지 확인합니다.
7. 비동기 EventHandler 오류가 처리되는지 확인합니다.
8. 트랜잭션 실패 시 이벤트 발행 정책을 확인합니다.
9. Read Model 동기화가 필요한 경우 일관성 정책을 검증합니다.
10. 중요한 후속 작업의 재시도 및 멱등성 동작을 검증합니다.

## 28. CQRS 적용 시 주의사항

### 28.1. 단순한 CRUD에 무조건 적용하지 않습니다.

CQRS는 코드 구조를 체계적으로 분리하지만 추가적인 클래스를 생성하고 관리해야 합니다.

비즈니스 규칙이 단순한 애플리케이션에서는 일반적인 Service와 Repository 구조가 더 적절할 수 있습니다.

### 28.2. Command와 Query의 책임을 구분합니다.

Command는 상태 변경을 담당하고 Query는 조회를 담당하도록 설계하는 것이 좋습니다.

조회 과정에서 의도하지 않은 데이터 변경이 발생하지 않도록 주의해야 합니다.

### 28.3. Event를 Command처럼 사용하지 않습니다.

Event는 이미 발생한 사건을 의미합니다.

반드시 실행되어야 하는 핵심 작업을 단순히 EventHandler에 위임하면 실행 실패나 이벤트 유실에 대응하기 어려울 수 있습니다.

### 28.4. EventBus는 Message Broker가 아닙니다.

NestJS의 기본 EventBus는 동일한 프로세스 내부에서 동작합니다.

다른 Pod나 프로세스에 이벤트를 전달하려면 별도의 메시징 시스템이 필요할 수 있습니다.

### 28.5. Saga의 영속성을 가정하지 않습니다.

기본 Saga는 메모리 기반으로 동작하므로 장기 실행 작업의 복구를 자동으로 보장하지 않습니다.

### 28.6. 이벤트 발행과 트랜잭션 경계를 관리합니다.

데이터베이스 변경이 확정되기 전에 이벤트를 발행하면 정합성 문제가 발생할 수 있습니다.

Commit 이후 발행하더라도 이벤트 유실 가능성은 별도로 고려해야 합니다.

### 28.7. Read Model의 동기화 지연을 고려합니다.

Write Model과 Read Model을 물리적으로 분리하는 경우 Eventual Consistency가 발생할 수 있습니다.

서비스의 요구사항에 맞게 조회 정책을 정의해야 합니다.

### 28.8. Handler에 과도한 책임을 부여하지 않습니다.

Handler는 메시지 처리 흐름을 조정하고 필요한 비즈니스 로직을 실행하는 역할을 담당합니다.

복잡한 도메인 규칙을 모두 Handler에 직접 작성하면 코드가 다시 비대해질 수 있습니다.

필요한 경우 Domain Service 또는 Aggregate에 비즈니스 규칙을 배치하는 것이 좋습니다.

## 29. 실무 권장 프로젝트 구조

CQRS를 사용하는 프로젝트에서는 기능별 모듈을 기준으로 Command, Query 및 Event를 구성하는 방식이 적절합니다.

```text
src/
├── orders/
│   ├── application/
│   │   ├── commands/
│   │   │   ├── create-order.command.ts
│   │   │   ├── create-order.handler.ts
│   │   │   ├── cancel-order.command.ts
│   │   │   └── cancel-order.handler.ts
│   │   │
│   │   ├── queries/
│   │   │   ├── get-order.query.ts
│   │   │   ├── get-order.handler.ts
│   │   │   ├── get-orders.query.ts
│   │   │   └── get-orders.handler.ts
│   │   │
│   │   └── sagas/
│   │       └── orders.saga.ts
│   │
│   ├── domain/
│   │   ├── aggregates/
│   │   │   └── order.aggregate.ts
│   │   ├── events/
│   │   │   ├── order-created.event.ts
│   │   │   └── order-cancelled.event.ts
│   │   └── repositories/
│   │       └── orders.repository.interface.ts
│   │
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── order.entity.ts
│   │   │   └── orders.repository.ts
│   │   └── read-model/
│   │       └── orders-read.repository.ts
│   │
│   ├── presentation/
│   │   ├── dto/
│   │   │   ├── create-order.dto.ts
│   │   │   └── order-response.dto.ts
│   │   └── orders.controller.ts
│   │
│   └── orders.module.ts
│
├── app.module.ts
└── main.ts
```

위 구조는 CQRS와 계층형 아키텍처를 함께 적용한 예시입니다.

CQRS 자체가 특정 디렉터리 구조를 강제하지는 않습니다.

프로젝트의 복잡도에 따라 더 단순한 구조를 사용할 수 있습니다.

### 29.1. 구성 요소별 책임

| 구성 요소 | 책임 |
|---|---|
| Command | 상태 변경 요청 |
| CommandHandler | 변경 작업 조정 |
| Query | 조회 요청 |
| QueryHandler | 조회 작업 실행 |
| Domain Aggregate | 도메인 규칙과 상태 관리 |
| Domain Event | 발생한 도메인 사건 표현 |
| Saga | 이벤트 기반 후속 Command 생성 |
| Write Repository | 상태 저장 및 변경 |
| Read Repository | 조회에 최적화된 데이터 접근 |
| Controller | HTTP 요청과 CQRS 메시지 연결 |
| DTO | API 입력 및 출력 계약 |

### 29.2. 권장 사항

1. 비즈니스 복잡도에 따라 CQRS 적용 여부를 결정합니다.
2. Command와 Query의 역할을 명확히 구분합니다.
3. Handler는 NestJS Provider로 등록합니다.
4. Command와 Query의 반환 타입을 명시합니다.
5. CommandHandler의 트랜잭션 경계를 관리합니다.
6. Event는 이미 발생한 사건을 표현하도록 설계합니다.
7. 중요한 Event는 유실 및 중복 처리 가능성을 고려합니다.
8. Saga는 장기 작업의 영속성을 자동으로 보장하지 않는다는 점을 이해합니다.
9. Read Model과 Write Model은 필요에 따라 단계적으로 분리합니다.
10. Handler 단위 테스트와 전체 메시지 흐름의 통합 테스트를 함께 구성합니다.

## 30. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| CQRS | 조회와 변경 책임 분리 |
| `CqrsModule` | NestJS CQRS 기능 등록 |
| `Command` | 애플리케이션 상태 변경 요청 |
| `CommandHandler` | Command 처리 |
| `ICommandHandler` | Command Handler 인터페이스 |
| `CommandBus` | Command 전달 |
| `Query` | 데이터 조회 요청 |
| `QueryHandler` | Query 처리 |
| `IQueryHandler` | Query Handler 인터페이스 |
| `QueryBus` | Query 전달 |
| `Event` | 발생한 사건 |
| `EventsHandler` | Event Handler 등록 |
| `IEventHandler` | Event Handler 인터페이스 |
| `EventBus` | Event 전달 |
| `AggregateRoot` | 도메인 상태 및 이벤트 관리 |
| `EventPublisher` | Aggregate와 EventBus 연결 |
| `apply()` | Aggregate에 Event 적용 |
| `commit()` | 미발행 Event 발행 |
| `Saga` | Event를 수신하여 Command 생성 |
| `ofType()` | Event Stream 타입 필터링 |
| `UnhandledExceptionBus` | 처리되지 않은 CQRS 비동기 오류 관찰 |
| `AsyncContext` | CQRS 실행 Context 전달 |
| Read Model | 데이터 조회 모델 |
| Write Model | 데이터 변경 모델 |
| Event Sourcing | 이벤트 이력 기반 상태 저장 |
| Eventual Consistency | 데이터 모델 사이의 지연된 일관성 |
| Transactional Outbox | 데이터 변경과 이벤트 발행 기록의 원자성 확보 |

## 31. 정리

CQRS는 데이터 조회와 상태 변경의 책임을 분리하여 애플리케이션의 복잡성을 관리하는 아키텍처 패턴입니다.

NestJS는 `@nestjs/cqrs` 패키지를 통해 CommandBus, QueryBus, EventBus 및 관련 Handler를 제공합니다.

Command는 상태 변경 작업을 표현하고 CommandHandler에서 처리합니다.

Query는 데이터 조회 요청을 표현하고 QueryHandler에서 처리합니다.

Event는 이미 발생한 사건을 표현하며 여러 EventHandler가 이를 구독하여 후속 작업을 수행할 수 있습니다.

`AggregateRoot`와 `EventPublisher`를 활용하면 도메인 상태 변경에서 발생한 이벤트를 관리하고 발행할 수 있습니다.

Saga는 이벤트를 관찰하여 새로운 Command를 생성하는 방식으로 여러 단계의 비즈니스 흐름을 연결할 수 있습니다.

다만 기본 EventBus와 Saga는 프로세스 내부에서 동작하므로 이벤트의 영속성, 분산 전달 및 정확히 한 번 실행을 자동으로 보장하지 않습니다.

중요한 비즈니스 작업에서는 트랜잭션, Transactional Outbox, Message Broker, Durable Workflow 및 멱등성 전략을 함께 고려해야 합니다.

또한 CQRS의 적용이 반드시 읽기와 쓰기 데이터베이스의 물리적인 분리를 의미하지는 않습니다.

처음에는 CommandHandler와 QueryHandler만 분리하고, 조회량과 도메인 복잡도가 증가하면 Read Model과 Write Model을 독립적으로 발전시키는 방식도 가능합니다.

CQRS는 모든 애플리케이션에 필수적인 구조가 아닙니다.

프로젝트의 비즈니스 복잡도, 데이터 일관성 요구사항, 조회 성능 및 운영 환경을 기준으로 적용 범위를 결정하는 것이 중요합니다.

## 참고 자료

### NestJS 공식 문서

- [NestJS - CQRS](https://docs.nestjs.com/recipes/cqrs)
- [NestJS - Providers](https://docs.nestjs.com/providers)
- [NestJS - Modules](https://docs.nestjs.com/modules)
- [NestJS - Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [NestJS - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS - Events](https://docs.nestjs.com/techniques/events)
- [NestJS - Queues](https://docs.nestjs.com/techniques/queues)
- [NestJS - Database](https://docs.nestjs.com/techniques/database)
- [NestJS - Testing](https://docs.nestjs.com/fundamentals/testing)
- [NestJS - Durable Workflows](https://docs.nestjs.com/reliability/workflows)

### NestJS CQRS 구현 자료

- [NestJS CQRS GitHub Repository](https://github.com/nestjs/cqrs)
- [NestJS CQRS 공식 예제](https://github.com/nestjs/nest/tree/master/sample/21-cqrs)
- [NestJS CQRS AggregateRoot 구현](https://github.com/nestjs/cqrs/blob/master/src/aggregate-root.ts)
- [NestJS CQRS EventPublisher 구현](https://github.com/nestjs/cqrs/blob/master/src/event-publisher.ts)

### CQRS 및 아키텍처 패턴

- [Martin Fowler - CQRS](https://martinfowler.com/bliki/CQRS.html)
- [Microsoft - CQRS Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Microsoft - Event Sourcing Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [Microservices.io - Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [Microservices.io - Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [RxJS 공식 문서](https://rxjs.dev/)
- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/)