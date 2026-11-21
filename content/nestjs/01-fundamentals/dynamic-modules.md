# Dynamic Modules

## 1. 개요

NestJS의 **Dynamic Module**은 애플리케이션에서 Module을 가져올 때 전달하는 설정값에 따라 Provider, Import, Export 등의 구성을 동적으로 정의할 수 있도록 지원하는 기능입니다.

일반적인 NestJS Module은 `@Module()` 데코레이터에 선언된 메타데이터를 기반으로 구성됩니다.

반면 Dynamic Module은 정적 메서드(Static Method)를 통해 `DynamicModule` 객체를 반환하며, 전달받은 설정값에 따라 Module의 구성을 결정할 수 있습니다.

예를 들어 외부 API와 통신하는 `ApiModule`을 구현한다고 가정합니다.

애플리케이션마다 API의 기본 URL, Timeout, 인증 정보 등이 다를 수 있습니다. 이러한 설정값을 Module 내부에 고정하면 애플리케이션마다 Module 구현을 수정해야 할 수 있습니다.

Dynamic Module을 사용하면 다음과 같이 Module을 가져오는 시점에 설정값을 전달할 수 있습니다.

```typescript
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

Dynamic Module의 주요 목적은 다음과 같습니다.

- **설정 가능성(Config​​urability):** Module을 사용하는 애플리케이션이나 기능에 따라 설정값을 전달할 수 있습니다.
- **재사용성(Reusability):** 동일한 Module 구현을 서로 다른 설정으로 재사용할 수 있습니다.
- **의존성 관리(Dependency Management):** 설정값과 필요한 Provider를 DI Container에 등록할 수 있습니다.
- **초기화 구성(Initialization):** Factory를 통해 외부 Client나 연결 객체의 초기화를 구성할 수 있습니다.
- **캡슐화(Encapsulation):** Module 내부의 구현을 외부에 노출하지 않고 필요한 Provider만 공개할 수 있습니다.
- **확장성(Extensibility):** 설정값에 따라 Provider 또는 다른 Module의 등록을 변경할 수 있습니다.

Dynamic Module을 이해할 때 중요한 점은 **Module 자체를 런타임에 임의로 생성하는 기능이 아니라, Module의 등록 과정에서 설정에 따라 메타데이터를 구성하는 기능이라는 것**입니다.

---

## 2. Static Module과 Dynamic Module

NestJS에서 Module은 기본적으로 관련된 Controller와 Provider를 하나의 기능 단위로 구성합니다.

Module을 정의하는 방식에 따라 Static Module과 Dynamic Module로 구분할 수 있습니다.

### 2.1. Static Module

일반적인 Module은 `@Module()` 데코레이터를 사용하여 정의합니다.

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

위 Module의 구성은 데코레이터에 정적으로 선언되어 있습니다.

다른 Module에서는 다음과 같이 가져올 수 있습니다.

```typescript
@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

이 방식은 기능의 구성과 의존성이 고정되어 있는 일반적인 Feature Module에 적합합니다.

### 2.2. Dynamic Module

Dynamic Module은 정적 메서드를 통해 Module의 메타데이터를 반환합니다.

```typescript
import { DynamicModule, Module } from '@nestjs/common';

@Module({})
export class ApiModule {
  static register(baseUrl: string): DynamicModule {
    return {
      module: ApiModule,
      providers: [
        {
          provide: 'API_BASE_URL',
          useValue: baseUrl,
        },
      ],
      exports: ['API_BASE_URL'],
    };
  }
}
```

다른 Module에서는 다음과 같이 사용합니다.

```typescript
@Module({
  imports: [
    ApiModule.register('https://api.example.com'),
  ],
})
export class AppModule {}
```

`register()` 메서드가 반환하는 객체에 따라 Provider를 등록하고 공개 범위를 설정합니다.

### 2.3. Static Module과 Dynamic Module 비교

| 구분 | Static Module | Dynamic Module |
|---|---|---|
| 정의 방식 | `@Module()` 메타데이터 | `@Module()` 및 `DynamicModule` 객체 |
| 설정값 전달 | 별도의 Provider 구성 필요 | 정적 메서드의 매개변수로 전달 가능 |
| Provider 등록 | 데코레이터에 선언 | 반환 객체에서 추가 또는 변경 가능 |
| 재사용 | 고정된 구성 중심 | 서로 다른 설정을 전달하여 재사용 가능 |
| 비동기 설정 | 별도 구성 필요 | Async Factory와 결합 가능 |
| 주요 활용 | 일반적인 Feature Module | 설정 가능한 라이브러리 및 인프라 Module |

Dynamic Module은 Static Module을 대체하는 개념이 아닙니다.

일반적인 Module의 구성을 유지하면서 필요한 부분을 동적으로 확장하는 기능입니다.

---

## 3. DynamicModule 인터페이스

NestJS는 `@nestjs/common` 패키지에서 `DynamicModule` 인터페이스를 제공합니다.

이 인터페이스는 Dynamic Module이 반환해야 하는 메타데이터의 구조를 정의합니다.

### 3.1. 기본 구조

```typescript
import { DynamicModule, Module } from '@nestjs/common';

@Module({})
export class ExampleModule {
  static register(): DynamicModule {
    return {
      module: ExampleModule,
      imports: [],
      controllers: [],
      providers: [],
      exports: [],
    };
  }
}
```

`DynamicModule`의 주요 속성은 다음과 같습니다.

| 속성 | 설명 |
|---|---|
| `module` | Dynamic Module을 정의하는 Module 클래스입니다. |
| `imports` | Module에서 가져올 다른 Module을 지정합니다. |
| `controllers` | Module에서 관리할 Controller를 지정합니다. |
| `providers` | Module에서 등록할 Provider를 지정합니다. |
| `exports` | 다른 Module에 공개할 Provider 또는 Module을 지정합니다. |
| `global` | Module을 Global Module로 등록할지 지정합니다. |

`module` 속성은 필수이며, 나머지 속성은 필요한 경우에 지정할 수 있습니다.

### 3.2. module 속성

```typescript
return {
  module: ExampleModule,
};
```

`module`은 Dynamic Module의 기반이 되는 Module 클래스를 지정합니다.

일반적으로 정적 메서드를 선언한 클래스와 동일한 클래스를 사용합니다.

### 3.3. providers 속성

```typescript
return {
  module: ExampleModule,
  providers: [
    {
      provide: 'API_BASE_URL',
      useValue: 'https://api.example.com',
    },
  ],
};
```

`providers`는 Dynamic Module에서 사용할 Provider를 등록합니다.

`useValue`, `useClass`, `useFactory`, `useExisting` 등의 Custom Provider 등록 방식을 사용할 수 있습니다.

### 3.4. exports 속성

```typescript
return {
  module: ExampleModule,
  providers: [
    {
      provide: 'API_BASE_URL',
      useValue: 'https://api.example.com',
    },
  ],
  exports: ['API_BASE_URL'],
};
```

`exports`는 Dynamic Module을 가져오는 외부 Module에서 사용할 수 있는 Provider를 지정합니다.

Provider를 `providers`에 등록했다고 해서 외부에서 자동으로 접근할 수 있는 것은 아닙니다.

### 3.5. 기존 @Module() 메타데이터와의 관계

Dynamic Module이 반환하는 메타데이터는 `@Module()` 데코레이터에 선언된 메타데이터를 확장합니다.

예를 들어 다음과 같이 구성할 수 있습니다.

```typescript
@Module({
  providers: [LoggerService],
})
export class ApiModule {
  static register(baseUrl: string): DynamicModule {
    return {
      module: ApiModule,
      providers: [
        {
          provide: 'API_BASE_URL',
          useValue: baseUrl,
        },
      ],
      exports: ['API_BASE_URL'],
    };
  }
}
```

이 경우 `LoggerService`는 정적 메타데이터에 등록된 Provider이며, `API_BASE_URL`은 Dynamic Module을 통해 추가된 Provider입니다.

즉, Dynamic Module의 메타데이터는 기존 메타데이터를 단순히 대체하는 것이 아니라 확장하는 방식으로 처리됩니다.

다만 같은 Injection Token을 여러 위치에 중복 등록하는 구성은 의도하지 않은 의존성 해결 문제를 발생시킬 수 있으므로 피하는 것이 좋습니다.

---

## 4. Dynamic Module의 동작 원리

NestJS는 애플리케이션을 초기화할 때 Root Module을 시작점으로 Module Graph를 구성합니다.

Dynamic Module이 존재하는 경우 정적 메서드가 반환한 메타데이터를 분석하여 Module의 구성과 Provider 등록 정보를 결정합니다.

### 4.1. Module 등록 과정

다음과 같은 구성을 가정합니다.

```typescript
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

`ApiModule.register()`는 JavaScript에서 Module 메타데이터를 평가할 때 호출되어 `DynamicModule` 객체를 반환합니다.

NestJS는 해당 객체를 사용하여 Module Graph를 구성합니다.

전체 과정은 다음과 같습니다.

```text
AppModule
    │
    │ imports
    ▼
ApiModule.register(options)
    │
    │ DynamicModule 반환
    ▼
DynamicModule Metadata
    │
    ├── module
    ├── imports
    ├── providers
    └── exports
    │
    ▼
NestJS Module Scanner
    │
    ▼
Module Graph 구성
    │
    ▼
DI Container
    │
    ▼
Provider 인스턴스 생성 및 주입
```

### 4.2. 주요 처리 과정

1. `ApiModule.register()`가 호출되어 설정값을 전달받습니다.
2. 설정값에 따라 `DynamicModule` 객체를 생성하여 반환합니다.
3. NestJS는 반환된 메타데이터를 분석합니다.
4. Module의 `imports`, `providers`, `exports` 정보를 등록합니다.
5. 필요한 Provider의 의존성을 해결합니다.
6. Provider 인스턴스를 생성하고 Consumer에 주입합니다.
7. 애플리케이션 초기화 과정을 완료합니다.

여기서 중요한 점은 `register()`가 일반적으로 **동기적으로 Module 메타데이터를 반환하는 메서드**라는 것입니다.

비동기 초기화가 필요한 경우에는 Dynamic Module 내부에 비동기 Factory Provider를 등록하는 방식 등을 사용합니다.

### 4.3. Dynamic Module과 런타임 재구성

Dynamic Module의 이름에 포함된 Dynamic은 Module 등록 시 구성을 동적으로 결정한다는 의미입니다.

일반적으로 애플리케이션이 실행된 이후에 설정값이 변경된다고 해서 Module Graph나 Provider 등록 정보가 자동으로 변경되지는 않습니다.

따라서 실행 중에 변경되는 설정값이나 상태를 관리해야 한다면 별도의 설정 갱신 메커니즘이나 상태 관리 방식을 구현해야 합니다.

---

## 5. register() 메서드

`register()`는 Dynamic Module을 구성할 때 일반적으로 사용하는 정적 메서드 이름입니다.

NestJS에서 반드시 `register()`라는 이름을 사용해야 하는 것은 아니지만, 호출하는 Module에서 설정값을 전달할 때 널리 사용하는 관례입니다.

### 5.1. 설정 옵션 정의

다음과 같이 API Client의 설정값을 정의합니다.

**api-options.interface.ts**

```typescript
export interface ApiModuleOptions {
  baseUrl: string;
  timeout: number;
}
```

### 5.2. Injection Token 정의

**api.constants.ts**

```typescript
export const API_MODULE_OPTIONS =
  Symbol('API_MODULE_OPTIONS');
```

### 5.3. Dynamic Module 구현

**api.module.ts**

```typescript
import { DynamicModule, Module } from '@nestjs/common';

import type { ApiModuleOptions } from './api-options.interface';
import { API_MODULE_OPTIONS } from './api.constants';

@Module({})
export class ApiModule {
  static register(options: ApiModuleOptions): DynamicModule {
    return {
      module: ApiModule,
      providers: [
        {
          provide: API_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [API_MODULE_OPTIONS],
    };
  }
}
```

이 Module은 `register()`에 전달된 옵션을 Custom Provider로 등록합니다.

### 5.4. Dynamic Module 사용

```typescript
import { Module } from '@nestjs/common';
import { ApiModule } from './api/api.module';

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

`AppModule`은 `ApiModule`이 공개한 설정 Provider에 접근할 수 있습니다.

### 5.5. 옵션 주입

다음과 같이 Service에서 설정값을 주입받을 수 있습니다.

```typescript
import { Inject, Injectable } from '@nestjs/common';

import { API_MODULE_OPTIONS } from './api.constants';
import type { ApiModuleOptions } from './api-options.interface';

@Injectable()
export class ApiService {
  constructor(
    @Inject(API_MODULE_OPTIONS)
    private readonly options: ApiModuleOptions,
  ) {}

  getBaseUrl(): string {
    return this.options.baseUrl;
  }
}
```

단, `ApiService`는 해당 Provider에 접근할 수 있는 Module에 등록되어 있어야 합니다.

`register()`를 통해 옵션을 제공하는 방식은 Module의 설정을 외부에서 제어할 수 있다는 장점이 있습니다.

---

## 6. 설정값을 사용하는 Provider 등록

Dynamic Module은 단순히 설정값을 등록하는 데 그치지 않고, 해당 설정을 사용하는 Service까지 함께 제공하도록 구성할 수 있습니다.

### 6.1. Service 구현

**api.service.ts**

```typescript
import { Inject, Injectable } from '@nestjs/common';

import { API_MODULE_OPTIONS } from './api.constants';
import type { ApiModuleOptions } from './api-options.interface';

@Injectable()
export class ApiService {
  constructor(
    @Inject(API_MODULE_OPTIONS)
    private readonly options: ApiModuleOptions,
  ) {}

  getConfiguration(): ApiModuleOptions {
    return this.options;
  }
}
```

### 6.2. Dynamic Module 구현

**api.module.ts**

```typescript
import { DynamicModule, Module } from '@nestjs/common';

import { ApiService } from './api.service';
import { API_MODULE_OPTIONS } from './api.constants';
import type { ApiModuleOptions } from './api-options.interface';

@Module({})
export class ApiModule {
  static register(options: ApiModuleOptions): DynamicModule {
    return {
      module: ApiModule,
      providers: [
        {
          provide: API_MODULE_OPTIONS,
          useValue: options,
        },
        ApiService,
      ],
      exports: [ApiService],
    };
  }
}
```

이 경우 `ApiService`는 Dynamic Module 내부에서 `API_MODULE_OPTIONS`를 주입받습니다.

다른 Module에서는 `ApiService`만 공개 인터페이스로 사용할 수 있습니다.

```typescript
@Module({
  imports: [
    ApiModule.register({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    }),
  ],
  providers: [UsersService],
})
export class UsersModule {}
```

`UsersService`에서는 다음과 같이 사용할 수 있습니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly apiService: ApiService,
  ) {}

  getApiOptions() {
    return this.apiService.getConfiguration();
  }
}
```

이 예제는 관련 클래스와 Import가 적절하게 정의되어 있다는 것을 전제로 합니다.

이 구조에서 `UsersService`는 `API_MODULE_OPTIONS`를 직접 사용할 필요가 없습니다.

외부 Module에는 `ApiService`만 공개하고, 설정값 Provider는 `ApiModule` 내부 구현으로 유지할 수 있습니다.

---

## 7. register(), forRoot(), forFeature()

NestJS에서는 Dynamic Module을 구성할 때 `register()`, `forRoot()`, `forFeature()` 등의 정적 메서드 이름을 자주 사용합니다.

이 이름들은 NestJS 프레임워크가 특별한 의미로 강제하는 키워드가 아니라, Module의 사용 목적을 표현하기 위한 관례입니다.

### 7.1. register()

`register()`는 호출하는 Module에서 필요한 설정값을 전달하여 Dynamic Module을 구성하는 데 주로 사용합니다.

```typescript
@Module({
  imports: [
    ApiModule.register({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    }),
  ],
})
export class UsersModule {}
```

다른 Module에서도 서로 다른 옵션을 전달할 수 있습니다.

```typescript
@Module({
  imports: [
    ApiModule.register({
      baseUrl: 'https://another.example.com',
      timeout: 3000,
    }),
  ],
})
export class OrdersModule {}
```

이처럼 호출하는 Module에 따라 서로 다른 설정을 사용하는 구성을 표현할 때 `register()`를 사용합니다.

실제 Module 인스턴스의 식별과 공유 방식은 NestJS 버전, Dynamic Module 메타데이터 및 Module 구성에 따라 달라질 수 있습니다.

따라서 `register()`를 호출할 때마다 반드시 완전히 독립적인 객체가 생성된다고 가정해서는 안 됩니다.

### 7.2. forRoot()

`forRoot()`는 일반적으로 애플리케이션의 루트 수준에서 공통으로 사용할 설정을 구성할 때 사용합니다.

대표적인 사례는 데이터베이스 연결과 같은 애플리케이션 공통 인프라 설정입니다.

```typescript
@Module({
  imports: [
    DatabaseModule.forRoot({
      host: 'localhost',
      port: 3306,
    }),
  ],
})
export class AppModule {}
```

`forRoot()`는 애플리케이션 전체 또는 넓은 범위에서 공유할 설정을 구성한다는 의도를 표현합니다.

다만 메서드 이름만으로 Module이 자동으로 Global Module이 되거나 Singleton이 보장되는 것은 아닙니다.

공유 범위는 Module의 등록, Import, Export 및 Global 설정에 따라 결정됩니다.

### 7.3. forFeature()

`forFeature()`는 일반적으로 `forRoot()`에서 설정한 공통 기능을 특정 Feature Module에서 사용하도록 구성하는 데 활용합니다.

예를 들어 TypeORM에서는 다음과 같이 사용할 수 있습니다.

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
  ],
})
export class UsersModule {}
```

위 예제는 `@nestjs/typeorm`과 TypeORM이 설치되어 있고, `UserEntity`가 정의되어 있으며, 애플리케이션에서 데이터베이스 연결이 적절하게 구성되었다는 것을 전제로 합니다.

`forFeature()`는 특정 Feature Module에서 필요한 Repository 등의 Provider를 등록하는 데 활용할 수 있습니다.

### 7.4. 주요 차이

| 메서드 | 일반적인 목적 | 사용 위치 |
|---|---|---|
| `register()` | 호출하는 Module에 필요한 설정 전달 | Feature Module 또는 사용하는 Module |
| `forRoot()` | 애플리케이션 수준의 공통 설정 | Root Module 또는 Core Module |
| `forFeature()` | 공통 설정을 활용한 기능별 Provider 구성 | Feature Module |

다음과 같은 구조로 표현할 수 있습니다.

```text
AppModule
    │
    └── DatabaseModule.forRoot(...)
             │
             │ 공통 연결 설정
             ▼
        Database Connection
             │
       ┌─────┴──────┐
       │            │
       ▼            ▼
UsersModule      OrdersModule
    │                │
    ▼                ▼
forFeature(...)   forFeature(...)
    │                │
    ▼                ▼
User Repository   Order Repository
```

이 그림은 `forRoot()`와 `forFeature()`를 사용하는 일반적인 패턴을 설명하기 위한 것입니다.

NestJS가 모든 Dynamic Module에 이러한 관계를 자동으로 구현하는 것은 아닙니다.

---

## 8. 비동기 Dynamic Module

애플리케이션의 설정값을 비동기로 조회해야 하는 경우 Dynamic Module과 Async Factory Provider를 조합할 수 있습니다.

예를 들어 다음과 같은 상황을 고려할 수 있습니다.

- 외부 설정 서버에서 구성 정보 조회
- 비동기 인증 정보 로딩
- 데이터베이스 연결에 필요한 설정 조회
- 다른 Provider를 통한 설정값 생성

일반적으로 이러한 기능은 `registerAsync()` 또는 `forRootAsync()` 등의 메서드로 제공합니다.

### 8.1. 비동기 설정의 기본 원리

일반적인 `register()`는 설정값을 직접 전달받습니다.

```typescript
ApiModule.register({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
});
```

반면 비동기 설정에서는 Factory를 통해 옵션을 생성할 수 있습니다.

```typescript
ApiModule.registerAsync({
  useFactory: async () => ({
    baseUrl: 'https://api.example.com',
    timeout: 5000,
  }),
});
```

이 예제는 `ApiModule`에 `registerAsync()`가 구현되어 있다는 것을 전제로 합니다.

`registerAsync()`라는 이름만 선언한다고 해서 NestJS가 비동기 설정 기능을 자동으로 생성하는 것은 아닙니다.

직접 구현하거나 `ConfigurableModuleBuilder`를 활용해야 합니다.

### 8.2. 비동기 설정 옵션

다음과 같이 Async Factory 옵션을 정의할 수 있습니다.

**api-options.interface.ts**

```typescript
import type { ModuleMetadata } from '@nestjs/common';

export interface ApiModuleOptions {
  baseUrl: string;
  timeout: number;
}

export interface ApiModuleAsyncOptions {
  imports?: ModuleMetadata['imports'];
  inject?: unknown[];
  useFactory: (
    ...args: any[]
  ) => Promise<ApiModuleOptions> | ApiModuleOptions;
}
```

이 예제는 Factory 기반 비동기 설정을 설명하기 위한 최소 형태입니다.

실제 라이브러리에서는 `inject`의 타입과 선택적 의존성, Factory Class 등을 보다 구체적으로 정의할 수 있습니다.

### 8.3. registerAsync() 구현

**api.module.ts**

```typescript
import { DynamicModule, Module } from '@nestjs/common';

import { ApiService } from './api.service';
import { API_MODULE_OPTIONS } from './api.constants';

import type {
  ApiModuleAsyncOptions,
} from './api-options.interface';

@Module({})
export class ApiModule {
  static registerAsync(
    options: ApiModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: ApiModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: API_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ApiService,
      ],
      exports: [ApiService],
    };
  }
}
```

이 Module은 `useFactory`가 반환하는 값을 `API_MODULE_OPTIONS` Provider로 등록합니다.

### 8.4. registerAsync() 사용

```typescript
@Module({
  imports: [
    ApiModule.registerAsync({
      useFactory: async () => {
        const baseUrl =
          process.env.API_BASE_URL
          ?? 'https://api.example.com';

        return {
          baseUrl,
          timeout: 5000,
        };
      },
    }),
  ],
})
export class AppModule {}
```

Factory가 Promise를 반환하면 NestJS는 해당 Promise가 해결된 후 설정 Provider를 사용할 수 있도록 합니다.

### 8.5. 다른 Provider를 통한 설정값 생성

Factory는 다른 Provider를 주입받아 옵션을 생성할 수도 있습니다.

```typescript
ApiModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    baseUrl: configService.getOrThrow<string>('API_BASE_URL'),
    timeout: configService.get<number>('API_TIMEOUT') ?? 5000,
  }),
});
```

위 예제는 `@nestjs/config`의 `ConfigModule`과 `ConfigService`가 설치 및 구성되어 있다는 것을 전제로 합니다.

또한 `ConfigModule`이 `ConfigService`를 외부에 공개해야 합니다.

이 경우 처리 과정은 다음과 같습니다.

```text
ApiModule.registerAsync()
          │
          ▼
     ConfigModule Import
          │
          ▼
     ConfigService 해결
          │
          ▼
       useFactory()
          │
          ▼
     ApiModuleOptions
          │
          ▼
     API_MODULE_OPTIONS
          │
          ▼
       ApiService
```

### 8.6. imports와 inject의 관계

비동기 Dynamic Module에서 `imports`와 `inject`는 서로 다른 역할을 수행합니다.

| 속성 | 역할 |
|---|---|
| `imports` | Factory에서 필요한 Provider를 공개하는 Module을 가져옵니다. |
| `inject` | Factory 함수의 매개변수로 전달할 Provider를 지정합니다. |
| `useFactory` | 주입받은 의존성을 사용하여 설정값을 생성합니다. |

`inject`에 Provider를 선언했다고 해서 해당 Provider가 자동으로 등록되는 것은 아닙니다.

현재 Module에서 접근할 수 있는 Provider여야 합니다.

---

## 9. ConfigurableModuleBuilder

NestJS는 설정 가능한 Dynamic Module을 보다 간결하게 구현하기 위해 `ConfigurableModuleBuilder`를 제공합니다.

직접 `register()`와 `registerAsync()`를 구현하면 설정 옵션, Injection Token, Async Factory 등의 보일러플레이트 코드가 증가할 수 있습니다.

`ConfigurableModuleBuilder`는 이러한 구성을 자동으로 생성하는 기능입니다.

### 9.1. 기본 구성

먼저 Module의 설정 옵션을 정의합니다.

**api-options.interface.ts**

```typescript
export interface ApiModuleOptions {
  baseUrl: string;
  timeout: number;
}
```

다음으로 `ConfigurableModuleBuilder`를 사용합니다.

**api.module-definition.ts**

```typescript
import { ConfigurableModuleBuilder } from '@nestjs/common';

import type { ApiModuleOptions } from './api-options.interface';

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} = new ConfigurableModuleBuilder<ApiModuleOptions>()
  .build();
```

위 코드는 다음 구성 요소를 생성합니다.

| 구성 요소 | 설명 |
|---|---|
| `ConfigurableModuleClass` | 설정 가능한 Module의 기반 클래스입니다. |
| `MODULE_OPTIONS_TOKEN` | 설정 옵션을 주입하기 위한 Injection Token입니다. |

기본적으로 `ConfigurableModuleClass`는 `register()`와 `registerAsync()` 메서드를 제공합니다.

### 9.2. Dynamic Module 구현

**api.module.ts**

```typescript
import { Module } from '@nestjs/common';

import { ApiService } from './api.service';
import { ConfigurableModuleClass } from './api.module-definition';

@Module({
  providers: [ApiService],
  exports: [ApiService],
})
export class ApiModule extends ConfigurableModuleClass {}
```

`ApiModule`은 생성된 `ConfigurableModuleClass`를 상속합니다.

따라서 `register()`와 `registerAsync()`를 직접 구현하지 않아도 사용할 수 있습니다.

### 9.3. 설정 옵션 주입

**api.service.ts**

```typescript
import { Inject, Injectable } from '@nestjs/common';

import {
  MODULE_OPTIONS_TOKEN,
} from './api.module-definition';

import type {
  ApiModuleOptions,
} from './api-options.interface';

@Injectable()
export class ApiService {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: ApiModuleOptions,
  ) {}

  getConfiguration(): ApiModuleOptions {
    return this.options;
  }
}
```

`MODULE_OPTIONS_TOKEN`은 Builder가 생성한 Injection Token입니다.

`ApiService`는 해당 토큰을 통해 Module의 설정값을 주입받습니다.

### 9.4. register() 사용

```typescript
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

### 9.5. registerAsync() 사용

```typescript
@Module({
  imports: [
    ApiModule.registerAsync({
      useFactory: async () => ({
        baseUrl: 'https://api.example.com',
        timeout: 5000,
      }),
    }),
  ],
})
export class AppModule {}
```

`ConfigurableModuleBuilder`를 사용하면 동기 및 비동기 설정을 지원하는 Dynamic Module을 상대적으로 적은 코드로 구현할 수 있습니다.

---

## 10. ConfigurableModuleBuilder의 고급 기능

`ConfigurableModuleBuilder`는 생성되는 메서드의 이름과 옵션 처리 방식을 변경할 수 있도록 여러 메서드를 제공합니다.

### 10.1. setClassMethodName()

기본적으로 Builder는 `register()`와 `registerAsync()`를 생성합니다.

`setClassMethodName()`을 사용하면 메서드 이름을 변경할 수 있습니다.

```typescript
export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} = new ConfigurableModuleBuilder<ApiModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
```

위 구성에서는 다음 메서드가 생성됩니다.

- `forRoot()`
- `forRootAsync()`

따라서 Module을 다음과 같이 사용할 수 있습니다.

```typescript
@Module({
  imports: [
    ApiModule.forRoot({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    }),
  ],
})
export class AppModule {}
```

`setClassMethodName()`은 애플리케이션 전역 설정을 구성하는 Module에서 `forRoot()` 관례를 사용하고 싶을 때 유용합니다.

### 10.2. setFactoryMethodName()

비동기 설정에서 Factory 클래스를 사용하는 경우 기본적으로 `create()` 메서드를 통해 옵션을 생성하도록 구성합니다.

`setFactoryMethodName()`을 사용하면 해당 메서드의 이름을 변경할 수 있습니다.

```typescript
export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} = new ConfigurableModuleBuilder<ApiModuleOptions>()
  .setFactoryMethodName('createApiOptions')
  .build();
```

이 경우 Factory 클래스는 다음과 같이 구현할 수 있습니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiOptionsFactory {
  createApiOptions(): ApiModuleOptions {
    return {
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    };
  }
}
```

사용하는 Module에서는 다음과 같이 구성합니다.

```typescript
@Module({
  imports: [
    ApiModule.registerAsync({
      useClass: ApiOptionsFactory,
    }),
  ],
})
export class AppModule {}
```

이 예제는 `ApiOptionsFactory`가 `ApiModuleOptions` 타입을 반환하며, 앞에서 설정한 Builder 기반 `ApiModule`을 사용한다는 것을 전제로 합니다.

### 10.3. setExtras()

`setExtras()`는 Provider에 주입할 설정값과 Module의 동작을 제어하는 추가 옵션을 분리하는 기능입니다.

예를 들어 Module을 Global Module로 등록할지 결정하는 `isGlobal` 옵션을 추가할 수 있습니다.

```typescript
export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} = new ConfigurableModuleBuilder<ApiModuleOptions>()
  .setExtras(
    {
      isGlobal: false,
    },
    (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }),
  )
  .build();
```

이제 다음과 같이 사용할 수 있습니다.

```typescript
@Module({
  imports: [
    ApiModule.register({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

`isGlobal`은 Module 등록 동작을 제어하는 추가 옵션입니다.

따라서 `MODULE_OPTIONS_TOKEN`으로 주입되는 `ApiModuleOptions`에는 `isGlobal`이 포함되지 않습니다.

이러한 방식은 Provider의 비즈니스 설정과 Module 자체의 등록 설정을 분리할 때 유용합니다.

### 10.4. 생성된 메서드 확장

`ConfigurableModuleBuilder`로 생성한 메서드의 반환값을 확장할 수도 있습니다.

```typescript
import { DynamicModule, Module } from '@nestjs/common';

import { ConfigurableModuleClass } from './api.module-definition';
import type { ApiModuleOptions } from './api-options.interface';

@Module({})
export class ApiModule extends ConfigurableModuleClass {
  static register(options: ApiModuleOptions): DynamicModule {
    const definition = super.register(options);

    return {
      ...definition,
      providers: [
        ...(definition.providers ?? []),
        ApiService,
      ],
      exports: [
        ...(definition.exports ?? []),
        ApiService,
      ],
    };
  }
}
```

위 예제는 `ApiService`가 정의되어 있고, `@Module()`의 정적 메타데이터에 중복 등록하지 않는 구성을 전제로 합니다.

이러한 방식은 자동 생성된 설정 Provider를 유지하면서 별도의 Provider를 추가해야 하는 경우에 활용할 수 있습니다.

다만 단순히 고정된 Service를 등록하려는 목적이라면 일반적인 `@Module()` 메타데이터를 사용하는 편이 더 간결합니다.

---

## 11. Dynamic Module과 Global Module

Dynamic Module도 Global Module로 구성할 수 있습니다.

Global Module로 등록하면 해당 Module이 공개한 Provider를 다른 Module에서 명시적으로 Import하지 않고 사용할 수 있습니다.

### 11.1. global 속성

```typescript
import { DynamicModule, Module } from '@nestjs/common';

@Module({})
export class ApiModule {
  static forRoot(): DynamicModule {
    return {
      module: ApiModule,
      global: true,
      providers: [ApiService],
      exports: [ApiService],
    };
  }
}
```

`global: true`를 지정하면 해당 Dynamic Module을 전역 범위로 등록합니다.

### 11.2. Root Module 등록

```typescript
@Module({
  imports: [
    ApiModule.forRoot(),
  ],
})
export class AppModule {}
```

이후 다른 Module에서는 `ApiService`를 직접 주입받을 수 있습니다.

단, `ApiService`가 `exports`에 등록되어 있어야 합니다.

### 11.3. Global Module 사용 시 주의사항

Global Module은 반복적인 Import를 줄일 수 있지만 Module 간 의존성을 암묵적으로 형성할 수 있습니다.

따라서 다음 사항을 고려해야 합니다.

- 애플리케이션 전반에서 공유해야 하는 기능인지 확인합니다.
- Global Module을 Root Module 또는 Core Module에서 등록하도록 구성합니다.
- 내부 Provider를 모두 공개하지 않고 필요한 Provider만 공개합니다.
- Feature Module의 일반적인 비즈니스 기능은 명시적인 Import를 우선적으로 사용합니다.

`forRoot()`라는 이름이 Global Module을 자동으로 의미하지 않는다는 점도 중요합니다.

Global 여부는 `@Global()` 또는 Dynamic Module의 `global` 속성 등으로 결정됩니다.

---

## 12. Dynamic Module과 Provider 공유

Dynamic Module도 일반적인 Module과 동일한 Provider 캡슐화 규칙을 따릅니다.

### 12.1. 공개된 Provider 사용

다음과 같이 Dynamic Module에서 `ApiService`를 공개한다고 가정합니다.

```typescript
@Module({})
export class ApiModule {
  static register(options: ApiModuleOptions): DynamicModule {
    return {
      module: ApiModule,
      providers: [
        {
          provide: API_MODULE_OPTIONS,
          useValue: options,
        },
        ApiService,
      ],
      exports: [ApiService],
    };
  }
}
```

다른 Module에서는 다음과 같이 가져옵니다.

```typescript
@Module({
  imports: [
    ApiModule.register({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    }),
  ],
  providers: [UsersService],
})
export class UsersModule {}
```

`UsersService`는 `ApiService`를 주입받을 수 있습니다.

### 12.2. Dynamic Module 재공개

Dynamic Module을 다른 Module에서 재공개할 수도 있습니다.

```typescript
@Module({
  imports: [
    ApiModule.register({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    }),
  ],
  exports: [ApiModule],
})
export class InfrastructureModule {}
```

`InfrastructureModule`을 가져오는 다른 Module에서는 재공개된 Dynamic Module의 Exported Provider를 사용할 수 있습니다.

```typescript
@Module({
  imports: [InfrastructureModule],
  providers: [UsersService],
})
export class UsersModule {}
```

이 방식은 여러 인프라 관련 Module을 하나의 공통 Module로 관리하는 경우에 활용할 수 있습니다.

### 12.3. 같은 Dynamic Module의 반복 등록

다음과 같이 동일한 Dynamic Module을 여러 위치에서 등록할 수 있습니다.

```typescript
ApiModule.register({
  baseUrl: 'https://api-a.example.com',
  timeout: 5000,
});
```

```typescript
ApiModule.register({
  baseUrl: 'https://api-b.example.com',
  timeout: 3000,
});
```

이러한 등록은 서로 다른 설정을 사용하도록 의도한 구성입니다.

그러나 실제 Provider 인스턴스가 어떻게 구분되거나 공유되는지는 NestJS의 Module 식별 방식과 등록 메타데이터에 영향을 받습니다.

따라서 다음 사항을 확인해야 합니다.

- 서로 다른 설정이 독립적으로 적용되는지 확인합니다.
- 동일한 Injection Token이 예상하지 못한 Module 범위에서 충돌하지 않는지 확인합니다.
- 공유되어야 하는 Provider가 중복 생성되지 않는지 확인합니다.
- 실제 인스턴스 공유 여부가 중요한 경우 테스트로 검증합니다.

특히 데이터베이스 연결, WebSocket Client, 메시지 브로커 연결처럼 외부 자원을 사용하는 Module은 중복 초기화가 발생하지 않도록 구성해야 합니다.

---

## 13. Dynamic Module과 Injection Scope

Dynamic Module에 등록된 Provider도 일반적인 Provider와 동일하게 Injection Scope의 영향을 받습니다.

NestJS는 다음 Scope를 지원합니다.

| Scope | 특징 |
|---|---|
| `DEFAULT` | 동일한 Provider 등록에 대해 기본적으로 인스턴스를 재사용합니다. |
| `REQUEST` | 요청 컨텍스트별로 인스턴스를 생성합니다. |
| `TRANSIENT` | Consumer별로 별도의 인스턴스를 제공합니다. |

### 13.1. Request-scoped Provider 등록

Dynamic Module에서 Request-scoped Provider를 등록할 수 있습니다.

```typescript
import { DynamicModule, Module, Scope } from '@nestjs/common';

@Module({})
export class ContextModule {
  static register(): DynamicModule {
    return {
      module: ContextModule,
      providers: [
        {
          provide: 'REQUEST_CONTEXT',
          scope: Scope.REQUEST,
          useFactory: () => ({
            createdAt: Date.now(),
          }),
        },
      ],
      exports: ['REQUEST_CONTEXT'],
    };
  }
}
```

위 Factory Provider는 요청 컨텍스트별로 생성될 수 있습니다.

### 13.2. Scope와 Dynamic Module의 관계

Dynamic Module은 Provider의 등록 방식을 결정하지만, 모든 Provider의 생명주기를 자동으로 변경하는 것은 아닙니다.

따라서 Dynamic Module에서 제공하는 Provider의 Scope를 명확하게 정의해야 합니다.

특히 REQUEST Scope Provider에 의존하는 Consumer는 Scope 전파의 영향을 받을 수 있습니다.

Scope에 관한 자세한 내용은 `injection-scopes.md`에서 설명합니다.

---

## 14. Dynamic Module과 Lifecycle Hooks

Dynamic Module에서 등록한 Provider도 NestJS의 Lifecycle Hook을 사용할 수 있습니다.

대표적인 Hook은 다음과 같습니다.

| Lifecycle Hook | 설명 |
|---|---|
| `onModuleInit()` | Module 초기화 과정에서 실행됩니다. |
| `onApplicationBootstrap()` | 애플리케이션 초기화 완료 단계에서 실행됩니다. |
| `onModuleDestroy()` | 애플리케이션 종료 과정에서 실행됩니다. |
| `beforeApplicationShutdown()` | 애플리케이션 종료 전 정리 작업을 수행합니다. |
| `onApplicationShutdown()` | 종료 과정의 마지막 단계에서 실행됩니다. |

### 14.1. 초기화 Hook

```typescript
import {
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class ApiClientService implements OnModuleInit {
  onModuleInit(): void {
    console.log('API Client initialized');
  }
}
```

Dynamic Module에 등록하면 일반적인 Provider와 동일하게 초기화 과정에서 Hook을 사용할 수 있습니다.

### 14.2. 종료 Hook

외부 연결 객체를 관리하는 경우 종료 작업이 필요할 수 있습니다.

```typescript
import {
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

@Injectable()
export class ConnectionService
  implements OnModuleDestroy {

  async onModuleDestroy(): Promise<void> {
    console.log('Connection cleanup');
  }
}
```

실제 데이터베이스나 메시지 브로커 연결을 관리한다면 해당 클라이언트에서 제공하는 연결 종료 API를 호출해야 합니다.

또한 운영체제 종료 신호에 따른 Lifecycle Hook 실행은 `enableShutdownHooks()` 등의 설정을 추가로 고려해야 합니다.

### 14.3. Factory가 생성한 외부 자원

Dynamic Module에서 비동기 Factory로 외부 연결 객체를 생성할 수 있습니다.

그러나 `useFactory`가 반환한 일반 객체의 정리 작업이 자동으로 수행된다고 가정해서는 안 됩니다.

외부 자원 정리가 필요한 경우 해당 객체를 관리하는 별도의 Provider를 구성하고 Lifecycle Hook을 활용하는 방식을 고려할 수 있습니다.

---

## 15. Dynamic Module 테스트

Dynamic Module은 설정에 따라 Provider 구성이 달라질 수 있으므로 Module 등록과 의존성 해결을 함께 검증하는 것이 중요합니다.

NestJS는 `@nestjs/testing` 패키지를 사용하여 테스트용 Module을 구성할 수 있습니다.

다음 예제는 Jest를 사용하는 환경을 전제로 합니다.

### 15.1. 설정값 주입 테스트

다음과 같은 Dynamic Module을 가정합니다.

```typescript
@Module({})
export class ApiModule {
  static register(options: ApiModuleOptions): DynamicModule {
    return {
      module: ApiModule,
      providers: [
        {
          provide: API_MODULE_OPTIONS,
          useValue: options,
        },
        ApiService,
      ],
      exports: [ApiService],
    };
  }
}
```

다음과 같이 Testing Module을 구성할 수 있습니다.

```typescript
import { Test } from '@nestjs/testing';

import { ApiModule } from './api.module';
import { ApiService } from './api.service';

describe('ApiModule', () => {
  it('설정값을 ApiService에 주입해야 합니다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ApiModule.register({
          baseUrl: 'https://test.example.com',
          timeout: 3000,
        }),
      ],
    }).compile();

    const apiService = moduleRef.get(ApiService);

    expect(apiService.getConfiguration()).toEqual({
      baseUrl: 'https://test.example.com',
      timeout: 3000,
    });

    await moduleRef.close();
  });
});
```

이 테스트는 Dynamic Module에 전달한 설정값이 `ApiService`에 올바르게 주입되는지 검증합니다.

### 15.2. 비동기 설정 테스트

비동기 Dynamic Module도 Testing Module에 등록할 수 있습니다.

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [
    ApiModule.registerAsync({
      useFactory: async () => ({
        baseUrl: 'https://async.example.com',
        timeout: 5000,
      }),
    }),
  ],
}).compile();
```

이 예제는 `ApiModule`에 `registerAsync()`가 구현되어 있다는 것을 전제로 합니다.

비동기 Factory의 결과가 주입된 이후 Consumer가 정상적으로 생성되는지 검증할 수 있습니다.

### 15.3. 테스트 시 확인할 사항

Dynamic Module을 테스트할 때는 다음 사항을 확인하는 것이 좋습니다.

- 전달한 설정값이 Provider에 올바르게 주입되는지 확인합니다.
- 비동기 Factory가 정상적으로 완료되는지 검증합니다.
- 필요한 Provider가 외부 Module에 공개되는지 확인합니다.
- 잘못된 설정값이 전달되었을 때 적절한 오류가 발생하는지 검증합니다.
- 외부 연결 객체가 중복 생성되지 않는지 확인합니다.
- 종료 시 외부 자원이 올바르게 정리되는지 검증합니다.

---

## 16. 전체 구현 예제

앞에서 설명한 `ConfigurableModuleBuilder`, Injection Token, Constructor Injection 및 Module Export를 조합하여 설정 가능한 API Module을 구현합니다.

이 예제에서는 외부 HTTP 요청을 실제로 수행하지 않고 설정값을 조회하는 API를 구현합니다.

따라서 NestJS의 기본적인 의존성 외에 별도의 HTTP Client 라이브러리는 필요하지 않습니다.

### 16.1. 디렉터리 구조

```text
src/
├── main.ts
├── app.module.ts
│
└── api/
    ├── api-options.interface.ts
    ├── api.module-definition.ts
    ├── api.module.ts
    ├── api.service.ts
    └── api.controller.ts
```

### 16.2. 설정 옵션

**api/api-options.interface.ts**

```typescript
export interface ApiModuleOptions {
  baseUrl: string;
  timeout: number;
}
```

### 16.3. ConfigurableModuleBuilder

**api/api.module-definition.ts**

```typescript
import { ConfigurableModuleBuilder } from '@nestjs/common';

import type { ApiModuleOptions } from './api-options.interface';

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} = new ConfigurableModuleBuilder<ApiModuleOptions>()
  .build();
```

### 16.4. Service 구현

**api/api.service.ts**

```typescript
import { Inject, Injectable } from '@nestjs/common';

import {
  MODULE_OPTIONS_TOKEN,
} from './api.module-definition';

import type {
  ApiModuleOptions,
} from './api-options.interface';

@Injectable()
export class ApiService {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: ApiModuleOptions,
  ) {}

  getConfiguration(): ApiModuleOptions {
    return {
      baseUrl: this.options.baseUrl,
      timeout: this.options.timeout,
    };
  }
}
```

`ApiService`는 Module 등록 과정에서 전달된 설정값을 주입받습니다.

### 16.5. Controller 구현

**api/api.controller.ts**

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

import { ApiService } from './api.service';

@Controller('api-config')
export class ApiController {
  constructor(
    private readonly apiService: ApiService,
  ) {}

  @Get()
  getConfiguration() {
    return this.apiService.getConfiguration();
  }
}
```

### 16.6. Dynamic Module 구현

**api/api.module.ts**

```typescript
import { Module } from '@nestjs/common';

import { ApiController } from './api.controller';
import { ApiService } from './api.service';

import {
  ConfigurableModuleClass,
} from './api.module-definition';

@Module({
  controllers: [ApiController],
  providers: [ApiService],
  exports: [ApiService],
})
export class ApiModule extends ConfigurableModuleClass {}
```

`ApiModule`은 `ConfigurableModuleClass`를 상속하여 `register()`와 `registerAsync()`를 사용할 수 있습니다.

### 16.7. Root Module

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ApiModule } from './api/api.module';

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

### 16.8. Bootstrap

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

### 16.9. API 요청

다음 HTTP 요청을 실행합니다.

```http
GET /api-config
```

응답은 다음과 같습니다.

```json
{
  "baseUrl": "https://api.example.com",
  "timeout": 5000
}
```

### 16.10. 의존성 해결 구조

전체 구성은 다음과 같습니다.

```text
AppModule
    │
    │ ApiModule.register(options)
    ▼
ApiModule
    │
    ├── MODULE_OPTIONS_TOKEN
    │           │
    │           │ Constructor Injection
    │           ▼
    ├── ApiService
    │       ▲
    │       │
    └── ApiController
            │
            │ GET /api-config
            ▼
         Client
```

이 구조에서 `ApiModule`은 설정값과 Provider의 등록을 담당합니다.

`ApiService`는 주입받은 설정값을 사용하여 기능을 제공하고, `ApiController`는 해당 기능을 HTTP API로 노출합니다.

`ApiModule.registerAsync()`를 사용하도록 변경하면 동일한 Service 및 Controller 구현을 유지하면서 설정값의 생성 방식만 변경할 수 있습니다.

---

## 17. Dynamic Module 설계 시 고려사항

Dynamic Module은 설정 가능한 기능을 구현할 수 있다는 장점이 있지만, 지나치게 복잡한 구성을 피하는 것이 중요합니다.

### 17.1. 모든 Module을 Dynamic Module로 구성하지 않습니다

Dynamic Module은 설정값이나 Provider 등록 구성이 달라져야 하는 경우에 유용합니다.

그러나 일반적인 Feature Module처럼 구성 요소가 고정되어 있다면 Static Module만으로도 충분합니다.

Dynamic Module을 불필요하게 사용하면 코드 구조와 의존성 관계가 복잡해질 수 있습니다.

### 17.2. Module의 설정과 비즈니스 로직을 분리합니다

Dynamic Module의 정적 메서드는 Provider 등록과 초기 설정을 담당하도록 구성하는 것이 좋습니다.

실제 비즈니스 로직은 Service에 구현합니다.

### 17.3. 필요한 Provider만 공개합니다

Dynamic Module 내부에 등록된 모든 Provider를 외부에 공개할 필요는 없습니다.

외부 Module에서 사용할 기능만 `exports`에 등록하여 내부 구현을 캡슐화하는 것이 좋습니다.

### 17.4. 비동기 Factory의 실패를 고려합니다

비동기 Factory에서 예외가 발생하면 의존성 해결이 실패하고 애플리케이션 초기화가 완료되지 않을 수 있습니다.

따라서 외부 시스템에 의존하는 Factory는 Timeout, Retry 및 오류 처리 정책을 고려해야 합니다.

### 17.5. 설정값을 검증합니다

Dynamic Module에 전달되는 설정값이 올바른지 확인해야 합니다.

예를 들어 다음과 같이 필수 설정값을 검증할 수 있습니다.

```typescript
static register(options: ApiModuleOptions): DynamicModule {
  if (!options.baseUrl) {
    throw new Error('API baseUrl is required');
  }

  if (options.timeout <= 0) {
    throw new Error('API timeout must be greater than zero');
  }

  return {
    module: ApiModule,
    providers: [
      {
        provide: API_MODULE_OPTIONS,
        useValue: options,
      },
      ApiService,
    ],
    exports: [ApiService],
  };
}
```

위 예제는 기본적인 검증 방식입니다.

실제 애플리케이션에서는 설정값의 형식, 허용 범위 및 환경별 요구사항을 추가로 검증할 수 있습니다.

### 17.6. 공유 Provider의 중복 생성을 방지합니다

Dynamic Module이 데이터베이스 연결이나 외부 Client를 생성하는 경우 중복 등록으로 인해 불필요한 연결이 생성될 수 있습니다.

따라서 Provider의 공유 범위와 등록 위치를 명확하게 설계해야 합니다.

### 17.7. register()와 forRoot()의 의미를 일관되게 사용합니다

NestJS에서 정적 메서드의 이름은 개발자가 정의할 수 있지만, 일반적인 관례를 따르는 것이 코드 이해에 도움이 됩니다.

- `register()`는 호출하는 Module에 필요한 설정을 전달할 때 사용합니다.
- `forRoot()`는 애플리케이션 수준의 공통 설정을 구성할 때 사용합니다.
- `forFeature()`는 특정 Feature Module에 필요한 구성을 추가할 때 사용합니다.

### 17.8. ConfigurableModuleBuilder를 우선적으로 고려합니다

설정 가능한 Module에서 동기 및 비동기 등록을 모두 지원해야 한다면 `ConfigurableModuleBuilder`를 고려할 수 있습니다.

이를 통해 반복적인 Provider Definition과 설정 메서드 구현을 줄일 수 있습니다.

다만 생성되는 Module 정의를 세밀하게 제어해야 하는 경우에는 직접 `DynamicModule` 객체를 구성하는 방식도 적합합니다.

---

## 18. 주요 개념 비교

Dynamic Module과 관련된 주요 개념을 정리하면 다음과 같습니다.

| 개념 | 설명 |
|---|---|
| Static Module | `@Module()` 메타데이터에 구성이 선언된 일반 Module |
| Dynamic Module | 설정값에 따라 Module 메타데이터를 동적으로 구성하는 Module |
| `DynamicModule` | Dynamic Module의 반환 객체 구조를 정의하는 인터페이스 |
| `register()` | 호출하는 Module에서 설정값을 전달하는 데 사용하는 관례적 메서드 |
| `registerAsync()` | Factory 등을 사용하여 설정값을 비동기로 제공하는 메서드 |
| `forRoot()` | 애플리케이션 수준의 공통 설정을 구성하는 관례적 메서드 |
| `forRootAsync()` | 공통 설정을 비동기로 구성하는 메서드 |
| `forFeature()` | 특정 Feature Module의 Provider 구성을 추가하는 관례적 메서드 |
| `ConfigurableModuleBuilder` | 설정 가능한 Module의 등록 메서드와 옵션 Provider를 생성하는 기능 |
| `ConfigurableModuleClass` | Builder가 생성하는 Module 기반 클래스 |
| `MODULE_OPTIONS_TOKEN` | Builder가 생성한 설정 Provider의 Injection Token |
| `setClassMethodName()` | 생성되는 정적 등록 메서드의 이름을 변경합니다. |
| `setFactoryMethodName()` | 비동기 옵션 Factory 클래스의 메서드 이름을 변경합니다. |
| `setExtras()` | 설정값과 Module 등록 동작을 제어하는 추가 옵션을 구분합니다. |

---

## 19. 정리

NestJS의 Dynamic Module은 Module을 사용하는 시점에 전달된 설정값에 따라 Provider와 Module의 구성을 동적으로 결정할 수 있도록 지원하는 기능입니다.

주요 특징은 다음과 같습니다.

1. **Dynamic Module은 설정 가능한 Module을 구현합니다.** Module을 가져올 때 전달한 옵션을 기반으로 Provider와 메타데이터를 구성할 수 있습니다.
2. **`DynamicModule` 인터페이스를 사용합니다.** `module`, `imports`, `providers`, `exports`, `global` 등의 속성을 정의할 수 있습니다.
3. **Static Module의 메타데이터를 확장합니다.** 기존 `@Module()` 구성에 동적인 Provider 등록 등을 추가할 수 있습니다.
4. **`register()`와 `forRoot()` 등의 정적 메서드를 사용합니다.** 각 메서드 이름은 사용 목적에 따른 관례이며, NestJS가 특정 이름을 강제하지 않습니다.
5. **비동기 설정을 지원합니다.** `useFactory`와 다른 Provider의 의존성 주입을 통해 설정값을 비동기로 생성할 수 있습니다.
6. **`ConfigurableModuleBuilder`를 제공합니다.** 동기 및 비동기 설정을 지원하는 Dynamic Module의 반복적인 구현 코드를 줄일 수 있습니다.
7. **Module의 캡슐화 규칙을 따릅니다.** 내부 Provider 중 외부에 제공할 대상만 `exports`로 공개합니다.
8. **Global Module로 구성할 수 있습니다.** Dynamic Module의 `global` 속성을 통해 전역 Provider 접근을 설정할 수 있습니다.
9. **Provider의 Scope와 Lifecycle을 고려해야 합니다.** 외부 연결 객체나 상태를 관리하는 Module은 인스턴스 공유 및 종료 처리를 명확하게 설계해야 합니다.
10. **Dynamic Module은 런타임의 임의적인 Module Graph 변경을 의미하지 않습니다.** 일반적으로 애플리케이션의 Module 등록 과정에서 구성이 결정됩니다.

Dynamic Module을 이해할 때 가장 중요한 점은 **Module의 등록 방식과 Provider 구성을 설정값에 따라 변경할 수 있으며, 이를 통해 재사용 가능한 기능 Module을 구현할 수 있다는 것**입니다.

일반적인 Feature Module은 Static Module로 구성하고, 설정 가능한 공통 인프라 또는 재사용 가능한 라이브러리 기능이 필요한 경우 Dynamic Module을 적용하는 것이 좋습니다.

---

## 20. 관련 문서

- `modules.md`: Module의 기본 구조와 Import, Export
- `providers.md`: Provider의 개념과 역할
- `dependency-injection.md`: DI Container와 의존성 해결
- `custom-providers.md`: Injection Token과 Custom Provider 등록
- `injection-scopes.md`: Provider 인스턴스의 생성 및 공유 범위
- `../03-techniques/configuration.md`: 환경 변수와 ConfigModule 구성
- `../03-techniques/database.md`: 데이터베이스 연결 및 Repository Provider
- `../03-techniques/http-module.md`: HTTP Client 구성 및 외부 API 연동
- `../06-testing/testing-modules.md`: Dynamic Module 테스트 환경 구성
- `../06-testing/mocking-providers.md`: 테스트에서 Provider 교체
- `../07-architecture/dependency-management.md`: 아키텍처 관점의 의존성 관리

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)  
  Dynamic Module의 개념, `register()`와 `forRoot()` 관례, 비동기 설정 및 `ConfigurableModuleBuilder`를 설명합니다.

- [NestJS Modules](https://docs.nestjs.com/modules)  
  일반 Module과 Dynamic Module의 기본 구조, Provider 등록 및 Module 간 공유 방식을 설명합니다.

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)  
  Injection Token과 `useValue`, `useClass`, `useFactory`, `useExisting` 등의 Custom Provider 등록 방식을 설명합니다.

- [NestJS Asynchronous Providers](https://docs.nestjs.com/fundamentals/async-providers)  
  비동기 Factory를 사용한 Provider 초기화와 의존성 해결 방식을 설명합니다.

- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)  
  Provider의 Singleton, Request, Transient Scope와 인스턴스 관리 방식을 설명합니다.

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)  
  ConfigModule과 ConfigService를 통한 설정값 관리 및 비동기 설정 구성을 설명합니다.

- [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref)  
  ModuleRef를 통해 Provider를 조회하고 동적으로 인스턴스를 해결하는 방법을 설명합니다.

- [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)  
  Module 및 Provider의 초기화와 종료에 사용할 수 있는 Lifecycle Hook을 설명합니다.

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)  
  Testing Module과 Provider 교체를 이용한 테스트 구성 방법을 설명합니다.

### GitHub Repository

- [NestJS 공식 GitHub Repository](https://github.com/nestjs/nest)  
  NestJS 프레임워크의 소스 코드와 Module 및 Dependency Injection 내부 구현을 확인할 수 있습니다.

- [NestJS Core Injector 구현](https://github.com/nestjs/nest/tree/master/packages/core/injector)  
  Module 등록, Provider 탐색, Dynamic Module 식별 및 의존성 해결과 관련된 내부 구현을 확인할 수 있습니다.

- [NestJS 공식 예제 Repository](https://github.com/nestjs/nest/tree/master/sample)  
  Dynamic Module과 Custom Provider를 활용한 다양한 구현 예제를 확인할 수 있습니다.