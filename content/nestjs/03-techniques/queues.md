# Queues

## 1. 개요

Queue는 애플리케이션에서 처리해야 하는 작업을 대기열에 저장하고, 별도의 실행 주체가 비동기적으로 처리하도록 구성하는 기술입니다.

일반적인 HTTP 요청에서는 Controller가 Service를 호출하고 작업이 완료된 후 결과를 반환합니다.

하지만 이메일 발송, 이미지 변환, 외부 API 연동, 대규모 데이터 처리와 같이 실행 시간이 길거나 즉시 처리할 필요가 없는 작업을 HTTP 요청 안에서 모두 수행하면 응답 시간이 증가할 수 있습니다.

Queue를 사용하면 작업 요청과 실제 작업 실행을 분리할 수 있습니다.

NestJS는 Queue 통합을 위한 다음 패키지를 제공합니다.

- `@nestjs/bullmq`: BullMQ 기반 Queue 통합
- `@nestjs/bull`: Bull 기반 Queue 통합

Bull은 유지보수 모드이며, BullMQ는 지속적으로 개발되는 TypeScript 기반 작업 Queue 라이브러리입니다.

이 문서에서는 **BullMQ를 기준으로 NestJS의 Queue 기능을 설명합니다.**

주요 기능은 다음과 같습니다.

- 비동기 작업 등록 및 처리
- Producer와 Consumer의 책임 분리
- Redis 기반 작업 데이터 저장
- Worker를 이용한 작업 처리
- Job 상태 및 실행 이력 관리
- 실패한 작업의 재시도
- Backoff 기반 재시도 간격 조절
- Delayed Job 및 반복 작업
- Worker Concurrency 및 Rate Limiting
- Job 중복 등록 방지
- Queue 이벤트 수신
- 여러 Worker 인스턴스를 이용한 수평 확장

Queue는 작업 실행의 비동기화뿐 아니라 처리량 제어, 장애 복구 및 시스템 확장성을 위한 구성 요소입니다.

## 2. Queue가 필요한 이유

### 2.1. HTTP 요청 처리 시간 단축

Queue를 사용하지 않는 경우, 요청을 처리하는 동안 모든 작업이 순차적으로 실행될 수 있습니다.

```text
Client
   |
   v
Controller
   |
   v
Service
   |
   +-- Save Database
   |
   +-- Send Email
   |
   +-- Generate Report
   |
   v
HTTP Response
```

이 구조에서는 이메일 발송이나 보고서 생성이 완료될 때까지 응답이 지연될 수 있습니다.

Queue를 적용하면 다음과 같이 분리할 수 있습니다.

```text
Client
   |
   v
Controller
   |
   v
Service
   |
   +-- Save Database
   |
   +-- Queue.add()
   |
   v
HTTP Response
           |
           v
         Queue
           |
           v
         Worker
           |
           +-- Send Email
           |
           +-- Generate Report
```

요청 처리 과정에서는 작업을 Queue에 등록한 후 응답할 수 있습니다.

실제 작업은 Worker에서 별도로 실행합니다.

다만 Queue 등록이 성공했다고 해서 비즈니스 작업 자체가 완료된 것은 아닙니다.

### 2.2. 작업 처리량 제어

짧은 시간에 많은 요청이 발생하면 작업을 즉시 실행하는 방식은 데이터베이스나 외부 API에 과도한 부하를 발생시킬 수 있습니다.

Queue는 작업을 대기열에 저장하고 Worker가 처리 가능한 속도로 가져가도록 구성할 수 있습니다.

```text
1,000 Incoming Jobs
         |
         v
       Queue
         |
         +-- Worker 1
         |
         +-- Worker 2
         |
         +-- Worker 3
```

Worker 수와 동시 처리량을 조절하여 시스템 부하를 관리할 수 있습니다.

### 2.3. 장애 복구

Worker가 일시적으로 중단되더라도 Queue에 저장된 작업 정보를 활용하여 처리를 재개할 수 있습니다.

또한 작업에 실패하면 재시도 정책에 따라 다시 실행하도록 설정할 수 있습니다.

다만 작업 데이터의 보존은 Redis 등의 저장소 설정과 장애 복구 정책에 영향을 받습니다.

Queue를 사용한다는 이유만으로 모든 작업의 영구 보존이나 정확히 한 번 실행이 자동으로 보장되지는 않습니다.

## 3. Queue의 주요 구성 요소

| 구성 요소 | 역할 |
|---|---|
| Queue | 작업을 등록하고 상태를 관리하는 인터페이스 |
| Producer | Queue에 새로운 Job을 등록하는 주체 |
| Job | 실행해야 하는 작업과 관련 데이터 |
| Worker | Queue에서 Job을 가져와 처리하는 실행 주체 |
| Processor | Job의 실제 처리 로직 |
| QueueEvents | Queue의 작업 상태 변경 이벤트 수신 |
| FlowProducer | 부모-자식 관계를 가진 작업 흐름 생성 |
| Job Scheduler | 정해진 주기에 따라 Job 생성 |
| Redis | 기본적인 BullMQ 작업 상태 저장소 |

### 3.1. 기본 아키텍처

```text
       NestJS API
           |
           v
        Producer
           |
           | Queue.add()
           v
        BullMQ Queue
           |
           v
          Redis
           |
     +-----+-----+
     |           |
     v           v
  Worker 1    Worker 2
     |           |
     v           v
  Service     Service
     |           |
     +-----+-----+
           |
           v
        Database
```

Producer와 Worker는 같은 NestJS 애플리케이션에 존재할 수도 있고 서로 다른 프로세스에서 실행될 수도 있습니다.

또한 여러 Worker가 동일한 Queue의 작업을 경쟁적으로 가져와 처리할 수 있습니다.

### 3.2. Producer와 Worker 비교

| 항목 | Producer | Worker |
|---|---|---|
| 주요 역할 | 작업 등록 | 작업 실행 |
| 대표 API | `Queue.add()` | `WorkerHost.process()` |
| 실행 시점 | 요청 또는 이벤트 발생 시 | 처리 가능한 Job이 있을 때 |
| 주요 책임 | 작업 데이터 및 옵션 구성 | 비즈니스 작업 수행 |
| 수평 확장 | 여러 Producer 사용 가능 | 여러 Worker 사용 가능 |

## 4. BullMQ와 Bull

NestJS는 BullMQ와 Bull을 모두 지원하지만 API가 다릅니다.

| 항목 | BullMQ | Bull |
|---|---|---|
| NestJS 패키지 | `@nestjs/bullmq` | `@nestjs/bull` |
| 기반 라이브러리 | `bullmq` | `bull` |
| 개발 상태 | 적극 개발 | 유지보수 중심 |
| Processor | `WorkerHost` | `@Process()` |
| Worker 이벤트 | `@OnWorkerEvent()` | `@OnQueue...()` 계열 |
| 반복 작업 | Job Scheduler | Repeat Options |
| 권장 신규 구현 | 일반적으로 우선 고려 | 기존 시스템 유지 시 고려 |

특히 다음 두 코드는 서로 다른 통합 방식입니다.

Bull 방식:

```typescript
import {
  Process,
  Processor,
} from '@nestjs/bull';
```

BullMQ 방식:

```typescript
import {
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
```

**BullMQ에서는 일반적으로 `@Process()`를 사용하지 않고 `WorkerHost`의 `process()` 메서드에서 Job을 처리합니다.**

기존 Bull 예제를 BullMQ 프로젝트에 그대로 적용하지 않도록 주의해야 합니다.

## 5. 환경 구성

### 5.1. 패키지 설치

BullMQ 기반 Queue를 사용하려면 다음 패키지를 설치합니다.

```bash
npm install @nestjs/bullmq bullmq ioredis
```

각 패키지의 역할은 다음과 같습니다.

| 패키지 | 역할 |
|---|---|
| `@nestjs/bullmq` | NestJS와 BullMQ 통합 |
| `bullmq` | Queue 및 Worker 기능 |
| `ioredis` | Redis 연결 클라이언트 |

다음 예제에서는 Redis를 작업 저장소로 사용합니다.

### 5.2. Redis 실행

Docker를 사용한다면 다음과 같이 Redis를 실행할 수 있습니다.

```bash
docker run -d \
  --name nestjs-redis \
  -p 6379:6379 \
  redis:7
```

이 구성은 로컬 학습용 예제입니다.

운영 환경에서는 인증, 네트워크 접근 제한, 데이터 영속성 및 메모리 정책을 별도로 구성해야 합니다.

### 5.3. 프로젝트 구조

```text
src/
├── jobs/
│   ├── dto/
│   │   └── create-email-job.dto.ts
│   ├── constants/
│   │   └── queue.constants.ts
│   ├── email.processor.ts
│   ├── email.producer.ts
│   ├── email.service.ts
│   ├── jobs.controller.ts
│   └── jobs.module.ts
│
├── app.module.ts
└── main.ts
```

이 예제에서는 이메일 발송 작업을 Queue로 처리합니다.

## 6. BullModule

`BullModule`은 NestJS에 BullMQ 설정과 Queue Provider를 등록하는 모듈입니다.

### 6.1. forRoot()

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    JobsModule,
  ],
})
export class AppModule {}
```

`BullModule.forRoot()`는 공통 BullMQ 연결 설정을 등록합니다.

### 6.2. registerQueue()

Queue를 사용하려면 이름을 지정하여 등록합니다.

`jobs/constants/queue.constants.ts`

```typescript
export const EMAIL_QUEUE = 'emails';

export const EMAIL_JOB = {
  SEND_WELCOME: 'send-welcome',
} as const;
```

`jobs/jobs.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { EMAIL_QUEUE } from './constants/queue.constants';
import { EmailProducer } from './email.producer';
import { EmailProcessor } from './email.processor';
import { EmailService } from './email.service';
import { JobsController } from './jobs.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
  ],
  controllers: [JobsController],
  providers: [
    EmailProducer,
    EmailProcessor,
    EmailService,
  ],
})
export class JobsModule {}
```

`registerQueue()`는 지정한 Queue를 NestJS에서 사용할 수 있도록 등록합니다.

### 6.3. 주요 설정 옵션

| 옵션 | 설명 |
|---|---|
| `connection` | Redis 등 저장소 연결 설정 |
| `prefix` | Queue 데이터의 키 접두사 |
| `defaultJobOptions` | Job의 기본 설정 |
| `settings` | 반복 작업 관련 고급 설정 |
| `extraOptions` | NestJS 통합 초기화 옵션 |
| `backendFactory` | 지원되는 외부 저장소 Backend Factory |

설정 지원 범위는 BullMQ 및 `@nestjs/bullmq` 버전에 따라 달라질 수 있습니다.

## 7. Producer

Producer는 Queue에 작업을 등록하는 역할을 담당합니다.

### 7.1. @InjectQueue()

NestJS에서는 `@InjectQueue()`를 통해 Queue 객체를 주입받을 수 있습니다.

`jobs/email.producer.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import {
  EMAIL_QUEUE,
  EMAIL_JOB,
} from './constants/queue.constants';

export interface SendWelcomeEmailData {
  userId: number;
  email: string;
}

@Injectable()
export class EmailProducer {
  constructor(
    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue: Queue,
  ) {}

  async sendWelcomeEmail(
    data: SendWelcomeEmailData,
  ): Promise<string> {
    const job = await this.emailQueue.add(
      EMAIL_JOB.SEND_WELCOME,
      data,
    );

    return String(job.id);
  }
}
```

`@InjectQueue(EMAIL_QUEUE)`는 해당 이름으로 등록된 Queue Provider를 주입합니다.

### 7.2. Queue.add()

`Queue.add()`는 Job을 생성하여 Queue에 등록합니다.

```typescript
await this.emailQueue.add(
  'send-welcome',
  {
    userId: 100,
    email: 'user@example.com',
  },
);
```

첫 번째 인자는 Job 이름입니다.

두 번째 인자는 Worker에 전달할 데이터입니다.

반환값은 생성된 Job 객체입니다.

Job 데이터는 저장소에 직렬화할 수 있어야 합니다.

따라서 함수, 데이터베이스 연결 객체, 클래스 인스턴스의 메서드 등은 Job Payload로 전달하지 않는 것이 좋습니다.

### 7.3. HTTP Controller 연동

`jobs/jobs.controller.ts`

```typescript
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import {
  EmailProducer,
} from './email.producer';

import type {
  SendWelcomeEmailData,
} from './email.producer';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly emailProducer: EmailProducer,
  ) {}

  @Post('welcome-email')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueue(
    @Body() body: SendWelcomeEmailData,
  ) {
    const jobId =
      await this.emailProducer.sendWelcomeEmail(body);

    return {
      jobId,
      status: 'queued',
    };
  }
}
```

응답 예시:

```json
{
  "jobId": "1",
  "status": "queued"
}
```

HTTP 202 Accepted는 요청이 접수되었지만 실제 작업의 완료까지 보장하지 않는다는 의미로 사용할 수 있습니다.

위 예제의 TypeScript Interface는 런타임 검증을 수행하지 않습니다.

실무에서는 DTO 클래스와 `ValidationPipe`를 적용하고 이메일 발송 권한도 별도로 검증해야 합니다.

## 8. Worker와 Processor

Worker는 Queue에서 Job을 가져와 실제 작업을 실행합니다.

NestJS의 BullMQ 통합에서는 `@Processor()`와 `WorkerHost`를 사용합니다.

### 8.1. WorkerHost

`jobs/email.processor.ts`

```typescript
import {
  Logger,
} from '@nestjs/common';

import {
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';

import {
  Job,
} from 'bullmq';

import {
  EMAIL_QUEUE,
  EMAIL_JOB,
} from './constants/queue.constants';

import {
  EmailService,
} from './email.service';

import type {
  SendWelcomeEmailData,
} from './email.producer';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(
    EmailProcessor.name,
  );

  constructor(
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(
    job: Job<SendWelcomeEmailData>,
  ): Promise<void> {
    switch (job.name) {
      case EMAIL_JOB.SEND_WELCOME:
        await this.emailService.sendWelcome(
          job.data.email,
        );
        break;

      default:
        throw new Error(
          `Unknown job: ${job.name}`,
        );
    }

    this.logger.log(
      `Completed job: ${job.id}`,
    );
  }
}
```

`@Processor(EMAIL_QUEUE)`는 이 클래스가 `emails` Queue의 Job을 처리하도록 지정합니다.

`process()`는 Worker가 Job을 가져오면 호출되는 메서드입니다.

### 8.2. Processor 등록

Processor 클래스는 NestJS 모듈의 `providers` 배열에 등록해야 합니다.

```typescript
@Module({
  providers: [
    EmailProcessor,
    EmailService,
  ],
})
export class JobsModule {}
```

해당 클래스가 Provider로 등록되어 있지 않으면 NestJS가 Processor를 발견하여 Worker를 구성하지 못할 수 있습니다.

### 8.3. 여러 Job 처리

BullMQ의 `WorkerHost`는 `process()` 메서드 하나를 중심으로 작업을 처리합니다.

하나의 Queue에 여러 종류의 Job이 있다면 `job.name`을 기준으로 처리 로직을 구분할 수 있습니다.

```typescript
async process(job: Job): Promise<unknown> {
  switch (job.name) {
    case 'send-email':
      return this.handleEmail(job);

    case 'generate-report':
      return this.handleReport(job);

    default:
      throw new Error(
        `Unsupported job: ${job.name}`,
      );
  }
}
```

작업의 실행 비용이나 확장 요구사항이 크게 다르다면 별도의 Queue로 분리하는 것이 좋습니다.

## 9. Job Lifecycle

Job은 등록된 후 여러 상태를 거쳐 처리됩니다.

### 9.1. 기본 처리 흐름

```text
Queue.add()
    |
    v
 Waiting
    |
    v
  Active
    |
    +-- Success --> Completed
    |
    +-- Failure --> Failed
                         |
                         +-- Retry
                              |
                              v
                           Delayed
                              |
                              v
                            Waiting
```

작업이 지정된 시간 이후에 실행되도록 설정되면 처음부터 `delayed` 상태로 등록될 수 있습니다.

### 9.2. 주요 Job 상태

| 상태 | 의미 |
|---|---|
| `waiting` | Worker가 가져가기를 기다리는 상태 |
| `active` | Worker가 처리하는 상태 |
| `completed` | 작업이 정상 완료된 상태 |
| `failed` | 작업이 실패한 상태 |
| `delayed` | 지정한 실행 시간까지 대기하는 상태 |
| `waiting-children` | 하위 작업의 완료를 기다리는 상태 |

Retry가 설정된 Job은 실패 후 곧바로 최종 `failed` 상태로 남지 않고 재시도 대기 상태로 이동할 수 있습니다.

### 9.3. Job 상태 조회

```typescript
const job = await this.emailQueue.getJob(jobId);

if (!job) {
  return null;
}

const state = await job.getState();

return {
  id: job.id,
  name: job.name,
  state,
  attemptsMade: job.attemptsMade,
};
```

작업이 완료된 후 자동 삭제되었다면 `getJob()`으로 조회되지 않을 수 있습니다.

따라서 장기간 유지해야 하는 비즈니스 작업 상태는 별도의 데이터베이스에 관리하는 방식을 고려해야 합니다.

## 10. Job Options

`Queue.add()`의 세 번째 인자로 Job 실행 옵션을 지정할 수 있습니다.

```typescript
await this.emailQueue.add(
  'send-welcome',
  {
    userId: 100,
    email: 'user@example.com',
  },
  {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
);
```

주요 옵션은 다음과 같습니다.

| 옵션 | 역할 |
|---|---|
| `jobId` | 사용자 정의 Job ID |
| `delay` | 실행 지연 시간 |
| `attempts` | 최대 실행 시도 횟수 |
| `backoff` | 재시도 간격 정책 |
| `priority` | Job 우선순위 |
| `removeOnComplete` | 완료된 Job의 보존 정책 |
| `removeOnFail` | 실패한 Job의 보존 정책 |
| `lifo` | 후입선출 처리 설정 |
| `deduplication` | 중복 작업 등록 제어 |

## 11. Retry와 Backoff

Queue 작업은 네트워크 오류, 외부 API 장애, 데이터베이스 연결 실패 등으로 실패할 수 있습니다.

BullMQ는 실패한 Job을 다시 실행하는 기능을 제공합니다.

### 11.1. attempts

```typescript
await this.emailQueue.add(
  'send-welcome',
  data,
  {
    attempts: 3,
  },
);
```

`attempts: 3`은 최초 실행을 포함하여 최대 3번 시도한다는 의미입니다.

### 11.2. Fixed Backoff

```typescript
{
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 2000,
  },
}
```

실패한 작업을 일정한 간격으로 재시도합니다.

```text
Attempt 1
    |
  Failed
    |
  Wait 2s
    |
Attempt 2
    |
  Failed
    |
  Wait 2s
    |
Attempt 3
```

### 11.3. Exponential Backoff

```typescript
{
  attempts: 4,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
}
```

재시도 횟수가 증가할수록 대기 시간이 늘어납니다.

```text
Attempt 1
    |
  Wait 1s
    |
Attempt 2
    |
  Wait 2s
    |
Attempt 3
    |
  Wait 4s
    |
Attempt 4
```

Exponential Backoff는 외부 API 장애나 일시적인 네트워크 오류에 대응할 때 유용합니다.

### 11.4. 오류 전달

Worker에서 작업 실패를 알리려면 예외를 발생시켜야 합니다.

```typescript
async process(job: Job): Promise<void> {
  try {
    await this.emailService.sendWelcome(
      job.data.email,
    );
  } catch (error) {
    this.logger.error(
      'Email delivery failed',
      error instanceof Error
        ? error.stack
        : String(error),
    );

    throw error instanceof Error
      ? error
      : new Error(String(error));
  }
}
```

오류를 로그로 기록한 후 무시하면 BullMQ는 해당 Job을 정상 완료된 것으로 판단할 수 있습니다.

따라서 실패한 작업은 적절한 예외를 전달해야 합니다.

## 12. Delayed Job

Delayed Job은 지정한 시간이 지난 후 실행하도록 예약한 작업입니다.

### 12.1. 기본 사용법

```typescript
await this.emailQueue.add(
  'send-reminder',
  {
    userId: 100,
  },
  {
    delay: 60_000,
  },
);
```

이 예제는 약 60초 이후 작업이 실행 가능하도록 설정합니다.

다만 정확히 60초 후 실행을 보장하는 것은 아닙니다.

Worker의 가용성과 대기 중인 작업량에 따라 실제 실행 시각이 늦어질 수 있습니다.

### 12.2. 활용 사례

Delayed Job은 다음과 같은 상황에서 사용할 수 있습니다.

- 일정 시간 후 알림 발송
- 결제 미완료 주문 확인
- 임시 리소스 삭제
- 외부 API 요청 재시도
- 지연된 후처리 작업

Delayed Job은 현재 프로세스의 `setTimeout()`과 달리 BullMQ 저장소를 통해 작업 정보를 관리할 수 있습니다.

따라서 Worker가 재시작되더라도 저장소에 Job 정보가 남아 있으면 이후 처리될 수 있습니다.

## 13. Job Scheduler

반복적으로 실행해야 하는 작업은 BullMQ의 Job Scheduler를 사용할 수 있습니다.

최신 BullMQ에서는 기존 Repeatable Job API 대신 Job Scheduler를 사용합니다.

### 13.1. 일정 간격의 Job 생성

```typescript
await this.emailQueue.upsertJobScheduler(
  'daily-email-scheduler',
  {
    every: 60_000,
  },
  {
    name: 'send-digest',
    data: {
      type: 'digest',
    },
  },
);
```

이 예제는 60초 간격으로 작업을 생성하도록 설정합니다.

실제 생성 및 실행 시점은 Scheduler의 반복 규칙과 Worker 처리 상황에 영향을 받습니다.

### 13.2. Cron Expression

```typescript
await this.emailQueue.upsertJobScheduler(
  'daily-report',
  {
    pattern: '0 0 3 * * *',
    tz: 'Asia/Seoul',
  },
  {
    name: 'generate-report',
    data: {
      reportType: 'daily',
    },
  },
);
```

이 예제는 한국 시간 기준 매일 오전 3시에 보고서 생성 작업을 예약합니다.

### 13.3. Scheduler 관리

```typescript
const schedulers =
  await this.emailQueue.getJobSchedulers();
```

등록된 Scheduler를 조회할 수 있습니다.

```typescript
await this.emailQueue.removeJobScheduler(
  'daily-report',
);
```

등록된 Scheduler를 제거할 수 있습니다.

### 13.4. 기존 Repeat API와 차이

BullMQ의 이전 버전에서는 Job의 `repeat` 옵션을 사용했습니다.

```typescript
// 이전 버전에서 사용하던 방식
await queue.add('report', {}, {
  repeat: {
    every: 60_000,
  },
});
```

이 방식은 BullMQ v5.16.0부터 Deprecated 처리되었으며, v6에서는 Job Scheduler로 대체되었습니다.

따라서 신규 구현에서는 사용하는 BullMQ 버전을 확인하고 `upsertJobScheduler()`를 기준으로 구성하는 것이 좋습니다.

## 14. Concurrency

Concurrency는 Worker 하나가 동시에 처리할 수 있는 Job의 수를 의미합니다.

### 14.1. Worker Concurrency 설정

```typescript
@Processor(EMAIL_QUEUE, {
  concurrency: 5,
})
export class EmailProcessor extends WorkerHost {
  async process(job: Job): Promise<void> {
    await this.emailService.sendWelcome(
      job.data.email,
    );
  }
}
```

이 예제에서는 하나의 Worker가 최대 5개의 Job을 동시에 처리하도록 설정합니다.

### 14.2. 동시성과 병렬성

Node.js의 비동기 I/O 작업에서는 Concurrency를 높이면 대기 시간을 효율적으로 활용할 수 있습니다.

예를 들어 외부 API 요청이나 데이터베이스 조회처럼 I/O 대기가 많은 작업에 적합할 수 있습니다.

반면 CPU 연산이 많은 작업은 Concurrency를 높인다고 실제 병렬 처리 성능이 증가하지 않을 수 있습니다.

CPU 집약적인 작업은 별도의 프로세스나 Sandboxed Processor 사용을 고려하는 것이 좋습니다.

### 14.3. 여러 Worker 인스턴스

다음과 같은 환경을 가정합니다.

```text
Worker Replicas: 3
Concurrency per Worker: 5
```

이론적인 최대 동시 처리 Job 수는 다음과 같습니다.

```text
3 Workers × 5 Concurrency
= 15 Concurrent Jobs
```

다만 실제 처리량은 CPU, 외부 API 응답 시간, Redis 성능 및 데이터베이스 연결 수에 따라 달라집니다.

### 14.4. Global Concurrency

BullMQ는 Queue 전체의 동시 처리량을 제한하는 기능도 제공합니다.

```typescript
await this.emailQueue.setGlobalConcurrency(10);
```

이 설정은 여러 Worker 인스턴스에서 동일한 Queue를 처리하더라도 전체 동시 실행 수를 제한하는 데 사용합니다.

Worker별 `concurrency`와 Queue 전체의 Global Concurrency는 서로 다른 설정입니다.

## 15. Rate Limiting

Rate Limiting은 일정 시간 동안 처리할 수 있는 Job 수를 제한하는 기능입니다.

외부 API가 초당 요청 수를 제한하는 경우에 유용합니다.

### 15.1. 기본 설정

```typescript
@Processor(EMAIL_QUEUE, {
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class EmailProcessor extends WorkerHost {
  async process(job: Job): Promise<void> {
    // 작업 처리
  }
}
```

이 예제에서는 초당 최대 10개의 Job을 처리하도록 제한합니다.

BullMQ의 Rate Limiter는 동일 Queue에 연결된 여러 Worker에 걸쳐 적용될 수 있습니다.

### 15.2. Concurrency와 Rate Limiting의 차이

| 구분 | Concurrency | Rate Limiting |
|---|---|---|
| 제한 대상 | 동시에 실행 중인 작업 수 | 일정 시간에 시작하는 작업 수 |
| 대표 값 | 동시 5개 | 초당 10개 |
| 주요 목적 | 실행 자원 제어 | 처리 속도 제어 |
| 활용 사례 | 데이터베이스 연결 제한 | 외부 API 호출 제한 |

두 기능은 함께 사용할 수 있습니다.

## 16. Job Priority

BullMQ는 Job의 우선순위를 지정할 수 있습니다.

```typescript
await this.emailQueue.add(
  'urgent-email',
  {
    userId: 100,
  },
  {
    priority: 1,
  },
);
```

우선순위는 숫자가 작을수록 높습니다.

예를 들어 `priority: 1`은 `priority: 10`보다 우선적으로 처리될 수 있습니다.

다만 이미 실행 중인 Job을 중단하고 높은 우선순위의 Job을 즉시 실행하는 선점형 스케줄링을 의미하지는 않습니다.

또한 우선순위가 없는 일반 Job과 우선순위가 지정된 Job 사이에는 BullMQ의 별도 정렬 규칙이 적용됩니다.

## 17. Job 중복 등록 방지

Queue 작업은 동일한 HTTP 요청이 재전송되거나 이벤트가 중복 발행되면서 여러 번 등록될 수 있습니다.

따라서 중복 등록과 중복 실행의 차이를 이해해야 합니다.

### 17.1. jobId

```typescript
await this.emailQueue.add(
  'send-welcome',
  {
    userId: 100,
  },
  {
    jobId: 'welcome-user-100',
  },
);
```

동일한 Queue에 같은 Job ID가 존재하면 새로운 Job의 등록이 중복으로 처리될 수 있습니다.

하지만 기존 Job이 제거되면 같은 ID로 다시 등록할 수 있습니다.

따라서 `jobId`만으로 영구적인 중복 실행 방지를 보장할 수는 없습니다.

### 17.2. Deduplication

BullMQ는 `deduplication` 옵션을 제공합니다.

```typescript
await this.emailQueue.add(
  'send-welcome',
  {
    userId: 100,
  },
  {
    deduplication: {
      id: 'welcome-user-100',
    },
  },
);
```

Deduplication은 지정한 식별자를 기준으로 중복 작업 등록을 제한합니다.

세부적인 중복 처리 동작은 Deduplication 모드 및 TTL 설정에 따라 달라집니다.

### 17.3. 멱등성

Queue는 장애 복구 또는 재시도 과정에서 동일한 비즈니스 작업을 다시 실행할 수 있습니다.

따라서 중요한 작업에는 멱등성을 적용해야 합니다.

예를 들어 주문 번호를 기준으로 정산 결과를 저장한다면 데이터베이스 Unique Constraint를 사용할 수 있습니다.

```text
Job ID: settlement-order-1001
Business Key: order-1001
```

Queue의 Job ID와 별개로 데이터베이스에 처리 완료 기록을 관리할 수 있습니다.

이는 중복 Job 등록 방지와 중복 비즈니스 처리 방지가 서로 다른 문제이기 때문입니다.

## 18. Queue 이벤트

BullMQ는 Job 상태가 변경될 때 이벤트를 제공합니다.

NestJS에서는 Worker 이벤트와 Queue 이벤트를 구분하여 처리할 수 있습니다.

### 18.1. Worker 이벤트

Worker 이벤트는 해당 Worker 인스턴스에서 발생한 이벤트를 처리합니다.

```typescript
import {
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';

import { Job } from 'bullmq';

@Processor('emails')
export class EmailProcessor extends WorkerHost {
  async process(job: Job): Promise<void> {
    // 작업 처리
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(
    job: Job | undefined,
    error: Error,
  ) {
    console.error(
      `Failed: ${job?.id}`,
      error.message,
    );
  }
}
```

`@OnWorkerEvent()`는 Worker의 이벤트를 처리하기 위한 Decorator입니다.

### 18.2. Queue 이벤트

여러 Worker에서 발생한 Queue 상태 변경 이벤트를 관찰하려면 QueueEvents Listener를 사용할 수 있습니다.

```typescript
import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';

@QueueEventsListener('emails')
export class EmailQueueEvents
  extends QueueEventsHost
{
  @OnQueueEvent('completed')
  onCompleted({
    jobId,
  }: {
    jobId: string;
  }) {
    console.log(
      `Queue job completed: ${jobId}`,
    );
  }

  @OnQueueEvent('failed')
  onFailed({
    jobId,
    failedReason,
  }: {
    jobId: string;
    failedReason: string;
  }) {
    console.error(
      `Queue job failed: ${jobId}`,
      failedReason,
    );
  }
}
```

QueueEvents Listener도 NestJS 모듈의 Provider로 등록해야 합니다.

### 18.3. Worker 이벤트와 Queue 이벤트 비교

| 구분 | Worker Event | Queue Event |
|---|---|---|
| 대상 | 특정 Worker | Queue의 작업 상태 |
| Decorator | `@OnWorkerEvent()` | `@OnQueueEvent()` |
| 등록 위치 | Processor 클래스 | QueueEventsHost 클래스 |
| 주요 활용 | Worker 내부 로깅 | 전체 Queue 상태 관찰 |

Queue 이벤트는 작업 상태를 관찰하는 기능입니다.

중요한 비즈니스 처리를 이벤트 리스너에만 의존하면 리스너 장애나 이벤트 소비 실패 시 문제가 발생할 수 있으므로 별도의 영속적인 처리 전략을 고려해야 합니다.

## 19. Job Progress

장시간 실행되는 작업은 진행률을 기록할 수 있습니다.

### 19.1. 진행률 업데이트

```typescript
async process(job: Job): Promise<void> {
  const total = 100;

  for (let i = 1; i <= total; i++) {
    await this.processItem(i);

    await job.updateProgress(i);
  }
}
```

`job.updateProgress()`는 Job의 진행 상태를 저장합니다.

진행률은 숫자 또는 구조화된 객체로 표현할 수 있습니다.

### 19.2. 진행률 조회

```typescript
const job = await this.emailQueue.getJob(jobId);

if (!job) {
  return null;
}

return {
  jobId: job.id,
  progress: job.progress,
  state: await job.getState(),
};
```

이 기능은 다음과 같은 작업에 유용합니다.

- 대용량 파일 변환
- 데이터 마이그레이션
- 보고서 생성
- 대규모 Batch 처리

클라이언트에는 Polling, WebSocket 또는 Server-Sent Events를 이용하여 진행 상태를 전달할 수 있습니다.

## 20. FlowProducer

FlowProducer는 여러 Job 사이에 부모-자식 의존 관계를 정의하는 기능입니다.

### 20.1. 작업 의존성

다음과 같은 작업 흐름을 가정합니다.

```text
       Generate Report
              |
       +------+------+
       |             |
       v             v
   Load Sales    Load Users
       |             |
       +------+------+
              |
              v
       Merge Results
```

BullMQ의 Flow에서는 부모 Job이 하위 Job들의 완료를 기다리는 형태로 의존성을 구성할 수 있습니다.

### 20.2. FlowProducer 등록

```typescript
BullModule.registerFlowProducer({
  name: 'reports-flow',
});
```

`registerFlowProducer()`는 FlowProducer를 NestJS에 등록합니다.

### 20.3. FlowProducer 사용

```typescript
import { Injectable } from '@nestjs/common';

import {
  InjectFlowProducer,
} from '@nestjs/bullmq';

import {
  FlowProducer,
} from 'bullmq';

@Injectable()
export class ReportFlowService {
  constructor(
    @InjectFlowProducer('reports-flow')
    private readonly flowProducer: FlowProducer,
  ) {}

  async createReportFlow() {
    return this.flowProducer.add({
      name: 'merge-report',
      queueName: 'reports',
      data: {},
      children: [
        {
          name: 'load-sales',
          queueName: 'reports',
          data: {},
        },
        {
          name: 'load-users',
          queueName: 'reports',
          data: {},
        },
      ],
    });
  }
}
```

해당 Queue가 등록되어 있고 각 Job 이름을 처리하는 Worker가 존재해야 합니다.

또한 부모 Job에서 자식 Job의 결과를 사용할 때는 `job.getChildrenValues()` 등의 API를 활용할 수 있습니다.

FlowProducer는 단순한 순차 실행뿐 아니라 작업 간 의존성이 있는 비동기 처리 흐름을 구성할 때 유용합니다.

## 21. Queue 관리

Queue는 작업의 등록뿐 아니라 실행 상태를 조회하고 제어하는 API를 제공합니다.

### 21.1. Queue 일시 중지

```typescript
await this.emailQueue.pause();
```

Queue의 새로운 작업 처리를 일시 중지할 수 있습니다.

이미 실행 중인 Job이 자동으로 중단되는 것은 아닙니다.

### 21.2. Queue 실행 재개

```typescript
await this.emailQueue.resume();
```

일시 중지된 Queue의 처리를 재개합니다.

### 21.3. Job 개수 조회

```typescript
const counts =
  await this.emailQueue.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed',
  );
```

각 상태에 해당하는 Job 수를 확인할 수 있습니다.

### 21.4. 완료된 Job 정리

```typescript
await this.emailQueue.clean(
  60_000,
  1000,
  'completed',
);
```

이 예제는 지정한 유예 시간보다 오래된 완료 Job을 최대 1,000개까지 정리하는 데 사용합니다.

삭제된 Job의 데이터는 이후 조회할 수 없으므로 보존 정책을 먼저 결정해야 합니다.

## 22. 완료 및 실패 Job 보존

BullMQ는 기본적으로 완료되거나 실패한 Job의 정보를 저장소에 유지할 수 있습니다.

작업량이 증가하면 Redis 메모리 사용량도 증가합니다.

### 22.1. removeOnComplete

```typescript
{
  removeOnComplete: 1000,
}
```

완료된 Job을 최대 1,000개까지 유지하도록 설정합니다.

### 22.2. removeOnFail

```typescript
{
  removeOnFail: 5000,
}
```

실패한 Job을 최대 5,000개까지 유지하도록 설정합니다.

### 22.3. 시간 기반 보존

```typescript
{
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 86400,
    count: 5000,
  },
}
```

여기서 `age`는 초 단위입니다.

이 예제는 완료 Job을 최대 1시간, 실패 Job을 최대 24시간 보존하는 정책을 표현합니다.

다만 자동 정리는 일반적으로 새 작업이 완료되거나 실패할 때 수행되는 Lazy Cleanup 방식이므로 해당 시간이 되었다고 즉시 모든 Job이 삭제되는 것은 아닙니다.

## 23. Redis와 데이터 영속성

BullMQ는 기본적으로 Redis를 사용하여 Job 데이터와 처리 상태를 관리합니다.

Redis를 캐시 저장소로 사용할 때와 Queue 저장소로 사용할 때는 운영 요구사항이 다릅니다.

### 23.1. Redis의 역할

```text
Producer
    |
    v
BullMQ Queue
    |
    v
Redis
    |
    +-- Job Data
    +-- Job State
    +-- Delayed Jobs
    +-- Retry Metadata
    +-- Queue Events
    |
    v
Worker
```

Redis는 단순한 Cache로만 사용되는 것이 아니라 Queue의 작업 상태 저장소로 사용됩니다.

### 23.2. Eviction Policy

캐시 전용 Redis에서는 메모리가 부족할 때 오래되거나 자주 사용되지 않는 Key를 제거할 수 있습니다.

하지만 BullMQ가 사용하는 Job Key가 임의로 제거되면 Queue의 상태가 손상될 수 있습니다.

따라서 Redis 기반 BullMQ 운영 환경에서는 일반적으로 다음 정책을 고려합니다.

```text
maxmemory-policy noeviction
```

실제 Redis의 메모리 한도와 장애 처리 정책도 함께 설정해야 합니다.

### 23.3. Persistence

중요한 작업을 관리하는 Redis는 적절한 영속성 설정과 복구 정책을 갖추어야 합니다.

대표적인 설정은 다음과 같습니다.

- AOF(Append Only File)
- RDB Snapshot
- Replication
- Redis Sentinel 또는 Cluster
- 백업 및 복구

Redis의 영속성 설정만으로 모든 장애에서 데이터 손실이 발생하지 않는다고 보장할 수는 없습니다.

작업의 중요도에 따라 데이터베이스에 별도 상태를 저장하거나 Transactional Outbox 패턴을 사용하는 것도 고려할 수 있습니다.

## 24. Redis 외 저장소

최신 BullMQ는 Pluggable Backend 구조를 통해 Redis 외의 저장소도 지원합니다.

예를 들어 PostgreSQL Backend를 사용할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import {
  createPostgresBackend,
} from 'bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      backendFactory: createPostgresBackend,
      connection: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'example-password',
        database: 'app_db',
        migrate: true,
      },
    }),
  ],
})
export class AppModule {}
```

이 구성에는 `pg` 패키지가 필요합니다.

```bash
npm install pg
```

이 예제의 `migrate: true`는 BullMQ에서 사용하는 테이블을 초기화하는 옵션입니다.

운영 환경에서는 애플리케이션 시작 시 자동으로 Schema를 변경할지 신중하게 결정해야 합니다.

**이 기능은 BullMQ 및 `@nestjs/bullmq`의 지원 버전에 의존합니다.** 기존 프로젝트에서 Redis를 PostgreSQL로 변경할 때는 API 호환성, Backend 지원 범위 및 Migration 절차를 확인해야 합니다.

## 25. Stalled Job

Stalled Job은 Worker가 처리 중인 작업의 Lock을 정상적으로 갱신하지 못하는 상황과 관련된 개념입니다.

### 25.1. 발생 원인

대표적인 원인은 다음과 같습니다.

- Worker 프로세스 비정상 종료
- Node.js Event Loop Blocking
- 과도한 CPU 사용
- Redis 연결 장애
- Worker의 Lock 갱신 실패

### 25.2. 처리 과정

```text
Worker 1
   |
   v
Job Active
   |
   v
Worker Failure
   |
   v
Lock Not Renewed
   |
   v
Stalled Detection
   |
   v
Job Requeued or Failed
   |
   v
Worker 2
```

BullMQ는 특정 조건에서 Stalled Job을 다시 처리하도록 할 수 있습니다.

이 과정에서 동일한 Job의 비즈니스 로직이 중복 실행될 수 있습니다.

### 25.3. 대응 방안

- CPU 집약적 작업을 별도 프로세스로 분리합니다.
- Event Loop Blocking을 최소화합니다.
- Worker의 처리 시간을 측정합니다.
- Redis 연결 상태를 모니터링합니다.
- 멱등성을 적용합니다.
- Stalled 이벤트를 관찰합니다.

BullMQ의 Lock 메커니즘은 다중 Worker 사이의 작업 처리를 조정하지만 Exactly-once Execution을 보장하는 것은 아닙니다.

## 26. Kubernetes 환경의 Queue 아키텍처

NestJS 애플리케이션을 Kubernetes에 배포하는 경우 Producer와 Worker를 별도 Deployment로 분리할 수 있습니다.

### 26.1. 기본 구성

```text
              Kubernetes
                   |
             Load Balancer
                   |
          +--------+--------+
          |                 |
          v                 v
       API Pod 1         API Pod 2
          |                 |
          +--------+--------+
                   |
                   v
                 Redis
                   |
          +--------+--------+
          |                 |
          v                 v
      Worker Pod 1      Worker Pod 2
          |                 |
          +--------+--------+
                   |
                   v
                Database
```

API Pod는 Job을 등록하고 Worker Pod는 Job을 실행합니다.

### 26.2. Producer와 Worker 분리

모듈 구성을 분리하면 API 서버에서 Worker가 실행되지 않도록 설계할 수 있습니다.

```text
src/
├── api/
│   └── api.module.ts
│
├── worker/
│   └── worker.module.ts
│
├── jobs/
│   ├── jobs.module.ts
│   ├── email.producer.ts
│   └── email.processor.ts
│
├── main.ts
└── worker.ts
```

중요한 점은 API 애플리케이션에 Processor Provider를 등록하지 않는 것입니다.

Processor가 등록되면 해당 프로세스에서도 Worker가 생성되어 작업을 처리할 수 있습니다.

따라서 공유 Queue 설정과 Producer, Processor 등록을 구분하는 모듈 설계가 필요합니다.

### 26.3. Worker 전용 애플리케이션

Worker 프로세스는 HTTP 서버 없이 NestJS Application Context로 실행할 수 있습니다.

`worker.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import {
  WorkerModule,
} from './worker/worker.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(
    WorkerModule,
  );
}

void bootstrap();
```

WorkerModule에는 BullMQ 연결 설정과 필요한 Processor Provider를 등록합니다.

이 방식은 HTTP 서버와 Queue Worker의 프로세스를 분리하는 데 유용합니다.

### 26.4. 수평 확장

Worker Deployment의 Replica 수를 증가시키면 더 많은 Job을 처리할 수 있습니다.

하지만 Worker 수를 무조건 증가시키는 것이 최적의 방식은 아닙니다.

다음 항목을 함께 고려해야 합니다.

- Queue 대기 작업 수
- Job 처리 시간
- Worker Concurrency
- CPU 및 메모리 사용량
- Redis 처리량
- 데이터베이스 Connection Pool
- 외부 API Rate Limit

### 26.5. HPA와 KEDA

Kubernetes HPA는 CPU, 메모리 및 사용자 정의 Metrics를 기반으로 Pod 수를 조절할 수 있습니다.

KEDA는 Queue에 쌓인 작업 수와 같은 이벤트 기반 Metrics를 활용하여 Worker를 확장하는 데 사용할 수 있습니다.

예를 들어 Redis 기반 BullMQ의 대기 Job 수를 기준으로 Worker Replica를 증가시키는 구조를 고려할 수 있습니다.

```text
BullMQ Waiting Jobs
         |
         v
Queue Metrics
         |
         v
KEDA Scaler
         |
         v
Worker Deployment
         |
         v
Scale-out / Scale-in
```

이때 KEDA의 지원 Scaler 종류와 BullMQ의 실제 Redis Key 구조 및 지원 버전을 확인해야 합니다.

## 27. Queue와 Task Scheduling 비교

Queue와 Task Scheduling은 모두 백그라운드 작업에 사용되지만 주요 목적이 다릅니다.

| 항목 | Task Scheduling | Queue |
|---|---|---|
| 주요 목적 | 실행 시점 관리 | 비동기 작업 처리 |
| 대표 기술 | `@nestjs/schedule` | BullMQ |
| 작업 저장 | 기본적으로 프로세스 내부 스케줄 | 외부 저장소 |
| 여러 Worker | 직접 설계 필요 | 지원 |
| 재시도 | 별도 구현 | Job 옵션 지원 |
| 작업 상태 관리 | 별도 구현 | Job Lifecycle 제공 |
| 수평 확장 | 중복 실행 제어 필요 | 여러 Worker 사용 가능 |
| 대표 사용 사례 | 정기 데이터 정리 | 이메일, 이미지 처리 |

두 기능은 함께 사용할 수 있습니다.

예를 들어 `@Cron()`이 매일 오전 3시에 실행되고 해당 작업을 BullMQ에 등록하도록 구성할 수 있습니다.

```typescript
@Cron('0 0 3 * * *', {
  timeZone: 'Asia/Seoul',
})
async createDailyReportJob(): Promise<void> {
  await this.reportQueue.add(
    'generate-daily-report',
    {
      date: new Date().toISOString().slice(0, 10),
    },
  );
}
```

실제 운영 환경에서는 실행 날짜를 비즈니스 시간대에 맞게 계산해야 합니다.

또한 여러 API Pod가 같은 Cron Job을 등록하는 경우 Queue에 중복 작업이 생성되지 않도록 별도의 정책이 필요합니다.

반복 작업을 Queue 자체에서 관리하고 싶다면 BullMQ의 Job Scheduler를 사용할 수도 있습니다.

## 28. Queue와 EventEmitter 비교

NestJS의 `EventEmitter` 역시 이벤트 기반으로 작업을 분리하는 데 사용할 수 있습니다.

하지만 Queue와 EventEmitter는 책임과 처리 보장이 다릅니다.

| 항목 | EventEmitter | BullMQ |
|---|---|---|
| 기본 실행 범위 | 동일 프로세스 | 여러 프로세스 |
| 외부 저장소 | 기본적으로 불필요 | 기본적으로 필요 |
| 이벤트 영속성 | 기본 제공하지 않음 | Job 저장 지원 |
| 재시도 | 별도 구현 | 지원 |
| 작업 상태 관리 | 별도 구현 | 지원 |
| Worker 수평 확장 | 직접 구현 필요 | 지원 |
| 적합한 용도 | 프로세스 내부 이벤트 처리 | 비동기 작업 분산 처리 |

EventEmitter는 모듈 간 이벤트 전달과 느슨한 결합에 유용합니다.

반면 작업의 저장, 재시도 및 분산 처리가 필요한 경우 Queue를 고려할 수 있습니다.

EventEmitter에 대한 자세한 내용은 `events.md`에서 다룹니다.

## 29. Queue 모니터링

Queue는 HTTP 요청과 분리되어 동작하므로 별도의 모니터링이 필요합니다.

### 29.1. 주요 Metrics

| 지표 | 설명 |
|---|---|
| Waiting Jobs | 대기 중인 작업 수 |
| Active Jobs | 실행 중인 작업 수 |
| Completed Jobs | 완료된 작업 수 |
| Failed Jobs | 실패한 작업 수 |
| Delayed Jobs | 지연 실행 예정 작업 수 |
| Job Duration | 작업 처리 시간 |
| Retry Count | 재시도 횟수 |
| Job Throughput | 단위 시간당 처리된 Job 수 |
| Queue Waiting Time | 등록부터 실행까지 걸린 시간 |
| Stalled Count | Stalled 발생 횟수 |

### 29.2. 로그 관리

Job 로그에는 다음과 같은 정보를 포함하는 것이 좋습니다.

```typescript
this.logger.log(
  'Job completed',
  {
    jobId: job.id,
    jobName: job.name,
    attemptsMade: job.attemptsMade,
  },
);
```

실제 운영에서는 Job ID, Trace ID 및 관련 비즈니스 식별자를 함께 관리하면 작업 처리 흐름을 추적하기 쉽습니다.

### 29.3. Monitoring Dashboard

BullMQ와 연동할 수 있는 Queue 관리 도구를 사용하면 Job 상태를 시각적으로 확인할 수 있습니다.

대표적인 도구로 Bull Board가 있습니다.

이를 활용하면 Queue별 작업 상태와 실패 이력을 확인할 수 있습니다.

운영 환경에서 Queue 관리 Dashboard를 노출할 때는 인증과 접근 권한을 반드시 적용해야 합니다.

## 30. Queue 테스트

Queue 관련 기능은 Producer와 Worker를 구분하여 테스트하는 것이 좋습니다.

### 30.1. Producer 단위 테스트

`Queue.add()` 호출을 Mock으로 대체할 수 있습니다.

```typescript
import { Test } from '@nestjs/testing';

import {
  getQueueToken,
} from '@nestjs/bullmq';

import { EmailProducer } from './email.producer';

import { EMAIL_QUEUE } from './constants/queue.constants';

describe('EmailProducer', () => {
  const queueMock = {
    add: jest.fn(),
  };

  let producer: EmailProducer;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef =
      await Test.createTestingModule({
        providers: [
          EmailProducer,
          {
            provide: getQueueToken(EMAIL_QUEUE),
            useValue: queueMock,
          },
        ],
      }).compile();

    producer =
      moduleRef.get(EmailProducer);
  });

  it('adds a welcome email job', async () => {
    queueMock.add.mockResolvedValue({
      id: 'job-1',
    });

    const result =
      await producer.sendWelcomeEmail({
        userId: 100,
        email: 'user@example.com',
      });

    expect(result).toBe('job-1');

    expect(queueMock.add).toHaveBeenCalledWith(
      'send-welcome',
      {
        userId: 100,
        email: 'user@example.com',
      },
    );
  });
});
```

`getQueueToken()`은 등록된 Queue Provider의 Injection Token을 반환합니다.

### 30.2. Worker 단위 테스트

Processor의 `process()` 메서드를 직접 호출하여 비즈니스 로직을 검증할 수 있습니다.

```typescript
describe('EmailProcessor', () => {
  const emailServiceMock = {
    sendWelcome: jest.fn(),
  };

  it('processes email job', async () => {
    const processor = new EmailProcessor(
      emailServiceMock as unknown as EmailService,
    );

    const job = {
      id: 'job-1',
      name: 'send-welcome',
      data: {
        userId: 100,
        email: 'user@example.com',
      },
    } as Job;

    await processor.process(job);

    expect(
      emailServiceMock.sendWelcome,
    ).toHaveBeenCalledWith(
      'user@example.com',
    );
  });
});
```

관련 타입과 클래스 Import는 실제 테스트 파일의 디렉터리 구조에 맞게 추가해야 합니다.

### 30.3. 통합 테스트

실제 Redis와 Worker를 사용하여 다음 항목을 확인할 수 있습니다.

1. Job 등록과 Worker 실행
2. Job 정상 완료
3. 실패한 Job의 재시도
4. Backoff 간격
5. Delayed Job 실행
6. Job Scheduler 등록 및 실행
7. 동시 처리량 제한
8. Queue 이벤트 수신
9. Worker 중단 후 작업 복구
10. 여러 Worker의 중복 처리 방지 및 멱등성

단위 테스트는 비즈니스 로직을 검증하는 데 유용하지만 실제 Queue 저장소와 Lock 동작을 완전히 검증하지는 못합니다.

## 31. 실무 권장 프로젝트 구조

실무에서는 Queue 등록, Producer, Processor 및 비즈니스 로직의 책임을 분리하는 것이 좋습니다.

```text
src/
├── common/
│   └── queue/
│       ├── queue.module.ts
│       └── queue.constants.ts
│
├── email/
│   ├── dto/
│   │   └── send-email-job.dto.ts
│   ├── email.producer.ts
│   ├── email.processor.ts
│   ├── email.service.ts
│   └── email.module.ts
│
├── reports/
│   ├── reports.producer.ts
│   ├── reports.processor.ts
│   ├── reports.service.ts
│   └── reports.module.ts
│
├── app.module.ts
├── main.ts
└── worker.ts
```

각 구성 요소의 책임은 다음과 같습니다.

| 구성 요소 | 책임 |
|---|---|
| QueueModule | 공통 Queue 연결 설정 |
| Queue Constants | Queue 및 Job 이름 관리 |
| Producer | Job 생성 및 Queue 등록 |
| Processor | Job 수신 및 처리 흐름 관리 |
| Service | 실제 비즈니스 로직 |
| Worker Entrypoint | Worker 전용 프로세스 실행 |
| Job DTO | Job Payload의 데이터 구조 정의 |

### 31.1. 권장 사항

1. Producer와 Processor의 책임을 분리합니다.
2. Job Payload에는 필요한 데이터만 포함합니다.
3. 중요한 작업에는 멱등성을 적용합니다.
4. Retry와 Backoff를 오류 유형에 따라 설정합니다.
5. Worker Concurrency와 외부 시스템의 처리 용량을 함께 고려합니다.
6. 완료 및 실패 Job의 보존 기간을 제한합니다.
7. Redis 장애와 작업 데이터 유실 가능성을 고려합니다.
8. API와 Worker를 분리하여 독립적으로 확장할 수 있도록 구성합니다.
9. Queue 대기 시간과 실패율을 모니터링합니다.
10. 중요한 작업 상태는 별도의 영속적인 데이터베이스에서 관리하는 방법을 고려합니다.

## 32. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| Queue | 처리할 작업을 관리하는 대기열 |
| Producer | Queue에 Job을 등록 |
| Job | 작업 데이터와 실행 옵션을 포함하는 단위 |
| Worker | Job을 가져와 실행하는 주체 |
| Processor | Job의 실제 처리 로직 |
| `BullModule` | NestJS BullMQ 통합 모듈 |
| `@InjectQueue()` | Queue Provider 주입 |
| `@Processor()` | Worker 처리 대상 Queue 지정 |
| `WorkerHost` | NestJS BullMQ Processor 기반 클래스 |
| `Queue.add()` | Job 등록 |
| `attempts` | 최대 실행 시도 횟수 |
| `backoff` | 재시도 간격 제어 |
| `delay` | 지연 작업 실행 |
| Job Scheduler | 반복 작업 생성 |
| Concurrency | Worker 동시 처리 수 |
| Rate Limiting | 단위 시간당 작업 처리량 제한 |
| Priority | 작업 처리 우선순위 |
| Deduplication | 중복 Job 등록 제어 |
| Idempotency | 중복 실행 시 비즈니스 결과 일관성 유지 |
| FlowProducer | 의존 관계가 있는 Job 흐름 |
| QueueEvents | 작업 상태 변경 이벤트 |
| Stalled Job | Worker의 Lock 갱신 실패와 관련된 작업 상태 |
| Horizontal Scaling | Worker 인스턴스 수평 확장 |

## 33. 정리

NestJS의 Queue 기능은 실행 시간이 길거나 비동기적으로 처리할 수 있는 작업을 HTTP 요청 흐름에서 분리하는 데 사용합니다.

`@nestjs/bullmq`는 BullMQ를 NestJS의 Dependency Injection과 통합하여 Producer, Processor 및 QueueEvents Listener를 Provider로 관리할 수 있도록 지원합니다.

Producer는 `Queue.add()`를 이용하여 Job을 등록하고, Worker는 `WorkerHost.process()`를 통해 실제 작업을 수행합니다.

BullMQ는 Job Lifecycle, Retry, Backoff, Delayed Job, Job Scheduler, Concurrency 및 Rate Limiting 등의 기능을 제공합니다.

이를 통해 단순한 비동기 실행뿐 아니라 작업 처리량 제어와 장애 복구 전략을 구현할 수 있습니다.

또한 여러 Worker가 동일한 Queue를 처리할 수 있으므로 Kubernetes 환경에서는 API와 Worker를 분리하여 독립적으로 수평 확장하는 구조를 고려할 수 있습니다.

다만 BullMQ는 작업의 중복 실행 가능성을 완전히 제거하는 Exactly-once Execution 시스템이 아닙니다.

따라서 중요한 비즈니스 작업에서는 멱등성, 데이터베이스 제약 조건, 트랜잭션 및 작업 상태 관리를 함께 고려해야 합니다.

운영 환경에서는 Redis 등의 Queue 저장소에 대한 영속성 설정, 작업 보존 정책, 장애 복구, Worker 동시 처리량 및 모니터링을 종합적으로 설계하는 것이 중요합니다.

## 참고 자료

### NestJS 공식 문서

- [NestJS - Queues](https://docs.nestjs.com/techniques/queues)
- [NestJS - Background Jobs Tutorial](https://docs.nestjs.com/tutorials/background-jobs)
- [NestJS - Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling)
- [NestJS - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS - Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - Testing](https://docs.nestjs.com/fundamentals/testing)
- [NestJS - Transactional Outbox](https://docs.nestjs.com/reliability/outbox)
- [NestJS - Durable Workflows](https://docs.nestjs.com/reliability/workflows)

### BullMQ 공식 문서

- [BullMQ 공식 문서](https://docs.bullmq.io/)
- [BullMQ - NestJS Integration](https://docs.bullmq.io/guide/nestjs/)
- [BullMQ - Queues](https://docs.bullmq.io/guide/queues/)
- [BullMQ - Workers](https://docs.bullmq.io/guide/workers/)
- [BullMQ - Job Schedulers](https://docs.bullmq.io/guide/job-schedulers/)
- [BullMQ - Retrying Failing Jobs](https://docs.bullmq.io/guide/retrying-failing-jobs)
- [BullMQ - Concurrency](https://docs.bullmq.io/guide/workers/concurrency)
- [BullMQ - Rate Limiting](https://docs.bullmq.io/guide/rate-limiting)
- [BullMQ - Deduplication](https://docs.bullmq.io/guide/jobs/deduplication)
- [BullMQ - Flows](https://docs.bullmq.io/guide/flows)
- [BullMQ - Stalled Jobs](https://docs.bullmq.io/guide/workers/stalled-jobs)
- [BullMQ - Going to Production](https://docs.bullmq.io/guide/going-to-production)
- [BullMQ GitHub Repository](https://github.com/taskforcesh/bullmq)

### 운영 및 관련 기술

- [Redis 공식 문서](https://redis.io/docs/latest/)
- [Redis - Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Bull Board GitHub Repository](https://github.com/felixmosh/bull-board)
- [Kubernetes - Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes - Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [KEDA 공식 문서](https://keda.sh/docs/latest/)