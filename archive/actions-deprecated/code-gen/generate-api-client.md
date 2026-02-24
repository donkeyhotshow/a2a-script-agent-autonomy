# generate-api-client

| Параметр | Значение |
|----------|----------|
| actionId | generate-api-client |
| categoryId | code-gen |
| executorSystemId | agent |
| title | Генерация API клиента |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент генерирует типизированный API клиент на основе спецификации API.

## Генерируемое содержимое

- HTTP client wrapper
- TypeScript types/interfaces
- Request/response types
- Error handling
- Authentication
- Retry logic

## Примеры

### TypeScript (по OpenAPI)
```
typescript
// Сгенерировано из OpenAPI спецификации
export class ApiClient {
  async getUsers(): Promise<User[]> {
    return this.request('/users', 'GET');
  }
  
  async createUser(data: CreateUserDto): Promise<User> {
    return this.request('/users', 'POST', data);
  }
}
```

### Axios wrapper
```
typescript
const api = axios.create({
  baseURL: process.env.API_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### React Query + API
```
typescript
export const useUsers = () => 
  useQuery(['users'], () => api.getUsers());
  
export const useCreateUser = () => 
  useMutation((data) => api.post('/users', data));
```

## Инструменты

- OpenAPI Generator
- Swagger Codegen
- TypeScript Fetch API
- tRPC
- MSW
