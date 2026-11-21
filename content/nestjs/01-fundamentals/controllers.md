# Controllers

## 1. 개요

NestJS의 **Controller**는 클라이언트로부터 전달되는 요청을 수신하고, 요청에 적합한 처리를 수행한 후 응답을 반환하는 구성 요소입니다.

Controller는 애플리케이션의 외부 인터페이스 역할을 담당하며, HTTP 요청을 특정 메서드에 연결하는 Routing 기능을 제공합니다.

NestJS에서는 `@Controller()` 데코레이터를 사용하여 Controller 클래스를 정의합니다.

Controller의 주요 역할은 다음과 같습니다.

- **요청 수신(Request Handling):** 클라이언트에서 전달한 HTTP 요청을 수신합니다.
- **라우팅(Routing):** 요청의 HTTP Method와 URL에 따라 처리할 메서드를 결정합니다.
- **데이터 추출(Request Data Extraction):** Path Parameter, Query Parameter, Request Body, Header 등을 추출합니다.
- **요청 위임(Delegation):** 비즈니스 로직을 담당하는 Service에 처리를 위임합니다.
- **응답 반환(Response Handling):** 처리 결과를 클라이언트에 반환합니다.

Controller는 HTTP 요청과 응답을 처리하는 역할에 집중하는 것이 좋습니다.

복잡한 비즈니스 로직이나 데이터베이스 접근 로직은 일반적으로 Service 또는 별도의 Provider에 분리합니다.

이를 통해 HTTP 인터페이스와 비즈니스 로직 사이의 책임을 명확하게 구분할 수 있습니다.

---

## 2. Controller의 기본 구조

NestJS에서는 `@nestjs/common` 패키지에서 제공하는 `@Controller()` 데코레이터로 Controller를 정의합니다.

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
  }
}
```

위 예제에서 `UsersController`는 사용자 관련 HTTP 요청을 처리합니다.

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| `@Controller('users')` | Controller의 기본 URL 경로를 지정합니다. |
| `UsersController` | HTTP 요청을 처리하는 Controller 클래스입니다. |
| `@Get()` | HTTP GET 요청을 처리하는 메서드를 지정합니다. |
| `findAll()` | 요청이 매핑되었을 때 실행되는 Route Handler입니다. |

위 Controller가 정상적으로 등록되어 있다면 다음 요청을 처리할 수 있습니다.

```http
GET /users
```

응답은 다음과 같습니다.

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

NestJS는 Controller에 정의된 메타데이터를 분석하여 HTTP 요청과 Route Handler 사이의 매핑 관계를 구성합니다.

이때 메서드 이름인 `findAll` 자체가 라우팅을 결정하지는 않습니다.

실제 라우팅은 `@Controller()`와 `@Get()` 등의 데코레이터에 정의된 메타데이터를 기반으로 결정됩니다.

---

## 3. Routing

Routing은 클라이언트의 HTTP 요청을 적절한 Controller 메서드에 연결하는 과정입니다.

NestJS에서는 클래스 데코레이터와 메서드 데코레이터를 조합하여 라우팅을 정의합니다.

### 3.1. Controller Path Prefix

`@Controller()` 데코레이터에 문자열을 전달하면 해당 Controller의 기본 경로를 지정할 수 있습니다.

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return 'All users';
  }

  @Get('profile')
  getProfile() {
    return 'User profile';
  }
}
```

위 예제의 라우팅 결과는 다음과 같습니다.

| HTTP Method | URL | Handler |
|---|---|---|
| GET | `/users` | `findAll()` |
| GET | `/users/profile` | `getProfile()` |

NestJS는 Controller에 선언된 경로와 Route Handler에 선언된 경로를 조합하여 최종 URL을 구성합니다.

```text
@Controller('users')
        +
@Get('profile')
        =
GET /users/profile
```

이 방식은 동일한 리소스를 처리하는 여러 엔드포인트를 하나의 Controller에 구성할 때 유용합니다.

### 3.2. HTTP Method Decorators

NestJS에서는 HTTP Method에 대응하는 다양한 데코레이터를 제공합니다.

| 데코레이터 | HTTP Method | 일반적인 용도 |
|---|---|---|
| `@Get()` | GET | 리소스 조회 |
| `@Post()` | POST | 리소스 생성 또는 작업 요청 |
| `@Put()` | PUT | 리소스 전체 교체 |
| `@Patch()` | PATCH | 리소스 일부 수정 |
| `@Delete()` | DELETE | 리소스 삭제 |
| `@Options()` | OPTIONS | 지원하는 통신 옵션 확인 |
| `@Head()` | HEAD | 응답 본문 없이 메타데이터 조회 |
| `@All()` | 모든 HTTP Method | 여러 HTTP Method를 하나의 Handler에서 처리 |

예를 들어 다음과 같이 REST API의 기본적인 CRUD 엔드포인트를 구성할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return 'Find all users';
  }

  @Post()
  create() {
    return 'Create user';
  }

  @Put(':id')
  replace() {
    return 'Replace user';
  }

  @Patch(':id')
  update() {
    return 'Update user';
  }

  @Delete(':id')
  remove() {
    return 'Remove user';
  }
}
```

이 Controller는 다음과 같은 엔드포인트를 제공합니다.

| HTTP Method | URL | 동작 |
|---|---|---|
| GET | `/users` | 사용자 목록 조회 |
| POST | `/users` | 사용자 생성 |
| PUT | `/users/:id` | 사용자 정보 전체 교체 |
| PATCH | `/users/:id` | 사용자 정보 일부 수정 |
| DELETE | `/users/:id` | 사용자 삭제 |

HTTP Method의 의미는 일반적인 REST API 설계 원칙을 따르지만, 실제 수행되는 작업은 각 Handler의 구현에 따라 결정됩니다.

### 3.3. Route Parameters

URL 경로에 포함된 동적 값을 전달받으려면 Route Parameter를 사용할 수 있습니다.

```typescript
import { Controller, Get, Param } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string) {
    return {
      id,
      name: 'Alice',
    };
  }
}
```

다음과 같은 요청이 발생했다고 가정합니다.

```http
GET /users/100
```

NestJS는 URL에서 `100`을 추출하여 `id` 매개변수에 전달합니다.

```json
{
  "id": "100",
  "name": "Alice"
}
```

`@Param()`은 URL의 Route Parameter를 추출하는 데코레이터입니다.

특정 값을 추출하거나 전체 Parameter 객체를 받을 수 있습니다.

```typescript
@Get(':id')
findOne(@Param('id') id: string) {
  return id;
}
```

```typescript
@Get(':id')
findOne(@Param() params: { id: string }) {
  return params.id;
}
```

두 방식 모두 URL에서 전달된 `id`를 읽을 수 있습니다.

**주의사항:** HTTP 요청의 Route Parameter는 일반적으로 문자열로 전달됩니다.

따라서 TypeScript에서 `number` 타입을 선언하는 것만으로 실제 값이 숫자로 변환되지는 않습니다.

숫자 변환과 검증이 필요하다면 `ParseIntPipe` 등을 사용해야 합니다.

```typescript
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return {
      id,
      name: 'Alice',
    };
  }
}
```

이 경우 `id`가 올바른 정수 문자열이라면 숫자로 변환되며, 변환할 수 없는 값은 기본적으로 `400 Bad Request` 오류가 발생합니다.

또한 정적 경로와 동적 경로가 함께 존재한다면 일반적으로 정적 경로를 먼저 선언하는 것이 좋습니다.

```typescript
@Get('profile')
getProfile() {
  return 'Profile';
}

@Get(':id')
findOne(@Param('id') id: string) {
  return id;
}
```

이는 동적 경로가 정적 경로에 해당하는 요청까지 처리하는 상황을 방지하기 위한 것입니다.

### 3.4. Route Wildcards

NestJS는 특정 경로 패턴에 일치하는 요청을 처리하기 위한 Wildcard Routing을 지원합니다.

```typescript
@Get('files/*')
findFiles() {
  return 'Matched file path';
}
```

위 예제는 `files/`로 시작하는 여러 하위 경로에 매핑될 수 있습니다.

다만 Wildcard의 구체적인 문법과 지원 범위는 사용하는 HTTP Adapter 및 라우터 버전에 따라 달라질 수 있습니다.

특히 Express 5에서는 일반적인 Express 라우팅에서 이름이 지정된 Wildcard를 요구하는 등 문법이 변경되었습니다.

NestJS는 일부 경로 패턴에 호환성 처리를 제공하지만, 복잡한 Wildcard Routing은 사용하는 HTTP Adapter의 지원 여부를 확인해야 합니다.

---

## 4. Request Data

Controller는 클라이언트가 전달한 다양한 요청 데이터를 추출할 수 있습니다.

NestJS에서는 이러한 데이터에 접근하기 위한 Parameter Decorator를 제공합니다.

### 4.1. Request Parameter Decorators

주요 Parameter Decorator는 다음과 같습니다.

| 데코레이터 | 설명 |
|---|---|
| `@Req()`, `@Request()` | HTTP Request 객체를 가져옵니다. |
| `@Res()`, `@Response()` | HTTP Response 객체를 가져옵니다. |
| `@Param()` | URL의 Route Parameter를 가져옵니다. |
| `@Query()` | URL의 Query Parameter를 가져옵니다. |
| `@Body()` | HTTP Request Body를 가져옵니다. |
| `@Headers()` | HTTP Request Header를 가져옵니다. |
| `@Ip()` | 클라이언트 IP 주소를 가져옵니다. |
| `@Session()` | Session 객체를 가져옵니다. |
| `@HostParam()` | Host 기반 라우팅의 Parameter를 가져옵니다. |
| `@Next()` | HTTP Adapter의 Next 함수를 가져옵니다. |

각 데코레이터는 필요한 요청 데이터만 추출하도록 지원합니다.

특별한 이유가 없다면 HTTP Request 객체 전체를 직접 사용하는 것보다 전용 데코레이터를 사용하는 방식이 간결합니다.

### 4.2. Query Parameters

Query Parameter는 URL의 `?` 뒤에 전달되는 데이터를 의미합니다.

주로 검색, 필터링, 정렬, 페이지네이션 등에 사용합니다.

```http
GET /users?page=2&limit=10
```

NestJS에서는 `@Query()` 데코레이터를 사용하여 Query Parameter를 추출합니다.

```typescript
import { Controller, Get, Query } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      page,
      limit,
    };
  }
}
```

위 요청에 대한 응답은 다음과 같습니다.

```json
{
  "page": "2",
  "limit": "10"
}
```

Query Parameter 역시 기본적으로 문자열 형태로 전달되므로, 숫자가 필요한 경우 명시적인 변환 과정이 필요합니다.

예를 들어 선택적인 페이지네이션 매개변수를 다음과 같이 처리할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page: number,

    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit: number,
  ) {
    return {
      page,
      limit,
    };
  }
}
```

`DefaultValuePipe`는 값이 전달되지 않았을 때 기본값을 지정하고, `ParseIntPipe`는 전달된 값을 정수로 변환합니다.

이를 통해 다음 요청을 모두 처리할 수 있습니다.

```http
GET /users
GET /users?page=2
GET /users?page=2&limit=20
```

복잡한 Query Parameter를 사용하는 경우에는 별도의 DTO 클래스로 구성하는 것이 좋습니다.

### 4.3. Request Body

HTTP POST, PUT, PATCH 요청에서는 일반적으로 Request Body를 통해 데이터를 전달합니다.

NestJS에서는 `@Body()` 데코레이터를 사용하여 Request Body를 추출합니다.

```typescript
import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Post()
  create(
    @Body() body: { name: string; email: string },
  ) {
    return body;
  }
}
```

다음과 같은 요청이 발생했다고 가정합니다.

```http
POST /users
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com"
}
```

Controller는 Request Body의 값을 매개변수로 전달받습니다.

또한 특정 속성만 추출할 수도 있습니다.

```typescript
@Post()
create(@Body('name') name: string) {
  return {
    name,
  };
}
```

다만 실제 애플리케이션에서는 Request Body의 구조를 명시적으로 관리하기 위해 DTO를 사용하는 것이 일반적입니다.

### 4.4. Request Headers

`@Headers()` 데코레이터를 사용하면 HTTP Request Header에 접근할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  Headers,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll(
    @Headers('user-agent') userAgent?: string,
  ) {
    return {
      userAgent,
    };
  }
}
```

이 예제는 요청의 `User-Agent` Header를 추출합니다.

특정 Header가 아닌 전체 Header 객체를 전달받을 수도 있습니다.

```typescript
@Get()
findAll(@Headers() headers: Record<string, unknown>) {
  return headers;
}
```

다만 인증 정보처럼 민감한 Header는 응답이나 로그에 그대로 노출하지 않도록 주의해야 합니다.

### 4.5. Request Object

`@Req()` 데코레이터를 사용하면 HTTP Adapter가 제공하는 Request 객체에 직접 접근할 수 있습니다.

다음 예제는 Express를 사용하는 경우입니다.

```typescript
import {
  Controller,
  Get,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';

@Controller('users')
export class UsersController {
  @Get()
  findAll(@Req() request: Request) {
    return {
      method: request.method,
      path: request.path,
    };
  }
}
```

Express의 `Request` 타입을 사용하려면 해당 타입 정의가 개발 환경에 설치되어 있어야 합니다.

```bash
npm install -D @types/express
```

이 예제는 Express HTTP Adapter를 사용하는 것을 전제로 합니다.

Fastify를 사용하는 경우에는 Request 객체의 타입과 제공되는 API가 달라집니다.

따라서 HTTP Adapter에 대한 의존성을 줄이려면 `@Param()`, `@Query()`, `@Body()` 등의 전용 데코레이터를 우선적으로 사용하는 것이 좋습니다.

---

## 5. Data Transfer Object (DTO)

DTO는 **Data Transfer Object**의 약자로, 계층 또는 시스템 사이에서 전달되는 데이터의 구조를 정의하기 위한 객체입니다.

NestJS에서는 일반적으로 HTTP Request Body나 Query Parameter의 데이터 구조를 정의하는 데 사용합니다.

### 5.1. DTO 클래스 정의

사용자 생성 요청에 사용할 DTO를 다음과 같이 정의할 수 있습니다.

**dto/create-user.dto.ts**

```typescript
export class CreateUserDto {
  name!: string;
  email!: string;
}
```

위 예제는 TypeScript의 `strictPropertyInitialization` 옵션을 사용하는 환경에서도 컴파일할 수 있도록 definite assignment assertion(`!`)을 적용했습니다.

DTO를 사용하면 Controller에서 전달받는 데이터의 형태를 명확하게 선언할 수 있습니다.

```typescript
import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return createUserDto;
  }
}
```

이 방식은 Request Body의 구조를 재사용하고 코드의 가독성을 개선하는 데 유용합니다.

### 5.2. Class와 Interface의 차이

TypeScript에서는 Interface를 사용하여 데이터 구조를 정의할 수도 있습니다.

```typescript
export interface CreateUserDto {
  name: string;
  email: string;
}
```

그러나 Interface는 TypeScript 컴파일 과정에서 제거됩니다.

반면 Class는 JavaScript 실행 환경에서도 존재합니다.

이 차이는 NestJS의 런타임 메타데이터를 활용하는 기능에서 중요합니다.

예를 들어 `ValidationPipe`는 DTO 클래스와 Validation Decorator에 정의된 정보를 활용하여 입력 데이터를 검증할 수 있습니다.

따라서 런타임 검증이나 변환이 필요한 DTO는 일반적으로 Class로 정의하는 것이 좋습니다.

### 5.3. DTO와 Validation

DTO 클래스를 선언했다고 해서 Request Body가 자동으로 검증되는 것은 아닙니다.

실제 유효성 검증을 수행하려면 `ValidationPipe`와 적절한 Validation Decorator를 구성해야 합니다.

일반적인 `class-validator` 기반 검증에서는 다음 패키지가 필요합니다.

```bash
npm install class-validator class-transformer
```

**dto/create-user.dto.ts**

```typescript
import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;
}
```

`ValidationPipe`를 애플리케이션에 전역으로 등록할 수 있습니다.

**main.ts**

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

주요 옵션의 역할은 다음과 같습니다.

| 옵션 | 설명 |
|---|---|
| `transform` | 요청 데이터를 DTO 클래스 인스턴스 등으로 변환할 수 있도록 합니다. |
| `whitelist` | Validation Decorator가 없는 속성을 제거합니다. |
| `forbidNonWhitelisted` | 허용되지 않은 속성이 존재하면 제거하는 대신 오류를 발생시킵니다. |

이제 `CreateUserDto`를 사용하는 Controller에서는 정의된 검증 규칙을 적용할 수 있습니다.

DTO에 관한 자세한 검증 및 변환 설정은 `03-techniques/validation.md`에서 설명합니다.

---

## 6. Response Handling

NestJS는 Controller의 실행 결과를 HTTP 응답으로 변환하는 기능을 제공합니다.

일반적인 REST API에서는 Controller의 Route Handler에서 값을 반환하는 방식으로 응답을 처리합니다.

### 6.1. Standard Response

NestJS의 표준 응답 처리 방식은 Route Handler에서 값을 직접 반환하는 것입니다.

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
  }
}
```

NestJS는 반환된 데이터를 HTTP 응답으로 처리합니다.

일반적으로 객체와 배열은 JSON 형식으로 직렬화되며, 문자열이나 숫자 등의 Primitive 값은 해당 값에 적합한 방식으로 응답합니다.

기본적인 HTTP 상태 코드는 다음과 같습니다.

| 요청 유형 | 기본 상태 코드 |
|---|---|
| GET | `200 OK` |
| POST | `201 Created` |
| 그 외 일반적인 성공 응답 | `200 OK` |

실제 상태 코드는 `@HttpCode()`나 예외 처리 등에 의해 달라질 수 있습니다.

### 6.2. HttpCode

`@HttpCode()` 데코레이터를 사용하면 Route Handler의 성공 응답 상태 코드를 지정할 수 있습니다.

```typescript
import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login() {
    return {
      accessToken: 'example-token',
    };
  }
}
```

일반적인 POST 요청은 기본적으로 `201 Created`를 반환하지만, 위 예제에서는 `200 OK`를 반환합니다.

`HttpStatus` 열거형을 사용하면 상태 코드의 의미를 명확하게 표현할 수 있습니다.

```typescript
HttpStatus.OK
HttpStatus.CREATED
HttpStatus.NO_CONTENT
HttpStatus.BAD_REQUEST
HttpStatus.NOT_FOUND
```

실제 인증 기능에서는 토큰 생성 및 검증 로직을 별도의 Service로 분리하고, 토큰 값을 하드코딩하지 않아야 합니다.

### 6.3. Response Headers

`@Header()` 데코레이터를 사용하여 응답 Header를 지정할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  Header,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  @Header('Cache-Control', 'no-store')
  findAll() {
    return [];
  }
}
```

위 예제는 HTTP 응답에 다음 Header를 추가합니다.

```http
Cache-Control: no-store
```

`@Header()`는 정적인 Header 값을 선언할 때 유용합니다.

요청 처리 결과에 따라 Header 값을 동적으로 변경해야 하는 경우에는 별도의 응답 처리 방식이 필요할 수 있습니다.

### 6.4. Redirection

`@Redirect()` 데코레이터를 사용하면 클라이언트를 다른 URL로 이동시키는 HTTP Redirect 응답을 반환할 수 있습니다.

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
  redirectToDocs() {}
}
```

다음 요청이 발생하면 지정된 URL로 Redirect 응답을 반환합니다.

```http
GET /docs
```

`@Redirect()`의 기본 상태 코드는 `302 Found`입니다.

동적으로 Redirect URL을 결정할 수도 있습니다.

```typescript
@Get('latest')
@Redirect('https://docs.nestjs.com', 302)
redirectToLatest() {
  return {
    url: 'https://docs.nestjs.com/controllers',
    statusCode: 302,
  };
}
```

반환 객체의 `url`과 `statusCode`를 통해 Redirect 정보를 변경할 수 있습니다.

### 6.5. Library-specific Response

NestJS에서는 Express 또는 Fastify와 같은 HTTP Adapter의 Response 객체를 직접 사용하는 방식도 지원합니다.

다음 예제는 Express를 사용하는 경우입니다.

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
  findAll(@Res() response: Response) {
    return response.status(200).json([
      { id: 1, name: 'Alice' },
    ]);
  }
}
```

이 방식에서는 개발자가 Response 객체를 직접 조작합니다.

그러나 `@Res()`를 일반적인 방식으로 사용하면 해당 Handler에 대한 NestJS의 표준 응답 처리가 비활성화됩니다.

따라서 다음 사항에 주의해야 합니다.

- HTTP Response를 직접 완료해야 합니다.
- Express 또는 Fastify의 API에 의존하게 됩니다.
- 표준 응답 처리에 의존하는 일부 Interceptor 기능과 호환되지 않을 수 있습니다.
- Response 객체를 Mocking해야 하므로 테스트가 복잡해질 수 있습니다.

특별한 이유가 없다면 표준 응답 처리 방식을 사용하는 것이 좋습니다.

### 6.6. Response Passthrough

HTTP Response 객체를 사용하면서 NestJS의 표준 응답 처리도 유지하려면 `passthrough` 옵션을 사용할 수 있습니다.

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
  findAll(
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('X-Custom-Header', 'example');

    return [
      { id: 1, name: 'Alice' },
    ];
  }
}
```

위 예제에서는 Response 객체를 통해 Header를 설정하지만, 응답 본문의 처리는 NestJS에 위임합니다.

이 방식은 HTTP Response를 부분적으로 제어해야 할 때 사용할 수 있습니다.

---

## 7. Asynchronous Controllers

NestJS의 Controller는 비동기 작업을 지원합니다.

데이터베이스 조회, 외부 API 호출, 파일 접근 등 비동기 작업을 수행하는 경우 `async/await`를 사용할 수 있습니다.

### 7.1. Promise 기반 처리

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  async findAll(): Promise<{ id: number; name: string }[]> {
    return [
      { id: 1, name: 'Alice' },
    ];
  }
}
```

Route Handler가 `Promise`를 반환하면 NestJS는 비동기 작업이 완료된 후 결과를 응답으로 처리합니다.

실제 애플리케이션에서는 일반적으로 Service의 비동기 메서드를 호출합니다.

```typescript
@Get()
async findAll(): Promise<User[]> {
  return this.usersService.findAll();
}
```

이 예제는 `User` 타입과 `UsersService`가 별도로 정의되어 있고, 해당 Service가 Controller에 주입되어 있다고 가정합니다.

### 7.2. Observable 기반 처리

NestJS는 RxJS의 `Observable`도 지원합니다.

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

import { Observable, of } from 'rxjs';

@Controller('users')
export class UsersController {
  @Get()
  findAll(): Observable<{ id: number; name: string }[]> {
    return of([
      { id: 1, name: 'Alice' },
    ]);
  }
}
```

NestJS는 Observable의 구독과 완료 처리를 통해 일반적인 HTTP 응답을 생성할 수 있습니다.

일반적인 HTTP Route Handler에서는 Observable이 완료될 때 최종 방출된 값을 응답으로 사용합니다.

따라서 완료되지 않는 Observable을 일반 HTTP 응답으로 반환하면 요청 처리가 종료되지 않을 수 있습니다.

여러 이벤트를 지속적으로 클라이언트에 전달해야 한다면 Server-Sent Events나 WebSocket과 같은 별도의 통신 방식을 고려해야 합니다.

---

## 8. Exception Handling

Controller에서 요청을 처리하는 과정에서는 예외가 발생할 수 있습니다.

NestJS는 예외를 HTTP 응답으로 변환하는 Exception Filter 시스템을 제공합니다.

### 8.1. HttpException

NestJS에서는 `HttpException`을 사용하여 HTTP 상태 코드와 오류 메시지를 정의할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    throw new HttpException(
      'Unable to retrieve users',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

위 예제에서는 `500 Internal Server Error`가 발생합니다.

### 8.2. Built-in HTTP Exceptions

NestJS는 자주 사용하는 HTTP 오류에 대응하는 예외 클래스를 제공합니다.

| 예외 클래스 | 기본 HTTP 상태 코드 |
|---|---|
| `BadRequestException` | 400 |
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `MethodNotAllowedException` | 405 |
| `ConflictException` | 409 |
| `UnprocessableEntityException` | 422 |
| `InternalServerErrorException` | 500 |
| `ServiceUnavailableException` | 503 |

예를 들어 존재하지 않는 사용자를 조회했을 때 다음과 같이 처리할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string) {
    if (id !== '1') {
      throw new NotFoundException('User not found');
    }

    return {
      id: 1,
      name: 'Alice',
    };
  }
}
```

`NotFoundException`이 발생하면 기본적으로 `404 Not Found` 응답이 반환됩니다.

일반적인 비즈니스 로직은 Service에 배치하되, 발생한 예외를 HTTP 응답으로 변환하는 책임은 NestJS의 Exception Filter 시스템에 위임할 수 있습니다.

예외 처리의 상세 동작은 `02-request-lifecycle/exception-filters.md`에서 설명합니다.

---

## 9. Controller와 Service

NestJS에서는 Controller와 Service의 책임을 분리하는 구조를 일반적으로 사용합니다.

Controller는 HTTP 요청을 처리하고, Service는 애플리케이션의 비즈니스 로직을 담당합니다.

### 9.1. Controller와 Service의 역할

| 구분 | Controller | Service |
|---|---|---|
| 주요 책임 | HTTP 요청 및 응답 처리 | 비즈니스 로직 처리 |
| 주요 데코레이터 | `@Controller()` | `@Injectable()` |
| 주요 기능 | Routing, Parameter 추출, 응답 반환 | 도메인 로직, 데이터 처리, 외부 서비스 호출 조정 |
| HTTP 의존성 | 상대적으로 높음 | 가능한 낮게 유지 |
| 테스트 대상 | 요청 매핑과 응답 처리 | 비즈니스 로직 |

이러한 분리는 Controller가 비즈니스 로직의 구현 세부 사항에 직접 의존하지 않도록 하는 데 도움이 됩니다.

### 9.2. Service 구현

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

`@Injectable()`은 NestJS의 Dependency Injection 시스템에서 사용할 수 있는 Provider 클래스를 선언합니다.

이 예제에서는 데이터베이스 대신 메모리 배열을 사용합니다.

### 9.3. Controller 구현

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

Controller는 생성자를 통해 `UsersService`를 주입받습니다.

`UsersController`는 사용자 데이터가 실제로 어디에 저장되는지 알 필요가 없습니다.

Controller는 Service가 제공하는 메서드를 호출하고 처리 결과를 반환하는 역할에 집중합니다.

### 9.4. 요청 처리 흐름

위 예제에서 다음 요청이 발생했다고 가정합니다.

```http
GET /users/1
```

처리 흐름은 다음과 같습니다.

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
   │ 조회 결과 반환
   ▼
Client
```

실제 NestJS 요청 처리 과정에는 Middleware, Guard, Interceptor, Pipe, Exception Filter 등이 함께 참여할 수 있습니다.

위 그림은 Controller와 Service의 책임 관계를 설명하기 위해 단순화한 구조입니다.

전체 요청 처리 순서는 `00-overview/request-lifecycle.md`와 `02-request-lifecycle/`의 관련 문서에서 설명합니다.

---

## 10. Controller와 Module

NestJS의 Controller는 반드시 Module에 등록되어야 합니다.

`@Controller()` 데코레이터를 적용했다고 해서 해당 Controller가 자동으로 애플리케이션에 등록되는 것은 아닙니다.

Module의 `controllers` 메타데이터에 Controller를 등록해야 합니다.

### 10.1. Controller 등록

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

`UsersModule`은 다음 구성 요소를 관리합니다.

- `UsersController`: HTTP 요청 처리
- `UsersService`: 사용자 관련 비즈니스 로직

### 10.2. Root Module 연결

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

`AppModule`에서 `UsersModule`을 가져오면 NestJS는 해당 Module에 등록된 Controller를 애플리케이션의 라우팅 구조에 포함합니다.

### 10.3. Controller 인스턴스 생성

NestJS는 Module 메타데이터를 기반으로 Controller를 생성하고 필요한 의존성을 주입합니다.

주요 과정은 다음과 같습니다.

1. NestJS가 Root Module을 시작점으로 Module Graph를 구성합니다.
2. 각 Module의 `controllers` 메타데이터를 확인합니다.
3. Controller 생성자에 선언된 의존성을 분석합니다.
4. 필요한 Provider를 DI Container에서 해결합니다.
5. Controller 인스턴스를 생성합니다.
6. Controller의 라우팅 메타데이터를 기반으로 Route Handler를 등록합니다.

이러한 과정 덕분에 개발자는 Controller에서 Service를 직접 생성하지 않아도 됩니다.

Controller와 Module의 관계는 `modules.md`에서 자세히 설명합니다.

---

## 11. Controller의 Injection Scope

NestJS의 Controller는 기본적으로 Singleton Scope로 관리됩니다.

Singleton Scope에서는 일반적으로 하나의 애플리케이션 컨텍스트 내에서 Controller 인스턴스가 재사용됩니다.

### 11.1. Default Scope

```typescript
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}
}
```

별도의 Scope를 지정하지 않으면 기본 Scope가 적용됩니다.

따라서 요청마다 Controller 인스턴스를 새로 생성하지 않고 기존 인스턴스를 재사용할 수 있습니다.

다만 여러 요청이 동일한 Controller 인스턴스를 사용할 수 있으므로 요청별 데이터를 Controller의 일반 인스턴스 필드에 저장하는 방식은 주의해야 합니다.

### 11.2. Request Scope

요청마다 별도의 Controller 인스턴스가 필요한 경우 Request Scope를 지정할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  Scope,
} from '@nestjs/common';

@Controller({
  path: 'users',
  scope: Scope.REQUEST,
})
export class UsersController {
  @Get()
  findAll() {
    return [];
  }
}
```

이 경우 요청 처리 컨텍스트별로 Controller 인스턴스를 생성합니다.

다만 Request Scope는 인스턴스 생성 및 의존성 관리 비용을 증가시킬 수 있으므로 필요한 경우에만 사용하는 것이 좋습니다.

또한 Request Scope Provider에 의존하는 Controller는 의존성 Scope의 전파에 따라 Request-scoped로 동작할 수 있습니다.

Controller 및 Provider의 Scope에 관한 상세 내용은 `injection-scopes.md`에서 설명합니다.

---

## 12. Subdomain Routing

NestJS는 URL Path뿐 아니라 요청의 Host를 기준으로 Controller를 매핑하는 기능도 제공합니다.

이 기능은 관리자 전용 도메인이나 멀티테넌트 애플리케이션을 구성할 때 활용할 수 있습니다.

### 12.1. Host 기반 Controller

```typescript
import {
  Controller,
  Get,
} from '@nestjs/common';

@Controller({
  host: 'admin.example.com',
})
export class AdminController {
  @Get()
  index() {
    return 'Admin page';
  }
}
```

위 Controller는 지정된 Host 조건에 일치하는 요청을 처리하도록 구성됩니다.

### 12.2. Host Parameter

동적인 Host 값을 추출할 수도 있습니다.

```typescript
import {
  Controller,
  Get,
  HostParam,
} from '@nestjs/common';

@Controller({
  host: ':account.example.com',
})
export class AccountController {
  @Get()
  getAccount(
    @HostParam('account') account: string,
  ) {
    return {
      account,
    };
  }
}
```

예를 들어 다음 Host에 대한 요청이 발생했다고 가정합니다.

```http
Host: customer1.example.com
```

Controller에서는 `customer1`을 `account` 매개변수로 전달받을 수 있습니다.

Host 기반 Routing은 HTTP Adapter의 기능에 영향을 받을 수 있습니다.

NestJS 공식 문서에서는 Subdomain Routing을 사용하는 경우 Express Adapter를 권장합니다.

---

## 13. Controller의 주요 데코레이터

NestJS Controller에서 자주 사용하는 데코레이터를 정리하면 다음과 같습니다.

### 13.1. Class Decorators

| 데코레이터 | 설명 |
|---|---|
| `@Controller()` | Controller를 정의하고 기본 라우팅 경로를 설정합니다. |
| `@UseGuards()` | Controller에 Guard를 적용합니다. |
| `@UseInterceptors()` | Controller에 Interceptor를 적용합니다. |
| `@UseFilters()` | Controller에 Exception Filter를 적용합니다. |
| `@UsePipes()` | Controller에 Pipe를 적용합니다. |

### 13.2. Method Decorators

| 데코레이터 | 설명 |
|---|---|
| `@Get()` | GET 요청을 처리합니다. |
| `@Post()` | POST 요청을 처리합니다. |
| `@Put()` | PUT 요청을 처리합니다. |
| `@Patch()` | PATCH 요청을 처리합니다. |
| `@Delete()` | DELETE 요청을 처리합니다. |
| `@HttpCode()` | 성공 응답의 HTTP 상태 코드를 지정합니다. |
| `@Header()` | 응답 Header를 지정합니다. |
| `@Redirect()` | Redirect 응답을 구성합니다. |
| `@UseGuards()` | 특정 Route Handler에 Guard를 적용합니다. |
| `@UseInterceptors()` | 특정 Route Handler에 Interceptor를 적용합니다. |
| `@UsePipes()` | 특정 Route Handler에 Pipe를 적용합니다. |

### 13.3. Parameter Decorators

| 데코레이터 | 설명 |
|---|---|
| `@Param()` | Route Parameter를 추출합니다. |
| `@Query()` | Query Parameter를 추출합니다. |
| `@Body()` | Request Body를 추출합니다. |
| `@Headers()` | Request Header를 추출합니다. |
| `@Req()` | HTTP Request 객체를 가져옵니다. |
| `@Res()` | HTTP Response 객체를 가져옵니다. |
| `@Ip()` | 클라이언트 IP 주소를 가져옵니다. |
| `@HostParam()` | Host Parameter를 추출합니다. |

이러한 데코레이터를 조합하면 Controller의 요청 처리 방식을 선언적으로 구성할 수 있습니다.

---

## 14. Controller 설계 시 고려사항

Controller는 애플리케이션 외부와 비즈니스 로직을 연결하는 진입점이므로 책임을 명확하게 유지하는 것이 중요합니다.

### 14.1. Controller를 얇게 유지합니다

Controller에 복잡한 비즈니스 로직을 직접 구현하지 않는 것이 좋습니다.

다음은 Controller에서 비즈니스 로직과 데이터 처리를 직접 수행하는 예제입니다.

```typescript
@Post()
create(@Body() body: { name: string }) {
  const user = {
    id: Date.now(),
    name: body.name,
  };

  // 데이터 처리와 비즈니스 로직을 직접 구현
  return user;
}
```

이 방식은 기능이 증가할수록 Controller가 복잡해질 수 있습니다.

일반적으로는 다음과 같이 Service에 처리를 위임합니다.

```typescript
@Post()
create(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}
```

이 예제는 `UsersService`에 `create()` 메서드가 정의되어 있다고 가정합니다.

### 14.2. 입력 데이터 검증을 적용합니다

클라이언트가 전달한 데이터는 신뢰할 수 없으므로 적절한 유효성 검증이 필요합니다.

DTO와 Pipe를 활용하면 Controller의 비즈니스 로직 실행 전에 입력값을 검증하거나 변환할 수 있습니다.

특히 다음과 같은 데이터는 명시적인 검증이 중요합니다.

- Route Parameter의 숫자 및 UUID 형식
- Request Body의 필수 속성과 데이터 타입
- Query Parameter의 허용 범위
- 문자열 길이와 형식
- 허용되지 않은 추가 속성

### 14.3. HTTP Adapter에 대한 의존성을 최소화합니다

Express 또는 Fastify의 Request 및 Response 객체를 직접 사용하면 플랫폼 종속성이 증가할 수 있습니다.

가능하면 NestJS에서 제공하는 표준 데코레이터와 응답 처리 방식을 우선적으로 사용합니다.

### 14.4. Controller의 책임을 리소스 중심으로 분리합니다

서로 관련이 없는 기능을 하나의 Controller에 집중시키지 않는 것이 좋습니다.

예를 들어 사용자 관리와 주문 관리 기능은 각각 별도의 Controller로 분리할 수 있습니다.

```text
src/
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
└── orders/
    ├── orders.controller.ts
    ├── orders.service.ts
    └── orders.module.ts
```

이러한 구조는 기능별 변경 범위를 명확하게 유지하는 데 도움이 됩니다.

### 14.5. 요청별 상태를 Singleton Controller에 저장하지 않습니다

Controller는 기본적으로 Singleton Scope를 사용하므로 여러 요청이 동일한 인스턴스를 공유할 수 있습니다.

따라서 요청마다 달라지는 값을 일반 인스턴스 필드에 저장하는 방식은 피하는 것이 좋습니다.

```typescript
@Controller('users')
export class UsersController {
  private currentUserId?: number;

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    this.currentUserId = id;

    return {
      id: this.currentUserId,
    };
  }
}
```

위 코드는 단순한 예제에서는 정상적으로 동작할 수 있지만, 동시에 처리되는 요청 사이에서 공유 상태가 변경될 위험이 있습니다.

요청별 데이터는 가능하면 메서드의 지역 변수나 적절한 요청 컨텍스트에서 관리해야 합니다.

---

## 15. 전체 구현 예제

앞에서 설명한 개념을 조합하여 간단한 사용자 조회 API를 구성할 수 있습니다.

### 15.1. 디렉터리 구조

```text
src/
├── main.ts
├── app.module.ts
│
└── users/
    ├── dto/
    │   └── create-user.dto.ts
    │
    ├── users.controller.ts
    ├── users.service.ts
    └── users.module.ts
```

### 15.2. DTO

**users/dto/create-user.dto.ts**

```typescript
export class CreateUserDto {
  name!: string;
  email!: string;
}
```

이 DTO는 요청 데이터의 타입을 설명하며, 별도의 Validation Decorator를 선언하지 않았으므로 자체적으로 런타임 검증을 수행하지 않습니다.

### 15.3. Service

**users/users.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

interface User {
  id: number;
  name: string;
  email: string;
}

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

  findOne(id: number): User | undefined {
    return this.users.find((user) => user.id === id);
  }
}
```

Service는 메모리 배열을 사용하여 사용자 정보를 관리합니다.

이 예제는 Controller와 Service의 관계를 설명하기 위한 학습용 구현입니다.

실제 애플리케이션에서는 데이터베이스와 Repository 등을 사용하여 영속성을 관리할 수 있습니다.

### 15.4. Controller

**users/users.controller.ts**

```typescript
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

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

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

### 15.6. Bootstrap

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

### 15.7. API 요청 예제

사용자 생성 요청은 다음과 같습니다.

```http
POST /users
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com"
}
```

응답 예제는 다음과 같습니다.

```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com"
}
```

사용자 목록 조회 요청은 다음과 같습니다.

```http
GET /users
```

응답 예제는 다음과 같습니다.

```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com"
  }
]
```

특정 사용자 조회 요청은 다음과 같습니다.

```http
GET /users/1
```

응답 예제는 다음과 같습니다.

```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com"
}
```

존재하지 않는 사용자를 요청한 경우 `NotFoundException`에 의해 `404 Not Found`가 반환됩니다.

---

## 16. 정리

NestJS의 Controller는 클라이언트 요청과 애플리케이션의 비즈니스 로직을 연결하는 핵심 구성 요소입니다.

주요 특징은 다음과 같습니다.

1. **Controller는 HTTP 요청을 처리합니다.** 클라이언트의 요청을 수신하고 적절한 Route Handler를 실행합니다.
2. **데코레이터 기반 라우팅을 제공합니다.** `@Controller()`, `@Get()`, `@Post()` 등을 사용하여 URL과 HTTP Method를 선언적으로 매핑합니다.
3. **다양한 요청 데이터를 추출할 수 있습니다.** `@Param()`, `@Query()`, `@Body()`, `@Headers()` 등을 사용하여 필요한 데이터에 접근합니다.
4. **DTO를 통해 데이터 구조를 정의합니다.** DTO와 ValidationPipe를 조합하여 입력값을 검증하고 변환할 수 있습니다.
5. **표준 응답 처리를 지원합니다.** 반환값을 HTTP 응답으로 변환하며 `@HttpCode()`, `@Header()`, `@Redirect()` 등을 통해 응답을 제어할 수 있습니다.
6. **비동기 처리를 지원합니다.** Promise와 Observable을 반환하는 Route Handler를 구현할 수 있습니다.
7. **Service와 역할을 분리합니다.** Controller는 요청 및 응답을 담당하고, Service는 비즈니스 로직을 담당하도록 구성하는 것이 일반적입니다.
8. **Module에 등록되어야 합니다.** Controller는 Module의 `controllers` 메타데이터를 통해 애플리케이션에 포함됩니다.
9. **기본적으로 Singleton Scope를 사용합니다.** 요청마다 별도의 인스턴스를 생성하지 않고 재사용할 수 있습니다.

Controller를 설계할 때 가장 중요한 원칙은 **HTTP 요청 처리와 비즈니스 로직의 책임을 분리하는 것**입니다.

이를 통해 Controller의 복잡도를 낮추고 테스트와 유지보수가 용이한 애플리케이션 구조를 구성할 수 있습니다.

---

## 17. 관련 문서

- `modules.md`: Module의 역할과 Controller 등록 방식
- `providers.md`: Provider와 Service의 역할
- `dependency-injection.md`: Controller에 Service를 주입하는 방식
- `injection-scopes.md`: Controller 및 Provider의 인스턴스 관리 범위
- `../02-request-lifecycle/pipes.md`: 요청 데이터 변환 및 검증
- `../02-request-lifecycle/guards.md`: 요청 접근 제어
- `../02-request-lifecycle/interceptors.md`: 요청 및 응답 처리 확장
- `../02-request-lifecycle/exception-filters.md`: 예외 및 오류 응답 처리
- `../03-techniques/validation.md`: DTO 및 ValidationPipe 기반 데이터 검증
- `../05-platforms/rest-api.md`: REST API 설계 및 구현

---

## 참고 자료

### NestJS 공식 문서

- [NestJS Controllers](https://docs.nestjs.com/controllers)  
  Controller의 정의, Routing, Request Parameter, Response Handling 및 비동기 처리 등을 설명합니다.

- [NestJS Modules](https://docs.nestjs.com/modules)  
  Controller와 Provider를 Module에 등록하고 관리하는 방법을 설명합니다.

- [NestJS Providers](https://docs.nestjs.com/providers)  
  Controller에서 사용하는 Service와 Dependency Injection의 기본 개념을 설명합니다.

- [NestJS Pipes](https://docs.nestjs.com/pipes)  
  요청 데이터의 변환 및 검증을 위한 Pipe의 역할과 사용 방법을 설명합니다.

- [NestJS Validation](https://docs.nestjs.com/techniques/validation)  
  DTO, ValidationPipe 및 class-validator를 활용한 요청 데이터 검증 방법을 설명합니다.

- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)  
  HTTP Exception과 Exception Filter를 통한 오류 처리 방식을 설명합니다.

- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)  
  Controller 및 Provider의 Scope와 인스턴스 생명주기를 설명합니다.

- [NestJS Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)  
  HTTP 요청이 Middleware, Guard, Interceptor, Pipe 및 Controller를 거쳐 처리되는 전체 과정을 설명합니다.

- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)  
  요청 데이터를 추출하기 위한 사용자 정의 Parameter Decorator 구현 방법을 설명합니다.

### GitHub Repository

- [NestJS 공식 GitHub Repository](https://github.com/nestjs/nest)  
  NestJS 프레임워크의 Controller, Router 및 HTTP 요청 처리 관련 내부 구현을 확인할 수 있습니다.

- [NestJS 공식 예제 Repository](https://github.com/nestjs/nest/tree/master/sample)  
  Controller, Service, Module을 조합한 다양한 애플리케이션 구현 예제를 확인할 수 있습니다.