# Serialization

## 1. 개요

Serialization은 애플리케이션 내부의 객체를 클라이언트에 전달할 수 있는 형태로 변환하는 과정입니다.

NestJS에서는 Controller가 반환한 객체를 HTTP 응답으로 전송하기 전에 특정 속성을 제외하거나, 새로운 속성을 추가하거나, 데이터의 표현 형식을 변경하는 데 Serialization 기능을 사용할 수 있습니다.

예를 들어 사용자 정보를 조회하는 API에서 데이터베이스에는 비밀번호와 내부 관리 정보가 포함되어 있더라도 클라이언트에는 공개 가능한 데이터만 전달해야 합니다.

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Kim",
  "password": "hashed-password",
  "internalCode": "ADMIN-001"
}
```

이러한 객체를 그대로 반환하면 불필요한 내부 정보가 노출될 수 있습니다.

Serialization을 적용하면 다음과 같이 응답 데이터를 구성할 수 있습니다.

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Kim"
}
```

NestJS는 응답 데이터의 직렬화를 위해 두 가지 주요 Interceptor를 제공합니다.

- `ClassSerializerInterceptor`: `class-transformer`를 이용한 클래스 및 Decorator 기반 직렬화
- `StandardSchemaSerializerInterceptor`: Zod 등의 Standard Schema 기반 응답 검증 및 직렬화

이 문서에서는 `ClassSerializerInterceptor`를 중심으로 설명하고, Standard Schema 기반 직렬화도 함께 다룹니다.

## 2. Serialization이 필요한 이유

### 2.1. 민감한 데이터 노출 방지

데이터베이스의 Entity에는 클라이언트에 노출해서는 안 되는 속성이 포함될 수 있습니다.

대표적으로 다음과 같은 데이터가 있습니다.

- 비밀번호 해시
- 인증 토큰
- 내부 관리용 식별자
- 비공개 사용자 정보
- 내부 시스템 상태값

Serialization을 활용하면 응답 객체에서 이러한 속성을 제외할 수 있습니다.

다만 Serialization은 인증 및 인가를 대체하는 보안 기능이 아닙니다. 사용자가 특정 데이터에 접근할 권한이 있는지는 별도로 검증해야 합니다.

### 2.2. 응답 데이터 구조 통일

여러 Controller가 동일한 도메인 객체를 반환할 때 서로 다른 응답 형식을 사용하면 API의 일관성이 떨어질 수 있습니다.

응답 DTO와 Serialization 규칙을 정의하면 동일한 데이터에 대해 일관된 응답 구조를 제공할 수 있습니다.

예를 들어 내부 속성인 `firstName`, `lastName`을 결합하여 `fullName`으로 반환할 수 있습니다.

### 2.3. Controller의 책임 분리

Serialization을 사용하지 않으면 Controller에서 직접 응답 데이터를 변환해야 할 수 있습니다.

```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  const user = await this.usersService.findOne(id);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
```

이러한 코드가 여러 Handler에서 반복되면 응답 형식 변경 시 여러 위치를 수정해야 합니다.

Serialization을 사용하면 응답 데이터의 변환 규칙을 별도 클래스나 스키마에 정의할 수 있습니다.

이를 통해 Controller는 요청을 처리하고 결과를 반환하는 역할에 집중할 수 있습니다.

## 3. Serialization의 주요 구성 요소

| 구성 요소 | 역할 |
|---|---|
| `ClassSerializerInterceptor` | 클래스 기반 응답 데이터 직렬화를 수행합니다. |
| `class-transformer` | 객체와 클래스 인스턴스 간의 변환 기능을 제공합니다. |
| `@Exclude()` | 직렬화 대상에서 특정 속성을 제외합니다. |
| `@Expose()` | 속성을 노출하거나 새로운 표현을 정의합니다. |
| `@Transform()` | 사용자 정의 데이터 변환을 수행합니다. |
| `@Type()` | 중첩 객체 등의 변환 대상 타입을 지정합니다. |
| `@SerializeOptions()` | Handler 또는 Controller 단위의 직렬화 옵션을 지정합니다. |
| `StandardSchemaSerializerInterceptor` | 스키마를 기준으로 응답 데이터의 검증과 변환을 수행합니다. |

### 3.1. Serialization과 Deserialization

두 개념은 데이터 변환의 방향에 따라 구분됩니다.

| 구분 | Serialization | Deserialization |
|---|---|---|
| 변환 방향 | 객체 → 전송 가능한 표현 | 전송된 표현 → 객체 |
| 주요 목적 | 응답 데이터 구성 | 입력 데이터 복원 |
| NestJS 활용 | 응답 직렬화 | DTO 변환 및 입력 검증 |
| 대표 함수 | `instanceToPlain()` | `plainToInstance()` |

예를 들어 다음과 같은 과정을 생각할 수 있습니다.

```text
HTTP Request
     |
     v
JSON Request Body
     |
     v
Deserialization / Transformation
     |
     v
DTO Instance
     |
     v
ValidationPipe
     |
     v
Controller
     |
     v
Service
     |
     v
Response Object
     |
     v
ClassSerializerInterceptor
     |
     v
Plain JavaScript Object
     |
     v
HTTP Adapter
     |
     v
JSON Response
```

위 흐름은 일반적인 HTTP 요청과 응답 처리를 단순화한 예시입니다.

실제 NestJS에서는 HTTP Adapter가 객체를 JSON 응답으로 인코딩하는 과정과 `ClassSerializerInterceptor`의 객체 변환 과정이 구분됩니다.

`ClassSerializerInterceptor`는 기본적으로 `instanceToPlain()`을 사용하여 응답 객체의 직렬화 규칙을 적용합니다.

JSON 문자열 자체를 생성하는 것은 일반적으로 이후 HTTP 응답 처리 과정에서 이루어집니다.

## 4. Serialization 환경 구성

### 4.1. 패키지 설치

Decorator 기반 Serialization을 사용하려면 `class-transformer` 패키지가 필요합니다.

```bash
npm install class-transformer
```

`ClassSerializerInterceptor`는 `@nestjs/common`에서 제공합니다.

```typescript
import {
  ClassSerializerInterceptor,
} from '@nestjs/common';
```

일반적인 NestJS 프로젝트에서는 `@nestjs/common`이 이미 설치되어 있습니다.

### 4.2. TypeScript 설정

Legacy Decorator 기반 변환 기능을 사용하는 경우 다음 TypeScript 설정을 확인합니다.

`tsconfig.json`

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true
  }
}
```

NestJS CLI로 생성한 프로젝트에는 관련 옵션이 기본적으로 포함되어 있을 수 있습니다.

### 4.3. 기본 프로젝트 구조

다음과 같은 사용자 조회 API를 가정합니다.

```text
src/
├── users/
│   ├── dto/
│   │   └── user-response.dto.ts
│   ├── entities/
│   │   └── user.entity.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── app.module.ts
└── main.ts
```

실제 프로젝트에서는 Entity와 Response DTO의 역할을 분리하여 사용하는 것이 좋습니다.

## 5. ClassSerializerInterceptor

`ClassSerializerInterceptor`는 Controller Handler가 반환한 데이터를 가로채어 클래스에 정의된 직렬화 규칙을 적용하는 Interceptor입니다.

내부적으로 `class-transformer`의 `instanceToPlain()`을 사용합니다.

### 5.1. Entity 클래스 정의

`users/entities/user.entity.ts`

```typescript
import { Exclude } from 'class-transformer';

export class UserEntity {
  id!: number;
  email!: string;
  name!: string;

  @Exclude()
  password!: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
```

`@Exclude()`는 해당 속성이 직렬화 결과에 포함되지 않도록 지정합니다.

### 5.2. Controller에 Interceptor 적용

`users.controller.ts`

```typescript
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';

import { UserEntity } from './entities/user.entity';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  @Get('example')
  findExample(): UserEntity {
    return new UserEntity({
      id: 1,
      email: 'user@example.com',
      name: 'Kim',
      password: 'hashed-password',
    });
  }
}
```

요청:

```http
GET /users/example
```

응답:

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Kim"
}
```

`password` 속성은 `@Exclude()`에 의해 응답에서 제거됩니다.

### 5.3. 동작 원리

`ClassSerializerInterceptor`의 처리 흐름은 다음과 같습니다.

```text
Controller Handler
       |
       v
UserEntity Instance
       |
       v
ClassSerializerInterceptor
       |
       v
instanceToPlain()
       |
       +-- @Exclude()
       |
       +-- @Expose()
       |
       +-- @Transform()
       |
       v
Plain JavaScript Object
       |
       v
HTTP Response
```

`ClassSerializerInterceptor`는 응답 객체에 정의된 `class-transformer` 메타데이터를 바탕으로 데이터 변환을 수행합니다.

이 과정에서는 일반 객체와 클래스 인스턴스의 차이가 중요합니다.

## 6. @Exclude()

`@Exclude()`는 직렬화 과정에서 특정 속성을 제외하는 Decorator입니다.

### 6.1. 특정 속성 제외

```typescript
import { Exclude } from 'class-transformer';

export class UserEntity {
  id!: number;
  email!: string;

  @Exclude()
  password!: string;

  @Exclude()
  refreshToken!: string;
}
```

직렬화 결과에는 `password`, `refreshToken`이 포함되지 않습니다.

### 6.2. 클래스 전체 제외 정책

클래스 전체에 `@Exclude()`를 적용할 수도 있습니다.

```typescript
import {
  Exclude,
  Expose,
} from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id!: number;

  @Expose()
  email!: string;

  password!: string;
  internalCode!: string;
}
```

이 경우 명시적으로 `@Expose()`가 적용된 속성만 직렬화 대상에 포함됩니다.

이러한 방식은 허용된 속성만 응답에 포함하는 Allowlist 정책에 가깝습니다.

반대로 개별 속성에 `@Exclude()`만 사용하는 방식은 제외할 속성을 명시하는 Denylist 정책에 가깝습니다.

보안에 민감한 응답 DTO에서는 Allowlist 방식이 유리할 수 있습니다.

### 6.3. 변환 방향 지정

`@Exclude()`에는 특정 변환 방향에서만 제외하도록 옵션을 지정할 수 있습니다.

```typescript
@Exclude({
  toPlainOnly: true,
})
password!: string;
```

`toPlainOnly: true`는 클래스 인스턴스를 일반 객체로 변환할 때 속성을 제외합니다.

반대로 다음과 같이 사용할 수도 있습니다.

```typescript
@Exclude({
  toClassOnly: true,
})
internalField!: string;
```

`toClassOnly: true`는 일반 객체를 클래스 인스턴스로 변환할 때 해당 속성을 제외합니다.

## 7. @Expose()

`@Expose()`는 직렬화 과정에서 속성을 노출하거나 속성의 표현 방식을 정의하는 Decorator입니다.

### 7.1. 특정 속성 노출

```typescript
import {
  Exclude,
  Expose,
} from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id!: number;

  @Expose()
  email!: string;
}
```

위 클래스에서는 `id`, `email`만 직렬화 대상으로 지정합니다.

### 7.2. 속성 이름 변경

`@Expose()`의 `name` 옵션을 사용하면 직렬화 결과의 속성 이름을 변경할 수 있습니다.

```typescript
export class UserResponseDto {
  @Expose({
    name: 'user_id',
  })
  id!: number;

  @Expose({
    name: 'user_name',
  })
  name!: string;
}
```

직렬화 결과:

```json
{
  "user_id": 1,
  "user_name": "Kim"
}
```

이 방식은 내부 데이터 모델과 외부 API 응답 필드명이 다른 경우에 유용합니다.

### 7.3. 계산된 속성 노출

Getter와 `@Expose()`를 조합하여 새로운 속성을 생성할 수 있습니다.

```typescript
import {
  Exclude,
  Expose,
} from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

직렬화 결과:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe"
}
```

Getter는 직렬화 과정에서 평가되므로 외부 API 호출이나 데이터베이스 조회처럼 비용이 큰 작업을 포함하지 않는 것이 좋습니다.

## 8. @Transform()

`@Transform()`은 직렬화 과정에서 사용자 정의 변환 로직을 적용하는 Decorator입니다.

### 8.1. 기본 사용법

```typescript
import {
  Expose,
  Transform,
} from 'class-transformer';

export class ProductResponseDto {
  @Expose()
  id!: number;

  @Expose()
  @Transform(
    ({ value }) => Number(value),
    { toPlainOnly: true },
  )
  price!: number;
}
```

`@Transform()`의 콜백에서는 다음과 같은 정보를 사용할 수 있습니다.

| 속성 | 설명 |
|---|---|
| `value` | 변환 대상 속성의 현재 값 |
| `key` | 속성 이름 |
| `obj` | 변환 대상 객체 |
| `type` | 변환 방향 |
| `options` | 적용된 변환 옵션 |

### 8.2. 중첩 객체를 단일 속성으로 변환

다음과 같이 역할 정보가 객체로 존재한다고 가정합니다.

```json
{
  "role": {
    "id": 1,
    "name": "ADMIN"
  }
}
```

클라이언트에는 역할 이름만 전달하도록 변환할 수 있습니다.

```typescript
import {
  Expose,
  Transform,
} from 'class-transformer';

class RoleEntity {
  id!: number;
  name!: string;
}

export class UserResponseDto {
  @Expose()
  id!: number;

  @Expose()
  @Transform(
    ({ value }: { value: RoleEntity }) =>
      value?.name,
    { toPlainOnly: true },
  )
  role!: RoleEntity;
}
```

직렬화 결과:

```json
{
  "id": 1,
  "role": "ADMIN"
}
```

위 예제에서는 직렬화 결과의 `role`이 문자열이지만 클래스 선언에서는 객체로 정의되어 있습니다.

실무에서는 이러한 차이를 줄이기 위해 별도의 응답 DTO를 정의하거나 변환된 속성을 명시적으로 구성하는 것이 좋습니다.

### 8.3. 날짜 변환

날짜 정보를 특정 문자열 형식으로 변환할 수도 있습니다.

```typescript
import {
  Expose,
  Transform,
} from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id!: number;

  @Expose()
  @Transform(
    ({ value }) =>
      value instanceof Date
        ? value.toISOString()
        : value,
    { toPlainOnly: true },
  )
  createdAt!: Date;
}
```

실무에서는 데이터의 실제 반환 형식과 TypeScript 응답 타입이 일치하도록 DTO를 설계해야 합니다.

또한 ISO 8601 문자열이 필요한 경우에는 JavaScript의 기본 Date JSON 직렬화만으로 충분한지 먼저 확인하는 것이 좋습니다.

## 9. 클래스 인스턴스와 일반 객체의 차이

`ClassSerializerInterceptor`를 사용할 때 특히 중요한 부분은 클래스 인스턴스와 일반 JavaScript 객체의 차이입니다.

### 9.1. 클래스 인스턴스 반환

```typescript
return new UserEntity({
  id: 1,
  email: 'user@example.com',
  password: 'hashed-password',
});
```

`UserEntity`의 인스턴스가 생성되므로 `class-transformer`는 해당 클래스의 Decorator 메타데이터를 이용하여 직렬화할 수 있습니다.

### 9.2. 일반 객체 반환

```typescript
return {
  id: 1,
  email: 'user@example.com',
  password: 'hashed-password',
};
```

일반 객체에는 `UserEntity`의 Decorator 메타데이터가 연결되어 있지 않습니다.

따라서 단순히 `ClassSerializerInterceptor`를 적용하는 것만으로 `UserEntity`의 `@Exclude()` 규칙이 자동 적용되지는 않습니다.

### 9.3. 중첩된 응답 객체

다음과 같은 구조에서도 주의해야 합니다.

```typescript
return {
  user: new UserEntity({
    id: 1,
    email: 'user@example.com',
    password: 'hashed-password',
  }),
};
```

일반 객체로 감싼 응답은 기대한 직렬화 규칙이 적용되지 않을 수 있습니다.

이러한 경우에는 중첩 구조 자체를 명시적인 DTO로 정의하거나, 반환 객체를 적절한 클래스 인스턴스로 변환하여 직렬화해야 합니다.

## 10. plainToInstance()

`plainToInstance()`는 일반 JavaScript 객체를 특정 클래스의 인스턴스로 변환하는 함수입니다.

### 10.1. 기본 사용법

```typescript
import {
  plainToInstance,
} from 'class-transformer';

const user = plainToInstance(
  UserResponseDto,
  {
    id: 1,
    email: 'user@example.com',
    password: 'hashed-password',
  },
);
```

반환된 `user`는 `UserResponseDto` 인스턴스입니다.

이를 `ClassSerializerInterceptor`가 처리하면 클래스의 직렬화 규칙이 적용될 수 있습니다.

### 10.2. excludeExtraneousValues

`excludeExtraneousValues` 옵션은 대상 클래스에서 명시적으로 노출한 속성만 변환 결과에 포함하도록 제한하는 데 사용합니다.

```typescript
import {
  Expose,
  plainToInstance,
} from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id!: number;

  @Expose()
  email!: string;
}

const response = plainToInstance(
  UserResponseDto,
  {
    id: 1,
    email: 'user@example.com',
    password: 'hashed-password',
  },
  {
    excludeExtraneousValues: true,
  },
);
```

이 경우 `password`는 변환된 객체에 포함되지 않습니다.

단, `plainToInstance()`와 `instanceToPlain()`은 서로 다른 변환 단계라는 점에 주의해야 합니다.

`excludeExtraneousValues`를 사용하려면 출력할 필드에 `@Expose()`를 명시하는 것이 중요합니다.

## 11. @SerializeOptions()

`@SerializeOptions()`는 Controller 또는 Handler 단위로 직렬화 옵션을 지정하는 Decorator입니다.

`ClassSerializerInterceptor`와 함께 사용합니다.

### 11.1. 기본 사용법

```typescript
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  @Get()
  @SerializeOptions({
    excludePrefixes: ['_'],
  })
  findAll() {
    return new UserEntity({
      id: 1,
      email: 'user@example.com',
      _internalCode: 'ABC',
    });
  }
}
```

`excludePrefixes`는 지정한 접두사로 시작하는 속성을 직렬화 대상에서 제외합니다.

### 11.2. type 옵션

`type` 옵션을 사용하면 Handler가 반환한 일반 객체를 지정한 클래스의 인스턴스로 변환한 후 직렬화할 수 있습니다.

```typescript
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';

import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  @Get('example')
  @SerializeOptions({
    type: UserResponseDto,
    excludeExtraneousValues: true,
  })
  findExample() {
    return {
      id: 1,
      email: 'user@example.com',
      password: 'hashed-password',
    };
  }
}
```

`UserResponseDto`:

```typescript
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id!: number;

  @Expose()
  email!: string;
}
```

응답:

```json
{
  "id": 1,
  "email": "user@example.com"
}
```

이 방식은 Service가 일반 객체를 반환하거나 ORM 조회 결과를 응답 DTO로 변환하려는 경우에 유용합니다.

주의할 점은 `type`으로 지정한 클래스가 응답 형식을 결정한다는 것입니다.

반환된 원본 객체의 다른 클래스에 정의된 `@Exclude()` 규칙이 자동으로 유지되는 것은 아닙니다.

따라서 외부로 노출할 속성을 명시적으로 제한하려면 `@Expose()`와 `excludeExtraneousValues: true`를 함께 사용하는 것이 적절합니다.

### 11.3. 주요 직렬화 옵션

| 옵션 | 설명 |
|---|---|
| `type` | 응답을 변환할 대상 클래스를 지정합니다. |
| `excludeExtraneousValues` | 명시적으로 노출한 속성 외의 값을 제외합니다. |
| `excludePrefixes` | 지정한 접두사로 시작하는 속성을 제외합니다. |
| `groups` | 특정 그룹에 속한 속성을 직렬화합니다. |
| `version` | 지정한 버전 조건에 따라 속성을 직렬화합니다. |
| `strategy` | 기본 속성 노출 정책을 설정합니다. |
| `exposeUnsetFields` | `undefined` 속성의 직렬화 처리 방식을 제어합니다. |
| `enableCircularCheck` | 순환 참조 확인 기능을 활성화합니다. |

각 옵션의 세부 동작은 `class-transformer`의 변환 규칙을 따릅니다.

## 12. Serialization Groups

Serialization Group은 사용자 유형이나 API 목적에 따라 서로 다른 속성을 노출하기 위한 기능입니다.

### 12.1. 그룹 정의

```typescript
import {
  Exclude,
  Expose,
} from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id!: number;

  @Expose()
  name!: string;

  @Expose({
    groups: ['admin'],
  })
  email!: string;

  @Expose({
    groups: ['admin'],
  })
  internalCode!: string;
}
```

### 12.2. 특정 그룹 적용

```typescript
@Get(':id')
@SerializeOptions({
  type: UserResponseDto,
  groups: ['admin'],
})
findOne() {
  return this.usersService.findOne();
}
```

`admin` 그룹으로 직렬화하면 관리자 전용 속성이 포함될 수 있습니다.

반면 해당 그룹을 지정하지 않으면 그룹 조건에 해당하는 속성은 제외됩니다.

### 12.3. 보안상 주의사항

Serialization Group 자체가 사용자의 권한을 검증하지는 않습니다.

관리자 전용 그룹을 설정한 API에는 적절한 Guard와 Authorization 정책을 적용해야 합니다.

예를 들어 `@SerializeOptions({ groups: ['admin'] })`를 지정했다는 이유만으로 관리자 인증이 수행되는 것은 아닙니다.

## 13. Version 기반 Serialization

`class-transformer`는 버전에 따라 속성의 노출 여부를 변경하는 기능도 제공합니다.

### 13.1. 버전 조건 정의

```typescript
import {
  Exclude,
  Expose,
} from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id!: number;

  @Expose({
    until: 2,
  })
  username!: string;

  @Expose({
    since: 2,
  })
  displayName!: string;
}
```

### 13.2. 버전 지정

```typescript
@SerializeOptions({
  type: UserResponseDto,
  version: 2,
})
```

이 경우 버전 2 이상을 대상으로 정의한 `displayName`이 노출될 수 있습니다.

`since`는 해당 버전 이상부터, `until`은 지정한 버전 미만에서 속성을 노출하는 조건으로 사용됩니다.

이 기능은 NestJS의 URI Versioning이나 Header Versioning과 별개의 기능입니다.

HTTP API 버전과 직렬화 버전을 연동하려면 별도의 설정 또는 로직이 필요할 수 있습니다.

## 14. 중첩 객체 Serialization

중첩 객체를 포함하는 응답에서는 하위 객체의 변환 방식도 정의해야 합니다.

### 14.1. 중첩 DTO 정의

`address-response.dto.ts`

```typescript
import {
  Exclude,
  Expose,
} from 'class-transformer';

@Exclude()
export class AddressResponseDto {
  @Expose()
  city!: string;

  @Expose()
  street!: string;
}
```

`user-response.dto.ts`

```typescript
import {
  Exclude,
  Expose,
  Type,
} from 'class-transformer';

import { AddressResponseDto } from './address-response.dto';

@Exclude()
export class UserResponseDto {
  @Expose()
  id!: number;

  @Expose()
  email!: string;

  @Expose()
  @Type(() => AddressResponseDto)
  address!: AddressResponseDto;
}
```

`@Type()`은 중첩 객체를 지정한 클래스 타입으로 변환하는 데 필요한 정보를 제공합니다.

### 14.2. Controller 적용

```typescript
@Get(':id')
@SerializeOptions({
  type: UserResponseDto,
})
findOne() {
  return {
    id: 1,
    email: 'user@example.com',
    address: {
      city: 'Seoul',
      street: 'Gangnam-daero',
      internalCode: 'ADDR-001',
    },
  };
}
```

직렬화 결과:

```json
{
  "id": 1,
  "email": "user@example.com",
  "address": {
    "city": "Seoul",
    "street": "Gangnam-daero"
  }
}
```

중첩 객체의 `internalCode`는 `AddressResponseDto`의 제외 정책에 따라 제거됩니다.

이러한 구조에서는 하위 DTO의 직렬화 규칙과 변환 타입이 모두 올바르게 설정되어 있는지 확인해야 합니다.

## 15. 배열 Serialization

`ClassSerializerInterceptor`는 Handler가 반환한 배열의 각 요소에도 직렬화 규칙을 적용할 수 있습니다.

### 15.1. 클래스 인스턴스 배열

```typescript
@Get()
findAll(): UserEntity[] {
  return [
    new UserEntity({
      id: 1,
      email: 'user1@example.com',
      password: 'hashed-password-1',
    }),
    new UserEntity({
      id: 2,
      email: 'user2@example.com',
      password: 'hashed-password-2',
    }),
  ];
}
```

`ClassSerializerInterceptor`가 적용되어 있다면 각 `UserEntity`에 정의된 직렬화 규칙이 적용됩니다.

### 15.2. 일반 객체 배열

`@SerializeOptions()`의 `type` 옵션을 사용하면 일반 객체 배열에도 지정한 DTO의 변환 규칙을 적용할 수 있습니다.

```typescript
@Get()
@SerializeOptions({
  type: UserResponseDto,
  excludeExtraneousValues: true,
})
findAll() {
  return [
    {
      id: 1,
      email: 'user1@example.com',
      password: 'hashed-password-1',
    },
    {
      id: 2,
      email: 'user2@example.com',
      password: 'hashed-password-2',
    },
  ];
}
```

단, 배열을 `data`, `total`, `page` 등의 속성으로 감싸는 Pagination 응답에서는 외부 응답 객체의 구조까지 고려해야 합니다.

이 경우 별도의 Pagination Response DTO를 정의하는 방법이 적절합니다.

## 16. 응답 DTO 설계

실무에서는 데이터베이스 Entity를 그대로 반환하기보다 별도의 Response DTO를 정의하는 것이 일반적으로 유리합니다.

### 16.1. Entity와 Response DTO의 책임

| 구분 | Entity | Response DTO |
|---|---|---|
| 주요 목적 | 데이터 저장 및 도메인 모델 표현 | 외부 API 응답 표현 |
| 주요 속성 | 데이터베이스 컬럼 및 관계 | 클라이언트에 공개할 속성 |
| 변경 요인 | 데이터 모델 변경 | API 응답 계약 변경 |
| 민감한 정보 | 포함될 수 있음 | 필요한 정보만 포함 |
| 사용 위치 | Repository 및 Service | Controller 응답 계층 |

### 16.2. Response DTO 정의

`users/dto/user-response.dto.ts`

```typescript
import {
  Exclude,
  Expose,
} from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id!: number;

  @Expose()
  email!: string;

  @Expose()
  name!: string;
}
```

### 16.3. Controller와 연동

```typescript
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';

import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get(':id')
  @SerializeOptions({
    type: UserResponseDto,
    excludeExtraneousValues: true,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOne(id);
  }
}
```

Service는 사용자 데이터를 반환하고, Controller의 직렬화 설정은 이를 외부 API에 필요한 형식으로 변환합니다.

이 방식은 응답 형식을 Controller에서 선언적으로 관리하는 데 유용합니다.

### 16.4. ORM Entity 직렬화 시 주의사항

ORM이 반환하는 객체가 항상 일반적인 JavaScript 클래스 인스턴스와 동일하게 동작하는 것은 아닙니다.

ORM에 따라 Proxy, Lazy Loading, Relation Wrapper 또는 자체 Serialization 기능을 사용할 수 있습니다.

특히 MikroORM과 같이 자체 직렬화 방식을 제공하는 ORM에서는 NestJS의 `ClassSerializerInterceptor`보다 ORM이 제공하는 직렬화 기능을 사용하는 것이 적절할 수 있습니다.

따라서 ORM Entity에 `@Exclude()`를 직접 적용하는 방식에만 의존하기보다 명시적인 Response DTO를 구성하는 방법을 고려하는 것이 좋습니다.

## 17. 전역 Serialization 설정

`ClassSerializerInterceptor`는 Controller 단위뿐 아니라 애플리케이션 전체에도 적용할 수 있습니다.

### 17.1. useGlobalInterceptors()

`main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { Reflector } from '@nestjs/core';

import {
  ClassSerializerInterceptor,
} from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(
      app.get(Reflector),
    ),
  );

  await app.listen(3000);
}

void bootstrap();
```

`Reflector`는 Controller 또는 Handler에 정의된 `@SerializeOptions()` 등의 메타데이터를 조회하는 데 사용됩니다.

### 17.2. APP_INTERCEPTOR

NestJS의 DI Container를 이용하여 전역 Interceptor를 등록할 수도 있습니다.

`app.module.ts`

```typescript
import {
  ClassSerializerInterceptor,
  Module,
} from '@nestjs/common';

import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
```

이 방식에서는 NestJS가 Interceptor 인스턴스를 생성하고 필요한 의존성을 주입합니다.

전역 Interceptor를 등록할 때는 애플리케이션에 존재하는 모든 응답에 영향을 줄 수 있다는 점을 고려해야 합니다.

## 18. @Res() 사용 시 주의사항

NestJS에서는 `@Res()`를 사용하여 Express 또는 Fastify의 응답 객체에 직접 접근할 수 있습니다.

```typescript
@Get()
findOne(@Res() res: Response) {
  return res.json({
    id: 1,
    email: 'user@example.com',
  });
}
```

위 예제의 `Response`는 Express를 사용하는 경우의 타입이며, Fastify에서는 해당 Adapter의 응답 타입을 사용해야 합니다.

`@Res()`를 사용하여 응답을 직접 전송하면 일반적인 NestJS 응답 처리 흐름을 우회합니다.

따라서 Handler 반환값에 적용되는 `ClassSerializerInterceptor`의 직렬화 결과가 실제 전송 데이터에 반영되지 않을 수 있습니다.

### 18.1. 권장 방식

가능하면 Controller가 데이터를 반환하도록 구성합니다.

```typescript
@Get()
findOne() {
  return this.usersService.findOne();
}
```

이 방식은 NestJS가 제공하는 Interceptor 및 응답 처리 기능을 활용하기 쉽습니다.

### 18.2. passthrough 옵션

응답 헤더나 쿠키 등을 직접 설정해야 한다면 `passthrough` 옵션을 사용할 수 있습니다.

```typescript
@Get()
findOne(
  @Res({ passthrough: true }) res: Response,
) {
  res.setHeader('X-App-Version', '1.0');

  return new UserEntity({
    id: 1,
    email: 'user@example.com',
    password: 'hashed-password',
  });
}
```

`passthrough: true`를 사용하면 응답 객체를 일부 조작하면서도 NestJS의 표준 응답 처리 방식을 유지할 수 있습니다.

단, 해당 Handler 또는 전역 범위에 `ClassSerializerInterceptor`가 적용되어 있어야 직렬화 규칙이 실행됩니다.

## 19. Standard Schema 기반 Serialization

NestJS v12에서는 Standard Schema 기반 Serialization 기능이 도입되었습니다.

`StandardSchemaSerializerInterceptor`는 클래스 Decorator 대신 스키마를 기준으로 응답 데이터를 검증하고 변환합니다.

이 방식은 Zod, Valibot, ArkType 등 Standard Schema를 지원하는 라이브러리와 연동할 수 있습니다.

### 19.1. Zod 설치

```bash
npm install zod
```

### 19.2. 응답 스키마 정의

`users/dto/user-response.schema.ts`

```typescript
import { z } from 'zod';

export const userResponseSchema = z.object({
  id: z.number(),
  email: z.email(),
  name: z.string(),
});

export type UserResponse =
  z.infer<typeof userResponseSchema>;
```

위 스키마는 클라이언트에 전달할 속성을 정의합니다.

기본적인 `z.object()`는 선언되지 않은 추가 속성을 결과에서 제거하므로 Allowlist 방식의 응답 구성이 가능합니다.

### 19.3. Interceptor 적용

```typescript
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  SerializeOptions,
  StandardSchemaSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { userResponseSchema } from './dto/user-response.schema';

@Controller('users')
@UseInterceptors(StandardSchemaSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get(':id')
  @SerializeOptions({
    schema: userResponseSchema,
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOne(id);
  }
}
```

Service에서 다음 데이터를 반환한다고 가정합니다.

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Kim",
  "password": "hashed-password"
}
```

직렬화 결과:

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Kim"
}
```

스키마에 정의되지 않은 `password`는 응답에서 제거됩니다.

### 19.4. 스키마 기반 데이터 변환

Zod의 `transform()`을 이용하면 응답 구조를 변경할 수 있습니다.

```typescript
import { z } from 'zod';

export const userResponseSchema = z
  .object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
  })
  .transform((user) => ({
    id: user.id,
    fullName:
      `${user.firstName} ${user.lastName}`,
  }));
```

이 경우 응답은 다음과 같이 구성됩니다.

```json
{
  "id": 1,
  "fullName": "John Doe"
}
```

### 19.5. 배열과 오류 처리

`StandardSchemaSerializerInterceptor`는 Handler가 배열을 반환하면 각 요소에 스키마를 적용합니다.

따라서 배열 응답에서는 일반적으로 개별 요소에 대한 스키마를 지정합니다.

또한 스키마에 정의된 필수 속성이 누락되거나 타입이 일치하지 않으면 직렬화 오류가 발생합니다.

이는 클라이언트의 잘못된 요청이 아니라 서버가 응답 계약을 충족하지 못한 상황이므로 일반적으로 HTTP 500 오류로 처리됩니다.

### 19.6. 클래스 기반 방식과 비교

| 구분 | ClassSerializerInterceptor | StandardSchemaSerializerInterceptor |
|---|---|---|
| 기반 기술 | class-transformer | Standard Schema |
| 정의 방식 | 클래스와 Decorator | 스키마 |
| 주요 변환 기능 | Exclude, Expose, Transform | Schema Transform |
| 타입 정의 | 클래스 기반 | 스키마 기반 타입 추론 |
| 응답 검증 | 기본적으로 별도 검증하지 않음 | 스키마를 이용해 검증 |
| 추가 속성 처리 | Decorator 및 변환 옵션에 따름 | 스키마 정책에 따름 |
| 적용 환경 | 클래스 기반 DTO 프로젝트 | 스키마 기반 프로젝트 |

기존 `class-transformer` 기반 프로젝트에서는 `ClassSerializerInterceptor`를 계속 사용할 수 있습니다.

반면 Zod 등의 스키마를 중심으로 API 계약을 관리하는 프로젝트에서는 `StandardSchemaSerializerInterceptor`를 고려할 수 있습니다.

## 20. Serialization과 Validation의 차이

Validation과 Serialization은 모두 데이터를 검사하거나 변환할 수 있지만 적용 시점과 목적이 다릅니다.

| 구분 | Validation | Serialization |
|---|---|---|
| 적용 대상 | 주로 클라이언트 입력 데이터 | 주로 서버 응답 데이터 |
| 주요 목적 | 잘못된 입력값 차단 | 응답 데이터 구조 및 표현 제어 |
| 주요 구성 요소 | ValidationPipe | ClassSerializerInterceptor |
| 대표 라이브러리 | class-validator | class-transformer |
| 변환 방향 | 입력 → DTO | 객체 → 응답 데이터 |
| 주요 처리 시점 | Controller Handler 실행 전 | Controller Handler 실행 후 |

예를 들어 회원 생성 API에서는 다음과 같은 흐름이 발생할 수 있습니다.

```text
POST /users
     |
     v
CreateUserDto
     |
     v
ValidationPipe
     |
     v
UsersController
     |
     v
UsersService
     |
     v
Database
     |
     v
User Entity
     |
     v
UserResponseDto
     |
     v
ClassSerializerInterceptor
     |
     v
HTTP Response
```

`CreateUserDto`는 클라이언트가 전달한 입력값을 검증하는 역할을 담당합니다.

반면 `UserResponseDto`는 클라이언트에 반환할 데이터의 형식을 정의합니다.

따라서 요청 DTO와 응답 DTO는 책임을 구분하여 설계하는 것이 좋습니다.

## 21. WebSocket 및 Microservices에서의 Serialization

NestJS의 Serialization 기능은 HTTP 애플리케이션뿐 아니라 WebSocket 및 Microservices 환경에서도 활용할 수 있습니다.

### 21.1. WebSocket

WebSocket Gateway에서도 Interceptor를 사용하여 Handler의 반환 데이터를 직렬화할 수 있습니다.

```typescript
import {
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';

import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway()
@UseInterceptors(ClassSerializerInterceptor)
export class UsersGateway {
  @SubscribeMessage('user.find')
  findUser(
    @MessageBody() userId: number,
  ) {
    return new UserEntity({
      id: userId,
      email: 'user@example.com',
      password: 'hashed-password',
    });
  }
}
```

이 예제는 Handler가 반환하는 응답 데이터에 직렬화를 적용하는 방식입니다.

반면 `@WebSocketServer()`로 주입받은 서버를 사용하여 `server.emit()` 또는 `client.emit()`을 직접 호출하는 경우에는 일반적인 Handler 반환값에 적용되는 Interceptor 동작과 구분해야 합니다.

직접 전송하는 메시지는 필요한 직렬화 정책을 별도로 적용해야 합니다.

### 21.2. Microservices

Microservices의 Message Handler에도 Interceptor 기반 직렬화를 적용할 수 있습니다.

다만 Microservices에서는 Transport별 Serializer 및 Deserializer가 별도로 존재할 수 있습니다.

이 기능은 메시지를 전송 가능한 형식으로 인코딩하거나 수신한 메시지를 복원하는 역할을 담당합니다.

따라서 `ClassSerializerInterceptor`의 응답 객체 변환과 Transport Serializer의 메시지 인코딩은 서로 다른 책임입니다.

### 21.3. Streaming Response

최신 NestJS에서는 HTTP Streaming Response의 객체 요소에도 직렬화 규칙을 적용할 수 있습니다.

지원되는 스트림에서는 각 객체가 전송될 때 직렬화가 수행됩니다.

반면 문자열이나 바이너리 Chunk는 동일한 방식으로 객체 직렬화가 수행되지 않습니다.

또한 `StreamableFile` 응답은 `ClassSerializerInterceptor` 및 `StandardSchemaSerializerInterceptor`의 일반적인 객체 직렬화 대상에서 제외됩니다.

WebSocket, Microservices 및 GraphQL Subscription에서도 HTTP Streaming Response와 동일한 객체별 스트림 직렬화가 자동으로 수행된다고 가정해서는 안 됩니다.

## 22. Serialization 적용 시 주의사항

### 22.1. 민감한 데이터 제외 정책을 명시합니다.

`@Exclude()`를 사용하여 특정 속성을 제외할 수 있지만, 새로운 속성이 Entity에 추가될 때 자동으로 안전한 응답 계약이 유지된다고 보장할 수는 없습니다.

따라서 외부 API에서는 명시적인 Response DTO와 Allowlist 정책을 사용하는 것이 적절합니다.

### 22.2. 클래스 인스턴스와 일반 객체를 구분합니다.

`ClassSerializerInterceptor`는 클래스 메타데이터를 활용합니다.

따라서 일반 객체를 반환하는 경우에는 `@SerializeOptions({ type: ... })` 또는 `plainToInstance()` 등을 이용하여 변환 대상을 명확히 해야 합니다.

### 22.3. 중첩 객체의 직렬화 규칙을 확인합니다.

중첩된 DTO에는 `@Type()` 등을 사용하여 변환 대상 클래스를 명시할 수 있습니다.

하위 객체에 민감한 속성이 있다면 실제 HTTP 응답에서 해당 속성이 제거되는지 확인해야 합니다.

### 22.4. 직렬화 과정에서 비즈니스 로직을 수행하지 않습니다.

`@Transform()`과 Getter에 복잡한 비즈니스 로직을 포함하면 Serialization 계층의 책임이 커집니다.

특히 데이터베이스 조회나 외부 API 호출과 같은 작업은 가능한 한 Service 계층에서 처리하는 것이 좋습니다.

### 22.5. 타입 선언과 실제 응답 형식을 일치시킵니다.

직렬화 과정에서 Date를 문자열로 변환하거나 객체를 문자열로 변경하는 경우 TypeScript의 정적 타입과 실제 응답 데이터의 형식이 달라질 수 있습니다.

응답 DTO는 실제 API 계약을 정확하게 표현하도록 설계하는 것이 좋습니다.

### 22.6. Serialization의 처리 비용을 고려합니다.

대량의 객체를 직렬화하면 객체 생성, 중첩 구조 탐색 및 Decorator 기반 변환에 추가적인 CPU와 메모리가 사용될 수 있습니다.

특히 대량 데이터 조회 API나 높은 처리량이 필요한 Streaming 시스템에서는 직렬화 비용을 측정해야 합니다.

필요한 속성만 데이터베이스에서 조회하거나, 명시적인 매핑 함수를 사용하거나, 더 단순한 응답 구조를 사용하는 방법도 고려할 수 있습니다.

## 23. 실무 권장 설계

일반적인 REST API에서는 다음과 같은 구조를 고려할 수 있습니다.

```text
src/
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   ├── update-user.dto.ts
│   │   └── user-response.dto.ts
│   │
│   ├── entities/
│   │   └── user.entity.ts
│   │
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── app.module.ts
└── main.ts
```

각 구성 요소의 책임은 다음과 같습니다.

| 구성 요소 | 책임 |
|---|---|
| `CreateUserDto` | 사용자 생성 요청 데이터 검증 |
| `UpdateUserDto` | 사용자 수정 요청 데이터 검증 |
| `UserEntity` | 데이터베이스 및 도메인 데이터 표현 |
| `UserResponseDto` | 사용자 조회 응답 구조 정의 |
| `UsersService` | 사용자 관련 비즈니스 로직 처리 |
| `UsersController` | HTTP 요청과 응답 연결 |
| `ClassSerializerInterceptor` | 응답 DTO의 직렬화 규칙 적용 |

권장 사항은 다음과 같습니다.

1. 요청 DTO와 응답 DTO를 분리하여 관리합니다.
2. 데이터베이스 Entity를 외부 응답에 직접 노출하지 않습니다.
3. 민감한 데이터가 포함된 응답에는 Allowlist 기반 직렬화 정책을 고려합니다.
4. `@SerializeOptions()`를 이용하여 응답 DTO를 명시적으로 지정합니다.
5. 중첩 객체와 배열 응답의 직렬화 동작을 테스트합니다.
6. 인증 및 인가와 Serialization의 책임을 구분합니다.
7. 대량 데이터 처리에서는 직렬화 비용을 측정하고 최적화합니다.

## 24. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| Serialization | 객체를 외부에 전달할 수 있는 형태로 변환 |
| Deserialization | 전달된 데이터를 객체 형태로 복원 |
| `ClassSerializerInterceptor` | 클래스 기반 응답 직렬화 |
| `StandardSchemaSerializerInterceptor` | 스키마 기반 응답 검증 및 직렬화 |
| `class-transformer` | 객체와 클래스 간 변환 지원 |
| `instanceToPlain()` | 클래스 인스턴스를 일반 객체로 변환 |
| `plainToInstance()` | 일반 객체를 클래스 인스턴스로 변환 |
| `@Exclude()` | 속성 제외 |
| `@Expose()` | 속성 노출 및 이름 변경 |
| `@Transform()` | 사용자 정의 속성 변환 |
| `@Type()` | 중첩 객체 변환 타입 지정 |
| `@SerializeOptions()` | 직렬화 옵션 지정 |
| `excludeExtraneousValues` | 명시적으로 노출한 속성만 허용 |
| Serialization Groups | 그룹별 응답 속성 제어 |
| Response DTO | 외부 API 응답 데이터 계약 정의 |

## 25. 정리

NestJS의 Serialization 기능은 애플리케이션 내부 객체를 클라이언트에 전달할 응답 데이터로 변환하는 데 사용합니다.

`ClassSerializerInterceptor`는 `class-transformer`와 연동하여 클래스에 선언된 `@Exclude()`, `@Expose()`, `@Transform()` 등의 규칙을 적용합니다.

`@SerializeOptions()`를 사용하면 Handler 또는 Controller 단위로 응답 타입과 직렬화 정책을 설정할 수 있습니다.

중첩 객체, 배열, 그룹 및 버전별 응답 구성을 통해 다양한 API 응답 요구사항을 처리할 수도 있습니다.

Standard Schema 기반 Serialization은 Zod와 같은 스키마 라이브러리를 사용하여 응답 데이터를 검증하고 변환하는 대안적인 방법입니다.

실제 프로젝트에서는 데이터베이스 Entity와 Response DTO를 분리하고, 외부에 공개할 속성을 명시적으로 정의하는 것이 중요합니다.

또한 Serialization은 데이터 표현을 제어하는 기능이므로 인증, 인가 및 비즈니스 규칙 검증과 구분하여 설계해야 합니다.

## 참고 자료

- [NestJS 공식 문서 - Serialization](https://docs.nestjs.com/techniques/serialization)
- [NestJS 공식 문서 - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS 공식 문서 - Controllers](https://docs.nestjs.com/controllers)
- [NestJS 공식 문서 - Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS 공식 문서 - Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [NestJS 공식 문서 - Migration Guide](https://docs.nestjs.com/migration-guide)
- [NestJS 공식 문서 - MikroORM](https://docs.nestjs.com/recipes/mikroorm)
- [NestJS 공식 문서 - Streaming Responses](https://docs.nestjs.com/http/streaming-responses)
- [class-transformer GitHub Repository](https://github.com/typestack/class-transformer)
- [class-transformer 공식 문서 - Basic Usage](https://github.com/typestack/class-transformer/blob/develop/docs/pages/02-basic-usage.md)
- [Zod 공식 문서](https://zod.dev/)
- [Standard Schema 공식 문서](https://standardschema.dev/)