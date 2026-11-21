# Custom Providers

## 1. 개요

NestJS의 **Custom Provider**는 Dependency Injection(DI) Container에 등록할 의존성의 식별자, 구현 클래스, 생성 방식 또는 제공할 값을 개발자가 명시적으로 정의할 수 있도록 지원하는 기능입니다.

NestJS에서는 일반적으로 `@Injectable()` 데코레이터가 적용된 클래스를 Module의 `providers`에 등록하여 사용합니다.

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

이러한 등록 방식은 NestJS가 `UsersService` 인스턴스를 생성하고 의존성을 관리하도록 구성합니다.

그러나 실제 애플리케이션에서는 다음과 같은 요구사항이 발생할 수 있습니다.

- 특정 클래스 대신 다른 구현 클래스를 주입해야 하는 경우
- 환경 변수나 설정값을 Provider로 등록해야 하는 경우
- 외부 라이브러리에서 생성한 객체를 주입해야 하는 경우
- 여러 Provider에 의존하여 객체를 동적으로 생성해야 하는 경우
- 비동기 초기화가 완료된 객체를 주입해야 하는 경우
- 이미 등록된 Provider에 다른 Injection Token을 부여해야 하는 경우
- 테스트 환경에서 실제 구현을 Mock 객체로 대체해야 하는 경우

NestJS는 이러한 요구사항을 처리하기 위해 Custom Provider를 지원합니다.

Custom Provider의 핵심 구성 요소는 **Injection Token과 Provider Definition**입니다.

Injection Token은 의존성을 식별하고, Provider Definition은 해당 토큰에 어떤 값이나 구현을 제공할 것인지 결정합니다.

---

## 2. Standard Provider와 Custom Provider

NestJS에서 가장 일반적인 Provider 등록 방식은 클래스 이름을 직접 등록하는 것입니다.

### 2.1. Standard Provider

다음과 같이 `UsersService`를 등록할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

이 방식은 다음과 같은 명시적인 Provider Definition의 축약형입니다.

```typescript
@Module({
  providers: [
    {
      provide: UsersService,
      useClass: UsersService,
    },
  ],
})
export class UsersModule {}
```

두 방식은 동일한 Injection Token과 구현 클래스를 사용합니다.

| 속성 | 역할 |
|---|---|
| `provide` | Provider를 식별하는 Injection Token을 지정합니다. |
| `useClass` | 해당 Injection Token에 대응하는 인스턴스를 생성할 클래스를 지정합니다. |

위 예제에서 NestJS는 `UsersService`라는 클래스 토큰으로 의존성을 탐색하고, `UsersService` 클래스를 사용하여 인스턴스를 생성합니다.

### 2.2. Custom Provider

Custom Provider를 사용하면 Injection Token과 구현 대상을 분리할 수 있습니다.

```typescript
@Module({
  providers: [
    {
      provide: 'USER_SERVICE',
      useClass: UsersService,
    },
  ],
})
export class UsersModule {}
```

위 예제에서는 `USER_SERVICE`라는 문자열을 Injection Token으로 사용합니다.

따라서 해당 Provider를 주입받으려면 다음과 같이 토큰을 명시해야 합니다.

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_SERVICE')
    private readonly usersService: UsersService,
  ) {}
}
```

여기서 중요한 점은 `UsersService` 타입과 `'USER_SERVICE'` 토큰이 서로 다른 역할을 수행한다는 것입니다.

- `UsersService` 타입은 TypeScript에서 의존성의 구조를 확인하는 데 사용됩니다.
- `'USER_SERVICE'` 토큰은 NestJS가 런타임에 Provider를 탐색하는 데 사용됩니다.

Custom Provider는 이러한 식별자와 구현 대상을 명시적으로 구성할 수 있도록 합니다.

---

## 3. Custom Provider의 등록 방식

NestJS는 다음 네 가지 주요 Custom Provider 등록 방식을 제공합니다.

| 등록 방식 | 설명 | 주요 사용 목적 |
|---|---|---|
| `useValue` | 지정한 값을 그대로 제공합니다. | 설정값, 상수, Mock 객체, 외부 인스턴스 |
| `useClass` | 지정한 클래스의 인스턴스를 생성합니다. | 구현 클래스 선택 및 교체 |
| `useFactory` | Factory 함수의 반환값을 제공합니다. | 동적 생성, 의존성 조합, 비동기 초기화 |
| `useExisting` | 이미 등록된 Provider에 대한 별칭을 제공합니다. | 기존 Provider 인스턴스 재사용 |

각 방식은 Provider의 생성과 제공 방법을 결정합니다.

```text
Injection Token
       │
       ▼
  DI Container
       │
       ├── useValue
       │      └── 기존 값 제공
       │
       ├── useClass
       │      └── 클래스 인스턴스 생성
       │
       ├── useFactory
       │      └── Factory 반환값 제공
       │
       └── useExisting
              └── 기존 Provider 참조
```

이러한 방식은 모두 Module의 `providers` 메타데이터에서 사용할 수 있습니다.

---

## 4. Value Provider: useValue

`useValue`는 미리 정의된 값이나 객체를 Provider로 등록하는 방식입니다.

NestJS가 새로운 클래스 인스턴스를 생성하는 대신 개발자가 지정한 값을 주입합니다.

### 4.1. 기본 사용법

```typescript
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: 'APP_NAME',
      useValue: 'NestJS Application',
    },
  ],
  exports: ['APP_NAME'],
})
export class AppConfigModule {}
```

위 예제에서 `'APP_NAME'`은 Injection Token이며, `'NestJS Application'`은 주입할 값입니다.

### 4.2. 값 주입

문자열 토큰을 사용하는 경우 `@Inject()` 데코레이터를 사용합니다.

```typescript
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor(
    @Inject('APP_NAME')
    private readonly appName: string,
  ) {}

  getAppName(): string {
    return this.appName;
  }
}
```

`AppService`는 `APP_NAME` 토큰에 등록된 문자열을 주입받습니다.

이 Service를 사용하려면 `AppService`가 등록된 Module에서 `APP_NAME` Provider에 접근할 수 있어야 합니다.

### 4.3. 객체 주입

`useValue`는 문자열뿐 아니라 객체도 등록할 수 있습니다.

```typescript
export interface AppOptions {
  name: string;
  port: number;
  debug: boolean;
}

export const APP_OPTIONS = Symbol('APP_OPTIONS');
```

Module에서 다음과 같이 등록합니다.

```typescript
@Module({
  providers: [
    {
      provide: APP_OPTIONS,
      useValue: {
        name: 'NestJS Application',
        port: 3000,
        debug: false,
      } satisfies AppOptions,
    },
  ],
  exports: [APP_OPTIONS],
})
export class AppConfigModule {}
```

Provider를 사용하는 Service에서는 다음과 같이 주입받습니다.

```typescript
@Injectable()
export class AppService {
  constructor(
    @Inject(APP_OPTIONS)
    private readonly options: AppOptions,
  ) {}

  getPort(): number {
    return this.options.port;
  }
}
```

`AppOptions`는 TypeScript Interface이므로 런타임에는 존재하지 않습니다.

실제 Provider 탐색에는 `APP_OPTIONS` Symbol이 사용됩니다.

### 4.4. Mock 객체 등록

`useValue`는 테스트에서 실제 Provider 대신 Mock 객체를 주입하는 데 자주 사용됩니다.

```typescript
const mockUsersService = {
  findAll: () => [
    { id: 1, name: 'Test User' },
  ],
};
```

Mock 객체를 다음과 같이 등록할 수 있습니다.

```typescript
@Module({
  providers: [
    {
      provide: UsersService,
      useValue: mockUsersService,
    },
  ],
})
export class TestUsersModule {}
```

이 경우 `UsersService` 토큰을 요청하는 Consumer는 Mock 객체를 주입받습니다.

단, 실제 Provider가 동시에 같은 토큰으로 등록되지 않도록 Module 구성에 주의해야 합니다.

### 4.5. useValue의 특징

`useValue`의 주요 특징은 다음과 같습니다.

- 문자열, 숫자, 객체, 함수 등 다양한 JavaScript 값을 등록할 수 있습니다.
- 미리 생성된 인스턴스를 DI Container에 제공할 수 있습니다.
- 테스트에서 Mock 또는 Stub 객체를 주입할 때 유용합니다.
- 해당 값을 사용하기 위해 별도의 클래스를 정의할 필요가 없습니다.

다만 객체를 `useValue`로 등록하면 일반적으로 동일한 객체 참조가 여러 Consumer에 전달됩니다.

따라서 변경 가능한 객체를 등록하는 경우 공유 상태에 주의해야 합니다.

또한 외부에서 생성한 객체의 초기화와 종료에 필요한 자원 관리 책임을 별도로 고려해야 합니다.

---

## 5. Class Provider: useClass

`useClass`는 특정 Injection Token에 대응하는 구현 클래스를 지정하는 방식입니다.

NestJS는 해당 클래스를 사용하여 Provider 인스턴스를 생성하고 필요한 의존성을 해결합니다.

### 5.1. 기본 사용법

```typescript
@Module({
  providers: [
    {
      provide: UsersService,
      useClass: UsersService,
    },
  ],
})
export class UsersModule {}
```

이 방식은 일반적인 클래스 기반 Provider 등록과 동일하게 동작합니다.

그러나 `useClass`의 주요 장점은 Injection Token과 구현 클래스를 서로 다르게 지정할 수 있다는 것입니다.

### 5.2. 구현 클래스 교체

애플리케이션 환경에 따라 서로 다른 Logger 구현을 사용한다고 가정합니다.

먼저 공통 계약을 정의합니다.

**logger.service.ts**

```typescript
export abstract class LoggerService {
  abstract log(message: string): void;
}
```

개발 환경에서 사용할 구현 클래스를 정의합니다.

**development-logger.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Injectable()
export class DevelopmentLoggerService
  implements LoggerService {
  log(message: string): void {
    console.log(`[DEV] ${message}`);
  }
}
```

운영 환경에서 사용할 구현 클래스도 정의합니다.

**production-logger.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Injectable()
export class ProductionLoggerService
  implements LoggerService {
  log(message: string): void {
    console.log(`[PROD] ${message}`);
  }
}
```

환경에 따라 구현 클래스를 선택할 수 있습니다.

**logger.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { DevelopmentLoggerService } from './development-logger.service';
import { ProductionLoggerService } from './production-logger.service';

const loggerProvider = {
  provide: LoggerService,
  useClass:
    process.env.NODE_ENV === 'development'
      ? DevelopmentLoggerService
      : ProductionLoggerService,
};

@Module({
  providers: [loggerProvider],
  exports: [LoggerService],
})
export class LoggerModule {}
```

위 예제에서는 `NODE_ENV`에 따라 다른 구현 클래스를 선택합니다.

이는 모듈 메타데이터가 평가되는 시점에 구현 클래스를 선택하는 방식입니다.

구현 클래스가 런타임의 다른 Provider에 의존한다면 NestJS가 해당 의존성을 해결합니다.

### 5.3. Consumer 구현

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly logger: LoggerService,
  ) {}

  findAll() {
    this.logger.log('Finding all users');

    return [];
  }
}
```

`UsersService`는 구체적인 Logger 구현 클래스를 직접 참조하지 않습니다.

`LoggerService`라는 추상 클래스에 의존합니다.

```text
UsersService
     │
     │ depends on
     ▼
LoggerService
     │
     │ useClass
     ▼
DevelopmentLoggerService
           또는
ProductionLoggerService
```

이러한 구조는 구현 클래스가 변경되더라도 Consumer의 코드를 수정할 필요가 없도록 구성하는 데 유용합니다.

### 5.4. useClass와 인스턴스 생성

다음과 같이 서로 다른 Injection Token에 동일한 구현 클래스를 등록할 수 있습니다.

```typescript
@Module({
  providers: [
    {
      provide: 'LOGGER_A',
      useClass: LoggerServiceImpl,
    },
    {
      provide: 'LOGGER_B',
      useClass: LoggerServiceImpl,
    },
  ],
})
export class LoggerModule {}
```

이 예제는 `LoggerServiceImpl`이 실제로 정의된 클래스라고 가정합니다.

위 등록 방식에서는 두 Injection Token이 각각 별도의 Provider Definition을 가집니다.

따라서 기본 Singleton Scope에서도 서로 다른 인스턴스가 생성될 수 있습니다.

반대로 동일한 인스턴스를 여러 토큰으로 참조하려면 `useExisting`을 사용하는 것이 적절합니다.

---

## 6. Factory Provider: useFactory

`useFactory`는 Factory 함수의 반환값을 Provider로 등록하는 방식입니다.

Factory는 설정값이나 다른 Provider를 사용하여 필요한 객체를 생성할 수 있습니다.

`useFactory`는 고정된 값이나 특정 클래스의 단순한 인스턴스 생성으로 해결하기 어려운 경우에 유용합니다.

### 6.1. 기본 사용법

```typescript
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: 'API_BASE_URL',
      useFactory: () => {
        return process.env.API_BASE_URL
          ?? 'http://localhost:3000';
      },
    },
  ],
  exports: ['API_BASE_URL'],
})
export class ApiModule {}
```

이 예제에서는 환경 변수를 확인하여 API 기본 URL을 결정합니다.

Factory 함수의 반환값이 `'API_BASE_URL'` 토큰에 대응하는 Provider 값이 됩니다.

### 6.2. Factory에 다른 Provider 주입

Factory 함수는 다른 Provider를 주입받아 사용할 수 있습니다.

다음과 같은 설정 서비스가 있다고 가정합니다.

**app-config.service.ts**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfigService {
  getApiBaseUrl(): string {
    return process.env.API_BASE_URL
      ?? 'http://localhost:3000';
  }
}
```

이 Service를 Factory의 의존성으로 사용할 수 있습니다.

**api.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

@Module({
  providers: [
    AppConfigService,
    {
      provide: 'API_BASE_URL',
      useFactory: (config: AppConfigService) => {
        return config.getApiBaseUrl();
      },
      inject: [AppConfigService],
    },
  ],
  exports: ['API_BASE_URL'],
})
export class ApiModule {}
```

`inject`는 Factory 함수에 전달할 Provider의 Injection Token을 지정합니다.

NestJS는 다음 순서로 Factory Provider를 해결합니다.

1. `inject` 배열에 선언된 Injection Token을 확인합니다.
2. 각 Injection Token에 대응하는 Provider를 해결합니다.
3. 해결한 Provider를 Factory 함수의 매개변수로 전달합니다.
4. Factory 함수를 실행합니다.
5. 반환값을 Factory Provider의 값으로 등록합니다.

### 6.3. inject 배열과 매개변수 순서

Factory 함수의 매개변수는 `inject` 배열의 순서와 대응합니다.

```typescript
{
  provide: 'API_CLIENT',
  useFactory: (
    config: AppConfigService,
    logger: AppLoggerService,
  ) => {
    return new ApiClient(
      config.getApiBaseUrl(),
      logger,
    );
  },
  inject: [
    AppConfigService,
    AppLoggerService,
  ],
}
```

위 예제는 `AppConfigService`, `AppLoggerService`, `ApiClient`가 별도로 정의되어 있고, 의존성이 접근 가능한 Module에 등록되어 있다고 가정합니다.

첫 번째 Injection Token의 인스턴스는 첫 번째 매개변수에 전달되고, 두 번째 Injection Token의 인스턴스는 두 번째 매개변수에 전달됩니다.

따라서 `inject` 배열과 Factory 함수의 매개변수 순서를 일치시켜야 합니다.

### 6.4. Optional Factory Dependency

Factory에 필요한 의존성이 선택적일 수도 있습니다.

NestJS는 `inject` 배열에서 선택적 의존성을 지정하는 방식을 지원합니다.

```typescript
{
  provide: 'API_CLIENT_OPTIONS',
  useFactory: (
    config: AppConfigService,
    optionalTimeout?: number,
  ) => {
    return {
      baseUrl: config.getApiBaseUrl(),
      timeout: optionalTimeout ?? 5000,
    };
  },
  inject: [
    AppConfigService,
    {
      token: 'API_TIMEOUT',
      optional: true,
    },
  ],
}
```

`API_TIMEOUT` Provider가 등록되어 있지 않으면 해당 매개변수는 `undefined`가 될 수 있습니다.

이러한 방식은 설정값이 선택적으로 제공되는 Factory를 구현할 때 유용합니다.

### 6.5. useFactory 사용 시 고려사항

Factory Provider는 다른 Provider에 의존하여 객체를 구성할 수 있다는 장점이 있습니다.

다만 Factory 함수가 지나치게 복잡해지면 초기화 로직과 의존성 관계를 파악하기 어려워질 수 있습니다.

따라서 다음과 같이 구성하는 것이 좋습니다.

- Factory는 Provider 생성과 설정에 필요한 로직에 집중합니다.
- 일반적인 비즈니스 로직은 별도의 Service로 분리합니다.
- Factory의 의존성은 `inject`에 명시적으로 선언합니다.
- 비동기 초기화가 필요하다면 Async Factory를 사용합니다.
- 외부 리소스를 생성한다면 종료 시점의 정리 방식도 함께 설계합니다.

---

## 7. Asynchronous Factory Provider

NestJS는 비동기 Factory 함수를 사용한 Provider 등록을 지원합니다.

이는 애플리케이션 초기화 과정에서 비동기 작업이 완료되어야 사용할 수 있는 의존성을 구성할 때 유용합니다.

대표적인 사례는 다음과 같습니다.

- 데이터베이스 연결 초기화
- 외부 설정 서버에서 구성 정보 조회
- 외부 API Client의 초기화
- 메시지 브로커 연결
- 비동기 인증 정보 로딩

### 7.1. 비동기 Provider 기본 구조

```typescript
{
  provide: 'ASYNC_CONFIG',
  useFactory: async () => {
    const config = await Promise.resolve({
      apiUrl: 'https://api.example.com',
    });

    return config;
  },
}
```

Factory 함수가 Promise를 반환하면 NestJS는 해당 Promise가 해결될 때까지 기다립니다.

이후 해결된 값을 해당 Provider의 값으로 사용합니다.

### 7.2. 비동기 Factory 예제

비동기 설정 정보를 조회하는 서비스를 정의합니다.

**remote-config.service.ts**

```typescript
import { Injectable } from '@nestjs/common';

export interface RemoteConfig {
  apiUrl: string;
  timeout: number;
}

@Injectable()
export class RemoteConfigService {
  async load(): Promise<RemoteConfig> {
    return {
      apiUrl: 'https://api.example.com',
      timeout: 5000,
    };
  }
}
```

이 예제의 `load()`는 비동기 함수지만 실제 외부 네트워크 요청은 수행하지 않습니다.

Module에서는 비동기 Factory를 등록합니다.

**config.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { RemoteConfigService } from './remote-config.service';

export const REMOTE_CONFIG = Symbol('REMOTE_CONFIG');

@Module({
  providers: [
    RemoteConfigService,
    {
      provide: REMOTE_CONFIG,
      useFactory: async (
        remoteConfigService: RemoteConfigService,
      ) => {
        return remoteConfigService.load();
      },
      inject: [RemoteConfigService],
    },
  ],
  exports: [REMOTE_CONFIG],
})
export class ConfigModule {}
```

NestJS는 `RemoteConfigService.load()`의 Promise가 해결된 후 `REMOTE_CONFIG` Provider를 사용할 수 있도록 합니다.

### 7.3. 비동기 Provider 주입

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { REMOTE_CONFIG } from './config.module';
import type { RemoteConfig } from './remote-config.service';

@Injectable()
export class ApiService {
  constructor(
    @Inject(REMOTE_CONFIG)
    private readonly config: RemoteConfig,
  ) {}

  getApiUrl(): string {
    return this.config.apiUrl;
  }
}
```

`ApiService`는 Promise 객체가 아니라 Factory가 비동기로 생성한 결과값을 주입받습니다.

단, `ApiService`가 `REMOTE_CONFIG` Provider에 접근할 수 있도록 Module 관계를 구성해야 합니다.

### 7.4. 비동기 Provider의 초기화 실패

비동기 Factory에서 예외가 발생하거나 Promise가 Reject되면 해당 Provider의 의존성 해결이 실패합니다.

이 경우 정상적인 애플리케이션 초기화를 완료하지 못할 수 있습니다.

따라서 외부 시스템에 의존하는 Factory에서는 다음 사항을 고려해야 합니다.

- 연결 실패 시 적절한 오류를 발생시킵니다.
- 외부 요청에 타임아웃을 적용합니다.
- 필요한 경우 재시도 정책을 구성합니다.
- 초기화에 실패했을 때 애플리케이션을 실행할 수 있는지 결정합니다.
- 생성한 외부 자원의 종료 처리를 구현합니다.

NestJS가 비동기 Factory의 Promise를 기다리는 것과 외부 연결에 대한 재시도 및 타임아웃을 자동으로 제공하는 것은 서로 다른 문제입니다.

재시도와 타임아웃은 사용하는 클라이언트 라이브러리나 별도의 애플리케이션 로직에서 구성해야 합니다.

---

## 8. Alias Provider: useExisting

`useExisting`은 이미 등록된 Provider에 다른 Injection Token을 연결하는 방식입니다.

새로운 인스턴스를 생성하는 대신 기존 Provider를 참조하도록 구성합니다.

### 8.1. 기본 사용법

**logger.service.ts**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService {
  log(message: string): void {
    console.log(message);
  }
}
```

Module에서는 다음과 같이 등록합니다.

**logger.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

export const APP_LOGGER = Symbol('APP_LOGGER');

@Module({
  providers: [
    LoggerService,
    {
      provide: APP_LOGGER,
      useExisting: LoggerService,
    },
  ],
  exports: [
    LoggerService,
    APP_LOGGER,
  ],
})
export class LoggerModule {}
```

이제 다음 두 Injection Token으로 Provider를 사용할 수 있습니다.

- `LoggerService`
- `APP_LOGGER`

### 8.2. 기존 인스턴스 공유

다음과 같이 서로 다른 토큰을 사용하여 Provider를 주입받을 수 있습니다.

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { APP_LOGGER } from './logger.module';

@Injectable()
export class UsersService {
  constructor(
    private readonly logger: LoggerService,

    @Inject(APP_LOGGER)
    private readonly appLogger: LoggerService,
  ) {}

  isSameInstance(): boolean {
    return this.logger === this.appLogger;
  }
}
```

기본 Singleton Scope를 사용하는 경우 두 속성은 동일한 `LoggerService` 인스턴스를 참조합니다.

따라서 `isSameInstance()`는 `true`를 반환합니다.

### 8.3. useClass와 useExisting 비교

두 방식은 비슷해 보이지만 인스턴스 생성 관점에서 차이가 있습니다.

**useClass**

```typescript
@Module({
  providers: [
    {
      provide: 'LOGGER_A',
      useClass: LoggerService,
    },
    {
      provide: 'LOGGER_B',
      useClass: LoggerService,
    },
  ],
})
export class LoggerModule {}
```

각 Injection Token에 독립적인 Provider Definition이 등록됩니다.

기본 Singleton Scope에서도 서로 다른 인스턴스가 생성될 수 있습니다.

**useExisting**

```typescript
@Module({
  providers: [
    LoggerService,
    {
      provide: 'LOGGER_A',
      useExisting: LoggerService,
    },
    {
      provide: 'LOGGER_B',
      useExisting: LoggerService,
    },
  ],
})
export class LoggerModule {}
```

두 문자열 토큰은 기존 `LoggerService` Provider를 참조합니다.

따라서 기본 Singleton Scope에서는 동일한 인스턴스를 공유합니다.

```text
useClass

LOGGER_A ──► LoggerService Instance A
LOGGER_B ──► LoggerService Instance B


useExisting

LOGGER_A ──┐
           │
LOGGER_B ──┼──► LoggerService Instance
           │
LoggerService ─┘
```

`useExisting`은 기존 Provider와의 호환성을 유지하거나 동일한 기능을 여러 Injection Token으로 제공해야 할 때 유용합니다.

---

## 9. Injection Token의 종류

NestJS는 Provider를 식별하기 위해 Injection Token을 사용합니다.

Custom Provider에서는 Injection Token과 실제 구현을 명시적으로 분리할 수 있습니다.

주요 Injection Token 형태는 다음과 같습니다.

| Token 종류 | 예제 | 특징 |
|---|---|---|
| Class | `UsersService` | 클래스 자체를 식별자로 사용합니다. |
| String | `'USERS_REPOSITORY'` | 문자열을 식별자로 사용합니다. |
| Symbol | `Symbol('USERS_REPOSITORY')` | 고유한 Symbol을 식별자로 사용합니다. |
| Abstract Class | `UsersRepository` | 추상 클래스를 계약과 런타임 식별자로 사용합니다. |

### 9.1. Class Token

```typescript
{
  provide: UsersService,
  useClass: UsersService,
}
```

클래스를 Injection Token으로 사용하는 경우 생성자 타입 정보를 통해 의존성을 해결할 수 있습니다.

```typescript
constructor(
  private readonly usersService: UsersService,
) {}
```

### 9.2. String Token

```typescript
export const USERS_REPOSITORY = 'USERS_REPOSITORY';
```

```typescript
{
  provide: USERS_REPOSITORY,
  useClass: UsersRepository,
}
```

문자열 토큰을 사용할 때는 `@Inject()`를 명시합니다.

```typescript
constructor(
  @Inject(USERS_REPOSITORY)
  private readonly usersRepository: UsersRepository,
) {}
```

문자열 토큰은 단순하지만 서로 다른 기능에서 동일한 문자열을 사용하면 의도하지 않은 토큰 충돌이 발생할 수 있습니다.

### 9.3. Symbol Token

```typescript
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
```

```typescript
{
  provide: USERS_REPOSITORY,
  useClass: UsersRepository,
}
```

`Symbol`은 고유한 런타임 식별자를 제공합니다.

다만 다음 두 Symbol은 서로 다른 값입니다.

```typescript
const TOKEN_A = Symbol('USERS_REPOSITORY');
const TOKEN_B = Symbol('USERS_REPOSITORY');

console.log(TOKEN_A === TOKEN_B); // false
```

따라서 Provider 등록과 의존성 주입에서는 동일한 Symbol 상수를 import하여 사용해야 합니다.

### 9.4. Abstract Class Token

TypeScript의 Abstract Class는 JavaScript 런타임에 존재할 수 있으므로 Injection Token으로 사용할 수 있습니다.

```typescript
export abstract class UsersRepository {
  abstract findAll(): Promise<User[]>;
}
```

구현 클래스는 다음과 같이 정의합니다.

```typescript
@Injectable()
export class InMemoryUsersRepository
  implements UsersRepository {
  async findAll(): Promise<User[]> {
    return [];
  }
}
```

이 예제는 `User` 타입이 별도로 정의되어 있다고 가정합니다.

Provider 등록은 다음과 같습니다.

```typescript
{
  provide: UsersRepository,
  useClass: InMemoryUsersRepository,
}
```

Consumer에서는 일반적인 생성자 주입을 사용할 수 있습니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}
}
```

이 경우 `@Inject()`를 별도로 선언하지 않아도 추상 클래스를 Injection Token으로 사용할 수 있습니다.

단, TypeScript의 데코레이터 및 메타데이터 설정이 NestJS의 생성자 타입 기반 의존성 주입을 지원하도록 구성되어 있어야 합니다.

---

## 10. Interface 기반 의존성 주입

TypeScript의 Interface는 컴파일 과정에서 제거됩니다.

따라서 Interface 자체를 NestJS의 런타임 Injection Token으로 직접 사용할 수 없습니다.

Interface 기반 설계에서는 별도의 Token을 정의하여 구현체와 사용하는 코드를 분리합니다.

### 10.1. Repository Interface

사용자 데이터를 조회하는 Repository의 계약을 정의합니다.

**users.repository.ts**

```typescript
export interface User {
  id: number;
  name: string;
}

export interface UsersRepository {
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
```

이 Interface는 Repository가 제공해야 하는 메서드와 반환 타입을 정의합니다.

### 10.2. Repository 구현 클래스

**in-memory-users.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';

import type {
  User,
  UsersRepository,
} from './users.repository';

@Injectable()
export class InMemoryUsersRepository
  implements UsersRepository {
  private readonly users: User[] = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  async findAll(): Promise<User[]> {
    return this.users;
  }

  async findById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id)
      ?? null;
  }
}
```

위 예제는 실제 데이터베이스 대신 메모리 배열을 사용합니다.

### 10.3. Service 구현

**users.service.ts**

```typescript
import { Inject, Injectable } from '@nestjs/common';

import {
  USERS_REPOSITORY,
} from './users.repository';

import type {
  UsersRepository,
} from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async findAll() {
    return this.usersRepository.findAll();
  }

  async findOne(id: number) {
    return this.usersRepository.findById(id);
  }
}
```

`UsersService`는 `InMemoryUsersRepository`라는 구체적인 구현 클래스에 직접 의존하지 않습니다.

대신 `UsersRepository` Interface와 `USERS_REPOSITORY` Injection Token을 사용합니다.

### 10.4. Module 구성

**users.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { InMemoryUsersRepository } from './in-memory-users.repository';
import { USERS_REPOSITORY } from './users.repository';

@Module({
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useClass: InMemoryUsersRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
```

위 구조에서는 `USERS_REPOSITORY` 토큰을 통해 실제 구현 클래스를 결정합니다.

```text
UsersService
     │
     │ @Inject(USERS_REPOSITORY)
     ▼
USERS_REPOSITORY
     │
     │ useClass
     ▼
InMemoryUsersRepository
```

추후 데이터베이스 기반 Repository로 변경해야 한다면 Provider Definition을 변경할 수 있습니다.

```typescript
{
  provide: USERS_REPOSITORY,
  useClass: DatabaseUsersRepository,
}
```

이 예제는 `DatabaseUsersRepository`가 동일한 Interface를 구현하고 필요한 의존성이 등록되어 있다는 것을 전제로 합니다.

`UsersService`는 구현 클래스 변경과 관계없이 동일한 Repository 계약을 사용할 수 있습니다.

이러한 구조는 Dependency Inversion Principle(DIP)을 적용할 때 유용합니다.

---

## 11. Custom Provider의 Module 간 공유

Custom Provider도 일반적인 Provider와 동일하게 Module의 캡슐화 규칙을 따릅니다.

따라서 다른 Module에서 사용하려면 해당 Provider를 `exports`에 등록하고, 사용하는 Module에서 제공 Module을 `imports`에 등록해야 합니다.

### 11.1. Provider 등록과 공개

**database.module.ts**

```typescript
import { Module } from '@nestjs/common';

export const DATABASE_OPTIONS = Symbol('DATABASE_OPTIONS');

export interface DatabaseOptions {
  host: string;
  port: number;
}

@Module({
  providers: [
    {
      provide: DATABASE_OPTIONS,
      useValue: {
        host: 'localhost',
        port: 3306,
      } satisfies DatabaseOptions,
    },
  ],
  exports: [DATABASE_OPTIONS],
})
export class DatabaseModule {}
```

`DATABASE_OPTIONS`는 `DatabaseModule`에서 관리하는 Custom Provider입니다.

### 11.2. 다른 Module에서 사용

**users.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule],
  providers: [UsersService],
})
export class UsersModule {}
```

이제 `UsersService`에서는 `DATABASE_OPTIONS`를 주입받을 수 있습니다.

```typescript
import { Inject, Injectable } from '@nestjs/common';

import {
  DATABASE_OPTIONS,
} from '../database/database.module';

import type {
  DatabaseOptions,
} from '../database/database.module';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_OPTIONS)
    private readonly databaseOptions: DatabaseOptions,
  ) {}

  getDatabaseHost(): string {
    return this.databaseOptions.host;
  }
}
```

전체 관계는 다음과 같습니다.

```text
DatabaseModule
      │
      ├── providers
      │      └── DATABASE_OPTIONS
      │
      └── exports
             └── DATABASE_OPTIONS
                      │
                      ▼
                 UsersModule
                      │
                      └── UsersService
                             │
                             └── DATABASE_OPTIONS 주입
```

### 11.3. Provider Definition 객체로 공개

NestJS는 Injection Token뿐 아니라 Provider Definition 객체를 `exports`에 등록하는 방식도 지원합니다.

```typescript
import { Module } from '@nestjs/common';

const databaseOptionsProvider = {
  provide: 'DATABASE_OPTIONS',
  useValue: {
    host: 'localhost',
    port: 3306,
  },
};

@Module({
  providers: [databaseOptionsProvider],
  exports: [databaseOptionsProvider],
})
export class DatabaseModule {}
```

일반적으로는 Injection Token을 `exports`에 명시하는 방식이 외부에 공개하는 의존성을 확인하기 쉽습니다.

---

## 12. Custom Provider와 Injection Scope

Custom Provider도 Provider의 Injection Scope를 적용받습니다.

NestJS에서는 기본적으로 Singleton Scope를 사용합니다.

주요 Scope는 다음과 같습니다.

| Scope | 설명 |
|---|---|
| `DEFAULT` | 동일한 Provider 등록의 인스턴스를 기본적으로 재사용합니다. |
| `REQUEST` | 요청 컨텍스트별로 인스턴스를 생성합니다. |
| `TRANSIENT` | Provider를 주입받는 Consumer별로 별도의 인스턴스를 제공합니다. |

### 12.1. useClass와 Scope

```typescript
import { Scope } from '@nestjs/common';

{
  provide: 'REQUEST_CONTEXT',
  useClass: RequestContextService,
  scope: Scope.REQUEST,
}
```

이 예제는 `RequestContextService`가 별도로 정의되어 있다고 가정합니다.

`scope` 속성을 통해 클래스 기반 Provider의 인스턴스 관리 범위를 지정할 수 있습니다.

### 12.2. useFactory와 Scope

```typescript
{
  provide: 'REQUEST_METADATA',
  scope: Scope.REQUEST,
  useFactory: () => {
    return {
      createdAt: Date.now(),
    };
  },
}
```

위 Factory Provider는 Request Scope로 구성됩니다.

따라서 요청 컨텍스트별로 Factory가 실행되어 값을 제공할 수 있습니다.

### 12.3. useValue와 Scope의 차이

`useValue`는 개발자가 지정한 기존 값을 Provider에 연결합니다.

반면 `useClass`와 `useFactory`는 NestJS가 구현 클래스 또는 Factory를 사용하여 값을 생성합니다.

따라서 요청별로 독립적인 객체가 필요하다면 기존 객체를 제공하는 `useValue`보다 `useClass` 또는 `useFactory`와 적절한 Scope를 조합하는 방식이 적합합니다.

Injection Scope의 정확한 동작과 Scope 전파는 `injection-scopes.md`에서 설명합니다.

---

## 13. Custom Provider와 테스트

Custom Provider는 단위 테스트에서 실제 의존성을 Mock 객체로 교체하는 데 유용합니다.

NestJS는 `@nestjs/testing` 패키지를 사용하여 테스트용 DI Container를 구성할 수 있습니다.

다음 예제는 Jest를 사용하는 환경을 전제로 합니다.

### 13.1. Mock Provider 등록

`UsersService`가 `USERS_REPOSITORY` 토큰을 통해 Repository에 의존한다고 가정합니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async findAll() {
    return this.usersRepository.findAll();
  }
}
```

테스트에서는 실제 Repository 대신 Mock 객체를 등록할 수 있습니다.

**users.service.spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from './users.service';
import { USERS_REPOSITORY } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: USERS_REPOSITORY,
            useValue: mockUsersRepository,
          },
        ],
      }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('사용자 목록을 반환해야 합니다', async () => {
    const users = [
      { id: 1, name: 'Alice' },
    ];

    mockUsersRepository.findAll.mockResolvedValue(users);

    await expect(service.findAll()).resolves.toEqual(users);

    expect(
      mockUsersRepository.findAll,
    ).toHaveBeenCalledTimes(1);
  });
});
```

이 테스트에서는 실제 Repository 구현 클래스를 생성하지 않습니다.

`USERS_REPOSITORY` Injection Token에 Mock 객체를 등록하여 Service의 의존성을 해결합니다.

### 13.2. overrideProvider()

이미 구성된 Module에 등록된 Provider를 교체해야 하는 경우 `overrideProvider()`를 사용할 수 있습니다.

```typescript
const module = await Test.createTestingModule({
  imports: [UsersModule],
})
  .overrideProvider(USERS_REPOSITORY)
  .useValue(mockUsersRepository)
  .compile();
```

`overrideProvider()`는 특정 Injection Token에 대응하는 Provider를 테스트에서 다른 구현으로 대체합니다.

이는 실제 애플리케이션의 Module 구성을 재사용하면서 외부 의존성만 교체하고 싶을 때 유용합니다.

Custom Provider 기반 테스트의 주요 장점은 다음과 같습니다.

- 실제 데이터베이스에 연결하지 않아도 Service를 테스트할 수 있습니다.
- 외부 API 호출을 Mock 객체로 대체할 수 있습니다.
- 구현 클래스 변경과 관계없이 동일한 Injection Token을 사용할 수 있습니다.
- 테스트 대상과 외부 의존성을 분리할 수 있습니다.

보다 상세한 테스트 구성과 Mock 전략은 `06-testing/mocking-providers.md`에서 설명합니다.

---

## 14. Custom Provider와 Dynamic Module

Custom Provider는 Dynamic Module을 구현할 때 중요한 역할을 수행합니다.

Dynamic Module은 설정값에 따라 Module의 Provider 구성을 동적으로 결정할 수 있습니다.

예를 들어 API Client를 생성하는 Module에서 기본 URL과 Timeout을 외부에서 전달받는다고 가정합니다.

### 14.1. Dynamic Module 기본 예제

**api.module.ts**

```typescript
import { DynamicModule, Module } from '@nestjs/common';

export const API_OPTIONS = Symbol('API_OPTIONS');

export interface ApiOptions {
  baseUrl: string;
  timeout: number;
}

@Module({})
export class ApiModule {
  static register(options: ApiOptions): DynamicModule {
    return {
      module: ApiModule,
      providers: [
        {
          provide: API_OPTIONS,
          useValue: options,
        },
      ],
      exports: [API_OPTIONS],
    };
  }
}
```

이 예제에서는 `useValue`를 사용하여 외부에서 전달받은 옵션을 Provider로 등록합니다.

### 14.2. Dynamic Module 사용

```typescript
import { Module } from '@nestjs/common';
import { ApiModule } from './api.module';

@Module({
  imports: [
    ApiModule.register({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    }),
  ],
})
export class AppModule {}
```

Dynamic Module은 설정값에 따라 다른 Provider를 등록하거나 Factory를 구성할 수도 있습니다.

### 14.3. Custom Provider와 Dynamic Module의 차이

| 구분 | Custom Provider | Dynamic Module |
|---|---|---|
| 주요 목적 | 의존성의 제공 방식을 정의 | Module의 구성을 동적으로 정의 |
| 구성 단위 | Provider | Module |
| 주요 요소 | `provide`, `useValue`, `useClass`, `useFactory`, `useExisting` | `DynamicModule`, `register()`, `forRoot()` 등 |
| 주요 활용 | 구현 교체, 설정값 제공, 비동기 객체 생성 | 설정 가능한 기능 Module 구성 |

Custom Provider는 개별 의존성의 생성 및 제공 방식을 정의합니다.

Dynamic Module은 여러 Provider와 Module 설정을 하나의 동적인 구성 단위로 관리합니다.

Dynamic Module의 상세 구현과 `ConfigurableModuleBuilder`는 `dynamic-modules.md`에서 설명합니다.

---

## 15. Custom Provider 설계 시 고려사항

Custom Provider를 설계할 때는 Injection Token의 명확성, Provider의 소유 관계 및 생명주기를 고려해야 합니다.

### 15.1. Injection Token을 일관되게 관리합니다

문자열이나 Symbol 기반 Injection Token을 여러 파일에서 반복 정의하지 않는 것이 좋습니다.

예를 들어 다음과 같이 별도의 파일에서 관리할 수 있습니다.

**users.tokens.ts**

```typescript
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
export const USERS_CACHE = Symbol('USERS_CACHE');
```

이를 통해 Provider 등록과 의존성 주입에서 동일한 Token을 재사용할 수 있습니다.

특히 Symbol은 같은 설명 문자열로 다시 생성하더라도 서로 다른 값이므로 공통 상수를 import하여 사용해야 합니다.

### 15.2. 구현체와 계약을 분리합니다

Service가 구체적인 Repository 클래스에 직접 의존하지 않도록 Interface 또는 Abstract Class를 사용할 수 있습니다.

이러한 방식은 구현 교체 및 테스트에 유리합니다.

다만 모든 Service와 Repository에 반드시 Interface를 정의해야 하는 것은 아닙니다.

구현 교체 가능성이 있거나 아키텍처 경계를 명확하게 정의해야 하는 경우에 적용하는 것이 적절합니다.

### 15.3. useClass와 useExisting을 구분합니다

`useClass`는 특정 Token에 대응하는 클래스 기반 Provider를 정의합니다.

`useExisting`은 이미 등록된 Provider에 대한 별칭을 정의합니다.

따라서 동일한 인스턴스를 여러 Injection Token에서 사용하려면 `useExisting`을 고려해야 합니다.

### 15.4. Factory의 책임을 제한합니다

`useFactory`는 객체 생성과 초기 설정에 집중하도록 구성하는 것이 좋습니다.

복잡한 비즈니스 로직이나 장시간 실행되는 작업을 Factory에 과도하게 포함하지 않도록 주의해야 합니다.

비동기 Factory에서 시간이 오래 걸리는 작업을 수행하면 해당 Provider에 의존하는 구성 요소의 초기화도 지연될 수 있습니다.

### 15.5. Provider의 생명주기를 고려합니다

Provider가 외부 연결이나 시스템 자원을 관리한다면 초기화와 종료 시점을 고려해야 합니다.

예를 들어 데이터베이스 연결 객체나 메시지 브로커 Client를 Factory에서 생성했다면 애플리케이션 종료 시 해당 자원을 정리할 방법이 필요합니다.

`useFactory`가 반환하는 일반 객체에 NestJS의 Lifecycle Hook이 자동으로 적용된다고 가정해서는 안 됩니다.

자원 정리가 필요한 경우 관련 Lifecycle Hook을 구현한 별도 Provider에서 해당 자원을 관리하는 방식을 고려할 수 있습니다.

### 15.6. Provider 중복 등록을 주의합니다

동일한 클래스를 서로 다른 Token에 `useClass`로 등록하면 별도 인스턴스가 생성될 수 있습니다.

공유가 필요한 Provider는 하나의 Module에서 관리하고 필요하다면 `useExisting` 또는 Module의 `exports`를 사용하여 재사용하는 것이 좋습니다.

### 15.7. Global Provider 사용을 신중하게 결정합니다

Custom Provider 역시 Global Module을 통해 여러 Module에 제공할 수 있습니다.

그러나 전역 접근을 과도하게 허용하면 Module 간 의존성이 명시적으로 드러나지 않을 수 있습니다.

따라서 일반적인 기능에서는 `imports`와 `exports`를 통한 명시적인 의존성 관리를 우선적으로 고려하는 것이 좋습니다.

---

## 16. 전체 구현 예제

앞에서 설명한 Interface 기반 Injection Token, `useClass`, Module 등록 및 Constructor Injection을 조합하여 사용자 조회 API를 구현할 수 있습니다.

### 16.1. 디렉터리 구조

```text
src/
├── main.ts
├── app.module.ts
│
└── users/
    ├── users.types.ts
    ├── users.tokens.ts
    ├── users.repository.ts
    ├── in-memory-users.repository.ts
    ├── users.service.ts
    ├── users.controller.ts
    └── users.module.ts
```

### 16.2. 사용자 타입

**users/users.types.ts**

```typescript
export interface User {
  id: number;
  name: string;
}
```

### 16.3. Injection Token

**users/users.tokens.ts**

```typescript
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
```

### 16.4. Repository Interface

**users/users.repository.ts**

```typescript
import type { User } from './users.types';

export interface UsersRepository {
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
}
```

### 16.5. Repository 구현

**users/in-memory-users.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';

import type { User } from './users.types';
import type { UsersRepository } from './users.repository';

@Injectable()
export class InMemoryUsersRepository
  implements UsersRepository {
  private readonly users: User[] = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  async findAll(): Promise<User[]> {
    return this.users;
  }

  async findById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id)
      ?? null;
  }
}
```

### 16.6. Service

**users/users.service.ts**

```typescript
import { Inject, Injectable } from '@nestjs/common';

import { USERS_REPOSITORY } from './users.tokens';
import type { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async findAll() {
    return this.usersRepository.findAll();
  }

  async findOne(id: number) {
    return this.usersRepository.findById(id);
  }
}
```

`UsersService`는 `InMemoryUsersRepository`의 구체적인 구현에 직접 의존하지 않습니다.

### 16.7. Controller

**users/users.controller.ts**

```typescript
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
```

### 16.8. Module

**users/users.module.ts**

```typescript
import { Module } from '@nestjs/common';

import { USERS_REPOSITORY } from './users.tokens';
import { InMemoryUsersRepository } from './in-memory-users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useClass: InMemoryUsersRepository,
    },
  ],
})
export class UsersModule {}
```

### 16.9. Root Module

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

### 16.10. Bootstrap

**main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

### 16.11. 의존성 해결 구조

전체 의존성 관계는 다음과 같습니다.

```text
AppModule
    │
    ▼
UsersModule
    │
    ├── UsersController
    │        │
    │        ▼
    │   UsersService
    │        │
    │        │ @Inject(USERS_REPOSITORY)
    │        ▼
    │   USERS_REPOSITORY
    │        │
    │        │ useClass
    │        ▼
    │   InMemoryUsersRepository
    │
    └── Provider Registration
```

NestJS는 `USERS_REPOSITORY` Injection Token을 기준으로 `InMemoryUsersRepository` 인스턴스를 해결합니다.

`UsersService`는 Repository Interface에 정의된 메서드를 사용하여 사용자 정보를 조회합니다.

### 16.12. API 요청 예제

사용자 목록 조회 요청은 다음과 같습니다.

```http
GET /users
```

응답은 다음과 같습니다.

```json
[
  {
    "id": 1,
    "name": "Alice"
  },
  {
    "id": 2,
    "name": "Bob"
  }
]
```

단일 사용자 조회 요청은 다음과 같습니다.

```http
GET /users/1
```

응답은 다음과 같습니다.

```json
{
  "id": 1,
  "name": "Alice"
}
```

이 구조에서는 추후 Repository 구현을 데이터베이스 기반으로 변경하더라도 `UsersService`의 비즈니스 로직과 Constructor Injection 코드를 유지할 수 있습니다.

---

## 17. 주요 개념 비교

Custom Provider의 핵심 개념을 정리하면 다음과 같습니다.

| 개념 | 설명 |
|---|---|
| Standard Provider | 클래스 이름을 직접 등록하는 기본 Provider 방식 |
| Custom Provider | Injection Token과 Provider 제공 방식을 명시적으로 정의하는 방식 |
| Injection Token | Provider를 식별하기 위한 런타임 식별자 |
| `provide` | Injection Token을 지정하는 속성 |
| `useValue` | 기존 값이나 객체를 제공하는 방식 |
| `useClass` | 지정한 클래스의 인스턴스를 생성하는 방식 |
| `useFactory` | Factory 함수로 Provider 값을 생성하는 방식 |
| `useExisting` | 이미 등록된 Provider의 별칭을 생성하는 방식 |
| `inject` | Factory에 전달할 의존성을 지정하는 속성 |
| Async Provider | Promise 기반 비동기 초기화를 지원하는 Provider |
| Abstract Class Token | 추상 클래스를 DI Token과 타입 계약으로 사용하는 방식 |
| Symbol Token | 고유한 Symbol을 Injection Token으로 사용하는 방식 |

Custom Provider는 NestJS의 Dependency Injection을 보다 유연하게 구성할 수 있도록 지원합니다.

---

## 18. 정리

NestJS의 Custom Provider는 Injection Token과 Provider의 생성 및 제공 방식을 명시적으로 정의하는 기능입니다.

주요 특징은 다음과 같습니다.

1. **Custom Provider는 Injection Token과 실제 구현을 분리합니다.** Provider를 식별하는 방법과 주입할 대상을 독립적으로 구성할 수 있습니다.
2. **`useValue`는 기존 값이나 객체를 제공합니다.** 설정값, 상수 및 Mock 객체를 등록할 때 유용합니다.
3. **`useClass`는 구현 클래스를 지정합니다.** 환경이나 요구사항에 따라 다른 구현 클래스를 사용할 수 있습니다.
4. **`useFactory`는 동적으로 값을 생성합니다.** 다른 Provider를 주입받아 객체를 구성하거나 비동기 초기화를 수행할 수 있습니다.
5. **`useExisting`은 기존 Provider의 별칭을 제공합니다.** 기본 Singleton Scope에서 동일한 인스턴스를 여러 Token으로 참조할 수 있습니다.
6. **Injection Token은 클래스, 문자열, Symbol 또는 추상 클래스를 사용할 수 있습니다.** TypeScript Interface 자체는 런타임 Token으로 사용할 수 없습니다.
7. **Custom Provider도 Module의 캡슐화 규칙을 따릅니다.** 다른 Module에서 사용하려면 적절한 `exports`와 `imports` 구성이 필요합니다.
8. **Custom Provider는 구현 교체와 테스트에 유용합니다.** Interface 기반 의존성 분리와 Mock Provider 구성을 지원합니다.
9. **비동기 Provider를 통해 초기화 작업을 수행할 수 있습니다.** NestJS는 Factory Promise가 해결된 후 해당 Provider를 의존성으로 제공합니다.
10. **Dynamic Module의 핵심 구성 요소로 활용됩니다.** 설정값에 따라 Provider를 동적으로 등록하고 구성할 수 있습니다.

Custom Provider를 이해할 때 가장 중요한 점은 **Injection Token은 무엇을 주입받을지 식별하고, Provider Definition은 해당 Token에 어떤 구현이나 값을 제공할지 결정한다는 것**입니다.

이러한 구조를 활용하면 객체의 생성 방식과 사용하는 코드를 분리하고, 구현 교체 및 테스트가 용이한 NestJS 애플리케이션을 구성할 수 있습니다.

---

## 19. 관련 문서

- `modules.md`: Module의 Provider 등록 및 공개 범위
- `providers.md`: Provider의 기본 개념과 역할
- `dependency-injection.md`: IoC Container, Injection Token 및 의존성 해결
- `injection-scopes.md`: Singleton, Request, Transient Scope
- `dynamic-modules.md`: 설정 가능한 Module 및 동적 Provider 구성
- `../03-techniques/configuration.md`: 설정값 및 ConfigService 관리
- `../03-techniques/database.md`: 데이터베이스 연결과 Repository Provider
- `../06-testing/unit-testing.md`: Service 및 Provider 단위 테스트
- `../06-testing/testing-modules.md`: NestJS Testing Module 구성
- `../06-testing/mocking-providers.md`: Mock Provider를 이용한 의존성 교체
- `../07-architecture/dependency-management.md`: 의존성 역전과 구현체 분리

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)  
  Injection Token과 `useValue`, `useClass`, `useFactory`, `useExisting`을 이용한 Custom Provider 등록 방식을 설명합니다.

- [NestJS Providers](https://docs.nestjs.com/providers)  
  Provider의 기본 개념과 Constructor Injection, Optional Provider 등을 설명합니다.

- [NestJS Modules](https://docs.nestjs.com/modules)  
  Provider의 Module 등록, 캡슐화 및 공유 방식을 설명합니다.

- [NestJS Async Providers](https://docs.nestjs.com/fundamentals/async-providers)  
  비동기 Factory를 이용한 Provider 초기화와 Promise 처리 방식을 설명합니다.

- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)  
  Provider의 Singleton, Request, Transient Scope와 인스턴스 생명주기를 설명합니다.

- [NestJS Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)  
  Dynamic Module에서 Custom Provider와 설정값을 구성하는 방법을 설명합니다.

- [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref)  
  ModuleRef를 이용하여 Provider를 프로그래밍 방식으로 조회하고 해결하는 방법을 설명합니다.

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)  
  Testing Module, Mock Provider 및 `overrideProvider()`를 활용한 테스트 구성을 설명합니다.

- [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)  
  Provider의 초기화와 종료 시점에 사용할 수 있는 Lifecycle Hook을 설명합니다.

### GitHub Repository

- [NestJS 공식 GitHub Repository](https://github.com/nestjs/nest)  
  NestJS 프레임워크의 Dependency Injection 및 Provider 관련 내부 구현을 확인할 수 있습니다.

- [NestJS Core Injector 구현](https://github.com/nestjs/nest/tree/master/packages/core/injector)  
  NestJS의 Injection Token 처리, Provider 등록 및 인스턴스 생성 관련 코드를 확인할 수 있습니다.

- [NestJS 공식 예제 Repository](https://github.com/nestjs/nest/tree/master/sample)  
  Custom Provider와 Dependency Injection을 활용한 구현 예제를 확인할 수 있습니다.