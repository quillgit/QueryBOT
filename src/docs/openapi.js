export default {
  openapi: '3.0.3',
  info: {
    title: 'Query Bot API',
    version: '1.0.0',
    description: 'API for running and scheduling MySQL queries with JWT auth.'
  },
  servers: [
    { url: '/api', description: 'Same-origin (production)' },
    { url: 'http://localhost:3000/api', description: 'Local development' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: { error: { type: 'string' } }
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { type: 'object', properties: { username: { type: 'string' } } }
        }
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          cron_time: { type: 'string' },
          query_text: { type: 'string' },
          status: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      JobLog: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          job_id: { type: 'string' },
          executed_at: { type: 'string', format: 'date-time' },
          result_json: { type: 'object' }
        }
      }
    }
  },
  paths: {
    '/auth/login': {
      post: {
        summary: 'Login and obtain JWT token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
          200: { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          400: { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/run': {
      post: {
        summary: 'Run an ad-hoc SQL query (auth required)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { query_text: { type: 'string' } }, required: ['query_text'] } } }
        },
        responses: {
          200: { description: 'Executed', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/jobs': {
      get: {
        summary: 'List jobs',
        responses: {
          200: { description: 'Jobs', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Job' } } } } }
        }
      },
      post: {
        summary: 'Create job (auth required)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, cron_time: { type: 'string' }, query_text: { type: 'string' } }, required: ['name', 'cron_time', 'query_text'] } } }
        },
        responses: {
          200: { description: 'Created', content: { 'application/json': { schema: { type: 'object' } } } },
          400: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/jobs/{id}': {
      delete: {
        summary: 'Delete job (auth required)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object' } } } },
          404: { description: 'Not Found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          500: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/logs': {
      get: {
        summary: 'List latest logs',
        responses: {
          200: { description: 'Logs', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/JobLog' } } } } }
        }
      }
    }
  }
};