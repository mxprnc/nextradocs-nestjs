# Health Checks

## 1. 개요

Health Check는 애플리케이션이나 외부 의존성이 정상적으로 동작하고 있는지 확인하는 메커니즘입니다.

운영 환경에서는 애플리케이션 프로세스가 실행 중이더라도 실제 요청을 정상적으로 처리할 수 없는 상황이 발생할 수 있습니다.

예를 들어 데이터베이스 연결이 끊어지거나, 외부 API가 응답하지 않거나, 애플리케이션이 초기화되지 않은 상태에서도 프로세스 자체는 실행 중일 수 있습니다.

Health Check는 이러한 상태를 확인하고 Load Balancer, Container Orchestrator, Monitoring System 등이 적절한 조치를 수행할 수 있도록 상태 정보를 제공합니다.

NestJS에서는 `@nestjs/terminus` 패키지를 이용하여 Health Check Endpoint를 구현할 수 있습니다.

주요 학습 항목은 다음과 같습니다.

- Health Check의 개념과 필요성
- Liveness, Readiness, Startup Probe
- NestJS Terminus의 구조와 사용 방법
- Health Check Endpoint 구현
- Database 및 외부 서비스 상태 확인
- Memory 및 Disk 상태 확인
- Custom Health Indicator
- Health Check 응답과 HTTP Status Code
- Kubernetes Probe 연동
- Graceful Shutdown과의 관계
- Health Check 운영 전략 및 테스트

---

## 2. Health Check의 필요성

애플리케이션이 실행 중이라는 사실만으로 정상적인 서비스 제공이 가능하다고 판단할 수는 없습니다.

다음과 같은 상황을 고려할 수 있습니다.

| 상황 | 프로세스 상태 | 서비스 상태 |
|---|---|---|
| 정상 실행 | Running | 정상 |
| Database 연결 실패 | Running | 일부 또는 전체 기능 장애 |
| 외부 API 장애 | Running | 외부 API에 의존하는 기능 장애 |
| 초기화 진행 중 | Running | 요청 처리 준비 전 |
| Event Loop 정체 | Running | HTTP 요청 응답 지연 또는 불가 |
| 애플리케이션 종료 진행 | Terminating | 신규 요청 처리 중단 필요 |
| 프로세스 종료 | Stopped | 서비스 불가 |

Health Check를 사용하면 단순한 프로세스 실행 여부를 넘어 서비스 상태를 판단하는 데 필요한 정보를 제공할 수 있습니다.

### 2.1. Health Check를 사용하지 않는 경우

```text
Client
   |
   v
Load Balancer
   |
   +------> Application A (Healthy)
   |
   +------> Application B (Unhealthy)
   |
   +------> Application C (Healthy)
```

Load Balancer가 Application B의 장애를 인식하지 못하면 해당 인스턴스로 요청을 계속 전달할 수 있습니다.

이 경우 일부 요청에서 Timeout 또는 오류가 발생할 수 있습니다.

### 2.2. Health Check를 사용하는 경우

```text
             Health Checker
                   |
           +-------+-------+
           |       |       |
           v       v       v
         App A   App B   App C
          UP     DOWN     UP
           |       |       |
           +-------+-------+
                   |
                   v
             Load Balancer
                   |
          +--------+--------+
          |                 |
          v                 v
        App A             App C
```

Health Checker가 애플리케이션 상태를 확인하고 해당 결과를 Load Balancer 또는 Orchestrator에 제공하면 비정상적인 인스턴스로의 요청 전달을 제한할 수 있습니다.

실제 동작은 사용하는 인프라의 Health Check 정책에 따라 달라집니다.

---

## 3. Health Check의 종류

Health Check는 확인 목적에 따라 Liveness, Readiness, Startup으로 구분할 수 있습니다.

이러한 구분은 특히 Kubernetes 환경에서 중요합니다.

| 구분 | Liveness | Readiness | Startup |
|---|---|---|---|
| 목적 | 애플리케이션 생존 확인 | 요청 처리 준비 상태 확인 | 초기화 완료 여부 확인 |
| 주요 질문 | 프로세스가 정상적으로 동작하고 있습니까? | 트래픽을 받을 수 있습니까? | 애플리케이션이 시작되었습니까? |
| 실패 시 Kubernetes 동작 | 실패 임계값 도달 시 컨테이너 재시작 | Service Endpoint에서 제외 | 실패 임계값 도달 시 컨테이너 재시작 |
| 외부 의존성 검사 | 일반적으로 지양 | 필요한 경우 포함 | 초기화 조건에 따라 구성 |
| 실행 시점 | 지속적인 검사 | 지속적인 검사 | 초기 시작 단계 |

### 3.1. Liveness Probe

Liveness Probe는 애플리케이션을 재시작해야 할 정도로 비정상적인 상태에 있는지 판단하기 위한 검사입니다.

예를 들어 애플리케이션의 Event Loop가 장시간 정체되어 HTTP 요청에 응답하지 못하는 상황을 감지할 수 있습니다.

```text
Kubernetes Kubelet
       |
       v
GET /health/live
       |
       v
NestJS Application
       |
       +---- HTTP Success ----> Alive
       |
       +---- HTTP Failure ----> Unhealthy
```

Kubernetes에서는 Liveness Probe가 연속으로 실패하여 `failureThreshold`에 도달하면 해당 컨테이너를 재시작합니다.

**Liveness Probe에는 Database나 외부 API처럼 애플리케이션 외부의 장애를 검사하는 작업을 일반적으로 포함하지 않는 것이 좋습니다.**

외부 서비스에 일시적인 장애가 발생했다는 이유만으로 정상적으로 동작 중인 모든 애플리케이션 인스턴스가 재시작되는 상황을 방지하기 위해서입니다.

### 3.2. Readiness Probe

Readiness Probe는 애플리케이션이 현재 요청을 처리할 준비가 되어 있는지 확인합니다.

다음과 같은 조건을 검사할 수 있습니다.

- 초기화 작업 완료 여부
- 필수 데이터베이스 연결 상태
- 필요한 내부 리소스 준비 상태
- 필수 외부 서비스 접근 가능 여부
- 애플리케이션의 신규 요청 수용 가능 여부

```text
Kubernetes Service
       |
       v
Readiness Probe
       |
       +---- Ready ----> Traffic Routing
       |
       +---- Not Ready ----> Remove from Endpoints
```

Kubernetes에서 Readiness Probe가 실패하면 Pod는 Ready 상태가 아니게 되며, 해당 Pod의 IP는 일치하는 Service Endpoint에서 트래픽 전달 대상에서 제외됩니다.

Readiness Probe 실패만으로 컨테이너가 재시작되지는 않습니다.

### 3.3. Startup Probe

Startup Probe는 애플리케이션이 초기화되었는지 확인하는 검사입니다.

애플리케이션이 시작될 때 다음과 같이 시간이 오래 걸리는 작업이 존재할 수 있습니다.

- 대용량 설정 파일 로딩
- 캐시 초기화
- 초기 데이터 로딩
- 외부 시스템과의 최초 연결
- 애플리케이션 구성 요소 초기화

Startup Probe를 사용하면 초기화가 완료되기 전에 Liveness Probe가 컨테이너를 재시작하는 문제를 방지할 수 있습니다.

```text
Container Start
      |
      v
Startup Probe
      |
      +---- Failed ----> Retry
      |
      +---- Success
              |
              v
      Enable Liveness
      Enable Readiness
```

Startup Probe를 구성한 경우 성공하기 전까지 Liveness Probe와 Readiness Probe는 실행되지 않습니다.

Startup Probe는 초기 시작 단계에서 사용하며 성공한 이후에는 지속적으로 실행되지 않습니다.

---

## 4. NestJS Terminus

NestJS는 Health Check를 구현하기 위한 `@nestjs/terminus` 패키지를 제공합니다.

Terminus는 애플리케이션의 여러 구성 요소에 대한 Health Indicator를 실행하고 결과를 하나의 Health Check 응답으로 집계할 수 있도록 지원합니다.

### 4.1. 주요 구성 요소

| 구성 요소 | 설명 |
|---|---|
| `TerminusModule` | Health Check 기능을 제공하는 모듈 |
| `HealthCheckService` | 여러 Health Indicator의 결과를 집계 |
| `@HealthCheck()` | Health Check Endpoint에 사용하는 데코레이터 |
| `HealthIndicatorService` | Custom Health Indicator 작성 지원 |
| `FetchHealthIndicator` | 외부 HTTP Endpoint 상태 검사 |
| `TypeOrmHealthIndicator` | TypeORM Database 연결 상태 검사 |
| `MemoryHealthIndicator` | 메모리 사용량 검사 |
| `DiskHealthIndicator` | 디스크 사용량 검사 |

### 4.2. 동작 구조

```text
Health Check Request
         |
         v
  HealthController
         |
         v
 HealthCheckService
         |
         +-------------------+
         |                   |
         v                   v
 Database Indicator    Memory Indicator
         |                   |
         v                   v
    DB Status          Memory Status
         |                   |
         +---------+---------+
                   |
                   v
           Aggregated Result
                   |
                   v
             HTTP Response
```

`HealthCheckService`는 등록된 Health Indicator의 결과를 수집하여 애플리케이션 상태를 표현하는 응답을 생성합니다.

하나 이상의 필수 Health Indicator가 실패하면 전체 Health Check가 실패할 수 있습니다.

---

## 5. Terminus 설치 및 기본 구성

### 5.1. 패키지 설치

```bash
npm install @nestjs/terminus
```

Terminus는 별도 패키지이므로 필요한 프로젝트에 직접 설치해야 합니다.

Database 또는 외부 시스템의 Health Indicator를 사용하는 경우 해당 기술에 필요한 추가 의존성이 필요할 수 있습니다.

### 5.2. 디렉터리 구조

다음은 Health Check 기능을 별도 모듈로 구성하는 예제입니다.

```text
src/
├── health/
│   ├── health.module.ts
│   ├── health.controller.ts
│   └── indicators/
│       └── custom.health.ts
│
├── app.module.ts
└── main.ts
```

### 5.3. HealthModule 작성

`health/health.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

`TerminusModule`은 Health Check를 구현하는 데 필요한 Provider들을 제공합니다.

### 5.4. AppModule 등록

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
```

`HealthModule`을 애플리케이션에 등록하면 Health Check Endpoint를 제공할 수 있습니다.

---

## 6. 기본 Health Check 구현

Liveness와 Readiness를 각각 별도의 Endpoint로 구성할 수 있습니다.

### 6.1. HealthController

`health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';

import {
  HealthCheck,
  HealthCheckService,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
  ) {}

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([]);
  }
}
```

이 예제는 Endpoint 구성을 설명하기 위한 가장 단순한 형태입니다.

`health.check([])`는 별도의 Health Indicator를 실행하지 않습니다.

HTTP 요청이 처리되어 응답을 반환했다는 사실은 확인할 수 있지만, Database 연결이나 실제 비즈니스 기능의 정상 동작 여부까지 보장하지는 않습니다.

따라서 Readiness에는 애플리케이션의 특성에 맞는 검사를 추가해야 합니다.

### 6.2. Liveness 요청

```bash
curl -i http://localhost:3000/health/live
```

정상적인 경우 HTTP `200 OK`가 반환됩니다.

### 6.3. Readiness 요청

```bash
curl -i http://localhost:3000/health/ready
```

현재 예제에서는 별도의 의존성을 검사하지 않으므로 정상적인 요청 처리 자체를 확인합니다.

실제 운영 환경에서는 Readiness Endpoint에 필요한 Health Indicator를 등록해야 합니다.

---

## 7. Health Check 응답 구조

Terminus는 Health Indicator의 결과를 JSON 형식으로 반환합니다.

예를 들어 Database Health Indicator가 정상적으로 실행되면 다음과 같은 응답을 반환할 수 있습니다.

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "responseTime": 12
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up",
      "responseTime": 12
    }
  }
}
```

### 7.1. 응답 필드

| 필드 | 설명 |
|---|---|
| `status` | 전체 Health Check 상태 |
| `info` | 정상 또는 Degraded 상태의 Indicator 정보 |
| `error` | 실패한 Indicator 정보 |
| `details` | 모든 Indicator의 결과 |

Indicator에 포함되는 세부 필드는 사용하는 Indicator에 따라 달라질 수 있습니다.

### 7.2. HTTP Status Code

대표적인 응답은 다음과 같습니다.

| HTTP Status | 의미 |
|---|---|
| `200 OK` | Health Check 성공 |
| `503 Service Unavailable` | Health Indicator 실패로 서비스 상태가 비정상적임 |
| `500 Internal Server Error` | Health Check 실행 자체에서 처리되지 않은 오류 등이 발생 |

최신 Terminus에서는 `degraded` 상태를 표현할 수도 있습니다.

Degraded 상태만 존재하고 실패한 Indicator가 없다면 전체 상태는 `degraded`이며 HTTP 응답은 `200`을 유지할 수 있습니다.

**Kubernetes의 HTTP Probe는 일반적으로 200 이상 400 미만의 Status Code를 성공으로 판단합니다.**

따라서 Kubernetes에서는 JSON의 `status` 값보다 HTTP Status Code가 Probe 성공 여부에 직접적인 영향을 미칩니다.

---

## 8. Database Health Check

데이터베이스는 많은 애플리케이션에서 핵심적인 외부 의존성입니다.

Database 연결이 실패하면 애플리케이션 프로세스가 실행 중이어도 요청 처리가 불가능할 수 있습니다.

Terminus는 다양한 ORM 및 Database 연결 상태를 확인하는 Health Indicator를 제공합니다.

### 8.1. 지원하는 Database Indicator

| Indicator | 대상 |
|---|---|
| `TypeOrmHealthIndicator` | TypeORM |
| `MongooseHealthIndicator` | Mongoose |
| `SequelizeHealthIndicator` | Sequelize |
| `MikroOrmHealthIndicator` | MikroORM |
| `PrismaHealthIndicator` | Prisma |

각 Indicator를 사용하려면 해당 ORM과 NestJS 연동 또는 Client 패키지가 설치되어 있어야 합니다.

### 8.2. TypeORM Health Check

다음 예제는 `@nestjs/typeorm`과 `typeorm`이 설치되고, TypeORM Connection이 설정되어 있다고 가정합니다.

```bash
npm install @nestjs/typeorm typeorm
```

Database Driver는 사용하는 데이터베이스에 맞게 별도로 설치해야 합니다.

`health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';

import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () =>
        this.database
          .pingCheck('database')
          .withTimeout('1s'),
    ]);
  }
}
```

`TypeOrmHealthIndicator`는 Database에 간단한 쿼리를 실행하여 응답 여부를 확인합니다.

일반적인 SQL Database에서는 `SELECT 1`과 같은 쿼리를 사용합니다.

`withTimeout('1s')`는 해당 검사에 1초의 Timeout을 적용하는 예제입니다.

### 8.3. Database 장애 시 동작

```text
GET /health/ready
        |
        v
TypeOrmHealthIndicator
        |
        v
Database Connection
        |
        +---- Success ----> Healthy
        |
        +---- Failure ----> Unhealthy
```

Database에 연결할 수 없다면 Readiness Check가 실패하여 HTTP `503`을 반환할 수 있습니다.

Kubernetes에서 해당 Endpoint를 Readiness Probe로 사용한다면 Pod가 Service Endpoint에서 제외될 수 있습니다.

단, 모든 애플리케이션에서 Database 장애가 전체 서비스 중단을 의미하는 것은 아닙니다.

Database와 무관하게 처리할 수 있는 기능이 있다면 서비스의 책임에 맞게 Readiness 조건을 설계해야 합니다.

---

## 9. External API Health Check

NestJS 애플리케이션이 외부 API에 의존하는 경우 해당 서비스의 응답 상태를 검사할 수 있습니다.

최신 Terminus에서는 `FetchHealthIndicator`를 사용할 수 있습니다.

### 9.1. FetchHealthIndicator

`FetchHealthIndicator`는 Node.js의 Native `fetch()` 기능을 이용하여 HTTP Endpoint의 상태를 확인합니다.

`health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';

import {
  FetchHealthIndicator,
  HealthCheck,
  HealthCheckService,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: FetchHealthIndicator,
  ) {}

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () =>
        this.http.pingCheck(
          'payment-api',
          'https://payments.example.com/health',
        ),
    ]);
  }
}
```

위 URL은 설명을 위한 예시 주소이며 실제로 존재하는 서비스라고 가정하지 않습니다.

`pingCheck()`는 대상 Endpoint가 정상적으로 응답하는지 확인합니다.

기본적으로 성공적인 `2xx` 응답을 정상 상태로 판단합니다.

### 9.2. 외부 API 검사 시 주의사항

외부 API를 Health Check에 포함할 때는 다음 사항을 고려해야 합니다.

- API 호출 횟수
- 요청 Timeout
- 외부 API의 Rate Limit
- 외부 서비스 장애가 애플리케이션 전체에 미치는 영향
- Health Check 자체의 네트워크 비용
- 외부 의존성 장애로 인한 연쇄적인 트래픽 차단

특히 모든 Pod가 짧은 간격으로 외부 API를 호출하면 불필요한 요청이 대량으로 발생할 수 있습니다.

또한 선택적으로 사용하는 외부 API에 장애가 발생했다고 해서 전체 애플리케이션을 Not Ready 상태로 전환하는 것은 적절하지 않을 수 있습니다.

따라서 외부 API가 실제로 서비스의 핵심 기능에 필수적인 경우에만 Readiness에 포함하는 것이 좋습니다.

### 9.3. Deprecated API

이전 Terminus 버전에서는 `HttpHealthIndicator`를 사용하는 예제가 많습니다.

```typescript
import { HttpHealthIndicator } from '@nestjs/terminus';
```

최신 Terminus에서는 `FetchHealthIndicator`가 이를 대체하며, `HttpHealthIndicator`는 Deprecated API입니다.

`FetchHealthIndicator`는 Native `fetch()`를 사용하므로 기존 `HttpHealthIndicator`와 달리 Health Check만을 위해 `@nestjs/axios` 및 `axios`를 추가할 필요가 없습니다.

프로젝트의 Terminus 버전에 맞는 API를 사용해야 합니다.

---

## 10. Memory Health Check

애플리케이션의 메모리 사용량을 검사하여 설정한 임계값을 초과했는지 확인할 수 있습니다.

Terminus는 `MemoryHealthIndicator`를 제공합니다.

### 10.1. Heap Memory 검사

```typescript
import { Controller, Get } from '@nestjs/common';

import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get('memory')
  @HealthCheck()
  checkMemory() {
    return this.health.check([
      () =>
        this.memory.checkHeap(
          'memory_heap',
          '512mb',
        ),
    ]);
  }
}
```

`checkHeap()`은 Node.js의 V8 Heap 사용량을 지정한 임계값과 비교합니다.

### 10.2. RSS 검사

```typescript
@Get('memory-rss')
@HealthCheck()
checkMemoryRSS() {
  return this.health.check([
    () =>
      this.memory.checkRSS(
        'memory_rss',
        '1gb',
      ),
  ]);
}
```

RSS(Resident Set Size)는 프로세스가 사용하는 물리 메모리 영역의 크기를 나타내는 지표입니다.

### 10.3. Heap과 RSS 비교

| 구분 | Heap | RSS |
|---|---|---|
| 의미 | V8 JavaScript Heap 사용량 | 프로세스에 할당된 물리 메모리 |
| 주요 용도 | JavaScript 객체 메모리 사용량 관찰 | 전체 프로세스 메모리 사용량 관찰 |
| Native Memory 포함 | 직접 포함하지 않음 | 포함 |
| Terminus API | `checkHeap()` | `checkRSS()` |

Memory Health Check의 임계값은 임의의 숫자로 설정하기보다 실제 애플리케이션의 메모리 특성과 운영 환경의 리소스 제한을 고려하여 결정해야 합니다.

특히 메모리 임계값 초과를 곧바로 Liveness 실패로 연결하면 반복적인 컨테이너 재시작이 발생할 수 있습니다.

Memory Indicator는 별도 진단 Endpoint나 Monitoring에 활용하고, 재시작 조건은 신중하게 설계하는 것이 좋습니다.

---

## 11. Disk Health Check

Disk Health Check는 지정한 경로가 위치한 파일 시스템의 사용량을 확인합니다.

Terminus는 `DiskHealthIndicator`를 제공합니다.

```typescript
import { Controller, Get } from '@nestjs/common';

import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get('disk')
  @HealthCheck()
  checkDisk() {
    return this.health.check([
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}
```

`thresholdPercent: 0.9`는 파일 시스템 사용률이 90%를 넘지 않아야 한다는 조건을 나타냅니다.

Disk Health Check는 다음과 같은 애플리케이션에서 유용할 수 있습니다.

- 로컬 파일 업로드 저장소 사용
- 임시 파일 생성
- 파일 기반 Cache
- 대용량 로그 파일 기록
- 로컬 디스크를 사용하는 Batch Processing

단, Kubernetes에서 임시 파일 시스템이나 PersistentVolume을 사용하는 경우 실제 검사 대상 경로가 애플리케이션이 의존하는 저장 공간과 일치하는지 확인해야 합니다.

---

## 12. Custom Health Indicator

Terminus에서 제공하는 기본 Health Indicator만으로는 모든 애플리케이션의 상태를 검사할 수 없습니다.

예를 들어 Redis Connection, Queue Consumer 또는 애플리케이션 내부 상태를 확인하려면 Custom Health Indicator를 구현할 수 있습니다.

### 12.1. Custom Indicator의 필요성

다음과 같은 상태를 검사할 수 있습니다.

- Redis 연결 가능 여부
- Message Broker 연결 상태
- Queue Consumer 초기화 완료 여부
- 내부 Worker 실행 상태
- 데이터 동기화 준비 상태
- 필수 리소스 초기화 완료 여부

### 12.2. Custom Indicator 구현

다음 예제에서는 애플리케이션의 내부 준비 상태를 검사합니다.

`health/indicators/custom.health.ts`

```typescript
import { Injectable } from '@nestjs/common';

import {
  HealthIndicatorService,
} from '@nestjs/terminus';

@Injectable()
export class CustomHealthIndicator {
  private ready = false;

  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    if (!this.ready) {
      return indicator.down({
        message: 'Application is not ready',
      });
    }

    return indicator.up();
  }
}
```

`HealthIndicatorService`는 각 검사에 대해 Healthy 또는 Unhealthy 결과를 생성하도록 지원합니다.

- `check(key)`: Indicator 결과를 생성하기 위한 객체를 반환합니다.
- `up()`: 정상 상태를 표현합니다.
- `down()`: 비정상 상태를 표현합니다.

이 예제의 `ready` 값은 기본적으로 `false`이며 별도의 초기화 로직에서 `setReady(true)`가 호출되어야 합니다.

따라서 실제 애플리케이션에서는 리소스 초기화와 종료 상태에 맞게 값을 변경하는 로직을 추가해야 합니다.

### 12.3. Provider 등록

`health/health.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { CustomHealthIndicator } from './indicators/custom.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [CustomHealthIndicator],
})
export class HealthModule {}
```

### 12.4. HealthController에서 사용

```typescript
import { Controller, Get } from '@nestjs/common';

import {
  HealthCheck,
  HealthCheckService,
} from '@nestjs/terminus';

import { CustomHealthIndicator } from './indicators/custom.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly custom: CustomHealthIndicator,
  ) {}

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.custom.isHealthy('application'),
    ]);
  }
}
```

Custom Health Indicator를 이용하면 애플리케이션의 도메인 특성에 맞는 상태 검사를 구현할 수 있습니다.

### 12.5. 비동기 검사와 예외 처리

Database, Redis, Queue 등 외부 리소스의 상태를 검사하는 작업은 비동기적으로 실행되는 경우가 많습니다.

최신 Terminus는 이러한 작업을 위한 `HealthIndicatorService`와 `attempt()` 기반 API를 제공합니다.

비동기 검사에서는 다음과 같은 사항을 고려해야 합니다.

- 실패한 작업을 `down` 상태로 표현해야 합니다.
- 검사 작업에 Timeout을 적용해야 합니다.
- Timeout 이후에도 불필요한 작업이 계속 실행되지 않도록 가능한 경우 취소 신호를 전달해야 합니다.
- 예상 가능한 외부 서비스 오류와 코드 자체의 예외를 구분해야 합니다.

최신 Terminus에서는 `attempt()`를 이용해 검사 과정에서 발생한 예외를 비정상적인 Health Indicator 결과로 변환할 수 있습니다.

반면 `up()`, `down()`, `degraded()` 기반 Indicator에서 처리되지 않은 예외가 발생하면 Health Check 전체가 HTTP `500`으로 종료될 수 있습니다.

---

## 13. Health Check와 Degraded 상태

애플리케이션에 문제가 발생했다고 해서 항상 전체 서비스를 중단해야 하는 것은 아닙니다.

예를 들어 Redis Cache가 중단되었지만 Database를 이용하여 요청을 정상적으로 처리할 수 있는 서비스가 있다고 가정합니다.

이 경우 Cache 장애는 성능 저하를 유발하지만 서비스 전체의 요청 처리 불가 상태를 의미하지 않을 수 있습니다.

최신 Terminus에서는 이러한 상황을 `degraded` 상태로 표현할 수 있습니다.

### 13.1. 상태 구분

| 상태 | 의미 | 일반적인 HTTP 응답 |
|---|---|---|
| `up` | 정상적으로 동작 | 200 |
| `degraded` | 일부 기능 또는 성능이 저하되었지만 서비스 가능 | 200 |
| `down` | 필수 기능에 장애 발생 | 503 |

### 13.2. Degraded Indicator 예제

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class CacheHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  checkCache(connected: boolean) {
    const indicator = this.healthIndicatorService.check('cache');

    if (!connected) {
      return indicator.degraded(
        'Cache unavailable, using database fallback',
      );
    }

    return indicator.up();
  }
}
```

이 코드는 Cache 연결 상태가 외부에서 전달된다고 가정하는 예제입니다.

실제 환경에서는 Redis Client 등의 연결 상태를 확인하는 로직과 결합해야 합니다.

### 13.3. Degraded 응답

```json
{
  "status": "degraded",
  "info": {
    "cache": {
      "status": "degraded",
      "message": "Cache unavailable, using database fallback"
    }
  },
  "error": {},
  "details": {
    "cache": {
      "status": "degraded",
      "message": "Cache unavailable, using database fallback"
    }
  }
}
```

이 경우 HTTP Status Code는 `200`을 유지할 수 있습니다.

따라서 Kubernetes는 정상적으로 트래픽을 전달하면서 Monitoring System은 서비스 품질 저하를 인식하도록 구성할 수 있습니다.

---

## 14. Kubernetes Health Probe 연동

Kubernetes에서는 Liveness, Readiness, Startup Probe를 이용하여 Pod 내부 컨테이너의 상태를 확인합니다.

NestJS에서 구현한 HTTP Health Check Endpoint를 Kubernetes Probe와 연결할 수 있습니다.

### 14.1. Deployment 예제

다음 예제는 NestJS 애플리케이션이 `8080` 포트에서 실행되고 다음 Endpoint를 제공한다고 가정합니다.

- `/health/live`
- `/health/ready`

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
      containers:
        - name: nestjs-api
          image: nestjs-api:1.0.0

          ports:
            - containerPort: 8080

          startupProbe:
            httpGet:
              path: /health/live
              port: 8080

            periodSeconds: 5
            failureThreshold: 12

          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080

            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080

            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 3
            successThreshold: 1
```

위 YAML은 Probe 구성을 설명하기 위한 예제이며 실제 운영 환경의 리소스 요구량이나 서비스 특성에 맞게 조정해야 합니다.

### 14.2. Startup Probe

```yaml
startupProbe:
  httpGet:
    path: /health/live
    port: 8080

  periodSeconds: 5
  failureThreshold: 12
```

이 예제에서는 5초 간격의 검사에서 최대 12회 연속 실패를 허용하도록 설정합니다.

따라서 약 60초에 해당하는 시작 실패 허용 구간을 구성한 예제입니다.

단, 실제 재시작 시점은 Probe 실행 및 응답 시간 등의 영향을 받을 수 있습니다.

### 14.3. Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080

  periodSeconds: 10
  timeoutSeconds: 2
  failureThreshold: 3
```

주요 옵션은 다음과 같습니다.

| 옵션 | 설명 |
|---|---|
| `httpGet` | HTTP GET 요청으로 검사 |
| `path` | 검사할 Endpoint |
| `port` | 컨테이너 내부 포트 |
| `periodSeconds` | 검사 주기 |
| `timeoutSeconds` | 단일 검사 Timeout |
| `failureThreshold` | 비정상 판정까지 허용하는 연속 실패 횟수 |

Liveness Probe가 실패 임계값에 도달하면 kubelet은 해당 컨테이너를 재시작합니다.

### 14.4. Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080

  periodSeconds: 5
  timeoutSeconds: 2
  failureThreshold: 3
  successThreshold: 1
```

`successThreshold`는 실패 상태에서 정상 상태로 복귀하기 위해 필요한 연속 성공 횟수를 지정합니다.

Readiness Probe가 실패하면 Kubernetes는 Pod를 Ready 상태에서 제외합니다.

Service를 통해 해당 Pod로 전달되는 신규 트래픽이 제한됩니다.

다만 이미 처리 중인 요청이나 직접 Pod IP로 전달되는 요청까지 Readiness Probe가 강제로 중단하는 것은 아닙니다.

---

## 15. Health Probe 동작 흐름

다음은 Kubernetes 환경에서 애플리케이션이 시작되고 요청을 처리하는 과정입니다.

```text
Pod Created
     |
     v
Container Started
     |
     v
Startup Probe
     |
     +---- Failure ----> Retry
     |
     v
Startup Success
     |
     +-------------------+
     |                   |
     v                   v
Liveness Probe     Readiness Probe
     |                   |
     v                   v
Process Healthy?   Ready for Traffic?
     |                   |
     v                   v
Continue Running   Service Endpoint
```

운영 중에는 Liveness와 Readiness가 각각 설정된 주기에 따라 실행됩니다.

### 15.1. Readiness 실패

```text
Database Failure
      |
      v
Readiness Failed
      |
      v
Pod Not Ready
      |
      v
Remove from Service Endpoints
      |
      v
Database Recovery
      |
      v
Readiness Success
      |
      v
Pod Ready
      |
      v
Traffic Resumed
```

Database 장애가 발생하더라도 Liveness Probe가 정상이라면 컨테이너를 재시작하지 않고 Readiness 상태만 변경할 수 있습니다.

### 15.2. Liveness 실패

```text
Application Unresponsive
         |
         v
Liveness Failure
         |
         v
Failure Threshold Reached
         |
         v
Kubelet Restarts Container
         |
         v
Application Startup
```

Liveness Probe는 재시작을 통해 복구할 수 있는 애플리케이션 내부 장애를 감지하는 데 활용해야 합니다.

---

## 16. Health Check와 Graceful Shutdown

애플리케이션이 종료되는 과정에서도 Health Check는 중요한 역할을 합니다.

특히 Kubernetes 환경에서 Pod가 종료될 때 새로운 요청의 유입을 줄이고 기존 요청을 처리할 수 있도록 종료 순서를 설계해야 합니다.

### 16.1. Graceful Shutdown의 목적

애플리케이션이 즉시 종료되면 다음과 같은 문제가 발생할 수 있습니다.

- 처리 중인 HTTP 요청 중단
- Database Transaction 중단
- WebSocket Connection 종료
- 메시지 처리 작업 중단
- 클라이언트 연결 오류

Graceful Shutdown은 종료 신호를 받은 애플리케이션이 리소스를 정리하고 가능한 범위에서 기존 작업을 완료한 후 종료하도록 구성하는 방식입니다.

### 16.2. NestJS Shutdown Hook 활성화

`main.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  await app.listen(3000);
}

bootstrap();
```

`enableShutdownHooks()`는 NestJS가 종료 신호를 받아 관련 Lifecycle Hook을 실행할 수 있도록 활성화합니다.

Terminus에서도 Shutdown Lifecycle을 활용하므로 해당 설정을 사용하는 것이 좋습니다.

### 16.3. 종료 시 Health Check 상태

애플리케이션이 종료 단계에 진입한 경우 Terminus는 종료 상태를 나타내는 Health Check 응답을 제공할 수 있습니다.

다만 실제 응답 가능 여부는 HTTP Server가 연결을 수락하는지, 종료 작업이 진행 중인지에 따라 달라집니다.

Kubernetes에서의 Graceful Shutdown은 Probe만으로 보장되지 않습니다.

`terminationGracePeriodSeconds`, SIGTERM 처리, Endpoint 갱신, 연결 종료 및 요청 Drain 전략 등을 함께 설계해야 합니다.

자세한 내용은 `graceful-shutdown.md`에서 다룹니다.

---

## 17. Health Check의 성능 고려사항

Health Check는 일반적인 비즈니스 API와 달리 짧은 주기로 반복 호출될 수 있습니다.

예를 들어 Kubernetes에서 다음과 같이 구성했다고 가정합니다.

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080

  periodSeconds: 5
```

설정된 기본 주기에 따라 하나의 Pod에 반복적인 Health Check 요청이 발생합니다.

Pod 수가 증가하면 전체 Health Check 호출량도 증가합니다.

### 17.1. 검사 비용 최소화

Health Check에서는 다음과 같은 작업을 지양하는 것이 좋습니다.

- 대량 데이터 조회
- 복잡한 Join Query
- 전체 테이블 Scan
- 외부 API의 고비용 호출
- 대량 파일 읽기
- CPU 사용량이 높은 계산
- 불필요한 네트워크 요청

Database 검사에는 일반적으로 간단한 연결 확인 쿼리를 사용하는 것이 적합합니다.

### 17.2. Timeout 설정

Health Check가 오래 실행되면 Probe Timeout이 발생할 수 있습니다.

따라서 Health Indicator의 Timeout과 Kubernetes Probe의 `timeoutSeconds`를 함께 고려해야 합니다.

예를 들어 외부 의존성 검사에 1초의 Timeout을 설정하고 Kubernetes Probe에는 이를 처리할 수 있는 충분한 응답 시간을 부여할 수 있습니다.

다만 여러 검사가 동시에 실행되는 경우 응답 시간과 Timeout의 관계가 달라질 수 있으므로 실제 환경에서 검증해야 합니다.

### 17.3. False Positive와 False Negative

Health Check 설계에서는 다음 두 가지 오류를 구분해야 합니다.

| 구분 | 의미 |
|---|---|
| False Positive | 비정상 상태를 정상으로 판단 |
| False Negative | 정상 상태를 비정상으로 판단 |

예를 들어 실제 요청을 처리하지 못하는데 단순히 프로세스가 실행 중이라는 이유로 Ready 상태를 반환한다면 False Positive가 발생할 수 있습니다.

반대로 일시적인 외부 API 응답 지연을 전체 서비스 장애로 판단한다면 False Negative가 발생할 수 있습니다.

검사 대상과 임계값은 실제 서비스 요구사항을 기준으로 결정해야 합니다.

---

## 18. Health Check Endpoint 보안

Health Check Endpoint는 Load Balancer, Kubernetes 및 Monitoring System에서 접근할 수 있어야 합니다.

그러나 모든 상태 정보를 외부 사용자에게 공개할 필요는 없습니다.

### 18.1. 민감한 정보 노출 방지

Health Check 응답에 다음과 같은 정보를 포함하지 않도록 주의해야 합니다.

- Database Password
- API Key
- Access Token
- 내부 서버의 상세 인증 정보
- Stack Trace
- 민감한 시스템 구성 정보

### 18.2. 접근 범위 제한

가능하다면 Health Check Endpoint를 내부 네트워크에서만 접근하도록 구성할 수 있습니다.

Kubernetes 환경에서는 Service, Ingress, NetworkPolicy 등을 이용해 접근 범위를 관리할 수 있습니다.

다만 Kubernetes Probe는 kubelet이 직접 수행하므로 인증 Middleware나 전역 Guard가 Probe 요청을 차단하지 않도록 구성해야 합니다.

인증을 생략하는 Endpoint를 구성하더라도 내부 상태를 과도하게 노출하지 않는 것이 중요합니다.

---

## 19. Health Check 테스트

Health Check는 정상 상태뿐만 아니라 장애 상태에서도 의도한 응답을 반환하는지 검증해야 합니다.

### 19.1. 정상 상태 테스트

```bash
curl -i http://localhost:3000/health/ready
```

정상적인 경우 HTTP `200`을 반환해야 합니다.

### 19.2. Database 장애 테스트

Database가 필수 의존성인 Readiness 구성에서는 Database 연결을 사용할 수 없도록 만든 후 HTTP `503`이 반환되는지 확인할 수 있습니다.

실제 운영 Database를 의도적으로 중단하지 말고 테스트 환경에서 수행해야 합니다.

### 19.3. E2E 테스트 예제

다음 예제는 `@nestjs/testing`, `supertest` 및 관련 테스트 환경이 구성되어 있다고 가정합니다.

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Health Check', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live returns 200', async () => {
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);
  });
});
```

이 테스트는 Liveness Endpoint가 정상적으로 응답하는지 확인합니다.

Readiness의 장애 테스트에서는 관련 Health Indicator를 Mocking하거나 의존성을 제어하여 장애 상황을 재현할 수 있습니다.

### 19.4. 장애 시나리오

운영 환경을 고려한 테스트에서는 다음과 같은 시나리오를 검증하는 것이 좋습니다.

| 시나리오 | 기대 결과 |
|---|---|
| 정상 실행 | Liveness 및 Readiness 성공 |
| Database 연결 실패 | 필요한 경우 Readiness 실패 |
| 선택적 Cache 장애 | 서비스 가능 시 Degraded 또는 Ready 유지 |
| 애플리케이션 초기화 중 | Startup 또는 Readiness 미통과 |
| 애플리케이션 응답 불가 | Liveness 실패 |
| 종료 진행 | 신규 요청 수용 제한 및 리소스 정리 |
| 외부 API Timeout | 서비스 의존성 정책에 따라 상태 결정 |

---

## 20. 운영 환경의 Health Check 설계 전략

Health Check는 단순히 여러 Indicator를 추가하는 것보다 어떤 장애를 어떻게 처리할 것인지 결정하는 것이 중요합니다.

### 20.1. Liveness는 단순하게 유지

Liveness는 애플리케이션 자체의 생존과 응답 가능 여부를 확인하는 용도로 구성하는 것이 좋습니다.

Database, Redis, 외부 API 등을 Liveness에 모두 포함하면 외부 서비스 장애가 애플리케이션의 반복적인 재시작으로 이어질 수 있습니다.

### 20.2. Readiness는 필수 의존성 중심으로 구성

Readiness는 애플리케이션이 실제 요청을 처리하는 데 반드시 필요한 조건을 중심으로 구성합니다.

모든 외부 의존성을 검사해야 하는 것은 아닙니다.

예를 들어 Cache 장애가 발생해도 Database Fallback으로 서비스할 수 있다면 Cache 연결 실패를 Readiness 실패로 처리하지 않을 수 있습니다.

### 20.3. Startup은 초기화 특성을 고려

시작 과정이 오래 걸리는 애플리케이션에서는 Startup Probe를 사용하여 초기화에 필요한 시간을 확보할 수 있습니다.

다만 초기화 실패를 무조건 오랫동안 기다리는 것보다 오류 원인을 확인할 수 있도록 Logging과 Timeout을 함께 설계해야 합니다.

### 20.4. Monitoring과 Health Check 구분

Health Check는 현재 서비스 가능 여부를 판단하기 위한 도구입니다.

Monitoring은 서비스의 상태와 성능을 지속적으로 관찰하기 위한 도구입니다.

| 구분 | Health Check | Monitoring |
|---|---|---|
| 목적 | 서비스 상태 판단 | 상태 및 성능 관찰 |
| 결과 | Healthy, Unhealthy, Degraded | Metrics, Logs, Traces |
| 주요 사용처 | Kubernetes, Load Balancer | Prometheus, Grafana 등 |
| 검사 방식 | 주기적인 상태 확인 | 지속적인 데이터 수집 및 분석 |

Health Check만으로 모든 장애나 성능 문제를 분석할 수는 없습니다.

실제 운영 환경에서는 Health Check와 Metrics, Logging, Distributed Tracing을 함께 활용하는 것이 좋습니다.

---

## 21. 관련 문서

| 문서 | 설명 |
|---|---|
| `production-build.md` | 운영 환경에서 실행할 애플리케이션 빌드 |
| `environment-configuration.md` | Health Check 설정값 및 환경 변수 관리 |
| `graceful-shutdown.md` | 애플리케이션 종료와 트래픽 정리 |
| `performance.md` | 애플리케이션 성능 및 리소스 관리 |
| `../03-techniques/database.md` | Database 연결 및 관리 |
| `../03-techniques/logging.md` | 애플리케이션 Logging |
| `../06-testing/e2e-testing.md` | Health Check Endpoint의 E2E 테스트 |

---

## 22. 정리

Health Check는 NestJS 애플리케이션이 정상적으로 동작하고 있으며 요청을 처리할 준비가 되어 있는지 확인하기 위한 운영 기능입니다.

주요 사항은 다음과 같습니다.

1. **Health Check의 목적**: 애플리케이션과 필수 의존성의 상태를 확인합니다.
2. **Liveness Probe**: 애플리케이션 자체가 응답 가능한 상태인지 검사합니다.
3. **Readiness Probe**: 새로운 요청을 처리할 준비가 되었는지 확인합니다.
4. **Startup Probe**: 애플리케이션의 초기화 완료 여부를 검사합니다.
5. **Terminus**: NestJS에서 Health Check Endpoint와 Health Indicator를 구현할 수 있도록 지원합니다.
6. **Database 및 외부 서비스 검사**: 필수 의존성의 응답 상태를 확인할 수 있습니다.
7. **Custom Health Indicator**: 애플리케이션 특성에 맞는 상태 검사를 작성할 수 있습니다.
8. **Kubernetes Probe 연동**: 비정상적인 인스턴스를 재시작하거나 Service Endpoint에서 제외하도록 구성할 수 있습니다.
9. **Graceful Shutdown 연계**: 애플리케이션 종료 과정에서 신규 요청 수용과 리소스 정리를 함께 고려해야 합니다.
10. **운영 전략**: 검사 비용, Timeout, 장애 전파 및 재시작 정책을 고려해야 합니다.

Health Check의 핵심은 애플리케이션 내부의 모든 구성 요소를 검사하는 것이 아니라 서비스가 정상적으로 요청을 처리할 수 있는지 판단하는 기준을 명확히 정의하는 데 있습니다.

Liveness와 Readiness의 책임을 구분하고 Kubernetes의 재시작 및 트래픽 제어 정책과 연계하면 애플리케이션의 안정성과 가용성을 높이는 데 도움이 됩니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - Health Checks (Terminus)](https://docs.nestjs.com/recipes/terminus)
  - Terminus 설치, Health Indicator, Custom Health Check 및 운영 환경 구성 방법을 설명합니다.

- [NestJS - Deployment](https://docs.nestjs.com/deployment)
  - NestJS 애플리케이션의 운영 환경 배포와 Health Check 관련 사항을 설명합니다.

- [NestJS - Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
  - Application Lifecycle, Shutdown Hook 및 애플리케이션 종료 이벤트를 설명합니다.

- [NestJS - Database](https://docs.nestjs.com/techniques/database)
  - Database 연결 및 ORM 통합 방법을 설명합니다.

- [NestJS - Testing](https://docs.nestjs.com/fundamentals/testing)
  - Unit Test 및 E2E Test 구성 방법을 설명합니다.

- [NestJS - Migration Guide](https://docs.nestjs.com/migration-guide)
  - NestJS 및 Terminus의 주요 버전 변경 사항을 확인할 수 있습니다.

### Kubernetes 공식 문서

- [Kubernetes - Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
  - 세 가지 Probe의 역할과 동작 차이를 설명합니다.

- [Kubernetes - Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
  - Deployment 및 Pod에서 Probe를 설정하는 방법을 설명합니다.

- [Kubernetes - Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
  - Pod 상태와 컨테이너 생명주기를 설명합니다.

- [Kubernetes - Services](https://kubernetes.io/docs/concepts/services-networking/service/)
  - Service Endpoint와 트래픽 전달 구조를 설명합니다.

- [Kubernetes - Pod Termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)
  - Pod 종료 과정과 Graceful Termination을 설명합니다.

### Node.js 및 운영 환경

- [Node.js - Process](https://nodejs.org/api/process.html)
  - Process 상태와 Memory Usage 관련 API를 설명합니다.

- [Node.js - Diagnostics](https://nodejs.org/en/learn/diagnostics)
  - Node.js 애플리케이션의 성능 문제와 장애 분석 방법을 설명합니다.

### 관련 프로젝트

- [NestJS Terminus - GitHub](https://github.com/nestjs/terminus)
  - Terminus의 Source Code와 구현 예제를 확인할 수 있습니다.

- [Prometheus - Documentation](https://prometheus.io/docs/introduction/overview/)
  - Metrics 수집과 Monitoring 개념을 설명합니다.

- [Grafana - Documentation](https://grafana.com/docs/grafana/latest/)
  - 애플리케이션 및 인프라 Metrics를 시각화하는 방법을 설명합니다.