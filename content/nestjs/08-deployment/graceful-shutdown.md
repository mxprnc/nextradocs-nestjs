# Graceful Shutdown

## 1. 개요

Graceful Shutdown은 NestJS 애플리케이션이 종료 신호를 받았을 때 실행 중인 작업과 연결을 적절하게 정리한 후 프로세스를 종료하는 방식입니다.

운영 환경에서는 애플리케이션이 배포, 재시작, Scale-in 또는 인프라 유지보수 등의 이유로 종료될 수 있습니다.

이때 애플리케이션을 즉시 종료하면 처리 중인 HTTP 요청, Database Transaction, Message Queue 작업 또는 WebSocket 연결 등이 예기치 않게 중단될 수 있습니다.

Graceful Shutdown은 이러한 문제를 최소화하기 위해 애플리케이션이 종료되기 전에 필요한 정리 작업을 수행하도록 구성합니다.

NestJS는 Application Lifecycle Hook을 제공하며, `enableShutdownHooks()`를 통해 운영체제의 종료 신호에 대응할 수 있습니다.

주요 학습 항목은 다음과 같습니다.

- Graceful Shutdown의 개념과 필요성
- Graceful Shutdown과 강제 종료의 차이
- SIGTERM, SIGINT, SIGKILL
- NestJS Application Lifecycle Hook
- `enableShutdownHooks()` 설정
- `onModuleDestroy()`, `beforeApplicationShutdown()`, `onApplicationShutdown()`
- HTTP Connection 및 Keep-Alive 처리
- Database, Redis, Queue 리소스 정리
- WebSocket 연결 종료
- Kubernetes Pod Termination Lifecycle
- Readiness Probe 및 Connection Draining
- Docker 환경에서의 종료 신호 전달
- Graceful Shutdown 테스트 및 운영 권장 사항

---

## 2. Graceful Shutdown의 필요성

애플리케이션은 실행 중 다양한 이유로 종료될 수 있습니다.

대표적인 상황은 다음과 같습니다.

| 상황 | 설명 |
|---|---|
| Application Deployment | 신규 버전 배포 과정에서 기존 인스턴스 종료 |
| Rolling Update | 새로운 Pod로 교체하면서 기존 Pod 종료 |
| Horizontal Scale-in | 불필요해진 애플리케이션 인스턴스 제거 |
| Container Restart | 컨테이너 재시작 |
| Infrastructure Maintenance | 서버 또는 노드 유지보수 |
| Manual Shutdown | 운영자가 프로세스를 직접 종료 |
| Process Manager Restart | 프로세스 관리자가 애플리케이션 재시작 |

이러한 상황에서 프로세스가 즉시 종료되면 처리 중인 작업이 완료되지 못할 수 있습니다.

### 2.1. 강제 종료

```text
Client
   |
   | HTTP Request
   v
NestJS Application
   |
   v
Database Transaction
   |
   | Processing...
   |
   X Process Terminated
   |
   v
Request Failed
```

처리 중인 요청이 완료되기 전에 애플리케이션이 종료되면 클라이언트에 정상적인 응답을 반환하지 못할 수 있습니다.

또한 비동기 작업이 완료되기 전에 프로세스가 종료될 수 있습니다.

Database Transaction의 경우 DBMS가 연결 종료를 감지하여 미완료 Transaction을 Rollback할 수 있지만, 이미 외부 시스템에 반영된 작업까지 자동으로 복구되는 것은 아닙니다.

### 2.2. Graceful Shutdown

```text
Shutdown Signal
       |
       v
Stop Accepting New Work
       |
       v
Wait for In-flight Operations
       |
       v
Release External Resources
       |
       v
Close Connections
       |
       v
Process Exit
```

Graceful Shutdown은 신규 작업의 유입을 제한하고, 진행 중인 작업을 완료하거나 안전하게 중단하며, 사용 중인 리소스를 정리하도록 설계합니다.

단, 모든 작업이 완료될 때까지 무제한으로 기다리는 것은 적절하지 않습니다.

운영 환경에서는 종료 제한 시간(Shutdown Timeout)을 설정하고, 그 안에 정리되지 않은 작업을 어떻게 처리할지 결정해야 합니다.

---

## 3. Graceful Shutdown과 강제 종료

Graceful Shutdown과 강제 종료는 프로세스 종료 방식에 차이가 있습니다.

| 구분 | Graceful Shutdown | 강제 종료 |
|---|---|---|
| 종료 방식 | 정리 작업 후 종료 | 즉시 또는 강제 종료 |
| 실행 중인 HTTP 요청 | 완료를 기다릴 수 있음 | 중단될 수 있음 |
| Database Connection | 명시적으로 정리 가능 | 프로세스 종료에 의존 |
| Queue 작업 | 완료 대기 및 소비 중단 가능 | 처리 도중 중단 가능 |
| WebSocket | 종료 절차 수행 가능 | 연결이 갑자기 끊길 수 있음 |
| Lifecycle Hook | 실행 가능 | 실행이 보장되지 않음 |
| 종료 시간 | 정리 작업에 따라 증가 | 일반적으로 짧음 |

Graceful Shutdown은 정리 작업을 수행할 기회를 제공하지만 모든 작업의 정상적인 완료를 보장하지는 않습니다.

예를 들어 Kubernetes에서 설정한 종료 유예 시간을 초과하면 강제 종료가 발생할 수 있습니다.

---

## 4. 운영체제의 종료 신호

Node.js 애플리케이션은 운영체제에서 전달하는 Signal을 통해 종료 요청을 받을 수 있습니다.

대표적인 Signal은 다음과 같습니다.

| Signal | 설명 |
|---|---|
| `SIGTERM` | 프로세스에 정상적인 종료를 요청 |
| `SIGINT` | 터미널에서 Ctrl+C 등을 통해 전달되는 인터럽트 |
| `SIGKILL` | 프로세스를 강제로 종료 |
| `SIGHUP` | 터미널 연결 종료 등과 관련된 신호 |

### 4.1. SIGTERM

`SIGTERM`은 프로세스에 종료를 요청하는 Signal입니다.

Linux 환경에서 다음 명령어로 전달할 수 있습니다.

```bash
kill -TERM <PID>
```

`<PID>`는 실제 프로세스 ID를 의미합니다.

Kubernetes에서 Linux 컨테이너를 종료할 때도 일반적으로 `SIGTERM`이 사용됩니다.

Node.js는 `SIGTERM`에 대한 Signal Handler를 등록할 수 있습니다.

NestJS에서는 `enableShutdownHooks()`를 이용하여 이러한 종료 신호에 대응할 수 있습니다.

### 4.2. SIGINT

`SIGINT`는 일반적으로 터미널에서 Ctrl+C를 입력했을 때 전달됩니다.

```text
Terminal
   |
   | Ctrl+C
   v
SIGINT
   |
   v
Node.js Process
```

개발 환경에서 NestJS 애플리케이션을 종료할 때 자주 발생합니다.

### 4.3. SIGKILL

`SIGKILL`은 프로세스를 강제로 종료하는 Signal입니다.

```bash
kill -KILL <PID>
```

`SIGKILL`은 애플리케이션에서 처리하거나 무시할 수 없습니다.

따라서 `SIGKILL`에 의한 종료에서는 NestJS Lifecycle Hook이 실행되지 않습니다.

운영 환경에서 Graceful Shutdown을 구현하더라도 다음 상황에서는 정리 작업이 수행되지 않을 수 있습니다.

- `SIGKILL`에 의한 강제 종료
- 시스템 전원 장애
- 컨테이너 런타임의 강제 종료
- 프로세스의 비정상적인 종료
- 종료 유예 시간 초과

따라서 중요한 작업은 Graceful Shutdown만으로 안전성을 보장하려 하지 말고 재시도, 멱등성 및 복구 전략을 함께 고려해야 합니다.

---

## 5. NestJS Application Lifecycle

NestJS는 애플리케이션의 초기화와 종료 과정에 대응하기 위한 Lifecycle Hook을 제공합니다.

### 5.1. 주요 Lifecycle Hook

| Lifecycle Hook | 실행 시점 |
|---|---|
| `onModuleInit()` | 해당 모듈의 의존성 초기화 이후 |
| `onApplicationBootstrap()` | 전체 모듈 초기화 완료 이후 |
| `onModuleDestroy()` | 애플리케이션 종료 절차 시작 |
| `beforeApplicationShutdown()` | `onModuleDestroy()` 완료 이후, 기본 서버 연결 종료 이전 |
| `onApplicationShutdown()` | 기본 서버 연결 종료 이후 |

Graceful Shutdown과 직접적으로 관련된 Hook은 다음 세 가지입니다.

- `onModuleDestroy()`
- `beforeApplicationShutdown()`
- `onApplicationShutdown()`

### 5.2. Shutdown Lifecycle 실행 순서

NestJS의 기본적인 종료 순서는 다음과 같습니다.

```text
SIGTERM / SIGINT / app.close()
               |
               v
       onModuleDestroy()
               |
               v
  beforeApplicationShutdown()
               |
               v
   Close Application Servers
               |
               v
   onApplicationShutdown()
               |
               v
      Shutdown Completed
```

각 단계에서 Promise를 반환하는 비동기 Hook이 존재하면 NestJS는 해당 Promise가 완료될 때까지 다음 단계의 진행을 기다립니다.

다만 Promise가 완료되지 않으면 종료 과정이 지연될 수 있습니다.

또한 같은 단계의 Hook은 모듈 의존 관계에 따른 순서와 병렬 실행 특성이 있으므로, 개별 Provider의 정리 순서를 임의로 가정하지 않아야 합니다.

---

## 6. enableShutdownHooks()

NestJS에서 운영체제의 종료 신호에 대응하려면 `enableShutdownHooks()`를 활성화해야 합니다.

### 6.1. 기본 설정

`src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
```

`enableShutdownHooks()`는 NestJS가 종료 신호를 수신하고 Shutdown Lifecycle Hook을 실행하도록 설정합니다.

### 6.2. 동작 과정

```text
Operating System
       |
       | SIGTERM
       v
Node.js Process
       |
       v
NestJS Shutdown Handler
       |
       v
Application Lifecycle Hooks
       |
       v
Resource Cleanup
       |
       v
Application Shutdown
```

### 6.3. 특정 Signal 등록

필요한 Signal만 처리하도록 지정할 수도 있습니다.

```typescript
app.enableShutdownHooks([
  'SIGTERM',
  'SIGINT',
]);
```

이 경우 지정한 Signal에 대해서만 NestJS의 Shutdown Handler를 등록합니다.

일반적으로 운영 환경에서는 `SIGTERM` 처리를 고려해야 합니다.

### 6.4. 기본적으로 활성화되지 않는 이유

`enableShutdownHooks()`는 Node.js Process에 Signal Listener를 등록합니다.

하나의 Node.js Process에서 여러 NestJS 애플리케이션을 생성하면 Listener 수가 증가할 수 있습니다.

특히 테스트 과정에서 다수의 NestJS Application Instance를 생성할 경우 EventEmitter의 Listener 경고가 발생할 수 있습니다.

이러한 이유로 NestJS는 Shutdown Hook을 기본적으로 활성화하지 않습니다.

또한 Windows에서는 운영체제 특성으로 인해 일부 Signal에 대한 지원이 제한될 수 있습니다.

---

## 7. onModuleDestroy()

`onModuleDestroy()`는 애플리케이션의 종료 절차가 시작될 때 실행되는 Lifecycle Hook입니다.

일반적으로 초기 정리 작업을 수행하는 데 사용할 수 있습니다.

### 7.1. 구현 예제

```typescript
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';

@Injectable()
export class WorkerService implements OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);

  onModuleDestroy(): void {
    this.logger.log('WorkerService shutdown started');
  }
}
```

`OnModuleDestroy` Interface를 구현하면 NestJS가 종료 Lifecycle에서 해당 메서드를 호출합니다.

### 7.2. 비동기 정리 작업

```typescript
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';

@Injectable()
export class WorkerService implements OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Stopping worker...');

    await this.stopWorker();

    this.logger.log('Worker stopped');
  }

  private async stopWorker(): Promise<void> {
    // 실제 Worker 종료 로직을 구현합니다.
  }
}
```

Promise를 반환하는 경우 NestJS는 해당 Hook의 비동기 작업이 완료될 때까지 종료 단계의 진행을 기다립니다.

단, 다음 단계로 진행할 때까지 무한정 기다리지 않도록 실제 Worker 종료 구현에는 Timeout을 적용하는 것이 좋습니다.

### 7.3. 적절한 사용 사례

- 신규 Background Job 수신 중단
- Timer 및 Interval 정리
- 내부 Worker 종료 요청
- 새로운 Queue 작업 소비 중단
- 애플리케이션 내부 리소스 정리 시작

외부 리소스를 종료하기 전에 해당 리소스를 사용하는 작업이 남아 있는지 확인해야 합니다.

---

## 8. beforeApplicationShutdown()

`beforeApplicationShutdown()`은 `onModuleDestroy()` 단계가 완료된 후, NestJS의 기본 서버 연결 종료 절차가 시작되기 전에 실행됩니다.

### 8.1. 구현 예제

```typescript
import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
} from '@nestjs/common';

@Injectable()
export class ApplicationShutdownService
  implements BeforeApplicationShutdown
{
  private readonly logger = new Logger(
    ApplicationShutdownService.name,
  );

  async beforeApplicationShutdown(
    signal?: string,
  ): Promise<void> {
    this.logger.log(
      `Before application shutdown: ${signal ?? 'manual'}`,
    );

    await this.waitForTasks();
  }

  private async waitForTasks(): Promise<void> {
    // 진행 중인 작업을 확인하고 종료를 준비합니다.
  }
}
```

`signal` 파라미터에는 `SIGTERM` 또는 `SIGINT` 등의 종료 신호가 전달될 수 있습니다.

`app.close()`를 직접 호출한 경우에는 Signal이 전달되지 않을 수 있습니다.

### 8.2. 적절한 사용 사례

- 종료 과정에서 작업 완료 여부 확인
- Background Task Drain
- 내부 버퍼 Flush
- 서버 연결 종료 전에 필요한 정리 작업

단, `beforeApplicationShutdown()`이 호출되는 시점에는 NestJS의 기본 HTTP Server가 아직 완전히 종료되지 않았을 수 있습니다.

따라서 이 Hook을 구현했다고 해서 새로운 HTTP 요청이 자동으로 차단되는 것은 아닙니다.

신규 요청 차단 및 트래픽 전환은 Load Balancer, Readiness 또는 별도의 애플리케이션 로직으로 처리해야 합니다.

---

## 9. onApplicationShutdown()

`onApplicationShutdown()`은 NestJS의 기본 서버 종료 절차가 수행된 이후 호출됩니다.

이 단계에서는 마지막 리소스 정리 작업을 수행할 수 있습니다.

### 9.1. 구현 예제

```typescript
import {
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';

@Injectable()
export class CleanupService
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(CleanupService.name);

  async onApplicationShutdown(
    signal?: string,
  ): Promise<void> {
    this.logger.log(
      `Application shutdown: ${signal ?? 'manual'}`,
    );

    await this.flushLogs();
  }

  private async flushLogs(): Promise<void> {
    // 비동기 로그 버퍼를 정리하는 작업을 구현합니다.
  }
}
```

### 9.2. 적절한 사용 사례

- 외부 리소스의 최종 정리
- Buffered Logging Flush
- Telemetry 데이터 전송
- 내부 상태 저장
- 종료 완료 로그 기록

실제 리소스 정리 시점은 의존성 관계를 고려해야 합니다.

예를 들어 로그를 전송하기 위해 네트워크 연결이 필요한데 이전 Hook에서 해당 연결을 종료했다면 최종 로그 전송에 실패할 수 있습니다.

따라서 종료 단계별 책임과 의존 관계를 명확하게 구분해야 합니다.

---

## 10. Lifecycle Hook 간의 차이

세 가지 Shutdown Hook의 차이를 정리하면 다음과 같습니다.

| 항목 | onModuleDestroy | beforeApplicationShutdown | onApplicationShutdown |
|---|---|---|---|
| 실행 순서 | 1 | 2 | 3 |
| Signal 파라미터 | 없음 | 있음 | 있음 |
| 비동기 처리 | 가능 | 가능 | 가능 |
| 주요 목적 | 초기 정리 | 서버 종료 전 정리 | 최종 정리 |
| HTTP Server 종료 | 이전 | 이전 | 이후 |

세 Hook을 모두 구현해야 하는 것은 아닙니다.

애플리케이션에서 실제로 필요한 정리 작업에 맞춰 적절한 Hook을 선택하면 됩니다.

또한 Lifecycle Hook은 일반적인 Singleton Provider 등에 적용됩니다.

Request-scoped Provider는 애플리케이션 전체 Lifecycle에 직접 연결되지 않으므로 해당 Shutdown Hook이 호출되지 않습니다.

---

## 11. HTTP Connection Draining

Connection Draining은 애플리케이션이 종료될 때 새로운 요청의 유입을 제한하면서 이미 처리 중인 요청은 가능한 범위에서 완료하도록 하는 방식입니다.

### 11.1. HTTP 요청 처리 중 종료

다음과 같은 상황을 가정합니다.

```text
Client A
   |
   | Request A
   v
NestJS Application
   |
   | Processing
   |
   +---- SIGTERM Received
   |
   | Processing Continues
   v
Response A
   |
   v
Application Shutdown
```

NestJS의 HTTP Adapter는 기본적으로 애플리케이션 종료 시 진행 중인 응답이 완료되기를 기다리는 동작을 지원합니다.

하지만 다음 사항은 구분해야 합니다.

- 새로운 연결 수락 중단
- 기존 HTTP 요청 완료 대기
- Keep-Alive 연결 종료
- Load Balancer의 트래픽 전달 중단
- Long-running Request 처리

특히 신규 연결을 중단하더라도 Load Balancer의 상태 정보가 즉시 갱신되는 것은 아닙니다.

### 11.2. Keep-Alive Connection

HTTP Keep-Alive는 여러 HTTP 요청에 동일한 TCP 연결을 재사용할 수 있도록 하는 기능입니다.

일부 Keep-Alive 연결은 종료 시점에 예상보다 오랫동안 유지될 수 있습니다.

NestJS는 기본적으로 응답이 완료될 때까지 기다리도록 HTTP Adapter를 구성합니다.

### 11.3. forceCloseConnections

필요한 경우 다음 옵션을 사용할 수 있습니다.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    forceCloseConnections: true,
  });

  app.enableShutdownHooks();

  await app.listen(3000);
}

void bootstrap();
```

`forceCloseConnections`는 종료 과정에서 연결을 강제로 정리하도록 하는 옵션입니다.

그러나 진행 중인 요청에 영향을 줄 수 있으므로 무중단 배포를 위한 기본 설정으로 무조건 적용하는 것은 권장하지 않습니다.

일반적인 HTTP API에서는 기본 동작을 우선 사용하고 실제로 연결이 종료되지 않는 문제가 발생할 때 적용 여부를 검토하는 것이 좋습니다.

Fastify Adapter에서의 지원 방식은 NestJS와 Fastify 버전에 따라 차이가 있을 수 있습니다.

---

## 12. Database Connection 정리

애플리케이션 종료 시 Database Connection Pool을 적절하게 종료해야 합니다.

### 12.1. Database Connection Pool

일반적인 Database 연결 구조는 다음과 같습니다.

```text
NestJS Application
        |
        v
Database Connection Pool
        |
        +---- Connection 1
        |
        +---- Connection 2
        |
        +---- Connection 3
        |
        v
     Database
```

애플리케이션에서 Database 연결을 생성한 경우 종료 시점에 연결을 정리할 필요가 있습니다.

### 12.2. TypeORM 정리 예제

다음 예제는 `typeorm` 패키지를 사용하고 `DataSource` Provider가 등록되어 있다고 가정합니다.

```typescript
import {
  Injectable,
  OnApplicationShutdown,
} from '@nestjs/common';

import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseCleanupService
  implements OnApplicationShutdown
{
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}
```

`DataSource.destroy()`는 TypeORM의 Database 연결을 정리하는 데 사용됩니다.

다만 `@nestjs/typeorm` 등에서 이미 Lifecycle Hook을 통해 연결을 관리하는 경우에는 별도의 Cleanup Provider를 등록하지 않아도 됩니다.

중복 종료 로직을 구현하기 전에 사용 중인 ORM 및 NestJS 통합 라이브러리의 Lifecycle 지원 여부를 확인해야 합니다.

### 12.3. Transaction 처리

Database 연결을 종료하기 전에 진행 중인 Transaction이 존재할 수 있습니다.

따라서 다음 순서를 고려해야 합니다.

```text
Stop Accepting New Work
          |
          v
Wait for Active Transactions
          |
          v
Commit or Rollback
          |
          v
Close Connection Pool
```

다만 NestJS가 모든 Transaction의 완료를 자동으로 보장하지는 않습니다.

애플리케이션의 Transaction 처리 방식과 ORM의 종료 정책에 맞게 설계해야 합니다.

---

## 13. Redis Connection 정리

Redis는 Cache, Session Store, Queue Backend 등의 용도로 사용될 수 있습니다.

애플리케이션에서 Redis Client를 직접 생성한 경우 종료 시점에 연결을 정리해야 합니다.

### 13.1. Redis Client 예제

다음은 `ioredis`를 사용하는 예제입니다.

```bash
npm install ioredis
```

```typescript
import {
  Injectable,
  OnApplicationShutdown,
} from '@nestjs/common';

import Redis from 'ioredis';

@Injectable()
export class RedisService
  implements OnApplicationShutdown
{
  private readonly client = new Redis({
    host: 'localhost',
    port: 6379,
  });

  getClient(): Redis {
    return this.client;
  }

  async onApplicationShutdown(): Promise<void> {
    if (
      this.client.status !== 'end' &&
      this.client.status !== 'wait'
    ) {
      await this.client.quit();
    }
  }
}
```

`quit()`은 Redis 연결을 정상적으로 종료하기 위한 메서드입니다.

이미 진행 중인 명령과 종료 처리에 관한 세부 동작은 Redis Client의 상태와 라이브러리 버전에 따라 달라질 수 있습니다.

### 13.2. Redis 종료 시 주의사항

Redis를 사용하는 애플리케이션에서는 다음 사항을 구분해야 합니다.

- Cache Client 연결
- Queue에서 사용하는 Redis 연결
- 다른 모듈이 공유하는 Redis 연결
- 별도의 Background Worker 연결

하나의 Redis Client를 여러 Provider가 공유한다면 각 Provider에서 중복으로 연결을 종료하지 않도록 관리해야 합니다.

또한 Redis 기반 Queue를 사용하는 경우 Queue Worker 종료 후 관련 Redis 연결을 정리하는 순서를 고려해야 합니다.

---

## 14. Queue와 Background Job 정리

Message Queue 또는 Background Worker를 사용하는 애플리케이션은 HTTP 요청과 독립적으로 작업을 처리할 수 있습니다.

따라서 HTTP Server가 종료되더라도 별도의 작업이 남아 있을 수 있습니다.

### 14.1. Queue 작업 처리 중 종료

```text
Message Queue
      |
      v
NestJS Worker
      |
      v
Processing Job
      |
      +---- SIGTERM
      |
      v
Finish or Safely Interrupt Job
      |
      v
Close Worker
```

### 14.2. BullMQ Worker 예제

다음 예제는 `bullmq`의 Worker를 직접 생성하고 해당 Worker를 Provider가 소유한다고 가정합니다.

```bash
npm install bullmq
```

```typescript
import {
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import { Worker } from 'bullmq';

@Injectable()
export class QueueWorkerService
  implements OnModuleDestroy
{
  private readonly worker: Worker;

  constructor() {
    this.worker = new Worker(
      'tasks',
      async (job) => {
        // 실제 Job 처리 로직을 구현합니다.
      },
      {
        connection: {
          host: 'localhost',
          port: 6379,
        },
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
  }
}
```

BullMQ의 `Worker.close()`는 새로운 Job 처리를 중단하고 진행 중인 Job이 완료될 때까지 기다리는 정상 종료 방식으로 사용할 수 있습니다.

하지만 실행 중인 Job이 오랫동안 완료되지 않는 경우 종료 과정도 지연될 수 있습니다.

따라서 다음과 같은 사항을 고려해야 합니다.

- Job Timeout
- 재시도 정책
- 작업 멱등성
- Job 완료 및 실패 상태 관리
- 종료 제한 시간
- Worker 재시작 후 작업 복구

`@nestjs/bullmq`를 사용하는 경우에는 모듈과 Worker Host의 Lifecycle 관리 방식이 다를 수 있으므로 중복 종료 로직을 작성하지 않도록 주의해야 합니다.

### 14.3. 장시간 실행되는 작업

장시간 실행되는 Job은 Graceful Shutdown만으로 완료를 보장하기 어렵습니다.

예를 들어 작업 처리에 5분이 필요하지만 Kubernetes의 종료 유예 시간이 30초라면 작업이 완료되기 전에 컨테이너가 종료될 수 있습니다.

이러한 작업에는 Checkpoint, Retry 또는 작업 재개 메커니즘을 별도로 설계하는 것이 좋습니다.

---

## 15. WebSocket Connection 종료

WebSocket은 HTTP 요청과 달리 장시간 연결을 유지하는 통신 방식입니다.

따라서 WebSocket을 사용하는 NestJS 애플리케이션에서는 별도의 종료 전략이 필요합니다.

### 15.1. WebSocket 종료 과정

```text
WebSocket Clients
        |
        v
NestJS Gateway
        |
        +---- SIGTERM Received
        |
        v
Stop Accepting New Connections
        |
        v
Notify Connected Clients
        |
        v
Close WebSocket Connections
        |
        v
Gateway Shutdown
```

### 15.2. WebSocket Gateway 예제

다음 예제는 Socket.IO 기반 NestJS Gateway를 사용한다고 가정합니다.

```typescript
import {
  BeforeApplicationShutdown,
} from '@nestjs/common';

import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';

@WebSocketGateway()
export class EventsGateway
  implements BeforeApplicationShutdown
{
  @WebSocketServer()
  private server!: Server;

  async beforeApplicationShutdown(): Promise<void> {
    this.server.emit('server:shutdown', {
      reason: 'Server is shutting down',
    });

    await new Promise<void>((resolve, reject) => {
      this.server.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}
```

위 예제는 연결된 클라이언트에 종료 이벤트를 전송한 후 Socket.IO Server를 종료하는 기본 구조입니다.

이벤트를 전송했다는 사실만으로 모든 클라이언트가 해당 이벤트를 수신하거나 처리했다고 보장할 수는 없습니다.

또한 사용하는 WebSocket Adapter에 따라 연결 종료 API가 다를 수 있습니다.

예를 들어 `ws` 기반 Adapter와 Socket.IO 기반 Adapter의 연결 관리 방식은 서로 다릅니다.

### 15.3. WebSocket 종료 시 고려사항

- 새로운 WebSocket 연결 수락 중단
- 현재 연결된 Client 식별
- 종료 이벤트 전달
- Client Reconnection 전략
- Session 및 Subscription 정보 정리
- 진행 중인 메시지 전송 완료 여부
- Gateway Instance 간 상태 관리

특히 다수의 Gateway Instance를 운영하는 경우 클라이언트가 다른 Gateway에 재연결할 수 있도록 설계해야 합니다.

다만 종료 직전의 메시지가 클라이언트에 반드시 전달되어야 한다면 별도의 Acknowledgement 또는 메시지 재전송 메커니즘이 필요합니다.

---

## 16. Kubernetes Pod Termination Lifecycle

Kubernetes는 Pod가 종료될 때 컨테이너가 정상적으로 종료할 수 있도록 Grace Period를 제공합니다.

일반적인 Linux 컨테이너에서는 `SIGTERM`을 전달하고, 정해진 시간 안에 종료되지 않으면 강제 종료를 수행합니다.

### 16.1. Pod 종료 과정

```text
Pod Deletion Requested
          |
          v
Pod Marked Terminating
          |
          +-----------------------+
          |                       |
          v                       v
EndpointSlice Update       Kubelet Shutdown
          |                       |
          v                       v
Traffic Routing Update     preStop Hook
                                  |
                                  v
                                SIGTERM
                                  |
                                  v
                         NestJS Shutdown Hooks
                                  |
                                  v
                         Application Cleanup
                                  |
                                  v
                            Process Exit
```

위 그림은 개념적인 흐름입니다.

실제 Kubernetes에서는 EndpointSlice 갱신과 kubelet의 종료 처리가 병렬적으로 진행될 수 있습니다.

따라서 트래픽 전달 중단이 완료된 후에만 `SIGTERM`이 전달된다고 가정해서는 안 됩니다.

### 16.2. terminationGracePeriodSeconds

Kubernetes는 Pod가 종료되는 데 사용할 수 있는 시간을 설정할 수 있습니다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestjs-api

spec:
  replicas: 3

  selector:
    matchLabels:
      app: nestjs-api

  template:
    metadata:
      labels:
        app: nestjs-api

    spec:
      terminationGracePeriodSeconds: 60

      containers:
        - name: nestjs-api
          image: nestjs-api:1.0.0

          ports:
            - containerPort: 3000
```

`terminationGracePeriodSeconds: 60`은 Pod 종료에 최대 60초의 유예 시간을 부여하는 설정입니다.

Kubernetes의 기본값은 일반적으로 30초입니다.

유예 시간은 `preStop` Hook 실행 시간도 포함합니다.

따라서 `preStop`에 시간을 모두 사용하면 애플리케이션의 Shutdown Hook을 실행할 시간이 부족해질 수 있습니다.

### 16.3. Grace Period 초과

```text
SIGTERM
   |
   v
Graceful Shutdown
   |
   | Time Limit Exceeded
   |
   v
SIGKILL
   |
   v
Process Terminated
```

종료 유예 시간을 초과하면 Kubernetes는 프로세스를 강제로 종료할 수 있습니다.

따라서 Graceful Shutdown 로직은 유한한 시간 안에 완료될 수 있도록 설계해야 합니다.

---

## 17. Kubernetes preStop Hook

`preStop`은 Kubernetes가 컨테이너 종료 전에 실행할 수 있는 Lifecycle Hook입니다.

애플리케이션을 종료하기 전에 추가 작업을 수행할 때 사용할 수 있습니다.

### 17.1. preStop 예제

다음은 5초 동안 종료를 지연하는 예제입니다.

```yaml
lifecycle:
  preStop:
    exec:
      command:
        - /bin/sh
        - -c
        - sleep 5
```

이 예제에서는 `sleep` 명령을 지원하는 Shell이 이미지에 포함되어 있어야 합니다.

모든 컨테이너 이미지에 `/bin/sh`나 `sleep`이 존재하는 것은 아닙니다.

### 17.2. preStop과 SIGTERM

일반적인 종료 과정에서는 다음 순서가 적용됩니다.

```text
Pod Termination
       |
       v
preStop Hook
       |
       v
SIGTERM
       |
       v
NestJS Shutdown
```

`preStop`이 정상적으로 완료되면 kubelet은 컨테이너의 메인 프로세스에 종료 신호를 전달합니다.

단, Grace Period의 카운트다운은 `preStop` 실행 전부터 시작됩니다.

### 17.3. preStop을 사용하는 이유

일부 환경에서는 Pod의 종료 상태가 반영되기 전에 기존 Load Balancer나 Proxy가 요청을 전달할 수 있습니다.

이러한 환경에서 짧은 지연 시간을 두면 트래픽 전달 경로가 변경될 시간을 확보할 수 있습니다.

그러나 고정된 `sleep`만으로 무중단 종료가 보장되는 것은 아닙니다.

또한 불필요한 종료 지연은 배포 시간과 리소스 사용량을 증가시킬 수 있습니다.

Kubernetes의 EndpointSlice 및 Load Balancer 동작을 확인한 후 필요한 경우에만 사용해야 합니다.

---

## 18. Readiness Probe와 Graceful Shutdown

Readiness Probe는 애플리케이션이 요청을 받을 준비가 되었는지 확인하는 기능입니다.

Graceful Shutdown과 Readiness를 연계하면 종료 중인 인스턴스로 새로운 요청이 전달되는 것을 줄일 수 있습니다.

### 18.1. 기본 동작

```text
Application Running
        |
        v
Readiness = Ready
        |
        v
SIGTERM Received
        |
        v
Shutdown Started
        |
        v
Readiness = Not Ready
        |
        v
Traffic Draining
        |
        v
Application Shutdown
```

이 흐름은 애플리케이션의 상태 관리와 인프라의 트래픽 제어가 연계된 논리적인 종료 전략입니다.

실제 Kubernetes에서는 Pod가 Terminating 상태로 변경되면 EndpointSlice의 종료 상태도 갱신되므로, 별도의 Readiness 변경 구현이 항상 필요한 것은 아닙니다.

### 18.2. NestJS Terminus 연계

NestJS Terminus는 Graceful Shutdown과 연계할 수 있는 기능을 제공합니다.

다음 패키지를 사용합니다.

```bash
npm install @nestjs/terminus
```

`health/health.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule.forRoot({
      gracefulShutdownTimeoutMs: 5000,
    }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
```

이 예제는 Terminus의 `gracefulShutdownTimeoutMs` 옵션을 지원하는 버전을 전제로 합니다.

`gracefulShutdownTimeoutMs`는 종료 단계에서 일정 시간 동안 Shutdown을 지연할 수 있도록 설정합니다.

이 기능은 특히 Kubernetes와 같이 `SIGTERM`을 사용하는 환경에서 유용합니다.

### 18.3. 종료 중 Health Check

Terminus가 종료를 감지하면 Health Check 응답을 다음과 같은 상태로 전환할 수 있습니다.

```json
{
  "status": "shutting_down"
}
```

이때 HTTP 응답은 `503 Service Unavailable`이 될 수 있습니다.

Kubernetes의 Readiness Probe는 해당 응답을 실패로 판단할 수 있습니다.

단, Terminus의 Shutdown 지연 기능은 `SIGTERM`에 대해 적용됩니다.

`SIGINT` 등의 다른 Signal에서는 Health Check 상태가 변경되더라도 동일한 지연 시간이 적용되지 않을 수 있습니다.

또한 이 설정만으로 클라이언트 요청이나 WebSocket 메시지의 완료가 보장되는 것은 아닙니다.

---

## 19. Docker 환경에서의 Graceful Shutdown

Docker 컨테이너에서도 종료 신호가 애플리케이션 프로세스에 올바르게 전달되어야 합니다.

### 19.1. Docker 종료 신호

일반적으로 다음 명령어로 컨테이너를 종료할 수 있습니다.

```bash
docker stop nestjs-api
```

Docker는 컨테이너의 메인 프로세스에 종료 신호를 전달하고 정해진 시간 동안 종료를 기다립니다.

그 안에 프로세스가 종료되지 않으면 강제 종료할 수 있습니다.

### 19.2. Exec Form 사용

Dockerfile에서 다음과 같은 실행 방식을 권장합니다.

```dockerfile
CMD ["node", "dist/main.js"]
```

이 방식은 JSON 배열 형태의 Exec Form입니다.

Node.js를 컨테이너의 메인 프로세스로 실행할 수 있으므로 종료 신호를 직접 전달받는 구성을 만들기 쉽습니다.

반면 다음과 같은 Shell Form은 주의가 필요합니다.

```dockerfile
CMD node dist/main.js
```

Shell Form은 Shell을 통해 명령을 실행할 수 있으며, 이때 종료 신호가 Node.js 프로세스까지 올바르게 전달되지 않을 수 있습니다.

### 19.3. PID 1

컨테이너의 메인 프로세스는 일반적으로 PID 1로 실행됩니다.

PID 1은 운영체제 Signal 처리와 하위 프로세스 관리 측면에서 특별한 역할을 가집니다.

Node.js 애플리케이션을 컨테이너에서 실행할 때는 다음 사항을 고려할 수 있습니다.

- Exec Form 사용
- Signal Handler 등록
- 자식 프로세스 정리
- 필요한 경우 Init Process 사용

Docker에서는 `--init` 옵션을 통해 작은 Init Process를 사용할 수도 있습니다.

```bash
docker run --init nestjs-api:latest
```

별도의 Init Process가 필요한지는 애플리케이션의 자식 프로세스 생성 및 관리 방식에 따라 결정할 수 있습니다.

---

## 20. Graceful Shutdown Timeout 설계

Graceful Shutdown은 반드시 유한한 종료 시간을 고려해야 합니다.

### 20.1. 종료 시간 구성

예를 들어 다음과 같은 종료 전략을 구성할 수 있습니다.

| 단계 | 예시 시간 |
|---|---:|
| 트래픽 전달 변경 대기 | 5초 |
| 진행 중인 요청 처리 | 15초 |
| Background Job 정리 | 20초 |
| 외부 리소스 종료 | 5초 |
| 여유 시간 | 5초 |
| 합계 | 50초 |

위 값은 설계 방법을 설명하기 위한 예시입니다.

실제 운영 환경에서는 요청 처리 시간, 작업 특성, 인프라 동작 및 Timeout 정책을 측정하여 결정해야 합니다.

모든 종료 작업이 반드시 순차적으로 실행되는 것은 아닙니다.

독립적인 정리 작업은 병렬로 수행할 수도 있습니다.

### 20.2. Timeout 적용 예제

다음은 비동기 작업에 Timeout을 적용하는 예제입니다.

```typescript
async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Shutdown operation timed out'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      operation,
      timeout,
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
```

사용 예제:

```typescript
await withTimeout(
  this.stopWorker(),
  10000,
);
```

이 코드는 10초 이내에 작업이 완료되지 않으면 Timeout 오류를 발생시킵니다.

단, `Promise.race()`는 실행 중인 비동기 작업을 실제로 취소하지 않습니다.

따라서 종료 작업 자체가 취소를 지원한다면 `AbortSignal` 또는 해당 라이브러리의 Cancellation API를 활용해야 합니다.

또한 Timeout 오류를 처리하지 않은 상태로 방치하면 Shutdown Lifecycle이 예기치 않게 중단될 수 있습니다.

실제 운영 코드에서는 Timeout 이후의 오류 처리와 최종 정리 정책을 함께 구현해야 합니다.

---

## 21. Graceful Shutdown의 실패 시나리오

Graceful Shutdown을 구현하더라도 여러 실패 상황이 발생할 수 있습니다.

### 21.1. 종료 작업이 완료되지 않는 경우

```text
SIGTERM
   |
   v
onModuleDestroy()
   |
   v
Await Long-running Task
   |
   | Timeout
   v
SIGKILL
```

이 경우 Kubernetes의 Grace Period가 만료되면서 컨테이너가 강제로 종료될 수 있습니다.

이를 방지하려면 장시간 실행되는 작업에 취소 또는 복구 전략을 적용해야 합니다.

### 21.2. 종료 순서가 잘못된 경우

예를 들어 Database Connection을 먼저 종료한 후 진행 중인 작업의 Transaction 완료를 기다리면 오류가 발생할 수 있습니다.

```text
Close Database
      |
      v
Wait for Transaction
      |
      v
Transaction Failed
```

적절한 순서는 다음과 같습니다.

```text
Stop New Work
      |
      v
Wait for Active Work
      |
      v
Close Database
```

### 21.3. 여러 종료 처리기가 충돌하는 경우

NestJS의 `enableShutdownHooks()`와 별도의 `process.on('SIGTERM')` Handler를 함께 사용하는 경우 종료 로직이 중복 실행될 수 있습니다.

특히 개별 Handler에서 `process.exit()`를 직접 호출하면 NestJS의 Lifecycle Hook이 완료되기 전에 프로세스가 종료될 수 있습니다.

따라서 가능한 경우 NestJS의 Lifecycle Hook을 중심으로 종료 로직을 관리하는 것이 좋습니다.

### 21.4. 종료 중 신규 요청이 유입되는 경우

Kubernetes Pod가 Terminating 상태로 변경되더라도 기존 Proxy 또는 Load Balancer가 짧은 시간 동안 요청을 전달할 수 있습니다.

이 경우 다음 요소를 함께 고려해야 합니다.

- EndpointSlice의 종료 상태 반영
- Load Balancer의 Connection Draining
- Readiness 상태
- HTTP Server의 신규 연결 수락 여부
- 기존 요청 완료 시간

단일 설정만으로 모든 네트워크 경로의 트래픽 전환을 보장할 수는 없습니다.

---

## 22. Graceful Shutdown 테스트

Graceful Shutdown은 코드 구현뿐만 아니라 실제 종료 신호를 전달하여 검증해야 합니다.

### 22.1. 로컬 환경 테스트

NestJS 애플리케이션을 실행합니다.

```bash
npm run start:dev
```

다른 터미널에서 프로세스 ID를 확인합니다.

```bash
ps aux | grep node
```

해당 프로세스에 `SIGTERM`을 전달합니다.

```bash
kill -TERM <PID>
```

예상되는 동작은 다음과 같습니다.

```text
SIGTERM Received
onModuleDestroy()
beforeApplicationShutdown()
Application Server Closed
onApplicationShutdown()
Process Exited
```

개발용 Watch Mode에서는 CLI 또는 Watcher가 별도의 프로세스를 생성할 수 있습니다.

따라서 종료 테스트는 가능하면 실제 빌드 산출물을 실행하여 수행하는 것이 좋습니다.

```bash
npm run build
node dist/main.js
```

### 22.2. Docker 종료 테스트

컨테이너를 실행합니다.

```bash
docker run \
  --name nestjs-api \
  -p 3000:3000 \
  nestjs-api:latest
```

다른 터미널에서 컨테이너 종료를 요청합니다.

```bash
docker stop -t 30 nestjs-api
```

이 명령어는 30초의 종료 대기 시간을 지정합니다.

다음 사항을 확인해야 합니다.

- 종료 Signal 수신 여부
- Lifecycle Hook 실행 여부
- 진행 중인 요청 처리 여부
- Database 및 Redis 연결 정리 여부
- 최종 종료 시간

### 22.3. Kubernetes 종료 테스트

테스트 환경에서 Pod 종료를 요청할 수 있습니다.

```bash
kubectl delete pod <POD_NAME>
```

다음 명령어로 Deployment와 Pod 상태를 확인할 수 있습니다.

```bash
kubectl get pods -w
```

컨테이너 로그를 확인합니다.

```bash
kubectl logs <POD_NAME>
```

실제 운영 환경에서 강제로 Pod를 삭제하기 전에 Replica 수, PodDisruptionBudget, Readiness 및 Rolling Update 정책을 확인해야 합니다.

### 22.4. E2E 테스트에서 app.close()

NestJS Testing 환경에서는 `app.close()`를 이용하여 Shutdown Lifecycle을 실행할 수 있습니다.

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import { AppModule } from '../src/app.module';

describe('Graceful Shutdown', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should close the application', async () => {
    await expect(app.close()).resolves.toBeUndefined();
  });
});
```

이 예제는 `app.close()` 호출이 오류 없이 완료되는지 확인합니다.

실제 Shutdown Hook의 동작을 검증하려면 Mock Provider 또는 Spy를 이용하여 Hook 호출 여부와 리소스 정리 결과를 확인해야 합니다.

또한 위 예제의 `app.close()`는 테스트 본문과 `afterEach()`에서 중복 호출되므로, 실제 테스트에서는 한 번만 호출하도록 구성하는 것이 적절합니다.

---

## 23. 운영 환경 권장 사항

Graceful Shutdown을 구성할 때는 다음 항목을 확인하는 것이 좋습니다.

| 항목 | 권장 사항 |
|---|---|
| Shutdown Hook | `enableShutdownHooks()` 활성화 |
| 종료 Signal | `SIGTERM` 처리 |
| HTTP 요청 | In-flight Request 완료 고려 |
| Keep-Alive | 기본 종료 동작 우선 사용 |
| Database | 진행 중인 작업 이후 연결 정리 |
| Redis | 공유 연결 및 종료 순서 관리 |
| Queue | 새로운 작업 수신 중단 및 실행 중인 작업 처리 |
| WebSocket | 종료 알림, 연결 정리 및 재연결 전략 |
| Kubernetes | `terminationGracePeriodSeconds` 설정 |
| preStop | 필요성이 확인된 경우에만 사용 |
| Readiness | 트래픽 전달 중단과 연계 |
| Timeout | 유한한 종료 시간 보장 |
| Docker | Exec Form을 통한 실행 |
| Logging | 종료 과정 및 실패 원인 기록 |
| Testing | 실제 종료 Signal 기반 검증 |

### 23.1. Shutdown Hook의 멱등성

Shutdown Hook은 가능하면 여러 번 호출되더라도 안전하게 동작하도록 작성하는 것이 좋습니다.

예를 들어 이미 종료된 Database Connection을 다시 종료하지 않도록 상태를 검사할 수 있습니다.

다만 실제로 동일 Hook이 여러 번 호출되는지 여부와 관계없이, 중복 정리로 인한 오류를 방지하는 방어적인 설계가 도움이 됩니다.

### 23.2. 정리 작업의 의존 관계

정리 작업 사이에 의존성이 존재한다면 종료 순서를 명확하게 정의해야 합니다.

예를 들어 Queue Worker가 Database를 사용하는 경우 다음 순서가 적합할 수 있습니다.

```text
Stop Queue Consumption
         |
         v
Finish Active Jobs
         |
         v
Close Queue Worker
         |
         v
Close Database Connection
```

NestJS의 Lifecycle Hook 호출 순서만으로 모든 비즈니스 리소스의 종료 순서가 보장된다고 가정해서는 안 됩니다.

필요한 경우 하나의 Shutdown Coordinator에서 명시적으로 순서를 제어할 수 있습니다.

### 23.3. Shutdown Logging

Shutdown 과정에서는 다음과 같은 정보를 기록할 수 있습니다.

- 종료 Signal
- 종료 시작 시각
- 진행 중인 요청 수
- 실행 중인 Job 수
- 각 리소스 정리 결과
- 종료 소요 시간
- Timeout 및 예외 발생 여부

이러한 정보는 Rolling Update나 Scale-in 중 발생하는 장애를 분석하는 데 도움이 됩니다.

단, 인증 정보나 민감한 데이터가 로그에 포함되지 않도록 관리해야 합니다.

---

## 24. 관련 문서

Graceful Shutdown과 관련된 상세 주제는 다음 문서에서 다룹니다.

| 문서 | 설명 |
|---|---|
| `production-build.md` | 운영 환경 실행 및 컨테이너 이미지 구성 |
| `environment-configuration.md` | Shutdown Timeout 및 운영 환경 설정 관리 |
| `health-checks.md` | Liveness, Readiness 및 Startup Probe |
| `performance.md` | 동시 요청, 리소스 사용량 및 운영 성능 관리 |
| `../03-techniques/database.md` | Database Connection과 Transaction 관리 |
| `../03-techniques/queues.md` | Queue Worker 및 Job Lifecycle |
| `../05-platforms/websocket.md` | WebSocket Connection과 Gateway 관리 |
| `../05-platforms/microservices.md` | Microservice Transport 및 Lifecycle 관리 |

---

## 25. 정리

Graceful Shutdown은 NestJS 애플리케이션이 종료 신호를 받았을 때 진행 중인 작업을 정리하고 외부 리소스를 해제한 후 종료하는 메커니즘입니다.

주요 사항은 다음과 같습니다.

1. **Shutdown Signal**: 운영체제에서 전달하는 `SIGTERM`, `SIGINT` 등의 종료 신호를 이해해야 합니다.
2. **enableShutdownHooks()**: NestJS에서 Signal 기반 종료 Lifecycle을 활성화합니다.
3. **onModuleDestroy()**: 종료 절차가 시작될 때 초기 정리 작업을 수행합니다.
4. **beforeApplicationShutdown()**: 기본 서버 연결 종료 이전에 필요한 작업을 수행합니다.
5. **onApplicationShutdown()**: 기본 서버 종료 이후 최종 리소스 정리 작업을 수행합니다.
6. **HTTP Connection Draining**: 새로운 요청의 유입을 제한하면서 기존 요청의 완료를 고려해야 합니다.
7. **External Resource Cleanup**: Database, Redis, Queue 및 WebSocket 등의 리소스를 적절한 순서로 정리해야 합니다.
8. **Kubernetes Pod Termination**: Pod 종료 과정과 Grace Period를 이해해야 합니다.
9. **Readiness 연계**: 종료 중인 인스턴스로 새로운 트래픽이 전달되는 것을 줄일 수 있습니다.
10. **Timeout 및 복구 전략**: 종료 제한 시간 내에 작업이 완료되지 않는 상황에 대비해야 합니다.

Graceful Shutdown은 단순히 애플리케이션 종료 시 특정 메서드를 실행하는 기능이 아닙니다.

운영 환경의 Load Balancer, Container Runtime, Kubernetes, 외부 의존성 및 비동기 작업의 생명주기를 함께 고려해야 하는 운영 설계의 일부입니다.

특히 HTTP 요청과 비동기 작업을 동시에 처리하는 애플리케이션에서는 신규 작업 차단, 진행 중인 작업 완료, 외부 리소스 정리, 최종 프로세스 종료의 책임을 명확하게 구분하는 것이 중요합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
  - Application Lifecycle, Shutdown Hook 및 `enableShutdownHooks()` 사용 방법을 설명합니다.

- [NestJS - Keep-Alive Connections](https://docs.nestjs.com/faq/keep-alive-connections)
  - HTTP Keep-Alive Connection 및 `forceCloseConnections` 옵션을 설명합니다.

- [NestJS - Health Checks (Terminus)](https://docs.nestjs.com/recipes/terminus)
  - Health Check 및 Graceful Shutdown Timeout 설정을 설명합니다.

- [NestJS - Deployment](https://docs.nestjs.com/deployment)
  - 운영 환경에서 NestJS 애플리케이션을 실행하는 방법을 설명합니다.

- [NestJS - Microservices](https://docs.nestjs.com/microservices/basics)
  - NestJS Microservice의 실행 및 Transport 설정을 설명합니다.

- [NestJS - WebSocket Gateways](https://docs.nestjs.com/websockets/gateways)
  - WebSocket Gateway의 구조와 생명주기를 설명합니다.

### Node.js 공식 문서

- [Node.js - Process](https://nodejs.org/api/process.html)
  - Process Signal 및 종료 관련 API를 설명합니다.

- [Node.js - HTTP](https://nodejs.org/api/http.html)
  - HTTP Server의 연결 및 종료 처리 방법을 설명합니다.

- [Node.js - Events](https://nodejs.org/api/events.html)
  - EventEmitter와 Listener의 동작 방식을 설명합니다.

### Kubernetes 공식 문서

- [Kubernetes - Termination of Pods](https://kubernetes.io/docs/concepts/workloads/pods/pod-termination/)
  - Pod 종료 절차, Grace Period, SIGTERM 및 SIGKILL 동작을 설명합니다.

- [Kubernetes - Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
  - Pod의 생성, 실행, 종료 및 상태 전환 과정을 설명합니다.

- [Kubernetes - Container Lifecycle Hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
  - `PostStart`와 `PreStop` Hook의 동작을 설명합니다.

- [Kubernetes - Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
  - 각 Probe의 목적과 운영 시 동작을 설명합니다.

- [Kubernetes - EndpointSlice](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
  - Service Endpoint 및 종료 중인 Endpoint의 상태를 설명합니다.

- [Kubernetes - Explore Termination Behavior for Pods And Their Endpoints](https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/)
  - Pod 종료와 Endpoint 변경의 관계를 실습 형태로 설명합니다.

### Docker 및 외부 라이브러리

- [Docker - Dockerfile Reference](https://docs.docker.com/reference/dockerfile/)
  - Dockerfile의 `CMD`, `ENTRYPOINT` 및 실행 방식을 설명합니다.

- [Docker - docker container stop](https://docs.docker.com/reference/cli/docker/container/stop/)
  - Docker 컨테이너 종료와 Timeout 설정을 설명합니다.

- [TypeORM - DataSource](https://typeorm.io/docs/data-source/data-source/)
  - Database DataSource 초기화 및 종료 방법을 설명합니다.

- [ioredis - GitHub](https://github.com/redis/ioredis)
  - Redis Client 연결 및 종료 API를 확인할 수 있습니다.

- [BullMQ - Graceful Shutdown](https://docs.bullmq.io/guide/workers/graceful-shutdown)
  - Worker가 실행 중인 Job을 처리하면서 정상 종료하는 방법을 설명합니다.