# NestJS Project Structure

## 1. NestJS 프로젝트 구조 개요

NestJS 프로젝트는 Nest CLI를 통해 생성할 수 있으며, 기본적으로 애플리케이션 소스 코드와 테스트 코드, 빌드 및 실행 설정 파일 등으로 구성됩니다.

NestJS는 Module을 중심으로 애플리케이션을 구성하므로, 일반적으로 관련된 Controller, Provider 및 기타 파일을 기능별 디렉터리에 배치합니다.

기본 프로젝트 구조는 다음과 같습니다.

```text
project-name/
│
├── src/
│   ├── app.controller.spec.ts
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
│
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── node_modules/
│
├── .gitignore
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── package-lock.json
├── tsconfig.build.json
└── tsconfig.json
```

위 구조는 Nest CLI로 생성하는 일반적인 프로젝트의 개념적인 예시입니다. 실제 생성되는 파일과 설정은 NestJS 및 Nest CLI 버전, 패키지 관리자, ESM 또는 CommonJS 선택, 테스트 도구 등에 따라 달라질 수 있습니다.

## 2. 프로젝트 생성

### 2.1. Nest CLI 설치

Nest CLI는 NestJS 프로젝트 생성 및 코드 구조 관리를 지원하는 공식 Command Line Interface입니다.

```bash
npm install -g @nestjs/cli
```

### 2.2. 프로젝트 생성

다음 명령어를 사용하여 새로운 NestJS 프로젝트를 생성합니다.

```bash
nest new project-name
```

프로젝트 생성 과정에서 패키지 관리자와 Module System 등을 선택할 수 있습니다.

기본적으로 Nest CLI는 애플리케이션 실행에 필요한 설정 파일과 초기 소스 코드를 생성합니다.

### 2.3. 프로젝트 실행

생성된 프로젝트 디렉터리로 이동한 후 개발 서버를 실행합니다.

```bash
cd project-name

npm run start:dev
```

`start:dev`는 소스 코드의 변경 사항을 감지하여 애플리케이션을 다시 빌드하고 실행하는 개발 모드입니다.

## 3. 디렉터리 및 파일의 역할

### 3.1. src/

`src/`는 NestJS 애플리케이션의 주요 소스 코드를 관리하는 디렉터리입니다.

Nest CLI는 기본적으로 Controller, Module, Service 및 애플리케이션 진입점에 해당하는 파일을 생성합니다.

| 파일 | 역할 |
|---|---|
| `main.ts` | 애플리케이션의 진입점으로, NestFactory를 사용하여 NestJS 애플리케이션을 생성하고 실행합니다. |
| `app.module.ts` | 애플리케이션의 Root Module을 정의합니다. |
| `app.controller.ts` | 기본 HTTP Route를 정의하는 Controller입니다. |
| `app.service.ts` | 기본 비즈니스 로직을 제공하는 Service입니다. |
| `app.controller.spec.ts` | AppController의 Unit Test를 작성하는 파일입니다. |

#### main.ts

`main.ts`는 NestJS 애플리케이션의 진입점(Entry Point)입니다.

`NestFactory`를 사용하여 애플리케이션 인스턴스를 생성하고, HTTP 서버가 요청을 수신할 수 있도록 실행합니다.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

주요 처리 과정은 다음과 같습니다.

1. `NestFactory.create()`를 호출하여 NestJS 애플리케이션 인스턴스를 생성합니다.
2. Root Module인 `AppModule`을 전달하여 애플리케이션을 구성합니다.
3. `app.listen()`을 호출하여 지정된 포트에서 HTTP 요청을 수신합니다.

애플리케이션 전역 설정이 필요한 경우에도 일반적으로 `main.ts`에서 처리합니다.

예를 들어 다음과 같은 설정을 적용할 수 있습니다.

- Global Prefix
- Global Pipes
- Global Guards
- Global Interceptors
- Global Exception Filters
- CORS
- Validation 설정

#### app.module.ts

`app.module.ts`는 NestJS 애플리케이션의 Root Module인 `AppModule`을 정의합니다.

Root Module은 애플리케이션을 구성하는 다른 Module을 연결하는 시작점입니다.

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

주요 속성은 다음과 같습니다.

| 속성 | 역할 |
|---|---|
| `imports` | 다른 Module을 가져옵니다. |
| `controllers` | AppModule에서 관리할 Controller를 등록합니다. |
| `providers` | AppModule에서 사용할 Provider를 등록합니다. |
| `exports` | 다른 Module에서 사용할 수 있도록 Provider를 공개합니다. |

애플리케이션의 기능이 증가하면 Root Module에 모든 Controller와 Provider를 직접 등록하기보다는 기능별 Module을 생성하고 `imports`를 통해 연결하는 것이 일반적입니다.

#### app.controller.ts

`app.controller.ts`는 기본 HTTP 요청을 처리하는 Controller입니다.

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

Controller는 HTTP 요청을 수신하고 필요한 Provider를 호출하여 처리 결과를 반환합니다.

#### app.service.ts

`app.service.ts`는 기본 비즈니스 로직을 제공하는 Service입니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

`@Injectable()` Decorator를 사용하여 해당 클래스를 NestJS Provider로 등록하고 Dependency Injection을 통해 다른 구성 요소에 주입할 수 있도록 합니다.

#### app.controller.spec.ts

`app.controller.spec.ts`는 AppController의 Unit Test를 작성하는 파일입니다.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should return "Hello World!"', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });
});
```

NestJS는 `@nestjs/testing` 패키지를 통해 테스트 환경에서 Module을 구성하고 Provider를 주입할 수 있도록 지원합니다.

### 3.2. test/

`test/`는 애플리케이션의 End-to-End Test 관련 파일을 관리하는 디렉터리입니다.

기본적으로 Nest CLI는 다음과 같은 파일을 생성할 수 있습니다.

| 파일 | 역할 |
|---|---|
| `app.e2e-spec.ts` | 애플리케이션의 HTTP 요청부터 응답까지 전체 흐름을 검증하는 E2E Test입니다. |
| `jest-e2e.json` | E2E Test 실행을 위한 Jest 설정 파일입니다. |

Unit Test가 개별 클래스나 기능의 동작을 독립적으로 검증한다면, E2E Test는 여러 구성 요소가 연결된 애플리케이션의 전체 동작을 검증합니다.

테스트 도구와 프로젝트 설정에 따라 실제 파일명 및 구성은 달라질 수 있습니다.

### 3.3. node_modules/

`node_modules/`는 프로젝트에서 사용하는 외부 패키지와 해당 패키지의 의존성을 설치하는 디렉터리입니다.

일반적으로 다음과 같은 패키지가 포함됩니다.

- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/platform-express`
- `@nestjs/testing`
- `rxjs`
- `reflect-metadata`

`npm install` 또는 패키지 관리자에 해당하는 설치 명령을 실행하면 의존성 파일을 기준으로 패키지가 설치됩니다.

일반적으로 `node_modules/`는 Git 저장소에 포함하지 않으며, `.gitignore`에 등록합니다.

### 3.4. package.json

`package.json`은 프로젝트의 메타데이터와 의존성 및 실행 명령어를 관리하는 파일입니다.

```json
{
  "name": "project-name",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.0.0"
  }
}
```

위 코드는 주요 항목을 이해하기 위한 예시이며, 실제 Nest CLI 생성 파일의 내용과 버전은 다를 수 있습니다.

주요 항목은 다음과 같습니다.

| 항목 | 역할 |
|---|---|
| `name` | 프로젝트 이름입니다. |
| `version` | 프로젝트 버전입니다. |
| `scripts` | 프로젝트 실행, 빌드 및 테스트 명령어를 정의합니다. |
| `dependencies` | 애플리케이션 실행에 필요한 패키지를 관리합니다. |
| `devDependencies` | 개발 및 테스트 과정에서 사용하는 패키지를 관리합니다. |

자주 사용하는 실행 명령은 다음과 같습니다.

| 명령어 | 설명 |
|---|---|
| `npm run start` | 애플리케이션을 실행합니다. |
| `npm run start:dev` | 파일 변경을 감지하는 개발 모드로 실행합니다. |
| `npm run start:debug` | 디버깅 모드로 실행합니다. |
| `npm run build` | 애플리케이션을 빌드합니다. |
| `npm run start:prod` | 빌드된 애플리케이션을 운영 모드로 실행합니다. |
| `npm run test` | Unit Test를 실행합니다. |
| `npm run test:e2e` | E2E Test를 실행합니다. |

실제 실행 명령은 `package.json`의 `scripts`에 정의된 내용을 기준으로 합니다.

### 3.5. tsconfig.json

`tsconfig.json`은 TypeScript 컴파일러의 설정을 관리하는 파일입니다.

NestJS 프로젝트에서는 TypeScript 코드를 JavaScript로 변환할 때 적용할 컴파일 옵션을 정의합니다.

주요 설정은 다음과 같습니다.

| 설정 | 역할 |
|---|---|
| `target` | 컴파일 결과로 생성할 JavaScript의 ECMAScript 버전을 지정합니다. |
| `module` | 모듈 시스템을 지정합니다. |
| `moduleResolution` | 모듈을 탐색하고 해석하는 방식을 지정합니다. |
| `strict` | TypeScript의 엄격한 타입 검사 옵션을 활성화합니다. |
| `experimentalDecorators` | Decorator 문법을 사용할 수 있도록 설정합니다. |
| `emitDecoratorMetadata` | Decorator가 적용된 선언에 대한 메타데이터를 생성합니다. |
| `esModuleInterop` | CommonJS 모듈과 ES Module 간의 상호 운용성을 지원합니다. |
| `outDir` | 컴파일 결과물을 저장할 디렉터리를 지정합니다. |

특히 NestJS는 Decorator와 Reflection Metadata를 활용하므로 관련 컴파일 설정이 중요합니다.

`tsconfig.build.json`은 빌드 전용 TypeScript 설정을 관리하는 파일입니다. 일반적으로 기본 `tsconfig.json`을 확장하면서 테스트 파일 등 빌드에서 제외할 대상을 지정할 수 있습니다.

### 3.6. nest-cli.json

`nest-cli.json`은 Nest CLI의 프로젝트 설정을 관리하는 파일입니다.

주요 설정은 다음과 같습니다.

| 설정 | 역할 |
|---|---|
| `collection` | 코드 생성에 사용할 Schematics Collection을 지정합니다. |
| `sourceRoot` | 소스 코드의 기본 디렉터리를 지정합니다. |
| `compilerOptions` | 컴파일러 및 빌드 관련 설정을 관리합니다. |
| `monorepo` | Monorepo 프로젝트 구성 여부를 지정합니다. |
| `projects` | Monorepo에 포함된 애플리케이션과 라이브러리의 설정을 관리합니다. |

기본 프로젝트에서는 `sourceRoot`가 `src`로 지정되는 것이 일반적입니다.

### 3.7. 기타 설정 파일

프로젝트에는 개발 환경과 빌드 환경을 관리하기 위한 추가 설정 파일이 포함될 수 있습니다.

| 파일 | 역할 |
|---|---|
| `.gitignore` | Git 버전 관리에서 제외할 파일과 디렉터리를 지정합니다. |
| `eslint.config.mjs` | ESLint 기반 코드 정적 분석 규칙을 관리합니다. |
| `.prettierrc` | Prettier 코드 포맷팅 설정을 관리합니다. |
| `package-lock.json` | npm 의존성의 정확한 버전과 설치 정보를 기록합니다. |
| `.env` | 환경 변수를 저장하는 파일로, 별도 환경 설정 라이브러리를 통해 로드할 수 있습니다. |

프로젝트 생성 시 선택한 도구와 설정에 따라 파일의 종류와 이름은 달라질 수 있습니다.

## 4. 기능별 Module 디렉터리 구성

### 4.1. 기능별 디렉터리 분리

NestJS는 각 Module을 별도의 디렉터리로 관리하는 구조를 권장합니다.

애플리케이션의 기능이 증가하면 모든 Controller와 Service를 `src/` 바로 아래에 배치하기보다 기능별 디렉터리로 분리하는 것이 좋습니다.

예를 들어 사용자 관리 기능을 개발한다면 다음과 같이 구성할 수 있습니다.

```text
src/
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│       ├── create-user.dto.ts
│       └── update-user.dto.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── guards/
│       └── auth.guard.ts
│
├── app.module.ts
└── main.ts
```

이 구조에서는 `users/`가 사용자 관리 기능을 담당하고, `auth/`가 인증 기능을 담당합니다.

각 디렉터리는 관련된 Controller, Provider, DTO 및 기타 구성 요소를 함께 관리합니다.

### 4.2. Feature Module 구성

Feature Module은 특정 기능이나 도메인을 담당하는 Module입니다.

예를 들어 `UsersModule`은 사용자 관리와 관련된 구성 요소를 하나의 기능 단위로 묶습니다.

```typescript
// users/users.module.ts

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

```typescript
// users/users.controller.ts

import { Controller, Get } from '@nestjs/common';
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
}
```

```typescript
// users/users.service.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  findAll() {
    return [];
  }
}
```

Root Module에서는 Feature Module을 Import하여 애플리케이션의 전체 구조를 구성합니다.

```typescript
// app.module.ts

import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
```

이러한 구조를 사용하면 각 기능의 구성 요소를 독립적으로 관리할 수 있으며, Module 간 의존 관계도 명확하게 표현할 수 있습니다.

## 5. Nest CLI를 활용한 코드 생성

Nest CLI는 프로젝트에 필요한 Module, Controller, Service 및 기타 구성 요소를 생성하는 명령어를 제공합니다.

직접 파일을 생성하고 기본 코드를 작성하는 대신 CLI를 활용하면 일관된 파일 구조를 유지할 수 있습니다.

### 5.1. Module 생성

```bash
nest generate module users
```

축약형:

```bash
nest g mo users
```

다음과 같은 파일이 생성됩니다.

```text
src/
└── users/
    └── users.module.ts
```

### 5.2. Controller 생성

```bash
nest generate controller users
```

축약형:

```bash
nest g co users
```

다음과 같은 파일이 생성됩니다.

```text
src/
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    └── users.controller.spec.ts
```

Controller를 생성할 때 기존 Module을 자동으로 찾아 등록할 수 있습니다.

### 5.3. Service 생성

```bash
nest generate service users
```

축약형:

```bash
nest g s users
```

다음과 같은 파일이 생성됩니다.

```text
src/
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.service.ts
    ├── users.controller.spec.ts
    └── users.service.spec.ts
```

Service를 생성할 때도 기존 Module에 Provider로 자동 등록할 수 있습니다.

### 5.4. Resource 생성

```bash
nest generate resource users
```

축약형:

```bash
nest g res users
```

Resource Generator는 특정 기능을 구현하기 위한 기본 구성 요소를 함께 생성합니다.

일반적으로 다음과 같은 파일이 생성됩니다.

```text
src/
└── users/
    ├── dto/
    │   ├── create-user.dto.ts
    │   └── update-user.dto.ts
    │
    ├── entities/
    │   └── user.entity.ts
    │
    ├── users.controller.ts
    ├── users.controller.spec.ts
    ├── users.module.ts
    ├── users.service.ts
    └── users.service.spec.ts
```

Resource Generator는 사용자가 선택한 전송 방식과 CRUD 생성 옵션 등에 따라 결과가 달라집니다.

### 5.5. 주요 CLI 명령어

| 명령어 | 축약형 | 역할 |
|---|---|---|
| `nest generate module` | `nest g mo` | Module을 생성합니다. |
| `nest generate controller` | `nest g co` | Controller를 생성합니다. |
| `nest generate service` | `nest g s` | Service를 생성합니다. |
| `nest generate provider` | `nest g pr` | Provider를 생성합니다. |
| `nest generate guard` | `nest g gu` | Guard를 생성합니다. |
| `nest generate interceptor` | `nest g in` | Interceptor를 생성합니다. |
| `nest generate pipe` | `nest g pi` | Pipe를 생성합니다. |
| `nest generate filter` | `nest g f` | Exception Filter를 생성합니다. |
| `nest generate middleware` | `nest g mi` | Middleware를 생성합니다. |
| `nest generate resource` | `nest g res` | CRUD 기능을 위한 기본 구성 요소를 생성합니다. |

## 6. 실무 프로젝트의 디렉터리 구성

### 6.1. 기본적인 기능 중심 구조

실무 프로젝트에서는 애플리케이션의 규모와 도메인에 따라 디렉터리 구조를 확장할 수 있습니다.

일반적인 기능 중심 구조는 다음과 같습니다.

```text
src/
│
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── middleware/
│   ├── pipes/
│   └── utils/
│
├── config/
│   ├── configuration.ts
│   └── database.config.ts
│
├── database/
│   ├── database.module.ts
│   └── database.provider.ts
│
├── users/
│   ├── dto/
│   ├── entities/
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
│
├── auth/
│   ├── dto/
│   ├── guards/
│   ├── strategies/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
│
├── products/
│   ├── dto/
│   ├── entities/
│   ├── products.controller.ts
│   ├── products.module.ts
│   └── products.service.ts
│
├── app.module.ts
└── main.ts
```

각 디렉터리의 역할은 다음과 같습니다.

| 디렉터리 | 역할 |
|---|---|
| `common/` | 여러 기능에서 공통으로 사용하는 구성 요소를 관리합니다. |
| `config/` | 환경 변수 및 애플리케이션 설정을 관리합니다. |
| `database/` | 데이터베이스 연결 및 공통 데이터베이스 기능을 관리합니다. |
| `users/` | 사용자 관리 기능을 담당합니다. |
| `auth/` | 인증 및 인가 기능을 담당합니다. |
| `products/` | 상품 관리 기능을 담당합니다. |

위 구조는 실무에서 활용할 수 있는 하나의 예시이며, NestJS가 강제하는 디렉터리 구조는 아닙니다.

프로젝트의 도메인과 책임에 따라 필요한 디렉터리를 추가하거나 통합할 수 있습니다.

### 6.2. Common 디렉터리

`common/`은 여러 기능에서 공통으로 사용하는 구성 요소를 관리하는 디렉터리입니다.

예를 들어 다음과 같은 구성 요소를 배치할 수 있습니다.

| 디렉터리 | 관리 대상 |
|---|---|
| `decorators/` | Custom Decorator |
| `filters/` | 공통 Exception Filter |
| `guards/` | 공통 Guard |
| `interceptors/` | 공통 Interceptor |
| `middleware/` | 공통 Middleware |
| `pipes/` | 공통 Pipe |
| `utils/` | 공통 유틸리티 함수 |

다만 모든 구성 요소를 무조건 `common/`에 배치하는 것은 적절하지 않습니다.

특정 도메인에서만 사용하는 Guard, Pipe 또는 Decorator라면 해당 기능의 디렉터리 내부에 배치하는 것이 책임을 명확하게 구분하는 데 도움이 됩니다.

### 6.3. DTO와 Entity 디렉터리

기능별 디렉터리 내부에는 DTO와 Entity 등을 별도로 관리할 수 있습니다.

**DTO(Data Transfer Object)**는 계층 또는 시스템 간 데이터를 전달하기 위한 객체입니다.

일반적으로 다음과 같은 용도로 사용합니다.

- 요청 데이터의 구조 정의
- 입력값 유효성 검증
- 응답 데이터 구조 정의
- 계층 간 데이터 전달

**Entity**는 애플리케이션에서 관리하는 데이터 모델을 표현하는 객체입니다.

예를 들어 TypeORM에서는 데이터베이스 테이블과 매핑되는 Entity를 정의할 수 있습니다.

```text
users/
│
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── user-response.dto.ts
│
├── entities/
│   └── user.entity.ts
│
├── users.controller.ts
├── users.module.ts
└── users.service.ts
```

DTO와 Entity는 서로 다른 목적을 가지므로 필요에 따라 분리하여 관리하는 것이 좋습니다.

## 7. 프로젝트 규모에 따른 구조 확장

NestJS는 기본적으로 Module 기반 구조를 제공하지만, 프로젝트의 규모와 설계 방식에 따라 디렉터리 구조를 더 세분화할 수 있습니다.

### 7.1. Feature 중심 구조

Feature 중심 구조는 도메인 또는 기능을 기준으로 디렉터리를 구성하는 방식입니다.

```text
src/
│
├── users/
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
│
├── orders/
│   ├── dto/
│   ├── orders.controller.ts
│   ├── orders.module.ts
│   └── orders.service.ts
│
└── products/
    ├── dto/
    ├── products.controller.ts
    ├── products.module.ts
    └── products.service.ts
```

각 기능의 관련 파일을 한곳에 모으기 때문에 기능별 책임과 변경 범위를 파악하기 쉽습니다.

기능이 독립적인 도메인 단위로 구분되는 애플리케이션에 적합합니다.

### 7.2. Layer 중심 구조

Layer 중심 구조는 애플리케이션의 기술적 책임을 기준으로 디렉터리를 구성하는 방식입니다.

```text
src/
│
├── controllers/
│   ├── users.controller.ts
│   ├── orders.controller.ts
│   └── products.controller.ts
│
├── services/
│   ├── users.service.ts
│   ├── orders.service.ts
│   └── products.service.ts
│
├── repositories/
│   ├── users.repository.ts
│   ├── orders.repository.ts
│   └── products.repository.ts
│
├── modules/
│   ├── users.module.ts
│   ├── orders.module.ts
│   └── products.module.ts
│
└── main.ts
```

이 구조는 Controller, Service, Repository 등 기술적 역할을 기준으로 코드를 구분합니다.

다만 기능이 증가하면 하나의 기능을 수정하기 위해 여러 디렉터리를 탐색해야 할 수 있습니다.

### 7.3. Feature 중심과 Layer 중심 구조의 비교

| 구분 | Feature 중심 | Layer 중심 |
|---|---|---|
| 분류 기준 | 도메인 및 기능 | 기술적 책임 |
| 파일 배치 | 관련 기능의 파일을 한곳에 배치 | 동일한 역할의 파일을 한곳에 배치 |
| 기능별 응집도 | 높게 유지하기 용이합니다. | 여러 디렉터리에 분산될 수 있습니다. |
| 변경 범위 파악 | 기능별 변경 범위를 파악하기 쉽습니다. | 여러 계층에 걸친 변경을 추적해야 할 수 있습니다. |
| 적합한 환경 | 도메인별 기능이 확장되는 프로젝트 | 단순한 계층 구조를 유지하는 프로젝트 |

NestJS는 특정 디렉터리 구성 방식을 강제하지 않습니다.

따라서 프로젝트의 규모, 도메인 경계, 팀의 개발 방식 및 유지보수 요구 사항을 고려하여 적절한 구조를 선택해야 합니다.

## 8. NestJS Monorepo 구조

NestJS CLI는 일반적인 단일 애플리케이션 구조 외에도 Monorepo 구조를 지원합니다.

Monorepo는 여러 애플리케이션과 라이브러리를 하나의 저장소에서 관리하는 방식입니다.

NestJS에서는 CLI를 통해 Monorepo 프로젝트를 구성하고 여러 Application과 Library를 관리할 수 있습니다.

### 8.1. Monorepo 전환

기존 Standard Mode 프로젝트에서 다음 명령어를 실행하면 새로운 애플리케이션을 추가하면서 Monorepo Mode로 전환할 수 있습니다.

```bash
nest generate app api
```

라이브러리는 다음 명령어로 생성할 수 있습니다.

```bash
nest generate library shared
```

### 8.2. Monorepo 디렉터리 구조

일반적인 구조는 다음과 같습니다.

```text
project-name/
│
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── tsconfig.app.json
│   │
│   └── worker/
│       ├── src/
│       │   ├── app.module.ts
│       │   └── main.ts
│       └── tsconfig.app.json
│
├── libs/
│   └── shared/
│       └── src/
│
├── nest-cli.json
├── package.json
└── tsconfig.json
```

| 디렉터리 | 역할 |
|---|---|
| `apps/` | 독립적으로 실행할 수 있는 애플리케이션을 관리합니다. |
| `libs/` | 여러 애플리케이션에서 공유할 라이브러리를 관리합니다. |

예를 들어 하나의 저장소에서 다음과 같은 애플리케이션을 관리할 수 있습니다.

- API Server
- Background Worker
- WebSocket Server
- Microservice

공통 DTO, Utility, Domain Logic 등을 Library로 분리하면 여러 애플리케이션에서 재사용할 수 있습니다.

### 8.3. Standard Mode와 Monorepo Mode 비교

| 구분 | Standard Mode | Monorepo Mode |
|---|---|---|
| 프로젝트 구성 | 일반적으로 하나의 애플리케이션 중심 | 여러 Application 및 Library 관리 |
| 소스 코드 | `src/` | `apps/`, `libs/` |
| 빌드 설정 | 프로젝트 중심 | Application 및 Library별 설정 |
| 코드 공유 | 별도 패키지 또는 공통 디렉터리 활용 | Library를 통해 공유 가능 |
| 주요 활용 | 단일 애플리케이션 개발 | 여러 애플리케이션을 하나의 저장소에서 관리 |

Monorepo Mode는 여러 애플리케이션 간 코드 공유와 프로젝트 관리를 단순화할 수 있지만, 모든 프로젝트에 반드시 필요한 구조는 아닙니다.

## 9. 프로젝트 구조 설계 시 고려 사항

NestJS 프로젝트의 디렉터리 구조는 애플리케이션의 규모와 도메인에 따라 달라질 수 있습니다.

구조를 설계할 때 다음 사항을 고려하는 것이 좋습니다.

### 9.1. 기능별 책임 분리

관련된 Controller, Provider 및 DTO를 기능별 Module 내부에 배치합니다.

기능별 책임이 명확해지면 특정 기능을 수정할 때 다른 기능에 미치는 영향을 줄일 수 있습니다.

### 9.2. Module 간 의존 관계 관리

Module 간의 의존 관계는 `imports`와 `exports`를 통해 명시적으로 관리합니다.

불필요하게 많은 Provider를 Export하거나 여러 Module이 서로 순환 참조하는 구조는 지양하는 것이 좋습니다.

### 9.3. 공통 코드의 적절한 분리

여러 기능에서 반복적으로 사용하는 코드는 공통 영역으로 분리할 수 있습니다.

다만 재사용 가능성이 있다는 이유만으로 모든 코드를 `common/`에 배치하면 책임이 불분명해질 수 있습니다.

공통 영역에는 실제로 여러 기능에서 공유하는 구성 요소를 배치하는 것이 좋습니다.

### 9.4. 디렉터리 구조의 일관성 유지

프로젝트 전체에서 파일과 디렉터리의 명명 규칙 및 배치 기준을 일관되게 유지해야 합니다.

예를 들어 다음과 같은 규칙을 적용할 수 있습니다.

- 파일명은 `kebab-case`를 사용합니다.
- Module은 `*.module.ts` 형식으로 관리합니다.
- Controller는 `*.controller.ts` 형식으로 관리합니다.
- Service는 `*.service.ts` 형식으로 관리합니다.
- DTO는 `*.dto.ts` 형식으로 관리합니다.
- 테스트 파일은 `*.spec.ts` 형식으로 관리합니다.

일관된 규칙을 유지하면 개발자가 새로운 기능의 파일 위치를 쉽게 예측할 수 있습니다.

## 10. 정리

NestJS 프로젝트는 Nest CLI를 통해 기본 구조를 생성할 수 있으며, Module을 중심으로 애플리케이션을 구성합니다.

기본적으로 다음과 같은 파일과 디렉터리가 주요 역할을 담당합니다.

| 구성 요소 | 핵심 역할 |
|---|---|
| `src/` | 애플리케이션 소스 코드를 관리합니다. |
| `main.ts` | 애플리케이션을 생성하고 실행합니다. |
| `app.module.ts` | Root Module을 정의합니다. |
| `*.controller.ts` | HTTP 요청을 처리합니다. |
| `*.service.ts` | 비즈니스 로직을 수행합니다. |
| `*.module.ts` | 관련 구성 요소를 기능 단위로 구성합니다. |
| `test/` | E2E Test 관련 파일을 관리합니다. |
| `package.json` | 의존성과 실행 명령어를 관리합니다. |
| `tsconfig.json` | TypeScript 컴파일 설정을 관리합니다. |
| `nest-cli.json` | Nest CLI 프로젝트 설정을 관리합니다. |

실무에서는 기능별 Module을 중심으로 디렉터리를 구성하고, 애플리케이션의 규모와 설계 요구 사항에 따라 Common, Database, Config 등의 영역을 추가할 수 있습니다.

여러 애플리케이션과 공통 라이브러리를 하나의 저장소에서 관리해야 하는 경우에는 NestJS Monorepo 구조를 고려할 수 있습니다.

중요한 것은 특정 디렉터리 구조를 그대로 따르는 것이 아니라, **기능별 책임과 Module 간 의존 관계가 명확하게 드러나도록 프로젝트를 구성하는 것**입니다.

## 참고 자료

### NestJS 공식 문서

- [First Steps](https://docs.nestjs.com/first-steps)
- [Overview](https://docs.nestjs.com/overview)
- [CLI Overview](https://docs.nestjs.com/cli/overview)
- [CLI Usage](https://docs.nestjs.com/cli/usages)
- [CLI Monorepo Mode](https://docs.nestjs.com/cli/monorepo)
- [Modules](https://docs.nestjs.com/modules)
- [Testing](https://docs.nestjs.com/fundamentals/testing)

### 관련 문서

- [introduction.md](./introduction.md)
- [architecture.md](./architecture.md)
- [request-lifecycle.md](./request-lifecycle.md)

### 관련 학습 영역

- `01-fundamentals/`: Module, Controller, Provider 및 Dependency Injection의 상세 구조
- `06-testing/`: Unit Test, Integration Test 및 E2E Test
- `07-architecture/`: Layered Architecture, Modular Monolith 및 Clean Architecture
- `08-deployment/`: Production Build 및 Environment Configuration