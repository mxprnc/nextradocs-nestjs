# WebSocket

## 1. 개요

WebSocket은 클라이언트와 서버 사이에 지속적인 연결을 설정하고, 해당 연결을 통해 양방향(Full-Duplex) 통신을 수행할 수 있도록 정의된 통신 프로토콜입니다.

일반적인 HTTP 요청·응답 방식과 달리, WebSocket은 연결이 수립된 이후 클라이언트의 추가 HTTP 요청 없이도 서버가 클라이언트에 메시지를 전달할 수 있습니다.

이러한 특성으로 인해 실시간 데이터 전송이 필요한 애플리케이션에서 활용됩니다.

대표적인 활용 사례는 다음과 같습니다.

- 실시간 채팅 및 메시징
- 주식 시세 및 시장 데이터 스트리밍
- 실시간 알림
- 실시간 대시보드
- 온라인 게임
- 협업 애플리케이션
- 실시간 상태 변경 이벤트 전달

NestJS는 `@nestjs/websockets` 패키지를 통해 WebSocket 기반 애플리케이션을 개발할 수 있는 기능을 제공합니다.

NestJS의 WebSocket 통신은 Gateway를 중심으로 구성되며, Adapter를 통해 실제 WebSocket 통신 라이브러리와 연결됩니다.

주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| WebSocket Gateway | WebSocket 연결과 메시지를 처리합니다. |
| WebSocket Adapter | WebSocket 라이브러리와 NestJS를 연결합니다. |
| WebSocket Server | 클라이언트 연결을 수락하고 메시지를 송수신합니다. |
| WebSocket Client | 서버에 연결하고 메시지를 송수신합니다. |
| Message Handler | 클라이언트가 전송한 특정 이벤트를 처리합니다. |
| Lifecycle Hook | 연결 수립, 연결 해제 및 서버 초기화 시점을 처리합니다. |
| Provider | 메시지 처리에 필요한 비즈니스 로직을 수행합니다. |

이 문서에서는 WebSocket의 프로토콜 동작 방식과 NestJS Gateway의 구조를 이해하고, Socket.IO 및 `ws` 기반의 구현 방법을 설명합니다.

---

## 2. WebSocket의 등장 배경

### 2.1. HTTP Polling

일반적인 HTTP 요청·응답 방식에서는 클라이언트가 요청을 전송해야 서버가 응답을 반환합니다.

서버에서 데이터가 변경되었는지 지속적으로 확인하려면 클라이언트가 반복적으로 HTTP 요청을 전송해야 합니다.

```text
Client                         Server
  |                              |
  |------ GET /prices/MSFT ----->|
  |<--------- Price 100 ---------|
  |                              |
  |------ GET /prices/MSFT ----->|
  |<--------- Price 100 ---------|
  |                              |
  |------ GET /prices/MSFT ----->|
  |<--------- Price 101 ---------|
  |                              |
```

이러한 방식을 Polling이라고 합니다.

Polling은 구현이 단순하지만, 데이터가 변경되지 않았더라도 요청과 응답이 반복적으로 발생합니다.

또한 Polling 주기에 따라 데이터 변경 사실을 확인하는 시점이 지연될 수 있습니다.

### 2.2. Long Polling

Long Polling은 클라이언트가 요청을 전송한 뒤 서버가 새로운 데이터나 타임아웃이 발생할 때까지 응답을 보류하는 방식입니다.

```text
Client                         Server
  |                              |
  |------ GET /events ---------->|
  |                              |
  |       Waiting for Event      |
  |                              |
  |<--------- New Event ---------|
  |                              |
  |------ GET /events ---------->|
  |                              |
```

Long Polling은 일반적인 Polling보다 불필요한 응답을 줄일 수 있지만, 이벤트를 수신한 이후에는 다음 요청을 다시 전송해야 합니다.

### 2.3. WebSocket

WebSocket은 최초 연결 수립 이후 동일한 연결을 유지하면서 메시지를 송수신합니다.

```text
Client                         Server
  |                              |
  |------ WebSocket Handshake -->|
  |<----- Switching Protocols ---|
  |                              |
  |<======== Connected =========>|
  |                              |
  |------ Subscribe MSFT ------->|
  |                              |
  |<--------- Price 100 ---------|
  |<--------- Price 101 ---------|
  |<--------- Price 102 ---------|
  |                              |
  |------ Unsubscribe MSFT ----->|
  |                              |
```

WebSocket에서는 클라이언트와 서버가 독립적으로 메시지를 전송할 수 있습니다.

이는 데이터가 변경될 때 서버가 해당 정보를 즉시 전달해야 하는 실시간 서비스에 적합합니다.

---

## 3. WebSocket 프로토콜

### 3.1. 연결 수립

전통적인 WebSocket 연결은 HTTP/1.1 Upgrade Handshake를 통해 시작됩니다.

클라이언트는 다음과 같은 요청을 전송합니다.

```http
GET /stream HTTP/1.1
Host: localhost:3000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

서버가 연결을 수락하면 다음과 같은 응답을 반환합니다.

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

연결이 수립된 이후에는 HTTP 요청·응답 메시지가 아니라 WebSocket Frame을 통해 데이터를 송수신합니다.

WebSocket은 HTTP/2와 HTTP/3에서도 확장된 CONNECT 메커니즘을 통해 연결할 수 있지만, 지원 여부는 클라이언트, 서버 및 중간 프록시의 구현에 따라 달라집니다.

### 3.2. WebSocket URI

WebSocket은 다음 URI Scheme을 사용합니다.

| Scheme | 설명 |
|---|---|
| `ws://` | 일반 WebSocket 연결 |
| `wss://` | TLS로 보호되는 WebSocket 연결 |

예시:

```text
ws://localhost:3000/stream
wss://api.example.com/stream
```

운영 환경에서는 일반적으로 `wss://`를 사용하는 것이 좋습니다.

### 3.3. WebSocket Frame

WebSocket은 데이터를 Frame 단위로 전송합니다.

주요 Frame 유형은 다음과 같습니다.

| 유형 | 역할 |
|---|---|
| Text | UTF-8 텍스트 데이터 전송 |
| Binary | 바이너리 데이터 전송 |
| Ping | 연결 상태 확인 |
| Pong | Ping에 대한 응답 |
| Close | 연결 종료 |

WebSocket 프로토콜은 메시지의 전송 구조를 정의하지만, 애플리케이션 메시지의 의미와 데이터 형식까지 정의하지는 않습니다.

따라서 JSON, MessagePack, Protocol Buffers 등은 애플리케이션 요구사항에 따라 선택할 수 있습니다.

### 3.4. WebSocket의 특징

WebSocket의 주요 특징은 다음과 같습니다.

- 지속적인 연결을 유지합니다.
- 양방향 메시지 전송을 지원합니다.
- 단일 연결에서 메시지를 순서대로 전송합니다.
- TCP 기반 전송의 신뢰성과 순서 보장 특성을 활용합니다.
- 클라이언트와 서버가 독립적으로 메시지를 전송할 수 있습니다.

다만 WebSocket은 메시지의 애플리케이션 수준 수신 확인, 영구 저장 및 연결 해제 이후의 재전송을 자동으로 보장하지 않습니다.

이러한 기능은 애플리케이션 프로토콜과 별도의 저장 또는 복구 메커니즘을 통해 구현해야 합니다.

---

## 4. NestJS WebSocket 아키텍처

NestJS에서는 Gateway가 WebSocket 메시지를 처리하는 진입점 역할을 수행합니다.

```text
WebSocket Client
       |
       | WebSocket Connection
       v
WebSocket Adapter
       |
       v
WebSocket Gateway
       |
       | Message Handler
       v
Service
       |
       | Business Logic
       v
Repository / Data Source
       |
       v
Service
       |
       v
WebSocket Gateway
       |
       | Server Emit
       v
WebSocket Client
```

Gateway는 Controller와 유사한 역할을 수행하지만 HTTP Endpoint 대신 WebSocket 이벤트를 처리합니다.

NestJS의 Gateway는 Provider로 관리되므로 Dependency Injection을 사용할 수 있습니다.

### 4.1. 주요 데코레이터

| 데코레이터 | 역할 |
|---|---|
| `@WebSocketGateway()` | Gateway 클래스를 정의합니다. |
| `@SubscribeMessage()` | 특정 메시지 이벤트를 처리합니다. |
| `@MessageBody()` | 수신한 메시지의 데이터를 추출합니다. |
| `@ConnectedSocket()` | 현재 연결된 클라이언트 Socket에 접근합니다. |
| `@WebSocketServer()` | WebSocket Server 인스턴스에 접근합니다. |
| `@Ack()` | Socket.IO의 Acknowledgement Callback을 전달받습니다. |

### 4.2. Gateway와 Controller 비교

| 항목 | HTTP Controller | WebSocket Gateway |
|---|---|---|
| 선언 | `@Controller()` | `@WebSocketGateway()` |
| 요청 처리 | `@Get()`, `@Post()` 등 | `@SubscribeMessage()` |
| 요청 데이터 | `@Body()`, `@Param()` 등 | `@MessageBody()` |
| 클라이언트 접근 | Request 객체 | Socket 객체 |
| 응답 | HTTP Response | Event, Acknowledgement 등 |
| 연결 | HTTP 요청 중심 | 지속적인 연결 중심 |
| DI 지원 | 지원 | 지원 |

WebSocket Gateway는 NestJS의 Module에 Provider로 등록해야 활성화됩니다.

---

## 5. Socket.IO와 ws

NestJS는 기본적으로 Socket.IO와 `ws` 라이브러리를 위한 Adapter를 제공합니다.

### 5.1. Socket.IO

Socket.IO는 실시간 양방향 이벤트 통신을 제공하는 라이브러리입니다.

Socket.IO는 WebSocket을 Transport로 사용할 수 있지만, WebSocket 프로토콜 자체와 동일하지는 않습니다.

Socket.IO는 자체적인 메시징 프로토콜과 추가 기능을 제공합니다.

주요 기능은 다음과 같습니다.

- 이벤트 기반 메시지 송수신
- 자동 재연결
- Acknowledgement
- Room
- Namespace
- Broadcasting
- 여러 Transport 방식 지원

Socket.IO는 WebSocket Transport를 우선 사용하거나 HTTP Long Polling을 사용하는 구성을 지원합니다.

### 5.2. ws

`ws`는 Node.js 환경에서 WebSocket 프로토콜을 구현하는 라이브러리입니다.

Socket.IO보다 추상화 수준이 낮으며, 표준 WebSocket 기반 통신을 구현할 때 사용할 수 있습니다.

주요 특징은 다음과 같습니다.

- 표준 WebSocket 프로토콜 지원
- Text 및 Binary 메시지 처리
- Ping/Pong 처리
- 비교적 작은 라이브러리 계층
- 애플리케이션별 메시지 프로토콜 직접 설계 가능

`ws`는 Socket.IO의 Room, Namespace 및 Acknowledgement 기능을 기본적으로 제공하지 않습니다.

필요한 경우 애플리케이션에서 직접 구현해야 합니다.

### 5.3. 비교

| 항목 | Socket.IO | ws |
|---|---|---|
| 표준 WebSocket과 직접 호환 | 아니요 | 예 |
| 이벤트 기반 API | 기본 제공 | 애플리케이션에서 구성 |
| 자동 재연결 | 클라이언트 라이브러리에서 지원 | 직접 구현 필요 |
| Room | 지원 | 직접 구현 필요 |
| Namespace | 지원 | 직접 구현 필요 |
| Acknowledgement | 지원 | 직접 구현 필요 |
| Binary 메시지 | 지원 | 지원 |
| 기본 기능의 추상화 수준 | 높음 | 낮음 |
| 브라우저 기본 WebSocket API | 직접 연결 불가 | 연결 가능 |

기능이 풍부한 이벤트 기반 애플리케이션에서는 Socket.IO를 선택할 수 있습니다.

반면 표준 WebSocket Client와의 호환성이 필요하거나 메시지 프로토콜을 직접 설계하려는 경우 `ws`를 고려할 수 있습니다.

어느 라이브러리가 더 높은 처리량을 제공하는지는 메시지 크기, 연결 수, 직렬화 방식 및 실제 부하 패턴을 측정하여 판단해야 합니다.

---

## 6. Socket.IO 기반 Gateway 구성

### 6.1. 패키지 설치

기존 NestJS 프로젝트에서 다음 패키지를 설치합니다.

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io
```

클라이언트 예제에는 다음 패키지를 사용합니다.

```bash
npm install socket.io-client
```

NestJS와 관련 Adapter 패키지는 호환되는 메이저 버전을 사용해야 합니다.

### 6.2. Gateway 생성

`src/events/events.gateway.ts`

```typescript
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';

@WebSocketGateway()
export class EventsGateway {
  @SubscribeMessage('ping')
  handlePing(
    @MessageBody() data: string,
  ): string {
    return data;
  }
}
```

`@WebSocketGateway()`는 Gateway 클래스를 정의합니다.

`@SubscribeMessage('ping')`은 클라이언트가 전송한 `ping` 이벤트를 처리합니다.

Handler가 반환한 값은 Socket.IO Acknowledgement 응답으로 전달할 수 있습니다.

### 6.3. Module 등록

`src/events/events.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { EventsGateway } from './events.gateway';

@Module({
  providers: [EventsGateway],
})
export class EventsModule {}
```

Gateway는 `controllers`가 아닌 `providers`에 등록합니다.

### 6.4. Root Module 등록

`src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { EventsModule } from './events/events.module';

@Module({
  imports: [EventsModule],
})
export class AppModule {}
```

### 6.5. Bootstrap

`src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);
}

void bootstrap();
```

기본 설정에서는 Gateway가 HTTP 서버와 동일한 포트를 공유합니다.

### 6.6. 클라이언트 연결

Socket.IO Client를 사용하여 연결할 수 있습니다.

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected:', socket.id);

  socket.emit(
    'ping',
    'Hello NestJS',
    (response: string) => {
      console.log(response);
    },
  );
});
```

`socket.emit()`은 서버에 이벤트를 전송합니다.

세 번째 인수로 전달한 Callback은 서버가 Acknowledgement를 반환했을 때 호출됩니다.

---

## 7. Gateway Lifecycle

NestJS는 Gateway의 주요 생명주기를 처리하기 위한 Interface를 제공합니다.

| Interface | 메서드 | 실행 시점 |
|---|---|---|
| `OnGatewayInit` | `afterInit()` | Gateway 서버 초기화 이후 |
| `OnGatewayConnection` | `handleConnection()` | 클라이언트 연결 시 |
| `OnGatewayDisconnect` | `handleDisconnect()` | 클라이언트 연결 해제 시 |

### 7.1. Lifecycle 구현

```typescript
import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import {
  Server,
  Socket,
} from 'socket.io';

@WebSocketGateway()
export class EventsGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect
{
  afterInit(server: Server): void {
    console.log('Gateway initialized');
  }

  handleConnection(client: Socket): void {
    console.log('Connected:', client.id);
  }

  handleDisconnect(client: Socket): void {
    console.log('Disconnected:', client.id);
  }
}
```

### 7.2. 연결 Lifecycle

```text
Gateway Initialization
          |
          v
      afterInit()
          |
          v
  Client Connection
          |
          v
   handleConnection()
          |
          v
    Message Exchange
          |
          v
  Client Disconnection
          |
          v
  handleDisconnect()
```

`handleConnection()`은 새로운 클라이언트 연결을 처리하는 데 사용할 수 있습니다.

`handleDisconnect()`는 연결 종료에 따른 세션 정보 및 구독 상태 정리 작업에 활용할 수 있습니다.

다만 네트워크 장애가 발생한 시점과 서버가 연결 종료를 감지하는 시점은 다를 수 있습니다.

따라서 연결 종료 이벤트만을 기준으로 영속적인 비즈니스 상태를 관리하는 방식은 주의해야 합니다.

---

## 8. WebSocket Server와 Client 접근

### 8.1. WebSocketServer

`@WebSocketServer()` 데코레이터를 사용하면 Gateway에서 Socket.IO Server에 접근할 수 있습니다.

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';

@WebSocketGateway()
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  broadcast(): void {
    this.server.emit('notification', {
      message: 'New notification',
    });
  }
}
```

`server.emit()`은 해당 Socket.IO Server 범위의 클라이언트에게 이벤트를 전송합니다.

### 8.2. ConnectedSocket

`@ConnectedSocket()`을 사용하면 현재 메시지를 전송한 클라이언트에 접근할 수 있습니다.

```typescript
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
} from '@nestjs/websockets';

import { Socket } from 'socket.io';

@SubscribeMessage('message')
handleMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: string,
): void {
  client.emit('message.received', {
    message: data,
  });
}
```

Socket 인스턴스를 직접 사용하면 연결 정보, Room 및 전송 동작 등을 제어할 수 있습니다.

다만 Socket.IO에 직접 의존하는 코드가 증가하면 다른 WebSocket Adapter로 변경하기 어려워질 수 있습니다.

---

## 9. WebSocket 메시지 전송 방식

Socket.IO는 여러 이벤트 전송 방식을 제공합니다.

### 9.1. 특정 클라이언트 전송

```typescript
client.emit('price.updated', {
  symbol: 'MSFT',
  price: 420.5,
});
```

현재 연결된 특정 Socket에 이벤트를 전송합니다.

### 9.2. 전체 클라이언트 전송

```typescript
this.server.emit('market.status', {
  status: 'OPEN',
});
```

Server가 관리하는 모든 연결에 이벤트를 전송합니다.

### 9.3. 현재 클라이언트를 제외한 전송

```typescript
client.broadcast.emit('user.connected', {
  socketId: client.id,
});
```

메시지를 발생시킨 Socket을 제외한 다른 클라이언트에 이벤트를 전송합니다.

### 9.4. 특정 Room에 전송

```typescript
this.server.to('MSFT').emit('price.updated', {
  symbol: 'MSFT',
  price: 420.5,
});
```

`MSFT` Room에 참여한 클라이언트에게만 이벤트를 전송합니다.

### 9.5. Acknowledgement

Socket.IO는 이벤트 처리를 확인하는 Acknowledgement를 지원합니다.

```typescript
@SubscribeMessage('subscribe')
handleSubscribe(
  @MessageBody() symbol: string,
): { success: boolean } {
  return {
    success: true,
  };
}
```

클라이언트:

```typescript
socket.emit(
  'subscribe',
  'MSFT',
  (response: { success: boolean }) => {
    console.log(response);
  },
);
```

Acknowledgement는 이벤트 처리 결과를 클라이언트에 전달할 수 있지만, 응답이 성공했다는 사실만으로 데이터의 영구 저장이나 다른 시스템으로의 전달까지 보장되는 것은 아닙니다.

---

## 10. Room과 Namespace

### 10.1. Room

Room은 Socket.IO에서 클라이언트 연결을 논리적으로 그룹화하는 기능입니다.

예를 들어 주식 시세 스트리밍 서비스에서는 종목별 Room을 구성할 수 있습니다.

```text
Socket.IO Server
       |
       +-- Room: MSFT
       |      |
       |      +-- Client A
       |      +-- Client B
       |
       +-- Room: NVDA
       |      |
       |      +-- Client B
       |      +-- Client C
       |
       +-- Room: AAPL
              |
              +-- Client D
```

하나의 Socket은 여러 Room에 참여할 수 있습니다.

### 10.2. Room 참여

```typescript
@SubscribeMessage('subscribe')
async handleSubscribe(
  @ConnectedSocket() client: Socket,
  @MessageBody() symbol: string,
): Promise<void> {
  await client.join(symbol);
}
```

### 10.3. Room 탈퇴

```typescript
@SubscribeMessage('unsubscribe')
async handleUnsubscribe(
  @ConnectedSocket() client: Socket,
  @MessageBody() symbol: string,
): Promise<void> {
  await client.leave(symbol);
}
```

### 10.4. Namespace

Namespace는 Socket.IO 서버 내에서 논리적으로 분리된 통신 공간입니다.

```typescript
@WebSocketGateway({
  namespace: 'market',
})
export class MarketGateway {}
```

클라이언트:

```typescript
const socket = io(
  'http://localhost:3000/market',
);
```

Room과 Namespace는 서로 다른 기능입니다.

| 항목 | Room | Namespace |
|---|---|---|
| 주요 목적 | 연결 그룹화 | 논리적 통신 공간 분리 |
| 사용 예 | 종목별 구독자 관리 | 서비스별 통신 채널 |
| 참여 방식 | `join()` / `leave()` | Namespace로 연결 |
| 이벤트 처리 | 같은 Namespace 내 공유 | Namespace별 Handler 구성 가능 |

Namespace는 URL Path와 동일한 개념이 아닙니다.

특히 `ws` Adapter에서는 Socket.IO Namespace가 지원되지 않으므로 별도의 Path나 메시지 프로토콜을 사용해야 합니다.

---

## 11. WebSocket 기반 실시간 시세 스트리밍 예제

이번 절에서는 여러 클라이언트가 특정 종목을 구독하고, 서버가 해당 종목의 시세를 전달하는 간단한 애플리케이션을 구현합니다.

이 예제는 Socket.IO Room을 이용합니다.

### 11.1. 프로젝트 구조

```text
src/
├── main.ts
├── app.module.ts
└── market/
    ├── market.module.ts
    ├── market.gateway.ts
    ├── market.service.ts
    └── dto/
        └── symbol-subscription.dto.ts
```

### 11.2. 구독 DTO

`src/market/dto/symbol-subscription.dto.ts`

```typescript
import {
  IsIn,
  IsString,
} from 'class-validator';

export class SymbolSubscriptionDto {
  @IsString()
  @IsIn(['MSFT', 'NVDA', 'AAPL'])
  symbol!: string;
}
```

이 DTO는 학습 예제에서 허용할 종목을 제한합니다.

실제 서비스에서는 종목 목록을 데이터베이스 또는 별도 Reference Data Service에서 조회할 수 있습니다.

### 11.3. MarketService

`src/market/market.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

export interface PriceEvent {
  symbol: string;
  price: number;
  timestamp: number;
}

@Injectable()
export class MarketService {
  createPriceEvent(
    symbol: string,
    price: number,
  ): PriceEvent {
    return {
      symbol,
      price,
      timestamp: Date.now(),
    };
  }
}
```

MarketService는 시세 이벤트를 생성하는 역할을 담당합니다.

실제 스트리밍 시스템에서는 외부 Market Data Feed, 메시지 브로커 또는 Replay Generator로부터 이벤트를 공급받을 수 있습니다.

### 11.4. MarketGateway

`src/market/market.gateway.ts`

```typescript
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';

import {
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import {
  Server,
  Socket,
} from 'socket.io';

import {
  MarketService,
} from './market.service';

import {
  SymbolSubscriptionDto,
} from './dto/symbol-subscription.dto';

@WebSocketGateway({
  namespace: 'market',
  cors: {
    origin: 'http://localhost:5173',
  },
})
export class MarketGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly marketService: MarketService,
  ) {}

  handleConnection(client: Socket): void {
    console.log(
      `Client connected: ${client.id}`,
    );
  }

  handleDisconnect(client: Socket): void {
    console.log(
      `Client disconnected: ${client.id}`,
    );
  }

  @SubscribeMessage('subscribe')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: () =>
        new WsException('Invalid symbol'),
    }),
  )
  async subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SymbolSubscriptionDto,
  ): Promise<{ success: boolean; symbol: string }> {
    await client.join(dto.symbol);

    return {
      success: true,
      symbol: dto.symbol,
    };
  }

  @SubscribeMessage('unsubscribe')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: () =>
        new WsException('Invalid symbol'),
    }),
  )
  async unsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SymbolSubscriptionDto,
  ): Promise<{ success: boolean; symbol: string }> {
    await client.leave(dto.symbol);

    return {
      success: true,
      symbol: dto.symbol,
    };
  }

  publishPrice(
    symbol: string,
    price: number,
  ): void {
    const event =
      this.marketService.createPriceEvent(
        symbol,
        price,
      );

    this.server.to(symbol).emit(
      'price.updated',
      event,
    );
  }
}
```

이 Gateway는 다음 기능을 제공합니다.

- 클라이언트 연결 및 해제 처리
- 종목 구독 이벤트 처리
- 종목 구독 해제 이벤트 처리
- 종목별 Room 관리
- 특정 종목 구독자에 대한 시세 전송

`publishPrice()`는 외부 이벤트 공급자 또는 다른 Provider가 호출할 수 있도록 정의한 메서드입니다.

이번 예제만 실행하면 실제 시세 데이터가 자동으로 발생하지는 않습니다.

### 11.5. MarketModule

`src/market/market.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { MarketGateway } from './market.gateway';
import { MarketService } from './market.service';

@Module({
  providers: [
    MarketGateway,
    MarketService,
  ],
})
export class MarketModule {}
```

### 11.6. AppModule

`src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { MarketModule } from './market/market.module';

@Module({
  imports: [MarketModule],
})
export class AppModule {}
```

### 11.7. 클라이언트 구현

```typescript
import { io } from 'socket.io-client';

const socket = io(
  'http://localhost:3000/market',
);

socket.on('connect', () => {
  console.log('Connected:', socket.id);

  socket.emit(
    'subscribe',
    { symbol: 'MSFT' },
    (response: unknown) => {
      console.log('Subscribe:', response);
    },
  );
});

socket.on('price.updated', (event) => {
  console.log('Price Event:', event);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

클라이언트는 연결 이후 `MSFT`를 구독합니다.

서버가 `publishPrice('MSFT', 420.5)`를 호출하면 `MSFT` Room에 참여한 클라이언트가 `price.updated` 이벤트를 수신합니다.

---

## 12. ws Adapter

NestJS는 Socket.IO 대신 표준 WebSocket 기반의 `ws` 라이브러리를 사용할 수 있도록 `WsAdapter`를 제공합니다.

### 12.1. 패키지 설치

```bash
npm install @nestjs/websockets @nestjs/platform-ws
```

### 12.2. Adapter 등록

`src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import { WsAdapter } from '@nestjs/platform-ws';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(
    new WsAdapter(app),
  );

  await app.listen(3000);
}

void bootstrap();
```

### 12.3. Gateway 정의

```typescript
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';

@WebSocketGateway({
  path: '/stream',
})
export class StreamGateway {
  @SubscribeMessage('ping')
  handlePing(
    @MessageBody() data: string,
  ): WsResponse<string> {
    return {
      event: 'pong',
      data,
    };
  }
}
```

이 Gateway는 `StreamGateway`를 Provider로 등록한 Module이 애플리케이션에 포함되어 있어야 활성화됩니다.

### 12.4. 표준 WebSocket Client

브라우저의 기본 WebSocket API를 사용할 수 있습니다.

```typescript
const socket = new WebSocket(
  'ws://localhost:3000/stream',
);

socket.onopen = () => {
  socket.send(
    JSON.stringify({
      event: 'ping',
      data: 'Hello WebSocket',
    }),
  );
};

socket.onmessage = (message) => {
  console.log(message.data);
};
```

NestJS의 기본 `WsAdapter`는 다음 형태의 메시지 구조를 처리합니다.

```json
{
  "event": "ping",
  "data": "Hello WebSocket"
}
```

`event`는 처리할 Handler를 식별하고, `data`는 해당 Handler에 전달할 데이터를 의미합니다.

이는 WebSocket 프로토콜에서 강제하는 메시지 형식이 아니라 NestJS `WsAdapter`의 기본 메시지 처리 규약입니다.

다른 형식을 사용하려면 Adapter의 Message Parser를 구성할 수 있습니다.

---

## 13. Gateway에서의 Dependency Injection

Gateway는 NestJS의 Provider이므로 Service를 생성자 주입 방식으로 사용할 수 있습니다.

```typescript
@WebSocketGateway()
export class EventsGateway {
  constructor(
    private readonly eventsService: EventsService,
  ) {}
}
```

다른 Provider에서 Gateway를 주입받을 수도 있습니다.

```typescript
@Injectable()
export class NotificationService {
  constructor(
    private readonly eventsGateway: EventsGateway,
  ) {}

  notify(): void {
    this.eventsGateway.broadcast();
  }
}
```

다만 이 방식은 Service가 Gateway에 직접 의존하게 합니다.

복잡한 애플리케이션에서는 비즈니스 Service가 Transport 계층에 의존하지 않도록 이벤트 전달 인터페이스 또는 별도의 Publisher를 도입하는 설계를 고려할 수 있습니다.

Gateway는 기본적으로 Singleton Provider로 관리되므로 여러 클라이언트가 동일한 Gateway 인스턴스를 공유할 수 있습니다.

또한 Gateway의 내부 상태는 해당 NestJS 프로세스의 메모리에 저장됩니다.

여러 프로세스 또는 Pod 사이에서 Gateway 인스턴스의 메모리가 자동으로 공유되지는 않습니다.

---

## 14. WebSocket 인증과 인가

WebSocket은 지속적인 연결을 사용하므로 연결 시점의 인증과 메시지 처리 시점의 인가를 구분해야 합니다.

### 14.1. 연결 시점의 인증

Socket.IO Client는 연결 과정에서 인증 정보를 전달할 수 있습니다.

```typescript
const socket = io(
  'http://localhost:3000',
  {
    auth: {
      token: accessToken,
    },
  },
);
```

서버에서는 Handshake 정보를 확인할 수 있습니다.

```typescript
handleConnection(client: Socket): void {
  const token = client.handshake.auth.token;

  console.log('Received token:', Boolean(token));
}
```

위 코드는 인증 정보를 추출하는 방법만 설명합니다.

실제 인증에서는 토큰의 서명, 만료 시간, Issuer 및 Audience 등을 검증해야 합니다.

연결을 수락하기 전에 인증을 수행하려면 Socket.IO의 Connection Middleware 등을 사용할 수 있습니다.

### 14.2. 메시지 단위 인가

클라이언트가 연결에 성공했다고 해서 모든 이벤트를 실행할 권한이 부여되는 것은 아닙니다.

예를 들어 특정 시세 데이터에 대한 구독 권한은 종목 구독 이벤트를 처리할 때 별도로 확인해야 할 수 있습니다.

NestJS에서는 `@UseGuards()`를 Gateway 또는 Message Handler에 적용할 수 있습니다.

```typescript
@UseGuards(MarketSubscriptionGuard)
@SubscribeMessage('subscribe')
subscribe(
  @MessageBody() dto: SymbolSubscriptionDto,
) {
  // Authorized subscription
}
```

### 14.3. 토큰 만료와 재인증

WebSocket은 연결이 장시간 유지될 수 있으므로 다음 사항을 고려해야 합니다.

- 연결 당시 유효했던 토큰의 만료
- 사용자 권한 변경
- 강제 로그아웃
- 세션 폐기
- 재연결 시 인증 정보 갱신

연결 시 인증만 수행하는 방식은 장시간 유지되는 세션에서 변경된 권한 상태를 즉시 반영하지 못할 수 있습니다.

따라서 보안 요구사항에 따라 메시지 단위 권한 확인, 주기적인 재검증 또는 연결 종료 정책을 적용해야 합니다.

---

## 15. Pipes와 Validation

NestJS의 Gateway에서도 Pipe를 사용하여 메시지 데이터를 검증할 수 있습니다.

### 15.1. ValidationPipe

```typescript
import {
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import {
  WsException,
} from '@nestjs/websockets';

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: () =>
      new WsException('Invalid payload'),
  }),
)
@SubscribeMessage('subscribe')
subscribe(
  @MessageBody() dto: SymbolSubscriptionDto,
) {
  return {
    success: true,
  };
}
```

일반적인 HTTP ValidationPipe는 기본적으로 HTTP Exception을 발생시킵니다.

WebSocket Handler에서는 `WsException`을 사용하도록 오류 처리 방식을 구성하는 것이 중요합니다.

그렇지 않으면 유효성 검사 오류가 클라이언트에 일반적인 내부 서버 오류로 전달될 수 있습니다.

---

## 16. WebSocket 예외 처리

WebSocket 통신에서는 HTTP 상태 코드만으로 메시지 처리 오류를 표현할 수 없습니다.

NestJS는 WebSocket 환경에서 `WsException`을 제공합니다.

### 16.1. WsException

```typescript
import {
  WsException,
} from '@nestjs/websockets';

@SubscribeMessage('subscribe')
subscribe(
  @MessageBody() symbol: string,
) {
  if (!symbol) {
    throw new WsException(
      'Symbol is required',
    );
  }

  return {
    success: true,
  };
}
```

Socket.IO에서는 기본 예외 처리에 따라 `exception` 이벤트가 클라이언트에 전달될 수 있습니다.

```typescript
socket.on('exception', (error) => {
  console.error(error);
});
```

### 16.2. Exception Filter

Gateway 또는 Handler 단위로 사용자 정의 Exception Filter를 적용할 수 있습니다.

```typescript
import {
  Catch,
  ArgumentsHost,
} from '@nestjs/common';

import {
  BaseWsExceptionFilter,
  WsException,
} from '@nestjs/websockets';

@Catch(WsException)
export class WsExceptionFilter
  extends BaseWsExceptionFilter
{
  catch(
    exception: WsException,
    host: ArgumentsHost,
  ): void {
    super.catch(exception, host);
  }
}
```

사용 예제:

```typescript
@UseFilters(new WsExceptionFilter())
@WebSocketGateway()
export class EventsGateway {}
```

Gateway의 Exception Filter는 HTTP Controller의 Exception Filter와 적용 범위 및 응답 처리 방식이 다릅니다.

특히 NestJS 공식 문서에 따르면 HTTP 애플리케이션에서 전역 등록한 Exception Filter가 Gateway에 자동 적용되는 것으로 가정해서는 안 됩니다.

WebSocket 예외 처리는 Gateway 또는 Handler 단위에서 명시적으로 구성할 수 있습니다.

---

## 17. WebSocket Interceptor

WebSocket Gateway에서도 Interceptor를 활용할 수 있습니다.

대표적인 활용 사례는 다음과 같습니다.

- 메시지 처리 시간 측정
- 로깅
- 응답 데이터 변환
- 공통 메타데이터 추가
- 메시지 처리 결과 관찰

예제:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

import {
  Observable,
  tap,
} from 'rxjs';

@Injectable()
export class WsLoggingInterceptor
  implements NestInterceptor
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed =
          Date.now() - startedAt;

        console.log(
          `WS handler completed: ${elapsed}ms`,
        );
      }),
    );
  }
}
```

Interceptor는 다음과 같이 적용할 수 있습니다.

```typescript
@UseInterceptors(WsLoggingInterceptor)
@WebSocketGateway()
export class EventsGateway {}
```

다만 `@ConnectedSocket()`을 사용하여 직접 Socket 객체를 조작하는 방식은 NestJS의 표준 응답 변환 Interceptor를 충분히 활용하지 못할 수 있습니다.

따라서 응답 변환이 필요한 Handler에서는 반환값이나 `WsResponse`를 활용하는 방식도 고려해야 합니다.

---

## 18. 연결 관리와 Session

WebSocket 서버는 연결된 클라이언트의 상태를 관리해야 합니다.

예를 들어 다음과 같은 정보를 관리할 수 있습니다.

| 정보 | 설명 |
|---|---|
| Socket ID | 연결 식별자 |
| User ID | 인증된 사용자 식별자 |
| Subscriptions | 클라이언트가 구독한 종목 또는 이벤트 |
| Connected At | 연결 시각 |
| Last Activity | 최근 활동 시각 |
| Gateway ID | 연결을 유지하는 Gateway 인스턴스 식별자 |

### 18.1. Session Registry

Socket.IO 자체도 연결과 Room 상태를 관리하지만, 애플리케이션에 별도의 Session Registry가 필요할 수 있습니다.

예를 들어 다음과 같은 구조를 정의할 수 있습니다.

```typescript
interface SessionInfo {
  socketId: string;
  userId: string;
  symbols: Set<string>;
  connectedAt: number;
}
```

연결 정보를 관리하기 위한 자료구조:

```typescript
const sessions = new Map<
  string,
  SessionInfo
>();
```

이러한 자료구조는 클라이언트별 구독 상태, 사용자와 Socket의 매핑 및 연결 정책을 구현할 때 활용할 수 있습니다.

### 18.2. 메모리 사용량

Gateway가 보유하는 세션 수가 증가하면 메모리 사용량도 증가합니다.

메모리 사용량은 단순히 연결 수만으로 결정되지 않습니다.

주요 요소는 다음과 같습니다.

- WebSocket 연결 객체
- 인증 및 Session 메타데이터
- 종목 구독 목록
- Socket.IO 내부 상태
- 송신 대기 Buffer
- 애플리케이션별 추가 캐시

따라서 연결 가능한 최대 세션 수는 실제 부하 테스트를 통해 검증해야 합니다.

### 18.3. 세션과 구독 정보의 구분

WebSocket 연결 자체는 특정 Gateway 프로세스에서 유지됩니다.

반면 사용자 구독 정보나 라우팅 메타데이터는 외부 저장소에서 별도로 관리할 수 있습니다.

예를 들어 다음과 같은 역할 분리가 가능합니다.

```text
Gateway Local Memory
  |
  +-- Active Socket Connections
  +-- Local Session Registry
  +-- Local Symbol Subscriptions

External Metadata Store
  |
  +-- Gateway Identification
  +-- Subscription Routing Metadata
  +-- Gateway Health Metadata
```

외부 저장소에 Socket ID를 기록한다고 해서 다른 Gateway가 해당 Socket으로 직접 메시지를 전송할 수 있는 것은 아닙니다.

실제 Socket 객체는 연결을 유지하는 Gateway 프로세스에서 관리됩니다.

---

## 19. Heartbeat와 연결 상태 확인

네트워크 장애가 발생하면 클라이언트 또는 서버가 연결 종료를 즉시 인지하지 못할 수 있습니다.

이를 감지하기 위해 Heartbeat 메커니즘을 사용합니다.

### 19.1. Ping/Pong

WebSocket 프로토콜은 Ping 및 Pong Control Frame을 제공합니다.

서버는 Ping을 전송하고 클라이언트의 Pong 응답을 확인하여 연결 상태를 판단할 수 있습니다.

Socket.IO는 자체적인 Heartbeat 메커니즘을 제공합니다.

### 19.2. Heartbeat 고려사항

- Ping 전송 주기
- Pong 대기 시간
- 네트워크 지연
- 프록시의 Idle Timeout
- 비정상 연결 정리
- 연결 재설정 정책

Heartbeat가 지나치게 빈번하면 불필요한 네트워크 트래픽이 발생할 수 있습니다.

반대로 주기가 너무 길면 연결 장애를 늦게 감지할 수 있습니다.

운영 환경의 네트워크 특성과 Load Balancer 설정을 고려하여 적절한 값을 선택해야 합니다.

---

## 20. 재연결과 메시지 복구

WebSocket 연결은 다음과 같은 상황에서 종료될 수 있습니다.

- 네트워크 연결 해제
- 서버 재시작
- Gateway 장애
- Load Balancer 연결 종료
- 클라이언트 애플리케이션 종료

Socket.IO Client는 자동 재연결 기능을 제공합니다.

```typescript
const socket = io(
  'http://localhost:3000',
  {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  },
);
```

그러나 재연결과 메시지 복구는 서로 다른 기능입니다.

재연결이 성공하더라도 연결이 끊어진 동안 발생한 메시지를 반드시 수신할 수 있는 것은 아닙니다.

Socket.IO는 설정과 Adapter 지원 여부에 따라 Connection State Recovery 기능을 활용할 수 있지만, 이를 모든 메시지의 영구 전달 보장으로 간주해서는 안 됩니다.

### 20.1. 구독 복원

애플리케이션에서 재연결 후 구독을 복원하도록 구현할 수 있습니다.

```typescript
const subscriptions = new Set([
  'MSFT',
  'NVDA',
]);

socket.on('connect', () => {
  for (const symbol of subscriptions) {
    socket.emit('subscribe', {
      symbol,
    });
  }
});
```

### 20.2. 메시지 복구

데이터 누락이 허용되지 않는 시스템에서는 다음과 같은 기능이 필요할 수 있습니다.

- 이벤트 Sequence Number
- 마지막 수신 Offset
- 이벤트 저장소
- 누락 구간 재조회 API
- Snapshot 재전송
- 중복 이벤트 제거

실시간 시세 스트리밍에서는 최신 가격 Snapshot과 이후의 Delta Event를 조합하는 방식을 검토할 수 있습니다.

---

## 21. WebSocket 수평 확장

WebSocket은 지속적인 연결을 유지하므로 일반적인 HTTP 요청 처리와 다른 확장 특성을 가집니다.

### 21.1. 단일 Gateway

```text
              Clients
                 |
                 v
             Gateway
                 |
        +--------+--------+
        |        |        |
      Socket1  Socket2  Socket3
```

하나의 Gateway가 모든 WebSocket 연결과 메시지 송신을 담당합니다.

연결 수와 송신량이 증가하면 해당 프로세스의 메모리, CPU 및 네트워크 자원이 병목이 될 수 있습니다.

### 21.2. 다중 Gateway

```text
                Clients
                   |
                   v
             Load Balancer
                   |
         +---------+---------+
         |         |         |
         v         v         v
        WG1       WG2       WG3
         |         |         |
       Local     Local     Local
      Sessions  Sessions  Sessions
```

수평 확장을 통해 WebSocket 연결을 여러 Gateway에 분산할 수 있습니다.

각 Gateway는 자신에게 연결된 클라이언트의 Socket을 관리합니다.

### 21.3. Hot Symbol

실시간 주식 시세 서비스에서는 특정 종목에 구독자가 집중될 수 있습니다.

예를 들어 MSFT 구독자가 매우 많은 경우 하나의 Gateway가 해당 종목의 전체 세션을 관리하도록 구성하면 부하가 집중될 수 있습니다.

따라서 동일한 종목의 구독자를 여러 Gateway에 분산하는 구성이 가능합니다.

```text
                MSFT Event
                    |
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

이 구조에서는 다음과 같은 흐름으로 이벤트를 전달할 수 있습니다.

1. 클라이언트가 특정 Gateway에 연결합니다.
2. Gateway가 클라이언트의 종목 구독 상태를 관리합니다.
3. Routing Layer는 해당 종목의 구독자가 존재하는 Gateway를 식별합니다.
4. 시세 이벤트를 해당 Gateway들에 전달합니다.
5. 각 Gateway가 자신에게 연결된 구독자에게 메시지를 전송합니다.

동일한 종목의 세션이 여러 Gateway에 분산되는 것은 정상적인 설계 방식입니다.

다만 이벤트 전달 대상 결정, Gateway 장애 처리 및 구독 메타데이터의 정합성을 별도로 고려해야 합니다.

### 21.4. Socket.IO Redis Adapter

Socket.IO는 여러 서버 인스턴스 사이에서 이벤트 Broadcast를 연계하기 위한 Redis Adapter를 제공합니다.

NestJS 공식 문서에서는 `IoAdapter`를 확장하여 Redis Adapter를 연결하는 방식을 안내합니다.

이 방식은 Socket.IO의 서버 간 이벤트 전달에 활용할 수 있습니다.

그러나 모든 WebSocket 시스템에서 Redis Pub/Sub를 사용해야 하는 것은 아닙니다.

예를 들어 애플리케이션이 외부 Routing Layer를 통해 이벤트를 대상 Gateway로 직접 전달하는 구조라면, Socket.IO Redis Adapter 없이도 수평 확장을 설계할 수 있습니다.

두 방식은 목적과 전달 경로가 다르므로 구분해야 합니다.

---

## 22. WebSocket과 Kubernetes

Kubernetes에서 WebSocket Gateway를 운영할 때는 연결의 지속성과 Pod Lifecycle을 고려해야 합니다.

### 22.1. 기본 구성

```text
             WebSocket Clients
                     |
                     v
                Ingress
                     |
                     v
                Service
                     |
          +----------+----------+
          |          |          |
          v          v          v
       Gateway    Gateway    Gateway
        Pod 1      Pod 2      Pod 3
```

Kubernetes Service는 연결 수립 시점에 트래픽을 Pod로 전달합니다.

이미 수립된 WebSocket 연결은 일반적인 HTTP 요청처럼 메시지마다 다른 Pod로 다시 분산되지 않습니다.

### 22.2. HPA

Horizontal Pod Autoscaler를 사용하여 Gateway Pod 수를 조정할 수 있습니다.

대표적인 확장 기준은 다음과 같습니다.

- CPU 사용률
- 메모리 사용률
- 활성 WebSocket 연결 수
- 메시지 송신 처리량
- 송신 대기 Queue
- 이벤트 처리 지연

CPU 사용률만으로 실제 WebSocket 부하를 충분히 표현하기 어려울 수 있으므로, 시스템 특성에 맞는 Custom Metric을 고려할 수 있습니다.

### 22.3. Graceful Shutdown

Gateway Pod가 종료될 때 연결을 즉시 중단하면 클라이언트의 재연결이 동시에 발생할 수 있습니다.

따라서 다음과 같은 종료 절차를 고려해야 합니다.

1. 새로운 연결 수락을 중단합니다.
2. 종료 상태를 Readiness Probe에 반영합니다.
3. 필요한 경우 클라이언트에 종료 예정 이벤트를 전달합니다.
4. 진행 중인 메시지 처리를 정리합니다.
5. WebSocket 연결을 종료합니다.
6. Pod를 종료합니다.

실제 종료 순서와 유예 시간은 Kubernetes의 `terminationGracePeriodSeconds`, `preStop` Hook 및 애플리케이션 종료 처리 정책에 따라 설계해야 합니다.

---

## 23. Backpressure와 느린 클라이언트

WebSocket 서버가 클라이언트보다 빠르게 메시지를 생성하면 송신 대기 데이터가 누적될 수 있습니다.

이러한 문제는 Backpressure와 관련이 있습니다.

### 23.1. 발생 원인

```text
Market Data Feed
       |
       | 10,000 events/s
       v
    Gateway
       |
       | Client processing capacity
       | 1,000 events/s
       v
    Slow Client
```

클라이언트의 수신 및 처리 속도가 낮으면 송신 Buffer가 증가할 수 있습니다.

이는 Gateway의 메모리 사용량 증가로 이어질 수 있습니다.

### 23.2. 대응 전략

대표적인 대응 방법은 다음과 같습니다.

| 전략 | 설명 |
|---|---|
| Message Throttling | 전송 빈도를 제한합니다. |
| Coalescing | 동일 Resource의 여러 변경 이벤트를 최신 값으로 병합합니다. |
| Batching | 여러 이벤트를 하나의 메시지로 전송합니다. |
| Buffer Limit | 송신 대기 Buffer의 최대 크기를 제한합니다. |
| Slow Client Disconnect | 지속적으로 처리하지 못하는 연결을 종료합니다. |
| Snapshot Recovery | 재연결 후 최신 상태를 복구합니다. |

예를 들어 실시간 시세 표시에서는 동일 종목의 중간 가격 이벤트보다 최신 가격이 중요한 경우가 있습니다.

이 경우 이전 이벤트를 병합하는 전략을 고려할 수 있습니다.

그러나 체결 데이터처럼 모든 이벤트의 순서와 누락 여부가 중요한 경우에는 임의로 메시지를 삭제하거나 병합해서는 안 됩니다.

---

## 24. WebSocket 운영 모니터링

운영 환경에서는 WebSocket 연결뿐 아니라 이벤트 처리 상태를 관찰해야 합니다.

대표적인 지표는 다음과 같습니다.

| 지표 | 설명 |
|---|---|
| Active Connections | 현재 활성 연결 수 |
| Connections per Gateway | Gateway별 연결 수 |
| Connection Rate | 초당 신규 연결 수 |
| Disconnection Rate | 초당 연결 종료 수 |
| Incoming Messages | 초당 수신 메시지 수 |
| Outgoing Messages | 초당 송신 메시지 수 |
| Send Latency | 송신 작업 지연 |
| Queue Depth | 송신 대기 작업 수 |
| Buffered Bytes | 송신 대기 데이터 크기 |
| Subscription Count | 종목별 구독자 수 |
| Error Rate | 메시지 처리 오류 비율 |
| Reconnection Rate | 클라이언트 재연결 발생 비율 |

특히 다중 Gateway 구조에서는 Gateway별 지표를 구분하여 수집하는 것이 중요합니다.

### 24.1. Fan-out 관찰

하나의 이벤트가 여러 구독자에게 전송되는 경우 Fan-out 비용이 발생합니다.

예를 들어 다음과 같은 이벤트가 발생한다고 가정하겠습니다.

```text
Symbol: MSFT
Subscribers: 5,000
Event Rate: 10 events/s
```

모든 이벤트를 모든 구독자에게 전달하면 이론적으로 초당 50,000건의 개별 클라이언트 송신이 필요합니다.

이는 논리적인 송신 작업 수이며 실제 네트워크 패킷 수 또는 서버의 처리 가능량과 동일하지 않습니다.

송신 성능은 메시지 크기, 직렬화 비용, Buffer 상태, 네트워크 대역폭 및 Gateway 분산 방식에 영향을 받습니다.

---

## 25. REST API, WebSocket, SSE 비교

| 항목 | REST API | WebSocket | SSE |
|---|---|---|---|
| 통신 모델 | 요청·응답 | 양방향 지속 연결 | 서버에서 클라이언트로 스트리밍 |
| 서버 Push | 일반 요청·응답만으로는 제공되지 않음 | 지원 | 지원 |
| 클라이언트 메시지 | HTTP 요청 | 동일 연결에서 전송 | 별도 HTTP 요청 필요 |
| 연결 관리 | 요청 중심 | 지속 연결 관리 | 지속적인 HTTP 응답 스트림 |
| 데이터 형식 | JSON 등 | Text / Binary | UTF-8 기반 이벤트 스트림 |
| 주요 활용 | CRUD 및 일반 API | 실시간 양방향 통신 | 실시간 알림 및 단방향 업데이트 |

WebSocket은 양방향 메시지 전달에 적합합니다.

반면 클라이언트에서 서버로 지속적인 메시지를 전송할 필요가 없는 서비스에서는 SSE가 더 단순한 대안이 될 수 있습니다.

---

## 26. Spring Boot와 NestJS의 WebSocket 비교

Spring Boot와 NestJS는 모두 WebSocket 기반 통신을 지원합니다.

| 항목 | Spring Boot | NestJS |
|---|---|---|
| 주요 구성 | WebSocket Handler / STOMP | WebSocket Gateway |
| WebSocket Endpoint | Handler 및 Endpoint 등록 | `@WebSocketGateway()` |
| 메시지 처리 | `@MessageMapping` 등 | `@SubscribeMessage()` |
| 연결 Lifecycle | WebSocket Handler / Event | Gateway Lifecycle Hook |
| Dependency Injection | Spring IoC Container | NestJS DI Container |
| 메시지 검증 | Bean Validation 등 | Pipes / ValidationPipe |
| 인증 및 인가 | Spring Security | Guard 및 인증 로직 |
| Broadcast | MessagingTemplate 등 | Socket.IO Server / Adapter |
| 표준 WebSocket | 지원 | `ws` Adapter로 지원 |

Spring의 STOMP 메시징 구조와 NestJS의 Socket.IO 이벤트 모델은 기능적으로 유사한 부분이 있지만 동일한 프로토콜은 아닙니다.

따라서 서로 다른 프레임워크 사이에서 WebSocket 통신을 구현할 때는 실제 Transport와 메시지 프로토콜의 호환성을 확인해야 합니다.

---

## 27. 실무 설계 시 고려사항

WebSocket 애플리케이션을 운영 환경에 적용할 때는 다음 사항을 검토해야 합니다.

### 27.1. 연결 관리

- Gateway당 최대 연결 수
- 연결 및 구독 메타데이터 관리
- Heartbeat 정책
- Idle Timeout
- 재연결 및 구독 복원
- 연결 종료에 따른 리소스 정리

### 27.2. 메시지 처리

- 메시지 Schema
- 메시지 최대 크기
- Validation
- 이벤트 Sequence
- 중복 메시지 처리
- 송신 Buffer 제한
- 메시지 누락 복구 정책

### 27.3. 보안

- 연결 시점 인증
- 메시지 단위 인가
- Origin 검증
- TLS
- Rate Limiting
- 연결 수 제한
- 민감한 데이터 보호

WebSocket은 일반 HTTP API와 달리 장시간 연결이 유지되므로 Origin 검사, 인증 정보 갱신 및 연결 단위 자원 제한을 명확하게 설계해야 합니다.

브라우저의 WebSocket 연결에 대해 일반적인 CORS 설정만으로 모든 접근 제어가 보장되는 것은 아닙니다.

### 27.4. 확장성

- Gateway 수평 확장
- 세션 분산
- 구독 정보의 일관성
- 이벤트 Routing
- Fan-out 부하 분산
- Pod 종료 및 재연결
- Gateway 장애 복구

WebSocket 연결이 특정 Gateway에 종속된다는 사실을 고려하여 데이터 전달 경로와 장애 처리 구조를 설계해야 합니다.

---

## 28. 정리

WebSocket은 클라이언트와 서버 사이에서 지속적인 양방향 통신을 제공하는 프로토콜입니다.

NestJS는 Gateway와 Adapter를 사용하여 WebSocket 기반 애플리케이션을 구조적으로 개발할 수 있도록 지원합니다.

핵심 사항은 다음과 같습니다.

1. WebSocket은 연결 수립 후 지속적인 양방향 메시지 전송을 지원합니다.
2. NestJS Gateway는 WebSocket 이벤트를 처리하는 진입점 역할을 수행합니다.
3. Gateway는 Provider로 등록되며 Dependency Injection을 사용할 수 있습니다.
4. Socket.IO는 Room, Namespace 및 Acknowledgement 등 추가 기능을 제공합니다.
5. `ws`는 표준 WebSocket 기반의 통신을 구현하는 데 사용할 수 있습니다.
6. Gateway Lifecycle Hook을 사용하여 연결 및 연결 해제 시점을 처리할 수 있습니다.
7. Pipe, Guard, Interceptor 및 Exception Filter를 WebSocket 메시지 처리에 활용할 수 있습니다.
8. WebSocket 연결은 특정 Gateway 프로세스에서 유지되므로 수평 확장 시 세션 분산을 고려해야 합니다.
9. 대규모 실시간 스트리밍에서는 이벤트 Fan-out, Backpressure 및 느린 클라이언트 처리가 중요합니다.
10. Kubernetes 환경에서는 HPA, Graceful Shutdown 및 재연결 정책을 함께 설계해야 합니다.

WebSocket은 실시간 통신을 구현하기 위한 프로토콜이며, 대규모 시스템의 메시지 분산 및 전달 보장 문제를 자동으로 해결하는 기술은 아닙니다.

실제 서비스에서는 WebSocket 통신 계층과 이벤트 Routing, 세션 관리, 메시지 복구 및 모니터링 계층을 구분하여 설계해야 합니다.

---

## 29. 관련 문서

| 문서 | 주요 내용 |
|---|---|
| `01-fundamentals/modules.md` | Gateway 및 Provider의 Module 등록 |
| `01-fundamentals/providers.md` | Provider와 Service |
| `01-fundamentals/dependency-injection.md` | Gateway의 Dependency Injection |
| `02-request-lifecycle/guards.md` | Guard 및 접근 제어 |
| `02-request-lifecycle/pipes.md` | 메시지 데이터 검증 |
| `02-request-lifecycle/interceptors.md` | 메시지 처리 확장 |
| `02-request-lifecycle/exception-filters.md` | 예외 처리 |
| `03-techniques/events.md` | 애플리케이션 이벤트 처리 |
| `03-techniques/queues.md` | 비동기 메시지 처리 |
| `04-security/authentication.md` | 클라이언트 인증 |
| `04-security/authorization.md` | 이벤트 단위 인가 |
| `05-platforms/rest-api.md` | HTTP REST API |
| `05-platforms/graphql.md` | GraphQL 및 Subscription |
| `05-platforms/microservices.md` | 분산 메시징 |
| `05-platforms/server-sent-events.md` | SSE 기반 서버 Push |
| `08-deployment/graceful-shutdown.md` | 종료 및 연결 정리 |
| `08-deployment/performance.md` | 성능 및 확장성 |
| `09-examples/websocket/` | WebSocket 구현 예제 |

---

## 참고 자료

### NestJS 공식 문서

- [NestJS — WebSocket Gateways](https://docs.nestjs.com/websockets/gateways)
- [NestJS — WebSocket Adapters](https://docs.nestjs.com/websockets/adapter)
- [NestJS — WebSocket Exception Filters](https://docs.nestjs.com/websockets/exception-filters)
- [NestJS — WebSocket Pipes](https://docs.nestjs.com/websockets/pipes)
- [NestJS — WebSocket Guards](https://docs.nestjs.com/websockets/guards)
- [NestJS — WebSocket Interceptors](https://docs.nestjs.com/websockets/interceptors)
- [NestJS — Providers](https://docs.nestjs.com/providers)
- [NestJS — Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers)

### WebSocket 표준 및 프로토콜

- [RFC 6455 — The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [RFC 8441 — Bootstrapping WebSockets with HTTP/2](https://www.rfc-editor.org/rfc/rfc8441)
- [RFC 9220 — Bootstrapping WebSockets with HTTP/3](https://www.rfc-editor.org/rfc/rfc9220)
- [MDN — WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [WHATWG — WebSockets Standard](https://websockets.spec.whatwg.org/)

### Socket.IO

- [Socket.IO 공식 문서](https://socket.io/docs/v4/)
- [Socket.IO — Server API](https://socket.io/docs/v4/server-api/)
- [Socket.IO — Client API](https://socket.io/docs/v4/client-api/)
- [Socket.IO — Rooms](https://socket.io/docs/v4/rooms/)
- [Socket.IO — Namespaces](https://socket.io/docs/v4/namespaces/)
- [Socket.IO — Broadcasting Events](https://socket.io/docs/v4/broadcasting-events/)
- [Socket.IO — Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Socket.IO — Connection State Recovery](https://socket.io/docs/v4/connection-state-recovery/)
- [Socket.IO — Delivery Guarantees](https://socket.io/docs/v4/delivery-guarantees/)

### ws 및 기타 라이브러리

- [ws GitHub Repository](https://github.com/websockets/ws)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)
- [NestJS Official WebSocket Examples](https://github.com/nestjs/nest/tree/master/sample)

### Kubernetes 및 운영

- [Kubernetes — Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes — Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes — Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes — Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
- [Grafana Documentation](https://grafana.com/docs/)