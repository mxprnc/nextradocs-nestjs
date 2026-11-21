# Authorization

## 1. 개요

Authorization(인가)은 인증된 사용자 또는 시스템이 특정 리소스에 접근하거나 작업을 수행할 권한이 있는지 판단하는 과정입니다.

웹 애플리케이션에서는 사용자에게 부여된 역할(Role), 권한(Permission), 정책(Policy), 리소스 소유권 등을 기준으로 접근 가능 여부를 결정합니다.

예를 들어 일반 사용자는 자신이 작성한 게시물을 수정할 수 있지만, 다른 사용자의 게시물은 수정할 수 없도록 제한할 수 있습니다. 관리자는 별도의 정책에 따라 모든 게시물을 관리할 수 있습니다.

NestJS에서는 주로 Guard, Custom Decorator, Reflector를 조합하여 인가 기능을 구현합니다. 복잡한 권한 정책이 필요한 경우 별도의 Policy Provider 또는 CASL과 같은 외부 라이브러리를 활용할 수 있습니다.

대표적인 접근 제어 모델은 다음과 같습니다.

| 접근 제어 모델 | 설명 |
|---|---|
| RBAC (Role-Based Access Control) | 사용자에게 부여된 역할을 기준으로 접근 권한을 결정합니다. |
| Claims-based Authorization | 사용자에게 부여된 Claim 또는 Permission을 기준으로 접근을 제어합니다. |
| ABAC (Attribute-Based Access Control) | 사용자, 리소스, 작업 및 환경의 속성을 조합하여 권한을 결정합니다. |
| PBAC (Policy-Based Access Control) | 명시적으로 정의한 정책을 평가하여 접근 가능 여부를 결정합니다. |
| ACL (Access Control List) | 개별 리소스에 접근할 수 있는 사용자 또는 주체의 목록을 관리합니다. |

이 문서에서는 NestJS에서 인가 기능을 구성하는 방법과 역할 기반 및 정책 기반 접근 제어를 구현하는 방법을 설명합니다.

---

## 2. Authentication과 Authorization

Authentication과 Authorization은 보안 시스템을 구성하는 서로 다른 절차입니다.

### 2.1. Authentication

Authentication은 클라이언트가 주장하는 신원을 확인합니다.

대표적으로 다음과 같은 작업을 수행합니다.

- 사용자 계정 및 비밀번호 검증
- JWT 서명과 만료시간 검증
- Session 정보 검증
- 외부 Identity Provider의 인증 결과 확인

인증에 성공하면 애플리케이션은 요청을 수행하는 사용자를 식별할 수 있습니다.

### 2.2. Authorization

Authorization은 인증된 사용자가 특정 작업을 수행할 권한을 가지고 있는지 확인합니다.

대표적으로 다음과 같은 작업을 수행합니다.

- 관리자인지 확인
- 게시물 수정 권한 확인
- 리소스 소유권 검증
- 특정 API에 대한 접근 권한 확인
- 조직 또는 테넌트별 데이터 접근 제한

### 2.3. 비교

| 구분 | Authentication | Authorization |
|---|---|---|
| 목적 | 사용자의 신원 검증 | 사용자의 접근 권한 검증 |
| 핵심 질문 | 누구입니까? | 무엇을 할 수 있습니까? |
| 검증 정보 | Credential, JWT, Session | Role, Permission, Policy |
| 일반적인 실패 응답 | 401 Unauthorized | 403 Forbidden |
| 주요 구성 요소 | AuthService, Authentication Guard | RolesGuard, PoliciesGuard |
| 처리 순서 | 일반적으로 먼저 수행 | 일반적으로 인증 이후 수행 |

인가 정책은 공개 사용자에게도 적용할 수 있으므로 모든 인가 판단에 로그인된 사용자가 반드시 필요한 것은 아닙니다.

다만 인증된 사용자의 권한을 검사하는 경우에는 먼저 신원이 신뢰할 수 있게 확인되어야 합니다.

---

## 3. NestJS Authorization 아키텍처

NestJS에서는 Guard를 통해 Controller Handler 실행 전에 접근 권한을 검사할 수 있습니다.

기본적인 인가 구조는 다음과 같습니다.

```text
HTTP Request
    |
    v
Authentication Guard
    |
    +----> JWT 또는 Session 검증
    |
    +----> request.user 설정
    |
    v
Authorization Guard
    |
    +----> Required Role / Permission 조회
    |
    +----> 사용자 권한 확인
    |
    +----> 접근 가능 여부 판단
    |
    +---- 실패 ----> 403 Forbidden
    |
    v
Controller Handler
    |
    v
Service
    |
    v
Response
```

주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| Authentication Guard | 사용자의 신원을 검증합니다. |
| Authorization Guard | 사용자의 권한을 검증합니다. |
| Custom Decorator | Handler 또는 Controller에 필요한 권한 정보를 선언합니다. |
| Reflector | Decorator가 등록한 Metadata를 조회합니다. |
| ExecutionContext | 현재 실행 중인 Handler와 요청 정보를 제공합니다. |
| Policy Provider | 접근 제어 정책을 정의하고 평가합니다. |

인가 기능은 Controller 수준에서 일괄적으로 처리할 수도 있고, 실제 비즈니스 로직에서 리소스별로 처리할 수도 있습니다.

특히 특정 데이터의 소유권이나 현재 상태가 필요한 검사는 Service 계층에서 수행하는 것이 적절할 수 있습니다.

---

## 4. Role-Based Access Control (RBAC)

RBAC는 사용자에게 부여된 역할을 기준으로 접근 권한을 결정하는 모델입니다.

예를 들어 다음과 같은 역할을 정의할 수 있습니다.

| 역할 | 권한 |
|---|---|
| USER | 일반 리소스 조회 |
| EDITOR | 리소스 조회 및 수정 |
| ADMIN | 리소스 생성, 수정 및 삭제 |

사용자가 수행할 수 있는 작업은 해당 사용자에게 부여된 역할에 따라 달라집니다.

NestJS에서는 Custom Decorator와 Guard를 조합하여 기본적인 RBAC를 구현할 수 있습니다.

### 4.1. 디렉터리 구성

```text
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.guard.ts
│   └── roles.guard.ts
│
├── common/
│   ├── decorators/
│   │   └── roles.decorator.ts
│   └── enums/
│       └── role.enum.ts
│
└── articles/
    ├── articles.controller.ts
    └── articles.service.ts
```

위 구조는 인증과 인가를 같은 AuthModule에서 관리하는 예제입니다.

실제 프로젝트에서는 권한 관리 규모에 따라 AuthorizationModule을 독립적으로 구성할 수도 있습니다.

### 4.2. Role Enum 정의

시스템에서 사용하는 역할을 Enum으로 정의합니다.

```typescript
// src/common/enums/role.enum.ts

export enum Role {
  USER = 'user',
  EDITOR = 'editor',
  ADMIN = 'admin',
}
```

Enum을 사용하면 문자열을 여러 위치에 직접 작성하지 않고 역할을 일관되게 관리할 수 있습니다.

역할 정보는 데이터베이스 또는 외부 Identity Provider에서 관리할 수도 있습니다.

### 4.3. Roles Decorator 구현

Custom Decorator를 이용하여 Handler에 필요한 역할을 선언합니다.

```typescript
// src/common/decorators/roles.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) =>
  SetMetadata(ROLES_KEY, roles);
```

`SetMetadata()`는 Controller 또는 Handler에 Metadata를 등록하는 NestJS 기능입니다.

예를 들어 다음과 같이 사용할 수 있습니다.

```typescript
@Roles(Role.ADMIN)
```

위 코드는 해당 Handler에 `ADMIN` 역할이 필요하다는 Metadata를 등록합니다.

다만 `@Roles()` 자체는 접근 권한을 검사하지 않습니다.

실제 인가를 수행하려면 등록된 Metadata를 해석하는 Guard가 필요합니다.

---

## 5. RolesGuard 구현

`RolesGuard`는 사용자에게 부여된 역할과 Handler에서 요구하는 역할을 비교합니다.

### 5.1. RolesGuard 정의

```typescript
// src/auth/roles.guard.ts

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { Role } from '../common/enums/role.enum';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

interface AuthenticatedUser {
  id: string;
  roles: Role[];
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
    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    const hasRole = requiredRoles.some((role) =>
      user.roles?.includes(role),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        'Insufficient permissions',
      );
    }

    return true;
  }
}
```

이 예제에서는 다음 사항을 가정합니다.

- Authentication Guard가 먼저 실행됩니다.
- `request.user`에는 검증된 사용자 정보가 저장됩니다.
- 사용자 정보에는 `roles` 배열이 포함됩니다.
- `@Roles()`가 없는 Handler는 역할 검사를 통과합니다.

마지막 항목은 이 Guard의 구현 정책이며, NestJS가 모든 인가 요청에 기본적으로 허용 정책을 적용한다는 의미는 아닙니다.

운영 환경에서는 인증 및 인가 정책이 누락된 경로가 의도치 않게 공개되지 않도록 관리해야 합니다.

### 5.2. RolesGuard 동작 과정

```text
RolesGuard.canActivate()
    |
    v
Reflector.getAllAndOverride()
    |
    v
Required Roles 조회
    |
    +---- 역할 선언 없음 ----> 통과
    |
    v
request.user 조회
    |
    +---- 사용자 없음 ----> 401
    |
    v
사용자 Role 검사
    |
    +---- 권한 없음 ----> 403
    |
    v
return true
    |
    v
Controller Handler 실행
```

### 5.3. Reflector

`Reflector`는 NestJS가 제공하는 Metadata 조회 도구입니다.

```typescript
const requiredRoles =
  this.reflector.getAllAndOverride<Role[]>(
    ROLES_KEY,
    [
      context.getHandler(),
      context.getClass(),
    ],
  );
```

이 코드는 현재 Handler와 Controller에 선언된 Metadata를 조회합니다.

`getAllAndOverride()`는 지정된 대상 중 먼저 발견되는 정의된 Metadata 값을 반환합니다.

따라서 위 예제에서는 Handler에 선언된 역할이 Controller에 선언된 역할보다 우선합니다.

예를 들어 다음과 같은 Controller가 있다고 가정합니다.

```typescript
@Roles(Role.USER)
@Controller('articles')
export class ArticlesController {
  @Get()
  findAll() {
    return [];
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove() {
    return {};
  }
}
```

`findAll()`은 Controller에 선언된 `USER` 역할을 요구합니다.

`remove()`는 Handler에 선언된 `ADMIN` 역할이 Controller의 설정을 대체합니다.

Controller와 Handler에 선언된 권한을 모두 요구하려는 경우에는 `getAllAndMerge()` 등을 이용하여 다른 정책을 구현해야 합니다.

---

## 6. Controller에 RBAC 적용

`@UseGuards()`와 `@Roles()`를 조합하여 인가 기능을 적용할 수 있습니다.

### 6.1. Controller 구현

```typescript
// src/articles/articles.controller.ts

import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('articles')
@UseGuards(AuthGuard, RolesGuard)
export class ArticlesController {
  @Get()
  @Roles(Role.USER, Role.EDITOR, Role.ADMIN)
  findAll() {
    return { message: 'Article list' };
  }

  @Post()
  @Roles(Role.EDITOR, Role.ADMIN)
  create() {
    return { message: 'Article created' };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return { message: `Article ${id} deleted` };
  }
}
```

위 예제에서는 인증 Guard를 먼저 실행하고 이후 RolesGuard를 실행합니다.

`@Roles()`에 여러 역할을 전달하면 해당 역할 중 하나만 가지고 있어도 접근을 허용합니다.

예제의 Handler는 권한 검사 흐름을 설명하기 위한 것으로, 실제 데이터베이스 작업은 구현하지 않았습니다.

### 6.2. 접근 권한 결과

| API | USER | EDITOR | ADMIN |
|---|---|---|---|
| GET /articles | 허용 | 허용 | 허용 |
| POST /articles | 거부 | 허용 | 허용 |
| DELETE /articles/:id | 거부 | 거부 | 허용 |

권한이 없는 인증된 사용자가 API를 호출하면 403 Forbidden 응답을 반환합니다.

```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

### 6.3. Guard 실행 순서

```typescript
@UseGuards(AuthGuard, RolesGuard)
```

위 코드는 인증 Guard를 먼저 실행하고, 인증에 성공한 경우 역할 검사를 수행하도록 구성합니다.

Authentication Guard는 검증된 사용자 정보를 `request.user`에 등록해야 합니다.

예를 들어 앞선 `authentication.md`의 JWT 검증 결과가 다음과 같다면 다음 단계의 역할 검사를 위해 사용자 역할을 추가로 조회하거나 검증된 Claim에서 구성해야 합니다.

```typescript
interface AuthenticatedUser {
  id: string;
  email: string;
  roles: Role[];
}
```

JWT에 포함된 역할 정보는 서명이 유효하더라도 토큰 발급 이후 변경된 최신 권한을 반영하지 않을 수 있습니다.

권한 변경을 즉시 적용해야 하는 시스템에서는 서버 측 권한 조회 또는 토큰 폐기 정책을 고려해야 합니다.

---

## 7. Claims-based Authorization

Claims-based Authorization은 사용자의 역할보다 구체적인 권한 정보를 기준으로 접근 여부를 결정하는 방식입니다.

Role이 사용자의 일반적인 책임이나 직무를 표현한다면 Permission은 특정 작업의 수행 가능 여부를 표현합니다.

예를 들어 다음과 같습니다.

| Role | Permission |
|---|---|
| USER | article:read |
| EDITOR | article:read, article:create, article:update |
| ADMIN | article:read, article:create, article:update, article:delete |

권한을 역할과 분리하면 동일한 역할을 가진 사용자에게도 서로 다른 권한을 부여할 수 있습니다.

### 7.1. Permission 정의

```typescript
// src/common/enums/permission.enum.ts

export enum Permission {
  ARTICLE_READ = 'article:read',
  ARTICLE_CREATE = 'article:create',
  ARTICLE_UPDATE = 'article:update',
  ARTICLE_DELETE = 'article:delete',
}
```

### 7.2. RequirePermissions Decorator

```typescript
// src/common/decorators/require-permissions.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (
  ...permissions: Permission[]
) => SetMetadata(PERMISSIONS_KEY, permissions);
```

### 7.3. PermissionsGuard 구현

```typescript
// src/auth/permissions.guard.ts

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { Permission } from '../common/enums/permission.enum';
import { PERMISSIONS_KEY } from '../common/decorators/require-permissions.decorator';

interface PermissionUser {
  id: string;
  permissions: Permission[];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: PermissionUser;
    }>();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    const hasPermissions = requiredPermissions.every(
      (permission) =>
        user.permissions?.includes(permission),
    );

    if (!hasPermissions) {
      throw new ForbiddenException(
        'Insufficient permissions',
      );
    }

    return true;
  }
}
```

이 예제에서는 `every()`를 사용하므로 선언된 모든 Permission을 보유해야 접근할 수 있습니다.

RBAC 예제에서 사용한 `some()`과의 차이는 다음과 같습니다.

| 메서드 | 인가 조건 |
|---|---|
| some() | 요구 조건 중 하나 이상을 충족하면 허용 |
| every() | 모든 요구 조건을 충족해야 허용 |

어느 방식을 사용할지는 서비스의 권한 정책에 따라 결정해야 합니다.

### 7.4. Controller 적용

```typescript
@Controller('articles')
@UseGuards(AuthGuard, PermissionsGuard)
export class ArticlesController {
  @Get()
  @RequirePermissions(Permission.ARTICLE_READ)
  findAll() {
    return [];
  }

  @Post()
  @RequirePermissions(Permission.ARTICLE_CREATE)
  create() {
    return {};
  }
}
```

Claims-based Authorization은 Role의 개수가 증가하거나 권한 조합이 복잡해지는 환경에서 유용합니다.

다만 단순한 Permission 검사만으로는 특정 리소스의 소유권이나 상태까지 판단하기 어렵습니다.

이러한 경우에는 리소스 속성을 이용하는 정책 기반 인가가 필요합니다.

---

## 8. Policy-Based Authorization

Policy-Based Authorization은 사용자, 리소스 및 요청 상황을 조합하여 접근 권한을 결정합니다.

예를 들어 다음과 같은 정책을 정의할 수 있습니다.

- 관리자는 모든 게시물을 수정할 수 있습니다.
- 일반 사용자는 자신이 작성한 게시물만 수정할 수 있습니다.
- 게시된 문서는 삭제할 수 없습니다.
- 특정 조직에 소속된 사용자만 해당 조직의 데이터를 조회할 수 있습니다.

이처럼 단순한 Role이나 Permission 검사로 표현하기 어려운 조건을 정책으로 정의할 수 있습니다.

### 8.1. 정책 구성 요소

| 구성 요소 | 설명 |
|---|---|
| Subject | 접근을 요청하는 사용자 또는 시스템 |
| Resource | 접근 대상 리소스 |
| Action | 수행하려는 작업 |
| Environment | 요청 시간, 네트워크 등 환경 정보 |
| Policy | 접근을 허용하거나 거부하는 규칙 |

### 8.2. 정책 평가 흐름

```text
Authenticated User
        |
        v
Authorization Policy
        |
        +---- Subject 확인
        |
        +---- Resource 확인
        |
        +---- Action 확인
        |
        +---- Policy 평가
        |
        v
Allow / Deny
```

정책은 Guard에서 평가할 수도 있고 Service 계층에서 평가할 수도 있습니다.

리소스를 데이터베이스에서 조회해야 하는 경우에는 Service 계층에서 실제 리소스 정보를 확보한 뒤 정책을 검사하는 방식이 유용합니다.

---

## 9. CASL 기반 Authorization

CASL은 JavaScript 및 TypeScript 애플리케이션에서 권한 정책을 정의하고 평가할 수 있도록 지원하는 외부 라이브러리입니다.

NestJS의 기본 기능은 아니지만, 다양한 권한 조건을 표현하는 데 활용할 수 있습니다.

CASL에서는 사용자가 특정 Action을 특정 Subject에 대해 수행할 수 있는지 검사합니다.

### 9.1. 패키지 설치

```bash
npm install @casl/ability
```

### 9.2. Action 정의

```typescript
// src/casl/action.enum.ts

export enum Action {
  MANAGE = 'manage',
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}
```

CASL에서 `manage`는 모든 Action을 나타내는 특수한 값입니다.

### 9.3. 리소스 정의

```typescript
// src/articles/article.entity.ts

export class Article {
  id: number;
  authorId: number;
  title: string;
  isPublished: boolean;
}
```

### 9.4. 사용자 정의

```typescript
// src/users/user.entity.ts

export class User {
  id: number;
  isAdmin: boolean;
}
```

### 9.5. CaslAbilityFactory 구현

```typescript
// src/casl/casl-ability.factory.ts

import { Injectable } from '@nestjs/common';

import {
  AbilityBuilder,
  createMongoAbility,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
} from '@casl/ability';

import { Action } from './action.enum';
import { Article } from '../articles/article.entity';
import { User } from '../users/user.entity';

type Subjects =
  | InferSubjects<typeof Article>
  | 'all';

export type AppAbility =
  MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User): AppAbility {
    const { can, cannot, build } =
      new AbilityBuilder<AppAbility>(
        createMongoAbility,
      );

    if (user.isAdmin) {
      can(Action.MANAGE, 'all');
    } else {
      can(Action.READ, Article);

      can(Action.UPDATE, Article, {
        authorId: user.id,
      });
    }

    cannot(Action.DELETE, Article, {
      isPublished: true,
    });

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
```

위 예제에서 다음 정책을 정의합니다.

- 관리자는 모든 리소스를 관리할 수 있습니다.
- 일반 사용자는 게시물을 조회할 수 있습니다.
- 일반 사용자는 자신의 게시물만 수정할 수 있습니다.
- 이미 게시된 게시물은 관리자에게도 삭제를 허용하지 않습니다.

`cannot()`은 명시적인 거부 규칙을 정의할 때 사용합니다.

CASL은 규칙의 선언 순서에 따라 적용되는 규칙이 달라질 수 있으므로 정책을 정의할 때 허용 및 거부 규칙의 우선순위를 고려해야 합니다.

`MongoAbility`는 MongoDB를 사용해야만 동작하는 기능이 아닙니다. MongoDB와 유사한 조건 문법을 사용하여 일반 객체의 속성을 검사할 수도 있습니다.

### 9.6. 권한 검사

```typescript
const ability =
  caslAbilityFactory.createForUser(user);

const canRead =
  ability.can(Action.READ, Article);

const canUpdate =
  ability.can(Action.UPDATE, article);
```

클래스를 전달하면 해당 리소스 유형에 대한 권한을 검사합니다.

실제 객체를 전달하면 객체의 속성까지 고려하여 조건을 평가할 수 있습니다.

예를 들어 다음과 같습니다.

```typescript
const user = {
  id: 1,
  isAdmin: false,
};

const article = Object.assign(new Article(), {
  id: 100,
  authorId: 1,
  title: 'NestJS Authorization',
  isPublished: false,
});

const ability =
  caslAbilityFactory.createForUser(user);

ability.can(Action.UPDATE, article); // true

article.authorId = 2;

ability.can(Action.UPDATE, article); // false
```

객체의 `authorId`가 현재 사용자와 일치하는 경우에만 수정 권한을 부여합니다.

---

## 10. PoliciesGuard 구현

복잡한 인가 정책을 Controller에서 선언적으로 사용할 수 있도록 PoliciesGuard를 구현할 수 있습니다.

### 10.1. PolicyHandler 정의

```typescript
// src/auth/policy-handler.interface.ts

import { AppAbility } from '../casl/casl-ability.factory';

export interface IPolicyHandler {
  handle(ability: AppAbility): boolean;
}

export type PolicyHandlerCallback = (
  ability: AppAbility,
) => boolean;

export type PolicyHandler =
  | IPolicyHandler
  | PolicyHandlerCallback;
```

PolicyHandler는 클래스 기반 객체 또는 함수 형태로 정의할 수 있습니다.

### 10.2. CheckPolicies Decorator

```typescript
// src/auth/check-policies.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { PolicyHandler } from './policy-handler.interface';

export const CHECK_POLICIES_KEY = 'check_policy';

export const CheckPolicies = (
  ...handlers: PolicyHandler[]
) => SetMetadata(CHECK_POLICIES_KEY, handlers);
```

### 10.3. PoliciesGuard 정의

```typescript
// src/auth/policies.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import {
  CaslAbilityFactory,
  AppAbility,
} from '../casl/casl-ability.factory';

import {
  PolicyHandler,
} from './policy-handler.interface';

import {
  CHECK_POLICIES_KEY,
} from './check-policies.decorator';

import { User } from '../users/user.entity';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handlers =
      this.reflector.getAllAndOverride<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!handlers || handlers.length === 0) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{
      user?: User;
    }>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    const ability =
      this.caslAbilityFactory.createForUser(
        request.user,
      );

    return handlers.every((handler) =>
      this.executePolicy(handler, ability),
    );
  }

  private executePolicy(
    handler: PolicyHandler,
    ability: AppAbility,
  ): boolean {
    if (typeof handler === 'function') {
      return handler(ability);
    }

    return handler.handle(ability);
  }
}
```

위 예제는 Policy가 선언되지 않은 Handler에 대해 기본적으로 접근을 거부하도록 구현했습니다.

이는 실무에서 권장되는 Deny by Default 원칙을 적용한 것입니다.

단, 모든 Controller에 이 Guard가 자동으로 적용되는 것은 아닙니다. 실제 보호 범위는 Guard의 등록 위치에 따라 결정됩니다.

### 10.4. Controller 적용

```typescript
@Controller('articles')
@UseGuards(AuthGuard, PoliciesGuard)
export class ArticlesController {
  @Get()
  @CheckPolicies(
    (ability: AppAbility) =>
      ability.can(Action.READ, Article),
  )
  findAll() {
    return [];
  }
}
```

위 예제는 게시물 조회에 대한 정책을 Handler에 선언합니다.

다만 특정 게시물의 작성자와 현재 사용자를 비교하는 검사라면 게시물 데이터를 먼저 조회해야 합니다.

이러한 경우에는 Guard만으로 처리하기보다 Service 계층의 정책 검사를 함께 사용하는 것이 좋습니다.

---

## 11. 리소스 소유권 기반 Authorization

리소스 소유권 검사는 객체 단위 접근 제어(Object-Level Authorization)의 대표적인 사례입니다.

예를 들어 사용자가 다음 API를 호출한다고 가정합니다.

```http
PATCH /articles/100
Authorization: Bearer <access_token>
```

사용자가 유효한 JWT를 가지고 있고 게시물 수정 Permission을 보유하고 있더라도, 해당 게시물이 다른 사용자의 소유라면 수정할 수 없어야 합니다.

### 11.1. Service에서 소유권 검사

```typescript
// src/articles/articles.service.ts

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ArticlesRepository } from './articles.repository';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
  ) {}

  async update(
    articleId: number,
    userId: number,
    title: string,
  ) {
    const article =
      await this.articlesRepository.findById(articleId);

    if (!article) {
      throw new NotFoundException();
    }

    if (article.authorId !== userId) {
      throw new ForbiddenException(
        'You cannot update this article',
      );
    }

    return this.articlesRepository.update(
      articleId,
      { title },
    );
  }
}
```

`ArticlesRepository`는 예제의 저장소 추상화이며 실제 구현이 필요합니다.

위 코드는 소유권 검사 과정을 설명하기 위한 기본 예제입니다.

실제 서비스에서는 데이터 조회와 수정 사이에 소유권이나 상태가 변경되는 경쟁 조건(Race Condition)도 고려해야 합니다.

필요한 경우 다음과 같이 데이터베이스의 수정 조건에 소유자 식별자를 포함할 수 있습니다.

```sql
UPDATE articles
SET title = ?
WHERE id = ?
  AND author_id = ?;
```

이후 영향을 받은 행의 개수를 확인하여 수정 성공 여부를 판단합니다.

### 11.2. Guard와 Service의 역할 구분

| 검사 대상 | 권장 위치 |
|---|---|
| 인증 여부 | Authentication Guard |
| 전역 Role 검사 | Authorization Guard |
| API Permission 검사 | Authorization Guard |
| 특정 게시물 소유권 | Service 또는 Resource Policy |
| 데이터 상태에 따른 수정 제한 | Service 또는 Resource Policy |
| 조직 및 테넌트별 데이터 접근 | Service / Repository / Policy |

Guard와 Service는 서로 대체 관계가 아닙니다.

Guard는 요청 진입점의 공통 권한 검사를 담당하고, Service는 실제 리소스와 비즈니스 규칙을 고려한 세부 인가를 담당할 수 있습니다.

---

## 12. NestJS 공식 Authorization 패키지

NestJS의 최신 공식 Authorization 문서에서는 `@nestjs/authorization` 패키지를 이용한 정책 기반 인가 방식도 제공합니다.

이 방식은 앞서 직접 구현한 `RolesGuard`, `PermissionsGuard`, `PoliciesGuard`와 구분됩니다.

`@nestjs/authorization`은 Policy를 NestJS Provider로 관리하고, 선언된 정책을 기반으로 권한을 검사하도록 구성합니다.

### 12.1. 주요 구성 요소

| 구성 요소 | 역할 |
|---|---|
| AuthorizationModule | Authorization 기능을 애플리케이션에 등록합니다. |
| Policy | 특정 작업의 접근 가능 여부를 평가하는 Provider입니다. |
| @Can() | Handler 또는 Controller에서 필요한 Policy 검사를 선언합니다. |
| @Can.Anyone() | 별도의 권한 검사 없이 접근을 허용하도록 선언합니다. |
| Authorization Guard | 등록된 Policy를 실행하고 접근 여부를 결정합니다. |
| AuthorizationEvents | 인가 거부 이벤트를 감시하는 데 활용할 수 있습니다. |

공식 패키지의 Policy는 일반 Provider이므로 다른 Service를 의존성 주입받아 권한을 평가할 수 있습니다.

또한 Policy를 선언하지 않은 Handler에 대해 기본적으로 접근을 거부하는 동작을 제공합니다.

### 12.2. 기존 Guard 구현과의 차이

| 항목 | 직접 구현한 Guard | @nestjs/authorization |
|---|---|---|
| 권한 규칙 | Decorator와 Guard에서 직접 구성 | Policy Provider 중심 |
| 권한 평가 | 직접 구현한 검증 로직 | 패키지의 Policy 평가 구조 |
| DI 지원 | Guard 및 별도 Provider에서 지원 | Policy Provider에서 지원 |
| 기본 거부 정책 | 직접 구현 필요 | 정책 미선언 경로 기본 거부 |
| 확장 방식 | 사용자 정의 코드 | 공식 Policy API |
| 적합한 용도 | 동작 원리 학습 및 특화된 인가 | 선언적이고 통합된 정책 관리 |

최신 패키지는 기존 NestJS 버전에서 제공하던 RBAC 및 CASL 기반 설명과 API 구성이 다를 수 있습니다.

따라서 `@nestjs/authorization`을 실제 프로젝트에 도입할 때는 사용 중인 NestJS 및 패키지 버전의 호환성을 확인해야 합니다.

본 문서의 주요 코드 예제는 NestJS의 Guard, Decorator, Reflector를 이용한 직접 구현 방식을 기준으로 작성했습니다.

---

## 13. Global Authorization Guard

인가 정책을 애플리케이션 전반에 적용하려면 Global Guard를 등록할 수 있습니다.

### 13.1. APP_GUARD 등록

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { RolesGuard } from './roles.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule {}
```

이렇게 등록된 RolesGuard는 기본적으로 전체 HTTP Controller에 적용됩니다.

다만 5절의 RolesGuard는 `@Roles()`가 선언되지 않은 Handler의 역할 검사를 통과시키므로, 전역 등록만으로 모든 API가 보호되는 것은 아닙니다.

전체 API를 보호하려면 Authentication Guard와 Authorization Guard의 기본 허용 및 거부 정책을 함께 설계해야 합니다.

### 13.2. Authentication Guard와 함께 등록

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: AuthGuard,
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },
]
```

두 Guard가 동일한 전역 등록 범위에 있다면 등록 순서에 따라 인증과 역할 검사를 순차적으로 수행하도록 구성할 수 있습니다.

전역 Guard와 Controller 또는 Handler 수준의 Guard가 혼합되어 있다면 NestJS의 Guard 실행 순서도 함께 고려해야 합니다.

### 13.3. Public API 예외

로그인, 회원가입, 공개 게시물 조회와 같은 API는 별도의 공개 정책이 필요할 수 있습니다.

Authentication Guard에서 `@Public()` Metadata를 처리하더라도 Authorization Guard가 동일한 예외를 자동으로 인식하는 것은 아닙니다.

따라서 공개 API에 대한 처리 정책은 인증 및 인가 계층 전체에서 일관되게 정의해야 합니다.

---

## 14. Authorization 보안 설계 원칙

인가 시스템을 설계할 때는 단순히 Role을 비교하는 것뿐 아니라 접근 제어 정책의 일관성과 누락 가능성을 고려해야 합니다.

### 14.1. Deny by Default

명시적으로 허용되지 않은 작업은 기본적으로 거부해야 합니다.

새로운 API 또는 리소스가 추가되었을 때 권한 검사 없이 노출되는 상황을 방지하기 위한 원칙입니다.

```text
Policy Defined?
    |
    +---- No ----> Deny
    |
    v
Evaluate Policy
    |
    +---- Fail ----> Deny
    |
    v
Allow
```

### 14.2. Principle of Least Privilege

사용자에게 업무 수행에 필요한 최소한의 권한만 부여해야 합니다.

예를 들어 게시물 작성만 담당하는 사용자가 모든 게시물을 삭제할 권한까지 가질 필요는 없습니다.

권한을 세분화하면 계정 탈취 또는 애플리케이션 취약점으로 인한 피해 범위를 제한할 수 있습니다.

### 14.3. 서버 측 권한 검증

프론트엔드에서 관리자 메뉴를 숨기거나 버튼을 비활성화하는 것은 보안 검사를 대체하지 못합니다.

클라이언트는 HTTP 요청을 직접 생성하거나 수정할 수 있으므로 서버에서 권한을 검증해야 합니다.

```text
Frontend UI Permission Check
             |
             v
        HTTP Request
             |
             v
Backend Authorization Check
             |
             v
        Resource Access
```

프론트엔드 권한 검사는 사용자 경험을 개선하기 위한 보조 수단이며, 최종 권한 결정은 신뢰할 수 있는 서버 측에서 이루어져야 합니다.

### 14.4. Object-Level Authorization

사용자가 특정 API를 호출할 권한이 있더라도 해당 API가 다루는 모든 객체에 접근할 수 있는 것은 아닙니다.

예를 들어 다음과 같은 요청을 고려할 수 있습니다.

```http
GET /orders/100
GET /orders/101
```

두 주문이 서로 다른 사용자의 소유라면 요청한 사용자가 해당 주문을 조회할 권한이 있는지 각각 검사해야 합니다.

리소스 식별자를 변경하여 다른 사용자의 데이터에 접근하는 취약점을 방지하려면 객체 단위 권한 검사가 필요합니다.

### 14.5. Tenant Isolation

Multi-Tenant 환경에서는 서로 다른 테넌트의 데이터가 혼합되거나 노출되지 않도록 제한해야 합니다.

예를 들어 다음과 같은 조건을 사용할 수 있습니다.

```sql
SELECT *
FROM orders
WHERE id = ?
  AND tenant_id = ?;
```

이때 `tenant_id`는 클라이언트가 임의로 지정한 값을 그대로 신뢰하지 않고, 검증된 인증 및 테넌트 컨텍스트에서 결정해야 합니다.

### 14.6. 권한 변경 반영

JWT에 Role이나 Permission을 포함하는 경우 토큰이 발급된 이후 권한이 변경되어도 기존 토큰에는 이전 권한 정보가 남을 수 있습니다.

따라서 보안 요구사항에 따라 다음 방법을 고려해야 합니다.

- 짧은 Access Token 만료시간
- 토큰 폐기 및 재발급
- 서버 측 Permission 조회
- 권한 버전 관리
- 권한 캐시의 무효화 정책

### 14.7. 감사 로그

중요한 권한 거부 및 관리자 작업은 감사 로그를 통해 추적할 수 있어야 합니다.

대표적인 기록 항목은 다음과 같습니다.

- 사용자 식별자
- 요청한 리소스
- 수행하려는 작업
- 접근 허용 또는 거부 결과
- 요청 시각
- 관련 정책 식별자

다만 토큰, 비밀번호, 불필요한 개인정보가 감사 로그에 포함되지 않도록 주의해야 합니다.

---

## 15. Authorization 테스트

인가 로직은 정상적인 접근뿐 아니라 권한이 없는 사용자의 요청이 적절하게 차단되는지도 검증해야 합니다.

### 15.1. 테스트 시나리오

| 시나리오 | 기대 결과 |
|---|---|
| 관리자 권한으로 관리자 API 호출 | 200 또는 정상 처리 응답 |
| 일반 사용자로 관리자 API 호출 | 403 Forbidden |
| 인증되지 않은 사용자 요청 | 401 Unauthorized |
| 필요한 Permission이 없는 사용자 요청 | 403 Forbidden |
| 다른 사용자의 리소스 수정 요청 | 403 Forbidden 또는 정책에 따른 404 |
| 접근 정책이 선언되지 않은 보호 경로 | 기본 거부 |
| 다른 테넌트의 데이터 접근 | 접근 거부 |

리소스 존재 여부를 노출하지 않기 위해 일부 API에서는 403 대신 404를 반환하는 정책을 선택할 수 있습니다.

### 15.2. RolesGuard 단위 테스트

```typescript
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';
import { Role } from '../common/enums/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('ADMIN 역할이 있으면 접근을 허용합니다.', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);

    const context = {
      getHandler: () => jest.fn(),
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: '1',
            roles: [Role.ADMIN],
          },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
```

이 테스트는 RolesGuard가 요구 역할과 사용자 역할을 비교하는 핵심 동작을 검증합니다.

실제 프로젝트에서는 권한 부족, 인증 정보 누락, Metadata 미설정 등의 시나리오도 추가해야 합니다.

특히 E2E 테스트에서는 실제 Guard 등록과 JWT 인증 흐름을 포함하여 권한 검사가 우회되지 않는지 확인하는 것이 중요합니다.

---

## 16. Authorization과 Request Lifecycle

NestJS에서 Guard는 Middleware 이후, Interceptor 및 Pipe 이전에 실행됩니다.

```text
HTTP Request
    |
    v
Middleware
    |
    v
Authentication Guard
    |
    v
Authorization Guard
    |
    v
Interceptor (Before)
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
    +----> Resource Authorization
    |
    v
Interceptor (After)
    |
    v
HTTP Response
```

위 그림은 인증 Guard가 먼저 등록되고 이후 인가 Guard가 실행되도록 구성한 예시입니다.

실제 Request Lifecycle은 Guard의 등록 범위와 실행 환경에 따라 달라질 수 있습니다.

또한 Guard 수준에서 권한 검사를 통과했더라도 Service에서 추가적인 리소스 단위 검사가 수행될 수 있습니다.

### 관련 문서

- `01-fundamentals/providers.md`: Provider와 DI 컨테이너
- `01-fundamentals/dependency-injection.md`: 의존성 주입
- `02-request-lifecycle/guards.md`: Guard의 실행 구조
- `02-request-lifecycle/execution-context.md`: ExecutionContext
- `04-security/authentication.md`: 사용자 인증
- `04-security/encryption-and-hashing.md`: 암호화 및 해싱
- `06-testing/unit-testing.md`: 단위 테스트
- `06-testing/e2e-testing.md`: E2E 테스트
- `07-architecture/layered-architecture.md`: 계층형 아키텍처

---

## 17. 정리

Authorization은 인증된 사용자가 특정 리소스에 접근하거나 작업을 수행할 권한이 있는지 판단하는 보안 기능입니다.

NestJS에서는 Guard, Custom Decorator, Reflector 및 Provider를 조합하여 다양한 인가 구조를 구현할 수 있습니다.

핵심 사항은 다음과 같습니다.

1. **Authentication**은 사용자의 신원을 검증하고 Authorization은 사용자의 접근 권한을 검증합니다.
2. **RBAC**는 사용자에게 부여된 Role을 기준으로 권한을 판단합니다.
3. **Claims-based Authorization**은 구체적인 Permission을 기준으로 접근을 제어합니다.
4. **Policy-Based Authorization**은 사용자, 리소스 및 작업 조건을 조합하여 접근 여부를 결정합니다.
5. **RolesGuard와 PermissionsGuard**는 Controller Handler 실행 전에 권한을 검사할 수 있습니다.
6. **Reflector**는 Custom Decorator에 등록된 Metadata를 조회합니다.
7. **CASL**은 복잡한 리소스 및 속성 기반 권한 정책을 구현하는 데 활용할 수 있습니다.
8. **@nestjs/authorization**은 Policy Provider 중심의 공식 인가 구조를 제공합니다.
9. **리소스 소유권과 테넌트별 접근 제어**는 Controller 수준의 권한 검사 외에도 Service 및 데이터 접근 계층에서 검증해야 합니다.
10. **Deny by Default와 Least Privilege**는 안전한 인가 시스템을 구성하기 위한 기본 원칙입니다.

인가 시스템은 단순히 관리자와 일반 사용자를 구분하는 기능에 그치지 않습니다.

실제 애플리케이션에서는 API 수준의 접근 권한, 개별 리소스의 소유권, 데이터 상태, 조직별 접근 범위 및 권한 변경 정책을 함께 고려해야 합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - Authorization](https://docs.nestjs.com/security/authorization)
- [NestJS - Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS - Guards](https://docs.nestjs.com/guards)
- [NestJS - Execution Context](https://docs.nestjs.com/fundamentals/execution-context)
- [NestJS - Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [NestJS - Providers](https://docs.nestjs.com/providers)
- [NestJS - Testing](https://docs.nestjs.com/fundamentals/testing)

### CASL 및 접근 제어

- [CASL 공식 사이트](https://casl.js.org/)
- [CASL GitHub Repository](https://github.com/stalniy/casl)
- [NIST - Role-Based Access Control](https://csrc.nist.gov/projects/role-based-access-control)
- [NIST SP 800-162 - Guide to Attribute Based Access Control](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)

### OWASP 보안 가이드

- [OWASP - Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP - Authorization Patterns Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Patterns_Cheat_Sheet.html)
- [OWASP - Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [OWASP - REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP - Access Control](https://top10proactive.owasp.org/the-top-10/c1-accesscontrol/)