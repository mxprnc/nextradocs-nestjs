# Validation

## 1. 개요

Validation은 클라이언트로부터 전달받은 데이터가 애플리케이션에서 요구하는 형식과 조건을 충족하는지 검사하는 과정입니다.

HTTP 요청의 Body, Query Parameter, Path Parameter 등 외부에서 전달되는 데이터는 신뢰할 수 없는 입력값으로 취급해야 합니다.

예를 들어 회원가입 API에서 이메일 형식이 잘못되거나, 필수 항목이 누락되거나, 숫자여야 하는 값에 문자열이 전달되는 경우를 처리해야 합니다.

NestJS는 이러한 검증을 선언적으로 처리할 수 있도록 `ValidationPipe`를 제공합니다.

`ValidationPipe`는 기본적으로 다음 라이브러리를 활용합니다.

- `class-validator`: Decorator 기반 데이터 유효성 검증
- `class-transformer`: 일반 JavaScript 객체를 클래스 인스턴스로 변환

최신 NestJS에서는 Standard Schema 기반의 검증 방식도 지원합니다. 이를 이용하면 Zod와 같은 스키마 검증 라이브러리도 활용할 수 있습니다.

Validation의 주요 목적은 다음과 같습니다.

- 잘못된 요청 데이터를 애플리케이션 내부로 전달하지 않도록 방지합니다.
- DTO를 사용하여 API 입력 데이터의 형식과 제약 조건을 명확하게 정의합니다.
- Controller와 Service에 반복적으로 작성되는 검증 로직을 줄입니다.
- 검증 실패 시 일관된 오류 응답을 제공합니다.
- 데이터 변환과 유효성 검사를 결합하여 입력값을 처리합니다.

## 2. Validation이 필요한 이유

### 2.1. 잘못된 입력 데이터 차단

예를 들어 다음과 같은 회원가입 요청을 처리하는 API가 있다고 가정합니다.

```json
{
  "email": "invalid-email",
  "password": "123",
  "age": -10
}
```

이 요청에는 다음과 같은 문제가 있습니다.

- `email`이 올바른 이메일 형식이 아닙니다.
- `password`가 요구되는 최소 길이를 충족하지 않습니다.
- `age`가 허용되는 범위를 벗어났습니다.

검증을 수행하지 않으면 잘못된 데이터가 Service 또는 Database 계층까지 전달될 수 있습니다.

Validation을 적용하면 이러한 입력값을 요청 처리 초기에 거부할 수 있습니다.

### 2.2. 비즈니스 로직과 입력 검증 분리

Validation을 사용하지 않는 경우 Controller에서 직접 입력값을 검사해야 할 수 있습니다.

```typescript
@Post()
createUser(@Body() body: any) {
  if (!body.email) {
    throw new BadRequestException(
      'Email is required',
    );
  }

  if (typeof body.age !== 'number') {
    throw new BadRequestException(
      'Age must be a number',
    );
  }

  return this.usersService.create(body);
}
```

입력 필드가 증가할수록 Controller의 코드도 복잡해집니다.

DTO와 `ValidationPipe`를 사용하면 검증 조건을 별도 클래스로 분리할 수 있습니다.

```typescript
@Post()
createUser(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

Controller는 요청을 Service에 전달하는 책임에 집중하고, 입력값 검증은 Pipe에서 처리할 수 있습니다.

### 2.3. 일관된 검증 정책 적용

NestJS에서는 ValidationPipe를 전역으로 등록할 수 있습니다.

이를 통해 여러 Controller에서 동일한 검증 정책을 적용할 수 있습니다.

예를 들어 다음 정책을 공통으로 적용할 수 있습니다.

- DTO에 정의되지 않은 속성 제거
- 허용되지 않은 속성이 포함된 요청 거부
- 데이터 타입 변환
- 검증 실패 시 HTTP 400 응답 반환

## 3. Validation의 주요 구성 요소

NestJS의 DTO 기반 Validation은 다음 구성 요소를 중심으로 동작합니다.

| 구성 요소 | 역할 |
|---|---|
| DTO | 요청 데이터의 구조와 검증 조건을 정의합니다. |
| `ValidationPipe` | 전달된 데이터를 검증하고 필요한 변환을 수행합니다. |
| `class-validator` | Decorator에 정의된 제약 조건을 검사합니다. |
| `class-transformer` | 일반 객체를 DTO 클래스 인스턴스로 변환합니다. |
| `ValidationError` | 검증에 실패한 속성과 오류 정보를 표현합니다. |
| Exception Filter | 발생한 검증 예외를 HTTP 응답으로 처리합니다. |

### 3.1. 요청 처리 흐름

HTTP 요청이 들어오면 관련 Guard와 Interceptor 등의 처리 과정을 거친 후, Controller Handler가 실행되기 전에 Pipe를 통해 입력값을 검증할 수 있습니다.

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
ValidationPipe
     |
     +-- Input Transformation
     |
     +-- DTO Validation
     |
     +-- Validation Success?
     |       |
     |       +-- No --> Exception --> HTTP 400
     |       |
     |       +-- Yes
     |              |
     v              v
Controller Handler
     |
     v
Service
     |
     v
Interceptor (After)
     |
     v
HTTP Response
```

이 흐름은 일반적인 HTTP 요청을 단순화한 예시입니다.

검증에 실패하면 `ValidationPipe`에서 예외가 발생하고, 정상적인 Controller Handler 실행은 중단됩니다.

Exception Filter에 대한 자세한 내용은 `02-request-lifecycle/exception-filters.md`에서 다룹니다.

## 4. Validation 환경 구성

### 4.1. 패키지 설치

Decorator 기반 Validation을 사용하려면 다음 패키지를 설치합니다.

```bash
npm install class-validator class-transformer
```

`ValidationPipe`는 NestJS의 `@nestjs/common` 패키지에서 제공됩니다.

```typescript
import { ValidationPipe } from '@nestjs/common';
```

### 4.2. TypeScript 설정

Legacy Decorator 기반의 DTO 검증을 사용하는 경우 일반적으로 다음 TypeScript 설정이 필요합니다.

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

| 옵션 | 설명 |
|---|---|
| `experimentalDecorators` | Legacy Decorator 구문을 지원합니다. |
| `emitDecoratorMetadata` | Decorator가 사용하는 타입 메타데이터를 생성합니다. |
| `strict` | TypeScript의 엄격한 타입 검사를 활성화합니다. |

NestJS CLI에서 생성한 TypeScript 프로젝트에서는 관련 설정이 기본적으로 포함되어 있을 수 있습니다.

### 4.3. 전역 ValidationPipe 등록

`main.ts`

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

  await app.listen(3000);
}

void bootstrap();
```

주요 설정은 다음과 같습니다.

- `transform`: 입력값을 DTO 인스턴스 또는 적절한 기본 타입으로 변환합니다.
- `whitelist`: 검증 Decorator가 없는 속성을 제거합니다.
- `forbidNonWhitelisted`: 허용되지 않은 속성이 포함되면 예외를 발생시킵니다.

`forbidNonWhitelisted`는 `whitelist`와 함께 사용할 때 효과적으로 동작합니다.

## 5. DTO를 이용한 Validation

### 5.1. DTO란?

DTO(Data Transfer Object)는 계층 간 데이터 전달에 사용하는 객체입니다.

NestJS에서는 주로 HTTP 요청 데이터의 구조를 정의하는 데 사용합니다.

DTO 클래스에 Validation Decorator를 적용하면 각 속성의 유효성 조건을 선언할 수 있습니다.

### 5.2. DTO 작성

다음과 같은 프로젝트 구조를 가정합니다.

```text
src/
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── app.module.ts
└── main.ts
```

`users/dto/create-user.dto.ts`

```typescript
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsInt()
  @Min(1)
  @Max(120)
  age!: number;
}
```

검증 조건은 다음과 같습니다.

| 속성 | 검증 조건 |
|---|---|
| `email` | 올바른 이메일 형식 |
| `password` | 문자열, 빈 문자열 불허, 최소 8자 |
| `age` | 정수, 1 이상 120 이하 |

`!`는 TypeScript의 Definite Assignment Assertion으로, 속성이 생성자에서 초기화되지 않았다는 컴파일 오류를 방지하기 위해 사용합니다.

런타임 검증을 수행하는 기능은 아닙니다.

### 5.3. Controller에 DTO 적용

`users.controller.ts`

```typescript
import {
  Body,
  Controller,
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
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

`@Body()`는 HTTP 요청의 Body를 추출합니다.

이후 `ValidationPipe`가 DTO 메타데이터를 이용하여 입력값을 검증합니다.

검증에 성공하면 Controller Handler가 실행됩니다.

## 6. class-validator 주요 Decorator

`class-validator`는 다양한 검증 Decorator를 제공합니다.

### 6.1. 기본 타입 검증

| Decorator | 설명 |
|---|---|
| `@IsString()` | 문자열인지 검사합니다. |
| `@IsNumber()` | 숫자인지 검사합니다. |
| `@IsInt()` | 정수인지 검사합니다. |
| `@IsBoolean()` | Boolean인지 검사합니다. |
| `@IsDate()` | Date 객체인지 검사합니다. |
| `@IsArray()` | 배열인지 검사합니다. |
| `@IsObject()` | 객체인지 검사합니다. |
| `@IsEnum()` | Enum에 정의된 값인지 검사합니다. |

예제:

```typescript
import {
  IsBoolean,
  IsInt,
  IsString,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsInt()
  price!: number;

  @IsBoolean()
  enabled!: boolean;
}
```

### 6.2. 문자열 검증

| Decorator | 설명 |
|---|---|
| `@IsEmail()` | 이메일 형식 검사 |
| `@IsUrl()` | URL 형식 검사 |
| `@IsUUID()` | UUID 형식 검사 |
| `@MinLength()` | 최소 문자열 길이 검사 |
| `@MaxLength()` | 최대 문자열 길이 검사 |
| `@Length()` | 문자열 길이 범위 검사 |
| `@Matches()` | 정규표현식 검사 |
| `@IsNotEmpty()` | 빈 값 여부 검사 |

예제:

```typescript
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  password!: string;

  @Matches(/^[a-zA-Z0-9_]+$/)
  username!: string;
}
```

### 6.3. 숫자 검증

| Decorator | 설명 |
|---|---|
| `@Min()` | 최솟값 검사 |
| `@Max()` | 최댓값 검사 |
| `@IsPositive()` | 양수 여부 검사 |
| `@IsNegative()` | 음수 여부 검사 |
| `@IsInt()` | 정수 여부 검사 |
| `@IsNumber()` | 숫자 여부 검사 |

```typescript
import {
  IsInt,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  discountRate!: number;
}
```

### 6.4. 필수값과 선택값 검증

`@IsDefined()`는 값이 `null` 또는 `undefined`인지 검사합니다.

`@IsNotEmpty()`는 `null`, `undefined` 및 빈 문자열을 허용하지 않습니다.

`@IsOptional()`은 값이 `null` 또는 `undefined`이면 해당 속성의 다른 Validator를 건너뜁니다.

```typescript
import {
  IsDefined,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProfileDto {
  @IsDefined()
  @IsString()
  nickname!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

`@IsOptional()`은 빈 문자열을 자동으로 제외하지 않습니다.

선택 항목에 `null`을 허용하지 않아야 한다면 별도의 조건부 검증을 적용해야 합니다.

## 7. ValidationPipe 적용 범위

NestJS의 Pipe는 전역, Controller, Handler 및 Parameter 단위로 적용할 수 있습니다.

### 7.1. Global Scope

```typescript
app.useGlobalPipes(
  new ValidationPipe(),
);
```

전체 애플리케이션에 적용됩니다.

공통 입력값 검증 정책을 적용하는 데 적합합니다.

### 7.2. Controller Scope

```typescript
import {
  Controller,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

@Controller('users')
@UsePipes(new ValidationPipe())
export class UsersController {}
```

해당 Controller에 속한 Handler에 적용됩니다.

### 7.3. Handler Scope

```typescript
@Post()
@UsePipes(new ValidationPipe())
create(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

해당 Handler에만 적용됩니다.

### 7.4. Parameter Scope

```typescript
@Post()
create(
  @Body(new ValidationPipe())
  dto: CreateUserDto,
) {
  return this.usersService.create(dto);
}
```

특정 Parameter에 Pipe를 적용할 수 있습니다.

적용 범위와 실행 순서에 대한 자세한 내용은 `02-request-lifecycle/pipes.md`에서 다룹니다.

## 8. ValidationPipe 주요 옵션

| 옵션 | 설명 |
|---|---|
| `transform` | 입력값을 DTO 인스턴스 또는 기본 타입으로 변환합니다. |
| `whitelist` | 검증 Decorator가 없는 속성을 제거합니다. |
| `forbidNonWhitelisted` | 허용되지 않은 속성을 오류로 처리합니다. |
| `forbidUnknownValues` | 검증할 수 없는 알 수 없는 객체를 거부합니다. |
| `disableErrorMessages` | 클라이언트에 검증 오류 메시지를 노출하지 않습니다. |
| `skipMissingProperties` | `null` 또는 `undefined` 속성에 대한 검증을 건너뜁니다. |
| `skipNullProperties` | `null` 속성의 검증을 건너뜁니다. |
| `skipUndefinedProperties` | `undefined` 속성의 검증을 건너뜁니다. |
| `stopAtFirstError` | 속성별 첫 번째 검증 오류 이후 나머지 검사를 중단합니다. |
| `errorHttpStatusCode` | 검증 실패 시 사용할 HTTP 상태 코드를 지정합니다. |
| `exceptionFactory` | 사용자 정의 검증 예외를 생성합니다. |
| `transformOptions` | class-transformer의 변환 옵션을 전달합니다. |
| `groups` | 특정 Validation Group을 지정합니다. |
| `errorFormat` | 기본 오류 메시지 출력 형식을 지정합니다. |
| `maxErrorMessagesLength` | 기본 오류 응답 메시지의 총 길이를 제한합니다. |

일부 옵션은 `class-validator`에서 제공하는 `ValidatorOptions`를 상속합니다.

옵션 지원 범위는 설치된 NestJS 버전에 따라 달라질 수 있습니다.

### 8.1. whitelist

```typescript
new ValidationPipe({
  whitelist: true,
});
```

DTO에 검증 Decorator가 없는 속성을 제거합니다.

예를 들어 다음 DTO가 있다고 가정합니다.

```typescript
export class CreateUserDto {
  @IsEmail()
  email!: string;
}
```

요청:

```json
{
  "email": "user@example.com",
  "isAdmin": true
}
```

`whitelist: true`를 적용하면 `isAdmin` 속성이 제거됩니다.

검증 Decorator가 없는 속성은 DTO 클래스에 선언되어 있더라도 제거 대상이 될 수 있습니다.

검증 조건 없이 속성을 유지해야 하는 경우 `@Allow()`를 사용할 수 있습니다.

### 8.2. forbidNonWhitelisted

```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
});
```

허용되지 않은 속성이 존재하면 자동 제거하는 대신 오류를 발생시킵니다.

예를 들어 `isAdmin`이 DTO에 정의되지 않았다면 요청이 거부됩니다.

이 옵션은 클라이언트가 의도하지 않은 속성을 전달하는 문제를 조기에 확인하는 데 유용합니다.

### 8.3. transform

```typescript
new ValidationPipe({
  transform: true,
});
```

입력값을 DTO 클래스 인스턴스로 변환하거나 Parameter의 기본 타입에 따라 변환할 수 있습니다.

예를 들어 다음 Controller를 사용할 수 있습니다.

```typescript
@Get(':id')
findOne(@Param('id') id: number) {
  return {
    id,
    type: typeof id,
  };
}
```

`transform: true`가 활성화되어 있으면 `id`가 숫자 타입으로 변환될 수 있습니다.

다만 일반 DTO 속성에 대한 문자열·숫자 변환은 별도의 타입 정보 및 변환 설정을 고려해야 합니다.

### 8.4. disableErrorMessages

```typescript
new ValidationPipe({
  disableErrorMessages: true,
});
```

검증 실패 시 상세 오류 메시지를 응답에 노출하지 않도록 설정합니다.

운영 환경에서 내부 검증 규칙을 상세하게 공개하지 않으려는 경우 사용할 수 있습니다.

단, 오류 메시지를 숨기는 것만으로 애플리케이션의 보안이 보장되지는 않습니다.

## 9. 데이터 타입 변환

HTTP 요청의 Path Parameter와 Query Parameter는 일반적으로 문자열로 전달됩니다.

따라서 숫자 또는 Boolean 형태의 데이터를 처리하려면 명시적인 변환이 필요할 수 있습니다.

### 9.1. @Type() 사용

`class-transformer`의 `@Type()` Decorator를 사용하면 DTO 속성의 변환 타입을 지정할 수 있습니다.

```typescript
import { Type } from 'class-transformer';

import {
  IsInt,
  Max,
  Min,
} from 'class-validator';

export class PaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit!: number;
}
```

Controller:

```typescript
@Get()
findAll(@Query() query: PaginationDto) {
  return query;
}
```

요청:

```http
GET /users?page=2&limit=20
```

`transform: true`가 적용되어 있으면 Controller는 숫자로 변환된 `page`와 `limit`를 전달받을 수 있습니다.

다만 `@Type(() => Number)`는 변환과정에서 JavaScript의 숫자 변환 규칙을 사용하므로 `@IsInt()`, `@Min()` 등의 검증을 함께 적용하는 것이 좋습니다.

### 9.2. Boolean 변환 주의사항

`@Type(() => Boolean)`은 문자열 `"false"`를 Boolean `false`로 안전하게 해석하는 용도로 적합하지 않습니다.

JavaScript에서는 다음과 같이 처리되기 때문입니다.

```typescript
Boolean('false'); // true
Boolean('true');  // true
```

Query Parameter에서 Boolean 값을 처리할 때는 `ParseBoolPipe`를 사용할 수 있습니다.

```typescript
@Get()
findAll(
  @Query('enabled', ParseBoolPipe)
  enabled: boolean,
) {
  return { enabled };
}
```

`ParseBoolPipe`는 `"true"` 및 `"false"` 등의 허용된 입력값을 Boolean으로 변환하며, 잘못된 값은 예외로 처리합니다.

### 9.3. ParseIntPipe

숫자 형태의 Path Parameter를 처리할 때는 `ParseIntPipe`를 사용할 수 있습니다.

```typescript
@Get(':id')
findOne(
  @Param('id', ParseIntPipe)
  id: number,
) {
  return { id };
}
```

예를 들어 다음 요청은 숫자 `100`으로 변환됩니다.

```http
GET /users/100
```

반면 다음 요청은 오류가 발생합니다.

```http
GET /users/abc
```

`ParseIntPipe`와 `ValidationPipe`는 역할이 다릅니다.

`ParseIntPipe`는 개별 Parameter의 정수 파싱을 담당하고, `ValidationPipe`는 주로 DTO의 선언된 조건을 기반으로 입력값을 검증합니다.

## 10. 중첩 객체 Validation

요청 데이터에 객체가 중첩되어 있는 경우 하위 객체도 검증해야 합니다.

### 10.1. 중첩 DTO 정의

`address.dto.ts`

```typescript
import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  street!: string;
}
```

`create-user.dto.ts`

```typescript
import { Type } from 'class-transformer';

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

import { AddressDto } from './address.dto';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}
```

### 10.2. 요청 예제

```json
{
  "email": "user@example.com",
  "name": "Kim",
  "address": {
    "city": "Seoul",
    "street": "Gangnam-daero"
  }
}
```

`@ValidateNested()`는 중첩된 객체의 검증을 수행합니다.

`@Type(() => AddressDto)`는 일반 JavaScript 객체를 `AddressDto` 인스턴스로 변환하기 위한 타입 정보를 제공합니다.

두 Decorator는 서로 다른 역할을 담당합니다.

중첩 DTO를 검증하려면 클래스 인스턴스 변환과 하위 속성 검증을 함께 고려해야 합니다.

## 11. 배열 Validation

요청 데이터에 배열이 포함된 경우 배열 자체와 각 요소를 검증할 수 있습니다.

### 11.1. 기본 배열 검증

```typescript
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
} from 'class-validator';

export class CreatePostDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  tags!: string[];
}
```

| Decorator | 역할 |
|---|---|
| `@IsArray()` | 배열인지 검사합니다. |
| `@ArrayMinSize(1)` | 최소 요소 개수를 검사합니다. |
| `@ArrayMaxSize(5)` | 최대 요소 개수를 검사합니다. |
| `@IsString({ each: true })` | 각 요소가 문자열인지 검사합니다. |

### 11.2. 객체 배열 검증

배열의 각 요소가 객체라면 `@ValidateNested()`와 `@Type()`을 함께 사용할 수 있습니다.

```typescript
import { Type } from 'class-transformer';

import {
  IsArray,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsInt()
  productId!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
```

이렇게 구성하면 `items` 배열의 각 객체에 정의된 검증 규칙을 적용할 수 있습니다.

### 11.3. 최상위 배열 요청

HTTP Body 자체가 배열인 경우 일반적인 DTO 클래스를 배열 요소 타입으로 지정하는 것만으로는 런타임 요소 타입 정보를 충분히 제공하기 어렵습니다.

이 경우 `ParseArrayPipe`를 사용할 수 있습니다.

```typescript
@Post('bulk')
createMany(
  @Body(
    new ParseArrayPipe({
      items: CreateUserDto,
    }),
  )
  users: CreateUserDto[],
) {
  return users;
}
```

`ParseArrayPipe`를 이용하면 배열의 요소 타입을 명시하고 각 요소에 대한 검증을 적용할 수 있습니다.

## 12. 선택적 필드와 PartialType

생성 요청과 수정 요청은 일반적으로 필수 속성의 조건이 다릅니다.

예를 들어 생성 API에서는 이메일과 이름이 필수이지만, 수정 API에서는 변경할 속성만 전달하도록 구성할 수 있습니다.

### 12.1. @IsOptional()

```typescript
import {
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
```

`@IsOptional()`을 사용하면 해당 값이 `null` 또는 `undefined`인 경우 다른 검증을 생략합니다.

### 12.2. PartialType

NestJS는 기존 DTO의 속성을 선택적으로 만드는 `PartialType()`을 제공합니다.

일반적인 NestJS 애플리케이션에서는 `@nestjs/mapped-types`를 사용할 수 있습니다.

```bash
npm install @nestjs/mapped-types
```

```typescript
import { PartialType } from '@nestjs/mapped-types';

import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  CreateUserDto,
) {}
```

`PartialType()`은 기존 DTO의 검증 메타데이터를 활용하여 모든 속성을 선택적 필드로 구성합니다.

다만 GraphQL 또는 Swagger를 사용하는 프로젝트에서는 각 통합 패키지에서 제공하는 `PartialType()`을 사용하는 것이 적절할 수 있습니다.

예를 들어 Swagger를 사용하는 경우 다음과 같습니다.

```typescript
import { PartialType } from '@nestjs/swagger';
```

GraphQL을 사용하는 경우 다음과 같습니다.

```typescript
import { PartialType } from '@nestjs/graphql';
```

이는 해당 통합 기능의 메타데이터를 적절히 유지하기 위한 구분입니다.

## 13. 조건부 Validation

특정 조건에서만 입력값을 검증해야 하는 경우 `@ValidateIf()`를 사용할 수 있습니다.

예를 들어 사용자의 계정 유형이 `business`인 경우에만 사업자등록번호를 필수로 처리할 수 있습니다.

```typescript
import {
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateAccountDto {
  @IsIn(['personal', 'business'])
  accountType!: 'personal' | 'business';

  @ValidateIf(
    (dto: CreateAccountDto) =>
      dto.accountType === 'business',
  )
  @IsString()
  @IsNotEmpty()
  businessNumber?: string;
}
```

`accountType`이 `business`인 경우 `businessNumber`에 대한 검증이 수행됩니다.

반면 `personal`인 경우 해당 필드에 적용된 Validator들이 건너뛰어집니다.

`@ValidateIf()`의 조건이 `false`이면 같은 속성에 정의된 다른 Validation Decorator도 건너뛴다는 점에 주의해야 합니다.

## 14. 사용자 정의 오류 메시지

Validation Decorator에는 사용자 정의 오류 메시지를 지정할 수 있습니다.

```typescript
import {
  IsEmail,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail(
    {},
    {
      message: '올바른 이메일을 입력해주세요.',
    },
  )
  email!: string;

  @IsString()
  @MinLength(8, {
    message: '비밀번호는 최소 8자 이상이어야 합니다.',
  })
  password!: string;
}
```

검증 실패 시 지정한 메시지가 사용됩니다.

메시지에서는 `$property`, `$value`, `$constraint1`과 같은 치환 토큰도 사용할 수 있습니다.

```typescript
@MinLength(8, {
  message:
    '$property는 최소 $constraint1자 이상이어야 합니다.',
})
password!: string;
```

사용자 정의 메시지는 클라이언트가 오류의 원인을 쉽게 파악할 수 있도록 하는 데 유용합니다.

다만 오류 메시지에 비밀번호, 인증 토큰 등 민감한 입력값이 포함되지 않도록 주의해야 합니다.

## 15. Validation 실패 처리

### 15.1. 기본 오류 응답

`ValidationPipe`는 기본적으로 검증 실패 시 `BadRequestException`을 발생시킵니다.

HTTP 상태 코드는 `400 Bad Request`입니다.

예를 들어 이메일 형식이 잘못된 요청을 전달하면 다음과 유사한 응답을 받을 수 있습니다.

```json
{
  "message": [
    "email must be an email"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

실제 메시지와 응답 구조는 NestJS 버전, Decorator 설정 및 전역 Exception Filter에 따라 달라질 수 있습니다.

### 15.2. exceptionFactory

`exceptionFactory`를 사용하면 검증 오류에 대한 응답 형식을 사용자 정의할 수 있습니다.

```typescript
import {
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,

    exceptionFactory: (errors) => {
      const details = errors.map((error) => ({
        field: error.property,
        messages: Object.values(
          error.constraints ?? {},
        ),
      }));

      return new BadRequestException({
        code: 'VALIDATION_ERROR',
        details,
      });
    },
  }),
);
```

예제 응답:

```json
{
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "messages": [
        "email must be an email"
      ]
    }
  ]
}
```

이 예제는 최상위 속성에 대한 오류를 처리하는 단순한 구현입니다.

중첩 객체의 오류까지 처리하려면 `ValidationError.children`을 재귀적으로 탐색해야 합니다.

### 15.3. errorFormat

지원되는 NestJS 버전에서는 `errorFormat` 옵션을 이용하여 기본 오류 메시지 형식을 변경할 수 있습니다.

```typescript
new ValidationPipe({
  errorFormat: 'grouped',
});
```

`grouped` 형식은 속성 경로를 기준으로 오류 메시지를 그룹화합니다.

반면 기본값인 `list`는 문자열 배열 형식을 사용합니다.

지원 여부와 세부적인 출력 형식은 사용 중인 NestJS 버전의 공식 문서를 확인해야 합니다.

## 16. 사용자 정의 Validator

기본 제공 Decorator만으로 검증하기 어려운 조건은 사용자 정의 Validator를 구현할 수 있습니다.

### 16.1. ValidatorConstraint 정의

다음은 특정 문자열 접두사를 검사하는 예제입니다.

```typescript
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({
  name: 'startsWithUser',
  async: false,
})
export class StartsWithUserConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      value.startsWith('user_')
    );
  }

  defaultMessage(): string {
    return '값은 user_로 시작해야 합니다.';
  }
}
```

`ValidatorConstraintInterface`는 사용자 정의 검증 로직을 구현하기 위한 인터페이스입니다.

`validate()`는 검증 결과를 Boolean으로 반환합니다.

### 16.2. DTO에 적용

```typescript
import {
  IsString,
  Validate,
} from 'class-validator';

import { StartsWithUserConstraint } from './starts-with-user.constraint';

export class CreateUserDto {
  @IsString()
  @Validate(StartsWithUserConstraint)
  username!: string;
}
```

`@Validate()`를 이용하여 사용자 정의 Validator를 DTO 속성에 적용할 수 있습니다.

### 16.3. 비동기 Validator

데이터베이스 조회 등 비동기 작업이 필요한 경우 `async: true`로 구성할 수 있습니다.

```typescript
@ValidatorConstraint({
  name: 'customAsyncValidator',
  async: true,
})
export class CustomAsyncValidator
  implements ValidatorConstraintInterface
{
  async validate(value: unknown): Promise<boolean> {
    // 비동기 검증 로직
    return typeof value === 'string';
  }
}
```

NestJS의 Provider를 Validator에 주입하려면 `class-validator`의 DI Container 연동 설정이 추가로 필요합니다.

```typescript
import { useContainer } from 'class-validator';

const app = await NestFactory.create(AppModule);

useContainer(app.select(AppModule), {
  fallbackOnErrors: true,
});
```

또한 주입받을 Validator와 관련 Service를 NestJS 모듈의 Provider로 적절히 등록해야 합니다.

비동기 검증을 구현할 때는 성능과 데이터 정합성도 함께 고려해야 합니다.

특히 이메일 중복 여부와 같은 데이터베이스 제약 조건은 요청 검증만으로 보장할 수 없으므로 데이터베이스의 Unique Constraint 등과 함께 처리해야 합니다.

## 17. Validation Groups

Validation Group은 동일한 DTO에 정의된 검증 규칙을 상황에 따라 구분하여 실행하는 기능입니다.

예를 들어 관리자와 일반 사용자에게 서로 다른 조건을 적용할 수 있습니다.

```typescript
import {
  IsString,
  MinLength,
} from 'class-validator';

export class UserDto {
  @IsString()
  username!: string;

  @MinLength(8, {
    groups: ['user'],
  })
  @MinLength(12, {
    groups: ['admin'],
  })
  password!: string;
}
```

특정 그룹의 검증만 수행하려면 다음과 같이 설정할 수 있습니다.

```typescript
new ValidationPipe({
  groups: ['admin'],
});
```

이 경우 `admin` 그룹에 해당하는 검증 규칙이 적용됩니다.

그룹이 지정되지 않은 Decorator의 실행 여부는 `always`, `strictGroups` 등 관련 검증 옵션에 영향을 받을 수 있습니다.

Validation Group은 유용하지만 규칙이 복잡해지면 DTO의 책임이 불명확해질 수 있습니다.

검증 구조가 크게 달라지는 경우에는 DTO를 분리하는 방법도 고려하는 것이 좋습니다.

## 18. Standard Schema 기반 Validation

NestJS는 기존 Decorator 기반 검증 외에도 Standard Schema 기반의 검증 방식을 지원합니다.

Standard Schema는 서로 다른 스키마 검증 라이브러리가 공통 인터페이스를 제공하도록 하는 규격입니다.

이 방식을 사용하면 DTO 클래스의 Decorator 대신 스키마 객체로 입력 구조와 검증 조건을 정의할 수 있습니다.

### 18.1. Zod 설치

```bash
npm install zod
```

### 18.2. Zod 스키마 정의

```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.email(),

  name: z.string().min(1),

  age: z.number().int().min(1).max(120),
});

export type CreateUserInput =
  z.infer<typeof createUserSchema>;
```

스키마는 입력 데이터의 구조와 검증 규칙을 정의합니다.

TypeScript 타입은 `z.infer`를 이용하여 스키마에서 추론할 수 있습니다.

### 18.3. StandardSchemaValidationPipe 적용

Standard Schema를 지원하는 NestJS 버전에서는 다음과 같이 사용할 수 있습니다.

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
    @Body(
      new StandardSchemaValidationPipe(
        createUserSchema,
      ),
    )
    body: CreateUserInput,
  ) {
    return body;
  }
}
```

`StandardSchemaValidationPipe`는 전달된 스키마를 사용하여 입력값을 검증합니다.

기본적으로 스키마가 변환한 결과를 Controller Handler에 전달할 수 있습니다.

사용 중인 NestJS 버전에 따라 지원 여부와 API 형태가 다를 수 있으므로 해당 버전의 공식 문서를 확인해야 합니다.

### 18.4. ValidationPipe와 StandardSchemaValidationPipe 비교

| 구분 | ValidationPipe | StandardSchemaValidationPipe |
|---|---|---|
| 주요 검증 방식 | Decorator 기반 | Schema 기반 |
| 대표 라이브러리 | class-validator | Zod 등 |
| 데이터 구조 정의 | DTO 클래스 | Schema 객체 |
| TypeScript 타입 | 클래스 선언 기반 | 스키마 타입 추론 가능 |
| 중첩 검증 | ValidateNested, Type | 중첩 스키마 |
| 데이터 변환 | class-transformer | 스키마의 변환 기능 |
| 확장 방식 | Custom Validator | Schema Refinement 등 |

두 방식은 서로 다른 검증 모델입니다.

프로젝트의 요구사항과 기존 코드 구조에 따라 적절한 방식을 선택하는 것이 좋습니다.

## 19. Validation과 비즈니스 검증의 차이

Validation은 일반적으로 데이터의 구조와 형식을 검사하지만, 모든 비즈니스 규칙을 대체하지는 않습니다.

| 구분 | 입력 데이터 검증 | 비즈니스 규칙 검증 |
|---|---|---|
| 주요 목적 | 데이터 형식과 제약 조건 확인 | 도메인 규칙 및 상태 확인 |
| 대표 예시 | 이메일 형식 검사 | 이메일 중복 여부 확인 |
| 대표 예시 | 주문 수량이 양수인지 검사 | 실제 재고가 충분한지 확인 |
| 대표 예시 | 날짜 형식 검사 | 예약 가능한 날짜인지 확인 |
| 주요 처리 위치 | DTO, ValidationPipe | Service, Domain 계층 |
| 데이터베이스 접근 | 일반적으로 불필요 | 필요한 경우 존재 |

예를 들어 주문 수량이 1 이상인지 확인하는 것은 입력값 검증에 해당합니다.

반면 현재 재고 수량보다 많은 주문을 처리할 수 있는지는 비즈니스 규칙에 해당합니다.

이러한 규칙은 동시성 제어, 트랜잭션 및 데이터베이스 제약 조건까지 고려해야 할 수 있습니다.

따라서 입력값 검증과 비즈니스 규칙 검증은 책임을 구분하여 설계하는 것이 좋습니다.

## 20. Validation 적용 시 주의사항

### 20.1. DTO는 런타임에 존재하는 클래스로 정의합니다.

```typescript
export interface CreateUserDto {
  email: string;
}
```

TypeScript Interface는 컴파일 후 JavaScript에서 제거됩니다.

따라서 `ValidationPipe`가 필요로 하는 런타임 클래스 메타데이터를 제공할 수 없습니다.

Decorator 기반 Validation에서는 다음과 같이 클래스를 사용해야 합니다.

```typescript
export class CreateUserDto {
  @IsEmail()
  email!: string;
}
```

### 20.2. TypeScript 타입만으로 런타임 검증이 수행되지는 않습니다.

```typescript
age!: number;
```

위 선언은 TypeScript의 정적 타입 검사에 사용됩니다.

클라이언트가 전송한 데이터가 실제로 숫자인지 확인하려면 `@IsInt()` 등의 런타임 Validator가 필요합니다.

### 20.3. 중첩 객체의 런타임 타입을 명시합니다.

```typescript
@ValidateNested()
@Type(() => AddressDto)
address!: AddressDto;
```

중첩 객체를 검증하려면 해당 객체가 적절한 클래스 인스턴스로 변환될 수 있도록 구성해야 합니다.

### 20.4. 암시적 타입 변환을 신중하게 사용합니다.

`enableImplicitConversion`을 활성화하면 예상하지 못한 타입 변환이 발생할 수 있습니다.

특히 Boolean, 숫자 및 빈 문자열의 변환은 JavaScript의 타입 변환 규칙에 영향을 받습니다.

가능하면 `@Type()`, `ParseIntPipe`, `ParseBoolPipe` 등을 사용하여 필요한 변환을 명확하게 지정하는 것이 좋습니다.

### 20.5. DTO 검증을 보안의 유일한 수단으로 사용하지 않습니다.

DTO Validation은 잘못된 입력을 거부하는 데 유용하지만 인증, 인가, 데이터베이스 제약 조건 및 비즈니스 규칙 검증을 대체하지 않습니다.

예를 들어 사용자가 요청 Body에 다른 사용자의 ID를 전달하는 경우, ID 형식이 올바르더라도 해당 리소스에 접근할 권한이 있는지는 별도로 확인해야 합니다.

### 20.6. 대량 데이터 검증의 비용을 고려합니다.

대규모 배열 또는 깊게 중첩된 객체를 검증하면 변환 및 검증 비용이 증가할 수 있습니다.

대량 요청에서는 다음 사항을 고려하는 것이 좋습니다.

- 요청 Body 크기 제한
- 배열 요소 개수 제한
- 중첩 구조의 깊이 제한
- 사용자 정의 Validator의 실행 비용
- 불필요한 외부 API 및 데이터베이스 조회 방지

## 21. 실무 권장 Configuration

일반적인 REST API에서는 다음과 같은 전역 Validation 설정을 사용할 수 있습니다.

`main.ts`

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
      forbidUnknownValues: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  await app.listen(3000);
}

void bootstrap();
```

설정의 목적은 다음과 같습니다.

| 옵션 | 목적 |
|---|---|
| `transform: true` | DTO 변환 및 Parameter 타입 변환 |
| `whitelist: true` | 허용된 속성만 처리 |
| `forbidNonWhitelisted: true` | 정의되지 않은 속성 거부 |
| `forbidUnknownValues: true` | 알 수 없는 검증 대상 거부 |
| `validationError.target: false` | 오류 객체에 검증 대상 전체가 포함되는 것을 방지 |
| `validationError.value: false` | 오류 객체에 검증 대상 속성값이 포함되는 것을 방지 |

위 설정은 실무에서 사용할 수 있는 출발점이며 모든 프로젝트에 일괄적으로 적용해야 하는 것은 아닙니다.

예를 들어 외부 시스템과 통합하는 API에서는 추가 필드 허용 정책이 필요할 수 있으며, 데이터 변환 정책 역시 API 계약에 따라 달라질 수 있습니다.

## 22. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| DTO | 입력 데이터의 구조 및 검증 조건 정의 |
| `ValidationPipe` | Decorator 기반 입력값 검증과 변환 |
| `class-validator` | 검증 Decorator 및 Validator 제공 |
| `class-transformer` | 일반 객체와 클래스 인스턴스 간 변환 |
| `@IsEmail()` | 이메일 형식 검증 |
| `@IsOptional()` | 선택적 속성 검증 |
| `@ValidateNested()` | 중첩 객체 검증 |
| `@Type()` | 클래스 인스턴스 생성 및 타입 변환 정보 제공 |
| `@ValidateIf()` | 조건부 검증 |
| `PartialType()` | 기존 DTO의 속성을 선택적으로 구성 |
| `ParseIntPipe` | 정수 변환 및 검사 |
| `ParseBoolPipe` | Boolean 변환 및 검사 |
| `ParseArrayPipe` | 배열 입력값 처리 및 요소 검증 |
| `exceptionFactory` | 사용자 정의 검증 예외 생성 |
| `StandardSchemaValidationPipe` | Standard Schema 기반 검증 |

## 23. 정리

NestJS의 Validation 기능은 외부에서 전달되는 입력값을 검증하여 애플리케이션의 데이터 무결성과 안정성을 높이는 데 사용합니다.

Decorator 기반 Validation에서는 `class-validator`와 `class-transformer`를 활용하여 DTO에 검증 및 변환 규칙을 정의하고, `ValidationPipe`를 통해 이를 실행합니다.

`whitelist`, `forbidNonWhitelisted`, `transform` 등의 옵션을 사용하면 허용되지 않은 속성 처리와 데이터 변환 정책을 일관되게 적용할 수 있습니다.

또한 중첩 객체, 배열, 조건부 필드 및 사용자 정의 Validator를 통해 다양한 요청 데이터 구조를 처리할 수 있습니다.

Standard Schema 기반 Validation은 Zod와 같은 스키마 검증 라이브러리를 사용하는 대안적인 접근 방식입니다.

실제 프로젝트에서는 입력값 검증과 비즈니스 규칙 검증의 책임을 구분하고, 필요한 경우 인증·인가 및 데이터베이스 제약 조건과 결합하여 설계하는 것이 중요합니다.

## 참고 자료

- [NestJS 공식 문서 - Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS 공식 문서 - Pipes](https://docs.nestjs.com/pipes)
- [NestJS 공식 문서 - Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS 공식 문서 - Controllers](https://docs.nestjs.com/controllers)
- [NestJS 공식 문서 - OpenAPI Mapped Types](https://docs.nestjs.com/openapi/mapped-types)
- [NestJS 공식 문서 - GraphQL Mapped Types](https://docs.nestjs.com/graphql/mapped-types)
- [class-validator GitHub Repository](https://github.com/typestack/class-validator)
- [class-transformer GitHub Repository](https://github.com/typestack/class-transformer)
- [NestJS Mapped Types GitHub Repository](https://github.com/nestjs/mapped-types)
- [Zod 공식 문서](https://zod.dev/)
- [Standard Schema 공식 문서](https://standardschema.dev/)