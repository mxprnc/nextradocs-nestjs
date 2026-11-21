# Providers

## 1. 개요

NestJS의 **Provider**는 애플리케이션의 기능을 구현하고, 다른 구성 요소에서 의존성으로 주입받아 사용할 수 있도록 NestJS의 Dependency Injection 시스템에서 관리하는 구성 요소입니다.

NestJS에서는 Service, Repository, Factory, Helper 등 다양한 구성 요소를 Provider로 등록할 수 있습니다.

Provider의 핵심 개념은 **객체의 생성과 의존성 관리를 개발자가 직접 수행하는 대신 NestJS의 IoC Container에 위임한다는 것**입니다.

이를 통해 객체 간 결합도를 낮추고, 각 구성 요소의 책임을 분리하며, 테스트 및 유지보수가 용이한 애플리케이션을 구성할 수 있습니다.

Provider의 주요 역할은 다음과 같습니다.

- **비즈니스 로직 구현:** Controller에서 전달받은 요청과 관련된 애플리케이션 로직을 처리합니다.
- **의존성 제공:** 다른 Controller나 Provider에 필요한 객체를 제공합니다.
- **객체 생명주기 관리:** NestJS의 DI Container를 통해 Provider의 생성과 재사용 범위를 관리합니다.
- **기능 재사용:** 여러 구성 요소에서 동일한 기능을 사용할 수 있도록 지원합니다.
- **관심사의 분리:** HTTP 요청 처리, 비즈니스 로직, 데이터 접근 등의 책임을 분리할 수 있도록 합니다.

Provider는 특정 클래스의 이름이나 역할만을 의미하지 않습니다.

NestJS의 DI Container에 등록되어 의존성으로 제공되는 객체, 값 또는 팩토리 기반 구성 요소를 포괄하는 개념입니다.

---

## 2. Provider의 기본 구조

NestJS에서는 일반적으로 `@Injectable()` 데코레이터를 사용하여 Provider 클래스를 정의합니다.

`@Injectable()`은 `@nestjs/common` 패키지에서 제공하는 데코레이터입니다.

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

위 예제에서 `UsersService`는 사용자 정보를 조회하는 기능을 제공합니다.

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 설명 |
|---|---|
| `@Injectable()` | 클래스가 NestJS의 DI 시스템에서 관리되고 의존성을 주입받을 수 있도록 메타데이터를 제공합니다. |
| `UsersService` | 사용자 관리 기능을 구현하는 Service 클래스입니다. |
| `findAll()` | 사용자 목록을 반환하는 메서드입니다. |

이 클래스는 다른 Controller 또는 Provider에서 의존성으로 사용할 수 있습니다.

단, `@Injectable()`을 선언하는 것만으로 해당 클래스가 자동으로 Module에 등록되는 것은 아닙니다.

일반적으로 Module의 `providers` 메타데이터에 등록해야 NestJS가 해당 Provider를 관리하고 의존성을 해결할 수 있습니다.

### 2.1. @Injectable() 데코레이터

`@Injectable()`은 클래스가 NestJS의 Dependency Injection 시스템에 참여할 수 있도록 메타데이터를 제공하는 데코레이터입니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {}
```

`@Injectable()`을 사용하면 NestJS는 해당 클래스의 생성자 의존성을 분석하고 필요한 객체를 주입할 수 있습니다.

일반적인 클래스 기반 Provider에서는 이 데코레이터를 사용하는 것이 권장됩니다.

다만 모든 Provider에 반드시 `@Injectable()`이 필요한 것은 아닙니다.

예를 들어 `useValue`를 통해 등록하는 상수 객체나 설정값은 클래스 자체가 아니므로 `@Injectable()`을 사용하지 않습니다.

또한 생성자 의존성이 없는 클래스를 명시적으로 등록하는 경우 등에는 `@Injectable()` 없이도 Provider로 사용할 수 있습니다.

따라서 `@Injectable()`은 Provider의 일반적인 선언 방식이지만, Provider 등록 자체를 대체하는 데코레이터는 아닙니다.

### 2.2. Service와 Provider의 관계

NestJS에서 Service는 일반적으로 비즈니스 로직을 구현하는 클래스입니다.

Provider는 NestJS의 DI Container에서 관리되는 의존성 제공 단위를 의미합니다.

따라서 Service와 Provider는 동일한 개념이 아닙니다.

| 구분 | Service | Provider |
|---|---|---|
| 의미 | 애플리케이션의 기능이나 비즈니스 로직을 구현하는 구성 요소 | DI Container에서 관리하고 주입할 수 있는 의존성 |
| 역할 | 비즈니스 로직, 데이터 처리, 외부 서비스 연동 등 | 객체 생성, 제공 및 의존성 관리 |
| 형태 | 일반적으로 클래스 | 클래스, 객체, 값, Factory 등 |
| `@Injectable()` | 일반적으로 사용 | Provider 등록 방식에 따라 필요 여부가 다름 |
| Module 등록 | 일반적으로 `providers`에 등록 | `providers`에 등록하여 관리 |

예를 들어 `UsersService`는 사용자 관리 기능을 구현하는 Service이며, 동시에 NestJS에 등록된 Provider일 수 있습니다.

즉, **Service는 구성 요소의 책임을 나타내고, Provider는 NestJS의 의존성 관리 관점에서 해당 구성 요소를 나타냅니다.**

---

## 3. Provider 등록

NestJS에서 Provider를 사용하려면 일반적으로 Module의 `providers` 메타데이터에 등록해야 합니다.

### 3.1. 기본 Provider 등록

다음은 `UsersService`를 `UsersModule`에 등록하는 예제입니다.

**users.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

`providers`에 등록된 `UsersService`는 해당 Module의 의존성 관리 범위에 포함됩니다.

이후 같은 Module의 Controller나 다른 Provider에서 `UsersService`를 주입받아 사용할 수 있습니다.

### 3.2. Provider 등록의 내부 표현

다음과 같은 등록 방식은 NestJS가 제공하는 축약형 문법입니다.

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

이는 다음과 같은 명시적인 Provider 등록 방식과 동일한 의미를 가집니다.

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

여기서 `provide`와 `useClass`는 서로 다른 역할을 수행합니다.

| 속성 | 설명 |
|---|---|
| `provide` | DI Container에서 Provider를 식별하기 위한 Injection Token입니다. |
| `useClass` | 해당 Injection Token에 대응하여 인스턴스를 생성할 클래스입니다. |

위 예제에서는 `UsersService` 클래스 자체를 Injection Token으로 사용합니다.

NestJS는 해당 토큰을 기준으로 의존성을 탐색하고 `UsersService` 인스턴스를 제공합니다.

이러한 구조를 이해하면 Custom Provider를 사용할 때 Injection Token과 실제 구현 클래스를 분리하는 방식도 이해할 수 있습니다.

---

## 4. Dependency Injection

Dependency Injection(DI)은 객체가 필요로 하는 의존성을 직접 생성하지 않고 외부에서 전달받도록 구성하는 설계 방식입니다.

NestJS는 DI Container를 통해 Provider의 생성과 의존성 주입을 관리합니다.

### 4.1. 직접 객체를 생성하는 방식

다음은 Controller에서 Service를 직접 생성하는 예제입니다.

```typescript
export class UsersController {
  private readonly usersService = new UsersService();

  findAll() {
    return this.usersService.findAll();
  }
}
```

이 방식은 `UsersController`가 `UsersService`의 인스턴스 생성까지 직접 담당합니다.

이로 인해 다음과 같은 제약이 발생할 수 있습니다.

- 객체 생성 방식이 Controller 내부에 고정됩니다.
- Service의 생성자 의존성이 추가되면 Controller도 수정해야 할 수 있습니다.
- 테스트에서 Service를 Mock 객체로 교체하기 어려워질 수 있습니다.
- 객체의 생성 및 공유 범위를 직접 관리해야 합니다.

### 4.2. Constructor Injection

NestJS에서는 일반적으로 Constructor Injection을 사용하여 의존성을 주입합니다.

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

위 예제에서 `UsersController`는 `UsersService`를 직접 생성하지 않습니다.

대신 생성자에서 `UsersService`를 의존성으로 선언합니다.

NestJS는 DI Container를 통해 필요한 인스턴스를 해결하고 Controller 생성자에 전달합니다.

이 과정은 다음과 같이 표현할 수 있습니다.

```text
UsersController
      │
      │ UsersService 의존성 선언
      ▼
NestJS DI Container
      │
      │ Provider 조회 및 인스턴스 해결
      ▼
UsersService
      │
      │ 인스턴스 주입
      ▼
UsersController
```

이렇게 하면 Controller는 Service의 생성 방법을 직접 관리하지 않고, 제공된 Service를 사용하는 역할에 집중할 수 있습니다.

### 4.3. Provider의 의존성 해결 과정

NestJS는 애플리케이션 초기화 과정에서 Module과 Provider의 의존성 관계를 분석합니다.

일반적인 Singleton Provider의 의존성 해결 과정을 단순화하면 다음과 같습니다.

1. NestJS가 Module에 등록된 Provider 정보를 확인합니다.
2. Provider를 식별할 Injection Token을 결정합니다.
3. Provider 생성자에 선언된 의존성을 분석합니다.
4. 현재 Module 또는 접근 가능한 다른 Module에서 의존성을 탐색합니다.
5. 필요한 의존성을 해결하고 Provider 인스턴스를 생성합니다.
6. 생성된 Provider를 해당 구성 요소에 주입합니다.
7. Provider의 Scope에 따라 인스턴스를 재사용하거나 새로 생성합니다.

이러한 의존성 해결 과정은 NestJS의 IoC Container가 담당합니다.

자세한 내부 동작은 `dependency-injection.md`에서 설명합니다.

---

## 5. Provider와 Controller

NestJS에서 Controller와 Provider는 일반적으로 서로 다른 책임을 담당합니다.

Controller는 HTTP 요청과 응답을 처리하고, Provider로 등록된 Service는 비즈니스 로직을 수행합니다.

### 5.1. Service 구현

**users.service.ts**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    return this.users.find((user) => user.id === id);
  }
}
```

`UsersService`는 사용자 목록 조회와 단일 사용자 조회 기능을 제공합니다.

### 5.2. Controller 구현

**users.controller.ts**

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
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
```

Controller는 HTTP 요청에서 필요한 데이터를 추출하고 Service 메서드를 호출합니다.

사용자 데이터의 조회 로직은 `UsersService`에 구현되어 있습니다.

### 5.3. Module 등록

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

위 구성에서 각 요소의 역할은 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| `UsersModule` | Controller와 Provider를 등록하고 관리합니다. |
| `UsersController` | 사용자 관련 HTTP 요청을 처리합니다. |
| `UsersService` | 사용자 조회에 필요한 애플리케이션 로직을 수행합니다. |
| DI Container | Controller에 필요한 Service 인스턴스를 제공합니다. |

전체 호출 관계는 다음과 같습니다.

```text
Client
   │
   │ GET /users/1
   ▼
UsersController
   │
   │ findOne(1)
   ▼
UsersService
   │
   │ 사용자 조회
   ▼
UsersController
   │
   │ 결과 반환
   ▼
Client
```

위 구조는 HTTP 요청이 처리되는 논리적인 호출 흐름을 나타냅니다.

DI Container의 역할은 요청마다 Service 메서드를 대신 호출하는 것이 아니라, 객체 생성 및 의존성 연결 과정에서 필요한 인스턴스를 제공하는 것입니다.

---

## 6. Provider 간 의존성

Provider는 Controller뿐 아니라 다른 Provider에서도 의존성으로 사용할 수 있습니다.

예를 들어 `UsersService`가 데이터 접근을 담당하는 `UsersRepository`를 사용하도록 구성할 수 있습니다.

### 6.1. Repository Provider

**users.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  name: string;
}

@Injectable()
export class UsersRepository {
  private readonly users: User[] = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  findAll(): User[] {
    return this.users;
  }

  findById(id: number): User | undefined {
    return this.users.find((user) => user.id === id);
  }
}
```

이 예제의 `UsersRepository`는 실제 데이터베이스를 사용하지 않고 메모리 배열을 사용합니다.

Repository는 데이터 접근 책임을 분리하기 위한 구성 요소이며, NestJS에서 반드시 특정 형태의 Repository 클래스를 구현해야 하는 것은 아닙니다.

실제 Repository 구현 방식은 사용하는 ORM 또는 데이터 접근 기술에 따라 달라집니다.

### 6.2. Service Provider

**users.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  findAll() {
    return this.usersRepository.findAll();
  }

  findOne(id: number) {
    return this.usersRepository.findById(id);
  }
}
```

`UsersService`는 생성자를 통해 `UsersRepository`를 주입받습니다.

Service는 데이터 저장 방식에 관한 구체적인 작업을 Repository에 위임합니다.

### 6.3. Module 등록

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
  ],
})
export class UsersModule {}
```

`UsersService`와 `UsersRepository`를 동일한 Module에 등록하면 NestJS는 두 Provider의 의존성 관계를 해결할 수 있습니다.

전체 관계는 다음과 같습니다.

```text
UsersController
      │
      │ Constructor Injection
      ▼
UsersService
      │
      │ Constructor Injection
      ▼
UsersRepository
      │
      │ 데이터 접근
      ▼
Data Source
```

이 예제에서 Data Source는 메모리 배열이며, 실제 애플리케이션에서는 데이터베이스나 외부 저장소로 대체할 수 있습니다.

### 6.4. 의존성 체인

NestJS에서는 Provider가 다른 Provider에 의존하고, 그 Provider가 다시 다른 Provider에 의존하는 구조를 구성할 수 있습니다.

```text
Controller
    │
    ▼
Service A
    │
    ▼
Service B
    │
    ▼
Repository
```

NestJS의 DI Container는 이러한 의존성 관계를 분석하고 필요한 객체를 해결합니다.

다만 Provider 간 의존성이 지나치게 깊거나 복잡해지면 변경의 영향 범위가 커질 수 있습니다.

따라서 각 Provider의 책임을 명확하게 유지하고 불필요한 의존성을 줄이는 것이 좋습니다.

---

## 7. Provider의 Module Scope

NestJS의 Provider는 Module을 기준으로 등록되고 관리됩니다.

Provider가 특정 Module에 등록되었다고 해서 다른 모든 Module에서 자동으로 접근할 수 있는 것은 아닙니다.

이러한 접근 범위는 Module의 `providers`, `exports`, `imports`를 통해 관리합니다.

여기서 Module의 접근 범위와 Provider의 Injection Scope는 서로 다른 개념입니다.

- **Module 접근 범위:** 어떤 Module에서 Provider를 주입받을 수 있는지를 나타냅니다.
- **Injection Scope:** Provider 인스턴스가 언제 생성되고 어떤 범위에서 공유되는지를 나타냅니다.

### 7.1. Module 내부에서 사용하는 Provider

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

위 예제에서 `UsersService`는 `UsersModule` 내부에서 사용할 수 있습니다.

그러나 다른 Module에서는 `UsersService`를 직접 주입받을 수 없습니다.

### 7.2. Provider 공개

다른 Module에서 `UsersService`를 사용하려면 `exports`에 등록해야 합니다.

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

`exports`는 Module 외부에서 사용할 수 있는 Provider를 지정합니다.

### 7.3. 다른 Module에서 Provider 사용

다음은 `AuthModule`에서 `UsersService`를 사용하는 예제입니다.

**auth.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  getUsers() {
    return this.usersService.findAll();
  }
}
```

**auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';

@Module({
  imports: [UsersModule],
  providers: [AuthService],
})
export class AuthModule {}
```

`AuthModule`은 `UsersModule`을 가져오기 때문에 `UsersModule`이 공개한 `UsersService`를 사용할 수 있습니다.

```text
UsersModule
    │
    ├── providers
    │      └── UsersService
    │
    └── exports
           └── UsersService
                  │
                  ▼
              AuthModule
                  │
                  └── AuthService
                         │
                         └── UsersService 주입
```

여기서 `UsersService`는 여전히 `UsersModule`에서 관리하는 Provider입니다.

`AuthModule`은 Provider를 중복 등록하지 않고 `UsersModule`이 공개한 인스턴스를 주입받아 사용합니다.

### 7.4. Provider의 중복 등록

다음과 같이 동일한 Provider 클래스를 서로 다른 Module에 등록할 수 있습니다.

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

그러나 이 경우 두 Module은 각각 독립적인 Provider 등록을 갖습니다.

따라서 기본 Singleton Scope에서도 서로 다른 `UsersService` 인스턴스가 생성될 수 있습니다.

이는 Module 단위의 Provider 등록과 인스턴스 관리가 서로 연결되어 있기 때문입니다.

동일한 Provider 인스턴스를 공유하려면 일반적으로 하나의 Module에서 Provider를 등록하고 `exports`와 `imports`를 통해 재사용하는 것이 좋습니다.

---

## 8. Injection Token

Injection Token은 NestJS의 DI Container에서 Provider를 식별하는 데 사용하는 값입니다.

NestJS는 Injection Token을 기준으로 필요한 Provider를 탐색하고 의존성을 해결합니다.

### 8.1. Class Token

가장 일반적인 방식은 클래스 자체를 Injection Token으로 사용하는 것입니다.

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

이는 다음과 같은 명시적인 등록 방식과 동일합니다.

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

여기서 `UsersService` 클래스가 Injection Token입니다.

따라서 생성자에서 다음과 같이 타입을 선언하면 해당 Provider를 주입받을 수 있습니다.

```typescript
constructor(
  private readonly usersService: UsersService,
) {}
```

### 8.2. String Token

NestJS에서는 문자열을 Injection Token으로 사용할 수도 있습니다.

```typescript
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: 'API_BASE_URL',
      useValue: 'https://api.example.com',
    },
  ],
  exports: ['API_BASE_URL'],
})
export class ApiModule {}
```

문자열 토큰을 사용하는 경우에는 `@Inject()` 데코레이터를 통해 해당 토큰을 명시합니다.

```typescript
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ApiService {
  constructor(
    @Inject('API_BASE_URL')
    private readonly baseUrl: string,
  ) {}

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
```

이 예제에서 `ApiService`가 주입받는 값은 `API_BASE_URL` 토큰으로 등록된 문자열입니다.

단, `ApiService`가 해당 Provider에 접근할 수 있는 Module에 등록되어 있어야 합니다.

### 8.3. Symbol Token

문자열 외에도 `Symbol`을 Injection Token으로 사용할 수 있습니다.

```typescript
export const API_BASE_URL = Symbol('API_BASE_URL');
```

이 토큰을 Provider 등록에 사용할 수 있습니다.

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

`Symbol`은 동일한 설명 문자열을 사용하더라도 서로 다른 식별자를 생성할 수 있으므로 토큰 충돌을 방지하는 데 유용합니다.

단, Provider 등록과 주입에서는 동일한 Symbol 인스턴스를 참조해야 합니다.

Injection Token을 활용한 다양한 등록 방식은 `custom-providers.md`에서 자세히 설명합니다.

---

## 9. Custom Provider

NestJS는 일반적인 클래스 기반 Provider 외에도 다양한 방식으로 Provider를 등록할 수 있습니다.

Custom Provider는 클래스의 생성 방식이나 주입할 값을 명시적으로 제어할 때 사용합니다.

주요 등록 방식은 다음과 같습니다.

| 등록 방식 | 설명 |
|---|---|
| `useClass` | 지정한 클래스를 사용하여 Provider 인스턴스를 생성합니다. |
| `useValue` | 미리 정의된 객체 또는 값을 Provider로 제공합니다. |
| `useFactory` | Factory 함수를 실행하여 Provider 값을 생성합니다. |
| `useExisting` | 이미 등록된 다른 Provider를 참조하는 별칭을 생성합니다. |

### 9.1. useClass

```typescript
{
  provide: UsersService,
  useClass: UsersService,
}
```

`useClass`는 특정 Injection Token에 대응하는 구현 클래스를 지정합니다.

### 9.2. useValue

```typescript
{
  provide: 'APP_NAME',
  useValue: 'NestJS Application',
}
```

`useValue`는 상수나 미리 생성된 객체를 주입할 때 사용합니다.

### 9.3. useFactory

```typescript
{
  provide: 'API_BASE_URL',
  useFactory: () => {
    return process.env.API_BASE_URL ?? 'http://localhost:3000';
  },
}
```

`useFactory`는 Factory 함수를 통해 Provider 값을 생성합니다.

Factory 함수는 다른 Provider를 주입받아 사용할 수도 있으며, 비동기 함수를 사용한 초기화도 지원합니다.

### 9.4. useExisting

```typescript
{
  provide: 'USER_SERVICE',
  useExisting: UsersService,
}
```

`useExisting`은 기존에 등록된 Provider를 다른 Injection Token으로도 사용할 수 있도록 합니다.

이는 새로운 Provider 인스턴스를 생성하는 `useClass` 방식과 구분됩니다.

Custom Provider의 상세한 설정 방법과 활용 사례는 `custom-providers.md`에서 설명합니다.

---

## 10. Optional Providers

일부 의존성은 애플리케이션 실행에 반드시 필요하지 않을 수 있습니다.

이러한 의존성을 선택적으로 주입받으려면 `@Optional()` 데코레이터를 사용할 수 있습니다.

### 10.1. Optional Dependency

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

위 예제에서는 `API_BASE_URL` Provider가 등록되어 있지 않아도 해당 의존성이 없다는 이유만으로 의존성 해결 오류가 발생하지 않습니다.

Provider가 존재하지 않는 경우 주입값은 `undefined`가 될 수 있으며, Service 내부에서 기본값을 사용하도록 처리합니다.

`@Optional()`은 의존성이 없어도 정상적으로 동작할 수 있도록 설계된 경우에 사용하는 것이 좋습니다.

반드시 필요한 의존성에 `@Optional()`을 사용하면 설정 오류를 늦게 발견할 수 있으므로 주의해야 합니다.

---

## 11. Property-based Injection

NestJS에서는 생성자 주입 외에도 클래스의 속성에 Provider를 직접 주입할 수 있습니다.

이를 Property-based Injection이라고 합니다.

### 11.1. @Inject()를 이용한 속성 주입

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  @Inject(UsersService)
  private readonly usersService!: UsersService;

  getUsers() {
    return this.usersService.findAll();
  }
}
```

이 방식에서는 생성자 대신 클래스 속성에 `@Inject()` 데코레이터를 적용합니다.

다만 Property-based Injection은 의존성이 생성자 시그니처에 나타나지 않기 때문에 클래스가 어떤 의존성을 필요로 하는지 파악하기 어려울 수 있습니다.

따라서 일반적인 Provider에서는 Constructor Injection을 우선적으로 사용하는 것이 좋습니다.

Property-based Injection은 상속 관계에서 생성자 의존성을 반복적으로 전달해야 하는 상황 등 특정한 경우에 활용할 수 있습니다.

---

## 12. Provider의 Injection Scope

NestJS의 Provider는 인스턴스의 생성과 공유 범위를 제어하기 위한 Injection Scope를 지원합니다.

기본적으로 Provider는 Singleton Scope를 사용합니다.

### 12.1. Scope 종류

| Scope | 설명 |
|---|---|
| `DEFAULT` | 기본 Scope입니다. 일반적으로 애플리케이션 생명주기 동안 Provider 인스턴스를 재사용합니다. |
| `REQUEST` | 요청 컨텍스트별로 Provider 인스턴스를 생성합니다. |
| `TRANSIENT` | Provider를 주입받는 Consumer별로 별도의 인스턴스를 제공합니다. |

### 12.2. Singleton Scope

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {}
```

별도의 Scope를 지정하지 않으면 기본 Singleton Scope가 적용됩니다.

Singleton Provider는 일반적으로 동일한 Provider 등록을 사용하는 여러 Consumer에서 인스턴스를 공유합니다.

이 방식은 인스턴스 생성 비용을 줄이고 공통 기능을 재사용하는 데 유용합니다.

다만 Singleton은 애플리케이션 전체에서 동일한 클래스로 생성된 인스턴스가 반드시 하나라는 의미는 아닙니다.

Provider를 서로 다른 Module에 독립적으로 등록하면 각각의 인스턴스가 생성될 수 있습니다.

### 12.3. Request Scope

```typescript
import {
  Injectable,
  Scope,
} from '@nestjs/common';

@Injectable({
  scope: Scope.REQUEST,
})
export class RequestContextService {}
```

Request Scope는 요청별로 분리된 상태를 관리해야 하는 경우 사용할 수 있습니다.

예를 들어 요청 추적 정보나 특정 요청에 종속된 컨텍스트를 관리할 때 활용할 수 있습니다.

다만 Request Scope Provider를 주입받는 상위 Provider의 Scope도 영향을 받을 수 있으므로 인스턴스 생성 비용을 고려해야 합니다.

### 12.4. Transient Scope

```typescript
import {
  Injectable,
  Scope,
} from '@nestjs/common';

@Injectable({
  scope: Scope.TRANSIENT,
})
export class LoggerService {}
```

Transient Scope는 Provider를 주입받는 Consumer마다 별도의 인스턴스를 제공하는 방식입니다.

단, 요청마다 반드시 새로운 인스턴스를 생성한다는 의미는 아닙니다.

예를 들어 Singleton Consumer가 Transient Provider를 주입받았다면 일반적으로 해당 Consumer에 주입된 Transient 인스턴스를 계속 사용합니다.

Scope별 생명주기와 의존성 전파 동작은 `injection-scopes.md`에서 자세히 설명합니다.

---

## 13. Provider와 Lifecycle Hooks

NestJS의 Provider는 애플리케이션의 초기화 및 종료 시점에 특정 작업을 수행하기 위한 Lifecycle Hook을 구현할 수 있습니다.

대표적으로 다음 인터페이스를 제공합니다.

| 인터페이스 | 메서드 | 설명 |
|---|---|---|
| `OnModuleInit` | `onModuleInit()` | 해당 Module의 의존성이 해결된 후 초기화 과정에서 호출됩니다. |
| `OnApplicationBootstrap` | `onApplicationBootstrap()` | 애플리케이션 초기화 완료 단계에서 호출됩니다. |
| `OnModuleDestroy` | `onModuleDestroy()` | 애플리케이션 종료 과정에서 Module의 정리 작업을 수행합니다. |
| `BeforeApplicationShutdown` | `beforeApplicationShutdown()` | 종료 과정에서 연결 정리 등의 작업을 수행할 수 있습니다. |
| `OnApplicationShutdown` | `onApplicationShutdown()` | 종료 과정의 마지막 단계에서 정리 작업을 수행할 수 있습니다. |

### 13.1. OnModuleInit

다음은 초기화 시점에 특정 작업을 수행하는 Provider 예제입니다.

```typescript
import {
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class UsersService implements OnModuleInit {
  onModuleInit() {
    console.log('UsersService initialized');
  }
}
```

NestJS는 해당 Provider의 초기화 과정에서 `onModuleInit()`을 호출합니다.

이러한 Hook은 초기 설정 검증이나 초기 데이터 준비 등의 작업에 활용할 수 있습니다.

### 13.2. OnModuleDestroy

```typescript
import {
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

@Injectable()
export class ResourceService implements OnModuleDestroy {
  onModuleDestroy() {
    console.log('ResourceService cleanup');
  }
}
```

종료 관련 Hook은 데이터베이스 연결, 메시지 소비자 또는 외부 자원과 관련된 정리 작업을 수행할 때 활용할 수 있습니다.

일반적인 애플리케이션에서는 `app.close()`를 통한 종료 과정에서 Hook이 실행되며, 운영체제 종료 신호에 대응하려면 `enableShutdownHooks()` 설정이 필요할 수 있습니다.

또한 Request-scoped Provider는 일반적인 애플리케이션 생명주기 Hook과 동일하게 관리되지 않으므로 별도 고려가 필요합니다.

Lifecycle Hook에 대한 자세한 내용은 NestJS 공식 Lifecycle Events 문서를 참고합니다.

---

## 14. Provider 설계 시 고려사항

Provider를 설계할 때는 책임 분리, 의존성 방향, 인스턴스 생명주기를 고려해야 합니다.

### 14.1. 단일 책임 원칙을 적용합니다

하나의 Provider가 지나치게 많은 기능을 담당하지 않도록 구성하는 것이 좋습니다.

예를 들어 `UsersService`가 사용자 관리, 이메일 발송, 파일 업로드, 결제 처리까지 모두 담당한다면 변경 이유가 서로 다른 기능들이 하나의 클래스에 결합됩니다.

이러한 경우 기능별 Provider로 분리하는 방식을 고려할 수 있습니다.

```text
UsersService
    │
    ├── UsersRepository
    │
    ├── EmailService
    │
    └── FileStorageService
```

각 Provider는 자신의 책임에 해당하는 작업을 처리하고, 필요한 기능은 다른 Provider에 위임합니다.

### 14.2. 의존성을 명시적으로 선언합니다

Provider가 필요한 의존성을 생성자에 선언하면 객체 간 의존성 관계를 쉽게 파악할 수 있습니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailService: EmailService,
  ) {}
}
```

이 예제는 `UsersRepository`와 `EmailService`가 적절한 Module에 Provider로 등록되어 있다고 가정합니다.

Constructor Injection은 의존성이 클래스의 외부 인터페이스에 명확하게 드러난다는 장점이 있습니다.

### 14.3. Provider를 불필요하게 중복 등록하지 않습니다

동일한 Provider를 여러 Module에 직접 등록하면 Module마다 별도의 인스턴스가 생성될 수 있습니다.

Provider의 공유가 필요한 경우에는 소유 Module을 명확하게 정의하고 `exports`와 `imports`를 통해 재사용하는 것이 좋습니다.

### 14.4. Singleton Provider의 공유 상태를 주의합니다

기본 Singleton Provider는 여러 요청에서 재사용될 수 있습니다.

따라서 특정 요청에 종속된 데이터를 일반 인스턴스 필드에 저장하면 동시 요청 처리 과정에서 문제가 발생할 수 있습니다.

```typescript
@Injectable()
export class UsersService {
  private currentUserId?: number;

  setCurrentUserId(id: number) {
    this.currentUserId = id;
  }
}
```

위 방식은 여러 요청이 동일한 인스턴스를 공유할 때 요청별 상태가 서로 영향을 줄 수 있습니다.

요청별 데이터는 메서드 매개변수, 지역 변수 또는 적절한 요청 컨텍스트에서 관리하는 것이 좋습니다.

### 14.5. 순환 의존성을 최소화합니다

다음과 같이 두 Provider가 서로를 주입받는 구조는 순환 의존성을 발생시킬 수 있습니다.

```text
UsersService
     │
     ▼
AuthService
     │
     ▼
UsersService
```

NestJS는 순환 의존성을 해결하기 위해 `forwardRef()`와 같은 기능을 제공합니다.

그러나 순환 의존성은 책임 분리 또는 의존성 방향을 재검토해야 한다는 신호일 수 있습니다.

가능하다면 공통 기능을 별도의 Provider로 분리하거나 의존성 방향을 재구성하는 것이 좋습니다.

### 14.6. 테스트 가능한 Provider를 구성합니다

Provider의 의존성을 외부에서 주입받도록 구성하면 단위 테스트에서 실제 구현 대신 Mock 객체를 사용할 수 있습니다.

```typescript
const mockUsersRepository = {
  findAll: jest.fn().mockReturnValue([]),
};
```

이러한 Mock 객체를 이용하면 실제 데이터베이스나 외부 시스템에 접근하지 않고도 Service 로직을 검증할 수 있습니다.

NestJS의 Testing Module을 사용한 Provider 교체 및 테스트 구현은 `06-testing/`의 관련 문서에서 설명합니다.

---

## 15. 전체 구현 예제

앞에서 설명한 Provider 등록, Constructor Injection, Provider 간 의존성 및 Module 구성을 조합하여 간단한 사용자 조회 API를 구현할 수 있습니다.

### 15.1. 디렉터리 구조

```text
src/
├── main.ts
├── app.module.ts
│
└── users/
    ├── users.controller.ts
    ├── users.service.ts
    ├── users.repository.ts
    └── users.module.ts
```

### 15.2. Repository Provider

**users/users.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  name: string;
}

@Injectable()
export class UsersRepository {
  private readonly users: User[] = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  findAll(): User[] {
    return this.users;
  }

  findById(id: number): User | undefined {
    return this.users.find((user) => user.id === id);
  }
}
```

### 15.3. Service Provider

**users/users.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import {
  User,
  UsersRepository,
} from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  findAll(): User[] {
    return this.usersRepository.findAll();
  }

  findOne(id: number): User | undefined {
    return this.usersRepository.findById(id);
  }
}
```

### 15.4. Controller

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
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
```

### 15.5. Module

**users/users.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
  ],
})
export class UsersModule {}
```

### 15.6. Root Module

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

### 15.7. Bootstrap

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

### 15.8. API 요청 예제

다음 요청을 통해 사용자 목록을 조회할 수 있습니다.

```http
GET /users
```

응답 예제는 다음과 같습니다.

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

특정 사용자를 조회할 수도 있습니다.

```http
GET /users/1
```

응답 예제는 다음과 같습니다.

```json
{
  "id": 1,
  "name": "Alice"
}
```

이 과정에서 Controller는 Service를 호출하고, Service는 Repository를 호출합니다.

각 구성 요소에 필요한 의존성은 NestJS의 DI Container가 해결합니다.

---

## 16. 정리

NestJS의 Provider는 애플리케이션의 기능을 구현하고 다른 구성 요소에 의존성으로 제공되는 핵심 구성 요소입니다.

주요 특징은 다음과 같습니다.

1. **Provider는 NestJS의 DI Container에서 관리되는 구성 요소입니다.** Service, Repository, Factory, 설정값 등 다양한 형태로 구성할 수 있습니다.
2. **`@Injectable()`은 클래스의 의존성 주입을 위한 메타데이터를 제공합니다.** 일반적인 클래스 기반 Provider에서 사용합니다.
3. **Provider는 Module에 등록하여 사용합니다.** `@Module()`의 `providers` 메타데이터를 통해 관리 대상에 포함합니다.
4. **Constructor Injection으로 의존성을 전달받습니다.** 객체를 직접 생성하지 않고 NestJS가 제공하는 인스턴스를 사용합니다.
5. **Provider는 다른 Provider에 의존할 수 있습니다.** Service와 Repository 등 여러 구성 요소를 조합할 수 있습니다.
6. **Module의 `imports`와 `exports`를 통해 Provider를 공유할 수 있습니다.** Provider의 소유 관계와 접근 범위를 명시적으로 관리합니다.
7. **Injection Token으로 Provider를 식별합니다.** 클래스뿐 아니라 문자열과 Symbol 등을 사용할 수 있습니다.
8. **Custom Provider를 지원합니다.** `useClass`, `useValue`, `useFactory`, `useExisting`을 통해 다양한 등록 방식을 구성할 수 있습니다.
9. **Injection Scope로 인스턴스 생명주기를 제어합니다.** Singleton, Request, Transient Scope를 지원합니다.
10. **Lifecycle Hook을 통해 초기화와 종료 작업을 수행할 수 있습니다.** 외부 자원의 연결 및 정리 작업 등에 활용할 수 있습니다.

Provider를 이해할 때 가장 중요한 점은 **Provider가 단순한 Service 클래스가 아니라 NestJS의 의존성 주입 시스템에서 식별, 생성, 관리 및 제공되는 의존성 단위라는 것**입니다.

이러한 구조를 이해하면 Module 간 Provider 공유, Custom Provider 구성, Injection Scope 및 Dependency Injection의 내부 동작을 체계적으로 학습할 수 있습니다.

---

## 17. 관련 문서

- `modules.md`: Module의 Provider 등록, 공개 및 공유 방식
- `controllers.md`: Controller에서 Provider를 사용하는 방식
- `dependency-injection.md`: DI Container, IoC 및 의존성 해결 과정
- `custom-providers.md`: Injection Token과 Custom Provider 등록 방식
- `injection-scopes.md`: Singleton, Request, Transient Scope
- `dynamic-modules.md`: 동적으로 구성되는 Provider와 Module
- `../02-request-lifecycle/execution-context.md`: 요청 처리 과정의 실행 컨텍스트
- `../03-techniques/database.md`: 데이터베이스 및 Repository Provider 구성
- `../06-testing/unit-testing.md`: Provider 단위 테스트
- `../06-testing/mocking-providers.md`: Mock Provider를 이용한 의존성 대체
- `../07-architecture/dependency-management.md`: 의존성 방향 및 결합도 관리

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Providers](https://docs.nestjs.com/providers)  
  Provider의 개념, Service, Constructor Injection, Optional Provider 및 Property-based Injection을 설명합니다.

- [NestJS Modules](https://docs.nestjs.com/modules)  
  Module에서 Provider를 등록하고 외부 Module에 공개하는 방법을 설명합니다.

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)  
  Injection Token과 `useClass`, `useValue`, `useFactory`, `useExisting`을 이용한 Provider 등록 방식을 설명합니다.

- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)  
  Singleton, Request, Transient Scope 및 Provider 인스턴스 생명주기를 설명합니다.

- [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref)  
  `ModuleRef`를 사용하여 Provider를 조회하거나 동적으로 의존성을 해결하는 방법을 설명합니다.

- [NestJS Circular Dependency](https://docs.nestjs.com/fundamentals/circular-dependency)  
  Provider 및 Module 간 순환 의존성 문제와 해결 방법을 설명합니다.

- [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)  
  Provider의 초기화 및 종료 과정에서 사용할 수 있는 Lifecycle Hook을 설명합니다.

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)  
  Testing Module을 통해 Provider를 테스트하고 Mock 객체로 교체하는 방법을 설명합니다.

### GitHub Repository

- [NestJS 공식 GitHub Repository](https://github.com/nestjs/nest)  
  NestJS 프레임워크의 Provider, DI Container 및 Module 관련 내부 구현을 확인할 수 있습니다.

- [NestJS 공식 예제 Repository](https://github.com/nestjs/nest/tree/master/sample)  
  Provider와 Service, Controller 및 Module을 조합한 다양한 구현 예제를 확인할 수 있습니다.