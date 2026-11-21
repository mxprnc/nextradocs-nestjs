# Database

## 1. 개요

Database는 애플리케이션에서 생성하거나 사용하는 데이터를 영구적으로 저장하고 조회하기 위한 시스템입니다.

대부분의 백엔드 애플리케이션은 사용자 정보, 주문 내역, 상품 데이터, 결제 기록 등 다양한 데이터를 관리하기 위해 데이터베이스를 사용합니다.

NestJS는 특정 데이터베이스나 ORM(Object-Relational Mapping)에 종속되지 않는 Database-agnostic 프레임워크입니다.

따라서 MySQL, PostgreSQL, MongoDB 등 다양한 데이터베이스와 연동할 수 있으며, 프로젝트 요구사항에 따라 적절한 데이터 접근 기술을 선택할 수 있습니다.

NestJS에서는 일반적으로 데이터베이스 클라이언트 또는 ORM의 Repository를 Provider로 등록하고, Dependency Injection을 통해 Service에 주입하는 구조를 사용합니다.

주요 데이터 접근 방식은 다음과 같습니다.

- 데이터베이스 Driver를 직접 사용하는 방식
- TypeORM, Prisma, Drizzle 등 ORM을 사용하는 방식
- Knex.js와 같은 Query Builder를 사용하는 방식
- Mongoose를 이용하여 MongoDB와 연동하는 방식

이 문서에서는 데이터베이스 연동의 기본 개념을 설명하고, **TypeORM과 MySQL을 기준으로 NestJS의 데이터베이스 통합 기능을 학습합니다.**

## 2. NestJS의 데이터베이스 아키텍처

### 2.1. 데이터베이스 접근 구조

NestJS 애플리케이션은 일반적으로 Controller, Service, Repository 등의 계층을 통해 데이터베이스에 접근합니다.

```text
HTTP Request
     |
     v
Controller
     |
     v
Service
     |
     v
Repository
     |
     v
ORM / Database Driver
     |
     v
Database
```

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| Controller | HTTP 요청을 수신하고 Service를 호출합니다. |
| Service | 비즈니스 로직과 데이터 처리 흐름을 관리합니다. |
| Repository | 데이터베이스 조회 및 저장 작업을 수행합니다. |
| ORM | 객체와 데이터베이스 테이블 사이의 매핑을 처리합니다. |
| Database Driver | 데이터베이스 서버와 실제 통신을 수행합니다. |
| Database | 데이터를 저장하고 조회합니다. |

NestJS에서 Repository 계층을 반드시 별도 클래스로 구현해야 하는 것은 아닙니다.

TypeORM을 사용하는 경우 ORM이 제공하는 `Repository<Entity>`를 Service에 직접 주입할 수 있습니다.

반면 데이터 접근 구현을 비즈니스 로직에서 분리하고자 한다면 별도의 Repository 추상화 계층을 구성할 수도 있습니다.

### 2.2. Dependency Injection과 Database

NestJS는 데이터베이스 관련 객체를 Provider로 등록하여 관리할 수 있습니다.

예를 들어 TypeORM의 `Repository<User>`를 Service에 주입할 수 있습니다.

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
}
```

이 구조에서는 Service가 데이터베이스 연결 객체를 직접 생성하지 않습니다.

NestJS의 DI Container가 등록된 Repository Provider를 찾아 주입합니다.

이를 통해 데이터 접근 객체의 생성과 의존성 관리를 프레임워크에 위임할 수 있습니다.

## 3. 데이터베이스 접근 기술

### 3.1. Database Driver

Database Driver는 애플리케이션과 데이터베이스 서버 사이의 통신을 담당하는 라이브러리입니다.

대표적인 예시는 다음과 같습니다.

| 데이터베이스 | Node.js Driver |
|---|---|
| MySQL | `mysql2` |
| PostgreSQL | `pg` |
| MongoDB | `mongodb` |
| Microsoft SQL Server | `mssql` |
| SQLite | `better-sqlite3` 등 |

예를 들어 MySQL Driver를 직접 사용하면 SQL을 작성하여 데이터를 조회할 수 있습니다.

```typescript
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'app_user',
  password: 'example-password',
  database: 'app_db',
});

try {
  const [rows] = await connection.execute(
    'SELECT * FROM users WHERE id = ?',
    [1],
  );

  console.log(rows);
} finally {
  await connection.end();
}
```

위 예제는 Driver 사용법을 설명하기 위한 코드입니다.

실제 NestJS 애플리케이션에서는 요청마다 연결을 생성하기보다 Connection Pool과 Provider를 이용하여 연결을 재사용하는 방식이 적절합니다.

### 3.2. ORM

ORM(Object-Relational Mapping)은 객체지향 프로그래밍 언어의 객체와 관계형 데이터베이스의 테이블을 매핑하는 기술입니다.

예를 들어 다음과 같은 데이터베이스 테이블이 있다고 가정합니다.

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL
);
```

TypeORM에서는 이를 다음과 같은 Entity 클래스로 표현할 수 있습니다.

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  email!: string;

  @Column()
  name!: string;
}
```

ORM은 Entity 메타데이터를 이용하여 데이터베이스의 테이블 및 컬럼과 객체를 매핑합니다.

단, ORM을 사용하더라도 SQL, 인덱스, 트랜잭션 및 데이터베이스의 실행 계획을 이해하는 것이 중요합니다.

### 3.3. NestJS에서 사용할 수 있는 주요 ORM

| 기술 | 특징 | 대표적인 사용 환경 |
|---|---|---|
| TypeORM | Decorator 기반 Entity, Repository 패턴 | SQL 중심 애플리케이션 |
| Prisma | Schema 기반 모델 정의 및 타입 안전한 Client 생성 | TypeScript 기반 데이터 접근 |
| Drizzle ORM | TypeScript 기반 Schema 및 SQL 중심 API | SQL 제어와 타입 추론이 중요한 환경 |
| MikroORM | Data Mapper, Unit of Work, Identity Map | 도메인 모델 중심 애플리케이션 |
| Sequelize | Model 기반 ORM | 다양한 관계형 데이터베이스 |
| Mongoose | MongoDB Schema 및 Model | MongoDB 애플리케이션 |

NestJS는 TypeORM과의 통합을 위해 `@nestjs/typeorm` 패키지를 제공합니다.

Prisma는 별도의 NestJS 전용 패키지 없이 생성된 Prisma Client를 Provider로 등록하여 사용할 수 있습니다.

## 4. TypeORM 환경 구성

### 4.1. 패키지 설치

NestJS에서 TypeORM과 MySQL을 연동하려면 다음 패키지를 설치합니다.

```bash
npm install @nestjs/typeorm typeorm mysql2
```

환경 변수 기반 설정을 사용하려면 다음 패키지도 설치합니다.

```bash
npm install @nestjs/config
```

주요 패키지의 역할은 다음과 같습니다.

| 패키지 | 역할 |
|---|---|
| `@nestjs/typeorm` | NestJS와 TypeORM을 통합합니다. |
| `typeorm` | Entity, Repository, DataSource 등 ORM 기능을 제공합니다. |
| `mysql2` | MySQL 서버와 통신하는 Driver입니다. |
| `@nestjs/config` | 환경 변수를 관리합니다. |

이후 예제는 TypeORM의 `DataSource` API를 사용하는 버전을 기준으로 작성합니다.

TypeORM의 주요 버전에 따라 설정 옵션과 CLI 동작이 달라질 수 있으므로 설치된 버전의 공식 문서를 확인해야 합니다.

### 4.2. 프로젝트 구조

```text
src/
├── config/
│   └── database.config.ts
│
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── entities/
│   │   └── user.entity.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── app.module.ts
└── main.ts

.env
```

### 4.3. 환경 변수 설정

`.env`

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=app_user
DATABASE_PASSWORD=example-password
DATABASE_NAME=app_db
```

실제 인증 정보가 포함된 `.env` 파일은 Git 저장소에서 제외해야 합니다.

데이터베이스 설정값을 관리하는 방법은 `configuration.md`에서 자세히 설명합니다.

## 5. TypeOrmModule

`TypeOrmModule`은 NestJS 애플리케이션에서 TypeORM을 사용할 수 있도록 구성하는 모듈입니다.

주요 메서드는 다음과 같습니다.

| 메서드 | 역할 |
|---|---|
| `forRoot()` | 데이터베이스 연결과 DataSource를 초기화합니다. |
| `forRootAsync()` | 다른 Provider를 사용하여 동적으로 연결을 구성합니다. |
| `forFeature()` | 특정 모듈에서 사용할 Entity의 Repository Provider를 등록합니다. |

### 5.1. forRoot()

정적인 연결 설정을 사용하는 경우 다음과 같이 구성할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'app_user',
      password: 'example-password',
      database: 'app_db',
      autoLoadEntities: true,
      synchronize: false,
    }),
  ],
})
export class AppModule {}
```

`forRoot()`는 TypeORM 연결 설정을 등록하고 DataSource를 초기화합니다.

이 예제에서는 데이터베이스 주소와 인증 정보가 코드에 고정되어 있으므로 실제 프로젝트에서는 환경 변수 기반 구성을 사용하는 것이 좋습니다.

### 5.2. forRootAsync()

`forRootAsync()`는 NestJS의 Dependency Injection을 이용하여 데이터베이스 연결 옵션을 동적으로 생성합니다.

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
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.getOrThrow<string>(
          'DATABASE_HOST',
        ),
        port: Number(
          configService.getOrThrow<string>(
            'DATABASE_PORT',
          ),
        ),
        username: configService.getOrThrow<string>(
          'DATABASE_USERNAME',
        ),
        password: configService.getOrThrow<string>(
          'DATABASE_PASSWORD',
        ),
        database: configService.getOrThrow<string>(
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

`useFactory`는 연결 옵션을 반환하는 Factory 함수입니다.

`inject`는 Factory 함수에 주입할 Provider를 지정합니다.

이 구조를 사용하면 실행 환경에 따라 서로 다른 데이터베이스 연결 정보를 적용할 수 있습니다.

### 5.3. autoLoadEntities

`autoLoadEntities`를 활성화하면 `TypeOrmModule.forFeature()`에 등록된 Entity를 DataSource 설정에 자동으로 포함할 수 있습니다.

```typescript
TypeOrmModule.forRoot({
  // 연결 설정
  autoLoadEntities: true,
});
```

이 방식은 모든 Entity를 루트 모듈에서 명시적으로 나열해야 하는 부담을 줄입니다.

다만 다른 Entity의 관계 속성에서만 참조되고 `forFeature()`에 등록되지 않은 Entity까지 자동으로 포함되는 것은 아닙니다.

### 5.4. synchronize

`synchronize`는 Entity 메타데이터를 기준으로 데이터베이스 Schema를 자동 동기화하는 옵션입니다.

```typescript
synchronize: false
```

`true`로 설정하면 애플리케이션 실행 시 테이블 및 컬럼 구조가 자동으로 변경될 수 있습니다.

개발 초기에는 편리할 수 있지만 운영 데이터가 존재하는 환경에서 사용하면 예기치 않은 Schema 변경이나 데이터 손실 위험이 있습니다.

따라서 운영 환경에서는 `synchronize: false`를 사용하고 Migration으로 Schema 변경을 관리하는 것이 적절합니다.

## 6. Entity

Entity는 데이터베이스 테이블과 매핑되는 클래스입니다.

TypeORM에서는 Decorator를 이용하여 테이블, 컬럼, Primary Key 및 관계를 정의합니다.

### 6.1. 기본 Entity 정의

`users/entities/user.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ length: 255 })
  email!: string;

  @Column({ length: 100 })
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

주요 Decorator는 다음과 같습니다.

| Decorator | 설명 |
|---|---|
| `@Entity()` | 클래스를 데이터베이스 Entity로 정의합니다. |
| `@PrimaryGeneratedColumn()` | 자동 생성 Primary Key를 정의합니다. |
| `@PrimaryColumn()` | 직접 지정하는 Primary Key를 정의합니다. |
| `@Column()` | 일반 컬럼을 정의합니다. |
| `@CreateDateColumn()` | 생성 시각을 관리합니다. |
| `@UpdateDateColumn()` | 수정 시각을 관리합니다. |
| `@DeleteDateColumn()` | Soft Delete에 사용할 컬럼을 정의합니다. |
| `@Index()` | 인덱스를 정의합니다. |
| `@Unique()` | Unique 제약 조건을 정의합니다. |

### 6.2. Entity와 DTO의 차이

Entity와 DTO는 목적이 다릅니다.

| 구분 | Entity | DTO |
|---|---|---|
| 주요 역할 | 데이터베이스 테이블 매핑 | 요청 및 응답 데이터 구조 정의 |
| 주요 Decorator | `@Entity`, `@Column` | `@IsString`, `@IsEmail` 등 |
| 사용 계층 | Persistence 계층 | API 계층 |
| 주요 책임 | 데이터 저장 구조 | 데이터 전달 및 검증 |

예를 들어 사용자 생성 요청은 `CreateUserDto`로 검증하고, 검증된 데이터를 `User` Entity로 변환하여 저장할 수 있습니다.

Entity와 DTO를 분리하면 데이터베이스 Schema 변경과 API 계약 변경을 독립적으로 관리하기 쉬워집니다.

## 7. Repository

Repository는 특정 Entity의 데이터를 조회, 생성, 수정 및 삭제하기 위한 객체입니다.

TypeORM에서는 `Repository<Entity>`를 통해 기본적인 데이터 접근 메서드를 제공합니다.

### 7.1. forFeature()

`forFeature()`를 사용하여 특정 Feature Module에서 사용할 Repository를 등록합니다.

`users/users.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

`TypeOrmModule.forFeature([User])`는 해당 모듈에서 `User` Entity의 Repository를 주입할 수 있도록 등록합니다.

### 7.2. @InjectRepository()

Service에서 Repository를 주입받으려면 `@InjectRepository()`를 사용합니다.

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
}
```

NestJS는 `User` Entity에 해당하는 Repository Provider를 주입합니다.

### 7.3. Repository 주요 메서드

| 메서드 | 설명 |
|---|---|
| `create()` | Entity 인스턴스를 생성합니다. |
| `save()` | Entity를 저장하거나 갱신합니다. |
| `find()` | 조건에 해당하는 여러 Entity를 조회합니다. |
| `findOne()` | 조건에 해당하는 단일 Entity를 조회합니다. |
| `findOneBy()` | Where 조건으로 단일 Entity를 조회합니다. |
| `findBy()` | Where 조건으로 여러 Entity를 조회합니다. |
| `count()` | 조건에 해당하는 Entity 개수를 조회합니다. |
| `insert()` | 데이터를 삽입합니다. |
| `update()` | 조건에 해당하는 데이터를 수정합니다. |
| `delete()` | 조건에 해당하는 데이터를 삭제합니다. |
| `softDelete()` | Soft Delete를 수행합니다. |
| `restore()` | Soft Delete된 데이터를 복원합니다. |
| `createQueryBuilder()` | QueryBuilder를 생성합니다. |

`create()`는 Entity 객체를 생성하지만 데이터베이스에 INSERT를 수행하지 않습니다.

반면 `save()`는 데이터베이스에 저장 작업을 수행합니다.

## 8. CRUD 구현

CRUD는 Create, Read, Update, Delete의 약자로 데이터 관리의 기본 작업을 의미합니다.

### 8.1. Create DTO

`users/dto/create-user.dto.ts`

```typescript
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
```

이 DTO는 `ValidationPipe`가 적용되어 있다는 전제에서 요청 데이터의 유효성을 검증합니다.

### 8.2. 사용자 생성

```typescript
async create(dto: CreateUserDto): Promise<User> {
  const user = this.usersRepository.create({
    email: dto.email,
    name: dto.name,
  });

  return this.usersRepository.save(user);
}
```

처리 과정은 다음과 같습니다.

1. Controller가 `CreateUserDto`를 전달합니다.
2. `Repository.create()`가 Entity 인스턴스를 생성합니다.
3. `Repository.save()`가 데이터베이스에 저장합니다.
4. 저장된 Entity를 반환합니다.

### 8.3. 사용자 목록 조회

```typescript
async findAll(): Promise<User[]> {
  return this.usersRepository.find({
    order: {
      id: 'DESC',
    },
  });
}
```

`find()`는 여러 Entity를 배열로 반환합니다.

### 8.4. 단일 사용자 조회

```typescript
import {
  NotFoundException,
} from '@nestjs/common';

async findOne(id: number): Promise<User> {
  const user = await this.usersRepository.findOneBy({
    id,
  });

  if (!user) {
    throw new NotFoundException(
      `User ${id} not found`,
    );
  }

  return user;
}
```

`findOneBy()`는 조건에 일치하는 Entity를 반환하며, 결과가 없으면 `null`을 반환할 수 있습니다.

### 8.5. 사용자 수정

수정 요청에 사용할 DTO는 다음과 같이 정의할 수 있습니다.

`users/dto/update-user.dto.ts`

```typescript
import {
  PartialType,
} from '@nestjs/mapped-types';

import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  CreateUserDto,
) {}
```

`PartialType()`을 사용하려면 `@nestjs/mapped-types` 패키지가 설치되어 있어야 합니다.

```bash
npm install @nestjs/mapped-types
```

Service에서는 다음과 같이 수정할 수 있습니다.

```typescript
async update(
  id: number,
  dto: UpdateUserDto,
): Promise<User> {
  const user = await this.findOne(id);

  Object.assign(user, dto);

  return this.usersRepository.save(user);
}
```

기존 Entity를 조회한 다음 변경 내용을 적용하여 저장합니다.

이 방식은 Entity에 적용된 TypeORM의 저장 관련 동작을 활용할 수 있습니다.

다만 요청 데이터 전체를 무조건 `Object.assign()`으로 복사하기보다 허용된 DTO 속성만 반영하도록 설계해야 합니다.

### 8.6. 사용자 삭제

```typescript
async remove(id: number): Promise<void> {
  const result = await this.usersRepository.delete(id);

  if (!result.affected) {
    throw new NotFoundException(
      `User ${id} not found`,
    );
  }
}
```

`delete()`는 조건에 해당하는 레코드를 삭제합니다.

Entity를 미리 조회하여 반환하거나 Entity Listener 등의 동작을 활용해야 하는 경우에는 `remove()`를 검토할 수 있습니다.

### 8.7. Controller 구성

`users/users.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.remove(id);
  }
}
```

Controller는 HTTP 요청을 처리하고 Service에 작업을 위임합니다.

요청 검증과 응답 직렬화는 각각 `validation.md`, `serialization.md`에서 설명한 기능과 결합할 수 있습니다.

## 9. Entity 관계 매핑

관계형 데이터베이스에서는 여러 테이블 사이에 관계를 정의할 수 있습니다.

TypeORM은 관계를 표현하기 위한 Decorator를 제공합니다.

| Decorator | 관계 |
|---|---|
| `@OneToOne()` | 일대일 |
| `@OneToMany()` | 일대다 |
| `@ManyToOne()` | 다대일 |
| `@ManyToMany()` | 다대다 |
| `@JoinColumn()` | 관계의 Foreign Key 소유 측 지정 |
| `@JoinTable()` | Many-to-Many의 Join Table 지정 |

### 9.1. One-to-Many / Many-to-One

사용자 한 명이 여러 게시글을 작성할 수 있다고 가정합니다.

`user.entity.ts`

```typescript
import {
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Post } from './post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToMany(() => Post, (post) => post.author)
  posts!: Post[];
}
```

`post.entity.ts`

```typescript
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @ManyToOne(() => User, (user) => user.posts)
  author!: User;
}
```

이 관계에서는 일반적으로 `posts` 테이블에 사용자 정보를 참조하는 Foreign Key가 생성됩니다.

실제 컬럼 이름과 제약 조건은 Naming Strategy 및 관계 설정에 따라 달라질 수 있습니다.

### 9.2. 관계 데이터 조회

```typescript
const users = await this.usersRepository.find({
  relations: {
    posts: true,
  },
});
```

이 예제는 사용자와 연관된 게시글을 함께 조회합니다.

관계 데이터의 로딩 방식은 Eager Loading, Lazy Loading 및 명시적 조회 설정에 따라 달라질 수 있습니다.

### 9.3. N+1 Query 문제

관계 데이터를 조회할 때 주의해야 할 대표적인 문제는 N+1 Query입니다.

예를 들어 사용자 100명을 조회한 다음 각 사용자의 게시글을 개별적으로 조회하면 다음과 같은 SQL 실행이 발생할 수 있습니다.

```text
1 Query  : 사용자 목록 조회
100 Query: 각 사용자의 게시글 조회

총 101 Query
```

이러한 구조는 데이터베이스에 불필요한 부하를 발생시킬 수 있습니다.

필요에 따라 `relations`, `QueryBuilder`, JOIN 또는 별도의 Batch Query를 활용하여 해결할 수 있습니다.

모든 관계를 무조건 JOIN하는 것이 최적의 방식은 아니므로 조회 데이터의 크기와 Cardinality를 함께 고려해야 합니다.

## 10. QueryBuilder

TypeORM의 QueryBuilder는 복잡한 SQL 조회 조건을 TypeScript API로 구성할 수 있도록 지원합니다.

### 10.1. 기본 사용법

```typescript
const users = await this.usersRepository
  .createQueryBuilder('user')
  .where('user.name = :name', {
    name: 'Kim',
  })
  .orderBy('user.id', 'DESC')
  .getMany();
```

`:name`은 Query Parameter입니다.

SQL 문자열에 사용자 입력값을 직접 결합하는 대신 Parameter Binding을 사용하면 SQL Injection 위험을 줄일 수 있습니다.

### 10.2. JOIN

```typescript
const users = await this.usersRepository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'post')
  .where('user.id = :id', { id: 1 })
  .getMany();
```

`leftJoinAndSelect()`는 관계를 JOIN하고 조회 결과에 포함하도록 구성합니다.

### 10.3. Pagination

```typescript
const page = 1;
const limit = 20;

const [users, total] = await this.usersRepository
  .createQueryBuilder('user')
  .orderBy('user.id', 'DESC')
  .skip((page - 1) * limit)
  .take(limit)
  .getManyAndCount();
```

`skip()`과 `take()`를 사용하면 Offset 기반 Pagination을 구현할 수 있습니다.

데이터가 매우 많거나 페이지가 깊어지는 경우에는 Offset 기반 Pagination의 성능 저하를 고려해야 합니다.

이때 Cursor 또는 Keyset Pagination이 대안이 될 수 있습니다.

## 11. Transaction

Transaction은 여러 데이터베이스 작업을 하나의 논리적인 작업 단위로 처리하는 기능입니다.

일반적으로 트랜잭션은 ACID 특성을 기준으로 설명합니다.

| 특성 | 설명 |
|---|---|
| Atomicity | 모든 작업이 성공하거나 실패해야 합니다. |
| Consistency | 데이터베이스의 무결성 규칙을 유지해야 합니다. |
| Isolation | 동시 트랜잭션 간 간섭을 제어합니다. |
| Durability | 커밋된 데이터가 지속적으로 보존되어야 합니다. |

### 11.1. DataSource

TypeORM의 `DataSource`는 데이터베이스 연결 설정과 연결 상태를 관리하는 객체입니다.

NestJS에서는 DI를 이용하여 `DataSource`를 주입할 수 있습니다.

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}
}
```

### 11.2. transaction()

`DataSource.transaction()`을 사용하면 트랜잭션 범위에서 여러 작업을 실행할 수 있습니다.

다음은 주문과 주문 항목을 함께 저장하는 예제입니다.

```typescript
async createOrder(
  userId: number,
  items: CreateOrderItemDto[],
): Promise<Order> {
  return this.dataSource.transaction(
    async (manager) => {
      const order = manager.create(Order, {
        userId,
      });

      const savedOrder = await manager.save(order);

      const orderItems = items.map((item) =>
        manager.create(OrderItem, {
          order: savedOrder,
          productId: item.productId,
          quantity: item.quantity,
        }),
      );

      await manager.save(orderItems);

      return savedOrder;
    },
  );
}
```

이 예제는 `Order`, `OrderItem`, `CreateOrderItemDto`가 별도로 정의되어 있으며, 해당 Entity들이 TypeORM에 등록되어 있다고 가정합니다.

트랜잭션 콜백에서 예외가 발생하면 해당 트랜잭션은 Rollback됩니다.

**중요한 점은 트랜잭션 내부의 모든 데이터베이스 작업에 전달받은 `manager`를 사용해야 한다는 것입니다.**

트랜잭션 외부에서 주입받은 일반 Repository를 혼용하면 동일한 트랜잭션에 참여하지 않을 수 있습니다.

### 11.3. 트랜잭션 격리 수준

트랜잭션의 격리 수준은 동시 실행되는 작업이 서로에게 미치는 영향을 제어합니다.

대표적인 격리 수준은 다음과 같습니다.

| Isolation Level | 설명 |
|---|---|
| READ UNCOMMITTED | 커밋되지 않은 데이터를 읽을 수 있는 가장 낮은 수준입니다. |
| READ COMMITTED | 커밋된 데이터만 읽도록 제한합니다. |
| REPEATABLE READ | 동일 트랜잭션의 반복 읽기에 대한 일관성을 강화합니다. |
| SERIALIZABLE | 직렬 실행과 동등한 결과를 보장하도록 격리를 강화합니다. |

격리 수준의 실제 동작은 데이터베이스 제품과 저장 엔진에 따라 달라집니다.

TypeORM에서는 다음과 같이 지정할 수 있습니다.

```typescript
await this.dataSource.transaction(
  'SERIALIZABLE',
  async (manager) => {
    // 트랜잭션 작업
  },
);
```

높은 격리 수준은 데이터 정합성에 유리할 수 있지만 Lock 경합이나 트랜잭션 재시도로 인한 비용이 증가할 수 있습니다.

### 11.4. QueryRunner

`QueryRunner`는 특정 데이터베이스 연결을 직접 제어할 수 있도록 제공하는 API입니다.

트랜잭션의 시작, Commit, Rollback을 명시적으로 관리할 수 있습니다.

```typescript
const queryRunner =
  this.dataSource.createQueryRunner();

await queryRunner.connect();

try {
  await queryRunner.startTransaction();

  await queryRunner.manager.save(order);
  await queryRunner.manager.save(orderItems);

  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

위 예제의 `order`, `orderItems`는 사전에 생성한 Entity 객체라고 가정합니다.

`release()`는 사용한 데이터베이스 연결을 반환하기 위해 반드시 호출해야 합니다.

`QueryRunner`는 명시적인 트랜잭션 제어가 필요한 경우 유용하지만, 일반적인 트랜잭션은 `DataSource.transaction()`으로도 처리할 수 있습니다.

## 12. Migration

Migration은 데이터베이스 Schema의 변경 이력을 코드로 관리하는 기능입니다.

예를 들어 사용자 테이블에 새로운 컬럼을 추가하거나 인덱스를 생성하는 작업을 Migration으로 관리할 수 있습니다.

### 12.1. Migration이 필요한 이유

Entity만 수정하고 운영 데이터베이스를 수동으로 변경하면 환경별 Schema 불일치가 발생할 수 있습니다.

Migration을 사용하면 다음과 같은 이점이 있습니다.

- Schema 변경 이력을 Git으로 관리할 수 있습니다.
- 개발, 테스트, 운영 환경에 동일한 변경을 적용할 수 있습니다.
- 변경 작업의 실행 순서를 관리할 수 있습니다.
- 일부 변경에 대해 Rollback 절차를 정의할 수 있습니다.

### 12.2. DataSource 설정

TypeORM CLI에서 Migration을 실행하려면 별도의 DataSource 설정 파일을 구성할 수 있습니다.

`src/data-source.ts`

```typescript
import 'dotenv/config';
import { DataSource } from 'typeorm';

import { User } from './users/entities/user.entity';

export default new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
```

위 예제는 TypeScript 환경에서 Migration CLI를 실행하기 위한 구성 예시입니다.

실제 프로젝트에서는 TypeORM CLI가 사용하는 모듈 형식, DataSource Export 방식, TypeScript 실행 환경 및 빌드 경로에 맞게 조정해야 합니다.

또한 `dotenv`가 별도로 설치되어 있어야 합니다.

```bash
npm install dotenv
```

TypeORM의 주요 버전에 따라 CLI의 DataSource 로딩 규칙이 다를 수 있습니다.

### 12.3. Migration 생성

TypeORM의 CLI를 사용하여 Entity와 실제 데이터베이스 Schema 사이의 차이를 기반으로 Migration을 생성할 수 있습니다.

예를 들어 CommonJS 기반 TypeScript 프로젝트에서는 버전에 따라 다음과 같은 실행 방식을 사용할 수 있습니다.

```bash
npx typeorm-ts-node-commonjs migration:generate \
  src/migrations/CreateUsersTable \
  -d src/data-source.ts
```

ESM 프로젝트에서는 `typeorm-ts-node-esm`과 같은 별도의 실행 방식을 사용할 수 있습니다.

Migration을 생성하기 전에는 대상 데이터베이스와 DataSource 설정이 올바른지 확인해야 합니다.

### 12.4. Migration 실행

```bash
npx typeorm-ts-node-commonjs migration:run \
  -d src/data-source.ts
```

아직 적용되지 않은 Migration이 순서대로 실행됩니다.

### 12.5. Migration 되돌리기

```bash
npx typeorm-ts-node-commonjs migration:revert \
  -d src/data-source.ts
```

일반적으로 가장 최근에 적용한 Migration을 되돌리는 데 사용합니다.

다만 모든 Schema 변경을 안전하게 되돌릴 수 있는 것은 아닙니다.

특히 컬럼 삭제나 데이터 타입 변경과 같이 데이터 손실이 발생할 수 있는 작업은 별도의 백업과 복구 전략이 필요합니다.

### 12.6. 운영 환경 Migration

운영 환경에서는 다음 사항을 고려해야 합니다.

1. 배포 전에 Migration을 검토합니다.
2. 데이터베이스 백업 및 복구 절차를 준비합니다.
3. 서비스 중단이 발생할 수 있는 DDL 작업을 확인합니다.
4. 여러 애플리케이션 인스턴스가 동시에 Migration을 실행하지 않도록 관리합니다.
5. 애플리케이션과 데이터베이스 Schema의 호환성을 고려합니다.

Kubernetes 환경에서는 Migration을 애플리케이션의 Pod 시작 로직에 무조건 포함하기보다 별도의 배포 단계나 Job으로 실행하는 방식을 고려할 수 있습니다.

## 13. Database Connection Pool

Connection Pool은 데이터베이스 연결을 미리 생성하거나 재사용하여 연결 생성 비용을 줄이는 기능입니다.

### 13.1. Connection Pool의 필요성

데이터베이스 요청마다 새로운 TCP 연결과 인증 과정을 반복하면 불필요한 비용이 발생합니다.

Connection Pool을 사용하면 기존 연결을 재사용할 수 있습니다.

```text
NestJS Application
        |
        v
   Connection Pool
    /    |    \
   /     |     \
 Conn1 Conn2 Conn3
   \     |     /
    \    |    /
        v
      MySQL
```

### 13.2. Pool 설정

MySQL 기반 TypeORM에서는 Driver 및 TypeORM 버전에 따라 Pool 크기를 설정할 수 있습니다.

예를 들어 다음과 같은 옵션을 사용할 수 있습니다.

```typescript
TypeOrmModule.forRoot({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'app_user',
  password: 'example-password',
  database: 'app_db',
  extra: {
    connectionLimit: 10,
  },
});
```

`extra`는 Driver별 연결 옵션을 전달하는 데 사용됩니다.

따라서 지원되는 Pool 옵션은 선택한 데이터베이스 Driver에 따라 달라질 수 있습니다.

### 13.3. Kubernetes 환경의 Pool 계산

Kubernetes에서 NestJS Gateway 또는 API Pod를 여러 개 실행한다면 각 Pod가 별도의 Connection Pool을 생성할 수 있습니다.

예를 들어 다음과 같은 환경을 가정합니다.

```text
NestJS Replicas: 5
Pool Size per Replica: 10
```

이론적인 최대 연결 수는 다음과 같습니다.

```text
5 Replicas × 10 Connections
= 50 Connections
```

실제 연결 수는 Pool의 동작 및 트래픽에 따라 달라집니다.

HPA로 Pod 수가 증가할 수 있다면 최대 Replica 수까지 고려하여 데이터베이스의 연결 한도를 설정해야 합니다.

또한 애플리케이션의 다른 프로세스, Migration 작업 및 관리 도구가 사용하는 연결 수도 함께 고려해야 합니다.

## 14. Database 성능 최적화

### 14.1. 필요한 컬럼만 조회

다음과 같이 필요한 속성만 조회할 수 있습니다.

```typescript
const users = await this.usersRepository.find({
  select: {
    id: true,
    email: true,
    name: true,
  },
});
```

불필요한 대용량 컬럼을 조회하지 않으면 데이터베이스와 네트워크의 처리 비용을 줄일 수 있습니다.

### 14.2. 인덱스 활용

검색 조건으로 자주 사용되는 컬럼에는 적절한 인덱스를 적용할 수 있습니다.

```typescript
@Index()
@Column()
email!: string;
```

인덱스는 조회 성능을 개선할 수 있지만 INSERT, UPDATE, DELETE 과정에서 유지 비용을 발생시킵니다.

따라서 조회 패턴과 실제 실행 계획을 기준으로 설계하는 것이 중요합니다.

### 14.3. QueryBuilder의 실행 계획 확인

ORM으로 작성한 쿼리도 실제로는 SQL로 변환되어 실행됩니다.

TypeORM에서는 다음과 같이 SQL을 확인할 수 있습니다.

```typescript
const query = this.usersRepository
  .createQueryBuilder('user')
  .where('user.email = :email', {
    email: 'user@example.com',
  });

console.log(query.getSql());
```

실제 성능 분석에서는 데이터베이스의 `EXPLAIN` 또는 `EXPLAIN ANALYZE` 등 실행 계획 분석 도구를 함께 사용해야 합니다.

### 14.4. Bulk Operation

여러 데이터를 한 번에 삽입해야 하는 경우 개별 INSERT를 반복하는 대신 Bulk Operation을 사용할 수 있습니다.

```typescript
await this.usersRepository.insert([
  {
    email: 'user1@example.com',
    name: 'User 1',
  },
  {
    email: 'user2@example.com',
    name: 'User 2',
  },
]);
```

Bulk Insert는 왕복 통신 횟수를 줄이는 데 유용합니다.

다만 대량의 데이터를 하나의 요청으로 처리하면 쿼리 크기, Lock 유지 시간 및 메모리 사용량이 증가할 수 있으므로 적절한 Batch 크기를 설정하는 것이 좋습니다.

## 15. Database Error Handling

데이터베이스 작업 중에는 다양한 오류가 발생할 수 있습니다.

대표적인 예시는 다음과 같습니다.

- Unique Constraint 위반
- Foreign Key Constraint 위반
- Database Connection 실패
- Deadlock
- Lock Wait Timeout
- Query Timeout

### 15.1. Unique Constraint 오류 처리

MySQL에서는 중복 키 오류가 일반적으로 `ER_DUP_ENTRY` 코드로 전달됩니다.

TypeORM에서는 `QueryFailedError`를 통해 데이터베이스 Driver의 오류 정보를 확인할 수 있습니다.

```typescript
import {
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { QueryFailedError } from 'typeorm';

@Injectable()
export class UsersService {
  async create(dto: CreateUserDto) {
    try {
      const user = this.usersRepository.create(dto);

      return await this.usersRepository.save(user);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as {
          code?: string;
        };

        if (driverError.code === 'ER_DUP_ENTRY') {
          throw new ConflictException(
            'Email already exists',
          );
        }
      }

      throw error;
    }
  }
}
```

이 예제는 MySQL Driver의 오류 코드에 의존합니다.

PostgreSQL 등 다른 데이터베이스에서는 오류 코드가 달라질 수 있습니다.

데이터베이스 오류를 모든 Service에서 반복적으로 처리해야 한다면 별도의 오류 변환 계층이나 Exception Filter를 고려할 수 있습니다.

### 15.2. 트랜잭션 재시도

Deadlock 또는 일시적인 연결 오류는 재시도를 통해 복구할 수 있는 경우가 있습니다.

다만 모든 데이터베이스 작업을 무조건 재시도하면 중복 처리나 정합성 문제가 발생할 수 있습니다.

재시도를 적용할 때는 다음 사항을 고려해야 합니다.

- 재시도 가능한 오류인지 확인합니다.
- 최대 재시도 횟수를 제한합니다.
- Exponential Backoff 등을 적용합니다.
- 트랜잭션의 멱등성을 고려합니다.
- 외부 API 호출과 데이터베이스 작업의 원자성 경계를 구분합니다.

## 16. Database 테스트

NestJS에서는 Repository를 Mock Provider로 대체하여 Service의 단위 테스트를 수행할 수 있습니다.

### 16.1. Repository Mock

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const repositoryMock = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('should return users', async () => {
    repositoryMock.find.mockResolvedValue([]);

    const result = await service.findAll();

    expect(result).toEqual([]);
    expect(repositoryMock.find).toHaveBeenCalled();
  });
});
```

`getRepositoryToken(User)`는 `User` Entity의 Repository Provider에 해당하는 Injection Token을 반환합니다.

테스트에서는 실제 데이터베이스에 연결하지 않고 Mock Repository를 주입합니다.

단, 단위 테스트만으로 SQL의 정확성이나 실제 트랜잭션 동작을 검증할 수는 없습니다.

이를 확인하려면 테스트 데이터베이스를 사용하는 Integration Test가 필요합니다.

## 17. Prisma 연동

Prisma는 Schema 기반으로 데이터 모델을 정의하고 타입 안전한 Prisma Client를 생성하는 ORM입니다.

NestJS에서는 일반적으로 Prisma Client를 Provider로 등록하여 사용합니다.

### 17.1. Prisma의 특징

- Schema 파일을 기반으로 데이터 모델을 관리합니다.
- 타입 안전한 데이터베이스 접근 API를 생성합니다.
- Prisma Migrate를 이용하여 Schema 변경을 관리할 수 있습니다.
- NestJS의 Dependency Injection과 결합할 수 있습니다.

### 17.2. PrismaService

Prisma ORM 7에서는 데이터베이스 연결에 Driver Adapter 또는 Prisma Accelerate URL이 필요합니다.

예를 들어 PostgreSQL을 사용하는 경우 `@prisma/adapter-pg`의 Adapter를 생성하여 Prisma Client에 전달합니다.

```typescript
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString:
        configService.getOrThrow<string>(
          'DATABASE_URL',
        ),
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

위 예제는 Prisma Client가 `src/generated/prisma` 디렉터리에 생성되고 ESM 방식으로 가져올 수 있도록 설정되어 있다고 가정합니다.

실제 Import 경로는 Prisma Generator의 Output 설정에 따라 달라집니다.

PrismaService는 NestJS의 Provider로 등록하여 다른 Service에 주입할 수 있습니다.

Prisma는 TypeORM과 구조와 API가 다르므로 프로젝트에 적용할 때는 해당 Prisma 버전의 공식 가이드를 기준으로 초기 설정을 진행해야 합니다.

## 18. TypeORM과 Prisma 비교

| 항목 | TypeORM | Prisma |
|---|---|---|
| 데이터 모델 정의 | TypeScript Entity Class | Prisma Schema |
| 주요 접근 방식 | Repository / EntityManager | Prisma Client |
| 타입 안정성 | Entity 및 TypeScript 기반 | 생성된 Client 기반 |
| 관계 정의 | Decorator 기반 | Prisma Schema 기반 |
| Migration | TypeORM Migration | Prisma Migrate |
| NestJS 통합 | `@nestjs/typeorm` | PrismaService Provider |
| 트랜잭션 | DataSource / EntityManager | Prisma Transaction API |
| Query Builder | 제공 | 자체 Client API 중심 |
| Raw SQL | 지원 | 지원 |

어느 기술이 항상 더 적합하다고 단정할 수는 없습니다.

Entity 중심 설계와 Repository 패턴을 선호하는 경우 TypeORM을 고려할 수 있습니다.

반면 Schema 중심 모델 관리와 자동 생성된 타입 안전한 Client를 선호하는 경우 Prisma를 고려할 수 있습니다.

## 19. 운영 환경에서의 Database 설계

### 19.1. 환경 변수 및 Secret 관리

데이터베이스 주소와 사용자 이름 등의 설정은 환경 변수로 관리할 수 있습니다.

비밀번호와 인증 정보는 Kubernetes Secret이나 클라우드 Secret Manager 등 별도의 관리 수단을 사용하는 것이 좋습니다.

### 19.2. Connection Pool 크기 관리

애플리케이션 Pod 수가 증가하면 데이터베이스 연결 수도 증가할 수 있습니다.

따라서 Pool 크기와 최대 Replica 수를 함께 고려해야 합니다.

### 19.3. Read Replica

읽기 요청이 많은 시스템에서는 Read Replica를 활용할 수 있습니다.

```text
NestJS Application
        |
        +-- Write --> Primary DB
        |
        +-- Read  --> Read Replica
```

다만 Replication Lag가 발생할 수 있으므로 강한 일관성이 필요한 조회는 Primary DB를 사용해야 할 수 있습니다.

### 19.4. Migration 배포 전략

운영 환경에서는 애플리케이션 배포와 Schema 변경의 순서를 관리해야 합니다.

예를 들어 기존 컬럼을 즉시 제거하기보다 다음과 같은 단계를 고려할 수 있습니다.

1. 새로운 컬럼을 추가합니다.
2. 기존 코드와 새로운 코드가 함께 동작하도록 배포합니다.
3. 필요한 데이터를 이전합니다.
4. 새로운 컬럼을 사용하는 코드로 전환합니다.
5. 더 이상 사용하지 않는 기존 컬럼을 제거합니다.

이러한 Expand-and-Contract 방식은 Rolling Update 환경에서 버전 간 호환성을 유지하는 데 도움이 됩니다.

### 19.5. Graceful Shutdown

애플리케이션이 종료될 때 진행 중인 데이터베이스 작업과 연결 정리를 고려해야 합니다.

NestJS의 Shutdown Hook과 ORM의 연결 종료 기능을 연계할 수 있습니다.

`@nestjs/typeorm`은 모듈 종료 과정에서 DataSource를 정리하는 기능을 제공하므로 별도의 연결 종료 로직을 중복 구현하기 전에 실제 구성과 생명주기를 확인해야 합니다.

## 20. Database 설계 권장 사항

실무에서 데이터베이스를 연동할 때는 다음 원칙을 고려하는 것이 좋습니다.

1. **데이터베이스 연결 설정을 코드에서 분리합니다.**  
   `ConfigModule`과 환경 변수를 이용하여 실행 환경별 설정을 관리합니다.

2. **Entity와 DTO의 역할을 분리합니다.**  
   데이터베이스 저장 구조와 외부 API 계약을 구분합니다.

3. **Repository 접근 범위를 명확하게 관리합니다.**  
   관련 Feature Module에서 Repository를 등록하고 필요한 Service에 주입합니다.

4. **운영 환경에서는 Migration을 사용합니다.**  
   `synchronize: true`에 의존하지 않고 Schema 변경 이력을 관리합니다.

5. **트랜잭션의 범위를 최소화합니다.**  
   필요한 데이터베이스 작업만 트랜잭션에 포함하고 불필요하게 오래 유지하지 않습니다.

6. **인덱스와 SQL 실행 계획을 확인합니다.**  
   ORM을 사용하더라도 실제 데이터베이스 쿼리 성능을 분석합니다.

7. **Connection Pool과 Replica 수를 함께 관리합니다.**  
   애플리케이션 수평 확장이 데이터베이스 연결 한도를 초과하지 않도록 구성합니다.

8. **데이터베이스 제약 조건을 적극 활용합니다.**  
   Unique Constraint, Foreign Key 및 NOT NULL 제약 조건 등을 통해 데이터 무결성을 보장합니다.

9. **단위 테스트와 통합 테스트를 구분합니다.**  
   Repository Mock 테스트와 실제 데이터베이스 연동 테스트를 모두 고려합니다.

10. **오류 및 재시도 정책을 명확하게 정의합니다.**  
    일시적인 오류와 영구적인 오류를 구분하고 멱등성을 고려합니다.

## 21. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| Database Driver | 데이터베이스 서버와 통신 |
| ORM | 객체와 데이터베이스 사이의 매핑 |
| Entity | 데이터베이스 테이블과 매핑되는 클래스 |
| Repository | Entity의 데이터 접근 작업 수행 |
| DataSource | 데이터베이스 연결 설정과 연결 관리 |
| EntityManager | Entity에 대한 데이터베이스 작업 수행 |
| `TypeOrmModule.forRoot()` | 데이터베이스 연결 초기화 |
| `TypeOrmModule.forRootAsync()` | DI 기반 동적 연결 설정 |
| `TypeOrmModule.forFeature()` | Feature Module의 Repository 등록 |
| `@InjectRepository()` | Repository Provider 주입 |
| QueryBuilder | 복잡한 SQL 조회 구성 |
| Transaction | 여러 데이터베이스 작업을 하나의 단위로 처리 |
| QueryRunner | 연결 및 트랜잭션의 명시적 제어 |
| Migration | 데이터베이스 Schema 변경 이력 관리 |
| Connection Pool | 데이터베이스 연결 재사용 |
| Read Replica | 읽기 요청 분산 |
| PrismaService | NestJS에서 Prisma Client를 Provider로 제공 |

## 22. 정리

NestJS는 특정 데이터베이스나 ORM에 종속되지 않으며, 다양한 데이터 접근 기술을 Dependency Injection 기반 구조로 통합할 수 있습니다.

TypeORM을 사용하는 경우 `TypeOrmModule`을 통해 데이터베이스 연결을 구성하고, `forFeature()`와 `@InjectRepository()`를 이용하여 Repository를 Service에 주입할 수 있습니다.

Entity는 데이터베이스의 저장 구조를 정의하며, Repository는 기본적인 CRUD 작업을 수행합니다.

복잡한 조회에는 QueryBuilder를 사용할 수 있고, 여러 데이터 변경을 하나의 작업 단위로 처리할 때는 Transaction을 활용할 수 있습니다.

운영 환경에서는 Migration, Connection Pool, 인덱스, 트랜잭션 격리 수준 및 오류 처리 전략을 함께 고려해야 합니다.

또한 ORM의 편리한 추상화에만 의존하기보다 실제 SQL과 데이터베이스의 동작을 이해하는 것이 중요합니다.

안정적인 데이터베이스 설계를 위해서는 애플리케이션의 비즈니스 요구사항, 데이터 정합성, 동시성 및 운영 환경의 확장성을 함께 고려해야 합니다.

## 참고 자료

### NestJS 공식 문서

- [NestJS - Databases](https://docs.nestjs.com/techniques/database)
- [NestJS - TypeORM](https://docs.nestjs.com/data/typeorm)
- [NestJS - Prisma](https://docs.nestjs.com/recipes/prisma)
- [NestJS - Mongoose](https://docs.nestjs.com/techniques/mongodb)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS - Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [NestJS - Database Sample Repository](https://github.com/nestjs/nest/tree/master/sample/05-sql-typeorm)

### TypeORM 공식 문서

- [TypeORM - Getting Started](https://typeorm.io/docs/getting-started/)
- [TypeORM - DataSource](https://typeorm.io/docs/data-source/data-source/)
- [TypeORM - Entities](https://typeorm.io/docs/entity/entities/)
- [TypeORM - Repository](https://typeorm.io/docs/working-with-entity-manager/working-with-repository/)
- [TypeORM - Relations](https://typeorm.io/docs/relations/relations/)
- [TypeORM - Query Builder](https://typeorm.io/docs/query-builder/select-query-builder/)
- [TypeORM - Transactions](https://typeorm.io/docs/transactions/)
- [TypeORM - Migrations](https://typeorm.io/docs/migrations/setup/)
- [TypeORM - Data Source Options](https://typeorm.io/docs/data-source/data-source-options/)

### 기타 참고 자료

- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Drizzle ORM 공식 문서](https://orm.drizzle.team/docs/overview)
- [MikroORM 공식 문서](https://mikro-orm.io/docs/quick-start)
- [Mongoose 공식 문서](https://mongoosejs.com/docs/)
- [MySQL 공식 문서](https://dev.mysql.com/doc/)
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [Kubernetes - Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)