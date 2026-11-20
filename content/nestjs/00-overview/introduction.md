# NestJS Introduction

## 1. NestJS란?

**NestJS**는 효율적이고 확장 가능한 Node.js 서버 애플리케이션을 개발하기 위한 Progressive Node.js Framework입니다.

TypeScript를 기반으로 개발되었으며, JavaScript도 지원합니다. 객체지향 프로그래밍(Object-Oriented Programming, OOP), 함수형 프로그래밍(Functional Programming, FP), 함수형 반응형 프로그래밍(Functional Reactive Programming, FRP)의 개념을 결합하여 애플리케이션을 구조적으로 설계하고 개발할 수 있도록 지원합니다.

NestJS는 Express와 Fastify와 같은 기존 Node.js HTTP 프레임워크 위에 추상화 계층을 제공하며, 개발자가 애플리케이션의 비즈니스 로직과 구조에 집중할 수 있도록 다양한 기능을 제공합니다.

주요 특징은 다음과 같습니다.

- **TypeScript 기반 개발:** 정적 타입 검사와 인터페이스 등을 활용하여 안정적인 애플리케이션을 개발할 수 있습니다.
- **모듈 기반 아키텍처:** 애플리케이션을 기능별 Module로 구성하여 관심사를 분리하고 유지보수성을 높일 수 있습니다.
- **Dependency Injection:** Provider 간의 의존성을 관리하고 객체 생성 및 생명주기를 제어할 수 있습니다.
- **데코레이터 기반 선언적 프로그래밍:** Decorator를 활용하여 Controller, Route, Module 및 기타 구성 요소를 선언적으로 정의할 수 있습니다.
- **테스트 지원:** 의존성 주입과 모듈화된 구조를 기반으로 Unit Test 및 E2E Test를 수행할 수 있습니다.
- **다양한 통신 방식 지원:** REST API, GraphQL, WebSocket, Microservices 등 다양한 애플리케이션 유형을 개발할 수 있습니다.

## 2. NestJS를 사용하는 이유

Node.js는 JavaScript 런타임 환경으로, 비동기 I/O 처리와 이벤트 기반 프로그래밍을 활용하여 서버 애플리케이션을 개발할 수 있습니다.

Express와 같은 프레임워크는 HTTP 요청 처리와 라우팅 등 서버 개발에 필요한 기본적인 기능을 제공하지만, 애플리케이션의 전체 아키텍처와 코드 구성 방식까지 강제하지는 않습니다.

따라서 애플리케이션 규모가 커지면 개발자가 직접 다음과 같은 문제를 해결해야 합니다.

- 비즈니스 로직과 HTTP 요청 처리 로직의 분리
- 객체 간 의존성 관리
- 기능별 모듈 및 코드 구성
- 공통 기능의 재사용과 확장
- 테스트 가능한 구조 설계
- 여러 개발자가 함께 작업할 수 있는 일관된 개발 구조 유지

NestJS는 이러한 문제를 해결하기 위해 일관된 애플리케이션 아키텍처와 다양한 개발 기능을 제공합니다.

특히 Angular의 아키텍처에서 영감을 받은 Module, Controller, Provider 및 Dependency Injection 구조를 통해 애플리케이션의 구성 요소와 책임을 명확하게 분리할 수 있습니다.

이를 통해 다음과 같은 개발 환경을 구축할 수 있습니다.

- **Maintainability:** 기능별 책임을 분리하여 코드 변경과 유지보수를 용이하게 합니다.
- **Scalability:** 기능과 도메인이 증가하더라도 구조적으로 확장할 수 있습니다.
- **Testability:** 의존성 주입과 모듈화를 활용하여 개별 구성 요소를 독립적으로 테스트할 수 있습니다.
- **Reusability:** 공통 기능을 Provider 및 Module 형태로 구성하여 재사용할 수 있습니다.
- **Loose Coupling:** 구성 요소 간의 직접적인 의존성을 줄이고 변경에 유연한 구조를 설계할 수 있습니다.

## 3. NestJS의 주요 특징

### 3.1. TypeScript 지원

NestJS는 TypeScript를 기본 개발 언어로 사용합니다.

TypeScript는 JavaScript에 정적 타입 시스템을 추가한 언어로, 컴파일 과정에서 타입 오류를 확인하고 코드의 구조와 계약을 명확하게 표현할 수 있습니다.

NestJS에서는 다음과 같은 TypeScript 기능을 적극적으로 활용합니다.

- Class와 Interface
- Generic
- Enum
- Access Modifier
- Decorator
- Metadata
- Type Annotation

특히 Class와 Decorator를 활용하여 애플리케이션의 구성 요소를 선언하고, Dependency Injection을 통해 객체 간의 의존성을 관리합니다.

NestJS는 TypeScript뿐만 아니라 JavaScript도 지원합니다.

### 3.2. Module 기반 아키텍처

NestJS 애플리케이션은 Module을 중심으로 구성됩니다.

Module은 관련된 기능과 구성 요소를 하나의 논리적인 단위로 묶는 역할을 합니다.

일반적으로 하나의 Module에는 다음과 같은 구성 요소가 포함됩니다.

- **Controller:** 외부 요청을 수신하고 처리할 엔드포인트를 정의합니다.
- **Provider:** 비즈니스 로직과 애플리케이션에서 사용하는 기능을 구현합니다.
- **Imports:** 다른 Module에서 제공하는 기능을 가져옵니다.
- **Exports:** 다른 Module에서 사용할 수 있도록 Provider를 공개합니다.

애플리케이션의 기능을 여러 Module로 분리하면 기능별 책임과 의존 관계를 명확하게 관리할 수 있습니다.

Module의 구체적인 구조와 동작 방식은 `01-fundamentals/modules.md`에서 설명합니다.

### 3.3. Dependency Injection

NestJS는 Dependency Injection(DI)을 기본적인 객체 관리 방식으로 사용합니다.

Dependency Injection은 객체가 필요로 하는 의존 객체를 직접 생성하는 대신 외부에서 전달받도록 하는 설계 방식입니다.

NestJS는 DI Container를 통해 Provider를 등록하고 관리하며, 필요한 구성 요소에 의존성을 주입합니다.

이를 통해 다음과 같은 이점을 얻을 수 있습니다.

- 객체 생성과 사용 책임의 분리
- 구성 요소 간 결합도 감소
- 구현체 교체 및 확장 용이
- 테스트 환경에서 Mock 객체 주입 가능
- 의존성의 일관된 관리

Dependency Injection의 구체적인 동작 원리와 Provider 등록 방식은 `01-fundamentals/` 디렉터리에서 설명합니다.

### 3.4. Decorator 기반 개발

NestJS는 TypeScript의 Decorator를 적극적으로 활용합니다.

Decorator는 클래스, 메서드, 속성 및 매개변수 등에 메타데이터를 부여하거나 선언적인 설정을 적용하는 기능입니다.

NestJS에서는 Decorator를 사용하여 애플리케이션 구성 요소의 역할과 동작을 정의합니다.

대표적인 Decorator는 다음과 같습니다.

| Decorator | 역할 |
|---|---|
| `@Module()` | Module을 정의합니다. |
| `@Controller()` | Controller를 정의합니다. |
| `@Injectable()` | 클래스를 Provider로 사용할 수 있도록 선언합니다. |
| `@Get()` | HTTP GET 요청을 처리하는 Route를 정의합니다. |
| `@Post()` | HTTP POST 요청을 처리하는 Route를 정의합니다. |
| `@Body()` | HTTP Request Body를 추출합니다. |
| `@Param()` | URL 경로 매개변수를 추출합니다. |
| `@Query()` | Query Parameter를 추출합니다. |

Decorator를 활용하면 클래스와 메서드의 역할을 명시적으로 표현할 수 있으며, 반복적인 설정 코드를 줄일 수 있습니다.

### 3.5. 다양한 플랫폼과 통신 방식 지원

NestJS는 특정 HTTP 서버 구현에 종속되지 않는 Platform-Agnostic Framework를 지향합니다.

HTTP 애플리케이션은 Adapter를 통해 다양한 HTTP 서버 플랫폼에서 실행할 수 있습니다.

기본적으로 지원하는 HTTP 플랫폼은 다음과 같습니다.

| 플랫폼 | 설명 |
|---|---|
| Express | 널리 사용되는 Node.js 웹 프레임워크로, NestJS의 기본 HTTP 플랫폼입니다. |
| Fastify | 성능과 낮은 오버헤드에 중점을 둔 Node.js 웹 프레임워크입니다. |
| Node.js HTTP | Node.js에 내장된 `node:http` 모듈을 기반으로 HTTP 서버를 실행합니다. |

또한 NestJS는 HTTP API뿐만 아니라 다양한 통신 방식을 지원합니다.

| 통신 방식 | 설명 |
|---|---|
| REST API | HTTP 기반의 자원 중심 API를 개발합니다. |
| GraphQL | Query와 Mutation 등을 활용하여 API를 개발합니다. |
| WebSocket | 클라이언트와 서버 간 양방향 실시간 통신을 구현합니다. |
| Microservices | 다양한 Transport Layer를 활용하여 서비스 간 메시지 기반 통신을 구현합니다. |
| Server-Sent Events | 서버에서 클라이언트 방향으로 실시간 이벤트를 전달합니다. |

각 통신 방식의 구체적인 구현 방법은 `05-platforms/` 디렉터리에서 설명합니다.

## 4. NestJS의 주요 구성 요소

NestJS 애플리케이션은 여러 구성 요소가 역할을 분담하고 상호작용하는 구조로 설계됩니다.

주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| Module | 관련된 Controller와 Provider를 하나의 기능 단위로 구성합니다. |
| Controller | 외부 요청을 수신하고 적절한 처리 로직으로 전달합니다. |
| Provider | 서비스 로직, 데이터 접근 및 기타 애플리케이션 기능을 제공합니다. |
| Dependency Injection | 구성 요소 간 의존성을 관리하고 필요한 객체를 주입합니다. |
| Middleware | Route Handler 실행 전에 요청을 처리하는 로직을 수행합니다. |
| Guard | 요청의 처리 여부를 결정하며 인증 및 인가 등에 활용됩니다. |
| Interceptor | 요청과 응답을 가로채 공통 로직을 실행하거나 처리 결과를 변환합니다. |
| Pipe | 입력값을 변환하거나 유효성을 검증합니다. |
| Exception Filter | 예외를 처리하고 적절한 응답을 반환합니다. |

이러한 구성 요소는 각각 독립적인 책임을 가지며, NestJS의 애플리케이션 아키텍처와 요청 처리 과정에서 상호작용합니다.

각 구성 요소의 구체적인 역할과 내부 동작 방식은 이후 문서에서 상세하게 설명합니다.

## 5. NestJS 애플리케이션 개발 시작하기

NestJS 프로젝트는 Nest CLI를 사용하여 생성할 수 있습니다.

### 5.1. 사전 요구 사항

NestJS 애플리케이션을 개발하기 위해 다음 환경이 필요합니다.

- Node.js
- npm 또는 다른 Node.js 패키지 관리자
- TypeScript 개발 환경

Node.js의 구체적인 최소 지원 버전은 NestJS 공식 문서의 First Steps에서 확인해야 합니다.

### 5.2. Nest CLI 설치

Nest CLI는 NestJS 프로젝트 생성과 코드 구조 관리를 지원하는 공식 Command Line Interface입니다.

```bash
npm install -g @nestjs/cli
```

### 5.3. 프로젝트 생성

다음 명령어로 새로운 NestJS 프로젝트를 생성합니다.

```bash
nest new project-name
```

프로젝트 생성 과정에서 패키지 관리자를 선택할 수 있습니다.

### 5.4. 애플리케이션 실행

프로젝트 디렉터리로 이동한 후 개발 서버를 실행합니다.

```bash
cd project-name

npm run start:dev
```

`start:dev`는 파일 변경 사항을 감지하여 애플리케이션을 다시 빌드하고 실행하는 개발 모드입니다.

기본 설정에서는 다음 주소로 애플리케이션에 접근할 수 있습니다.

```text
http://localhost:3000
```

정상적으로 실행되면 기본 프로젝트에서 제공하는 `Hello World!` 응답을 확인할 수 있습니다.

## 6. NestJS 학습 방향

NestJS를 효과적으로 이해하려면 개별 API의 사용법뿐만 아니라 프레임워크가 애플리케이션을 구성하고 실행하는 원리를 함께 학습해야 합니다.

본 문서는 다음 순서로 학습 범위를 확장합니다.

| 단계 | 학습 영역 | 주요 내용 |
|---|---|---|
| 1 | Overview | NestJS의 개요, 아키텍처, 요청 처리 과정 및 프로젝트 구조 |
| 2 | Fundamentals | Module, Controller, Provider 및 Dependency Injection |
| 3 | Request Lifecycle | Middleware, Guard, Interceptor, Pipe 및 Exception Filter |
| 4 | Techniques | Configuration, Validation, Database, Cache, Queue 등 |
| 5 | Security | Authentication, Authorization 및 애플리케이션 보안 |
| 6 | Platforms | REST API, GraphQL, WebSocket 및 Microservices |
| 7 | Testing | Unit, Integration 및 E2E Testing |
| 8 | Architecture | 애플리케이션 설계 패턴과 의존성 관리 |
| 9 | Deployment | 운영 환경 구성, 배포 및 성능 관리 |
| 10 | Examples | 학습한 개념을 조합한 실제 구현 예제 |

각 단계에서는 개별 기능의 사용법뿐만 아니라 해당 기능이 필요한 이유, 내부 동작 방식 및 다른 구성 요소와의 관계를 함께 이해하는 것을 목표로 합니다.

## 7. 참고 자료

### 공식 문서

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [NestJS First Steps](https://docs.nestjs.com/first-steps)
- [NestJS Fundamentals](https://docs.nestjs.com/fundamentals)
- [NestJS 공식 GitHub Repository](https://github.com/nestjs/nest)
- [NestJS 공식 Sample Repository](https://github.com/nestjs/nest/tree/master/sample)

### 관련 기술 문서

- [Node.js 공식 문서](https://nodejs.org/docs/latest/api/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [Express 공식 문서](https://expressjs.com/)
- [Fastify 공식 문서](https://fastify.dev/docs/latest/)

---

**관련 문서**

- [architecture.md](./architecture.md)
- [request-lifecycle.md](./request-lifecycle.md)
- [project-structure.md](./project-structure.md)