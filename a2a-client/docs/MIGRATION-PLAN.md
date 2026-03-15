# Plan Migratsii: Legacy session-store.js → Refactored Version

## Obzor

V proekte est tri realizatsii SessionStore:
1. [`session-store.js`](a2a-client/web/js/session-store.js) (legacy, IIFE) - zagruzhaetsya v index.html
2. [`session-store-refactored.js`](a2a-client/web/js/session-store-refactored.js) (ES6 wrapper) - ne ispolzuetsya
3. [`core/SessionStoreCore.js`](a2a-client/web/js/core/SessionStoreCore.js) (ES6 module) - yadro

## Analiz Metodov

### Legacy Methods (session-store.js)

#### Core Methods (iz vstraivayemogo SessionStoreCore):

| # | Metod | Status v Refactored |
|---|-------|---------------------|
| 1 | `getState()` | ✅ Est |
| 2 | `sessionId` (getter) | ✅ Est |
| 3 | `projectId` (getter) | ✅ Est |
| 4 | `execute` (getter) | ✅ Est |
| 5 | `pendingForm` (getter) | ✅ Est |
| 6 | `context` (getter/setter) | ✅ Est |
| 7 | `messages` (getter) | ✅ Est |
| 8 | `isWaitingForInput()` | ✅ Est |
| 9 | `reset()` | ✅ Est |
| 10 | `setSession()` | ✅ Est |
| 11 | `setExecute()` | ✅ Est |
| 12 | `pushMessage()` | ✅ Est |
| 13 | `on()` | ✅ Est |
| 14 | `setPromisePending()` | ✅ Est |
| 15 | `setError()` | ✅ Est |
| 16 | `createSession()` | ✅ Est |
| 17 | `emit()` | ✅ Est (cherez _emit) |

#### SessionStore Constructor Methods:

| # | Metod | Status v Refactored |
|---|-------|---------------------|
| 1 | `setStorageMode()` | ✅ Est |
| 2 | `getState()` | ✅ Est |
| 3 | `setSession()` | ✅ Est |
| 4 | `setExecute()` | ✅ Est |
| 5 | `pushMessage()` | ✅ Est |
| 6 | `on()` | ✅ Est |
| 7 | `reset()` | ✅ Est |
| 8 | `setPromisePending()` | ✅ Est |
| 9 | `isWaitingForInput()` | ✅ Est |

#### Object.defineProperty (Legacy Compatibility):

| # | Property | Status v Refactored |
|---|----------|---------------------|
| 1 | `execute` | ✅ Est |
| 2 | `_state` | ⚠️ Chastichno (getState vmesto pryamoto dostupa) |
| 3 | `pendingForm` | ✅ Est |

#### Legacy API (window-state.js compatibility):

| # | Metod | Status v Refactored |
|---|-------|---------------------|
| 1 | `setMessages()` | ✅ Est |
| 2 | `setContext()` | ✅ Est |
| 3 | `setStatus()` | ✅ Est |
| 4 | `renameSession()` | ❌ **OTSUTSTVUET** |
| 5 | `createSessionWithForm()` | ✅ Est |
| 6 | `isPersistentStorage()` | ✅ Est |
| 7 | `debug()` | ✅ Est |
| 8 | `setStorageMode()` | ✅ Est |

### SessionStorageAPI Methods

| # | Metod | Status v Refactored |
|---|-------|---------------------|
| 1 | `createSessionWithForm()` | ✅ Est |
| 2 | `saveStep()` | ✅ Est |
| 3 | `loadSession()` | ✅ Est |
| 4 | `checkLatestStep()` | ✅ Est |
| 5 | `getHistory()` | ✅ Est |
| 6 | `listSessions()` | ✅ Est |

## Problemnye Tochki

### 1. Otsutstvuyuschiy metod: `renameSession()`

**Lokatsiya v legacy:** [`session-store.js:263-266`](a2a-client/web/js/session-store.js:263-266)

```javascript
this.renameSession = function(sessionId, newName) {
    console.log('[SessionStore] renameSession:', sessionId, newName);
    // Could add title to state if needed
};
```

**Reshenie:** Dobavit etot metod v `session-store-refactored.js` ili `core/SessionStoreCore.js`.

### 2. Zagruzka v index.html

**Tekushee sostoyanie:** [`index.html:92`](a2a-client/web/index.html:92)
```html
<script type="module" src="js/session-store.js"></script>
```

**Problema:** Zagruzhaetsya legacy versiya vmesto refactored.

### 3. Dopolnitelnye metody, neobkhodimye dlya polnoy sovmesimosti

V refactored est dopolnitelnye metody, kotorye mogut potrebovatsya:
- `isActive()` - proverka aktivnosti sessii
- `isInputBlocked()` - proverka blokirovki vvoda
- `setProject()` - ustanovka ID proekta
- `appendMessages()` - dobavlenie soobscheniy
- `applyServerResponse()` - primenenie otveta ot servera

## Plan Migratsii

### Shag 1: Dobavit otsutstvuyushiye metody

#### 1.1 Dobavit `renameSession()` v SessionStoreCore

**Fayl:** `a2a-client/web/js/core/SessionStoreCore.js`

Dobavit posle `setProject()`:

```javascript
renameSession(newName) {
    this._state.sessionTitle = newName;
    this._emit('sessionRenamed', { 
        sessionId: this._state.sessionId, 
        title: newName 
    });
    return this;
}
```

#### 1.2 Dobavit `renameSession()` v wrapper

**Fayl:** `a2a-client/web/js/session-store-refactored.js`

Dobavit v spisok proxy metodov:

```javascript
this.renameSession = (...args) => this.core.renameSession(...args);
```

### Shag 2: Obnovit index.html

**Fayl:** [`a2a-client/web/index.html:92`](a2a-client/web/index.html:92)

**Do:**
```html
<script type="module" src="js/session-store.js"></script>
```

**Posle:**
```html
<script type="module" src="js/session-store-refactored.js"></script>
```

### Shag 3: Testirovanie

1. **Proverit, chto prilozhenie zagruzhaetsya bez oshibok**
2. **Proverit sozdanie novoi sessii**
3. **Proverit sokhranenie i vosstanovlenie sessii**
4. **Proverit metod `renameSession()`**
5. **Proverit vse sobytiya (events):**
   - `reset`
   - `session`
   - `execute`
   - `messages`
   - `message`
   - `pendingForm`
   - `promisePending`
   - `error`
   - `status`

## Risk Minimizatsii

1. **Ostavit legacy fayl v proekte** - na sluchay otката
2. **Testirovat v raznykh scenariyakh**:
   - Novaia sessiya
   - Zagruzka sushchestvuyushchey sessii
   - Peremena tipa khraneniya (storage/memory)
3. **Proverit obratnuyu sovmesimost** - vse sushchestvuyushchie vizovy dolzhny rabotat

## Vremennaya Otsenka

| Etap | Vremya |
|------|--------|
| Analiz i planirovanie | 1 chas |
| Dobavlenie `renameSession()` | 30 minut |
| Obnovlenie index.html | 15 minut |
| Testirovanie | 2 chasa |
| **Itogo** | **~4 chasa**

## Alternativny Variant

Esli neobkhodimo sokhranit polnuyu sovmesimost bez izmeneniya index.html, mozhno:

1. **Peremimenovat** `session-store-refactored.js` v `session-store.js`
2. **Peremestit** staruyu versiyu v `session-store-legacy.js`

No etot variant ne rekomenduetsya, tak kak poteryaetsya istoriya izmeneniy.
