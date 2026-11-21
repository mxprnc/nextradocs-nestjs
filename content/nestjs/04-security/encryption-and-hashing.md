# Encryption and Hashing

## 1. 개요

Encryption(암호화)과 Hashing(해싱)은 애플리케이션에서 데이터를 보호하기 위해 사용하는 대표적인 암호학적 기술입니다.

두 기술 모두 원본 데이터를 다른 형태로 변환하지만, 목적과 동작 방식에는 중요한 차이가 있습니다.

- **Encryption**은 데이터를 암호문으로 변환하고, 적절한 복호화 키를 이용하여 원본 데이터를 복원할 수 있도록 합니다.
- **Hashing**은 입력 데이터를 고정된 길이 등의 해시 값으로 변환하는 단방향 연산입니다.
- **Password Hashing**은 비밀번호 저장을 위해 계산 비용을 의도적으로 높인 해싱 알고리즘을 사용합니다.

NestJS는 암호화 알고리즘을 자체적으로 구현하지 않으며, Node.js의 내장 `node:crypto` 모듈이나 검증된 외부 라이브러리를 활용합니다.

최신 NestJS에서는 `@nestjs/authentication` 패키지의 `PasswordHasher`를 통해 비밀번호 해싱과 검증 기능을 사용할 수도 있습니다.

이 문서에서는 암호화와 해싱의 차이를 이해하고, NestJS에서 각 기능을 안전하게 구현하는 방법을 설명합니다.

---

## 2. Encryption과 Hashing의 차이

Encryption과 Hashing은 데이터 보호라는 공통 목적을 가지지만 원본 데이터의 복원 가능 여부가 다릅니다.

| 구분 | Encryption | Hashing |
|---|---|---|
| 변환 방향 | 양방향 | 단방향 |
| 원본 복원 | 적절한 키로 복호화 가능 | 해시 값에서 원본을 직접 복원할 수 없음 |
| 주요 목적 | 기밀성 보호 | 무결성 확인, 비밀번호 검증 등 |
| 키 사용 | 일반적으로 필요 | 일반적인 해시는 불필요 |
| 대표 알고리즘 | AES-GCM, ChaCha20-Poly1305 | SHA-256, SHA-512 |
| 비밀번호 저장 | 일반적으로 부적합 | 전용 Password Hashing 알고리즘 사용 |
| 대표 사용 사례 | 개인정보 및 민감정보 암호화 | 파일 무결성 검사, 비밀번호 해시 저장 |

단방향 해싱이라고 해서 입력값을 절대 알아낼 수 없다는 의미는 아닙니다.

입력값의 후보가 제한적이라면 공격자가 후보들을 직접 해싱하여 저장된 해시 값과 비교할 수 있습니다.

따라서 비밀번호 저장에는 빠른 일반 해시 함수가 아니라 계산 비용이 높은 Password Hashing 알고리즘을 사용해야 합니다.

### 2.1. Encryption 처리 과정

```text
Plaintext
    |
    | Encryption Key
    v
Encryption Algorithm
    |
    v
Ciphertext
    |
    | Decryption Key
    v
Decryption Algorithm
    |
    v
Plaintext
```

암호화는 적절한 키를 보유한 시스템이 원본 데이터를 복원할 수 있어야 하는 상황에 사용합니다.

예를 들어 외부 서비스에 전달해야 하는 민감한 인증 정보나 복호화가 필요한 개인정보를 저장할 때 활용할 수 있습니다.

### 2.2. Hashing 처리 과정

```text
Input Data
    |
    v
Hash Function
    |
    v
Hash Value
```

일반적인 암호학적 해시 함수는 입력 데이터가 동일하면 동일한 결과를 생성합니다.

입력값이 조금만 변경되어도 출력값이 크게 달라질 수 있습니다.

그러나 서로 다른 입력값이 항상 서로 다른 해시 값을 생성하는 것은 아닙니다. 출력 공간이 유한하므로 이론적으로 충돌(Collision)이 존재합니다.

암호학적 해시 함수는 이러한 충돌을 계산적으로 찾기 어렵도록 설계됩니다.

---

## 3. Node.js Crypto Module

Node.js는 암호학적 연산을 위한 내장 모듈인 `node:crypto`를 제공합니다.

NestJS 애플리케이션에서도 별도의 프레임워크 전용 암호화 패키지 없이 해당 모듈을 사용할 수 있습니다.

대표적인 기능은 다음과 같습니다.

| API | 역할 |
|---|---|
| `createHash()` | 암호학적 해시 값을 생성합니다. |
| `createHmac()` | 비밀키를 사용하는 메시지 인증 코드를 생성합니다. |
| `randomBytes()` | 암호학적으로 안전한 난수를 생성합니다. |
| `createCipheriv()` | 대칭키 암호화를 수행합니다. |
| `createDecipheriv()` | 대칭키 복호화를 수행합니다. |
| `scrypt()` | 비밀번호 기반 키 유도 연산을 수행합니다. |
| `pbkdf2()` | PBKDF2 기반 키 유도 연산을 수행합니다. |
| `timingSafeEqual()` | 동일한 길이의 바이트 배열을 일정 시간 비교 방식으로 비교합니다. |

다음과 같이 모듈을 import할 수 있습니다.

```typescript
import {
  createHash,
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
```

`node:crypto`는 Node.js에 포함된 모듈이므로 별도로 npm 패키지를 설치할 필요가 없습니다.

다만 실제 사용 가능한 알고리즘은 Node.js 버전과 OpenSSL 구성에 따라 달라질 수 있습니다.

---

## 4. Hashing

Hashing은 입력 데이터를 해시 함수에 전달하여 일정한 형식의 해시 값을 생성하는 과정입니다.

### 4.1. SHA-256 해싱

SHA-256은 SHA-2 계열의 암호학적 해시 함수로, 256비트의 해시 값을 생성합니다.

Node.js에서는 `createHash()`를 사용합니다.

```typescript
import { createHash } from 'node:crypto';

const data = 'NestJS';

const hash = createHash('sha256')
  .update(data, 'utf8')
  .digest('hex');

console.log(hash);
```

주요 API는 다음과 같습니다.

| API | 설명 |
|---|---|
| `createHash('sha256')` | SHA-256 해시 객체를 생성합니다. |
| `update()` | 해싱할 데이터를 입력합니다. |
| `digest('hex')` | 최종 해시 값을 16진수 문자열로 반환합니다. |

SHA-256의 출력은 256비트이며, 16진수로 표현하면 64개의 문자로 구성됩니다.

### 4.2. Hashing 활용 사례

일반적인 해시 함수는 다음과 같은 용도로 활용할 수 있습니다.

- 파일 무결성 검사
- 다운로드 데이터의 체크섬 검증
- 콘텐츠 식별자 생성
- 데이터 변경 감지
- 디지털 서명에서 사용할 메시지 다이제스트 생성

다만 단순한 SHA-256 해시는 비밀키를 사용하지 않으므로 공격자가 데이터와 해시를 함께 변경할 수 있는 상황에서는 데이터의 진위를 보장하지 않습니다.

메시지의 인증까지 필요한 경우 HMAC 또는 디지털 서명과 같은 기술을 사용해야 합니다.

### 4.3. 비밀번호 저장에 SHA-256을 사용하지 않는 이유

SHA-256은 빠른 연산을 목적으로 설계된 해시 함수입니다.

일반적인 데이터 무결성 검증에는 적합하지만 비밀번호 저장에는 적합하지 않습니다.

```typescript
// 비밀번호 저장 용도로 사용하지 않아야 합니다.

const passwordHash = createHash('sha256')
  .update(password)
  .digest('hex');
```

공격자가 비밀번호 해시를 확보하면 GPU 등의 병렬 처리 장치를 이용하여 매우 많은 비밀번호 후보를 빠르게 검증할 수 있습니다.

비밀번호 저장에는 Argon2id, scrypt, bcrypt 등의 전용 알고리즘을 사용해야 합니다.

---

## 5. Password Hashing

Password Hashing은 사용자 비밀번호를 안전하게 저장하기 위한 해싱 기술입니다.

일반적인 해시 함수와 달리 연산 시간이나 메모리 사용량을 조절할 수 있도록 설계됩니다.

비밀번호 해싱의 기본 처리 과정은 다음과 같습니다.

```text
회원가입
    |
    v
Plaintext Password
    |
    v
Password Hashing Algorithm
    |
    +---- Salt 적용
    |
    +---- Cost Parameter 적용
    |
    v
Password Hash
    |
    v
Database 저장
```

로그인할 때는 저장된 해시를 복호화하지 않습니다.

사용자가 제출한 비밀번호와 저장된 해시를 Password Hashing 알고리즘의 검증 기능으로 비교합니다.

### 5.1. Salt

Salt는 비밀번호를 해싱할 때 함께 사용하는 고유한 난수 데이터입니다.

같은 비밀번호를 사용하는 사용자라도 서로 다른 Salt를 적용하면 다른 해시 값을 생성할 수 있습니다.

Salt를 사용하는 목적은 다음과 같습니다.

- 동일한 비밀번호의 해시 값이 동일하게 나타나는 문제 완화
- 사전 계산된 Rainbow Table 공격 방어
- 사용자별 비밀번호 추측 비용 증가

Salt는 일반적으로 비밀로 관리할 필요가 없습니다.

bcrypt, Argon2id, scrypt 등의 구현에서는 Salt와 알고리즘 파라미터를 최종 해시 문자열에 함께 저장하는 방식을 사용할 수 있습니다.

### 5.2. Pepper

Pepper는 비밀번호 해싱에 추가로 사용하는 비밀 값입니다.

Salt와 달리 Pepper는 데이터베이스 외부의 안전한 저장소에 보관해야 합니다.

예를 들어 Secret Manager 또는 HSM을 활용할 수 있습니다.

Pepper는 데이터베이스만 탈취된 상황에서 추가적인 방어 계층을 제공할 수 있지만 키 관리 및 교체가 복잡해진다는 단점이 있습니다.

모든 애플리케이션에서 반드시 사용해야 하는 것은 아닙니다.

### 5.3. Cost Parameter

Password Hashing 알고리즘은 해싱에 필요한 연산 비용을 조절할 수 있습니다.

대표적으로 다음과 같습니다.

| 알고리즘 | 주요 파라미터 |
|---|---|
| Argon2id | Memory Cost, Time Cost, Parallelism |
| scrypt | N, r, p |
| bcrypt | Cost Factor |
| PBKDF2 | Iteration Count |

비용을 높이면 비밀번호 추측 공격의 연산 비용을 증가시킬 수 있습니다.

반면 서버의 CPU 및 메모리 사용량도 증가하므로 실제 서비스의 동시 로그인 요청 수와 서버 자원을 고려하여 설정해야 합니다.

---

## 6. NestJS PasswordHasher

최신 NestJS 공식 문서에서는 비밀번호 해싱을 위한 `PasswordHasher`를 제공합니다.

`PasswordHasher`는 `@nestjs/authentication` 패키지에 포함된 Provider이며, Node.js의 `scrypt`를 이용하여 비밀번호를 해싱합니다.

### 6.1. 패키지 설치

```bash
npm install @nestjs/authentication
```

`AuthenticationModule`을 사용하는 애플리케이션에서는 `PasswordHasher`를 의존성 주입받을 수 있습니다.

전체 인증 모듈 구성에는 사용자 저장소 등 추가적인 설정이 필요할 수 있으므로 실제 프로젝트에서는 해당 패키지의 설정 가이드를 함께 확인해야 합니다.

### 6.2. PasswordHasher 사용

```typescript
import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async hashPassword(password: string) {
    return this.passwordHasher.hash(password);
  }

  async verifyPassword(
    password: string,
    storedHash: string | undefined,
  ) {
    return this.passwordHasher.verify(
      password,
      storedHash,
    );
  }
}
```

`hash()`는 비밀번호를 해싱하고 Salt 및 파라미터를 포함한 문자열을 반환합니다.

`verify()`는 사용자가 제출한 비밀번호가 저장된 해시와 일치하는지 검증합니다.

### 6.3. scrypt 기반 해싱

NestJS의 `PasswordHasher`는 기본적으로 다음과 같은 scrypt 파라미터를 사용합니다.

| 설정 | 기본값 |
|---|---|
| N | 2^17 |
| r | 8 |
| p | 1 |
| 메모리 사용량 | 해시 작업당 약 128MiB |

scrypt는 Memory-Hard 알고리즘으로, 공격자가 다수의 비밀번호를 병렬로 추측하는 데 상당한 메모리 비용이 들도록 설계되었습니다.

기본 해시 결과는 다음과 같은 형식을 가집니다.

```text
$scrypt$ln=17,r=8,p=1$<salt>$<hash>
```

이 형식에는 다음 정보가 포함됩니다.

- 사용한 알고리즘
- 해싱 비용 파라미터
- Salt
- 최종 해시 값

따라서 애플리케이션에서는 반환된 문자열을 데이터베이스에 저장하고 이후 검증에 활용할 수 있습니다.

### 6.4. 비밀번호 검증

```typescript
const isValid = await this.passwordHasher.verify(
  password,
  storedHash,
);

if (!isValid) {
  throw new UnauthorizedException(
    'Invalid credentials',
  );
}
```

NestJS의 `PasswordHasher`는 존재하지 않는 사용자에 대해 `undefined`를 전달받으면 더미 해시를 이용하여 검증합니다.

이 방식은 사용자 존재 여부에 따른 응답 시간 차이를 줄이기 위한 기능입니다.

다만 네트워크 상태나 애플리케이션의 다른 처리 과정까지 동일한 시간이 걸린다는 의미는 아닙니다.

### 6.5. 비밀번호 재해싱

시간이 지나면 기존 비밀번호 해싱 파라미터가 현재 보안 요구사항보다 약해질 수 있습니다.

이 경우 `needsRehash()`를 이용하여 재해싱 여부를 판단할 수 있습니다.

```typescript
const isValid = await this.passwordHasher.verify(
  password,
  storedHash,
);

if (!isValid) {
  throw new UnauthorizedException();
}

if (this.passwordHasher.needsRehash(storedHash)) {
  const newHash = await this.passwordHasher.hash(password);

  await this.usersRepository.updatePasswordHash(
    user.id,
    newHash,
  );
}
```

위 코드는 재해싱 흐름을 설명하기 위한 예제이며, `usersRepository`는 애플리케이션에서 별도로 구현해야 합니다.

이 방식은 사용자가 로그인하는 시점에 기존 해시를 새로운 설정으로 교체하는 데 활용할 수 있습니다.

---

## 7. Argon2를 이용한 비밀번호 해싱

Argon2는 비밀번호 해싱과 키 유도를 위해 설계된 알고리즘입니다.

Argon2에는 다음과 같은 변형이 있습니다.

| 알고리즘 | 특징 |
|---|---|
| Argon2d | 데이터 의존적인 메모리 접근을 사용합니다. |
| Argon2i | 데이터 독립적인 메모리 접근을 사용합니다. |
| Argon2id | Argon2i와 Argon2d의 특성을 결합합니다. |

일반적인 비밀번호 저장에는 Argon2id가 권장됩니다.

### 7.1. 설치

```bash
npm install argon2
```

Argon2는 NestJS 전용 패키지가 아니며 일반적인 Node.js 라이브러리입니다.

### 7.2. PasswordService 구현

```typescript
// src/security/password.service.ts

import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    return argon2.verify(storedHash, password);
  }
}
```

위 예제는 OWASP에서 제시하는 Argon2id 최소 권장 파라미터 중 하나를 사용합니다.

| 옵션 | 값 | 설명 |
|---|---|---|
| `type` | `argon2id` | 알고리즘 변형 |
| `memoryCost` | 19456 | 메모리 사용량(KiB, 19MiB) |
| `timeCost` | 2 | 연산 반복 횟수 |
| `parallelism` | 1 | 병렬 처리 수준 |

설정값은 최소 권장 수준을 참고한 것이며, 실제 운영 환경에서는 서버의 CPU 및 메모리 여유와 동시 인증 부하를 측정하여 조정해야 합니다.

### 7.3. 비밀번호 저장

```typescript
const passwordHash =
  await passwordService.hash(password);

await usersRepository.create({
  email,
  passwordHash,
});
```

데이터베이스에는 평문 비밀번호가 아니라 최종 해시 문자열을 저장합니다.

### 7.4. 비밀번호 검증

```typescript
const isValid = await passwordService.verify(
  password,
  user.passwordHash,
);

if (!isValid) {
  throw new UnauthorizedException(
    'Invalid credentials',
  );
}
```

Argon2의 `verify()`는 저장된 해시에 포함된 파라미터를 이용하여 검증합니다.

입력 비밀번호와 저장된 해시를 직접 문자열 비교하는 방식으로 검증하지 않아야 합니다.

---

## 8. bcrypt를 이용한 비밀번호 해싱

bcrypt는 널리 사용되는 비밀번호 해싱 알고리즘입니다.

Cost Factor를 조절하여 비밀번호 해싱에 필요한 계산 비용을 증가시킬 수 있습니다.

### 8.1. 설치

```bash
npm install bcrypt
npm install --save-dev @types/bcrypt
```

### 8.2. 비밀번호 해싱

```typescript
import * as bcrypt from 'bcrypt';

const password = 'example-password';

const passwordHash = await bcrypt.hash(
  password,
  12,
);
```

두 번째 인자는 Cost Factor입니다.

Cost Factor가 증가하면 비밀번호 해싱에 필요한 연산량도 증가합니다.

### 8.3. Salt 생성

```typescript
const salt = await bcrypt.genSalt(12);

const passwordHash = await bcrypt.hash(
  password,
  salt,
);
```

bcrypt의 `hash()`에 Cost Factor를 전달하면 Salt를 내부적으로 생성하므로 일반적인 사용에서는 `genSalt()`를 별도로 호출하지 않아도 됩니다.

### 8.4. 비밀번호 검증

```typescript
const isMatch = await bcrypt.compare(
  password,
  passwordHash,
);
```

`compare()`는 제출된 비밀번호와 저장된 bcrypt 해시를 비교합니다.

### 8.5. bcrypt의 제한사항

bcrypt는 비밀번호의 처음 72바이트만 처리하는 제한사항이 있습니다.

따라서 72바이트를 초과하는 비밀번호에서는 일부 입력 내용이 해시 결과에 반영되지 않을 수 있습니다.

UTF-8 환경에서는 한 글자가 여러 바이트로 표현될 수 있으므로 문자 수와 바이트 수가 다를 수 있습니다.

새로운 애플리케이션에서는 이러한 제약과 메모리 기반 공격 방어 특성을 고려하여 Argon2id 또는 scrypt를 검토하는 것이 좋습니다.

---

## 9. Password Hashing 알고리즘 비교

| 알고리즘 | 메모리 사용 비용 조절 | 주요 특징 | 권장 활용 |
|---|---|---|---|
| Argon2id | 지원 | Memory-Hard, 다양한 비용 설정 | 신규 비밀번호 저장 시스템 |
| scrypt | 지원 | Memory-Hard, Node.js 내장 지원 | 신규 시스템 및 NestJS PasswordHasher |
| bcrypt | 제한적 | 오랜 사용 경험, Cost Factor 지원 | 기존 시스템 호환 및 유지보수 |
| PBKDF2 | 일반적으로 메모리 사용 비용 조절 없음 | 반복 횟수 기반 키 유도 | FIPS 요구사항 등이 있는 환경 |
| SHA-256 | 없음 | 빠른 일반 목적 해시 | 파일 무결성 및 일반 데이터 해싱 |

비밀번호 저장용 알고리즘을 선택할 때는 다음 사항을 고려해야 합니다.

- 알려진 공격 기법에 대한 저항성
- CPU 및 메모리 사용량
- 동시 요청 처리 성능
- 라이브러리 유지보수 상태
- 기존 해시 데이터와의 호환성
- 운영 환경의 보안 및 규제 요구사항

비밀번호 해싱 비용은 시스템의 성능 테스트 결과에 따라 설정해야 합니다.

---

## 10. Encryption

Encryption은 평문 데이터를 암호문으로 변환하여 기밀성을 보호하는 기술입니다.

복호화 키를 가지고 있는 시스템은 암호문을 다시 평문으로 복원할 수 있습니다.

대표적으로 다음과 같은 상황에서 사용합니다.

- 복호화가 필요한 민감정보 저장
- 외부 API Credential 보호
- 비밀 설정값 암호화
- 암호화된 백업 파일 생성
- 저장 데이터에 대한 추가적인 기밀성 보호

암호화는 크게 대칭키 암호화와 비대칭키 암호화로 구분됩니다.

### 10.1. 대칭키 암호화

Symmetric Encryption은 암호화와 복호화에 동일한 비밀키를 사용하는 방식입니다.

대표적인 알고리즘으로 AES가 있습니다.

```text
Plaintext
    |
    | Secret Key
    v
AES Encryption
    |
    v
Ciphertext
    |
    | Same Secret Key
    v
AES Decryption
    |
    v
Plaintext
```

대칭키 암호화는 일반적으로 대용량 데이터 암호화에 적합합니다.

다만 암호화 키가 노출되면 해당 키로 보호된 데이터를 복호화할 수 있으므로 키 관리가 중요합니다.

### 10.2. 비대칭키 암호화

Asymmetric Encryption은 공개키와 개인키로 구성된 키 쌍을 사용합니다.

공개키 암호화 방식에서는 공개키로 암호화한 데이터를 대응하는 개인키로 복호화할 수 있습니다.

```text
Plaintext
    |
    | Public Key
    v
Encryption
    |
    v
Ciphertext
    |
    | Private Key
    v
Decryption
    |
    v
Plaintext
```

비대칭키 암호화는 키 교환 및 공개키 기반 암호화 구조에 활용됩니다.

다만 모든 비대칭키 알고리즘이 직접 암호화에 사용되는 것은 아닙니다. 일부 알고리즘은 디지털 서명 또는 키 합의 목적으로 사용됩니다.

실무에서는 대칭키 암호화와 비대칭키 기술을 결합한 하이브리드 암호화 구조도 사용합니다.

---

## 11. AES-256-GCM 암호화

AES는 널리 사용되는 대칭키 암호화 알고리즘입니다.

AES-256은 256비트 키를 사용하며, GCM(Galois/Counter Mode)은 암호화와 인증을 함께 제공하는 AEAD(Authenticated Encryption with Associated Data) 방식입니다.

AES-GCM은 기밀성과 무결성을 함께 검증할 수 있습니다.

### 11.1. 주요 구성 요소

| 구성 요소 | 설명 |
|---|---|
| Plaintext | 원본 데이터 |
| Encryption Key | AES 암호화 키 |
| IV / Nonce | 암호화 연산마다 사용하는 고유한 값 |
| Ciphertext | 암호화된 데이터 |
| Authentication Tag | 암호문 및 관련 데이터의 인증 검증에 사용하는 값 |
| AAD | 암호화하지 않지만 무결성을 보호하는 추가 데이터 |

GCM에서는 동일한 키와 Nonce 조합을 재사용하지 않는 것이 매우 중요합니다.

Nonce 재사용은 기밀성 및 무결성 보장을 심각하게 훼손할 수 있습니다.

### 11.2. NestJS 암호화 서비스 구성

예제 디렉터리 구조는 다음과 같습니다.

```text
src/
└── security/
    ├── security.module.ts
    ├── encryption.service.ts
    └── password.service.ts
```

암호화 기능은 별도의 Service로 구현하여 다른 Module에서 재사용할 수 있도록 구성합니다.

### 11.3. 암호화 키 생성

AES-256은 32바이트 키를 사용합니다.

다음 명령어로 암호학적으로 안전한 키를 생성할 수 있습니다.

```bash
openssl rand -hex 32
```

생성된 결과는 64자리의 16진수 문자열입니다.

예제에서는 다음 환경변수를 사용합니다.

```dotenv
ENCRYPTION_KEY=<64-character-hexadecimal-key>
```

여기서 환경변수는 32바이트 원본 키를 16진수로 인코딩한 문자열이어야 합니다.

단순한 비밀번호나 임의의 문자열을 그대로 AES 키로 사용해서는 안 됩니다.

### 11.4. EncryptionService 구현

```typescript
// src/security/encryption.service.ts

import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const keyHex =
      this.configService.getOrThrow<string>(
        'ENCRYPTION_KEY',
      );

    if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      throw new Error(
        'ENCRYPTION_KEY must be a 32-byte hex key',
      );
    }

    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);

    const cipher = createCipheriv(
      this.algorithm,
      this.key,
      iv,
      { authTagLength: 16 },
    );

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split('.');

    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new Error('Invalid encrypted data format');
    }

    const [, ivEncoded, tagEncoded, dataEncoded] = parts;

    const iv = Buffer.from(ivEncoded, 'base64url');
    const authTag = Buffer.from(tagEncoded, 'base64url');
    const ciphertext = Buffer.from(dataEncoded, 'base64url');

    if (iv.length !== 12 || authTag.length !== 16) {
      throw new Error('Invalid IV or authentication tag');
    }

    try {
      const decipher = createDecipheriv(
        this.algorithm,
        this.key,
        iv,
        { authTagLength: 16 },
      );

      decipher.setAuthTag(authTag);

      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return plaintext.toString('utf8');
    } catch {
      throw new InternalServerErrorException(
        'Decryption failed',
      );
    }
  }
}
```

위 예제에서는 암호문을 다음과 같은 형식으로 저장합니다.

```text
v1.<iv>.<authentication-tag>.<ciphertext>
```

각 값은 Base64URL로 인코딩됩니다.

이 형식은 예제에서 정의한 애플리케이션 전용 저장 형식이며 표준화된 암호문 포맷은 아닙니다.

`v1`은 데이터 포맷 버전 식별자입니다. 실제 운영에서는 암호화 키 교체를 위한 Key ID도 별도로 관리하는 것이 좋습니다.

또한 운영 코드에서는 암호문 길이 제한, 인코딩 유효성 검사, 예외 처리 및 키 버전 선택 로직을 추가해야 합니다.

### 11.5. EncryptionService의 동작

암호화 과정은 다음과 같습니다.

```text
Plaintext
    |
    v
randomBytes(12)
    |
    v
IV 생성
    |
    v
createCipheriv()
    |
    v
cipher.update()
    |
    v
cipher.final()
    |
    v
cipher.getAuthTag()
    |
    v
Ciphertext + IV + Tag
```

복호화 과정은 다음과 같습니다.

```text
Encrypted Data
    |
    v
IV / Tag / Ciphertext 추출
    |
    v
createDecipheriv()
    |
    v
decipher.setAuthTag()
    |
    v
decipher.update()
    |
    v
decipher.final()
    |
    +---- 인증 실패 ----> Exception
    |
    v
Plaintext
```

GCM에서는 인증 태그 검증이 완료되기 전에 생성된 복호화 결과를 신뢰해서는 안 됩니다.

위 예제는 `decipher.final()`이 성공한 이후에만 평문을 반환합니다.

### 11.6. SecurityModule 구성

```typescript
// src/security/security.module.ts

import { Module } from '@nestjs/common';

import { EncryptionService } from './encryption.service';
import { PasswordService } from './password.service';

@Module({
  providers: [
    EncryptionService,
    PasswordService,
  ],
  exports: [
    EncryptionService,
    PasswordService,
  ],
})
export class SecurityModule {}
```

`PasswordService`는 7절에서 정의한 Argon2 기반 서비스입니다.

`SecurityModule`을 import하는 Module에서는 해당 Service들을 의존성 주입받아 사용할 수 있습니다.

환경변수를 읽기 위해서는 `ConfigModule`이 전역으로 등록되어 있거나 해당 Module에 import되어 있어야 합니다.

### 11.7. Service에서 암호화 활용

```typescript
@Injectable()
export class ApiCredentialsService {
  constructor(
    private readonly encryptionService: EncryptionService,
  ) {}

  encryptApiKey(apiKey: string): string {
    return this.encryptionService.encrypt(apiKey);
  }

  decryptApiKey(encryptedApiKey: string): string {
    return this.encryptionService.decrypt(
      encryptedApiKey,
    );
  }
}
```

이러한 구조에서는 Service가 암호화 알고리즘의 세부 구현을 직접 알 필요가 없습니다.

암호화 알고리즘이나 키 관리 정책이 변경되어도 `EncryptionService`를 중심으로 수정할 수 있습니다.

---

## 12. HMAC

HMAC(Hash-based Message Authentication Code)은 비밀키와 해시 함수를 조합하여 메시지 인증 코드를 생성하는 기술입니다.

일반적인 Hash와 달리 HMAC은 비밀키를 사용합니다.

이를 통해 메시지의 무결성과 해당 비밀키를 보유한 주체가 생성한 메시지인지 검증할 수 있습니다.

다만 HMAC은 메시지를 암호화하지 않으므로 기밀성을 제공하지 않습니다.

### 12.1. HMAC 생성

```typescript
import { createHmac } from 'node:crypto';

const secret = Buffer.from(
  process.env.HMAC_SECRET_HEX!,
  'hex',
);

const message = 'example-message';

const signature = createHmac('sha256', secret)
  .update(message, 'utf8')
  .digest('hex');
```

예제에서는 비밀키를 환경변수에 저장한 것으로 가정합니다.

운영 환경에서는 키의 형식과 길이를 검증하고, 충분한 엔트로피를 가진 비밀키를 사용해야 합니다.

### 12.2. HMAC 활용 사례

- Webhook Signature 검증
- 외부 서비스 요청 무결성 검사
- 메시지 인증
- 서명된 API 요청 검증

Webhook Signature를 검증할 때는 일반적으로 수신한 원본 Request Body를 기준으로 HMAC을 계산해야 합니다.

JSON으로 파싱한 뒤 다시 직렬화하면 공백이나 속성 순서가 달라져 서명 검증에 실패할 수 있습니다.

서명 검증 시에는 단순 문자열 비교 대신 `timingSafeEqual()` 등을 사용하여 비교 과정에서 발생할 수 있는 타이밍 정보 노출을 줄여야 합니다.

단, `timingSafeEqual()`만 사용한다고 해서 주변 애플리케이션 코드까지 타이밍 공격에 안전해지는 것은 아닙니다.

---

## 13. Key Derivation Function (KDF)

KDF(Key Derivation Function)는 비밀번호, 공유 비밀 또는 다른 키 재료로부터 암호학적 키를 유도하는 기능입니다.

대표적인 KDF에는 다음과 같은 기술이 있습니다.

| KDF | 특징 |
|---|---|
| scrypt | 메모리 사용 비용을 높이는 비밀번호 기반 KDF |
| PBKDF2 | 반복적인 HMAC 연산 기반 KDF |
| HKDF | 충분한 엔트로피를 가진 입력 키 재료에서 목적별 키를 유도하는 KDF |
| Argon2id | 비밀번호 해싱 및 키 유도에 활용 가능한 Memory-Hard 알고리즘 |

KDF는 비밀번호 해싱뿐 아니라 사용자 비밀번호를 기반으로 암호화 키를 생성해야 하는 경우에도 활용할 수 있습니다.

다만 일반적인 사용자의 비밀번호는 무작위 암호화 키보다 엔트로피가 낮으므로, 비밀번호를 단순히 SHA-256으로 해싱하여 AES 키로 사용하는 방식은 피해야 합니다.

비밀번호 기반 암호화 키를 생성할 때는 고유한 Salt와 적절한 비용 파라미터를 사용하는 KDF를 선택해야 합니다.

---

## 14. 암호화 키 관리

암호화 시스템의 보안 수준은 알고리즘뿐 아니라 키 관리 방식에 크게 영향을 받습니다.

강력한 알고리즘을 사용하더라도 키가 노출되면 데이터가 복호화될 수 있습니다.

### 14.1. 키 저장

암호화 키는 다음과 같은 위치에서 관리할 수 있습니다.

- AWS Secrets Manager
- AWS KMS
- Azure Key Vault
- Google Cloud Secret Manager
- HashiCorp Vault
- HSM(Hardware Security Module)

개발 환경에서는 환경변수를 이용할 수 있지만 실제 비밀키를 Git 저장소에 커밋하지 않아야 합니다.

환경변수 또한 애플리케이션 프로세스나 운영 환경에서 노출될 수 있으므로 접근 권한 및 로그 출력을 제한해야 합니다.

### 14.2. Key Rotation

Key Rotation은 기존 암호화 키를 새로운 키로 교체하는 과정입니다.

```text
Encryption Key v1
        |
        v
Encrypted Data v1

        |
        | Key Rotation
        v

Encryption Key v2
        |
        v
Encrypted Data v2
```

기존 데이터가 이전 키로 암호화되었다면 새로운 키만 사용하여 복호화할 수는 없습니다.

따라서 키 회전 정책에는 다음 사항이 포함되어야 합니다.

- Key ID 관리
- 기존 키의 안전한 보관
- 새로운 데이터에 사용할 키 지정
- 기존 데이터 재암호화 전략
- 이전 키 폐기 시점
- 키 유출 시 대응 절차

### 14.3. Envelope Encryption

Envelope Encryption은 데이터 암호화 키(DEK)와 키 암호화 키(KEK)를 분리하는 방식입니다.

```text
Data Encryption Key (DEK)
          |
          +----> Data Encryption
          |
          v
     Encrypted Data


Key Encryption Key (KEK)
          |
          v
     Encrypt DEK
          |
          v
     Encrypted DEK
```

DEK는 실제 데이터를 암호화하는 데 사용합니다.

KEK는 DEK를 보호하는 데 사용합니다.

클라우드 KMS를 활용하면 애플리케이션이 마스터 키를 직접 저장하거나 관리하지 않는 구조를 구성할 수 있습니다.

---

## 15. Encryption과 TLS

애플리케이션 수준의 데이터 암호화와 TLS는 보호하는 범위가 다릅니다.

| 구분 | Application Encryption | TLS |
|---|---|---|
| 보호 대상 | 애플리케이션이 선택한 데이터 | 네트워크 연결의 전송 데이터 |
| 암호화 시점 | 애플리케이션 로직 실행 중 | 네트워크 통신 중 |
| 복호화 위치 | 애플리케이션 또는 지정된 시스템 | TLS 연결의 종료 지점 |
| 대표 활용 | 민감정보 저장 및 전달 | HTTPS 통신 |
| 키 관리 | 애플리케이션 또는 KMS | TLS 인증서 및 연결 키 |

TLS는 전송 중인 데이터를 보호하지만 데이터베이스에 저장된 데이터까지 자동으로 보호하지는 않습니다.

반대로 애플리케이션에서 특정 필드를 암호화하더라도 HTTPS를 대체할 수는 없습니다.

운영 환경에서는 데이터의 전송 구간과 저장 구간을 각각 고려하여 보호 정책을 구성해야 합니다.

---

## 16. Authentication에서의 활용

비밀번호 해싱은 인증 기능의 핵심 구성 요소입니다.

일반적인 회원가입 및 로그인 흐름은 다음과 같습니다.

### 16.1. 회원가입

```text
Client
    |
    | Email / Password
    v
AuthController
    |
    v
AuthService
    |
    v
PasswordService.hash()
    |
    v
Password Hash
    |
    v
UsersRepository
    |
    v
Database
```

회원가입에서는 평문 비밀번호를 저장하지 않고 해시 값만 저장합니다.

### 16.2. 로그인

```text
Client
    |
    | Email / Password
    v
AuthController
    |
    v
AuthService
    |
    +----> UsersRepository
    |          |
    |          v
    |     Stored Password Hash
    |
    v
PasswordService.verify()
    |
    +---- 실패 ----> 401 Unauthorized
    |
    v
Authentication Success
    |
    v
Access Token 발급
```

로그인에서는 제출된 비밀번호와 저장된 해시가 일치하는지 검증합니다.

이때 평문 비밀번호를 직접 데이터베이스에 저장하거나 로그에 기록해서는 안 됩니다.

토큰 발급과 인증 Guard에 관한 구체적인 구현은 `04-security/authentication.md`에서 설명합니다.

---

## 17. 보안 설계 시 주의사항

### 17.1. 비밀번호를 암호화하여 저장하지 않습니다

사용자 비밀번호는 일반적으로 복호화할 필요가 없습니다.

따라서 복호화 가능한 Encryption보다 전용 Password Hashing 알고리즘을 사용하는 것이 적합합니다.

### 17.2. 검증된 암호화 알고리즘을 사용합니다

직접 암호화 알고리즘을 설계하거나 검증되지 않은 구현체를 사용하는 것은 피해야 합니다.

암호화가 필요한 경우 AES-GCM과 같은 인증 암호화 방식과 신뢰할 수 있는 암호학적 라이브러리를 사용하는 것이 좋습니다.

### 17.3. Key와 IV를 구분합니다

암호화 키와 IV는 서로 다른 역할을 수행합니다.

- Key는 암호화 및 복호화에 사용하는 비밀 값입니다.
- IV 또는 Nonce는 암호화 연산의 고유성을 확보하기 위해 사용합니다.

IV가 반드시 비밀일 필요는 없지만, 사용 중인 암호화 모드에서 요구하는 고유성 및 생성 규칙은 반드시 준수해야 합니다.

### 17.4. 비밀번호 해시와 암호화 키를 분리합니다

비밀번호 해시, JWT Secret, AES Encryption Key, HMAC Key는 목적이 다릅니다.

동일한 키를 여러 암호학적 용도로 재사용하지 않는 것이 좋습니다.

키의 목적과 수명주기를 분리하면 보안 사고 발생 시 영향을 받는 범위를 줄일 수 있습니다.

### 17.5. 암호화 데이터의 무결성을 검증합니다

기밀성만 제공하는 암호화 방식은 암호문 변조를 충분히 탐지하지 못할 수 있습니다.

AES-GCM과 같은 인증 암호화 방식을 이용하면 암호문 변조 여부를 검증할 수 있습니다.

### 17.6. 암호학적 난수를 사용합니다

Salt, IV 및 암호화 키 생성에는 암호학적으로 안전한 난수 생성기를 사용해야 합니다.

```typescript
import { randomBytes } from 'node:crypto';

const salt = randomBytes(16);
const iv = randomBytes(12);
const encryptionKey = randomBytes(32);
```

보안 목적으로 난수를 생성할 때 `Math.random()`을 사용해서는 안 됩니다.

### 17.7. 비밀번호 해싱의 리소스 비용을 고려합니다

Password Hashing 알고리즘은 의도적으로 계산 비용이 높게 설계되어 있습니다.

특히 Argon2id와 scrypt는 상당한 메모리를 사용할 수 있습니다.

동시 로그인 요청이 많은 서비스에서는 다음 사항을 측정해야 합니다.

- 비밀번호 해싱 및 검증 시간
- 동시 처리 가능한 인증 요청 수
- CPU 사용률
- 메모리 사용량
- 스레드 풀 부하
- 인증 API의 Rate Limiting 정책

성능을 높이기 위해 해싱 비용을 무조건 낮추기보다, 서버 자원과 보안 요구사항에 맞는 비용 파라미터를 선택해야 합니다.

---

## 18. 테스트

암호화 및 해싱 기능은 단순히 정상 동작하는지만 확인하는 것이 아니라 잘못된 데이터와 변조된 데이터에 대한 처리도 검증해야 합니다.

### 18.1. PasswordService 테스트

```typescript
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('비밀번호를 해싱합니다.', async () => {
    const password = 'example-password';

    const hash = await service.hash(password);

    expect(hash).not.toBe(password);
  });

  it('올바른 비밀번호를 검증합니다.', async () => {
    const password = 'example-password';

    const hash = await service.hash(password);

    const isValid = await service.verify(
      password,
      hash,
    );

    expect(isValid).toBe(true);
  });

  it('잘못된 비밀번호를 거부합니다.', async () => {
    const hash = await service.hash(
      'correct-password',
    );

    const isValid = await service.verify(
      'wrong-password',
      hash,
    );

    expect(isValid).toBe(false);
  });
});
```

### 18.2. EncryptionService 테스트

암호화 서비스에서는 다음 시나리오를 검증해야 합니다.

| 테스트 항목 | 기대 결과 |
|---|---|
| 정상 데이터 암호화 | 원본과 다른 암호문 생성 |
| 정상 데이터 복호화 | 원본 데이터 복원 |
| 동일 평문 반복 암호화 | 다른 IV로 인해 서로 다른 암호문 생성 |
| 잘못된 암호화 키 | 복호화 실패 |
| 암호문 변조 | 인증 태그 검증 실패 |
| Authentication Tag 변조 | 복호화 실패 |
| 잘못된 입력 포맷 | 예외 발생 |

실제 테스트에서는 테스트 전용 키를 사용하고 운영 환경의 암호화 키를 테스트 코드에 포함하지 않아야 합니다.

---

## 19. 관련 문서

- `01-fundamentals/providers.md`: Provider와 서비스 구성
- `01-fundamentals/dependency-injection.md`: 의존성 주입
- `03-techniques/configuration.md`: 환경변수 및 Secret 구성
- `04-security/authentication.md`: 사용자 인증 및 비밀번호 검증
- `04-security/authorization.md`: 사용자 접근 권한 검증
- `04-security/helmet.md`: HTTP 보안 헤더
- `04-security/rate-limiting.md`: 인증 요청 제한
- `06-testing/unit-testing.md`: 단위 테스트
- `08-deployment/environment-configuration.md`: 운영 환경 설정

---

## 20. 정리

Encryption과 Hashing은 데이터를 보호하기 위한 핵심적인 암호학적 기술이지만 목적과 동작 원리가 다릅니다.

NestJS에서는 Node.js 내장 Crypto Module, 공식 인증 패키지 또는 검증된 외부 라이브러리를 이용하여 필요한 보안 기능을 구현할 수 있습니다.

핵심 사항은 다음과 같습니다.

1. **Encryption**은 데이터를 암호화하고 적절한 키를 사용하여 복호화할 수 있는 양방향 기술입니다.
2. **Hashing**은 입력 데이터를 단방향으로 변환하며 파일 무결성 검사 등에 활용합니다.
3. **Password Hashing**은 Argon2id, scrypt, bcrypt와 같이 비밀번호 추측 비용을 높이는 전용 알고리즘을 사용해야 합니다.
4. **PasswordHasher**는 최신 NestJS 공식 인증 패키지에서 제공하는 scrypt 기반 비밀번호 해싱 기능입니다.
5. **Argon2id**는 신규 비밀번호 저장 시스템에서 우선적으로 검토할 수 있는 알고리즘입니다.
6. **bcrypt**는 기존 시스템과의 호환성이 높지만 입력 길이 제한을 고려해야 합니다.
7. **AES-256-GCM**은 데이터의 기밀성과 무결성을 함께 보호할 수 있는 인증 암호화 방식입니다.
8. **HMAC**은 비밀키를 이용하여 메시지의 무결성과 인증을 검증합니다.
9. **Key Management**는 암호화 키의 생성, 보관, 회전 및 폐기까지 포함하는 보안 관리 과정입니다.
10. **TLS와 애플리케이션 암호화**는 서로 다른 구간을 보호하므로 목적에 맞게 함께 사용해야 합니다.

암호화와 해싱을 적용할 때는 알고리즘 자체의 안전성뿐 아니라 키 관리, Salt 및 Nonce 생성, 비용 파라미터, 입력값 검증, 비밀정보 노출 방지 등의 요소를 종합적으로 고려해야 합니다.

---

## 참고 자료

### NestJS 공식 문서

- [NestJS - Encryption and Hashing](https://docs.nestjs.com/security/encryption-and-hashing)
- [NestJS v11 - Encryption and Hashing](https://docs.nestjs.com/v11/security/encryption-and-hashing)
- [NestJS - Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS - Providers](https://docs.nestjs.com/providers)

### Node.js 공식 문서

- [Node.js - Crypto](https://nodejs.org/api/crypto.html)
- [Node.js - Environment Variables](https://nodejs.org/api/environment_variables.html)

### 암호화 및 해싱 라이브러리

- [Argon2 - npm](https://www.npmjs.com/package/argon2)
- [Argon2 - GitHub](https://github.com/ranisalt/node-argon2)
- [bcrypt - npm](https://www.npmjs.com/package/bcrypt)
- [bcrypt - GitHub](https://github.com/kelektiv/node.bcrypt.js)

### OWASP 보안 가이드

- [OWASP - Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP - Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP - Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [OWASP - Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [OWASP - Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### 암호학 표준

- [RFC 9106 - Argon2 Memory-Hard Function](https://www.rfc-editor.org/rfc/rfc9106)
- [RFC 7914 - The scrypt Password-Based Key Derivation Function](https://www.rfc-editor.org/rfc/rfc7914)
- [RFC 8018 - PKCS #5: Password-Based Cryptography Specification](https://www.rfc-editor.org/rfc/rfc8018)
- [NIST SP 800-38D - Galois/Counter Mode (GCM)](https://csrc.nist.gov/pubs/sp/800/38/d/final)
- [NIST SP 800-57 - Recommendation for Key Management](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final)