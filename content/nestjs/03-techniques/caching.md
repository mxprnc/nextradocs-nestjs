# Caching

## 1. 개요

Caching은 자주 사용하거나 생성 비용이 높은 데이터를 임시 저장소에 보관하여 이후 요청에서 재사용하는 기술입니다.

일반적인 백엔드 애플리케이션에서는 동일한 데이터를 반복적으로 조회하거나 계산하는 경우가 많습니다.

예를 들어 상품 상세 조회 API에 매번 데이터베이스 쿼리를 실행하면 요청 수가 증가할수록 데이터베이스 부하와 응답 지연이 증가할 수 있습니다.

Caching을 적용하면 이전에 조회한 데이터를 재사용하여 데이터베이스 접근 횟수를 줄이고 응답 속도를 개선할 수 있습니다.

NestJS는 `@nestjs/cache-manager` 패키지를 통해 Cache 기능을 제공합니다.

이 패키지는 `cache-manager`를 기반으로 하며, 최신 버전에서는 Keyv를 이용하여 다양한 Cache Store와 연동할 수 있습니다.

주요 기능은 다음과 같습니다.

- In-memory Cache
- Redis 등 외부 Cache Store 연동
- CacheManager를 통한 캐시 조회 및 저장
- `CacheInterceptor`를 이용한 HTTP 응답 자동 캐싱
- TTL(Time To Live) 기반 캐시 만료
- Cache Key 사용자 정의
- Cache Invalidation
- Dependency Injection 기반 Cache 관리

이 문서에서는 NestJS의 기본 캐싱 기능부터 Redis를 이용한 분산 캐시 구성과 실무 활용 전략까지 설명합니다.

## 2. Caching이 필요한 이유

### 2.1. 응답 속도 개선

캐시를 사용하지 않는 경우 일반적으로 요청마다 데이터베이스에 접근합니다.

```text
Client
   |
   v
NestJS Application
   |
   v
Database
   |
   v
NestJS Application
   |
   v
Client
```

캐시를 적용하면 이전에 저장된 데이터를 재사용할 수 있습니다.

```text
Client
   |
   v
NestJS Application
   |
   v
Cache
   |
   +-- Cache Hit --> Return Cached Data
   |
   +-- Cache Miss
          |
          v
       Database
          |
          v
       Cache Store
          |
          v
       Return Data
```

캐시에 데이터가 존재하는 경우 데이터베이스 조회 없이 응답할 수 있습니다.

### 2.2. 데이터베이스 부하 감소

여러 사용자가 동일한 데이터를 반복해서 요청하는 경우 매번 동일한 쿼리를 실행하는 것은 비효율적일 수 있습니다.

대표적인 예시는 다음과 같습니다.

- 인기 상품 조회
- 공지사항 조회
- 사용자에게 공통으로 제공되는 설정
- 카테고리 목록
- 조회 비용이 높은 통계 데이터
- 외부 API로부터 수집한 데이터

이러한 데이터를 캐싱하면 데이터베이스와 외부 시스템의 부하를 줄일 수 있습니다.

### 2.3. 외부 API 호출 비용 감소

외부 API에서 데이터를 가져오는 경우에도 캐싱을 활용할 수 있습니다.

예를 들어 환율, 날씨 및 외부 상품 정보를 일정 시간 캐싱하면 API 호출 횟수를 줄일 수 있습니다.

다만 외부 데이터의 변경 주기와 허용 가능한 데이터 지연 시간을 고려하여 TTL을 설정해야 합니다.

## 3. Caching 주요 개념

| 개념 | 설명 |
|---|---|
| Cache | 임시로 저장된 데이터 또는 이를 관리하는 저장소 |
| Cache Key | 캐시 데이터를 식별하는 고유한 키 |
| Cache Value | 캐시에 저장되는 실제 데이터 |
| Cache Hit | 요청한 데이터가 캐시에 존재하는 상태 |
| Cache Miss | 요청한 데이터가 캐시에 없는 상태 |
| TTL | 캐시 데이터가 유지되는 유효 시간 |
| Cache Invalidation | 기존 캐시 데이터를 무효화하는 작업 |
| Cache Eviction | 저장 공간 확보 등을 위해 데이터를 제거하는 작업 |
| Cache Store | 실제 캐시 데이터를 저장하는 시스템 |
| Cache Stampede | 다수의 요청이 동시에 캐시를 재생성하면서 발생하는 부하 집중 현상 |

### 3.1. Cache Hit

Cache Hit은 요청한 데이터가 캐시에 존재하는 경우입니다.

```text
GET user:100
      |
      v
    Cache
      |
      v
  Data Found
      |
      v
 Return Data
```

이 경우 원본 데이터 저장소에 접근하지 않아도 됩니다.

### 3.2. Cache Miss

Cache Miss는 캐시에 데이터가 존재하지 않거나 만료된 경우입니다.

```text
GET user:100
      |
      v
    Cache
      |
      v
  Data Missing
      |
      v
   Database
      |
      v
  Cache.set()
      |
      v
  Return Data
```

Cache Miss가 발생하면 원본 데이터를 조회하고 필요에 따라 캐시에 저장합니다.

### 3.3. TTL

TTL(Time To Live)은 캐시 데이터의 유효 기간을 의미합니다.

예를 들어 TTL을 30초로 설정하면 저장 후 30초가 지난 데이터는 만료된 것으로 처리됩니다.

TTL은 데이터의 변경 주기와 서비스의 정합성 요구사항에 따라 설정해야 합니다.

최신 `cache-manager`에서는 TTL을 밀리초 단위로 지정합니다.

```typescript
const ttl = 30_000; // 30초
```

과거 버전의 `cache-manager`에서는 TTL 단위가 달랐으므로 기존 프로젝트를 마이그레이션할 때 주의해야 합니다.

## 4. NestJS Caching 아키텍처

NestJS의 Cache 기능은 다음 구성 요소를 중심으로 동작합니다.

```text
NestJS Application
        |
        v
    CacheModule
        |
        v
    CacheManager
        |
        v
       Keyv
        |
        v
    Cache Store
        |
        +-- Memory
        |
        +-- Redis
        |
        +-- Other Stores
```

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| `CacheModule` | Cache 기능을 NestJS 모듈에 등록합니다. |
| `CACHE_MANAGER` | Cache 인스턴스를 주입하기 위한 Injection Token입니다. |
| `Cache` | 캐시 조회, 저장, 삭제 등의 API를 제공합니다. |
| `CacheInterceptor` | Handler의 응답 데이터를 자동으로 캐싱합니다. |
| `Keyv` | 다양한 Storage Adapter를 위한 Key-Value 인터페이스를 제공합니다. |
| Cache Store | 메모리, Redis 등 실제 저장소를 의미합니다. |

`CacheModule`은 NestJS의 Dependency Injection과 통합되어 CacheManager를 Provider로 제공합니다.

따라서 Service에서 직접 CacheManager를 생성하지 않고 주입받아 사용할 수 있습니다.

## 5. CacheModule 설치

### 5.1. 패키지 설치

NestJS에서 기본 캐싱 기능을 사용하려면 다음 패키지를 설치합니다.

```bash
npm install @nestjs/cache-manager cache-manager
```

기본 설치만으로 In-memory Cache를 사용할 수 있습니다.

Redis와 같은 외부 Cache Store는 추가 패키지가 필요합니다.

### 5.2. CacheModule 등록

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register(),
  ],
})
export class AppModule {}
```

`CacheModule.register()`는 CacheManager를 초기화합니다.

별도의 Store를 지정하지 않으면 기본 In-memory Cache를 사용합니다.

### 5.3. 기본 TTL 설정

```typescript
CacheModule.register({
  ttl: 5000,
});
```

위 설정은 캐시의 기본 TTL을 5초로 지정합니다.

현재 CacheManager의 기본 TTL은 `0`으로, 별도의 만료 시간이 지정되지 않으면 자동 만료되지 않는 설정입니다.

운영 환경에서는 데이터의 특성에 따라 적절한 TTL을 명시적으로 지정하는 것이 좋습니다.

### 5.4. 전역 모듈 등록

여러 모듈에서 Cache 기능을 사용하려면 `isGlobal` 옵션을 설정할 수 있습니다.

```typescript
CacheModule.register({
  isGlobal: true,
  ttl: 30_000,
});
```

전역 모듈로 등록하면 다른 Feature Module에서 `CacheModule`을 반복해서 import하지 않고도 CacheManager를 주입할 수 있습니다.

다만 전역 모듈은 의존성을 암묵적으로 만들 수 있으므로 프로젝트의 모듈 설계 원칙에 따라 사용 여부를 결정해야 합니다.

## 6. CacheManager 사용

NestJS에서는 `CACHE_MANAGER` Injection Token을 사용하여 CacheManager를 주입받습니다.

### 6.1. 기본 사용법

```typescript
import {
  Inject,
  Injectable,
} from '@nestjs/common';

import {
  CACHE_MANAGER,
  Cache,
} from '@nestjs/cache-manager';

@Injectable()
export class CacheExampleService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}
}
```

`@Inject(CACHE_MANAGER)`는 NestJS DI Container에서 CacheManager Provider를 조회하여 주입합니다.

### 6.2. get()

캐시에 저장된 데이터를 조회할 때는 `get()`을 사용합니다.

```typescript
const value = await this.cacheManager.get<string>(
  'example:key',
);
```

해당 키의 데이터가 존재하면 저장된 값을 반환합니다.

최신 `cache-manager`에서는 키가 존재하지 않으면 `undefined`를 반환합니다.

과거 버전에서는 `null`을 반환한 경우가 있으므로 버전 변경 시 주의해야 합니다.

다음과 같이 검사할 수 있습니다.

```typescript
if (value !== undefined) {
  return value;
}
```

`if (value)`와 같은 Truthy 검사를 사용하면 `0`, `false`, 빈 문자열 등의 유효한 캐시 값을 Cache Miss로 잘못 처리할 수 있습니다.

### 6.3. set()

캐시에 데이터를 저장할 때는 `set()`을 사용합니다.

```typescript
await this.cacheManager.set(
  'example:key',
  'example-value',
);
```

TTL을 지정할 수도 있습니다.

```typescript
await this.cacheManager.set(
  'example:key',
  'example-value',
  60_000,
);
```

위 예제는 데이터를 60초 동안 유지합니다.

### 6.4. del()

특정 캐시를 삭제할 때는 `del()`을 사용합니다.

```typescript
await this.cacheManager.del('example:key');
```

이 작업은 데이터가 변경되어 기존 캐시를 무효화해야 하는 경우에 사용할 수 있습니다.

### 6.5. clear()

전체 캐시를 비울 때는 `clear()`를 사용합니다.

```typescript
await this.cacheManager.clear();
```

공유 Redis나 다중 Store 환경에서 전체 삭제를 수행하면 다른 기능에 영향을 줄 수 있습니다.

따라서 운영 환경에서는 캐시 전체 삭제보다 특정 키를 선택적으로 무효화하는 방식을 우선적으로 고려하는 것이 좋습니다.

### 6.6. 주요 Cache API

| 메서드 | 역할 |
|---|---|
| `get(key)` | 캐시 데이터 조회 |
| `set(key, value, ttl?)` | 데이터 저장 |
| `del(key)` | 특정 키 삭제 |
| `clear()` | 관리 대상 캐시 전체 삭제 |
| `mget(keys)` | 여러 키 조회 |
| `mset(entries)` | 여러 키 저장 |
| `mdel(keys)` | 여러 키 삭제 |
| `wrap(key, fn, ttl?)` | 캐시 조회 및 데이터 생성 로직 결합 |

사용 가능한 메서드와 세부 옵션은 설치된 `cache-manager` 버전에 따라 달라질 수 있습니다.

## 7. Cache-Aside 패턴

Cache-Aside는 애플리케이션에서 캐시 조회와 원본 데이터 조회를 직접 제어하는 방식입니다.

Lazy Loading Cache 패턴이라고도 합니다.

### 7.1. 동작 과정

```text
Client
   |
   v
NestJS Service
   |
   v
Cache.get(key)
   |
   +-- Hit --> Return Cached Data
   |
   +-- Miss
         |
         v
     Database
         |
         v
    Cache.set(key)
         |
         v
     Return Data
```

처리 과정은 다음과 같습니다.

1. 캐시에서 데이터를 조회합니다.
2. 데이터가 존재하면 즉시 반환합니다.
3. 데이터가 없으면 데이터베이스를 조회합니다.
4. 조회 결과를 캐시에 저장합니다.
5. 조회 결과를 반환합니다.

### 7.2. Service 구현

다음은 TypeORM을 사용하는 사용자 조회 예제입니다.

```typescript
import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CACHE_MANAGER,
  Cache,
} from '@nestjs/cache-manager';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findOne(id: number): Promise<User> {
    const cacheKey = `users:${id}`;

    const cachedUser =
      await this.cacheManager.get<User>(cacheKey);

    if (cachedUser !== undefined) {
      return cachedUser;
    }

    const user =
      await this.usersRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException(
        `User ${id} not found`,
      );
    }

    await this.cacheManager.set(
      cacheKey,
      user,
      60_000,
    );

    return user;
  }
}
```

위 예제는 Cache-Aside 패턴의 기본 흐름을 설명합니다.

실무에서는 ORM Entity를 그대로 캐싱하기보다 필요한 속성만 포함하는 일반 데이터 객체 또는 Response DTO를 캐싱하는 것이 좋습니다.

Redis와 같은 외부 Store에서는 직렬화와 역직렬화 과정에서 클래스 인스턴스의 프로토타입 정보가 유지되지 않을 수 있기 때문입니다.

## 8. CacheInterceptor

`CacheInterceptor`는 NestJS의 Interceptor를 이용하여 Controller Handler의 응답 데이터를 자동으로 캐싱하는 기능입니다.

Service에서 매번 `get()`과 `set()`을 호출하지 않아도 됩니다.

### 8.1. 기본 사용법

```typescript
import {
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';

import {
  CacheInterceptor,
} from '@nestjs/cache-manager';

@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductsController {
  @Get()
  findAll() {
    return [
      { id: 1, name: 'Product A' },
      { id: 2, name: 'Product B' },
    ];
  }
}
```

최초 요청에서는 Handler가 실행되고 결과가 캐시에 저장됩니다.

동일한 Cache Key에 대한 이후 요청에서는 캐시된 데이터가 반환될 수 있습니다.

### 8.2. CacheInterceptor 동작 원리

```text
HTTP GET Request
       |
       v
CacheInterceptor
       |
       v
Cache Key Lookup
       |
       +-- Cache Hit
       |       |
       |       v
       |   Cached Response
       |
       +-- Cache Miss
               |
               v
         Controller Handler
               |
               v
           Service
               |
               v
         Response Data
               |
               v
          Cache Store
               |
               v
          HTTP Response
```

Cache Hit가 발생하면 Controller Handler를 실행하지 않고 캐시된 응답 데이터를 사용할 수 있습니다.

### 8.3. GET 요청만 자동 캐싱

기본 `CacheInterceptor`는 HTTP GET 요청에 대해 자동 캐싱을 수행합니다.

POST, PUT, PATCH, DELETE 요청은 기본적으로 자동 캐싱하지 않습니다.

또한 `@Res()`를 이용하여 네이티브 HTTP 응답 객체를 직접 제어하는 Handler에는 일반적인 `CacheInterceptor`를 적용할 수 없습니다.

### 8.4. Controller 단위 적용

```typescript
@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductsController {}
```

Controller에 속한 적절한 GET Handler에 적용됩니다.

### 8.5. Handler 단위 적용

```typescript
@Get(':id')
@UseInterceptors(CacheInterceptor)
findOne(@Param('id') id: string) {
  return this.productsService.findOne(id);
}
```

특정 Handler에만 캐싱을 적용할 수 있습니다.

## 9. 전역 CacheInterceptor

전체 애플리케이션에 응답 캐싱을 적용하려면 `APP_INTERCEPTOR`를 사용할 수 있습니다.

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import {
  CacheInterceptor,
  CacheModule,
} from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 30_000,
    }),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
```

이 방식은 `CacheInterceptor`를 전역 Interceptor로 등록합니다.

하지만 모든 GET 응답을 일괄적으로 캐싱하는 것은 주의해야 합니다.

특히 다음과 같은 API는 신중하게 처리해야 합니다.

- 로그인 사용자별 개인 정보
- 사용자 권한에 따라 결과가 달라지는 API
- 실시간으로 변경되는 데이터
- 민감한 인증 정보
- 캐싱이 허용되지 않는 응답

전역 캐싱보다는 캐싱 대상이 명확한 Controller나 Handler에 선택적으로 적용하는 방식이 더 적절할 수 있습니다.

## 10. @CacheKey()

`@CacheKey()`는 자동 캐싱에 사용할 Cache Key를 명시적으로 지정하는 Decorator입니다.

### 10.1. 기본 사용법

```typescript
import {
  CacheKey,
  CacheInterceptor,
} from '@nestjs/cache-manager';

@Get()
@CacheKey('products:all')
@UseInterceptors(CacheInterceptor)
findAll() {
  return this.productsService.findAll();
}
```

기본적으로 HTTP 환경에서 `CacheInterceptor`는 요청 URL을 기반으로 Cache Key를 생성합니다.

`@CacheKey()`를 사용하면 이를 고정된 키로 변경할 수 있습니다.

### 10.2. 동적 URL에 대한 주의사항

다음과 같은 API가 있다고 가정합니다.

```http
GET /products/100
GET /products/200
```

각 요청은 서로 다른 상품을 조회합니다.

이때 두 요청에 동일한 고정 Cache Key를 사용하면 잘못된 데이터를 반환할 수 있습니다.

```typescript
@CacheKey('product')
```

따라서 Path Parameter나 Query Parameter에 따라 결과가 달라지는 API에서는 자동 URL 기반 키를 사용하거나 사용자 정의 Cache Key 생성 로직을 구현하는 것이 적절합니다.

## 11. @CacheTTL()

`@CacheTTL()`은 Controller 또는 Handler 단위로 TTL을 지정하는 Decorator입니다.

### 11.1. 기본 사용법

```typescript
import {
  CacheTTL,
  CacheInterceptor,
} from '@nestjs/cache-manager';

@Get()
@CacheTTL(10_000)
@UseInterceptors(CacheInterceptor)
findAll() {
  return this.productsService.findAll();
}
```

위 예제에서는 캐시의 TTL을 10초로 설정합니다.

### 11.2. Controller 단위 설정

```typescript
@Controller('products')
@CacheTTL(30_000)
@UseInterceptors(CacheInterceptor)
export class ProductsController {
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('popular')
  @CacheTTL(5_000)
  findPopular() {
    return this.productsService.findPopular();
  }
}
```

Controller에는 기본 TTL 30초를 적용하고, 인기 상품 조회 Handler에는 TTL 5초를 적용합니다.

Handler 수준에서 지정한 TTL은 Controller 수준의 TTL보다 우선합니다.

### 11.3. TTL 설계

TTL은 데이터 특성에 따라 다르게 설정할 수 있습니다.

| 데이터 유형 | TTL 예시 | 고려 사항 |
|---|---|---|
| 공통 설정 정보 | 5분 | 설정 변경 빈도 |
| 상품 카테고리 | 10분 | 카테고리 변경 빈도 |
| 인기 상품 목록 | 30초 | 인기 순위 변경 주기 |
| 외부 API 데이터 | 1분 | API 호출 비용 |
| 실시간 시세 | 수백 ms~수초 | 허용 가능한 데이터 지연 |

위 값은 이해를 돕기 위한 예시이며 실제 권장 TTL을 의미하지 않습니다.

특히 금융 시세처럼 최신성이 중요한 데이터는 조회 목적과 정합성 요구사항을 기준으로 TTL을 결정해야 합니다.

## 12. 사용자 정의 CacheInterceptor

기본 `CacheInterceptor`는 요청 URL을 기준으로 캐시를 구분합니다.

하지만 사용자 ID, 언어, Tenant ID 등 추가 조건에 따라 결과가 달라지는 API에서는 Cache Key를 별도로 생성해야 할 수 있습니다.

### 12.1. trackBy()

`CacheInterceptor`를 상속한 후 `trackBy()`를 재정의할 수 있습니다.

```typescript
import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import {
  CacheInterceptor,
} from '@nestjs/cache-manager';

@Injectable()
export class CustomCacheInterceptor
  extends CacheInterceptor
{
  trackBy(
    context: ExecutionContext,
  ): string | undefined {
    const request = context
      .switchToHttp()
      .getRequest();

    return `http:${request.method}:${request.originalUrl ?? request.url}`;
  }
}
```

이 예제는 HTTP Method와 URL을 조합한 Cache Key를 생성합니다.

Express와 Fastify 등 HTTP Adapter에 따라 Request 객체의 세부 속성이 다를 수 있습니다.

### 12.2. 사용자별 Cache Key

사용자마다 다른 데이터를 반환하는 API에서는 사용자 식별자를 Cache Key에 포함해야 합니다.

예를 들어 다음과 같은 형식을 사용할 수 있습니다.

```text
users:100:profile
users:200:profile
```

단, 사용자 식별자를 Cache Key에 포함하는 것만으로 인증과 인가가 이루어지는 것은 아닙니다.

먼저 인증된 사용자 정보를 확인하고, 해당 사용자가 요청한 데이터에 접근할 권한이 있는지 검증해야 합니다.

특히 Authorization 헤더의 원본 Token을 Cache Key로 직접 사용하는 것은 피하는 것이 좋습니다.

## 13. Redis Cache 연동

In-memory Cache는 애플리케이션 프로세스 내부에 데이터를 저장합니다.

따라서 여러 NestJS 인스턴스를 실행하면 각 인스턴스가 별도의 캐시를 갖습니다.

Redis와 같은 외부 Cache Store를 사용하면 여러 애플리케이션 인스턴스가 공통 캐시를 사용할 수 있습니다.

### 13.1. Redis를 사용하는 이유

Redis를 이용한 캐싱은 다음과 같은 상황에서 유용합니다.

- 여러 NestJS Pod가 동일한 캐시를 사용해야 하는 경우
- 애플리케이션 재시작과 캐시 생명주기를 분리해야 하는 경우
- 캐시 데이터를 여러 서버에서 공유해야 하는 경우
- 중앙 집중식 캐시 무효화가 필요한 경우

Redis는 캐시뿐 아니라 다양한 자료구조와 기능을 제공하지만, 이 문서에서는 Key-Value Cache Store 용도로 사용합니다.

### 13.2. 패키지 설치

최신 NestJS CacheManager에서는 Keyv 기반 Redis Adapter를 사용할 수 있습니다.

```bash
npm install @keyv/redis
```

`@nestjs/cache-manager`와 `cache-manager`는 앞서 설치한 것으로 가정합니다.

### 13.3. Redis 기반 CacheModule

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: () => {
        const redisStore = createKeyv(
          'redis://localhost:6379',
        );

        redisStore.on('error', (error) => {
          console.error('Redis cache error:', error);
        });

        return {
          stores: [redisStore],
          ttl: 30_000,
        };
      },
    }),
  ],
})
export class AppModule {}
```

`createKeyv()`는 Redis를 Cache Store로 사용하는 Keyv 인스턴스를 생성합니다.

Redis 연결에서 발생하는 오류를 처리하기 위해 Error Listener를 등록합니다.

Redis Adapter의 옵션과 연결 실패 처리 정책은 사용 중인 `@keyv/redis` 버전에 따라 달라질 수 있습니다.

### 13.4. 환경 변수 연동

운영 환경에서는 Redis 주소를 환경 변수로 관리하는 것이 좋습니다.

`.env`

```env
REDIS_URL=redis://localhost:6379
CACHE_TTL=30000
```

`app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.getOrThrow<string>(
            'REDIS_URL',
          );

        const ttl = Number(
          configService.get<string>(
            'CACHE_TTL',
            '30000',
          ),
        );

        const redisStore = createKeyv(redisUrl);

        redisStore.on('error', (error) => {
          console.error('Redis cache error:', error);
        });

        return {
          stores: [redisStore],
          ttl,
        };
      },
    }),
  ],
})
export class AppModule {}
```

이 예제에서는 환경 변수의 형식이 올바르게 설정되어 있다고 가정합니다.

운영 환경에서는 Redis URL, TTL 및 인증 설정을 애플리케이션 시작 시 검증하는 것이 좋습니다.

## 14. Multi-Store Cache

NestJS CacheManager는 여러 Cache Store를 함께 등록할 수 있습니다.

예를 들어 In-memory Cache와 Redis를 함께 사용할 수 있습니다.

### 14.1. 패키지 설치

```bash
npm install cacheable keyv @keyv/redis
```

### 14.2. Memory + Redis 구성

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

import { Keyv } from 'keyv';
import { KeyvCacheableMemory } from 'cacheable';
import { createKeyv } from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: () => {
        const redisStore = createKeyv(
          'redis://localhost:6379',
        );

        redisStore.on('error', (error) => {
          console.error('Redis error:', error);
        });

        return {
          stores: [
            new Keyv({
              store: new KeyvCacheableMemory({
                ttl: 60_000,
                lruSize: 5000,
              }),
            }),
            redisStore,
          ],
          ttl: 60_000,
        };
      },
    }),
  ],
})
export class AppModule {}
```

이 구성에서는 메모리와 Redis를 함께 사용합니다.

설정된 Store 순서와 CacheManager의 Multi-Store 동작 정책에 따라 조회 및 저장이 이루어집니다.

이러한 구조는 로컬 캐시와 공유 캐시를 결합하는 데 활용할 수 있습니다.

### 14.3. 다중 Store의 주의사항

여러 Store를 사용하는 경우 다음 사항을 고려해야 합니다.

- Store별 TTL과 만료 시점
- Redis 장애 시 처리 정책
- 로컬 캐시와 공유 캐시의 정합성
- 데이터 직렬화 방식
- Cache Invalidation의 전파
- Store별 메모리 사용량

특히 메모리와 Redis를 함께 사용하는 경우 다른 인스턴스에서 데이터가 변경되더라도 각 인스턴스의 로컬 캐시가 즉시 무효화되는 것은 아닙니다.

또한 Multi-Store가 항상 Redis 장애에 대한 완전한 Failover를 제공한다고 가정해서는 안 됩니다.

## 15. Cache Invalidation

Cache Invalidation은 원본 데이터가 변경되었을 때 기존 캐시 데이터를 제거하거나 갱신하는 과정입니다.

캐싱 시스템에서는 성능뿐 아니라 데이터 정합성을 유지하는 것이 중요합니다.

### 15.1. 캐시 무효화가 필요한 이유

사용자 정보가 다음과 같이 변경되었다고 가정합니다.

```text
Before:
users:100 -> name: "Kim"

Database Update:
name: "Lee"
```

데이터베이스 값이 변경되었더라도 기존 캐시가 남아 있다면 클라이언트에 오래된 데이터가 반환될 수 있습니다.

이러한 문제를 Stale Data라고 합니다.

### 15.2. 데이터 수정 후 캐시 삭제

```typescript
async update(
  id: number,
  dto: UpdateUserDto,
): Promise<User> {
  const user = await this.usersRepository.findOneBy({
    id,
  });

  if (!user) {
    throw new NotFoundException(
      `User ${id} not found`,
    );
  }

  Object.assign(user, dto);

  const updatedUser =
    await this.usersRepository.save(user);

  await this.cacheManager.del(`users:${id}`);

  return updatedUser;
}
```

이 방식은 데이터베이스 수정이 완료된 후 캐시를 삭제합니다.

다음 조회에서는 Cache Miss가 발생하여 변경된 데이터를 다시 조회할 수 있습니다.

### 15.3. 데이터베이스와 캐시의 원자성

데이터베이스 수정과 캐시 삭제는 일반적으로 하나의 원자적 트랜잭션으로 처리되지 않습니다.

따라서 다음과 같은 문제가 발생할 수 있습니다.

- 데이터베이스 수정은 성공했지만 캐시 삭제는 실패할 수 있습니다.
- 동시에 실행되는 조회 요청이 이전 데이터를 다시 캐시에 저장할 수 있습니다.
- 다른 인스턴스의 로컬 캐시에는 이전 데이터가 남아 있을 수 있습니다.

TTL은 이러한 문제의 지속 시간을 제한하는 보조 수단이 될 수 있지만 강한 정합성을 보장하지 않습니다.

정합성 요구사항이 높은 시스템에서는 버전 기반 키, 재조회 정책, 이벤트 기반 무효화 또는 별도의 일관성 제어 방식을 고려해야 합니다.

## 16. Cache 전략

Caching에서는 데이터의 조회와 변경을 어떻게 처리할 것인지에 따라 여러 전략을 사용할 수 있습니다.

### 16.1. Cache-Aside

애플리케이션이 Cache Hit과 Cache Miss를 직접 처리합니다.

```text
Read:
Cache -> Database (Miss) -> Cache

Write:
Database -> Cache Invalidation
```

일반적인 조회 중심 애플리케이션에서 활용하기 좋은 방식입니다.

### 16.2. Read-Through

캐시 계층이 Cache Miss 발생 시 원본 저장소에서 데이터를 가져옵니다.

```text
Application
     |
     v
Cache Layer
     |
     +-- Hit --> Return
     |
     +-- Miss --> Database
```

Cache-Aside와 달리 애플리케이션은 캐시 계층을 통해 데이터를 조회합니다.

NestJS의 기본 CacheManager만으로 데이터베이스 Read-Through가 자동 구성되는 것은 아닙니다.

별도의 추상화 계층이나 캐시 라이브러리 기능이 필요합니다.

### 16.3. Write-Through

데이터를 변경할 때 캐시와 원본 저장소에 함께 반영하는 방식입니다.

```text
Write Request
      |
      v
Cache Layer
      |
      v
Database
```

데이터 변경 시 캐시의 최신성을 유지하기 위한 전략으로 사용할 수 있습니다.

다만 두 저장소 사이의 실패 처리와 일관성 정책을 별도로 설계해야 합니다.

### 16.4. Write-Behind

변경 데이터를 우선 캐시에 기록하고 원본 저장소에는 비동기적으로 반영하는 방식입니다.

```text
Write Request
      |
      v
Cache
      |
      v
Async Persistence
      |
      v
Database
```

쓰기 처리 지연을 줄일 수 있지만 캐시 장애가 발생하면 아직 영구 저장되지 않은 데이터가 손실될 수 있습니다.

따라서 데이터 유실 허용 여부와 내구성 요구사항을 고려해야 합니다.

### 16.5. 주요 전략 비교

| 전략 | 특징 | 주요 고려사항 |
|---|---|---|
| Cache-Aside | 애플리케이션이 캐시를 직접 관리 | 캐시 무효화 |
| Read-Through | 캐시 계층이 원본 조회를 담당 | 캐시 계층 구현 |
| Write-Through | 캐시와 원본 저장소에 쓰기 반영 | 쓰기 지연 및 정합성 |
| Write-Behind | 캐시 기록 후 비동기 영구 저장 | 데이터 손실 위험 |

## 17. Cache Stampede

Cache Stampede는 인기 데이터의 캐시가 만료되었을 때 여러 요청이 동시에 원본 데이터를 조회하면서 발생하는 부하 집중 현상입니다.

### 17.1. 발생 과정

```text
Cache Expired
      |
      v
1000 Concurrent Requests
      |
      v
1000 Cache Misses
      |
      v
1000 Database Queries
```

특히 Hot Key가 존재하는 서비스에서 문제가 될 수 있습니다.

### 17.2. 대응 방법

대표적인 대응 방식은 다음과 같습니다.

- 요청 병합(Singleflight)
- 캐시 갱신 시 Lock 적용
- TTL에 무작위 편차(Jitter) 적용
- 사전 캐시 갱신(Cache Warming)
- Stale-While-Revalidate
- 인기 데이터의 별도 캐시 관리

단일 프로세스의 요청 병합 기능만으로는 여러 NestJS Pod에서 발생하는 Cache Stampede를 완전히 방지할 수 없습니다.

분산 환경에서 동일한 데이터를 한 번만 생성해야 한다면 분산 Lock 또는 별도의 조정 메커니즘을 검토해야 합니다.

## 18. Kubernetes 환경의 Caching

NestJS 애플리케이션을 Kubernetes에 배포하는 경우 Cache Store의 위치가 중요합니다.

### 18.1. In-memory Cache

```text
Load Balancer
      |
      +-- NestJS Pod 1
      |       |
      |       +-- Memory Cache A
      |
      +-- NestJS Pod 2
      |       |
      |       +-- Memory Cache B
      |
      +-- NestJS Pod 3
              |
              +-- Memory Cache C
```

각 Pod는 독립적인 메모리 공간을 사용합니다.

따라서 Pod 1에 저장된 캐시를 Pod 2가 직접 조회할 수 없습니다.

이 구조에서는 동일한 데이터가 여러 Pod에 중복 저장될 수 있습니다.

### 18.2. Redis 기반 공유 캐시

```text
          Load Balancer
                |
       +--------+--------+
       |        |        |
       v        v        v
    Pod 1     Pod 2     Pod 3
       |        |        |
       +--------+--------+
                |
                v
              Redis
                |
                v
             Database
```

모든 Pod가 동일한 Redis 인스턴스 또는 클러스터에 접근하도록 구성할 수 있습니다.

이 경우 Pod 간에 캐시 데이터를 공유할 수 있습니다.

### 18.3. 수평 확장과 캐시

Kubernetes HPA로 Pod 수가 증가하더라도 Redis 기반 공유 캐시는 같은 데이터를 재사용할 수 있습니다.

다만 Redis 자체의 처리량, 네트워크 지연, 연결 수 및 장애 대응도 고려해야 합니다.

모든 요청을 Redis에 의존하도록 설계하면 Redis가 병목 지점이 될 수 있습니다.

따라서 로컬 캐시와 공유 캐시의 조합, 데이터 접근 패턴 및 장애 시 동작을 함께 설계하는 것이 좋습니다.

## 19. WebSocket 및 Microservices의 Caching

NestJS의 Cache 기능은 HTTP 요청뿐 아니라 WebSocket과 Microservices 환경에서도 활용할 수 있습니다.

### 19.1. WebSocket Handler 캐싱

WebSocket Gateway의 `@SubscribeMessage()` Handler에도 `CacheInterceptor`를 적용할 수 있습니다.

```typescript
import {
  UseInterceptors,
} from '@nestjs/common';

import {
  CacheInterceptor,
  CacheKey,
  CacheTTL,
} from '@nestjs/cache-manager';

import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway()
export class DataGateway {
  @SubscribeMessage('metadata')
  @CacheKey('metadata')
  @CacheTTL(60_000)
  @UseInterceptors(CacheInterceptor)
  getMetadata(
    @MessageBody() payload: unknown,
  ) {
    return {
      version: '1.0',
      status: 'active',
    };
  }
}
```

WebSocket에서는 HTTP URL을 기반으로 자동 Cache Key를 생성하는 방식이 아니므로 `@CacheKey()`가 필요합니다.

위 예제에서 `payload`는 실제 응답 생성에 사용하지 않는다고 가정합니다.

메시지 내용에 따라 응답이 달라지는 경우 고정된 Cache Key를 사용하면 잘못된 결과가 반환될 수 있습니다.

### 19.2. Microservices Handler 캐싱

Microservices의 Message Pattern Handler에도 CacheInterceptor를 적용할 수 있습니다.

다만 데이터 변경 작업이나 부수 효과가 있는 Handler를 무조건 캐싱해서는 안 됩니다.

읽기 전용 메시지에 대해서만 캐싱을 고려하는 것이 좋습니다.

### 19.3. 실시간 스트리밍 시스템에서의 캐시

WebSocket 기반 실시간 데이터 스트리밍 시스템에서는 일반적인 HTTP Response Cache와 다른 요구사항이 존재합니다.

예를 들어 다음과 같은 데이터는 별도로 관리할 수 있습니다.

- 종목 메타데이터
- 종목별 최신 가격 Snapshot
- 사용자 구독 설정
- Gateway가 조회하는 공통 설정

실시간 이벤트의 전달 자체와 캐시 데이터 조회는 구분해야 합니다.

Redis를 Cache Store로 사용한다고 해서 Redis Pub/Sub을 사용해야 하는 것은 아닙니다.

Redis Key-Value Cache와 Redis Pub/Sub은 서로 다른 기능이며, 애플리케이션 아키텍처에 따라 독립적으로 선택할 수 있습니다.

## 20. Cache Key 설계

캐시를 안정적으로 운영하려면 Key Naming Convention을 일관되게 유지하는 것이 중요합니다.

### 20.1. 권장 구조

일반적인 Cache Key는 다음과 같은 형식으로 구성할 수 있습니다.

```text
{domain}:{resource}:{identifier}
```

예시는 다음과 같습니다.

```text
users:profile:100
products:detail:200
products:popular
market:snapshot:MSFT
market:snapshot:NVDA
```

### 20.2. 버전 기반 키

데이터 구조가 변경될 가능성이 있다면 버전을 포함할 수 있습니다.

```text
v1:users:profile:100
v2:users:profile:100
```

이를 통해 서로 다른 데이터 구조가 동일한 키를 사용하여 충돌하는 문제를 줄일 수 있습니다.

### 20.3. 사용자 및 Tenant 구분

사용자나 Tenant별로 데이터가 달라지는 경우 식별자를 포함할 수 있습니다.

```text
tenant:100:products:list
tenant:200:products:list
```

단, 개인정보나 인증 토큰을 그대로 Key에 포함하지 않도록 주의해야 합니다.

## 21. Cache 성능 모니터링

Caching의 효과를 확인하려면 적절한 성능 지표가 필요합니다.

대표적인 지표는 다음과 같습니다.

| 지표 | 설명 |
|---|---|
| Cache Hit Count | 캐시 조회에 성공한 횟수 |
| Cache Miss Count | 캐시에 데이터가 존재하지 않은 횟수 |
| Cache Hit Ratio | 전체 조회 중 Cache Hit의 비율 |
| Cache Latency | 캐시 조회 및 저장에 소요되는 시간 |
| Eviction Count | 캐시에서 제거된 항목 수 |
| Memory Usage | 캐시 저장소의 메모리 사용량 |
| Redis Connections | Redis 연결 수 |
| Redis Command Latency | Redis 명령 처리 지연 |
| Database Query Count | 원본 데이터베이스 조회 횟수 |

### 21.1. Cache Hit Ratio

Cache Hit Ratio는 다음과 같이 계산합니다.

```text
Cache Hit Ratio =
  Cache Hits / (Cache Hits + Cache Misses) × 100
```

예를 들어 총 1,000번의 캐시 조회 중 800번이 Cache Hit이면 Hit Ratio는 80%입니다.

높은 Hit Ratio가 반드시 최적의 캐싱을 의미하는 것은 아닙니다.

데이터의 최신성, 캐시 유지 비용 및 원본 데이터 조회 비용을 함께 고려해야 합니다.

### 21.2. Redis 모니터링

Redis를 사용하는 경우 다음 항목을 확인하는 것이 좋습니다.

- Memory Usage
- Keyspace Hits / Misses
- Evicted Keys
- Expired Keys
- Connected Clients
- Command Latency
- Network Throughput

Grafana와 Prometheus 등의 모니터링 도구를 활용하여 Redis 상태와 애플리케이션 지표를 시각화할 수 있습니다.

단, Redis 전체 Keyspace Hit Ratio는 특정 NestJS 애플리케이션의 Cache Hit Ratio와 일치하지 않을 수 있습니다.

## 22. Cache 테스트

캐싱 로직은 Cache Hit과 Cache Miss 상황을 각각 검증해야 합니다.

### 22.1. CacheManager Mock

```typescript
import { Test } from '@nestjs/testing';

import {
  CACHE_MANAGER,
} from '@nestjs/cache-manager';

import { UsersService } from './users.service';

describe('UsersService Cache', () => {
  const cacheMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const repositoryMock = {
    findOneBy: jest.fn(),
  };

  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheMock,
        },
        {
          provide: getRepositoryToken(User),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('returns cached data on cache hit', async () => {
    const cachedUser = {
      id: 1,
      name: 'Kim',
    };

    cacheMock.get.mockResolvedValue(cachedUser);

    const result = await service.findOne(1);

    expect(result).toEqual(cachedUser);

    expect(repositoryMock.findOneBy)
      .not.toHaveBeenCalled();
  });
});
```

위 예제에서는 다음 Import가 추가로 필요합니다.

```typescript
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
```

NestJS의 기본 테스트 환경은 Jest를 사용하므로 별도의 테스트 환경을 구성하지 않았다면 해당 도구를 사용할 수 있습니다.

### 22.2. 테스트 시 확인할 항목

- Cache Hit 시 데이터베이스를 조회하지 않는지 확인합니다.
- Cache Miss 시 데이터베이스를 조회하는지 확인합니다.
- 조회된 데이터를 캐시에 저장하는지 확인합니다.
- 데이터 수정 후 적절한 캐시가 삭제되는지 확인합니다.
- TTL 만료 후 데이터가 다시 조회되는지 확인합니다.
- Redis 장애 발생 시 오류 처리가 적절한지 확인합니다.

실제 Redis와의 호환성, 만료 동작 및 다중 인스턴스의 캐시 정합성을 확인하려면 Integration Test가 필요합니다.

## 23. Caching 적용 시 주의사항

### 23.1. 모든 데이터를 캐싱하지 않습니다.

캐싱은 데이터 접근 비용을 줄일 수 있지만 캐시 저장 및 무효화 비용도 발생시킵니다.

따라서 조회 빈도, 데이터 크기, 변경 주기 및 정합성 요구사항을 고려해야 합니다.

### 23.2. Cache는 원본 데이터 저장소가 아닙니다.

일반적인 Cache는 데이터가 만료되거나 Eviction으로 제거될 수 있습니다.

따라서 영구 보존해야 하는 데이터는 별도의 데이터베이스 등에 저장해야 합니다.

### 23.3. 캐시 정합성을 고려합니다.

데이터베이스 값과 캐시 값이 일시적으로 불일치할 수 있습니다.

정합성이 중요한 데이터에서는 TTL만으로 해결하려 하지 않고 적절한 무효화 및 동시성 제어 전략을 설계해야 합니다.

### 23.4. Cache Key 충돌을 방지합니다.

서로 다른 데이터가 동일한 Key를 사용하면 잘못된 데이터가 반환될 수 있습니다.

사용자 ID, Tenant ID, Query Parameter 및 API 버전처럼 결과를 구분하는 정보를 적절하게 포함해야 합니다.

### 23.5. 메모리 사용량을 제한합니다.

In-memory Cache는 애플리케이션 프로세스의 메모리를 사용합니다.

캐시 항목 수나 데이터 크기를 제한하지 않으면 메모리 사용량이 증가할 수 있습니다.

LRU 정책, TTL 및 저장 가능한 최대 항목 수 등을 설정하는 것이 좋습니다.

### 23.6. Redis 장애를 고려합니다.

Redis를 사용하는 경우 연결 장애나 Timeout이 발생할 수 있습니다.

캐시가 서비스의 필수 구성 요소인지, 장애 시 데이터베이스 조회로 전환할 수 있는지에 따라 처리 정책이 달라집니다.

### 23.7. 캐시 데이터의 직렬화 방식을 확인합니다.

In-memory Cache와 Redis Cache는 저장된 객체를 반환하는 방식이 다를 수 있습니다.

특히 Date, Map, Set, 클래스 인스턴스 등의 데이터 타입을 사용하는 경우 직렬화 전후의 데이터 구조를 확인해야 합니다.

## 24. 실무 권장 설계

일반적인 NestJS 애플리케이션에서는 다음과 같은 구조를 고려할 수 있습니다.

```text
src/
├── common/
│   └── cache/
│       ├── cache.module.ts
│       ├── cache.service.ts
│       ├── cache-keys.ts
│       └── interceptors/
│           └── custom-cache.interceptor.ts
│
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── products/
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── products.module.ts
│
├── app.module.ts
└── main.ts
```

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| `cache.module.ts` | CacheManager 및 Store 설정 |
| `cache.service.ts` | 공통 캐시 조회 및 무효화 로직 |
| `cache-keys.ts` | Cache Key 생성 규칙 |
| `custom-cache.interceptor.ts` | 사용자 정의 자동 캐싱 정책 |
| Feature Service | 비즈니스 요구사항에 따른 캐시 활용 |

권장 사항은 다음과 같습니다.

1. 캐시 대상 데이터를 명확하게 정의합니다.
2. 기본 Cache Key Naming Convention을 수립합니다.
3. 데이터 특성에 따라 TTL을 설정합니다.
4. 데이터 변경 시 캐시 무효화 정책을 정의합니다.
5. 다중 인스턴스 환경에서는 캐시 공유 여부를 고려합니다.
6. Cache Hit Ratio와 Cache Latency를 측정합니다.
7. Redis 장애 시 Fallback 정책을 정의합니다.
8. 중요한 데이터의 정합성을 캐시만으로 보장하지 않습니다.
9. 캐시 저장소의 메모리 사용량을 제한합니다.
10. 트래픽이 집중되는 Hot Key와 Cache Stampede에 대비합니다.

## 25. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| Caching | 자주 사용하는 데이터를 임시 저장하여 재사용 |
| `CacheModule` | NestJS Cache 기능 등록 |
| `CACHE_MANAGER` | CacheManager 주입 Token |
| `Cache` | 캐시 조회, 저장, 삭제 API |
| `CacheInterceptor` | 응답 자동 캐싱 |
| `@CacheKey()` | 캐시 키 지정 |
| `@CacheTTL()` | 캐시 만료 시간 지정 |
| `trackBy()` | 사용자 정의 Cache Key 생성 |
| Keyv | Cache Store 추상화 계층 |
| In-memory Cache | 프로세스 내부 메모리에 데이터 저장 |
| Redis Cache | 외부 Redis에 데이터 저장 |
| Cache-Aside | Cache Miss 시 원본 데이터 조회 및 캐싱 |
| Cache Invalidation | 변경된 데이터의 캐시 무효화 |
| Cache Stampede | 동시 Cache Miss로 인한 원본 저장소 부하 |
| Cache Warming | 데이터 요청 전에 캐시를 미리 생성 |
| TTL | 캐시 데이터의 유효 기간 |

## 26. 정리

NestJS의 Caching 기능은 자주 조회하거나 생성 비용이 높은 데이터를 임시 저장하여 애플리케이션의 응답 성능과 처리 효율을 개선하는 데 사용합니다.

`CacheModule`은 CacheManager를 등록하고, `CACHE_MANAGER`를 통해 Service에서 캐시 저장소에 접근할 수 있도록 지원합니다.

`CacheInterceptor`를 사용하면 Controller의 GET 응답을 자동으로 캐싱할 수 있으며, `@CacheKey()`와 `@CacheTTL()`을 통해 캐시 키와 만료 시간을 제어할 수 있습니다.

최신 NestJS의 CacheManager는 Keyv를 기반으로 Memory, Redis 등 다양한 Cache Store와 연동할 수 있습니다.

여러 NestJS 인스턴스를 사용하는 환경에서는 Redis와 같은 공유 캐시를 고려할 수 있으며, 로컬 메모리 캐시를 함께 사용하는 경우 인스턴스 간 데이터 정합성도 관리해야 합니다.

또한 캐시를 효과적으로 사용하기 위해서는 단순히 데이터를 저장하는 것뿐 아니라 TTL, Cache Key, Cache Invalidation, Cache Stampede 및 장애 대응 전략을 함께 설계하는 것이 중요합니다.

Caching은 성능 최적화 기술인 동시에 데이터 일관성과 운영 복잡도에 영향을 미치는 기술입니다.

따라서 실제 프로젝트에서는 데이터의 특성과 정합성 요구사항을 바탕으로 적절한 캐싱 전략을 선택해야 합니다.

## 참고 자료

### NestJS 공식 문서

- [NestJS - Caching](https://docs.nestjs.com/techniques/caching)
- [NestJS - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS - Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - WebSocket Gateways](https://docs.nestjs.com/websockets/gateways)
- [NestJS - Microservices](https://docs.nestjs.com/microservices/basics)
- [NestJS - Caching Sample Repository](https://github.com/nestjs/nest/tree/master/sample/20-cache)

### CacheManager 및 Keyv

- [NestJS CacheManager GitHub Repository](https://github.com/nestjs/cache-manager)
- [cache-manager GitHub Repository](https://github.com/jaredwray/cacheable/tree/main/packages/cache-manager)
- [Keyv 공식 문서](https://keyv.org/)
- [Keyv - Redis Storage Adapter](https://keyv.org/docs/storage-adapters/redis/)
- [Keyv - NestJS Caching Guide](https://keyv.org/docs/caching/caching-nestjs/)
- [Cacheable 공식 문서](https://cacheable.org/)

### Redis 및 기타 참고 자료

- [Redis 공식 문서](https://redis.io/docs/latest/)
- [Redis - Key Expiration](https://redis.io/docs/latest/commands/expire/)
- [Redis - Eviction Policies](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis - Caching](https://redis.io/solutions/caching/)
- [Kubernetes - ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes - Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)