# Production Build

## 1. 개요

Production Build는 NestJS 애플리케이션을 개발 환경이 아닌 실제 운영 환경에서 실행할 수 있도록 빌드 산출물(Build Artifact)을 생성하는 과정입니다.

NestJS는 TypeScript를 기반으로 애플리케이션을 개발할 수 있으며, 일반적인 배포 방식에서는 TypeScript 소스 코드를 JavaScript로 컴파일한 후 Node.js 런타임에서 실행합니다.

개발 환경에서는 코드 변경 감지, 자동 재시작, 디버깅 등의 기능을 활용하지만, 운영 환경에서는 안정적인 실행, 배포 재현성, 의존성 관리 및 리소스 효율성을 우선적으로 고려해야 합니다.

Production Build에서는 다음 항목을 다룹니다.

- TypeScript 소스 코드의 JavaScript 컴파일
- Nest CLI를 이용한 빌드 수행
- TypeScript 및 Nest CLI 빌드 설정
- 빌드 산출물의 디렉터리 구조
- 운영 환경에서의 애플리케이션 실행
- Production Dependency 관리
- Docker를 이용한 배포 이미지 구성
- 빌드 및 배포 과정에서 발생할 수 있는 문제

Production Build는 단순히 소스 코드를 컴파일하는 작업뿐만 아니라 운영 환경에서 실행할 수 있는 애플리케이션과 필요한 리소스를 준비하는 과정으로 이해할 수 있습니다.

---

## 2. Development와 Production 환경의 차이

NestJS 애플리케이션은 개발 환경과 운영 환경에서 기본적으로 동일한 프레임워크를 사용하지만, 실행 목적과 운영 방식에는 차이가 있습니다.

| 구분 | Development | Production |
|---|---|---|
| 목적 | 개발 및 디버깅 | 실제 서비스 제공 |
| 코드 변경 감지 | 일반적으로 사용 | 일반적으로 사용하지 않음 |
| 자동 재시작 | Watch Mode 활용 | 프로세스 관리자 또는 오케스트레이터 활용 |
| 실행 코드 | 개발 도구를 통한 실행 가능 | 사전 빌드된 JavaScript 실행 권장 |
| Source Map | 디버깅에 활용 | 필요성과 보안 정책에 따라 결정 |
| 의존성 | 개발 및 실행 의존성 | 실행에 필요한 의존성 |
| 환경 변수 | 개발 환경 설정 | 운영 환경 설정 |
| 모니터링 | 개발 로그 및 디버거 중심 | Logging, Metrics, Health Check 중심 |

### 2.1. Development 실행

일반적인 NestJS 프로젝트에서는 다음 명령어로 개발 서버를 실행할 수 있습니다.

```bash
npm run start:dev
```

기본적인 Nest CLI 프로젝트에서 해당 스크립트는 다음과 같이 구성됩니다.

```json
{
  "scripts": {
    "start:dev": "nest start --watch"
  }
}
```

`--watch` 옵션은 소스 코드 변경을 감지하여 애플리케이션을 다시 빌드하고 실행하는 개발용 기능입니다.

### 2.2. Production 실행

운영 환경에서는 일반적으로 빌드 과정을 먼저 수행합니다.

```bash
npm run build
```

이후 생성된 JavaScript 파일을 Node.js로 실행합니다.

```bash
node dist/main.js
```

단, 실제 실행 파일의 경로는 프로젝트의 컴파일 설정 및 디렉터리 구조에 따라 달라질 수 있습니다.

개발용 Watch Mode를 운영 환경에서 사용하는 대신 사전에 검증된 빌드 산출물을 실행하는 방식을 권장합니다.

---

## 3. NestJS의 빌드 과정

NestJS 애플리케이션의 일반적인 빌드 과정은 다음과 같습니다.

```text
TypeScript Source Code
         |
         v
    Nest CLI
         |
         v
    Compiler
         |
         v
 JavaScript Output
         |
         v
  Build Artifacts
         |
         v
   Node.js Runtime
         |
         v
 NestJS Application
```

### 3.1. TypeScript 컴파일

Node.js에서 실행할 수 있도록 TypeScript 소스 코드를 JavaScript로 변환합니다.

예를 들어 다음과 같은 TypeScript 코드가 있다고 가정합니다.

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

컴파일 결과는 사용하는 TypeScript 설정에 따라 달라지지만, JavaScript에서도 동일한 서비스 로직을 실행할 수 있도록 변환됩니다.

TypeScript의 타입 선언은 일반적으로 컴파일 과정에서 제거됩니다.

다만 NestJS의 Dependency Injection에 사용되는 Decorator Metadata 등은 컴파일러 설정에 따라 JavaScript에 반영될 수 있습니다.

### 3.2. Nest CLI의 역할

Nest CLI는 애플리케이션 생성, 코드 생성, 빌드 및 실행을 지원하는 명령줄 도구입니다.

빌드 명령어는 다음과 같습니다.

```bash
npx nest build
```

일반적인 프로젝트에서는 다음 명령어를 사용합니다.

```bash
npm run build
```

`package.json`에 다음과 같은 스크립트가 정의되어 있다면 동일한 빌드 명령이 실행됩니다.

```json
{
  "scripts": {
    "build": "nest build"
  }
}
```

Nest CLI는 설정된 Compiler 또는 Builder를 이용해 소스 코드를 컴파일하고, 필요한 경우 정적 리소스 복사 등의 작업도 수행합니다.

---

## 4. Production Build 실행

### 4.1. 프로젝트 구조

다음과 같은 일반적인 NestJS 프로젝트를 기준으로 설명합니다.

```text
nestjs-app/
├── src/
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
│
├── test/
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json
└── package-lock.json
```

프로젝트 구조와 설정 파일의 존재 여부는 생성 시점의 Nest CLI 버전 또는 프로젝트 구성에 따라 달라질 수 있습니다.

### 4.2. 의존성 설치

프로젝트의 빌드에 필요한 의존성을 설치합니다.

```bash
npm ci
```

`npm ci`는 `package-lock.json`을 기준으로 의존성을 설치합니다.

CI/CD 환경에서는 의존성 버전을 재현할 수 있도록 `npm install`보다 `npm ci`를 사용하는 것이 일반적으로 적합합니다.

단, `npm ci`를 사용하려면 유효한 Lockfile이 필요하며, `package.json`과 Lockfile의 의존성 정보가 일치해야 합니다.

### 4.3. 빌드 실행

```bash
npm run build
```

빌드가 성공하면 설정된 출력 디렉터리에 JavaScript 파일이 생성됩니다.

일반적인 프로젝트의 출력 디렉터리는 `dist`입니다.

```text
nestjs-app/
├── dist/
│   ├── app.controller.js
│   ├── app.module.js
│   ├── app.service.js
│   └── main.js
│
├── src/
├── package.json
└── tsconfig.json
```

위 구조는 출력 형태를 설명하기 위한 예시입니다.

실제 출력 결과는 `rootDir`, `outDir`, `include`, Builder 및 프로젝트 구조에 따라 다르게 생성될 수 있습니다.

예를 들어 루트 디렉터리의 TypeScript 파일까지 컴파일 대상에 포함되면 다음과 같은 구조가 생성될 수 있습니다.

```text
dist/
└── src/
    ├── app.module.js
    └── main.js
```

따라서 빌드 후에는 실제 Entry Point의 위치를 확인해야 합니다.

### 4.4. Production 실행

빌드 결과를 확인한 후 다음과 같이 실행합니다.

```bash
NODE_ENV=production node dist/main.js
```

이 명령어는 Unix 계열 Shell에서 사용할 수 있는 환경 변수 설정 방식입니다.

Windows 환경에서는 Shell에 따라 환경 변수 설정 문법이 달라질 수 있습니다.

---

## 5. TypeScript 빌드 설정

NestJS 프로젝트에서는 TypeScript 설정을 통해 컴파일 대상, 출력 경로 및 JavaScript 모듈 형식 등을 제어할 수 있습니다.

주요 설정 파일은 다음과 같습니다.

| 파일 | 역할 |
|---|---|
| `tsconfig.json` | TypeScript 컴파일러의 기본 설정 |
| `tsconfig.build.json` | 빌드 시 사용할 TypeScript 설정 |
| `nest-cli.json` | Nest CLI 및 Builder 설정 |

### 5.1. tsconfig.json

다음은 CommonJS 방식의 Node.js 애플리케이션을 위한 TypeScript 설정 예시입니다.

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false,
    "strictNullChecks": true,
    "skipLibCheck": true
  }
}
```

주요 옵션은 다음과 같습니다.

| 옵션 | 설명 |
|---|---|
| `module` | 생성할 JavaScript 모듈 형식 |
| `target` | JavaScript 출력 대상 버전 |
| `moduleResolution` | 모듈 탐색 방식 |
| `outDir` | 컴파일 결과가 저장되는 디렉터리 |
| `rootDir` | TypeScript 소스 코드의 기준 디렉터리 |
| `sourceMap` | Source Map 생성 여부 |
| `emitDecoratorMetadata` | Decorator 관련 타입 메타데이터 출력 |
| `experimentalDecorators` | TypeScript Decorator 지원 |
| `strictPropertyInitialization` | 클래스 속성 초기화 검사 |
| `strictNullChecks` | null 및 undefined에 대한 타입 검사 |
| `skipLibCheck` | 선언 파일의 타입 검사 생략 |

위 설정은 특정 프로젝트에 적용할 수 있는 예시이며 모든 옵션이 필수인 것은 아닙니다.

특히 `module`과 `moduleResolution`은 프로젝트의 CommonJS 또는 ESM 구성에 따라 일관되게 설정해야 합니다.

ESM 기반 프로젝트에서는 `NodeNext` 등의 설정을 사용할 수 있습니다.

또한 출력 대상인 `target`은 실제 운영 환경의 Node.js 버전과 호환되어야 합니다.

### 5.2. tsconfig.build.json

빌드 대상에서 테스트 코드나 불필요한 파일을 제외할 수 있습니다.

```json
{
  "extends": "./tsconfig.json",
  "exclude": [
    "node_modules",
    "test",
    "dist",
    "**/*.spec.ts",
    "**/*.e2e-spec.ts"
  ]
}
```

`extends`는 기본 TypeScript 설정을 상속합니다.

`exclude`는 컴파일 대상으로 자동 포함되지 않아야 하는 파일을 지정합니다.

다만 `exclude`는 파일의 Import 관계를 완전히 차단하는 기능이 아닙니다. 제외된 파일도 다른 컴파일 대상에서 Import하면 컴파일 과정에 포함될 수 있습니다.

테스트 코드는 일반적으로 운영 배포 산출물에서 제외합니다.

### 5.3. nest-cli.json

Nest CLI는 `nest-cli.json`을 통해 소스 디렉터리 및 빌드 옵션을 관리할 수 있습니다.

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "builder": "tsc"
  }
}
```

`deleteOutDir`는 빌드 전에 기존 출력 디렉터리를 삭제하도록 설정합니다.

`builder`는 빌드에 사용할 도구를 지정합니다.

지원되는 Builder와 설정 방식은 Nest CLI 버전에 따라 달라질 수 있습니다.

---

## 6. Compiler와 Builder

NestJS는 애플리케이션을 빌드하기 위한 여러 Compiler 또는 Builder를 지원합니다.

대표적으로 다음 기술을 사용할 수 있습니다.

| 도구 | 특징 |
|---|---|
| TypeScript Compiler (`tsc`) | TypeScript 타입 검사 및 JavaScript 컴파일 |
| SWC | Rust 기반의 고속 JavaScript/TypeScript 변환 |
| Rspack | 모듈 번들링을 지원하는 고성능 Bundler |

Nest CLI의 최신 버전에서는 Rspack을 지원하며, 기존 버전에서는 Webpack을 사용하는 프로젝트도 존재합니다.

### 6.1. TypeScript Compiler

TypeScript Compiler는 TypeScript의 타입 검사와 JavaScript 코드 생성을 수행합니다.

```bash
npx nest build --builder tsc
```

TypeScript의 타입 검사 기능을 빌드 과정에 함께 활용할 수 있다는 장점이 있습니다.

### 6.2. SWC

SWC는 TypeScript 및 JavaScript 소스 코드를 빠르게 변환하는 Compiler입니다.

사용하려면 프로젝트에 SWC 관련 패키지가 필요합니다.

```bash
npm install --save-dev @swc/cli @swc/core
```

이후 지원되는 Nest CLI 버전에서는 다음과 같이 빌드할 수 있습니다.

```bash
npx nest build --builder swc
```

SWC를 이용한 변환은 일반적으로 TypeScript의 전체 타입 검사를 수행하지 않습니다.

따라서 별도의 타입 검사를 권장합니다.

```bash
npx tsc --noEmit
```

빌드와 타입 검사를 함께 수행하는 CI/CD 파이프라인을 구성할 수 있습니다.

### 6.3. Rspack

Rspack은 여러 모듈을 하나 이상의 배포용 JavaScript 파일로 묶는 Bundling 기능을 제공합니다.

Nest CLI 버전과 프로젝트 구성에 따라 Rspack을 Builder로 사용할 수 있습니다.

```bash
npx nest build --builder rspack
```

Rspack을 사용하는 경우 다음 항목에 주의해야 합니다.

- Dynamic Import와 런타임 모듈 탐색
- Native Module 및 외부 의존성 처리
- 정적 리소스 포함 여부
- Decorator Metadata 및 Reflection 관련 동작
- 생성된 Entry Point의 위치

Bundler를 사용하는 경우 일반적인 `tsc` 빌드와 배포 산출물 구조가 달라질 수 있습니다.

특히 Nest CLI의 버전별 기본 Builder 및 Bundling 설정이 다르므로, 실제 프로젝트의 설정을 확인해야 합니다.

---

## 7. Build Artifact

Build Artifact는 애플리케이션 빌드 과정에서 생성된 배포 대상 파일을 의미합니다.

일반적인 NestJS 애플리케이션에서는 다음과 같은 파일이 포함될 수 있습니다.

```text
dist/
├── main.js
├── app.module.js
├── app.controller.js
├── app.service.js
├── main.js.map
└── ...
```

### 7.1. JavaScript 파일

`.js` 파일은 Node.js에서 실행할 수 있는 컴파일 결과입니다.

### 7.2. Source Map

`.js.map` 파일은 컴파일된 JavaScript 코드와 원본 TypeScript 코드 사이의 위치 정보를 제공합니다.

운영 환경에서 Error Stack Trace를 분석할 때 도움이 될 수 있습니다.

Node.js에서는 다음 옵션을 사용할 수 있습니다.

```bash
node --enable-source-maps dist/main.js
```

다만 Source Map은 원본 코드 구조에 관한 정보를 포함할 수 있으므로 배포 및 접근 정책을 고려해야 합니다.

### 7.3. 정적 리소스

TypeScript 컴파일만으로 모든 정적 파일이 자동 복사되는 것은 아닙니다.

다음 파일은 별도의 관리가 필요할 수 있습니다.

- GraphQL Schema 파일
- HTML Template
- Email Template
- JSON 설정 파일
- 기타 애플리케이션에서 사용하는 정적 리소스

Nest CLI의 `assets` 옵션을 이용해 필요한 파일을 출력 디렉터리로 복사할 수 있습니다.

예를 들어 다음과 같이 설정할 수 있습니다.

```json
{
  "compilerOptions": {
    "assets": [
      {
        "include": "**/*.hbs",
        "outDir": "dist"
      }
    ],
    "watchAssets": true
  }
}
```

이 설정은 `sourceRoot`를 기준으로 일치하는 Handlebars Template 파일을 빌드 출력 디렉터리에 복사하는 예시입니다.

실제 경로는 프로젝트의 소스 구조 및 Nest CLI 설정에 맞게 확인해야 합니다.

---

## 8. Production Dependency 관리

NestJS 애플리케이션은 컴파일된 JavaScript 파일 외에도 런타임 의존성을 필요로 할 수 있습니다.

Node.js 프로젝트에서는 `package.json`을 이용해 의존성을 관리합니다.

### 8.1. dependencies와 devDependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "typescript": "^5.0.0"
  }
}
```

위 버전은 의존성 분류를 설명하기 위한 예시이며, 실제 설치 시에는 사용하는 NestJS 버전과 Peer Dependency 호환성을 확인해야 합니다.

| 구분 | 설명 |
|---|---|
| `dependencies` | 애플리케이션 실행 시 필요한 패키지 |
| `devDependencies` | 빌드, 테스트, 코드 검사 등 개발 작업에 필요한 패키지 |

일반적인 비번들링 방식의 NestJS 애플리케이션은 실행 시 `@nestjs/core` 등의 런타임 패키지가 필요합니다.

따라서 `dist` 디렉터리만 복사했다고 해서 모든 애플리케이션이 정상적으로 실행되는 것은 아닙니다.

### 8.2. 운영 환경 의존성 설치

빌드가 완료된 배포 환경에서는 다음 명령어로 운영에 필요한 의존성만 설치할 수 있습니다.

```bash
npm ci --omit=dev
```

이 명령어는 `devDependencies`의 패키지를 디스크에 설치하지 않는 방식입니다.

일반적으로 다음 파일들이 필요합니다.

```text
application/
├── dist/
├── node_modules/
├── package.json
└── package-lock.json
```

단, Bundling 구성에 따라 필요한 파일은 달라질 수 있습니다.

### 8.3. 빌드 환경과 실행 환경 분리

운영 환경의 의존성만 설치한 상태에서는 TypeScript Compiler나 Nest CLI가 없을 수 있습니다.

따라서 다음 순서를 권장합니다.

1. 빌드 환경에서 전체 의존성을 설치합니다.
2. TypeScript 타입 검사 및 테스트를 수행합니다.
3. Production Build를 실행합니다.
4. 실행 환경에는 빌드 산출물과 런타임 의존성을 배포합니다.

이를 통해 운영 환경에서 개발 도구에 대한 의존성을 줄일 수 있습니다.

---

## 9. NODE_ENV와 운영 환경 설정

Node.js 생태계에서는 `NODE_ENV` 환경 변수를 이용해 실행 환경을 구분하는 경우가 많습니다.

대표적인 값은 다음과 같습니다.

```text
development
test
production
```

운영 환경에서는 다음과 같이 설정할 수 있습니다.

```bash
NODE_ENV=production node dist/main.js
```

다만 `NODE_ENV=production`이 NestJS 애플리케이션을 자동으로 최적화하거나 Production Build를 수행하는 것은 아닙니다.

`NODE_ENV`는 애플리케이션 또는 외부 라이브러리에서 실행 환경을 판단하는 데 사용할 수 있는 환경 변수입니다.

빌드 과정과 운영 환경 설정은 별개의 책임으로 관리해야 합니다.

예를 들어 애플리케이션 시작 코드를 다음과 같이 작성할 수 있습니다.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port);
}

bootstrap();
```

이 예제는 `PORT` 환경 변수가 존재하면 해당 값을 사용하고, 없으면 `3000` 포트를 사용합니다.

실제 운영 코드에서는 환경 변수의 타입과 유효성을 검증하고, 시작 과정에서 발생하는 오류를 적절하게 처리해야 합니다.

환경 변수 로딩, 검증 및 환경별 설정 파일 구성은 `environment-configuration.md`에서 별도로 다룹니다.

---

## 10. Docker 기반 Production Build

NestJS 애플리케이션은 Docker를 이용해 빌드 및 실행 환경을 컨테이너 이미지로 구성할 수 있습니다.

Docker를 사용하면 애플리케이션 실행에 필요한 Node.js 런타임과 의존성을 함께 패키징할 수 있습니다.

### 10.1. Multi-stage Build

Multi-stage Build는 하나의 Dockerfile에서 빌드 환경과 실행 환경을 분리하는 방식입니다.

```dockerfile
# Build Stage
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build


# Production Stage
FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

이 예제는 다음 사항을 가정합니다.

- npm과 `package-lock.json`을 사용합니다.
- `npm run build`가 정상적으로 정의되어 있습니다.
- 빌드 결과의 Entry Point는 `dist/main.js`입니다.
- 실행 시 추가적인 정적 리소스나 생성 파일이 필요하지 않습니다.
- 애플리케이션이 포트 `3000`으로 실행되도록 설정되어 있습니다.

Node.js 22 이미지는 구성 방법을 설명하기 위한 예시입니다. 실제 운영 환경에서는 배포 시점에 지원되는 LTS 버전과 이미지 보안 업데이트 정책을 확인해야 합니다.

또한 Native Module을 사용하는 경우 빌드 환경과 실행 환경의 운영체제 및 CPU 아키텍처 호환성을 확인해야 합니다.

### 10.2. Dockerfile 동작 과정

| 단계 | 설명 |
|---|---|
| Build Stage | 전체 의존성 설치 및 애플리케이션 컴파일 |
| Production Stage | 운영용 의존성 설치 |
| Artifact 복사 | 컴파일된 `dist` 디렉터리를 실행 이미지로 복사 |
| 환경 설정 | `NODE_ENV=production` 지정 |
| 실행 계정 | 일반 사용자로 프로세스 실행 |
| Entry Point | Node.js로 애플리케이션 실행 |

Multi-stage Build를 사용하면 최종 이미지에 TypeScript Compiler와 Nest CLI 등 빌드 도구를 포함하지 않을 수 있습니다.

다만 최종 이미지 크기와 보안 수준은 Base Image, 실행 의존성 및 추가 파일 구성에 따라 달라집니다.

### 10.3. .dockerignore 설정

Docker Build Context에 불필요한 파일이 포함되지 않도록 `.dockerignore`를 구성합니다.

```dockerignore
node_modules
dist
coverage
.git
.github
.env
.env.*
*.log
```

`.dockerignore`는 Docker Build 과정에서 전송하는 파일을 제한합니다.

민감한 환경 변수 파일을 이미지에 포함하지 않도록 관리해야 합니다.

필요한 런타임 설정은 Docker 실행 시 환경 변수나 Secret 관리 기능을 통해 전달하는 방식을 권장합니다.

### 10.4. 이미지 빌드 및 실행

Dockerfile이 준비되었다면 이미지를 빌드합니다.

```bash
docker build -t nestjs-app:latest .
```

이후 컨테이너를 실행합니다.

```bash
docker run --rm \
  -p 3000:3000 \
  -e NODE_ENV=production \
  nestjs-app:latest
```

애플리케이션이 정상적으로 실행된다면 호스트의 `3000` 포트로 요청을 전달할 수 있습니다.

단, 실행 환경과 애플리케이션의 네트워크 바인딩 설정이 일치해야 합니다.

---

## 11. CI/CD 환경에서의 Build

실제 운영 환경에서는 CI/CD 파이프라인을 통해 빌드와 검증 작업을 자동화하는 경우가 많습니다.

일반적인 과정은 다음과 같습니다.

```text
Source Repository
       |
       v
 Dependency Install
       |
       v
  Static Analysis
       |
       v
     Testing
       |
       v
 Production Build
       |
       v
 Artifact Packaging
       |
       v
 Artifact Registry
       |
       v
    Deployment
       |
       v
 Production Runtime
```

### 11.1. 빌드 검증

CI 환경에서는 다음 작업을 수행할 수 있습니다.

```bash
npm ci
```

```bash
npm run lint
```

```bash
npm run test
```

```bash
npm run build
```

위 명령어는 프로젝트에 해당 npm 스크립트가 정의되어 있다는 전제하에 사용할 수 있습니다.

각 작업을 개별 단계로 구성하면 오류가 발생한 지점을 구분하기 쉽습니다.

### 11.2. Build Once, Deploy Many

운영 환경에서는 동일한 소스 코드와 의존성으로 생성한 빌드 산출물을 여러 환경에서 재사용하는 전략을 고려할 수 있습니다.

예를 들어 다음과 같은 배포 흐름을 구성할 수 있습니다.

```text
Source Code
     |
     v
   Build
     |
     v
Container Image
     |
     +----------> Staging
     |
     +----------> Production
```

이 방식은 환경마다 소스 코드를 다시 컴파일하지 않고 동일한 이미지나 Artifact를 배포하는 것을 목표로 합니다.

단, 환경별로 필요한 설정은 런타임에 주입해야 합니다.

환경별 Secret이나 DB 접속 정보를 빌드 산출물에 직접 포함하면 환경 간 재사용성과 보안성이 저하될 수 있습니다.

또한 배포 버전 추적을 위해 변경 가능한 `latest` 태그만 사용하는 대신 고유한 이미지 태그 또는 Image Digest를 활용할 수 있습니다.

---

## 12. Production Build 관련 주요 문제

### 12.1. Cannot find module 오류

다음과 같은 오류가 발생할 수 있습니다.

```text
Error: Cannot find module '/app/dist/main.js'
```

주요 원인은 다음과 같습니다.

- 빌드를 수행하지 않았습니다.
- `dist` 디렉터리가 존재하지 않습니다.
- 실제 Entry Point 경로가 다릅니다.
- Docker 이미지에 빌드 산출물이 포함되지 않았습니다.

다음 명령어로 출력 파일을 확인할 수 있습니다.

```bash
find dist -name "main.js"
```

실제 파일 경로에 맞게 실행 명령을 수정해야 합니다.

### 12.2. 런타임 의존성 누락

다음과 같은 오류가 발생할 수 있습니다.

```text
Error: Cannot find module '@nestjs/core'
```

이는 실행에 필요한 패키지가 설치되지 않았거나, 런타임에서 패키지를 탐색하지 못하는 경우 발생할 수 있습니다.

다음 사항을 확인해야 합니다.

- 해당 패키지가 `dependencies`에 선언되어 있는지 확인합니다.
- 운영 환경에 필요한 패키지가 설치되었는지 확인합니다.
- Bundler를 사용하는 경우 External Dependency 설정을 확인합니다.
- Monorepo 환경에서는 패키지의 경로 및 참조 관계를 확인합니다.

### 12.3. TypeScript 컴파일 오류

빌드 과정에서 타입 오류가 발생할 수 있습니다.

```text
error TS2322: Type 'string' is not assignable to type 'number'.
```

타입 검사를 수행하는 빌드 구성에서는 TypeScript 오류가 빌드 실패로 이어질 수 있습니다.

SWC와 같이 별도의 타입 검사가 필요한 빌드 구성에서는 다음 명령을 추가할 수 있습니다.

```bash
npx tsc --noEmit
```

실제 프로젝트에서는 빌드 전용 TypeScript 설정을 사용하는지도 확인해야 합니다.

### 12.4. 정적 파일 누락

컴파일된 JavaScript에서 Template이나 JSON 파일을 읽으려고 할 때 해당 파일이 존재하지 않을 수 있습니다.

예를 들어 다음과 같은 코드는 실행 위치에 따라 파일 탐색 문제가 발생할 수 있습니다.

```typescript
import { join } from 'node:path';

const templatePath = join(__dirname, 'templates', 'email.hbs');
```

`__dirname`은 CommonJS 모듈 기준으로 현재 JavaScript 파일이 위치한 디렉터리를 의미합니다.

개발 환경에서는 존재하던 파일이 빌드 결과물에 복사되지 않으면 운영 환경에서 파일을 찾을 수 없습니다.

Nest CLI의 `assets` 설정을 이용해 필요한 파일을 배포 산출물에 포함해야 합니다.

ESM 기반 프로젝트에서는 파일 경로를 처리하는 방식이 달라질 수 있으므로 모듈 형식에 맞는 구현이 필요합니다.

### 12.5. 환경 변수 누락

필수 환경 변수가 누락되면 애플리케이션이 정상적으로 시작되지 않을 수 있습니다.

예를 들어 DB 접속 정보가 정의되지 않으면 데이터베이스 연결 과정에서 오류가 발생할 수 있습니다.

이를 방지하려면 시작 과정에서 환경 변수의 존재 여부와 유효성을 검증해야 합니다.

환경 변수 관리 방식은 `environment-configuration.md`에서 다룹니다.

### 12.6. Native Module 호환성 문제

Native Module을 사용하는 프로젝트에서는 빌드 환경과 실행 환경이 달라 오류가 발생할 수 있습니다.

대표적인 확인 사항은 다음과 같습니다.

- CPU 아키텍처
- 운영체제
- C Library 호환성
- Node.js ABI
- Native Binary의 빌드 및 설치 방식

특히 Alpine 기반 이미지와 Debian 기반 이미지 사이에는 Native Module 호환성 차이가 발생할 수 있습니다.

따라서 Native Module이 포함된 프로젝트에서는 실행 이미지와 호환되는 환경에서 의존성을 설치하거나 빌드해야 합니다.

---

## 13. Production Build 권장 사항

운영 환경에 배포할 NestJS 애플리케이션에서는 다음 사항을 확인하는 것이 좋습니다.

| 항목 | 권장 사항 |
|---|---|
| Node.js | 지원되는 LTS 버전 사용 |
| Dependency | Lockfile 기반 설치 |
| Build | CI/CD에서 재현 가능한 빌드 |
| TypeScript | 컴파일 및 타입 검사 수행 |
| Runtime | 컴파일된 JavaScript 실행 |
| Environment | 운영 환경 설정을 별도로 관리 |
| Secrets | 빌드 산출물에 포함하지 않음 |
| Docker | Multi-stage Build 활용 |
| Security | 최소 권한 사용자로 실행 |
| Artifact | 배포 버전 및 출처 추적 |
| Verification | 빌드 후 실제 실행 테스트 |
| Monitoring | Logging 및 Health Check 구성 |

### 13.1. 빌드와 배포의 책임 분리

Production Build는 배포 가능한 산출물을 생성하는 과정입니다.

Deployment는 생성된 산출물을 실제 실행 환경에 전달하고 애플리케이션을 가동하는 과정입니다.

두 작업은 서로 연결되어 있지만 역할이 다릅니다.

```text
Build
  |
  v
Artifact
  |
  v
Deployment
  |
  v
Application Startup
  |
  v
Health Check
  |
  v
Traffic Serving
```

따라서 컴파일에 성공했다고 해서 운영 환경에서 정상적으로 서비스할 수 있다고 단정할 수 없습니다.

배포 후에도 환경 변수, 네트워크, 외부 시스템 연결 및 애플리케이션 상태를 확인해야 합니다.

### 13.2. 배포 전 검증

운영 환경 배포 전에 다음과 같은 항목을 검증할 수 있습니다.

- 빌드 명령어가 정상적으로 완료되는지 확인합니다.
- 실행에 필요한 Artifact가 생성되었는지 확인합니다.
- 실제 Entry Point를 확인합니다.
- 런타임 의존성만으로 실행할 수 있는지 확인합니다.
- 환경 변수가 정상적으로 주입되는지 확인합니다.
- 애플리케이션 시작 과정에서 예외가 발생하지 않는지 확인합니다.
- 필요한 정적 리소스가 포함되었는지 확인합니다.
- Docker 이미지가 정상적으로 실행되는지 확인합니다.
- Health Check가 정상적으로 응답하는지 확인합니다.

---

## 14. 관련 문서

Production Build와 관련된 상세 주제는 다음 문서에서 다룹니다.

| 문서 | 설명 |
|---|---|
| `environment-configuration.md` | 환경 변수 및 운영 환경 설정 |
| `health-checks.md` | 애플리케이션의 상태 및 준비 여부 확인 |
| `graceful-shutdown.md` | 종료 신호 처리 및 리소스 정리 |
| `performance.md` | 운영 환경 성능 최적화 및 리소스 관리 |

Production Build는 이러한 운영 기능을 실행할 수 있는 애플리케이션을 준비하는 기초 단계입니다.

---

## 15. 정리

NestJS의 Production Build는 TypeScript로 작성된 애플리케이션을 JavaScript로 컴파일하고, 운영 환경에서 실행할 수 있도록 필요한 파일과 의존성을 준비하는 과정입니다.

주요 사항은 다음과 같습니다.

1. **Nest CLI를 이용한 빌드**: `npm run build`를 통해 애플리케이션을 컴파일할 수 있습니다.
2. **TypeScript 설정 관리**: 컴파일 대상, 출력 경로 및 모듈 형식을 프로젝트 환경에 맞게 설정해야 합니다.
3. **빌드 결과 확인**: `dist` 디렉터리와 실제 Entry Point를 확인해야 합니다.
4. **런타임 의존성 분리**: 개발용 도구와 애플리케이션 실행에 필요한 패키지를 구분해야 합니다.
5. **운영 환경 실행**: 사전에 빌드된 JavaScript를 Node.js에서 실행하는 방식을 권장합니다.
6. **Docker 기반 배포**: Multi-stage Build를 이용해 빌드 환경과 실행 환경을 분리할 수 있습니다.
7. **CI/CD 자동화**: 타입 검사, 테스트, 빌드 및 Artifact 생성 과정을 자동화할 수 있습니다.
8. **배포 검증**: 컴파일 성공뿐만 아니라 실제 운영 환경에서의 실행 가능성을 확인해야 합니다.

Production Build 자체는 애플리케이션의 안정성이나 성능을 보장하지 않습니다.

실제 운영 환경에서는 환경 설정, Health Check, Graceful Shutdown, Logging, Monitoring 및 배포 전략 등을 함께 고려해야 합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - Deployment](https://docs.nestjs.com/deployment)
  - NestJS 애플리케이션의 빌드, 운영 환경 실행 및 배포 방법을 설명합니다.

- [NestJS - CLI Overview](https://docs.nestjs.com/cli/overview)
  - Nest CLI의 역할과 주요 명령어를 설명합니다.

- [NestJS - CLI Scripts](https://docs.nestjs.com/cli/scripts)
  - npm Scripts와 Nest CLI 명령어의 관계를 설명합니다.

- [NestJS - CLI Workspaces](https://docs.nestjs.com/cli/monorepo)
  - Standard 및 Monorepo 프로젝트의 빌드 구성과 Builder 설정을 설명합니다.

- [NestJS - SWC](https://docs.nestjs.com/recipes/swc)
  - SWC를 이용한 빌드와 TypeScript 타입 검사 구성을 설명합니다.

- [NestJS - Configuration](https://docs.nestjs.com/application/configuration)
  - 환경 변수와 애플리케이션 설정 관리 방법을 설명합니다.

- [NestJS - Common Errors](https://docs.nestjs.com/faq/common-errors)
  - 애플리케이션 빌드 및 실행 과정에서 발생하는 일반적인 문제를 설명합니다.

### TypeScript 및 Node.js

- [TypeScript - TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
  - TypeScript 컴파일러 옵션과 빌드 설정을 설명합니다.

- [Node.js - Environment Variables](https://nodejs.org/api/environment_variables.html)
  - Node.js 환경 변수의 사용 방법을 설명합니다.

- [Node.js - Modules](https://nodejs.org/api/modules.html)
  - CommonJS 모듈 시스템과 Node.js의 모듈 로딩 방식을 설명합니다.

- [Node.js - ECMAScript Modules](https://nodejs.org/api/esm.html)
  - Node.js에서 ESM을 사용하는 방법을 설명합니다.

### Docker 및 배포

- [Docker - Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
  - Multi-stage Build를 통해 빌드 환경과 실행 환경을 분리하는 방법을 설명합니다.

- [Docker - Building Best Practices](https://docs.docker.com/build/building/best-practices/)
  - 효율적이고 재현 가능한 컨테이너 이미지 구성을 위한 권장 사항을 설명합니다.

- [npm - npm ci](https://docs.npmjs.com/cli/commands/npm-ci)
  - Lockfile을 이용한 의존성 설치 방법을 설명합니다.

- [npm - package.json](https://docs.npmjs.com/cli/configuring-npm/package-json)
  - Dependencies 및 DevDependencies를 포함한 패키지 구성 방법을 설명합니다.