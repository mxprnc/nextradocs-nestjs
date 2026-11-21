# Microservices

## 1. 개요

Microservices는 애플리케이션을 비즈니스 기능 또는 도메인 경계에 따라 독립적으로 개발, 배포 및 확장할 수 있는 여러 서비스로 구성하는 아키텍처 스타일입니다.

각 서비스는 명확하게 정의된 책임을 가지며, HTTP API, RPC(Remote Procedure Call), 메시지 브로커 및 이벤트 기반 통신 등을 통해 다른 서비스와 상호작용합니다.

NestJS는 `@nestjs/microservices` 패키지를 통해 Microservices 기반 애플리케이션을 개발할 수 있는 기능을 제공합니다.

NestJS 공식 문서에서 Microservice는 기본적으로 HTTP 이외의 Transport Layer를 사용하는 애플리케이션으로 설명합니다.

이는 NestJS의 Microservice 프로그래밍 모델을 설명하기 위한 정의입니다. 일반적인 Microservices 아키텍처에서는 HTTP를 사용하는 독립 서비스도 Microservice에 해당할 수 있습니다.

NestJS의 주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| Microservice Application | 메시지를 수신하고 처리하는 NestJS 애플리케이션입니다. |
| Transport | 서비스 간 메시지를 전달하는 통신 방식을 정의합니다. |
| Message Pattern | Request-Response 메시지를 처리할 Handler를 식별합니다. |
| Event Pattern | 발행된 이벤트를 처리할 Handler를 식별합니다. |
| ClientProxy | 다른 Microservice에 요청이나 이벤트를 전달합니다. |
| Message Handler | 수신한 메시지 또는 이벤트를 처리합니다. |
| Payload | 메시지와 함께 전달되는 데이터를 나타냅니다. |
| Context | Transport별 메시지 메타데이터에 접근합니다. |
| RpcException | Microservice 메시지 처리 중 발생한 오류를 표현합니다. |

NestJS는 HTTP Controller와 유사한 데코레이터 기반 프로그래밍 모델을 제공하면서, 실제 메시지 전달 방식은 Transport에 위임합니다.

이 문서에서는 Microservices의 기본 아키텍처와 NestJS의 메시징 구조를 이해하고, TCP Transport를 이용한 구현 방법 및 분산 환경에서 고려해야 할 사항을 설명합니다.

---

## 2. Monolithic Architecture와 Microservices Architecture

### 2.1. Monolithic Architecture

Monolithic Architecture는 애플리케이션의 여러 기능을 하나의 배포 단위로 구성하는 방식입니다.

예를 들어 사용자, 주문, 결제 및 알림 기능을 하나의 애플리케이션에 포함할 수 있습니다.

```text
              Client
                 |
                 v
        Monolithic Application
                 |
       +---------+---------+
       |         |         |
       v         v         v
     Users     Orders    Payments
       |         |         |
       +---------+---------+
                 |
                 v
              Database
```

주요 특징은 다음과 같습니다.

- 하나의 애플리케이션으로 배포할 수 있습니다.
- 동일한 프로세스 내부에서 모듈을 호출할 수 있습니다.
- 초기 개발과 운영 구조가 비교적 단순합니다.
- 기능 간 데이터 일관성을 관리하기 쉽습니다.
- 특정 기능만 독립적으로 확장하기 어려울 수 있습니다.

다만 Monolithic Architecture가 반드시 유지보수가 어렵거나 확장성이 낮은 구조를 의미하지는 않습니다.

명확한 Module 경계와 Dependency 관리가 이루어진 Modular Monolith는 상당한 규모의 시스템에도 적합할 수 있습니다.

### 2.2. Microservices Architecture

Microservices Architecture에서는 비즈니스 기능을 독립적인 서비스로 분리합니다.

```text
                   Client
                      |
                      v
                 API Gateway
                      |
         +------------+------------+
         |            |            |
         v            v            v
    User Service  Order Service  Payment Service
         |            |            |
         v            v            v
      User DB      Order DB     Payment DB
```

각 서비스는 독립적으로 배포 및 확장할 수 있으며, 서비스 간 통신을 통해 전체 비즈니스 기능을 수행합니다.

일반적인 특징은 다음과 같습니다.

| 항목 | Monolithic | Microservices |
|---|---|---|
| 배포 단위 | 애플리케이션 전체 | 개별 서비스 |
| 확장 | 애플리케이션 단위 | 서비스별 확장 가능 |
| 서비스 간 호출 | 주로 프로세스 내부 호출 | 네트워크 통신 |
| 데이터 관리 | 공유 데이터베이스 사용 가능 | 서비스별 데이터 소유권 권장 |
| 장애 영향 | 공통 프로세스의 영향을 받음 | 장애 격리 가능 |
| 운영 복잡도 | 상대적으로 낮음 | 상대적으로 높음 |
| 데이터 일관성 | 로컬 트랜잭션 활용 용이 | 분산 일관성 관리 필요 |
| 관찰성 | 단일 애플리케이션 중심 | 분산 추적 필요 |

Microservices는 서비스별 확장성과 독립 배포를 제공하지만, 네트워크 장애, 데이터 일관성 및 운영 복잡도 등의 새로운 문제를 발생시킵니다.

따라서 모든 애플리케이션에서 Microservices가 Monolithic Architecture보다 우수한 것은 아닙니다.

---

## 3. Microservices의 핵심 설계 원칙

### 3.1. 독립적인 배포

Microservice는 다른 서비스 전체를 다시 배포하지 않고도 개별적으로 변경 및 배포할 수 있도록 설계하는 것이 좋습니다.

이를 위해 서비스 간 명확한 API 계약과 하위 호환성이 필요합니다.

### 3.2. 단일 책임과 서비스 경계

서비스 경계는 단순히 Controller 또는 Database Table 단위로 나누기보다 비즈니스 기능을 기준으로 결정하는 것이 좋습니다.

예를 들어 다음과 같이 구성할 수 있습니다.

```text
User Service
  - 사용자 등록
  - 사용자 정보 관리

Order Service
  - 주문 생성
  - 주문 상태 관리

Payment Service
  - 결제 승인
  - 결제 취소
```

Domain-Driven Design의 Bounded Context는 서비스 경계를 결정할 때 참고할 수 있는 개념입니다.

다만 Bounded Context와 Microservice가 반드시 일대일로 대응해야 하는 것은 아닙니다.

### 3.3. 데이터 소유권

각 서비스가 자신의 데이터에 대한 소유권을 가지도록 설계하는 것이 일반적으로 권장됩니다.

예를 들어 Order Service가 Payment Service의 데이터베이스 테이블을 직접 수정하는 방식은 서비스 사이의 결합도를 높입니다.

대신 API 또는 이벤트를 통해 필요한 작업을 요청하는 방식을 고려할 수 있습니다.

### 3.4. 장애 격리

서비스 간 네트워크 통신에서는 다음과 같은 장애가 발생할 수 있습니다.

- 연결 실패
- 응답 지연
- 요청 타임아웃
- 메시지 중복 전달
- 일시적인 서비스 중단
- 메시지 브로커 장애

따라서 Timeout, Retry, Circuit Breaker 및 Idempotency 등의 설계를 함께 고려해야 합니다.

---

## 4. NestJS Microservices 아키텍처

NestJS는 Transport를 통해 메시지를 전송하고, Pattern을 기준으로 적절한 Handler를 실행합니다.

```text
Client Application
        |
        v
    ClientProxy
        |
        | Message / Event
        v
    Transport
        |
        v
Microservice Server
        |
        v
  Pattern Matching
        |
        v
  Message Handler
        |
        v
      Service
        |
        v
  Business Logic
```

NestJS의 Microservice Handler는 일반적인 Controller 클래스에 정의할 수 있습니다.

단, HTTP 메서드 데코레이터 대신 `@MessagePattern()` 또는 `@EventPattern()`을 사용합니다.

### 4.1. 주요 데코레이터

| 데코레이터 | 역할 |
|---|---|
| `@MessagePattern()` | Request-Response 메시지를 처리합니다. |
| `@EventPattern()` | 이벤트 기반 메시지를 처리합니다. |
| `@Payload()` | 메시지 Payload를 추출합니다. |
| `@Ctx()` | Transport Context를 추출합니다. |

NestJS는 기존의 Module, Provider 및 Dependency Injection 구조를 Microservice에서도 활용합니다.

또한 Guard, Pipe, Interceptor 및 Exception Filter를 적용할 수 있습니다.

---

## 5. Transport

Transport는 Microservice 사이에서 메시지를 전달하는 통신 메커니즘입니다.

NestJS는 여러 Transport를 기본적으로 지원합니다.

| Transport | 주요 특징 | 대표적인 활용 |
|---|---|---|
| TCP | NestJS의 TCP 기반 메시징 | 간단한 서비스 간 RPC |
| Redis | Redis Pub/Sub 기반 메시징 | 가벼운 이벤트 전달 |
| MQTT | Topic 기반 메시징 | IoT 및 디바이스 통신 |
| NATS | Subject 기반 메시징 | 경량 서비스 간 통신 |
| RabbitMQ | Queue 및 Exchange 기반 메시징 | 비동기 작업 처리 |
| Kafka | 분산 Event Log 기반 메시징 | 대규모 이벤트 스트리밍 |
| gRPC | Protocol Buffers 및 HTTP/2 기반 RPC | 명시적인 서비스 계약 기반 통신 |

Transport마다 메시지 보존, 재전송, 라우팅, 처리 순서 및 장애 복구 특성이 다릅니다.

NestJS가 공통 프로그래밍 인터페이스를 제공하더라도 Transport 간의 의미론적 차이까지 제거하는 것은 아닙니다.

### 5.1. TCP

TCP Transport는 NestJS 서비스 간 통신을 위한 간단한 Transport입니다.

별도의 메시지 브로커 없이 서버와 클라이언트가 직접 연결합니다.

```text
Service A
    |
    | TCP
    v
Service B
```

NestJS의 TCP Transport는 일반 TCP 소켓 통신과 동일한 애플리케이션 프로토콜을 의미하지는 않습니다.

NestJS가 사용하는 메시지 직렬화 및 Pattern 처리 규약을 이해하는 클라이언트와 서버가 필요합니다.

### 5.2. Redis

NestJS Redis Transport는 Redis Pub/Sub 기능을 사용합니다.

```text
Publisher
    |
    v
Redis Pub/Sub
    |
    +-- Subscriber A
    |
    +-- Subscriber B
```

Redis Pub/Sub는 기본적으로 메시지를 영구 저장하지 않습니다.

따라서 Subscriber가 연결되지 않은 동안 발행된 메시지의 복구가 필요한 경우에는 다른 메시징 구조를 고려해야 합니다.

Redis Streams와 Redis Pub/Sub는 서로 다른 기능입니다.

NestJS의 기본 Redis Transport를 Redis Streams 기반의 내구성 있는 메시지 큐로 이해해서는 안 됩니다.

### 5.3. RabbitMQ

RabbitMQ는 Exchange, Queue 및 Binding을 이용하여 메시지를 전달하는 메시지 브로커입니다.

```text
Producer
    |
    v
 Exchange
    |
    v
   Queue
    |
    v
 Consumer
```

RabbitMQ는 메시지 확인 응답, 재전송, Queue 내구성 및 Dead Letter 처리 등을 지원합니다.

실제 전달 보장은 Queue, 메시지 지속성, Acknowledgement 및 브로커 설정에 따라 달라집니다.

### 5.4. Kafka

Kafka는 분산 Event Log 기반의 스트리밍 플랫폼입니다.

```text
Producer
    |
    v
  Topic
    |
    +-- Partition 0
    +-- Partition 1
    +-- Partition 2
    |
    v
Consumer Group
```

Kafka는 Topic과 Partition을 기반으로 이벤트를 저장하고 소비합니다.

Consumer는 Offset을 기준으로 이벤트를 처리하며, 보존된 이벤트를 다시 읽을 수 있습니다.

Kafka의 메시지 순서는 일반적으로 Partition 내부에서 보장됩니다.

전체 Topic에 대해 전역적인 순서가 자동으로 보장되는 것은 아닙니다.

### 5.5. NATS

NATS는 Subject 기반의 메시징 시스템입니다.

기본 NATS 메시징은 경량 Publish/Subscribe 및 Request-Reply 통신에 활용할 수 있습니다.

NATS JetStream은 메시지 영속성, 소비 상태 관리 및 재전송 등 추가적인 기능을 제공합니다.

기본 NATS와 JetStream의 메시지 전달 보장은 구분해야 합니다.

NestJS v12를 사용하는 경우 NATS Transport의 기반 드라이버가 NATS v3 계열로 변경되었으므로 버전별 패키지 요구사항을 확인해야 합니다.

### 5.6. gRPC

gRPC는 서비스 계약을 Protocol Buffers로 정의하고 RPC 방식으로 호출할 수 있도록 지원합니다.

```text
Client
   |
   | gRPC
   v
Service
   |
   v
Business Logic
```

gRPC는 Unary RPC뿐 아니라 Server Streaming, Client Streaming 및 Bidirectional Streaming을 지원합니다.

타입이 명확한 서비스 계약과 다양한 언어 간 통신이 필요한 경우 고려할 수 있습니다.

---

## 6. Request-Response와 Event-Based Messaging

NestJS Microservices는 두 가지 주요 메시징 패턴을 지원합니다.

### 6.1. Request-Response

Request-Response는 클라이언트가 메시지를 전송하고 처리 결과를 기다리는 방식입니다.

```text
Service A                    Service B
    |                            |
    |------ Request ------------>|
    |                            |
    |      Business Logic        |
    |                            |
    |<----- Response ------------|
    |                            |
```

NestJS에서는 `@MessagePattern()`과 `ClientProxy.send()`를 사용합니다.

Server:

```typescript
import {
  Controller,
} from '@nestjs/common';

import {
  MessagePattern,
  Payload,
} from '@nestjs/microservices';

@Controller()
export class MathController {
  @MessagePattern('sum')
  sum(@Payload() numbers: number[]): number {
    return numbers.reduce(
      (total, number) => total + number,
      0,
    );
  }
}
```

Client:

```typescript
const result$ = this.client.send<number>(
  'sum',
  [10, 20, 30],
);
```

`send()`는 Observable을 반환합니다.

Observable을 구독하거나 Promise로 변환하면 요청이 전송되고 응답을 받을 수 있습니다.

Request-Response는 조회, 계산 및 즉각적인 처리 결과가 필요한 작업에 적합합니다.

다만 응답을 받았다는 사실이 트랜잭션의 영구 반영까지 보장하는 것은 아닙니다.

### 6.2. Event-Based Messaging

Event-Based Messaging은 특정 사건이 발생했다는 사실을 다른 서비스에 전달하는 방식입니다.

```text
Order Service
      |
      | order.created
      v
 Message Transport
      |
      +-- Notification Service
      |
      +-- Analytics Service
```

NestJS에서는 `@EventPattern()`과 `ClientProxy.emit()`을 사용합니다.

Server:

```typescript
import {
  Controller,
} from '@nestjs/common';

import {
  EventPattern,
  Payload,
} from '@nestjs/microservices';

@Controller()
export class OrderEventsController {
  @EventPattern('order.created')
  handleOrderCreated(
    @Payload() event: { orderId: number },
  ): void {
    console.log(
      `Order created: ${event.orderId}`,
    );
  }
}
```

Client:

```typescript
this.client.emit(
  'order.created',
  { orderId: 100 },
).subscribe();
```

`emit()`도 Observable을 반환하며, `send()`와는 실행 방식 및 반환 의미가 다릅니다.

이벤트 발행의 성공은 비즈니스 Consumer가 모든 후속 작업을 완료했다는 의미가 아닙니다.

메시지의 실제 전달 및 처리 보장은 Transport와 Consumer의 구현에 따라 결정됩니다.

### 6.3. 비교

| 항목 | Request-Response | Event-Based |
|---|---|---|
| Server Decorator | `@MessagePattern()` | `@EventPattern()` |
| Client Method | `send()` | `emit()` |
| 응답 대기 | 예 | 비즈니스 응답 대기 없음 |
| 결합도 | 상대적으로 높음 | 낮출 수 있음 |
| 주요 활용 | 조회, 계산, 동기적 작업 | 알림, 후처리, 상태 변경 이벤트 |
| 오류 처리 | 호출자에게 응답 가능 | 별도 오류 및 재처리 전략 필요 |

---

## 7. Microservice 애플리케이션 생성

### 7.1. 패키지 설치

기존 NestJS 프로젝트에서 다음 패키지를 설치합니다.

```bash
npm install @nestjs/microservices
```

`@nestjs/microservices`는 NestJS의 핵심 패키지와 호환되는 버전을 사용해야 합니다.

TCP Transport 기반 예제는 별도의 외부 메시지 브로커를 필요로 하지 않습니다.

### 7.2. Microservice Bootstrap

`src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

import { AppModule } from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.createMicroservice<
      MicroserviceOptions
    >(AppModule, {
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 4001,
      },
    });

  await app.listen();
}

void bootstrap();
```

`NestFactory.createMicroservice()`는 HTTP 서버가 아닌 Microservice Transport Listener를 생성합니다.

`transport`는 통신 방식을 지정합니다.

`options`는 해당 Transport의 연결 및 동작 설정을 정의합니다.

### 7.3. Module 등록

```typescript
import { Module } from '@nestjs/common';

import { MathController } from './math.controller';

@Module({
  controllers: [MathController],
})
export class AppModule {}
```

Microservice의 Message Handler를 정의하는 클래스는 일반적으로 Controller로 등록합니다.

---

## 8. ClientProxy

`ClientProxy`는 NestJS 애플리케이션에서 다른 Microservice로 메시지를 전송하기 위한 추상화입니다.

주요 메서드는 다음과 같습니다.

| 메서드 | 역할 |
|---|---|
| `send()` | Request-Response 메시지를 전송합니다. |
| `emit()` | 이벤트를 발행합니다. |
| `connect()` | Transport 연결을 명시적으로 초기화합니다. |
| `close()` | Client 연결 및 관련 자원을 종료합니다. |

### 8.1. ClientsModule

`ClientsModule.register()`를 사용하여 ClientProxy를 Provider로 등록할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';

import {
  ClientsModule,
  Transport,
} from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 4001,
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MathClientModule {}
```

`name`은 Dependency Injection에 사용할 Provider Token입니다.

### 8.2. ClientProxy 주입

```typescript
import {
  Inject,
  Injectable,
} from '@nestjs/common';

import {
  ClientProxy,
} from '@nestjs/microservices';

import {
  firstValueFrom,
  timeout,
} from 'rxjs';

@Injectable()
export class MathClientService {
  constructor(
    @Inject('MATH_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  async sum(numbers: number[]): Promise<number> {
    return firstValueFrom(
      this.client
        .send<number>('sum', numbers)
        .pipe(timeout(3000)),
    );
  }
}
```

`firstValueFrom()`은 Observable에서 첫 번째 값을 Promise로 변환합니다.

`timeout(3000)`은 지정한 시간 동안 응답이 도착하지 않는 경우 Timeout 오류를 발생시킵니다.

다만 RxJS Timeout은 클라이언트가 응답을 기다리는 시간을 제한하는 것이며, 서버에서 이미 시작한 작업을 자동으로 중단하거나 롤백하지 않습니다.

### 8.3. ClientProxy의 연결 특성

`ClientProxy`는 Transport에 따라 연결을 지연 초기화할 수 있습니다.

따라서 운영 환경에서 외부 서비스 연결 여부를 시작 시점에 검증해야 한다면 `connect()`를 명시적으로 호출하는 방식을 고려할 수 있습니다.

또한 서비스 종료 시에는 ClientProxy의 연결 및 관련 자원을 정리해야 합니다.

---

## 9. TCP 기반 Microservices CRUD 예제

이번 절에서는 HTTP API Gateway와 Order Microservice를 분리하여 주문 생성 및 조회 기능을 구현합니다.

두 애플리케이션은 TCP Transport를 통해 통신합니다.

### 9.1. 아키텍처

```text
HTTP Client
     |
     | REST API
     v
API Gateway
Port: 3000
     |
     | TCP Request-Response
     v
Order Microservice
Port: 4001
     |
     v
OrdersService
     |
     v
In-memory Storage
```

API Gateway는 HTTP 요청을 수신합니다.

Order Microservice는 주문 관련 비즈니스 로직을 처리합니다.

이번 예제에서는 데이터베이스 대신 In-memory 저장소를 사용합니다.

### 9.2. 프로젝트 구조

```text
nestjs-microservices-example/
├── api-gateway/
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       └── orders/
│           ├── orders.module.ts
│           └── orders.controller.ts
│
└── order-service/
    └── src/
        ├── main.ts
        ├── app.module.ts
        └── orders/
            ├── orders.controller.ts
            ├── orders.service.ts
            ├── create-order.dto.ts
            └── order.interface.ts
```

두 디렉터리는 각각 독립적인 NestJS 프로젝트라고 가정합니다.

각 프로젝트에는 NestJS CLI가 생성하는 `package.json`, `tsconfig.json` 등의 기본 설정 파일이 존재해야 합니다.

예제를 위해 다음 두 프로젝트를 생성할 수 있습니다.

```bash
npx @nestjs/cli new api-gateway
npx @nestjs/cli new order-service
```

각 프로젝트에 Microservices 패키지를 설치합니다.

```bash
npm install @nestjs/microservices
```

### 9.3. Order Interface

`order-service/src/orders/order.interface.ts`

```typescript
export interface Order {
  id: number;
  productId: number;
  quantity: number;
  status: 'CREATED' | 'CANCELLED';
}
```

### 9.4. CreateOrderDto

`order-service/src/orders/create-order.dto.ts`

```typescript
export class CreateOrderDto {
  productId!: number;
  quantity!: number;
}
```

이 DTO는 예제를 위한 TypeScript 데이터 구조입니다.

런타임 요청 검증은 별도 Pipe와 검증 규칙을 추가해야 합니다.

### 9.5. OrdersService

`order-service/src/orders/orders.service.ts`

```typescript
import {
  Injectable,
} from '@nestjs/common';

import {
  RpcException,
} from '@nestjs/microservices';

import { Order } from './order.interface';
import { CreateOrderDto } from './create-order.dto';

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [];
  private nextId = 1;

  create(dto: CreateOrderDto): Order {
    const order: Order = {
      id: this.nextId++,
      productId: dto.productId,
      quantity: dto.quantity,
      status: 'CREATED',
    };

    this.orders.push(order);

    return order;
  }

  findAll(): Order[] {
    return this.orders;
  }

  findOne(id: number): Order {
    const order = this.orders.find(
      (order) => order.id === id,
    );

    if (!order) {
      throw new RpcException({
        code: 'ORDER_NOT_FOUND',
        message: `Order ${id} not found`,
      });
    }

    return order;
  }
}
```

Service는 주문 생성과 조회 로직을 담당합니다.

이 예제에서는 Microservice의 오류 전달을 설명하기 위해 `RpcException`을 사용합니다.

실무에서는 Service에서 도메인 예외를 발생시키고, Transport 경계에서 이를 `RpcException`으로 변환하는 방식도 고려할 수 있습니다.

### 9.6. OrdersController

`order-service/src/orders/orders.controller.ts`

```typescript
import {
  Controller,
} from '@nestjs/common';

import {
  MessagePattern,
  Payload,
} from '@nestjs/microservices';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './create-order.dto';

@Controller()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @MessagePattern('orders.create')
  create(
    @Payload() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(dto);
  }

  @MessagePattern('orders.findAll')
  findAll() {
    return this.ordersService.findAll();
  }

  @MessagePattern('orders.findOne')
  findOne(
    @Payload() id: number,
  ) {
    return this.ordersService.findOne(id);
  }
}
```

각 Message Pattern은 다음 작업을 담당합니다.

| Pattern | 작업 |
|---|---|
| `orders.create` | 주문 생성 |
| `orders.findAll` | 전체 주문 조회 |
| `orders.findOne` | 단일 주문 조회 |

### 9.7. Order Service AppModule

`order-service/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';

import {
  OrdersController,
} from './orders/orders.controller';

import {
  OrdersService,
} from './orders/orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class AppModule {}
```

### 9.8. Order Service Bootstrap

`order-service/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

import { AppModule } from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.createMicroservice<
      MicroserviceOptions
    >(AppModule, {
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 4001,
      },
    });

  await app.listen();
}

void bootstrap();
```

### 9.9. API Gateway OrdersController

`api-gateway/src/orders/orders.controller.ts`

```typescript
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import {
  ClientProxy,
} from '@nestjs/microservices';

import {
  catchError,
  firstValueFrom,
  timeout,
  TimeoutError,
  throwError,
} from 'rxjs';

interface CreateOrderRequest {
  productId: number;
  quantity: number;
}

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject('ORDER_SERVICE')
    private readonly orderClient: ClientProxy,
  ) {}

  private async request<T>(
    pattern: string,
    payload: unknown,
  ): Promise<T> {
    return firstValueFrom(
      this.orderClient
        .send<T>(pattern, payload)
        .pipe(
          timeout(3000),
          catchError((error: unknown) => {
            if (error instanceof TimeoutError) {
              return throwError(
                () => new HttpException(
                  'Order service timeout',
                  HttpStatus.GATEWAY_TIMEOUT,
                ),
              );
            }

            if (
              typeof error === 'object' &&
              error !== null &&
              'code' in error &&
              error.code === 'ORDER_NOT_FOUND'
            ) {
              return throwError(
                () => new HttpException(
                  'Order not found',
                  HttpStatus.NOT_FOUND,
                ),
              );
            }

            return throwError(
              () => new HttpException(
                'Order service unavailable',
                HttpStatus.BAD_GATEWAY,
              ),
            );
          }),
        ),
    );
  }

  @Post()
  create(
    @Body() dto: CreateOrderRequest,
  ) {
    return this.request(
      'orders.create',
      dto,
    );
  }

  @Get()
  findAll() {
    return this.request(
      'orders.findAll',
      {},
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.request(
      'orders.findOne',
      id,
    );
  }
}
```

이 Controller는 HTTP 요청을 Microservice 메시지로 변환합니다.

또한 간단한 Timeout과 오류 매핑을 제공합니다.

주의할 점은 TypeScript Interface가 런타임 검증을 제공하지 않는다는 것입니다.

운영 환경에서는 API Gateway에 별도의 DTO와 ValidationPipe를 적용하고, Microservice에서도 수신한 Payload를 검증해야 합니다.

### 9.10. API Gateway OrdersModule

`api-gateway/src/orders/orders.module.ts`

```typescript
import { Module } from '@nestjs/common';

import {
  ClientsModule,
  Transport,
} from '@nestjs/microservices';

import {
  OrdersController,
} from './orders.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ORDER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 4001,
        },
      },
    ]),
  ],
  controllers: [OrdersController],
})
export class OrdersModule {}
```

### 9.11. API Gateway AppModule

`api-gateway/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';

import {
  OrdersModule,
} from './orders/orders.module';

@Module({
  imports: [OrdersModule],
})
export class AppModule {}
```

### 9.12. API Gateway Bootstrap

`api-gateway/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);
}

void bootstrap();
```

### 9.13. 실행

먼저 Order Microservice를 실행합니다.

```bash
cd order-service
npm run start:dev
```

다른 터미널에서 API Gateway를 실행합니다.

```bash
cd api-gateway
npm run start:dev
```

주문 생성:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 100,
    "quantity": 2
  }'
```

응답 예시:

```json
{
  "id": 1,
  "productId": 100,
  "quantity": 2,
  "status": "CREATED"
}
```

전체 조회:

```bash
curl http://localhost:3000/orders
```

단일 조회:

```bash
curl http://localhost:3000/orders/1
```

이 예제에서는 HTTP API와 Order Microservice가 별도의 프로세스로 실행됩니다.

따라서 Order Microservice를 중단하면 API Gateway는 해당 서비스의 응답을 받을 수 없습니다.

실제 운영 환경에서는 서비스 검색, 연결 복구 및 장애 대응을 추가해야 합니다.

---

## 10. Event-Based Messaging 구현

Request-Response 대신 이벤트를 발행하여 비동기 후처리를 구성할 수도 있습니다.

### 10.1. 이벤트 구조

```typescript
export interface OrderCreatedEvent {
  eventId: string;
  orderId: number;
  occurredAt: string;
}
```

이벤트 식별자와 발생 시각은 중복 처리 및 추적에 활용할 수 있습니다.

### 10.2. Event Handler

```typescript
import {
  Controller,
} from '@nestjs/common';

import {
  EventPattern,
  Payload,
} from '@nestjs/microservices';

import { OrderCreatedEvent } from './order-created.event';

@Controller()
export class OrderEventsController {
  @EventPattern('order.created')
  async handleOrderCreated(
    @Payload() event: OrderCreatedEvent,
  ): Promise<void> {
    console.log(
      `Received order event: ${event.orderId}`,
    );
  }
}
```

해당 Controller는 Microservice의 Module에 등록해야 합니다.

### 10.3. 이벤트 발행

다음 예제는 `ClientProxy`가 주입된 Provider 내부에서 사용합니다.

```typescript
import {
  firstValueFrom,
} from 'rxjs';

await firstValueFrom(
  this.client.emit('order.created', {
    eventId: crypto.randomUUID(),
    orderId: 100,
    occurredAt: new Date().toISOString(),
  }),
);
```

Node.js의 `crypto.randomUUID()`는 프로젝트의 TypeScript 설정에 따라 `node:crypto`에서 명시적으로 Import하여 사용할 수도 있습니다.

이벤트 기반 구조에서는 Consumer가 메시지를 중복 수신하거나 재처리할 수 있다는 점을 고려해야 합니다.

---

## 11. Message Pattern과 Event Pattern의 차이

NestJS에서 Pattern은 메시지를 처리할 Handler를 식별하는 역할을 수행합니다.

Pattern에는 문자열 또는 객체 형태를 사용할 수 있습니다.

문자열 예제:

```typescript
@MessagePattern('orders.findOne')
findOne() {}
```

객체 예제:

```typescript
@MessagePattern({
  cmd: 'orders.findOne',
})
findOne() {}
```

발신 측의 Pattern과 수신 측의 Pattern은 서로 호환되어야 합니다.

Pattern은 NestJS의 라우팅 식별자이며, RabbitMQ의 Exchange Routing Key나 Kafka Topic과 항상 동일한 개념은 아닙니다.

실제 Transport에서는 Pattern이 Topic, Subject 또는 Queue의 메시지 처리 구조와 연결되는 방식이 다를 수 있습니다.

---

## 12. Message Context

Microservice Handler는 Transport별 Context 객체에 접근할 수 있습니다.

```typescript
import {
  Ctx,
  Payload,
  RmqContext,
  EventPattern,
} from '@nestjs/microservices';

@EventPattern('order.created')
handleOrderCreated(
  @Payload() data: unknown,
  @Ctx() context: RmqContext,
) {
  const channel = context.getChannelRef();
  const message = context.getMessage();

  // RabbitMQ message handling
}
```

Context는 Transport에 따라 서로 다른 메서드를 제공합니다.

| Context | 대표적인 정보 |
|---|---|
| `TcpContext` | TCP 메시지 관련 정보 |
| `RedisContext` | Redis 채널 정보 |
| `NatsContext` | NATS Subject 등 |
| `RmqContext` | RabbitMQ Channel 및 Message |
| `KafkaContext` | Kafka Topic, Partition, Offset 등 |
| `GrpcContext` | gRPC 호출 Context 관련 정보 |

일반적인 비즈니스 로직이 특정 Transport Context에 직접 의존하지 않도록 분리하면 Transport 변경에 따른 영향을 줄일 수 있습니다.

---

## 13. Hybrid Application

NestJS는 하나의 애플리케이션에서 HTTP 서버와 Microservice Listener를 함께 실행할 수 있습니다.

이러한 구성을 Hybrid Application이라고 합니다.

### 13.1. 아키텍처

```text
               NestJS Application
                       |
             +---------+---------+
             |                   |
             v                   v
        HTTP Server       TCP Microservice
             |                   |
             v                   v
       REST Controller     Message Handler
             |                   |
             +---------+---------+
                       |
                       v
                    Service
```

### 13.2. Hybrid Bootstrap

```typescript
import { NestFactory } from '@nestjs/core';

import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 4001,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}

void bootstrap();
```

이 구성에서는 HTTP 요청과 TCP 메시지를 동일한 NestJS 애플리케이션이 처리합니다.

다만 Hybrid Application은 프로세스를 공유하므로 개별 Transport Listener를 독립적인 서비스처럼 배포하거나 확장하는 구조와는 다릅니다.

### 13.3. Global Configuration 상속

Hybrid Application에서 HTTP 애플리케이션에 등록한 Global Pipe, Guard, Interceptor 및 Filter는 연결된 Microservice에 기본적으로 상속되지 않습니다.

상속하려면 다음과 같이 설정할 수 있습니다.

```typescript
app.connectMicroservice<MicroserviceOptions>(
  {
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 4001,
    },
  },
  {
    inheritAppConfig: true,
  },
);
```

`inheritAppConfig`를 사용할 경우 `app.useGlobalPipes()` 등의 설정을 `connectMicroservice()` 호출 전에 적용하는 것이 중요합니다.

---

## 14. Microservice의 Validation

Microservice에서도 Pipe를 이용하여 메시지 Payload를 검증할 수 있습니다.

### 14.1. DTO

```typescript
import {
  IsInt,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  @Min(1)
  productId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}
```

필요한 패키지:

```bash
npm install class-validator class-transformer
```

### 14.2. ValidationPipe

```typescript
import {
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import {
  RpcException,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new RpcException({
        code: 'VALIDATION_FAILED',
        message: 'Invalid order payload',
      }),
  }),
)
@MessagePattern('orders.create')
create(
  @Payload() dto: CreateOrderDto,
) {
  return this.ordersService.create(dto);
}
```

일반적인 HTTP ValidationPipe는 기본적으로 HTTP Exception을 발생시킵니다.

Microservice에서는 `RpcException` 또는 적절한 RPC 오류 처리 정책을 적용하는 것이 좋습니다.

또한 메시지 브로커에서 전달받은 데이터를 신뢰할 수 있다고 가정해서는 안 됩니다.

내부 서비스 간 통신이라도 데이터 검증은 필요합니다.

---

## 15. Exception Handling

Microservice에서는 HTTP 상태 코드만으로 오류를 표현하지 않습니다.

NestJS는 `RpcException`을 제공합니다.

### 15.1. RpcException

```typescript
import {
  RpcException,
} from '@nestjs/microservices';

throw new RpcException({
  code: 'ORDER_NOT_FOUND',
  message: 'Order not found',
});
```

`RpcException`은 메시지 처리 중 발생한 오류를 RPC 응답 또는 Transport에 적합한 오류 형태로 전달하는 데 사용됩니다.

### 15.2. Exception Filter

```typescript
import {
  ArgumentsHost,
  Catch,
} from '@nestjs/common';

import {
  BaseRpcExceptionFilter,
  RpcException,
} from '@nestjs/microservices';

@Catch(RpcException)
export class RpcExceptionFilter
  extends BaseRpcExceptionFilter
{
  catch(
    exception: RpcException,
    host: ArgumentsHost,
  ) {
    return super.catch(exception, host);
  }
}
```

이 Filter는 NestJS의 기본 RPC 예외 처리 동작을 확장하기 위한 출발점입니다.

실제 공통 오류 응답이 필요하다면 서비스별 Error Code와 메시지 계약을 정의해야 합니다.

### 15.3. HTTP 오류와 RPC 오류의 변환

API Gateway가 Microservice의 오류를 HTTP 클라이언트에 전달하는 경우 오류를 적절한 HTTP 상태 코드로 변환해야 합니다.

예를 들어 다음과 같은 매핑을 고려할 수 있습니다.

| RPC 오류 | HTTP 상태 코드 |
|---|---|
| `VALIDATION_FAILED` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `ORDER_NOT_FOUND` | 404 |
| `ORDER_CONFLICT` | 409 |
| `SERVICE_TIMEOUT` | 504 |
| 알 수 없는 원격 서비스 오류 | 502 또는 500 |

이는 애플리케이션 수준에서 정의하는 매핑 정책이며 NestJS가 자동으로 이러한 변환을 보장하는 것은 아닙니다.

---

## 16. Timeout, Retry, Circuit Breaker

분산 시스템에서는 원격 서비스가 항상 정상적으로 응답한다고 가정할 수 없습니다.

### 16.1. Timeout

Timeout은 요청이 지정한 시간 이내에 완료되지 않는 경우 대기를 중단하는 정책입니다.

```typescript
import {
  firstValueFrom,
  timeout,
} from 'rxjs';

const result = await firstValueFrom(
  this.client
    .send('orders.findOne', 100)
    .pipe(timeout(3000)),
);
```

Timeout은 클라이언트의 무한 대기를 방지합니다.

그러나 원격 서비스에서 진행 중인 작업을 자동으로 취소하는 것은 아닙니다.

### 16.2. Retry

Retry는 일시적인 오류가 발생했을 때 요청을 다시 시도하는 방식입니다.

```typescript
import {
  firstValueFrom,
  retry,
  timeout,
} from 'rxjs';

const result = await firstValueFrom(
  this.client
    .send('orders.findOne', 100)
    .pipe(
      timeout(3000),
      retry({
        count: 2,
        delay: 500,
      }),
    ),
);
```

위 코드는 최초 요청과 최대 2회의 재시도를 수행할 수 있습니다.

하지만 모든 작업에 Retry를 적용해서는 안 됩니다.

특히 주문 생성이나 결제 승인과 같은 상태 변경 작업에서는 Timeout 이후 서버에서 작업이 성공했을 가능성이 있습니다.

이 상황에서 동일 요청을 재전송하면 중복 처리가 발생할 수 있습니다.

따라서 Retry는 Idempotency와 함께 설계해야 합니다.

### 16.3. Circuit Breaker

Circuit Breaker는 원격 서비스의 장애가 지속되는 경우 추가 요청을 일시적으로 차단하여 장애 확산을 줄이는 패턴입니다.

대표적인 상태는 다음과 같습니다.

| 상태 | 설명 |
|---|---|
| Closed | 정상적으로 요청을 전달합니다. |
| Open | 원격 호출을 차단합니다. |
| Half-Open | 제한된 요청을 전송하여 복구 여부를 확인합니다. |

NestJS 자체의 Microservice Transport가 모든 Circuit Breaker 정책을 자동으로 제공하는 것은 아닙니다.

필요한 경우 별도의 라이브러리 또는 애플리케이션 수준의 Circuit Breaker 구현을 활용할 수 있습니다.

### 16.4. Bulkhead

Bulkhead는 서로 다른 작업 또는 원격 서비스에 사용되는 자원을 분리하여 장애 영향을 제한하는 패턴입니다.

예를 들어 Payment Service 호출과 Notification Service 호출에 별도의 동시성 제한을 적용할 수 있습니다.

---

## 17. 메시지 전달 보장

메시지 브로커를 사용한다고 해서 메시지가 정확히 한 번만 처리되는 것은 아닙니다.

대표적인 메시지 전달 모델은 다음과 같습니다.

| 모델 | 의미 | 고려사항 |
|---|---|---|
| At-most-once | 메시지가 최대 한 번 전달됩니다. | 메시지 손실 가능 |
| At-least-once | 메시지 재전달이 가능합니다. | 중복 처리 가능 |
| Exactly-once | 정의된 범위에서 중복 효과 없이 처리됩니다. | 추가적인 제약과 구현 필요 |

Exactly-once는 브로커의 특정 기능만으로 전체 비즈니스 처리에 자동 적용되는 보장이 아닙니다.

예를 들어 Kafka의 트랜잭션 기능이 있더라도 외부 데이터베이스나 외부 API 호출까지 자동으로 하나의 원자적 트랜잭션에 포함되지는 않습니다.

### 17.1. Idempotent Consumer

At-least-once 전달 환경에서는 동일한 메시지가 여러 번 수신될 수 있습니다.

따라서 Consumer는 동일한 이벤트를 여러 번 처리하더라도 비즈니스 결과가 중복되지 않도록 설계하는 것이 좋습니다.

예를 들어 다음과 같은 이벤트를 사용합니다.

```json
{
  "eventId": "evt-1001",
  "eventType": "order.created",
  "orderId": 100,
  "occurredAt": "2026-11-20T10:00:00Z"
}
```

Consumer는 `eventId`를 기준으로 이미 처리한 이벤트인지 확인할 수 있습니다.

단순한 In-memory 중복 제거는 프로세스 재시작이나 다중 인스턴스 환경에서 충분하지 않습니다.

실제 운영에서는 데이터베이스의 Unique Constraint 또는 트랜잭션 기반 중복 처리 방지 메커니즘을 고려할 수 있습니다.

---

## 18. Transactional Outbox Pattern

서비스가 데이터베이스 상태를 변경한 뒤 이벤트를 발행하는 경우 데이터베이스 Transaction과 메시지 발행 사이에서 불일치가 발생할 수 있습니다.

예를 들어 다음 순서를 살펴보겠습니다.

```text
Order Service
    |
    | 1. Save Order
    v
Database Commit
    |
    | 2. Publish Event
    v
Message Broker
```

데이터베이스 Commit 이후 이벤트 발행에 실패하면 주문은 저장되었지만 다른 서비스는 주문 생성 사실을 전달받지 못할 수 있습니다.

Transactional Outbox Pattern은 이러한 문제를 해결하기 위한 설계 방식입니다.

### 18.1. 동작 구조

```text
Order Service
      |
      v
Database Transaction
      |
      +-- Save Order
      |
      +-- Save Outbox Event
      |
      v
    Commit
      |
      v
Outbox Publisher
      |
      v
Message Broker
      |
      v
Event Consumer
```

서비스는 비즈니스 데이터와 Outbox 이벤트를 동일한 데이터베이스 Transaction으로 저장합니다.

별도의 Publisher가 Outbox Table에 저장된 이벤트를 조회하여 메시지 브로커에 발행합니다.

이 방식은 데이터베이스 변경과 이벤트 기록의 원자성을 확보하는 데 유용합니다.

다만 이벤트 발행 과정에서 중복 메시지가 발생할 수 있으므로 Consumer의 멱등성도 필요합니다.

---

## 19. Saga Pattern

Microservices 환경에서는 하나의 비즈니스 작업이 여러 서비스의 로컬 트랜잭션을 포함할 수 있습니다.

예를 들어 주문 처리 과정은 다음과 같이 구성할 수 있습니다.

```text
Create Order
     |
     v
Reserve Inventory
     |
     v
Process Payment
     |
     v
Confirm Order
```

각 작업이 서로 다른 서비스와 데이터베이스에서 실행되는 경우 하나의 로컬 데이터베이스 트랜잭션으로 전체 작업을 처리하기 어렵습니다.

Saga Pattern은 여러 Local Transaction과 실패 시 수행할 보상 작업(Compensating Action)을 조합하여 비즈니스 프로세스를 관리합니다.

### 19.1. Choreography

Choreography는 서비스가 이벤트를 발행하고 다른 서비스가 해당 이벤트에 반응하는 방식입니다.

```text
Order Service
    |
    | order.created
    v
Inventory Service
    |
    | inventory.reserved
    v
Payment Service
    |
    | payment.completed
    v
Order Service
```

중앙 Coordinator 없이 이벤트를 중심으로 작업이 진행됩니다.

서비스 사이의 직접적인 호출 결합도를 줄일 수 있지만, 전체 비즈니스 흐름을 추적하기 어려워질 수 있습니다.

### 19.2. Orchestration

Orchestration은 중앙 Coordinator가 각 서비스의 작업 순서를 제어하는 방식입니다.

```text
          Saga Orchestrator
                 |
        +--------+--------+
        |        |        |
        v        v        v
      Order   Inventory  Payment
      Service  Service   Service
```

전체 프로세스의 제어 흐름이 명확해지는 장점이 있습니다.

반면 Orchestrator의 상태 관리와 장애 복구 정책을 설계해야 합니다.

Saga는 일반적인 ACID 트랜잭션과 동일한 격리 수준이나 즉각적인 전역 원자성을 제공하지 않습니다.

---

## 20. RabbitMQ 기반 Microservices

RabbitMQ Transport는 메시지 Queue를 이용한 비동기 처리에 활용할 수 있습니다.

### 20.1. 패키지

```bash
npm install amqplib amqp-connection-manager
```

기존 NestJS 프로젝트에는 `@nestjs/microservices`도 필요합니다.

### 20.2. Microservice 설정

```typescript
import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

const app =
  await NestFactory.createMicroservice<
    MicroserviceOptions
  >(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'orders_queue',
      queueOptions: {
        durable: true,
      },
      noAck: false,
    },
  });

await app.listen();
```

### 20.3. Manual Acknowledgement

```typescript
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@EventPattern('order.created')
async handleOrderCreated(
  @Payload() data: unknown,
  @Ctx() context: RmqContext,
) {
  const channel = context.getChannelRef();
  const message = context.getMessage();

  await this.processOrderEvent(data);

  channel.ack(message);
}
```

`noAck: false`인 경우 Consumer는 메시지 처리 결과에 따라 Acknowledgement를 전송해야 합니다.

처리 완료 전에 Acknowledgement를 전송하면 이후 장애가 발생했을 때 작업 결과가 손실될 수 있습니다.

반대로 처리 후 Acknowledgement 전에 장애가 발생하면 메시지가 재전달될 수 있습니다.

이 때문에 RabbitMQ Consumer에서도 멱등성이 중요합니다.

---

## 21. Kafka 기반 Microservices

Kafka는 이벤트 스트리밍과 대량 메시지 처리에 적합한 Transport 중 하나입니다.

### 21.1. 패키지 설치

```bash
npm install kafkajs
```

기존 NestJS 프로젝트에는 `@nestjs/microservices`가 필요합니다.

### 21.2. Microservice 설정

```typescript
import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

const app =
  await NestFactory.createMicroservice<
    MicroserviceOptions
  >(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
      consumer: {
        groupId: 'orders-consumer',
      },
    },
  });

await app.listen();
```

### 21.3. Event Handler

```typescript
import {
  EventPattern,
  Payload,
} from '@nestjs/microservices';

@EventPattern('order.created')
async handleOrderCreated(
  @Payload() event: unknown,
) {
  await this.processOrderEvent(event);
}
```

Kafka에서는 Topic과 Partition을 중심으로 메시지가 저장됩니다.

같은 Consumer Group 내에서는 Partition이 Consumer들에게 할당되며, 하나의 Partition은 특정 시점에 일반적으로 하나의 Consumer가 담당합니다.

### 21.4. Kafka 사용 시 고려사항

- Topic과 Partition 구성
- Partition Key
- Consumer Group
- Offset Commit
- 재처리 및 중복 처리
- Consumer Lag
- 메시지 보존 기간
- Schema Evolution
- Rebalancing

Kafka는 메시지의 보존과 재처리에 유용하지만, 모든 실시간 WebSocket Push에 반드시 필요한 구성 요소는 아닙니다.

데이터 전달의 내구성, Replay 요구사항, 이벤트 처리량 등을 기준으로 도입 여부를 판단해야 합니다.

---

## 22. NATS 기반 Microservices

NATS는 Subject 기반 메시징을 제공하는 경량 메시징 시스템입니다.

### 22.1. Transport 설정

```typescript
import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

const app =
  await NestFactory.createMicroservice<
    MicroserviceOptions
  >(AppModule, {
    transport: Transport.NATS,
    options: {
      servers: ['nats://localhost:4222'],
    },
  });

await app.listen();
```

NestJS v12 기준 NATS Transport는 NATS v3 기반의 `@nats-io/transport-node` 패키지를 사용합니다.

이전 NestJS 버전에서는 의존성이 다를 수 있으므로 해당 버전의 공식 문서를 확인해야 합니다.

### 22.2. Subject 기반 메시징

```typescript
@EventPattern('market.price.updated')
handlePriceUpdated(
  @Payload() event: unknown,
) {
  // Handle market price event
}
```

NATS의 기본 Pub/Sub에서는 Subject를 통해 이벤트를 구독합니다.

메시지 보존과 재처리가 필요한 경우 NATS JetStream의 기능을 별도로 검토할 수 있습니다.

---

## 23. gRPC 기반 Microservices

gRPC는 Protocol Buffers 기반의 RPC Framework입니다.

### 23.1. 패키지 설치

```bash
npm install @grpc/grpc-js @grpc/proto-loader
```

### 23.2. Proto 파일

`proto/orders.proto`

```protobuf
syntax = "proto3";

package orders;

service OrdersService {
  rpc FindOne (FindOneRequest) returns (Order);
}

message FindOneRequest {
  int32 id = 1;
}

message Order {
  int32 id = 1;
  int32 productId = 2;
  int32 quantity = 3;
}
```

### 23.3. gRPC Transport 설정

```typescript
import {
  join,
} from 'node:path';

import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

const app =
  await NestFactory.createMicroservice<
    MicroserviceOptions
  >(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'orders',
      protoPath: join(
        process.cwd(),
        'proto/orders.proto',
      ),
      url: '127.0.0.1:50051',
    },
  });

await app.listen();
```

### 23.4. gRPC Handler

```typescript
import {
  GrpcMethod,
} from '@nestjs/microservices';

@GrpcMethod('OrdersService', 'FindOne')
findOne(data: { id: number }) {
  return this.ordersService.findOne(data.id);
}
```

gRPC의 주요 장점은 명확한 타입 계약, 다양한 언어 지원 및 Streaming RPC입니다.

다만 Protocol Buffers의 Schema 변경 규칙, 연결 관리, Deadline 및 오류 코드 등을 별도로 이해해야 합니다.

---

## 24. 서비스 간 데이터 일관성

Microservices에서는 여러 서비스가 각각 데이터를 저장할 수 있습니다.

따라서 서비스 간 데이터가 일시적으로 다른 상태를 가질 수 있습니다.

### 24.1. Strong Consistency

Strong Consistency는 데이터의 변경 사항을 읽기 시점에 일관되게 관찰할 수 있도록 하는 모델입니다.

정확한 보장 범위는 사용하는 저장소와 분산 시스템의 일관성 모델에 따라 달라집니다.

### 24.2. Eventual Consistency

Eventual Consistency는 업데이트 전파에 시간이 걸리더라도 새로운 변경이 없고 시스템이 정상적으로 동작한다면 최종적으로 데이터가 수렴하는 성질을 의미합니다.

예를 들어 Order Service에서 주문을 생성한 직후 Analytics Service에는 해당 주문이 아직 반영되지 않을 수 있습니다.

이벤트 전달과 처리가 완료되면 Analytics Service의 데이터가 갱신됩니다.

### 24.3. Read Model

조회 성능이나 서비스 간 결합도 감소를 위해 별도의 Read Model을 구축할 수 있습니다.

```text
Order Service
     |
     | order.created
     v
Event Transport
     |
     v
Analytics Service
     |
     v
Analytics Read Model
```

이러한 방식은 CQRS와 함께 활용할 수 있습니다.

---

## 25. Distributed Tracing

Microservices에서는 하나의 사용자 요청이 여러 서비스를 거칠 수 있습니다.

예를 들어 다음과 같은 호출 흐름이 발생할 수 있습니다.

```text
Client
   |
   v
API Gateway
   |
   v
Order Service
   |
   v
Payment Service
   |
   v
Inventory Service
```

각 서비스의 로그를 독립적으로 확인하는 것만으로는 전체 요청 흐름을 파악하기 어렵습니다.

Distributed Tracing은 서비스 사이의 요청 흐름을 추적하는 데 사용합니다.

### 25.1. Trace와 Span

| 개념 | 설명 |
|---|---|
| Trace | 하나의 분산 작업 전체를 나타냅니다. |
| Span | Trace 내부의 개별 작업을 나타냅니다. |
| Trace ID | 전체 Trace를 식별합니다. |
| Span ID | 특정 작업 단위를 식별합니다. |
| Context Propagation | 서비스 간 추적 정보를 전달합니다. |

### 25.2. Context Propagation

HTTP에서는 일반적으로 `traceparent` 등의 헤더를 사용할 수 있습니다.

메시지 브로커에서는 Transport별 Header 또는 Metadata를 통해 추적 정보를 전달할 수 있습니다.

NestJS는 Microservice 메시지 전송 시 Transport별 메타데이터를 다루기 위한 기능을 제공합니다.

다만 추적 정보가 실제로 전파되려면 Client와 Server의 계측 설정이 일관되어야 합니다.

OpenTelemetry는 이러한 분산 추적을 구현할 때 활용할 수 있는 표준 도구 중 하나입니다.

---

## 26. Kubernetes 기반 배포와 확장

Kubernetes 환경에서는 Microservice를 각각 독립적인 Deployment로 구성할 수 있습니다.

```text
                  API Gateway
                      |
          +-----------+-----------+
          |                       |
          v                       v
      Order Service         Payment Service
          |                       |
      +---+---+               +---+---+
      |       |               |       |
     Pod1    Pod2            Pod1    Pod2
```

### 26.1. Deployment

각 Microservice를 독립적인 Kubernetes Deployment로 구성하면 서비스별 Replica 수를 조정할 수 있습니다.

### 26.2. Service Discovery

Kubernetes Service를 사용하면 Pod의 변경과 관계없이 안정적인 서비스 이름으로 통신할 수 있습니다.

예를 들어 다음과 같은 주소를 사용할 수 있습니다.

```text
order-service.default.svc.cluster.local
```

TCP 기반 ClientProxy는 Kubernetes Service의 DNS 이름을 Host로 사용할 수 있습니다.

단, 연결 수립 이후에는 기존 TCP 연결이 특정 Pod에 유지될 수 있으므로 연결 재설정과 부하 분산 특성을 고려해야 합니다.

### 26.3. HPA

Microservice의 확장 기준은 서비스의 처리 특성에 따라 달라집니다.

대표적인 지표는 다음과 같습니다.

- CPU 사용률
- 메모리 사용률
- 요청 처리량
- 메시지 Queue Depth
- Consumer Lag
- 처리 지연
- 활성 작업 수

예를 들어 Kafka Consumer는 Replica 수를 증가시키더라도 Consumer Group의 Partition 수에 따라 병렬 처리 규모가 제한될 수 있습니다.

따라서 HPA는 실제 Transport의 병렬 처리 모델을 고려하여 구성해야 합니다.

### 26.4. Graceful Shutdown

서비스 종료 시 다음 사항을 고려해야 합니다.

1. 새로운 요청이나 메시지 수신을 중단합니다.
2. 진행 중인 작업을 정리합니다.
3. 필요한 메시지 Acknowledgement를 처리합니다.
4. 외부 연결 및 ClientProxy를 종료합니다.
5. 애플리케이션을 종료합니다.

NestJS에서는 Shutdown Hook을 활성화하여 애플리케이션 종료 처리에 활용할 수 있습니다.

```typescript
app.enableShutdownHooks();
```

실제 처리 중이던 메시지를 안전하게 종료하려면 Transport별 Consumer Shutdown 방식과 Kubernetes의 종료 유예 시간을 함께 설계해야 합니다.

---

## 27. Microservices 운영 모니터링

운영 환경에서는 서비스의 상태뿐 아니라 메시지 전달과 처리 상태를 관찰해야 합니다.

| 지표 | 목적 |
|---|---|
| Request Rate | 서비스 요청량 측정 |
| Error Rate | 오류 발생 비율 확인 |
| Response Latency | 응답 시간 측정 |
| Timeout Rate | 원격 호출 지연 및 실패 확인 |
| Retry Count | 재시도 발생량 측정 |
| Queue Depth | 처리 대기 메시지 수 확인 |
| Consumer Lag | Kafka 등의 메시지 처리 지연 확인 |
| Processing Duration | 메시지 처리 시간 측정 |
| Dead Letter Count | 처리 실패 메시지 수 확인 |
| Connection Count | 외부 서비스 연결 상태 확인 |
| CPU / Memory | 인스턴스 자원 사용량 확인 |

### 27.1. 관찰성 도구

대표적인 도구는 다음과 같습니다.

| 도구 | 주요 역할 |
|---|---|
| Prometheus | Metrics 수집 |
| Grafana | Metrics 시각화 |
| OpenTelemetry | Trace 및 계측 |
| Jaeger | Distributed Tracing 분석 |
| Loki | 로그 집계 |

Microservices에서는 요청 단위의 Correlation ID와 Trace ID를 일관되게 전파하는 것이 중요합니다.

---

## 28. Microservices와 WebSocket Gateway의 연계

Microservices는 WebSocket Gateway에 데이터를 전달하는 내부 통신 계층으로 활용할 수 있습니다.

예를 들어 Market Data Streaming 시스템을 다음과 같이 구성할 수 있습니다.

```text
Market Data Generator
          |
          v
   Market Data Service
          |
          v
      Routing Layer
          |
    +-----+-----+-----+
    |     |     |     |
    v     v     v     v
   WG1   WG3   WG8   ...
    |     |     |
    v     v     v
  Local Sessions
```

이 구성에서 각 구성 요소의 책임을 구분할 수 있습니다.

| 구성 요소 | 책임 |
|---|---|
| Market Data Generator | 시세 이벤트 생성 또는 Replay |
| Market Data Service | 이벤트 수집 및 가공 |
| Routing Layer | 이벤트 전달 대상 Gateway 결정 |
| WebSocket Gateway | 연결된 클라이언트에게 이벤트 전송 |
| Session Registry | Gateway 내부 연결 및 구독 상태 관리 |

### 28.1. 메시지 전달과 세션 관리의 분리

WebSocket Gateway는 자신에게 연결된 클라이언트의 Socket을 관리합니다.

Routing Layer는 종목별 구독자가 존재하는 Gateway를 찾아 이벤트를 전달할 수 있습니다.

이때 NestJS Microservice Transport는 Routing Layer와 Gateway 사이의 내부 메시지 전달에 활용할 수 있습니다.

다만 NestJS Microservice Transport를 사용한다고 해서 종목별 라우팅이나 세션 분산 기능이 자동으로 제공되는 것은 아닙니다.

이러한 기능은 별도의 애플리케이션 로직으로 구현해야 합니다.

### 28.2. Hot Symbol

특정 종목의 구독자가 많으면 동일한 종목의 세션을 여러 Gateway에 분산할 수 있습니다.

```text
             MSFT Event
                  |
                  v
            Routing Layer
                  |
        +---------+---------+
        |         |         |
        v         v         v
       WG1       WG3       WG8
        |         |         |
        v         v         v
      MSFT      MSFT      MSFT
    Sessions  Sessions  Sessions
```

Routing Layer는 MSFT 구독자가 존재하는 Gateway에만 해당 이벤트를 전달할 수 있습니다.

각 Gateway는 자신이 보유한 로컬 세션에 대해 Fan-out을 수행합니다.

이 방식은 특정 메시지 브로커나 Redis Pub/Sub를 반드시 요구하지 않습니다.

서비스 간 전송 방식은 처리량, 지연 시간, 장애 복구 및 메시지 전달 보장 요구사항에 따라 별도로 결정할 수 있습니다.

---

## 29. Spring Boot와 NestJS Microservices 비교

Java/Spring 환경과 NestJS는 모두 분산 서비스 개발을 지원하지만 프로그래밍 모델에 차이가 있습니다.

| 항목 | Spring Boot / Spring Cloud | NestJS |
|---|---|---|
| 서비스 구성 | Spring Boot Application | NestJS Application |
| Dependency Injection | Spring IoC Container | NestJS DI Container |
| 동기 HTTP 호출 | RestClient, WebClient, OpenFeign 등 | HttpModule, HTTP Client 등 |
| RPC | gRPC 등 | gRPC Transport |
| 메시지 처리 | Spring AMQP, Spring Kafka 등 | Microservice Transport |
| 메시지 Handler | `@KafkaListener`, `@RabbitListener` 등 | `@MessagePattern()`, `@EventPattern()` |
| Client 추상화 | 기술별 Client API | `ClientProxy` |
| Validation | Jakarta Bean Validation | Pipes 및 ValidationPipe |
| 오류 처리 | Exception Handler 등 | RpcException 및 RPC Filter |
| Circuit Breaker | Resilience4j 등 | 외부 라이브러리 또는 사용자 정의 구현 |
| 분산 추적 | Micrometer Tracing, OpenTelemetry 등 | OpenTelemetry 등 |

Spring Cloud의 모든 기능이 NestJS의 Microservices 패키지에 일대일로 대응하는 것은 아닙니다.

특히 서비스 검색, Configuration Server, Circuit Breaker, 분산 추적 및 메시지 브로커 운영 기능은 별도의 기술과 조합하여 구성해야 할 수 있습니다.

---

## 30. Microservices 설계 시 고려사항

### 30.1. 서비스 경계

- 비즈니스 기능 중심의 서비스 분리
- 서비스 간 책임 중복 방지
- 데이터 소유권 정의
- 서비스 간 호출 의존성 최소화
- 서비스 계약과 버전 관리

### 30.2. 메시지 설계

- Command와 Event 구분
- 메시지 Schema 정의
- 이벤트 식별자
- Correlation ID
- 이벤트 발생 시각
- Schema Evolution
- 메시지 크기 제한

### 30.3. 신뢰성

- Timeout
- Retry
- Circuit Breaker
- Idempotency
- Dead Letter 처리
- Transactional Outbox
- 메시지 재처리
- 장애 복구 전략

### 30.4. 성능과 확장

- 서비스별 처리량 측정
- Queue 및 Consumer 병렬성
- 메시지 직렬화 비용
- 네트워크 지연
- Connection Pool
- Backpressure
- HPA 및 Custom Metrics

### 30.5. 보안

- 서비스 간 인증
- 서비스별 인가
- TLS 및 mTLS
- 비밀 정보 관리
- 메시지 Payload 검증
- 민감한 정보 암호화
- 감사 로그

내부 네트워크에서 통신한다는 이유만으로 메시지와 호출자를 신뢰해서는 안 됩니다.

---

## 31. 정리

Microservices는 애플리케이션을 독립적인 서비스로 나누어 개발, 배포 및 확장할 수 있도록 설계하는 아키텍처 스타일입니다.

NestJS는 `@nestjs/microservices`를 통해 여러 Transport를 공통적인 프로그래밍 모델로 사용할 수 있도록 지원합니다.

주요 내용을 정리하면 다음과 같습니다.

1. Microservices는 서비스별 책임과 데이터 소유권을 명확하게 정의하는 것이 중요합니다.
2. NestJS는 TCP, Redis, MQTT, NATS, RabbitMQ, Kafka 및 gRPC Transport를 지원합니다.
3. `@MessagePattern()`은 Request-Response 메시지를 처리합니다.
4. `@EventPattern()`은 Event-Based Messaging을 처리합니다.
5. `ClientProxy.send()`는 응답이 필요한 원격 메시지를 전송합니다.
6. `ClientProxy.emit()`은 이벤트를 발행합니다.
7. Hybrid Application은 HTTP와 Microservice Listener를 하나의 NestJS 애플리케이션에서 함께 실행할 수 있도록 합니다.
8. Microservice에서도 Pipe, Guard, Interceptor 및 Exception Filter를 활용할 수 있습니다.
9. Timeout, Retry, Circuit Breaker 및 Idempotency는 분산 환경에서 중요한 설계 요소입니다.
10. Transactional Outbox와 Saga는 서비스 간 데이터 일관성을 관리하기 위한 패턴입니다.
11. Kubernetes에서는 서비스별 확장, 서비스 검색, Graceful Shutdown 및 모니터링을 고려해야 합니다.
12. Microservices는 WebSocket Gateway와 같은 실시간 통신 계층의 내부 데이터 전달 구조에도 활용할 수 있습니다.

Microservices의 핵심은 단순히 서비스를 여러 프로세스로 나누는 것이 아니라 서비스 사이의 책임, 데이터 소유권, 통신 계약 및 장애 경계를 명확하게 설계하는 데 있습니다.

따라서 Microservices 도입 여부는 독립 배포의 필요성, 조직 구조, 서비스별 확장 요구사항 및 분산 시스템의 운영 비용을 함께 고려하여 결정해야 합니다.

---

## 32. 관련 문서

| 문서 | 주요 내용 |
|---|---|
| `01-fundamentals/modules.md` | Module 구성 |
| `01-fundamentals/providers.md` | Provider 및 Service |
| `01-fundamentals/dependency-injection.md` | Dependency Injection |
| `02-request-lifecycle/pipes.md` | 메시지 Payload 검증 |
| `02-request-lifecycle/guards.md` | 인증 및 인가 |
| `02-request-lifecycle/interceptors.md` | 메시지 처리 확장 |
| `02-request-lifecycle/exception-filters.md` | 예외 처리 |
| `03-techniques/database.md` | 데이터베이스 접근 |
| `03-techniques/queues.md` | 비동기 작업 처리 |
| `03-techniques/events.md` | 이벤트 처리 |
| `03-techniques/http-module.md` | HTTP 기반 서비스 호출 |
| `03-techniques/cqrs.md` | CQRS |
| `05-platforms/rest-api.md` | REST API |
| `05-platforms/websocket.md` | WebSocket Gateway |
| `07-architecture/modular-monolith.md` | Modular Monolith |
| `07-architecture/cqrs-pattern.md` | CQRS Pattern |
| `08-deployment/graceful-shutdown.md` | Graceful Shutdown |
| `08-deployment/performance.md` | 성능 및 확장 |
| `09-examples/microservices/` | Microservices 구현 예제 |

---

## 참고 자료

### NestJS 공식 문서

- [NestJS — Microservices Basics](https://docs.nestjs.com/microservices/basics)
- [NestJS — Redis Transport](https://docs.nestjs.com/microservices/redis)
- [NestJS — MQTT Transport](https://docs.nestjs.com/microservices/mqtt)
- [NestJS — NATS Transport](https://docs.nestjs.com/microservices/nats)
- [NestJS — RabbitMQ Transport](https://docs.nestjs.com/microservices/rabbitmq)
- [NestJS — Kafka Transport](https://docs.nestjs.com/microservices/kafka)
- [NestJS — gRPC Transport](https://docs.nestjs.com/microservices/grpc)
- [NestJS — Custom Transporters](https://docs.nestjs.com/microservices/custom-transport)
- [NestJS — Microservice Exception Filters](https://docs.nestjs.com/microservices/exception-filters)
- [NestJS — Microservice Pipes](https://docs.nestjs.com/microservices/pipes)
- [NestJS — Microservice Guards](https://docs.nestjs.com/microservices/guards)
- [NestJS — Microservice Interceptors](https://docs.nestjs.com/microservices/interceptors)
- [NestJS — Hybrid Application](https://docs.nestjs.com/faq/hybrid-application)

### 메시지 브로커 공식 문서

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/docs)
- [NATS Documentation](https://docs.nats.io/)
- [Redis Pub/Sub](https://redis.io/docs/latest/develop/interact/pubsub/)
- [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/)
- [MQTT Specification](https://mqtt.org/mqtt-specification/)

### gRPC

- [gRPC 공식 문서](https://grpc.io/docs/)
- [Protocol Buffers Documentation](https://protobuf.dev/)
- [gRPC Node.js Documentation](https://grpc.io/docs/languages/node/)

### 분산 시스템 및 아키텍처

- [Microservices.io — Microservice Architecture](https://microservices.io/patterns/microservices.html)
- [Microservices.io — Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [Microservices.io — Saga](https://microservices.io/patterns/data/saga.html)
- [Microservices.io — Idempotent Consumer](https://microservices.io/patterns/communication-style/idempotent-consumer.html)
- [Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html)
- [Martin Fowler — Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)

### 관찰성 및 운영

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Kubernetes — Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes — Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes — Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)

### 기타 참고 자료

- [Spring Cloud](https://spring.io/projects/spring-cloud)
- [Spring for Apache Kafka](https://spring.io/projects/spring-kafka)
- [Spring AMQP](https://spring.io/projects/spring-amqp)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)
- [NestJS Official Examples](https://github.com/nestjs/nest/tree/master/sample)