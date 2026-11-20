# NestJS Architecture

## 1. NestJS 아키텍처 개요

NestJS는 애플리케이션을 여러 구성 요소로 분리하고, 각 구성 요소의 책임과 의존 관계를 관리할 수 있도록 설계된 모듈 기반 아키텍처를 제공합니다.

NestJS의 아키텍처는 Angular에서 영감을 받았으며, 객체지향 프로그래밍과 Dependency Injection을 기반으로 구성 요소 간의 결합도를 낮추고 애플리케이션의 확장성과 유지보수성을 높이는 데 중점을 둡니다.

NestJS 애플리케이션의 주요 구성 요소는 다음과 같습니다.

- **Module:** 관련된 기능과 구성 요소를 하나의 단위로 구성합니다.
- **Controller:** 외부 요청을 수신하고 적절한 처리 로직으로 전달합니다.
- **Provider:** 비즈니스 로직과 애플리케이션에서 사용하는 기능을 제공합니다.
- **Dependency Injection Container:** Provider 간의 의존성을 분석하고 객체를 생성 및 주입합니다.
- **HTTP Adapter:** Express 또는 Fastify와 같은 HTTP 플랫폼과 NestJS 애플리케이션을 연결합니다.

이러한 구성 요소는 독립적으로 동작하는 것이 아니라 서로 협력하여 하나의 애플리케이션을 구성합니다.

## 2. NestJS 아키텍처의 전체 구조

NestJS 애플리케이션은 크게 애플리케이션 구성 계층, 요청 처리 계층, 비즈니스 로직 계층 및 외부 시스템 연동 계층으로 구분하여 이해할 수 있습니다.

다음은 주요 구성 요소 간의 관계를 개념적으로 표현한 구조입니다.

```text
┌──────────────────────────────────────────────────────┐
│                    Client                            │
└────────────────────────┬─────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│                 HTTP Platform                        │
│              Express / Fastify                       │
│                                                      │
│                 HTTP Adapter                         │
└────────────────────────┬─────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│                  NestJS Application                   │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │              Request Processing                │  │
│  │                                                │  │
│  │  Middleware → Guard → Interceptor → Pipe       │  │
│  │                                                │  │
│  │                  Controller                    │  │
│  │                      │                         │  │
│  │                      ▼                         │  │
│  │                   Provider                     │  │
│  │                      │                         │  │
│  │                      ▼                         │  │
│  │               External Systems                 │  │
│  │                                                │  │
│  │  Exception Filter / Interceptor                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │              Application Modules               │  │
│  │                                                │  │
│  │  AppModule                                     │  │
│  │    ├── UsersModule                             │  │
│  │    ├── AuthModule                              │  │
│  │    └── ProductsModule                          │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │         Dependency Injection Container          │  │
│  │                                                │  │
│  │  Provider Registration / Resolution            │  │
│  │  Object Creation / Dependency Injection        │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

위 구조는 NestJS의 구성 요소를 이해하기 위한 개념도이며, 실제 내부 구현의 실행 순서나 계층을 정확하게 표현한 것은 아닙니다.

특히 요청 처리 과정은 별도의 실행 흐름을 가지며, `request-lifecycle.md`에서 상세하게 설명합니다.

## 3. Module 중심의 애플리케이션 구성

### 3.1. Module의 역할

Module은 NestJS 애플리케이션을 구성하는 기본 단위입니다.

NestJS는 관련된 Controller와 Provider를 Module로 묶어 기능별 경계를 구성합니다.

모든 NestJS 애플리케이션에는 최소 하나의 Module이 존재하며, 이를 **Root Module**이라고 합니다.

Root Module은 애플리케이션의 시작점이며, NestJS는 Root Module을 기준으로 다른 Module과 Provider 간의 관계를 파악하여 애플리케이션 그래프(Application Graph)를 구성합니다.

일반적으로 애플리케이션의 기능이 증가하면 다음과 같이 여러 Feature Module로 분리합니다.

```text
AppModule
│
├── UsersModule
│   ├── UsersController
│   └── UsersService
│
├── AuthModule
│   ├── AuthController
│   └── AuthService
│
└── ProductsModule
    ├── ProductsController
    └── ProductsService
```

각 Module은 특정 기능이나 도메인에 관련된 구성 요소를 관리합니다.

예를 들어 `UsersModule`은 사용자와 관련된 Controller와 Provider를 관리하고, `AuthModule`은 인증 기능을 담당하는 Controller와 Provider를 관리합니다.

이러한 구조는 기능별 책임을 분리하고 애플리케이션의 복잡도가 증가하더라도 각 영역을 독립적으로 관리할 수 있도록 합니다.

### 3.2. Module의 구성 요소

Module은 `@Module()` Decorator를 사용하여 정의합니다.

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

`@Module()` Decorator는 Module의 구성 정보를 NestJS에 전달합니다.

주요 속성은 다음과 같습니다.

| 속성 | 역할 |
|---|---|
| `imports` | 현재 Module에서 사용할 Provider를 공개하는 다른 Module을 가져옵니다. |
| `controllers` | 현재 Module에서 관리할 Controller를 등록합니다. |
| `providers` | 현재 Module에서 사용할 Provider를 등록합니다. |
| `exports` | 다른 Module에서 사용할 수 있도록 Provider를 공개합니다. |

Module은 기본적으로 자신의 Provider를 캡슐화합니다.

따라서 다른 Module에서 특정 Provider를 사용하려면 해당 Provider가 등록된 Module을 Import하고, 그 Module이 Provider를 Export해야 합니다.

이를 통해 Module 간의 의존 관계와 공개 범위를 명확하게 관리할 수 있습니다.

### 3.3. Module 간의 의존 관계

다른 Module에서 제공하는 Provider를 사용하려면 해당 Provider를 Export한 Module을 Import해야 합니다.

예를 들어 `AuthModule`에서 `UsersService`를 사용해야 한다면 다음과 같이 구성할 수 있습니다.

```typescript
// users.module.ts

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

```typescript
// auth.module.ts

import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
})
export class AuthModule {}
```

이 구조에서 `AuthModule`은 `UsersModule`을 Import하므로 `UsersModule`이 Export한 `UsersService`를 사용할 수 있습니다.

Module 간의 관계는 다음과 같습니다.

```text
┌──────────────────┐
│    UsersModule   │
│                  │
│   UsersService   │
│        │         │
│        ▼         │
│      exports     │
└────────┬─────────┘
         │
         │ import
         ▼
┌──────────────────┐
│    AuthModule    │
│                  │
│    AuthService   │
│        │         │
│        ▼         │
│   UsersService   │
│   (DI로 주입)    │
└──────────────────┘
```

Module 간의 의존 관계를 명시적으로 관리하면 각 Module의 책임과 공개 인터페이스를 구분할 수 있습니다.

## 4. Controller와 Provider의 역할 분리

NestJS는 Controller와 Provider의 역할을 구분하여 요청 처리와 비즈니스 로직을 분리합니다.

### 4.1. Controller

Controller는 외부 요청을 수신하고 해당 요청을 처리할 로직으로 전달하는 역할을 담당합니다.

HTTP 애플리케이션에서는 `@Controller()` Decorator를 사용하여 Controller를 정의하고, `@Get()`, `@Post()` 등의 Decorator로 Route를 지정합니다.

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

Controller의 주요 책임은 다음과 같습니다.

- 요청을 수신하고 Route를 결정합니다.
- 요청 Parameter와 Body 등을 전달받습니다.
- 필요한 Provider의 메서드를 호출합니다.
- 처리 결과를 클라이언트에 반환합니다.

Controller에는 요청 처리에 필요한 로직을 배치하고, 복잡한 비즈니스 로직은 Provider에 위임하는 것이 권장됩니다.

### 4.2. Provider

Provider는 NestJS에서 Dependency Injection을 통해 관리할 수 있는 구성 요소입니다.

Service, Repository, Factory, Helper 등 다양한 클래스가 Provider로 사용될 수 있습니다.

일반적으로 비즈니스 로직이나 데이터 접근 로직은 Service 형태의 Provider에 구현합니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  findAll() {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
  }

  create(createUserDto: CreateUserDto) {
    return {
      id: 3,
      ...createUserDto,
    };
  }
}
```

`@Injectable()` Decorator는 해당 클래스를 NestJS의 Provider로 사용할 수 있도록 선언합니다.

Provider의 주요 책임은 다음과 같습니다.

- 비즈니스 로직 구현
- 데이터 조회 및 변경
- 다른 Provider와의 협력
- 외부 시스템 및 라이브러리 연동
- 애플리케이션에서 재사용할 기능 제공

Controller와 Provider의 역할을 분리하면 요청 처리 방식과 비즈니스 로직을 독립적으로 변경하고 테스트하기 쉬워집니다.

### 4.3. Controller와 Provider의 관계

Controller는 Provider를 직접 생성하지 않고 Dependency Injection을 통해 전달받습니다.

```text
┌──────────────────────┐
│   UsersController    │
│                      │
│   findAll()          │
│   create()           │
└──────────┬───────────┘
           │
           │ Dependency Injection
           ▼
┌──────────────────────┐
│     UsersService     │
│                      │
│   findAll()          │
│   create()           │
└──────────────────────┘
```

이러한 구조에서는 Controller가 구체적인 객체 생성 방식이나 생명주기를 직접 관리하지 않습니다.

NestJS의 DI Container가 Provider를 생성하고 필요한 구성 요소에 주입하는 역할을 담당합니다.

## 5. Dependency Injection과 IoC Container

### 5.1. Dependency Injection

Dependency Injection(DI)은 객체가 필요로 하는 의존 객체를 직접 생성하는 대신 외부에서 전달받도록 하는 설계 패턴입니다.

일반적인 객체 생성 방식에서는 다음과 같이 의존 객체를 직접 생성할 수 있습니다.

```typescript
export class UsersController {
  private readonly usersService = new UsersService();
}
```

이 방식은 Controller가 `UsersService`의 생성 방식과 구현체에 직접 의존하게 됩니다.

반면 NestJS에서는 Constructor Injection을 사용하여 의존 객체를 전달받을 수 있습니다.

```typescript
import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}
}
```

NestJS는 `UsersService`가 Provider로 등록되어 있는지 확인하고, 해당 Provider의 인스턴스를 생성하여 Controller에 주입합니다.

이를 통해 객체 생성 책임과 객체 사용 책임을 분리할 수 있습니다.

### 5.2. IoC Container

NestJS는 내부적으로 Inversion of Control(IoC) Container를 사용하여 Provider 간의 의존 관계를 관리합니다.

IoC Container는 다음과 같은 역할을 수행합니다.

- Provider 등록 및 관리
- 구성 요소 간 의존 관계 분석
- 필요한 객체의 생성
- 의존 객체 주입
- Provider의 생명주기 관리

개발자는 객체를 직접 생성하고 연결하는 대신, Module에 Provider를 등록하고 필요한 위치에 의존성을 선언합니다.

NestJS Runtime은 이러한 정보를 바탕으로 객체 간의 관계를 구성합니다.

### 5.3. Provider Scope

NestJS Provider는 기본적으로 Singleton Scope로 동작합니다.

동일한 Module의 Provider를 여러 구성 요소에서 주입받더라도 기본적으로 하나의 인스턴스를 공유합니다.

필요에 따라 Provider의 생명주기를 다르게 설정할 수도 있습니다.

| Scope | 설명 |
|---|---|
| `DEFAULT` | 애플리케이션 생명주기에 맞춰 하나의 인스턴스를 공유합니다. |
| `REQUEST` | 각 요청마다 별도의 인스턴스를 생성합니다. |
| `TRANSIENT` | Provider를 주입받는 대상마다 별도의 인스턴스를 생성합니다. |

Provider Scope는 객체의 생성 시점과 생명주기에 영향을 주므로, 상태를 가지는 Provider를 설계할 때 고려해야 합니다.

## 6. NestJS의 HTTP Platform 추상화

NestJS는 HTTP 서버 구현과 애플리케이션 로직을 분리할 수 있도록 Platform Adapter 구조를 제공합니다.

기본적으로 Express를 사용하며, Fastify와 같은 다른 HTTP 플랫폼으로 교체할 수도 있습니다.

```text
┌──────────────────────────────────────┐
│           NestJS Application         │
│                                      │
│   Controller / Provider / Module    │
│                                      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│            HTTP Adapter              │
│                                      │
│       Platform-specific Adapter      │
└───────────┬──────────────┬───────────┘
            │              │
            ▼              ▼
     ┌────────────┐  ┌────────────┐
     │  Express   │  │  Fastify   │
     └────────────┘  └────────────┘
```

HTTP Adapter는 NestJS 애플리케이션과 실제 HTTP 서버 플랫폼 사이의 연결을 담당합니다.

이러한 추상화 덕분에 대부분의 애플리케이션 로직을 특정 HTTP 플랫폼에 종속시키지 않고 개발할 수 있습니다.

다만 Express 또는 Fastify의 고유 API를 직접 사용하는 경우에는 해당 플랫폼에 대한 의존성이 발생할 수 있습니다.

### 6.1. HTTP 플랫폼 변경

NestJS에서는 애플리케이션을 생성할 때 사용할 HTTP Adapter를 지정할 수 있습니다.

기본 Express 기반 애플리케이션은 다음과 같이 실행합니다.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);
}

bootstrap();
```

Fastify를 사용하려면 Fastify Adapter를 지정합니다.

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.listen(3000);
}

bootstrap();
```

HTTP 플랫폼을 변경하더라도 Module, Controller, Provider를 중심으로 구성한 애플리케이션 구조는 대부분 유지할 수 있습니다.

## 7. NestJS의 요청 처리 구성 요소

NestJS는 요청 처리 과정에서 여러 구성 요소를 활용하여 공통 관심사를 분리합니다.

대표적인 구성 요소는 다음과 같습니다.

| 구성 요소 | 주요 역할 |
|---|---|
| Middleware | 요청이 Route Handler에 도달하기 전에 공통 로직을 실행합니다. |
| Guard | 요청을 처리할 수 있는지 판단합니다. |
| Interceptor | 요청과 응답을 가로채 추가 로직을 실행하거나 결과를 변환합니다. |
| Pipe | 입력값을 변환하고 유효성을 검증합니다. |
| Controller | 요청을 처리할 Route Handler를 제공합니다. |
| Provider | 비즈니스 로직과 애플리케이션 기능을 수행합니다. |
| Exception Filter | 처리 과정에서 발생한 예외를 처리합니다. |

각 구성 요소는 서로 다른 책임을 가지며, 이를 활용하면 인증, 인가, 입력 검증, 로깅, 응답 변환 및 예외 처리 등의 공통 기능을 비즈니스 로직과 분리할 수 있습니다.

전체 요청 처리 순서와 각 구성 요소의 실행 시점은 `request-lifecycle.md`에서 별도로 설명합니다.

## 8. NestJS 아키텍처의 설계 원칙

NestJS의 아키텍처는 애플리케이션을 구조적으로 관리하고 변경에 유연한 코드를 작성할 수 있도록 다음과 같은 설계 원칙을 지향합니다.

### 8.1. Modularity

애플리케이션을 기능별 Module로 분리하여 각 영역의 책임을 명확하게 관리합니다.

기능이 추가되더라도 기존 Module의 변경을 최소화하고 독립적인 기능 단위로 확장할 수 있습니다.

### 8.2. Separation of Concerns

각 구성 요소가 하나의 명확한 책임을 담당하도록 설계합니다.

예를 들어 Controller는 요청 처리에 집중하고, Provider는 비즈니스 로직을 담당합니다.

이를 통해 구성 요소 간 역할 중복을 줄이고 코드의 가독성과 유지보수성을 높일 수 있습니다.

### 8.3. Loose Coupling

Dependency Injection과 Module의 Export/Import 구조를 활용하여 구성 요소 간 직접적인 결합을 줄입니다.

구체적인 구현체 대신 추상화된 의존 관계를 사용하면 구현 변경이나 테스트 환경 구성에 유연하게 대응할 수 있습니다.

### 8.4. Reusability

공통 기능을 Provider 및 Module 형태로 구성하여 여러 기능 영역에서 재사용할 수 있습니다.

다른 Module에서 필요한 Provider만 Export하도록 구성하면 재사용성과 캡슐화를 함께 유지할 수 있습니다.

### 8.5. Testability

의존성 주입 구조를 활용하면 테스트 대상의 의존 객체를 Mock 객체나 대체 Provider로 교체할 수 있습니다.

이를 통해 실제 데이터베이스나 외부 시스템에 의존하지 않고도 개별 구성 요소의 동작을 검증할 수 있습니다.

## 9. 정리

NestJS 아키텍처는 Module을 중심으로 애플리케이션을 구성하고, Controller와 Provider를 통해 요청 처리와 비즈니스 로직을 분리합니다.

또한 Dependency Injection과 IoC Container를 활용하여 객체 생성과 의존 관계를 관리하며, HTTP Adapter를 통해 특정 HTTP 서버 플랫폼에 대한 의존성을 줄입니다.

주요 구성 요소의 관계를 정리하면 다음과 같습니다.

| 구성 요소 | 핵심 역할 |
|---|---|
| Module | 애플리케이션의 기능과 구성 요소를 조직합니다. |
| Controller | 외부 요청을 수신하고 처리 로직으로 전달합니다. |
| Provider | 비즈니스 로직과 애플리케이션 기능을 제공합니다. |
| DI Container | Provider의 생성과 의존 관계를 관리합니다. |
| HTTP Adapter | NestJS와 HTTP 서버 플랫폼을 연결합니다. |
| Middleware / Guard / Interceptor / Pipe | 요청 처리 과정의 공통 관심사를 담당합니다. |
| Exception Filter | 예외를 처리하고 적절한 응답을 구성합니다. |

NestJS의 아키텍처를 이해하려면 개별 구성 요소의 사용법뿐만 아니라 Module 간의 관계, Provider의 의존성 및 애플리케이션 전체의 구성 방식을 함께 이해해야 합니다.

## 참고 자료

### NestJS 공식 문서

- [NestJS Introduction](https://docs.nestjs.com/)
- [Modules](https://docs.nestjs.com/modules)
- [Controllers](https://docs.nestjs.com/controllers)
- [Providers](https://docs.nestjs.com/providers)
- [Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [Platform Agnosticism](https://docs.nestjs.com/fundamentals/platform-agnosticism)
- [HTTP Adapter](https://docs.nestjs.com/faq/http-adapter)

### 관련 문서

- [introduction.md](./introduction.md)
- [request-lifecycle.md](./request-lifecycle.md)
- [project-structure.md](./project-structure.md)

### 관련 학습 영역

- `01-fundamentals/`: Module, Controller, Provider 및 Dependency Injection의 상세 동작
- `02-request-lifecycle/`: 요청 처리 과정과 Middleware, Guard, Interceptor, Pipe 등의 실행 원리
- `07-architecture/`: Layered Architecture, Modular Monolith 및 Clean Architecture 등 애플리케이션 설계 패턴