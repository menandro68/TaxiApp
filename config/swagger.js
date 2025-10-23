/**
 * Configuración de Swagger para TaxiApp API Documentation
 * Sistema de documentación automática para Backend Core
 */

const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Definición básica de la API
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'TaxiApp API',
    version: '1.0.0',
    description: 'API completa para la aplicación TaxiApp - Sistema de transporte profesional',
    contact: {
      name: 'TaxiApp Development Team',
      email: 'dev@taxiapp.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: ${window.location.origin}',
      description: 'Servidor de desarrollo'
    },
    {
      url: 'https://api.taxiapp.com',
      description: 'Servidor de producción'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        required: ['name', 'email', 'phone'],
        properties: {
          id: {
            type: 'integer',
            description: 'ID único del usuario'
          },
          name: {
            type: 'string',
            description: 'Nombre completo del usuario'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico del usuario'
          },
          phone: {
            type: 'string',
            description: 'Número de teléfono del usuario'
          },
          rating: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            description: 'Calificación promedio del usuario'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'suspended'],
            description: 'Estado actual del usuario'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de creación del usuario'
          }
        }
      },
      Driver: {
        type: 'object',
        required: ['name', 'email', 'phone', 'license_number'],
        properties: {
          id: {
            type: 'integer',
            description: 'ID único del conductor'
          },
          name: {
            type: 'string',
            description: 'Nombre completo del conductor'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico del conductor'
          },
          phone: {
            type: 'string',
            description: 'Número de teléfono del conductor'
          },
          license_number: {
            type: 'string',
            description: 'Número de licencia de conducir'
          },
          vehicle_plate: {
            type: 'string',
            description: 'Placa del vehículo'
          },
          vehicle_model: {
            type: 'string',
            description: 'Modelo del vehículo'
          },
          status: {
            type: 'string',
            enum: ['pending', 'active', 'inactive', 'suspended'],
            description: 'Estado actual del conductor'
          },
          rating: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            description: 'Calificación promedio del conductor'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de registro del conductor'
          }
        }
      },
      Trip: {
        type: 'object',
        required: ['user_id', 'pickup_location', 'destination'],
        properties: {
          id: {
            type: 'integer',
            description: 'ID único del viaje'
          },
          user_id: {
            type: 'integer',
            description: 'ID del usuario que solicita el viaje'
          },
          driver_id: {
            type: 'integer',
            description: 'ID del conductor asignado'
          },
          pickup_location: {
            type: 'string',
            description: 'Dirección de recogida'
          },
          destination: {
            type: 'string',
            description: 'Dirección de destino'
          },
          status: {
            type: 'string',
            enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
            description: 'Estado actual del viaje'
          },
          fare: {
            type: 'number',
            minimum: 0,
            description: 'Tarifa del viaje'
          },
          distance: {
            type: 'number',
            minimum: 0,
            description: 'Distancia del viaje en kilómetros'
          },
          duration: {
            type: 'integer',
            minimum: 0,
            description: 'Duración del viaje en minutos'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha y hora de creación del viaje'
          },
          completed_at: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha y hora de finalización del viaje'
          }
        }
      },
      Admin: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'ID único del administrador'
          },
          username: {
            type: 'string',
            description: 'Nombre de usuario'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico del administrador'
          },
          role: {
            type: 'string',
            enum: ['admin', 'super_admin', 'moderator'],
            description: 'Rol del administrador'
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Lista de permisos del administrador'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Mensaje de error'
              },
              code: {
                type: 'string',
                description: 'Código de error'
              },
              version: {
                type: 'string',
                description: 'Versión de la API'
              }
            }
          }
        }
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            description: 'Mensaje de éxito'
          },
          data: {
            type: 'object',
            description: 'Datos de respuesta'
          },
          _api: {
            type: 'object',
            properties: {
              version: {
                type: 'string',
                description: 'Versión de la API'
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Timestamp de la respuesta'
              }
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'Endpoints de autenticación y autorización'
    },
    {
      name: 'Users',
      description: 'Gestión de usuarios/pasajeros'
    },
    {
      name: 'Drivers',
      description: 'Gestión de conductores'
    },
    {
      name: 'Trips',
      description: 'Gestión de viajes'
    },
    {
      name: 'Admin',
      description: 'Panel de administración'
    },
    {
      name: 'Reports',
      description: 'Reportes y estadísticas'
    },
    {
      name: 'Finances',
      description: 'Gestión financiera'
    },
    {
      name: 'Support',
      description: 'Sistema de soporte'
    },
    {
      name: 'System',
      description: 'Endpoints del sistema'
    }
  ]
};

// Opciones para swagger-jsdoc
const options = {
  swaggerDefinition,
  // Rutas donde buscar comentarios de documentación
  apis: [
    './routes/*.js',
    './routes/v1/*.js',
    './server.js'
  ]
};

// Generar especificación Swagger
const swaggerSpec = swaggerJSDoc(options);

// Opciones de personalización para Swagger UI
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info hgroup.main h2 { color: #2196F3 }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 5px; }
  `,
  customSiteTitle: 'TaxiApp API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

// Middleware para servir la documentación
const setupSwagger = (app) => {
  // Ruta para obtener el JSON de la especificación
  app.get('/api/docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Ruta para la documentación interactiva
  app.use('/api/docs', swaggerUi.serve);
  app.get('/api/docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Ruta para la documentación v1
  app.use('/api/v1/docs', swaggerUi.serve);
  app.get('/api/v1/docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  console.log('📚 Documentación Swagger configurada:');
  console.log('   - Documentación interactiva: http://localhost:3000/api/docs');
  console.log('   - Documentación v1: http://localhost:3000/api/v1/docs');
  console.log('   - JSON Spec: http://localhost:3000/api/docs/swagger.json');
};

module.exports = {
  swaggerSpec,
  setupSwagger,
  swaggerUiOptions
};