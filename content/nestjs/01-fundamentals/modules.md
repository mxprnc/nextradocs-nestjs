# Modules

## 1. 개요

NestJS의 **Module**은 애플리케이션의 기능을 논리적인 단위로 구성하고, 관련된 Controller와 Provider를 관리하는 핵심 구성 요소입니다.

NestJS 애플리케이션은 하나 이상의 Module로 구성되며, 각 Module은 특정 기능이나 도메인에 필요한 구성 요소를 하나의 단위로 묶습니다.

Module은 `@Module()` 데코레이터가 적용된 클래스로 정의합니다. `@Module()` 데코레이터는 NestJS가 애플리케이션의 구조를 구성하고 의존성을 관리하는 데 필요한 메타데이터를 제공합니다.

Module을 사용하면 다음과 같은 이점을 얻을 수 있습니다.

- **관심사의 분리(Separation of Concerns):** 기능별로 Controller와 Provider를 분리하여 관리할 수 있습니다.
- **캡슐화(Encapsulation):** Module 내부의 Provider를 외부에 선택적으로 공개할 수 있습니다.
- **재사용성(Reusability):** 다른 Module에서 필요한 기능을 가져와 재사용할 수 있습니다.
- **의존성 관리(Dependency Management):** Module 간 의존성을 명시적으로 정의할 수 있습니다.
- **유지보수성(Maintainability):** 기능별 책임을 구분하여 코드의 변경 범위를 제한할 수 있습니다.

NestJS에서는 Module을 애플리케이션 구조를 정의하는 기본 단위로 사용합니다.

---

## 2. Module의 기본 구조

Module은 `@nestjs/common` 패키지에서 제공하는 `@Module()` 데코레이터를 사용하여 정의합니다.

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

위 예제에서는 사용자 관련 기능을 담당하는 `UsersModule`을 정의합니다.

`UsersModule`은 다음과 같은 역할을 수행합니다.

1. `UsersController`를 등록하여 사용자 관련 HTTP 요청을 처리하도록 구성합니다.
2. `UsersService`를 Provider로 등록하여 NestJS의 DI Container가 관리하도록 합니다.
3. `UsersService`를 외부 Module에서도 사용할 수 있도록 공개합니다.
4. 필요한 경우 다른 Module을 `imports`에 등록하여 해당 Module이 공개한 Provider를 사용할 수 있습니다.

Module 클래스는 일반적으로 별도의 비즈니스 로직을 구현하지 않습니다.

대신 `@Module()` 데코레이터에 전달하는 메타데이터를 통해 관련 구성 요소와 의존성 관계를 선언합니다.

### 2.1. @Module() 메타데이터

`@Module()` 데코레이터는 Module을 구성하는 여러 메타데이터 속성을 제공합니다.

| 속성 | 설명 |
|---|---|
| `imports` | 현재 Module에서 사용할 다른 Module을 등록합니다. |
| `controllers` | 현재 Module이 관리할 Controller를 등록합니다. |
| `providers` | 현재 Module의 DI Container 범위에서 관리할 Provider를 등록합니다. |
| `exports` | 다른 Module에서 사용할 수 있도록 공개할 Provider 또는 재공개할 Module을 지정합니다. |

각 속성은 Module의 의존성 관계와 Provider 접근 범위를 결정합니다.

### 2.2. imports

`imports`는 현재 Module에서 필요한 Provider를 제공하는 다른 Module을 등록하는 속성입니다.

```typescript
@Module({
  imports: [UsersModule],
})
export class AuthModule {}
```

위 예제에서는 `AuthModule`이 `UsersModule`을 가져옵니다.

다만 `UsersModule`을 가져왔다고 해서 내부에 등록된 모든 Provider에 접근할 수 있는 것은 아닙니다.

`AuthModule`에서는 `UsersModule`이 `exports`를 통해 공개한 Provider에 접근할 수 있습니다.

### 2.3. controllers

`controllers`는 Module에서 관리할 Controller를 등록하는 속성입니다.

```typescript
@Module({
  controllers: [UsersController],
})
export class UsersModule {}
```

NestJS는 등록된 Controller를 인스턴스화하고, Controller에 선언된 라우팅 메타데이터를 기반으로 요청 처리 구조를 구성합니다.

Controller는 주로 HTTP 요청을 수신하고 응답을 반환하는 역할을 담당합니다.

Controller의 구체적인 역할과 동작 방식은 `controllers.md`에서 설명합니다.

### 2.4. providers

`providers`는 NestJS의 DI Container가 관리할 Provider를 등록하는 속성입니다.

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

위 예제에서 `UsersService`는 `UsersModule`에 등록된 Provider입니다.

NestJS는 Provider의 의존성을 확인하고 필요한 인스턴스를 생성하여 다른 구성 요소에 주입합니다.

Provider는 일반적으로 Service, Repository, Factory 등의 역할을 수행합니다.

Provider의 구체적인 개념은 `providers.md`에서 설명합니다.

### 2.5. exports

`exports`는 현재 Module에서 관리하는 Provider 중 다른 Module에 공개할 대상을 지정하는 속성입니다.

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

위 예제에서는 `UsersService`를 외부에 공개합니다.

따라서 다른 Module에서 `UsersModule`을 `imports`에 등록하면 `UsersService`를 의존성으로 주입받을 수 있습니다.

`exports`는 Module의 외부 공개 인터페이스를 정의하는 역할을 합니다.

---

## 3. Root Module

NestJS 애플리케이션에는 적어도 하나의 Root Module이 필요합니다.

Root Module은 NestJS가 애플리케이션의 Module Graph를 구성할 때 사용하는 시작점입니다.

일반적인 NestJS 프로젝트에서는 `AppModule`이 Root Module의 역할을 담당합니다.

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
})
export class AppModule {}
```

위 예제에서 `AppModule`은 `UsersModule`과 `AuthModule`을 가져와 애플리케이션을 구성합니다.

### 3.1. 애플리케이션 부트스트랩

NestJS에서는 일반적으로 `main.ts`에서 `NestFactory`를 사용하여 애플리케이션을 생성합니다.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

`NestFactory.create(AppModule)`을 호출하면 NestJS는 Root Module을 시작점으로 애플리케이션의 구성을 분석합니다.

주요 과정은 다음과 같습니다.

1. Root Module의 메타데이터를 분석합니다.
2. `imports`에 등록된 Module과 의존성 관계를 확인합니다.
3. Module Graph를 구성합니다.
4. Provider의 의존성을 분석하고 인스턴스를 생성합니다.
5. Controller와 필요한 Provider의 의존성을 연결합니다.
6. 애플리케이션 초기화 과정을 수행합니다.

Module Graph는 Module 간 관계를 표현하는 내부 구조입니다.

NestJS는 이 구조를 기반으로 Provider를 탐색하고 의존성을 해결합니다.

> **참고:** 최신 NestJS에서는 `NestFactory.create()`에 Module 메타데이터 객체를 직접 전달하는 방식도 지원합니다. 다만 일반적인 프로젝트에서는 Module 클래스를 명시적으로 정의하는 방식이 구조 관리와 기능 확장에 적합합니다.

---

## 4. Feature Module

Feature Module은 애플리케이션의 특정 기능이나 도메인을 담당하는 Module입니다.

예를 들어 사용자 관리, 인증, 주문 관리 기능을 각각 별도의 Module로 구성할 수 있습니다.

```text
src/
├── app.module.ts
├── main.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   └── auth.service.ts
│
└── orders/
    ├── orders.module.ts
    ├── orders.controller.ts
    └── orders.service.ts
```

이러한 구조는 기능별 책임을 명확하게 분리합니다.

예를 들어 사용자 관리 기능은 `UsersModule`에서 관리하고, 인증 기능은 `AuthModule`에서 관리합니다.

### 4.1. Feature Module 정의

사용자 관리 기능을 담당하는 Module은 다음과 같이 구성할 수 있습니다.

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

`@Injectable()`은 해당 클래스가 NestJS의 의존성 주입 시스템에서 관리될 수 있음을 나타내는 데코레이터입니다.

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

`UsersController`는 생성자를 통해 `UsersService`를 주입받습니다.

`GET /users` 요청이 발생하면 `UsersService.findAll()`을 호출합니다.

**users.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

`UsersModule`은 `UsersController`와 `UsersService`를 하나의 기능 단위로 구성합니다.

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

Root Module에서 `UsersModule`을 가져오면 사용자 관련 기능이 애플리케이션에 포함됩니다.

### 4.2. Feature Module의 장점

Feature Module은 애플리케이션을 기능 중심으로 구성할 수 있도록 지원합니다.

예를 들어 사용자 관리 기능이 확장되더라도 해당 기능과 관련된 대부분의 변경을 `users` 디렉터리 내부에서 관리할 수 있습니다.

또한 다른 기능에서 사용자 관리 서비스를 사용해야 한다면 `UsersModule`이 공개한 Provider를 가져와 재사용할 수 있습니다.

---

## 5. Module의 캡슐화

NestJS의 Module은 기본적으로 Provider를 캡슐화합니다.

Provider가 특정 Module의 `providers`에 등록되어 있더라도 다른 Module에서 자동으로 접근할 수 있는 것은 아닙니다.

다른 Module에서 Provider를 사용하려면 해당 Provider를 `exports`에 등록하고, 사용하는 Module에서 제공하는 Module을 `imports`에 등록해야 합니다.

### 5.1. Provider의 기본 접근 범위

다음과 같은 `UsersModule`이 있다고 가정합니다.

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

`UsersService`는 `UsersModule` 내부에서 사용할 수 있습니다.

그러나 다른 Module에서 `UsersModule`을 가져오더라도 `UsersService`를 주입받을 수는 없습니다.

이는 `UsersService`가 `exports`에 등록되지 않았기 때문입니다.

### 5.2. Provider 공개

다른 Module에서도 `UsersService`를 사용하려면 `exports`에 등록해야 합니다.

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

이제 `UsersModule`을 가져오는 다른 Module에서 `UsersService`를 주입받을 수 있습니다.

이러한 구조는 Module의 내부 구현과 외부에 공개하는 기능을 구분할 수 있도록 합니다.

즉, `providers`는 Module 내부에서 관리할 Provider를 정의하고, `exports`는 외부에 공개할 Provider를 정의합니다.

### 5.3. Provider와 Module의 관계

다음과 같은 구조를 가정합니다.

```text
UsersModule
│
├── UsersController
│
├── UsersService
│
└── UsersRepository
```

`UsersService`와 `UsersRepository`가 모두 Provider로 등록되어 있다고 가정합니다.

```typescript
@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
  ],
  exports: [UsersService],
})
export class UsersModule {}
```

이 경우 외부 Module에서는 `UsersService`를 주입받을 수 있지만, `UsersRepository`를 직접 주입받을 수는 없습니다.

이는 `UsersRepository`가 `exports`에 등록되지 않았기 때문입니다.

다만 `UsersService`는 동일한 Module 내부에 등록된 `UsersRepository`를 주입받아 사용할 수 있습니다.

이처럼 Module은 내부 구현 요소를 캡슐화하고 필요한 기능만 외부에 공개할 수 있습니다.

---

## 6. Module 간 의존성

NestJS에서는 Module 간 의존성을 `imports`와 `exports`를 사용하여 관리합니다.

예를 들어 인증 기능을 담당하는 `AuthModule`에서 사용자 정보를 조회해야 한다고 가정합니다.

이 경우 `AuthModule`은 `UsersModule`이 제공하는 `UsersService`를 사용할 수 있습니다.

### 6.1. Provider를 제공하는 Module

먼저 `UsersModule`에서 `UsersService`를 공개합니다.

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

`UsersService`는 `UsersModule`에서 관리하는 Provider입니다.

### 6.2. Provider를 사용하는 Module

다음으로 `AuthModule`에서 `UsersModule`을 가져옵니다.

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

`AuthModule`은 `UsersModule`이 공개한 `UsersService`를 사용할 수 있습니다.

### 6.3. 의존성 주입

`AuthService`에서는 생성자를 통해 `UsersService`를 주입받습니다.

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

NestJS는 `AuthService`의 생성자에 선언된 의존성을 분석하고, `AuthModule`에서 접근할 수 있는 Provider를 탐색합니다.

이 과정에서 `AuthModule`이 가져온 `UsersModule`의 `exports`를 확인하여 `UsersService`를 해결합니다.

전체 의존성 관계는 다음과 같습니다.

```text
AppModule
│
├── UsersModule
│   │
│   └── UsersService
│
└── AuthModule
    │
    ├── imports: [UsersModule]
    │
    └── AuthService
         │
         └── UsersService 주입
```

여기서 중요한 점은 `AuthModule`이 `UsersService`를 직접 등록하지 않아도 된다는 것입니다.

`UsersService`는 `UsersModule`에서 관리되며, `AuthModule`은 해당 Module의 공개 인터페이스를 통해 Provider에 접근합니다.

이를 통해 Provider의 소유 관계와 재사용 경계를 명확하게 구분할 수 있습니다.

---

## 7. Shared Module

NestJS에서는 하나의 Module을 여러 Module에서 가져와 사용할 수 있습니다.

이처럼 여러 Module에서 재사용되는 Module을 일반적으로 Shared Module이라고 설명합니다.

NestJS의 Module은 기본적으로 재사용 가능하며, Provider는 기본적으로 Singleton Scope로 관리됩니다.

따라서 동일한 Module이 공개한 Singleton Provider를 여러 Module에서 사용하면 일반적으로 동일한 Provider 인스턴스를 공유합니다.

### 7.1. Shared Module 구성

다음과 같이 `CommonModule`을 구성할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';
import { CommonService } from './common.service';

@Module({
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
```

다른 Module에서 `CommonModule`을 가져옵니다.

```typescript
@Module({
  imports: [CommonModule],
})
export class UsersModule {}
```

```typescript
@Module({
  imports: [CommonModule],
})
export class OrdersModule {}
```

두 Module은 `CommonModule`에서 공개한 `CommonService`를 사용할 수 있습니다.

```text
             CommonModule
                  │
             CommonService
                  │
          ┌───────┴───────┐
          │               │
     UsersModule      OrdersModule
```

기본 Singleton Scope를 사용하는 경우 두 Module은 동일한 `CommonService` 인스턴스를 공유합니다.

단, Provider의 Scope나 Dynamic Module의 구성에 따라 인스턴스 생성 및 공유 방식은 달라질 수 있습니다.

### 7.2. 동일한 Provider의 중복 등록

다음과 같이 동일한 Provider를 여러 Module에 직접 등록할 수도 있습니다.

```typescript
@Module({
  providers: [CommonService],
})
export class UsersModule {}
```

```typescript
@Module({
  providers: [CommonService],
})
export class OrdersModule {}
```

그러나 이 방식에서는 각 Module이 별도의 Provider 등록을 갖습니다.

따라서 기본 Singleton Scope에서도 각 Module에 서로 다른 `CommonService` 인스턴스가 생성될 수 있습니다.

Provider가 내부 상태를 관리하거나 외부 자원과 연결되는 경우, 이러한 중복 등록은 의도하지 않은 동작을 발생시킬 수 있습니다.

공유가 필요한 Provider는 하나의 Module에서 관리하고 `exports`를 통해 공개하는 방식을 사용하는 것이 좋습니다.

---

## 8. Module Re-exporting

NestJS에서는 가져온 Module을 다시 외부로 공개하는 Re-exporting 기능을 지원합니다.

이 기능을 사용하면 여러 Module의 기능을 하나의 Module을 통해 제공할 수 있습니다.

### 8.1. Module 재공개

다음과 같이 `CommonModule`이 있다고 가정합니다.

```typescript
@Module({
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
```

`CoreModule`에서 `CommonModule`을 가져온 후 다시 공개할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';
import { CommonModule } from './common.module';

@Module({
  imports: [CommonModule],
  exports: [CommonModule],
})
export class CoreModule {}
```

다른 Module에서는 `CoreModule`만 가져와도 `CommonModule`이 공개한 Provider에 접근할 수 있습니다.

```typescript
@Module({
  imports: [CoreModule],
})
export class UsersModule {}
```

의존성 관계는 다음과 같습니다.

```text
CommonModule
    │
    │ exports: CommonService
    ▼
CoreModule
    │
    │ re-exports: CommonModule
    ▼
UsersModule
    │
    └── CommonService 사용 가능
```

Re-exporting은 공통 기능을 여러 Module에서 일관되게 제공할 때 유용합니다.

다만 모든 기능을 하나의 공통 Module에 집중시키면 Module 간 의존성 경계가 불명확해질 수 있으므로, 관련성이 높은 기능을 중심으로 구성하는 것이 좋습니다.

---

## 9. Global Module

NestJS에서는 특정 Module의 Provider를 애플리케이션 전체에서 사용할 수 있도록 Global Module을 정의할 수 있습니다.

Global Module은 `@Global()` 데코레이터를 사용하여 선언합니다.

### 9.1. Global Module 정의

```typescript
import { Global, Module } from '@nestjs/common';
import { CommonService } from './common.service';

@Global()
@Module({
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
```

`@Global()`이 적용된 Module은 공개한 Provider를 애플리케이션의 다른 Module에서도 사용할 수 있도록 합니다.

따라서 해당 Provider를 사용하는 Module마다 `CommonModule`을 `imports`에 등록할 필요가 없습니다.

### 9.2. Global Module 등록

Global Module은 일반적으로 Root Module 또는 Core Module에서 한 번 등록합니다.

```typescript
import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    CommonModule,
    UsersModule,
  ],
})
export class AppModule {}
```

이제 `UsersModule`이 `CommonModule`을 직접 가져오지 않더라도 `CommonService`를 주입받을 수 있습니다.

단, Global Module이라고 해서 내부의 모든 Provider가 자동으로 공개되는 것은 아닙니다.

다른 Module에서 접근할 수 있는 Provider는 해당 Global Module의 `exports`에 등록된 Provider입니다.

### 9.3. Global Module 사용 시 주의사항

Global Module은 여러 기능에서 공통으로 사용하는 Provider를 제공할 때 편리합니다.

예를 들어 공통 설정 서비스나 애플리케이션 전반에서 사용하는 인프라 관련 Provider를 제공하는 데 활용할 수 있습니다.

그러나 모든 Module을 Global Module로 구성하는 것은 권장되지 않습니다.

Global Module을 과도하게 사용하면 다음과 같은 문제가 발생할 수 있습니다.

- Module 간 의존성이 코드에서 명시적으로 드러나지 않을 수 있습니다.
- 특정 Module이 어떤 외부 기능에 의존하는지 파악하기 어려워질 수 있습니다.
- 의존성 관계가 암묵적으로 형성되어 유지보수가 어려워질 수 있습니다.

따라서 일반적인 Feature Module에서는 `imports`와 `exports`를 통한 명시적인 의존성 관리 방식을 우선적으로 사용하는 것이 좋습니다.

---

## 10. Dynamic Module

Dynamic Module은 Module을 가져오는 시점에 전달한 설정값에 따라 Module의 구성을 동적으로 정의할 수 있는 기능입니다.

일반적인 Module에서는 `@Module()`에 선언한 메타데이터를 기반으로 구성 요소를 등록합니다.

반면 Dynamic Module에서는 정적 메서드를 통해 `DynamicModule` 객체를 반환하여 Provider와 설정값 등을 구성할 수 있습니다.

### 10.1. Dynamic Module이 필요한 이유

예를 들어 특정 Module에서 외부 API의 기본 URL을 설정하거나, 데이터베이스 연결 정보를 전달해야 하는 경우가 있습니다.

이러한 설정값이 사용하는 애플리케이션이나 Module마다 달라질 수 있다면 Dynamic Module을 활용할 수 있습니다.

### 10.2. Dynamic Module 기본 구조

다음은 설정값을 전달받는 간단한 Dynamic Module 예제입니다.

```typescript
import { DynamicModule, Module } from '@nestjs/common';

export const API_BASE_URL = 'API_BASE_URL';

@Module({})
export class ApiModule {
  static register(baseUrl: string): DynamicModule {
    return {
      module: ApiModule,
      providers: [
        {
          provide: API_BASE_URL,
          useValue: baseUrl,
        },
      ],
      exports: [API_BASE_URL],
    };
  }
}
```

`register()` 메서드는 `DynamicModule` 객체를 반환합니다.

반환되는 객체에는 다음과 같은 정보가 포함됩니다.

- `module`: Dynamic Module을 정의하는 Module 클래스
- `providers`: Module 내부에서 사용할 Provider
- `exports`: 외부 Module에 공개할 Provider

### 10.3. Dynamic Module 사용

다른 Module에서는 `register()` 메서드를 호출하여 설정값을 전달합니다.

```typescript
import { Module } from '@nestjs/common';
import { ApiModule } from './api.module';

@Module({
  imports: [
    ApiModule.register('https://api.example.com'),
  ],
})
export class AppModule {}
```

이 경우 `ApiModule`은 전달받은 URL을 `API_BASE_URL` 토큰으로 등록합니다.

해당 Provider를 사용하는 Module에서는 다음과 같이 설정값을 주입받을 수 있습니다.

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { API_BASE_URL } from './api.module';

@Injectable()
export class ApiService {
  constructor(
    @Inject(API_BASE_URL)
    private readonly baseUrl: string,
  ) {}

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
```

위 예제는 `ApiService`가 `ApiModule`을 가져오는 Module에 Provider로 등록되어 있거나, 해당 Provider에 접근할 수 있도록 적절하게 구성되었다는 것을 전제로 합니다.

### 10.4. Dynamic Module의 주요 특징

Dynamic Module은 다음과 같은 상황에서 유용합니다.

- Module을 사용하는 위치에 따라 서로 다른 설정값을 전달해야 하는 경우
- 외부 라이브러리나 서비스의 초기 설정을 구성해야 하는 경우
- 설정값에 따라 Provider 등록 방식을 변경해야 하는 경우
- 동기 또는 비동기 설정 초기화가 필요한 경우

NestJS에서는 Dynamic Module의 설정 메서드로 `register()`, `forRoot()`, `forFeature()` 등의 이름을 사용하는 관례가 있습니다.

이러한 이름은 사용 목적에 따라 구분되지만, NestJS가 특정 메서드 이름을 강제하는 것은 아닙니다.

Dynamic Module의 상세 구현 방식과 `ConfigurableModuleBuilder`는 `dynamic-modules.md`에서 설명합니다.

---

## 11. Module과 Dependency Injection

Module은 NestJS의 Dependency Injection 시스템에서 중요한 역할을 수행합니다.

NestJS는 Module에 등록된 Provider 정보를 기반으로 의존성을 탐색하고 인스턴스를 주입합니다.

### 11.1. Module을 통한 DI 구성

다음과 같은 `UsersModule`이 있다고 가정합니다.

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

NestJS는 `UsersModule`에 등록된 Provider를 관리합니다.

`UsersController`가 `UsersService`를 의존성으로 선언하면 NestJS의 DI Container가 해당 의존성을 해결합니다.

```typescript
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}
}
```

이 과정에서 `UsersService`를 직접 `new` 연산자로 생성할 필요가 없습니다.

NestJS가 Provider의 생성과 의존성 주입을 관리하기 때문입니다.

### 11.2. Module은 DI의 경계를 정의합니다

NestJS의 의존성 주입은 Module의 Provider 등록 및 공개 범위를 기준으로 이루어집니다.

다음과 같이 구분할 수 있습니다.

| 구분 | 설명 |
|---|---|
| 현재 Module의 Provider | 해당 Module에 직접 등록된 Provider에 접근할 수 있습니다. |
| 가져온 Module의 Provider | 가져온 Module에서 공개한 Provider에 접근할 수 있습니다. |
| 공개되지 않은 Provider | 다른 Module에서 직접 주입받을 수 없습니다. |
| Global Module의 Provider | Global Module에서 공개한 Provider에 명시적인 Module import 없이 접근할 수 있습니다. |

따라서 Module은 단순히 파일이나 클래스를 묶는 역할뿐 아니라, 의존성 주입이 가능한 범위를 정의하는 역할도 수행합니다.

이러한 특성은 대규모 애플리케이션에서 Module 간 결합도를 관리하는 데 중요합니다.

---

## 12. Module 설계 시 고려사항

NestJS 애플리케이션의 Module을 설계할 때는 기능별 책임과 의존성 관계를 명확하게 정의하는 것이 중요합니다.

### 12.1. 기능 중심으로 Module을 구성합니다

Controller, Service, Repository를 각각 별도의 Module로 분리하기보다는 관련된 기능을 하나의 Feature Module로 묶는 방식을 우선적으로 고려합니다.

예를 들어 사용자 관리 기능을 다음과 같이 구성할 수 있습니다.

```text
users/
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
│
├── entities/
│   └── user.entity.ts
│
├── users.controller.ts
├── users.service.ts
├── users.repository.ts
└── users.module.ts
```

이 구조에서는 사용자 관리와 관련된 변경 사항을 하나의 기능 영역에서 관리할 수 있습니다.

단, Repository의 구체적인 구성은 사용하는 ORM이나 데이터 접근 기술에 따라 달라질 수 있습니다.

### 12.2. 필요한 Provider만 공개합니다

Module 내부의 모든 Provider를 `exports`에 등록할 필요는 없습니다.

외부 Module에서 실제로 필요한 Provider만 공개하는 것이 좋습니다.

```typescript
@Module({
  providers: [
    UsersService,
    UsersRepository,
  ],
  exports: [UsersService],
})
export class UsersModule {}
```

이 구조에서는 `UsersRepository`를 내부 구현 요소로 유지하고, 다른 Module에는 `UsersService`만 공개합니다.

이를 통해 Module의 내부 구현이 변경되더라도 외부 Module에 미치는 영향을 줄일 수 있습니다.

### 12.3. Provider의 중복 등록을 주의합니다

여러 Module에서 동일한 Provider를 직접 등록하면 서로 다른 인스턴스가 생성될 수 있습니다.

공유가 필요한 Provider는 해당 Provider를 관리하는 Module에서 공개하고, 다른 Module에서 가져오는 방식을 고려해야 합니다.

다만 반드시 모든 Provider를 공유해야 하는 것은 아닙니다.

독립적인 상태가 필요하거나 Provider의 Scope가 다른 경우에는 별도의 인스턴스가 적합할 수 있습니다.

### 12.4. Global Module 사용을 최소화합니다

Global Module은 반복적인 `imports` 선언을 줄이는 데 유용하지만, Module 간 의존성을 명시적으로 드러내지 않습니다.

따라서 애플리케이션 전체에서 공통으로 사용하는 일부 기능에 제한적으로 적용하는 것이 좋습니다.

### 12.5. 순환 의존성을 피합니다

다음과 같이 Module이 서로를 가져오는 구조는 순환 의존성을 발생시킬 수 있습니다.

```text
UsersModule
    │
    ▼
AuthModule
    │
    ▼
UsersModule
```

NestJS는 특정 순환 의존성 문제를 해결하기 위해 `forwardRef()`를 제공합니다.

그러나 순환 의존성은 Module 간 책임이 적절하게 분리되지 않았다는 신호일 수도 있습니다.

따라서 `forwardRef()`를 사용하기 전에 Module의 역할과 의존성 방향을 검토하는 것이 좋습니다.

---

## 13. 주요 개념 비교

NestJS에서 사용하는 Module의 주요 형태를 비교하면 다음과 같습니다.

| 구분 | 특징 | 주요 사용 목적 |
|---|---|---|
| Root Module | 애플리케이션 구성의 시작점 | 애플리케이션 부트스트랩 |
| Feature Module | 특정 기능 또는 도메인을 담당 | 기능별 책임 분리 |
| Shared Module | 여러 Module에서 재사용 | Provider 공유 |
| Global Module | 공개한 Provider를 전역적으로 제공 | 공통 인프라 기능 제공 |
| Dynamic Module | 설정값에 따라 Module 구성을 정의 | 설정 가능한 Module 구현 |

이러한 명칭이 모두 별도의 Module 타입을 의미하는 것은 아닙니다.

Root Module과 Feature Module은 주로 애플리케이션에서 수행하는 역할을 구분하는 용어입니다.

Shared Module은 여러 Module에서 재사용되는 일반적인 Module을 의미합니다.

Global Module은 `@Global()` 데코레이터를 통해 전역 접근 범위를 지정한 Module이며, Dynamic Module은 `DynamicModule` 인터페이스를 통해 구성을 동적으로 제공하는 Module입니다.

하나의 Module이 여러 특성을 동시에 가질 수도 있습니다.

---

## 14. 정리

NestJS의 Module은 애플리케이션의 구조를 구성하고 Provider의 관리 범위와 의존성 관계를 정의하는 핵심 요소입니다.

Module의 주요 특징은 다음과 같습니다.

1. **Module은 애플리케이션의 구성 단위입니다.** 관련된 Controller와 Provider를 하나의 기능 영역으로 구성합니다.
2. **`@Module()`은 구성 정보를 정의합니다.** `imports`, `controllers`, `providers`, `exports` 메타데이터를 통해 Module의 구조를 선언합니다.
3. **Module은 Provider를 캡슐화합니다.** 내부 Provider는 기본적으로 해당 Module 범위에서 관리되며, 외부에 공개할 Provider를 명시적으로 지정합니다.
4. **Module 간 의존성은 `imports`와 `exports`로 관리합니다.** 다른 Module이 공개한 Provider를 재사용할 수 있습니다.
5. **기본 Singleton Provider는 여러 Module에서 공유할 수 있습니다.** 동일한 Module에서 제공하는 인스턴스를 재사용하여 불필요한 중복 생성을 방지할 수 있습니다.
6. **Global Module은 공개한 Provider를 전역적으로 제공합니다.** 다만 명시적인 의존성 관리가 어려워질 수 있으므로 제한적으로 사용하는 것이 좋습니다.
7. **Dynamic Module은 설정 가능한 Module을 구현할 수 있도록 지원합니다.** 사용하는 위치에서 설정값을 전달하여 Module의 구성을 정의할 수 있습니다.

NestJS의 Module을 이해할 때 가장 중요한 점은 **Module이 단순한 코드 그룹이 아니라 Provider의 소유 관계, 공개 범위, 의존성 해결 경계를 정의한다는 것**입니다.

이러한 구조를 이해하면 Controller, Provider, Dependency Injection이 서로 어떤 관계를 가지며 NestJS의 DI Container에서 어떻게 관리되는지 파악할 수 있습니다.

---

## 15. 관련 문서

다음 문서에서는 Module과 밀접하게 관련된 개념을 추가로 설명합니다.

- `controllers.md`: Controller의 역할과 HTTP 요청 처리 방식
- `providers.md`: Provider의 정의, 역할 및 등록 방식
- `dependency-injection.md`: NestJS의 의존성 주입 구조와 DI Container
- `custom-providers.md`: Injection Token과 Custom Provider 등록 방식
- `injection-scopes.md`: Singleton, Request, Transient Scope
- `dynamic-modules.md`: Dynamic Module과 설정 가능한 Module 구현 방식

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Modules](https://docs.nestjs.com/modules)  
  Module의 기본 구조, `@Module()` 메타데이터, Feature Module, Shared Module, Global Module 및 Dynamic Module을 설명합니다.

- [NestJS Controllers](https://docs.nestjs.com/controllers)  
  Controller의 역할과 요청 처리 구조를 설명합니다.

- [NestJS Providers](https://docs.nestjs.com/providers)  
  Provider의 개념과 의존성 주입을 통한 사용 방식을 설명합니다.

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)  
  Custom Provider, Injection Token 및 다양한 Provider 등록 방식을 설명합니다.

- [NestJS Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)  
  Dynamic Module의 구현 방식과 설정 가능한 Module 설계를 설명합니다.

- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)  
  Provider의 인스턴스 생성 및 공유 범위를 설명합니다.

- [NestJS Circular Dependency](https://docs.nestjs.com/fundamentals/circular-dependency)  
  Module 및 Provider 간 순환 의존성 문제와 해결 방식을 설명합니다.

- [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref)  
  `ModuleRef`를 통한 Provider 조회 및 동적 인스턴스 해결 방법을 설명합니다.

### GitHub Repository

- [NestJS 공식 GitHub Repository](https://github.com/nestjs/nest)  
  NestJS 프레임워크의 소스 코드와 내부 구현을 확인할 수 있습니다.

- [NestJS 공식 예제 Repository](https://github.com/nestjs/nest/tree/master/sample)  
  NestJS의 Module, Controller, Provider 등 다양한 기능의 구현 예제를 확인할 수 있습니다.