# Pipes

## 1. 개요

Pipe는 Controller의 Route Handler가 실행되기 전에 입력 데이터를 검증(Validation)하거나 변환(Transformation)하는 NestJS 구성 요소입니다.

NestJS에서는 `@Injectable()` 데코레이터와 `PipeTransform` 인터페이스를 사용하여 Pipe를 구현합니다.

Pipe는 Controller의 메서드에 전달될 인자를 대상으로 동작하며, 요청 데이터가 애플리케이션에서 기대하는 형식과 조건을 충족하는지 검사합니다.

대표적인 활용 사례는 다음과 같습니다.

- URL Path Parameter의 데이터 타입 변환
- Query Parameter의 데이터 검증 및 변환
- Request Body의 DTO 기반 유효성 검사
- 문자열을 숫자 또는 Boolean 값으로 변환
- UUID 형식 검증
- 필수 입력값 확인
- 잘못된 요청 데이터에 대한 예외 발생
- 사용자 정의 입력 데이터 변환
- 업로드 파일의 크기 및 형식 검증

Pipe의 핵심적인 역할은 **Controller에 전달되는 입력 데이터의 유효성을 보장하고, 필요한 형태로 변환하는 것**입니다.

이를 통해 Controller에서 반복적으로 수행하는 입력 데이터 검증과 변환 로직을 분리할 수 있습니다.

---

## 2. Request Lifecycle에서 Pipe의 위치

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

Pipe는 Guard가 요청 실행을 허용하고, Interceptor의 사전 처리 단계가 실행된 이후 Controller Handler가 호출되기 직전에 동작합니다.

Pipe에서는 Controller에 전달될 입력값을 검증하거나 변환할 수 있습니다.

### 2.1. Pipe의 요청 처리 흐름

```text
HTTP Request
     │
     ▼
Middleware
     │
     ▼
Guard
     │
     ▼
Interceptor (Before)
     │
     ▼
Pipe.transform()
     │
     ▼
  입력값 검증
     │
     ├── 유효함
     │      │
     │      ▼
     │   데이터 변환
     │      │
     │      ▼
     │   Controller
     │      │
     │      ▼
     │    Service
     │
     └── 유효하지 않음
            │
            ▼
       Exception
            │
            ▼
      Exception Filter
            │
            ▼
       HTTP Error
```

Pipe에서 예외가 발생하면 Controller Handler는 실행되지 않습니다.

기본적으로 NestJS의 입력값 검증 관련 내장 Pipe는 잘못된 입력값에 대해 `BadRequestException`을 발생시키며, 별도의 예외 처리 설정이 없다면 HTTP 400 응답이 생성됩니다.

단, Pipe의 종류와 설정에 따라 발생하는 예외 및 HTTP 상태 코드는 달라질 수 있습니다.

---

## 3. Pipe의 주요 기능

Pipe는 크게 두 가지 목적으로 사용합니다.

1. Transformation
2. Validation

### 3.1. Transformation

Transformation은 입력 데이터를 Controller에서 사용하기 적합한 형태로 변환하는 기능입니다.

예를 들어 다음 요청을 살펴보겠습니다.

```http
GET /users/123
```

HTTP Path Parameter의 `123`은 문자열로 전달됩니다.

그러나 Controller에서 사용자 ID를 숫자로 사용해야 한다면 해당 값을 `number` 타입으로 변환해야 합니다.

```typescript
@Get(':id')
findOne(
  @Param('id', ParseIntPipe) id: number,
) {
  return {
    id,
  };
}
```

`ParseIntPipe`는 문자열로 전달된 `123`을 숫자 `123`으로 변환합니다.

따라서 Controller는 변환된 값을 전달받습니다.

```text
HTTP Request
    │
    ▼
"123" (string)
    │
    ▼
ParseIntPipe
    │
    ▼
123 (number)
    │
    ▼
Controller
```

### 3.2. Validation

Validation은 입력 데이터가 지정된 조건을 충족하는지 검사하는 기능입니다.

예를 들어 사용자 생성 API에서 이메일과 비밀번호를 필수값으로 요구할 수 있습니다.

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

이러한 요청 데이터의 필수값, 데이터 타입, 문자열 길이 등의 조건을 DTO에 정의하고 `ValidationPipe`를 통해 검증할 수 있습니다.

검증에 실패하면 Controller를 실행하지 않고 예외를 발생시킵니다.

### 3.3. Transformation과 Validation의 차이

| 항목 | Transformation | Validation |
|---|---|---|
| 목적 | 입력 데이터 변환 | 입력 데이터 유효성 검사 |
| 주요 동작 | 데이터 타입 또는 값 변경 | 조건 충족 여부 확인 |
| 반환값 | 변환된 데이터 | 검증을 통과한 데이터 |
| 실패 처리 | 변환할 수 없는 경우 예외 발생 가능 | 검증 실패 시 예외 발생 |
| 대표 Pipe | `ParseIntPipe` | `ValidationPipe` |

Transformation과 Validation은 독립적인 개념이지만, 하나의 Pipe에서 두 기능을 함께 수행할 수도 있습니다.

예를 들어 `ParseIntPipe`는 입력값이 정수로 변환 가능한지 검사하고, 변환된 숫자를 반환합니다.

---

## 4. PipeTransform 인터페이스

NestJS의 사용자 정의 Pipe는 `PipeTransform` 인터페이스를 구현하여 작성합니다.

### 4.1. PipeTransform 구조

`PipeTransform` 인터페이스의 주요 구조는 다음과 같습니다.

```typescript
export interface PipeTransform<T = any, R = any> {
  transform(
    value: T,
    metadata: ArgumentMetadata,
  ): R;
}
```

`transform()` 메서드는 동기 또는 비동기 방식으로 구현할 수 있습니다.

| 구성 요소 | 설명 |
|---|---|
| `PipeTransform` | Pipe 구현에 필요한 인터페이스입니다. |
| `transform()` | 입력값을 검증하거나 변환합니다. |
| `value` | Controller Handler에 전달될 입력값입니다. |
| `metadata` | 해당 입력값의 메타데이터입니다. |
| `T` | 입력 데이터 타입입니다. |
| `R` | 변환 후 반환 데이터 타입입니다. |

`transform()`은 입력값을 그대로 반환하거나 변환된 값을 반환할 수 있습니다.

검증에 실패한 경우에는 예외를 발생시킬 수 있습니다.

### 4.2. 기본 Pipe 구현

다음은 문자열 양쪽의 공백을 제거하는 Pipe입니다.

**trim.pipe.ts**

```typescript
import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
} from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform<string, string> {
  transform(
    value: string,
    metadata: ArgumentMetadata,
  ): string {
    return value.trim();
  }
}
```

Controller에서는 다음과 같이 사용할 수 있습니다.

```typescript
import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import { TrimPipe } from './trim.pipe';

@Controller('users')
export class UsersController {
  @Get('search')
  search(
    @Query('keyword', TrimPipe) keyword: string,
  ) {
    return {
      keyword,
    };
  }
}
```

요청:

```http
GET /users/search?keyword=%20nestjs%20
```

변환 결과:

```json
{
  "keyword": "nestjs"
}
```

위 예제의 `TrimPipe`는 문자열이 정상적으로 전달된다는 전제하에 작성했습니다.

선택적 Query Parameter처럼 `undefined`가 전달될 수 있는 경우에는 해당 입력값에 대한 처리도 필요합니다.

---

## 5. ArgumentMetadata

`ArgumentMetadata`는 Pipe가 처리하는 입력값의 종류와 타입에 관한 정보를 제공합니다.

NestJS는 Pipe의 `transform()` 메서드를 호출할 때 `ArgumentMetadata`를 함께 전달합니다.

### 5.1. ArgumentMetadata 구조

```typescript
export interface ArgumentMetadata {
  type: 'body' | 'query' | 'param' | 'custom';
  metatype?: Type<unknown>;
  data?: string;
}
```

각 속성의 역할은 다음과 같습니다.

| 속성 | 설명 |
|---|---|
| `type` | 입력값의 출처를 나타냅니다. |
| `metatype` | Handler 파라미터에 선언된 타입의 런타임 메타데이터입니다. |
| `data` | `@Param('id')`처럼 데코레이터에 지정된 데이터 키입니다. |

### 5.2. type

`type`은 현재 Pipe가 처리하는 데이터가 어디에서 전달되었는지 나타냅니다.

대표적인 값은 다음과 같습니다.

| 값 | 설명 |
|---|---|
| `body` | Request Body에서 추출한 값입니다. |
| `query` | Query Parameter에서 추출한 값입니다. |
| `param` | Path Parameter에서 추출한 값입니다. |
| `custom` | 사용자 정의 파라미터 데코레이터 등에서 추출한 값입니다. |

### 5.3. metatype

`metatype`은 Controller Handler에 선언된 파라미터의 런타임 타입 정보를 나타냅니다.

예를 들어 다음 Controller를 살펴보겠습니다.

```typescript
@Get(':id')
findOne(
  @Param('id') id: number,
) {
  return id;
}
```

TypeScript의 데코레이터 메타데이터가 정상적으로 제공되는 환경에서는 `metatype`으로 `Number` 생성자를 확인할 수 있습니다.

다만 TypeScript의 타입 정보가 모두 런타임에 유지되는 것은 아닙니다.

예를 들어 Interface와 Generic Type은 일반적으로 런타임에 구체적인 타입 정보를 제공하지 않습니다.

따라서 DTO 기반 검증에서는 런타임에 존재하는 Class를 사용하는 것이 중요합니다.

### 5.4. data

`data`는 파라미터 데코레이터에 지정한 키 정보를 제공합니다.

```typescript
@Get(':id')
findOne(
  @Param('id') id: string,
) {
  return id;
}
```

위 예제에서는 `data`에 `'id'`가 전달될 수 있습니다.

### 5.5. 메타데이터 확인 예제

```typescript
import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
} from '@nestjs/common';

@Injectable()
export class LoggingPipe implements PipeTransform {
  transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): unknown {
    console.log('Value:', value);
    console.log('Type:', metadata.type);
    console.log('Metatype:', metadata.metatype);
    console.log('Data:', metadata.data);

    return value;
  }
}
```

`ArgumentMetadata`는 사용자 정의 Pipe가 입력값의 종류와 타입에 따라 서로 다른 검증 또는 변환 정책을 적용할 때 활용할 수 있습니다.

---

## 6. NestJS 내장 Pipe

NestJS는 자주 사용하는 입력값 검증 및 변환 기능을 내장 Pipe로 제공합니다.

대표적인 내장 Pipe는 다음과 같습니다.

| Pipe | 주요 기능 |
|---|---|
| `ValidationPipe` | DTO 기반 데이터 유효성 검증 |
| `ParseIntPipe` | 정수 변환 및 검증 |
| `ParseFloatPipe` | 부동소수점 숫자 변환 및 검증 |
| `ParseBoolPipe` | Boolean 변환 및 검증 |
| `ParseArrayPipe` | 배열 입력값 처리 및 검증 |
| `ParseUUIDPipe` | UUID 형식 검증 |
| `ParseEnumPipe` | Enum 값 검증 |
| `ParseFilePipe` | 업로드 파일 검증 |
| `DefaultValuePipe` | 입력값이 없을 때 기본값 제공 |

이러한 Pipe는 일반적으로 `@nestjs/common` 패키지에서 가져와 사용합니다.

### 6.1. ParseIntPipe

문자열을 정수로 변환합니다.

```typescript
@Get(':id')
findOne(
  @Param('id', ParseIntPipe) id: number,
) {
  return {
    id,
  };
}
```

요청:

```http
GET /users/123
```

변환 결과:

```typescript
123
```

반면 다음 요청은 정수로 변환할 수 없으므로 HTTP 400 오류가 발생합니다.

```http
GET /users/abc
```

### 6.2. ParseFloatPipe

문자열을 부동소수점 숫자로 변환합니다.

```typescript
@Get('price')
getPrice(
  @Query('amount', ParseFloatPipe) amount: number,
) {
  return {
    amount,
  };
}
```

요청:

```http
GET /users/price?amount=12.5
```

변환 결과:

```json
{
  "amount": 12.5
}
```

### 6.3. ParseBoolPipe

문자열을 Boolean 값으로 변환합니다.

```typescript
@Get()
findAll(
  @Query('active', ParseBoolPipe) active: boolean,
) {
  return {
    active,
  };
}
```

요청:

```http
GET /users?active=true
```

변환 결과:

```json
{
  "active": true
}
```

`ParseBoolPipe`는 일반적으로 문자열 `"true"`, `"false"` 등의 값을 Boolean으로 변환합니다.

임의의 문자열을 JavaScript의 truthy/falsy 규칙으로 변환하는 Pipe는 아닙니다.

### 6.4. ParseUUIDPipe

UUID 형식의 입력값을 검증합니다.

```typescript
@Get(':id')
findOne(
  @Param('id', ParseUUIDPipe) id: string,
) {
  return {
    id,
  };
}
```

특정 UUID 버전을 지정할 수도 있습니다.

```typescript
@Get(':id')
findOne(
  @Param(
    'id',
    new ParseUUIDPipe({
      version: '4',
    }),
  )
  id: string,
) {
  return {
    id,
  };
}
```

위 예제에서는 UUID v4 형식의 입력값만 허용합니다.

### 6.5. ParseEnumPipe

입력값이 지정한 Enum에 포함되는지 검사합니다.

```typescript
import {
  Controller,
  Get,
  Query,
  ParseEnumPipe,
} from '@nestjs/common';

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Controller('users')
export class UsersController {
  @Get()
  findAll(
    @Query(
      'status',
      new ParseEnumPipe(UserStatus),
    )
    status: UserStatus,
  ) {
    return {
      status,
    };
  }
}
```

다음 요청은 정상적으로 처리됩니다.

```http
GET /users?status=active
```

반면 `status=unknown`과 같이 Enum에 포함되지 않은 값을 전달하면 검증 오류가 발생합니다.

### 6.6. ParseArrayPipe

Query Parameter 등의 값을 배열로 처리할 때 사용할 수 있습니다.

```typescript
@Get()
findAll(
  @Query(
    'ids',
    new ParseArrayPipe({
      items: Number,
      separator: ',',
    }),
  )
  ids: number[],
) {
  return {
    ids,
  };
}
```

요청:

```http
GET /users?ids=1,2,3
```

변환 결과:

```json
{
  "ids": [1, 2, 3]
}
```

`items` 옵션을 사용하면 배열 요소에 대한 타입 검사와 변환을 적용할 수 있습니다.

### 6.7. DefaultValuePipe

입력값이 `null` 또는 `undefined`인 경우 기본값을 제공합니다.

```typescript
@Get()
findAll(
  @Query(
    'page',
    new DefaultValuePipe(1),
    ParseIntPipe,
  )
  page: number,
) {
  return {
    page,
  };
}
```

요청:

```http
GET /users
```

결과:

```json
{
  "page": 1
}
```

Pipe는 선언된 순서대로 적용되므로 `DefaultValuePipe`를 먼저 실행하여 기본값을 설정하고, 이후 `ParseIntPipe`에서 정수 검증 및 변환을 수행하도록 구성합니다.

---

## 7. Pipe 적용 범위

NestJS에서는 Pipe를 다음 네 가지 범위에 적용할 수 있습니다.

1. Global Pipe
2. Controller-scoped Pipe
3. Method-scoped Pipe
4. Parameter-scoped Pipe

### 7.1. Parameter-scoped Pipe

특정 Handler 파라미터에만 Pipe를 적용합니다.

```typescript
@Get(':id')
findOne(
  @Param('id', ParseIntPipe) id: number,
) {
  return {
    id,
  };
}
```

이 경우 `ParseIntPipe`는 `id` 파라미터에만 적용됩니다.

### 7.2. Method-scoped Pipe

특정 Route Handler에 Pipe를 적용합니다.

```typescript
import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Post()
  @UsePipes(new ValidationPipe())
  create(
    @Body() createUserDto: CreateUserDto,
  ) {
    return createUserDto;
  }
}
```

위 예제는 `CreateUserDto`가 별도로 정의되어 있다는 전제하에 작성했습니다.

Method-scoped Pipe는 해당 Handler의 파라미터들을 대상으로 동작합니다.

### 7.3. Controller-scoped Pipe

Controller 클래스에 Pipe를 적용하면 해당 Controller의 Route Handler에 적용됩니다.

```typescript
@Controller('users')
@UsePipes(new ValidationPipe())
export class UsersController {
  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
  ) {
    return createUserDto;
  }
}
```

이 방식은 특정 Controller의 API에 공통 검증 정책을 적용할 때 사용합니다.

### 7.4. Global Pipe

애플리케이션 전체에 Pipe를 적용하려면 `main.ts`에서 `useGlobalPipes()`를 사용할 수 있습니다.

**main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe(),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

이 설정은 애플리케이션 전체의 Controller Handler 파라미터에 `ValidationPipe`를 적용합니다.

단, 실제 검증 여부는 해당 파라미터의 런타임 타입 정보와 검증 규칙에 따라 달라집니다.

### 7.5. APP_PIPE를 이용한 전역 등록

Dependency Injection이 필요한 Global Pipe는 `APP_PIPE` 토큰을 사용하여 등록할 수 있습니다.

**app.module.ts**

```typescript
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
```

이 방식에서는 NestJS DI Container가 Pipe 인스턴스를 생성하고 관리합니다.

`APP_PIPE`로 등록된 Pipe는 해당 Module에만 한정되지 않고 애플리케이션 전체에 적용됩니다.

---

## 8. Pipe 실행 순서

Pipe는 적용 범위에 따라 다음 순서로 실행됩니다.

1. Global Pipe
2. Controller-scoped Pipe
3. Method-scoped Pipe
4. Parameter-scoped Pipe

### 8.1. 실행 순서 예제

```text
HTTP Request
     │
     ▼
Global Pipe
     │
     ▼
Controller Pipe
     │
     ▼
Method Pipe
     │
     ▼
Parameter Pipe
     │
     ▼
Controller Handler
```

동일한 파라미터에 여러 Pipe가 적용되면 선언된 순서대로 실행됩니다.

```typescript
@Query(
  'page',
  new DefaultValuePipe(1),
  ParseIntPipe,
)
page: number
```

이 경우 다음 순서로 실행됩니다.

```text
Query Parameter
      │
      ▼
DefaultValuePipe
      │
      ▼
ParseIntPipe
      │
      ▼
Controller
```

### 8.2. 여러 Handler 파라미터의 실행 순서

NestJS 공식 Request Lifecycle 문서에서는 여러 Handler 파라미터를 처리할 때 마지막 파라미터부터 첫 번째 파라미터 순서로 Pipe가 적용된다고 설명합니다.

예를 들어 다음과 같은 Handler가 있다고 가정합니다.

```typescript
@Patch(':id')
@UsePipes(RouteValidationPipe)
update(
  @Body() body: UpdateUserDto,
  @Param() params: UpdateUserParams,
  @Query() query: UpdateUserQuery,
) {
  return {
    body,
    params,
    query,
  };
}
```

위 예제에서 각 DTO와 `RouteValidationPipe`는 별도로 정의되어 있다고 가정합니다.

Pipe는 다음 파라미터 순서로 처리됩니다.

```text
Query
  │
  ▼
Params
  │
  ▼
Body
```

전역, Controller, Method 범위의 Pipe가 있다면 각 범위의 Pipe가 우선순위에 따라 적용되고, 이후 Parameter-scoped Pipe가 실행됩니다.

따라서 Pipe가 실행되는 순서에 의존하여 서로 다른 파라미터 사이의 상태를 공유하는 방식은 피하는 것이 좋습니다.

---

## 9. ValidationPipe와 DTO

`ValidationPipe`는 DTO(Data Transfer Object)에 정의된 검증 규칙을 기반으로 요청 데이터를 검증합니다.

NestJS에서는 일반적으로 `class-validator`와 `class-transformer` 패키지를 사용하여 DTO 기반 Validation을 구현합니다.

### 9.1. 필요한 패키지 설치

다음 패키지를 설치해야 합니다.

```bash
npm install class-validator class-transformer
```

### 9.2. DTO 정의

**create-user.dto.ts**

```typescript
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  password: string;
}
```

각 데코레이터의 역할은 다음과 같습니다.

| 데코레이터 | 설명 |
|---|---|
| `@IsEmail()` | 이메일 형식인지 검증합니다. |
| `@IsString()` | 문자열인지 검증합니다. |
| `@MinLength()` | 문자열의 최소 길이를 검증합니다. |
| `@MaxLength()` | 문자열의 최대 길이를 검증합니다. |

TypeScript의 `strictPropertyInitialization` 옵션이 활성화된 환경에서는 DTO 필드에 초기값을 설정하거나 definite assignment assertion(`!`)을 사용할 수 있습니다.

```typescript
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
```

`!`는 TypeScript 컴파일러에 대한 선언이며, 런타임 입력값 검증을 수행하지 않습니다.

실제 검증은 `class-validator`와 `ValidationPipe`에서 수행합니다.

### 9.3. Controller에 적용

**users.controller.ts**

```typescript
import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  @Post()
  @UsePipes(new ValidationPipe())
  create(
    @Body() createUserDto: CreateUserDto,
  ) {
    return {
      email: createUserDto.email,
    };
  }
}
```

요청:

```http
POST /users
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

입력값이 모든 조건을 충족하면 Controller Handler가 실행됩니다.

반대로 다음과 같은 입력값을 전달하면 검증에 실패합니다.

```json
{
  "email": "invalid-email",
  "password": "123"
}
```

기본 설정에서는 HTTP 400 응답이 생성됩니다.

응답의 `message`에는 실패한 검증 조건에 대한 설명이 포함될 수 있습니다.

---

## 10. ValidationPipe 주요 옵션

`ValidationPipe`는 다양한 옵션을 통해 입력 데이터의 검증 및 변환 정책을 설정할 수 있습니다.

### 10.1. 주요 설정 옵션

| 옵션 | 설명 |
|---|---|
| `transform` | 입력 데이터를 DTO 인스턴스 등으로 변환합니다. |
| `whitelist` | 검증 데코레이터가 없는 속성을 제거합니다. |
| `forbidNonWhitelisted` | 허용되지 않은 속성이 존재하면 예외를 발생시킵니다. |
| `forbidUnknownValues` | 검증할 수 없는 알 수 없는 객체를 거부하도록 설정합니다. |
| `skipMissingProperties` | 누락되거나 `null`, `undefined`인 속성의 검증을 건너뜁니다. |
| `disableErrorMessages` | 상세한 검증 오류 메시지의 노출을 제한합니다. |
| `exceptionFactory` | 검증 실패 시 발생시킬 예외를 사용자 정의합니다. |
| `errorHttpStatusCode` | 검증 실패에 사용할 HTTP 상태 코드를 지정합니다. |

### 10.2. transform

`transform` 옵션은 요청 데이터를 Handler에 선언된 DTO 클래스의 인스턴스로 변환하도록 설정합니다.

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
  }),
);
```

또한 Path Parameter와 Query Parameter에 선언된 기본 타입을 기반으로 원시값 변환을 수행할 수 있습니다.

```typescript
@Get(':id')
findOne(
  @Param('id') id: number,
) {
  return {
    id,
  };
}
```

`transform: true`가 활성화된 경우 문자열 `"123"`을 숫자 `123`으로 변환할 수 있습니다.

다만 자동 타입 변환은 명시적인 입력값 검증을 모두 대체하는 기능은 아닙니다.

엄격한 정수 검증이 필요한 경우에는 `ParseIntPipe` 등을 사용할 수 있습니다.

### 10.3. whitelist

`whitelist`는 DTO에서 검증 데코레이터가 선언되지 않은 속성을 제거합니다.

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
  }),
);
```

예를 들어 DTO에 다음 두 속성만 정의되어 있다고 가정합니다.

```typescript
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
```

클라이언트가 다음 데이터를 전달합니다.

```json
{
  "email": "user@example.com",
  "password": "password123",
  "isAdmin": true
}
```

`whitelist: true`를 적용하면 DTO의 검증 대상에 포함되지 않은 `isAdmin` 속성이 제거됩니다.

### 10.4. forbidNonWhitelisted

`forbidNonWhitelisted`는 허용되지 않은 속성이 존재할 경우 해당 요청을 거부하도록 설정합니다.

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
);
```

이 경우 허용되지 않은 `isAdmin` 속성을 전달하면 해당 속성을 제거하는 대신 HTTP 400 오류를 발생시킵니다.

외부 입력 데이터의 구조를 엄격하게 관리해야 하는 API에서 유용합니다.

### 10.5. disableErrorMessages

운영 환경에서 상세한 검증 오류 메시지를 제한하려면 다음과 같이 설정할 수 있습니다.

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    disableErrorMessages: true,
  }),
);
```

이 옵션은 클라이언트에 전달되는 검증 오류의 상세 정보를 줄이기 위한 설정입니다.

다만 입력값 검증 자체를 비활성화하지는 않습니다.

### 10.6. 일반적인 전역 ValidationPipe 구성

다음은 일반적인 REST API에서 활용할 수 있는 설정 예제입니다.

**main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

이 설정은 다음 정책을 적용합니다.

1. 입력 데이터를 필요한 타입으로 변환합니다.
2. DTO에서 정의하지 않은 속성을 허용하지 않습니다.
3. 입력값 검증에 실패하면 Controller Handler를 실행하지 않습니다.

실제 프로젝트에서는 API의 요구사항과 클라이언트 호환성을 고려하여 옵션을 선택해야 합니다.

---

## 11. Custom Pipe 구현

NestJS에서는 `PipeTransform` 인터페이스를 구현하여 사용자 정의 Pipe를 생성할 수 있습니다.

### 11.1. 사용자 정의 Transformation Pipe

다음은 문자열을 대문자로 변환하는 Pipe입니다.

**uppercase.pipe.ts**

```typescript
import {
  Injectable,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class UppercasePipe
  implements PipeTransform<unknown, string>
{
  transform(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(
        'Input must be a string',
      );
    }

    return value.toUpperCase();
  }
}
```

Controller:

```typescript
@Get('search')
search(
  @Query('keyword', UppercasePipe) keyword: string,
) {
  return {
    keyword,
  };
}
```

요청:

```http
GET /users/search?keyword=nestjs
```

응답:

```json
{
  "keyword": "NESTJS"
}
```

### 11.2. 사용자 정의 Validation Pipe

다음은 양의 정수만 허용하는 Pipe입니다.

**positive-int.pipe.ts**

```typescript
import {
  Injectable,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class PositiveIntPipe
  implements PipeTransform<unknown, number>
{
  transform(value: unknown): number {
    if (
      typeof value !== 'string' ||
      !/^[0-9]+$/.test(value)
    ) {
      throw new BadRequestException(
        'A positive integer is required',
      );
    }

    const parsed = Number(value);

    if (
      !Number.isSafeInteger(parsed) ||
      parsed <= 0
    ) {
      throw new BadRequestException(
        'A positive safe integer is required',
      );
    }

    return parsed;
  }
}
```

Controller:

```typescript
@Get(':id')
findOne(
  @Param('id', PositiveIntPipe) id: number,
) {
  return {
    id,
  };
}
```

다음 요청은 정상 처리됩니다.

```http
GET /users/10
```

반면 다음 요청은 HTTP 400 오류가 발생합니다.

```http
GET /users/-10
```

위 예제는 URL Path Parameter가 문자열로 전달되는 HTTP 환경을 전제로 합니다.

또한 JavaScript에서 안전하게 표현할 수 있는 양의 정수 범위만 허용합니다.

### 11.3. 비동기 Pipe

Pipe의 `transform()` 메서드는 비동기 작업도 수행할 수 있습니다.

```typescript
import {
  Injectable,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class AsyncValidationPipe
  implements PipeTransform<string, Promise<string>>
{
  async transform(value: string): Promise<string> {
    if (!value) {
      throw new BadRequestException(
        'Value is required',
      );
    }

    return value;
  }
}
```

실제 구현에서는 비동기 데이터 조회나 외부 서비스 호출 등을 수행할 수 있습니다.

다만 입력값 검증을 위해 외부 시스템을 호출하면 요청 처리 시간이 증가할 수 있으므로 적절한 사용 범위를 판단해야 합니다.

---

## 12. Pipe와 Dependency Injection

Class-based Pipe는 NestJS의 Dependency Injection을 지원합니다.

따라서 Pipe 내부에서 다른 Provider를 생성자로 주입받을 수 있습니다.

### 12.1. Service를 사용하는 Pipe

다음은 입력된 사용자 ID가 실제로 존재하는지 확인하는 예제입니다.

**users.service.ts**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  async exists(id: number): Promise<boolean> {
    // 예제용 임시 구현입니다.
    return id === 1;
  }
}
```

**user-exists.pipe.ts**

```typescript
import {
  Injectable,
  PipeTransform,
  NotFoundException,
} from '@nestjs/common';

import { UsersService } from './users.service';

@Injectable()
export class UserExistsPipe
  implements PipeTransform<number, Promise<number>>
{
  constructor(
    private readonly usersService: UsersService,
  ) {}

  async transform(id: number): Promise<number> {
    const exists = await this.usersService.exists(id);

    if (!exists) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    return id;
  }
}
```

Controller:

```typescript
@Get(':id')
findOne(
  @Param(
    'id',
    ParseIntPipe,
    UserExistsPipe,
  )
  id: number,
) {
  return {
    id,
  };
}
```

실행 과정은 다음과 같습니다.

```text
HTTP Request
     │
     ▼
"1" (string)
     │
     ▼
ParseIntPipe
     │
     ▼
1 (number)
     │
     ▼
UserExistsPipe
     │
     ▼
UsersService.exists(1)
     │
     ├── true ─────► Controller
     │
     └── false ────► HTTP 404
```

위 예제에서 `UserExistsPipe`는 `UsersService`에 의존하므로 해당 Service와 Pipe를 적절한 Module에 Provider로 등록해야 합니다.

```typescript
@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UserExistsPipe,
  ],
})
export class UsersModule {}
```

이 예제는 Dependency Injection과 비동기 Pipe의 활용을 설명하기 위한 것입니다.

실제 애플리케이션에서는 데이터베이스 조회의 중복 여부와 비즈니스 정책에 따라 리소스 존재 여부 검사를 Service에 배치하는 것이 더 적합할 수도 있습니다.

---

## 13. Schema 기반 Validation

NestJS에서는 DTO 클래스의 데코레이터를 사용하는 방식 외에도 Schema 기반 Validation을 사용할 수 있습니다.

최신 NestJS 공식 Validation 문서에서는 `StandardSchemaValidationPipe`를 통해 Standard Schema 호환 라이브러리의 Schema를 활용하는 방식을 설명합니다.

대표적인 라이브러리는 다음과 같습니다.

- Zod
- Valibot
- ArkType
- 기타 Standard Schema 호환 라이브러리

### 13.1. DTO 기반과 Schema 기반 검증 비교

| 항목 | DTO 기반 | Schema 기반 |
|---|---|---|
| 주요 도구 | `ValidationPipe` | `StandardSchemaValidationPipe` |
| 검증 규칙 정의 | Class Decorator | Schema 객체 |
| 타입 정보 | DTO 클래스 | Schema에서 타입 추론 가능 |
| 주요 의존성 | `class-validator`, `class-transformer` | Standard Schema 호환 라이브러리 |
| 특징 | NestJS 클래스 기반 구조와 자연스럽게 통합 | Schema 합성 및 타입 추론 활용 |

### 13.2. Zod를 활용한 개념 예제

다음 예제는 Zod와 Standard Schema 기반 검증을 사용하는 구조입니다.

사용하는 NestJS 버전에서 `StandardSchemaValidationPipe`와 Schema 지정 기능을 지원해야 하며, `zod` 패키지가 설치되어 있어야 합니다.

```bash
npm install zod
```

**create-user.schema.ts**

```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type CreateUserInput =
  z.infer<typeof createUserSchema>;
```

Controller:

```typescript
import {
  Body,
  Controller,
  Post,
  StandardSchemaValidationPipe,
} from '@nestjs/common';

import {
  createUserSchema,
  CreateUserInput,
} from './create-user.schema';

@Controller('users')
export class UsersController {
  @Post()
  create(
    @Body({
      schema: createUserSchema,
    })
    input: CreateUserInput,
  ) {
    return {
      email: input.email,
    };
  }
}
```

위 예제는 `StandardSchemaValidationPipe`를 전역적으로 등록했다는 전제하에 작성했습니다.

```typescript
app.useGlobalPipes(
  new StandardSchemaValidationPipe(),
);
```

Schema 기반 검증을 사용하면 데이터 검증 규칙과 타입 정의를 동일한 Schema에서 관리할 수 있습니다.

다만 NestJS 버전과 Schema 라이브러리 버전에 따라 API 지원 여부가 달라질 수 있으므로 공식 문서의 호환성을 확인해야 합니다.

---

## 14. Pipe와 다른 Request Lifecycle 구성 요소의 차이

Middleware, Guard, Interceptor, Pipe는 모두 요청 처리 과정에서 사용되지만 역할과 실행 시점이 다릅니다.

| 항목 | Middleware | Guard | Interceptor | Pipe |
|---|---|---|---|---|
| 실행 시점 | Guard 이전 | Interceptor 이전 | Pipe 이전 | Controller 직전 |
| 주요 목적 | 요청 전처리 | 접근 권한 판단 | Handler 실행 전후 처리 | 입력값 검증 및 변환 |
| 주요 메서드 | `use()` | `canActivate()` | `intercept()` | `transform()` |
| ExecutionContext | 기본 API에서 미지원 | 지원 | 지원 | 직접 전달되지 않음 |
| Handler 메타데이터 | 기본 API에서 미지원 | 접근 가능 | 접근 가능 | ArgumentMetadata 제공 |
| 입력값 변환 | 요청 객체 수정 가능 | 주된 목적 아님 | 요청 흐름 제어 가능 | 지원 |
| 응답 변환 | 직접 응답 처리 가능 | 주된 목적 아님 | 지원 | 직접적인 목적 아님 |
| 대표 활용 | 로깅, Request ID | 인증, 인가 | 응답 변환, 캐싱 | Validation, Parsing |

### 14.1. Guard와 Pipe

Guard는 요청이 특정 Handler를 실행할 권한이 있는지 판단합니다.

Pipe는 Handler에 전달될 데이터가 올바른 형식인지 검사합니다.

예를 들어 다음과 같이 역할을 구분할 수 있습니다.

```text
GET /users/123
       │
       ▼
AuthGuard
       │
       ├── 인증 실패 ──► HTTP 401
       │
       ▼
ParseIntPipe
       │
       ├── 변환 실패 ──► HTTP 400
       │
       ▼
UsersController
```

인증 검사는 Guard에서 수행하고, 사용자 ID의 숫자 변환은 Pipe에서 수행합니다.

### 14.2. Interceptor와 Pipe

Interceptor는 Handler 실행 전후의 전체 흐름을 감쌀 수 있습니다.

반면 Pipe는 Handler에 전달할 인자를 검증하거나 변환하는 데 집중합니다.

따라서 API 응답 구조를 표준화하는 기능은 Interceptor가 적합하고, Request Body의 DTO 검증은 Pipe가 적합합니다.

---

## 15. Pipe 사용 시 주의사항

### 15.1. TypeScript 타입만으로 검증되지 않음

다음과 같이 파라미터 타입을 `number`로 선언하더라도 HTTP 요청값이 자동으로 검증되는 것은 아닙니다.

```typescript
@Get(':id')
findOne(
  @Param('id') id: number,
) {
  return {
    id,
  };
}
```

TypeScript 타입은 기본적으로 컴파일 시점에 사용됩니다.

따라서 런타임 입력값 검증이 필요한 경우에는 `ParseIntPipe` 또는 적절한 Transformation 설정을 사용해야 합니다.

### 15.2. DTO는 Class 기반으로 정의

`ValidationPipe`와 `class-validator` 기반의 검증에서는 DTO를 Class로 정의하는 것이 일반적입니다.

TypeScript Interface는 런타임에 존재하지 않으므로 데코레이터 기반 검증에 필요한 구체적인 클래스 정보를 제공하지 않습니다.

### 15.3. 검증과 비즈니스 로직의 분리

Pipe에서는 데이터 형식과 입력값 검증에 집중하는 것이 좋습니다.

복잡한 도메인 정책이나 여러 Aggregate에 걸친 비즈니스 규칙은 Service 또는 도메인 계층에서 처리하는 것이 적합할 수 있습니다.

### 15.4. ValidationPipe 설정의 영향 범위

Global ValidationPipe에 `whitelist` 또는 `forbidNonWhitelisted`를 적용하면 여러 API의 입력 데이터 처리 방식이 변경될 수 있습니다.

따라서 기존 클라이언트가 추가 속성을 전달하고 있는지 확인하고, API 계약에 맞는 검증 정책을 설정해야 합니다.

### 15.5. 기본값과 선택적 파라미터

선택적 Query Parameter에 `ParseIntPipe` 또는 `ParseBoolPipe`를 직접 적용하면 입력값이 없는 경우 검증에 실패할 수 있습니다.

기본값이 필요한 경우에는 `DefaultValuePipe`를 먼저 적용하는 것이 적합합니다.

```typescript
@Query(
  'page',
  new DefaultValuePipe(1),
  ParseIntPipe,
)
page: number
```

### 15.6. DTO 변환과 중첩 객체

중첩된 DTO 객체를 검증하려면 `class-validator`의 `@ValidateNested()`와 `class-transformer`의 `@Type()` 등을 적절히 구성해야 할 수 있습니다.

단순히 부모 DTO에 `@IsObject()`를 선언하는 것만으로 중첩된 객체의 모든 속성이 자동 검증되는 것은 아닙니다.

### 15.7. 파일 업로드 검증

파일 업로드에는 `ParseFilePipe`와 File Validator를 사용할 수 있습니다.

파일 크기와 형식 검사는 입력값 검증의 일부이지만, 파일명, 콘텐츠 유형 및 저장 경로에 대한 보안 검증을 모두 대체하지는 않습니다.

### 15.8. HTTP 이외의 실행 환경

Pipe는 HTTP뿐 아니라 WebSocket과 Microservices에서도 사용할 수 있습니다.

다만 실행 환경에 따라 입력 데이터의 구조와 예외 처리 방식이 달라질 수 있습니다.

WebSocket에서는 일반적인 HTTP 예외 대신 `WsException`을 사용하도록 검증 예외를 구성할 수 있습니다.

따라서 여러 전송 방식을 지원하는 프로젝트에서는 Pipe의 검증 정책과 예외 처리 방식을 환경에 맞게 설계해야 합니다.

---

## 16. 핵심 정리

Pipe는 NestJS Request Lifecycle에서 Controller Handler가 실행되기 직전에 입력값을 검증하고 변환하는 구성 요소입니다.

핵심 특징은 다음과 같습니다.

1. **입력 데이터 검증:** 요청 데이터가 지정된 조건을 충족하는지 검사합니다.
2. **데이터 변환:** 문자열, 숫자, Boolean, 배열 등 필요한 데이터 타입으로 변환합니다.
3. **PipeTransform:** `transform()` 메서드를 구현하여 사용자 정의 Pipe를 생성합니다.
4. **ArgumentMetadata:** 입력값의 종류와 타입 정보를 활용할 수 있습니다.
5. **내장 Pipe:** `ParseIntPipe`, `ParseBoolPipe`, `ParseUUIDPipe` 등 다양한 기능을 제공합니다.
6. **ValidationPipe:** DTO의 검증 데코레이터를 사용하여 입력값을 검증합니다.
7. **적용 범위:** Global, Controller, Method, Parameter 단위로 적용할 수 있습니다.
8. **Dependency Injection:** 다른 Provider를 주입받아 검증 및 변환 기능을 구현할 수 있습니다.
9. **Schema 기반 검증:** 지원되는 NestJS 버전에서는 Standard Schema 호환 라이브러리를 활용할 수 있습니다.
10. **예외 처리:** 검증 또는 변환 실패 시 예외를 발생시켜 잘못된 입력값이 Handler에 전달되지 않도록 할 수 있습니다.

Pipe의 가장 중요한 역할은 **Controller가 처리해야 할 데이터의 형식과 유효성을 요청 처리 단계에서 미리 확인하는 것**입니다.

이를 통해 Controller는 입력 데이터의 기본적인 검증 및 변환 로직을 직접 구현하지 않고, 애플리케이션의 주요 비즈니스 처리에 집중할 수 있습니다.

---

## 참고 자료

- [NestJS 공식 문서 - Pipes](https://docs.nestjs.com/pipes)
- [NestJS 공식 문서 - Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS 공식 문서 - Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [NestJS 공식 문서 - Controllers](https://docs.nestjs.com/controllers)
- [NestJS 공식 문서 - Execution Context](https://docs.nestjs.com/fundamentals/execution-context)
- [NestJS 공식 문서 - Middleware](https://docs.nestjs.com/middleware)
- [NestJS 공식 문서 - Guards](https://docs.nestjs.com/guards)
- [NestJS 공식 문서 - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS 공식 문서 - Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS 공식 문서 - File Upload](https://docs.nestjs.com/techniques/file-upload)
- [class-validator GitHub Repository](https://github.com/typestack/class-validator)
- [class-transformer GitHub Repository](https://github.com/typestack/class-transformer)
- [Standard Schema 공식 사이트](https://standardschema.dev/)
- [Zod 공식 문서](https://zod.dev/)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)