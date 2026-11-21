# Performance

## 1. 개요

Performance는 NestJS 애플리케이션이 제한된 시스템 리소스를 이용하여 요청을 얼마나 빠르고 안정적으로 처리할 수 있는지를 나타냅니다.

애플리케이션 성능은 단순히 초당 처리할 수 있는 요청 수뿐만 아니라 응답 지연 시간, 동시 처리 능력, CPU 및 Memory 사용량, 외부 시스템의 처리 성능 등 다양한 요소에 의해 결정됩니다.

NestJS는 Node.js 기반 프레임워크이며, HTTP Adapter, Dependency Injection, Middleware, Guard, Pipe, Interceptor 등의 추상화를 제공합니다.

이러한 구조는 애플리케이션의 유지보수성과 확장성을 높이지만, 실제 성능은 프레임워크 설정과 애플리케이션의 비즈니스 로직, 데이터 접근 방식 및 실행 환경에 따라 달라집니다.

본 문서에서는 다음 항목을 다룹니다.

- Performance의 주요 지표
- Node.js Event Loop와 비동기 처리
- HTTP Adapter 선택과 성능 차이
- Dependency Injection Scope 최적화
- Request Lifecycle의 성능 비용
- Database Query 및 Connection Pool 최적화
- Caching과 Response Compression
- CPU-bound 작업과 Background Processing
- Memory 관리 및 Garbage Collection
- 성능 측정과 Profiling
- Load Testing과 Bottleneck 분석
- Horizontal Scaling과 Kubernetes HPA
- 운영 환경 성능 모니터링
- 성능 최적화 전략 및 권장 사항

---

## 2. Performance의 주요 지표

애플리케이션의 성능을 평가하려면 먼저 측정할 지표를 정의해야 합니다.

대표적인 지표는 다음과 같습니다.

| 지표 | 설명 |
|---|---|
| Latency | 요청을 처리하는 데 걸리는 시간 |
| Throughput | 일정 시간 동안 처리한 작업 수 |
| RPS | 초당 처리한 HTTP Request 수 |
| Concurrency | 동시에 처리 중인 요청 또는 작업 수 |
| CPU Usage | CPU 사용량 |
| Memory Usage | 메모리 사용량 |
| Event Loop Delay | Event Loop 실행 지연 |
| Error Rate | 전체 요청 중 오류가 발생한 비율 |
| GC Pause | Garbage Collection으로 인한 실행 지연 |

### 2.1. Latency

Latency는 클라이언트가 요청을 전송한 시점부터 응답을 수신할 때까지 걸리는 시간을 의미합니다.

```text
Client
   |
   | HTTP Request
   v
NestJS Application
   |
   v
Business Logic
   |
   v
Database
   |
   v
HTTP Response
   |
   v
Client
```

전체 응답 시간에는 다음과 같은 요소가 포함될 수 있습니다.

- 네트워크 지연
- HTTP 요청 파싱
- Middleware 및 Guard 처리
- Validation 및 Serialization
- 비즈니스 로직
- Database Query
- 외부 API 호출
- 응답 전송

각 구간의 실행 시간이 전체 Latency에 영향을 미칩니다.

### 2.2. Throughput

Throughput은 일정 시간 동안 성공적으로 처리한 요청 또는 작업의 수입니다.

HTTP API에서는 일반적으로 RPS(Requests Per Second)를 사용합니다.

예를 들어 10초 동안 5,000개의 요청을 처리했다면 다음과 같습니다.

```text
RPS = 5,000 / 10

RPS = 500
```

단, Throughput이 높다고 해서 모든 요청의 Latency가 낮다는 의미는 아닙니다.

시스템이 처리 가능한 용량에 가까워지면 요청 대기 시간이 증가할 수 있습니다.

### 2.3. Percentile Latency

평균 응답 시간만으로는 사용자 경험을 정확하게 파악하기 어렵습니다.

따라서 Percentile 기반의 응답 시간도 함께 확인해야 합니다.

| 지표 | 의미 |
|---|---|
| p50 | 요청의 50%가 해당 시간 이내에 완료 |
| p90 | 요청의 90%가 해당 시간 이내에 완료 |
| p95 | 요청의 95%가 해당 시간 이내에 완료 |
| p99 | 요청의 99%가 해당 시간 이내에 완료 |

예를 들어 다음과 같은 측정 결과가 있다고 가정합니다.

```text
p50 = 20ms
p95 = 100ms
p99 = 450ms
```

이 결과는 절반의 요청이 20ms 이내에 완료되지만, 일부 요청에서는 상당히 긴 지연이 발생한다는 의미입니다.

특히 p99는 Tail Latency를 확인하는 데 유용합니다.

### 2.4. Concurrency와 Throughput

Concurrency는 동시에 처리 중인 작업의 수이며 Throughput과는 다른 개념입니다.

안정적인 시스템에서는 Little's Law를 다음과 같이 표현할 수 있습니다.

```text
L = λ × W
```

- `L`: 시스템 내 평균 작업 수
- `λ`: 단위 시간당 평균 처리량
- `W`: 평균 체류 시간

예를 들어 평균 RPS가 500이고 평균 응답 시간이 0.1초라면 다음과 같습니다.

```text
Average In-flight Requests

= 500 × 0.1
= 50
```

이는 정상 상태에서 평균적으로 약 50개의 요청이 처리 중이라는 의미입니다.

단, 이러한 관계는 시스템이 안정적인 상태이며 측정 범위와 단위가 일치한다는 전제에서 적용됩니다.

---

## 3. Node.js Event Loop

NestJS는 Node.js 런타임 위에서 실행되므로 Node.js의 Event Loop 동작 방식을 이해해야 합니다.

Node.js는 Event Loop를 이용하여 JavaScript Callback과 비동기 I/O의 완료 처리를 조정합니다.

일반적인 Node.js 애플리케이션에서는 하나의 JavaScript 실행 스레드가 Event Loop를 처리하지만, 운영체제 및 libuv Worker Pool 등을 통해 일부 작업을 병렬로 수행할 수 있습니다.

### 3.1. Event Loop의 기본 구조

```text
Incoming Requests
        |
        v
    Node.js
        |
        v
   Event Loop
        |
        +----------------------+
        |                      |
        v                      v
JavaScript Logic         Async I/O
        |                      |
        |                      v
        |                 OS / Worker Pool
        |                      |
        +-----------+----------+
                    |
                    v
              I/O Completion
                    |
                    v
              Event Loop
                    |
                    v
               Response
```

Node.js는 I/O 작업을 기다리는 동안 Event Loop에서 다른 작업을 처리할 수 있습니다.

그러나 JavaScript 코드가 CPU를 장시간 점유하면 Event Loop에서 다른 Callback을 실행하는 시간이 지연됩니다.

### 3.2. Blocking 작업

다음 코드는 CPU를 많이 사용하는 동기 연산의 예시입니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class CalculationService {
  calculate(): number {
    let result = 0;

    for (let i = 0; i < 1_000_000_000; i++) {
      result += i;
    }

    return result;
  }
}
```

이 메서드는 계산을 완료할 때까지 현재 JavaScript 실행 스레드를 점유할 수 있습니다.

그동안 같은 Event Loop에서 처리해야 하는 다른 요청의 응답이 지연될 수 있습니다.

### 3.3. Non-blocking I/O

다음은 비동기 I/O를 수행하는 예제입니다.

```typescript
import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';

@Injectable()
export class FileService {
  async readFile(): Promise<string> {
    return readFile('./data.txt', 'utf8');
  }
}
```

`readFile()`은 Promise 기반 비동기 API입니다.

파일을 읽는 동안 Node.js는 다른 Callback을 처리할 수 있습니다.

단, `async`와 `await`를 사용한다고 해서 모든 작업이 자동으로 병렬 처리되는 것은 아닙니다.

특히 CPU를 많이 사용하는 동기 함수는 `async` 함수 내부에서 실행하더라도 Event Loop를 점유할 수 있습니다.

### 3.4. Event Loop Blocking을 피해야 하는 이유

Event Loop Blocking이 발생하면 다음과 같은 문제가 나타날 수 있습니다.

- HTTP 응답 지연
- WebSocket 메시지 전송 지연
- Timer Callback 실행 지연
- Health Check Timeout
- 처리량 감소
- Tail Latency 증가

따라서 CPU를 많이 사용하는 작업은 별도의 Worker Thread 또는 프로세스에서 실행하는 방식을 고려할 수 있습니다.

---

## 4. HTTP Adapter와 성능

NestJS는 HTTP Adapter를 통해 특정 HTTP Server Framework에 종속되지 않는 애플리케이션 구조를 제공합니다.

HTTP Adapter는 HTTP 요청과 응답 처리를 NestJS의 Controller 및 Request Lifecycle과 연결합니다.

### 4.1. HTTP Adapter 종류

대표적인 HTTP Adapter는 다음과 같습니다.

| Adapter | 패키지 | 특징 |
|---|---|---|
| ExpressAdapter | `@nestjs/platform-express` | Express 기반의 높은 호환성 |
| FastifyAdapter | `@nestjs/platform-fastify` | Fastify 기반의 HTTP 처리 |
| NodeAdapter | `@nestjs/platform-node` | Node.js Native HTTP 기반의 Adapter |

Adapter의 지원 여부와 세부 API는 NestJS 버전에 따라 달라질 수 있습니다.

기존 NestJS 버전의 공식 문서는 주로 Express와 Fastify를 비교하지만, 최신 NestJS 공식 문서에서는 NodeAdapter도 설명합니다.

따라서 특정 Adapter가 모든 환경에서 가장 빠르다고 단정해서는 안 됩니다.

### 4.2. FastifyAdapter

Fastify를 사용하려면 다음 패키지를 설치합니다.

```bash
npm install @nestjs/platform-fastify
```

`main.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
```

이 예제는 NestJS의 HTTP Server를 Fastify 기반으로 실행합니다.

`0.0.0.0`은 모든 IPv4 네트워크 인터페이스에서 연결을 수신하도록 지정합니다.

Docker 또는 Kubernetes 환경에서는 외부 트래픽을 수신할 수 있도록 네트워크 바인딩 설정을 확인해야 합니다.

### 4.3. Adapter 선택 시 고려사항

HTTP Adapter 선택에는 성능 외에도 다음과 같은 요소가 영향을 미칩니다.

- Middleware 호환성
- HTTP Request 및 Response API
- Serialization 처리 방식
- File Upload 지원
- WebSocket 연동
- Monitoring 및 Tracing 도구
- 기존 라이브러리와의 호환성

예를 들어 Express Middleware에 의존하는 애플리케이션을 Fastify로 전환하는 경우 Fastify용 Plugin 또는 별도 구현이 필요할 수 있습니다.

따라서 HTTP Adapter 변경은 실제 요청 패턴을 기준으로 Benchmark를 수행한 후 결정하는 것이 좋습니다.

---

## 5. Dependency Injection Scope와 성능

NestJS의 Dependency Injection은 Provider Instance의 생성 및 생명주기를 관리합니다.

Provider Scope는 애플리케이션의 성능에 영향을 줄 수 있습니다.

### 5.1. Provider Scope 비교

| Scope | Instance 생성 방식 | 주요 특징 |
|---|---|---|
| DEFAULT | 일반적으로 애플리케이션 컨텍스트당 한 번 | Instance 재사용 |
| REQUEST | 요청 컨텍스트마다 생성 | 요청별 상태 분리 |
| TRANSIENT | 주입받는 소비자마다 생성 | Provider Instance 분리 |

### 5.2. Singleton Provider

기본 Scope는 Singleton입니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductService {
  findAll() {
    return [];
  }
}
```

별도의 Scope를 지정하지 않으면 기본 Scope가 적용됩니다.

일반적인 Singleton Provider는 요청마다 새 Instance를 생성하지 않으므로 객체 생성 및 DI Resolution 비용을 줄일 수 있습니다.

### 5.3. Request-scoped Provider

```typescript
import {
  Injectable,
  Scope,
} from '@nestjs/common';

@Injectable({
  scope: Scope.REQUEST,
})
export class RequestContextService {
  private readonly createdAt = Date.now();

  getCreatedAt(): number {
    return this.createdAt;
  }
}
```

Request Scope를 사용하면 요청마다 별도의 Provider Instance가 생성됩니다.

이 경우 다음과 같은 추가 비용이 발생할 수 있습니다.

- Provider Instance 생성
- Dependency Resolution
- 객체 할당 증가
- Garbage Collection 부담 증가

또한 Request-scoped Provider를 주입받는 상위 Provider도 Request Scope의 영향을 받을 수 있습니다.

따라서 요청별 Instance가 반드시 필요한 경우가 아니라면 기본 Singleton Scope를 우선 고려하는 것이 좋습니다.

### 5.4. Singleton 사용 시 주의사항

Singleton Provider는 여러 요청에서 공유될 수 있으므로 요청별 상태를 Instance Property에 저장하지 않아야 합니다.

```typescript
@Injectable()
export class UserService {
  private currentUserId?: string;
}
```

위와 같이 요청별 사용자 ID를 공유 Provider의 상태로 관리하면 서로 다른 요청의 데이터가 충돌할 수 있습니다.

요청별 상태는 메서드 파라미터, 요청 컨텍스트 또는 적절한 Context Propagation 메커니즘으로 관리해야 합니다.

---

## 6. Request Lifecycle 최적화

NestJS에서는 HTTP 요청이 여러 구성 요소를 거쳐 처리됩니다.

일반적인 Request Lifecycle은 다음과 같습니다.

```text
HTTP Request
     |
     v
 Middleware
     |
     v
    Guard
     |
     v
 Interceptor
     |
     v
    Pipe
     |
     v
 Controller
     |
     v
   Service
     |
     v
 Interceptor
     |
     v
HTTP Response
```

각 구성 요소는 필요한 책임을 수행하지만, 실행 과정에서 일정한 처리 비용이 발생합니다.

### 6.1. Middleware

Middleware는 Logging, Request Metadata 처리 등의 공통 기능을 수행할 수 있습니다.

불필요하게 복잡한 동기 작업을 Middleware에 추가하면 모든 요청의 Latency에 영향을 줄 수 있습니다.

### 6.2. Guard

Guard는 Authentication 및 Authorization을 수행합니다.

예를 들어 매 요청마다 외부 인증 서버에 동기적으로 의존하는 구조는 네트워크 지연을 발생시킬 수 있습니다.

실제 인증 요구사항에 따라 Token의 로컬 검증, 인증 정보 캐싱 등의 방법을 검토할 수 있습니다.

단, 인증 성능을 개선하기 위해 Token 검증이나 권한 검사를 생략해서는 안 됩니다.

### 6.3. Pipe

Pipe는 Validation과 Transformation을 수행합니다.

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
);
```

Validation은 입력 데이터의 안정성을 확보하기 위한 필수적인 기능일 수 있습니다.

다만 매우 큰 객체나 복잡한 중첩 DTO를 검증하는 경우 추가적인 CPU 비용이 발생할 수 있습니다.

따라서 Validation을 제거하기보다 불필요한 변환 및 중복 검사를 줄이는 방향으로 최적화하는 것이 좋습니다.

### 6.4. Interceptor

Interceptor는 Logging, Response Transformation, Caching 등의 작업을 수행할 수 있습니다.

여러 Interceptor를 중첩하면 요청과 응답 처리 과정에서 추가적인 함수 호출과 데이터 변환이 발생할 수 있습니다.

특히 대용량 응답을 반복적으로 변환하는 경우 Serialization 비용이 증가할 수 있습니다.

---

## 7. Database 성능 최적화

Database는 NestJS 애플리케이션에서 빈번하게 발생하는 성능 병목 중 하나입니다.

애플리케이션의 HTTP 처리 속도가 충분히 빠르더라도 Database Query가 느리면 전체 응답 시간은 증가합니다.

### 7.1. Database Query 최적화

다음 사항을 고려할 수 있습니다.

- 적절한 Index 사용
- 필요한 Column만 조회
- 불필요한 Join 제거
- N+1 Query 문제 해결
- Pagination 적용
- Query Execution Plan 분석
- 적절한 Transaction 범위 설정

### 7.2. 필요한 데이터만 조회

TypeORM을 사용하는 예제입니다.

```typescript
const users = await this.userRepository.find({
  select: {
    id: true,
    name: true,
  },
});
```

전체 Entity를 조회하지 않고 필요한 Column만 선택합니다.

이 방식은 Database에서 읽는 데이터와 애플리케이션으로 전송하는 데이터의 양을 줄이는 데 도움이 될 수 있습니다.

### 7.3. Pagination

대량의 데이터를 한 번에 반환하지 않도록 Pagination을 적용할 수 있습니다.

```typescript
const users = await this.userRepository.find({
  skip: 0,
  take: 20,
  order: {
    id: 'ASC',
  },
});
```

`skip`과 `take`는 Offset 기반 Pagination에 사용할 수 있습니다.

다만 데이터가 매우 많거나 Offset이 큰 경우 Database에 추가적인 처리 비용이 발생할 수 있습니다.

이러한 상황에서는 Cursor 또는 Keyset Pagination을 검토할 수 있습니다.

### 7.4. N+1 Query 문제

다음과 같은 구조에서 N+1 Query 문제가 발생할 수 있습니다.

```text
SELECT users
     |
     +---- SELECT orders WHERE user_id = 1
     |
     +---- SELECT orders WHERE user_id = 2
     |
     +---- SELECT orders WHERE user_id = 3
```

사용자 목록을 한 번 조회한 후 사용자마다 주문 목록을 별도로 조회하는 방식입니다.

이를 해결하기 위해 다음과 같은 방법을 고려할 수 있습니다.

- Join Query
- Batch Query
- DataLoader
- 필요한 Relation의 사전 로딩

단, Join을 과도하게 사용하면 결과 데이터가 중복되거나 대량으로 증가할 수 있으므로 실제 Query Plan과 반환 데이터의 크기를 확인해야 합니다.

### 7.5. Connection Pool

Connection Pool은 Database Connection을 재사용하기 위한 메커니즘입니다.

```text
NestJS Application
        |
        v
 Connection Pool
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

Connection Pool은 매 요청마다 새로운 Database 연결을 생성하는 비용을 줄일 수 있습니다.

그러나 Pool Size를 무조건 크게 설정한다고 성능이 향상되는 것은 아닙니다.

과도한 연결은 Database의 CPU 및 Memory 사용량을 증가시키고 경쟁을 유발할 수 있습니다.

Kubernetes에서 여러 Pod를 실행하는 경우 전체 Database Connection 수를 함께 고려해야 합니다.

예를 들어 다음과 같은 구성이 있다고 가정합니다.

```text
10 Pods × 20 Connections per Pod
= 200 Connections
```

각 Pod의 Pool Size뿐만 아니라 전체 인스턴스가 생성하는 연결 수를 기준으로 Database의 허용 범위를 검토해야 합니다.

---

## 8. Caching을 통한 성능 최적화

Caching은 반복적으로 조회되는 데이터를 빠른 저장소에 보관하여 원본 데이터 소스에 대한 요청을 줄이는 방법입니다.

NestJS는 `@nestjs/cache-manager`를 통해 Cache 기능을 사용할 수 있습니다.

### 8.1. Caching 동작 구조

```text
Client Request
       |
       v
NestJS Application
       |
       v
   Cache Lookup
       |
       +---- Cache Hit ----> Response
       |
       +---- Cache Miss
                 |
                 v
              Database
                 |
                 v
             Store Cache
                 |
                 v
              Response
```

Cache Hit가 발생하면 Database Query를 생략할 수 있어 응답 시간과 Database 부하를 줄일 수 있습니다.

### 8.2. 패키지 설치

```bash
npm install @nestjs/cache-manager cache-manager
```

### 8.3. CacheModule 등록

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60000,
    }),
  ],
})
export class AppModule {}
```

위 예제에서는 TTL을 밀리초 단위로 설정하는 Cache Manager 버전을 전제로 합니다.

Cache Store 및 패키지 버전에 따라 설정 방식이 달라질 수 있습니다.

### 8.4. CacheInterceptor

```typescript
import {
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';

import { CacheInterceptor } from '@nestjs/cache-manager';

@Controller('products')
export class ProductController {
  @Get()
  @UseInterceptors(CacheInterceptor)
  findAll() {
    return [
      { id: 1, name: 'Product A' },
      { id: 2, name: 'Product B' },
    ];
  }
}
```

`CacheInterceptor`는 지원되는 HTTP Endpoint의 응답을 Cache에 저장하여 재사용할 수 있도록 합니다.

기본 HTTP 응답 캐싱은 일반적으로 GET 요청을 대상으로 합니다.

### 8.5. Cache 적용 시 고려사항

Cache를 도입할 때는 다음 사항을 고려해야 합니다.

| 항목 | 설명 |
|---|---|
| Cache Hit Ratio | Cache 요청 중 Hit 비율 |
| TTL | 데이터 유효 기간 |
| Cache Invalidation | 원본 데이터 변경 시 Cache 갱신 |
| Memory Usage | Cache가 사용하는 메모리 |
| Cache Stampede | 동일한 데이터에 대한 동시 Cache Miss |
| Consistency | 원본 데이터와 Cache 데이터의 일관성 |

Cache는 데이터 조회 비용을 줄일 수 있지만 데이터 정합성 문제를 발생시킬 수 있습니다.

특히 사용자별로 다른 데이터를 반환하는 Endpoint에서는 Cache Key에 사용자 또는 권한 범위가 적절히 반영되어야 합니다.

Caching의 상세 구현 방법은 `../03-techniques/caching.md`에서 다룹니다.

---

## 9. Response Compression

Response Compression은 HTTP 응답 본문의 크기를 줄여 네트워크 전송 비용을 감소시키는 방법입니다.

대표적인 압축 방식은 다음과 같습니다.

- gzip
- Brotli

### 9.1. Compression의 효과

```text
Original Response
       |
       v
   Compression
       |
       v
Compressed Response
       |
       v
    Network
       |
       v
     Client
```

압축을 사용하면 전송되는 데이터의 크기를 줄일 수 있습니다.

특히 JSON, HTML, Text 등 압축률이 높은 데이터에서 효과적일 수 있습니다.

### 9.2. Compression의 비용

Compression은 CPU 리소스를 사용합니다.

따라서 응답 크기가 작거나 이미 압축된 파일을 전송하는 경우 성능 개선 효과가 제한적일 수 있습니다.

또한 Compression을 애플리케이션에서 수행하는 대신 Reverse Proxy, CDN 또는 Load Balancer에서 처리할 수도 있습니다.

### 9.3. 적용 전략

다음 요소를 측정하여 적용 위치를 결정하는 것이 좋습니다.

- 응답 크기
- 압축률
- CPU 사용량
- 네트워크 대역폭
- 응답 지연 시간
- 인프라 계층의 압축 지원 여부

Compression 구현 방식은 Express와 Fastify에서 다를 수 있으므로 사용하는 HTTP Adapter의 공식 문서를 확인해야 합니다.

---

## 10. CPU-bound 작업과 Background Processing

CPU-bound 작업은 CPU 연산이 전체 처리 시간의 주요 부분을 차지하는 작업입니다.

대표적인 예시는 다음과 같습니다.

- 대규모 데이터 변환
- 복잡한 수치 계산
- 이미지 및 비디오 처리
- 대량 데이터 압축
- CPU 집약적인 암호화 및 해싱
- 복잡한 JSON 처리

이러한 작업을 HTTP 요청을 처리하는 Event Loop에서 장시간 실행하면 다른 요청이 지연될 수 있습니다.

### 10.1. Worker Threads

Node.js는 CPU 집약적인 JavaScript 작업을 다른 스레드에서 실행할 수 있도록 `worker_threads` API를 제공합니다.

```text
NestJS Main Thread
        |
        v
  Worker Threads
        |
        +---- Worker 1
        |
        +---- Worker 2
        |
        +---- Worker 3
        |
        v
    CPU Processing
```

Worker Thread는 별도의 JavaScript 실행 환경에서 작업을 처리합니다.

일반적으로 CPU 집약적인 작업에 유용하며, 비동기 I/O 자체를 빠르게 만드는 용도로 사용할 필요는 없습니다.

또한 Worker를 매 작업마다 새로 생성하면 초기화 비용이 발생하므로 반복 작업에서는 Worker Pool을 고려할 수 있습니다.

### 10.2. Background Queue

HTTP 응답과 직접적으로 연결되지 않아도 되는 작업은 Queue를 통해 비동기적으로 처리할 수 있습니다.

```text
HTTP Request
     |
     v
NestJS API
     |
     v
Enqueue Job
     |
     v
HTTP Response

       Queue
         |
         v
     Worker
         |
         v
   Process Job
```

이 방식은 긴 작업으로 인해 HTTP 요청이 오래 유지되는 문제를 줄이는 데 도움이 됩니다.

NestJS에서는 BullMQ 등의 Queue 시스템을 연동할 수 있습니다.

다만 Queue를 사용하면 작업 처리의 책임이 비동기적으로 분리되므로 다음 요소를 함께 설계해야 합니다.

- Job Retry
- Idempotency
- Dead Letter 또는 실패 작업 관리
- Queue Backlog
- Worker Concurrency
- 작업 완료 여부 조회
- Graceful Shutdown

### 10.3. Queue와 Worker Thread의 차이

| 구분 | Queue | Worker Thread |
|---|---|---|
| 주요 목적 | 비동기 작업 분리 | CPU 작업 병렬 실행 |
| 실행 위치 | 별도 Process 또는 Worker 가능 | 같은 Process 내 별도 Thread |
| 작업 저장 | Queue Backend에 저장 가능 | 자체 구현에 따라 다름 |
| 장애 복구 | Queue 시스템의 재시도 기능 활용 가능 | 별도 복구 설계 필요 |
| 대표 활용 | 이메일, Batch, 비동기 작업 | CPU 집약적 계산 |

Queue에 작업을 등록했다고 해서 CPU 연산이 자동으로 다른 스레드에서 실행되는 것은 아닙니다.

동일한 프로세스의 Event Loop에서 CPU 집약적인 Queue Job을 실행하면 다른 작업의 처리에도 영향을 줄 수 있습니다.

---

## 11. Memory 관리와 Garbage Collection

Node.js는 V8 JavaScript Engine의 Garbage Collection을 통해 사용하지 않는 JavaScript 객체의 메모리를 회수합니다.

그러나 애플리케이션에서 객체 참조를 계속 유지하면 Garbage Collection이 해당 객체를 회수할 수 없습니다.

### 11.1. 주요 Memory 지표

Node.js에서는 `process.memoryUsage()`로 메모리 사용량을 확인할 수 있습니다.

```typescript
const memory = process.memoryUsage();

console.log(memory);
```

주요 필드는 다음과 같습니다.

| 필드 | 설명 |
|---|---|
| `rss` | 프로세스의 Resident Set Size |
| `heapTotal` | V8 Heap에 할당된 메모리 |
| `heapUsed` | 사용 중인 V8 Heap 메모리 |
| `external` | V8 Heap 외부의 C++ 객체 관련 메모리 |
| `arrayBuffers` | ArrayBuffer 및 Buffer에 할당된 메모리 |

### 11.2. Memory Leak

Memory Leak은 더 이상 필요하지 않은 데이터가 계속 참조되어 메모리를 회수하지 못하는 현상입니다.

대표적인 원인은 다음과 같습니다.

- 해제되지 않은 Event Listener
- 계속 증가하는 Map 또는 Array
- 정리되지 않은 Timer
- 종료되지 않은 Subscription
- 무제한 In-memory Cache
- 사용하지 않는 객체에 대한 참조 유지

### 11.3. 무제한 Map 사용 예제

```typescript
@Injectable()
export class SessionService {
  private readonly sessions = new Map<string, unknown>();

  addSession(id: string, data: unknown): void {
    this.sessions.set(id, data);
  }
}
```

이 코드는 Session을 추가하지만 삭제하는 로직이 없습니다.

Session 수가 계속 증가한다면 메모리 사용량도 증가할 수 있습니다.

따라서 Session을 관리하는 경우 다음 사항을 고려해야 합니다.

- 연결 종료 시 Session 삭제
- 만료 시간 설정
- 최대 저장 개수 제한
- 메모리 사용량 모니터링
- 필요할 경우 외부 Session Store 사용

### 11.4. Garbage Collection

Garbage Collection은 사용하지 않는 객체를 자동으로 회수하지만, GC 자체에도 CPU 및 실행 지연 비용이 발생합니다.

객체 생성량이 매우 많은 애플리케이션에서는 다음과 같은 현상이 나타날 수 있습니다.

- GC 실행 빈도 증가
- CPU 사용량 증가
- Tail Latency 증가
- Memory 사용량 변동

따라서 높은 요청 처리량을 요구하는 애플리케이션에서는 불필요한 객체 생성과 대량의 임시 객체 할당을 줄이는 것이 도움이 될 수 있습니다.

단, 객체 재사용이 항상 더 빠른 것은 아니므로 실제 Profiling 결과를 기준으로 판단해야 합니다.

---

## 12. Event Loop 성능 측정

Node.js는 `node:perf_hooks` 모듈을 통해 Event Loop 관련 성능 정보를 제공합니다.

### 12.1. Event Loop Delay

Event Loop Delay는 Event Loop에서 예정된 작업이 실제로 실행되기까지 발생하는 지연을 측정하는 지표입니다.

```typescript
import { monitorEventLoopDelay } from 'node:perf_hooks';

const histogram = monitorEventLoopDelay({
  resolution: 20,
});

histogram.enable();

setInterval(() => {
  const p99Ms = histogram.percentile(99) / 1e6;

  console.log({
    eventLoopDelayP99Ms: p99Ms,
  });

  histogram.reset();
}, 10000);
```

`monitorEventLoopDelay()`는 Event Loop의 지연을 측정합니다.

반환되는 측정 시간은 나노초 단위이므로 밀리초로 표현하려면 `1e6`으로 나눕니다.

위 예제는 10초 간격으로 p99 Event Loop Delay를 출력합니다.

실제 운영 환경에서는 측정용 Timer를 종료 Lifecycle에 맞게 정리해야 합니다.

### 12.2. Event Loop Utilization

Event Loop Utilization은 Event Loop가 활성 상태로 사용된 비율을 나타내는 지표입니다.

```typescript
import { performance } from 'node:perf_hooks';

let previous = performance.eventLoopUtilization();

setInterval(() => {
  const current = performance.eventLoopUtilization();

  const delta = performance.eventLoopUtilization(
    current,
    previous,
  );

  console.log({
    eventLoopUtilization: delta.utilization,
  });

  previous = current;
}, 10000);
```

`utilization` 값은 0에서 1 사이의 비율로 표현됩니다.

값이 1에 가까울수록 측정 구간에서 Event Loop가 많은 시간을 활성 상태로 사용했다는 의미입니다.

다만 Event Loop Utilization은 CPU 사용률과 동일한 지표가 아닙니다.

Event Loop가 동기적인 Blocking 작업에 머무르는 경우에도 높은 Utilization이 나타날 수 있습니다.

### 12.3. Event Loop Delay와 Utilization 비교

| 지표 | 측정 대상 |
|---|---|
| Event Loop Delay | Callback 실행 지연 |
| Event Loop Utilization | Event Loop 활성 시간 비율 |
| CPU Usage | CPU 리소스 소비 |
| Request Latency | 사용자 요청 처리 시간 |

이 지표들을 함께 확인하면 Event Loop가 실제 성능 병목인지 판단하는 데 도움이 됩니다.

---

## 13. 성능 측정과 Profiling

성능 최적화를 시작하기 전에 실제 병목 구간을 확인해야 합니다.

### 13.1. Profiling

Profiling은 애플리케이션이 실행되는 동안 CPU, Memory 및 함수 실행 시간 등을 분석하는 과정입니다.

대표적인 분석 대상은 다음과 같습니다.

- CPU를 많이 사용하는 함수
- 메모리 할당이 많은 코드
- Event Loop Blocking
- 반복적으로 실행되는 함수
- 불필요한 Serialization
- Garbage Collection

### 13.2. Node.js CPU Profiling

Node.js는 CPU Profile을 생성하는 기능을 제공합니다.

```bash
node --cpu-prof dist/main.js
```

프로세스 실행 중 CPU Profile을 수집하고 종료 시 Profile 파일을 저장할 수 있습니다.

생성된 Profile은 Chrome DevTools 등에서 분석할 수 있습니다.

### 13.3. Heap Snapshot

Node.js는 Heap Snapshot을 생성할 수 있습니다.

예를 들어 다음과 같이 실행할 수 있습니다.

```bash
node --heapsnapshot-signal=SIGUSR2 dist/main.js
```

지원되는 환경에서 해당 프로세스에 `SIGUSR2`를 전달하면 Heap Snapshot을 생성할 수 있습니다.

Heap Snapshot은 Memory Leak을 분석하는 데 도움이 됩니다.

다만 Snapshot 생성 과정에서는 메모리 사용량과 실행 지연이 크게 증가할 수 있습니다.

따라서 운영 환경에서 수행하기 전에 충분한 리소스와 안전한 실행 조건을 확보해야 합니다.

### 13.4. Profiling 결과 활용

Profiling 결과에서 특정 함수의 CPU 사용량이 높게 나타난다면 다음과 같은 최적화를 고려할 수 있습니다.

- 중복 계산 제거
- 알고리즘 변경
- 불필요한 객체 생성 감소
- Cache 적용
- Worker Thread로 작업 분리

성능 개선 후에는 동일한 조건에서 다시 측정하여 실제 효과를 확인해야 합니다.

---

## 14. Load Testing

Load Testing은 애플리케이션에 일정한 부하를 발생시켜 처리량, 응답 시간, 오류율 및 리소스 사용량을 측정하는 과정입니다.

### 14.1. Load Testing의 목적

다음 사항을 확인할 수 있습니다.

- 현재 시스템의 처리 용량
- 동시 요청 증가에 따른 Latency 변화
- CPU 및 Memory 병목
- Database Connection Pool의 한계
- 외부 API의 처리 지연
- 시스템의 최대 처리량
- 성능 저하가 시작되는 부하 수준

### 14.2. 주요 테스트 유형

| 유형 | 목적 |
|---|---|
| Load Test | 예상되는 정상 부하 검증 |
| Stress Test | 처리 한계 및 장애 동작 확인 |
| Spike Test | 급격한 트래픽 증가 대응 |
| Soak Test | 장시간 실행 시 안정성 확인 |
| Scalability Test | 리소스 확장에 따른 처리량 변화 |

### 14.3. Autocannon

Autocannon은 Node.js 기반 HTTP Benchmark 도구입니다.

별도로 설치하지 않고 `npx`를 이용할 수 있습니다.

```bash
npx autocannon \
  -c 100 \
  -d 30 \
  http://localhost:3000/products
```

주요 옵션은 다음과 같습니다.

| 옵션 | 설명 |
|---|---|
| `-c` | 동시 Connection 수 |
| `-d` | 테스트 시간(초) |
| `-p` | HTTP Pipelining 설정 |
| `-r` | Connection당 요청률 제한 |

위 명령어는 100개의 Connection을 이용해 30초 동안 요청을 발생시키는 예제입니다.

Connection 수와 동시에 처리 중인 요청 수가 반드시 일치하는 것은 아닙니다.

### 14.4. k6

k6는 부하 테스트 시나리오를 JavaScript로 작성할 수 있는 도구입니다.

다음은 k6가 설치된 환경을 전제로 하는 예제입니다.

`load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
};

export default function () {
  const response = http.get(
    'http://localhost:3000/products',
  );

  check(response, {
    'status is 200': (res) => res.status === 200,
  });

  sleep(1);
}
```

실행:

```bash
k6 run load-test.js
```

`vus`는 Virtual User 수를 나타냅니다.

이 예제에서 각 Virtual User는 HTTP 요청을 수행한 후 1초 동안 대기합니다.

따라서 50 VU가 항상 50 RPS를 의미하지는 않습니다.

### 14.5. 테스트 결과 분석

다음 지표를 함께 확인하는 것이 좋습니다.

```text
Request Rate
    |
    +---- RPS
    |
    +---- p95 Latency
    |
    +---- p99 Latency
    |
    +---- Error Rate
    |
    +---- CPU Usage
    |
    +---- Memory Usage
    |
    +---- Event Loop Delay
```

RPS만 높고 오류율이나 p99 Latency가 크게 증가한다면 안정적인 처리 용량에 도달했다고 판단하기 어렵습니다.

---

## 15. Bottleneck 분석

Bottleneck은 시스템 전체 처리 성능을 제한하는 구성 요소입니다.

대표적인 Bottleneck은 다음과 같습니다.

| Bottleneck | 대표적인 현상 |
|---|---|
| CPU | 높은 CPU 사용량과 처리 지연 |
| Event Loop | Event Loop Delay 증가 |
| Memory | GC 증가 또는 OOM 발생 |
| Database | Query Latency 및 Connection 대기 증가 |
| Network | 전송 지연 및 대역폭 제한 |
| External API | 외부 요청 Timeout 증가 |
| Queue | Job Backlog 증가 |
| Connection Pool | Pool 대기 시간 증가 |

### 15.1. Bottleneck의 전파

```text
Client
   |
   v
NestJS API
   |
   v
Database Connection Pool
   |
   v
Database Query
   |
   v
Slow Response
```

Database가 병목이라면 NestJS 인스턴스를 추가하더라도 전체 처리량이 기대만큼 증가하지 않을 수 있습니다.

오히려 인스턴스 수가 증가하면서 Database 연결 수와 동시 Query가 증가하여 성능이 악화될 수도 있습니다.

### 15.2. 최적화 순서

일반적으로 다음 순서를 권장합니다.

1. 현재 성능을 측정합니다.
2. 병목 구간을 식별합니다.
3. 병목의 원인을 분석합니다.
4. 하나 이상의 개선 방법을 적용합니다.
5. 동일한 조건으로 다시 측정합니다.
6. 개선 효과와 부작용을 비교합니다.

이 과정을 반복하면서 시스템의 처리 용량을 개선할 수 있습니다.

---

## 16. Horizontal Scaling

Horizontal Scaling은 애플리케이션 인스턴스의 수를 늘려 전체 처리 용량을 확장하는 방식입니다.

### 16.1. Vertical Scaling과 Horizontal Scaling

| 구분 | Vertical Scaling | Horizontal Scaling |
|---|---|---|
| 방식 | 단일 인스턴스의 리소스 증가 | 인스턴스 수 증가 |
| 예시 | CPU 2 Core → 4 Core | Pod 2개 → 4개 |
| 장점 | 비교적 단순한 확장 | 분산 처리 및 가용성 확보 |
| 고려사항 | 단일 인스턴스의 리소스 한계 | 상태 관리 및 트래픽 분산 |

### 16.2. Horizontal Scaling 구조

```text
             Clients
                |
                v
          Load Balancer
                |
        +-------+-------+
        |       |       |
        v       v       v
     NestJS   NestJS   NestJS
      Pod A    Pod B    Pod C
        |       |       |
        +-------+-------+
                |
                v
             Database
```

각 Pod가 독립적인 NestJS 애플리케이션 인스턴스를 실행합니다.

Load Balancer는 여러 Pod에 요청을 분산합니다.

### 16.3. Stateful Application의 주의사항

애플리케이션 내부 메모리에 사용자 Session이나 Subscription 상태를 저장하면 인스턴스마다 서로 다른 상태를 가지게 됩니다.

예를 들어 다음과 같은 구조를 고려할 수 있습니다.

```text
Gateway A
  - Client 1
  - Client 2

Gateway B
  - Client 3
  - Client 4
```

각 Gateway는 자신에게 연결된 Client Session을 별도로 관리합니다.

이러한 구조에서는 Scale-out 과정에서 다음 사항을 고려해야 합니다.

- Session Affinity
- Shared Session Store
- Client Reconnection
- Subscription Routing
- Connection Distribution
- Instance별 Memory Usage

WebSocket과 같이 장시간 연결을 유지하는 서비스에서는 단순한 HTTP RPS뿐만 아니라 활성 연결 수와 메시지 처리량을 함께 측정해야 합니다.

---

## 17. Kubernetes HPA

Kubernetes의 Horizontal Pod Autoscaler(HPA)는 관측된 Metrics를 기준으로 Deployment 등의 Replica 수를 자동으로 조정할 수 있습니다.

### 17.1. HPA 동작 구조

```text
          Metrics
             |
             v
        HPA Controller
             |
             v
      Desired Replicas
             |
             v
          Deployment
             |
      +------+------+
      |      |      |
      v      v      v
    Pod A  Pod B  Pod C
```

HPA는 CPU, Memory 또는 Custom Metrics 등을 기반으로 Replica 수를 조정할 수 있습니다.

### 17.2. CPU 기반 HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nestjs-api-hpa

spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nestjs-api

  minReplicas: 2
  maxReplicas: 10

  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

이 예제는 평균 CPU 사용률이 설정된 목표에 가까워지도록 Replica 수를 조정하는 구성입니다.

`averageUtilization: 70`은 Pod의 CPU Request를 기준으로 계산한 사용률 70%를 의미합니다.

따라서 HPA가 CPU 사용률을 계산하려면 대상 Container에 적절한 CPU Request를 설정해야 합니다.

또한 CPU Metrics를 제공하는 Metrics Server 등의 구성 요소가 필요합니다.

### 17.3. HPA의 한계

CPU 기반 HPA가 모든 애플리케이션에서 적절한 확장 기준이 되는 것은 아닙니다.

예를 들어 Database Connection 대기가 병목인 애플리케이션은 CPU 사용률이 낮더라도 요청 지연이 발생할 수 있습니다.

또한 WebSocket Gateway는 활성 Connection 수와 메시지 Fan-out 부하가 주요 병목이 될 수 있습니다.

따라서 애플리케이션 특성에 따라 다음과 같은 Custom Metrics를 고려할 수 있습니다.

- Active WebSocket Connections
- Requests Per Second
- In-flight Requests
- Queue Backlog
- Message Processing Rate
- Event Loop Utilization

이러한 Metrics를 HPA에 사용하려면 Prometheus Adapter 등의 Metrics API 연동 구성이 별도로 필요합니다.

### 17.4. Scale-out과 성능의 관계

인스턴스 수를 두 배로 늘렸다고 해서 전체 Throughput이 반드시 두 배가 되는 것은 아닙니다.

다음 요소가 확장 효율에 영향을 줍니다.

- Load Balancer의 분산 방식
- Database 처리 용량
- 외부 API Rate Limit
- 공유 Cache의 처리량
- 네트워크 대역폭
- 인스턴스 간 통신 비용
- Session 분포

따라서 Scale-out 성능은 실제 부하 테스트를 통해 확인해야 합니다.

---

## 18. 운영 환경 모니터링

성능 최적화는 배포 전에 한 번 수행하는 작업으로 끝나지 않습니다.

실제 운영 환경에서는 트래픽 패턴과 데이터 크기, 외부 시스템 상태 등이 계속 변경됩니다.

따라서 성능 지표를 지속적으로 수집하고 분석해야 합니다.

### 18.1. 주요 Monitoring 지표

| 분류 | Metrics |
|---|---|
| HTTP | RPS, Latency, Error Rate |
| Node.js | Event Loop Delay, Heap Usage, GC |
| Process | CPU Usage, RSS |
| Database | Query Latency, Pool Usage |
| Cache | Hit Ratio, Miss Ratio |
| Queue | Backlog, Processing Time |
| Kubernetes | CPU, Memory, Replica Count |
| WebSocket | Active Connections, Message Rate |

### 18.2. RED Method

RED Method는 Request 기반 서비스의 성능과 상태를 관찰하기 위한 방법입니다.

| 지표 | 의미 |
|---|---|
| Rate | 단위 시간당 요청 수 |
| Errors | 오류가 발생한 요청 수 또는 비율 |
| Duration | 요청 처리 시간 |

HTTP API의 성능을 모니터링하는 데 유용합니다.

### 18.3. USE Method

USE Method는 시스템 리소스의 상태를 분석하기 위한 방법입니다.

| 지표 | 의미 |
|---|---|
| Utilization | 리소스 사용률 |
| Saturation | 리소스의 대기 및 포화 정도 |
| Errors | 리소스 관련 오류 |

CPU, Memory, Disk, Network 등의 리소스를 분석할 때 활용할 수 있습니다.

### 18.4. Prometheus와 Grafana

일반적인 Monitoring Architecture는 다음과 같이 구성할 수 있습니다.

```text
NestJS Application
        |
        v
   Metrics Endpoint
        |
        v
     Prometheus
        |
        v
      Grafana
```

Prometheus는 애플리케이션 Metrics를 수집하고 저장할 수 있습니다.

Grafana는 수집된 Metrics를 Dashboard로 시각화하는 데 사용할 수 있습니다.

NestJS에서 Prometheus Metrics를 노출하려면 `prom-client` 등의 라이브러리 또는 별도의 Monitoring Integration이 필요합니다.

NestJS가 모든 Prometheus Metrics를 기본적으로 제공하는 것은 아닙니다.

---

## 19. 성능 최적화 시 주의사항

### 19.1. Premature Optimization

실제 병목을 측정하지 않은 상태에서 최적화를 수행하면 코드의 복잡성만 증가할 수 있습니다.

예를 들어 요청 처리량이 충분한데 HTTP Adapter를 변경하면 성능 개선 효과는 작고 라이브러리 호환성 문제가 발생할 수 있습니다.

### 19.2. 평균값만 확인하는 문제

평균 Latency가 낮더라도 일부 요청에서 큰 지연이 발생할 수 있습니다.

따라서 p95 및 p99 Latency와 Error Rate를 함께 확인해야 합니다.

### 19.3. Cache의 과도한 사용

Cache는 성능을 개선할 수 있지만 다음과 같은 문제도 발생시킬 수 있습니다.

- 데이터 정합성 저하
- Cache Stampede
- Memory 사용량 증가
- Cache Invalidation 복잡성

Cache 적용 여부는 데이터 특성과 접근 패턴을 기준으로 결정해야 합니다.

### 19.4. 무제한 Concurrency

비동기 API를 사용한다고 해서 무제한으로 요청을 병렬 실행하는 것은 적절하지 않습니다.

예를 들어 다음 코드는 모든 작업을 동시에 시작합니다.

```typescript
await Promise.all(
  items.map((item) => processItem(item)),
);
```

`items`의 크기가 매우 크다면 Database Connection, Memory 또는 외부 API의 허용 용량을 초과할 수 있습니다.

이 경우 Concurrency Limit 또는 작업 Queue를 사용하는 것이 좋습니다.

### 19.5. 개발 환경에서의 Benchmark

Development Watch Mode와 Debugger는 운영 환경과 다른 실행 비용을 발생시킬 수 있습니다.

따라서 성능 테스트는 가능한 경우 Production Build를 사용하여 수행해야 합니다.

```bash
npm run build
npm run start:prod
```

`start:prod`는 해당 npm Script가 정의된 프로젝트에서 사용할 수 있습니다.

실제 Benchmark에서는 Node.js 버전, CPU, Memory, Container Resource Limit 등의 조건을 고정해야 합니다.

---

## 20. Performance 개선 절차

실무에서는 다음 순서로 성능 최적화를 진행할 수 있습니다.

### 20.1. Baseline 측정

현재 애플리케이션의 성능을 측정합니다.

```text
RPS
p50 / p95 / p99 Latency
Error Rate
CPU Usage
Memory Usage
Event Loop Delay
Database Query Time
```

### 20.2. Bottleneck 식별

각 지표를 비교하여 성능을 제한하는 구간을 찾습니다.

예를 들어 다음과 같은 상황을 고려할 수 있습니다.

```text
CPU Usage: 25%
Event Loop Delay: Low
Database Query p99: High
HTTP p99 Latency: High
```

이 경우 CPU보다 Database Query 또는 Connection 대기가 병목일 가능성을 우선 조사할 수 있습니다.

이는 하나의 진단 가설이며 추가적인 Database Metrics와 Trace를 통해 확인해야 합니다.

### 20.3. 최적화 적용

Bottleneck에 따라 적절한 개선 방법을 적용합니다.

| Bottleneck | 개선 방법 |
|---|---|
| CPU | 알고리즘 개선, Worker Thread |
| Event Loop | Blocking 작업 제거 |
| Database | Index, Query, Pool 최적화 |
| Memory | Memory Leak 제거, 객체 할당 감소 |
| Network | Compression, 응답 크기 축소 |
| External API | Timeout, Cache, Concurrency Limit |
| Queue | Worker 증설, Job 처리 최적화 |
| Instance Capacity | Horizontal Scaling |

### 20.4. 재측정

최적화 후에는 동일한 조건에서 다시 Benchmark를 수행합니다.

예를 들어 다음 항목을 비교할 수 있습니다.

| 지표 | Before | After |
|---|---:|---:|
| RPS | 500 | 750 |
| p95 Latency | 150ms | 100ms |
| p99 Latency | 400ms | 250ms |
| Error Rate | 1.0% | 0.2% |

위 값은 개선 효과를 비교하는 방법을 설명하기 위한 가상의 예시이며 실제 NestJS Benchmark 결과가 아닙니다.

성능 개선 여부는 Throughput뿐만 아니라 Latency, Error Rate 및 리소스 사용량을 함께 고려하여 판단해야 합니다.

---

## 21. Production Performance 권장 사항

운영 환경에서 NestJS 애플리케이션의 성능을 관리할 때는 다음 사항을 확인하는 것이 좋습니다.

| 항목 | 권장 사항 |
|---|---|
| Runtime | 지원되는 Node.js LTS 사용 |
| Build | Production Build 실행 |
| HTTP Adapter | 호환성과 Benchmark를 기준으로 선택 |
| DI Scope | 기본 Singleton 우선 사용 |
| Event Loop | Blocking 작업 최소화 |
| CPU-bound 작업 | Worker Thread 또는 별도 Worker 활용 |
| Database | Query 및 Connection Pool 최적화 |
| Cache | 적절한 TTL 및 Invalidation |
| Response | 불필요한 데이터 및 변환 최소화 |
| Compression | CPU와 Network 비용 비교 |
| Memory | Heap, RSS, GC 모니터링 |
| Load Testing | 실제 요청 패턴 기반 테스트 |
| Scaling | 병목과 Metrics 기반 확장 |
| Kubernetes | Resource Request 및 Limit 설정 |
| Monitoring | Latency, Error Rate, CPU, Memory 수집 |
| Profiling | 개선 전후 실제 실행 비용 확인 |

성능 최적화에서 중요한 것은 모든 기술을 적용하는 것이 아니라 실제 서비스의 요구사항에 맞는 기술을 선택하는 것입니다.

---

## 22. 관련 문서

Performance와 관련된 상세 주제는 다음 문서에서 다룹니다.

| 문서 | 설명 |
|---|---|
| `production-build.md` | Production Build와 실행 환경 |
| `environment-configuration.md` | 운영 환경 설정 관리 |
| `health-checks.md` | 애플리케이션의 상태 및 준비 여부 확인 |
| `graceful-shutdown.md` | 종료 시 요청 및 리소스 정리 |
| `../01-fundamentals/injection-scopes.md` | Provider Scope와 Instance 생명주기 |
| `../02-request-lifecycle/interceptors.md` | Interceptor의 동작 방식 |
| `../03-techniques/database.md` | Database 통합 및 접근 방식 |
| `../03-techniques/caching.md` | Cache 관리 |
| `../03-techniques/queues.md` | 비동기 Job 및 Worker 처리 |
| `../03-techniques/logging.md` | 운영 Logging |
| `../05-platforms/websocket.md` | WebSocket 통신과 Gateway |

---

## 23. 정리

NestJS의 Performance는 애플리케이션의 요청 처리량, 응답 지연 시간 및 리소스 효율성을 종합적으로 관리하는 개념입니다.

주요 사항은 다음과 같습니다.

1. **Performance Metrics**: Latency, Throughput, RPS, Concurrency 및 Error Rate를 함께 측정해야 합니다.
2. **Node.js Event Loop**: CPU를 장시간 점유하는 동기 작업은 다른 요청의 처리를 지연시킬 수 있습니다.
3. **HTTP Adapter**: Express, Fastify, Node Adapter의 선택은 성능과 호환성을 기준으로 결정해야 합니다.
4. **Dependency Injection**: 불필요한 Request Scope를 줄이고 기본 Singleton Scope를 적절하게 활용합니다.
5. **Request Lifecycle**: Middleware, Guard, Pipe, Interceptor의 불필요한 처리 비용을 최소화합니다.
6. **Database Optimization**: Query, Index, Pagination 및 Connection Pool을 최적화합니다.
7. **Caching**: 반복 조회 비용을 줄이되 데이터 정합성과 Cache Invalidation을 고려해야 합니다.
8. **Background Processing**: CPU 집약적인 작업과 장시간 실행되는 작업을 적절하게 분리합니다.
9. **Memory Management**: Memory Leak과 Garbage Collection의 영향을 관찰해야 합니다.
10. **Profiling과 Load Testing**: 실제 성능 병목을 측정하고 개선 효과를 검증해야 합니다.
11. **Horizontal Scaling**: 인스턴스 수를 확장할 때 공유 리소스의 한계도 함께 고려해야 합니다.
12. **Monitoring**: 운영 환경에서 성능 지표를 지속적으로 수집하고 분석해야 합니다.

NestJS의 성능 최적화는 프레임워크 설정만으로 해결되는 문제가 아닙니다.

Node.js 런타임, 애플리케이션 로직, Database, Cache, Network 및 인프라의 성능이 서로 영향을 주기 때문입니다.

따라서 **성능 측정 → 병목 분석 → 최적화 적용 → 재측정**의 절차를 반복하여 실제 서비스 요구사항을 만족하는지 확인하는 것이 중요합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - HTTP Adapters / Performance](https://docs.nestjs.com/http/performance)
  - HTTP Adapter의 종류, 성능 특성 및 Fastify 기반 애플리케이션 구성을 설명합니다.

- [NestJS - Deployment](https://docs.nestjs.com/deployment)
  - 운영 환경 배포와 애플리케이션 확장에 관한 사항을 설명합니다.

- [NestJS - Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
  - Singleton, Request, Transient Scope와 성능 영향을 설명합니다.

- [NestJS - Caching](https://docs.nestjs.com/techniques/caching)
  - CacheModule, CacheInterceptor 및 Cache 설정 방법을 설명합니다.

- [NestJS - Queues](https://docs.nestjs.com/techniques/queues)
  - BullMQ 기반 Queue와 Background Job 처리 방법을 설명합니다.

- [NestJS - Compression](https://docs.nestjs.com/techniques/compression)
  - HTTP Response Compression을 적용하는 방법을 설명합니다.

- [NestJS - Serialization](https://docs.nestjs.com/techniques/serialization)
  - 응답 데이터의 Serialization과 Transformation을 설명합니다.

### Node.js 공식 문서

- [Node.js - The Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
  - Event Loop의 구조와 비동기 실행 방식을 설명합니다.

- [Node.js - Don't Block the Event Loop](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
  - Event Loop Blocking의 문제와 개선 방법을 설명합니다.

- [Node.js - Worker Threads](https://nodejs.org/api/worker_threads.html)
  - CPU 집약적인 JavaScript 작업의 병렬 처리 방법을 설명합니다.

- [Node.js - Performance Measurement APIs](https://nodejs.org/api/perf_hooks.html)
  - Event Loop Delay, Event Loop Utilization 및 성능 측정 API를 설명합니다.

- [Node.js - Process](https://nodejs.org/api/process.html)
  - CPU 및 Memory 사용량을 포함한 Process 정보 조회 방법을 설명합니다.

- [Node.js - Diagnostics](https://nodejs.org/en/learn/diagnostics)
  - CPU Profiling, Memory 분석 및 성능 문제 진단 방법을 설명합니다.

### Kubernetes 공식 문서

- [Kubernetes - Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
  - HPA의 동작 원리와 Metrics 기반 Replica 조정을 설명합니다.

- [Kubernetes - Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
  - CPU 및 Memory Request와 Limit 설정 방법을 설명합니다.

- [Kubernetes - Resource Metrics Pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
  - Kubernetes의 리소스 Metrics 수집 구조를 설명합니다.

### Load Testing 및 Monitoring

- [Autocannon - GitHub](https://github.com/mcollina/autocannon)
  - Node.js 기반 HTTP Benchmark 도구의 사용 방법을 설명합니다.

- [Grafana k6 - Documentation](https://grafana.com/docs/k6/latest/)
  - Load Testing과 성능 분석 시나리오를 설명합니다.

- [Prometheus - Documentation](https://prometheus.io/docs/introduction/overview/)
  - Metrics 수집 및 Monitoring System의 기본 구조를 설명합니다.

- [Grafana - Documentation](https://grafana.com/docs/grafana/latest/)
  - Metrics Dashboard 및 시각화 방법을 설명합니다.