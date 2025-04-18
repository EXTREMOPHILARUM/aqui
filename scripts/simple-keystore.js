/**
 * Simple keystore creation script with hardcoded passwords
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define paths
const keystorePath = path.join(__dirname, '..', 'android', 'app', 'my-release-key.keystore');
const envPath = path.join(__dirname, '..', '.env');

// Use simple passwords for testing
const storePassword = 'password123';
const keyPassword = 'password123';

console.log('Creating new keystore with simplified passwords...');

try {
  // Delete existing keystore if it exists
  if (fs.existsSync(keystorePath)) {
    fs.unlinkSync(keystorePath);
    console.log('Removed existing keystore');
  }
  
  // Create interactive keytool command
  console.log('Running keytool command...');
  console.log('Fill in any details for the certificate when asked');
  
  execSync(`keytool -genkeypair -v -storetype PKCS12 -keystore "${keystorePath}" -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000`, { 
    stdio: 'inherit' 
  });
  
  // Create .env file
  const envContent = `ANDROID_STORE_PASSWORD=${storePassword}\nANDROID_KEY_PASSWORD=${keyPassword}`;
  fs.writeFileSync(envPath, envContent);
  
  console.log('\nSuccess! Created:');
  console.log(`1. Keystore at: ${keystorePath}`);
  console.log(`2. .env file at: ${envPath}`);
  console.log(`\nPasswords set to: ${storePassword} please change them in the .env file`);
  console.log('\nYou can now run: npm run build-android-release-env');
} catch (error) {
  console.error('Error creating keystore:', error.message);
} 