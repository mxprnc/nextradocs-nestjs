# Dependency Injection

## 1. 개요

**Dependency Injection(DI, 의존성 주입)**은 객체가 필요로 하는 다른 객체를 직접 생성하지 않고, 외부에서 전달받도록 구성하는 설계 방식입니다.

NestJS는 Dependency Injection을 핵심 아키텍처 요소로 사용하며, 프레임워크 내부의 IoC Container를 통해 객체의 생성, 의존성 해결 및 인스턴스 생명주기를 관리합니다.

예를 들어 `UsersController`가 사용자 조회 기능을 수행하기 위해 `UsersService`를 사용한다고 가정합니다.

이때 `UsersController`가 `UsersService`를 직접 생성하는 대신 생성자에서 의존성을 선언하면, NestJS가 필요한 인스턴스를 생성하거나 조회하여 주입합니다.

Dependency Injection의 주요 목적은 다음과 같습니다.

- **결합도 감소(Loose Coupling):** 객체가 의존성의 생성 과정과 구체적인 구성 방법을 직접 관리하지 않도록 합니다.
- **관심사의 분리(Separation of Concerns):** 객체 생성 및 의존성 관리 책임을 비즈니스 로직에서 분리합니다.
- **테스트 용이성(Testability):** 실제 의존성을 Mock 또는 Stub으로 대체하기 쉽게 합니다.
- **유지보수성(Maintainability):** 의존성의 구현이나 구성 방식이 변경되더라도 사용하는 코드의 변경을 최소화할 수 있습니다.
- **재사용성(Reusability):** Provider를 여러 구성 요소에서 일관된 방식으로 사용할 수 있도록 합니다.
- **생명주기 관리(Lifecycle Management):** Singleton, Request, Transient 등 Provider의 인스턴스 관리 방식을 제어합니다.

NestJS에서 Dependency Injection은 Controller, Service, Repository, Guard, Interceptor 등 다양한 구성 요소를 연결하는 기본 메커니즘입니다.

---

## 2. Dependency와 Dependency Injection

Dependency Injection을 이해하려면 먼저 Dependency의 의미를 구분해야 합니다.

### 2.1. Dependency

Dependency는 특정 객체가 자신의 기능을 수행하기 위해 필요로 하는 다른 객체 또는 기능을 의미합니다.

예를 들어 다음과 같은 Service가 있다고 가정합니다.

```typescript
export class UsersRepository {
  findAll() {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
  }
}

export class UsersService {
  private readonly usersRepository = new UsersRepository();

  findAll() {
    return this.usersRepository.findAll();
  }
}
```

위 코드에서 `UsersService`는 `UsersRepository`에 의존합니다.

`UsersService`가 사용자 데이터를 조회하려면 `UsersRepository`의 기능이 필요하기 때문입니다.

의존성 관계는 다음과 같습니다.

```text
UsersService
     │
     │ depends on
     ▼
UsersRepository
```

그러나 위 코드에서는 `UsersService`가 `UsersRepository`의 생성 과정까지 직접 담당합니다.

이러한 방식은 객체의 생성과 사용이 하나의 클래스 내부에 결합된 구조입니다.

### 2.2. 직접 생성 방식의 문제점

다음 코드에서는 `UsersService`가 구체적인 Repository 구현을 직접 생성합니다.

```typescript
export class UsersService {
  private readonly usersRepository = new UsersRepository();
}
```

이 방식에는 다음과 같은 제약이 있습니다.

1. `UsersService`가 `UsersRepository`의 생성 방법을 알아야 합니다.
2. Repository의 생성자에 새로운 의존성이 추가되면 `UsersService`도 수정해야 할 수 있습니다.
3. 다른 Repository 구현으로 교체하려면 객체 생성 코드를 변경해야 합니다.
4. 단위 테스트에서 Repository를 Mock 객체로 대체하기 어려워질 수 있습니다.
5. Repository 인스턴스의 생성 및 공유 범위를 직접 관리해야 합니다.

특히 객체 간 의존성이 복잡해질수록 이러한 제약은 애플리케이션의 유지보수성을 저하시킬 수 있습니다.

### 2.3. Dependency Injection 적용

Dependency Injection을 적용하면 의존성을 외부에서 전달받도록 구성할 수 있습니다.

```typescript
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  findAll() {
    return this.usersRepository.findAll();
  }
}
```

이제 `UsersService`는 `UsersRepository`를 직접 생성하지 않습니다.

대신 생성자를 통해 필요한 의존성을 전달받습니다.

일반적인 TypeScript 코드에서는 다음과 같이 직접 의존성을 전달할 수도 있습니다.

```typescript
const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
```

이는 프레임워크 없이 구현한 Constructor Injection의 예제입니다.

NestJS에서는 이러한 객체 생성 및 의존성 연결 과정을 DI Container가 담당할 수 있습니다.

---

## 3. Inversion of Control (IoC)

**Inversion of Control(IoC, 제어의 역전)**은 객체의 생성이나 실행 흐름 등에 대한 제어 책임을 애플리케이션 코드에서 외부 시스템 또는 프레임워크로 이전하는 설계 원칙입니다.

Dependency Injection은 IoC를 구현하는 대표적인 기법입니다.

### 3.1. 일반적인 객체 생성 방식

일반적인 객체 생성 방식에서는 개발자가 직접 의존성을 생성하고 연결합니다.

```typescript
const repository = new UsersRepository();
const service = new UsersService(repository);
const controller = new UsersController(service);
```

이 경우 객체를 생성하는 코드가 의존성 구성 과정을 직접 제어합니다.

```text
Application Code
       │
       ├── create UsersRepository
       │
       ├── create UsersService
       │
       └── create UsersController
```

### 3.2. IoC Container를 사용하는 방식

NestJS에서는 Module에 Provider를 등록하면 DI Container가 의존성 관계를 분석하고 필요한 인스턴스를 생성합니다.

```typescript
@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
  ],
})
export class UsersModule {}
```

이 경우 객체의 생성과 연결은 다음과 같이 이루어집니다.

```text
NestJS IoC Container
        │
        ├── UsersRepository 생성
        │
        ├── UsersService 생성
        │       │
        │       └── UsersRepository 주입
        │
        └── UsersController 생성
                │
                └── UsersService 주입
```

개발자는 객체의 의존성 관계와 Provider 등록 정보를 선언하고, NestJS가 해당 정보를 바탕으로 객체를 구성합니다.

### 3.3. IoC와 DI의 차이

IoC와 DI는 밀접하게 관련되어 있지만 동일한 개념은 아닙니다.

| 구분 | IoC | DI |
|---|---|---|
| 의미 | 제어 책임을 외부로 이전하는 설계 원칙 | 필요한 의존성을 외부에서 전달하는 설계 기법 |
| 목적 | 객체 생성 및 제어 책임의 분리 | 객체 간 결합도 감소 |
| 범위 | DI보다 넓은 개념 | IoC를 구현하는 방법 중 하나 |
| NestJS 적용 | 프레임워크의 객체 및 실행 흐름 관리 | Provider의 생성과 의존성 주입 |

NestJS에서 DI Container는 IoC 원칙을 구현하는 핵심 구성 요소입니다.

---

## 4. NestJS Dependency Injection의 기본 구조

NestJS의 Dependency Injection은 일반적으로 다음 요소를 중심으로 구성됩니다.

| 구성 요소 | 역할 |
|---|---|
| Provider | 의존성으로 제공할 객체 또는 값을 정의합니다. |
| Injection Token | Provider를 식별하기 위한 키입니다. |
| Consumer | 다른 Provider를 주입받아 사용하는 구성 요소입니다. |
| DI Container | Provider를 등록하고 의존성을 해결합니다. |
| Module | Provider의 등록 및 접근 범위를 정의합니다. |

예를 들어 `UsersController`가 `UsersService`에 의존하는 경우 다음과 같이 구성합니다.

### 4.1. Provider 정의

**users.service.ts**

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
}
```

`@Injectable()` 데코레이터는 해당 클래스가 NestJS의 의존성 주입 시스템에서 관리되고 필요한 의존성을 주입받을 수 있도록 메타데이터를 제공합니다.

단, `@Injectable()`만 선언한다고 해서 Provider가 자동으로 Module에 등록되는 것은 아닙니다.

### 4.2. Consumer 정의

**users.controller.ts**

```typescript
import { Controller, Get } from '@nestjs/common';
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
}
```

`UsersController`는 `UsersService`를 의존성으로 선언합니다.

NestJS는 생성자의 타입 메타데이터를 활용하여 필요한 Provider를 식별할 수 있습니다.

### 4.3. Module 등록

**users.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

`UsersModule`에 Provider를 등록하면 NestJS는 해당 Module의 의존성 관리 범위에서 `UsersService`를 사용할 수 있도록 구성합니다.

### 4.4. 의존성 주입 결과

전체 관계는 다음과 같습니다.

```text
UsersModule
    │
    ├── providers
    │      │
    │      └── UsersService
    │
    └── controllers
           │
           └── UsersController
                    │
                    │ Constructor Injection
                    ▼
               UsersService
```

NestJS는 `UsersController`를 생성할 때 필요한 `UsersService` 인스턴스를 주입합니다.

이후 HTTP 요청이 발생하면 Controller는 이미 주입된 Service를 사용할 수 있습니다.

기본 Singleton Scope에서는 일반적으로 요청마다 Service를 새로 생성하지 않습니다.

---

## 5. Constructor Injection

Constructor Injection은 NestJS에서 가장 일반적으로 사용하는 의존성 주입 방식입니다.

클래스 생성자의 매개변수를 통해 필요한 Provider를 선언합니다.

### 5.1. 기본 사용법

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}
}
```

NestJS는 생성자의 타입 정보를 기반으로 `UsersRepository` Provider를 탐색합니다.

해당 Provider가 접근 가능한 범위에 등록되어 있다면 필요한 인스턴스를 주입합니다.

### 5.2. 여러 Provider 주입

하나의 Provider가 여러 의존성을 사용할 수도 있습니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailService: EmailService,
  ) {}
}
```

NestJS는 각 생성자 매개변수에 대응하는 Provider를 해결합니다.

이 예제에서는 `UsersRepository`와 `EmailService`가 동일한 Module에 등록되어 있거나, 가져온 Module에서 공개되어 있어야 합니다.

### 5.3. Constructor Injection의 장점

Constructor Injection은 다음과 같은 장점을 제공합니다.

- 클래스가 필요로 하는 의존성이 생성자에 명확하게 표시됩니다.
- 의존성을 직접 생성할 필요가 없습니다.
- 테스트에서 Mock 구현을 전달하기 쉽습니다.
- 객체 생성 시점에 필수 의존성을 확인할 수 있습니다.
- 읽기 전용 속성을 통해 의존성을 일관되게 사용할 수 있습니다.

일반적인 NestJS 애플리케이션에서는 Constructor Injection을 우선적으로 사용하는 것이 좋습니다.

---

## 6. Injection Token

**Injection Token**은 NestJS의 DI Container에서 Provider를 식별하는 데 사용하는 값입니다.

NestJS는 Injection Token을 기준으로 Provider를 등록하고 의존성을 해결합니다.

### 6.1. Class Token

가장 일반적인 Injection Token은 클래스입니다.

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

위 코드는 다음 등록 방식의 축약형입니다.

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

여기서 `provide`에 지정된 `UsersService` 클래스가 Injection Token입니다.

생성자에서 해당 클래스를 타입으로 선언하면 NestJS는 등록된 Provider를 탐색합니다.

```typescript
constructor(
  private readonly usersService: UsersService,
) {}
```

### 6.2. String Token

NestJS는 문자열을 Injection Token으로 사용할 수 있습니다.

```typescript
export const API_BASE_URL = 'API_BASE_URL';
```

Module에서 다음과 같이 Provider를 등록합니다.

```typescript
@Module({
  providers: [
    {
      provide: API_BASE_URL,
      useValue: 'https://api.example.com',
    },
  ],
  exports: [API_BASE_URL],
})
export class ApiModule {}
```

문자열 토큰을 사용하는 경우 `@Inject()` 데코레이터로 해당 토큰을 명시합니다.

```typescript
@Injectable()
export class ApiService {
  constructor(
    @Inject(API_BASE_URL)
    private readonly baseUrl: string,
  ) {}
}
```

이 예제에서 `ApiService`는 `API_BASE_URL` 토큰으로 등록된 값을 주입받습니다.

`ApiService` 역시 해당 Provider를 사용할 수 있는 Module에 등록되어 있어야 합니다.

### 6.3. Symbol Token

`Symbol`도 Injection Token으로 사용할 수 있습니다.

```typescript
export const API_BASE_URL = Symbol('API_BASE_URL');
```

Provider 등록 방식은 다음과 같습니다.

```typescript
@Module({
  providers: [
    {
      provide: API_BASE_URL,
      useValue: 'https://api.example.com',
    },
  ],
  exports: [API_BASE_URL],
})
export class ApiModule {}
```

`Symbol`은 같은 설명 문자열을 사용해도 서로 다른 식별자가 생성되므로 토큰 충돌을 방지하는 데 유용합니다.

다만 Provider 등록과 주입에서는 반드시 동일한 Symbol 값을 참조해야 합니다.

### 6.4. Interface를 Injection Token으로 사용할 수 없는 이유

TypeScript의 Interface는 컴파일 과정에서 제거됩니다.

예를 들어 다음과 같은 Interface가 있다고 가정합니다.

```typescript
export interface UsersRepository {
  findAll(): Promise<User[]>;
}
```

Interface는 JavaScript 실행 환경에 존재하지 않으므로 NestJS가 런타임에 해당 타입을 직접 Injection Token으로 사용할 수 없습니다.

따라서 Interface를 기반으로 구현을 분리하려면 별도의 Injection Token을 정의해야 합니다.

```typescript
export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
```

이후 `@Inject()`를 사용하여 의존성을 주입받을 수 있습니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}
}
```

이 코드는 `User` 타입과 `UsersRepository` Interface, `USERS_REPOSITORY` 토큰이 별도로 정의되어 있으며, 해당 토큰이 Provider로 등록되어 있다는 것을 전제로 합니다.

또한 TypeScript의 Abstract Class는 런타임에 존재할 수 있으므로 Class Token으로 사용할 수 있습니다.

이러한 방식은 인터페이스와 구현체를 분리하는 아키텍처에서 유용합니다.

---

## 7. Module과 의존성 탐색 범위

NestJS의 DI Container는 Module을 기준으로 Provider의 등록 및 접근 범위를 관리합니다.

따라서 Provider가 어느 Module에 등록되었는지에 따라 주입 가능 여부가 달라질 수 있습니다.

### 7.1. 같은 Module의 Provider

```typescript
@Module({
  providers: [
    UsersService,
    UsersRepository,
  ],
})
export class UsersModule {}
```

`UsersService`는 동일한 Module에 등록된 `UsersRepository`를 주입받을 수 있습니다.

### 7.2. 다른 Module의 Provider

다른 Module에서 Provider를 사용하려면 제공하는 Module이 해당 Provider를 공개해야 합니다.

**users.module.ts**

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

**auth.module.ts**

```typescript
@Module({
  imports: [UsersModule],
  providers: [AuthService],
})
export class AuthModule {}
```

`AuthModule`이 `UsersModule`을 가져오므로 `AuthService`에서 `UsersService`를 주입받을 수 있습니다.

**auth.service.ts**

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
  ) {}
}
```

### 7.3. Provider 탐색 과정

일반적인 Provider 탐색 과정을 단순화하면 다음과 같습니다.

1. NestJS는 Consumer가 속한 Module의 Provider 등록 정보를 확인합니다.
2. 요청한 Injection Token에 해당하는 Provider를 탐색합니다.
3. 현재 Module에서 찾지 못하면 가져온 Module이 공개한 Provider를 확인합니다.
4. 접근 가능한 Provider를 찾으면 해당 Provider의 인스턴스를 해결합니다.
5. 의존성을 해결할 수 없으면 예외를 발생시킵니다.

실제 내부 구현에서는 Module Graph와 Provider 등록 정보, Scope 등의 조건을 함께 고려합니다.

중요한 점은 **어떤 Module에 등록된 Provider라고 해서 애플리케이션의 모든 Module에서 자동으로 사용할 수 있는 것은 아니라는 것**입니다.

### 7.4. Provider 중복 등록과 Singleton

다음과 같이 동일한 클래스를 서로 다른 Module에 등록할 수 있습니다.

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

```typescript
@Module({
  providers: [UsersService],
})
export class AuthModule {}
```

이 경우 두 Module은 각각 독립적인 Provider 등록을 갖습니다.

따라서 기본 Singleton Scope에서도 서로 다른 `UsersService` 인스턴스가 생성될 수 있습니다.

반면 하나의 Module에서 Provider를 등록하고 `exports`와 `imports`를 사용하면 일반적으로 동일한 Provider 인스턴스를 공유할 수 있습니다.

이처럼 Singleton Scope는 클래스가 애플리케이션 전체에서 반드시 하나의 인스턴스만 갖는다는 의미가 아닙니다.

---

## 8. Provider 등록 방식과 DI

NestJS는 클래스 외에도 객체, 값, Factory 등을 의존성으로 등록할 수 있습니다.

주요 Custom Provider 등록 방식은 다음과 같습니다.

| 등록 방식 | 역할 |
|---|---|
| `useClass` | 지정한 클래스의 인스턴스를 생성합니다. |
| `useValue` | 미리 정의된 값을 주입합니다. |
| `useFactory` | Factory 함수의 반환값을 Provider로 제공합니다. |
| `useExisting` | 기존 Provider에 대한 별칭을 제공합니다. |

### 8.1. useClass

```typescript
{
  provide: UsersService,
  useClass: UsersService,
}
```

클래스를 기반으로 Provider를 생성합니다.

### 8.2. useValue

```typescript
{
  provide: 'APP_NAME',
  useValue: 'NestJS Application',
}
```

상수나 기존 객체를 주입할 때 사용합니다.

### 8.3. useFactory

```typescript
{
  provide: 'API_BASE_URL',
  useFactory: () => {
    return process.env.API_BASE_URL ?? 'http://localhost:3000';
  },
}
```

Factory 함수를 실행하여 Provider 값을 결정합니다.

다른 Provider를 Factory의 의존성으로 사용할 수도 있습니다.

### 8.4. useExisting

```typescript
{
  provide: 'USER_SERVICE',
  useExisting: UsersService,
}
```

이미 등록된 Provider를 다른 Injection Token으로도 참조하도록 구성합니다.

`useExisting`은 기존 Provider의 별칭을 생성하며, 별도의 클래스 인스턴스를 새로 생성하는 방식과 구분됩니다.

각 등록 방식의 자세한 구성과 활용 사례는 `custom-providers.md`에서 설명합니다.

---

## 9. Property-based Injection

NestJS는 Constructor Injection 외에도 클래스 속성에 직접 의존성을 주입하는 Property-based Injection을 지원합니다.

```typescript
@Injectable()
export class AuthService {
  @Inject(UsersService)
  private readonly usersService!: UsersService;

  getUsers() {
    return this.usersService.findAll();
  }
}
```

`@Inject()` 데코레이터를 속성에 적용하면 NestJS가 해당 Provider를 주입할 수 있습니다.

그러나 이 방식에서는 클래스의 필수 의존성이 생성자 시그니처에 표시되지 않습니다.

따라서 일반적인 상황에서는 Constructor Injection을 사용하는 것이 좋습니다.

Property-based Injection은 상속 구조에서 생성자 의존성 전달을 간소화해야 하는 등의 특정 상황에 활용할 수 있습니다.

---

## 10. Optional Dependency

일부 의존성은 선택적으로 제공될 수 있습니다.

NestJS에서는 `@Optional()` 데코레이터를 통해 선택적 의존성을 선언할 수 있습니다.

```typescript
import {
  Injectable,
  Inject,
  Optional,
} from '@nestjs/common';

@Injectable()
export class ApiService {
  constructor(
    @Optional()
    @Inject('API_BASE_URL')
    private readonly baseUrl?: string,
  ) {}

  getBaseUrl(): string {
    return this.baseUrl ?? 'http://localhost:3000';
  }
}
```

위 예제에서 `API_BASE_URL` Provider가 등록되지 않았더라도 의존성 누락 자체로 인한 초기화 오류는 발생하지 않습니다.

주입값이 없는 경우 기본값을 사용하도록 구현했습니다.

다만 반드시 필요한 의존성에는 `@Optional()`을 사용하지 않는 것이 좋습니다.

선택적 의존성은 Provider의 존재 여부에 따라 기능이 달라질 수 있는 경우에 사용합니다.

---

## 11. Injection Scope와 인스턴스 관리

NestJS는 Provider 인스턴스의 생성 및 공유 범위를 관리하기 위해 Injection Scope를 지원합니다.

주요 Scope는 다음과 같습니다.

| Scope | 인스턴스 관리 방식 |
|---|---|
| `DEFAULT` | 동일한 Provider 등록에 대해 기본적으로 인스턴스를 재사용합니다. |
| `REQUEST` | 요청 컨텍스트별로 인스턴스를 생성합니다. |
| `TRANSIENT` | Provider를 주입받는 Consumer별로 독립적인 인스턴스를 제공합니다. |

### 11.1. Singleton Scope

```typescript
@Injectable()
export class UsersService {}
```

별도의 Scope를 지정하지 않으면 기본 Singleton Scope가 적용됩니다.

이 경우 Provider는 일반적으로 애플리케이션 초기화 과정에서 생성되어 여러 Consumer에서 재사용됩니다.

### 11.2. Request Scope

```typescript
@Injectable({
  scope: Scope.REQUEST,
})
export class RequestContextService {}
```

Request Scope는 요청별로 구분된 인스턴스를 제공합니다.

예를 들어 요청별 사용자 정보나 요청 추적 데이터를 관리하는 경우에 활용할 수 있습니다.

### 11.3. Transient Scope

```typescript
@Injectable({
  scope: Scope.TRANSIENT,
})
export class LoggerService {}
```

Transient Provider는 해당 Provider를 주입받는 Consumer별로 별도의 인스턴스를 제공합니다.

다만 HTTP 요청마다 반드시 새로운 인스턴스를 생성하는 것은 아닙니다.

Singleton Consumer에 주입된 Transient Provider는 일반적으로 해당 Consumer가 유지되는 동안 함께 사용됩니다.

### 11.4. Scope의 전파

Request-scoped Provider에 의존하는 Provider나 Controller는 상위 의존성 체인에서도 Request Scope의 영향을 받을 수 있습니다.

예를 들어 다음과 같은 의존성 구조를 가정합니다.

```text
UsersController
      │
      ▼
UsersService
      │
      ▼
RequestContextService
        (REQUEST)
```

`RequestContextService`가 Request Scope라면 이를 주입받는 `UsersService`와 상위의 `UsersController`도 요청별 인스턴스 생성의 영향을 받을 수 있습니다.

이와 달리 Transient Scope는 Request Scope처럼 전체 의존성 체인에 동일한 방식으로 전파되지 않습니다.

Scope에 관한 자세한 내용은 `injection-scopes.md`에서 설명합니다.

---

## 12. Circular Dependency

Circular Dependency는 두 개 이상의 Provider가 서로를 의존하는 구조를 의미합니다.

예를 들어 다음과 같은 의존성 관계가 있다고 가정합니다.

```text
UsersService
     │
     ▼
AuthService
     │
     ▼
UsersService
```

이 구조에서는 두 Provider가 서로의 인스턴스를 필요로 합니다.

따라서 일반적인 의존성 해결 과정에서 문제가 발생할 수 있습니다.

### 12.1. forwardRef()

NestJS는 일부 순환 의존성을 해결하기 위해 `forwardRef()`를 제공합니다.

```typescript
import {
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}
}
```

반대 방향에서도 다음과 같이 선언할 수 있습니다.

```typescript
@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}
}
```

`forwardRef()`는 해당 클래스를 즉시 참조하는 대신, 의존성 해결 시점에 참조할 수 있도록 구성합니다.

다만 순환 의존성이 해결되더라도 생성 및 초기화 순서에 의존하는 코드를 작성해서는 안 됩니다.

또한 Provider 사이의 순환 의존성과 Module 사이의 순환 의존성은 별도로 구분해야 합니다.

Module 간 순환 의존성이 존재한다면 Module의 `imports`에서도 `forwardRef()` 구성이 필요할 수 있습니다.

### 12.2. 구조 개선

순환 의존성이 발생했다면 먼저 Provider의 책임과 의존성 방향을 검토하는 것이 좋습니다.

예를 들어 두 Service가 공통으로 사용하는 기능이 있다면 해당 기능을 별도의 Provider로 분리할 수 있습니다.

```text
UsersService        AuthService
      │                 │
      └────────┬────────┘
               │
               ▼
       SharedDomainService
```

이 구조에서는 `UsersService`와 `AuthService`가 서로 직접 의존하지 않고 공통 기능을 사용하도록 구성할 수 있습니다.

`forwardRef()`는 사용할 수 있는 해결 수단이지만, 가능하다면 순환 의존성이 발생하지 않도록 설계를 개선하는 것이 좋습니다.

---

## 13. ModuleRef

NestJS는 Provider를 프로그래밍 방식으로 조회하거나 해결하기 위한 `ModuleRef` 클래스를 제공합니다.

`ModuleRef`는 `@nestjs/core` 패키지에서 제공됩니다.

일반적인 애플리케이션에서는 Constructor Injection을 사용하는 것이 좋지만, 동적으로 Provider를 조회해야 하는 경우에는 `ModuleRef`를 활용할 수 있습니다.

### 13.1. ModuleRef 주입

```typescript
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class UsersService {
  constructor(
    private readonly moduleRef: ModuleRef,
  ) {}
}
```

`ModuleRef`는 현재 Module의 Provider 탐색 및 인스턴스 해결 기능을 제공합니다.

### 13.2. get()

`get()` 메서드를 사용하면 이미 등록된 정적 Provider 인스턴스를 조회할 수 있습니다.

```typescript
import {
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

import { ModuleRef } from '@nestjs/core';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService implements OnModuleInit {
  private usersRepository!: UsersRepository;

  constructor(
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    this.usersRepository = this.moduleRef.get(
      UsersRepository,
    );
  }
}
```

위 예제는 `UsersRepository`가 현재 Module에 Provider로 등록되어 있다고 가정합니다.

`get()`은 Singleton과 같은 정적 Provider 인스턴스를 조회할 때 사용합니다.

Request-scoped 또는 Transient Provider를 조회하는 용도로는 사용할 수 없습니다.

### 13.3. resolve()

`resolve()` 메서드는 Request-scoped 및 Transient Provider와 같이 동적으로 생성되는 Provider 인스턴스를 해결할 때 사용합니다.

```typescript
const instance = await this.moduleRef.resolve(
  RequestContextService,
);
```

`resolve()`는 비동기 메서드이며 Promise를 반환합니다.

별도의 Context ID를 전달하지 않고 반복 호출하면 서로 다른 DI Context Sub-tree에서 인스턴스가 해결될 수 있습니다.

같은 요청 컨텍스트의 인스턴스를 사용하려면 적절한 Context ID를 전달해야 합니다.

### 13.4. get()과 resolve() 비교

| 구분 | `get()` | `resolve()` |
|---|---|---|
| 주요 목적 | 이미 등록된 정적 Provider 조회 | Scoped Provider의 인스턴스 해결 |
| 반환 형태 | 동기 반환 | Promise 반환 |
| Singleton Provider | 지원 | 지원 |
| Request-scoped Provider | 지원하지 않음 | 지원 |
| Transient Provider | 지원하지 않음 | 지원 |
| Context ID | 사용하지 않음 | 지정 가능 |

### 13.5. ModuleRef 사용 시 고려사항

`ModuleRef`를 사용하면 런타임에 Provider를 조회할 수 있지만, 의존성 관계가 생성자에 명확하게 나타나지 않을 수 있습니다.

따라서 일반적인 비즈니스 로직에서는 Constructor Injection을 우선적으로 사용해야 합니다.

`ModuleRef`는 프레임워크 확장, 동적인 의존성 해결 또는 특정 Scoped Provider 관리가 필요한 경우에 사용하는 것이 적절합니다.

---

## 14. 비동기 Provider와 의존성 주입

NestJS는 비동기 Factory를 사용하여 Provider를 초기화하는 기능을 지원합니다.

예를 들어 외부 연결이나 설정값을 비동기로 준비해야 하는 경우 사용할 수 있습니다.

```typescript
@Module({
  providers: [
    {
      provide: 'ASYNC_CONFIG',
      useFactory: async () => {
        const config = await Promise.resolve({
          apiUrl: 'https://api.example.com',
        });

        return config;
      },
    },
  ],
  exports: ['ASYNC_CONFIG'],
})
export class ConfigModule {}
```

위 예제에서 Factory 함수는 Promise를 반환합니다.

NestJS는 비동기 Provider의 Promise가 해결된 후 해당 Provider에 의존하는 구성 요소를 인스턴스화합니다.

이를 통해 데이터베이스 연결, 외부 서비스 초기화, 비동기 설정 로딩 등을 구성할 수 있습니다.

실제 데이터베이스 연결은 사용하는 드라이버 또는 ORM에 적합한 초기화 및 종료 처리도 함께 고려해야 합니다.

비동기 Provider는 `useFactory`를 활용하는 Custom Provider의 한 형태입니다.

---

## 15. Dependency Injection과 테스트

Dependency Injection은 단위 테스트에서 실제 의존성을 Mock 객체로 교체할 수 있도록 지원합니다.

예를 들어 `UsersService`가 `UsersRepository`에 의존한다고 가정합니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  findAll() {
    return this.usersRepository.findAll();
  }
}
```

테스트에서는 실제 Repository 대신 Mock 객체를 사용할 수 있습니다.

### 15.1. Testing Module

NestJS는 `@nestjs/testing` 패키지를 통해 테스트 환경에서 DI Container를 구성할 수 있도록 지원합니다.

아래 예제는 Jest를 사용하는 환경을 전제로 합니다.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    mockUsersRepository.findAll.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('사용자 목록을 반환해야 합니다', () => {
    const users = [
      { id: 1, name: 'Alice' },
    ];

    mockUsersRepository.findAll.mockReturnValue(users);

    expect(service.findAll()).toEqual(users);
    expect(mockUsersRepository.findAll).toHaveBeenCalledTimes(1);
  });
});
```

테스트에서는 `UsersRepository`를 실제로 생성하지 않고 Mock 객체를 Provider로 등록합니다.

`UsersService`는 생성자에서 필요한 의존성을 선언하므로 테스트 대상 코드 자체를 수정하지 않아도 됩니다.

이러한 방식은 테스트를 외부 시스템으로부터 격리하는 데 도움이 됩니다.

테스트 구성 및 Mock Provider의 상세 사용법은 `06-testing/`의 관련 문서에서 설명합니다.

---

## 16. Dependency Injection 오류와 해결 방법

NestJS에서 의존성 주입이 실패하면 다음과 유사한 오류가 발생할 수 있습니다.

```text
Nest can't resolve dependencies of the UsersService (?).
Please make sure that the argument UsersRepository
at index [0] is available in the UsersModule context.
```

실제 오류 메시지는 NestJS 버전과 의존성 구성에 따라 달라질 수 있습니다.

이 오류는 NestJS가 필요한 Injection Token에 대응하는 Provider를 해결하지 못했다는 의미입니다.

### 16.1. Provider가 등록되지 않은 경우

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

`UsersService`가 `UsersRepository`에 의존하지만 `UsersRepository`가 등록되어 있지 않으면 의존성 해결이 실패합니다.

다음과 같이 Provider를 등록해야 합니다.

```typescript
@Module({
  providers: [
    UsersService,
    UsersRepository,
  ],
})
export class UsersModule {}
```

### 16.2. 다른 Module의 Provider가 공개되지 않은 경우

```typescript
@Module({
  providers: [UsersRepository],
})
export class DatabaseModule {}
```

`UsersRepository`가 다른 Module에 등록되어 있더라도 공개되지 않았다면 외부 Module에서 직접 주입받을 수 없습니다.

```typescript
@Module({
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class DatabaseModule {}
```

사용하는 Module에서는 `DatabaseModule`을 가져와야 합니다.

```typescript
@Module({
  imports: [DatabaseModule],
  providers: [UsersService],
})
export class UsersModule {}
```

### 16.3. Injection Token이 일치하지 않는 경우

다음과 같이 문자열 토큰으로 Provider를 등록했다고 가정합니다.

```typescript
{
  provide: 'USERS_REPOSITORY',
  useClass: UsersRepository,
}
```

이 경우 생성자에서 단순히 클래스 타입만 선언하면 해당 문자열 토큰을 자동으로 선택하지 않습니다.

```typescript
constructor(
  private readonly usersRepository: UsersRepository,
) {}
```

문자열 토큰으로 등록된 Provider를 주입하려면 `@Inject()`를 사용해야 합니다.

```typescript
constructor(
  @Inject('USERS_REPOSITORY')
  private readonly usersRepository: UsersRepository,
) {}
```

### 16.4. Interface 타입을 직접 사용한 경우

TypeScript Interface는 런타임에 존재하지 않으므로 일반적인 클래스 기반 주입과 동일하게 사용할 수 없습니다.

이 경우 문자열, Symbol 또는 런타임에 존재하는 Abstract Class 등을 Injection Token으로 활용해야 합니다.

### 16.5. 순환 의존성이 발생한 경우

Provider 또는 Module 간 순환 의존성이 발생하면 의존성 해결이 실패할 수 있습니다.

이 경우 `forwardRef()` 적용 여부를 확인하되, 가능하면 책임을 분리하여 순환 의존성을 제거하는 것이 좋습니다.

### 16.6. Provider를 중복 등록한 경우

동일한 Provider를 여러 Module에 직접 등록하면 각각 별도의 인스턴스가 생성될 수 있습니다.

이 경우 예상과 다른 상태 공유나 초기화 동작이 발생할 수 있습니다.

따라서 Provider의 소유 Module을 정하고, 필요한 경우 `exports`와 `imports`를 통해 공유하는 것이 좋습니다.

---

## 17. 설계 시 고려사항

Dependency Injection을 효과적으로 사용하려면 다음 사항을 고려해야 합니다.

### 17.1. Constructor Injection을 우선적으로 사용합니다

Constructor Injection은 필수 의존성을 클래스의 생성자에 명시적으로 드러냅니다.

일반적인 Provider와 Controller에서는 Constructor Injection을 기본 방식으로 사용하는 것이 좋습니다.

### 17.2. Provider의 책임을 명확하게 유지합니다

하나의 Provider가 지나치게 많은 기능을 수행하지 않도록 구성합니다.

예를 들어 사용자 조회, 이메일 발송, 결제 처리를 모두 하나의 Service에서 수행하기보다는 책임에 따라 적절하게 분리합니다.

### 17.3. 추상화에 의존하도록 설계합니다

구체적인 구현과의 결합도를 낮추려면 Interface 또는 Abstract Class를 활용할 수 있습니다.

다만 Interface를 사용하는 경우 런타임에 사용할 별도의 Injection Token이 필요합니다.

이러한 방식은 Repository 구현 교체, 외부 서비스 연동 및 테스트 환경 구성에 유용합니다.

### 17.4. Module 간 의존성 관계를 명확하게 유지합니다

Provider는 Module의 등록 및 공개 범위에 따라 접근할 수 있습니다.

따라서 Provider의 소유 Module을 명확하게 하고 필요한 Provider만 외부에 공개하는 것이 좋습니다.

### 17.5. Request Scope 사용을 신중하게 결정합니다

Request Scope는 요청별 상태를 분리하는 데 유용하지만 인스턴스 생성 비용과 의존성 Scope 전파를 고려해야 합니다.

일반적인 Service는 기본 Singleton Scope를 우선적으로 사용하고, 요청별 인스턴스가 필요한 경우에 Request Scope를 적용하는 것이 좋습니다.

### 17.6. Service Locator 방식의 사용을 최소화합니다

`ModuleRef`를 통해 런타임에 Provider를 조회할 수 있지만, 이를 일반적인 의존성 주입 방식으로 남용하면 클래스의 실제 의존성을 파악하기 어려워질 수 있습니다.

따라서 동적 조회가 반드시 필요한 경우가 아니라면 생성자에 의존성을 명시하는 것이 좋습니다.

### 17.7. 순환 의존성을 구조적으로 해결합니다

`forwardRef()`는 순환 의존성 문제를 해결하는 수단이지만 모든 설계 문제를 해결하지는 않습니다.

순환 의존성이 반복된다면 Provider의 책임과 Module 간 의존성 방향을 재검토해야 합니다.

---

## 18. 주요 개념 비교

Dependency Injection과 관련된 핵심 개념을 정리하면 다음과 같습니다.

| 개념 | 설명 |
|---|---|
| Dependency | 객체가 기능 수행을 위해 필요로 하는 다른 객체 또는 기능 |
| Dependency Injection | 필요한 의존성을 외부에서 전달받도록 구성하는 방식 |
| IoC | 객체 생성 및 제어 책임을 외부 시스템으로 이전하는 설계 원칙 |
| IoC Container | 객체의 생성과 의존성 관리 기능을 제공하는 구성 요소 |
| Provider | NestJS의 DI Container에서 관리되는 의존성 제공 단위 |
| Consumer | Provider를 주입받아 사용하는 객체 |
| Injection Token | Provider를 식별하기 위한 키 |
| Constructor Injection | 생성자 매개변수를 통한 의존성 주입 |
| Property-based Injection | 클래스 속성을 통한 의존성 주입 |
| ModuleRef | Provider를 프로그래밍 방식으로 조회하거나 해결하는 도구 |
| Injection Scope | Provider 인스턴스의 생성 및 공유 범위 |

이러한 개념들은 서로 독립적인 기능이 아니라 NestJS의 의존성 관리 시스템을 구성하는 요소입니다.

---

## 19. 정리

NestJS의 Dependency Injection은 객체 간 의존성을 선언적으로 관리하고, 객체 생성과 연결 책임을 IoC Container에 위임하는 핵심 메커니즘입니다.

주요 특징은 다음과 같습니다.

1. **Dependency Injection은 객체의 생성과 사용을 분리합니다.** 객체가 필요한 의존성을 직접 생성하지 않고 외부에서 전달받도록 구성합니다.
2. **IoC Container가 객체 생성과 의존성 해결을 담당합니다.** NestJS는 Module에 등록된 Provider 정보를 기반으로 필요한 인스턴스를 제공합니다.
3. **Constructor Injection을 기본적으로 사용합니다.** 생성자에서 필요한 Provider를 선언하여 의존성을 명확하게 표현합니다.
4. **Injection Token으로 Provider를 식별합니다.** 클래스, 문자열, Symbol 등을 사용할 수 있습니다.
5. **Module은 Provider의 접근 범위를 정의합니다.** `providers`, `exports`, `imports`를 통해 의존성 공유 관계를 관리합니다.
6. **Custom Provider를 통해 다양한 의존성 등록 방식을 지원합니다.** 클래스, 값, Factory, Alias 등을 Provider로 구성할 수 있습니다.
7. **Injection Scope로 인스턴스 생명주기를 관리합니다.** Singleton, Request, Transient Scope를 지원합니다.
8. **ModuleRef를 통해 동적인 Provider 조회를 지원합니다.** 일반적인 생성자 주입 외에 프로그램 방식의 인스턴스 해결이 가능합니다.
9. **Dependency Injection은 테스트 용이성을 향상시킵니다.** 실제 의존성을 Mock 객체로 교체하여 독립적인 단위 테스트를 구성할 수 있습니다.

Dependency Injection을 이해할 때 가장 중요한 점은 **NestJS가 Provider의 Injection Token과 Module의 의존성 관계를 기반으로 객체를 생성하고 연결한다는 것**입니다.

이러한 동작 원리를 이해하면 Custom Provider, Injection Scope, Dynamic Module 및 애플리케이션 아키텍처에서 사용하는 의존성 관리 패턴을 보다 체계적으로 이해할 수 있습니다.

---

## 20. 관련 문서

- `modules.md`: Module의 Provider 등록 및 공개 범위
- `controllers.md`: Controller에서 Provider를 주입받는 방식
- `providers.md`: Provider의 개념과 역할
- `custom-providers.md`: Injection Token과 Custom Provider 등록 방식
- `injection-scopes.md`: Singleton, Request, Transient Scope
- `dynamic-modules.md`: 설정에 따라 동적으로 구성되는 Module과 Provider
- `../06-testing/unit-testing.md`: Provider 단위 테스트
- `../06-testing/testing-modules.md`: NestJS Testing Module 구성
- `../06-testing/mocking-providers.md`: Mock Provider를 이용한 의존성 대체
- `../07-architecture/dependency-management.md`: 아키텍처 관점의 의존성 관리

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Providers](https://docs.nestjs.com/providers)  
  Provider의 기본 개념과 Constructor Injection 및 Service 등록 방식을 설명합니다.

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)  
  Dependency Injection의 기본 원리, Injection Token 및 Custom Provider 등록 방식을 설명합니다.

- [NestJS Modules](https://docs.nestjs.com/modules)  
  Module을 통한 Provider 등록, 공유 및 의존성 관리 방식을 설명합니다.

- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)  
  Singleton, Request, Transient Scope와 의존성 Scope 전파를 설명합니다.

- [NestJS Circular Dependency](https://docs.nestjs.com/fundamentals/circular-dependency)  
  Provider 및 Module 간 순환 의존성과 `forwardRef()` 사용 방법을 설명합니다.

- [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref)  
  `ModuleRef`, `get()`, `resolve()` 및 Context ID를 이용한 Provider 조회 방법을 설명합니다.

- [NestJS Async Providers](https://docs.nestjs.com/fundamentals/async-providers)  
  비동기 Factory를 이용한 Provider 초기화 방식을 설명합니다.

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)  
  Testing Module과 Mock Provider를 이용한 단위 테스트 방법을 설명합니다.

- [NestJS Common Errors](https://docs.nestjs.com/faq/common-errors)  
  의존성 해결 실패와 관련된 일반적인 오류 및 해결 방법을 설명합니다.

### GitHub Repository

- [NestJS 공식 GitHub Repository](https://github.com/nestjs/nest)  
  NestJS 프레임워크의 IoC Container, Injector, Instance Loader 등 의존성 관리 관련 내부 구현을 확인할 수 있습니다.

- [NestJS Core Injector 구현](https://github.com/nestjs/nest/tree/master/packages/core/injector)  
  NestJS의 Provider 등록, 의존성 탐색 및 인스턴스 생성과 관련된 구현 코드를 확인할 수 있습니다.

- [NestJS 공식 예제 Repository](https://github.com/nestjs/nest/tree/master/sample)  
  Module, Provider 및 Dependency Injection을 활용한 다양한 구현 예제를 확인할 수 있습니다.