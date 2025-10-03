/**
 * Script to create test users via Clerk API
 * Run with: node scripts/create-test-users.js
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_x5sg6LifVkc9ZlNgErV7bOznYU0t6NIT0nY5HqQcEO';

if (!CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY not found in environment variables');
  process.exit(1);
}

// Generate unique secure passwords that won't be in breach databases
const generateSecurePassword = (role) => {
  const timestamp = Date.now();
  return `C9d-${role}-${timestamp}!Secure`;
};

const testUsers = [
  {
    email: 'admin@example.com',
    password: generateSecurePassword('Admin'),
    firstName: 'Admin',
    lastName: 'User',
  },
  {
    email: 'developer@example.com',
    password: generateSecurePassword('Dev'),
    firstName: 'Dev',
    lastName: 'User',
  },
  {
    email: 'testuser@example.com',
    password: generateSecurePassword('Test'),
    firstName: 'Test',
    lastName: 'User',
  },
];

// Store passwords for reference
const TEST_USER_PASSWORDS = {};

async function createTestUsers() {
  console.log('Creating test users...\n');
  
  // First, delete existing test users
  console.log('Deleting existing test users...');
  for (const user of testUsers) {
    try {
      // Get existing user
      const searchResponse = await fetch(`https://api.clerk.com/v1/users?email_address=${user.email}`, {
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        },
      });
      
      if (searchResponse.ok) {
        const users = await searchResponse.json();
        if (users.length > 0) {
          // Delete the user
          const deleteResponse = await fetch(`https://api.clerk.com/v1/users/${users[0].id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            },
          });
          if (deleteResponse.ok) {
            console.log(`🗑️  Deleted existing user: ${user.email}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not delete existing user ${user.email}:`, error.message);
    }
  }
  
  console.log('\nCreating new test users...\n');

  for (const user of testUsers) {
    try {
      const response = await fetch('https://api.clerk.com/v1/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: [user.email],
          password: user.password,
          first_name: user.firstName,
          last_name: user.lastName,
          skip_password_checks: true,
          skip_password_requirement: true,
        }),
      });

      if (response.ok) {
        const createdUser = await response.json();
        console.log(`✅ Created user: ${user.email} (ID: ${createdUser.id})`);
        TEST_USER_PASSWORDS[user.email] = user.password;
      } else {
        const error = await response.json();
        console.error(`❌ Failed to create user ${user.email}:`, error);
      }
    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error);
    }
  }

  // Save passwords to a file for tests to use
  const fs = require('fs');
  const path = require('path');
  const passwordsFile = path.join(__dirname, '..', 'apps', 'web', 'e2e', 'test-users.json');
  
  fs.writeFileSync(passwordsFile, JSON.stringify({
    users: testUsers.map(u => ({
      email: u.email,
      password: u.password,
      firstName: u.firstName,
      lastName: u.lastName
    })),
    createdAt: new Date().toISOString()
  }, null, 2));
  
  console.log(`\n✅ Test user passwords saved to: ${passwordsFile}`);

  console.log('\nTest user creation complete!');
  console.log('\nYou can now sign in with:');
  testUsers.forEach(user => {
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}\n`);
  });
}

createTestUsers();
