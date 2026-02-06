# AI Image Generator Admin - API Specification

## Base URL

```
/api/v1
```

## Authentication

All endpoints require authentication via Bearer token:

```
Authorization: Bearer <token>
```

---

## Endpoints

### Prompt Versions

#### List Prompt Versions

```http
GET /prompt-versions
```

**Query Parameters:**

| Parameter         | Type    | Default      | Description                       |
| ----------------- | ------- | ------------ | --------------------------------- |
| `page`            | integer | 1            | Page number                       |
| `limit`           | integer | 20           | Items per page (max 100)          |
| `include_deleted` | boolean | false        | Include soft-deleted versions     |
| `sort`            | string  | `created_at` | Sort field (`created_at`, `name`) |
| `order`           | string  | `desc`       | Sort order (`asc`, `desc`)        |

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Interior Design v1",
      "system_prompt": "You are an expert interior design AI...",
      "user_prompt": "Generate a {style} style {room_type}...",
      "created_at": "2024-01-15T10:30:00Z",
      "deleted_at": null,
      "stats": {
        "generation_count": 45,
        "avg_rating_score": 3.2,
        "excellent_count": 8,
        "good_count": 20
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

#### Get Prompt Version

```http
GET /prompt-versions/:id
```

**Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Interior Design v1",
    "system_prompt": "You are an expert interior design AI...",
    "user_prompt": "Generate a {style} style {room_type}...",
    "description": "First iteration of interior design prompts",
    "created_at": "2024-01-15T10:30:00Z",
    "deleted_at": null,
    "stats": {
      "generation_count": 45,
      "rated_count": 40,
      "avg_rating_score": 3.2,
      "rating_distribution": {
        "EXCELLENT": 8,
        "GOOD": 20,
        "ACCEPTABLE": 10,
        "POOR": 2,
        "FAILED": 0
      }
    }
  }
}
```

---

#### Create Prompt Version

```http
POST /prompt-versions
```

**Request Body:**

```json
{
  "name": "Interior Design v2",
  "system_prompt": "You are an expert interior design AI that generates photorealistic room renders...",
  "user_prompt": "Generate a {style} style {room_type} with {color_scheme} color scheme...",
  "description": "Improved prompt with better furniture scaling instructions"
}
```

**Response:** `201 Created`

```json
{
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Interior Design v2",
    "system_prompt": "You are an expert interior design AI...",
    "user_prompt": "Generate a {style} style {room_type}...",
    "description": "Improved prompt with better furniture scaling instructions",
    "created_at": "2024-01-16T14:00:00Z",
    "deleted_at": null
  }
}
```

---

#### Update Prompt Version

```http
PUT /prompt-versions/:id
```

**Request Body:**

```json
{
  "name": "Interior Design v2 (Updated)",
  "description": "Added additional lighting instructions"
}
```

**Note:** `system_prompt` and `user_prompt` are immutable after creation. Create a new version instead.

**Response:** `200 OK`

---

#### Delete Prompt Version (Soft Delete)

```http
DELETE /prompt-versions/:id
```

**Response:** `204 No Content`

---

### Generations

#### List Generations

```http
GET /generations
```

**Query Parameters:**

| Parameter           | Type     | Description                              |
| ------------------- | -------- | ---------------------------------------- |
| `page`              | integer  | Page number                              |
| `limit`             | integer  | Items per page (max 100)                 |
| `prompt_version_id` | uuid     | Filter by prompt version                 |
| `rating`            | string   | Filter by rating (EXCELLENT, GOOD, etc.) |
| `unrated`           | boolean  | Filter unrated generations only          |
| `from`              | datetime | Filter by created_at >=                  |
| `to`                | datetime | Filter by created_at <=                  |
| `sort`              | string   | Sort field (`created_at`, `rating`)      |
| `order`             | string   | Sort order (`asc`, `desc`)               |

**Response:**

```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "prompt_version_id": "550e8400-e29b-41d4-a716-446655440000",
      "prompt_name": "Interior Design v1",
      "prompt_preview": "Generate a {style} style {room_type}...",
      "result_rating": "GOOD",
      "created_at": "2024-01-15T12:00:00Z",
      "input_image_count": 2,
      "output_image_count": 4
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "total_pages": 6
  }
}
```

---

#### Get Generation

```http
GET /generations/:id
```

**Response:**

```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "prompt_version": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Interior Design v1",
      "system_prompt": "You are an expert interior design AI...",
      "user_prompt": "Generate a {style} style {room_type}..."
    },
    "result_rating": "GOOD",
    "created_at": "2024-01-15T12:00:00Z",
    "input_images": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "url": "https://storage.example.com/inputs/ref-image-1.jpg"
      }
    ],
    "output_images": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "url": "https://storage.example.com/outputs/gen-image-1.jpg"
      },
      {
        "id": "990e8400-e29b-41d4-a716-446655440005",
        "url": "https://storage.example.com/outputs/gen-image-2.jpg"
      }
    ]
  }
}
```

---

#### Create Generation

```http
POST /generations
```

**Request Body:**

```json
{
  "prompt_version_id": "550e8400-e29b-41d4-a716-446655440000",
  "input_images": [{ "url": "https://storage.example.com/inputs/ref-image-1.jpg" }],
  "output_images": [
    { "url": "https://storage.example.com/outputs/gen-image-1.jpg" },
    { "url": "https://storage.example.com/outputs/gen-image-2.jpg" }
  ]
}
```

**Response:** `201 Created`

---

#### Rate Generation

```http
PATCH /generations/:id/rating
```

**Request Body:**

```json
{
  "rating": "EXCELLENT"
}
```

**Valid ratings:** `FAILED`, `POOR`, `ACCEPTABLE`, `GOOD`, `EXCELLENT`

**Response:** `200 OK`

```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "result_rating": "EXCELLENT",
    "rated_at": "2024-01-15T14:30:00Z"
  }
}
```

---

#### Delete Generation

```http
DELETE /generations/:id
```

**Response:** `204 No Content`

---

### Images

#### Add Input Image to Generation

```http
POST /generations/:id/inputs
```

**Request Body:**

```json
{
  "url": "https://storage.example.com/inputs/new-ref-image.jpg"
}
```

**Response:** `201 Created`

---

#### Add Output Image to Generation

```http
POST /generations/:id/outputs
```

**Request Body:**

```json
{
  "url": "https://storage.example.com/outputs/new-gen-image.jpg"
}
```

**Response:** `201 Created`

---

#### Delete Image

```http
DELETE /images/:id
```

**Query Parameters:**

| Parameter | Type   | Required | Description                      |
| --------- | ------ | -------- | -------------------------------- |
| `type`    | string | Yes      | Image type (`input` or `output`) |

**Response:** `204 No Content`

---

### Analytics

#### Get Rating Distribution

```http
GET /analytics/ratings
```

**Query Parameters:**

| Parameter           | Type     | Description              |
| ------------------- | -------- | ------------------------ |
| `prompt_version_id` | uuid     | Filter by prompt version |
| `from`              | datetime | Start date               |
| `to`                | datetime | End date                 |

**Response:**

```json
{
  "data": {
    "total_generations": 150,
    "rated_generations": 140,
    "distribution": [
      { "rating": "EXCELLENT", "count": 25, "percentage": 17.86 },
      { "rating": "GOOD", "count": 60, "percentage": 42.86 },
      { "rating": "ACCEPTABLE", "count": 35, "percentage": 25.0 },
      { "rating": "POOR", "count": 15, "percentage": 10.71 },
      { "rating": "FAILED", "count": 5, "percentage": 3.57 }
    ]
  }
}
```

---

#### Get Prompt Performance Comparison

```http
GET /analytics/prompt-performance
```

**Query Parameters:**

| Parameter            | Type     | Description                     |
| -------------------- | -------- | ------------------------------- |
| `prompt_version_ids` | uuid[]   | Specific versions to compare    |
| `from`               | datetime | Start date                      |
| `to`                 | datetime | End date                        |
| `limit`              | integer  | Number of top prompts to return |

**Response:**

```json
{
  "data": [
    {
      "prompt_version_id": "550e8400-e29b-41d4-a716-446655440000",
      "prompt_name": "Interior Design v1",
      "generation_count": 45,
      "rated_count": 40,
      "avg_rating_score": 3.2,
      "excellent_rate": 0.2,
      "failure_rate": 0.0
    },
    {
      "prompt_version_id": "660e8400-e29b-41d4-a716-446655440001",
      "prompt_name": "Interior Design v2",
      "generation_count": 30,
      "rated_count": 28,
      "avg_rating_score": 3.6,
      "excellent_rate": 0.32,
      "failure_rate": 0.0
    }
  ]
}
```

---

#### Get Generation Trends

```http
GET /analytics/trends
```

**Query Parameters:**

| Parameter  | Type     | Default     | Description                                        |
| ---------- | -------- | ----------- | -------------------------------------------------- |
| `interval` | string   | `day`       | Grouping interval (`hour`, `day`, `week`, `month`) |
| `from`     | datetime | 30 days ago | Start date                                         |
| `to`       | datetime | now         | End date                                           |

**Response:**

```json
{
  "data": [
    {
      "period": "2024-01-01",
      "generation_count": 15,
      "avg_rating_score": 3.1,
      "excellent_count": 2,
      "failed_count": 0
    },
    {
      "period": "2024-01-02",
      "generation_count": 22,
      "avg_rating_score": 3.4,
      "excellent_count": 5,
      "failed_count": 1
    }
  ]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid rating value",
    "details": {
      "field": "rating",
      "received": "SUPER",
      "allowed": ["FAILED", "POOR", "ACCEPTABLE", "GOOD", "EXCELLENT"]
    }
  }
}
```

### Error Codes

| HTTP Status | Code                   | Description                         |
| ----------- | ---------------------- | ----------------------------------- |
| 400         | `VALIDATION_ERROR`     | Invalid request body or parameters  |
| 401         | `UNAUTHORIZED`         | Missing or invalid authentication   |
| 403         | `FORBIDDEN`            | Insufficient permissions            |
| 404         | `NOT_FOUND`            | Resource not found                  |
| 409         | `CONFLICT`             | Resource conflict (e.g., duplicate) |
| 422         | `UNPROCESSABLE_ENTITY` | Valid syntax but semantic error     |
| 500         | `INTERNAL_ERROR`       | Server error                        |

---

## Rate Limiting

- **Default limit:** 100 requests per minute
- **Headers returned:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Webhooks (Optional)

Configure webhooks to receive notifications:

```http
POST /webhooks
```

**Request Body:**

```json
{
  "url": "https://your-app.com/webhooks/ai-gen",
  "events": ["generation.created", "generation.rated"],
  "secret": "your-webhook-secret"
}
```

**Events:**

| Event                    | Description                  |
| ------------------------ | ---------------------------- |
| `prompt_version.created` | New prompt version created   |
| `prompt_version.deleted` | Prompt version soft-deleted  |
| `generation.created`     | New generation created       |
| `generation.rated`       | Generation received a rating |
