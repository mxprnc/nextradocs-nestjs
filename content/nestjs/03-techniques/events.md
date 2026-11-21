# Events

## 1. 개요

Events는 애플리케이션 내부에서 특정 사건이 발생했음을 알리고, 해당 사건에 관심이 있는 다른 구성 요소가 후속 작업을 수행하도록 하는 기능입니다.

일반적인 백엔드 애플리케이션에서는 하나의 비즈니스 작업이 여러 후속 작업을 발생시키는 경우가 많습니다.

예를 들어 주문이 생성되면 다음 작업들이 필요할 수 있습니다.

- 주문 생성 이력 기록
- 사용자 알림 발송
- 통계 데이터 갱신
- 이메일 발송 작업 등록

이러한 작업들을 하나의 Service에서 직접 호출하면 Service 간 의존성이 증가하고 비즈니스 로직의 변경 범위가 커질 수 있습니다.

NestJS는 이러한 문제를 해결하기 위해 `@nestjs/event-emitter` 패키지를 제공합니다.

이 패키지는 Observer Pattern을 기반으로 애플리케이션 내부 이벤트를 발행하고 구독할 수 있도록 지원합니다.

내부적으로 `EventEmitter2` 라이브러리를 사용합니다.

주요 기능은 다음과 같습니다.

- 이벤트 발행 및 구독
- 이벤트 기반 모듈 간 결합도 감소
- 하나의 이벤트에 여러 Listener 등록
- 동기 및 비동기 이벤트 처리
- 이벤트 이름 기반 Listener 등록
- Wildcard Event Listener
- Listener 실행 순서 및 우선순위 설정
- 이벤트 처리 오류 관리
- Dependency Injection 기반 Listener 구성
- 애플리케이션 초기화 시 이벤트 유실 방지

`@nestjs/event-emitter`는 기본적으로 동일한 Node.js 프로세스 내부에서 이벤트를 전달하는 기능입니다.

따라서 메시지 영속성, 프로세스 간 이벤트 전달, 실패한 이벤트의 재처리 등이 필요한 경우에는 Queue 또는 별도의 Message Broker를 고려해야 합니다.

## 2. Events가 필요한 이유

### 2.1. 서비스 간 결합도 감소

사용자 생성 후 환영 이메일과 통계 갱신 작업을 수행한다고 가정합니다.

이벤트를 사용하지 않으면 다음과 같이 직접 호출할 수 있습니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly emailService: EmailService,
    private readonly statisticsService: StatisticsService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const user = await this.saveUser(dto);

    await this.emailService.sendWelcome(user);
    await this.statisticsService.updateUserCount();

    return user;
  }
}
```

이 구조에서 `UsersService`는 사용자 생성뿐 아니라 이메일과 통계 기능에도 직접 의존합니다.

새로운 후속 작업이 추가되면 `UsersService`를 수정해야 할 수 있습니다.

이벤트를 사용하면 다음과 같이 구성할 수 있습니다.

```text
UsersService
     |
     | emit('user.created')
     v
EventEmitter2
     |
     +-- EmailListener
     |
     +-- StatisticsListener
     |
     +-- AuditLogListener
```

`UsersService`는 사용자 생성 사실을 이벤트로 발행하고, 다른 구성 요소가 필요한 후속 작업을 수행합니다.

### 2.2. 비즈니스 로직의 책임 분리

이벤트를 사용하면 각 구성 요소의 책임을 구분할 수 있습니다.

| 구성 요소 | 책임 |
|---|---|
| UsersService | 사용자 생성 |
| EventEmitter2 | 이벤트 전달 |
| EmailListener | 이메일 발송 후속 처리 |
| StatisticsListener | 통계 갱신 |
| AuditLogListener | 감사 로그 기록 |

이러한 구조는 기능별 변경 범위를 줄이고 모듈 간 결합도를 낮추는 데 도움이 됩니다.

### 2.3. 기능 확장

하나의 이벤트에 여러 Listener를 등록할 수 있습니다.

따라서 새로운 기능이 추가되더라도 이벤트를 발행하는 Service를 변경하지 않고 새로운 Listener를 추가할 수 있습니다.

다만 이벤트 Payload의 구조가 변경되면 해당 이벤트를 사용하는 Listener에도 영향을 줄 수 있으므로 이벤트 계약을 안정적으로 관리해야 합니다.

## 3. Events의 주요 구성 요소

NestJS의 이벤트 시스템은 다음 구성 요소를 중심으로 동작합니다.

| 구성 요소 | 역할 |
|---|---|
| `EventEmitterModule` | 이벤트 시스템과 Listener 등록 기능을 초기화합니다. |
| `EventEmitter2` | 이벤트를 발행하고 등록된 Listener에 전달합니다. |
| `@OnEvent()` | 특정 이벤트를 처리할 메서드를 등록합니다. |
| Event | 발생한 사건을 나타냅니다. |
| Event Payload | 이벤트와 함께 전달되는 데이터를 나타냅니다. |
| Event Listener | 발행된 이벤트를 수신하여 처리합니다. |
| `EventEmitterReadinessWatcher` | Listener 등록 완료 여부를 확인합니다. |

### 3.1. 기본 아키텍처

```text
       Event Producer
             |
             v
      EventEmitter2
             |
       Event Dispatch
             |
      +------+------+
      |      |      |
      v      v      v
 Listener Listener Listener
    A       B       C
    |       |       |
    v       v       v
 Service  Service  Service
```

Producer는 이벤트가 발생한 사실을 알립니다.

Listener는 이벤트를 구독하여 후속 작업을 수행합니다.

Producer는 해당 이벤트를 구독하는 Listener의 구체적인 구현을 알 필요가 없습니다.

### 3.2. Publisher와 Subscriber

이벤트 기반 구조에서는 다음 용어를 사용할 수 있습니다.

| 용어 | 설명 |
|---|---|
| Publisher | 이벤트를 발행하는 주체 |
| Subscriber | 이벤트를 구독하는 주체 |
| Producer | 이벤트를 생성하고 발행하는 구성 요소 |
| Listener | 이벤트를 수신하여 처리하는 함수 또는 클래스 메서드 |

`@nestjs/event-emitter`에서는 일반적으로 `EventEmitter2`와 `@OnEvent()`를 통해 이러한 역할을 구현합니다.

## 4. 환경 구성

### 4.1. 패키지 설치

NestJS의 이벤트 기능을 사용하려면 다음 패키지를 설치합니다.

```bash
npm install @nestjs/event-emitter
```

`@nestjs/event-emitter`는 내부적으로 EventEmitter2를 사용합니다.

### 4.2. EventEmitterModule 등록

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
  ],
})
export class AppModule {}
```

`EventEmitterModule.forRoot()`는 이벤트 발행 기능을 초기화하고 선언적으로 정의된 Listener를 등록할 수 있도록 구성합니다.

일반적으로 루트 모듈에서 한 번 등록합니다.

### 4.3. 프로젝트 구조

다음과 같은 사용자 생성 기능을 가정합니다.

```text
src/
├── users/
│   ├── dto/
│   │   └── create-user.dto.ts
│   │
│   ├── events/
│   │   └── user-created.event.ts
│   │
│   ├── listeners/
│   │   ├── user-email.listener.ts
│   │   └── user-statistics.listener.ts
│   │
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── app.module.ts
└── main.ts
```

이 구조에서는 이벤트 Payload와 Listener를 별도 디렉터리로 관리합니다.

프로젝트 규모가 작다면 관련 Service와 같은 디렉터리에 배치할 수도 있습니다.

## 5. 이벤트 정의

이벤트는 애플리케이션에서 이미 발생한 사건을 표현하는 것이 일반적입니다.

예를 들어 다음과 같은 이벤트 이름을 사용할 수 있습니다.

```text
user.created
user.updated
user.deleted

order.created
order.cancelled
order.completed

payment.completed
payment.failed
```

이벤트 이름은 일반적으로 명사와 과거형 동사를 조합하여 작성합니다.

### 5.1. 이벤트 Payload 클래스

`users/events/user-created.event.ts`

```typescript
export class UserCreatedEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly occurredAt: Date,
  ) {}
}
```

이 클래스는 사용자 생성 이벤트와 함께 전달할 정보를 정의합니다.

Event Payload는 반드시 클래스로 작성해야 하는 것은 아닙니다.

TypeScript Interface 또는 일반 객체를 사용할 수도 있습니다.

다만 클래스를 사용하면 이벤트 계약을 명시적으로 표현하고 생성자에서 필요한 데이터를 정의하기 쉽습니다.

### 5.2. 이벤트 이름 상수

이벤트 이름을 문자열로 반복해서 작성하면 오타나 이름 변경으로 인한 오류가 발생할 수 있습니다.

따라서 공통 상수를 정의할 수 있습니다.

`users/events/user-events.constants.ts`

```typescript
export const USER_EVENTS = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
} as const;
```

Producer와 Listener에서 동일한 상수를 사용하면 이벤트 이름을 일관되게 관리할 수 있습니다.

## 6. EventEmitter2

`EventEmitter2`는 이벤트를 발행하고 등록된 Listener에 전달하는 객체입니다.

NestJS에서는 Dependency Injection을 통해 주입받아 사용할 수 있습니다.

### 6.1. EventEmitter2 주입

```typescript
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UsersService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}
}
```

`EventEmitter2`는 `EventEmitterModule`이 등록한 Provider를 통해 주입됩니다.

### 6.2. 이벤트 발행

```typescript
this.eventEmitter.emit(
  'user.created',
  new UserCreatedEvent(
    100,
    'user@example.com',
    new Date(),
  ),
);
```

`emit()`의 첫 번째 인자는 이벤트 이름입니다.

두 번째 인자부터는 Listener에 전달할 데이터입니다.

### 6.3. Service 구현

다음 예제는 사용자 생성 후 이벤트를 발행하는 구조입니다.

```typescript
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { UserCreatedEvent } from './events/user-created.event';
import { USER_EVENTS } from './events/user-events.constants';

@Injectable()
export class UsersService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createUser(dto: CreateUserDto) {
    const user = await this.saveUser(dto);

    this.eventEmitter.emit(
      USER_EVENTS.CREATED,
      new UserCreatedEvent(
        user.id,
        user.email,
        new Date(),
      ),
    );

    return user;
  }

  private async saveUser(dto: CreateUserDto) {
    // 예제용 저장 로직
    return {
      id: 100,
      email: dto.email,
    };
  }
}
```

위 예제의 `CreateUserDto`는 별도로 정의되어 있다고 가정합니다.

실제 프로젝트에서는 Repository 또는 데이터베이스 접근 Service를 통해 사용자를 저장할 수 있습니다.

## 7. @OnEvent()

`@OnEvent()`는 특정 이벤트가 발행되었을 때 실행할 Listener 메서드를 등록하는 Decorator입니다.

### 7.1. 기본 사용법

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { UserCreatedEvent } from '../events/user-created.event';
import { USER_EVENTS } from '../events/user-events.constants';

@Injectable()
export class UserEmailListener {
  private readonly logger = new Logger(
    UserEmailListener.name,
  );

  @OnEvent(USER_EVENTS.CREATED)
  handleUserCreated(event: UserCreatedEvent): void {
    this.logger.log(
      `Welcome email requested: ${event.userId}`,
    );
  }
}
```

`@OnEvent(USER_EVENTS.CREATED)`는 `user.created` 이벤트의 Listener를 등록합니다.

해당 이벤트가 발행되면 `handleUserCreated()`가 호출됩니다.

### 7.2. Listener Provider 등록

Listener는 NestJS의 Provider로 등록해야 합니다.

`users.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { UsersService } from './users.service';
import { UserEmailListener } from './listeners/user-email.listener';
import { UserStatisticsListener } from './listeners/user-statistics.listener';

@Module({
  providers: [
    UsersService,
    UserEmailListener,
    UserStatisticsListener,
  ],
  exports: [UsersService],
})
export class UsersModule {}
```

NestJS는 등록된 Provider에서 `@OnEvent()` 메타데이터를 탐색하고 해당 메서드를 이벤트 Listener로 등록합니다.

### 7.3. 하나의 이벤트에 여러 Listener 등록

동일한 이벤트 이름에 여러 Listener를 등록할 수 있습니다.

```typescript
@Injectable()
export class UserEmailListener {
  @OnEvent('user.created')
  async sendWelcomeEmail(event: UserCreatedEvent) {
    // 이메일 발송
  }
}
```

```typescript
@Injectable()
export class UserStatisticsListener {
  @OnEvent('user.created')
  async updateStatistics(event: UserCreatedEvent) {
    // 통계 갱신
  }
}
```

`user.created` 이벤트가 발행되면 두 Listener가 실행 대상이 됩니다.

이때 각 Listener의 처리 완료 순서까지 항상 동일하다고 가정해서는 안 됩니다.

## 8. 이벤트 발행과 Listener 실행 흐름

이벤트 처리 흐름은 다음과 같이 표현할 수 있습니다.

```text
POST /users
     |
     v
UsersController
     |
     v
UsersService.createUser()
     |
     v
Database INSERT
     |
     v
EventEmitter2.emit()
     |
     +-- UserEmailListener
     |
     +-- UserStatisticsListener
     |
     +-- AuditLogListener
     |
     v
UsersService Return
     |
     v
HTTP Response
```

`EventEmitter2`는 같은 프로세스 내부에 등록된 Listener를 호출합니다.

기본적인 `emit()`은 Listener 호출을 동기적으로 시작하지만 비동기 Listener의 Promise가 완료될 때까지 자동으로 기다리지는 않습니다.

따라서 다음 두 개념을 구분해야 합니다.

- Listener 함수가 호출되는 시점
- Listener의 비동기 작업이 완료되는 시점

이 차이는 오류 처리와 트랜잭션 설계에서 중요합니다.

## 9. emit()과 emitAsync()

EventEmitter2는 `emit()`과 `emitAsync()`를 제공합니다.

### 9.1. emit()

```typescript
const handled = this.eventEmitter.emit(
  'user.created',
  event,
);
```

`emit()`은 Boolean을 반환합니다.

일치하는 Listener가 존재하면 일반적으로 `true`, 없으면 `false`를 반환합니다.

반환값이 `true`라고 해서 모든 Listener의 비동기 작업이 성공했다는 의미는 아닙니다.

### 9.2. emitAsync()

```typescript
const results = await this.eventEmitter.emitAsync(
  'user.created',
  event,
);
```

`emitAsync()`는 Listener의 반환 결과를 Promise 배열 형태로 수집합니다.

등록된 Listener들의 Promise가 처리될 때까지 기다리는 방식으로 사용할 수 있습니다.

### 9.3. 두 메서드의 차이

| 구분 | `emit()` | `emitAsync()` |
|---|---|---|
| 반환값 | Boolean | Promise 배열 |
| Listener 호출 | 동기적으로 시작 | Listener 실행 결과를 비동기적으로 수집 |
| 비동기 Listener 완료 대기 | 하지 않음 | 가능 |
| 주요 사용 목적 | 이벤트 알림 | 후속 처리 결과 대기 |
| 오류 처리 | Listener 설정과 호출 방식에 영향받음 | Promise 결과와 Listener 설정에 영향받음 |

### 9.4. emitAsync() 주의사항

NestJS의 `@OnEvent()`는 기본적으로 Listener에서 발생한 오류를 기록하고 억제하는 `suppressErrors: true` 정책을 사용합니다.

따라서 `emitAsync()`를 사용하더라도 Listener가 발생시킨 예외가 반드시 호출자에게 전달되는 것은 아닙니다.

이벤트 처리 결과에 따라 호출자가 실패 여부를 판단해야 한다면 `suppressErrors` 설정과 Listener의 반환 계약을 함께 설계해야 합니다.

또한 `emitAsync()`를 사용한다고 해서 모든 Listener가 데이터베이스 트랜잭션에 자동으로 참여하는 것은 아닙니다.

## 10. 비동기 Event Listener

이벤트 Listener는 비동기 함수로 작성할 수 있습니다.

### 10.1. 기본 사용법

```typescript
@Injectable()
export class UserEmailListener {
  constructor(
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('user.created')
  async handleUserCreated(
    event: UserCreatedEvent,
  ): Promise<void> {
    await this.emailService.sendWelcomeEmail(
      event.email,
    );
  }
}
```

이 예제에서는 Listener가 이메일 발송 Service를 호출합니다.

### 10.2. 비동기 처리의 의미

`async` 메서드로 작성했다고 해서 자동으로 별도의 프로세스나 Worker Thread에서 실행되는 것은 아닙니다.

비동기 Listener도 기본적으로 이벤트를 발행한 Node.js 프로세스에서 실행됩니다.

I/O 작업 중에는 Event Loop가 다른 작업을 처리할 수 있지만 CPU 집약적인 동기 작업은 동일 프로세스의 응답성에 영향을 줄 수 있습니다.

### 10.3. 이벤트와 Queue 결합

이메일 발송처럼 재시도가 필요한 작업이라면 Listener에서 실제 이메일을 발송하는 대신 Queue에 Job을 등록할 수 있습니다.

```typescript
@Injectable()
export class UserEmailListener {
  constructor(
    private readonly emailQueue: EmailProducer,
  ) {}

  @OnEvent('user.created')
  async handleUserCreated(
    event: UserCreatedEvent,
  ): Promise<void> {
    await this.emailQueue.sendWelcomeEmail({
      userId: event.userId,
      email: event.email,
    });
  }
}
```

이 구조에서는 EventEmitter가 내부 이벤트를 전달하고 BullMQ가 작업 실행과 재시도를 담당합니다.

다만 이벤트 발행 후 Queue 등록에 실패할 가능성은 여전히 존재합니다.

중요한 작업이라면 Transactional Outbox와 같은 패턴도 고려해야 합니다.

## 11. @OnEvent() 옵션

`@OnEvent()`는 Listener의 실행 방식을 제어하는 옵션을 제공합니다.

```typescript
@OnEvent('user.created', {
  priority: 10,
  prependListener: false,
  suppressErrors: true,
})
handleUserCreated(event: UserCreatedEvent) {
  // 이벤트 처리
}
```

주요 옵션은 다음과 같습니다.

| 옵션 | 설명 |
|---|---|
| `priority` | Listener의 등록 우선순위를 지정합니다. |
| `prependListener` | 일반적인 Listener 등록 순서보다 앞에 배치하도록 지정합니다. |
| `suppressErrors` | Listener 오류의 기록 및 전파 방식을 제어합니다. |
| `async` | EventEmitter2의 비동기 호출 방식에 대한 옵션입니다. |
| `nextTick` | Node.js의 Next Tick 기반 호출 설정입니다. |
| `promisify` | 비동기 Listener 호출을 Promise 기반으로 처리하도록 설정합니다. |

옵션의 상세 동작은 사용하는 `@nestjs/event-emitter`와 EventEmitter2 버전에 따라 달라질 수 있습니다.

### 11.1. priority

```typescript
@OnEvent('order.created', {
  priority: 10,
})
handleHighPriority() {
  // 먼저 호출되도록 등록
}
```

높은 `priority` 값을 가진 Listener가 먼저 등록되어 호출됩니다.

동일한 우선순위에서는 일반적으로 Listener 발견 순서를 따르며, `prependListener`를 사용하면 등록 순서가 달라질 수 있습니다.

**우선순위는 비동기 작업의 완료 순서를 보장하지 않습니다.**

따라서 Listener 사이에 반드시 지켜야 하는 실행 순서가 있다면 이벤트 우선순위에 의존하기보다 명시적인 작업 흐름을 설계하는 것이 좋습니다.

### 11.2. suppressErrors

```typescript
@OnEvent('order.created', {
  suppressErrors: false,
})
async handleOrderCreated(event: OrderCreatedEvent) {
  throw new Error('Event processing failed');
}
```

`suppressErrors: false`는 Listener에서 발생한 오류를 억제하지 않고 전파하도록 설정합니다.

반대로 기본값인 `true`에서는 오류를 기록하고 억제합니다.

비동기 오류 전파 방식은 `emit()`과 `emitAsync()`의 차이에도 영향을 받습니다.

따라서 중요 작업에서는 각 방식의 실패 동작을 테스트해야 합니다.

## 12. Wildcard Event Listener

Wildcard는 여러 이벤트를 하나의 Listener에서 처리하기 위한 기능입니다.

### 12.1. Wildcard 활성화

`app.module.ts`

```typescript
EventEmitterModule.forRoot({
  wildcard: true,
  delimiter: '.',
});
```

`wildcard: true`를 설정하면 이벤트 이름의 패턴을 이용하여 Listener를 등록할 수 있습니다.

### 12.2. 단일 Wildcard

```typescript
@OnEvent('user.*')
handleUserEvent(payload: unknown) {
  // 사용자 관련 이벤트 처리
}
```

`user.*`는 다음 이벤트와 일치할 수 있습니다.

```text
user.created
user.updated
user.deleted
```

하지만 다음과 같은 다단계 이벤트와는 일치하지 않습니다.

```text
user.profile.updated
```

### 12.3. 다중 Wildcard

```typescript
@OnEvent('user.**')
handleAllUserEvents(payload: unknown) {
  // 모든 하위 사용자 이벤트 처리
}
```

`**`는 여러 단계의 이벤트 이름과 일치할 수 있습니다.

예를 들어 다음 이벤트를 처리할 수 있습니다.

```text
user.created
user.profile.updated
user.account.status.changed
```

### 12.4. Wildcard 주의사항

Wildcard Listener는 여러 종류의 이벤트를 수신하므로 Payload 구조가 서로 다를 수 있습니다.

따라서 특정 DTO나 이벤트 클래스의 구조를 무조건 가정해서는 안 됩니다.

로깅, 모니터링, 공통 감사 작업과 같이 여러 이벤트를 관찰하는 용도로 활용할 수 있습니다.

다만 모든 이벤트를 하나의 Listener에서 복잡하게 분기하면 코드의 유지보수성이 떨어질 수 있습니다.

## 13. 이벤트 리스너의 초기화 시점

NestJS는 애플리케이션 초기화 과정에서 `@OnEvent()`가 적용된 Listener를 탐색하고 등록합니다.

이 과정이 완료되기 전에 이벤트가 발행되면 Listener가 해당 이벤트를 수신하지 못할 수 있습니다.

### 13.1. 이벤트 유실 가능성

예를 들어 생성자나 `onModuleInit()`에서 이벤트를 발행하는 경우를 생각할 수 있습니다.

```typescript
@Injectable()
export class StartupService
  implements OnModuleInit
{
  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.eventEmitter.emit(
      'application.initialized',
    );
  }
}
```

이벤트가 발행되는 시점에 Listener 등록이 완료되지 않았다면 이벤트가 유실될 수 있습니다.

### 13.2. EventEmitterReadinessWatcher

NestJS는 Listener 등록 완료를 확인할 수 있도록 `EventEmitterReadinessWatcher`를 제공합니다.

```typescript
import {
  Injectable,
  OnApplicationBootstrap,
} from '@nestjs/common';

import {
  EventEmitter2,
  EventEmitterReadinessWatcher,
} from '@nestjs/event-emitter';

@Injectable()
export class StartupService
  implements OnApplicationBootstrap
{
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly readinessWatcher:
      EventEmitterReadinessWatcher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.readinessWatcher.waitUntilReady();

    this.eventEmitter.emit(
      'application.initialized',
    );
  }
}
```

`waitUntilReady()`는 이벤트 Listener의 등록이 완료될 때까지 대기합니다.

이 기능은 애플리케이션 부트스트랩 과정에서 이벤트를 발행해야 하는 경우에 유용합니다.

다만 이벤트를 영구 저장하거나 프로세스 재시작 후 복원하는 기능은 아닙니다.

## 14. Request Scope와 Event Listener

NestJS의 Provider는 Singleton, Request, Transient 등의 Injection Scope를 사용할 수 있습니다.

이벤트 Listener의 Scope도 의존성 생성과 생명주기에 영향을 줍니다.

### 14.1. 기본 Singleton Listener

일반적으로 Event Listener는 Singleton Provider로 구성합니다.

```typescript
@Injectable()
export class UserCreatedListener {
  @OnEvent('user.created')
  handle(event: UserCreatedEvent) {
    // 이벤트 처리
  }
}
```

이 방식에서는 애플리케이션이 생성한 Provider 인스턴스를 재사용합니다.

### 14.2. Request-scoped Listener

최신 NestJS 이벤트 모듈에서는 Request-scoped Listener도 지원합니다.

Request-scoped Listener는 이벤트가 처리될 때 해당 이벤트에 사용할 Provider 인스턴스를 생성할 수 있습니다.

이때 이벤트 Payload가 Request Context의 역할을 할 수 있습니다.

Request Scope를 사용하면 이벤트마다 새로운 Provider 인스턴스를 생성해야 하므로 추가적인 생성 비용이 발생할 수 있습니다.

따라서 이벤트 처리량이 많은 시스템에서는 기본 Singleton Listener를 우선적으로 고려하는 것이 좋습니다.

### 14.3. HTTP 요청 Context 전달

HTTP 요청에서 발생한 이벤트에 동일한 Request DI Context를 전달해야 하는 경우에는 `inheritRequestContextId` 옵션을 사용할 수 있습니다.

```typescript
EventEmitterModule.forRoot({
  inheritRequestContextId: true,
});
```

이 기능은 이벤트 Payload가 원본 요청 객체이거나 Context ID를 전달할 수 있도록 구성된 경우에 적용할 수 있습니다.

단순히 옵션을 활성화했다고 해서 모든 이벤트가 자동으로 HTTP 요청 Context를 상속하는 것은 아닙니다.

또한 비동기 이벤트가 원본 HTTP 요청보다 오래 실행되는 경우에는 Request Scope 의존성의 생명주기와 자원 사용을 신중하게 설계해야 합니다.

## 15. 이벤트 Payload 설계

이벤트 Payload는 해당 사건을 처리하는 Listener가 필요로 하는 정보를 포함해야 합니다.

### 15.1. 권장 Payload 구조

```typescript
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: number,
    public readonly userId: number,
    public readonly occurredAt: Date,
  ) {}
}
```

이벤트 Payload에는 다음과 같은 정보를 포함할 수 있습니다.

- 이벤트 대상 식별자
- 이벤트 발생 시각
- 주요 비즈니스 식별자
- 필요한 변경 데이터
- Correlation ID 또는 Trace ID

### 15.2. Entity 직접 전달 주의

다음과 같이 ORM Entity 전체를 이벤트로 전달할 수도 있습니다.

```typescript
this.eventEmitter.emit(
  'user.created',
  userEntity,
);
```

하지만 Entity 전체를 전달하면 다음 문제가 발생할 수 있습니다.

- Listener가 불필요한 내부 데이터에 접근할 수 있습니다.
- 이벤트 계약이 Entity 구조에 종속됩니다.
- Entity 변경이 Listener에 영향을 줄 수 있습니다.
- Lazy Loading이나 ORM의 내부 상태가 의도치 않게 전달될 수 있습니다.
- 민감한 데이터가 포함될 수 있습니다.

따라서 필요한 필드만 포함한 이벤트 Payload를 정의하는 것이 좋습니다.

### 15.3. 이벤트 불변성

이벤트는 이미 발생한 사건을 표현하므로 Listener가 Payload를 변경하지 않도록 설계하는 것이 좋습니다.

```typescript
export class UserCreatedEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
  ) {}
}
```

`readonly`는 TypeScript의 컴파일 시점 변경을 제한하지만 런타임에서 객체의 불변성을 보장하지는 않습니다.

런타임 불변성이 필요하다면 별도의 불변성 정책을 적용해야 합니다.

## 16. 이벤트 오류 처리

이벤트 기반 시스템에서는 Listener의 실행 실패가 Producer의 동작에 어떤 영향을 미쳐야 하는지 명확하게 결정해야 합니다.

### 16.1. 기본 오류 처리

`@OnEvent()`의 기본 `suppressErrors` 값은 `true`입니다.

```typescript
@OnEvent('user.created')
async handleUserCreated(event: UserCreatedEvent) {
  throw new Error('Email sending failed');
}
```

기본 설정에서는 발생한 오류가 로깅되고 억제됩니다.

따라서 이벤트를 발행한 Service가 Listener의 실패를 반드시 인지하는 것은 아닙니다.

### 16.2. 명시적 오류 처리

Listener 내부에서 오류를 직접 처리할 수 있습니다.

```typescript
@OnEvent('user.created')
async handleUserCreated(
  event: UserCreatedEvent,
): Promise<void> {
  try {
    await this.emailService.sendWelcomeEmail(
      event.email,
    );
  } catch (error) {
    this.logger.error(
      'Failed to process user.created event',
      error instanceof Error
        ? error.stack
        : String(error),
    );
  }
}
```

다만 오류를 기록하고 무시하는 방식은 해당 작업이 반드시 완료되어야 하는 경우에는 적절하지 않을 수 있습니다.

### 16.3. 재시도가 필요한 작업

EventEmitter는 실패한 이벤트를 자동으로 영구 저장하거나 재시도하는 기능을 제공하지 않습니다.

따라서 다음과 같은 작업은 Queue 사용을 고려해야 합니다.

- 결제 후처리
- 외부 서비스 동기화
- 이메일 발송
- 파일 변환
- 중요한 알림 발송

Queue의 Retry 및 Backoff 기능은 `queues.md`에서 자세히 설명합니다.

## 17. 이벤트와 데이터베이스 트랜잭션

이벤트를 발행하는 시점은 데이터 정합성에 영향을 줄 수 있습니다.

### 17.1. 트랜잭션 완료 전 이벤트 발행

다음과 같은 구조는 주의해야 합니다.

```text
BEGIN TRANSACTION
        |
        v
INSERT Order
        |
        v
EMIT order.created
        |
        v
Listener Processing
        |
        v
ROLLBACK
```

데이터베이스 작업이 최종적으로 Rollback되었더라도 Listener에서 이메일 발송이나 외부 API 호출이 이미 수행되었을 수 있습니다.

### 17.2. 트랜잭션 완료 후 이벤트 발행

일반적으로 데이터가 실제로 저장되었음을 알리는 이벤트는 트랜잭션이 성공적으로 Commit된 후 발행하는 것이 적절합니다.

```text
BEGIN TRANSACTION
        |
        v
INSERT Order
        |
        v
COMMIT
        |
        v
EMIT order.created
        |
        v
Event Listeners
```

다만 Commit과 이벤트 발행은 별개의 작업입니다.

Commit이 성공한 직후 애플리케이션 프로세스가 종료되면 이벤트가 발행되지 않을 수 있습니다.

### 17.3. Transactional Outbox

중요한 이벤트의 유실 가능성을 줄이기 위해 Transactional Outbox 패턴을 사용할 수 있습니다.

```text
OrdersService
      |
      v
Database Transaction
      |
      +-- INSERT Order
      |
      +-- INSERT Outbox Event
      |
      v
    COMMIT
      |
      v
Outbox Publisher
      |
      v
Message Broker / Queue
      |
      v
Consumer
```

이 방식에서는 비즈니스 데이터와 이벤트 발행 대기 기록을 하나의 데이터베이스 트랜잭션으로 저장합니다.

이후 별도의 Publisher가 Outbox에 저장된 이벤트를 외부 시스템으로 전달합니다.

이벤트의 중복 발행 가능성은 여전히 존재하므로 Consumer의 멱등성도 고려해야 합니다.

## 18. EventEmitter와 Queue 비교

EventEmitter와 Queue는 모두 작업 간 결합도를 줄이는 데 사용할 수 있지만 실행 모델이 다릅니다.

| 구분 | EventEmitter | Queue |
|---|---|---|
| 기본 실행 범위 | 동일 프로세스 | 여러 프로세스 |
| 이벤트 저장 | 기본적으로 없음 | Job 저장 지원 |
| 작업 재시도 | 기본 제공하지 않음 | 지원 |
| Worker 수평 확장 | 직접 구현 필요 | 지원 |
| 처리 상태 조회 | 기본 제공하지 않음 | 지원 |
| 주요 목적 | 내부 이벤트 전달 | 비동기 작업 관리 |
| 대표 기술 | EventEmitter2 | BullMQ |

### 18.1. EventEmitter가 적합한 경우

다음과 같은 경우에 적합합니다.

- 애플리케이션 내부 상태 변경 알림
- 모듈 간 이벤트 전달
- 간단한 후속 작업
- 로컬 캐시 무효화 알림
- 부가적인 감사 로그 처리

단, 이벤트 유실이 허용되지 않는 감사 기록이라면 영속적인 저장 구조를 사용해야 합니다.

### 18.2. Queue가 적합한 경우

다음과 같은 경우에 적합합니다.

- 실패한 작업의 재시도
- 여러 Worker를 이용한 분산 처리
- 실행 시간이 긴 작업
- 대기열 및 처리 상태 관리
- 처리량과 동시성 제어

### 18.3. EventEmitter와 Queue 결합

두 기술은 함께 사용할 수 있습니다.

```text
UsersService
     |
     v
EventEmitter2
     |
     v
UserCreatedListener
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
EmailService
```

이 구조에서는 모듈 간 이벤트 전달과 실제 비동기 작업 처리의 책임을 분리합니다.

중요한 이벤트의 유실을 방지해야 한다면 영속적인 이벤트 전달 방식도 추가로 고려해야 합니다.

## 19. EventEmitter와 CQRS EventBus

NestJS는 `@nestjs/cqrs` 패키지를 통해 CQRS 패턴을 지원합니다.

해당 패키지에는 `EventBus`와 `@EventsHandler()`가 포함되어 있습니다.

### 19.1. EventEmitter

```typescript
this.eventEmitter.emit(
  'order.created',
  event,
);
```

```typescript
@OnEvent('order.created')
handle(event: OrderCreatedEvent) {
  // 이벤트 처리
}
```

EventEmitter는 이벤트 이름을 기준으로 Listener를 등록하는 방식입니다.

### 19.2. CQRS EventBus

```typescript
this.eventBus.publish(
  new OrderCreatedEvent(100),
);
```

```typescript
@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler
  implements IEventHandler<OrderCreatedEvent>
{
  handle(event: OrderCreatedEvent) {
    // 이벤트 처리
  }
}
```

CQRS EventBus는 이벤트 클래스를 중심으로 Handler를 등록합니다.

### 19.3. 비교

| 구분 | EventEmitter | CQRS EventBus |
|---|---|---|
| 패키지 | `@nestjs/event-emitter` | `@nestjs/cqrs` |
| 이벤트 식별 | 문자열 또는 Symbol 등 | 이벤트 클래스 |
| Listener 등록 | `@OnEvent()` | `@EventsHandler()` |
| 주요 목적 | 범용 애플리케이션 이벤트 | CQRS 기반 이벤트 처리 |
| Command/Query 분리 | 제공하지 않음 | 관련 기능 제공 |
| 이벤트 영속성 | 기본 제공하지 않음 | 기본적으로 별도 설계 필요 |

CQRS 패턴과 EventBus의 구체적인 활용 방법은 `cqrs.md` 및 `07-architecture/cqrs-pattern.md`에서 다룹니다.

## 20. WebSocket과 Events

애플리케이션 내부 이벤트와 WebSocket 이벤트는 서로 다른 개념입니다.

### 20.1. EventEmitter

EventEmitter는 기본적으로 같은 NestJS 프로세스 내부의 Listener에 이벤트를 전달합니다.

```text
NestJS Process
      |
      +-- EventEmitter2
              |
              +-- Listener A
              +-- Listener B
```

### 20.2. WebSocket

WebSocket은 서버와 클라이언트 사이에서 데이터를 실시간으로 전달하기 위한 통신 방식입니다.

```text
NestJS Gateway
      |
      +-- WebSocket Client A
      +-- WebSocket Client B
      +-- WebSocket Client C
```

### 20.3. 내부 이벤트를 WebSocket으로 전달

다음과 같은 구조를 사용할 수 있습니다.

```text
Business Service
       |
       v
EventEmitter2
       |
       v
WebSocket Event Listener
       |
       v
WebSocket Gateway
       |
       v
Connected Clients
```

예를 들어 주문 상태가 변경되면 EventEmitter를 통해 내부 이벤트를 발행하고, Listener가 WebSocket Gateway를 호출하여 클라이언트에 변경 정보를 전달하도록 구성할 수 있습니다.

다만 다중 Gateway 인스턴스 환경에서는 이벤트가 발행된 프로세스의 EventEmitter만으로 다른 프로세스에 연결된 클라이언트까지 메시지를 전달할 수 없습니다.

별도의 인스턴스 간 이벤트 전달 또는 라우팅 메커니즘이 필요합니다.

## 21. 분산 환경에서의 Events

`@nestjs/event-emitter`는 기본적으로 In-process Event Bus입니다.

Kubernetes에서 여러 NestJS Pod를 실행하면 각 Pod는 독립적인 EventEmitter 인스턴스를 갖습니다.

```text
Kubernetes
     |
     +-- NestJS Pod 1
     |       |
     |       +-- EventEmitter A
     |
     +-- NestJS Pod 2
     |       |
     |       +-- EventEmitter B
     |
     +-- NestJS Pod 3
             |
             +-- EventEmitter C
```

Pod 1에서 이벤트를 발행했다고 해서 Pod 2나 Pod 3의 Listener가 해당 이벤트를 자동으로 수신하는 것은 아닙니다.

### 21.1. 프로세스 간 이벤트 전달

여러 애플리케이션 인스턴스에 이벤트를 전달해야 한다면 다음과 같은 기술을 검토할 수 있습니다.

- Redis Streams
- RabbitMQ
- Apache Kafka
- NATS
- 외부 Message Broker
- BullMQ

각 기술은 메시지 저장, 전달 보장, Consumer 관리 및 처리 모델에서 차이가 있습니다.

### 21.2. 이벤트 전달과 작업 분산의 차이

모든 인스턴스가 동일한 이벤트를 수신해야 하는 경우와 여러 Worker 중 하나만 작업을 처리해야 하는 경우는 구분해야 합니다.

```text
Event Broadcasting
      |
      +-- Consumer A
      +-- Consumer B
      +-- Consumer C
```

```text
Competing Workers
      |
      +-- Worker A
      +-- Worker B
      +-- Worker C

      One Job -> One Worker Attempt
```

전자는 이벤트를 여러 구독자에게 전달하는 구조입니다.

후자는 작업을 여러 Worker가 경쟁적으로 처리하는 구조입니다.

사용할 메시징 기술은 이러한 요구사항을 기준으로 선택해야 합니다.

## 22. 이벤트 기반 아키텍처 설계

애플리케이션이 커질수록 이벤트 이름과 Payload를 체계적으로 관리하는 것이 중요합니다.

### 22.1. 도메인별 이벤트 분리

다음과 같은 구조를 고려할 수 있습니다.

```text
src/
├── users/
│   ├── events/
│   │   ├── user-created.event.ts
│   │   └── user-deleted.event.ts
│   └── listeners/
│       └── user-created.listener.ts
│
├── orders/
│   ├── events/
│   │   ├── order-created.event.ts
│   │   └── order-cancelled.event.ts
│   └── listeners/
│       └── order-created.listener.ts
│
├── payments/
│   ├── events/
│   │   └── payment-completed.event.ts
│   └── listeners/
│       └── payment-completed.listener.ts
│
└── app.module.ts
```

이 구조에서는 관련 이벤트를 기능별 모듈에서 관리합니다.

### 22.2. 이벤트 이름 규칙

다음과 같은 규칙을 사용할 수 있습니다.

```text
{domain}.{event}
```

예시:

```text
user.created
order.cancelled
payment.completed
inventory.decreased
```

이벤트 이름이 동일하더라도 Payload 구조가 변경될 수 있으므로 장기적으로 유지되는 이벤트 계약에서는 버전 관리도 고려할 수 있습니다.

### 22.3. 이벤트 체인 주의

이벤트 Listener에서 다시 다른 이벤트를 발행할 수 있습니다.

```text
order.created
      |
      v
PaymentListener
      |
      v
payment.requested
      |
      v
PaymentProcessor
      |
      v
payment.completed
```

이러한 구조는 복잡한 워크플로를 표현하는 데 유용합니다.

하지만 이벤트가 여러 단계로 연결되면 전체 실행 흐름과 오류 발생 위치를 추적하기 어려울 수 있습니다.

따라서 중요한 비즈니스 워크플로는 명시적인 Orchestration이나 Queue 기반 Workflow로 관리하는 것도 고려해야 합니다.

## 23. 이벤트 로깅과 모니터링

이벤트 기반 시스템에서는 Producer와 Listener 사이의 호출 관계가 코드에 직접 드러나지 않을 수 있습니다.

따라서 이벤트 발행과 처리 결과를 관찰할 수 있도록 구성하는 것이 좋습니다.

### 23.1. 이벤트 로그

```typescript
this.logger.log(
  'Event published',
  {
    eventName: 'user.created',
    userId: event.userId,
  },
);
```

Listener에서도 처리 결과를 기록할 수 있습니다.

```typescript
this.logger.log(
  'Event handled',
  {
    eventName: 'user.created',
    userId: event.userId,
  },
);
```

### 23.2. 주요 모니터링 항목

| 지표 | 설명 |
|---|---|
| Event Published Count | 이벤트 발행 횟수 |
| Event Handled Count | 이벤트 처리 횟수 |
| Event Handler Failure Count | Listener 처리 실패 횟수 |
| Event Processing Duration | Listener 처리 시간 |
| Active Listener Count | 등록된 Listener 수 |
| Event Type Distribution | 이벤트 유형별 발생 비율 |

높은 처리량의 시스템에서는 모든 이벤트를 개별 로그로 기록하기보다 Metrics를 활용하는 것이 효율적일 수 있습니다.

### 23.3. Correlation ID

서로 다른 Listener에서 같은 비즈니스 사건을 처리하는 경우 Correlation ID를 전달할 수 있습니다.

```typescript
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: number,
    public readonly correlationId: string,
  ) {}
}
```

이를 통해 여러 Listener가 출력한 로그를 하나의 작업 흐름으로 연결할 수 있습니다.

## 24. Events 테스트

Events 기능은 이벤트 발행과 Listener 처리를 구분하여 테스트하는 것이 좋습니다.

### 24.1. 이벤트 발행 단위 테스트

EventEmitter2를 Mock Provider로 등록할 수 있습니다.

```typescript
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const eventEmitterMock = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: EventEmitter2,
          useValue: eventEmitterMock,
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('publishes user.created event', async () => {
    await service.createUser({
      email: 'user@example.com',
    } as CreateUserDto);

    expect(eventEmitterMock.emit).toHaveBeenCalledWith(
      'user.created',
      expect.objectContaining({
        userId: 100,
        email: 'user@example.com',
      }),
    );
  });
});
```

위 예제는 앞서 작성한 예제용 `UsersService` 구현을 기준으로 하며, `CreateUserDto` Import가 필요합니다.

실제 데이터베이스를 사용하는 Service에서는 Repository도 Mock으로 등록해야 합니다.

### 24.2. Listener 단위 테스트

Listener가 의존하는 Service를 Mock으로 대체하여 테스트할 수 있습니다.

```typescript
describe('UserEmailListener', () => {
  const emailServiceMock = {
    sendWelcomeEmail: jest.fn(),
  };

  it('sends a welcome email', async () => {
    const listener = new UserEmailListener(
      emailServiceMock as unknown as EmailService,
    );

    const event = new UserCreatedEvent(
      100,
      'user@example.com',
      new Date(),
    );

    await listener.handleUserCreated(event);

    expect(
      emailServiceMock.sendWelcomeEmail,
    ).toHaveBeenCalledWith(
      'user@example.com',
    );
  });
});
```

이 테스트는 Listener의 비즈니스 로직을 검증합니다.

실제 `@OnEvent()` 등록 여부까지 검증하는 것은 아닙니다.

### 24.3. 통합 테스트

실제 이벤트 발행과 Listener 등록을 검증하려면 NestJS TestingModule을 구성할 수 있습니다.

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [
    EventEmitterModule.forRoot(),
  ],
  providers: [
    UsersService,
    UserEmailListener,
    {
      provide: EmailService,
      useValue: emailServiceMock,
    },
  ],
}).compile();

await moduleRef.init();
```

`moduleRef.init()`을 호출하면 NestJS 애플리케이션 생명주기 초기화 과정이 실행됩니다.

이후 이벤트를 발행하고 Listener의 동작을 확인할 수 있습니다.

비동기 Listener를 검증할 때는 Promise의 완료 여부와 `suppressErrors` 설정에 주의해야 합니다.

### 24.4. 주요 테스트 항목

1. 이벤트 이름이 올바르게 사용되는지 확인합니다.
2. 이벤트 Payload가 올바르게 생성되는지 확인합니다.
3. Listener가 정상적으로 등록되는지 확인합니다.
4. 하나의 이벤트에 여러 Listener가 실행되는지 확인합니다.
5. 비동기 Listener의 완료 동작을 확인합니다.
6. Listener 오류 처리 정책을 확인합니다.
7. Wildcard Listener의 이벤트 매칭을 확인합니다.
8. 애플리케이션 초기화 시 이벤트가 유실되지 않는지 확인합니다.
9. 중요한 후속 작업의 중복 처리 방지 정책을 확인합니다.

## 25. Events 적용 시 주의사항

### 25.1. 이벤트는 기본적으로 프로세스 내부에서 전달됩니다.

`EventEmitter2`로 발행한 이벤트는 다른 NestJS 프로세스에 자동으로 전달되지 않습니다.

다중 인스턴스 환경에서는 외부 메시징 시스템이 필요할 수 있습니다.

### 25.2. 이벤트 영속성이 기본 제공되지 않습니다.

프로세스가 종료되거나 Listener가 등록되지 않은 상태에서 이벤트가 발행되면 이벤트가 유실될 수 있습니다.

중요한 이벤트에는 영속적인 저장과 재처리 전략을 고려해야 합니다.

### 25.3. Listener의 오류를 무조건 무시하지 않습니다.

`@OnEvent()`의 기본 오류 억제 동작을 이해하고 후속 작업의 중요도에 따라 적절한 오류 처리 정책을 선택해야 합니다.

### 25.4. 이벤트 처리 순서에 의존하지 않습니다.

Listener의 등록 우선순위가 비동기 작업의 완료 순서까지 보장하지는 않습니다.

순서가 중요한 비즈니스 작업은 명시적으로 순서를 제어해야 합니다.

### 25.5. 이벤트 Payload를 최소화합니다.

불필요한 ORM Entity 전체나 민감한 정보를 이벤트에 전달하지 않는 것이 좋습니다.

### 25.6. CPU 집약적인 작업을 Listener에서 직접 실행하지 않습니다.

동일한 Node.js 프로세스의 Event Loop를 장시간 점유하면 HTTP 요청 처리에도 영향을 줄 수 있습니다.

CPU 집약적인 작업은 별도 Worker 또는 프로세스로 분리하는 것이 적절합니다.

### 25.7. 이벤트 체인을 지나치게 복잡하게 구성하지 않습니다.

이벤트에서 이벤트를 연속적으로 발행하는 구조가 복잡해지면 전체 작업 흐름을 파악하기 어려울 수 있습니다.

### 25.8. 비즈니스 데이터와 이벤트 발행의 정합성을 고려합니다.

데이터베이스 Commit과 이벤트 발행 사이에는 실패 가능성이 존재합니다.

중요한 이벤트에는 Transactional Outbox 등의 패턴을 검토해야 합니다.

## 26. 실무 권장 프로젝트 구조

기능별 모듈을 중심으로 이벤트를 관리하는 구조는 다음과 같습니다.

```text
src/
├── common/
│   └── events/
│       ├── event-names.ts
│       └── event-context.interface.ts
│
├── users/
│   ├── dto/
│   │   └── create-user.dto.ts
│   ├── events/
│   │   └── user-created.event.ts
│   ├── listeners/
│   │   ├── user-email.listener.ts
│   │   └── user-statistics.listener.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── orders/
│   ├── events/
│   │   └── order-created.event.ts
│   ├── listeners/
│   │   └── order-created.listener.ts
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   └── orders.module.ts
│
├── app.module.ts
└── main.ts
```

각 구성 요소의 책임은 다음과 같습니다.

| 구성 요소 | 책임 |
|---|---|
| `event-names.ts` | 공통 이벤트 이름 관리 |
| `event-context.interface.ts` | 이벤트 공통 메타데이터 정의 |
| Event Class | 이벤트 Payload 정의 |
| Listener | 이벤트 수신 및 후속 처리 |
| Feature Service | 비즈니스 로직 및 이벤트 발행 |
| EventEmitterModule | 이벤트 전달 기능 초기화 |

### 26.1. 권장 사항

1. 이벤트 이름을 일관된 규칙으로 정의합니다.
2. 이벤트는 이미 발생한 비즈니스 사실을 표현하도록 구성합니다.
3. 이벤트 Payload에는 필요한 데이터만 포함합니다.
4. Listener는 NestJS Provider로 등록합니다.
5. Listener의 오류 및 비동기 처리 방식을 명확히 합니다.
6. 이벤트의 유실 가능성과 중복 처리 가능성을 구분합니다.
7. 중요한 비동기 작업은 Queue와 결합합니다.
8. 분산 환경에서는 프로세스 간 이벤트 전달 구조를 별도로 설계합니다.
9. 이벤트 발행과 데이터베이스 트랜잭션의 정합성을 고려합니다.
10. 이벤트 처리 결과를 로그와 Metrics로 관찰할 수 있도록 구성합니다.

## 27. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| Event | 애플리케이션에서 발생한 사건 |
| Event Payload | 사건과 함께 전달하는 데이터 |
| `EventEmitterModule` | 이벤트 기능 초기화 |
| `EventEmitter2` | 이벤트 발행 및 전달 |
| `@OnEvent()` | Listener 등록 |
| `emit()` | 이벤트 발행 |
| `emitAsync()` | Listener 실행 결과를 Promise로 수집 |
| Event Listener | 이벤트 수신 및 처리 |
| `priority` | Listener 호출 우선순위 |
| `prependListener` | Listener 등록 위치 조정 |
| `suppressErrors` | Listener 오류 억제 및 전파 정책 |
| Wildcard | 여러 이벤트 이름 패턴 구독 |
| `EventEmitterReadinessWatcher` | Listener 등록 완료 확인 |
| Observer Pattern | 이벤트 발행자와 구독자 사이의 결합도를 낮추는 패턴 |
| In-process Event Bus | 동일 프로세스 내부 이벤트 전달 |
| EventBus | 이벤트를 발행하고 Handler에 전달하는 추상화 |
| Transactional Outbox | 데이터 변경과 이벤트 발행 대기 기록의 정합성 확보 |
| Queue | 영속적인 비동기 작업 관리 |
| Message Broker | 프로세스 또는 서비스 간 메시지 전달 |

## 28. 정리

NestJS의 Events 기능은 애플리케이션 내부에서 발생한 사건을 다른 구성 요소에 전달하고, 이벤트 기반으로 후속 작업을 수행하도록 하는 데 사용합니다.

`@nestjs/event-emitter` 패키지는 EventEmitter2를 기반으로 이벤트를 발행하고 구독하는 기능을 제공합니다.

`EventEmitterModule`은 이벤트 시스템을 초기화하며, `EventEmitter2.emit()`을 사용하여 이벤트를 발행할 수 있습니다.

`@OnEvent()`를 사용하면 하나의 이벤트에 여러 Listener를 등록할 수 있으며, 비즈니스 로직을 여러 모듈로 분리하는 데 활용할 수 있습니다.

또한 Wildcard, Listener Priority, 비동기 이벤트 처리 및 Readiness Watcher 등의 기능을 통해 이벤트 처리 방식을 제어할 수 있습니다.

다만 EventEmitter는 기본적으로 동일한 Node.js 프로세스 내부에서 동작하며 이벤트 영속성이나 실패한 이벤트의 자동 재시도를 제공하지 않습니다.

따라서 중요한 작업에는 Queue, Message Broker 또는 Transactional Outbox와 같은 기술을 함께 고려해야 합니다.

특히 Kubernetes와 같은 분산 환경에서는 각 Pod의 EventEmitter가 독립적으로 동작하므로 프로세스 간 이벤트 전달 요구사항을 별도로 설계해야 합니다.

Events는 애플리케이션 내부의 결합도를 낮추고 기능별 책임을 분리하는 데 유용한 기술입니다.

안정적인 이벤트 기반 시스템을 설계하려면 이벤트 계약, Listener의 오류 처리, 비동기 실행, 데이터 정합성 및 분산 환경의 전달 보장을 함께 고려하는 것이 중요합니다.

## 참고 자료

### NestJS 공식 문서

- [NestJS - Events](https://docs.nestjs.com/techniques/events)
- [NestJS - Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [NestJS - Providers](https://docs.nestjs.com/providers)
- [NestJS - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS - Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [NestJS - Queues](https://docs.nestjs.com/techniques/queues)
- [NestJS - CQRS](https://docs.nestjs.com/recipes/cqrs)
- [NestJS - Testing](https://docs.nestjs.com/fundamentals/testing)
- [NestJS - Transactional Outbox](https://docs.nestjs.com/reliability/outbox)
- [NestJS - Microservices](https://docs.nestjs.com/microservices/basics)

### EventEmitter 관련 자료

- [NestJS Event Emitter GitHub Repository](https://github.com/nestjs/event-emitter)
- [NestJS Event Emitter Examples](https://github.com/nestjs/nest/tree/master/sample/30-event-emitter)
- [EventEmitter2 GitHub Repository](https://github.com/EventEmitter2/EventEmitter2)
- [EventEmitter2 - npm](https://www.npmjs.com/package/eventemitter2)
- [Node.js - Events](https://nodejs.org/api/events.html)
- [Node.js - Async Context Tracking](https://nodejs.org/api/async_context.html)

### 이벤트 기반 아키텍처 및 메시징

- [Martin Fowler - Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Martin Fowler - What do you mean by Event-Driven?](https://martinfowler.com/articles/201701-event-driven.html)
- [Microservices.io - Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [BullMQ 공식 문서](https://docs.bullmq.io/)
- [RabbitMQ 공식 문서](https://www.rabbitmq.com/docs)
- [Apache Kafka 공식 문서](https://kafka.apache.org/documentation/)
- [NATS 공식 문서](https://docs.nats.io/)
- [Redis Streams 공식 문서](https://redis.io/docs/latest/develop/data-types/streams/)