# Configuration

## 1. 개요

Configuration은 애플리케이션의 실행 환경에 따라 달라지는 설정값을 관리하는 기능입니다.

애플리케이션은 개발(Development), 테스트(Test), 운영(Production) 환경에서 서로 다른 데이터베이스 연결 정보, API 주소, 포트 번호 및 인증 정보를 사용해야 하는 경우가 많습니다.

이러한 설정을 소스 코드에 직접 작성하면 환경이 변경될 때마다 코드를 수정해야 하며, 비밀번호나 API Key와 같은 민감한 정보가 소스 코드에 노출될 위험이 있습니다.

NestJS는 `@nestjs/config` 패키지를 제공하여 환경 변수와 애플리케이션 설정을 체계적으로 관리할 수 있도록 지원합니다.

주요 기능은 다음과 같습니다.

- `.env` 파일 및 시스템 환경 변수 로드
- `ConfigModule`을 통한 설정 관리
- `ConfigService`를 통한 설정값 조회
- 환경별 설정 파일 분리
- 설정 네임스페이스 구성
- TypeScript 기반 설정 타입 관리
- 환경 변수 유효성 검증
- 다른 모듈과의 동적 설정 연동

`@nestjs/config`는 내부적으로 `dotenv`를 사용하여 `.env` 파일을 처리합니다.

## 2. Configuration이 필요한 이유

### 2.1. 환경별 설정 분리

동일한 애플리케이션이라도 실행 환경에 따라 서로 다른 설정이 필요합니다.

예를 들어 데이터베이스 연결 정보를 다음과 같이 구분할 수 있습니다.

| 설정 | Development | Production |
|---|---|---|
| `NODE_ENV` | development | production |
| `PORT` | 3000 | 8080 |
| `DATABASE_HOST` | localhost | 운영 DB 주소 |
| `DATABASE_PORT` | 3306 | 3306 |
| `DATABASE_NAME` | app_dev | app_prod |

환경별 설정을 분리하면 소스 코드를 변경하지 않고 실행 환경에 적합한 설정을 적용할 수 있습니다.

### 2.2. 하드코딩 방지

설정값을 소스 코드에 직접 작성하는 방식은 유지보수와 보안 측면에서 문제가 발생할 수 있습니다.

```typescript
@Injectable()
export class DatabaseService {
  private readonly host = 'localhost';
  private readonly password = 'password123';
}
```

이러한 방식은 환경 변경에 유연하게 대응하기 어렵고, 민감한 정보가 Git 저장소에 포함될 위험이 있습니다.

환경 변수를 사용하면 설정값을 소스 코드와 분리할 수 있습니다.

```env
DATABASE_HOST=localhost
DATABASE_PASSWORD=example-password
```

실제 비밀번호가 포함된 `.env` 파일은 버전 관리 대상에서 제외해야 합니다.

### 2.3. 설정 관리의 일관성 확보

NestJS에서는 `ConfigService`를 사용하여 설정값을 조회할 수 있습니다.

이를 통해 각 서비스가 개별적으로 환경 변수 파일을 읽거나 자체적인 설정 관리 로직을 구현하지 않아도 됩니다.

또한 NestJS의 Dependency Injection과 결합하여 설정값을 필요한 클래스에 주입할 수 있습니다.

## 3. ConfigModule과 ConfigService

NestJS의 Configuration 기능은 주로 다음 두 구성 요소를 사용합니다.

| 구성 요소 | 역할 |
|---|---|
| `ConfigModule` | 환경 변수 및 설정 파일을 로드하고 설정 Provider를 등록합니다. |
| `ConfigService` | 로드된 설정값을 조회하는 서비스를 제공합니다. |

### 3.1. ConfigModule

`ConfigModule`은 애플리케이션의 설정 관리 기능을 등록하는 모듈입니다.

일반적으로 루트 모듈인 `AppModule`에서 `ConfigModule.forRoot()`를 호출하여 초기화합니다.

### 3.2. ConfigService

`ConfigService`는 설정값을 조회하는 서비스입니다.

다른 Provider에서 생성자 주입(Constructor Injection)을 통해 사용할 수 있습니다.

```typescript
constructor(
  private readonly configService: ConfigService,
) {}
```

NestJS의 DI Container는 등록된 `ConfigService` Provider를 해당 클래스에 주입합니다.

이러한 구조는 설정값에 대한 접근 방식을 통일하고 테스트에서 설정 Provider를 대체하기 쉽게 만듭니다.

## 4. ConfigModule 설치 및 기본 설정

### 4.1. 패키지 설치

다음 명령어로 `@nestjs/config`를 설치합니다.

```bash
npm install @nestjs/config
```

### 4.2. 환경 변수 파일 생성

프로젝트 루트 디렉터리에 `.env` 파일을 생성합니다.

```text
project/
├── src/
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── .env
├── package.json
└── tsconfig.json
```

`.env` 파일은 다음과 같이 작성할 수 있습니다.

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=example-password
DATABASE_NAME=app_dev
```

`.env` 파일은 일반적으로 `KEY=VALUE` 형식으로 작성합니다.

환경 변수는 기본적으로 문자열로 처리됩니다.

따라서 `PORT=3000`과 같이 숫자 형태로 작성하더라도 JavaScript에서 읽을 때는 문자열로 취급됩니다.

### 4.3. ConfigModule 등록

`app.module.ts`

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

`ConfigModule.forRoot()`는 기본적으로 현재 작업 디렉터리의 `.env` 파일을 읽습니다.

환경 변수와 설정값을 병합한 후 `ConfigService`를 통해 접근할 수 있도록 구성합니다.

### 4.4. 전역 모듈 등록

기본적으로 다른 모듈에서 `ConfigService`를 사용하려면 해당 모듈에서 `ConfigModule`을 import해야 합니다.

여러 모듈에서 공통으로 설정을 사용하는 경우 `isGlobal` 옵션을 사용할 수 있습니다.

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

`isGlobal: true`를 설정하면 다른 모듈에서 `ConfigModule`을 반복해서 import하지 않고도 `ConfigService`를 주입받을 수 있습니다.

다만 전역 모듈로 등록하더라도 `ConfigService`를 사용하려면 일반적인 Dependency Injection 절차는 필요합니다.

## 5. ConfigService를 이용한 설정값 조회

### 5.1. 기본 사용법

다음은 `ConfigService`를 사용하여 환경 변수를 조회하는 예제입니다.

`app.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  getEnvironment(): string {
    return this.configService.get<string>(
      'NODE_ENV',
      'development',
    );
  }
}
```

`ConfigService.get()`은 지정한 키에 해당하는 설정값을 반환합니다.

```typescript
this.configService.get<string>('NODE_ENV');
```

제네릭 타입을 지정하면 TypeScript에서 반환값의 타입을 표현할 수 있습니다.

다만 제네릭 타입 선언만으로 실제 환경 변수의 타입이 변환되지는 않습니다.

### 5.2. 기본값 지정

환경 변수가 정의되지 않았을 때 사용할 기본값을 지정할 수 있습니다.

```typescript
const host = this.configService.get<string>(
  'DATABASE_HOST',
  'localhost',
);
```

`DATABASE_HOST`가 정의되어 있지 않으면 `localhost`를 반환합니다.

기본값은 선택적인 설정이나 개발 환경의 기본 설정에 유용합니다.

반면 데이터베이스 비밀번호처럼 반드시 필요한 설정은 기본값을 제공하기보다 애플리케이션 시작 시 검증하는 것이 적절합니다.

### 5.3. getOrThrow()

`getOrThrow()`는 설정값이 존재하지 않으면 예외를 발생시키는 메서드입니다.

```typescript
const databaseHost =
  this.configService.getOrThrow<string>(
    'DATABASE_HOST',
  );
```

필수 설정값이 누락되었을 때 명시적으로 오류를 발생시킬 수 있습니다.

다만 `getOrThrow()`는 설정값의 존재 여부를 확인하는 용도이며, 데이터 타입이나 값의 범위를 자동으로 검증하지는 않습니다.

### 5.4. 숫자형 설정값 처리

환경 변수는 일반적으로 문자열로 제공되므로 숫자 변환이 필요한 경우 명시적으로 처리해야 합니다.

```typescript
const port = Number(
  this.configService.get<string>('PORT', '3000'),
);
```

단순히 다음과 같이 작성한다고 해서 문자열이 숫자로 변환되는 것은 아닙니다.

```typescript
const port = this.configService.get<number>('PORT');
```

제네릭 타입은 TypeScript의 정적 타입 검사에 사용되며 런타임 변환을 보장하지 않습니다.

따라서 숫자, Boolean 등 문자열이 아닌 값은 별도의 변환 또는 설정 검증을 적용하는 것이 좋습니다.

## 6. 환경별 Configuration 관리

### 6.1. 환경별 파일 구성

환경별로 별도의 설정 파일을 사용할 수 있습니다.

```text
project/
├── src/
├── .env
├── .env.development
├── .env.test
├── .env.production
└── package.json
```

예를 들어 개발 환경 파일은 다음과 같이 구성합니다.

`.env.development`

```env
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost
DATABASE_NAME=app_dev
```

운영 환경 파일은 다음과 같이 구성할 수 있습니다.

`.env.production`

```env
NODE_ENV=production
PORT=8080
DATABASE_HOST=production-db
DATABASE_NAME=app_prod
```

운영 환경의 실제 인증 정보는 파일에 고정하여 저장하기보다 배포 플랫폼의 Secret 관리 기능 등을 이용하여 주입하는 것이 좋습니다.

### 6.2. envFilePath

`envFilePath` 옵션을 사용하면 로드할 환경 변수 파일을 지정할 수 있습니다.

```typescript
ConfigModule.forRoot({
  envFilePath: '.env.development',
});
```

실행 환경에 따라 다른 파일을 로드하도록 구성할 수도 있습니다.

```typescript
ConfigModule.forRoot({
  envFilePath:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});
```

이 예제에서 `NODE_ENV`는 애플리케이션 시작 전에 설정되어 있어야 합니다.

파일을 선택하는 시점에는 `ConfigModule`이 아직 초기화되지 않았기 때문입니다.

### 6.3. 여러 환경 변수 파일 로드

여러 `.env` 파일을 지정할 수도 있습니다.

```typescript
ConfigModule.forRoot({
  envFilePath: [
    '.env.development.local',
    '.env.development',
    '.env',
  ],
});
```

동일한 변수가 여러 파일에 존재하면 배열에서 먼저 지정된 파일의 값이 우선합니다.

단, 기본 설정에서는 실행 환경의 `process.env`에 이미 존재하는 변수가 `.env` 파일보다 높은 우선순위를 갖습니다.

이 동작은 `override` 옵션으로 변경할 수 있지만, 운영 환경에서는 외부에서 주입한 환경 변수가 우선하도록 유지하는 것이 일반적으로 적절합니다.

### 6.4. ignoreEnvFile

`.env` 파일을 사용하지 않고 실행 환경에서 전달된 환경 변수만 사용하려면 `ignoreEnvFile`을 설정합니다.

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  ignoreEnvFile: true,
});
```

이 방식은 Kubernetes, Docker 및 클라우드 플랫폼에서 환경 변수를 외부에서 주입하는 경우에 유용합니다.

## 7. Custom Configuration

프로젝트 규모가 커지면 환경 변수를 개별 문자열 키로 관리하는 방식이 복잡해질 수 있습니다.

NestJS에서는 설정을 객체 형태로 구조화하는 Custom Configuration 기능을 제공합니다.

### 7.1. 설정 파일 작성

`src/config/configuration.ts`

```typescript
export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    environment:
      process.env.NODE_ENV ?? 'development',
  },

  database: {
    host:
      process.env.DATABASE_HOST ?? 'localhost',
    port: Number(
      process.env.DATABASE_PORT ?? 3306,
    ),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
  },
});
```

각 설정값을 애플리케이션 및 데이터베이스 영역으로 구분합니다.

### 7.2. 설정 파일 등록

`app.module.ts`

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

`load` 옵션은 사용자 정의 설정 Factory를 등록하는 데 사용합니다.

### 7.3. 설정값 조회

```typescript
@Injectable()
export class DatabaseService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  getDatabaseHost(): string | undefined {
    return this.configService.get<string>(
      'database.host',
    );
  }
}
```

중첩된 객체의 설정값은 `database.host`와 같이 Dot Notation을 사용하여 조회할 수 있습니다.

## 8. Configuration Namespaces

설정 네임스페이스는 애플리케이션의 설정을 기능별로 분리하는 방법입니다.

NestJS에서는 `registerAs()` 함수를 사용하여 설정 네임스페이스를 정의할 수 있습니다.

### 8.1. 설정 파일 분리

다음과 같이 기능별 설정 파일을 구성할 수 있습니다.

```text
src/
├── config/
│   ├── app.config.ts
│   └── database.config.ts
├── app.module.ts
└── main.ts
```

`config/app.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: Number(process.env.PORT ?? 3000),
  environment:
    process.env.NODE_ENV ?? 'development',
}));
```

`config/database.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host:
    process.env.DATABASE_HOST ?? 'localhost',
  port: Number(
    process.env.DATABASE_PORT ?? 3306,
  ),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
}));
```

`registerAs()`의 첫 번째 인자는 설정 네임스페이스의 이름입니다.

두 번째 인자는 설정 객체를 생성하는 Factory 함수입니다.

### 8.2. ConfigModule 등록

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
      ],
    }),
  ],
})
export class AppModule {}
```

### 8.3. 네임스페이스 설정 조회

```typescript
const host = this.configService.get<string>(
  'database.host',
);
```

네임스페이스를 사용하면 서로 다른 기능에서 동일한 설정 속성 이름을 사용하더라도 충돌을 방지할 수 있습니다.

예를 들어 `app.port`와 `database.port`를 구분하여 관리할 수 있습니다.

## 9. Type-safe Configuration

TypeScript에서는 설정값에 대한 타입 정보를 제공하여 잘못된 설정 접근을 줄일 수 있습니다.

### 9.1. ConfigType 사용

NestJS는 `ConfigType` 유틸리티 타입을 제공합니다.

앞서 정의한 `database.config.ts`를 활용하면 다음과 같이 작성할 수 있습니다.

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import databaseConfig from './config/database.config';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject(databaseConfig.KEY)
    private readonly databaseConfiguration:
      ConfigType<typeof databaseConfig>,
  ) {}

  getHost(): string {
    return this.databaseConfiguration.host;
  }

  getPort(): number {
    return this.databaseConfiguration.port;
  }
}
```

`ConfigType<typeof databaseConfig>`는 설정 Factory의 반환 타입을 기반으로 설정 객체의 타입을 추론합니다.

이 방식은 문자열 기반으로 설정 키를 조회하는 방식보다 타입 안정성을 높일 수 있습니다.

다만 반환 타입을 추론하는 기능이므로 환경 변수의 실제 값이 올바른지 검증하는 기능은 아닙니다.

### 9.2. 설정 Provider 직접 주입

`registerAs()`가 반환하는 설정 객체에는 `KEY` 속성이 제공됩니다.

```typescript
@Inject(databaseConfig.KEY)
```

이 값을 Injection Token으로 사용하여 특정 설정 네임스페이스를 직접 주입할 수 있습니다.

관련 설정이 `ConfigModule.forRoot({ load: [...] })` 또는 `ConfigModule.forFeature()`를 통해 등록되어 있어야 합니다.

## 10. Partial Registration

`ConfigModule.forFeature()`는 특정 Feature Module에서 필요한 설정을 부분적으로 등록하는 기능입니다.

애플리케이션의 모든 설정을 루트 모듈에서 관리하지 않고 기능별 모듈에서 관리할 때 유용합니다.

예를 들어 다음과 같이 작성할 수 있습니다.

`database.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import databaseConfig from './config/database.config';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
```

`forFeature()`는 해당 모듈에서 필요한 설정 네임스페이스를 등록합니다.

전역적으로 설정 관리 기능을 구성하는 `forRoot()`와 달리, 기능별 설정 등록을 위한 메서드입니다.

다만 Partial Registration은 모듈 초기화 과정에서 처리되므로 다른 모듈의 생성자에서 해당 설정에 접근할 때 초기화 순서에 주의해야 합니다.

필요한 경우 `onModuleInit()` 생명주기 Hook을 사용하여 관련 모듈의 초기화 이후 설정에 접근할 수 있습니다.

## 11. 환경 변수 유효성 검증

환경 변수는 외부에서 전달되는 설정값이므로 필수 항목이 누락되거나 잘못된 형식으로 제공될 수 있습니다.

예를 들어 다음과 같은 문제가 발생할 수 있습니다.

- 필수 데이터베이스 주소가 누락된 경우
- 포트 번호가 숫자가 아닌 문자열인 경우
- 허용되지 않은 실행 환경이 지정된 경우
- 필수 인증 정보가 비어 있는 경우

이러한 문제를 방지하기 위해 애플리케이션 시작 시 설정값을 검증하는 것이 좋습니다.

### 11.1. Zod를 사용한 검증

최근 NestJS의 Configuration 기능은 Standard Schema를 지원하며, 공식 문서에서는 신규 프로젝트에 Zod와 같은 스키마 검증 라이브러리를 권장합니다.

먼저 Zod를 설치합니다.

```bash
npm install zod
```

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      validationSchema: z.object({
        NODE_ENV: z
          .enum([
            'development',
            'test',
            'production',
          ])
          .default('development'),

        PORT: z.coerce
          .number()
          .int()
          .min(1)
          .max(65535)
          .default(3000),

        DATABASE_HOST: z.string().min(1),

        DATABASE_PORT: z.coerce
          .number()
          .int()
          .min(1)
          .max(65535)
          .default(3306),
      }),
    }),
  ],
})
export class AppModule {}
```

위 예제에서는 다음 항목을 검증합니다.

| 설정 | 검증 조건 |
|---|---|
| `NODE_ENV` | 허용된 실행 환경 중 하나여야 합니다. |
| `PORT` | 1~65535 범위의 정수여야 합니다. |
| `DATABASE_HOST` | 비어 있지 않은 문자열이어야 합니다. |
| `DATABASE_PORT` | 1~65535 범위의 정수여야 합니다. |

필수 설정이 누락되거나 유효하지 않으면 애플리케이션 초기화 과정에서 오류가 발생합니다.

`z.coerce.number()`는 문자열 형태의 숫자를 숫자 타입으로 변환한 뒤 검증합니다.

**주의:** 이 예제는 Standard Schema 기반 검증을 지원하는 `@nestjs/config` 버전을 전제로 합니다. 이전 버전에서는 지원 방식이 다를 수 있으므로 설치된 패키지 버전을 확인해야 합니다.

### 11.2. Joi를 사용한 검증

Joi를 사용하는 프로젝트에서도 환경 변수 검증을 구성할 수 있습니다.

다만 Standard Schema 기반의 최신 설정 API를 사용하는 경우 해당 규격을 지원하는 Joi 버전이 필요합니다.

공식 문서에서는 Joi v18 이상을 안내합니다.

```bash
npm install joi
```

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid(
            'development',
            'test',
            'production',
          )
          .default('development'),

        PORT: Joi.number()
          .port()
          .default(3000),

        DATABASE_HOST: Joi.string()
          .required(),

        DATABASE_PORT: Joi.number()
          .port()
          .default(3306),
      }),
    }),
  ],
})
export class AppModule {}
```

기존 `@nestjs/config` 버전에서는 Joi 중심의 검증 API를 사용하였으며, 버전에 따라 `validationOptions`의 구조도 다릅니다.

따라서 프로젝트에 설치된 버전에 맞는 공식 문서를 적용해야 합니다.

### 11.3. Custom Validation

설정값에 복잡한 조건이 필요한 경우 `validate` 옵션으로 사용자 정의 검증 함수를 등록할 수 있습니다.

```typescript
ConfigModule.forRoot({
  validate: (config) => {
    const port = Number(config.PORT ?? 3000);

    if (
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error('Invalid PORT');
    }

    return {
      ...config,
      PORT: port,
    };
  },
});
```

`validate` 함수는 설정값을 검증하고 변환된 설정 객체를 반환할 수 있습니다.

유효하지 않은 설정에 대해 예외를 발생시키면 애플리케이션 시작을 중단할 수 있습니다.

설정 Factory 내부에서 별도로 계산하거나 생성한 Custom Configuration 값은 `validationSchema`에 의해 자동으로 모두 검증되는 것은 아니므로, 필요한 검증을 Factory 함수 내부에 구현해야 합니다.

## 12. 외부 모듈과 Configuration 연동

`ConfigService`는 다른 NestJS 모듈의 초기화 옵션을 구성하는 데에도 사용할 수 있습니다.

이를 위해 많은 NestJS 모듈은 `forRootAsync()` 또는 `registerAsync()`와 같은 동적 설정 메서드를 제공합니다.

### 12.1. forRootAsync()

다음은 TypeORM 연결 정보를 `ConfigService`에서 가져오는 예제입니다.

먼저 필요한 패키지를 설치합니다.

```bash
npm install @nestjs/typeorm typeorm mysql2
```

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (
        configService: ConfigService,
      ) => ({
        type: 'mysql',

        host: configService.getOrThrow<string>(
          'DATABASE_HOST',
        ),

        port: Number(
          configService.get<string>(
            'DATABASE_PORT',
            '3306',
          ),
        ),

        username:
          configService.getOrThrow<string>(
            'DATABASE_USER',
          ),

        password:
          configService.getOrThrow<string>(
            'DATABASE_PASSWORD',
          ),

        database:
          configService.getOrThrow<string>(
            'DATABASE_NAME',
          ),

        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
  ],
})
export class AppModule {}
```

`forRootAsync()`는 필요한 Provider를 주입받아 모듈의 초기화 옵션을 생성할 수 있도록 합니다.

위 예제에서는 `ConfigService`를 주입받아 데이터베이스 연결 옵션을 구성합니다.

`useFactory`는 설정 객체를 반환하는 Factory 함수입니다.

`inject`는 Factory 함수에 주입할 Provider를 지정합니다.

데이터베이스 연결과 관련된 자세한 내용은 `database.md`에서 다룹니다.

### 12.2. asProvider()

네임스페이스 설정을 다른 동적 모듈의 옵션으로 전달할 때는 `asProvider()`를 활용할 수 있습니다.

```typescript
TypeOrmModule.forRootAsync(
  databaseConfig.asProvider(),
);
```

이 방식은 `databaseConfig`가 TypeORM 초기화 옵션에 적합한 객체를 반환하도록 정의되어 있어야 합니다.

`asProvider()`는 내부적으로 필요한 설정 모듈의 import, Injection Token 및 Factory 구성을 제공합니다.

이를 통해 반복적인 `inject`, `useFactory` 설정을 줄일 수 있습니다.

## 13. main.ts에서 Configuration 사용

애플리케이션의 포트와 같은 설정은 `main.ts`에서 사용하는 경우가 많습니다.

NestJS 애플리케이션을 생성한 후 DI Container에서 `ConfigService`를 조회할 수 있습니다.

`main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = Number(
    configService.get<string>('PORT', '3000'),
  );

  await app.listen(port);
}

bootstrap();
```

`app.get(ConfigService)`는 NestJS DI Container에 등록된 `ConfigService` 인스턴스를 조회합니다.

이 방식은 애플리케이션 시작 시 필요한 포트, CORS 및 기타 설정을 적용할 때 유용합니다.

## 14. Configuration 주요 옵션

`ConfigModule.forRoot()`에서 자주 사용하는 옵션은 다음과 같습니다.

| 옵션 | 설명 |
|---|---|
| `isGlobal` | ConfigModule을 전역 모듈로 등록합니다. |
| `envFilePath` | 로드할 환경 변수 파일의 경로를 지정합니다. |
| `ignoreEnvFile` | `.env` 파일 로드를 비활성화합니다. |
| `load` | 사용자 정의 설정 Factory를 등록합니다. |
| `validationSchema` | 환경 변수 검증 스키마를 지정합니다. |
| `validationOptions` | 환경 변수 검증 옵션을 지정합니다. |
| `validate` | 사용자 정의 검증 함수를 등록합니다. |
| `cache` | 환경 변수 조회 성능을 위한 캐싱을 활성화합니다. |
| `expandVariables` | 환경 변수 간 참조를 해석하도록 설정합니다. |
| `skipProcessEnv` | ConfigService의 직접적인 `process.env` 조회를 비활성화합니다. |
| `override` | `.env` 파일의 값으로 기존 환경 변수를 덮어쓸지 지정합니다. |

### 14.1. cache

```typescript
ConfigModule.forRoot({
  cache: true,
});
```

`cache` 옵션은 `ConfigService.get()`이 `process.env`에 저장된 환경 변수에 접근할 때 성능을 개선하기 위한 옵션입니다.

애플리케이션의 데이터 캐싱 기능과는 별개의 기능입니다.

### 14.2. expandVariables

환경 변수에서 다른 환경 변수를 참조하도록 설정할 수 있습니다.

`.env`

```env
APP_HOST=localhost
APP_PORT=3000

APP_URL=http://${APP_HOST}:${APP_PORT}
```

```typescript
ConfigModule.forRoot({
  expandVariables: true,
});
```

이 설정을 사용하면 `APP_URL`에서 다른 환경 변수의 값을 참조할 수 있습니다.

### 14.3. 환경 변수 로딩 시점

`ConfigModule`은 NestJS 애플리케이션의 모듈 초기화 과정에서 설정을 로드합니다.

따라서 `ConfigModule`이 초기화되기 전에 환경 변수가 필요한 경우에는 별도의 방법이 필요합니다.

예를 들어 NestJS CLI가 지원하는 환경에서는 다음과 같이 실행할 수 있습니다.

```bash
nest start --env-file .env
```

이 방식은 NestJS 애플리케이션이 시작되기 전에 Node.js 수준에서 환경 변수 파일을 로드할 때 사용합니다.

Node.js 자체의 `--env-file` 기능을 사용하는 방법도 있습니다.

```bash
node --env-file=.env dist/main.js
```

단, 이 경우 빌드 결과물의 실제 진입점 경로와 사용 중인 Node.js 버전에서 해당 옵션을 지원하는지 확인해야 합니다.

## 15. 운영 환경에서의 Configuration

### 15.1. 환경 변수와 Secret 분리

일반 설정과 민감한 인증 정보는 구분하여 관리하는 것이 좋습니다.

일반 설정의 예시는 다음과 같습니다.

```env
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
```

민감한 설정의 예시는 다음과 같습니다.

```env
DATABASE_PASSWORD=...
JWT_SECRET=...
EXTERNAL_API_KEY=...
```

민감한 설정은 Git 저장소에 포함하지 않고 운영 환경의 Secret 관리 기능을 통해 제공하는 것이 좋습니다.

### 15.2. .gitignore 설정

로컬 환경 변수 파일이 Git 저장소에 포함되지 않도록 `.gitignore`를 구성할 수 있습니다.

```gitignore
.env
.env.*
!.env.example
```

`.env.example`은 필요한 환경 변수의 이름과 예시값을 제공하는 용도로 사용할 수 있습니다.

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
```

`.env.example`에는 실제 비밀번호나 API Key를 작성하지 않아야 합니다.

### 15.3. Docker 환경

Docker에서는 컨테이너 실행 시 환경 변수를 주입할 수 있습니다.

```bash
docker run \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -p 3000:3000 \
  my-nestjs-app
```

여기서 `my-nestjs-app`은 빌드된 애플리케이션 이미지의 예시 이름입니다.

이 방식으로 전달된 설정값은 컨테이너 내부의 `process.env`를 통해 접근할 수 있습니다.

민감한 값을 명령줄에 직접 작성하면 명령 기록 등에 노출될 수 있으므로 운영 환경에서는 별도의 Secret 관리 방식을 사용하는 것이 적절합니다.

### 15.4. Kubernetes 환경

Kubernetes에서는 ConfigMap과 Secret을 이용하여 환경 설정을 관리할 수 있습니다.

ConfigMap은 일반적인 애플리케이션 설정을 저장하는 데 사용합니다.

Secret은 비밀번호 및 인증 정보와 같은 민감한 설정을 저장하는 데 사용합니다.

NestJS 애플리케이션은 Pod에 주입된 환경 변수를 `ConfigService`를 통해 조회할 수 있습니다.

예를 들어 Deployment에서 다음과 같이 구성할 수 있습니다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestjs-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nestjs-app
  template:
    metadata:
      labels:
        app: nestjs-app
    spec:
      containers:
        - name: nestjs-app
          image: my-nestjs-app:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: nestjs-config
            - secretRef:
                name: nestjs-secret
```

위 예제는 `nestjs-config` ConfigMap과 `nestjs-secret` Secret이 미리 생성되어 있다고 가정합니다.

Secret을 사용하더라도 데이터가 자동으로 완전하게 보호되는 것은 아니므로 Kubernetes RBAC, 저장 시 암호화 및 접근 권한 관리도 함께 고려해야 합니다.

## 16. Configuration 설계 시 권장 사항

애플리케이션 규모가 커질수록 설정 관리 방식은 유지보수성과 안정성에 영향을 미칩니다.

권장 사항은 다음과 같습니다.

1. **설정값을 소스 코드와 분리합니다.**  
   환경별로 변경되는 값은 환경 변수 또는 별도 설정 관리 기능으로 관리합니다.

2. **ConfigService를 통해 설정값에 접근합니다.**  
   설정을 사용하는 각 서비스에서 직접 `process.env`에 접근하는 방식을 최소화합니다.

3. **기능별 네임스페이스를 구성합니다.**  
   `app`, `database`, `cache` 등 관련 설정을 그룹으로 분리합니다.

4. **필수 환경 변수를 검증합니다.**  
   설정이 누락되거나 잘못되었을 때 애플리케이션 시작 단계에서 오류를 확인할 수 있도록 합니다.

5. **타입 변환을 명시적으로 처리합니다.**  
   환경 변수의 기본 타입이 문자열이라는 점을 고려하여 숫자, Boolean 및 배열 등을 적절히 변환합니다.

6. **민감한 정보를 별도로 관리합니다.**  
   운영 환경의 비밀번호나 API Key는 Secret 관리 기능을 통해 제공하도록 구성합니다.

7. **모듈별 설정 의존성을 명확히 합니다.**  
   필요한 설정을 관련 Feature Module에서 관리하고, 가능한 경우 타입이 지정된 설정 Provider를 사용합니다.

8. **설정 변경의 적용 시점을 고려합니다.**  
   일반적인 환경 변수 기반 설정은 애플리케이션 시작 시 읽히므로 실행 중 외부 설정이 변경되더라도 자동으로 반영된다고 가정해서는 안 됩니다.

## 17. 주요 개념 비교

| 개념 | 역할 | 주요 사용 목적 |
|---|---|---|
| `process.env` | Node.js 환경 변수에 직접 접근 | 런타임 환경 변수 조회 |
| `ConfigModule` | 설정 관리 기능 등록 | 애플리케이션 설정 초기화 |
| `ConfigService` | 설정값 조회 | DI 기반 설정 접근 |
| `forRoot()` | 루트 설정 초기화 | 공통 설정 및 환경 변수 로드 |
| `forFeature()` | 기능별 설정 등록 | 모듈 단위 설정 관리 |
| `registerAs()` | 설정 네임스페이스 정의 | 설정 그룹화 |
| `ConfigType` | 설정 객체 타입 추론 | TypeScript 타입 안정성 |
| `validationSchema` | 환경 변수 검증 | 잘못된 설정으로 인한 실행 오류 방지 |
| `forRootAsync()` | 동적 모듈 초기화 | 다른 Provider에 의존하는 설정 구성 |

## 18. 정리

NestJS의 Configuration 기능은 애플리케이션의 실행 환경과 설정값을 소스 코드에서 분리하고 일관된 방식으로 관리하기 위한 기능입니다.

`ConfigModule`은 환경 변수 및 사용자 정의 설정을 로드하며, `ConfigService`는 NestJS의 Dependency Injection을 통해 설정값에 접근할 수 있도록 지원합니다.

`registerAs()`와 `ConfigType`을 사용하면 기능별 설정을 구조화하고 타입 안정성을 높일 수 있습니다.

또한 설정 검증 기능을 적용하면 애플리케이션 시작 시 잘못된 환경 변수를 확인할 수 있어 운영 환경의 안정성을 높이는 데 도움이 됩니다.

실제 프로젝트에서는 환경별 설정 분리, 필수 설정 검증, 민감한 정보 관리 및 모듈별 설정 의존성을 함께 고려하는 것이 중요합니다.

## 참고 자료

- [NestJS 공식 문서 - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS 공식 문서 - Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [NestJS 공식 문서 - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS 공식 문서 - Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [NestJS 공식 문서 - Migration Guide](https://docs.nestjs.com/migration-guide)
- [NestJS Config GitHub Repository](https://github.com/nestjs/config)
- [Node.js 공식 문서 - Environment Variables](https://nodejs.org/api/environment_variables.html)
- [dotenv GitHub Repository](https://github.com/motdotla/dotenv)
- [Zod 공식 문서](https://zod.dev/)
- [Joi 공식 문서](https://joi.dev/)
- [Kubernetes 공식 문서 - ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes 공식 문서 - Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)