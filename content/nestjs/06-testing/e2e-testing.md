# E2E Testing

## 1. 개요

E2E Testing(End-to-End Testing)은 애플리케이션의 외부 인터페이스를 통해 요청을 전달하고, 여러 구성 요소를 거쳐 반환되는 최종 결과를 검증하는 테스트 방식입니다.

Unit Testing이 개별 함수나 클래스의 동작을 검증하고, Integration Testing이 여러 컴포넌트 간의 연동을 검증한다면, E2E Testing은 실제 사용자가 애플리케이션과 상호작용하는 방식에 가깝게 전체 처리 흐름을 검증합니다.

NestJS에서는 `@nestjs/testing` 패키지로 테스트용 애플리케이션을 생성하고, Supertest 등의 HTTP 테스트 도구로 실제 HTTP 요청을 전달할 수 있습니다.

HTTP API 기반 NestJS 애플리케이션에서는 일반적으로 다음과 같은 처리 흐름을 검증합니다.

```text
             HTTP Client
                  │
                  │ HTTP Request
                  ▼
              HTTP Server
                  │
                  ▼
              Middleware
                  │
                  ▼
                 Guard
                  │
                  ▼
           Interceptor (Pre)
                  │
                  ▼
                 Pipe
                  │
                  ▼
              Controller
                  │
                  ▼
                Service
                  │
                  ▼
              Repository
                  │
                  ▼
               Database
                  │
                  ▼
           Interceptor (Post)
                  │
                  ▼
              HTTP Response
```

위 그림은 정상적인 요청 처리 경로를 단순화한 것입니다.

실제 NestJS Request Lifecycle에서는 Middleware, Guard, Interceptor, Pipe 등이 등록된 위치와 범위에 따라 실행되며, 예외가 발생하면 Exception Filter가 응답 처리에 관여할 수 있습니다.

E2E Testing의 핵심은 **개별 컴포넌트의 구현을 직접 검증하는 것이 아니라, 외부 요청에 대한 애플리케이션의 최종 동작을 검증하는 것**입니다.

### 1.1. E2E Testing의 목적

E2E Testing은 다음과 같은 목적을 가집니다.

- **전체 요청 처리 검증:** HTTP 요청이 올바른 Controller와 Service를 거쳐 처리되는지 확인합니다.
- **Routing 검증:** HTTP Method와 URL에 따라 적절한 Endpoint가 실행되는지 확인합니다.
- **Validation 검증:** 잘못된 요청 데이터가 적절하게 거부되는지 확인합니다.
- **Authentication 검증:** 인증되지 않은 요청에 대한 접근 제한이 정상적으로 동작하는지 확인합니다.
- **Authorization 검증:** 사용자 권한에 따른 접근 제어가 정상적으로 적용되는지 확인합니다.
- **Response 검증:** HTTP Status Code, Header 및 Response Body가 API 계약에 부합하는지 확인합니다.
- **회귀 오류 방지:** 애플리케이션 변경 이후에도 주요 사용자 흐름이 정상적으로 유지되는지 검증합니다.

### 1.2. Unit Testing 및 Integration Testing과의 차이

| 구분 | Unit Testing | Integration Testing | E2E Testing |
|---|---|---|---|
| 주요 목적 | 개별 로직 검증 | 컴포넌트 간 연동 검증 | 전체 요청 흐름 검증 |
| 테스트 대상 | 함수, 클래스 | Service, Repository, Module | 외부 API 및 애플리케이션 |
| 테스트 진입점 | 메서드 직접 호출 | 컴포넌트 직접 호출 | HTTP Request 등 |
| DI Container | 선택적 | 일반적으로 사용 | 일반적으로 사용 |
| HTTP Routing | 검증하지 않음 | 테스트 범위에 따라 다름 | 검증 가능 |
| Middleware / Guard | 일반적으로 제외 | 선택적 | 검증 가능 |
| Database | 일반적으로 Mock | 실제 DB 사용 가능 | 실제 DB 사용 가능 |
| 실행 속도 | 일반적으로 빠름 | 상대적으로 느림 | 일반적으로 가장 느림 |
| 테스트 범위 | 작음 | 중간 | 넓음 |

E2E Testing은 실제 사용자 흐름에 가까운 검증을 수행하지만, 모든 내부 비즈니스 로직을 세밀하게 검증하기에는 적합하지 않을 수 있습니다.

따라서 Unit Testing 및 Integration Testing과 상호 보완적으로 사용하는 것이 좋습니다.

---

## 2. NestJS E2E 테스트 아키텍처

NestJS에서는 `TestingModule`을 사용하여 실제 애플리케이션의 Module 구성을 테스트 환경에 로드할 수 있습니다.

이후 `createNestApplication()`으로 Nest Application을 생성하고, `app.init()`을 호출하여 HTTP 요청을 처리할 수 있는 상태로 초기화합니다.

### 2.1. E2E 테스트 구성 요소

```text
              Vitest
                │
                ▼
            Supertest
                │
                │ HTTP Request
                ▼
        NestJS Application
                │
         ┌──────┴──────┐
         │             │
      AppModule     HTTP Adapter
         │             │
         ▼             │
      Controller ◄──────┘
         │
         ▼
       Service
         │
         ▼
      Repository
         │
         ▼
      Database
```

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| Vitest | 테스트 케이스 실행과 Assertion을 담당합니다. |
| Supertest | HTTP 요청을 생성하고 응답을 검증합니다. |
| TestingModule | NestJS Module과 Provider 의존성을 구성합니다. |
| Nest Application | 애플리케이션의 실제 요청 처리 환경을 제공합니다. |
| HTTP Adapter | HTTP 서버와 NestJS 프레임워크를 연결합니다. |
| Controller | HTTP Routing 및 요청 처리를 담당합니다. |
| Service | 비즈니스 로직을 수행합니다. |
| Repository | 데이터 저장소와의 상호작용을 담당합니다. |

### 2.2. E2E 테스트 실행 과정

```text
       Test.createTestingModule()
                  │
                  ▼
              compile()
                  │
                  ▼
        createNestApplication()
                  │
                  ▼
               app.init()
                  │
                  ▼
       request(app.getHttpServer())
                  │
                  ▼
            HTTP Endpoint
                  │
                  ▼
            Request 처리
                  │
                  ▼
            HTTP Response
                  │
                  ▼
          expect() / Assertion
                  │
                  ▼
              app.close()
```

`createNestApplication()`은 실제 Nest Application 객체를 생성합니다.

`app.init()`은 Module과 Application의 초기화 과정을 수행합니다.

다만 `app.init()`만으로 애플리케이션이 특정 TCP 포트에서 요청을 수신하기 시작하는 것은 아닙니다.

Supertest는 `app.getHttpServer()`를 통해 HTTP 서버 객체를 전달받아 요청을 테스트할 수 있으므로, 일반적인 E2E 테스트에서는 별도로 `app.listen()`을 호출할 필요가 없습니다.

---

## 3. 테스트 환경 구성

### 3.1. 필요한 라이브러리

NestJS에서 HTTP E2E 테스트를 작성할 때 사용할 수 있는 주요 라이브러리는 다음과 같습니다.

| 라이브러리 | 역할 |
|---|---|
| `@nestjs/testing` | TestingModule과 테스트 애플리케이션을 구성합니다. |
| `vitest` | 테스트 실행과 Assertion을 담당합니다. |
| `supertest` | HTTP 요청을 생성하고 응답을 검증합니다. |
| `@types/supertest` | Supertest의 TypeScript 타입을 제공합니다. |
| `@nestjs/platform-express` | Express 기반 HTTP Adapter를 제공합니다. |
| `class-validator` | DTO의 Validation Decorator를 제공합니다. |
| `class-transformer` | 요청 데이터 변환 및 DTO 인스턴스 생성에 사용합니다. |

이 문서에서는 Express 기반 NestJS 애플리케이션을 기준으로 설명합니다.

이미 프로젝트에 관련 패키지가 설치되어 있다면 중복 설치할 필요가 없습니다.

### 3.2. 패키지 설치

테스트 관련 패키지가 없다면 다음 명령어로 설치합니다.

```bash
npm install --save-dev @nestjs/testing vitest supertest @types/supertest
```

Express 기반 HTTP Adapter가 설치되어 있지 않다면 다음 패키지를 설치합니다.

```bash
npm install @nestjs/platform-express
```

DTO Validation 예제에는 다음 패키지가 필요합니다.

```bash
npm install class-validator class-transformer
```

Vitest에서 NestJS의 TypeScript Decorator와 Metadata를 처리하려면 적절한 변환 설정도 필요합니다.

신규 NestJS 프로젝트에 테스트 구성이 생성되어 있다면 해당 설정을 우선적으로 사용합니다.

### 3.3. 테스트 디렉터리 구조

일반적인 디렉터리 구조는 다음과 같습니다.

```text
nestjs-project/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   └── users/
│       ├── dto/
│       │   └── create-user.dto.ts
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.module.ts
│
├── test/
│   ├── users.e2e-spec.ts
│   └── app.e2e-spec.ts
│
├── vitest.config.ts
├── vitest.config.e2e.ts
└── package.json
```

E2E 테스트 파일은 일반적으로 `.e2e-spec.ts` 확장자를 사용합니다.

Unit Testing과 Integration Testing은 각 기능 디렉터리에서 관리하고, E2E Testing은 `test/` 디렉터리에 별도로 배치할 수 있습니다.

NestJS가 반드시 특정 디렉터리 구조를 요구하는 것은 아닙니다.

---

## 4. E2E 테스트 대상 애플리케이션 구현

E2E 테스트의 동작을 이해하기 위해 사용자 등록 및 조회 API를 구현하겠습니다.

이 예제에서는 별도의 데이터베이스 없이 In-Memory 저장소를 사용합니다.

따라서 HTTP Request Lifecycle 전체를 검증할 수 있지만 실제 데이터베이스 영속성은 검증하지 않습니다.

### 4.1. CreateUserDto 정의

```typescript
// src/users/dto/create-user.dto.ts
import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

`CreateUserDto`는 사용자 등록 요청의 데이터를 검증합니다.

- `@IsString()`: 문자열인지 확인합니다.
- `@IsNotEmpty()`: 빈 값인지 확인합니다.

실제 Validation은 `ValidationPipe`가 실행될 때 수행됩니다.

### 4.2. UsersService 구현

```typescript
// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

export interface User {
  id: number;
  name: string;
}

@Injectable()
export class UsersService {
  private readonly users = new Map<number, User>();
  private nextId = 1;

  create(name: string): User {
    const user: User = {
      id: this.nextId++,
      name,
    };

    this.users.set(user.id, user);

    return user;
  }

  findAll(): User[] {
    return Array.from(this.users.values());
  }

  findOne(id: number): User {
    const user = this.users.get(id);

    if (!user) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    return user;
  }
}
```

### 4.3. UsersController 구현

```typescript
// src/users/users.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto.name);
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
}
```

이 Controller에서는 다음 Endpoint를 제공합니다.

| HTTP Method | Endpoint | 기능 |
|---|---|---|
| POST | `/users` | 사용자 등록 |
| GET | `/users` | 전체 사용자 조회 |
| GET | `/users/:id` | 사용자 단건 조회 |

### 4.4. UsersModule 정의

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

### 4.5. AppModule 정의

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';

import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

### 4.6. 애플리케이션 Bootstrap

```typescript
// src/main.ts
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

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

이 예제에서는 `ValidationPipe`를 전역으로 등록합니다.

- `whitelist`: DTO에 Validation Decorator가 없는 속성을 제거합니다.
- `forbidNonWhitelisted`: 허용되지 않은 속성이 있으면 예외를 발생시킵니다.
- `transform`: 요청 데이터를 지정된 DTO 타입에 맞게 변환할 수 있도록 합니다.

`forbidNonWhitelisted`를 사용하는 경우 허용되지 않은 속성은 조용히 제거되지 않고 오류로 처리됩니다.

---

## 5. 기본 E2E 테스트 작성

E2E 테스트에서는 실제 HTTP 요청을 생성하여 Endpoint의 동작을 검증합니다.

### 5.1. 테스트 코드

```typescript
// test/users.e2e-spec.ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';

import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Users API (E2E)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /users - 사용자를 등록해야 합니다.', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Alice',
      })
      .expect(201);

    expect(response.body).toEqual({
      id: 1,
      name: 'Alice',
    });
  });

  it('GET /users - 사용자 목록을 반환해야 합니다.', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Alice',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/users')
      .expect(200);

    expect(response.body).toEqual([
      {
        id: 1,
        name: 'Alice',
      },
    ]);
  });

  it('GET /users/:id - 사용자를 조회해야 합니다.', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Bob',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/users/${created.body.id}`)
      .expect(200);

    expect(response.body).toEqual(created.body);
  });

  it('존재하지 않는 사용자는 404를 반환해야 합니다.', async () => {
    await request(app.getHttpServer())
      .get('/users/999')
      .expect(404);
  });
});
```

### 5.2. 테스트 동작 과정

첫 번째 테스트의 실행 흐름은 다음과 같습니다.

```text
        Vitest Test Case
               │
               ▼
      POST /users Request
               │
               ▼
           HTTP Adapter
               │
               ▼
          ValidationPipe
               │
               ▼
         UsersController
               │
               ▼
          UsersService
               │
               ▼
         User 생성 및 저장
               │
               ▼
         HTTP 201 Response
               │
               ▼
         Supertest expect
               │
               ▼
         Response Body 검증
```

이 테스트는 Controller 메서드를 직접 호출하지 않습니다.

실제 HTTP 요청을 생성하므로 NestJS의 Routing, Validation, Controller 및 Service가 함께 동작하는지 검증합니다.

### 5.3. 테스트별 애플리케이션 생성

앞선 예제에서는 `beforeEach()`에서 새로운 Nest Application을 생성합니다.

따라서 테스트마다 새로운 `UsersService` 인스턴스와 In-Memory 저장소가 생성됩니다.

이 방식을 사용하면 이전 테스트에서 저장한 사용자가 다른 테스트에 영향을 주지 않습니다.

다만 매 테스트마다 애플리케이션을 생성하므로 실행 비용이 증가할 수 있습니다.

실제 데이터베이스를 사용하는 경우에는 새로운 Nest Application을 생성하더라도 데이터베이스에 저장된 데이터가 자동으로 삭제되는 것은 아닙니다.

---

## 6. Supertest를 이용한 HTTP 요청 검증

Supertest는 Node.js HTTP 서버에 요청을 전달하고 응답을 검증하는 라이브러리입니다.

NestJS E2E 테스트에서는 일반적으로 다음 구조로 사용합니다.

```typescript
await request(app.getHttpServer())
  .get('/users')
  .expect(200);
```

### 6.1. 주요 HTTP Method

| 메서드 | 설명 |
|---|---|
| `.get()` | GET 요청을 전송합니다. |
| `.post()` | POST 요청을 전송합니다. |
| `.put()` | PUT 요청을 전송합니다. |
| `.patch()` | PATCH 요청을 전송합니다. |
| `.delete()` | DELETE 요청을 전송합니다. |

### 6.2. Request Body 전달

```typescript
await request(app.getHttpServer())
  .post('/users')
  .send({
    name: 'Alice',
  })
  .expect(201);
```

`.send()`는 HTTP Request Body를 전달합니다.

객체를 전달하면 일반적으로 JSON 요청으로 처리됩니다.

### 6.3. HTTP Header 전달

```typescript
await request(app.getHttpServer())
  .get('/users')
  .set('Authorization', 'Bearer example-token');
```

`.set()`을 사용하면 Authorization, Content-Type 등의 HTTP Header를 설정할 수 있습니다.

### 6.4. Query Parameter 전달

```typescript
await request(app.getHttpServer())
  .get('/users')
  .query({
    page: 1,
    limit: 10,
  });
```

위 요청은 다음과 같은 URL을 대상으로 합니다.

```text
GET /users?page=1&limit=10
```

단, 앞서 작성한 기본 `UsersController`에는 Pagination 기능이 없으므로 위 예제는 Query Parameter 전달 방법을 보여주기 위한 코드입니다.

### 6.5. Response Header 검증

```typescript
await request(app.getHttpServer())
  .get('/users')
  .expect('Content-Type', /json/)
  .expect(200);
```

### 6.6. Response Body 검증

```typescript
const response = await request(app.getHttpServer())
  .get('/users')
  .expect(200);

expect(response.body).toBeInstanceOf(Array);
```

### 6.7. HTTP Status Code 검증

Supertest의 `.expect()`를 사용하면 HTTP Status Code를 검증할 수 있습니다.

```typescript
await request(app.getHttpServer())
  .get('/users/999')
  .expect(404);
```

HTTP Status Code가 예상값과 다르면 테스트가 실패합니다.

---

## 7. Validation E2E 테스트

E2E Testing에서는 실제 HTTP 요청에 대해 ValidationPipe가 정상적으로 실행되는지 검증할 수 있습니다.

Unit Testing에서 Controller 메서드를 직접 호출하면 NestJS의 Pipe가 자동으로 실행되지 않습니다.

반면 E2E Testing에서는 HTTP Request Lifecycle을 통해 Pipe가 실행됩니다.

### 7.1. 정상 요청 검증

```typescript
it('유효한 사용자 정보는 등록되어야 합니다.', async () => {
  await request(app.getHttpServer())
    .post('/users')
    .send({
      name: 'Alice',
    })
    .expect(201);
});
```

### 7.2. 잘못된 데이터 타입 검증

```typescript
it('name이 문자열이 아니면 400을 반환해야 합니다.', async () => {
  const response = await request(app.getHttpServer())
    .post('/users')
    .send({
      name: 123,
    })
    .expect(400);

  expect(response.body.statusCode).toBe(400);
});
```

`CreateUserDto`의 `@IsString()` 조건을 만족하지 않으므로 ValidationPipe에서 `BadRequestException`이 발생합니다.

### 7.3. 필수값 누락 검증

```typescript
it('name이 없으면 400을 반환해야 합니다.', async () => {
  await request(app.getHttpServer())
    .post('/users')
    .send({})
    .expect(400);
});
```

### 7.4. 허용되지 않은 속성 검증

```typescript
it('DTO에 정의되지 않은 속성은 거부해야 합니다.', async () => {
  await request(app.getHttpServer())
    .post('/users')
    .send({
      name: 'Alice',
      role: 'admin',
    })
    .expect(400);
});
```

`forbidNonWhitelisted: true` 설정에 따라 DTO에서 허용하지 않은 `role` 속성이 전달되면 오류가 발생합니다.

### 7.5. Path Parameter 검증

```typescript
it('숫자가 아닌 사용자 ID는 400을 반환해야 합니다.', async () => {
  await request(app.getHttpServer())
    .get('/users/invalid')
    .expect(400);
});
```

`UsersController`의 `ParseIntPipe`가 문자열을 숫자로 변환할 수 없으므로 400 응답을 반환합니다.

이처럼 E2E Testing에서는 DTO Validation과 Parameter Transformation을 실제 HTTP 요청으로 검증할 수 있습니다.

---

## 8. Authentication E2E 테스트

Authentication은 요청을 보낸 사용자의 신원을 확인하는 과정입니다.

NestJS에서는 일반적으로 Guard를 사용하여 인증 여부를 확인합니다.

E2E Testing에서는 인증된 사용자와 인증되지 않은 사용자의 요청을 각각 검증해야 합니다.

### 8.1. 인증 처리 흐름

```text
            HTTP Request
                  │
                  ▼
          Authorization Header
                  │
                  ▼
              AuthGuard
                  │
          ┌───────┴───────┐
          │               │
          ▼               ▼
       인증 성공        인증 실패
          │               │
          ▼               ▼
      Controller       HTTP 401
          │
          ▼
      HTTP 200
```

### 8.2. 인증되지 않은 요청 검증

다음 예제는 `/profile` Endpoint에 실제 인증 Guard가 적용되어 있고, 인증 정보가 없으면 401을 반환하도록 구현되어 있다고 가정합니다.

```typescript
it('인증 정보가 없으면 401을 반환해야 합니다.', async () => {
  await request(app.getHttpServer())
    .get('/profile')
    .expect(401);
});
```

### 8.3. 인증된 요청 검증

JWT 기반 Authentication이 구현되어 있다면 실제 로그인 Endpoint에서 Access Token을 발급받아 사용할 수 있습니다.

```typescript
it('인증된 사용자는 프로필을 조회할 수 있어야 합니다.', async () => {
  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email: 'test@example.com',
      password: 'test-password',
    })
    .expect(200);

  const accessToken = loginResponse.body.accessToken;

  const response = await request(app.getHttpServer())
    .get('/profile')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  expect(response.body).toHaveProperty('id');
});
```

위 코드는 인증 기능이 구현된 애플리케이션을 위한 확장 예제이며, 앞서 작성한 기본 Users API만으로는 실행되지 않습니다.

실제 프로젝트에서는 테스트 사용자 계정을 준비하고, 로그인 및 토큰 발급 기능이 정상적으로 구현되어 있어야 합니다.

### 8.4. 인증 테스트 시 고려사항

- 인증되지 않은 요청이 올바르게 차단되는지 확인합니다.
- 유효한 인증 정보로 요청하면 정상 처리되는지 확인합니다.
- 만료된 Token을 거부하는지 확인합니다.
- 잘못된 서명이나 형식의 Token을 거부하는지 확인합니다.
- 인증 정보를 다른 사용자의 정보로 위조할 수 없는지 확인합니다.

Authentication E2E 테스트에서는 Guard를 Mock으로 대체하지 않고 실제 인증 흐름을 검증하는 것이 일반적으로 더 유용합니다.

다만 인증 시스템 자체가 테스트 범위 밖이라면 일부 외부 인증 의존성을 대체할 수 있습니다.

---

## 9. Authorization E2E 테스트

Authorization은 인증된 사용자가 특정 리소스 또는 기능에 접근할 권한이 있는지 확인하는 과정입니다.

예를 들어 관리자만 접근할 수 있는 API가 있다고 가정하겠습니다.

```text
             HTTP Request
                   │
                   ▼
               AuthGuard
                   │
                   ▼
              RolesGuard
                   │
           ┌───────┴───────┐
           │               │
           ▼               ▼
       권한 있음        권한 없음
           │               │
           ▼               ▼
       Controller       HTTP 403
           │
           ▼
        HTTP 200
```

### 9.1. 권한이 없는 사용자

```typescript
it('일반 사용자는 관리자 API에 접근할 수 없어야 합니다.', async () => {
  await request(app.getHttpServer())
    .get('/admin')
    .set('Authorization', `Bearer ${userAccessToken}`)
    .expect(403);
});
```

### 9.2. 권한이 있는 사용자

```typescript
it('관리자는 관리자 API에 접근할 수 있어야 합니다.', async () => {
  await request(app.getHttpServer())
    .get('/admin')
    .set('Authorization', `Bearer ${adminAccessToken}`)
    .expect(200);
});
```

위 코드의 `userAccessToken` 및 `adminAccessToken`은 테스트용 사용자와 관리자 계정에서 발급받은 유효한 Token이라고 가정합니다.

또한 `/admin` Endpoint에 인증 및 역할 기반 인가 기능이 구현되어 있어야 합니다.

일반적으로 인증 정보가 없거나 유효하지 않은 경우에는 401, 인증은 성공했지만 권한이 부족한 경우에는 403을 반환하도록 구성합니다.

다만 정확한 응답은 애플리케이션의 인증 및 인가 정책에 따라 달라질 수 있습니다.

---

## 10. Exception Handling E2E 테스트

NestJS는 Exception Filter를 통해 애플리케이션에서 발생한 예외를 HTTP Response로 변환할 수 있습니다.

E2E Testing에서는 이러한 예외 처리가 실제 HTTP 응답에 올바르게 반영되는지 검증합니다.

### 10.1. NotFoundException 검증

```typescript
it('존재하지 않는 사용자는 404를 반환해야 합니다.', async () => {
  const response = await request(app.getHttpServer())
    .get('/users/999')
    .expect(404);

  expect(response.body).toMatchObject({
    statusCode: 404,
    error: 'Not Found',
  });
});
```

앞서 작성한 `UsersService`에서는 사용자가 존재하지 않으면 다음 예외를 발생시킵니다.

```typescript
throw new NotFoundException(
  `User ${id} not found`,
);
```

NestJS의 기본 Exception Filter는 해당 예외를 HTTP 404 응답으로 변환합니다.

### 10.2. 예외 응답 메시지 검증

```typescript
it('존재하지 않는 사용자에 대한 오류 메시지를 반환해야 합니다.', async () => {
  const response = await request(app.getHttpServer())
    .get('/users/999')
    .expect(404);

  expect(response.body.message).toBe(
    'User 999 not found',
  );
});
```

### 10.3. Custom Exception Filter 검증

Custom Exception Filter를 사용하는 경우 응답 구조가 달라질 수 있습니다.

예를 들어 공통 오류 응답이 다음 구조로 정의되어 있다고 가정하겠습니다.

```json
{
  "code": "USER_NOT_FOUND",
  "message": "User 999 not found",
  "status": 404
}
```

이러한 응답 구조를 사용한다면 E2E 테스트에서도 해당 API 계약을 검증해야 합니다.

다만 위 JSON은 Custom Exception Filter가 구현된 애플리케이션의 예시이며, NestJS의 기본 오류 응답 형식은 아닙니다.

---

## 11. Interceptor 및 Response Transformation 테스트

NestJS의 Interceptor는 Controller 실행 전후에 동작하며 요청 처리와 응답 변환에 관여할 수 있습니다.

예를 들어 API Response를 다음과 같은 공통 형식으로 변환하는 Interceptor가 있다고 가정하겠습니다.

```json
{
  "data": {
    "id": 1,
    "name": "Alice"
  }
}
```

### 11.1. Response Transformation 검증

```typescript
it('응답 데이터가 공통 Response 형식으로 반환되어야 합니다.', async () => {
  const response = await request(app.getHttpServer())
    .get('/users/1')
    .expect(200);

  expect(response.body).toHaveProperty('data');
  expect(response.body.data).toHaveProperty('id');
});
```

이 테스트를 실행하려면 실제 애플리케이션에 해당 Response Transformation Interceptor가 등록되어 있어야 합니다.

기본 Users API에서는 Interceptor를 구현하지 않았으므로 이 테스트는 확장 예제에 해당합니다.

### 11.2. Interceptor 테스트 시 고려사항

- 응답 데이터가 의도한 형식으로 변환되는지 확인합니다.
- 민감한 데이터가 응답에서 제외되는지 확인합니다.
- 예외 발생 시 Interceptor가 의도한 방식으로 동작하는지 확인합니다.
- Cache Interceptor를 사용하는 경우 캐시 정책이 적용되는지 확인합니다.

Interceptor의 내부 구현을 세밀하게 검증하는 것은 Unit Testing에서 수행하고, 실제 HTTP Response에 적용되는 결과는 E2E Testing에서 검증할 수 있습니다.

---

## 12. Global Configuration과 테스트 환경

E2E 테스트에서는 실제 운영 애플리케이션에 적용되는 전역 설정을 테스트 환경에도 적용하는 것이 중요합니다.

대표적인 전역 설정은 다음과 같습니다.

- Global Prefix
- ValidationPipe
- Global Guard
- Global Interceptor
- Global Exception Filter
- CORS
- Versioning

### 12.1. main.ts와 E2E 설정의 차이

다음과 같이 `main.ts`에서만 Global Prefix를 등록했다고 가정하겠습니다.

```typescript
app.setGlobalPrefix('api');
```

하지만 E2E 테스트에서는 별도의 Nest Application을 생성합니다.

따라서 테스트 애플리케이션에 동일한 설정을 적용하지 않으면 실제 애플리케이션과 다른 URL이 사용될 수 있습니다.

### 12.2. 공통 애플리케이션 설정 분리

전역 설정을 별도 함수로 분리하면 운영 애플리케이션과 테스트 애플리케이션에서 재사용할 수 있습니다.

```typescript
// src/app.config.ts
import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';

export function configureApp(
  app: INestApplication,
): void {
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
```

`main.ts`에서는 다음과 같이 사용합니다.

```typescript
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApp } from './app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

E2E 테스트에서도 동일한 함수를 호출합니다.

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
}).compile();

app = moduleRef.createNestApplication();

configureApp(app);

await app.init();
```

이 경우 테스트에서 사용하는 Endpoint는 다음과 같이 변경됩니다.

```text
POST /api/users
GET  /api/users
GET  /api/users/:id
```

전역 설정은 `app.init()` 이전에 적용해야 합니다.

다만 `main.ts` 외부에서 별도로 등록되는 Middleware 또는 다른 Bootstrap 설정도 실제 테스트 환경에 필요한 경우 동일하게 적용해야 합니다.

또한 Module 내부에 `APP_GUARD`, `APP_INTERCEPTOR`, `APP_FILTER` 등의 토큰으로 등록된 전역 구성 요소는 해당 Module을 Import하면 테스트 환경에도 포함될 수 있습니다.

---

## 13. Mock Provider를 활용한 E2E 테스트

E2E Testing에서는 실제 애플리케이션의 요청 처리 흐름을 유지하면서 일부 외부 의존성만 Mock으로 대체할 수 있습니다.

예를 들어 사용자 API가 외부 메시지 전송 서비스와 연동된다고 가정하겠습니다.

```text
             HTTP Request
                   │
                   ▼
            UsersController
                   │
                   ▼
              UsersService
                   │
            ┌──────┴──────┐
            ▼             ▼
        Repository    EmailService
            │             │
            ▼             ▼
         Database     External API
```

테스트 환경에서는 실제 Email API를 호출하지 않도록 `EmailService`를 Mock으로 대체할 수 있습니다.

### 13.1. Provider Override

```typescript
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';

const mockEmailService = {
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
};

const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(EmailService)
  .useValue(mockEmailService)
  .compile();
```

이 예제는 `EmailService`가 실제 `AppModule`의 의존성 그래프에 Provider로 등록되어 있다고 가정합니다.

또한 사용자 등록 과정에서 해당 Service를 호출하도록 구현되어 있어야 합니다.

### 13.2. Mock 사용 시 주의사항

Mock Provider를 사용하더라도 HTTP 요청이 Controller 및 Service를 거쳐 처리되는 흐름은 검증할 수 있습니다.

하지만 Mock으로 대체한 외부 서비스의 실제 동작은 검증되지 않습니다.

따라서 E2E 테스트는 검증 범위에 따라 다음과 같이 구분할 수 있습니다.

| 방식 | 설명 |
|---|---|
| 실제 의존성 기반 E2E | 가능한 범위에서 실제 구성 요소를 사용합니다. |
| 부분 Mock 기반 E2E | 전체 요청 흐름을 유지하면서 일부 외부 의존성을 대체합니다. |

실제 결제 API, 이메일 발송 API 등의 외부 시스템은 테스트 비용과 부작용을 고려하여 Sandbox 환경이나 Mock 서버를 사용하는 것이 적절할 수 있습니다.

Provider Override의 세부적인 사용법은 `mocking-providers.md` 문서에서 다룹니다.

---

## 14. 데이터베이스 기반 E2E 테스트

실무에서는 API 요청을 통해 데이터를 저장한 다음, 후속 요청에서 해당 데이터를 조회하거나 수정하는 흐름을 검증해야 하는 경우가 많습니다.

예를 들어 사용자 등록 API의 E2E 테스트는 다음과 같은 흐름을 검증할 수 있습니다.

```text
          POST /users
               │
               ▼
         UsersController
               │
               ▼
          UsersService
               │
               ▼
         UsersRepository
               │
               ▼
          Test Database
               │
               ▼
          HTTP 201
               │
               ▼
          GET /users/1
               │
               ▼
          HTTP 200
```

### 14.1. 데이터베이스 환경 분리

운영 데이터베이스와 테스트 데이터베이스는 반드시 분리해야 합니다.

```text
Production Database
        │
        └── app_db

Test Database
        │
        └── app_test_db
```

실제 데이터베이스를 사용하는 경우 테스트 환경에서는 다음 작업이 필요합니다.

1. 테스트 데이터베이스를 준비합니다.
2. 필요한 Schema 및 Migration을 적용합니다.
3. 테스트 데이터를 초기화합니다.
4. E2E 테스트를 실행합니다.
5. 테스트 데이터와 외부 리소스를 정리합니다.

### 14.2. API 요청을 통한 데이터 생성

```typescript
it('사용자 등록 후 조회가 가능해야 합니다.', async () => {
  const createResponse = await request(app.getHttpServer())
    .post('/users')
    .send({
      name: 'Alice',
    })
    .expect(201);

  const userId = createResponse.body.id;

  const findResponse = await request(app.getHttpServer())
    .get(`/users/${userId}`)
    .expect(200);

  expect(findResponse.body).toMatchObject({
    id: userId,
    name: 'Alice',
  });
});
```

이 예제는 앞서 구현한 In-Memory Service에서도 실행할 수 있습니다.

실제 데이터베이스를 사용하는 애플리케이션에서는 Service와 Repository 구현을 실제 DB에 연결하여 동일한 HTTP 시나리오를 검증할 수 있습니다.

단, In-Memory 저장소를 사용하는 경우 실제 데이터베이스의 영속성이나 제약조건은 검증되지 않습니다.

### 14.3. 테스트 데이터 초기화

테스트 데이터베이스를 사용하는 경우 테스트 사이에 데이터가 남지 않도록 관리해야 합니다.

대표적인 전략은 다음과 같습니다.

| 전략 | 설명 |
|---|---|
| 테스트별 데이터 삭제 | 테스트 실행 전후에 관련 데이터를 삭제합니다. |
| 트랜잭션 롤백 | 같은 트랜잭션에서 실행한 변경사항을 롤백합니다. |
| Schema 초기화 | 테스트용 Schema를 재생성합니다. |
| 독립된 데이터베이스 | 테스트 실행 단위마다 별도 DB를 사용합니다. |
| Testcontainers | 컨테이너 기반 데이터베이스를 준비합니다. |

트랜잭션 롤백은 모든 데이터베이스 작업이 동일한 트랜잭션에 참여하도록 구성된 경우에만 효과적으로 적용할 수 있습니다.

HTTP 요청 처리 중 생성된 별도의 DB 연결이나 트랜잭션은 테스트 코드의 트랜잭션과 자동으로 공유되지 않습니다.

따라서 E2E 테스트에서는 별도의 테스트 데이터베이스를 사용하고 명시적으로 데이터를 정리하는 방식이 이해하기 쉽고 안정적일 수 있습니다.

---

## 15. Testcontainers 기반 E2E 테스트

Testcontainers를 사용하면 테스트 실행 시 실제 데이터베이스 컨테이너를 생성할 수 있습니다.

PostgreSQL, MySQL, Redis 등과 같은 외부 시스템을 테스트 전용 컨테이너로 실행할 수 있습니다.

### 15.1. 테스트 구조

```text
                Vitest
                  │
                  ▼
               Supertest
                  │
                  ▼
           NestJS Application
                  │
                  ▼
              Repository
                  │
                  ▼
        PostgreSQL Testcontainer
                  │
                  ▼
              Test Data
```

### 15.2. PostgreSQL 컨테이너 생성

PostgreSQL Testcontainers 모듈이 설치되어 있지 않다면 다음 명령어로 설치합니다.

```bash
npm install --save-dev @testcontainers/postgresql
```

다음은 컨테이너를 생성하는 예제입니다.

```typescript
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer(
    'postgres:16-alpine',
  )
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_password')
    .start();
});

afterAll(async () => {
  await container.stop();
});
```

생성된 컨테이너의 연결 정보는 다음과 같이 가져올 수 있습니다.

```typescript
const host = container.getHost();
const port = container.getPort();
const username = container.getUsername();
const password = container.getPassword();
const database = container.getDatabase();
```

이 연결 정보를 테스트 애플리케이션의 데이터베이스 설정에 전달하면 실제 데이터베이스와 연결된 E2E 테스트를 구성할 수 있습니다.

컨테이너를 시작한 이후에는 Migration 등을 적용하고 Nest Application을 생성해야 합니다.

또한 `beforeAll()`에서 컨테이너를 시작하고 `afterAll()`에서 종료하는 경우, 테스트 실패 상황에서도 리소스가 적절하게 정리되도록 구성해야 합니다.

컨테이너 기반 테스트는 별도 서버 없이 테스트 데이터베이스를 제공할 수 있지만, 컨테이너 생성 비용과 초기화 시간이 발생한다는 점을 고려해야 합니다.

---

## 16. E2E 테스트 Lifecycle 관리

E2E 테스트는 일반적으로 테스트 애플리케이션을 생성하고 초기화한 다음, HTTP 요청을 실행하고 애플리케이션을 종료하는 순서로 진행합니다.

### 16.1. 주요 Lifecycle Hook

| Hook | 실행 시점 | 주요 용도 |
|---|---|---|
| `beforeAll()` | 테스트 그룹 시작 전 한 번 | 애플리케이션 및 외부 리소스 생성 |
| `beforeEach()` | 각 테스트 시작 전 | 테스트 데이터 초기화 |
| `afterEach()` | 각 테스트 종료 후 | 테스트 데이터 정리 |
| `afterAll()` | 테스트 그룹 종료 후 한 번 | 애플리케이션 및 연결 종료 |

### 16.2. 애플리케이션 재사용

테스트마다 애플리케이션을 생성하지 않고 하나의 Nest Application을 공유할 수 있습니다.

```typescript
describe('Users API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // 테스트 케이스 작성
});
```

이 방식은 테스트 실행 시간을 단축할 수 있습니다.

하지만 모든 테스트가 동일한 Singleton Provider 및 외부 리소스를 공유할 수 있습니다.

따라서 각 테스트 실행 전에 상태를 초기화하거나 독립된 테스트 데이터를 사용해야 합니다.

### 16.3. app.close()의 역할

`app.close()`는 Nest Application의 종료 절차를 수행합니다.

이 과정에서 NestJS의 종료 Lifecycle Hook이 실행될 수 있으며, 프레임워크가 관리하는 리소스를 정리할 수 있습니다.

다만 테스트 코드가 별도로 생성한 Docker 컨테이너, 독립 DB 연결 또는 외부 서버까지 자동으로 종료되는 것은 아닙니다.

이러한 리소스는 테스트 코드에서 명시적으로 정리해야 합니다.

---

## 17. Fastify 기반 E2E 테스트

NestJS는 Express 외에도 Fastify 등의 HTTP Adapter를 지원합니다.

Fastify 기반 애플리케이션은 `@nestjs/platform-fastify` 패키지에서 제공하는 `FastifyAdapter`를 사용할 수 있습니다.

### 17.1. Fastify E2E 테스트 구조

```typescript
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';

const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
}).compile();

const app = moduleRef.createNestApplication<NestFastifyApplication>(
  new FastifyAdapter(),
);

await app.init();
await app.getHttpAdapter().getInstance().ready();
```

### 17.2. Fastify inject() 사용

Fastify에서는 `inject()`을 사용하여 테스트 요청을 전달할 수 있습니다.

```typescript
const response = await app.inject({
  method: 'GET',
  url: '/users',
});

expect(response.statusCode).toBe(200);
```

Fastify의 `inject()`은 네트워크 포트를 직접 열지 않고 요청을 주입하여 HTTP 처리 흐름을 검증할 수 있도록 지원합니다.

테스트가 종료되면 다음과 같이 애플리케이션을 종료합니다.

```typescript
await app.close();
```

Express와 Fastify는 HTTP Adapter의 동작 및 일부 플러그인 구성이 다르므로, 운영 환경에서 사용하는 Adapter와 동일한 Adapter를 테스트 환경에서도 사용하는 것이 중요합니다.

---

## 18. E2E 테스트 실행

E2E 테스트는 일반적으로 Unit Testing과 분리하여 실행합니다.

실제 데이터베이스나 외부 시스템을 사용하는 경우 실행 비용이 크기 때문에 별도의 테스트 명령어를 제공하는 것이 좋습니다.

### 18.1. Vitest E2E 설정

다음은 Vitest와 SWC를 사용하는 E2E 테스트 설정 예제입니다.

추가 패키지가 필요하다면 다음 명령어로 설치합니다.

```bash
npm install --save-dev unplugin-swc @swc/core
```

```typescript
// vitest.config.e2e.ts
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    swc.vite({
      module: {
        type: 'es6',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: [
      'test/**/*.e2e-spec.ts',
    ],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
```

NestJS의 Decorator 및 Metadata가 올바르게 변환되도록 프로젝트의 TypeScript와 SWC 설정을 함께 확인해야 합니다.

TypeScript의 Decorator 기반 DI를 사용하는 경우 `experimentalDecorators` 및 `emitDecoratorMetadata` 설정이 중요하며, SWC를 사용하는 경우에도 이에 대응하는 변환 설정이 필요합니다.

특히 NestJS CLI가 생성한 프로젝트에서는 이미 제공되는 설정을 우선 사용하고, 필요한 부분만 수정하는 것이 좋습니다.

### 18.2. package.json 설정

```json
{
  "scripts": {
    "test:e2e": "vitest run --config vitest.config.e2e.ts",
    "test:e2e:watch": "vitest --config vitest.config.e2e.ts"
  }
}
```

### 18.3. E2E 테스트 실행

```bash
npm run test:e2e
```

### 18.4. Watch Mode 실행

```bash
npm run test:e2e:watch
```

Watch Mode에서는 관련 파일이 변경되면 테스트를 다시 실행할 수 있습니다.

다만 테스트 실행 과정에서 데이터베이스나 외부 리소스가 변경되는 경우 반복 실행으로 인해 상태가 누적되지 않도록 주의해야 합니다.

### 18.5. Jest 기반 프로젝트

CommonJS 기반 NestJS 프로젝트 등에서는 Jest를 사용할 수 있습니다.

이 경우 테스트의 구조는 거의 동일하며, Vitest의 Mock API를 Jest API로 변경하여 사용할 수 있습니다.

예를 들어 `vi.fn()` 대신 `jest.fn()`을 사용합니다.

테스트 실행 스크립트와 설정 파일은 프로젝트에 구성된 Jest 환경에 맞게 작성해야 합니다.

---

## 19. CI/CD 환경에서의 E2E 테스트

E2E 테스트는 CI/CD 파이프라인에서 애플리케이션 배포 이전의 품질 검증 단계로 활용할 수 있습니다.

일반적으로 다음 순서로 구성합니다.

```text
           Source Checkout
                  │
                  ▼
         Dependency Install
                  │
                  ▼
            Type Checking
                  │
                  ▼
             Unit Testing
                  │
                  ▼
         Integration Testing
                  │
                  ▼
        Test Environment 준비
                  │
                  ▼
         Database Migration
                  │
                  ▼
              E2E Testing
                  │
                  ▼
          Test Result 확인
                  │
             ┌────┴────┐
             │         │
             ▼         ▼
           성공       실패
             │         │
             ▼         ▼
        Build/Deploy  Pipeline 실패
```

### 19.1. CI 환경에서 고려할 사항

**테스트 환경 분리**

운영 환경과 테스트 환경의 데이터베이스 및 외부 서비스 연결을 분리해야 합니다.

**테스트 데이터 초기화**

테스트 실행 전후에 데이터를 정리하여 이전 실행 결과에 영향을 받지 않도록 구성해야 합니다.

**환경변수 관리**

Database URL, API Key 및 Secret 등의 정보는 CI 플랫폼의 Secret 관리 기능을 사용합니다.

**외부 시스템 준비**

PostgreSQL, Redis 등의 외부 시스템을 사용하는 경우 테스트 실행 전에 해당 시스템이 준비되어 있어야 합니다.

**Timeout 관리**

애플리케이션 초기화 및 외부 시스템 연결에 필요한 시간을 고려하여 적절한 Timeout을 설정해야 합니다.

**테스트 결과 관리**

실패한 테스트 케이스와 오류 로그를 확인할 수 있도록 테스트 리포트를 생성할 수 있습니다.

### 19.2. 배포 전 품질 검증

E2E 테스트가 성공했다고 해서 실제 운영 환경의 모든 문제가 제거되는 것은 아닙니다.

테스트 환경과 운영 환경의 네트워크, 데이터, 인프라 구성 및 트래픽 조건이 다를 수 있기 때문입니다.

따라서 E2E Testing은 배포 전 품질 검증의 중요한 단계이지만, 운영 환경의 Health Check와 Monitoring을 대체하지는 않습니다.

---

## 20. E2E 테스트 설계 원칙

### 20.1. 주요 사용자 흐름을 중심으로 작성합니다

E2E 테스트는 모든 내부 메서드를 검증하기보다 실제 사용자가 수행하는 주요 작업을 중심으로 작성하는 것이 좋습니다.

예를 들어 다음 시나리오를 검증할 수 있습니다.

- 사용자 회원가입
- 로그인 및 Access Token 발급
- 인증된 사용자 정보 조회
- 상품 주문 생성
- 주문 상태 조회
- 권한이 없는 사용자의 접근 거부

### 20.2. 정상 흐름과 예외 흐름을 모두 검증합니다

정상적으로 요청을 처리하는 경우뿐만 아니라 Validation 실패, Authentication 실패 및 Authorization 실패 등도 검증해야 합니다.

### 20.3. HTTP API 계약을 중심으로 검증합니다

E2E 테스트에서는 내부 구현 방식보다 외부에 노출된 API 계약을 검증하는 것이 중요합니다.

주요 검증 항목은 다음과 같습니다.

- HTTP Method
- URL 및 Path Parameter
- Query Parameter
- Request Body
- HTTP Status Code
- Response Header
- Response Body
- Error Response

### 20.4. 테스트 간 독립성을 보장합니다

각 테스트는 다른 테스트의 실행 순서나 데이터에 의존하지 않아야 합니다.

특히 데이터베이스를 공유하는 경우 테스트별 데이터 격리 전략을 적용해야 합니다.

### 20.5. 외부 시스템 의존성을 관리합니다

외부 API를 무조건 실제로 호출하면 테스트가 네트워크 상태나 외부 서비스 장애에 영향을 받을 수 있습니다.

따라서 검증하려는 범위에 따라 Sandbox API, Mock Server 또는 Testcontainers 등을 사용할 수 있습니다.

### 20.6. 테스트 실행 비용을 고려합니다

E2E 테스트는 애플리케이션 초기화와 외부 시스템 실행 등의 비용이 발생할 수 있습니다.

따라서 핵심 사용자 흐름은 E2E Testing으로 검증하고, 세부 비즈니스 로직은 Unit Testing으로 검증하는 방식이 효율적입니다.

### 20.7. 운영 환경과 테스트 환경의 차이를 최소화합니다

실제 애플리케이션에서 사용하는 Global Pipe, Guard, Interceptor, Exception Filter 및 HTTP Adapter를 테스트 환경에서도 동일하게 적용하는 것이 좋습니다.

다만 테스트 환경에서는 외부 시스템과 데이터베이스 연결 정보를 분리해야 합니다.

---

## 21. E2E Testing의 한계

E2E Testing은 실제 사용자 요청에 가까운 흐름을 검증할 수 있지만 다음과 같은 한계가 있습니다.

### 21.1. 실행 시간이 길어질 수 있습니다

Nest Application 초기화, 데이터베이스 연결 및 외부 시스템 준비 과정으로 인해 Unit Testing보다 실행 시간이 길어질 수 있습니다.

### 21.2. 실패 원인 분석이 어려울 수 있습니다

E2E 테스트에서는 여러 계층이 함께 실행되므로 테스트가 실패하더라도 문제의 원인이 Controller, Service, Repository 또는 외부 시스템 중 어디에 있는지 즉시 파악하기 어려울 수 있습니다.

### 21.3. 외부 환경에 영향을 받을 수 있습니다

외부 API와 데이터베이스를 사용하는 테스트는 네트워크 지연, 리소스 부족 및 환경 구성 차이로 인해 불안정해질 수 있습니다.

### 21.4. 모든 내부 로직을 검증하기 어렵습니다

E2E 테스트만으로 모든 조건 분기와 예외 처리를 세밀하게 검증하려면 많은 테스트 케이스가 필요할 수 있습니다.

따라서 내부 로직 검증은 Unit Testing으로 보완하는 것이 적절합니다.

### 21.5. 실제 운영 환경을 완전히 재현하지는 못합니다

Supertest를 사용하는 E2E 테스트는 애플리케이션의 HTTP 처리 흐름을 검증하지만, 실제 운영 환경의 Load Balancer, Ingress, TLS Termination 및 네트워크 인프라 전체를 자동으로 검증하지는 않습니다.

이러한 구성까지 확인하려면 배포 환경을 대상으로 하는 별도의 테스트가 필요합니다.

---

## 22. 정리

NestJS의 E2E Testing은 실제 HTTP 요청을 사용하여 애플리케이션의 전체 요청 처리 흐름을 검증하는 테스트 방식입니다.

`@nestjs/testing`의 `TestingModule`과 `createNestApplication()`을 사용하여 테스트용 Nest Application을 생성하고, Supertest를 통해 HTTP Request와 Response를 검증할 수 있습니다.

E2E Testing은 Routing, Validation, Authentication, Authorization, Exception Handling 및 Response Transformation 등 여러 구성 요소의 동작을 하나의 요청 흐름에서 확인할 수 있다는 장점이 있습니다.

핵심 개념은 다음과 같습니다.

| 개념 | 설명 |
|---|---|
| E2E Testing | 외부 요청을 통해 애플리케이션 전체 동작을 검증합니다. |
| TestingModule | 테스트용 NestJS Module과 DI 컨테이너를 구성합니다. |
| `createNestApplication()` | 테스트용 Nest Application을 생성합니다. |
| `app.init()` | 애플리케이션을 초기화합니다. |
| `app.getHttpServer()` | Supertest에 전달할 HTTP 서버 객체를 가져옵니다. |
| Supertest | HTTP 요청을 생성하고 응답을 검증합니다. |
| Validation Testing | 실제 HTTP 요청에서 DTO Validation을 검증합니다. |
| Authentication Testing | 인증 여부에 따른 접근 제어를 검증합니다. |
| Authorization Testing | 사용자 권한에 따른 접근 제한을 검증합니다. |
| Exception Testing | 예외가 올바른 HTTP 응답으로 변환되는지 검증합니다. |
| Provider Override | 일부 외부 의존성을 테스트용 구현으로 대체합니다. |
| Test Isolation | 테스트 간 데이터 및 상태 간섭을 방지합니다. |
| Testcontainers | 실제 외부 시스템을 컨테이너 기반 테스트 환경에 제공합니다. |
| `app.close()` | 테스트 애플리케이션의 종료 절차를 수행합니다. |

E2E Testing에서는 실제 애플리케이션과 최대한 유사한 요청 처리 환경을 구성하면서도 테스트 데이터와 외부 의존성을 독립적으로 관리하는 것이 중요합니다.

또한 모든 기능을 E2E 테스트로 검증하기보다는 Unit Testing, Integration Testing과 역할을 분담하여 전체 테스트 전략을 구성하는 것이 좋습니다.

---

## 23. 관련 문서

- [Unit Testing](./unit-testing.md): 개별 클래스와 메서드의 단위 테스트 방법을 설명합니다.
- [Integration Testing](./integration-testing.md): Service, Repository 및 Module 간의 통합 테스트 방법을 설명합니다.
- [Testing Modules](./testing-modules.md): NestJS TestingModule 구성과 테스트 환경 초기화 방법을 설명합니다.
- [Mocking Providers](./mocking-providers.md): Mock Provider 및 Provider Override 방법을 설명합니다.
- [Request Lifecycle](../00-overview/request-lifecycle.md): NestJS HTTP 요청 처리 흐름을 설명합니다.
- [Guards](../02-request-lifecycle/guards.md): Guard를 이용한 요청 접근 제어 방법을 설명합니다.
- [Interceptors](../02-request-lifecycle/interceptors.md): Interceptor를 이용한 요청 및 응답 처리 방법을 설명합니다.
- [Pipes](../02-request-lifecycle/pipes.md): Pipe를 이용한 Validation 및 Transformation을 설명합니다.
- [Exception Filters](../02-request-lifecycle/exception-filters.md): 예외 처리 및 HTTP 응답 변환 방법을 설명합니다.
- [Authentication](../04-security/authentication.md): 사용자 인증 및 JWT 기반 인증 방법을 설명합니다.
- [Authorization](../04-security/authorization.md): 사용자 권한에 따른 접근 제어 방법을 설명합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Documentation — Testing](https://docs.nestjs.com/fundamentals/testing)
  - TestingModule, End-to-End Testing, Supertest 및 테스트 환경 구성 방법을 설명합니다.

- [NestJS Documentation — Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
  - HTTP 요청이 Middleware, Guard, Interceptor, Pipe 및 Controller를 거쳐 처리되는 과정을 설명합니다.

- [NestJS Documentation — Validation](https://docs.nestjs.com/techniques/validation)
  - ValidationPipe와 DTO 기반 요청 데이터 검증 방법을 설명합니다.

- [NestJS Documentation — Authentication](https://docs.nestjs.com/security/authentication)
  - 사용자 인증과 Guard 기반 Authentication 구성 방법을 설명합니다.

- [NestJS Documentation — Authorization](https://docs.nestjs.com/security/authorization)
  - 역할 기반 및 권한 기반 접근 제어 방법을 설명합니다.

- [NestJS Documentation — Exception Filters](https://docs.nestjs.com/exception-filters)
  - Exception Filter와 HTTP Exception 처리 방법을 설명합니다.

- [NestJS Documentation — HTTP Adapter](https://docs.nestjs.com/faq/http-adapter)
  - NestJS HTTP Adapter 추상화 구조를 설명합니다.

- [NestJS Documentation — Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
  - 애플리케이션 초기화 및 종료 Lifecycle을 설명합니다.

- [NestJS Documentation — SWC](https://docs.nestjs.com/recipes/swc)
  - SWC 및 Vitest 기반 NestJS 테스트 환경 구성 방법을 설명합니다.

### Supertest 공식 자료

- [Supertest GitHub Repository](https://github.com/ladjs/supertest)
  - HTTP 요청 생성, Header 설정, Request Body 전송 및 Response Assertion 방법을 설명합니다.

### Vitest 공식 문서

- [Vitest — Getting Started](https://vitest.dev/guide/)
  - Vitest의 설치와 테스트 실행 방법을 설명합니다.

- [Vitest — Configuration](https://vitest.dev/config/)
  - 테스트 파일 검색, Timeout 및 환경 설정 방법을 설명합니다.

- [Vitest — Setup and Teardown](https://vitest.dev/guide/learn/setup-teardown)
  - 테스트 Lifecycle Hook을 이용한 초기화 및 정리 방법을 설명합니다.

- [Vitest — Mocking](https://vitest.dev/guide/mocking)
  - Mock Function 및 외부 의존성 대체 방법을 설명합니다.

### Testcontainers 공식 문서

- [Testcontainers for Node.js](https://node.testcontainers.org/)
  - Node.js 환경에서 컨테이너 기반 테스트를 구성하는 방법을 설명합니다.

- [Testcontainers — PostgreSQL Module](https://node.testcontainers.org/modules/postgresql/)
  - PostgreSQL 컨테이너를 이용한 테스트 데이터베이스 구성 방법을 설명합니다.

### 기타 참고 자료

- [NestJS GitHub Repository](https://github.com/nestjs/nest)
  - NestJS 프레임워크의 구현과 테스트 코드를 확인할 수 있습니다.

- [NestJS Official Samples](https://github.com/nestjs/nest/tree/master/sample)
  - NestJS의 공식 예제 프로젝트에서 실제 E2E 테스트 구성을 확인할 수 있습니다.

- [Jest — Testing Asynchronous Code](https://jestjs.io/docs/asynchronous)
  - Jest 기반 프로젝트에서 비동기 HTTP 테스트를 작성할 때 참고할 수 있습니다.
