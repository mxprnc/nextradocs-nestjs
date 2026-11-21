# REST API

## 1. 개요

REST(Representational State Transfer)는 분산 하이퍼미디어 시스템을 위한 아키텍처 스타일입니다. REST의 설계 원칙을 따르는 API를 일반적으로 REST API라고 합니다.

REST API는 HTTP의 요청 메서드, URI, 상태 코드, 헤더 및 표현(Representation)을 활용하여 클라이언트와 서버 간의 통신을 구성합니다.

NestJS는 Express 또는 Fastify와 같은 HTTP 플랫폼을 기반으로 REST API를 구현할 수 있는 기능을 제공합니다.

주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| Module | 관련 Controller와 Provider를 하나의 기능 단위로 구성합니다. |
| Controller | HTTP 요청을 수신하고 적절한 Handler로 라우팅합니다. |
| Provider (Service) | 비즈니스 로직과 데이터 처리 작업을 수행합니다. |
| DTO | 요청 및 응답 데이터의 구조를 정의합니다. |
| Pipe | 요청 데이터를 검증하거나 변환합니다. |
| Guard | 요청에 대한 접근 권한을 확인합니다. |
| Interceptor | 요청 및 응답 처리 과정을 확장하거나 변환합니다. |
| Exception Filter | 예외를 처리하고 적절한 HTTP 응답을 생성합니다. |

NestJS의 REST API는 이러한 구성 요소를 조합하여 요청 처리, 비즈니스 로직, 데이터 접근 및 응답 생성의 책임을 분리할 수 있습니다.

이 문서에서는 REST의 기본 개념과 NestJS의 HTTP API 구현 방법을 설명하고, CRUD 예제를 통해 각 구성 요소의 관계를 살펴봅니다.

---

## 2. REST 아키텍처

### 2.1. REST의 주요 개념

REST는 서버가 제공하는 기능을 Resource 중심으로 모델링합니다.

Resource는 사용자, 게시글, 주문 또는 상품과 같이 API가 관리하는 대상입니다.

예를 들어 사용자 정보를 관리하는 REST API는 다음과 같이 구성할 수 있습니다.

```http
GET /users
GET /users/1
POST /users
PATCH /users/1
DELETE /users/1
```

각 URI는 Resource를 식별하며, HTTP 메서드는 해당 Resource에 수행할 작업을 나타냅니다.

REST에서는 일반적으로 URI에 동작을 직접 표현하기보다 Resource를 중심으로 경로를 설계합니다.

```http
# 권장하지 않는 형태
GET /getUsers
POST /createUser
POST /deleteUser

# Resource 중심 설계
GET /users
POST /users
DELETE /users/1
```

다만 Resource 중심 URI와 HTTP 메서드를 사용하는 것만으로 REST의 모든 제약 조건을 충족하는 것은 아닙니다.

### 2.2. REST의 아키텍처 제약 조건

REST는 다음과 같은 아키텍처 제약 조건을 정의합니다.

| 제약 조건 | 설명 |
|---|---|
| Client-Server | 클라이언트와 서버의 책임을 분리합니다. |
| Stateless | 서버는 각 요청을 처리하는 데 필요한 정보를 요청 자체에서 확보할 수 있어야 합니다. |
| Cacheable | 응답은 캐시 가능 여부를 명확하게 나타내야 합니다. |
| Uniform Interface | Resource 식별 및 조작에 일관된 인터페이스를 사용합니다. |
| Layered System | 클라이언트와 서버 사이에 프록시, 게이트웨이 등의 계층을 배치할 수 있습니다. |
| Code on Demand | 서버가 클라이언트에 실행 가능한 코드를 전달할 수 있으며, 선택적 제약 조건입니다. |

특히 Uniform Interface는 Resource 식별, Representation을 통한 Resource 조작, 자기 서술적 메시지, HATEOAS(Hypermedia as the Engine of Application State) 등의 요소를 포함합니다.

실무에서 사용하는 많은 JSON 기반 HTTP API는 REST의 일부 원칙을 적용하지만 HATEOAS까지 구현하지는 않습니다.

따라서 일반적인 CRUD 중심 HTTP API와 REST의 아키텍처적 정의는 구분하여 이해할 필요가 있습니다.

### 2.3. Stateless 특성

Stateless는 서버가 이전 요청의 세션 상태에 의존하지 않고 각각의 요청을 처리할 수 있도록 설계하는 원칙입니다.

예를 들어 인증이 필요한 요청에서는 다음과 같이 인증 정보를 전달할 수 있습니다.

```http
GET /users/me HTTP/1.1
Host: api.example.com
Authorization: Bearer <access-token>
```

서버는 전달받은 인증 정보를 검증하여 요청을 처리합니다.

Stateless는 서버가 데이터베이스, 캐시 또는 외부 저장소를 사용할 수 없다는 의미가 아닙니다.

서버는 Resource 상태를 영속적으로 저장할 수 있으며, 필요한 경우 요청에 포함된 식별자를 사용하여 해당 데이터를 조회할 수 있습니다.

---

## 3. HTTP 메서드

HTTP 메서드는 Resource에 수행할 작업의 의미를 정의합니다.

REST API에서는 일반적으로 다음 메서드를 사용합니다.

| HTTP 메서드 | 주요 목적 | Safe | Idempotent |
|---|---|---|---|
| GET | Resource 조회 | Yes | Yes |
| POST | Resource 생성 또는 별도 처리 요청 | No | No |
| PUT | Resource의 전체 상태 생성 또는 교체 | No | Yes |
| PATCH | Resource의 부분 변경 | No | 일반적으로 보장되지 않음 |
| DELETE | Resource 삭제 | No | Yes |
| HEAD | 응답 본문 없이 메타데이터 조회 | Yes | Yes |
| OPTIONS | 대상 Resource의 통신 옵션 조회 | Yes | Yes |

### 3.1. Safe Method

Safe Method는 클라이언트가 서버 상태의 변경을 요청하지 않는 메서드입니다.

대표적인 Safe Method는 GET, HEAD, OPTIONS입니다.

다만 서버가 접근 로그 또는 조회 통계를 기록하는 등의 부수적인 작업은 발생할 수 있습니다.

### 3.2. Idempotent Method

멱등성(Idempotency)은 동일한 요청을 한 번 실행하거나 여러 번 실행하더라도 서버에 의도한 최종 효과가 동일한 성질을 의미합니다.

예를 들어 다음 DELETE 요청을 여러 번 전송하더라도 최종적으로 사용자 1번이 삭제된 상태는 동일합니다.

```http
DELETE /users/1
```

첫 번째 요청이 `204 No Content`를 반환하고, 두 번째 요청이 `404 Not Found`를 반환하더라도 멱등성 자체가 위반되는 것은 아닙니다.

멱등성은 응답이 항상 동일해야 한다는 의미가 아니라 서버 상태에 대한 의도한 효과가 동일해야 한다는 의미입니다.

PATCH는 구현 방식에 따라 멱등성을 확보할 수도 있습니다.

예를 들어 이메일 주소를 특정 값으로 설정하는 PATCH는 멱등적으로 구현할 수 있지만, 요청할 때마다 포인트를 10씩 증가시키는 PATCH는 멱등적이지 않습니다.

---

## 4. URI 설계

REST API는 Resource를 식별하기 위해 URI를 사용합니다.

URI는 Resource의 계층과 관계를 명확하게 표현하도록 설계하는 것이 좋습니다.

### 4.1. Resource 명명 규칙

일반적인 설계 관례는 다음과 같습니다.

| 항목 | 예시 |
|---|---|
| Resource 컬렉션 | `/users` |
| 단일 Resource | `/users/1` |
| 하위 Resource | `/users/1/orders` |
| 특정 하위 Resource | `/users/1/orders/100` |
| Resource 검색 | `/users?name=kim` |
| 페이지네이션 | `/users?page=1&limit=20` |
| 정렬 | `/users?sort=createdAt&order=desc` |

일반적으로 Resource 이름은 명사를 사용하고, 컬렉션을 표현할 때는 복수형을 사용하는 관례가 널리 활용됩니다.

### 4.2. Path Parameter와 Query Parameter

Path Parameter는 특정 Resource를 식별할 때 사용합니다.

```http
GET /users/10
```

Query Parameter는 필터링, 정렬, 검색 및 페이지네이션과 같은 조회 조건을 전달할 때 사용합니다.

```http
GET /users?role=admin&page=2
```

단, 이는 일반적인 설계 관례이며 URI의 구체적인 표현 방식은 API의 목적과 도메인에 따라 달라질 수 있습니다.

---

## 5. NestJS의 REST API 구조

NestJS에서는 일반적으로 Controller, Service, Module을 조합하여 REST API를 구현합니다.

```text
HTTP Client
    |
    | HTTP Request
    v
Controller
    |
    | Method Invocation
    v
Service
    |
    | Business Logic
    v
Repository / Data Source
    |
    | Result
    v
Service
    |
    v
Controller
    |
    | HTTP Response
    v
HTTP Client
```

실제 요청은 Controller에 도달하기 전에 Middleware, Guard, Interceptor 및 Pipe 등의 처리 과정을 거칠 수 있습니다.

### 5.1. Controller

Controller는 HTTP 요청을 수신하고 해당 요청을 처리할 Handler를 정의합니다.

`@Controller()` 데코레이터로 기본 경로를 설정하고, `@Get()`, `@Post()` 등의 데코레이터로 HTTP 메서드와 경로를 매핑합니다.

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return ['Alice', 'Bob'];
  }
}
```

위 코드는 다음 Endpoint를 제공합니다.

```http
GET /users
```

NestJS는 Handler의 반환값을 HTTP 응답으로 처리합니다. 객체나 배열을 반환하면 기본적으로 JSON 응답으로 직렬화합니다.

### 5.2. Service

Service는 Controller로부터 비즈니스 로직을 분리하는 역할을 담당합니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  findAll() {
    return ['Alice', 'Bob'];
  }
}
```

`@Injectable()` 데코레이터는 해당 클래스를 NestJS의 Dependency Injection 시스템에서 관리할 수 있도록 메타데이터를 제공합니다.

Service를 Provider로 등록하면 Controller에서 생성자 주입을 통해 사용할 수 있습니다.

### 5.3. Module

Module은 관련 Controller와 Provider를 하나의 기능 단위로 구성합니다.

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

`controllers`에는 요청을 처리할 Controller를 등록하고, `providers`에는 Dependency Injection을 통해 관리할 Provider를 등록합니다.

---

## 6. HTTP 요청 데이터 처리

NestJS는 다양한 Parameter Decorator를 제공하여 HTTP 요청 데이터를 Handler의 매개변수로 전달할 수 있습니다.

| 데코레이터 | 역할 |
|---|---|
| `@Param()` | Path Parameter를 추출합니다. |
| `@Query()` | Query Parameter를 추출합니다. |
| `@Body()` | Request Body를 추출합니다. |
| `@Headers()` | HTTP 요청 헤더를 추출합니다. |
| `@Req()` | HTTP Adapter의 Request 객체에 접근합니다. |
| `@Ip()` | 요청의 IP 주소를 추출합니다. |
| `@HostParam()` | Host 기반 라우팅의 Parameter를 추출합니다. |

### 6.1. Path Parameter

```typescript
import { Controller, Get, Param } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }
}
```

요청 예시:

```http
GET /users/10
```

응답 예시:

```json
{
  "id": "10"
}
```

HTTP 경로에서 전달되는 Parameter는 기본적으로 문자열입니다.

숫자형 식별자가 필요하다면 `ParseIntPipe` 등을 사용하여 변환하고 검증할 수 있습니다.

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return { id };
}
```

### 6.2. Query Parameter

```typescript
import { Controller, Get, Query } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return { page, limit };
  }
}
```

요청 예시:

```http
GET /users?page=2&limit=10
```

응답 예시:

```json
{
  "page": "2",
  "limit": "10"
}
```

Query Parameter 역시 기본적으로 문자열로 전달되므로 계산에 사용하려면 명시적인 변환과 검증이 필요합니다.

### 6.3. Request Body

POST, PUT, PATCH 등의 요청에서는 Request Body를 사용하여 데이터를 전달할 수 있습니다.

```typescript
import { Body, Controller, Post } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Post()
  create(@Body() body: { name: string; email: string }) {
    return body;
  }
}
```

요청 예시:

```http
POST /users
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com"
}
```

실제 애플리케이션에서는 인라인 타입보다 DTO 클래스를 정의하여 요청 데이터의 구조를 명확하게 표현하는 것이 좋습니다.

---

## 7. DTO와 Validation

DTO(Data Transfer Object)는 계층 사이에서 전달하는 데이터의 구조를 정의하기 위한 객체입니다.

REST API에서는 주로 요청 데이터의 구조와 검증 규칙을 정의하는 데 활용합니다.

TypeScript의 타입 정보만으로는 런타임 요청 데이터를 검증할 수 없습니다.

따라서 NestJS에서는 `ValidationPipe`와 `class-validator`, `class-transformer` 등을 조합하여 런타임 검증을 수행할 수 있습니다.

### 7.1. 패키지 설치

기존 NestJS 프로젝트에서 다음 패키지를 설치합니다.

```bash
npm install class-validator class-transformer
```

### 7.2. DTO 정의

`src/users/dto/create-user.dto.ts`

```typescript
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsEmail()
  email!: string;
}
```

각 데코레이터의 역할은 다음과 같습니다.

| 데코레이터 | 설명 |
|---|---|
| `@IsString()` | 문자열인지 검증합니다. |
| `@IsNotEmpty()` | 비어 있지 않은 값인지 검증합니다. |
| `@MaxLength()` | 문자열의 최대 길이를 제한합니다. |
| `@IsEmail()` | 이메일 형식인지 검증합니다. |

DTO를 런타임 검증에 사용할 경우 일반적으로 `interface`보다 `class`를 사용합니다.

TypeScript의 Interface는 JavaScript로 변환될 때 제거되지만, Class는 런타임에 존재하기 때문입니다.

### 7.3. ValidationPipe 등록

`src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
}

void bootstrap();
```

주요 옵션은 다음과 같습니다.

| 옵션 | 설명 |
|---|---|
| `whitelist` | 검증 데코레이터가 없는 DTO 속성을 제거합니다. |
| `forbidNonWhitelisted` | 허용되지 않은 속성이 포함된 경우 예외를 발생시킵니다. |
| `transform` | 요청 데이터를 DTO 인스턴스 또는 적절한 기본 타입으로 변환하도록 지원합니다. |
| `stopAtFirstError` | 각 속성에서 첫 번째 검증 오류 이후 추가 검증 오류 수집을 중단합니다. |

`whitelist: true`와 `forbidNonWhitelisted: true`를 함께 사용하면 허용되지 않은 속성이 포함된 요청을 거부할 수 있습니다.

`transform: true`는 모든 잘못된 값을 자동으로 정상적인 값으로 변환한다는 의미는 아닙니다. 명확한 타입 검증이 필요한 경우 적절한 검증 데코레이터와 Pipe를 사용해야 합니다.

### 7.4. 요청 검증

Controller에 DTO를 적용합니다.

```typescript
@Post()
create(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}
```

올바른 요청:

```json
{
  "name": "Alice",
  "email": "alice@example.com"
}
```

잘못된 요청:

```json
{
  "name": "",
  "email": "invalid-email"
}
```

잘못된 요청이 전달되면 ValidationPipe는 기본적으로 `400 Bad Request` 응답을 발생시킵니다.

---

## 8. REST API CRUD 구현

이번 절에서는 사용자 정보를 생성, 조회, 수정, 삭제하는 REST API를 구현합니다.

데이터베이스를 사용하지 않고 메모리 기반 저장소를 사용하므로 NestJS의 REST API 구조에 집중할 수 있습니다.

실제 영속성 처리는 별도의 Database 문서에서 다룹니다.

### 8.1. 프로젝트 구조

```text
src/
├── main.ts
├── app.module.ts
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.service.ts
    ├── dto/
    │   ├── create-user.dto.ts
    │   └── update-user.dto.ts
    └── interfaces/
        └── user.interface.ts
```

### 8.2. User Interface

`src/users/interfaces/user.interface.ts`

```typescript
export interface User {
  id: number;
  name: string;
  email: string;
}
```

User Interface는 애플리케이션 내부에서 사용하는 사용자 데이터 구조를 정의합니다.

### 8.3. CreateUserDto

`src/users/dto/create-user.dto.ts`

```typescript
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsEmail()
  email!: string;
}
```

### 8.4. UpdateUserDto

`src/users/dto/update-user.dto.ts`

```typescript
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
```

`@IsOptional()`은 해당 속성이 `null` 또는 `undefined`인 경우 다른 검증을 건너뜁니다.

이번 예제에서는 별도의 패키지 없이 DTO를 정의했지만, `@nestjs/mapped-types`에서 제공하는 `PartialType()`을 사용하여 생성 DTO의 속성을 선택적으로 변경할 수도 있습니다.

다만 API 문서화를 위해 Swagger Mapped Types를 사용하는 경우에는 `@nestjs/swagger`에서 제공하는 `PartialType()` 사용을 고려해야 합니다.

### 8.5. UsersService

`src/users/users.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './interfaces/user.interface';

@Injectable()
export class UsersService {
  private readonly users: User[] = [];
  private nextId = 1;

  create(createUserDto: CreateUserDto): User {
    const user: User = {
      id: this.nextId++,
      ...createUserDto,
    };

    this.users.push(user);

    return user;
  }

  findAll(): User[] {
    return this.users;
  }

  findOne(id: number): User {
    const user = this.users.find(
      (user) => user.id === id,
    );

    if (!user) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    return user;
  }

  update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): User {
    const user = this.findOne(id);

    Object.assign(user, updateUserDto);

    return user;
  }

  remove(id: number): void {
    const index = this.users.findIndex(
      (user) => user.id === id,
    );

    if (index === -1) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    this.users.splice(index, 1);
  }
}
```

Service는 다음 작업을 담당합니다.

- 사용자 생성 및 저장
- 전체 사용자 조회
- 식별자를 이용한 사용자 조회
- 사용자 정보 수정
- 사용자 삭제
- 존재하지 않는 사용자에 대한 예외 발생

이 예제의 저장소는 프로세스 메모리에 존재하므로 애플리케이션을 재시작하면 데이터가 초기화됩니다.

또한 여러 서버 인스턴스 간에 데이터를 공유하지 않으므로 실제 운영 환경에서는 데이터베이스 등의 영속성 저장소가 필요합니다.

### 8.6. UsersController

`src/users/users.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(
      id,
      updateUserDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
  ): void {
    this.usersService.remove(id);
  }
}
```

`@Controller('users')`는 기본 경로를 `/users`로 설정합니다.

HTTP 메서드 데코레이터와 Handler의 관계는 다음과 같습니다.

| 메서드 | Endpoint | Handler |
|---|---|---|
| POST | `/users` | `create()` |
| GET | `/users` | `findAll()` |
| GET | `/users/:id` | `findOne()` |
| PATCH | `/users/:id` | `update()` |
| DELETE | `/users/:id` | `remove()` |

Controller는 요청 데이터를 추출하고 Service를 호출하는 역할에 집중합니다.

### 8.7. UsersModule

`src/users/users.module.ts`

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

### 8.8. AppModule

`src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

AppModule은 애플리케이션의 Root Module이며, UsersModule을 가져와 사용자 관련 기능을 등록합니다.

### 8.9. Bootstrap

`src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
}

void bootstrap();
```

애플리케이션을 실행합니다.

```bash
npm run start:dev
```

별도의 설정이 없다면 다음 주소에서 API를 사용할 수 있습니다.

```text
http://localhost:3000
```

---

## 9. REST API 요청 및 응답 예제

### 9.1. 사용자 생성

요청:

```http
POST /users HTTP/1.1
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com"
}
```

cURL:

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com"
  }'
```

응답 본문 예시:

```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com"
}
```

HTTP 상태 코드:

```http
201 Created
```

NestJS에서 `@Post()` Handler는 별도 설정이 없다면 기본적으로 `201 Created`를 반환합니다.

### 9.2. 전체 사용자 조회

요청:

```http
GET /users
```

cURL:

```bash
curl http://localhost:3000/users
```

응답 본문 예시:

```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com"
  }
]
```

HTTP 상태 코드:

```http
200 OK
```

### 9.3. 단일 사용자 조회

요청:

```http
GET /users/1
```

cURL:

```bash
curl http://localhost:3000/users/1
```

응답 본문 예시:

```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com"
}
```

존재하지 않는 사용자를 조회하면 Service에서 `NotFoundException`을 발생시킵니다.

### 9.4. 사용자 수정

요청:

```http
PATCH /users/1
Content-Type: application/json

{
  "name": "Alice Updated"
}
```

cURL:

```bash
curl -X PATCH http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Updated"
  }'
```

응답 본문 예시:

```json
{
  "id": 1,
  "name": "Alice Updated",
  "email": "alice@example.com"
}
```

PATCH는 Resource의 일부 속성을 변경하는 데 사용할 수 있습니다.

이번 예제에서는 전달된 속성만 기존 사용자 객체에 반영합니다.

### 9.5. 사용자 삭제

요청:

```http
DELETE /users/1
```

cURL:

```bash
curl -i -X DELETE http://localhost:3000/users/1
```

응답:

```http
204 No Content
```

`204 No Content`는 요청이 성공적으로 처리되었으며 응답 본문이 없음을 의미합니다.

---

## 10. HTTP 응답 처리

NestJS는 기본적으로 Handler의 반환값을 이용하여 HTTP 응답을 생성합니다.

### 10.1. 기본 응답 처리

```typescript
@Get()
findAll() {
  return [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];
}
```

객체나 배열을 반환하면 일반적으로 JSON 응답으로 전송합니다.

다만 문자열이나 기타 반환값의 처리 방식은 NestJS의 응답 처리 규칙 및 HTTP Adapter에 따라 달라질 수 있습니다.

### 10.2. HTTP 상태 코드 지정

`@HttpCode()` 데코레이터를 사용하여 응답 상태 코드를 설정할 수 있습니다.

```typescript
import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

@Controller('tasks')
export class TasksController {
  @Post('execute')
  @HttpCode(HttpStatus.OK)
  execute() {
    return { success: true };
  }
}
```

위 Handler는 기본 POST 응답 코드인 201 대신 200을 반환합니다.

### 10.3. HTTP Header 설정

`@Header()` 데코레이터를 사용하면 응답 헤더를 지정할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  Header,
} from '@nestjs/common';

@Controller('reports')
export class ReportsController {
  @Get()
  @Header('Cache-Control', 'no-store')
  findAll() {
    return [];
  }
}
```

응답 헤더:

```http
Cache-Control: no-store
```

### 10.4. Redirect

`@Redirect()` 데코레이터를 사용하여 다른 URL로 리다이렉트할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  Redirect,
} from '@nestjs/common';

@Controller('docs')
export class DocsController {
  @Get()
  @Redirect('https://docs.nestjs.com', 302)
  redirect() {
    return;
  }
}
```

### 10.5. HTTP Adapter의 Response 객체

NestJS에서는 `@Res()` 데코레이터를 통해 Express 또는 Fastify의 응답 객체에 접근할 수도 있습니다.

다음은 Express 기반 애플리케이션의 예제입니다.

```typescript
import {
  Controller,
  Get,
  Res,
} from '@nestjs/common';

import type { Response } from 'express';

@Controller('users')
export class UsersController {
  @Get()
  findAll(@Res() res: Response) {
    return res.status(200).json([
      { id: 1, name: 'Alice' },
    ]);
  }
}
```

`@Res()`를 기본 방식으로 사용하면 개발자가 응답을 직접 처리해야 하므로 NestJS의 표준 응답 처리 흐름과 차이가 발생합니다.

예를 들어 표준 반환값 처리와 응답 변환용 Interceptor가 기대한 방식으로 작동하지 않을 수 있습니다.

기본 응답 처리를 유지하면서 응답 객체를 참조해야 한다면 다음과 같이 사용할 수 있습니다.

```typescript
@Res({ passthrough: true })
```

일반적인 REST API에서는 가능한 한 NestJS의 표준 응답 처리 방식을 사용하는 것이 좋습니다.

---

## 11. HTTP 상태 코드와 예외 처리

REST API는 요청 처리 결과를 HTTP 상태 코드로 표현합니다.

### 11.1. 주요 HTTP 상태 코드

| 상태 코드 | 명칭 | 사용 목적 |
|---|---|---|
| 200 | OK | 요청이 성공적으로 처리되었습니다. |
| 201 | Created | Resource가 생성되었습니다. |
| 202 | Accepted | 요청이 접수되었지만 처리가 완료되지 않았을 수 있습니다. |
| 204 | No Content | 요청은 성공했으며 응답 본문이 없습니다. |
| 400 | Bad Request | 잘못된 요청입니다. |
| 401 | Unauthorized | 유효한 인증 정보가 필요합니다. |
| 403 | Forbidden | 요청을 수행할 권한이 없습니다. |
| 404 | Not Found | 요청한 Resource를 찾을 수 없습니다. |
| 409 | Conflict | 현재 Resource 상태와 요청이 충돌합니다. |
| 422 | Unprocessable Content | 요청 내용의 의미를 처리할 수 없습니다. |
| 429 | Too Many Requests | 허용된 요청 횟수를 초과했습니다. |
| 500 | Internal Server Error | 서버 내부에서 오류가 발생했습니다. |
| 503 | Service Unavailable | 서버가 일시적으로 요청을 처리할 수 없습니다. |

### 11.2. 내장 HTTP Exception

NestJS는 일반적인 HTTP 오류를 표현하기 위한 Exception 클래스를 제공합니다.

대표적인 예외는 다음과 같습니다.

| Exception | 상태 코드 |
|---|---|
| `BadRequestException` | 400 |
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `ConflictException` | 409 |
| `UnprocessableEntityException` | 422 |
| `TooManyRequestsException` | 429 |
| `InternalServerErrorException` | 500 |
| `ServiceUnavailableException` | 503 |

사용 예제:

```typescript
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class UsersService {
  findOne(id: number) {
    const user = null;

    if (!user) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    return user;
  }
}
```

예외가 발생하면 NestJS의 내장 Exception Filter가 이를 적절한 HTTP 응답으로 처리합니다.

일반적인 기본 응답 형태는 다음과 같습니다.

```json
{
  "message": "User 10 not found",
  "error": "Not Found",
  "statusCode": 404
}
```

다만 예외 생성 시 전달한 응답 객체, 사용자 정의 Exception Filter 및 NestJS 버전에 따라 응답 본문의 형태가 달라질 수 있습니다.

### 11.3. 사용자 정의 HTTP Exception

`HttpException`을 직접 사용하여 상태 코드와 메시지를 정의할 수 있습니다.

```typescript
import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';

throw new HttpException(
  'User operation failed',
  HttpStatus.BAD_REQUEST,
);
```

복잡한 오류 응답을 정의하거나 애플리케이션 전체의 오류 구조를 통일해야 한다면 사용자 정의 Exception과 Exception Filter를 활용할 수 있습니다.

---

## 12. REST API의 요청 처리 흐름

NestJS의 REST API는 Controller만으로 요청을 처리하지 않습니다.

요청은 여러 Lifecycle 구성 요소를 거쳐 처리됩니다.

일반적인 성공 요청의 흐름은 다음과 같습니다.

```text
HTTP Request
    |
    v
Middleware
    |
    v
Guard
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
    v
Controller Result
    |
    v
Interceptor (After)
    |
    v
HTTP Response
```

예외가 발생하는 경우 Exception Filter가 해당 예외를 처리할 수 있습니다.

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 주요 역할 |
|---|---|
| Middleware | 요청 전처리 및 공통 작업 수행 |
| Guard | 인증 및 접근 권한 검사 |
| Interceptor | 요청·응답 처리 확장 및 응답 변환 |
| Pipe | 요청 데이터 변환 및 검증 |
| Controller | 요청 라우팅 및 Handler 실행 |
| Service | 비즈니스 로직 수행 |
| Exception Filter | 예외 처리 및 오류 응답 생성 |

위 흐름은 주요 개념을 이해하기 위한 단순화된 구조입니다.

실제 실행 순서에는 Global, Controller, Route 단위의 적용 범위와 Interceptor의 비동기 처리 방식 등이 영향을 미칩니다.

상세한 내용은 `02-request-lifecycle` 디렉터리의 문서에서 다룹니다.

---

## 13. REST API 버전 관리

API는 시간이 지나면서 요청 구조나 응답 형식이 변경될 수 있습니다.

기존 클라이언트와의 호환성을 유지하면서 새로운 기능을 제공하기 위해 API Versioning을 사용할 수 있습니다.

NestJS는 다음 Versioning 방식을 지원합니다.

| 방식 | 설명 |
|---|---|
| URI Versioning | URI 경로에 버전을 포함합니다. |
| Header Versioning | 사용자 정의 HTTP 헤더를 사용합니다. |
| Media Type Versioning | Accept 헤더의 미디어 타입 파라미터를 사용합니다. |
| Custom Versioning | 사용자 정의 버전 추출 로직을 사용합니다. |

### 13.1. URI Versioning

`src/main.ts`

```typescript
import {
  VersioningType,
} from '@nestjs/common';

app.enableVersioning({
  type: VersioningType.URI,
});
```

Controller에서 버전을 정의합니다.

```typescript
import {
  Controller,
  Get,
  Version,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  @Version('1')
  findV1() {
    return {
      version: 1,
      users: [],
    };
  }

  @Get()
  @Version('2')
  findV2() {
    return {
      version: 2,
      data: {
        users: [],
      },
    };
  }
}
```

각 버전의 Endpoint는 다음과 같습니다.

```http
GET /v1/users
GET /v2/users
```

### 13.2. Global Prefix와 Versioning

API의 공통 Prefix를 지정하려면 다음과 같이 설정할 수 있습니다.

```typescript
app.setGlobalPrefix('api');

app.enableVersioning({
  type: VersioningType.URI,
});
```

최종 Endpoint는 다음과 같습니다.

```http
GET /api/v1/users
GET /api/v2/users
```

URI Versioning에서는 Global Prefix 뒤에 버전 정보가 추가됩니다.

API 버전 관리가 필요하지 않은 애플리케이션에서는 처음부터 Versioning을 활성화할 필요는 없습니다.

버전 도입 여부와 정책은 클라이언트 호환성, API 변경 빈도 및 운영 요구사항을 고려하여 결정해야 합니다.

---

## 14. OpenAPI와 Swagger

NestJS는 OpenAPI Specification 기반의 API 문서 생성을 지원합니다.

이를 위해 `@nestjs/swagger` 패키지를 사용할 수 있습니다.

Swagger UI를 구성하면 브라우저에서 API 명세를 확인하고 요청을 실행할 수 있습니다.

### 14.1. 패키지 설치

```bash
npm install @nestjs/swagger
```

패키지 버전은 프로젝트에서 사용 중인 NestJS 버전과 호환되는 버전을 선택해야 합니다.

### 14.2. Swagger 설정

`src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';

import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Users REST API')
    .setDescription('NestJS REST API Example')
    .setVersion('1.0')
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(
    'api-docs',
    app,
    documentFactory,
  );

  await app.listen(3000);
}

void bootstrap();
```

이 코드는 Swagger 설정을 설명하기 위한 별도 예제입니다. 앞에서 설정한 Global ValidationPipe 등을 사용하는 경우 기존 Bootstrap 코드에 Swagger 설정을 추가해야 합니다.

Swagger UI는 다음 경로에서 확인할 수 있습니다.

```text
http://localhost:3000/api-docs
```

### 14.3. Controller 문서화

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get()
  @ApiOperation({
    summary: '사용자 목록 조회',
  })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
  })
  findAll() {
    return [];
  }
}
```

주요 Swagger 데코레이터는 다음과 같습니다.

| 데코레이터 | 역할 |
|---|---|
| `@ApiTags()` | API 그룹을 분류합니다. |
| `@ApiOperation()` | Endpoint의 설명을 정의합니다. |
| `@ApiResponse()` | HTTP 응답 명세를 정의합니다. |
| `@ApiProperty()` | DTO 속성의 API Schema 정보를 정의합니다. |
| `@ApiBearerAuth()` | Bearer 인증 관련 명세를 추가합니다. |

### 14.4. DTO 문서화

```typescript
import { ApiProperty } from '@nestjs/swagger';

import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Alice',
    description: '사용자 이름',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'alice@example.com',
    description: '이메일 주소',
  })
  @IsEmail()
  email!: string;
}
```

`@ApiProperty()`는 OpenAPI Schema 정보를 정의하는 데 사용합니다.

`class-validator`의 검증 규칙과 OpenAPI 문서화 설정은 서로 다른 목적을 가지므로, API Schema가 정확하게 생성되는지 확인해야 합니다.

---

## 15. REST API 설계 시 고려사항

### 15.1. 일관된 응답 구조

REST API에서는 성공 및 오류 응답의 구조를 일관되게 유지하는 것이 중요합니다.

예를 들어 다음과 같이 응답 구조를 정의할 수 있습니다.

```json
{
  "data": {
    "id": 1,
    "name": "Alice"
  },
  "meta": {
    "requestId": "req-123"
  }
}
```

다만 모든 API에 동일한 응답 Wrapper가 필요한 것은 아닙니다.

Resource 자체를 JSON으로 반환하는 방식도 유효하며, API의 요구사항과 클라이언트 계약에 따라 선택해야 합니다.

### 15.2. 페이지네이션

대량의 Resource를 한 번에 반환하면 서버 메모리 사용량, 네트워크 전송량 및 응답 시간이 증가할 수 있습니다.

일반적으로 다음과 같은 페이지네이션 방식을 사용합니다.

| 방식 | 특징 |
|---|---|
| Offset Pagination | Offset과 Limit을 이용하여 데이터를 조회합니다. |
| Page Pagination | Page 번호와 페이지 크기를 사용합니다. |
| Cursor Pagination | 마지막 조회 위치를 기준으로 다음 데이터를 조회합니다. |
| Keyset Pagination | 정렬 키의 조건을 활용하여 다음 범위의 데이터를 조회합니다. |

예제:

```http
GET /users?page=2&limit=20
```

```http
GET /users?cursor=eyJpZCI6MTAwfQ&limit=20
```

Cursor Pagination과 Keyset Pagination은 구현 방식이 서로 연관될 수 있지만, 반드시 동일한 개념은 아닙니다.

실시간으로 데이터가 추가되는 서비스나 대규모 데이터 조회에서는 안정적인 정렬 기준을 갖춘 Cursor 또는 Keyset 기반 페이지네이션을 고려할 수 있습니다.

### 15.3. 필터링과 정렬

Resource 목록 조회 시 필터링 및 정렬 조건을 제공할 수 있습니다.

```http
GET /users?status=active
GET /users?sort=createdAt&order=desc
```

사용자가 전달한 정렬 필드는 허용 목록을 기준으로 검증하는 것이 좋습니다.

특히 동적 SQL 또는 Query Builder를 사용할 경우 임의의 입력값을 그대로 쿼리 구조에 반영하지 않도록 주의해야 합니다.

### 15.4. 캐싱

REST의 Cacheable 제약 조건을 활용하면 반복적인 조회 요청에 대한 응답 효율을 높일 수 있습니다.

대표적인 HTTP 캐싱 관련 헤더는 다음과 같습니다.

| 헤더 | 역할 |
|---|---|
| `Cache-Control` | 캐시 정책을 지정합니다. |
| `ETag` | Resource 표현의 버전 식별자로 활용할 수 있습니다. |
| `Last-Modified` | Resource가 마지막으로 변경된 시점을 나타냅니다. |
| `If-None-Match` | ETag 기반 조건부 요청에 사용합니다. |
| `If-Modified-Since` | 수정 시각 기반 조건부 요청에 사용합니다. |

ETag를 사용하는 조건부 GET 요청에서는 Resource가 변경되지 않았다면 `304 Not Modified`를 반환할 수 있습니다.

NestJS의 애플리케이션 레벨 캐싱과 HTTP 캐싱은 서로 다른 계층에서 동작하므로 구분하여 설계해야 합니다.

### 15.5. 동시성 제어

동일한 Resource에 여러 클라이언트가 동시에 수정 요청을 전송하면 갱신 충돌이 발생할 수 있습니다.

이를 해결하기 위해 데이터베이스의 Optimistic Locking 또는 HTTP 조건부 요청을 활용할 수 있습니다.

예를 들어 ETag와 `If-Match` 헤더를 사용하여 특정 버전의 Resource에 대해서만 수정을 허용할 수 있습니다.

```http
PATCH /users/1
If-Match: "version-3"
Content-Type: application/json

{
  "name": "Alice Updated"
}
```

서버는 조건이 일치하지 않을 경우 `412 Precondition Failed` 등을 반환할 수 있습니다.

### 15.6. 보안

REST API의 보안을 위해 다음 사항을 고려해야 합니다.

- 인증(Authentication) 및 인가(Authorization)
- HTTPS를 이용한 통신 보호
- 요청 데이터의 검증
- 민감한 정보의 응답 제외
- Rate Limiting
- CORS 정책
- CSRF 보호 필요성 검토
- 로그에서 민감한 정보 마스킹

특히 CORS는 브라우저의 교차 출처 요청을 제어하기 위한 메커니즘이며, API의 인증이나 인가를 대체하지 않습니다.

### 15.7. 운영 및 모니터링

운영 환경에서는 API의 처리 상태를 관찰할 수 있어야 합니다.

대표적인 관찰 지표는 다음과 같습니다.

| 지표 | 목적 |
|---|---|
| Request Rate | 단위 시간당 요청 수 측정 |
| Response Time | API 응답 시간 측정 |
| Error Rate | 오류 발생 비율 측정 |
| Status Code Distribution | HTTP 상태 코드 분포 확인 |
| Throughput | 단위 시간당 처리량 확인 |
| Resource Usage | CPU 및 메모리 사용량 확인 |

필요에 따라 Structured Logging, Distributed Tracing 및 Metrics 수집 기능을 추가할 수 있습니다.

---

## 16. REST API와 다른 통신 방식 비교

NestJS는 REST API 외에도 GraphQL, WebSocket, Microservices, Server-Sent Events 등의 통신 방식을 지원합니다.

| 항목 | REST API | GraphQL | WebSocket | SSE |
|---|---|---|---|---|
| 주요 통신 방식 | HTTP 요청·응답 | 주로 HTTP | 지속 연결 기반 양방향 통신 | HTTP 기반 단방향 이벤트 스트림 |
| 데이터 요청 | Endpoint와 HTTP 메서드 | Query 및 Mutation | 메시지 또는 이벤트 | 서버 이벤트 |
| 서버 Push | 일반 요청·응답 방식만으로는 제공되지 않음 | Subscription 등 별도 메커니즘 필요 | 지원 | 지원 |
| 주요 활용 | CRUD, 일반 웹 API | 유연한 데이터 조회 | 채팅, 실시간 양방향 통신 | 알림, 진행 상태 및 이벤트 전달 |

GraphQL은 Subscription을 통해 실시간 데이터를 처리할 수 있지만, 사용하는 Transport 및 구현 방식에 따라 통신 구조가 달라집니다.

Microservices는 REST API와 직접 대체 관계에 있는 단일 통신 프로토콜이 아니라 애플리케이션을 독립적인 서비스로 구성하는 아키텍처 접근 방식입니다.

NestJS에서는 Microservice Transport를 통해 TCP, Redis, NATS, Kafka 등의 다양한 메시징 방식을 사용할 수 있습니다.

---

## 17. Spring Boot와 NestJS의 REST API 비교

Spring Boot와 NestJS는 모두 Controller 기반의 HTTP API 개발을 지원하지만, 사용하는 언어와 프레임워크 구성 방식에는 차이가 있습니다.

| 항목 | Spring Boot | NestJS |
|---|---|---|
| 언어 | Java / Kotlin | TypeScript / JavaScript |
| Controller 선언 | `@RestController` | `@Controller()` |
| GET 매핑 | `@GetMapping` | `@Get()` |
| POST 매핑 | `@PostMapping` | `@Post()` |
| 요청 Body | `@RequestBody` | `@Body()` |
| Path Variable | `@PathVariable` | `@Param()` |
| Query Parameter | `@RequestParam` | `@Query()` |
| Service 등록 | `@Service` | `@Injectable()` 및 Provider 등록 |
| DI | Spring IoC Container | NestJS DI Container |
| Validation | Jakarta Bean Validation | ValidationPipe 및 검증 라이브러리 |
| 예외 처리 | `@ControllerAdvice` 등 | Exception Filter |
| HTTP 응답 코드 | `ResponseEntity`, `@ResponseStatus` 등 | `@HttpCode()`, `HttpException` 등 |

두 프레임워크 모두 Dependency Injection과 계층 간 책임 분리를 지원합니다.

다만 NestJS의 Module은 Provider의 등록 및 가시성 범위를 정의하는 중요한 구성 요소이므로, Spring Boot의 패키지 구조와 단순히 동일하게 취급해서는 안 됩니다.

---

## 18. 정리

NestJS는 Controller, Provider, Module 및 Dependency Injection을 기반으로 REST API를 구조적으로 개발할 수 있는 기능을 제공합니다.

핵심 사항은 다음과 같습니다.

1. REST는 Resource 중심 인터페이스를 포함한 여러 아키텍처 제약 조건을 정의합니다.
2. HTTP 메서드는 Resource에 수행할 작업의 의미를 표현하며, Safe 및 Idempotent 특성을 구분해야 합니다.
3. NestJS Controller는 HTTP 요청을 수신하고 적절한 Handler로 라우팅합니다.
4. Service는 비즈니스 로직을 담당하며 Controller와 역할을 분리합니다.
5. DTO와 ValidationPipe는 요청 데이터의 구조를 정의하고 런타임 검증을 수행하는 데 활용됩니다.
6. HTTP 상태 코드와 Exception은 API 처리 결과를 일관되게 표현하는 데 사용합니다.
7. Versioning은 API 변경 시 기존 클라이언트와의 호환성을 관리하는 데 활용할 수 있습니다.
8. OpenAPI와 Swagger는 API 명세를 문서화하고 개발자 간 협업을 지원합니다.
9. 페이지네이션, 캐싱, 동시성 제어, 보안 및 모니터링은 운영 환경의 API 설계에서 함께 고려해야 합니다.

REST API 구현 자체는 Controller와 Service만으로도 시작할 수 있지만, 실제 애플리케이션에서는 Validation, Security, Database 및 Exception Handling 등을 결합하여 안정적인 요청 처리 구조를 구성해야 합니다.

---

## 19. 관련 문서

다음 문서를 함께 참고하면 REST API의 구성 요소와 요청 처리 과정을 더 자세하게 이해할 수 있습니다.

| 문서 | 주요 내용 |
|---|---|
| `01-fundamentals/controllers.md` | Controller와 Route Handler |
| `01-fundamentals/providers.md` | Provider 및 Service |
| `01-fundamentals/dependency-injection.md` | Dependency Injection |
| `02-request-lifecycle/pipes.md` | Pipe와 데이터 변환 |
| `02-request-lifecycle/exception-filters.md` | 예외 처리 |
| `02-request-lifecycle/guards.md` | Guard와 접근 제어 |
| `03-techniques/validation.md` | DTO와 요청 데이터 검증 |
| `03-techniques/serialization.md` | 응답 데이터 직렬화 |
| `03-techniques/database.md` | 데이터베이스 연동 |
| `04-security/authentication.md` | 사용자 인증 |
| `04-security/authorization.md` | 접근 권한 제어 |
| `06-testing/e2e-testing.md` | HTTP Endpoint 테스트 |

---

## 참고 자료

### NestJS 공식 문서

- [NestJS — Controllers](https://docs.nestjs.com/controllers)
- [NestJS — Providers](https://docs.nestjs.com/providers)
- [NestJS — Modules](https://docs.nestjs.com/modules)
- [NestJS — Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS — Pipes](https://docs.nestjs.com/pipes)
- [NestJS — Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS — Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [NestJS — Versioning](https://docs.nestjs.com/techniques/versioning)
- [NestJS — OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [NestJS — OpenAPI Types and Parameters](https://docs.nestjs.com/openapi/types-and-parameters)
- [NestJS — OpenAPI Operations](https://docs.nestjs.com/openapi/operations)
- [NestJS — Coming from Spring Boot](https://docs.nestjs.com/recipes/spring-boot)

### HTTP 및 REST 표준

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9111 — HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111)
- [RFC 5789 — PATCH Method for HTTP](https://www.rfc-editor.org/rfc/rfc5789)
- [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Roy Fielding — Architectural Styles and the Design of Network-based Software Architectures](https://ics.uci.edu/~fielding/pubs/dissertation/top.htm)

### API 명세 및 참고 자료

- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [MDN — HTTP Request Methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)
- [MDN — HTTP Response Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)
- [NestJS Official Examples](https://github.com/nestjs/nest/tree/master/sample)