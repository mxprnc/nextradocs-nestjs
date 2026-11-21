# GraphQL

## 1. 개요

GraphQL은 API를 위한 Query Language이자, 정의된 Schema에 따라 데이터를 조회하고 변경하기 위한 실행 환경(Runtime)입니다.

GraphQL은 클라이언트가 필요한 데이터의 구조를 직접 지정할 수 있도록 설계되었으며, 서버는 Schema를 통해 제공할 수 있는 데이터와 작업을 명확하게 정의합니다.

NestJS는 `@nestjs/graphql` 패키지를 통해 GraphQL 애플리케이션 개발을 지원합니다.

GraphQL의 주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| Schema | API에서 제공하는 데이터 타입과 연산을 정의합니다. |
| Type | GraphQL에서 사용하는 데이터 구조를 정의합니다. |
| Query | 데이터를 조회하는 연산입니다. |
| Mutation | 데이터 변경 작업을 수행하는 연산입니다. |
| Subscription | 서버에서 발생하는 이벤트를 구독합니다. |
| Resolver | GraphQL 필드의 데이터를 조회하거나 계산합니다. |
| Input Type | Mutation 및 Query에 전달할 복합 입력 데이터를 정의합니다. |
| Scalar | String, Int, Float, Boolean, ID 등의 기본 데이터 타입을 표현합니다. |
| Directive | Schema 또는 실행 동작에 추가적인 의미를 부여합니다. |

NestJS는 GraphQL 서버를 구현하기 위한 두 가지 개발 방식을 지원합니다.

- **Code First:** TypeScript 클래스와 데코레이터를 기반으로 GraphQL Schema를 생성합니다.
- **Schema First:** GraphQL SDL(Schema Definition Language)로 Schema를 먼저 작성하고 이에 대응하는 Resolver를 구현합니다.

또한 GraphQL 실행 엔진과 HTTP 통합을 제공하기 위해 Apollo Server 또는 Mercurius와 같은 GraphQL Driver를 사용할 수 있습니다.

이 문서에서는 GraphQL의 핵심 개념, NestJS의 GraphQL 통합 방식, Resolver 구현 및 운영 환경에서 고려해야 할 사항을 설명합니다.

---

## 2. GraphQL의 등장 배경

일반적인 REST API는 Resource를 중심으로 Endpoint를 정의합니다.

예를 들어 사용자와 사용자의 게시글을 조회하는 REST API는 다음과 같이 설계할 수 있습니다.

```http
GET /users/1
GET /users/1/posts
```

클라이언트가 사용자 이름과 게시글 제목만 필요하더라도 API 응답에 불필요한 필드가 포함되거나, 필요한 데이터를 얻기 위해 여러 Endpoint를 호출해야 할 수 있습니다.

이러한 문제는 일반적으로 다음과 같이 구분합니다.

### 2.1. Over-fetching

Over-fetching은 클라이언트가 실제로 사용하지 않는 데이터까지 서버에서 전달받는 현상입니다.

예를 들어 다음 REST API 응답을 살펴보겠습니다.

```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "phone": "010-0000-0000",
  "address": "Seoul",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

클라이언트에서 `id`와 `name`만 필요하더라도 나머지 속성이 함께 전달됩니다.

GraphQL에서는 필요한 필드만 선택할 수 있습니다.

```graphql
query {
  user(id: 1) {
    id
    name
  }
}
```

응답:

```json
{
  "data": {
    "user": {
      "id": 1,
      "name": "Alice"
    }
  }
}
```

GraphQL은 클라이언트가 선택한 필드만 응답에 포함하도록 지원합니다.

다만 응답 필드를 줄이는 것과 데이터베이스에서 조회하는 데이터를 최적화하는 것은 별개의 문제입니다.

Resolver 또는 데이터 접근 계층이 필요한 데이터만 조회하도록 구현하지 않았다면, 서버 내부에서는 여전히 불필요한 데이터를 조회할 수 있습니다.

### 2.2. Under-fetching

Under-fetching은 하나의 API 요청만으로 필요한 데이터를 모두 얻지 못하는 현상입니다.

예를 들어 사용자와 게시글을 표시하기 위해 다음과 같은 요청이 필요할 수 있습니다.

```http
GET /users/1
GET /users/1/posts
```

GraphQL에서는 관련 데이터를 하나의 Query로 요청할 수 있습니다.

```graphql
query {
  user(id: 1) {
    id
    name
    posts {
      id
      title
    }
  }
}
```

이러한 방식은 클라이언트가 여러 Resource의 데이터를 하나의 요청에 포함할 수 있도록 합니다.

다만 GraphQL 요청이 하나라는 사실이 서버 내부의 데이터베이스 쿼리 또한 하나라는 의미는 아닙니다.

실제 데이터 조회 횟수는 Resolver와 데이터 접근 계층의 구현 방식에 따라 달라집니다.

---

## 3. GraphQL 아키텍처

GraphQL은 Schema를 중심으로 클라이언트 요청을 검증하고 실행합니다.

일반적인 처리 흐름은 다음과 같습니다.

```text
GraphQL Client
      |
      | Query / Mutation
      v
GraphQL Endpoint
      |
      v
GraphQL Engine
      |
      +-- Parsing
      |
      +-- Validation
      |
      +-- Operation Execution
      |
      v
Resolver
      |
      v
Service
      |
      v
Repository / Data Source
      |
      v
Resolver Result
      |
      v
GraphQL Response
      |
      v
GraphQL Client
```

### 3.1. Parsing

GraphQL 서버는 클라이언트가 전달한 Query 문서를 파싱하여 AST(Abstract Syntax Tree)를 생성합니다.

AST는 Query에 포함된 필드, 인수 및 연산 구조를 표현합니다.

### 3.2. Validation

GraphQL 엔진은 요청이 Schema에 정의된 타입과 필드를 준수하는지 검증합니다.

예를 들어 Schema에 존재하지 않는 필드를 요청하면 검증 오류가 발생합니다.

### 3.3. Execution

검증이 완료된 요청은 Resolver를 통해 실행됩니다.

GraphQL은 요청한 필드에 대응하는 Resolver를 실행하고, Schema에 정의된 응답 구조에 따라 결과를 조합합니다.

### 3.4. Response

일반적인 GraphQL 응답은 `data`, `errors`, `extensions` 등의 속성을 포함할 수 있습니다.

```json
{
  "data": {
    "user": {
      "id": 1,
      "name": "Alice"
    }
  }
}
```

GraphQL에서는 일부 필드 처리에 실패하더라도 다른 필드의 데이터를 반환하는 Partial Response가 가능합니다.

---

## 4. GraphQL Schema

Schema는 GraphQL API가 제공하는 데이터 타입과 연산을 정의합니다.

GraphQL Schema는 SDL(Schema Definition Language)을 사용하여 표현할 수 있습니다.

```graphql
type User {
  id: Int!
  name: String!
  email: String!
}

type Query {
  users: [User!]!
  user(id: Int!): User
}
```

위 Schema는 다음 사항을 정의합니다.

- `User`: 사용자 객체 타입
- `users`: 사용자 목록을 반환하는 Query
- `user`: 식별자를 이용해 단일 사용자를 조회하는 Query

### 4.1. Scalar Type

GraphQL은 다음과 같은 기본 Scalar Type을 제공합니다.

| Scalar | 설명 |
|---|---|
| `Int` | 32비트 부호 있는 정수 |
| `Float` | 배정밀도 부동소수점 숫자 |
| `String` | 문자열 |
| `Boolean` | 참 또는 거짓 |
| `ID` | 객체 식별자 |

`ID`는 일반적으로 식별자를 표현하는 데 사용하며, JSON 응답에서는 문자열로 직렬화됩니다.

GraphQL에서는 별도의 Custom Scalar를 정의하여 날짜, JSON 등의 타입을 표현할 수도 있습니다.

### 4.2. Non-Null Type

GraphQL에서는 `!`를 사용하여 Null을 허용하지 않는 타입을 정의합니다.

```graphql
name: String!
```

`String!`은 해당 필드의 결과가 Null이 될 수 없음을 의미합니다.

다음 타입들은 서로 다른 의미를 가집니다.

| GraphQL Type | 설명 |
|---|---|
| `String` | 문자열 또는 Null |
| `String!` | Null이 아닌 문자열 |
| `[String]` | Null이 가능한 리스트이며 요소도 Null을 허용합니다. |
| `[String!]` | Null이 가능한 리스트이며 요소는 Null을 허용하지 않습니다. |
| `[String]!` | 리스트는 Null이 될 수 없지만 요소는 Null을 허용합니다. |
| `[String!]!` | 리스트와 요소 모두 Null을 허용하지 않습니다. |

### 4.3. Object Type

Object Type은 여러 필드로 구성된 데이터 구조를 정의합니다.

```graphql
type Post {
  id: Int!
  title: String!
  content: String
}
```

### 4.4. Input Type

Input Type은 Mutation 또는 Query의 입력값으로 전달하는 객체 구조를 정의합니다.

```graphql
input CreateUserInput {
  name: String!
  email: String!
}
```

GraphQL에서는 출력에 사용하는 Object Type과 입력에 사용하는 Input Type을 구분합니다.

### 4.5. Enum Type

Enum은 허용 가능한 값의 집합을 정의합니다.

```graphql
enum UserRole {
  ADMIN
  USER
  GUEST
}
```

### 4.6. Interface와 Union

GraphQL은 여러 Object Type의 공통 구조를 정의하는 Interface와 서로 다른 Object Type을 하나의 결과 타입으로 묶는 Union을 지원합니다.

```graphql
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
}

type Post implements Node {
  id: ID!
  title: String!
}
```

Union은 다음과 같이 정의할 수 있습니다.

```graphql
union SearchResult = User | Post
```

이러한 타입은 여러 종류의 객체를 반환하는 API를 설계할 때 활용할 수 있습니다.

---

## 5. GraphQL의 주요 연산

GraphQL은 세 가지 주요 Operation Type을 제공합니다.

| Operation | 역할 |
|---|---|
| Query | 데이터 조회 |
| Mutation | 데이터 변경 |
| Subscription | 실시간 이벤트 구독 |

### 5.1. Query

Query는 서버의 데이터를 조회하기 위한 연산입니다.

```graphql
query {
  users {
    id
    name
  }
}
```

Query에 인수를 전달할 수도 있습니다.

```graphql
query {
  user(id: 1) {
    id
    name
    email
  }
}
```

### 5.2. Mutation

Mutation은 데이터 생성, 수정, 삭제 등의 작업을 수행합니다.

```graphql
mutation {
  createUser(
    input: {
      name: "Alice"
      email: "alice@example.com"
    }
  ) {
    id
    name
  }
}
```

Mutation의 최상위 필드는 명세상 직렬 실행됩니다. 단, 하나의 Mutation 내부에서 수행되는 모든 비동기 작업이나 데이터베이스 연산의 원자성이 자동으로 보장되는 것은 아닙니다.

필요한 경우 별도의 Transaction 처리가 필요합니다.

### 5.3. Subscription

Subscription은 클라이언트가 특정 이벤트를 구독하고, 서버에서 이벤트가 발생할 때 데이터를 전달받는 연산입니다.

```graphql
subscription {
  userCreated {
    id
    name
  }
}
```

Subscription은 일반적으로 WebSocket 기반의 지속 연결을 사용하지만, 구체적인 전송 방식은 GraphQL 서버와 클라이언트의 구현에 따라 달라질 수 있습니다.

---

## 6. Code First와 Schema First

NestJS에서는 두 가지 주요 방식으로 GraphQL Schema를 구성할 수 있습니다.

### 6.1. Code First

Code First는 TypeScript 클래스와 데코레이터를 사용하여 GraphQL Schema를 생성하는 방식입니다.

```typescript
import {
  Field,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  email!: string;
}
```

NestJS는 위 메타데이터를 바탕으로 다음과 같은 SDL을 생성합니다.

```graphql
type User {
  id: Int!
  name: String!
  email: String!
}
```

Code First 방식의 장점은 다음과 같습니다.

- TypeScript 기반으로 Schema와 Resolver를 관리할 수 있습니다.
- 데코레이터를 이용해 타입과 필드의 정의를 함께 관리할 수 있습니다.
- IDE의 타입 검사와 자동 완성 기능을 활용할 수 있습니다.
- TypeScript 중심의 NestJS 프로젝트에 적합합니다.

단, TypeScript 타입이 모든 GraphQL 타입 정보를 자동으로 제공하는 것은 아닙니다.

예를 들어 Null 허용 여부, 배열의 요소 타입, 숫자의 GraphQL Scalar Type 등은 별도의 데코레이터 메타데이터가 필요할 수 있습니다.

### 6.2. Schema First

Schema First는 SDL 파일을 먼저 작성하고, 해당 Schema를 구현하는 Resolver를 정의하는 방식입니다.

`src/users/users.graphql`

```graphql
type User {
  id: Int!
  name: String!
  email: String!
}

type Query {
  users: [User!]!
  user(id: Int!): User
}
```

NestJS는 정의된 Schema를 로드하여 Resolver와 연결합니다.

Schema First의 장점은 다음과 같습니다.

- GraphQL Schema를 독립적인 계약으로 관리할 수 있습니다.
- 다른 언어 또는 플랫폼을 사용하는 팀과 Schema를 공유하기 쉽습니다.
- Schema 변경에 대한 검토와 버전 관리가 명확합니다.
- GraphQL SDL 기반 도구와 연계하기 쉽습니다.

### 6.3. 방식 비교

| 항목 | Code First | Schema First |
|---|---|---|
| 정의의 출발점 | TypeScript Class | GraphQL SDL |
| Schema 작성 | 데코레이터 기반 자동 생성 | SDL 직접 작성 |
| 주요 장점 | TypeScript 개발 경험 | Schema 중심 계약 관리 |
| 주요 고려사항 | 데코레이터 메타데이터 관리 | SDL과 Resolver 간 일관성 관리 |
| 적합한 환경 | TypeScript 중심 프로젝트 | Schema를 독립적으로 관리하는 프로젝트 |

이후 구현 예제에서는 Code First 방식을 사용합니다.

---

## 7. NestJS GraphQL 환경 구성

### 7.1. 패키지 설치

NestJS는 GraphQL 실행을 위해 Apollo Server 또는 Mercurius Driver를 지원합니다.

다음은 Express 기반 NestJS 애플리케이션에서 Apollo Server를 사용하는 예제입니다.

```bash
npm install @nestjs/graphql @nestjs/apollo @apollo/server @as-integrations/express5 graphql
```

이 예제는 Express 5와 호환되는 NestJS 및 Apollo 통합 버전을 전제로 합니다. 사용하는 NestJS 메이저 버전에 따라 호환되는 패키지 버전을 확인해야 합니다.

Fastify에서 Apollo Server를 사용하는 경우에는 다음과 같이 설치할 수 있습니다.

```bash
npm install @nestjs/graphql @nestjs/apollo @apollo/server @as-integrations/fastify graphql
```

Fastify와 Mercurius를 사용하는 경우:

```bash
npm install @nestjs/graphql @nestjs/mercurius graphql mercurius
```

### 7.2. GraphQLModule 설정

`src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { GraphQLModule } from '@nestjs/graphql';

import {
  ApolloDriver,
  ApolloDriverConfig,
} from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      graphiql: true,
    }),
  ],
})
export class AppModule {}
```

주요 옵션은 다음과 같습니다.

| 옵션 | 설명 |
|---|---|
| `driver` | GraphQL 실행에 사용할 Driver를 정의합니다. |
| `autoSchemaFile` | Code First Schema의 생성 방식을 설정합니다. |
| `sortSchema` | 생성된 Schema를 정렬합니다. |
| `graphiql` | GraphiQL 개발 도구를 활성화합니다. |
| `path` | GraphQL Endpoint 경로를 지정합니다. |
| `context` | Resolver가 사용할 요청 Context를 구성합니다. |

`autoSchemaFile: true`는 Schema를 메모리에서 생성합니다.

파일로 저장하려면 다음과 같이 설정할 수 있습니다.

```typescript
import { join } from 'node:path';

GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: join(
    process.cwd(),
    'src/schema.gql',
  ),
});
```

최신 NestJS GraphQL 공식 문서에서는 기존 GraphQL Playground 대신 GraphiQL을 사용하는 설정을 안내합니다.

개발 도구의 제공 여부는 Driver와 사용하는 패키지 버전에 따라 달라질 수 있습니다.

### 7.3. Schema First 설정

Schema First를 사용하려면 `typePaths`를 지정합니다.

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  typePaths: ['./**/*.graphql'],
});
```

`typePaths`는 GraphQL SDL 파일을 탐색할 경로를 지정합니다.

실제 프로젝트에서는 빌드 결과물의 위치와 파일 복사 설정을 고려하여 경로를 구성해야 합니다.

---

## 8. Resolver

Resolver는 GraphQL Schema에 정의된 필드의 데이터를 조회하거나 계산하는 함수입니다.

NestJS에서는 `@Resolver()` 데코레이터로 Resolver 클래스를 정의합니다.

REST API의 Controller와 유사하게 요청을 처리하는 진입점 역할을 하지만, GraphQL Resolver는 HTTP 경로가 아닌 GraphQL Schema의 필드와 연결됩니다.

### 8.1. 주요 데코레이터

| 데코레이터 | 역할 |
|---|---|
| `@Resolver()` | Resolver 클래스를 정의합니다. |
| `@Query()` | Query 필드를 처리합니다. |
| `@Mutation()` | Mutation 필드를 처리합니다. |
| `@Subscription()` | Subscription 필드를 처리합니다. |
| `@ResolveField()` | Object Type의 특정 필드를 처리합니다. |
| `@Args()` | GraphQL 인수를 추출합니다. |
| `@Parent()` | 상위 Resolver의 반환 객체에 접근합니다. |
| `@Context()` | GraphQL 실행 Context에 접근합니다. |
| `@Info()` | GraphQLResolveInfo 객체에 접근합니다. |

### 8.2. 기본 Query Resolver

```typescript
import {
  Int,
  Args,
  Query,
  Resolver,
} from '@nestjs/graphql';

import { User } from './models/user.model';
import { UsersService } from './users.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Query(() => [User])
  users() {
    return this.usersService.findAll();
  }

  @Query(() => User, { nullable: true })
  user(
    @Args('id', { type: () => Int }) id: number,
  ) {
    return this.usersService.findOne(id);
  }
}
```

`@Query(() => [User])`는 사용자 목록을 반환하는 Query를 정의합니다.

`@Args()`는 GraphQL Query에 전달된 인수를 추출합니다.

---

## 9. GraphQL CRUD 구현

이번 절에서는 사용자 정보를 생성, 조회, 수정, 삭제하는 GraphQL API를 구현합니다.

예제는 Code First와 Apollo Driver를 사용하며, 데이터 저장은 In-memory 방식으로 처리합니다.

### 9.1. 프로젝트 구조

```text
src/
├── main.ts
├── app.module.ts
└── users/
    ├── users.module.ts
    ├── users.resolver.ts
    ├── users.service.ts
    ├── models/
    │   └── user.model.ts
    └── dto/
        ├── create-user.input.ts
        └── update-user.input.ts
```

### 9.2. User Object Type

`src/users/models/user.model.ts`

```typescript
import {
  Field,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  email!: string;
}
```

`@ObjectType()`은 GraphQL Object Type을 정의합니다.

`@Field()`는 GraphQL Schema에 포함할 필드를 지정합니다.

TypeScript의 `number`는 GraphQL의 `Int` 또는 `Float`에 대응할 수 있으므로 정수 식별자에는 명시적으로 `Int`를 지정합니다.

### 9.3. CreateUserInput

`src/users/dto/create-user.input.ts`

```typescript
import {
  Field,
  InputType,
} from '@nestjs/graphql';

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @Field()
  @IsEmail()
  email!: string;
}
```

GraphQL의 `@InputType()`은 입력 객체의 Schema를 정의합니다.

`class-validator`의 데코레이터는 런타임 데이터 검증에 사용됩니다.

GraphQL Schema의 타입 검증과 애플리케이션의 ValidationPipe 검증은 서로 다른 계층에서 동작합니다.

검증 기능을 사용하려면 다음 패키지를 설치해야 합니다.

```bash
npm install class-validator class-transformer
```

### 9.4. UpdateUserInput

`src/users/dto/update-user.input.ts`

```typescript
import {
  InputType,
  PartialType,
} from '@nestjs/graphql';

import { CreateUserInput } from './create-user.input';

@InputType()
export class UpdateUserInput extends PartialType(
  CreateUserInput,
) {}
```

`PartialType()`은 기존 Input Type의 필드를 선택적으로 사용할 수 있는 새로운 타입을 생성합니다.

GraphQL 애플리케이션에서는 `@nestjs/graphql`이 제공하는 `PartialType()`을 사용합니다.

이 방식은 생성 및 수정 DTO의 중복을 줄이는 데 유용합니다.

### 9.5. UsersService

`src/users/users.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './models/user.model';

@Injectable()
export class UsersService {
  private readonly users: User[] = [];
  private nextId = 1;

  create(input: CreateUserInput): User {
    const user: User = {
      id: this.nextId++,
      ...input,
    };

    this.users.push(user);
    return user;
  }

  findAll(): User[] {
    return this.users;
  }

  findOne(id: number): User | null {
    return (
      this.users.find((user) => user.id === id)
      ?? null
    );
  }

  update(
    id: number,
    input: UpdateUserInput,
  ): User | null {
    const user = this.findOne(id);

    if (!user) {
      return null;
    }

    Object.assign(user, input);

    return user;
  }

  remove(id: number): boolean {
    const index = this.users.findIndex(
      (user) => user.id === id,
    );

    if (index === -1) {
      return false;
    }

    this.users.splice(index, 1);
    return true;
  }
}
```

Service는 GraphQL에 직접 의존하지 않는 일반적인 비즈니스 로직을 담당하도록 구성할 수도 있습니다.

이번 예제에서는 설명을 간결하게 하기 위해 GraphQL Input 클래스를 Service에 직접 전달했습니다.

실무에서는 GraphQL Input과 내부 애플리케이션 DTO를 분리하여 Transport 계층과 비즈니스 계층 간 결합도를 줄일 수 있습니다.

### 9.6. UsersResolver

`src/users/users.resolver.ts`

```typescript
import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql';

import { UsersService } from './users.service';
import { User } from './models/user.model';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Query(() => [User])
  users(): User[] {
    return this.usersService.findAll();
  }

  @Query(() => User, { nullable: true })
  user(
    @Args('id', { type: () => Int })
    id: number,
  ): User | null {
    return this.usersService.findOne(id);
  }

  @Mutation(() => User)
  createUser(
    @Args('input') input: CreateUserInput,
  ): User {
    return this.usersService.create(input);
  }

  @Mutation(() => User, { nullable: true })
  updateUser(
    @Args('id', { type: () => Int })
    id: number,
    @Args('input') input: UpdateUserInput,
  ): User | null {
    return this.usersService.update(id, input);
  }

  @Mutation(() => Boolean)
  removeUser(
    @Args('id', { type: () => Int })
    id: number,
  ): boolean {
    return this.usersService.remove(id);
  }
}
```

Resolver는 Query와 Mutation을 Service의 메서드에 연결합니다.

이번 예제에서는 존재하지 않는 사용자를 조회하거나 수정하면 `null`을 반환하고, 삭제 결과는 Boolean으로 반환합니다.

실무에서는 도메인 요구사항에 따라 명시적인 예외나 오류 타입을 반환하도록 설계할 수 있습니다.

### 9.7. UsersModule

`src/users/users.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  providers: [
    UsersResolver,
    UsersService,
  ],
})
export class UsersModule {}
```

GraphQL Resolver는 Controller가 아닌 Provider로 등록합니다.

### 9.8. AppModule

`src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { GraphQLModule } from '@nestjs/graphql';

import {
  ApolloDriver,
  ApolloDriverConfig,
} from '@nestjs/apollo';

import { UsersModule } from './users/users.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      graphiql: true,
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

### 9.9. Bootstrap

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

기본 GraphQL Endpoint는 다음과 같습니다.

```text
http://localhost:3000/graphql
```

GraphiQL이 활성화된 환경에서는 해당 주소에서 Query와 Mutation을 테스트할 수 있습니다.

---

## 10. GraphQL Query 및 Mutation 실행

### 10.1. 사용자 생성

```graphql
mutation {
  createUser(
    input: {
      name: "Alice"
      email: "alice@example.com"
    }
  ) {
    id
    name
    email
  }
}
```

응답:

```json
{
  "data": {
    "createUser": {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com"
    }
  }
}
```

### 10.2. 사용자 목록 조회

```graphql
query {
  users {
    id
    name
  }
}
```

응답:

```json
{
  "data": {
    "users": [
      {
        "id": 1,
        "name": "Alice"
      }
    ]
  }
}
```

### 10.3. 단일 사용자 조회

```graphql
query {
  user(id: 1) {
    id
    name
    email
  }
}
```

### 10.4. 사용자 수정

```graphql
mutation {
  updateUser(
    id: 1
    input: {
      name: "Alice Updated"
    }
  ) {
    id
    name
    email
  }
}
```

### 10.5. 사용자 삭제

```graphql
mutation {
  removeUser(id: 1)
}
```

응답:

```json
{
  "data": {
    "removeUser": true
  }
}
```

### 10.6. Variables

GraphQL에서는 Query 문서와 입력값을 분리하기 위해 Variables를 사용할 수 있습니다.

```graphql
query GetUser($id: Int!) {
  user(id: $id) {
    id
    name
  }
}
```

Variables:

```json
{
  "id": 1
}
```

Variables는 요청 문서를 재사용하고 입력값을 명확하게 전달하는 데 유용합니다.

---

## 11. HTTP를 통한 GraphQL 요청

GraphQL은 일반적으로 HTTP 기반으로 Query와 Mutation을 전송합니다.

대표적인 방식은 POST 요청입니다.

```http
POST /graphql
Content-Type: application/json
```

Request Body:

```json
{
  "query": "query GetUser($id: Int!) { user(id: $id) { id name } }",
  "variables": {
    "id": 1
  },
  "operationName": "GetUser"
}
```

cURL 예제:

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetUser($id: Int!) { user(id: $id) { id name } }",
    "variables": {
      "id": 1
    },
    "operationName": "GetUser"
  }'
```

GraphQL over HTTP에서는 GET 요청을 사용하여 Query를 실행할 수도 있습니다.

다만 Mutation을 GET으로 실행해서는 안 되며, 실제 지원 여부는 서버의 GraphQL over HTTP 구현에 따라 달라집니다.

GraphQL에서 HTTP 상태 코드와 GraphQL 실행 오류는 별개의 의미를 가집니다.

예를 들어 요청이 정상적으로 실행되었지만 특정 Resolver에서 오류가 발생한 경우 HTTP 200 응답과 GraphQL `errors`가 함께 반환될 수 있습니다.

---

## 12. Field Resolver

GraphQL에서는 Object Type의 특정 필드를 별도 Resolver로 처리할 수 있습니다.

이를 Field Resolver라고 합니다.

예를 들어 사용자가 작성한 게시글을 함께 조회하는 경우를 살펴보겠습니다.

### 12.1. Object Type 정의

```typescript
import {
  Field,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class Post {
  @Field(() => Int)
  id!: number;

  @Field()
  title!: string;
}
```

기존 User 타입에 다음 필드를 추가합니다.

```typescript
@Field(() => [Post])
posts!: Post[];
```

### 12.2. ResolveField 구현

다음은 기존 UsersResolver에 추가할 Field Resolver 예제입니다. `PostsService`는 사용자 식별자로 게시글 목록을 조회하는 Provider라고 가정합니다.

```typescript
import {
  Parent,
  ResolveField,
} from '@nestjs/graphql';

@ResolveField(() => [Post])
posts(@Parent() user: User): Promise<Post[]> {
  return this.postsService.findByUserId(user.id);
}
```

해당 메서드를 사용하려면 UsersResolver 생성자에 `PostsService`를 주입하고, 해당 Provider가 Module 범위에서 사용 가능하도록 등록하거나 Export/Import해야 합니다.

클라이언트 요청:

```graphql
query {
  users {
    id
    name
    posts {
      id
      title
    }
  }
}
```

GraphQL 엔진은 사용자 목록을 조회한 뒤 요청에 포함된 `posts` 필드를 해결하기 위해 Field Resolver를 실행합니다.

Field Resolver를 사용하면 연관 데이터를 지연 조회하거나 계산 필드를 제공할 수 있습니다.

그러나 반복적인 Field Resolver 실행은 N+1 문제를 유발할 수 있으므로 주의해야 합니다.

---

## 13. N+1 Query 문제

N+1 문제는 여러 객체의 연관 데이터를 조회할 때 불필요하게 많은 데이터베이스 쿼리가 발생하는 현상입니다.

예를 들어 사용자 100명과 각 사용자의 게시글을 조회한다고 가정하겠습니다.

```graphql
query {
  users {
    id
    name
    posts {
      id
      title
    }
  }
}
```

단순한 Resolver 구현에서는 다음과 같은 과정이 발생할 수 있습니다.

```text
1. 사용자 목록 조회
   SELECT * FROM users

2. 사용자 1의 게시글 조회
   SELECT * FROM posts WHERE user_id = 1

3. 사용자 2의 게시글 조회
   SELECT * FROM posts WHERE user_id = 2

...

101. 사용자 100의 게시글 조회
   SELECT * FROM posts WHERE user_id = 100
```

이 경우 사용자 목록을 조회하는 쿼리 1회와 각 사용자의 게시글을 조회하는 쿼리 100회가 실행됩니다.

총 101회의 쿼리가 발생할 수 있습니다.

### 13.1. DataLoader

DataLoader는 여러 데이터 조회 요청을 Batch 처리하고, 동일한 요청 범위에서 중복 조회를 줄이는 데 활용할 수 있는 라이브러리입니다.

설치:

```bash
npm install dataloader
```

예제:

```typescript
import DataLoader from 'dataloader';

const postsLoader = new DataLoader<
  number,
  Post[]
>(async (userIds) => {
  const posts = await postsService.findByUserIds([
    ...userIds,
  ]);

  return userIds.map((userId) =>
    posts.filter(
      (post) => post.userId === userId,
    ),
  );
});
```

이 예제는 `Post` 데이터 모델에 `userId` 속성이 존재하며, `findByUserIds()`가 여러 사용자의 게시글을 한 번에 조회하는 메서드라고 가정합니다.

DataLoader는 여러 개의 개별 요청을 Batch 함수에 전달합니다.

```text
load(1)
load(2)
load(3)
    |
    v
Batch Function
    |
    v
findByUserIds([1, 2, 3])
```

Batch 함수는 입력된 Key와 동일한 순서 및 개수로 결과를 반환해야 합니다.

DataLoader를 사용하더라도 실제 데이터베이스 쿼리가 하나로 최적화되려면 Batch 함수가 효율적으로 구현되어야 합니다.

또한 사용자별 권한이 적용되는 데이터의 경우 요청마다 DataLoader 인스턴스를 생성하는 것이 일반적으로 안전합니다.

전역 Singleton DataLoader를 사용하면 서로 다른 사용자 요청 간 캐시 공유로 인해 데이터 노출 문제가 발생할 수 있습니다.

---

## 14. GraphQL Subscription

Subscription은 클라이언트가 서버의 이벤트를 지속적으로 구독할 수 있도록 합니다.

대표적인 활용 사례는 다음과 같습니다.

- 실시간 알림
- 채팅 메시지 전달
- 데이터 변경 이벤트
- 작업 진행 상태 전달
- 실시간 대시보드

### 14.1. Subscription 활성화

Apollo Driver를 사용하는 경우 `graphql-ws` 기반 Subscription을 설정할 수 있습니다.

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: true,
  subscriptions: {
    'graphql-ws': true,
  },
});
```

현재 공식 문서의 최신 GraphQL 구성에서는 과거의 `subscriptions-transport-ws` 대신 `graphql-ws`를 사용합니다.

`@nestjs/graphql` v14에서는 기존 `subscriptions-transport-ws` 지원이 제거되었으므로 구버전 프로젝트를 마이그레이션할 때 주의해야 합니다.

### 14.2. PubSub

Subscription 이벤트를 전달하기 위해 PubSub(Publish/Subscribe) 인터페이스를 활용할 수 있습니다.

예제에서 사용할 패키지를 설치합니다.

```bash
npm install graphql-subscriptions
```

다음은 간단한 Subscription 예제입니다.

```typescript
import {
  Resolver,
  Subscription,
} from '@nestjs/graphql';

import { PubSub } from 'graphql-subscriptions';
import { User } from './models/user.model';

const pubSub = new PubSub();

@Resolver(() => User)
export class UsersResolver {
  @Subscription(() => User)
  userCreated() {
    return pubSub.asyncIterableIterator(
      'userCreated',
    );
  }
}
```

이벤트 발행 예제:

```typescript
await pubSub.publish('userCreated', {
  userCreated: {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
  },
});
```

클라이언트는 다음 Subscription을 실행할 수 있습니다.

```graphql
subscription {
  userCreated {
    id
    name
  }
}
```

위 예제는 Subscription의 동작 방식을 설명하기 위한 독립적인 예제입니다. 실제 CRUD 예제와 통합하려면 이벤트 발행 로직을 사용자 생성 처리 과정에 연결해야 합니다.

또한 `graphql-subscriptions`의 API는 사용하는 메이저 버전에 따라 달라질 수 있으므로 설치한 버전의 API를 확인해야 합니다.

### 14.3. 운영 환경에서의 PubSub

기본적인 In-memory PubSub 구현은 단일 프로세스 내 이벤트 전달을 위한 학습 예제에 적합합니다.

그러나 여러 NestJS 서버 인스턴스가 실행되는 환경에서는 각 프로세스의 In-memory PubSub 상태가 공유되지 않습니다.

따라서 수평 확장이 필요한 환경에서는 별도의 메시지 브로커 또는 분산 이벤트 전달 구조를 검토해야 합니다.

이때 Redis, NATS, Kafka 등은 시스템 요구사항에 따라 선택할 수 있는 구현 대안이며, GraphQL Subscription 자체가 특정 메시지 브로커를 요구하는 것은 아닙니다.

---

## 15. GraphQL Context

GraphQL Context는 하나의 GraphQL 실행 과정에서 Resolver가 공유할 수 있는 정보를 전달하는 객체입니다.

일반적으로 다음과 같은 정보를 포함할 수 있습니다.

- 인증된 사용자 정보
- Request Header
- DataLoader 인스턴스
- Request ID
- 요청 단위의 서비스 또는 기타 실행 정보

### 15.1. Context 설정

다음은 HTTP 요청의 헤더를 Context에 전달하는 예제입니다.

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: true,
  context: ({ req }) => ({
    request: req,
  }),
});
```

Resolver에서 Context에 접근할 수 있습니다.

```typescript
import {
  Context,
  Query,
} from '@nestjs/graphql';

@Query(() => String)
requestHeader(
  @Context() context: {
    request: {
      headers: Record<string, string | string[] | undefined>;
    };
  },
): string {
  return String(
    context.request.headers['x-request-id'] ?? '',
  );
}
```

실제 애플리케이션에서는 HTTP 및 Subscription의 Context 구조가 서로 다를 수 있으므로, 사용 중인 Transport에 맞게 Context를 구성해야 합니다.

---

## 16. 인증과 인가

NestJS는 GraphQL Resolver에도 Guard를 적용할 수 있습니다.

그러나 GraphQL의 Execution Context는 일반적인 HTTP Controller의 Execution Context와 구조가 다릅니다.

따라서 기존 HTTP Guard에서 `switchToHttp()`로 요청 객체에 접근하는 방식은 GraphQL 환경에서 그대로 작동하지 않을 수 있습니다.

### 16.1. GqlExecutionContext

GraphQL에서는 `GqlExecutionContext`를 사용하여 GraphQL Context에 접근할 수 있습니다.

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import {
  GqlExecutionContext,
} from '@nestjs/graphql';

@Injectable()
export class GraphqlAuthGuard
  implements CanActivate
{
  canActivate(
    context: ExecutionContext,
  ): boolean {
    const gqlContext =
      GqlExecutionContext.create(context);

    const { request } = gqlContext.getContext<{
      request: {
        headers: Record<string, string | string[] | undefined>;
      };
    }>();

    return Boolean(
      request.headers.authorization,
    );
  }
}
```

위 코드는 GraphQL Context에 전달된 Authorization Header의 존재 여부만 검사하는 단순 예제입니다.

실제 인증에서는 JWT 서명, 만료 시간, Issuer, Audience 등의 검증이 필요합니다.

### 16.2. Guard 적용

```typescript
import {
  UseGuards,
} from '@nestjs/common';

@Query(() => [User])
@UseGuards(GraphqlAuthGuard)
users() {
  return this.usersService.findAll();
}
```

또는 Resolver 클래스에 Guard를 적용할 수 있습니다.

### 16.3. Field Resolver의 인증

GraphQL에서는 최상위 Query와 Mutation뿐 아니라 중첩된 Field Resolver에서도 민감한 데이터를 반환할 수 있습니다.

NestJS의 GraphQL 설정에서는 기본적으로 Field Resolver에 Guard, Interceptor 및 Filter 등의 Enhancer가 적용되지 않는다는 점을 고려해야 합니다.

필요한 경우 다음과 같이 설정할 수 있습니다.

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: true,
  fieldResolverEnhancers: [
    'guards',
    'interceptors',
    'filters',
  ],
});
```

다만 모든 Field Resolver에 Enhancer를 적용하면 실행 횟수가 증가할 수 있으므로 성능 영향을 검토해야 합니다.

---

## 17. Validation과 오류 처리

### 17.1. Validation

GraphQL에서는 Schema 자체의 타입 검증과 애플리케이션 수준의 데이터 검증을 구분해야 합니다.

예를 들어 다음 Input Type을 살펴보겠습니다.

```typescript
@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  email!: string;
}
```

GraphQL Schema는 해당 필드가 문자열인지 검증할 수 있습니다.

그러나 문자열이 이메일 형식에 부합하는지는 `@IsEmail()`과 ValidationPipe를 통해 검증해야 합니다.

### 17.2. GraphQL 오류 응답

GraphQL 실행 중 오류가 발생하면 다음과 같은 형태의 응답이 반환될 수 있습니다.

```json
{
  "data": {
    "user": null
  },
  "errors": [
    {
      "message": "User not found",
      "path": ["user"]
    }
  ]
}
```

실제 응답에는 오류 코드, 위치 정보 및 확장 필드가 포함될 수 있습니다.

GraphQL은 일부 필드에서 오류가 발생해도 다른 필드의 데이터 반환을 허용할 수 있습니다.

다만 Non-Null 필드에서 오류가 발생하면 GraphQL의 Null 전파 규칙에 따라 상위 객체까지 Null로 처리될 수 있습니다.

### 17.3. 오류 처리 시 고려사항

운영 환경에서는 다음 사항을 고려해야 합니다.

- 클라이언트에 노출하는 오류 메시지 제한
- 내부 Stack Trace 비노출
- GraphQL Error Code의 일관성
- 인증 및 권한 오류의 구분
- Resolver별 오류 로깅
- 부분 성공 응답 처리
- 민감한 데이터가 오류 메시지에 포함되지 않도록 방지

---

## 18. GraphQL 성능 및 보안

GraphQL은 클라이언트가 원하는 데이터 구조를 요청할 수 있다는 장점이 있지만, 요청의 복잡도가 높아질 수 있습니다.

### 18.1. Query Depth

GraphQL에서는 중첩된 관계를 깊게 조회하는 Query를 작성할 수 있습니다.

```graphql
query {
  users {
    posts {
      author {
        posts {
          author {
            id
          }
        }
      }
    }
  }
}
```

이러한 Query는 Resolver 실행 횟수와 데이터베이스 접근량을 증가시킬 수 있습니다.

필요한 경우 Query Depth 제한을 적용할 수 있습니다.

### 18.2. Query Complexity

Query Complexity는 요청된 필드의 비용과 연관 관계 등을 기준으로 Query 실행 비용을 계산하는 방법입니다.

예를 들어 다음 사항을 비용 산정에 반영할 수 있습니다.

- 요청한 필드 수
- 중첩 깊이
- 리스트 예상 크기
- Resolver 실행 비용
- 데이터베이스 조회 비용

Depth 제한만으로 모든 고비용 Query를 방지할 수는 없으므로 Query Complexity 분석과 함께 사용하는 것이 좋습니다.

### 18.3. Pagination

대량의 데이터를 조회하는 GraphQL Query에는 페이지네이션을 적용해야 합니다.

```graphql
query {
  users(limit: 20, offset: 0) {
    id
    name
  }
}
```

GraphQL에서는 Cursor 기반 페이지네이션과 Relay Connection Pattern도 널리 활용됩니다.

### 18.4. Rate Limiting

일반적인 HTTP 요청 횟수 기반 Rate Limiting은 GraphQL에서도 활용할 수 있습니다.

다만 GraphQL에서는 하나의 HTTP 요청이 여러 Resolver를 실행할 수 있으므로 단순한 요청 횟수 제한만으로 실제 처리 비용을 충분히 통제하지 못할 수 있습니다.

따라서 Query Complexity 제한과 함께 고려하는 것이 좋습니다.

### 18.5. Introspection

GraphQL Introspection은 클라이언트가 Schema의 구조를 조회할 수 있도록 지원합니다.

개발 환경에서는 IDE 및 Schema 분석 도구에 유용합니다.

운영 환경에서는 서비스의 공개 범위와 보안 정책을 고려하여 Introspection 허용 여부를 결정해야 합니다.

Introspection을 비활성화하더라도 인증, 인가 및 Query Complexity 제한을 대체할 수는 없습니다.

### 18.6. Persisted Query

Persisted Query는 사전에 등록한 GraphQL Query를 식별자로 요청하는 방식입니다.

이를 활용하면 요청 본문의 크기를 줄이거나 허용된 Query만 실행하도록 제한하는 구조를 설계할 수 있습니다.

다만 Persisted Query의 구체적인 보안 효과는 서버가 임의 Query를 허용하는지, 등록된 Query만 허용하는지에 따라 달라집니다.

---

## 19. REST API와 GraphQL 비교

REST API와 GraphQL은 서로 다른 API 설계 접근 방식을 제공합니다.

| 항목 | REST API | GraphQL |
|---|---|---|
| 인터페이스 | Resource와 HTTP 메서드 | Schema와 Operation |
| 데이터 조회 | Endpoint별 응답 구조 | 클라이언트가 필드 선택 |
| 응답 구조 | 서버가 정의한 표현 | 선택한 필드에 따라 달라짐 |
| 데이터 변경 | POST, PUT, PATCH, DELETE 등 | Mutation |
| 타입 시스템 | 별도 명세 도구 사용 가능 | GraphQL Schema에 타입 정의 |
| 캐싱 | HTTP 캐싱을 활용하기 용이 | 별도의 캐시 전략이 필요할 수 있음 |
| API 버전 관리 | URI 또는 Header 등의 방식 | Schema Evolution 방식 활용 가능 |
| 주요 성능 문제 | Endpoint별 전송량, 요청 횟수 등 | N+1, Query Complexity 등 |

GraphQL이 모든 REST API보다 효율적인 것은 아닙니다.

요청 구조가 단순하고 HTTP 캐싱을 적극적으로 활용하는 API에서는 REST 방식이 더 적합할 수 있습니다.

반면 클라이언트마다 필요한 데이터 구조가 다르고 여러 Resource의 관계를 유연하게 조회해야 하는 경우 GraphQL이 유리할 수 있습니다.

하나의 NestJS 애플리케이션에서 REST Controller와 GraphQL Resolver를 함께 사용할 수도 있습니다.

이 경우 Service 계층을 공유하고 각 Transport 계층의 요청 및 응답 처리를 분리하는 방식으로 구성할 수 있습니다.

---

## 20. Spring Boot와 NestJS의 GraphQL 비교

Spring Boot 환경에서는 일반적으로 Spring for GraphQL을 이용하여 GraphQL API를 구현합니다.

NestJS는 `@nestjs/graphql`을 통해 동일한 목적의 기능을 제공합니다.

| 항목 | Spring for GraphQL | NestJS GraphQL |
|---|---|---|
| Schema | 주로 SDL 중심 | Code First / Schema First |
| Resolver 역할 | `@QueryMapping` 등 | `@Query()`, `@Mutation()` 등 |
| 필드 처리 | `@SchemaMapping` | `@ResolveField()` |
| 입력 데이터 | `@Argument` | `@Args()` |
| Service 주입 | Spring DI | NestJS DI |
| Validation | Jakarta Validation 등 | ValidationPipe 및 검증 라이브러리 |
| 실행 Context | GraphQLContext 등 | GqlExecutionContext 및 Context |
| Subscription | Reactor 및 GraphQL 통합 | Subscription Resolver 및 AsyncIterable |

두 프레임워크 모두 GraphQL Schema와 Resolver를 연결하여 API를 구현할 수 있습니다.

NestJS에서는 Resolver가 Provider로 등록되므로 Module의 Provider 가시성과 Dependency Injection 구조를 함께 이해해야 합니다.

---

## 21. GraphQL 도입 시 고려사항

GraphQL을 도입할 때는 다음 사항을 검토해야 합니다.

### 21.1. 적합한 활용 사례

GraphQL은 다음과 같은 환경에서 효과적으로 활용할 수 있습니다.

- 여러 클라이언트가 서로 다른 데이터 구조를 요구하는 경우
- 다양한 Resource를 중첩된 구조로 조회해야 하는 경우
- 클라이언트의 데이터 선택 자유도가 중요한 경우
- Schema를 중심으로 API 계약을 관리하려는 경우
- 프론트엔드 개발팀과 백엔드 개발팀이 GraphQL 타입 시스템을 공유하려는 경우

### 21.2. 주의해야 할 사항

반대로 다음 사항은 도입 전 검토가 필요합니다.

- Resolver별 데이터베이스 접근 비용
- N+1 Query 문제
- Query Depth와 Complexity 제한
- 인증 및 필드 단위 인가
- GraphQL 응답의 캐싱 전략
- Subscription 연결 및 수평 확장
- 오류 응답과 모니터링
- Schema 변경 시 기존 클라이언트와의 호환성

GraphQL은 데이터 요청 구조의 유연성을 제공하지만, 성능 최적화와 운영 복잡도를 자동으로 해결하지는 않습니다.

---

## 22. 정리

GraphQL은 Schema 기반의 타입 시스템과 Resolver를 이용하여 클라이언트가 필요한 데이터를 선택적으로 요청할 수 있도록 지원합니다.

NestJS는 `@nestjs/graphql`을 통해 GraphQL API를 구현할 수 있으며, Apollo Server 또는 Mercurius와 연계할 수 있습니다.

주요 내용을 정리하면 다음과 같습니다.

1. GraphQL은 Schema를 통해 API에서 제공하는 타입과 연산을 정의합니다.
2. Query는 데이터 조회, Mutation은 데이터 변경, Subscription은 이벤트 구독에 사용합니다.
3. Code First는 TypeScript 클래스와 데코레이터를 기반으로 Schema를 생성합니다.
4. Schema First는 SDL을 기준으로 API 계약을 관리합니다.
5. Resolver는 GraphQL 필드를 Service 및 데이터 접근 로직에 연결합니다.
6. Field Resolver는 연관 데이터 조회에 유용하지만 N+1 문제를 유발할 수 있습니다.
7. DataLoader는 데이터 조회를 Batch 처리하여 중복 접근을 줄이는 데 활용할 수 있습니다.
8. Guard, Pipe, Interceptor 및 Exception Filter는 GraphQL 환경에서도 활용할 수 있지만 Execution Context의 차이를 고려해야 합니다.
9. Subscription은 서버에서 발생하는 이벤트를 클라이언트에 전달하는 데 사용합니다.
10. 운영 환경에서는 Query Complexity, 인증·인가, 페이지네이션, 캐싱 및 모니터링을 함께 고려해야 합니다.

GraphQL은 REST API를 완전히 대체하는 기술이 아니라, 클라이언트와 서버 사이의 데이터 교환을 설계하는 또 다른 접근 방식입니다.

애플리케이션의 데이터 구조, 클라이언트 요구사항, 성능 목표 및 운영 환경을 고려하여 REST API와 GraphQL 중 적절한 방식을 선택하거나 함께 사용할 수 있습니다.

---

## 23. 관련 문서

| 문서 | 주요 내용 |
|---|---|
| `01-fundamentals/modules.md` | Module 구성 및 Provider 등록 |
| `01-fundamentals/providers.md` | Provider와 Service |
| `01-fundamentals/dependency-injection.md` | Dependency Injection |
| `02-request-lifecycle/guards.md` | Guard와 접근 제어 |
| `02-request-lifecycle/pipes.md` | Pipe와 데이터 검증 |
| `02-request-lifecycle/exception-filters.md` | 예외 처리 |
| `02-request-lifecycle/execution-context.md` | Execution Context |
| `03-techniques/validation.md` | DTO와 데이터 검증 |
| `03-techniques/database.md` | 데이터베이스 접근 및 N+1 문제 |
| `04-security/authentication.md` | 인증 처리 |
| `04-security/authorization.md` | 인가 처리 |
| `05-platforms/rest-api.md` | REST API |
| `05-platforms/websocket.md` | WebSocket 통신 |
| `06-testing/e2e-testing.md` | E2E 테스트 |

---

## 참고 자료

### NestJS 공식 문서

- [NestJS — GraphQL Quick Start](https://docs.nestjs.com/graphql/quick-start)
- [NestJS — GraphQL Resolvers](https://docs.nestjs.com/graphql/resolvers)
- [NestJS — GraphQL Mutations](https://docs.nestjs.com/graphql/mutations)
- [NestJS — GraphQL Subscriptions](https://docs.nestjs.com/graphql/subscriptions)
- [NestJS — GraphQL Scalars](https://docs.nestjs.com/graphql/scalars)
- [NestJS — GraphQL Interfaces](https://docs.nestjs.com/graphql/interfaces)
- [NestJS — GraphQL Unions and Enums](https://docs.nestjs.com/graphql/unions-and-enums)
- [NestJS — GraphQL Mapped Types](https://docs.nestjs.com/graphql/mapped-types)
- [NestJS — GraphQL Other Features](https://docs.nestjs.com/graphql/other-features)
- [NestJS — GraphQL Complexity](https://docs.nestjs.com/graphql/complexity)
- [NestJS — Execution Context](https://docs.nestjs.com/fundamentals/execution-context)

### GraphQL 공식 문서

- [GraphQL 공식 웹사이트](https://graphql.org/)
- [GraphQL — Learn](https://graphql.org/learn/)
- [GraphQL — Queries](https://graphql.org/learn/queries/)
- [GraphQL — Schema](https://graphql.org/learn/schema/)
- [GraphQL — Validation](https://graphql.org/learn/validation/)
- [GraphQL Specification](https://spec.graphql.org/)
- [GraphQL over HTTP](https://graphql.github.io/graphql-over-http/)

### Apollo 및 관련 라이브러리

- [Apollo Server Documentation](https://www.apollographql.com/docs/apollo-server)
- [Apollo Server — Subscriptions](https://www.apollographql.com/docs/apollo-server/data/subscriptions)
- [DataLoader GitHub Repository](https://github.com/graphql/dataloader)
- [graphql-ws GitHub Repository](https://github.com/enisdenjo/graphql-ws)
- [graphql-subscriptions GitHub Repository](https://github.com/apollographql/graphql-subscriptions)
- [Mercurius GitHub Repository](https://github.com/mercurius-js/mercurius)

### 기타 참고 자료

- [Spring for GraphQL](https://docs.spring.io/spring-graphql/reference/)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)
- [NestJS Official Examples](https://github.com/nestjs/nest/tree/master/sample)