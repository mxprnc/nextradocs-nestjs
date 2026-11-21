# Guards

## 1. 개요

Guard는 클라이언트의 요청이 특정 Controller의 Route Handler를 실행할 수 있는지 판단하는 NestJS 구성 요소입니다.

NestJS에서는 `@Injectable()` 데코레이터와 `CanActivate` 인터페이스를 사용하여 Guard를 구현합니다.

Guard는 현재 요청의 사용자 정보, 인증 상태, 권한, 역할(Role) 등을 검사하고 요청의 실행 여부를 결정합니다.

대표적인 활용 사례는 다음과 같습니다.

- JWT(JSON Web Token)를 이용한 사용자 인증
- 로그인 여부 확인
- 사용자 역할(Role)에 따른 접근 제어
- 특정 API에 대한 권한(Permission) 검사
- 관리자 전용 API 접근 제한
- 사용자 또는 리소스 소유권 검사
- ACL(Access Control List) 기반 접근 제어

Guard의 핵심적인 역할은 **현재 요청이 해당 Route Handler를 실행할 수 있는지 판단하는 것**입니다.

Middleware도 요청을 차단할 수 있지만, Guard는 `ExecutionContext`를 통해 실행 대상 Controller와 Handler의 정보를 확인할 수 있다는 차이가 있습니다.

따라서 특정 API에 적용된 인증 및 인가 정책을 처리하는 데 적합합니다.

---

## 2. Request Lifecycle에서 Guard의 위치

NestJS는 HTTP 요청을 처리할 때 Middleware, Guard, Interceptor, Pipe 등의 구성 요소를 순차적으로 실행합니다.

일반적인 요청 처리 흐름은 다음과 같습니다.

```text
Client
  │
  ▼
HTTP Request
  │
  ▼
Middleware
  │
  ▼
Guards
  │
  ▼
Interceptors (Before)
  │
  ▼
Pipes
  │
  ▼
Controller
  │
  ▼
Service
  │
  ▼
Interceptors (After)
  │
  ▼
HTTP Response
  │
  ▼
Client
```

Guard는 모든 해당 Middleware가 실행된 이후, Interceptor와 Pipe가 실행되기 전에 동작합니다.

따라서 Controller의 Route Handler가 호출되기 전에 요청의 접근 권한을 검사할 수 있습니다.

### 2.1. Guard의 요청 처리 흐름

```text
HTTP Request
     │
     ▼
Middleware
     │
     ▼
Guard.canActivate()
     │
     ▼
  접근 허용?
     │
     ├── true ──────► Interceptor
     │                     │
     │                     ▼
     │                    Pipe
     │                     │
     │                     ▼
     │                 Controller
     │
     └── false ─────► ForbiddenException
                           │
                           ▼
                    Exception Filter
                           │
                           ▼
                     HTTP 403
```

Guard가 `true`를 반환하면 다음 요청 처리 단계로 진행합니다.

반대로 `false`를 반환하면 NestJS는 기본적으로 `ForbiddenException`을 발생시켜 HTTP 403 응답을 생성합니다.

Guard에서 직접 `UnauthorizedException` 또는 `ForbiddenException`과 같은 예외를 발생시키는 것도 가능합니다.

> 위 흐름은 일반적인 HTTP 요청을 기준으로 합니다. Guard가 명시적으로 다른 예외를 발생시키면 해당 예외의 종류에 따라 HTTP 응답 상태가 달라질 수 있습니다.

---

## 3. Guard의 기본 구조

NestJS Guard는 `CanActivate` 인터페이스를 구현한 클래스입니다.

### 3.1. CanActivate 인터페이스

`CanActivate` 인터페이스는 다음과 같은 구조를 가집니다.

```typescript
import { ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

export interface CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean>;
}
```

`canActivate()` 메서드는 요청의 접근 허용 여부를 결정합니다.

| 구성 요소 | 설명 |
|---|---|
| `CanActivate` | Guard가 구현해야 하는 인터페이스입니다. |
| `canActivate()` | 요청의 접근 허용 여부를 판단합니다. |
| `ExecutionContext` | 현재 실행 대상 Controller와 Handler 등의 정보를 제공합니다. |
| `boolean` | 동기 방식으로 접근 허용 여부를 반환합니다. |
| `Promise<boolean>` | 비동기 작업을 수행한 후 결과를 반환합니다. |
| `Observable<boolean>` | RxJS Observable을 통해 결과를 반환합니다. |

### 3.2. 기본 Guard 구현

다음은 모든 요청을 허용하는 가장 단순한 Guard입니다.

**auth.guard.ts**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
```

주요 구성 요소의 역할은 다음과 같습니다.

**`@Injectable()`**

NestJS Dependency Injection 시스템에서 관리할 수 있는 클래스임을 나타냅니다.

Guard 내부에서 다른 Provider를 생성자를 통해 주입받을 때 사용합니다.

**`CanActivate`**

Guard의 계약을 정의하는 인터페이스입니다.

해당 인터페이스를 구현하면 `canActivate()` 메서드를 제공해야 합니다.

**`ExecutionContext`**

현재 요청을 처리할 Controller, Handler 및 요청 객체에 접근할 수 있는 실행 컨텍스트입니다.

**`canActivate()`**

현재 요청을 허용할지 판단하는 메서드입니다.

다음과 같은 값을 반환할 수 있습니다.

| 반환값 | 동작 |
|---|---|
| `true` | 요청 처리를 계속 진행합니다. |
| `false` | 요청을 거부하고 기본적으로 HTTP 403 예외를 발생시킵니다. |
| `Promise<boolean>` | 비동기 검사 결과에 따라 요청을 허용하거나 거부합니다. |
| `Observable<boolean>` | Observable의 결과에 따라 요청을 허용하거나 거부합니다. |

---

## 4. ExecutionContext

`ExecutionContext`는 Guard가 현재 요청의 실행 환경을 확인하기 위해 사용하는 객체입니다.

`ExecutionContext`는 `ArgumentsHost`를 확장한 인터페이스로, HTTP뿐 아니라 WebSocket과 Microservices 등의 실행 환경에서도 사용할 수 있습니다.

Guard는 `ExecutionContext`를 통해 실행 대상 Handler 및 Controller를 확인할 수 있습니다.

### 4.1. 주요 메서드

| 메서드 | 설명 |
|---|---|
| `switchToHttp()` | HTTP 실행 컨텍스트에 접근합니다. |
| `switchToWs()` | WebSocket 실행 컨텍스트에 접근합니다. |
| `switchToRpc()` | RPC 실행 컨텍스트에 접근합니다. |
| `getHandler()` | 실행될 Handler의 참조를 반환합니다. |
| `getClass()` | Handler가 속한 Controller 클래스의 참조를 반환합니다. |
| `getType()` | 현재 실행 컨텍스트의 유형을 반환합니다. |

### 4.2. HTTP Request 접근

HTTP 기반 Guard에서는 `switchToHttp().getRequest()`를 사용하여 요청 객체에 접근할 수 있습니다.

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    console.log(request.method);
    console.log(request.url);
    console.log(request.headers);

    return true;
  }
}
```

위 예제에서는 현재 HTTP 요청의 Method, URL, Header 정보를 확인합니다.

`Request` 타입은 Express Adapter를 기준으로 사용했습니다.

Fastify Adapter를 사용하는 경우에는 해당 플랫폼의 요청 객체 타입과 인터페이스를 고려해야 합니다.

### 4.3. Controller 및 Handler 접근

`getClass()`와 `getHandler()`를 사용하면 현재 요청을 처리할 Controller와 Handler를 확인할 수 있습니다.

```typescript
canActivate(context: ExecutionContext): boolean {
  const controller = context.getClass();
  const handler = context.getHandler();

  console.log(controller.name);
  console.log(handler.name);

  return true;
}
```

예를 들어 다음 Controller가 있다고 가정합니다.

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return [];
  }
}
```

`GET /users` 요청에 Guard가 적용되어 있다면 다음 정보를 확인할 수 있습니다.

```text
Controller: UsersController
Handler: findAll
```

이 기능은 특정 Controller나 Handler에 설정된 메타데이터를 기반으로 접근 권한을 판단할 때 중요합니다.

`ExecutionContext`에 대한 보다 자세한 내용은 `execution-context.md` 문서에서 다룹니다.

---

## 5. Guard 등록 방법

NestJS Guard는 다음 세 가지 범위로 등록할 수 있습니다.

1. Global Guard
2. Controller-scoped Guard
3. Method-scoped Guard

### 5.1. Method-scoped Guard

특정 Route Handler에만 Guard를 적용할 수 있습니다.

**users.controller.ts**

```typescript
import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from './auth.guard';

@Controller('users')
export class UsersController {
  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return ['user1', 'user2'];
  }
}
```

`@UseGuards(AuthGuard)`는 해당 Handler를 실행하기 전에 `AuthGuard`를 실행하도록 설정합니다.

따라서 `GET /users` 요청을 처리할 때 Guard가 먼저 실행됩니다.

### 5.2. Controller-scoped Guard

Controller 클래스에 `@UseGuards()`를 적용하면 해당 Controller의 모든 Route Handler에 Guard가 적용됩니다.

```typescript
import {
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from './auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  @Get()
  findAll() {
    return ['user1', 'user2'];
  }

  @Post()
  create() {
    return { message: 'User created' };
  }
}
```

위 예제에서는 다음 두 API 모두 `AuthGuard`를 통과해야 합니다.

```text
GET  /users
POST /users
```

Controller 단위 등록은 여러 Handler에 동일한 접근 정책을 적용해야 할 때 유용합니다.

### 5.3. Global Guard

Global Guard는 애플리케이션 전체에 적용되는 Guard입니다.

`main.ts`에서 `useGlobalGuards()`를 호출하여 등록할 수 있습니다.

**main.ts**

```typescript
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AuthGuard } from './auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalGuards(new AuthGuard());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

이 방식은 모든 Controller와 Route Handler에 Guard를 적용합니다.

다만 `new AuthGuard()`로 인스턴스를 직접 생성하므로 NestJS DI Container를 통한 생성자 주입을 사용할 수 없습니다.

Dependency Injection이 필요한 Global Guard는 `APP_GUARD` 토큰을 사용하는 방식이 적합합니다.

### 5.4. APP_GUARD를 이용한 Global Guard

NestJS에서는 `APP_GUARD` 토큰을 사용하여 Guard를 전역 Provider로 등록할 수 있습니다.

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthGuard } from './auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
```

이 방식에서는 NestJS DI Container가 Guard 인스턴스를 생성하고 관리합니다.

따라서 Guard가 다른 Provider에 의존하더라도 생성자 주입을 사용할 수 있습니다.

`APP_GUARD`로 등록한 Guard는 해당 Provider를 선언한 Module에만 국한되지 않고 애플리케이션 전체에 적용됩니다.

> 일반적인 HTTP 애플리케이션에서는 Global Guard가 전체 Route Handler에 적용됩니다. 다만 HTTP와 Microservices를 함께 사용하는 Hybrid Application에서는 전역 설정의 상속 여부에 따라 적용 범위가 달라질 수 있습니다.

---

## 6. Guard 실행 순서

여러 Guard가 등록되어 있다면 다음 순서로 실행됩니다.

```text
HTTP Request
     │
     ▼
Global Guard
     │
     ▼
Controller Guard
     │
     ▼
Method Guard
     │
     ▼
Interceptor
     │
     ▼
Pipe
     │
     ▼
Controller Handler
```

동일한 범위에 여러 Guard가 등록되어 있다면 바인딩된 순서대로 실행됩니다.

### 6.1. 여러 Guard 적용

```typescript
@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  @Get()
  @UseGuards(PermissionsGuard)
  findAll() {
    return [];
  }
}
```

위 예제에서는 다음 순서로 Guard가 실행됩니다.

```text
AuthGuard
    │
    ▼
RolesGuard
    │
    ▼
PermissionsGuard
    │
    ▼
Controller Handler
```

단, 별도의 Global Guard가 등록되어 있다면 Global Guard가 먼저 실행됩니다.

### 6.2. Guard 중 하나가 요청을 거부하는 경우

각 Guard는 현재 요청을 독립적으로 검사합니다.

어느 하나의 Guard가 `false`를 반환하거나 예외를 발생시키면 후속 Guard와 Controller Handler는 실행되지 않습니다.

예를 들어 다음과 같은 상황을 가정합니다.

```text
AuthGuard
    │
    ▼
   true
    │
    ▼
RolesGuard
    │
    ▼
   false
    │
    ▼
HTTP 403 Forbidden
```

이 경우 `RolesGuard`에서 요청이 거부되므로 Controller Handler까지 요청이 전달되지 않습니다.

---

## 7. 인증(Authentication) Guard 구현

Guard는 사용자가 인증된 상태인지 확인하는 데 활용할 수 있습니다.

다음은 HTTP 요청 Header의 API Key를 검사하는 간단한 인증 예제입니다.

이 예제는 Guard의 동작 원리를 설명하기 위한 것이며, 실제 운영 환경의 인증 체계를 대체하지 않습니다.

### 7.1. API Key 기반 Guard

**api-key.guard.ts**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const apiKey = request.header('x-api-key');

    const expectedApiKey =
      this.configService.getOrThrow<string>('API_KEY');

    if (!apiKey || apiKey !== expectedApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
```

위 예제는 `@nestjs/config` 패키지의 `ConfigService`를 사용합니다.

해당 패키지가 설치되어 있고, `ConfigModule`을 통해 환경변수 `API_KEY`를 불러오도록 구성되어 있어야 합니다.

Guard에서 사용하는 `ConfigService` 역시 해당 Module의 Provider 접근 규칙에 따라 주입 가능해야 합니다.

실제 운영 환경에서는 비밀값을 안전하게 관리하고, 인증 방식에 적합한 비교 및 검증 로직을 적용해야 합니다.

### 7.2. Controller에 적용

```typescript
import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from './api-key.guard';

@Controller('users')
export class UsersController {
  @Get()
  @UseGuards(ApiKeyGuard)
  findAll() {
    return ['user1', 'user2'];
  }
}
```

### 7.3. 요청 처리 예시

정상적인 API Key가 전달된 경우:

```http
GET /users HTTP/1.1
Host: localhost:3000
x-api-key: valid-api-key
```

설정된 API Key와 일치하면 Guard가 `true`를 반환하고 Controller Handler가 실행됩니다.

반대로 API Key가 없거나 일치하지 않으면 다음과 같은 예외가 발생합니다.

```typescript
throw new UnauthorizedException('Invalid API key');
```

기본 HTTP 예외 처리 방식에서는 다음과 같은 HTTP 401 응답을 생성합니다.

```json
{
  "message": "Invalid API key",
  "error": "Unauthorized",
  "statusCode": 401
}
```

응답 형식은 Exception Filter 또는 전역 응답 처리 설정에 따라 달라질 수 있습니다.

---

## 8. 인가(Authorization) Guard 구현

인가는 인증된 사용자가 특정 기능이나 리소스에 접근할 권한을 가지고 있는지 확인하는 과정입니다.

Guard는 인증뿐 아니라 인가 정책을 처리하는 데도 사용됩니다.

대표적으로 RBAC(Role-Based Access Control)를 구현할 수 있습니다.

### 8.1. RBAC 개념

RBAC는 사용자에게 부여된 역할을 기준으로 리소스 접근을 제어하는 방식입니다.

예를 들어 다음과 같은 역할이 있다고 가정합니다.

| Role | 설명 |
|---|---|
| `admin` | 관리자 기능에 접근할 수 있습니다. |
| `user` | 일반 사용자 기능에 접근할 수 있습니다. |
| `guest` | 제한된 공개 기능에 접근할 수 있습니다. |

관리자 전용 API에서는 사용자에게 `admin` 역할이 있는지 검사할 수 있습니다.

### 8.2. Roles 데코레이터 생성

NestJS는 `@SetMetadata()`를 사용하여 Controller 또는 Handler에 사용자 정의 메타데이터를 부여할 수 있습니다.

**roles.decorator.ts**

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);
```

`@Roles()`는 Route Handler에 필요한 역할 정보를 저장하는 데 사용합니다.

예를 들어 다음과 같이 설정할 수 있습니다.

```typescript
@Roles('admin')
```

이 설정은 해당 Handler에 `admin` 역할이 필요하다는 메타데이터를 추가합니다.

단, 데코레이터 자체가 접근을 제한하는 것은 아닙니다.

실제 접근 제어는 해당 메타데이터를 읽고 검사하는 Guard가 수행합니다.

### 8.3. RolesGuard 구현

**roles.guard.ts**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { ROLES_KEY } from './roles.decorator';

interface AuthenticatedUser {
  id: number;
  roles: string[];
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if (!requiredRoles) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const hasRole = requiredRoles.some((role) =>
      user.roles.includes(role),
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

위 예제는 인증 과정에서 검증된 사용자 정보가 `request.user`에 저장되어 있다는 전제하에 작성했습니다.

`request.user`의 TypeScript 타입을 선언하는 것만으로 사용자 인증이 수행되지는 않습니다.

따라서 실제 애플리케이션에서는 인증 Guard 또는 인증 미들웨어가 사용자 정보를 검증하고 설정해야 합니다.

### 8.4. Controller에 적용

```typescript
import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  @Get('dashboard')
  @Roles('admin')
  getDashboard() {
    return {
      message: 'Admin dashboard',
    };
  }
}
```

이 예제에서 `AuthGuard`는 인증을 수행하고, `RolesGuard`는 인증된 사용자의 역할을 검사하도록 구성합니다.

`AuthGuard`는 앞서 살펴본 기본 Guard가 아니라, 인증된 사용자 정보를 실제로 검증하여 `request.user`에 설정하는 구현체여야 합니다.

요청 처리 순서는 다음과 같습니다.

```text
GET /admin/dashboard
         │
         ▼
      AuthGuard
         │
         ▼
    사용자 인증
         │
         ▼
      RolesGuard
         │
         ▼
  @Roles('admin') 확인
         │
         ▼
   사용자 Role 검사
         │
         ├── admin 보유 ──► Controller 실행
         │
         └── admin 없음 ──► HTTP 403
```

이처럼 인증과 인가를 별도의 Guard로 분리하면 역할과 책임을 명확하게 유지할 수 있습니다.

---

## 9. Reflector와 Custom Metadata

NestJS의 `Reflector`는 Controller와 Handler에 저장된 메타데이터를 읽기 위한 유틸리티 클래스입니다.

`Reflector`는 `@nestjs/core`에서 제공합니다.

Guard에서 `Reflector`를 사용하면 데코레이터를 통해 선언한 접근 정책을 읽고 적용할 수 있습니다.

### 9.1. Reflector.get()

`get()`은 지정한 대상의 메타데이터를 조회합니다.

```typescript
const roles = this.reflector.get<string[]>(
  ROLES_KEY,
  context.getHandler(),
);
```

위 코드는 현재 Handler에 설정된 `roles` 메타데이터를 조회합니다.

다만 Controller 클래스에 설정된 메타데이터까지 자동으로 검색하지는 않습니다.

### 9.2. Reflector.getAllAndOverride()

`getAllAndOverride()`는 여러 대상에서 메타데이터를 순서대로 검색하고, 처음 발견한 `undefined`가 아닌 값을 반환합니다.

```typescript
const requiredRoles = this.reflector.getAllAndOverride<string[]>(
  ROLES_KEY,
  [
    context.getHandler(),
    context.getClass(),
  ],
);
```

위 예제에서는 다음 우선순위로 메타데이터를 검색합니다.

1. Handler에 설정된 메타데이터
2. Controller에 설정된 메타데이터

예를 들어 다음과 같이 설정한 경우를 살펴보겠습니다.

```typescript
@Controller('users')
@Roles('user')
export class UsersController {
  @Get('admin')
  @Roles('admin')
  findAdmin() {
    return [];
  }
}
```

`findAdmin()` Handler에는 `admin` 역할이 설정되어 있습니다.

Controller에는 `user` 역할이 설정되어 있지만, Handler 메타데이터가 우선하므로 최종적으로 `admin` 역할을 사용합니다.

### 9.3. Reflector.getAllAndMerge()

`getAllAndMerge()`는 여러 대상에 설정된 메타데이터를 병합합니다.

```typescript
const requiredRoles = this.reflector.getAllAndMerge<string[]>(
  ROLES_KEY,
  [
    context.getClass(),
    context.getHandler(),
  ],
);
```

위 코드에서는 Controller와 Handler의 역할 메타데이터를 병합할 수 있습니다.

예를 들어 다음과 같이 설정했다면:

```typescript
@Controller('users')
@Roles('user')
export class UsersController {
  @Get('admin')
  @Roles('admin')
  findAdmin() {
    return [];
  }
}
```

병합된 메타데이터는 다음과 같습니다.

```typescript
['user', 'admin']
```

다만 메타데이터의 병합이 곧 접근 정책의 의미를 결정하는 것은 아닙니다.

예를 들어 다음 두 조건은 서로 다릅니다.

- 사용자에게 `user` 또는 `admin` 역할 중 하나가 있으면 허용합니다.
- 사용자에게 `user`와 `admin` 역할이 모두 있어야 허용합니다.

따라서 `some()` 또는 `every()` 등의 검사 방식에 따라 접근 정책이 달라진다는 점을 고려해야 합니다.

---

## 10. Public Route와 Global Guard

애플리케이션 전체에 인증 Guard를 적용하면 일반적으로 모든 Route Handler가 인증 검사를 받습니다.

그러나 로그인이나 회원가입처럼 인증되지 않은 사용자도 접근할 수 있어야 하는 API가 존재합니다.

이러한 API는 사용자 정의 `@Public()` 데코레이터를 사용하여 인증 검사 대상에서 제외할 수 있습니다.

### 10.1. Public 데코레이터 생성

**public.decorator.ts**

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () =>
  SetMetadata(IS_PUBLIC_KEY, true);
```

### 10.2. Global AuthGuard에서 메타데이터 확인

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const authorization = request.header('authorization');

    if (!authorization) {
      throw new UnauthorizedException(
        'Authorization header is required',
      );
    }

    // 실제 구현에서는 토큰 형식, 서명, 만료 시간,
    // 사용자 상태 등을 검증해야 합니다.
    throw new UnauthorizedException(
      'Token verification is not implemented',
    );
  }
}
```

위 예제는 `@Public()` 메타데이터를 확인하는 구조를 설명하기 위한 것입니다.

인증이 필요한 요청에서는 실제 토큰 검증 로직이 구현되지 않았으므로 접근을 허용하지 않습니다.

운영 환경에서는 JWT 검증 서비스 또는 인증 전략을 사용하여 토큰의 유효성을 확인해야 합니다.

### 10.3. Controller에 적용

```typescript
import {
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  @Public()
  @Post('login')
  login() {
    return {
      message: 'Login endpoint',
    };
  }

  @Get('profile')
  getProfile() {
    return {
      message: 'Protected profile',
    };
  }
}
```

위 예제에서 Global AuthGuard가 등록되어 있다면 다음과 같이 동작합니다.

| API | 인증 검사 |
|---|---|
| `POST /auth/login` | `@Public()`에 의해 인증 검사를 생략합니다. |
| `GET /auth/profile` | 인증 검사를 수행합니다. |

이 방식을 활용하면 기본적으로 인증을 요구하고, 필요한 API만 명시적으로 공개하는 구조를 구성할 수 있습니다.

단, `@Public()`는 NestJS가 모든 애플리케이션에 자동으로 제공하는 기본 인증 정책이 아닙니다.

위 예제처럼 데코레이터와 이를 해석하는 Guard가 함께 구현되어야 동작합니다.

---

## 11. Guard와 Dependency Injection

Guard는 `@Injectable()` 데코레이터를 사용하는 클래스이므로 NestJS의 Dependency Injection 기능을 활용할 수 있습니다.

따라서 인증 서비스, 권한 관리 서비스, 데이터베이스 접근 서비스 등을 생성자로 주입받을 수 있습니다.

### 11.1. 인증 서비스 주입

다음은 별도의 인증 서비스를 사용하는 예제입니다.

**auth.service.ts**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async validateToken(token: string): Promise<boolean> {
    // 토큰 검증 로직을 구현합니다.
    // 실제 검증 구현 전에는 모든 요청을 거부합니다.
    return false;
  }
}
```

**auth.guard.ts**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';

import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authorization = request.header('authorization');

    const [type, token] = authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    const isValid = await this.authService.validateToken(token);

    if (!isValid) {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }
}
```

위 예제의 `AuthService.validateToken()`은 실제 검증 로직을 구현하기 전까지 항상 `false`를 반환합니다.

따라서 인증된 요청을 허용하려면 사용하는 인증 방식에 맞게 검증 기능을 구현해야 합니다.

### 11.2. Module에 Provider 등록

```typescript
import { Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    AuthService,
    AuthGuard,
  ],
})
export class UsersModule {}
```

`AuthService`와 `AuthGuard`를 Provider로 등록하면 NestJS DI Container가 의존성을 관리할 수 있습니다.

Guard는 `@UseGuards(AuthGuard)`처럼 클래스를 전달하여 사용할 수 있습니다.

다른 Module에서 제공하는 인증 서비스를 주입하려면 해당 서비스가 `exports`를 통해 공개되어 있어야 하며, Guard가 등록된 Module에서 해당 Module을 가져와야 합니다.

---

## 12. Middleware와 Guard의 차이

Middleware와 Guard는 모두 Controller 실행 이전에 동작하지만, 설계 목적과 접근 가능한 정보가 다릅니다.

| 항목 | Middleware | Guard |
|---|---|---|
| 실행 시점 | Guard 이전 | Middleware 이후 |
| 주요 목적 | 공통 요청 전처리 | 요청 실행 권한 판단 |
| HTTP Request 접근 | 가능 | 가능 |
| ExecutionContext 접근 | 기본 API에서 지원하지 않음 | 지원 |
| Handler 메타데이터 접근 | 기본 API에서 지원하지 않음 | 지원 |
| 요청 차단 | 직접 응답 종료 등으로 가능 | `false` 반환 또는 예외 발생 |
| Dependency Injection | Class-based Middleware에서 지원 | 지원 |
| 대표 활용 사례 | 로깅, Request ID 생성 | 인증, 인가, 역할 및 권한 검사 |

### 12.1. Middleware가 적합한 경우

Middleware는 특정 Handler와 무관하게 공통적인 HTTP 요청 처리를 수행할 때 적합합니다.

예를 들어 다음과 같습니다.

- 모든 요청에 Request ID 생성
- HTTP 요청 로깅
- 공통 HTTP Header 처리
- 요청 정보의 표준화

### 12.2. Guard가 적합한 경우

Guard는 특정 Handler의 접근 정책을 검사하는 데 적합합니다.

예를 들어 다음과 같습니다.

- 관리자 전용 API 접근 제한
- 사용자 인증 여부 확인
- 특정 역할에 따른 API 접근 제한
- 메타데이터 기반 권한 검사

특히 Guard는 `ExecutionContext`를 통해 현재 실행 대상 Handler를 확인할 수 있으므로, 선언적인 접근 정책을 구현하는 데 유리합니다.

---

## 13. Guard와 Interceptor의 차이

Guard와 Interceptor는 모두 Controller 실행 이전에 동작할 수 있지만 책임이 다릅니다.

| 항목 | Guard | Interceptor |
|---|---|---|
| 실행 시점 | Interceptor 이전 | Guard 이후 |
| 주요 목적 | Handler 실행 허용 여부 판단 | Handler 실행 전후의 공통 처리 |
| 주요 메서드 | `canActivate()` | `intercept()` |
| 반환 타입 | `boolean`, `Promise<boolean>`, `Observable<boolean>` | `Observable` |
| ExecutionContext | 지원 | 지원 |
| Handler 실행 제어 | 접근 허용 또는 거부 | 실행 흐름 및 반환값 처리 |
| 대표 활용 사례 | 인증, 인가 | 응답 변환, 캐싱, 로깅 |

Guard는 요청이 Handler를 실행할 수 있는지 결정합니다.

Interceptor는 Handler 실행을 감싸는 구조로 동작하며, 실행 전후의 처리나 응답 데이터 변환 등의 기능을 수행할 수 있습니다.

따라서 접근 권한 판단은 Guard에 배치하고, 응답 데이터를 가공하거나 Handler 실행 전후의 공통 기능을 구현하는 경우에는 Interceptor를 활용하는 것이 적합합니다.

---

## 14. Guard 사용 시 주의사항

### 14.1. 인증과 인가의 구분

인증(Authentication)은 요청한 사용자가 누구인지 확인하는 과정입니다.

인가(Authorization)는 인증된 사용자가 특정 작업을 수행할 권한이 있는지 확인하는 과정입니다.

두 개념은 서로 관련되어 있지만 목적이 다릅니다.

일반적으로 인증을 먼저 수행한 뒤 인가 정책을 검사하도록 구성합니다.

### 14.2. 401과 403 응답 구분

Guard에서 요청을 거부할 때는 HTTP 상태 코드를 적절히 구분해야 합니다.

| HTTP 상태 | 의미 | 대표 상황 |
|---|---|---|
| `401 Unauthorized` | 인증에 실패했거나 유효한 인증 정보가 없습니다. | 토큰 누락, 토큰 만료, 유효하지 않은 인증 정보 |
| `403 Forbidden` | 요청이 허용되지 않습니다. | 인증된 사용자의 권한 부족 |

NestJS Guard가 `false`를 반환하면 기본적으로 `ForbiddenException`이 발생합니다.

인증 실패를 명확하게 표현하려면 `UnauthorizedException`을 직접 발생시키는 것이 적합합니다.

### 14.3. Guard 실행 순서 관리

여러 Guard를 조합하는 경우에는 실행 순서가 중요합니다.

예를 들어 `RolesGuard`가 `request.user`를 참조한다면, 그보다 먼저 실행되는 인증 Guard가 사용자 정보를 설정해야 합니다.

인증 Guard와 인가 Guard를 분리하는 경우에는 이러한 의존 관계를 고려해야 합니다.

### 14.4. 비동기 작업 최소화

Guard에서 데이터베이스 조회나 외부 API 호출을 수행할 수 있습니다.

다만 Guard는 Controller 실행 이전에 동작하므로 검사 과정이 길어질수록 요청 지연이 증가합니다.

불필요한 외부 호출을 줄이고, 인증 정보와 권한 정보의 조회 전략을 적절하게 설계해야 합니다.

### 14.5. Custom Metadata의 기본 정책

메타데이터가 존재하지 않는 경우의 처리 정책을 명확하게 정의해야 합니다.

예를 들어 다음과 같은 코드는 메타데이터가 없으면 요청을 허용합니다.

```typescript
if (!requiredRoles) {
  return true;
}
```

이 방식은 별도의 인증 Guard가 적용되어 있는 경우 역할 제한만 생략하는 용도로 사용할 수 있습니다.

그러나 모든 요청에 권한 검사를 요구하는 시스템에서는 메타데이터가 없는 Route를 자동으로 허용하는 것이 적절하지 않을 수 있습니다.

보안 요구사항에 따라 기본 허용(Allow by Default)과 기본 거부(Deny by Default) 정책을 명확하게 선택해야 합니다.

### 14.6. HTTP 외 실행 환경 고려

Guard는 HTTP뿐 아니라 WebSocket과 Microservices에서도 사용할 수 있습니다.

다만 실행 환경에 따라 요청 객체에 접근하는 방식이 달라집니다.

HTTP Guard에서 사용하는 다음 코드는 WebSocket이나 RPC 환경에 그대로 적용할 수 없습니다.

```typescript
context.switchToHttp().getRequest();
```

WebSocket 및 RPC에서는 해당 실행 환경에 맞는 Context API를 사용해야 합니다.

또한 Hybrid Application에서는 전역 Guard의 적용 범위와 설정 상속 여부를 별도로 확인해야 합니다.

---

## 15. 핵심 정리

Guard는 NestJS Request Lifecycle에서 현재 요청의 Controller Handler 실행을 허용할지 판단하는 구성 요소입니다.

핵심 특징은 다음과 같습니다.

1. **접근 제어:** 인증, 인가, 역할 및 권한 검사 등을 수행합니다.
2. **실행 위치:** Middleware 이후, Interceptor와 Pipe 이전에 실행됩니다.
3. **CanActivate:** `canActivate()` 메서드의 반환값을 통해 요청 처리 여부를 결정합니다.
4. **ExecutionContext:** 현재 Controller, Handler 및 실행 환경에 접근할 수 있습니다.
5. **적용 범위:** Global, Controller 및 Method 단위로 적용할 수 있습니다.
6. **Dependency Injection:** 다른 Provider를 주입받아 인증 및 권한 검사 기능을 구현할 수 있습니다.
7. **Custom Metadata:** `@SetMetadata()`와 `Reflector`를 활용하여 선언적인 접근 정책을 구현할 수 있습니다.
8. **예외 처리:** 접근이 거부되면 HTTP 401 또는 403 등의 예외를 발생시킬 수 있습니다.

Guard의 가장 중요한 특징은 **현재 실행될 Handler의 정보를 알고 있으며, 해당 Handler에 대한 접근 정책을 적용할 수 있다는 점**입니다.

따라서 단순한 HTTP 요청 전처리에는 Middleware를 사용하고, 특정 Controller 또는 Handler에 대한 접근 제어에는 Guard를 사용하는 것이 적합합니다.

---

## 참고 자료

- [NestJS 공식 문서 - Guards](https://docs.nestjs.com/guards)
- [NestJS 공식 문서 - Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [NestJS 공식 문서 - Execution Context](https://docs.nestjs.com/fundamentals/execution-context)
- [NestJS 공식 문서 - Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS 공식 문서 - Authorization](https://docs.nestjs.com/security/authorization)
- [NestJS 공식 문서 - Middleware](https://docs.nestjs.com/middleware)
- [NestJS 공식 문서 - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS 공식 문서 - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS 공식 문서 - Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)