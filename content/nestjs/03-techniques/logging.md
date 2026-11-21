# Logging

## 1. 개요

Logging은 애플리케이션 실행 중 발생하는 이벤트, 상태 변경, 오류 및 처리 결과를 기록하는 기능입니다.

백엔드 애플리케이션에서는 HTTP 요청, 데이터베이스 작업, 외부 API 호출, 비동기 작업, 시스템 오류 등 다양한 이벤트가 발생합니다.

이러한 정보를 로그로 기록하면 애플리케이션의 동작을 추적하고 장애의 원인을 분석할 수 있습니다.

NestJS는 기본적으로 `@nestjs/common` 패키지의 `Logger`와 `ConsoleLogger`를 통해 로깅 기능을 제공합니다.

또한 `LoggerService` 인터페이스를 통해 사용자 정의 Logger를 구현하거나 Winston, Pino 등의 외부 로깅 라이브러리와 연동할 수 있습니다.

주요 기능은 다음과 같습니다.

- 애플리케이션 시작 및 종료 과정의 시스템 로그 기록
- 로그 레벨에 따른 출력 제어
- Controller와 Service 단위의 애플리케이션 로그 기록
- Context 기반 로그 구분
- 사용자 정의 Logger 구현
- Dependency Injection 기반 Logger 관리
- JSON 기반 구조화 로그 출력
- HTTP 요청 및 응답 로깅
- Request ID 및 Trace ID 기반 요청 추적
- 외부 로그 수집 시스템 연동

Logging은 단순한 디버깅 도구를 넘어 운영 환경의 Observability를 구성하는 핵심 요소입니다.

## 2. Logging이 필요한 이유

### 2.1. 애플리케이션 동작 추적

애플리케이션은 여러 컴포넌트가 상호작용하며 요청을 처리합니다.

예를 들어 주문 생성 과정에서는 다음과 같은 작업이 발생할 수 있습니다.

```text
HTTP Request
     |
     v
OrdersController
     |
     v
OrdersService
     |
     +-- Validate Order
     |
     +-- Check Inventory
     |
     +-- Save Order
     |
     +-- Request Payment
     |
     v
HTTP Response
```

각 단계의 주요 상태를 로그로 기록하면 요청이 어떤 과정을 거쳤는지 확인할 수 있습니다.

### 2.2. 오류 원인 분석

애플리케이션에서 오류가 발생하면 단순한 오류 메시지만으로 원인을 확인하기 어려울 수 있습니다.

예를 들어 다음과 같은 정보가 필요합니다.

- 오류가 발생한 시각
- 오류가 발생한 클래스 또는 모듈
- 요청한 API
- 관련 리소스 식별자
- 오류 유형
- Stack Trace
- 관련 외부 시스템의 상태

로그를 적절하게 구성하면 이러한 정보를 바탕으로 장애를 분석할 수 있습니다.

### 2.3. 운영 상태 모니터링

운영 환경에서는 로그를 수집하고 분석하여 다음과 같은 문제를 확인할 수 있습니다.

- HTTP 5xx 오류 증가
- 외부 API Timeout
- 데이터베이스 연결 실패
- 비동기 작업 처리 실패
- 반복적인 재시도 발생
- 특정 기능의 처리 지연

단, 로그는 모든 성능 지표를 대체하지 않습니다.

애플리케이션의 상태를 종합적으로 관찰하려면 Metrics 및 Tracing과 함께 사용하는 것이 좋습니다.

## 3. NestJS Logging 아키텍처

NestJS의 기본 로깅 시스템은 다음 구성 요소를 중심으로 동작합니다.

```text
NestJS Application
        |
        +-- System Logging
        |       |
        |       +-- Bootstrap
        |       +-- Module Initialization
        |       +-- Exceptions
        |
        +-- Application Logging
                |
                +-- Controller
                +-- Service
                +-- Gateway
                +-- Background Worker
                        |
                        v
                      Logger
                        |
                        v
                  ConsoleLogger
                        |
                        v
                  stdout / stderr
```

주요 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| `Logger` | 애플리케이션에서 로그를 기록하기 위한 기본 API |
| `ConsoleLogger` | 로그의 출력 형식과 출력 대상을 관리하는 기본 구현체 |
| `LoggerService` | 사용자 정의 Logger가 구현할 수 있는 인터페이스 |
| `LogLevel` | 로그의 심각도와 출력 범위를 표현하는 타입 |
| `NestFactory` | 애플리케이션 생성 시 Logger 설정 |
| `app.useLogger()` | 애플리케이션의 시스템 Logger 설정 또는 변경 |

NestJS의 `Logger`는 기본적으로 `ConsoleLogger`를 통해 로그를 출력합니다.

사용자 정의 Logger가 등록되면 `Logger`를 사용하는 애플리케이션 코드에서도 해당 구현체의 출력 동작을 활용할 수 있습니다.

## 4. 기본 Logger 사용

NestJS의 `Logger`는 별도의 추가 패키지 설치 없이 사용할 수 있습니다.

### 4.1. Logger 생성

Service에서 Logger를 사용하려면 다음과 같이 작성합니다.

`users/users.service.ts`

```typescript
import {
  Injectable,
  Logger,
} from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(
    UsersService.name,
  );

  findAll() {
    this.logger.log('Fetching users');

    return [];
  }
}
```

`new Logger(UsersService.name)`은 `UsersService`를 로그의 Context로 지정합니다.

Context는 로그가 발생한 컴포넌트를 구분하는 데 사용됩니다.

### 4.2. 로그 출력 형식

기본 텍스트 로그는 다음과 유사한 형식으로 출력됩니다.

```text
[Nest] 12345 - 11/21/2026, 10:00:00 AM LOG [UsersService] Fetching users
```

각 요소의 의미는 다음과 같습니다.

| 요소 | 설명 |
|---|---|
| `Nest` | 로그 출력 Prefix |
| `12345` | 프로세스 ID |
| 날짜 및 시간 | 로그가 기록된 시각 |
| `LOG` | 로그 레벨 |
| `UsersService` | Logger Context |
| `Fetching users` | 로그 메시지 |

실제 출력 형식은 Logger 설정과 실행 환경에 따라 달라집니다.

## 5. 로그 레벨

NestJS는 여섯 가지 기본 로그 레벨을 제공합니다.

| 로그 레벨 | 설명 | 주요 사용 목적 |
|---|---|---|
| `fatal` | 애플리케이션 정상 운영이 어려운 치명적인 오류 | 복구 불가능한 장애 |
| `error` | 요청이나 작업 처리 중 발생한 오류 | 예외 및 작업 실패 |
| `warn` | 비정상적인 상황이나 잠재적인 문제 | 재시도, 임계값 접근 |
| `log` | 일반적인 애플리케이션 이벤트 | 요청 처리 및 주요 상태 변경 |
| `debug` | 개발 및 디버깅을 위한 상세 정보 | 내부 상태 분석 |
| `verbose` | 매우 상세한 실행 정보 | 세부 실행 흐름 추적 |

심각도를 기준으로 정렬하면 다음과 같습니다.

```text
Higher Severity
      |
      v
    fatal
    error
    warn
    log
    debug
    verbose
      |
      v
Lower Severity
```

### 5.1. log()

일반적인 이벤트를 기록합니다.

```typescript
this.logger.log('User created successfully');
```

주요 비즈니스 이벤트나 시스템 상태 변경을 기록하는 데 사용할 수 있습니다.

### 5.2. error()

오류가 발생했을 때 사용합니다.

```typescript
this.logger.error(
  'Failed to create user',
);
```

예외의 Stack Trace를 함께 기록할 수도 있습니다.

```typescript
try {
  await this.createUser();
} catch (error) {
  if (error instanceof Error) {
    this.logger.error(
      error.message,
      error.stack,
    );
  }

  throw error;
}
```

오류를 기록한 다음 다시 전달할 때는 상위 계층에서도 동일한 오류가 기록될 수 있다는 점을 고려해야 합니다.

### 5.3. warn()

잠재적인 문제나 복구 가능한 비정상 상황을 기록합니다.

```typescript
this.logger.warn(
  'External API response is delayed',
);
```

예를 들어 외부 API 요청이 일시적으로 실패하여 재시도하는 상황에 사용할 수 있습니다.

### 5.4. debug()

개발 과정에서 내부 상태를 확인할 때 사용합니다.

```typescript
this.logger.debug(
  'Starting database query',
);
```

운영 환경에서 지나치게 많은 Debug 로그를 출력하면 로그 처리 비용이 증가할 수 있습니다.

### 5.5. verbose()

매우 상세한 실행 흐름을 기록합니다.

```typescript
this.logger.verbose(
  'Entering findAll method',
);
```

빈번하게 실행되는 코드에 적용하면 로그량이 크게 증가할 수 있으므로 필요할 때 선택적으로 활성화하는 것이 좋습니다.

### 5.6. fatal()

치명적인 오류를 기록할 때 사용합니다.

```typescript
this.logger.fatal(
  'Application initialization failed',
);
```

`fatal()`을 호출한다고 해서 Node.js 프로세스가 자동으로 종료되는 것은 아닙니다.

애플리케이션을 종료해야 한다면 적절한 종료 처리 로직을 별도로 구현해야 합니다.

## 6. 로그 레벨 설정

NestJS에서는 애플리케이션을 생성할 때 로그 레벨을 설정할 수 있습니다.

### 6.1. NestFactory 설정

`main.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: [
      'log',
      'warn',
      'error',
      'fatal',
    ],
  });

  await app.listen(3000);
}

void bootstrap();
```

위 예제에서는 일반 로그, 경고 및 오류 관련 로그를 활성화합니다.

### 6.2. 로그 레벨의 우선순위

NestJS의 로그 레벨은 심각도를 기준으로 동작합니다.

예를 들어 다음과 같이 설정할 수 있습니다.

```typescript
logger: ['warn']
```

이 경우 `warn`뿐 아니라 더 심각한 `error`, `fatal`도 활성화됩니다.

반면 다음 설정은 단순히 하나의 임계값으로 처리되지 않습니다.

```typescript
logger: ['debug', 'error']
```

이 경우 `debug`, `error`, `fatal`이 활성화되며 `log`, `warn`, `verbose`는 활성화되지 않습니다.

따라서 로그 레벨을 명확하게 설정하려면 필요한 레벨을 직접 나열하거나 공식 필터 API를 사용하는 것이 좋습니다.

### 6.3. filterLogLevels()

NestJS는 로그 레벨 범위를 구성하기 위한 `filterLogLevels()`를 제공합니다.

```typescript
import {
  filterLogLevels,
} from '@nestjs/common';

const logLevels = filterLogLevels(
  '>=warn',
);
```

`>=warn`은 `warn` 이상의 심각도를 가진 로그를 활성화합니다.

주요 표현은 다음과 같습니다.

| 표현 | 의미 |
|---|---|
| `>=warn` | warn 이상 |
| `>warn` | warn보다 심각한 레벨 |
| `log,error` | 지정한 레벨 및 관련 심각도 규칙 적용 |
| `debug` | debug 및 그보다 심각한 레벨 |

지원되지 않는 표현이나 알 수 없는 레벨에 대한 동작은 설정 형식에 따라 다릅니다.

예를 들어 `>` 또는 `>=` 뒤에 알 수 없는 레벨을 지정하면 오류가 발생할 수 있습니다.

### 6.4. NEST_LOG_LEVEL

NestJS의 기본 `ConsoleLogger`는 `NEST_LOG_LEVEL` 환경 변수를 지원합니다.

`.env`

```env
NEST_LOG_LEVEL=>=warn
```

또는 실행 시 환경 변수를 전달할 수 있습니다.

```bash
NEST_LOG_LEVEL='>=warn' node dist/main.js
```

명시적인 로그 레벨을 코드에서 설정하면 해당 설정이 환경 변수보다 우선합니다.

`NEST_LOG_LEVEL`을 이용하면 개발과 운영 환경에서 로그 출력 범위를 다르게 설정할 수 있습니다.

### 6.5. Logging 비활성화

모든 시스템 로그 출력을 비활성화하려면 다음과 같이 설정합니다.

```typescript
const app = await NestFactory.create(AppModule, {
  logger: false,
});
```

이 설정은 NestJS의 기본 로깅 출력을 비활성화합니다.

외부 라이브러리가 직접 `console.log()` 등을 호출하는 경우까지 모두 차단하는 것은 아닙니다.

운영 환경에서는 로그를 완전히 비활성화하기보다 적절한 로그 레벨을 설정하는 것이 일반적으로 적절합니다.

## 7. ConsoleLogger

`ConsoleLogger`는 NestJS에서 제공하는 기본 로그 출력 구현체입니다.

텍스트 출력, JSON 출력, 로그 레벨 및 Prefix 등을 설정할 수 있습니다.

### 7.1. 기본 설정

```typescript
import {
  ConsoleLogger,
} from '@nestjs/common';

const app = await NestFactory.create(AppModule, {
  logger: new ConsoleLogger(),
});
```

### 7.2. 색상 비활성화

```typescript
logger: new ConsoleLogger({
  colors: false,
})
```

터미널 색상 코드가 필요 없는 환경에서 사용할 수 있습니다.

### 7.3. Prefix 설정

```typescript
logger: new ConsoleLogger({
  prefix: 'MarketDataAPI',
})
```

로그의 기본 Prefix를 변경할 수 있습니다.

### 7.4. Timestamp 설정

`ConsoleLogger`는 로그의 시간 표현과 관련된 옵션을 제공합니다.

예를 들어 `Logger` 인스턴스 생성 시 `timestamp` 옵션을 사용할 수 있습니다.

```typescript
private readonly logger = new Logger(
  UsersService.name,
  {
    timestamp: true,
  },
);
```

이 설정은 기본 텍스트 로그에 이전 로그 출력과의 경과 시간을 표시합니다.

각 로그에 현재 시각을 별도로 추가하는 기능과는 구분해야 합니다.

## 8. JSON 기반 구조화 로깅

Structured Logging은 로그를 단순 문자열이 아니라 필드와 값으로 구성된 데이터로 기록하는 방식입니다.

예를 들어 일반 텍스트 로그는 다음과 같습니다.

```text
Order created: orderId=1001, userId=200
```

구조화 로그는 다음과 같이 표현할 수 있습니다.

```json
{
  "level": "log",
  "message": "Order created",
  "context": "OrdersService",
  "params": {
    "orderId": 1001,
    "userId": 200
  }
}
```

이 방식은 로그 수집 시스템에서 특정 필드를 기준으로 검색하고 집계하는 데 유용합니다.

### 8.1. JSON Logging 활성화

`main.ts`

```typescript
import {
  ConsoleLogger,
} from '@nestjs/common';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: true,
    }),
  });

  await app.listen(3000);
}

void bootstrap();
```

`json: true`를 지정하면 로그가 JSON 형식으로 출력됩니다.

### 8.2. 구조화 파라미터

NestJS v12부터는 로그 메시지 뒤에 전달한 일반 객체를 구조화된 파라미터로 처리할 수 있습니다.

```typescript
this.logger.log(
  'Order created',
  {
    orderId: 1001,
    userId: 200,
  },
);
```

JSON 출력 모드에서는 다음과 유사한 결과를 얻을 수 있습니다.

```json
{
  "level": "log",
  "message": "Order created",
  "context": "OrdersService",
  "params": {
    "orderId": 1001,
    "userId": 200
  }
}
```

실제 로그에는 프로세스 ID, Timestamp 등의 추가 필드가 포함될 수 있습니다.

### 8.3. flattenParams

로그 수집 시스템에서 최상위 필드를 기준으로 검색해야 한다면 `flattenParams` 옵션을 사용할 수 있습니다.

```typescript
logger: new ConsoleLogger({
  json: true,
  flattenParams: true,
})
```

이 경우 구조화 파라미터를 최상위 필드에 배치할 수 있습니다.

예를 들어 `params.orderId` 대신 `orderId`를 최상위 속성으로 사용할 수 있습니다.

### 8.4. 구조화 로깅의 장점

구조화 로그는 다음과 같은 작업에 유용합니다.

- 특정 사용자 또는 주문의 처리 이력 검색
- 로그 레벨별 오류 집계
- 특정 API의 실패 원인 분석
- 서비스별 로그 필터링
- Request ID 또는 Trace ID 기반 요청 추적
- 로그 수집 시스템의 필드 기반 검색

다만 로그 구조가 일정하지 않으면 필드 기반 분석이 어려워지므로 공통 필드 명명 규칙을 정의하는 것이 좋습니다.

## 9. Custom Logger

NestJS에서는 기본 Logger를 확장하거나 완전히 새로운 Logger를 구현할 수 있습니다.

대표적인 방법은 다음과 같습니다.

1. `ConsoleLogger` 상속
2. `LoggerService` 인터페이스 구현
3. 외부 로깅 라이브러리와 연동

### 9.1. ConsoleLogger 확장

기본 로그 출력 방식을 일부 변경하려면 `ConsoleLogger`를 상속할 수 있습니다.

`common/logger/custom-logger.service.ts`

```typescript
import {
  ConsoleLogger,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class CustomLogger extends ConsoleLogger {
  error(
    message: any,
    ...optionalParams: any[]
  ) {
    // 사용자 정의 오류 로깅 처리

    super.error(
      message,
      ...optionalParams,
    );
  }
}
```

`super.error()`를 호출하면 기본 Logger의 출력 기능을 유지할 수 있습니다.

이 방식은 기존 Logger의 기능을 최대한 활용하면서 필요한 부분만 확장하는 데 적합합니다.

### 9.2. Timestamp 형식 변경

`ConsoleLogger`의 `getTimestamp()` 메서드를 재정의하여 텍스트 로그의 시간 형식을 변경할 수 있습니다.

```typescript
import {
  ConsoleLogger,
} from '@nestjs/common';

export class IsoTimestampLogger
  extends ConsoleLogger
{
  protected getTimestamp(): string {
    return new Date().toISOString();
  }
}
```

ISO 8601 형식의 Timestamp를 사용할 수 있습니다.

다만 JSON 출력 모드에서는 Timestamp가 Unix Epoch Milliseconds 형식으로 기록되므로 위 메서드의 영향 범위와 구분해야 합니다.

## 10. LoggerService

`LoggerService`는 사용자 정의 Logger가 구현할 수 있는 인터페이스입니다.

### 10.1. LoggerService 구현

```typescript
import {
  Injectable,
  LoggerService,
  LogLevel,
} from '@nestjs/common';

@Injectable()
export class MyLogger implements LoggerService {
  log(
    message: any,
    ...optionalParams: any[]
  ): void {
    console.log(message, ...optionalParams);
  }

  error(
    message: any,
    ...optionalParams: any[]
  ): void {
    console.error(message, ...optionalParams);
  }

  warn(
    message: any,
    ...optionalParams: any[]
  ): void {
    console.warn(message, ...optionalParams);
  }

  fatal(
    message: any,
    ...optionalParams: any[]
  ): void {
    console.error(message, ...optionalParams);
  }

  debug(
    message: any,
    ...optionalParams: any[]
  ): void {
    console.debug(message, ...optionalParams);
  }

  verbose(
    message: any,
    ...optionalParams: any[]
  ): void {
    console.debug(message, ...optionalParams);
  }

  setLogLevels(levels: LogLevel[]): void {
    // 로그 레벨 설정 로직
  }
}
```

이 예제는 인터페이스 구현 구조를 설명하기 위한 단순한 구현입니다.

실제 로그 레벨 필터링, 구조화 로그 생성, Context 관리 및 Error 처리까지 완전히 구현한 것은 아닙니다.

`LoggerService`의 선택적 메서드를 포함하여 구현 범위를 결정할 수 있습니다.

### 10.2. LoggerService의 주요 메서드

| 메서드 | 역할 |
|---|---|
| `log()` | 일반 로그 출력 |
| `error()` | 오류 로그 출력 |
| `warn()` | 경고 로그 출력 |
| `fatal()` | 치명적 오류 로그 출력 |
| `debug()` | 디버그 로그 출력 |
| `verbose()` | 상세 로그 출력 |
| `setLogLevels()` | 활성화할 로그 레벨 설정 |

사용자 정의 Logger에서 로그 레벨 변경 기능을 지원하려면 `setLogLevels()`의 동작을 적절하게 구현해야 합니다.

## 11. Dependency Injection 기반 Logger

사용자 정의 Logger가 `ConfigService`나 다른 Provider에 의존해야 한다면 NestJS의 Dependency Injection을 사용할 수 있습니다.

### 11.1. 프로젝트 구조

```text
src/
├── common/
│   └── logger/
│       ├── logger.module.ts
│       └── custom-logger.service.ts
│
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── app.module.ts
└── main.ts
```

### 11.2. CustomLogger 작성

`custom-logger.service.ts`

```typescript
import {
  ConsoleLogger,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class CustomLogger extends ConsoleLogger {
  protected getTimestamp(): string {
    return new Date().toISOString();
  }
}
```

### 11.3. LoggerModule 등록

`logger.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { CustomLogger } from './custom-logger.service';

@Module({
  providers: [CustomLogger],
  exports: [CustomLogger],
})
export class LoggerModule {}
```

### 11.4. AppModule에서 Import

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [LoggerModule],
})
export class AppModule {}
```

### 11.5. 시스템 Logger 교체

`main.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { CustomLogger } from './common/logger/custom-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(
    app.get(CustomLogger),
  );

  await app.listen(3000);
}

void bootstrap();
```

`app.get(CustomLogger)`는 NestJS DI Container에서 등록된 Logger 인스턴스를 조회합니다.

`app.useLogger()`는 해당 Logger를 NestJS의 시스템 로깅에 사용하도록 설정합니다.

이후 일반적인 `Logger` 인스턴스의 로그 호출도 변경된 Logger 구현으로 전달될 수 있습니다.

## 12. bufferLogs

애플리케이션 시작 시에는 DI Container가 완전히 초기화되지 않은 상태입니다.

따라서 DI를 이용하여 생성하는 사용자 정의 Logger는 애플리케이션 생성 과정의 초기 로그를 즉시 처리하지 못할 수 있습니다.

이 문제를 해결하기 위해 `bufferLogs` 옵션을 사용할 수 있습니다.

```typescript
const app = await NestFactory.create(AppModule, {
  bufferLogs: true,
});

app.useLogger(app.get(CustomLogger));
```

`bufferLogs: true`는 애플리케이션 초기화 중 발생하는 로그를 버퍼에 저장합니다.

이후 사용자 정의 Logger가 등록되면 저장된 로그를 전달할 수 있습니다.

기본적으로 로그 버퍼는 자동으로 Flush되며, 필요한 경우 다음 옵션을 사용할 수 있습니다.

```typescript
const app = await NestFactory.create(AppModule, {
  bufferLogs: true,
  autoFlushLogs: false,
});
```

이 경우 명시적인 Flush 처리가 필요할 수 있습니다.

로그 버퍼는 무제한 장기 저장소가 아니므로 초기화가 완료되지 않은 상태를 장시간 유지하지 않도록 주의해야 합니다.

## 13. HTTP 요청 로깅

HTTP 요청 로깅은 클라이언트 요청의 처리 결과와 소요 시간을 기록하는 기능입니다.

대표적인 로그 정보는 다음과 같습니다.

| 필드 | 설명 |
|---|---|
| `method` | HTTP Method |
| `url` | 요청 경로 |
| `statusCode` | HTTP 응답 상태 코드 |
| `durationMs` | 요청 처리 소요 시간 |
| `requestId` | 요청 식별자 |
| `timestamp` | 로그 생성 시각 |

HTTP 요청 로깅은 Middleware 또는 Interceptor로 구현할 수 있습니다.

### 13.1. LoggingInterceptor

NestJS의 Interceptor를 활용하면 Handler의 실행 전후에 로깅 기능을 적용할 수 있습니다.

`common/interceptors/logging.interceptor.ts`

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';

import {
  Observable,
  finalize,
} from 'rxjs';

@Injectable()
export class LoggingInterceptor
  implements NestInterceptor
{
  private readonly logger = new Logger(
    LoggingInterceptor.name,
  );

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest();

    const response = context
      .switchToHttp()
      .getResponse();

    const start = performance.now();

    return next.handle().pipe(
      finalize(() => {
        const durationMs =
          performance.now() - start;

        this.logger.log(
          'HTTP request handled',
          {
            method: request.method,
            path: request.route?.path ?? request.url,
            statusCode: response.statusCode,
            durationMs: Math.round(durationMs),
          },
        );
      }),
    );
  }
}
```

`finalize()`는 Observable이 완료되거나 오류 또는 구독 해제로 종료될 때 실행됩니다.

이 예제의 측정 시간은 Interceptor 실행 구간을 기준으로 하며 네트워크 전송이 완전히 끝나는 시점까지의 시간을 의미하지는 않습니다.

또한 Interceptor 이전 단계에서 요청이 차단되면 해당 Interceptor가 실행되지 않을 수 있습니다.

### 13.2. 전역 Interceptor 등록

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

`APP_INTERCEPTOR`는 NestJS의 Dependency Injection을 통해 전역 Interceptor를 등록하는 Token입니다.

### 13.3. Middleware와 Interceptor 비교

| 구분 | Middleware | Interceptor |
|---|---|---|
| 주요 실행 위치 | 요청 처리 초반 | Handler 실행 전후 |
| HTTP 요청 접근 | 가능 | 가능 |
| Handler 실행 결과 접근 | 일반적으로 직접 접근하지 않음 | 가능 |
| NestJS ExecutionContext | 제공되지 않음 | 제공 |
| 요청 처리 시간 측정 | 가능 | 가능 |
| Guard에서 차단된 요청 관찰 | 적절한 위치에 등록하면 가능 | 일반적으로 불가능 |

HTTP 응답 전체의 완료 여부와 전송 시간을 측정해야 한다면 HTTP Adapter의 응답 완료 이벤트를 사용하는 Middleware 방식도 고려할 수 있습니다.

## 14. Request ID와 Correlation ID

여러 요청이 동시에 처리되는 환경에서는 로그가 서로 섞여 출력됩니다.

따라서 특정 요청과 관련된 로그를 구분하기 위한 식별자가 필요합니다.

### 14.1. Request ID

Request ID는 개별 HTTP 요청을 식별하는 값입니다.

예를 들어 다음과 같이 로그를 구성할 수 있습니다.

```json
{
  "requestId": "req-1001",
  "message": "Order validation started"
}
```

다른 Service의 로그에도 동일한 Request ID를 포함하면 하나의 요청 처리 흐름을 추적하기 쉬워집니다.

### 14.2. Correlation ID

Correlation ID는 여러 컴포넌트 또는 서비스에 걸쳐 발생하는 관련 작업을 연결하기 위한 식별자입니다.

예를 들어 다음과 같은 구조를 생각할 수 있습니다.

```text
Client
   |
   | Correlation ID: abc-123
   v
API Gateway
   |
   v
OrdersService
   |
   v
PaymentService
   |
   v
External Payment API
```

각 컴포넌트가 동일한 Correlation ID를 로그에 포함하면 서비스 간 작업을 연결할 수 있습니다.

### 14.3. AsyncLocalStorage

Node.js는 비동기 실행 흐름에 데이터를 연결하기 위한 `AsyncLocalStorage`를 제공합니다.

이를 이용하면 함수의 모든 인자로 Request ID를 전달하지 않고도 요청 범위의 Context를 관리할 수 있습니다.

NestJS에서는 `AsyncLocalStorage`를 Provider와 Middleware 등으로 구성하는 방법을 사용할 수 있습니다.

일반적인 동작 구조는 다음과 같습니다.

```text
Incoming Request
       |
       v
Request Context Middleware
       |
       +-- Generate Request ID
       |
       +-- AsyncLocalStorage.run()
       |
       v
Controller
       |
       v
Service
       |
       v
Logger
       |
       v
Log with Request ID
```

`AsyncLocalStorage`는 비동기 실행 Context를 보존하기 위한 기능이며, 로그에 Request ID를 자동으로 추가하는 기능 자체는 별도로 구현하거나 로깅 시스템과 연동해야 합니다.

### 14.4. Trace ID

Trace ID는 Distributed Tracing에서 하나의 분산 작업 흐름을 식별하는 데 사용합니다.

OpenTelemetry와 같은 기술을 이용하면 여러 서비스에 걸친 요청을 Trace와 Span으로 분석할 수 있습니다.

NestJS의 Observability 통합 기능이나 외부 OpenTelemetry SDK를 사용하여 로그와 Trace를 연결할 수 있습니다.

Request ID와 Trace ID는 유사한 목적으로 활용될 수 있지만 완전히 동일한 개념은 아닙니다.

## 15. Pino와 Winston

NestJS의 기본 Logger 외에도 외부 로깅 라이브러리를 사용할 수 있습니다.

대표적인 Node.js 로깅 라이브러리는 Pino와 Winston입니다.

### 15.1. Pino

Pino는 구조화된 JSON 로그와 처리 성능을 중시하는 Node.js 로깅 라이브러리입니다.

주요 특징은 다음과 같습니다.

- JSON 기반 로그 출력
- 구조화된 필드 관리
- Child Logger
- 다양한 로그 레벨
- HTTP 요청 로깅 통합
- 로그 직렬화 및 Redaction 기능

NestJS에서는 `nestjs-pino`와 같은 통합 라이브러리를 사용할 수 있습니다.

### 15.2. Winston

Winston은 다양한 Transport를 이용하여 로그를 출력할 수 있는 Node.js 로깅 라이브러리입니다.

주요 특징은 다음과 같습니다.

- Console Transport
- File Transport
- HTTP Transport
- 사용자 정의 Transport
- 로그 Format 구성
- 로그 레벨 관리

NestJS에서는 `nest-winston`과 같은 통합 라이브러리를 사용할 수 있습니다.

### 15.3. 비교

| 항목 | NestJS ConsoleLogger | Pino | Winston |
|---|---|---|---|
| 기본 제공 | NestJS 기본 | 별도 설치 | 별도 설치 |
| JSON Logging | 지원 | 지원 | 지원 |
| Structured Logging | 지원 | 지원 | 지원 |
| 다양한 Transport | 제한적 | 별도 연동 가능 | 주요 특징 |
| 사용자 정의 Format | 지원 범위 내 설정 및 확장 | Serializer 등 | Format API |
| HTTP Logging | 별도 구성 | 관련 통합 지원 | 별도 구성 |
| 주요 장점 | NestJS와의 직접 통합 | 효율적인 구조화 로깅 | 유연한 출력 구성 |

최신 NestJS는 기본 Logger만으로도 JSON 및 구조화 로그를 제공하므로 모든 프로젝트에서 외부 Logger를 도입해야 하는 것은 아닙니다.

추가적인 Transport, 세밀한 Redaction, 특정 로깅 생태계와의 통합 또는 대규모 로그 처리 요구사항이 있는 경우 외부 라이브러리를 검토할 수 있습니다.

## 16. nestjs-pino 연동

Pino 기반 Logger를 NestJS와 통합하는 방법을 살펴봅니다.

이 절의 코드는 NestJS 기본 기능이 아닌 외부 통합 라이브러리를 사용하는 예제입니다.

### 16.1. 패키지 설치

```bash
npm install nestjs-pino pino-http
```

개발 환경에서 로그를 읽기 쉬운 형태로 출력하려면 `pino-pretty`를 추가할 수 있습니다.

```bash
npm install -D pino-pretty
```

### 16.2. LoggerModule 등록

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'info',
      },
    }),
  ],
})
export class AppModule {}
```

`LoggerModule.forRoot()`는 Pino 기반 HTTP 로깅 기능을 등록합니다.

세부 설정 옵션은 `nestjs-pino`와 `pino-http`의 버전에 따라 달라질 수 있습니다.

### 16.3. 시스템 Logger 연결

```typescript
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  await app.listen(3000);
}

void bootstrap();
```

이 방식으로 NestJS의 시스템 로그를 Pino 기반 Logger에 연결할 수 있습니다.

### 16.4. 애플리케이션 로그

```typescript
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class OrdersService {
  constructor(
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(
      OrdersService.name,
    );
  }

  createOrder(orderId: number): void {
    this.logger.info(
      {
        orderId,
      },
      'Creating order',
    );
  }
}
```

Pino에서는 구조화된 데이터를 메시지와 함께 전달할 수 있습니다.

Logger의 메서드 사용법과 인자 순서는 NestJS 기본 Logger와 다를 수 있으므로 혼용하지 않도록 주의해야 합니다.

## 17. 오류 로깅

오류 로그는 문제의 원인을 분석하는 데 필요한 정보를 제공해야 합니다.

하지만 동일한 오류를 여러 계층에서 반복적으로 기록하면 로그량이 불필요하게 증가하고 원인 분석을 어렵게 만들 수 있습니다.

### 17.1. 오류 처리와 로깅 구분

다음과 같은 구조를 고려할 수 있습니다.

```text
Controller
    |
    v
Service
    |
    v
Repository
    |
    +-- Database Error
             |
             v
         Exception
             |
             v
       Exception Filter
             |
             v
        Error Response
```

Repository에서 발생한 오류를 Service가 변환하거나 다시 전달하고, 최종적인 요청 실패는 Exception Filter에서 기록할 수 있습니다.

단, 모든 애플리케이션에서 오류를 반드시 Exception Filter에서만 기록해야 하는 것은 아닙니다.

중요한 것은 오류의 로깅 책임을 일관되게 정의하는 것입니다.

### 17.2. 오류 로그에 포함할 정보

오류 로그에는 다음과 같은 정보를 포함할 수 있습니다.

- 오류 코드
- 오류 메시지
- Stack Trace
- Request ID
- 관련 리소스 ID
- 실패한 작업의 유형
- 외부 시스템 식별자

### 17.3. 예상 가능한 오류와 시스템 오류

예를 들어 사용자가 존재하지 않는 리소스를 조회하여 발생한 `NotFoundException`은 일반적인 비즈니스 흐름의 일부일 수 있습니다.

반면 데이터베이스 연결 실패나 처리되지 않은 예외는 시스템 장애를 의미할 수 있습니다.

따라서 모든 HTTP 4xx 오류를 `error` 레벨로 기록하기보다 오류 유형과 운영 정책에 따라 로그 레벨을 구분하는 것이 좋습니다.

## 18. WebSocket 및 비동기 작업 로깅

NestJS의 Logger는 HTTP Controller 외에도 WebSocket Gateway와 Background Worker에서 사용할 수 있습니다.

### 18.1. WebSocket Gateway

```typescript
import {
  Logger,
} from '@nestjs/common';

import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';

import { Socket } from 'socket.io';

@WebSocketGateway()
export class MarketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(
    MarketGateway.name,
  );

  handleConnection(client: Socket): void {
    this.logger.log(
      'Client connected',
      {
        socketId: client.id,
      },
    );
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(
      'Client disconnected',
      {
        socketId: client.id,
      },
    );
  }
}
```

이 예제는 Socket.IO 기반 Gateway를 가정합니다.

WebSocket Adapter를 변경하면 클라이언트 객체와 연결 식별 방식이 달라질 수 있습니다.

### 18.2. 실시간 스트리밍 환경의 로깅

WebSocket을 이용한 대규모 실시간 스트리밍 시스템에서는 모든 메시지를 개별적으로 기록하면 로그량이 급격히 증가할 수 있습니다.

예를 들어 다음과 같은 이벤트가 발생할 수 있습니다.

```text
Market Event
     |
     v
Streaming Gateway
     |
     +-- Session 1
     +-- Session 2
     +-- Session 3
     +-- ...
```

각 세션에 전송하는 메시지를 모두 `log` 레벨로 기록하면 실제 데이터 처리 비용 외에 추가적인 로깅 비용이 발생합니다.

따라서 다음 정보를 중심으로 기록하는 것이 적절합니다.

- Gateway 시작 및 종료
- WebSocket 연결 및 해제
- 구독 등록 및 해제
- 비정상적인 연결 종료
- 메시지 전송 실패
- 외부 데이터 소스 연결 장애
- 시스템의 주요 상태 변경

초당 처리 메시지 수, 활성 세션 수, 전송 지연 등의 성능 정보는 개별 로그보다 Metrics로 관리하는 것이 유리할 수 있습니다.

### 18.3. Queue Worker

비동기 작업 처리 시스템에서는 Job ID를 로그에 포함하는 것이 좋습니다.

```typescript
this.logger.log(
  'Job processing started',
  {
    jobId: job.id,
    jobName: job.name,
  },
);
```

작업 실패 시에도 동일한 Job ID를 기록하면 처리 이력을 추적할 수 있습니다.

Queue와 Worker에 대한 자세한 내용은 `queues.md`에서 다룹니다.

## 19. Kubernetes 환경의 Logging

Kubernetes 환경에서는 여러 Pod가 동시에 실행되므로 각 애플리케이션의 로그를 중앙에서 수집하고 분석할 수 있어야 합니다.

### 19.1. 기본 로그 처리 흐름

```text
NestJS Pod 1 ----+
                 |
NestJS Pod 2 ----+--> Log Collection
                 |         |
NestJS Pod 3 ----+         v
                       Log Storage
                            |
                            v
                      Log Dashboard
```

각 Pod는 독립적으로 로그를 출력합니다.

Kubernetes 환경에서는 일반적으로 애플리케이션이 표준 출력 또는 표준 오류로 로그를 기록하도록 구성합니다.

### 19.2. stdout과 stderr

NestJS 기본 Logger는 일반적인 로그를 stdout에, 오류 로그를 stderr에 출력할 수 있습니다.

컨테이너 환경에서는 이러한 출력이 Container Runtime의 로그 처리 기능을 통해 수집됩니다.

로그를 애플리케이션 내부 파일에만 저장하면 Pod 재시작이나 삭제 시 관리가 어려워질 수 있습니다.

### 19.3. kubectl logs

Kubernetes에서는 다음 명령어로 Pod의 로그를 조회할 수 있습니다.

```bash
kubectl logs <pod-name>
```

실시간 로그를 확인하려면 다음 명령어를 사용할 수 있습니다.

```bash
kubectl logs -f <pod-name>
```

Deployment에 속한 Pod의 로그를 조회할 수도 있습니다.

```bash
kubectl logs deployment/nestjs-app
```

여러 Replica를 운영하는 경우 해당 명령어가 모든 Pod의 로그를 자동으로 통합하여 보여준다고 가정해서는 안 됩니다.

전체 Pod의 로그를 통합 검색하려면 별도의 로그 수집 시스템이 필요합니다.

### 19.4. 중앙 집중식 로그 수집

Kubernetes에서 사용할 수 있는 대표적인 로그 수집 구성은 다음과 같습니다.

```text
NestJS Pods
     |
     v
stdout / stderr
     |
     v
Container Runtime Logs
     |
     v
Log Collector
     |
     +-- Fluent Bit
     +-- OpenTelemetry Collector
     +-- Other Collectors
     |
     v
Log Storage
     |
     +-- Loki
     +-- OpenSearch
     +-- Elasticsearch
     |
     v
Grafana / Dashboard
```

위 구성은 가능한 아키텍처의 예시이며 모든 구성 요소를 동시에 사용해야 하는 것은 아닙니다.

### 19.5. Kubernetes 로그 관리 시 주의사항

운영 환경에서는 다음 사항을 고려해야 합니다.

- Pod 및 Namespace 식별 정보
- 애플리케이션 이름과 버전
- 로그의 Timestamp
- JSON 로그의 필드 구조
- 로그 저장 기간
- 로그 수집 비용
- 민감한 정보 마스킹
- 로그 수집 시스템 장애 대응

Pod 이름처럼 실행 환경에 따라 달라지는 값은 애플리케이션 코드에 직접 고정하지 않고 배포 환경에서 메타데이터로 추가할 수 있습니다.

## 20. Logging과 Observability

Observability는 시스템 내부의 상태를 외부에서 수집한 정보를 바탕으로 이해할 수 있도록 하는 개념입니다.

일반적으로 Logs, Metrics, Traces를 함께 활용합니다.

### 20.1. Logs

Logs는 특정 시점에 발생한 이벤트를 기록합니다.

예를 들어 다음과 같습니다.

```text
Payment request failed
```

로그는 장애의 구체적인 상황과 오류 메시지를 확인하는 데 유용합니다.

### 20.2. Metrics

Metrics는 시스템 상태를 수치로 측정합니다.

대표적인 예시는 다음과 같습니다.

- HTTP 요청 수
- HTTP 오류 비율
- 응답 지연 시간
- CPU 사용률
- 메모리 사용량
- 활성 WebSocket 세션 수
- 초당 메시지 처리량

Metrics는 시스템의 상태 변화와 성능 추세를 분석하는 데 유용합니다.

### 20.3. Traces

Tracing은 하나의 요청이 여러 컴포넌트 또는 서비스를 통과하는 과정을 추적합니다.

```text
HTTP Request
     |
     v
API Service
     |
     v
Order Service
     |
     v
Payment Service
     |
     v
Database
```

각 작업 단계의 실행 시간과 관계를 분석할 수 있습니다.

### 20.4. 비교

| 구분 | Logs | Metrics | Traces |
|---|---|---|---|
| 주요 목적 | 이벤트 및 오류 기록 | 상태와 성능 측정 | 요청 처리 흐름 추적 |
| 데이터 형태 | 메시지 및 필드 | 시계열 수치 | Trace 및 Span |
| 주요 질문 | 어떤 오류가 발생했는가? | 문제가 얼마나 자주 발생하는가? | 어느 단계에서 지연되는가? |
| 대표 도구 | Loki, OpenSearch | Prometheus | Jaeger, Tempo |

세 가지 데이터를 연계하면 장애 탐지부터 원인 분석까지의 과정을 효율적으로 수행할 수 있습니다.

## 21. 로그에 포함하지 않아야 하는 정보

Logging은 운영에 필요한 정보를 제공하지만 잘못 사용하면 민감한 데이터를 노출할 수 있습니다.

특히 다음 정보는 로그에 직접 기록하지 않는 것이 좋습니다.

- 사용자 비밀번호
- JWT 및 Refresh Token
- API Key
- 인증 헤더
- 세션 Secret
- 결제 카드 정보
- 불필요한 개인정보
- 데이터베이스 비밀번호

### 21.1. 위험한 로그 예제

```typescript
this.logger.log(
  'Login request',
  {
    email: dto.email,
    password: dto.password,
  },
);
```

이 방식은 사용자의 비밀번호가 로그 저장소에 남을 수 있으므로 피해야 합니다.

### 21.2. 개선된 로그

```typescript
this.logger.log(
  'Login request received',
  {
    requestId,
  },
);
```

로그에는 문제 분석에 필요한 최소한의 정보만 포함하는 것이 좋습니다.

필요한 경우 별도의 Redaction 또는 Masking 정책을 적용해야 합니다.

## 22. Logging 성능 고려사항

로그 출력 역시 CPU, 메모리 및 I/O 자원을 사용합니다.

특히 높은 처리량이 요구되는 애플리케이션에서는 로그 작성 비용을 고려해야 합니다.

### 22.1. 과도한 로그 출력 방지

반복문 내부에서 모든 처리 결과를 출력하는 방식은 주의해야 합니다.

```typescript
for (const event of events) {
  this.logger.log(
    `Processing event: ${event.id}`,
  );
}
```

많은 이벤트를 처리하는 환경에서는 로그량이 급격히 증가할 수 있습니다.

필요한 경우 집계 로그 또는 Metrics를 사용하는 것이 좋습니다.

### 22.2. 로그 레벨에 따른 출력 제한

개발 환경에서는 `debug`, `verbose`를 활성화할 수 있습니다.

운영 환경에서는 필요한 로그 레벨만 활성화하여 출력량을 제한할 수 있습니다.

단, 운영 환경에서도 장애 분석에 필요한 정보를 확보할 수 있도록 적절한 기준을 정해야 합니다.

### 22.3. 비용이 큰 메시지 생성

로그 메시지를 생성할 때 복잡한 객체를 직렬화하면 출력 여부와 관계없이 계산 비용이 발생할 수 있습니다.

NestJS의 기본 Logger에서는 함수 형태로 메시지를 전달하여 로그 레벨이 활성화된 경우에만 메시지를 생성하도록 구성할 수 있습니다.

```typescript
this.logger.debug(
  () => `Cache state: ${JSON.stringify(cacheState)}`,
);
```

이 방식은 비활성화된 로그 레벨에서 불필요한 문자열 생성 비용을 줄이는 데 유용합니다.

사용자 정의 Logger에서도 동일한 지연 평가를 지원하는지는 구현체에 따라 다를 수 있습니다.

### 22.4. 로그 저장 비용

JSON 기반 구조화 로그는 검색과 분석에 유리하지만 필드가 증가하면 로그 데이터의 크기도 증가할 수 있습니다.

따라서 로그의 상세도, 저장 기간, 수집량 및 검색 비용을 함께 고려해야 합니다.

## 23. Logger 테스트

Logger를 사용하는 서비스는 테스트에서 로그 출력 동작을 검증하거나 Mock Logger로 대체할 수 있습니다.

### 23.1. Logger Spy

다음은 Logger 메서드 호출 여부를 확인하는 예제입니다.

```typescript
import {
  Logger,
} from '@nestjs/common';

describe('UsersService', () => {
  it('should log a message', () => {
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});

    try {
      const logger = new Logger('UsersService');

      logger.log('User created');

      expect(logSpy).toHaveBeenCalledWith(
        'User created',
      );
    } finally {
      logSpy.mockRestore();
    }
  });
});
```

이 예제는 로그 출력 메서드의 호출을 확인합니다.

실제 로그 수집 시스템에 데이터가 저장되는지까지 검증하는 것은 아닙니다.

### 23.2. Custom Logger Mock

사용자 정의 Logger를 Provider로 주입하는 경우 테스트에서 해당 Provider를 Mock으로 대체할 수 있습니다.

```typescript
const loggerMock = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const moduleRef = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: CustomLogger,
      useValue: loggerMock,
    },
  ],
}).compile();
```

위 방식은 `UsersService`가 생성자에서 `CustomLogger`를 주입받는 구조를 전제로 합니다.

### 23.3. CapturingLogger

지원되는 NestJS 버전에서는 `@nestjs/testing`의 `CapturingLogger`를 이용하여 테스트 실행 중 생성된 로그를 수집할 수 있습니다.

테스트 모듈의 `setLogger()`와 결합하여 로그 출력 내용을 검증할 수 있습니다.

이 기능은 로그 메시지나 특정 로그 레벨의 출력 여부를 확인하는 테스트에 유용합니다.

## 24. 실무 권장 설계

일반적인 NestJS 프로젝트에서는 다음과 같은 구조를 고려할 수 있습니다.

```text
src/
├── common/
│   ├── logger/
│   │   ├── logger.module.ts
│   │   └── custom-logger.service.ts
│   │
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   │
│   └── middleware/
│       └── request-context.middleware.ts
│
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── orders/
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   └── orders.module.ts
│
├── app.module.ts
└── main.ts
```

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| `logger.module.ts` | 사용자 정의 Logger Provider 등록 |
| `custom-logger.service.ts` | 로그 출력 방식 및 공통 정책 구현 |
| `logging.interceptor.ts` | HTTP 요청 처리 로그 기록 |
| `request-context.middleware.ts` | 요청 식별자 및 Context 관리 |
| Feature Service | 비즈니스 이벤트 로깅 |
| `main.ts` | 전역 Logger 설정 |

프로젝트의 규모가 작고 추가적인 Logger 기능이 필요하지 않다면 별도의 LoggerModule 없이 NestJS 기본 Logger만 사용해도 됩니다.

### 24.1. 권장 사항

1. Logger Context에 클래스 이름을 지정합니다.
2. 로그 레벨을 일관된 기준으로 사용합니다.
3. 운영 환경에서는 JSON 기반 구조화 로그를 고려합니다.
4. 비즈니스 이벤트에는 관련 리소스 식별자를 포함합니다.
5. HTTP 요청 추적을 위해 Request ID 또는 Trace ID를 활용합니다.
6. 민감한 인증 정보와 개인정보를 로그에 기록하지 않습니다.
7. 동일한 예외를 여러 계층에서 중복 기록하지 않도록 합니다.
8. 높은 처리량의 이벤트는 개별 로그보다 Metrics를 우선적으로 고려합니다.
9. 컨테이너 환경에서는 stdout 및 stderr를 이용합니다.
10. 로그 수집 시스템의 저장 기간과 운영 비용을 관리합니다.

## 25. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| Logging | 애플리케이션 이벤트 및 상태 기록 |
| `Logger` | NestJS 기본 로깅 API |
| `ConsoleLogger` | 기본 로그 출력 구현체 |
| `LoggerService` | 사용자 정의 Logger 인터페이스 |
| `LogLevel` | 로그 심각도 표현 |
| `filterLogLevels()` | 로그 레벨 필터 구성 |
| `NEST_LOG_LEVEL` | 환경 변수 기반 로그 레벨 설정 |
| `app.useLogger()` | 시스템 Logger 설정 |
| `bufferLogs` | 초기화 중 발생한 로그 임시 저장 |
| Structured Logging | 필드 기반 구조화 로그 |
| JSON Logging | JSON 형식 로그 출력 |
| `flattenParams` | 구조화 파라미터의 최상위 필드 배치 |
| Request ID | 개별 요청 식별 |
| Correlation ID | 관련 작업 흐름 연결 |
| Trace ID | 분산 추적의 작업 흐름 식별 |
| AsyncLocalStorage | 비동기 실행 Context 관리 |
| Pino | 구조화 로깅 라이브러리 |
| Winston | 다양한 Transport를 지원하는 로깅 라이브러리 |
| Log Collector | 여러 인스턴스의 로그 수집 |
| Observability | 로그, 지표, 추적을 통한 시스템 상태 관찰 |

## 26. 정리

NestJS의 Logging 기능은 애플리케이션에서 발생하는 이벤트, 오류 및 상태 변경을 기록하여 시스템의 동작을 분석하는 데 사용합니다.

기본적으로 `Logger`와 `ConsoleLogger`를 제공하며, 로그 레벨과 Context를 이용하여 출력 내용을 구분할 수 있습니다.

`LoggerService` 인터페이스와 `ConsoleLogger` 상속을 통해 사용자 정의 Logger를 구현할 수 있으며, NestJS의 Dependency Injection과 결합하여 공통 로깅 정책을 적용할 수 있습니다.

최신 NestJS에서는 JSON 기반 구조화 로그와 구조화 파라미터를 지원하므로 별도의 외부 로깅 라이브러리 없이도 다양한 운영 환경의 로그 수집 시스템과 연동할 수 있습니다.

추가적인 Transport, 고급 직렬화 및 로그 처리 기능이 필요한 경우 Pino나 Winston과 같은 외부 라이브러리를 활용할 수 있습니다.

Kubernetes와 같은 분산 환경에서는 여러 애플리케이션 인스턴스의 로그를 중앙에서 수집하고 Request ID 또는 Trace ID를 이용하여 관련 작업을 추적하는 것이 중요합니다.

또한 로그 출력이 시스템 성능과 운영 비용에 영향을 미칠 수 있으므로 로그 레벨, 출력량 및 저장 정책을 적절하게 관리해야 합니다.

Logging은 Metrics 및 Tracing과 함께 애플리케이션의 Observability를 구성하는 핵심 요소입니다.

## 참고 자료

### NestJS 공식 문서

- [NestJS - Logger](https://docs.nestjs.com/techniques/logger)
- [NestJS - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS - Middleware](https://docs.nestjs.com/middleware)
- [NestJS - Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS - Dependency Injection](https://docs.nestjs.com/providers)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - Testing](https://docs.nestjs.com/fundamentals/testing)
- [NestJS - Deployment](https://docs.nestjs.com/deployment)
- [NestJS - Async Local Storage](https://docs.nestjs.com/recipes/async-local-storage)
- [NestJS - Migration Guide](https://docs.nestjs.com/migration-guide)

### 외부 로깅 라이브러리

- [Pino 공식 문서](https://getpino.io/)
- [Pino GitHub Repository](https://github.com/pinojs/pino)
- [nestjs-pino GitHub Repository](https://github.com/iamolegga/nestjs-pino)
- [Winston GitHub Repository](https://github.com/winstonjs/winston)
- [nest-winston GitHub Repository](https://github.com/gremo/nest-winston)

### Observability 및 운영 환경

- [Node.js - Async Context Tracking](https://nodejs.org/api/async_context.html)
- [OpenTelemetry 공식 문서](https://opentelemetry.io/docs/)
- [OpenTelemetry - Logs](https://opentelemetry.io/docs/concepts/signals/logs/)
- [OpenTelemetry - Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Kubernetes - Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Grafana Loki 공식 문서](https://grafana.com/docs/loki/latest/)
- [Fluent Bit 공식 문서](https://docs.fluentbit.io/manual)
- [Prometheus 공식 문서](https://prometheus.io/docs/)