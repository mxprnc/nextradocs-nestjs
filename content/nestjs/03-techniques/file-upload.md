# File Upload

## 1. 개요

File Upload는 클라이언트가 이미지, 동영상, 문서 등의 파일을 서버에 전송하고 애플리케이션이 해당 파일을 처리하거나 저장하는 기능입니다.

일반적인 REST API에서는 JSON 형식으로 데이터를 주고받지만, 파일을 전송할 때는 주로 `multipart/form-data` 형식을 사용합니다.

NestJS는 HTTP Adapter와 연동되는 파일 업로드 기능을 제공합니다.

Express 기반 애플리케이션에서는 Multer를 이용하여 업로드 요청을 처리하며, 최신 NestJS에서는 Fastify 기반 애플리케이션도 `@fastify/multipart`를 통해 파일 업로드 기능을 사용할 수 있습니다.

주요 기능은 다음과 같습니다.

- 단일 파일 업로드
- 다중 파일 업로드
- 파일과 일반 Form 데이터 동시 전송
- 파일 크기 및 형식 검증
- 메모리 또는 디스크 기반 파일 저장
- 사용자 정의 파일 검증
- 파일 업로드 제한 및 오류 처리
- 외부 Object Storage 연동
- Streaming 기반 파일 업로드
- Swagger를 이용한 업로드 API 문서화

이 문서에서는 Express 기반의 Multer 통합을 중심으로 설명하고, Fastify 및 외부 Storage 연동 방식도 함께 다룹니다.

## 2. File Upload의 동작 원리

### 2.1. 파일 업로드 처리 과정

클라이언트가 파일 업로드 요청을 보내면 NestJS는 등록된 Interceptor와 Multipart Parser를 통해 요청을 처리합니다.

일반적인 처리 과정은 다음과 같습니다.

```text
Client
   |
   | HTTP POST
   | multipart/form-data
   v
NestJS HTTP Adapter
   |
   v
FileInterceptor
   |
   v
Multipart Parser
   |
   +-- File Metadata
   |
   +-- File Content
   |
   v
Memory / Disk Storage
   |
   v
ParseFilePipe
   |
   +-- File Size Validation
   |
   +-- File Type Validation
   |
   v
Controller
   |
   v
Service
   |
   v
File Storage
   |
   v
HTTP Response
```

위 흐름은 일반적인 업로드 처리를 단순화한 예시입니다.

Express 환경에서는 Multer가 Multipart 데이터 파싱과 파일 저장을 담당합니다.

파일 검증을 통과하면 Controller Handler가 실행되고, 필요에 따라 Service에서 영구 저장, 이미지 처리 또는 데이터베이스 기록을 수행할 수 있습니다.

### 2.2. multipart/form-data

`multipart/form-data`는 하나의 HTTP 요청에 여러 데이터 영역을 포함할 수 있도록 하는 Content Type입니다.

파일과 문자열 데이터를 함께 전달할 때 주로 사용합니다.

예를 들어 다음과 같은 데이터를 전달할 수 있습니다.

```text
POST /files/upload
Content-Type: multipart/form-data

file        = profile.png
description = User profile image
category    = profile
```

실제 HTTP 요청에서는 각 데이터 영역이 Boundary로 구분됩니다.

브라우저의 `FormData`를 사용하면 이러한 요청을 구성할 수 있습니다.

```typescript
const formData = new FormData();

formData.append('file', selectedFile);
formData.append('description', 'Profile image');

await fetch('/files/upload', {
  method: 'POST',
  body: formData,
});
```

브라우저에서는 `FormData`를 사용할 때 `Content-Type` 헤더와 Boundary를 자동으로 구성하도록 두는 것이 좋습니다.

### 2.3. JSON 요청과의 차이

| 구분 | application/json | multipart/form-data |
|---|---|---|
| 주요 목적 | 구조화된 데이터 전달 | 파일 및 Form 데이터 전달 |
| 데이터 표현 | JSON | 여러 Multipart 영역 |
| 파일 전송 | 별도 인코딩 필요 | 바이너리 파일 직접 전송 가능 |
| NestJS 처리 | Body Parser | Multer 또는 Multipart Parser |
| 대표 Decorator | `@Body()` | `@UploadedFile()`, `@UploadedFiles()` |

Multer는 `multipart/form-data` 요청을 처리하며 일반적인 JSON 요청을 대신 파싱하지 않습니다.

## 3. 주요 구성 요소

NestJS에서 파일 업로드를 처리할 때 사용하는 주요 구성 요소는 다음과 같습니다.

| 구성 요소 | 역할 |
|---|---|
| `FileInterceptor()` | 특정 필드의 단일 파일 업로드를 처리합니다. |
| `FilesInterceptor()` | 동일한 필드명의 여러 파일을 처리합니다. |
| `FileFieldsInterceptor()` | 서로 다른 필드명으로 전달된 파일을 처리합니다. |
| `AnyFilesInterceptor()` | 여러 필드에 포함된 파일을 처리합니다. |
| `NoFilesInterceptor()` | 파일이 없는 Multipart Form 데이터를 처리합니다. |
| `@UploadedFile()` | 단일 업로드 파일을 추출합니다. |
| `@UploadedFiles()` | 업로드된 파일 목록을 추출합니다. |
| `MulterModule` | Multer의 공통 옵션을 등록합니다. |
| `ParseFilePipe` | 파일 검증을 수행합니다. |
| `ParseFilePipeBuilder` | 파일 검증기를 조합합니다. |
| `MaxFileSizeValidator` | 최대 파일 크기를 검증합니다. |
| `FileTypeValidator` | 파일 형식을 검증합니다. |
| `FileValidator` | 사용자 정의 파일 검증기의 기반 클래스입니다. |

`FileInterceptor()` 등의 Interceptor는 HTTP Adapter에 따라 가져오는 패키지가 달라집니다.

Express 환경에서는 `@nestjs/platform-express`를 사용합니다.

Fastify 환경에서는 `@nestjs/platform-fastify/multipart`를 사용합니다.

## 4. 환경 구성

### 4.1. 패키지 설치

일반적인 Express 기반 NestJS 프로젝트에서는 파일 업로드 기능이 `@nestjs/platform-express`와 통합되어 있습니다.

먼저 프로젝트의 HTTP Adapter가 Express인지 확인해야 합니다.

설치되어 있지 않은 경우에는 프로젝트의 NestJS 버전에 맞는 패키지를 설치합니다.

```bash
npm install @nestjs/platform-express
```

TypeScript에서 Multer의 파일 타입을 사용하려면 다음 타입 패키지를 설치합니다.

```bash
npm install -D @types/multer
```

디스크 저장소를 직접 구성하기 위해 Multer의 `diskStorage()` 등을 사용하는 경우에는 `multer` 패키지를 직접 설치하여 사용할 수 있습니다.

```bash
npm install multer
```

실제 설치 시에는 NestJS와 Multer의 메이저 버전 호환성을 확인해야 합니다.

### 4.2. 프로젝트 구조

다음과 같은 파일 업로드 모듈을 구성할 수 있습니다.

```text
src/
├── files/
│   ├── dto/
│   │   └── upload-file.dto.ts
│   ├── validators/
│   │   └── image-file.validator.ts
│   ├── files.controller.ts
│   ├── files.service.ts
│   └── files.module.ts
│
├── app.module.ts
└── main.ts
```

각 파일의 역할은 다음과 같습니다.

| 파일 | 역할 |
|---|---|
| `upload-file.dto.ts` | 파일과 함께 전달되는 Form 데이터 검증 |
| `image-file.validator.ts` | 사용자 정의 이미지 검증 |
| `files.controller.ts` | 업로드 요청 수신 |
| `files.service.ts` | 업로드 파일 처리 및 저장 |
| `files.module.ts` | 파일 업로드 관련 Provider와 Controller 등록 |

## 5. 단일 파일 업로드

### 5.1. FileInterceptor()

`FileInterceptor()`는 요청의 특정 필드에 포함된 파일 하나를 처리합니다.

```typescript
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

@Controller('files')
export class FilesController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
```

여기서 `file`은 Multipart 요청의 필드 이름입니다.

클라이언트에서도 동일한 필드명을 사용해야 합니다.

### 5.2. @UploadedFile()

`@UploadedFile()`은 업로드된 파일 객체를 Controller의 Parameter로 전달합니다.

```typescript
@UploadedFile() file: Express.Multer.File
```

Multer가 제공하는 파일 객체에는 다양한 메타데이터가 포함됩니다.

| 속성 | 설명 |
|---|---|
| `fieldname` | Multipart Form의 필드 이름 |
| `originalname` | 클라이언트가 제공한 원본 파일 이름 |
| `encoding` | 파일 전송 인코딩 |
| `mimetype` | 파일 MIME Type |
| `size` | 파일 크기(Byte) |
| `buffer` | 메모리에 저장된 파일 내용 |
| `destination` | 디스크 저장 디렉터리 |
| `filename` | 디스크에 저장된 파일 이름 |
| `path` | 디스크에 저장된 파일 경로 |

`buffer`는 Memory Storage에서 제공됩니다.

`destination`, `filename`, `path`는 일반적으로 Disk Storage에서 제공됩니다.

### 5.3. cURL 테스트

```bash
curl -X POST \
  http://localhost:3000/files/upload \
  -F "file=@./profile.png"
```

이 명령어는 `profile.png` 파일을 `file` 필드로 전송합니다.

### 5.4. 응답 예제

```json
{
  "originalName": "profile.png",
  "mimeType": "image/png",
  "size": 102400
}
```

파일 크기는 Byte 단위입니다.

## 6. 여러 파일 업로드

### 6.1. FilesInterceptor()

같은 필드명으로 여러 파일을 업로드하려면 `FilesInterceptor()`를 사용합니다.

```typescript
import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';

import {
  FilesInterceptor,
} from '@nestjs/platform-express';

@Controller('files')
export class FilesController {
  @Post('multiple')
  @UseInterceptors(
    FilesInterceptor('files', 5),
  )
  uploadFiles(
    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    return files.map((file) => ({
      originalName: file.originalname,
      size: file.size,
    }));
  }
}
```

`FilesInterceptor('files', 5)`는 `files` 필드로 전달된 파일을 최대 5개까지 허용합니다.

### 6.2. 여러 파일 전송

```bash
curl -X POST \
  http://localhost:3000/files/multiple \
  -F "files=@./image1.png" \
  -F "files=@./image2.png"
```

동일한 필드명으로 여러 파일을 전송합니다.

### 6.3. FileFieldsInterceptor()

서로 다른 필드명으로 파일을 업로드할 수도 있습니다.

```typescript
import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileFieldsInterceptor,
} from '@nestjs/platform-express';

@Controller('files')
export class FilesController {
  @Post('profile')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'background', maxCount: 1 },
    ]),
  )
  uploadProfile(
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      background?: Express.Multer.File[];
    },
  ) {
    return {
      avatar: files.avatar?.[0]?.originalname,
      background:
        files.background?.[0]?.originalname,
    };
  }
}
```

이 방식은 프로필 이미지와 배경 이미지를 동시에 업로드할 때 유용합니다.

### 6.4. AnyFilesInterceptor()

필드명이 정해져 있지 않은 여러 파일을 처리할 때 사용할 수 있습니다.

```typescript
@Post('any')
@UseInterceptors(AnyFilesInterceptor())
uploadAny(
  @UploadedFiles() files: Express.Multer.File[],
) {
  return files.length;
}
```

위 예제에서는 다음 Import가 추가로 필요합니다.

```typescript
import { AnyFilesInterceptor } from '@nestjs/platform-express';
```

다만 실제 서비스에서는 허용할 파일 필드명과 개수를 명확히 제한하는 것이 좋습니다.

## 7. 파일과 Form 데이터 함께 전송

파일과 문자열 데이터를 하나의 요청으로 전송할 수 있습니다.

### 7.1. DTO 정의

`files/dto/upload-file.dto.ts`

```typescript
import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UploadFileDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### 7.2. Controller 구현

```typescript
@Post('with-data')
@UseInterceptors(FileInterceptor('file'))
uploadWithData(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: UploadFileDto,
) {
  return {
    title: dto.title,
    description: dto.description,
    fileName: file.originalname,
  };
}
```

다음 Import가 필요합니다.

```typescript
import { Body } from '@nestjs/common';
```

`@Body()`는 Multipart 요청에 포함된 일반 Form 필드를 추출합니다.

DTO의 Validation Decorator를 실행하려면 `ValidationPipe`를 등록해야 합니다.

### 7.3. 테스트

```bash
curl -X POST \
  http://localhost:3000/files/with-data \
  -F "file=@./document.pdf" \
  -F "title=Project Document" \
  -F "description=Technical reference"
```

Multipart Form의 일반 필드는 기본적으로 문자열로 전달되므로 숫자나 Boolean 값은 적절한 변환과 검증이 필요합니다.

## 8. 파일 크기 제한

파일 업로드는 서버 메모리와 디스크 공간을 사용하므로 반드시 크기 제한을 고려해야 합니다.

### 8.1. Multer의 limits.fileSize

```typescript
@Post('upload')
@UseInterceptors(
  FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  }),
)
uploadFile(
  @UploadedFile() file: Express.Multer.File,
) {
  return {
    size: file.size,
  };
}
```

위 예제는 최대 파일 크기를 5 MiB로 제한합니다.

`limits.fileSize`는 Multer가 파일 데이터를 처리하는 단계에서 크기를 제한합니다.

용량을 초과하면 파일 처리가 중단되고 Controller Handler는 실행되지 않습니다.

### 8.2. MaxFileSizeValidator

NestJS는 파일 검증을 위한 `MaxFileSizeValidator`를 제공합니다.

```typescript
import {
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';

@UploadedFile(
  new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({
        maxSize: 5 * 1024 * 1024,
      }),
    ],
  }),
)
file: Express.Multer.File
```

이 검증은 파일이 수신된 후 Pipe 단계에서 실행됩니다.

### 8.3. 두 가지 제한 방식의 차이

| 구분 | `limits.fileSize` | `MaxFileSizeValidator` |
|---|---|---|
| 실행 위치 | Multipart Parsing 단계 | Pipe 단계 |
| 검증 시점 | 파일 수신 중 | 파일 수신 후 |
| 초과 시 동작 | 수신 및 저장 중단 | 검증 예외 발생 |
| 주요 목적 | 자원 사용 제한 | 파일 입력 정책 검증 |

실무에서는 두 기능을 함께 사용할 수 있습니다.

```typescript
@Post('image')
@UseInterceptors(
  FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  }),
)
uploadImage(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({
          maxSize: 5 * 1024 * 1024,
        }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  return {
    size: file.size,
  };
}
```

다만 메모리 소진이나 과도한 디스크 사용을 막는 데에는 수신 단계의 크기 제한이 특히 중요합니다.

## 9. 파일 형식 검증

파일 형식을 검증하여 허용되지 않은 데이터가 업로드되지 않도록 제한할 수 있습니다.

### 9.1. FileTypeValidator

```typescript
import {
  FileTypeValidator,
  ParseFilePipe,
} from '@nestjs/common';

@UploadedFile(
  new ParseFilePipe({
    validators: [
      new FileTypeValidator({
        fileType: /^image\/(jpeg|png)$/,
      }),
    ],
  }),
)
file: Express.Multer.File
```

이 예제는 JPEG 및 PNG 이미지를 허용합니다.

최신 NestJS의 `FileTypeValidator`는 기본적으로 파일 내용의 Magic Number를 이용하여 MIME Type을 확인합니다.

Magic Number는 파일의 실제 형식을 식별하는 데 사용되는 특정 바이트 패턴입니다.

### 9.2. MIME Type과 확장자의 차이

| 항목 | 예시 | 특징 |
|---|---|---|
| 파일 확장자 | `.png` | 파일 이름의 일부 |
| MIME Type | `image/png` | 파일의 미디어 유형 표현 |
| Magic Number | PNG Signature | 파일 내용 기반 형식 식별 |

파일 확장자와 클라이언트가 제공한 MIME Type은 조작할 수 있습니다.

따라서 신뢰할 수 없는 업로드 데이터의 형식을 검사할 때는 파일 내용 기반 검증을 고려해야 합니다.

다만 Magic Number 검사만으로 파일이 안전하다는 사실을 보장할 수는 없습니다.

### 9.3. ParseFilePipeBuilder

여러 검증기를 쉽게 구성하려면 `ParseFilePipeBuilder`를 사용할 수 있습니다.

```typescript
import {
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';

@UploadedFile(
  new ParseFilePipeBuilder()
    .addFileTypeValidator({
      fileType: /^image\/(jpeg|png)$/,
    })
    .addMaxSizeValidator({
      maxSize: 5 * 1024 * 1024,
    })
    .build({
      errorHttpStatusCode:
        HttpStatus.UNPROCESSABLE_ENTITY,
    }),
)
file: Express.Multer.File
```

이 예제에서는 검증에 실패하면 HTTP 422 응답을 반환하도록 지정합니다.

기본 검증 오류 상태 코드는 HTTP 400입니다.

### 9.4. 선택적 파일 업로드

파일이 필수 항목이 아닌 경우 `fileIsRequired` 옵션을 사용할 수 있습니다.

```typescript
new ParseFilePipeBuilder()
  .addMaxSizeValidator({
    maxSize: 5 * 1024 * 1024,
  })
  .build({
    fileIsRequired: false,
  });
```

파일이 전달되지 않은 경우에도 검증 단계에서 오류를 발생시키지 않도록 설정합니다.

## 10. 여러 파일 검증

여러 파일을 업로드하는 경우에도 파일별 크기와 형식을 검증할 수 있습니다.

```typescript
@Post('images')
@UseInterceptors(
  FilesInterceptor('files', 5, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 5,
    },
  }),
)
uploadImages(
  @UploadedFiles(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({
        fileType: /^image\/(jpeg|png)$/,
      })
      .addMaxSizeValidator({
        maxSize: 5 * 1024 * 1024,
      })
      .build(),
  )
  files: Express.Multer.File[],
) {
  return files.map((file) => ({
    name: file.originalname,
    size: file.size,
  }));
}
```

`ParseFilePipeBuilder`로 생성한 Pipe는 배열의 각 파일에 대해 등록된 검증기를 실행할 수 있습니다.

다만 개별 파일의 크기 제한과 전체 요청의 크기 제한은 구분해야 합니다.

예를 들어 5 MiB 파일 5개가 동시에 업로드된다면 파일 데이터만으로 최대 약 25 MiB의 메모리 또는 저장 공간이 필요할 수 있습니다.

실제 요청에는 Multipart 데이터의 추가적인 오버헤드도 포함됩니다.

## 11. 사용자 정의 FileValidator

기본 제공 검증기로 처리하기 어려운 조건은 사용자 정의 `FileValidator`를 구현할 수 있습니다.

### 11.1. FileValidator 구현

다음은 특정 확장자를 허용하는 단순한 검증 예제입니다.

`validators/image-file.validator.ts`

```typescript
import {
  FileValidator,
} from '@nestjs/common';

export class ImageExtensionValidator
  extends FileValidator<{
    allowedExtensions: string[];
  }>
{
  isValid(
    file?: Express.Multer.File,
  ): boolean {
    if (!file) {
      return false;
    }

    const extension = file.originalname
      .split('.')
      .pop()
      ?.toLowerCase();

    return this.validationOptions
      .allowedExtensions.includes(
        extension ?? '',
      );
  }

  buildErrorMessage(): string {
    return 'Unsupported file extension';
  }
}
```

이 예제는 사용자 정의 Validator의 구조를 보여주기 위한 것입니다.

확장자만 검사하므로 파일의 실제 형식이나 안전성을 보장하지 않습니다.

### 11.2. Validator 적용

```typescript
@UploadedFile(
  new ParseFilePipe({
    validators: [
      new ImageExtensionValidator({
        allowedExtensions: [
          'jpg',
          'jpeg',
          'png',
        ],
      }),
    ],
  }),
)
file: Express.Multer.File
```

`FileValidator`는 다음 메서드를 구현합니다.

| 메서드 | 역할 |
|---|---|
| `isValid()` | 파일이 조건을 충족하는지 검사 |
| `buildErrorMessage()` | 검증 실패 메시지 생성 |

`isValid()`는 비동기 함수로 구현할 수도 있습니다.

## 12. Memory Storage

Multer는 기본적으로 파일 데이터를 메모리에 저장할 수 있습니다.

### 12.1. memoryStorage()

```typescript
import {
  memoryStorage,
} from 'multer';

@Post('memory')
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  }),
)
uploadToMemory(
  @UploadedFile() file: Express.Multer.File,
) {
  return {
    size: file.buffer.length,
  };
}
```

메모리에 저장된 파일 내용은 `file.buffer`를 통해 접근할 수 있습니다.

### 12.2. Memory Storage의 특징

| 장점 | 단점 |
|---|---|
| 임시 파일 생성 불필요 | 프로세스 메모리 사용 |
| 작은 파일 처리에 편리 | 대량 동시 업로드에 취약 |
| 외부 Storage로 즉시 전달 가능 | 큰 파일 처리에 부적합할 수 있음 |

Memory Storage는 작은 프로필 이미지나 CSV 파일처럼 크기가 제한된 데이터를 처리하는 데 적합합니다.

### 12.3. 동시 업로드와 메모리

예를 들어 다음과 같은 상황을 가정합니다.

```text
File Size: 10 MiB
Concurrent Uploads: 100
```

파일 Buffer만으로 최대 약 1,000 MiB의 메모리가 사용될 수 있습니다.

실제 애플리케이션에서는 추가적인 객체, 요청 처리 버퍼 및 런타임 메모리도 사용합니다.

따라서 Memory Storage를 사용할 때는 파일 크기와 동시 요청 수를 함께 고려해야 합니다.

## 13. Disk Storage

Disk Storage는 파일 데이터를 서버의 파일 시스템에 저장하는 방식입니다.

### 13.1. diskStorage()

```typescript
import {
  randomUUID,
} from 'node:crypto';

import {
  extname,
} from 'node:path';

import {
  diskStorage,
} from 'multer';

@Post('disk')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (
        req,
        file,
        callback,
      ) => {
        const filename =
          `${randomUUID()}${extname(file.originalname)}`;

        callback(null, filename);
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  }),
)
uploadToDisk(
  @UploadedFile() file: Express.Multer.File,
) {
  return {
    filename: file.filename,
    path: file.path,
    size: file.size,
  };
}
```

파일은 `./uploads` 디렉터리에 저장됩니다.

문자열로 저장 디렉터리를 지정한 경우 Multer가 필요한 디렉터리 생성을 처리할 수 있습니다.

디렉터리 경로를 Callback으로 직접 계산하는 경우에는 애플리케이션에서 해당 디렉터리의 존재를 보장해야 합니다.

### 13.2. 파일 이름 생성

원본 파일 이름을 그대로 저장하면 이름 충돌이나 경로 처리 문제가 발생할 수 있습니다.

따라서 서버에서 고유한 파일 이름을 생성하는 것이 좋습니다.

대표적인 방식은 다음과 같습니다.

- UUID
- 별도의 랜덤 식별자
- 콘텐츠 해시
- 업로드 리소스 ID

원본 파일 이름은 필요한 경우 메타데이터로 별도 저장합니다.

파일 확장자는 신뢰할 수 없는 입력이므로 실제 파일 형식 검증 결과를 기준으로 결정하는 것이 안전합니다.

### 13.3. Disk Storage와 메모리 비교

| 항목 | Memory Storage | Disk Storage |
|---|---|---|
| 저장 위치 | 프로세스 메모리 | 파일 시스템 |
| 파일 내용 접근 | `file.buffer` | `file.path` |
| 대용량 파일 | 메모리 부담 증가 | 상대적으로 유리 |
| 파일 정리 | GC 및 참조 해제 | 명시적인 삭제 필요 |
| 컨테이너 환경 | 메모리 제한 영향 | 파일 시스템 및 볼륨 정책 영향 |

Disk Storage에서도 디스크 용량과 동시 업로드 수에 대한 제한이 필요합니다.

## 14. MulterModule

`MulterModule`은 파일 업로드에 사용하는 공통 Multer 옵션을 관리합니다.

### 14.1. register()

```typescript
import { Module } from '@nestjs/common';

import {
  MulterModule,
} from '@nestjs/platform-express';

import {
  FilesController,
} from './files.controller';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  ],
  controllers: [FilesController],
})
export class FilesModule {}
```

공통 설정을 등록하면 모듈 내의 파일 업로드 Interceptor에서 해당 옵션을 사용할 수 있습니다.

### 14.2. registerAsync()

설정값을 `ConfigService`에서 가져와야 한다면 `registerAsync()`를 사용할 수 있습니다.

```typescript
import { Module } from '@nestjs/common';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import {
  MulterModule,
} from '@nestjs/platform-express';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService,
      ) => ({
        dest: configService.get<string>(
          'UPLOAD_DIRECTORY',
          './uploads',
        ),
        limits: {
          fileSize: Number(
            configService.get<string>(
              'MAX_FILE_SIZE',
              '10485760',
            ),
          ),
        },
      }),
    }),
  ],
  exports: [MulterModule],
})
export class FilesModule {}
```

환경 변수는 다음과 같이 구성할 수 있습니다.

```env
UPLOAD_DIRECTORY=./uploads
MAX_FILE_SIZE=10485760
```

이 방식은 개발, 테스트 및 운영 환경에서 서로 다른 업로드 정책을 적용할 때 유용합니다.

## 15. File Filter

Multer의 `fileFilter` 옵션을 사용하면 파일을 저장하기 전에 업로드 수락 여부를 결정할 수 있습니다.

```typescript
@Post('filtered')
@UseInterceptors(
  FileInterceptor('file', {
    fileFilter: (
      req,
      file,
      callback,
    ) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
      ];

      if (
        !allowedTypes.includes(
          file.mimetype,
        )
      ) {
        return callback(
          new BadRequestException(
            'Unsupported file type',
          ),
          false,
        );
      }

      callback(null, true);
    },
  }),
)
uploadFiltered(
  @UploadedFile() file: Express.Multer.File,
) {
  return {
    name: file.originalname,
  };
}
```

다음 Import가 필요합니다.

```typescript
import {
  BadRequestException,
} from '@nestjs/common';
```

`fileFilter`는 파일이 완전히 저장되기 전에 필터링 정책을 적용하는 데 사용할 수 있습니다.

다만 이 단계에서 제공되는 `file.mimetype`은 클라이언트가 전달한 정보이므로 실제 파일 내용 검증을 대체하지 않습니다.

## 16. 파일 업로드 오류 처리

파일 업로드 과정에서는 파일 크기 초과, 파일 개수 초과, 잘못된 필드명 등의 오류가 발생할 수 있습니다.

### 16.1. 대표적인 오류

| 오류 | 발생 상황 |
|---|---|
| 파일 크기 초과 | `limits.fileSize` 초과 |
| 파일 개수 초과 | `limits.files` 또는 `maxCount` 초과 |
| 예상하지 못한 필드 | 선언하지 않은 파일 필드 사용 |
| 파일 형식 불일치 | `FileTypeValidator` 실패 |
| 필수 파일 누락 | 필수 파일이 전달되지 않음 |
| Multipart 형식 오류 | 잘못된 요청 형식 |

최신 NestJS에서는 파일 크기 제한 초과 시 일반적으로 HTTP 413을 반환합니다.

파일 검증 Pipe의 기본 오류 상태 코드는 HTTP 400입니다.

### 16.2. 검증 실패 시 파일 정리

파일 업로드 Interceptor는 Controller가 실행되기 전에 파일을 수신하고 저장합니다.

따라서 파일 검증에 실패하면 이미 메모리 또는 디스크에 파일이 저장되어 있을 수 있습니다.

NestJS v12.2부터는 Pipe가 요청을 거부하는 경우 저장된 업로드 파일을 오류 응답 후 정리하는 동작을 지원합니다.

하지만 Controller Handler 또는 Service 내부에서 파일 처리에 실패한 경우까지 모든 임시 파일이 자동으로 정리되는 것은 아닙니다.

특히 외부 Object Storage에 업로드한 파일은 별도의 정리 정책이 필요합니다.

### 16.3. 디스크 파일 정리

파일 처리 후 임시 파일을 삭제하려면 Node.js 파일 시스템 API를 사용할 수 있습니다.

```typescript
import {
  unlink,
} from 'node:fs/promises';

async processFile(
  file: Express.Multer.File,
): Promise<void> {
  try {
    await this.processDocument(file.path);
  } finally {
    await unlink(file.path);
  }
}
```

이 예제는 `processDocument()`가 애플리케이션에서 별도로 구현된 메서드라고 가정합니다.

파일이 이미 삭제된 경우에는 `unlink()`에서도 오류가 발생할 수 있으므로 실제 구현에서는 파일 정리 오류 처리도 고려해야 합니다.

## 17. Object Storage 연동

실무에서는 업로드 파일을 애플리케이션 서버의 로컬 디스크보다 외부 Object Storage에 저장하는 경우가 많습니다.

대표적인 Object Storage는 다음과 같습니다.

- Amazon S3
- Cloudflare R2
- Google Cloud Storage
- Azure Blob Storage
- MinIO

### 17.1. 외부 Storage가 필요한 이유

애플리케이션 Pod의 로컬 디스크에 파일을 저장하면 다음과 같은 문제가 발생할 수 있습니다.

- Pod 재시작 및 교체 시 파일 손실 가능성
- 여러 Pod에서 동일한 파일에 접근하기 어려움
- 애플리케이션과 파일 저장소의 생명주기가 결합됨
- 스토리지 용량 확장이 어려움

Object Storage를 사용하면 애플리케이션과 파일 저장소를 분리할 수 있습니다.

### 17.2. S3 업로드 아키텍처

```text
Client
   |
   | multipart/form-data
   v
NestJS API
   |
   v
FileInterceptor
   |
   v
File Validation
   |
   v
FilesService
   |
   v
AWS SDK
   |
   v
Amazon S3
   |
   v
Object Key / Metadata
   |
   v
Database
```

### 17.3. AWS SDK 설치

AWS S3에 파일을 업로드하려면 다음 패키지를 설치할 수 있습니다.

```bash
npm install @aws-sdk/client-s3
```

### 17.4. S3 Client 구성

```typescript
import {
  Injectable,
} from '@nestjs/common';

import {
  ConfigService,
} from '@nestjs/config';

import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import {
  randomUUID,
} from 'node:crypto';

@Injectable()
export class FilesService {
  private readonly s3: S3Client;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.s3 = new S3Client({
      region:
        this.configService.getOrThrow<string>(
          'AWS_REGION',
        ),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
  ) {
    const bucket =
      this.configService.getOrThrow<string>(
        'S3_BUCKET',
      );

    const key = `uploads/${randomUUID()}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      bucket,
      key,
    };
  }
}
```

이 예제는 Memory Storage로 수신한 작은 파일을 S3에 전달하는 방식입니다.

AWS 인증 정보는 SDK의 Credential Provider Chain을 통해 제공한다고 가정합니다.

운영 환경에서는 IAM Role 또는 Workload Identity 등을 사용하여 자격 증명을 관리하는 것이 적절합니다.

또한 `file.mimetype`은 클라이언트가 제공한 정보이므로 검증 후 신뢰할 수 있는 Content Type을 설정해야 합니다.

### 17.5. Controller 연동

```typescript
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
  ) {}

  @Post('s3')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  upload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png)$/,
        })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.uploadFile(file);
  }
}
```

이 예제는 관련 Controller, Service 및 Validator Import가 구성되어 있다고 가정합니다.

대용량 파일에는 전체 파일을 메모리에 적재하는 방식보다 Streaming이나 Direct Upload 방식이 적합할 수 있습니다.

## 18. Presigned URL 기반 업로드

파일을 반드시 NestJS 서버를 경유하여 전송해야 하는 것은 아닙니다.

Object Storage가 제공하는 Presigned URL을 사용하면 클라이언트가 파일을 Storage에 직접 업로드할 수 있습니다.

### 18.1. 처리 과정

```text
Client
   |
   | 1. Request Upload URL
   v
NestJS API
   |
   | 2. Generate Presigned URL
   v
Client
   |
   | 3. Direct Upload
   v
Object Storage
   |
   | 4. Upload Result
   v
Client
   |
   | 5. Confirm Upload
   v
NestJS API
   |
   v
Database
```

이 구조에서는 파일 데이터가 애플리케이션 서버를 통과하지 않을 수 있습니다.

### 18.2. 장점

- NestJS 서버의 네트워크 대역폭 사용 감소
- 애플리케이션의 메모리 및 CPU 부하 감소
- 대용량 파일 업로드에 유리
- Object Storage의 확장성 활용

### 18.3. 주의사항

Presigned URL 방식에서는 업로드 요청을 처리하는 NestJS 서버가 실제 파일 내용을 직접 검사하지 않을 수 있습니다.

따라서 다음 정책을 별도로 고려해야 합니다.

- 업로드 권한 검증
- URL 유효 기간 제한
- 허용 파일 크기 및 형식 정책
- 업로드 완료 검증
- 악성코드 검사
- 임시 저장 영역과 공개 영역 분리
- 업로드되지 않은 객체의 정리
- 사용자별 Storage 접근 범위 제한

Presigned URL을 발급했다고 해서 업로드가 완료되었다고 판단해서는 안 됩니다.

서버에서 객체 존재 여부와 메타데이터 등을 확인한 뒤 애플리케이션 데이터로 확정하는 과정이 필요할 수 있습니다.

## 19. Streaming Upload

Streaming Upload는 파일 전체를 메모리에 적재하지 않고 데이터를 순차적으로 처리하는 방식입니다.

### 19.1. Streaming이 필요한 이유

Memory Storage는 파일을 모두 수신한 후 Controller에 Buffer를 전달합니다.

반면 Streaming은 데이터가 도착하는 동안 다른 저장소로 전달할 수 있습니다.

```text
Client
   |
   v
Incoming File Stream
   |
   v
NestJS
   |
   v
Writable Stream
   |
   v
Disk / Object Storage
```

Streaming은 대용량 파일 처리에서 메모리 사용량을 줄이는 데 유용합니다.

### 19.2. Disk Storage와 Streaming

Multer의 `diskStorage()`도 수신 데이터를 디스크에 순차적으로 기록합니다.

하지만 일반적인 `FileInterceptor()`는 파일 저장이 완료된 후 Controller Handler를 실행합니다.

따라서 디스크에 Streaming 방식으로 기록하는 것과 Controller가 파일 Stream을 직접 전달받는 것은 구분해야 합니다.

### 19.3. Fastify FileStreamInterceptor

NestJS의 Fastify 통합에서는 `FileStreamInterceptor()`를 통해 업로드 Stream을 Controller에서 직접 처리할 수 있습니다.

```typescript
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileStreamInterceptor,
  type MultipartFileStream,
} from '@nestjs/platform-fastify/multipart';

import {
  randomUUID,
} from 'node:crypto';

import {
  createWriteStream,
} from 'node:fs';

import {
  pipeline,
} from 'node:stream/promises';

@Controller('files')
export class FilesController {
  @Post('stream')
  @UseInterceptors(
    FileStreamInterceptor('file', {
      limits: {
        fileSize: 1024 * 1024 * 1024,
      },
    }),
  )
  async uploadStream(
    @UploadedFile() file: MultipartFileStream,
  ) {
    const path = `./uploads/${randomUUID()}`;

    await pipeline(
      file.stream,
      createWriteStream(path),
    );

    return {
      originalName: file.originalname,
      path,
    };
  }
}
```

위 예제는 `uploads` 디렉터리가 미리 생성되어 있다고 가정합니다.

실제 구현에서는 Stream 오류와 업로드 중단 시 생성된 부분 파일을 정리해야 합니다.

### 19.4. Streaming 시 검증

Streaming 방식은 파일 전체 크기가 수신되기 전에는 확정되지 않습니다.

따라서 일반적인 `MaxFileSizeValidator` 대신 수신 단계의 `limits.fileSize`를 사용해야 합니다.

또한 파일 전체 Buffer를 필요로 하는 Magic Number 검증 방식은 그대로 적용하기 어렵습니다.

필요한 경우 Stream의 초기 바이트를 별도로 검사하거나 임시 저장 후 검증하는 방식을 사용할 수 있습니다.

## 20. Express와 Fastify 비교

NestJS는 HTTP Adapter에 따라 파일 업로드 처리 구현이 달라집니다.

### 20.1. Express

Express 기반에서는 Multer가 파일 업로드를 처리합니다.

```typescript
import {
  FileInterceptor,
} from '@nestjs/platform-express';
```

업로드 파일은 다음 타입으로 표현합니다.

```typescript
Express.Multer.File
```

### 20.2. Fastify

NestJS v12.1부터 Fastify에서도 공식 파일 업로드 Interceptor를 사용할 수 있습니다.

필요한 패키지를 설치합니다.

```bash
npm install @fastify/multipart
```

Interceptor는 다음과 같이 가져옵니다.

```typescript
import {
  FileInterceptor,
  type UploadedMultipartFile,
} from '@nestjs/platform-fastify/multipart';
```

기본 사용법은 Express와 유사합니다.

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(
  @UploadedFile() file: UploadedMultipartFile,
) {
  return {
    name: file.originalname,
    size: file.size,
  };
}
```

Fastify 기반 업로드에서는 내부적으로 `@fastify/multipart`가 사용됩니다.

일반적인 파일 업로드 Interceptor를 사용하면 NestJS가 필요한 Multipart Plugin을 등록합니다.

### 20.3. 주요 차이

| 항목 | Express | Fastify |
|---|---|---|
| Multipart 처리 | Multer | @fastify/multipart |
| Interceptor Import | @nestjs/platform-express | @nestjs/platform-fastify/multipart |
| 파일 타입 | Express.Multer.File | UploadedMultipartFile |
| 단일 파일 업로드 | 지원 | 지원 |
| 다중 파일 업로드 | 지원 | 지원 |
| ParseFilePipe | 지원 | 지원 |
| Memory Storage | 지원 | 지원 |
| Disk Storage | 지원 | 지원 |
| 직접 Stream 처리 | 별도 구현 필요 | FileStreamInterceptor 지원 |

Fastify의 Multipart 기본 파일 크기 제한은 Multer와 다를 수 있으므로 명시적인 제한을 설정하는 것이 좋습니다.

## 21. Swagger 파일 업로드 문서화

Swagger/OpenAPI를 이용하면 파일 업로드 API의 요청 형식을 문서화할 수 있습니다.

### 21.1. 패키지 설치

Swagger 통합 패키지가 설치되어 있지 않은 경우 다음과 같이 설치합니다.

```bash
npm install @nestjs/swagger
```

### 21.2. 단일 파일 업로드

```typescript
import {
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';

@Post('upload')
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
    },
    required: ['file'],
  },
})
@UseInterceptors(FileInterceptor('file'))
uploadFile(
  @UploadedFile() file: Express.Multer.File,
) {
  return {
    filename: file.originalname,
  };
}
```

`@ApiConsumes('multipart/form-data')`는 해당 Handler가 Multipart 요청을 처리한다는 사실을 문서화합니다.

`format: 'binary'`는 파일 업로드 필드를 표현합니다.

### 21.3. 다중 파일 업로드

```typescript
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  },
})
```

Swagger UI에서는 파일을 선택하여 업로드 API를 테스트할 수 있습니다.

## 22. 파일 업로드 보안

파일 업로드는 외부 입력을 서버에 저장하거나 처리하는 기능이므로 보안 위험을 고려해야 합니다.

### 22.1. 파일 크기 제한

업로드 파일의 크기를 제한하지 않으면 서버의 메모리 또는 디스크 공간이 고갈될 수 있습니다.

다음과 같은 제한을 함께 고려해야 합니다.

- 개별 파일 크기
- 전체 요청 크기
- 업로드 파일 개수
- Multipart 필드 개수
- 사용자별 업로드 횟수
- 동시 업로드 요청 수

### 22.2. 파일 형식 검증

확장자와 클라이언트가 전달한 MIME Type만으로 파일의 안전성을 판단해서는 안 됩니다.

파일 내용 기반 형식 검증과 필요한 추가 검사를 수행해야 합니다.

### 22.3. 파일 이름 검증

원본 파일 이름에는 경로 구분자나 특수 문자가 포함될 수 있습니다.

따라서 원본 파일 이름을 그대로 파일 시스템 경로로 사용하지 않는 것이 좋습니다.

서버에서 별도의 Storage Key를 생성하고 원본 파일 이름은 메타데이터로 관리하는 방식을 고려할 수 있습니다.

### 22.4. 악성 파일 검사

외부 사용자가 업로드한 파일에는 악성코드나 공격용 데이터가 포함될 수 있습니다.

필요에 따라 다음과 같은 처리를 적용할 수 있습니다.

- 악성코드 검사
- 이미지 재인코딩
- 문서 형식 검사
- 압축 파일 내부 검사
- 업로드 파일 격리
- 검증 완료 후 공개 처리

특히 업로드 파일을 다른 사용자에게 제공하는 시스템에서는 파일 처리 및 배포 정책을 명확하게 정의해야 합니다.

### 22.5. 접근 제어

파일 업로드 API에는 필요한 인증과 인가를 적용해야 합니다.

예를 들어 사용자가 다른 계정의 프로필 이미지를 임의로 변경하지 못하도록 소유권을 검증해야 합니다.

파일 다운로드에서도 동일하게 접근 권한을 확인해야 합니다.

### 22.6. 공개 파일 저장 정책

사용자가 업로드한 파일을 애플리케이션 서버에서 실행 가능한 위치에 저장하지 않도록 주의해야 합니다.

가능하면 파일을 애플리케이션 실행 환경과 분리된 Storage에 저장하고, 필요한 경우 다운로드 응답 헤더 및 Content Type을 안전하게 설정해야 합니다.

## 23. Kubernetes 환경에서의 파일 업로드

Kubernetes에서 NestJS를 실행하는 경우 Pod의 파일 시스템은 영구 저장소로 사용하기에 적합하지 않을 수 있습니다.

### 23.1. Pod 로컬 저장

```text
Load Balancer
      |
      +-- NestJS Pod 1
      |       |
      |       +-- Local Uploads
      |
      +-- NestJS Pod 2
      |       |
      |       +-- Local Uploads
      |
      +-- NestJS Pod 3
              |
              +-- Local Uploads
```

각 Pod의 파일 시스템은 기본적으로 독립적입니다.

Pod가 삭제되거나 교체되면 해당 Pod의 임시 파일이 손실될 수 있습니다.

### 23.2. Object Storage 기반 구성

```text
             Load Balancer
                   |
       +-----------+-----------+
       |           |           |
       v           v           v
    NestJS       NestJS      NestJS
     Pod 1        Pod 2       Pod 3
       |           |           |
       +-----------+-----------+
                   |
                   v
              Object Storage
                   |
                   v
                 Database
```

파일 내용은 Object Storage에 저장하고 데이터베이스에는 Object Key, 소유자, 크기, MIME Type 등 필요한 메타데이터를 관리할 수 있습니다.

### 23.3. Resource Limits

업로드 요청이 많은 애플리케이션에서는 Kubernetes의 CPU, Memory 및 Ephemeral Storage 사용량을 함께 관리해야 합니다.

특히 Memory Storage를 사용하는 경우 다음과 같은 상황을 고려해야 합니다.

```text
Pod Memory Limit: 512 MiB
File Size Limit: 10 MiB
Concurrent Uploads: 50
```

파일 Buffer만으로 최대 약 500 MiB의 메모리가 필요할 수 있으므로 프로세스가 메모리 제한을 초과할 위험이 있습니다.

따라서 파일 크기 제한뿐 아니라 동시 처리량, Streaming 및 업로드 전용 서비스 분리 등을 함께 고려하는 것이 좋습니다.

## 24. 파일 업로드 성능 최적화

### 24.1. Streaming 활용

대용량 파일에서는 전체 파일을 메모리에 적재하지 않는 방식을 고려합니다.

### 24.2. 직접 업로드

Presigned URL을 사용하면 파일 데이터가 애플리케이션 서버를 통과하지 않도록 구성할 수 있습니다.

### 24.3. 비동기 후처리

이미지 리사이징, 동영상 인코딩 및 악성코드 검사처럼 시간이 오래 걸리는 작업은 Queue를 이용하여 비동기적으로 처리할 수 있습니다.

```text
Client
   |
   v
NestJS API
   |
   v
Object Storage
   |
   v
Queue
   |
   v
Background Worker
   |
   +-- Image Resize
   |
   +-- Virus Scan
   |
   +-- Metadata Extraction
   |
   v
Database Update
```

이 경우 업로드 완료와 파일 후처리 완료를 구분해야 합니다.

### 24.4. 업로드 상태 관리

비동기 후처리가 필요한 경우 파일 상태를 다음과 같이 관리할 수 있습니다.

```text
UPLOADING
    |
    v
UPLOADED
    |
    v
PROCESSING
    |
    +-- COMPLETED
    |
    +-- FAILED
```

상태 모델은 애플리케이션의 요구사항에 따라 달라질 수 있습니다.

파일 후처리 작업과 관련된 내용은 `queues.md`에서 자세히 설명합니다.

## 25. File Upload 테스트

파일 업로드 API는 단위 테스트와 E2E 테스트를 구분하여 검증할 수 있습니다.

### 25.1. E2E 테스트

Supertest를 사용하는 NestJS 테스트 환경에서는 Multipart 요청을 생성할 수 있습니다.

```typescript
import * as request from 'supertest';

it('uploads a file', async () => {
  const response = await request(
    app.getHttpServer(),
  )
    .post('/files/upload')
    .attach(
      'file',
      Buffer.from('test content'),
      'example.txt',
    )
    .expect(201);

  expect(response.body).toHaveProperty(
    'originalName',
    'example.txt',
  );
});
```

이 예제는 해당 API가 텍스트 파일을 허용하도록 구성되어 있다고 가정합니다.

이미지만 허용하는 API에 테스트용 텍스트 파일을 전달하면 검증에 실패할 수 있습니다.

### 25.2. 주요 테스트 항목

파일 업로드 테스트에서는 다음 사항을 확인하는 것이 좋습니다.

- 정상적인 파일 업로드
- 파일이 누락된 요청
- 허용되지 않은 MIME Type
- 최대 파일 크기 초과
- 최대 파일 개수 초과
- 잘못된 Multipart 필드명
- 인증되지 않은 요청
- 권한이 없는 사용자
- Storage 저장 실패
- 업로드 중단 시 임시 파일 정리
- 파일 메타데이터 저장 실패

Object Storage와 연동하는 경우에는 외부 SDK를 Mock으로 대체하는 단위 테스트와 실제 Storage를 사용하는 통합 테스트를 구분하여 구성할 수 있습니다.

## 26. 실무 권장 설계

파일 업로드 기능은 요청 수신, 파일 검증, 저장소 연동 및 메타데이터 관리의 책임을 분리하는 것이 좋습니다.

다음과 같은 디렉터리 구조를 고려할 수 있습니다.

```text
src/
├── files/
│   ├── dto/
│   │   ├── upload-file.dto.ts
│   │   └── file-response.dto.ts
│   │
│   ├── validators/
│   │   └── image-file.validator.ts
│   │
│   ├── storage/
│   │   ├── storage.interface.ts
│   │   └── s3-storage.service.ts
│   │
│   ├── entities/
│   │   └── file.entity.ts
│   │
│   ├── files.controller.ts
│   ├── files.service.ts
│   └── files.module.ts
│
├── app.module.ts
└── main.ts
```

각 구성 요소의 역할은 다음과 같습니다.

| 구성 요소 | 책임 |
|---|---|
| FilesController | HTTP 업로드 요청 수신 |
| FilesService | 업로드 처리 및 비즈니스 로직 |
| FileValidator | 파일 형식 및 속성 검증 |
| Storage Interface | 파일 저장소의 추상화 |
| S3StorageService | S3 파일 저장 및 삭제 |
| File Entity | 파일 메타데이터 저장 |
| FileResponseDto | API 응답 데이터 정의 |

### 26.1. 권장 사항

1. 파일 크기와 개수를 반드시 제한합니다.
2. 파일 확장자와 MIME Type을 신뢰하지 않습니다.
3. 파일 내용에 대한 검증을 고려합니다.
4. 원본 파일 이름을 그대로 저장 경로에 사용하지 않습니다.
5. 파일 저장과 메타데이터 저장의 실패 처리를 구분합니다.
6. 대용량 파일에는 Streaming 또는 Direct Upload를 고려합니다.
7. 운영 환경에서는 Object Storage 사용을 검토합니다.
8. 업로드 권한과 파일 접근 권한을 별도로 검증합니다.
9. 실패한 업로드의 임시 파일과 객체를 정리합니다.
10. 이미지 변환과 악성코드 검사 등은 필요한 경우 비동기 작업으로 분리합니다.

## 27. 주요 개념 비교

| 개념 | 역할 |
|---|---|
| File Upload | 클라이언트가 서버에 파일을 전송하는 기능 |
| multipart/form-data | 파일과 일반 Form 데이터를 함께 전달하는 형식 |
| Multer | Express 기반 Multipart 파일 처리 Middleware |
| FileInterceptor | 단일 파일 업로드 처리 |
| FilesInterceptor | 동일 필드의 다중 파일 업로드 처리 |
| FileFieldsInterceptor | 서로 다른 필드의 파일 업로드 처리 |
| AnyFilesInterceptor | 임의 필드의 다중 파일 처리 |
| UploadedFile | 단일 업로드 파일 추출 |
| UploadedFiles | 여러 업로드 파일 추출 |
| ParseFilePipe | 파일 유효성 검증 |
| ParseFilePipeBuilder | 파일 검증기 구성 |
| MaxFileSizeValidator | 파일 크기 검증 |
| FileTypeValidator | 파일 형식 검증 |
| FileValidator | 사용자 정의 파일 검증 |
| memoryStorage | 파일 내용을 메모리에 저장 |
| diskStorage | 파일 내용을 디스크에 저장 |
| MulterModule | 공통 업로드 설정 관리 |
| Object Storage | 외부 파일 저장소 |
| Presigned URL | 제한된 시간 동안 사용할 수 있는 직접 업로드 URL |
| Streaming Upload | 파일을 순차적으로 수신하고 처리하는 방식 |

## 28. 정리

NestJS의 File Upload 기능은 클라이언트가 전송한 파일을 수신하고 검증하여 메모리, 디스크 또는 외부 Storage에 저장하는 데 사용합니다.

Express 기반 애플리케이션에서는 Multer를 사용하며, `FileInterceptor()`, `FilesInterceptor()`, `FileFieldsInterceptor()` 등의 Interceptor를 통해 다양한 파일 업로드 방식을 구현할 수 있습니다.

`ParseFilePipe`, `MaxFileSizeValidator`, `FileTypeValidator`를 이용하면 업로드 파일의 크기와 형식을 검증할 수 있습니다.

파일 수신 단계에서는 `limits.fileSize` 등의 제한을 적용하여 과도한 메모리 및 디스크 사용을 방지해야 합니다.

작은 파일은 Memory Storage를 활용할 수 있으며, 대용량 파일은 Disk Storage, Streaming 또는 Presigned URL 기반 Direct Upload 방식이 적합할 수 있습니다.

Kubernetes와 같은 분산 환경에서는 애플리케이션 Pod와 파일 저장소를 분리하여 Object Storage를 사용하는 구조를 고려할 수 있습니다.

또한 파일 업로드는 외부 데이터를 처리하는 기능이므로 파일 형식 검증, 접근 권한 관리, 악성 파일 검사 및 업로드 실패 시 정리 정책을 함께 설계해야 합니다.

안정적인 파일 업로드 시스템을 구축하려면 파일 저장 기능뿐 아니라 보안, 리소스 제한, 데이터 정합성 및 운영 환경의 확장성을 종합적으로 고려하는 것이 중요합니다.

## 참고 자료

### NestJS 공식 문서

- [NestJS - File Upload](https://docs.nestjs.com/techniques/file-upload)
- [NestJS - File Storage](https://docs.nestjs.com/application/file-storage)
- [NestJS - File Upload Tutorial](https://docs.nestjs.com/tutorials/file-uploads)
- [NestJS - Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS - Pipes](https://docs.nestjs.com/pipes)
- [NestJS - Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS - Streaming Files](https://docs.nestjs.com/techniques/streaming-files)
- [NestJS - OpenAPI Operations](https://docs.nestjs.com/openapi/operations)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - Testing](https://docs.nestjs.com/fundamentals/testing)

### Multer 및 Node.js

- [Multer GitHub Repository](https://github.com/expressjs/multer)
- [Fastify Multipart GitHub Repository](https://github.com/fastify/fastify-multipart)
- [Node.js - File System](https://nodejs.org/api/fs.html)
- [Node.js - Streams](https://nodejs.org/api/stream.html)
- [Node.js - Crypto](https://nodejs.org/api/crypto.html)
- [MDN - FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

### Object Storage

- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Amazon S3 - Uploading Objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/upload-objects.html)
- [Amazon S3 - Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Cloudflare R2 공식 문서](https://developers.cloudflare.com/r2/)
- [Google Cloud Storage 공식 문서](https://cloud.google.com/storage/docs)
- [MinIO 공식 문서](https://docs.min.io/)

### 보안 및 운영 환경

- [OWASP - File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Kubernetes - Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes - Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)