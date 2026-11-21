# Authentication

## 1. 개요

Authentication(인증)은 클라이언트가 주장하는 신원이 유효한지 확인하는 과정입니다.

웹 애플리케이션에서는 사용자가 제출한 계정 정보, 세션, 토큰 또는 외부 Identity Provider의 인증 결과를 검증하여 요청을 보낸 주체를 식별합니다.

NestJS는 인증 방식을 특정 기술로 제한하지 않으며, Module, Provider, Guard 등의 구성 요소를 조합하여 다양한 인증 메커니즘을 구현할 수 있습니다.

대표적인 인증 방식은 다음과 같습니다.

| 인증 방식 | 설명 |
|---|---|
| Session-based Authentication | 서버에 인증 상태를 저장하고 세션 식별자로 사용자를 식별합니다. |
| Token-based Authentication | 클라이언트가 전달한 토큰을 검증하여 사용자를 인증합니다. |
| JWT Authentication | 서명된 JSON Web Token을 사용하여 인증 정보를 검증합니다. |
| OAuth 2.0 / OpenID Connect | 외부 인증 및 권한 위임 체계를 이용합니다. OAuth 2.0은 권한 위임, OpenID Connect는 인증을 담당합니다. |
| API Key Authentication | 사전에 발급한 API Key를 검증하여 API 호출 주체를 식별합니다. |

이 문서에서는 NestJS의 인증 구조를 이해하고, JWT 기반 인증 시스템을 직접 구현하는 방법을 중심으로 설명합니다.

인증에 성공한 사용자의 역할과 권한을 검사하는 Authorization(인가)은 별도의 `authorization.md` 문서에서 설명합니다.

---

## 2. Authentication과 Authorization

Authentication과 Authorization은 서로 밀접하지만 목적이 다른 보안 절차입니다.

### 2.1. Authentication

Authentication은 요청을 수행하는 주체가 누구인지 확인합니다.

대표적인 인증 작업은 다음과 같습니다.

- 사용자 계정 및 비밀번호 검증
- Session ID 검증
- JWT 서명 및 만료 여부 검증
- 외부 Identity Provider의 인증 결과 검증
- 인증된 사용자 정보 식별

예를 들어 사용자가 이메일과 비밀번호를 제출하면 서버는 해당 자격 증명을 검증하고 인증 성공 여부를 결정합니다.

### 2.2. Authorization

Authorization은 인증된 사용자가 특정 리소스에 접근하거나 작업을 수행할 권한이 있는지 확인합니다.

대표적인 인가 작업은 다음과 같습니다.

- 일반 사용자와 관리자의 접근 권한 구분
- 특정 리소스에 대한 읽기 및 수정 권한 검사
- 역할 기반 접근 제어(RBAC)
- 정책 기반 접근 제어(PBAC)
- 리소스 소유권 검증

### 2.3. 비교

| 구분 | Authentication | Authorization |
|---|---|---|
| 목적 | 사용자의 신원 확인 | 사용자의 접근 권한 확인 |
| 핵심 질문 | 누구입니까? | 무엇을 할 수 있습니까? |
| 검증 대상 | Credential, Session, Token | Role, Permission, Policy |
| 실패 시 일반적인 HTTP 상태 | 401 Unauthorized | 403 Forbidden |
| 주요 구성 요소 | AuthService, Authentication Guard | Authorization Guard, Policy |
| 처리 순서 | 일반적으로 먼저 수행 | 일반적으로 인증 이후 수행 |

인증에 성공했다고 해서 모든 리소스에 접근할 수 있는 것은 아닙니다.

인증은 사용자의 신원을 확인하는 단계이고, 인가는 확인된 신원을 기준으로 허용 가능한 작업을 결정하는 단계입니다.

---

## 3. NestJS Authentication 아키텍처

NestJS에서는 인증 기능을 별도의 Module로 구성하는 것이 일반적입니다.

JWT 기반 인증을 직접 구현하는 경우 다음과 같은 구성 요소를 사용할 수 있습니다.

| 구성 요소 | 역할 |
|---|---|
| AuthModule | 인증에 필요한 Provider와 Module을 구성합니다. |
| AuthController | 로그인 등의 인증 API를 제공합니다. |
| AuthService | 자격 증명 검증과 토큰 발급을 담당합니다. |
| UsersService | 사용자 정보를 조회합니다. |
| JwtModule | JWT 서명 및 검증 기능을 제공합니다. |
| JwtService | JWT 생성 및 검증 API를 제공합니다. |
| AuthGuard | 요청에 포함된 JWT를 검증하고 접근 여부를 결정합니다. |
| JwtStrategy | Passport 기반 구현에서 JWT 인증 전략을 정의합니다. |

`JwtStrategy`는 Passport를 사용하는 경우에 필요한 구성 요소이며, 직접 구현한 `AuthGuard`만 사용하는 경우에는 필수가 아닙니다.

### 3.1. 전체 인증 흐름

JWT 기반 인증은 일반적으로 로그인과 인증된 API 요청의 두 단계로 구성됩니다.

**첫 번째 단계: 로그인 및 토큰 발급**

```text
Client
  |
  | POST /auth/login
  | email, password
  v
AuthController
  |
  v
AuthService
  |
  +----> UsersService
  |         |
  |         +----> Database
  |                사용자 조회
  |
  +----> Password Hash Verification
  |
  +----> JwtService.signAsync()
  |
  v
Access Token 발급
  |
  v
Client
```

**두 번째 단계: 인증된 API 요청**

```text
Client
  |
  | GET /auth/profile
  | Authorization: Bearer <access_token>
  v
AuthGuard
  |
  +----> Authorization Header 추출
  |
  +----> JWT 서명 및 만료 검증
  |
  +----> request.user 설정
  |
  v
AuthController
  |
  v
Response
```

이 과정에서 `AuthGuard`는 Controller의 Handler가 실행되기 전에 인증을 수행합니다.

인증에 실패하면 `UnauthorizedException`을 발생시켜 요청을 차단합니다.

---

## 4. JWT 기반 Authentication

JWT(JSON Web Token)는 두 시스템 사이에서 JSON 형태의 Claims를 전달하기 위한 토큰 형식입니다.

JWT는 일반적으로 Header, Payload, Signature로 구성됩니다.

```text
Header.Payload.Signature
```

각 부분은 Base64URL 방식으로 인코딩됩니다.

### 4.1. Header

Header에는 토큰의 유형과 서명 알고리즘 등이 포함됩니다.

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

| 필드 | 설명 |
|---|---|
| alg | JWT 서명 알고리즘 |
| typ | 토큰 유형 |

### 4.2. Payload

Payload에는 사용자를 식별하거나 토큰을 검증하는 데 필요한 Claim이 포함됩니다.

```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "iat": 1760000000,
  "exp": 1760000900
}
```

| Claim | 설명 |
|---|---|
| sub | 토큰의 주체(Subject) |
| email | 애플리케이션에서 정의한 사용자 이메일 |
| iat | 토큰 발급 시각 |
| exp | 토큰 만료 시각 |
| iss | 토큰 발급자 |
| aud | 토큰 대상 시스템 |

JWT Payload는 암호화된 데이터가 아닙니다.

일반적인 서명형 JWT(JWS)는 Payload를 쉽게 디코딩할 수 있으므로 비밀번호, API Secret, 개인정보와 같은 민감한 정보를 포함하지 않아야 합니다.

### 4.3. Signature

Signature는 토큰의 무결성과 발급 주체를 검증하기 위해 사용됩니다.

예를 들어 HS256은 공유 비밀키를 사용하여 서명을 생성하고 검증합니다.

```text
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

클라이언트가 Payload를 변경하면 기존 Signature가 더 이상 유효하지 않으므로 서버에서 검증에 실패합니다.

단, JWT의 서명 검증은 Payload를 암호화하거나 토큰 탈취를 방지하는 기능이 아닙니다.

---

## 5. JWT Authentication 구현

NestJS의 기본 구성 요소와 `@nestjs/jwt`를 사용하여 JWT 인증을 구현할 수 있습니다.

이 예제에서는 Passport를 사용하지 않고 `AuthGuard`를 직접 구현합니다.

예제의 범위는 다음과 같습니다.

1. 사용자 정보 조회
2. 비밀번호 해시 검증
3. Access Token 발급
4. Bearer Token 검증
5. 인증된 사용자 정보 조회

### 5.1. 패키지 설치

```bash
npm install @nestjs/jwt @nestjs/config
npm install bcrypt
npm install class-validator class-transformer
npm install --save-dev @types/bcrypt
```

각 패키지의 역할은 다음과 같습니다.

| 패키지 | 역할 |
|---|---|
| @nestjs/jwt | JWT 생성 및 검증 |
| @nestjs/config | 환경변수 및 애플리케이션 설정 관리 |
| bcrypt | 비밀번호 해싱 및 검증 |
| class-validator | DTO 유효성 검증 |
| class-transformer | DTO 변환 지원 |

`bcrypt`는 비밀번호 해싱을 위한 외부 라이브러리이며 NestJS 자체 기능은 아닙니다.

### 5.2. 디렉터리 구성

```text
src/
├── app.module.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.guard.ts
│   └── dto/
│       └── login.dto.ts
│
└── users/
    ├── users.module.ts
    └── users.service.ts
```

인증 기능은 `auth` 디렉터리에 구성하고, 사용자 데이터 접근 기능은 `users` 디렉터리로 분리합니다.

이 구조는 인증 로직과 사용자 데이터 관리 로직의 책임을 구분하기 위한 예제입니다.

### 5.3. 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다.

```dotenv
JWT_SECRET=<generate-a-strong-random-secret>
JWT_EXPIRES_IN=15m
```

실제 비밀키는 안전한 난수 생성기를 사용하여 생성해야 합니다.

예를 들어 다음 명령어를 사용할 수 있습니다.

```bash
openssl rand -base64 32
```

`.env` 파일에 실제 비밀키가 포함되어 있다면 Git 저장소에 커밋하지 않아야 합니다.

운영 환경에서는 Secret Manager 또는 배포 환경의 보안 설정을 이용하여 비밀키를 주입하는 것이 좋습니다.

### 5.4. AppModule 구성

`@nestjs/config`의 `ConfigModule`을 등록합니다.

```typescript
// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
  ],
})
export class AppModule {}
```

`isGlobal: true`를 설정하면 다른 Module에서 `ConfigModule`을 반복적으로 import하지 않아도 `ConfigService`를 주입받을 수 있습니다.

실제 프로젝트에서는 환경변수 검증을 추가하여 필수 설정값이 누락되었을 때 애플리케이션 시작을 중단하도록 구성하는 것이 좋습니다.

### 5.5. LoginDto 정의

로그인 요청 데이터를 정의합니다.

```typescript
// src/auth/dto/login.dto.ts

import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

DTO는 클라이언트가 제출하는 데이터의 구조를 정의합니다.

데코레이터 기반의 유효성 검증을 실행하려면 `ValidationPipe`가 필요합니다.

```typescript
// src/main.ts

import { ValidationPipe } from '@nestjs/common';

// NestFactory.create() 이후
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

`ValidationPipe`에 관한 자세한 내용은 `03-techniques/validation.md`에서 설명합니다.

### 5.6. UsersService 구성

`UsersService`는 인증에 필요한 사용자 정보를 조회합니다.

```typescript
// src/users/users.service.ts

import { Injectable } from '@nestjs/common';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  async findByEmail(email: string): Promise<User | null> {
    // Repository 또는 ORM을 이용하여
    // 이메일에 해당하는 사용자 정보를 조회합니다.
    throw new Error('Database lookup not implemented');
  }
}
```

위 코드는 사용자 조회를 위한 인터페이스와 Provider 구조를 보여주는 예제입니다.

실제 실행을 위해서는 `findByEmail()`에 데이터베이스 조회 로직을 구현해야 합니다.

사용자의 비밀번호는 평문이 아니라 Salt가 적용된 해시 형태로 저장해야 합니다.

`UsersService`는 인증 과정에서 필요한 사용자 정보를 제공하며, 비밀번호 검증 및 토큰 발급 책임은 `AuthService`에 둡니다.

### 5.7. UsersModule 구성

```typescript
// src/users/users.module.ts

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

`UsersService`를 `exports`에 등록하면 `UsersModule`을 import하는 다른 Module에서도 해당 Provider를 주입받을 수 있습니다.

### 5.8. AuthService 구현

`AuthService`는 사용자 자격 증명 검증과 JWT 발급을 담당합니다.

```typescript
// src/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const isValidPassword = await compare(
      password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      token_type: 'Bearer',
    };
  }
}
```

주요 동작 과정은 다음과 같습니다.

1. `UsersService.findByEmail()`을 호출하여 사용자를 조회합니다.
2. 사용자가 존재하지 않으면 인증에 실패합니다.
3. `bcrypt.compare()`로 비밀번호와 저장된 해시를 비교합니다.
4. 비밀번호가 유효하면 JWT Payload를 생성합니다.
5. `JwtService.signAsync()`를 호출하여 JWT를 발급합니다.
6. 생성한 Access Token을 클라이언트에 반환합니다.

사용자 존재 여부와 비밀번호 오류에 동일한 오류 메시지를 사용하여 계정 존재 여부가 불필요하게 노출되는 것을 줄입니다.

다만 실제 서비스에서는 사용자 조회 성공 여부에 따른 응답 시간 차이까지 고려해야 할 수 있습니다.

### 5.9. AuthModule 구성

```typescript
// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.getOrThrow<string>('JWT_SECRET');

        return {
          secret,
          signOptions: {
            expiresIn: 900,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
```

주요 설정은 다음과 같습니다.

- `UsersModule`: 사용자 조회에 필요한 Provider를 제공합니다.
- `JwtModule.registerAsync()`: 외부 설정을 이용하여 JWT 모듈을 구성합니다.
- `ConfigService`: 환경변수에서 JWT 비밀키를 조회합니다.
- `expiresIn`: 발급된 JWT의 유효기간을 설정합니다.
- `providers`: AuthService와 AuthGuard를 DI 컨테이너에 등록합니다.

여기서는 설명을 단순하게 유지하기 위해 Access Token 만료시간을 900초(15분)로 설정했습니다. 앞서 선언한 `JWT_EXPIRES_IN` 환경변수를 사용하려면 설정값을 읽어 JWT 옵션의 형식에 맞게 전달하면 됩니다.

`getOrThrow()`는 설정값이 없을 때 예외를 발생시킵니다. 단, 비밀키의 길이와 강도까지 검증하는 것은 아니므로 별도의 설정 검증이 필요합니다.

---

## 6. Authentication Guard 구현

Guard는 Controller의 Handler 실행 여부를 결정하는 NestJS 구성 요소입니다.

JWT 인증에서는 Guard를 이용하여 요청에 포함된 토큰을 검증할 수 있습니다.

### 6.1. AuthGuard 정의

```typescript
// src/auth/auth.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<Request>();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<JwtPayload>(token);

      request['user'] = payload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(
    request: Request,
  ): string | undefined {
    const [type, token] =
      request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }
}
```

이 예제는 Express 기반 HTTP Adapter를 가정합니다.

`verifyAsync<JwtPayload>()`의 제네릭 타입은 검증 결과를 TypeScript에서 다루기 위한 형식 지정입니다. 실제 Payload의 구조까지 런타임에서 검증하는 기능은 아니므로, 외부 입력에 대한 추가 검증이 필요할 수 있습니다.

### 6.2. Guard 동작 과정

```text
HTTP Request
    |
    v
AuthGuard.canActivate()
    |
    v
Authorization Header 확인
    |
    v
Bearer Token 추출
    |
    v
JwtService.verifyAsync()
    |
    +---- 실패 ----> 401 Unauthorized
    |
    v
request.user 설정
    |
    v
return true
    |
    v
Controller Handler 실행
```

`JwtService.verifyAsync()`는 JWT의 서명과 만료 여부 등을 검증합니다.

유효한 토큰이라면 Payload를 반환하고, 인증 정보를 `request.user`에 저장합니다.

단, 유효한 서명과 만료시간을 확인했다고 해서 해당 사용자가 현재도 활성 상태이거나 계정이 삭제되지 않았다는 사실까지 보장되는 것은 아닙니다.

이러한 정책이 필요하면 사용자 상태 조회 또는 별도의 토큰 폐기 메커니즘을 추가해야 합니다.

### 6.3. CanActivate 인터페이스

`CanActivate`는 Guard가 구현해야 하는 인터페이스입니다.

```typescript
interface CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean>;
}
```

`canActivate()`는 다음과 같은 방식으로 요청 처리 여부를 결정합니다.

| 결과 | 동작 |
|---|---|
| true | 요청 처리를 계속 진행합니다. |
| false | 기본적으로 403 Forbidden 응답으로 요청을 차단합니다. |
| UnauthorizedException | 401 Unauthorized 응답을 반환합니다. |
| Promise 또는 Observable | 비동기 검증 결과를 이용합니다. |

JWT 인증 실패 시에는 일반적으로 `UnauthorizedException`을 사용하여 401 응답을 반환합니다.

### 6.4. ExecutionContext

`ExecutionContext`는 현재 실행 중인 요청에 대한 정보를 제공합니다.

```typescript
const request = context.switchToHttp().getRequest();
```

위 코드는 HTTP 요청 객체를 추출합니다.

NestJS의 `ExecutionContext`는 HTTP뿐 아니라 WebSocket, RPC 등의 실행 환경도 지원합니다.

단, 각 통신 방식에서 인증 정보를 추출하는 방법은 다를 수 있으므로 해당 환경에 맞는 Guard를 구현해야 합니다.

자세한 내용은 `02-request-lifecycle/execution-context.md`에서 설명합니다.

---

## 7. Controller에 인증 적용

인증 Guard를 Controller 또는 Handler에 적용할 수 있습니다.

### 7.1. AuthController 구현

```typescript
// src/auth/auth.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.signIn(
      loginDto.email,
      loginDto.password,
    );
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@Req() request: Request) {
    return request['user'];
  }
}
```

`@UseGuards(AuthGuard)`는 해당 Handler가 실행되기 전에 `AuthGuard`를 실행하도록 지정합니다.

인증에 성공하면 `getProfile()`에서 `request.user`에 저장된 인증 정보를 사용할 수 있습니다.

### 7.2. 로그인 요청

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "example-password"
}
```

인증에 성공하면 서버는 다음과 같은 응답을 반환합니다.

```json
{
  "access_token": "<signed-jwt>",
  "token_type": "Bearer"
}
```

### 7.3. 인증된 API 요청

```http
GET /auth/profile
Authorization: Bearer <access_token>
```

JWT 검증에 성공하면 다음과 같이 인증 정보를 반환할 수 있습니다.

```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "iat": 1760000000,
  "exp": 1760000900
}
```

이 응답은 Guard에 저장된 JWT Payload를 그대로 반환하는 예제입니다.

실제 서비스에서는 클라이언트에 필요한 필드만 선별하여 반환하는 것이 좋습니다.

---

## 8. Global Authentication Guard

대부분의 API에 인증이 필요하다면 Guard를 전역으로 등록할 수 있습니다.

### 8.1. APP_GUARD 등록

```typescript
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
```

`APP_GUARD`로 등록한 Guard는 기본적으로 애플리케이션의 모든 HTTP Controller에 적용됩니다.

이러한 방식은 인증이 필요한 API마다 `@UseGuards()`를 반복적으로 선언하지 않아도 된다는 장점이 있습니다.

다만 로그인, 회원가입, Health Check 등 인증 없이 접근해야 하는 API는 별도로 처리해야 합니다.

### 8.2. Public 데코레이터

공개 API를 표시하기 위한 Custom Decorator를 정의할 수 있습니다.

```typescript
// src/auth/public.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () =>
  SetMetadata(IS_PUBLIC_KEY, true);
```

`@Public()`은 Handler에 Metadata를 추가합니다.

이 Metadata 자체가 인증을 우회시키는 것은 아니며, Guard에서 이를 해석하는 로직이 필요합니다.

### 8.3. Reflector를 이용한 인증 제외

기존 `AuthGuard`에 `Reflector`를 추가합니다.

```typescript
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if (isPublic) {
      return true;
    }

    // 이후 기존 JWT 검증 로직을 실행합니다.
    // 실제 구현에서는 6.1절의 나머지 로직을 유지합니다.
  }
}
```

위 코드는 Public Metadata 검사 부분을 설명하기 위한 발췌 예제입니다.

`getAllAndOverride()`는 지정한 대상의 Metadata를 우선순위에 따라 조회합니다.

여기서는 Handler 수준의 설정을 Controller 수준의 설정보다 우선적으로 적용합니다.

### 8.4. Public API 적용

```typescript
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.signIn(
      loginDto.email,
      loginDto.password,
    );
  }

  @Get('profile')
  getProfile(@Req() request: Request) {
    return request['user'];
  }
}
```

전역 Guard가 적용된 환경에서도 `@Public()`이 선언된 로그인 API는 인증 없이 호출할 수 있습니다.

---

## 9. Passport 기반 Authentication

NestJS에서는 Passport를 이용하여 다양한 인증 전략을 구현할 수도 있습니다.

Passport는 Node.js 애플리케이션에서 인증 전략을 추상화하는 라이브러리입니다.

NestJS는 `@nestjs/passport` 패키지를 통해 Passport를 NestJS의 Guard 및 DI 구조와 통합합니다.

### 9.1. Passport의 주요 구성 요소

| 구성 요소 | 역할 |
|---|---|
| PassportModule | Passport를 NestJS 애플리케이션에 통합합니다. |
| PassportStrategy | 인증 전략을 NestJS Provider로 정의합니다. |
| LocalStrategy | 사용자 이름과 비밀번호를 검증합니다. |
| JwtStrategy | 요청에 포함된 JWT를 검증합니다. |
| AuthGuard('local') | LocalStrategy를 실행합니다. |
| AuthGuard('jwt') | JwtStrategy를 실행합니다. |

### 9.2. 패키지 설치

```bash
npm install @nestjs/passport passport
npm install passport-local passport-jwt
npm install @nestjs/jwt

npm install --save-dev \
  @types/passport-local \
  @types/passport-jwt
```

### 9.3. JwtStrategy 구현

```typescript
// src/auth/jwt.strategy.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey:
        configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
  }) {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
```

`ExtractJwt.fromAuthHeaderAsBearerToken()`은 HTTP Authorization Header에서 Bearer Token을 추출합니다.

`secretOrKey`는 JWT 검증에 사용할 비밀키를 지정합니다.

`validate()`에서 반환한 객체는 Passport에 의해 `request.user`에 할당됩니다.

JWT 서명과 만료시간 검증은 Passport JWT Strategy가 수행하며, `validate()`는 추가적인 사용자 검증이나 인증 정보 변환에 활용됩니다.

### 9.4. Passport AuthGuard 적용

```typescript
import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('users')
export class UsersController {
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() request: Request) {
    return request.user;
  }
}
```

위 예제를 실행하려면 `JwtStrategy`를 Module의 `providers`에 등록해야 합니다.

Passport를 사용하는 경우에는 `JwtStrategy`와 `AuthGuard('jwt')`가 JWT 검증 흐름을 처리하므로 별도의 수동 JWT 검증 Guard를 반드시 만들 필요는 없습니다.

### 9.5. 직접 구현한 Guard와 Passport 비교

| 항목 | 직접 구현한 AuthGuard | Passport |
|---|---|---|
| JWT 추출 | 개발자가 구현 | ExtractJwt 사용 |
| JWT 검증 | JwtService 사용 | JwtStrategy 사용 |
| 사용자 정보 설정 | 직접 request.user 설정 | Strategy 결과 자동 할당 |
| 인증 전략 확장 | 직접 구현 | 다양한 Strategy 활용 |
| 구조적 특징 | 단순한 인증 흐름 파악에 적합 | 다중 인증 방식 통합에 적합 |

직접 구현한 Guard는 인증 내부 동작을 학습하거나 단순한 인증 구조가 필요한 경우에 적합합니다.

Passport는 Local, JWT 및 외부 Identity Provider 기반 인증을 공통 전략 인터페이스로 관리할 때 유용합니다.

---

## 10. NestJS Authentication 전용 모듈

NestJS에서는 인증 기능을 통합적으로 제공하는 `@nestjs/authentication` 패키지도 사용할 수 있습니다.

이 패키지는 앞서 설명한 `@nestjs/jwt`와 `@nestjs/passport`를 조합한 수동 구현 방식과 구분됩니다.

주요 기능은 다음과 같습니다.

- 서버 측 Session 관리
- 비밀번호 인증과 해싱
- 이메일 주소 검증
- 비밀번호 재설정
- 다중 요소 인증(MFA)
- Magic Link 인증
- OpenID Connect 연동
- Access Token 및 Refresh Token 관리
- API Key 인증

설치는 다음과 같습니다.

```bash
npm install @nestjs/authentication
```

패키지는 `AuthenticationModule`과 인증 관련 Provider, Guard, Decorator 및 서비스를 제공합니다.

특히 전역 Authentication Guard를 기본적으로 등록하고 인증 상태를 읽기 위한 API를 제공하므로, 직접 구현해야 할 공통 인증 코드를 줄일 수 있습니다.

다만 사용자 저장소와 영속적인 인증 데이터 저장소 등 애플리케이션별 구성은 별도로 연결해야 합니다.

인증 메커니즘을 직접 학습하거나 특정 요구사항에 맞게 커스터마이징하려는 경우에는 앞서 설명한 `AuthService`와 `AuthGuard` 기반 구현을 활용할 수 있습니다.

실제 서비스에서는 프로젝트 요구사항과 사용 중인 NestJS 버전을 확인하여 적절한 인증 접근 방식을 선택해야 합니다.

---

## 11. Access Token과 Refresh Token

JWT 기반 인증에서는 Access Token과 Refresh Token을 함께 사용하는 구조가 널리 활용됩니다.

### 11.1. Access Token

Access Token은 보호된 API에 접근할 때 사용됩니다.

일반적으로 짧은 유효기간을 설정하여 토큰 탈취로 인한 위험을 줄입니다.

```http
Authorization: Bearer <access_token>
```

Access Token에는 필요한 최소한의 사용자 식별 정보와 토큰 검증용 Claim을 포함해야 합니다.

### 11.2. Refresh Token

Refresh Token은 Access Token이 만료되었을 때 새로운 Access Token을 발급받는 데 사용됩니다.

```text
Client
   |
   | Access Token 만료
   v
POST /auth/refresh
   |
   | Refresh Token 전송
   v
AuthService
   |
   +----> Refresh Token 검증
   |
   +----> 폐기 및 재사용 여부 확인
   |
   +----> 토큰 회전(Rotation)
   |
   v
새로운 Access Token 발급
```

Refresh Token은 Access Token보다 긴 유효기간을 설정하는 경우가 많습니다.

다만 Refresh Token도 중요한 인증 자격 증명이므로 안전하게 저장하고 관리해야 합니다.

### 11.3. Refresh Token Rotation

Refresh Token Rotation은 Refresh Token을 사용할 때마다 새로운 Refresh Token으로 교체하는 방식입니다.

기존 Refresh Token은 폐기하고 재사용을 감지할 수 있도록 구성합니다.

이 방식은 탈취된 Refresh Token이 장기간 반복 사용되는 위험을 줄이는 데 도움이 됩니다.

단, 토큰 회전만으로 모든 탈취 상황을 방지할 수 있는 것은 아니며, 서버 측 토큰 상태 관리와 재사용 감지 정책이 필요합니다.

---

## 12. Session 기반 Authentication

Session 기반 인증은 인증 상태를 서버 측 저장소에서 관리하는 방식입니다.

### 12.1. 동작 흐름

```text
Client
  |
  | 로그인 요청
  v
Server
  |
  +----> Credential 검증
  |
  +----> Session 생성
  |
  +----> Session Store 저장
  |
  v
Set-Cookie: sessionId=...
  |
  v
Client
  |
  | Cookie 포함 요청
  v
Server
  |
  +----> Session 조회
  |
  +----> 인증 상태 확인
  |
  v
Controller
```

Session 기반 인증은 서버에서 인증 상태를 직접 관리하므로 세션을 즉시 폐기하거나 사용자 로그아웃 상태를 반영하기 쉽습니다.

반면 여러 서버 인스턴스를 운영한다면 공유 Session Store가 필요할 수 있습니다.

### 12.2. Session과 JWT 비교

| 항목 | Session | JWT |
|---|---|---|
| 인증 상태 | 서버 저장소에서 관리 | 일반적으로 토큰에 Claim 포함 |
| 서버 저장소 | 일반적으로 필요 | 서명 및 Claim 검증만으로 처리하는 경우 불필요 |
| 인증 정보 전달 | 주로 Cookie | Authorization Header 또는 Cookie |
| 즉시 폐기 | 서버 측 세션 삭제로 처리 가능 | 별도 폐기 메커니즘이 필요할 수 있음 |
| 수평 확장 | 공유 세션 저장소 고려 | 키 공유 및 상태 검증 정책 고려 |
| 주요 고려사항 | Session Fixation, CSRF | 토큰 탈취, 만료 및 폐기 |

JWT를 사용한다고 해서 반드시 Stateless 인증 구조가 되는 것은 아닙니다.

Refresh Token 관리, 토큰 폐기 목록, 사용자 계정 상태 조회 등을 구현하면 서버 측 상태 관리가 필요할 수 있습니다.

---

## 13. Authentication 보안 고려사항

인증 시스템은 사용자의 신원과 계정 접근을 직접 관리하므로 보안 요구사항을 함께 고려해야 합니다.

### 13.1. 비밀번호 해싱

비밀번호는 평문으로 저장하지 않아야 합니다.

비밀번호 저장에는 Argon2id, scrypt 또는 적절한 비용 인자로 구성한 bcrypt와 같은 전용 Password Hashing 알고리즘을 사용합니다.

```typescript
import { hash, compare } from 'bcrypt';

const passwordHash = await hash(password, 12);

const isValid = await compare(
  password,
  passwordHash,
);
```

단순 SHA-256과 같은 일반 목적 해시 함수를 비밀번호 저장 용도로 직접 사용하는 것은 권장되지 않습니다.

해싱 알고리즘과 비용 인자는 서버 성능 및 보안 요구사항에 맞게 결정해야 합니다.

### 13.2. HTTPS 사용

인증 자격 증명과 토큰은 TLS가 적용된 HTTPS 연결을 통해 전송해야 합니다.

HTTP를 사용하는 경우 통신 경로에서 인증 정보가 노출될 위험이 있습니다.

### 13.3. JWT Secret 관리

JWT 서명에 사용하는 비밀키는 소스 코드에 직접 작성하지 않아야 합니다.

다음 사항을 고려해야 합니다.

- 충분한 엔트로피를 가진 비밀키 사용
- 환경변수 또는 Secret Manager 사용
- 비밀키 접근 권한 제한
- 키 교체 정책 수립
- JWT 알고리즘과 검증 옵션 명시
- 필요에 따라 issuer 및 audience 검증

### 13.4. 토큰 저장

브라우저 클라이언트에서는 인증 토큰을 저장하는 위치에 따라 보안 특성이 달라집니다.

| 저장 방식 | 주요 특징 | 보안 고려사항 |
|---|---|---|
| JavaScript 메모리 | 페이지 실행 중 토큰 유지 | XSS에 의해 노출될 수 있음 |
| localStorage | 브라우저에 지속 저장 | XSS에 의해 읽힐 수 있음 |
| sessionStorage | 탭 단위 저장 | XSS에 의해 읽힐 수 있음 |
| HttpOnly Cookie | JavaScript에서 직접 읽을 수 없음 | CSRF 대응 및 Cookie 속성 설정 필요 |

`HttpOnly`, `Secure`, `SameSite` 속성을 적절하게 설정한 Cookie는 브라우저 기반 인증에 유용합니다.

다만 Cookie를 사용한다고 해서 CSRF 위험이 자동으로 제거되는 것은 아닙니다.

토큰 저장 방식은 프론트엔드와 API 서버의 배치 구조, 인증 정책, XSS 및 CSRF 위협 모델을 함께 고려하여 결정해야 합니다.

### 13.5. Rate Limiting

로그인 API에는 반복적인 비밀번호 추측 공격을 완화하기 위한 Rate Limiting을 적용할 수 있습니다.

NestJS에서는 `@nestjs/throttler`를 사용할 수 있습니다.

이와 함께 다음과 같은 정책을 고려할 수 있습니다.

- IP 및 계정 식별자 기반 요청 제한
- 비정상적인 로그인 시도 모니터링
- 단계적인 지연 또는 추가 인증 요구
- 사용자 계정 열거 방지
- 감사 로그 및 보안 이벤트 기록

계정 단위 제한을 과도하게 적용하면 공격자가 특정 계정의 로그인을 방해할 수 있으므로 서비스 거부 위험도 고려해야 합니다.

자세한 내용은 `04-security/rate-limiting.md`에서 설명합니다.

### 13.6. 토큰 폐기 및 로그아웃

Access Token이 만료되기 전까지 유효한 구조에서는 단순히 클라이언트에서 토큰을 삭제하는 것만으로 서버 측 토큰이 무효화되지는 않습니다.

보안 요구사항에 따라 다음과 같은 방법을 사용할 수 있습니다.

- 짧은 Access Token 만료시간
- Refresh Token 폐기
- Token Revocation List
- Session 또는 Token Version 검사
- 서버 측 인증 상태 관리

특히 비밀번호 변경, 계정 탈퇴 및 보안 사고 발생 시 기존 인증 상태를 어떻게 폐기할지 설계해야 합니다.

---

## 14. Authentication과 NestJS Request Lifecycle

NestJS의 HTTP 요청 처리 과정에서 Guard는 Middleware 이후, Interceptor와 Pipe 이전에 실행됩니다.

일반적인 요청 처리 순서는 다음과 같습니다.

```text
HTTP Request
    |
    v
Middleware
    |
    v
Guard
    |
    +----> Authentication
    |
    +----> Authorization
    |
    v
Interceptor (Before)
    |
    v
Pipe
    |
    v
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

Authentication Guard는 Controller Handler가 실행되기 전에 요청의 신원을 검증합니다.

Authorization Guard가 별도로 존재하는 경우에는 인증된 사용자 정보를 기반으로 권한 검사를 수행하도록 실행 순서를 구성해야 합니다.

참고로 모든 Guard가 자동으로 인증과 인가 순서에 맞춰 실행되는 것은 아닙니다. 실제 실행 순서는 Guard 등록 범위와 등록 순서의 영향을 받습니다.

### 관련 문서

- `01-fundamentals/modules.md`: Module 구성
- `01-fundamentals/providers.md`: Provider와 DI 컨테이너
- `01-fundamentals/dependency-injection.md`: 의존성 주입
- `02-request-lifecycle/guards.md`: Guard의 동작 원리
- `02-request-lifecycle/execution-context.md`: ExecutionContext
- `03-techniques/configuration.md`: 환경변수 및 구성 관리
- `03-techniques/validation.md`: DTO 유효성 검증
- `04-security/authorization.md`: 인증 이후의 접근 권한 검증
- `04-security/encryption-and-hashing.md`: 비밀번호 해싱과 암호화
- `04-security/csrf.md`: Cookie 기반 요청의 CSRF 방어
- `04-security/rate-limiting.md`: 인증 API의 요청 제한

---

## 15. 정리

NestJS의 Authentication은 요청을 수행하는 사용자의 신원을 확인하고, 보호된 API에 접근할 수 있도록 인증 상태를 관리하는 기능입니다.

NestJS는 인증 메커니즘을 하나의 방식으로 제한하지 않으며, Module, Provider, Guard 등을 조합하여 다양한 인증 구조를 구성할 수 있습니다.

핵심 사항은 다음과 같습니다.

1. **AuthModule**은 인증과 관련된 Controller, Provider 및 외부 Module을 구성합니다.
2. **AuthService**는 사용자 자격 증명 검증과 토큰 발급을 담당합니다.
3. **JwtService**는 JWT 생성과 검증 기능을 제공합니다.
4. **AuthGuard**는 요청이 Controller에 도달하기 전에 인증 정보를 검증합니다.
5. **Passport**는 다양한 인증 전략을 NestJS의 공통 구조로 통합합니다.
6. **Session과 JWT**는 서로 다른 인증 상태 관리 특성을 가지므로 애플리케이션 요구사항에 따라 선택해야 합니다.
7. **Authentication과 Authorization**은 별개의 보안 책임이며 인증만으로 리소스 접근 권한이 보장되지는 않습니다.
8. **운영 환경에서는** 비밀번호 해싱, Secret 관리, 토큰 폐기, HTTPS, CSRF 및 Rate Limiting 등의 보안 요구사항을 함께 고려해야 합니다.

인증 구조를 설계할 때는 토큰 발급과 검증 기능뿐 아니라 인증 상태의 수명주기, 사용자 계정 상태, 다중 인스턴스 환경 및 보안 사고 대응까지 고려하는 것이 중요합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS - Passport](https://docs.nestjs.com/recipes/passport)
- [NestJS - Guards](https://docs.nestjs.com/guards)
- [NestJS - Authorization](https://docs.nestjs.com/security/authorization)
- [NestJS - Encryption and Hashing](https://docs.nestjs.com/security/encryption-and-hashing)
- [NestJS - Rate Limiting](https://docs.nestjs.com/security/rate-limiting)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - JWT Authentication REST API Tutorial](https://docs.nestjs.com/tutorials/rest-api-jwt-authentication)

### 인증 및 토큰 관련 표준

- [RFC 7519 - JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 7515 - JSON Web Signature (JWS)](https://www.rfc-editor.org/rfc/rfc7515)
- [RFC 6750 - OAuth 2.0 Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750)
- [RFC 9700 - Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)

### 보안 가이드

- [OWASP - Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP - Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP - Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP - JSON Web Token for Java Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)