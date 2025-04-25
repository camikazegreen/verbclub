const { PrismaClient } = require('@prisma/client')

// Create a single PrismaClient instance to be used throughout the application
const prisma = new PrismaClient()

// Log database queries in development
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    console.log('Query: ' + e.query)
    console.log('Duration: ' + e.duration + 'ms')
  })
}

module.exports = prisma 