# Server-Sent Events (SSE)

## 1. 개요

Server-Sent Events(SSE)는 서버가 HTTP 연결을 통해 클라이언트에 이벤트를 지속적으로 전송할 수 있도록 하는 Server Push 기술입니다.

일반적인 HTTP 통신에서는 클라이언트가 요청을 전송하면 서버가 응답을 반환하고 요청 처리가 종료됩니다.

반면 SSE는 클라이언트가 HTTP 요청을 전송한 이후 서버가 응답 연결을 유지하면서 여러 이벤트를 순차적으로 전달합니다.

SSE는 HTML Standard에 정의되어 있으며, 브라우저에서는 `EventSource` API를 통해 사용할 수 있습니다.

대표적인 활용 사례는 다음과 같습니다.

- 실시간 알림 및 상태 변경 전달
- 장시간 실행되는 작업의 진행률 표시
- 서버 로그 스트리밍
- 실시간 대시보드 갱신
- 주식 시세 및 시장 데이터 전송
- AI 응답 스트리밍
- 배치 작업 및 데이터 처리 결과 전달

NestJS는 `@Sse()` 데코레이터를 통해 SSE Endpoint를 구현할 수 있도록 지원합니다.

주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| `@Sse()` | SSE Endpoint를 정의합니다. |
| `MessageEvent` | 서버에서 전송할 이벤트의 데이터와 메타데이터를 정의합니다. |
| `Observable` | 시간에 따라 발생하는 이벤트 스트림을 표현합니다. |
| `EventSource` | 브라우저에서 SSE 연결을 생성하고 이벤트를 수신합니다. |
| `id` | 이벤트의 식별자를 정의합니다. |
| `retry` | 클라이언트의 재연결 대기 시간을 지정합니다. |
| `Last-Event-ID` | 클라이언트가 마지막으로 수신한 이벤트 ID를 서버에 전달합니다. |

SSE는 WebSocket과 달리 HTTP 기반의 단방향 이벤트 스트리밍 방식입니다.

이 문서에서는 SSE 프로토콜의 동작 원리와 NestJS 구현 방법을 설명하고, 연결 관리 및 운영 환경에서 고려해야 할 사항을 정리합니다.

---

## 2. SSE의 등장 배경

### 2.1. HTTP Polling

HTTP Polling은 클라이언트가 일정한 주기로 서버에 요청을 전송하여 새로운 데이터가 있는지 확인하는 방식입니다.

```text
Client                         Server
  |                              |
  |------ GET /status ---------->|
  |<----- Status: PENDING -------|
  |                              |
  |------ GET /status ---------->|
  |<----- Status: PENDING -------|
  |                              |
  |------ GET /status ---------->|
  |<----- Status: COMPLETED -----|
```

Polling은 구현이 간단하지만 다음과 같은 한계가 있습니다.

- 데이터 변경이 없어도 HTTP 요청이 발생합니다.
- 요청 주기에 따라 데이터 반영이 지연됩니다.
- 클라이언트 수가 증가하면 반복 요청에 따른 부하가 발생할 수 있습니다.

### 2.2. Long Polling

Long Polling은 클라이언트의 요청을 받은 서버가 새로운 이벤트가 발생하거나 타임아웃이 발생할 때까지 응답을 보류하는 방식입니다.

```text
Client                         Server
  |                              |
  |------ GET /events ---------->|
  |                              |
  |       Waiting for Event      |
  |                              |
  |<--------- Event A -----------|
  |                              |
  |------ GET /events ---------->|
  |                              |
  |<--------- Event B -----------|
```

Long Polling은 일반적인 Polling보다 불필요한 응답을 줄일 수 있지만, 응답이 완료될 때마다 새로운 요청을 전송해야 합니다.

### 2.3. Server-Sent Events

SSE는 하나의 HTTP 응답 연결을 유지하면서 여러 이벤트를 전달합니다.

```text
Client                         Server
  |                              |
  |------ GET /events ---------->|
  |<----- HTTP 200 OK -----------|
  |                              |
  |<--------- Event A -----------|
  |                              |
  |<--------- Event B -----------|
  |                              |
  |<--------- Event C -----------|
  |                              |
  |      Connection remains      |
  |             open             |
```

SSE에서는 이벤트가 발생할 때마다 새로운 HTTP 요청을 생성할 필요가 없습니다.

또한 서버가 새로운 이벤트를 전송하면 클라이언트가 이를 수신할 수 있으므로 단방향 실시간 통신에 적합합니다.

---

## 3. SSE 프로토콜

SSE는 기존 HTTP 연결을 이용하여 이벤트 스트림을 전송합니다.

WebSocket처럼 HTTP 연결을 별도의 WebSocket 프로토콜로 전환하지 않습니다.

### 3.1. HTTP 요청

브라우저의 `EventSource`는 일반적으로 다음과 같은 GET 요청을 전송합니다.

```http
GET /events HTTP/1.1
Host: localhost:3000
Accept: text/event-stream
```

### 3.2. HTTP 응답

서버는 다음과 같은 Content-Type으로 응답합니다.

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
```

이후 서버는 동일한 HTTP 응답 본문에 이벤트를 계속 기록합니다.

```text
data: Hello World

data: Another Event

data: Third Event

```

각 이벤트는 빈 줄로 구분됩니다.

즉, SSE는 하나의 HTTP 응답 본문 안에 여러 이벤트 레코드를 순차적으로 전송하는 방식입니다.

### 3.3. 주요 특징

| 항목 | 설명 |
|---|---|
| 기반 프로토콜 | HTTP |
| 통신 방향 | 서버에서 클라이언트 |
| Content-Type | `text/event-stream` |
| 데이터 인코딩 | UTF-8 |
| 브라우저 API | `EventSource` |
| 연결 유지 | 지속적인 HTTP 응답 |
| 재연결 | EventSource에서 자동 지원 |
| 이벤트 식별 | `id` 필드 지원 |
| 바이너리 전송 | 별도 인코딩 필요 |

SSE는 텍스트 기반 프로토콜입니다.

따라서 바이너리 데이터를 전송해야 한다면 Base64 등의 인코딩을 사용할 수 있지만, 바이너리 메시지가 핵심인 서비스에서는 WebSocket을 고려할 수 있습니다.

---

## 4. SSE 이벤트 형식

SSE 메시지는 여러 필드로 구성할 수 있습니다.

대표적인 필드는 다음과 같습니다.

| 필드 | 역할 |
|---|---|
| `data` | 클라이언트에 전달할 데이터 |
| `event` | 이벤트 이름 |
| `id` | 이벤트 식별자 |
| `retry` | 재연결 대기 시간(ms) |
| `:` | 주석(Comment) |

### 4.1. data

`data`는 이벤트의 실제 데이터를 전달합니다.

```text
data: Hello World

```

JSON 데이터를 문자열로 직렬화하여 전달할 수도 있습니다.

```text
data: {"symbol":"MSFT","price":420.5}

```

브라우저는 수신한 데이터를 문자열로 제공합니다.

따라서 JSON으로 전송한 데이터는 클라이언트에서 `JSON.parse()` 등을 이용하여 역직렬화해야 합니다.

### 4.2. event

`event` 필드는 사용자 정의 이벤트 이름을 지정합니다.

```text
event: price.updated
data: {"symbol":"MSFT","price":420.5}

```

클라이언트에서는 해당 이벤트 이름으로 Listener를 등록할 수 있습니다.

```typescript
eventSource.addEventListener(
  'price.updated',
  (event) => {
    console.log(event.data);
  },
);
```

`event` 필드가 없는 경우 기본 `message` 이벤트가 발생합니다.

### 4.3. id

`id`는 이벤트의 식별자를 나타냅니다.

```text
id: 1001
event: price.updated
data: {"symbol":"MSFT","price":420.5}

```

브라우저는 이벤트 ID를 기억하고, 재연결 시 마지막 이벤트 ID를 서버에 전달할 수 있습니다.

이 기능은 누락된 이벤트를 복구하는 메커니즘을 구현할 때 활용할 수 있습니다.

다만 이벤트 ID를 지정하는 것만으로 서버의 메시지 저장이나 재전송이 자동으로 구현되는 것은 아닙니다.

### 4.4. retry

`retry`는 연결이 종료된 이후 클라이언트가 재연결을 시도하기까지의 대기 시간을 밀리초 단위로 지정합니다.

```text
retry: 3000
data: Connected

```

이 예제에서는 재연결 대기 시간을 3초로 지정합니다.

브라우저의 실제 재연결 동작은 네트워크 상태 및 EventSource의 연결 관리 정책에 영향을 받을 수 있습니다.

### 4.5. Comment

콜론으로 시작하는 줄은 Comment입니다.

```text
: heartbeat

```

Comment는 클라이언트에 일반적인 메시지 이벤트로 전달되지 않습니다.

서버는 이를 활용하여 일정한 간격으로 데이터를 전송하고 연결이 유휴 상태로 방치되는 것을 방지할 수 있습니다.

### 4.6. 여러 줄의 data

SSE는 하나의 이벤트에 여러 `data` 필드를 포함할 수 있습니다.

```text
data: First line
data: Second line

```

브라우저는 여러 `data` 필드의 내용을 줄바꿈 문자로 연결합니다.

결과:

```text
First line
Second line
```

이러한 형식은 텍스트 스트리밍에서 여러 줄의 데이터를 전달할 때 활용할 수 있습니다.

---

## 5. NestJS의 SSE 아키텍처

NestJS의 SSE는 일반적인 HTTP Controller를 통해 구현합니다.

WebSocket Gateway와 달리 별도의 Gateway를 정의하지 않습니다.

```text
HTTP Client
     |
     | GET /events
     v
NestJS Controller
     |
     | @Sse()
     v
RxJS Observable
     |
     | MessageEvent
     v
HTTP Response Stream
     |
     v
EventSource Client
```

Controller는 Observable을 반환하며, NestJS는 Observable에서 발생하는 이벤트를 SSE 형식으로 변환하여 HTTP 응답 스트림에 전송합니다.

### 5.1. 주요 구성 요소

| 구성 요소 | 역할 |
|---|---|
| Controller | SSE Endpoint를 제공합니다. |
| `@Sse()` | 해당 Handler를 SSE 응답으로 처리하도록 지정합니다. |
| Observable | 이벤트를 비동기 스트림으로 표현합니다. |
| MessageEvent | 개별 이벤트의 데이터를 정의합니다. |
| Service | 이벤트 생성과 비즈니스 로직을 담당합니다. |
| EventSource | 브라우저에서 이벤트를 수신합니다. |

SSE는 HTTP 기반이므로 NestJS의 일반적인 HTTP 요청 처리 구조와 통합할 수 있습니다.

인증 및 인가를 위한 Guard와 기타 HTTP 요청 처리 구성 요소를 활용할 수 있습니다.

---

## 6. NestJS SSE 환경 구성

### 6.1. 패키지

NestJS는 `@nestjs/common`의 `@Sse()` 데코레이터를 제공합니다.

이벤트 스트림을 표현하기 위해 RxJS의 Observable을 사용합니다.

일반적인 NestJS 프로젝트에는 RxJS가 기본 의존성으로 포함되어 있습니다.

필요한 경우 다음 패키지를 설치합니다.

```bash
npm install rxjs
```

SSE를 사용하기 위해 별도의 WebSocket Adapter 또는 Socket.IO 라이브러리를 설치할 필요는 없습니다.

### 6.2. 기본 Controller

`src/events/events.controller.ts`

```typescript
import {
  Controller,
  MessageEvent,
  Sse,
} from '@nestjs/common';

import {
  interval,
  map,
  Observable,
} from 'rxjs';

@Controller('events')
export class EventsController {
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map((count) => ({
        data: {
          count,
          timestamp: Date.now(),
        },
      })),
    );
  }
}
```

`@Sse('stream')`은 다음 Endpoint를 정의합니다.

```http
GET /events/stream
```

`interval(1000)`은 1초 간격으로 값을 발생시키는 Observable을 생성합니다.

`map()`은 발생한 값을 SSE `MessageEvent` 형태로 변환합니다.

### 6.3. Module 등록

`src/events/events.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { EventsController } from './events.controller';

@Module({
  controllers: [EventsController],
})
export class EventsModule {}
```

### 6.4. AppModule

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

실행:

```bash
npm run start:dev
```

SSE Endpoint는 다음 주소에서 사용할 수 있습니다.

```text
http://localhost:3000/events/stream
```

---

## 7. MessageEvent

NestJS의 `MessageEvent` 인터페이스는 SSE로 전송할 이벤트의 구조를 정의합니다.

```typescript
export interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}
```

각 속성의 역할은 다음과 같습니다.

| 속성 | SSE 필드 | 설명 |
|---|---|---|
| `data` | `data` | 이벤트 데이터 |
| `id` | `id` | 이벤트 식별자 |
| `type` | `event` | 이벤트 이름 |
| `retry` | `retry` | 재연결 간격 |

NestJS에서 이벤트 이름을 지정하는 속성은 `event`가 아니라 `type`입니다.

### 7.1. 사용자 정의 이벤트

```typescript
@Sse('stream')
stream(): Observable<MessageEvent> {
  return interval(1000).pipe(
    map((count) => ({
      id: String(count + 1),
      type: 'counter.updated',
      data: {
        value: count + 1,
      },
      retry: 3000,
    })),
  );
}
```

실제 SSE 응답은 개념적으로 다음과 같은 형태가 됩니다.

```text
id: 1
event: counter.updated
data: {"value":1}
retry: 3000

id: 2
event: counter.updated
data: {"value":2}
retry: 3000

```

이벤트는 Observable에서 값이 발생할 때마다 전송됩니다.

---

## 8. EventSource 클라이언트

브라우저는 `EventSource` API를 제공하므로 기본적인 SSE 수신을 위해 추가 라이브러리를 설치할 필요가 없습니다.

### 8.1. 연결 생성

```typescript
const eventSource = new EventSource(
  'http://localhost:3000/events/stream',
);
```

브라우저는 지정한 URL로 HTTP 요청을 전송하고 SSE 연결을 생성합니다.

### 8.2. 기본 이벤트 수신

```typescript
eventSource.onmessage = (event) => {
  console.log(event.data);
};
```

`onmessage`는 이벤트 이름이 별도로 지정되지 않은 기본 메시지를 처리합니다.

### 8.3. 사용자 정의 이벤트 수신

```typescript
eventSource.addEventListener(
  'counter.updated',
  (event) => {
    const data = JSON.parse(event.data);

    console.log(data.value);
  },
);
```

서버가 `type: 'counter.updated'`를 설정한 경우 해당 이벤트 이름으로 수신해야 합니다.

### 8.4. 연결 상태 처리

```typescript
eventSource.onopen = () => {
  console.log('SSE connected');
};

eventSource.onerror = () => {
  console.error('SSE connection error');
};
```

SSE 연결이 일시적으로 종료되면 EventSource는 자동으로 재연결을 시도할 수 있습니다.

`error` 이벤트가 발생했다고 해서 항상 영구적으로 연결이 종료되었다는 의미는 아닙니다.

### 8.5. 연결 종료

```typescript
eventSource.close();
```

`close()`를 호출하면 EventSource 연결이 종료되고 자동 재연결도 중단됩니다.

### 8.6. ReadyState

EventSource는 현재 연결 상태를 확인할 수 있는 `readyState` 속성을 제공합니다.

| 값 | 상수 | 설명 |
|---|---|---|
| 0 | `CONNECTING` | 연결 중이거나 재연결을 시도하고 있습니다. |
| 1 | `OPEN` | 연결이 수립되었습니다. |
| 2 | `CLOSED` | 연결이 종료되었습니다. |

```typescript
console.log(eventSource.readyState);
```

---

## 9. Observable과 RxJS

NestJS의 `@Sse()` Handler는 `Observable`을 반환해야 합니다.

Observable은 시간이 지남에 따라 여러 값을 발생시킬 수 있는 비동기 데이터 스트림을 표현합니다.

### 9.1. Observable과 Promise

Promise는 일반적으로 하나의 비동기 결과를 표현합니다.

반면 Observable은 여러 값을 시간에 따라 전달할 수 있습니다.

```text
Promise
   |
   +---- Result
```

```text
Observable
   |
   +---- Event A
   |
   +---- Event B
   |
   +---- Event C
   |
   +---- ...
```

SSE는 하나의 응답 연결에서 여러 이벤트를 전달하므로 Observable과 잘 결합됩니다.

### 9.2. interval()

```typescript
interval(1000)
```

`interval()`은 지정한 시간 간격으로 연속적인 숫자를 발생시키는 Observable을 생성합니다.

### 9.3. map()

```typescript
interval(1000).pipe(
  map((count) => ({
    data: {
      count,
    },
  })),
);
```

`map()`은 Observable에서 발생한 값을 다른 형태로 변환합니다.

### 9.4. filter()

```typescript
interval(1000).pipe(
  filter((count) => count % 2 === 0),
  map((count) => ({
    data: {
      count,
    },
  })),
);
```

`filter()`를 사용하면 특정 조건에 해당하는 이벤트만 전달할 수 있습니다.

### 9.5. take()

```typescript
interval(1000).pipe(
  take(5),
  map((count) => ({
    data: {
      count,
    },
  })),
);
```

`take(5)`는 다섯 개의 값을 발생시킨 이후 Observable을 완료합니다.

장시간 연결을 유지하는 SSE 외에도 작업 진행률처럼 일정 조건에서 종료되는 스트림을 구성할 수 있습니다.

---

## 10. SSE 기반 작업 진행률 스트리밍

이번 절에서는 서버에서 실행하는 작업의 진행률을 클라이언트에 SSE로 전달하는 예제를 구현합니다.

### 10.1. 프로젝트 구조

```text
src/
├── main.ts
├── app.module.ts
└── tasks/
    ├── tasks.module.ts
    ├── tasks.controller.ts
    └── tasks.service.ts
```

### 10.2. TasksService

`src/tasks/tasks.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

import type { MessageEvent } from '@nestjs/common';

import {
  interval,
  map,
  Observable,
  take,
} from 'rxjs';

@Injectable()
export class TasksService {
  progress(): Observable<MessageEvent> {
    return interval(1000).pipe(
      take(10),
      map((index) => {
        const progress = (index + 1) * 10;

        return {
          id: String(index + 1),
          type: 'task.progress',
          data: {
            progress,
            status:
              progress === 100
                ? 'COMPLETED'
                : 'RUNNING',
          },
        };
      }),
    );
  }
}
```

이 Service는 1초 간격으로 10개의 이벤트를 생성합니다.

실제 작업을 수행하는 대신 진행률을 합성하여 발생시키는 학습 예제입니다.

### 10.3. TasksController

`src/tasks/tasks.controller.ts`

```typescript
import {
  Controller,
  MessageEvent,
  Sse,
} from '@nestjs/common';

import { Observable } from 'rxjs';

import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
  ) {}

  @Sse('progress')
  progress(): Observable<MessageEvent> {
    return this.tasksService.progress();
  }
}
```

### 10.4. TasksModule

`src/tasks/tasks.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
```

### 10.5. AppModule

```typescript
import { Module } from '@nestjs/common';

import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [TasksModule],
})
export class AppModule {}
```

### 10.6. 클라이언트

```typescript
const eventSource = new EventSource(
  'http://localhost:3000/tasks/progress',
);

eventSource.addEventListener(
  'task.progress',
  (event) => {
    const data = JSON.parse(event.data) as {
      progress: number;
      status: string;
    };

    console.log(
      `Progress: ${data.progress}%`,
    );

    if (data.status === 'COMPLETED') {
      eventSource.close();
    }
  },
);
```

이 예제에서는 클라이언트가 `COMPLETED` 이벤트를 수신하면 명시적으로 연결을 종료합니다.

서버의 Observable이 완료되어 응답이 종료되더라도 브라우저 EventSource는 상황에 따라 재연결을 시도할 수 있습니다.

따라서 유한한 작업 스트림에서는 완료 이벤트를 처리한 후 클라이언트가 `close()`를 호출하는 것이 중요합니다.

실제 작업 진행률을 제공하는 경우 작업 실행과 구독을 분리하는 방식도 고려할 수 있습니다.

예를 들어 `POST /tasks`로 작업을 생성한 뒤 `GET /tasks/:id/events`로 해당 작업의 진행률을 구독할 수 있습니다.

---

## 11. Subject를 이용한 이벤트 전달

`interval()`은 정해진 주기로 데이터를 생성하는 예제에 적합합니다.

하지만 실제 서비스에서는 데이터베이스 상태 변경, 외부 API 응답 또는 내부 비즈니스 이벤트가 발생했을 때 SSE 이벤트를 전송해야 할 수 있습니다.

이러한 경우 RxJS의 `Subject`를 활용할 수 있습니다.

### 11.1. Subject

Subject는 Observable이면서 외부에서 `next()`를 호출하여 새로운 값을 전달할 수 있는 객체입니다.

```typescript
import { Subject } from 'rxjs';

const subject = new Subject<number>();

subject.subscribe((value) => {
  console.log(value);
});

subject.next(100);
subject.next(200);
```

출력:

```text
100
200
```

### 11.2. 이벤트 Service

```typescript
import {
  Injectable,
  MessageEvent,
} from '@nestjs/common';

import {
  Observable,
  Subject,
} from 'rxjs';

@Injectable()
export class NotificationsService {
  private readonly events$ =
    new Subject<MessageEvent>();

  stream(): Observable<MessageEvent> {
    return this.events$.asObservable();
  }

  publish(message: string): void {
    this.events$.next({
      type: 'notification',
      data: {
        message,
        timestamp: Date.now(),
      },
    });
  }
}
```

### 11.3. Controller

```typescript
import {
  Body,
  Controller,
  MessageEvent,
  Post,
  Sse,
} from '@nestjs/common';

import { Observable } from 'rxjs';

import {
  NotificationsService,
} from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService:
      NotificationsService,
  ) {}

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.notificationsService.stream();
  }

  @Post()
  publish(
    @Body('message') message: string,
  ) {
    this.notificationsService.publish(message);

    return {
      success: true,
    };
  }
}
```

Controller와 Service를 함께 사용하려면 둘을 해당 Module에 등록해야 합니다.

이 예제는 이벤트 발행 구조를 설명하기 위한 코드이며, 실제 운영 API에서는 `POST /notifications`에 인증, 인가 및 입력 검증을 적용해야 합니다.

### 11.4. 동작 흐름

```text
Client A
   |
   | GET /notifications/stream
   v
NotificationsController
   |
   v
NotificationsService
   |
   v
Subject<MessageEvent>
   ^
   |
   | POST /notifications
   |
Client B
```

Client B가 알림 생성 요청을 전송하면 Service는 Subject에 이벤트를 발행합니다.

Subject를 구독 중인 SSE 연결은 해당 이벤트를 전달받습니다.

### 11.5. Subject 사용 시 주의사항

Subject는 기본적으로 이전에 발행된 이벤트를 저장하지 않습니다.

새로운 Subscriber가 연결되기 이전의 이벤트는 자동으로 전달되지 않습니다.

또한 Subject는 해당 Node.js 프로세스의 메모리에 존재합니다.

따라서 여러 NestJS 인스턴스 사이에서 Subject의 이벤트가 자동으로 공유되지는 않습니다.

이번 예제는 단일 프로세스의 단순한 실시간 이벤트 전달에 적합합니다.

---

## 12. SSE 연결 Lifecycle

SSE는 HTTP 연결을 유지하므로 연결 종료에 따른 자원 정리가 중요합니다.

### 12.1. 연결 생성

클라이언트가 SSE Endpoint에 접근하면 NestJS는 Controller Handler가 반환한 Observable을 구독합니다.

Observable에서 발생한 이벤트는 HTTP 응답으로 전송됩니다.

### 12.2. 연결 종료

다음과 같은 상황에서 SSE 연결이 종료될 수 있습니다.

- 클라이언트가 EventSource를 종료하는 경우
- 브라우저가 종료되거나 페이지를 이동하는 경우
- 네트워크 연결이 끊어지는 경우
- 서버가 응답을 종료하는 경우
- 서버 또는 프록시에서 Timeout이 발생하는 경우

NestJS는 클라이언트 연결이 종료되면 반환된 Observable의 구독을 해제합니다.

### 12.3. finalize()

RxJS의 `finalize()`를 이용하여 Observable이 종료될 때 정리 작업을 수행할 수 있습니다.

```typescript
import {
  Controller,
  MessageEvent,
  Sse,
} from '@nestjs/common';

import {
  finalize,
  interval,
  map,
  Observable,
} from 'rxjs';

@Controller('events')
export class EventsController {
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map((count) => ({
        data: { count },
      })),
      finalize(() => {
        console.log('SSE stream finalized');
      }),
    );
  }
}
```

`finalize()`는 Observable이 정상적으로 완료되거나 오류가 발생하거나 구독이 해제될 때 실행됩니다.

따라서 반드시 클라이언트의 연결 해제에만 반응하는 Callback은 아닙니다.

### 12.4. AbortSignal

NestJS의 최신 SSE 기능에서는 `@SseSignal()`을 통해 클라이언트 연결 종료와 관련된 `AbortSignal`을 사용할 수 있습니다.

```typescript
import {
  Controller,
  MessageEvent,
  Sse,
  SseSignal,
} from '@nestjs/common';

import {
  Observable,
} from 'rxjs';

@Controller('events')
export class EventsController {
  @Sse('stream')
  stream(
    @SseSignal() signal: AbortSignal,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>(
      (subscriber) => {
        const timer = setInterval(() => {
          subscriber.next({
            data: {
              timestamp: Date.now(),
            },
          });
        }, 1000);

        const onAbort = () => {
          subscriber.complete();
        };

        signal.addEventListener(
          'abort',
          onAbort,
          { once: true },
        );

        return () => {
          clearInterval(timer);

          signal.removeEventListener(
            'abort',
            onAbort,
          );
        };
      },
    );
  }
}
```

`@SseSignal()`의 지원 여부는 사용하는 NestJS 버전에 따라 확인해야 합니다.

연결 종료 시 실행되는 정리 작업과 Observable의 Teardown은 함께 실행될 수 있으므로 중복 실행되어도 안전하도록 설계해야 합니다.

---

## 13. Heartbeat

SSE 연결이 오랫동안 데이터를 전송하지 않으면 중간 프록시 또는 Load Balancer가 유휴 연결로 판단하여 종료할 수 있습니다.

이러한 상황에서는 주기적인 Heartbeat 전송을 고려할 수 있습니다.

### 13.1. Comment 기반 Heartbeat

SSE 프로토콜에서는 Comment를 이용한 Heartbeat를 전송할 수 있습니다.

```text
: heartbeat

```

이 방식은 실제 비즈니스 이벤트를 발생시키지 않고 연결을 유지하는 데 활용할 수 있습니다.

### 13.2. NestJS Heartbeat 구현

다음 예제는 일반 MessageEvent를 Heartbeat 용도로 사용하는 방식입니다.

```typescript
@Sse('heartbeat')
heartbeat(): Observable<MessageEvent> {
  return interval(15000).pipe(
    map(() => ({
      type: 'heartbeat',
      data: {
        timestamp: Date.now(),
      },
    })),
  );
}
```

이 예제는 15초마다 Heartbeat 이벤트를 전송합니다.

HTTP 전송 계층에서 주석 기반 Heartbeat를 전송하는 방식과 달리, 위 예제는 클라이언트에서도 수신할 수 있는 일반 SSE 이벤트를 생성합니다.

Heartbeat 주기는 프록시의 Idle Timeout, 연결 수 및 네트워크 환경을 고려하여 결정해야 합니다.

---

## 14. 자동 재연결과 Last-Event-ID

EventSource는 연결이 예기치 않게 종료되면 자동으로 재연결을 시도할 수 있습니다.

### 14.1. 재연결 과정

```text
Client                         Server
  |                              |
  |------ GET /events ---------->|
  |<----- id: 1001 --------------|
  |<----- id: 1002 --------------|
  |                              |
  |       Connection Lost        |
  |                              |
  |------ GET /events ---------->|
  |       Last-Event-ID: 1002    |
  |                              |
  |<----- id: 1003 --------------|
  |<----- id: 1004 --------------|
```

서버가 이벤트 ID를 제공하면 클라이언트는 마지막 이벤트 ID를 기억할 수 있습니다.

재연결 요청에는 `Last-Event-ID` 헤더가 포함될 수 있습니다.

### 14.2. NestJS에서 Last-Event-ID 확인

```typescript
import {
  Controller,
  Headers,
  MessageEvent,
  Sse,
} from '@nestjs/common';

import {
  interval,
  map,
  Observable,
} from 'rxjs';

@Controller('events')
export class EventsController {
  @Sse('stream')
  stream(
    @Headers('last-event-id')
    lastEventId?: string,
  ): Observable<MessageEvent> {
    console.log(
      'Last Event ID:',
      lastEventId,
    );

    return interval(1000).pipe(
      map((count) => ({
        id: String(count + 1),
        data: {
          count,
        },
      })),
    );
  }
}
```

이 코드는 Last-Event-ID를 읽는 방법을 보여주기 위한 예제입니다.

실제 이벤트 복구를 수행하려면 서버가 마지막 이벤트 ID 이후의 데이터를 조회할 수 있어야 합니다.

위 예제는 연결마다 이벤트 ID를 새로 생성하므로 재연결 복구에는 적합하지 않습니다.

### 14.3. 이벤트 복구 설계

이벤트 복구를 지원하려면 다음 구성 요소가 필요할 수 있습니다.

- 이벤트 식별자
- 이벤트 저장소
- 마지막 수신 위치
- 누락 이벤트 조회
- 이벤트 중복 처리
- 이벤트 보존 정책

예를 들어 다음과 같은 구조를 사용할 수 있습니다.

```text
Event Producer
      |
      v
Event Store
      |
      v
SSE Service
      |
      | Last-Event-ID
      v
SSE Client
```

SSE는 Last-Event-ID를 전달하는 기능을 제공하지만, 이벤트 저장과 복구는 애플리케이션에서 구현해야 합니다.

---

## 15. SSE의 데이터 전달 보장

SSE는 HTTP 연결을 이용하여 이벤트를 순서대로 전달합니다.

그러나 다음 기능이 자동으로 보장되는 것은 아닙니다.

- 클라이언트의 비즈니스 로직 처리 완료
- 서버 이벤트의 영구 저장
- 연결 종료 중 발생한 이벤트의 재전송
- 모든 이벤트의 Exactly-once 처리
- 이벤트 중복 제거

### 15.1. At-most-once 성격의 구현

이벤트를 저장하지 않고 메모리에서 즉시 전송하는 단순한 SSE 구조에서는 연결이 끊어진 동안 발생한 이벤트가 유실될 수 있습니다.

### 15.2. 이벤트 복구

이벤트 저장소와 Last-Event-ID를 조합하면 누락 이벤트를 다시 전달하는 구조를 구현할 수 있습니다.

그러나 네트워크 장애 또는 재연결 과정에서 동일한 이벤트가 중복 전달될 수 있으므로 클라이언트의 중복 처리 정책도 필요합니다.

### 15.3. Snapshot 기반 복구

실시간 상태 표시가 목적이라면 모든 중간 이벤트를 재전송하기보다 최신 상태를 다시 조회하는 방식이 적합할 수 있습니다.

예를 들어 주식 시세 서비스에서는 다음과 같은 방식으로 상태를 복구할 수 있습니다.

1. 클라이언트가 SSE 연결을 생성합니다.
2. 서버가 최신 가격 Snapshot을 전달합니다.
3. 이후 발생하는 가격 변경 이벤트를 전달합니다.
4. 연결이 끊어지면 재연결합니다.
5. 최신 Snapshot을 다시 조회하여 상태를 동기화합니다.

단, Snapshot과 이후 이벤트 사이의 누락 및 중복을 방지하려면 Sequence Number와 일관된 기준 시점을 사용하는 설계가 필요할 수 있습니다.

---

## 16. SSE 기반 실시간 시세 스트리밍

SSE는 서버에서 클라이언트로 데이터를 지속적으로 전달하는 구조이므로 실시간 시세 표시에도 활용할 수 있습니다.

### 16.1. 기본 아키텍처

```text
Market Data Source
        |
        v
Market Data Service
        |
        v
NestJS SSE Controller
        |
        | text/event-stream
        v
EventSource Client
```

클라이언트에서 종목 구독을 변경할 필요가 있다면 별도의 HTTP API를 이용하거나 SSE 연결을 다시 생성할 수 있습니다.

### 16.2. MarketService

`src/market/market.service.ts`

```typescript
import {
  Injectable,
  MessageEvent,
} from '@nestjs/common';

import {
  interval,
  map,
  Observable,
} from 'rxjs';

@Injectable()
export class MarketService {
  streamPrice(
    symbol: string,
  ): Observable<MessageEvent> {
    return interval(1000).pipe(
      map((sequence) => ({
        id: String(sequence + 1),
        type: 'price.updated',
        data: {
          symbol,
          price: 420 + Math.random() * 10,
          timestamp: Date.now(),
        },
      })),
    );
  }
}
```

이 예제는 학습을 위해 임의의 가격을 생성합니다.

실제 시장 데이터 서비스에서는 외부 Feed나 Replay Generator에서 데이터를 공급받도록 구성해야 합니다.

또한 이벤트 ID가 연결마다 다시 시작하므로 메시지 복구용 Sequence로 사용할 수는 없습니다.

### 16.3. MarketController

`src/market/market.controller.ts`

```typescript
import {
  Controller,
  MessageEvent,
  Param,
  Sse,
} from '@nestjs/common';

import { Observable } from 'rxjs';

import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(
    private readonly marketService: MarketService,
  ) {}

  @Sse(':symbol/stream')
  stream(
    @Param('symbol') symbol: string,
  ): Observable<MessageEvent> {
    return this.marketService.streamPrice(
      symbol,
    );
  }
}
```

### 16.4. MarketModule

```typescript
import { Module } from '@nestjs/common';

import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  controllers: [MarketController],
  providers: [MarketService],
})
export class MarketModule {}
```

해당 Module을 Root Module에 Import하면 SSE Endpoint를 사용할 수 있습니다.

### 16.5. 클라이언트

```typescript
const eventSource = new EventSource(
  'http://localhost:3000/market/MSFT/stream',
);

eventSource.addEventListener(
  'price.updated',
  (event) => {
    const priceEvent = JSON.parse(
      event.data,
    ) as {
      symbol: string;
      price: number;
      timestamp: number;
    };

    console.log(
      priceEvent.symbol,
      priceEvent.price,
    );
  },
);
```

이 구조에서는 URL에 종목을 포함하여 해당 종목의 이벤트 스트림을 구독합니다.

다만 예제처럼 클라이언트마다 독립적으로 가격을 생성하면 동일한 종목에 대해 클라이언트마다 다른 가격이 생성됩니다.

실제 서비스에서는 공유되는 Market Data Source에서 생성한 동일 이벤트를 해당 종목의 구독자들에게 전달하도록 설계해야 합니다.

---

## 17. SSE 인증과 인가

SSE는 HTTP 기반이므로 NestJS의 일반적인 인증 및 인가 구조를 활용할 수 있습니다.

### 17.1. Guard 적용

```typescript
import {
  Controller,
  MessageEvent,
  Sse,
  UseGuards,
} from '@nestjs/common';

import { Observable } from 'rxjs';

@Controller('events')
export class EventsController {
  @UseGuards(AuthGuard)
  @Sse('private')
  stream(): Observable<MessageEvent> {
    return this.eventsService.stream();
  }
}
```

이 예제는 `AuthGuard`와 `EventsService`가 별도로 구현되고 등록되어 있다고 가정합니다.

Guard는 SSE 연결을 수립하기 전에 요청자의 접근 권한을 검증할 수 있습니다.

### 17.2. EventSource의 인증 제한

브라우저 기본 `EventSource` 생성자는 일반적인 `fetch()`와 달리 임의의 HTTP Header를 직접 지정하는 옵션을 제공하지 않습니다.

따라서 다음과 같은 Authorization Header를 EventSource 생성자에서 직접 지정할 수는 없습니다.

```http
Authorization: Bearer <access-token>
```

대표적인 대안은 다음과 같습니다.

| 방식 | 설명 |
|---|---|
| Cookie 기반 인증 | HTTP Cookie를 사용하여 사용자 인증 정보를 전달합니다. |
| 별도 인증된 스트림 URL | 짧은 수명의 스트림 접근 토큰을 사용합니다. |
| Fetch 기반 스트리밍 | Fetch와 ReadableStream으로 응답 스트림을 직접 처리합니다. |
| 별도 EventSource 구현체 | 사용자 정의 Header를 지원하는 라이브러리를 사용합니다. |

URL에 장기적인 Access Token을 직접 포함하는 방식은 서버 로그, 브라우저 기록 등에서 토큰이 노출될 위험이 있으므로 피하는 것이 좋습니다.

### 17.3. Cookie 기반 인증

브라우저 EventSource는 다음과 같이 Credentials 설정을 사용할 수 있습니다.

```typescript
const eventSource = new EventSource(
  'https://api.example.com/events',
  {
    withCredentials: true,
  },
);
```

Cross-Origin 환경에서 Cookie를 사용하려면 적절한 CORS 설정과 Cookie의 SameSite 및 Secure 속성을 함께 검토해야 합니다.

또한 Cookie 기반 인증에서는 CSRF 관련 위험도 고려해야 합니다.

### 17.4. 연결 도중 권한 변경

SSE 연결은 장시간 유지될 수 있으므로 연결 수립 시점에 유효했던 인증 정보가 이후 만료되거나 폐기될 수 있습니다.

Guard를 통한 최초 인증만으로 지속적인 인가가 자동 보장되는 것은 아닙니다.

보안 요구사항에 따라 스트림의 최대 유지 시간, 주기적인 권한 검증 및 연결 종료 정책을 구성해야 합니다.

---

## 18. CORS와 보안

SSE는 HTTP 요청으로 동작하므로 브라우저의 Same-Origin Policy 및 CORS 정책의 영향을 받습니다.

### 18.1. CORS 설정

```typescript
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(3000);
}

void bootstrap();
```

이 예제는 React/Vite 개발 서버에서 NestJS SSE Endpoint에 접근하는 상황을 가정합니다.

운영 환경에서는 실제로 허용할 Origin을 명시적으로 설정해야 합니다.

### 18.2. 주요 보안 고려사항

- HTTPS 사용
- 사용자 인증
- 이벤트별 접근 권한
- CORS 정책
- 연결 수 제한
- 요청 빈도 제한
- 민감한 이벤트 데이터 보호
- 스트림 유지 시간 제한
- 사용자별 자원 사용량 제한

특히 SSE는 하나의 요청이 장시간 연결을 점유할 수 있으므로 연결 생성 요청 수뿐 아니라 활성 연결 수도 관리할 필요가 있습니다.

---

## 19. 느린 클라이언트와 Backpressure

서버가 클라이언트의 수신 속도보다 빠르게 이벤트를 생성하면 송신 대기 데이터가 누적될 수 있습니다.

이러한 문제는 Backpressure와 관련이 있습니다.

### 19.1. 발생 구조

```text
Event Producer
      |
      | 5,000 events/s
      v
SSE Server
      |
      | Slow Network
      v
SSE Client
```

서버의 데이터 생산 속도가 실제 전송 속도를 초과하면 대기 버퍼가 증가할 수 있습니다.

### 19.2. NestJS의 제한

NestJS의 최신 SSE 구현에서는 느린 클라이언트를 위한 송신 대기 데이터 제한을 제공합니다.

기본 제한에 도달하면 연결을 종료하여 메모리 사용량이 무한히 증가하는 상황을 방지할 수 있습니다.

지원 버전에서는 다음과 같이 `maxPendingDataLength`를 지정할 수 있습니다.

```typescript
@Sse('logs', {
  maxPendingDataLength: 4 * 1024 * 1024,
})
logs(): Observable<MessageEvent> {
  return this.logsService.stream();
}
```

해당 옵션의 정확한 지원 여부, 단위 및 기본값은 설치된 NestJS 버전의 공식 문서를 확인해야 합니다.

제한을 증가시키는 것만으로 느린 클라이언트 문제가 해결되는 것은 아닙니다.

### 19.3. 대응 전략

| 전략 | 설명 |
|---|---|
| Throttling | 이벤트 전송 빈도를 제한합니다. |
| Sampling | 일부 이벤트를 선택하여 전송합니다. |
| Coalescing | 동일 대상의 변경 이벤트를 병합합니다. |
| Batching | 여러 이벤트를 하나로 묶어 전송합니다. |
| Buffer Limit | 대기 데이터 크기를 제한합니다. |
| Disconnect | 처리하지 못하는 연결을 종료합니다. |
| Snapshot Recovery | 재연결 이후 최신 상태를 복원합니다. |

예를 들어 실시간 시세 표시에서는 짧은 시간 동안 발생한 여러 가격 변경 중 최신 가격만 전달하는 전략을 사용할 수 있습니다.

반면 거래 체결 이력이나 감사 로그처럼 모든 이벤트가 중요한 데이터에서는 임의의 이벤트 삭제 또는 병합이 적합하지 않을 수 있습니다.

---

## 20. SSE 수평 확장

SSE 연결도 특정 서버 인스턴스에서 유지됩니다.

따라서 여러 NestJS 인스턴스를 실행하는 경우 연결과 이벤트 전달 경로를 함께 고려해야 합니다.

### 20.1. 단일 인스턴스

```text
            SSE Clients
                 |
                 v
             SSE Server
                 |
          +------+------+
          |      |      |
       Client1 Client2 Client3
```

서버는 자신에게 연결된 모든 클라이언트에 이벤트를 전달합니다.

### 20.2. 다중 인스턴스

```text
              SSE Clients
                   |
                   v
             Load Balancer
                   |
         +---------+---------+
         |         |         |
         v         v         v
       SSE1      SSE2      SSE3
         |         |         |
       Local     Local     Local
     Streams   Streams   Streams
```

각 인스턴스는 자신에게 연결된 클라이언트의 HTTP 스트림을 관리합니다.

여러 서버 인스턴스 사이에서 In-memory Subject가 자동으로 공유되지는 않습니다.

### 20.3. 이벤트 라우팅

특정 이벤트를 필요한 SSE 인스턴스에만 전달하는 구조를 설계할 수 있습니다.

```text
              MSFT Event
                  |
                  v
            Routing Layer
                  |
        +---------+---------+
        |         |         |
        v         v         v
       SSE1      SSE2      SSE3
        |         |         |
        v         v         v
      Local     Local     Local
      MSFT      MSFT      MSFT
    Clients   Clients   Clients
```

이 구조는 WebSocket Gateway의 수평 확장과 유사합니다.

다만 SSE에서는 HTTP 응답 스트림을 통해 이벤트를 전달한다는 차이가 있습니다.

### 20.4. 이벤트 전달 방식

서버 인스턴스 사이의 이벤트 전달에는 다양한 기술을 사용할 수 있습니다.

- 직접적인 서비스 간 RPC
- HTTP 기반 내부 이벤트 전달
- NATS
- Kafka
- Redis Streams
- 기타 메시징 시스템

어떤 기술을 사용할지는 이벤트 전달 지연, 내구성, 재처리 및 운영 복잡도에 따라 결정해야 합니다.

SSE 프로토콜 자체는 특정 메시지 브로커를 요구하지 않습니다.

---

## 21. Kubernetes에서의 SSE 운영

Kubernetes에서는 SSE 서버를 여러 Pod로 배포할 수 있습니다.

```text
             SSE Clients
                  |
                  v
                Ingress
                  |
                  v
                Service
                  |
         +--------+--------+
         |        |        |
         v        v        v
       Pod 1    Pod 2    Pod 3
```

### 21.1. 연결 분산

Kubernetes Service는 새로운 TCP 연결을 적절한 Backend Pod로 전달합니다.

이미 생성된 SSE 연결은 해당 Pod에서 유지됩니다.

SSE 이벤트마다 새로운 Pod를 선택하는 구조는 아닙니다.

### 21.2. Ingress와 Proxy Buffering

SSE에서는 서버가 전송한 이벤트를 클라이언트가 즉시 받을 수 있어야 합니다.

그러나 Reverse Proxy가 HTTP Response를 버퍼링하면 이벤트가 여러 개 모인 뒤 전달될 수 있습니다.

따라서 사용하는 Ingress Controller 또는 Reverse Proxy의 Response Buffering 설정을 확인해야 합니다.

NGINX 기반 환경에서는 다음 설정을 검토할 수 있습니다.

```nginx
proxy_buffering off;
proxy_read_timeout 3600s;
```

설정 위치와 적용 방법은 사용하는 NGINX 및 Ingress Controller에 따라 달라집니다.

또한 SSE에 사용하는 Endpoint에서 필요한 경우 다음 응답 헤더를 고려할 수 있습니다.

```http
X-Accel-Buffering: no
```

이 헤더의 동작은 사용하는 Proxy가 이를 지원하는지에 따라 달라집니다.

### 21.3. HPA

SSE 서버의 확장 기준으로 다음 지표를 고려할 수 있습니다.

| 지표 | 설명 |
|---|---|
| Active Connections | 현재 활성 SSE 연결 수 |
| Events per Second | 초당 이벤트 전송량 |
| Outgoing Bytes | 송신 데이터량 |
| CPU Usage | CPU 사용률 |
| Memory Usage | 메모리 사용량 |
| Buffered Data | 송신 대기 데이터 크기 |
| Send Latency | 이벤트 전송 지연 |

CPU 사용률만으로 지속적인 SSE 연결이 소비하는 자원을 충분히 설명하지 못할 수 있습니다.

따라서 연결 수 및 송신량과 같은 Custom Metric을 함께 활용할 수 있습니다.

### 21.4. Graceful Shutdown

SSE Pod가 종료되면 해당 Pod에서 유지하던 스트림도 종료됩니다.

종료 과정에서는 다음 사항을 고려해야 합니다.

1. 새로운 연결 수락을 중단합니다.
2. 종료 상태를 Readiness Probe에 반영합니다.
3. 필요한 경우 클라이언트에 종료 예정 이벤트를 전달합니다.
4. 이벤트 Producer와 관련 자원을 정리합니다.
5. 기존 SSE 연결을 종료합니다.
6. Pod 종료 절차를 완료합니다.

브라우저 EventSource는 연결 종료 후 재연결을 시도할 수 있습니다.

하지만 재연결 과정에서 이벤트가 유실되지 않도록 하려면 별도의 이벤트 복구 전략이 필요합니다.

---

## 22. HTTP/1.1과 HTTP/2

SSE는 HTTP/1.1과 HTTP/2 환경에서 사용할 수 있습니다.

### 22.1. HTTP/1.1

HTTP/1.1에서는 브라우저와 동일 Origin 간에 동시에 유지할 수 있는 연결 수가 제한될 수 있습니다.

여러 탭에서 SSE 연결을 각각 생성한다면 연결 수 제한의 영향을 받을 수 있습니다.

### 22.2. HTTP/2

HTTP/2는 하나의 연결에서 여러 Stream을 Multiplexing할 수 있습니다.

따라서 다수의 SSE 스트림을 사용하는 환경에서 HTTP/1.1의 연결 수 제약을 완화할 수 있습니다.

다만 실제 동시 Stream 수는 클라이언트와 서버의 HTTP/2 설정에 따라 제한됩니다.

또한 SSE 서버가 HTTP/2로 직접 통신하는지, 중간 Proxy가 HTTP/2 연결을 종료하고 내부적으로 HTTP/1.1을 사용하는지에 따라 실제 네트워크 구조가 달라질 수 있습니다.

---

## 23. SSE 운영 모니터링

운영 환경에서는 장시간 유지되는 연결과 이벤트 전달 상태를 관찰해야 합니다.

| 지표 | 목적 |
|---|---|
| Active SSE Connections | 현재 연결 수 |
| Connections per Instance | 인스턴스별 연결 분포 |
| Connection Rate | 신규 연결 발생량 |
| Disconnection Rate | 연결 종료 발생량 |
| Reconnection Rate | 재연결 발생량 |
| Events Sent | 전송 이벤트 수 |
| Bytes Sent | 전송 데이터 크기 |
| Event Delivery Latency | 이벤트 전달 지연 |
| Pending Buffer Size | 송신 대기 데이터 크기 |
| Stream Duration | 연결 유지 시간 |
| Error Rate | 스트림 처리 오류 비율 |

### 23.1. 연결 수 관찰

SSE 연결은 HTTP 요청이 완료될 때까지 서버 자원을 사용합니다.

따라서 일반적인 API 요청 수와 별도로 활성 스트림 수를 관찰하는 것이 좋습니다.

### 23.2. 이벤트 전달 지연

이벤트 생성 시각과 클라이언트가 이벤트를 수신한 시각을 비교하면 End-to-End 전달 지연을 측정할 수 있습니다.

다만 클라이언트와 서버의 시스템 시간이 정확하게 동기화되지 않았다면 측정값에 오차가 발생할 수 있습니다.

### 23.3. 재연결 비율

재연결이 빈번하게 발생한다면 다음 사항을 확인할 수 있습니다.

- 네트워크 연결 품질
- Load Balancer Timeout
- Proxy Buffering
- 서버 재시작
- 과도한 송신 대기 데이터
- 클라이언트 연결 관리

---

## 24. SSE와 WebSocket 비교

SSE와 WebSocket은 모두 실시간 통신에 활용할 수 있지만 프로토콜과 통신 모델이 다릅니다.

| 항목 | SSE | WebSocket |
|---|---|---|
| 기반 | HTTP Streaming | WebSocket Protocol |
| 통신 방향 | Server → Client | 양방향 |
| 브라우저 API | EventSource | WebSocket |
| 연결 수립 | HTTP 요청 | WebSocket Handshake |
| 데이터 형식 | UTF-8 Text | Text / Binary |
| 이벤트 ID | 기본 프로토콜 지원 | 애플리케이션에서 구현 |
| 자동 재연결 | EventSource 지원 | 직접 구현 또는 라이브러리 활용 |
| 메시지 복구 | 별도 구현 필요 | 별도 구현 필요 |
| 클라이언트 메시지 전송 | 별도 HTTP 요청 필요 | 동일 연결에서 가능 |
| HTTP 기반 인증 | 활용 가능 | Handshake 및 메시지 인증 |
| 주요 활용 | 알림, 로그, 단방향 스트림 | 채팅, 양방향 실시간 처리 |

### 24.1. SSE가 적합한 경우

다음과 같은 상황에서는 SSE를 고려할 수 있습니다.

- 서버에서 클라이언트로만 이벤트를 전달하는 경우
- 브라우저의 기본 API를 사용하려는 경우
- HTTP 인프라를 활용하려는 경우
- 작업 진행률이나 로그를 스트리밍하는 경우
- 단순한 서버 Push 구조가 필요한 경우

### 24.2. WebSocket이 적합한 경우

다음과 같은 상황에서는 WebSocket이 적합할 수 있습니다.

- 클라이언트와 서버가 지속적으로 양방향 메시지를 교환하는 경우
- 단일 연결에서 구독 및 구독 해제 명령을 자주 전달하는 경우
- Binary 메시지를 전송해야 하는 경우
- 실시간 협업 또는 게임과 같은 양방향 상호작용이 필요한 경우
- 애플리케이션 수준의 메시징 프로토콜을 직접 구성하려는 경우

### 24.3. 실시간 시세 스트리밍 비교

주식 시세 스트리밍에서는 다음과 같이 구분할 수 있습니다.

| 요구사항 | SSE | WebSocket |
|---|---|---|
| 단일 종목 시세 수신 | 적합 | 적합 |
| 여러 종목 시세 수신 | 가능 | 가능 |
| 구독 종목 변경 | HTTP 요청 또는 재연결 | 동일 연결에서 이벤트 전달 |
| 서버에서 가격 Push | 지원 | 지원 |
| Client → Server 메시지 | 별도 HTTP 요청 | 지원 |
| Binary Market Data | 별도 인코딩 필요 | 지원 |
| 구독자 Fan-out | 별도 구현 | 별도 구현 |

SSE와 WebSocket 중 어느 방식이 더 높은 성능을 제공하는지는 연결 수, 메시지 크기, 전송 빈도 및 실제 구현에 따라 달라집니다.

성능 요구사항이 중요한 경우 동일한 조건에서 부하 테스트를 수행해야 합니다.

---

## 25. SSE와 REST API 비교

REST API와 SSE는 모두 HTTP를 활용하지만 응답 처리 방식이 다릅니다.

### 25.1. REST API

```text
Client
   |
   | GET /prices/MSFT
   v
Server
   |
   | HTTP Response
   v
Client
```

일반적인 REST API는 요청마다 하나의 응답을 반환합니다.

### 25.2. SSE

```text
Client
   |
   | GET /prices/MSFT/stream
   v
Server
   |
   +-- Price Event 1
   |
   +-- Price Event 2
   |
   +-- Price Event 3
   |
   +-- ...
```

SSE는 하나의 응답을 장시간 유지하면서 여러 이벤트를 전송합니다.

따라서 REST API와 SSE를 함께 사용할 수 있습니다.

예를 들어 초기 데이터 조회는 REST API로 처리하고 이후 변경 사항은 SSE로 전달하는 구조를 사용할 수 있습니다.

---

## 26. Spring Boot와 NestJS의 SSE 비교

Spring Boot에서는 Spring MVC 또는 Spring WebFlux를 통해 SSE를 구현할 수 있습니다.

NestJS는 `@Sse()`와 RxJS Observable을 활용합니다.

| 항목 | Spring MVC | Spring WebFlux | NestJS |
|---|---|---|---|
| SSE 구현 | `SseEmitter` 등 | `Flux` | `@Sse()` + Observable |
| 이벤트 모델 | `SseEmitter.event()` | `ServerSentEvent` | `MessageEvent` |
| 비동기 처리 | Servlet Async 기반 | Reactive Streams 기반 | RxJS 및 Node.js |
| 이벤트 스트림 | SseEmitter | Flux | Observable |
| 연결 정리 | Completion / Timeout Callback | Reactive Lifecycle | Observable Teardown |
| DI | Spring Container | Spring Container | NestJS DI Container |

Spring WebFlux의 `Flux`와 NestJS의 RxJS `Observable`은 모두 여러 값을 비동기적으로 표현할 수 있습니다.

다만 Reactive Streams의 Backpressure 모델과 RxJS Observable의 동작은 동일하지 않습니다.

따라서 두 프레임워크에서 동일한 스트림 처리 정책이 자동으로 적용된다고 가정해서는 안 됩니다.

---

## 27. 실무 설계 시 고려사항

### 27.1. 이벤트 설계

- 이벤트 이름 정의
- 이벤트 데이터 Schema
- 이벤트 식별자
- 이벤트 생성 시각
- 이벤트 버전 관리
- 이벤트 순서 보장 범위
- 중복 이벤트 처리

### 27.2. 연결 관리

- 최대 활성 연결 수
- 연결 유지 시간
- Heartbeat
- Proxy Timeout
- 연결 종료 시 자원 정리
- 재연결 전략
- 인증 정보 만료

### 27.3. 데이터 복구

- Last-Event-ID
- 이벤트 저장소
- 이벤트 보존 기간
- 누락 이벤트 재전송
- Snapshot 기반 상태 복구
- 클라이언트 중복 제거

### 27.4. 성능

- 이벤트 발생 빈도
- 이벤트 크기
- 전송 버퍼 제한
- 느린 클라이언트 처리
- 이벤트 Batching
- 불필요한 데이터 전송 최소화
- 인스턴스별 연결 분산

### 27.5. 보안

- HTTPS
- 인증 및 인가
- Cookie 정책
- CORS
- 연결 수 제한
- 민감한 데이터 보호
- 사용자별 이벤트 접근 제어

SSE는 프로토콜 자체가 비교적 단순하지만, 대규모 서비스에서는 연결 상태, 자원 사용량 및 이벤트 복구를 별도로 설계해야 합니다.

---

## 28. 정리

Server-Sent Events는 서버가 HTTP 연결을 유지하면서 클라이언트에 이벤트를 지속적으로 전달하는 단방향 Server Push 기술입니다.

NestJS는 `@Sse()`와 RxJS Observable을 이용하여 SSE Endpoint를 간결하게 구현할 수 있도록 지원합니다.

핵심 사항은 다음과 같습니다.

1. SSE는 HTTP 기반의 단방향 이벤트 스트리밍 기술입니다.
2. SSE 응답은 `text/event-stream` Content-Type을 사용합니다.
3. 이벤트는 `data`, `event`, `id`, `retry` 등의 필드로 구성할 수 있습니다.
4. NestJS의 `@Sse()`는 SSE Endpoint를 정의합니다.
5. SSE Handler는 Observable을 반환하여 이벤트 스트림을 제공합니다.
6. 브라우저는 EventSource API를 사용하여 SSE 연결을 생성할 수 있습니다.
7. EventSource는 자동 재연결과 Last-Event-ID 기능을 지원합니다.
8. 이벤트 저장과 누락 데이터 복구는 별도로 구현해야 합니다.
9. Subject를 이용해 내부 비즈니스 이벤트를 SSE 클라이언트에 전달할 수 있습니다.
10. 다중 인스턴스 환경에서는 이벤트 전달 경로와 연결 분산을 고려해야 합니다.
11. 운영 환경에서는 Proxy Buffering, Timeout, Backpressure 및 연결 수 관리가 중요합니다.
12. 양방향 통신이 필요한 경우 WebSocket이 더 적합할 수 있습니다.

SSE는 단순한 서버 Push 기능이 필요한 환경에서 유용한 기술입니다.

다만 많은 클라이언트에 고빈도 이벤트를 전송하는 시스템에서는 WebSocket과 마찬가지로 Fan-out 비용, 느린 클라이언트 및 확장성 문제를 고려해야 합니다.

따라서 SSE와 WebSocket은 기능의 우열보다는 통신 방향, 데이터 형식, 연결 관리 및 운영 요구사항을 기준으로 선택해야 합니다.

---

## 29. 관련 문서

| 문서 | 주요 내용 |
|---|---|
| `01-fundamentals/controllers.md` | SSE Endpoint를 제공하는 Controller |
| `01-fundamentals/providers.md` | 이벤트 생성 Service |
| `01-fundamentals/dependency-injection.md` | Controller와 Service의 DI |
| `02-request-lifecycle/guards.md` | SSE 연결 인증 및 인가 |
| `02-request-lifecycle/interceptors.md` | HTTP 요청 및 응답 처리 |
| `02-request-lifecycle/exception-filters.md` | 스트림 오류 처리 |
| `03-techniques/events.md` | 내부 이벤트 처리 |
| `03-techniques/queues.md` | 비동기 작업 처리 |
| `04-security/authentication.md` | 사용자 인증 |
| `04-security/authorization.md` | 이벤트 접근 권한 |
| `04-security/cors.md` | CORS 설정 |
| `05-platforms/rest-api.md` | REST API |
| `05-platforms/websocket.md` | WebSocket 기반 실시간 통신 |
| `05-platforms/microservices.md` | 분산 서비스 간 이벤트 전달 |
| `08-deployment/graceful-shutdown.md` | 연결 종료 및 자원 정리 |
| `08-deployment/performance.md` | 성능 및 확장성 |

---

## 참고 자료

### NestJS 공식 문서

- [NestJS — Server-Sent Events](https://docs.nestjs.com/techniques/server-sent-events)
- [NestJS — Controllers](https://docs.nestjs.com/controllers)
- [NestJS — Providers](https://docs.nestjs.com/providers)
- [NestJS — Events](https://docs.nestjs.com/techniques/events)
- [NestJS — Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS — Authorization](https://docs.nestjs.com/security/authorization)
- [NestJS — CORS](https://docs.nestjs.com/security/cors)
- [NestJS — Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)

### SSE 표준 및 브라우저 API

- [WHATWG HTML Standard — Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MDN — Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [MDN — Using Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [MDN — EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [MDN — EventSource.readyState](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/readyState)
- [MDN — EventSource.close()](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/close)

### RxJS

- [RxJS 공식 문서](https://rxjs.dev/)
- [RxJS — Observable](https://rxjs.dev/guide/observable)
- [RxJS — Subject](https://rxjs.dev/guide/subject)
- [RxJS — interval](https://rxjs.dev/api/index/function/interval)
- [RxJS — map](https://rxjs.dev/api/operators/map)
- [RxJS — finalize](https://rxjs.dev/api/operators/finalize)

### HTTP 및 네트워크

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9113 — HTTP/2](https://www.rfc-editor.org/rfc/rfc9113)
- [NGINX — Proxy Module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [MDN — HTTP Streaming](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)

### Spring Framework

- [Spring Framework — Web MVC Asynchronous Requests](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html)
- [Spring Framework — WebFlux](https://docs.spring.io/spring-framework/reference/web/webflux.html)
- [Spring Framework — Reactive Libraries](https://docs.spring.io/spring-framework/reference/web/webflux/reactive-spring.html)

### Kubernetes 및 운영

- [Kubernetes — Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes — Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Kubernetes — Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes — Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

### 기타 참고 자료

- [NestJS GitHub Repository](https://github.com/nestjs/nest)
- [NestJS Official Examples](https://github.com/nestjs/nest/tree/master/sample)