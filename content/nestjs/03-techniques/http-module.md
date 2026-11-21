# HTTP Module

## 1. 개요

HTTP Module은 NestJS 애플리케이션에서 외부 HTTP API를 호출하기 위해 사용하는 기능입니다.

일반적인 백엔드 애플리케이션은 데이터베이스뿐 아니라 다른 서버나 외부 서비스와도 통신해야 합니다.

예를 들어 다음과 같은 작업을 수행할 수 있습니다.

- 외부 결제 API 호출
- 배송 및 물류 서비스 연동
- 외부 인증 서버와 통신
- 환율 및 금융 데이터 조회
- 다른 마이크로서비스의 REST API 호출
- 외부 서비스에서 데이터를 수집하여 저장

NestJS에서는 이러한 HTTP 클라이언트 기능을 Dependency Injection과 결합하여 사용할 수 있습니다.

HTTP 클라이언트 통합에는 다음 두 가지 방식이 있습니다.

| 구분 | Axios 기반 | Fetch 기반 |
|---|---|---|
| 패키지 | `@nestjs/axios` | `@nestjs/http-client` |
| 모듈 | `HttpModule` | `HttpClientModule` |
| 서비스 | `HttpService` | `HttpClient` |
| HTTP 엔진 | Axios | Node.js Fetch API |
| 반환 타입 | RxJS `Observable` | `Promise` |
| 비동기 처리 | RxJS Operator 또는 `firstValueFrom()` | `async/await` |
| 재시도 | 별도 구현 또는 라이브러리 | 기본 재시도 정책 제공 |
| 여러 외부 API 설정 | 모듈 단위 인스턴스 구성 | Named Client 지원 |

`@nestjs/axios`는 기존 NestJS 프로젝트에서 널리 사용되는 통합 패키지입니다.

최신 NestJS 공식 문서에서는 이를 대체하는 `@nestjs/http-client`도 제공하며, 기존 `@nestjs/axios` 역시 계속 사용할 수 있습니다.

이 문서에서는 파일명과 기존 NestJS 학습 체계를 고려하여 **Axios 기반 `HttpModule`을 먼저 설명하고, Fetch 기반 `HttpClientModule`을 별도 장에서 다룹니다.**

두 패키지는 서로 다른 API를 제공하므로 코드와 설정 옵션을 혼용하지 않아야 합니다.

## 2. HTTP Module이 필요한 이유

### 2.1. 외부 API 통신

NestJS 애플리케이션이 외부 서비스에 HTTP 요청을 전송하는 경우를 생각할 수 있습니다.

```text
Client
   |
   v
NestJS Controller
   |
   v
Application Service
   |
   v
External API Client
   |
   | HTTP Request
   v
External API Server
   |
   | HTTP Response
   v
External API Client
   |
   v
Application Service
   |
   v
Client
```

이 구조에서 NestJS 애플리케이션은 외부 API를 호출하는 HTTP Client 역할을 수행합니다.

외부 서버가 응답하면 데이터를 가공하여 클라이언트에 반환하거나 데이터베이스에 저장할 수 있습니다.

### 2.2. HTTP 통신 로직 분리

외부 API 호출 로직을 Controller에 직접 작성하면 Controller가 HTTP 요청 처리뿐 아니라 외부 시스템과의 통신까지 담당하게 됩니다.

```typescript
@Get('products')
async findProducts() {
  const response = await axios.get(
    'https://api.example.com/products',
  );

  return response.data;
}
```

이러한 방식은 구현이 간단하지만 외부 API의 주소, 인증, Timeout 및 오류 처리 로직이 여러 Controller에 분산될 수 있습니다.

NestJS의 Provider와 HTTP 클라이언트를 활용하면 다음과 같이 구성할 수 있습니다.

```text
ProductsController
       |
       v
ProductsService
       |
       v
ExternalProductsClient
       |
       v
External Products API
```

외부 통신을 별도의 Client 또는 Service로 분리하면 책임을 명확하게 관리할 수 있습니다.

### 2.3. 공통 통신 정책 적용

외부 HTTP 요청에는 다음과 같은 공통 정책이 필요할 수 있습니다.

- Base URL
- 인증 헤더
- Connection 및 Request Timeout
- 재시도
- 오류 코드 변환
- 요청 및 응답 로깅
- Correlation ID 전달
- HTTP Connection 재사용
- Rate Limiting
- Circuit Breaker

이러한 정책을 개별 요청마다 구현하기보다 HTTP Client의 설정과 공통 추상화를 통해 관리하는 것이 좋습니다.

## 3. HTTP 클라이언트의 주요 개념

| 개념 | 설명 |
|---|---|
| HTTP Client | 다른 서버에 HTTP 요청을 전송하는 구성 요소 |
| HTTP Request | 대상 서버로 전송하는 요청 |
| HTTP Response | 대상 서버에서 반환한 응답 |
| Base URL | HTTP 요청의 공통 주소 |
| Request Header | 인증 및 콘텐츠 형식 등의 요청 메타데이터 |
| Query Parameter | URL에 포함되는 조회 조건 |
| Request Body | POST, PUT 등의 요청에서 전달하는 데이터 |
| Timeout | 요청 처리에 허용할 시간 |
| Retry | 실패한 요청을 다시 시도하는 동작 |
| Backoff | 재시도 사이의 대기 시간을 조절하는 전략 |
| HTTP Client Interceptor | HTTP 요청 전송 또는 응답 처리 과정에 개입하는 기능 |
| Observable | 비동기 데이터 흐름을 표현하는 RxJS 추상화 |
| Promise | 비동기 작업의 완료 또는 실패 결과를 표현하는 객체 |

## 4. Axios 기반 HTTP Module

### 4.1. 패키지 설치

Axios 기반 HTTP Module을 사용하려면 다음 패키지를 설치합니다.

```bash
npm install @nestjs/axios axios
```

각 패키지의 역할은 다음과 같습니다.

| 패키지 | 역할 |
|---|---|
| `@nestjs/axios` | NestJS의 DI와 Axios를 통합합니다. |
| `axios` | 실제 HTTP 요청을 수행합니다. |
| `rxjs` | HTTP 응답을 Observable로 처리합니다. |

`rxjs`는 일반적인 NestJS 프로젝트에 이미 포함되어 있지만, 프로젝트의 의존성 구성을 확인해야 합니다.

### 4.2. 프로젝트 구조

외부 상품 API와 통신하는 기능을 예제로 사용합니다.

```text
src/
├── integrations/
│   └── products/
│       ├── interfaces/
│       │   └── external-product.interface.ts
│       ├── external-products.client.ts
│       └── external-products.module.ts
│
├── products/
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── products.module.ts
│
├── app.module.ts
└── main.ts
```

`ExternalProductsClient`는 외부 API 요청과 응답 변환을 담당합니다.

`ProductsService`는 애플리케이션의 상품 관련 비즈니스 로직을 담당합니다.

## 5. HttpModule 등록

`HttpModule`은 Axios 기반 HTTP Client를 NestJS 모듈에 등록합니다.

### 5.1. 기본 등록

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
})
export class ExternalProductsModule {}
```

`HttpModule`은 `HttpService` Provider를 제공합니다.

`HttpService`를 사용하려는 모듈에서는 해당 Provider에 접근할 수 있도록 `HttpModule`을 Import해야 합니다.

### 5.2. register()

`HttpModule.register()`를 사용하면 Axios의 공통 설정을 지정할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ExternalProductsClient } from './external-products.client';

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://api.example.com',
      timeout: 5000,
      maxRedirects: 3,
    }),
  ],
  providers: [ExternalProductsClient],
  exports: [ExternalProductsClient],
})
export class ExternalProductsModule {}
```

주요 설정은 다음과 같습니다.

| 옵션 | 설명 |
|---|---|
| `baseURL` | 요청에 사용할 공통 URL |
| `timeout` | Axios 요청 Timeout, 밀리초 단위 |
| `maxRedirects` | 허용할 최대 Redirect 횟수 |
| `headers` | 공통 요청 헤더 |
| `params` | 공통 Query Parameter |
| `responseType` | 응답 데이터 처리 형식 |
| `validateStatus` | 성공으로 처리할 HTTP 상태 코드 범위 |
| `httpAgent` | HTTP Connection 관리 |
| `httpsAgent` | HTTPS Connection 관리 |

이 설정은 내부 Axios 인스턴스에 전달됩니다.

### 5.3. HttpModule.register()의 특징

`HttpModule.register()`는 Dynamic Module 방식으로 동작합니다.

모듈에 전달한 설정값을 기반으로 `HttpService`가 사용할 Axios 인스턴스를 구성합니다.

```text
ExternalProductsModule
        |
        v
HttpModule.register()
        |
        v
HttpService Provider
        |
        v
Axios Instance
        |
        v
External HTTP API
```

서로 다른 외부 API를 호출해야 하는 경우에는 각 외부 API에 대응하는 통합 모듈을 분리하는 방식이 유용합니다.

## 6. HttpService

`HttpService`는 Axios 기반 HTTP 요청 메서드를 제공하는 NestJS Provider입니다.

### 6.1. Dependency Injection

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ExternalProductsClient {
  constructor(
    private readonly httpService: HttpService,
  ) {}
}
```

NestJS의 DI Container는 `HttpModule`이 등록한 `HttpService`를 생성자에 주입합니다.

### 6.2. 주요 HTTP 메서드

| 메서드 | 역할 |
|---|---|
| `get()` | GET 요청 |
| `post()` | POST 요청 |
| `put()` | PUT 요청 |
| `patch()` | PATCH 요청 |
| `delete()` | DELETE 요청 |
| `head()` | HEAD 요청 |
| `options()` | OPTIONS 요청 |
| `request()` | 사용자 정의 Axios 요청 |

예를 들어 다음과 같이 호출할 수 있습니다.

```typescript
this.httpService.get('/products');
```

```typescript
this.httpService.post('/products', {
  name: 'Product A',
});
```

```typescript
this.httpService.delete('/products/100');
```

`HttpService`의 메서드는 `AxiosResponse`를 포함하는 RxJS `Observable`을 반환합니다.

## 7. Observable과 AxiosResponse

### 7.1. Observable 반환

```typescript
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';

findAll(): Observable<AxiosResponse<Product[]>> {
  return this.httpService.get<Product[]>(
    '/products',
  );
}
```

여기서 `Product`는 외부 API 응답의 데이터 구조를 표현하는 TypeScript Interface 또는 타입입니다.

실제 요청 결과는 다음과 유사한 구조를 갖습니다.

```typescript
interface AxiosResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: unknown;
  config: unknown;
  request?: unknown;
}
```

실제 `AxiosResponse` 타입에는 보다 구체적인 Axios 관련 타입이 정의되어 있습니다.

### 7.2. 응답 데이터 추출

HTTP 요청 결과에서 실제 데이터만 사용하려면 RxJS의 `map()` Operator를 사용할 수 있습니다.

```typescript
import { map, Observable } from 'rxjs';

findAll(): Observable<Product[]> {
  return this.httpService
    .get<Product[]>('/products')
    .pipe(
      map((response) => response.data),
    );
}
```

이 방식은 Observable 기반 흐름을 유지합니다.

### 7.3. firstValueFrom()

`async/await`를 사용하려면 Observable을 Promise로 변환할 수 있습니다.

```typescript
import { firstValueFrom } from 'rxjs';

async findAll(): Promise<Product[]> {
  const response = await firstValueFrom(
    this.httpService.get<Product[]>(
      '/products',
    ),
  );

  return response.data;
}
```

`firstValueFrom()`은 Observable에서 처음 전달된 값을 Promise로 반환합니다.

일반적인 Axios HTTP 요청은 한 번의 응답을 반환하므로 이 방식으로 처리할 수 있습니다.

### 7.4. lastValueFrom()

`lastValueFrom()`은 Observable이 완료될 때 마지막으로 전달된 값을 반환합니다.

```typescript
import { lastValueFrom } from 'rxjs';

const response = await lastValueFrom(
  this.httpService.get<Product[]>(
    '/products',
  ),
);
```

일반적인 단일 HTTP 응답에서는 `firstValueFrom()`과 `lastValueFrom()`이 동일한 데이터를 반환할 수 있습니다.

하지만 여러 값을 방출하거나 완료되지 않는 Observable에서는 동작이 달라집니다.

특별한 이유가 없다면 단일 HTTP 응답을 Promise로 변환할 때 `firstValueFrom()`을 사용하는 것이 이해하기 쉽습니다.

## 8. GET 요청

### 8.1. 기본 조회

외부 상품 API가 다음 응답을 반환한다고 가정합니다.

```json
[
  {
    "id": 1,
    "name": "Product A",
    "price": 10000
  },
  {
    "id": 2,
    "name": "Product B",
    "price": 20000
  }
]
```

응답 타입을 정의합니다.

`interfaces/external-product.interface.ts`

```typescript
export interface ExternalProduct {
  id: number;
  name: string;
  price: number;
}
```

HTTP Client를 구현합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { ExternalProduct } from './interfaces/external-product.interface';

@Injectable()
export class ExternalProductsClient {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  async findAll(): Promise<ExternalProduct[]> {
    const { data } = await firstValueFrom(
      this.httpService.get<ExternalProduct[]>(
        '/products',
      ),
    );

    return data;
  }
}
```

### 8.2. Query Parameter

Axios에서는 `params` 옵션을 사용하여 Query Parameter를 전달합니다.

```typescript
const { data } = await firstValueFrom(
  this.httpService.get<ExternalProduct[]>(
    '/products',
    {
      params: {
        page: 1,
        limit: 20,
        category: 'electronics',
      },
    },
  ),
);
```

요청 URL은 다음과 유사합니다.

```http
GET /products?page=1&limit=20&category=electronics
```

Query Parameter를 문자열로 직접 연결하기보다 `params` 옵션으로 전달하면 URL 인코딩을 보다 일관되게 처리할 수 있습니다.

### 8.3. Path Parameter

```typescript
async findOne(
  id: number,
): Promise<ExternalProduct> {
  const { data } = await firstValueFrom(
    this.httpService.get<ExternalProduct>(
      `/products/${encodeURIComponent(String(id))}`,
    ),
  );

  return data;
}
```

Path Parameter에 외부 입력이 포함되는 경우에는 올바른 인코딩과 유효성 검증을 수행해야 합니다.

## 9. POST, PUT, PATCH, DELETE 요청

### 9.1. POST

```typescript
async create(
  product: {
    name: string;
    price: number;
  },
): Promise<ExternalProduct> {
  const { data } = await firstValueFrom(
    this.httpService.post<ExternalProduct>(
      '/products',
      product,
    ),
  );

  return data;
}
```

Axios의 `post()`는 두 번째 인자로 요청 Body를 전달합니다.

### 9.2. PUT

```typescript
await firstValueFrom(
  this.httpService.put(
    '/products/100',
    {
      name: 'Updated Product',
      price: 15000,
    },
  ),
);
```

PUT은 일반적으로 리소스의 전체 상태를 생성하거나 교체하는 의미로 사용됩니다.

### 9.3. PATCH

```typescript
await firstValueFrom(
  this.httpService.patch(
    '/products/100',
    {
      price: 18000,
    },
  ),
);
```

PATCH는 리소스의 일부 변경을 표현하는 데 사용됩니다.

### 9.4. DELETE

```typescript
await firstValueFrom(
  this.httpService.delete(
    '/products/100',
  ),
);
```

실제 요청의 의미와 허용되는 HTTP Method는 외부 API의 계약에 따라 달라집니다.

## 10. HttpModule.registerAsync()

외부 API 주소나 인증 정보가 실행 환경에 따라 달라지는 경우에는 `registerAsync()`를 사용할 수 있습니다.

### 10.1. 패키지 설치

환경 변수 기반 설정에 `@nestjs/config`를 사용합니다.

```bash
npm install @nestjs/config
```

### 10.2. 환경 변수

`.env`

```env
PRODUCT_API_BASE_URL=https://api.example.com
PRODUCT_API_KEY=example-api-key
PRODUCT_API_TIMEOUT=5000
```

실제 API Key는 Git 저장소에 포함하지 않아야 합니다.

### 10.3. 비동기 모듈 등록

```typescript
import { Module } from '@nestjs/common';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import { HttpModule } from '@nestjs/axios';

import { ExternalProductsClient } from './external-products.client';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService,
      ) => ({
        baseURL:
          configService.getOrThrow<string>(
            'PRODUCT_API_BASE_URL',
          ),
        timeout: Number(
          configService.get<string>(
            'PRODUCT_API_TIMEOUT',
            '5000',
          ),
        ),
        headers: {
          'X-API-Key':
            configService.getOrThrow<string>(
              'PRODUCT_API_KEY',
            ),
        },
      }),
    }),
  ],
  providers: [ExternalProductsClient],
  exports: [ExternalProductsClient],
})
export class ExternalProductsModule {}
```

`registerAsync()`는 NestJS DI를 이용하여 외부 설정 Provider에 접근할 수 있습니다.

### 10.4. HttpModuleOptionsFactory

설정 로직이 복잡한 경우 `HttpModuleOptionsFactory`를 구현할 수 있습니다.

```typescript
import { Injectable } from '@nestjs/common';

import {
  HttpModuleOptions,
  HttpModuleOptionsFactory,
} from '@nestjs/axios';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductHttpConfig
  implements HttpModuleOptionsFactory
{
  constructor(
    private readonly configService: ConfigService,
  ) {}

  createHttpOptions(): HttpModuleOptions {
    return {
      baseURL:
        this.configService.getOrThrow<string>(
          'PRODUCT_API_BASE_URL',
        ),
      timeout: 5000,
    };
  }
}
```

해당 클래스는 `registerAsync()`의 `useClass` 또는 `useExisting` 방식과 결합하여 사용할 수 있습니다.

## 11. 요청 헤더와 인증

외부 API는 다양한 인증 방식을 사용할 수 있습니다.

대표적인 방식은 다음과 같습니다.

- API Key
- Bearer Token
- Basic Authentication
- OAuth 2.0 Access Token
- 서명 기반 인증

### 11.1. API Key

```typescript
await firstValueFrom(
  this.httpService.get('/products', {
    headers: {
      'X-API-Key': apiKey,
    },
  }),
);
```

### 11.2. Bearer Token

```typescript
await firstValueFrom(
  this.httpService.get('/users/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }),
);
```

### 11.3. 공통 헤더

모든 요청에 동일한 인증 정보가 필요한 경우 `HttpModule.register()`에서 공통 헤더를 지정할 수 있습니다.

```typescript
HttpModule.register({
  baseURL: 'https://api.example.com',
  headers: {
    Accept: 'application/json',
    'X-API-Key': 'example-api-key',
  },
});
```

실제 프로젝트에서는 인증 정보를 환경 변수 또는 Secret 관리 기능에서 가져오는 것이 좋습니다.

### 11.4. 인증 정보 전달 시 주의사항

외부 API 인증 정보는 요청 로그에 그대로 기록하지 않는 것이 좋습니다.

또한 인증 헤더가 설정된 HTTP Client에서 신뢰할 수 없는 URL로 요청을 보내지 않도록 해야 합니다.

특히 Redirect가 발생할 수 있는 경우 인증 정보가 다른 Origin으로 전달되지 않도록 Redirect 정책을 검토해야 합니다.

## 12. Timeout

Timeout은 외부 API가 일정 시간 안에 응답하지 않을 때 요청을 실패로 처리하기 위한 설정입니다.

### 12.1. Axios Timeout

```typescript
HttpModule.register({
  timeout: 5000,
});
```

이 설정은 Axios 요청의 Timeout을 5,000ms로 지정합니다.

Timeout이 발생하면 Axios는 요청을 거부하고 오류를 반환합니다.

Axios의 실제 Timeout 동작은 사용하는 Adapter와 요청 단계에 영향을 받을 수 있으므로 전체 요청의 절대적인 Deadline과 동일하다고 가정해서는 안 됩니다.

### 12.2. 요청별 Timeout

```typescript
const response = await firstValueFrom(
  this.httpService.get('/products', {
    timeout: 3000,
  }),
);
```

요청별 설정은 HTTP Client의 기본 Timeout을 덮어쓸 수 있습니다.

### 12.3. RxJS timeout()

RxJS에서는 `timeout()` Operator를 사용할 수도 있습니다.

```typescript
import {
  firstValueFrom,
  timeout,
} from 'rxjs';

const response = await firstValueFrom(
  this.httpService.get('/products').pipe(
    timeout(3000),
  ),
);
```

RxJS의 `timeout()`은 지정된 시간 안에 Observable이 값을 방출하지 않으면 Timeout 오류를 발생시킵니다.

`HttpService`의 Observable에서 구독이 취소되면 연관된 Axios 요청 취소가 시도됩니다.

다만 RxJS Timeout과 Axios Timeout은 서로 다른 계층의 기능입니다.

운영 환경에서는 요청 취소와 전체 Deadline 정책을 명확하게 구성해야 합니다.

## 13. HTTP 오류 처리

외부 API는 다음과 같은 이유로 요청에 실패할 수 있습니다.

- 잘못된 요청 데이터
- 인증 실패
- 접근 권한 부족
- 요청한 리소스 없음
- 외부 서버 오류
- 네트워크 연결 실패
- DNS 오류
- Timeout

### 13.1. AxiosError

Axios는 HTTP 응답 오류 또는 네트워크 오류에 대한 정보를 `AxiosError`로 제공합니다.

```typescript
import axios from 'axios';

try {
  await firstValueFrom(
    this.httpService.get('/products'),
  );
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error(error.code);
    console.error(error.response?.status);
  }
}
```

주요 속성은 다음과 같습니다.

| 속성 | 설명 |
|---|---|
| `message` | 오류 메시지 |
| `code` | Axios 또는 네트워크 오류 코드 |
| `response` | 서버가 반환한 HTTP 응답 |
| `request` | 전송된 요청 관련 정보 |
| `config` | Axios 요청 설정 |
| `status` | HTTP 응답 상태 코드 |

`response`가 존재하는 오류와 응답을 받지 못한 네트워크 오류는 구분해야 합니다.

### 13.2. 외부 오류의 내부 오류 변환

외부 API의 오류를 그대로 클라이언트에 전달하면 내부 시스템 정보가 노출될 수 있습니다.

따라서 애플리케이션의 API 계약에 맞게 오류를 변환하는 것이 좋습니다.

```typescript
import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';

@Injectable()
export class ExternalProductsClient {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  async findAll(): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get('/products'),
      );

      return data;
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT'
        )
      ) {
        throw new GatewayTimeoutException(
          'External product API timed out',
        );
      }

      throw new BadGatewayException(
        'External product API request failed',
      );
    }
  }
}
```

이 예제는 외부 API 장애를 HTTP 502 또는 504로 변환하는 단순한 정책입니다.

실무에서는 외부 API가 반환한 400, 401, 403, 404 등의 응답을 무조건 502로 변환하지 않고 비즈니스 요구사항에 맞게 구분할 수 있습니다.

## 14. RxJS 기반 오류 처리

Observable을 유지하는 경우 RxJS Operator를 사용하여 오류를 처리할 수 있습니다.

### 14.1. catchError()

```typescript
import {
  BadGatewayException,
} from '@nestjs/common';

import {
  catchError,
  map,
  Observable,
} from 'rxjs';

findAll(): Observable<ExternalProduct[]> {
  return this.httpService
    .get<ExternalProduct[]>('/products')
    .pipe(
      map((response) => response.data),
      catchError(() => {
        throw new BadGatewayException(
          'Product API unavailable',
        );
      }),
    );
}
```

`catchError()`는 Observable에서 발생한 오류를 처리할 수 있도록 합니다.

### 14.2. retry()

RxJS는 실패한 Observable을 다시 구독하는 `retry()` Operator를 제공합니다.

```typescript
import {
  retry,
  timeout,
} from 'rxjs';

const result$ = this.httpService
  .get('/products')
  .pipe(
    timeout(3000),
    retry({
      count: 2,
      delay: 1000,
    }),
  );
```

위 예제에서는 최초 요청이 실패하면 최대 두 번 추가로 재시도할 수 있습니다.

`retry()`는 기본적으로 모든 오류를 재시도 대상으로 취급할 수 있으므로 실제 프로젝트에서는 재시도 가능한 오류를 구분해야 합니다.

특히 인증 실패나 잘못된 요청처럼 반복해도 성공할 가능성이 낮은 오류는 재시도하지 않는 것이 적절합니다.

## 15. Retry와 Backoff

Retry는 외부 시스템의 일시적인 오류를 복구하기 위한 전략입니다.

### 15.1. Retry가 필요한 상황

다음과 같은 경우 재시도를 고려할 수 있습니다.

- 일시적인 네트워크 오류
- HTTP 502 Bad Gateway
- HTTP 503 Service Unavailable
- HTTP 504 Gateway Timeout
- HTTP 429 Too Many Requests

다만 모든 5xx 응답이나 Timeout이 반드시 안전하게 재시도할 수 있는 오류는 아닙니다.

### 15.2. Fixed Backoff

Fixed Backoff는 재시도 사이에 동일한 대기 시간을 적용합니다.

```text
Request
   |
   +-- Failure
   |
   v
Wait 1 second
   |
   v
Retry 1
   |
   +-- Failure
   |
   v
Wait 1 second
   |
   v
Retry 2
```

### 15.3. Exponential Backoff

Exponential Backoff는 재시도가 반복될수록 대기 시간을 증가시킵니다.

```text
Attempt 1
   |
   +-- Failure
   |
   v
Wait 1 second
   |
   v
Attempt 2
   |
   +-- Failure
   |
   v
Wait 2 seconds
   |
   v
Attempt 3
```

여러 클라이언트가 동시에 재시도하는 상황을 줄이려면 Jitter를 함께 사용할 수 있습니다.

### 15.4. 멱등성

HTTP GET과 같이 일반적으로 멱등적인 요청은 재시도를 적용하기 쉽습니다.

반면 결제 승인, 주문 생성 등 부수 효과가 있는 요청은 중복 실행의 위험이 있습니다.

예를 들어 POST 요청이 외부 서버에서 성공했지만 응답만 유실되었다면 같은 요청을 재시도할 때 중복 결제가 발생할 수 있습니다.

이러한 작업에는 외부 API가 제공하는 Idempotency Key와 중복 처리 방지 정책이 필요합니다.

### 15.5. 재시도 정책의 권장 사항

- 최대 재시도 횟수를 제한합니다.
- 재시도 가능한 오류를 명확하게 구분합니다.
- Timeout과 Backoff를 함께 고려합니다.
- 여러 계층에서 재시도가 중첩되지 않도록 합니다.
- 중복 실행 시 데이터 정합성을 확인합니다.
- 외부 API의 Rate Limit 및 `Retry-After`를 존중합니다.

## 16. Axios Interceptors

Axios는 HTTP 요청 전송과 응답 처리를 가로채는 Interceptor 기능을 제공합니다.

이는 NestJS의 `NestInterceptor`와 다른 기능입니다.

### 16.1. Axios Interceptor와 NestJS Interceptor

| 구분 | Axios Interceptor | NestJS Interceptor |
|---|---|---|
| 소속 | Axios | NestJS |
| 적용 대상 | 외부 HTTP 요청 및 응답 | Controller 또는 Handler 실행 |
| 주요 목적 | 외부 API 공통 정책 | 애플리케이션 요청 처리 정책 |
| 대표 기능 | 인증 헤더, 응답 오류 변환 | 로깅, 직렬화, 캐싱 |
| 접근 방식 | Axios Instance | ExecutionContext, CallHandler |

### 16.2. axiosRef

`HttpService`는 내부 Axios 인스턴스에 접근할 수 있도록 `axiosRef`를 제공합니다.

```typescript
const axiosInstance = this.httpService.axiosRef;
```

이 객체는 일반적인 Axios Instance입니다.

### 16.3. Request Interceptor

```typescript
this.httpService.axiosRef.interceptors.request.use(
  (config) => {
    config.headers.set(
      'X-Client-Name',
      'nestjs-app',
    );

    return config;
  },
);
```

요청이 전송되기 전에 공통 헤더를 추가할 수 있습니다.

### 16.4. Response Interceptor

```typescript
this.httpService.axiosRef.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);
```

응답의 성공 또는 실패 결과를 공통으로 처리할 수 있습니다.

### 16.5. Interceptor 등록 시 주의사항

Axios Interceptor를 요청마다 반복적으로 등록하면 동일한 Interceptor가 계속 누적될 수 있습니다.

따라서 일반적으로 Client 초기화 시 한 번 등록해야 합니다.

예를 들어 `onModuleInit()`에서 등록할 수 있습니다.

```typescript
import {
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';

@Injectable()
export class ExternalApiClient
  implements OnModuleInit
{
  constructor(
    private readonly httpService: HttpService,
  ) {}

  onModuleInit(): void {
    this.httpService.axiosRef.interceptors.request.use(
      (config) => {
        config.headers.set(
          'X-Application',
          'nestjs',
        );

        return config;
      },
    );
  }
}
```

이때 Axios 인스턴스를 공유하는 다른 Provider에도 Interceptor가 영향을 줄 수 있습니다.

따라서 인증 정보와 정책이 다른 외부 API는 가능한 한 별도의 Client로 분리하는 것이 좋습니다.

## 17. 응답 데이터 검증

HTTP 요청이 성공했다고 해서 외부 API 응답이 항상 예상한 구조를 갖는 것은 아닙니다.

예를 들어 다음과 같은 코드를 작성할 수 있습니다.

```typescript
const { data } = await firstValueFrom(
  this.httpService.get<ExternalProduct>(
    '/products/1',
  ),
);
```

여기서 `ExternalProduct` 제네릭 타입은 TypeScript의 정적 타입 검사에 사용됩니다.

런타임에서 외부 API 응답을 실제로 검증하지는 않습니다.

### 17.1. 외부 응답 검증이 필요한 이유

외부 API의 응답 형식은 다음과 같은 이유로 변경될 수 있습니다.

- API 버전 변경
- 필수 필드 누락
- 데이터 타입 변경
- 오류 응답 구조 변경
- 외부 시스템의 예상하지 못한 동작

따라서 외부 API와의 계약이 중요하다면 런타임 검증을 고려해야 합니다.

### 17.2. Zod 기반 검증

Zod를 사용하는 예제입니다.

```bash
npm install zod
```

```typescript
import { z } from 'zod';

const productSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  price: z.number().nonnegative(),
});

type Product = z.infer<typeof productSchema>;
```

HTTP 응답을 검증합니다.

```typescript
async findOne(id: number): Promise<Product> {
  const { data } = await firstValueFrom(
    this.httpService.get<unknown>(
      `/products/${id}`,
    ),
  );

  return productSchema.parse(data);
}
```

`parse()`는 응답이 스키마를 만족하지 않으면 예외를 발생시킵니다.

외부 응답 검증 오류를 클라이언트의 잘못된 요청으로 처리하기보다 Upstream Contract 오류로 취급하는 것이 적절합니다.

## 18. Circuit Breaker

Circuit Breaker는 외부 시스템에 장애가 발생했을 때 실패할 가능성이 높은 요청을 지속적으로 보내지 않도록 제어하는 패턴입니다.

NestJS의 Axios 기반 `HttpModule` 자체가 Circuit Breaker를 자동 제공하는 것은 아닙니다.

필요한 경우 Opossum과 같은 라이브러리를 사용할 수 있습니다.

### 18.1. 동작 상태

Circuit Breaker는 일반적으로 다음 상태를 갖습니다.

| 상태 | 설명 |
|---|---|
| CLOSED | 외부 요청을 정상적으로 전달합니다. |
| OPEN | 외부 요청을 차단하고 빠르게 실패 처리합니다. |
| HALF_OPEN | 일부 요청을 허용하여 복구 여부를 확인합니다. |

### 18.2. 기본 흐름

```text
CLOSED
   |
   | Failures exceed threshold
   v
OPEN
   |
   | Recovery timeout
   v
HALF_OPEN
   |
   +-- Success --> CLOSED
   |
   +-- Failure --> OPEN
```

### 18.3. Retry와 Circuit Breaker의 차이

| 구분 | Retry | Circuit Breaker |
|---|---|---|
| 목적 | 일시적인 실패 복구 | 반복적인 실패 요청 차단 |
| 동작 | 요청 재실행 | 요청 실행 제한 |
| 주요 설정 | 횟수, Backoff | 실패 임계값, 복구 시간 |
| 장애 시 효과 | 성공 가능성 증가 | 외부 시스템과 클라이언트의 부하 감소 |

Retry와 Circuit Breaker를 함께 사용할 수 있지만 적용 순서와 실패 집계 정책을 신중하게 설계해야 합니다.

장애 상황에서 무분별한 재시도는 오히려 외부 시스템의 부하를 증가시킬 수 있습니다.

## 19. Connection Pool과 Keep-Alive

Node.js에서 외부 HTTP 요청을 자주 발생시키는 경우 TCP 연결을 재사용하면 연결 생성 비용을 줄일 수 있습니다.

### 19.1. HTTP Agent

Axios의 Node.js HTTP Adapter에서는 `httpAgent`와 `httpsAgent`를 사용할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import http from 'node:http';
import https from 'node:https';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 50,
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        maxSockets: 50,
      }),
    }),
  ],
})
export class ExternalApiModule {}
```

위 예제는 연결 재사용 정책을 명시적으로 설정한 것입니다.

최신 Node.js 버전에서는 기본 Agent의 Keep-Alive 동작이 이전 버전과 다를 수 있으므로 현재 런타임 설정을 확인해야 합니다.

### 19.2. maxSockets

`maxSockets`는 Agent가 목적지별로 유지할 수 있는 활성 Socket 수와 관련된 설정입니다.

값을 크게 설정하면 높은 동시 요청량을 처리하는 데 도움이 될 수 있지만 외부 서버의 연결 수 제한을 초과할 수 있습니다.

### 19.3. Kubernetes 환경

NestJS Pod가 여러 개 실행되는 경우 각 프로세스가 별도의 HTTP Connection Pool을 가질 수 있습니다.

```text
NestJS Pod 1 --+
               |
NestJS Pod 2 --+--> External API
               |
NestJS Pod 3 --+
```

따라서 외부 API 서버의 최대 Connection 수, Rate Limit 및 동시 처리량을 고려해야 합니다.

## 20. Fetch 기반 HttpClientModule

최신 NestJS 공식 문서에서는 `@nestjs/http-client` 패키지를 통한 Fetch 기반 HTTP Client를 제공합니다.

이 패키지는 Node.js의 기본 `fetch` API를 기반으로 하며 다음 기능을 추가합니다.

- Base URL
- Named Client
- 기본 요청 헤더
- Query 및 Path Parameter
- JSON Body
- Timeout
- Retry
- HTTP Client Interceptor
- 구조화된 오류
- Dependency Injection

**`@nestjs/http-client`의 `HttpClient`는 RxJS Observable이 아닌 Promise를 반환합니다.**

### 20.1. 설치

```bash
npm install @nestjs/http-client
```

Axios 기반 구현과 별도의 패키지입니다.

### 20.2. HttpClientModule 등록

```typescript
import { Module } from '@nestjs/common';

import {
  HttpClientModule,
} from '@nestjs/http-client';

import { ExternalProductsClient } from './external-products.client';

@Module({
  imports: [
    HttpClientModule.register({
      name: 'products',
      baseUrl: 'https://api.example.com',
      timeout: '5s',
    }),
  ],
  providers: [ExternalProductsClient],
  exports: [ExternalProductsClient],
})
export class ExternalProductsModule {}
```

Axios의 `baseURL`과 달리 Fetch 기반 클라이언트에서는 `baseUrl`을 사용합니다.

### 20.3. InjectHttpClient

Named Client를 주입하려면 `@InjectHttpClient()`를 사용합니다.

```typescript
import { Injectable } from '@nestjs/common';

import {
  HttpClient,
  InjectHttpClient,
} from '@nestjs/http-client';

interface ExternalProduct {
  id: number;
  name: string;
  price: number;
}

@Injectable()
export class ExternalProductsClient {
  constructor(
    @InjectHttpClient('products')
    private readonly httpClient: HttpClient,
  ) {}

  async findAll(): Promise<ExternalProduct[]> {
    const response =
      await this.httpClient.get<ExternalProduct[]>(
        '/products',
      );

    return response.data;
  }
}
```

`HttpClient.get()`은 Promise를 반환하므로 `firstValueFrom()`이 필요하지 않습니다.

### 20.4. GET 요청과 Query Parameter

```typescript
const response =
  await this.httpClient.get<ExternalProduct[]>(
    '/products',
    {
      query: {
        page: 1,
        limit: 20,
      },
    },
  );
```

Fetch 기반 `HttpClient`에서는 Query Parameter에 `query` 옵션을 사용합니다.

Axios 기반 `HttpService`에서는 `params`를 사용한다는 차이가 있습니다.

### 20.5. Path Parameter

```typescript
const response =
  await this.httpClient.get<ExternalProduct>(
    '/products/:id',
    {
      params: {
        id: 100,
      },
    },
  );
```

여기서 `params`는 URL의 `:id`와 같은 Path Placeholder를 치환하는 용도로 사용합니다.

### 20.6. POST 요청

```typescript
const response =
  await this.httpClient.post<ExternalProduct>(
    '/products',
    {
      json: {
        name: 'Product A',
        price: 10000,
      },
    },
  );
```

Axios의 `post(url, data)`와 달리 Fetch 기반 `HttpClient`에서는 요청 옵션의 `json` 속성을 사용합니다.

## 21. HttpClientModule의 공통 설정

### 21.1. forRoot()

모든 HTTP Client에서 공유할 기본 설정을 정의할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';

import {
  HttpClientModule,
} from '@nestjs/http-client';

@Module({
  imports: [
    HttpClientModule.forRoot({
      headers: {
        'user-agent': 'nestjs-app/1.0',
      },
      timeout: '10s',
    }),
  ],
})
export class AppModule {}
```

`forRoot()`는 애플리케이션 전체의 기본 설정을 등록하지만 HTTP Client 자체를 등록하지는 않습니다.

실제 Client는 `register()` 또는 `registerAsync()`로 등록해야 합니다.

### 21.2. Named Client

여러 외부 API를 사용하는 경우 각각의 설정을 구분할 수 있습니다.

```typescript
HttpClientModule.register({
  name: 'products',
  baseUrl: 'https://products.example.com',
});
```

```typescript
HttpClientModule.register({
  name: 'payments',
  baseUrl: 'https://payments.example.com',
});
```

각 Client는 이름을 이용하여 주입합니다.

```typescript
constructor(
  @InjectHttpClient('products')
  private readonly productsClient: HttpClient,

  @InjectHttpClient('payments')
  private readonly paymentsClient: HttpClient,
) {}
```

이를 통해 외부 API별 Base URL과 인증 정책을 독립적으로 관리할 수 있습니다.

### 21.3. registerAsync()

`ConfigService`를 이용하여 실행 환경별 설정을 적용할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import {
  HttpClientModule,
  type Duration,
} from '@nestjs/http-client';

@Module({
  imports: [
    HttpClientModule.registerAsync({
      name: 'products',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseUrl:
          config.getOrThrow<string>(
            'PRODUCT_API_BASE_URL',
          ),
        timeout:
          config.get<Duration>(
            'PRODUCT_API_TIMEOUT',
            '5s',
          ),
      }),
    }),
  ],
})
export class ExternalProductsModule {}
```

## 22. Fetch 기반 HttpClient의 Retry

Fetch 기반 `HttpClient`는 기본 재시도 정책을 제공합니다.

기본적으로 GET, HEAD, OPTIONS, PUT, DELETE 요청에 대해 일시적인 오류 발생 시 최대 3번의 시도를 수행할 수 있습니다.

대표적인 재시도 대상은 다음과 같습니다.

- 연결 실패
- 요청 Timeout
- HTTP 408
- HTTP 429
- HTTP 500
- HTTP 502
- HTTP 503
- HTTP 504

POST와 PATCH는 기본적으로 자동 재시도하지 않습니다.

### 22.1. Retry 비활성화

```typescript
HttpClientModule.register({
  name: 'products',
  baseUrl: 'https://api.example.com',
  retry: false,
});
```

내부 마이크로서비스 호출처럼 다른 계층에서 재시도를 처리하는 경우 중복 재시도를 피하기 위해 사용할 수 있습니다.

### 22.2. Retry 설정

```typescript
HttpClientModule.register({
  name: 'products',
  baseUrl: 'https://api.example.com',
  retry: {
    attempts: 4,
    backoff: {
      delay: '500ms',
      factor: 2,
      maxDelay: '5s',
      jitter: 'full',
    },
  },
});
```

`attempts`는 최초 실행을 포함한 전체 시도 횟수입니다.

### 22.3. 전체 요청 Deadline

Fetch 기반 `HttpClient`의 `timeout`은 기본적으로 재시도별 개별 시도에 적용됩니다.

따라서 Retry까지 포함한 전체 실행 시간을 제한하려면 `AbortSignal`을 사용할 수 있습니다.

```typescript
const response =
  await this.httpClient.get(
    '/products',
    {
      signal: AbortSignal.timeout(10_000),
    },
  );
```

이 예제는 요청 전체에 약 10초의 Deadline을 적용합니다.

## 23. Fetch 기반 HttpClient 오류 처리

Fetch 기반 `HttpClient`는 다음과 같은 오류 클래스를 제공합니다.

| 오류 | 의미 |
|---|---|
| `HttpResponseError` | 외부 서버가 성공 범위가 아닌 HTTP 상태 코드를 반환 |
| `HttpTimeoutError` | 지정한 Timeout 초과 |
| `HttpNetworkError` | 연결, DNS, TLS 등의 네트워크 오류 |
| `HttpParseError` | 기대한 응답 형식으로 파싱 실패 |

### 23.1. 오류 처리 예제

```typescript
import {
  BadGatewayException,
  GatewayTimeoutException,
} from '@nestjs/common';

import {
  HttpResponseError,
  HttpTimeoutError,
  HttpNetworkError,
} from '@nestjs/http-client';

async findAll(): Promise<ExternalProduct[]> {
  try {
    const { data } =
      await this.httpClient.get<ExternalProduct[]>(
        '/products',
      );

    return data;
  } catch (error) {
    if (error instanceof HttpTimeoutError) {
      throw new GatewayTimeoutException(
        'External API timed out',
      );
    }

    if (
      error instanceof HttpResponseError ||
      error instanceof HttpNetworkError
    ) {
      throw new BadGatewayException(
        'External API request failed',
      );
    }

    throw error;
  }
}
```

`HttpResponseError`는 HTTP 상태 코드와 응답 Body를 확인할 수 있는 속성을 제공합니다.

### 23.2. throwOnHttpError

외부 API의 오류 응답 자체를 처리해야 하는 경우 다음 옵션을 사용할 수 있습니다.

```typescript
const response =
  await this.httpClient.get('/products', {
    throwOnHttpError: false,
  });
```

이 경우 서버가 반환한 HTTP 4xx 또는 5xx 응답을 예외로 변환하지 않고 응답 객체로 받을 수 있습니다.

단, 네트워크 오류나 Timeout까지 무시하는 것은 아닙니다.

## 24. Axios 기반과 Fetch 기반 마이그레이션

두 방식의 주요 차이는 다음과 같습니다.

| Axios 기반 | Fetch 기반 |
|---|---|
| `@nestjs/axios` | `@nestjs/http-client` |
| `HttpModule` | `HttpClientModule` |
| `HttpService` | `HttpClient` |
| `HttpModule.register()` | `HttpClientModule.register()` |
| `baseURL` | `baseUrl` |
| `Observable` 반환 | `Promise` 반환 |
| `firstValueFrom()` | `await` |
| GET의 `params` | GET의 `query` |
| POST의 두 번째 인자가 Body | POST 옵션의 `json` 또는 `body` |
| `AxiosError` | `HttpClientError` 계열 |
| `axiosRef` | 별도 Axios Instance 없음 |
| Axios Interceptor | HttpClient Interceptor |
| Retry 별도 구현 | 기본 Retry 제공 |

### 24.1. Axios 기반 코드

```typescript
const { data } = await firstValueFrom(
  this.httpService.get<Product[]>(
    '/products',
    {
      params: {
        category: 'electronics',
      },
    },
  ),
);
```

### 24.2. Fetch 기반 코드

```typescript
const { data } =
  await this.httpClient.get<Product[]>(
    '/products',
    {
      query: {
        category: 'electronics',
      },
    },
  );
```

마이그레이션할 때는 반환 타입뿐 아니라 다음 항목을 함께 점검해야 합니다.

1. Base URL 설정
2. Query Parameter 직렬화
3. 인증 헤더
4. 오류 처리 클래스
5. Timeout 적용 범위
6. 기본 Retry 정책
7. Redirect 처리
8. Request 및 Response Interceptor
9. 파일 및 Streaming 응답
10. 테스트에서 사용하는 Provider Token

기존 Axios 기반 구현이 안정적으로 운영되고 있다면 반드시 즉시 변경해야 하는 것은 아닙니다.

새로운 프로젝트에서는 요구사항과 NestJS 버전의 지원 범위를 확인하여 적절한 클라이언트를 선택할 수 있습니다.

## 25. HTTP Client 테스트

외부 HTTP 통신을 사용하는 Service는 실제 외부 API에 의존하지 않고 단위 테스트할 수 있어야 합니다.

### 25.1. Axios HttpService Mock

```typescript
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';

import { of } from 'rxjs';

import { ExternalProductsClient } from './external-products.client';

describe('ExternalProductsClient', () => {
  const httpServiceMock = {
    get: jest.fn(),
  };

  let client: ExternalProductsClient;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef =
      await Test.createTestingModule({
        providers: [
          ExternalProductsClient,
          {
            provide: HttpService,
            useValue: httpServiceMock,
          },
        ],
      }).compile();

    client = moduleRef.get(
      ExternalProductsClient,
    );
  });

  it('returns products', async () => {
    const products = [
      {
        id: 1,
        name: 'Product A',
        price: 10000,
      },
    ];

    httpServiceMock.get.mockReturnValue(
      of({
        data: products,
        status: 200,
      }),
    );

    const result = await client.findAll();

    expect(result).toEqual(products);
  });
});
```

이 테스트는 실제 HTTP 요청 없이 응답 처리 로직을 검증합니다.

### 25.2. Fetch HttpClient Mock

Named Client를 사용하는 경우 `getHttpClientToken()`을 활용할 수 있습니다.

```typescript
import { Test } from '@nestjs/testing';

import {
  getHttpClientToken,
} from '@nestjs/http-client';

const httpClientMock = {
  get: jest.fn(),
};

const moduleRef =
  await Test.createTestingModule({
    providers: [
      ExternalProductsClient,
      {
        provide: getHttpClientToken('products'),
        useValue: httpClientMock,
      },
    ],
  }).compile();
```

실제 테스트에서는 `httpClientMock.get`이 Promise를 반환하도록 설정합니다.

```typescript
httpClientMock.get.mockResolvedValue({
  status: 200,
  data: [
    {
      id: 1,
      name: 'Product A',
      price: 10000,
    },
  ],
});
```

### 25.3. 통합 테스트

실제 HTTP 통신 동작은 별도의 Mock HTTP Server를 사용하여 검증할 수 있습니다.

대표적인 검증 항목은 다음과 같습니다.

- 올바른 URL 호출
- Query Parameter 전달
- Authorization Header 전달
- Request Body 직렬화
- 정상 응답 데이터 변환
- HTTP 4xx 및 5xx 오류 처리
- Timeout 처리
- Retry 횟수
- 인증 정보 유출 방지
- 잘못된 응답 구조 처리

테스트에서 실제 외부 API를 호출하면 테스트 결과가 네트워크 상태나 외부 서비스에 영향을 받을 수 있으므로 단위 테스트와 통합 테스트를 구분하는 것이 좋습니다.

## 26. 외부 HTTP 통신 설계 시 주의사항

### 26.1. Timeout을 명시합니다.

외부 API가 응답하지 않을 때 애플리케이션의 요청 처리가 무기한 지연되지 않도록 적절한 Timeout을 설정합니다.

### 26.2. 모든 오류를 재시도하지 않습니다.

인증 실패, 잘못된 요청, 중복 실행 위험이 있는 작업 등에는 재시도 정책을 신중하게 적용해야 합니다.

### 26.3. 외부 API 응답을 검증합니다.

TypeScript의 제네릭 타입만으로 외부 응답 데이터의 형식이 보장되지는 않습니다.

필요한 경우 Zod 등 런타임 검증을 사용합니다.

### 26.4. 외부 API의 오류를 내부 계약으로 변환합니다.

외부 서버의 오류 메시지와 인증 정보를 그대로 클라이언트에 노출하지 않도록 합니다.

### 26.5. 인증 정보를 보호합니다.

API Key와 Access Token은 환경 변수 또는 Secret 관리 기능으로 관리하고 로그에 노출하지 않도록 합니다.

### 26.6. SSRF를 고려합니다.

사용자 입력을 그대로 요청 URL에 사용하는 기능은 Server-Side Request Forgery(SSRF) 위험이 있습니다.

특히 임의의 URL을 요청할 수 있는 기능에서는 허용할 Host, Scheme, Redirect 및 네트워크 접근 범위를 검증해야 합니다.

### 26.7. Connection 수와 동시 요청 수를 관리합니다.

Kubernetes에서 여러 인스턴스를 운영하면 외부 API에 대한 전체 요청량도 증가할 수 있습니다.

따라서 HTTP Connection, 동시 처리량 및 외부 시스템의 Rate Limit을 함께 관리해야 합니다.

### 26.8. 재시도 정책의 중첩을 방지합니다.

HTTP Client, Service, Queue Worker 등 여러 계층에서 각각 재시도하면 최종 외부 API 호출 수가 예상보다 크게 증가할 수 있습니다.

재시도 책임을 명확하게 정의해야 합니다.

### 26.9. HTTP Client의 오류와 비즈니스 오류를 구분합니다.

외부 API 호출 자체가 실패한 상황과 외부 API가 정상 응답으로 비즈니스 실패를 전달한 상황은 다를 수 있습니다.

응답 계약에 맞게 처리해야 합니다.

## 27. 실무 권장 프로젝트 구조

외부 API별 통합 모듈을 분리하는 구조를 고려할 수 있습니다.

```text
src/
├── integrations/
│   ├── products/
│   │   ├── dto/
│   │   │   └── external-product.dto.ts
│   │   ├── external-products.client.ts
│   │   └── external-products.module.ts
│   │
│   ├── payments/
│   │   ├── dto/
│   │   │   └── payment-response.dto.ts
│   │   ├── payments.client.ts
│   │   └── payments.module.ts
│   │
│   └── shipping/
│       ├── dto/
│       │   └── shipping-response.dto.ts
│       ├── shipping.client.ts
│       └── shipping.module.ts
│
├── products/
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── products.module.ts
│
├── app.module.ts
└── main.ts
```

각 구성 요소의 책임은 다음과 같습니다.

| 구성 요소 | 책임 |
|---|---|
| Integration Module | 외부 API Client 설정 및 Provider 등록 |
| External API Client | HTTP 요청 및 응답 처리 |
| External DTO | 외부 API의 데이터 계약 정의 |
| Feature Service | 애플리케이션 비즈니스 로직 |
| Feature Controller | HTTP 요청 및 응답 처리 |
| ConfigModule | 외부 API 주소 및 인증 정보 관리 |

### 27.1. 설계 권장 사항

1. 외부 API별 Client를 분리합니다.
2. HTTP Client 설정을 환경 변수로 관리합니다.
3. 외부 API 응답을 내부 도메인 모델과 분리합니다.
4. Timeout과 Retry 정책을 명시합니다.
5. 외부 HTTP 오류를 애플리케이션 오류로 적절하게 변환합니다.
6. 필요에 따라 Circuit Breaker와 Rate Limiting을 적용합니다.
7. 인증 정보와 민감한 데이터를 로그에 기록하지 않습니다.
8. HTTP 통신을 Mock으로 대체할 수 있도록 DI를 활용합니다.
9. 외부 API별 응답 시간과 실패율을 측정합니다.
10. 여러 인스턴스의 전체 외부 API 요청량을 고려합니다.

## 28. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| HTTP Client | 외부 HTTP API 호출 |
| `HttpModule` | Axios 기반 HTTP Client 등록 |
| `HttpService` | Axios 기반 HTTP 요청 Provider |
| `HttpModule.register()` | Axios 공통 설정 |
| `HttpModule.registerAsync()` | DI 기반 동적 Axios 설정 |
| `axiosRef` | 내부 Axios Instance 접근 |
| `AxiosResponse` | Axios HTTP 응답 객체 |
| `AxiosError` | Axios HTTP 통신 오류 |
| `Observable` | RxJS 비동기 데이터 흐름 |
| `firstValueFrom()` | Observable의 첫 값을 Promise로 변환 |
| `HttpClientModule` | Fetch 기반 HTTP Client 등록 |
| `HttpClient` | Fetch 기반 HTTP 요청 Provider |
| `@InjectHttpClient()` | Named HTTP Client 주입 |
| `HttpResponseError` | Fetch 기반 Client의 HTTP 응답 오류 |
| `HttpTimeoutError` | Fetch 기반 Client의 Timeout 오류 |
| Timeout | 요청 시간 제한 |
| Retry | 실패한 요청 재시도 |
| Backoff | 재시도 간격 조절 |
| Circuit Breaker | 반복적인 장애 요청 차단 |
| Connection Pool | HTTP 연결 재사용 |
| SSRF | 서버를 통한 의도하지 않은 외부·내부 네트워크 요청 공격 |

## 29. 정리

NestJS의 HTTP Module은 애플리케이션이 외부 HTTP API와 통신할 수 있도록 지원하는 기능입니다.

Axios 기반의 `@nestjs/axios` 패키지는 `HttpModule`과 `HttpService`를 제공하며, HTTP 응답을 RxJS Observable 형태로 반환합니다.

`HttpModule.register()`와 `registerAsync()`를 이용하면 Base URL, Timeout, 인증 헤더 등의 공통 설정을 관리할 수 있습니다.

`HttpService`의 응답은 RxJS Operator를 이용하여 처리하거나 `firstValueFrom()`으로 Promise로 변환할 수 있습니다.

최신 NestJS에서는 Fetch 기반의 `@nestjs/http-client`도 제공하며, `HttpClientModule`과 `HttpClient`를 이용하여 Promise 기반 HTTP 통신을 구현할 수 있습니다.

Fetch 기반 클라이언트는 Named Client, 기본 Retry, Timeout, Interceptor 및 구조화된 오류 처리 기능을 제공합니다.

실제 프로젝트에서는 외부 API 호출 로직을 별도의 Provider로 분리하고, Timeout, Retry, Backoff, 인증 정보, 오류 처리 및 응답 데이터 검증을 일관되게 관리하는 것이 중요합니다.

또한 분산 환경에서는 각 애플리케이션 인스턴스가 발생시키는 외부 API 요청량과 Connection 수를 함께 고려해야 합니다.

안정적인 HTTP 연동을 위해서는 정상 응답 처리뿐 아니라 외부 서비스의 장애, 지연, 데이터 형식 변경 및 인증 실패에 대한 대응 전략까지 설계해야 합니다.

## 참고 자료

### NestJS 공식 문서

- [NestJS - HTTP Client](https://docs.nestjs.com/application/http-client)
- [NestJS v11 - HTTP Module (Axios)](https://docs.nestjs.com/v11/techniques/http-module)
- [NestJS - Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [NestJS - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS - Testing](https://docs.nestjs.com/fundamentals/testing)
- [NestJS - Health Checks](https://docs.nestjs.com/recipes/terminus)

### Axios

- [Axios 공식 문서](https://axios-http.com/docs/intro)
- [Axios - Request Config](https://axios-http.com/docs/req_config)
- [Axios - Response Schema](https://axios-http.com/docs/res_schema)
- [Axios - Handling Errors](https://axios-http.com/docs/handling_errors)
- [Axios - Interceptors](https://axios-http.com/docs/interceptors)
- [Axios - Cancellation](https://axios-http.com/docs/cancellation)
- [Axios GitHub Repository](https://github.com/axios/axios)
- [NestJS Axios GitHub Repository](https://github.com/nestjs/axios)

### RxJS

- [RxJS 공식 문서](https://rxjs.dev/)
- [RxJS - firstValueFrom](https://rxjs.dev/api/index/function/firstValueFrom)
- [RxJS - lastValueFrom](https://rxjs.dev/api/index/function/lastValueFrom)
- [RxJS - retry](https://rxjs.dev/api/operators/retry)
- [RxJS - timeout](https://rxjs.dev/api/operators/timeout)
- [RxJS - catchError](https://rxjs.dev/api/operators/catchError)

### Node.js 및 안정성

- [Node.js - Fetch API](https://nodejs.org/api/globals.html#fetch)
- [Node.js - HTTP](https://nodejs.org/api/http.html)
- [Node.js - HTTPS](https://nodejs.org/api/https.html)
- [Node.js - AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
- [MDN - HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)
- [MDN - HTTP Response Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [OWASP - SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Opossum - Circuit Breaker](https://github.com/nodeshift/opossum)