# ADR-0003: Database and Data Model

Status: accepted
Date: 2026-03-03

## Context

The A2A Server requires persistent storage for:
- **Requests and their states** - Long-running request tracking
- **Messages and conversations** - Communication history
- **Client authentication** - User and client management
- **Action definitions** - Static action configurations
- **Context and state** - Session and processing context
- **Audit logs** - Security and compliance tracking

The data model must support:
- **High write throughput** for request processing
- **Complex queries** for status and history retrieval
- **Data consistency** across related entities
- **Scalability** for growing data volumes
- **Backup and recovery** for data protection
- **Performance** for real-time operations

## Decision

Use **PostgreSQL** with **Prisma ORM** for the primary database with the following data model:

### 1. Database Technology

**PostgreSQL:**
- **Relational database** with ACID compliance
- **JSON support** for flexible schema evolution
- **Performance** for both OLTP and analytical queries
- **Maturity** and ecosystem support
- **Scalability** through connection pooling and read replicas

**Prisma ORM:**
- **Type-safe** database access with TypeScript
- **Schema migrations** with version control
- **Developer experience** with auto-completion and validation
- **Multi-database** support for future flexibility

### 2. Core Entities

**Request Entity:**
```prisma
model Request {
  id          String   @id @default(cuid())
  promiseId   String   @unique
  clientId    String
  status      RequestStatus
  context     Json?
  message     String?
  result      Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  startedAt   DateTime?
  completedAt DateTime?
  
  client      Client   @relation(fields: [clientId], references: [id])
  messages    Message[]
  
  @@index([status])
  @@index([clientId])
  @@index([createdAt])
}
```

**Message Entity:**
```prisma
model Message {
  id        String     @id @default(cuid())
  requestId String
  type      MessageType
  content   Json
  status    MessageStatus
  createdAt DateTime   @default(now())
  
  request   Request    @relation(fields: [requestId], references: [id])
  
  @@index([requestId])
  @@index([type, createdAt])
}
```

**Client Entity:**
```prisma
model Client {
  id           String   @id @default(cuid())
  name         String   @unique
  apiKey       String   @unique
  encryptedKey String
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  lastUsedAt   DateTime?
  
  requests     Request[]
  
  @@index([isActive])
}
```

### 3. Data Relationships

**Request Lifecycle:**
- One `Client` can have many `Request`s
- One `Request` can have many `Message`s
- Messages are ordered by creation time within a request

**Context Management:**
- Request context stored as JSON for flexibility
- Session context managed in-memory with database backup
- Entity relationships preserved for consistency

### 4. Indexing Strategy

**Primary Indexes:**
- `Request.id` - Primary key
- `Request.promiseId` - Unique identifier for external systems
- `Client.id` and `Client.name` - Client identification

**Secondary Indexes:**
- `Request.status` - For queue management
- `Request.clientId` - For client-specific queries
- `Request.createdAt` - For time-based queries
- `Message.requestId` - For request history
- `Message.type` and `Message.createdAt` - For message filtering

### 5. Data Retention and Cleanup

**Retention Policies:**
- **Requests**: Keep for 30 days (configurable)
- **Messages**: Keep with associated requests
- **Clients**: Keep indefinitely (with lastUsedAt tracking)
- **Audit logs**: Keep for 90 days

**Cleanup Strategy:**
- **Soft deletes** for audit trail
- **Batch cleanup** jobs for large datasets
- **Archiving** for long-term storage
- **Vacuum operations** for performance

### 6. Migration Strategy

**Schema Evolution:**
- **Prisma migrations** for schema changes
- **Version control** for migration scripts
- **Rollback capability** for failed migrations
- **Zero-downtime** deployments where possible

**Data Migration:**
- **Backward compatibility** for existing data
- **Data transformation** scripts for schema changes
- **Validation** of migrated data
- **Rollback plans** for migration failures

## Consequences

### Positive

- **Type Safety**: Prisma provides compile-time type checking
- **Developer Experience**: Excellent tooling and auto-completion
- **Schema Evolution**: Managed migrations with rollback capability
- **Performance**: Optimized queries and proper indexing
- **Consistency**: ACID compliance ensures data integrity
- **Flexibility**: JSON fields allow schema evolution

### Trade-offs

- **Vendor Lock-in**: Prisma ties us to supported databases
- **Runtime Overhead**: ORM adds some performance overhead
- **Learning Curve**: Team needs to learn Prisma patterns
- **Migration Complexity**: Schema changes require careful planning

### Implementation Requirements

- **Database Setup**: PostgreSQL with proper configuration
- **Connection Pooling**: Efficient connection management
- **Backup Strategy**: Regular backups with restore testing
- **Monitoring**: Database performance and health monitoring
- **Security**: Proper access controls and encryption

## Alternatives Considered

### 1. NoSQL Database (MongoDB)
- **Pros**: Flexible schema, horizontal scaling
- **Cons**: Complex transactions, eventual consistency
- **Rejected**: Relational model better fits our data relationships

### 2. SQLite for Development
- **Pros**: Simple setup, no external dependencies
- **Cons**: Limited scalability, single-writer
- **Rejected**: PostgreSQL provides better production readiness

### 3. Multiple Databases
- **Pros**: Optimized storage per use case
- **Cons**: Data consistency challenges, operational complexity
- **Rejected**: Single database simpler for current scale

## Notes / Follow-ups

- Implement database connection pooling for performance
- Add database monitoring and alerting
- Plan for read replicas for scaling read operations
- Consider implementing caching layer for frequently accessed data
- Implement proper backup and disaster recovery procedures
- Add database performance tuning and optimization
- Consider implementing data encryption at rest