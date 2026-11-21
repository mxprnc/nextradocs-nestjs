# Task Scheduling

## 1. 개요

Task Scheduling은 애플리케이션에서 특정 작업을 정해진 시간이나 일정한 간격에 따라 자동으로 실행하는 기능입니다.

백엔드 애플리케이션에서는 사용자의 HTTP 요청과 관계없이 주기적으로 실행해야 하는 작업이 존재합니다.

예를 들어 다음과 같은 작업을 수행할 수 있습니다.

- 매일 자정에 만료된 데이터 정리
- 일정 간격으로 외부 API에서 데이터 수집
- 주기적인 통계 데이터 생성
- 오래된 임시 파일 삭제
- 일정 시간 후 알림 발송
- 정기적인 보고서 생성
- 시스템 상태 및 외부 서비스 연결 상태 확인

NestJS는 `@nestjs/schedule` 패키지를 통해 이러한 기능을 제공합니다.

`@nestjs/schedule`은 Node.js의 `cron` 패키지와 통합되어 있으며, Decorator 기반의 선언적 스케줄링과 런타임 기반의 동적 스케줄링을 지원합니다.

주요 기능은 다음과 같습니다.

- `@Cron()`을 이용한 반복 및 특정 시각 작업
- `@Interval()`을 이용한 일정 간격의 반복 작업
- `@Timeout()`을 이용한 지연 실행
- `CronExpression`을 이용한 사전 정의 스케줄 사용
- `SchedulerRegistry`를 통한 동적 작업 등록 및 관리
- 작업 실행 시간대 설정
- 작업 중복 실행 제어
- Dependency Injection 기반 비즈니스 로직 연동

Task Scheduling은 애플리케이션 내부에서 실행되는 작업을 관리하는 기능입니다.

따라서 작업의 영속성, 분산 실행, 재시도 및 실패 복구가 필요한 경우에는 Queue 또는 별도의 작업 실행 인프라를 함께 고려해야 합니다.

## 2. Task Scheduling이 필요한 이유

### 2.1. 사용자 요청과 독립적인 작업 실행

일반적인 HTTP 요청은 클라이언트가 요청을 전송할 때 처리됩니다.

```text
Client
   |
   v
Controller
   |
   v
Service
   |
   v
Database
```

반면 정기적인 데이터 정리나 통계 생성은 클라이언트의 요청 없이도 실행되어야 합니다.

Task Scheduling을 사용하면 다음과 같은 구조로 처리할 수 있습니다.

```text
Schedule Trigger
       |
       v
Scheduled Method
       |
       v
Service
       |
       v
Database / External API
```

스케줄러가 정해진 시점에 메서드를 호출하며, 해당 메서드에서 필요한 비즈니스 로직을 수행합니다.

### 2.2. 반복 작업 자동화

Task Scheduling은 반복적인 운영 작업을 자동화하는 데 활용할 수 있습니다.

예를 들어 매일 오전 3시에 오래된 로그 데이터를 삭제하도록 설정할 수 있습니다.

```typescript
@Cron('0 0 3 * * *')
async cleanupLogs() {
  await this.logsService.deleteExpiredLogs();
}
```

위 작업은 스케줄러가 정상적으로 실행 중이고 지정한 시간대에 도달하면 호출됩니다.

### 2.3. 비즈니스 로직과 실행 시점 분리

스케줄링 기능을 사용하면 작업의 실행 시점과 실제 비즈니스 로직을 구분할 수 있습니다.

예를 들어 `StatisticsService`는 통계 생성 로직을 담당하고, `StatisticsScheduler`는 실행 시점을 관리하도록 설계할 수 있습니다.

```text
StatisticsScheduler
        |
        v
StatisticsService
        |
        v
StatisticsRepository
        |
        v
Database
```

이 구조에서는 동일한 통계 생성 로직을 HTTP API, Scheduler 또는 Queue Worker에서 재사용할 수 있습니다.

## 3. Task Scheduling의 주요 구성 요소

NestJS의 Task Scheduling은 다음 구성 요소를 중심으로 동작합니다.

| 구성 요소 | 역할 |
|---|---|
| `ScheduleModule` | 스케줄링 기능을 애플리케이션에 등록합니다. |
| `@Cron()` | Cron Expression 또는 특정 날짜를 기준으로 작업을 실행합니다. |
| `@Interval()` | 지정한 시간 간격으로 작업을 반복 실행합니다. |
| `@Timeout()` | 지정한 지연 시간 후 작업을 한 번 실행합니다. |
| `CronExpression` | 자주 사용하는 Cron 표현식을 상수로 제공합니다. |
| `SchedulerRegistry` | 등록된 스케줄을 조회하고 동적으로 관리합니다. |
| `CronJob` | Cron 작업의 실행 상태와 시간을 관리합니다. |
| `CronTime` | Cron 작업의 실행 시간 설정을 표현합니다. |

### 3.1. 기본 아키텍처

```text
NestJS Application
        |
        v
   ScheduleModule
        |
        v
   Task Scheduler
        |
        +-- Cron Jobs
        |
        +-- Intervals
        |
        +-- Timeouts
        |
        v
   Scheduled Service
        |
        v
   Business Service
        |
        +-- Database
        |
        +-- External API
        |
        +-- Queue
```

`ScheduleModule`은 등록된 Provider의 스케줄링 메타데이터를 수집하여 작업을 등록합니다.

실제 작업은 애플리케이션 프로세스 내부에서 실행됩니다.

### 3.2. 스케줄 등록 시점

`ScheduleModule.forRoot()`는 애플리케이션의 스케줄러를 초기화합니다.

선언적 Cron Job, Interval, Timeout은 NestJS의 `onApplicationBootstrap` 생명주기 Hook에서 등록됩니다.

이 시점에는 애플리케이션 모듈의 초기화 과정이 진행된 상태입니다.

관련 생명주기에 대한 자세한 내용은 NestJS의 Lifecycle Events 문서를 참고할 수 있습니다.

## 4. 환경 구성

### 4.1. 패키지 설치

Task Scheduling 기능을 사용하려면 다음 패키지를 설치합니다.

```bash
npm install @nestjs/schedule
```

`@nestjs/schedule`은 내부적으로 `cron` 패키지를 사용합니다.

동적 Cron Job을 직접 생성하는 경우에는 `cron` 패키지를 명시적으로 설치하는 것이 좋습니다.

```bash
npm install cron
```

### 4.2. ScheduleModule 등록

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TasksModule,
  ],
})
export class AppModule {}
```

`ScheduleModule.forRoot()`는 일반적으로 애플리케이션의 루트 모듈에서 한 번 등록합니다.

### 4.3. 프로젝트 구조

다음과 같은 구조를 사용할 수 있습니다.

```text
src/
├── tasks/
│   ├── tasks.scheduler.ts
│   ├── tasks.service.ts
│   └── tasks.module.ts
│
├── app.module.ts
└── main.ts
```

`tasks/tasks.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { TasksScheduler } from './tasks.scheduler';
import { TasksService } from './tasks.service';

@Module({
  providers: [
    TasksScheduler,
    TasksService,
  ],
})
export class TasksModule {}
```

`TasksScheduler`는 스케줄 실행 시점을 관리하고, `TasksService`는 실제 작업을 수행하는 구조로 구분할 수 있습니다.

## 5. @Cron()

`@Cron()`은 Cron Expression을 이용하여 메서드의 실행 시점을 정의하는 Decorator입니다.

### 5.1. 기본 사용법

`tasks/tasks.scheduler.ts`

```typescript
import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  Cron,
} from '@nestjs/schedule';

@Injectable()
export class TasksScheduler {
  private readonly logger = new Logger(
    TasksScheduler.name,
  );

  @Cron('45 * * * * *')
  handleCron() {
    this.logger.log(
      'Cron job executed',
    );
  }
}
```

이 작업은 매분 45초에 실행됩니다.

예를 들어 다음 시점에 실행될 수 있습니다.

```text
10:00:45
10:01:45
10:02:45
10:03:45
```

### 5.2. Cron Expression 구조

NestJS의 Cron Expression은 일반적으로 다음과 같은 구조를 사용합니다.

```text
* * * * * *
| | | | | |
| | | | | +-- Day of Week
| | | | +---- Month
| | | +------ Day of Month
| | +-------- Hour
| +---------- Minute
+------------ Second
```

각 필드의 범위는 다음과 같습니다.

| 위치 | 필드 | 범위 |
|---|---|---|
| 1 | Second | 0~59 |
| 2 | Minute | 0~59 |
| 3 | Hour | 0~23 |
| 4 | Day of Month | 1~31 |
| 5 | Month | 1~12 |
| 6 | Day of Week | 0~7 |

Day of Week에서 0과 7은 일요일을 의미합니다.

초(Second) 필드는 생략할 수 있으며, 생략한 경우 기본적으로 0초를 사용합니다.

### 5.3. Cron Expression 예제

| Cron Expression | 실행 시점 |
|---|---|
| `* * * * * *` | 매초 |
| `*/5 * * * * *` | 5초마다 |
| `0 * * * * *` | 매분 0초 |
| `0 */5 * * * *` | 5분마다 |
| `0 0 * * * *` | 매시간 정각 |
| `0 0 3 * * *` | 매일 오전 3시 |
| `0 30 9 * * 1-5` | 월~금 오전 9시 30분 |
| `0 0 0 1 * *` | 매월 1일 자정 |
| `0 0 0 1 1 *` | 매년 1월 1일 자정 |

Cron Expression은 정해진 시각을 기준으로 실행되므로 `@Interval()`의 고정 간격 실행과 구분됩니다.

### 5.4. Cron 특수 표현

| 표현 | 의미 | 예시 |
|---|---|---|
| `*` | 모든 값 | 매분 |
| `,` | 여러 값 지정 | `1,3,5` |
| `-` | 범위 지정 | `1-5` |
| `/` | 일정 간격 | `*/10` |

예를 들어 다음 표현은 평일 오전 9시부터 오후 5시까지 30분 간격으로 실행됩니다.

```typescript
@Cron('0 */30 9-17 * * 1-5')
handleBusinessHours() {
  // 작업 처리
}
```

이 예제는 지정된 시간대의 오전 9시 0분부터 오후 5시 30분까지 실행됩니다.

## 6. CronExpression

NestJS는 자주 사용하는 Cron Expression을 `CronExpression` Enum으로 제공합니다.

### 6.1. 기본 사용법

```typescript
import {
  Cron,
  CronExpression,
} from '@nestjs/schedule';

@Cron(CronExpression.EVERY_30_SECONDS)
handleEveryThirtySeconds() {
  // 작업 처리
}
```

문자열로 Cron Expression을 직접 작성하지 않고 사전 정의된 상수를 사용할 수 있습니다.

### 6.2. 주요 CronExpression

| 상수 | 의미 |
|---|---|
| `EVERY_SECOND` | 매초 |
| `EVERY_5_SECONDS` | 5초마다 |
| `EVERY_10_SECONDS` | 10초마다 |
| `EVERY_30_SECONDS` | 30초마다 |
| `EVERY_MINUTE` | 매분 |
| `EVERY_5_MINUTES` | 5분마다 |
| `EVERY_10_MINUTES` | 10분마다 |
| `EVERY_30_MINUTES` | 30분마다 |
| `EVERY_HOUR` | 매시간 |
| `EVERY_DAY_AT_MIDNIGHT` | 매일 자정 |
| `EVERY_WEEK` | 매주 |
| `EVERY_WEEKDAY` | 평일마다 |
| `EVERY_WEEKEND` | 주말마다 |
| `EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT` | 매월 1일 자정 |

`CronExpression`은 코드의 가독성을 높이는 데 도움이 됩니다.

다만 모든 실행 패턴을 제공하는 것은 아니므로 복잡한 일정은 Cron Expression 문자열을 직접 작성할 수 있습니다.

## 7. @Cron() 옵션

`@Cron()`의 두 번째 인자로 실행 옵션을 지정할 수 있습니다.

```typescript
@Cron('0 0 3 * * *', {
  name: 'daily-cleanup',
  timeZone: 'Asia/Seoul',
  waitForCompletion: true,
  disabled: false,
})
async cleanup() {
  // 작업 처리
}
```

주요 옵션은 다음과 같습니다.

| 옵션 | 설명 |
|---|---|
| `name` | Cron Job의 이름을 지정합니다. |
| `timeZone` | 실행 시간대를 지정합니다. |
| `utcOffset` | UTC 기준 시간 차이를 지정합니다. |
| `waitForCompletion` | 동일 프로세스 내 작업이 겹쳐 실행되지 않도록 제어합니다. |
| `disabled` | 작업 실행을 비활성화합니다. |
| `unrefTimeout` | 타이머가 Node.js 프로세스를 유지하는 동작을 제어합니다. |
| `threshold` | 지연된 실행 시점에 대한 허용 범위를 설정합니다. |

지원 옵션은 설치된 `@nestjs/schedule` 및 `cron` 버전에 따라 달라질 수 있습니다.

### 7.1. name

```typescript
@Cron('0 0 * * * *', {
  name: 'hourly-report',
})
generateReport() {
  // 작업 처리
}
```

`name`은 `SchedulerRegistry`에서 해당 작업을 조회하고 제어하기 위한 식별자로 사용됩니다.

### 7.2. timeZone

```typescript
@Cron('0 0 9 * * *', {
  timeZone: 'Asia/Seoul',
})
sendMorningNotification() {
  // 작업 처리
}
```

이 예제는 한국 시간 기준으로 매일 오전 9시에 실행되도록 설정합니다.

시간대를 명시하지 않으면 실행 환경의 기본 시간대에 따라 실행 시점이 달라질 수 있습니다.

따라서 Docker 또는 Kubernetes 환경에서는 `timeZone`을 명시하는 것이 좋습니다.

### 7.3. utcOffset

```typescript
@Cron('0 0 9 * * *', {
  utcOffset: 540,
})
handleTask() {
  // 작업 처리
}
```

`utcOffset`은 UTC와의 차이를 분 단위로 지정합니다.

UTC+9는 540분입니다.

`timeZone`과 `utcOffset`을 동시에 설정하지 않아야 합니다.

일광절약시간제(DST)를 사용하는 지역에서는 고정 Offset보다 IANA Time Zone을 사용하는 것이 적절합니다.

### 7.4. waitForCompletion

```typescript
@Cron(CronExpression.EVERY_10_SECONDS, {
  waitForCompletion: true,
})
async synchronizeData() {
  await this.syncService.execute();
}
```

`waitForCompletion: true`를 설정하면 이전 실행이 완료될 때까지 새로운 실행을 시작하지 않습니다.

예를 들어 작업 실행에 25초가 걸리는데 10초마다 실행하도록 설정했다고 가정합니다.

```text
00s: Job Started
10s: Skipped
20s: Skipped
25s: Job Completed
30s: Next Job Started
```

실행 중 발생한 스케줄 시점은 대기열에 저장되지 않고 건너뜁니다.

따라서 이 옵션은 작업의 중복 실행을 방지하지만 누락된 실행을 보상하지는 않습니다.

또한 이 옵션은 같은 프로세스 내의 중복 실행을 제어할 뿐, 여러 NestJS 인스턴스 사이의 중복 실행까지 방지하지는 않습니다.

### 7.5. disabled

```typescript
@Cron(CronExpression.EVERY_HOUR, {
  disabled: true,
})
handleDisabledJob() {
  // 실행되지 않음
}
```

`disabled: true`로 설정하면 해당 Cron Job이 자동으로 실행되지 않습니다.

런타임에서 작업을 제어해야 한다면 `SchedulerRegistry`를 사용할 수 있습니다.

## 8. 특정 날짜에 한 번 실행

`@Cron()`에는 Cron Expression뿐 아니라 JavaScript의 `Date` 객체도 전달할 수 있습니다.

```typescript
@Cron(new Date('2027-01-01T00:00:00+09:00'))
handleNewYear() {
  // 지정한 날짜에 한 번 실행
}
```

이 방식은 지정한 날짜와 시간에 한 번 실행하는 작업에 사용할 수 있습니다.

다만 애플리케이션 프로세스가 해당 시점에 실행 중이어야 합니다.

프로세스가 종료되어 있거나 재시작되는 동안 실행 시점을 놓쳤다면 작업이 반드시 실행된다고 보장할 수 없습니다.

또한 재시작 후에도 유지해야 하는 예약 작업은 데이터베이스 또는 외부 스케줄링 시스템에 스케줄 정보를 저장하는 방식을 고려해야 합니다.

## 9. @Interval()

`@Interval()`은 일정한 시간 간격으로 메서드를 반복 호출하는 Decorator입니다.

내부적으로 JavaScript의 `setInterval()`을 사용합니다.

### 9.1. 기본 사용법

```typescript
import {
  Interval,
} from '@nestjs/schedule';

@Interval(10_000)
handleInterval() {
  // 10초마다 실행
}
```

`@Interval()`의 시간 단위는 밀리초(ms)입니다.

```text
1,000 ms  = 1초
10,000 ms = 10초
60,000 ms = 1분
```

### 9.2. 이름 지정

```typescript
@Interval('health-check', 30_000)
checkHealth() {
  // 30초마다 실행
}
```

이름을 지정하면 `SchedulerRegistry`에서 해당 Interval을 관리할 수 있습니다.

### 9.3. @Cron()과 차이

`@Cron()`은 날짜와 시각을 기준으로 실행됩니다.

반면 `@Interval()`은 애플리케이션에서 타이머가 등록된 시점을 기준으로 일정 간격마다 실행을 시도합니다.

| 항목 | @Cron() | @Interval() |
|---|---|---|
| 실행 기준 | 날짜 및 시각 | 시간 간격 |
| 실행 형식 | Cron Expression | 밀리초 |
| 시간대 설정 | 지원 | 별도 시간대 개념 없음 |
| 특정 시각 실행 | 적합 | 부적합 |
| 주기적 Polling | 가능 | 적합 |
| 내부 기반 | cron | setInterval |

### 9.4. 비동기 작업 중복 실행

`@Interval()`은 비동기 작업이 완료되기를 기다린 후 다음 실행 시점을 자동으로 조정하는 기능이 아닙니다.

예를 들어 5초 간격의 작업이 10초 이상 걸린다면 여러 실행이 겹칠 수 있습니다.

이 경우 직접 실행 상태를 관리하거나 다른 스케줄링 방식을 고려해야 합니다.

## 10. @Timeout()

`@Timeout()`은 일정 시간이 지난 뒤 메서드를 한 번 실행하는 Decorator입니다.

내부적으로 JavaScript의 `setTimeout()`을 사용합니다.

### 10.1. 기본 사용법

```typescript
import {
  Timeout,
} from '@nestjs/schedule';

@Timeout(5_000)
handleTimeout() {
  // 5초 후 한 번 실행
}
```

이 예제는 타이머가 등록된 후 약 5초가 지나면 실행됩니다.

### 10.2. 이름 지정

```typescript
@Timeout('initial-sync', 10_000)
initializeData() {
  // 초기화 작업
}
```

이름을 지정하면 동적으로 취소하거나 관리할 수 있습니다.

### 10.3. 활용 사례

`@Timeout()`은 다음과 같은 작업에 사용할 수 있습니다.

- 애플리케이션 시작 후 초기 데이터 동기화
- 일정 시간 후 캐시 갱신
- 개발 및 테스트용 지연 작업
- 초기화 직후 실행할 후속 작업

다만 사용자별 예약 알림처럼 프로세스가 재시작되어도 유지되어야 하는 작업에는 메모리 기반 Timeout만 사용하는 것이 적절하지 않습니다.

## 11. SchedulerRegistry

`SchedulerRegistry`는 등록된 Cron Job, Interval 및 Timeout을 런타임에 조회하고 관리하는 기능입니다.

NestJS의 Dependency Injection을 통해 주입받아 사용할 수 있습니다.

### 11.1. 기본 사용법

```typescript
import {
  Injectable,
} from '@nestjs/common';

import {
  SchedulerRegistry,
} from '@nestjs/schedule';

@Injectable()
export class ScheduleManagerService {
  constructor(
    private readonly schedulerRegistry:
      SchedulerRegistry,
  ) {}
}
```

### 11.2. 주요 API

| API | 역할 |
|---|---|
| `getCronJob()` | Cron Job 조회 |
| `getCronJobs()` | 모든 Cron Job 조회 |
| `addCronJob()` | Cron Job 등록 |
| `deleteCronJob()` | Cron Job 삭제 |
| `getInterval()` | Interval 조회 |
| `getIntervals()` | Interval 이름 목록 조회 |
| `addInterval()` | Interval 등록 |
| `deleteInterval()` | Interval 삭제 |
| `getTimeout()` | Timeout 조회 |
| `getTimeouts()` | Timeout 이름 목록 조회 |
| `addTimeout()` | Timeout 등록 |
| `deleteTimeout()` | Timeout 삭제 |

`SchedulerRegistry`는 현재 애플리케이션 프로세스의 스케줄을 관리합니다.

따라서 여러 애플리케이션 인스턴스의 스케줄을 중앙에서 관리하는 분산 스케줄러와는 구분해야 합니다.

## 12. 동적 Cron Job 관리

### 12.1. Cron Job 조회

이름이 지정된 작업을 조회할 수 있습니다.

```typescript
const job = this.schedulerRegistry.getCronJob(
  'hourly-report',
);
```

반환된 `CronJob` 객체를 이용하여 작업을 제어할 수 있습니다.

### 12.2. 실행 중지

```typescript
const job = this.schedulerRegistry.getCronJob(
  'hourly-report',
);

job.stop();
```

`stop()`은 이후 스케줄에 따른 실행을 중지합니다.

이미 실행 중인 비동기 작업이 즉시 강제 종료되는 것은 아닙니다.

### 12.3. 실행 재개

```typescript
const job = this.schedulerRegistry.getCronJob(
  'hourly-report',
);

job.start();
```

중지된 작업의 실행을 다시 활성화할 수 있습니다.

### 12.4. 동적 Cron Job 생성

런타임에 새로운 Cron Job을 등록할 수 있습니다.

```typescript
import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  SchedulerRegistry,
} from '@nestjs/schedule';

import {
  CronJob,
} from 'cron';

@Injectable()
export class DynamicScheduleService {
  private readonly logger = new Logger(
    DynamicScheduleService.name,
  );

  constructor(
    private readonly schedulerRegistry:
      SchedulerRegistry,
  ) {}

  addCronJob(
    name: string,
    expression: string,
  ): void {
    const job = new CronJob(
      expression,
      () => {
        this.logger.log(
          `Executing job: ${name}`,
        );
      },
    );

    this.schedulerRegistry.addCronJob(
      name,
      job,
    );

    job.start();
  }
}
```

`CronJob`은 `cron` 패키지에서 제공하는 클래스입니다.

작업을 생성한 후 `SchedulerRegistry`에 등록하고 `start()`를 호출하면 실행이 시작됩니다.

실제 서비스에서는 외부에서 전달된 Cron Expression의 유효성, 작업 개수 제한 및 등록 권한을 검증해야 합니다.

### 12.5. 동적 Cron Job 삭제

```typescript
deleteCronJob(name: string): void {
  this.schedulerRegistry.deleteCronJob(name);
}
```

등록된 Cron Job을 삭제할 수 있습니다.

### 12.6. 실행 시간 변경

```typescript
import {
  CronTime,
} from 'cron';

const job = this.schedulerRegistry.getCronJob(
  'hourly-report',
);

job.setTime(
  new CronTime('0 */10 * * * *'),
);
```

이 예제에서는 작업 실행 시점을 10분마다 실행하도록 변경합니다.

### 12.7. 다음 실행 시점 조회

```typescript
const job = this.schedulerRegistry.getCronJob(
  'hourly-report',
);

const nextExecution = job.nextDate();

console.log(nextExecution.toJSDate());
```

`nextDate()`는 다음 실행 시점을 반환합니다.

반환되는 객체는 `cron` 패키지가 사용하는 Luxon `DateTime` 객체입니다.

JavaScript `Date`로 변환하려면 `toJSDate()`를 사용할 수 있습니다.

일회성 작업처럼 향후 실행 시점이 존재하지 않는 경우에는 예외가 발생할 수 있으므로 적절한 오류 처리가 필요합니다.

## 13. 동적 Interval 관리

`SchedulerRegistry`는 Interval을 동적으로 등록하고 삭제할 수 있습니다.

### 13.1. Interval 등록

```typescript
addInterval(
  name: string,
  milliseconds: number,
): void {
  const interval = setInterval(() => {
    console.log(`Interval: ${name}`);
  }, milliseconds);

  this.schedulerRegistry.addInterval(
    name,
    interval,
  );
}
```

### 13.2. Interval 삭제

```typescript
this.schedulerRegistry.deleteInterval(
  'health-check',
);
```

등록된 Interval을 제거하고 타이머를 정리합니다.

### 13.3. Interval 조회

```typescript
const intervalNames =
  this.schedulerRegistry.getIntervals();
```

`getIntervals()`는 등록된 Interval의 이름 목록을 반환합니다.

## 14. 동적 Timeout 관리

### 14.1. Timeout 등록

```typescript
addTimeout(
  name: string,
  milliseconds: number,
): void {
  const timeout = setTimeout(() => {
    console.log(`Timeout: ${name}`);
  }, milliseconds);

  this.schedulerRegistry.addTimeout(
    name,
    timeout,
  );
}
```

### 14.2. Timeout 삭제

```typescript
this.schedulerRegistry.deleteTimeout(
  'initial-sync',
);
```

### 14.3. Timeout 조회

```typescript
const timeoutNames =
  this.schedulerRegistry.getTimeouts();
```

동적으로 등록된 Timeout은 현재 Node.js 프로세스의 메모리에서 관리됩니다.

따라서 프로세스가 재시작되면 등록 상태가 유지되지 않습니다.

## 15. 비동기 작업 처리

Scheduled Method는 비동기 함수로 작성할 수 있습니다.

```typescript
@Cron(CronExpression.EVERY_MINUTE)
async synchronizeData(): Promise<void> {
  await this.syncService.synchronize();
}
```

비동기 작업에서는 다음 사항을 고려해야 합니다.

- 실행 시간
- 이전 작업과의 중복 실행
- 외부 API Timeout
- 데이터베이스 트랜잭션
- 재시도 정책
- 실패한 작업의 복구
- 애플리케이션 종료 중인 작업 처리

### 15.1. 오류 처리

```typescript
@Cron(CronExpression.EVERY_MINUTE, {
  waitForCompletion: true,
})
async synchronizeData(): Promise<void> {
  try {
    await this.syncService.synchronize();
  } catch (error) {
    this.logger.error(
      'Synchronization failed',
      error instanceof Error
        ? error.stack
        : String(error),
    );
  }
}
```

NestJS의 선언적 스케줄 메서드는 예외가 발생하면 이를 포착하여 로그로 출력하는 처리를 제공합니다.

하지만 이 동작이 실패한 작업의 자동 재시도를 의미하지는 않습니다.

재시도가 필요하다면 별도의 정책을 구현하거나 Queue 기반 작업 처리를 고려해야 합니다.

### 15.2. 실행 시간과 스케줄 간격

예를 들어 10초마다 실행되는 작업이 30초 동안 수행된다면 중복 실행이 발생할 수 있습니다.

```text
00s ── Job A Started ─────────── 30s
10s ── Job B Started ─────────── 40s
20s ── Job C Started ─────────── 50s
```

이러한 상황에서는 데이터 경합이나 외부 API의 과도한 호출이 발생할 수 있습니다.

`waitForCompletion` 또는 적절한 Lock 메커니즘을 적용해야 할 수 있습니다.

## 16. 중복 실행 방지

중복 실행은 동일한 작업이 이전 실행이 완료되기 전에 다시 실행되는 상황입니다.

### 16.1. Cron Job 내부의 중복 실행

단일 프로세스에서는 다음과 같이 제어할 수 있습니다.

```typescript
@Cron(CronExpression.EVERY_10_SECONDS, {
  waitForCompletion: true,
})
async processTask() {
  await this.tasksService.process();
}
```

이 방식은 동일한 Cron Job이 동시에 실행되는 것을 방지합니다.

### 16.2. Interval의 중복 실행

`@Interval()`에는 `@Cron()`의 `waitForCompletion`과 동일한 옵션이 제공되지 않습니다.

따라서 다음과 같이 직접 실행 상태를 관리할 수 있습니다.

```typescript
private isRunning = false;

@Interval(10_000)
async processInterval(): Promise<void> {
  if (this.isRunning) {
    return;
  }

  this.isRunning = true;

  try {
    await this.tasksService.process();
  } finally {
    this.isRunning = false;
  }
}
```

이 방식은 동일한 Service 인스턴스 내에서 중복 실행을 방지합니다.

다만 애플리케이션 프로세스가 여러 개 실행되는 경우에는 각 프로세스가 독립적인 `isRunning` 상태를 갖습니다.

따라서 분산 환경의 중복 실행은 별도 메커니즘이 필요합니다.

## 17. 다중 인스턴스 환경의 Task Scheduling

NestJS 애플리케이션을 여러 인스턴스로 실행하면 각 인스턴스에서 동일한 스케줄이 등록될 수 있습니다.

예를 들어 Kubernetes에서 세 개의 Pod를 실행한다고 가정합니다.

```text
             Kubernetes
                  |
       +----------+----------+
       |          |          |
       v          v          v
    NestJS      NestJS      NestJS
     Pod 1       Pod 2       Pod 3
       |          |          |
       v          v          v
    Cron Job   Cron Job   Cron Job
       |          |          |
       +----------+----------+
                  |
                  v
               Database
```

각 Pod는 독립적인 Node.js 프로세스를 사용합니다.

따라서 다음 스케줄을 정의하면 모든 Pod에서 실행될 수 있습니다.

```typescript
@Cron('0 0 3 * * *')
async cleanup() {
  await this.cleanupService.execute();
}
```

Pod가 3개라면 매일 오전 3시에 같은 작업이 최대 3번 시작될 수 있습니다.

이는 다음과 같은 문제를 발생시킬 수 있습니다.

- 동일한 데이터의 중복 처리
- 중복 알림 발송
- 중복 정산
- 데이터베이스 Lock 경합
- 불필요한 외부 API 호출
- 비즈니스 데이터 정합성 문제

따라서 다중 인스턴스 환경에서는 스케줄을 실행하는 주체와 실제 작업을 처리하는 주체를 명확하게 설계해야 합니다.

## 18. 분산 환경의 중복 실행 제어

분산 환경에서는 여러 애플리케이션 인스턴스가 동일한 작업을 실행하지 않도록 조정하는 메커니즘이 필요할 수 있습니다.

### 18.1. Distributed Lock

Distributed Lock은 여러 프로세스가 공유 저장소를 통해 특정 작업의 실행 권한을 조정하는 방식입니다.

```text
NestJS Pod 1 ----+
                 |
NestJS Pod 2 ----+--> Shared Lock Store
                 |           |
NestJS Pod 3 ----+           v
                        Lock Acquired
                              |
                              v
                       Execute Task
```

한 인스턴스가 Lock을 획득하면 다른 인스턴스는 같은 작업을 실행하지 않도록 구성할 수 있습니다.

### 18.2. @OnOneInstance()

최신 NestJS는 `@nestjs/locks` 패키지를 통해 여러 인스턴스 사이에서 작업 실행을 조정하는 기능을 제공합니다.

설치된 패키지 버전과 지원되는 Lock Store를 확인한 후 사용할 수 있습니다.

```typescript
import {
  Injectable,
} from '@nestjs/common';

import {
  Cron,
} from '@nestjs/schedule';

import {
  OnOneInstance,
} from '@nestjs/locks';

@Injectable()
export class InvoicesScheduler {
  @Cron('0 0 2 * * *')
  @OnOneInstance({
    key: 'invoices:nightly-export',
  })
  async exportInvoices() {
    // 작업 처리
  }
}
```

`@OnOneInstance()`는 여러 인스턴스가 공유하는 Lock Store를 사용하여 하나의 인스턴스에서 작업을 수행하도록 조정합니다.

PostgreSQL 또는 Redis 등 공유 Lock Store의 적절한 설정이 필요합니다.

이 기능이 모든 작업의 정확히 한 번 실행(Exactly-once Execution)을 보장하는 것은 아닙니다.

프로세스 장애, 네트워크 분리, Lock 만료 및 작업 재시도 과정에서는 중복 실행 가능성을 고려해야 합니다.

### 18.3. 멱등성

중복 실행을 완전히 배제하기 어려운 분산 시스템에서는 멱등성(Idempotency)을 고려하는 것이 중요합니다.

멱등성은 같은 작업을 여러 번 실행해도 최종 결과가 의도한 상태로 유지되는 성질입니다.

예를 들어 특정 날짜의 통계 데이터를 생성한다면 날짜를 Unique Key로 사용하여 동일한 통계를 중복 저장하지 않도록 구성할 수 있습니다.

```text
Job Key:
daily-statistics:2026-11-21
```

데이터베이스의 Unique Constraint, Upsert 및 트랜잭션을 활용하여 중복 처리의 영향을 줄일 수 있습니다.

단순히 중복 실행 여부를 메모리에서 확인하는 방식만으로는 여러 인스턴스의 데이터 정합성을 보장할 수 없습니다.

## 19. Kubernetes CronJob

Kubernetes는 일정에 따라 Job을 생성하는 `CronJob` 리소스를 제공합니다.

NestJS 애플리케이션 내부의 `@Cron()`과는 다른 실행 모델입니다.

### 19.1. Kubernetes CronJob 구조

```text
Kubernetes CronJob
        |
        v
      Job
        |
        v
      Pod
        |
        v
  NestJS Task Runner
        |
        v
  Business Service
        |
        v
     Database
```

Kubernetes CronJob은 지정한 스케줄에 따라 Job을 생성하고, 해당 Job이 Pod를 실행하여 작업을 수행하도록 관리합니다.

### 19.2. CronJob 예제

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-cleanup
spec:
  schedule: "0 3 * * *"
  timeZone: "Asia/Seoul"

  concurrencyPolicy: Forbid

  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1

  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: cleanup
              image: example/nestjs-task-runner:1.0
              command:
                - node
                - dist/tasks/cleanup.js
```

위 예제는 `dist/tasks/cleanup.js`라는 독립적인 실행 진입점이 빌드되어 있다고 가정합니다.

Kubernetes CronJob은 HTTP API 서버를 반드시 실행해야 하는 것은 아닙니다.

### 19.3. concurrencyPolicy

Kubernetes CronJob은 다음과 같은 동시 실행 정책을 제공합니다.

| 값 | 설명 |
|---|---|
| `Allow` | 이전 Job과 새로운 Job의 동시 실행을 허용합니다. |
| `Forbid` | 이전 Job이 실행 중이면 새로운 Job 실행을 건너뜁니다. |
| `Replace` | 실행 중인 이전 Job을 대체합니다. |

이 정책은 해당 CronJob이 생성하는 Job 사이의 동시성을 관리합니다.

동일한 외부 리소스를 처리하는 다른 CronJob이나 별도 프로세스까지 자동으로 조정하지는 않습니다.

### 19.4. NestJS @Cron()과 Kubernetes CronJob 비교

| 항목 | NestJS @Cron() | Kubernetes CronJob |
|---|---|---|
| 실행 위치 | NestJS 프로세스 내부 | 별도 Job Pod |
| 스케줄 등록 | Decorator | Kubernetes 리소스 |
| 프로세스 재시작 영향 | 프로세스 상태에 영향받음 | Kubernetes Controller가 일정 관리 |
| 다중 인스턴스 | 인스턴스마다 실행 가능 | CronJob 리소스가 Job 생성 관리 |
| 작업 실행 환경 | 기존 애플리케이션 | 별도 컨테이너 |
| 재시도 | 별도 구현 | Job 재시도 정책 사용 가능 |
| 자원 격리 | API 프로세스와 자원 공유 | 별도 Pod 리소스 설정 가능 |
| 동적 스케줄 관리 | SchedulerRegistry | Kubernetes API |
| 적합한 용도 | 가벼운 주기 작업 | 독립적인 정기 Batch 작업 |

Kubernetes CronJob 역시 장애 및 Controller 동작에 따라 Job이 중복 생성되거나 실행 시점을 놓칠 가능성이 있습니다.

따라서 중요한 작업에는 멱등성을 적용하는 것이 좋습니다.

## 20. Task Scheduling과 Queue

Task Scheduling과 Queue는 모두 백그라운드 작업에 사용할 수 있지만 목적과 실행 모델이 다릅니다.

### 20.1. Task Scheduling

Task Scheduling은 작업을 언제 실행할 것인지에 집중합니다.

```text
Scheduler
    |
    v
Scheduled Time
    |
    v
Execute Task
```

예를 들어 매일 오전 3시에 통계 데이터를 생성할 수 있습니다.

### 20.2. Queue

Queue는 작업을 저장하고 Worker가 비동기적으로 처리하도록 구성하는 기능입니다.

```text
Producer
    |
    v
   Queue
    |
    v
  Worker
    |
    v
Execute Task
```

Queue를 사용하면 작업의 재시도, 실행 상태 관리 및 처리량 제어 등을 구현할 수 있습니다.

### 20.3. Scheduler와 Queue 결합

실무에서는 Scheduler가 작업을 직접 모두 처리하지 않고 Queue에 작업을 등록하도록 구성할 수 있습니다.

```text
ScheduleModule
      |
      v
   @Cron()
      |
      v
 Queue.add()
      |
      v
     Queue
      |
      v
    Worker
      |
      v
Business Service
```

이 구조는 실행 시점 관리와 작업 처리를 분리합니다.

예를 들어 매일 자정에 정산 작업을 Queue에 등록하고, Worker가 실제 정산을 수행하도록 설계할 수 있습니다.

다만 Scheduler가 여러 인스턴스에서 실행된다면 Queue에 동일한 작업이 중복 등록되는 문제도 고려해야 합니다.

Queue의 Job ID, 중복 등록 정책 또는 분산 Lock을 이용하여 이를 제어할 수 있습니다.

Queue에 대한 자세한 내용은 `queues.md`에서 다룹니다.

## 21. 동적 스케줄의 영속성

`SchedulerRegistry`에서 등록한 스케줄은 기본적으로 해당 Node.js 프로세스의 메모리에 보관됩니다.

따라서 애플리케이션을 재시작하면 런타임에 등록한 작업 정보가 사라질 수 있습니다.

### 21.1. 영속성 문제

```text
Application Running
        |
        v
Dynamic Job Registered
        |
        v
Process Restart
        |
        v
Dynamic Job Lost
```

사용자가 직접 예약한 알림이나 보고서처럼 재시작 후에도 유지해야 하는 스케줄은 데이터베이스에 저장하는 것이 좋습니다.

### 21.2. 데이터베이스 기반 스케줄 복원

```text
Application Startup
        |
        v
Load Schedules from Database
        |
        v
SchedulerRegistry
        |
        v
Register Cron Jobs
        |
        v
Start Jobs
```

예를 들어 다음과 같은 데이터 모델을 사용할 수 있습니다.

| 필드 | 설명 |
|---|---|
| `id` | 스케줄 식별자 |
| `name` | 스케줄 이름 |
| `cronExpression` | 실행 주기 |
| `timeZone` | 실행 시간대 |
| `enabled` | 활성화 여부 |
| `lastExecutedAt` | 마지막 실행 시각 |
| `createdAt` | 생성 시각 |

애플리케이션 시작 시 활성화된 스케줄을 조회하여 `SchedulerRegistry`에 등록할 수 있습니다.

다만 여러 인스턴스가 같은 데이터베이스에서 스케줄을 복원하면 중복 실행 문제가 발생할 수 있습니다.

이 경우 스케줄의 영속성과 분산 실행 제어를 함께 설계해야 합니다.

## 22. 오류 처리와 재시도

Task Scheduling은 작업을 실행하도록 예약하는 기능이며, 모든 작업의 실패를 자동으로 복구하는 시스템은 아닙니다.

### 22.1. 대표적인 오류

- 외부 API Timeout
- 데이터베이스 연결 실패
- 네트워크 장애
- Lock 획득 실패
- 애플리케이션 프로세스 종료
- 잘못된 Cron Expression
- 작업 실행 시간 초과

### 22.2. 재시도 정책

재시도 가능한 오류는 제한된 횟수만 재시도하도록 구성할 수 있습니다.

예를 들어 다음 정책을 적용할 수 있습니다.

```text
1st Attempt
    |
    +-- Failed
          |
          v
       Wait 1s
          |
          v
     2nd Attempt
          |
          +-- Failed
                |
                v
             Wait 2s
                |
                v
           3rd Attempt
```

다만 모든 오류를 재시도하는 것은 적절하지 않습니다.

잘못된 입력 데이터나 영구적인 권한 오류는 재시도하더라도 성공하지 않을 수 있습니다.

또한 외부 시스템에 이미 반영된 작업을 다시 실행하면 중복 처리 문제가 발생할 수 있습니다.

### 22.3. 실패 이력 관리

중요한 정기 작업은 실행 결과를 별도로 저장할 수 있습니다.

예를 들어 다음과 같은 작업 이력 테이블을 구성할 수 있습니다.

```text
scheduled_job_executions
├── id
├── job_name
├── started_at
├── completed_at
├── status
├── error_message
└── retry_count
```

이를 통해 작업의 실행 여부, 처리 시간 및 실패 원인을 추적할 수 있습니다.

## 23. Task Scheduling의 성능 고려사항

### 23.1. Event Loop Blocking

NestJS의 기본 실행 환경은 Node.js의 Event Loop를 사용합니다.

따라서 CPU 연산이 많은 동기 작업을 스케줄러에서 실행하면 HTTP 요청 및 다른 비동기 작업 처리에 영향을 줄 수 있습니다.

```typescript
@Cron(CronExpression.EVERY_MINUTE)
handleTask() {
  // 장시간 CPU를 점유하는 동기 작업
}
```

이러한 작업은 Worker Threads, 별도 프로세스 또는 Queue Worker로 분리하는 것을 고려해야 합니다.

### 23.2. 작업 실행 시간

각 스케줄 작업의 실행 시간이 실행 주기보다 길어지면 중복 실행이나 작업 지연이 발생할 수 있습니다.

따라서 다음 정보를 관찰하는 것이 좋습니다.

- 작업 시작 시각
- 작업 완료 시각
- 실행 소요 시간
- 성공 및 실패 여부
- 중복 실행 횟수
- 건너뛴 실행 횟수

### 23.3. 외부 시스템 부하

짧은 간격으로 외부 API나 데이터베이스에 접근하는 작업은 외부 시스템의 부하를 증가시킬 수 있습니다.

특히 다중 Pod 환경에서는 인스턴스 수만큼 요청 수가 증가할 수 있습니다.

따라서 실행 간격뿐 아니라 전체 시스템의 작업 실행량을 고려해야 합니다.

## 24. Monitoring 및 Logging

정기 작업은 사용자 요청 없이 실행되므로 실패하더라도 즉시 인지하기 어려울 수 있습니다.

따라서 실행 상태를 로그와 Metrics로 관리하는 것이 좋습니다.

### 24.1. 작업 로그

```typescript
@Cron(CronExpression.EVERY_HOUR, {
  waitForCompletion: true,
})
async generateStatistics(): Promise<void> {
  const startedAt = performance.now();

  this.logger.log(
    'Statistics generation started',
  );

  try {
    await this.statisticsService.generate();

    this.logger.log(
      'Statistics generation completed',
      {
        durationMs:
          Math.round(performance.now() - startedAt),
      },
    );
  } catch (error) {
    this.logger.error(
      'Statistics generation failed',
      error instanceof Error
        ? error.stack
        : String(error),
    );
  }
}
```

### 24.2. 주요 Metrics

| 지표 | 설명 |
|---|---|
| Job Execution Count | 작업 실행 횟수 |
| Job Success Count | 작업 성공 횟수 |
| Job Failure Count | 작업 실패 횟수 |
| Job Duration | 작업 실행 시간 |
| Job Skip Count | 건너뛴 실행 횟수 |
| Last Success Timestamp | 마지막 성공 시각 |
| Running Job Count | 실행 중인 작업 수 |

Prometheus와 Grafana를 사용하면 이러한 지표를 수집하고 시각화할 수 있습니다.

작업이 일정 시간 이상 실행되지 않은 경우 알림을 발생시키는 방식도 고려할 수 있습니다.

## 25. Task Scheduling 테스트

Scheduled Method의 테스트는 실제 스케줄러 실행과 비즈니스 로직 검증을 구분하는 것이 좋습니다.

### 25.1. 비즈니스 로직 단위 테스트

스케줄러와 실제 작업을 별도 Service로 분리하면 테스트가 쉬워집니다.

```typescript
@Injectable()
export class CleanupScheduler {
  constructor(
    private readonly cleanupService: CleanupService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanup(): Promise<void> {
    await this.cleanupService.execute();
  }
}
```

단위 테스트에서는 `CleanupService`를 Mock으로 대체할 수 있습니다.

```typescript
describe('CleanupScheduler', () => {
  const cleanupServiceMock = {
    execute: jest.fn(),
  };

  let scheduler: CleanupScheduler;

  beforeEach(() => {
    jest.clearAllMocks();

    scheduler = new CleanupScheduler(
      cleanupServiceMock as unknown as CleanupService,
    );
  });

  it('executes cleanup service', async () => {
    cleanupServiceMock.execute.mockResolvedValue(
      undefined,
    );

    await scheduler.cleanup();

    expect(
      cleanupServiceMock.execute,
    ).toHaveBeenCalledTimes(1);
  });
});
```

이 테스트는 Scheduled Method가 Service를 호출하는지 검증합니다.

실제 Cron Expression에 따라 정해진 시간에 자동 실행되는지까지 검증하는 것은 아닙니다.

### 25.2. Fake Timers

Interval과 Timeout의 동작을 검증할 때는 Jest의 Fake Timers를 사용할 수 있습니다.

```typescript
jest.useFakeTimers();

try {
  const callback = jest.fn();

  setTimeout(callback, 5_000);

  jest.advanceTimersByTime(5_000);

  expect(callback).toHaveBeenCalledTimes(1);
} finally {
  jest.useRealTimers();
}
```

이 예제는 JavaScript Timer의 동작을 검증합니다.

실제 `@nestjs/schedule`의 등록 및 실행 과정까지 확인하려면 NestJS TestingModule을 구성한 통합 테스트가 필요합니다.

### 25.3. 통합 테스트 항목

다음 사항을 확인하는 것이 좋습니다.

1. ScheduleModule이 정상적으로 초기화되는지 확인합니다.
2. Cron Job이 등록되는지 확인합니다.
3. SchedulerRegistry에서 작업을 조회할 수 있는지 확인합니다.
4. 작업 중지 및 재개가 정상 동작하는지 확인합니다.
5. 비동기 작업의 중복 실행 정책을 확인합니다.
6. 오류가 발생해도 다른 작업에 영향을 주지 않는지 확인합니다.
7. 애플리케이션 종료 시 타이머가 정리되는지 확인합니다.
8. 다중 인스턴스 환경에서 중복 실행 제어가 동작하는지 확인합니다.

## 26. 실무 권장 프로젝트 구조

실무에서는 스케줄 정의와 비즈니스 로직을 구분하는 것이 좋습니다.

```text
src/
├── scheduling/
│   ├── scheduling.module.ts
│   ├── scheduling.service.ts
│   └── schedule-manager.service.ts
│
├── statistics/
│   ├── statistics.scheduler.ts
│   ├── statistics.service.ts
│   └── statistics.module.ts
│
├── cleanup/
│   ├── cleanup.scheduler.ts
│   ├── cleanup.service.ts
│   └── cleanup.module.ts
│
├── app.module.ts
└── main.ts
```

각 구성 요소의 책임은 다음과 같습니다.

| 구성 요소 | 책임 |
|---|---|
| `scheduling.module.ts` | 공통 스케줄링 기능 구성 |
| `scheduling.service.ts` | 공통 스케줄링 로직 |
| `schedule-manager.service.ts` | 동적 스케줄 등록 및 관리 |
| `statistics.scheduler.ts` | 통계 작업 실행 시점 정의 |
| `statistics.service.ts` | 통계 생성 로직 |
| `cleanup.scheduler.ts` | 정리 작업 실행 시점 정의 |
| `cleanup.service.ts` | 데이터 정리 로직 |

공통 스케줄 관리 기능이 필요한 경우에만 별도의 SchedulingModule을 구성할 수 있습니다.

단순한 애플리케이션에서는 각 Feature Module에 Scheduler Provider를 등록하는 방식으로도 충분합니다.

## 27. Task Scheduling 설계 권장 사항

Task Scheduling을 설계할 때는 다음 원칙을 고려하는 것이 좋습니다.

1. **스케줄 실행 시점과 비즈니스 로직을 분리합니다.**  
   Scheduler는 실행 시점과 작업 호출을 담당하고, 실제 로직은 Service에서 처리합니다.

2. **작업의 중복 실행 가능성을 고려합니다.**  
   동일 프로세스에서는 `waitForCompletion` 등을 사용할 수 있으며, 다중 인스턴스 환경에서는 별도의 분산 실행 제어가 필요할 수 있습니다.

3. **중요한 작업에는 멱등성을 적용합니다.**  
   중복 실행이나 재시도 상황에서도 데이터 정합성을 유지하도록 설계합니다.

4. **실행 시간대를 명시합니다.**  
   컨테이너 및 서버의 기본 시간대에 의존하지 않도록 `timeZone`을 지정합니다.

5. **작업의 실패 이력을 관리합니다.**  
   실행 성공 여부와 오류 정보를 기록하여 장애 분석에 활용합니다.

6. **장시간 실행 작업은 별도 Worker로 분리합니다.**  
   CPU 사용량이 많거나 실행 시간이 긴 작업은 Queue 또는 독립적인 프로세스로 분리하는 것이 좋습니다.

7. **동적 스케줄은 영속성을 고려합니다.**  
   프로세스 재시작 후에도 유지해야 하는 작업은 외부 저장소에 스케줄 정보를 보관합니다.

8. **운영 환경의 배포 방식을 고려합니다.**  
   Kubernetes에서 여러 Pod를 운영한다면 각 Pod의 스케줄러 실행 여부를 명확하게 관리합니다.

9. **작업 실행 상태를 모니터링합니다.**  
   실행 횟수, 실패 횟수 및 처리 시간을 측정합니다.

10. **작업의 중요도에 따라 실행 인프라를 선택합니다.**  
    가벼운 내부 작업은 NestJS Scheduler로 처리하고, 독립적인 정기 Batch 작업은 Kubernetes CronJob이나 별도의 스케줄링 시스템을 고려합니다.

## 28. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| Task Scheduling | 지정된 시각 또는 간격에 따라 작업 실행 |
| `ScheduleModule` | NestJS 스케줄링 기능 등록 |
| `@Cron()` | Cron Expression 기반 작업 실행 |
| `@Interval()` | 일정 간격의 반복 실행 |
| `@Timeout()` | 일정 시간 후 한 번 실행 |
| `CronExpression` | 사전 정의된 Cron 표현식 |
| `SchedulerRegistry` | 스케줄 조회 및 동적 관리 |
| `CronJob` | Cron 작업 인스턴스 |
| `CronTime` | Cron 실행 시간 설정 |
| `waitForCompletion` | 동일 프로세스 내 Cron 중복 실행 제어 |
| `timeZone` | 스케줄 실행 시간대 |
| Dynamic Scheduling | 런타임 스케줄 등록 및 변경 |
| Distributed Lock | 다중 인스턴스의 작업 실행 조정 |
| Idempotency | 중복 실행에도 결과의 일관성 유지 |
| Kubernetes CronJob | Kubernetes 기반 정기 Job 실행 |
| Queue | 작업의 비동기 처리와 실행 관리 |
| Scheduler + Queue | 스케줄링과 작업 처리의 책임 분리 |

## 29. 정리

NestJS의 Task Scheduling 기능은 애플리케이션에서 정해진 시간이나 일정한 간격에 따라 작업을 자동으로 실행하는 데 사용합니다.

`@nestjs/schedule` 패키지는 `ScheduleModule`을 통해 스케줄러를 초기화하며, `@Cron()`, `@Interval()`, `@Timeout()`을 이용하여 선언적으로 작업 실행 시점을 정의할 수 있습니다.

`CronExpression`을 사용하면 자주 사용하는 실행 주기를 간단하게 설정할 수 있고, `SchedulerRegistry`를 이용하면 런타임에 작업을 등록하거나 중지하고 실행 시간을 변경할 수 있습니다.

비동기 작업에서는 실행 시간과 스케줄 간격을 고려해야 하며, `waitForCompletion`과 같은 옵션을 활용하여 동일 프로세스 내의 중복 실행을 제어할 수 있습니다.

하지만 NestJS의 기본 Scheduler는 애플리케이션 프로세스 내부에서 동작하므로 다중 인스턴스 환경에서는 모든 인스턴스가 동일한 작업을 실행할 수 있습니다.

따라서 Kubernetes와 같은 분산 환경에서는 Distributed Lock, 작업 멱등성, 별도 Scheduler 인스턴스 또는 Kubernetes CronJob 등의 방법을 고려해야 합니다.

또한 장시간 실행되거나 실패 복구가 중요한 작업은 Queue Worker 등 별도의 작업 처리 시스템과 결합하는 것이 적절할 수 있습니다.

Task Scheduling은 작업 실행 시점을 관리하는 기능이며, 작업의 영속성, 정확한 실행 보장 및 실패 복구는 애플리케이션의 요구사항에 따라 추가적으로 설계해야 합니다.

## 참고 자료

### NestJS 공식 문서

- [NestJS - Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling)
- [NestJS - Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [NestJS - Providers](https://docs.nestjs.com/providers)
- [NestJS - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS - Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS - Queues](https://docs.nestjs.com/techniques/queues)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - Logger](https://docs.nestjs.com/techniques/logger)
- [NestJS - Testing](https://docs.nestjs.com/fundamentals/testing)
- [NestJS - Distributed Locks](https://docs.nestjs.com/reliability/locks)
- [NestJS - Durable Workflows](https://docs.nestjs.com/reliability/workflows)

### Scheduling 라이브러리

- [NestJS Schedule GitHub Repository](https://github.com/nestjs/schedule)
- [NestJS Schedule 공식 예제](https://github.com/nestjs/nest/tree/master/sample/27-scheduling)
- [cron GitHub Repository](https://github.com/kelektiv/node-cron)
- [cron - npm](https://www.npmjs.com/package/cron)
- [Node.js - Timers](https://nodejs.org/api/timers.html)
- [Node.js - Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Luxon 공식 문서](https://moment.github.io/luxon/)

### Kubernetes 및 운영 환경

- [Kubernetes - CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [Kubernetes - Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes - CronJob API](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/cron-job-v1/)
- [Kubernetes - Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Redis 공식 문서](https://redis.io/docs/latest/)
- [PostgreSQL - Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)