# Environment Configuration

## 1. 개요

Environment Configuration은 NestJS 애플리케이션의 실행 환경에 따라 달라지는 설정값을 애플리케이션 코드와 분리하여 관리하는 방법입니다.

일반적인 애플리케이션에서는 Development, Test, Staging, Production 환경에 따라 데이터베이스 연결 정보, 서버 포트, 외부 API 주소, 인증 정보 및 Logging 설정 등이 달라질 수 있습니다.

이러한 설정을 소스 코드에 직접 작성하면 환경이 변경될 때마다 코드를 수정해야 하며, 민감한 정보가 Git Repository에 포함될 위험이 있습니다.

NestJS는 환경 설정을 관리하기 위한 `@nestjs/config` 패키지를 제공합니다.

이 패키지는 `dotenv`를 기반으로 환경 변수 파일을 로딩하며, NestJS의 Dependency Injection 시스템과 통합되어 설정값을 관리할 수 있도록 지원합니다.

Environment Configuration에서는 다음 항목을 다룹니다.

- 환경 변수와 Configuration의 개념
- `process.env`와 `.env` 파일
- `ConfigModule`과 `ConfigService`
- 환경별 설정 파일 관리
- 환경 변수 로딩 우선순위
- Custom Configuration과 Namespaced Configuration
- 환경 변수 검증 및 타입 변환
- Type-safe Configuration
- 비동기 모듈 설정
- Docker 및 Kubernetes 환경 변수 주입
- Secret 관리와 운영 환경 권장 사항

---

## 2. Environment Configuration의 필요성

애플리케이션은 실행 환경에 따라 서로 다른 설정값을 사용해야 하는 경우가 많습니다.

예를 들어 다음과 같은 환경을 가정할 수 있습니다.

| 설정 항목 | Development | Production |
|---|---|---|
| `NODE_ENV` | development | production |
| `PORT` | 3000 | 8080 |
| Database Host | localhost | 운영 DB 주소 |
| Log Level | debug | warn |
| External API | 테스트 서버 | 운영 서버 |
| Credentials | 개발용 인증 정보 | 운영용 인증 정보 |

환경 설정을 분리하면 동일한 애플리케이션 코드를 수정하지 않고 서로 다른 환경에서 실행할 수 있습니다.

### 2.1. 설정값을 코드에 직접 작성하는 방식

```typescript
@Injectable()
export class DatabaseService {
  private readonly host = 'localhost';
  private readonly port = 3306;
}
```

이 방식은 데이터베이스 주소를 변경할 때 소스 코드를 수정해야 합니다.

또한 환경에 따라 조건문을 추가해야 할 수 있습니다.

```typescript
const databaseHost =
  process.env.NODE_ENV === 'production'
    ? 'production-db.example.internal'
    : 'localhost';
```

이러한 코드가 여러 모듈에 분산되면 설정 관리가 복잡해질 수 있습니다.

### 2.2. 환경 변수를 사용하는 방식

```typescript
const databaseHost = process.env.DATABASE_HOST;
```

애플리케이션 외부에서 `DATABASE_HOST` 값을 지정하면 소스 코드를 변경하지 않고 연결 대상을 변경할 수 있습니다.

다만 `process.env`를 직접 사용하는 경우에는 설정값 검증, 타입 변환, 기본값 처리 및 의존성 관리가 여러 위치에 중복될 수 있습니다.

NestJS에서는 이러한 문제를 해결하기 위해 `ConfigModule`과 `ConfigService`를 사용할 수 있습니다.

---

## 3. Environment Variable

Environment Variable은 운영체제 또는 실행 환경에서 프로세스에 전달하는 Key-Value 형태의 설정값입니다.

Node.js에서는 `process.env` 객체를 통해 환경 변수에 접근할 수 있습니다.

### 3.1. process.env

다음과 같이 환경 변수를 지정하여 애플리케이션을 실행할 수 있습니다.

```bash
PORT=3000 NODE_ENV=development node dist/main.js
```

애플리케이션에서는 다음과 같이 값을 읽을 수 있습니다.

```typescript
const port = process.env.PORT;
const nodeEnv = process.env.NODE_ENV;
```

`process.env`로 읽는 일반적인 환경 변수 값은 문자열입니다.

따라서 숫자나 Boolean 값이 필요하면 명시적인 타입 변환이 필요합니다.

```typescript
const port = Number(process.env.PORT ?? 3000);
```

Boolean 값은 특히 주의해야 합니다.

```typescript
const enabled = Boolean(process.env.FEATURE_ENABLED);
```

위 코드에서 `FEATURE_ENABLED=false`가 설정되어 있어도 문자열 `"false"`는 Truthy 값이므로 결과는 `true`입니다.

명시적으로 비교해야 합니다.

```typescript
const enabled = process.env.FEATURE_ENABLED === 'true';
```

또는 Configuration Validation 단계에서 타입 변환을 수행할 수 있습니다.

### 3.2. .env 파일

`.env` 파일은 환경 변수를 Key-Value 형태로 정의하는 파일입니다.

```dotenv
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=app_user
DATABASE_PASSWORD=local_password
```

`local_password`는 문서 설명을 위한 예시 값입니다.

Node.js는 실행 환경과 설정에 따라 `.env` 파일을 로딩할 수 있으며, NestJS에서는 `@nestjs/config` 패키지를 사용하여 이를 처리할 수 있습니다.

`.env` 파일을 생성했다고 해서 모든 Node.js 프로세스가 자동으로 해당 파일을 읽는 것은 아닙니다.

환경 변수를 로딩하는 방법을 별도로 설정해야 합니다.

---

## 4. ConfigModule

`ConfigModule`은 NestJS에서 애플리케이션 설정을 로딩하고 관리하기 위한 모듈입니다.

`@nestjs/config` 패키지에서 제공하며, `ConfigService`를 통해 설정값에 접근할 수 있도록 지원합니다.

### 4.1. 패키지 설치

```bash
npm install @nestjs/config
```

별도의 검증 라이브러리를 사용할 경우 해당 패키지도 설치해야 합니다.

### 4.2. ConfigModule 등록

`app.module.ts`에 `ConfigModule`을 등록합니다.

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
  ],
})
export class AppModule {}
```

`ConfigModule.forRoot()`는 기본적으로 현재 작업 디렉터리의 `.env` 파일을 로딩할 수 있도록 구성합니다.

일반적인 실행 흐름은 다음과 같습니다.

```text
Application Startup
        |
        v
ConfigModule.forRoot()
        |
        v
Load Environment Variables
        |
        v
Merge Configuration Values
        |
        v
Validate Configuration
        |
        v
Register ConfigService
        |
        v
NestJS Application Bootstrap
```

검증 단계는 `validationSchema` 또는 `validate` 옵션을 구성한 경우에 수행됩니다.

`ConfigModule`은 NestJS의 DI Container에 `ConfigService`를 Provider로 등록합니다.

따라서 다른 Provider에서 `ConfigService`를 주입받아 사용할 수 있습니다.

### 4.3. Global Module 설정

기본적으로 `ConfigService`를 사용하려는 모듈에서는 `ConfigModule`을 Import해야 합니다.

여러 모듈에서 공통으로 설정값을 사용한다면 Global Module로 등록할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

`isGlobal: true`를 설정하면 다른 모듈에서 `ConfigModule`을 반복적으로 Import하지 않아도 `ConfigService`를 주입받을 수 있습니다.

단, Global Module은 의존 관계를 명시적으로 드러내지 않으므로 프로젝트의 모듈 설계 방식에 따라 사용 여부를 결정해야 합니다.

---

## 5. ConfigService

`ConfigService`는 `ConfigModule`을 통해 로딩한 설정값에 접근하기 위한 Injectable Provider입니다.

### 5.1. ConfigService 주입

다음은 Service에서 `ConfigService`를 사용하는 예제입니다.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  getPort(): number {
    return this.configService.get<number>('PORT', 3000);
  }
}
```

위 예제는 설정값을 읽는 방법을 설명하기 위한 코드입니다.

여기서 `<number>`는 TypeScript 타입 힌트이며, 문자열을 실제 숫자로 변환하는 기능은 아닙니다.

숫자 타입을 보장하려면 환경 변수 검증 또는 명시적 변환이 필요합니다.

### 5.2. get()

`get()`은 설정값을 조회합니다.

```typescript
const host = this.configService.get<string>('DATABASE_HOST');
```

설정값이 없으면 기본적으로 `undefined`를 반환할 수 있습니다.

기본값을 지정할 수도 있습니다.

```typescript
const host = this.configService.get<string>(
  'DATABASE_HOST',
  'localhost',
);
```

### 5.3. getOrThrow()

필수 설정값이 없는 경우 예외를 발생시키려면 `getOrThrow()`를 사용할 수 있습니다.

```typescript
const host = this.configService.getOrThrow<string>(
  'DATABASE_HOST',
);
```

`getOrThrow()`는 조회 결과가 `undefined`인 경우 예외를 발생시킵니다.

단, 값의 형식이나 유효성을 검증하는 API는 아닙니다.

예를 들어 잘못된 포트 문자열이 존재하더라도 값이 정의되어 있다면 반환될 수 있습니다.

따라서 필수 설정에 대한 형식 검증은 별도의 Validation Schema에서 수행하는 것이 좋습니다.

### 5.4. get()과 getOrThrow() 비교

| 메서드 | 설정값이 없는 경우 | 용도 |
|---|---|---|
| `get()` | `undefined` 또는 기본값 반환 | 선택적 설정 |
| `getOrThrow()` | 예외 발생 | 필수 설정 |

운영 환경에서 반드시 필요한 Database Credentials나 API Key 등은 설정 검증과 함께 `getOrThrow()`를 활용할 수 있습니다.

---

## 6. 환경별 설정 파일

개발 환경과 운영 환경에서 서로 다른 설정값을 사용하려면 환경별 `.env` 파일을 구성할 수 있습니다.

### 6.1. 디렉터리 구조

```text
nestjs-app/
├── src/
│   ├── app.module.ts
│   └── main.ts
│
├── .env.development
├── .env.test
├── .env.production
├── .env.example
│
├── package.json
└── nest-cli.json
```

각 파일에는 해당 환경에서 사용할 설정값을 정의합니다.

`.env.development`

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=3306
```

`.env.production`

```dotenv
NODE_ENV=production
PORT=8080
DATABASE_HOST=production-db.example.internal
DATABASE_PORT=3306
```

실제 운영 환경의 민감한 인증 정보는 `.env.production` 파일에 직접 포함하여 Repository에 저장하지 않는 것이 좋습니다.

### 6.2. envFilePath 옵션

`ConfigModule.forRoot()`의 `envFilePath` 옵션으로 로딩할 파일을 지정할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.development',
    }),
  ],
})
export class AppModule {}
```

환경에 따라 파일을 선택할 수도 있습니다.

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

const environment = process.env.NODE_ENV ?? 'development';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${environment}`,
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

이 예제에서는 `NODE_ENV`를 애플리케이션 실행 전에 지정해야 합니다.

```bash
NODE_ENV=production npm run start:prod
```

`NODE_ENV` 값을 `.env.production` 안에만 작성하는 것으로는 해당 파일의 선택을 결정할 수 없습니다.

파일을 선택하는 코드가 실행되는 시점에 `NODE_ENV`가 이미 정의되어 있어야 하기 때문입니다.

### 6.3. 여러 환경 파일 로딩

`envFilePath`에는 파일 경로 배열을 지정할 수도 있습니다.

```typescript
ConfigModule.forRoot({
  envFilePath: [
    '.env.local',
    '.env',
  ],
});
```

NestJS의 `envFilePath` 배열에서는 동일한 환경 변수 키가 여러 파일에 존재할 때 먼저 로딩되는 파일의 값이 우선합니다.

다만 기본 설정에서 실행 환경에 이미 정의된 환경 변수는 `.env` 파일의 값보다 우선합니다.

환경 파일 간 우선순위와 외부 환경 변수의 우선순위를 구분해야 합니다.

### 6.4. ignoreEnvFile 옵션

컨테이너나 클라우드 환경에서 외부 환경 변수만 사용할 경우 `.env` 파일 로딩을 비활성화할 수 있습니다.

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  ignoreEnvFile: true,
});
```

이 옵션을 설정하면 `ConfigModule`은 자체적인 `.env` 파일 로딩을 수행하지 않습니다.

단, Node.js 또는 다른 도구가 이미 로딩하여 `process.env`에 저장한 변수는 사용할 수 있습니다.

---

## 7. 환경 변수 로딩 우선순위

설정값이 여러 위치에서 정의될 수 있기 때문에 어떤 값이 최종적으로 적용되는지 이해해야 합니다.

예를 들어 다음과 같은 상황을 가정합니다.

`.env`

```dotenv
PORT=3000
```

Shell 환경 변수

```bash
export PORT=8080
```

기본 설정의 `ConfigModule.forRoot()`를 사용한다면 외부에서 정의한 `PORT=8080`이 우선합니다.

```typescript
ConfigModule.forRoot();
```

기본적인 우선순위는 다음과 같습니다.

```text
Runtime Environment Variables
              |
              v
       .env File Values
              |
              v
    Application Defaults
```

위 흐름은 일반적인 설정 정책을 나타낸 개념도입니다.

실제 `ConfigService`는 환경 변수, 사용자 정의 Configuration, 기본값 등의 설정 출처와 옵션에 따라 값을 해석합니다.

또한 최신 `@nestjs/config`에서는 `.env` 파일 값이 기존 환경 변수를 덮어쓰도록 하는 `override` 옵션도 지원합니다.

운영 환경에서는 외부에서 주입한 환경 변수를 우선하는 기본 정책을 유지하는 것이 일반적으로 적합합니다.

### 7.1. Node.js의 Native .env 지원

Node.js는 자체적으로 `.env` 파일을 로딩하는 기능도 제공합니다.

```bash
node --env-file=.env dist/main.js
```

Node.js가 애플리케이션 시작 전에 환경 변수를 로딩하므로 다음과 같이 구성할 수 있습니다.

```typescript
ConfigModule.forRoot({
  ignoreEnvFile: true,
});
```

이 경우에도 `ConfigService`를 통한 환경 변수 조회 및 검증 기능을 사용할 수 있습니다.

단, Node.js의 `--env-file` 옵션과 NestJS `envFilePath` 배열의 파일 우선순위 규칙은 동일하지 않을 수 있습니다.

여러 파일을 조합하는 경우 사용 중인 로더의 규칙을 확인해야 합니다.

---

## 8. Custom Configuration

환경 변수의 개수가 증가하면 모든 설정을 문자열 Key로 직접 참조하는 방식은 관리하기 어려워질 수 있습니다.

NestJS는 Configuration Factory를 사용하여 설정값을 구조화할 수 있습니다.

### 8.1. Configuration Factory 작성

다음과 같은 구조를 구성합니다.

```text
src/
├── config/
│   └── configuration.ts
│
├── app.module.ts
└── main.ts
```

`config/configuration.ts`

```typescript
export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    environment: process.env.NODE_ENV ?? 'development',
  },

  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  },
});
```

이 코드는 환경 변수를 애플리케이션 설정 객체로 변환합니다.

다만 `Number()`만으로는 유효한 포트 범위를 보장할 수 없으므로 별도의 검증이 필요합니다.

### 8.2. Configuration Factory 등록

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
  ],
})
export class AppModule {}
```

`load` 옵션은 Custom Configuration Factory를 등록합니다.

### 8.3. 중첩된 설정값 조회

```typescript
const port = this.configService.get<number>('app.port');

const databaseHost = this.configService.get<string>(
  'database.host',
);
```

Custom Configuration을 사용하면 관련 설정을 하나의 Namespace로 묶을 수 있습니다.

```text
app.port
app.environment

database.host
database.port
database.username
database.password
```

이는 설정의 책임을 구분하는 데 도움이 됩니다.

---

## 9. Namespaced Configuration

NestJS에서는 `registerAs()`를 사용하여 설정에 Namespace를 지정할 수 있습니다.

### 9.1. Database Configuration

`src/config/database.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
}));
```

`registerAs('database', ...)`는 해당 설정을 `database` Namespace로 등록합니다.

### 9.2. AppModule 등록

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
  ],
})
export class AppModule {}
```

### 9.3. 설정값 조회

```typescript
const host = this.configService.get<string>(
  'database.host',
);
```

또는 Namespace 자체를 DI Token으로 사용하여 설정 객체를 주입받을 수 있습니다.

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import databaseConfig from './config/database.config';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject(databaseConfig.KEY)
    private readonly config: ConfigType<typeof databaseConfig>,
  ) {}

  getHost(): string {
    return this.config.host;
  }
}
```

`ConfigType<typeof databaseConfig>`는 Configuration Factory의 반환 타입을 기반으로 설정 객체의 타입을 추론합니다.

이 방식은 문자열 기반 Key 조회를 줄이고 타입 안정성을 높이는 데 도움이 됩니다.

---

## 10. Configuration Validation

운영 환경에서는 필수 환경 변수가 누락되거나 잘못된 형식으로 입력되면 애플리케이션이 정상적으로 동작하지 않을 수 있습니다.

따라서 애플리케이션 시작 시점에 설정값을 검증하는 것이 중요합니다.

### 10.1. Validation의 필요성

다음과 같은 설정이 있다고 가정합니다.

```dotenv
PORT=invalid
DATABASE_PORT=hello
DATABASE_HOST=
```

환경 변수 자체는 존재하더라도 유효한 값이라고 보장할 수 없습니다.

```typescript
Number('invalid'); // NaN
```

이러한 값이 실제 서버나 데이터베이스 연결 단계에 전달되기 전에 검증하도록 구성해야 합니다.

### 10.2. Standard Schema 기반 Validation

최신 NestJS의 `@nestjs/config`는 Standard Schema를 구현하는 라이브러리를 통한 설정 검증을 지원합니다.

예를 들어 Zod를 사용할 수 있습니다.

설치:

```bash
npm install zod
```

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DATABASE_HOST: z.string().min(1),

  DATABASE_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3306),

  DATABASE_USER: z.string().min(1),

  DATABASE_PASSWORD: z.string().min(1),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: environmentSchema,
    }),
  ],
})
export class AppModule {}
```

위 예제는 Standard Schema 기반 `validationSchema`를 지원하는 최신 `@nestjs/config`를 전제로 합니다.

기존 NestJS v11 계열 등에서는 Joi 기반 검증이나 사용자 정의 `validate` 함수를 사용할 수 있습니다. 따라서 해당 프로젝트에 설치된 `@nestjs/config` 버전을 확인해야 합니다.

### 10.3. 검증 실패 시 동작

필수 환경 변수가 없거나 설정값이 유효하지 않으면 애플리케이션 초기화 과정에서 예외가 발생합니다.

이러한 방식을 Fail Fast라고 합니다.

```text
Application Startup
        |
        v
Load Configuration
        |
        v
Validate Configuration
        |
        v
  Is Configuration Valid?
       / \
      /   \
    Yes    No
     |      |
     v      v
Bootstrap  Startup Failure
```

잘못된 설정 상태에서 애플리케이션이 계속 실행되는 것보다 시작 단계에서 오류를 확인할 수 있다는 장점이 있습니다.

### 10.4. Custom Validation Function

직접 작성한 Validation Function을 사용할 수도 있습니다.

다음 예제는 `PORT` 환경 변수를 검증합니다.

```typescript
type Environment = Record<string, unknown>;

function validate(config: Environment) {
  const port = Number(config.PORT ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  return {
    ...config,
    PORT: port,
  };
}
```

`ConfigModule`에 등록합니다.

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  validate,
});
```

`validate` 함수는 환경 변수 객체를 입력받아 검증된 설정 객체를 반환합니다.

검증에 실패하면 예외를 발생시킬 수 있습니다.

이 방식은 외부 라이브러리 대신 직접 검증 로직을 정의하거나 복잡한 변환이 필요한 경우 활용할 수 있습니다.

---

## 11. Type-safe Configuration

TypeScript를 사용하더라도 `process.env`로 읽는 환경 변수 값은 자동으로 타입이 검증되지 않습니다.

또한 `ConfigService.get<T>()`의 Generic Type만으로 실제 설정값이 해당 타입을 만족한다고 보장할 수 없습니다.

### 11.1. Generic Type 활용

```typescript
interface EnvironmentVariables {
  PORT: number;
  DATABASE_HOST: string;
}

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  getPort() {
    return this.configService.get('PORT', { infer: true });
  }
}
```

`infer: true`를 사용하면 선언된 Interface를 기반으로 타입 추론을 수행합니다.

하지만 이 기능은 TypeScript의 정적 타입 검사에 해당합니다.

실제 환경 변수 값의 타입 변환과 유효성 검증은 별도로 수행해야 합니다.

### 11.2. getOrThrow()와 타입 안정성

필수 설정값에는 `getOrThrow()`를 사용할 수 있습니다.

```typescript
const host = this.configService.getOrThrow<string>(
  'DATABASE_HOST',
);
```

이는 `undefined` 가능성을 제거하는 데 도움이 되지만 문자열의 형식까지 검증하는 것은 아닙니다.

실제 타입 안정성을 확보하려면 다음 요소를 함께 적용하는 것이 좋습니다.

1. 환경 변수 검증
2. 타입 변환
3. TypeScript 타입 선언
4. 필수 설정값의 존재 여부 확인

### 11.3. ConfigType 활용

Namespaced Configuration에서는 `ConfigType`을 이용하여 Configuration Factory의 반환 타입을 추론할 수 있습니다.

```typescript
import { ConfigType } from '@nestjs/config';
import databaseConfig from './database.config';

type DatabaseConfig = ConfigType<typeof databaseConfig>;
```

이를 통해 설정 객체의 프로퍼티 이름이 변경되었을 때 TypeScript 컴파일 과정에서 관련 오류를 확인할 수 있습니다.

---

## 12. 비동기 모듈 설정

NestJS에서는 데이터베이스, Cache, HTTP Client 등 여러 모듈을 등록할 때 환경 설정을 사용할 수 있습니다.

모듈이 등록되는 시점에 `ConfigService`를 주입받아야 한다면 `registerAsync()` 또는 `forRootAsync()`와 같은 비동기 등록 API를 활용할 수 있습니다.

실제 지원하는 메서드 이름은 각 모듈에 따라 다릅니다.

### 12.1. TypeORM 예제

다음 예제는 `@nestjs/typeorm`과 `typeorm`, MySQL Driver가 설치되어 있다고 가정합니다.

```bash
npm install @nestjs/typeorm typeorm mysql2
```

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',

        host: configService.getOrThrow<string>('DATABASE_HOST'),

        port: Number(
          configService.getOrThrow<string>('DATABASE_PORT'),
        ),

        username: configService.getOrThrow<string>('DATABASE_USER'),

        password: configService.getOrThrow<string>('DATABASE_PASSWORD'),

        database: configService.getOrThrow<string>('DATABASE_NAME'),

        autoLoadEntities: true,

        synchronize: false,
      }),
    }),
  ],
})
export class AppModule {}
```

이 예제의 `Number()` 변환은 입력값이 유효한 숫자라고 보장하지 않습니다.

실제 프로젝트에서는 앞서 설명한 Validation Schema를 함께 사용해야 합니다.

또한 `synchronize: false`는 운영 환경에서 Schema 변경을 자동으로 반영하지 않도록 하기 위한 설정입니다.

Database Schema 변경은 Migration을 통해 관리하는 것이 일반적으로 적합합니다.

### 12.2. 비동기 설정의 동작 원리

```text
ConfigModule
      |
      v
ConfigService
      |
      v
TypeOrmModule.forRootAsync()
      |
      v
Configuration Factory
      |
      v
TypeORM Connection Options
      |
      v
Database Initialization
```

`useFactory`를 사용하면 NestJS의 DI Container를 통해 필요한 Provider를 주입받아 모듈 설정을 생성할 수 있습니다.

다만 비동기 등록 API를 사용한다고 해서 Factory Function이 반드시 비동기 함수여야 하는 것은 아닙니다.

필요한 경우 `async` 함수를 사용하여 비동기 작업을 수행할 수 있습니다.

---

## 13. main.ts에서 환경 설정 사용

애플리케이션의 서버 포트, CORS 등의 설정은 Bootstrap 단계에서 필요할 수 있습니다.

이 경우 Nest Application에서 `ConfigService`를 조회할 수 있습니다.

```typescript
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.getOrThrow<number>('PORT');

  await app.listen(port);
}

bootstrap();
```

위 예제는 `PORT`가 사전에 숫자 타입으로 변환되고 검증되었다는 전제하에 사용할 수 있습니다.

이는 Validation Schema 또는 Custom Validation Function을 통해 구현할 수 있습니다.

검증 없이 일반적인 문자열 환경 변수를 사용하는 경우에는 명시적인 변환이 필요합니다.

---

## 14. Docker 환경에서의 Configuration

Docker 환경에서는 컨테이너 이미지와 실행 환경 설정을 분리하는 것이 중요합니다.

하나의 컨테이너 이미지를 여러 환경에서 재사용하려면 환경 변수를 컨테이너 실행 시점에 주입할 수 있습니다.

### 14.1. docker run

```bash
docker run \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e DATABASE_HOST=db.example.internal \
  -e DATABASE_PORT=3306 \
  nestjs-app:latest
```

Docker의 `-e` 옵션은 컨테이너 내부 프로세스에 환경 변수를 전달합니다.

### 14.2. --env-file

환경 변수 파일을 Docker 실행 시점에 전달할 수도 있습니다.

```bash
docker run \
  --env-file .env.production \
  -p 8080:8080 \
  nestjs-app:latest
```

Docker의 `--env-file`은 지정된 파일에 정의된 환경 변수를 컨테이너에 전달합니다.

이는 NestJS의 `ConfigModule`이 컨테이너 내부에서 `.env` 파일을 읽는 방식과 구분해야 합니다.

운영 환경에서는 컨테이너 이미지에 `.env.production`을 포함하기보다 실행 환경에서 설정을 주입하는 방식을 권장합니다.

또한 인증 정보가 포함된 환경 변수 파일은 파일 권한과 저장 위치를 적절히 관리해야 합니다.

### 14.3. Docker Compose

```yaml
services:
  api:
    image: nestjs-app:latest

    ports:
      - "8080:8080"

    environment:
      NODE_ENV: production
      PORT: "8080"
      DATABASE_HOST: database
      DATABASE_PORT: "3306"

    depends_on:
      - database

  database:
    image: mysql:8.4

    environment:
      MYSQL_DATABASE: app
      MYSQL_USER: app_user
      MYSQL_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:?DB_ROOT_PASSWORD is required}
```

위 예제에서는 MySQL 비밀번호를 Compose 실행 환경에서 제공한다고 가정합니다.

실제 서비스를 구성할 때는 데이터 영속성, 네트워크, Health Check 및 Secret 관리 등을 추가해야 합니다.

또한 `depends_on`의 기본 동작은 컨테이너 시작 순서를 관리하지만 Database가 요청을 처리할 준비가 되었는지까지 보장하지는 않습니다.

---

## 15. Kubernetes 환경에서의 Configuration

Kubernetes에서는 애플리케이션 설정을 ConfigMap과 Secret 등의 리소스를 통해 관리할 수 있습니다.

### 15.1. ConfigMap

ConfigMap은 일반적인 비민감 설정 데이터를 저장하기 위한 Kubernetes 리소스입니다.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nestjs-config
data:
  NODE_ENV: "production"
  PORT: "8080"
  DATABASE_HOST: "database.default.svc.cluster.local"
  DATABASE_PORT: "3306"
```

ConfigMap은 데이터베이스 주소, 서버 포트, Feature Flag 등 민감하지 않은 설정 정보를 관리하는 데 활용할 수 있습니다.

### 15.2. Secret

Secret은 Password, API Key 등 민감한 데이터를 관리하기 위한 Kubernetes 리소스입니다.

다음은 Secret의 구조를 설명하기 위한 예시입니다.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: nestjs-secret
type: Opaque
stringData:
  DATABASE_USER: "app_user"
  DATABASE_PASSWORD: "example-only-password"
```

`stringData`를 사용하면 문자열 값을 입력할 수 있으며 Kubernetes가 이를 Secret 데이터로 처리합니다.

실제 인증 정보는 Git Repository에 포함하지 않아야 합니다.

또한 Kubernetes Secret은 기본적으로 암호화된 안전한 저장소를 보장하는 기능이 아닙니다.

Secret을 안전하게 사용하려면 Encryption at Rest, RBAC, 외부 Secret 관리 시스템 및 접근 통제를 함께 고려해야 합니다.

### 15.3. Deployment에 환경 변수 주입

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestjs-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nestjs-api
  template:
    metadata:
      labels:
        app: nestjs-api
    spec:
      containers:
        - name: nestjs-api
          image: nestjs-app:1.0.0

          ports:
            - containerPort: 8080

          envFrom:
            - configMapRef:
                name: nestjs-config

            - secretRef:
                name: nestjs-secret
```

`envFrom`은 ConfigMap 또는 Secret에 정의된 Key-Value 데이터를 컨테이너의 환경 변수로 주입합니다.

NestJS 애플리케이션은 전달된 환경 변수를 `process.env` 또는 `ConfigService`로 읽을 수 있습니다.

### 15.4. ConfigMap과 Secret 비교

| 항목 | ConfigMap | Secret |
|---|---|---|
| 목적 | 일반 설정 관리 | 민감 정보 관리 |
| 주요 데이터 | 포트, 호스트, 기능 설정 | Password, Token, API Key |
| 환경 변수 주입 | 지원 | 지원 |
| Volume Mount | 지원 | 지원 |
| 접근 제어 | RBAC 활용 | RBAC 및 추가 보안 정책 권장 |
| 기본 보안 특성 | 비민감 정보용 | 민감 정보용 API 객체 |

ConfigMap과 Secret을 환경 변수로 주입한 경우, 원본 리소스의 값이 변경되더라도 실행 중인 컨테이너의 환경 변수 값이 자동으로 갱신되지는 않습니다.

새로운 값을 적용하려면 일반적으로 Pod를 다시 생성해야 합니다.

반면 Volume으로 마운트한 ConfigMap 또는 Secret은 일부 조건에서 파일 내용이 갱신될 수 있습니다.

다만 NestJS 애플리케이션이 변경된 설정을 자동으로 다시 읽는 것은 별개의 문제입니다.

---

## 16. Secret Management

Secret Management는 데이터베이스 인증 정보, API Key, JWT Signing Key 등 민감한 설정값을 안전하게 보관하고 전달하는 방법입니다.

### 16.1. Secret의 예시

대표적인 Secret은 다음과 같습니다.

- Database Password
- JWT Signing Key
- External API Key
- OAuth Client Secret
- TLS Private Key
- Message Broker Credentials

Secret을 소스 코드에 직접 작성하거나 Git Repository에 저장하는 것은 피해야 합니다.

### 16.2. .gitignore

로컬 개발 환경에서 사용하는 환경 변수 파일은 Git 추적에서 제외하는 것이 좋습니다.

```gitignore
.env
.env.*
!.env.example
```

위 설정은 `.env.example`을 제외한 `.env` 계열 파일을 Git 추적 대상에서 제외하는 예시입니다.

다만 `.gitignore`는 이미 Git에 등록된 파일을 자동으로 제거하지 않습니다.

민감한 정보가 이미 Commit된 경우에는 해당 Secret을 폐기하거나 교체하는 등의 추가 조치가 필요합니다.

### 16.3. .env.example

실제 인증 정보 대신 필요한 환경 변수의 이름과 예시 값을 문서화할 수 있습니다.

```dotenv
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=app

DATABASE_USER=
DATABASE_PASSWORD=
```

`.env.example`은 다른 개발자가 프로젝트를 실행하기 위해 어떤 환경 변수를 설정해야 하는지 파악하는 데 도움이 됩니다.

### 16.4. 외부 Secret Manager

운영 환경에서는 다음과 같은 Secret 관리 시스템을 사용할 수 있습니다.

- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- HashiCorp Vault
- Google Cloud Secret Manager
- Azure Key Vault
- Kubernetes Secret

이러한 시스템은 Secret 저장, 접근 통제, 감사 및 Rotation을 관리하는 데 활용할 수 있습니다.

단, NestJS가 이러한 시스템을 자동으로 지원하는 것은 아닙니다.

각 서비스의 SDK, Kubernetes 연동 기능 또는 별도의 Integration을 구성해야 합니다.

---

## 17. Configuration의 운영 시 고려사항

### 17.1. Fail Fast

필수 환경 변수가 누락되면 애플리케이션을 실행하지 않는 정책을 적용하는 것이 좋습니다.

예를 들어 Database 연결 정보나 JWT Signing Key가 없는 상태에서 애플리케이션이 시작되지 않도록 설정할 수 있습니다.

이를 통해 잘못된 설정이 실제 요청 처리 과정까지 전달되는 것을 방지할 수 있습니다.

### 17.2. Runtime Configuration

운영 환경에서는 설정값을 Build 시점보다 Runtime에 주입하는 방식이 유용합니다.

```text
Source Code
     |
     v
Production Build
     |
     v
Container Image
     |
     +-------------------+
     |                   |
     v                   v
  Staging            Production
     |                   |
     v                   v
Staging Config     Production Config
     |                   |
     v                   v
Application        Application
```

동일한 컨테이너 이미지를 환경마다 재사용하면서 필요한 설정만 변경할 수 있습니다.

이는 Build Once, Deploy Many 전략에 적합합니다.

### 17.3. Configuration의 변경 시점

`ConfigModule`의 설정값은 일반적으로 애플리케이션 초기화 시점에 로딩됩니다.

실행 중 외부 환경 변수나 `.env` 파일을 수정했다고 해서 이미 생성된 모든 Configuration 객체가 자동으로 갱신되는 것은 아닙니다.

동적으로 변경되는 설정이 필요하다면 별도의 Configuration Store, 갱신 로직 또는 애플리케이션 재시작 전략을 고려해야 합니다.

### 17.4. Secret Logging 방지

환경 변수의 존재 여부를 확인하기 위해 모든 설정값을 로그에 출력하는 방식은 피해야 합니다.

특히 다음과 같은 정보는 로그에 노출하지 않아야 합니다.

- Password
- Access Token
- API Key
- Private Key
- Connection String에 포함된 Credentials

필요한 경우 민감한 부분을 Masking하여 기록해야 합니다.

### 17.5. 최소 권한

운영 환경에서 사용하는 인증 정보는 해당 애플리케이션에 필요한 최소 권한만 부여해야 합니다.

예를 들어 데이터 조회만 수행하는 서비스에 불필요한 Database 관리자 권한을 부여하지 않는 것이 좋습니다.

또한 서비스마다 동일한 Secret을 공유하기보다 책임과 접근 범위를 분리할 수 있습니다.

---

## 18. Configuration 관련 주요 문제

### 18.1. 환경 변수가 undefined로 조회되는 문제

```typescript
const host = process.env.DATABASE_HOST;
```

`undefined`가 반환되는 경우 다음 사항을 확인합니다.

- 환경 변수가 실제로 정의되어 있는지 확인합니다.
- `.env` 파일 경로가 올바른지 확인합니다.
- `ConfigModule.forRoot()`가 등록되어 있는지 확인합니다.
- 환경 변수를 읽는 시점이 적절한지 확인합니다.
- Docker 또는 Kubernetes에서 환경 변수가 전달되었는지 확인합니다.

특히 모듈 파일의 최상위 코드에서 `process.env`를 참조하는 경우에는 `ConfigModule`이 `.env` 파일을 로딩하기 전에 해당 코드가 실행될 수 있습니다.

이러한 상황에서는 Configuration Factory나 DI 기반 설정 접근 방식을 고려해야 합니다.

### 18.2. 문자열 타입 문제

```dotenv
PORT=3000
```

```typescript
const port = process.env.PORT;
```

위 변수는 일반적으로 문자열입니다.

따라서 숫자가 필요한 API에서는 타입 변환이 필요합니다.

```typescript
const port = Number(process.env.PORT);
```

단, `Number()` 결과가 `NaN`이 될 수 있으므로 Validation을 함께 적용하는 것이 좋습니다.

### 18.3. 환경 파일이 적용되지 않는 문제

환경 파일을 여러 개 사용하는 경우 `envFilePath`의 순서와 외부 환경 변수의 우선순위를 확인해야 합니다.

또한 `ignoreEnvFile: true`가 설정되어 있다면 `ConfigModule`은 자체적인 `.env` 파일 로딩을 수행하지 않습니다.

### 18.4. Docker 이미지에서 설정이 누락되는 문제

Docker Build 단계에서 `.env` 파일을 복사하지 않았더라도 Runtime 환경 변수를 주입하면 애플리케이션을 실행할 수 있습니다.

오히려 운영 설정을 이미지와 분리하는 것이 일반적으로 적합합니다.

다음 사항을 확인합니다.

- `docker run -e` 설정
- Docker Compose `environment`
- Docker Compose `env_file`
- Kubernetes `env`
- Kubernetes `envFrom`

### 18.5. Kubernetes 설정 변경 후 반영되지 않는 문제

ConfigMap이나 Secret을 환경 변수로 주입한 경우에는 원본 리소스가 변경되더라도 기존 Pod의 환경 변수가 자동으로 갱신되지 않습니다.

일반적으로 Deployment Rollout을 통해 Pod를 교체할 수 있습니다.

```bash
kubectl rollout restart deployment/nestjs-api
```

실제 운영 환경에서는 배포 전략과 서비스 가용성을 고려하여 실행해야 합니다.

---

## 19. Environment Configuration 권장 사항

NestJS 애플리케이션의 환경 설정은 다음과 같은 기준으로 구성하는 것이 좋습니다.

| 항목 | 권장 사항 |
|---|---|
| 환경 변수 접근 | `ConfigService` 활용 |
| 모듈 설정 | `ConfigModule` 사용 |
| 환경별 구성 | Runtime Configuration 중심 |
| 필수 설정 | 시작 시점에 검증 |
| 타입 변환 | Validation 단계에서 명시적 처리 |
| 설정 구조 | Custom Configuration 또는 Namespace 활용 |
| 비동기 모듈 | `forRootAsync()` 등 활용 |
| 민감 정보 | Secret Manager 또는 안전한 Secret 주입 |
| Git 관리 | `.env.example`만 공개 |
| Docker | 이미지와 환경 설정 분리 |
| Kubernetes | ConfigMap 및 Secret 활용 |
| 설정 변경 | 재시작 또는 명시적인 갱신 전략 |
| Logging | Secret 및 인증 정보 노출 방지 |

특히 운영 환경에서는 설정값을 올바르게 읽는 것뿐만 아니라 잘못된 설정으로 애플리케이션이 실행되지 않도록 검증하는 것이 중요합니다.

---

## 20. 관련 문서

Environment Configuration과 관련된 상세 주제는 다음 문서에서 다룹니다.

| 문서 | 설명 |
|---|---|
| `../03-techniques/configuration.md` | NestJS Configuration 기능의 기본 개념과 사용 방법 |
| `production-build.md` | 빌드 산출물과 Runtime Configuration의 분리 |
| `health-checks.md` | 설정 및 외부 시스템 의존성을 고려한 상태 확인 |
| `graceful-shutdown.md` | 애플리케이션 종료 및 리소스 정리 |
| `performance.md` | 환경 설정을 통한 운영 성능 및 리소스 관리 |

`03-techniques/configuration.md`는 `ConfigModule`, `ConfigService` 및 Configuration API의 기본 사용법을 중심으로 다룹니다.

반면 본 문서는 운영 환경에서 설정을 검증하고, 안전하게 주입하며, 환경별로 관리하는 방법을 중심으로 설명합니다.

---

## 21. 정리

NestJS의 Environment Configuration은 애플리케이션의 실행 환경에 따라 달라지는 설정값을 소스 코드와 분리하여 관리하는 방법입니다.

주요 사항은 다음과 같습니다.

1. **환경 변수 활용**: 실행 환경에 따라 달라지는 설정값을 코드 외부에서 주입합니다.
2. **ConfigModule 사용**: `@nestjs/config`를 이용하여 설정값을 로딩하고 관리합니다.
3. **ConfigService 활용**: Dependency Injection을 통해 설정값에 접근합니다.
4. **환경별 설정 분리**: Development, Test, Staging, Production 환경에 맞는 설정을 구성합니다.
5. **Configuration Validation**: 필수 설정값의 존재 여부와 형식을 애플리케이션 시작 시 검증합니다.
6. **Type-safe Configuration**: TypeScript 타입 선언과 실제 Runtime Validation을 함께 적용합니다.
7. **Custom Configuration**: Namespace와 Factory를 활용하여 설정의 책임을 구분합니다.
8. **Runtime Configuration**: Docker와 Kubernetes 환경에서 배포 시점 또는 실행 시점에 설정을 주입합니다.
9. **Secret Management**: 민감한 인증 정보를 소스 코드 및 배포 이미지와 분리합니다.
10. **설정 변경 관리**: 실행 중 설정값 변경이 자동으로 반영되는지 여부를 이해하고 적절한 갱신 전략을 적용합니다.

Environment Configuration은 단순히 `.env` 파일을 읽는 기능이 아닙니다.

운영 환경에서 필요한 설정을 일관된 방식으로 제공하고, 잘못된 설정을 조기에 발견하며, 민감한 정보를 안전하게 관리하기 위한 애플리케이션 운영 설계의 일부입니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
  - `ConfigModule`, `ConfigService`, 환경 변수 로딩, Custom Configuration 및 설정 검증 방법을 설명합니다.

- [NestJS - Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
  - `forRoot()` 및 동적 모듈 설정 구조를 이해하는 데 참고할 수 있습니다.

- [NestJS - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
  - DI Token, Provider 등록 및 Factory Provider의 개념을 설명합니다.

- [NestJS - Database](https://docs.nestjs.com/techniques/database)
  - TypeORM 등 데이터베이스 모듈의 설정 및 연결 방법을 설명합니다.

- [NestJS - Deployment](https://docs.nestjs.com/deployment)
  - 운영 환경에서 NestJS 애플리케이션을 실행하기 위한 권장 사항을 설명합니다.

- [NestJS - Migration Guide](https://docs.nestjs.com/migration-guide)
  - 프레임워크 및 관련 기능의 버전별 변경 사항을 확인할 수 있습니다.

### Node.js 및 Configuration

- [Node.js - Environment Variables](https://nodejs.org/api/environment_variables.html)
  - Node.js의 환경 변수와 `.env` 파일 지원 방법을 설명합니다.

- [dotenv - GitHub](https://github.com/motdotla/dotenv)
  - `.env` 파일을 로딩하는 dotenv 패키지의 기능과 사용 방법을 설명합니다.

- [Zod - Documentation](https://zod.dev/)
  - TypeScript 기반 Schema Validation 및 타입 변환 방법을 설명합니다.

- [Standard Schema](https://standardschema.dev/)
  - Schema Validation 라이브러리 간의 공통 인터페이스 규격을 설명합니다.

### Docker

- [Docker - Container Environment Variables](https://docs.docker.com/reference/cli/docker/container/run/)
  - Docker 컨테이너 실행 시 환경 변수를 전달하는 방법을 설명합니다.

- [Docker Compose - Environment Variables](https://docs.docker.com/compose/how-tos/environment-variables/)
  - Docker Compose에서 환경 변수와 `.env` 파일을 사용하는 방법을 설명합니다.

- [Docker Compose - env_file](https://docs.docker.com/reference/compose-file/services/#env_file)
  - Compose Service에 환경 변수 파일을 지정하는 방법을 설명합니다.

### Kubernetes

- [Kubernetes - ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
  - ConfigMap을 이용한 애플리케이션 설정 관리 방법을 설명합니다.

- [Kubernetes - Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
  - Secret 리소스의 구조 및 민감 정보 관리 방법을 설명합니다.

- [Kubernetes - Define Environment Variables for a Container](https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/)
  - Pod 내부 컨테이너에 환경 변수를 전달하는 방법을 설명합니다.

- [Kubernetes - Configure a Pod to Use a ConfigMap](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/)
  - ConfigMap을 컨테이너에 주입하는 방법을 설명합니다.

- [Kubernetes - Good Practices for Secrets](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
  - Kubernetes Secret을 안전하게 관리하기 위한 권장 사항을 설명합니다.

### Secret Management

- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
  - AWS 환경에서 Secret을 저장하고 관리하는 방법을 설명합니다.

- [HashiCorp Vault](https://developer.hashicorp.com/vault/docs)
  - Secret 저장, 접근 제어 및 Rotation 기능을 설명합니다.

- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
  - Google Cloud 환경에서 Secret을 관리하는 방법을 설명합니다.