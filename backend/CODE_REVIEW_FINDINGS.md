# Lingooo Project - Consolidated Code Review Findings

**Date**: 2025-11-02
**Reviewers**: Claude Code + External Reviewer
**Scope**: Full project security, vulnerabilities, code quality

---

## 🔴 Critical Priority Issues

### 1. [HIGH] Missing onRetryQuestion Prop in word-detail.tsx
**Location**: `/Users/a2424/Documents/Lingooo/lingooo-mobile/app/(tabs)/word-detail.tsx:306-317`

**Problem**: ChatSection component is missing the `onRetryQuestion` prop, but search.tsx has it.

**Current Code**:
```typescript
<ChatSection
  placeholder="この単語について質問をする..."
  qaPairs={qaPairs}
  followUps={followUps}
  isStreaming={isChatStreaming}
  error={qaPairs.length === 0 ? chatError : null}
  onSend={handleChatSubmit}
  onQuickQuestion={handleQuestionPress}
  onRetry={handleChatRetry}  // ❌ Missing onRetryQuestion!
/>
```

**Expected Code**:
```typescript
<ChatSection
  placeholder="この単語について質問をする..."
  qaPairs={qaPairs}
  followUps={followUps}
  isStreaming={isChatStreaming}
  error={qaPairs.length === 0 ? chatError : null}
  onSend={handleChatSubmit}
  onQuickQuestion={handleQuestionPress}
  onRetryQuestion={handleQACardRetry}  // ✅ Add this
/>
```

**Fix Required**: Add the handler function:
```typescript
const handleQACardRetry = (question: string) => {
  if (!question.trim()) {
    return;
  }
  void sendChatMessage(question);
};
```

**Impact**: Users cannot retry failed questions from QA cards on word detail page.

---

### 2. [HIGH] TypeScript Compilation Errors

**Problem**: Running `npx tsc --noEmit` reveals multiple type errors that could cause runtime issues.

#### Error A: Undefined Property Access
**Location**: `lingooo-mobile/app/(tabs)/word-detail.tsx:170:20`
```
error TS18048: 'wordData.headword' is possibly 'undefined'.
```

**Fix**:
```typescript
// Before
Speech.speak(wordData.headword.lemma, {

// After
if (!wordData?.headword) return;
Speech.speak(wordData.headword.lemma, {
```

#### Error B: Type Mismatch in Router Navigation
**Location**: `lingooo-mobile/app/(tabs)/side-menu.tsx:149:17`
```
error TS2322: Type 'string | string[]' is not assignable to type 'string'.
```

**Fix**:
```typescript
// Before
router.push(notif.actionUrl);

// After
const url = Array.isArray(notif.actionUrl) ? notif.actionUrl[0] : notif.actionUrl;
if (url) router.push(url);
```

#### Error C: Null Assignment Type Error
**Location**: `lingooo-mobile/contexts/chat-context.tsx:351:11`
```
error TS2322: Type 'string' is not assignable to type 'null'.
```

**Fix**: Review error state handling logic around line 351.

#### Error D: Missing Jest Type Definitions
**Locations**: Multiple test files
```
Cannot find name 'describe', 'it', 'expect', etc.
```

**Fix**: Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["jest", "@testing-library/jest-native"]
  }
}
```

**Impact**: Type safety compromised, potential runtime errors.

---

## 🟠 High Priority Issues

### 3. [HIGH] CORS Security Vulnerability
**Location**: `/Users/a2424/Documents/Lingooo/lingooo-backend/.env:3`

**Problem**: Using wildcard CORS origin in production.
```env
ALLOWED_ORIGINS=*  # ⚠️ Security risk
```

**Fix**: Restrict to specific origins:
```env
# Development
ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.2.1:8081

# Production
ALLOWED_ORIGINS=https://app.lingooo.com,https://lingooo.com
```

**Backend Code Update** (`src/index.ts`):
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**Impact**: Any website can make requests to your backend, potential CSRF attacks.

---

### 4. [HIGH] No Rate Limiting on Backend APIs
**Location**: All routes in `/Users/a2424/Documents/Lingooo/lingooo-backend/src/routes/`

**Problem**: No rate limiting allows abuse of Gemini API quota.

**Fix**: Install and configure rate limiter:
```bash
npm install express-rate-limit
```

```typescript
// src/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 chat messages per minute
  message: 'Too many chat requests, please slow down.',
});
```

Apply to routes:
```typescript
// src/index.ts
import { apiLimiter, chatLimiter } from './middleware/rate-limit';

app.use('/api/', apiLimiter);
app.use('/api/chat', chatLimiter);
```

**Impact**: API abuse, quota exhaustion, increased costs.

---

## 🟡 Medium Priority Issues

### 5. [MEDIUM] Missing Input Validation
**Location**: All API routes

**Problem**: No validation for request body parameters.

**Fix**: Install validator:
```bash
npm install express-validator
```

Example for chat route:
```typescript
import { body, validationResult } from 'express-validator';

router.post('/',
  body('messages').isArray().notEmpty(),
  body('sessionId').isString().notEmpty(),
  body('scope').isString().notEmpty(),
  body('identifier').isString().notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... rest of handler
  }
);
```

**Impact**: Potential injection attacks, malformed data causing crashes.

---

### 6. [MEDIUM] Error Messages May Expose Internal Details
**Location**: Multiple routes, especially chat.ts

**Problem**: Error messages include stack traces and internal details.
```typescript
res.status(500).json({
  error: 'Failed to generate chat response',
  message: error instanceof Error ? error.message : 'Unknown error'  // ⚠️ May expose internals
});
```

**Fix**: Use generic messages in production:
```typescript
const isDev = process.env.NODE_ENV === 'development';

res.status(500).json({
  error: 'Failed to generate chat response',
  ...(isDev && { message: error instanceof Error ? error.message : 'Unknown error' })
});
```

**Impact**: Information disclosure to attackers.

---

### 7. [MEDIUM] No Request Size Limits
**Location**: Express app configuration

**Problem**: No limits on request body size.

**Fix**:
```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

**Impact**: Potential DoS through large payloads.

---

## 🟢 Low Priority Issues

### 8. [LOW] Hardcoded Prompt in Multiple Places
**Location**: `src/routes/chat.ts` and similar

**Problem**: System prompts are hardcoded, difficult to maintain.

**Recommendation**: Extract to configuration file:
```typescript
// src/config/prompts.ts
export const SYSTEM_PROMPTS = {
  chat: (identifier: string) => `あなたは言語学習アシスタントです。単語「${identifier}」について簡潔に回答してください。

【重要な指示】
- 3〜4行以内で簡潔に答えること
- 箇条書きは2〜3個まで
- 「〜についてお答えします」などの前置きは不要
- 直接本題に入ること`,
};
```

---

### 9. [LOW] Console.log in Production Code
**Location**: Multiple files

**Problem**: Using `console.log` for logging in production.

**Recommendation**: Use proper logging library (already using `logger` in mobile app, apply to backend):
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

---

## 📋 Checklist for Next Development Session

### Immediate Fixes (Must Do)
- [ ] Add `onRetryQuestion` prop to word-detail.tsx ChatSection
- [ ] Implement `handleQACardRetry` function in word-detail.tsx
- [ ] Fix TypeScript error: wordData.headword undefined check
- [ ] Fix TypeScript error: router navigation type mismatch
- [ ] Fix TypeScript error: chat-context null assignment
- [ ] Restrict CORS to specific origins
- [ ] Implement rate limiting on all API routes

### Short Term (This Sprint)
- [ ] Add input validation to all API routes
- [ ] Sanitize error messages for production
- [ ] Add request size limits
- [ ] Add Jest types to tsconfig.json
- [ ] Run full TypeScript compilation check
- [ ] Test QA card retry functionality on both screens

### Medium Term (Next Sprint)
- [ ] Extract prompts to configuration file
- [ ] Implement proper logging with winston
- [ ] Add API response caching to reduce Gemini API calls
- [ ] Add integration tests for chat flow
- [ ] Consider database caching for AI responses (user suggestion)

---

## 🔍 Testing Notes

### Manual Testing Required
1. **QA Card Retry on Word Detail Page**:
   - Navigate to word detail page
   - Send a question
   - Click retry button on QA card
   - Verify question is resent

2. **Rate Limiting**:
   - Send 11 requests to chat API within 1 minute
   - Verify 11th request returns 429 status

3. **CORS Restriction**:
   - Make request from unauthorized origin
   - Verify CORS error

### Automated Testing Gaps
- No tests for chat streaming functionality
- No tests for error recovery in QA cards
- No tests for cache invalidation logic

---

## 📚 Architecture Notes

### Current Known Limitations
1. **Simulated Streaming**: Using non-streaming API with chunked responses due to React Native limitations
2. **Gemini API Quota**: Free tier limited to 50 requests/day
3. **No Offline Support**: App requires network connection for all features

### Future Considerations
- Implement database caching for AI-generated responses
- Add offline mode with cached data
- Consider implementing proper SSE with polyfill for React Native
- Add telemetry to monitor API usage patterns

---

## 🔐 Security Best Practices Checklist

Backend:
- [x] API key in .env file (not in code)
- [x] .env file in .gitignore
- [ ] CORS restricted to specific origins
- [ ] Rate limiting implemented
- [ ] Input validation on all routes
- [ ] Error messages sanitized for production
- [ ] Request size limits configured
- [ ] HTTPS enforced in production
- [ ] Security headers configured (helmet)

Frontend:
- [x] No hardcoded secrets
- [x] API calls through backend proxy
- [ ] Proper error handling without exposing internals
- [ ] Input sanitization before sending to backend
- [ ] Secure storage for sensitive user data

---

## 📊 Code Quality Metrics

### Current Status
- **TypeScript Coverage**: ~95% (4 errors need fixing)
- **Test Coverage**: Limited (no chat flow tests)
- **Security Score**: 6/10 (improve CORS, rate limiting, validation)
- **Code Duplication**: Low (good separation of concerns)
- **Documentation**: Basic (needs API documentation)

### Recommendations
1. Achieve 100% TypeScript compilation success
2. Add integration tests for critical flows
3. Implement all security improvements
4. Add API documentation (Swagger/OpenAPI)
5. Set up CI/CD with automated security scanning

---

**End of Review Document**
**Last Updated**: 2025-11-02
**Review again after implementing fixes**
